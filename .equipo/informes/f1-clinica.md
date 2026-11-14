# F1 · Seguridad clínica y privacidad (Relevo)

Especialista: seguridad clínica y privacidad · Fase: diagnóstico (solo lectura) · Fecha: 14/11/2026
Método: lectura de `texts.ts`, `ai.ts`, `pseudo.ts`, `views.ts`, `sim.ts` (sin tocar SCRIPT), `engine.ts` (solo lectura),
rutas `/api/relevo/*`, `kit.tsx`, `MenteeApp.tsx`, `MentorApp.tsx`, `ClinicWeb.tsx`, `demo/page.tsx`, `demo.ts`, `page.tsx`;
y consultas reales a la API local (mundos propios `clin*`, sin Gemini) en 15 momentos del reloj (días 40 a 62),
más pruebas dirigidas (sin consentimiento de notas, variantes de frase de crisis, "Can't today" de Marta, pausa de Pablo,
botón de ayuda durante crisis y pausa) y una comprobación en navegador (Playwright) de la bienvenida A0.
Guiones de prueba (fuera del repo): `C:\Users\<user>\AppData\Local\Temp\claude\545cfc39a490963b\202f2361-f25d-42b2-bb0f-e0ad8f1417d8\scratchpad\probe\probe*.mjs`.

---

## Líneas rojas (poder de bloqueo)

Cualquier cambio que haga una de estas cosas queda **bloqueado** hasta que lo revise seguridad clínica:

1. **Motor y lista de crisis.** No se toca `engine.ts` (ni `CRISIS_PATTERNS`, ni `crisisFlag`, ni `candidateLevel`), ni se
   hace que la IA pueda **quitar** una crisis. La IA solo puede añadir. Ningún cambio puede hacer que una frase que hoy
   activa el nivel 3 deje de activarlo.
2. **Nada de números de salud en las apps de paciente y mentor.** Ni nivel, R, z, rasgos, "early signs", "risk", "worse",
   "relapse", ni frases sobre sueño/movilidad *derivadas de datos*. Esto vale para la pantalla **y para el JSON** de
   `/api/relevo/me` y `/api/relevo/mentor` (hoy se cumple: lo comprobé en 15 momentos).
3. **Nunca decir al mentor que está peor**, ni explícita ni implícitamente ("you've been struggling", "your data", "we noticed").
4. **Los avisos no mienten.** No se puede afirmar lo que otra persona quiere o hace si no lo ha dicho/hecho:
   "X would like to talk to you", "X would love to hear from you", "X will write to you", "the clinic is in touch" solo
   cuando sea verdad en ese momento.
5. **"Can't today" se respeta**: tras un "Can't today" no se envía al acompañado ningún texto que hable en nombre del mentor.
6. **Mensajes de crisis**: sin detalles de método, sin dramatismo, sin culpar, siempre con 112 + MIELI 09 2525 0111 + clínica
   visibles en la primera pantalla, y sin cambiar el orden (112 primero). No se añade humor, emojis ni "gamificación".
7. **La IA no aconseja clínicamente.** Gemini solo redacta propuestas de contacto entre iguales (T1) y puntúa notas (T3).
   No redacta nada para la clínica, ni para la ayuda, ni textos sobre salud, sueño, medicación o tratamiento.
8. **Consentimientos**: cada uno separado, ninguno obligatorio para usar la app, y el texto de cada uno tiene que describir
   todo lo que hace de verdad (quién procesa y para qué).
9. **No se amplían las cifras**: 88 %, 5 días y 2,45 se presentan siempre como "en 200 personas sintéticas / recaídas
   simuladas" y "prueba la lógica, no la precisión clínica". Prohibido "predice", "previene", "detecta recaídas" sin ese marco.
10. **Nada sensible en registros, URLs ni cliente equivocado**: el texto de las notas no puede ir a `console.*`, a una URL ni
    a la vista de otra persona que no sea su destinatario (o la clínica con consentimiento).

---

## Resumen de severidad

| ID | Título | Gravedad | Evidencia |
|---|---|---|---|
| C-01 | Pablo recibe la frase de crisis completa y se queda con ella | alta | VERIFICADO |
| C-02 | Sin consentimiento de notas no hay ninguna red de seguridad ante una frase de crisis | alta | VERIFICADO |
| C-03 | Nota de crisis enviada sin conexión: no se abre la ayuda | alta | INFERIDO |
| C-04 | Apóstrofo tipográfico (’) del móvil anula frases de la lista | alta | VERIFICADO |
| C-05 | Huecos de cobertura de la lista de crisis (riesgo para el pitch) | media | VERIFICADO |
| C-06 | M6 dice "The clinic team is in touch" cuando nadie ha atendido aún la alerta | alta | VERIFICADO |
| C-07 | M5 promete "Marta will write to you these days" aunque Marta dijo "Can't today" | alta | VERIFICADO |
| C-08 | V3 dice "Pablo would love to hear from you" justo después del "Can't today" de Pablo | alta | VERIFICADO |
| C-09 | "Ask Pablo to write to me" llega a Pablo durante la crisis y durante su pausa | alta | VERIFICADO |
| C-10 | La app de Luis recibe `mentor.state: "paused"` (estado de Pablo) | media | VERIFICADO |
| C-11 | M0 enseña a Pablo cómo empezó la recaída de Luis, antes de que Luis consienta | alta | VERIFICADO |
| C-12 | Texto del copiloto: "you're both sleeping" y choca con lo prometido en el consentimiento | media | VERIFICADO |
| C-13 | El consentimiento de datos es obligatorio para entrar (RGPD) | alta | VERIFICADO |
| C-14 | Los textos de consentimiento no cuentan todo lo que se hace con las notas | media | VERIFICADO |
| C-15 | La seudonimización solo cubre 9 nombres fijos; el texto promete más | media | INFERIDO |
| C-16 | Gemini como encargado de datos de categoría especial (pitch/README) | media | INFERIDO |
| C-17 | El filtro FORBIDDEN es más estrecho que el prompt; la IA puede cambiar la hora del plan | media | INFERIDO |
| C-18 | La hoja de ayuda tras la crisis no dice a Luis que su clínica ya lo sabe | media | INFERIDO |
| C-19 | En la demo pasan 37 h entre la crisis y "resolve" sin ninguna llamada registrada | media | VERIFICADO |
| C-20 | Enseñar la frase de crisis al jurado: aceptable con tres condiciones | media | VERIFICADO |
| C-21 | Cierre de cifras: falta la advertencia de circularidad, falta el 48 % y "almost never" exagera | media | VERIFICADO |
| C-22 | La portada /relevo dice que el motor y el filtro "are real" | baja | VERIFICADO |
| C-23 | API sin control por rol (clínica, audio) sin etiqueta MOCK visible | baja | VERIFICADO |
| C-24 | Registros y almacenamiento local: riesgos menores | baja | INFERIDO |
| C-25 | Teléfono y nombre de la clínica ficticios sin etiqueta | baja | INFERIDO |
| C-26 | MIELI solo en finés en una app en inglés | baja | INFERIDO |
| C-27 | "Open the note" de la clínica es solo visual y no queda en la auditoría | baja | VERIFICADO |

Recomendación de orden si hay poco tiempo: C-06, C-07, C-08, C-13, C-11, C-04, C-09, C-12, C-21, C-20 (todos S salvo C-09/C-11, M).
C-01 y C-02/C-03 son decisiones de producto en el camino de crisis: las planteo con dos opciones.

---

## Eje 1 · Lenguaje y camino de crisis

```
C-01 · Pablo recibe la frase de crisis completa y se queda con ella
Gravedad: alta     Evidencia: VERIFICADO
Dónde: src/lib/relevo/sim.ts:585-596 (la nota se entrega y luego se lanza severe), src/lib/relevo/views.ts:161 (conversations.mentee)
  Reproducir: mundo nuevo, reloj día 57 21:13 → GET /api/relevo/mentor?as=pablo → conversations.mentee.at(-1).text =
  "I can't do this anymore. Some nights I just want to die." Sigue ahí los días 58-62 (también mientras Pablo está en nivel 2).
Qué pasa y a quién afecta: el mentor, que también es paciente en mantenimiento, recibe una ideación suicida sin filtro.
  M6 le dice "You don't need to do anything else", pero la nota se puede reproducir con voz sintética (kit.tsx:196) y se
  queda en su chat para siempre. Dos días después Pablo empeora (nivel 2). Es justo el riesgo de "contagio" emocional que
  el producto dice proteger ("Protecting the mentor"). Luis, por su parte, la envió a Pablo; no podemos ocultársela en secreto.
Criterio del jurado afectado: impacto y encaje con el reto (seguridad del modelo entre iguales), ejecución.
Arreglo propuesto (opción A, recomendada; necesita OK del coordinador porque toca el camino de crisis, no el motor):
  - views.ts, en noteView/conversation para el mentor: si n.analysis?.crisis y el que mira no es el autor, devolver
    text: "" , audio: false y kind: "held". En MentorApp/VoiceNote pintar en su lugar:
    "Luis sent a note that went straight to his clinic team. They're looking after it."
  - HelpSheet de Luis, cuando se abre por una nota (ver C-18), añadir:
    "Your note went to your clinic team as well, so they can help you straight away."
  Opción B (mínima, S, si no hay tiempo): mantener la entrega y cambiar M6 (ver C-06) añadiendo la guía para iguales.
Esfuerzo: M     Riesgo de romper algo: medio (comprobar paso 6 del recorrido: M6 y alerta grave siguen igual)
```

```
C-02 · Sin consentimiento de notas no hay ninguna red de seguridad ante una frase de crisis
Gravedad: alta     Evidencia: VERIFICADO
Dónde: src/app/api/relevo/note/route.ts:33 (crisis: false si no hay consentimiento), src/lib/relevo/sim.ts:596
  Reproducir: onboard de Luis con notes:false, día 10 21:00, POST /api/relevo/note "I can't do this anymore. Some nights
  I just want to die." → respuesta crisis:false, openHelp null, 0 alertas graves, Pablo recibe la frase y no tiene M6.
Qué pasa y a quién afecta: respetar el "no" a que la clínica analice las notas es correcto, pero hoy significa que ni
  siquiera la persona que escribe ve la ayuda, y el mentor recibe la frase sin apoyo. El consentimiento es para enviar
  un análisis a la clínica, no para negar al paciente un botón de ayuda en su propio móvil.
Criterio del jurado afectado: seguridad / responsabilidad clínica.
Arreglo propuesto (no cambia el motor ni la lista; solo los usa en el móvil): en kit.tsx sendNote, antes de enviar,
  `import { crisisFlag } from "@/lib/relevo/engine"` y si crisisFlag(texto) es true, abrir la HelpSheet localmente
  (evento "relevo:help") sin enviar nada extra al servidor. Texto adicional en la hoja solo en este caso:
  "It sounds like things are really hard right now. You don't have to face this alone."
  Si el equipo decide no tocarlo: decirlo en el README ("sin el consentimiento de notas, Relevo no analiza el texto;
  la ayuda sigue a un toque con el botón Help").
Esfuerzo: S     Riesgo de romper algo: bajo (decisión del coordinador por estar en el camino de crisis)
```

```
C-03 · Nota de crisis enviada sin conexión: no se abre la ayuda
Gravedad: alta     Evidencia: INFERIDO
Dónde: src/app/relevo/kit.tsx:278-286 (si falla la red, se guarda en localStorage y devuelve { crisis: false, queued: true })
Qué pasa y a quién afecta: si Luis graba la frase sin cobertura, la app no abre la ayuda; la crisis solo se detecta
  cuando la cola se vacía (al volver la conexión), quizá horas después. No lo probé (requiere simular modo avión).
Criterio del jurado afectado: robustez del camino de crisis.
Arreglo propuesto: el mismo chequeo local de C-02 lo cubre (se ejecuta antes del fetch). Sin código extra.
Esfuerzo: S (incluido en C-02)     Riesgo de romper algo: bajo
```

```
C-04 · Apóstrofo tipográfico (’) del móvil anula frases de la lista
Gravedad: alta     Evidencia: VERIFICADO
Dónde: src/lib/relevo/engine.ts:550 (/\bdon'?t want to (be alive|live|go on)\b/ solo acepta ' recto); entrada en kit.tsx:271
  Reproducir: POST /api/relevo/note "I don’t want to live" (U+2019) → crisis:false; con ' recto → crisis:true.
Qué pasa y a quién afecta: los teclados de iPhone y muchos Android escriben ’ por defecto, y el dictado también puede.
  Una frase de la lista no salta por un carácter.
Criterio del jurado afectado: ejecución técnica del filtro (un mentor técnico lo puede probar en directo).
Arreglo propuesto (no toca el motor ni la lista; normaliza la entrada): en kit.tsx:271
  text: hideNames(n.text.replace(/[\u2018\u2019\u02BC]/g, "'"))
  y lo mismo en route.ts antes de analizar: const text = (b.text ?? "").replace(/[\u2018\u2019\u02BC]/g, "'").trim().slice(0, 1200);
Esfuerzo: S     Riesgo de romper algo: bajo (requiere OK del coordinador: camino de crisis)
```

```
C-05 · Huecos de cobertura de la lista de crisis (riesgo para el pitch, NO proponer cambios)
Gravedad: media     Evidencia: VERIFICADO
Dónde: src/lib/relevo/engine.ts:548-552 (INTOCABLE)
  Probado sin Gemini: no saltan "I don't want to be here anymore", "I'm thinking of ending it all" (la lista tiene
  "end it all", no "ending"), "I want to end my life", "Everyone would be better off without me". Sí saltan
  "I want to kill myself", "I might hurt myself tonight", "Quiero morirme", "no quiero vivir", "I WANT TO DIE".
Qué pasa y a quién afecta: con clave de Gemini, T3 puede añadir estas (solo añade); sin clave, se pierden.
Criterio del jurado afectado: credibilidad clínica si un juez prueba otra frase.
Arreglo propuesto: no tocar la lista. En pitch/README decir exactamente:
  "The crisis list in the demo is a short illustrative list. A real deployment would use a clinically validated
  phrase list reviewed by the clinic, with the AI only ever adding alerts, never removing them."
  En el ensayo, usar solo la frase del guion.
Esfuerzo: S     Riesgo de romper algo: bajo
```

```
C-06 · M6 dice "The clinic team is in touch" cuando nadie ha atendido aún la alerta
Gravedad: alta     Evidencia: VERIFICADO
Dónde: src/app/relevo/MentorApp.tsx:231
  Reproducir: día 57 21:13 → Pablo ve m6; la alerta de Luis está "new" y a las 21:27 la propia demo enseña
  "Unattended 15 min → on-call lead" (demo.ts:32).
Qué pasa y a quién afecta: el aviso afirma un contacto que no ha ocurrido (va contra "los avisos nunca mienten") y
  deja a Pablo sin la única instrucción útil para un igual que acaba de oír una ideación suicida.
Criterio del jurado afectado: honestidad del producto, seguridad del mentor.
Arreglo propuesto (texto exacto):
  "Luis's clinic team has been told and is taking it from here. You don't need to do anything else."
  y debajo, en pequeño (rv-muted):
  "If you ever think someone is in immediate danger, call 112."
  Mantener el botón "Talk to Marta".
Esfuerzo: S     Riesgo de romper algo: bajo (revisar si relevo-check o demo-walk buscan el texto antiguo: no lo encontré en scripts/)
```

```
C-07 · M5 promete "Marta will write to you these days" aunque Marta dijo "Can't today"
Gravedad: alta     Evidencia: VERIFICADO
Dónde: src/app/relevo/MentorApp.tsx:417
  Reproducir: mundo nuevo, día 60 08:59, Marta v1_answer "cant" → 10:30: Pablo no tiene V5, pero m5.mentorName="Marta"
  y la pantalla dice "Marta will write to you these days".
Qué pasa y a quién afecta: promesa en nombre de Marta que ella no hizo; si Marta no escribe, Pablo (en nivel 2) lo vive
  como abandono. Va contra las líneas rojas 4 y 5.
Criterio del jurado afectado: coherencia con la regla de "preguntar primero" que el equipo vende.
Arreglo propuesto (texto exacto, verdad en cualquier caso):
  "You can write to Marta whenever you like."
Esfuerzo: S     Riesgo de romper algo: bajo
```

```
C-08 · V3 dice "Pablo would love to hear from you" justo después del "Can't today" de Pablo
Gravedad: alta     Evidencia: VERIFICADO
Dónde: src/lib/relevo/texts.ts:89 (y su copia en src/app/relevo/ClinicWeb.tsx:437)
  Reproducir: guion normal, día 55 13:00 → Luis tiene "V3: Fancy sending Pablo a note? Pablo would love to hear from you";
  el día 54 Pablo había respondido "Can't today". El propio comentario de sim.ts:323 dice que V3 "no afirma nada del mentor".
Qué pasa y a quién afecta: Luis lee un deseo de Pablo que Pablo no ha expresado (de hecho dijo que no podía).
  Es la misma mentira que la regla prohíbe para V2, con otras palabras.
Criterio del jurado afectado: honestidad de los avisos (es uno de los puntos fuertes del pitch).
Arreglo propuesto (texto exacto):
  V3: (mentor) => `Fancy sending ${mentor} a note? A few words are enough.`
  y actualizar la misma cadena en ClinicWeb.tsx:437.
Esfuerzo: S     Riesgo de romper algo: bajo (grep: ningún script de comprobación busca esa frase)
```

```
C-09 · "Ask Pablo to write to me" llega a Pablo durante la crisis y durante su pausa
Gravedad: alta     Evidencia: VERIFICADO
Dónde: src/app/relevo/MenteeApp.tsx:188 (mentorName pasa salvo "left"), src/lib/relevo/sim.ts:647-651 (HELP se ofrece siempre)
  Reproducir: (a) día 57 21:20, Luis help {type:"mentor"} → Pablo tiene a la vez M6 ("You don't need to do anything else")
  y "Luis is asking you to write". (b) día 60 Pablo acepta la pausa; día 61 Luis pide ayuda al mentor → Pablo en pausa
  recibe "Luis is asking you to write".
Qué pasa y a quién afecta: se pone a un igual vulnerable (en pausa o en nivel 2) en papel de primera línea de crisis,
  y los dos mensajes a Pablo se contradicen.
Criterio del jurado afectado: protección del mentor.
Arreglo propuesto: en views.ts menteeView añadir `canAskMentor: !!m && !m.leftProgram && m.rhythm !== 0 && !m.tookPause &&
  !m.ideasPausedLevel && !m.ideasPausedM6` y en MenteeApp:188 pasar `mentorName={data.canAskMentor ? mName : null}`.
  Cuando no se muestra, la hoja ya ofrece 112, MIELI y la clínica. Sin texto nuevo.
Esfuerzo: M     Riesgo de romper algo: bajo
```

```
C-12 · Texto del copiloto: "you're both sleeping" y choca con lo prometido en el consentimiento
Gravedad: media     Evidencia: VERIFICADO
Dónde: src/lib/relevo/texts.ts:105-107; mostrado a Pablo el día 40 21:15
Qué pasa y a quién afecta: "about how badly you're both sleeping" atribuye a Pablo un problema de sueño (habla de su
  salud) y repite contenido de salud de Luis. Además el consentimiento "ideas" promete que el mentor "never see ... the
  analysis of my notes", y el copiloto es precisamente un resultado de ese análisis.
Criterio del jurado afectado: regla de oro (el mentor no ve salud), coherencia del consentimiento.
Arreglo propuesto (texto exacto, sin salud y sin "both"):
  text: (mentee) => `Your last few notes with ${mentee} keep going over the same ground. Try acknowledging how ${mentee} feels and suggesting something small together.`
  (el ejemplo COPILOT.example se puede quedar). Consentimiento: ver C-14.
Esfuerzo: S     Riesgo de romper algo: bajo
```

```
C-17 · El filtro FORBIDDEN es más estrecho que el prompt; la IA puede cambiar la hora del plan
Gravedad: media     Evidencia: INFERIDO (no llamé a Gemini, por norma de la sesión)
Dónde: src/lib/relevo/texts.ts:102, src/lib/relevo/ai.ts:37-41
Qué pasa y a quién afecta: el prompt prohíbe "health, sleep, data, sensors, treatment", pero el filtro solo bloquea
  diagnos/medicat/dose/relapse/depress/disorder/symptom/psychiatr. Una salida como "a walk will help your mood" o
  "after a bad night's sleep" pasaría al mentor. Además el prompt pide "same time" pero nada lo comprueba: si Gemini
  escribe "at 11" el plan de Luis dirá 10:00 (aviso que no coincide con la realidad).
Criterio del jurado afectado: la IA acotada a contacto entre iguales (línea roja 7).
Arreglo propuesto:
  export const FORBIDDEN = /\b(diagnos\w*|medicat\w*|medicine|pills?|dose|dosage|relapse\w*|depress\w*|disorder|symptom\w*|psychiatr\w*|therap\w*|treatment|tms|health\w*|sleep\w*|insomnia|mood|anxi\w*|suicid\w*|self-harm|data|sensor\w*|doctor|clinic\w*)\b/i;
  y en draftIdeaMessage, tras el filtro: si la plantilla tiene una hora (/\b\d{1,2}(:\d{2})?\b/), exigir que la salida
  contenga las mismas cifras; si no, devolver null (plantilla).
Esfuerzo: S     Riesgo de romper algo: bajo (en el peor caso se usa la plantilla, que ya funciona)
```

```
C-18 · La hoja de ayuda tras la crisis no dice a Luis que su clínica ya lo sabe
Gravedad: media     Evidencia: INFERIDO (leído; la hoja se abre sola, comprobado openHelp en la API)
Dónde: src/app/relevo/MenteeApp.tsx:344-386
Qué pasa y a quién afecta: la hoja cumple las pautas de comunicación segura (sin método, sin dramatismo, 112 primero,
  MIELI 24 h, clínica, persona de confianza; "You're not alone"). Pero cuando se abre sola por una nota, Luis no sabe
  por qué ni que su clínica ya tiene un aviso (él lo consintió): sorpresa y posible sensación de vigilancia.
Criterio del jurado afectado: transparencia, experiencia del paciente.
Arreglo propuesto: pasar a HelpSheet un `reason="note"` cuando se abre por openHelp de nota y mostrar bajo el subtítulo:
  "Your clinic team has been told about your note. If you might act on these thoughts now, call 112."
  No prometer plazo de llamada. No tocar el orden ni los botones.
Esfuerzo: S     Riesgo de romper algo: bajo (visual; dentro de lo permitido en el camino de crisis)
```

```
C-20 · Enseñar la frase de crisis al jurado: aceptable con tres condiciones
Gravedad: media     Evidencia: VERIFICADO
Dónde: SCRIPT en sim.ts:134 (INTOCABLE); se ve en el chat de Luis y de Pablo, en la ficha de la clínica tras "Open the note"
  (ClinicWeb.tsx:345) y se puede leer en voz alta con la voz del navegador (kit.tsx:196).
Opinión: la frase ("I can't do this anymore. Some nights I just want to die.") es ideación pasiva, sin método, sin plan
  ni detalles: es aceptable para demostrar el filtro y cumple las pautas de comunicación segura. Condiciones:
  1) Aviso de contenido al empezar el pitch o en la capa del momento "crisis":
     "This part of the demo includes a simulated message about suicidal thoughts."
  2) No reproducir esa nota con la voz sintética delante del jurado; enseñarla escrita.
  3) En la capa de explicación del grupo "crisis" (demo/page.tsx:336-341), una línea al pie:
     "If this topic affects you: MIELI crisis line 09 2525 0111 (24 h) · Emergency 112."
Criterio del jurado afectado: presentación responsable.
Esfuerzo: S     Riesgo de romper algo: bajo
```

## Eje 2 · Privacidad (RGPD, datos de salud = categoría especial)

Comprobado sin hallazgos (VERIFICADO, 15 momentos del día 40 al 62, incluida la crisis 57 21:13, la resolución 59 y la pausa de Pablo):
- Las respuestas de `/api/relevo/me?as=luis` y `/api/relevo/mentor?as=pablo|marta` **no** llevan las claves level, levelLabel, R, Rs, z,
  summary, features, domains, analysis, indice_queja ni datos crudos. M6 solo lleva `{ menteeName }`; M5 solo variante y nombres.
- `/api/relevo/me?as=pablo` → 403. La traza de la demo no incluye el texto de las notas. El historial de la clínica quita el texto de las notas.
- V2 a Luis solo aparece tras el "Yes" de Pablo (el recorrido lo confirma); el día 54 tras "Can't today" no hay V2.
- `console.error` en Relevo: solo `ai.ts:24`, con el mensaje del error, nunca el texto de la nota (ver C-24 para un matiz).

```
C-11 · M0 enseña a Pablo cómo empezó la recaída de Luis, antes de que Luis consienta
Gravedad: alta     Evidencia: VERIFICADO
Dónde: src/lib/relevo/views.ts:184-192 y 200 (footprintPhrase dentro de matchFor, que usa mentorView → m0)
  Reproducir: mundo nuevo, reloj día 0 08:10 → GET /api/relevo/mentor?as=pablo → m0.reasons[0] =
  "You both started out sleeping more and going out less". Luis no hace su bienvenida hasta las 18:00 (consentimientos nulos).
Qué pasa y a quién afecta: es historia clínica de Luis (cuestionario de entrada sobre su última recaída) mostrada a un
  igual, sin consentimiento y antes del primer contacto. La alternativa "Your relapses started in a similar way" también
  revela que Luis recayó. Rompe la regla de oro que el pitch repite ("Only the clinic ever sees data").
Criterio del jurado afectado: privacidad, coherencia del mensaje central.
Arreglo propuesto: dejar la frase de huella en la clínica (C4) y en la capa de explicación, pero en mentorView sustituir
  el primer motivo de m0 por:
  "Your clinic thinks you have a lot in common"
  (implementación: en views.ts:124, `m0 = proposal ? withPeerReasons(matchFor(...)) : null` reemplazando reasons[0]).
  Afinidad 87 % y el resto de motivos no cambian (no afecta a los números del contrato).
Esfuerzo: M     Riesgo de romper algo: bajo (el recorrido comprueba percent y menteeName, no el texto)
```

```
C-10 · La app de Luis recibe mentor.state: "paused" (estado de Pablo)
Gravedad: media     Evidencia: VERIFICADO
Dónde: src/lib/relevo/views.ts:70 y 98
  Reproducir: Pablo acepta la pausa el día 60 → GET /api/relevo/me?as=luis → mentor.state = "paused" (días 60-62).
Qué pasa y a quién afecta: la interfaz no lo pinta (bien), pero el dato viaja al móvil de Luis. Como la pausa se propone
  cuando Pablo llega a nivel 2, "paused" es una pista sobre la salud de Pablo. Minimización (art. 5.1.c).
Criterio del jurado afectado: privacidad por diseño.
Arreglo propuesto: en views.ts:70 dejar solo "none" | "left" | "active" (mapear "paused" a "active") y usar el booleano
  canAskMentor de C-09 para lo que haga falta. Revisar que MenteeApp no dependa de "paused" (grep: no lo usa).
Esfuerzo: S     Riesgo de romper algo: bajo
```

```
C-13 · El consentimiento de datos es obligatorio para entrar (RGPD)
Gravedad: alta     Evidencia: VERIFICADO (navegador, Playwright: "Accept and continue" disabled=true sin el primer interruptor)
Dónde: src/app/relevo/MenteeApp.tsx:568 (disabled={!c.data}); contradice MenteeApp.tsx:489 y ClinicWeb.tsx:234
Qué pasa y a quién afecta: la pantalla dice "Each one is separate" y la app dice luego "Without the first one Relevo still
  works", pero sin aceptar compartir datos de salud no se puede entrar. Un consentimiento condicionado no es libre
  (RGPD art. 7.4; art. 9.2.a para datos de salud). Un juez de privacidad lo verá al instante.
Criterio del jurado afectado: privacidad, confianza.
Arreglo propuesto: quitar `disabled={!c.data}` y cambiar la nota bajo el primer interruptor por:
  "Only needed for notices based on data"
  Si no hay datos, el sim ya lo trata ("No data consent"). La demo sigue igual (el guion hace onboard con data:true).
Esfuerzo: S     Riesgo de romper algo: bajo
```

```
C-14 · Los textos de consentimiento no cuentan todo lo que se hace con las notas
Gravedad: media     Evidencia: VERIFICADO
Dónde: src/app/relevo/MenteeApp.tsx:455-459 (CONSENT_TEXT); efectos reales en sim.ts:596 y 605 y note/route.ts:29-31
Qué pasa y a quién afecta: el consentimiento "notes" permite (1) el análisis por Gemini (un tercero, Google) y (2) el
  copiloto que da sugerencias privadas al mentor, pero el texto solo habla de "alert my clinic". El de "ideas" promete
  que el mentor no ve "the analysis of my notes", y el copiloto es eso. Información incompleta = consentimiento no informado.
Criterio del jurado afectado: privacidad, transparencia.
Arreglo propuesto (textos exactos):
  notes: "Analyse the text of my voice notes, with names removed and with the help of AI, to alert my clinic if it looks like I need urgent help, and to give my mentor private tips on how to reply"
  ideas: "Let my mentor receive ideas to accompany me, drafted with the help of AI (my mentor never sees my data)"
Esfuerzo: S     Riesgo de romper algo: bajo (texto largo: comprobar que cabe en el teléfono)
```

```
C-15 · La seudonimización solo cubre 9 nombres fijos; el texto promete más
Gravedad: media     Evidencia: INFERIDO
Dónde: src/lib/relevo/pseudo.ts:3-9, kit.tsx:271; promesa en MenteeApp.tsx:554 ("names are replaced before the text leaves it")
Qué pasa y a quién afecta: solo se cambian Luis, Pablo, Marta, Sara, Helmi, Eero, Sanna, Juho y Noora. Nombres de
  familiares, lugares o direcciones que diga alguien en una nota llegan a Gemini tal cual. Funciona para la demo, pero
  la frase de la app y del pitch es más amplia que la realidad.
Criterio del jurado afectado: honestidad técnica.
Arreglo propuesto: cambiar en MenteeApp.tsx:554 "and names are replaced" por
  "and the names of people in Relevo are replaced"
  y en el README marcar `// MOCK:` la lista fija ("en producción: detección de entidades en el móvil").
Esfuerzo: S     Riesgo de romper algo: bajo
```

```
C-16 · Gemini como encargado de datos de categoría especial (pitch/README)
Gravedad: media     Evidencia: INFERIDO (no verifiqué los términos actuales de la API de Gemini)
Dónde: src/lib/relevo/ai.ts:14-19 (T3 recibe el texto de las notas, incluida la frase de crisis)
Qué pasa y a quién afecta: aunque vayan seudonimizadas, las notas son datos de salud. En producción haría falta un
  contrato de encargado (DPA), saber si el nivel gratuito de la API puede usar el contenido para mejorar productos o
  pasar por revisión humana, y dónde se procesa. En la demo solo hay texto sintético, así que no es un problema hoy.
Criterio del jurado afectado: madurez del planteamiento de privacidad.
Arreglo propuesto: una línea en README/pitch:
  "Voice-note text is pseudonymised on the phone before any AI sees it. In production the AI provider would run under a
  data-processing agreement, on a paid tier with no training on our data, in an EU region."
Esfuerzo: S     Riesgo de romper algo: bajo
```

```
C-23 · API sin control por rol (clínica, audio) sin etiqueta MOCK visible
Gravedad: baja     Evidencia: VERIFICADO
Dónde: src/app/api/relevo/clinic/route.ts, audio/route.ts, mentor/route.ts
  Reproducir: GET /api/relevo/clinic?w=<cualquier id> → 200 con todos los datos de salud del mundo; /audio solo pide w+id.
Qué pasa y a quién afecta: es una demo con mundos aleatorios y datos sintéticos, aceptable; pero no hay inicio de sesión
  y no está escrito en ningún sitio visible.
Arreglo propuesto: comentario `// MOCK: sin autenticación; en producción, sesión por rol y la clínica tras SSO` en las
  tres rutas y una línea en el README ("Demo has no login; every world is synthetic").
Esfuerzo: S     Riesgo de romper algo: bajo
```

```
C-24 · Registros y almacenamiento local: riesgos menores
Gravedad: baja     Evidencia: INFERIDO
Dónde: src/lib/relevo/ai.ts:24; src/app/relevo/kit.tsx:282-284; src/app/api/relevo/clinic/route.ts (?person= en la URL)
Qué pasa y a quién afecta: (1) si Gemini devuelve un JSON roto, el mensaje de JSON.parse puede incluir los primeros
  caracteres de la salida del modelo (no del texto de la nota) en los registros de Vercel; (2) la cola sin conexión guarda en
  localStorage el texto seudonimizado y hasta 1,6 MB de audio en base64, sin caducidad; (3) los id de persona van en la URL
  de la clínica (registros de acceso). No encontré texto de notas en console.* ni en URLs.
Arreglo propuesto: en ai.ts registrar solo `(err as Error).name`; en la cola, no guardar `audio` (solo el texto).
Esfuerzo: S     Riesgo de romper algo: bajo
```

```
C-27 · "Open the note" de la clínica es solo visual y no queda en la auditoría
Gravedad: baja     Evidencia: VERIFICADO
Dónde: src/lib/relevo/views.ts:336 (crisisNote.text va en la respuesta de la ficha) y ClinicWeb.tsx:345
Qué pasa y a quién afecta: el texto llega al navegador de la clínica antes de pulsar; abrirlo no deja rastro en C6.
  Para la demo basta; en el pitch no decir que "abrir la nota queda registrado".
Arreglo propuesto: ninguno ahora; si sobra tiempo, act("clinic","note_open") que añada a audit
  "Opened Luis's crisis note".
Esfuerzo: M     Riesgo de romper algo: bajo
```

## Eje 3 · Honestidad clínica

```
C-19 · En la demo pasan 37 h entre la crisis y "resolve" sin ninguna llamada registrada
Gravedad: media     Evidencia: VERIFICADO
Dónde: SCRIPT sim.ts:134-135 (INTOCABLE); ficha de Luis en /api/relevo/clinic?person=luis: "Level 3 · crisis phrase" (mar 21:12)
  → siguiente entrada "Alert resolved by the clinic" (jue 10:00); calls sin llamada entre medias.
Qué pasa y a quién afecta: un juez clínico puede leer que la clínica "resolvió" una ideación suicida sin hablar con el paciente.
Criterio del jurado afectado: credibilidad clínica del protocolo.
Arreglo propuesto (sin tocar SCRIPT): en el momento "forward" o "crisis", quien presenta pulsa "Call now" en la ficha de
  Luis; y en la capa del grupo "crisis" (demo/page.tsx:338) añadir:
  "Next step for the clinic: call Luis now. Only the clinic can close a level 3."
Esfuerzo: S     Riesgo de romper algo: bajo (comprobar que la llamada del presentador no descarta eventos futuros: punto frágil
  conocido "mover el reloj atrás y actuar descarta lo futuro"; hacerlo en el orden del reloj)
```

```
C-21 · Cierre de cifras: falta la advertencia de circularidad, falta el 48 % y "almost never" exagera
Gravedad: media     Evidencia: VERIFICADO
Dónde: src/app/relevo/demo/page.tsx:397-401; datos en src/lib/relevo/demo.ts:121
Qué pasa y a quién afecta: el cierre ya dice "200 synthetic people, 100 simulated relapses" y "This tests the logic, not
  clinical accuracy" (bien). Pero: (1) el dato sintético lo genera el mismo equipo con los patrones que el motor busca,
  así que el 88 % comprueba que el motor hace lo que se diseñó, no que acierte con personas reales; (2) se enseña la tasa de
  falsas alarmas de nivel 2 (0,5) pero no su sensibilidad (48 %, 1 día), lo que hace parecer el nivel 2 mejor de lo que es;
  (3) "expensive ones almost never reach the clinic": 0,5 por persona y año son unas 100 llamadas al año para 200 pacientes.
Criterio del jurado afectado: honestidad, rigor.
Arreglo propuesto (texto exacto para la línea 397):
  `${e.people} synthetic people we generated, ${e.relapses} simulated relapses, default thresholds. This checks that the logic works as designed, not that it predicts relapse in real patients.`
  y la línea 401:
  `Level 2 is much stricter: it catches ${Math.round(e.l2.sensitivity * 100)}% with a median of ${e.l2.lead} day's notice, and gives ${e.l2.fa} false alarms per person per year. Cheap false alarms (a walk) go to the mentor; costly ones reach the clinic far less often. Real-world accuracy would need a clinical study.`
Esfuerzo: S     Riesgo de romper algo: bajo (el recorrido comprueba 88 / 5 / 2,45 desde la API, no el texto)
```

```
C-22 · La portada /relevo dice que el motor y el filtro "are real"
Gravedad: baja     Evidencia: VERIFICADO
Dónde: src/app/relevo/page.tsx:27
Qué pasa y a quién afecta: "real" se puede leer como "validado". No encontré ninguna promesa de prevenir o tratar
  (la bienvenida ya dice "It doesn't replace your treatment"), pero falta decirlo en la portada que ve el jurado.
Arreglo propuesto (texto exacto):
  "Sensor data in this demo is simulated. Voice notes, transcription, the copilot, the crisis filter, the risk engine, notices and learning are working code, not clinically validated. Relevo doesn't diagnose, treat or replace emergency services."
Esfuerzo: S     Riesgo de romper algo: bajo
```

```
C-25 · Teléfono y nombre de la clínica ficticios sin etiqueta
Gravedad: baja     Evidencia: INFERIDO
Dónde: src/lib/relevo/views.ts:106 ("Aalto TMS Clinic", "+358 9 4512 3300"), MentorApp.tsx:156
Qué pasa y a quién afecta: el número tiene formato de teléfono fijo real de Helsinki y está en un enlace; si alguien lo
  pulsa, podría llamar a un tercero. El nombre puede sugerir una clínica real de Aalto.
Arreglo propuesto: marcar `// MOCK: clínica y teléfono ficticios` y cambiar a un número claramente ficticio sin enlace
  tel:, o mostrar "Clinic +358 9 4512 3300 (demo)".
Esfuerzo: S     Riesgo de romper algo: bajo
```

```
C-26 · MIELI solo en finés en una app en inglés
Gravedad: baja     Evidencia: INFERIDO
Dónde: src/app/relevo/MenteeApp.tsx:353-356
Qué pasa y a quién afecta: el número 09 2525 0111 y "24 h, in Finnish" son correctos según lo que sé, pero la app está en
  inglés y el jurado es internacional. MIELI tiene, creo, atención en otros idiomas con otro número y horario: no lo afirmo.
Arreglo propuesto: comprobarlo en mieli.fi (pedidlo a un mentor o miradlo vosotros) antes de añadir nada; no inventar números.
Esfuerzo: S     Riesgo de romper algo: bajo
```

---

## Lo que no pude comprobar (distinto de "no encontré nada")

- Las salidas reales de Gemini (T1/T3): no lo llamé, por norma de la sesión. C-17 es por lectura.
- La cola sin conexión (C-03) y el dictado real con apóstrofo tipográfico desde un iPhone: probé el carácter por la API, no el teclado.
- La versión desplegada en Vercel: todo es en local (memoria, sin Upstash).
- Los términos actuales de la API de Gemini y los servicios de MIELI en otros idiomas (C-16, C-26).
- Lo que se ve en pantalla en cada momento de la demo: revisé el JSON y el código; en el navegador solo la bienvenida A0.
