// Relevo · simulación de la red (servidor). Reproduce, minuto a minuto, todo lo que pasa hasta el reloj de la demo:
//   motor diario (03:15) -> avisos V1-V8 con sus reglas (sección 4) -> ideas del bandido (sección 5) -> ritmo del mentor
//   -> alertas de la clínica. Las acciones de las personas (y las del guion de la demo) son eventos con fecha.
// Es determinista: el mismo mundo y el mismo reloj dan siempre el mismo resultado (se puede mover el deslizador atrás y adelante).
import {
  ACTIONS, DOMAINS, PARAMS, banditChoose, banditColdStart, banditForget, banditProbs, banditUpdate, complaintIndex, hashSeed,
  rewardFrom, rngFrom, runPerson, worstDomain, type Action, type BanditState, type Domain, type Params, type PersonRun,
} from "./engine.ts";
import { DAY0, LAST_DAY, PEOPLE, PERSON, addDays, type PersonId } from "./people.ts";
import { CATALOG, COPILOT, NOTICE_TEXT, PRIORITY, SHORT_NOTE } from "./texts.ts";

/* ---------- Tiempo de la demo: minutos desde el día 0 a las 00:00 (hora de Finlandia) ---------- */
export const DAY = 1440;
export const dayOf = (t: number) => Math.floor(t / DAY);
export const minOf = (t: number) => ((t % DAY) + DAY) % DAY;
export const at = (day: number, hhmm: string) => day * DAY + Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));
export const dateOf = (day: number) => addDays(DAY0, day);
export const weekdayOf = (day: number) => new Date(dateOf(day) + "T12:00:00Z").getUTCDay();
export const hhmm = (t: number) => `${String(Math.floor(minOf(t) / 60)).padStart(2, "0")}:${String(minOf(t) % 60).padStart(2, "0")}`;
export const END = at(LAST_DAY, "23:59");

/* ---------- Mundo guardado ---------- */
export type Who = "luis" | "pablo" | "marta" | "clinic";
export type Ev = { id: string; t: number; seq: number; by: Who; type: string; p: Record<string, unknown> };
export type Config = Pick<Params, "l1_R" | "l2_R" | "l3_R" | "domain_hi" | "persist_up" | "persist_down" | "weights"> & {
  noticeFrom: number; // minuto del día (08:30 = 510)
  noticeTo: number; // 21:00 = 1260
  catalog: Record<Action, boolean>;
  person: Record<string, Partial<Pick<Params, "l1_R" | "l2_R" | "domain_hi">>>;
};
export type Audit = { t: number; who: string; what: string };
export type World = { v: 1; clock: number; seq: number; events: Ev[]; config: Config; ai: Record<string, string>; audit: Audit[] };

export const DEFAULT_CONFIG: Config = {
  l1_R: PARAMS.l1_R, l2_R: PARAMS.l2_R, l3_R: PARAMS.l3_R, domain_hi: PARAMS.domain_hi, persist_up: PARAMS.persist_up, persist_down: PARAMS.persist_down,
  weights: { ...PARAMS.weights }, noticeFrom: 510, noticeTo: 1260,
  catalog: Object.fromEntries(Object.keys(ACTIONS).map((a) => [a, true])) as Record<Action, boolean>,
  person: {},
};
export const newWorld = (): World => ({ v: 1, clock: at(0, "08:00"), seq: 0, events: [], config: structuredClone(DEFAULT_CONFIG), ai: {}, audit: [] });

/* ---------- Estado derivado ---------- */
export type NoticeCode = "V1" | "V2" | "V3" | "V4" | "V5" | "V7" | "V8" | "HELP" | "M5" | "CRISIS";
export type Notice = {
  id: string; code: NoticeCode; to: PersonId; about?: PersonId; text: string; buttons: { id: string; label: string }[];
  created: number; t: number; validUntil: number; status: "pending" | "active" | "answered" | "expired" | "deferred" | "discarded";
  answer?: string; answeredAt?: number; pushed: boolean; lock?: string; why?: string;
};
export type Card = {
  id: string; mentor: PersonId; mentee: PersonId; day: number; t: number; kind: "idea" | "short_note";
  twoStep: { status: "pending" | "yes" | "cant" | "expired"; at?: number } | null;
  action?: Action; context?: Domain; level: number; excluded: Action[]; attempt: number;
  status: "waiting" | "shown" | "sent" | "dismissed" | "prepared" | "paused" | "expired";
  probs?: Partial<Record<Action, number>>; draws?: Partial<Record<Action, number>>; sentAt?: number; prepared?: boolean;
};
export type Plan = {
  id: string; cardId?: string; noteId?: string; mentor: PersonId; mentee: PersonId; action: Action; title: string; icon: string;
  whenT: number; whenLabel: string; created: number; status: "proposed" | "accepted" | "other_day" | "cant" | "change_requested";
  respondedAt?: number; feedback?: "good" | "ok" | "didnt"; feedbackAt?: number; reward?: number; context: Domain; RsBefore: number | null;
};
export type Note = {
  id: string; from: PersonId | "clinic"; to: PersonId | "clinic"; t: number; text: string; duration: number; audio: boolean;
  kind: string; scripted: boolean; analysis?: { indice_queja: number; afecto_negativo: number; repeticion: number; orientacion_accion: number; crisis: boolean; source: string };
};
export type Alert = {
  id: string; person: PersonId; kind: "level2" | "severe" | "help" | "message" | "data_request"; t: number; text: string;
  status: "new" | "in_progress" | "resolved"; assignee?: string; forwardedAt?: number; resolvedAt?: number; noteId?: string;
};
export type Copilot = { id: string; mentor: PersonId; mentee: PersonId; t: number; status: "active" | "used" | "dismissed"; indices: number[] };
export type PState = {
  id: PersonId; level: number; levelSince: number; history: { day: number; level: number }[];
  crisis: { t: number; source: string; alertId: string } | null; crisisDays: Set<string>; resolutions: Set<string>;
  consents: { data: boolean; notes: boolean; ideas: boolean; at: number | null; version: string }; onboarded: boolean;
  disabled: Set<string>; silence: number; lastA1: number | null; noData48: boolean;
  mentorId?: PersonId; menteeId?: PersonId; pairSince?: number; proposedMentor?: { mentor: PersonId; t: number; status: "pending" | "accepted" | "declined" };
  rhythm: number; rhythmProposal: { rhythm: number; screen: "M5_pause" | "V6_M5" | "M5"; t: number; answer?: string } | null;
  reviewPace: boolean; ideasPausedLevel: boolean; ideasPausedM6: boolean; ideasPausedClinic: boolean; tookPause: boolean;
  l1Run: number; leftProgram: boolean; deviceIssue: { since: number; device: string } | null; openHelp: string | null;
};
export type Call = { id: string; person: PersonId; t: number; mode: "now" | "schedule"; scheduledFor?: number; done?: boolean };
export type Log = { t: number; person: PersonId; kind: string; text: string; by?: string };
export type Sim = {
  now: number; world: World; people: Record<PersonId, PState>; runs: Record<PersonId, PersonRun>;
  notices: Notice[]; cards: Card[]; plans: Plan[]; notes: Note[]; alerts: Alert[]; calls: Call[]; copilots: Copilot[];
  logs: Log[]; bandits: Record<string, { state: BanditState; start: BanditState; learned: boolean; history: { t: number; action: Action; context: Domain; reward: number; probsAfter: Partial<Record<Action, number>> }[] }>;
  pushes: Record<string, string>; requests: { t: number; person: PersonId; kind: string }[]; trace: { t: number; who: string; text: string; scripted?: boolean }[];
};

export const BANDIT_SALT = 21; // fijado para que el sorteo reproduzca la cronología de la v3 (paseo el 24/10, llamada el 31/10)
const pairKey = (mentor: PersonId, mentee: PersonId) => `${mentor}>${mentee}`;

// Lo que le funcionó a Pablo cuando Marta le acompañaba (prior de su arranque en frío con Luis)
function pabloHistory(): BanditState {
  const b = banditColdStart();
  for (const [a, w, l] of [["paseo_juntos", 4, 1], ["llamada_o_quedar", 2, 2], ["actividad_con_sentido", 1, 2]] as [Action, number, number][]) {
    for (let i = 0; i < w; i++) banditUpdate(b, a, "movilidad", 1);
    for (let i = 0; i < l; i++) banditUpdate(b, a, "movilidad", 0);
  }
  return b;
}

/* ---------- Guion de la demo: lo que hacen las personas si nadie toca nada (marcado "guion") ---------- */
// Cada paso solo ocurre si sigue teniendo sentido en ese momento (si la persona ya actuó, se salta).
type Scripted = { t: number; type: string; by: Who; p: Record<string, unknown> };
export const SCRIPT: Scripted[] = [
  { t: at(0, "08:10"), by: "clinic", type: "match_propose", p: { mentor: "pablo", mentee: "luis" } },
  { t: at(0, "09:00"), by: "pablo", type: "m0_answer", p: { choice: "accept" } },
  { t: at(0, "09:20"), by: "pablo", type: "note", p: { to: "luis", kind: "intro", duration: 30, text: "Hi Luis, I'm Pablo. I finished TMS in May, so I know a bit about where you are right now. I'll send you a note now and then, nothing you have to answer. Speak soon." } },
  { t: at(0, "18:00"), by: "luis", type: "onboard", p: { data: true, notes: true, ideas: true } },
  { t: at(1, "19:05"), by: "luis", type: "note", p: { to: "pablo", duration: 14, text: "Hi Pablo, thanks for the message. It's good to know someone has been through this." } },
  { t: at(7, "10:15"), by: "pablo", type: "note", p: { to: "luis", duration: 21, text: "Morning Luis! How was your first week without daily sessions? Mine felt strange at the start. Have a calm Sunday." } },
  { t: at(17, "18:40"), by: "luis", type: "note", p: { to: "pablo", duration: 11, text: "Going OK. I've been walking by the shore in the evenings, it helps." } },
  { t: at(19, "08:00"), by: "clinic", type: "device_unsynced", p: { person: "luis", device: "Oura Ring" } }, // MOCK: anillo sin sincronizar
  { t: at(21, "09:00"), by: "clinic", type: "device_synced", p: { person: "luis" } },
  { t: at(24, "18:30"), by: "pablo", type: "note", p: { to: "luis", duration: 9, plan: "actividad_con_sentido", text: "Would you come with me to the market on Saturday? You can help me choose" } },
  { t: at(24, "20:10"), by: "luis", type: "plan", p: { choice: "in" } },
  { t: at(26, "13:30"), by: "luis", type: "plan_feedback", p: { feedback: "ok" } },
  { t: at(32, "18:00"), by: "pablo", type: "note", p: { to: "luis", duration: 7, plan: "ancla_manana", text: "Coffee tomorrow at 9 before the day gets going?" } },
  { t: at(32, "19:00"), by: "luis", type: "plan", p: { choice: "in" } },
  { t: at(33, "11:00"), by: "luis", type: "plan_feedback", p: { feedback: "good" } },
  // Copiloto: tres notas seguidas sobre lo mismo (la tercera la puede grabar quien presenta)
  { t: at(38, "21:30"), by: "luis", type: "note", p: { to: "pablo", duration: 12, text: "This week I'm sleeping awful, I wake up tired and I don't feel like doing anything." } },
  { t: at(39, "21:40"), by: "luis", type: "note", p: { to: "pablo", duration: 10, text: "Again I slept awful, I'm tired, no energy for anything, always the same." } },
  { t: at(40, "21:10"), by: "luis", type: "note", p: { to: "pablo", duration: 9, sample: 3, text: "Nothing new, the same, sleeping awful and tired all day, no energy." } },
  // Cronología exacta de la v3 (sección 12.2)
  { t: at(47, "08:41"), by: "pablo", type: "v1_answer", p: { choice: "yes" } },
  { t: at(47, "09:05"), by: "pablo", type: "note", p: { to: "luis", duration: 8, fromCard: true } },
  { t: at(47, "11:20"), by: "luis", type: "plan", p: { choice: "in" } },
  { t: at(48, "11:30"), by: "luis", type: "plan_feedback", p: { feedback: "good" } },
  { t: at(54, "09:10"), by: "pablo", type: "v1_answer", p: { choice: "cant" } },
  { t: at(54, "10:10"), by: "clinic", type: "call", p: { person: "luis", mode: "schedule", at: at(55, "12:00") } },
  { t: at(55, "12:00"), by: "clinic", type: "call", p: { person: "luis", mode: "now", scripted: true } },
  { t: at(56, "09:02"), by: "marta", type: "v1_answer", p: { choice: "yes" } },
  { t: at(57, "21:12"), by: "luis", type: "note", p: { to: "pablo", duration: 13, text: "I can't do this anymore. Some nights I just want to die." } },
  { t: at(59, "10:00"), by: "clinic", type: "resolve", p: { person: "luis" } },
  { t: at(60, "09:02"), by: "marta", type: "v1_answer", p: { choice: "yes" } },
];

/* ---------- Motor con memoria (se recalcula solo si cambian crisis, resoluciones o tipos de dato apagados) ---------- */
const runCache = new Map<string, PersonRun>();
function engineRun(id: PersonId, ps: PState, cfg: Config) {
  const person = PERSON[id];
  const pp = cfg.person[id] ?? {};
  const params: Params = { ...PARAMS, ...cfg, ...pp, weights: cfg.weights };
  const key = JSON.stringify([id, [...ps.crisisDays].sort(), [...ps.resolutions].sort(), [...ps.disabled].sort(), cfg.l1_R, cfg.l2_R, cfg.l3_R, cfg.domain_hi, cfg.persist_up, cfg.persist_down, cfg.weights, pp]);
  let r = runCache.get(key);
  if (!r) {
    r = runPerson(person.raw, { tstDirection: person.tstDirection, crisisDays: ps.crisisDays, clinicResolutions: ps.resolutions, params, disabled: ps.disabled });
    if (runCache.size > 400) runCache.clear();
    runCache.set(key, r);
  }
  return r;
}

// Tipos de dato que la persona puede apagar (A4/M4) -> columnas crudas
export const DATA_TYPES: Record<string, { label: string; purpose: string; cols: string[] }> = {
  sleep: { label: "Sleep", purpose: "How regular your nights are", cols: ["tst", "mid", "onset", "waso", "awak"] },
  steps: { label: "Steps", purpose: "How much you move during the day", cols: ["steps", "ra"] },
  pulse: { label: "Pulse", purpose: "Night-time heart rhythm, if you wear a watch or ring", cols: ["rmssd", "rhr"] },
  location: { label: "Approximate location", purpose: "Time out of home and variety of places, never the exact place", cols: ["home", "entropy"] },
  phone: { label: "Phone use", purpose: "Screen time and late-night use, never what you do", cols: ["screen", "night"] },
};

/* ======================================================================================= */
export function evaluate(world: World, nowIn?: number): Sim {
  const now = Math.min(Math.max(nowIn ?? world.clock, 0), END);
  const cfg = world.config;
  const sim: Sim = {
    now, world, people: {}, runs: {}, notices: [], cards: [], plans: [], notes: [], alerts: [], calls: [], copilots: [], logs: [],
    bandits: {}, pushes: {}, requests: [], trace: [],
  };
  for (const p of PEOPLE) {
    sim.people[p.id] = {
      id: p.id, level: 0, levelSince: 0, history: [], crisis: null, crisisDays: new Set(), resolutions: new Set(),
      consents: p.id === "luis" ? { data: false, notes: false, ideas: false, at: null, version: "v3" } : { data: true, notes: true, ideas: true, at: at(0, "00:00"), version: "v3" },
      onboarded: p.id !== "luis", disabled: new Set(), silence: 0, lastA1: null, noData48: false,
      mentorId: p.id === "luis" ? undefined : p.mentorId, menteeId: p.id === "pablo" ? undefined : p.menteeId, pairSince: p.id === "luis" || p.id === "pablo" ? undefined : 0,
      rhythm: p.rhythm ?? 2, rhythmProposal: null, reviewPace: false, ideasPausedLevel: false, ideasPausedM6: false, ideasPausedClinic: false,
      tookPause: false, l1Run: 0, leftProgram: false, deviceIssue: null, openHelp: null,
    };
  }
  // Pablo ya era mentor de Marta-> Pablo; Luis llega el día 0 sin mentor (emparejamiento en C4)
  sim.people.pablo.mentorId = "marta";
  sim.people.marta.menteeId = "pablo";

  const P = sim.people;
  const trace = (t: number, who: string, text: string, scripted = false) => sim.trace.push({ t, who, text, scripted });
  const log = (t: number, person: PersonId, kind: string, text: string, by?: string) => sim.logs.push({ t, person, kind, text, by });
  const name = (id: PersonId) => PERSON[id]?.name ?? id;

  /* ----- Cola de cosas que pasan, en orden de tiempo ----- */
  type Item = { t: number; o: number; run: () => void };
  const queue: Item[] = [];
  let cur = 0; // minuto que se está procesando
  const push = (t: number, o: number, run: () => void) => {
    if (t > now) return;
    let i = queue.length;
    while (i > 0 && (queue[i - 1].t > t || (queue[i - 1].t === t && queue[i - 1].o > o))) i--;
    queue.splice(i, 0, { t, o, run });
  };

  /* ----- Bandido por pareja ----- */
  const bandit = (mentor: PersonId, mentee: PersonId) => {
    const k = pairKey(mentor, mentee);
    if (!sim.bandits[k]) {
      const start = banditColdStart(mentor === "pablo" ? pabloHistory() : undefined);
      sim.bandits[k] = { state: structuredClone(start), start, learned: false, history: [] };
    }
    return sim.bandits[k];
  };
  const learn = (plan: Plan, reward: number, t: number) => {
    if (plan.reward !== undefined) return;
    plan.reward = reward;
    const b = bandit(plan.mentor, plan.mentee);
    banditUpdate(b.state, plan.action, plan.context, reward);
    b.learned = true;
    b.history.push({ t, action: plan.action, context: plan.context, reward, probsAfter: banditProbs(b.state, plan.context) });
    trace(t, "engine", `Learning: ${plan.action} gets reward ${reward} for ${name(plan.mentor)} & ${name(plan.mentee)}`);
  };

  /* ----- Avisos: una push al día por persona, en horario; los neutros se aplazan (sección 4) ----- */
  const prio = (c: NoticeCode) => PRIORITY.indexOf((c === "HELP" || c === "CRISIS" ? "CRISIS" : c === "M5" ? "V6" : c) as (typeof PRIORITY)[number]);
  const pushedOn = (who: PersonId, day: number) => sim.pushes[`${who}:${day}`];
  const deliveredToday = (who: PersonId, day: number, codes: NoticeCode[]) =>
    sim.notices.some((n) => n.to === who && codes.includes(n.code) && (n.status === "active" || n.status === "answered") && dayOf(n.t) === day);
  function offer(n: Omit<Notice, "status" | "pushed" | "t"> & { t?: number }, when: number) {
    const notice: Notice = { ...n, t: when, status: "pending", pushed: false };
    sim.notices.push(notice);
    push(when, 2 + prio(notice.code) / 100, () => deliver(notice, when));
    return notice;
  }
  function deliver(n: Notice, t: number) {
    if (n.status !== "pending" && n.status !== "deferred") return;
    if (t > n.validUntil) return void (n.status = "expired");
    const who = P[n.to];
    const soft = ["V2", "V3", "V7"].includes(n.code);
    if (soft && who.level === 3) return void ((n.status = "discarded"), (n.why = "Level 3: no soft notices, help and the clinic instead"));
    const day = dayOf(t);
    const critical = n.code === "HELP" || n.code === "CRISIS";
    const inWindow = minOf(t) >= cfg.noticeFrom && minOf(t) <= cfg.noticeTo;
    if (!critical && !inWindow) {
      const next = minOf(t) < cfg.noticeFrom ? day * DAY + cfg.noticeFrom : (day + 1) * DAY + cfg.noticeFrom;
      n.status = "deferred";
      n.why = "Outside notice hours";
      push(next, 2 + prio(n.code) / 100, () => deliver(n, next));
      return;
    }
    const already = pushedOn(n.to, day);
    const neutral = n.code === "V3" || n.code === "V7" || n.code === "V8";
    if (!critical && already && neutral) {
      if (n.code === "V7" && deliveredToday(n.to, day, ["V2", "V3"])) {
        n.status = "discarded";
        n.why = "V7 dropped: a V2/V3 already invited the same today";
        trace(t, "rules", `${n.code} for ${name(n.to)} dropped (invites the same as today's notice)`);
        return;
      }
      const next = (day + 1) * DAY + cfg.noticeFrom;
      n.status = "deferred";
      n.why = `Postponed: ${name(n.to)} already got a notice today (${already} has priority)`;
      trace(t, "rules", `${n.code} for ${name(n.to)} postponed to tomorrow (${already} already sent today)`);
      if (next <= n.validUntil + DAY) push(next, 2 + prio(n.code) / 100, () => deliver(n, next));
      return;
    }
    n.status = "active";
    n.t = t;
    n.pushed = critical || !already;
    if (n.pushed && !critical) sim.pushes[`${n.to}:${day}`] = n.code;
    log(t, n.to, "notice", `${n.code} sent: “${n.text}”${n.pushed ? "" : " (in app, no push)"}`);
    trace(t, name(n.to), `${n.code}: ${n.text}`);
  }
  const closeNotices = (who: PersonId, codes: NoticeCode[], t: number, why: string) => {
    for (const n of sim.notices) if (n.to === who && codes.includes(n.code) && (n.status === "active" || n.status === "pending" || n.status === "deferred")) {
      if (n.validUntil < t) {
        n.status = "expired";
        continue;
      }
      n.status = n.status === "active" ? "expired" : "discarded";
      n.why = why;
      n.answeredAt = t;
    }
  };

  /* ----- Ideas del mentor ----- */
  const ideasPaused = (m: PersonId) => {
    const s = P[m];
    return s.rhythm === 0 || s.ideasPausedLevel || s.ideasPausedM6 || s.ideasPausedClinic || s.leftProgram;
  };
  function chooseFor(card: Card, t: number) {
    const b = bandit(card.mentor, card.mentee);
    const disabled = (Object.keys(ACTIONS) as Action[]).filter((a) => !cfg.catalog[a]); // la clínica puede desactivar acciones (C5)
    const rng = rngFrom(hashSeed(BANDIT_SALT, card.mentor, card.mentee, card.day, card.attempt));
    const ctx = card.context!;
    const choice = banditChoose(b.state, ctx, rng, card.level, [...card.excluded, ...disabled]);
    card.action = choice.action;
    card.probs = banditProbs(b.state, ctx);
    card.draws = choice.draws;
    trace(Math.min(t, cur), "bandit", `Idea for ${name(card.mentor)} about ${name(card.mentee)}: ${choice.action} (context ${ctx}${card.level >= 2 ? ", direct only" : ""})`);
  }
  function newCard(mentor: PersonId, mentee: PersonId, day: number, t: number, level: number, twoStep: boolean, kind: Card["kind"] = "idea", context?: Domain): Card | null {
    if (ideasPaused(mentor) || !P[mentee].consents.ideas) return null;
    const s = sim.runs[mentee]?.days[Math.min(day, dayOf(now))]?.s ?? {};
    const card: Card = {
      id: `card:${mentor}:${mentee}:${day}:${sim.cards.length}`, mentor, mentee, day, t, kind, level, excluded: [], attempt: 0,
      twoStep: twoStep ? { status: "pending" } : null, status: twoStep ? "waiting" : "shown",
      // Contexto = el dominio más alterado del acompañado ese día (solo compiten las acciones de ese contexto)
      context: context ?? (Object.keys(s).length ? worstDomain(s) : "movilidad"),
    };
    if (!twoStep && kind === "idea") chooseFor(card, t);
    sim.cards.push(card);
    return card;
  }
  const activeCard = (mentor: PersonId, t: number) =>
    sim.cards.find((c) => c.mentor === mentor && c.t <= t && (c.status === "waiting" || c.status === "shown") && dayOf(c.t) === dayOf(t));

  function v1Cycle(mentor: PersonId, mentee: PersonId, day: number, level: number) {
    const t0 = day * DAY + cfg.noticeFrom;
    const card = newCard(mentor, mentee, day, t0, level, true);
    if (!card) {
      // Mentor sin ideas (pausa, protección o sin consentimiento): invitación neutra para el acompañado
      if (P[mentee].consents.ideas === false || !ideasPaused(mentor)) offerV3(mentee, mentor, t0 + 360);
      return;
    }
    offer({ id: `V1:${mentor}:${mentee}:${day}`, code: "V1", to: mentor, about: mentee, text: NOTICE_TEXT.V1(name(mentee)), buttons: [{ id: "yes", label: "Yes" }, { id: "cant", label: "Can't today" }], created: t0, validUntil: t0 + 360 }, t0);
    // A las 6 h: si no dijo "Sí", el acompañado recibe V3 (que no afirma nada del mentor) [diseño: se evalúa al cerrar la ventana]
    push(t0 + 360, 3, () => {
      if (card.twoStep?.status === "pending") {
        card.twoStep.status = "expired";
        card.status = "expired";
        trace(t0 + 360, "rules", `${name(mentor)} didn't answer within 6 h`);
      }
      if (card.twoStep?.status !== "yes") offerV3(mentee, mentor, t0 + 360);
    });
  }
  function offerV3(mentee: PersonId, mentor: PersonId, t: number) {
    offer({ id: `V3:${mentee}:${dayOf(t)}`, code: "V3", to: mentee, about: mentor, text: NOTICE_TEXT.V3(name(mentor)), buttons: [{ id: "note", label: "Send a note" }, { id: "not_now", label: "Not now" }], created: t, validUntil: t + DAY }, t);
  }

  /* ----- Nivel 3: ayuda y clínica, nunca avisos amables ----- */
  function severe(id: PersonId, t: number, source: string, noteId?: string) {
    const s = P[id];
    const alertId = `alert:${id}:${t}`;
    if (source !== "r25") {
      s.crisisDays.add(dateOf(dayOf(t)));
      s.crisis = { t, source, alertId };
    }
    if (s.level !== 3) {
      s.level = 3;
      s.levelSince = dayOf(t);
      s.history.push({ day: dayOf(t), level: 3 });
    }
    s.openHelp = alertId;
    sim.alerts.push({ id: alertId, person: id, kind: source === "help" ? "help" : "severe", t, status: "new", noteId,
      text: source === "note" ? `${name(id)}: a voice note matched the crisis list` : source === "help" ? `${name(id)} pressed “Talk to my clinic”` : `${name(id)}: risk index above 2.5 for 3 days` });
    push(t + 15, 4, () => {
      const a = sim.alerts.find((x) => x.id === alertId);
      if (a && a.status === "new") {
        a.forwardedAt = t + 15;
        trace(t + 15, "clinic", `Severe alert for ${name(id)} unattended for 15 min: forwarded to the on-call lead`);
      }
    });
    closeNotices(id, ["V2", "V3", "V7"], t, "Level 3: soft notices withdrawn");
    trace(t, "engine", `${name(id)} → level 3 (${source === "r25" ? "R ≥ 2.5 for 3 days" : "explicit crisis, immediate"})`);
    log(t, id, "level", `Level 3 · ${source === "note" ? "crisis phrase in a voice note" : source === "help" ? "asked the clinic for help" : "risk index"}`);
    // Su mentor ve "La clínica se ocupa" y sus ideas se pausan hasta que la clínica las reactive
    const m = s.mentorId;
    if (m) {
      P[m].ideasPausedM6 = true;
      for (const c of sim.cards) if (c.mentor === m && (c.status === "waiting" || c.status === "shown" || c.status === "prepared")) c.status = "paused";
    }
  }

  /* ----- Tick diario del motor (03:15) ----- */
  function engineTick(day: number) {
    const t = at(day, "03:15");
    for (const p of PEOPLE) {
      const s = P[p.id];
      if (day < p.joinedDay) continue;
      const run = (sim.runs[p.id] = engineRun(p.id, s, cfg));
      // Silencio de 48 h (A1): sin sensores ni respuestas. Las notas enviadas en la app cuentan como respuesta.
      const i = day;
      const sensors = p.raw.cols.tst[i] !== null || p.raw.cols.steps[i] !== null;
      const repliedRaw = p.raw.cols.replied[i] === 1;
      const appNote = sim.notes.some((n) => n.from === p.id && n.t > t - DAY && n.t <= t);
      s.silence = sensors || repliedRaw || appNote ? 0 : s.silence + 1;
      s.noData48 = s.silence >= 2;
      if (weekdayOf(day) === 0) for (const [k, b] of Object.entries(sim.bandits)) if (b.learned && k.endsWith(`>${p.id}`)) banditForget(b.state, b.start);
      if (!s.consents.data) continue;
      const row = run.days[day];
      const prev = s.level;
      const next = s.crisis ? 3 : row.level;
      if (next !== prev) {
        s.level = next;
        s.levelSince = day;
        s.history.push({ day, level: next });
        if (next > prev) trace(t, "engine", `${name(p.id)} enters level ${next}${next < 3 ? ` (most changed: ${row.s && Object.keys(row.s).length ? worstDomain(row.s) : "-"})` : ""}`);
        log(t, p.id, "level", `Level ${prev} → ${next}`);
      }
      const rising = next > prev;
      if (rising && next === 2) sim.alerts.push({ id: `alert:${p.id}:${t}`, person: p.id, kind: "level2", t, status: "new", text: `${name(p.id)} entered level 2 (High risk)` });
      if (rising && next === 3 && !s.crisis) severe(p.id, t, "r25");
      // Acompañado que sube a nivel 1 o 2 -> dos pasos con su mentor
      if (rising && (next === 1 || next === 2) && s.mentorId && !PERSON[p.id].background && !PERSON[s.mentorId].background) v1Cycle(s.mentorId, p.id, day, next);
      // A1: 48 h en silencio -> V7 para la persona; su mentor, idea "Mándale una nota corta"
      if (s.silence >= 2 && (s.lastA1 === null || day - s.lastA1 >= 2) && !PERSON[p.id].background) {
        s.lastA1 = day;
        trace(t, "engine", `A1: 48 h without data or replies from ${name(p.id)}`);
        const t0 = day * DAY + cfg.noticeFrom;
        offer({ id: `V7:${p.id}:${day}`, code: "V7", to: p.id, text: NOTICE_TEXT.V7(), buttons: [{ id: "all_good", label: "All good" }, { id: "need_help", label: "I need help" }], created: t, validUntil: t0 + DAY }, t0);
        const m = s.mentorId;
        if (m && !PERSON[m].background)
          push(t0, 1.5, () => {
            if (!activeCard(m, t0) && !sim.cards.some((c) => c.mentor === m && c.day === day)) newCard(m, p.id, day, t0, s.level, false, "short_note");
          });
      }
      // El mentor también es paciente (sección 5.6): A5 -> su mentora, dos pasos; ritmo
      if (s.menteeId && !PERSON[p.id].background) mentorRules(p.id, day, prev, next);
    }
  }

  function mentorRules(id: PersonId, day: number, prev: number, level: number) {
    const s = P[id];
    const t0 = day * DAY + cfg.noticeFrom;
    const rising = level > prev;
    s.l1Run = level >= 1 ? s.l1Run + 1 : 0;
    s.ideasPausedLevel = level >= 2;
    const proposeM5 = (rhythm: number, screen: "M5_pause" | "V6_M5" | "M5", why: string) => {
      s.rhythmProposal = { rhythm, screen, t: t0 };
      offer({ id: `M5:${id}:${day}`, code: "M5", to: id, text: screen === "M5_pause" ? "A few days for you" : "This week, a lighter pace", buttons: [], created: t0, validUntil: t0 + 7 * DAY }, t0);
      trace(t0, "engine", `Pace proposal for ${name(id)}: ${["Pause", "Light", "Normal", "Intense"][rhythm]} (${why})`);
      log(t0, id, "pace", `System proposed ${["Pause", "Light", "Normal", "Intense"][rhythm]} (${why})`);
    };
    if (rising && level >= 2) {
      proposeM5(0, "M5_pause", "mentor at level 2");
      for (const c of sim.cards) if (c.mentor === id && (c.status === "waiting" || c.status === "shown" || c.status === "prepared")) c.status = "paused";
    } else if (s.l1Run === 5 && s.rhythm > 1 && level < 2) proposeM5(s.rhythm - 1, "V6_M5", "5 days at level 1");
  }

  /* ----- Plan a partir de una nota ----- */
  function makePlan(mentor: PersonId, mentee: PersonId, action: Action, t: number, cardId?: string, noteId?: string, context?: Domain) {
    const day = dayOf(t);
    const c = CATALOG[action];
    const w = c.when(day, weekdayOf(day));
    const plan: Plan = {
      id: `plan:${mentor}:${mentee}:${t}`, cardId, noteId, mentor, mentee, action, title: c.plan(name(mentor)), icon: c.icon,
      whenT: w.day * DAY + w.minute, whenLabel: w.label, created: t, status: "proposed",
      context: context ?? ACTIONS[action].domains[0], RsBefore: sim.runs[mentee]?.days[day]?.Rs ?? null,
    };
    sim.plans.push(plan);
    log(t, mentee, "plan", `${name(mentor)} proposed: ${plan.title} · ${plan.whenLabel}`);
    // Ignorado hasta la hora del plan -> recompensa 0
    push(plan.whenT, 5, () => {
      if (plan.status === "proposed") learn(plan, 0, plan.whenT);
    });
    // Aceptado sin respuesta a "¿Qué tal fue?" en 72 h -> cuenta si su R_suav bajó ≥ 0,05
    push(plan.whenT + 3 * DAY, 5, () => {
      if (plan.status === "accepted" && !plan.feedback) {
        const after = sim.runs[mentee]?.days[Math.min(LAST_DAY, dayOf(plan.whenT) + 3)]?.Rs ?? null;
        learn(plan, rewardFrom(true, null, plan.RsBefore, after), plan.whenT + 3 * DAY);
      }
    });
    return plan;
  }

  /* ----- Acciones (de las personas o del guion) ----- */
  const latestPlan = (mentee: PersonId, statuses: Plan["status"][]) => [...sim.plans].reverse().find((p) => p.mentee === mentee && statuses.includes(p.status));
  function act(e: { t: number; by: Who; type: string; p: Record<string, unknown> }, scripted: boolean): boolean {
    const { t, by, p } = e;
    const day = dayOf(t);
    const str = (k: string) => (typeof p[k] === "string" ? (p[k] as string) : undefined);
    switch (e.type) {
      case "match_propose": {
        const mentee = str("mentee")!;
        const mentor = str("mentor")!;
        if (P[mentee].mentorId || P[mentor].menteeId && P[mentor].menteeId !== mentee) return false;
        P[mentee].proposedMentor = { mentor, t, status: "pending" };
        log(t, mentee, "match", `Clinic proposed ${name(mentor)} as mentor`, "clinic");
        trace(t, "clinic", `Proposes ${name(mentor)} for ${name(mentee)} (C4 → M0)`, scripted);
        return true;
      }
      case "m0_answer": {
        const mentee = Object.values(P).find((x) => x.proposedMentor?.mentor === by && x.proposedMentor.status === "pending");
        if (!mentee) return false;
        if (p.choice === "accept") {
          mentee.proposedMentor!.status = "accepted";
          mentee.mentorId = by;
          mentee.pairSince = day;
          P[by].menteeId = mentee.id;
          P[by].pairSince = day;
          trace(t, name(by), `Accepts accompanying ${name(mentee.id)}`, scripted);
        } else mentee.proposedMentor!.status = "declined";
        return true;
      }
      case "onboard": {
        const s = P[by];
        if (s.onboarded && scripted) return false;
        s.onboarded = true;
        s.consents = { data: !!p.data, notes: !!p.notes, ideas: !!p.ideas, at: t, version: "v3" };
        log(t, by, "consent", `Consents: data ${s.consents.data ? "on" : "off"}, notes analysis ${s.consents.notes ? "on" : "off"}, AI ideas ${s.consents.ideas ? "on" : "off"}`);
        trace(t, name(by), "Finishes welcome and consents (A0)", scripted);
        return true;
      }
      case "consent": {
        const k = str("key") as "data" | "notes" | "ideas";
        P[by].consents = { ...P[by].consents, [k]: !!p.on, at: t };
        log(t, by, "consent", `${k === "data" ? "Data summaries" : k === "notes" ? "Notes analysis" : "AI ideas for mentor"} turned ${p.on ? "on" : "off"}`);
        if (k === "data" && !p.on) P[by].level = 0;
        return true;
      }
      case "datatype": {
        const k = str("key")!;
        for (const c of DATA_TYPES[k]?.cols ?? []) {
          if (p.on) P[by].disabled.delete(c);
          else P[by].disabled.add(c);
        }
        log(t, by, "consent", `${DATA_TYPES[k]?.label} ${p.on ? "on" : "off"}`);
        return true;
      }
      case "device_unsynced": {
        const who = str("person")!;
        P[who].deviceIssue = { since: t - 2 * DAY, device: str("device") ?? "ring" };
        const t0 = day * DAY + cfg.noticeFrom;
        offer({ id: `V8:${who}:${day}`, code: "V8", to: who, text: NOTICE_TEXT.V8(), buttons: [{ id: "check", label: "Check" }, { id: "not_now", label: "Not now" }], created: t, validUntil: t0 + 2 * DAY }, Math.max(t, t0));
        return true;
      }
      case "device_synced":
        P[str("person")!].deviceIssue = null;
        closeNotices(str("person")!, ["V8"], t, "Device synced again");
        return true;
      case "v1_answer": {
        const card = sim.cards.find((c) => c.mentor === by && c.twoStep?.status === "pending" && c.t <= t && c.t + 360 >= t);
        if (!card) return false;
        card.twoStep = { status: p.choice === "yes" ? "yes" : "cant", at: t };
        const v1 = sim.notices.find((n) => n.id === `V1:${by}:${card.mentee}:${card.day}`);
        if (v1) Object.assign(v1, { status: "answered", answer: p.choice, answeredAt: t });
        log(t, card.mentee, "notice", `${name(by)} answered V1: ${p.choice === "yes" ? "Yes" : "Can't today"}`, by);
        trace(t, name(by), p.choice === "yes" ? "Yes" : "Can't today", scripted);
        if (p.choice === "yes") {
          card.status = "shown";
          chooseFor(card, t);
          // V2 (o V5 si quien recibe es a su vez mentor) solo existe porque el mentor ha dicho "Sí"; caduca a las 24 h
          const code: NoticeCode = P[card.mentee].menteeId ? "V5" : "V2";
          offer({
            id: `${code}:${card.mentee}:${t}`, code, to: card.mentee, about: by,
            text: code === "V5" ? NOTICE_TEXT.V5(name(by)) : NOTICE_TEXT.V2(name(by)),
            buttons: [{ id: "listen", label: `Listen to ${name(by)}` }, { id: "note", label: "Send a note" }, { id: "not_now", label: "Not now" }],
            created: t, validUntil: t + DAY,
          }, t);
        } else {
          // Se respeta: hoy no hay idea; queda preparada para mañana
          card.status = "dismissed";
          const next = newCard(by, card.mentee, day + 1, (day + 1) * DAY + cfg.noticeFrom, Math.max(card.level, P[card.mentee].level), false, "idea", card.context);
          if (next) {
            next.prepared = true;
            trace(t, "rules", `No idea today for ${name(by)} (respected). Prepared for tomorrow: ${next.action}`);
          }
        }
        return true;
      }
      case "idea": {
        const card = sim.cards.find((c) => c.id === p.cardId);
        if (!card || card.status !== "shown") return false;
        if (p.action === "other") {
          card.excluded.push(card.action!);
          card.attempt++;
          chooseFor(card, t);
          trace(t, name(by), `“Another idea” → ${card.action}`);
        } else if (p.action === "not_now") {
          card.status = "dismissed";
          trace(t, name(by), "Idea closed (“Not now”, no penalty)");
        }
        return true;
      }
      case "note": {
        const to = str("to")! as PersonId | "clinic";
        let text = str("text") ?? "";
        let card: Card | undefined;
        if (p.fromCard || p.cardId) {
          card = sim.cards.find((c) => (p.cardId ? c.id === p.cardId : c.mentor === by && c.mentee === to && c.status === "shown" && c.t <= t));
          if (!card || card.status !== "shown") {
            if (scripted) return false;
            card = undefined;
          } else if (!text) text = card.kind === "short_note" ? SHORT_NOTE.message(name(to)) : CATALOG[card.action!].message(name(to));
        }
        if (scripted && p.sample === 3 && sim.notes.some((n) => n.from === by && n.t > at(39, "21:40") && n.t <= t)) return false;
        const id = (e as Ev).id ?? `note:${by}:${t}`;
        const prevTexts = sim.notes.filter((n) => (n.from === by && n.to === to) || (n.from === to && n.to === by)).map((n) => n.text);
        const stored = p.analysis as Note["analysis"] | undefined;
        const analysis = stored ?? { ...complaintIndex(text, prevTexts), source: "lexicon" };
        const note: Note = { id, from: by, to, t, text, duration: Number(p.duration ?? Math.max(3, Math.round(text.split(" ").length / 2.4))), audio: !!p.audio, kind: str("kind") ?? "note", scripted, analysis };
        sim.notes.push(note);
        if (by !== "clinic") log(t, by as PersonId, "note", `Voice note to ${to === "clinic" ? "the clinic" : name(to)}`);
        if (to !== "clinic" && to !== by) log(t, to as PersonId, "note", `Voice note from ${name(by)}`);
        trace(t, name(by), `Voice note to ${to === "clinic" ? "the clinic" : name(to)}${card ? ` (idea ${card.action ?? "short note"})` : ""}`, scripted);
        if (to === "clinic") sim.alerts.push({ id: `alert:msg:${t}`, person: by as PersonId, kind: "message", t, status: "new", text: `${name(by)} wrote to the clinic`, noteId: id });
        // Filtro de crisis: la lista fija manda; la IA solo puede añadir
        if (by !== "clinic" && analysis.crisis && P[by].consents.notes) severe(by as PersonId, t, "note", id);
        if (card) {
          card.status = "sent";
          card.sentAt = t;
          if (card.kind === "idea" && card.action && ACTIONS[card.action]) makePlan(by as PersonId, to as PersonId, card.action, t, card.id, id, card.context);
        } else if (typeof p.plan === "string") makePlan(by as PersonId, to as PersonId, p.plan as Action, t, undefined, id);
        // Copiloto: dos notas seguidas con índice de queja ≥ 0,7 -> sugerencia privada al mentor (silencio 72 h)
        if (to !== "clinic" && by !== "clinic") {
          const pair = by === P[to as PersonId]?.mentorId ? { mentor: by as PersonId, mentee: to as PersonId } : P[by as PersonId]?.mentorId === to ? { mentor: to as PersonId, mentee: by as PersonId } : null;
          if (pair && P[by as PersonId]?.consents.notes) {
            const conv = sim.notes.filter((n) => (n.from === pair.mentor && n.to === pair.mentee) || (n.from === pair.mentee && n.to === pair.mentor));
            const last = conv.slice(-2).map((n) => n.analysis?.indice_queja ?? 0);
            const recent = sim.copilots.some((c) => c.mentor === pair.mentor && t - c.t < 3 * DAY);
            if (last.length === 2 && last.every((v) => v >= 0.7) && !recent) {
              sim.copilots.push({ id: `copilot:${pair.mentor}:${t}`, mentor: pair.mentor, mentee: pair.mentee, t, status: "active", indices: conv.slice(-3).map((n) => n.analysis?.indice_queja ?? 0) });
              trace(t, "copilot", `A6: complaint loop (${last.join(", ")}) → private suggestion for ${name(pair.mentor)}`);
            }
          }
        }
        return true;
      }
      case "plan": {
        const plan = (p.planId ? sim.plans.find((x) => x.id === p.planId) : latestPlan(by, ["proposed"])) as Plan | undefined;
        if (!plan || plan.mentee !== by || (scripted && plan.status !== "proposed")) return false;
        const choice = str("choice");
        plan.status = choice === "in" ? "accepted" : choice === "change_time" ? "change_requested" : choice === "cant" ? "cant" : "other_day";
        plan.respondedAt = t;
        if (choice === "in") plan.RsBefore = sim.runs[by]?.days[day]?.Rs ?? plan.RsBefore;
        log(t, by, "plan", `${plan.title}: ${choice === "in" ? "I'm in" : choice === "change_time" ? "asked to change the time" : choice === "cant" ? "can't anymore" : "another day"}`);
        trace(t, name(by), choice === "in" ? `“I'm in” → ${plan.title}` : `Plan: ${choice}`, scripted);
        if (choice === "other_day" || choice === "cant") learn(plan, 0, t);
        return true;
      }
      case "plan_feedback": {
        const plan = (p.planId ? sim.plans.find((x) => x.id === p.planId) : latestPlan(by, ["accepted"])) as Plan | undefined;
        if (!plan || plan.feedback || plan.status !== "accepted" || t < plan.whenT) return false;
        plan.feedback = str("feedback") as Plan["feedback"];
        plan.feedbackAt = t;
        log(t, by, "plan", `How did it go? “${plan.feedback === "good" ? "Good" : plan.feedback === "ok" ? "So-so" : "Didn't go"}”`);
        trace(t, name(by), `How did it go? → ${plan.feedback}`, scripted);
        learn(plan, rewardFrom(true, plan.feedback ?? null, null, null), t);
        return true;
      }
      case "notice": {
        const n = sim.notices.find((x) => x.id === p.noticeId && x.to === by && x.status === "active");
        if (!n) return false;
        Object.assign(n, { status: "answered", answer: p.choice, answeredAt: t });
        log(t, by, "notice", `${n.code}: “${n.buttons.find((b) => b.id === p.choice)?.label ?? p.choice}”`);
        if (n.code === "V7" && p.choice === "need_help") P[by].openHelp = `v7:${t}`;
        return true;
      }
      case "help": {
        if (p.type === "clinic") severe(by as PersonId, t, "help");
        else {
          const m = P[by].mentorId;
          if (m) offer({ id: `HELP:${m}:${t}`, code: "HELP", to: m, about: by, text: NOTICE_TEXT.HELP_MENTOR(name(by)), buttons: [{ id: "note", label: "Send a note" }], created: t, validUntil: t + DAY }, t);
        }
        log(t, by, "help", p.type === "clinic" ? "Help: talk to my clinic" : `Help: asked ${name(P[by].mentorId ?? "")} to write`);
        return true;
      }
      case "rhythm": {
        const s = P[by];
        const r = Number(p.rhythm);
        if (p.decline) {
          s.reviewPace = true;
          if (s.rhythmProposal) s.rhythmProposal.answer = "decline";
          log(t, by, "pace", "Preferred to keep the same pace (clinic: review pace)");
        } else {
          s.rhythm = r;
          s.tookPause = r === 0;
          if (s.rhythmProposal) s.rhythmProposal.answer = String(r);
          log(t, by, "pace", `Pace set to ${["Pause", "Light", "Normal", "Intense"][r]}`);
        }
        closeNotices(by, ["M5"], t, "Answered");
        trace(t, name(by), p.decline ? "Prefers to keep going (pace unchanged)" : `Pace → ${["Pause", "Light", "Normal", "Intense"][r]}`);
        return true;
      }
      case "call": {
        const who = str("person")!;
        if (p.mode === "schedule") {
          if (sim.calls.some((c) => c.person === who && c.mode === "schedule" && !c.done)) return !scripted && false;
          if (scripted && P[who].level < 2) return false;
          const when = Number(p.at);
          sim.calls.push({ id: `call:${who}:${t}`, person: who, t, mode: "schedule", scheduledFor: when });
          log(t, who, "call", `Call scheduled for ${dateOf(dayOf(when)).slice(5)} ${hhmm(when)}`, "clinic");
          trace(t, "clinic", `“Schedule call” for ${name(who)} → ${hhmm(when)}`, scripted);
          if (P[who].level >= 2)
            offer({ id: `V4:${who}:${t}`, code: "V4", to: who, text: NOTICE_TEXT.V4(), lock: NOTICE_TEXT.V4_LOCK, buttons: [{ id: "ok", label: "OK" }, { id: "write", label: "I'd rather write to them" }], created: t, validUntil: when }, t);
        } else {
          const sched = sim.calls.find((c) => c.person === who && c.mode === "schedule" && !c.done);
          if (scripted && !sched) return false;
          if (sched) sched.done = true;
          sim.calls.push({ id: `call:${who}:${t}`, person: who, t, mode: "now", done: true });
          closeNotices(who, ["V4"], t, "The call happened");
          log(t, who, "call", "Clinic called", "clinic");
          trace(t, "clinic", `Calls ${name(who)} and logs it`, scripted);
        }
        return true;
      }
      case "alert_take": {
        const a = sim.alerts.find((x) => x.id === p.alertId);
        if (!a || a.status !== "new") return false;
        a.status = "in_progress";
        a.assignee = str("assignee") ?? "Nurse Virtanen";
        return true;
      }
      case "resolve": {
        const a = (p.alertId ? sim.alerts.find((x) => x.id === p.alertId) : [...sim.alerts].reverse().find((x) => x.person === p.person && (x.kind === "severe" || x.kind === "help") && x.status !== "resolved")) as Alert | undefined;
        if (!a || a.status === "resolved") return false;
        a.status = "resolved";
        a.resolvedAt = t;
        a.assignee ??= "Nurse Virtanen";
        const s = P[a.person];
        if ((a.kind === "severe" || a.kind === "help") && s.crisis) {
          // Al resolver, el nivel pasa directamente al que indiquen los datos
          s.crisis = null;
          s.resolutions.add(dateOf(day));
          s.openHelp = null;
          const run = (sim.runs[a.person] = engineRun(a.person, s, cfg));
          const lvl = run.days[day].level;
          s.level = lvl;
          s.levelSince = day;
          s.history.push({ day, level: lvl });
          trace(t, "clinic", `Resolves ${name(a.person)}'s alert → level back to what the data say (${lvl})`, scripted);
          log(t, a.person, "level", `Alert resolved by the clinic · level ${lvl}`, "clinic");
        }
        return true;
      }
      case "ideas_pause":
      case "ideas_reactivate": {
        const m = str("mentor")!;
        P[m].ideasPausedClinic = e.type === "ideas_pause";
        if (e.type === "ideas_reactivate") P[m].ideasPausedM6 = false;
        log(t, m, "pace", e.type === "ideas_pause" ? "Clinic paused ideas" : "Clinic reactivated ideas", "clinic");
        return true;
      }
      case "clinic_rhythm": {
        const m = str("mentor")!;
        P[m].rhythm = Number(p.rhythm);
        P[m].reviewPace = false;
        log(t, m, "pace", `Clinic set pace to ${["Pause", "Light", "Normal", "Intense"][P[m].rhythm]}`, "clinic");
        return true;
      }
      case "copilot": {
        const c = sim.copilots.find((x) => x.id === p.id && x.mentor === by);
        if (!c) return false;
        c.status = p.choice === "use" ? "used" : "dismissed";
        return true;
      }
      case "request": {
        sim.requests.push({ t, person: by as PersonId, kind: str("kind")! });
        sim.alerts.push({ id: `alert:req:${t}`, person: by as PersonId, kind: "data_request", t, status: "new", text: `${name(by)} asked to ${str("kind") === "delete" ? "delete their data" : "receive a copy of their data"}` });
        return true;
      }
      case "leave": {
        P[by].leftProgram = true;
        log(t, by, "pace", "Stopped being a mentor");
        return true;
      }
    }
    return false;
  }

  /* ----- Montar la cola: ticks diarios + acciones + guion ----- */
  for (let d = 0; d <= dayOf(now); d++) push(at(d, "03:15"), 0, () => engineTick(d));
  const userEvents = world.events.filter((e) => e.t <= now).sort((a, b) => a.t - b.t || a.seq - b.seq);
  for (const e of userEvents) push(e.t, 6 + e.seq / 1e6, () => {
    if (!act(e, false)) trace(e.t, e.by, `(${e.type} ignored: no longer applicable)`);
  });
  // El guion se salta si la persona ya actuó por su cuenta ese día sobre lo mismo
  for (const s of SCRIPT) push(s.t, 6.5, () => {
    const userDid = userEvents.some((e) => e.by === s.by && e.type === s.type && dayOf(e.t) === dayOf(s.t) && e.t <= s.t);
    if (!userDid) act({ ...s, p: { ...s.p } }, true);
  });
  while (queue.length) {
    const item = queue.shift()!;
    cur = item.t;
    item.run();
  }

  // Avisos caducados al llegar al reloj
  for (const n of sim.notices) if (n.status === "active" && n.validUntil < now) n.status = "expired";
  for (const id of Object.keys(sim.people)) sim.runs[id] ??= engineRun(id, sim.people[id], cfg);
  return sim;
}

export { DOMAINS, COPILOT, LAST_DAY };
