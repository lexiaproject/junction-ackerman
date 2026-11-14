# C1 · Frontend · Informe del ciclo de construcción 1

Rama `sesion-autonoma`, sin commits ni push (como pide el encargo). Archivos tocados: `src/app/relevo/kit.tsx` (solo `useView`),
`src/app/relevo/demo/page.tsx`, `src/lib/relevo/demo.ts` (2 líneas, opcional K-06). Nada más.
Prueba en el navegador: contexto Playwright propio (aislado, para no pisar el `relevo:w` de otros) y mundos `kqfera2n7f6`,
`kqfesllsbog`; contexto cerrado al terminar.

## Puerta (ejecutada al final, con los cambios de los tres carriles en el árbol)
- `npx tsc --noEmit -p .` → sin errores. VERIFICADO
- `npx eslint src/app/relevo src/lib/relevo/demo.ts` → sin avisos. VERIFICADO
- `node scripts/relevo-check.mjs` → 33/33. VERIFICADO
- `node scripts/relevo-demo-walk.mjs` → 19/19. VERIFICADO
- `git diff --stat -- src`: míos `demo/page.tsx` (+167/−), `kit.tsx` (+20), `demo.ts` (+2). El resto (`api/relevo/*`, `sim.ts`,
  `store.ts`, `relevo.css`) son de Backend y Diseño.

## P4 · K-23 + K-45 + K-24 · datos en vivo y aviso de conexión
**Cambios**
- `kit.tsx:43-68` (`useView`): cada petición lleva un número; solo se aplica la respuesta (o el error) de la **más reciente**
  (`my === last`), así una respuesta vieja que llega tarde ya no pisa a la nueva (K-23). Se compara el texto de la respuesta con
  el último aplicado: si es idéntico, **no** se llama a `setData` (K-45, no se redibuja cada 4-5 s). Una respuesta que no es JSON
  da "Error <status>". La forma pública `{ data, error, reload }` y los parámetros no cambian (compatibilidad con las 6 pantallas).
- `demo/page.tsx:42-53, 140`: se lee `error` de `useView`; estado `lost` 4 s (`flagLost`) si falla mover el reloj o el reset;
  pastilla `role="status"` "Connection lost · retrying…" en azul de aviso (`bg-rv-notice`, nunca rojo) junto a "Next moment".
- `demo/page.tsx:121-122`: sin datos y con error → "Can't reach Relevo right now · retrying…" en vez de "Loading the demo…".
- Reset del menú "More" con `.catch(flagLost)` (`:162`).

**Comprobación** (VERIFICADO, Playwright a 1440×900): cortando `/api/relevo/**` con `page.route(...abort)` y pulsando "Next moment"
→ la pastilla aparece a los 0,8 s y sigue tras el sondeo fallido (5,5 s); al restaurar la red desaparece en ≤6,5 s. Día 57 21:12:
la hoja de ayuda de Luis estuvo abierta en 8 muestras seguidas cada 2 s (≈3 sondeos): sin parpadeo. Captura de la pastilla:
`fe-lost.png` en el scratchpad de la sesión.

## P5 · K-42 + U-12 + K-38 + U-15 · reloj, flechas, línea de tiempo
**Cambios** (`demo/page.tsx`)
- `:54-83` K-42: `target` (useRef) guarda el último destino pedido; `next`/`prev` parten de `target ?? reloj` (`:93-105`). Los POST
  del reloj van **en cadena** (llegan al servidor en orden); `busy` lleva un contador para no reactivarse antes de tiempo. `target`
  se limpia cuando llega un reloj igual, si falla (y sale la pastilla) o a los 5 s.
- `:85-92` una sola función `pickMoment(m)` (reloj + qué teléfono enseña la columna del mentor), usada por "Next", "←", los puntos
  y el selector. **U-15**: solo `pl1` pone a Marta; `pl2` deja a Pablo (M5 "A few days for you").
- `:106-118` teclado: se ignoran teclas con Ctrl/Meta/Alt, campos (`INPUT/TEXTAREA/SELECT`, contentEditable) y lo que esté dentro
  de `[role="dialog"]` o `[role="radiogroup"]` (el selector de ritmo de M5). **No** se ignoran los botones de los teléfonos
  (corrección 3 del arquitecto: tras pulsar "Yes" en el móvil, → sigue avanzando).
- `:248-280` K-38: **un punto por día** (13 en vez de 27); clic → primer momento de ese día; `title`/`aria-label` con todos los
  momentos del día. El punto del día 57 lleva a la crisis 21:12.
- `:145-163` selector "Jump to moment" en el menú "More" con los 27 momentos (para los momentos intermedios de un día); al elegir,
  quita el foco del selector y cierra el menú.
- `:286-295` U-12: `onPointerUp` del deslizador hace `blur()` (las flechas vuelven a mover de momento); `aria-valuetext="Day N"`.
  Con Tab sobre el deslizador, sus flechas siguen moviendo días (comportamiento nativo).

**Comprobación** (VERIFICADO, Playwright 1440×900)
- 5 × → rápidas desde "Before the demo starts" → día 40 21:10 "Third note in a complaint loop" (5.º momento; sin repetir).
- Clic en el deslizador en el día ~48,5 → día 49 21:10; foco en `BODY`; → → día 54 03:15 "Luis enters level 2" (momento, no día).
- Clic en el punto del día 57 → "Tue 3 Nov · 21:12 · Crisis phrase in a note → level 3 now".
- Selector: `v4` → columna Pablo; `pl1` → Marta; `pl2` → Pablo con M5 "A few days for you"; `v5b` → Pablo. El menú se cierra.
- A 1440 px los puntos vecinos (días 54/55/56 y 59/60) quedan a ~22 px con puntos de 16 px: no se tocan (captura).

## P6 · K-18 · legible en proyector
**Cambios** (`demo/page.tsx`)
- `:39` la capa de explicación empieza **cerrada** (`useState(false)`; decisión del encargo, no la de 800 px del plan).
- `:115` tecla `E` (sin Ctrl/Meta/Alt/Mayús, sin autorrepetición, ignorada en campos y hojas) abre/cierra. Indicación visible:
  `<kbd>E</kbd>` junto a "Show how Relevo decides" (`:219`).
- `:212` capa `lg:h-[30vh] lg:min-h-[220px]` (antes 38vh/260).
- `:203-204` clínica `Fit width={1100}` y contenedor `w-[1100px]` (`clinic/page.tsx` ya trabaja a `min-w-[1100px]`; no hizo falta
  tocar nada más).

**Medidas del ancho dibujado** (VERIFICADO, `getBoundingClientRect`; teléfono base 390 px, clínica base 1280 → 1100)

| Vista | Luis | Pablo | Clínica |
|---|---|---|---|
| 1440×900 ANTES, capa abierta 38vh (medido forzando 38vh/260 en el DOM) | 177 px (0,45) | 170 px (0,44) | 510 px |
| 1440×900 AHORA, capa abierta 30vh | 210 px (0,54) | 203 px (0,52) | 606 px (0,55) |
| 1440×900 AHORA, capa cerrada (arranque) | **316 px (0,81)** | 309 px (0,79) | 644 px (0,59) |
| 1280×720 ANTES, capa abierta (U-01) | ~125 px | — | — |
| 1280×720 AHORA, capa abierta | 150 px (0,38) | 143 px (0,37) | 432 px (0,39) |
| 1280×720 AHORA, capa cerrada (arranque) | 232 px (0,60) | 225 px (0,58) | 568 px (0,52) |

Objetivo del plan a 1440×900 (teléfonos ≥0,75 cerrada; clínica ≥0,55 abierta): cumplido (0,81/0,79 y 0,55).
E abre (aria-checked=true) y cierra; Ctrl+E no cambia nada (VERIFICADO). Clínica a 1100 px: panel C1, pestaña Alerts y ficha de
Luis sin textos pisados (capturas `fe-1440-alerts.png`, `fe-1440-luisfile.png`, `fe-crisis-1440.png`, `fe-1280-open.png`).

## Opcional · K-06 · aviso si Luis apaga consentimientos en A0
- `demo.ts:121-122`: `luisConsents: { onboarded, off: [...] }` en la vista de /demo (solo lectura del mundo; no cambia valores por
  defecto de privacidad ni el motor).
- `demo/page.tsx:126-127, 176-181`: si Luis ya hizo la bienvenida y hay alguno apagado, franja azul bajo la línea de tiempo:
  "Luis turned off notes analysis and AI ideas — the story needs all three. **Reset**" (Reset = "Reset everything people did").
- VERIFICADO: mundo nuevo a las 0 09:30, `onboard` con data on / notes off / ideas off → aparece la franja con ese texto; pulsar
  Reset → desaparece (Luis vuelve a no haber hecho la bienvenida; el guion la hace a las 18:00 con las tres activas).

## Riesgos
- **K-45**: si alguna pantalla dependiera de recibir un objeto `data` nuevo en cada sondeo aunque no cambie, ya no lo recibe. Revisado
  por el arquitecto (solo `MenteeApp` mira `data.openHelp`, que cambia solo si cambia la respuesta). Recorrido 19/19 y hoja de
  crisis estable: INFERIDO que no hay más dependencias.
- `useView` lo usan las 6 pantallas: el cambio es interno; `reload()` sigue forzando carga (vacía la memoria de "último texto").
- Clic en un punto ya no lleva a un momento intermedio del mismo día: para eso, "Next" o el selector "Jump to moment".
- "←" ahora también elige el teléfono del mentor según el momento (antes no lo cambiaba): coherente con "Next"; INFERIDO sin efectos.
- La pastilla "Connection lost" sale también si el servidor devuelve error (500) en `/api/relevo/demo`, no solo sin red: es lo
  deseado, pero en desarrollo un error de compilación de otro carril la hará aparecer.
- A 1280×720 con la capa abierta los teléfonos siguen pequeños (0,38): por eso la capa empieza cerrada; ensayar con F11.
- El indicador "N" de Next en modo desarrollo tapa en parte el interruptor abajo a la izquierda (solo en `npm run dev`).

## Arreglos tras revisión

Solo los obligatorios de `c1-calidad.md` (T4 y T5) y, porque lo pidió el jefe de equipo, cerrar "More" con Escape. El resto de opcionales no se ha hecho.

**T4 · `src/app/relevo/kit.tsx` (`useView`)**
- `:46` nuevo contador `let applied = 0` (número de la última respuesta aplicada).
- `:60-61` `if (alive && my > applied) { applied = my; …` en vez de `my === last`: se pinta cualquier respuesta más nueva que la ya pintada, aunque después se haya lanzado otra petición. Una respuesta más vieja sigue sin pisar a una más nueva, y si el texto no cambia sigue sin repintarse (`lastText`, sin tocar).
- `:69` el error también usa `my > applied`, así que con red lenta vuelve a salir "Connection lost". La forma `{ data, error, reload }` no cambia.

**T5 · `src/app/relevo/demo/page.tsx`**
- `:189` franja de consentimientos con el texto exacto de Seguridad clínica: "Luis turned off … That's his choice; the scripted story assumes all three are on."
- `:48` `const viaKey = useRef(false)`, antes del `return` temprano.
- `:160-161` en el `<select>`: `onKeyDown` pone `viaKey = true` y `onPointerDown` lo pone a `false`.
- `:165` en `onChange`, después de `pickMoment`: `if (viaKey.current) return;`. Con teclado el foco y el menú se quedan; con ratón siguen el `blur()` y el cierre de antes.
- `:144-151` `onKeyDown` en el `<details>`: Escape cierra el menú y devuelve el foco a "More".

**Comprobación**
- `npx tsc --noEmit -p .` 0 · `npx eslint src/app/relevo` 0 · `relevo-check` 33/33 · `relevo-demo-walk` 19/19 (servidor en :3000).
- Playwright, cada prueba en un contexto propio con un mundo aleatorio `fe…`:
  - Con 6 s de retraso en `/api/relevo/**` (`route` + `setTimeout(6000)`): `/relevo/demo` se pinta en 6,9 s y `/relevo/app?as=luis` en 6,5 s (antes no se pintaban nunca).
  - Con 0 s se pintan en 0,46 s y 0,43 s. 8 flechas → rápidas acaban en el momento 8 de la lista ("Third day in a row: Luis enters level 1"), así que no se repite ninguno.
  - Teclado: Tab desde "More" lleva al select; ↓ ↓ ↓ salta a match → intro → welcome, el foco sigue en el SELECT y el menú sigue abierto. Escape cierra el menú y deja el foco en "More".
  - Ratón (`pointerdown` + elegir opción): salta al momento, el menú se cierra, el foco sale del select y → avanza al momento siguiente.
