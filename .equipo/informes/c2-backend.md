# C2 · Backend y datos · informe del ciclo 2

Rama `sesion-autonoma`, sin commits. Archivos tocados: `src/lib/relevo/demo.ts`, `views.ts`, `texts.ts` y en `sim.ts`
solo `offerV3`. No se ha tocado `engine.ts`, `SCRIPT`, `BANDIT_SALT`, `ai.ts`, Relay, `.env.local` ni el camino de crisis.

## 1. P9 · J-05/U-09/D-06 · claves en castellano en "What just happened"
- `demo.ts:39-42`: `LABELS = { ...ACTION_LABEL, ...DOMAIN_LABEL }`, una expresión regular con esas claves entre `\b` y
  `english(text)` que las cambia por su etiqueta en inglés. `demo.ts:125`: la traza se sirve con `text: english(e.text)`.
- La simulación y las claves internas no cambian (solo cambia el texto que sale por `/api/relevo/demo`).
- Ejemplos reales: "Idea for Pablo about Luis: Walk together (context mobility)", "Voice note to Luis (idea Walk together)",
  "No idea today for Pablo (respected). Prepared for tomorrow: Call or meet up", "Luis enters level 2 (most changed: mobility)".
- VERIFICADO: `trace[].text` en 47 08:41, 47 09:05, 47 11:20, 48 11:30, 54 09:10, 55 08:30 y 60 08:30, sin ninguna palabra
  con `_` ni `movilidad|sueno|fisiologia|ritmo|movil_vinculo`.

## 2. P10 · U-10/J-09 · "Tomorrow, Sunday" el propio domingo
- `views.ts:26-35`: función nueva `planWhen(now, plan)`. Si la etiqueta guardada era relativa ("Today…"/"Tomorrow…") y ya
  no es cierta, la recalcula: "Today, 10:00" · "Tomorrow, Sunday, 10:00" · "Yesterday, 10:00" · "Sunday, 10:00" (menos de
  7 días) · "Sun 25 Oct, 10:00" (más lejos). Las etiquetas fijas ("Saturday, 11:00", "This week, 23:00") no se tocan.
- `views.ts:98` (plan de Luis, `menteeView`) y `views.ts:170` (plan de Pablo, `mentorView`) usan `planWhen`.
- `CATALOG` no cambia: el título sigue siendo "20-minute walk".
- VERIFICADO: 47 11:20 → Luis y Pablo "Tomorrow, Sunday, 10:00" (igual que antes); 48 09:00 y 10:30 → "Today, 10:00";
  48 11:30 → Pablo "20-minute walk · Today, 10:00" y en la lista de Luis "20-minute walk @ Today, 10:00" (fb=good).
  Nota: a las 48 11:30 `me.plan` de Luis es `null` porque el guion ya respondió "Good" (U-07, no es de este carril).

## 3. K-12/C-11 · M0 sin la huella de la recaída
- `views.ts:135-137`: en `mentorView`, el primer motivo de `m0` se sustituye por el texto exacto de f1-clinica C-11:
  **"Your clinic thinks you have a lot in common"**. El resto de motivos y el porcentaje no cambian. `matchFor` no cambia,
  así que la clínica (C4) y la capa de explicación siguen mostrando la frase de huella.
- VERIFICADO (día 0 08:10): `m0.percent` = 87, `m0.reasons` = ["Your clinic thinks you have a lot in common",
  "You both like voice notes", "Compatible schedules"]; clínica y `/demo match.pabloLuis` siguen con
  "You both started out sleeping more and going out less".

## 4. K-11/C-08 · V3 tras "Can't today"
- `texts.ts:90-91`: nuevo `NOTICE_TEXT.V3_CANT` = **"Fancy sending Pablo a note? A few words are enough."** (texto exacto
  de f1-clinica C-08). `V3` normal se queda igual para los demás casos (mentor que no contesta, ideas en pausa…).
- `sim.ts:335-337` (solo dentro de `offerV3`): si ese día el mentor contestó "Can't today" a esa persona (`twoStep.status ===
  "cant"` en una tarjeta del mismo día), usa `V3_CANT`. Mismo código "V3", mismo id, misma prioridad y mismo momento de envío.
- VERIFICADO: 55 09:00 → Luis tiene V3 "Fancy sending Pablo a note? A few words are enough."; relevo-check "El 1/11 Luis
  recibe V3" y el recorrido "5 · El 1/11 Luis recibe V3" siguen OK.
- PENDIENTE de otro carril: `ClinicWeb.tsx:437` (lista C5 de textos) sigue mostrando solo el V3 normal; sigue siendo cierto,
  pero Frontend puede añadir la variante si quiere. No lo he tocado (no es mi archivo).

## 5. K-20/C-12 · texto del copiloto
- `texts.ts:107-109`: **"Your last few notes with Luis keep going over the same ground. Try acknowledging how Luis feels and
  suggesting something small together."** (texto exacto de f1-clinica C-12; el `example` se queda).
- VERIFICADO: día 40 21:15, `/mentor?as=pablo` → `copilot.text` es ese texto.

## Comprobación (todo VERIFICADO)
- `npx tsc --noEmit -p .` sin errores · `npx eslint src/lib/relevo` sin avisos.
- `node scripts/relevo-check.mjs` 33/33 · `node scripts/relevo-demo-walk.mjs http://localhost:3000` 19/19 (con los
  cambios de los otros carriles cargados en caliente).
- Pruebas propias por API con mundos desechables `kqb…` (script temporal fuera del repo).
- `git diff inicio-sesion -- src/lib/relevo/sim.ts`: solo el try/catch del ciclo 1 (K-03) y el cambio en `offerV3`.
