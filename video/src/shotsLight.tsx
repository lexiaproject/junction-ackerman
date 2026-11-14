// Planos 6-12 (paleta clara de Relevo): nota de voz de Luis, corazón de Pablo, gráfica real de Pablo,
// "Peers first. Clinic always.", el "I'm in", la ventana con nieve al amanecer y el final.
import React, { useMemo } from "react";
import { AbsoluteFill, Easing, useCurrentFrame } from "remotion";
import * as THREE from "three";
import { Cam, Chair, Person, Phone, LightStroke, ShotPanel, onScreen, PtsLive, Backdrop, Bokeh, Env, Heart3D, Glow, Pts } from "./kit";
import { Block, Words, PassReveal, Rise, Focus, ScaleIn, SweepReveal, Logo, MotionBlur, DirBlur } from "./overlay";
import { Stage } from "./shotsDark";
import { C, prog, mix, key, hit, ramp, smooth, rng, clamp01, INTER, uvOf } from "./lib";
import series from "../public/shots/pablo-series.json";

type V3 = [number, number, number];
const FOV = 36;

// Mundo claro común: reflejos, fondo con degradados que se mueven, luces de estudio y círculos de luz
const World: React.FC<{ f: number; bokeh?: { center?: V3; box?: V3; n?: number } }> = ({ f, bokeh }) => (
  <>
    <Env intensity={1} />
    <Backdrop time={f / 30} />
    <ambientLight intensity={0.5} />
    <directionalLight position={[3, 4, 5]} intensity={1.4} />
    <directionalLight position={[-4, 1, 2]} intensity={0.5} color="#DCEFE6" />
    <Bokeh n={bokeh?.n ?? 46} center={bokeh?.center ?? [0, 0, -7]} box={bokeh?.box ?? [22, 12, 10]} time={f / 30} opacity={0.55} />
  </>
);

// Proyección de un punto 3D a píxeles de pantalla (para sincronizar textos HTML con objetos 3D)
function toScreen(p: V3, pos: V3, look: V3, fov = FOV) {
  const cam = new THREE.PerspectiveCamera(fov, 16 / 9, 0.01, 400);
  cam.position.set(...pos); cam.lookAt(...look); cam.updateMatrixWorld();
  const v = new THREE.Vector3(...p).project(cam);
  return [(v.x * 0.5 + 0.5) * 1920, (0.5 - v.y * 0.5) * 1080];
}

// Línea de pulso (ECG) del tamaño justo para que a una distancia D ocupe lo mismo en pantalla en los planos 7 y 8
export function ecg(D: number, grow = 1, n = 260, spike = 1): V3[] {
  const Hv = 2 * D * Math.tan((FOV / 2) * Math.PI / 180), Wv = Hv * 16 / 9;
  const g = (u: number, c: number, w: number) => Math.exp(-Math.pow((u - c) / w, 2));
  return Array.from({ length: n }, (_, i) => {
    const x = (i / (n - 1) - 0.5) * 1.4 * Wv * grow;
    const u = x / Wv;
    const y = Hv * 0.14 * spike * (0.14 * g(u, -0.07, 0.018) - 0.12 * g(u, -0.012, 0.006) + 1.0 * g(u, 0, 0.007) - 0.34 * g(u, 0.014, 0.007) + 0.24 * g(u, 0.075, 0.022));
    return [x, y, 0];
  });
}
const ringPts: V3[] = Array.from({ length: 64 }, (_, i) => [Math.cos((i / 63) * Math.PI * 2), Math.sin((i / 63) * Math.PI * 2), 0]);

// ---------- 6 · "Those who recovered…" ----------
export const Shot6 = () => { const f = useCurrentFrame(); return <DirBlur x={60 * Math.pow(prog(f, 160, 180), 2)}><MotionBlur on={f < 18} samples={14}><Shot6In /></MotionBlur></DirBlur>; };
const Wave: React.FC<{ f: number; center: V3; rise: number; gather: number }> = ({ f, center, rise, gather }) => {
  const n = 26;
  return (
    <group position={[center[0], center[1], center[2] + rise * 0.55]}>
      {Array.from({ length: n }, (_, i) => {
        const x = (i / (n - 1) - 0.5) * 0.78 * (1 - gather);
        const env = Math.sin((i / (n - 1)) * Math.PI);
        const h = (0.03 + env * 0.36 * Math.abs(Math.sin(f * 0.33 + i * 1.7) * Math.cos(f * 0.19 + i * 0.6))) * rise * (1 - gather) + 0.001;
        return <mesh key={i} position={[x, 0, 0]}><capsuleGeometry args={[0.012, h, 6, 12]} /><meshPhysicalMaterial color={C.green} roughness={0.2} clearcoat={1} emissive={C.green} emissiveIntensity={0.3} /></mesh>;
      })}
    </group>
  );
};
const Shot6In = () => {
  const f = useCurrentFrame();
  const out = Easing.bezier(0.3, 0.55, 0.15, 1)(prog(f, 1, 24));
  const az = mix(-0.55, 0.35, prog(f, 0, 165, smooth));
  const r = mix(0.16, 3.9, out);
  const startPt = onScreen(195, 740, 0);
  const tgt: V3 = [mix(startPt[0], 0.75, out), mix(startPt[1], 0.05, out), 0];
  const pos: V3 = [tgt[0] + r * Math.sin(az * out), tgt[1] + 0.2 * out, r * Math.cos(az * out)];
  const gather = prog(f, 150, 162, smooth);
  const shoot = prog(f, 162, 182, Easing.in(Easing.cubic));
  const mic = onScreen(195, 397, 0.06);
  const ball: V3 = [mix(mic[0], 10, shoot), mix(mic[1], 0.3, shoot), mic[2] + 0.55];
  const look: V3 = [mix(tgt[0], ball[0], prog(f, 160, 182, Easing.in(Easing.quad))), tgt[1], 0];
  return (
    <AbsoluteFill>
      <Stage bg={C.bg}>
        <Cam pos={pos} look={look} fov={FOV} />
        <World f={f} />
        <Person kind="bust" seed={31} n={5000} position={[-1.3, -0.4, -3.4]} scale={3.6} color={C.green} opacity={0.32} size={0.014} focus={3.9} aperture={0.02} additive={false} time={f / 30} spread={1} />
        <group position={[0, Math.sin(f * 0.05) * 0.04, 0]} rotation={[0.04, -0.2, 0.02]}>
          <Phone shot="luis-home" next="luis-rec" swap={prog(f, 57, 62)} sweep={mix(-0.4, 1.9, prog(f, 18, 80, smooth))} />
          {f >= 62 && f < 165 && <Wave f={f} center={mic} rise={prog(f, 64, 96, ramp)} gather={gather} />}
        </group>
        {f >= 150 && <group position={ball}>
          <mesh scale={0.05 + 0.04 * gather}><sphereGeometry args={[1, 32, 16]} /><meshBasicMaterial color="#E6FFF7" toneMapped={false} /></mesh>
          <Glow size={0.5} color={C.glow} opacity={0.5 * gather} additive={false} />
        </group>}
      </Stage>
      <Block x={1030} y={392}><Words text={[{ t: "Those who " }, { t: "recovered…", c: C.green }]} f={f} start={92} size={110} maxWidth={820} /></Block>
    </AbsoluteFill>
  );
};

// ---------- 7 · "…walk with the next." ----------
export const Shot7 = () => { const f = useCurrentFrame(); return <DirBlur x={60 * Math.pow(1 - prog(f, 0, 15), 2)}><Shot7In /></DirBlur>; };
const D7 = 2.2;
const heartAt = (f: number, L: V3, P: V3): V3 => {
  const a = prog(f, 90, 135, Easing.bezier(0.35, 0.05, 0.2, 1));
  return [mix(P[0], L[0], a), 0.3 + Math.sin(a * Math.PI) * 0.95, 0.15 + Math.sin(a * Math.PI) * 0.55];
};
const Shot7In = () => {
  const f = useCurrentFrame();
  const sep = key(f, [20, 46, 70, 105], [1.25, 1.95, 1.95, 0.9], smooth);
  const L: V3 = [-sep, 0, 0], P: V3 = [sep, 0, 0];
  const settle = ramp(prog(f, 0, 20));
  const heart = heartAt(f, L, P);
  const landed: V3 = [L[0], 0.3, 0.15];
  const beat = hit(f, 135, 12) + hit(f, 150, 12);
  const push = prog(f, 148, 170, smooth);
  const drift = 0.15 * Math.sin(f * 0.03);
  const camBase: V3 = f < 90 ? [mix(mix(-1.6, P[0] * 0.85, settle), drift, prog(f, 20, 60, smooth)), 0.35, mix(3.4, 5.9, prog(f, 16, 55, smooth))] : [mix(drift, heart[0] * 0.5, prog(f, 90, 120, smooth)), 0.4, 5.9 - 0.4 * prog(f, 90, 148, smooth)];
  const lookBase: V3 = f < 90 ? [mix(mix(-1, P[0], settle), 0, prog(f, 20, 60, smooth)), 0.15, 0] : [mix(0, heart[0], 0.7 * prog(f, 90, 105, smooth)), mix(0.15, heart[1] * 0.5, prog(f, 90, 105, smooth)), 0];
  const hp = f < 135 ? heart : landed;
  const pos: V3 = [mix(camBase[0], hp[0], push), mix(camBase[1], hp[1], push), mix(camBase[2], hp[2] + D7, push)];
  const look: V3 = [mix(lookBase[0], hp[0], push), mix(lookBase[1], hp[1], push), mix(0, hp[2], push)];
  // estela de destellos detrás del corazón
  const trail = useMemo(() => new Float32Array(48 * 3), []);
  const tr = rng(4);
  for (let i = 0; i < 48; i++) { const h = heartAt(f - i * 0.45, L, P); trail.set([h[0] + (tr() - 0.5) * 0.05 * i * 0.1, h[1] + (tr() - 0.5) * 0.05 * i * 0.1, h[2] - 0.02], i * 3); }
  const grow = prog(f, 158, 176, Easing.out(Easing.cubic));
  const heartScale = (f < 158 ? 1 : 1 - prog(f, 158, 174, smooth)) * (0.24 + beat * 0.07) * prog(f, 88, 98, ramp);
  const [hx] = toScreen(f < 135 ? heart : landed, pos, look);
  const textLeft = 560;
  const revealX = f < 90 ? 2400 : f < 135 ? hx : mix(toScreen(landed, pos, look)[0], textLeft - 120, prog(f, 135, 146, smooth));
  return (
    <AbsoluteFill>
      <Stage bg={C.bg}>
        <Cam pos={pos} look={look} fov={FOV} />
        <World f={f} />
        <Person kind="bust" seed={41} n={5000} position={[P[0] + 1.2, -0.35, -3.0]} scale={3.3} color={C.green} colorB="#A8B2AE" mix={prog(f, 100, 160, smooth)} opacity={0.4} size={0.014} focus={5} aperture={0.02} additive={false} time={f / 30} spread={1} />
        <group position={L} rotation={[0, 0.2 * prog(f, 70, 105, smooth), 0]}>
          <Phone shot="luis-home" bright={1 + beat * 0.05} focus={uvOf(195, 160)} focusAmt={push} focusR={0.02} />
        </group>
        <group position={P} rotation={[0, -0.2 * prog(f, 70, 105, smooth), 0]}>
          <Phone shot="pablo-conv" next="pablo-ideas" swap={prog(f, 58, 63)} sweep={mix(-0.4, 1.9, prog(f, 8, 40))} />
        </group>
        {f < 14 && <mesh position={[mix(-3, P[0], prog(f, 0, 10, Easing.out(Easing.cubic))), 0.3, 0.6]} scale={0.06 * (1 - prog(f, 9, 14))}><sphereGeometry args={[1, 24, 12]} /><meshBasicMaterial color="#E6FFF7" toneMapped={false} /></mesh>}
        {sep > 1.4 && <mesh position={[0, 0, -0.3]}><planeGeometry args={[0.008, 7]} /><meshBasicMaterial color={C.green} transparent opacity={clamp01((sep - 1.4) / 0.5) * 0.5} /></mesh>}
        {f >= 88 && f < 135 && <Pts positions={trail} color={C.green} size={0.022} opacity={0.55} additive={false} focus={5} aperture={0.004} />}
        {f >= 88 && heartScale > 0.001 && <Heart3D position={hp} scale={heartScale} rotation={[0, Math.sin(f * 0.06) * 0.35, 0]} glow={beat} />}
        {f >= 135 && f < 168 && [135, 150].map((b) => f >= b && <LightStroke key={b} points={ringPts} closed color={C.green} width={0.003} additive={false} opacity={0.8 * (1 - prog(f, b, b + 16))} position={[landed[0], landed[1], 0.07]} scale={0.12 + prog(f, b, b + 16, Easing.out(Easing.cubic)) * 0.5} />)}
        {f >= 158 && <group position={[landed[0], landed[1], landed[2] + 0.01]}><LightStroke points={ecg(D7, grow)} color={C.green} width={0.0075} additive={false} /></group>}
      </Stage>
      <Block x={textLeft} y={108} style={{ opacity: 1 - prog(f, 150, 160) }}><PassReveal text={[{ t: "…walk with " }, { t: "the next.", c: C.green }]} x={revealX} left={textLeft} dir={-1} size={100} /></Block>
    </AbsoluteFill>
  );
};

// ---------- 8 · "When a companion goes quiet, we notice." ----------
const CH_W = 3.6, CH_H = 1.7, Y0 = -0.6, Y1 = 3.4, TH = 1.5, D8 = 3.0;
const vy = (v: number) => -CH_H / 2 + ((v - Y0) / (Y1 - Y0)) * CH_H;
const S = series as { labels: string[]; domains: Record<string, (number | null)[]> };
const at = (arr: (number | null)[], u: number) => {
  const x = clamp01(u) * (arr.length - 1), i = Math.min(arr.length - 2, Math.floor(x)), t = x - i;
  return (arr[i] ?? 0) * (1 - t) + (arr[i + 1] ?? 0) * t;
};
const MAIN = S.domains.movil_vinculo;
const CROSS = (() => { for (let i = 1; i < MAIN.length; i++) if ((MAIN[i] ?? 0) >= TH && (MAIN[i - 1] ?? 0) < TH) return (i - 1 + (TH - (MAIN[i - 1] ?? 0)) / ((MAIN[i] ?? 0) - (MAIN[i - 1] ?? 0))) / (MAIN.length - 1); return 0.93; })();
const CROSS_PT: V3 = [-CH_W / 2 + CROSS * CH_W, vy(TH), 0];
function wordTex(text: string, px: number, color: string, weight = 600) {
  const cv = document.createElement("canvas"); const ctx = cv.getContext("2d")!;
  ctx.font = `${weight} ${px}px ${INTER}`;
  cv.width = Math.ceil(ctx.measureText(text).width + 8); cv.height = Math.ceil(px * 1.3);
  ctx.font = `${weight} ${px}px ${INTER}`; ctx.textBaseline = "middle"; ctx.fillStyle = color; ctx.fillText(text, 4, cv.height / 2);
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  return { tex, aspect: cv.width / cv.height };
}
const TexLabel: React.FC<{ t: { tex: THREE.Texture; aspect: number }; h: number; position: V3; anchor?: "left" | "right"; opacity?: number }> = ({ t, h, position, anchor = "left", opacity = 1 }) => (
  <mesh position={[position[0] + (anchor === "left" ? 1 : -1) * (h * t.aspect) / 2, position[1], position[2]]}><planeGeometry args={[h * t.aspect, h]} /><meshBasicMaterial map={t.tex} transparent opacity={opacity} depthWrite={false} toneMapped={false} /></mesh>
);
export const Shot8 = () => { const f = useCurrentFrame(); return <MotionBlur on={f >= 186}><Shot8In /></MotionBlur>; };
const Shot8In = () => {
  const f = useCurrentFrame();
  const m = prog(f, 6, 40, smooth); // de pulso a datos
  const p = f < 40 ? 0.6 : key(f, [40, 120, 150], [0.6, CROSS, 1], (x) => x);
  const E = useMemo(() => ecg(D8, 1, 241), []);
  const N = 240;
  const pts: V3[] = Array.from({ length: N + 1 }, (_, k) => {
    const q = k / N;
    const yD = vy(at(MAIN, Math.min(q, p)));
    return [mix(E[k][0], -CH_W / 2 + q * CH_W, m), mix(E[k][1], yD, m), 0];
  });
  const others = ["sueno", "movilidad", "ritmo", "fisiologia"].map((k) => Array.from({ length: 81 }, (_, j) => { const u = (j / 80) * p; return [-CH_W / 2 + u * CH_W, vy(at(S.domains[k], u)), -0.005] as V3; }));
  const crossed = f >= 120;
  const e = prog(f, 18, 96, smooth); // despiece
  const panel = prog(f, 12, 44, ramp);
  const az = key(f, [16, 96], [0, -0.5], smooth);
  const rr = f < 100 ? mix(D8, 4.5, e) : f < 188 ? mix(mix(D8, 4.5, e), 1.9, prog(f, 100, 188, smooth)) : mix(1.9, -0.3, prog(f, 188, 210, Easing.in(Easing.cubic)));
  const chartZ = 0.1 + e * 0.8;
  const focusPt: V3 = [mix(0, CROSS_PT[0], prog(f, 100, 170, smooth)), mix(0, CROSS_PT[1], prog(f, 100, 170, smooth)), chartZ];
  const pos: V3 = [focusPt[0] + rr * Math.sin(az) + 0.08 * Math.sin(f * 0.05) * (1 - e), focusPt[1] + rr * 0.12 * e + 0.04 * prog(f, 0, 30), focusPt[2] + rr * Math.cos(az)];
  const labels = useMemo(() => ({
    title: wordTex("Pablo · phone & connection", 96, C.grey), thG: wordTex(`threshold ${TH}`, 96, C.grey), thA: wordTex(`threshold ${TH}`, 96, C.amber),
    d0: wordTex(S.labels[0].replace(/^\w+ /, ""), 84, C.grey, 500), d1: wordTex(S.labels[S.labels.length - 1].replace(/^\w+ /, ""), 84, C.grey, 500),
  }), []);
  const lab = prog(f, 44, 70);
  const amber = hit(f, 120, 16);
  const iris = prog(f, 192, 210, Easing.in(Easing.cubic));
  return (
    <AbsoluteFill>
      <Stage bg={C.bg}>
        <Cam pos={pos} look={focusPt} fov={FOV} />
        <World f={f} />
        <Person kind="bust" seed={41} n={5000} position={[2.1, -0.5, -3.0]} scale={3.4} color={C.green} colorB="#A8B2AE" mix={1 - prog(f, 60, 140, smooth)} opacity={0.4} size={0.014} focus={4} aperture={0.02} additive={false} time={f / 30} spread={1} />
        {/* el móvil de Pablo se separa en capas: cuerpo, pantalla y, delante, la gráfica */}
        <group position={[-2.5 * e, -0.2 * e, -0.3 - 1.2 * e]} rotation={[0, 0.45 * e, 0]} scale={1.7}>
          <Phone shot="pablo-ask" screenOffset={e * 0.22} bright={mix(1, 0.94, e)} sweepAmt={0} />
        </group>
        <group position={[0, 0, chartZ]}>
          <mesh position={[0, 0.1, -0.03]} scale={[Math.max(panel, 0.001), Math.max(panel, 0.001), 1]}><planeGeometry args={[CH_W + 0.55, CH_H + 0.8]} /><meshPhysicalMaterial color="#ffffff" roughness={0.3} clearcoat={0.6} /></mesh>
          <mesh position={[0, vy(TH), 0]}><planeGeometry args={[CH_W, crossed ? 0.012 : 0.006]} /><meshBasicMaterial color={crossed ? C.amber : "#B2BBB7"} transparent opacity={lab} /></mesh>
          {f >= 40 && others.map((o, i) => <LightStroke key={i} points={o} color="#CDD4D1" width={0.0035} additive={false} opacity={prog(f, 40, 64)} />)}
          <LightStroke points={pts} color={C.green} width={0.0105} additive={false} />
          {crossed && <>
            <LightStroke points={ringPts} closed color={C.amber} width={0.0035} additive={false} opacity={1 - prog(f, 120, 142)} position={[CROSS_PT[0], CROSS_PT[1], 0.01]} scale={0.05 + prog(f, 120, 142, Easing.out(Easing.cubic)) * 0.3} />
            <mesh position={[CROSS_PT[0], CROSS_PT[1], 0.012]} scale={1 + amber * 0.5}><circleGeometry args={[0.032, 40]} /><meshBasicMaterial color={C.amber} /></mesh>
          </>}
          <TexLabel t={labels.title} h={0.13} position={[-CH_W / 2, CH_H / 2 + 0.24, 0]} opacity={lab} />
          <TexLabel t={crossed ? labels.thA : labels.thG} h={0.11} position={[CH_W / 2, vy(TH) + 0.12, 0]} anchor="right" opacity={lab} />
          <TexLabel t={labels.d0} h={0.1} position={[-CH_W / 2, -CH_H / 2 - 0.17, 0]} opacity={lab} />
          <TexLabel t={labels.d1} h={0.1} position={[CH_W / 2, -CH_H / 2 - 0.17, 0]} anchor="right" opacity={lab} />
        </group>
      </Stage>
      <Block x={140} y={100} style={{ opacity: 1 - prog(f, 188, 196) }}><Rise lines={["When a companion", [{ t: "goes quiet, " }, { t: "we notice.", c: C.green }]]} f={f} start={120} size={84} /></Block>
      <AbsoluteFill style={{ background: C.amber, clipPath: `circle(${iris * 1150}px at 50% 50%)`, opacity: iris > 0 ? 1 : 0 }} />
    </AbsoluteFill>
  );
};

// ---------- 9 · "Peers first. Clinic always." ----------
const S1: V3 = [0, 0, 0], S2: V3 = [0.5, 0.1, -10], S3: V3 = [-1.75, 0, -20], PB: V3 = [0, 0, -30];
const CHAIN: { p: V3; at: number }[] = [
  { p: [-2.4, 0.8, -4], at: 45 }, { p: [2.6, -0.8, -5.6], at: 48 }, { p: [-2.1, -1.0, -7.6], at: 51 },
  { p: [2.5, 0.9, -13], at: 90 }, { p: [-2.7, -0.5, -15], at: 93 }, { p: [2.1, -1.1, -17.4], at: 96 },
];
const RING = Array.from({ length: 7 }, (_, i) => (i / 7) * Math.PI * 2 + 0.3);
export const Shot9 = () => { const f = useCurrentFrame(); return <MotionBlur on={(f >= 42 && f < 56) || (f >= 87 && f < 101) || (f >= 147 && f < 161)}><Shot9In /></MotionBlur>; };
const Shot9In = () => {
  const f = useCurrentFrame();
  const z = f < 43 ? mix(4.4, 3.7, prog(f, 0, 43, smooth))
    : f < 88 ? mix(3.7, S2[2] + 3.9, ramp(prog(f, 43, 64))) - 0.4 * prog(f, 64, 88, smooth)
    : f < 148 ? mix(S2[2] + 3.5, S3[2] + 3.6, ramp(prog(f, 88, 110))) - 0.3 * prog(f, 110, 148, smooth)
    : f < 166 ? mix(S3[2] + 3.3, PB[2] + 2.6, ramp(prog(f, 148, 166)))
    : mix(PB[2] + 2.6, PB[2] + 8.6, ramp(prog(f, 166, 210)));
  const x = f < 43 ? 1.0 : f < 88 ? mix(1.0, S2[0] + 1.0, prog(f, 43, 64, smooth)) : f < 148 ? mix(S2[0] + 1.0, 0.2, prog(f, 88, 110, smooth)) : mix(0.2, 0, prog(f, 148, 170, smooth));
  const y = f < 88 ? 0.05 + 0.05 * prog(f, 43, 64) : f < 148 ? mix(0.1, 0.0, prog(f, 88, 110, smooth)) : mix(0, 0.1, prog(f, 148, 170, smooth));
  const pos: V3 = [x + 0.06 * Math.sin(f * 0.04), y, z];
  const look: V3 = [x, y, z - 3];
  const conv = prog(f, 150, 200, smooth);
  const iris = ramp(prog(f, 0, 14));
  return (
    <AbsoluteFill>
      <Stage bg={C.bg}>
        <Cam pos={pos} look={look} fov={40} />
        <World f={f} bokeh={{ center: [0, 0, -16], box: [16, 10, 44], n: 110 }} />
        <Phone shot="marta-ask" position={S1} rotation={[0, 0.14, 0]} />
        <Phone shot="pablo-marta" position={S2} rotation={[0, -0.1, 0]} />
        <ShotPanel shot="clinic" width={4.4} position={S3} rotation={[0, 0.3, 0]} />
        {CHAIN.map((c, i) => {
          const lit = prog(f, c.at, c.at + 6);
          const drift = prog(f, c.at, c.at + 60, smooth) * 0.35;
          return <Person key={i} kind="bust" seed={60 + i} n={2200} position={[c.p[0] * (1 - drift), c.p[1] * (1 - drift), c.p[2]]} scale={0.9} color={C.green} colorB="#B8C1BD" mix={lit} opacity={0.45 + 0.45 * lit} size={0.012} focus={3} aperture={0.012} additive={false} time={f / 30} spread={1} />;
        })}
        <group position={PB}>
          <Person kind="bust" seed={41} n={4200} scale={1.5} color={C.green} colorB="#A8B2AE" mix={prog(f, 158, 196, smooth)} opacity={0.95} size={0.014} focus={4} aperture={0.01} additive={false} time={f / 30} spread={1} />
          {RING.map((a, i) => {
            const rad = mix(4.2, 2.0, conv);
            const pp: V3 = [Math.cos(a) * rad * 1.3, Math.sin(a) * rad * 0.75, -0.4 - (i % 2) * 0.5];
            return (
              <group key={i}>
                <Person kind="bust" seed={80 + i} n={2000} position={pp} scale={0.95} color={C.green} colorB="#B8C1BD" mix={prog(f, 150 + i * 3, 162 + i * 3)} opacity={0.8} size={0.012} focus={6} aperture={0.01} additive={false} time={f / 30} spread={1} />
                <LightStroke points={[[pp[0] * 0.78, pp[1] * 0.78, pp[2]], [0, 0, 0]]} color={C.green} width={0.005} additive={false} opacity={0.55} progress={prog(f, 168 + i * 2, 186 + i * 2)} />
              </group>
            );
          })}
        </group>
      </Stage>
      <Block x={1080} y={420} style={{ opacity: 1 - prog(f, 146, 154) }}>
        <div><Focus text="Peers " p={prog(f, 6, 22)} size={112} inline /><Focus text="first." p={prog(f, 64, 80)} size={112} inline /></div>
        <Focus text={[{ t: "Clinic always.", c: C.green }]} p={prog(f, 110, 126)} size={112} />
      </Block>
      <AbsoluteFill style={{ background: C.amber, WebkitMaskImage: `radial-gradient(circle at 50% 50%, transparent ${iris * 1200}px, #000 ${iris * 1200 + 2}px)`, maskImage: `radial-gradient(circle at 50% 50%, transparent ${iris * 1200}px, #000 ${iris * 1200 + 2}px)`, opacity: iris < 1 ? 1 : 0 }} />
    </AbsoluteFill>
  );
};

// ---------- 10 · "One tap back to each other." ----------
const IN_BTN: [number, number] = [128, 573];
const CHECK: [number, number] = [41, 561];
const FINGER: V3[] = [[-0.11, -1.2, 0], [-0.11, -0.25, 0], [-0.1, -0.06, 0], [-0.05, 0.03, 0], [0, 0.05, 0], [0.05, 0.03, 0], [0.1, -0.06, 0], [0.11, -0.25, 0], [0.11, -1.2, 0]];
const fingerGeo = (() => { const s = new THREE.Shape(); s.moveTo(-0.11, -1.2); s.lineTo(-0.11, -0.25); s.bezierCurveTo(-0.11, -0.05, -0.06, 0.05, 0, 0.05); s.bezierCurveTo(0.06, 0.05, 0.11, -0.05, 0.11, -0.25); s.lineTo(0.11, -1.2); s.lineTo(-0.11, -1.2); return new THREE.ShapeGeometry(s, 24); })();
const NAIL: V3[] = [[-0.055, -0.14, 0], [-0.05, -0.04, 0], [0, -0.01, 0], [0.05, -0.04, 0], [0.055, -0.14, 0]];
// Mano de Luis hecha de partículas (palma bajo el móvil, pulgar a la izquierda y dedos a la derecha)
let handCache: Float32Array | null = null;
const handPts = () => {
  if (handCache) return handCache;
  const cv = document.createElement("canvas"); cv.width = 300; cv.height = 600; const ctx = cv.getContext("2d")!;
  ctx.fillStyle = "#fff"; ctx.strokeStyle = "#fff"; ctx.lineCap = "round";
  ctx.beginPath(); ctx.ellipse(150, 470, 120, 150, 0, 0, Math.PI * 2); ctx.fill(); // palma
  ctx.fillRect(70, 470, 160, 130); // muñeca
  ctx.lineWidth = 46; ctx.beginPath(); ctx.moveTo(52, 420); ctx.quadraticCurveTo(30, 300, 70, 220); ctx.stroke(); // pulgar
  [190, 250, 310, 365].forEach((y) => { ctx.lineWidth = 40; ctx.beginPath(); ctx.moveTo(230, y + 40); ctx.quadraticCurveTo(282, y + 10, 262, y - 20); ctx.stroke(); }); // dedos
  const d = ctx.getImageData(0, 0, 300, 600).data; const r = rng(17); const out: number[] = [];
  while (out.length < 9000 * 3) { const x = Math.floor(r() * 300), y = Math.floor(r() * 600); if (d[(y * 300 + x) * 4 + 3] > 128) out.push(((x - 150) / 300) * 1.5, ((300 - y) / 300) * 1.5 - 1.15, -0.09 - r() * 0.04); }
  handCache = new Float32Array(out);
  return handCache;
};
export const Shot10 = () => { const f = useCurrentFrame(); return <DirBlur y={50 * Math.pow(prog(f, 132, 150), 2)}><MotionBlur on={f >= 76 && f < 98} samples={14}><Shot10In /></MotionBlur></DirBlur>; };
const Shot10In = () => {
  const f = useCurrentFrame();
  const btn = onScreen(...IN_BTN, 0.056);
  const pull = Easing.bezier(0.3, 0.55, 0.15, 1)(prog(f, 76, 108));
  const rise = prog(f, 130, 152, Easing.in(Easing.cubic));
  const phoneRot: V3 = [mix(-0.05, -0.16, pull), mix(0.0, 0.26, pull), mix(0, 0.04, pull)];
  const macroPos: V3 = [btn[0] + 0.02 * Math.sin(f * 0.05) + 0.03, btn[1] - 0.05 + 0.03 * prog(f, 0, 60), 0.34 - 0.04 * prog(f, 0, 60)];
  const widePos: V3 = [1.3, 0.2, 4.9];
  const pos: V3 = [mix(macroPos[0], widePos[0], pull), mix(macroPos[1], widePos[1], pull) + rise * 3, mix(macroPos[2], widePos[2], pull)];
  const look: V3 = [mix(btn[0], 1.4, pull), mix(btn[1], -0.05, pull) + rise * 5, 0];
  const approach = prog(f, 0, 60, Easing.out(Easing.quad));
  const lift = prog(f, 64, 82, smooth);
  const fingerPos: V3 = [btn[0] + mix(0.42, 0, approach) + lift * 0.3, btn[1] + mix(-0.45, -0.02, approach) - lift * 0.3, mix(0.3, 0.075, approach) + lift * 0.2];
  const click = hit(f, 60, 14);
  const done = prog(f, 64, 78, smooth);
  const ck = onScreen(...CHECK, 0.058);
  const handP = prog(f, 80, 104, smooth);
  return (
    <AbsoluteFill>
      <Stage bg={C.bg}>
        <Cam pos={pos} look={look} fov={mix(30, FOV, pull)} />
        <World f={f} />
        <group rotation={phoneRot}>
          <Phone shot="luis-plan" next="luis-plan-in" swap={prog(f, 62, 66)} focus={uvOf(...IN_BTN)} focusAmt={1 - pull} focusR={0.05} bright={1 - click * 0.05} sweepAmt={0} />
          {f >= 60 && f < 80 && <LightStroke points={ringPts} closed color={C.green} width={0.0012} additive={false} opacity={1 - prog(f, 60, 78)} position={btn} scale={0.05 + prog(f, 60, 78, Easing.out(Easing.cubic)) * 0.2} />}
          {f >= 64 && <LightStroke points={[[-0.012, 0, 0], [-0.003, -0.01, 0], [0.016, 0.013, 0]]} color={C.green} width={0.0018} additive={false} progress={done} position={ck} />}
          {f < 90 && <group position={fingerPos} rotation={[0.2, 0, 0.72]} scale={0.32}>
            <mesh geometry={fingerGeo} position={[0, 0, -0.005]}><meshBasicMaterial color={C.sage} transparent opacity={0.55 * (1 - prog(f, 78, 88))} depthWrite={false} /></mesh>
            <LightStroke points={FINGER} color={C.green} width={0.0035} additive={false} opacity={0.8 * (1 - prog(f, 78, 88))} />
            <LightStroke points={NAIL} color={C.green} width={0.0025} additive={false} opacity={0.35 * (1 - prog(f, 78, 88))} />
          </group>}
          {handP > 0 && <Pts positions={handPts()} color={C.green} size={0.012} opacity={0.55 * handP} additive={false} focus={4.9} aperture={0.004} time={f / 30} spread={1} />}
        </group>
      </Stage>
      <Block x={1010} y={400} style={{ opacity: 1 - prog(f, 134, 142) }}>
        <ScaleIn text="One tap back" p={prog(f, 92, 106)} size={118} color={C.ink} from={3} origin="30% 60%" />
        <ScaleIn text="to each other." p={prog(f, 95, 109)} size={118} color={C.green} from={3} origin="30% 40%" />
      </Block>
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
export const Shot11 = () => { const f = useCurrentFrame(); return <DirBlur y={50 * Math.pow(1 - prog(f, 0, 10), 2)}><Shot11In /></DirBlur>; };
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
  const trim = new THREE.Color("#1E272B").lerp(new THREE.Color("#E9DCCB"), dawn * 0.55);
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
        {[[(l - 9) / 2, 0.5, l + 9, 12], [(rgt + 12) / 2, 0.5, 12 - rgt, 12], [WIN.cx, (top + 6.5) / 2, WIN.w, 6.5 - top], [WIN.cx, (bot - 5.5) / 2, WIN.w, bot + 5.5]].map(([x, y, w, h], i) => (
          <mesh key={i} position={[x, y, 0]}><planeGeometry args={[w, h]} /><meshStandardMaterial color={wall} roughness={0.95} /></mesh>
        ))}
        {[[WIN.cx, WIN.cy, 0.07, WIN.h], [WIN.cx, WIN.cy, WIN.w, 0.07], [l, WIN.cy, 0.1, WIN.h], [rgt, WIN.cy, 0.1, WIN.h], [WIN.cx, top, WIN.w + 0.1, 0.1], [WIN.cx, bot, WIN.w + 0.1, 0.1]].map(([x, y, w, h], i) => (
          <mesh key={i} position={[x, y, 0.03]}><boxGeometry args={[w, h, 0.12]} /><meshStandardMaterial color={trim} roughness={0.7} /></mesh>
        ))}
        <mesh position={[WIN.cx, bot - 0.07, 0.18]}><boxGeometry args={[WIN.w + 0.5, 0.08, 0.4]} /><meshStandardMaterial color={trim} /></mesh>
        <Glow position={[WIN.cx + 0.4, WIN.cy - 0.3, -4]} size={4 + dawn * 6} color="#FFD9A6" opacity={dawn * 0.5} />
      </Stage>
      <Block x={140} y={330} style={{ textShadow: "0 2px 30px rgba(0,0,0,0.35)" }}>
        <Focus text="The first sign" p={prog(f, 14, 32)} size={80} color="#ffffff" />
        <Focus text="you need help" p={prog(f, 20, 38)} size={80} color="#ffffff" />
        <div style={{ height: 30 }} />
        <Focus text="is when you stop" p={prog(f, 50, 68)} size={80} color="#FFE2BC" />
        <Focus text="being able to give it." p={prog(f, 56, 74)} size={80} color="#FFE2BC" />
      </Block>
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
        <Cam pos={[-0.45 + r * Math.sin(az), 1.7, r * Math.cos(az)]} look={[-0.45, 1.0, 0]} fov={FOV} />
        <fog attach="fog" args={[C.bg, 7, 22]} />
        <Env intensity={0.6} />
        <hemisphereLight args={["#ffffff", "#DDE5E1", 1.1]} />
        <directionalLight position={[3, 6, 4]} intensity={1.6} castShadow shadow-mapSize={[2048, 2048]} />
        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[200, 200]} /><meshStandardMaterial color="#EEF1EE" roughness={0.95} /></mesh>
        <group rotation={[0, 0.5, 0]}>
          <Chair color="#B3C0BA" />
          <Person kind="bust" seed={90} n={3400} position={[0, 1.3, -0.22]} scale={0.95} color="#55635D" opacity={0.95} size={0.011} focus={6.3} aperture={0.006} additive={false} time={f / 30} spread={1} />
        </group>
        <Person kind="stand" seed={31} n={6000} position={[1.35, 0.95, 0.55]} scale={1.9} color={C.green} opacity={0.95} size={0.011} focus={6.3} aperture={0.006} additive={false} time={f / 30} spread={1} />
        <Bokeh n={30} center={[0, 2.5, -6]} box={[20, 6, 6]} time={f / 30} opacity={0.5} />
      </Stage>
      <SweepReveal p={prog(f, 12, 40)} style={{ left: 150, top: 150 }}>
        <Logo size={170} />
        <div style={{ fontFamily: INTER, fontWeight: 500, fontSize: 40, color: C.grey, marginTop: 20, letterSpacing: "-0.015em" }}>Team Ackerman Family · Junction 2026</div>
      </SweepReveal>
      <AbsoluteFill style={{ background: "#FFF6E8", opacity: 1 - prog(f, 0, 16, Easing.out(Easing.quad)) }} />
      <AbsoluteFill style={{ background: "#000", opacity: prog(f, 66, 90, smooth) }} />
    </AbsoluteFill>
  );
};
