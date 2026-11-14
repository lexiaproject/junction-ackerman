# C2 · Revisión de seguridad clínica y privacidad (Relevo)

Revisor: seguridad clínica y privacidad · Ciclo 2 · 14/11/2026 · Solo lectura (sin commits, sin `.env.local`).
Método: `git diff HEAD` de los 13 archivos; API local sin Gemini con mundos propios (`c2clinbhuozpz1` en 15 momentos del
día 0 al 62; `c2clinhelp1970815138` en el día 57 21:13); navegador Playwright en
`/relevo/app?w=c2clinhelp1970815138&as=luis` (420×880): hoja de ayuda, foco, Escape, doble toque en "Talk to my clinic".
Guion de prueba (fuera del repo): `C:\Users\<user>\AppData\Local\Temp\claude\545cfc39a490963b\202f2361-f25d-42b2-bb0f-e0ad8f1417d8\scratchpad\c2rev\probe.mjs`.

## Veredicto global: APROBADO con arreglos menores. Nada bloqueado.

Ningún cambio toca `engine.ts`, la lista de crisis, `severe()`, el nivel 3 ni el texto de M6. Las respuestas de
`/api/relevo/me?as=luis` y `/api/relevo/mentor?as=pablo` siguen sin nivel, R, z, rasgos ni análisis en los 15 momentos
(las únicas apariciones de "sleep" son el texto de las propias notas y la lista de dispositivos, como antes).

---

## 1 · Textos que leen paciente y mentor

| Cambio | Veredicto | Nota |
|---|---|---|
| V3 variante tras "Can't today" (`texts.ts` V3_CANT, `sim.ts` offerV3) | **Aprobado** + arreglo menor recomendado | Verificado: día 55 08:30 y 13:00 Luis lee "Fancy sending Pablo a note? A few words are enough." El texto se fija al crear la oferta (día 54, mismo día que el "Can't today") y se mantiene al entregarse aplazada el día 55. Correcto. |
| Copiloto (`texts.ts`) | **Aprobado** | Texto exacto de C-12: sin salud, sin "both", no culpa ni diagnostica. Visible días 40-43, desaparece antes de la crisis y no aparece durante la pausa de Pablo (días 60-62). |
| M0 primera razón (`views.ts`) | **Aprobado** | Día 0 08:10: `["Your clinic thinks you have a lot in common","You both like voice notes","Compatible schedules"]`, 87 %. Ya no se revela cómo empezó la recaída de Luis; cubre también la rama "Some of your early changes were alike". |
| M5 (`MentorApp.tsx`) | **Aprobado** | "You can write to Marta whenever you like." Verdad siempre; no promete nada en nombre de Marta (C-07 cerrado). |
| Tarjeta del copiloto en Today de Pablo | **Aprobado** | "Only you see this" / "A private idea for your next note to Luis" / "Open". No dice nada del estado de Luis ni del de Pablo; se oculta con M6; Luis no la ve. |
| Rótulos del plan (`views.ts` planWhen) | **Aprobado** + arreglo menor opcional | Ya no dice "Tomorrow" de un plan pasado (día 55: "Sun 25 Oct, 10:00"). Queda un rótulo viejo que no empieza por Today/Tomorrow: el día 62 Luis ve "Going to the market with Pablo · Saturday, 11:00" (plan del día 26). Está marcado como pasado, no es un riesgo clínico. |

**Arreglo menor 1 (recomendado, línea roja 4).** La V3 normal sigue diciendo "Pablo would love to hear from you" cuando
Pablo no respondió a tiempo (`twoStep` "expired") o en la rama sin tarjeta de dos pasos: es un deseo que Pablo no ha
expresado. No es una regresión (el texto ya estaba), por eso no bloqueo. Arreglo exacto en `src/lib/relevo/texts.ts`:
```ts
V3: (mentor: string) => `Fancy sending ${mentor} a note? A few words are enough.`,
```
(y entonces V3_CANT sobra, pero puede quedarse). Actualizar también el catálogo de la clínica en
`src/app/relevo/ClinicWeb.tsx:444`: `["V3", "Fancy sending Pablo a note? A few words are enough."]`.
Si se mantiene la V3 normal, al menos el catálogo de la clínica debería listar las dos variantes.

**Arreglo menor 2 (opcional).** En `planWhen`, recalcular también los rótulos que empiezan por día de la semana:
```ts
if (!/^(Today|Tomorrow|Sunday|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday)\b/.test(p.whenLabel) || dn === day - dayOf(p.created)) return p.whenLabel;
```

---

## 2 · Hoja de ayuda (camino de crisis)

**Contenido: idéntico.** Texto leído en el navegador (día 57 21:13, la hoja se abre sola):
"Need help right now?" · "You're not alone. Choose what you need." · Emergency · 112 (primero, `tel:112`) ·
MIELI crisis line · 09 2525 0111 / 24 h, in Finnish (`tel:+358925250111`) · Talk to my clinic · Ask Pablo to write to me ·
"Pablo doesn't see your health data." · "Clinic +358 9 4512 3300". Confirmaciones idénticas: "They'll call you as soon as
possible" y "{mentor} has your message". Orden igual.

**Lógica: igual.** `act(w, as, "help", {type})` con los mismos parámetros; `sim.ts` case "help" sin cambios; nivel 3 y la
alerta "severe" de la nota siguen igual. M6 sin cambios (`{"menteeName":"Luis"}` los días 57-58, texto en `MentorApp.tsx`
intacto).

**Foco, "Close" y confirmación: aprobado.** El foco entra en el título (no en un botón, así que un toque o Enter no lanza
nada por accidente); Tab desde el título va a 112 primero; "Close" queda antes del título y solo se alcanza con Shift+Tab;
Escape cierra la hoja y el foco vuelve. La confirmación fuera del botón se lee mejor (verde, 14 px, debajo del botón) que
antes. Un botón visible para cerrar es bueno: nadie se siente atrapado. Nada de esto confunde en una crisis.

**Arreglo menor 3 (doble toque; no es regresión).** Probado con doble clic en "Talk to my clinic": la clínica recibe **dos**
alertas "Luis pressed Talk to my clinic". Antes pasaba lo mismo (el `disabled` también se ponía después del `await`), pero el
comentario nuevo dice que "un segundo toque no repite la acción" y no es así mientras la petición está en vuelo. Arreglo
de interfaz (no cambia la lógica de la alerta), en `MenteeApp.tsx` HelpSheet, en los dos botones, mover `setDone` antes del
`await`:
```tsx
if (done === "clinic") return;
setDone("clinic");
await act(w, as, "help", { type: "clinic" }).catch(() => {});
```
(ídem con `"mentor"`). La confirmación ya se mostraba aunque fallara la red, así que la honestidad no cambia.

**Arreglo menor 4 (visual).** Al abrirse, el título enfocado muestra un recuadro verde que pasa por debajo de la "×"
(captura en `.claude/.playwright-mcp/page-2026-11-14T11-31-52-430Z.png`). Para una persona en crisis parece un campo de texto.
El título no es interactivo, no necesita anillo. En `kit.tsx` Sheet, tras `title.tabIndex = -1;`:
```ts
title.style.outline = "none";
```
y en `HelpSheet` añadir `pr-12` al `h2` para que el título nunca quede bajo la "×" en pantallas de 320 px.

---

## 3 · Honestidad

| Cambio | Veredicto | Nota |
|---|---|---|
| Cierre de la demo (`demo/page.tsx`) | **Aprobado** | "200 synthetic people we generated… This checks that the logic works as designed, not that it predicts relapse in real patients." Añade el 48 % y "1 day's notice" del nivel 2; "almost never" sustituido por "far less often" (0,5 frente a 2,45: cierto); "Real-world accuracy would need a clinical study". Cubre C-21 (circularidad incluida). |
| Portada `/relevo` (`page.tsx`) | **Aprobado** | "working code, not clinically validated" y "doesn't diagnose, treat or replace emergency services". Cierra C-22. |
| Tarjeta "Beyond the clinic" | **Aprobado** + arreglo menor | Sin cifras clínicas. "only the clinic sees data" es demasiado amplio: Pablo recibe las notas de Luis (contenido, no datos) y el copiloto sale del análisis de notas. Texto exacto: `The phone nudges a person, never an alarm, and only the clinic sees health data.` (coherente con "Pablo doesn't see your health data" de la hoja de ayuda). |

## Fuera de alcance, pendiente del ciclo 1 (sin cambios en C2, solo recordatorio)
C-01 (Pablo conserva la frase de crisis), C-02/C-03, C-04 (apóstrofo ’), C-06 (M6 "is in touch"), C-09 ("Ask Pablo to
write" durante crisis/pausa: sigue visible en la hoja del día 57, ver captura) siguen como "necesita tu decisión" según
DECISIONES 6 y 9.

Nota de método: la herramienta Playwright reutilizó una pestaña de otro contexto aislado (`a11y-c2-xq7`); solo navegué a mi
propio mundo y no toqué el resto.
