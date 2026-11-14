# C2 · Segunda revisión de seguridad clínica y privacidad (Relevo)

Revisor: seguridad clínica y privacidad · Ciclo 2, revisión 2 · 14/11/2026 · Solo lectura (sin commits, sin `.env.local`).
Alcance: solo lo cambiado tras `c2-rev-clinica.md`: `MenteeApp.tsx` (HelpSheet), `kit.tsx` (`Sheet`) y la frase de
"Beyond the clinic" en `demo/page.tsx`. Método: `git diff HEAD`, fechas de archivo, API local con mundos propios
(`c2r2clin1732616137`, `c2r2clinb99952096`, día 57 21:13) y Playwright (420×880) en `/relevo/app?…&as=luis` y `/relevo/demo?w=…`.

## Veredicto: APROBADO

Los arreglos son solo de interfaz; el contenido de la hoja de ayuda, M6 y la lógica de crisis del servidor no cambian, y
nada nuevo confunde a una persona en crisis.

## Comprobaciones

| Punto | Resultado |
|---|---|
| Contenido de la hoja de ayuda | **Idéntico.** Leído en el navegador: "Need help right now?" · "You're not alone. Choose what you need." · Emergency · 112 (`tel:112`, primero) · MIELI crisis line · 09 2525 0111 / 24 h, in Finnish (`tel:+358925250111`) · Talk to my clinic · Ask Pablo to write to me · "Pablo doesn't see your health data." · "Clinic +358 9 4512 3300". Mismo orden. |
| Textos de confirmación | **Idénticos:** "They'll call you as soon as possible" y "Pablo has your message". Ahora cada uno tiene su propio estado: pulsar los dos muestra las dos confirmaciones a la vez (antes la segunda borraba la primera, un detalle que confundía). Van en `role="status"` debajo de cada botón. |
| Doble toque | **Arreglado.** Con doble clic real de Playwright en "Talk to my clinic" y en "Ask Pablo…": la clínica recibe **1** alerta "Luis pressed “Talk to my clinic”" y Pablo **1** aviso HELP (antes 2). `setDone` va ya antes del `await`; el botón queda `aria-disabled`. La confirmación se muestra aunque falle la red, igual que antes (no cambia la honestidad). |
| M6 | Sin cambios: `MentorApp.tsx` no toca M6 en este arreglo; `/api/relevo/mentor?as=pablo` devuelve `"m6":{"menteeName":"Luis"}` el día 57. |
| Lógica de crisis del servidor | Sin cambios nuevos: `src/lib/relevo/sim.ts` no se ha tocado desde antes de mi informe anterior (12:23 frente a 12:33); su único cambio frente a HEAD sigue siendo V3_CANT, ya aprobado. `case "help"`, `severe()` y nivel 3 intactos. `src/app/api/` sin cambios frente a HEAD. |
| `Sheet` en la vista de demo | Con la hoja de Luis abierta sola (crisis), el foco se queda en `<body>`: el presentador no pierde "Next moment". Correcto. |
| `Sheet` en la app suelta | El foco entra en el título (no en un botón: un Enter o toque no lanza nada sin querer); Tab va a 112 primero; Escape y "Close" cierran. Correcto. |
| Frase "Beyond the clinic" | "The phone nudges a person, never an alarm, and only the clinic sees health data." Es exactamente el texto que pedí y coincide con "Pablo doesn't see your health data" de la hoja. Cerrado. |

## Notas menores (no bloquean)

1. **Anillo en el título (arreglo menor 4 de la revisión anterior, no aplicado).** En la app suelta el `h2` enfocado sigue
   mostrando el recuadro verde (`:focus-visible` = true, `outline 1.6px solid`). Es solo visual. Si hay tiempo, en
   `kit.tsx` `Sheet`, tras `title.tabIndex = -1;`: `title.style.outline = "none";`.
2. **Guarda del doble toque con el estado del render.** Dos `click()` lanzados por código en el mismo instante aún pueden
   enviar dos peticiones (lo vi con un script; con doble clic real no pasa). Para una persona real está arreglado. Si se
   quiere blindar del todo, usar un `useRef` como guarda además del estado.
3. Al recargar la app la confirmación desaparece y el botón vuelve a estar activo: volver a pedir ayuda crea una alerta
   nueva. Es aceptable (es una petición nueva real).

Pendientes del ciclo 1 sin cambios (C-01, C-02/C-03, C-04, C-06, C-09) siguen en "necesita tu decisión".
