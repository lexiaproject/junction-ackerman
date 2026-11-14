# MAPA · Relevo (Junction 2026, reto "Beyond the Clinic" de Aalto)

## Qué es
Cadena de acompañamiento entre pacientes de TMS (estimulación magnética para la depresión). A cada persona la acompaña un
mentor que terminó el tratamiento unos meses antes. El móvil detecta en silencio cambios tempranos respecto a la propia
normalidad de cada uno y, en vez de alarmas, propone contacto humano. Solo la clínica ve datos (regla de oro).
Personajes: Luis (acompañado), Pablo (su mentor), Marta (mentora de Pablo), Sara (candidata en el emparejamiento),
más 5 personas de relleno simuladas (Helmi, Eero, Sanna, Juho, Noora).

## Pila
Next.js 16.4.6 (App Router, cacheComponents) + React 19 + Tailwind v4 + TypeScript. Persistencia: Upstash Redis por REST en
producción (`src/lib/app/kv.ts`); en local, sin variables KV, memoria del servidor. IA: Gemini `gemini-3.8-flash` con
thinkingLevel "low" (`src/lib/relevo/ai.ts`), con plantilla de respaldo si no hay clave o falla. Despliegue: Vercel
(cada push a `main` despliega; en esta sesión NO se hace push). Antes de escribir código de Next.js, leer la guía en
`node_modules/next/dist/docs/` (AGENTS.md del repo).

## Rutas (alcance de la sesión: solo /relevo)
- `/relevo` entrada · `/relevo/demo` vista de demo (3 columnas + deslizador + capa "Show how Relevo decides")
- `/relevo/app?as=luis|pablo|marta` app móvil · `/relevo/clinic` web de la clínica
- API: `/api/relevo/me` (acompañado), `/mentor` (mentor), `/clinic`, `/demo`, `/act` (acciones y reloj), `/note` (notas de voz), `/audio`
- Relay (versión antigua, NO tocar): `/`, `/app`, `/clinic`, `/demo`, `/login`, `/join`, `/api/app/*`, `/api/state`, `/api/suggest`

## Estructura
- `src/lib/relevo/engine.ts` — MOTOR (INTOCABLE). Port de relevo_engine.py; da los mismos números que Python.
- `src/lib/relevo/sim.ts` — simulación determinista de la red minuto a minuto: tick diario 03:15, avisos V1-V8 (1 push/día,
  prioridades, aplazamientos), ideas por bandido, ritmo del mentor, crisis, alertas. `SCRIPT` y `BANDIT_SALT` son INTOCABLES.
- `src/lib/relevo/views.ts` — lo que ve cada rol (acompañado/mentor nunca reciben nivel, R, z ni rasgos).
- `src/lib/relevo/demo.ts` — momentos del deslizador y datos de la capa de explicación.
- `src/lib/relevo/{people,texts,pseudo,ai,store,server}.ts` — personas y datos (luis.json/pablo.json = CSV de referencia),
  textos, seudónimos, Gemini, almacenamiento por "mundo" (id en localStorage o ?w=), utilidades de API.
- `src/app/relevo/kit.tsx` — piezas comunes (useView con sondeo, iconos, avatares, onda, reproductor, grabadora, Phone, Fit).
- `src/app/relevo/MenteeApp.tsx` (A0-A5), `MentorApp.tsx` (M0-M7), `ClinicWeb.tsx` (C1-C6), `charts.tsx`, `demo/page.tsx`.
- Estilos: tokens `--color-rv-*` en `src/app/globals.css` y clases `.rv-*` en `src/app/relevo/relevo.css`.

## Comandos
- `npm install` · `npm run dev` (http://localhost:3000/relevo/demo) · `npm run build`
- `node scripts/relevo-check.mjs` — motor + lista de aceptación: 33 comprobaciones (puerta de cada commit)
- `node scripts/relevo-demo-walk.mjs [url]` — recorrido de extremo a extremo de los 8 pasos contra un servidor en marcha (19 comprobaciones)
- Servidor local de la sesión: puerto 3000, arrancado SIN clave de Gemini (GEMINI_API_KEY vacía) para no gastar cuota y
  ejercitar el texto de respaldo. No llamar a Gemini en bucle.

## Recorrido de la demo (contrato)
1. Día 0 emparejamiento: afinidad 0,87 (Pablo) frente a 0,758 (Sara).
2. Día 40 copiloto: tercera nota en bucle → sugerencia privada a Pablo; Luis no ve nada.
3. Día 47: pregunta a Pablo; "Yes" → Luis lee "Pablo would like to talk to you"; Pablo recibe el paseo (Gemini o respaldo).
4. Días 47-48: Pablo envía, Luis "I'm in", "Good" → paseo 0,62 → 0,70.
5. Días 54-55: "Can't today" respetado; V4 por llamada programada; V3 al día siguiente; llamada preparada el 31/10.
6. Día 57: frase de crisis → nivel 3 inmediato, ayuda abierta, alerta grave, Pablo M6.
7. Días 56-60: Pablo empeora → primero Marta (V1/V5), pausa propuesta (M5), "Review pace" en la clínica.
8. Cierre: 88 %, 5 días, 2,45 falsas alarmas/persona/año en 200 personas sintéticas.
Números del contrato: 0,87 · 0,758 · 0,62→0,70 · 88 % · 5 días · 2,45 · paseo 24/10 · llamada 31/10.

## Puntos frágiles conocidos
- La grabadora usa MediaRecorder + Web Speech API: solo funciona del todo en Chrome con micrófono; hay alternativa escrita.
- El `Fit` escala teléfonos y clínica a su columna; en pantallas bajas la capa de explicación quita alto.
- Las acciones del presentador se guardan con la hora del reloj de la demo; mover el reloj atrás y actuar descarta lo "futuro".
- Camino de crisis = zona de máximo cuidado (lista fija, nivel 3, ayuda, alerta, M6): solo arreglos visuales/accesibilidad.
