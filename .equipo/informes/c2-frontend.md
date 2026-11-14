# C2 · Frontend · informe

Rama `sesion-autonoma`, sin commits. Archivos tocados (solo los míos): `src/app/relevo/MentorApp.tsx`, `src/app/relevo/ClinicWeb.tsx`,
`src/app/relevo/demo/page.tsx`, `src/app/relevo/page.tsx` (56 líneas añadidas, 17 quitadas). No he tocado MenteeApp, kit, css, lib/ ni el camino de crisis.

## Puerta (con los cambios de los tres carriles en el árbol)
- `npx tsc --noEmit -p .` → sin errores · `npx eslint src/app/relevo` → sin avisos. VERIFICADO
- `node scripts/relevo-check.mjs` → 33/33 · `node scripts/relevo-demo-walk.mjs http://localhost:3000` → 19/19. VERIFICADO
- El recorrido solo mira JSON de la API (y que "Only you see this" NO esté en el JSON de Luis): ninguno de mis textos lo afecta.
- Navegador: Playwright, contexto `frontend-c2`, mundos `kqfe7x3m9a` y `kqfe7x3m9b`.

## 1 · P7 (U-04 + U-05 + U-14 + J-12) · reinicio al cambiar de momento
- `MentorApp.tsx:41` prop opcional `resetKey?: number`; `:49-58` patrón de React "ajustar el estado cuando cambia una prop" (sin useEffect):
  si cambia `resetKey` → `tab "today"`, `thread "mentee"`, `compose null` (cierra "Voice note to…"), `help false`. `m5Open` no se toca.
- `ClinicWeb.tsx:4` quita `useEffect`; `:52` props `onFocusPerson?: { id, n }` y `resetKey?: number`; `:56-66` sustituye el efecto con
  `eslint-disable`: si cambia `resetKey` → Panel y sin ficha; si cambia `n` → abre la ficha (funciona también la 2.ª vez).
- `demo/page.tsx:40-41` el foco pasa a `{ id, n }`; `:224` `<MentorApp … resetKey={data.index} />`; `:229` `<ClinicWeb … resetKey={data.index} />`;
  `:250` `onFocus={(id) => setFocus((f) => ({ id, n: (f?.n ?? 0) + 1 }))}`. `/relevo/app` y `/relevo/clinic` no pasan estas props → sin cambios.
- Comprobado (VERIFICADO): 40 21:15 → Conversation de Pablo → "Next moment" → Pablo vuelve a "Good morning, Pablo" (Today).
  47 08:41 → "Send as voice note" → hoja "Voice note to Luis" abierta → "Next moment" → reloj 47 09:05 (note), hoja cerrada, Today,
  `sent` = Luis y **una sola** nota de Pablo ese día. 54 09:10 → "Open Luis's file in the clinic" → ficha; botón "Panel"; otra vez
  "Open Luis's file" → ficha (2.ª vez OK); "Next moment" (54 10:10) → la clínica vuelve a "Who do we call today?"; 3.ª vez → ficha.
  "Open Pablo's file" usa el mismo mecanismo: INFERIDO.

## 2 · P8 (J-03 / U-03) · copiloto visible en Today
- `MentorApp.tsx:196` `nothing` ya no sale si hay `data.copilot`; `:315-322` tarjeta nueva (solo si `data.copilot && !data.m6 && mentee`,
  así la pantalla M6 de crisis no cambia). No enseña análisis ni el texto de la sugerencia. Textos nuevos:
  - "Only you see this" (con candado)
  - "A private idea for your next note to Luis" (`{mentee.name}`)
  - botón "Open" → pestaña Conversation, hilo de Luis.
- Comprobado (VERIFICADO): 40 21:15 → Today de Pablo muestra la tarjeta y no "Nothing pending today."; "Open" → Conversation con "Use idea".

## 3 · K-19 · texto de M5 (protección del mentor)
- `MentorApp.tsx:436`: "Marta will write to you these days" → **"You can write to Marta whenever you like."** (texto exacto de C-07 / K-19;
  `{m5.mentorName}`). No dice nada de los datos de Pablo. VERIFICADO día 60 09:05 (M5 pausa): sale el texto nuevo; el viejo, 0 veces.

## 4 · K-44 · "Help" del mentor a 44 px
- `MentorApp.tsx:77` quita `rv-btn-sm`. VERIFICADO: los dos botones "Help" de la demo miden 44 px de alto (el de Luis lo cambió Diseño).

## 5 · K-31 · cierre "8 · What the simulation shows"
- `demo/page.tsx:514`: **"200 synthetic people we generated, 100 simulated relapses, default thresholds. This checks that the logic works as designed, not that it predicts relapse in real patients."** (`{e.people}`, `{e.relapses}`)
- `demo/page.tsx:518`: **"Level 2 is much stricter: it catches 48% with a median of 1 day's notice, and gives 0.5 false alarms per person per year. Cheap false alarms (a walk) go to the mentor; costly ones reach the clinic far less often. Real-world accuracy would need a clinical study."**
  (48 %, 1 y 0.5 salen de `e.l2`; "almost never" eliminado.)
- VERIFICADO día 62 12:00: las tres tarjetas siguen diciendo **88%**, **5 days** (IQR 2–7.25) y **2.45**.

## 6 · K-52 · portada /relevo
- `page.tsx:27`: **"Sensor data in this demo is simulated, and the browser's dictation stands in for on-device transcription. Voice notes, the copilot, the crisis filter, the risk engine, notices and learning are working code, not clinically validated. Relevo doesn't diagnose, treat or replace emergency services."**
  Es el texto de C-22 quitando "transcription" de la lista de lo que funciona y diciéndolo como en el README ("Browser dictation … stands in for on-device transcription"). Comprobado con tsc/eslint; visualmente INFERIDO (página estática).

## 7 · J-08 (opcional, hecho) · tarjeta "Beyond the clinic"
- `demo/page.tsx:188-199`: con `data.index < 0` (antes del primer momento), bajo el deslizador, una franja con:
  - "Beyond the clinic"
  - "After the last TMS session, each person goes home on their own."
  - "Relevo pairs every patient with someone who finished TMS a few months earlier."
  - "The phone nudges a person, never an alarm, and only the clinic sees data."
  - "Press → to start"
  Sin cifras clínicas. VERIFICADO: sale en día 0 08:00 y desaparece al pulsar → (primer momento). Quita ~100 px de alto a las columnas solo en ese momento.

## Avisos
- Navegador compartido: en una de mis pruebas la pestaña "actual" ya era una que había creado Diseño (contexto `c2diseno`) y mi
  código la llevó a `/relevo/demo?w=kqfe7x3m9b` (mundo mío). Diseño puede tener que volver a abrir su URL. A partir de ahí busqué mi
  página por URL dentro del navegador en vez de usar la pestaña actual. He cerrado mi pestaña `frontend-c2`.
- Una prueba temprana mostró el reloj de mi mundo en 45 09:00 sin que yo lo moviera: probablemente otra sesión pulsó en mi pestaña
  mientras era la "actual". Repetí la prueba en limpio y pasó.
- Ningún texto que mire `scripts/relevo-demo-walk.mjs` ha cambiado.
