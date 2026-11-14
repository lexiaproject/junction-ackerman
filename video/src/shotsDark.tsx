// Planos 1-5 (paleta oscura): cerebro de hilos de luz, silla bajo el foco, red de neuronas → personas,
// móvil boca abajo en la mesa y el encendido con el logo de partículas.
import React, { useMemo } from "react";
import { AbsoluteFill, Easing } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import * as THREE from "three";
import { Cam, Brain, BRAIN_PULSE, Glow, Dust, Chair, Pts, PtsLive, Phone, LightStroke, ParticleText, Env, Backdrop, Bokeh, PHONE_H } from "./kit";
import { Block, Wipe, Cut, ScaleIn, TypeIn, MotionBlur, DirBlur } from "./overlay";
import { C, prog, mix, key, hit, ramp, smooth, rng, clamp01, neuronPoints, personPoints, GROTESK, INTER, useFontsReady, useF } from "./lib";

type V3 = [number, number, number];
export const Stage: React.FC<{ bg: string; children: React.ReactNode; shadows?: boolean; env?: number }> = ({ bg, children, shadows, env }) => (
  <ThreeCanvas width={1920} height={1080} flat shadows={shadows} gl={{ antialias: true }}>
    <color attach="background" args={[bg]} />
    {env ? <Env intensity={env} /> : null}
    {children}
  </ThreeCanvas>
);

// ---------- 1 · "TMS works." ----------
export const Shot1 = () => { const f = useF(); return <DirBlur y={46 * Math.pow(prog(f, 76, 90), 2)}><Shot1In /></DirBlur>; };
const Shot1In = () => {
  const f = useF();
  const rot: V3 = [0.12, 0.55 - f * 0.0035, 0];
  const pulseW = new THREE.Vector3(...BRAIN_PULSE).applyEuler(new THREE.Euler(...rot));
  const k = prog(f, 0, 80, Easing.out(Easing.cubic));
  const dist = mix(0.2, 4.5, k);
  const target = pulseW.clone().lerp(new THREE.Vector3(-0.95, 0.05, 0), prog(f, 4, 80, smooth));
  const dir = pulseW.clone().normalize().lerp(new THREE.Vector3(0.22, 0.12, 1).normalize(), prog(f, 0, 60, smooth)).normalize();
  const pos = target.clone().add(dir.multiplyScalar(dist));
  // picado final (whip hacia abajo)
  const w = prog(f, 76, 92, Easing.in(Easing.quad));
  const look = target.clone().sub(pos).normalize();
  const right = new THREE.Vector3().crossVectors(look, new THREE.Vector3(0, 1, 0)).normalize();
  look.applyAxisAngle(right, -w * 1.35);
  pos.y += w * 1.2;
  const lookAt = pos.clone().add(look);
  const beats = [15, 30, 45];
  const last = beats.filter((b) => f >= b).pop();
  const wave = last === undefined ? 0 : clamp01((f - last) / 22);
  const lit = (f >= 15 ? 0.22 : 0) + (f >= 30 ? 0.22 : 0) + 0.56 * prog(f, 45, 56);
  const beat = beats.reduce((a, b) => a + hit(f, b, 12), 0);
  const breath = f < 15 ? 0.015 * Math.sin(f * 0.45) : 0;
  return (
    <AbsoluteFill>
      <Stage bg={C.night}>
        <Cam pos={pos.toArray() as V3} look={lookAt.toArray() as V3} fov={38} />
        <group rotation={rot}>
          <Brain pulse={BRAIN_PULSE} wave={wave} lit={lit} opacity={prog(f, 2, 42)} focus={dist} />
          <Glow position={BRAIN_PULSE} size={0.07 + breath + beat * 0.35 + lit * 0.12} color="#DFFFF8" opacity={0.95} />
          <Glow position={BRAIN_PULSE} size={0.5 + beat * 1.4 + lit * 0.7} color={C.glow} opacity={0.35 + beat * 0.4} />
        </group>
        <Dust n={260} box={[14, 8, 14]} color={C.glow} size={0.016} focus={dist} aperture={0.05} opacity={0.45 * prog(f, 10, 50)} time={f / 30} />
        <Glow position={[0.4, 0, -7]} size={16} color="#0E6B5C" opacity={0.22 * prog(f, 0, 40)} />
      </Stage>
      <Block x={150} y={462}><Wipe text="TMS works." p={prog(f, 50, 68)} size={132} /></Block>
    </AbsoluteFill>
  );
};

// ---------- 2 · "Then it ends." ----------
const coneVS = `varying vec2 vUv; varying vec3 vN; varying vec3 vV;
  void main(){ vUv = uv; vec4 mv = modelViewMatrix * vec4(position,1.0); vN = normalize(normalMatrix*normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix*mv; }`;
const coneFS = `uniform float uOp; varying vec2 vUv; varying vec3 vN; varying vec3 vV;
  void main(){ float fres = pow(abs(dot(vN, vV)), 2.0); float a = uOp * fres * mix(0.25, 1.0, vUv.y); gl_FragColor = vec4(vec3(0.85,0.95,1.0), a); }`;
const LightCone: React.FC<{ op: number; h: number; r: number; position: V3 }> = ({ op, h, r, position }) => {
  const mat = useMemo(() => new THREE.ShaderMaterial({ vertexShader: coneVS, fragmentShader: coneFS, transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, uniforms: { uOp: { value: 0 } } }), []);
  mat.uniforms.uOp.value = op;
  return <mesh position={position} material={mat}><coneGeometry args={[r, h, 64, 1, true]} /></mesh>;
};
export const Shot2 = () => { const f = useF(); return <DirBlur y={46 * Math.pow(1 - prog(f, 0, 13), 2)}><Shot2In /></DirBlur>; };
const Shot2In = () => {
  const f = useF();
  const on = f < 60;
  const el = f < 12 ? mix(1.05, 1.53, ramp(prog(f, 0, 12))) : mix(1.53, 0.1, ramp(prog(f, 12, 60))) - 0.03 * prog(f, 60, 90);
  const r = key(f, [12, 60, 90], [6.6, 4.5, 4.0], ramp);
  const az = 0.05 + 0.3 * prog(f, 0, 90, smooth);
  const tgt: V3 = [0, 0.9, 0];
  const pos: V3 = [tgt[0] + r * Math.cos(el) * Math.sin(az), tgt[1] + r * Math.sin(el), tgt[2] + r * Math.cos(el) * Math.cos(az)];
  return (
    <AbsoluteFill>
      <Stage bg="#040706" shadows>
        <Cam pos={pos} look={tgt} fov={40} />
        <ambientLight intensity={on ? 0.06 : 0.015} />
        <spotLight position={[0, 5.6, 0.2]} angle={0.42} penumbra={0.55} intensity={on ? 3.2 : 0} decay={0} castShadow shadow-mapSize={[2048, 2048]} color="#EAF6F3" />
        {!on && <directionalLight position={[-3, 2, -4]} intensity={0.25} color="#5B8FA8" />}
        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[40, 40]} /><meshStandardMaterial color="#121816" roughness={0.92} /></mesh>
        <Chair color="#4A5653" edge={C.glow} edgeOpacity={on ? 0.05 : 0.38} />
        {on && <LightCone op={0.16} h={5.6} r={2.45} position={[0, 2.8, 0.2]} />}
        {on && <Dust n={180} box={[3, 5, 3]} center={[0, 2.6, 0.2]} color="#ffffff" size={0.012} focus={r} aperture={0.03} opacity={0.5} time={f / 30} spread={1} />}
      </Stage>
      <Block x={0} y={818} align="center"><Cut text="Then it ends." on={!on} size={100} /></Block>
    </AbsoluteFill>
  );
};

// ---------- 3 · "The months after are fragile." ----------
const NODES = (() => {
  const r = rng(21); const out: V3[] = [[0, 0, 0]];
  while (out.length < 46) {
    const a = r() * Math.PI * 2, d = 1.6 + Math.sqrt(r()) * 9.5;
    const p: V3 = [Math.cos(a) * d * 1.35, Math.sin(a) * d * 0.8, (r() - 0.5) * 3];
    if (out.every((q) => Math.hypot(q[0] - p[0], q[1] - p[1]) > 1.45)) out.push(p);
  }
  return out;
})();
const OFF = NODES.map((p, i) => i !== 0 && (i % 3 === 1 || i === 7));
const FOLLOW = (() => { let best = 1, bd = 1e9; NODES.forEach((p, i) => { if (!OFF[i]) return; const d = Math.hypot(p[0] - 3.2, p[1] + 1.6); if (d < bd) { bd = d; best = i; } }); return best; })();
const LINKS = (() => {
  const pos: number[] = [];
  NODES.forEach((p, i) => {
    const near = NODES.map((q, j) => [j, Math.hypot(q[0] - p[0], q[1] - p[1])] as [number, number]).filter(([j]) => j !== i).sort((a, b) => a[1] - b[1]).slice(0, 2);
    near.forEach(([j]) => pos.push(...p, ...NODES[j]));
  });
  return new Float32Array(pos);
})();
// silueta de un móvil (contorno y algo de relleno), del mismo alto que la persona: para la transición al plano 4
const phonePts = (n: number) => {
  const r = rng(77), h = 1, w = (h / (PHONE_H + 0.085)) * 1.085, rad = 0.075, out = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    let x: number, y: number;
    if (i < n * 0.7) {
      const t = r() * 4, side = Math.floor(t), u = t - side;
      x = side % 2 === 0 ? (u - 0.5) * w : (side === 1 ? 0.5 : -0.5) * w;
      y = side % 2 === 1 ? (u - 0.5) * h : (side === 0 ? -0.5 : 0.5) * h;
      const cx = Math.min(Math.abs(x), w / 2 - rad), cy = Math.min(Math.abs(y), h / 2 - rad), dx = Math.abs(x) - cx, dy = Math.abs(y) - cy;
      if (dx > 0 && dy > 0) { const a = Math.atan2(dy, dx); x = Math.sign(x) * (cx + Math.cos(a) * rad); y = Math.sign(y) * (cy + Math.sin(a) * rad); }
    } else { x = (r() - 0.5) * w * 0.94; y = (r() - 0.5) * h * 0.96; }
    out.set([x, y, (r() - 0.5) * 0.02], i * 3);
  }
  return out;
};
const Node3: React.FC<{ i: number; morph: number; dim: number; focus: number; t: number; toPhone?: number }> = ({ i, morph, dim, focus, t, toPhone = 0 }) => {
  const src = useMemo(() => neuronPoints(800, 100 + i), [i]);
  const dst = useMemo(() => personPoints(800, 200 + i, "bust"), [i]);
  const ph = useMemo(() => phonePts(800), []);
  const live = useMemo(() => new Float32Array(800 * 3), []);
  if (toPhone > 0) {
    for (let k = 0; k < 2400; k++) live[k] = (src[k] + (dst[k] - src[k]) * morph) * (1 - toPhone) + ph[k] * toPhone;
    return <group position={NODES[i]} scale={0.95}><PtsLive positions={live} color="#8FA39D" size={0.013} opacity={0.9} focus={focus} aperture={0.01} /></group>;
  }
  return <Pts positions={src} target={dst} morph={morph} position={NODES[i]} scale={0.95} color={C.glow} colorB="#3B4946" mix={1 - dim} opacity={1 - 0.55 * dim} size={0.012} focus={focus} aperture={0.03} time={t} twinkle={0.4} spread={1} />;
};
export const Shot3 = () => { const f = useF(); return <MotionBlur on={(f >= 5 && f < 26) || f >= 70} samples={12}><Shot3In /></MotionBlur>; };
const Shot3In = () => {
  const f = useF();
  const z = f < 6 ? mix(0.7, 0.9, f / 6) : mix(0.9, 15, ramp(prog(f, 6, 62)));
  const morph = clamp01((z - 1.8) / 6);
  const T = NODES[FOLLOW];
  const fp = prog(f, 68, 93, ramp);
  const pos = [mix(0.3 * Math.sin(f * 0.03), T[0], fp), mix(-0.4 * prog(f, 0, 60), T[1], fp), mix(z, T[2] + 1.72, fp)] as V3;
  const look = [mix(0, T[0], fp), mix(0, T[1], fp), mix(0, T[2], fp)] as V3;
  const dist = Math.hypot(pos[0] - look[0], pos[1] - look[1], pos[2] - look[2]);
  const linkGeo = useMemo(() => { const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(LINKS, 3)); return g; }, []);
  return (
    <AbsoluteFill>
      <Stage bg={C.night}>
        <Cam pos={pos} look={look} fov={42} />
        {NODES.map((p, i) => {
          const d = Math.hypot(p[0], p[1]);
          const st = 40 + (d / 11) * 24;
          return <Node3 key={i} i={i} morph={morph} dim={OFF[i] ? prog(f, st, st + 8) : 0} focus={dist} t={f / 30} toPhone={i === FOLLOW ? prog(f, 72, 88, smooth) : 0} />;
        })}
        <lineSegments geometry={linkGeo}><lineBasicMaterial color={C.glow} transparent opacity={mix(0.55, 0.16, morph)} blending={THREE.AdditiveBlending} depthWrite={false} /></lineSegments>
        <Dust n={300} box={[40, 24, 16]} color={C.glow} size={0.03} focus={dist} aperture={0.06} opacity={0.3} time={f / 30} />
      </Stage>
      <Block x={150} y={640} style={{ opacity: 1 - prog(f, 70, 80) }}>
        <ScaleIn text="The months after are" p={prog(f, 24, 40)} size={72} color="#B9C7C2" from={1.6} origin="0% 50%" weight={500} />
        <ScaleIn text="fragile." p={prog(f, 31, 46)} size={176} from={5} origin="15% 50%" />
      </Block>
    </AbsoluteFill>
  );
};

// ---------- 4 y 5 · la mesa ----------
let woodTex: THREE.Texture | null = null;
const getWood = () => {
  if (woodTex) return woodTex;
  const cv = document.createElement("canvas"); cv.width = 1024; cv.height = 1024;
  const ctx = cv.getContext("2d")!; const r = rng(4);
  ctx.fillStyle = "#3a3f3c"; ctx.fillRect(0, 0, 1024, 1024);
  for (let i = 0; i < 420; i++) { ctx.strokeStyle = `rgba(${r() < 0.5 ? "255,255,255" : "0,0,0"},${0.02 + r() * 0.05})`; ctx.lineWidth = 1 + r() * 4; ctx.beginPath(); const y = r() * 1024; ctx.moveTo(0, y); ctx.bezierCurveTo(340, y + (r() - 0.5) * 30, 680, y + (r() - 0.5) * 30, 1024, y + (r() - 0.5) * 20); ctx.stroke(); }
  woodTex = new THREE.CanvasTexture(cv); woodTex.wrapS = woodTex.wrapT = THREE.RepeatWrapping; woodTex.repeat.set(12, 12); woodTex.colorSpace = THREE.SRGBColorSpace;
  return woodTex;
};
const cardTex = (title: string, sub: string) => {
  const cv = document.createElement("canvas"); cv.width = 900; cv.height = 210;
  const ctx = cv.getContext("2d")!;
  ctx.fillStyle = "rgba(28,36,34,0.92)"; ctx.beginPath(); ctx.roundRect(4, 4, 892, 202, 44); ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.14)"; ctx.lineWidth = 3; ctx.stroke();
  ctx.fillStyle = "#7FE3CF"; ctx.beginPath(); ctx.roundRect(44, 55, 100, 100, 26); ctx.fill();
  ctx.fillStyle = "#fff"; ctx.font = `700 56px ${INTER}`; ctx.textBaseline = "top"; ctx.fillText(title, 180, 46);
  ctx.fillStyle = "rgba(255,255,255,0.62)"; ctx.font = `500 44px ${INTER}`; ctx.fillText(sub, 180, 118);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
};
const CARDS: [string, string][] = [["Message", "Are you around this week?"], ["Missed call", "2 missed calls"], ["Voice message", "0:42"], ["3 new messages", "Hey, just checking in"]];
// Mano vista desde arriba, dedos hacia la izquierda (hacia el borde del móvil), pulgar arriba
const HAND2D: [number, number][] = [
  [2.1, 0.31], [1.6, 0.33], [1.3, 0.38], [1.12, 0.5], [0.95, 0.6], [0.8, 0.63], [0.72, 0.58], [0.76, 0.5], [0.92, 0.41], [1.02, 0.33],
  [0.86, 0.29], [0.6, 0.27], [0.4, 0.245], [0.31, 0.205], [0.33, 0.16], [0.5, 0.14], [0.66, 0.125],
  [0.52, 0.11], [0.34, 0.09], [0.24, 0.055], [0.235, 0.0], [0.33, -0.025], [0.5, -0.035], [0.66, -0.04],
  [0.52, -0.06], [0.37, -0.085], [0.285, -0.12], [0.3, -0.165], [0.45, -0.18], [0.64, -0.185],
  [0.56, -0.2], [0.45, -0.23], [0.4, -0.265], [0.44, -0.3], [0.6, -0.31], [0.85, -0.32], [1.2, -0.33], [1.6, -0.31], [2.1, -0.27],
];
const HAND: V3[] = HAND2D.map(([x, y]) => [x, y, 0] as V3);
// costuras de los dedos y nudillos (líneas interiores muy suaves)
const HAND_LINES: V3[][] = ([[[0.66, 0.125], [0.92, 0.12], [1.05, 0.14]], [[0.66, -0.04], [0.92, -0.045], [1.05, -0.03]], [[0.64, -0.185], [0.9, -0.2], [1.02, -0.19]], [[1.02, 0.33], [1.1, 0.2], [1.15, 0.0], [1.12, -0.2]]] as [number, number][][]).map((l) => l.map(([x, y]) => [x, y, 0] as V3));
const handFill = (() => {
  const curve = new THREE.CatmullRomCurve3(HAND.map((p) => new THREE.Vector3(...p)), false, "centripetal");
  const pts = curve.getPoints(220).map((v) => new THREE.Vector2(v.x, v.y));
  return new THREE.ShapeGeometry(new THREE.Shape(pts));
})();
const HandLight: React.FC<{ opacity: number; position: V3 }> = ({ opacity, position }) => (
  <group position={position}>
    <mesh geometry={handFill}><meshBasicMaterial color="#7FE3CF" transparent opacity={0.13 * opacity} blending={THREE.AdditiveBlending} depthWrite={false} side={THREE.DoubleSide} /></mesh>
    <LightStroke points={HAND} color="#E6FFF8" width={0.0045} opacity={0.95 * opacity} />
    {HAND_LINES.map((l, i) => <LightStroke key={i} points={l} color="#CFF6EC" width={0.0025} opacity={0.35 * opacity} />)}
  </group>
);
const Table: React.FC<{ glow?: number; light?: number }> = ({ glow = 0, light = 0 }) => (
  <>
    <ambientLight intensity={0.05 + light * 0.25} />
    <directionalLight position={[3, 2.5, -3]} intensity={0.6} color="#7FA6C9" />
    <directionalLight position={[-5, 0.75, 2.2]} intensity={2.4} color="#CFE0F2" castShadow shadow-mapSize={[2048, 2048]} shadow-camera-left={-4} shadow-camera-right={4} shadow-camera-top={4} shadow-camera-bottom={-4} />
    {light > 0 && <pointLight position={[0, 0.9, 0]} intensity={light * 2.2} decay={0} distance={0} color="#F3FFF9" />}
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[120, 120]} /><meshStandardMaterial map={getWood()} color="#9aa29e" roughness={0.75} /></mesh>
    {glow > 0 && <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.003, 0]} scale={[2.2, 3.6, 1]}><planeGeometry args={[1, 1]} /><meshBasicMaterial map={getGlowTexPlane()} color={C.glow} transparent opacity={glow} blending={THREE.AdditiveBlending} depthWrite={false} /></mesh>}
  </>
);
let gtp: THREE.Texture | null = null;
const getGlowTexPlane = () => {
  if (gtp) return gtp;
  const cv = document.createElement("canvas"); cv.width = cv.height = 256; const ctx = cv.getContext("2d")!;
  const g = ctx.createRadialGradient(128, 128, 30, 128, 128, 128); g.addColorStop(0, "rgba(255,255,255,1)"); g.addColorStop(0.5, "rgba(255,255,255,0.35)"); g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g; ctx.fillRect(0, 0, 256, 256); gtp = new THREE.CanvasTexture(cv); return gtp;
};
// móvil tumbado; flip = PI boca abajo, 0 boca arriba
const LyingPhone: React.FC<{ flip: number; lift?: number; jitter?: number; yaw?: number; shot?: string; bright?: number; children?: React.ReactNode }> = ({ flip, lift = 0, jitter = 0, yaw = 0.25, shot = "splash", bright = 0, children }) => (
  <group position={[jitter * 0.6, 0.05 + lift, jitter * 0.3]} rotation={[-Math.PI / 2, 0, yaw + jitter * 1.2]}>
    <group rotation={[0, flip, 0]}>
      <Phone shot={shot} bright={bright} sweepAmt={0} />
      {children}
    </group>
  </group>
);

export const Shot4 = () => { const f = useF(); return <MotionBlur on={f >= 3 && f < 18}><Shot4In /></MotionBlur>; };
const Shot4In = () => {
  const f = useF();
  const beats = [15, 30, 45, 60];
  const v = beats.reduce((a, b) => a + hit(f, b, 9), 0);
  const jitter = 0.02 * Math.sin(f * 7.3) * v;
  const glow = beats.reduce((a, b) => a + hit(f, b, 16), 0) * 0.85;
  // empieza en cenital sobre el móvil (mismo tamaño que la silueta del plano 3) y baja a ras de mesa
  const az = mix(-0.95, 0.62, prog(f, 0, 92, (x) => x));
  const k = ramp(prog(f, 3, 24));
  const orbit: V3 = [3.1 * Math.sin(az), 0.3, 3.1 * Math.cos(az)];
  const top: V3 = [0, 5.12, 0];
  const camPos: V3 = [mix(top[0], orbit[0], k), mix(top[1], orbit[1], k), mix(top[2], orbit[2], k)];
  const look: V3 = [0, mix(0.05, 0.62, k), 0];
  const upV = new THREE.Vector3(-Math.sin(0.25), 0, -Math.cos(0.25)).lerp(new THREE.Vector3(0, 1, 0), k).normalize();
  const texs = useMemo(() => CARDS.map(([a, b]) => cardTex(a, b)), []);
  return (
    <AbsoluteFill>
      <Stage bg="#060A09" shadows env={0.35}>
        <Cam pos={camPos} look={look} fov={36} up={upV.toArray() as V3} />
        <Table glow={glow} />
        <LyingPhone flip={Math.PI} jitter={jitter} />
        {CARDS.map((_, i) => {
          const b = beats[i];
          const p = prog(f, b, b + 7, ramp);
          if (p <= 0) return null;
          const after = beats.slice(i + 1).reduce((a, bb) => a + prog(f, bb, bb + 7, ramp), 0);
          return (
            <group key={i} position={[0, 0.34 + after * 0.33 + (1 - p) * -0.15, 0]} rotation={[0, az, 0]} scale={0.85 + 0.15 * p}>
              <mesh renderOrder={10 + i}><planeGeometry args={[1.5, 0.35]} /><meshBasicMaterial map={texs[i]} transparent opacity={p * (1 - 0.25 * after)} depthWrite={false} toneMapped={false} /></mesh>
            </group>
          );
        })}
      </Stage>
      <Block x={130} y={450}><TypeIn text="They go quiet first." p={prog(f, 24, 54)} size={86} width={560} /></Block>
    </AbsoluteFill>
  );
};

// ---------- 5 · "Relevo." ----------
export const Shot5 = () => { const f = useF(); return <MotionBlur on={f >= 30 && f < 46}><Shot5In /></MotionBlur>; };
const Shot5In = () => {
  const f = useF();
  const ready = useFontsReady();
  if (f >= 40) {
    return (
      <AbsoluteFill>
        <Stage bg={C.bg}>
          <Cam pos={[0.15 * Math.sin(f * 0.05), 0.05, mix(4.2, 5.0, prog(f, 40, 60, smooth))]} look={[0, 0, 0]} fov={40} />
          <Backdrop time={f / 30} />
          <Bokeh n={40} center={[0, 0, -6]} box={[18, 10, 6]} time={f / 30} opacity={0.5} />
          <SolidLogo opacity={prog(f, 45, 53, smooth)} />
          {ready && <ParticleText text="Relevo" font={`700 300px ${GROTESK}`} n={12000} width={4.6} progress={prog(f, 38, 46)} color={C.ink} additive={false} size={0.016} time={f / 30} focus={4.6} opacity={1 - prog(f, 46, 54, smooth)}
            from={(i, r) => { const a = r() * Math.PI * 2, d = Math.sqrt(r()) * 1.1; return [Math.cos(a) * d * 0.6, Math.sin(a) * d * 1.2, 2.5 + r() * 1.5]; }} />}
        </Stage>
      </AbsoluteFill>
    );
  }
  const flipP = prog(f, 6, 26, ramp);
  const flip = Math.PI * (1 - flipP);
  const lift = Math.sin(prog(f, 6, 26) * Math.PI) * 0.35;
  const handIn = prog(f, 0, 7, ramp), handOut = prog(f, 26, 36, smooth);
  const on = f >= 30;
  const flash = hit(f, 30, 10);
  const cp = prog(f, 0, 30, ramp);
  const dive = prog(f, 30, 41, Easing.in(Easing.cubic));
  const pos: V3 = [mix(2.6, 0.0, cp), mix(1.6, 3.6, cp) - dive * 3.58, mix(3.4, 0.3, cp) - dive * 0.29];
  return (
    <AbsoluteFill>
      <Stage bg={on ? "#0B1311" : "#060A09"} shadows env={0.35}>
        <Cam pos={pos} look={[0, 0.05, 0]} fov={38} />
        <Table light={on ? 1 + flash * 2 : 0} />
        <LyingPhone flip={flip} lift={lift} shot="splash" bright={on ? 1 + flash * 0.6 : 0}>
          <HandLight opacity={handIn * (1 - handOut)} position={[0.12 + (1 - handIn) * 1.5 + handOut * 1.4, 0, -0.07]} />
        </LyingPhone>
        {on && <Glow position={[0, 0.25, 0]} size={3 + flash * 6} color="#F3FFF9" opacity={0.35 + flash * 0.6} />}
      </Stage>
    </AbsoluteFill>
  );
};

// Logo nítido (mismo encuadre que las partículas: canvas de 1400×360 con la misma fuente)
const SolidLogo: React.FC<{ opacity: number }> = ({ opacity }) => {
  const tex = useMemo(() => {
    const cv = document.createElement("canvas"); cv.width = 1400; cv.height = 360; const ctx = cv.getContext("2d")!;
    ctx.font = `700 300px ${GROTESK}`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillStyle = C.ink; ctx.fillText("Relevo", 700, 180);
    const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
  }, []);
  return <mesh><planeGeometry args={[4.6, (4.6 * 360) / 1400]} /><meshBasicMaterial map={tex} transparent opacity={opacity} depthWrite={false} toneMapped={false} /></mesh>;
};
