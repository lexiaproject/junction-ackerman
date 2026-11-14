// Guion del anuncio de Relevo (50 s). Todo el texto, los tiempos, los colores y la música están aquí.
// Tiempos en segundos. A 120 BPM cada segundo entero cae en un beat: los cortes van a tiempo con la música.
// Palabras clave: "teal" (lo que Relevo aporta) o "amber" (el problema / la alerta). Nada de rojo.

export const COLORS = {
  bg: "#F5F6F3", // fondo de Relevo
  ink: "#16211C", // texto
  muted: "#55635D",
  teal: "#0E6B5C", // acento de Relevo
  tealDeep: "#0A5247",
  sage: "#E7F0EC", // "bien"
  amber: "#B45309", // alerta ("Early signs" en la app)
  bezel: "#18211E",
};

export const MUSIC = {
  src: "music.wav", // ruta dentro de video/public; cámbiala por otra pista si queréis
  bpm: 120, // si cambiáis de pista, poned aquí sus BPM y ajustad los tiempos a sus beats
  volume: 0.85,
  fadeOutSec: 3,
};

export type Accent = "teal" | "amber";
export type Shot = {
  from: number;
  to: number;
  img: string; // public/shots/<img>.png
  device?: "phone" | "browser";
  focus: string; // caja (de shots.json) a la que va la cámara
  s0?: number; // escala inicial (px de pantalla por px CSS de la app)
  s1?: number; // escala final (≈ s0 × 1,5): el texto de la app llega a ≥ 40 px
  tap?: { box: string; at: number; after: string }; // pulsación: a qué caja, cuándo y qué captura queda después
  pan?: { from: { x: number; y: number }; to: { x: number; y: number } }; // barrido de cámara (px CSS) en lugar de "focus"
};
export type Scene =
  | { kind: "text"; from: number; to: number; text: string; accents?: Record<string, Accent>; size?: number; slow?: boolean }
  | { kind: "logo"; from: number; to: number; sub: string }
  | { kind: "ui"; from: number; to: number; text: string; accents?: Record<string, Accent>; shots: Shot[] };

export const SCENES: Scene[] = [
  { kind: "text", from: 0, to: 3, text: "TMS works.", accents: { "works.": "teal" } },
  { kind: "text", from: 3, to: 6, text: "Then the treatment ends.", accents: { "ends.": "amber" } },
  { kind: "text", from: 6, to: 9, text: "The months after are fragile.", accents: { "fragile.": "amber" } },
  { kind: "text", from: 9, to: 12, text: "Too often, they face them alone.", accents: { "alone.": "amber" }, slow: true },
  { kind: "logo", from: 12, to: 14, sub: "Recovery that passes forward." },
  {
    kind: "ui", from: 14, to: 19, text: "Someone who's been there.", accents: { "been": "teal", "there.": "teal" },
    shots: [{ from: 14, to: 19, img: "luis-profile", focus: "helped" }],
  },
  {
    kind: "ui", from: 19, to: 23, text: "Company, not responsibility.", accents: { "not": "teal", "responsibility.": "teal" },
    shots: [{ from: 19, to: 23, img: "pablo-role", focus: "notOnYou" }],
  },
  {
    kind: "ui", from: 23, to: 27, text: "Help finding the words.", accents: { "words.": "teal" },
    shots: [{ from: 23, to: 27, img: "pablo-ideas", focus: "idea" }],
  },
  {
    kind: "ui", from: 27, to: 32, text: "A nudge, never an alarm.", accents: { "nudge,": "teal" },
    shots: [
      { from: 27, to: 30, img: "pablo-ask", focus: "card", tap: { box: "yes", at: 28.5, after: "pablo-ask-yes" } },
      { from: 30, to: 32, img: "luis-v2", focus: "notice" },
    ],
  },
  {
    kind: "ui", from: 32, to: 36, text: "One tap back to each other.", accents: { "each": "teal", "other.": "teal" },
    shots: [{ from: 32, to: 36, img: "luis-plan", focus: "plan", tap: { box: "in", at: 33.5, after: "luis-plan-in" } }],
  },
  {
    kind: "ui", from: 36, to: 40, text: "Companions are cared for too.", accents: { "cared": "teal", "for": "teal" },
    shots: [{ from: 36, to: 40, img: "marta-ask", focus: "card" }],
  },
  {
    kind: "ui", from: 40, to: 44, text: "The clinic stays in charge.", accents: { "in": "teal", "charge.": "teal" },
    shots: [
      { from: 40, to: 42, img: "luis-anna", focus: "notice" },
      { from: 42, to: 44, img: "clinic-call", device: "browser", focus: "row", s0: 2.75, s1: 3, pan: { from: { x: 560, y: 318 }, to: { x: 1150, y: 318 } } },
    ],
  },
  {
    kind: "text", from: 44, to: 48, size: 84,
    text: "The first sign you need help is when you stop being able to give it.", accents: { "give": "teal", "it.": "teal" },
  },
  { kind: "logo", from: 48, to: 50, sub: "Team Ackerman Family · Junction 2026" },
];

export const DURATION = 50;
export const FPS = 60;
