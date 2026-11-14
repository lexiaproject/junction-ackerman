// Comprueba que el motor en TypeScript da los mismos números que el motor de referencia en Python
// (lista de aceptación, sección 13, puntos 11-15). Uso:  node scripts/relevo-check.mjs
import fs from "node:fs";
import {
  runPerson, rhythmProposals, banditColdStart, banditUpdate, banditProbs, affinity, fingerprint,
  complaintIndex, a6ShouldFire, crisisFlag,
} from "../src/lib/relevo/engine.ts";

const here = new URL(".", import.meta.url);
const read = (p) => JSON.parse(fs.readFileSync(new URL(p, here), "utf8"));
const luisRaw = read("../src/lib/relevo/data/luis.json");
const pabloRaw = read("../src/lib/relevo/data/pablo.json");
let fails = 0;
const ok = (cond, msg) => {
  console.log(`${cond ? "OK  " : "FAIL"} ${msg}`);
  if (!cond) fails++;
};

function csv(name) {
  const [h, ...rows] = fs.readFileSync(new URL(name, here), "utf8").trim().split(/\r?\n/);
  const keys = h.split(",");
  return rows.map((r) => Object.fromEntries(r.split(",").map((v, i) => [keys[i], v === "" ? null : Number.isNaN(Number(v)) ? v : Number(v)])));
}

function compare(label, run, ref) {
  let maxR = 0, maxZ = 0, lvlDiff = 0;
  run.days.forEach((d, i) => {
    const r = ref[i];
    if (r.R_suav !== null && d.Rs !== null) maxR = Math.max(maxR, Math.abs(r.R_suav - d.Rs));
    else if ((r.R_suav === null) !== (d.Rs === null)) maxR = Infinity;
    for (const [k, v] of Object.entries(r)) if (k.startsWith("z_") && v !== null) maxZ = Math.max(maxZ, Math.abs(v - (d.z[k.slice(2)] ?? NaN)));
    if (r.level !== d.level) lvlDiff++;
  });
  ok(maxR < 1e-6, `${label}: R_suav igual a Python (diferencia máx. ${maxR.toExponential(2)})`);
  ok(maxZ < 1e-6, `${label}: z de los 16 rasgos igual a Python (diferencia máx. ${maxZ.toExponential(2)})`);
  ok(lvlDiff === 0, `${label}: nivel igual a Python los ${run.days.length} días (${lvlDiff} distintos)`);
}

// 11. Luis: nivel 1 el 24/10, nivel 2 el 31/10, nivel 3 el 3/11 (crisis), vuelve a 2 el 5/11
const luis = runPerson(luisRaw, { tstDirection: 1, crisisDays: new Set(["2026-11-03"]), clinicResolutions: new Set(["2026-11-05"]) });
compare("Luis", luis, csv("demo_luis_engine_v3.csv"));
const first = (run, L) => run.days.find((d) => d.level >= L)?.date;
ok(first(luis, 1) === "2026-10-24", `Luis entra en nivel 1 el ${first(luis, 1)}`);
ok(first(luis, 2) === "2026-10-31", `Luis entra en nivel 2 el ${first(luis, 2)}`);
ok(first(luis, 3) === "2026-11-03", `Luis entra en nivel 3 el ${first(luis, 3)}`);
ok(luis.days.find((d) => d.date === "2026-11-05").level === 2, "Luis vuelve a nivel 2 el 2026-11-05 al resolver la clínica");
const d47 = luis.days.find((d) => d.date === "2026-10-24");
console.log("     24/10:", { movilidad: d47.s.movilidad.toFixed(2), sueno: d47.s.sueno.toFixed(2), Rs: d47.Rs.toFixed(2), steps: d47.z.steps7, entropy: d47.z.entropy7.toFixed(1), home: d47.z.home7.toFixed(1) });

// 12. Pablo: nivel 1 el 2/11, nivel 2 el 6/11; ritmo propuesto "Pausa" el 6/11
const pablo = runPerson(pabloRaw, { tstDirection: 1 });
compare("Pablo", pablo, csv("demo_pablo_engine_v3.csv"));
ok(first(pablo, 1) === "2026-11-02", `Pablo entra en nivel 1 el ${first(pablo, 1)}`);
ok(first(pablo, 2) === "2026-11-06", `Pablo entra en nivel 2 el ${first(pablo, 2)}`);
const props = rhythmProposals(pablo.days.map((d) => ({ date: d.date, level: d.level }))).filter((x) => x.kind === "proposal");
ok(props.length === 1 && props[0].date === "2026-11-06" && props[0].proposal.rhythm === 0, `Ritmo propuesto a Pablo: ${JSON.stringify(props.map((x) => [x.date, x.proposal.rhythm]))}`);

// 13. Afinidad Pablo-Luis = 0,87; Sara-Luis = 0,758
const L = { id: "luis", fp: fingerprint({ sueno: 2, movilidad: 2, movil_vinculo: 1, dir_sueno: 1 }), monthsPostTms: 0.1, level0Weeks: 0, acuteRelapse: false, hours: ["manana", "tarde"], lang: "es", prefs: ["voz", "presencial"], zone: "Espoo" };
const P = { id: "pablo", fp: fingerprint({ sueno: 2, movilidad: 1, movil_vinculo: 2, dir_sueno: 1 }), monthsPostTms: 4, level0Weeks: 8, acuteRelapse: false, hours: ["manana"], lang: "es", prefs: ["voz", "presencial"], zone: "Espoo" };
const S = { id: "sara", fp: fingerprint({ sueno: 2, ritmo: 1, fisiologia: 1, dir_sueno: -1 }), monthsPostTms: 6, level0Weeks: 10, acuteRelapse: false, hours: ["manana", "tarde"], lang: "es", prefs: ["voz"], zone: "Helsinki" };
ok(affinity(P, L).score === 0.87, `Afinidad Pablo-Luis ${affinity(P, L).score}`);
ok(affinity(S, L).score === 0.758, `Afinidad Sara-Luis ${affinity(S, L).score}`);

// 14. Índices de queja de las tres notas de ejemplo: 0,57 / 0,72 / 0,78 -> A6 en la tercera
const notes = [
  "Esta semana duermo fatal, me despierto cansado y no tengo ganas de nada.",
  "Otra vez he dormido fatal, estoy cansado, sin ganas de nada, todo igual.",
  "Nada, lo mismo, duermo fatal y estoy cansado todo el día, sin ganas.",
];
const idx = notes.map((n, i) => complaintIndex(n, notes.slice(0, i)).indice_queja);
ok(JSON.stringify(idx) === "[0.57,0.72,0.78]", `Índices de queja ${JSON.stringify(idx)}`);
ok(!a6ShouldFire(idx.slice(0, 2)) && a6ShouldFire(idx), "A6 salta en la tercera nota, no antes");
const en = [
  "This week I'm sleeping awful, I wake up tired and I don't feel like doing anything.",
  "Again I slept awful, I'm tired, no energy for anything, always the same.",
  "Nothing new, the same, sleeping awful and tired all day, no energy.",
];
const idxEn = en.map((n, i) => complaintIndex(n, en.slice(0, i)).indice_queja);
ok(!a6ShouldFire(idxEn.slice(0, 2)) && a6ShouldFire(idxEn), `Notas en inglés (demo): ${JSON.stringify(idxEn)} -> A6 en la tercera`);
ok(crisisFlag("a veces pienso que quiero morir") && crisisFlag("Sometimes I just want to die") && !crisisFlag("I'm dying to see you"), "Filtro de crisis (lista fija)");

// 15. Bandido: arranque paseo 0,62 -> 0,70 tras "Bien"
const pb = banditColdStart();
for (const [a, w, l] of [["paseo_juntos", 4, 1], ["llamada_o_quedar", 2, 2], ["actividad_con_sentido", 1, 2]]) {
  for (let i = 0; i < w; i++) banditUpdate(pb, a, "movilidad", 1);
  for (let i = 0; i < l; i++) banditUpdate(pb, a, "movilidad", 0);
}
const lb = banditColdStart(pb);
const round = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, Math.round(v * 100) / 100]));
const before = round(banditProbs(lb, "movilidad"));
banditUpdate(lb, "paseo_juntos", "movilidad", 1);
const after = round(banditProbs(lb, "movilidad"));
ok(round(banditProbs(pb, "movilidad")).paseo_juntos === 0.69, `Lo que le funcionó a Pablo: ${JSON.stringify(round(banditProbs(pb, "movilidad")))}`);
ok(before.paseo_juntos === 0.62 && before.llamada_o_quedar === 0.5 && before.actividad_con_sentido === 0.5, `Arranque de la pareja: ${JSON.stringify(before)}`);
ok(after.paseo_juntos === 0.7, `Tras "Bien": ${JSON.stringify(after)}`);

console.log(fails ? `\n${fails} comprobaciones fallan` : "\nTodo coincide con el motor de referencia");
process.exit(fails ? 1 : 0);
