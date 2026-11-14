// Saca fotogramas sueltos del anuncio (para el storyboard y las revisiones).
// Uso: node scripts/stills.cjs <carpeta> <escala> <fotograma>[:etiqueta] ...
"use strict";
const path = require("path");
const fs = require("fs");
const { bundle } = require("@remotion/bundler");
const { selectComposition, renderStill, openBrowser } = require("@remotion/renderer");

(async () => {
  const [dir, scale, ...frames] = process.argv.slice(2);
  const out = path.resolve(dir);
  fs.mkdirSync(out, { recursive: true });
  const serveUrl = await bundle({ entryPoint: path.join(__dirname, "..", "src", "index.ts"), publicDir: path.join(__dirname, "..", "public") });
  const chromiumOptions = { gl: "angle" };
  const browser = await openBrowser("chrome", { browserExecutable: process.env.REMOTION_CHROME ?? "C:/Program Files/Google/Chrome/Application/chrome.exe", chromiumOptions, chromeMode: "chrome-for-testing" });
  const composition = await selectComposition({ serveUrl, id: "RelevoAd", puppeteerInstance: browser, chromiumOptions });
  for (const fr of frames) {
    const [n] = fr.split(":");
    const file = path.join(out, `f${String(n).padStart(4, "0")}.png`);
    await renderStill({ serveUrl, composition, frame: Number(n), output: file, scale: Number(scale), puppeteerInstance: browser, chromiumOptions, overwrite: true });
    console.log("still", n);
  }
  await browser.close({ silent: true });
})().catch((e) => { console.error("STILLS ERROR:", e.stack || e.message); process.exit(1); });
