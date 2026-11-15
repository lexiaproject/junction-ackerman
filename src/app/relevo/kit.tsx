"use client";
// Piezas comunes de Relevo: datos en vivo, iconos de trazo, avatares, notas de voz con onda, grabadora y hojas.
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { crisisFlag } from "@/lib/relevo/engine";
import { hideNames, revealNames } from "@/lib/relevo/pseudo";

/** La pantalla de ayuda de un teléfono se abre cuando su propio dueño escribe una frase de la lista fija (K-15). */
export function useLocalHelp(as: string, open: () => void) {
  useEffect(() => {
    const on = (e: Event) => (e as CustomEvent<{ as: string }>).detail?.as === as && open();
    window.addEventListener("relevo:help", on);
    return () => window.removeEventListener("relevo:help", on);
  }, [as, open]);
}

/* ---------- Mundo de la demo: uno por navegador; ?w=ID para compartirlo entre teléfonos ---------- */
export function useWid() {
  const [w, setW] = useState<string | null>(null);
  useEffect(() => {
    let id = new URLSearchParams(window.location.search).get("w");
    try {
      if (id && /^[a-z0-9]{6,24}$/i.test(id)) localStorage.setItem("relevo:w", id);
      else id = localStorage.getItem("relevo:w");
      if (!id) {
        id = Math.random().toString(36).slice(2, 12);
        localStorage.setItem("relevo:w", id);
      }
    } catch {
      id ??= Math.random().toString(36).slice(2, 12);
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- el id solo existe en el navegador
    setW(id);
  }, []);
  return w;
}
export const changed = () => window.dispatchEvent(new Event("relevo:changed"));

export async function act(w: string, as: string, type: string, p: Record<string, unknown> = {}) {
  const r = await fetch("/api/relevo/act", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ w, as, type, p }) });
  const data = await r.json().catch(() => ({}));
  changed();
  if (!r.ok) throw new Error(data.error ?? "Something went wrong");
  return data;
}

/** Datos en vivo: se recargan tras cualquier acción, al volver a la pestaña y cada pocos segundos (para dos teléfonos). */
export function useView<T>(url: string | null, pollMs = 4000) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState("");
  const [tick, setTick] = useState(0);
  const reload = useCallback(() => setTick((t) => t + 1), []);
  useEffect(() => {
    if (!url) return;
    let alive = true;
    let last = 0; // número de la petición más reciente: una respuesta vieja que llega tarde no pisa a la nueva
    let applied = 0; // número de la última respuesta aplicada: nunca se pinta una más vieja
    let lastText = ""; // última respuesta aplicada: si llega igual, no se vuelve a pintar
    const load = async () => {
      const my = ++last;
      try {
        const r = await fetch(url, { cache: "no-store" });
        const txt = await r.text();
        let j;
        try {
          j = JSON.parse(txt);
        } catch {
          throw new Error(`Error ${r.status}`);
        }
        if (!r.ok) throw new Error(j.error ?? `Error ${r.status}`);
        if (alive && my > applied) {
          applied = my;
          setError("");
          if (txt !== lastText) {
            lastText = txt;
            setData(j);
          }
        }
      } catch (e) {
        if (alive && my > applied) setError((e as Error).message || "Network error");
      }
    };
    load();
    const on = () => load();
    window.addEventListener("relevo:changed", on);
    const vis = () => !document.hidden && load();
    document.addEventListener("visibilitychange", vis);
    const id = setInterval(() => !document.hidden && load(), pollMs);
    return () => {
      alive = false;
      window.removeEventListener("relevo:changed", on);
      document.removeEventListener("visibilitychange", vis);
      clearInterval(id);
    };
  }, [url, pollMs, tick]);
  return { data, error, reload };
}

/* ---------- Iconos de trazo (2 px), nunca emojis ---------- */
const PATHS: Record<string, string> = {
  heart: "M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10z",
  play: "M8 5.5v13l10-6.5z",
  pause: "M8 5v14M16 5v14",
  mic: "M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3zM5 11a7 7 0 0 0 14 0M12 18v3",
  walk: "M13 4.5a1.5 1.5 0 1 0 0-.01M10 21l2-6 3 3v3M9 12l2-4 3 1 2 3M7.5 14l1.5-2",
  basket: "M4 9h16l-1.5 10h-13zM8 9l3-5M16 9l-3-5M9 13v3M15 13v3",
  phone: "M6 3h3l2 5-2.5 1.5a11 11 0 0 0 6 6L16 13l5 2v3a2 2 0 0 1-2 2A16 16 0 0 1 4 5a2 2 0 0 1 2-2z",
  cup: "M5 8h11v5a5 5 0 0 1-10 0zM16 9h1.5a2.5 2.5 0 0 1 0 5H16M8 3v2M11 3v2",
  moon: "M19 14A8 8 0 0 1 10 5a8 8 0 1 0 9 9z",
  breath: "M4 10h10a3 3 0 1 0-3-3M4 14h13a3 3 0 1 1-3 3",
  note: "M5 4h14v12H9l-4 4z",
  lock: "M7 11V8a5 5 0 0 1 10 0v3M5 11h14v9H5z",
  chevron: "M9 6l6 6-6 6",
  back: "M15 6l-6 6 6 6",
  today: "M4 11 12 4l8 7v9h-5v-6H9v6H4z",
  chat: "M4 5h16v11H9l-5 4z",
  chain: "M9 12h6M7 8a4 4 0 0 0 0 8h1M17 8a4 4 0 0 1 0 8h-1",
  settings: "M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM19 12a7 7 0 0 0-.1-1.2l2-1.6-2-3.4-2.4 1a7 7 0 0 0-2-1.2L14 3h-4l-.5 2.6a7 7 0 0 0-2 1.2l-2.4-1-2 3.4 2 1.6A7 7 0 0 0 5 12c0 .4 0 .8.1 1.2l-2 1.6 2 3.4 2.4-1a7 7 0 0 0 2 1.2L10 21h4l.5-2.6a7 7 0 0 0 2-1.2l2.4 1 2-3.4-2-1.6c.1-.4.1-.8.1-1.2z",
  ring: "M12 5a7 7 0 1 0 0 14 7 7 0 0 0 0-14zm0 3.5a3.5 3.5 0 1 1 0 7 3.5 3.5 0 0 1 0-7",
  android: "M7 10h10v8H7zM9 6l-1-2M15 6l1-2M7 10a5 5 0 0 1 10 0M10 8h.01M14 8h.01",
  house: "M4 11 12 4l8 7M6 9.5V20h12V9.5M10 20v-5h4v5",
  calendar: "M5 6h14v14H5zM5 10h14M9 3v4M15 3v4",
  clock: "M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16zM12 8v4l3 2",
  check: "M5 12.5l4.5 4.5L19 7.5",
  x: "M6 6l12 12M18 6 6 18",
  shield: "M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z",
  download: "M12 4v11M7 10l5 5 5-5M5 20h14",
  trash: "M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13",
  arrow: "M5 12h14M13 6l6 6-6 6",
  alert: "M12 4 3 20h18zM12 10v4M12 17h.01",
  users: "M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 6.5M18 14a6 6 0 0 1 3.5 6",
  sliders: "M4 7h10M18 7h2M4 17h4M12 17h8M16 5v4M10 15v4",
  list: "M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01",
  panel: "M4 4h16v16H4zM9 4v16",
  bulb: "M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2V17h5v-1.1c0-.8.4-1.5 1-2A6 6 0 0 0 12 3z",
  sun: "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.4 1.4M17.6 17.6 19 19M5 19l1.4-1.4M17.6 6.4 19 5",
  text: "M5 6h14M5 12h14M5 18h9",
  undo: "M9 7 4 12l5 5M4 12h11a5 5 0 0 1 0 10h-2",
  plus: "M12 5v14M5 12h14",
  pin: "M12 21s-6-5.5-6-11a6 6 0 0 1 12 0c0 5.5-6 11-6 11zM12 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4",
};
export function Icon({ name, size = 20, className = "", filled = false }: { name: string; size?: number; className?: string; filled?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={`shrink-0 ${className}`} fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={PATHS[name] ?? PATHS.note} />
    </svg>
  );
}

/* ---------- Avatares: retratos ilustrados (personajes ficticios de la demo); si no hay retrato, la inicial ---------- */
const HUE: Record<string, [string, string]> = {
  Luis: ["#dbe8f6", "#24466e"], Pablo: ["#d9efe7", "#0e5a4c"], Marta: ["#f6e3d6", "#7a3a14"], Sara: ["#ece3f5", "#4c2f72"], Anna: ["#e3f1ef", "#1f5c57"],
  Clinic: ["#e6e8e4", "#3b4642"], Helmi: ["#f3e9cf", "#6b4e0d"], Eero: ["#dfe9ee", "#2a4c5c"], Sanna: ["#e8f0dc", "#3e5a1d"], Juho: ["#f1dfe3", "#6b2737"], Noora: ["#e0ecf1", "#22566a"],
};
type Look = { skin: string; hair: string; style: "short" | "beard" | "long" | "bob" | "bun" | "curly"; shirt: string; glasses?: boolean };
const LOOKS: Record<string, Look> = {
  Luis: { skin: "#e9b892", hair: "#2b2018", style: "short", shirt: "#3b6ea8" },
  Pablo: { skin: "#d39c76", hair: "#3a2a1e", style: "beard", shirt: "#0e6b5c" },
  Marta: { skin: "#f1c9aa", hair: "#8a4a2a", style: "long", shirt: "#b45a2a", glasses: true },
  Sara: { skin: "#c08a66", hair: "#1d1512", style: "bun", shirt: "#6b4c9a" },
  Anna: { skin: "#f3d2b8", hair: "#cfa660", style: "bob", shirt: "#3f8f88" },
  Helmi: { skin: "#f0cdb0", hair: "#b9b4ad", style: "bun", shirt: "#a07a1c", glasses: true },
  Eero: { skin: "#f2cfb3", hair: "#d8b878", style: "short", shirt: "#2a4c5c" },
  Sanna: { skin: "#f4d3bb", hair: "#a8452a", style: "long", shirt: "#4f6f2a" },
  Juho: { skin: "#e8bf9c", hair: "#5a3d26", style: "beard", shirt: "#7a2f42", glasses: true },
  Noora: { skin: "#b97f5c", hair: "#1f1712", style: "curly", shirt: "#22566a" },
};
function Face({ name, look, bg }: { name: string; look: Look; bg: string }) {
  const { skin, hair, style, shirt, glasses } = look;
  const clip = `rv-face-${name}-${useId().replace(/[^a-z0-9]/gi, "")}`;
  const longBack = style === "long" || style === "bob";
  return (
    <svg viewBox="0 0 64 64" width="100%" height="100%">
      <defs><clipPath id={clip}><circle cx="32" cy="32" r="32" /></clipPath></defs>
      <g clipPath={`url(#${clip})`}>
        <rect width="64" height="64" fill={bg} />
        {longBack && <path d={style === "long" ? "M17 30c0-12 6.5-19 15-19s15 7 15 19v22H17z" : "M18 30c0-11 6-18 14-18s14 7 14 18v10H18z"} fill={hair} />}
        <path d="M9 64c1.5-11 10.5-17 23-17s21.5 6 23 17z" fill={shirt} />
        <rect x="27.5" y="37" width="9" height="11" rx="4" fill={skin} />
        <circle cx="21.3" cy="30.5" r="2.4" fill={skin} />
        <circle cx="42.7" cy="30.5" r="2.4" fill={skin} />
        <ellipse cx="32" cy="29.5" rx="10.8" ry="12.3" fill={skin} />
        {(style === "short" || style === "beard") && <path d="M21 28c-.8-8.5 4.3-14 11-14s11.8 5.5 11 14c-1.8-4.4-5.6-7-11-7s-9.2 2.6-11 7z" fill={hair} />}
        {(style === "long" || style === "bob" || style === "bun") && <path d="M20.5 29.5c-1-9.5 4.4-15.5 11.5-15.5s12.5 6 11.5 15.5c-2.8-5.3-6.6-8.4-11.5-8.9-4.9.5-8.7 3.6-11.5 8.9z" fill={hair} />}
        {style === "bun" && <circle cx="32" cy="13" r="5" fill={hair} />}
        {style === "curly" && [21.5, 25.5, 29.5, 33.5, 37.5, 41.5, 23.5, 32, 40.5].map((x, i) => <circle key={i} cx={x} cy={i < 6 ? 21 : 17} r="4.6" fill={hair} />)}
        {style === "beard" && <path d="M21.6 31.5c.9 7.6 4.9 11.6 10.4 11.6s9.5-4 10.4-11.6c-1.2 2.4-2.9 3.8-4.6 3.8-1.6-1.3-3.6-1.9-5.8-1.9s-4.2.6-5.8 1.9c-1.7 0-3.4-1.4-4.6-3.8z" fill={hair} />}
        <circle cx="27.6" cy="30" r="1.3" fill="#1b2420" />
        <circle cx="36.4" cy="30" r="1.3" fill="#1b2420" />
        <circle cx="25" cy="34.2" r="2" fill="#e0806a" opacity="0.18" />
        <circle cx="39" cy="34.2" r="2" fill="#e0806a" opacity="0.18" />
        <path d="M28.7 35.6q3.3 2.4 6.6 0" stroke={style === "beard" ? "#f6e6d8" : "#1b2420"} strokeWidth="1.4" fill="none" strokeLinecap="round" />
        {glasses && <g stroke="#1b2420" strokeWidth="1.1" fill="none"><circle cx="27.6" cy="30" r="3.5" /><circle cx="36.4" cy="30" r="3.5" /><path d="M31.1 30h1.8" /></g>}
      </g>
    </svg>
  );
}
// Fotos de perfil (fotos de banco con licencia del equipo; ver README). Quien no tiene foto lleva su retrato ilustrado.
const PHOTOS: Record<string, string> = {
  Luis: "/relevo/people/luis.jpg", Pablo: "/relevo/people/pablo.jpg", Marta: "/relevo/people/marta.jpg", Anna: "/relevo/people/anna.jpg",
  Sara: "/relevo/people/sara.jpg", Juho: "/relevo/people/juho.jpg", Eero: "/relevo/people/eero.jpg", Sanna: "/relevo/people/sanna.jpg",
  Helmi: "/relevo/people/helmi.jpg",
};
export function Avatar({ name, size = 40, ring = false }: { name: string; size?: number; ring?: boolean }) {
  const [bg, fg] = HUE[name] ?? ["#e6e8e4", "#3b4642"];
  const look = LOOKS[name];
  const photo = PHOTOS[name];
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full font-semibold"
      style={{ width: size, height: size, background: bg, color: fg, fontSize: size * 0.4, fontFamily: "var(--rv-display)", boxShadow: ring ? "0 0 0 3px #fff, 0 0 0 4.5px " + fg + "33" : undefined }}
      aria-hidden
    >
      {photo ? (
        // eslint-disable-next-line @next/next/no-img-element -- avatar pequeño y fijo; no compensa next/image
        <img src={photo} alt="" width={size} height={size} className="h-full w-full object-cover" draggable={false} />
      ) : look ? <Face name={name} look={look} bg={bg} /> : name.slice(0, 1)}
    </span>
  );
}

/* ---------- Onda de una nota de voz (determinista a partir del id) ---------- */
function bars(seed: string, n: number) {
  let h = 2166136261;
  for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return Array.from({ length: n }, (_, i) => {
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    const r = ((h >>> 0) % 1000) / 1000;
    const env = Math.sin((Math.PI * (i + 0.5)) / n) * 0.6 + 0.4;
    return Math.max(0.16, Math.min(1, env * (0.45 + r * 0.7)));
  });
}
export function Waveform({ seed, progress = 0, n = 32, color = "currentColor", height = 28 }: { seed: string; progress?: number; n?: number; color?: string; height?: number }) {
  const b = bars(seed, n);
  return (
    <svg viewBox={`0 0 ${n * 4} ${height}`} className="min-w-0 flex-1" style={{ height }} preserveAspectRatio="none" aria-hidden>
      {b.map((v, i) => (
        <rect key={i} x={i * 4 + 0.6} y={(height - v * height) / 2} width={2.4} height={v * height} rx={1.2} fill={color} opacity={i / n < progress ? 1 : 0.32} />
      ))}
    </svg>
  );
}

/* ---------- Reproducir una nota: audio real si lo hay; si es del guion, voz sintética (MOCK) ---------- */
let current: { stop: () => void } | null = null;
export function usePlayer(w: string | null) {
  const [playing, setPlaying] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const stop = useCallback(() => {
    if (timer.current) clearInterval(timer.current);
    setPlaying(null);
    setProgress(0);
  }, []);
  useEffect(() => () => current?.stop(), []);
  const play = useCallback(
    (note: { id: string; text: string; duration: number; audio: boolean }) => {
      current?.stop();
      if (playing === note.id) return;
      setPlaying(note.id);
      setProgress(0);
      const start = Date.now();
      const dur = Math.max(2, note.duration) * 1000;
      if (note.audio && w) {
        const a = new Audio(`/api/relevo/audio?w=${w}&id=${note.id}`);
        a.ontimeupdate = () => setProgress(a.duration ? a.currentTime / a.duration : 0);
        a.onended = stop;
        a.onerror = stop;
        a.play().catch(stop);
        current = { stop: () => { a.pause(); stop(); } };
        return;
      }
      // MOCK: las notas del guion no tienen audio grabado; se leen con la voz del navegador
      const synth = typeof window !== "undefined" ? window.speechSynthesis : null;
      if (synth) {
        const u = new SpeechSynthesisUtterance(revealNames(note.text));
        u.lang = "en-GB";
        u.rate = 1;
        u.onend = stop;
        synth.cancel();
        synth.speak(u);
      }
      timer.current = setInterval(() => {
        const p = (Date.now() - start) / dur;
        if (p >= 1 && !synth) stop();
        else setProgress(Math.min(0.98, p));
      }, 80);
      current = { stop: () => { synth?.cancel(); stop(); } };
    },
    [playing, w, stop],
  );
  return { playing, progress, play };
}

export const fmtDur = (s: number) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}`;

/* ---------- Burbuja / tarjeta de nota de voz (con transcripción plegable) ---------- */
export type NoteV = { id: string; from: string; fromName: string; mine: boolean; when: string; duration: number; text: string; audio: boolean; written?: boolean; kind?: string; withheld?: boolean; thanked?: boolean };
/** onThanks: si se pasa, una nota recibida lleva un "Thanks" de un toque (un gesto sin tener que grabar nada). */
export function VoiceNote({ note, player, bubble = false, onThanks }: { note: NoteV; player: ReturnType<typeof usePlayer>; bubble?: boolean; onThanks?: () => void }) {
  const [open, setOpen] = useState(false);
  const [thanked, setThanked] = useState(false);
  const canThank = !!onThanks && !note.mine;
  const isThanked = thanked || !!note.thanked;
  // K-14: nota retenida para la clínica: sin reproducir ni enseñar su contenido
  if (note.withheld)
    return (
      <div className={bubble ? "max-w-[86%] self-start" : ""}>
        <div className={`${bubble ? "rounded-[20px] rounded-bl-md shadow-[0_0_0_1px_rgb(22_33_28/0.05)]" : ""} flex items-start gap-3 bg-white px-3 py-2.5`}>
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-rv-sage text-rv-teal"><Icon name="shield" size={18} /></span>
          <div className="min-w-0 pt-0.5">
            <p className="text-[14px] leading-snug">{note.text}</p>
            <p className="rv-muted mt-0.5 text-[12px]">{note.when}</p>
          </div>
        </div>
      </div>
    );
  const on = player.playing === note.id;
  const tone = note.mine ? "bg-rv-teal text-white" : "bg-white text-rv-ink";
  const shape = bubble ? `${tone} rounded-[20px] ${note.mine ? "rounded-br-md" : "rounded-bl-md shadow-[0_0_0_1px_rgb(22_33_28/0.05)]"}` : "";
  const meta = note.mine && bubble ? "text-white/90" : "rv-muted";
  const thanks = canThank && (isThanked ? (
    <span className="flex items-center gap-1 font-semibold text-rv-teal"><Icon name="heart" size={14} filled />Thanked</span>
  ) : (
    <button onClick={() => { setThanked(true); onThanks!(); }} className="-my-2 flex min-h-[36px] items-center gap-1 rounded-full px-2 font-semibold text-rv-teal hover:bg-rv-sage" aria-label={`Say thanks to ${note.fromName}`}>
      <Icon name="heart" size={14} />Thanks
    </button>
  ));
  // Mensaje escrito: se enseña como texto, sin reproductor
  if (note.written)
    return (
      <div className={bubble ? `max-w-[86%] ${note.mine ? "self-end" : "self-start"}` : ""}>
        <div className={`${shape} px-3.5 py-2.5`}>
          <p className="whitespace-pre-wrap text-[15px] leading-snug">{revealNames(note.text)}</p>
          <div className={`mt-1 flex items-center justify-end gap-2 text-[12px] ${meta}`}>
            {thanks}
            <span>{note.when}</span>
          </div>
        </div>
      </div>
    );
  return (
    <div className={bubble ? `max-w-[86%] ${note.mine ? "self-end" : "self-start"}` : ""}>
      <div className={`${bubble ? `${tone} rounded-[20px] ${note.mine ? "rounded-br-md" : "rounded-bl-md shadow-[0_0_0_1px_rgb(22_33_28/0.05)]"}` : ""} px-3 py-2.5`}>
        <div className="flex items-center gap-3">
          <button
            onClick={() => player.play(note)}
            aria-label={on ? "Pause" : `Play note from ${note.fromName}`}
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${note.mine && bubble ? "bg-white/20 text-white" : "bg-rv-teal text-white"}`}
          >
            <Icon name={on ? "pause" : "play"} size={18} filled={!on} />
          </button>
          <Waveform seed={note.id} progress={on ? player.progress : 0} color={note.mine && bubble ? "#fff" : "var(--color-rv-teal)"} />
          <span className={`rv-num text-[12.5px] ${note.mine && bubble ? "text-white/90" : "rv-muted"}`}>{fmtDur(note.duration)}</span>
        </div>
        <div className={`mt-1 flex items-center justify-between gap-3 text-[12px] ${note.mine && bubble ? "text-white/90" : "rv-muted"}`}>
          <button onClick={() => setOpen((o) => !o)} className="underline-offset-2 hover:underline" aria-expanded={open}>
            {open ? "Hide text" : "Show text"}
          </button>
          <span className="flex items-center gap-2">
            {canThank && (isThanked ? (
              <span className="flex items-center gap-1 font-semibold text-rv-teal"><Icon name="heart" size={14} filled />Thanked</span>
            ) : (
              <button onClick={() => { setThanked(true); onThanks!(); }} className="-my-2 flex min-h-[36px] items-center gap-1 rounded-full px-2 font-semibold text-rv-teal hover:bg-rv-sage" aria-label={`Say thanks to ${note.fromName}`}>
                <Icon name="heart" size={14} />Thanks
              </button>
            ))}
            <span>{note.when}</span>
          </span>
        </div>
        {open && <p className={`mt-1.5 text-[14px] leading-snug ${note.mine && bubble ? "text-white" : ""}`}>{revealNames(note.text)}</p>}
      </div>
    </div>
  );
}

/* ---------- Hoja inferior (dentro del teléfono, no de la ventana) ---------- */
// K-08: diálogo modal de verdad. Al abrirse el foco entra en el título (o en la hoja), Tab/Shift+Tab dan la vuelta dentro,
// Escape cierra SOLO esta hoja (se escucha en la propia hoja, no en window) y al cerrar el foco vuelve a donde estaba.
// Regla del propio teléfono: solo se toma el foco si estaba en <body> o dentro de la misma app; así, cuando la hoja de
// Luis se abre sola en la crisis de la demo, no se le quita el foco al presentador ("Next moment").
const FOCUSABLE = 'a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])';
export function Sheet({ onClose, children, label }: { onClose: () => void; children: React.ReactNode; label: string }) {
  const id = useId();
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const title = el.querySelector("h2"); // todas las hojas abren con su h2; si no hay, vale el aria-label
    if (title) {
      title.id = id;
      title.tabIndex = -1;
    }
    const prev = document.activeElement as HTMLElement | null;
    const scope = el.parentElement?.parentElement ?? document.body; // la app del teléfono (la hoja cuelga de su raíz)
    const embedded = !!el.closest("[data-rv-demo]"); // en la vista de demo, desde <body> el foco se queda con el presentador
    const take = prev && prev !== document.body ? scope.contains(prev) : !embedded;
    if (take) (title ?? el).focus({ preventScroll: true });
    return () => {
      const a = document.activeElement;
      if (take && prev?.isConnected && (!a || a === document.body || el.contains(a))) prev.focus({ preventScroll: true });
    };
    // Solo al montar: el sondeo redibuja cada pocos segundos y no debe mover el foco.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Escape") {
      e.stopPropagation();
      onClose();
      return;
    }
    if (e.key !== "Tab" || !box.current) return;
    const list = Array.from(box.current.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((n) => n.getClientRects().length > 0);
    if (!list.length) return;
    const first = list[0];
    const last = list[list.length - 1];
    const a = document.activeElement;
    if (e.shiftKey && (a === first || a === box.current)) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && a === last) {
      e.preventDefault();
      first.focus();
    }
  };
  return (
    <div className="absolute inset-0 z-40 flex items-end bg-[#16211c]/35" onClick={onClose}>
      <div
        ref={box}
        role="dialog"
        aria-modal="true"
        aria-labelledby={id}
        aria-label={label}
        tabIndex={-1}
        onKeyDown={onKeyDown}
        className="rv-sheet rv-scroll relative max-h-[92%] w-full overflow-y-auto rounded-t-[26px] bg-rv-bg px-5 pb-7 pt-3 focus:outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" onClick={onClose} aria-label="Close" className="rv-btn rv-btn-ghost absolute right-3 top-3 h-11 w-11 !px-0">
          <Icon name="x" />
        </button>
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-[#cfd5cf]" />
        {children}
      </div>
    </div>
  );
}

/* ---------- Grabadora: mantener pulsado (máx. 60 s), transcripción en el móvil, deshacer 5 s ---------- */
type SR = { lang: string; continuous: boolean; interimResults: boolean; start: () => void; stop: () => void; onresult: (e: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void; onerror: () => void };
type Pending = { text: string; duration: number; audio?: string; mime?: string };

async function sendNote(w: string, as: string, to: string, n: Pending, extra: Record<string, unknown>) {
  // K-15: si la frase está en la lista fija, el propio móvil abre la ayuda (112, MIELI…) aunque no haya consentimiento de
  // análisis ni conexión. No envía nada a nadie: el aviso a la clínica sigue dependiendo del servidor y del consentimiento.
  if (crisisFlag(n.text.replace(/[‘’ʼ]/g, "'"))) window.dispatchEvent(new CustomEvent("relevo:help", { detail: { as } }));
  const body = { w, as, to, text: hideNames(n.text), duration: n.duration, audio: n.audio, mime: n.mime, ...extra };
  try {
    const r = await fetch("/api/relevo/note", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const j = await r.json();
    if (!r.ok) throw Object.assign(new Error(j.error ?? "Couldn't send"), { server: true });
    changed();
    return j as { crisis: boolean };
  } catch (e) {
    if ((e as { server?: boolean }).server) throw e;
    // Sin conexión: se guarda y se envía al volver (sección 10.4)
    try {
      const q = JSON.parse(localStorage.getItem("relevo:queue") ?? "[]");
      q.push(body);
      localStorage.setItem("relevo:queue", JSON.stringify(q.slice(-10)));
    } catch {}
    return { crisis: false, queued: true };
  }
}
export function useOfflineQueue() {
  useEffect(() => {
    const flush = async () => {
      let q: unknown[] = [];
      try {
        q = JSON.parse(localStorage.getItem("relevo:queue") ?? "[]");
      } catch {}
      if (!q.length) return;
      localStorage.setItem("relevo:queue", "[]");
      for (const body of q) await fetch("/api/relevo/note", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).catch(() => {});
      changed();
    };
    window.addEventListener("online", flush);
    flush();
    return () => window.removeEventListener("online", flush);
  }, []);
}

export function Recorder({
  w, as, to, toName, size = 88, label, sub, script, cardId, kind, onSent, compact = false,
}: {
  w: string; as: string; to: string; toName: string; size?: number; label?: string; sub?: string; script?: string; cardId?: string; kind?: string; onSent?: (r: { crisis: boolean }) => void; compact?: boolean;
}) {
  const [state, setState] = useState<"idle" | "rec" | "review" | "undo" | "sending" | "sent" | "queued" | "error">("idle");
  const [secs, setSecs] = useState(0);
  const [live, setLive] = useState("");
  const [text, setText] = useState("");
  const [err, setErr] = useState("");
  const [left, setLeft] = useState(5);
  const rec = useRef<{ mr?: MediaRecorder; chunks: Blob[]; sr?: SR; finalText: string; started: number; timer?: ReturnType<typeof setInterval>; stream?: MediaStream } | null>(null);
  const pending = useRef<Pending | null>(null);
  const undoTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const finish = useCallback(async () => {
    const r = rec.current;
    if (!r) return;
    rec.current = null;
    clearInterval(r.timer);
    r.sr?.stop();
    const duration = Math.max(1, Math.round((Date.now() - r.started) / 1000));
    let audio: string | undefined;
    let mime: string | undefined;
    if (r.mr && r.mr.state !== "inactive") {
      const done = new Promise<void>((res) => (r.mr!.onstop = () => res()));
      r.mr.stop();
      await done;
      const blob = new Blob(r.chunks, { type: r.mr.mimeType || "audio/webm" });
      mime = blob.type;
      audio = await new Promise<string>((res) => {
        const fr = new FileReader();
        fr.onload = () => res(String(fr.result).split(",")[1] ?? "");
        fr.readAsDataURL(blob);
      });
    }
    r.stream?.getTracks().forEach((t) => t.stop());
    if (duration < 1 && !r.finalText) {
      setState("idle");
      setErr("Hold the button while you talk");
      return;
    }
    const transcript = (r.finalText || live).trim();
    pending.current = { text: transcript || script || "", duration, audio, mime };
    setText(pending.current.text);
    // Sin transcripción (navegador sin reconocimiento de voz): la persona puede escribir lo que dijo
    if (!pending.current.text) return setState("review");
    startUndo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live, script]);

  function startUndo() {
    setState("undo");
    setLeft(5);
    let n = 5;
    undoTimer.current = setInterval(async () => {
      n--;
      setLeft(n);
      if (n <= 0) {
        clearInterval(undoTimer.current!);
        await doSend();
      }
    }, 1000);
  }
  async function doSend() {
    const p = pending.current;
    if (!p) return;
    setState("sending");
    try {
      const r = await sendNote(w, as, to, p, { cardId, kind });
      pending.current = null;
      setState((r as { queued?: boolean }).queued ? "queued" : "sent");
      onSent?.(r);
      setTimeout(() => setState((s) => (s === "sent" ? "idle" : s)), 2200);
    } catch (e) {
      setErr((e as Error).message);
      setState("error");
    }
  }
  async function start() {
    if (state === "rec" || state === "undo" || state === "sending") return;
    setErr("");
    setLive("");
    const r: NonNullable<typeof rec.current> = { chunks: [], finalText: "", started: Date.now() };
    rec.current = r;
    setState("rec");
    setSecs(0);
    r.timer = setInterval(() => {
      const s = Math.floor((Date.now() - r.started) / 1000);
      setSecs(s);
      if (s >= 60) finish(); // máximo 60 s
    }, 250);
    // Transcripción en el propio dispositivo (Web Speech API en la demo)
    const W = window as unknown as { SpeechRecognition?: new () => SR; webkitSpeechRecognition?: new () => SR };
    const SRC = W.SpeechRecognition ?? W.webkitSpeechRecognition;
    if (SRC) {
      try {
        const sr = new SRC();
        sr.lang = "en-US";
        sr.continuous = true;
        sr.interimResults = true;
        sr.onresult = (e) => {
          let interim = "";
          for (let i = e.resultIndex; i < e.results.length; i++) {
            const res = e.results[i];
            if (res.isFinal) r.finalText += res[0].transcript + " ";
            else interim += res[0].transcript;
          }
          setLive((r.finalText + interim).trim());
        };
        sr.onerror = () => {};
        sr.start();
        r.sr = sr;
      } catch {}
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (rec.current !== r) return stream.getTracks().forEach((t) => t.stop());
      r.stream = stream;
      const mr = new MediaRecorder(stream);
      mr.ondataavailable = (e) => e.data.size && r.chunks.push(e.data);
      mr.start();
      r.mr = mr;
    } catch {
      // Sin micrófono: seguimos con la transcripción o con texto escrito
    }
  }
  const stopHold = () => state === "rec" && finish();
  const undo = () => {
    clearInterval(undoTimer.current!);
    pending.current = null;
    setState("idle");
  };

  const ringSize = compact ? 56 : size;
  return (
    <div className={`flex flex-col items-center ${compact && state !== "review" ? "w-auto shrink-0" : "w-full"}`}>
      {script && state === "idle" && <p className="rv-muted mb-3 max-w-[30ch] text-center text-[13px]">Read the message out loud, or say it your own way.</p>}
      <button
        type="button"
        onPointerDown={(e) => {
          e.preventDefault();
          start();
        }}
        onPointerUp={stopHold}
        onPointerLeave={stopHold}
        onPointerCancel={stopHold}
        onKeyDown={(e) => {
          if ((e.key === " " || e.key === "Enter") && !e.repeat) {
            e.preventDefault();
            if (state === "rec") finish();
            else start();
          }
        }}
        onContextMenu={(e) => e.preventDefault()}
        aria-label={state === "rec" ? "Recording. Release to stop" : label ?? `Hold to talk to ${toName}`}
        className={`relative flex touch-none select-none items-center justify-center rounded-full text-white transition-transform ${state === "rec" ? "rv-recording scale-105 bg-rv-teal-deep" : "bg-rv-teal hover:bg-rv-teal-deep"}`}
        style={{ width: ringSize, height: ringSize, boxShadow: state === "rec" ? undefined : "0 10px 24px -12px rgb(14 107 92 / 0.8)" }}
      >
        <Icon name="mic" size={compact ? 24 : 34} />
        {state === "rec" && (
          <svg className="absolute inset-0 -rotate-90" viewBox="0 0 100 100" aria-hidden>
            <circle cx="50" cy="50" r="48" fill="none" stroke="rgb(255 255 255 / 0.85)" strokeWidth="3" strokeDasharray={`${(secs / 60) * 301.6} 301.6`} strokeLinecap="round" />
          </svg>
        )}
      </button>
      {!compact && (
        <div className="mt-3 min-h-[44px] text-center" aria-live="polite">
          {state === "rec" ? (
            <>
              <p className="rv-num font-semibold">{fmtDur(secs)} · release to send</p>
              {live && <p className="rv-muted mx-auto mt-1 max-w-[30ch] text-[13px] italic">{revealNames(live)}</p>}
            </>
          ) : state === "undo" || state === "sending" ? (
            <p className="text-[14px]">
              {state === "sending" ? "Sending…" : `Sending to ${toName} in ${left} s`}
              {state === "undo" && (
                <button onClick={undo} className="ml-2 font-semibold text-rv-teal underline underline-offset-2">
                  Undo
                </button>
              )}
            </p>
          ) : state === "sent" ? (
            <p className="font-semibold text-rv-teal">Sent to {toName}</p>
          ) : state === "queued" ? (
            <p className="text-[14px]">It&apos;ll send when there&apos;s a connection</p>
          ) : (
            <>
              <p className="font-semibold">{label ?? `Hold to talk to ${toName}`}</p>
              {sub && <p className="rv-muted text-[13px]">{sub}</p>}
              {err && <p className="mt-1 text-[13px] text-rv-help">{err}</p>}
            </>
          )}
        </div>
      )}
      {compact && state !== "idle" && state !== "review" && (
        <p className="rv-muted mt-1 text-[12px]" aria-live="polite">
          {state === "rec" ? fmtDur(secs) : state === "undo" ? (
            <>
              Sending in {left} s{" "}
              <button onClick={undo} className="font-semibold text-rv-teal underline">
                Undo
              </button>
            </>
          ) : state === "sent" ? "Sent" : state === "queued" ? "Will send when online" : state === "sending" ? "Sending…" : err}
        </p>
      )}
      {state === "review" && (
        <div className="mt-3 w-full">
          <label className="rv-muted mb-1 block text-[13px]" htmlFor={`tx-${as}`}>
            Couldn&apos;t catch the words. Type what you said (it goes with your recording):
          </label>
          <textarea id={`tx-${as}`} className="rv-input min-h-20" value={text} onChange={(e) => setText(e.target.value)} />
          <div className="mt-2 flex gap-2">
            <button className="rv-btn rv-btn-primary flex-1" disabled={!text.trim()} onClick={() => { pending.current = { ...(pending.current ?? { duration: 5 }), text: text.trim() }; startUndo(); }}>
              Send
            </button>
            <button className="rv-btn rv-btn-ghost" onClick={undo}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/** Nota escrita (alternativa accesible a la voz; se lee con la voz del navegador al reproducirla). */
export function TextNote({ w, as, to, toName, initial = "", cardId, kind, onSent }: { w: string; as: string; to: string; toName: string; initial?: string; cardId?: string; kind?: string; onSent?: (r: { crisis: boolean }) => void }) {
  const [t, setT] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!t.trim()) return;
        setBusy(true);
        try {
          const r = await sendNote(w, as, to, { text: t.trim(), duration: Math.max(3, Math.round(t.split(" ").length / 2.4)) }, { cardId, kind, written: true });
          setT("");
          onSent?.(r);
        } catch (e2) {
          setErr((e2 as Error).message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <textarea className="rv-input min-h-20" value={t} onChange={(e) => setT(e.target.value)} placeholder={`Write to ${toName}`} aria-label={`Write to ${toName}`} />
      {err && <p className="text-[13px] text-rv-help">{err}</p>}
      <button className="rv-btn rv-btn-secondary" disabled={busy || !t.trim()}>
        {busy ? "Sending…" : "Send as a written note"}
      </button>
    </form>
  );
}

/** Barra del chat: escribe y envía un mensaje, o mantén pulsado el micrófono para grabar una nota de voz. */
export function ChatComposer({ w, as, to, toName }: { w: string; as: string; to: string; toName: string }) {
  const [t, setT] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = t.trim();
    if (!text || busy) return;
    setBusy(true);
    setErr("");
    try {
      await sendNote(w, as, to, { text, duration: Math.max(3, Math.round(text.split(" ").length / 2.4)) }, { written: true });
      setT("");
    } catch (e2) {
      setErr((e2 as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div>
      <div className="flex flex-wrap items-start gap-2">
        <form onSubmit={send} className="flex min-w-0 flex-1 items-center gap-2 rounded-full bg-white py-1.5 pl-4 pr-1.5 shadow-[0_0_0_1px_rgb(22_33_28/0.08)] focus-within:shadow-[0_0_0_2px_var(--color-rv-teal)]" style={{ minHeight: 56 }}>
          <input
            className="min-w-0 flex-1 bg-transparent text-[16px] outline-none focus-visible:outline-none placeholder:text-rv-ink/45"
            value={t}
            onChange={(e) => setT(e.target.value)}
            placeholder={`Message ${toName}`}
            aria-label={`Message ${toName}`}
            maxLength={1200}
          />
          {t.trim() && (
            <button className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-rv-teal text-white hover:bg-rv-teal-deep disabled:opacity-60" disabled={busy} aria-label={`Send to ${toName}`}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M5 12h14M13 6l6 6-6 6" /></svg>
            </button>
          )}
        </form>
        {!t.trim() && <Recorder w={w} as={as} to={to} toName={toName} compact />}
      </div>
      {err ? <p className="mt-1 text-[13px] text-rv-help">{err}</p> : !t && <p className="rv-muted mt-1.5 text-center text-[12.5px]">Type a message, or hold the mic to send a voice note</p>}
    </div>
  );
}

/* ---------- Marco de teléfono (390 x 844) con la hora de la demo en la barra de estado ---------- */
export function Phone({ time, children, label }: { time: string; children: React.ReactNode; label: string }) {
  return (
    <div className="relative flex h-[844px] w-[390px] flex-col overflow-hidden rounded-[44px] bg-rv-bg shadow-[0_0_0_10px_#1b2420,0_0_0_11px_#3a4540,0_30px_60px_-20px_rgb(0_0_0/0.45)]" aria-label={label}>
      <div className="flex h-11 shrink-0 items-center justify-between px-8 pt-1 text-[14px] font-semibold">
        <span className="rv-num">{time}</span>
        <span className="absolute left-1/2 top-2.5 h-[26px] w-[110px] -translate-x-1/2 rounded-full bg-[#1b2420]" aria-hidden />
        <span className="flex items-center gap-1.5" aria-hidden>
          <svg width="18" height="11" viewBox="0 0 18 11"><path d="M1 10h2V7H1zM5 10h2V5H5zM9 10h2V3H9zM13 10h2V1h-2z" fill="currentColor" /></svg>
          <svg width="24" height="12" viewBox="0 0 24 12"><rect x="0.5" y="0.5" width="20" height="11" rx="3" fill="none" stroke="currentColor" opacity="0.5" /><rect x="2" y="2" width="14" height="8" rx="1.5" fill="currentColor" /><path d="M22 4v4" stroke="currentColor" opacity="0.5" /></svg>
        </span>
      </div>
      <div className="relative flex min-h-0 flex-1 flex-col">{children}</div>
    </div>
  );
}

/** Escala un bloque de tamaño fijo para que quepa en su columna (la demo enseña los tres a la vez). */
// pad: margen (en px sin escalar) para lo que se dibuja fuera de la caja, como el marco del móvil; así no se sale del hueco
export function Fit({ width, height, children, max = 1, pad = 0 }: { width: number; height: number; children: React.ReactNode; max?: number; pad?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.7);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const s = Math.min(max, el.clientWidth / (width + 2 * pad), (el.clientHeight || height) / (height + 2 * pad));
      setScale(Math.max(0.3, s));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [width, height, max, pad]);
  return (
    <div ref={ref} className="relative h-full w-full">
      <div className="absolute left-1/2 origin-top" style={{ top: pad * scale, width, height, transform: `translateX(-50%) scale(${scale})` }}>
        {children}
      </div>
    </div>
  );
}
