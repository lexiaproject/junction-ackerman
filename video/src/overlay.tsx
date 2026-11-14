// Textos de pantalla (HTML sobre el 3D), cada uno con su forma de entrar, y el desenfoque de movimiento.
import React from "react";
import { AbsoluteFill, Freeze, useCurrentFrame } from "remotion";
import { INTER, GROTESK, clamp01, prog, ramp, smooth } from "./lib";

const base: React.CSSProperties = { fontFamily: INTER, fontWeight: 700, letterSpacing: "-0.025em", lineHeight: 1.04, position: "absolute", whiteSpace: "pre" };

// Máscara de izquierda a derecha con borde suave
export const MaskWipe: React.FC<{ text: string; p: number; style?: React.CSSProperties; size?: number; color?: string }> = ({ text, p, style, size = 110, color = "#fff" }) => {
  const e = 120 * p - 10; // % del frente
  const m = `linear-gradient(90deg, #000 ${e - 8}%, transparent ${e}%)`;
  return <div style={{ ...base, fontSize: size, color, WebkitMaskImage: m, maskImage: m, transform: `translateX(${(1 - smooth(p)) * -24}px)`, ...style }}>{text}</div>;
};

// Letra a letra (máquina de escribir) con cursor
export const TypeOn: React.FC<{ text: string; p: number; style?: React.CSSProperties; size?: number; color?: string; caretOn?: boolean }> = ({ text, p, style, size = 96, color = "#fff", caretOn = true }) => {
  const n = Math.floor(clamp01(p) * text.length + 0.0001);
  const f = useCurrentFrame();
  const caret = caretOn && (p < 1 || Math.floor(f / 8) % 2 === 0);
  return (
    <div style={{ ...base, fontSize: size, color, ...style }}>
      {text.slice(0, n)}
      {caret && <span style={{ verticalAlign: "top", marginLeft: size * 0.04, width: size * 0.07, height: size * 0.95, marginTop: size * 0.06, background: color, display: "inline-block" }} />}
    </div>
  );
};

// Escala desde gigante: entra enorme y desenfocada y se encoge a su sitio
export const Giant: React.FC<{ text: string; p: number; style?: React.CSSProperties; size?: number; color?: string; from?: number }> = ({ text, p, style, size = 120, color = "#fff", from = 9 }) => {
  const e = ramp(clamp01(p));
  const sc = from + (1 - from) * e;
  return <div style={{ ...base, fontSize: size, color, opacity: clamp01(p * 6), transform: `scale(${sc})`, filter: `blur(${(1 - e) * 14}px)`, ...style }}>{text}</div>;
};

// Líneas que suben desde detrás de una máscara (una tras otra)
export const MaskUp: React.FC<{ lines: string[]; f: number; start: number; gap?: number; dur?: number; style?: React.CSSProperties; size?: number; color?: string; weights?: number[] }> = ({ lines, f, start, gap = 6, dur = 14, style, size = 84, color = "#16211C", weights = [] }) => (
  <div style={{ position: "absolute", ...style }}>
    {lines.map((l, i) => {
      const p = prog(f, start + i * gap, start + i * gap + dur, ramp);
      return (
        <div key={i} style={{ overflow: "hidden", height: size * 1.16 }}>
          <div style={{ ...base, position: "relative", fontSize: size, color, fontWeight: weights[i] ?? 700, transform: `translateY(${(1 - p) * 110}%)` }}>{l}</div>
        </div>
      );
    })}
  </div>
);

// Frase revelada por una barra de luz que pasa (el objeto que pasa revela el texto)
export const SweepReveal: React.FC<{ children: React.ReactNode; p: number; style?: React.CSSProperties; bar?: string }> = ({ children, p, style, bar = "#0E6B5C" }) => {
  const x = -10 + p * 125;
  const m = `linear-gradient(90deg, #000 ${x - 4}%, transparent ${x}%)`;
  return (
    <div style={{ position: "absolute", ...style }}>
      <div style={{ WebkitMaskImage: m, maskImage: m }}>{children}</div>
      {p > 0 && p < 1 && <div style={{ position: "absolute", top: "-12%", bottom: "-12%", left: `${x}%`, width: 10, marginLeft: -5, borderRadius: 6, background: bar, boxShadow: `0 0 30px 8px ${bar}66` }} />}
    </div>
  );
};

export const Logo: React.FC<{ size?: number; color?: string }> = ({ size = 150, color = "#16211C" }) => (
  <span style={{ fontFamily: GROTESK, fontWeight: 700, fontSize: size, letterSpacing: "-0.035em", color, lineHeight: 1 }}>Relevo</span>
);

// Desenfoque de movimiento: varias muestras del mismo plano en instantes cercanos, promediadas
export const MotionBlur: React.FC<{ on: boolean; samples?: number; shutter?: number; children: React.ReactNode }> = ({ on, samples = 6, shutter = 0.9, children }) => {
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
