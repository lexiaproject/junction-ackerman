// Almacén clave-valor de la app real.
// - Desplegado: Upstash Redis (variables KV_REST_API_URL / KV_REST_API_TOKEN que puso Vercel).
// - En local sin esas variables: memoria del servidor (se borra al reiniciar).

const URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const mem = globalThis as unknown as { relayKv?: Map<string, string> };
const store = () => (mem.relayKv ??= new Map());
const PREFIX = "app:";

async function redis(command: (string | number)[]) {
  const res = await fetch(URL!, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}` },
    body: JSON.stringify(command),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Redis ${res.status}: ${await res.text()}`);
  return (await res.json()).result as string | null;
}

export async function kget<T>(key: string): Promise<T | null> {
  const raw = URL && TOKEN ? await redis(["GET", PREFIX + key]) : (store().get(PREFIX + key) ?? null);
  return raw ? (JSON.parse(raw) as T) : null;
}

export async function kset(key: string, value: unknown, ttlSeconds?: number) {
  const raw = JSON.stringify(value);
  if (URL && TOKEN) await redis(ttlSeconds ? ["SET", PREFIX + key, raw, "EX", ttlSeconds] : ["SET", PREFIX + key, raw]);
  else store().set(PREFIX + key, raw);
}

export async function kdel(key: string) {
  if (URL && TOKEN) await redis(["DEL", PREFIX + key]);
  else store().delete(PREFIX + key);
}
