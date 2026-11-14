// Lógica del producto: el bucle sentir → comparar → decidir → responder → aprender,
// la protección del mentor y lo que ve cada rol (mentor, pupilo, clínica).
import { CATALOG, suggest } from "./ai";
import { kget, kset } from "./kv";
import {
  addDays,
  clinicPatients,
  getActions,
  getAlerts,
  getClinic,
  getHealth,
  getStats,
  getSuggestion,
  getThread,
  getUser,
  hasConsent,
  raiseAlert,
  saveActions,
  saveSuggestion,
  todayStr,
} from "./repo";
import { SIGNALS, analyse, describe, oneLine, type Assessment } from "./signals";
import type { Clinic, Level, User } from "./types";

export const asOfDate = () => addDays(todayStr(), -1); // se evalúan días completos (hasta ayer)

// 1-2. Sentir y comparar
export async function assess(u: User, clinic: Clinic): Promise<Assessment> {
  if (u.crisisAt) return { level: "crisis", statuses: [], flagged: 0, dates: [], daysOfData: 0 };
  if (!hasConsent(u)) return { level: "paused", statuses: [], flagged: 0, dates: [], daysOfData: 0 };
  const [stats, health] = await Promise.all([getStats(u.id), getHealth(u.id)]);
  return analyse(stats, health, asOfDate(), clinic.earlyDays);
}

// 5. Aprender: ¿mejoraron las señales 2 días después de cada acción?
async function learn(pupilId: string, flaggedNow: number) {
  const log = await getActions(pupilId);
  let changed = false;
  for (const a of log) {
    if (a.helped === undefined && addDays(a.date, 2) <= asOfDate()) {
      a.helped = flaggedNow < a.flagged || flaggedNow === 0;
      changed = true;
    }
  }
  if (changed) await saveActions(pupilId, log);
  return [...new Set(log.filter((a) => a.helped).map((a) => a.action))];
}

const isAlert = (l: Level): l is "early" | "high" => l === "early" || l === "high";

// 3. Decidir: acción para el mentor (se guarda para no llamar a la IA cada vez)
async function decide(mentor: User, pupil: User, a: Assessment, clinic: Clinic, learned: string[]) {
  if (!isAlert(a.level)) return null;
  const key = `${asOfDate()}:${a.level}`;
  const cached = await getSuggestion(pupil.id, key);
  if (cached) return cached;
  const s = await suggest({ level: a.level, mentor: mentor.name, pupil: pupil.name, changes: describe(a, clinic.earlyDays), learned });
  await saveSuggestion(pupil.id, key, s);
  return s;
}

/* ---------- Pantalla "Hoy" del mentor ---------- */
export async function mentorToday(mentor: User, clinic: Clinic) {
  const pupil = mentor.menteeId ? await getUser(mentor.menteeId) : null;
  const own = await assess(mentor, clinic);

  // Protección del mentor: si él empeora, avisamos a la clínica (y lo ve su antiguo mentor)
  if (isAlert(own.level)) {
    await raiseAlert(clinic.id, {
      userId: mentor.id,
      kind: "mentor_support",
      text: `${mentor.name} (mentor) may need support: ${oneLine(own, clinic.earlyDays).toLowerCase()}`,
    });
  }

  let mentee = null;
  if (pupil) {
    const a = await assess(pupil, clinic);
    const learned = await learn(pupil.id, a.flagged);
    const thread = await getThread(mentor.id, pupil.id);
    const key = `${asOfDate()}:${a.level}`;
    const done = isAlert(a.level) ? await kget<"sent" | "later">(`done:${pupil.id}:${key}`) : null;
    const handled = !!done;
    const suggestion = mentor.paused || handled ? null : await decide(mentor, pupil, a, clinic, learned);
    mentee = {
      id: pupil.id,
      name: pupil.name,
      crisis: !!pupil.crisisAt,
      // El mentor NO recibe datos ni nivel numérico: solo si hay algo que hacer
      needsYou: isAlert(a.level) && !handled,
      reachedOut: done === "sent", // ya envió la acción de hoy
      level: isAlert(a.level) ? a.level : "stable",
      suggestion,
      phase: thread.length === 0 ? "meet" : "daily",
      lastMessageAt: thread[thread.length - 1]?.at ?? null,
      learned: learned.map((x) => CATALOG[x] ?? x),
    };
  }

  // Antiguos pupilos a los que sigue apoyando (el relevo)
  const former = [];
  for (const id of mentor.formerMenteeIds ?? []) {
    const f = await getUser(id);
    if (!f) continue;
    const fa = await assess(f, clinic);
    former.push({ id: f.id, name: f.name, needsHello: isAlert(fa.level) });
  }

  return {
    mentee,
    former,
    support: mentor.supportId ? { id: mentor.supportId, name: (await getUser(mentor.supportId))?.name ?? "" } : null,
    ownCheck: isAlert(own.level), // invitar a cuidarse / pausar
    paused: !!mentor.paused,
  };
}

// El mentor marca que ya actuó (o descarta) la sugerencia de hoy
export async function markDone(pupilId: string, level: Level, how: "sent" | "later") {
  await kset(`done:${pupilId}:${asOfDate()}:${level}`, how);
}

/* ---------- Pantalla "Hoy" del pupilo ---------- */
export async function pupilToday(pupil: User) {
  const mentor = pupil.mentorId ? await getUser(pupil.mentorId) : null;
  const thread = mentor ? await getThread(pupil.id, mentor.id) : [];
  const invites = thread.filter((m) => m.plan && m.from === mentor?.id && !m.plan.answer);
  return {
    mentor: mentor ? { id: mentor.id, name: mentor.name, availability: mentor.availability ?? "", paused: !!mentor.paused, story: mentor.story ?? "" } : null,
    invites: invites.map((m) => ({ id: m.id, text: m.text, action: CATALOG[m.plan!.action] ?? m.plan!.action, at: m.at })),
    crisis: !!pupil.crisisAt,
    sessions: pupil.sessions ?? null,
    // Planes aceptados en las últimas 2 semanas (del chat real)
    plans: thread
      .filter((m) => m.plan?.answer === "yes" && Date.parse(m.at) > Date.now() - 14 * 864e5)
      .slice(-3)
      .reverse()
      .map((m) => ({ id: m.id, text: m.text, action: CATALOG[m.plan!.action] ?? m.plan!.action, at: m.at })),
    tip: TIPS[new Date().getDate() % TIPS.length],
  };
}

// MOCK: pequeñas ideas diarias (en uso real, contenido validado por la clínica)
const TIPS = [
  { title: "Daylight before noon", text: "Fifteen minutes outside in the morning helps your sleep tonight, even when it's grey." },
  { title: "One small plan", text: "Pick one easy thing for later today: a short walk, a call, a cup of tea somewhere new." },
  { title: "Same time to bed", text: "Going to bed at a regular time is one of the simplest things that helps after TMS." },
  { title: "Move a little", text: "A ten-minute walk counts. So does stretching by the window." },
  { title: "Say yes once", text: "If someone suggests something small this week, try saying yes once." },
];

/* ---------- Panel de la clínica ---------- */
const PRIORITY: Record<Level, number> = { crisis: 0, high: 1, early: 2, paused: 3, stable: 4, learning: 5 };

export async function clinicOverview(clinic: Clinic) {
  const patients = await clinicPatients(clinic);
  const byId = new Map(patients.map((p) => [p.id, p]));
  const rows = [];
  for (const p of patients) {
    if (p.status !== "active") continue;
    const a = await assess(p, clinic);
    if (p.role === "mentor" && isAlert(a.level))
      await raiseAlert(clinic.id, { userId: p.id, kind: "mentor_support", text: `${p.name} (mentor) may need support: ${oneLine(a, clinic.earlyDays).toLowerCase()}` });
    const log = p.role === "pupil" ? await getActions(p.id) : [];
    const last = log[log.length - 1];
    let reason = "Routine as usual.";
    if (a.level === "crisis") reason = `Help requested. Call ${p.name} now.`;
    else if (a.level === "paused") reason = "Consent revoked: no signals collected.";
    else if (a.level === "learning") reason = `Learning ${p.name}'s usual routine (${a.daysOfData}/8 days).`;
    else if (isAlert(a.level)) {
      reason = oneLine(a, clinic.earlyDays);
      if (p.role === "pupil" && last && last.date >= addDays(asOfDate(), -2)) reason += ` Mentor reached out: ${(CATALOG[last.action] ?? last.action).toLowerCase()}.`;
      if (p.role === "mentor") reason += " Mentor may need support.";
    }
    const partner = p.role === "pupil" ? byId.get(p.mentorId ?? "") : byId.get(p.menteeId ?? "");
    rows.push({
      id: p.id,
      name: p.name,
      role: p.role,
      treatment: p.treatment ?? "in_treatment",
      partner: partner?.name ?? null,
      level: a.level,
      reason,
      paused: !!p.paused,
      learned: [...new Set(log.filter((x) => x.helped).map((x) => CATALOG[x.action] ?? x.action))],
      canPromote: p.role === "pupil" && p.treatment === "finished" && (a.level === "stable" || a.level === "learning"),
      // Detalle para el equipo clínico: cada señal frente a la línea base de la persona
      dates: a.dates,
      signals: a.statuses.map((s) => ({
        key: s.key,
        label: SIGNALS[s.key].label,
        unit: SIGNALS[s.key].unit,
        kind: SIGNALS[s.key].kind,
        digits: SIGNALS[s.key].digits,
        mean: s.mean,
        threshold: s.threshold,
        run: s.run,
        off: s.run >= clinic.earlyDays,
        series: s.series,
      })),
    });
  }
  rows.sort((x, y) => PRIORITY[x.level] - PRIORITY[y.level]);
  const alerts = await getAlerts(clinic.id);

  const invited = patients.filter((p) => p.status === "invited").map((p) => ({ id: p.id, name: p.name, role: p.role, code: p.inviteCode }));
  const freeMentors = patients
    .filter((p) => p.role === "mentor" && p.status === "active" && !p.menteeId && !p.paused)
    .map((p) => ({ id: p.id, name: p.name, availability: p.availability ?? "" }));
  const unpaired = patients.filter((p) => p.role === "pupil" && p.status === "active" && !p.mentorId).map((p) => ({ id: p.id, name: p.name }));

  // Evolución del grupo: estado de cada persona en cada uno de los últimos 14 días
  const active = patients.filter((p) => p.status === "active" && hasConsent(p));
  const data = await Promise.all(active.map(async (p) => ({ stats: await getStats(p.id), health: await getHealth(p.id) })));
  const history = [];
  for (let k = 13; k >= 0; k--) {
    const d = addDays(asOfDate(), -k);
    const c = { date: d, high: 0, early: 0, stable: 0, learning: 0 };
    for (const x of data) {
      const lvl = analyse(x.stats, x.health, d, clinic.earlyDays).level;
      if (lvl === "high" || lvl === "crisis") c.high++;
      else if (lvl === "early") c.early++;
      else if (lvl === "stable") c.stable++;
      else c.learning++;
    }
    history.push(c);
  }

  // Actividad de la red en los últimos 7 días (mensajes e invitaciones reales del chat)
  const weekAgo = new Date(Date.now() - 7 * 864e5).toISOString();
  let messages = 0;
  let invites = 0;
  let accepted = 0;
  for (const p of patients.filter((x) => x.role === "pupil" && x.mentorId)) {
    for (const m of await getThread(p.id, p.mentorId!)) {
      if (m.at < weekAgo) continue;
      messages++;
      if (m.plan) {
        invites++;
        if (m.plan.answer === "yes") accepted++;
      }
    }
  }

  // El relevo: quién acompañó a quién (antiguos mentores → mentores → pupilos)
  type Node = { id: string; name: string; role: string; level: Level; current: boolean; children: Node[] };
  const levelOf = new Map(rows.map((r) => [r.id, r.level]));
  const build = (u: User, current: boolean, seen: Set<string>): Node => {
    seen.add(u.id);
    const kids: Node[] = [];
    for (const fid of u.formerMenteeIds ?? []) {
      const f = byId.get(fid);
      if (f && !seen.has(f.id)) kids.push(build(f, false, seen));
    }
    const mentee = u.menteeId ? byId.get(u.menteeId) : undefined;
    if (mentee && !seen.has(mentee.id)) kids.push(build(mentee, true, seen));
    return { id: u.id, name: u.name, role: u.role, level: levelOf.get(u.id) ?? "learning", current, children: kids };
  };
  const seen = new Set<string>();
  const chain = patients
    .filter((p) => p.role === "mentor" && p.status === "active" && !p.supportId)
    .map((p) => build(p, true, seen))
    .filter((n) => n.children.length > 0);

  return {
    clinic: { name: clinic.name, phone: clinic.phone, earlyDays: clinic.earlyDays },
    needCall: rows.filter((r) => r.level === "crisis" || r.level === "high").length,
    stats: {
      people: rows.length,
      pairs: patients.filter((p) => p.role === "pupil" && p.mentorId).length,
      early: rows.filter((r) => r.level === "early").length,
      stable: rows.filter((r) => r.level === "stable").length,
      messages,
      invites,
      accepted,
    },
    history,
    chain,
    rows,
    alerts: alerts
      .filter((x) => !x.handledAt)
      .sort((x, y) => Number(y.kind === "crisis") - Number(x.kind === "crisis"))
      .map((x) => ({ ...x, name: byId.get(x.userId)?.name ?? "Someone" })),
    invited,
    freeMentors,
    unpaired,
  };
}

export async function clinicFor(u: User) {
  return getClinic(u.clinicId);
}
