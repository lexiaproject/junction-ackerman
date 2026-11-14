// Revisión: saca un fotograma cada <paso> segundos de un MP4 y hace una hoja de contactos.
// Uso: node scripts/frames.cjs <video.mp4> <inicio_s> <fin_s> <paso_s> <salida.png> [desfase_s para la etiqueta]
"use strict";
const { execFileSync } = require("child_process");
const fs = require("fs"), path = require("path");
const root = path.join(__dirname, "..");
const ffmpeg = path.join(root, "node_modules", "@remotion", "compositor-win32-x64-msvc", "ffmpeg.exe");
const [src, a, b, step, out, off = "0"] = process.argv.slice(2);
const dir = path.join(path.dirname(path.resolve(out)), path.basename(out, ".png") + "-frames");
fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
const args = [];
for (let t = +a; t <= +b + 1e-6; t += +step) {
  const f = path.join(dir, `t${t.toFixed(2)}.png`);
  execFileSync(ffmpeg, ["-loglevel", "error", "-ss", t.toFixed(3), "-i", path.resolve(src), "-frames:v", "1", "-vf", "scale=480:-1", f]);
  args.push(`${f}|${(t + +off).toFixed(1)}s`);
}
execFileSync(process.execPath, [path.join(__dirname, "sheet.cjs"), out, "6", "480", ...args], { stdio: "inherit" });
