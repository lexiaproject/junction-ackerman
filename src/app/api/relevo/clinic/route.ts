// Web de la clínica (C1-C6): la única que ve datos. Resúmenes por plantilla, nunca redactados por IA.
import { PERSON } from "@/lib/relevo/people";
import { DEFAULT_CONFIG, evaluate } from "@/lib/relevo/sim";
import { loadWorld, saveWorld } from "@/lib/relevo/store";
import { catalogList, clinicAlerts, clinicConsents, clinicMatching, clinicPanel, personFile } from "@/lib/relevo/views";
import { bad, ok, wid } from "@/lib/relevo/server";

export async function GET(req: Request) {
  const w = wid(req);
  if (!w) return bad("Missing world id");
  const person = new URL(req.url).searchParams.get("person");
  const world = await loadWorld(w);
  // C6: registro de quién ha consultado cada ficha y cuándo
  if (person && PERSON[person]) {
    const last = world.audit.at(-1);
    const what = `Opened ${PERSON[person].name}'s file`;
    if (!last || last.what !== what || last.t !== world.clock) {
      world.audit.push({ t: world.clock, who: "Anna Virtanen", what });
      world.audit = world.audit.slice(-200);
      await saveWorld(w, world);
    }
  }
  const sim = evaluate(world);
  return ok({
    clock: { t: sim.now },
    panel: clinicPanel(sim),
    alerts: clinicAlerts(sim),
    matching: clinicMatching(sim),
    consents: clinicConsents(sim),
    config: { current: world.config, defaults: DEFAULT_CONFIG, catalog: catalogList(sim) },
    person: person && PERSON[person] ? personFile(sim, person) : null,
  });
}
