# Ciclo 2 · Revisión de código

Revisor de código. Alcance: `git diff HEAD` (13 archivos de `src/`, sin confirmar). Solo lectura. No he leído los informes de los autores.

## Qué he comprobado
- `node scripts/relevo-check.mjs`: todo OK (motor y lista de aceptación). `npx tsc --noEmit` y `npx eslint src/app/relevo src/lib/relevo`: sin errores.
- Intocables: `git diff inicio-sesion -- engine.ts ai.ts` vacío. En `sim.ts` solo cambia `offerV3` (`SCRIPT` y `BANDIT_SALT` siguen igual). No se ha tocado ningún archivo de Relay. Los textos de la hoja de ayuda (112, MIELI, clínica, mentor) son los mismos; solo se ha movido la confirmación. M6 sin cambios.
- Por la API, en un mundo de prueba (`revc2x31017`):
  - V3 del día 55: "Fancy sending Pablo a note? A few words are enough." (id `V3:luis:54`, se sigue aplazando detrás de V4).
  - Rótulo del plan: "Tomorrow, Sunday, 10:00" el día 47 y "Today, 10:00" el día 48.
  - M0 de Pablo: 87 %, con primera razón "Your clinic thinks you have a lot in common". La capa de la demo sigue enseñando la huella completa.
  - Traza en inglés ("Call or meet up", "context mobility", "most changed: mobility").
- En el navegador (Playwright, mundo `revc2z5697`): RC2-01 y RC2-02 reproducidos.

## Veredicto por grupo
| Grupo | Veredicto |
|---|---|
| `demo/page.tsx`, `MentorApp.tsx`, `ClinicWeb.tsx` (reinicio por momento, ficha repetible, tarjeta del copiloto, M5, Help 44 px, cierre, "Beyond the clinic") | **Aprobado** (detalles RC2-06 y RC2-07) |
| `page.tsx` (texto honesto) | **Aprobado** |
| `demo.ts` (traza sin claves en castellano) | **Aprobado** |
| `views.ts` (rótulo del plan, razón de M0) | **Aprobado** (detalle RC2-09) |
| `texts.ts` + `sim.ts` (`V3_CANT`, texto del copiloto) | **Aprobado** (detalle RC2-05) |
| `kit.tsx` (`Sheet`), `MenteeApp.tsx`, `relevo.css` (accesibilidad) | **Rechazado hasta arreglar RC2-01 y RC2-02**. Los dos arreglos son pequeños. |

## Hallazgos

### RC2-01 · La hoja de crisis de Luis se queda con el foco y la flecha → deja de avanzar la demo · ALTA · VERIFICADO
- **Dónde:** `src/app/relevo/kit.tsx`, en `Sheet` (`const take = !prev || prev === document.body || scope.contains(prev)`), junto con el manejador de teclas de `demo/page.tsx` (`if (el.closest?.('[role="dialog"],...')) return;`).
- **Qué pasa:** quien presenta solo con el teclado (la propia tarjeta de inicio dice "Press → to start") tiene el foco en `<body>`. En el momento de crisis (día 57) la hoja A3 de Luis se abre sola. Como el foco está en `body`, `take` vale `true` y el foco salta al `h2` "Need help right now?". A partir de ahí, la demo ignora las flechas porque el foco está dentro de un `role="dialog"`.
- **Reproducido:** con el reloj en el momento `v5`, pulsé → y la demo pasó a `crisis` con el foco en el H2 de la hoja. Pulsé → otra vez y siguió en `crisis`. Hay que pulsar Escape o hacer clic fuera para continuar, y en el paso más delicado del guion.
- **Efecto secundario:** con `aria-modal="true"`, un lector de pantalla tampoco llega a los controles de quien presenta mientras la hoja esté abierta.
- **Arreglo:** que la hoja abierta automáticamente no tome el foco. Por ejemplo, añadir a `Sheet` una propiedad `autoFocus?: boolean` (por defecto `true`) y que `MenteeApp` pase `autoFocus={false}` cuando la apertura venga de `data.openHelp`; eso supone guardar en `help` el origen de la apertura. No basta con quitar `prev === document.body` de `take`: en Safari, un clic en un botón no le da el foco, y la hoja abierta a mano tampoco lo recibiría.

### RC2-02 · Al pedir la segunda ayuda desaparece la primera confirmación y "Talk to my clinic" se puede repetir · MEDIA · VERIFICADO
- **Dónde:** `src/app/relevo/MenteeApp.tsx`, en `HelpSheet` (`const [done, setDone] = useState("")`, un único valor).
- **Qué pasa:** pulso "Talk to my clinic" y sale "They'll call you as soon as possible". Después pulso "Ask Pablo to write to me": `done` pasa a valer `"mentor"`, la confirmación de la clínica desaparece y su botón vuelve a `aria-disabled="false"`.
- **Reproducido:** en el navegador quedaron `s2 = ["", "Pablo has your message"]` y `clinicAriaDisabled: "false"`. Un segundo toque vuelve a mandar `help {type:"clinic"}`, justo lo que el objetivo pedía evitar ("sin repetir la acción"), y Luis ya no ve que la clínica le va a llamar.
- **Arreglo:** guardar las dos confirmaciones por separado, por ejemplo `const [done, setDone] = useState<{ clinic?: boolean; mentor?: boolean }>({})`, con `setDone(d => ({ ...d, clinic: true }))`, y comprobar `done.clinic` / `done.mentor`.

### RC2-03 · Doble toque rápido en la hoja de ayuda: la petición sale dos veces · BAJA · VERIFICADO (al leer el código)
- **Dónde:** `MenteeApp.tsx`, en `HelpSheet`, dentro de los `onClick`.
- **Qué pasa:** la guarda `if (done === …) return` solo funciona cuando el `await act(...)` ya ha terminado. Dos toques mientras la petición está en camino envían dos avisos. Antes ocurría lo mismo con `disabled`.
- **Arreglo:** marcar el envío como pendiente (en un `useRef` o en el estado) antes del `await`.

### RC2-04 · La confirmación de ayuda sale aunque el envío falle · BAJA · INFERIDO (ya existía antes)
- **Dónde:** `MenteeApp.tsx`, en `HelpSheet`: `await act(...).catch(() => {})` y después `setDone(...)`.
- **Qué pasa:** si no hay red o el servidor falla, Luis lee "They'll call you as soon as possible" o "Pablo has your message" sin que nadie lo haya recibido. El error se pierde sin avisar, y en la zona de crisis.
- **Arreglo, a decidir por el equipo** (el camino de crisis solo admite arreglos visuales): en caso de error, enseñar "Couldn't send. Please call 112 or your clinic" en vez de la confirmación.

### RC2-05 · El catálogo de textos de la clínica no incluye la variante nueva de V3 · BAJA · VERIFICADO
- **Dónde:** `src/app/relevo/ClinicWeb.tsx`, constante `NOTICE_TEXTS` (C5): solo aparece "…Pablo would love to hear from you".
- **Qué pasa:** la clínica no ve que existe la variante "A few words are enough." que se usa tras "Can't today". Es una incoherencia de documentación en pantalla, no un fallo de funcionamiento.
- **Arreglo:** añadir una fila `["V3 · after Can't today", "Fancy sending Pablo a note? A few words are enough."]`, o dejarlo como está a sabiendas.

### RC2-06 · `m5Open` no se reinicia al cambiar de momento · BAJA · INFERIDO
- **Dónde:** `MentorApp.tsx`, en el bloque `if (seenKey !== resetKey)`.
- **Qué pasa:** se reinician pestaña, hilo, redacción y ayuda, pero no `m5Open`. Si en un ensayo alguien pulsa "Later" en M5 y luego se vuelve a ese momento, M5 no reaparece, y el teléfono no queda como "recién llegado" a ese momento.
- **Arreglo:** añadir `setM5Open(true)` en el bloque de reinicio, si el equipo quiere ese comportamiento.

### RC2-07 · El botón de la tarjeta del copiloto en Today se llama solo "Open" · DETALLE · VERIFICADO
- **Dónde:** `MentorApp.tsx`, en `Today`, tarjeta "A private idea for your next note to…".
- **Qué pasa:** "Open" no dice adónde lleva; el objetivo era un botón a Conversation.
- **Arreglo:** cambiar la etiqueta a "Open conversation" o "Go to Conversation".

### RC2-08 · Detalles de `Sheet` · DETALLE · INFERIDO
- (a) Si el botón que abrió la hoja desaparece (por ejemplo "Use idea", porque el copiloto pasa a "used"), `prev.isConnected` es falso y el foco acaba en `body`. Se podría devolver a la propia app del teléfono.
- (b) El `h2` recibe `id` y `tabIndex` modificando el DOM una sola vez al montarse. Si el `h2` se cambiara por otro al volver a dibujarse, perdería las dos cosas. Hoy todas las hojas tienen un `h2` fijo, así que no ocurre.
- (c) `aria-labelledby` y `aria-label` a la vez es redundante (manda `labelledby`). No es un error.
- (d) El botón "Close" va en posición absoluta arriba a la derecha y el `h2` no tiene margen derecho. Con títulos largos en `compose.title` se taparían; los de hoy son cortos.
- (e) `.rv .bg-rv-teal :focus-visible` pone el contorno en blanco, pero con `outline-offset: 2px`. Si un control toca el borde de la burbuja, el anillo blanco cae fuera, sobre el fondo claro, y no se ve. Habría que revisarlo en la burbuja de nota propia.

### RC2-09 · `planWhen`: un plan pasado de hace 2 a 6 días se lee como futuro · DETALLE · INFERIDO
- **Dónde:** `src/lib/relevo/views.ts`, en `planWhen`.
- **Qué pasa:** con `dn` entre -2 y -6 sale solo el día de la semana ("Friday, 10:00"), sin indicar que ya pasó. Solo afecta a rótulos que empezaban por "Today" o "Tomorrow", y el guion no llega a ese caso.
- **Arreglo:** para `dn < -1`, usar `dayLabel(day)`.

## Sin hallazgos
- Reinicio de Pablo/Marta y clínica por `resetKey = data.index` (cambio de estado durante el dibujado, patrón válido en React).
- "Open Luis's file" repetible gracias al contador `n`.
- Cierre con 88 % / 5 days / 2.45 sin cambios, más 48 % y "1 day's notice" en el nivel 2.
- La tarjeta "Beyond the clinic" solo aparece con `index < 0`.
- Texto de M5 que no promete nada de Marta.
- Texto del copiloto sin contenido de salud.
- La expresión regular de `demo.ts` (`\b` protege las claves con guion bajo).
- Contrastes de `Toggle` (#77827d) y del borde de campo (#87918c).
