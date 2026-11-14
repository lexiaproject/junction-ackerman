# C3 · Frontend: tres arreglos pequeños (sin commit)

## Qué cambié
1. **La capa se abre sola en el emparejamiento y en el cierre** (`src/app/relevo/demo/page.tsx:123-131`).
   Cuando el reloj avanza a un momento del grupo "match" o "close", la capa "Show how Relevo decides" se abre sola.
   El código recuerda el último reloj y el grupo en que estaba (`seen`). Solo la abre si el reloj ha ido **hacia delante** y el grupo es
   **nuevo**. Así, si el presentador la cierra con E, no se vuelve a abrir en los otros dos momentos del grupo "match"
   (intro, welcome), ni con el sondeo de cada 5 s, ni al ir hacia atrás. Al cargar la página no se abre: hace falta un primer avance.
   El cambio de estado se hace mientras se dibuja la página y no dentro de un `useEffect`, así que eslint no protesta.
2. **Encabezados sin números** (`demo/page.tsx:371, 398, 429, 478, 507, 523`): quité "1 ·" … "8 ·" de los `<H>` de `Explain`.
   El texto no cambia.
3. **Grabadora compacta** (`src/app/relevo/kit.tsx:512`, solo `Recorder`): el contenedor ya no usa siempre `w-full`.
   En modo `compact` usa `w-auto shrink-0`, salvo en el estado "review" (el cuadro para escribir lo que dijiste), que sigue a todo el ancho.
   La versión no compacta no cambia.

## Cómo lo comprobé
- `npx tsc --noEmit -p .` OK · `npx eslint src/app/relevo` OK · `relevo-check.mjs` 33/33 · `relevo-demo-walk.mjs` 19/19.
- Playwright (contexto aislado `c3front`, mundo `c3fe7k29q`), `/relevo/demo` desde el día 0, pulsando → 27 veces:
  - Paso 1 (match): la capa se abre sola y enseña 0.87 y 0.758. La cerré con E.
  - Pasos 2-26: la capa sigue cerrada (también en intro y welcome).
  - Paso 27 (cierre, día 62): se abre sola y enseña 88 %, 5 days y 2.45. Sigue abierta tras el sondeo de 5 s.
    Si la cierro con E, sigue cerrada 7 s después.
- A 390x844:
  - Inicio de Luis: el botón grande y su texto se ven igual que antes.
  - Conversación Luis→Pablo: "Hold to talk to Pablo. No need to reply." ocupa 2 líneas y no hay mancha.
  - Pablo, pestaña Luis: "Hold to talk to Luis" ocupa 1 línea.
  - Pablo, pestaña Marta: "Hold to talk to Marta" ocupa 1 línea.
- Dentro de la demo (1440 px), en la conversación del teléfono de Luis: la misma frase ocupa 2 líneas.
- El círculo "N" de abajo a la izquierda es el indicador de Next.js en desarrollo. No sale en producción.
