# C1 · Revisión de accesibilidad (WCAG 2.2 AA) · cambios del ciclo 1

Revisión de solo lectura de los cambios sin confirmar en `src/app/relevo/demo/page.tsx`, `src/app/relevo/kit.tsx` y `src/app/relevo/relevo.css`. Fecha: 14/11/2026. No se tocó código.

## Cómo se hizo
- Se leyó `git diff HEAD` de los tres archivos y las reglas sin capa de `src/app/globals.css`.
- En vivo con Playwright contra http://localhost:3000/relevo/demo?w=a11yc1r8m3, a 1440×900. Otros agentes cambiaban de pestaña (y una vez navegaron la pestaña con nombre `a11yc1rev`), así que las pruebas buenas se hicieron en un **contexto de navegador nuevo y privado**, localizado por su URL, que se cerró al terminar.
  Aviso: al principio un `browser_resize` cayó en la pestaña de otro agente (`w=revclin7q2x&as=luis`) y la dejó a 1440×900.
- Se probó: el atajo E (sin foco, con foco en un botón del teléfono, con Shift, Ctrl o Alt, en el select y dentro de la hoja de ayuda); las flechas con y sin foco en el diálogo; el deslizador con teclado; el select "Jump to moment" con teclado; los tamaños y nombres de los puntos de la línea de tiempo; la franja "Connection lost" (cortando `/act` y `/demo` con `page.route`); la franja de consentimientos (Luis apaga "ideas"); la hoja de ayuda en el día 57 21:13; el anillo de foco; y el contraste de 33 botones, chips y etiquetas.
- No se usó un lector de pantalla real. Lo que depende de él va como INFERIDO. No se llamó a Gemini. El mundo de prueba quedó en el día 57, con los consentimientos restaurados.

## Veredicto por cambio

| Cambio | Veredicto | Hallazgos |
|---|---|---|
| Atajo E de la capa de explicación + indicación `<kbd>E</kbd>` | **arreglos menores** | XC1-02, XC1-03 |
| Flechas ←/→: ignora modificadores, `contentEditable`, diálogos y radiogroups | **aprobado** | — (VERIFICADO: dentro de la hoja de ayuda ni E ni → hacen nada; sin foco, → avanza) |
| Deslizador: `aria-valuetext="Day N"` y `blur()` tras arrastrar | **aprobado** | nota XC1-07 |
| Selector "Jump to moment" en "More" | **arreglos menores** | XC1-01 |
| Un punto por día en la línea de tiempo | **aprobado** (con mejora opcional) | XC1-06 |
| Franja "Connection lost · retrying…" | **arreglos menores** | XC1-04 |
| Franja de consentimientos + "Reset" | **arreglos menores** | XC1-04, XC1-05 |
| `@layer components` en relevo.css (y `:focus-visible` fuera de capa) | **aprobado** | XC1-08 (sin regresiones) |
| `useView` (kit.tsx) y "Can't reach Relevo right now" con `role="status"` | **aprobado** | — |
| Clínica en 1100 px en vez de 1280 | **aprobado** (escala algo mayor, mejora un poco X-16) | — |

Lo que sigue igual que en F1 y no es una regresión: **X-01** sigue abierto. Con la hoja de ayuda abierta sola, el foco queda en BODY, falta `aria-modal` y Tab sale a "Pablo", "Marta", "Help"… (VERIFICADO de nuevo). **X-12** también sigue: "0 Stable" a 4,38:1.

---

## Hallazgos

```
XC1-01 · "Jump to moment": una sola flecha cambia de momento, quita el foco y cierra el menú
Gravedad: media   Criterio WCAG: 2.4.3 Orden del foco, 3.2.2 Al introducir datos, 2.1.1 Teclado   Evidencia: VERIFICADO
Dónde: src/app/relevo/demo/page.tsx:152-158 (onChange del <select>)
Qué pasa: con el teclado (summary → Enter → Tab → select), la primera ↓ ya lanza onChange. En Chrome/Windows un
  select cerrado cambia de valor con cada flecha. El código entonces mueve el reloj (crisis → forward), hace blur()
  y cierra el <details>. Resultado medido: activeElement = BODY y details.open = false. Un usuario de teclado o de
  lector de pantalla no puede recorrer la lista: salta al momento siguiente y se queda sin foco. Con el ratón
  funciona bien.
Arreglo (mínimo):
  1) En onChange dejar solo:  const m = …; if (m) pickMoment(m);   (quitar blur() y d.open = false)
     El manejador global de flechas ya ignora SELECT, así que no hay doble avance.
  2) Cerrar el menú con Escape y devolver el foco al botón:
     <details onKeyDown={(e) => { if (e.key === "Escape") { const d = e.currentTarget; d.open = false;
       d.querySelector("summary")?.focus(); } }}>
  (Si se quiere que el ratón siga cerrando el menú: cerrarlo en onClick del option no es fiable; mejor dejar
   el menú abierto o cerrarlo con un clic fuera.)
Esfuerzo: S   Riesgo: bajo
```

```
XC1-02 · Atajo de una sola tecla (E) sin forma de apagarlo, activo con el foco en cualquier botón
Gravedad: baja (la página es del presentador, no la usan Luis ni Pablo)   Criterio WCAG: 2.1.4 Atajos de teclado de un carácter   Evidencia: VERIFICADO
Dónde: src/app/relevo/demo/page.tsx:117 (manejador keydown en window)
Qué pasa: lo bueno, VERIFICADO: E no hace nada con Ctrl, Alt o Shift, ni con el foco en el select o dentro del
  diálogo. Según el código, tampoco en INPUT, TEXTAREA ni contentEditable (INFERIDO: no había textarea visible
  para probarlo). Lo que falla: el 2.1.4 pide poder desactivarlo, cambiarlo de tecla, o que solo actúe con el foco
  en el componente. Aquí actúa desde <body> y desde cualquier botón, también los de los teléfonos: con el foco en
  "Marta", al pulsar e se abrió la capa. Riesgo real: quien usa control por voz o dictado puede abrir o cerrar la
  capa sin querer. Las flechas no cuentan para el 2.1.4 (no son caracteres).
Arreglo (cumple con la opción "desactivar", ~6 líneas):
  const [keys, setKeys] = useState(true);
  en el manejador: if (!keys) return;  (antes de las flechas y de E)
  en "More": <label className="flex items-center gap-2 px-2 py-2"><input type="checkbox" checked={keys}
    onChange={(e) => setKeys(e.target.checked)} /> Keyboard shortcuts (← → E)</label>
  Alternativa más corta: que E no actúe cuando el foco está en un teléfono:
    if (el.closest("[data-phone]")) return;  (con data-phone en <Phone>). Reduce el riesgo, pero no cumple del todo.
Esfuerzo: S   Riesgo: bajo
```

```
XC1-03 · El <kbd> dentro del <label> se cuela en el nombre del interruptor
Gravedad: baja   Criterio WCAG: 4.1.2 Nombre-rol-valor (buena práctica; 2.5.3 se cumple)   Evidencia: VERIFICADO
Dónde: src/app/relevo/demo/page.tsx:218-219
Qué pasa: el nombre accesible del switch queda "Show how Relevo decides Keyboard shortcut E". Se entiende,
  pero es largo y mezcla nombre y atajo. La indicación visible existe y se lee bien (tinta2 #55635d sobre #f5f6f3,
  > 4,5:1). El title "Press E to show or hide" solo sale con el ratón.
Arreglo: en el <kbd> poner aria-hidden="true" (y quitar su aria-label), y en el <button role="switch"> añadir
  aria-keyshortcuts="E". El nombre queda "Show how Relevo decides" y el lector anuncia el atajo aparte.
Esfuerzo: S   Riesgo: nulo
```

```
XC1-04 · Las franjas "Connection lost" y de consentimientos se insertan ya con texto dentro de role="status"
Gravedad: media-baja   Criterio WCAG: 4.1.3 Mensajes de estado   Evidencia: VERIFICADO (DOM) / INFERIDO (anuncio)
Dónde: src/app/relevo/demo/page.tsx:140 ({(error || lost) && <span role="status">…}) y :175-180 ({off.length > 0 && <div role="status">…})
Qué pasa: VERIFICADO: la franja aparece al fallar /act, desaparece a los 4 s, sale también si falla el sondeo de
  /demo y se quita sola al volver la conexión. Colores #1e2f4d sobre #eaf0fa (≈ 12:1), 12,5 px. Es polite y no
  molesta: el texto es fijo y solo suena al aparecer. Pero la zona viva nace a la vez que su texto. Con
  NVDA/JAWS + Chrome eso a menudo no se anuncia, porque la región tiene que existir antes de que cambie su
  contenido (INFERIDO, sin lector real).
Arreglo: dejar el contenedor siempre montado y cambiar solo lo de dentro:
  <span role="status" className={error || lost ? "rv-chip bg-rv-notice text-rv-notice-ink" : "sr-only"}>
    {error || lost ? "Connection lost · retrying…" : ""}</span>
  <div role="status">{off.length > 0 && (<div className="mt-1 flex …">…</div>)}</div>
Esfuerzo: S   Riesgo: nulo
```

```
XC1-05 · El "Reset" de la franja de consentimientos es pequeño y su nombre es ambiguo
Gravedad: baja   Criterio WCAG: 2.5.8 Tamaño del objetivo (cumple por excepción), 2.4.6 Encabezados y etiquetas   Evidencia: VERIFICADO
Dónde: src/app/relevo/demo/page.tsx:178
Qué pasa: mide 35 × 18,9 px. Cumple el 2.5.8 por espaciado (no tiene otro objetivo cerca) y porque "More" tiene
  un equivalente ("Reset everything people did"). Pero "Reset" a secas no dice que borra lo que hizo la gente.
Arreglo: className="min-h-6 px-1 font-semibold underline" (24 px) y aria-label="Reset what people did (keeps the
  time)". El nombre empieza por la palabra visible, así que respeta el 2.5.3.
Esfuerzo: S   Riesgo: nulo
```

```
XC1-06 · Puntos de la línea de tiempo: el nombre está bien, pero no dicen cuál es el día actual
Gravedad: baja   Criterio WCAG: 2.5.8 (cumple por equivalente), 1.3.1 Información y relaciones   Evidencia: VERIFICADO
Dónde: src/app/relevo/demo/page.tsx:265-277
Qué pasa: ahora hay 14 puntos, uno por día, y el de la crisis (día 57) ya se puede clicar: mejora X-15. El nombre
  es completo ("Day 57: 21:12 Crisis phrase…; 21:27 Unattended…"). Miden 16 × 16 px y entre los días 54 y 60 sus
  centros quedan a 11-13 px, así que solos no pasan el espaciado de 24 px. El 2.5.8 se cumple por la excepción
  "equivalente": el select "Jump to moment" (248 × 31 px) y Next/Previous hacen lo mismo. Lo que falta: relleno =
  pasado y blanco = futuro solo se ve por color y forma; el lector no sabe en qué día está.
Arreglo (opcional): en el botón, aria-current={list.some((x) => x.key === moment?.key) ? "step" : undefined}
  (pasar moment o data.index; sirve first <= data.index && siguiente > data.index). Para ampliar el objetivo sin
  cambiar el dibujo: un ::before invisible de 24 px no ayuda aquí (se solapan); dejarlo como está.
Esfuerzo: S   Riesgo: nulo
```

```
XC1-07 · El deslizador hace blur() en cada pointerup, también con lectores táctiles
Gravedad: baja   Criterio WCAG: 2.4.3 Orden del foco   Evidencia: INFERIDO (lo del teclado, VERIFICADO)
Dónde: src/app/relevo/demo/page.tsx:288-295
Qué pasa: con teclado va bien (VERIFICADO): ← pasa de "Day 57" a "Day 56", aria-valuetext se actualiza, el reloj
  se mueve, el foco se queda en el deslizador y Home lleva al día 0. El anillo teal se ve. Pero el blur() de
  onPointerUp también salta con VoiceOver o TalkBack en tableta, que generan eventos de puntero: el foco se pierde
  tras cada ajuste.
Arreglo: hacer blur solo con ratón:  if (e.pointerType === "mouse") e.currentTarget.blur();
Esfuerzo: S   Riesgo: nulo
```

```
XC1-08 · Capas CSS (@layer): ni el foco visible ni los contrastes se han roto
Gravedad: — (sin regresión)   Criterio WCAG: 2.4.7 Foco visible, 1.4.3, 1.4.11, 2.5.8   Evidencia: VERIFICADO
Dónde: src/app/relevo/relevo.css (todo en @layer components; .rv :focus-visible fuera de capa)
Comprobado:
  - Anillo de foco teal rgb(14,107,92), sólido, con separación, en: Next (cabecera), select, deslizador, los 4
    botones de la hoja de ayuda (día 57 21:13) y los botones de los teléfonos. Gana al pino sin capa de globals.css.
    El ancho sale como 1,6 px porque Chrome lo ajusta a píxeles del dispositivo (DPR 1,25); no es una regresión.
  - Hoja de ayuda: Emergency, blanco sobre #9a3412 (≈ 7:1); los secundarios, #16211c sobre blanco; alto 58 px,
    radio 22 px, padding 20 px: las utilidades `!min-h-[72px] !rounded-[22px] px-5` se siguen aplicando.
  - 33 botones, chips, etiquetas y kbd medidos (mezclando transparencias): solo "0 Stable" baja de 4,5:1, con
    4,38:1, que es el X-12 de antes. 19 .rv-btn visibles, ninguno por debajo de 44 × 36 px.
  - Efecto lateral, positivo: ahora las utilidades ganan a .rv-btn-*. Por eso `text-rv-notice-ink` en los
    botones ghost (MentorApp.tsx:104, :200; MenteeApp.tsx:110) se aplica de verdad: #1e2f4d tiene más contraste
    que tinta2. Y como `.rv-input:focus { outline: none }` está dentro de la capa, pierde contra
    `.rv :focus-visible`: los campos muestran sombra y anillo a la vez (INFERIDO). Es aceptable.
  - A vigilar: `px-2` en los ghost de "Write instead" (MenteeApp.tsx:220, MentorApp.tsx:114) ahora sí reduce el
    padding a 8 px. Siguen por encima de 24 px (≈ 36 × 44 px, INFERIDO).
Arreglo: ninguno.
```

## Orden recomendado
XC1-01 (el único que rompe el uso con teclado) → XC1-04 → XC1-03 → XC1-02 → XC1-05 / XC1-07 → XC1-06. Todo es S y de riesgo nulo o bajo. Y sigue pendiente X-01 (la hoja de ayuda sin modal ni foco), que es lo más importante del camino de crisis.
