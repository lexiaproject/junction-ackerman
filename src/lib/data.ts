// MOCK: todos los datos de sensores de este archivo son simulados.
// En la versión real vendrían del móvil (y opcionalmente de un reloj/anillo) del pupilo.

export type SignalKey = "sleep" | "steps" | "outings" | "nightScreen" | "hrv" | "replies";
export type DayData = Record<SignalKey, number>;

export const TOTAL_DAYS = 14;
export const BASELINE_DAYS = 7; // la primera semana sirve como "línea base" personal

export const PUPIL = "Laura";
export const MENTOR = "Mikko";

export const SIGNALS: Record<
  SignalKey,
  { label: string; unit: string; badWhen: "low" | "high"; source: string; inApp?: boolean; digits: number }
> = {
  sleep: { label: "Sleep", unit: "h", badWhen: "low", source: "Phone, night use", digits: 1 },
  steps: { label: "Steps", unit: "", badWhen: "low", source: "Phone", digits: 0 },
  outings: { label: "Times out of home", unit: "", badWhen: "low", source: "Phone, location", digits: 0 },
  nightScreen: { label: "Screen after midnight", unit: "min", badWhen: "high", source: "Phone", digits: 0 },
  hrv: { label: "Heart rate variability", unit: "ms", badWhen: "low", source: "Ring, optional", digits: 0 },
  replies: { label: "Replies to mentor", unit: "%", badWhen: "low", source: "This app", inApp: true, digits: 0 },
};

export const SIGNAL_KEYS = Object.keys(SIGNALS) as SignalKey[];

// Cómo está Laura en una semana normal
const USUAL: DayData = { sleep: 7.4, steps: 7200, outings: 2, nightScreen: 15, hrv: 48, replies: 90 };
// Cuánto cambia cada señal en el peor momento de la recaída
const WORST: DayData = { sleep: -2.2, steps: -5000, outings: -1.8, nightScreen: 70, hrv: -14, replies: -65 };
const JITTER: DayData = { sleep: 0.3, steps: 600, outings: 0.4, nightScreen: 6, hrv: 3, replies: 5 };
// De 0 (normal) a 1 (peor): la segunda semana empeora poco a poco
const DECLINE = [0, 0, 0, 0, 0, 0, 0, 0.25, 0.45, 0.65, 0.85, 1, 1, 1];

// Ruido determinista (siempre igual) para que parezcan datos reales
function noise(day: number, k: number) {
  const x = Math.sin(day * 12.9898 + k * 78.233) * 43758.5453;
  return (x - Math.floor(x)) * 2 - 1;
}

// actionDay: día (0 = día 1) en que el mentor actuó. Desde el día siguiente Laura mejora.
export function generateDays(actionDay: number | null): DayData[] {
  return Array.from({ length: TOTAL_DAYS }, (_, d) => {
    let decline = DECLINE[d];
    if (actionDay !== null && d > actionDay) decline *= Math.max(0, 1 - 0.5 * (d - actionDay));
    const day = {} as DayData;
    SIGNAL_KEYS.forEach((key, k) => {
      const v = USUAL[key] + WORST[key] * decline + JITTER[key] * noise(d, k);
      // Redondeo: así servidor y navegador obtienen exactamente los mismos números
      day[key] = key === "outings" ? Math.max(0, Math.round(v)) : Math.max(0, Math.round(v * 100) / 100);
    });
    day.replies = Math.min(100, day.replies);
    return day;
  });
}

// MOCK: conversación de ejemplo de la primera semana
export type ChatMsg = { day: number; from: "mentor" | "pupil"; text: string; plan?: boolean };
export const SEED_CHAT: ChatMsg[] = [
  { day: 1, from: "mentor", text: "Hi Laura, I'm Mikko. I finished my TMS in September. Happy to share what helped me." },
  { day: 1, from: "pupil", text: "Hi! Nice to meet you. Honestly a bit nervous about the sessions." },
  { day: 2, from: "mentor", text: "Totally normal. The first week felt strange to me too. It gets routine fast." },
  { day: 4, from: "pupil", text: "Session 4 done. Tired but okay." },
  { day: 4, from: "mentor", text: "That's four more than last week 🙂 Proud of you." },
  { day: 6, from: "mentor", text: "Coffee at Kaisa library on Saturday?" , plan: true },
  { day: 6, from: "pupil", text: "Sounds good!" },
];
