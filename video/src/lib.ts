// Utilidades del anuncio: tiempos (beats), curvas de movimiento, paleta, azar con semilla y
// generadores de puntos (siluetas de personas, texto, cerebro de hilos).
import { Easing, interpolate, delayRender, continueRender, staticFile } from "remotion";
import { useEffect, useState } from "react";
import * as THREE from "three";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { loadFont as loadGrotesk } from "@remotion/google-fonts/SpaceGrotesk";

export const FPS = 30;
export const BEAT = 15; // 120 BPM a 30 fps: un beat cada 15 fotogramas (cada segundo entero cae en beat)
export const s = (sec: number) => Math.round(sec * FPS);

export const inter = loadInter("normal", { weights: ["500", "600", "700", "800"], subsets: ["latin"] });
export const grotesk = loadGrotesk("normal", { weights: ["500", "700"], subsets: ["latin"] });
export const INTER = inter.fontFamily;
export const GROTESK = grotesk.fontFamily;

export const C = {
  bg: "#F5F6F3", ink: "#16211C", grey: "#55635D", green: "#0E6B5C", greenDark: "#0A5247",
  sage: "#E7F0EC", blue: "#EAF0FA", amber: "#B45309", night: "#04080A", glow: "#7FE3CF", warm: "#F2B766",
};

// Speed ramp: arranque rápido y frenada larga
export const ramp = Easing.bezier(0.08, 0.82, 0.12, 1);
export const smooth = Easing.bezier(0.45, 0, 0.25, 1);
export const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
// valor 0→1 entre dos fotogramas con una curva
export const prog = (f: number, a: number, b: number, ease: (x: number) => number = (x) => x) =>
  ease(clamp01((f - a) / (b - a)));
export const mix = (a: number, b: number, t: number) => a + (b - a) * t;
export const lerp3 = (a: number[], b: number[], t: number): [number, number, number] => [mix(a[0], b[0], t), mix(a[1], b[1], t), mix(a[2], b[2], t)];
export const key = (f: number, frames: number[], values: number[], ease: (x: number) => number = smooth) =>
  interpolate(f, frames, values, { easing: ease, extrapolateLeft: "clamp", extrapolateRight: "clamp" });
// latido corto (0→1→0) que arranca en el fotograma b
export const hit = (f: number, b: number, len = 10) => (f < b || f > b + len ? 0 : Math.pow(1 - (f - b) / len, 2));

export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// --- Puntos a partir de una figura dibujada en un canvas 2D ---
function samplePoints(draw: (ctx: CanvasRenderingContext2D, W: number, H: number) => void, W: number, H: number, n: number, seed: number, step = 2) {
  const cv = document.createElement("canvas");
  cv.width = W; cv.height = H;
  const ctx = cv.getContext("2d")!;
  ctx.fillStyle = "#fff"; ctx.strokeStyle = "#fff";
  draw(ctx, W, H);
  const d = ctx.getImageData(0, 0, W, H).data;
  const cand: number[] = [];
  for (let y = 0; y < H; y += step) for (let x = 0; x < W; x += step) if (d[(y * W + x) * 4 + 3] > 128) cand.push(x, y);
  const r = rng(seed);
  const out = new Float32Array(n * 3);
  const cnt = cand.length / 2;
  for (let i = 0; i < n; i++) {
    const k = Math.floor(r() * cnt) * 2;
    out[i * 3] = (cand[k] + (r() - 0.5) * step) / H - W / H / 2; // alto = 1 unidad, centrado
    out[i * 3 + 1] = 0.5 - (cand[k + 1] + (r() - 0.5) * step) / H;
    out[i * 3 + 2] = (r() - 0.5) * 0.06;
  }
  return out;
}

// Silueta de persona: "bust" (cabeza y hombros) o "stand" (de pie). Alto 1 unidad, base en y = -0.5.
export function personPoints(n: number, seed: number, kind: "bust" | "stand" = "bust") {
  return samplePoints((ctx, W, H) => {
    if (kind === "bust") {
      ctx.beginPath(); ctx.arc(W / 2, H * 0.27, H * 0.17, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath();
      ctx.moveTo(W / 2 - H * 0.36, H);
      ctx.bezierCurveTo(W / 2 - H * 0.36, H * 0.62, W / 2 - H * 0.2, H * 0.5, W / 2, H * 0.5);
      ctx.bezierCurveTo(W / 2 + H * 0.2, H * 0.5, W / 2 + H * 0.36, H * 0.62, W / 2 + H * 0.36, H);
      ctx.fill();
    } else {
      const cx = W / 2;
      ctx.beginPath(); ctx.arc(cx, H * 0.075, H * 0.06, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); // torso
      ctx.moveTo(cx - H * 0.11, H * 0.16); ctx.lineTo(cx + H * 0.11, H * 0.16);
      ctx.lineTo(cx + H * 0.095, H * 0.5); ctx.lineTo(cx - H * 0.095, H * 0.5); ctx.closePath(); ctx.fill();
      ctx.lineCap = "round"; ctx.lineWidth = H * 0.05;
      ctx.beginPath(); ctx.moveTo(cx - H * 0.11, H * 0.19); ctx.lineTo(cx - H * 0.14, H * 0.46); ctx.stroke(); // brazos
      ctx.beginPath(); ctx.moveTo(cx + H * 0.11, H * 0.19); ctx.lineTo(cx + H * 0.14, H * 0.46); ctx.stroke();
      ctx.lineWidth = H * 0.065;
      ctx.beginPath(); ctx.moveTo(cx - H * 0.05, H * 0.5); ctx.lineTo(cx - H * 0.06, H * 0.97); ctx.stroke(); // piernas
      ctx.beginPath(); ctx.moveTo(cx + H * 0.05, H * 0.5); ctx.lineTo(cx + H * 0.06, H * 0.97); ctx.stroke();
    }
  }, 240, 240, n, seed);
}

// Neurona (para el plano 3): soma y dendritas, en la misma escala que la silueta
export function neuronPoints(n: number, seed: number) {
  const r = rng(seed);
  const out = new Float32Array(n * 3);
  const arms = 7;
  const dirs = Array.from({ length: arms }, (_, i) => (i / arms) * Math.PI * 2 + r() * 0.6);
  for (let i = 0; i < n; i++) {
    if (i < n * 0.25) { // soma
      const a = r() * Math.PI * 2, rad = Math.sqrt(r()) * 0.09;
      out.set([Math.cos(a) * rad, Math.sin(a) * rad, (r() - 0.5) * 0.08], i * 3);
    } else {
      const k = Math.floor(r() * arms), t = Math.pow(r(), 0.7);
      const a = dirs[k] + Math.sin(t * 5 + k) * 0.25 + (r() - 0.5) * 0.05;
      const len = 0.08 + t * 0.62;
      const branch = t > 0.5 && r() < 0.4 ? (r() - 0.5) * 0.5 * (t - 0.5) : 0;
      out.set([Math.cos(a + branch) * len, Math.sin(a + branch) * len, (r() - 0.5) * 0.1 * t], i * 3);
    }
  }
  return out;
}

// Texto en puntos (logo formado por partículas). Hace falta que la fuente esté cargada.
export function textPoints(text: string, font: string, n: number, seed: number) {
  return samplePoints((ctx, W, H) => {
    ctx.font = font; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(text, W / 2, H / 2);
  }, 1400, 360, n, seed, 2);
}

let fontsOk = false;
export const fontsReady = () => Promise.all([inter.waitUntilDone(), grotesk.waitUntilDone()]).then(() => document.fonts.ready).then(() => { fontsOk = true; });
// Las fuentes y capturas se cargan antes de montar el anuncio (ver Ad.tsx), así que aquí ya están listas
export function useFontsReady() { return fontsOk; }

// Cerebro de hilos de luz: curvas que recorren la superficie de dos hemisferios
export function brainLines(count: number, seg: number, seed: number) {
  const r = rng(seed);
  const pos: number[] = [];
  const shape = (v: THREE.Vector3) => {
    const side = Math.sign(v.x) || 1;
    v.normalize();
    // hemisferios separados por una cisura, alargado de delante a atrás, algo achatado abajo
    const p = new THREE.Vector3(v.x * 0.82 + side * 0.06, v.y * (v.y < 0 ? 0.62 : 0.8), v.z * 1.08);
    const fold = 1 + 0.035 * Math.sin(v.x * 18 + v.y * 11) * Math.sin(v.z * 15);
    return p.multiplyScalar(fold);
  };
  for (let i = 0; i < count; i++) {
    let v = new THREE.Vector3(r() - 0.5, r() - 0.5, r() - 0.5).normalize();
    let d = new THREE.Vector3(r() - 0.5, r() - 0.5, r() - 0.5).normalize();
    const sideStart = Math.sign(v.x) || 1;
    let prev = shape(v.clone()).multiplyScalar(0.97 + r() * 0.06);
    const depth = 0.93 + r() * 0.1;
    for (let k = 0; k < seg; k++) {
      d.add(new THREE.Vector3(r() - 0.5, r() - 0.5, r() - 0.5).multiplyScalar(0.7)).normalize();
      d.sub(v.clone().multiplyScalar(d.dot(v))).normalize(); // tangente a la esfera
      v.add(d.clone().multiplyScalar(0.07)).normalize();
      if (Math.sign(v.x) !== sideStart) v.x = sideStart * Math.abs(v.x); // no cruza la cisura
      const p = shape(v.clone()).multiplyScalar(depth);
      pos.push(prev.x, prev.y, prev.z, p.x, p.y, p.z);
      prev = p;
    }
  }
  return new Float32Array(pos);
}

// Carga de textura (con versión desenfocada para el falso desenfoque de campo)
type Shot = { sharp: THREE.Texture; soft: THREE.Texture; w: number; h: number };
const texCache = new Map<string, Promise<Shot>>();
const texDone = new Map<string, Shot>();
export const SHOT_NAMES = ["splash", "luis-home", "luis-rec", "pablo-conv", "pablo-ideas", "pablo-ask", "luis-plan", "luis-plan-in", "marta-ask", "pablo-marta", "clinic"];
export const preloadAll = () => fontsReady().then(() => Promise.all(SHOT_NAMES.map((n) => loadShot(n).then((t) => texDone.set(n, t)))));
export function loadShot(name: string) {
  if (!texCache.has(name) && name === "splash") {
    // pantalla de encendido: fondo claro de Relevo y el logo
    texCache.set(name, grotesk.waitUntilDone().then(() => document.fonts.ready).then(() => {
      const cv = document.createElement("canvas"); cv.width = 780; cv.height = 1688;
      const ctx = cv.getContext("2d")!;
      ctx.fillStyle = C.bg; ctx.fillRect(0, 0, 780, 1688);
      ctx.fillStyle = C.ink; ctx.font = `700 120px ${GROTESK}`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText("Relevo", 390, 820);
      ctx.fillStyle = C.green; ctx.beginPath(); ctx.arc(390, 940, 14, 0, Math.PI * 2); ctx.fill();
      const sharp = new THREE.CanvasTexture(cv); sharp.colorSpace = THREE.SRGBColorSpace;
      return { sharp, soft: sharp, w: 780, h: 1688 };
    }));
  }
  if (!texCache.has(name)) {
    texCache.set(name, new Promise((res, rej) => {
      const img = new Image();
      img.onload = () => {
        const sharp = new THREE.Texture(img);
        sharp.colorSpace = THREE.SRGBColorSpace; sharp.anisotropy = 8; sharp.needsUpdate = true;
        const cv = document.createElement("canvas");
        cv.width = img.width / 4; cv.height = img.height / 4;
        const ctx = cv.getContext("2d")!;
        ctx.filter = "blur(5px)";
        ctx.drawImage(img, 0, 0, cv.width, cv.height);
        const soft = new THREE.CanvasTexture(cv);
        soft.colorSpace = THREE.SRGBColorSpace;
        res({ sharp, soft, w: img.width, h: img.height });
      };
      img.onerror = rej;
      img.src = staticFile(`shots/${name}.png`);
    }));
  }
  return texCache.get(name)!;
}
export function useShot(name: string) { return texDone.get(name) ?? null; }

// Texto dibujado en canvas como textura (rótulos dentro de la escena 3D)
export function textTexture(lines: { text: string; font: string; color: string }[], W: number, H: number, align: CanvasTextAlign = "left") {
  const cv = document.createElement("canvas");
  cv.width = W; cv.height = H;
  const ctx = cv.getContext("2d")!;
  ctx.textBaseline = "top"; ctx.textAlign = align;
  let y = 0;
  for (const l of lines) {
    ctx.font = l.font; ctx.fillStyle = l.color;
    const m = /(\d+)px/.exec(l.font);
    ctx.fillText(l.text, align === "center" ? W / 2 : align === "right" ? W : 0, y);
    y += (m ? +m[1] : 40) * 1.18;
  }
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return t;
}
