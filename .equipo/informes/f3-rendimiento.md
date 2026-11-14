# F3 · Rendimiento de Relevo en la congelación (repetición de la línea base)

Fecha: 14/11/2026 · Rama: `sesion-autonoma` (commit 7a1bb6a) · Autor: especialista de rendimiento.
Línea base: `.equipo/informes/f1-rendimiento.md` (commit 4701299).

**En una frase:** no hay ninguna regresión. Lo que ve el jurado (pulsar "Next moment" y ver cambiar los tres paneles) va igual
o mejor que en la línea base: unos **0,11 s de mediana en local, frente a ~0,22 s** antes. Las **tareas largas en reposo han desaparecido**
(antes había una de 60–86 ms cada ~5 s). Las respuestas pesan lo mismo o un poco menos y no hay saltos de maquetación.

Cómo medí (igual que en F1):
- Servidor de desarrollo local `http://localhost:3000` (`next dev`), **no producción**: producción aún no tiene estos cambios.
- `walk-http.mjs` (de la carpeta de scripts de F1) recorre los 27 momentos: POST `/act` y luego los 4 GET en paralelo. Lo pasé 2 veces y añadí 6 GET con curl por endpoint.
- Navegador Playwright en un **contexto propio** de 1440×900, en `/relevo/demo?w=pf…` (ids de mundo aleatorios y propios). 3 pasadas de 12 clics en "Next moment".
- Sin llamar a Gemini a propósito. Aviso: no leí `.env.local`, así que no sé si el servidor tiene clave. Si la tiene, desde T3 `/mentor`
  pide el borrador **una sola vez por tarjeta y en segundo plano** (`after()`), así que no afecta a los tiempos medidos.
- No ejecuté `next build` ni hice commits.

---

## 1. Tabla: línea base (F1) frente a ahora (F3), todo en local (modo dev)

| Medida | Línea base F1 | Ahora F3 | ¿Cambio? |
|---|---|---|---|
| `/act` (cambio de reloj), mediana en el recorrido | 35–72 ms (picos de hasta 0,8 s) | **41 ms** y **51 ms** en 2 pasadas (picos sueltos de 202 ms y 911 ms) | igual |
| GET sueltos con curl (conexión nueva) | 40–80 ms | `/demo` 21–44 · `/me` 19–65 · `/mentor` 28–50 · `/clinic` 32–75 ms | igual o mejor |
| 4 GET en paralelo, aislados | 240 ms (en serie 325–525 ms) | **85 ms y 155 ms** (en serie 133 ms y 179 ms) | mejor |
| Cada GET dentro del recorrido (act + 4 GET), mediana | — (no se dio por separado) | `/demo` 167–213 · `/me` 180–218 · `/mentor` 179–218 · `/clinic` 179–219 ms | — |
| Recorrido completo por momento (act + 4 GET), mediana | — | **235 ms y 273 ms** (máx. 478 ms y 1,99 s, son picos del modo dev) | — |
| `/clinic?person=luis` (ficha abierta) | 40–150 ms | 26–46 ms (2.ª pasada 46–82 ms, con un primer pico de 229 ms) | igual |
| Pulsar "Next moment" → los 3 paneles cambiados (mediana) | **~220 ms** (clínica ~45 ms después de los móviles) | **~111 ms** (2 pasadas de 12 clics; rango 96–203 ms; la clínica llega a la vez o ≤15 ms después) | **mejor** |
| Duración del clic (INP aproximado, ≤ 200 ms) | 16–104 ms | **24–32 ms** (12 clics reales) | mejor |
| Tareas largas en reposo (día 60, 20 s, pestaña visible) | una de 60–86 ms cada ~5 s | **ninguna** | **mejor** (efecto de R-04: si la respuesta es idéntica, no se repinta) |
| Peticiones en reposo | 18 en 20 s | 18 en 20 s | igual |
| CLS al cargar (≤ 0,1) | 0,00002 | **0** (3 cargas) | igual |
| CLS con clics reales | — | **0** (los saltos ocurren justo tras el clic y no cuentan) | ok |
| LCP local (≤ 2,5 s) | 0,66–0,82 s | 0,49 s y 1,39 s (el 1,39 es la primera carga, cuando el modo dev aún compila) | igual |
| Tarea larga al cargar | no medido | una de 127 ms al hidratar la página (modo dev) | — |

### Tamaño de las respuestas (JSON sin comprimir)

| Endpoint | F1 día 0 / 47 / 62 | F3 día 0 / 47 / 62 | ¿Cambio? |
|---|---|---|---|
| `/demo` | 6,4 / 11,8 / 14,0 KB | 6,1–6,3 / 10,8–11,5 / 13,7 KB | un poco menor |
| `/me` | 2,8 / 6,8 / 6,3 KB | 1,7–2,7 / 5,3–6,6 / 6,1 KB | un poco menor |
| `/mentor` | 2,2 / 4,4 / 4,5 KB | 2,0–2,1 / 3,9–4,3 / 4,4 KB | igual |
| `/clinic` | 4,8 / 5,0 / 7,3 KB | 4,7–5,3 / 4,9 / 7,1 KB | igual |
| `/clinic?person=luis` | 16,6 KB | 16,6 KB | igual |

---

## 2. Qué significa cada cosa

- **Cambiar de momento va más fluido.** El flujo es el mismo de antes (primero `/act`, después 4 GET en paralelo), así que parte de la
  mejora de ~220 ms a ~110 ms puede ser ruido del modo dev. Lo que sí es real: los sondeos ya no repintan todo cuando no hay cambios, y
  hay una marca para que una respuesta vieja no pise a la nueva (R-03 y R-04). Así el navegador queda libre para pintar enseguida la
  respuesta de la acción, y la clínica ya no llega ~45 ms tarde.
- **En reposo la página ya no se atasca.** Antes había un repintado de 60–86 ms cada ~5 s. Ahora no hay ninguna tarea larga en 20 s.
- **Peticiones en reposo: siguen siendo ~0,9 por segundo.** No cambia el coste de Redis (unos 3.200 comandos por hora con la pestaña visible, según F1).
- **CLS: sin saltos.** Si se cambia de momento desde un script (sin clic de verdad), los paneles se recolocan un poco al llegar el
  contenido nuevo (en total ~0,1 en 12 momentos; sobre todo la tarjeta "Pablo left you a note" y las filas de la tabla de la clínica).
  Con un clic o una tecla de verdad, que es lo que hará el presentador, el navegador no cuenta esos saltos porque son la respuesta
  esperada a la acción. No es un problema.
- **Picos sueltos (0,4–1,9 s) en la 2.ª pasada HTTP:** son típicos de `next dev`, que recompila y hace cada petición dos veces, y además
  otros especialistas podían estar usando el mismo servidor a la vez. En F1 ya había picos de 0,8 s. En producción no se esperan.

## 3. Lo que NO medí
- Producción (todavía no tiene estos cambios). Al desplegar conviene repetir `prod-get.sh` y una carga de `/relevo/demo`. Los avisos de F1
  sobre la región (R-02a) y el arranque en frío (R-07) siguen vigentes.
- El motor por separado (`bench-sim.mjs`): los cambios en `sim.ts` son dos líneas (un `try/catch` y un texto) y no afectan al coste.
- Gemini con clave, y móvil o wifi reales.

## 4. Conclusión
**Ninguna regresión.** Todos los tiempos son iguales o mejores que en la línea base, el tamaño de las respuestas es igual o un poco menor,
CLS sigue en 0 y se ha eliminado el repintado periódico en reposo. Desde el punto de vista del rendimiento, la rama se puede congelar.
