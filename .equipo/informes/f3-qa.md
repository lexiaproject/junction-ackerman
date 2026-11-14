# F3 · QA de congelación · rama `sesion-autonoma`

Fecha: 2026-11-14 ~13:00 (hora local). HEAD `7a1bb6a` · referencia `inicio-sesion` = `37116e2`.
Solo lectura: sin commits, sin tocar código, sin leer `.env.local`. Servidor de desarrollo ya en marcha en http://localhost:3000 (sin clave de Gemini).

## Veredicto: VERDE. La rama está sana; nada bloquea la congelación.

## 1 · Batería de comandos

| Comando | Resultado |
|---|---|
| `node scripts/relevo-check.mjs` | **33 OK / 0 FAIL**, código de salida 0. Última línea: "Todo coincide con el motor de referencia y con la lista de aceptación" |
| `npx tsc --noEmit -p .` | sin salida, código de salida **0** |
| `npx eslint src/app/relevo src/lib/relevo src/app/api/relevo` | sin salida, código de salida **0** (0 errores, 0 avisos) |

## 2 · Recorridos de la demo

### Tres vueltas seguidas de `node scripts/relevo-demo-walk.mjs http://localhost:3000`
Cada vuelta crea su propio mundo nuevo (id aleatorio `walk…` generado por el script), así que cada una arranca limpia desde el día 0.

| Vuelta | Resultado | Salida |
|---|---|---|
| 1 | **19/19 OK**, código 0 | "Recorrido de la demo completo: los 8 pasos y los números del contrato coinciden" |
| 2 | **19/19 OK**, código 0 | ídem |
| 3 | **19/19 OK**, código 0 | ídem |

Las 19 líneas son idénticas en las tres vueltas: afinidad 0.87 / 0.758; M0 87 %; copiloto privado; V1 en dos pasos; V2 "Pablo would like to talk to you"; paseo por texto de respaldo; paseo elegido el 24/10 con 0,62; nota enviada; plan "20-minute walk"; tras "Good" paseo 0.7; "Can't today" respetado; 31/10 solo V4; idea directa del 31/10 = llamada; clínica nivel 2 con resumen por plantilla; V3 el 1/11; crisis (ayuda, M6, alerta grave); M5 pausa + V5 de Marta; "Review pace"; cierre 88 %, 5 días, 2.45, 200 personas.

### Una vuelta completa en el navegador (Playwright, contexto aislado `qa-f3`, mundo `qaf3r8n4t2w6j5`)
`/relevo/demo?w=qaf3r8n4t2w6j5`, desde "Before the demo starts" (lun 7 sep 08:00, día 0) hasta el final **solo con la flecha →** (27 pulsaciones; la capa "Show how Relevo decides" abierta con la tecla `e` en el paso 1 y dejada abierta). Los 27 momentos salieron en orden, uno por pulsación:

0 Before the demo starts → 1 Matching (día 0 08:10) → 2 Pablo accepts → 3 Welcome → 4 Baseline (día 27) → 5 Copilot (día 40) → 6 Spike → 7 Candidate → 8 Level 1 (día 47 03:15) → 9 Pablo is asked first → 10 Pablo says yes → V2 → 11 Walk as voice note → 12 "I'm in" → 13 "Good" (día 48) → 14 Level 2 (día 54) → 15 "Can't today" → 16 V4 → 17 V3 postponed → 18 V3 delivered (día 55) → 19 Clinic calls → 20 Pablo level 1 (día 56) → 21 Marta → V5 → 22 Crisis (día 57) → 23 On-call lead → 24 Clinic resolves → 25 Pablo level 2 (día 60) → 26 Marta writes → 27 What the simulation shows (día 62). Una → extra al final no mueve nada (se queda en el cierre).

Números del contrato vistos en pantalla:
- **Paso 1 (capa):** "Pablo → Luis | 0.87" y "Sara → Luis | 0.758". OK
- **Paso 4 (paseo elegido el 24/10):** en la capa "Sat 24 Oct: drew Small activity together 0.27, Walk to…" y fila "Walk together … 0.62" desde el momento 9; Luis lee "Pablo would like to talk to you" a las 08:41. En el momento 13 la cabecera dice "“Good” → walk 0.62 → 0.70" y la fila pasa a "Walk together 0.55 0.69 0.62 **0.70**". OK
- **Paso 5 (llamada el 31/10):** traza "Sat 31 Oct 09:10 · rules | No idea today for Pablo (respected). Prepared for tomorrow: Call or meet up" y "Sat 31 Oct 09:10 · bandit | Idea for Pablo about Luis: Call or meet up (context mobility, direct only)"; V4 el 31/10 10:10; V3 aplazado a las 14:30; el 1/11 Pablo ve "Call Luis or meet up for a while today". (Para leer esto volví con ← al momento 18 después de terminar la vuelta.) OK
- **Cierre:** "88% Level 1 catches", "5 days Median lead time (IQR 2–7.25 days)", "2.45 False alarms, level 1 per person per year". OK
- **Consola del navegador:** escuchando `console` (error y warning) y `pageerror` desde la carga hasta el final: **0 mensajes**.

## 3 · Archivos protegidos y app antigua

| Comprobación | Resultado |
|---|---|
| `git diff inicio-sesion -- src/lib/relevo/engine.ts src/lib/relevo/ai.ts` | **vacío** (0 líneas) |
| `git diff inicio-sesion -- src/lib/relevo/sim.ts` | 2 bloques y nada más: (a) `offerV3` usa `NOTICE_TEXT.V3_CANT` si el mentor dijo "Can't today" ese día (K-11); (b) `try/catch` en el bucle de `userEvents` que deja "(… ignored: invalid data)" en la traza (K-03). Ninguna línea `+`/`-` menciona `SCRIPT` ni `BANDIT_SALT` (la única aparición de `SCRIPT` es una línea de contexto sin cambios). OK |
| `git diff inicio-sesion --stat -- src/app/page.tsx src/app/app src/app/clinic src/app/demo src/app/api/app` | **vacío** |
| Relay antigua por HTTP | `/` 200 · `/app` 200 · `/clinic` 200 · `/demo` 200 (y `/relevo` 200, `/relevo/demo` 200) |

## Observaciones (no son fallos de Relevo)
1. **Navegador compartido entre agentes.** El servidor Playwright lo usan a la vez varios agentes y la "pestaña actual" es común: en mi primer intento (mundo `qaf3browser1`) otro agente pulsó flechas en mi pestaña y el reloj de ese mundo avanzó solo (08:41 → 09:05 → 11:20 → … en segundos, sin que yo hiciera nada); y una de mis → y una lectura cayeron en la pestaña de otro agente (contexto `redactor-demo`, mundo `docdemo7q3k9x`), al que pude mover **un momento**. Lo comprobé por la API: un mundo nuevo arranca en día 0 08:00 y el reloj solo se mueve cuando alguien lo pide. Por eso la vuelta válida la hice con un id largo y aleatorio, dirigiendo las pulsaciones a mi propia página por URL. Recomendación para el ensayo: un único navegador y un único id de mundo por presentador.
2. Al acabar, en el árbol de trabajo había `.equipo/ESTADO.md` y `.equipo/REGISTRO.md` modificados y `f3-rendimiento.md` / `f3-seguridad.md` sin seguimiento: los dejaron otros agentes, no yo. Las capturas de Playwright van a `.claude/.playwright-mcp/`, que está en `.gitignore`.
