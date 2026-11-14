// Hoja de contactos: junta imágenes en una cuadrícula y la captura con Chrome.
// Uso: node scripts/sheet.cjs salida.png cols ancho img1[:etiqueta] img2 …
"use strict";
const { chromium } = require("playwright-core");
const { pathToFileURL } = require("url");
const fs = require("fs"), path = require("path");
const [out, cols, cw, ...imgs] = process.argv.slice(2);
(async () => {
  const cells = imgs.map((a) => { const i = a.lastIndexOf("|"); const f = i > 0 ? a.slice(0, i) : a; const l = i > 0 ? a.slice(i + 1) : path.basename(f); return `<figure><img src="${pathToFileURL(path.resolve(f)).href}"><figcaption>${l}</figcaption></figure>`; }).join("");
  const html = `<html><body style="margin:0;background:#111;font:600 15px sans-serif"><div style="display:grid;grid-template-columns:repeat(${cols},${cw}px);gap:8px;padding:8px">${cells}</div>
<style>figure{margin:0;position:relative}img{width:${cw}px;display:block}figcaption{position:absolute;left:6px;top:4px;background:#000c;color:#fff;padding:2px 7px;border-radius:4px;max-width:90%}</style></body></html>`;
  const h = path.resolve(out + ".html"); fs.writeFileSync(h, html);
  const b = await chromium.launch({ channel: "chrome", headless: true });
  const p = await b.newPage({ viewport: { width: cols * (+cw + 8) + 8, height: 400 } });
  await p.goto(pathToFileURL(h).href); await p.waitForTimeout(500);
  await p.screenshot({ path: path.resolve(out), fullPage: true }); await b.close(); fs.rmSync(h);
  console.log("sheet", out);
})();
