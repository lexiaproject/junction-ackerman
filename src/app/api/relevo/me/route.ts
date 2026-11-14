// App del acompañado (A0-A5). Nunca incluye nivel, índice ni rasgos (regla de serialización, sección 11.3).
import { evaluate } from "@/lib/relevo/sim";
import { loadWorld } from "@/lib/relevo/store";
import { menteeView } from "@/lib/relevo/views";
import { bad, ok, wid } from "@/lib/relevo/server";

export async function GET(req: Request) {
  const w = wid(req);
  if (!w) return bad("Missing world id");
  const as = new URL(req.url).searchParams.get("as") ?? "luis";
  if (as !== "luis") return bad("Only Luis has the mentee app in this demo", 403);
  const world = await loadWorld(w);
  return ok(menteeView(evaluate(world), as));
}
