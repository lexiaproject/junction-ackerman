// App del mentor (M0-M7). Nunca incluye datos ni niveles de su acompañado ni los suyos.
import { draftIdeaMessage } from "@/lib/relevo/ai";
import { PERSON } from "@/lib/relevo/people";
import { hideNames, revealNames } from "@/lib/relevo/pseudo";
import { evaluate } from "@/lib/relevo/sim";
import { loadWorld, saveWorld } from "@/lib/relevo/store";
import { CATALOG } from "@/lib/relevo/texts";
import { mentorView } from "@/lib/relevo/views";
import { bad, ok, wid } from "@/lib/relevo/server";

export async function GET(req: Request) {
  const w = wid(req);
  if (!w) return bad("Missing world id");
  const as = new URL(req.url).searchParams.get("as") ?? "pablo";
  if (as !== "pablo" && as !== "marta") return bad("Unknown mentor", 403);
  const world = await loadWorld(w);
  const sim = evaluate(world);
  // T1: si hay una idea a la vista y aún no tiene borrador de Gemini, se pide una vez (con seudónimos) y se guarda
  const card = sim.cards.find((c) => c.mentor === as && c.status === "shown" && c.t <= sim.now && c.action);
  const key = card ? `t1:${card.id}:${card.action}` : null;
  if (card && key && !(key in world.ai) && process.env.GEMINI_API_KEY) {
    const item = CATALOG[card.action!];
    const mentee = PERSON[card.mentee].name;
    const draft = await draftIdeaMessage({ template: hideNames(item.message(mentee)), title: hideNames(item.title(mentee)), mentor: hideNames(PERSON[as].name), mentee: hideNames(mentee) });
    if (draft) {
      world.ai[key] = revealNames(draft);
      await saveWorld(w, world);
      return ok(mentorView(evaluate(world), as));
    }
  }
  return ok(mentorView(sim, as));
}
