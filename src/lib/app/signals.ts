// Motor de patrones: compara a cada persona SOLO consigo misma (su línea base de los primeros 7 días)
// y detecta cambios sostenidos, no un día malo suelto.
import { addDays } from "./repo";
import type { DayStats, HealthDay, Level } from "./types";

type SignalDef = { label: string; unit: string; bad: "low" | "high"; kind: "in-app" | "sample"; minDelta: number; digits: number };

export const SIGNALS = {
  opens: { label: "Opens the app", unit: "/day", bad: "low", kind: "in-app", minDelta: 1, digits: 0 },
  replies: { label: "Replies to messages", unit: "%", bad: "low", kind: "in-app", minDelta: 15, digits: 0 },
  latency: { label: "Time to reply", unit: "h", bad: "high", kind: "in-app", minDelta: 2, digits: 1 },
  night: { label: "App use after midnight", unit: "/day", bad: "high", kind: "in-app", minDelta: 1, digits: 0 },
  sleep: { label: "Sleep", unit: "h", bad: "low", kind: "sample", minDelta: 0.8, digits: 1 },
  steps: { label: "Steps", unit: "", bad: "low", kind: "sample", minDelta: 1200, digits: 0 },
  outings: { label: "Times out of home", unit: "", bad: "low", kind: "sample", minDelta: 1, digits: 0 },
  hrv: { label: "Heart rate variability", unit: "ms", bad: "low", kind: "sample", minDelta: 5, digits: 0 },
} satisfies Record<string, SignalDef>;
export type SignalKey = keyof typeof SIGNALS;
const KEYS = Object.keys(SIGNALS) as SignalKey[];

export const BASELINE_DAYS = 7;

export type SignalStatus = { key: SignalKey; mean: number; threshold: number; value?: number; delta?: number; run: number; series: (number | null)[] };
export type Assessment = { level: Level; statuses: SignalStatus[]; flagged: number; dates: string[]; daysOfData: number };

// Convierte lo registrado en valores diarios por señal
function dayValues(s: DayStats | undefined, h: HealthDay | undefined): Partial<Record<SignalKey, number>> {
  const v: Partial<Record<SignalKey, number>> = { opens: s?.opens ?? 0, night: s?.night ?? 0 };
  if (s && s.received > 0) v.replies = Math.min(100, (100 * s.replied) / s.received);
  if (s && s.replied > 0) v.latency = s.latencyMin / s.replied / 60;
  if (h) Object.assign(v, h);
  return v;
}

// asOf: último día completo que se evalúa (normalmente ayer)
export function analyse(stats: Record<string, DayStats>, health: Record<string, HealthDay>, asOf: string, earlyDays = 2): Assessment {
  const known = [...Object.keys(stats), ...Object.keys(health)].filter((d) => d <= asOf).sort();
  if (!known.length) return { level: "learning", statuses: [], flagged: 0, dates: [], daysOfData: 0 };

  const dates: string[] = [];
  for (let d = known[0]; d <= asOf; d = addDays(d, 1)) dates.push(d);
  const rows = dates.map((d) => dayValues(stats[d], health[d]));
  if (dates.length <= BASELINE_DAYS) return { level: "learning", statuses: [], flagged: 0, dates, daysOfData: dates.length };

  const statuses: SignalStatus[] = [];
  for (const key of KEYS) {
    const def: SignalDef = SIGNALS[key];
    const base = rows.slice(0, BASELINE_DAYS).map((r) => r[key]).filter((x): x is number => x !== undefined);
    if (base.length < 4) continue; // no hay suficiente línea base para esta señal
    const mean = base.reduce((a, b) => a + b, 0) / base.length;
    const std = Math.sqrt(base.reduce((a, b) => a + (b - mean) ** 2, 0) / base.length);
    const threshold = Math.max(2 * std, 0.15 * Math.abs(mean), def.minDelta);
    const isBad = (x: number) => (def.bad === "low" ? mean - x : x - mean) > threshold;

    let run = 0;
    for (let i = rows.length - 1; i >= BASELINE_DAYS; i--) {
      const x = rows[i][key];
      if (x === undefined) continue; // sin dato ese día (p. ej. no recibió mensajes): no rompe ni suma
      if (!isBad(x)) break;
      run++;
    }
    const value = rows[rows.length - 1][key];
    statuses.push({
      key,
      mean,
      threshold,
      value,
      delta: value === undefined ? undefined : value - mean,
      run,
      series: rows.map((r) => r[key] ?? null),
    });
  }

  const offFor = (n: number) => statuses.filter((s) => s.run >= n).length;
  const level: Level = offFor(earlyDays + 2) >= 3 ? "high" : offFor(earlyDays) >= 1 ? "early" : "stable";
  return { level, statuses, flagged: offFor(earlyDays), dates, daysOfData: dates.length };
}

// Frases cortas para la IA y para la clínica (nunca se enseñan al mentor)
export function describe(a: Assessment, earlyDays = 2) {
  return a.statuses
    .filter((s) => s.run >= earlyDays)
    .map((s) => {
      const pct = s.delta !== undefined && s.mean ? Math.round((s.delta / s.mean) * 100) : 0;
      return `${SIGNALS[s.key].label}: ${pct > 0 ? "+" : ""}${pct}% vs personal baseline, ${s.run} days in a row`;
    });
}

export function oneLine(a: Assessment, earlyDays = 2) {
  const off = a.statuses.filter((s) => s.run >= earlyDays).sort((x, y) => y.run - x.run);
  if (!off.length) return "";
  const names = off.slice(0, 3).map((s) => SIGNALS[s.key].label.toLowerCase());
  const list = names.length > 1 ? `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}` : names[0];
  return `${list[0].toUpperCase()}${list.slice(1)} off their usual for ${off[0].run} days.`;
}
