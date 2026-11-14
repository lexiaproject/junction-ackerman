// Lo que ve cada actor. REGLA DE ORO (sección 0.3): las vistas del acompañado y del mentor NUNCA llevan un número de
// salud: ni nivel, ni índice, ni rasgos, ni "hemos detectado". Solo la clínica ve datos. Lo comprueba scripts/relevo-check.
import { ACTIONS, DOMAINS, DOMAIN_LABEL, FEAT, FEATURES, FEATURE_INFO, affinity, cosine, fingerprint, hashSeed, rngFrom, PARAMS, type Action, type Domain } from "./engine.ts";
import { DAY0, LAST_DAY, PEOPLE, PERSON, type PersonId } from "./people.ts";
import { CATALOG, COPILOT, LEVEL_LABEL, SHORT_NOTE } from "./texts.ts";
import { DATA_TYPES, DAY, at, dateOf, dayOf, hhmm, weekdayOf, type Card, type Note, type Plan, type Sim } from "./sim.ts";

const name = (id: string) => PERSON[id]?.name ?? (id === "clinic" ? "Clinic" : id);
const WD = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const dayLabel = (day: number) => {
  const d = new Date(dateOf(day) + "T12:00:00Z");
  return `${WD[d.getUTCDay()]} ${d.getUTCDate()} ${MONTH[d.getUTCMonth()]}`;
};
export const longDate = (day: number) => {
  const d = new Date(dateOf(day) + "T12:00:00Z");
  return `${["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][d.getUTCDay()]}, ${d.getUTCDate()} ${["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"][d.getUTCMonth()]}`;
};
export function when(now: number, t: number) {
  const dn = dayOf(now) - dayOf(t);
  if (dn === 0) return now - t < 60 ? (now - t < 2 ? "just now" : `${now - t} min ago`) : `today ${hhmm(t)}`;
  if (dn === 1) return `yesterday ${hhmm(t)}`;
  if (dn < 7) return `${WD[weekdayOf(dayOf(t))]} ${hhmm(t)}`;
  return `${dayLabel(dayOf(t))}`;
}
// U-10/J-09: la etiqueta del plan se escribió al crearlo ("Tomorrow, Sunday, 10:00"); si era relativa y ya no es cierta, se recalcula
const WEEKDAY_LONG = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
function planWhen(now: number, p: Plan) {
  const day = dayOf(p.whenT);
  const dn = day - dayOf(now);
  const rel = /^(Today|Tomorrow)\b/.test(p.whenLabel);
  const weekday = WEEKDAY_LONG.some((d) => p.whenLabel.startsWith(d)); // "Saturday, 11:00": vale esa semana; luego, con fecha
  if (rel ? dn === day - dayOf(p.created) : !(weekday && Math.abs(dn) >= 7)) return p.whenLabel;
  const wd = WEEKDAY_LONG[weekdayOf(day)];
  const label = dn === 0 ? "Today" : dn === 1 ? `Tomorrow, ${wd}` : dn === -1 ? "Yesterday" : Math.abs(dn) < 7 ? wd : dayLabel(day);
  return `${label}, ${hhmm(p.whenT)}`;
}

const clock = (sim: Sim) => ({ t: sim.now, day: sim.now >= 0 ? dayOf(sim.now) : 0, time: hhmm(sim.now), date: longDate(dayOf(sim.now)), short: dayLabel(dayOf(sim.now)) });

function noteView(sim: Sim, n: Note, me: string) {
  // K-14: una nota que activó la lista de crisis no llega tal cual a la otra persona de la pareja (el mentor también está en
  // mantenimiento). Solo la ve quien la escribió y, si dio consentimiento, la clínica.
  const withheld = !!n.analysis?.crisis && n.from !== me;
  return {
    id: n.id, from: n.from, fromName: name(n.from), mine: n.from === me, t: n.t, when: when(sim.now, n.t), duration: withheld ? 0 : n.duration,
    text: withheld ? `This note was passed to ${name(n.from)}'s clinic team.` : n.text, audio: withheld ? false : n.audio, kind: n.kind, withheld,
    thanked: n.thankedAt !== undefined && n.thankedAt <= sim.now,
  };
}
const conversation = (sim: Sim, a: string, b: string) =>
  sim.notes.filter((n) => n.t <= sim.now && ((n.from === a && n.to === b) || (n.from === b && n.to === a))).map((n) => noteView(sim, n, a));

/* ---------- Dispositivos (A4 / M4): qué está conectado, si funciona y para qué; nunca un valor ---------- */
function devices(sim: Sim, id: PersonId) {
  const p = PERSON[id];
  const s = sim.people[id];
  const day = Math.max(0, dayOf(sim.now));
  const phoneData = p.raw.cols.steps[day] !== null || p.raw.cols.screen[day] !== null;
  const missingDays = (() => {
    let n = 0;
    for (let d = day; d >= 0 && p.raw.cols.tst[d] === null && n < 9; d--) n++;
    return n;
  })();
  const sleepOff = DATA_TYPES.sleep.cols.every((c) => s.disabled.has(c)) && DATA_TYPES.pulse.cols.every((c) => s.disabled.has(c));
  const rows = [
    { id: "phone", name: "This phone", detail: "Steps, time out of home and places visited", icon: "phone", status: phoneData ? "connected" : "stale", statusText: phoneData ? "Connected" : "No data since yesterday", sync: phoneData ? "Last sync: 14 min ago" : "Last sync: yesterday", help: phoneData ? null : "Is the app allowed to run in the background?" },
    p.wearable
      ? {
          id: "ring", name: p.wearable, via: "via Apple Health", detail: "Sleep, steps and pulse", icon: "ring",
          status: sleepOff ? "permission" : s.deviceIssue || missingDays >= 2 ? "stale" : "connected",
          statusText: sleepOff ? "Permission off" : s.deviceIssue || missingDays >= 2 ? `No data for ${Math.max(2, missingDays)} days` : "Connected",
          sync: s.deviceIssue || missingDays >= 2 ? `Last sync: ${Math.max(2, missingDays)} days ago` : "Last sync: 2 h ago",
          help: s.deviceIssue || missingDays >= 2 ? "Is it charged and near your phone?" : null,
        }
      : { id: "health", name: "Watch or ring", via: "via Apple Health", detail: "Sleep, steps and pulse", icon: "ring", status: "none", statusText: "Not connected", sync: null, help: null },
    { id: "hc", name: "Watch or ring", via: "via Health Connect (Android)", detail: "Sleep, steps and pulse", icon: "android", status: "none", statusText: "Not connected", sync: null, help: null },
    { id: "home", name: "Home sensors", via: "optional", detail: "Movement between rooms", icon: "home", status: "soon", statusText: "Coming soon", sync: null, help: null },
  ];
  const types = Object.entries(DATA_TYPES).map(([k, v]) => ({ key: k, label: v.label, purpose: v.purpose, on: !v.cols.every((c) => s.disabled.has(c)) }));
  return { rows, types, simulated: true };
}

/* ---------- App del acompañado (A0-A5) ---------- */
// Hitos de la relación (sin datos de salud): desde cuándo, cuántos días y cuántos planes hechos juntos
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const shortDate = (day: number) => { const [, m, d] = dateOf(day).split("-"); return `${Number(d)} ${MONTHS[Number(m) - 1]}`; };
function together(sim: Sim, mentor: PersonId, mentee: PersonId, since: number | undefined) {
  if (since === undefined) return null;
  const plans = sim.plans.filter((p) => p.mentor === mentor && p.mentee === mentee && p.status === "accepted" && p.whenT <= sim.now).length;
  return { since: shortDate(since), days: Math.max(0, dayOf(sim.now) - since), plans };
}

export function menteeView(sim: Sim, id: PersonId) {
  const s = sim.people[id];
  const now = sim.now;
  const mentorId = s.mentorId;
  const m = mentorId ? sim.people[mentorId] : null;
  const mentorState = !m ? "none" : m.leftProgram ? "left" : m.rhythm === 0 || m.tookPause ? "paused" : "active";
  const conv = mentorId ? conversation(sim, id, mentorId) : [];
  const fromMentor = conv.filter((n) => !n.mine);
  const last = fromMentor.at(-1) ?? null;
  // V2 ("X would like to talk to you") ya está contestado si la persona agradeció una nota o respondió a un plan llegados después:
  // así no sigue el aviso en su móvil mientras el mentor ya ve su respuesta
  const answeredV2 = (n: { code: string; t: number }) =>
    n.code === "V2" && (fromMentor.some((x) => x.t >= n.t && x.thanked) || sim.plans.some((p) => p.mentee === id && p.created >= n.t && p.respondedAt !== undefined && p.respondedAt <= now));
  const active = sim.notices
    .filter((n) => n.to === id && n.status === "active" && n.t <= now && n.validUntil >= now && ["V2", "V3", "V4", "V7", "V8"].includes(n.code) && !answeredV2(n))
    .sort((a, b) => ["V4", "V2", "V3", "V7", "V8"].indexOf(a.code) - ["V4", "V2", "V3", "V7", "V8"].indexOf(b.code));
  const notices = active.map((n) => {
    let buttons = n.buttons;
    if (n.code === "V2") {
      const hasNote = fromMentor.some((x) => x.t >= n.t);
      buttons = n.buttons.filter((b) => (hasNote ? b.id !== "note" : b.id !== "listen"));
    }
    return { id: n.id, code: n.code, text: n.text, buttons, from: n.about ? name(n.about) : null, lock: n.lock ?? n.text, noteId: n.code === "V2" ? fromMentor.find((x) => x.t >= n.t)?.id ?? null : null };
  });
  const plans = sim.plans.filter((p) => p.mentee === id && p.created <= now);
  const planView = (p: Plan) => ({
    id: p.id, title: p.title, icon: p.icon, when: planWhen(now, p), whenT: p.whenT, status: p.status, feedback: p.feedback ?? null,
    past: now >= p.whenT, askFeedback: p.status === "accepted" && now >= p.whenT && !p.feedback && now - p.whenT < 3 * DAY,
    mentorName: name(p.mentor), note: p.noteId ? conv.find((n) => n.id === p.noteId) ?? null : null, place: p.action === "actividad_con_sentido" ? "Hakaniemi market" : p.action === "paseo_juntos" ? "Shore path, by the bridge" : p.action === "ancla_manana" ? "Café Regatta" : null,
  });
  const proposed = [...plans].reverse().find((p) => p.status === "proposed" && p.whenT > now);
  const feedback = [...plans].reverse().find((p) => p.status === "accepted" && now >= p.whenT && !p.feedback && now - p.whenT < 3 * DAY);
  const upcoming = [...plans].reverse().find((p) => p.status === "accepted" && p.whenT > now);
  // Plan ya valorado: se queda un día en su móvil con lo que contestó (el mentor ve "said it went well" ese mismo día)
  const rated = [...plans].reverse().find((p) => p.feedback && p.feedbackAt !== undefined && p.feedbackAt <= now && now - p.feedbackAt < DAY);
  const month = dateOf(dayOf(now)).slice(0, 7);
  const social = plans.filter((p) => p.status === "accepted" && dateOf(dayOf(p.whenT)).slice(0, 7) === month && p.mentor === mentorId).length;
  return {
    clock: clock(sim), me: { id, name: name(id) }, onboarded: s.onboarded, consents: { data: s.consents.data, notes: s.consents.notes, ideas: s.consents.ideas },
    mentor: mentorId ? { id: mentorId, name: name(mentorId), state: mentorState, story: mentorId === "pablo" ? "Finished TMS in May. Walks by the shore every morning." : "" } : null,
    intro: mentorId ? conv.find((n) => n.kind === "intro") ?? null : null,
    together: mentorId ? (() => { const t = together(sim, mentorId, id, s.pairSince); return t && { ...t, chainFrom: m?.mentorId ? name(m.mentorId) : null }; })() : null,
    notices, last, conversation: conv,
    plan: proposed ? planView(proposed) : feedback ? planView(feedback) : upcoming ? planView(upcoming) : rated ? planView(rated) : null,
    plans: plans.slice(-6).map(planView).reverse(),
    social: mentorId ? { label: `Plans with ${name(mentorId)} this month: ${social}` } : null,
    openHelp: s.openHelp,
    quiet: s.quietUntil !== null && now < s.quietUntil ? { until: `${dayLabel(dayOf(s.quietUntil))}` } : null,
    supportAsked: sim.alerts.some((a) => a.person === id && a.kind === "support" && a.status !== "resolved" && a.t <= now),
    helpNote: s.crisis?.source === "note" && s.openHelp === s.crisis.alertId, // K-29: la ayuda se abrió por una nota que ya avisó a la clínica
    devices: devices(sim, id),
    clinic: { name: "Aalto TMS Clinic", phone: "+358 9 4512 3300" },
    requests: sim.requests.filter((r) => r.person === id).map((r) => ({ kind: r.kind, when: when(now, r.t) })),
  };
}

/* ---------- App del mentor (M0-M7) ---------- */
export function mentorView(sim: Sim, id: PersonId) {
  const s = sim.people[id];
  const now = sim.now;
  const menteeId = s.menteeId;
  const mentee = menteeId ? sim.people[menteeId] : null;
  const myMentor = s.mentorId;
  const greeting = (() => {
    const h = Math.floor((now % DAY) / 60);
    return h < 5 ? "Good evening" : h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
  })();
  // M0: propuesta de la clínica pendiente
  const proposal = Object.values(sim.people).find((x) => x.proposedMentor?.mentor === id && x.proposedMentor.status === "pending" && x.proposedMentor.t <= now);
  // K-12/C-11: antes del consentimiento, el mentor no lee cómo empezó la recaída del otro (la huella queda para la clínica y la demo)
  const m0raw = proposal ? matchFor(proposal.id, id) : null;
  const m0 = m0raw ? { ...m0raw, reasons: ["Your clinic thinks you have a lot in common", ...m0raw.reasons.slice(1)] } : null;
  const self = sim.notices
    .filter((n) => n.to === id && n.status === "active" && n.t <= now && n.validUntil >= now && ["V5", "HELP"].includes(n.code))
    .map((n) => ({ id: n.id, code: n.code, text: n.text, buttons: n.buttons.filter((b) => (n.code === "V5" ? hasNoteSince(sim, n.about!, id, n.t) ? b.id !== "note" : b.id !== "listen" : true)), from: n.about ? name(n.about) : null, noteId: lastNoteFrom(sim, n.about!, id)?.id ?? null }));
  const mentorNote = myMentor ? lastNoteFrom(sim, myMentor, id) : null;
  const m5 = s.rhythmProposal && !s.rhythmProposal.answer && s.rhythmProposal.t <= now
    ? { variant: s.rhythmProposal.screen === "M5_pause" ? "pause" : "light", mentorName: myMentor ? name(myMentor) : null, menteeName: menteeId ? name(menteeId) : null }
    : null;
  const m6 = mentee && mentee.level === 3 ? { menteeName: name(menteeId!) } : null;
  // Cierre tras la crisis: el día que la clínica la resuelve, el mentor sabe que el equipo está con la persona (sin ningún dato de
  // salud) y que puede escribirle cuando quiera. No se le pide nada si está en pausa.
  const m6After = !m6 && mentee && s.rhythm !== 0 && sim.alerts.some((a) => a.person === menteeId && (a.kind === "severe" || a.kind === "help") && a.status === "resolved" && a.resolvedAt !== undefined && a.resolvedAt <= now && dayOf(a.resolvedAt) === dayOf(now))
    ? { menteeName: name(menteeId!) } : null;
  const card = m6 ? null : sim.cards.find((c) => c.mentor === id && c.t <= now && dayOf(c.t) === dayOf(now) && (c.status === "waiting" || c.status === "shown"));
  const sent = sim.cards.find((c) => c.mentor === id && c.status === "sent" && c.sentAt !== undefined && dayOf(c.sentAt) === dayOf(now));
  const myPlans = sim.plans.filter((p) => p.mentor === id && p.created <= now);
  // Un plan del que ya llegó un "Good" deja sitio a la tarjeta de abajo (no se repite la misma noticia dos veces)
  const running = [...myPlans].reverse().find((p) => (p.status === "accepted" && p.whenT >= now - 120 && !p.feedback) || ((p.status === "proposed" || p.status === "change_requested") && p.whenT > now) || ((p.status === "cant" || p.status === "other_day") && now - (p.respondedAt ?? 0) < DAY));
  const copilot = sim.copilots.find((c) => c.mentor === id && c.status === "active" && c.t <= now && now - c.t < 3 * DAY);
  // Cerrar el círculo: el mentor se entera de que su plan fue bien (solo "Good"; "So-so" y "Didn't go" no le llegan, nadie se siente culpable)
  const good = [...myPlans].reverse().find((p) => p.feedback === "good" && p.feedbackAt !== undefined && p.feedbackAt <= now && now - p.feedbackAt < DAY);
  // ...o de que la persona le dio las gracias por una nota (gana el gesto más reciente; solo uno a la vez)
  const thanks = menteeId ? [...sim.notes].reverse().find((n) => n.from === id && n.to === menteeId && n.thankedAt !== undefined && n.thankedAt <= now && now - n.thankedAt < DAY) : undefined;
  const kind = good && (!thanks || good.feedbackAt! >= thanks.thankedAt!)
    ? { menteeName: name(good.mentee), text: `${name(good.mentee)} said it went well`, detail: good.title.replace(` with ${name(id)}`, "") }
    : thanks ? { menteeName: name(menteeId!), text: `${name(menteeId!)} said thanks for your note`, detail: null } : null;
  const cardView = (c: Card) => {
    const mn = name(c.mentee);
    const item = c.kind === "idea" && c.action ? CATALOG[c.action] : null;
    const draft = sim.world.ai[`t1:${c.id}:${c.action}`];
    return {
      id: c.id, menteeName: mn, kind: c.kind,
      question: c.twoStep?.status === "pending" ? `Would you like to talk to ${mn} today?` : null,
      title: item ? item.title(mn) : SHORT_NOTE.title(mn),
      reason: item ? item.reason : SHORT_NOTE.reason,
      message: draft ?? (item ? item.message(mn) : SHORT_NOTE.message(mn)),
      aiDrafted: !!draft, icon: item?.icon ?? "note", prepared: !!c.prepared,
    };
  };
  const rhythmLabel = ["Pause", "Light", "Normal", "Intense"][s.rhythm];
  return {
    clock: clock(sim), me: { id, name: name(id) }, greeting: `${greeting}, ${name(id)}`,
    m0, self, mentorNote, m5, m6, m6After,
    card: card ? cardView(card) : null,
    sent: sent && !card ? { menteeName: name(sent.mentee) } : null,
    plan: running ? { id: running.id, title: running.title.replace(` with ${name(id)}`, ""), when: planWhen(now, running), whenT: running.whenT, icon: running.icon, menteeName: name(running.mentee), status: running.status } : null,
    mentee: menteeId ? { id: menteeId, name: name(menteeId) } : null,
    menteeQuiet: menteeId && mentee?.quietUntil != null && now < mentee.quietUntil ? { until: dayLabel(dayOf(mentee.quietUntil)) } : null,
    together: menteeId ? together(sim, id, menteeId, s.pairSince) : null,
    myMentor: myMentor ? { id: myMentor, name: name(myMentor) } : null,
    conversations: {
      mentee: menteeId ? conversation(sim, id, menteeId) : [],
      mentor: myMentor ? conversation(sim, id, myMentor) : [],
    },
    kind,
    copilot: copilot ? { id: copilot.id, text: COPILOT.text(name(copilot.mentee)), example: COPILOT.example } : null,
    rhythm: { value: s.rhythm, label: rhythmLabel, paused: s.rhythm === 0, reviewing: s.reviewPace },
    devices: devices(sim, id),
    consents: { data: s.consents.data, notes: s.consents.notes, ideas: s.consents.ideas },
    left: s.leftProgram,
    requests: sim.requests.filter((r) => r.person === id).map((r) => ({ kind: r.kind, when: when(now, r.t) })),
  };
}
function lastNoteFrom(sim: Sim, from: string, to: string) {
  const n = [...sim.notes].reverse().find((x) => x.from === from && x.to === to && x.t <= sim.now);
  return n ? noteView(sim, n, to) : null;
}
const hasNoteSince = (sim: Sim, from: string, to: string, t: number) => sim.notes.some((x) => x.from === from && x.to === to && x.t >= t && x.t <= sim.now);

/* ---------- Emparejamiento (M0 y C4) ---------- */
const cand = (id: PersonId) => {
  const p = PERSON[id];
  return { id, fp: fingerprint(p.q), monthsPostTms: p.monthsPostTms, level0Weeks: p.level0Weeks, acuteRelapse: false, hours: p.hours, lang: p.lang, prefs: p.prefs, zone: p.zone };
};
/** Frase de huella (T4). Plantilla determinista; Gemini solo la redactaría mejor. */
function footprintPhrase(a: PersonId, b: PersonId) {
  const qa = PERSON[a].q;
  const qb = PERSON[b].q;
  const both = (k: keyof typeof qa) => (qa[k] ?? 0) >= 1 && (qb[k] ?? 0) >= 1;
  const bits: string[] = [];
  if (both("sueno") && (qa.dir_sueno ?? 0) === (qb.dir_sueno ?? 0) && qa.dir_sueno) bits.push(qa.dir_sueno > 0 ? "sleeping more" : "sleeping less");
  if (both("movilidad")) bits.push("going out less");
  return bits.length ? `You both started out ${bits.join(" and ")}` : "Your relapses started in a similar way";
}
export function matchFor(menteeId: PersonId, mentorId: PersonId) {
  const a = affinity(cand(mentorId), cand(menteeId));
  if (!a) return null;
  const mp = PERSON[mentorId];
  const me = PERSON[menteeId];
  const reasons: string[] = [];
  if (a.sim >= 0.85) reasons.push(footprintPhrase(mentorId, menteeId));
  else reasons.push("Some of your early changes were alike");
  if (mp.prefs.includes("voice") && me.prefs.includes("voice")) reasons.push("You both like voice notes");
  if (a.hours > 0) reasons.push(a.hours >= 0.5 ? "Compatible schedules" : "Some overlap in schedules");
  if (mp.zone === me.zone) reasons.push(`Both in ${me.zone}`);
  return { menteeId, menteeName: me.name, mentorId, mentorName: mp.name, affinity: a.score, percent: Math.round(a.score * 100), reasons: reasons.slice(0, 3) };
}

/* ---------- Web de la clínica (C1-C6) ---------- */
export function levelOf(sim: Sim, id: PersonId) {
  return sim.people[id].level;
}
function summary(sim: Sim, id: PersonId) {
  const s = sim.people[id];
  const day = dayOf(sim.now);
  const p = PERSON[id];
  if (day < p.joinedDay) return { text: "Not in Relevo yet.", parts: [] as { text: string; feature?: string }[] };
  if (!s.consents.data) return { text: "No data consent.", parts: [{ text: "No data consent." }] };
  const run = sim.runs[id];
  const row = run?.days[day];
  if (!row || !row.baselineDone) {
    const n = Math.min(28, day - p.joinedDay + 1);
    return { text: `Baseline in progress: day ${n} of 28.`, parts: [{ text: `Baseline in progress: day ${n} of 28.` }] };
  }
  const lvl = s.level;
  const days = day - s.levelSince;
  const head = lvl === 0 ? "Stable" : `${LEVEL_LABEL[lvl]} ${days === 0 ? "since today" : `for ${days} day${days > 1 ? "s" : ""}`}`;
  const thr = sim.world.config.domain_hi;
  const hi = DOMAINS.filter((d) => (row.s[d] ?? -9) >= thr).sort((a, b) => row.s[b]! - row.s[a]!);
  // El nivel sale de la tendencia de varios días y "hi" solo mira hoy: la frase lo dice para que no parezca una contradicción
  if (!hi.length) {
    const t = lvl === 0 ? `${head}. No clear change from their usual in any area.` : `${head}. Overall drift from their usual; no single area stands out today.`;
    return { text: t, parts: [{ text: t }] };
  }
  // Hasta 3 rasgos con mayor z (uno por dominio alterado), en lenguaje clínico
  const feats = hi.map((d) => Object.entries(row.z).filter(([k]) => FEAT[k].domain === d).sort((a, b) => b[1] - a[1])[0]).filter(Boolean).slice(0, 3);
  const phrase = (k: string) => (k === "tst_excess7" ? (p.tstDirection >= 0 ? "sleeps more than usual" : "sleeps less than usual") : FEATURE_INFO[k].phrase);
  const doms = hi.map((d) => DOMAIN_LABEL[d]);
  const list = (a: string[]) => (a.length <= 1 ? a.join("") : `${a.slice(0, -1).join(", ")} and ${a.at(-1)}`);
  const lead = lvl === 0 ? `Stable overall. A recent change, not sustained yet, in ${list(doms)}: ` : `${head}. Changes from their usual in ${list(doms)}: `;
  const parts: { text: string; feature?: string }[] = [{ text: lead }];
  feats.forEach(([k], i) => {
    parts.push({ text: phrase(k), feature: k });
    parts.push({ text: i === feats.length - 1 ? "." : i === feats.length - 2 ? " and " : ", " });
  });
  return { text: parts.map((x) => x.text).join(""), parts };
}
function lastContact(sim: Sim, id: PersonId) {
  const items: { t: number; label: string }[] = [];
  for (const n of sim.notes) if (n.t <= sim.now && (n.from === id || n.to === id) && n.to !== "clinic") items.push({ t: n.t, label: "note" });
  for (const p of sim.plans) if ((p.mentee === id || p.mentor === id) && p.status === "accepted" && p.whenT <= sim.now) items.push({ t: p.whenT, label: p.action === "paseo_juntos" ? "walk" : p.action === "llamada_o_quedar" ? "call with mentor" : "plan" });
  for (const c of sim.calls) if (c.person === id && c.done && c.t <= sim.now) items.push({ t: c.t, label: "clinic call" });
  const last = items.sort((a, b) => b.t - a.t)[0];
  if (last) return { t: last.t, label: `${when(sim.now, last.t)} · ${last.label}` };
  const p = PERSON[id];
  return p.background ? { t: sim.now - 2 * DAY, label: `${when(sim.now, sim.now - 2 * DAY - 300)} · note` } : null; // MOCK: contacto de las personas de relleno
}

export function clinicPanel(sim: Sim) {
  const now = sim.now;
  const day = dayOf(now);
  const rows = PEOPLE.filter((p) => day >= p.joinedDay).map((p) => {
    const s = sim.people[p.id];
    const lvl = s.level;
    const flags: string[] = [];
    if (s.noData48) flags.push("No data 48 h");
    if (s.quietUntil !== null && sim.now < s.quietUntil) flags.push("Fewer messages (their choice)");
    const ignored = sim.notices.some((n) => n.status === "active" && ["V2", "V3"].includes(n.code) && n.to === p.id && now - n.t >= 2 * DAY);
    const v1Ignored = sim.cards.some((c) => c.mentee === p.id && c.twoStep?.status === "expired" && now - c.t < 3 * DAY) && !sim.notes.some((n) => n.from === p.id && now - n.t < 2 * DAY);
    if (lvl >= 1 && (ignored || v1Ignored)) flags.push("No response to notices");
    if (p.role === "mentor" && s.menteeId && (s.reviewPace || s.rhythm === 0 || s.ideasPausedLevel)) flags.push("Review pace");
    if (s.mentorId) {
      const m = sim.people[s.mentorId];
      if (m.rhythm === 0 || m.ideasPausedLevel || m.leftProgram) flags.push("No active mentor");
    }
    if (!s.consents.data && p.id !== "luis") flags.push("No data consent");
    const baseline = !sim.runs[p.id]?.days[day]?.baselineDone;
    const cta = lvl === 3 ? "Call now" : lvl === 2 ? "Call today" : flags.includes("Review pace") ? "Review pace" : "View file";
    return {
      id: p.id, name: p.name, role: p.role === "mentor" ? "Mentor" : "Mentee", level: lvl, levelLabel: LEVEL_LABEL[lvl], baseline,
      summary: summary(sim, p.id).text, daysInLevel: day - s.levelSince, rhythm: p.role === "mentor" && s.menteeId ? ["Pause", "Light", "Normal", "Intense"][s.rhythm] : null,
      lastContact: lastContact(sim, p.id), cta, flags, simulated: p.background,
    };
  });
  rows.sort((a, b) => b.level - a.level || b.daysInLevel - a.daysInLevel || a.name.localeCompare(b.name));
  return {
    counters: { people: rows.length, needCall: rows.filter((r) => r.level === 2).length, early: rows.filter((r) => r.level === 1).length, severe: rows.filter((r) => r.level === 3).length },
    rows,
  };
}

export function personFile(sim: Sim, id: PersonId) {
  const p = PERSON[id];
  const s = sim.people[id];
  const run = sim.runs[id];
  const day = Math.max(0, Math.min(LAST_DAY, dayOf(sim.now)));
  const from = Math.max(0, day - 34);
  const idx = Array.from({ length: day - from + 1 }, (_, i) => from + i);
  const bl = run.baseline;
  const r1 = (v: number | null | undefined, d = 2) => (v === null || v === undefined || Number.isNaN(v) ? null : Math.round(v * 10 ** d) / 10 ** d);
  const series = (k: string, scale = 1, d = 2) => idx.map((i) => r1(run.feat[k]?.[i] !== null && run.feat[k]?.[i] !== undefined ? run.feat[k][i]! * scale : null, d));
  const band = (k: string, scale = 1, d = 2) => (bl && k in bl.med ? { lo: r1((bl.med[k] - bl.scale[k]) * scale, d), mid: r1(bl.med[k] * scale, d), hi: r1((bl.med[k] + bl.scale[k]) * scale, d) } : null);
  const rawSeries = (c: string, scale = 1, d = 2) => idx.map((i) => (s.disabled.has(c) ? null : r1(p.raw.cols[c][i] !== null ? p.raw.cols[c][i]! * scale : null, d)));
  const row = run.days[day];
  const weeks = Math.floor((Date.parse(dateOf(day)) - Date.parse(p.tmsEnd)) / (7 * 864e5));
  const validDays = (col: string, w: number) => p.raw.cols[col].slice(Math.max(0, day - w + 1), day + 1).filter((v, i) => v !== null && !s.disabled.has(col) && i >= 0).length;
  const SRC: Record<string, [string, number]> = {
    tst_sd14: ["tst", 14], mid_sd14: ["mid", 14], waso7: ["waso", 7], awak7: ["awak", 7], tst_excess7: ["tst", 7], steps7: ["steps", 7], home7: ["home", 7],
    entropy7: ["entropy", 7], rmssd7: ["rmssd", 7], rhr7: ["rhr", 7],
  };
  const features = FEATURES.map((f) => {
    const k = f.key === "tst_excess7" ? "tst_mean7" : f.key;
    const [col, w] = SRC[f.key];
    const v = run.feat[k]?.[day];
    return {
      key: f.key, name: FEATURE_INFO[f.key].name, signal: FEATURE_INFO[f.key].signal, domain: DOMAIN_LABEL[f.domain], unit: f.unit,
      value: v === null || v === undefined ? null : r1(v, f.unit === "0-1" ? 2 : 1), baseline: bl && k in bl.med ? r1(bl.med[k], f.unit === "0-1" ? 2 : 1) : null,
      z: row?.z[f.key] !== undefined ? r1(row.z[f.key], 1) : null, valid: `${validDays(col, w)}/${w}`, available: v !== null && v !== undefined && row?.z[f.key] !== undefined,
    };
  });
  const history = sim.logs.filter((l) => l.person === id && l.t <= sim.now).slice(-40).reverse().map((l) => ({ when: when(sim.now, l.t), kind: l.kind, text: l.text.replace(/“[^”]*”/g, (m) => (l.kind === "note" ? "" : m)), by: l.by ?? null }));
  const notesCount = sim.notes.filter((n) => n.t <= sim.now && (n.from === id || n.to === id)).length;
  const crisisNote = sim.alerts.find((a) => a.person === id && a.noteId && a.kind === "severe");
  const pair = s.mentorId ? { label: "Mentor", name: name(s.mentorId), id: s.mentorId } : null;
  const mentee = s.menteeId ? { label: "Accompanies", name: name(s.menteeId), id: s.menteeId } : null;
  return {
    id, name: p.name, role: p.role === "mentor" ? "Mentor" : "Mentee", weeksSinceTms: weeks, pair, mentee, level: s.level, levelLabel: LEVEL_LABEL[s.level],
    since: dayLabel(s.levelSince), daysInLevel: day - s.levelSince, simulated: true, background: p.background,
    consent: s.consents.data, baselineDone: !!row?.baselineDone, baselineDay: Math.min(28, day - p.joinedDay + 1),
    summary: summary(sim, id), rhythm: p.role === "mentor" && s.menteeId ? ["Pause", "Light", "Normal", "Intense"][s.rhythm] : null, ideasPaused: s.ideasPausedM6 || s.ideasPausedClinic || s.ideasPausedLevel,
    ideasPausedM6: s.ideasPausedM6, ideasPausedClinic: s.ideasPausedClinic,
    thresholds: { l1: sim.world.config.person[id]?.l1_R ?? sim.world.config.l1_R, l2: sim.world.config.person[id]?.l2_R ?? sim.world.config.l2_R, l3: sim.world.config.l3_R, domain: sim.world.config.person[id]?.domain_hi ?? sim.world.config.domain_hi },
    charts: {
      dates: idx.map((i) => dateOf(i).slice(5)), labels: idx.map((i) => dayLabel(i)),
      Rs: idx.map((i) => r1(run.days[i].Rs)), level: idx.map((i) => (i === day ? s.level : historyLevel(sim, id, i))),
      sleep: rawSeries("tst", 1 / 60, 2), sleepMean: series("tst_mean7", 1 / 60), sleepBand: band("tst_mean7", 1 / 60), sleepSd: series("tst_sd14", 1, 0),
      steps: rawSeries("steps", 1, 0), stepsMean: series("steps7", 1, 0), stepsBand: band("steps7", 1, 0), home: series("home7", 1, 1), homeBand: band("home7", 1, 1),
      baselineEnd: bl ? Math.max(-1, bl.end - from) : -1,
    },
    domains: DOMAINS.map((d) => ({ key: d, label: DOMAIN_LABEL[d], s: r1(row?.s[d] ?? null), smooth: r1(row?.sSmooth[d] ?? null), feats: row?.counts?.[d] ?? 0 })),
    features, history, notesCount,
    measures: [
      ...MEASURE_ORDER.map((key) => {
        const m = DISPLAY[key];
        const z = row?.z[key];
        const v = series(m.k, m.scale, m.d).at(-1) ?? null;
        return { key, area: FEAT[key].domain, signal: FEATURE_INFO[key].signal, name: FEATURE_INFO[key].name, unit: m.unit, experimental: false, series: series(m.k, m.scale, m.d), band: band(m.k, m.scale, m.d), value: v, z: z === undefined ? null : r1(z, 1) };
      }),
      ...(() => { const r = roomsMeasure(id, s.disabled.has("steps") ? p.raw.cols.steps.map(() => null) : p.raw.cols.steps, idx); return r ? [r] : []; })(),
    ],
    weights: (() => {
      const w = sim.world.config.weights as Record<string, number>;
      return DOMAINS.every((d) => typeof w[d] === "number") && Object.keys(w).every((k) => (DOMAINS as string[]).includes(k)) ? sim.world.config.weights : PARAMS.weights;
    })(),
    calls: sim.calls.filter((c) => c.person === id && c.t <= sim.now).map((c) => ({ mode: c.mode, when: when(sim.now, c.t), scheduledFor: c.scheduledFor ? `${dayLabel(dayOf(c.scheduledFor))} ${hhmm(c.scheduledFor)}` : null, done: !!c.done })),
    crisisNote: crisisNote && s.consents.notes ? { id: crisisNote.noteId, text: sim.notes.find((n) => n.id === crisisNote.noteId)?.text ?? "" } : null,
    raw: { R: r1(row?.R ?? null), Rs: r1(row?.Rs ?? null) },
  };
}
/* ---------- Medidas de cada área para la ficha (C2): serie de 35 días, franja habitual y z ---------- */
const MEASURE_ORDER = ["mid_sd14", "tst_sd14", "waso7", "awak7", "tst_excess7", "home7", "entropy7", "steps7", "rmssd7", "rhr7"];
const DISPLAY: Record<string, { k: string; scale: number; d: number; unit: string }> = {
  mid_sd14: { k: "mid_sd14", scale: 1, d: 0, unit: "min" }, tst_sd14: { k: "tst_sd14", scale: 1, d: 0, unit: "min" },
  waso7: { k: "waso7", scale: 1, d: 0, unit: "min" }, awak7: { k: "awak7", scale: 1, d: 1, unit: "per night" },
  tst_excess7: { k: "tst_mean7", scale: 1 / 60, d: 1, unit: "h" }, home7: { k: "home7", scale: 1, d: 1, unit: "h" },
  entropy7: { k: "entropy7", scale: 1, d: 2, unit: "" }, steps7: { k: "steps7", scale: 1, d: 0, unit: "steps" },
  rmssd7: { k: "rmssd7", scale: 1, d: 0, unit: "ms" }, rhr7: { k: "rhr7", scale: 1, d: 1, unit: "bpm" },
};
// MOCK: movimiento entre habitaciones (señal experimental). En la demo no hay sensor dentro de casa: se deriva de los
// pasos de cada día con ruido determinista. Se enseña en la ficha marcada "experimental" y NO entra en el riesgo.
function roomsMeasure(id: string, steps: (number | null)[], idx: number[]) {
  const rng = rngFrom(hashSeed("rooms", id));
  const daily = steps.map((v) => (v === null ? null : 30 * Math.pow(Math.max(v, 300) / 6500, 0.6) * (0.92 + 0.16 * rng())));
  const mean7 = daily.map((_, i) => { const w = daily.slice(Math.max(0, i - 6), i + 1).filter((v): v is number => v !== null); return w.length >= 4 ? w.reduce((a, b) => a + b, 0) / w.length : null; });
  const base = mean7.slice(0, 28).filter((v): v is number => v !== null).sort((a, b) => a - b);
  if (base.length < 14) return null;
  const med = base[Math.floor(base.length / 2)];
  const mad = [...base.map((v) => Math.abs(v - med))].sort((a, b) => a - b)[Math.floor(base.length / 2)] * 1.4826;
  const scale = Math.max(mad, 1.5);
  const r1 = (v: number | null) => (v === null ? null : Math.round(v * 10) / 10);
  const last = mean7[idx[idx.length - 1]];
  return {
    key: "rooms7", area: "movilidad" as Domain, signal: "Less movement inside the home", name: "Room-to-room moves (7 d)", unit: "per day", experimental: true,
    series: idx.map((i) => r1(mean7[i])), band: { lo: r1(med - scale), mid: r1(med), hi: r1(med + scale) },
    value: r1(last), z: last === null ? null : r1(Math.max(-4, Math.min(4, -(last - med) / scale))),
  };
}

function historyLevel(sim: Sim, id: PersonId, day: number) {
  const h = sim.people[id].history.filter((x) => x.day <= day);
  return h.length ? h[h.length - 1].level : 0;
}

export function clinicAlerts(sim: Sim) {
  return sim.alerts
    .filter((a) => a.t <= sim.now)
    .map((a) => ({
      id: a.id, person: a.person, name: name(a.person), kind: a.kind, text: a.text, when: when(sim.now, a.t), t: a.t, status: a.status, assignee: a.assignee ?? null,
      forwarded: a.forwardedAt !== undefined && a.forwardedAt <= sim.now, resolvedWhen: a.resolvedAt ? when(sim.now, a.resolvedAt) : null,
      severe: a.kind === "severe" || a.kind === "help", note: a.noteId && sim.people[a.person].consents.notes && a.kind === "message" ? sim.notes.find((n) => n.id === a.noteId)?.text ?? null : null,
    }))
    .sort((a, b) => Number(a.status === "resolved") - Number(b.status === "resolved") || Number(b.severe) - Number(a.severe) || b.t - a.t);
}

export function clinicMatching(sim: Sim) {
  const day = dayOf(sim.now);
  const mentees = PEOPLE.filter((p) => p.role === "mentee" && day >= p.joinedDay).filter((p) => {
    const s = sim.people[p.id];
    if (!s.mentorId) return true;
    const m = sim.people[s.mentorId];
    return m.rhythm === 0 || m.ideasPausedLevel || m.leftProgram;
  });
  const freeMentors = PEOPLE.filter((p) => p.role === "mentor" && !sim.people[p.id].menteeId && !sim.people[p.id].leftProgram);
  return mentees.map((me) => {
    const s = sim.people[me.id];
    const reason = !s.mentorId ? "New patient, no mentor yet" : `${name(s.mentorId)} is on pause: temporary mentor?`;
    const pending = s.proposedMentor && s.proposedMentor.status === "pending" ? name(s.proposedMentor.mentor) : null;
    const candidates = [...freeMentors, ...(s.mentorId ? [] : PEOPLE.filter((p) => p.id === "pablo" && !sim.people.pablo.menteeId))]
      .filter((v, i, a) => a.indexOf(v) === i && v.id !== s.mentorId)
      .map((m) => {
        const mt = matchFor(me.id, m.id);
        const stable = (() => {
          const h = sim.people[m.id].history;
          const lastUp = [...h].reverse().find((x) => x.level > 0);
          return lastUp ? day - lastUp.day : day + Math.round(PERSON[m.id].level0Weeks * 7);
        })();
        return mt ? { ...mt, availability: m.hours.join(", "), stableDays: stable, zone: m.zone, prefs: m.prefs.join(", "), sim: Math.round(((cosine(fingerprint(m.q), fingerprint(me.q)) + 1) / 2) * 100) / 100 } : null;
      })
      .filter((x): x is NonNullable<typeof x> => !!x)
      .sort((a, b) => b.affinity - a.affinity);
    return { id: me.id, name: me.name, reason, pending, accepted: s.proposedMentor?.status === "accepted" ? name(s.proposedMentor.mentor) : null, candidates };
  });
}

export function clinicConsents(sim: Sim) {
  return {
    people: PEOPLE.filter((p) => dayOf(sim.now) >= p.joinedDay).map((p) => {
      const c = sim.people[p.id].consents;
      return { id: p.id, name: p.name, data: c.data, notes: c.notes, ideas: c.ideas, version: c.version, date: c.at !== null ? dayLabel(Math.max(0, dayOf(c.at))) : "—", background: p.background };
    }),
    audit: sim.world.audit.filter((a) => a.t <= sim.now).slice(-30).reverse().map((a) => ({ when: when(sim.now, a.t), who: a.who, what: a.what })),
    requests: sim.requests.filter((r) => r.t <= sim.now).map((r) => ({ name: name(r.person), kind: r.kind, when: when(sim.now, r.t) })),
  };
}

export const ACTION_LABEL: Record<Action, string> = {
  paseo_juntos: "Walk together", actividad_con_sentido: "Small activity together", llamada_o_quedar: "Call or meet up",
  ancla_manana: "Early coffee", desconexion_nocturna: "Unplugging challenge", calma_acompanada: "Calm moment together",
};
export function catalogList(sim: Sim) {
  return (Object.keys(ACTIONS) as Action[]).map((a) => ({ key: a, label: ACTION_LABEL[a], on: sim.world.config.catalog[a], direct: CATALOG[a].direct, domains: ACTIONS[a].domains.map((d: Domain) => DOMAIN_LABEL[d]), prior: ACTIONS[a].prior }));
}
export { DAY0, at };
