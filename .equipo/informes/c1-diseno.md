# Ciclo 1 · Diseño (P11, P14, P13) — informe

Sin commits ni push. Archivos tocados: `src/app/relevo/relevo.css`, `.gitignore`, `README.md`. `globals.css` NO se tocó
(no hizo falta: todo se resolvió en relevo.css y así Relay no cambia).

## P11 · D-03 + D-04 · relevo.css en capas — HECHO, no se revierte

Cambios en `src/app/relevo/relevo.css` (`git diff -w`: +24 −4; el resto del diff es solo sangría):
- :4-6 comentario + `@layer theme, base, components, utilities;` (fija el orden aunque este archivo llegue antes que globals.css; corrección 5 de f1-planes).
- :8-230 todo el contenido anterior dentro de `@layer components { … }`, sin cambios de valores.
- :232-237 `.rv :focus-visible` FUERA de capa a propósito: el `:focus-visible` sin capa de globals.css (anillo pino) le ganaría
  dentro de la capa y todo Relevo perdería su anillo teal.
- :238-243 `.rv h1, .rv h2, .rv h3 { letter-spacing: -0.01em }` fuera de capa: el `h1-h3 { letter-spacing: -0.015em }` sin capa de
  globals.css ganaba y estrechaba los títulos (visto en la primera captura "después"; corregido y medido: h1 de /relevo = −0,6 px a 60 px = −0,01em).
- :244-248 D-04: `.rv .truncate, .rv .whitespace-nowrap { white-space: nowrap }` fuera de capa (gana a `p { text-wrap: pretty }`).

Medido con getComputedStyle (mismo navegador, antes → después):
- `truncate` en la demo: white-space `normal` → `nowrap`; cabecera de Pablo 36,25 px (2 líneas) → 18,1 px (1 línea, con "…").
  Efecto: el teléfono de Pablo ya no encoge (ahora mide lo mismo que el de Luis).
- `gap-1.5` del botón Help: 8 px → 6 px.
- "Not now" del aviso de Luis (día 47 tras el "Yes" de Pablo): `rgb(30,47,77)` = `text-rv-notice-ink` (antes salía #55635D).
- Hover de la puerta principal de /relevo: `rgb(14,107,92)` → `rgb(10,82,71)` (teal-deep), antes no cambiaba.
- Anillo de foco con Tab en /relevo: sólido, teal (sigue funcionando).

Capturas (carpeta ignorada por git): `C:\Users\<user>\Downloads\junction-pack\.claude\.playwright-mcp\c1-diseno\`
- `before-*.png` / `after-*.png`: relay-home, relevo, demo-d47 (día 47 08:30), luis, pablo, clinic, a 1440 y 390; más demo-d57crisis-1440 (hoja de ayuda).
- `after2-relevo-1440.png` (con letter-spacing corregido; sale con foco y hover en la primera puerta), `after2-relay-home-1440.png`, `after-luis-notice-1440.png`.
- Scripts reutilizables: `shots.js`, `shots-after.js`, `check.js` (mundos propios `kqd…`, pestaña propia que se cierra).

Diferencias vistas (todas esperadas, ninguna regresión):
1. Demo: cabecera de Pablo en una línea; su teléfono algo más grande (D-04). Esperada.
2. Botón Help 2 px más estrecho (gap 6 px). Esperada.
3. Hoja de ayuda de Luis (día 57 21:12): los 4 botones pasan a alineación izquierda con `px-5` y texto algo mayor, como dice su
   className. Contenido idéntico, sin cortes; "Emergency · 112" sigue relleno naranja. Esperada (avisar a Seguridad clínica: cambio solo visual).
4. Clínica en la demo (día 57): la tarjeta "Severe alerts" muestra ahora su borde rojo condicional (antes lo tapaba `.rv-card`). Esperada.
5. Relay `/`: capturas antes/después **idénticas byte a byte** a 1440 y 390.
Clínica a pantalla completa, apps de Luis y Pablo a 390 y la portada: sin diferencias visibles.

Nota: la primera tanda "antes" pilló `demo/page.tsx` a medio editar por Frontend (`useRef is not defined`); se repitió cuando compiló.
Las capturas antes/después se hicieron seguidas, pero incluyen los cambios en curso de Frontend/Backend en sus archivos.

## P14 · K-53 · .gitignore — HECHO
`.gitignore:43-45`: comentario + `.playwright-mcp/` (sin barra: cubre `.claude/.playwright-mcp/`). Comprobado:
`git check-ignore -v .claude/.playwright-mcp/c1-diseno/shots.js` → `.gitignore:45`; `git status --short` ya no lista la carpeta. No se borró nada.

## P13 · K-51 · README — BORRADOR HECHO (en inglés)
Contenido: qué es; enlace grande a la demo; el problema; los 8 pasos con números (0.87/0.758, 0.62→0.70, 88 %, 5 days, 2.45,
200 synthetic people, más 48 %/1 day/0.5 del nivel 2 con la advertencia de C-21); real vs MOCK (sensores, sin login/roles por URL,
guion, 9 nombres fijos + dictado del navegador con el texto corregido de C-16, audio sin cifrar, clínica y teléfono ficticios C-25,
lista de crisis ilustrativa C-05, Gemini con respaldo); arquitectura; cómo ejecutarlo; nota de Relay; MIT.

Afirmaciones comprobadas en el código: modelo `gemini-3.8-flash` y `GEMINI_MODEL` (ai.ts:7); Gemini solo en `draftIdeaMessage` y
`analyseNote` (T4 "frase de huella" NO existe → no se menciona); `crisis = crisisFlag || gemini.crisis` (engine.ts:578, la IA solo
añade); variables KV `KV_REST_API_URL/TOKEN` o `UPSTASH_REDIS_REST_URL/TOKEN`, memoria local sin ellas (kv.ts:5-6); 9 nombres
(pseudo.ts); 5 personas de relleno (people.ts:109-126); audio guardado en base64 sin cifrar (audio/route.ts:2); clínica y teléfono
(views.ts:106); flechas ←/→ en la demo (demo/page.tsx:113-114); cifras del cierre fijas en demo.ts (`evaluation`), por eso el README
dice que la demo las muestra y no las recalcula; Node ≥ 20.9 (engines de next).

Comandos del README verificados:
- `npm run dev` = `next dev`: es exactamente el proceso del servidor de la sesión (`next dev -p 3000`, visto en la lista de procesos);
  no se lanzó un segundo servidor para no chocar con el de :3000. `/relevo/demo` → 200.
- `node scripts/relevo-check.mjs` → 33 OK, 0 FAIL.
- `node scripts/relevo-demo-walk.mjs` (sin argumento) → 19/19; con `http://localhost:3000` → 19/19.
- `npm install`: no se ejecutó (ya hecho, según el encargo).
- URL desplegada https://junction-ackerman.vercel.app/relevo/demo → 200.

Pendientes para el Director / ciclo 3:
- **No hay archivo `LICENSE`** (el README dice MIT): falta el nombre del titular y crear el archivo (no estaba entre mis archivos).
- `.env.example` sigue diciendo "por defecto gemini-2.5-flash" (el código usa 3.8): corregir ese comentario (no era archivo mío en este ciclo).
- La portada `/relevo` dice que "transcription … are real" (K-52/C-22): contradice el README (dictado del navegador = MOCK). Es de otro carril (page.tsx).
- Revisar el README en el ciclo 3 contra lo que quede de verdad (p. ej. si cambia M6 "The clinic team is in touch", paso 6).

## Puerta
`npx tsc --noEmit -p .` → sin errores · relevo-check 33/33 · demo-walk 19/19 · capturas antes/después revisadas ·
`git diff --stat` de mis archivos: `.gitignore` +3, `README.md` 137 líneas, `relevo.css` (+24 −4 ignorando sangría).

## Arreglos tras revisión
Aplicados exactamente los obligatorios de T7 (`c1-calidad.md`), cada uno comprobado en el código actual:
1. Clínica 3a · "The phone quietly compares" → "Relevo quietly compares" (el motor corre en el servidor, no en el móvil).
2. Clínica 3a · "Only the clinic ever sees health data. Mentors only receive the voice notes sent to them." (`views.ts`).
3. RC1-10 · Día 0 = "the day after Luis's last TMS session" (`people.ts:31`) y lista de cifras de contrato comprobadas
   por `relevo-demo-walk.mjs` (0.87/0.758 l.29, 0.62 l.50, 0.70 l.63, 88 %/5/2.45/200 l.100).
4. Clínica 3b · "Can't today": no se elige idea (`sim.ts`, `chooseFor` solo si `choice === "yes"`).
5. Clínica 3c · Pablo recibe el mensaje tranquilo "You don't need to do anything else" (`MentorApp.tsx:231`).
6. Clínica 3d · Gemini analiza notas solo con el consentimiento de análisis (`note/route.ts:31`).
7. Clínica 3d · El filtro de crisis solo corre con ese consentimiento (`note/route.ts:35`, `sim.ts:596`) y no capta
   frases fuera de la lista.
8. RC1-10 + SC1-04 · Seudónimos: códigos fijos (⟨P-41⟩, `pseudo.ts`) aplicados en el navegador (`kit.tsx:283`); la API
   de notas no seudonimiza por sí misma.
9. Licencia · Creado `LICENSE` (MIT estándar, "Copyright (c) 2026 Ackerman Family (Junction 2026 team)") y README
   "MIT — see [LICENSE](LICENSE).".
Solo se han tocado `README.md` y `LICENSE` (más este informe). Sin commits.
