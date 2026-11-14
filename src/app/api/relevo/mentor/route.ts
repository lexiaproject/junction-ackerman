// App del mentor (M0-M7). Nunca incluye datos ni niveles de su acompañado ni los suyos.
import { after } from "next/server";
import { draftIdeaMessage } from "@/lib/relevo/ai";
import { PERSON } from "@/lib/relevo/people";
import { hideNames, revealNames } from "@/lib/relevo/pseudo";
import { evaluate } from "@/lib/relevo/sim";
import { loadWorld, saveWorld } from "@/lib/relevo/store";
import { CATALOG } from "@/lib/relevo/texts";
import { mentorView } from "@/lib/relevo/views";
import { bad, ok, wid } from "@/lib/relevo/server";

// El borrador de Gemini se pide después de responder (after); con 2 intentos de 10 s cabe de sobra
export const maxDuration = 30;

export async function GET(req: Request) {
  const w = wid(req);
  if (!w) return bad("Missing world id");
  const as = new URL(req.url).searchParams.get("as") ?? "pablo";
  if (as !== "pablo" && as !== "marta") return bad("Unknown mentor", 403);
  const world = await loadWorld(w);
  const sim = evaluate(world);
  // T1: si hay una idea a la vista y aún no tiene borrador de Gemini, se pide UNA vez por tarjeta (con seudónimos).
  // K-02: la respuesta no espera a Gemini (sale ya con la plantilla); el borrador aparece en el siguiente sondeo.
  const card = sim.cards.find((c) => c.mentor === as && c.status === "shown" && c.t <= sim.now && c.action);
  const key = card ? `t1:${card.id}:${card.action}` : null;
  const tried = key ? `try:${key}` : null; // marca aparte: guardar "" en t1:… dejaría vacío el mensaje (views.ts usa ??)
  if (card && key && tried && !(key in world.ai) && !(tried in world.ai) && process.env.GEMINI_API_KEY) {
    const mark = await loadWorld(w);
    mark.ai[tried] = String(Date.now());
    await saveWorld(w, mark);
    const item = CATALOG[card.action!];
    const mentee = PERSON[card.mentee].name;
    const input = { template: hideNames(item.message(mentee)), title: hideNames(item.title(mentee)), mentor: hideNames(PERSON[as].name), mentee: hideNames(mentee) };
    after(async () => {
      const draft = await draftIdeaMessage(input);
      if (!draft) return; // queda la plantilla, que es el respaldo previsto
      const fresh = await loadWorld(w); // K-01: volver a leer justo antes de guardar
      fresh.ai[key] = revealNames(draft);
      await saveWorld(w, fresh);
    });
  }
  return ok(mentorView(sim, as));
}
