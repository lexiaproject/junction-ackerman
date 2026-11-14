# F1 · Arquitecto · Planes técnicos listos para ejecutar y reparto de archivos

Rama `sesion-autonoma` @ 4701299 · solo lectura (solo se ha escrito este informe) · sáb 14 nov 2026.
Entradas: MAPA, DECISIONES (1-10), f1-arquitecto (A-), f1-calidad (K-), f1-ux (U-), f1-diseno (D-), f1-juez (J-).
Todo lo que sigue lo he comprobado leyendo el código en su línea actual (números de línea de hoy).

---

## 0. Reglas comunes para todos los ciclos

**Puerta de cada tarea (en este orden, en el árbol de trabajo compartido):**
```
npx tsc --noEmit -p .                         # tipos, sin tocar .next
npx eslint <solo los archivos que tocaste>
node scripts/relevo-check.mjs                 # 33/33
node scripts/relevo-demo-walk.mjs http://localhost:3000   # 19/19
```
- `npx next build` **solo en la integración** de cada ciclo. Corrección al supuesto del encargo: en Next 16, `next dev` escribe
  en `.next/dev` y `next build` en `.next`, y pueden ir a la vez (VERIFICADO: `node_modules/next/dist/docs/01-app/02-guides/
  upgrading/version-16.md`, sección "Concurrent dev and build"; la carpeta `.next/dev` existe). Aun así lo dejamos para la
  integración: tarda, gasta CPU y su resultado depende de todos los carriles a la vez.
- El servidor de :3000 recarga en caliente los cambios de **todos** los carriles: si el recorrido falla, mira primero
  `git diff --stat` para ver si el fallo es tuyo.
- **Navegador (Playwright)**: es uno solo para todos. Turnos: un carril a la vez, pestaña propia y mundo propio
  (`/relevo/demo?w=<carril><aleatorio>`), y comprobar la URL antes de cada captura (nota del Juez).
- **Commits**: uno por tarea, en castellano, con `git add <rutas exactas>` (nunca `-A`: hay `.claude/.playwright-mcp/` y
  `.equipo/informes/` sin ignorar). Sin push.
- Mundos de prueba: ids desechables `kq` + 6-10 letras/números. Nunca el mundo del presentador.
- Intocables (recordatorio): `engine.ts`; `SCRIPT` y `BANDIT_SALT` de `sim.ts`; Relay; claves; en `ai.ts` el modelo,
  `thinkingLevel`, timeouts y reintentos de `gemini()`; lógica y contenido del camino de crisis salvo lo autorizado.

---

## 1. Planes por tarea

### P1 · K-03 + K-26 (parte servidor) + K-27 · robustez de `/act` y de `evaluate()`  — carril Backend · S · riesgo bajo
**Archivos**: `src/app/api/relevo/act/route.ts` (líneas 10-11, 36-49, 60, 70, 74) y `src/lib/relevo/sim.ts:762-764`
(bucle de eventos de usuario, fuera de `SCRIPT`/`BANDIT_SALT`).
**Cambio mínimo**:
1. `act/route.ts:10-11`:
   ```ts
   const raw = await req.json().catch(() => null);
   const body = (raw && typeof raw === "object" ? raw : {}) as Body;
   const { w, as = "", type = "" } = body;
   const p = body.p && typeof body.p === "object" && !Array.isArray(body.p) ? body.p : {};
   if (JSON.stringify(p).length > 4000) return bad("Too much data", 413);   // K-27
   ```
2. `:70` → `if (!Object.hasOwn(ALLOWED, as) || !ALLOWED[as].includes(type))` (hoy `as:"constructor"` da 500).
3. `:60` → `if (!Object.hasOwn(PERSON, id))`; `:74` → `Object.hasOwn(PERSON, who) ? ... : ""`.
4. `:42-49` pesos y catálogo: copiar solo claves que ya existen y con el tipo correcto:
   ```ts
   for (const [k, v] of Object.entries(patch.weights)) if (Object.hasOwn(c.weights, k) && Number.isFinite(Number(v))) next[k] = Math.max(0, Math.min(1, Number(v)));
   for (const [k, v] of Object.entries(patch.catalog)) if (Object.hasOwn(c.catalog, k) && typeof v === "boolean") nextCat[k] = v;
   ```
   (Rangos de umbrales: NO en este ciclo; A-14 comprobó que los valores extremos no rompen nada.)
5. `sim.ts:762-764`:
   ```ts
   for (const e of userEvents) push(e.t, 6 + e.seq / 1e6, () => {
     try { if (!act(e, false)) trace(e.t, e.by, `(${e.type} ignored: no longer applicable)`); }
     catch { trace(e.t, e.by, `(${e.type} ignored: invalid data)`); }
   });
   ```
6. Opcional en el mismo archivo y la misma tarea (si el Juez lo sube): K-40, en el reset `fresh.seq = world.seq;` (`:23`).

**Qué puede romperse**: un evento que hoy revienta y deja estado a medias seguirá dejando ese estado a medias (antes daba 500
para siempre; ahora se ve el resto). El `try` envuelve también `help` de usuario: solo actúa cuando hoy habría un 500, no quita
nada. No cambia ninguna acción válida.
**Comprobación** (además de la puerta), mundo `kqp1xxxx`:
- `POST /act {as:"clinic",type:"ideas_pause",p:{}}` y después `GET /api/relevo/demo` → **200** (hoy 500) y la traza contiene
  `ideas_pause ignored: invalid data`.
- `p:null` → no 500 · `as:"constructor"` → 403 · `person:"constructor"` en `person_thresholds` → 400 · `p` de 5 000 caracteres
  → 413 · `weights:{sueno:"abc",foo:1}` → pesos sin cambiar (`GET /clinic`).

### P2 · K-07 + K-01 (parte notas) · `/note` y `/audio`  — carril Backend · S · riesgo bajo (ruta de entrada de la crisis)
**Visto bueno previo**: Seguridad clínica para la parte K-01 (DECISIONES 7). Si no llega, se hace K-07 solo y K-01 después.
**NO incluir** K-16 (apóstrofo) ni cambios en `analyseNote` (DECISIONES 6).
**Archivos**: `src/app/api/relevo/note/route.ts` (líneas 17, 35-39) y `src/app/api/relevo/audio/route.ts:12`.
**Cambio mínimo**:
1. Arriba de ambos archivos (o exportado desde `store.ts`, que es del mismo carril):
   `const AUDIO_MIME = /^audio\/(webm|ogg|mp4|mpeg)(;[\w=.\-\s]*)?$/;`
2. `note/route.ts:38` → `const mime = AUDIO_MIME.test(b.mime ?? "") ? b.mime! : "audio/webm";` y usar `mime`.
3. `note/route.ts:17` (K-26, solo higiene de tipo): `const text = (typeof b.text === "string" ? b.text : "").trim().slice(0, 1200);`
   No toca las frases ni la normalización (K-16 sigue fuera).
4. K-01: justo antes de `addEvent` (`:35`):
   ```ts
   const fresh = await loadWorld(b.w!);   // K-01: el mundo pudo cambiar mientras esperábamos a Gemini
   const ev = addEvent(fresh, as as Who, "note", { ... igual que hoy ..., analysis });
   if (b.audio) await saveAudio(b.w!, ev.id, b.audio, mime);
   await saveWorld(b.w!, fresh);
   ```
   `analysis` (lista fija `crisisFlag` || Gemini), `me`, `to` y `previous` siguen saliendo de la lectura inicial: la lógica de
   crisis no cambia; solo cambia qué copia del mundo se guarda.
5. `audio/route.ts:12`: `"Content-Type": AUDIO_MIME.test(a.mime) ? a.mime : "audio/webm", "X-Content-Type-Options": "nosniff",
   "Content-Security-Policy": "sandbox"` (el resto igual).

**Qué puede romperse**: (a) un navegador que grabe con un tipo raro pasaría a servirse como `audio/webm` (los tres reales
—Chrome `audio/webm;codecs=opus`, Firefox `audio/ogg;codecs=opus`, Safari `audio/mp4`— pasan la expresión). (b) K-01: si el
presentador movió el reloj durante la espera, la nota queda en la hora nueva del reloj (`addEvent` usa `fresh.clock`); hoy se
perdería el cambio de reloj. Aceptable y más fiel.
**Comprobación**: mundo `kqp2xxxx`, reloj a `47 09:00` (`act demo clock`), y:
- `POST /note` de luis a pablo con `audio` = base64 de `<script>alert(1)</script>` y `mime:"text/html"` → `GET /audio?id=…` responde
  `content-type: audio/webm` y `x-content-type-options: nosniff`.
- Mismo con `mime:"audio/webm;codecs=opus"` → se conserva.
- `text: 123` → 400 "The note is empty" (hoy 500).
- La puerta: el recorrido manda notas (paso 3-4) y la crisis del guion (paso 6) → 19/19.
- Una vez en Chrome con micrófono (integración): grabar, enviar y reproducir.

### P3 · K-01 + K-02 (parte mentor) · `/mentor` sin bloquear ni reintentar  — carril Backend · S · riesgo bajo
**Archivo**: solo `src/app/api/relevo/mentor/route.ts` (líneas 16-31). **No** se toca `ai.ts` (ni `gemini()`, ni timeouts, ni
reintentos, ni modelo). Por eso descarto el paso 2 de K-02 de Calidad (parámetro `attempts` en `gemini()`): choca con la regla.
**Enfoque**: responder ya con la plantilla y pedir el borrador **después** de responder con `after()` de Next (VERIFICADO en
`node_modules/next/dist/docs/01-app/03-api-reference/04-functions/after.md`: vale en Route Handlers; dura lo que el
`maxDuration` de la ruta). El intento se apunta en `world.ai` con una clave **aparte**:
```ts
import { after } from "next/server";
...
const key = card ? `t1:${card.id}:${card.action}` : null;
const tried = key ? `try:${key}` : null;               // marca de "ya se pidió": una vez por tarjeta, sin reintentos
if (card && key && tried && !(key in world.ai) && !(tried in world.ai) && process.env.GEMINI_API_KEY) {
  const mark = await loadWorld(w); mark.ai[tried] = String(Date.now()); await saveWorld(w, mark);
  const input = { template: hideNames(item.message(mentee)), title: hideNames(item.title(mentee)), mentor: hideNames(PERSON[as].name), mentee: hideNames(mentee) };
  after(async () => {
    const draft = await draftIdeaMessage(input);
    if (!draft) return;                                   // queda la plantilla, que es el respaldo previsto
    const fresh = await loadWorld(w);                     // K-01: volver a leer justo antes de guardar
    fresh.ai[key] = revealNames(draft);
    await saveWorld(w, fresh);
  });
}
return ok(mentorView(sim, as));
```
**Por qué una clave aparte**: `views.ts:146` hace `message: draft ?? plantilla`; si se guardara `""` en la misma clave `t1:…`,
`?? ` no salta y el mensaje de Pablo saldría vacío. Con `try:` no hay que tocar `views.ts`.
**Qué puede romperse**: (a) el borrador de Gemini aparece en el siguiente sondeo (~4 s): el texto de la tarjeta de Pablo cambia
a la vista. Si Pablo ya abrió la hoja de enviar, se queda con la plantilla (la hoja guarda el texto al abrirse en `compose.script`, `MentorApp.tsx:47`).
Aceptable. (b) Dos sondeos exactamente a la vez pueden pedir dos borradores (como mucho 2, no en bucle). (c) Si Vercel corta la
función antes de que Gemini responda, queda la plantilla. Opcional, misma tarea: `export const maxDuration = 30;` (A-12).
**Comprobación**: en local sin clave esta rama no corre → la puerta solo prueba que no rompe nada (19/19). Prueba real en la
integración (ver §3, "Prueba con clave falsa"): 5 lecturas seguidas de `/mentor` tras "Yes" deben dejar en el registro del
servidor **2** líneas `[relevo/ai] attempt` (una llamada a `gemini()` con su reintento interno), no 10. La ruta con la clave de
verdad, una sola vez al final (DECISIONES 3).

### P4 · K-23 + K-45 + K-24 · datos en vivo y aviso de conexión  — carril Frontend · S · riesgo bajo (afecta a todas las pantallas)
**Archivos**: `src/app/relevo/kit.tsx:37-72` (`useView`) y `src/app/relevo/demo/page.tsx:41-48, 77, 92-99`.
**Cambio mínimo en `useView`** (dentro del efecto, variables por efecto):
```ts
let last = 0; let lastText = "";
const load = async () => {
  const my = ++last;                                       // K-23: gana la última petición que EMPEZÓ
  try {
    const r = await fetch(url, { cache: "no-store" });
    const txt = await r.text();
    let j; try { j = JSON.parse(txt); } catch { throw new Error(`Error ${r.status}`); }
    if (!r.ok) throw new Error(j.error ?? `Error ${r.status}`);
    if (alive && my === last) { setError(""); if (txt !== lastText) { lastText = txt; setData(j); } }   // K-45: no redibujar si no cambió
  } catch (e) { if (alive && my === last) setError((e as Error).message); }
};
```
**En `demo/page.tsx`** (K-24): `const { data, error } = useView(...)`; estado `lost` (true 4 s si falla `setClock` o el reset);
en la cabecera, junto a "Next moment": `{(error || lost) && <span role="status" className="rv-chip bg-rv-notice text-rv-notice-ink">Connection lost · retrying…</span>}`
(nunca rojo, D-02). Reset (`:99`) con `.catch(() => flagLost())`. Si `error && !data` (`:77`): "Can't reach Relevo right now ·
retrying…" en vez de "Loading the demo…". El estado de error en las 3 apps (D-02 completo) NO en este ciclo.
**Qué puede romperse**: (a) con K-45, si una pantalla dependía de que `data` cambie de objeto en cada sondeo para algo, dejará de
pasar cuando la respuesta sea idéntica. Revisado: el efecto de la hoja de ayuda (`MenteeApp.tsx:40-49`) mira `data.openHelp`, que
solo cambia si cambia la respuesta; no hay más efectos que dependan de `data`. (b) `reload()` sigue forzando una carga nueva.
**Comprobación**: puerta + Playwright: (1) avanzar 5 momentos y volver: nada "salta atrás"; (2) cortar la red de `/api/relevo/**`
(`page.route(..., r => r.abort())` con `browser_run_code_unsafe`) → aparece la pastilla en ≤5 s; al restaurar, desaparece;
(3) día 57 21:12: la hoja de ayuda de Luis se abre y no parpadea en 3 sondeos.

### P5 · K-42 + U-12 + K-38 · reloj, flechas y línea de tiempo  — carril Frontend · S-M · riesgo bajo
**Archivo**: solo `src/app/relevo/demo/page.tsx` (líneas 43-75 y `Timeline` 173-214).
**Cambio mínimo**:
1. **K-42**: `const target = useRef<number | null>(null)` y `const chain = useRef(Promise.resolve())`. En `setClock`: fijar
   `target.current = t`, encadenar el POST (`chain.current = chain.current.then(() => act(...))`, así no llegan desordenados),
   `.catch` → `target.current = null` + pastilla de P4, y `setTimeout(() => target.current === t && (target.current = null), 5000)`.
   En `next`/`prev`: base = `target.current ?? data.clock.t`. Efecto: `if (data && target.current === data.clock.t) target.current = null`.
2. **Una sola función `pickMoment(m)`** que hace `setClock(m.t)` y la elección Pablo/Marta que hoy está solo en `next()` (`:57-58`),
   usada por "Next", los puntos y el selector. (Si el Juez sube U-15, aquí mismo: solo `pl1` → Marta.)
3. **K-38 (solapes)**: un punto por **día** en vez de por momento (13 días en vez de 27 puntos): `onClick` → primer momento de ese
   día; `title`/`aria-label` con todos los momentos del día; relleno si el primer momento del día ≤ `data.index`. A 1440 px un día
   son ~22 px y el punto 16 px: no se tocan. Así el punto del día 57 lleva a la crisis (21:12), que hoy no se puede pulsar.
   Para saltar a un momento exacto: en el menú "More" un `<select aria-label="Jump to moment">` con los 27 momentos
   ("Day 47 08:41 · Pablo says yes → Luis reads V2") que llama a `pickMoment`.
4. **Flechas globales** (`:66-75`): salir también si hay `ctrl/meta/alt` o si `(e.target as HTMLElement).closest('[role="dialog"],[role="radiogroup"]')`.
   **Corrección a K-38 de Calidad**: NO ignorar las flechas "dentro de `main`" ni de los teléfonos: tras pulsar "Yes" en el móvil de
   Pablo el foco se queda en ese botón y → dejaría de avanzar (trampa nueva en directo).
5. **U-12**: en `onPointerUp` del deslizador, tras `onPick`, `e.currentTarget.blur()`. `aria-valuetext={\`Day ${day}\`}` (X-24).
**Qué puede romperse**: el clic en un punto ya no va a un momento intermedio del mismo día (para eso, "Next" o el selector).
**Comprobación**: puerta + Playwright: 5 pulsaciones rápidas de → desde el día 0 → momento 6 ("A one-day spike"), no el 2;
arrastrar el deslizador y pulsar → → siguiente **momento**; clic en el punto del día 57 → 21:12; el selector salta a `v4` y la
columna enseña a Pablo; `pl1` enseña a Marta.

### P6 · K-18 (J-02 mínimo, U-01, D-01 2+3) · legible en proyector  — carril Frontend (mismo archivo que P4/P5) · S · riesgo bajo
**Archivo**: `src/app/relevo/demo/page.tsx` líneas 37, 66-75, 129-130, 138, 144.
**Cambio mínimo**:
- Tecla **E** en el mismo manejador de flechas: `if (e.key.toLowerCase() === "e") setExplain((x) => !x)`, con las mismas salidas
  (campos de texto, modificadores, hojas). Pista junto al interruptor: `Show how Relevo decides <kbd>E</kbd>`.
- Capa: `lg:h-[38vh] lg:min-h-[260px]` → `lg:h-[30vh] lg:min-h-[220px]` (`:138`).
- Clínica: `Fit width={1280}` y `w-[1280px]` → `1100` (`:129-130`); `clinic/page.tsx` ya trabaja a `min-w-[1100px]`.
- Valor inicial (`:37`) — **decide el Juez/Director**: recomiendo `useState(() => typeof window === "undefined" || window.innerHeight >= 800)`
  (capa cerrada en pantallas bajas, U-01). No hay desajuste de hidratación: el primer render es "Loading the demo…" en servidor y
  cliente (no hay `w` hasta el efecto).
**"Modo foco" por columnas (D-01.1 / U-01.2): NO cabe y además rinde poco**: los teléfonos están limitados por el **alto**, no por
el ancho (D-01: con la capa cerrada el área útil es ~679 px → 0,80), así que ensanchar una columna no agranda los teléfonos;
solo la clínica. Lo que de verdad sube la lectura es cerrar la capa (E) y bajarla a 30vh. El anillo "Look here" (J-02b / U-02)
es otra tarea (M, necesita un campo nuevo en `MOMENTS` de `demo.ts` + `demo/page.tsx`): ciclo 3 si el Juez lo prioriza.
**Qué puede romperse**: solapes de texto en la clínica a 1100 px (J-13 los ve por debajo de 1100: justo en el límite).
**Comprobación**: Playwright a 1280×720, 1440×900 y 1920×1080: medir `getBoundingClientRect().width / 390` del teléfono y
`/ 1100` de la clínica, con capa abierta y cerrada. Objetivo a 1440×900: teléfonos ≥0,75 con capa cerrada; clínica ≥0,55 con
capa abierta. Capturas de C1 (panel), ficha de Luis y pestaña Alerts a 1100 sin textos pisados.

### P7 · U-04 + U-05 + U-14 · trampas del presentador (pestañas pegadas, hoja abierta, ficha 2ª vez)  — carril Frontend · S · riesgo bajo
**Archivos**: `src/app/relevo/MentorApp.tsx:41-49`, `src/app/relevo/ClinicWeb.tsx:52-59`, `src/app/relevo/demo/page.tsx:38, 126,
131, 151` (y los dos enlaces de la capa en `:333` y `:389`, sin cambios).
**Cambio mínimo** (patrón de React "ajustar estado cuando cambia una prop", sin `useEffect` ni `eslint-disable`):
- `demo/page.tsx`: `<MentorApp key={mentor} w={w} as={mentor} resetKey={data.index} />` y
  `<ClinicWeb w={w} onFocusPerson={focus} resetKey={data.index} />`. El foco pasa a contador:
  `useState<{ id: string | null; n: number }>()` y `onFocus={(id) => setFocus((f) => ({ id, n: (f?.n ?? 0) + 1 }))}`.
- `MentorApp` (prop opcional `resetKey?: number`, antes del `if (!data) return`):
  ```ts
  const [seenKey, setSeenKey] = useState(resetKey);
  if (seenKey !== resetKey) { setSeenKey(resetKey); setTab("today"); setThread("mentee"); setCompose(null); setHelp(false); }
  ```
  (no toco `m5Open`). Cierra la hoja "Voice note to Luis" al avanzar → U-05 resuelto (no se puede enviar el paseo dos veces).
- `ClinicWeb` (props `onFocusPerson?: { id: string | null; n: number }`, `resetKey?: number`): quitar el efecto de `:56-59` y poner
  ```ts
  const [seen, setSeen] = useState({ n: onFocusPerson?.n, k: resetKey });
  if (seen.n !== onFocusPerson?.n || seen.k !== resetKey) {
    if (seen.k !== resetKey) { setTab("panel"); setPerson(null); }
    if (onFocusPerson && seen.n !== onFocusPerson.n) setPerson(onFocusPerson.id);
    setSeen({ n: onFocusPerson?.n, k: resetKey });
  }
  ```
  `app/page.tsx:39` y `clinic/page.tsx:12` no pasan estas props → sin cambios fuera de la demo.
- `MenteeApp` **no se toca** (su hoja de ayuda va por datos y es zona de crisis). Resetear solo su `screen` sería posible, pero
  necesita visto bueno de Seguridad clínica: fuera de este plan.
**Qué puede romperse**: al avanzar se cierra la ficha de la clínica que el presentador hubiera abierto (cada momento empieza
limpio; el enlace "Open Luis's file" de la capa ya funciona siempre). Si cambia el orden de props, comprobar los dos usos sueltos.
**Comprobación**: Playwright: en `47 08:30` abrir Conversation de Pablo → Next → Pablo en Today con la pregunta V1 visible;
en `47 08:41` abrir la hoja de enviar → Next → hoja cerrada, una sola nota en la conversación; "Open Luis's file" → Panel →
"Open Luis's file" otra vez → la ficha se abre las dos veces.

### P8 · J-03 / U-03 · copiloto visible en Hoy de Pablo  — carril Frontend · S · riesgo bajo
**Archivo**: `src/app/relevo/MentorApp.tsx`, función `Today` (`:186` y antes del bloque de `:305`).
**Cambio mínimo**: `const nothing = !card && !data.plan && !data.m6 && !data.sent && !data.copilot;` y una tarjeta:
```tsx
{data.copilot && !data.m6 && mentee && (
  <div className="rv-notice rv-in p-4">
    <p className="flex items-center gap-1.5 text-[12.5px] font-semibold"><Icon name="lock" size={14} />Only you see this</p>
    <p className="mt-1.5 text-[15px] leading-snug">A tip for your next note to {mentee.name}</p>
    <button className="rv-btn rv-btn-notice mt-3 w-full" onClick={() => onTab("chat", "mentee")}>Open</button>
  </div>
)}
```
No enseña el análisis ni el texto de las notas; Luis no ve nada (el recorrido ya lo comprueba en su JSON, paso 2). El `!data.m6`
garantiza que la pantalla de crisis de Pablo no cambia.
**Comprobación**: puerta + Playwright en `40 21:15`: Hoy de Pablo enseña la tarjeta, "Open" lleva a Conversation con la sugerencia.
**Conflicto**: mismo archivo que P7 → misma persona, P7 primero.

### P9 · J-05 / U-09 / D-06 · claves internas en castellano en "What just happened"  — carril Backend · S · riesgo bajo
**Archivo**: solo `src/lib/relevo/demo.ts:120` (`sim.ts` no se toca). Todo lo visible en castellano sale de `sim.trace`
(`sim.ts:218, 297, 395, 554, 566, 593`) y se sirve en esa línea; la capa no pinta otras claves (revisado `demo/page.tsx`).
```ts
const LABELS: Record<string, string> = { ...ACTION_LABEL, ...DOMAIN_LABEL };   // ya importados en demo.ts:3 y :6
const KEYS = new RegExp(`\\b(${Object.keys(LABELS).join("|")})\\b`, "g");
// en trace: text: e.text.replace(KEYS, (k) => LABELS[k]),
```
Resultado: "Idea for Pablo about Luis: Walk together (context mobility)", "most changed: phone & connection".
**Comprobación**: ningún script lee `trace` (grep). Puerta + `GET /api/relevo/demo` en 47 08:41 y 60 08:30 sin `_` ni
`movilidad|sueno|fisiologia|ritmo` en `trace[].text`.

### P10 · U-10 / J-09 · "Tomorrow, Sunday" el propio domingo  — carril Backend · S · riesgo bajo
**Archivo**: solo `src/lib/relevo/views.ts` (helper nuevo + líneas 87 y 157). `sim.ts` y `texts.ts` no se tocan.
```ts
// La etiqueta del plan se escribió al crearlo ("Tomorrow, Sunday, 10:00"); si ya no es verdad, se recalcula
const planWhen = (now: number, p: Plan) => {
  const dn = dayOf(p.whenT) - dayOf(now);
  if (dn === dayOf(p.whenT) - dayOf(p.created)) return p.whenLabel;          // sigue siendo cierta: igual que hoy
  return `${dn === 0 ? "Today" : dn === 1 ? "Tomorrow" : dn === -1 ? "Yesterday" : dayLabel(dayOf(p.whenT))}, ${hhmm(p.whenT)}`;
};
```
`:87` → `when: planWhen(now, p)` · `:157` → `when: planWhen(now, running)`.
**Comprobación**: `relevo-check` importa `views.ts` (33/33); el recorrido mira `title` y `status`, no `when`. `/me?as=luis` en
`47 11:20` → "Tomorrow, Sunday, 10:00" (sin cambio) y en `48 11:30` → "Today, 10:00".

### P11 · D-03 + D-04 · `relevo.css` en `@layer` y `truncate`  — carril Diseño · S · riesgo **medio**
**Archivo**: solo `src/app/relevo/relevo.css` (líneas 4-228). `globals.css` no se toca (lo comparte Relay).
```css
@layer theme, base, components, utilities;   /* fija el orden por si este archivo llega antes que globals.css */
@layer components {
  /* … todo el contenido actual, líneas 4-228, sin cambios … */
}
/* Fuera de capa a propósito: gana a `p, li, dd { text-wrap: pretty }` de globals.css, que tampoco tiene capa */
.rv .truncate { white-space: nowrap; }
```
**Corrección a D-03**: sin la primera línea, si en producción el CSS de `/relevo` se cargara antes que `globals.css`, `components`
quedaría por **debajo** de `base` (preflight) y los botones perderían fondo y bordes. Y `.rv .truncate` debe ir fuera de la capa.
**Qué puede romperse**: hoy hay ~80 combinaciones `rv-btn/rv-card/rv-chip/rv-notice/rv-input` + utilidad en conflicto que
pierden y pasarán a ganar (ej.: los botones grandes de la hoja de ayuda tienen `justify-start px-5` y hoy salen centrados:
pasarán a la izquierda, que es lo que pidió quien los escribió). Es un cambio visual de la hoja de crisis → avisar a Seguridad
clínica (solo visual, contenido igual).
**Comprobación**: capturas ANTES (commit limpio) y DESPUÉS, mismo mundo y tamaño 1440×900: portada `/relevo`; demo en 0 08:10,
47 08:41, 47 11:20, 54 10:10, 57 21:12 (hoja de ayuda), 62 12:00; `/relevo/clinic`; `/relevo/app?as=pablo` a 390 px. Lista de
diferencias: cada una "esperada" o "regresión". Regla: si hay más de 3 regresiones o una fea en la hoja de crisis, **revertir** y
dejarlo para el ciclo 3; los arreglos de `className` en TSX no los hace Diseño (son de otro carril), se apuntan.

### P12 · K-08 + K-09 · hojas accesibles y confirmación fuera del botón  — carril Diseño (a11y) · M+S · riesgo bajo
**Visto bueno previo**: Seguridad clínica (DECISIONES 9). Texto de la hoja de ayuda: **igual** (K-29 y K-10 no).
**Archivos**: `src/app/relevo/kit.tsx:250-264` (`Sheet`) y `:569` (`Phone`: añadir `data-phone`); `src/app/relevo/MenteeApp.tsx:357-379`
(`HelpSheet`, que también usa el mentor vía import).
**K-08 en `Sheet`**:
- `ref` en la caja, `aria-modal="true"`, `tabIndex={-1}`, `relative`, `focus:outline-none`.
- Al montar: `const prev = document.activeElement`; enfocar la caja **si el foco está en `body` o dentro del mismo teléfono**
  (`box.closest("[data-phone]") ?? document.body` contiene a `prev`). Al desmontar, devolver el foco a `prev` si sigue en el
  documento. **Corrección a K-08 de Calidad**: "solo si el foco está en body" dejaría sin foco las aperturas manuales (el foco
  está en el botón "Help" del propio teléfono); con la regla del teléfono no se le roba el foco al presentador cuando la hoja de
  Luis se abre sola en la crisis (su foco está en "Next moment", fuera del teléfono).
- Quitar el `keydown` de `window`; `onKeyDown` en la caja: Escape → `onClose()`; Tab/Shift+Tab en bucle dentro.
- Botón visible: `<button type="button" onClick={onClose} aria-label="Close" className="rv-btn rv-btn-ghost absolute right-3 top-3 h-11 w-11 !px-0"><Icon name="x" /></button>` (el icono `x` existe, `kit.tsx:100`).
**K-09 en `HelpSheet`**: en los dos botones, `disabled` → `aria-disabled={done === "…"}` y `if (done === "…") return;` al principio
del `onClick`; sacar las dos confirmaciones del botón a un `<p role="status" className="min-h-[1.3em] text-[14px] font-semibold text-rv-teal">`
siempre montado bajo los botones, con el mismo texto ("They'll call you as soon as possible" / "{mentorName} has your message").
**Necesita decisión del Director (no se cambia aquí)**: hoy `setDone` se ejecuta aunque `act` falle (`.catch(() => {})`), así que
sin red dice "They'll call you…" sin que nadie lo sepa. Arreglarlo es lógica del camino de crisis.
**Comprobación**: Playwright: `57 21:12` → la hoja de Luis se abre y el foco sigue en "Next moment"; en el móvil de Pablo pulsar
"Help" → el foco entra en la hoja; Tab da la vuelta dentro; Escape cierra solo esa hoja; botón Close de 44 px; "Talk to my clinic"
→ la confirmación se lee (contraste ≥4,5:1) y queda en `role=status`; el `innerText` de la hoja (sin "Close") idéntico al de antes.

### P13 · K-51 · README  — carril Diseño (texto) · S · riesgo nulo
**Archivo**: `README.md` (hoy es la plantilla de create-next-app). Borrador en el ciclo 1, versión final en el ciclo 3 (debe
describir lo que de verdad quedó). Contenido, en inglés: qué hace (2 líneas); el problema (después de la TMS); enlace a
`https://junction-ackerman.vercel.app/relevo/demo` (dato del Juez: confirmar); los 8 pasos con los números del contrato; qué es
real (motor portado de Python, filtro, simulación determinista) y qué es `// MOCK:` (roles sin login, sensores simulados, lista fija
de nombres, dictado del navegador, cifrado E2E, clínica y teléfono de demo, cifras del cierre de la evaluación offline); textos
corregidos C-05 y C-16 (sección "copy" de f1-calidad); tecnologías; cómo ejecutar (`npm install`, `npm run dev`,
`.env.example`); aviso de que `/` es la versión anterior (Relay); licencia MIT.
Dos huecos detectados: **no hay archivo `LICENSE`** en el repo (CLAUDE.md dice MIT) → hace falta el nombre del titular (pregunta
al Director); y `.env.example` dice "por defecto gemini-2.5-flash" cuando el código usa `gemini-3.8-flash` → corregir solo ese
comentario (no es configuración).

### P14 · K-53 · `.gitignore`  — carril Diseño · S · riesgo nulo
Añadir al final `# capturas y registros de Playwright (MCP)` + `.playwright-mcp/` (sin barra inicial: cubre `.claude/.playwright-mcp/`,
112 archivos hoy, no ignorados — VERIFICADO con `git check-ignore`). No borrar la carpeta (regla 6).
Comprobar: `git check-ignore -v .claude/.playwright-mcp/<un archivo>` y que `git status --short` ya no la lista.
`.equipo/informes/` sigue sin ignorar: decide el Director si se sube.

---

## 2. Propiedad de archivos (qué tareas comparten archivo y NO pueden ir en paralelo)

| Archivo | Tareas que lo tocan | Dueño | Regla |
|---|---|---|---|
| `src/app/relevo/demo/page.tsx` | P4 (pastilla), P5, P6, P7 (props), futuras: U-02 anillo, J-04 visita corta, K-06, K-31, K-32 | Frontend | **Un solo dueño por ciclo**. Es el archivo más disputado: 7 tareas |
| `src/app/relevo/kit.tsx` | P4 (`useView` 37-72), P12 (`Sheet` 250-264, `Phone` 569); futuras K-33 grabadora, K-48 cola | Frontend (C1) → Diseño (C2) | Nunca dos a la vez; lo usan todas las pantallas |
| `src/app/relevo/MentorApp.tsx` | P7, P8; futuras K-10 (M6, crisis), K-19, K-36, K-44 | Frontend | P7 → P8 en serie |
| `src/app/relevo/ClinicWeb.tsx` | P7 (52-59); futuras K-26 campos vacíos (446), U-19, U-21 | Frontend | P7 primero |
| `src/app/relevo/MenteeApp.tsx` | P12 (HelpSheet 344-386); futuras K-13/K-21 (A0), K-44 | Diseño (C2) | Zona de crisis: visto bueno de Seguridad clínica |
| `src/app/relevo/relevo.css` | P11; futura K-35 contrastes | Diseño | Cambia el aspecto de todo: hacerlo pronto y con capturas antes/después |
| `src/app/api/relevo/act/route.ts` | P1 (+K-40); futura U-06 (deshacer al ir atrás: riesgo medio, no ahora) | Backend | Una tarea |
| `src/app/api/relevo/note/route.ts` | P2 (K-07 + K-01 + typeof); K-16/K-15/K-30 bloqueados por DECISIONES 6 | Backend | Entrada de la crisis: una tarea, visto bueno |
| `src/app/api/relevo/audio/route.ts` | P2 | Backend | — |
| `src/app/api/relevo/mentor/route.ts` | P3 (K-01 + K-02) | Backend | — |
| `src/lib/relevo/sim.ts` | P1 (762-764) | Backend | Solo esas 3 líneas; SCRIPT/SALT intocables |
| `src/lib/relevo/views.ts` | P10; futuras K-12 (M0), K-17 (bloqueada), U-17 | Backend | Un solo dueño (lo usan las tres apps y relevo-check) |
| `src/lib/relevo/demo.ts` | P9; futuras K-06, J-07 MOCK, U-07/U-22 momentos, U-02 `look` | Backend | Si se añade un campo, el tipo `DemoData` de `demo/page.tsx` es del carril Frontend: avisar |
| `src/lib/relevo/texts.ts` | futuras K-11, K-20, J-11 | Backend | Ningún script mira esos textos (grep) |
| `scripts/relevo-demo-walk.mjs` | futura K-41 | Backend | Es la puerta: cambiarlo en un ciclo sin otros cambios de servidor |
| `README.md`, `.gitignore`, `.env.example`, `LICENSE` | P13, P14 | Diseño | — |
| `src/lib/relevo/ai.ts`, `engine.ts`, `src/lib/app/kv.ts`, `globals.css` | nadie | — | Intocables o compartidos con Relay |

**Choques clave**: (1) `demo/page.tsx` concentra el trabajo del presentador: todo en el carril Frontend y en orden P4 → P5 → P6
(ciclo 1) y P7 (ciclo 2). (2) `kit.tsx` pasa de Frontend (ciclo 1) a Diseño (ciclo 2), nunca a la vez. (3) `note/route.ts`:
K-07 y K-01 en la misma tarea, y nadie más lo toca. (4) P11 (`@layer`) cambia el aspecto de botones que P7, P8 y P12 están
mirando en capturas: hacer P11 al principio del ciclo 1 y que los demás comparen contra el resultado ya con capas.

---

## 3. Reparto en 3 carriles por ciclo

| Ciclo | Frontend | Backend / datos | Diseño / estilos |
|---|---|---|---|
| **1** · que nada se rompa en directo | **P4** `kit.tsx` useView + pastilla · **P5** reloj, flechas, línea de tiempo · **P6** proyector (E, 30vh, 1100) — todo `demo/page.tsx` | **P1** `/act` + `sim.ts:762` · **P2** `/note` + `/audio` (K-07 + K-01 con visto bueno) · **P3** `/mentor` (K-01 + K-02 con `after()`) — en este orden, cada uno con su puerta y su commit | **P11** `relevo.css` en capas (primero, con capturas antes/después) · **P14** `.gitignore` · **P13** borrador del README |
| **2** · que el jurado vea la historia | **P7** pestañas/hojas/ficha (`MentorApp`, `ClinicWeb`, props en `demo/page.tsx`) · **P8** copiloto en Hoy | **P9** traza en inglés (`demo.ts`) · **P10** fecha del plan (`views.ts`) · si el Juez lo sube: K-11/K-20 (`texts.ts`), K-12 (`views.ts`), K-41 (script) | **P12** hojas accesibles (`kit.tsx` Sheet + `MenteeApp` HelpSheet), con visto bueno de Seguridad clínica |
| **3** · integración y entrega | lo que quede del backlog en sus archivos (p. ej. U-02 anillo + J-04 visita corta, si caben) | prueba con clave falsa (abajo) y la ruta con Gemini de verdad **una vez** | **P13** README final + LICENSE · capturas para el pitch |

**Integración al final de cada ciclo** (la hace una sola persona, con todos los carriles parados): puerta completa +
`npx next build` + recorrido de los 8 pasos en Playwright a 1440×900 (capturas en los momentos match, copilot, yes, good, v4,
crisis, pl2, close).

**Prueba con clave falsa (ciclo 3, para P3)**: tras el build, un segundo servidor de producción en otro puerto, sin Redis y con
una clave que Google rechaza (no gasta cuota):
```
GEMINI_API_KEY=clave-falsa-de-prueba KV_REST_API_URL= KV_REST_API_TOKEN= UPSTASH_REDIS_REST_URL= UPSTASH_REDIS_REST_TOKEN= npx next start -p 3100
```
Las variables vacías **sí** tapan las de `.env.local` (VERIFICADO en `@next/env`: solo rellena las que están `undefined`), así que
usa memoria y no toca producción. `next start` no choca con el bloqueo de `next dev`. Después: `relevo-demo-walk` contra :3100
(19/19 con plantilla) y 5 lecturas de `/mentor?as=pablo` en `47 08:45` → 2 líneas `[relevo/ai] attempt` en total.

---

## 4. Lo que NO cabe (o no se debe hacer)

- **Cambiar `gemini()`** (parámetro de intentos, timeouts de T1 o T3): prohibido por el encargo. P3 lo evita con `after()`.
- **K-02 parte notas, K-04, K-05, K-14 A, K-15, K-16, K-17, K-29, K-30 lista extra**: lógica de crisis (DECISIONES 6). Al informe final.
- **Honestidad de la confirmación de "Talk to my clinic" si falla la red** (P12): lógica de crisis → decisión del Director.
- **"Modo foco" ampliando columnas**: no agranda los teléfonos (limitados por el alto); no compensa.
- **Concurrencia de verdad en Redis** (WATCH/Lua o eventos en lista): L, toca 5 rutas. K-01 reduce la ventana a un viaje a Redis.
- **Estado de error en las 3 apps** (D-02 completo, componente `Status`): solo la pastilla de la demo en el ciclo 1.
- **U-06** (ir atrás deshace): cambia cuándo se descartan acciones; riesgo medio en `act/route.ts`; no antes del ciclo 3.
- **Tipos compartidos** entre `views.ts` y los componentes, **SSE/WebSocket**, **permisos por mundo**, **pruebas de interfaz
  automáticas de los 8 momentos**: fuera de alcance.
- **D-05 completo** (puntos encima de la pista del deslizador como un solo control): P5 agrupa por día; fundir los dos controles, no.

## 5. Correcciones a los informes anteriores (para que nadie las aplique tal cual)

1. K-02 paso 2 (Calidad): parámetro `attempts` en `gemini()` → prohibido. Usar P3.
2. K-02 marca de intento: no guardar `""` en `t1:…` (`views.ts:146` usa `??` y el mensaje saldría vacío). Usar `try:…`.
3. K-38 (Calidad): no ignorar flechas "dentro de `main`": rompería → tras tocar un teléfono. Solo hojas y radiogroups.
4. K-08 (Calidad): "enfocar solo si el foco está en body" no sirve para las aperturas manuales. Regla del propio teléfono.
5. D-03 (Diseño): falta fijar el orden de capas y dejar `.rv .truncate` fuera de la capa.
6. Encargo: en Next 16 el build no pisa el `.next/dev` del servidor de desarrollo; aun así, build solo en la integración.
7. K-01 en `/note`: la nota se guarda con el reloj del mundo recién leído (si el presentador avanzó, en la hora nueva). Es lo
   correcto, pero que lo sepa Seguridad clínica al dar el visto bueno.
