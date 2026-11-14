// Guarda el "mundo" de la demo. Cada navegador tiene el suyo (id en localStorage); se puede compartir con ?w=ID
// para abrir el móvil de Luis y el de Pablo en dos teléfonos distintos.
import { kget, kset } from "@/lib/app/kv";
import { newWorld, type Ev, type World, type Who } from "./sim";

const TTL = 30 * 24 * 3600; // 30 días, como el audio [diseño]
const key = (w: string) => `relevo:w:${w}`;
export const validWid = (w: string | null): w is string => !!w && /^[a-z0-9]{6,24}$/i.test(w);

export async function loadWorld(w: string): Promise<World> {
  const world = await kget<World>(key(w));
  return world && world.v === 1 ? world : newWorld();
}
export async function saveWorld(w: string, world: World) {
  await kset(key(w), world, TTL);
}
/** Añade una acción en el minuto del reloj de la demo. Si el reloj se movió hacia atrás, lo que estaba "en el futuro" se descarta (rama nueva). */
export function addEvent(world: World, by: Who, type: string, p: Record<string, unknown>): Ev {
  world.events = world.events.filter((e) => e.t <= world.clock);
  const ev: Ev = { id: `ev${++world.seq}`, t: world.clock, seq: world.seq, by, type, p };
  world.events.push(ev);
  return ev;
}
export async function saveAudio(w: string, id: string, b64: string, mime: string) {
  await kset(`relevo:a:${w}:${id}`, { b64, mime }, TTL); // se borra solo a los 30 días
}
export async function loadAudio(w: string, id: string) {
  return kget<{ b64: string; mime: string }>(`relevo:a:${w}:${id}`);
}
