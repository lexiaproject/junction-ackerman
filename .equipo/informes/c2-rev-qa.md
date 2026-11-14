# c2-rev-qa · Revisión de comportamiento del ciclo 2 (sin confirmar)

Revisor: QA · sáb 14 nov 2026, ~12:30–12:45 · servidor local `http://localhost:3000` sin Gemini.
Método: navegador Playwright en contexto propio (`qa-c2-rev`), mundos propios (`qac2r7k4m9`, `qac2p9051l4`, `qac2lh8u61h`, `qac2hjxifqb`, `qac2dlyqek2`, `qac2t844xsn4`, `qac2uy35ik0y`) y llamadas a la API. Solo lectura: no se ha tocado código ni se ha hecho commit.
Scripts y salidas: `C:\Users\<user>\AppData\Local\Temp\claude\545cfc39a490963b\202f2361-f25d-42b2-bb0f-e0ad8f1417d8\scratchpad\qa\` (`trace.mjs`, `trace2.mjs`, `check.txt`, `walk.txt`, `tsc.txt`, `eslint.txt`, `trace.txt`).

## Veredicto global

**Casi listo para commit, salvo 1 bloqueante (QC2-01).** La puerta pasa entera y casi todo lo pedido funciona. Pero el cambio K-08 (el foco entra en las hojas) rompe el avance con la flecha → en el momento de crisis de la demo: el presentador se queda atascado. El guion de ensayo (`GUION-ENSAYO.md`, línea 16) dice que se avanza con "Next moment" o con la flecha derecha.

## Puerta (punto 6)

| Comprobación | Resultado |
|---|---|
| `node scripts/relevo-check.mjs` | **33/33**, exit 0 |
| `node scripts/relevo-demo-walk.mjs` | **19/19**, exit 0 |
| `npx tsc --noEmit -p .` | limpio, exit 0 |
| `npx eslint src/app/relevo src/lib/relevo` | limpio, exit 0 |
| Relay `/`, `/app`, `/clinic` (y `/relevo`, `/relevo/demo`) | 200 los cinco |
| Consola del navegador en toda la sesión | 0 errores, 0 avisos |

## Veredicto por cambio

| Cambio | Veredicto | Evidencia |
|---|---|---|
| P7 · la hoja de Pablo se cierra al pasar de momento (MentorApp `resetKey`) | **OK** | Día 47 08:41, "Send as voice note" → la hoja se abre (el foco va a su título). "Next moment" → 09:05: la hoja se cierra, Pablo está en **Today** ("Sent. Luis will hear it…"). En la conversación de Luis hay **1 sola** nota de Pablo del día 47 (`note:pablo:68225`): no hay doble envío. |
| P7 · la clínica vuelve al Panel al pasar de momento (ClinicWeb `resetKey`) | **OK** | Con la ficha de Luis abierta (pestaña Alerts) → Next → Panel. Con la pestaña Matching → Next → Panel. |
| P7 · "Open Luis's file" funciona dos veces (contador `n`) | **OK** | Capa abierta con E, día 54 10:10 (riesgo alto). Abrir → ficha; volver → Panel; abrir otra vez → ficha; pulsar con la ficha ya abierta → sigue en la ficha; desde Alerts → ficha. 4 de 4. |
| J-08 · tarjeta "Beyond the clinic" | **OK** | Se ve antes del primer momento (con "Press → to start"). Después de "Next moment" (día 0 08:10) ya no aparece. |
| K-31 · cierre honesto (día 62) | **OK** | 88 %, 5 days (IQR 2–7.25), 2.45, y el nivel 2 con 48 % y "1 day's notice", 0.5 falsas alarmas. Textos nuevos: "synthetic people we generated…", "Real-world accuracy would need a clinical study". "Next moment" queda desactivado al final. |
| P8 / K-20 · tarjeta del copiloto en Today | **OK** | Día 40 21:15: "Only you see this · A private idea for your next note to Luis · Open". Open → pestaña **Conversation**, con el texto nuevo sin contenido de salud ("keep going over the same ground…"). Tras "Dismiss" y volver a Today, la tarjeta desaparece y sale "Nothing pending today". |
| K-19 · M5 | **OK** | Día 60 09:05: "We suggest a pause… / You can write to Marta whenever you like." Ya no promete nada de Marta ni menciona datos. |
| K-12 · M0 sin la huella de recaída | **OK** | Día 0 08:10, API del mentor: el primer motivo es "Your clinic thinks you have a lot in common". La demo sigue enseñando "You both started out sleeping more…" (intencionado). |
| K-11 · variante de V3 | **OK** | Día 55 09:00, Luis: "Fancy sending Pablo a note? A few words are enough." |
| P10 / U-10 · rótulo del plan | **OK** (con un matiz, QC2-05) | Día 48 11:25–11:30: Luis ve "20-minute walk · Today, 10:00" y Pablo ve "Walk with Luis · Today, 10:00 · Luis is in". En la API del mentee: `Today, 10:00`, `Sat 10 Oct, 09:00`. |
| K-08 · foco en las hojas (app de Luis sola) | **OK** | Día 57 21:13: la hoja se abre sola, el foco va al h2 "Need help right now?" (`aria-modal=true`, `aria-labelledby` apunta al h2). Tab ×9 da la vuelta dentro (112 → MIELI → Talk → Ask Pablo → Close → 112…); Shift+Tab también. Escape la cierra y no se vuelve a abrir en 6 s. Abierta con el botón Help, Escape devuelve el foco a **Help**. |
| K-08 · foco en las hojas, en la **demo** | **FALLA** → QC2-01 | Ver abajo. |
| K-08 · Escape en una hoja no cierra la otra | **OK** | En la demo, con la hoja de ayuda de Luis y la de Pablo abiertas: Escape en la de Pablo deja abierta la de Luis (y el foco vuelve al Help de Pablo); Escape en la de Luis deja abierta la de Pablo. Lo probé con la hoja Help de Pablo: en el momento de crisis Pablo no tiene tarjeta para redactar. La hoja de redactar usa el mismo componente `Sheet`. |
| K-09 · confirmación legible y sin doble alerta | **OK** (con un matiz, QC2-03) | "They'll call you as soon as possible" queda fuera del botón, en `role=status`, a 14 px seminegrita, teal #0E6B5C sobre #F5F6F3. El segundo toque (con ratón o con Enter) no crea otra alerta: `/api/relevo/clinic` sigue con 1 alerta `help`. El botón conserva el foco. |
| K-44 · Help de 44 px | **OK** | Luis 81×44, Pablo 92×44. |
| Contenido de la hoja de ayuda | **OK** | Igual que en HEAD: 112, MIELI 09 2525 0111 (24 h, in Finnish), Talk to my clinic, Ask Pablo to write to me, "Pablo doesn't see your health data.", Clinic +358 9 4512 3300. |
| P9 · traza "What just happened" en inglés | **OK en el guion** / falla fuera de él → QC2-02 | Recorrí los 27 momentos (46 líneas únicas): 0 palabras en castellano y 0 claves con `_`. |

## Hallazgos

### QC2-01 · ALTA (bloqueante para la demo) · En la crisis, la hoja de Luis le quita el foco al presentador y la flecha → deja de avanzar
Es una regresión de K-08: antes, la hoja no movía el foco.

Pasos:
1. Abrir `/relevo/demo?w=<nuevo>` y llevar el reloj a día 57 21:05 (momento "Marta says yes → Pablo reads V5").
2. Pulsar "Next moment" (con ratón, o con el foco en el botón y Enter) → 21:12 "Crisis phrase in a note".
3. La hoja de Luis se abre sola y `document.activeElement` es el h2 "Need help right now?" dentro del teléfono de Luis.
4. Pulsar la flecha → : **no pasa nada**. El reloj se queda en 21:12. Tab tampoco sale de la hoja, porque el foco está atrapado.

Causa: mientras el reloj se mueve, "Next moment" y "Previous" están desactivados (`disabled={busy}`), así que el foco cae a `<body>`. La regla de `Sheet` dice "tomo el foco si estaba en `<body>`", así que lo toma. Después, el manejador de teclas de la demo ignora cualquier tecla que salga de dentro de un `[role="dialog"]`. Pasa lo mismo si se avanza solo con flechas, porque ahí el foco ya está en `<body>`. La única salida es pulsar Escape, que cierra la hoja de crisis delante del jurado, o hacer clic con el ratón en "Next moment".

Dos arreglos posibles (cualquiera vale):
- (a) Que la hoja que se abre sola (`openHelp`) no tome el foco cuando está dentro de la demo. Por ejemplo, una prop en `Sheet` que el teléfono de la demo apague.
- (b) Que en la demo no se ignoren las flechas cuando el diálogo se abrió solo.

Cambiar solo `disabled` por `aria-disabled` en "Next moment" no basta, porque avanzar con flechas también deja el foco en `<body>`.

### QC2-02 · BAJA · La traza enseña claves internas cuando alguien interactúa fuera del guion
`english()` solo traduce las claves de acciones y dominios. Otras claves internas pasan tal cual. Pasos (mundo `qac2uy35ik0y`): reloj a día 47 11:00 → `POST act {as:"luis", type:"plan", p:{planId, choice:"change_time"}}` y `POST act {as:"pablo", type:"v1_answer", p:{choice:"yes"}}`. La traza muestra:
- `Luis | Plan: change_time` (también saldría `other_day`). Se llega desde la interfaz si Luis pulsa cambiar la hora u "otro día" en un plan.
- `pablo | (v1_answer ignored: no longer applicable)`: clave con `_` y quién en minúscula. Pasa cuando llega un botón viejo.

Origen: `sim.ts:627` y `sim.ts:767`. No afecta al guion.

### QC2-03 · BAJA (ya pasaba antes) · Cerrar y volver a abrir la hoja de ayuda permite crear otra alerta
El estado `done` vive dentro de la hoja. Pasos (mundo `qac2hjxifqb`, día 57 21:13): "Talk to my clinic" (1 alerta `help`) → Escape → Help → la confirmación ya no está → "Talk to my clinic" → **2 alertas `help`** en `/api/relevo/clinic`. En HEAD pasaba lo mismo (`disabled` también era local), así que no es una regresión, pero K-09 no lo cubre.

### QC2-04 · BAJA · Al cerrarse la hoja de redactar por "Next moment", el foco acaba en `<body>`
Día 47 08:41, abrir "Send as voice note" y pulsar "Next moment": el foco termina en `<body>`, porque el botón se desactiva mientras carga. Las flechas siguen funcionando, así que no bloquea. Es solo para lectores de pantalla.

### QC2-05 · BAJA · `planWhen` solo recalcula los rótulos "Today/Tomorrow"
En la lista de planes de Luis (día 48) aparece `Going to the market with Pablo | Saturday, 11:00`. Es un plan de hace semanas, pero su rótulo original era un día de la semana, así que no se recalcula y se lee como si fuera este sábado. En la interfaz solo se ve en la ficha del plan. No afecta al guion.

### QC2-06 · INFO · Dos `aria-modal="true"` a la vez en la demo
Con las dos hojas abiertas, la página tiene dos diálogos modales. Funciona con el teclado (Escape aislado), pero un lector de pantalla puede no llegar al segundo. Solo afecta a la vista de demo.

### Observaciones que ya estaban antes (fuera del ciclo 2, solo para el backlog)
- En la ficha de la clínica, el botón de volver dice "Panel" aunque vuelva a la pestaña Alerts.
- Pablo, día 60 09:05: enseña "Nothing pending today" a la vez que el aviso V5 de Marta y la M5. La condición `nothing` no tiene en cuenta los avisos para sí mismo.
- En `/relevo/app` a 420 px de ancho, el indicador de Next.js (solo en desarrollo) tapa la pestaña "Today". En producción no existe.

## Recomendación
Arreglar QC2-01 antes del commit del ciclo 2. Basta con un cambio pequeño en `Sheet`/`MenteeApp` o en el manejador de teclas de la demo. Después, repetir los pasos 1–4 de QC2-01 y comprobar que la flecha → avanza de 21:12 a 21:27. QC2-02 a QC2-06 pueden ir al backlog.
