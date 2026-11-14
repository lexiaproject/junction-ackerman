# INFORME FINAL · Sesión autónoma de mejora de Relevo

## 1. Estado en una frase
**Sí: la demo funciona de principio a fin**, en la rama `sesion-autonoma` y en producción
(https://junction-ackerman.vercel.app/relevo/demo, publicado a petición tuya durante la sesión). Comprobado ejecutándolo:
motor 33/33, recorrido de los 8 pasos 19/19 (en local, tres veces seguidas, y contra producción), build limpio, sin errores de
consola, y Gemini redactando en producción (~3 s después, sin bloquear la pantalla).

## 2. Puntuación del Juez (sin criterios oficiales: 4 ejes con el mismo peso, anotado como supuesto)
| Eje | Antes | Después |
|---|---|---|
| Impacto y encaje con el reto | 8 | 8,5 |
| Innovación | 8 | 8,5 |
| Ejecución técnica | 7 | 8 |
| Presentación y experiencia | 6 | 7,5 |
| **Media** | **7,3** | **8,1** |
Verificador de ojos frescos (independiente, sin leer nada del equipo): 7,5/10 antes del ciclo 3; el ciclo 3 corrige sus tres
hallazgos visibles (números ocultos sin la capa, frase partida en la conversación, README inexacto).

## 3. Qué se mejoró (lo que nota el jurado)
**La demo no se rompe**
- Un dato mal formado ya no deja la demo en blanco; /act valida y limita tamaño; reset sin repetir ids — `932d733`
- /mentor ya no espera a Gemini ni pisa acciones; /note guarda sobre el mundo recargado — `2889718`, `1a4f9c6`
- Pantallas fiables: sin respuestas viejas, sin congelarse con red lenta, aviso "Connection lost" — `2df40b3`
**Se ve y se controla en el proyector**
- Capa de explicación cerrada al empezar (tecla E), clínica más grande (móvil de Luis 177 → 316 px a 1440×900) — `2df40b3`
- "Next moment" sin repetir, flechas tras el deslizador, crisis clicable, selector de momentos, aviso de consentimientos — `2df40b3`
- Al avanzar, Pablo vuelve a Today y se cierra la hoja (sin doble envío del paseo); la clínica vuelve al panel; la ficha abre a la 2.ª — `87ae2ce`
- Capa abierta sola en emparejamiento y cierre; encabezados sin números desordenados; frase de la grabadora en 1-2 líneas — `91b1eea`
- Tarjeta "Beyond the clinic" al abrir la demo — `87ae2ce`
**Más honesta y segura**
- Copiloto visible en Today de Pablo — `87ae2ce`
- Textos que no mienten: V3 tras "Can't today", M5, M0 sin revelar la recaída, copiloto sin datos de salud — `eb68636`, `87ae2ce`
- Cierre y portada honestos (200 personas sintéticas, nivel 2 = 48 %) — `87ae2ce`
- Hoja de ayuda accesible (foco, Close, Escape por teléfono; en la demo no roba el foco al presentador) sin cambiar su contenido — `1a6972a`, `87ae2ce`
- XSS cerrado (audio solo audio/*, nosniff, sandbox) — `1a4f9c6`
**Repo defendible**
- README real (qué es, qué es real y qué simulado, cómo ejecutarla), licencia MIT, guion de 3 min `docs/DEMO.md` — `a4cf026`, `6aad5c7`
- Prueba de extremo a extremo de los 8 pasos `scripts/relevo-demo-walk.mjs` — `4701299`
- Estilos en @layer (Tailwind gana: cabecera de Pablo en una línea, hover, colores) — `cf395ab`

## 4. Qué se intentó y se revirtió
Nada se revirtió entero. Dos cambios volvieron una vez al implementador y pasaron la segunda revisión: `useView` (se congelaba
con red lenta) y las hojas accesibles (en la demo robaban el foco al presentador el día 57 y las dos confirmaciones compartían
estado). U-06 ("Previous" deshace un clic equivocado) se descartó porque el Arquitecto dijo que no cabía.

## 5. Qué queda pendiente (por impacto)
1. **Decisiones sobre el camino de crisis (no se tocó su lógica, por tu regla)** — arreglo exacto en `informes/f1-calidad.md`:
   K-04 resolver el mismo día deja nivel 3 (mitigación: no pulsar "Resolve" el día 57) · K-14 Pablo recibe la frase de crisis
   literal · K-15 sin consentimiento de notas o sin red no se abre ayuda · K-16 apóstrofo ’ no detectado · K-10 M6 afirma un
   contacto que aún no ha ocurrido · K-17 "Ask Pablo to write" durante crisis/pausa · K-29 · K-30 lista de crisis corta ·
   K-05 alerta huérfana. Esfuerzo S-M cada uno.
2. Salirse del guion (p. ej. "Can't today" a mano en el paso 3) desincroniza la historia; se recupera con More → Reset (M).
3. A 1440×900 con la capa abierta la letra de teléfonos y clínica queda pequeña: presentar a 1920×1080 o con la capa cerrada (sin código).
4. Accesibilidad menor: botón "Open" del copiloto con nombre genérico, "0 Stable" a 4,38:1, borde de campos 2,997:1 sobre el fondo de las hojas (S).
5. Jerga en la capa ("EWMA", "z") y "Half an hour" frente a "20-minute walk" (S).

## 6. Lo que necesita tu decisión o tu mano
- Las decisiones de crisis del punto 5.1.
- Vercel: comprobar que Fluid compute está activo (el borrador de Gemini se pide con `after()` y `maxDuration = 30`) y mirar el uso de Upstash.
- `.env.example` sigue nombrando gemini-2.5 (no se tocó: archivo de claves).
- Ninguna clave a rotar: no hay secretos en el código ni en el historial.

## 7. Qué es real y qué es simulado
Real: motor de riesgo (mismos números que el Python de referencia), avisos V1-V8 con sus reglas, bandido que aprende, filtro de
crisis por lista fija, copiloto, notas de voz (grabación y dictado del navegador), Gemini con respaldo de plantilla, panel de la
clínica, emparejamiento. Simulado: datos de sensores de 9 semanas, conexiones a Apple Health/anillo, acciones del guion cuando
nadie pulsa, roles sin login, clínica y teléfono ficticios, cifrado de audio no implementado.

## 8. Cómo fusionar / volver atrás
Ya está fusionado y publicado: `main` = un commit resumen (squash) con el contenido exacto de la rama, sin el nombre de usuario
en el historial. El detalle commit a commit sigue en la rama local `sesion-autonoma`.
- Volver a la versión anterior en producción: `git revert --no-edit <commit-resumen>` y `git push origin main`
  (o en Vercel: Deployments → la anterior → "Promote to Production").
- Punto de partida exacto: etiqueta local `inicio-sesion` (37116e2).

## 9. Tiempo y volumen
Inicio 10:58, cierre 13:30 (151 min de reloj). 3 ciclos de construcción (2 completos + 1 corto en congelación). 15 commits en la rama +
commits resumen en `main`. Unos 45 encargos a agentes: 9 de diagnóstico, 3 jefes, 8 implementaciones, 15 revisiones, 4
integraciones/verificaciones, verificador de ojos frescos, juez final y redactor.
