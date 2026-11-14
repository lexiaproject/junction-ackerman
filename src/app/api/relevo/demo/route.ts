// Solo demo: reloj simulado y capa de explicación
import { demoView } from "@/lib/relevo/demo";
import { evaluate } from "@/lib/relevo/sim";
import { loadWorld } from "@/lib/relevo/store";
import { bad, ok, wid } from "@/lib/relevo/server";

export async function GET(req: Request) {
  const w = wid(req);
  if (!w) return bad("Missing world id");
  const world = await loadWorld(w);
  return ok(demoView(evaluate(world)));
}
