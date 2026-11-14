// API del estado compartido: GET lo lee, POST aplica una acción (avanzar día, enviar mensaje, pedir ayuda…)
import { describeChanges } from "@/lib/engine";
import { suggest } from "@/lib/gemini";
import { getWorld, saveWorld } from "@/lib/store";
import { derive, reduce, type Action } from "@/lib/world";

export async function GET() {
  return Response.json(await getWorld());
}

export async function POST(req: Request) {
  const action = (await req.json()) as Action;
  let w = reduce(await getWorld(), action);

  // Si aparece una alerta nueva, pedimos a la IA la acción para el mentor
  const v = derive(w);
  if (v.alert && !w.suggestions[v.alert]) {
    const s = await suggest(v.alert, describeChanges(v.statuses), v.learned);
    w = { ...w, suggestions: { ...w.suggestions, [v.alert]: s } };
  }

  await saveWorld(w);
  return Response.json(w);
}
