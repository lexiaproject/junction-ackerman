# C3 · Revisión de código y QA (fase de congelación)

Revisor independiente: no he leído los informes de los autores. Solo lectura; sin commits.
Alcance: `git diff HEAD` → `src/app/relevo/demo/page.tsx` (+15/−6), `src/app/relevo/kit.tsx` (1 línea), `README.md` (+3/−2).
Aviso: también aparece modificado `.equipo/REGISTRO.md` (memoria del equipo, no código) y sin seguimiento `.equipo/INFORME-FINAL.md`; no afectan a la app.

## Comprobaciones automáticas

| Comprobación | Resultado |
|---|---|
| `node scripts/relevo-check.mjs` | 33/33 OK |
| `node scripts/relevo-demo-walk.mjs` | 19/19 OK ("los 8 pasos y los números del contrato coinciden") |
| `npx tsc --noEmit -p .` | sin errores |
| `npx eslint src/app/relevo` | sin errores ni avisos |
| `git diff inicio-sesion -- src/lib/relevo/engine.ts src/lib/relevo/ai.ts` | vacío (0 líneas) |
| Consola del navegador durante los dos recorridos | sin errores ni avisos de React (solo el 400 que provoqué a propósito, ver cambio 3) |

## Cambio 1 · La capa se abre sola en el emparejamiento (día 0) y el cierre (día 62) — **APROBADO**

Código (`demo/page.tsx` ~l.123-130): un estado `seen = {t, g}` guarda el último reloj visto y si estaba en un grupo `match`/`close`.
Se llama a `setExplain(true)` solo si el reloj **avanzó** (`clock.t > seen.t`), el momento actual es `match` o `close`, y el anterior **no** era del mismo grupo.
Es el patrón de React "ajustar estado durante el render" (mismo componente, con guarda `seen.t !== clock.t`), así que no hay bucle: el sondeo cada 5 s devuelve el mismo `t` y no vuelve a entrar.

Evidencia en Playwright (contexto propio `c3rev`, mundo `c3rv8k41q`, 1600x900):
- **Solo con →** desde "Before the demo starts" (día 0 08:00): paso 1 (08:10 "Matching") → capa abierta, se ven **0.87** y **0.758**. Pulso **E** → se cierra. Pasos 2 y 3 (intro, welcome, mismo grupo `match`) → sigue cerrada. Pasos 4-26 → cerrada. Paso 27 (día 62 12:00) → se abre sola con **88 %**, **5 days** y **2.45**. Tras 6 s de sondeo sigue abierta; pulso E → se cierra y tras otros 6 s **sigue cerrada** (no se reabre en bucle).
- **Con ratón en "Next moment"** (tras "More → Go back to day 0"): mismo resultado (abre en 08:10, E la cierra, no reaparece hasta el día 62, donde se abre con 88 %/2.45). En el último momento el botón queda deshabilitado, correcto.
- ← desde el día 62 y otra vez → : se vuelve a abrir. Es coherente con "al llegar avanzando"; el presentador la cierra con E si quiere.
- Retroceder nunca la abre; recargar la página en un momento `match`/`close` tampoco (en la primera carga `seen` es null). Ambos comportamientos son razonables.
- **Foco y teclado:** tras cada paso el foco queda en `BODY`; abrir la capa no roba el foco. **Día 57 (crisis):** la hoja de ayuda aparece (`role="dialog"` presente) en los pasos 22-23, pero el foco sigue en `BODY` y → sigue avanzando con normalidad: la hoja no roba el foco en la demo.

Observación previa (no introducida por este cambio): al pulsar "Next moment" el botón se deshabilita mientras `busy` y el foco cae a `BODY`; un usuario de teclado que use Tab+Enter tendría que volver a tabular. No es regresión; no lo tocaría en congelación.

## Cambio 2 · Encabezados de la capa sin números — **APROBADO**

Los 7 encabezados `<H>` de `Explain` ya no llevan "1 ·"…"8 ·" (match, baseline, detect/high/crisis, solution, mentor, close; el de copilot ya no tenía número). `grep` no encuentra ningún otro "N ·" de encabezado. Solo cambia texto.

## Cambio 3 · `Recorder` compacto ya no se come el ancho del texto — **APROBADO** (con una observación menor no bloqueante)

Código (`kit.tsx` l.512): el contenedor pasa a `w-auto shrink-0` solo si `compact && state !== "review"`; en el resto sigue `w-full`.

Evidencia a 390x844:
- **Luis, conversación con Pablo:** botón 56 px, contenedor 56 px, texto "Hold to talk to Pablo. No need to reply." en **2 líneas** (232 px de ancho, 38 px de alto). Sin scroll horizontal (`scrollWidth` 390).
- **Pablo, pestaña Conversation:** botón 56 px, "Hold to talk to Luis" en **1 línea**. Sin scroll horizontal.
- **Inicio de Luis (botón grande):** sin cambios: botón 88x88, contenedor `w-full` (358 px), "Hold to talk to Pablo" en 1 línea.
- Estado "review" (sin reconocimiento de voz): sigue `w-full`, el cuadro de texto se ve como antes.
- Estado "Sending in 4 s Undo": contenedor 115 px, texto de ayuda 173 px; bien.

Observación menor: si el servidor devuelve un error **largo** (lo provoqué interceptando la petición con un 400 y un mensaje de 57 caracteres), el contenedor `shrink-0` crece hasta 312 px y el texto de ayuda se queda en 29 px (una palabra por línea). No hay desbordamiento horizontal y en la app real solo pasaría con errores de servidor que la interfaz no provoca (el mensaje por defecto "Couldn't send" es corto; sin red la nota se pone en cola, no da error). Si se quiere blindar: añadir `max-w-[9rem]` al `<p>` de estado compacto. No lo considero necesario en congelación.

## Cambio 4 · README: pausa para Pablo y 27 momentos en 8 pasos — **APROBADO**

- **"27 moments"**: `MOMENTS` en `src/lib/relevo/demo.ts` tiene exactamente 27 entradas (l.10-36), y el recorrido en el navegador hizo 27 avances antes de deshabilitar "Next moment". Correcto.
- **"grouped into the 8 steps below"**: los 27 momentos usan 10 grupos internos y dos momentos (día 27 "baseline" y día 43 "spike") no se nombran en ningún paso del README; la frase es una aproximación aceptable para un lector, no una falsedad.
- **"Pablo is offered a pause"**: en `src/lib/relevo/sim.ts` `mentorRules` (l.422-438) la pausa (`M5_pause`, "A few days for you") se propone al subir a nivel ≥2, y el ritmo más ligero (`V6_M5`) solo cuando `l1Run === 5 && level < 2`. Pablo entra en nivel 1 el día 56 y en nivel 2 el día 60: lleva 4 días (56-59) en nivel 1, así que nunca llega a 5 y va directo a la pausa. La nota entre paréntesis del README es exacta. En el navegador, Pablo el día 62 ve la hoja "A few days for you" con "OK, a pause"; y `relevo-demo-walk` confirma "M5 variante pausa".

## Veredicto global

| Cambio | Veredicto |
|---|---|
| 1 · Capa automática en día 0 y día 62 | **APROBADO** |
| 2 · Encabezados sin números | **APROBADO** |
| 3 · Recorder compacto | **APROBADO** (observación menor opcional: limitar ancho del mensaje de error compacto) |
| 4 · README | **APROBADO** |

Sin regresiones encontradas en foco, teclado (→, ←, E) ni en la hoja de crisis del día 57. Motor e IA intactos.
