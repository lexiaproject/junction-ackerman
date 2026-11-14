// Revisión: saca un fotograma cada 2 s del anuncio (out/frames/f00.png = segundo 1, f01 = segundo 3, …)
// y una hoja de contactos con todos (out/frames/sheet.png). Uso: node scripts/frames.cjs
"use strict";
const { execFileSync } = require("child_process");
const { pathToFileURL } = require("url");
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const ffmpeg = path.join(root, "node_modules", "@remotion", "compositor-win32-x64-msvc", "ffmpeg.exe");
const src = path.join(root, "out", "relevo-ad.mp4");
const dir = path.join(root, "out", "frames");
fs.rmSync(dir, { recursive: true, force: true });
fs.mkdirSync(dir, { recursive: true });
const files = [];
for (let i = 0, t = 1; t < 50; i++, t += 2) {
  const f = path.join(dir, `f${String(i).padStart(2, "0")}.png`);
  execFileSync(ffmpeg, ["-loglevel", "error", "-ss", String(t), "-i", src, "-frames:v", "1", f]);
  files.push([f, t]);
}

// Hoja de contactos con Chrome (el ffmpeg de Remotion no trae el filtro de mosaico)
(async () => {
  const { chromium } = require("playwright-core");
  const cells = files.map(([f, t]) => `<figure><img src="${pathToFileURL(f).href}"><figcaption>${t}s</figcaption></figure>`).join("");
  const html = `<html><body style="margin:0;background:#fff;font:600 16px sans-serif"><div style="display:grid;grid-template-columns:repeat(5,480px);gap:8px;padding:8px">${cells}</div>
<style>figure{margin:0;position:relative}img{width:480px;display:block}figcaption{position:absolute;left:6px;top:4px;background:#000a;color:#fff;padding:1px 6px;border-radius:4px}</style></body></html>`;
  const htmlPath = path.join(dir, "sheet.html");
  fs.writeFileSync(htmlPath, html);
  const b = await chromium.launch({ channel: "chrome", headless: true });
  const p = await b.newPage({ viewport: { width: 2448, height: 1400 } });
  await p.goto(pathToFileURL(htmlPath).href);
  await p.waitForTimeout(600);
  await p.screenshot({ path: path.join(dir, "sheet.png"), fullPage: true });
  await b.close();
  console.log("frames + sheet in", dir);
})();
