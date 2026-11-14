// Dónde se guarda el estado compartido.
// - En local: en la memoria del servidor (no hace falta nada).
// - Desplegado en Vercel: en Upstash Redis (gratis), si están sus variables de entorno.
import { newWorld, type World } from "./world";

const KEY = "relay:world";
const URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const mem = globalThis as unknown as { relayWorld?: World };

async function redis(command: string[]) {
  const res = await fetch(URL!, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}` },
    body: JSON.stringify(command),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Redis ${res.status}: ${await res.text()}`);
  return (await res.json()).result as string | null;
}

export async function getWorld(): Promise<World> {
  if (URL && TOKEN) {
    const raw = await redis(["GET", KEY]);
    return raw ? (JSON.parse(raw) as World) : newWorld();
  }
  return (mem.relayWorld ??= newWorld());
}

export async function saveWorld(w: World) {
  if (URL && TOKEN) await redis(["SET", KEY, JSON.stringify(w)]);
  else mem.relayWorld = w;
}
