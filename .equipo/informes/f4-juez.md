# F4 · Informe del Juez de Producto (Relevo): segunda puntuación

Fecha: sáb 14 nov 2026, ~14:05 (hora de Finlandia) · Rama `sesion-autonoma` (HEAD `7a1bb6a`) · Solo lectura (este informe es lo único escrito).

## Método
- **Misma rúbrica que F1** (`f1-juez.md`). Supuesto: no hay criterios oficiales. Cuatro ejes con el mismo peso: 1 impacto y encaje · 2 innovación · 3 ejecución técnica · 4 presentación y experiencia. Esta vez uso medios puntos para reflejar mejoras parciales.
- **Qué cambió:** leí `git log --oneline inicio-sesion..HEAD` (11 commits: T1-T7, B2, D2, F2 y la memoria), `MAPA.md`, `BACKLOG.md` y `ESTADO.md`. Pero puntúo **lo que vi**, no lo que dicen los commits.
- **Recorrido propio (VERIFICADO):** el navegador Playwright con **contexto propio** (`browser.newContext`, no el compartido), así ningún otro agente me cambió la pestaña.
  - Mundo `juezf4x8r2` a **1440×900**: los **27** momentos con "Next moment", uno a uno, con captura de cada uno. Después, la capa abierta con la tecla `E` en el cierre.
  - Mundo `juezf4hd77` a **1920×1080**: saltos directos con "Jump to moment" a match, copilot, crisis y close (sin pasar por los momentos intermedios), con la capa cerrada y abierta.
  - **0 errores y 0 avisos en la consola** en los dos mundos. Sin scroll horizontal (`scrollWidth` 1920).
  - Servidor local sin Gemini: el paso 3 usa el texto de respaldo.
- **Puertas:** `node scripts/relevo-check.mjs` **33/33** y `node scripts/relevo-demo-walk.mjs` **19/19** (los 8 pasos y los números del contrato coinciden).
- **README.md y LICENSE:** leídos enteros.

## Tabla antes / después

| Eje | F1 | F4 | Cambio | Evidencia principal (VERIFICADO salvo que diga otra cosa) |
|---|---|---|---|---|
| 1 · Impacto y encaje | 8 | **8,5** | +0,5 | (+) El primer fotograma ya cuenta el problema: la tarjeta **"Beyond the clinic"** ("After the last TMS session, each person goes home on their own…", "Press → to start"), capturada a 1440 en el día 0. (+) El README tiene la sección "The problem" y explica muy bien qué es real y qué es simulado. (+) Honestidad clínica: la capa 8 dice "checks that the logic works as designed, not that it predicts relapse in real patients"; M5 dice "You can write to Marta whenever you like"; el copiloto ya no habla de la salud de Pablo; M0 ya no enseña cómo empezó la recaída de Luis. (−) Siguen abiertos, por decisión del Director, los fallos del camino de crisis (K-04, K-05, K-14, K-15, K-16, K-10). Un jurado clínico que pruebe por su cuenta los puede encontrar. |
| 2 · Innovación | 8 | **8,5** | +0,5 | (+) El copiloto ya **se ve** en el móvil de Pablo justo en su momento: tarjeta "Only you see this · A private idea for your next note to Luis · Open" (día 40, 21:10, a 1440 y a 1920). Era lo que restaba en F1 (J-03). (+) Lo demás sigue igual de sólido: emparejamiento 0,87 frente a 0,758 con tabla de huellas, primero se pregunta al mentor, "Can't today" se respeta, protección del mentor. (=) Las ideas son las mismas: la subida es solo porque ahora se ven. |
| 3 · Ejecución técnica | 7 | **8** | +1 | (+) **README de verdad** y **LICENSE MIT** (antes era la plantilla de Next.js). (+) Robustez: `/act` valida los datos y tiene límite de tamaño; un evento malo ya no rompe el mundo; el XSS de `/audio` está cerrado (nosniff y CSP sandbox); `/mentor` ya no espera a Gemini (`after()` y una marca por tarjeta); el sondeo ya no "vuelve atrás"; aviso "Connection lost". (+) "What just happened" sale en inglés (`english()` en `demo.ts`); el plan dice "Today, 10:00 · Luis is in" el día 48 (J-09 arreglado). (+) 33/33, 19/19 y consola limpia. (−) **Nada de esto está en producción**: la sesión no hace push, así que en `junction-ackerman.vercel.app` el jurado vería la versión de F1 (INFERIDO de MAPA y ESTADO). (−) Las cifras del cierre en `src/lib/relevo/demo.ts:128` siguen sin el comentario `// MOCK:` con su fuente; el README sí lo explica. (−) "Hey Luis, fancy a stroll tomorrow at 10? **Half an hour**, no rush" (`texts.ts:23`) frente al plan "20-minute walk" (`texts.ts:24`): J-11 sigue abierto y se ve en el paso 3. (−) Sin login, a propósito (`?w=`), y está bien explicado como MOCK. |
| 4 · Presentación y experiencia | 6 | **7,5** | +1,5 | (+) La capa de explicación **empieza cerrada** y se abre con la tecla **E**. Con la capa cerrada los móviles se ven a tamaño real (1920: escala 1,0; 1440: se leen bien). (+) Al cambiar de momento, las pestañas vuelven a Today o al Panel; "Jump to moment" lleva a cualquier momento; la capa va numerada con el guion ("1 · Matching…", "6 · Severe protocol", "8 · What the simulation shows"). (+) La crisis se entiende de un vistazo a 1920: hoja de ayuda, M6 tranquilo y "3 Severe · Call now". (−) Siguen **27 paradas** en el deslizador; no hay visita corta de 8 (J-04) ni anillo de "mira aquí" (U-02). (−) **El clímax está escondido:** en el momento "close", con la capa cerrada (así empieza), no aparece ni 88 %, ni 5 días, ni 2,45. Solo se ven los móviles y la clínica. Al final, "Next moment" se queda gris: no hay "Restart demo" (U-20). (−) A 1440 la clínica sigue diminuta: texto efectivo de unos **7,7 px** (escala 0,55); a 1920 ronda los 11 px. Con la capa abierta a 1440 los móviles bajan a escala 0,54. (−) La capa conserva jerga: "EWMA, λ 0.3", "s 2.80 · smoothed 2.20 · 6 feat.", "z 4". En el gráfico, la etiqueta "area threshold 1.5" se monta sobre las líneas. El momento del copiloto no lleva número ("Copilot: …" en vez de "2 · …"). (−) A 1440 el subtítulo "Luis's mentor · 4 months after …" sale cortado. (Nota: la insignia "N" de Next.js tapa el interruptor y el eje del gráfico, pero solo aparece en `npm run dev`. El guion de ensayo ya manda presentar con build o con la versión desplegada.) |

**Media: F1 7,3 → F4 8,1** (8,5 + 8,5 + 8 + 7,5 = 32,5 / 4 = 8,125).

## Lo que mejoró de verdad (resumen de lo visto)
- J-01 README ✔ · J-03 copiloto visible ✔ · J-05 claves en inglés ✔ · J-08 "por qué" al abrir ✔ · J-09 fecha del plan ✔ · J-10 copiloto sin salud ✔ · J-12 ficha la 2.ª vez ✔ (según F2; no lo repetí) · J-15 `.playwright-mcp` ignorado ✔ · J-02(a) tecla E + capa cerrada ✔.
- Sigue abierto: J-02(b) "look here" · J-04 27 paradas · J-06 parcial (`/mentor` ya no bloquea; `analyseNote` con su timeout queda fuera por DECISIONES 6) · J-07 parcial (texto honesto en la capa y el README, pero sin `// MOCK:` en `demo.ts:128`) · J-11 "Half an hour" · J-13 solapes a menos de 1100 px (no lo medí) · J-14 la raíz `/` es Relay (mitigado en el README).

## Las 5 cosas pendientes que más subirían la nota (para el informe final)

1. **Llevarlo a producción (merge a `main` + push, con permiso del equipo) y comprobar el despliegue.** Hoy el jurado vería la versión de F1 en Vercel: todo lo de esta tabla vale 0 hasta que se despliegue. Después: `relevo-demo-walk.mjs https://junction-ackerman.vercel.app` y un mundo nuevo para el pitch. Ejes 3 y 4. Esfuerzo S, riesgo bajo (si falla, variables de entorno en Vercel).
2. **Que el cierre se vea sin pulsar E** (U-20 + parte de J-02): en el momento `close`, abrir sola la capa o mostrar una franja grande "88 % · 5 days · 2.45 false alarms/person-year · 200 synthetic people" encima de las columnas, y cambiar el botón gris por "Restart demo". Es la última imagen que se queda el jurado. Eje 4 (y 1). Esfuerzo S.
3. **Visita corta de 8 paradas + "mira aquí"** (J-04 + U-02): que "Next moment" salte solo por los 8 pasos del contrato, con un anillo teal en la columna donde pasa algo. 27 pulsaciones en 3 minutos no caben, y la clínica a 1440 (7,7 px) no se lee sin guía. Eje 4. Esfuerzo M, riesgo bajo (el guion hace solo los pasos intermedios; VERIFICADO al saltar directamente a crisis y a close).
4. **Quitar jerga de la capa y pulir 3 detalles visibles:** "EWMA, λ 0.3" → "smoothed over days"; "s / smoothed / feat. / z" → "today / trend / signals"; número "2 ·" en la capa del copiloto; la etiqueta del umbral fuera de las líneas; "Twenty minutes, no rush" en `texts.ts:23` (J-11). Ejes 4 y 3. Esfuerzo S.
5. **Decisión del Director sobre el camino de crisis** (K-04 resolver el mismo día, K-05 alerta huérfana, K-15 sin consentimiento no hay ayuda, K-16 apóstrofo ’): son los únicos puntos que un jurado clínico o técnico puede romper probando por su cuenta. Mientras no se toquen, el guion debe evitarlos (ya está en `GUION-ENSAYO.md`). Eje 1 (y 3). Esfuerzo S cada uno, riesgo medio (lógica de crisis).

Extra, coste mínimo: `// MOCK: offline evaluation of the reference engine (Python, 200 synthetic people)` en `src/lib/relevo/demo.ts:128` (J-07).

## No lo pude comprobar
- La versión desplegada con estos cambios (no existe todavía: no hay push).
- La ruta con Gemini real (sin clave en local, a propósito).
- La grabadora con micrófono real.
