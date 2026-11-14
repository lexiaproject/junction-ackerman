// Notas de voz: llega el audio (para el destinatario) y la transcripción hecha en el móvil, ya con seudónimos.
// Filtro de crisis (lista fija, manda) + análisis del copiloto (Gemini T3 o léxico fijo). Todo queda en el evento.
import { analyseNote } from "@/lib/relevo/ai";
import { complaintIndex, crisisFlag } from "@/lib/relevo/engine";
import { PERSON } from "@/lib/relevo/people";
import { evaluate, type Who } from "@/lib/relevo/sim";
import { addEvent, loadWorld, safeAudioMime, saveAudio, saveWorld, validWid } from "@/lib/relevo/store";
import { bad, ok } from "@/lib/relevo/server";

type Body = { w?: string; as?: string; to?: string; text?: string; duration?: number; audio?: string; mime?: string; cardId?: string; kind?: string };

export async function POST(req: Request) {
  const b = ((await req.json().catch(() => null)) ?? {}) as Body;
  if (!validWid(b.w ?? null)) return bad("Missing world id");
  const as = b.as ?? "";
  if (!["luis", "pablo", "marta"].includes(as)) return bad("Unknown person", 403);
  const text = (typeof b.text === "string" ? b.text : "").trim().slice(0, 1200); // K-26: solo higiene de tipo
  if (!text) return bad("The note is empty");
  if (b.audio !== undefined && typeof b.audio !== "string") return bad("Bad recording");
  if (b.audio && b.audio.length > 1_600_000) return bad("The recording is too long");
  const mime = safeAudioMime(b.mime); // K-07
  const world = await loadWorld(b.w!);
  const sim = evaluate(world);
  const me = sim.people[as];
  // Solo se puede escribir a la pareja (mentor, acompañado), a su propio mentor, o a la clínica
  const to = b.to === "clinic" ? "clinic" : b.to ?? "";
  if (to !== "clinic" && to !== me.mentorId && to !== me.menteeId) return bad("You can only send notes to your pair", 403);

  const previous = sim.notes.filter((n) => (n.from === as && n.to === to) || (n.from === to && n.to === as)).map((n) => n.text);
  let analysis = null as null | ReturnType<typeof complaintIndex> & { source: string };
  if (me.consents.notes) {
    const g = await analyseNote(text); // con seudónimos; si falla, léxico fijo
    const ci = complaintIndex(text, previous, g);
    analysis = { ...ci, crisis: crisisFlag(text) || !!g?.crisis, source: g ? "gemini" : "lexicon" };
  } else analysis = { ...complaintIndex(text, previous), crisis: false, source: "no consent" };

  // K-01: el mundo pudo cambiar mientras esperábamos a Gemini; se guarda sobre la copia recién leída.
  // El análisis (lista fija de crisis || Gemini), el destinatario y las notas previas salen de la lectura inicial: no cambia qué se detecta.
  const fresh = await loadWorld(b.w!);
  const ev = addEvent(fresh, as as Who, "note", {
    to, text, duration: Math.max(1, Math.min(60, Math.round(b.duration ?? 5))), audio: !!b.audio, cardId: b.cardId, kind: b.kind ?? "note", analysis,
  });
  if (b.audio) await saveAudio(b.w!, ev.id, b.audio, mime);
  await saveWorld(b.w!, fresh);
  return ok({ ok: true, id: ev.id, crisis: analysis.crisis, to: to === "clinic" ? "clinic" : PERSON[to]?.name });
}
