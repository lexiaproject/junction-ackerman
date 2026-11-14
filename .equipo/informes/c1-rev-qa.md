# C1 · Revisión de QA · comportamiento de los cambios del ciclo 1

Autor: agente de QA · Fecha: 14/11/2026 · Servidor: http://localhost:3000 (sin Gemini, memoria local) · Rama `sesion-autonoma`,
cambios sin confirmar en el árbol de trabajo. Solo lectura: no he editado nada del repositorio salvo este informe.
Scripts y capturas en `C:\Users\<user>\AppData\Local\Temp\claude\545cfc39a490963b\202f2361-f25d-42b2-bb0f-e0ad8f1417d8\scratchpad\qa\`:
`c1-api.mjs` (salida en `c1-api.out`, 118 comprobaciones), `c1-poison.mjs`, `c1-ui-shapes.mjs`, `c1-gate.txt`, `c1-ui-1.png`,
`c1-luis-crisis.png`, `c1-pablo-crisis.png`. Navegador: contextos de Playwright propios creados con `browser.newContext()` y
cerrados al acabar (no he tocado las pestañas de los demás agentes). Todos los mundos son aleatorios con prefijo `qc1…`.

## Veredicto por cambio

| # | Cambio | Veredicto |
|---|---|---|
| 1 | `/act` + simulación (Q-01, reset, evento raro) | **Aprobado con arreglo menor** (QC1-02) |
| 2 | `/note` y `/audio` (tipo de audio, nota normal y de crisis) | **Aprobado** |
| 3 | `/mentor` responde con plantilla sin esperar a Gemini | **Aprobado** (la parte con Gemini, INFERIDA) |
| 4 | Vista de demo (Next, deslizador, puntos, selector, E, Connection lost, consentimientos, pl2) | **Aprobado con arreglo menor** (QC1-01) |
| 5 | Otras pantallas con `useView` siguen actualizándose | **Aprobado con arreglo menor** (QC1-01, misma causa) |
| 6 | Puerta y Relay | **Aprobado** |

## 1. Puerta (VERIFICADO, al principio y otra vez al final)
- `node scripts/relevo-check.mjs` → 33/33 OK. `node scripts/relevo-demo-walk.mjs` → 19/19 OK ("Recorrido de la demo completo").
- `npx tsc --noEmit -p .` → código 0, sin salida. `npx eslint src/app/relevo src/lib/relevo src/app/api/relevo` → código 0.
- Relay: `/`, `/app`, `/clinic` → 200. También `/relevo`, `/relevo/demo`, `/relevo/app`, `/relevo/clinic` → 200.

## 2. Lo comprobado y que funciona (VERIFICADO)

**Cambio 1 · `/act` y simulación**
- Los 13 casos de Q-01 (`ideas_pause {}` / `zzz` / `constructor`, `ideas_reactivate {}`, `clinic_rhythm {}` / 9 / "1",
  `call` schedule sin persona y con `at:"x"`, `match_propose {}` / mentor "zzz", `resolve {}`, `alert_take {}`) → **400** con
  "Missing or unknown data for …", y las 5 vistas (`/demo`, `/me`, `/mentor` pablo y marta, `/clinic`) en 200.
- `p` = null / `[1,2]` / `"hola"` en 14 acciones de persona (consent, idea, plan, rhythm, onboard, help, v1_answer, copilot,
  request, leave, notice, datatype) → vistas en 200 (antes, 500 para siempre).
- Ajustes absurdos de la clínica (`l1_R` ±1e308, `persist_up` 1e9 / −3 / 1,5, `persist_down` 0, `noticeFrom` ±1e9,
  `noticeFrom` > `noticeTo`, umbrales a 0, pesos "abc"/5/lista/`constructor`, catálogo con claves falsas) → vistas en 200,
  cada lectura en 200-420 ms. `person_thresholds` con ±1e308 → 200 y vistas sanas; con `constructor`/`__proto__` → 400.
- Cuerpos `null`, `[]`, `42`, no-JSON, `"x"` → 400 en `/act` y `/note`. `as` = `constructor` / `__proto__` / `toString` /
  `hasOwnProperty` → 403. `p` de 5 000 caracteres → 413.
- Reset: notas `ev1` → reset → `ev2` → dos resets → `ev3` (no se repite). Una nota con audio antes del reset y otra sin audio
  después: `/audio` de la nueva → 404 (ya no suena el audio del ensayo).
- Mundo ya envenenado (eventos malos metidos a mano en `world.events` y `evaluate()` importado de `sim.ts`, `c1-poison.mjs`):
  10 casos, ninguno revienta; la traza dice "(… ignored: invalid data)" y la crisis del guion del día 57 sigue intacta en todos
  (Luis nivel 3, ayuda abierta, 1 alerta grave).
- Las acciones de la clínica con la forma exacta que manda `ClinicWeb.tsx` (alert_take, call now, call schedule mañana 12:00,
  ideas_pause, ideas_reactivate, rhythm 2, resolve con alertId real) → 200 y vistas sanas.

**Cambio 2 · `/note` y `/audio`**
- Audio con `mime` `text/html`, `text/html; charset=utf-8`, `image/svg+xml`, `audio/webm<script>`, `audio/x-wav`, `AUDIO/WEBM`,
  sin mime o numérico → `/audio` responde `Content-Type: audio/webm`, `X-Content-Type-Options: nosniff`,
  `Content-Security-Policy: sandbox`. Los tipos buenos se conservan: `audio/webm;codecs=opus`, `audio/ogg;codecs=opus`,
  `audio/mp4`, `audio/mpeg`.
- `text` numérico o lista → 400 "The note is empty"; `audio` 5 u objeto → 400 "Bad recording"; `to:"constructor"` / `__proto__`
  → 403; `duration` "abc"/1e308, `cardId`/`kind` objeto → 200 sin dañar el mundo.
- Nota normal (día 50 10:00) → `{"ok":true,"id":"ev1","crisis":false,"to":"Pablo"}`, sin ayuda abierta.
- Nota con frase de crisis ("Some nights I just want to die.") → `crisis:true`; `openHelp` de Luis = `alert:luis:72600`;
  alerta `severe` "Luis: a voice note matched the crisis list" en `/clinic`; `m6:{menteeName:"Luis"}` en la vista de Pablo.
  En el navegador (pantallas sueltas, sin recargar): la hoja "Need help right now?" se abre en la app de Luis
  (`c1-luis-crisis.png`), Pablo pasa a "The clinic team is in touch with Luis…" (M6) y la web de la clínica pasa de 0 a 1 en
  "Severe alerts · level 3" y muestra "Alerts 1" a los ≤10 s. Mismo comportamiento que en F1.

**Cambio 3 · `/mentor`**
- Tras "Yes" el día 47 08:30: 4 lecturas seguidas de `/mentor?as=pablo` en 40-95 ms, con la idea del paseo y el mensaje de la
  plantilla ("Hey Luis, fancy a stroll tomorrow at 10?…"). Sin clave no se escribe ninguna marca `try:t1:…`. Vistas sanas.
- Con Gemini (borrador en `after()`, marca `try:` para pedirlo una sola vez, recarga del mundo antes de guardar): **INFERIDO**
  por lectura de código; no se puede probar sin la clave.

**Cambio 4 · Vista de demo** (Playwright, 1440×900, mundos `qc1ui…`, `qc1ub…`, `qc1uc…`)
- La capa de explicación empieza cerrada (`aria-checked=false`); E la abre y la vuelve a cerrar.
- 5 flechas → muy seguidas desde el principio → índice 4 "Third note in a complaint loop: copilot" (5.º momento, sin repetir).
  3 clics seguidos en "Next moment" desde el 4 → índice 7 (sin repetir; mientras está ocupado el botón no admite clics).
- Clic en el deslizador → foco en `BODY`; → lleva al siguiente **momento** (47 08:30 "Pablo is asked first"), no a otro día.
- Punto del día 57 → "57 21:12 · Crisis phrase in a note → level 3 now", con la hoja de ayuda en el teléfono de Luis.
- "More → Jump to moment": 27 opciones; `pl2` → día 60 08:30, menú cerrado, columna con **Pablo** y "A few days for you" (M5);
  `pl1` → columna con Marta; tras usar el selector, → avanza un momento (19 → 20).
- Escribir "Eee e" y pulsar ←/→ dentro del textarea "Suggested message" del teléfono de Pablo: la capa no se abre, el reloj no se
  mueve y el texto se escribe entero.
- Corte de red simulado (`page.route(...abort)`): la pastilla "Connection lost · retrying…" sale a los 0,24 s y sigue mientras
  dura el corte; al restaurar desaparece en ≤7 s. Con `context.setOffline(true)` igual (sale a ≤6 s, se va a ≤6,5 s al volver).
  Carga inicial sin API → "Can't reach Relevo right now · retrying…" en vez de "Loading the demo…".
- Luis hace la bienvenida con "notes" apagado → franja "Luis turned off notes analysis — the story needs all three." con
  "Reset"; al pulsarlo la franja desaparece.
- Sin errores de consola ni de página en estos recorridos (solo los `ERR_FAILED` provocados a propósito por el corte).

**Cambio 5 · Otras pantallas**
- `/relevo/app?as=pablo` pulsa "Yes" → `/relevo/app?as=luis` (otra pestaña) muestra "Pablo would like to talk to you" sin recargar
  a los 6,3 s (por el sondeo de 4 s; entre pestañas distintas no hay aviso inmediato, igual que antes). Pablo ve la idea del paseo.
- `/relevo/clinic` se actualiza sola tras la nota de crisis (ver arriba); tras recargar la página se ve exactamente lo mismo.

## 3. Hallazgos

```
QC1-01 · Con una red lenta (más de 4-5 s por respuesta) las pantallas no llegan a pintarse nunca
Gravedad: media     Evidencia: VERIFICADO (el comportamiento antiguo, INFERIDO por el código anterior)
Dónde: src/app/relevo/kit.tsx:45-66 (useView: `if (alive && my === last)`)
Pasos para reproducir (Playwright, contexto propio):
  1. POST /api/relevo/act {w:"qc1ueXXXX", as:"demo", type:"clock", p:{to:72600}}
  2. page.route('**/api/relevo/**', async r => { await new Promise(s => setTimeout(s, 6000)); await r.continue(); })
  3. Abrir http://localhost:3000/relevo/demo?w=qc1ueXXXX y esperar 25 s → sigue en "Loading the demo…".
     Igual /relevo/app?w=…&as=luis → teléfono en "Loading…" a los 25 s. Con 3 s de retraso, ambas se pintan bien.
Qué pasa y a quién afecta: cada respuesta solo se aplica si es la de la petición más reciente. Si cada respuesta tarda más que
  el intervalo del sondeo (4 s en las apps, 5 s en la demo), cuando llega ya hay otra petición en marcha y se descarta; así
  siempre. No sale error (la pastilla "Connection lost" tampoco), la pantalla se queda en "Loading…" o congelada con datos viejos.
  Antes del cambio la respuesta tardía se aplicaba. Pasa con wifi saturado del recinto, datos móviles malos en el teléfono del
  jurado (enlace "Same demo on a real phone") o un arranque en frío lento de Vercel + Upstash.
Arreglo propuesto: descartar solo respuestas más viejas que la última YA APLICADA, no que la última pedida:
  `let applied = 0;` … `if (alive && my > applied) { applied = my; setError(""); if (txt !== lastText) { … } }` (y lo mismo en el
  catch). Opcional: no lanzar el sondeo si ya hay una petición en marcha. Volver a pasar esta prueba con 6 s y con 0 s.
Esfuerzo: S     Riesgo de romper algo: bajo
```

```
QC1-02 · Una "llamada programada" con una hora absurda deja una llamada fantasma que bloquea las demás
Gravedad: baja     Evidencia: VERIFICADO
Dónde: src/app/api/relevo/act/route.ts:11 (CLINIC_NEEDS.call solo exige `Number.isFinite`) + src/lib/relevo/sim.ts:675-680
       (se hace `sim.calls.push` ANTES de `dateOf(...)`, que revienta con fechas fuera de rango)
Pasos para reproducir:
  curl -XPOST localhost:3000/api/relevo/act -H "Content-Type: application/json" -d '{"w":"qc1atXXXX","as":"demo","type":"clock","p":{"to":67800}}'
  curl -XPOST localhost:3000/api/relevo/act -H "Content-Type: application/json" \
    -d '{"w":"qc1atXXXX","as":"clinic","type":"call","p":{"person":"luis","mode":"schedule","at":1e308}}'   → {"ok":true}
  GET /api/relevo/demo?w=qc1atXXXX → la traza dice "(call ignored: invalid data)", pero la llamada ya quedó en la simulación
  (el try/catch nuevo para el 500, no deshace lo hecho antes del error). Igual con at = 1e15.
Qué pasa: las vistas siguen en 200 (bien, ya no hay 500), pero Luis queda con una llamada programada sin fecha que nunca se
  cumple: cualquier "Schedule call" posterior de la clínica para Luis se ignora en silencio, y el V4 del guion del día 54 no sale
  (el recorrido falla el paso 5). Solo con peticiones hechas a mano; la interfaz manda siempre "mañana 12:00".
  Nota: una llamada programada VÁLIDA el día 47 también hace fallar el paso 5 del recorrido (el guion cede ante la acción de la
  clínica); eso es diseño, no un fallo.
Arreglo propuesto: en CLINIC_NEEDS.call exigir un rango: `const at = Number(p.at); … (p.mode !== "schedule" || (Number.isInteger(at)
  && at >= 0 && at <= END + 30 * 1440))` (importar END de sim). Así no entra nada que haga fallar `dateOf`.
Esfuerzo: S     Riesgo de romper algo: bajo
```

```
QC1-03 · El borrador de Gemini en /mentor y la recarga del mundo en /note no se han podido probar
Gravedad: baja (riesgo, no fallo)     Evidencia: INFERIDO
Dónde: src/app/api/relevo/mentor/route.ts:26-41, src/app/api/relevo/note/route.ts:37-45
Qué falta: con la clave de Gemini, una sola vez: (1) que el teléfono de Pablo enseña la plantilla al momento y el texto de Gemini
  en el siguiente sondeo; (2) que si Gemini falla, la marca `try:` impide pedirlo otra vez y queda la plantilla (no hay reintento
  automático para esa tarjeta, también si el fallo fue un corte puntual); (3) que una acción hecha mientras Gemini piensa no se
  pierde. Además el GET de /mentor ahora guarda el mundo (marca `try:`) antes de responder: ventana de carrera muy corta con
  Upstash, mucho menor que la de antes (INFERIDO).
Arreglo propuesto: ninguno de código; prueba única con la clave antes del ensayo final.
```

## 4. Notas
- `[aria-label="pablo's phone"]` sigue en minúscula (detalle de accesibilidad ya anotado en F1; no es de este ciclo).
- Entre dos pestañas distintas (`/relevo/app?as=pablo` y `?as=luis`) el cambio tarda lo que el sondeo (4-6 s); dentro de la vista
  de demo es inmediato por el evento `relevo:changed`. Sin cambios respecto a antes.
- Al recorrer la vista de demo conté 14 botones con `aria-label` que empieza por "Day " (el informe de Frontend dice 13 puntos);
  no afecta a nada de lo probado.
