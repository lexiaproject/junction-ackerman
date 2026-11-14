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
import { analyse, describe, oneLine, type Assessment } from "./signals";
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
  };
}

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
    });
  }
  rows.sort((x, y) => PRIORITY[x.level] - PRIORITY[y.level]);
  const alerts = await getAlerts(clinic.id);

  const invited = patients.filter((p) => p.status === "invited").map((p) => ({ id: p.id, name: p.name, role: p.role, code: p.inviteCode }));
  const freeMentors = patients
    .filter((p) => p.role === "mentor" && p.status === "active" && !p.menteeId && !p.paused)
    .map((p) => ({ id: p.id, name: p.name, availability: p.availability ?? "" }));
  const unpaired = patients.filter((p) => p.role === "pupil" && p.status === "active" && !p.mentorId).map((p) => ({ id: p.id, name: p.name }));

  return {
    clinic: { name: clinic.name, phone: clinic.phone, earlyDays: clinic.earlyDays },
    needCall: rows.filter((r) => r.level === "crisis" || r.level === "high").length,
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
