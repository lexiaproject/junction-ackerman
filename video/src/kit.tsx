// Piezas 3D reutilizables: cámara, partículas con desenfoque de campo, siluetas, móvil con captura real,
// cerebro de hilos de luz, silla del tratamiento, brillos y trazos de luz, rótulos 3D y texto de partículas.
import React, { useLayoutEffect, useMemo } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { useShot, rng, textPoints, personPoints, clamp01 } from "./lib";

type V3 = [number, number, number];

// Cámara: posición, punto al que mira, campo de visión y giro (roll)
export const Cam: React.FC<{ pos: V3; look: V3; fov?: number; roll?: number }> = ({ pos, look, fov = 35, roll = 0 }) => {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  useLayoutEffect(() => {
    camera.position.set(...pos);
    camera.up.set(Math.sin(roll), Math.cos(roll), 0);
    camera.lookAt(...look);
    camera.fov = fov; camera.near = 0.01; camera.far = 400;
    camera.updateProjectionMatrix();
  });
  return null;
};

// --- Partículas con desenfoque de campo (bokeh) ---
const pointsVS = `
  attribute float aSeed; attribute vec3 aTarget; uniform float uMorph;
  uniform float uSize, uFocus, uAperture, uScale, uTime, uSpread;
  varying float vAlpha; varying float vSeed;
  void main(){
    vec3 p = mix(position, aTarget, uMorph);
    p += uSpread * vec3(sin(aSeed*91.0+uTime*0.7), cos(aSeed*53.0+uTime*0.6), sin(aSeed*27.0+uTime*0.5)) * 0.02;
    vec4 mv = modelViewMatrix * vec4(p,1.0);
    float depth = -mv.z;
    float coc = abs(depth - uFocus) * uAperture;
    float sz = uSize * (0.7 + 0.6*fract(aSeed*13.7));
    gl_PointSize = (sz + coc) * uScale / max(depth, 0.05);
    vAlpha = clamp(pow(sz/(sz+coc), 1.6), 0.03, 1.0);
    vSeed = aSeed;
    gl_Position = projectionMatrix * mv;
  }`;
const pointsFS = `
  uniform vec3 uColor, uColorB; uniform float uMix, uOpacity, uTwinkle, uTime;
  varying float vAlpha; varying float vSeed;
  void main(){
    float d = length(gl_PointCoord - 0.5);
    if (d > 0.5) discard;
    float a = smoothstep(0.5, 0.18, d);
    float tw = 1.0 - uTwinkle*0.5*(0.5+0.5*sin(vSeed*40.0 + uTime*3.0));
    gl_FragColor = vec4(mix(uColorB, uColor, uMix), a * vAlpha * uOpacity * tw);
  }`;

export type PtsProps = {
  positions: Float32Array; color?: string; colorB?: string; mix?: number; size?: number; opacity?: number;
  focus?: number; aperture?: number; additive?: boolean; time?: number; twinkle?: number; spread?: number;
  position?: V3; rotation?: V3; scale?: number | V3; renderOrder?: number; target?: Float32Array; morph?: number;
};
export const Pts: React.FC<PtsProps> = ({ positions, color = "#ffffff", colorB, mix = 1, size = 0.02, opacity = 1, focus = 5, aperture = 0.02,
  additive = true, time = 0, twinkle = 0, spread = 0, position, rotation, scale, renderOrder, target, morph = 0 }) => {
  const { size: vp } = useThree();
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    g.setAttribute("aTarget", new THREE.BufferAttribute(target ?? positions, 3));
    const r = rng(positions.length);
    g.setAttribute("aSeed", new THREE.BufferAttribute(Float32Array.from({ length: positions.length / 3 }, () => r()), 1));
    return g;
  }, [positions, target]);
  const mat = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: pointsVS, fragmentShader: pointsFS, transparent: true, depthWrite: false,
    blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    uniforms: { uMorph: { value: 0 }, uSize: { value: 0 }, uFocus: { value: 0 }, uAperture: { value: 0 }, uScale: { value: 0 }, uTime: { value: 0 }, uSpread: { value: 0 },
      uColor: { value: new THREE.Color() }, uColorB: { value: new THREE.Color() }, uMix: { value: 1 }, uOpacity: { value: 1 }, uTwinkle: { value: 0 } },
  }), [additive]);
  const u = mat.uniforms;
  u.uSize.value = size; u.uFocus.value = focus; u.uAperture.value = aperture; u.uScale.value = vp.height * 0.9;
  u.uTime.value = time; u.uSpread.value = spread; u.uColor.value.set(color); u.uColorB.value.set(colorB ?? color);
  u.uMix.value = mix; u.uOpacity.value = opacity; u.uTwinkle.value = twinkle; u.uMorph.value = morph;
  return <points geometry={geo} material={mat} position={position} rotation={rotation} scale={scale as never} renderOrder={renderOrder} frustumCulled={false} />;
};

// Polvo de fondo desenfocado
export const Dust: React.FC<{ n?: number; box?: V3; center?: V3; seed?: number } & Omit<PtsProps, "positions">> = ({ n = 400, box = [20, 12, 20], center = [0, 0, 0], seed = 7, ...rest }) => {
  const positions = useMemo(() => {
    const r = rng(seed);
    return Float32Array.from({ length: n * 3 }, (_, i) => center[i % 3] + (r() - 0.5) * box[i % 3]);
  }, [n, seed, box[0], box[1], box[2], center[0], center[1], center[2]]);
  return <Pts positions={positions} {...rest} />;
};

// Silueta de persona hecha de partículas; mix = 0 gris apagado, 1 a color
export const Person: React.FC<{ kind?: "bust" | "stand"; seed?: number; n?: number } & Omit<PtsProps, "positions">> = ({ kind = "bust", seed = 1, n = 2600, ...rest }) => {
  const positions = useMemo(() => personPoints(n, seed, kind), [n, seed, kind]);
  return <Pts positions={positions} {...rest} />;
};

// --- Brillo (sprite con degradado radial) ---
let glowTex: THREE.Texture | null = null;
const getGlowTex = () => {
  if (glowTex) return glowTex;
  const cv = document.createElement("canvas"); cv.width = cv.height = 256;
  const ctx = cv.getContext("2d")!;
  const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  g.addColorStop(0, "rgba(255,255,255,1)"); g.addColorStop(0.12, "rgba(255,255,255,0.75)");
  g.addColorStop(0.35, "rgba(255,255,255,0.18)"); g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g; ctx.fillRect(0, 0, 256, 256);
  glowTex = new THREE.CanvasTexture(cv);
  return glowTex;
};
export const Glow: React.FC<{ position?: V3; size?: number; color?: string; opacity?: number; additive?: boolean; renderOrder?: number; depthTest?: boolean }> = ({ position = [0, 0, 0], size = 1, color = "#fff", opacity = 1, additive = true, renderOrder, depthTest = true }) => (
  <sprite position={position} scale={[size, size, 1]} renderOrder={renderOrder}>
    <spriteMaterial map={getGlowTex()} color={color} opacity={opacity} transparent depthWrite={false} depthTest={depthTest} blending={additive ? THREE.AdditiveBlending : THREE.NormalBlending} toneMapped={false} />
  </sprite>
);

// Trazo de luz (tubo fino + halo) a lo largo de una curva; progress dibuja de 0 a 1
export const LightStroke: React.FC<{ points: V3[]; color?: string; width?: number; opacity?: number; progress?: number; closed?: boolean; position?: V3; rotation?: V3; scale?: number; additive?: boolean }> = ({ points, color = "#fff", width = 0.01, opacity = 1, progress = 1, closed = false, position, rotation, scale, additive = true }) => {
  const geos = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)), closed, "centripetal");
    return [new THREE.TubeGeometry(curve, 160, width, 8, closed), new THREE.TubeGeometry(curve, 160, width * 3.5, 8, closed)];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(points), width, closed]);
  const count = (g: THREE.TubeGeometry) => Math.floor((g.index!.count / 3) * clamp01(progress)) * 3;
  geos.forEach((g) => g.setDrawRange(0, count(g)));
  const blending = additive ? THREE.AdditiveBlending : THREE.NormalBlending;
  return (
    <group position={position} rotation={rotation} scale={scale}>
      <mesh geometry={geos[0]}><meshBasicMaterial color={color} transparent opacity={opacity} blending={blending} depthWrite={false} toneMapped={false} /></mesh>
      <mesh geometry={geos[1]}><meshBasicMaterial color={color} transparent opacity={opacity * 0.18} blending={blending} depthWrite={false} toneMapped={false} /></mesh>
    </group>
  );
};

// --- Móvil con captura real en pantalla ---
const screenFS = `
  uniform sampler2D uA, uB, uSoftA, uSoftB; uniform float uSwap, uFocusAmt, uFocusR, uBright, uSweep, uSweepAmt, uAspect;
  uniform vec2 uFocus; varying vec2 vUv;
  void main(){
    vec4 a = mix(texture2D(uA, vUv), texture2D(uSoftA, vUv), 0.0);
    vec4 b = texture2D(uB, vUv);
    vec4 sharp = mix(a, b, uSwap);
    vec4 soft = mix(texture2D(uSoftA, vUv), texture2D(uSoftB, vUv), uSwap);
    vec2 d = (vUv - uFocus) * vec2(1.0, uAspect);
    float blur = smoothstep(uFocusR, uFocusR*2.6, length(d)) * uFocusAmt;
    vec3 col = mix(sharp.rgb, soft.rgb, blur) * uBright;
    float band = vUv.x*0.9 + vUv.y*0.55 - uSweep;
    col += vec3(1.0) * uSweepAmt * (smoothstep(0.0, 0.05, band) - smoothstep(0.05, 0.22, band)) * 0.35;
    gl_FragColor = vec4(col, 1.0);
  }`;
const screenVS = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`;

export const PHONE_W = 1, PHONE_H = 844 / 390;
const bodyGeo = new RoundedBoxGeometry(PHONE_W + 0.1, PHONE_H + 0.12, 0.09, 6, 0.09);
const camGeo = new RoundedBoxGeometry(0.34, 0.34, 0.03, 4, 0.07);
export const Phone: React.FC<{
  shot?: string; next?: string; swap?: number; focus?: [number, number]; focusAmt?: number; focusR?: number; bright?: number; sweep?: number; sweepAmt?: number;
  position?: V3; rotation?: V3; scale?: number; body?: string; screenOffset?: number; children?: React.ReactNode;
}> = ({ shot = "luis-home", next, swap = 0, focus = [0.5, 0.5], focusAmt = 0, focusR = 0.08, bright = 1, sweep = -1, sweepAmt = 1, position, rotation, scale = 1, body = "#1B2421", screenOffset = 0, children }) => {
  const A = useShot(shot);
  const B = useShot(next ?? shot);
  const mat = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: screenVS, fragmentShader: screenFS, toneMapped: false,
    uniforms: { uA: { value: null }, uB: { value: null }, uSoftA: { value: null }, uSoftB: { value: null }, uSwap: { value: 0 }, uFocusAmt: { value: 0 }, uFocusR: { value: 0.1 },
      uBright: { value: 1 }, uSweep: { value: -1 }, uSweepAmt: { value: 1 }, uFocus: { value: new THREE.Vector2() }, uAspect: { value: PHONE_H } },
  }), []);
  const u = mat.uniforms;
  if (A && B) { u.uA.value = A.sharp; u.uB.value = B.sharp; u.uSoftA.value = A.soft; u.uSoftB.value = B.soft; }
  u.uSwap.value = swap; u.uFocusAmt.value = focusAmt; u.uFocusR.value = focusR; u.uBright.value = bright;
  u.uSweep.value = sweep; u.uSweepAmt.value = sweepAmt; u.uFocus.value.set(focus[0], 1 - focus[1]);
  return (
    <group position={position} rotation={rotation} scale={scale}>
      <mesh geometry={bodyGeo} castShadow><meshStandardMaterial color={body} roughness={0.35} metalness={0.6} /></mesh>
      <mesh geometry={camGeo} position={[0.24, 0.78, -0.05]}><meshStandardMaterial color="#101614" roughness={0.25} metalness={0.7} /></mesh>
      {[[0.17, 0.85], [0.31, 0.71], [0.17, 0.71]].map(([x, y], i) => <mesh key={i} position={[x, y, -0.068]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.045, 0.045, 0.02, 24]} /><meshStandardMaterial color="#050807" roughness={0.1} metalness={0.9} /></mesh>)}
      <mesh position={[0, 0, 0.0455 + screenOffset]} material={mat}><planeGeometry args={[PHONE_W, PHONE_H]} /></mesh>
      {children}
    </group>
  );
};
// Coordenadas de un punto de la captura (px CSS de 390×844) en el plano del móvil
export const onScreen = (x: number, y: number, z = 0.05): V3 => [(x / 390 - 0.5) * PHONE_W, (0.5 - y / 844) * PHONE_H, z];

// Panel plano con una captura (p. ej. la web de la clínica)
export const ShotPanel: React.FC<{ shot: string; width: number; position?: V3; rotation?: V3; opacity?: number; bright?: number }> = ({ shot, width, position, rotation, opacity = 1, bright = 1 }) => {
  const t = useShot(shot);
  if (!t) return null;
  return (
    <mesh position={position} rotation={rotation}>
      <planeGeometry args={[width, (width * t.h) / t.w]} />
      <meshBasicMaterial map={t.sharp} transparent={opacity < 1} opacity={opacity} color={new THREE.Color(bright, bright, bright)} toneMapped={false} />
    </mesh>
  );
};

// --- Cerebro de hilos de luz ---
const brainVS = `
  uniform vec3 uPulse; uniform float uWave, uLit, uTime; varying float vGlow; varying float vDepth;
  void main(){
    float d = distance(position, uPulse);
    float ring = exp(-pow((d - uWave*2.4)*7.0, 2.0)) * step(0.001, uWave) * (1.0 - uWave);
    vGlow = ring + uLit * smoothstep(0.75, 0.0, d);
    vec4 mv = modelViewMatrix * vec4(position,1.0);
    vDepth = -mv.z;
    gl_Position = projectionMatrix * mv;
  }`;
const brainFS = `
  uniform vec3 uBase, uHot; uniform float uOpacity, uFocus; varying float vGlow; varying float vDepth;
  void main(){
    float dof = 1.0 / (1.0 + abs(vDepth - uFocus) * 0.9);
    vec3 c = mix(uBase, uHot, clamp(vGlow,0.0,1.0));
    gl_FragColor = vec4(c, uOpacity * (0.28 + vGlow*1.2) * dof);
  }`;
export const Brain: React.FC<{ pulse: V3; wave?: number; lit?: number; opacity?: number; focus?: number; position?: V3; rotation?: V3; scale?: number; count?: number }> = ({ pulse, wave = 0, lit = 0, opacity = 1, focus = 4, position, rotation, scale = 1, count = 420 }) => {
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(brainLinesCached(count), 3));
    return g;
  }, [count]);
  const mat = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: brainVS, fragmentShader: brainFS, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uPulse: { value: new THREE.Vector3() }, uWave: { value: 0 }, uLit: { value: 0 }, uTime: { value: 0 }, uBase: { value: new THREE.Color("#2E8F80") }, uHot: { value: new THREE.Color("#CFFFF4") }, uOpacity: { value: 1 }, uFocus: { value: 4 } },
  }), []);
  mat.uniforms.uPulse.value.set(...pulse); mat.uniforms.uWave.value = wave; mat.uniforms.uLit.value = lit;
  mat.uniforms.uOpacity.value = opacity; mat.uniforms.uFocus.value = focus;
  return <lineSegments geometry={geo} material={mat} position={position} rotation={rotation} scale={scale} frustumCulled={false} />;
};
import { brainLines } from "./lib";
const brainCache = new Map<number, Float32Array>();
const brainLinesCached = (n: number) => { if (!brainCache.has(n)) brainCache.set(n, brainLines(n, 46, 11)); return brainCache.get(n)!; };
export const BRAIN_PULSE: V3 = [-0.28, 0.52, 0.86]; // frente, lado izquierdo

// --- Silla del tratamiento (TMS): sillón reclinable con el brazo de la bobina ---
export const Chair: React.FC<{ color?: string; edge?: string; edgeOpacity?: number; solid?: number; position?: V3; rotation?: V3 }> = ({ color = "#2A3431", edge = "#7FE3CF", edgeOpacity = 0, solid = 1, position, rotation }) => {
  const parts = useMemo(() => {
    const p: { g: THREE.BufferGeometry; pos: V3; rot?: V3 }[] = [];
    const rb = (w: number, h: number, d: number, r = 0.06) => new RoundedBoxGeometry(w, h, d, 4, r);
    p.push({ g: new THREE.CylinderGeometry(0.35, 0.45, 0.08, 40), pos: [0, 0.04, 0] }); // base
    p.push({ g: new THREE.CylinderGeometry(0.09, 0.09, 0.5, 20), pos: [0, 0.3, 0] }); // columna
    p.push({ g: rb(0.78, 0.16, 0.8), pos: [0, 0.6, 0.05] }); // asiento
    p.push({ g: rb(0.78, 0.15, 0.9), pos: [0, 0.98, -0.52], rot: [-1.05, 0, 0] }); // respaldo
    p.push({ g: rb(0.42, 0.12, 0.34, 0.05), pos: [0, 1.45, -0.82], rot: [-0.75, 0, 0] }); // reposacabezas
    p.push({ g: rb(0.78, 0.13, 0.62), pos: [0, 0.42, 0.68], rot: [0.75, 0, 0] }); // reposapiés
    p.push({ g: rb(0.1, 0.09, 0.6, 0.04), pos: [-0.46, 0.8, 0.0] }); // brazos
    p.push({ g: rb(0.1, 0.09, 0.6, 0.04), pos: [0.46, 0.8, 0.0] });
    p.push({ g: new THREE.CylinderGeometry(0.035, 0.035, 1.9, 12), pos: [0.62, 0.95, -1.15] }); // poste de la bobina
    const arm = new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(0.62, 1.88, -1.15), new THREE.Vector3(0.45, 2.02, -1.0), new THREE.Vector3(0.12, 1.92, -0.8), new THREE.Vector3(0.02, 1.74, -0.72)]), 30, 0.03, 8);
    p.push({ g: arm, pos: [0, 0, 0] });
    p.push({ g: new THREE.TorusGeometry(0.075, 0.028, 10, 30), pos: [-0.08, 1.68, -0.7], rot: [-0.9, 0, 0] }); // bobina en 8
    p.push({ g: new THREE.TorusGeometry(0.075, 0.028, 10, 30), pos: [0.08, 1.68, -0.7], rot: [-0.9, 0, 0] });
    return p;
  }, []);
  const edges = useMemo(() => parts.map((x) => new THREE.EdgesGeometry(x.g, 25)), [parts]);
  return (
    <group position={position} rotation={rotation}>
      {parts.map((x, i) => (
        <group key={i} position={x.pos} rotation={x.rot}>
          {solid > 0 && <mesh geometry={x.g} castShadow receiveShadow><meshStandardMaterial color={color} roughness={0.55} metalness={0.15} transparent={solid < 1} opacity={solid} /></mesh>}
          {edgeOpacity > 0 && <lineSegments geometry={edges[i]}><lineBasicMaterial color={edge} transparent opacity={edgeOpacity} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} /></lineSegments>}
        </group>
      ))}
    </group>
  );
};

// --- Rótulo 3D: texto en un plano con revelado de izquierda a derecha (uReveal) ---
const labelFS = `
  uniform sampler2D uMap; uniform float uReveal, uSoft, uOpacity, uDir; uniform vec3 uTint; uniform float uUseTint; varying vec2 vUv;
  void main(){
    vec4 t = texture2D(uMap, vUv);
    float m = uDir > 0.0 ? 1.0 - smoothstep(uReveal - uSoft, uReveal, vUv.x) : smoothstep(1.0 - uReveal, 1.0 - uReveal + uSoft, vUv.x);
    vec3 c = mix(t.rgb, uTint, uUseTint);
    gl_FragColor = vec4(c, t.a * m * uOpacity);
  }`;
export const Label: React.FC<{ tex: THREE.Texture; width: number; height: number; reveal?: number; soft?: number; opacity?: number; position?: V3; rotation?: V3; renderOrder?: number; dir?: number }> = ({ tex, width, height, reveal = 1.2, soft = 0.06, opacity = 1, position, rotation, renderOrder = 5, dir = 1 }) => {
  const mat = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: screenVS, fragmentShader: labelFS, transparent: true, depthWrite: false, toneMapped: false,
    uniforms: { uMap: { value: tex }, uReveal: { value: 1 }, uSoft: { value: 0.06 }, uOpacity: { value: 1 }, uTint: { value: new THREE.Color() }, uUseTint: { value: 0 }, uDir: { value: 1 } },
  }), [tex]);
  mat.uniforms.uReveal.value = reveal; mat.uniforms.uSoft.value = soft; mat.uniforms.uOpacity.value = opacity; mat.uniforms.uDir.value = dir;
  return <mesh position={position} rotation={rotation} material={mat} renderOrder={renderOrder}><planeGeometry args={[width, height]} /></mesh>;
};

// --- Texto formado por partículas que vuelan desde "from" hasta las letras ---
export const ParticleText: React.FC<{ text: string; font: string; n?: number; width: number; from: (i: number, r: () => number) => V3; progress: number; color?: string; size?: number; additive?: boolean; position?: V3; opacity?: number; time?: number; focus?: number }> = ({ text, font, n = 7000, width, from, progress, color = "#fff", size = 0.012, additive = true, position, opacity = 1, time = 0, focus = 5 }) => {
  const target = useMemo(() => textPoints(text, font, n, 3), [text, font, n]);
  const start = useMemo(() => { const r = rng(9); return Array.from({ length: n }, (_, i) => from(i, r)); }, [n]);
  const buf = useMemo(() => new Float32Array(n * 3), [n]);
  const k = width / (1400 / 360);
  const r = rng(5);
  for (let i = 0; i < n; i++) {
    const delay = r() * 0.35;
    const t = clamp01((progress - delay) / (1 - 0.35));
    const e = 1 - Math.pow(1 - t, 3);
    const sw = Math.sin(t * Math.PI) * 0.25 * (r() - 0.5);
    buf[i * 3] = start[i][0] + (target[i * 3] * k - start[i][0]) * e + sw;
    buf[i * 3 + 1] = start[i][1] + (target[i * 3 + 1] * k - start[i][1]) * e - sw;
    buf[i * 3 + 2] = start[i][2] + (target[i * 3 + 2] * 0.3 - start[i][2]) * e;
  }
  return <PtsLive positions={buf} color={color} size={size} additive={additive} position={position} opacity={opacity} time={time} focus={focus} aperture={0.004} />;
};
// Igual que Pts pero marcando la geometría como cambiada en cada fotograma
export const PtsLive: React.FC<PtsProps> = (p) => {
  const { size: vp } = useThree();
  const geo = useMemo(() => { const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(p.positions, 3)); g.setAttribute("aTarget", g.attributes.position); const r = rng(3); g.setAttribute("aSeed", new THREE.BufferAttribute(Float32Array.from({ length: p.positions.length / 3 }, () => r()), 1)); return g; }, [p.positions]);
  (geo.attributes.position as THREE.BufferAttribute).needsUpdate = true;
  const mat = useMemo(() => new THREE.ShaderMaterial({ vertexShader: pointsVS, fragmentShader: pointsFS, transparent: true, depthWrite: false, blending: p.additive === false ? THREE.NormalBlending : THREE.AdditiveBlending,
    uniforms: { uMorph: { value: 0 }, uSize: { value: 0 }, uFocus: { value: 0 }, uAperture: { value: 0 }, uScale: { value: 0 }, uTime: { value: 0 }, uSpread: { value: 0 }, uColor: { value: new THREE.Color() }, uColorB: { value: new THREE.Color() }, uMix: { value: 1 }, uOpacity: { value: 1 }, uTwinkle: { value: 0 } } }), [p.additive]);
  const u = mat.uniforms;
  u.uSize.value = p.size ?? 0.02; u.uFocus.value = p.focus ?? 5; u.uAperture.value = p.aperture ?? 0.004; u.uScale.value = vp.height * 0.9; u.uTime.value = p.time ?? 0;
  u.uColor.value.set(p.color ?? "#fff"); u.uColorB.value.set(p.color ?? "#fff"); u.uOpacity.value = p.opacity ?? 1;
  return <points geometry={geo} material={mat} position={p.position} frustumCulled={false} />;
};
