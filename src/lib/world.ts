// Estado compartido de la app: lo ven a la vez el móvil de Laura, el de Mikko, la clínica y la sala de control.
import { BASELINE_DAYS, SEED_CHAT, TOTAL_DAYS, generateDays, type ChatMsg } from "./data";
import { CATALOG, analyse, type ActionKey, type Level, type Suggestion } from "./engine";

export type Alert = "early" | "high";

export type World = {
  rev: number; // sube con cada cambio, para no pisar datos nuevos con viejos
  day: number; // 0 = día 1
  actionDay: number | null; // día en que Mikko actuó por primera vez
  sentAction: ActionKey | null;
  sentFor: Alert[];
  dismissed: Alert[];
  suggestions: Partial<Record<Alert, Suggestion>>;
  chat: ChatMsg[]; // mensajes nuevos (los de ejemplo están en SEED_CHAT)
  crisis: boolean;
  crisisHandled: boolean;
};

export type Action =
  | { type: "nextDay" }
  | { type: "restart" }
  | { type: "send"; text: string } // Mikko envía la acción sugerida
  | { type: "dismiss" }
  | { type: "answer"; yes: boolean } // Laura responde a un plan
  | { type: "chat"; from: "mentor" | "pupil"; text: string }
  | { type: "help" }
  | { type: "handled" };

export function newWorld(rev = 0): World {
  return {
    rev,
    day: BASELINE_DAYS, // empezamos el día 8, con la línea base ya aprendida
    actionDay: null,
    sentAction: null,
    sentFor: [],
    dismissed: [],
    suggestions: {},
    chat: [],
    crisis: false,
    crisisHandled: false,
  };
}

// Todo lo que se calcula a partir del estado (igual en servidor y navegador)
export function derive(w: World) {
  const days = generateDays(w.actionDay);
  const levels = days.map((_, i) => analyse(days, i).level);
  const { statuses } = analyse(days, w.day);
  const level: Level = w.crisis ? "crisis" : levels[w.day];
  const alert: Alert | null = level === "early" || level === "high" ? level : null;
  const learned =
    w.actionDay !== null && w.day > w.actionDay && levels[w.day] === "stable" && w.sentAction ? [CATALOG[w.sentAction]] : [];
  const chat = [...SEED_CHAT, ...w.chat];
  const last = w.chat[w.chat.length - 1];
  const pendingPlan = !!last && last.from === "mentor" && !!last.plan && last.day === w.day + 1;
  const suggestion = alert ? w.suggestions[alert] : undefined;
  const showCard = !!alert && !!suggestion && !w.crisis && !w.sentFor.includes(alert) && !w.dismissed.includes(alert);
  return { days, levels, statuses, level, alert, learned, chat, pendingPlan, suggestion, showCard };
}
export type View = ReturnType<typeof derive>;

const clean = (t: string) => t.trim().slice(0, 500);

export function reduce(w: World, a: Action): World {
  const next = { ...w, rev: w.rev + 1 };
  const today = w.day + 1;
  switch (a.type) {
    case "nextDay":
      return w.day >= TOTAL_DAYS - 1 ? w : { ...next, day: w.day + 1 };
    case "restart":
      return newWorld(w.rev + 1);
    case "send": {
      const { alert, suggestion } = derive(w);
      if (!alert || !suggestion) return w;
      const text = clean(a.text) || suggestion.message;
      return {
        ...next,
        chat: [...w.chat, { day: today, from: "mentor", text, plan: true }],
        sentFor: [...w.sentFor, alert],
        actionDay: w.actionDay ?? w.day,
        sentAction: w.sentAction ?? suggestion.action,
      };
    }
    case "dismiss": {
      const { alert } = derive(w);
      return alert ? { ...next, dismissed: [...w.dismissed, alert] } : w;
    }
    case "answer":
      return {
        ...next,
        chat: [
          ...w.chat,
          { day: today, from: "pupil", text: a.yes ? "Okay, yes. That actually sounds nice." : "Not today, but thank you for asking." },
        ],
      };
    case "chat": {
      const text = clean(a.text);
      return text ? { ...next, chat: [...w.chat, { day: today, from: a.from, text }] } : w;
    }
    case "help":
      return { ...next, crisis: true, crisisHandled: false };
    case "handled":
      return { ...next, crisisHandled: true };
  }
}
