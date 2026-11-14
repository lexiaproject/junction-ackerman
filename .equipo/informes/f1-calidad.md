# F1 · Calidad · Consolidación de hallazgos de Relevo

Autor: jefe de calidad · Fecha: 14/11/2026 · Rama `sesion-autonoma` @ 4701299 · Solo lectura (nada editado salvo este informe).
Fuentes: `f1-qa.md` (Q-), `f1-seguridad.md` (S-), `f1-accesibilidad.md` (X-), `f1-rendimiento.md` (R-), `f1-clinica.md` (C-),
y como contexto `f1-arquitecto.md` (A-) y `f1-juez.md` (J-).

## Cómo se ha verificado
- Cada hallazgo alto o bloqueante se ha revisado **en el código** (archivo y línea abiertos) y, si era barato, **ejecutado** contra
  `http://localhost:3000` (sin Gemini) con mundos aleatorios `kq…`. Scripts (fuera del repo):
  `C:\Users\<user>\AppData\Local\Temp\claude\545cfc39a490963b\202f2361-f25d-42b2-bb0f-e0ad8f1417d8\scratchpad\calidad\` (`v.mjs`, `q2.mjs`, `c.mjs`, `h.mjs`).
- Reproducido por mí (VERIFICADO): Q-01 (mundo envenenado → 500 en /demo y /me), S-01 (audio servido como `text/html` con `<script>`),
  Q-02 (resolver la crisis el día 57 → Luis sigue en nivel 3 los días 57, 58 y 60 y M6 sigue activo), C-11 (`m0.reasons[0]` = "You both started
  out sleeping more and going out less" el día 0 con Luis sin bienvenida), C-01 (la frase de crisis está en la conversación de Pablo),
  C-08 (el día 55 Luis tiene "V3: … Pablo would love to hear from you"), C-04 (’ → crisis:false; ' → crisis:true).
- **Hallazgo nuevo al verificar (K-05)**: si Luis pulsa "Talk to my clinic" durante la crisis del guion, el "resolve" del guion del día 59
  cierra solo la alerta de ayuda y la alerta grave de la nota queda "new" para siempre (VERIFICADO con `h.mjs`).
- Gravedad final: **0 bloqueantes**. Nada impide hoy recorrer la demo del guion de principio a fin (33/33 y 19/19 según QA). Los altos son
  riesgos en directo (producción con Gemini, clics naturales del presentador) o contradicciones con los principios del producto visibles en
  el propio guion.
- Reajustes de gravedad: X-04 alta → media; X-05 media-alta → media; C-07 alta → media; C-03 se absorbe en K-15; X-16 media → **alta** (el Juez
  lo pone como cambio nº 1 y está VERIFICADO por dos especialistas); Q-04 media → alta al unirse con C-02.

## Tabla resumen

| ID | Título | Gravedad | Crisis | Archivos | Esf. | Riesgo | Originales |
|---|---|---|---|---|---|---|---|
| K-01 | /mentor y /note guardan un mundo viejo tras esperar a Gemini | alta | no (mentor) · ruta de crisis sin cambiar lógica (note) | api/relevo/mentor/route.ts, api/relevo/note/route.ts | S | bajo | A-01, A-02, R-01(a), Q-07, J-06 (parte), A-08 (parte) |
| K-02 | Gemini bloquea la vista de Pablo y el envío de notas hasta 16-20 s y se reintenta en bucle | alta | T1 no · T3 lógica | lib/relevo/ai.ts, api/relevo/mentor/route.ts | S | bajo | A-03, R-01(b,c), J-06, A-11, R-10, A-12, S-05 (parte) |
| K-03 | Un evento mal formado deja el mundo en 500 para siempre | alta | no | lib/relevo/sim.ts:762-764, api/relevo/act/route.ts | S | bajo | Q-01 |
| K-04 | Resolver la crisis el mismo día deja a Luis en nivel 3 para siempre | alta | lógica | lib/relevo/sim.ts:702-722 | S | medio | Q-02 |
| K-05 | "Talk to my clinic" en la crisis deja la alerta grave abierta tras el resolve del guion | media | lógica | lib/relevo/sim.ts:647-651, 702-722 | S | medio | nuevo (calidad) |
| K-06 | Si el presentador apaga consentimientos en A0, la historia desaparece sin aviso | alta | no | lib/relevo/demo.ts, app/relevo/demo/page.tsx | S | bajo | Q-03 |
| K-07 | El audio se sirve con el tipo MIME que mande el cliente → XSS en el dominio | alta | no | api/relevo/note/route.ts:38, api/relevo/audio/route.ts:12 | S | bajo | S-01, S-07 (parte) |
| K-08 | La hoja de ayuda no mueve ni retiene el foco, no tiene botón de cerrar y Escape cierra todas | alta | visual/a11y | app/relevo/kit.tsx:250-264 | M | bajo | X-01, X-03, X-23 |
| K-09 | La confirmación "They'll call you…" va dentro de un botón deshabilitado (2,08:1, sin anuncio) | alta | visual/a11y | app/relevo/MenteeApp.tsx:357-379 | S | bajo | X-02 |
| K-10 | M6 afirma "The clinic team is in touch" cuando nadie ha atendido la alerta | alta | visual (texto) | app/relevo/MentorApp.tsx:231 | S | bajo | C-06 |
| K-11 | V3 dice "Pablo would love to hear from you" justo tras su "Can't today" | alta | no | lib/relevo/texts.ts:88, app/relevo/ClinicWeb.tsx:437 | S | bajo | C-08 |
| K-12 | M0 enseña a Pablo cómo empezó la recaída de Luis antes de que Luis consienta | alta | no | lib/relevo/views.ts:124, 184-200 | S | bajo | C-11 |
| K-13 | El consentimiento de datos es obligatorio para entrar (contradice "each one is separate") | alta | no | app/relevo/MenteeApp.tsx:509, 568 | S | bajo | C-13 |
| K-14 | Pablo recibe y conserva la frase de crisis completa | alta | lógica | lib/relevo/views.ts (conversation/noteView), MentorApp.tsx | M | medio | C-01 |
| K-15 | Sin consentimiento de notas o sin conexión, una frase de crisis no abre ninguna ayuda | alta | lógica | app/relevo/kit.tsx:270-290, api/relevo/note/route.ts:29-33 | S | bajo | C-02, C-03, Q-04 |
| K-16 | El apóstrofo tipográfico (’) del móvil anula frases de la lista de crisis | alta | lógica (normalizar entrada) | api/relevo/note/route.ts:17 | S | bajo | C-04 |
| K-17 | "Ask Pablo to write to me" llega a Pablo en crisis y en pausa; Luis recibe `mentor.state:"paused"` | alta | lógica | lib/relevo/views.ts:70, MenteeApp.tsx:188 | M | bajo | C-09, C-10 |
| K-18 | En proyector no se leen los teléfonos (escala 0,49 con la capa abierta) | alta | no | app/relevo/demo/page.tsx:37, 138 | S | bajo | X-16, J-02 |
| K-19 | M5 promete "Marta will write to you these days" aunque Marta no lo haya dicho | media | no | app/relevo/MentorApp.tsx:417 | S | bajo | C-07 |
| K-20 | Copiloto: "how badly you're both sleeping" (salud del mentor) | media | no | lib/relevo/texts.ts:105-107 | S | bajo | C-12, J-10 |
| K-21 | Los consentimientos no cuentan Gemini ni el copiloto | media | no | app/relevo/MenteeApp.tsx:455-459 | S | bajo | C-14 |
| K-22 | Seudonimización solo en cliente y solo 9 nombres; "transcribed on your phone" no es cierto con Chrome | media | no | api/relevo/note/route.ts, lib/relevo/pseudo.ts, MenteeApp.tsx:554 | S | bajo | S-06, C-15, C-16 (parte) |
| K-23 | Respuestas viejas del sondeo pisan a las nuevas (la hoja de crisis puede parpadear) | media | no (arregla parpadeo sin tocar lógica) | app/relevo/kit.tsx:37-72 | S | bajo | A-04, R-03 |
| K-24 | Si cae la red o Redis, la demo se congela sin avisar | media | no | app/relevo/demo/page.tsx:41-48, kit.tsx | S | bajo | A-05 |
| K-25 | Sin identidad: quien conozca el `w` controla el mundo del presentador | media | no | lib/relevo/server.ts, menú "More" | S | bajo | S-02, Q-11, A-10, C-23 |
| K-26 | Entradas raras → 500 y ajustes de clínica que corrompen el mundo en silencio | media | no | api/relevo/act/route.ts, note/route.ts, clinic/route.ts, ClinicWeb.tsx:443-447 | S | bajo | Q-08, S-04, S-08, A-14, A-15 |
| K-27 | Sin límite de tamaño en /act | baja | no | api/relevo/act/route.ts | S | bajo | Q-10, S-03 |
| K-28 | Filtro FORBIDDEN más estrecho que el prompt; Gemini puede cambiar la hora del plan | media | no | lib/relevo/texts.ts:102, ai.ts:37-41 | S | bajo | C-17 |
| K-29 | La hoja de ayuda abierta por una nota no dice que la clínica ya lo sabe | media | lógica (saber el motivo) | MenteeApp.tsx:40-50, 344 | S | bajo | C-18 |
| K-30 | Huecos de la lista fija de crisis | media | lógica (si se añade lista) | lib/relevo/engine.ts:548-552 (intocable), README | S | bajo | C-05, Q-05 |
| K-31 | Cierre de cifras: falta advertir la circularidad y el 48 % de nivel 2; "almost never" exagera | media | no | app/relevo/demo/page.tsx:397-401 | S | bajo | C-21, J-07 |
| K-32 | Momento de crisis: sin aviso de contenido y 37 h sin llamada registrada | media | no (capa de explicación) | app/relevo/demo/page.tsx:336-341 | S | bajo | C-19, C-20 |
| K-33 | Grabadora: no responde a "click" de lectores; aria-live anuncia cada segundo; Undo sin foco | media | no | app/relevo/kit.tsx:445-513 | S | medio | X-05, X-07 |
| K-34 | Avisos nuevos (V2, M6) y alerta grave de la clínica no se anuncian | media | visual/a11y (M6, alerta) | MenteeApp.tsx:102-116, MentorApp.tsx:190-234, ClinicWeb.tsx:74, 365-383 | S | bajo | X-08, X-09 |
| K-35 | Contrastes por debajo de AA (foco en burbujas, barra de Pablo, niveles, interruptores, campos) | media | no | relevo.css, MentorApp.tsx:147, charts.tsx:6, kit.tsx:237, MenteeApp.tsx:448-454, ClinicWeb.tsx:366 | S | bajo | X-06, X-10, X-11, X-12, X-13, X-19 |
| K-36 | M0 y M5 tapan la pantalla pero el foco va a 5 controles ocultos | media | no | MentorApp.tsx:146-155, 374, 409 | S | bajo | X-04 |
| K-37 | Gráficos: sin resumen, solo ratón, series solo por color | media | no | app/relevo/charts.tsx | M | bajo | X-14 |
| K-38 | Línea de tiempo: puntos solapados (crisis no clicable); flechas globales | media | no | app/relevo/demo/page.tsx:66-75, 183-205 | M | bajo | X-15, X-24 |
| K-39 | Dos viajes de red por acción con funciones en EE. UU. | media | no | kit.tsx:28-34, Vercel | S (región) | bajo | R-02 |
| K-40 | Reset repite ids de nota → puede sonar el audio del ensayo | media | no | api/relevo/act/route.ts:21-25 | S | bajo | A-06 |
| K-41 | El recorrido de la demo pasa aunque los botones de las personas no funcionen | media | no | scripts/relevo-demo-walk.mjs | S | bajo | Q-06 |
| K-42 | "Next moment" pulsado rápido repite el mismo momento | baja | no | app/relevo/demo/page.tsx:43-61 | S | bajo | R-06, A-07 |
| K-43 | Semántica menor (Seg, tabs, botón atrás, h1 repetidos, toast, tooltips) | baja | no | ClinicWeb.tsx, app/page.tsx, demo/page.tsx, MenteeApp.tsx, kit.tsx | S | bajo | X-17, X-18, X-20, X-21, X-25 |
| K-44 | Botón "Help" de 36 px (puerta de crisis) | baja | visual | MenteeApp.tsx:92, MentorApp.tsx:67 | S | bajo | X-22 |
| K-45 | Cada sondeo redibuja toda la demo; cuota de Upstash | baja | no | kit.tsx:49, demo/page.tsx:41 | S | bajo | R-04, A-13 |
| K-46 | Carga inicial en cascada | baja | no | demo/page.tsx:71 | S | bajo | R-05 |
| K-47 | Abrir una ficha de la clínica escribe en Redis desde un GET y repite la auditoría | baja | no | api/relevo/clinic/route.ts:14-21 | S | bajo | R-08, A-18 |
| K-48 | Notas duplicadas (doble envío, cola sin conexión) | baja | no | api/relevo/note/route.ts, kit.tsx:270-305 | S | bajo | Q-09, A-19, C-24 (2) |
| K-49 | Riesgos de proceso del día de la demo (frío, micro, reloj atrás) | baja | no | ninguno (lista de ensayo) | S | bajo | R-07, A-17, A-16, A-09 |
| K-50 | Sin cabeceras de seguridad | baja | no | next.config.ts | S | bajo | S-07 |
| K-51 | README de plantilla: no dice qué es simulado ni qué falta | baja (obligatorio para la entrega) | no | README.md, comentarios `// MOCK:` | S | bajo | S-09, C-16, C-23, C-25, Q-11 (nota) |
| K-52 | La portada dice que motor y filtro "are real" | baja | no | app/relevo/page.tsx:27 | S | bajo | C-22 |
| K-53 | `.playwright-mcp/` sin ignorar en git | baja | no | .gitignore | S | bajo | S-10, J-15 |
| K-54 | Registros y URL: riesgos menores | baja | no | ai.ts:24, clinic/route.ts | S | bajo | C-24 (1, 3) |
| K-55 | "Open the note" de la clínica no queda en la auditoría | baja | no | views.ts:336, ClinicWeb.tsx:345 | M | bajo | C-27 |
| K-56 | "Another day" y luego "I'm in" se acepta (el bandido no se deshace) | baja | no | sim.ts:617-627 | S | bajo | Q-12 |

---

## Hallazgos altos

```
K-01 · /mentor y /note guardan un mundo leído antes de esperar a Gemini (pisan lo que pasó entretanto)
Gravedad: alta     Evidencia: VERIFICADO (mecanismo en código) / INFERIDO (efecto en producción: sin clave no se reproduce)
Dónde: src/app/api/relevo/mentor/route.ts:17-27 (loadWorld → await draftIdeaMessage → saveWorld(w, world));
       src/app/api/relevo/note/route.ts:20-38 (loadWorld → await analyseNote → addEvent → saveWorld)
Qué pasa y a quién afecta: con Upstash y clave de Gemini, en el paso 3 ("Yes") la siguiente lectura de /mentor carga el mundo, espera
  ~2 s (hasta 20 s si Gemini va lento) y guarda ese mundo antiguo entero. Un "Next moment", el "I'm in" de Luis o cualquier acción hecha en
  esa ventana desaparece (el reloj "salta atrás"). Igual en /note (pasos 2 y 6) con hasta 16 s. Nota: en /relevo/demo solo hay un
  MentorApp montado (demo/page.tsx:126), así que la afirmación de Q-07 de "dos teléfonos sondeando /mentor" solo vale si además hay un
  móvil real abierto; el fondo del hallazgo se mantiene.
Criterio del jurado afectado: demo que funciona en directo; ejecución técnica.
Arreglo propuesto (concreto):
  mentor/route.ts, dentro de `if (draft)`: `const fresh = await loadWorld(w); fresh.ai[key] = revealNames(draft); await saveWorld(w, fresh);
    return ok(mentorView(evaluate(fresh), as));`
  note/route.ts: justo antes de `addEvent`, `const fresh = await loadWorld(b.w!);` y usar `fresh` en addEvent y saveWorld (el análisis ya
    hecho, `me` y `to` siguen valiendo). No cambia la lógica de crisis (sigue `crisisFlag || Gemini`), solo qué copia del mundo se guarda.
  Comprobar 33/33 y 19/19.
Esfuerzo: S     Riesgo de romper algo: bajo     Toca crisis: no (mentor) · note/route.ts es la entrada de la crisis, sin cambio de lógica (visto bueno de Seguridad clínica)
Originales: A-01, A-02, R-01(a), Q-07, J-06 (parte), A-08 (parte: el arreglo completo con WATCH/Lua no cabe)
```

```
K-02 · Gemini bloquea la vista de Pablo y el envío de notas hasta 16-20 s, y si falla se reintenta en cada sondeo
Gravedad: alta     Evidencia: VERIFICADO (código: ai.ts:9-27 timeout 10 s × 2 intentos; analyseNote 8 s × 2; mentor/route.ts:21 solo guarda si hay borrador)
Dónde: src/lib/relevo/ai.ts:9-27, 46-55; src/app/api/relevo/mentor/route.ts:19-30; src/app/api/relevo/note/route.ts:30
Qué pasa y a quién afecta: tras "Yes", el GET de Pablo no responde hasta que vuelve Gemini; si va lento, el teléfono de Pablo se congela y
  cada sondeo de 4 s lanza otra llamada en paralelo (gasta cuota y alarga la ventana de K-01). Si Gemini falla (null), no se guarda nada y
  se reintenta en bucle. La nota de crisis grabada en directo puede tardar hasta 16 s en llegar aunque la lista fija no necesite a Gemini.
Criterio del jurado afectado: demo en directo; "mejor uso de la tecnología del partner".
Arreglo propuesto (concreto):
  1) mentor/route.ts: `const inflight = new Map<string, number>()` a nivel de módulo; no llamar si `inflight.get(key) > Date.now() - 60_000`;
     poner la marca antes de llamar. Si `draft` es null, guardar igualmente la marca (no reintentar en 60 s).
  2) ai.ts: parámetro `attempts` en `gemini()`; T1 con 1 intento y 5 s.
  3) T3 (analyseNote): bajar a 1 intento y ~4 s SOLO con decisión del Director: con Gemini lento la IA deja de poder AÑADIR crisis
     (la lista fija sigue igual).
  4) Proceso: mirar en Vercel si Fluid compute está activo; si no, `export const maxDuration = 30` en mentor y note (A-12).
  (La opción de `after()` de R-01 es mejor pero es M y no cabe junto con lo demás.)
Esfuerzo: S     Riesgo de romper algo: bajo     Toca crisis: T1 no · T3 lógica (Director)
Originales: A-03, R-01(b,c), J-06, A-11, R-10, A-12, S-05 (parte: cuota por /note)
```

```
K-03 · Un evento mal formado "envenena" el mundo: todas las vistas dan 500 para siempre
Gravedad: alta     Evidencia: VERIFICADO (repro propia: POST /act {as:"clinic",type:"ideas_pause",p:{}} → 200; /demo y /me → 500)
Dónde: src/app/api/relevo/act/route.ts:11 y :71 (se guarda `p` sin validar); src/lib/relevo/sim.ts:762-764 (se re-ejecuta sin try/catch
       en cada lectura); fallos en sim.ts:474 (match_propose), :682 (call), :727 (ideas_pause), :734 (clinic_rhythm)
Qué pasa y a quién afecta: la petición se acepta y el evento revienta la simulación en cada lectura; /relevo/demo se queda en
  "Loading the demo…" y el menú Reset no llega a pintarse. Hoy la interfaz manda datos correctos, pero en los próximos ciclos de
  construcción cualquier botón nuevo con un `p` incompleto dejaría el mundo del presentador en blanco.
Criterio del jurado afectado: ejecución técnica (robustez); presentación.
Arreglo propuesto (concreto), red de seguridad fuera de SCRIPT/BANDIT_SALT:
  sim.ts:762-764 → push(e.t, 6 + e.seq / 1e6, () => { try { if (!act(e, false)) trace(e.t, e.by, `(${e.type} ignored: no longer applicable)`); }
    catch { trace(e.t, e.by, `(${e.type} ignored: invalid data)`); } });
  act/route.ts:11 → `const p = body.p && typeof body.p === "object" && !Array.isArray(body.p) ? body.p : {};`
  OJO: el try/catch envuelve también acciones de crisis de usuario ("help"): solo actúa cuando hoy ya habría un 500, así que no quita nada.
Esfuerzo: S     Riesgo de romper algo: bajo     Toca crisis: no
Originales: Q-01
```

```
K-04 · Si la clínica resuelve la crisis el mismo día, Luis se queda en nivel 3 para siempre
Gravedad: alta     Evidencia: VERIFICADO (repro propia q2.mjs: resolve a las 57 21:30 → nivel 3 los días 57, 58 y 60, alerta "resolved", M6 activo)
Dónde: src/lib/relevo/sim.ts:702-722 (case "resolve" añade `resolutions` pero no quita `crisisDays`); motor engine.ts:313-315
       (`clinicResolve()` y después `step(cand)` con cand de crisis → vuelve a 3). sim.ts:343 añade el día a crisisDays.
Qué pasa y a quién afecta: el botón "Resolve" de la clínica está a la vista en el momento de la crisis; pulsarlo deja la demo incoherente
  (alerta cerrada, persona en nivel 3 sin alerta, M6 a Pablo) hasta el final, y el momento "Clinic resolves → back to what data say" del
  día 59 ya no ocurre. Igual con "Talk to my clinic" (también llama a severe()).
Criterio del jurado afectado: seguridad clínica, ejecución técnica, presentación.
Arreglo propuesto (concreto), en sim.ts (no en el motor): en case "resolve", dentro del `if`, antes de `engineRun`:
  `s.crisisDays.delete(dateOf(day));` (la crisis sigue registrada en la alerta y en el historial). El resolve del guion es el día 59, que no
  es día de crisis: el recorrido del contrato no cambia. Añadir a relevo-check.mjs "crisis y resolución el mismo día → nivel según datos".
  Alternativa (B): resolver para el día siguiente (`dateOf(day + 1)`), sigue en 3 hasta las 03:15. Decide el Director.
Esfuerzo: S     Riesgo de romper algo: medio     Toca crisis: lógica (Director)
Originales: Q-02
```

```
K-06 · Si el presentador hace la bienvenida A0 sin activar "notes"/"ideas", la historia de la demo desaparece sin aviso
Gravedad: alta     Evidencia: VERIFICADO (código: MenteeApp.tsx:498 interruptores apagados; SCRIPT sim.ts onboard a las 0 18:00 se salta si
       Luis ya hizo "onboard" ese día — regla userDid sim.ts:767; QA: 12 pasos del recorrido fallan)
Dónde: src/app/relevo/MenteeApp.tsx:495-570; src/lib/relevo/sim.ts:766-768
Qué pasa y a quién afecta: entre 0 08:00 y 0 18:00 (momento 1 de la demo) el teléfono de Luis muestra A0. Hoy la interfaz obliga a "data"
  (K-13), pero "notes" e "ideas" se pueden dejar apagados: sin "notes" no hay copiloto (paso 2) ni crisis (paso 6). El sistema respeta el
  "no" (correcto), pero nadie avisa a quien presenta. Si se arregla K-13, también se podrá apagar "data" y el riesgo crece.
Criterio del jurado afectado: presentación (riesgo en directo).
Arreglo propuesto (concreto): no cambiar los valores por defecto. 1) En la capa del momento "welcome" (demo.ts) una línea:
  "For the demo, turn on all three." 2) En demo/page.tsx, si la vista de /demo trae a Luis onboarded y algún consentimiento apagado, una
  franja: "Luis turned off <x>: Relevo won't detect <y> · Reset". Si /demo no expone los consentimientos, leerlos de /me (ya los trae).
Esfuerzo: S     Riesgo de romper algo: bajo     Toca crisis: no
Originales: Q-03
```

```
K-07 · El audio de una nota se sirve con el tipo que diga el cliente → XSS almacenado en el dominio
Gravedad: alta     Evidencia: VERIFICADO (repro propia: POST /note con mime "text/html" → GET /audio responde content-type text/html con el <script>)
Dónde: src/app/api/relevo/note/route.ts:38 (`b.mime ?? "audio/webm"` sin validar); src/app/api/relevo/audio/route.ts:12 ("Content-Type": a.mime)
Qué pasa y a quién afecta: cualquiera puede colgar una página con JavaScript en el dominio de la app (lee localStorage, llama a las APIs,
  incluida la cookie de Relay). En una app de salud mental, un juez técnico lo ve en minutos.
Criterio del jurado afectado: calidad técnica; confianza y privacidad.
Arreglo propuesto (concreto): note/route.ts: `const mime = /^audio\/(webm|ogg|mp4|mpeg)(;[\w=.\-\s]*)?$/.test(b.mime ?? "") ? b.mime! : "audio/webm";`
  audio/route.ts: volver a validar `a.mime` con la misma expresión (audios viejos) y añadir "X-Content-Type-Options": "nosniff" y
  "Content-Security-Policy": "sandbox". Probar una nota real en Chrome ("audio/webm;codecs=opus") y que se reproduce.
Esfuerzo: S     Riesgo de romper algo: bajo     Toca crisis: no
Originales: S-01, S-07 (parte: nosniff)
```

```
K-08 · La hoja de ayuda (y todas las hojas) no gestiona el foco, no tiene botón de cerrar y Escape cierra las de todos los teléfonos
Gravedad: alta     Evidencia: VERIFICADO (código kit.tsx:250-264: role="dialog" sin aria-modal, sin foco, Escape en window, cierre solo por fondo;
       a11y comprobó activeElement = BODY con la hoja abierta el día 57)
Dónde: src/app/relevo/kit.tsx:250-264 (Sheet); apertura automática MenteeApp.tsx:40-50
Qué pasa y a quién afecta: en la crisis, un lector de pantalla no se entera de que se abrió la ayuda; tabulando se sale al contenido de
  detrás y al otro teléfono; con VoiceOver/TalkBack no hay forma fiable de cerrar.
Criterio del jurado afectado: diseño responsable del camino de crisis; calidad.
Arreglo propuesto (concreto), solo en Sheet: `aria-modal="true"`, `tabIndex={-1}`, ref; al montar guardar `document.activeElement` y enfocar
  la caja SOLO si el foco está en body (para no robárselo al presentador en /relevo/demo); al desmontar devolverlo. onKeyDown en la caja:
  Escape → onClose (y quitar el listener de window) y Tab/Shift+Tab en bucle dentro. Botón visible arriba a la derecha:
  `<button onClick={onClose} aria-label="Close" className="rv-btn rv-btn-ghost absolute right-3 top-3 h-11 w-11 !px-0"><Icon name="x" /></button>`
  (caja con `relative`). No cambia el orden ni los botones de la ayuda.
Esfuerzo: M     Riesgo de romper algo: bajo     Toca crisis: visual/a11y (visto bueno de Seguridad clínica)
Originales: X-01, X-03, X-23
```

```
K-09 · La confirmación "They'll call you as soon as possible" queda dentro de un botón deshabilitado
Gravedad: alta     Evidencia: VERIFICADO (código MenteeApp.tsx:357-379: disabled={done==="clinic"} y el texto dentro del botón; contraste medido por a11y 2,08:1)
Dónde: src/app/relevo/MenteeApp.tsx:357-379
Qué pasa y a quién afecta: una persona en crisis recibe una confirmación casi ilegible, el foco cae a body y el lector no dice nada.
Criterio del jurado afectado: seguridad y cuidado en el camino de crisis.
Arreglo propuesto (concreto): cambiar `disabled` por `aria-disabled={done==="clinic"}` y `if (done === "clinic") return;` al inicio del
  onClick; sacar la confirmación a un `<p role="status" className="text-[14px] font-semibold text-rv-teal">` siempre montado bajo los botones
  (vacío hasta pulsar). Igual con el botón del mentor. El texto de la confirmación no cambia.
Esfuerzo: S     Riesgo de romper algo: bajo     Toca crisis: visual/a11y (visto bueno de Seguridad clínica)
Originales: X-02
```

```
K-10 · M6 dice "The clinic team is in touch with Luis" cuando nadie ha atendido aún la alerta
Gravedad: alta     Evidencia: VERIFICADO (MentorApp.tsx:231; la alerta está "new" y la propia demo enseña "Unattended 15 min → on-call lead", demo.ts:32)
Dónde: src/app/relevo/MentorApp.tsx:231
Qué pasa y a quién afecta: el aviso afirma un contacto que no ha ocurrido (va contra "los avisos nunca mienten") en el momento 6 del guion.
Criterio del jurado afectado: honestidad del producto (punto fuerte del pitch); seguridad del mentor.
Arreglo propuesto (concreto), solo texto: "{Luis}'s clinic team has been told. You don't need to do anything else." y debajo en rv-muted
  "If you ever think someone is in immediate danger, call 112." (versión de C-06 sin "is taking it from here", que vuelve a prometer una
  acción). Mantener "Talk to Marta". Ningún script busca el texto antiguo (grep).
Esfuerzo: S     Riesgo de romper algo: bajo     Toca crisis: visual (texto; propuesto por Seguridad clínica)
Originales: C-06
```

```
K-11 · V3 dice "Pablo would love to hear from you" justo después del "Can't today" de Pablo
Gravedad: alta     Evidencia: VERIFICADO (repro propia: día 55 13:00 Luis tiene "V3: Fancy sending Pablo a note? Pablo would love to hear from you")
Dónde: src/lib/relevo/texts.ts:88; copia en src/app/relevo/ClinicWeb.tsx:437 (lista C5)
Qué pasa y a quién afecta: Luis lee un deseo que Pablo no ha expresado (dijo que no podía); ocurre en el paso 5 del guion.
Criterio del jurado afectado: honestidad de los avisos.
Arreglo propuesto (concreto): `V3: (mentor) => \`Fancy sending ${mentor} a note? A few words are enough.\`` y la misma cadena en ClinicWeb.tsx:437.
  Ningún script comprueba V3.
Esfuerzo: S     Riesgo de romper algo: bajo     Toca crisis: no
Originales: C-08
```

```
K-12 · M0 enseña a Pablo cómo empezó la recaída de Luis antes de que Luis consienta
Gravedad: alta     Evidencia: VERIFICADO (repro propia día 0 08:10: m0.reasons[0] = "You both started out sleeping more and going out less"; Luis onboarded=false)
Dónde: src/lib/relevo/views.ts:124 (m0 = matchFor(...)) y :184-200 (footprintPhrase dentro de matchFor)
Qué pasa y a quién afecta: historia clínica de Luis mostrada a un igual sin consentimiento, en el paso 1 de la demo. Rompe la frase central
  del pitch ("Only the clinic ever sees data").
Criterio del jurado afectado: privacidad; coherencia del mensaje.
Arreglo propuesto (concreto): solo en mentorView: `const m0raw = proposal ? matchFor(proposal.id, id) : null;
  const m0 = m0raw ? { ...m0raw, reasons: ["Your clinic thinks you have a lot in common", ...m0raw.reasons.slice(1)] } : null;`
  La clínica (C4) y la capa de explicación siguen mostrando la huella. Afinidad 87 % y el resto no cambian (0,87 del contrato intacto).
Esfuerzo: S     Riesgo de romper algo: bajo     Toca crisis: no
Originales: C-11
```

```
K-13 · El consentimiento de datos es obligatorio para entrar
Gravedad: alta     Evidencia: VERIFICADO (MenteeApp.tsx:568 `disabled={!c.data}`; contradice :509 "Each one is separate" y :489 "Without the first one Relevo still works")
Dónde: src/app/relevo/MenteeApp.tsx:509, 513, 568
Qué pasa y a quién afecta: un consentimiento condicionado no es libre (RGPD 7.4 / 9.2.a). Un juez de privacidad lo ve en la bienvenida.
Criterio del jurado afectado: privacidad, confianza.
Arreglo propuesto (concreto): quitar `disabled={!c.data}`; cambiar "Needed for the notices" por "Only needed for notices based on data".
  Hacerlo JUNTO con K-06 (si no, el presentador podrá apagar "data" y romper la demo sin aviso).
Esfuerzo: S     Riesgo de romper algo: bajo     Toca crisis: no
Originales: C-13
```

```
K-14 · Pablo recibe la frase de crisis completa y se queda con ella
Gravedad: alta     Evidencia: VERIFICADO (repro propia día 57 21:13: conversations.mentee.at(-1).text = "I can't do this anymore. Some nights I just want to die.")
Dónde: src/lib/relevo/sim.ts:585-596 (la nota se entrega y luego severe); src/lib/relevo/views.ts:161 (conversations.mentee)
Qué pasa y a quién afecta: el mentor, que también está en mantenimiento, recibe ideación suicida sin filtro y puede reproducirla con voz
  sintética; dos días después empeora. Contradice "Protecting the mentor". Pero ocultarla en secreto cambia lo que Luis cree haber enviado.
Criterio del jurado afectado: impacto y encaje (seguridad entre iguales).
Arreglo propuesto (concreto): DECIDE EL DIRECTOR. Opción A (C-01): en la vista del mentor, si `n.analysis?.crisis` y el que mira no es el
  autor, devolver `text: "", audio: false, kind: "held"` y pintar un texto (ver sección de copy: el propuesto en C-01 no es exacto) + avisar a
  Luis en su hoja. Opción B (S): no tocar la entrega; K-10 ya da a Pablo una instrucción honesta y el 112. Recomendación de calidad: B ahora
  (cabe y no toca lógica) y A solo si sobra un ciclo entero, con Seguridad clínica.
Esfuerzo: M (A) / S (B)     Riesgo de romper algo: medio (A)     Toca crisis: lógica (A)
Originales: C-01
```

```
K-15 · Sin consentimiento de notas, o sin conexión, una frase de crisis no abre ninguna ayuda
Gravedad: alta     Evidencia: VERIFICADO (note/route.ts:29-33 crisis:false sin consentimiento; sim.ts:596 exige consents.notes; kit.tsx:278-290
       devuelve {crisis:false, queued:true} si falla la red — esta última parte INFERIDA, no se simuló modo avión)
Dónde: src/app/api/relevo/note/route.ts:29-33; src/lib/relevo/sim.ts:596; src/app/relevo/kit.tsx:270-290
Qué pasa y a quién afecta: no avisar a la clínica sin consentimiento es coherente, pero hoy ni la persona que escribe ve la ayuda (A3), que
  no envía ningún dato. Un jurado clínico puede preguntar justo esto.
Criterio del jurado afectado: seguridad, ética/privacidad.
Arreglo propuesto (concreto): DECIDE EL DIRECTOR. En kit.tsx sendNote, antes del fetch: `if (crisisFlag(n.text)) window.dispatchEvent(new Event("relevo:help"))`
  (importar `crisisFlag` de engine.ts: no tiene imports, comprobado en su línea 4) y que MenteeApp/MentorApp abran la HelpSheet con ese evento.
  No se envía nada extra al servidor ni se crea alerta. Cubre también la cola sin conexión. Si no se aprueba: frase para el pitch/README
  ("without notes consent Relevo doesn't analyse text; Help is always one tap away").
Esfuerzo: S     Riesgo de romper algo: bajo     Toca crisis: lógica
Originales: C-02, C-03, Q-04
```

```
K-16 · El apóstrofo tipográfico (’) que ponen los móviles anula frases de la lista de crisis
Gravedad: alta     Evidencia: VERIFICADO (repro propia: "I don\u2019t want to live" → crisis:false; con ' recto → true)
Dónde: src/lib/relevo/engine.ts:550 (`don'?t`, intocable); entrada en src/app/api/relevo/note/route.ts:17
Qué pasa y a quién afecta: iPhone y muchos Android escriben ’ por defecto; un mentor técnico puede probarlo en directo.
Criterio del jurado afectado: ejecución técnica del filtro; credibilidad clínica.
Arreglo propuesto (concreto), sin tocar el motor: note/route.ts:17 → `const text = (typeof b.text === "string" ? b.text : "").replace(/[\u2018\u2019\u02BC]/g, "'").trim().slice(0, 1200);`
  Solo puede añadir coincidencias (ningún patrón contiene ’), así que no viola la línea roja 1. Decide el Director con visto bueno de Seguridad.
  Hacerlo en el servidor basta (el cliente no analiza). Incluye de paso el `typeof` de K-26.
Esfuerzo: S     Riesgo de romper algo: bajo     Toca crisis: lógica (normalización de entrada)
Originales: C-04
```

```
K-17 · "Ask Pablo to write to me" llega a Pablo durante la crisis y durante su pausa; Luis recibe el estado "paused" de Pablo
Gravedad: alta     Evidencia: VERIFICADO (código: MenteeApp.tsx:188 pasa el nombre salvo "left"; sim.ts:647-651 ofrece HELP al mentor siempre;
       views.ts:70 calcula "paused" y lo envía en /me)
Dónde: src/lib/relevo/views.ts:70, 98; src/app/relevo/MenteeApp.tsx:188; src/lib/relevo/sim.ts:647-651
Qué pasa y a quién afecta: Pablo tiene a la vez M6 ("no need to do anything") y "Luis is asking you to write"; en pausa (nivel 2) recibe la
  petición igual. Además "paused" viaja al móvil de Luis y es una pista de la salud de Pablo.
Criterio del jurado afectado: protección del mentor; privacidad por diseño.
Arreglo propuesto (concreto): DECIDE EL DIRECTOR (quita una opción de la pantalla de ayuda). views.ts menteeView: `canAskMentor: !!m && !m.leftProgram
  && m.rhythm !== 0 && !m.tookPause && !m.ideasPausedLevel && !m.ideasPausedM6`, y `state` solo "none" | "left" | "active" (mapear "paused" a
  "active"). MenteeApp:188 `mentorName={data.canAskMentor ? mName : null}`. La hoja sigue con 112, MIELI y clínica. Comprobar que
  `ideasPausedLevel`/`ideasPausedM6` existen con ese nombre en sim.ts antes de usarlos.
Esfuerzo: M     Riesgo de romper algo: bajo     Toca crisis: lógica
Originales: C-09, C-10
```

```
K-18 · En el proyector no se leen los teléfonos ni la clínica con la capa de explicación abierta
Gravedad: alta (reajustada desde media)     Evidencia: VERIFICADO (a11y: escala 0,489/0,480/0,502 a 1600×950; Juez: a 1280×720 cada móvil ~130 px)
Dónde: src/app/relevo/demo/page.tsx:37 (`useState(true)`) y :138 (`lg:h-[38vh] lg:min-h-[260px]`)
Qué pasa y a quién afecta: el texto de los móviles queda en ~7 px; lo más visible del pitch no se lee.
Criterio del jurado afectado: presentación.
Arreglo propuesto (concreto): mínimo S: `useState(false)` en la línea 37 (el interruptor "Show how Relevo decides" ya existe) y atajo de teclado
  `E` en el handler de las flechas (:66-75) para abrir/cerrar. El "modo foco" completo de J-02 (resaltar la superficie) solo si sobra tiempo.
  Ensayar con F11.
Esfuerzo: S     Riesgo de romper algo: bajo     Toca crisis: no
Originales: X-16, J-02
```

## Hallazgos medios

```
K-05 · "Talk to my clinic" durante la crisis del guion deja la alerta grave de la nota abierta para siempre
Gravedad: media     Evidencia: VERIFICADO (h.mjs: 57 21:20 Luis help clinic → día 59 y 62: severe "new", help "resolved", nivel 2)
Dónde: src/lib/relevo/sim.ts:647-651 (help → severe() crea otra alerta y reemplaza s.crisis) y :702-704 (resolve por persona cierra solo la última)
Qué pasa y a quién afecta: pulsar ese botón es natural cuando se enseña la ayuda (y K-09 lo arregla para que se vea). Después la clínica
  ve una alerta grave "sin atender" del día 57 hasta el final de la demo.
Criterio del jurado afectado: coherencia del panel de la clínica.
Arreglo propuesto (concreto): DECIDE EL DIRECTOR. En case "resolve", tras resolver `a`, cerrar también las otras alertas severe/help abiertas de
  la misma persona: `for (const x of sim.alerts) if (x.person === a.person && (x.kind === "severe" || x.kind === "help") && x.status !== "resolved") { x.status = "resolved"; x.resolvedAt = t; x.assignee ??= "Nurse Virtanen"; }`.
  Proceso mientras tanto: no pulsar "Talk to my clinic" en el ensayo, o resolver a mano la alerta restante.
Esfuerzo: S     Riesgo de romper algo: medio     Toca crisis: lógica
Originales: nuevo (calidad); relacionado con X-02 y Q-02
```

```
K-19 · M5 promete "Marta will write to you these days" aunque Marta no lo haya dicho
Gravedad: media (reajustada: en el guion Marta sí responde; solo falla si Marta dice "Can't today")     Evidencia: VERIFICADO (código: views.ts m5.mentorName siempre que haya mentora; MentorApp.tsx:417 incondicional)
Dónde: src/app/relevo/MentorApp.tsx:417
Qué pasa y a quién afecta: promesa en nombre de Marta a Pablo en nivel 2.
Criterio del jurado afectado: honestidad de los avisos.
Arreglo propuesto (concreto): texto "You can write to {Marta} whenever you like." (cierto en cualquier caso).
Esfuerzo: S     Riesgo de romper algo: bajo     Toca crisis: no
Originales: C-07
```

```
K-20 · El copiloto dice "how badly you're both sleeping"
Gravedad: media     Evidencia: VERIFICADO (texts.ts:105-107; se muestra a Pablo el día 40)
Dónde: src/lib/relevo/texts.ts:105-107
Qué pasa: atribuye a Pablo un problema de sueño y repite salud de Luis al mentor.
Criterio del jurado afectado: regla de oro.
Arreglo propuesto: `text: (mentee) => \`Your last few notes with ${mentee} keep going over the same ground. Try acknowledging how ${mentee} feels and suggesting something small together.\``
  (relevo-check.mjs no comprueba este texto: grep).
Esfuerzo: S     Riesgo de romper algo: bajo     Toca crisis: no
Originales: C-12, J-10
```

```
K-21 · Los textos de consentimiento no cuentan que hay IA (Gemini) ni el copiloto
Gravedad: media     Evidencia: VERIFICADO (MenteeApp.tsx:455-459 frente a note/route.ts:29-31 y sim.ts:605)
Dónde: src/app/relevo/MenteeApp.tsx:455-459 (CONSENT_TEXT)
Arreglo propuesto: los textos exactos de C-14 (ver sección de copy). Comprobar que caben en el teléfono a 390 px.
Esfuerzo: S     Riesgo de romper algo: bajo     Toca crisis: no
Originales: C-14
```

```
K-22 · Seudonimización solo en el cliente y solo para 9 nombres; "transcribed on your phone" no es cierto en la demo
Gravedad: media     Evidencia: INFERIDO (lectura: kit.tsx:271 hideNames en cliente; note/route.ts no lo repite; pseudo.ts:3-9 lista fija;
       webkitSpeechRecognition de Chrome envía el audio a Google)
Dónde: src/app/api/relevo/note/route.ts:17; src/lib/relevo/pseudo.ts; src/app/relevo/MenteeApp.tsx:554
Arreglo propuesto: 1) `hideNames(text)` también en note/route.ts antes de analyseNote (idempotente). 2) MenteeApp.tsx:554: "Your voice notes are
  transcribed on your phone, and names are replaced" → ver sección de copy. 3) README: lista fija y dictado del navegador = `// MOCK:`.
Esfuerzo: S     Riesgo de romper algo: bajo     Toca crisis: no (hideNames no cambia ninguna frase de la lista de crisis: son nombres propios)
Originales: S-06, C-15, C-16 (parte)
```

```
K-23 · Una respuesta vieja del sondeo puede pisar a la nueva (el panel "vuelve atrás"; la hoja de crisis parpadea)
Gravedad: media     Evidencia: VERIFICADO (mecanismo: kit.tsx:44-58 aplica cualquier respuesta en orden de llegada) / INFERIDO (desorden en producción)
Dónde: src/app/relevo/kit.tsx:37-72; efecto en MenteeApp.tsx:45-48 (cierra la hoja si llega una respuesta sin openHelp)
Arreglo propuesto: dentro del efecto `let last = 0;` y en load `const my = ++last; … if (alive && my === last) { setData(j); setError(""); }`.
  kit.tsx lo usan todas las pantallas: recorrido completo después.
Esfuerzo: S     Riesgo de romper algo: bajo     Toca crisis: no (evita el parpadeo de la hoja sin tocar su lógica)
Originales: A-04, R-03
```

```
K-24 · Si cae la red o Redis, la demo se congela sin avisar
Gravedad: media (impacto alto, probabilidad baja)     Evidencia: VERIFICADO (demo/page.tsx:47 `.catch(() => {})`; :99 reset sin catch; `error` de useView nunca se pinta)
Dónde: src/app/relevo/demo/page.tsx:41-48, 99
Arreglo propuesto: leer `error` de useView en DemoPage y pintar una franja "Connection lost, retrying…"; en setClock poner el mismo aviso si falla.
  Plan B sin código: `npm run build && npm start` en local sin variables KV (memoria + texto de respaldo). Nunca presentar con `npm run dev`.
Esfuerzo: S     Riesgo de romper algo: bajo     Toca crisis: no
Originales: A-05
```

```
K-25 · Sin identidad: quien conozca el id del mundo puede mover el reloj, reiniciar o actuar como cualquiera
Gravedad: media (alta durante el pitch si se comparte el enlace)     Evidencia: VERIFICADO (server.ts:11-17; demo/page.tsx:103 enseña el enlace con ?w=)
Dónde: src/lib/relevo/server.ts; menú "More" de demo/page.tsx:96-103
Arreglo propuesto: sin código para la demo: mundo nuevo justo antes del pitch; al jurado, enlace SIN ?w=; no proyectar el menú "More".
  `// MOCK: sin autenticación; en producción, sesión por rol y la clínica tras SSO` en server.ts, clinic/route.ts y audio/route.ts; línea en README.
  La llave de presentador de S-02(2) no cabe (M, toca kit.tsx).
Esfuerzo: S     Riesgo de romper algo: bajo     Toca crisis: no
Originales: S-02, Q-11, A-10, C-23
```

```
K-26 · Entradas raras dan 500 y los ajustes de la clínica pueden corromper el mundo en silencio
Gravedad: media     Evidencia: VERIFICADO (QA/Seguridad/Arquitecto; código act/route.ts:11, :39-48, :70; note/route.ts:17; clinic/route.ts:14)
Dónde: src/app/api/relevo/act/route.ts, note/route.ts, clinic/route.ts; src/app/relevo/ClinicWeb.tsx:443-447
Arreglo propuesto: `const body = ((await req.json().catch(() => null)) ?? {})`; `Object.hasOwn(ALLOWED, as)` y `Object.hasOwn(PERSON, id)`;
  `typeof b.text === "string"`; en config aceptar números con rango (umbrales 0-10, noticeFrom/To 0-1440), weights solo claves de
  DEFAULT_CONFIG.weights con 0-1, catalog solo booleanos; en ClinicWeb ignorar campos vacíos (`value === "" ? c[k] : Number(value)`).
Esfuerzo: S     Riesgo de romper algo: bajo (ajustar rangos a lo que ofrece C5)     Toca crisis: no
Originales: Q-08, S-04, S-08, A-14, A-15
```

```
K-28 · El filtro FORBIDDEN es más estrecho que el prompt; Gemini puede cambiar la hora del plan
Gravedad: media     Evidencia: INFERIDO (sin Gemini); filtro VERIFICADO en texts.ts:102
Dónde: src/lib/relevo/texts.ts:102; src/lib/relevo/ai.ts:37-41
Arreglo propuesto: la expresión ampliada de C-17 (comprobado que ninguna plantilla de CATALOG contiene esas palabras, así que no bloquea
  la plantilla) y, si la plantilla tiene hora (`/\b\d{1,2}(:\d{2})?\b/`), exigir las mismas cifras en la salida o devolver null.
Esfuerzo: S     Riesgo de romper algo: bajo (en el peor caso, plantilla)     Toca crisis: no
Originales: C-17
```

```
K-29 · La hoja de ayuda abierta por una nota no dice a Luis que su clínica ya lo sabe
Gravedad: media     Evidencia: INFERIDO (lectura de MenteeApp.tsx:344-386)
Dónde: src/app/relevo/MenteeApp.tsx:40-50, 344
Arreglo propuesto: DECIDE EL DIRECTOR. Requiere saber el motivo: openHelp vale para nota, "help", riesgo r25 y V7 (sim.ts:351, :644). Solo
  mostrar la línea cuando la alerta de origen sea de una nota con consentimiento (si no, mentiría). Texto en la sección de copy.
Esfuerzo: S     Riesgo de romper algo: bajo     Toca crisis: lógica (qué motivo se pasa a la vista)
Originales: C-18
```

```
K-30 · La lista fija de crisis no cubre frases pasivas frecuentes
Gravedad: media     Evidencia: VERIFICADO (QA y Clínica: "don't want to be here anymore", "ending it all", "end my life", "better off without me" → false)
Dónde: src/lib/relevo/engine.ts:548-552 (INTOCABLE)
Arreglo propuesto: no tocar el motor. Frase exacta de C-05 en README/pitch y ensayar solo con la frase del guion. La lista adicional "solo
  añadir" de Q-05 en note/route.ts la decide el Director con Seguridad clínica.
Esfuerzo: S     Riesgo de romper algo: bajo     Toca crisis: lógica (solo si se añade lista)
Originales: C-05, Q-05
```

```
K-31 · El cierre de cifras no advierte la circularidad, oculta la sensibilidad del nivel 2 y "almost never" exagera
Gravedad: media     Evidencia: VERIFICADO (demo/page.tsx:397-401; demo.ts:121 tiene l2.sensitivity 0,48 y lead 1)
Dónde: src/app/relevo/demo/page.tsx:397-401
Arreglo propuesto: textos de C-21 (ver copy). Las tres tarjetas 88 % · 5 días · 2,45 no cambian. Añadir `// MOCK:` en demo.ts:121 con la fuente
  (evaluación de relevo_engine.py sobre 200 sintéticos) por J-07.
Esfuerzo: S     Riesgo de romper algo: bajo     Toca crisis: no
Originales: C-21, J-07
```

```
K-32 · Momento de crisis en la demo: sin aviso de contenido y 37 h sin llamada antes de "resolve"
Gravedad: media     Evidencia: VERIFICADO (SCRIPT sim.ts:134-136; ficha de Luis sin llamada entre 57 21:12 y 59 10:00)
Dónde: src/app/relevo/demo/page.tsx:336-341 (capa del grupo "crisis"); SCRIPT intocable
Arreglo propuesto: líneas de C-19 y C-20 en la capa (ver copy) y proceso: no reproducir la nota de crisis con la voz sintética; si se pulsa
  "Call now" en la ficha de Luis, hacerlo en orden de reloj (punto frágil: reloj atrás descarta lo futuro).
Esfuerzo: S     Riesgo de romper algo: bajo     Toca crisis: no (texto de la capa del presentador, no de la app)
Originales: C-19, C-20
```

```
K-33 · Grabadora: no responde a la activación de lectores; aria-live anuncia cada segundo; el Undo de 5 s no recibe foco
Gravedad: media (reajustada)     Evidencia: VERIFICADO (código kit.tsx:445-472: sin onClick; aria-label "Release to stop") / INFERIDO (lector real)
Dónde: src/app/relevo/kit.tsx:445-513
Arreglo propuesto: `onClick={(e) => { if (e.detail === 0) (state === "rec" ? finish() : start()); }}` en lugar de la rama onKeyDown; aria-label
  "Recording. Press again to send"; quitar aria-live del bloque visible y poner un `sr-only aria-live` solo con cambios de estado; foco al Undo.
  La grabadora es frágil: probar ratón, táctil y teclado en Chrome con micrófono.
Esfuerzo: S     Riesgo de romper algo: medio     Toca crisis: no
Originales: X-05, X-07
```

```
K-34 · Los avisos nuevos (V2, M6, copiloto) y la alerta grave de la clínica aparecen sin anunciarse
Gravedad: media     Evidencia: INFERIDO (lectura)
Dónde: MenteeApp.tsx:102-116; MentorApp.tsx:190-212, 228-234; ClinicWeb.tsx:74, 365-383
Arreglo propuesto: `<div aria-live="polite" aria-relevant="additions">` alrededor de las listas de avisos y de M6; en la insignia de alertas
  `<span className="sr-only"> new</span>` y `<p className="sr-only" aria-live="assertive">{severe > 0 ? \`${severe} severe alert\` : ""}</p>`.
Esfuerzo: S     Riesgo de romper algo: bajo     Toca crisis: visual/a11y (M6 y alerta; visto bueno de Seguridad)
Originales: X-08, X-09
```

```
K-35 · Contrastes por debajo de AA
Gravedad: media     Evidencia: VERIFICADO (cálculo de a11y; X-06 medido en vivo 1:1)
Dónde: relevo.css (foco en burbujas propias, .rv-input), MentorApp.tsx:147, charts.tsx:6, kit.tsx:237, app/page.tsx:186, MenteeApp.tsx:448-454, demo/page.tsx:141, ClinicWeb.tsx:366
Arreglo propuesto: exactamente los valores de X-06 (`.rv .bg-rv-teal :focus-visible { outline-color: #fff; }`), X-10 (`text-rv-ink2`, 12 px),
  X-11 (`/75` → `/90`, `ink2/70` → `ink2`), X-12 (LEVEL_COLOR `["#5B6370","#A14A08","#A8380A","#B91C1C"]`), X-13 (pista `#77827d`, borde
  `#87918c`), X-19 (quitar opacity-60). Solo color; un solo ciclo de estilos.
Esfuerzo: S     Riesgo de romper algo: bajo     Toca crisis: no
Originales: X-06, X-10, X-11, X-12, X-13, X-19
```

```
K-36 · M0 y M5 tapan la pantalla pero el foco recorre 5 controles ocultos detrás
Gravedad: media (reajustada desde alta: no afecta a la demo ni a la crisis)     Evidencia: VERIFICADO (código MentorApp.tsx:146-155 sin inert)
Dónde: src/app/relevo/MentorApp.tsx:146-155, 374, 409
Arreglo propuesto: `const covered = !!data.m0 || (!!data.m5 && m5Open);` e `inert={covered}` en header, contenedor de scroll y nav;
  `role="dialog" aria-modal="true" aria-labelledby` en M0 y M5.
Esfuerzo: S     Riesgo de romper algo: bajo     Toca crisis: no
Originales: X-04
```

```
K-37 · Gráficos: nombre genérico, información solo con ratón, series solo por color
Gravedad: media     Evidencia: VERIFICADO (cálculo) / INFERIDO (lector)
Dónde: src/app/relevo/charts.tsx:53-139; demo/page.tsx:31, 305, 383
Arreglo propuesto: el mínimo de X-14 (summary en aria-label, ejes `#55635d`, colores más oscuros, una línea discontinua).
Esfuerzo: M     Riesgo de romper algo: bajo     Toca crisis: no
Originales: X-14
```

```
K-38 · Línea de tiempo: los puntos del mismo día se solapan (el de la crisis no se puede clicar) y las flechas actúan desde cualquier botón
Gravedad: media (para la demo)     Evidencia: VERIFICADO (Playwright: el punto de 21:27 intercepta el clic en el de 21:12)
Dónde: src/app/relevo/demo/page.tsx:66-75, 183-205
Arreglo propuesto: `<select aria-label="Jump to moment">` con data.moments en el menú "More" y `tabIndex={-1}` en los puntos; `aria-valuetext={\`Day ${day}\`}`
  en el deslizador; en el handler global ignorar si el foco está dentro de `[role=dialog],[role=radiogroup],main`.
Esfuerzo: M     Riesgo de romper algo: bajo     Toca crisis: no
Originales: X-15, X-24
```

```
K-39 · Dos viajes de red seguidos por acción, con funciones en iad1 (EE. UU.)
Gravedad: media     Evidencia: VERIFICADO (región `arn1::iad1`, GET 170-345 ms) / INFERIDO (total 0,5-0,7 s)
Dónde: kit.tsx:28-34; configuración de Vercel
Arreglo propuesto: solo R-02(a): mirar la región de Upstash; si está en Europa, fijar la región de funciones en Vercel; si está en us-east-1, no
  tocar. R-02(b) (un solo viaje) no cabe.
Esfuerzo: S     Riesgo de romper algo: bajo     Toca crisis: no
Originales: R-02
```

```
K-40 · Después de "Reset" se repiten los ids de nota y puede sonar el audio del ensayo
Gravedad: media     Evidencia: VERIFICADO (act/route.ts:21-25: newWorld() con seq 0; audio/route.ts:12 `max-age=3600`)
Dónde: src/app/api/relevo/act/route.ts:21-25
Arreglo propuesto: `fresh.seq = world.seq;` en el reset (1 línea).
Esfuerzo: S     Riesgo de romper algo: bajo     Toca crisis: no
Originales: A-06
```

```
K-41 · El recorrido de la demo pasa aunque los botones de las personas no hagan nada
Gravedad: media     Evidencia: VERIFICADO (QA: walk-noluis.mjs sigue dando 19/19)
Dónde: scripts/relevo-demo-walk.mjs (pasos 4 y 5)
Arreglo propuesto: hacer las acciones de usuario antes de la hora del guion ("I'm in" 47 09:30, "Good" 48 10:30), comprobar `ok === true` en cada
  `act` y que la traza de /demo tiene la acción con `scripted:false`. Hacerlo pronto: es la puerta de todos los ciclos.
Esfuerzo: S     Riesgo de romper algo: bajo (solo el script)     Toca crisis: no
Originales: Q-06
```

## Hallazgos bajos (resumen)

```
K-27 · Sin límite de tamaño en /act — Gravedad: baja · VERIFICADO · act/route.ts · Arreglo: `if (JSON.stringify(p).length > 4000) return bad("Too much data", 413);`
  Esfuerzo S · Riesgo bajo · Crisis no · Originales: Q-10, S-03
K-42 · "Next moment" rápido repite el momento — baja · INFERIDO · demo/page.tsx:43-61 · `useRef` con el último `to` y `Math.max(data.clock.t, ref.current)` en next/prev
  S · bajo · no · R-06, A-07
K-43 · Semántica menor — baja · VERIFICADO/INFERIDO · aria-pressed en Seg y en el selector de rol (quitar role=tab), sr-only en el botón atrás, section+h2 en
  columnas, toast siempre montado · S · bajo · no · X-17, X-18, X-20, X-21, X-25
K-44 · "Help" a 44 px — baja · VERIFICADO (CSS) · MenteeApp.tsx:92, MentorApp.tsx:67 · quitar rv-btn-sm · S · bajo · visual (Seguridad) · X-22
K-45 · Redibujado por sondeo y cuota de Upstash — baja · VERIFICADO (dev) · kit.tsx:49 · comparar el texto de la respuesta antes de setData; mirar el uso de
  Upstash el domingo · S · bajo · no · R-04, A-13
K-46 · Carga inicial en cascada — baja · VERIFICADO · demo/page.tsx:71 · montar columnas en cuanto hay `w` · S · bajo · no · R-05
K-47 · GET de la clínica escribe y repite "Opened Luis's file" — baja · VERIFICADO · clinic/route.ts:14-21 · apuntar solo si no hay ya una consulta de esa persona
  ese día de demo en las últimas 5 entradas · S · bajo · no · R-08, A-18
K-48 · Notas duplicadas — baja · VERIFICADO (Q-09) / INFERIDO (cola) · note/route.ts, kit.tsx:270-305 · ignorar nota igual del mismo remitente en el mismo minuto;
  caducar la cola a 10 min y no guardar audio en ella · S · bajo · no · Q-09, A-19, C-24 (2)
K-49 · Proceso del día de la demo — baja · sin código · abrir la demo 2 min antes, permiso de micrófono dado, solo hacia delante, mundo nuevo, borrar
  `relevo:queue` · S · bajo · no · R-07, A-17, A-16, A-09
K-50 · Cabeceras de seguridad — baja · VERIFICADO · next.config.ts · nosniff, Referrer-Policy, frame-ancestors 'self', poweredByHeader:false (sin CSP de scripts)
  S · bajo · no · S-07
K-51 · README de plantilla — baja (obligatorio en "modo entrega") · VERIFICADO · README.md · qué hace, qué es MOCK (roles sin login, sensores, lista de nombres,
  dictado del navegador, cifrado E2E, clínica y teléfono ficticios), Gemini/DPA (texto corregido en copy) · S · bajo · no · S-09, C-16, C-23, C-25, Q-11
K-52 · Portada "are real" — baja · VERIFICADO · app/relevo/page.tsx:27 · texto de C-22 · S · bajo · no · C-22
K-53 · `.playwright-mcp/` sin ignorar — baja · VERIFICADO · .gitignore · añadir `.playwright-mcp/` · S · bajo · no · S-10, J-15
K-54 · Registros y URL — baja · INFERIDO · ai.ts:24 · registrar solo `(err as Error).name` · S · bajo · no · C-24 (1, 3)
K-55 · "Open the note" sin auditoría — baja · VERIFICADO · no arreglar; no decir en el pitch que queda registrado · M · bajo · no · C-27
K-56 · Cambiar "Another day" por "I'm in" — baja · VERIFICADO · no arreglar (invisible en la demo) · S · bajo · no · Q-12
```

---

## Copy clínico: qué se puede aplicar ya y qué decide el Director

Criterio: (1) no toca la lógica de crisis, (2) el mentor nunca sabe que está peor, (3) los avisos no mienten, (4) solo la clínica ve datos.

### Aceptables sin decisión del Director (solo texto o texto + cambio trivial fuera de la lógica de crisis)
| Origen | Texto propuesto | Veredicto |
|---|---|---|
| C-06 (K-10) | "{Luis}'s clinic team has been told and is taking it from here. You don't need to do anything else." + "If you ever think someone is in immediate danger, call 112." | **Aceptable con un recorte**: quitar "and is taking it from here" (vuelve a prometer una acción que a las 21:13 no ha pasado). Texto final: "{Luis}'s clinic team has been told. You don't need to do anything else." Es copy del camino de crisis (visual): lleva ya el visto bueno de Seguridad clínica, que es quien lo propone. |
| C-07 (K-19) | "You can write to Marta whenever you like." | Aceptable. Cierto en todos los casos. |
| C-08 (K-11) | "Fancy sending {Pablo} a note? A few words are enough." | Aceptable. Actualizar también ClinicWeb.tsx:437. |
| C-11 (K-12) | "Your clinic thinks you have a lot in common" | Aceptable. Cierto (la clínica propone el emparejamiento) y no revela datos. 87 % sin cambios. |
| C-12 (K-20) | "Your last few notes with {Luis} keep going over the same ground. Try acknowledging how {Luis} feels and suggesting something small together." | Aceptable. Sin salud ni "both". |
| C-13 (K-13) | "Only needed for notices based on data" | Aceptable **solo junto con K-06** (aviso al presentador). |
| C-14 (K-21) | notes: "Analyse the text of my voice notes, with names removed and with the help of AI, to alert my clinic if it looks like I need urgent help, and to give my mentor private tips on how to reply" · ideas: "Let my mentor receive ideas to accompany me, drafted with the help of AI (my mentor never sees my data)" | Aceptable: es más honesto que el actual y no da datos al mentor. Comprobar que cabe. |
| C-15 (K-22) | "and the names of people in Relevo are replaced" | Aceptable. **Pero** en la misma frase "Your voice notes are transcribed on your phone" no es cierto en la demo (dictado de Chrome en servidores de Google, S-06). Propuesta: "Your voice notes are turned into text, and the names of people in Relevo are replaced before the text is analysed." |
| C-19 (K-32) | Capa: "Next step for the clinic: call Luis now. Only the clinic can close a level 3." | Aceptable con un cambio: "Only the clinic can close a crisis alert." (que solo la clínica cierre cualquier nivel 3, incluido el de riesgo r25, no está comprobado). Es texto de la capa del presentador, no de la app. |
| C-20 (K-32) | "This part of the demo includes a simulated message about suicidal thoughts." y "If this topic affects you: MIELI crisis line 09 2525 0111 (24 h) · Emergency 112." | Aceptable (capa del presentador). |
| C-21 (K-31) | Línea 397: "… synthetic people we generated, … simulated relapses, default thresholds. This checks that the logic works as designed, not that it predicts relapse in real patients." Línea 401: "Level 2 is much stricter: it catches 48% with a median of 1 day's notice, and gives 0.5 false alarms … Real-world accuracy would need a clinical study." | Aceptable. Las cifras del contrato (88 %, 5 días, 2,45) no cambian; 48 % y 1 día salen de demo.ts:121. |
| C-22 (K-52) | Portada: "… are working code, not clinically validated. Relevo doesn't diagnose, treat or replace emergency services." | Aceptable. |
| C-25 (K-51) | "Clinic +358 9 4512 3300 (demo)" | Aceptable. |
| C-05 (K-30) | README/pitch: "The crisis list in the demo is a short illustrative list…" | Aceptable. |
| C-16 (K-51) | README: "Voice-note text is pseudonymised on the phone before any AI sees it…" | **Aceptable solo reescrito**: tal cual es falso (el dictado del navegador es IA y recibe el audio antes). Propuesta: "Before any note text is sent to the AI model, the names of people in Relevo are replaced (demo: a fixed list; browser dictation stands in for on-device transcription). In production the AI provider would run under a data-processing agreement, on a paid tier with no training on our data, in an EU region." |
| Q-03 (K-06) | Capa: "For the demo, turn on all three." | Aceptable (presentador). |

### Requieren decisión del Director
| Origen | Texto propuesto | Por qué |
|---|---|---|
| C-01 (K-14) | Pablo: "Luis sent a note that went straight to his clinic team. They're looking after it." · Luis: "Your note went to your clinic team as well, so they can help you straight away." | Cambia qué recibe Pablo en la crisis (lógica). Además el texto de Pablo **no es exacto** (la nota se envió a Pablo; la clínica recibió una alerta) y "They're looking after it" promete una acción. Si se aprueba, alternativa honesta: "Luis sent you a note that raised an alert with his clinic team. It's kept for them, so you don't need to listen to it. You don't need to do anything else." y a Luis: "Your note also raised an alert with your clinic team." |
| C-02 (K-15) | "It sounds like things are really hard right now. You don't have to face this alone." | El texto es seguro, pero mostrarlo exige detectar la crisis en el móvil (lógica). No debe decir que la clínica lo sabe (sin consentimiento no lo sabe). |
| C-18 (K-29) | "Your clinic team has been told about your note. If you might act on these thoughts now, call 112." | Solo es verdad si la hoja se abrió por una nota con consentimiento; la hoja también se abre por "help", riesgo r25 y V7 (sin alerta). Hace falta pasar el motivo a la vista (lógica). |
| C-09 (K-17) | (sin texto: quitar "Ask Pablo to write to me" en crisis/pausa) | Quita una opción de la pantalla de ayuda: lógica del camino de crisis. |
| Q-04 (K-15) | Guía genérica "If a note worries you" con el 112 para la pareja sin consentimiento | Lógica de crisis y posible inferencia sobre la salud del otro. |
| Q-05 (K-30) | Lista adicional "solo añadir" en note/route.ts | Lógica de crisis (aunque solo añada). |

---

## Descartados

| Original | Motivo |
|---|---|
| A-20 | No es un hallazgo: el propio arquitecto concluye "sin riesgo real" (cacheComponents/Activity). |
| R-09 | Fuera de alcance: la fuente se carga en el layout raíz compartido con Relay (intocable) y el LCP ya es 0,7-0,9 s. |
| S-05 punto 1 | `/api/suggest` es de Relay (intocable). La parte de cuota por `/note` se queda en K-02. Se puede mencionar al Director si quiere desactivarla. |
| C-26 | Sin evidencia ni dato verificado (MIELI en otros idiomas); no se puede arreglar sin inventar un número. Queda como pregunta para los mentores. |
| Q-07 (detalle) | Falso que "los dos teléfonos de la demo sondean /mentor": en /relevo/demo solo hay un MentorApp montado (demo/page.tsx:126); Luis sondea /me. El fondo (carrera de escrituras) se mantiene en K-01. |
| X-15 (parte WCAG) | Cubierto por la excepción "equivalente" de 2.5.8 (existen Next/Prev). Se mantiene la parte de demo en K-38. |
| C-03 (como hallazgo propio) | No se descarta el riesgo: se absorbe en K-15 (el mismo arreglo lo cubre). |
| X-04, X-05, C-07 (gravedad original) | No son falsos positivos; se rebaja la gravedad (ver K-36, K-33, K-19). |

## Orden sugerido para los ciclos de construcción (por dueño de archivos, para no pisarse)
1. **Servidor (act/note/audio/mentor + sim.ts:762)**: K-07, K-03, K-01, K-40, K-27, y K-02 (partes T1). Puerta 33/33 + 19/19.
2. **Textos sin lógica (texts.ts, MentorApp.tsx, views.ts mentorView, MenteeApp.tsx A0)**: K-10, K-11, K-19, K-20, K-12, K-13 + K-21.
3. **kit.tsx (un solo dueño)**: K-23, K-08, y en MenteeApp K-09.
4. **Demo (demo/page.tsx, demo.ts)**: K-18, K-06, K-24, K-31, K-32, K-41 (script).
5. **Decisiones del Director en crisis**: K-04, K-16, K-15, K-17, K-05 (y K-14 opción B ya cubierta por K-10).
6. **Entrega**: K-51, K-52, K-53, K-22; si sobra, K-35 y K-34.
