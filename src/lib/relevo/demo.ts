// Vista de demo (sección 12): momentos clave del deslizador y "Capa de explicación" (solo existe en la demo).
// Enseña al jurado lo que el motor calculó para provocar lo que aparece en los móviles.
import { ACTIONS, DOMAINS, DOMAIN_LABEL, FEATURE_INFO, banditColdStart, banditProbs, banditUpdate, fingerprint, type Action, type Domain } from "./engine.ts";
import { PERSON } from "./people.ts";
import { at, dateOf, dayOf, hhmm, type Sim } from "./sim.ts";
import { ACTION_LABEL, dayLabel, matchFor } from "./views.ts";

export type Moment = { t: number; key: string; label: string; group: string };
export const MOMENTS: Moment[] = [
  { t: at(0, "08:10"), key: "match", label: "Matching: Pablo or Sara for Luis?", group: "match" },
  { t: at(0, "09:20"), key: "intro", label: "Pablo accepts and records his intro", group: "match" },
  { t: at(0, "18:00"), key: "welcome", label: "Luis's welcome and consents", group: "match" },
  { t: at(27, "20:00"), key: "baseline", label: "Four weeks: Luis's baseline is set", group: "baseline" },
  { t: at(40, "21:10"), key: "copilot", label: "Third note in a complaint loop: copilot", group: "copilot" },
  { t: at(43, "09:00"), key: "spike", label: "A one-day spike: nothing fires", group: "detect" },
  { t: at(45, "09:00"), key: "candidate", label: "Mobility stays high: candidate, day 1 of 3", group: "detect" },
  { t: at(47, "03:15"), key: "l1", label: "Third day in a row: Luis enters level 1", group: "detect" },
  { t: at(47, "08:30"), key: "v1", label: "Pablo is asked first", group: "solution" },
  { t: at(47, "08:41"), key: "yes", label: "Pablo says yes → Luis reads V2", group: "solution" },
  { t: at(47, "09:05"), key: "note", label: "Pablo sends the walk as a voice note", group: "solution" },
  { t: at(47, "11:20"), key: "in", label: "Luis: “I'm in”", group: "solution" },
  { t: at(48, "11:30"), key: "good", label: "“Good” → walk 0.62 → 0.70", group: "solution" },
  { t: at(54, "03:15"), key: "l2", label: "Luis enters level 2: the clinic steps in", group: "high" },
  { t: at(54, "09:10"), key: "cant", label: "Pablo: “Can't today” (respected)", group: "high" },
  { t: at(54, "10:10"), key: "v4", label: "Clinic schedules a call → V4", group: "high" },
  { t: at(54, "14:30"), key: "v3defer", label: "V3 postponed: V4 already sent today", group: "high" },
  { t: at(55, "08:30"), key: "v3", label: "V3 delivered, V7 dropped, direct idea", group: "high" },
  { t: at(55, "12:00"), key: "call", label: "The clinic calls Luis", group: "high" },
  { t: at(56, "08:30"), key: "pl1", label: "Pablo enters level 1: Marta is asked first", group: "mentor" },
  { t: at(56, "09:02"), key: "v5", label: "Marta says yes → Pablo reads V5", group: "mentor" },
  { t: at(57, "21:12"), key: "crisis", label: "Crisis phrase in a note → level 3 now", group: "crisis" },
  { t: at(57, "21:27"), key: "forward", label: "Unattended 15 min → on-call lead", group: "crisis" },
  { t: at(59, "10:00"), key: "resolve", label: "Clinic resolves → back to what data say", group: "crisis" },
  { t: at(60, "08:30"), key: "pl2", label: "Pablo level 2: a pause, ideas for Luis paused", group: "mentor2" },
  { t: at(60, "09:02"), key: "v5b", label: "Marta writes to Pablo", group: "mentor2" },
  { t: at(62, "12:00"), key: "close", label: "What the simulation shows", group: "close" },
];

// "What just happened" (J-05/U-09): las claves internas en castellano se sirven con su etiqueta en inglés
const LABELS: Record<string, string> = { ...ACTION_LABEL, ...DOMAIN_LABEL };
const KEYS = new RegExp(`\\b(${Object.keys(LABELS).join("|")})\\b`, "g");
const english = (text: string) => text.replace(KEYS, (k) => LABELS[k]);

const r2 = (v: number | null | undefined) => (v === null || v === undefined ? null : Math.round(v * 100) / 100);

function engineSeries(sim: Sim, id: string) {
  const run = sim.runs[id];
  const day = Math.min(62, dayOf(sim.now));
  const from = 28;
  const idx = day >= from ? Array.from({ length: day - from + 1 }, (_, i) => from + i) : [];
  return {
    dates: idx.map((i) => dateOf(i).slice(5)), labels: idx.map((i) => dayLabel(i)),
    Rs: idx.map((i) => r2(run.days[i].Rs)),
    level: idx.map((i) => (i === day ? sim.people[id].level : levelAt(sim, id, i))),
    cand: idx.map((i) => run.days[i].cand),
    domains: Object.fromEntries(DOMAINS.map((d) => [d, idx.map((i) => r2(run.days[i].sSmooth[d]))])) as Record<Domain, (number | null)[]>,
  };
}
function levelAt(sim: Sim, id: string, day: number) {
  const h = sim.people[id].history.filter((x) => x.day <= day);
  return h.length ? h[h.length - 1].level : 0;
}
function today(sim: Sim, id: string) {
  const day = Math.min(62, dayOf(sim.now));
  const row = sim.runs[id].days[day];
  // Racha de días seguidos con el candidato por encima del nivel (lo que exige la persistencia)
  let streak = 0;
  for (let d = day; d >= 0 && sim.runs[id].days[d].cand > levelAt(sim, id, d - 1) && sim.runs[id].days[d].baselineDone; d--) streak++;
  const top = Object.entries(row.z).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([k, v]) => ({ key: k, name: FEATURE_INFO[k].name, z: r2(v) }));
  return {
    date: dayLabel(day), baselineDone: row.baselineDone, level: sim.people[id].level, cand: row.cand, streak,
    Rs: r2(row.Rs), R: r2(row.R),
    domains: DOMAINS.map((d) => ({ key: d, label: DOMAIN_LABEL[d], s: r2(row.s[d]), smooth: r2(row.sSmooth[d]), feats: row.counts?.[d] ?? 0 })),
    top,
  };
}

export function demoView(sim: Sim) {
  const now = sim.now;
  const idx = MOMENTS.reduce((acc, m, i) => (m.t <= now ? i : acc), -1);
  const moment = idx >= 0 ? MOMENTS[idx] : null;
  const group = moment?.group ?? "match";

  // Momento 1: huellas y afinidad
  const fp = (id: string) => fingerprint(PERSON[id].q);
  const match = { luis: fp("luis"), pablo: fp("pablo"), sara: fp("sara"), pabloLuis: matchFor("luis", "pablo"), saraLuis: matchFor("luis", "sara") };

  // Momento 4: bandido (prior de evidencia, lo que le funcionó a Pablo, arranque de la pareja, ahora)
  const pab = banditColdStart();
  for (const [a, w, l] of [["paseo_juntos", 4, 1], ["llamada_o_quedar", 2, 2], ["actividad_con_sentido", 1, 2]] as [Action, number, number][]) {
    for (let i = 0; i < w; i++) banditUpdate(pab, a, "movilidad", 1);
    for (let i = 0; i < l; i++) banditUpdate(pab, a, "movilidad", 0);
  }
  const ctxActions = (Object.keys(ACTIONS) as Action[]).filter((a) => ACTIONS[a].domains.includes("movilidad"));
  const pr = (o: Partial<Record<Action, number>>) => ctxActions.map((a) => ({ key: a, label: ACTION_LABEL[a], p: r2(o[a] ?? null) }));
  const pair = sim.bandits["pablo>luis"];
  const evidence = Object.fromEntries(ctxActions.map((a) => [a, ACTIONS[a].prior]));
  const bandit = {
    context: "movilidad", contextLabel: DOMAIN_LABEL.movilidad,
    evidence: pr(evidence), pablo: pr(banditProbs(pab, "movilidad")), start: pr(banditProbs(banditColdStart(pab), "movilidad")),
    now: pair ? pr(banditProbs(pair.state, "movilidad")) : pr(banditProbs(banditColdStart(pab), "movilidad")),
    cards: sim.cards.filter((c) => c.mentor === "pablo" && c.action && c.t <= now + 1440).map((c) => ({ day: dayLabel(c.day), action: c.action!, label: ACTION_LABEL[c.action!], level: c.level, probs: pr(c.probs ?? {}), draws: pr(c.draws ?? {}), prepared: !!c.prepared, status: c.status })),
    history: pair?.history.filter((h) => h.t <= now).map((h) => ({ when: `${dayLabel(dayOf(h.t))} ${hhmm(h.t)}`, label: ACTION_LABEL[h.action], reward: h.reward, context: DOMAIN_LABEL[h.context] })) ?? [],
  };

  // Copiloto: índices de las notas de Luis
  const loop = sim.notes.filter((n) => n.t <= now && ((n.from === "luis" && n.to === "pablo") || (n.from === "pablo" && n.to === "luis")) && n.t >= at(38, "00:00") && n.t <= at(41, "00:00"))
    .map((n) => ({ who: PERSON[n.from as string]?.name ?? n.from, text: n.text, ...n.analysis! }));
  const copilot = { notes: loop, fired: sim.copilots.some((c) => c.mentor === "pablo" && c.t <= now) };

  // Avisos y push del día (para enseñar la prioridad y los aplazamientos)
  const day = dayOf(now);
  const notices = sim.notices.filter((n) => (dayOf(n.created) === day || dayOf(n.t) === day) && n.created <= now && ["luis", "pablo", "marta"].includes(n.to))
    .map((n) => ({ code: n.code, to: PERSON[n.to].name, text: n.text, time: hhmm(n.t), status: n.t > now ? "pending" : n.status, pushed: n.pushed, why: n.why ?? null }));

  return {
    clock: { t: now, day, time: hhmm(now), date: dayLabel(day), iso: dateOf(day) },
    moments: MOMENTS.map((m) => ({ ...m, day: dayOf(m.t), time: hhmm(m.t) })), index: idx, group,
    luis: { today: today(sim, "luis"), series: engineSeries(sim, "luis") },
    pablo: { today: today(sim, "pablo"), series: engineSeries(sim, "pablo") },
    match, bandit, copilot, notices,
    crisis: {
      alert: sim.alerts.filter((a) => a.person === "luis" && (a.kind === "severe" || a.kind === "help") && a.t <= now).map((a) => ({ text: a.text, when: `${dayLabel(dayOf(a.t))} ${hhmm(a.t)}`, status: a.status, forwarded: a.forwardedAt !== undefined && a.forwardedAt <= now })).at(-1) ?? null,
    },
    trace: sim.trace.filter((e) => e.t <= now).sort((a, b) => a.t - b.t).slice(-14).reverse().map((e) => ({ when: `${dayLabel(dayOf(e.t))} ${hhmm(e.t)}`, who: e.who, text: english(e.text), scripted: !!e.scripted })),
    // Aviso al presentador (K-06): si Luis apagó algún consentimiento, la historia de la demo no ocurre
    luisConsents: { onboarded: sim.people.luis.onboarded, off: (["data", "notes", "ideas"] as const).filter((k) => !sim.people.luis.consents[k]) },
    // Cifras de scripts/relevo-evaluate.mjs (1.000 personas sintéticas, 500 recaídas, tres áreas). Prueban la lógica, no la precisión clínica.
    evaluation: { l1: { sensitivity: 0.9, lead: 6, iqr: [3, 10], fa: 2.37 }, l2: { sensitivity: 0.62, lead: 1, fa: 0.77 }, people: 1000, relapses: 500 },
  };
}
