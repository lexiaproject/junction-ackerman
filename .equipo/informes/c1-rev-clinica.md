# Revisión de Seguridad clínica y privacidad · ciclo 1

Revisor: especialista de seguridad clínica y privacidad (poder de bloqueo). Fecha: 14/11.
Base: `git diff HEAD` de los cambios sin confirmar. Referencias: DECISIONES 6-10 y "Líneas rojas" de `f1-clinica.md`.
Pruebas contra `http://localhost:3000` (sin Gemini), mundos propios aleatorios (`revc…`, `revclin7q2x`), reseteados al acabar.

## Resumen de veredictos

| # | Cambio | Veredicto |
|---|---|---|
| 1 | `note/route.ts` (K-01, K-07, K-26) | **APROBADO** |
| 2 | `relevo.css` (capas) · hoja "Need help right now?" | **APROBADO** (una mejora visual opcional) |
| 3 | `README.md` | **APROBADO CON ARREGLOS MENORES** (4 textos) |
| 4 | `demo/page.tsx` + `demo.ts` (consentimientos, "Connection lost", tecla E) | **APROBADO CON ARREGLO MENOR** (1 texto) |
| — | Hallazgo lateral: `kit.tsx` (`useView`) | Recomendación, no bloquea |

Nada queda bloqueado. Ningún cambio toca `engine.ts`, `CRISIS_PATTERNS`, `crisisFlag` ni `candidateLevel` (línea roja 1).

---

## 1 · `src/app/api/relevo/note/route.ts` — APROBADO

Lectura del código:
- El análisis sigue siendo exactamente `crisis: crisisFlag(text) || !!g?.crisis` con consentimiento de notas, y `crisis: false`
  sin él (igual que antes; la laguna K-15 sigue y está en DECISIONES 6 como "necesita tu decisión", no la amplía este cambio).
- Orden igual: primero el análisis (lista fija || Gemini) con la lectura inicial del mundo, después se recarga (`fresh`) y se
  añade el evento sobre la copia recién leída. El destinatario (`to`), las notas previas y el consentimiento salen de la
  lectura inicial. El paso a nivel 3 lo sigue haciendo `sim.ts:596` al reproducir el evento (`analysis.crisis && consents.notes`),
  sin cambios.
- Lo demás es higiene: `text` solo se acepta si es cadena (K-26), `audio` debe ser cadena, `mime` filtrado por lista blanca
  (K-07). Nada de esto puede hacer que una frase que hoy activa el nivel 3 deje de activarlo.
- Colateral revisado (`sim.ts`, K-03): un evento con datos malos se ignora con traza en vez de dejar el mundo en error 500
  para siempre. No afecta a notas válidas; es mejor que antes para la seguridad (un mundo en 500 no muestra la ayuda a nadie).

Pruebas (todas OK):
- Día 30 12:00, Luis → Pablo "I just want to die tonight": respuesta `crisis:true`; `/me?as=luis` → `openHelp:"alert:luis:43920"`;
  clínica: alertas graves 0 → 1 y Luis en nivel 3; Pablo recibe `m6:{menteeName:"Luis"}`; el JSON de Luis no trae nivel/riesgo.
- Día 30, Luis → clínica "me quiero morir": mismo resultado (nivel 3, ayuda abierta, alerta grave, M6).
- Momento del guion (reloj 57·1440+1273 = día 57 21:13): ayuda abierta para Luis, M6 para Pablo, 1 alerta grave, Luis nivel 3.
- Nota normal ("Tired today, but ok"): sin crisis y sin ayuda.
- Nota de crisis enviada a la vez que otra acción: la crisis sigue abriendo la ayuda.

Nota menor (sin cambio pedido): si durante la espera el presentador mueve el reloj, la nota se guarda con la hora nueva
(`addEvent` usa `fresh.clock`). Es el comportamiento correcto ("se envió ahora").

## 2 · `src/app/relevo/relevo.css` (capas) — APROBADO

Qué cambia de verdad: todo el CSS de Relevo pasa a `@layer components`, y por eso las clases de Tailwind que ya estaban
escritas en la hoja de ayuda (`justify-start px-5` en `MenteeApp.tsx:346`) empiezan a funcionar. Es decir, la hoja queda
como estaba diseñada desde el principio; nadie ha tocado su contenido.

Comprobado en navegador (390×844 y 320×640, día 57 21:13, la hoja se abre sola):
- Contenido idéntico y en el mismo orden: "Need help right now?" · "You're not alone. Choose what you need." ·
  **Emergency · 112** (primero, naranja oscuro, no rojo) · **MIELI crisis line · 09 2525 0111** (24 h, in Finnish) ·
  **Talk to my clinic** · **Ask Pablo to write to me** · "Pablo doesn't see your health data." · "Clinic +358 9 4512 3300".
  Todo visible en la primera pantalla también a 320 px (línea roja 6).
- Alineado a la izquierda con el icono delante se lee mejor como lista de opciones; los botones siguen siendo grandes
  (72 px) y el tono sigue tranquilo. Aceptable.

Mejora visual opcional (no texto, no bloquea): a 320 px el número de MIELI se parte en dos líneas ("09 / 2525 0111").
Para que el número no se corte, envolverlo en un `<span className="whitespace-nowrap">09 2525 0111</span>` dentro de la
misma etiqueta. El texto no cambia.

## 3 · `README.md` — APROBADO CON ARREGLOS MENORES

Bien:
- Cifras con el marco correcto (línea roja 9): "88 % … 5 days … 2.45 false alarms per person-year, on 200 synthetic people
  (100 simulated relapses)" y "They show that the logic works as designed, not that it predicts relapse in real patients;
  that would need a clinical study."
- No promete prevenir ni tratar: "Relevo does not diagnose, treat or replace emergency services."
- Lo simulado está etiquetado (sensores, sin login, guion, seudónimos, audio sin cifrar, clínica y teléfono ficticios,
  lista de crisis ilustrativa). "Unattended for 15 minutes, it goes to the on-call lead" es cierto (`sim.ts:357`).
- "The mentee and mentor apps never receive levels, scores or sensor features": cierto según el JSON comprobado.

Arreglos pedidos (texto exacto):

**3a. Privacidad: quién compara los datos.** Hoy dice que "the phone" compara, pero la arquitectura del propio README dice
que el navegador no calcula nada y que lo hace el servidor de la clínica. Además "Only the clinic ever sees data" no es
del todo cierto: el mentor recibe las notas de voz y el texto va (seudonimizado y con consentimiento) a la IA.
Sustituir:
> The phone quietly compares each person with their own usual (sleep, movement, daily rhythm, phone use).

por:
> Relevo quietly compares each person with their own usual (sleep, movement, daily rhythm, phone use).

y sustituir:
> **Only the clinic ever sees data.**

por:
> **Only the clinic ever sees health data.** Mentors only receive the voice notes sent to them.

**3b. Paso 5: no prometer más de lo que la app cumple.** El día siguiente Luis recibe V3 "Pablo would love to hear from you"
(C-08, pendiente de decisión), así que "that is respected" sin matiz es exagerado. Sustituir:
> Pablo says "Can't today" and that is respected.

por:
> Pablo says "Can't today": he gets no idea for Luis that day.

**3c. Paso 6: no repetir una afirmación que aún no es verdad en ese momento.** "Pablo is told the clinic is in touch" repite el
texto de M6 que señalé en C-06 (nadie ha atendido aún la alerta; K-10 está en "necesita tu decisión"). Sustituir:
> and Pablo is told the clinic is in touch.

por:
> and Pablo gets a calm message telling him he doesn't need to do anything else.

**3d. Límites honestos de la red de seguridad.** El README lista "the crisis-phrase filter" como real y la IA como si analizara
todas las notas. Añadir al final de la viñeta "The crisis list is a short illustrative list…":
> The filter only runs on the notes of people who turned on note analysis, and it misses phrasings that are not on the list.

y en la viñeta de Gemini, cambiar "analyses the text of new voice notes for the copilot" por:
> analyses the text of new voice notes for the copilot, only for people who turned on note analysis

## 4 · `src/app/relevo/demo/page.tsx` y `src/lib/relevo/demo.ts` — APROBADO CON ARREGLO MENOR

- `demo.ts`: solo añade `luisConsents` (si Luis entró y qué consentimientos apagó) a la vista de demo. No llega a las apps
  de paciente ni mentor; no hay datos de salud. OK.
- "Connection lost · retrying…" y "Can't reach Relevo right now · retrying…": solo los ve el presentador, en el color de
  aviso (no rojo), sin dramatismo. OK.
- Tecla E y capa de explicación cerrada al empezar: OK. La frase "Luis and Pablo never see any of this." se mantiene. La tecla
  se ignora dentro de campos de texto y diálogos (no se activa escribiendo una nota).
- El cambio `pl2` → teléfono de Pablo (pausa) es correcto para la historia de proteger al mentor.
- Franja de consentimientos (vista en navegador): "Luis turned off notes analysis — the story needs all three." Puede leerse
  como que los consentimientos son obligatorios, lo que contradice la línea roja 8 (ninguno obligatorio para usar la app).
  Texto exacto pedido en `page.tsx` (el `<span>` de la franja):
  ```tsx
  <span>Luis turned off {off.map((k) => CONSENT_LABEL[k]).join(" and ")}. That&apos;s his choice; the scripted story assumes all three are on.</span>
  ```
  Opcional (recomendado por honestidad ante el jurado si alguien lo pregunta): cuando `off` incluye `"notes"`, añadir
  después ` Without notes analysis, his notes aren't checked for crisis phrases.` Es verdad hoy (K-15).

## Hallazgo lateral · `src/app/relevo/kit.tsx` (`useView`) — recomendación, no bloquea

`useView` es lo que hace que la hoja de ayuda se abra en el móvil de Luis cuando llega `openHelp`. El cambio solo aplica una
respuesta si es la última petición lanzada (`my === last`). Si la red va lenta y cada respuesta tarda más que el intervalo de
sondeo (4-5 s), todas quedan "viejas" al llegar y la pantalla no se actualiza nunca: la ayuda no se abriría hasta que la red
mejore. Con el servidor local no pasa (respuestas rápidas). Arreglo propuesto: aceptar cualquier respuesta más nueva que la
última aplicada.
```ts
let last = 0;     // número de la última petición lanzada
let applied = 0;  // número de la última respuesta aplicada
// …dentro de load(), en lugar de `my === last`:
if (alive && my > applied) {
  applied = my;
  setError("");
  if (txt !== lastText) { lastText = txt; setData(j); }
}
// y en el catch: if (alive && my > applied) setError(...)
```

## Lo que NO he cambiado
Nada. Solo he escrito este informe. Sin commits. No he leído `.env.local`.
