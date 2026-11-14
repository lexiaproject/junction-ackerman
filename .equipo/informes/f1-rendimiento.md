# F1 · Rendimiento de Relevo (diagnóstico, solo lectura)

Fecha: 14/11/2026 · Rama: `sesion-autonoma` (commit 4701299) · Autor: especialista de rendimiento.

**En una frase:** la web carga rápido y no se mueve (LCP 0,7–0,9 s, CLS 0 en producción) y el motor apenas cuesta (2–4 ms).
Lo que se nota delante del jurado es **la espera entre pulsar un botón y ver los tres paneles cambiar**. En producción son unos
0,5–0,7 s, porque se hacen dos viajes de red seguidos (primero guardar, luego 4 lecturas) a un servidor en EE. UU.
El riesgo más serio está en el momento "Yes": el panel de Pablo espera a Gemini y, mientras tanto, puede pisar lo que se haya guardado entretanto.

Scripts de medida (no forman parte del repo):
`C:\Users\<user>\AppData\Local\Temp\claude\545cfc39a490963b\202f2361-f25d-42b2-bb0f-e0ad8f1417d8\scratchpad\perf\`
(`bench-sim.mjs` mide el motor en Node, `walk-http.mjs` recorre los 27 momentos por HTTP y `prod-get.sh` hace GET de solo lectura a producción).
Las medidas en el navegador se hicieron con Playwright, en un contexto propio y con una ventana de 1440×900.

---

## 1. Medidas de línea base

> Importante: el servidor local está en **modo desarrollo** (`next dev`), que es entre 2 y 4 veces más lento por petición que
> producción y además hace cada petición dos veces al cargar (por el modo estricto de React). Producción va en Vercel con
> Upstash Redis. Allí solo hice GET con ids aleatorios propios, así que **no medí `/act` (POST) en producción**: esa cifra es una estimación.

### 1.1 Motor (`evaluate()` en Node, sin red)
| Reloj | evaluate en frío | evaluate con caché (mediana) | Vistas (me / mentor / clinic / demo) |
|---|---|---|---|
| día 0 | 22 ms (incluye la compilación JIT de arranque) | 0,1 ms | <0,4 ms todas |
| día 40 | 6,1 ms | 2,3 ms | <0,3 ms |
| día 47 | 4,9 ms | 2,6 ms | <0,5 ms |
| día 57 | 7,0 ms | 3,2 ms | <0,8 ms (ficha de Luis 0,7 ms) |
| día 62 | 3,9 ms | 4,1 ms | <0,8 ms |
| día 62, caché del motor fallando (config nueva) | 16–48 ms | — | — |

Cada pulsación de "Next moment" o "Yes" provoca **4 `evaluate()`** (una por cada GET: demo, me, mentor y clinic). `/act` no evalúa.
En total son unos 10–16 ms de CPU por acción, una cifra despreciable.

### 1.2 Tamaño de las respuestas (JSON sin comprimir; en producción van con Brotli)
| Endpoint | día 0 | día 47 | día 62 | Producción (día 0, comprimido) |
|---|---|---|---|---|
| `/demo` | 6,4 KB | 11,8 KB | 14,0 KB | 1,8 KB |
| `/me` | 2,8 KB | 6,8 KB | 6,3 KB | 0,7 KB |
| `/mentor` | 2,2 KB | 4,4 KB | 4,5 KB | 0,8 KB |
| `/clinic` | 4,8 KB | 5,0 KB | 7,3 KB | 1,3 KB |
| `/clinic?person=luis` | — | — | 16,6 KB (la ficha pesa 9,7 KB) | no medido |

### 1.3 Endpoints por HTTP
| Medida | Local (dev) | Producción |
|---|---|---|
| `/act` (cambio de reloj) | mediana 35–72 ms (picos sueltos de hasta 0,8 s del modo dev) | **no medido** (es POST); estimado 250–350 ms |
| GET sueltos (curl, conexión nueva) | 40–80 ms en serie | 200–470 ms (mediana ~290 ms) |
| GET en el navegador (conexión reutilizada) | 90–110 ms | 170–345 ms |
| 4 GET en paralelo (lo que pasa tras cada acción) | 240 ms (en serie 325–525 ms) | 450–700 ms con curl |
| Primera petición a una función dormida (arranque en frío) | — | 1,13 s (VERIFICADO una vez) |
| Región de las funciones | — | **iad1 (Washington, EE. UU.)**, con entrada por arn1 (Estocolmo): `X-Vercel-Id: arn1::iad1::…` |
| HTML de `/relevo/demo` (estático, desde la caché de Vercel) | 112 ms | 77–215 ms (`X-Vercel-Cache: HIT`) |

### 1.4 Navegador (`/relevo/demo`, 1440×900)
| Medida | Local (dev) | Producción |
|---|---|---|
| LCP (≤ 2,5 s) | 0,66–0,82 s | **0,73–0,94 s** ✔ |
| CLS (≤ 0,1) | 0,00002 | **0** ✔ |
| INP aproximado (≤ 200 ms), duración del clic en "Next moment" | 16–104 ms (12 clics) | no medido (el clic hace un POST) |
| De pulsar "Next moment" a ver los 3 paneles cambiados | **mediana ~220 ms** (cabecera y móviles 203–265 ms; clínica unos 45 ms después) | estimado **0,5–0,7 s** (act + 4 GET) |
| Cascada de la carga inicial | /demo y, solo cuando responde, me/mentor/clinic | /demo termina a 634–823 ms y los otros 3 a 1050–1087 ms |
| JS descargado | — | 181 KB por la red (582 KB ya descomprimidos), 10 archivos. El código propio de Relevo es ~26 KB comprimido y el resto es React/Next |
| CSS | — | 14 KB |
| Fuentes | — | 3 woff2 precargadas (48 + 46 + 22 KB) |
| Peticiones en reposo (pestaña visible) | 18 en 20 s (unas 0,9 por segundo) | lo mismo, por código |
| Tareas largas en reposo (día 60) | una de 60–86 ms cada ~5 s | no medido |

---

## 2. Hallazgos (de mayor a menor importancia)

R-01 · El panel de Pablo espera a Gemini en el momento "Yes" y puede borrar lo que se guardó mientras tanto
Gravedad: alta     Evidencia: INFERIDO (no podía llamar a Gemini; lo deduzco del código)
Dónde: src/app/api/relevo/mentor/route.ts:19-29 · src/lib/relevo/ai.ts:9 (timeout de 10 s)
Qué pasa y a quién afecta: el GET `/mentor` pide a Gemini el borrador de la idea **dentro de la propia lectura**, y lo pide
cuando aparece la tarjeta (el momento "Yes", día 47). Durante ~2 s (lo que tarda Gemini según el commit 37116e2) el móvil de Pablo
sigue mostrando lo de antes, mientras Luis y la clínica ya han cambiado. Hay tres riesgos más:
(a) `world` se leyó antes de llamar a Gemini y se guarda entero después (línea 26). Si en esos ~2 s alguien pulsa algo
(por ejemplo, "Next moment" o el "I'm in" de Luis), ese cambio se pierde.
(b) Mientras no haya borrador guardado, cada sondeo de 4 s y cada ráfaga vuelven a llamar a Gemini, así que puede haber llamadas repetidas.
(c) Si Gemini falla, devuelve `null`, no se guarda nada y **se reintenta en cada sondeo**, con esperas de hasta 10 s si hay timeout.
Así el panel de Pablo puede quedarse congelado durante la demo y se gasta cuota.
Criterio del jurado afectado: que la demo funcione en directo y se vea fluida; también la credibilidad de "Pablo recibe el paseo".
Arreglo propuesto (concreto): 1) Responder enseguida con `mentorView(sim)`, que ya usa la plantilla de respaldo, y lanzar el borrador en
segundo plano con `after()` de `next/server`. En el sondeo siguiente (≤4 s) aparecerá el texto de Gemini. 2) Al guardar, volver a
leer el mundo (`loadWorld`) y escribir solo `ai[key]`. 3) Guardar también el fallo (`ai[key] = ""` o una marca "pending/failed")
para no reintentar en bucle. Esperado: Pablo cambia a la vez que los otros dos paneles (~0,5–0,7 s en vez de ~2,5 s) y desaparecen
la pérdida de cambios y las llamadas repetidas.
Esfuerzo: M     Riesgo de romper algo: medio (es el paso 3 del contrato; probar con y sin clave)

R-02 · Dos viajes de red seguidos por acción, con funciones en EE. UU.
Gravedad: media     Evidencia: VERIFICADO (local: secuencia y tiempos; producción: región iad1 y GET de 170–345 ms) / INFERIDO (cifra total en producción)
Dónde: src/app/relevo/kit.tsx:28-34 (`act` y después `changed()`) y kit.tsx:37-71 (`useView`); demo/page.tsx:43-51
Qué pasa y a quién afecta: cada pulsación hace POST `/act` (lee y guarda en Redis), **espera** la respuesta y solo entonces lanza
4 GET (cada uno lee Redis y evalúa). En local son ~220 ms de punta a punta. En producción cada viaje cuesta 170–345 ms porque la
función vive en Washington (`arn1::iad1`), así que la acción tarda unos **0,5–0,7 s**, y más con la wifi del recinto. Es la
latencia que ve el jurado en cada "Next moment" y en cada "Yes".
Criterio del jurado afectado: fluidez de la demo en directo.
Arreglo propuesto (concreto), de más barato a más caro:
(a) **Región** (S, riesgo bajo). Mirar en el panel de Upstash en qué región está la base de datos. Si está en Europa, fijar la región de
las funciones en Vercel (Settings → Functions → Region, o `vercel.json` con `"regions": ["fra1"]` o `["arn1"]`). Se espera ahorrar
~100–150 ms por viaje, es decir, unos 0,2–0,3 s por acción. **Si Upstash está en us-east-1, no tocar nada**: alejar la función de la
base de datos empeora `/act`, que hace 2 llamadas a Redis.
(b) **Un solo viaje** (M–L, riesgo medio). Que `/act` devuelva ya las cuatro vistas (evaluar una vez y llamar a `demoView`,
`menteeView`, `mentorView` y la vista de la clínica). `act()` las reparte a cada `useView` mediante un evento con datos, en vez de
pedir 4 GET. Se espera bajar de ~0,5–0,7 s a ~0,25–0,35 s en producción y pasar de 4 `evaluate` a 1. Antes hay que hacer R-01,
porque la vista del mentor no puede esperar a Gemini dentro de `/act`.
Esfuerzo: S (a) / M–L (b)     Riesgo de romper algo: bajo (a) / medio (b)

R-03 · Una respuesta vieja puede llegar tarde y pisar a la nueva (el panel "salta atrás")
Gravedad: media     Evidencia: INFERIDO (en local vi sondeos que se solapan con la ráfaga; no vi que llegaran desordenadas)
Dónde: src/app/relevo/kit.tsx:44-63
Qué pasa y a quién afecta: `useView` aplica **cualquier** respuesta que llega, en el orden en que llega, no en el orden en que se pidió.
El sondeo de 4–5 s sigue corriendo aparte de la ráfaga. En 12 clics locales vi 4 veces peticiones de sondeo solapadas con la
ráfaga, por ejemplo `me 151-254 ms` justo después de `me 62-154 ms`. En producción, si un sondeo empezado *antes* de guardar llega
*después* de la respuesta de la ráfaga (porque cae en otra instancia o en una que arranca en frío), el panel vuelve un momento al
estado anterior hasta el siguiente sondeo.
Criterio del jurado afectado: demo en directo (un parpadeo raro o un "no ha cambiado" delante del jurado).
Arreglo propuesto (concreto): poner un contador por petición en `useView` (`const n = ++seq`) y aplicar los datos solo si `n` es el último.
Al lanzar una carga por `relevo:changed`, reiniciar el temporizador de sondeo para no duplicar peticiones.
Esfuerzo: S     Riesgo de romper algo: bajo

R-04 · Cada sondeo vuelve a dibujar toda la demo aunque no haya cambiado nada
Gravedad: baja     Evidencia: VERIFICADO (en dev)
Dónde: src/app/relevo/demo/page.tsx:41 (el sondeo de `/demo` cada 5 s vuelve a dibujar la página entera, con los 3 paneles dentro) · kit.tsx:49
Qué pasa y a quién afecta: en reposo hay una tarea larga de **60–86 ms cada ~5 s** (en dev; en producción será 2–3 veces menos). Coinciden el
sondeo de `/demo` y el de `/clinic`, los dos de 5 s, y como `setData` recibe siempre un objeto nuevo React vuelve a dibujarlo todo.
Si el presentador pulsa justo en ese momento, la respuesta tarda hasta esos ms más. El INP medido (16–104 ms) sigue por debajo de 200 ms.
Además son ~0,9 peticiones por segundo, unos **3.200 comandos de Redis por hora** con la pestaña visible (por cálculo). Conviene
comprobar el límite del plan de Upstash si se deja la demo abierta horas en un portátil.
Criterio del jurado afectado: fluidez (poco) y coste o cuota.
Arreglo propuesto (concreto): en `useView`, guardar el texto de la última respuesta y no llamar a `setData` si es idéntico (comparar
`await r.text()` antes de `JSON.parse`). Así la mayoría de sondeos no vuelven a dibujar nada. Opcional: subir el sondeo de `/demo` a 8 s,
porque las acciones ya disparan la ráfaga. No quitar el sondeo del todo, porque mantiene calientes las funciones de Vercel (ver R-07).
Esfuerzo: S     Riesgo de romper algo: bajo

R-05 · La carga inicial va en cascada: los paneles no piden datos hasta que llega `/demo`
Gravedad: baja     Evidencia: VERIFICADO
Dónde: src/app/relevo/demo/page.tsx:71 (`if (!w || !data) return …Loading the demo…`)
Qué pasa y a quién afecta: hasta que responde `/demo` no se montan MenteeApp, MentorApp ni ClinicWeb, y por eso sus GET empiezan tarde.
En producción `/demo` termina a 634–823 ms y los otros tres a 1050–1087 ms: son ~0,35 s de espera extra al abrir la demo. Solo pasa al
cargar la página (normalmente antes de empezar a presentar).
Criterio del jurado afectado: primera impresión, si se abre la demo en directo.
Arreglo propuesto (concreto): montar las tres columnas en cuanto exista `w`, aunque `data` aún sea `null`, y mostrar la cabecera con
"Loading…" en lugar de bloquear toda la página. Esperado: los 4 GET en paralelo y la carga completa ~0,3 s antes (de ~1,05 s a ~0,7 s).
Esfuerzo: S     Riesgo de romper algo: bajo (vigilar que `Timeline` y `next` no se usen sin `data`)

R-06 · El botón vuelve a estar activo antes de que lleguen los datos nuevos
Gravedad: baja     Evidencia: INFERIDO
Dónde: src/app/relevo/demo/page.tsx:43-51 (`setBusy(false)` tras `act`, pero `next()` calcula con el `data.clock` antiguo)
Qué pasa y a quién afecta: en producción, durante los ~0,3 s entre la respuesta de `/act` y la llegada de `/demo`, "Next moment" ya está activo.
Un segundo clic (o la flecha →) calcula el siguiente momento desde el reloj viejo y vuelve al mismo momento. El presentador nota que "el clic no hizo nada".
Criterio del jurado afectado: demo en directo.
Arreglo propuesto (concreto): guardar en un `useRef` el último `to` enviado y calcular `next`/`prev` desde ahí (o desde `data.clock.t`,
el que sea mayor). Opcional: escribir enseguida la fecha y la hora del momento elegido en la cabecera para que se note que se ha pulsado.
Esfuerzo: S     Riesgo de romper algo: bajo

R-07 · Arranque en frío de Vercel en el primer clic
Gravedad: baja     Evidencia: VERIFICADO (1,13 s en la primera petición a un endpoint frío; las siguientes, 0,22–0,37 s)
Dónde: producción (pasos: dejar la web sin uso unos minutos y abrir `/relevo/demo`)
Qué pasa y a quién afecta: si nadie ha usado la web en un rato, la primera acción puede tardar ~1 s más.
Criterio del jurado afectado: primera interacción de la demo.
Arreglo propuesto (concreto): sin código. Añadir a la lista del día de la demo: "abrir `/relevo/demo` 1–2 minutos antes de presentar y dejarla
visible". El propio sondeo mantiene calientes las funciones.
Esfuerzo: S     Riesgo de romper algo: bajo

R-08 · Abrir una ficha en la clínica escribe en Redis desde un GET
Gravedad: baja     Evidencia: VERIFICADO (lectura del código; en local `/clinic?person=luis` tarda 40–150 ms) / INFERIDO (la carrera)
Dónde: src/app/api/relevo/clinic/route.ts:14-21
Qué pasa y a quién afecta: con una ficha abierta, el primer GET de `/clinic` tras cada cambio de reloj lee el mundo, añade la línea de
auditoría y **guarda el mundo entero**. Eso añade una llamada a Redis (~+100 ms en producción) y abre la misma ventana de pérdida de
cambios que R-01, aunque mucho más corta (ms en lugar de segundos). Solo pasa si el presentador pulsa otra cosa durante esa ráfaga.
Criterio del jurado afectado: robustez de la demo.
Arreglo propuesto (concreto): ninguno urgente. Si se hace R-02(b), apuntar la consulta de la ficha dentro de `/act` o con una escritura
aparte. Como mínimo, volver a leer el mundo justo antes de guardar.
Esfuerzo: S     Riesgo de romper algo: bajo

R-09 · Se precarga una fuente que /relevo no usa
Gravedad: baja     Evidencia: INFERIDO (es seguro que se precargan 3 woff2; que una sobra lo deduzco del CSS)
Dónde: src/app/layout.tsx:6 (Schibsted Grotesk, de Relay) · src/app/relevo/relevo.css:7 (`.rv` usa Inter y Space Grotesk)
Qué pasa y a quién afecta: el layout raíz carga y precarga Schibsted Grotesk en todas las páginas, también en `/relevo`, donde todo va dentro
de `.rv` con otra fuente. Son ~22–48 KB que compiten al inicio. El LCP ya es bueno (0,7–0,9 s), así que el efecto es mínimo.
Criterio del jurado afectado: ninguno visible.
Arreglo propuesto (concreto): no tocar ahora (Relay está marcado como "NO tocar"). Si sobra tiempo: `preload: false` en Schibsted del layout raíz.
Esfuerzo: S     Riesgo de romper algo: bajo

R-10 · Nota de voz: el envío espera a Gemini
Gravedad: baja     Evidencia: INFERIDO (sin clave, en local el envío es inmediato)
Dónde: src/app/api/relevo/note/route.ts:30 (`await analyseNote(text)` antes de responder)
Qué pasa y a quién afecta: si el presentador graba en directo la tercera nota (día 40) o la frase de crisis, el envío tarda lo que
tarde Gemini (~2 s, con un máximo de 10 s) antes de que se vea en los paneles. El filtro de crisis por lista fija (`crisisFlag`) no
depende de Gemini, pero hoy sí espera a que Gemini termine.
Criterio del jurado afectado: demo en directo (los momentos 2 y 6).
Arreglo propuesto (concreto): bajar el timeout de `analyseNote` a ~4 s y, si se pasa, usar el léxico, que ya existe como respaldo.
No cambiar la lógica de crisis (zona de máximo cuidado).
Esfuerzo: S     Riesgo de romper algo: bajo

---

## 3. Lo que revisé y está bien ("no encontré nada")
- **`evaluate()` y la caché `runCache`**: 2–4 ms con caché y 16–48 ms sin ella. No es un cuello de botella. La caché se vacía entera al pasar de 400 entradas, cosa que no se alcanza en una demo.
- **Tamaño del JSON**: como mucho 14 KB `/demo` y 16,6 KB `/clinic` con ficha, sin comprimir (1–2 KB con Brotli en producción). No compensa recortarlo.
- **Saltos de maquetación por `Fit`/ResizeObserver**: CLS medido 0 en producción y 0,00002 en local. El escalado usa `transform`, que no cuenta como salto, y el primer ajuste ocurre antes de pintar.
- **Bundle cliente**: 181 KB por la red. Lo propio de Relevo son unos 26 KB comprimidos y no lleva los datos crudos de `luis.json`/`pablo.json` al cliente.
- **LCP**: 0,73–0,94 s en producción, muy por debajo de 2,5 s.
- **Llamadas que podrían ir en paralelo**: tras cada acción, las 4 GET ya van en paralelo. Solo hay cascada en la carga inicial (R-05) y entre `/act` y los GET (R-02, inevitable sin cambiar el diseño).

## 4. Lo que NO pude comprobar
- La latencia real de `/act` (POST) en producción: no estaba permitido hacer POST. La estimo a partir de los GET.
- La latencia de Gemini y el comportamiento de R-01 y R-10 con clave, porque no se podía llamar a Gemini.
- La región de Upstash: está en `.env.local` y en el panel de Upstash, que no he leído. La recomendación de R-02(a) depende de ella.
- Rendimiento en un móvil real (`/relevo/app`) y en la wifi del recinto.
- El INP y el coste de dibujar en producción (allí no cliqué para no hacer POST).
- Nota: para la línea base hice en producción unas 14–17 GET por endpoint (un poco por encima de las ~10 pedidas), repartidas en
  curl y dos cargas de página, con ids aleatorios `pf…` y sin bucles rápidos.

## 5. Orden recomendado (si hay tiempo)
1. R-01 (M): es lo único con riesgo real de que algo falle o se pierda en directo.
2. R-03 + R-04 (S, los dos en `useView`, ~15 líneas).
3. R-02(a) solo si Upstash está en Europa (S). R-07 a la lista del día de la demo (sin código).
4. R-05 y R-06 (S).
5. R-02(b) solo si sobra tiempo y después de R-01.
