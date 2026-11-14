// Textos literales de la especificación v3, traducidos al inglés (decisión del equipo: el jurado es internacional).
// La razón que ve el mentor es SIEMPRE genérica y nunca contiene datos.
import type { Action } from "./engine.ts";

export type CatalogItem = {
  title: (mentee: string) => string;
  reason: string;
  message: (mentee: string) => string;
  plan: (mentor: string) => string;
  icon: string;
  direct: boolean;
  /** Cuándo es el plan, en minutos desde el inicio del día de la idea */
  when: (day: number, weekday: number) => { day: number; minute: number; label: string };
};

const WEEKDAY = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const at = (h: number, m = 0) => h * 60 + m;

export const CATALOG: Record<Action, CatalogItem> = {
  paseo_juntos: {
    title: () => "Suggest a walk tomorrow morning",
    reason: "A good moment for a plan together. It'll do you good too",
    message: (n) => `Hey ${n}, fancy a stroll tomorrow at 10? Half an hour, no rush`,
    plan: () => "20-minute walk",
    icon: "walk",
    direct: true,
    when: (d, wd) => ({ day: d + 1, minute: at(10), label: `Tomorrow, ${WEEKDAY[(wd + 1) % 7]}, 10:00` }),
  },
  actividad_con_sentido: {
    title: () => "Suggest doing something small together",
    reason: "Sometimes the small things help the most",
    message: () => "Would you come with me to the market on Saturday? You can help me choose",
    plan: (m) => `Going to the market with ${m}`,
    icon: "basket",
    direct: false,
    when: (d, wd) => {
      const add = (6 - wd + 7) % 7 || 7;
      return { day: d + add, minute: at(11), label: "Saturday, 11:00" };
    },
  },
  llamada_o_quedar: {
    title: (n) => `Call ${n} or meet up for a while today`,
    reason: "Today is a good day to hear your voice",
    message: () => "Shall I call you for a bit this afternoon? Whenever suits you",
    plan: (m) => `Call with ${m}`,
    icon: "phone",
    direct: true,
    when: (d) => ({ day: d, minute: at(19), label: "Today, 19:00" }),
  },
  ancla_manana: {
    title: () => "Suggest an early coffee",
    reason: "Starting the day with someone feels good",
    message: () => "Coffee tomorrow at 9 before the day gets going?",
    plan: (m) => `Coffee with ${m}`,
    icon: "cup",
    direct: false,
    when: (d) => ({ day: d + 1, minute: at(9), label: "Tomorrow, 9:00" }),
  },
  desconexion_nocturna: {
    title: () => "Suggest a shared unplugging challenge",
    reason: "A plan for the two of you",
    message: () => "This week I'm putting my phone away at 11pm. Want to join me?",
    plan: (m) => `Challenge with ${m}: phone away at 23:00`,
    icon: "moon",
    direct: false,
    when: (d) => ({ day: d, minute: at(23), label: "This week, 23:00" }),
  },
  calma_acompanada: {
    title: () => "Suggest a calm moment together",
    reason: "A shared moment of calm",
    message: () => "Shall we do a 5-minute guided breathing together tonight?",
    plan: (m) => `Guided breathing with ${m}`,
    icon: "breath",
    direct: false,
    when: (d) => ({ day: d, minute: at(21), label: "Today, 21:00" }),
  },
};

// Idea sin plan cuando la persona lleva 48 h en silencio (A1): no menciona datos
export const SHORT_NOTE = {
  title: (n: string) => `Send ${n} a short note`,
  reason: "A few words can mean a lot",
  message: (n: string) => `Hi ${n}, just thinking of you. No need to reply`,
};

export const NOTICE_TEXT = {
  V1: (mentee: string) => `Would you like to talk to ${mentee} today?`,
  V2: (mentor: string) => `${mentor} would like to talk to you`,
  V3: (mentor: string) => `Fancy sending ${mentor} a note? ${mentor} would love to hear from you`,
  V4: () => "Your clinic team will call you soon to see how you are",
  V4_LOCK: "Relevo: you have a notice",
  V5: (mentor: string) => `${mentor} would like to talk to you`,
  V7: () => "We haven't heard from you for a few days. All good?",
  V8: () => "Your ring hasn't synced. Could you check it when you can?",
  HELP_MENTOR: (mentee: string) => `${mentee} is asking you to write`,
};

// Prioridad cuando coinciden varias push el mismo día (sección 4.2)
export const PRIORITY = ["CRISIS", "V4", "V2", "V3", "V5", "V6", "V7", "V8", "IDEA"] as const;

// Palabras que bloquean una tarjeta redactada por la IA (sección 10.4)
export const FORBIDDEN = /\b(diagnos\w*|medicat\w*|medicine|dose|dosage|relapse\w*|depress\w*|disorder|symptom\w*|psychiatr\w*)\b/i;

export const COPILOT = {
  text: (mentee: string) =>
    `You've had several notes in a row about how badly you're both sleeping. Try validating how ${mentee} feels and suggesting something small.`,
  example: "I get it, the same happened to me. How about we go down for a coffee at 9 tomorrow?",
};

export const LEVEL_LABEL = ["Stable", "Early signs", "High risk", "Severe"] as const;
