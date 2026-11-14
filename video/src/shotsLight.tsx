// Planos 6-12 (paleta clara de Relevo): nota de voz de Luis, corazón de luz de Pablo, gráfica real de Pablo,
// "Peers first. Clinic always.", el "I'm in", la ventana con nieve al amanecer y el final.
import React, { useMemo } from "react";
import { AbsoluteFill, Easing, useCurrentFrame } from "remotion";
import * as THREE from "three";
import { Cam, Glow, Dust, Chair, Person, Phone, LightStroke, Label, ShotPanel, onScreen, PtsLive, PHONE_H } from "./kit";
import { MaskWipe, Giant, MaskUp, SweepReveal, Logo, MotionBlur } from "./overlay";
import { Stage } from "./shotsDark";
import { C, prog, mix, key, hit, ramp, smooth, rng, clamp01, INTER, useFontsReady } from "./lib";
import series from "../public/shots/pablo-series.json";

type V3 = [number, number, number];

// Rótulo con halo claro para que se lea encima de la interfaz
function wordTex(text: string, px: number, color: string, halo = C.bg, weight = 700) {
  const cv = document.createElement("canvas");
  const ctx = cv.getContext("2d")!;
  ctx.font = `${weight} ${px}px ${INTER}`;
  const w = Math.ceil(ctx.measureText(text).width + px * 0.6), h = Math.ceil(px * 1.45);
  cv.width = w; cv.height = h;
  ctx.font = `${weight} ${px}px ${INTER}`; ctx.textBaseline = "middle"; ctx.lineJoin = "round";
  if (halo) { ctx.strokeStyle = halo; ctx.lineWidth = px * 0.22; ctx.strokeText(text, px * 0.3, h / 2); }
  ctx.fillStyle = color; ctx.fillText(text, px * 0.3, h / 2);
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  return { tex, aspect: w / h };
}
// Rótulo escrito con un "lápiz" de luz que va por delante
const WriteOn: React.FC<{ text: string; height: number; p: number; position: V3; rotation?: V3; color?: string; halo?: string }> = ({ text, height, p, position, rotation, color = C.ink, halo }) => {
  const ready = useFontsReady();
  const t = useMemo(() => (ready ? wordTex(text, 220, color, halo) : null), [ready, text, color, halo]);
  if (!t) return null;
  const w = height * t.aspect;
  const e = smooth(clamp01(p));
  return (
    <group position={position} rotation={rotation}>
      <Label tex={t.tex} width={w} height={height} reveal={e * 1.08} soft={0.05} position={[w / 2, 0, 0]} />
      {p > 0 && p < 1 && <Glow position={[w * e * 1.0, 0, 0.02]} size={height * 0.9} color={C.green} opacity={0.75} additive={false} renderOrder={6} />}
    </group>
  );
};
const LightBg: React.FC<{ f: number; tint?: string }> = ({ f, tint = C.sage }) => (
  <>
    <Glow position={[0, 0, -12]} size={30} color={tint} opacity={0.9} additive={false} />
    <Dust n={220} box={[16, 9, 10]} center={[0, 0, -2]} color={C.green} size={0.018} focus={4} aperture={0.05} opacity={0.22} additive={false} time={f / 30} spread={1} />
  </>
);
const Lights = () => (<><ambientLight intensity={0.9} /><directionalLight position={[3, 4, 5]} intensity={1.6} /></>);

// ---------- 6 · "Those who recovered…" ----------
export const Shot6 = () => { const f = useCurrentFrame(); return <MotionBlur on={f < 18 || f >= 158}><Shot6In /></MotionBlur>; };
const Bars: React.FC<{ f: number; center: V3; rise: number; gather: number }> = ({ f, center, rise, gather }) => {
  const n = 30;
  return (
    <group position={[center[0] * (1 - gather), center[1] * (1 - gather), center[2] + rise * 0.8]}>
      {Array.from({ length: n }, (_, i) => {
        const x = (i / (n - 1) - 0.5) * mix(0.8, 1.9, rise) * (1 - gather);
        const env = Math.sin((i / (n - 1)) * Math.PI);
        const h = (0.04 + env * 0.42 * Math.abs(Math.sin(f * 0.37 + i * 1.7) * Math.cos(f * 0.21 + i * 0.6))) * rise * (1 - gather) + 0.001;
        return <mesh key={i} position={[x, 0, 0]}><boxGeometry args={[0.032, h, 0.032]} /><meshStandardMaterial color={C.green} roughness={0.4} emissive={C.green} emissiveIntensity={0.25} /></mesh>;
      })}
    </group>
  );
};
const Shot6In = () => {
  const f = useCurrentFrame();
  const out = ramp(prog(f, 0, 22));
  const az = mix(-0.5, 0.42, prog(f, 0, 165, smooth));
  const r = mix(0.16, 3.7, out);
  const startPt = onScreen(195, 640, 0);
  const tgt: V3 = [mix(startPt[0], 0.55, out), mix(startPt[1], 0.05, out), 0];
  let pos: V3 = [tgt[0] + r * Math.sin(az * out), tgt[1] + 0.25 * out, r * Math.cos(az * out)];
  // la onda se vuelve una luz que sale disparada; la cámara la sigue (whip pan)
  const gather = prog(f, 150, 162, smooth);
  const shoot = prog(f, 162, 182, Easing.in(Easing.cubic));
  const mic = onScreen(195, 397, 0.06);
  const ball: V3 = [mix(mic[0], 9, shoot), mix(mic[1], 0.3, shoot), mic[2] + 0.8];
  const look: V3 = [mix(tgt[0], ball[0], prog(f, 158, 180, Easing.in(Easing.quad))), tgt[1], 0];
  const bob = Math.sin(f * 0.05) * 0.04;
  return (
    <AbsoluteFill>
      <Stage bg={C.bg}>
        <Cam pos={pos} look={look} fov={36} />
        <Lights />
        <LightBg f={f} />
        <Person kind="bust" seed={31} n={4200} position={[-1.2, -0.35, -3.2]} scale={3.6} color={C.green} opacity={0.5} size={0.02} focus={3.7} aperture={0.09} additive={false} time={f / 30} spread={1} />
        <group position={[0, bob, 0]} rotation={[0.04, -0.18, 0.03]}>
          <Phone shot="luis-home" next="luis-rec" swap={prog(f, 57, 62)} sweep={mix(-0.4, 1.9, prog(f, 18, 80, smooth))} />
          {f >= 62 && f < 165 && <Bars f={f} center={mic} rise={prog(f, 64, 98, ramp)} gather={gather} />}
          <WriteOn text="Those who recovered…" height={0.25} p={prog(f, 96, 132)} position={[-0.46, -0.62, 0.22]} />
        </group>
        {f >= 150 && <><Glow position={ball} size={0.5 + gather * 0.6} color={C.green} opacity={0.85 * gather} additive={false} /><Glow position={ball} size={0.16} color="#ffffff" opacity={gather} /></>}
      </Stage>
    </AbsoluteFill>
  );
};

// ---------- 7 · "…walk with the next." ----------
const heartPts = (scale: number): V3[] => Array.from({ length: 72 }, (_, i) => {
  const t = Math.PI + (i / 71) * Math.PI * 2;
  return [(16 * Math.pow(Math.sin(t), 3)) / 16 * scale, ((13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) / 16) * scale + scale * 0.2, 0];
});
const pulsePts = (w: number): V3[] => Array.from({ length: 72 }, (_, i) => {
  const x = (i / 71 - 0.5) * w; const u = x / w;
  return [x, w * (0.16 * Math.exp(-Math.pow((u + 0.02) / 0.03, 2)) - 0.07 * Math.exp(-Math.pow((u - 0.04) / 0.025, 2))), 0];
});
export const PULSE_W7 = 0.9; // ancho de la línea de pulso al final del plano 7 (a 2,2 de la cámara)
export const Shot7 = () => { const f = useCurrentFrame(); return <MotionBlur on={f < 16}><Shot7In /></MotionBlur>; };
const Shot7In = () => {
  const f = useCurrentFrame();
  const sep = key(f, [20, 46, 70, 105], [1.25, 2.05, 2.05, 0.88], smooth);
  const L: V3 = [-sep, 0, 0], P: V3 = [sep, 0, 0];
  const settle = ramp(prog(f, 0, 20));
  const arc = prog(f, 90, 135, ramp);
  const heart: V3 = [mix(P[0], L[0], arc), 0.25 + Math.sin(arc * Math.PI) * 0.95, 0.12 + Math.sin(arc * Math.PI) * 0.5];
  const beat = hit(f, 135, 12) + hit(f, 150, 12);
  const push = prog(f, 150, 180, smooth);
  const camBase: V3 = f < 90 ? [mix(-2, 0.3, settle) + mix(sep * 0.8, 0, prog(f, 20, 60, smooth)), 0.35, mix(3.6, 5.2, prog(f, 16, 50, smooth))] : [mix(0.3, heart[0] * 0.55, prog(f, 90, 120, smooth)), 0.4, 5.2];
  const pos: V3 = f < 150 ? camBase : [mix(camBase[0], heart[0], push), mix(camBase[1], heart[1], push), mix(camBase[2], heart[2] + 2.2, push)];
  const lookBase: V3 = f < 90 ? [mix(-1, P[0], settle) * (1 - prog(f, 20, 60, smooth)) + 0 * prog(f, 20, 60), 0.2, 0] : [mix(0, heart[0], 0.7 * prog(f, 90, 105, smooth)), mix(0.2, heart[1] * 0.6, prog(f, 90, 105, smooth)), 0];
  const look: V3 = f < 150 ? lookBase : [mix(lookBase[0], heart[0], push), mix(lookBase[1], heart[1], push), mix(0, heart[2], push)];
  const morph = prog(f, 158, 178, smooth);
  const shape = useMemo(() => ({ h: heartPts(0.26), p: pulsePts(PULSE_W7) }), []);
  const pts = shape.h.map((h, i) => [mix(h[0], shape.p[i][0], morph), mix(h[1], shape.p[i][1], morph), 0] as V3);
  const sc = 1 + beat * 0.3;
  const enter = hit(f, 10, 14);
  const ready = useFontsReady();
  const tt = useMemo(() => (ready ? wordTex("…walk with the next.", 220, C.ink) : null), [ready]);
  const reveal = clamp01((P[0] + 0.6 - heart[0]) / (P[0] - L[0] + 1.2)) * (f >= 90 ? 1 : 0);
  return (
    <AbsoluteFill>
      <Stage bg={C.bg}>
        <Cam pos={pos} look={look} fov={36} />
        <Lights />
        <LightBg f={f} />
        <Person kind="bust" seed={41} n={4200} position={[P[0] + 1.1, -0.3, -2.9]} scale={3.3} color={C.green} colorB="#A3ADA9" mix={prog(f, 100, 165, smooth)} opacity={0.55} size={0.02} focus={5} aperture={0.08} additive={false} time={f / 30} spread={1} />
        <group position={L} rotation={[0, 0.22 * prog(f, 70, 105, smooth), 0]}>
          <Phone shot="luis-home" bright={1 + beat * 0.08} />
        </group>
        <group position={P} rotation={[0, -0.22 * prog(f, 70, 105, smooth), 0]}>
          <Phone shot="pablo-conv" next="pablo-ideas" swap={prog(f, 58, 63)} focus={[0.5, 0.55]} focusAmt={prog(f, 66, 80) * 0.8} focusR={0.16} bright={1 + enter * 0.25} sweep={mix(-0.4, 1.9, prog(f, 8, 40))} />
        </group>
        {f < 14 && <Glow position={[mix(-3, P[0], prog(f, 0, 10, Easing.out(Easing.cubic))), 0.3, 0.8]} size={0.6} color={C.green} opacity={1 - prog(f, 9, 14)} additive={false} />}
        {sep > 1.4 && <mesh position={[0, 0, -0.2]}><planeGeometry args={[0.012, 6]} /><meshBasicMaterial color={C.green} transparent opacity={clamp01((sep - 1.4) / 0.6) * 0.7} /></mesh>}
        {f >= 88 && (
          <group position={heart} scale={sc}>
            <LightStroke points={pts} color={morph > 0.5 ? C.green : "#E39B2D"} width={0.012} additive={false} closed={false} />
            <Glow size={0.9 * (1 - morph * 0.7)} color="#F2B766" opacity={0.55 * (1 - morph)} additive={false} />
          </group>
        )}
        {f >= 135 && f < 165 && [135, 150].map((b) => f >= b && <LightStroke key={b} points={Array.from({ length: 40 }, (_, i) => [Math.cos((i / 39) * Math.PI * 2) * 0.2, Math.sin((i / 39) * Math.PI * 2) * 0.2, 0] as V3)} closed color="#E39B2D" width={0.006} additive={false} opacity={1 - prog(f, b, b + 14)} position={[L[0], heart[1] * 0.0 + 0.25, 0.08]} scale={1 + prog(f, b, b + 14) * 3} />)}
        {tt && <Label tex={tt.tex} width={0.42 * tt.aspect} height={0.42} reveal={reveal * 1.1} soft={0.08} dir={-1} position={[0, 1.36, 0.15]} opacity={1 - prog(f, 150, 162)} />}
      </Stage>
    </AbsoluteFill>
  );
};

// ---------- 8 · "When a companion goes quiet, we notice." ----------
const CH_W = 3.6, CH_H = 1.7, Y0 = -0.6, Y1 = 3.4, TH = 1.5;
const vy = (v: number) => -CH_H / 2 + ((v - Y0) / (Y1 - Y0)) * CH_H;
const S = series as { labels: string[]; domains: Record<string, (number | null)[]> };
const at = (arr: (number | null)[], u: number) => {
  const x = u * (arr.length - 1), i = Math.min(arr.length - 2, Math.floor(x)), t = x - i;
  return (arr[i] ?? 0) * (1 - t) + (arr[i + 1] ?? 0) * t;
};
const MAIN = S.domains.movil_vinculo;
const CROSS = (() => { for (let i = 1; i < MAIN.length; i++) if ((MAIN[i] ?? 0) >= TH && (MAIN[i - 1] ?? 0) < TH) return (i - 1 + (TH - (MAIN[i - 1] ?? 0)) / ((MAIN[i] ?? 0) - (MAIN[i - 1] ?? 0))) / (MAIN.length - 1); return 0.93; })();
const CROSS_PT: V3 = [-CH_W / 2 + CROSS * CH_W, vy(TH), 0];
export const Shot8 = () => { const f = useCurrentFrame(); return <MotionBlur on={f >= 188}><Shot8In /></MotionBlur>; };
const Shot8In = () => {
  const f = useCurrentFrame();
  const ready = useFontsReady();
  const s = prog(f, 4, 30, ramp), m = prog(f, 22, 56, smooth);
  const p = f < 56 ? 0.6 : key(f, [56, 120, 150], [0.6, CROSS, 1], (x) => x);
  const N = 160;
  const pulse = useMemo(() => pulsePts(1), []);
  const main: V3[] = Array.from({ length: N + 1 }, (_, k) => {
    const q = k / N, u = q * p;
    const wA = mix(1.227, CH_W * 0.6, s), cA = mix(0, -CH_W / 2 + CH_W * 0.3, s);
    const xA = cA + (q - 0.5) * wA;
    const xB = -CH_W / 2 + u * CH_W;
    const pi = Math.min(71, Math.round(q * 71));
    const yP = pulse[pi][1] * 1.227;
    return [f < 56 ? xA : xB, mix(yP, vy(at(MAIN, u)), m), 0];
  });
  const others = ["sueno", "movilidad", "ritmo", "fisiologia"].map((k) => Array.from({ length: 81 }, (_, j) => { const u = (j / 80) * p; return [-CH_W / 2 + u * CH_W, vy(at(S.domains[k], u)), -0.01] as V3; }));
  const crossed = f >= 120;
  const amber = hit(f, 120, 16);
  const e = prog(f, 34, 100, smooth); // despiece
  const az = key(f, [26, 100], [0, -0.55], smooth);
  const rad = key(f, [26, 100, 190, 210], [3.0, 4.4, 1.9, -0.4], (x) => x);
  const rr = f < 190 ? mix(3.0, 4.4, e) * (1 - prog(f, 100, 190, smooth)) + 1.9 * prog(f, 100, 190, smooth) : mix(1.9, -0.35, prog(f, 190, 210, Easing.in(Easing.cubic)));
  void rad;
  const chartZ = 0.12 + e * 0.75;
  const focusPt: V3 = [mix(0, CROSS_PT[0], prog(f, 100, 170, smooth)), mix(0, CROSS_PT[1], prog(f, 100, 170, smooth)), chartZ];
  const pos: V3 = [focusPt[0] + rr * Math.sin(az), focusPt[1] + rr * 0.12 * e, focusPt[2] + rr * Math.cos(az)];
  const labels = useMemo(() => ready ? {
    title: wordTex("Pablo · phone & connection", 120, C.grey, "", 600), th: wordTex(`threshold ${TH}`, 110, crossed ? C.amber : C.grey, "", 600),
    d0: wordTex(S.labels[0].replace(/^\w+ /, ""), 100, C.grey, "", 500), d1: wordTex(S.labels[S.labels.length - 1].replace(/^\w+ /, ""), 100, C.grey, "", 500),
  } : null, [ready, crossed]);
  const lab = prog(f, 40, 70);
  return (
    <AbsoluteFill>
      <Stage bg={C.bg}>
        <Cam pos={pos} look={focusPt} fov={36} />
        <Lights />
        <LightBg f={f} />
        <Person kind="bust" seed={41} n={4200} position={[1.9, -0.5, -2.8]} scale={3.4} color={C.green} colorB="#A3ADA9" mix={1 - prog(f, 60, 140, smooth)} opacity={0.55} size={0.02} focus={4} aperture={0.08} additive={false} time={f / 30} spread={1} />
        {/* el móvil de Pablo, separado en capas */}
        <group position={[0, 0, -0.2 - e * 0.7]} scale={1.75}>
          <Phone shot="pablo-ask" screenOffset={e * 0.25} bright={mix(1, 0.92, e)} sweepAmt={0} />
        </group>
        <mesh position={[0, 0, -0.2 + e * 0.15]}><planeGeometry args={[1.75, 1.75 * PHONE_H]} /><meshBasicMaterial color="#ffffff" transparent opacity={0.18 * e} /></mesh>
        <group position={[0, 0, chartZ]}>
          <mesh position={[0, 0.1, -0.03]}><planeGeometry args={[CH_W + 0.5, CH_H + 0.75]} /><meshBasicMaterial color="#ffffff" transparent opacity={0.9 * prog(f, 26, 56)} /></mesh>
          <mesh position={[0, vy(TH), 0]}><planeGeometry args={[CH_W, crossed ? 0.014 : 0.008]} /><meshBasicMaterial color={crossed ? C.amber : "#AAB4AF"} transparent opacity={prog(f, 40, 60)} /></mesh>
          {crossed && <Glow position={[0, vy(TH), 0.01]} size={CH_W * 0.6} color={C.amber} opacity={0.12 + amber * 0.25} additive={false} />}
          {f >= 56 && others.map((o, i) => <LightStroke key={i} points={o} color="#C3CBC7" width={0.004} additive={false} opacity={prog(f, 56, 80)} />)}
          <LightStroke points={main} color={f < 30 ? "#E39B2D" : C.green} width={0.011} additive={false} />
          {crossed && <><Glow position={CROSS_PT} size={0.35 + amber * 0.6} color={C.amber} opacity={0.6} additive={false} /><mesh position={[CROSS_PT[0], CROSS_PT[1], 0.01]}><circleGeometry args={[0.035, 32]} /><meshBasicMaterial color={C.amber} /></mesh></>}
          {labels && <>
            <Label tex={labels.title.tex} width={0.16 * labels.title.aspect} height={0.16} position={[-CH_W / 2 + 0.08 * labels.title.aspect, CH_H / 2 + 0.24, 0]} opacity={lab} />
            <Label tex={labels.th.tex} width={0.14 * labels.th.aspect} height={0.14} position={[CH_W / 2 - 0.07 * labels.th.aspect, vy(TH) + 0.12, 0]} opacity={lab} />
            <Label tex={labels.d0.tex} width={0.13 * labels.d0.aspect} height={0.13} position={[-CH_W / 2 + 0.065 * labels.d0.aspect, -CH_H / 2 - 0.16, 0]} opacity={lab} />
            <Label tex={labels.d1.tex} width={0.13 * labels.d1.aspect} height={0.13} position={[CH_W / 2 - 0.065 * labels.d1.aspect, -CH_H / 2 - 0.16, 0]} opacity={lab} />
          </>}
        </group>
      </Stage>
      <MaskUp lines={["When a companion goes quiet,", "we notice."]} f={f} start={120} size={78} style={{ left: 140, top: 96, opacity: 1 - prog(f, 192, 202) }} />
      <AbsoluteFill style={{ background: `radial-gradient(circle at 50% 50%, ${C.amber} 0%, #E9A15A 45%, #F5E3CF 100%)`, opacity: prog(f, 196, 210, Easing.in(Easing.quad)) }} />
    </AbsoluteFill>
  );
};

// ---------- 9 · "Peers first. Clinic always." ----------
const S1: V3 = [0, 0, 0], S2: V3 = [0.5, 0.1, -10], S3: V3 = [-0.4, 0, -20], PB: V3 = [0, 0, -30];
const CHAIN: { p: V3; at: number }[] = [
  { p: [-2.2, 0.7, -4], at: 58 }, { p: [2.4, -0.7, -5.6], at: 61 }, { p: [-1.9, -0.9, -7.6], at: 64 },
  { p: [2.3, 0.8, -13], at: 120 }, { p: [-2.5, -0.4, -15], at: 123 }, { p: [1.9, -1.0, -17.4], at: 126 },
];
const RING = Array.from({ length: 7 }, (_, i) => (i / 7) * Math.PI * 2 + 0.3);
export const Shot9 = () => { const f = useCurrentFrame(); return <MotionBlur on={f < 10 || (f >= 56 && f < 70) || (f >= 116 && f < 130) || (f >= 146 && f < 160)}><Shot9In /></MotionBlur>; };
const Shot9In = () => {
  const f = useCurrentFrame();
  const z = f < 57 ? mix(4.2, 3.5, prog(f, 0, 57, smooth))
    : f < 117 ? mix(3.5, S2[2] + 3.8, ramp(prog(f, 57, 80))) - 0.4 * prog(f, 80, 117, smooth)
    : f < 147 ? mix(S2[2] + 3.4, S3[2] + 2.5, ramp(prog(f, 117, 140)))
    : f < 165 ? mix(S3[2] + 2.5, PB[2] + 2.6, ramp(prog(f, 147, 165)))
    : mix(PB[2] + 2.6, PB[2] + 8.6, ramp(prog(f, 165, 210)));
  const x = f < 57 ? 0.75 : f < 117 ? mix(0.75, S2[0] + 0.75, prog(f, 57, 80, smooth)) : f < 147 ? mix(S2[0] + 0.75, -0.62, prog(f, 117, 140, smooth)) : mix(-0.62, 0, prog(f, 147, 170, smooth));
  const y = f < 117 ? 0.05 + 0.05 * prog(f, 57, 80) : f < 147 ? mix(0.1, -0.12, prog(f, 117, 140, smooth)) : mix(-0.12, 0.1, prog(f, 147, 170, smooth));
  const pos: V3 = [x + 0.08 * Math.sin(f * 0.04), y, z];
  const look: V3 = [x, y, z - 3];
  const conv = prog(f, 150, 200, smooth);
  return (
    <AbsoluteFill>
      <Stage bg={C.bg}>
        <Cam pos={pos} look={look} fov={40} roll={0.03 * Math.sin(f * 0.03)} />
        <Lights />
        <Glow position={[0, 0, -60]} size={90} color={C.sage} opacity={0.9} additive={false} />
        <Dust n={500} box={[14, 8, 44]} center={[0, 0, -14]} color={C.green} size={0.02} focus={3} aperture={0.05} opacity={0.22} additive={false} time={f / 30} spread={1} />
        <Phone shot="marta-ask" position={S1} rotation={[0, 0.12, 0]} />
        <WriteOn text="Peers" height={0.62} p={prog(f, 10, 32)} position={[0.3, -0.62, S1[2] + 0.25]} />
        <Phone shot="pablo-marta" position={S2} rotation={[0, -0.1, 0]} />
        <WriteOn text="first." height={0.62} p={prog(f, 80, 100)} position={[S2[0] + 0.3, -0.5, S2[2] + 0.25]} />
        <ShotPanel shot="clinic" width={6} position={S3} />
        <WriteOn text="Clinic always." height={0.4} p={prog(f, 128, 144)} position={[-2.05, -0.62, S3[2] + 0.12]} />
        {CHAIN.map((c, i) => {
          const lit = prog(f, c.at, c.at + 6);
          const drift = prog(f, c.at, c.at + 60, smooth) * 0.35;
          return (
            <group key={i} position={[c.p[0] * (1 - drift), c.p[1] * (1 - drift), c.p[2]]}>
              <Person kind="bust" seed={60 + i} n={1600} scale={0.9} color={C.green} colorB="#B3BCB8" mix={lit} opacity={0.5 + 0.4 * lit} size={0.016} focus={2.5} aperture={0.03} additive={false} time={f / 30} spread={1} />
              <Glow size={1.4} color={C.green} opacity={0.25 * lit} additive={false} />
            </group>
          );
        })}
        <group position={PB}>
          <Person kind="bust" seed={41} n={3200} scale={1.5} color={C.green} colorB="#A3ADA9" mix={prog(f, 158, 196, smooth)} opacity={0.9} size={0.018} focus={4} aperture={0.03} additive={false} time={f / 30} spread={1} />
          <Glow size={3.2} color={C.green} opacity={0.3 * prog(f, 160, 200)} additive={false} />
          {RING.map((a, i) => {
            const rad = mix(4.2, 2.0, conv);
            const pp: V3 = [Math.cos(a) * rad * 1.3, Math.sin(a) * rad * 0.75, -0.4 - (i % 2) * 0.5];
            return (
              <group key={i}>
                <Person kind="bust" seed={80 + i} n={1500} position={pp} scale={0.95} color={C.green} colorB="#B3BCB8" mix={prog(f, 150 + i * 3, 162 + i * 3)} opacity={0.75} size={0.016} focus={6} aperture={0.03} additive={false} time={f / 30} spread={1} />
                <LightStroke points={[[pp[0] * 0.8, pp[1] * 0.8, pp[2]], [0, 0, 0]]} color={C.green} width={0.006} additive={false} opacity={0.6} progress={prog(f, 168 + i * 2, 186 + i * 2)} />
              </group>
            );
          })}
        </group>
      </Stage>
      <AbsoluteFill style={{ background: `radial-gradient(circle at 50% 50%, ${C.amber} 0%, #E9A15A 45%, #F5E3CF 100%)`, opacity: 1 - prog(f, 0, 12, Easing.out(Easing.quad)) }} />
    </AbsoluteFill>
  );
};

// ---------- 10 · "One tap back to each other." ----------
const IN_BTN: [number, number] = [128, 573];
const CHECK: [number, number] = [41, 561];
const FINGER: V3[] = [[-0.11, -1.2, 0], [-0.11, -0.25, 0], [-0.1, -0.06, 0], [-0.05, 0.03, 0], [0, 0.05, 0], [0.05, 0.03, 0], [0.1, -0.06, 0], [0.11, -0.25, 0], [0.11, -1.2, 0]];
const NAIL: V3[] = [[-0.055, -0.14, 0], [-0.05, -0.04, 0], [0, -0.01, 0], [0.05, -0.04, 0], [0.055, -0.14, 0]];
const HAND_L: V3[] = [[-0.6, -0.55, 0], [-0.66, -0.95, 0], [-0.6, -1.32, 0], [-0.42, -1.6, 0], [-0.36, -2.6, 0]];
const HAND_R: V3[] = [[0.6, -0.3, 0], [0.66, -0.8, 0], [0.6, -1.3, 0], [0.42, -1.62, 0], [0.38, -2.6, 0]];
const THUMB: V3[] = [[-0.6, -0.55, 0.02], [-0.5, -0.25, 0.04], [-0.38, -0.1, 0.06], [-0.3, -0.16, 0.06], [-0.4, -0.5, 0.04], [-0.48, -0.7, 0.02]];
const FING: V3[][] = [0.32, 0.02, -0.28].map((y) => [[0.55, y, 0.02], [0.66, y - 0.03, 0.03], [0.68, y - 0.14, 0.03], [0.58, y - 0.2, 0.02]] as V3[]);
export const Shot10 = () => { const f = useCurrentFrame(); return <MotionBlur on={(f >= 76 && f < 98) || f >= 130}><Shot10In /></MotionBlur>; };
const Shot10In = () => {
  const f = useCurrentFrame();
  const btn = onScreen(...IN_BTN, 0.05);
  const pull = ramp(prog(f, 76, 106));
  const rise = prog(f, 130, 152, Easing.in(Easing.cubic));
  const phoneRot: V3 = [mix(-0.05, -0.18, pull), mix(0.0, 0.28, pull), mix(0, 0.05, pull)];
  const macroPos: V3 = [btn[0] + 0.02 * Math.sin(f * 0.05) + 0.03, btn[1] - 0.05 + 0.03 * prog(f, 0, 60), 0.34 - 0.04 * prog(f, 0, 60)];
  const widePos: V3 = [1.25, 0.25, 4.6];
  const pos: V3 = [mix(macroPos[0], widePos[0], pull), mix(macroPos[1], widePos[1], pull) + rise * 3, mix(macroPos[2], widePos[2], pull)];
  const look: V3 = [mix(btn[0], 1.35, pull), mix(btn[1], 0.0, pull) + rise * 5, mix(0, 0, pull)];
  const approach = prog(f, 0, 60, Easing.out(Easing.quad));
  const lift = prog(f, 64, 82, smooth);
  const fingerPos: V3 = [btn[0] + mix(0.42, 0, approach) + lift * 0.3, btn[1] + mix(-0.45, -0.02, approach) - lift * 0.3, mix(0.3, 0.07, approach) + lift * 0.2];
  const click = hit(f, 60, 14);
  const done = prog(f, 64, 78, smooth);
  const ck = onScreen(...CHECK, 0.055);
  const handP = prog(f, 82, 108, smooth);
  return (
    <AbsoluteFill>
      <Stage bg={C.bg}>
        <Cam pos={pos} look={look} fov={mix(30, 36, pull)} />
        <Lights />
        <LightBg f={f} />
        <group rotation={phoneRot}>
          <Phone shot="luis-plan" next="luis-plan-in" swap={prog(f, 62, 66)} focus={[IN_BTN[0] / 390, IN_BTN[1] / 844]} focusAmt={1 - pull} focusR={0.05} bright={1 - click * 0.06} sweepAmt={0} />
          <Glow position={btn} size={0.05 + click * 0.5} color={C.green} opacity={click * 0.6} additive={false} />
          {f >= 60 && f < 80 && <LightStroke points={Array.from({ length: 40 }, (_, i) => [Math.cos((i / 39) * Math.PI * 2) * 0.05, Math.sin((i / 39) * Math.PI * 2) * 0.05, 0] as V3)} closed color={C.green} width={0.002} additive={false} opacity={1 - prog(f, 60, 78)} position={btn} scale={1 + prog(f, 60, 78) * 4} />}
          {f >= 64 && <LightStroke points={[[-0.012, 0, 0], [-0.003, -0.01, 0], [0.016, 0.013, 0]]} color={C.green} width={0.0022} additive={false} progress={done} position={ck} scale={1} />}
          {f < 90 && <group position={fingerPos} rotation={[0.2, 0, 0.72]} scale={0.32}>
            <LightStroke points={FINGER} color={C.greenDark} width={0.012} additive={false} opacity={0.9 * (1 - prog(f, 78, 88))} />
            <LightStroke points={NAIL} color={C.greenDark} width={0.008} additive={false} opacity={0.6 * (1 - prog(f, 78, 88))} />
          </group>}
          {handP > 0 && <group>
            {[HAND_L, HAND_R, THUMB, ...FING].map((h, i) => <LightStroke key={i} points={h} color={C.green} width={0.01} additive={false} progress={handP} opacity={0.85} />)}
          </group>}
        </group>
      </Stage>
      <div style={{ position: "absolute", left: 980, top: 410, opacity: 1 - prog(f, 134, 142) }}>
        <Giant text="One tap back" p={prog(f, 92, 106)} size={112} color={C.ink} from={8} style={{ position: "relative", transformOrigin: "30% 60%" }} />
        <Giant text="to each other." p={prog(f, 95, 109)} size={112} color={C.green} from={8} style={{ position: "relative", transformOrigin: "30% 40%" }} />
      </div>
    </AbsoluteFill>
  );
};

// ---------- 11 · "The first sign you need help is when you stop being able to give it." ----------
const skyFS = `uniform float uDawn; varying vec2 vUv;
  void main(){
    vec3 topN = vec3(0.03,0.06,0.13), horN = vec3(0.08,0.12,0.22);
    vec3 topD = vec3(0.55,0.68,0.82), horD = vec3(0.98,0.79,0.56);
    float y = vUv.y;
    vec3 c = mix(mix(horN, topN, y), mix(horD, topD, pow(y, 0.8)), uDawn);
    float sun = exp(-pow(length((vUv - vec2(0.62, 0.36)) * vec2(1.6, 1.0)) * 4.0, 2.0)) * uDawn;
    gl_FragColor = vec4(c + vec3(1.0,0.85,0.6) * sun * 0.9, 1.0);
  }`;
const Sky: React.FC<{ dawn: number }> = ({ dawn }) => {
  const mat = useMemo(() => new THREE.ShaderMaterial({ vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`, fragmentShader: skyFS, uniforms: { uDawn: { value: 0 } } }), []);
  mat.uniforms.uDawn.value = dawn;
  return <mesh position={[1.5, 1, -7]} material={mat}><planeGeometry args={[26, 14]} /></mesh>;
};
let hillTex: THREE.Texture | null = null;
const getHills = () => {
  if (hillTex) return hillTex;
  const cv = document.createElement("canvas"); cv.width = 1024; cv.height = 256; const ctx = cv.getContext("2d")!; const r = rng(8);
  ctx.fillStyle = "#000"; ctx.beginPath(); ctx.moveTo(0, 256);
  for (let x = 0; x <= 1024; x += 8) ctx.lineTo(x, 150 + Math.sin(x * 0.006) * 30 + Math.sin(x * 0.02) * 10);
  ctx.lineTo(1024, 256); ctx.fill();
  for (let i = 0; i < 70; i++) { const x = r() * 1024, h = 30 + r() * 60, y = 150 + Math.sin(x * 0.006) * 30 + 10; ctx.beginPath(); ctx.moveTo(x, y - h); ctx.lineTo(x - h * 0.3, y); ctx.lineTo(x + h * 0.3, y); ctx.fill(); }
  hillTex = new THREE.CanvasTexture(cv); return hillTex;
};
const WIN = { cx: 1.75, cy: 0.75, w: 2.3, h: 2.7 };
const SNOW_N = 900;
export const Shot11 = () => { const f = useCurrentFrame(); return <MotionBlur on={f < 10}><Shot11In /></MotionBlur>; };
const Shot11In = () => {
  const f = useCurrentFrame();
  const dawn = prog(f, 14, 112, smooth);
  const up = ramp(prog(f, 0, 14));
  const pos: V3 = [mix(0.55, 0.45, prog(f, 0, 120)), mix(-2.2, 0.35, up), mix(5.7, 4.75, prog(f, 8, 120, (x) => x))];
  const look: V3 = [0.6, mix(1.8, 0.55, up), 0];
  const snowSeed = useMemo(() => { const r = rng(12); return Float32Array.from({ length: SNOW_N * 4 }, () => r()); }, []);
  const snow = useMemo(() => new Float32Array(SNOW_N * 3), []);
  for (let i = 0; i < SNOW_N; i++) {
    const a = snowSeed[i * 4], b = snowSeed[i * 4 + 1], c = snowSeed[i * 4 + 2], d = snowSeed[i * 4 + 3];
    const t = f / 30;
    snow[i * 3] = WIN.cx - 2.6 + a * 5.2 + Math.sin(t * 0.8 + d * 9) * 0.08;
    snow[i * 3 + 1] = -1.6 + ((b * 5 - t * (0.25 + d * 0.3)) % 5 + 5) % 5;
    snow[i * 3 + 2] = -0.35 - c * 4;
  }
  const wall = new THREE.Color("#141C20").lerp(new THREE.Color("#5A4A3E"), dawn * 0.75);
  const l = WIN.cx - WIN.w / 2, rgt = WIN.cx + WIN.w / 2, top = WIN.cy + WIN.h / 2, bot = WIN.cy - WIN.h / 2;
  return (
    <AbsoluteFill>
      <Stage bg="#06090C">
        <Cam pos={pos} look={look} fov={40} />
        <ambientLight intensity={0.15 + dawn * 0.5} color={new THREE.Color("#9FB3C8").lerp(new THREE.Color("#FFD6A8"), dawn)} />
        <directionalLight position={[WIN.cx + 1, WIN.cy + 0.6, -5]} intensity={dawn * 1.8} color="#FFD3A0" />
        <Sky dawn={dawn} />
        <mesh position={[1.6, -0.15, -5.5]}><planeGeometry args={[18, 4.5]} /><meshBasicMaterial map={getHills()} color={new THREE.Color("#070B12").lerp(new THREE.Color("#5C6378"), dawn * 0.6)} transparent alphaTest={0.4} /></mesh>
        <PtsLive positions={snow} color="#ffffff" size={0.022} focus={5} aperture={0.03} additive={false} opacity={0.9} />
        {/* pared con hueco de ventana */}
        {[[(l - 9) / 2, 0.5, l + 9, 12], [(rgt + 12) / 2, 0.5, 12 - rgt, 12], [WIN.cx, (top + 6.5) / 2, WIN.w, 6.5 - top], [WIN.cx, (bot - 5.5) / 2, WIN.w, bot + 5.5]].map(([x, y, w, h], i) => (
          <mesh key={i} position={[x, y, 0]}><planeGeometry args={[w, h]} /><meshStandardMaterial color={wall} roughness={0.95} /></mesh>
        ))}
        {[[WIN.cx, WIN.cy, 0.07, WIN.h], [WIN.cx, WIN.cy, WIN.w, 0.07], [l, WIN.cy, 0.1, WIN.h], [rgt, WIN.cy, 0.1, WIN.h], [WIN.cx, top, WIN.w + 0.1, 0.1], [WIN.cx, bot, WIN.w + 0.1, 0.1]].map(([x, y, w, h], i) => (
          <mesh key={i} position={[x, y, 0.03]}><boxGeometry args={[w, h, 0.12]} /><meshStandardMaterial color={new THREE.Color("#1E272B").lerp(new THREE.Color("#E9DCCB"), dawn * 0.55)} roughness={0.7} /></mesh>
        ))}
        <mesh position={[WIN.cx, bot - 0.07, 0.18]}><boxGeometry args={[WIN.w + 0.5, 0.08, 0.4]} /><meshStandardMaterial color={new THREE.Color("#1E272B").lerp(new THREE.Color("#E9DCCB"), dawn * 0.55)} /></mesh>
        <Glow position={[WIN.cx + 0.4, WIN.cy - 0.3, -4]} size={4 + dawn * 6} color="#FFD9A6" opacity={dawn * 0.5} />
      </Stage>
      <div style={{ position: "absolute", left: 140, top: 330, textShadow: "0 2px 24px rgba(0,0,0,0.45)" }}>
        <MaskWipe text="The first sign" p={prog(f, 16, 34)} size={76} style={{ position: "relative" }} />
        <MaskWipe text="you need help" p={prog(f, 22, 40)} size={76} style={{ position: "relative" }} />
        <div style={{ height: 34 }} />
        <MaskWipe text="is when you stop" p={prog(f, 50, 68)} size={76} style={{ position: "relative", color: "#FFE2BC" }} color="#FFE2BC" />
        <MaskWipe text="being able to give it." p={prog(f, 56, 74)} size={76} style={{ position: "relative" }} color="#FFE2BC" />
      </div>
      <AbsoluteFill style={{ background: "#FFF6E8", opacity: prog(f, 100, 120, Easing.in(Easing.quad)) }} />
    </AbsoluteFill>
  );
};

// ---------- 12 · Logo ----------
export const Shot12 = () => {
  const f = useCurrentFrame();
  const az = mix(-0.13, 0.13, prog(f, 0, 90, smooth));
  const r = 6.3;
  return (
    <AbsoluteFill>
      <Stage bg={C.bg} shadows>
        <Cam pos={[-0.45 + r * Math.sin(az), 1.7, r * Math.cos(az)]} look={[-0.45, 1.0, 0]} fov={36} />
        <fog attach="fog" args={[C.bg, 7, 22]} />
        <hemisphereLight args={["#ffffff", "#DDE5E1", 1.1]} />
        <directionalLight position={[3, 6, 4]} intensity={1.6} castShadow shadow-mapSize={[2048, 2048]} />
        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[200, 200]} /><meshStandardMaterial color="#E6EAE6" roughness={0.95} /></mesh>
        <group rotation={[0, 0.5, 0]}>
          <Chair color="#D2DAD6" />
          <Person kind="bust" seed={90} n={3400} position={[0, 1.3, -0.22]} scale={0.95} color="#55635D" opacity={0.95} size={0.012} focus={5.4} aperture={0.01} additive={false} time={f / 30} spread={1} />
        </group>
        <Person kind="stand" seed={31} n={5200} position={[1.35, 0.95, 0.55]} scale={1.9} color={C.green} opacity={0.9} size={0.013} focus={5.4} aperture={0.01} additive={false} time={f / 30} spread={1} />
        <Dust n={160} box={[12, 6, 8]} center={[0, 1.5, -1]} color={C.green} size={0.018} focus={5} aperture={0.05} opacity={0.2} additive={false} time={f / 30} />
      </Stage>
      <SweepReveal p={prog(f, 12, 40, smooth)} style={{ left: 150, top: 150 }}>
        <Logo size={170} />
        <div style={{ fontFamily: INTER, fontWeight: 600, fontSize: 40, color: C.grey, marginTop: 18, letterSpacing: "-0.01em" }}>Team Ackerman Family · Junction 2026</div>
      </SweepReveal>
      <AbsoluteFill style={{ background: "#FFF6E8", opacity: 1 - prog(f, 0, 16, Easing.out(Easing.quad)) }} />
      <AbsoluteFill style={{ background: "#000", opacity: prog(f, 66, 90, smooth) }} />
    </AbsoluteFill>
  );
};
