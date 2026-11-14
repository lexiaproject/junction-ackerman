# F1 · Informe del Juez de Producto (Relevo)

Fecha: sáb 14 nov 2026, ~11:10 (hora de Finlandia) · Rama `sesion-autonoma` · Solo lectura.

## Supuestos y método
- **Supuesto:** no hay criterios oficiales del reto. Uso cuatro ejes con el mismo peso: (1) impacto y encaje con "Beyond the Clinic", (2) innovación, (3) ejecución técnica, (4) presentación y experiencia.
- Me pongo en el lugar de un jurado que ve una demo de 3 minutos en un proyector y después abre el repositorio de GitHub.
- **Qué comprobé (VERIFICADO):**
  - `node scripts/relevo-demo-walk.mjs`: 19/19 en 1,5 s, con el texto de respaldo.
  - `node scripts/relevo-check.mjs`: 33/33.
  - Mundos propios (`juezq7k2m9`, `juezb…`, `juezc…`) recorridos por la API, saltando a cada momento sin pulsar nada en la interfaz.
  - Capturas de `/relevo/demo` a 1920×1080, 1440×900 y 1280×720 en los días 40, 47, 57 y 62, sin errores ni avisos en la consola.
  - Tiempos de respuesta de la API: `/clinic` tarda 1,6 s la primera vez tras mover el reloj y unos 45 ms después; el resto, menos de 0,4 s.
  - Producción: `GET /relevo` y `/relevo/demo` responden 200 (solo lectura).
- **Aviso de método:** el navegador Playwright lo **comparten** los 9 especialistas. Durante mi sesión otro agente cambió la pestaña activa (vi `w=uxinv…`, `w=dzn7…` y `w=a11yx…`). Solo cuento como verificadas las capturas cuya URL confirmé que era mi mundo `juezq7k2m9`.

## Puntuación (1-10)

| Eje | Nota | En una frase |
|---|---|---|
| 1 · Impacto y encaje | **8** | Responde de lleno al reto (mantenimiento en casa tras la TMS, con personas en el centro y solo la clínica viendo datos), pero la demo no cuenta el problema antes de enseñar la solución. |
| 2 · Innovación | **8** | La cadena de pacientes, la normalidad propia de cada persona con persistencia de 3 días, el aprendizaje por pareja (Thompson sampling), el copiloto y la protección del mentor son originales y van bien juntos. |
| 3 · Ejecución técnica | **7** | Simulación determinista con los mismos números que Python (33/33 y 19/19) y respaldo si falla Gemini. En contra: README de plantilla, cifras finales fijas sin fuente, claves internas en castellano que se ven en pantalla y llamadas a Gemini que pueden bloquear. |
| 4 · Presentación y experiencia | **6** | El diseño es cuidado y coherente, pero en un proyector apenas se leen los móviles y la clínica. Hay 27 paradas para 3 minutos, y el copiloto no se ve en el móvil de Pablo justo en su momento. |

**Media aproximada: 7,3.** Lo que más nota puede subir con poco esfuerzo es el eje 4 (y la parte de "repositorio presentable" del eje 3).

### Evidencia por eje
**1 · Impacto (8)**
- (+) El guion cubre el ciclo completo: emparejamiento, normalidad propia, detección temprana, solución humana, clínica, crisis y protección del mentor (`src/lib/relevo/demo.ts:9-37`).
- (+) Los principios se ven en pantalla: "Luis and Pablo never see any of this" y "Pablo never sees a number about himself" (`demo/page.tsx:146`, `:388`).
- (−) El primer fotograma de la demo dice "Before the demo starts" y muestra a Luis con un avatar "?". No aparece por qué hace falta Relevo (qué pasa cuando termina la TMS) ni para quién es (VERIFICADO, captura del día 0).
- (−) La portada `/relevo` explica la idea pero no el problema (`src/app/relevo/page.tsx:15-18`).

**2 · Innovación (8)**
- (+) Emparejar por cómo empezó la última recaída (0,87 frente a 0,758) se explica en la capa de explicación con la tabla de huellas (VERIFICADO).
- (+) "Primero se pregunta al mentor" y "Can't today" se respetan de verdad en la API (pasos 3 y 5 VERIFICADOS).
- (+) El copiloto solo lo ve el mentor (paso 2 VERIFICADO).
- (−) El jurado no ve el copiloto si nadie toca la pestaña "Conversation" (J-03).

**3 · Ejecución técnica (7)**
- (+) Saltar de momento en momento sin pulsar nada en la interfaz también funciona: el guion hace solo las acciones. Comprobado a las 08:41 del día 47 (V2), a las 11:20 (plan aceptado) y a las 11:30 del día 48 (paseo 0,70). La demo aguanta aunque el presentador solo pulse "Next moment".
- (+) Sin errores en la consola en ningún momento que capturé.
- (−) El README es el de plantilla de create-next-app (J-01).
- (−) Las cifras del cierre están escritas a mano sin `// MOCK:` ni fuente (J-07).
- (−) Se ven `movilidad`, `paseo_juntos`… en el registro "What just happened" (J-05).
- (−) Con clave de Gemini, una petición puede quedarse esperando hasta unos 20 s (J-06).

**4 · Presentación (6)**
- (+) Tipografía, color y tono buenos. La crisis es clara: hoja de ayuda, "3 Severe · Call now" en la clínica y M6 tranquilo para Pablo (VERIFICADO, día 57).
- (−) Con la capa de explicación abierta, a 1280×720 cada móvil mide unos 130 px de ancho y la clínica unos 490 px. A 1920×1080 el texto de la clínica ronda los 7 px (VERIFICADO). Al cerrar la capa, los móviles sí se leen (VERIFICADO a 1280×720).
- (−) 27 momentos en el deslizador para una demo de 3 minutos (J-04).
- (−) La capa de explicación usa jerga: "EWMA, λ 0.3", "robust z", "Beta probability", "prodrome".

---

## Los TRES cambios que más subirían la nota

1. **J-02 · Modo foco para proyector.** Tecla `E` para abrir y cerrar la capa de explicación, más un resaltado de la superficie donde ocurre cada momento. Hoy el jurado no lee lo que pasa en los móviles: esto sube el eje 4 directamente. Esfuerzo M, riesgo bajo.
2. **J-01 · README de verdad**, con enlace directo a `/relevo/demo`, qué es simulado y cómo se ejecuta. Es lo primero que abre un jurado técnico y hoy es la plantilla de Next.js; sube los ejes 3 y 4. Esfuerzo S, riesgo nulo.
3. **J-03 + J-04 · Que el guion se vea en 3 minutos:**
   - J-03: aviso del copiloto en "Today" de Pablo (S).
   - J-04: "visita corta" de 8 paradas que coinciden con los 8 pasos del contrato (M).

   Juntos hacen que cada pulsación de "Next moment" enseñe algo visible y que la demo quepa en el tiempo. Riesgo bajo.

Justo detrás, por coste mínimo: J-08 (contexto inicial "por qué Relevo"), J-05 (claves en castellano) y J-09 ("Tomorrow, Sunday" en el momento "Good").

---

## Backlog priorizado (estilo RICE)

Alcance = cuántos jurados o momentos de la demo lo notan (1-3) · Impacto en la nota (1-3) · Confianza (%) · Esfuerzo (S=1, M=2, L=3). Puntuación = A×I×C/E.

| # | ID | Título | A | I | C | E | Puntuación | Prioridad |
|---|---|---|---|---|---|---|---|---|
| 1 | J-01 | README de plantilla | 3 | 3 | 90 % | S | 8,1 | 2 · nota/esfuerzo |
| 2 | J-03 | Copiloto invisible en "Today" | 3 | 2 | 90 % | S | 5,4 | 2 |
| 3 | J-05 | Claves internas en castellano en el registro | 3 | 2 | 90 % | S | 5,4 | 2 |
| 4 | J-02 | Ilegible en proyector / modo foco | 3 | 3 | 80 % | M | 3,6 | 1 · puede hacer fallar la demo |
| 5 | J-08 | Falta el "por qué" al abrir la demo | 3 | 2 | 70 % | S | 4,2 | 2 |
| 6 | J-09 | "Tomorrow, Sunday" cuando el paseo ya pasó | 2 | 2 | 100 % | S | 4,0 | 2 |
| 7 | J-06 | Gemini puede bloquear hasta ~20 s | 2 | 3 | 60 % | S | 3,6 | 1 |
| 8 | J-07 | Cifras del cierre fijas sin fuente ni MOCK | 2 | 2 | 80 % | S | 3,2 | 2 |
| 9 | J-04 | 27 paradas para 3 minutos | 3 | 2 | 80 % | M | 2,4 | 2 |
| 10 | J-10 | Texto del copiloto: "you're both sleeping" | 1 | 1 | 90 % | S | 0,9 | 3 |
| 11 | J-11 | "Half an hour" frente a "20-minute walk" | 1 | 1 | 100 % | S | 1,0 | 3 |
| 12 | J-12 | "Open Luis's file" no funciona la segunda vez | 1 | 1 | 70 % | S | 0,7 | 3 |
| 13 | J-13 | Solapes de texto a menos de 1100 px | 1 | 1 | 100 % | S | 1,0 | 3 |
| 14 | J-14 | La raíz `/` abre Relay, no Relevo | 2 | 2 | 60 % | S | 2,4 | 2 (solo mitigar) |
| 15 | J-15 | Carpeta `.claude/.playwright-mcp/` sin ignorar | 1 | 1 | 100 % | S | 1,0 | 3 (higiene) |

---

## Hallazgos y propuestas

```
J-01 · El README del repositorio es la plantilla de create-next-app
Gravedad: alta     Evidencia: VERIFICADO
Dónde: README.md:1-36
Qué pasa y a quién afecta: El jurado que abre GitHub lee "This is a Next.js project bootstrapped with create-next-app".
  No sabe qué es Relevo, ni cómo abrir la demo, ni qué es simulado. CLAUDE.md exige un README con todo eso.
Criterio del jurado afectado: 3 (ejecución), 4 (presentación); también la honestidad sobre lo simulado (1).
Arreglo propuesto (concreto): Reescribir el README en inglés: qué hace (2 líneas), el problema (el mantenimiento tras la TMS),
  enlace grande a https://junction-ackerman.vercel.app/relevo/demo, el recorrido en 8 pasos con los números del contrato,
  qué es real y qué simulado (copiar el pie de src/app/relevo/page.tsx:27 y las líneas MOCK), tecnologías, cómo ejecutarlo
  (npm install, npm run dev, variables de .env.example) y licencia MIT. Avisar de que "/" es la versión anterior (Relay).
Esfuerzo: S     Riesgo de romper algo: bajo (no toca código)
```

```
J-02 · En proyector no se leen los móviles ni la clínica con la capa de explicación abierta
Gravedad: alta     Evidencia: VERIFICADO
Dónde: src/app/relevo/demo/page.tsx:37 (la capa empieza abierta), :111-135 (3 columnas con Fit), :138 (la capa ocupa lg:h-[38vh])
  Pasos: abrir /relevo/demo a 1280×720 → cada móvil mide unos 130 px y la clínica unos 490 px; a 1920×1080 el texto de la clínica ronda los 7 px.
Qué pasa y a quién afecta: Al jurado, en la sala. Lo que "pasa" en cada momento (V2, el plan, M6, "Review pace")
  no se lee desde la mesa. Al cerrar la capa los móviles sí se leen, pero el presentador tiene que pulsar el interruptor con el ratón.
Criterio del jurado afectado: 4 (presentación); indirectamente 2 (la innovación no se ve).
Arreglo propuesto (concreto): (a) Atajo de teclado `E` que abre y cierra la capa, junto a los ← → que ya existen en page.tsx:66-75 (S).
  (b) Añadir a cada momento de MOMENTS un campo `focus: "luis" | "mentor" | "clinic" | "engine"` y, en Column, poner un anillo
  teal y bajar un poco la opacidad de las otras dos columnas (M). Por ejemplo: copilot → mentor, v4 → luis, l2 → clinic, close → engine.
  No hace falta cambiar el layout ni el Fit.
Esfuerzo: M     Riesgo de romper algo: bajo (solo la vista de demo)
```

```
J-03 · En el momento "copilot", el móvil de Pablo dice "Nothing pending today"
Gravedad: alta     Evidencia: VERIFICADO
Dónde: src/app/relevo/MentorApp.tsx:97-106 (el copiloto solo se pinta en la pestaña Conversation) y :307 ("Nothing pending today.")
  Pasos: reloj en el día 40, 21:15 → la capa explica "Pablo gets a private suggestion", pero el móvil de Pablo muestra su pantalla Today vacía.
Qué pasa y a quién afecta: Al jurado. Una de las piezas más originales (el copiloto) no aparece en el móvil cuando se habla de ella,
  y el presentador tiene que acordarse de tocar una pestaña diminuta.
Criterio del jurado afectado: 2 (innovación), 4 (presentación).
Arreglo propuesto (concreto): En Today, si data.copilot existe, mostrar una tarjeta rv-notice pequeña con el candado
  ("Only you see this · A tip for your next note to Luis") y un botón "Open" que llame a onTab("chat","mentee").
  No cambia la lógica ni lo que ve Luis.
Esfuerzo: S     Riesgo de romper algo: bajo
```

```
J-04 · 27 paradas en el deslizador para una demo de 3 minutos
Gravedad: media     Evidencia: VERIFICADO (src/lib/relevo/demo.ts:9-37 tiene 27 momentos)
Dónde: src/lib/relevo/demo.ts:9-37; src/app/relevo/demo/page.tsx:52-60 (next)
Qué pasa y a quién afecta: Al presentador y al jurado. A unos 6 s por parada no da tiempo a explicar nada.
  Si se salta con el deslizador, se pierden momentos que el guion necesita (V1 → Yes → V2).
Criterio del jurado afectado: 4.
Arreglo propuesto (concreto): Marcar 8 momentos clave con `key: true`: match, copilot, v1/yes, good, v4, crisis, pl2, close.
  Añadir en "More" un interruptor "Short tour (8 stops)" para que Next y Prev salten solo entre esos.
  Las paradas intermedias se siguen viendo en la línea de tiempo. No toca SCRIPT: el guion hace solo las acciones intermedias (VERIFICADO).
Esfuerzo: M     Riesgo de romper algo: bajo
```

```
J-05 · Claves internas en castellano en el registro "What just happened"
Gravedad: media     Evidencia: VERIFICADO
Dónde: el texto se crea en src/lib/relevo/sim.ts:297 y :395 y se sirve sin traducir en src/lib/relevo/demo.ts:120
  Ejemplos que devuelve /api/relevo/demo: "Pablo enters level 2 (most changed: movilidad)",
  "Idea for Marta about Pablo: paseo_juntos (context movilidad)", "Eero enters level 1 (most changed: movil_vinculo)".
Qué pasa y a quién afecta: Al jurado (la interfaz está en inglés). Se nota "a medio terminar" y de paso deja ver nombres internos.
Criterio del jurado afectado: 4, 3.
Arreglo propuesto (concreto): En demo.ts:120, al servir `text`, sustituir con una expresión regular cada clave de DOMAIN_LABEL
  y ACTION_LABEL (ya importados en demo.ts) por su etiqueta en inglés. No hace falta tocar sim.ts.
Esfuerzo: S     Riesgo de romper algo: bajo
```

```
J-06 · Con clave de Gemini, el móvil del mentor y el envío de notas pueden quedarse esperando hasta ~16-20 s
Gravedad: alta (en producción, en el directo)     Evidencia: INFERIDO (en local no hay clave, a propósito)
Dónde: src/lib/relevo/ai.ts:9-27 (timeout de 10 s × 2 intentos; 8 s × 2 en analyseNote);
  src/app/api/relevo/mentor/route.ts:21-29 (el GET espera a Gemini); src/app/api/relevo/note/route.ts:31 (la nota espera a analyseNote)
Qué pasa y a quién afecta: Si la wifi de la sala va mal o Gemini tarda, después de "Yes" (paso 3) el móvil de Pablo no
  enseña la idea del paseo hasta que vuelve la llamada. Además, cada sondeo de 4 s lanza otra llamada a Gemini mientras la
  primera no ha terminado (no se guarda nada hasta que acaba). Una nota grabada en directo puede tardar hasta 16 s en enviarse.
  La crisis la detecta la lista fija, pero la nota no llega antes de que responda Gemini.
Criterio del jurado afectado: 3, 4 (riesgo de fallo en la demo).
Arreglo propuesto (concreto): Solo en ai.ts (sin tocar el modelo): bajar a 1 intento con timeout de 4 s para draftIdeaMessage
  y 3 s para analyseNote. En mentor/route.ts, guardar una marca "pidiendo" en un Map en memoria para no repetir la llamada mientras está en curso.
  OJO: cambiar el timeout de analyseNote influye en lo que tarda la nota de crisis en llegar. El arreglo solo la hace más rápida
  y no cambia ninguna regla, pero toca el camino de crisis: que lo apruebe el Director.
Esfuerzo: S     Riesgo de romper algo: medio (ruta con Gemini; comprobarla una vez con la clave real)
```

```
J-07 · Las cifras del cierre (88 %, 5 días, 2,45) están escritas a mano, sin fuente ni marca MOCK
Gravedad: media     Evidencia: VERIFICADO
Dónde: src/lib/relevo/demo.ts:121 (evaluation: { l1: { sensitivity: 0.88, lead: 5, … } … })
Qué pasa y a quién afecta: Un jurado técnico preguntará "¿esto se calcula aquí?". La portada dice que el motor de riesgo es real,
  y estas cifras vienen de la evaluación con Python. Si no se cuenta de dónde salen, parecen inventadas.
Criterio del jurado afectado: 3, 1 (credibilidad).
Arreglo propuesto (concreto): Comentario `// MOCK: resultados de la evaluación offline del motor de referencia (Python, 200 personas
  sintéticas, 100 recaídas)` en demo.ts:121. En la tarjeta del cierre (demo/page.tsx:397), añadir "From our offline evaluation of the
  reference engine (Python) · same engine as this demo". Los números no cambian.
Esfuerzo: S     Riesgo de romper algo: bajo
```

```
J-08 · Al abrir la demo no se cuenta el problema (por qué hace falta Relevo)
Gravedad: media     Evidencia: VERIFICADO (captura del día 0, 08:00: "Before the demo starts", Luis con un "?")
Dónde: src/app/relevo/demo/page.tsx:90 y :235-268 (con index -1 la capa ya enseña el emparejamiento)
Qué pasa y a quién afecta: Un jurado que llega sin contexto ve tres pantallas y una tabla de huellas sin saber qué problema
  del reto se resuelve. El eje "impacto" se gana en los primeros 15 segundos.
Criterio del jurado afectado: 1, 4.
Arreglo propuesto (concreto): Con data.index === -1 (antes del primer momento), que la capa enseñe una tarjeta "Beyond the clinic"
  de 3 líneas: después de la TMS la persona se va a casa sola; Relevo une a cada paciente con otro que acabó unos meses antes; el móvil
  avisa a una persona, no a una alarma, y solo la clínica ve datos. Añadir "Press → to start". Sin cifras clínicas que no podamos citar.
Esfuerzo: S     Riesgo de romper algo: bajo
```

```
J-09 · En el momento "Good" (paso 4 del contrato), el plan de Luis dice "Tomorrow, Sunday, 10:00" y debajo "How did it go?"
Gravedad: media     Evidencia: VERIFICADO
Dónde: src/lib/relevo/texts.ts:27 y :57 (etiqueta fija al crear el plan); sim.ts:445 (whenLabel); views.ts:87 y :157 (la sirven tal cual)
  Pasos: reloj en el día 48, 11:25 → /api/relevo/me?as=luis devuelve plan.when "Tomorrow, Sunday, 10:00", past: true, askFeedback: true,
  con fecha de hoy "Sunday, 25 October".
Qué pasa y a quién afecta: Al jurado, en uno de los 8 pasos clave: el paseo "es mañana" pero ya se pide cómo fue. Lo mismo en el móvil de Pablo.
Criterio del jurado afectado: 4 (coherencia), 3.
Arreglo propuesto (concreto): En views.ts (las dos líneas), calcular la etiqueta a partir de whenT frente a sim.now: "Today, 10:00",
  "Tomorrow, Sunday, 10:00" o "Sun 25 Oct, 10:00" si ya pasó (dayLabel y hhmm ya existen). No toca sim.ts ni SCRIPT.
Esfuerzo: S     Riesgo de romper algo: bajo (la comprobación del paso 4 mira title y status, no when)
```

```
J-10 · El texto del copiloto dice "how badly you're both sleeping", pero solo se queja Luis
Gravedad: baja     Evidencia: VERIFICADO
Dónde: src/lib/relevo/texts.ts:106 (sale en /api/relevo/mentor → copilot.text)
Qué pasa y a quién afecta: A Pablo y al jurado que lo lea. Parece que el sistema habla de la salud de Pablo, y uno de los principios es no hacerlo.
Criterio del jurado afectado: 4, 1.
Arreglo propuesto (concreto): "You've had several notes in a row about how badly Luis is sleeping. Try validating how he feels and suggesting something small."
  (Usar ${mentee}.)
Esfuerzo: S     Riesgo de romper algo: bajo
```

```
J-11 · El título del plan es "20-minute walk" y la nota del mentor dice "Half an hour"
Gravedad: baja     Evidencia: VERIFICADO
Dónde: src/lib/relevo/texts.ts:23-24
Qué pasa y a quién afecta: Al jurado, que ve las dos cosas en la misma tarjeta (A5). Pequeña incoherencia.
Criterio del jurado afectado: 4.
Arreglo propuesto (concreto): Cambiar el texto de respaldo a "… fancy a stroll tomorrow at 10? Twenty minutes, no rush". La prompt de Gemini ya pide "same plan".
Esfuerzo: S     Riesgo de romper algo: bajo
```

```
J-12 · "Open Luis's file in the clinic" no hace nada la segunda vez
Gravedad: baja     Evidencia: INFERIDO
Dónde: src/app/relevo/demo/page.tsx:38, :151 (setFocus(id)); src/app/relevo/ClinicWeb.tsx:56-59 (useEffect que depende de onFocusPerson)
Qué pasa y a quién afecta: Al presentador. Si abre la ficha, vuelve con "Back" (setPerson(null) dentro de la clínica) y pulsa otra vez el enlace,
  `focus` sigue valiendo "luis", el efecto no se dispara y la ficha no se abre.
Criterio del jurado afectado: 4.
Arreglo propuesto (concreto): Pasar un contador junto al id ({ id, n }) o poner setFocus(null) y luego el id. Cambio de 2 líneas.
Esfuerzo: S     Riesgo de romper algo: bajo
```

```
J-13 · Textos que se pisan en pantallas de menos de unos 1100 px
Gravedad: baja     Evidencia: VERIFICADO (captura a ~1037 px)
Dónde: src/app/relevo/demo/page.tsx:207-209 ("Baseline ends · day 27Prodrome starts · day 35" se juntan);
  :284 (cabecera de la tabla del copiloto "NegativeRepetitionActionIndex" sin espacios); :140-146 (el interruptor y su descripción se parten en dos líneas)
Qué pasa y a quién afecta: Al jurado si el portátil de la presentación tiene poca resolución o el zoom alto.
Criterio del jurado afectado: 4.
Arreglo propuesto (concreto): Ocultar la etiqueta "Prodrome starts" por debajo de lg (max-lg:hidden); px-2 en los th de la tabla
  del copiloto; truncate en la descripción del interruptor.
Esfuerzo: S     Riesgo de romper algo: bajo
```

```
J-14 · La URL raíz del despliegue abre la app antigua (Relay), no Relevo
Gravedad: media     Evidencia: INFERIDO (src/app/page.tsx:16-24 solo tiene una franja con enlace a /relevo/demo)
Dónde: https://junction-ackerman.vercel.app/ ; src/app/page.tsx
Qué pasa y a quién afecta: Un jurado que escribe el dominio a mano ve otro producto y puede pensar que es la entrega.
Criterio del jurado afectado: 4, 1.
Arreglo propuesto (concreto): Relay no se toca, así que solo se puede mitigar fuera de la app. Que todos los enlaces de la entrega
  (README, Devpost, slides) apunten a /relevo/demo, y en el README una línea "/ is our earlier prototype (Relay)".
Esfuerzo: S     Riesgo de romper algo: bajo
```

```
J-15 · La carpeta .claude/.playwright-mcp/ (capturas y logs del navegador) no está en .gitignore
Gravedad: baja     Evidencia: VERIFICADO (git status: "?? .claude/.playwright-mcp/")
Dónde: .gitignore
Qué pasa y a quién afecta: Al equipo. Un `git add -A` subiría decenas de capturas y logs al repositorio público.
  (La creó la herramienta Playwright de los especialistas, también la mía.)
Criterio del jurado afectado: 3 (higiene del repositorio).
Arreglo propuesto (concreto): Añadir `.claude/.playwright-mcp/` a .gitignore, o borrarla al terminar la fase (preguntando antes, regla 6).
Esfuerzo: S     Riesgo de romper algo: bajo
```

---

## Lo que miré y está bien (no tocar)
- La API sirve los números del contrato exactos: 0,87 · 0,758 · 0,62→0,70 · 88 % · 5 días · 2,45 · paseo el 24/10 · llamada el 31/10 (19/19).
- Saltar momentos sin acciones del presentador no rompe nada: el guion las hace.
- Crisis (día 57, 21:13): ayuda abierta para Luis, M6 tranquilo para Pablo ("The clinic team is in touch with Luis"), "3 Severe · Call now" en la clínica, aviso a la persona de guardia a los 15 min explicado en la capa.
- Día 62: la clínica enseña a Luis con "No active mentor" y a Pablo con "Review pace"; Pablo ve M5 "A few days for you" sin ningún número.
- Ningún error ni aviso en la consola durante el recorrido.

## No lo pude comprobar
- La ruta con Gemini real (sin clave, a propósito) → J-06 queda como INFERIDO.
- La grabadora con micrófono real (no hay micrófono en Playwright).
- La vista móvil de la demo en mi propio mundo: el navegador compartido estaba en manos de otro agente. En `w=a11yx…`, a 390 px, `scrollWidth` era 380, sin desbordamiento horizontal.

## Nota para el Director (proceso)
- El navegador Playwright es uno solo para todos los agentes en paralelo: se cambian la pestaña activa y el tamaño de ventana entre ellos. Las verificaciones visuales de otros informes pueden ser de otro mundo. Conviene que en la fase de arreglos solo un agente use el navegador cada vez, o que cada uno abra pestaña con `isolatedContext` y confirme la URL en cada captura.
