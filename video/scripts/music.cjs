// Música del anuncio compuesta por código: piano + beat suave a 120 BPM (un beat cada 0,5 s, así cada
// segundo entero cae en beat). Golpes sincronizados con la imagen, silencio total de 12,0 a 12,8 s y fundido final.
// Uso: node scripts/music.cjs   → public/music.wav (52 s, 44,1 kHz, estéreo)
"use strict";
const fs = require("fs");
const path = require("path");

const SR = 44100, LEN = 52, N = SR * LEN;
const L = new Float32Array(N), R = new Float32Array(N);
const busRev = [new Float32Array(N), new Float32Array(N)]; // lo que va a la reverb
const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

function put(i, l, r, rev = 0) {
  if (i < 0 || i >= N) return;
  L[i] += l; R[i] += r;
  if (rev) { busRev[0][i] += l * rev; busRev[1][i] += r * rev; }
}
// Piano: armónicos con caída exponencial, ataque de martillo y un poco de inarmonicidad
function piano(t0, midi, dur, vel = 0.5, pan = 0, rev = 0.5) {
  const f = mtof(midi), n0 = Math.round(t0 * SR), len = Math.round((dur + 1.6) * SR);
  const amps = [1, 0.55, 0.32, 0.2, 0.12, 0.07, 0.04];
  const gl = vel * (1 - pan) * 0.5, gr = vel * (1 + pan) * 0.5;
  for (let n = 0; n < len; n++) {
    const t = n / SR;
    let env = (1 - Math.exp(-t * 300)) * Math.exp(-t * (0.9 + f / 900));
    if (t > dur) env *= Math.exp(-(t - dur) * 9);
    let s = 0;
    for (let h = 0; h < amps.length; h++) s += amps[h] * Math.exp(-t * (h + 1) * 0.7) * Math.sin(2 * Math.PI * f * (h + 1) * (1 + 0.0003 * (h + 1) * (h + 1)) * t);
    if (t < 0.01) s += (rnd() - 0.5) * 0.15 * (1 - t / 0.01); // martillo
    s *= env * 0.22;
    put(n0 + n, s * gl, s * gr, rev);
  }
}
// Pad cálido: dientes de sierra suaves (pocos armónicos), dos voces desafinadas, ataque lento
function pad(t0, midis, dur, vel = 0.12, rev = 0.7) {
  const n0 = Math.round(t0 * SR), len = Math.round((dur + 1.2) * SR);
  for (let n = 0; n < len; n++) {
    const t = n / SR;
    let env = Math.min(1, t / 0.7);
    if (t > dur) env *= Math.exp(-(t - dur) * 4);
    let l = 0, r = 0;
    for (const m of midis) {
      const f = mtof(m);
      for (let h = 1; h <= 5; h++) {
        const a = 1 / (h * h * 0.8 + 0.2);
        l += a * Math.sin(2 * Math.PI * f * 1.002 * h * t + h);
        r += a * Math.sin(2 * Math.PI * f * 0.998 * h * t + 2 * h);
      }
    }
    put(n0 + n, l * env * vel * 0.08, r * env * vel * 0.08, rev);
  }
}
function kick(t0, vel = 0.8) {
  const n0 = Math.round(t0 * SR), len = Math.round(0.5 * SR);
  let ph = 0;
  for (let n = 0; n < len; n++) {
    const t = n / SR;
    const f = 45 + 95 * Math.exp(-t * 28);
    ph += (2 * Math.PI * f) / SR;
    const s = Math.sin(ph) * Math.exp(-t * 7) * vel * 0.9 + (t < 0.004 ? (rnd() - 0.5) * 0.3 * vel : 0);
    put(n0 + n, s, s);
  }
}
function hat(t0, vel = 0.15, open = false) {
  const n0 = Math.round(t0 * SR), len = Math.round((open ? 0.25 : 0.06) * SR);
  let prev = 0;
  for (let n = 0; n < len; n++) {
    const t = n / SR, w = rnd() * 2 - 1, hp = w - prev; prev = w; // ruido con filtro de agudos sencillo
    const s = hp * Math.exp(-t * (open ? 18 : 70)) * vel * 0.5;
    put(n0 + n, s * 0.8, s, 0.15);
  }
}
function clap(t0, vel = 0.25) {
  const n0 = Math.round(t0 * SR), len = Math.round(0.22 * SR);
  for (let n = 0; n < len; n++) {
    const t = n / SR;
    const bursts = [0, 0.011, 0.022].reduce((a, b) => a + (t >= b ? Math.exp(-(t - b) * 60) : 0), 0);
    const s = (rnd() * 2 - 1) * (bursts * 0.4 + Math.exp(-t * 14) * 0.5) * vel * 0.45;
    put(n0 + n, s, s * 0.9, 0.4);
  }
}
// Barrido de aire (whoosh) para los whip pans y los atravesados; sube hasta t1
function whoosh(t0, t1, vel = 0.3) {
  const n0 = Math.round(t0 * SR), len = Math.round((t1 - t0 + 0.35) * SR);
  let lp = 0;
  for (let n = 0; n < len; n++) {
    const t = n / SR, u = t / (t1 - t0);
    const env = u <= 1 ? Math.pow(u, 2.2) : Math.exp(-(t - (t1 - t0)) * 12);
    const k = 0.02 + 0.25 * Math.min(1, u);
    lp += k * ((rnd() * 2 - 1) - lp);
    const s = lp * env * vel * 1.6;
    const pan = Math.sin(u * 3);
    put(n0 + n, s * (1 - pan * 0.5), s * (1 + pan * 0.5), 0.3);
  }
}
// Vibración del móvil sobre la mesa
function buzz(t0, dur = 0.3, vel = 0.25) {
  const n0 = Math.round(t0 * SR), len = Math.round(dur * SR);
  for (let n = 0; n < len; n++) {
    const t = n / SR;
    const s = Math.tanh(Math.sin(2 * Math.PI * 165 * t) * 3) * (0.6 + 0.4 * Math.sin(2 * Math.PI * 28 * t)) * Math.min(1, t / 0.01) * Math.min(1, (dur - t) / 0.03) * vel * 0.35;
    put(n0 + n, s, s);
  }
}
function sub(t0, vel = 0.6, f = 48, dec = 2.5) {
  const n0 = Math.round(t0 * SR), len = Math.round(2.5 * SR);
  for (let n = 0; n < len; n++) { const t = n / SR; const s = Math.sin(2 * Math.PI * f * t) * Math.exp(-t * dec) * vel * 0.7; put(n0 + n, s, s); }
}
function tick(t0, vel = 0.4) { // clic del botón
  const n0 = Math.round(t0 * SR), len = Math.round(0.05 * SR);
  for (let n = 0; n < len; n++) { const t = n / SR; const s = (Math.sin(2 * Math.PI * 2600 * t) * 0.6 + (rnd() - 0.5) * 0.5) * Math.exp(-t * 120) * vel; put(n0 + n, s, s, 0.3); }
}

// --- Armonía (compases de 2 s = 4 beats) ---
const CH = { Am: [57, 60, 64], F: [53, 57, 60], C: [48, 52, 55], G: [55, 59, 62], Dm: [50, 53, 57], Em: [52, 55, 59] };
const BASS = { Am: 45, F: 41, C: 36, G: 43, Dm: 38, Em: 40 };

// 0-12 s · oscuro: piano grave y escaso, pad en la sombra
const intro = ["Am", "F", "C", "G", "Am", "F"];
intro.forEach((c, i) => {
  const t = i * 2;
  piano(t, BASS[c] - 12 + 12, 1.8, 0.4, -0.2, 0.6);
  piano(t + 1.0, CH[c][2] + 12, 0.9, 0.22, 0.3, 0.8);
  if (i >= 2) piano(t + 1.5, CH[c][1] + 12, 0.5, 0.16, -0.3, 0.8);
  pad(t, CH[c].map((m) => m - 12), 2, i < 1 ? 0.06 : 0.1);
});
[0.5, 1.0, 1.5].forEach((t) => { kick(t, 0.55); piano(t, 81, 0.3, 0.12, 0, 0.9); }); // tres pulsos del plano 1
whoosh(2.55, 3.0, 0.32); // picado
sub(5.0, 0.7, 41, 1.6); kick(5.0, 0.9); // el foco se apaga
whoosh(6.05, 6.3, 0.4); // zoom out rapidísimo
[6.5, 7.0].forEach((t) => kick(t, 0.35));
piano(7.5, 76, 1.2, 0.35, 0, 0.9); kick(7.5, 0.6); // "fragile" aterriza
[8, 8.5, 9].forEach((t) => kick(t, 0.35));
[9.5, 10, 10.5, 11].forEach((t) => { buzz(t, 0.28); kick(t, 0.3); }); // vibraciones
whoosh(8.4, 9.0, 0.2);
// 12,0-12,8 silencio total (se aplica abajo); 12,8 aspiración y 13,0 golpe: la pantalla se enciende
(function riser() { const n0 = Math.round(12.8 * SR), len = Math.round(0.2 * SR); for (let n = 0; n < len; n++) { const u = n / len; const s = (rnd() * 2 - 1) * Math.pow(u, 3) * 0.35; put(n0 + n, s, s); } })();
sub(13.0, 0.9, 43, 1.2); kick(13.0, 1.0); piano(13.0, 60, 2.5, 0.5, -0.2, 0.9); piano(13.0, 64, 2.5, 0.42, 0.2, 0.9); piano(13.0, 67, 2.5, 0.42, 0, 0.9); piano(13.0, 72, 2.5, 0.35, 0.1, 0.9);
hat(13.0, 0.3, true);
piano(13.5, 79, 0.6, 0.3, 0.2, 0.9); kick(13.5, 0.5); // el logo se forma

// 14-45 s · claro: arpegio de piano en corcheas, kick en cada beat, hats a contratiempo, palmas en 2 y 4
const bright = ["C", "G", "Am", "F", "C", "G", "Am", "F", "F", "C", "G", "Am", "F", "C", "G", "C"];
bright.forEach((c, i) => {
  const t = 14 + i * 2;
  if (t >= 45) return;
  const notes = [CH[c][0] + 12, CH[c][1] + 12, CH[c][2] + 12, CH[c][1] + 24];
  for (let k = 0; k < 8; k++) piano(t + k * 0.25, notes[[0, 1, 2, 3, 2, 1, 2, 3][k]], 0.3, k % 2 ? 0.13 : 0.19, (k % 4) / 3 - 0.5, 0.5);
  piano(t, BASS[c], 1.9, 0.38, 0, 0.3);
  pad(t, CH[c], 2, 0.1);
  for (let b = 0; b < 4; b++) {
    const tb = t + b * 0.5;
    kick(tb, t < 20 ? 0.45 : 0.6);
    hat(tb + 0.25, t < 20 ? 0.08 : 0.13);
    if (t >= 20 && (b === 1 || b === 3)) clap(tb, 0.22);
  }
});
piano(16.0, 84, 0.8, 0.25, 0.3, 0.9); // Luis empieza a grabar
whoosh(19.45, 20.0, 0.45); // la luz disparada: whip pan
piano(22.0, 79, 1.0, 0.26, 0.3, 0.9); // ideas de respuesta
piano(24.5, 76, 1.2, 0.34, -0.3, 0.9); piano(24.5, 72, 1.2, 0.3, -0.3, 0.9); // el corazón llega
piano(25.0, 76, 0.8, 0.24, -0.3, 0.9);
sub(30.0, 0.55, 49, 2.0); piano(30.0, 69, 1.6, 0.34, 0, 0.9); piano(30.0, 75, 1.6, 0.18, 0, 0.9); // cruza el umbral (ámbar)
whoosh(32.5, 33.0, 0.42); // atraviesa el punto de alerta
[34.5, 36.0, 38.0].forEach((t) => { whoosh(t - 0.4, t, 0.3); piano(t, 84, 0.6, 0.2, 0, 0.9); }); // pantallas atravesadas
piano(39.0, 72, 1.4, 0.3, 0, 0.9); piano(39.0, 76, 1.4, 0.26, 0, 0.9); piano(39.0, 79, 1.4, 0.24, 0, 0.9); // siluetas alrededor de Pablo
tick(42.0, 0.5); piano(42.0, 84, 1.2, 0.36, 0, 0.9); piano(42.0, 79, 1.2, 0.3, 0, 0.9); // clic "I'm in"
whoosh(42.55, 43.1, 0.35); // la cámara se aleja rapidísimo
piano(43.5, 72, 1.0, 0.3, 0, 0.9); // "One tap back" aterriza
whoosh(44.45, 45.0, 0.3); // la cámara sube

// 45-49 s · la música baja: solo piano lento y un pad suave
[["F", 45], ["C", 47]].forEach(([c, t]) => {
  pad(t, CH[c], 2, 0.07);
  piano(t, BASS[c], 2, 0.28, 0, 0.6);
  piano(t + 0.5, CH[c][2] + 12, 1.4, 0.18, 0.2, 0.9);
  piano(t + 1.5, CH[c][1] + 12, 1.2, 0.14, -0.2, 0.9);
});
// 49-52 s · acorde final y fundido
piano(49.0, 36, 3, 0.4, 0, 0.6); piano(49.0, 48, 3, 0.32, -0.2, 0.9); piano(49.0, 55, 3, 0.28, 0.2, 0.9); piano(49.0, 62, 3, 0.24, 0, 0.9); piano(49.0, 64, 3, 0.22, 0.1, 0.9);
pad(49.0, [48, 55, 62, 64], 3, 0.1); kick(49.0, 0.5);
piano(49.5, 72, 2, 0.18, 0.3, 0.9);

// --- Reverb sencilla (peines + pasatodos) ---
function reverb(inp, delays, outGain) {
  const out = new Float32Array(N);
  for (const d of delays) {
    const buf = new Float32Array(d); let p = 0, lp = 0;
    for (let n = 0; n < N; n++) { const y = buf[p]; lp = y * 0.6 + lp * 0.4; buf[p] = inp[n] + lp * 0.8; out[n] += y; p = (p + 1) % d; }
  }
  for (const d of [225, 556]) {
    const buf = new Float32Array(d); let p = 0;
    for (let n = 0; n < N; n++) { const b = buf[p]; const y = -out[n] + b; buf[p] = out[n] + b * 0.5; out[n] = y; p = (p + 1) % d; }
  }
  for (let n = 0; n < N; n++) out[n] *= outGain;
  return out;
}
const rl = reverb(busRev[0], [1116, 1188, 1277, 1356], 0.18), rr = reverb(busRev[1], [1139, 1211, 1300, 1379], 0.18);
for (let n = 0; n < N; n++) { L[n] += rl[n]; R[n] += rr[n]; }

// --- Silencio total 12,0-12,8 s, fundido final y normalización suave ---
for (let n = 0; n < N; n++) {
  const t = n / SR;
  let g = 1;
  if (t >= 11.99 && t < 12.8) g = t < 12.0 ? (12.0 - t) / 0.01 : 0;
  if (t > 50.4) g *= Math.max(0, (52 - t) / 1.6);
  L[n] *= g; R[n] *= g;
}
let peak = 0; for (let n = 0; n < N; n++) peak = Math.max(peak, Math.abs(L[n]), Math.abs(R[n]));
const gain = 0.89 / peak;
const buf = Buffer.alloc(44 + N * 4);
buf.write("RIFF", 0); buf.writeUInt32LE(36 + N * 4, 4); buf.write("WAVE", 8); buf.write("fmt ", 12);
buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22); buf.writeUInt32LE(SR, 24);
buf.writeUInt32LE(SR * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34); buf.write("data", 36); buf.writeUInt32LE(N * 4, 40);
for (let n = 0; n < N; n++) {
  buf.writeInt16LE(Math.round(Math.tanh(L[n] * gain * 1.05) * 32767), 44 + n * 4);
  buf.writeInt16LE(Math.round(Math.tanh(R[n] * gain * 1.05) * 32767), 46 + n * 4);
}
const out = path.join(__dirname, "..", "public", "music.wav");
fs.writeFileSync(out, buf);
console.log("music.wav", LEN + " s", "pico", peak.toFixed(2));
