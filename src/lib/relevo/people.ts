// Personas de la demo. Luis y Pablo usan EXACTAMENTE los datos del motor de referencia (CSV de la v3).
// MOCK: el resto de la red (Marta, Sara y cuatro personas más) se genera con un port del simulador (simulator.py),
// para que el panel de la clínica tenga una red creíble. Todos los datos de sensores de la demo son simulados.
import luisRaw from "./data/luis.json" with { type: "json" };
import pabloRaw from "./data/pablo.json" with { type: "json" };
import { RAW_COLS, rngFrom, type Questionnaire, type Raw } from "./engine.ts";

export type PersonId = string;
export type Person = {
  id: PersonId;
  name: string;
  role: "mentee" | "mentor";
  mentorId?: PersonId;
  menteeId?: PersonId;
  tmsEnd: string;
  joinedDay: number; // día de la demo en que entra en Relevo (antes no tiene datos)
  raw: Raw;
  tstDirection: number;
  wearable: string | null;
  background: boolean; // persona de relleno (sin app en la demo)
  hours: string[];
  prefs: string[];
  lang: string;
  zone: string;
  q: Questionnaire; // cuestionario de entrada (huella de su última recaída)
  monthsPostTms: number;
  level0Weeks: number;
  rhythm?: number; // ritmo inicial del mentor (2 = Normal)
};

export const DAY0 = "2026-09-07"; // día siguiente a la última sesión de TMS de Luis
export const LAST_DAY = 62;

/* ---------- Port del simulador (direcciones de la literatura; magnitudes [diseño]) ---------- */
const BASE: Record<string, [number, number]> = {
  tst: [440, 35], mid: [210, 30], onset: [0, 25], waso: [40, 12], awak: [2.5, 1], ra: [0.85, 0.04], steps: [6500, 1800],
  home: [15.5, 2.5], entropy: [0.55, 0.12], screen: [210, 45], night: [8, 6], latency: [5, 2.5], rmssd: [38, 5], rhr: [62, 2],
};
const EFFECTS: Record<string, [string, number][]> = {
  sueno: [["waso", 1], ["awak", 1], ["onset", 1]],
  movilidad: [["steps", -1], ["home", 1], ["entropy", -1]],
  fisiologia: [["rmssd", -1], ["rhr", 1]],
};
function simulate(o: { seed: number; onsetDay?: number; domains?: string[]; effect?: number; sleepDir?: number; startDay?: number; wearable?: boolean }): Raw {
  const rng = rngFrom(o.seed);
  const norm = () => Math.sqrt(-2 * Math.log(Math.max(rng(), 1e-12))) * Math.cos(2 * Math.PI * rng());
  const days = LAST_DAY + 1;
  const dates = Array.from({ length: days }, (_, i) => addDays(DAY0, i));
  const eff = dates.map((_, d) => {
    if (o.onsetDay === undefined) return 0;
    const start = o.onsetDay - 21;
    return d >= o.onsetDay ? (o.effect ?? 1.6) : d >= start ? ((o.effect ?? 1.6) * (d - start)) / 21 : 0;
  });
  const cols: Record<string, (number | null)[]> = {};
  for (const [k, [m, s]] of Object.entries(BASE)) {
    const pers = m + norm() * s * 0.8;
    cols[k] = eff.map(() => pers + norm() * s);
  }
  for (const dom of o.domains ?? []) {
    for (const [c, sg] of EFFECTS[dom]) cols[c] = cols[c].map((v, d) => v! + sg * eff[d] * BASE[c][1]);
    if (dom === "sueno") cols.tst = cols.tst.map((v, d) => v! + (o.sleepDir ?? 1) * eff[d] * 25 + norm() * eff[d] * 31);
  }
  cols.ra = cols.ra.map((v) => Math.min(0.99, Math.max(0.3, v!)));
  cols.entropy = cols.entropy.map((v) => Math.min(1, Math.max(0, v!)));
  for (const c of ["steps", "night", "waso", "awak", "latency", "screen"]) cols[c] = cols[c].map((v) => Math.max(0, v!));
  cols.replied = eff.map((e) => (rng() < Math.min(0.98, Math.max(0.2, 0.92 - 0.12 * e)) ? 1 : 0));
  eff.forEach((e, d) => {
    const before = o.startDay !== undefined && d < o.startDay;
    if (before || rng() < Math.min(0.6, 0.08 + 0.06 * e))
      for (const c of RAW_COLS) if (c !== "latency" && c !== "replied") cols[c][d] = null;
    if (before) cols.latency[d] = cols.replied[d] = null;
  });
  if (o.wearable === false) for (const c of ["waso", "awak", "rmssd", "rhr"]) cols[c] = cols[c].map(() => null);
  return { dates, cols };
}

export function addDays(date: string, n: number) {
  const d = new Date(date + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

const common = { lang: "en", background: false };
export const PEOPLE: Person[] = [
  {
    ...common, id: "luis", name: "Luis", role: "mentee", mentorId: "pablo", tmsEnd: "2026-09-06", joinedDay: 0, raw: luisRaw as Raw, tstDirection: 1,
    wearable: "Oura Ring", hours: ["morning", "afternoon"], prefs: ["voice", "in person"], zone: "Espoo",
    q: { sueno: 2, movilidad: 2, dir_sueno: 1 }, monthsPostTms: 0.1, level0Weeks: 0,
  },
  {
    ...common, id: "pablo", name: "Pablo", role: "mentor", mentorId: "marta", menteeId: "luis", tmsEnd: "2026-05-08", joinedDay: 0, raw: pabloRaw as Raw, tstDirection: 1,
    wearable: "Oura Ring", hours: ["morning"], prefs: ["voice", "in person"], zone: "Espoo",
    q: { sueno: 2, movilidad: 1, dir_sueno: 1 }, monthsPostTms: 4, level0Weeks: 8, rhythm: 2,
  },
  {
    ...common, id: "marta", name: "Marta", role: "mentor", menteeId: "pablo", tmsEnd: "2025-10-20", joinedDay: 0, raw: simulate({ seed: 101 }), tstDirection: 1,
    wearable: "Garmin watch", hours: ["morning", "evening"], prefs: ["voice"], zone: "Espoo",
    q: { sueno: 1, movilidad: 2, dir_sueno: 1 }, monthsPostTms: 10, level0Weeks: 30, rhythm: 2,
  },
  {
    ...common, id: "sara", name: "Sara", role: "mentor", tmsEnd: "2026-03-10", joinedDay: 0, raw: simulate({ seed: 202 }), tstDirection: -1,
    wearable: null, hours: ["morning", "afternoon"], prefs: ["voice"], zone: "Helsinki",
    q: { sueno: 2, fisiologia: 1, dir_sueno: -1 }, monthsPostTms: 6, level0Weeks: 10, rhythm: 1,
  },
  // MOCK: personas de relleno para que la red parezca real (sin app en la demo)
  {
    ...common, background: true, id: "helmi", name: "Helmi", role: "mentor", menteeId: "eero", tmsEnd: "2026-02-02", joinedDay: 0, raw: simulate({ seed: 303 }), tstDirection: 1,
    wearable: "Oura Ring", hours: ["evening"], prefs: ["voice", "in person"], zone: "Espoo", q: { movilidad: 2 }, monthsPostTms: 7, level0Weeks: 20, rhythm: 2,
  },
  {
    ...common, background: true, id: "eero", name: "Eero", role: "mentee", mentorId: "helmi", tmsEnd: "2026-08-28", joinedDay: 0,
    raw: simulate({ seed: 404, onsetDay: 64, domains: ["sueno", "movilidad"], effect: 1.8, sleepDir: -1 }), tstDirection: -1,
    wearable: null, hours: ["evening"], prefs: ["voice"], zone: "Vantaa", q: { sueno: 2, dir_sueno: -1 }, monthsPostTms: 0.3, level0Weeks: 0,
  },
  {
    ...common, background: true, id: "sanna", name: "Sanna", role: "mentor", menteeId: "juho", tmsEnd: "2025-12-15", joinedDay: 0, raw: simulate({ seed: 505 }), tstDirection: 1,
    wearable: "Apple Watch", hours: ["morning"], prefs: ["in person"], zone: "Helsinki", q: { sueno: 1, movilidad: 1 }, monthsPostTms: 9, level0Weeks: 26, rhythm: 1,
  },
  {
    ...common, background: true, id: "juho", name: "Juho", role: "mentee", mentorId: "sanna", tmsEnd: "2026-08-31", joinedDay: 0, raw: simulate({ seed: 606 }), tstDirection: 1,
    wearable: null, hours: ["morning"], prefs: ["in person"], zone: "Helsinki", q: { movilidad: 2 }, monthsPostTms: 0.2, level0Weeks: 0,
  },
  {
    ...common, background: true, id: "noora", name: "Noora", role: "mentee", tmsEnd: "2026-10-28", joinedDay: 52, raw: simulate({ seed: 707, startDay: 52 }), tstDirection: 1,
    wearable: null, hours: ["morning", "afternoon"], prefs: ["voice"], zone: "Espoo", q: { sueno: 2, movilidad: 1, dir_sueno: 1 }, monthsPostTms: 0, level0Weeks: 0,
  },
];
export const PERSON: Record<PersonId, Person> = Object.fromEntries(PEOPLE.map((p) => [p.id, p]));
export const APP_PEOPLE = ["luis", "pablo", "marta"] as const; // quienes tienen app en la demo
export type AppWho = (typeof APP_PEOPLE)[number];
