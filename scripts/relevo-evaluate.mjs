// Evalúa el motor sobre una población sintética (port de evaluate.py + simulator.py del motor de referencia).
// Mide sensibilidad (aviso dentro de la ventana de la recaída), antelación mediana y falsas alarmas por persona-año.
// Es una prueba de la LÓGICA del algoritmo, no de su precisión clínica. Uso: node scripts/relevo-evaluate.mjs
import { runPerson, rngFrom, DOMAINS, PARAMS } from "../src/lib/relevo/engine.ts";

const BASE = {
  tst: [440, 35], mid: [210, 30], onset: [0, 25], waso: [40, 12], awak: [2.5, 1], ra: [0.85, 0.04], steps: [6500, 1800],
  home: [15.5, 2.5], entropy: [0.55, 0.12], screen: [210, 45], night: [8, 6], latency: [5, 2.5], rmssd: [38, 5], rhr: [62, 2],
};
const EFFECTS = {
  sueno: [["waso", 1], ["awak", 1], ["onset", 1]],
  movilidad: [["steps", -1], ["home", 1], ["entropy", -1]],
  fisiologia: [["rmssd", -1], ["rhr", 1]],
};
const DOMS = DOMAINS.filter((d) => d in EFFECTS); // [diseño] las recaídas se sortean entre las áreas que el motor mide

function simulate(rng, { days = 180, onsetDay = null, domains = [], effect = 1.5, sleepDir = 1, badWeeks = 1, wearable = true }) {
  const norm = () => Math.sqrt(-2 * Math.log(Math.max(rng(), 1e-12))) * Math.cos(2 * Math.PI * rng());
  const start = Date.parse("2026-09-01T12:00:00Z");
  const dates = Array.from({ length: days }, (_, i) => new Date(start + i * 864e5).toISOString().slice(0, 10));
  const eff = dates.map((_, d) => (onsetDay === null ? 0 : d >= onsetDay ? effect : d >= onsetDay - 21 ? (effect * (d - onsetDay + 21)) / 21 : 0));
  const trans = new Array(days).fill(0);
  const transDom = [];
  for (let b = 0; b < badWeeks; b++) {
    const d0 = 35 + Math.floor(rng() * (days - 45));
    if (onsetDay !== null && Math.abs(d0 - onsetDay) < 40) continue;
    for (let i = d0; i < Math.min(days, d0 + 5); i++) trans[i] = 1;
    transDom.push(DOMS[Math.floor(rng() * DOMS.length)]);
  }
  const cols = {};
  for (const [k, [m, s]] of Object.entries(BASE)) {
    const pers = m + norm() * s * 0.8;
    cols[k] = dates.map(() => pers + norm() * s);
  }
  dates.forEach((dt, d) => {
    const doy = (Date.parse(dt + "T12:00:00Z") - Date.parse("2026-01-01T12:00:00Z")) / 864e5 + 1;
    const season = Math.cos((2 * Math.PI * (doy - 172)) / 365.25);
    cols.tst[d] += -8.3 * season;
    cols.steps[d] += 197 * season;
  });
  for (const dom of domains) {
    for (const [c, sg] of EFFECTS[dom]) cols[c] = cols[c].map((v, d) => v + sg * eff[d] * BASE[c][1]);
    if (dom === "sueno") {
      cols.tst = cols.tst.map((v, d) => v + norm() * eff[d] * 35 * 0.9 + sleepDir * eff[d] * 25);
      cols.mid = cols.mid.map((v, d) => v + norm() * eff[d] * 30 * 0.9);
    }
  }
  for (const dom of transDom) for (const [c, sg] of EFFECTS[dom]) cols[c] = cols[c].map((v, d) => v + sg * trans[d] * BASE[c][1]);
  cols.ra = cols.ra.map((v) => Math.min(0.99, Math.max(0.3, v)));
  cols.entropy = cols.entropy.map((v) => Math.min(1, Math.max(0, v)));
  for (const c of ["steps", "night", "waso", "awak", "latency", "screen"]) cols[c] = cols[c].map((v) => Math.max(0, v));
  cols.replied = eff.map((e) => (rng() < Math.min(0.98, Math.max(0.2, 0.92 - 0.12 * e)) ? 1 : 0));
  eff.forEach((e, d) => {
    if (rng() < Math.min(0.6, 0.08 + 0.06 * e)) for (const c of ["tst", "mid", "onset", "waso", "awak", "ra", "steps", "home", "entropy", "screen", "night", "rmssd", "rhr"]) cols[c][d] = null;
  });
  if (!wearable) for (const c of ["waso", "awak", "rmssd", "rhr"]) cols[c] = cols[c].map(() => null);
  return { raw: { dates, cols }, onset: onsetDay === null ? null : dates[onsetDay], sleepDir };
}

function population(n = 200, seed = 42) {
  const rng = rngFrom(seed);
  const pop = [];
  for (let i = 0; i < n; i++) {
    const relapser = i % 2 === 0;
    const k = 1 + Math.floor(rng() * Math.min(3, DOMS.length));
    const doms = [...DOMS].sort(() => rng() - 0.5).slice(0, k);
    const onset = relapser ? 75 + Math.floor(rng() * (180 - 10 - 75)) : null;
    pop.push(simulate(rngFrom(seed * 1000 + i), { onsetDay: onset, domains: doms, effect: 0.8 + rng() * 1.2, sleepDir: rng() < 0.5 ? -1 : 1, badWeeks: Math.floor(rng() * 3), wearable: rng() < 0.6 }));
  }
  return pop;
}

const day = (s) => Date.parse(s + "T12:00:00Z") / 864e5;
function evaluate(pop, { minLevel = 1, leadWindow = 28, params = PARAMS } = {}) {
  let det = 0, fa = 0, faDays = 0, nRel = 0;
  const leads = [];
  for (const p of pop) {
    const res = runPerson(p.raw, { tstDirection: p.sleepDir, params });
    const on = p.onset ? day(p.onset) : null;
    if (on !== null) nRel++;
    let hit = null;
    res.days.forEach((d, i) => {
      if (i > 0 && d.level >= minLevel && res.days[i - 1].level < minLevel) {
        const t = day(d.date);
        if (on !== null && t >= on - leadWindow && t <= on + 7) hit ??= t;
        else fa++;
      }
      if (d.Rs !== null && !(on !== null && day(d.date) >= on - leadWindow)) faDays++;
    });
    if (hit !== null) { det++; leads.push(on - hit); }
  }
  leads.sort((a, b) => a - b);
  const q = (f) => { const x = (leads.length - 1) * f, lo = Math.floor(x); return leads.length ? leads[lo] + (leads[Math.min(lo + 1, leads.length - 1)] - leads[lo]) * (x - lo) : null; };
  return { sensitivity: Math.round((det / Math.max(1, nRel)) * 1000) / 1000, lead: q(0.5), iqr: [q(0.25), q(0.75)], fa: Math.round((fa / Math.max(1, faDays)) * 365 * 100) / 100, relapses: nRel };
}

// Cinco poblaciones de 200 (1.000 personas, 500 recaídas) para que las cifras no dependan de una sola semilla
const pop = [42, 7, 11, 23, 99].flatMap((sd) => population(200, sd));
const out = { l1: evaluate(pop), l2: evaluate(pop, { minLevel: 2 }), people: pop.length, domains: DOMS, weights: PARAMS.weights };
console.log(JSON.stringify(out, null, 1));
