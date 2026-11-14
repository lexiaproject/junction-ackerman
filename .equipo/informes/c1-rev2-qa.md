# C1 · Segunda revisión de QA · `useView` (QC1-01) y "Jump to moment" (XC1-01)

Autor: agente de QA · Fecha: 14/11/2026 · Servidor http://localhost:3000 (sin Gemini) · Rama `sesion-autonoma`, cambios sin
confirmar. Solo lectura: no he tocado nada del repositorio salvo este informe. Navegador: contextos de Playwright propios
(`browser.newContext()`, cerrados al acabar; no he tocado las pestañas de otros agentes). Mundos aleatorios con prefijo `qr2…`.
Salida de la puerta y captura en `C:\Users\<user>\AppData\Local\Temp\claude\545cfc39a490963b\202f2361-f25d-42b2-bb0f-e0ad8f1417d8\scratchpad\qa2\`
(`gate.txt`, `jump-final.png`).

## Veredicto

| # | Arreglo | Veredicto |
|---|---|---|
| 1 | `src/app/relevo/kit.tsx` · `useView` (respuestas lentas y viejas) | **APROBADO** |
| 2 | `src/app/relevo/demo/page.tsx` · selector "Jump to moment" en "More" | **APROBADO** (con una nota menor, QC2-01) |
| — | Puerta | **OK**: 33/33, 19/19, `tsc` 0, `eslint` 0 |

## 1. `useView` · APROBADO (VERIFICADO)

Cambio: ahora se descarta una respuesta solo si es más vieja que la última **ya aplicada** (`my > applied`), no que la última
pedida. Así una respuesta lenta se pinta aunque haya otra petición en marcha.

- **Retraso de 6 s** en `**/api/relevo/**` (`ctx.route` con espera y `route.continue()`), reloj en el día 50 10:00:
  - `/relevo/demo?w=qr25iyuri` → se pinta a los **6,9 s** (cabecera "Tue 27 Oct · 10:00 day 50…", botón "Next moment").
    En la primera revisión seguía en "Loading the demo…" a los 25 s.
  - `/relevo/app?w=qr25iyuri&as=luis` → se pinta a los **7,8 s** ("Hi, Luis", "Pablo left you a note").
  - Acción con 6 s de retraso (mundo `qr24i7rdp`, día 47 08:30): `POST /act` pablo `v1_answer {choice:"yes"}` → 200; la pestaña
    de Luis enseña "Pablo would like to talk to you" a los **4,1 s** sin recargar.
- **Sin retraso (0 s)** (mundo `qr284i3u6`): la demo se pinta a los 0,75 s y la app de Luis a los 1,2 s, con el mismo contenido
  que con retraso. Igual que antes.
- **Actualización tras una acción** (mundo `qr2ifdutx`, día 47 08:30): clic en "Yes" en el teléfono de Pablo dentro de la demo →
  el teléfono de Luis de la demo cambia a "would like to talk" a los **1,75 s**; la pestaña aparte `/relevo/app?as=luis`, a los
  **4,9 s** (sondeo de 4 s), sin recargar. Pablo pasa a "Suggest a walk tomorrow morning". Tras recargar Luis se ve lo mismo.
  Sin errores de página en las tres pestañas (demo, Luis, clínica).
- **Respuestas viejas no hacen volver atrás**: retrasos desordenados en `GET /api/relevo/demo` (4 s, 0, 2,5 s, 0, 3,5 s, 0,3 s
  en rotación), 6 pulsaciones seguidas desde el principio, y muestreo del momento cada 150 ms durante 16 s:
  - Con → (mundo `qr2ktx1dl`): secuencia de momentos −1 → 2 → 5, **0 retrocesos**, final en el 6.º momento (día 43 09:00).
  - Con 6 clics en "Next moment" (mundo `qr2iu5sj8`): −1 → 2 → 5, **0 retrocesos**, mismo final.
  - Sin errores de página.

## 2. "Jump to moment" · APROBADO (VERIFICADO, mundo `qr2v912b7`, 1440×900)

- **Teclado**: foco en "More" + Intro → menú abierto; Tab → foco en el select. ↓ ↓ ↓ ↑ → los momentos pasan a `match`,
  `intro`, `welcome` y vuelven a `intro` (el reloj se mueve en cada uno: 08:10, 09:20, 18:00, 09:20), y en todos los pasos el
  **menú sigue abierto y el foco sigue en el select**. Con → sobre el select avanza un solo momento (lo hace el propio select; el
  atajo global no se suma).
- **Ratón**: clic en el select y elegir `v5` → el reloj salta al día 56 09:02, **el menú se cierra** y el foco vuelve al
  documento; después → avanza al momento siguiente (`crisis`, día 57 21:12). Nota: Playwright no puede pulsar la lista nativa
  del sistema, así que hice clic real en el select y elegí la opción con `selectOption`; el `pointerdown` real es el que marca
  "ratón".
- **Escape**: con el foco en el select, en "More" o en el botón "Go back to day 0" del menú → **el menú se cierra y el foco vuelve
  a "More"** en los tres casos.

```
QC2-01 · Varias flechas muy seguidas en "Jump to moment" solo avanzan un momento
Gravedad: baja     Evidencia: VERIFICADO
Dónde: src/app/relevo/demo/page.tsx (select controlado por `moment?.key`)
Pasos: con el foco en el select, pulsar ↓ tres veces con 80 ms entre ellas → avanza 1 momento (índice 1 → 2), no 3.
Qué pasa: el select vuelve a la opción del reloj actual hasta que llega la respuesta, así que las pulsaciones rápidas se
  pierden. No vuelve atrás, no se cierra el menú ni se pierde el foco. Pulsando a ritmo normal (≥1 s) va de uno en uno bien.
Arreglo propuesto (opcional): no bloquea la demo. Si se quiere, mostrar en el select el destino pedido (`target.current`)
  en vez del momento del reloj mientras hay peticiones pendientes.
```

## 3. Puerta (VERIFICADO)
- `node scripts/relevo-check.mjs` → **33/33** OK ("Todo coincide con el motor de referencia y con la lista de aceptación").
- `node scripts/relevo-demo-walk.mjs` → **19/19** OK ("Recorrido de la demo completo").
- `npx tsc --noEmit -p .` → código 0. `npx eslint src/app/relevo` → código 0.
