# C1 · Veredicto del Jefe de Calidad · ciclo 1

Fecha: 14/11/2026 · Rama `sesion-autonoma`, cambios sin confirmar (`git diff HEAD`: 16 archivos, +755 −304).
Entradas: los seis informes de revisión (`c1-rev-codigo`, `-qa`, `-seguridad`, `-clinica`, `-accesibilidad`, `-rendimiento`),
los tres de los implementadores (`c1-backend`, `c1-frontend`, `c1-diseno`) y `DECISIONES.md` (6-10).
Solo lectura: no he tocado código ni hecho commits. No he abierto `.env.local`.

Criterio: se aprueba si el cambio mejora la salud del código y de la demo aunque no sea perfecto; se rechaza si mete un
fallo, un riesgo para la demo o una regresión. Los arreglos obligatorios vuelven al implementador UNA vez; si la segunda
revisión no pasa, esa tarea se revierte (`git checkout HEAD -- <sus archivos>`) y lo demás sigue.

## Tabla de veredictos

| Tarea | Archivos | Veredicto | Obligatorio antes del commit |
|---|---|---|---|
| T1 Backend P1 | `act/route.ts`, bucle de eventos de `sim.ts` (+K-40) | **APROBADO** | nada |
| T2 Backend P2 | `note/route.ts`, `audio/route.ts`, `store.ts` | **APROBADO** | nada |
| T3 Backend P3 | `mentor/route.ts` | **APROBADO** | nada (una prueba con clave tras el deploy, ver T3) |
| T4 Frontend P4 | `kit.tsx` (`useView`) | **APROBADO CON ARREGLOS MENORES** | 1 arreglo (regresión con red lenta) |
| T5 Frontend P5+P6+K-06 | `demo/page.tsx`, `demo.ts` | **APROBADO CON ARREGLOS MENORES** | 2 arreglos (texto clínico + selector) |
| T6 Diseño P11+P14 | `relevo.css`, `.gitignore` | **APROBADO** | nada |
| T7 Diseño P13 | `README.md` (+ nuevo `LICENSE`) | **APROBADO CON ARREGLOS MENORES** | textos exactos + archivo `LICENSE` |

Ninguna tarea rechazada. Intocables verificados por Código y Clínica: `engine.ts`, `ai.ts`, `SCRIPT`, `BANDIT_SALT`, la lógica
de crisis (`crisisFlag || g.crisis`) y Relay sin cambios. Puerta en verde en todos los informes: `tsc` 0, `eslint` 0,
`relevo-check` 33/33, `relevo-demo-walk` 19/19.

---

## Hallazgos de gravedad media o superior: comprobados en el código

| ID | ¿Real? | Comprobación |
|---|---|---|
| QC1-01 / RC1-01 / PC1-03 (`useView` se congela con red lenta) | **Real y es regresión** | `kit.tsx:44` `let last = 0`, `:47` `const my = ++last`, `:58` y `:65` `my === last`. Cada sondeo (`setInterval` `:75`) y cada `relevo:changed` suben `last` aunque haya una petición en vuelo; si cada respuesta tarda más que `pollMs`, todas llegan "viejas" y se descartan, también los errores (no sale "Connection lost"). En `HEAD` se aplicaba cualquier respuesta (`git diff`: antes `if (alive) { setData(j) … }`). QA lo reprodujo con 6 s de retraso. Afecta a las 6 pantallas, incluida la apertura de la hoja de ayuda de Luis. → **Obligatorio.** |
| XC1-01 (selector "Jump to moment") | **Real** | `demo/page.tsx:152-158`: el `onChange` hace `pickMoment`, `blur()` y cierra el `<details>` en cada cambio; en Chrome/Windows una flecha sobre el select cerrado ya dispara `onChange`. Con el teclado no se puede recorrer la lista. Es un control nuevo de este ciclo. → **Obligatorio, en versión que no cambie el uso con ratón** (ver T5: quitar el cierre para todos dejaría el menú abierto tapando la clínica en la demo). |
| RC1-10 (falta `LICENSE`) | **Real** | `ls LICENSE*` no encuentra nada; `git ls-files` solo tiene licencias dentro de `.claude/`. `README.md:129-131` dice "MIT." y `CLAUDE.md:18` dice "El proyecto se publica con licencia MIT". → **Obligatorio** (T7). |
| XC1-04 (zonas `role="status"` que nacen con texto) | Real, media-baja | `demo/page.tsx:140` y `:176`. Solo afecta al anuncio por lector de pantalla en la página del presentador. → Opcional. |
| RC1-10 puntos 2-4 (afirmaciones del README) | **Reales** | `people.ts:31` `DAY0 … // día siguiente a la última sesión`; `relevo-demo-walk.mjs:100` comprueba 88 %/5/2,45/200, `:29` 0,87/0,758, `:50` 0,62, y no comprueba 48 %/1 día/0,5; `pseudo.ts:4-6` cambia nombres por códigos `⟨P-41⟩…`, no por otros nombres. → Obligatorio (texto). |
| SC1-04 (seudónimos solo en el navegador) | **Real** | `kit.tsx:283` `hideNames(n.text)` en el cliente; `note/route.ts` analiza el texto tal cual. Arreglo elegido: **cambiar el README**, no el servidor (meter `hideNames` antes de `crisisFlag` toca la ruta de crisis, DECISIONES 6). |

Descartados como bloqueo (ciertos, pero de gravedad baja o fuera de la demo): RC1-02/SC1-01 (`\s` en `AUDIO_MIME`, solo rompe
el audio del propio atacante), QC1-02 (llamada con `at:1e308`, solo con peticiones a mano; `sim.ts:677-679` empuja la llamada
antes de `dateOf`), RC1-03/PC1-01/PC1-02 (carrera de milisegundos en `/mentor`, mucho menor que la de antes), SC1-02/SC1-03/SC1-05.

---

## T1 · Backend P1 · `act/route.ts` + `sim.ts` (bucle de eventos) + K-40 — APROBADO

Mejora clara: cierra el "mundo en 500 para siempre" (Q-01), los nombres de prototipo (`Object.hasOwn`), el tamaño de `p`
(413) y la repetición de ids tras el reset. Verificado por QA (13 casos de Q-01, mundo envenenado) y Seguridad.

**Obligatorio antes del commit:** nada.

**Opcional (recomendado si se reabre el archivo; si no, al backlog):**
1. `src/lib/relevo/sim.ts:766` — `} catch {` → `} catch (err) { console.error("relevo: event", e.id, e.type, err);` (deja rastro en
   los registros de Vercel). RC1-05.
2. `src/app/api/relevo/act/route.ts:11` — limitar `at`: `(p.mode !== "schedule" || (Number.isInteger(Number(p.at)) && Number(p.at) >= 0 && Number(p.at) <= END + 30 * 1440))`
   (`END` ya está importado en `:3`). QC1-02.

**Backlog:** RC1-06 (validar `rhythm` 0-3 de pablo/marta), RC1-07 ("domain weights updated" solo si cambió algún peso,
`act/route.ts:65`), SC1-02 (rangos de umbrales de la clínica, `:54-58`), SC1-03 (tope de eventos por mundo), SC1-05 (try/catch del POST).

## T2 · Backend P2 · `note/route.ts`, `audio/route.ts`, `store.ts` — APROBADO

Cierra S-01 (XSS por el tipo del audio: `audio/webm` + `nosniff` + `CSP: sandbox`, también para audios ya guardados), los 500
por tipos raros (K-26) y recarga el mundo antes de guardar (K-01). Seguridad clínica lo aprueba: el análisis de crisis no cambia.

**Obligatorio antes del commit:** nada.

**Opcional (trivial, recomendado):**
1. `src/lib/relevo/store.ts:25` — cambiar `\s` por un espacio literal: `/^audio\/(webm|ogg|mp4|mpeg)(;[ \w=.\-]*)?$/`. RC1-02 / SC1-01.

**Backlog:** RC1-09 (repetir la comprobación de pareja con `evaluate(fresh)` tras recargar; responder 409 si ya no vale).

## T3 · Backend P3 · `mentor/route.ts` — APROBADO

El teléfono de Pablo ya no espera a Gemini (21-62 ms frente a ~2 s) y la marca `try:` acaba con los reintentos en cada sondeo.
La ventana de carrera que queda (`:28-30`) es de milisegundos y mucho menor que la anterior (guardaba un mundo leído 2 s antes).

**Obligatorio antes del commit:** nada.

**Obligatorio antes del ensayo final (no del commit):** una prueba con la clave real en el despliegue (QC1-03): tras "Yes",
el teléfono de Pablo enseña la plantilla al momento y el texto de Gemini en el sondeo siguiente; en el registro de Vercel, como
mucho 2 líneas `[relevo/ai] attempt` por tarjeta. Si `after()` no funcionara en Vercel, queda la plantilla (la demo no se rompe).

**Opcional:**
1. `src/app/api/relevo/mentor/route.ts:28-29` — tras `const mark = await loadWorld(w);` añadir
   `if (key in mark.ai || tried in mark.ai) return ok(mentorView(sim, as));` (evita el doble borrador de dos GET simultáneos). RC1-03 / PC1-01.

**Backlog / guion:** RC1-04 — en el guion de ensayo, esperar ~4 s tras el "Yes" de Pablo antes de abrir la idea (el texto de
Gemini llega un sondeo después). PC1-02 (marca en clave aparte con `SET NX`).

## T4 · Frontend P4 · `kit.tsx` (`useView`) — APROBADO CON ARREGLOS MENORES

Lo bueno se queda: una respuesta vieja ya no pisa a una nueva, y no repintar si la respuesta es igual elimina el 100 % de las
tareas largas del sondeo (Rendimiento). Pero tal como está, con red lenta (wifi del recinto, móvil del jurado, arranque en frío)
las pantallas no se pintan nunca: es una regresión frente a `HEAD` y un riesgo directo para la demo.

**Obligatorio antes del commit (1 arreglo):**
1. `src/app/relevo/kit.tsx` — aplicar la respuesta si es más nueva que la última **aplicada**, no solo si es la última **pedida**:
   - `:44` debajo de `let last = 0;` añadir `let applied = 0; // número de la última respuesta aplicada: nunca se pinta una más vieja`
   - `:58` `if (alive && my === last) {` → `if (alive && my > applied) {` y como primera línea dentro: `applied = my;`
   - `:65` `if (alive && my === last) setError(…)` → `if (alive && my > applied) setError(…)`
   Nada más (sin cambiar la forma `{ data, error, reload }`).
   Prueba de la segunda revisión: la de QC1-01 con 6 s de retraso (`page.route` + `setTimeout(6000)`): `/relevo/demo` y
   `/relevo/app?as=luis` deben pintarse; y con 0 s, 8 flechas → rápidas siguen dando 8 momentos distintos. Puerta: `tsc`,
   `eslint`, 33/33, 19/19.

**Backlog:** no lanzar un sondeo de intervalo si ya hay una petición en vuelo (ahorra peticiones; no hace falta para la demo).

## T5 · Frontend P5+P6+K-06 · `demo/page.tsx`, `demo.ts` — APROBADO CON ARREGLOS MENORES

Arregla R-06 (flechas rápidas repetían momento), el punto del día 57, la capa de explicación cerrada al empezar (teléfonos
0,81 del tamaño real a 1440×900), "Connection lost" y el aviso de consentimientos. Depende de T4 (usa `error` de `useView`):
confirmar T4 y T5 juntos.

**Obligatorio antes del commit (2 arreglos):**
1. `src/app/relevo/demo/page.tsx:177` — texto exacto pedido por Seguridad clínica (línea roja 8: ningún consentimiento es
   obligatorio). Sustituir el `<span>` por:
   ```tsx
   <span>Luis turned off {off.map((k) => CONSENT_LABEL[k]).join(" and ")}. That&apos;s his choice; the scripted story assumes all three are on.</span>
   ```
2. `src/app/relevo/demo/page.tsx:152-158` — XC1-01, sin cambiar el comportamiento con ratón:
   - junto a los otros `useRef` (hacia `:56`, **antes** del `return` temprano de `:120`): `const viaKey = useRef(false);`
   - en el `<select>`: `onKeyDown={() => { viaKey.current = true; }}` y `onPointerDown={() => { viaKey.current = false; }}`
   - en el `onChange`, justo después de `if (m) pickMoment(m);`: `if (viaKey.current) return; // con teclado el foco y el menú se quedan`
     (el `blur()` y el cierre del `<details>` siguen igual para el ratón).
   Prueba: con ratón, elegir un momento cierra el menú y → avanza; con teclado (Tab hasta el select, ↓ ↓ ↓) el foco sigue en el
   select y el menú sigue abierto.

**Opcional (recomendado):**
1. `page.tsx:177` — si `off` incluye `"notes"`, añadir al final del span: ` Without notes analysis, his notes aren't checked for crisis phrases.` (Clínica; es verdad hoy, K-15).
2. XC1-04 — dejar montados los contenedores `role="status"` y cambiar solo su contenido (`:140` y `:176`), como en el informe de Accesibilidad.
3. XC1-03 — `aria-hidden="true"` en el `<kbd>` (`:219`) y `aria-keyshortcuts="E"` en el `button role="switch"`.
4. Cerrar el menú "More" con Escape y devolver el foco a "More" (`onKeyDown` en el `<details>`).

**Backlog:** XC1-02 (forma de apagar el atajo E), XC1-05 ("Reset" de 24 px con `aria-label`), XC1-06 (`aria-current` en el
punto del día actual), XC1-07 (`blur()` solo si `pointerType === "mouse"`), RC1-08 (puntos `h-3 w-3 xl:h-4 xl:w-4` a 1024 px),
PC1-04 (enviar solo el último destino pendiente con flechas muy rápidas).

## T6 · Diseño P11+P14 · `relevo.css`, `.gitignore` — APROBADO

Las reglas no cambian (diff con `-w`: +24 −4); pasar a `@layer components` hace que las utilidades ya escritas funcionen
(cabecera de Pablo en una línea, borde de "Severe alerts", contraste mejor en botones ghost). Foco teal y contrastes sin
regresión (Accesibilidad, 33 elementos medidos); Relay idéntico byte a byte; hoja de ayuda con el mismo contenido (Clínica).
`.gitignore:43-45` cubre `.claude/.playwright-mcp/` (verificado con `git check-ignore`).

**Obligatorio antes del commit:** nada.

**Opcional:** RC1-11 — una captura de los botones "Write instead" (`px-2`, `MenteeApp.tsx:220`, `MentorApp.tsx:114`) y del
chip con `text-[14px]` para confirmar que se ven bien. Nada que cambiar si es así.

**Backlog:** número de MIELI sin cortar a 320 px (`<span className="whitespace-nowrap">09 2525 0111</span>` en `MenteeApp.tsx`,
otro carril); X-01 (hoja de ayuda sin `aria-modal` ni foco), que sigue siendo lo más importante pendiente del camino de crisis.

## T7 · Diseño P13 · `README.md` (+ `LICENSE`) — APROBADO CON ARREGLOS MENORES

Buen README: cifras con el marco correcto ("not that it predicts relapse in real patients"), lo simulado etiquetado, sin
secretos. Faltan el archivo de licencia y siete frases que hoy no son exactas (un juez técnico puede pillarlas).

**Sobre la licencia:** el README **puede quedar** diciendo MIT, pero solo si existe el archivo. Obligatorio crear `LICENSE` en
la raíz con el texto MIT estándar completo, con la línea `Copyright (c) 2026 Ackerman Family (Junction 2026 team)` (nombre del
equipo según `CLAUDE.md`; el equipo puede cambiarlo por sus nombres si lo prefiere). Y `README.md:131` `MIT.` → `MIT — see [LICENSE](LICENSE).`

**Obligatorio antes del commit (textos exactos):**
1. `README.md:6-7` (Clínica 3a) — `The phone quietly compares each person` → `Relevo quietly compares each person`.
2. `README.md:8` (Clínica 3a) — `**Only the clinic ever sees data.**` → `**Only the clinic ever sees health data.** Mentors only receive the voice notes sent to them.`
3. `README.md:27-28` (RC1-10, puntos 2 y 3) — sustituir las dos frases por:
   `Day 0 is 7 September, the day after Luis's last TMS session. The contract numbers below (0.87, 0.758, 0.62 → 0.70, 88 %, 5 days, 2.45, 200) are checked automatically by `scripts/relevo-demo-walk.mjs` against the running app.`
4. `README.md:39` (Clínica 3b) — `Pablo says "Can't today" and that is respected.` → `Pablo says "Can't today": he gets no idea for Luis that day.`
5. `README.md:42` (Clínica 3c) — `and Pablo is told the clinic is in touch.` → `and Pablo gets a calm message telling him he doesn't need to do anything else.`
6. `README.md:65-66` (Clínica 3d) — `analyses the text of new voice notes for the copilot` → `analyses the text of new voice notes for the copilot, only for people who turned on note analysis`.
7. `README.md:85-86` (Clínica 3d) — al final de la viñeta "The crisis list is a short illustrative list…" añadir:
   `The filter only runs on the notes of people who turned on note analysis, and it misses phrasings that are not on the list.`
8. `README.md:78-79` (RC1-10 punto 4 + SC1-04) — sustituir `Before note text goes to the AI, the names of people in Relevo are replaced from a fixed list of 9 names.` por:
   `Before a note leaves the app, the names of the 9 people in Relevo are replaced by fixed codes (e.g. ⟨P-41⟩). This happens in the browser, so the server API itself does not pseudonymise text sent to it directly.`

**Backlog:** `.env.example` aún dice "por defecto gemini-2.5-flash" (el código usa 3.8); la portada `/relevo` dice que la
transcripción es real (K-52/C-22), contradice el README; revisar el README de nuevo en el ciclo 3 si cambia M6 (paso 6).

---

## Qué pasa ahora

1. Frontend (T4 y T5) y Diseño (T7) hacen los arreglos obligatorios de arriba, y nada más que esos más los opcionales que
   decidan hacer de la lista. Backend (T1-T3) no tiene nada obligatorio: puede confirmarse ya.
2. Segunda y última revisión: QA repite QC1-01 (6 s y 0 s) y el selector con teclado y ratón; Clínica mira los textos de T5
   y T7; Código mira que el diff de vuelta solo toque esas líneas. Puerta: `tsc`, `eslint`, 33/33, 19/19.
3. Si alguna tarea no pasa la segunda revisión, se revierte solo esa (sus archivos a `HEAD`) y el resto se confirma.
4. Tras el deploy: la prueba con clave de Gemini de T3.
