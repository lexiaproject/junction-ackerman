// Relevo · motor de riesgo determinista (port a TypeScript de relevo_engine.py v3).
// Es la ÚNICA pieza que calcula riesgo. La interfaz nunca lo hace: solo pinta lo que devuelve el servidor.
// Todo lo marcado [diseño] es una decisión del prototipo, no evidencia.
// Sin imports a propósito: lo usan tanto Next.js como el script de comprobación (node scripts/relevo-check.mjs).

/* ---------- 0. Parámetros (la clínica los ajusta en C5) ---------- */
// Tres áreas, las que importan a la clínica: sueño, movilidad y fisiología (esta solo con reloj o anillo).
// [diseño] Antes había cinco; "ritmo" y "móvil y vínculo" se retiraron a petición del equipo clínico (ver DECISIONES.md).
export type Domain = "sueno" | "movilidad" | "fisiologia";
export const DOMAINS: Domain[] = ["sueno", "movilidad", "fisiologia"];
export const DOMAIN_LABEL: Record<Domain, string> = {
  sueno: "sleep",
  movilidad: "mobility",
  fisiologia: "physiology",
};

export type Params = {
  baseline_days: number;
  baseline_min_valid: number;
  window_min_valid_14: number;
  window_min_valid_7: number;
  z_clip: number;
  ewma_lambda: number;
  l1_R: number;
  l2_R: number;
  l3_R: number;
  domain_hi: number;
  domain_hi_min_feats: number;
  persist_up: number;
  persist_down: number;
  refresh_days: number;
  silence_hours: number;
  weights: Record<Domain, number>;
};

export const PARAMS: Params = {
  baseline_days: 28, // [diseño] 4 semanas tras la última sesión de TMS
  baseline_min_valid: 14, // [diseño]
  window_min_valid_14: 8, // Sun et al. 2023
  window_min_valid_7: 4, // [diseño]
  z_clip: 4, // [diseño]
  ewma_lambda: 0.3, // [diseño]
  l1_R: 0.8,
  l2_R: 1.5,
  l3_R: 2.5, // [diseño]
  domain_hi: 1.5, // [diseño]
  domain_hi_min_feats: 2, // [diseño, ajustado en simulación]
  persist_up: 3,
  persist_down: 5, // [diseño]
  refresh_days: 28, // [diseño]
  silence_hours: 48, // A1 [diseño]
  weights: { sueno: 0.5, movilidad: 0.4, fisiologia: 0.1 }, // [diseño] sin reloj ni anillo, el peso de fisiología se reparte
};

/* ---------- 1. Catálogo de rasgos (signo +1: más es peor; -1: menos es peor) ---------- */
export type Feature = { key: string; domain: Domain; sign: 1 | -1; minScale: number; unit: string; optional?: boolean };
export const FEATURES: Feature[] = [
  { key: "tst_sd14", domain: "sueno", sign: 1, minScale: 10, unit: "min" },
  { key: "mid_sd14", domain: "sueno", sign: 1, minScale: 8, unit: "min" },
  { key: "waso7", domain: "sueno", sign: 1, minScale: 4, unit: "min", optional: true },
  { key: "awak7", domain: "sueno", sign: 1, minScale: 0.3, unit: "n", optional: true },
  { key: "tst_excess7", domain: "sueno", sign: 1, minScale: 15, unit: "min" },
  { key: "steps7", domain: "movilidad", sign: -1, minScale: 300, unit: "steps" },
  { key: "home7", domain: "movilidad", sign: 1, minScale: 0.3, unit: "h" },
  { key: "entropy7", domain: "movilidad", sign: -1, minScale: 0.02, unit: "0-1" },
  { key: "rmssd7", domain: "fisiologia", sign: -1, minScale: 1.5, unit: "ms", optional: true },
  { key: "rhr7", domain: "fisiologia", sign: 1, minScale: 0.7, unit: "bpm", optional: true },
];
export const FEAT: Record<string, Feature> = Object.fromEntries(FEATURES.map((f) => [f.key, f]));

// Nombre legible (C2) y frase clínica de la plantilla del resumen automático (sección 9.2)
export const FEATURE_INFO: Record<string, { name: string; signal: string; phrase: string }> = {
  mid_sd14: { name: "Bed & wake time variability (14 d)", signal: "Irregular timing: bed & wake times", phrase: "more irregular bed and wake times" },
  tst_sd14: { name: "Sleep duration variability (14 d)", signal: "Irregular timing: sleep duration", phrase: "more irregular sleep" },
  waso7: { name: "Awake after sleep onset (7 d)", signal: "Fragmented sleep: time awake", phrase: "more time awake at night" },
  awak7: { name: "Night awakenings (7 d)", signal: "Fragmented sleep: awakenings", phrase: "more night awakenings" },
  tst_excess7: { name: "Sleep amount vs. usual (7 d)", signal: "Much more or much less sleep", phrase: "sleeps far from their usual amount" },
  home7: { name: "Time at home (7 d)", signal: "Withdrawal", phrase: "more time at home" },
  entropy7: { name: "Place variety, location entropy (7 d)", signal: "Poorer routine", phrase: "goes to fewer different places" },
  steps7: { name: "Steps (7 d)", signal: "Fewer steps", phrase: "fewer steps" },
  rmssd7: { name: "Night HRV, RMSSD (7 d)", signal: "Lower HRV", phrase: "lower night-time heart rate variability" },
  rhr7: { name: "Night resting pulse (7 d)", signal: "Higher resting pulse", phrase: "higher night-time pulse" },
};

export type Raw = { dates: string[]; cols: Record<string, (number | null)[]> };
export const RAW_COLS = ["tst", "mid", "onset", "waso", "awak", "ra", "steps", "home", "entropy", "screen", "night", "latency", "replied", "rmssd", "rhr"];

/* ---------- 2. Rasgos diarios (medias y DE móviles, como pandas.rolling con min_periods) ---------- */
type Series = (number | null)[];
function rolling(s: Series, w: number, fn: "mean" | "std", minValid: number): Series {
  return s.map((_, i) => {
    const win = s.slice(Math.max(0, i - w + 1), i + 1).filter((v): v is number => v !== null && !Number.isNaN(v));
    if (win.length < minValid) return null;
    const m = win.reduce((a, b) => a + b, 0) / win.length;
    if (fn === "mean") return m;
    if (win.length < 2) return null;
    return Math.sqrt(win.reduce((a, b) => a + (b - m) ** 2, 0) / (win.length - 1)); // ddof = 1, como pandas
  });
}

const MEAN7_SOURCE: Record<string, string> = {
  waso7: "waso", awak7: "awak", steps7: "steps", home7: "home", entropy7: "entropy", rmssd7: "rmssd", rhr7: "rhr", tst_mean7: "tst",
};
const SD14_KEYS = new Set(["tst_sd14", "mid_sd14"]);

export function computeFeatures(raw: Raw, p: Params = PARAMS): Record<string, Series> {
  const f: Record<string, Series> = {};
  f.tst_sd14 = rolling(raw.cols.tst, 14, "std", p.window_min_valid_14);
  f.mid_sd14 = rolling(raw.cols.mid, 14, "std", p.window_min_valid_14);
  for (const [key, col] of Object.entries(MEAN7_SOURCE)) f[key] = rolling(raw.cols[col], 7, "mean", p.window_min_valid_7);
  return f;
}

/* ---------- 3. Línea base y z robusta ---------- */
export type Baseline = { med: Record<string, number>; scale: Record<string, number>; start: number; end: number };
const median = (a: number[]) => {
  const s = [...a].sort((x, y) => x - y);
  const n = s.length;
  return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2;
};

export function fitBaseline(feat: Record<string, Series>, start: number, end: number, raw: Raw, p: Params = PARAMS): Baseline | null {
  const med: Record<string, number> = {};
  const scale: Record<string, number> = {};
  const keys = [...FEATURES.map((f) => f.key).filter((k) => k !== "tst_excess7"), "tst_mean7"];
  for (const k of keys) {
    const s = feat[k].slice(start, end + 1).filter((v): v is number => v !== null);
    if (s.length < p.baseline_min_valid) continue;
    const m = median(s);
    const cands = [median(s.map((v) => Math.abs(v - m))) * 1.4826, k in FEAT ? FEAT[k].minScale : FEAT.tst_excess7.minScale];
    if (k in MEAN7_SOURCE) {
      const d = raw.cols[MEAN7_SOURCE[k]].slice(start, end + 1).filter((v): v is number => v !== null);
      if (d.length >= p.baseline_min_valid) {
        if (k === "reply7") {
          const pm = d.reduce((a, b) => a + b, 0) / d.length;
          cands.push(Math.sqrt(Math.max(pm * (1 - pm), 0.01) / 7));
        } else {
          const dm = median(d);
          cands.push((median(d.map((v) => Math.abs(v - dm))) * 1.4826) / Math.sqrt(7));
        }
      }
    }
    if (SD14_KEYS.has(k)) cands.push(m / Math.sqrt(2 * 13));
    med[k] = m;
    scale[k] = Math.max(...cands);
  }
  return Object.keys(med).length ? { med, scale, start, end } : null;
}

const clip = (v: number, c: number) => Math.max(-c, Math.min(c, v));

export function zscores(feat: Record<string, Series>, i: number, bl: Baseline, tstDirection: number, p: Params = PARAMS) {
  const z: Record<string, number> = {};
  for (const ft of FEATURES) {
    const k = ft.key;
    let v: number;
    if (k === "tst_excess7") {
      const x = feat.tst_mean7[i];
      if (!("tst_mean7" in bl.med) || x === null) continue;
      const dev = (x - bl.med.tst_mean7) / bl.scale.tst_mean7;
      v = tstDirection !== 0 ? dev * tstDirection : Math.abs(dev);
    } else {
      const x = feat[k][i];
      if (!(k in bl.med) || x === null) continue;
      v = (ft.sign * (x - bl.med[k])) / bl.scale[k];
    }
    z[k] = clip(v, p.z_clip);
  }
  return z;
}

/* ---------- 4. Índices ---------- */
export function domainScores(z: Record<string, number>) {
  const out: Partial<Record<Domain, number>> = {};
  for (const d of DOMAINS) {
    const vals = Object.entries(z).filter(([k]) => FEAT[k].domain === d).map(([, v]) => v);
    if (vals.length) out[d] = vals.reduce((a, b) => a + b, 0) / vals.length;
  }
  return out;
}
export function domainCounts(z: Record<string, number>) {
  return Object.fromEntries(DOMAINS.map((d) => [d, Object.keys(z).filter((k) => FEAT[k].domain === d).length])) as Record<Domain, number>;
}
export function globalIndex(s: Partial<Record<Domain, number>>, w: Record<Domain, number>): number | null {
  const avail = (Object.keys(s) as Domain[]).filter((d) => d in w);
  if (!avail.length) return null;
  const tot = avail.reduce((a, d) => a + w[d], 0); // se reparte el peso de dominios ausentes
  return avail.reduce((a, d) => a + (w[d] / tot) * Math.max(0, s[d]!), 0);
}

/* ---------- 5. Máquina de niveles (persistencia + histéresis) ---------- */
export function candidateLevel(Rs: number, s: Partial<Record<Domain, number>>, crisis: boolean, counts: Record<Domain, number>, p: Params = PARAMS) {
  const hi = (Object.entries(s) as [Domain, number][]).filter(([d, v]) => v >= p.domain_hi && (counts[d] ?? 0) >= p.domain_hi_min_feats).length;
  if (crisis) return 4; // crisis explícita: nivel 3 inmediato
  if (Rs >= p.l3_R) return 3;
  if (Rs >= p.l2_R || hi >= 2) return 2;
  if (Rs >= p.l1_R || hi >= 1) return 1;
  return 0;
}

class LevelState {
  level = 0;
  upRun = 0;
  downRun = 0;
  crisisHold = false; // nivel 3 por crisis: solo lo cierra la clínica
  resolvePending = false;
  p: Params;
  constructor(p: Params) {
    this.p = p;
  }
  clinicResolve() {
    this.crisisHold = false;
    this.resolvePending = true;
    this.downRun = 0;
  }
  step(cand: number) {
    if (cand === 4) {
      this.level = 3;
      this.upRun = this.downRun = 0;
      this.crisisHold = true;
      return 3;
    }
    if (this.crisisHold) return this.level;
    if (this.resolvePending) {
      this.resolvePending = false;
      this.level = Math.min(cand, 3);
      this.upRun = this.downRun = 0;
      return this.level;
    }
    if (cand > this.level) {
      this.upRun++;
      this.downRun = 0;
      if (this.upRun >= this.p.persist_up) {
        this.level = this.level >= 1 ? Math.min(cand, this.level + 1) : cand;
        this.upRun = 0;
      }
    } else if (cand < this.level) {
      this.downRun++;
      this.upRun = 0;
      if (this.downRun >= this.p.persist_down) {
        this.level -= 1; // baja de uno en uno
        this.downRun = 0;
      }
    } else this.upRun = this.downRun = 0;
    return this.level;
  }
}

export type DayResult = {
  date: string;
  z: Record<string, number>;
  s: Partial<Record<Domain, number>>;
  sSmooth: Partial<Record<Domain, number>>;
  counts: Record<Domain, number> | null;
  R: number | null;
  Rs: number | null;
  cand: number;
  level: number;
  baselineDone: boolean;
};
export type PersonRun = { days: DayResult[]; feat: Record<string, Series>; baseline: Baseline | null };

/** Pipeline diario de una persona: z por rasgo, s por dominio, R, R_suav, nivel candidato y nivel. */
export function runPerson(
  raw: Raw,
  opts: { tstDirection?: number; crisisDays?: Set<string>; clinicResolutions?: Set<string>; params?: Params; disabled?: Set<string> } = {},
): PersonRun {
  const p = opts.params ?? PARAMS;
  // Tipos de dato apagados por la persona (A4/M4): la clínica ve "dato no disponible" y el motor no los usa
  const r: Raw = opts.disabled?.size
    ? { dates: raw.dates, cols: Object.fromEntries(Object.entries(raw.cols).map(([k, v]) => [k, opts.disabled!.has(k) ? v.map(() => null) : v])) }
    : raw;
  const feat = computeFeatures(r, p);
  const n = raw.dates.length;
  const blEnd = p.baseline_days - 1;
  let bl: Baseline | null = null;
  let firstBl: Baseline | null = null;
  const state = new LevelState(p);
  let Rs: number | null = null;
  const sS: Partial<Record<Domain, number>> = {};
  let lastRefresh = -1;
  let stableSince: number | null = null;
  const days: DayResult[] = [];
  for (let t = 0; t < n; t++) {
    const date = raw.dates[t];
    if (bl === null && t >= blEnd) {
      bl = fitBaseline(feat, 0, blEnd, r, p);
      firstBl ??= bl;
      lastRefresh = t;
    }
    if (bl !== null && t > blEnd) {
      const z = zscores(feat, t, bl, opts.tstDirection ?? 0, p);
      const s = domainScores(z);
      const R = globalIndex(s, p.weights);
      const lam = p.ewma_lambda;
      if (R !== null) Rs = Rs === null ? R : lam * R + (1 - lam) * Rs;
      for (const [d, v] of Object.entries(s) as [Domain, number][]) sS[d] = sS[d] === undefined ? v : lam * v + (1 - lam) * sS[d]!;
      const counts = domainCounts(z);
      const today = Object.fromEntries((Object.keys(s) as Domain[]).map((d) => [d, sS[d]!])) as Partial<Record<Domain, number>>;
      const cand = candidateLevel(Rs ?? 0, today, !!opts.crisisDays?.has(date), counts, p);
      if (opts.clinicResolutions?.has(date)) state.clinicResolve();
      const level = state.step(cand);
      // Recalcular la línea base cada 28 días si ha estado estable todo ese tiempo
      stableSince ??= t;
      if (level > 0) stableSince = null;
      else if (t - stableSince >= p.refresh_days && t - lastRefresh >= p.refresh_days) {
        const nb = fitBaseline(feat, t - p.refresh_days + 1, t, r, p);
        if (nb) {
          bl = nb;
          lastRefresh = t;
        }
      }
      days.push({ date, z, s, sSmooth: { ...today }, counts, R, Rs, cand, level, baselineDone: true });
    } else days.push({ date, z: {}, s: {}, sSmooth: {}, counts: null, R: null, Rs: null, cand: 0, level: 0, baselineDone: false });
  }
  return { days, feat, baseline: firstBl };
}

export const worstDomain = (s: Partial<Record<Domain, number>>) =>
  (Object.entries(s) as [Domain, number][]).reduce((a, b) => (b[1] > a[1] ? b : a))[0];

/* ---------- 6. Alarma A1: 48 h sin datos ni respuestas ---------- */
export function silenceDays(raw: Raw, appRepliesByDate: Set<string> = new Set()) {
  // Devuelve, por día, cuántos días seguidos lleva sin datos de sensores ni respuestas
  let run = 0;
  return raw.dates.map((d, i) => {
    const sensors = raw.cols.tst[i] !== null || raw.cols.steps[i] !== null;
    const answered = raw.cols.replied[i] === 1 || appRepliesByDate.has(d);
    run = sensors || answered ? 0 : run + 1;
    return run;
  });
}

/* ---------- 7. Ritmo del mentor ("Tu ritmo"): 0 Pausa · 1 Ligero · 2 Normal · 3 Intenso ---------- */
export const RHYTHM_NAMES = ["Pause", "Light", "Normal", "Intense"] as const;
export type RhythmProposal = { date: string; rhythm: number; why: string; screen: "M5_pause" | "V6_M5" | "M5" | "M3" };

/** Propuestas del sistema día a día (MentorDose.update). Quien decide es el mentor: aquí solo se proponen. */
export function rhythmProposals(levels: { date: string; level: number }[], startRhythm = 2, lastChange = "2026-08-01") {
  const out: { date: string; kind: "A5" | "proposal"; proposal?: RhythmProposal }[] = [];
  let dose = startRhythm;
  let last = Date.parse(lastChange);
  let level0Since: number | null = null;
  let prev = 0;
  let l1Run = 0;
  for (const { date, level } of levels) {
    const t = Date.parse(date);
    const rising = level > prev;
    prev = level;
    level0Since = level === 0 ? (level0Since ?? t) : null;
    l1Run = level >= 1 ? l1Run + 1 : 0;
    const propose = (d: number, why: string, screen: RhythmProposal["screen"]) => {
      out.push({ date, kind: "proposal", proposal: { date, rhythm: d, why, screen } });
      if (d !== dose) {
        dose = d;
        last = t;
      }
    };
    if (rising && level >= 2) {
      out.push({ date, kind: "A5" });
      propose(0, "mentor at level 2", "M5_pause");
    } else if (rising && level === 1) out.push({ date, kind: "A5" });
    else if (l1Run === 5 && dose > 1) propose(dose - 1, "5 days at level 1", "V6_M5");
    else if (new Date(t).getUTCDay() === 0 && level0Since !== null) {
      const sinceChange = (t - last) / 864e5;
      const stable = (t - level0Since) / 864e5;
      if (sinceChange >= 14) {
        if (dose === 0 && stable >= 14) propose(1, "back after a pause", "M3");
        else if (dose === 1 && stable >= 14) propose(2, "2 weeks stable on Light", "M3");
      }
    }
  }
  return out;
}

/* ---------- 8. Bandido de Thompson con arranque en frío ---------- */
export type Action = "actividad_con_sentido" | "paseo_juntos" | "llamada_o_quedar" | "ancla_manana" | "desconexion_nocturna" | "calma_acompanada";
export const ACTIONS: Record<Action, { domains: Domain[]; prior: number }> = {
  actividad_con_sentido: { domains: ["movilidad"], prior: 0.55 }, // BA SMD -0.74 (Ekers 2014)
  paseo_juntos: { domains: ["movilidad"], prior: 0.55 }, // caminar g -0.62 (Noetel 2024)
  llamada_o_quedar: { domains: ["movilidad", "sueno"], prior: 0.5 }, // peer SMD -0.59
  ancla_manana: { domains: ["sueno"], prior: 0.5 },
  desconexion_nocturna: { domains: ["sueno"], prior: 0.45 },
  calma_acompanada: { domains: ["fisiologia"], prior: 0.45 },
};
export const DIRECT_ACTIONS: Action[] = ["llamada_o_quedar", "paseo_juntos"];
const PRIOR_N = 4; // pseudo-observaciones del prior de evidencia [diseño]
const MENTOR_N_CAP = 4; // peso máximo de la experiencia del mentor [diseño]
export const FORGET = 0.95; // olvido semanal [diseño]

export type BanditState = Record<string, [number, number]>; // "accion|contexto" -> [alfa, beta]
const evidencePrior = (a: Action): [number, number] => [ACTIONS[a].prior * PRIOR_N, (1 - ACTIONS[a].prior) * PRIOR_N];

export function banditColdStart(mentor?: BanditState): BanditState {
  const b: BanditState = {};
  for (const [a, { domains }] of Object.entries(ACTIONS) as [Action, { domains: Domain[] }][]) {
    for (const c of domains) {
      const [ea, eb] = evidencePrior(a);
      const m = mentor?.[`${a}|${c}`];
      if (m) {
        const nM = Math.min(m[0] + m[1], MENTOR_N_CAP);
        const mean = (0.5 * m[0]) / (m[0] + m[1]) + (0.5 * ea) / (ea + eb);
        const nn = PRIOR_N / 2 + nM / 2;
        b[`${a}|${c}`] = [mean * nn, (1 - mean) * nn];
      } else b[`${a}|${c}`] = [ea, eb];
    }
  }
  return b;
}
export function banditUpdate(b: BanditState, a: Action, c: Domain, reward: number) {
  const k = `${a}|${c}`;
  b[k] ??= evidencePrior(a);
  b[k] = [b[k][0] + reward, b[k][1] + 1 - reward];
}
/** Olvido semanal: lo aprendido se acerca un 5 % al punto de partida de la pareja (sección 5.2). */
export function banditForget(b: BanditState, start: BanditState) {
  for (const k of Object.keys(b)) {
    const [pa, pb] = start[k] ?? evidencePrior(k.split("|")[0] as Action);
    b[k] = [pa + FORGET * (b[k][0] - pa), pb + FORGET * (b[k][1] - pb)];
  }
}
export function banditProbs(b: BanditState, c: Domain) {
  return Object.fromEntries(
    (Object.entries(ACTIONS) as [Action, { domains: Domain[] }][])
      .filter(([, v]) => v.domains.includes(c))
      .map(([a]) => {
        const ab = b[`${a}|${c}`] ?? evidencePrior(a);
        return [a, ab[0] / (ab[0] + ab[1])];
      }),
  ) as Partial<Record<Action, number>>;
}
export function banditCandidates(c: Domain, level: number, exclude: Action[] = []) {
  let cands = (Object.entries(ACTIONS) as [Action, { domains: Domain[] }][]).filter(([a, v]) => v.domains.includes(c) && !exclude.includes(a)).map(([a]) => a);
  if (level >= 2) {
    const direct = cands.filter((a) => DIRECT_ACTIONS.includes(a));
    cands = direct.length ? direct : DIRECT_ACTIONS.filter((a) => !exclude.includes(a));
  }
  return cands;
}
/** Muestreo de Thompson: se sortea un valor de cada Beta(α, β) y gana el mayor. En nivel 2, solo acciones directas. */
export function banditChoose(b: BanditState, c: Domain, rng: () => number, level = 1, exclude: Action[] = []) {
  const cands = banditCandidates(c, level, exclude);
  const draws = cands.map((a) => {
    const [al, be] = b[`${a}|${c}`] ?? evidencePrior(a);
    return { a, v: betaSample(al, be, rng) };
  });
  return { action: draws.reduce((x, y) => (y.v > x.v ? y : x)).a, draws: Object.fromEntries(draws.map((d) => [d.a, d.v])) as Partial<Record<Action, number>> };
}

// Generador pseudoaleatorio con semilla (mulberry32) y muestreo Beta vía dos Gamma (Marsaglia-Tsang)
export function rngFrom(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function hashSeed(...parts: (string | number)[]) {
  let h = 2166136261;
  for (const ch of parts.join("|")) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function normal(rng: () => number) {
  const u = Math.max(rng(), 1e-12);
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rng());
}
function gammaSample(k: number, rng: () => number): number {
  if (k < 1) return gammaSample(k + 1, rng) * Math.pow(Math.max(rng(), 1e-12), 1 / k);
  const d = k - 1 / 3;
  const c = 1 / Math.sqrt(9 * d);
  for (;;) {
    let x: number, v: number;
    do {
      x = normal(rng);
      v = 1 + c * x;
    } while (v <= 0);
    v = v * v * v;
    const u = rng();
    if (u < 1 - 0.0331 * x ** 4 || Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v;
  }
}
export function betaSample(a: number, b: number, rng: () => number) {
  const x = gammaSample(a, rng);
  return x / (x + gammaSample(b, rng));
}

/** Recompensa (sección 5.4): no aceptada o "No fui" 0 · "Regular" 0,5 · "Bien" 1 · sin respuesta: 1 si R_suav bajó ≥ 0,05 en 72 h. */
export function rewardFrom(accepted: boolean, feedback: "good" | "ok" | "didnt" | null, RsBefore: number | null, RsAfter72h: number | null) {
  if (!accepted || feedback === "didnt") return 0;
  if (feedback === "good") return 1;
  if (feedback === "ok") return 0.5;
  if (RsBefore === null || RsAfter72h === null) return 0;
  return RsAfter72h - RsBefore <= -0.05 ? 1 : 0;
}

/* ---------- 9. Emparejamiento por huella ---------- */
export const FP_DIMS = ["sueno", "movilidad", "fisiologia", "dir_sueno"] as const;
export type Questionnaire = Partial<Record<(typeof FP_DIMS)[number], number>>;
export const fingerprint = (q: Questionnaire) => FP_DIMS.map((d) => q[d] ?? 0);
export function cosine(a: number[], b: number[]) {
  const na = Math.hypot(...a);
  const nb = Math.hypot(...b);
  return na > 0 && nb > 0 ? a.reduce((s, v, i) => s + v * b[i], 0) / (na * nb) : 0;
}
export type Candidate = {
  id: string;
  fp: number[];
  monthsPostTms: number;
  level0Weeks: number;
  acuteRelapse: boolean;
  hours: string[];
  lang: string;
  prefs: string[];
  zone: string;
};
const jaccard = (a: string[], b: string[]) => a.filter((x) => b.includes(x)).length / Math.max(1, new Set([...a, ...b]).size);
export function affinity(m: Candidate, a: Candidate, wantInPerson = false) {
  if (m.monthsPostTms < 3 || m.level0Weeks < 4 || a.acuteRelapse) return null; // restricciones duras
  if (wantInPerson && m.zone !== a.zone) return null;
  const sim = (cosine(m.fp, a.fp) + 1) / 2;
  const hours = jaccard(m.hours, a.hours);
  const lang = m.lang === a.lang ? 1 : 0;
  const pref = jaccard(m.prefs, a.prefs);
  return { score: Math.round((0.6 * sim + 0.2 * hours + 0.2 * (0.5 * lang + 0.5 * pref)) * 1000) / 1000, sim, hours, lang, pref };
}

/* ---------- 10. Copiloto anti co-rumiación (parte determinista) y filtro de crisis ---------- */
// Lista fija: cualquier coincidencia -> nivel 3 inmediato. La IA solo puede AÑADIR alertas, nunca quitarlas.
export const CRISIS_PATTERNS = [
  /\bquiero morir/, /\bme quiero morir/, /\bsuicid/, /\bquitarme la vida/, /\bno quiero (seguir )?vivir/, /\bacabar con todo/, /\bhacerme daño/,
  /\bwant to die\b/, /\bkill myself\b/, /\bend it all\b/, /\bdon'?t want to (be alive|live|go on)\b/, /\bhurt myself\b/, /\btake my (own )?life\b/,
  /\bhaluan kuolla\b/, /\bitsemurh/,
];
const NEG = new Set(
  ("mal peor fatal triste agotado agotada cansado cansada nada nunca siempre solo sola vacío vacía horrible odio miedo ansiedad insomnio llorar " +
    "bad worse awful terrible sad exhausted tired nothing never always alone lonely empty horrible hate fear anxious anxiety insomnia cry crying same")
    .split(" "),
);
const ACT = new Set(
  ("mañana vamos quedamos paseo café plan probar intentar llamar salir hacer cocinar quedar caminar a las hoy " +
    "tomorrow let's lets meet walk coffee plan try call go out do cook join today later together")
    .split(" "),
);
const tokens = (t: string) => t.toLowerCase().match(/[a-záéíóúñü']+/g) ?? [];
export const crisisFlag = (text: string) => CRISIS_PATTERNS.some((p) => p.test(text.toLowerCase()));
function bowCos(a: string[], b: string[]) {
  const keys = [...new Set([...a, ...b])];
  const cnt = (arr: string[], k: string) => arr.filter((w) => w === k).length;
  return cosine(keys.map((k) => cnt(a, k)), keys.map((k) => cnt(b, k)));
}
const r2 = (v: number) => Math.round(v * 100) / 100;
export function complaintIndex(text: string, previous: string[], gemini?: { afecto_negativo: number; orientacion_accion: number; crisis?: boolean } | null) {
  const tok = tokens(text);
  const n = Math.max(1, tok.length);
  const neg = gemini ? gemini.afecto_negativo : Math.min(1, (4 * tok.filter((w) => NEG.has(w)).length) / n);
  const act = gemini ? gemini.orientacion_accion : Math.min(1, (4 * tok.filter((w) => ACT.has(w)).length) / n);
  const rep = Math.max(0, ...previous.slice(-3).map((p) => bowCos(tok, tokens(p))));
  const idx = 0.4 * neg + 0.4 * rep + 0.2 * (1 - act);
  return { afecto_negativo: r2(neg), repeticion: r2(rep), orientacion_accion: r2(act), indice_queja: r2(idx), crisis: crisisFlag(text) || !!gemini?.crisis };
}
/** A6: las 2 últimas notas con índice ≥ 0,7 (= tres notas seguidas sobre lo mismo). */
export const a6ShouldFire = (last: number[], thr = 0.7) => last.length >= 2 && last.slice(-2).every((v) => v >= thr);
