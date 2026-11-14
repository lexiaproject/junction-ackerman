# F1 · Informe UX de Relevo (heurísticas de Nielsen + recorrido cognitivo de la demo)

Autor: investigador UX · Fase 1 (diagnóstico, solo lectura) · sáb 14 nov 2026

## 1. Resumen en 6 líneas

- **La demo funciona de principio a fin** con "Next moment": los 27 momentos avanzan, el guion automático rellena las acciones y los números del contrato aparecen en la capa de explicación. No vi errores de consola.
- **El mayor riesgo en directo no es un fallo, es que el jurado no vea lo que se cuenta**: el texto de los teléfonos es ilegible a tamaño de proyector (U-01), nada indica qué columna o pestaña mirar (U-02), y tres momentos clave del guion no tienen nada visible en los teléfonos (copiloto U-03; "Can't today", "How did it go?" y consentimientos U-07).
- **Hay tres trampas para el presentador**: la pantalla de un teléfono se queda en la pestaña anterior al avanzar (U-04/U-05); un clic equivocado ("Can't today" en el paso 3) rompe los pasos 3-4, y "Previous" no lo deshace (U-06); y después de tocar el deslizador, la flecha derecha avanza un día en vez de un momento (U-12).
- Detalles que restan credibilidad: la numeración de la capa va desordenada (7 antes que 6) (U-08), se cuelan identificadores en castellano (`paseo_juntos`, `movilidad`) (U-09) y aparece una fecha caducada, "Tomorrow, Sunday" el propio domingo (U-10).
- Casi todo se arregla con cambios pequeños (S) en la carcasa de la demo (`demo/page.tsx`, `demo.ts`) sin tocar el motor, `SCRIPT` ni la lógica del camino de crisis.

## 2. Método y límites

- **Herramientas**: Playwright contra `http://localhost:3000` (sin Gemini), con mi propio mundo `w=uxinv7k2q9`, más un mundo de prueba `uxmist4k8z` solo por API. Hice un recorrido completo con "Next moment" por los 27 momentos a 1440×900, con captura de cada uno. Repetí a 1280×720, 1920×1080, 1024×768 y 390×844 (móvil). Probé acciones de presentador: abrir la hoja de redactar y avanzar; ver el copiloto y avanzar; el menú More; "Open Luis's file" dos veces; el deslizador con teclado; y un "Can't today" equivocado seguido de "Previous". Además leí el código de `demo/page.tsx`, `demo.ts`, `MentorApp.tsx`, `MenteeApp.tsx` (parcial), `ClinicWeb.tsx` (parcial), `store.ts`, `act/route.ts`, `views.ts` y `sim.ts` (parcial).
- **Capturas de evidencia**: `C:\Users\<user>\Downloads\junction-pack\.claude\.playwright-mcp\ux-*.png` (`ux-m1..m26` = cada momento; `ux-vp1280/1920` = tamaños; `ux-stuck-chat`, `ux-compose2`, `ux-more`, `ux-file1/2` = trampas). Son archivos que creé yo; se pueden borrar sin problema.
- **Aviso operativo**: el navegador de Playwright **lo comparten todos los agentes**, y otro agente me cambió la pestaña a mitad de prueba. Para no interferir trabajé siempre en un contexto propio. Si alguien vuelve a probar, que haga lo mismo.
- **No pude comprobar**: la demo desplegada (Vercel + Upstash; las latencias locales son ~40 ms y en producción serán mayores), un proyector real, la grabadora con micrófono, un lector de pantalla ni el modo oscuro. No revisé a fondo todas las pantallas de la web de la clínica (C2-C6), solo lo que aparece durante el recorrido.

## 3. Recorrido cognitivo de la demo (8 pasos del contrato)

Preguntas en cada paso: **¿Sabe** el presentador o el usuario qué tiene que pasar? **¿Ve** cómo hacerlo o dónde mirar? **¿Entiende** que ha funcionado? (✔ bien · ~ con esfuerzo · ✘ falla)

| Paso (momentos) | Sabe | Ve | Entiende | Qué ocurre de verdad |
|---|---|---|---|---|
| 1 · Emparejamiento (día 0, 08:10-18:00) | ✔ (rótulo "Matching: Pablo or Sara for Luis?") | ~ | ~ | 0,87 / 0,758 se ven bien en la capa. La clínica sigue en el **Panel**, no en Matching (C4). El M0 de Pablo enseña primero una invitación genérica: el 87 % no se ve sin pulsar "I'm interested". El momento "Luis's welcome and consents" cae justo cuando el guion ya completó A0, así que **los consentimientos nunca se ven** (U-07). |
| (Línea base, día 27) | ✔ | ✔ | ✔ | Capa clara: "The phones look exactly the same". Bien. |
| 2 · Copiloto (día 40, 21:10) | ~ | ✘ | ✘ | El teléfono de Pablo dice **"Nothing pending today"**. La sugerencia privada está en la pestaña Conversation, que en pantalla mide ~8 px (U-03). Si el presentador entra en Conversation, **se queda ahí** en los momentos siguientes (U-04). |
| 3 · Día 47: primero se pregunta a Pablo | ✔ | ~ | ✔ | 08:30: la pregunta "Would you like to talk to Luis today?" se ve (si Pablo no se quedó en Conversation). 08:41: Luis lee V2 y Pablo tiene el paseo. Un clic en "Can't today" en vez de "Yes" **rompe los pasos 3 y 4** (U-06). Los 6 puntos de ese día se amontonan en el deslizador (U-11). |
| 4 · Días 47-48: envío, "I'm in", "Good" | ✔ | ~ | ~ | Envío y "I'm in" se ven. Nunca se ve la pregunta **"How did it go?"**: el siguiente momento (48 11:30) llega cuando el guion ya respondió "Good" (U-07). El 0,62 → 0,70 solo aparece en la tabla de la capa. Pablo ve **"Tomorrow, Sunday, 10:00"** el domingo a las 11:30 (U-10). Si el presentador abrió "Send as voice note" y avanza, la hoja queda abierta con el mensaje ya enviado (U-05). |
| 5 · Días 54-55: "Can't today", V4, V3, llamada | ~ | ✘ | ✘ | El V1 del día 54 (08:30) cae entre dos momentos (03:15 → 09:10), así que **el botón "Can't today" nunca está en pantalla**. Después Pablo solo ve "Nothing pending today", sin confirmar que se respeta su decisión (U-07). V4 y V3 se ven en Luis. La lista "Notices today…" y el enlace "Open Luis's file" quedan **bajo el pliegue** de la capa a 900 px. |
| 6 · Día 57: crisis | ✔ | ✔ | ~ | La hoja de ayuda se abre sola en Luis, Pablo ve M6, y la clínica muestra "1 Severe alerts" y "Call now". El reenvío a guardia (21:27) solo se ve en el registro o en la pestaña Alerts (U-21). Al volver atrás, la hoja de ayuda se cierra bien (arreglado). |
| 7 · Días 56-60: proteger al mentor | ✔ | ~ | ~ | 56 08:30: la columna cambia sola a Marta (bien). 60 08:30, rótulo "Pablo level 2: a pause…": la columna cambia a **Marta** y el M5 de Pablo no se ve hasta el momento siguiente (U-15). "Review pace" se ve en la clínica. |
| 8 · Cierre (día 62) | ✔ | ✔ | ✔ | 88 % · 5 días · 2,45: grandes y claros. "Next moment" se desactiva y no hay un "Start again" visible (U-20). |

**Barra de control y capa**: "Next moment" es claro y grande, y las flechas ← → funcionan (sin pista visible). El rótulo del momento es gris de 13 px y es la única guía. La capa "Show how Relevo decides" ocupa el 38 % del alto y, a 1280×720, deja los teléfonos en 125 px de ancho. Si se apaga la capa, pasan a 232 px.

## 4. Las 10 heurísticas de Nielsen (resumen)

| # | Heurística | Estado | Hallazgos |
|---|---|---|---|
| 1 | Visibilidad del estado del sistema | ✘ | U-01, U-03, U-07, U-16, U-21 |
| 2 | Relación con el mundo real | ~ | U-09 (ids internos), U-10 (fecha caducada), U-17 (saludo) |
| 3 | Control y libertad del usuario | ✘ | U-06 (sin deshacer), U-13, U-20 |
| 4 | Consistencia y estándares | ~ | U-08 (numeración), U-12 (la flecha cambia de significado), U-15 |
| 5 | Prevención de errores | ✘ | U-05 (doble envío), U-06, U-13 (reset sin confirmar) |
| 6 | Reconocer mejor que recordar | ✘ | U-02, U-04, U-11 |
| 7 | Flexibilidad y eficiencia | ~ | U-11 (no se puede saltar a un paso), U-14 |
| 8 | Diseño estético y minimalista | ✔/~ | Estética cuidada y nada genérica; problema de escala (U-01) y U-18 |
| 9 | Ayudar a reconocer y recuperarse de errores | ✘ | U-16 (errores silenciosos), U-06 |
| 10 | Ayuda y documentación | ~ | Sin pista de teclado ni guía del presentador (dentro de U-02) |

**Lo que funciona bien (no tocar)**: el contenido de la capa de explicación (ecuaciones, citas en cursiva y tablas claras), el registro "What just happened", el cambio automático Pablo/Marta en el paso 7, el cierre automático de la hoja de ayuda al mover el reloj, la regla de oro respetada en todas las pantallas que vi, el "Simulated sensor data" bien visible, el cierre del paso 8 y el móvil a 390 px sin scroll horizontal.

## 5. Hallazgos

```
U-01 · Texto de los teléfonos y de la clínica ilegible a tamaño de presentación
Gravedad: alta  (Nielsen 0-4: 3)     Evidencia: VERIFICADO
Dónde: src/app/relevo/demo/page.tsx:111-155 (rejilla + capa a 38vh, línea 138); capturas ux-vp1280.png, ux-m*.png
Qué pasa y a quién afecta: ancho real del teléfono: 125 px a 1280×720, ~185 px a 1440×900 y 228 px a 1920×1080. El texto de los móviles queda en ~6-8 px y la clínica (1280 px escalada a ~600) en ~4-5 px. El jurado, desde lejos o en un proyector, no puede leer "Pablo would like to talk to you" ni la pregunta a Pablo, que son el corazón de la idea. Con la capa apagada el teléfono pasa a 232 px a 1280×720.
Criterio del jurado afectado: calidad de la demo / claridad de la solución (UX).
Arreglo propuesto (concreto): (1) atajo de teclado "E" para mostrar u ocultar la capa, y que la capa empiece cerrada si la ventana mide menos de 800 px de alto; (2) al pulsar el título de una columna, ampliarla (esa columna ocupa 2/3 del ancho y las otras se encogen; "Esc" vuelve). Mínimo viable: solo (1).
Esfuerzo: S para (1), M para (2)     Riesgo de romper algo: bajo
```

```
U-02 · Nada indica qué columna o pestaña mirar en cada momento
Gravedad: alta  (Nielsen 0-4: 3)     Evidencia: VERIFICADO
Dónde: src/app/relevo/demo/page.tsx:88-91 (rótulo gris de 13 px); src/lib/relevo/demo.ts:9-37 (MOMENTS sin "dónde mirar")
Qué pasa y a quién afecta: con tres superficies a la vez y el cambio ocurriendo en una sola (a menudo en un detalle pequeño), el presentador tiene que recordar dónde está la novedad y el jurado no sabe adónde mirar. No hay pista visible de que ← → funcionan.
Criterio del jurado afectado: claridad de la demo / storytelling.
Arreglo propuesto (concreto): añadir a cada Moment un campo `look: "luis" | "mentor" | "clinic"` (más un texto corto opcional, p. ej. "Pablo → Conversation") y, en la demo, dibujar un anillo teal de 3 px alrededor de esa columna más una etiqueta "Look here" junto a su título. Junto a "Next moment", texto pequeño "← → keys". MOMENTS no es intocable y relevo-check no lo usa.
Esfuerzo: M     Riesgo de romper algo: bajo
```

```
U-03 · El copiloto (paso 2) no se ve: Pablo lee "Nothing pending today"
Gravedad: alta  (Nielsen 0-4: 3)     Evidencia: VERIFICADO (ux-m4.png; dentro de Conversation sí aparece "Only you see this")
Dónde: src/app/relevo/MentorApp.tsx:186 (`nothing` no tiene en cuenta data.copilot) y 97-107 (la tarjeta solo existe en Conversation)
Qué pasa y a quién afecta: en el momento "Third note in a complaint loop: copilot", la pantalla Today de Pablo dice que no hay nada pendiente. Para enseñarlo, el presentador debe pulsar una pestaña de ~8 px. Al jurado le llega lo contrario de lo que se cuenta.
Criterio del jurado afectado: demostración de la función diferencial (copiloto).
Arreglo propuesto (concreto): en Today, si `data.copilot` existe, mostrar en lugar de "Nothing pending today" una tarjeta pequeña con candado: "A private idea for your next note to Luis" y botón "Open" → `onTab("chat","mentee")`. Solo la ve el mentor y no enseña análisis, así que respeta los principios.
Esfuerzo: S     Riesgo de romper algo: bajo
```

```
U-04 · La pestaña o pantalla de cada teléfono (y la ficha de la clínica) se queda "pegada" al avanzar de momento
Gravedad: alta  (Nielsen 0-4: 3)     Evidencia: VERIFICADO (ux-stuck-chat.png: a las 08:30 del día 47 Pablo sigue en Conversation y la pregunta V1 no se ve)
Dónde: src/app/relevo/MentorApp.tsx:44-48 (tab, compose, help son estado local); ClinicWeb.tsx:53-59; MenteeApp.tsx:33
Qué pasa y a quién afecta: si en un momento el presentador abre una pestaña (Conversation, My relay, la ficha de Luis en la clínica), en los siguientes momentos esa columna no enseña la novedad. El presentador cree que "no ha pasado nada" y se atasca en directo.
Criterio del jurado afectado: fluidez de la demo.
Arreglo propuesto (concreto): pasar desde la demo una prop `resetKey={data.index}` a MentorApp y ClinicWeb. Dentro, `useEffect(() => { setTab("today"); setCompose(null); setHelp(false) }, [resetKey])` en MentorApp, y en la clínica `setTab("panel"); setPerson(null)`. No remontar con `key` porque saldría el parpadeo "Loading…". No tocar MenteeApp (su hoja de ayuda ya se controla por datos y es zona de crisis).
Esfuerzo: S     Riesgo de romper algo: bajo
```

```
U-05 · La hoja "Voice note to Luis" queda abierta al avanzar y permite enviar el paseo dos veces
Gravedad: media  (Nielsen 0-4: 2)     Evidencia: VERIFICADO (ux-compose2.png: tras "Next moment", Pablo ya muestra "Sent. Luis will hear it…" y la hoja sigue abierta con "Hold to record")
Dónde: src/app/relevo/MentorApp.tsx:157-173
Qué pasa y a quién afecta: el guion envía la nota a las 09:05 aunque el presentador tenga la hoja abierta. Si después graba o pulsa "Send as a written note", Luis recibe dos notas y la conversación se ensucia.
Criterio del jurado afectado: pulido / credibilidad.
Arreglo propuesto (concreto): queda resuelto con el arreglo de U-04 (cerrar compose al cambiar de momento). Opcional: cerrar la hoja si `data.card?.id !== compose.cardId`.
Esfuerzo: S     Riesgo de romper algo: bajo
```

```
U-06 · Un clic equivocado rompe la historia y "Previous" no lo deshace
Gravedad: alta  (Nielsen 0-4: 3)     Evidencia: VERIFICADO (API, mundo uxmist4k8z: "Can't today" a las 08:30 del día 47 → a las 11:20 Luis no tiene V2 ni plan; volver a 08:30 y pulsar "Yes" → "(v1_answer ignored: no longer applicable)")
Dónde: src/lib/relevo/store.ts:19-23 (solo se descarta lo futuro al hacer una acción nueva, y el filtro `e.t <= clock` conserva la del mismo minuto); src/app/api/relevo/act/route.ts:17-21; sim.ts:766-769 (el guion se salta si la persona actuó ese día)
Qué pasa y a quién afecta: pulsar "Can't today" en vez de "Yes" en el paso 3 (o "Not now" / "Another day" en Luis) elimina el paseo, el "I'm in" y el 0,62 → 0,70, mientras los rótulos siguen diciendo "Pablo says yes → Luis reads V2". La única salida es More → "Reset everything people did", que no explica que sirve para esto. En directo, eso deja la demo rota delante del jurado.
Criterio del jurado afectado: fiabilidad de la demo.
Arreglo propuesto (concreto): en `act/route.ts`, cuando el reloj se mueve hacia atrás, borrar los eventos con `t >= nuevo reloj`. Así "Previous" (o el clic en un punto anterior) funciona como deshacer. Renombrar el reset a "Undo everything I clicked (keep the time)". MAPA ya documenta que volver atrás descarta lo futuro, así que es coherente.
Esfuerzo: S     Riesgo de romper algo: medio (cambia cuándo se descartan acciones; volver a pasar relevo-check y relevo-demo-walk)
```

```
U-07 · Tres decisiones clave del guion nunca se ven en pantalla: "Can't today", "How did it go?" y los consentimientos
Gravedad: alta  (Nielsen 0-4: 3)     Evidencia: VERIFICADO (ux-m13/m14: Pablo "Nothing pending today" a las 03:15 y a las 09:10 del día 54; API a las 48 11:20: askFeedback=true, pero el momento salta a 11:30, ya respondido; ux-m2: a las 18:00 Luis ya está en la pantalla de inicio)
Dónde: src/lib/relevo/demo.ts:12, 22, 23-24 (momentos colocados justo en el minuto en que actúa el guion); MentorApp.tsx:307 (tras "Can't today" no hay confirmación)
Qué pasa y a quién afecta: "Respetar Can't today" es un principio del producto, y el jurado nunca ve el botón ni su efecto. El aprendizaje 0,62 → 0,70 nace del "Good" que nadie ve pulsar. El rótulo "Luis's welcome and consents" enseña la pantalla de inicio, no los consentimientos.
Criterio del jurado afectado: demostración de los principios (ética, mentor protegido) y del aprendizaje.
Arreglo propuesto (concreto): añadir momentos a MOMENTS un minuto antes de cada acción del guion: at(54,"08:30") "Pablo is asked again", at(48,"11:00") "Luis: how did the walk go?", y mover "welcome" a at(0,"17:50") con un rótulo que invite a pulsar Next en el teléfono de Luis. Así el presentador puede pulsar él mismo (y si no pulsa, el guion lo hace al avanzar). En MentorApp, después de "Can't today", mostrar en Today una línea "OK. No idea today. Take care." en vez de "Nothing pending today". SCRIPT no se toca.
Esfuerzo: M     Riesgo de romper algo: bajo (el walk usa horas, no índices de momento)
```

```
U-08 · La numeración de la capa de explicación va desordenada y no coincide con el guion de 8 pasos
Gravedad: media  (Nielsen 0-4: 2)     Evidencia: VERIFICADO (ux-m19 "7 · Protecting the mentor" el día 56; ux-m21 "6 · Severe protocol" el día 57; ux-m23 sigue "6 · Severe protocol" el día 59 con Luis en nivel 2)
Dónde: src/app/relevo/demo/page.tsx:245, 272, 281, 303, 352, 381, 397
Qué pasa y a quién afecta: el orden que ve el jurado es 1, 2, (sin número), 3, 4, 5, 7, 6, 6, 6, 7, 8. Además, "2 · Learning Luis's usual" no es el paso 2 del guion (el 2 es el copiloto). Da sensación de demo sin terminar y confunde al presentador que sigue el guion.
Criterio del jurado afectado: pulido / storytelling.
Arreglo propuesto (concreto): numerar según el guion: Matching 1, línea base sin número ("Before: learning Luis's usual"), Copilot 2, Detecting 3, Solution 4, High risk 5, Severe 6, Protecting the mentor 7, Simulation 8. En el grupo mentor del día 56 poner "7 · Protecting the mentor (starts day 56)". En el momento "resolve", título "6 · After the crisis: back to what data say".
Esfuerzo: S     Riesgo de romper algo: bajo
```

```
U-09 · Identificadores internos en castellano en "What just happened"
Gravedad: media  (Nielsen 0-4: 2)     Evidencia: VERIFICADO (ux-m9, m14, m22: "paseo_juntos (context movilidad)", "llamada_o_quedar", "most changed: fisiologia", "movil_vinculo")
Dónde: textos creados en src/lib/relevo/sim.ts:218, 297, 395, 554; se pintan en src/app/relevo/demo/page.tsx:216-232 (EngineLog)
Qué pasa y a quién afecta: la interfaz está en inglés y estos códigos con guion bajo parecen trazas de depuración delante del jurado.
Criterio del jurado afectado: pulido / UX.
Arreglo propuesto (concreto): en EngineLog, antes de `revealNames`, sustituir los ids conocidos por sus etiquetas (ACTION_LABEL de views.ts y DOMAIN_LABEL del motor; si no se pueden importar en cliente, un mapa fijo de 10 entradas en page.tsx). No hace falta tocar sim.ts.
Esfuerzo: S     Riesgo de romper algo: bajo
```

```
U-10 · Fecha caducada: "Tomorrow, Sunday, 10:00" el propio domingo después del paseo
Gravedad: media  (Nielsen 0-4: 2)     Evidencia: VERIFICADO (API mentor y me a 48 11:30: plan.when = "Tomorrow, Sunday, 10:00", whenT = domingo 10:00)
Dónde: src/lib/relevo/sim.ts:445 (whenLabel se calcula al crear el plan); src/lib/relevo/views.ts:87 y 157 (se sirve tal cual)
Qué pasa y a quién afecta: la tarjeta "Walk with Luis" de Pablo (y la de Luis) habla en futuro de algo que ya pasó. El jurado lo nota en el momento "Good → walk 0.62 → 0.70".
Criterio del jurado afectado: credibilidad / pulido.
Arreglo propuesto (concreto): en views.ts, calcular la etiqueta al servirla a partir de `whenT` y `sim.now`: "Today, 10:00", "Tomorrow, 10:00", "Yesterday, 10:00", o "Sun 25 Oct, 10:00" si está más lejos.
Esfuerzo: S     Riesgo de romper algo: bajo (comprobar que el walk no compara el texto exacto; hoy solo mira title y status)
```

```
U-11 · Los puntos del deslizador se amontonan y no se puede saltar a un paso concreto
Gravedad: media  (Nielsen 0-4: 2)     Evidencia: VERIFICADO (ux-m1: 3 puntos el día 0 solapados; 6 el día 47 en 2 círculos visibles; 5 entre los días 54 y 56)
Dónde: src/app/relevo/demo/page.tsx:173-214
Qué pasa y a quién afecta: si el presentador quiere repetir el paso 3 o saltar a la crisis porque va justo de tiempo, no puede elegir el punto correcto. Solo hay un tooltip nativo que tarda en salir.
Criterio del jurado afectado: fluidez / gestión del tiempo del pitch.
Arreglo propuesto (concreto): en el menú More, una lista "Jump to step" con los 8 pasos del guion (cada uno lleva a su primer momento). Opcional: debajo del deslizador, 8 marcas numeradas 1-8 clicables en vez de 27 puntos.
Esfuerzo: M     Riesgo de romper algo: bajo
```

```
U-12 · Después de usar el deslizador, la flecha derecha avanza un día en vez de un momento
Gravedad: media  (Nielsen 0-4: 2)     Evidencia: VERIFICADO (con el foco en el deslizador, ArrowRight pasó de día 48 11:20 a día 49 11:20, que no es ningún momento)
Dónde: src/app/relevo/demo/page.tsx:66-75 (el atajo global ignora los INPUT) y 194-205
Qué pasa y a quién afecta: el presentador arrastra el deslizador y luego sigue con → creyendo que avanza al siguiente momento. Cae en horas intermedias donde no hay nada que contar.
Criterio del jurado afectado: fluidez de la demo.
Arreglo propuesto (concreto): en `onPointerUp` del deslizador, además de `onPick`, llamar a `e.currentTarget.blur()`. Así las flechas vuelven a significar "momento". El teclado sobre el deslizador sigue funcionando si se enfoca con Tab.
Esfuerzo: S     Riesgo de romper algo: bajo
```

```
U-13 · El menú "More" queda abierto tras elegir una opción y el reset no pide confirmación
Gravedad: baja  (Nielsen 0-4: 2)     Evidencia: VERIFICADO (ux-more.png: tras "Go back to day 0", details.open = true y el menú tapa la cabecera de la clínica)
Dónde: src/app/relevo/demo/page.tsx:95-104
Qué pasa y a quién afecta: el menú tapa parte de la clínica hasta que se vuelve a pulsar "More". "Reset everything people did" borra al instante lo grabado en directo (p. ej. una nota de voz real).
Criterio del jurado afectado: pulido / prevención de errores.
Arreglo propuesto (concreto): dar un ref al <details> y hacer `ref.current.open = false` en cada opción; envolver el reset en `if (confirm("Undo everything people did? The time stays."))`.
Esfuerzo: S     Riesgo de romper algo: bajo
```

```
U-14 · "Open Luis's / Pablo's file in the clinic" solo funciona la primera vez; además queda bajo el pliegue
Gravedad: media  (Nielsen 0-4: 2)     Evidencia: VERIFICADO (ux-file1/2: abre la ficha; tras volver al Panel, un segundo clic no hace nada. A 1440×900 el enlace solo aparece tras hacer scroll en la capa)
Dónde: src/app/relevo/demo/page.tsx:38, 151, 333, 389 (setFocus con el mismo id no cambia el estado); ClinicWeb.tsx:57-59
Qué pasa y a quién afecta: el presentador pulsa el enlace, no pasa nada y repite el clic delante del jurado.
Criterio del jurado afectado: fluidez de la demo.
Arreglo propuesto (concreto): guardar el foco como `{ id, n }` con un contador que suba en cada clic (o poner null y luego el id) y que ClinicWeb reaccione al cambio de `n`. Subir el enlace al principio de la columna derecha de la capa.
Esfuerzo: S     Riesgo de romper algo: bajo
```

```
U-15 · En "Pablo level 2: a pause…" la columna enseña a Marta y no la pausa de Pablo
Gravedad: media  (Nielsen 0-4: 2)     Evidencia: VERIFICADO (ux-m24: rótulo sobre Pablo y teléfono de Marta con su V1; el M5 "A few days for you" solo aparece en el momento siguiente)
Dónde: src/app/relevo/demo/page.tsx:57 (pl1 y pl2 → marta)
Qué pasa y a quién afecta: el momento que enseña la pausa propuesta al mentor (paso 7) se presenta en el teléfono equivocado.
Criterio del jurado afectado: demostración de "proteger al mentor".
Arreglo propuesto (concreto): que solo `pl1` cambie a Marta y que `pl2` deje a Pablo (el V1 de Marta ya se vio en pl1). Si se aplica U-02, poner `look: "mentor"` y la nota "Pablo: pause offered".
Esfuerzo: S     Riesgo de romper algo: bajo
```

```
U-16 · Los fallos de red o de servidor son silenciosos: la demo se congela sin avisar
Gravedad: media  (Nielsen 0-4: 2)     Evidencia: INFERIDO
Dónde: src/app/relevo/demo/page.tsx:41 (no se usa `error` de useView) y 47 (`.catch(() => {})` en setClock)
Qué pasa y a quién afecta: si en producción falla Upstash o la wifi del recinto, "Next moment" no hace nada y las columnas se quedan con datos viejos sin ninguna señal. El presentador no sabe si esperar, recargar o cambiar al vídeo de respaldo.
Criterio del jurado afectado: fiabilidad de la demo.
Arreglo propuesto (concreto): leer `error` de useView y mostrar en la cabecera una pastilla roja "Connection lost · retrying" mientras dure. En setClock, si falla, mostrar la misma pastilla 3 s.
Esfuerzo: S     Riesgo de romper algo: bajo
```

```
U-17 · "Good evening, Pablo" a las 03:15
Gravedad: baja  (Nielsen 0-4: 1)     Evidencia: VERIFICADO (ux-m7, ux-m13)
Dónde: src/lib/relevo/views.ts:120
Qué pasa y a quién afecta: varios momentos del motor ocurren a las 03:15 y el saludo resulta raro.
Criterio del jurado afectado: pulido.
Arreglo propuesto (concreto): `h < 5 ? "Hi"`. (Mismo cambio si Luis usa un saludo parecido.)
Esfuerzo: S     Riesgo de romper algo: bajo
```

```
U-18 · En la Conversación de Pablo, el pie "Hold to talk to Luis" se parte palabra a palabra
Gravedad: baja  (Nielsen 0-4: 1)     Evidencia: VERIFICADO visualmente (ux-stuck-chat.png); causa INFERIDA
Dónde: src/app/relevo/MentorApp.tsx:111-115
Qué pasa y a quién afecta: queda una columna de una palabra por línea encima de la grabadora: parece roto.
Criterio del jurado afectado: pulido visual.
Arreglo propuesto (concreto): revisar el ancho del Recorder `compact` (probablemente ocupa más de lo previsto). Dar `min-w-0` al texto y `shrink-0` al recorder, o esconder el texto cuando no cabe. Comprobar con captura.
Esfuerzo: S     Riesgo de romper algo: bajo
```

```
U-19 · La llamada programada no se ve en el panel de la clínica
Gravedad: baja  (Nielsen 0-4: 1)     Evidencia: VERIFICADO (ux-m15: a las 10:10 del día 54 la fila de Luis sigue con "Call today"; "Call scheduled for…" solo aparece dentro de la ficha, ClinicWeb.tsx:341)
Dónde: src/app/relevo/ClinicWeb.tsx (fila del panel)
Qué pasa y a quién afecta: el momento "Clinic schedules a call → V4" solo cambia el teléfono de Luis. La clínica no confirma lo que acaba de hacer.
Criterio del jurado afectado: claridad del rol de la clínica.
Arreglo propuesto (concreto): en la fila, si hay una llamada programada sin hacer, cambiar el botón por la pastilla "Call · Sun 12:00".
Esfuerzo: S     Riesgo de romper algo: bajo
```

```
U-20 · Al final no hay "Start again" visible
Gravedad: baja  (Nielsen 0-4: 1)     Evidencia: VERIFICADO (ux-m26: "Next moment" desactivado; volver al día 0 está escondido en More)
Dónde: src/app/relevo/demo/page.tsx:94
Qué pasa y a quién afecta: al jurado que prueba la demo por su cuenta, o a quien la presenta otra vez, no le queda claro cómo reiniciar.
Criterio del jurado afectado: usabilidad para el jurado.
Arreglo propuesto (concreto): en el último momento, sustituir el botón por "Start again" (que lleva a 08:10 del día 0 y hace el reset con confirmación).
Esfuerzo: S     Riesgo de romper algo: bajo
```

```
U-21 · La alerta grave y el reenvío a guardia solo se ven en la pestaña Alerts o en el registro (solo arreglo visual)
Gravedad: media  (Nielsen 0-4: 2)     Evidencia: VERIFICADO (ux-m21/m22: el panel muestra "1 Severe alerts" y "Call now"; entre 21:12 y 21:27 solo cambia "15 min ago"; el "forwarded to the on-call lead" solo sale en "What just happened")
Dónde: src/app/relevo/demo/page.tsx (momentos crisis/forward); ClinicWeb.tsx (pestaña Alerts)
Qué pasa y a quién afecta: el momento "Unattended 15 min → on-call lead" no tiene nada visible en la clínica, que es donde ocurre.
Criterio del jurado afectado: seguridad clínica demostrada.
Arreglo propuesto (concreto): solo en la carcasa de la demo, y sin tocar la lógica de crisis: en los momentos `crisis` y `forward`, abrir la clínica en la pestaña Alerts (prop `focusTab="alerts"`, el mismo mecanismo que U-04 y U-14).
Esfuerzo: S     Riesgo de romper algo: bajo (solo navegación visual)
```

```
U-22 · La tercera nota del copiloto "la puede grabar quien presenta", pero el flujo de momentos no deja hacerlo
Gravedad: baja  (Nielsen 0-4: 1)     Evidencia: INFERIDO
Dónde: src/lib/relevo/sim.ts:119-122 (comentario de SCRIPT) y 584; demo.ts:14 (el momento cae a las 21:10, cuando el guion ya la envió)
Qué pasa y a quién afecta: si el equipo quiere grabar la nota en directo para lucir la transcripción, tiene que arrastrar el deslizador al día 40 antes de las 21:10 (funciona por casualidad si se viene del momento de las 20:00). No hay un momento preparado para eso.
Criterio del jurado afectado: demostración de la IA o transcripción en directo (opcional).
Arreglo propuesto (concreto): añadir el momento at(40,"21:00") "Luis records a third note (you can record it live)". Si nadie graba, el guion la envía al avanzar.
Esfuerzo: S     Riesgo de romper algo: bajo
```

## 6. Orden de arreglo sugerido (máximo efecto en la demo por minuto)

1. **U-04 + U-05** (reiniciar pestañas al cambiar de momento): S. Quita la trampa más probable en directo.
2. **U-03** (aviso del copiloto en Today): S.
3. **U-06** (volver atrás deshace): S, riesgo medio, pasar los dos scripts.
4. **U-07 + U-22** (momentos un minuto antes; confirmación de "Can't today"): M.
5. **U-01 (1)** (atajo "E" y capa cerrada en pantallas bajas) **+ U-12 + U-13 + U-14 + U-15**: todos S.
6. **U-08, U-09, U-10, U-17**: textos, S.
7. **U-02** (anillo "Look here"), **U-11** ("Jump to step"), **U-21**, **U-16**: M/S.
8. U-18, U-19, U-20: si sobra tiempo.

Nada de lo propuesto toca `engine.ts`, `SCRIPT`, `BANDIT_SALT`, la lista de crisis, el nivel 3, la alerta ni el contenido de M6. U-21 es solo navegación visual de la demo.
