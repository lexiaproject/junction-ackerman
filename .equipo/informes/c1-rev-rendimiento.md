# C1 · Revisión de rendimiento de los cambios del ciclo 1

Fecha: 14/11/2026 · Rama: `sesion-autonoma` (cambios sin confirmar sobre 4701299) · Autor: especialista de rendimiento.
Revisado: `kit.tsx` (`useView`), `api/relevo/mentor/route.ts` (`after()`), `lib/relevo/sim.ts` (try/catch en `evaluate`) y `relevo/demo/page.tsx`.
Todo se midió contra `next dev` en http://localhost:3000, sin Gemini (el servidor local no tiene clave: `aiDrafted:false` en el momento "Yes"), con ids `pfc1…` propios y sin `next build`.

**En una frase:** los cambios no empeoran nada, y "no repintar si no cambió" **elimina por completo** las tareas largas del sondeo en reposo.
La latencia de "Next moment" sale más alta que en la línea base, pero se debe a que el servidor de desarrollo está más cargado (otros agentes lo están usando a la vez). No es culpa del código: el recorrido por HTTP sin navegador también es ~50 % más lento ahora.

Scripts nuevos (fuera del repo): `…\scratchpad\perf\bench-eval.mjs` (evaluate de HEAD contra la copia de trabajo) y `…\scratchpad\perf\cmp.mjs` (coste de comparar texto frente a JSON).
La copia de HEAD para comparar está en `…\scratchpad\perf\head\` (sacada con `git archive`).

---

## 1. Tabla antes / después

| Medida | Antes (línea base F1 o HEAD) | Ahora | Evidencia |
|---|---|---|---|
| Tareas largas en reposo (día 60, 30 s, capa de explicación **abierta**) | 6 tareas de 64–74 ms (410 ms en total). Es el comportamiento antiguo, forzado en la misma página haciendo que cada respuesta llegue distinta | **0** (dos tandas de 30 s) | VERIFICADO (A/B en la misma pestaña) |
| Lo mismo con la capa **cerrada** (lo que se ve ahora al empezar) | 2 tareas de 54 ms | **0** | VERIFICADO |
| Sondeos que llegan idénticos al anterior (y ya no se pintan) | — | 24 de 28 y 26 de 26 (las 4 primeras distintas son la primera respuesta de cada endpoint) | VERIFICADO |
| Peticiones en reposo | ~0,9/s | ~0,9/s (26–29 en 30 s). Los comandos de Redis no cambian (~3.200/h) | VERIFICADO |
| Coste nuevo en `useView` por sondeo | — | comparar el texto: 7–9 µs con 14–17 KB; `JSON.parse` ya existía (110–122 µs). **No hay `JSON.stringify`** | VERIFICADO (Node) |
| `evaluate()` con caché, días 0/40/47/57/62 (con 30 eventos de usuario) | HEAD: 0,3–0,4 / 4,6–7,2 / 8,1–8,3 / 9,5–10,0 / 10,2–11,1 ms | 0,2–0,5 / 6,5–7,5 / 8,1 / 9,4–10,5 / 7,8–10,5 ms | VERIFICADO: igual, dentro del ruido (±20 %) |
| `evaluate()` sin caché | HEAD: 29–43 ms | 30–45 ms | VERIFICADO: igual |
| GET `/mentor` en el momento "Yes" (día 47, con tarjeta), 10 seguidos | F1: lo esperaba a Gemini (~2 s con clave, INFERIDO) | **21–62 ms, mediana ~38 ms**, igual que `/me` (22–204 ms) | VERIFICADO sin clave · INFERIDO con clave (el código ya no espera) |
| `saveWorld` por sondeo de `/mentor` | 0, o 1 tras cada Gemini con éxito (y reintento en cada sondeo si fallaba) | **0 en régimen normal**. Solo 1 en el *primer* GET que ve una tarjeta nueva (la marca `try:`) + 1 en `after()` si Gemini responde. Sin clave: 0 siempre | VERIFICADO (lectura del código, líneas 27-30 y 34-40) |
| "Next moment" → 3 paneles cambiados (12 clics, desde que sale el POST) | ~220 ms (F1, dev) | **mediana ~293 ms** (247–509). Desglose: `/act` 44 ms · 4 GET 161 ms · pintar 74 ms | VERIFICADO |
| Lo mismo medido desde el `click()` de Playwright | — | mediana ~420 ms. Incluye ~90–150 ms de espera de Playwright antes de que salga el POST | VERIFICADO |
| Hueco entre el fin de `/act` y el inicio de los 4 GET (la cadena nueva de `setClock`) | — | 2–3 ms | VERIFICADO: la cadena no añade espera |
| Recorrido HTTP de los 27 momentos (`walk-http.mjs`, sin navegador) | total mediana ~240 ms | **363 ms** (act 91, GET ~200) | VERIFICADO: el servidor está más lento por la carga y no por estos cambios |
| GET sueltos en serie (`/me`) | 40–80 ms | 44–138 ms | VERIFICADO: misma conclusión |
| 8 flechas → pulsadas cada ~110 ms | F1 (R-06): un segundo clic rápido repetía el mismo momento | 8 momentos distintos, uno tras otro (la cabecera cambia cada ~200 ms) y la última actualización llega ~1 s después de soltar | VERIFICADO: R-06 arreglado |

Por qué digo que los +70 ms de "Next moment" no son de los cambios: en el navegador, la parte de servidor (act + GET ≈ 205 ms) ha subido lo mismo que en el recorrido HTTP sin navegador (240 → 363 ms). En el lado del cliente, `setClock` encadena sin hueco (2–3 ms) y pintar tras la última respuesta cuesta ~74 ms en dev, en línea con la tarea larga de 50–66 ms que ya vimos en F1. Durante la medida había al menos 9 pestañas de otros agentes abiertas contra el mismo servidor y sondeando. **INFERIDO** (no pude medir HEAD en el navegador sin levantar un segundo servidor, y no quería tocar el repo).

---

## 2. Veredicto por cambio

| Cambio | Veredicto | Motivo |
|---|---|---|
| `useView`: contador de petición (R-03) + "no repintar si no cambió" (R-04) | **Aprobado** (arreglo menor opcional: PC1-03) | Descarta bien las respuestas viejas (solo aplica la última pedida, y los errores viejos tampoco pisan). Elimina el 100 % de las tareas largas del sondeo en reposo. El coste nuevo son µs. |
| `/mentor` con `after()` (R-01) | **Aprobado con arreglos menores** (PC1-01, PC1-02) | La respuesta ya no depende de Gemini y la marca `try:` quita los reintentos en bucle. Queda una ventana pequeña de doble llamada y una lectura+escritura del mundo entero dentro del GET, una vez por tarjeta. |
| try/catch por evento en `evaluate()` (K-03) | **Aprobado** | Coste no medible (dentro del ruido en todos los días, con y sin caché). |
| Vista de demo (cadena de `setClock`, `target`, selector de momento, puntos por día, capa cerrada al empezar) | **Aprobado** (nota PC1-04) | Sin espera añadida. Arregla R-06. Con la capa cerrada se pinta menos (2 tareas de 54 ms frente a 6 de ~70 ms con el comportamiento antiguo). |

---

## 3. Hallazgos

PC1-01 · Dos GET `/mentor` a la vez pueden pedir dos borradores a Gemini
Gravedad: baja     Evidencia: INFERIDO (sin clave en local no se puede provocar)
Dónde: src/app/api/relevo/mentor/route.ts:27-30
Qué pasa: la comprobación `!(tried in world.ai)` usa el mundo leído al principio. Si la ráfaga tras "Yes" y un sondeo de 4 s llegan casi a la vez (en F1 vi 4 solapes en 12 clics), o el doble montaje del modo estricto de React en dev, los dos ven "sin marca", los dos escriben la marca y los dos lanzan Gemini. Como máximo serían 2 llamadas por tarjeta (antes podían ser ilimitadas), y gana el último borrador que se guarde.
Arreglo: aceptable tal cual para la demo. Si se quiere cerrar: guardar la marca en una clave propia con `SET … NX` (por ejemplo `relevo:ai:${w}:${tried}`) y lanzar Gemini solo si el `NX` tuvo éxito.

PC1-02 · La marca de intento lee y reescribe el mundo entero dentro del GET
Gravedad: baja     Evidencia: VERIFICADO (código) / INFERIDO (coste en producción)
Dónde: src/app/api/relevo/mentor/route.ts:28-30
Qué pasa: el primer GET que ve una tarjeta nueva hace `loadWorld` + `saveWorld` antes de responder. Son 2 viajes a Redis más (estimado +20–60 ms en producción) solo en esa respuesta, una vez por tarjeta (unas 2–3 veces en toda la demo). Además abre la misma ventana de "pisar lo guardado" que R-08, aunque de milisegundos: si un `/act` cae entre esa lectura y esa escritura, el `/act` se pierde.
Arreglo: el mismo que PC1-01 (una clave aparte para la marca, sin reescribir el mundo). Así desaparecen el coste y la ventana.

PC1-03 · "Solo la última petición" podría dejar sin aplicar respuestas válidas si se piden más rápido de lo que llegan
Gravedad: baja     Evidencia: INFERIDO (en la prueba de 8 flechas no pasó: la cabecera cambió 8 veces)
Dónde: src/app/relevo/kit.tsx:48 y 59 (`my === last`)
Qué pasa: si llegan cargas nuevas (ráfaga + sondeo) más a menudo de lo que tarda cada respuesta (posible en producción con ~300 ms por GET y flechas rápidas), cada respuesta queda "vieja" al llegar y el panel no cambia hasta que se para.
Arreglo (1 línea): guardar la última respuesta *aplicada* (`applied`) y aplicar si `my > applied`, en lugar de exigir `my === last`. Sigue sin dejar que una respuesta vieja pise a una más nueva. Opcional: comparar el texto antes de `JSON.parse` para ahorrar ~0,1 ms por sondeo (despreciable).

PC1-04 · Las flechas rápidas recorren todos los momentos intermedios, uno por viaje
Gravedad: informativa     Evidencia: VERIFICADO (local: 8 pulsaciones en 0,9 s → el último panel llega a los 1,9 s)
Dónde: src/app/relevo/demo/page.tsx (`setClock`, la cadena `chain`)
Qué pasa: cada pulsación espera a la anterior. En producción (~300 ms por `/act`), 8 pulsaciones seguidas tardarían ~2,5–3 s en llegar al destino, enseñando cada momento por el camino. Para saltar lejos ya existe "Jump to moment".
Arreglo (solo si molesta en el ensayo): si hay un `/act` esperando en la cadena, sustituir su `to` por el nuevo en vez de añadir otro (enviar solo el último destino pendiente).

Sin hallazgos en: try/catch de `evaluate()`, coste de comparar el texto, el hueco de la cadena de `setClock`, ni escrituras de `/mentor` en los sondeos normales.

---

## 4. Lo que NO pude comprobar
- `/mentor` y `after()` **con** clave de Gemini (el servidor local no tiene clave y no debía llamar a Gemini). Que `after()` se ejecute bien en Vercel y que el borrador aparezca en el sondeo siguiente queda para una prueba en producción.
- La latencia de "Next moment" del código de HEAD en el navegador con la carga de servidor de hoy (habría hecho falta un segundo servidor). Lo comparo con la línea base de F1 y con el recorrido HTTP.
- Producción: no hice ninguna petición.
- Incidencia: el navegador de Playwright lo comparten varios agentes. Una vez navegué por error en la pestaña del contexto `a11yc1rev` (a `?w=pfc1x7k2m9q4`) y otro agente reutilizó la pestaña `perfc1`. Las medidas válidas se hicieron en contextos propios creados y cerrados dentro de cada script.
