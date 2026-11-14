# Verificación independiente · Relevo (`/relevo/demo`)

Fecha: 14-11-2026 · Build de producción (`npm run build` + `npx next start -p 3200`), Chrome con Playwright en contextos propios, 1440x900, 1920x1080 y 390x844 (móvil). Servidor 3200 parado al terminar; el 3000 no se ha tocado. Repo sin cambios (`git status` limpio).

Leyenda: **[C]** = comprobado con mis propios ojos o con un script · **[S]** = lo supongo, no lo he comprobado del todo.

## Nota: 7,5 / 10 — "¿se puede presentar mañana sin miedo?"

El recorrido con "Next moment" es sólido: 27 momentos, sin un solo error de consola ni respuesta HTTP fallida, no se rompe al pulsar rápido, al retroceder ni al recargar, y los números coinciden con el README. Lo que baja la nota: (1) si se cierra la capa "Show how Relevo decides", dos de los momentos clave (emparejamiento y cierre) **no enseñan sus números en pantalla**; (2) un toque distinto del guion en un móvil desincroniza en silencio los títulos del guion; (3) hay un fallo visual en la pantalla de conversación.

---

## Fallos, del más grave al menos grave

### 1. Con la capa cerrada, el paso 1 y el paso 8 no muestran sus números [C]
- Paso 1 "Matching: Pablo or Sara for Luis?": la columna de la clínica se queda en "Panel" (la tabla de pacientes) y no muestra el emparejamiento. **0,87 frente a 0,758 solo aparece si se abre la capa (tecla E)**. Pablo solo ve "Affinity 87 %" si el presentador pulsa a mano "I'm interested".
- Paso final "What the simulation shows": con la capa cerrada se ven los tres teléfonos de siempre (Pablo con la hoja de pausa). **88 %, 5 días y 2,45 solo están dentro de la capa.**
- Riesgo: si el presentador olvida pulsar E, el cierre de la demo no tiene números.

### 2. Si el presentador se sale del guion, los títulos del guion siguen contando la historia original [C]
Pasos exactos (mundo nuevo):
1. More → Jump to moment → "Day 47 08:30 · Pablo is asked first".
2. En el móvil de Pablo, pulsar **"Can't today"** (en vez de "Yes").
3. Pulsar → dos veces.
- Resultado: la cabecera dice "Pablo says yes → Luis reads V2" y luego "Pablo sends the walk as a voice note", pero Pablo no ve ninguna idea, Luis no recibe nada y no se envía ninguna nota. Al saltar a "“Good” → walk 0.62 → 0.70", la cabecera promete 0,70 y la tabla de la capa dice **0,62** (el guion se salta los pasos que el presentador ya respondió ese mismo día).
- Se arregla con More → "Reset everything people did" (comprobado: vuelve a 0,70). Ese botón no pide confirmación.
- Riesgo: un toque equivocado en directo y los textos dejan de coincidir con lo que se ve.
- Lo que sí va bien: si se pulsa "Yes" a mano y luego →, no se duplica nada, y la idea sale escrita por la IA ("Suggested with AI").

### 3. Composición rota en la pantalla de conversación [C]
- Ruta: `/relevo/app?w=<id>&as=luis` a 390x844 → tocar la nota de Pablo ("Open conversation with Pablo"). Lo mismo en la pestaña "Conversation" de Pablo, y también dentro de la demo a 1440 (tocar la tarjeta "Pablo left you a note").
- Fallo: el texto "Hold to talk to Pablo. No need to reply." sale en una columna estrechísima, con una palabra por línea, y hay una mancha blanca difuminada detrás del micrófono. Se nota mucho si se abre una conversación delante del jurado.

### 4. El README promete cosas que la demo no enseña [C]
- Paso 7: "Pablo is offered a lighter pace and then a pause". En la demo **solo aparece la pausa**. El código (`sim.ts`, `mentorRules`) solo ofrece el ritmo más ligero tras **5 días seguidos en nivel 1**, y Pablo pasa del nivel 1 (día 56) al nivel 2 (día 60) en 4 días. La traza solo registra "Pace proposal for Pablo: Pause".
- Paso 5: "a direct call idea is ready on 31 October". La traza dice "Prepared **for tomorrow**: Call or meet up" (es decir, para el 1 de noviembre). Es ambiguo.
- "The demo in 8 steps", pero el botón recorre **27 momentos**. Además, la numeración de la capa no coincide con la del README (en la capa, 2 = "Learning Luis's usual", 3 = "Detecting", 4 = "Thompson sampling") y salta **7 → 6 → 7**: "Protecting the mentor" (días 56-57) va antes de "6 · Severe protocol" (día 57) y vuelve a salir en el día 60.

### 5. Con la capa abierta a 1440x900, la letra de los teléfonos queda diminuta y el panel se corta [C]
- Los teléfonos encogen hasta una letra de unos 6-8 px y la clínica se ve aún más pequeña. En un proyector no se leerá.
- El panel de abajo se corta: "Level 2 is much stricter… Cheap false alarms (a walk) go to the…" exige desplazarse dentro del panel, y la etiqueta "area threshold 1.5" del gráfico se monta sobre una línea.
- A 1920x1080 sí cabe bien.
- Aun con la capa cerrada, la tabla de la clínica usa letra de unos 7 px a 1440 [C]; a 1920 se lee mejor.

### 6. Detalles que un juez atento podría preguntar [C, salvo donde se indica]
- La columna "Last human contact" de las personas simuladas siempre marca unas 2 días y 5 h antes del reloj de la demo, y cambia con cada paso (p. ej. "Sat 03:10" a las 08:10 del lunes y "Sat 04:20" a las 09:20). [C lo que se ve; S que sea un valor inventado relativo al reloj]
- Paso 16 "Clinic schedules a call → V4": la fila de Luis en la clínica sigue con el botón "Call today", sin indicar que ya hay una llamada programada para las 12:00.
- Paso 13 ("Good", domingo 11:30): Pablo sigue viendo "Walk with Luis · Today, 10:00 · Add to calendar", aunque el paseo ya pasó.
- Paso 18 (en la capa): el V3 entregado el 1/11 sigue mostrando el motivo antiguo "Postponed: Luis already got a notice today (V4 has priority)".
- Paso 25: la clínica dice "No active mentor" para Luis antes de que Pablo acepte la pausa.
- El enlace "Same demo on a real phone" muestra `http://localhost:3200/...`: en local no sirve para un móvil de verdad [S: en Vercel saldrá la URL buena].
- Pulsar la barra espaciadora con el foco en "Next moment" no avanza (Enter sí avanza).
- `package.json` se llama `nextapp-tmp`. El lint da 0 errores y 11 avisos.

---

## Qué funciona [C]
- Arranque siguiendo el README: `npm run build` compila sin errores; `next start` está listo en menos de 1 s; `tsc --noEmit` no da errores. No probé un `npm install` desde cero (node_modules ya existía).
- Recorrido completo de los 27 momentos a 1440 y 1920, con la capa abierta y cerrada. Los tres paneles cambian con coherencia: Pablo pregunta primero y, solo tras su "Yes", Luis lee "Pablo would like to talk to you". La columna del medio cambia sola a Marta en "Marta is asked first" y vuelve a Pablo. En la crisis se abre la hoja de ayuda (112, MIELI, clínica), aparece la alerta grave y Pablo recibe "You don't need to do anything else". La alerta pasa al responsable de guardia a los 15 min. En el día 60 aparecen la pausa y "Review pace".
- Números comprobados en la capa: 0,87 y 0,758; 0,62 → 0,70; 88 %; 5 días (IQR 2–7,25); 2,45; 200 personas y 100 recaídas; nivel 2: 48 %, 1 día y 0,5.
- Comprobaciones del README: `node scripts/relevo-check.mjs` → **33 OK**. `node scripts/relevo-demo-walk.mjs http://localhost:3200` → **19 OK**.
- Robustez: 12 pulsaciones de → seguidas (60 ms entre una y otra) llegan exactamente al momento 12 posiciones más adelante; 6 de ← seguidas, igual. Al recargar se mantiene el momento (queda guardado en el servidor). "Jump to moment" y el deslizador funcionan, también con el teclado. → no avanza con la hoja de ayuda abierta y Escape la cierra. En toda la sesión: **0 errores de consola, 0 respuestas HTTP ≥ 400**.
- Sin `?w=`, cada navegador recibe su propio mundo (se guarda en localStorage), así que dos personas no se pisan.
- `/relevo` (entrada), `/relevo/app?as=luis|pablo|marta` y `/relevo/clinic` (pestañas Panel, Alerts, Matching, Settings y Consents, y la ficha de cada persona) cargan bien. A 390x844 no hay desplazamiento horizontal; las pestañas Today, Conversation, My relay y Settings funcionan; la sugerencia del copiloto se ve en la conversación de Pablo; el cambio de rol desde arriba cambia `as=`. Con un `as=` inventado se cae a Luis sin romperse.
- La IA está configurada en este entorno: las ideas creadas a mano salen como "Suggested with AI". Las del guion usan la plantilla.

## No comprobado [S]
- La versión publicada en Vercel (las reglas impedían llamar a servicios externos).
- La grabación de voz real y el dictado (necesitan micrófono).
- El audio leído por la voz del navegador en las notas del guion.
- La instalación desde cero en menos de 5 minutos.
