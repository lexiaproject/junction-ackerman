# Revisión de accesibilidad · ciclo 2 (WCAG 2.2 AA)

Revisado: `git diff HEAD` de `kit.tsx`, `MenteeApp.tsx`, `MentorApp.tsx`, `relevo.css` y `demo/page.tsx`.
Lo comprobé en vivo con Playwright en `http://localhost:3000`, siempre en contextos de navegador propios y con mundos
aleatorios (`a11yc2zz…`, `a11yc2dm…`, `a11yc2dn…`, `a11yc2pb…`, `a11yc2ax…`). Usé dos tamaños: teléfono a 390 × 844
(escala 1:1) y escritorio a 1600 × 900. Los contrastes los recalculé con la fórmula de WCAG, sin redondear.

Una nota de método: el servidor de Playwright es compartido y otro agente cambió la URL de mi pestaña a mitad de una
prueba (`w=c2clinhelp…`). Descarté esos datos y repetí todo en contextos que creé y cerré dentro de cada script.

## Veredicto por cambio

| Cambio | Veredicto | Hallazgos |
|---|---|---|
| `Sheet` como diálogo modal (K-08): role, aria-modal, nombre, foco, trampa, Escape, foco devuelto, botón Close | **aprobado en la app suelta; en la demo, arreglo necesario** | XC2-01, XC2-04, XC2-07 |
| Confirmaciones de "Talk to my clinic" y "Ask Pablo to write to me" (K-09) | **arreglos menores** (contraste y role=status bien; el estado compartido falla) | XC2-02 |
| Help de Luis a 44 px (`!min-h-[44px]`) | **aprobado** | — |
| Help de Pablo sin `rv-btn-sm` | **aprobado** (92 × 44 px) | — |
| Tarjeta del copiloto en Today de Pablo | **aprobado con mejora** | XC2-03, XC2-05 |
| Tarjeta "Beyond the clinic" | **aprobado** (mejora opcional) | XC2-06 |
| Anillo de foco blanco en burbujas propias (X-06) | **aprobado** | — |
| `text-white/90` en duración, "Show text" y hora de burbujas propias | **aprobado** | — |
| Borde de campos `#87918c` (X-13) | **aprobado por poco** | XC2-08 |
| Interruptor apagado `#77827d` | **aprobado** | — |
| `resetKey` en MentorApp y ClinicWeb (cierra las hojas al cambiar de momento) | **aprobado** (sin efecto negativo en el foco) | — |
| Texto de la evaluación (nivel 2, aviso de estudio clínico) | **aprobado** (solo texto) | — |

**X-01 (el diálogo de ayuda sin modal ni foco) queda cerrado en la app suelta.** VERIFICADO: si la hoja se abre sola
el día 57 a las 21:13 en `/relevo/app?w=…&as=luis`, tiene `role="dialog"` y `aria-modal="true"`, se llama
"Need help right now?" (por `aria-labelledby` → h2) y el foco entra en el H2 con su anillo visible. Tab recorre
Emergency → MIELI → Talk to my clinic → Ask Pablo → Close → Emergency, y Shift+Tab da la vuelta al revés. Escape
cierra la hoja y no vuelve a abrirse con el sondeo (lo comprobé esperando 6 s). Si la abres con Help (con teclado o
con ratón), al cerrar con Escape o con Close el foco vuelve a "Help". El botón Close se llama "Close" y mide 44 × 44 px
a escala 1:1. Si en escritorio mide 35 × 35, es por el `Fit` (escala 0,80), no por el código.

## Contrastes recalculados

| Par | Antes | Ahora | Criterio |
|---|---|---|---|
| Anillo de foco en burbuja propia: blanco sobre teal `#0e6b5c` | 1,00 (teal sobre teal) | **6,41** | 2.4.7 / 1.4.11 ✔ |
| Duración, "Show text" y hora: blanco al 90 % sobre teal | 4,72 (80 %) / **4,37 (75 %)** | **5,53** | 1.4.3 ✔ (antes el 75 % no pasaba) |
| Borde del campo `#87918c` sobre el blanco interior | 1,26 | **3,25** | 1.4.11 ✔ |
| Borde del campo `#87918c` sobre el fondo de la hoja `#f5f6f3` | 1,13 | **2,997** | 1.4.11 por los pelos (ver XC2-08) |
| Interruptor apagado `#77827d` sobre blanco / sobre `#f5f6f3` | 1,52 | **3,98 / 3,67** | 1.4.11 ✔ |
| Pomo blanco sobre interruptor apagado | 1,52 | **3,98** | 1.4.11 ✔ |
| Encendido frente a apagado (teal frente a `#77827d`) | — | 1,61 | no es solo color: el pomo cambia de lado, así que 1.4.1 se cumple |
| Confirmación teal, 14 px y 600, sobre `#f5f6f3` | (antes 13 px dentro del botón) | **5,91** | 1.4.3 ✔ |
| Icono X de Close (ink2) sobre `#f5f6f3` | — | **5,82** | 1.4.11 ✔ |
| "Beyond the clinic": título teal / lista ink sobre sage `#e7f0ec` | — | **5,52 / 14,25** | 1.4.3 ✔ |
| Tarjeta del copiloto: texto notice-ink sobre notice / blanco sobre "Open" | — | **11,69 / 13,38**; anillo teal sobre la tarjeta 5,60 | ✔ |
| Help: `#9a3412` sobre blanco / sobre fondo | — | **7,31 / 6,74** | ✔ |

En una captura comprobé que el anillo blanco del "Show text" propio cabe dentro de la burbuja: queda un margen de
10 px y el anillo ocupa 3,2 px. No se sale al fondo claro.

## Hallazgos

```
XC2-01 · En la demo, la hoja de Luis que se abre sola roba el foco y bloquea "Next moment" con teclado
Gravedad: ALTA (rompe el guion de la demo con teclado)   Criterio WCAG: 2.4.3 Orden del foco, 2.1.1 Teclado,
  3.2.1 Al recibir el foco (cambio de contexto no pedido)   Evidencia: VERIFICADO
Dónde: kit.tsx (Sheet, la regla `take`) + demo/page.tsx:142-143 (`disabled={busy}`) y :113 (el atajo no actúa dentro de un dialog)
Qué pasa: la regla "solo tomo el foco si estaba en <body> o dentro de la app" no protege al presentador:
  1. "Next moment" se deshabilita mientras `busy`. Un botón con foco que pasa a disabled suelta el foco a BODY
     (VERIFICADO: tras un Enter en Next, activeElement = BODY y disabled=true, y 150 ms después ya es
     disabled=false, pero el foco sigue en BODY).
  2. Cuando llega el día 57 a las 21:12 y se monta la hoja, prev === body, así que take = true y el foco entra en
     el H2 de la hoja de Luis.
  3. Con el foco dentro de un [role=dialog], el atajo de la demo ignora → y ←. Enter sobre el H2 no hace nada.
  Resultado VERIFICADO en los dos casos: con el foco en BODY pulsando → tres veces, y con el foco en "Next moment"
  pulsando Enter tres veces. El reloj se queda en 21:12 y el foco, en "Need help right now?". Solo se sale con
  Escape (después → funciona: 21:27) o con el ratón.
  Además, el paso 1 ya era un fallo antes de este ciclo (2.4.3): tras cada "Next moment" el foco se pierde y un
  segundo Enter no hace nada. El → seguía funcionando solo porque el foco quedaba en BODY.
Arreglo (los dos, son pequeños):
  a) demo/page.tsx:142-143: en vez de `disabled={busy …}`, usar `aria-disabled={busy || …}` y al principio de
     next/prev `if (busy) return;`. Así el foco se queda en el botón, Enter funciona otra vez y, con el foco fuera
     del teléfono, la regla actual de la hoja ya no lo roba.
  b) kit.tsx (Sheet): que nunca tome el foco desde BODY si está incrustada en la demo. Por ejemplo, añadir
     `data-rv-demo` al contenedor de las columnas en demo/page.tsx y en el Sheet:
       const embedded = !!el.closest("[data-rv-demo]");
       const take = prev && prev !== document.body ? scope.contains(prev) : !embedded;
     En `/relevo/app` todo sigue igual (allí sí debe entrar el foco: es la persona en crisis).
Compromiso: en la demo, quien usa el teléfono de Luis es el presentador. No mover el foco ahí es lo correcto. La hoja
  sigue anunciando su contenido a quien la abra a mano (con clic o Tab, el foco entra igual).
Esfuerzo: S   Riesgo: bajo
```

```
XC2-02 · Las dos confirmaciones comparten un solo estado: pulsar la segunda borra la primera y reactiva su botón
Gravedad: media   Criterio WCAG: 4.1.3 Mensajes de estado (el mensaje desaparece sin que nadie lo cierre),
  3.3.4 (por analogía: una acción importante se puede repetir sin querer)   Evidencia: VERIFICADO (el estado);
  INFERIDO del código (el segundo POST)
Dónde: MenteeApp.tsx:345 (`const [done, setDone] = useState("")`) y los dos `if (done === …) return`
Qué funciona (VERIFICADO): los dos `<p role="status">` ya están en el DOM vacíos antes de pulsar, así que el lector
  los anuncia bien. "They'll call you as soon as possible" sale en teal, 14 px y 600, con 5,91:1. El botón no se
  deshabilita: el foco se queda en él, con opacidad 1. Un segundo Enter en el mismo botón no manda otro POST (hay un
  solo `help/clinic` en la red).
Qué falla: tras "Talk to my clinic" pulsé "Ask Pablo to write to me". done pasa a "mentor", la confirmación de la
  clínica desaparece y "Talk to my clinic" vuelve a aria-disabled="false". Un segundo toque mandaría otra vez
  help/clinic. En plena crisis es justo cuando alguien pulsa las dos cosas y luego no sabe si la clínica lo recibió.
Arreglo: guardar las dos por separado:
  const [done, setDone] = useState<{ clinic?: boolean; mentor?: boolean }>({});
  … aria-disabled={!!done.clinic} … if (done.clinic) return; … setDone((d) => ({ ...d, clinic: true }));
  y lo mismo con mentor. Los textos de los status, sin cambios.
Esfuerzo: S   Riesgo: nulo
```

```
XC2-03 · Al pulsar "Open" en la tarjeta del copiloto, el foco se pierde en BODY
Gravedad: baja   Criterio WCAG: 2.4.3 Orden del foco   Evidencia: VERIFICADO
Dónde: MentorApp.tsx (tarjeta nueva en Today → onTab("chat","mentee"))
Qué pasa: con el foco en "Open" y Enter, se abre Conversation, pero activeElement = BODY. Quien usa teclado o lector
  tiene que volver a empezar desde arriba del teléfono. Es el mismo patrón que ya tienen las pestañas inferiores
  (no es nuevo), pero aquí el botón promete llevar a "la idea privada".
Arreglo: después de cambiar de pestaña, mover el foco a la sugerencia del copiloto en Conversation (tabIndex={-1} y
  focus() al montarla) o al encabezado del hilo.
Esfuerzo: S   Riesgo: nulo
```

```
XC2-04 · Si la hoja se abrió sola, al cerrarla el foco vuelve a BODY
Gravedad: baja   Criterio WCAG: 2.4.3 Orden del foco   Evidencia: VERIFICADO
Dónde: kit.tsx (Sheet, limpieza del efecto: devuelve el foco a `prev`, que era BODY)
Qué pasa: en /relevo/app, el día 57 a las 21:13 → Escape: el foco queda en BODY. Si se abrió con Help, vuelve a Help
  (bien).
Arreglo (opcional): HelpSheet acepta `returnTo` o, si prev es BODY, el Sheet enfoca
  `scope.querySelector(".rv-btn-help")` al cerrarse.
Esfuerzo: S   Riesgo: nulo
```

```
XC2-05 · "Open" a secas como nombre del botón del copiloto
Gravedad: baja   Criterio WCAG: 2.4.6 Encabezados y etiquetas (2.4.4 se cumple por el contexto)   Evidencia: VERIFICADO
Dónde: MentorApp.tsx (tarjeta "Only you see this")
Qué pasa: 326 × 44 px, blanco sobre #1e2f4d (13,38:1) y el candado con aria-hidden: todo bien. Pero en la lista de
  botones del lector sale solo "Open".
Arreglo: aria-label={`Open the private idea for your note to ${mentee.name}`}. Empieza por la palabra visible, así
  que cumple el 2.5.3.
Esfuerzo: S   Riesgo: nulo
```

```
XC2-06 · "Beyond the clinic" es un <p>, no un encabezado
Gravedad: muy baja   Criterio WCAG: 1.3.1 Información y relaciones   Evidencia: VERIFICADO
Dónde: demo/page.tsx (bloque J-08)
Qué pasa: los contrastes están bien (5,52 y 14,25) y la lista es un <ul> de verdad. El título se ve como encabezado
  pero no lo es. El <kbd>→</kbd> está bien.
Arreglo (opcional): <h2> con las mismas clases.
Esfuerzo: S   Riesgo: nulo
```

```
XC2-07 · aria-modal en una hoja dentro de un teléfono de la demo (Safari/VoiceOver)
Gravedad: muy baja (solo en la demo)   Criterio WCAG: 1.3.2 / 4.1.2   Evidencia: VERIFICADO en Chrome, INFERIDO en Safari
Dónde: kit.tsx (Sheet)
Qué pasa: Chrome no esconde el resto de la página (en el árbol de accesibilidad, "Next moment" y la clínica siguen
  sin ignorarse con la hoja abierta). VoiceOver de Safari sí suele limitar la lectura al diálogo con aria-modal:
  en la demo, un lector se quedaría encerrado en el teléfono de Luis.
Arreglo: con el `embedded` de XC2-01, poner `aria-modal={!embedded}`.
Esfuerzo: S   Riesgo: nulo
```

```
XC2-08 · Borde de los campos: 2,997:1 contra el fondo de la hoja
Gravedad: muy baja   Criterio WCAG: 1.4.11 Contraste no textual   Evidencia: VERIFICADO (cálculo)
Dónde: relevo.css:136 (`#87918c`)
Qué pasa: contra el blanco del campo da 3,25 (cumple). Contra `#f5f6f3` (fondo de las hojas y de la barra del chat)
  da 2,997: WCAG no redondea, así que se queda justo por debajo de 3.
Arreglo: `#848e89` (3,12 contra `#f5f6f3`, 3,38 contra blanco).
Esfuerzo: S   Riesgo: nulo
```

## Orden recomendado
**XC2-01** (antes de ensayar la demo: hoy el teclado se atasca en la crisis) → **XC2-02** → XC2-05 / XC2-03 →
XC2-08 → XC2-04 / XC2-06 / XC2-07. Todos son S. Siguen abiertos del ciclo 1, fuera de este diff: XC1-01 a XC1-07 y X-12
("0 Stable", 4,38:1).
