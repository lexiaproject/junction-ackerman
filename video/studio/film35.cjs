// Vídeo de 35 s de Relevo en el estilo del vídeo largo: estudio 1920×1080 con los móviles y la clínica reales,
// cámara, tarjetas de día, subtítulos y cadena. Cada escena usa su propia demo, ya preparada en su día exacto,
// así no hay recargas durante la grabación. Al final se recorta a 35 s exactos y se pasa a MP4 H.264.
// Uso: node studio/film35.cjs --rehearse  |  node studio/film35.cjs   → video/out/relevo-35s.mp4
"use strict";
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const NPX_PW = "C:/Users/kinzz/AppData/Local/npm-cache/_npx/9833c18b2d85bc59/node_modules/playwright";
const { chromium } = require(fs.existsSync(NPX_PW) ? NPX_PW : "playwright-core");

const B = process.env.B || "https://junction-ackerman.vercel.app";
const REHEARSE = process.argv.includes("--rehearse");
const LEN = 35;
const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "out");
const FFMPEG = path.join(ROOT, "node_modules", "@remotion", "compositor-win32-x64-msvc", "ffmpeg.exe");
const T = (d, hm) => d * 1440 + Number(hm.slice(0, 2)) * 60 + Number(hm.slice(3));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (...a) => console.log(new Date().toISOString().slice(14, 22), ...a);
const base = "f35" + Date.now().toString(36);
const WS = { s1: base + "a", s2: base + "b", s3: base + "c", s4: base + "d", s5: base + "e" };
const app = (w, as) => `${B}/relevo/app?w=${w}&as=${as}`;
const act = (w, type, p = {}, as = "demo") =>
  fetch(`${B}/api/relevo/act`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ w, as, type, p }) }).then((r) => r.json());
let problems = 0;

const OFFP = (i) => ({ x: 2600 + i * 10, y: 560, s: 0.86, o: 0 });
const ACTORS = ["luis1", "pablo1", "luis2", "pablo3", "luis4", "pablo4", "luis5", "clinic5"];
const offAll = () => Object.fromEntries(ACTORS.map((id, i) => [id, id.startsWith("clinic") ? { x: 2900, y: 560, s: 0.5, o: 0 } : OFFP(i)]));
const LAY = {
  s1: { luis1: { x: 1110, y: 560, s: 0.86, r: -2 }, pablo1: { x: 1570, y: 545, s: 0.86, r: 2 } },
  s1in: { luis1: { x: 1110, y: 1500, s: 0.86, r: -8, o: 0 }, pablo1: { x: 1570, y: 1500, s: 0.86, r: 8, o: 0 } },
  s2: { luis2: { x: 1380, y: 545, s: 0.9 } },
  s3: { pablo3: { x: 1380, y: 545, s: 0.9 } },
  s4: { luis4: { x: 1110, y: 560, s: 0.86, r: -2 }, pablo4: { x: 1570, y: 545, s: 0.86, r: 2 } },
  s5: { luis5: { x: 1010, y: 560, s: 0.86, r: -1.5 }, clinic5: { x: 1560, y: 560, s: 0.48, r: 1 } },
};

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: true, channel: "chrome" });

  /* ---------- Preparación (no se graba): una demo por escena en su día, IA en caché, retratos ---------- */
  await Promise.all([
    act(WS.s1, "clock", { to: T(0, "08:10") }),
    act(WS.s2, "clock", { to: T(1, "10:00") }),
    act(WS.s3, "clock", { to: T(40, "21:10") }),
    act(WS.s4, "clock", { to: T(47, "08:30") }),
    act(WS.s5, "clock", { to: T(54, "10:11") }),
  ]);
  const ri = await fetch(`${B}/api/relevo/reply-ideas`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ w: WS.s3, as: "pablo" }) }).then((r) => r.json());
  log("worlds ready · reply ideas:", ri.status, ri.source);
  const prep = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await prep.goto(app(WS.s3, "pablo"));
  await prep.getByRole("button", { name: "My relay", exact: true }).click();
  await prep.waitForTimeout(1500);
  const faces = await prep.evaluate(() => {
    const out = {};
    document.querySelectorAll("span[aria-hidden] svg").forEach((svg) => {
      const m = (svg.querySelector("clipPath")?.id ?? "").match(/rv-face-([A-Za-z]+)-/);
      if (m && !out[m[1]]) out[m[1]] = svg.outerHTML.replace(/rv-face-/g, "studio-face-");
    });
    return out;
  });
  await prep.close();

  /* ---------- Estudio ---------- */
  const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 }, ...(REHEARSE ? {} : { recordVideo: { dir: path.join(OUT, "rec35"), size: { width: 1920, height: 1080 } } }) });
  const pageStart = Date.now(); // el vídeo empieza a grabar al crear la página: medir antes, no después
  const page = await ctx.newPage();
  await page.setContent(fs.readFileSync(path.join(__dirname, "studio.html"), "utf8"), { waitUntil: "domcontentloaded" });
  const S = (fn, ...args) => page.evaluate(([fn, args]) => window[fn](...args), [fn, args]);
  const F = (id) => page.frameLocator(`#${id} iframe`);
  const PL = "Pablo <span>· finished TMS in May</span>";
  const LL = "Luis <span>· just finished TMS</span>";
  await S("addPhone", "luis1", app(WS.s1, "luis"), LL, "08:10");
  await S("addPhone", "pablo1", app(WS.s1, "pablo"), PL, "08:10");
  await S("addPhone", "luis2", app(WS.s2, "luis"), LL, "10:00");
  await S("addPhone", "pablo3", app(WS.s3, "pablo"), PL, "21:10");
  await S("addPhone", "luis4", app(WS.s4, "luis"), LL, "08:30");
  await S("addPhone", "pablo4", app(WS.s4, "pablo"), PL, "08:30");
  await S("addPhone", "luis5", app(WS.s5, "luis"), LL, "10:11");
  await S("addWindow", "clinic5", `${B}/relevo/clinic?w=${WS.s5}`);
  await S("layout", offAll(), 0);
  await S("buildChain", "chain1", faces);
  await S("buildChain", "chain2", faces);

  const ready = async (loc, label, timeout = 25000) => {
    try { await loc.first().waitFor({ state: "visible", timeout }); return true; } catch { problems++; log("MISS", label); return false; }
  };
  await Promise.all([
    ready(F("pablo1").getByRole("button", { name: "I'm interested" }), "pablo1"),
    ready(F("luis2").getByRole("button", { name: "See Pablo's profile" }), "luis2"),
    ready(F("pablo3").getByRole("button", { name: "Conversation", exact: true }), "pablo3"),
    ready(F("pablo4").getByText("Would you like to talk to Luis today?"), "pablo4"),
    ready(F("luis5").getByText(/Anna, your nurse/), "luis5"),
    ready(F("clinic5").locator("tr").filter({ hasText: "Luis" }), "clinic5"),
  ]);
  for (const f of page.frames()) if (f !== page.mainFrame()) await f.addStyleTag({ content: `div:has(> [aria-label="View as"]){display:none!important} :focus,:focus-visible{outline:none!important}` }).catch(() => {});
  // Día 40: la hoja de ideas ya abierta antes de su escena
  // (clics internos: el móvil está fuera de cuadro y un clic por coordenadas no le llegaría)
  await F("pablo3").getByRole("button", { name: "Conversation", exact: true }).dispatchEvent("click");
  await F("pablo3").getByRole("button", { name: /Get reply ideas/ }).dispatchEvent("click", {}, { timeout: 15000 });
  await ready(F("pablo3").getByText("Why it can help"), "ideas loaded");
  await sleep(800);

  const center = async (loc) => { const b = await loc.first().boundingBox(); return b && { x: b.x + b.width / 2, y: b.y + b.height / 2 }; };
  const tapOn = async (loc, label) => {
    if (!(await ready(loc, label, 6000))) return;
    const c = await center(loc);
    await S("cursorTo", c.x, c.y, 550);
    await sleep(620);
    await S("tap", c.x, c.y);
    await loc.first().click({ force: true }).catch((e) => { problems++; log("CLICKFAIL", label, e.message); });
    await sleep(200);
    await S("cursorHide");
  };
  const ringOn = async (loc, label, pad = 8) => { if (await ready(loc, label, 6000)) { const b = await loc.first().boundingBox(); if (b) await S("ring", b, pad); } };
  let lay = {};
  const setLay = async (name, dur) => { lay = { ...lay, ...LAY[name] }; await S("layout", LAY[name], dur); };
  const focus = async (id, s = 1.13, ax = 1290, dur = 900) => {
    for (const k of Object.keys(lay)) if (k !== id && (lay[k].o ?? 1) > 0) await S("place", k, { ...lay[k], o: 0.06 }, dur);
    await S("place", id, { ...lay[id], r: 0, o: 1 }, dur);
    await S("frame", lay[id].x, lay[id].y, s, ax, 540, dur);
  };
  const zoomTo = async (loc, s, ax = 1300, ay = 560, dur = 1500) => {
    const c = await center(loc); if (!c) return;
    const cam = await S("getCam");
    await S("frame", (c.x - cam.tx) / cam.s, (c.y - cam.ty) / cam.s, s, ax, ay, dur);
  };
  const scene = async (name) => { await S("cam", 0, 0, 1, 0); await S("layout", offAll(), 0); lay = {}; await setLay(name, 0); };
  const chapter = async (from, to, sub, name) => { await S("ring", null); await S("caption", null); await S("chapter", "Day", from, to, sub, 420); await sleep(450); await scene(name); };

  /* ---------- Línea de tiempo (segundos desde t0) ---------- */
  const t0 = Date.now();
  const offset = (t0 - pageStart) / 1000;
  const at = async (t) => { const d = t0 + t * 1000 - Date.now(); if (d > 0) await sleep(d); else if (d < -350) log(`late ${(-d / 1000).toFixed(2)}s at ${t}s`); };
  try {
    // 0 · El problema
    await at(0.25); await S("cold", 1);
    await at(1.75); await S("cold", 2);
    await at(3.35); await S("cold", 3);
    // 1 · Relevo y la cadena
    await at(5.0); await page.evaluate(() => { document.getElementById("cold").style.opacity = 0; }); await S("titleGo");
    await at(6.2); await S("chainGo", "chain1", "chainline1");
    // 2 · Emparejamiento: lo que no le toca al acompañante
    await at(8.6); await S("show", "title", false); await S("veil", true);
    await S("layout", LAY.s1in, 0); lay = { ...LAY.s1 }; await sleep(50); await S("layout", LAY.s1, 900);
    await S("caption", "Matching", "A companion who's been there", "Luis is paired with Pablo, who finished TMS in May.");
    await at(10.0); await focus("pablo1");
    await at(11.0); await tapOn(F("pablo1").getByRole("button", { name: "I'm interested" }), "I'm interested");
    await at(11.9); await S("caption", "Matching", "Company, not responsibility", "Pablo is never their therapist. The clinic handles anything serious.");
    await ringOn(F("pablo1").locator(".rv-notice").filter({ hasText: "What's not on you" }), "not on you");
    // 3 · Día 1: Luis conoce a Pablo
    await at(14.0); await chapter(0, 1, "Luis meets Pablo", "s2");
    await at(14.8); await S("chapterOut"); await S("caption", "Day 1", "Real people, not alerts", "A face, a story, what helped him, a voice saying hello.");
    await focus("luis2", 1.12, 1290, 600);
    await at(15.2); await tapOn(F("luis2").getByRole("button", { name: "See Pablo's profile" }), "profile");
    await at(16.3); await ringOn(F("luis2").getByText("What helped me").locator(".."), "what helped me");
    // 4 · Día 40: ideas de respuesta
    await at(18.4); await chapter(1, 40, "Mid-October", "s3");
    await at(19.2); await S("chapterOut"); await S("caption", "Day 40", "Help finding the words", "Warm reply ideas from peer-support practice. Never clinical advice.");
    await sleep(250); await zoomTo(F("pablo3").locator('[role="dialog"] li').first(), 1.5, 1300, 600, 1700);
    // 5 · Día 47: primero se pregunta al acompañante; Luis solo ve un aviso amable
    await at(22.4); await chapter(40, 47, "Three days of change", "s4");
    await at(23.2); await S("chapterOut"); await S("caption", "Day 47", "The companion is asked first", "Nobody gets an alarm. Pablo can say yes or no.");
    await focus("pablo4", 1.13, 1290, 700);
    await at(23.9); await tapOn(F("pablo4").getByRole("button", { name: "Yes", exact: true }), "yes");
    for (const f of page.frames()) if (f.url().includes(WS.s4)) await f.evaluate(() => window.dispatchEvent(new Event("relevo:changed"))).catch(() => {});
    await at(25.1); await focus("luis4", 1.13, 1290, 650); await S("caption", "Day 47", "A nudge, not an alert", "Luis only sees: Pablo would like to talk to you.");
    await at(25.8); await ringOn(F("luis4").locator(".rv-notice").first(), "V2");
    // 6 · Día 54: la clínica sigue al mando
    await at(27.4); await chapter(47, 54, "A harder week", "s5");
    await at(28.2); await S("chapterOut"); await S("caption", "Day 54", "The clinic stays in charge", "When the risk is high, Anna, Luis's nurse, calls him.");
    await at(28.7); await ringOn(F("luis5").locator(".rv-notice").first(), "Anna");
    // 7 · Cierre
    await at(31.0); await S("ring", null); await S("caption", null);
    await page.evaluate(() => { document.getElementById("outro").style.opacity = 1; }); await S("chainGo", "chain2");
    await at(LEN + 0.4);
  } catch (e) { problems++; log("ERROR", e.message); }
  await ctx.close();
  if (!REHEARSE) {
    const src = await page.video().path();
    const dest = path.join(OUT, "relevo-35s.mp4");
    execFileSync(FFMPEG, ["-y", "-loglevel", "error", "-ss", offset.toFixed(3), "-i", src, "-t", String(LEN), "-r", "30", "-c:v", "libx264", "-preset", "slow", "-crf", "18", "-pix_fmt", "yuv420p", "-movflags", "+faststart", dest]);
    log("video:", dest, (fs.statSync(dest).size / 1e6).toFixed(1) + " MB", "· trimmed from", offset.toFixed(2) + "s");
  }
  await browser.close();
  log(problems ? `${problems} problems` : "all steps ok");
})();
