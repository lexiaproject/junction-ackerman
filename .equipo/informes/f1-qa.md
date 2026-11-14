# F1 · QA y pruebas · Relevo (fase de diagnóstico)

Autor: agente de QA · Fecha: 14/11/2026 · Servidor: http://localhost:3000 (sin clave de Gemini, memoria local, sin Upstash)
Alcance: solo lectura. No se ha editado nada del repositorio salvo este informe. Scripts de prueba en
`C:\Users\<user>\AppData\Local\Temp\claude\545cfc39a490963b\202f2361-f25d-42b2-bb0f-e0ad8f1417d8\scratchpad\qa\`
(`hostile.mjs`, `scenarios.mjs`, `stack.mjs`, `resolve.mjs`, `resolve57.mjs`, `walk-w.mjs`, `walk-noluis.mjs`).
Todos los mundos usados son aleatorios con prefijo `qa…` (ninguno compartido con otros agentes).

## 1. Línea base (resultado exacto)

| Prueba | Resultado |
|---|---|
| `node scripts/relevo-check.mjs` | 33 OK, 0 FAIL. Última línea: "Todo coincide con el motor de referencia y con la lista de aceptación" (más un aviso `MODULE_TYPELESS_PACKAGE_JSON` de Node, inofensivo) |
| `node scripts/relevo-demo-walk.mjs` | 19/19 OK. "Recorrido de la demo completo: los 8 pasos y los números del contrato coinciden" |
| `npx tsc --noEmit -p .` | sin salida, código de salida 0 |
| `npx eslint src/app/relevo src/lib/relevo src/app/api/relevo` | sin salida, código de salida 0 |

Al terminar todas las pruebas hostiles se volvieron a ejecutar: recorrido 19/19 y comprobación 33/33. Nada de lo
probado rompe otros mundos: los fallos se quedan en el mundo atacado.

## 2. Resumen de lo probado

- ~90 entradas hostiles contra `/act`, `/note`, `/me`, `/mentor`, `/clinic`, `/demo`, `/audio` (`hostile.mjs`). Tras cada una
  se piden las 5 vistas del mismo mundo para ver si el mundo sigue sano.
- 10 escenarios de flujo (`scenarios.mjs`): doble clic, reloj atrás, reset a mitad, crisis con y sin consentimiento,
  peticiones simultáneas, 400 eventos, regla de serialización, recorrido completo tras entradas raras.
- Paso 3 de la demo hecho de verdad en el navegador (MCP playwright) sobre un mundo propio.

Lo que funciona bien (VERIFICADO, sin hallazgo):
- Permisos por rol: luis haciendo `call`/`config`, pablo haciendo `resolve`, sara actuando → 403. `/me?as=pablo`, `/mentor?as=luis` → 403.
- Notas solo a la pareja: pablo→sara, pablo→pablo, luis sin `to`, `to` objeto → 403. pablo→marta (su mentora) → 200, correcto.
- `w` inválido (corto, con espacios, `../../x`) → 400. Cuerpo vacío o JSON roto → 400.
- Reloj: NaN/"abc"/sin `p` → 400; negativo → 0; 1e308 → fin de la demo. Ningún valor del reloj rompe nada.
- `cardId`/`planId`/`noticeId`/`alertId`/copiloto inexistentes → 200 y se ignoran sin romper el mundo.
- Doble "Yes", doble "I'm in", doble "Good" (también simultáneos) → el paseo queda en 0,70 exacto; "Another day" dos veces no penaliza dos veces (0,62 → 0,50 una vez).
- Reloj atrás + acción + recorrido completo después → PASA. Reset el día 48 (conserva la hora) + recorrido → PASA.
- 10 acciones simultáneas en local → 10 de 10 guardadas (en local; en producción ver Q-07).
- 400 eventos en un mundo → `/clinic` responde en 53 ms (frente a 44 ms en limpio).
- Regla de oro: en 6 momentos de la demo, las vistas de Luis, Pablo y Marta no contienen claves `level`, `Rs`, `R`, `z`, `indice_queja`, `analysis`… (ninguna encontrada).
- Entradas raras pero no venenosas (consentimiento con clave falsa, ritmo 99, pesos "abc", nota de 5000 caracteres, duración "abc") + recorrido → PASA.

Lo que NO pude comprobar:
- Nada con Gemini (prohibido llamarlo): ni el borrador T1 de `/mentor`, ni el análisis T3 de `/note`, ni sus tiempos.
- Nada contra Upstash/producción: carreras reales entre peticiones y límites de tamaño (Q-07, Q-10 son INFERIDOS).
- Grabación de voz real (micrófono, MediaRecorder, Web Speech).

## 3. Hallazgos

```
Q-01 · Un evento mal formado "envenena" el mundo: todas las vistas dan 500 para siempre
Gravedad: alta     Evidencia: VERIFICADO
Dónde: src/app/api/relevo/act/route.ts:11 y :71 (se guarda `p` sin validar) → se re-ejecuta en cada lectura en
       src/lib/relevo/sim.ts:762-764 (bucle de eventos de usuario, sin try/catch). Fallos concretos (stack.mjs):
       - p = null en cualquier acción de persona → sim.ts:469 "Cannot read properties of null"
       - clinic call {mode:"schedule"} sin person → sim.ts:682 (P[undefined].level)
       - clinic call {person:"luis", mode:"schedule", at:"x"} → people.ts:82 "Invalid time value" (fecha NaN)
       - clinic ideas_pause / ideas_reactivate sin mentor o con mentor inexistente → sim.ts:727
       - clinic clinic_rhythm sin mentor → sim.ts:734
       - clinic match_propose {} o con mentor "zzz" → sim.ts:474
Pasos para reproducir:
  curl -s -XPOST localhost:3000/api/relevo/act -H "Content-Type: application/json" \
    -d '{"w":"qaveneno01","as":"clinic","type":"ideas_pause","p":{}}'        # responde {"ok":true}
  curl -s -o /dev/null -w "%{http_code}\n" "localhost:3000/api/relevo/demo?w=qaveneno01"   # 500
  (igual /me, /mentor?as=pablo, /mentor?as=marta, /clinic → 500)
  Variante: -d '{"w":"qaveneno02","as":"luis","type":"consent","p":null}'
Qué pasa y a quién afecta: la petición se acepta con 200, pero el evento queda guardado y revienta la simulación en
  cada lectura. En el navegador, /relevo/demo?w=<ese mundo> se queda para siempre en "Loading the demo…" (comprobado
  con playwright) y el menú "More → Reset" no aparece porque la página no llega a pintarse. Solo se arregla con
  POST {as:"demo",type:"reset"} a mano (comprobado: tras el reset vuelve a 200) o cambiando de mundo. La interfaz
  actual siempre manda datos correctos, así que hoy solo pasa con peticiones hechas a mano; pero cualquier error futuro
  de la interfaz, o cualquiera que tenga el enlace ?w= del jurado, puede dejar la demo en blanco.
Criterio del jurado afectado: ejecución técnica (robustez); presentación si ocurre en directo.
Arreglo propuesto (concreto), dos capas:
  1) Red de seguridad en sim.ts:762-764 (fuera de SCRIPT y BANDIT_SALT):
     push(e.t, 6 + e.seq / 1e6, () => { try { if (!act(e, false)) trace(e.t, e.by, `(${e.type} ignored: no longer applicable)`); }
       catch { trace(e.t, e.by, `(${e.type} ignored: invalid data)`); } });
  2) Validar en act/route.ts antes de addEvent: `const p = body.p && typeof body.p === "object" && !Array.isArray(body.p) ? body.p : {}`;
     para acciones de clínica exigir PERSON[p.person|p.mentor|p.mentee] cuando se usan, y Number.isFinite(Number(p.at)) en
     call/schedule; si no, bad(..., 400).
Esfuerzo: S     Riesgo de romper algo: bajo (la capa 1 solo actúa cuando ya habría un 500)
```

```
Q-02 · Si la clínica resuelve la crisis el mismo día, Luis se queda en nivel 3 para siempre
Gravedad: alta     Evidencia: VERIFICADO
Dónde: src/lib/relevo/sim.ts:702-722 (case "resolve") + comportamiento del motor en src/lib/relevo/engine.ts:313-315
       (el mismo día se llama a clinicResolve() y después step(cand=4) vuelve a poner la crisis y el bloqueo).
Pasos para reproducir (scratchpad/qa/resolve57.mjs):
  1. POST /act {w, as:"demo", type:"clock", p:{to: 57*1440+21*60+13}}   → crisis del guion (21:12)
  2. GET /clinic?w=… → coger el id de la alerta grave de Luis (p. ej. "alert:luis:83352")
  3. POST /act {w, as:"clinic", type:"clock"…} a 57 21:30 y POST /act {w, as:"clinic", type:"resolve", p:{alertId}}
  Resultado: alerta "resolved", ayuda de Luis cerrada, pero nivel de Luis = 3 y contador "severe" = 1 en los días 57,
  58, 59 y 62; M6 de Pablo sigue activo. El "resolve" del guion del día 59 se salta (ya no hay alerta abierta), así que
  el momento "Clinic resolves → back to what data say" ya no ocurre. Lo mismo con una nota de crisis escrita a mano
  el día 50 y resuelta el día 50 (resolve.mjs).
Qué pasa y a quién afecta: quien presenta, en la web de la clínica, ve la alerta grave con el botón "Resolve" justo en
  el momento de la crisis; pulsarlo es lo natural y deja la demo en un estado incoherente (alerta resuelta, persona
  en nivel 3 sin alerta) hasta el final. Para la clínica real: no hay forma de cerrar una crisis el mismo día.
Criterio del jurado afectado: impacto y encaje (seguridad clínica), ejecución técnica, presentación.
Arreglo propuesto (concreto), en sim.ts (no en el motor). Camino de crisis = zona de máximo cuidado: decide el Director.
  Opción A (mínima): en case "resolve", antes de `engineRun`, `if (s.crisisDays.has(dateOf(day))) s.crisisDays.delete(dateOf(day));`
  (la crisis sigue registrada en la alerta y en el historial; el motor deja de ver "crisis hoy").
  Opción B: registrar la resolución para el día siguiente (`dateOf(day + 1)`): sigue en nivel 3 hasta las 03:15.
  Añadir a relevo-check.mjs: "crisis y resolución el mismo día → nivel según datos".
Esfuerzo: S     Riesgo de romper algo: medio (camino de crisis; comprobar 33/33 y 19/19 después)
```

```
Q-03 · Si en la bienvenida (A0) no se marcan los consentimientos, la demo se rompe desde el paso 2
Gravedad: alta     Evidencia: VERIFICADO
Dónde: src/app/relevo/MenteeApp.tsx:498 (los tres interruptores empiezan apagados, correcto por privacidad) +
       el guion solo hace su "onboard" con todo encendido si Luis no lo ha hecho ese día (sim.ts, regla "userDid").
Pasos para reproducir:
  POST /act {w:"qaonbXXXX", as:"demo", type:"clock", p:{to:1080}}
  POST /act {w:"qaonbXXXX", as:"luis", type:"onboard", p:{data:false,notes:false,ideas:false}}
  node scratchpad/qa/walk-w.mjs http://localhost:3000 qaonbXXXX   → 12 pasos fallan (2, 3, 4, 5 y 6)
  Con {data:true,notes:false,ideas:true} → fallan 2 (copiloto) y 6 (crisis).
Qué pasa y a quién afecta: el teléfono de Luis muestra la bienvenida desde el primer momento (día 0). Si quien
  presenta la recorre en directo y pulsa "continuar" sin activar los tres interruptores, Relevo deja de detectar nada
  y la historia entera desaparece. El sistema hace lo correcto (respeta el "no"), pero nada avisa al presentador.
Criterio del jurado afectado: presentación (riesgo en directo).
Arreglo propuesto (concreto): no cambiar los valores por defecto (privacidad). En la capa de explicación del momento
  "welcome" (src/lib/relevo/demo.ts), una línea: "For the demo, turn on all three". Y en /relevo/demo, si
  `luis.consents` no coincide con el guion, una franja: "Luis turned off X: detection is off · Reset" (el reset ya existe).
Esfuerzo: S     Riesgo de romper algo: bajo
```

```
Q-04 · Con "Notes analysis" apagado, una frase de crisis no abre ayuda ni avisa a nadie (decisión de producto)
Gravedad: media     Evidencia: VERIFICADO
Dónde: src/app/api/relevo/note/route.ts:29-33 (sin consentimiento, crisis:false) y src/lib/relevo/sim.ts:596
       (`analysis.crisis && P[by].consents.notes`).
Pasos para reproducir (scenarios.mjs, S6):
  POST /act {w, as:"demo", type:"clock", p:{to: 50*1440+600}}
  POST /act {w, as:"luis", type:"consent", p:{key:"notes", on:false}}
  POST /note {w, as:"luis", to:"pablo", text:"I want to kill myself tonight", duration:5}
  → {"crisis":false}; Luis sin hoja de ayuda, Pablo sin M6, clínica 0 graves. Control con consentimiento: crisis
  true, ayuda, M6 y 1 grave. También el guion del día 57 con "notes" apagado: nada.
Qué pasa y a quién afecta: el texto del consentimiento dice "analizar mis notas para avisar a mi clínica", así que no
  avisar a la clínica es coherente. Pero Pablo escucha "I want to die" sin la guía M6, y Luis no ve la ayuda (A3),
  que no envía ningún dato. Un jurado clínico puede preguntar justo esto.
Criterio del jurado afectado: impacto y encaje (seguridad), ética/privacidad.
Arreglo propuesto (concreto), zona de crisis, decide el Director: si `crisisFlag(text)` y el consentimiento está
  apagado, devolver `crisis:true` solo al teléfono de quien envía para abrir A3 en local (sin alerta a la clínica) y,
  opcionalmente, mostrar a la pareja la guía genérica "If a note worries you" con el 112. Si no se cambia, preparar
  la respuesta para el pitch ("respetamos el no; la ayuda está siempre en el botón Help").
Esfuerzo: M     Riesgo de romper algo: medio
```

```
Q-05 · La lista fija de crisis no detecta frases pasivas frecuentes
Gravedad: media     Evidencia: VERIFICADO
Dónde: src/lib/relevo/engine.ts:548-552 (CRISIS_PATTERNS, INTOCABLE)
Pasos para reproducir: POST /note {w, as:"luis", to:"pablo", text:"i dont want to be here anymore"} → "crisis":false.
  "I want to d i e" → false. Sí detecta: "I'm going to end it all", "Quiero morirme", "i want to die", "suicide".
Qué pasa y a quién afecta: sin Gemini (el respaldo), "don't want to be here anymore", una forma muy habitual de
  ideación pasiva, no salta. Con Gemini puede que sí (no comprobado).
Criterio del jurado afectado: impacto/seguridad clínica.
Arreglo propuesto (concreto): el motor es intocable. Si el Director lo autoriza, una lista adicional SOLO para añadir
  (nunca quitar) en note/route.ts: `/\bdon'?t want to be here\b/, /\bno quiero estar aquí\b/, /\bbetter off without me\b/`
  combinada con OR sobre `crisisFlag`. Si no, mencionarlo como límite conocido en el README ("la IA solo puede añadir").
Esfuerzo: S     Riesgo de romper algo: medio (zona de crisis)
```

```
Q-06 · El recorrido de la demo pasa aunque los botones de las personas no hagan nada
Gravedad: media     Evidencia: VERIFICADO
Dónde: scripts/relevo-demo-walk.mjs (pasos 4 y 5) y SCRIPT en src/lib/relevo/sim.ts:105-137
Pasos para reproducir: scratchpad/qa/walk-noluis.mjs es el recorrido sin `act("luis","plan")`, sin
  `act("luis","plan_feedback")` y sin `act("pablo","v1_answer",{choice:"cant"})` → sigue dando 19/19.
Qué pasa y a quién afecta: el guion hace esas mismas acciones a su hora (47 11:20, 48 11:30, 54 09:10), así que el
  recorrido no detectaría que "I'm in", "Good" o "Can't today" dejaran de funcionar. Además el recorrido no mira la
  respuesta de `act` (podría ser 400/403 y no se nota). Y a las 48 11:30 `luis.plan` ya es null (el guion ya dio
  "Good"), por lo que el `planId` que manda el recorrido es `undefined`, distinto de lo que manda la interfaz.
Criterio del jurado afectado: ejecución técnica (la puerta de cada commit es menos fuerte de lo que parece).
Arreglo propuesto (concreto): en el recorrido, hacer las acciones de usuario ANTES de la hora del guion (p. ej.
  "I'm in" a las 47 09:30 y "Good" a las 48 10:30, cuando `luis.plan.askFeedback === true`), comprobar `ok === true` en
  cada `act`, y comprobar en `/demo` que la traza tiene la acción con `scripted:false`.
Esfuerzo: S     Riesgo de romper algo: bajo (solo toca el script de prueba)
```

```
Q-07 · En producción, dos peticiones a la vez pueden pisarse (se pierde una acción o el movimiento del reloj)
Gravedad: media     Evidencia: INFERIDO (en local no se reproduce: S7 guardó 10 de 10)
Dónde: patrón loadWorld → … → saveWorld sin bloqueo en act/route.ts, note/route.ts (con `await analyseNote` de hasta
       10 s entre medias, ai.ts:9) y mentor/route.ts:16-27 (un GET que espera a Gemini y luego guarda el mundo entero).
Qué pasa y a quién afecta: con Upstash, si mientras /mentor espera el borrador de Gemini (≈2 s) el presentador pulsa
  "Next moment" o Luis responde, el GET guarda el mundo viejo encima y esa acción desaparece (el reloj "salta atrás").
  Pasa justo en el paso 3 (aparece la idea del paseo → se pide el borrador). Los dos teléfonos de la demo sondean
  /mentor cada 4 s, así que también puede pedirse el borrador dos veces.
Criterio del jurado afectado: presentación (rarezas en directo), ejecución técnica.
Arreglo propuesto (concreto): en mentor/route.ts, tras recibir el borrador, volver a cargar el mundo y guardar solo
  `fresh.ai[key] = …` (`const fresh = await loadWorld(w); fresh.ai[key] = revealNames(draft); await saveWorld(w, fresh)`).
  Lo mismo en note/route.ts: hacer el análisis antes de `loadWorld` o recargar tras el `await`. Verificar con la clave
  de Gemini una sola vez.
Esfuerzo: S     Riesgo de romper algo: bajo
```

```
Q-08 · Errores 500 (sin daño persistente) con entradas raras
Gravedad: baja     Evidencia: VERIFICADO
Dónde y cómo reproducir:
  - Cuerpo "null": curl -XPOST localhost:3000/api/relevo/act -H "Content-Type: application/json" -d 'null' → 500
    (también /note). act/route.ts:11 y note/route.ts:13 desestructuran null.
  - as = "__proto__", "constructor" o "toString": -d '{"w":"qaproto0001","as":"constructor","type":"x"}' → 500.
    act/route.ts:70: `ALLOWED[as]` encuentra propiedades heredadas de Object y `.includes` no existe.
  - {as:"demo", type:"clock", p:null} → 500 (route.ts:18). {as:"clinic", type:"config", p:null} → 500 (route.ts:33).
  - /note con text numérico: -d '{"w":"qatext0001","as":"pablo","to":"clinic","text":12345}' → 500 (note/route.ts:17, `.trim` de un número).
  - GET /api/relevo/clinic?w=qaxxxx01&person=__proto__ (o constructor) → 500 (clinic/route.ts:14, PERSON[person] heredado).
Qué pasa y a quién afecta: solo la petición falla; el mundo sigue sano. Nadie lo ve en la demo normal.
Criterio del jurado afectado: ejecución técnica (si un jurado técnico "toca" la API).
Arreglo propuesto (concreto): `const body = ((await req.json().catch(() => null)) ?? {})` y comprobar `typeof body === "object"`;
  usar `Object.hasOwn(ALLOWED, as)` y `Object.hasOwn(PERSON, person)`; `typeof b.text === "string" ? b.text : ""`.
Esfuerzo: S     Riesgo de romper algo: bajo
```

```
Q-09 · Doble envío de la nota crea dos notas iguales para Luis
Gravedad: baja     Evidencia: VERIFICADO
Dónde: src/app/api/relevo/note/route.ts (sin control de repetición)
Pasos para reproducir: tras "Yes" a las 47 08:30, enviar dos veces el mismo POST /note {as:"pablo", to:"luis", text:<card.message>, cardId:<card.id>}
  → ids ev2 y ev3; plan y tarjeta del bandido solo una vez (bien), pero dos notas en la conversación.
Qué pasa y a quién afecta: un doble toque o la cola sin conexión (kit.tsx:298, reenvía al volver) puede duplicar una
  nota. La grabadora tiene estado "sending", así que en la interfaz es poco probable.
Criterio del jurado afectado: experiencia.
Arreglo propuesto (concreto): ignorar una nota si la última del mismo remitente al mismo destinatario tiene el mismo
  texto y el mismo minuto de reloj (responder ok con el id existente).
Esfuerzo: S     Riesgo de romper algo: bajo
```

```
Q-10 · No hay límite de tamaño en /act: un `p` de 5 MB se guarda en el mundo
Gravedad: baja     Evidencia: VERIFICADO en local (200, el mundo pasa a ~5 MB); INFERIDO en producción
Dónde: src/app/api/relevo/act/route.ts:10 (en /note el texto se corta a 1200 y el audio a 1,6 MB; en /act nada)
Pasos para reproducir: POST /act {w, as:"luis", type:"request", p:{kind:"download", junk:"x".repeat(5e6)}} → 200.
Qué pasa y a quién afecta: en producción, con Upstash, guardar un mundo tan grande probablemente falle (límite de
  tamaño por petición) y cada lectura mueve megas. Solo con peticiones hechas a mano.
Arreglo propuesto (concreto): rechazar si `JSON.stringify(p).length > 4000` → bad("Too big", 413).
Esfuerzo: S     Riesgo de romper algo: bajo
```

```
Q-11 · Cualquiera con el id del mundo puede actuar como clínica o como cualquier persona
Gravedad: baja (es una demo)     Evidencia: VERIFICADO
Dónde: src/lib/relevo/server.ts:11-17 (ALLOWED decide por el campo `as` que manda el cliente)
Qué pasa y a quién afecta: el servidor comprueba qué puede hacer cada rol, pero no quién es quien llama. Aceptable en
  una demo sin cuentas; si el jurado pregunta, decir "en producción el rol viene de la sesión, no del cuerpo".
Arreglo propuesto: ninguno ahora; una línea `// MOCK:` en server.ts y una frase en el README.
Esfuerzo: S     Riesgo de romper algo: bajo
```

```
Q-12 · "Another day" y después "I'm in" sobre el mismo plan se acepta (el bandido ya penalizó)
Gravedad: baja     Evidencia: VERIFICADO
Dónde: src/lib/relevo/sim.ts:617-627 (case "plan": un usuario puede cambiar la respuesta sin límite)
Pasos: plan propuesto → "other_day" (paseo 0,62 → 0,50) → "in" → estado "accepted", paseo sigue 0,50.
Qué pasa: cambiar de opinión está bien, pero el aprendizaje no se deshace. Invisible en la demo.
Arreglo propuesto: dejarlo y documentarlo, o no permitir responder si `plan.respondedAt` ya existe salvo "in" desde "other_day".
Esfuerzo: S     Riesgo de romper algo: bajo
```

## 4. Prueba de interfaz (navegador) del paso 3 y huecos del recorrido

### 4.1 El paso 3 en el navegador: comprobado a mano, falta convertirlo en prueba
Hecho con el MCP playwright sobre el mundo `qauistep3abc` (VERIFICADO):
1. Reloj a 47 08:30 por API: `POST /act {w, as:"demo", type:"clock", p:{to:68190}}`.
2. Abrir `http://localhost:3000/relevo/demo?w=qauistep3abc` (ventana 1600×1000; los teléfonos salen escalados a 0,52).
3. Pulsar `[aria-label="pablo's phone"] >> role=button[name="Yes"]` (hay un solo botón "Yes" en la página).
4. En ≈2 s aparece "Pablo would like to talk to you" dentro de `[aria-label="Luis's phone"]`, y en el teléfono de
   Pablo "Suggest a walk tomorrow morning" con "Send as voice note / Another idea / Not now". Consola sin errores.

Qué falta para que sea una prueba automática de verdad:
- **Playwright no está en el proyecto** (`package.json` no lo tiene). Hace falta `npm i -D @playwright/test` y
  `npx playwright install chromium`, o un script `.mjs` que use el MCP. No se instaló nada por ser fase de solo lectura.
- **Mundo propio y reloj por API** antes de abrir la página (`?w=` también lo guarda en localStorage, así que cada
  prueba debe usar un contexto de navegador limpio o un `w` nuevo).
- **Buscar dentro de cada teléfono**, nunca en toda la página: "Pablo would like to talk to you" aparece 2 veces
  (teléfono de Luis y otra zona, como la capa de explicación). Los selectores estables que existen: `aria-label`
  `Luis's phone` y `pablo's phone` / `marta's phone` (en minúscula: sale del id; conviene usar el nombre con
  mayúscula para que el lector de pantalla diga bien "Pablo's phone"). No hay `data-testid`.
- **Esperas**: la vista se recarga tras cada acción (evento `relevo:changed`) y cada 4-5 s; usar `waitFor` de texto
  con un límite de 10 s, no pausas fijas.
- **Sin Gemini**: comprobar el título de la idea (fijo) y no el texto del mensaje (cambia con Gemini).
- **Tamaño de ventana fijo**: `Fit` escala por columna; en pantallas bajas la capa de explicación quita alto.
  Fijar 1600×1000 o más para que los botones no queden fuera.
- Para el paso 4 por interfaz habría que pulsar "Send as voice note" y pasar por la grabadora: con micrófono falso
  (`--use-fake-device-for-media-stream`) o usando la alternativa escrita ("Type what you said").

### 4.2 Casos críticos que `relevo-demo-walk.mjs` no cubre
1. Que las acciones de las personas funcionen de verdad (Q-06): el guion las hace igual y el recorrido no mira las respuestas.
2. Crisis y resolución el mismo día (Q-02), y "Resolve" pulsado desde la clínica en vez del guion.
3. Bienvenida A0 hecha por el presentador con los consentimientos apagados (Q-03).
4. Nota de crisis enviada por `/note` (la del recorrido es la del guion; nunca pasa por el filtro de la ruta), y con el
   consentimiento apagado (Q-04).
5. La tercera nota del copiloto grabada por quien presenta (paso 2: el recorrido usa la del guion).
6. Regla de oro (nada de nivel/R/z/análisis en las vistas de Luis y Pablo): no se comprueba en el recorrido (yo la
   comprobé en S9: limpia). Conviene añadirla como prueba fija.
7. Robustez: un evento malo que deja el mundo en 500 (Q-01), reloj hacia atrás + acción, reset a mitad (estos dos
   pasan, pero no están en la puerta).
8. Que la idea del paseo sea el texto de Gemini cuando hay clave (solo se prueba el respaldo).
9. "Another idea" / "Not now" en la tarjeta de Pablo, "Change the time", V7 ("I need help") y el botón Help de Luis.

## 5. Notas
- Para el paso 3 en el navegador usé una pestaña del contexto aislado "juez" del MCP playwright (era el único
  disponible). Al abrir `?w=` se cambia el mundo guardado en ese navegador; al terminar volví a abrir
  `?w=dzn7k3q9w2` (el mundo que tenía la otra pestaña) para dejarlo como estaba. Si el Juez ve un mundo distinto al
  esperado, la causa es esta.
- El MCP playwright ha dejado archivos en `.claude/.playwright-mcp/` (sin seguimiento en git). No los he borrado.
- `git status` muestra `.equipo/ESTADO.md` y `.equipo/REGISTRO.md` modificados: no los he tocado yo.
