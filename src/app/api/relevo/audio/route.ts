// Audio de una nota de voz (solo para el destinatario en una app real; en la demo, del mismo mundo).
// MOCK: en producción iría cifrado de extremo a extremo con la clave del destinatario. Se borra a los 30 días.
import { loadAudio } from "@/lib/relevo/store";
import { bad, wid } from "@/lib/relevo/server";

export async function GET(req: Request) {
  const w = wid(req);
  const id = new URL(req.url).searchParams.get("id") ?? "";
  if (!w || !/^ev\d+$/.test(id)) return bad("Missing id");
  const a = await loadAudio(w, id);
  if (!a) return bad("Not found", 404);
  return new Response(Buffer.from(a.b64, "base64"), { headers: { "Content-Type": a.mime, "Cache-Control": "private, max-age=3600" } });
}
