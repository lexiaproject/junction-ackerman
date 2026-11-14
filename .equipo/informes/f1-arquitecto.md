# F1 · Arquitecto · Mapa de riesgos técnicos de Relevo para la demo en directo

Fase: diagnóstico (solo lectura). Rama `sesion-autonoma` @ 4701299. Servidor local :3000 sin clave de Gemini.

## Cómo está hecho (en una página)

- **Un "mundo" por id** (`w`), guardado como un único JSON en Redis (`relevo:w:<id>`, `src/lib/relevo/store.ts`) o en la
  memoria del servidor si no hay variables KV (`src/lib/app/kv.ts`, compartido con Relay). El mundo solo guarda
  `clock`, `seq`, `events[]`, `config`, `ai{}` y `audit[]` (unos 450 bytes al empezar).
- **Todo lo demás se recalcula en cada petición**: `evaluate(world)` (`sim.ts`) repite minuto a minuto el guion, los
  eventos de las personas, el motor, los avisos y el bandido. Es determinista: mover el reloj no pierde nada.
- **Lectura**: 4 vistas (`/api/relevo/demo`, `/me`, `/mentor`, `/clinic`) que llaman a `evaluate` + `views.ts`/`demo.ts`.
- **Escritura**: patrón "leer mundo → cambiar → guardar mundo entero" sin bloqueo en `act`, `note`, y también en dos GET:
  `/mentor` (guarda el borrador de Gemini) y `/clinic?person=` (apunta la consulta en la auditoría C6).
- **Cliente**: `useView` (`kit.tsx:37`) sondea cada 4-6 s, al volver a la pestaña y tras cada acción (evento
  `relevo:changed`). En `/relevo/demo` hay 4 sondeos a la vez (demo, Luis, mentor, clínica).

## Lo que medí (VERIFICADO)

| Comprobación | Resultado |
|---|---|
| Recorrido de demo `scripts/relevo-demo-walk.mjs` en local | 19/19 OK en 1,8 s |
| Tiempo de `evaluate()` (script en Node, fuera del servidor) | 2-10 ms por llamada; 26 ms la primera (motor en frío) |
| Tamaño de las respuestas | `/me` 2,8-6,8 KB · `/mentor` 2,2-4,6 KB · `/demo` 6-14 KB · mundo ~0,45 KB |
| 12 acciones `act` + 12 GET de ficha clínica en paralelo (local, memoria), 3 rondas | 0 escrituras perdidas (12/12). En local la memoria no tiene esperas de red, así que esto **no** prueba Redis |
| 10 cambios de reloj en paralelo (local) | el reloj acaba en el último valor |
| Entradas raras en `/api/relevo/act` | `p: null` → 500; `as: "constructor"` → 500; `person: "constructor"` → se acepta y se guarda; peso `"abc"` → se acepta (los niveles no cambian); umbrales extremos (`persist_up 0`, `l1_R 0`, `noticeFrom 2000`) → sin errores |
| Reset de la demo | el contador de eventos vuelve a 0: la primera nota después del reset es otra vez `ev1` |
| Auditoría con la ficha de Luis abierta | cada vez que se mueve el reloj se apunta otra vez "Opened Luis's file" |
| Docs de Next 16 (`node_modules/next/dist/docs`) | con `cacheComponents`, los GET se prerenderizan **salvo** que lean datos de la petición; los de Relevo leen `req.url`, así que son dinámicos. Las rutas ocultas se conservan con `<Activity>` (sus efectos se paran, así que el sondeo se detiene) |

**No lo pude comprobar**: nada en producción (no tengo la URL y no debo escribir allí), nada con Gemini real, los límites
de Upstash y Vercel del plan que tenéis, ni `npm run build` (podría pisar la carpeta `.next` del servidor que está en marcha).

---

## Hallazgos (por orden de prioridad)

```
A-01 · El GET del mentor guarda un mundo antiguo tras esperar a Gemini (puede deshacer el reloj o una acción)
Gravedad: alta     Evidencia: INFERIDO (el mecanismo lo verifiqué leyendo el código; sin clave no se puede reproducir)
Dónde: src/app/api/relevo/mentor/route.ts:16-29
Qué pasa y a quién afecta: en el momento 3, cuando Pablo pulsa "Yes", la siguiente lectura de /mentor carga el mundo,
  espera a Gemini (unos 2 s; hasta 20 s si va lento: 2 intentos de 10 s, ai.ts:9-27) y luego guarda ESE mundo con el
  borrador. Si mientras tanto el presentador pulsa "Next moment", o Luis/Pablo hacen algo, se pierde: el reloj vuelve
  atrás o la acción desaparece. Solo pasa en producción (con clave y Redis). Lo vería el jurado.
Criterio del jurado afectado: demo que funciona / fiabilidad técnica.
Arreglo propuesto (concreto): tras recibir el borrador, volver a leer el mundo y poner solo esa clave:
  `const fresh = await loadWorld(w); fresh.ai[key] = revealNames(draft); await saveWorld(w, fresh);`
  y `return ok(mentorView(evaluate(fresh), as))`. La ventana baja de segundos a lo que tarda un viaje a Redis.
Esfuerzo: S     Riesgo de romper algo: bajo
```

```
A-02 · La nota de voz guarda un mundo leído antes de analizarla (hasta 16 s con Gemini)
Gravedad: alta     Evidencia: INFERIDO
Dónde: src/app/api/relevo/note/route.ts:20-39 (analyseNote: ai.ts:46-55, 8 s x 2 intentos)
Qué pasa y a quién afecta: lo mismo que A-01. El POST de la nota carga el mundo, espera a Gemini y guarda. Cualquier
  cambio de reloj o acción hecha mientras tanto se pierde. Es la entrada del momento 2 (copiloto) y del 6 (crisis).
Criterio del jurado afectado: demo que funciona.
Arreglo propuesto (concreto): justo antes de `addEvent`, `const fresh = await loadWorld(b.w!)` y usar `fresh` en
  addEvent/saveWorld (el análisis ya hecho no cambia). OJO: es la ruta por la que entra el camino de crisis. La lógica
  de crisis no cambia (sigue siendo crisisFlag || Gemini), pero pedid el visto bueno antes de tocarla.
Esfuerzo: S     Riesgo de romper algo: bajo (medio por estar en la ruta de crisis)
```

```
A-03 · Si Gemini falla, cada sondeo del mentor lo vuelve a llamar (y la vista de Pablo tarda hasta ~20 s)
Gravedad: media     Evidencia: VERIFICADO leyendo (mentor/route.ts:21: solo se guarda si hay borrador)
Dónde: src/app/api/relevo/mentor/route.ts:19-30
Qué pasa y a quién afecta: mientras haya una idea a la vista sin borrador, cada lectura (cada 4 s, más una tras cada
  acción) lanza 2 llamadas a Gemini y no responde hasta que acaban. Si Gemini da 429 (cuota agotada) falla rápido y se
  ve la plantilla: bien. Pero gasta cuota en bucle. Si Gemini va lento, el móvil de Pablo se queda congelado hasta 20 s
  y se juntan varias llamadas a la vez (el sondeo no espera a que termine la anterior).
Criterio del jurado afectado: demo que funciona; uso de la tecnología del partner.
Arreglo propuesto (concreto): un `Map` en memoria del módulo `tried: key → hora`; no volver a intentar la misma clave
  hasta pasados 60 s ni lanzarla si ya hay una en marcha. Opcional: bajar el timeout de T1 a 5 s y hacer 1 intento.
Esfuerzo: S     Riesgo de romper algo: bajo
```

```
A-04 · Las respuestas del sondeo pueden llegar desordenadas: la pantalla "vuelve atrás" y la hoja de crisis parpadea
Gravedad: media     Evidencia: INFERIDO (el mecanismo lo verifiqué leyendo kit.tsx:44-58 y MenteeApp.tsx:40-49)
Dónde: src/app/relevo/kit.tsx:37-72 (useView)
Qué pasa y a quién afecta: cada carga hace su `setData` cuando llega, sin mirar si hay otra más nueva. Si una lectura
  que empezó ANTES de una acción llega DESPUÉS de la lectura posterior (servidor en frío, otra instancia, o /mentor
  esperando a Gemini), se ve el estado viejo hasta el siguiente sondeo (4-5 s): la tarjeta de Pablo reaparece, el reloj
  de la demo retrocede... En Luis, si llega una respuesta vieja sin `openHelp`, la hoja de ayuda se cierra y vuelve a
  abrirse (MenteeApp.tsx:45-48) justo en el momento de crisis.
Criterio del jurado afectado: demo que funciona; cuidado en la experiencia.
Arreglo propuesto (concreto): dentro del efecto, `let last = 0;` y en `load`: `const my = ++last; ... if (alive &&
  my === last) setData(j)`. Gana la última petición que empezó. Arregla la crisis sin tocar su lógica.
Esfuerzo: S     Riesgo de romper algo: bajo (pero kit.tsx lo usan todas las pantallas: probar el recorrido completo)
```

```
A-05 · Si cae la red o Redis, la demo se congela sin avisar
Gravedad: alta (impacto) / probabilidad baja-media     Evidencia: VERIFICADO leyendo
Dónde: demo/page.tsx:47 (`.catch(() => {})` en el reloj), demo/page.tsx:99 (reset sin catch), MentorApp/MenteeApp/
  ClinicWeb (casi todos los botones llaman a `act` sin catch), kit.tsx:71 (`error` de useView nadie lo pinta),
  src/lib/app/kv.ts:11-20 (fetch a Redis sin tiempo límite)
Qué pasa y a quién afecta: con la wifi del recinto caída o Redis sin cuota, los botones "no hacen nada" y los datos se
  quedan como estaban. El presentador no sabe si esperar o repetir. En `next dev` los rechazos sin capturar sacan la
  capa roja de errores de Next.
Criterio del jurado afectado: demo que funciona.
Arreglo propuesto (concreto): (1) en demo/page.tsx, leer `error` de su useView y pintar una franja pequeña
  "Connection lost, retrying…"; en setClock, poner el mismo aviso si falla. (2) PLAN B sin código: tener en el portátil
  `npm run build && npm start` sin variables KV (usa memoria y funciona sin internet, con el texto de respaldo en vez de
  Gemini). Nunca presentar con `npm run dev`.
Esfuerzo: S     Riesgo de romper algo: bajo
```

```
A-06 · Después de "Reset" se repiten los ids y puede sonar la grabación del ensayo
Gravedad: media     Evidencia: VERIFICADO (tras reset la primera nota vuelve a ser `ev1`) / INFERIDO (caché del navegador)
Dónde: src/app/api/relevo/act/route.ts:21-25 (newWorld pone seq a 0), src/app/api/relevo/audio/route.ts:12
  (`Cache-Control: private, max-age=3600`)
Qué pasa y a quién afecta: el audio se pide como `/api/relevo/audio?w=…&id=ev7`. Si ensayáis, grabáis, hacéis Reset y
  en la demo real se graba otra nota que vuelve a ser `ev7`, el navegador puede servir durante 1 h el audio viejo de su
  caché.
Criterio del jurado afectado: demo que funciona.
Arreglo propuesto (concreto): en el reset, `fresh.seq = world.seq;` (1 línea). Así los ids nunca se repiten.
Esfuerzo: S     Riesgo de romper algo: bajo
```

```
A-07 · "Next moment" justo después de otro clic puede repetir el mismo momento
Gravedad: baja     Evidencia: INFERIDO
Dónde: src/app/relevo/demo/page.tsx:43-61
Qué pasa y a quién afecta: `busy` se apaga cuando acaba el POST del reloj, pero `data.clock` sigue siendo el viejo hasta
  que llega la siguiente lectura. Un segundo clic rápido calcula el "siguiente" desde el reloj viejo y manda el mismo
  momento: parece que el botón no hace caso. Las flechas del teclado en el deslizador mandan un POST por pulsación sin
  `busy`, y en producción pueden llegar desordenados.
Criterio del jurado afectado: fluidez del pitch.
Arreglo propuesto (concreto): guardar en un `useRef` el `clock` que devuelve `act` y usar `Math.max(data.clock.t,
  ref.current)` en next/prev. Proceso: un clic, esperar a ver el cambio.
Esfuerzo: S     Riesgo de romper algo: bajo
```

```
A-08 · Escrituras a la vez en Redis sin bloqueo (el último que guarda gana)
Gravedad: media     Evidencia: INFERIDO (en local no se reproduce: 12/12 en 3 rondas, porque la memoria no espera)
Dónde: store.ts:10-16 y todas las rutas que guardan; también los GET de clinic/route.ts:14-22
Qué pasa y a quién afecta: dos acciones en menos de un viaje a Redis (decenas de ms, más si la región de Vercel y la
  de Upstash no coinciden) → una se pierde. El GET de la clínica con una ficha abierta escribe en cada cambio de reloj,
  así que un clic justo después de "Next" puede chocar con él. Probabilidad baja, pero lo que se pierde es justo lo que
  se acaba de enseñar.
Criterio del jurado afectado: demo que funciona.
Arreglo propuesto (concreto): para la demo, A-01 y A-02 cubren los casos de segundos. El arreglo de verdad (versión con
  WATCH/Lua, o guardar los eventos como lista con RPUSH) NO cabe en 2 h. Proceso: no hacer dos clics en menos de 1 s.
Esfuerzo: L (el de verdad)     Riesgo de romper algo: alto (el de verdad)
```

```
A-09 · Volver atrás con el reloj y actuar borra todo lo que pasaba "después"
Gravedad: media (error del presentador)     Evidencia: VERIFICADO leyendo (store.ts:19)
Dónde: src/lib/relevo/store.ts:18-23
Qué pasa y a quién afecta: ya está en MAPA.md. Si en el pitch se retrocede para repetir algo y se pulsa un botón, las
  acciones hechas en directo más adelante desaparecen (el guion las vuelve a hacer solo si siguen teniendo sentido).
Criterio del jurado afectado: coherencia de la historia.
Arreglo propuesto (concreto): sin código. Antes del pitch: "Go back to day 0" + "Reset". Durante el pitch: solo hacia
  delante.
Esfuerzo: S     Riesgo de romper algo: bajo
```

```
A-10 · El enlace para compartir le da al jurado el mismo mundo que el del presentador
Gravedad: media     Evidencia: VERIFICADO leyendo (demo/page.tsx:80,103; kit.tsx:10-12)
Dónde: menú "More" → "Same demo on a real phone" (`/relevo/app?w=<id>`)
Qué pasa y a quién afecta: cualquiera con ese enlace escribe en el mundo de la demo en directo (no hay permisos por
  mundo). Si se enseña como QR al jurado, sus toques cambian lo que se está presentando. Además, abrir en el portátil
  un enlace `?w=` de otro cambia para siempre el mundo de ese navegador (localStorage).
Criterio del jurado afectado: demo que funciona.
Arreglo propuesto (concreto): sin código. Al jurado, el enlace SIN `?w=` (cada uno tiene su mundo). El `?w=` solo para
  los móviles del equipo.
Esfuerzo: S     Riesgo de romper algo: bajo
```

```
A-11 · Con Gemini lento, enviar la nota de crisis puede tardar hasta 16 s
Gravedad: media     Evidencia: INFERIDO
Dónde: src/lib/relevo/ai.ts:46-55 (8000 ms) + ai.ts:12 (2 intentos); note/route.ts:30
Qué pasa y a quién afecta: la lista fija de crisis (`crisisFlag`) no necesita Gemini, pero la ruta espera a Gemini antes
  de guardar. Mientras tanto el botón pone "Sending…" y la ayuda no se abre. Si Gemini falla rápido (429/503), no pasa.
Criterio del jurado afectado: cuidado en la crisis; demo que funciona.
Arreglo propuesto (concreto): bajar el timeout de analyseNote a ~4 s y 1 intento (parámetro nuevo en `gemini()`). Es
  zona de crisis: decidid vosotros (cuando Gemini va lento, la IA deja de poder AÑADIR crisis; la lista fija sigue).
Esfuerzo: S     Riesgo de romper algo: bajo
```

```
A-12 · Tiempo máximo de las funciones de Vercel
Gravedad: baja     Evidencia: INFERIDO (no veo el panel de Vercel; no hay vercel.json ni maxDuration)
Dónde: rutas /api/relevo/mentor y /note
Qué pasa y a quién afecta: con Fluid compute (lo normal en proyectos nuevos) el límite es de minutos: sin problema. Si
  el proyecto NO lo tiene, el límite por defecto son 10 s, y el peor caso de Gemini (20 s / 16 s) acabaría en error 504.
Criterio del jurado afectado: demo que funciona.
Arreglo propuesto (concreto): mirar en Vercel → Settings → Functions si Fluid está activo. Si no, `export const
  maxDuration = 30;` en esas dos rutas, o aplicar A-03/A-11.
Esfuerzo: S     Riesgo de romper algo: bajo
```

```
A-13 · Cuota de Upstash por el sondeo, y Redis sin tiempo límite
Gravedad: baja-media     Evidencia: INFERIDO (no veo el plan ni el uso)
Dónde: kit.tsx:63 (sondeo), demo/page.tsx:41 (5 s), MenteeApp/MentorApp (4 s), ClinicWeb (5 s); kv.ts:11-20
Qué pasa y a quién afecta: una pestaña de /relevo/demo visible gasta ~3-4 comandos/s (~12.000/hora). El plan gratis de
  Upstash da unos 500.000 al mes (dato de memoria, comprobadlo). Varias pestañas abiertas durante horas (jurado,
  equipo, ensayos), más Relay en la misma base, pueden agotarlo, y entonces todo da 500 (ver A-05). Las pestañas
  ocultas no sondean (bien). El audio cabe: como mucho 1,6 MB en base64, por debajo de los 4,5 MB de Vercel y del máximo
  por petición de Upstash (~10 MB en el plan gratis, a confirmar).
Criterio del jurado afectado: demo que funciona.
Arreglo propuesto (concreto): mirar el uso en el panel de Upstash el domingo por la mañana. Si va justo: subir el
  sondeo de la demo a 10 s (las acciones ya recargan al momento con `relevo:changed`). Una línea por pantalla.
Esfuerzo: S     Riesgo de romper algo: bajo
```

```
A-14 · Las rutas no validan bien algunas entradas
Gravedad: baja     Evidencia: VERIFICADO (probado contra localhost)
Dónde: act/route.ts:10-11 (`p: null` → 500), act/route.ts:70 (`as` = "constructor"/"toString" → 500),
  act/route.ts:59-65 (`person: "constructor"` se acepta y se guarda: `PERSON` es un objeto normal),
  act/route.ts:42-44 (pesos no numéricos se guardan), note/route.ts:17 (`text` que no sea texto → 500, INFERIDO)
Qué pasa y a quién afecta: la interfaz nunca manda estas cosas; solo afecta si alguien llama a la API a mano. No rompe
  la demo.
Criterio del jurado afectado: calidad técnica (si alguien mira el código).
Arreglo propuesto (concreto): `const p = body.p && typeof body.p === "object" ? body.p : {}`; `Object.hasOwn(ALLOWED,
  as)` y `Object.hasOwn(PERSON, id)`; filtrar los pesos con `Number.isFinite`. Unas 4 líneas.
Esfuerzo: S     Riesgo de romper algo: bajo
```

```
A-15 · Ajustes de la clínica: un campo vacío se guarda como 0
Gravedad: baja     Evidencia: VERIFICADO leyendo (ClinicWeb.tsx:446, `Number("") = 0`); valores extremos no rompen nada (probado)
Dónde: src/app/relevo/ClinicWeb.tsx:443-447, 493
Qué pasa y a quién afecta: si en el pitch se enseña C5, se borra un número y se pulsa "Save", cambian los niveles de
  todos en ese mundo hasta pulsar "Back to defaults" o hacer Reset.
Criterio del jurado afectado: coherencia de los números del contrato.
Arreglo propuesto (concreto): ignorar los campos vacíos al guardar (`e.target.value === "" ? c[k] : Number(...)`).
  Proceso: enseñar C5 sin guardar, o pulsar "Back to defaults" después.
Esfuerzo: S     Riesgo de romper algo: bajo
```

```
A-16 · Micrófono y transcripción en el momento de la demo
Gravedad: media     Evidencia: INFERIDO
Dónde: kit.tsx:386-433 (Recorder: Web Speech + MediaRecorder)
Qué pasa y a quién afecta: la primera vez, Chrome pide permiso de micrófono delante del jurado; si sale mientras se
  mantiene pulsado el botón, la grabación sale vacía. La transcripción de Chrome necesita internet. Hay respaldo
  (frase del guion `script`, o escribir el texto), así que no se rompe, pero queda raro.
Criterio del jurado afectado: fluidez del pitch.
Arreglo propuesto (concreto): sin código. Dar permiso de micrófono a la URL de producción antes, ensayar en el mismo
  portátil y navegador; tener a mano la nota escrita como alternativa.
Esfuerzo: S     Riesgo de romper algo: bajo
```

```
A-17 · Primera petición lenta (arranque en frío de Vercel)
Gravedad: baja     Evidencia: INFERIDO (el cálculo en sí es rápido: VERIFICADO 2-26 ms y respuestas de 2-14 KB)
Dónde: todas las rutas /api/relevo/*
Qué pasa y a quién afecta: la primera llamada a cada función tras un rato sin uso puede tardar medio segundo o más. No
  es por `evaluate()`.
Criterio del jurado afectado: fluidez.
Arreglo propuesto (concreto): 5 minutos antes, recorrer la demo entera una vez (calienta las funciones) y luego
  "Go back to day 0" + "Reset".
Esfuerzo: S     Riesgo de romper algo: bajo
```

```
A-18 · Auditoría C6 llena de "Opened Luis's file"
Gravedad: baja     Evidencia: VERIFICADO (5 cambios de reloj → 5 entradas)
Dónde: src/app/api/relevo/clinic/route.ts:14-22
Qué pasa y a quién afecta: con la ficha abierta, el sondeo apunta una consulta nueva cada vez que cambia el reloj o hay
  otra entrada en medio. En la pestaña Consents se ve repetido. Además es un GET que escribe (ver A-08).
Criterio del jurado afectado: credibilidad de la auditoría.
Arreglo propuesto (concreto): apuntarla solo si en las últimas ~5 entradas no hay ya una consulta de esa persona en el
  mismo día de la demo.
Esfuerzo: S     Riesgo de romper algo: bajo
```

```
A-19 · La cola sin conexión puede reenviar notas viejas o duplicadas
Gravedad: baja     Evidencia: INFERIDO
Dónde: src/app/relevo/kit.tsx:270-305
Qué pasa y a quién afecta: si falla la red DESPUÉS de que el servidor guardó la nota, se encola y se reenvía (sale
  duplicada). La cola se vacía al abrir cualquier pantalla y lleva el `w` del momento: una nota de un ensayo con la wifi
  caída puede aparecer más tarde, con la hora del reloj de ese momento.
Criterio del jurado afectado: coherencia.
Arreglo propuesto (concreto): proceso: antes del pitch, en el navegador del presentador, DevTools → Application →
  Local Storage → borrar `relevo:queue`. En código: descartar entradas de más de 10 min (guardar la hora al encolar).
Esfuerzo: S     Riesgo de romper algo: bajo
```

```
A-20 · cacheComponents / Activity: sin riesgo real encontrado
Gravedad: baja     Evidencia: VERIFICADO (docs de Next 16) / INFERIDO (comportamiento)
Dónde: next.config.ts; src/app/relevo/*
Qué pasa y a quién afecta: los GET leen `req.url`, así que no se prerenderizan ni se cachean. Las páginas de Relevo son
  de cliente y no tocan datos en el servidor. Con Activity, una ruta que se deja atrás se oculta en vez de desmontarse:
  sus efectos se paran (el sondeo se detiene y vuelve al regresar), pero lo que se queda abierto, como el menú
  `<details>` "More", sigue abierto al volver. Solo es estético.
Criterio del jurado afectado: ninguno relevante.
Arreglo propuesto (concreto): ninguno.
Esfuerzo: —     Riesgo de romper algo: —
```

---

## Zonas frágiles para quien implemente

1. **`kit.tsx` lo usa todo**: `useView`, `act`, `sendNote`, la grabadora y el reproductor los usan las 3 apps y la
   demo. Un error aquí rompe todas las pantallas a la vez. Un solo dueño.
2. **`views.ts` ↔ tipos copiados a mano en el cliente**: `MeData` (MenteeApp.tsx:11), `MentorData` (MentorApp.tsx:10),
   `ClinicData` (ClinicWeb.tsx:9-35), `DemoData` (demo/page.tsx:16). No comparten tipos: si alguien cambia o renombra un
   campo en `views.ts`/`demo.ts`, el compilador no avisa y la pantalla recibe `undefined` sin error.
3. **`sim.ts` + `server.ts`**: un tipo de evento nuevo hay que añadirlo en el `switch` de `sim.ts` Y en `ALLOWED`
   (server.ts:12-17); si no, da 403. Los casos devuelven `false` para ignorar repeticiones. Respetadlo (gracias a eso,
   el doble clic en "Yes" no hace daño).
4. **Textos exactos que comprueban los scripts**: `relevo-demo-walk.mjs` busca cadenas literales ("Pablo would like to
   talk to you", "Suggest a walk tomorrow morning", "20-minute walk", "Would you like to talk to Luis today?",
   "Only you see this", "High risk"…). Cambiar `texts.ts`/`views.ts` sin actualizar el script rompe la puerta.
   `relevo-check.mjs` importa también `sim.ts` y `views.ts` (líneas 99-100).
5. **Duplicados que se pueden desincronizar**: `END` está repetido en demo/page.tsx:30 (`62*DAY+1439`) y en sim.ts:20;
   los colores y nombres de dominio también (demo/page.tsx:31-32). En `next()` hay claves de momentos escritas a mano
   (`"pl1"`, `"pl2"`, grupos) que dependen de `demo.ts`.
6. **`src/lib/app/kv.ts` lo comparte Relay** (intocable). Cualquier cambio en kv afecta a la app antigua. Si hace falta
   algo (un tiempo límite, por ejemplo), mejor en `store.ts`.
7. **Camino de crisis**: `note/route.ts` (crisisFlag + Gemini) → `sim.ts` `severe()` → `views.ts` `openHelp` →
   `MenteeApp.tsx:40-49` + `HelpSheet`. A-02, A-04 y A-11 lo rozan: los dos primeros no cambian la lógica; A-11 sí un poco.

## Lo que NO cabe en dos horas

- Control de concurrencia de verdad en Redis (versión + WATCH/MULTI o script Lua por REST, o eventos en una lista
  RPUSH en vez del mundo entero). Arregla A-08 del todo, pero toca store, act, note, mentor y clinic.
- Mover Gemini T1 a segundo plano con `after()` de Next y un bloqueo entre instancias.
- Tipos compartidos entre `views.ts` y los componentes (quitar las copias a mano).
- Cambiar el sondeo por envío del servidor (SSE/WebSocket).
- Permisos por mundo (que el jurado no pueda escribir en el mundo del presentador sin un enlace de solo lectura).
- Pruebas automáticas de la interfaz en navegador para los 8 momentos (hoy el recorrido solo prueba la API).

## Plan mínimo recomendado (orden, ~1 h en total)

1. A-04 (useView: gana la última petición): S.
2. A-01 + A-02 (volver a leer el mundo antes de guardar): S + S. A-02 con vuestro visto bueno.
3. A-03 (no repetir Gemini T1 en bucle): S.
4. A-06 (no reiniciar `seq` en el reset): S.
5. A-05 (franja de "sin conexión" en la demo) + ensayar el plan B local con `npm run build && npm start`.
6. Proceso, sin código: A-09, A-10, A-13 (mirar Upstash), A-16, A-17, A-19 y comprobar Fluid (A-12).

Después de cada paso: `node scripts/relevo-check.mjs` (33) y `node scripts/relevo-demo-walk.mjs` (19).

---

## Grupos de archivos (para repartir sin pisarse)

| Grupo | Archivos que van juntos | Notas |
|---|---|---|
| **G1 · Datos en vivo (cliente)** | `src/app/relevo/kit.tsx` | Un solo dueño. A-04, A-05 (parte), A-19. Afecta a todas las pantallas |
| **G2 · Presentador / demo** | `src/app/relevo/demo/page.tsx`, `src/lib/relevo/demo.ts`, `src/app/api/relevo/demo/route.ts` | A-05 (franja), A-07, A-13 (sondeo). `next()` depende de las claves de `demo.ts` |
| **G3 · Acompañado (Luis)** | `src/app/relevo/MenteeApp.tsx`, `src/app/api/relevo/me/route.ts`, `menteeView` en `views.ts` | Zona de crisis (HelpSheet, openHelp): solo arreglos visuales/accesibilidad |
| **G4 · Mentor (Pablo/Marta) + Gemini** | `src/app/relevo/MentorApp.tsx`, `src/app/api/relevo/mentor/route.ts`, `src/lib/relevo/ai.ts`, `src/lib/relevo/pseudo.ts`, `mentorView` en `views.ts` | A-01, A-03. No cambiar el modelo de Gemini |
| **G5 · Clínica** | `src/app/relevo/ClinicWeb.tsx`, `src/app/relevo/charts.tsx`, `src/app/relevo/clinic/page.tsx`, `src/app/api/relevo/clinic/route.ts`, `clinic*`/`personFile` en `views.ts` | A-15, A-18 |
| **G6 · Escritura y estado (servidor)** | `src/app/api/relevo/act/route.ts`, `src/app/api/relevo/note/route.ts`, `src/app/api/relevo/audio/route.ts`, `src/lib/relevo/store.ts`, `src/lib/relevo/server.ts` | Un solo dueño. A-02, A-06, A-14. `note/route.ts` es la entrada de la crisis. No tocar `src/lib/app/kv.ts` (Relay) |
| **G7 · Simulación y textos** | `src/lib/relevo/sim.ts` (sin `SCRIPT`/`BANDIT_SALT`), `texts.ts`, `people.ts`, `scripts/relevo-check.mjs`, `scripts/relevo-demo-walk.mjs` | Si cambia un texto, cambia también el script. `engine.ts` es intocable |
| **G8 · Estilos** | `src/app/relevo/relevo.css`, tokens `--color-rv-*` en `src/app/globals.css`, `src/app/relevo/layout.tsx` | `globals.css` lo comparte Relay: añadir, no cambiar |

**Choque inevitable**: `views.ts` lo usan G3, G4 y G5. O tiene un solo dueño, o cada uno toca solo su función
(`menteeView` / `mentorView` / `clinic*`) y se hace merge pronto.
