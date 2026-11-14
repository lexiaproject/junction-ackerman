# Ciclo 2 · Segunda revisión de QA (arreglos sin confirmar)

Fecha: 14/11 · Servidor local `http://localhost:3000` sin Gemini · Playwright en contextos propios (mundos `qa2r…`, `qa2m…`, `qa2a…`, `qa2v…`, `qa2h…`) · Sin cambios en el código ni commits.

**Veredicto global: APROBADO** (los 5 puntos pasan; queda un hallazgo menor, no bloqueante, en el punto 2).

## 1. Vista de demo: avanzar desde el día 55 hasta el final · APROBADO
Mundo `qa2rwu7c6k`, reloj puesto en el día 55 08:30, solo flecha → (sin ratón ni Escape), 9 pulsaciones:
- 55 12:00 → 56 08:30 → 56 09:02 → **57 21:12 "Crisis phrase…" (hoja "Need help right now?" abierta sola en el teléfono de Luis)** → 57 21:27 → 59 10:00 → 60 08:30 → 60 09:02 → 62 12:00 "What the simulation shows".
- El foco se queda en `<body>` en todo momento (la hoja no se queda con el foco del presentador), así que la flecha sigue funcionando con la hoja abierta. Al final, "Next moment" está desactivado.

Con el ratón en "Next moment" (mundo `qa2mjc2g3v`): la misma secuencia de 9 momentos, la hoja se abre sola en 57 21:12 y 21:27 y se cierra en 59 10:00. "Next moment" queda desactivado al final.

## 2. App suelta `/relevo/app?as=luis`, reloj en 57·1440+1273 · APROBADO (con un hallazgo menor)
Reloj puesto en 57·1440+1200 y luego `POST /api/relevo/act {type:"clock", p:{to:83353}}` (200):
- **Foco en `<body>`** (`qa2vjoowde`) y **foco dentro de la app** ("My devices and privacy", `qa2vl2vix3`): la hoja se abre sola, `aria-modal="true"`, el foco entra en el título h2. 8 Tab + 8 Shift+Tab recorren solo Close · 112 · MIELI · Talk to my clinic · Ask Pablo, dan la vuelta y no salen ninguna vez (0 de 16). Escape cierra la hoja y el foco vuelve a donde estaba (body o "My devices and privacy"). Pasados 4 s no se vuelve a abrir.
- Con el botón Help y Enter, la hoja se abre con el foco dentro. Escape la cierra.

**Hallazgo menor (no bloqueante):** si antes de la crisis el foco está en el selector "View as" (Luis/Pablo/Marta), que está fuera del teléfono (por ejemplo, después de hacer clic en la pestaña "Luis"), la hoja se abre sola pero **no toma el foco**. Tab sigue recorriendo la página de detrás (18 de 18 fuera) y **Escape no cierra la hoja**, porque solo se escucha dentro de ella (mundo `qa2azq1yl2`). Viene de la regla de `Sheet` en `kit.tsx`: "solo toma el foco si estaba en body o dentro de la misma app". Esa regla tiene sentido en la vista de demo, pero no en la app suelta. Arreglo sugerido de una línea: fuera de `[data-rv-demo]`, tomar siempre el foco (`const take = embedded ? (prev && prev !== document.body && scope.contains(prev)) : true;`). La demo no se ve afectada.

## 3. Hoja de ayuda: confirmaciones, triple toque y contenido · APROBADO
Mundo `qa2hk38wnp` (la hoja se abre al cargar a las 21:13; se cierra con Close y se vuelve a abrir con Help):
- Tres clics rápidos de ratón (eventos reales, en coordenadas) en "Talk to my clinic" y después "Ask Pablo to write to me": las **dos confirmaciones se ven a la vez** (`role=status`): "They'll call you as soon as possible" y "Pablo has your message". 4 s después siguen visibles.
- `/api/relevo/clinic`: `alerts` pasa de 2 a 3. Las alertas "Luis pressed “Talk to my clinic”" pasan de 0 a **1** (una sola alerta nueva, `kind:"help"`). Tras el primer toque el botón queda con `aria-disabled="true"`.
- Contenido igual que en `HEAD`: "Need help right now?", "You're not alone. Choose what you need.", Emergency · 112 (`tel:112`), MIELI crisis line · 09 2525 0111 (`tel:+358925250111`), "24 h, in Finnish", Talk to my clinic, "Ask Pablo to write to me", "Pablo doesn't see your health data.", "Clinic +358 9 4512 3300". Los textos de confirmación también son los mismos. El `diff` del final de `HelpSheet` contra `git show HEAD:` sale idéntico. Lo único nuevo es el botón "Close" (de K-08).

## 4. Tarjeta "Beyond the clinic" · APROBADO
Mundo nuevo `qa2mjc2g3v`, antes del primer momento: "…The phone nudges a person, never an alarm, and only the clinic **sees health data**. Press → to start".

## 5. Puerta de calidad · APROBADO
- `node scripts/relevo-check.mjs`: 33 OK, salida 0 ("Todo coincide con el motor de referencia…"). Las otras líneas son el aviso de Node sobre el tipo de módulo y un volcado de depuración, no fallos.
- `node scripts/relevo-demo-walk.mjs`: 19 OK, salida 0 ("Recorrido de la demo completo…").
- `npx tsc --noEmit -p .`: salida 0, sin errores.
- `npx eslint src/app/relevo src/lib/relevo`: salida 0, sin avisos.
