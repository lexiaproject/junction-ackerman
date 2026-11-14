# C2 · Jefe de calidad · veredicto del ciclo 2

Fecha: sáb 14 nov 2026. Lectura de las cuatro revisiones (`c2-rev-codigo`, `c2-rev-qa`, `c2-rev-clinica`, `c2-rev-accesibilidad`),
de los tres informes de autor y de `DECISIONES.md`. Hallazgos de gravedad media o superior comprobados contra el código
(`git diff HEAD`, `git show HEAD:`). Solo lectura: sin commits y sin abrir `.env.local`.

## Veredicto por tarea

| Tarea | Veredicto | Motivo |
|---|---|---|
| **F2 · Frontend** (`demo/page.tsx`, `MentorApp.tsx`, `ClinicWeb.tsx`, `page.tsx`) | **APROBADO CON ARREGLOS MENORES** | Los cuatro revisores lo aprueban. Queda una palabra de honestidad en la tarjeta "Beyond the clinic" (OBL-3). |
| **B2 · Backend** (`demo.ts`, `views.ts`, `texts.ts`, `sim.ts` solo `offerV3`) | **APROBADO** | Puerta 33/33 y 19/19. `engine.ts`, `SCRIPT` y `BANDIT_SALT` siguen igual. Los textos coinciden con C-08, C-11 y C-12. Los detalles que quedan (QC2-02, QC2-05/RC2-09) no salen en el guion: van al backlog. |
| **D2 · Diseño/a11y** (`kit.tsx` Sheet, `MenteeApp.tsx`, `relevo.css`) | **RECHAZADO en esta revisión. Vuelve a Diseño una sola vez** con OBL-1 y OBL-2 | Hay una regresión que bloquea la demo (QC2-01 = RC2-01 = XC2-01). Si la segunda revisión no pasa, se revierte D2 entero (los tres archivos) y F2 y B2 se confirman por separado. |

Lo demás de D2 queda aprobado: modal en `/relevo/app`, Escape aislado por hoja, Close de 44 px, Help de 44 px y los contrastes
X-06, X-11 y X-13.

## Comprobaciones propias de los hallazgos de gravedad media o superior

- **Bloqueante (ALTA), confirmado.** `kit.tsx:282`: `take = !prev || prev === document.body || scope.contains(prev)`.
  El atajo de teclado `demo/page.tsx:114` ignora cualquier tecla que salga de dentro de `[role="dialog"]`. El día 57 el foco está en
  `<body>` (al avanzar con flechas, o porque `disabled={busy}` en `:144` suelta el foco), así que la hoja de Luis se lo
  queda y → deja de avanzar. La exclusión de `[role="dialog"]` ya existía en HEAD (ciclo 1); lo nuevo de este ciclo es que la hoja
  coja el foco ella sola. Es una regresión.
- **El arreglo no puede ser "la hoja abierta sola nunca coge el foco"** (la propuesta de RC2-01). En `/relevo/app` quien
  tiene el teléfono es la persona en crisis, y ahí el foco sí debe entrar (X-01, decisión 9; QA y Accesibilidad lo verificaron).
  Por eso la excepción tiene que valer **solo dentro de la demo**.
- **Confirmaciones compartidas (MEDIA), confirmado.** `MenteeApp.tsx:345` `useState("")` guarda un único valor. Ya pasaba en
  HEAD (`disabled={done === …}`), así que no es una regresión. Aun así lo hago obligatorio: es justo el objetivo de K-09, el
  arreglo cuesta 4 líneas en el mismo archivo y su riesgo es nulo.

## Arreglos obligatorios antes del commit

### OBL-1 · La hoja que se abre sola no roba el foco en la demo · **Diseño** (un solo carril; toca dos archivos)
Lo asigno entero a Diseño, porque la regla vive en su `Sheet`. En el archivo de Frontend solo hay que añadir un atributo.
1. `src/app/relevo/demo/page.tsx:209`: añadir `data-rv-demo` al `<div className="grid grid-cols-1 gap-6 …">` que
   contiene las tres columnas. No se cambia nada más en ese archivo.
2. `src/app/relevo/kit.tsx:281-282`: sustituir la regla por:
   ```ts
   const embedded = !!el.closest("[data-rv-demo]");
   const take = prev && prev !== document.body ? scope.contains(prev) : !embedded;
   ```
   En `/relevo/app` todo sigue igual: desde `<body>` el foco entra. En la demo, desde `<body>` el foco no entra; si se
   pulsa "Help" en el teléfono, sí entra, porque `prev` está en la app.
3. Recomendado en el mismo cambio, no obligatorio: `kit.tsx:316` `aria-modal={embedded ? undefined : "true"}`. Así
   VoiceOver no encierra al presentador en el teléfono de Luis (XC2-07). Para leerlo después hace falta subir `embedded`
   a un `useState`/`useRef` o calcularlo en el render con el `ref`. Si complica el cambio, va al backlog.
- **Qué no se toca:** `MenteeApp` sigue abriendo A3 con `data.openHelp` igual que antes. No cambia ni cuándo se abre la
  hoja ni su contenido (decisión 6).
- **Cómo se comprueba (QA):** repetir QC2-01. Con el reloj en 57 21:05, pulsar → y luego otra vez →. Tiene que pasar de
  21:12 a 21:27 sin Escape ni ratón. Además, en `/relevo/app?as=luis` el día 57 21:13 el foco sigue entrando en
  "Need help right now?". Puerta completa: 33/33 y 19/19.

### OBL-2 · Cada confirmación de la hoja de ayuda con su propio estado · **Diseño**
`src/app/relevo/MenteeApp.tsx`:
- `:345` → `const [done, setDone] = useState<{ clinic?: boolean; mentor?: boolean }>({});`
- `:362`, `:364`, `:372` → `done.clinic` (`aria-disabled={!!done.clinic}`, `if (done.clinic) return;`, `{done.clinic && …}`).
- `:378`, `:380`, `:388` → igual con `done.mentor`.
- `:365-366` y `:381-382`: **mover `setDone` antes del `await`**, así:
  `setDone((d) => ({ ...d, clinic: true })); await act(w, as, "help", { type: "clinic" }).catch(() => {});` (y lo mismo con mentor).
- **Esto es UI/accesibilidad, no lógica de crisis.** La interfaz evita mandar dos veces la misma petición con un doble toque
  sobre **el mismo botón** dentro de la misma hoja abierta (RC2-03 y el arreglo menor 3 de Clínica). No se toca `sim.ts`,
  `case "help"` y el servidor sigue creando una alerta por cada petición que recibe. Tampoco cambia la honestidad: la
  confirmación ya se mostraba aunque fallara la red (RC2-04, pendiente de decisión). Los textos no cambian.
- **Cómo se comprueba:** "Talk to my clinic" y después "Ask Pablo to write to me": tienen que verse **las dos**
  confirmaciones, y "Talk to my clinic" tiene que seguir con `aria-disabled="true"`. Doble clic rápido en "Talk to my clinic":
  `/api/relevo/clinic` tiene que mostrar 1 sola alerta `help`.

### OBL-3 · Precisar una frase de la tarjeta "Beyond the clinic" · **Frontend**
`src/app/relevo/demo/page.tsx:195`: "…and only the clinic sees data." → **"…and only the clinic sees health data."**
Lo dice Clínica: Pablo sí recibe las notas de Luis, y así la frase coincide con "Pablo doesn't see your health data"
de la hoja de ayuda. El jurado lo lee al empezar. Es una sola palabra. Frontend la cambia en este mismo archivo, pero en la
línea 195, no en la 209 de OBL-1, así que no se pisan.

## Backlog (no bloquea el commit)
- **QC2-03**: cerrar la hoja y volver a abrirla permite una segunda alerta. Ya pasaba antes; arreglarlo exige subir el estado fuera de la hoja.
- **RC2-04**: la confirmación sale aunque el envío falle. Necesita decisión del equipo (camino de crisis).
- **XC2-01a**: `aria-disabled` en "Next moment" para que Enter siga funcionando. Ya fallaba en el ciclo 1. Con OBL-1, → funciona.
- **QC2-04 / XC2-04**: el foco acaba en `<body>` al cerrarse una hoja.
- **XC2-03**: el foco se pierde tras "Open" del copiloto. **XC2-05 / RC2-07**: nombre "Open" a secas.
- Clínica, arreglo menor 4: quitar el anillo del título y poner `pr-12` en el `h2`. Va con **RC2-08(d)**.
- Clínica, arreglo menor 1: texto de V3 normal. **RC2-05**: catálogo C5 con la variante V3.
- **RC2-06** (`m5Open`) · **RC2-08(a,b,c,e)** · **RC2-09 / QC2-05** (`planWhen`) · **QC2-02** (claves fuera del guion) · **QC2-06**
  · **XC2-06** (h2) · **XC2-08** (`#848e89`).

## Orden
Diseño hace OBL-1 y OBL-2 y Frontend hace OBL-3, en paralelo porque no se pisan. Después QA vuelve a revisar solo esos tres
puntos más la puerta completa, y se hace el commit del ciclo 2.
