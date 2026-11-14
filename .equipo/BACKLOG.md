# BACKLOG · Relevo (priorizado por el Juez de Producto)

Fecha: sáb 14 nov 2026, ~11:35 · Fuentes: `informes/f1-calidad.md` (K-01..K-56), `f1-juez.md` (J-), `f1-ux.md` (U-), `f1-diseno.md` (D-),
`f1-arquitecto.md` (A-, todos absorbidos en K- salvo los descartados) y `DECISIONES.md` (manda sobre todo lo demás).

**Supuesto:** sin criterios oficiales. Ejes con el mismo peso: **1** impacto y encaje · **2** innovación · **3** ejecución técnica · **4** presentación y experiencia.
Nota de partida: 8 / 8 / 7 / 6 (media 7,3). Lo que más sube es el eje 4 y la parte "repo presentable" del eje 3.

**Orden:** (1) lo que puede hacer fallar la demo en directo, incluidas trampas del presentador e ilegibilidad en proyector → (2) nota por unidad de esfuerzo → (3) pulido.
**Reglas fijas para todo implementador:** no tocar `engine.ts`, `SCRIPT`, `BANDIT_SALT`, Relay, claves, modelo ni configuración de Gemini; la interfaz sigue en inglés;
números del contrato intactos (0,87 · 0,758 · 0,62→0,70 · 88 % · 5 días · 2,45 · paseo 24/10 · llamada 31/10). Puerta de cada tarea: `relevo-check` 33/33 +
`relevo-demo-walk` 19/19 + `npm run build`. `relevo-demo-walk.mjs` busca textos literales ("20-minute walk", "Pablo would like to talk to you", "Only you see this"…):
si se cambia un texto que el script mira, se actualiza el script en la misma tarea. Todo lo marcado "visual" en la columna de crisis necesita visto bueno de Seguridad clínica.

Esfuerzo: S ≤ 10 min · M 15-25 min · L > 1 ciclo. Toca crisis: no / visual (aspecto, foco, accesibilidad, navegación de la demo) / lógica.

## Tabla

| Prio | ID | Título | Origen | Eje | Gravedad | Esf. | Riesgo | Archivos | Toca crisis | Estado |
|---|---|---|---|---|---|---|---|---|---|---|
| **— Nivel 1 · puede hacer fallar la demo en directo —** |||||||||||
| 1 | K-18 | Proyector: capa de explicación cerrada al empezar, tecla `E` para abrir/cerrar, capa a `lg:h-[30vh] lg:min-h-[220px]`, clínica con `Fit width={1100}` | K-18, U-01(1), D-01(2,3), J-02(a), X-16 | 4 (2) | alta | S | bajo | app/relevo/demo/page.tsx | no | pendiente |
| 2 | U-04 | Al cambiar de momento, Pablo/Marta vuelven a Today (y se cierra la hoja "Voice note"), la clínica vuelve al Panel; "Open Luis's file" funciona la 2.ª vez (foco `{id,n}`) | U-04, U-05, U-14, J-12 | 4 | alta | S | bajo | app/relevo/demo/page.tsx, MentorApp.tsx, ClinicWeb.tsx | no (MenteeApp no se toca) | pendiente |
| 3 | J-03 | Copiloto visible en Today de Pablo: tarjeta con candado "A private idea for your next note to Luis" + "Open" → Conversation (en vez de "Nothing pending today") | J-03, U-03 | 2, 4 | alta | S | bajo | app/relevo/MentorApp.tsx | no | pendiente |
| 4 | K-01 | Con Gemini (producción), /mentor y /note recargan el mundo justo antes de guardar; /mentor apunta el intento (Map `inflight`, 60 s) para no reintentar en cada sondeo ni congelar a Pablo | K-01, K-02 (solo parte /mentor), A-01, A-02, A-03, R-01, J-06, Q-07 | 3, 4 | alta | S | bajo | api/relevo/mentor/route.ts, api/relevo/note/route.ts | no (note/route.ts sin cambio de lógica, DECISIONES 7 y 10; visto bueno de Seguridad clínica) | pendiente |
| 5 | K-06 | Aviso al presentador si Luis apaga consentimientos en A0 ("For the demo, turn on all three" en la capa + franja "Luis turned off …· Reset") | K-06, Q-03 (sustituye a K-13, DECISIONES 8) | 4 | alta | S | bajo | lib/relevo/demo.ts, app/relevo/demo/page.tsx | no | pendiente |
| 6 | K-03 | Un evento mal formado no envenena el mundo: try/catch en la re-ejecución de eventos + `p` validado como objeto (protege también los ciclos de construcción) | K-03, Q-01 | 3 | alta | S | bajo | lib/relevo/sim.ts:762-764 (fuera de SCRIPT/BANDIT_SALT), api/relevo/act/route.ts | no | pendiente |
| 7 | U-06 | Clic equivocado ("Can't today" en el paso 3) se deshace con "Previous": al mover el reloj atrás se borran los eventos con `t >= reloj`; reset renombrado a "Undo everything I clicked (keep the time)" | U-06, A-09 | 4 | alta | S | medio | api/relevo/act/route.ts (+ store.ts si hace falta) | no | pendiente |
| 8 | K-23 | El sondeo aplica solo la respuesta más reciente (no "vuelve atrás"; la hoja de ayuda no parpadea) | K-23, A-04, R-03 | 3, 4 | media | S | bajo | app/relevo/kit.tsx (useView) | no (evita parpadeo sin tocar su lógica) | pendiente |
| 9 | U-12 | Flechas: tras usar el deslizador, `blur()` en `onPointerUp`; el atajo global ignora el foco dentro de diálogos/radiogroups | U-12, K-38 (parte flechas), X-24 | 4 | media | S | bajo | app/relevo/demo/page.tsx | no | pendiente |
| 10 | K-42 | "Next moment" pulsado rápido no repite el mismo momento (`useRef` con el último destino) | K-42, R-06, A-07 | 4 | baja→media en directo | S | bajo | app/relevo/demo/page.tsx | no | pendiente |
| 11 | U-15 | En "Pablo level 2: a pause…" la columna enseña a Pablo (M5), no a Marta: solo `pl1` cambia a Marta | U-15 | 4, 1 | media | S | bajo | app/relevo/demo/page.tsx:57 | no | pendiente |
| 12 | K-40 | Reset conserva `seq`: no vuelve a sonar el audio del ensayo | K-40, A-06 | 3, 4 | media | S | bajo | api/relevo/act/route.ts:21-25 | no | pendiente |
| 13 | K-24 | Franja "Connection lost · retrying" en la demo (error de useView y de "Next moment") | K-24, U-16, D-11, D-02 (parte demo), A-05 | 3, 4 | media | S | bajo | app/relevo/demo/page.tsx | no | pendiente |
| 14 | U-13 | Menú "More" se cierra al elegir opción; el reset pide confirmación | U-13 | 4 | baja | S | bajo | app/relevo/demo/page.tsx:95-104 | no | pendiente |
| 15 | K-41 | La prueba de extremo a extremo comprueba que las acciones de las personas funcionan (`ok===true`, `scripted:false`) | K-41, Q-06 | 3 | media | S | bajo | scripts/relevo-demo-walk.mjs | no | pendiente (es la puerta: hacerla pronto) |
| 16 | K-49 | Guion de ensayo sin código: mundo nuevo antes del pitch, enlace al jurado SIN `?w=`, no proyectar "More", micrófono concedido, solo hacia delante, no pulsar "Resolve" ni "Talk to my clinic" el día 57, no reproducir la nota de crisis con voz, presentar con la versión desplegada o `npm run build && npm start` (nunca `dev`), plan B local sin KV | K-49, K-25 (proceso), K-05/K-04 (mitigación DECISIONES 6), R-07, A-16, A-17, A-10, D (insignia "N") | 4 | media | S | nulo | (nota en `.equipo/`; lo redacta el Director) | no (es guion) | pendiente |
| **— Nivel 2 · más nota por unidad de esfuerzo —** |||||||||||
| 17 | K-53 | `.playwright-mcp/` en `.gitignore` (antes de cualquier commit con capturas) | K-53, S-10, J-15 | 3 | baja | S | nulo | .gitignore | no | pendiente |
| 18 | K-51 | README de verdad (inglés): qué es, problema tras la TMS, enlace grande a /relevo/demo, 8 pasos con números, qué es real y qué `MOCK` (sin login, sensores, lista de nombres, dictado del navegador, cifrado, clínica y teléfono ficticios, lista de crisis ilustrativa, Gemini/DPA con el texto corregido de C-16), cómo ejecutar, MIT, "/ is our earlier prototype (Relay)"; `// MOCK:` sin autenticación en server.ts | K-51, J-01, J-14, K-25 (MOCK), K-30 (solo frase C-05), K-22 (parte README), S-09, C-16, C-23, C-25 | 3, 4, 1 | alta (obligatorio en entrega) | S | nulo | README.md, lib/relevo/server.ts (solo comentario) | no | pendiente |
| 19 | J-08 | Tarjeta "Beyond the clinic" antes del primer momento (por qué Relevo, 3 líneas, "Press → to start") | J-08 | 1, 4 | media | S | bajo | app/relevo/demo/page.tsx | no | pendiente |
| 20 | K-12 | M0 no enseña a Pablo cómo empezó la recaída de Luis: primera razón "Your clinic thinks you have a lot in common" (87 % igual) | K-12, C-11 | 1, 3 | alta | S | bajo | lib/relevo/views.ts (solo mentorView) | no | pendiente |
| 21 | K-07 | Audio solo con MIME `audio/*` válido + `nosniff` y `CSP: sandbox` en /audio (XSS que un juez técnico ve en minutos) | K-07, S-01, S-07 (parte) | 3 | alta | S | bajo | api/relevo/note/route.ts:38, api/relevo/audio/route.ts | no | pendiente |
| 22 | J-05 | "What just happened" sin claves en castellano (`paseo_juntos`, `movilidad`…) → etiquetas en inglés al servir | J-05, U-09, D-06 | 4, 3 | media | S | bajo | lib/relevo/demo.ts:120 | no | pendiente |
| 23 | J-09 | Fecha del plan calculada al servirla ("Today, 10:00" / "Sun 25 Oct, 10:00"), no "Tomorrow, Sunday" ya pasado; saludo `h < 5 → "Hi"` | J-09, U-10, U-17 | 4 | media | S | bajo | lib/relevo/views.ts (menteeView/mentorView) | no | pendiente |
| 24 | U-20 | Cierre: "Restart demo" en lugar del botón apagado; cifras a 44 px sobre `bg-rv-sage` | U-20, D-10 | 4 | media | S | bajo | app/relevo/demo/page.tsx:94, 394-403 | no | pendiente |
| 25 | K-31 | Cifras del cierre honestas: "checks the logic works as designed, not that it predicts relapse"; nivel 2 = 48 % / 1 día; `// MOCK:` con la fuente (evaluación Python, 200 sintéticos). 88 % · 5 · 2,45 sin cambios | K-31, J-07, C-21 | 3, 1 | media | S | bajo | app/relevo/demo/page.tsx:397-401, lib/relevo/demo.ts:121 | no | pendiente |
| 26 | U-08 | Numeración de la capa = guion de 8 pasos ("Before · Learning Luis's usual", "2 · Copilot", "6 · After the crisis…") | U-08, D-14 | 4 | media | S | bajo | app/relevo/demo/page.tsx | no | pendiente |
| 27 | K-11 | V3 no miente tras "Can't today": "Fancy sending Pablo a note? A few words are enough." (también la copia de C5) | K-11, C-08 | 1, 4 | alta | S | bajo | lib/relevo/texts.ts:89, app/relevo/ClinicWeb.tsx:437 | no | pendiente |
| 28 | K-20 | Textos de respaldo: copiloto sin "you're both sleeping" (C-12) y nota del paseo "Twenty minutes, no rush" (coincide con "20-minute walk") | K-20, J-10, C-12, J-11 | 1, 4 | media | S | bajo | lib/relevo/texts.ts:23, 105-107 | no | pendiente |
| 29 | K-19 | M5: "You can write to Marta whenever you like." (no promete en nombre de Marta) | K-19, C-07 | 1 | media | S | bajo | app/relevo/MentorApp.tsx:417 | no (DECISIONES 9: sí) | pendiente |
| 30 | K-32 | Capa del momento de crisis: aviso de contenido + MIELI/112 y "Next step for the clinic: call Luis now. Only the clinic can close a crisis alert." | K-32, C-19, C-20 | 1, 4 | media | S | bajo | app/relevo/demo/page.tsx:336-341 | no (texto de la capa del presentador, no de la app) | pendiente |
| 31 | D-04 | `truncate` funciona (`.rv .truncate{white-space:nowrap}`) y subtítulo "Luis's mentor · 4 months on": los dos teléfonos salen del mismo tamaño | D-04 | 4 | media | S | bajo | app/relevo/relevo.css, app/relevo/demo/page.tsx:117 | no | pendiente |
| 32 | K-52 | Portada: "working code, not clinically validated. Relevo doesn't diagnose, treat or replace emergency services." | K-52, C-22 | 1, 3 | baja | S | bajo | app/relevo/page.tsx:27 | no | pendiente |
| 33 | U-02 | "Look here": campo `look` en cada momento + anillo teal y etiqueta en esa columna; pista "← → keys" | U-02, J-02(b) | 4 | alta | M | bajo | lib/relevo/demo.ts, app/relevo/demo/page.tsx | no | pendiente |
| 34 | J-04 | Visita corta de 8 paradas (`key:true`, interruptor en "More") + momentos 1 min antes de la acción del guion ("How did it go?", "Pablo is asked again", grabar la 3.ª nota) + confirmación "OK. No idea today." tras "Can't today" | J-04, U-07, U-22 | 4, 2 | media | M | bajo | lib/relevo/demo.ts, app/relevo/demo/page.tsx, MentorApp.tsx (confirmación) | no | pendiente |
| 35 | K-08 | Hoja de ayuda: `aria-modal`, foco dentro (solo si estaba en body), Escape en la caja, Tab en bucle, botón "Close" visible. Orden y botones de la ayuda sin cambios | K-08, X-01, X-03, X-23 | 3, 1 | alta | M | bajo | app/relevo/kit.tsx:250-264 (Sheet) | visual/a11y (DECISIONES 9: sí) | pendiente |
| 36 | K-09 | Confirmación "They'll call you…" fuera del botón deshabilitado (`aria-disabled` + `<p role="status">`), texto sin cambios | K-09, X-02 | 3, 1 | alta | S | bajo | app/relevo/MenteeApp.tsx:357-379 (+ botón del mentor) | visual/a11y (DECISIONES 9: sí) | pendiente |
| 37 | K-21 | Consentimientos que cuentan la IA y el copiloto (textos de C-14); comprobar que caben a 390 px | K-21, C-14 | 1, 3 | media | S | bajo | app/relevo/MenteeApp.tsx:455-459 | no | pendiente |
| 38 | U-21 | En los momentos `crisis` y `forward` la clínica se abre en la pestaña Alerts (solo navegación de la demo) | U-21 | 1, 4 | media | S | bajo | app/relevo/demo/page.tsx, ClinicWeb.tsx (prop) | visual (navegación) | pendiente (mismo mecanismo que U-04: mismo dueño) |
| 39 | K-44 | Botón "Help" a 44 px (quitar `rv-btn-sm`) | K-44, D-08, X-22 | 3, 1 | baja | S | bajo | MenteeApp.tsx:92, MentorApp.tsx:67 | visual | pendiente |
| 40 | K-22 | `hideNames` también en el servidor antes del análisis + copy "Your voice notes are turned into text, and the names… are replaced before the text is analysed" | K-22, S-06, C-15 | 1, 3 | media | S | bajo | api/relevo/note/route.ts:17, MenteeApp.tsx:554 | no (no cambia frases de la lista; ruta de crisis: visto bueno) | pendiente |
| 41 | K-26 | Validación de entradas (json nulo, `Object.hasOwn`, `typeof text`, rangos de config, campo vacío ≠ 0) + límite de 4 KB en /act | K-26, K-27, Q-08, Q-10, S-03, S-04, S-08, A-14, A-15 | 3 | media | S | bajo | api/relevo/act/route.ts, note/route.ts, clinic/route.ts, ClinicWeb.tsx:443-447 | no | pendiente |
| 42 | U-19 | La fila de Luis en el panel muestra "Call · Sun 12:00" cuando hay llamada programada | U-19 | 4, 1 | baja | S | bajo | app/relevo/ClinicWeb.tsx | no | pendiente |
| 43 | J-13 | Solapes por debajo de 1100 px (etiqueta "Prodrome starts", cabecera de la tabla del copiloto, descripción del interruptor) | J-13 | 4 | baja | S | bajo | app/relevo/demo/page.tsx | no | pendiente |
| 44 | D-13 | Capa de explicación en móvil (`grid-cols-1 lg:grid-cols-2`, ocultar clínica con enlace) por si el jurado abre el enlace en el móvil | D-13 | 4 | baja | S | bajo | app/relevo/demo/page.tsx | no | pendiente |
| **— Nivel 3 · pulido —** |||||||||||
| 45 | K-34 | Avisos nuevos (V2, M6, copiloto) y alerta grave anunciados con `aria-live` | K-34, X-08, X-09 | 3 | media | S | bajo | MenteeApp.tsx, MentorApp.tsx, ClinicWeb.tsx | visual/a11y (DECISIONES 9: sí) | pendiente |
| 46 | K-35 | Contrastes AA (foco en burbujas, pestañas del mentor `#66726c` 12 px, niveles, interruptores, campos) | K-35, D-09, X-06, X-10..X-13, X-19 | 3 | media | S | bajo | relevo.css, MentorApp.tsx:147, charts.tsx:6, kit.tsx:237, MenteeApp.tsx:448-454, ClinicWeb.tsx:366 | no | pendiente |
| 47 | K-36 | M0 y M5: `inert` en lo de detrás + `role="dialog"` | K-36, X-04 | 3 | media | S | bajo | app/relevo/MentorApp.tsx | no | pendiente |
| 48 | K-28 | Filtro FORBIDDEN ampliado y misma hora que la plantilla en la salida de Gemini (si no, respaldo) | K-28, C-17 | 3, 1 | media | S | bajo | lib/relevo/texts.ts:102, lib/relevo/ai.ts:37-41 (validación de salida, no configuración) | no | pendiente (verificar con Gemini una sola vez al final) |
| 49 | K-50 | Cabeceras de seguridad (nosniff, Referrer-Policy, frame-ancestors, `poweredByHeader:false`) | K-50, S-07 | 3 | baja | S | bajo | next.config.ts | no | pendiente |
| 50 | D-15 | "Simulated sensor data" una vez menos (quitar la de la barra de la capa) | D-15 | 4 | baja | S | bajo | app/relevo/demo/page.tsx:147 | no | pendiente |
| 51 | D-16 | Contadores de la clínica en color solo si > 0 | D-16 | 4 | baja | S | bajo | app/relevo/ClinicWeb.tsx:112-113 | no | pendiente |
| 52 | D-21 | "For today · Luis" en la pregunta V1; fecha no repetida en la tarjeta de nota | D-21 | 4 | baja | S | bajo | MentorApp.tsx:241, kit.tsx:241 | no | pendiente |
| 53 | U-18 | "Hold to talk to Luis" no se parte palabra a palabra (`min-w-0` / `shrink-0`) | U-18 | 4 | baja | S | bajo | app/relevo/MentorApp.tsx:111-115 | no | pendiente |
| 54 | D-12 | Pantalla de carga común y centrada | D-12 | 4 | baja | S | bajo | kit.tsx, MenteeApp.tsx:57, MentorApp.tsx:49, ClinicWeb.tsx:60 | no | pendiente |
| 55 | D-02 | Estado de error en las 4 vistas (tarjeta "Can't reach Relevo" / pastilla "Offline") | D-02 (resto; la demo ya va en K-24) | 3, 4 | media | M | bajo | kit.tsx + MenteeApp, MentorApp, ClinicWeb | no | pendiente |
| 56 | K-38 | Línea de tiempo: un punto por día, sobre la pista del deslizador, y "Jump to step" (8 pasos) en "More" | K-38 (puntos), U-11, D-05, X-15 | 4 | media | M | bajo | app/relevo/demo/page.tsx:173-214 | no | pendiente |
| 57 | K-37 | Gráficos: marcas redondas, eje `#66726C` 11 px, halo en el umbral, leyenda en el gráfico de Pablo, resumen en `aria-label`, una serie discontinua | K-37, D-07, X-14 | 3, 4 | media | M | bajo | app/relevo/charts.tsx, demo/page.tsx:31, 306, 317, 383 | no | pendiente |
| 58 | D-01 | Zoom de columna (clic en el título o teclas 1-2-3; Esc vuelve) | D-01(1), U-01(2) | 4 | media | M | bajo | app/relevo/demo/page.tsx | no | pendiente (solo si K-18 no basta en el ensayo) |
| 59 | K-43 | Semántica menor + mismo control segmentado en demo y clínica | K-43, D-17, X-17, X-18, X-20, X-21, X-25 | 3 | baja | S | bajo | ClinicWeb.tsx, demo/page.tsx, MenteeApp.tsx, kit.tsx, app/page.tsx (¡Relay! solo si no se toca Relay) | no | pendiente (excluir app/page.tsx de Relay) |
| 60 | D-18 | Solo h1 del móvil a 28 px y `font-rv-display` en vez de `style` | D-18 (mínimo) | 4 | baja | S | bajo | MenteeApp.tsx, MentorApp.tsx, demo/page.tsx, ClinicWeb.tsx, relevo/page.tsx | no | pendiente |
| 61 | D-19 | Tokens mínimos (radio 20 en portada, `bg-rv-bg` en clínica, verde → `bg-rv-teal`) | D-19 (mínimo) | 4 | baja | S | bajo | app/relevo/page.tsx:21, ClinicWeb.tsx:63,492, MenteeApp.tsx:389 | no | pendiente |
| 62 | D-20 | Wordmark común y flecha en las puertas de la portada | D-20 | 4 | baja | S | bajo | app/relevo/page.tsx, kit.tsx | no | pendiente |
| 63 | K-33 | Grabadora: clic de lectores, aria-live solo en cambios de estado, foco al Undo | K-33, X-05, X-07 | 3 | media | S | **medio** (grabadora frágil; probar ratón, táctil y teclado con micro) | app/relevo/kit.tsx:445-513 | no | pendiente (DECISIONES 9: sí; último de kit.tsx) |
| 64 | D-03 | `relevo.css` dentro de `@layer components` (hover y colores de Tailwind que hoy no se aplican) | D-03 | 4 | media | S | **medio** (cambia la prioridad de todos los estilos; capturas de las 3 superficies) | app/relevo/relevo.css | no | pendiente (solo con tiempo de comprobar capturas) |
| 65 | K-45 | No redibujar si la respuesta del sondeo no cambió | K-45, R-04, A-13 | 3 | baja | S | bajo | kit.tsx:49 | no | pendiente |
| 66 | K-46 | Carga inicial sin cascada | K-46, R-05 | 3 | baja | S | bajo | demo/page.tsx:71 | no | pendiente |
| 67 | K-47 | GET de la clínica sin escribir "Opened Luis's file" repetido | K-47, R-08, A-18 | 3 | baja | S | bajo | api/relevo/clinic/route.ts:14-21 | no | pendiente |
| 68 | K-48 | Notas duplicadas (mismo remitente y minuto; cola de 10 min sin audio) | K-48, Q-09, A-19, C-24(2) | 3 | baja | S | bajo | api/relevo/note/route.ts, kit.tsx:270-305 | no (no cambia la detección) | pendiente |
| 69 | K-54 | Registros sin contenido (`(err as Error).name`) | K-54, C-24(1,3) | 3 | baja | S | bajo | lib/relevo/ai.ts:24 | no | pendiente |
| **— Descartados —** |||||||||||
| — | K-04 | Resolver la crisis el mismo día deja nivel 3 | K-04, Q-02 | 3, 1 | alta | S | medio | lib/relevo/sim.ts:702-722 | lógica | descartado: DECISIONES 6 (lógica de crisis). Mitigación por guion (K-49) |
| — | K-05 | "Talk to my clinic" deja la alerta grave abierta tras el resolve | K-05 | 3 | media | S | medio | lib/relevo/sim.ts | lógica | descartado: DECISIONES 6. Guion: no pulsarlo en el ensayo |
| — | K-14 | Pablo recibe la frase de crisis literal | K-14, C-01 | 1 | alta | M | medio | views.ts, MentorApp.tsx | lógica | descartado: DECISIONES 6 (la opción B dependía de K-10, también vetado) |
| — | K-15 | Sin consentimiento de notas o sin red, la frase de crisis no abre ayuda | K-15, C-02, C-03, Q-04 | 1 | alta | S | bajo | kit.tsx, note/route.ts | lógica | descartado: DECISIONES 6 |
| — | K-16 | Apóstrofo tipográfico ’ no detectado | K-16, C-04 | 3 | alta | S | bajo | note/route.ts:17 | lógica | descartado: DECISIONES 6. Guion: escribir con ' recto en directo |
| — | K-17 | "Ask Pablo to write" en crisis/pausa; "paused" viaja a Luis | K-17, C-09, C-10 | 1 | alta | M | bajo | views.ts, MenteeApp.tsx | lógica | descartado: DECISIONES 6 |
| — | K-29 | La hoja abierta por una nota no dice que la clínica lo sabe | K-29, C-18 | 1 | media | S | bajo | MenteeApp.tsx | lógica | descartado: DECISIONES 6 y 9 (texto de la hoja de ayuda) |
| — | K-10 | M6 "The clinic team is in touch" sin que nadie haya atendido | K-10, C-06 | 1 | alta | S | bajo | MentorApp.tsx:231 | visual (texto) | descartado: DECISIONES 9 (contenido de M6 no se cambia) |
| — | K-13 | Consentimiento de datos opcional | K-13, C-13 | 1 | alta | S | bajo | MenteeApp.tsx | no | descartado: DECISIONES 8 (contradice la especificación v3); se hace K-06 |
| — | K-02b | Gemini: 1 intento / timeouts más cortos en `ai.ts` (T1) y en `analyseNote` (T3); `maxDuration` | K-02 (resto), A-11, A-12, R-10, S-05(parte) | 3 | alta | S | medio | lib/relevo/ai.ts, note/route.ts | T3 lógica | descartado: T3 por DECISIONES 6; T1/timeouts son configuración de Gemini (intocable). La parte /mentor va en la prio 4 |
| — | K-30 | Lista adicional de frases de crisis | K-30 (lógica), Q-05 | 1 | media | S | bajo | note/route.ts | lógica | descartado: DECISIONES 6 (la frase de README va en la prio 18) |
| — | K-39 | Región de las funciones de Vercel | K-39, R-02 | 3 | media | S | bajo | panel de Vercel | no | descartado: configuración fuera del repo y sin push en esta sesión (para el equipo) |
| — | K-55 | "Open the note" sin auditoría | K-55, C-27 | 1 | baja | M | bajo | views.ts, ClinicWeb.tsx | no | descartado: Calidad recomienda no arreglar; no decirlo en el pitch |
| — | K-56 | "Another day" y luego "I'm in" se acepta | K-56, Q-12 | 3 | baja | S | bajo | sim.ts:617-627 | no | descartado: invisible en la demo |
| — | A-08 | Concurrencia real en Redis (WATCH/Lua o lista de eventos) | A-08 | 3 | media | L | alto | store, act, note, mentor, clinic | no | descartado: riesgo alto y esfuerzo grande; K-01 cubre la ventana de Gemini |
| — | D-18b / D-19b | Migración completa a escala tipográfica y tokens | D-18, D-19 | 4 | baja | L | medio | todo src/app/relevo | no | descartado: invisible para el jurado y arriesgado |
| — | A-20, R-09, S-05(1), C-26 | Sin riesgo real · fuente en layout de Relay · /api/suggest de Relay · MIELI en otros idiomas sin dato | ver f1-calidad | — | — | — | — | — | no | descartado: ya descartados por Calidad (Relay o sin evidencia) |

## Ciclos propuestos (cada tarea con archivos propios; puerta 33/33 + 19/19 + build al cerrar cada ciclo)

**Ciclo 1 · que la demo no se caiga y se lea (≈20-25 min)**
- **1A · Servidor** — prio 4, 6, 12: K-01 + K-02 (/mentor), K-03, K-40. Archivos: `api/relevo/mentor/route.ts`, `api/relevo/note/route.ts`, `api/relevo/act/route.ts`, `lib/relevo/sim.ts` (solo 762-764). Visto bueno de Seguridad clínica para note/route.ts.
- **1B · Carcasa de demo** — prio 1, 5, 9, 10, 11: K-18, K-06, U-12, K-42, U-15. Archivos: `app/relevo/demo/page.tsx`, `lib/relevo/demo.ts`.
- **1C · Cliente y puerta** — prio 3, 8, 15, 17: J-03, K-23, K-41, K-53. Archivos: `app/relevo/MentorApp.tsx`, `app/relevo/kit.tsx`, `scripts/relevo-demo-walk.mjs`, `.gitignore`.

**Ciclo 2 · cero trampas para el presentador + repo presentable (≈20-25 min)**
- **2A · Servidor 2** — prio 7, 21, 41 (parte servidor): U-06, K-07, K-26 + K-27. Archivos: `api/relevo/act/route.ts`, `lib/relevo/store.ts`, `api/relevo/note/route.ts`, `api/relevo/audio/route.ts`, `api/relevo/clinic/route.ts`.
- **2B · Pestañas en directo** — prio 2, 38, 27 (copia C5): U-04 + U-05 + U-14 + J-12, U-21, K-11 (la línea de ClinicWeb.tsx:437). Archivos: `app/relevo/demo/page.tsx`, `MentorApp.tsx`, `ClinicWeb.tsx`.
- **2C · Lectura (README y vistas)** — prio 18, 20, 23, 32: K-51, K-12, J-09 + U-17, K-52. Archivos: `README.md`, `lib/relevo/server.ts` (comentario), `lib/relevo/views.ts`, `app/relevo/page.tsx`.

**Ciclo 3 · la historia y la honestidad se ven (≈20-25 min)**
- **3A · Carcasa de demo 2** — prio 13, 14, 19, 22, 24: K-24, U-13, J-08, J-05, U-20 + D-10. Archivos: `app/relevo/demo/page.tsx`, `lib/relevo/demo.ts`.
- **3B · Copy de avisos** — prio 27 (texts.ts), 28, 29, 31: K-11, K-20 + J-11, K-19, D-04. Archivos: `lib/relevo/texts.ts`, `app/relevo/MentorApp.tsx`, `app/relevo/relevo.css`.
- **3C · Crisis accesible (autorizado, visto bueno de Seguridad clínica)** — prio 35, 36, 37: K-08, K-09, K-21. Archivos: `app/relevo/kit.tsx` (solo Sheet), `app/relevo/MenteeApp.tsx`.

Si sobra un 4.º ciclo: 4A demo (U-08, K-31, K-32, J-13; luego U-02) · 4B K-44 + K-22 (MenteeApp, MentorApp, note/route.ts) · 4C K-34 + K-36 + U-19.

## Qué necesita la decisión del Director o del equipo (para el informe final)
Todo esto queda fuera por la regla de crisis o por estar fuera del repo. El arreglo exacto está en `informes/f1-calidad.md`.
1. **K-04** · Resolver la crisis el mismo día deja a Luis en nivel 3 → `s.crisisDays.delete(dateOf(day))` en `case "resolve"` (o resolver para el día siguiente). Mitigación: no pulsar "Resolve" el día 57.
2. **K-05** · Alerta grave huérfana si se pulsa "Talk to my clinic" → cerrar las alertas severe/help abiertas de la misma persona al resolver.
3. **K-14** · Pablo recibe la frase de crisis literal → retener la nota para la clínica (opción A de C-01, con los textos honestos propuestos).
4. **K-15** · Sin consentimiento de notas o sin red, ninguna ayuda → abrir la hoja en el móvil si `crisisFlag(texto)` (no envía nada).
5. **K-16** · Apóstrofo ’ → normalizar a ' en note/route.ts (solo añade coincidencias).
6. **K-17** · "Ask Pablo to write" en crisis/pausa y estado "paused" en el móvil de Luis.
7. **K-29** · Hoja de ayuda: "Your clinic team has been told about your note" solo cuando sea verdad (requiere pasar el motivo).
8. **K-10** · M6 afirma un contacto que no ha ocurrido → "Luis's clinic team has been told. You don't need to do anything else." + 112.
9. **K-30** · Lista de crisis corta (frases pasivas no detectadas) → lista adicional "solo añadir".
10. **K-02 (resto)** · Gemini: 1 intento y timeouts cortos en `ai.ts`; `analyseNote` (la nota de crisis puede tardar hasta 16 s en llegar).
11. **K-13** · Consentimiento de datos obligatorio para entrar (posible choque con RGPD 7.4) frente a la especificación v3.
12. **Equipo, fuera del repo:** K-39 región de funciones y Fluid compute / `maxDuration` en Vercel; revisar el uso de Upstash el domingo (K-45);
    esta sesión no hace push: la versión que verá el jurado (Vercel) solo tendrá estos arreglos cuando el equipo haga merge a `main`;
    pregunta a los mentores: MIELI en otros idiomas (C-26); no decir en el pitch que "Open the note" queda auditado (K-55).
