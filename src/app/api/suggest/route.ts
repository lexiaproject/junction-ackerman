// Ya no lo usa la app (ahora la IA se llama desde /api/state). Se mantiene solo para probar Gemini a mano.
import { suggest } from "@/lib/gemini";
import type { Level } from "@/lib/engine";

export async function POST(req: Request) {
  const { level, changes, learned } = (await req.json()) as { level: Level; changes: string[]; learned: string[] };
  return Response.json(await suggest(level, changes, learned));
}
