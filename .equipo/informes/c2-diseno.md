# C2 · Diseño visual y accesibilidad · K-08, K-09, K-44, K-35

Rama `sesion-autonoma`, sin commits. Archivos tocados: `src/app/relevo/kit.tsx`, `src/app/relevo/MenteeApp.tsx`,
`src/app/relevo/relevo.css` (`globals.css` sin cambios). `git diff --stat` de mis archivos: kit.tsx +62/−8, MenteeApp.tsx
+29/−19, relevo.css +5/−1 (3 archivos, 96 inserciones, 28 borrados). El texto de la hoja de ayuda y el de M6 no cambian.

## 1. K-08 (X-01, X-03, X-23) · hojas inferiores con foco gestionado
**Dónde**: `kit.tsx:263-332` (`Sheet`), import de `useId` en `kit.tsx:3`.
- `role="dialog"` + `aria-modal="true"` + `aria-labelledby` (useId puesto en el `h2` de la hoja; se mantiene `aria-label`
  de reserva si una hoja no tuviera `h2`). Caja con `tabIndex={-1}`, `relative`, `focus:outline-none`.
- Al montar (solo una vez, para que el sondeo no mueva el foco): el foco va al título (`h2` con `tabIndex=-1`), o a la caja.
  **Regla del propio teléfono** (corrección 4 de f1-planes): solo se toma el foco si estaba en `<body>` o dentro de la misma
  app. El "teléfono" se calcula como la raíz de la app de la que cuelga la hoja (`caja.parentElement.parentElement`), así que
  NO hizo falta tocar `Phone` (`data-phone`).
- Al cerrar: el foco vuelve al elemento anterior, solo si la hoja lo tomó y el foco seguía dentro de ella o en `body`.
- Tab / Shift+Tab dan la vuelta dentro de la hoja. Escape se escucha en la propia hoja (`onKeyDown` + `stopPropagation`),
  ya no en `window`: cierra solo la hoja de ese teléfono.
- Botón visible "Close" (icono `x`, `rv-btn-ghost`, 44×44 px, arriba a la derecha; gris tinta 2 sobre fondo, 5,82:1).

**Comprobación (Playwright, contexto `c2diseno`, páginas propias)**: VERIFICADO
- `/relevo/app?w=kqd2x7m4p&as=luis` + reloj 57·21:13: la hoja se abre sola con `aria-modal=true` y nombre "Need help
  right now?", y el foco queda en el `H2` del título. Tab: 112 → MIELI → Talk to my clinic → Ask Pablo → Close → 112
  (no sale de la hoja). Shift+Tab: 112 → Close → Ask Pablo. Escape la cierra. Abierta a mano con "Help": el foco entra en
  el título; con Escape o con Close el foco vuelve a "Help".
- `/relevo/demo?w=kqd2dmk60obq` + reloj 57·21:13 con el foco en "Next moment": la hoja de Luis se abre y el foco
  **sigue en "Next moment"** (no se le roba al presentador). Con la de Luis abierta, "Help" de Pablo → el foco entra en la
  hoja de Pablo; Tab da la vuelta dentro del teléfono de Pablo; Escape cierra **solo** la de Pablo (la de Luis sigue
  abierta) y el foco vuelve a "Help" de Pablo.
- Hoja de redactar (`/relevo/app?…&as=pablo` → Conversation → "Write instead"): nombre "Note to Luis", foco en el título,
  Tab: Hold to record → Write to Luis → Close → (vuelta); Shift+Tab en bucle inverso; Escape cierra y el foco vuelve a
  "Write instead".
- Captura: el botón Close no tapa el título (`scratchpad/demo57.png`).
- Nota: tras abrir desde `body` (carga de página con crisis ya activa) el foco entra en la hoja; es lo que pide la regla.

## 2. K-09 (X-02) · confirmación fuera del botón
**Dónde**: `MenteeApp.tsx:357-389` (`HelpSheet`).
- Los dos botones ya no usan `disabled` (que bajaba la opacidad a 0,45 y tiraba el foco a `body`): `aria-disabled` +
  `if (done === …) return;` al principio del `onClick` (un segundo toque no repite la acción).
- Cada confirmación va en un `<p role="status">` siempre montado justo debajo de su botón (vacío y con 0 px de alto hasta
  que hay mensaje), 14 px seminegrita teal. Mismo texto: "They'll call you as soon as possible" y "{mentor} has your
  message". La acción `help` y el `.catch(() => {})` no cambian (lo de "dice que llamarán aunque falle la red" sigue
  pendiente de decisión del Director, como decía P12).
- Contraste: antes 2,08:1 (medido por a11y en f1; mi cálculo da 2,04:1) → después **5,91:1** (#0e6b5c sobre #f5f6f3).
**Comprobación**: VERIFICADO en vivo. Tras Enter en "Talk to my clinic": el foco sigue en el botón, `aria-disabled=true`,
opacidad 1, `role=status` con el texto, color rgb(14,107,92), 14 px, 600. El texto visible de la hoja antes de pulsar es el
mismo; solo aparecen líneas vacías en `innerText` por los dos `<p>` vacíos.

## 3. K-44 (X-22) · "Help" de Luis a 44 px
**Dónde**: `MenteeApp.tsx:92`: `!min-h-[44px]` (se mantiene el texto de 13,5 px de `rv-btn-sm`, sin otros cambios).
**Comprobación**: VERIFICADO, `offsetHeight` 44 en `/relevo/app` (Luis) y 44 en el "Help" de Pablo en la demo (eso es de Frontend).

## 4. K-35 · contrastes
| Hallazgo | Archivo:línea | Antes | Después | Estado |
|---|---|---|---|---|
| X-06 anillo de foco en burbujas propias | `relevo.css:249-252` (`.rv .bg-rv-teal :focus-visible { outline-color:#fff }`, fuera de capa) | 1,00:1 | 6,41:1 | VERIFICADO en vivo: "Play note from Pablo" con foco → contorno rgb(255,255,255) |
| X-11 duración / "Show text" / hora en burbuja propia | `kit.tsx:249, 251` `text-white/80` y `/75` → `/90` | 4,72 y 4,37:1 | 5,53:1 | VERIFICADO (color calculado blanco/0,9) |
| X-13 pista apagada de interruptores | `MenteeApp.tsx:460` `#cdd3ce` → `#77827d` | 1,52:1 (1,40 sobre fondo) | 3,98:1 (3,67 sobre fondo) | INFERIDO (cálculo; no lo miré en vivo) |
| X-13 borde de campos (`.rv-input`) | `relevo.css:136` `rv-line` → `#87918c` | 1,26:1 | 3,25:1 (3,00 sobre fondo) | VERIFICADO: la textarea de "Note to Luis" tiene la sombra rgb(135,145,140) |
| X-10 barra inferior de Pablo | `MentorApp.tsx:147` | 3,68:1 | — | **NO HECHO**: archivo de Frontend. Recambio: `text-[#7c8883]` → `text-rv-ink2` + `text-[12px]` (6,31:1) |
| X-12 etiqueta "0 Stable" | `charts.tsx:6` (`LEVEL_COLOR`) | 4,39:1 | — | **NO HECHO**: `charts.tsx` no está en mis archivos y el color va escrito en el código, no en un token. Recambio: `["#5B6370","#A14A08","#A8380A","#B91C1C"]` |
| X-13 interruptor de la capa de la demo | `demo/page.tsx:226` | 1,52:1 | — | **NO HECHO** (Frontend): `bg-[#cdd3ce]` → `bg-[#77827d]` |
| X-14 ejes de los gráficos | `charts.tsx:68, 80, 94` (`fill="#7b8782"` en el SVG, no en CSS) | 3,73:1 | — | **NO HECHO**: no está en CSS (el encargo decía "si están en CSS"). Recambio: `#55635d` (6,31:1) |

Contrastes recalculados con la fórmula WCAG (luminancia relativa) en Node, mezclando las transparencias sobre el fondo real.
`globals.css` no cambia: ninguno de los recambios hechos es un token `--color-rv-*` (cambiar `--color-rv-line` habría
oscurecido también todas las líneas divisorias, que son decorativas).

## Puerta
- `npx tsc --noEmit -p .` → sin errores · `npx eslint src/app/relevo` → sin avisos (VERIFICADO).
- `node scripts/relevo-check.mjs` → 33/33 · `node scripts/relevo-demo-walk.mjs http://localhost:3000` → 19/19 (VERIFICADO,
  con los cambios de los otros carriles también en el árbol).

## Incidencia de turnos
El navegador de Playwright es compartido: otro carril llevó mi pestaña a `/relevo/demo?w=kqfe7x3m9b` a mitad de una prueba.
A partir de ahí hice cada prueba en una página nueva y privada dentro de mi contexto (`context().newPage()`), cerrada al
terminar. Mundos usados: `kqd2x7m4p`, `kqd2dmk60obq`.

## Arreglos tras revisión
Aplicados exactamente OBL-1, OBL-2 y OBL-3 de `c2-calidad.md`; nada más.
- **OBL-1** · `demo/page.tsx:209` lleva `data-rv-demo` en la rejilla de las tres columnas. `kit.tsx` (`Sheet`): la regla pasa a
  `embedded = !!el.closest("[data-rv-demo]")` y `take = prev && prev !== document.body ? scope.contains(prev) : !embedded`.
  En `/relevo/app` desde `<body>` el foco entra; en la demo desde `<body>` no entra; "Help" pulsado en el teléfono sí entra.
  El recomendado `aria-modal` condicional (XC2-07) **no** se hizo: queda en backlog.
- **OBL-2** · `MenteeApp.tsx` `HelpSheet`: `done` es `{ clinic?, mentor? }`; cada botón usa su propia clave y `setDone` va antes
  del `await`. Textos y contenido de la hoja (112, MIELI, clínica, Pablo) sin cambios; servidor y `sim.ts` sin tocar.
- **OBL-3** · `demo/page.tsx:195`: "only the clinic sees health data."

Comprobado: `tsc --noEmit` y `eslint src/app/relevo` limpios; `relevo-check` 33/33; `relevo-demo-walk` 19/19.
Navegador (contexto propio `diseno-c2fix`):
- (a) `/relevo/demo?w=dzfx7q31`, día 55 08:00, solo →: 55 08:30 → 55 12:00 → 56 08:30 → 56 09:02 → **57 21:12 (hoja abierta,
  foco en `<body>`)** → 57 21:27 → 59 10:00 → 60 08:30 → 60 09:02. Sin Escape ni ratón.
- (b) `/relevo/app?w=dzfx7q31c&as=luis`, reloj 57·1440+1273: foco en el `h2` "Need help right now?"; 9 Tab y 3 Shift+Tab
  siempre dentro de la hoja; Escape la cierra.
- (c) Doble clic + tercer clic rápido en "Talk to my clinic" → `/api/relevo/clinic` con 1 sola alerta `help`. Después
  "Ask Pablo to write to me": se ven las dos confirmaciones ("They'll call you as soon as possible" y "Pablo has your
  message") y los dos botones con `aria-disabled="true"`.
