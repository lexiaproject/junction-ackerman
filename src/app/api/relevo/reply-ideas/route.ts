// Ideas de respuesta para el mentor (solo mentores, privado). Lee su conversación con el acompañado y propone 3 ideas
// cálidas basadas en técnicas de apoyo entre iguales con evidencia. Nunca consejo clínico.
// Antes de llamar a la IA: consentimiento del acompañado y comprobación de crisis (si hay crisis, no se proponen respuestas:
// se ocupa la clínica). Una llamada a Gemini por conversación: si no hay notas nuevas, se reutiliza el resultado.
import { suggestReplies, type ReplyIdea } from "@/lib/relevo/ai";
import { PERSON } from "@/lib/relevo/people";
import { hideNames, revealNames } from "@/lib/relevo/pseudo";
import { DAY, evaluate } from "@/lib/relevo/sim";
import { loadWorld, saveWorld, validWid } from "@/lib/relevo/store";
import { replyFallback } from "@/lib/relevo/texts";
import { bad, ok } from "@/lib/relevo/server";

export const maxDuration = 30;
type Result = { status: "ok"; opener: string; ideas: ReplyIdea[]; source: "gemini" | "template" } | { status: "consent" | "clinic" | "worried"; menteeName: string };

export async function POST(req: Request) {
  const b = ((await req.json().catch(() => null)) ?? {}) as { w?: unknown; as?: unknown };
  const w = typeof b.w === "string" ? b.w : null;
  const as = typeof b.as === "string" ? b.as : "";
  if (!validWid(w)) return bad("Missing world id");
  if (as !== "pablo" && as !== "marta") return bad("Only mentors can ask for reply ideas", 403);
  const world = await loadWorld(w);
  const sim = evaluate(world);
  const menteeId = sim.people[as].menteeId;
  if (!menteeId) return bad("You're not accompanying anyone right now");
  const mentee = sim.people[menteeId];
  const menteeName = PERSON[menteeId].name;
  const mentorName = PERSON[as].name;

  // Las ideas usan el texto de sus notas: hace falta que el acompañado haya aceptado el análisis y las ideas con IA
  if (!mentee.consents.notes || !mentee.consents.ideas) return ok({ status: "consent", menteeName } satisfies Result);
  const notes = sim.notes.filter((n) => n.t <= sim.now && ((n.from === as && n.to === menteeId) || (n.from === menteeId && n.to === as)));
  // Crisis: nivel 3 o una nota reciente que activó la lista fija → no se proponen respuestas; se ocupa la clínica
  const recentCrisis = notes.some((n) => n.from === menteeId && n.analysis?.crisis && sim.now - n.t < 7 * DAY);
  if (mentee.level === 3 || mentee.crisis || recentCrisis) return ok({ status: "clinic", menteeName } satisfies Result);

  const recent = notes.filter((n) => !n.analysis?.crisis).slice(-8);
  const lastFromMentee = [...recent].reverse().find((n) => n.from === menteeId);
  const mood: "low" | "neutral" | "empty" = !recent.length ? "empty" : lastFromMentee && ((lastFromMentee.analysis?.afecto_negativo ?? 0) >= 0.3 || (lastFromMentee.analysis?.indice_queja ?? 0) >= 0.5) ? "low" : "neutral";
  const key = `ri:${as}:${recent.at(-1)?.id ?? "none"}`;
  const cached = world.ai[key];
  if (cached) return ok(JSON.parse(cached));

  let result: Result = { status: "ok", ...replyFallback(menteeName, mentorName, mood), source: "template" };
  if (process.env.GEMINI_API_KEY && recent.length) {
    const conversation = recent.map((n) => `${n.from === as ? hideNames(mentorName) : hideNames(menteeName)}: "${hideNames(n.text)}"`).join("\n");
    const g = await suggestReplies({ conversation, mentor: hideNames(mentorName), mentee: hideNames(menteeName) });
    if (g?.safety) result = { status: "worried", menteeName };
    else if (g) result = { status: "ok", opener: revealNames(g.opener), ideas: g.ideas.map((i) => ({ ...i, message: revealNames(i.message), why: revealNames(i.why) })), source: "gemini" };
  }
  // Se guarda sobre el mundo recién leído (no pisar lo que pasó mientras se esperaba a Gemini)
  const fresh = await loadWorld(w);
  fresh.ai[key] = JSON.stringify(result);
  await saveWorld(w, fresh);
  return ok(result);
}
