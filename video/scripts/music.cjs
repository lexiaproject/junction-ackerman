// Compone la música del anuncio por código (libre de derechos por construcción): piano cálido + beat suave a 120 BPM.
// A 120 BPM cada segundo exacto cae en un beat, así que todos los cortes del guion (en segundos enteros) van a tiempo.
// Estructura: intro de piano (0-12 s) · silencio (12-13 s) · acorde del logo · piano + beat (14-44 s) · piano solo (44-48 s) · final.
// Uso: node scripts/music.cjs  → public/music.wav
"use strict";
const fs = require("fs");
const path = require("path");

const SR = 48000;
const DUR = 50;
const BPM = 120;
const BEAT = 60 / BPM; // 0,5 s
const N = SR * DUR;
const L = new Float32Array(N), R = new Float32Array(N);
const piano = new Float32Array(N), drums = new Float32Array(N);

const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);
// Do mayor cálido: Cmaj7 · Am7 · Fmaj7 · G6 (un acorde por compás de 2 s)
const CHORDS = [[48, 52, 55, 59], [45, 48, 52, 55], [41, 45, 48, 52], [43, 47, 50, 52]];
const chordAt = (t) => CHORDS[Math.floor(t / (4 * BEAT)) % 4];

let seed = 7;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) * 2 - 1;

function note(t0, midi, vel, len = 2.6) {
  const f = hz(midi), start = Math.floor(t0 * SR), n = Math.floor(len * SR);
  const decay = 1.1 + f / 900;
  const parts = [[1, 1], [2, 0.42], [3, 0.18], [4, 0.09], [5, 0.04]];
  for (let i = 0; i < n && start + i < N; i++) {
    const t = i / SR;
    const env = Math.min(1, t / 0.004) * Math.exp(-t * decay) * (i > n - 2400 ? (n - i) / 2400 : 1);
    let s = 0;
    for (const [k, a] of parts) s += a * Math.sin(2 * Math.PI * f * k * (1 + 0.0004 * k * k) * t) * Math.exp(-t * k * 0.6);
    piano[start + i] += s * env * vel * 0.16;
  }
}
function kick(t0, vel) {
  const start = Math.floor(t0 * SR);
  let ph = 0;
  for (let i = 0; i < SR * 0.35 && start + i < N; i++) {
    const t = i / SR, f = 45 + 70 * Math.exp(-t * 28);
    ph += (2 * Math.PI * f) / SR;
    drums[start + i] += Math.sin(ph) * Math.exp(-t * 11) * vel * 0.55;
  }
}
function snap(t0, vel, decay = 38) {
  const start = Math.floor(t0 * SR);
  let prev = 0;
  for (let i = 0; i < SR * 0.2 && start + i < N; i++) {
    const x = rnd(), hp = x - prev; prev = x;
    drums[start + i] += hp * Math.exp(-(i / SR) * decay) * vel;
  }
}

/* ---------- Partitura ---------- */
for (let bar = 0; bar < DUR / (4 * BEAT); bar++) {
  const t = bar * 4 * BEAT;
  const ch = chordAt(t);
  if (t >= 12 && t < 13) continue; // silencio antes del logo
  if (t < 12) {
    // Intro: bajo + acorde suave y negras arpegiadas, poco a poco más presente
    const grow = 0.55 + (t / 12) * 0.35;
    note(t, ch[0] - 12, 0.9 * grow, 3.2);
    ch.forEach((m, i) => note(t + i * BEAT, m + 12, (i === 0 ? 0.75 : 0.55) * grow, 2.2));
  } else if (t < 14) {
    note(13, 36, 0.9, 3.5); [48, 55, 59, 64].forEach((m) => note(13, m, 0.5, 3.2)); // acorde del logo
  } else if (t < 44) {
    // Piano en corcheas + bajo; el beat entra suave
    note(t, ch[0] - 12, 1, 2.4);
    note(t + 2 * BEAT, ch[0] - 12, 0.6, 1.4);
    const arp = [ch[0] + 12, ch[1] + 12, ch[2] + 12, ch[3] + 12, ch[2] + 24, ch[3] + 12, ch[1] + 12, ch[2] + 12];
    arp.forEach((m, i) => note(t + i * (BEAT / 2), m, i % 2 ? 0.42 : 0.6, 1.6));
    for (let b = 0; b < 4; b++) {
      const tb = t + b * BEAT;
      if (b === 0 || b === 2) kick(tb, b === 0 ? 1 : 0.8);
      if (b === 1 || b === 3) snap(tb, 0.16, 30);
      snap(tb + BEAT / 2, 0.05, 70);
      snap(tb, 0.035, 80);
    }
  } else if (t < 48) {
    // La frase final: solo piano, más espacio
    note(t, ch[0] - 12, 0.8, 3);
    ch.forEach((m, i) => note(t + i * BEAT, m + 12, 0.5, 2.4));
  } else {
    note(48, 36, 0.9, 3); [48, 52, 55, 59, 64].forEach((m, i) => note(48 + i * 0.06, m, 0.5, 3)); // acorde final
  }
}

/* ---------- Reverb sencilla (Schroeder) sobre el piano y mezcla en estéreo ---------- */
function reverb(x) {
  const out = new Float32Array(x.length);
  const combs = [1557, 1617, 1491, 1422].map((d) => ({ d, buf: new Float32Array(d), i: 0 }));
  const aps = [225, 556].map((d) => ({ d, buf: new Float32Array(d), i: 0 }));
  for (let n = 0; n < x.length; n++) {
    let s = 0;
    for (const c of combs) { const y = c.buf[c.i]; c.buf[c.i] = x[n] + y * 0.78; c.i = (c.i + 1) % c.d; s += y; }
    s *= 0.25;
    for (const a of aps) { const y = a.buf[a.i]; const v = s + y * 0.5; a.buf[a.i] = v; a.i = (a.i + 1) % a.d; s = y - v * 0.5; }
    out[n] = s;
  }
  return out;
}
const wet = reverb(piano);
for (let n = 0; n < N; n++) {
  const t = n / SR;
  const fade = t > DUR - 3 ? Math.max(0, (DUR - t) / 3) : 1; // fundido en los últimos 3 s
  const mute = t >= 12 && t < 13 ? 0 : 1;
  const p = piano[n] * 0.85 + wet[n] * 0.32;
  L[n] = (p * 1.02 + drums[n] + wet[Math.max(0, n - 240)] * 0.06) * fade * mute;
  R[n] = (p * 0.98 + drums[n] + wet[Math.max(0, n - 480)] * 0.06) * fade * mute;
}
let peak = 0;
for (let n = 0; n < N; n++) peak = Math.max(peak, Math.abs(L[n]), Math.abs(R[n]));
const g = 0.89 / peak;

const data = Buffer.alloc(N * 4);
for (let n = 0; n < N; n++) {
  data.writeInt16LE(Math.round(Math.tanh(L[n] * g) * 32767), n * 4);
  data.writeInt16LE(Math.round(Math.tanh(R[n] * g) * 32767), n * 4 + 2);
}
const h = Buffer.alloc(44);
h.write("RIFF", 0); h.writeUInt32LE(36 + data.length, 4); h.write("WAVE", 8); h.write("fmt ", 12);
h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(2, 22); h.writeUInt32LE(SR, 24);
h.writeUInt32LE(SR * 4, 28); h.writeUInt16LE(4, 32); h.writeUInt16LE(16, 34); h.write("data", 36); h.writeUInt32LE(data.length, 40);
fs.writeFileSync(path.join(__dirname, "..", "public", "music.wav"), Buffer.concat([h, data]));
console.log(`music.wav · ${DUR} s · ${BPM} BPM · silence 12-13 s · fade-out last 3 s`);
