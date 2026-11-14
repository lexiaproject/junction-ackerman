# C1 · Revisión de código (criterios de revisión de Google)

Revisor: agente revisor de código. Alcance: los cambios sin confirmar del ciclo (`git diff HEAD`), comparados con los objetivos del encargo.
No he leído los informes de los autores (`c1-*.md`).

## Qué he comprobado y cómo
- `npx tsc --noEmit`: sin errores. `npx eslint` sobre los archivos tocados: sin avisos.
- `node scripts/relevo-check.mjs`: 33/33 OK. `node scripts/relevo-demo-walk.mjs`: 19/19 OK (servidor local en :3000 con el árbol de trabajo).
- He probado a mano contra el servidor local, en mundos de prueba propios (`revcprobe01..03`, en memoria): cuerpos y `p` mal formados,
  `__proto__`/`toString` como persona o rol, configuración con claves raras, notas con `mime` peligroso, cabeceras de `/audio`.
- Playwright (contexto propio, mundo `revcprobe03`): 4 flechas seguidas = 4 momentos distintos (match → intro → welcome → baseline), sin repetir;
  el punto del día 57 lleva a "crisis"; la capa de explicación empieza cerrada; clínica a 1100 px se ve completa a 1440×900; consola sin errores.
  Captura en `.claude/.playwright-mcp/rev-c1-crisis.png` (carpeta ignorada por git).
- Intocables: `git diff HEAD -- src/lib/relevo/engine.ts src/lib/relevo/ai.ts` vacío. En `sim.ts` el único bloque tocado es el bucle de
  eventos de usuario; `SCRIPT` y `BANDIT_SALT` no cambian (solo aparece `SCRIPT` como línea de contexto). Ningún archivo fuera de `relevo`
  en `src/` está modificado (Relay intacto).

## Veredictos por grupo

| Grupo | Veredicto |
|---|---|
| `act/route.ts` + bucle de eventos de `sim.ts` | Aprobado con arreglos menores (RC1-05, RC1-06, RC1-07) |
| `note/route.ts`, `audio/route.ts`, `store.ts` | Aprobado con arreglos menores (RC1-02, RC1-09) |
| `mentor/route.ts` | Aprobado con arreglos menores (RC1-03, RC1-04) |
| `kit.tsx` (`useView`) | Aprobado con arreglos menores (RC1-01, gravedad media) |
| `demo/page.tsx` + `demo.ts` | Aprobado (RC1-08, baja) |
| `relevo.css` (`@layer`) | Aprobado (RC1-11, baja) |
| `.gitignore` | Aprobado |
| `README.md` | Aprobado con arreglos menores (RC1-10) |
| Intocables | Intactos (verificado) |

Lo que está bien hecho y conviene mantener: `Object.hasOwn` en vez de `PERSON[id]`/`ALLOWED[as]` (cierra `__proto__`/`constructor`: verificado
que `as:"__proto__"` da 403 y `person:"toString"` da 400); el límite de 4000 caracteres se mira antes de leer el mundo; el reset conserva `seq`;
el `mime` se sanea al guardar Y al servir (también protege audios guardados antes del cambio); `nosniff` + `CSP: sandbox` presentes (verificado
con `curl -D`); la marca `try:` va en clave aparte para no dejar vacío el `??` de `views.ts`; el análisis de crisis (`crisisFlag || g.crisis`) no
cambia; la cadena de promesas de `setClock` mantiene el orden de las peticiones del reloj.

## Hallazgos

```
RC1-01 · useView puede quedarse congelado si la red es más lenta que el intervalo de sondeo
Gravedad: media     Evidencia: INFERIDO (lectura del código; en local responde en ~40 ms y no se reproduce)
Dónde: src/app/relevo/kit.tsx:45-66
Qué pasa: solo se aplica la respuesta cuyo número es el ÚLTIMO pedido (`my === last`). El intervalo lanza una petición nueva cada
  pollMs aunque la anterior siga en vuelo, y cada acción dispara otra con "relevo:changed". Si cada respuesta tarda más que pollMs
  (wifi del recinto, arranque en frío de Vercel + Upstash), cuando llega la respuesta N ya existe la N+1 y se descarta; luego pasa lo
  mismo con la N+1, etc. Resultado: la pantalla no se actualiza nunca y TAMPOCO aparece el aviso "Connection lost", porque los errores
  también se descartan con la misma condición. Afecta a las 6 pantallas que usan useView.
Arreglo propuesto (concreto): sustituir "solo la última" por "nunca una más vieja que la ya aplicada":
  `let applied = 0;` y en el éxito `if (alive && my > applied) { applied = my; setError(""); if (txt !== lastText) {...} }`;
  en el error `if (alive && my > applied) setError(...)`. Opcional: no lanzar un sondeo de intervalo si hay uno en vuelo.
```

```
RC1-02 · La lista blanca de tipos de audio deja pasar saltos de línea y rompe /audio con un 500
Gravedad: baja     Evidencia: VERIFICADO
Dónde: src/lib/relevo/store.ts:25
Qué pasa: `AUDIO_MIME = /^audio\/(webm|ogg|mp4|mpeg)(;[\w=.\-\s]*)?$/` usa `\s`, que incluye `\n` y `\r`. Una nota con
  `mime: "audio/webm;a\nb"` se acepta y se guarda; al pedir ese audio, `new Response(..., { headers: { "Content-Type": ... } })` lanza
  y `/api/relevo/audio?id=ev2` responde 500 (probado). No hay inyección de cabeceras ni XSS (el constructor lo impide), solo un audio
  inservible y un error en el registro.
Arreglo propuesto (concreto): cambiar `\s` por un espacio literal: `/^audio\/(webm|ogg|mp4|mpeg)(;[ \w=.\-]*)?$/`.
```

```
RC1-03 · Escrituras leer-modificar-guardar desde un GET: pueden pisar una acción simultánea y pedir dos veces a Gemini
Gravedad: baja     Evidencia: INFERIDO
Dónde: src/app/api/relevo/mentor/route.ts:27-41
Qué pasa: la marca se guarda con `loadWorld` → `saveWorld` del mundo entero, y el borrador igual dentro de `after`. Si entre esa lectura y
  esa escritura entra un POST /act (justo cuando aparece la tarjeta, que es cuando el presentador está pulsando), el evento del POST se
  pierde. La ventana es de milisegundos (mucho menor que la de antes, que guardaba un mundo leído 2 s antes), pero existe. Además la
  comprobación se hace sobre `world` y no sobre `mark`: dos GET simultáneos (columna de Pablo en la demo + teléfono real de Pablo) pasan
  los dos y piden dos borradores.
Arreglo propuesto (concreto): mínimo, volver a mirar `if (key in mark.ai || tried in mark.ai)` antes de guardar la marca. Mejor (si hay
  tiempo): guardar borradores y marcas en una clave aparte `relevo:ai:${w}` (que `mentorView` lea junto al mundo), de modo que un GET
  nunca reescriba el mundo.
```

```
RC1-04 · El borrador de Gemini aparece un sondeo más tarde y el texto de la tarjeta cambia a la vista
Gravedad: baja     Evidencia: INFERIDO (local sin clave de Gemini: este camino no se ejercita)
Dónde: src/app/api/relevo/mentor/route.ts:33-40
Qué pasa: la primera respuesta lleva la plantilla; el borrador llega ~2 s después y se ve en el siguiente sondeo (hasta 4 s). En el paso 3
  de la demo, si el presentador pulsa rápido, Pablo envía la plantilla, o el texto cambia mientras se lee. Es el precio esperado de no
  bloquear, pero conviene saberlo para el ensayo.
Arreglo propuesto (concreto): en el guion, esperar ~4 s tras "Yes" antes de abrir la idea; o lanzar un `changed()`/sondeo extra a los 3 s
  desde MentorApp cuando la tarjeta aún no trae borrador.
```

```
RC1-05 · El try/catch del bucle de eventos traga cualquier error sin dejar rastro en el servidor
Gravedad: baja     Evidencia: VERIFICADO (lectura)
Dónde: src/lib/relevo/sim.ts:763-768
Qué pasa: cumple su objetivo (un evento malo ya no deja el mundo en 500), pero también esconde fallos reales de programación en `act`
  (la demo seguiría "funcionando" con una línea "(x ignored: invalid data)" en la traza). Si `act` lanza a mitad de una mutación (p. ej.
  `resolve` tras poner `s.crisis = null`), el estado queda a medias sin aviso.
Arreglo propuesto (concreto): `catch (err) { console.error("relevo: event", e.id, e.type, err); trace(...) }` para que salga en los
  registros de Vercel. Sin más cambios.
```

```
RC1-06 · Las acciones de mentor siguen aceptando datos inválidos (ritmo 99 o "abc")
Gravedad: baja     Evidencia: VERIFICADO
Dónde: src/app/api/relevo/act/route.ts:93 (solo se valida la clínica); src/lib/relevo/sim.ts:656-664
Qué pasa: POST `{as:"pablo", type:"rhythm", p:{rhythm:99}}` y `{as:"marta", ..., rhythm:"abc"}` devuelven 200; después la clínica
  recibe `"rhythm": null` para ambos y el selector de ritmo queda en -1. No da 500 (fuera del objetivo estricto, que era la clínica),
  pero es el mismo tipo de dato malo guardado para siempre.
Arreglo propuesto (concreto): añadir junto a CLINIC_NEEDS una regla para `rhythm`: `p.decline || [0,1,2,3].includes(Number(p.rhythm))`
  aplicada a pablo/marta.
```

```
RC1-07 · "domain weights updated" se apunta en la auditoría aunque no cambie nada
Gravedad: baja     Evidencia: VERIFICADO (lectura)
Dónde: src/app/api/relevo/act/route.ts:61-66
Qué pasa: el `changes.push("domain weights updated")` está fuera del bucle: se apunta aunque todas las claves se hayan descartado, y como
  la clínica envía la configuración entera en cada "Save settings", aparece en C6 en cada guardado. (Ya pasaba antes; el filtrado nuevo
  lo hace más visible porque ahora se descartan claves.)
Arreglo propuesto (concreto): apuntarlo solo si algún peso cambió: comparar `next[k] !== c.weights[k]` dentro del bucle y empujar el
  texto solo si hubo al menos uno.
```

```
RC1-08 · Los puntos de días consecutivos aún se tocan en ventanas de 1024 px
Gravedad: baja     Evidencia: VERIFICADO (Playwright)
Dónde: src/app/relevo/demo/page.tsx:265-277
Qué pasa: el solape dentro del mismo día está resuelto (14 puntos, el del día 57 lleva a "crisis"). A 1440 px el hueco mínimo es 21 px,
  pero a 1024 px los centros de los días 55-56 y 59-60 quedan a 14-15 px con puntos de 16 px (se montan 1-2 px, y más con el `scale-125`
  del hover). En un portátil con zoom del 125 % puede pasar en la presentación.
Arreglo propuesto (concreto): puntos `h-3 w-3` por debajo de `xl` (`h-3 w-3 xl:h-4 xl:w-4`), o quitar el `hover:scale-125`.
```

```
RC1-09 · La nota se guarda en el mundo recargado, pero el destinatario se validó con el mundo viejo
Gravedad: baja     Evidencia: INFERIDO
Dónde: src/app/api/relevo/note/route.ts:24-27 y 37-41
Qué pasa: `to` (pareja permitida), consentimientos y notas previas salen de la lectura inicial. Si durante la espera a Gemini el presentador
  pulsa "Reset" o mueve el reloj antes del emparejamiento, la nota entra en un mundo donde esa pareja ya no existe. El análisis de crisis
  no cambia (bien, era requisito); es solo la autorización del destinatario.
Arreglo propuesto (concreto): tras `const fresh = await loadWorld(...)`, repetir la comprobación barata de pareja con `evaluate(fresh)`
  (`to === "clinic" || to === p.mentorId || to === p.menteeId`) y responder 409 si ya no vale; el análisis se reutiliza tal cual.
```

```
RC1-10 · README: falta el archivo LICENSE y hay tres afirmaciones inexactas
Gravedad: media (LICENSE) / baja (resto)     Evidencia: VERIFICADO
Dónde: README.md (secciones "License", "The demo in 8 steps", "Simulated / MOCK")
Qué pasa:
  1. Dice "MIT." pero no hay `LICENSE` en el repo (`git ls-files | grep -i licen` solo encuentra licencias de .claude/). Las normas piden
     publicar con licencia MIT.
  2. "Day 0 is 7 September, Luis's last TMS session": el código dice que DAY0 = 2026-09-07 es el día SIGUIENTE a la última sesión
     (src/lib/relevo/people.ts:31), y la cabecera de la demo dice "day 57 after Luis's last TMS session".
  3. "Every number below is checked automatically by relevo-demo-walk.mjs": el recorrido no comprueba los de nivel 2 (48 %, 1 día, 0,5)
     ni los 100 relapsos.
  4. "the names ... are replaced from a fixed list of 9 names": se sustituyen por códigos (`⟨P-41⟩`...), no por otros nombres (pseudo.ts:4).
  El resto lo he comprobado y es cierto: GEMINI_MODEL, variables KV/UPSTASH, teléfono +358 9 4512 3300, voz del navegador para notas sin
  audio, "la IA solo añade crisis", 33 y 19 comprobaciones, URL por defecto del recorrido, Next 16.4.6.
Arreglo propuesto (concreto): añadir `LICENSE` con el texto MIT (año 2026, "Equipo Ackerman Family"); cambiar a "Day 0 is 7 September,
  the day after Luis's last TMS session"; "The contract numbers below (0.87, 0.758, 0.62→0.70, 88 %, 5 days, 2.45, 200) are checked..."; y
  "replaced by fixed codes (one per person, 9 in total)".
```

```
RC1-11 · CSS en @layer: cambios visuales esperados en 3 sitios que conviene mirar una vez
Gravedad: baja     Evidencia: INFERIDO (las reglas son idénticas a las de antes, comprobado con un diff normalizado; lo que cambia es quién gana)
Dónde: src/app/relevo/relevo.css (todo el archivo); usos en MenteeApp/MentorApp/kit
Qué pasa: el contenido de las reglas es el mismo y lo que queda fuera de capa (`:focus-visible`, letter-spacing de h1-h3, `truncate`)
  está bien justificado frente a las reglas sin capa de globals.css. Pero ahora las utilidades ganan donde antes no lo hacían:
  `rv-btn rv-btn-ghost px-2` (2 sitios: el botón se estrecha), `rv-chip ... text-[14px]` (el chip crece) y `rv-btn-help rv-btn-sm gap-1.5`.
  Es lo que se buscaba, pero son cambios de aspecto no comprobados. Aparte: `.rv .whitespace-nowrap` fuera de capa le ganaría a un futuro
  `sm:whitespace-normal` en el mismo elemento (hoy no hay ninguno).
Arreglo propuesto (concreto): una captura de esos tres botones/chips antes de confirmar; nada que cambiar si se ven bien.
```

## Notas menores (sin ID, no bloquean)
- `demo/page.tsx`: el `<select>` "Jump to moment" es controlado por `moment?.key`, así que vuelve un instante a la opción anterior hasta que
  llega la respuesta del servidor (parpadeo breve).
- `demo/page.tsx`: el temporizador de 5 s de cada `setClock` no se limpia al desmontar (inofensivo).
- `act/route.ts`: `clinic_rhythm` exige número (`"2"` da 400). La interfaz envía número, así que está bien, solo es más estricto que `sim.ts`.
