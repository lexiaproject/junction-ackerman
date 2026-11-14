// Acciones de las personas y de la clínica, más los controles de la demo (reloj y reinicio).
import { PERSON } from "@/lib/relevo/people";
import { DEFAULT_CONFIG, END, newWorld, type Who } from "@/lib/relevo/sim";
import { addEvent, loadWorld, saveWorld, validWid } from "@/lib/relevo/store";
import { ALLOWED, bad, ok } from "@/lib/relevo/server";

type Body = { w?: unknown; as?: unknown; type?: unknown; p?: unknown };
const isPerson = (v: unknown): v is string => typeof v === "string" && Object.hasOwn(PERSON, v);
// K-03/K-26: lo mínimo que necesita cada acción de la clínica para no reventar la simulación al re-ejecutarse
const CLINIC_NEEDS: Record<string, (p: Record<string, unknown>) => boolean> = {
  call: (p) => isPerson(p.person) && (p.mode !== "schedule" || Number.isFinite(Number(p.at))),
  alert_take: (p) => typeof p.alertId === "string",
  resolve: (p) => typeof p.alertId === "string" || isPerson(p.person),
  ideas_pause: (p) => isPerson(p.mentor),
  ideas_reactivate: (p) => isPerson(p.mentor),
  clinic_rhythm: (p) => isPerson(p.mentor) && [0, 1, 2, 3].includes(p.rhythm as number),
  match_propose: (p) => isPerson(p.mentor) && isPerson(p.mentee),
  match_cancel: (p) => isPerson(p.mentee),
};

export async function POST(req: Request) {
  const raw: unknown = await req.json().catch(() => null);
  const body = (raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {}) as Body;
  const w = typeof body.w === "string" ? body.w : undefined;
  const as = typeof body.as === "string" ? body.as : "";
  const type = typeof body.type === "string" ? body.type : "";
  // K-03: p tiene que ser un objeto plano (null, listas o textos cuentan como vacío)
  const p = (body.p && typeof body.p === "object" && !Array.isArray(body.p) ? body.p : {}) as Record<string, unknown>;
  if (!validWid(w ?? null)) return bad("Missing world id");
  if (JSON.stringify(p).length > 4000) return bad("Too much data", 413); // K-27
  const world = await loadWorld(w!);

  // Controles de la demo
  if (as === "demo") {
    if (type === "clock") {
      const to = Number(p.to);
      if (!Number.isFinite(to)) return bad("Bad time");
      world.clock = Math.max(0, Math.min(END, Math.round(to)));
    } else if (type === "reset") {
      const fresh = newWorld();
      fresh.clock = world.clock;
      fresh.seq = world.seq; // K-40: no repetir ids de nota (podría sonar el audio del ensayo)
      await saveWorld(w!, fresh);
      return ok({ ok: true });
    } else return bad("Unknown demo action");
    await saveWorld(w!, world);
    return ok({ ok: true, clock: world.clock });
  }

  // C5 y C2: configuración de la clínica (queda en la auditoría C6)
  if (as === "clinic" && type === "config") {
    const patch = (p.patch && typeof p.patch === "object" && !Array.isArray(p.patch) ? p.patch : {}) as Record<string, unknown>;
    const c = world.config;
    const changes: string[] = [];
    for (const k of ["l1_R", "l2_R", "l3_R", "domain_hi", "persist_up", "persist_down", "noticeFrom", "noticeTo"] as const) {
      if (k in patch && Number.isFinite(Number(patch[k]))) {
        changes.push(`${k} ${c[k]} → ${Number(patch[k])}`);
        c[k] = Number(patch[k]);
      }
    }
    // K-26: solo claves que ya existen y con el tipo correcto (peso 0-1, catálogo sí/no)
    if (patch.weights && typeof patch.weights === "object") {
      const next: Record<string, number> = { ...c.weights };
      for (const [k, v] of Object.entries(patch.weights)) if (Object.hasOwn(c.weights, k) && v !== null && v !== "" && Number.isFinite(Number(v))) next[k] = Math.max(0, Math.min(1, Number(v)));
      c.weights = next as typeof c.weights;
      changes.push("domain weights updated");
    }
    if (patch.catalog && typeof patch.catalog === "object") {
      const on = Object.entries(patch.catalog).filter(([a, v]) => Object.hasOwn(c.catalog, a) && typeof v === "boolean") as [string, boolean][];
      c.catalog = { ...c.catalog, ...Object.fromEntries(on) };
      if (on.length) changes.push(`catalog: ${on.map(([a, v]) => `${a} ${v ? "on" : "off"}`).join(", ")}`);
    }
    if (patch.reset) {
      world.config = structuredClone(DEFAULT_CONFIG);
      changes.push("all settings back to defaults");
    }
    if (changes.length) world.audit.push({ t: world.clock, who: "Dr. Laine (clinic lead)", what: `Settings: ${changes.join("; ")}` });
    await saveWorld(w!, world);
    return ok({ ok: true });
  }
  if (as === "clinic" && type === "person_thresholds") {
    const id = String(p.person ?? "");
    if (!Object.hasOwn(PERSON, id)) return bad("Unknown person");
    const t: Record<string, number> = {};
    for (const k of ["l1_R", "l2_R", "domain_hi"]) if (Number.isFinite(Number(p[k]))) t[k] = Number(p[k]);
    if (p.clear) delete world.config.person[id];
    else world.config.person[id] = t;
    world.audit.push({ t: world.clock, who: "Anna Virtanen", what: p.clear ? `Thresholds for ${PERSON[id].name} back to defaults` : `Thresholds for ${PERSON[id].name}: ${Object.entries(t).map(([k, v]) => `${k} ${v}`).join(", ")}` });
    await saveWorld(w!, world);
    return ok({ ok: true });
  }

  if (!Object.hasOwn(ALLOWED, as) || !ALLOWED[as].includes(type)) return bad(`${as || "Someone"} can't do “${type}”`, 403);
  if (as === "clinic" && Object.hasOwn(CLINIC_NEEDS, type) && !CLINIC_NEEDS[type](p)) return bad(`Missing or unknown data for “${type}”`);
  addEvent(world, as as Who, type, p);
  if (as === "clinic" && ["call", "resolve", "clinic_rhythm", "ideas_pause", "ideas_reactivate", "match_propose", "match_cancel"].includes(type)) {
    const who = String(p.person ?? p.mentor ?? p.mentee ?? "");
    world.audit.push({ t: world.clock, who: "Anna Virtanen", what: `${type.replace("_", " ")}${Object.hasOwn(PERSON, who) ? ` · ${PERSON[who].name}` : ""}` });
  }
  await saveWorld(w!, world);
  return ok({ ok: true });
}
