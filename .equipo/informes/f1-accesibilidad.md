# F1 · Auditoría de accesibilidad (WCAG 2.2 AA) · Relevo

Fase de diagnóstico, solo lectura: no se ha cambiado nada del código. Fecha: 14/11/2026.

## Cómo se hizo
- Se leyó todo `src/app/relevo/` (kit, MenteeApp, MentorApp, ClinicWeb, charts, demo, app, clinic, layout, page) y los tokens `--color-rv-*`.
- Los contrastes se calcularon con la fórmula de WCAG a partir de los colores hex. Las transparencias (`/75`, `opacity-60`, tintes `…14`) se mezclaron antes con su fondo real. Script: scratchpad `c.js` y `c2.js`.
- En vivo, con Playwright en una pestaña aislada propia (`w=a11yx7q2k9`) contra http://localhost:3000, se comprobó: la escala de la demo, el orden de tabulación con la hoja de ayuda abierta sola (día 57), el botón "Talk to my clinic" tras pulsarlo, el orden de tabulación con M0 encima, el anillo de foco en una burbuja propia y los nombres accesibles del deslizador y del interruptor.
- Aviso: el navegador de Playwright lo comparten otros agentes. En la pestaña compartida la página cambió de mundo y de tamaño mientras trabajaba. Por eso todo se repitió en una pestaña aislada propia. No se llamó a Gemini.
- No se probó con un lector de pantalla real (NVDA o VoiceOver). Tampoco se probó la grabadora con micrófono real, para no pedir permisos. Esos puntos van marcados como INFERIDO.

## Resumen por prioridad

| ID | Título | Gravedad | Camino de crisis | Esfuerzo |
|---|---|---|---|---|
| X-01 | La hoja de ayuda se abre sola sin mover el foco; no es modal y no retiene el foco | alta | sí | M |
| X-02 | La confirmación "They'll call you…" queda en un botón deshabilitado: 2,08:1, foco perdido, sin anuncio | alta | sí | S |
| X-03 | Las hojas inferiores no tienen botón visible de cerrar | media | sí | S |
| X-04 | M0 y M5 tapan la pantalla, pero el foco sigue yendo a 5 controles ocultos detrás | alta | no (paso 1 de la demo) | S |
| X-05 | La grabadora no responde a la activación de lectores de pantalla (falta onClick) y sus instrucciones de teclado no se cumplen | media-alta | no | S |
| X-06 | Anillo de foco invisible en las burbujas propias (verde sobre verde, 1:1) | media | no | S |
| X-07 | La zona `aria-live` de la grabadora anuncia cada segundo; el "Undo" de 5 s no recibe el foco | media | no | S |
| X-08 | Los avisos nuevos (V2, M6, copiloto) aparecen sin anunciarse | media | sí (M6) | S |
| X-09 | Clínica: una alerta grave nueva no se anuncia; la insignia dice solo "1" | media | sí | S |
| X-10 | Barra inferior de Pablo: texto inactivo a 3,68:1 con 11 px | media | no | S |
| X-11 | Textos semitransparentes por debajo de 4,5:1 (burbuja propia, selector de rol) | media | no | S |
| X-12 | Etiquetas de nivel: nivel 0 a 4,39:1; niveles 1 y 2 suspenden sobre el fondo de hover | media | no | S |
| X-13 | Pista apagada de los interruptores a 1,52:1; bordes de los campos de texto a 1,26:1 | media | no | S |
| X-14 | Gráficos: nombre genérico, solo con ratón, series solo por color y de poco contraste, ejes a 3,73:1 | media | no | M |
| X-15 | Puntos de la línea de tiempo: se solapan; el de la crisis no se puede clicar | media (demo) | sí (navegar) | M |
| X-16 | La demo escala los teléfonos al 49 %: botones de 44 px pasan a 21,5 px y el texto a 7 px | media (jurado) | — | S/M |
| X-17 | Filtros de la clínica (Seg) sin estado accesible y con nombres "3", "2"… | media | no | S |
| X-18 | `role="tab"` sin el patrón completo (pestañas / paneles / flechas) | baja | no | S |
| X-19 | Alertas resueltas con `opacity-60`: texto secundario a 2,64:1 | baja | no | S |
| X-20 | El botón "atrás" oculta su texto visible al lector (Label in Name) | baja | no | S |
| X-21 | Estructura: tres h1 en la demo, columnas sin región ni título, `aria-label` en divs sin rol | baja | no | S |
| X-22 | Botón "Help" de 36 px: cumple AA, pero para la puerta de crisis lo ideal es 44 px | baja | sí | S |
| X-23 | Escape global: cierra las hojas de todos los teléfonos a la vez | baja | sí | S |
| X-24 | Deslizador sin `aria-valuetext`; las flechas globales cambian de momento desde cualquier botón | baja | no | S |
| X-25 | Detalles menores: toast, progreso de bienvenida, tooltips con `title`, id duplicado, movimiento | baja | no | S |

Si solo da tiempo a una tanda, este orden da más por menos: **X-02, X-04, X-01, X-03, X-06, X-10, X-11, X-12, X-13** (casi todo S y de riesgo bajo). Después X-05, X-07, X-08 y X-09.

---

## Hallazgos

```
X-01 · La hoja de ayuda (A3) se abre sola en una crisis sin mover el foco; no es modal y no retiene el foco
Gravedad: alta  (criterio WCAG: 2.4.3 Orden del foco, 4.1.2 Nombre-rol-valor, 1.3.1)     Evidencia: VERIFICADO
Dónde: src/app/relevo/kit.tsx:250-264 (Sheet); MenteeApp.tsx:40-50 (apertura automática), :344 (HelpSheet)
Qué pasa y a quién afecta: con el reloj en el día 57 21:13, el diálogo "Need help right now?" aparece y el foco
  se queda en <body>. Un usuario de lector de pantalla no se entera de que se ha abierto: no se mueve el foco
  y no hay anuncio. El diálogo no tiene aria-modal. Tabulando desde el último botón ("Ask Pablo to write to me")
  el foco sale del diálogo a "Pablo", "Marta", "Help"…, es decir, al contenido de detrás y al otro teléfono.
  Al cerrar, el foco tampoco vuelve a donde estaba. Afecta a Luis (y a Pablo en M7) justo en el peor momento.
Criterio del jurado afectado: diseño responsable / seguridad del camino de crisis; calidad de ejecución.
Arreglo propuesto: en Sheet (vale para todas las hojas):
  1) <div role="dialog" aria-modal="true" aria-labelledby={id} tabIndex={-1} ref={box}>, y poner id={id} (useId)
     al h2 de cada hoja (o seguir con aria-label).
  2) Al montar: const prev = document.activeElement; box.current.focus(). Al desmontar: prev?.focus().
  3) Retener el foco: onKeyDown en la caja; si es Tab, buscar los enfocables del diálogo y pasar del último
     al primero (y del primero al último con Shift+Tab).
  4) Mover el Escape del window a este mismo onKeyDown (resuelve también X-23).
  Para no quitarle el foco al presentador en /relevo/demo: hacer el autofoco solo si
  !document.activeElement || document.activeElement === document.body, o solo fuera de la demo
  (prop autoFocus=false en DemoPage). Las flechas ←/→ del presentador siguen funcionando igual.
Esfuerzo: M     Riesgo de romper algo: bajo (solo foco; no toca la lógica de crisis)
```

```
X-02 · La confirmación "They'll call you as soon as possible" queda dentro de un botón deshabilitado
Gravedad: alta  (criterio WCAG: 4.1.3 Mensajes de estado, 2.4.3, 1.4.3)     Evidencia: VERIFICADO
Dónde: src/app/relevo/MenteeApp.tsx:357-379 (HelpSheet: "Talk to my clinic" y "Ask {mentor} to write to me"); relevo.css:54-57
Qué pasa y a quién afecta: tras pulsar "Talk to my clinic" el botón pasa a disabled con opacity 0,45. El texto
  de confirmación (verde, 13 px) queda dentro de ese botón: contraste medido 2,08:1 (el texto principal, 2,82:1).
  El foco cae a <body> (comprobado: activeElement = BODY) y no hay ninguna zona aria-live, así que el lector
  de pantalla no dice nada. Una persona en crisis recibe una confirmación difícil de leer, o ninguna.
  (Técnicamente un control inactivo está exento del 1.4.3, pero aquí el texto es el mensaje en sí, no el control.)
Criterio del jurado afectado: seguridad y cuidado en el camino de crisis; impacto.
Arreglo propuesto: no usar disabled. Usar aria-disabled={done==="clinic"} e ignorar clics repetidos en el handler
  (if (done==="clinic") return), sin opacidad. Sacar la confirmación del botón a un elemento fijo debajo:
  <p role="status" className="text-[14px] font-semibold text-rv-teal">{done==="clinic" ? "Your clinic will call you as soon as possible" : ""}</p>
  (siempre montado, vacío al principio). Teal sobre bg da 5,91:1. Lo mismo para el botón del mentor.
Esfuerzo: S     Riesgo de romper algo: bajo (solo visual y accesibilidad; no cambia la acción "help")
```

```
X-03 · Las hojas inferiores no tienen botón visible de cerrar
Gravedad: media  (criterio WCAG: 2.1.1 Teclado / uso con lector táctil; buena práctica de diálogos)     Evidencia: VERIFICADO
Dónde: src/app/relevo/kit.tsx:256-262 (Sheet); afecta a HelpSheet, "Write to your clinic" y la hoja de redactar del mentor
Qué pasa y a quién afecta: solo se cierran con Escape o tocando el fondo oscuro (un <div> con onClick que no
  se puede enfocar). En vivo, los enfocables del diálogo de ayuda son 112, MIELI, clínica y Pablo: ninguno cierra.
  Con VoiceOver o TalkBack en el móvil, o con control por voz, no hay manera fiable de salir. La barrita gris
  de arriba parece un asa, pero no hace nada.
Criterio del jurado afectado: usabilidad / calidad.
Arreglo propuesto: en Sheet, arriba a la derecha:
  <button onClick={onClose} className="rv-btn rv-btn-ghost absolute right-3 top-3 h-11 w-11 !px-0" aria-label="Close"><Icon name="x" /></button>
  (la caja del diálogo necesita la clase relative). Es un cambio visual mínimo y permitido en el camino de crisis.
Esfuerzo: S     Riesgo de romper algo: bajo
```

```
X-04 · M0 (invitación / emparejamiento) y M5 (pausa) tapan la pantalla, pero el foco sigue yendo a controles ocultos detrás
Gravedad: alta  (criterio WCAG: 2.4.11 Foco no oculto (mínimo) — nuevo en 2.2 AA; 2.4.3; 1.3.1)     Evidencia: VERIFICADO
Dónde: src/app/relevo/MentorApp.tsx:154-155 (montaje), :374 (M0), :409 (M5)
Qué pasa y a quién afecta: el día 0 a las 08:10 (paso 1 de la demo), M0 cubre todo el teléfono de Pablo con un
  fondo opaco. Detrás quedan 5 controles enfocables: "Help", "Today", "Conversation", "My relay", "Settings".
  Además van ANTES que M0 en el DOM, así que al tabular el foco recorre primero 5 botones invisibles.
  M0 y M5 tampoco se presentan como diálogo.
Criterio del jurado afectado: calidad de ejecución; momento estrella de la demo (emparejamiento 0,87).
Arreglo propuesto: const covered = !!data.m0 || (!!data.m5 && m5Open);
  poner inert={covered} en <header>, en el <div id=rv-scroll-…> y en <nav> (React 19 acepta el atributo inert).
  En la caja de M0 y M5: role="dialog" aria-modal="true" aria-labelledby apuntando a su h1.
Esfuerzo: S     Riesgo de romper algo: bajo
```

```
X-05 · Grabadora: los lectores de pantalla no la pueden activar y las instrucciones de teclado no se cumplen
Gravedad: media-alta  (criterio WCAG: 2.1.1 Teclado, 4.1.2, 3.3.2 Etiquetas o instrucciones)     Evidencia: INFERIDO
Dónde: src/app/relevo/kit.tsx:445-472 (Recorder)
Qué pasa y a quién afecta: el botón no tiene onClick. Funciona con el ratón (pointer down/up) y con el teclado
  (onKeyDown: Espacio o Enter empieza y otra pulsación termina). Pero la activación de NVDA/JAWS en modo
  lectura, de Voice Control o de Switch Access envía solo un "click", y eso no hace nada.
  Con teclado el comportamiento es "pulsa / vuelve a pulsar", pero el texto dice "Hold to talk",
  "release to send" y el aria-label "Recording. Release to stop". Si la persona suelta la tecla como le indican,
  sigue grabando hasta 60 s. Hay alternativa escrita en el chat ("Write instead") y en la hoja de redactar del mentor,
  pero no en la pantalla de inicio de Luis.
Criterio del jurado afectado: inclusión; flujo principal (notas de voz Luis ↔ Pablo).
Arreglo propuesto: sustituir la rama de onKeyDown por
  onClick={(e) => { if (e.detail === 0) (state === "rec" ? finish() : start()); }}
  (detail 0 = activación por teclado o tecnología de apoyo; el ratón y el dedo siguen con pointer down/up).
  Cambiar el aria-label durante la grabación a "Recording. Press again to send" y añadir una línea visible solo
  al usar el teclado: "Press again to stop".
  Comprobar en Chrome con micrófono que mantener pulsado con el ratón sigue igual.
Esfuerzo: S     Riesgo de romper algo: medio (toca la grabadora, que es frágil: probar ratón, táctil y teclado)
```

```
X-06 · El anillo de foco es invisible en las burbujas propias (verde sobre verde)
Gravedad: media  (criterio WCAG: 2.4.7 Foco visible)     Evidencia: VERIFICADO
Dónde: src/app/relevo/relevo.css:21-24 (.rv :focus-visible teal) + kit.tsx:225-238 (burbuja "mine" bg-rv-teal)
Qué pasa y a quién afecta: medido en vivo en el chat de Luis: el botón "Play note from Luis" enfocado tiene un
  contorno rgb(14,107,92) sobre un fondo rgb(14,107,92), es decir 1:1. Pasa lo mismo con "Show text" en sus burbujas.
  Quien usa el teclado no ve dónde está.
Criterio del jurado afectado: calidad / pulido.
Arreglo propuesto: añadir a relevo.css:  .rv .bg-rv-teal :focus-visible { outline-color: #fff; }
  (blanco sobre teal = 6,41:1).
Esfuerzo: S     Riesgo de romper algo: bajo
```

```
X-07 · La zona aria-live de la grabadora anuncia cada segundo; el "Undo" de 5 s no recibe el foco
Gravedad: media  (criterio WCAG: 2.2.1 Tiempo ajustable, 4.1.3)     Evidencia: INFERIDO
Dónde: src/app/relevo/kit.tsx:474-500 y :502-513
Qué pasa y a quién afecta: todo el bloque de estado es aria-live="polite". Durante la grabación el cronómetro
  ("0:01 · release to send", "0:02…") y la transcripción en directo cambian sin parar. En la cuenta atrás,
  "Sending to Pablo in 5 s… 4 s…". Un lector de pantalla encadena anuncios sin fin. Además, el "Undo" solo dura
  5 s y el foco no va a él: a quien usa lector o teclado no le da tiempo a encontrarlo.
Criterio del jurado afectado: inclusión.
Arreglo propuesto: quitar aria-live del bloque visible. Añadir un <span className="sr-only" aria-live="polite">
  que solo diga los cambios de estado: "Recording", "Sending to {toName} in 5 seconds. Undo is available",
  "Sent to {toName}", "It'll send when there's a connection". Al entrar en "undo", mover el foco al botón Undo
  (useRef + focus()). El botón Undo con min-h-[44px] px-2.
Esfuerzo: S     Riesgo de romper algo: bajo
```

```
X-08 · Los avisos nuevos (V2 "Pablo would like to talk to you", M6, copiloto) aparecen sin anunciarse
Gravedad: media  (criterio WCAG: 4.1.3 Mensajes de estado)     Evidencia: INFERIDO
Dónde: src/app/relevo/MenteeApp.tsx:102-116; MentorApp.tsx:190-212 (avisos), :228-234 (M6), :97-107 (copiloto)
Qué pasa y a quién afecta: llegan por sondeo cada 4 s y se insertan en silencio. Es precisamente el momento de la
  demo "Luis lee Pablo would like to talk to you", y el de crisis "The clinic team is in touch…" para Pablo.
Criterio del jurado afectado: inclusión; momentos clave de la demo.
Arreglo propuesto: envolver la lista de avisos de Luis, la de avisos de Pablo y la tarjeta M6 en
  <div aria-live="polite" aria-relevant="additions">…</div>. Las claves de React son estables, así que solo se
  anuncia lo nuevo, y lo que ya está al montar no se lee.
Esfuerzo: S     Riesgo de romper algo: bajo
```

```
X-09 · Clínica: una alerta grave nueva no se anuncia; la insignia dice solo "1"
Gravedad: media  (criterio WCAG: 4.1.3, 1.3.1)     Evidencia: INFERIDO
Dónde: src/app/relevo/ClinicWeb.tsx:74 (insignia), :365-383 (cola de alertas)
Qué pasa y a quién afecta: el aviso grave es solo visual (borde rojo y contador). El nombre del botón queda como
  "Alerts 1". Para una enfermera con lector de pantalla, la alerta del día 57 no "suena".
Criterio del jurado afectado: seguridad (camino de crisis en el lado de la clínica).
Arreglo propuesto: en la insignia, {newAlerts}<span className="sr-only"> new</span>; y un
  <p className="sr-only" aria-live="assertive">{c.severe > 0 ? `${c.severe} severe alert` : ""}</p> en ClinicWeb.
Esfuerzo: S     Riesgo de romper algo: bajo
```

```
X-10 · Barra inferior de Pablo: texto de las pestañas inactivas a 3,68:1 con 11 px
Gravedad: media  (criterio WCAG: 1.4.3 Contraste mínimo)     Evidencia: VERIFICADO (cálculo)
Dónde: src/app/relevo/MentorApp.tsx:147  (text-[#7c8883] sobre bg-white/95)
Qué pasa y a quién afecta: "Conversation", "My relay" y "Settings" quedan por debajo de 4,5:1 en la pantalla
  principal del mentor, y en la demo además se ven a la mitad de tamaño (X-16).
Criterio del jurado afectado: pulido visual / legibilidad.
Arreglo propuesto: text-[#7c8883] → text-rv-ink2 (#55635d, 6,31:1) y subir a text-[12px].
Esfuerzo: S     Riesgo de romper algo: bajo
```

```
X-11 · Textos semitransparentes por debajo de 4,5:1
Gravedad: media  (criterio WCAG: 1.4.3)     Evidencia: VERIFICADO (cálculo)
Dónde:
  - kit.tsx:237  burbuja propia, "Show text / Hide text" y hora en text-white/75 sobre teal → 4,37:1 (12 px)
  - app/page.tsx:186  subtítulo del selector de rol ("· accompanied") text-rv-ink2/70 sobre blanco → 3,21:1;
    seleccionado text-white/75 sobre teal → 4,37:1
Qué pasa y a quién afecta: metadatos de las notas en el chat de Luis y Pablo; el selector de rol de la web móvil.
Criterio del jurado afectado: pulido.
Arreglo propuesto: text-white/75 → text-white/90 (5,53:1); text-rv-ink2/70 → text-rv-ink2 (6,31:1).
  (text-white/80 de la duración da 4,72:1: aprueba, pero se puede unificar a /90.)
Esfuerzo: S     Riesgo de romper algo: bajo
```

```
X-12 · Etiquetas de nivel de la clínica: el nivel 0 no llega a 4,5:1 y los niveles 1 y 2 suspenden en filas con hover
Gravedad: media  (criterio WCAG: 1.4.3)     Evidencia: VERIFICADO (cálculo)
Dónde: src/app/relevo/charts.tsx:6 (LEVEL_COLOR) usado en ClinicWeb.tsx:44-50 (LevelTag con fondo color+"14")
Qué pasa y a quién afecta: con el tinte al 7,8 % sobre blanco: nivel 0 "Stable" 4,39:1 (suspende), nivel 1 4,53:1,
  nivel 2 4,62:1, nivel 3 5,67:1. Sobre la fila con hover (#fafbf9): nivel 1 4,37:1 y nivel 2 4,45:1 (suspenden).
  Texto de 12,5 px seminegrita, que no cuenta como texto grande. Lo bueno: el nivel nunca depende solo del color,
  porque siempre lleva número y palabra.
Criterio del jurado afectado: lectura del panel "Who do we call today?".
Arreglo propuesto: LEVEL_COLOR = ["#5B6370", "#A14A08", "#A8380A", "#B91C1C"]
  (con tinte: 5,46 / 5,37 / 5,73 / 5,67; en hover ≥ 5,16). Es el mismo tono, un poco más oscuro.
  Afecta también a los gráficos, donde solo mejora.
Esfuerzo: S     Riesgo de romper algo: bajo
```

```
X-13 · Contraste de componentes: pista apagada de los interruptores y bordes de los campos de texto
Gravedad: media  (criterio WCAG: 1.4.11 Contraste no textual)     Evidencia: VERIFICADO (cálculo)
Dónde: MenteeApp.tsx:448-454 (Toggle, bg-[#cdd3ce] apagado); demo/page.tsx:141 (interruptor de la capa);
       relevo.css:131-138 (.rv-input, borde #e2e6e1); kit.tsx:557 / :519 (textareas)
Qué pasa y a quién afecta: pista apagada frente a blanco 1,52:1 (1,40:1 sobre bg). Lo que distingue "apagado"
  es la bolita blanca sobre un gris casi invisible: en los consentimientos (sección de privacidad y bienvenida A0)
  cuesta ver que hay un interruptor. Borde de los campos 1,26:1, y campo blanco sobre bg 1,08:1:
  la caja de "Write to Pablo" casi no se ve.
Criterio del jurado afectado: privacidad entendible (consentimientos); pulido.
Arreglo propuesto: apagado bg-[#cdd3ce] → bg-[#77827d] (3,98:1 frente a blanco, 3,67:1 sobre bg; la bolita
  blanca sobre ella, 3,98:1). .rv-input: box-shadow 0 0 0 1px #87918c inset (3,25:1 frente a blanco).
Esfuerzo: S     Riesgo de romper algo: bajo (solo color)
```

```
X-14 · Gráficos SVG: nombre genérico, información solo con ratón y series que solo se distinguen por color
Gravedad: media  (criterio WCAG: 1.1.1, 1.4.1 Uso del color, 1.4.11, 2.1.1, 1.4.3)     Evidencia: VERIFICADO (cálculo) / INFERIDO (lector)
Dónde: src/app/relevo/charts.tsx:53-115 (LineChart), :120-139 (DomainBars); demo/page.tsx:31 (DOM_COLOR), :305, :383;
       ClinicWeb.tsx:241-251
Qué pasa y a quién afecta:
  - role="img" con aria-label del tipo "Steps, last 35 days": el lector no recibe valores, tendencia ni nivel.
  - El tooltip solo sale con el ratón (onPointerMove); con teclado o lector no hay forma de leer los datos.
  - En "smoothed deviation by area" (demo, pasos 3, 5, 6 y 7) las 5 líneas solo se diferencian por color.
  - Series de poco contraste frente a blanco: pasos diarios #9cc3b8 1,92:1; noche #8fa8c8 2,44:1;
    fisiología #8d99a0 2,92:1; línea de umbral #9aa39e 2,59:1.
  - Texto de los ejes #7b8782 a 10 px (y escalado): 3,73:1.
Criterio del jurado afectado: explicabilidad del motor (la capa "Show how Relevo decides"); rigor.
Arreglo propuesto (mínimo):
  - Prop opcional summary en LineChart y aria-label={`${ariaLabel}. ${summary}`}, con un resumen generado como
    "Mobility 2.1 today, above the 1.5 threshold; level 1 since day 47".
    En la demo ya existe el texto "Highest: …", basta con enlazarlo con aria-describedby.
  - Texto de los ejes fill="#5f6b66" (o #55635d, 6,31:1).
  - Colores: fisiología #8d99a0 → #6f7b82 (4,35:1); pasos diarios #9cc3b8 → #5f9282 (3,55:1);
    noche #8fa8c8 → #6a86ad (3,73:1); umbral #9aa39e → #7d8782 (3,71:1).
  - Una de las 5 líneas de dominio discontinua (dashed ya existe en Line) y nombre al final de cada línea si hay sitio.
Esfuerzo: M     Riesgo de romper algo: bajo
```

```
X-15 · Línea de tiempo de la demo: los puntos se solapan y el momento de crisis no se puede clicar
Gravedad: media para la demo; baja para WCAG  (criterio WCAG: 2.5.8 Tamaño del objetivo — cubierto por la excepción
  "equivalente", porque existen Next/Prev)     Evidencia: VERIFICADO
Dónde: src/app/relevo/demo/page.tsx:183-192
Qué pasa y a quién afecta: hay 27 puntos de 16 × 16 px. Los del mismo día se montan unos sobre otros: al intentar
  clicar "Day 57, 21:12: Crisis phrase…", Playwright informó de que el punto de las 21:27 intercepta el clic.
  Con el ratón no se puede saltar directamente al momento de crisis (y lo mismo en el día 47, con 5 puntos).
  Además son 27 paradas de tabulación antes de llegar a los teléfonos.
Criterio del jurado afectado: fluidez del pitch (el presentador salta momentos con el ratón).
Arreglo propuesto: añadir en el menú "More" (o junto a "Next moment") un
  <select aria-label="Jump to moment"> con los 27 momentos (data.moments, onChange → setClock(m.t)), y dar
  tabIndex={-1} a los puntos, que quedan como ayuda visual. Opcional: desplazar en vertical (top +6 px) los puntos
  que estén a menos de 1 % del anterior.
Esfuerzo: M     Riesgo de romper algo: bajo
```

```
X-16 · La demo escala los teléfonos al 49 %: botones de 44 px quedan en 21,5 px y el texto en 7 px
Gravedad: media (legibilidad ante el jurado; 2.5.8 se mide en px de pantalla)  (criterio WCAG: 2.5.8, 1.4.4 orientativo)     Evidencia: VERIFICADO
Dónde: src/app/relevo/demo/page.tsx:111-155 (rejilla + capa de explicación al 38 vh) y kit.tsx:584-604 (Fit)
Qué pasa y a quién afecta: a 1600 × 950 la escala medida es 0,489 (Luis), 0,480 (Pablo) y 0,502 (clínica).
  Texto base de 15 px → 7,3 px; nav de Pablo 11 px → 5,4 px; "Help" 36 px → 17,6 px; botones de 44 px → 21,5 px.
  En un proyector no se lee nada de lo que pasa en los teléfonos. El zoom del navegador sí agranda (no hay
  fallo de 1.4.4), pero quien presenta no lo suele usar.
Criterio del jurado afectado: claridad de la demo (lo más visible del pitch).
Arreglo propuesto (decisión de producto, dos opciones):
  (a) Capa de explicación cerrada por defecto (useState(false) en la línea 37) y un botón visible para abrirla:
      los teléfonos pasan al ~85 % de alto.
  (b) Mantenerla abierta pero con lg:h-[30vh] lg:min-h-[220px], que da unos 8 puntos más de escala.
  Para el pitch, ensayar con F11 (pantalla completa).
Esfuerzo: S (a/b)     Riesgo de romper algo: bajo
```

```
X-17 · Filtros segmentados de la clínica (Seg) sin estado accesible y con nombres ambiguos
Gravedad: media  (criterio WCAG: 4.1.2, 1.4.1, 2.4.6)     Evidencia: INFERIDO
Dónde: src/app/relevo/ClinicWeb.tsx:175-183 (Seg) y :128-129
Qué pasa y a quién afecta: el filtro activo solo se distingue por el fondo oscuro. Al lector no le llega ningún
  estado y los botones se llaman "3", "2", "1", "0".
Criterio del jurado afectado: panel de la clínica.
Arreglo propuesto: aria-pressed={value === v} en cada botón, y en las opciones numéricas
  aria-label={`Level ${l} · ${LEVEL_TEXT[Number(l)]}`}. Envolver en <div role="group" aria-label="Filter by level">.
Esfuerzo: S     Riesgo de romper algo: bajo
```

```
X-18 · role="tab" sin el patrón completo
Gravedad: baja  (criterio WCAG: 4.1.2)     Evidencia: VERIFICADO (árbol de accesibilidad: tablist "View as" > tab "Pablo" [selected])
Dónde: app/page.tsx:182-189 (selector de rol); demo/page.tsx:119-123 (Pablo/Marta); MentorApp.tsx:81-87 (hilo Luis/Marta)
Qué pasa y a quién afecta: se anuncian como pestañas, pero no hay tabpanel ni aria-controls, no funcionan las flechas
  y todas están en el orden de tabulación. Al lector le promete un comportamiento que no existe.
Criterio del jurado afectado: calidad.
Arreglo propuesto (lo más simple): quitar role="tablist"/"tab" y aria-selected; poner role="group" aria-label="View as"
  en el contenedor y aria-pressed={sel} en cada botón. (La barra inferior del mentor ya usa nav + aria-current: bien.)
Esfuerzo: S     Riesgo de romper algo: bajo
```

```
X-19 · Alertas resueltas con opacity-60
Gravedad: baja  (criterio WCAG: 1.4.3)     Evidencia: VERIFICADO (cálculo)
Dónde: src/app/relevo/ClinicWeb.tsx:366
Qué pasa y a quién afecta: el texto secundario baja a 2,64:1 y el principal a 4,39:1. Es contenido, no un control inactivo.
Arreglo propuesto: quitar opacity-60 y marcar el estado con la etiqueta "Resolved …", que ya existe, y fondo bg-rv-bg en la tarjeta.
Esfuerzo: S     Riesgo de romper algo: bajo
```

```
X-20 · El botón "atrás" oculta su texto visible al lector
Gravedad: baja  (criterio WCAG: 2.5.3 Etiqueta en el nombre)     Evidencia: INFERIDO
Dónde: src/app/relevo/MenteeApp.tsx:87-90
Qué pasa y a quién afecta: se ve "‹ Pablo" o "‹ Devices and privacy", pero el nombre accesible es "Back to home".
  Quien usa control por voz dice "Pablo" y no funciona.
Arreglo propuesto: quitar aria-label y añadir dentro <span className="sr-only">Back to home: </span> antes del texto visible.
Esfuerzo: S     Riesgo de romper algo: bajo
```

```
X-21 · Estructura: tres h1 en la demo, columnas sin región ni título, aria-label en divs sin rol
Gravedad: baja  (criterio WCAG: 1.3.1, 2.4.6)     Evidencia: VERIFICADO (lista de encabezados en vivo)
Dónde: demo/page.tsx:160-171 (Column con <p>); kit.tsx:569 (Phone aria-label en un div); ClinicWeb.tsx (títulos de tarjeta en <p>);
       MenteeApp.tsx:504 (progreso "Step 1 of 4" en aria-label de un div)
Qué pasa y a quién afecta: en vivo la demo tiene h1 "Hi, Luis", h1 "Good evening, Pablo", h1 "Who do we call today?"
  y ningún título que diga qué superficie es cuál. Un aria-label en un div sin rol se ignora, así que
  "Luis's phone" y "Step 1 of 4" no se leen.
Arreglo propuesto: Column → <section aria-labelledby> con <h2> (mismo estilo); en Phone, role="region";
  en el progreso, <p className="sr-only">Step {step+1} of 4</p>.
Esfuerzo: S     Riesgo de romper algo: bajo
```

```
X-22 · El botón "Help" de la cabecera mide 36 px
Gravedad: baja  (criterio WCAG: 2.5.8 cumple (≥ 24 px); 2.5.5 AAA recomienda 44)     Evidencia: VERIFICADO (CSS: .rv-btn-sm min-height 36px)
Dónde: MenteeApp.tsx:92; MentorApp.tsx:67
Qué pasa y a quién afecta: es la puerta al camino de crisis y es el botón más pequeño de la pantalla (en la demo, 17,6 px).
Arreglo propuesto: quitar rv-btn-sm → 44 px (o !min-h-[44px] manteniendo el texto de 13,5 px). Es un cambio visual permitido.
Esfuerzo: S     Riesgo de romper algo: bajo
```

```
X-23 · Escape se escucha en window: cierra las hojas de todos los teléfonos a la vez
Gravedad: baja  (criterio WCAG: 3.2.x previsibilidad)     Evidencia: INFERIDO
Dónde: src/app/relevo/kit.tsx:251-255
Qué pasa y a quién afecta: en /relevo/demo, con la ayuda de Luis y la hoja de redactar de Pablo abiertas, un Escape
  las cierra las dos, aunque el foco esté en otra parte.
Arreglo propuesto: se resuelve con X-01 (Escape en el onKeyDown del propio diálogo).
Esfuerzo: S     Riesgo de romper algo: bajo
```

```
X-24 · Deslizador sin aria-valuetext; flechas globales
Gravedad: baja  (criterio WCAG: 4.1.2, 3.2.1)     Evidencia: VERIFICADO (slider "Day of the demo": "0") / INFERIDO (flechas)
Dónde: demo/page.tsx:194-205 (range), :66-75 (←/→ en window)
Qué pasa y a quién afecta: el lector dice "0", "35"… sin contexto. Con teclado el deslizador sí funciona (cambia con
  las flechas y confirma en onKeyUp: bien). Pero las flechas ←/→ globales también saltan de momento con el foco en
  cualquier botón de los teléfonos (los radios de ritmo, los botones de clínica…), y eso confunde.
Arreglo propuesto: aria-valuetext={`Day ${day}`}; en el handler global, ignorar si
  (e.target as HTMLElement).closest('[role=radiogroup],[role=dialog],main') (la clínica es <main>), o exigir que el
  foco esté en body o en la cabecera de la demo.
Esfuerzo: S     Riesgo de romper algo: bajo
```

```
X-25 · Detalles menores
Gravedad: baja     Evidencia: INFERIDO
Dónde y arreglo:
  - Toast (MenteeApp.tsx:183-187): role="status" montado solo cuando hay texto, así que a veces no se anuncia →
    dejar siempre montado <div role="status" aria-live="polite"> y pintar dentro solo si hay toast.
  - Tooltips con title (ClinicWeb.tsx:398 "How affinity is computed" en un span; :416 similitud): no llegan ni con teclado
    ni con el dedo → mostrar la fórmula como texto pequeño (ya está en la capa de la demo).
  - id duplicable `tx-${as}` (kit.tsx:516-519) si hay dos grabadoras en revisión → useId().
  - Movimiento: prefers-reduced-motion cubre .rv-recording, .rv-sheet, .rv-in, .rv-draw y .rv-btn (bien), pero no
    las transiciones de Tailwind (bolita del interruptor, scale-105 de la grabadora, hover:scale-125 de los puntos,
    giro del chevron). Es un criterio AAA (2.3.3) → opcional:
    @media (prefers-reduced-motion: reduce) { .rv .transition-transform, .rv .transition-colors { transition: none; } }
  - La web de la clínica tiene min-w-[1100px] (scroll horizontal con 320 px, 1.4.10). Es una web de escritorio
    con tablas: entra en la excepción de contenido 2D. No hace falta tocarla.
```

---

## Comprobado y correcto (no hay que tocar)
- Contrastes de la paleta base (VERIFICADO): ink2 #55635d sobre blanco 6,31 / bg 5,82 / fondo clínica 5,75; teal sobre blanco 6,41, sobre bg 5,91, sobre sage 5,52; blanco sobre teal 6,41; ayuda #9a3412 sobre blanco 7,31 y blanco sobre ayuda ("Emergency · 112") 7,31; notice-ink sobre notice 11,69; etiqueta "Simulated data" 5,75; etiquetas de aviso #8a3a12 6,97; insignia blanca sobre rojo 6,47; avatares ≥ 6,75; texto de ayuda de dispositivo en l1 5,02.
- Nivel de la clínica y puntos de estado de dispositivos: nunca dependen solo del color (siempre número o palabra, y "Connected"/statusText junto al punto). Los puntos llevan aria-hidden.
- Botones con solo icono: tienen nombre ("Write instead", "Later", "Previous moment", "Play note from …", "Pause"). Los iconos y la onda son aria-hidden.
- Interruptores: role="switch" + aria-checked + nombre (consentimientos con el texto completo; "Show how Relevo decides", tomado de su label, VERIFICADO en el árbol). Miden 28 × 48 y 24 × 40 px.
- Ritmo del mentor: role="radiogroup" con aria-label y role="radio" + aria-checked (le faltan las flechas, nada grave).
- Formularios: todos los campos tienen etiqueta (textareas con aria-label o label for; number, range, select y checkbox de la clínica dentro de <label> con texto).
- Foco visible general: .rv :focus-visible da un contorno teal de 2 px con separación; los .rv-input usan sombra teal interior. Bien, salvo en las burbujas propias (X-06).
- `<html lang="en">`, `<main>` en la clínica y en la portada, `nav` con aria-label, `aria-current` en las navegaciones, `aria-expanded` en los desplegables.
- Objetivos táctiles: casi todos ≥ 44 px dentro de la app a tamaño real; los pequeños (Show text, enlaces de privacidad) están lo bastante separados para la excepción de espaciado de 2.5.8.
- Hay alternativa escrita a la voz (TextNote / "Write instead" / revisión del texto transcrito).

## No comprobado (y por qué)
- Lectores de pantalla reales (NVDA, VoiceOver, TalkBack): no disponibles en esta sesión. X-05, X-07, X-08 y X-09 están deducidos del código.
- Grabadora con micrófono real y mantener pulsado con teclado: no se ejecutó, para no pedir permiso de micrófono.
- Zoom al 200 % y modo de alto contraste de Windows: no se probaron en vivo (el razonamiento sobre el zoom de X-16 sale del código de Fit).
- Archivos creados por Playwright fuera del informe: `.claude/.playwright-mcp/a11y-demo0.yml` y `.claude/.playwright-mcp/a11y-mine-focus.png` (sin seguimiento en git, se pueden borrar).
