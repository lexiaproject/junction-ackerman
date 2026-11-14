# C1 · Backend y datos · informe del ciclo de construcción 1

Rama `sesion-autonoma`, sin commits ni push (los hace el Integrador). Archivos tocados (solo mi carril):
`src/app/api/relevo/act/route.ts`, `src/lib/relevo/sim.ts` (solo el bucle de eventos de usuario), `src/lib/relevo/store.ts`
(+3 líneas), `src/app/api/relevo/note/route.ts`, `src/app/api/relevo/audio/route.ts`, `src/app/api/relevo/mentor/route.ts`.
No tocados: `engine.ts` (`git diff` vacío), `SCRIPT`/`BANDIT_SALT`, `ai.ts`, Relay, `.env.local`, archivos de Frontend y Diseño.

## Puerta (ejecutada al final, con todos los carriles en el árbol)
- `node scripts/relevo-check.mjs` → **33/33** · `node scripts/relevo-demo-walk.mjs http://localhost:3000` → **19/19**
- `npx tsc --noEmit -p .` → 0 errores · `npx eslint src/app/api/relevo src/lib/relevo` → 0 errores
- Pruebas propias: `c1-backend-test.mjs` (41 comprobaciones contra el servidor, mundos `kqp1…`/`kqp2…`/`kqp3…` aleatorios) y
  `c1-sim-poison.mjs` (5 comprobaciones de `evaluate()` con un mundo ya envenenado), ambas en el scratchpad de la sesión
  (`C:\Users\<user>\AppData\Local\Temp\claude\545cfc39a490963b\202f2361-f25d-42b2-bb0f-e0ad8f1417d8\scratchpad\`). Todo OK.

---

## P1 · K-03 + K-26 (servidor) + K-27 + K-40 · `/act` y `evaluate()`

**Cambios**
- `act/route.ts:7-18` — `isPerson()` con `Object.hasOwn(PERSON, …)` y `CLINIC_NEEDS`: lo mínimo que necesita cada acción de la
  clínica (`call`: persona válida y, si es `schedule`, `at` numérico; `alert_take`: `alertId`; `resolve`: `alertId` o persona;
  `ideas_pause`/`ideas_reactivate`: mentor válido; `clinic_rhythm`: mentor válido y ritmo 0-3; `match_propose`: mentor y
  acompañado válidos). Si falta → 400 y **no se guarda** el evento.
- `act/route.ts:21-29` — cuerpo y `p` deben ser objetos planos (null, listas, números o texto → `{}`/400); `w`, `as`, `type`
  solo si son texto; `JSON.stringify(p).length > 4000` → 413 (K-27).
- `act/route.ts:41` — K-40: el reset conserva `seq` (`fresh.seq = world.seq`).
- `act/route.ts:50, 60-71` — `patch` debe ser objeto; pesos: solo claves que ya existen, numéricos y acotados a 0-1; catálogo:
  solo claves existentes con valor booleano (y la auditoría solo lista lo aplicado). Rangos de umbrales: no (como dice el plan).
- `act/route.ts:80, 92-93, 97` — `Object.hasOwn` en `person_thresholds`, en `ALLOWED` (antes `as:"constructor"` daba 500) y en la
  auditoría; después, la comprobación `CLINIC_NEEDS`.
- `sim.ts:763-768` — `try/catch` por evento en la re-ejecución de eventos de usuario; si revienta, traza
  `(<tipo> ignored: invalid data)`. Nada más del archivo cambia.

**Por qué**: un evento con datos malos se guardaba y reventaba la simulación en cada lectura (todas las vistas en 500 para
siempre, Q-01). Ahora hay dos redes: el servidor no deja entrar los casos conocidos, y si alguno entra (o ya estaba guardado en
un mundo antiguo), la simulación lo salta.

**Comprobación** — VERIFICADO:
- Los 9 casos de Q-01/K-03 (`ideas_pause {}`, `ideas_reactivate {mentor:"zzz"}`, `clinic_rhythm {}` y ritmo 9, `call` sin persona y
  con `at:"x"`, `match_propose {}` y con mentor "zzz", `resolve {}`) → 400 y las 5 vistas (`/demo`, `/me`, `/mentor` pablo y marta,
  `/clinic`) en 200.
- `p` = null / `[1,2]` / `"hola"` en `luis consent` y `p:null` en `pablo idea` → 200 y vistas en 200 (antes 500 para siempre).
- Cuerpos `null`, `[]`, `42`, no-JSON → 400. `as:"constructor"` y `"__proto__"` → 403. `person:"constructor"` → 400. `p` de 5 000
  caracteres → 413.
- `weights:{sueno:"abc",foo:1,constructor:1}` y `catalog:{foo:true, walk:"yes"}` → configuración idéntica; una configuración válida
  (sueno 0,3, apagar una idea) sí se aplica.
- Acciones válidas de la clínica tal como las manda `ClinicWeb.tsx` (`call` now/schedule, `ideas_pause`, `ideas_reactivate`,
  `clinic_rhythm`, `resolve {person}`) → 200.
- K-40: nota antes del reset `ev1`, después `ev2` (antes se repetía `ev1`).
- Mundo ya envenenado (eventos malos metidos directamente en `world.events` y `evaluate()` importado de `sim.ts`): sin error, con la
  traza "ignored: invalid data"; y la crisis del guion del día 57 sigue igual en ese mundo (nivel 3, ayuda abierta, alerta grave).

**Riesgos**: (a) Un evento que revienta a mitad de `act()` puede dejar un cambio a medias en la simulación de esa lectura (antes
daba 500); con la validación del servidor, los casos conocidos ya no entran. (b) El `try` envuelve también acciones de crisis de
usuario (`help`, `note`): solo actúa donde antes había un 500, no cambia ninguna acción válida (19/19 y la prueba de crisis).
(c) Los pesos aceptan 0-1; el deslizador de C5 va de 0 a 0,5, así que no corta nada de la interfaz.

## P2 · K-07 + K-01 (notas) · `/note` y `/audio`

**Cambios**
- `store.ts:24-26` — `AUDIO_MIME` (`audio/webm|ogg|mp4|mpeg` con parámetros opcionales) y `safeAudioMime()` (cualquier otro → `audio/webm`).
- `note/route.ts:13` — cuerpo `null` → `{}` (antes 500).
- `note/route.ts:17-21` — `text` solo si es texto (K-26, higiene de tipo: `text:123` → 400 "The note is empty"); `audio` debe ser
  texto si viene (→ 400 "Bad recording"); `mime` pasa por `safeAudioMime` (K-07).
- `note/route.ts:37-45` — K-01: `loadWorld` justo antes de `addEvent` + `saveAudio` + `saveWorld`, y se guarda sobre esa copia.
  `analysis` (lista fija `crisisFlag` || Gemini), `me`, `to` y `previous` siguen saliendo de la lectura inicial.
- `audio/route.ts:12-15` — `Content-Type: safeAudioMime(a.mime)` (también para audios ya guardados con un tipo malo),
  `X-Content-Type-Options: nosniff`, `Content-Security-Policy: sandbox`.

**No cambiado** (DECISIONES 6 y 7): qué se detecta, el orden del filtro de crisis, la llamada a `analyseNote`, K-16 (apóstrofo),
K-15, K-02 parte notas (la espera a Gemini en /note sigue).

**Comprobación** — VERIFICADO:
- Nota con audio `<script>alert(1)</script>` y `mime:"text/html"` → `/audio` responde `audio/webm`, `nosniff`, `sandbox`.
- `audio/webm;codecs=opus`, `audio/ogg;codecs=opus`, `audio/mp4` se conservan tal cual.
- `text:123` → 400 "The note is empty"; cuerpo `null` → 400; `audio:5` → 400.
- Nota normal (día 50) → `ok`, `crisis:false`, sin ayuda abierta, 0 alertas graves.
- Nota con frase de crisis el día 50 ("Some nights I just want to die.") → `crisis:true`, ayuda abierta para Luis, 1 alerta grave,
  Luis en nivel 3 en la clínica, M6 para Pablo. El recorrido (notas de los pasos 3-4 y crisis del guion en el paso 6) → 19/19.
- K-01 — INFERIDO: sin Gemini la espera es casi nula y no pude reproducir la carrera; lo comprobado es que la nota se guarda y que
  todo lo de arriba sigue igual. Falta en la integración: grabar, enviar y reproducir en Chrome con micrófono.

**Riesgos**: (a) un navegador que grabe con un tipo raro (fuera de webm/ogg/mp4/mpeg) se servirá como `audio/webm` y podría no
sonar. (b) K-01: si el presentador movió el reloj mientras se esperaba a Gemini, la nota queda en la hora nueva del reloj (más
fiel; aviso para Seguridad clínica, corrección 7 del plan). (c) Sigue sin haber bloqueo real en Redis: la ventana de carrera baja
de "lo que tarde Gemini" a un viaje a Redis.

## P3 · K-01 + K-02 (mentor) · `/mentor` sin bloquear ni reintentar

**Cambios** (solo `mentor/route.ts`; `ai.ts` intacto)
- `:2` `import { after } from "next/server"`; `:13` `export const maxDuration = 30` (2 intentos de 10 s de `gemini()` caben;
  compatible con cacheComponents según `route-segment-config/index.md`).
- `:22-41` — con tarjeta a la vista, sin borrador (`t1:…`) y **sin marca** `try:t1:…` y con clave: se recarga el mundo, se apunta
  `ai["try:"+key] = fecha` y se guarda; se responde **ya** con la plantilla; el borrador se pide en `after()`; si llega, se
  recarga el mundo justo antes de guardar `ai[key]` (K-01). Si no llega, queda la plantilla. La marca va en una clave aparte para
  no dejar vacío el mensaje (`views.ts` usa `draft ?? plantilla`). Nadie más lee `world.ai`.

**Comprobación**
- VERIFICADO: sin clave, tras el "Yes" de Pablo, 6 lecturas de `/mentor` en ~180 ms en total y la tarjeta trae la plantilla
  ("Hey Luis, fancy a stroll tomorrow at 10?…"); recorrido 19/19; `tsc` y `eslint` limpios.
- NO verificado (no se puede sin clave y está prohibido llamar a Gemini): que el borrador aparezca en el siguiente sondeo, que la
  marca `try:` impida reintentar y que `after()` termine dentro de Vercel. INFERIDO de la lectura del código y de la guía de
  `after.md`. Prueba propuesta para la integración (plan §3, "prueba con clave falsa" o la única prueba con clave real del final):
  5 lecturas seguidas de `/mentor` tras "Yes" deben dejar como mucho 2 líneas `[relevo/ai] attempt` en el registro (una llamada
  con su reintento interno), no 10.

**Riesgos**: (a) el texto de la tarjeta de Pablo cambia en el siguiente sondeo cuando llega el borrador (si ya abrió la hoja de
enviar, se queda con la plantilla). (b) Dos sondeos exactamente simultáneos pueden pedir 2 borradores (no en bucle). (c) Si Gemini
falla una vez, esa tarjeta ya no lo reintenta: se queda con la plantilla (es lo pedido). (d) Una escritura extra a Redis por
tarjeta (la marca).
