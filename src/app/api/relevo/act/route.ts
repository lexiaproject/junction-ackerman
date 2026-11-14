// Acciones de las personas y de la clínica, más los controles de la demo (reloj y reinicio).
import { PERSON } from "@/lib/relevo/people";
import { DEFAULT_CONFIG, END, newWorld, type Who } from "@/lib/relevo/sim";
import { addEvent, loadWorld, saveWorld, validWid } from "@/lib/relevo/store";
import { ALLOWED, bad, ok } from "@/lib/relevo/server";

type Body = { w?: string; as?: string; type?: string; p?: Record<string, unknown> };

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as Body;
  const { w, as = "", type = "", p = {} } = body;
  if (!validWid(w ?? null)) return bad("Missing world id");
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
      await saveWorld(w!, fresh);
      return ok({ ok: true });
    } else return bad("Unknown demo action");
    await saveWorld(w!, world);
    return ok({ ok: true, clock: world.clock });
  }

  // C5 y C2: configuración de la clínica (queda en la auditoría C6)
  if (as === "clinic" && type === "config") {
    const patch = (p.patch ?? {}) as Record<string, unknown>;
    const c = world.config;
    const changes: string[] = [];
    for (const k of ["l1_R", "l2_R", "l3_R", "domain_hi", "persist_up", "persist_down", "noticeFrom", "noticeTo"] as const) {
      if (k in patch && Number.isFinite(Number(patch[k]))) {
        changes.push(`${k} ${c[k]} → ${Number(patch[k])}`);
        c[k] = Number(patch[k]);
      }
    }
    if (patch.weights && typeof patch.weights === "object") {
      c.weights = { ...c.weights, ...(patch.weights as typeof c.weights) };
      changes.push("domain weights updated");
    }
    if (patch.catalog && typeof patch.catalog === "object") {
      c.catalog = { ...c.catalog, ...(patch.catalog as typeof c.catalog) };
      changes.push(`catalog: ${Object.entries(patch.catalog as Record<string, boolean>).map(([a, on]) => `${a} ${on ? "on" : "off"}`).join(", ")}`);
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
    if (!PERSON[id]) return bad("Unknown person");
    const t: Record<string, number> = {};
    for (const k of ["l1_R", "l2_R", "domain_hi"]) if (Number.isFinite(Number(p[k]))) t[k] = Number(p[k]);
    if (p.clear) delete world.config.person[id];
    else world.config.person[id] = t;
    world.audit.push({ t: world.clock, who: "Nurse Virtanen", what: p.clear ? `Thresholds for ${PERSON[id].name} back to defaults` : `Thresholds for ${PERSON[id].name}: ${Object.entries(t).map(([k, v]) => `${k} ${v}`).join(", ")}` });
    await saveWorld(w!, world);
    return ok({ ok: true });
  }

  if (!ALLOWED[as]?.includes(type)) return bad(`${as || "Someone"} can't do “${type}”`, 403);
  addEvent(world, as as Who, type, p);
  if (as === "clinic" && ["call", "resolve", "clinic_rhythm", "ideas_pause", "ideas_reactivate", "match_propose"].includes(type)) {
    const who = String(p.person ?? p.mentor ?? p.mentee ?? "");
    world.audit.push({ t: world.clock, who: "Nurse Virtanen", what: `${type.replace("_", " ")}${PERSON[who] ? ` · ${PERSON[who].name}` : ""}` });
  }
  await saveWorld(w!, world);
  return ok({ ok: true });
}
