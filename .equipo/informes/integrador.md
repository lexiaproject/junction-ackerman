# Integrador · rama `sesion-autonoma`

## Ciclo 1

Cambios aprobados por el Jefe de Calidad y la segunda revisión (`c1-calidad.md`, `c1-rev2-qa.md`, `c1-rev2-clinica.md`), confirmados en commits separados por tarea. Sin push, sin tocar `main`.

**La puerta**, antes de cada commit:
- Árbol de trabajo completo: `node scripts/relevo-check.mjs` (33/33), `npm run build` (compila limpio, 0 avisos), `node scripts/relevo-demo-walk.mjs` contra http://localhost:3000 (19/19).
- Archivos protegidos: `git diff inicio-sesion -- src/lib/relevo/engine.ts` y `-- src/lib/relevo/ai.ts` vacíos; en `sim.ts` solo cambia el bucle de eventos de `evaluate()` (try/catch), `SCRIPT` y `BANDIT_SALT` intactos.
- Además, el árbol exacto de cada commit (HEAD + lo preparado) en una copia aparte (worktree temporal): `relevo-check` 33/33 y TypeScript (`next typegen` + `tsc --noEmit`) sin errores. Así cada commit está en verde por sí solo, no solo el estado final.

| # | Commit | Tarea | Puerta |
|---|--------|-------|--------|
| 1 | `932d733` | T1 · /act más robusto: valida los datos, limita el tamaño y un evento malo ya no rompe el mundo | 33/33 · build OK · 19/19 · commit aislado 33/33 + tsc OK |
| 2 | `1a4f9c6` | T2 · Notas de voz: el audio solo puede ser audio (cierra un XSS) y la nota no pisa cambios recientes | 33/33 · build OK · 19/19 · commit aislado 33/33 + tsc OK |
| 3 | `2889718` | T3 · App del mentor: ya no espera a Gemini y pide el borrador una sola vez por tarjeta | 33/33 · build OK · 19/19 · commit aislado 33/33 + tsc OK |
| 4 | `cf395ab` | T6 · Estilos de Relevo dentro de @layer para que Tailwind gane, e ignorar .playwright-mcp | 33/33 · build OK · 19/19 · commit aislado 33/33 + tsc OK |
| 5 | `2df40b3` | T4+T5 · Vista de demo: datos en vivo fiables y legible en el proyector | 33/33 · build OK · 19/19 · commit aislado 33/33 + tsc OK |
| 6 | `a4cf026` | T7 · README real del proyecto y licencia MIT | 33/33 · build OK · 19/19 · commit aislado 33/33 + tsc OK |
| 7 | (este) | Memoria del equipo · registro del ciclo 1 (`.equipo/`) | solo documentación; puerta repetida antes del commit |

Incidencias: ninguna. Los scripts de comprobación no se han tocado. Fuera de git quedan, como debe ser, `.env.local`, `.claude/.playwright-mcp/` y `next-env.d.ts` (ignorados). En `.equipo/informes/` solo aparecen claves falsas de ejemplo (`clave-falsa-de-prueba`, variables vacías), ninguna real.

Límite conocido: el recorrido de 19 pasos y el build se pasan sobre el árbol de trabajo completo (el servidor del puerto 3000 sirve ese estado); para los commits intermedios la garantía aislada es comprobación del motor + TypeScript, no un build ni un recorrido completos.

## Ciclo 2

Cambios aprobados por el Jefe de Calidad y la segunda revisión (`c2-calidad.md`, `c2-rev2-qa.md`, `c2-rev2-clinica.md`), confirmados en commits separados por grupo con la misma puerta del ciclo 1. Sin push, sin tocar `main`.

Archivos protegidos: `engine.ts` y `ai.ts` sin cambios respecto a `inicio-sesion`; en `sim.ts` solo el try/catch del bucle de eventos (ciclo 1) y `offerV3` (ciclo 2). `SCRIPT` y `BANDIT_SALT` intactos.

| # | Commit | Grupo | Puerta |
|---|--------|-------|--------|
| 1 | `eb68636` | B2 · traza en inglés, rótulo del plan, M0, V3 tras "Can't today", copiloto sin salud (`demo.ts`, `views.ts`, `texts.ts`, `sim.ts`) | 33/33 · build OK · 19/19 · commit aislado 33/33 + tsc OK |
| 2 | `1a6972a` | D2 · hojas como diálogos accesibles, ayuda sin doble toque, Help 44 px, contrastes (`kit.tsx`, `MenteeApp.tsx`, `relevo.css`) | 33/33 · build OK · 19/19 · commit aislado 33/33 + tsc OK |
| 3 | `87ae2ce` | F2 · trampas del presentador, copiloto en Today, M5, cierre y portada honestos, "Beyond the clinic" (`demo/page.tsx`, `MentorApp.tsx`, `ClinicWeb.tsx`, `page.tsx`) | 33/33 · build OK · 19/19 · commit aislado 33/33 + tsc OK |
| 4 | (este) | Memoria del equipo · registro del ciclo 2 (`.equipo/`) | solo documentación; puerta repetida antes del commit |

D2 y F2 compilan por separado: `kit.tsx` solo busca el atributo `data-rv-demo` con un selector de texto (`closest`), así que D2 compila sin F2. Entre D2 y F2, en la vista de demo una hoja que se abre sola podía quitar el foco al presentador; F2 añade el atributo y lo cierra.

Incidencias: ninguna. Los scripts de comprobación no se han tocado. Mismo límite que en el ciclo 1: el recorrido de 19 pasos y el build se pasan sobre el árbol de trabajo completo; para los commits intermedios la garantía aislada es comprobación del motor + TypeScript.
