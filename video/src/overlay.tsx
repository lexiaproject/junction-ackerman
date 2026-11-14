// Textos de pantalla en estilo Apple: Inter grande, interlineado justo, sin contornos ni adornos.
// Cada plano entra de una forma distinta (máscara, corte, escala, letra a letra, palabra a palabra,
// revelado por un objeto, subida desde máscara, enfoque), siempre suave y limpia.
import React, { useId } from "react";
import { AbsoluteFill, Freeze, useCurrentFrame } from "remotion";
import { INTER, GROTESK, clamp01, prog, ramp, smooth } from "./lib";

export type Seg = { t: string; c?: string };
const base: React.CSSProperties = { fontFamily: INTER, fontWeight: 600, letterSpacing: "-0.035em", lineHeight: 1.04, whiteSpace: "pre" };
const segs = (s: string | Seg[], color: string): Seg[] => (typeof s === "string" ? [{ t: s, c: color }] : s.map((x) => ({ ...x, c: x.c ?? color })));

// Bloque de texto posicionado (left/top en px de 1920×1080)
export const Block: React.FC<{ x: number; y: number; children: React.ReactNode; align?: "left" | "center"; style?: React.CSSProperties }> = ({ x, y, children, align = "left", style }) => (
  <div style={{ position: "absolute", left: align === "center" ? 0 : x, right: align === "center" ? 0 : undefined, top: y, textAlign: align, ...style }}>{children}</div>
);

// Máscara suave de izquierda a derecha
export const Wipe: React.FC<{ text: string | Seg[]; p: number; size?: number; color?: string; weight?: number }> = ({ text, p, size = 110, color = "#fff", weight = 600 }) => {
  const e = smooth(clamp01(p)) * 130 - 15;
  const m = `linear-gradient(90deg, #000 ${e}%, transparent ${e + 15}%)`;
  return <div style={{ ...base, fontSize: size, fontWeight: weight, WebkitMaskImage: m, maskImage: m }}>{segs(text, color).map((s, i) => <span key={i} style={{ color: s.c }}>{s.t}</span>)}</div>;
};

// Corte seco
export const Cut: React.FC<{ text: string; on: boolean; size?: number; color?: string }> = ({ text, on, size = 96, color = "#fff" }) => (on ? <div style={{ ...base, fontSize: size, color }}>{text}</div> : null);

// Escala desde gigante: entra enorme y se asienta en su sitio con un enfoque suave
export const ScaleIn: React.FC<{ text: string | Seg[]; p: number; size?: number; color?: string; from?: number; origin?: string; weight?: number }> = ({ text, p, size = 120, color = "#fff", from = 3, origin = "0% 60%", weight = 600 }) => {
  const e = ramp(clamp01(p));
  return (
    <div style={{ ...base, fontSize: size, fontWeight: weight, opacity: clamp01(p * 5), transform: `scale(${from + (1 - from) * e})`, transformOrigin: origin, filter: `blur(${(1 - e) * 8}px)` }}>
      {segs(text, color).map((s, i) => <span key={i} style={{ color: s.c }}>{s.t}</span>)}
    </div>
  );
};

// Letra a letra, con un cursor fino que desaparece al terminar
export const TypeIn: React.FC<{ text: string; p: number; size?: number; color?: string; width?: number }> = ({ text, p, size = 90, color = "#fff", width }) => {
  const f = useCurrentFrame();
  const n = Math.floor(clamp01(p) * text.length + 1e-4);
  const caret = p > 0 && (p < 1 || Math.floor(f / 9) % 2 === 0) && p < 1.6;
  return (
    <div style={{ ...base, fontSize: size, color, whiteSpace: width ? "pre-wrap" : "pre", width }}>
      {text.slice(0, n)}
      {caret && <span style={{ display: "inline-block", width: Math.max(3, size * 0.045), height: size * 0.9, marginLeft: size * 0.05, verticalAlign: "-0.1em", background: color, borderRadius: 2 }} />}
    </div>
  );
};

// Palabra a palabra: cada palabra sube un poco y se enfoca
export const Words: React.FC<{ text: string | Seg[]; f: number; start: number; stagger?: number; dur?: number; size?: number; color?: string; maxWidth?: number }> = ({ text, f, start, stagger = 4, dur = 14, size = 96, color = "#16211C", maxWidth }) => {
  let k = 0;
  return (
    <div style={{ ...base, fontSize: size, whiteSpace: "normal", maxWidth }}>
      {segs(text, color).map((s, si) => s.t.split(/(\s+)/).map((w, wi) => {
        if (/^\s+$/.test(w)) return <span key={`${si}-${wi}`}>{w}</span>;
        const p = prog(f, start + k * stagger, start + k * stagger + dur, ramp); k++;
        return <span key={`${si}-${wi}`} style={{ display: "inline-block", color: s.c, opacity: p, transform: `translateY(${(1 - p) * 0.28}em)`, filter: `blur(${(1 - p) * 6}px)` }}>{w}</span>;
      }))}
    </div>
  );
};

// Revelado por un objeto que pasa: lo ya recorrido queda visible (x = posición del objeto en px; dir -1 = viaja hacia la izquierda)
export const PassReveal: React.FC<{ text: string | Seg[]; x: number; left: number; dir?: 1 | -1; size?: number; color?: string }> = ({ text, x, left, dir = 1, size = 96, color = "#16211C" }) => {
  const rel = x - left;
  const m = dir < 0 ? `linear-gradient(90deg, transparent ${rel}px, #000 ${rel + 60}px)` : `linear-gradient(90deg, #000 ${rel - 60}px, transparent ${rel}px)`;
  return <div style={{ ...base, fontSize: size, WebkitMaskImage: m, maskImage: m }}>{segs(text, color).map((s, i) => <span key={i} style={{ color: s.c }}>{s.t}</span>)}</div>;
};

// Líneas que suben desde detrás de una máscara (una tras otra)
export const Rise: React.FC<{ lines: (string | Seg[])[]; f: number; start: number; gap?: number; dur?: number; size?: number; color?: string }> = ({ lines, f, start, gap = 5, dur = 16, size = 84, color = "#16211C" }) => (
  <div>
    {lines.map((l, i) => {
      const p = prog(f, start + i * gap, start + i * gap + dur, ramp);
      return (
        <div key={i} style={{ overflow: "hidden", height: size * 1.12, paddingBottom: 4 }}>
          <div style={{ ...base, fontSize: size, transform: `translateY(${(1 - p) * 105}%)` }}>{segs(l, color).map((s, j) => <span key={j} style={{ color: s.c }}>{s.t}</span>)}</div>
        </div>
      );
    })}
  </div>
);

// Enfoque: aparece desde desenfocado y con el espaciado un poco abierto
export const Focus: React.FC<{ text: string | Seg[]; p: number; size?: number; color?: string; inline?: boolean }> = ({ text, p, size = 90, color = "#16211C", inline }) => {
  const e = smooth(clamp01(p));
  return (
    <span style={{ ...base, display: inline ? "inline-block" : "block", fontSize: size, opacity: e, filter: `blur(${(1 - e) * 14}px)`, letterSpacing: `${-0.035 + (1 - e) * 0.06}em` }}>
      {segs(text, color).map((s, i) => <span key={i} style={{ color: s.c }}>{s.t}</span>)}
    </span>
  );
};

// Revelado por una línea de luz fina que pasa (para el logo final)
export const SweepReveal: React.FC<{ children: React.ReactNode; p: number; style?: React.CSSProperties; bar?: string }> = ({ children, p, style, bar = "#0E6B5C" }) => {
  const x = -5 + smooth(clamp01(p)) * 112;
  const m = `linear-gradient(90deg, #000 ${x - 6}%, transparent ${x}%)`;
  return (
    <div style={{ position: "absolute", ...style }}>
      <div style={{ WebkitMaskImage: m, maskImage: m }}>{children}</div>
      {p > 0 && p < 1 && <div style={{ position: "absolute", top: "-8%", bottom: "-8%", left: `${x}%`, width: 3, borderRadius: 2, background: `linear-gradient(180deg, transparent, ${bar}, transparent)`, opacity: Math.sin(clamp01(p) * Math.PI) }} />}
    </div>
  );
};

export const Logo: React.FC<{ size?: number; color?: string }> = ({ size = 150, color = "#16211C" }) => (
  <span style={{ fontFamily: GROTESK, fontWeight: 700, fontSize: size, letterSpacing: "-0.035em", color, lineHeight: 1 }}>Relevo</span>
);

// Desenfoque direccional para los barridos rápidos (whip pan): estela limpia en una sola dirección
export const DirBlur: React.FC<{ x?: number; y?: number; children: React.ReactNode }> = ({ x = 0, y = 0, children }) => {
  const id = "db" + useId().replace(/[^a-zA-Z0-9]/g, "");
  const on = x > 0.3 || y > 0.3;
  return (
    <AbsoluteFill>
      <svg width="0" height="0" style={{ position: "absolute" }}>
        <filter id={id} x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB"><feGaussianBlur stdDeviation={`${x} ${y}`} edgeMode="duplicate" /></filter>
      </svg>
      <AbsoluteFill style={{ filter: on ? `url(#${id})` : "none" }}>{children}</AbsoluteFill>
    </AbsoluteFill>
  );
};

// Desenfoque de movimiento: varias muestras del mismo plano en instantes cercanos, promediadas
export const MotionBlur: React.FC<{ on: boolean; samples?: number; shutter?: number; children: React.ReactNode }> = ({ on, samples = 10, shutter = 0.7, children }) => {
  const f = useCurrentFrame();
  if (!on) return <>{children}</>;
  return (
    <AbsoluteFill style={{ isolation: "isolate" }}>
      {new Array(samples).fill(0).map((_, i) => {
        const off = shutter * (i / (samples - 1) - 0.5);
        return (
          <AbsoluteFill key={i} style={{ mixBlendMode: "plus-lighter", filter: `opacity(${1 / samples})` }}>
            <Freeze frame={Math.max(0, f + off)}>{children}</Freeze>
          </AbsoluteFill>
        );
      })}
    </AbsoluteFill>
  );
};
