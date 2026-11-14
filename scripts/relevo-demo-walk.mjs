// Recorrido de extremo a extremo de la demo de Relevo contra un servidor en marcha (por defecto http://localhost:3000).
// Recorre los 8 pasos del guion y comprueba los "números del contrato" tal como los sirve la API que pinta la interfaz.
// Uso:  node scripts/relevo-demo-walk.mjs [http://localhost:3000]
// Crea un mundo nuevo y desechable (id aleatorio); no toca ningún otro mundo.
const BASE = process.argv[2] ?? "http://localhost:3000";
const W = "walk" + Math.random().toString(36).slice(2, 10);
const DAY = 1440;
const at = (d, hm) => d * DAY + Number(hm.slice(0, 2)) * 60 + Number(hm.slice(3));
let fails = 0;
const ok = (c, m) => {
  console.log(`${c ? "OK  " : "FAIL"} ${m}`);
  if (!c) fails++;
};
const get = async (p) => {
  const r = await fetch(`${BASE}${p}${p.includes("?") ? "&" : "?"}w=${W}`);
  if (!r.ok) throw new Error(`${p} → ${r.status}`);
  return r.json();
};
const act = async (as, type, p = {}) => {
  const r = await fetch(`${BASE}/api/relevo/act`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ w: W, as, type, p }) });
  return r.json();
};
const clock = (t) => act("demo", "clock", { to: t });

try {
  // 1 · Día 0: emparejamiento (0,87 frente a 0,758)
  await clock(at(0, "08:10"));
  let demo = await get("/api/relevo/demo");
  ok(demo.match.pabloLuis?.affinity === 0.886 && demo.match.saraLuis?.affinity === 0.772, `1 · Afinidad Pablo-Luis ${demo.match.pabloLuis?.affinity}, Sara-Luis ${demo.match.saraLuis?.affinity}`);
  let pablo = await get("/api/relevo/mentor?as=pablo");
  ok(pablo.m0?.menteeName === "Luis" && pablo.m0?.percent === 89, `1 · Pablo ve la invitación M0 (afinidad ${pablo.m0?.percent} %)`);

  // 2 · Día 40: copiloto tras la tercera nota en bucle
  await clock(at(40, "21:15"));
  pablo = await get("/api/relevo/mentor?as=pablo");
  let luis = await get("/api/relevo/me?as=luis");
  ok(!!pablo.copilot && !JSON.stringify(luis).includes("Only you see this"), "2 · Pablo tiene sugerencia privada del copiloto; Luis no ve nada");

  // 3 · Día 47: primero se pregunta a Pablo; tras "Sí", Luis lee V2 y Pablo recibe el paseo
  await clock(at(47, "08:30"));
  pablo = await get("/api/relevo/mentor?as=pablo");
  luis = await get("/api/relevo/me?as=luis");
  ok(pablo.card?.question === "Would you like to talk to Luis today?" && !luis.notices.some((n) => n.code === "V2"), "3 · Pregunta de dos pasos a Pablo; Luis aún sin V2");
  await act("pablo", "v1_answer", { choice: "yes" });
  luis = await get("/api/relevo/me?as=luis");
  pablo = await get("/api/relevo/mentor?as=pablo");
  ok(luis.notices.some((n) => n.code === "V2" && n.text === "Pablo would like to talk to you"), "3 · Tras “Yes”, Luis lee “Pablo would like to talk to you”");
  ok(pablo.card?.title === "Suggest a walk tomorrow morning" && !!pablo.card?.message, `3 · Pablo recibe la idea del paseo (texto ${pablo.card?.aiDrafted ? "de Gemini" : "de respaldo"})`);
  demo = await get("/api/relevo/demo");
  ok(demo.bandit.cards.at(-1)?.label === "Walk together" && demo.bandit.start.find((a) => a.key === "paseo_juntos")?.p === 0.62, "3 · Paseo elegido el 24/10 con arranque 0,62");

  // 4 · Días 47-48: Pablo envía, Luis se apunta, "Good" -> 0,70
  await act("pablo", "idea", {}); // no-op inocuo si no aplica
  const note = await fetch(`${BASE}/api/relevo/note`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ w: W, as: "pablo", to: "luis", text: pablo.card?.message ?? "Walk tomorrow at 10?", duration: 6, cardId: pablo.card?.id }) }).then((r) => r.json());
  ok(note.ok === true, "4 · Pablo envía la idea como nota");
  luis = await get("/api/relevo/me?as=luis");
  ok(luis.plan?.status === "proposed" && luis.plan?.title === "20-minute walk", `4 · Luis ve el plan “${luis.plan?.title}”`);
  await act("luis", "plan", { planId: luis.plan?.id, choice: "in" });
  await clock(at(48, "11:30"));
  luis = await get("/api/relevo/me?as=luis");
  await act("luis", "plan_feedback", { planId: luis.plan?.id, feedback: "good" });
  demo = await get("/api/relevo/demo");
  ok(demo.bandit.now.find((a) => a.key === "paseo_juntos")?.p === 0.7, `4 · Tras “Good”, paseo ${demo.bandit.now.find((a) => a.key === "paseo_juntos")?.p}`);

  // 5 · Días 54-55: "Can't today" se respeta; V4; V3 al día siguiente; llamada el 31/10
  await clock(at(54, "09:10"));
  await act("pablo", "v1_answer", { choice: "cant" });
  pablo = await get("/api/relevo/mentor?as=pablo");
  ok(pablo.card === null, "5 · Con “Can't today”, Pablo no ve idea ese día");
  await clock(at(54, "18:00"));
  luis = await get("/api/relevo/me?as=luis");
  ok(luis.notices.map((n) => n.code).join() === "V4", `5 · El 31/10 Luis solo tiene V4 (${luis.notices.map((n) => n.code).join() || "ninguno"})`);
  demo = await get("/api/relevo/demo");
  ok(demo.bandit.cards.some((c) => c.label === "Call or meet up" && c.prepared), "5 · Idea directa preparada el 31/10: llamada");
  const clinic = await get("/api/relevo/clinic");
  const row = clinic.panel.rows.find((r) => r.id === "luis");
  ok(row?.level === 2 && /^High risk/.test(row.summary), `5 · Clínica: Luis nivel 2, resumen por plantilla (“${row?.summary.slice(0, 40)}…”)`);
  await clock(at(55, "09:00"));
  luis = await get("/api/relevo/me?as=luis");
  ok(luis.notices.some((n) => n.code === "V3"), "5 · El 1/11 Luis recibe V3");

  // 6 · Día 57: crisis -> A3, alerta grave, M6
  await clock(at(57, "21:13"));
  luis = await get("/api/relevo/me?as=luis");
  pablo = await get("/api/relevo/mentor?as=pablo");
  const c57 = await get("/api/relevo/clinic");
  ok(!!luis.openHelp && pablo.m6?.menteeName === "Luis" && c57.panel.counters.severe === 1, "6 · Crisis: ayuda abierta para Luis, M6 para Pablo, alerta grave en la clínica");

  // 7 · Días 56-60: proteger al mentor
  await clock(at(60, "09:05"));
  pablo = await get("/api/relevo/mentor?as=pablo");
  const c60 = await get("/api/relevo/clinic");
  ok(pablo.m5?.variant === "pause" && pablo.self.some((s) => s.code === "V5"), "7 · Pablo: M5 variante pausa y V5 de Marta");
  ok(c60.panel.rows.find((r) => r.id === "pablo")?.flags.includes("Review pace"), "7 · La clínica ve “Review pace” en Pablo");

  // 8 · Cierre: simulación
  await clock(at(62, "12:00"));
  demo = await get("/api/relevo/demo");
  const e = demo.evaluation;
  ok(e.l1.sensitivity === 0.9 && e.l1.lead === 6 && e.l1.fa === 2.37 && e.people === 1000, `8 · Simulación: ${e.l1.sensitivity * 100} %, ${e.l1.lead} días, ${e.l1.fa} falsas alarmas, ${e.people} personas`);
} catch (err) {
  ok(false, `Error en el recorrido: ${err.message}`);
}
await act("demo", "reset").catch(() => {});
console.log(fails ? `\n${fails} pasos fallan` : "\nRecorrido de la demo completo: los 8 pasos y los números del contrato coinciden");
process.exit(fails ? 1 : 0);
