// Captura las pantallas reales de Relevo para el anuncio (Playwright, deviceScaleFactor 2, datos de demo fijos).
// Uso: node scripts/capture.cjs   (APP_URL=http://localhost:3000 por defecto; si no responde, usa la web publicada)
// Guarda PNG en public/shots y, en public/shots/shots.json, el tamaño y las cajas (en px CSS) de lo que se enfoca o pulsa.
"use strict";
const { chromium } = require("playwright-core");
const fs = require("fs");
const path = require("path");

const OUT = path.join(__dirname, "..", "public", "shots");
const T = (d, hm) => d * 1440 + Number(hm.slice(0, 2)) * 60 + Number(hm.slice(3));
const W = "ad" + Date.now().toString(36);
const CSS = `div:has(> [aria-label="View as"]){display:none!important} nextjs-portal{display:none!important}
  :focus,:focus-visible{outline:none!important} *{scrollbar-width:none!important; caret-color:transparent!important}
  .rv-in, .rv-in *{animation:none!important}`;

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
  console.log("app:", B, "world:", W);
  fs.mkdirSync(OUT, { recursive: true });
  const clock = (t) => fetch(`${B}/api/relevo/act`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ w: W, as: "demo", type: "clock", p: { to: t } }) });
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const phone = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const desk = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
  const meta = {};

  const open = async (ctx, url, waitFor) => {
    const p = await ctx.newPage();
    await p.goto(url);
    await p.addStyleTag({ content: CSS });
    if (waitFor) await waitFor(p).first().waitFor({ state: "visible", timeout: 30000 });
    await p.waitForTimeout(900); // sin cargas visibles: espera a que la vista esté quieta
    return p;
  };
  const box = async (loc) => { const b = await loc.first().boundingBox(); if (!b) throw new Error("no box"); return { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height) }; };
  const shot = async (p, name, boxes = {}) => {
    await p.screenshot({ path: path.join(OUT, name + ".png") });
    const vp = p.viewportSize();
    meta[name] = { w: vp.width, h: vp.height, boxes };
    console.log("shot", name, Object.keys(boxes).join(","));
  };
  const app = (as) => `${B}/relevo/app?w=${W}&as=${as}`;
  const card = (loc) => loc.locator("xpath=ancestor::div[contains(@class,'rv-card') or contains(@class,'rv-notice')][1]");

  // Las ideas de respuesta del día 40 se piden antes (Gemini tarda unos segundos) para que la captura no tenga cargas
  await clock(T(40, "21:10"));
  await fetch(`${B}/api/relevo/reply-ideas`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ w: W, as: "pablo" }) }).catch(() => {});

  // 1 · Día 0: la invitación de Pablo y "What's not on you"
  await clock(T(0, "08:10"));
  let p = await open(phone, app("pablo"), (p) => p.getByRole("button", { name: "I'm interested" }));
  await p.getByRole("button", { name: "I'm interested" }).click();
  await p.getByText("What's not on you").waitFor();
  await p.waitForTimeout(700);
  await shot(p, "pablo-role", { notOnYou: await box(p.locator(".rv-notice").filter({ hasText: "What's not on you" })) });
  await p.close();

  // 2 · Día 1: Luis abre el perfil de Pablo
  await clock(T(1, "10:00"));
  p = await open(phone, app("luis"), (p) => p.getByRole("button", { name: "See Pablo's profile" }));
  const prof = p.getByRole("button", { name: "See Pablo's profile" });
  await shot(p, "luis-home", { profile: await box(prof) });
  await prof.click();
  await p.getByText("What helped me").waitFor();
  await p.waitForTimeout(900);
  await shot(p, "luis-profile", { card: await box(p.locator('[role="dialog"] .rv-card').first()), helped: await box(p.getByText("What helped me").locator("..")) });
  await p.close();

  // 3 · Día 40: ideas de respuesta para Pablo
  await clock(T(40, "21:10"));
  p = await open(phone, app("pablo"), (p) => p.getByRole("button", { name: "Conversation", exact: true }));
  await p.getByRole("button", { name: "Conversation", exact: true }).click();
  await p.getByRole("button", { name: /Get reply ideas/ }).click();
  await p.getByText("Why it can help").first().waitFor({ timeout: 30000 });
  await p.waitForTimeout(900);
  await shot(p, "pablo-ideas", { idea: await box(p.locator('[role="dialog"] li').first()) });
  await p.close();

  // 4 · Día 47: a Pablo se le pregunta primero; dice que sí; Luis solo ve un aviso amable
  await clock(T(47, "08:30"));
  p = await open(phone, app("pablo"), (p) => p.getByText("Would you like to talk to Luis today?"));
  const q = p.getByText("Would you like to talk to Luis today?");
  const yes = p.getByRole("button", { name: "Yes", exact: true });
  await shot(p, "pablo-ask", { question: await box(q), card: await box(card(q)), yes: await box(yes) });
  await yes.click();
  await p.waitForTimeout(1800);
  await shot(p, "pablo-ask-yes", {});
  await p.close();
  await clock(T(47, "08:32"));
  p = await open(phone, app("luis"), (p) => p.getByText("Pablo would like to talk to you"));
  await shot(p, "luis-v2", { notice: await box(card(p.getByText("Pablo would like to talk to you"))) });
  await p.close();

  // 5 · Día 47: Luis responde "I'm in" al paseo
  await clock(T(47, "09:06"));
  p = await open(phone, app("luis"), (p) => p.getByRole("button", { name: /I.m in/ }));
  const inBtn = p.getByRole("button", { name: /I.m in/ }).first();
  const plan = card(inBtn);
  await shot(p, "luis-plan", { plan: await box(plan), in: await box(inBtn) });
  await inBtn.click();
  await p.waitForTimeout(1600);
  await shot(p, "luis-plan-in", {});
  await p.close();

  // 6 · Día 56: Marta recibe la pregunta sobre Pablo
  await clock(T(56, "08:31"));
  p = await open(phone, app("marta"), (p) => p.getByText("Would you like to talk to Pablo today?"));
  const mq = p.getByText("Would you like to talk to Pablo today?");
  await shot(p, "marta-ask", { question: await box(mq), card: await box(card(mq)) });
  await p.close();

  // 7 · Día 54: Anna llamará a Luis; en la clínica, Luis en "Call today"
  await clock(T(54, "10:11"));
  p = await open(phone, app("luis"), (p) => p.getByText(/Anna, your nurse/));
  await shot(p, "luis-anna", { notice: await box(card(p.getByText(/Anna, your nurse/))) });
  await p.close();
  p = await open(desk, `${B}/relevo/clinic?w=${W}`, (p) => p.locator("tr").filter({ hasText: "Luis" }));
  const row = p.locator("tr").filter({ hasText: "Luis" }).first();
  await shot(p, "clinic-call", { row: await box(row), call: await box(row.getByRole("button", { name: /Call/ })).catch(() => box(row)) });
  await p.close();

  fs.writeFileSync(path.join(OUT, "shots.json"), JSON.stringify(meta, null, 2));
  await browser.close();
  console.log("done:", Object.keys(meta).length, "shots");
})().catch((e) => { console.error("CAPTURE ERROR:", e.message); process.exit(1); });
