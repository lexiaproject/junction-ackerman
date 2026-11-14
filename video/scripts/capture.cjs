// Captura las pantallas reales de Relevo para el anuncio (playwright-core + Chrome, deviceScaleFactor 2).
// Uso: node scripts/capture.cjs   (APP_URL=http://localhost:3000 por defecto; si no responde, usa la web publicada)
// Guarda PNG en public/shots, las cajas (px CSS) de lo que se enfoca en public/shots/shots.json
// y la serie real de Pablo (gráfica del plano 8) en public/shots/pablo-series.json.
"use strict";
const { chromium } = require("playwright-core");
const fs = require("fs");
const path = require("path");

const OUT = path.join(__dirname, "..", "public", "shots");
const T = (d, hm) => d * 1440 + Number(hm.slice(0, 2)) * 60 + Number(hm.slice(3));
const STAMP = Date.now().toString(36);
const CSS = `div:has(> [aria-label="View as"]){display:none!important} nextjs-portal{display:none!important}
  :focus,:focus-visible{outline:none!important} *{scrollbar-width:none!important; caret-color:transparent!important}`;

async function pickBase() {
  const local = process.env.APP_URL || "http://localhost:3000";
  try {
    const r = await fetch(local + "/relevo", { redirect: "manual", signal: AbortSignal.timeout(8000) });
    if (r.status < 500) return local;
  } catch {}
  return "https://junction-ackerman.vercel.app";
}

(async () => {
  const B = await pickBase();
  console.log("app:", B);
  fs.mkdirSync(OUT, { recursive: true });
  const post = (url, body) => fetch(B + url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const clock = (w, t) => post("/api/relevo/act", { w, as: "demo", type: "clock", p: { to: t } });
  const browser = await chromium.launch({ channel: "chrome", headless: true, args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"] });
  const phone = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, permissions: ["microphone"] });
  const desk = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
  const meta = fs.existsSync(path.join(OUT, "shots.json")) ? JSON.parse(fs.readFileSync(path.join(OUT, "shots.json"), "utf8")) : {};
  const only = process.argv.slice(2); // node scripts/capture.cjs luis-plan … → repite solo esas escenas

  const open = async (ctx, url, waitFor) => {
    const p = await ctx.newPage();
    await p.goto(url);
    await p.addStyleTag({ content: CSS });
    if (waitFor) await waitFor(p).first().waitFor({ state: "visible", timeout: 30000 });
    await p.waitForTimeout(1000);
    return p;
  };
  const box = async (loc) => { const b = await loc.first().boundingBox(); if (!b) throw new Error("no box"); return { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height) }; };
  const shot = async (p, name, boxes = {}) => {
    await p.screenshot({ path: path.join(OUT, name + ".png") });
    const vp = p.viewportSize();
    meta[name] = { w: vp.width, h: vp.height, boxes };
    console.log("shot", name, Object.keys(boxes).join(","));
  };
  const card = (loc) => loc.locator("xpath=ancestor::div[contains(@class,'rv-card') or contains(@class,'rv-notice')][1]");
  const scenes = {
    // Día 1: Luis, inicio "Pablo walks with you" y el perfil de Pablo; luego graba una nota
    "luis-home": async () => {
      const w = "ad1" + STAMP; await clock(w, T(1, "10:00"));
      const app = `${B}/relevo/app?w=${w}&as=luis`;
      let p = await open(phone, app, (p) => p.getByRole("button", { name: "See Pablo's profile" }));
      const hold = p.getByRole("button", { name: /Hold to talk to Pablo/ });
      await shot(p, "luis-home", { profile: await box(p.getByRole("button", { name: "See Pablo's profile" })), hold: await box(hold) });
      // mantener pulsado: estado "grabando" con la onda
      await hold.first().scrollIntoViewIfNeeded();
      const hb = await hold.first().boundingBox();
      await p.mouse.move(hb.x + hb.width / 2, hb.y + hb.height / 2);
      await p.mouse.down();
      await p.waitForTimeout(2200);
      await shot(p, "luis-rec", { hold: await box(p.getByRole("button", { name: /Recording/ })).catch(() => box(hold)) });
      await p.mouse.up();
      await p.close();
    },
    // Día 40, 21:10: Pablo, conversación e ideas de respuesta (Gemini; se calienta antes)
    "pablo-ideas": async () => {
      const w = "ad2" + STAMP; await clock(w, T(40, "21:10"));
      await post("/api/relevo/reply-ideas", { w, as: "pablo" }).catch(() => {});
      const p = await open(phone, `${B}/relevo/app?w=${w}&as=pablo`, (p) => p.getByRole("button", { name: "Conversation", exact: true }));
      await p.getByRole("button", { name: "Conversation", exact: true }).click();
      const get = p.getByRole("button", { name: /Get reply ideas/ });
      await get.first().waitFor();
      await p.waitForTimeout(900);
      await shot(p, "pablo-conv", { get: await box(get) });
      await get.first().click();
      await p.getByText("Why it can help").first().waitFor({ timeout: 40000 });
      await p.waitForTimeout(1000);
      await shot(p, "pablo-ideas", { idea: await box(p.locator('[role="dialog"] li').first()) });
      await p.close();
    },
    // Día 47: Pablo, "Would you like to talk to Luis today?"; 09:06 Luis, plan del paseo + "I'm in"
    "luis-plan": async () => {
      const w = "ad3" + STAMP; await clock(w, T(47, "08:30"));
      let p = await open(phone, `${B}/relevo/app?w=${w}&as=pablo`, (p) => p.getByText("Would you like to talk to Luis today?"));
      const q = p.getByText("Would you like to talk to Luis today?");
      await shot(p, "pablo-ask", { card: await box(card(q)), yes: await box(p.getByRole("button", { name: "Yes", exact: true })) });
      await p.close();
      await clock(w, T(47, "09:06"));
      p = await open(phone, `${B}/relevo/app?w=${w}&as=luis`, (p) => p.getByRole("button", { name: /I.m in/ }));
      const inBtn = p.getByRole("button", { name: /I.m in/ }).first();
      await inBtn.scrollIntoViewIfNeeded();
      await p.waitForTimeout(600);
      const thought = p.getByText(/Pablo thought of you/);
      await shot(p, "luis-plan", { plan: await box(card(inBtn)), in: await box(inBtn), thought: await box(thought).catch(() => null) });
      await inBtn.click();
      await p.getByText(/You.re in\. Pablo knows\./).first().waitFor({ timeout: 15000 });
      await p.waitForTimeout(1200);
      await shot(p, "luis-plan-in", { done: await box(p.getByText(/You.re in\. Pablo knows\./)) });
      await p.close();
    },
    // Día 56: Marta recibe la pregunta y dice que sí; 09:05 Pablo ve "Marta would like to talk to you"
    "marta-ask": async () => {
      const w = "ad4" + STAMP; await clock(w, T(56, "08:31"));
      let p = await open(phone, `${B}/relevo/app?w=${w}&as=marta`, (p) => p.getByText("Would you like to talk to Pablo today?"));
      const mq = p.getByText("Would you like to talk to Pablo today?");
      await shot(p, "marta-ask", { card: await box(card(mq)) });
      const yes = card(mq).getByRole("button", { name: "Yes", exact: true });
      if (await yes.count()) { await yes.first().click(); await p.waitForTimeout(1500); }
      await p.close();
      await clock(w, T(56, "09:05"));
      p = await open(phone, `${B}/relevo/app?w=${w}&as=pablo`, (p) => p.getByText("Marta would like to talk to you"));
      await shot(p, "pablo-marta", { notice: await box(card(p.getByText("Marta would like to talk to you"))) });
      await p.close();
    },
    // Día 60, 08:35: clínica, fila de Pablo con "Review pace"; y la serie real de Pablo
    "clinic": async () => {
      const w = "ad5" + STAMP; await clock(w, T(60, "08:35"));
      const p = await open(desk, `${B}/relevo/clinic?w=${w}`, (p) => p.locator("tr").filter({ hasText: "Pablo" }));
      const row = p.locator("tr").filter({ hasText: "Pablo" }).first();
      await shot(p, "clinic", { row: await box(row), pace: await box(row.getByText(/Review pace/)).catch(() => box(row)) });
      await p.close();
      const d = await (await fetch(`${B}/api/relevo/demo?w=${w}`)).json();
      fs.writeFileSync(path.join(OUT, "pablo-series.json"), JSON.stringify(d.pablo.series));
      console.log("series", d.pablo.series.labels.length, "días");
    },
  };

  for (const [name, fn] of Object.entries(scenes)) {
    if (only.length && !only.includes(name)) continue;
    try { await fn(); } catch (e) { console.error("FALLO en", name + ":", e.message.split("\n")[0]); }
  }
  fs.writeFileSync(path.join(OUT, "shots.json"), JSON.stringify(meta, null, 2));
  await browser.close();
  console.log("hecho:", Object.keys(meta).length, "capturas");
})().catch((e) => { console.error("CAPTURE ERROR:", e.message); process.exit(1); });
