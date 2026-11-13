// Motor de patrones (real): compara a cada persona consigo misma.
import { BASELINE_DAYS, SIGNALS, SIGNAL_KEYS, PUPIL, type DayData, type SignalKey } from "./data";

export type Level = "learning" | "stable" | "early" | "high" | "crisis";

export type SignalStatus = {
  key: SignalKey;
  mean: number;
  threshold: number;
  value: number;
  delta: number; // valor de hoy menos lo habitual
  run: number; // días seguidos fuera de lo habitual (en la mala dirección)
};

export function analyse(days: DayData[], dayIndex: number) {
  const statuses: SignalStatus[] = SIGNAL_KEYS.map((key) => {
    const base = days.slice(0, BASELINE_DAYS).map((d) => d[key]);
    const mean = base.reduce((a, b) => a + b, 0) / base.length;
    const std = Math.sqrt(base.reduce((a, b) => a + (b - mean) ** 2, 0) / base.length);
    // Un cambio cuenta si es claramente mayor que la variación normal de esa persona
    const threshold = Math.max(2 * std, 0.15 * Math.abs(mean));
    const bad = (v: number) => (SIGNALS[key].badWhen === "low" ? mean - v : v - mean) > threshold;
    let run = 0;
    for (let i = dayIndex; i >= BASELINE_DAYS && bad(days[i][key]); i--) run++;
    const value = days[dayIndex][key];
    return { key, mean, threshold, value, delta: value - mean, run };
  });

  let level: Level = "stable";
  if (dayIndex < BASELINE_DAYS) level = "learning";
  else if (statuses.filter((s) => s.run >= 4).length >= 3) level = "high"; // varias señales, varios días
  else if (statuses.some((s) => s.run >= 2)) level = "early"; // no un día malo suelto: al menos 2 seguidos

  return { statuses, level };
}

// Catálogo validado de acciones que el mentor puede proponer
export const CATALOG = {
  walk: "A short walk together",
  coffee: "A coffee together",
  call: "A short call",
  sleep_routine: "Share what helped your sleep",
  shared_activity: "Something to do together",
  hello: "A short hello",
} as const;
export type ActionKey = keyof typeof CATALOG;

export type Suggestion = {
  action: ActionKey;
  headline: string; // lo que lee el mentor (sin datos de salud)
  message: string; // mensaje de ejemplo que el mentor puede editar
  explanation: string; // por qué, solo para la clínica / la demo
  source: "claude" | "fallback";
};

// Texto que se manda a la IA: solo cambios resumidos, sin identificar a nadie
export function describeChanges(statuses: SignalStatus[]) {
  return statuses
    .filter((s) => s.run > 0)
    .map((s) => {
      const sig = SIGNALS[s.key];
      const pct = Math.round((s.delta / s.mean) * 100);
      return `${sig.label}: ${pct > 0 ? "+" : ""}${pct}% vs personal baseline, ${s.run} day(s) in a row`;
    });
}

// MOCK: respuesta de reserva si Claude no está disponible (sin clave, sin red o error)
export function fallbackSuggestion(level: Level): Suggestion {
  if (level === "high")
    return {
      action: "call",
      headline: `${PUPIL} could use more contact right now`,
      message: "Hey, I've been thinking of you. Can I call you this evening, just ten minutes?",
      explanation:
        "Several signals have stayed off Laura's own baseline for four days or more. A direct, personal call is the next step; the mentor should also mention the clinic.",
      source: "fallback",
    };
  return {
    action: "walk",
    headline: `${PUPIL} might be having a quieter week`,
    message: "I'm heading out for a walk tomorrow at 10. Want to join me for 20 minutes? No pressure.",
    explanation:
      "Activity, late-night screen time and replies have drifted from Laura's baseline for two days. A small outdoor plan with someone is the easiest thing to say yes to.",
    source: "fallback",
  };
}
