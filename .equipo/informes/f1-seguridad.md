# F1 · Seguridad (diagnóstico, solo lectura)

Fecha: 14/11/2026 · Rama `sesion-autonoma` (18 commits, todas las ramas revisadas) · Guía: OWASP Top 10 (2025).
Pruebas dinámicas contra `http://localhost:3000` (sin clave de Gemini) con mundos aleatorios `sec…`. En producción solo
un GET de cabeceras a `/relevo/demo`. `.env.local` no se ha abierto.

## Resumen

- **No hay secretos reales en el repositorio ni en el historial.** Busqué AIza…, sk-…, sk-ant, ghp_, hf_, xox, claves PEM,
  URLs `*.upstash.io`, `KV_REST_API_TOKEN=`, `UPSTASH_*=`, `Bearer <cadena larga>` en `git log --all -p` y en
  `git grep` de todas las revisiones: 0 coincidencias. `.env*` está en `.gitignore` desde el primer commit; el único archivo
  env versionado es `.env.example` (sin valores). Lo que sí sale es la contraseña de demo `relay-demo` de Relay (la antigua),
  que es pública a propósito (está escrita en la página de login). No hace falta rotar nada.
- `npm audit --omit=dev`: **0 vulnerabilidades** (next 16.4.6, react 19.3.0).
- El hallazgo importante es **S-01: el endpoint de audio sirve lo que le mandes con el tipo que le digas** → se puede colgar
  una página HTML con JavaScript en el dominio de la app (XSS almacenado). VERIFICADO.
- El riesgo más probable en directo es **S-02: cualquiera que vea el id del mundo del presentador puede moverle el reloj,
  reiniciarlo o mandar una nota de crisis como Luis**. Es una demo sin login, así que es esperable, pero hay que protegerse
  en el pitch.

| ID | Título | Gravedad | Evidencia | Esfuerzo |
|----|--------|----------|-----------|----------|
| S-01 | Audio con tipo MIME elegido por el cliente → XSS en el dominio | alta | VERIFICADO | S |
| S-02 | Sin identidad: quien conozca el `w` controla ese mundo (reloj, reset, crisis, clínica) | media (alta en directo) | VERIFICADO | S |
| S-03 | Sin límite de tamaño en `/api/relevo/act` (`p` libre) | media | VERIFICADO | S |
| S-04 | Configuración de la clínica sin validar: corrompe el mundo en silencio | media | VERIFICADO | S |
| S-05 | Cuota de Gemini sin límite: `/api/suggest` abierto y Gemini en cada nota | media | VERIFICADO (local) / INFERIDO (prod) | S |
| S-06 | Seudonimización solo en el cliente y solo para 9 nombres; la transcripción de Chrome sale del móvil | media | INFERIDO | S |
| S-07 | Sin cabeceras de seguridad (CSP, nosniff, frame-ancestors) | baja | VERIFICADO | S |
| S-08 | Tipos sin validar en `/api/relevo/note` → error 500 | baja | VERIFICADO | S |
| S-09 | README por defecto: no dice qué es simulado ni qué protecciones faltan | baja | VERIFICADO | S |
| S-10 | Carpeta `.claude/.playwright-mcp/` sin ignorar (registros de consola) | baja | VERIFICADO | S |

Cosas que revisé y están **bien**: `.env*` ignorado y nunca versionado; claves solo en `process.env` (servidor);
la clave de Gemini va en cabecera `x-goog-api-key`, no en la URL; los `console.error` de `src/lib/relevo/ai.ts:24` solo
registran el mensaje del error, **no el texto de las notas**; en Relevo no hay `dangerouslySetInnerHTML` (React escapa
los textos); `validWid` limita el id a `[a-z0-9]{6,24}` (no hay inyección en las claves de Redis); `ALLOWED` en
`server.ts` sí impide que un rol haga acciones de otro rol *si dice quién es de verdad* (probé `__proto__`/`constructor`:
rechazados); el id de mundo se genera con ~51 bits aleatorios (`kit.tsx:15`), no se puede enumerar ni adivinar; la salida de
Gemini T3 se recorta a 0-1 y la crisis de Gemini solo puede *añadir* a la lista fija; la salida T1 pasa por `FORBIDDEN` y
un límite de 220 caracteres; Relay antiguo usa scrypt + cookie `httpOnly`/`secure`/`sameSite=lax`. Producción ya envía HSTS
y no envía `X-Powered-By`.

No pude comprobar: el comportamiento real de Upstash con mundos de varios MB (límites de su plan) ni el uso de cuota de
Gemini en producción (no tengo acceso a los paneles; no quise escribir en producción).

---

## Hallazgos

```
S-01 · El audio de una nota se sirve con el tipo que diga el cliente → XSS almacenado
Gravedad: alta     Evidencia: VERIFICADO
Dónde: src/app/api/relevo/note/route.ts:38 (guarda b.mime sin validar) ·
       src/app/api/relevo/audio/route.ts:12 (responde con "Content-Type": a.mime)
Pasos: POST /api/relevo/note {w:<id>, as:"luis", to:"clinic", text:"hola", audio:<base64 de "<html><script>…">, mime:"text/html"}
       → GET /api/relevo/audio?w=<id>&id=ev1 responde 200, content-type: text/html, con el <script> intacto.
Qué pasa y a quién afecta: cualquiera puede crear un enlace en junction-ackerman.vercel.app que ejecuta su JavaScript en
  nuestro dominio. Desde ahí puede leer localStorage (el id de mundo del que lo abre, la cola de notas) y llamar a todas las
  APIs como si fuera esa persona (incluido Relay con su cookie). Un juez técnico que mire el código lo ve en 2 minutos y en
  una app de salud mental queda feo.
Criterio del jurado afectado: calidad técnica / confianza y privacidad.
Arreglo propuesto (concreto): en note/route.ts aceptar solo
  const mime = /^audio\/(webm|ogg|mp4|mpeg)(;.*)?$/.test(b.mime ?? "") ? b.mime! : "audio/webm";
  y en audio/route.ts añadir a la respuesta "X-Content-Type-Options": "nosniff" y
  "Content-Security-Policy": "sandbox" (y volver a comprobar el tipo al servir, por si hay audios viejos guardados).
Esfuerzo: S     Riesgo de romper algo: bajo (MediaRecorder de Chrome da "audio/webm;codecs=opus", Safari "audio/mp4")
```

```
S-02 · Sin identidad: quien sepa el id del mundo puede mover el reloj, reiniciar o actuar como cualquier persona
Gravedad: media (alta durante el pitch)     Evidencia: VERIFICADO
Dónde: src/app/api/relevo/act/route.ts:11-29 (as:"demo" → clock/reset sin más), :32-68 (as:"clinic" config),
       src/app/api/relevo/note/route.ts:15-16 (as lo pone el cliente), src/app/api/relevo/clinic/route.ts (todo el panel)
Pasos: POST /api/relevo/act {w, as:"demo", type:"clock", p:{to:99999999}} → {"ok":true,"clock":90719} (salta al final).
       Igual con type:"reset", o una nota con frase de crisis como "luis" → alerta grave.
Qué pasa y a quién afecta: el "rol" es solo una palabra en la petición. El servidor comprueba qué puede hacer cada rol,
  pero no quién eres. Con el id del mundo (está en la URL ?w= y en el menú "More" → "Same demo on a real phone") cualquiera
  del público puede estropear la demo en directo, y cualquiera puede abrir /relevo/clinic?w=… y ver los datos que
  "solo ve la clínica". Para una demo sin login es aceptable, pero hay que contarlo bien y blindar el pitch.
Criterio del jurado afectado: demo en directo; coherencia con la "regla de oro" de privacidad.
Arreglo propuesto (concreto, mínimo):
  1) En el pitch: abrir la demo en un mundo nuevo justo antes (ventana privada o ?w=<id nuevo>), no proyectar ni compartir
     la URL con ?w= ni el menú "More"; si se usa un móvil real, no enseñar su URL/QR.
  2) Opcional (S): una variable RELEVO_LOCKED_WORLDS=<id1,id2> en Vercel; si el w está en la lista, /act y /note
     exigen la cabecera x-relevo-key igual a RELEVO_PRESENTER_KEY (guardada en localStorage del portátil del presentador).
  3) Una línea en README/pitch: "Demo sin login: los roles son simulados (MOCK); en producción, cada rol con su cuenta y
     la clínica con autenticación fuerte."
Esfuerzo: S (1 y 3) / M (2)     Riesgo de romper algo: bajo (1, 3) / medio (2: hay que pasar la cabecera desde kit.tsx)
```

```
S-03 · Sin límite de tamaño en las acciones
Gravedad: media     Evidencia: VERIFICADO
Dónde: src/app/api/relevo/act/route.ts:71 (addEvent guarda p tal cual) · src/lib/relevo/store.ts:14-16
Pasos: POST /act con {as:"luis", type:"help", p:{junk:"x"*3.000.000}} → 200 {"ok":true}; el evento queda dentro del mundo.
Qué pasa y a quién afecta: cada mundo se guarda entero en una sola clave de Redis y se lee entero en cada sondeo
  (cada 5-6 s por pantalla). Un mundo inflado hace lentas todas las vistas y puede chocar con el límite de tamaño de
  petición de Upstash (INFERIDO: no comprobé el plan), dejando ese mundo roto. Solo afecta al mundo cuyo id se conoce,
  pero se suma a S-02. Las notas sí tienen límite (texto 1200, audio 1,6 MB).
Criterio del jurado afectado: robustez de la demo.
Arreglo propuesto (concreto): al principio de POST en act/route.ts
  if (JSON.stringify(p).length > 4000) return bad("Too much data", 413);
  y opcionalmente limitar world.events a los últimos ~2000.
Esfuerzo: S     Riesgo de romper algo: bajo (revisar que ninguna acción legítima mande más de 4 KB; las del kit son pequeñas)
```

```
S-04 · Ajustes de la clínica sin validar: se puede dejar el motor con números absurdos
Gravedad: media     Evidencia: VERIFICADO
Dónde: src/app/api/relevo/act/route.ts:36-49 (l1_R… aceptan cualquier número, incluido 1e308 o negativos;
       weights y catalog se mezclan sin comprobar tipos ni claves)
Pasos: POST /act {as:"clinic", type:"config", p:{patch:{weights:{sueno:"zz", movilidad:null}, noticeFrom:1e308}}} → 200.
       Después /api/relevo/clinic responde 200 pero con "people":8 (antes 9) y todos los niveles a 0: los números del
       contrato (0,87 · 0,62→0,70 · alertas) dejan de salir. Se recupera con {patch:{reset:true}} o con el reset de la demo.
Qué pasa y a quién afecta: no tumba el servidor, pero corrompe en silencio la demo de ese mundo. Un juez que juegue con
  los deslizadores de C5 no debería poder llegar ahí desde la interfaz, pero sí desde la API.
Criterio del jurado afectado: robustez / calidad técnica.
Arreglo propuesto (concreto): aceptar solo claves conocidas y rangos: para cada k numérico, Number.isFinite y
  0 <= v <= 10 (umbrales R) / 0 <= v <= 1440 (noticeFrom/To); en weights solo claves de DEFAULT_CONFIG.weights con
  0 <= v <= 1; en catalog solo claves de CATALOG con valores booleanos.
Esfuerzo: S     Riesgo de romper algo: bajo-medio (ajustar los rangos a lo que ofrece la interfaz C5)
```

```
S-05 · La cuota de Gemini se puede agotar desde fuera
Gravedad: media     Evidencia: VERIFICADO en local (sin clave → respaldo) / INFERIDO en producción
Dónde: src/app/api/suggest/route.ts:5-7 (Relay, "solo para probar a mano", abierto y sin límite; mete los textos
       changes/learned del cliente directamente en el prompt) · src/app/api/relevo/note/route.ts:30 (cada nota con
       consentimiento llama a Gemini, hasta 2 intentos) · src/lib/relevo/ai.ts:12
Qué pasa y a quién afecta: un bucle de POST a /api/suggest o /api/relevo/note gasta la cuota de la misma clave que usa
  Relevo. La demo no se rompe (hay plantilla de respaldo), pero en pleno pitch dejaría de salir el texto de Gemini y el
  "best use of partner tech" no se vería. /api/suggest además permite inyectar instrucciones en el prompt (la salida
  está acotada por el esquema, pero "explanation"/"message" son texto libre).
Criterio del jurado afectado: demo en directo / uso de la tecnología del partner.
Arreglo propuesto (concreto): 1) borrar o desactivar /api/suggest (dice que ya no se usa; preguntar antes de borrar):
  p. ej. que devuelva 404 si no hay RELAY_DEBUG. 2) En note/route.ts, caché por texto (world.ai[`t3:${hash}`]) para no
  repetir llamadas y un tope simple de llamadas a Gemini por mundo y día (contador en el propio mundo).
  3) Poner una alerta de presupuesto/cuota en Google AI Studio.
Esfuerzo: S     Riesgo de romper algo: bajo (comprobar antes con grep que ninguna página llama a /api/suggest)
```

```
S-06 · La seudonimización es solo del lado del cliente, solo cubre 9 nombres, y el dictado de Chrome sale del móvil
Gravedad: media     Evidencia: INFERIDO (lectura de código)
Dónde: src/app/relevo/kit.tsx:271 (hideNames en el navegador) · src/app/api/relevo/note/route.ts:17-30 (el servidor no
       vuelve a seudonimizar antes de Gemini) · src/lib/relevo/pseudo.ts:3-5 (lista fija de 9 nombres)
Qué pasa y a quién afecta: (a) quien llame a la API directamente manda nombres reales y llegan a Gemini tal cual;
  (b) cualquier otro dato identificable (apellidos, calles, otros nombres, teléfonos) no se toca; (c) los comentarios dicen
  "el texto se transcribe en el móvil", pero la Web Speech API de Chrome (webkitSpeechRecognition) por defecto envía el
  audio a los servidores de Google para transcribir, ANTES de seudonimizar. Un juez de Aalto que pregunte por privacidad
  puede pillar esa afirmación.
Criterio del jurado afectado: privacidad / ética (central en el reto de salud mental) y honestidad del pitch.
Arreglo propuesto (concreto): 1) llamar también a hideNames(text) en el servidor (note/route.ts, antes de analyseNote y de
  guardar): una línea, idempotente. 2) Cambiar el texto del pitch/README a "en la demo, el dictado usa el reconocimiento del
  navegador (MOCK); en producción, transcripción en el dispositivo". 3) Mencionar que la seudonimización es una lista de
  nombres conocida (MOCK) y que en producción iría NER/redacción en el dispositivo.
Esfuerzo: S     Riesgo de romper algo: bajo (hideNames sobre texto ya seudonimizado no cambia nada)
```

```
S-07 · Sin cabeceras de seguridad
Gravedad: baja     Evidencia: VERIFICADO
Dónde: next.config.ts (sin headers()) · producción: GET /relevo/demo solo envía Strict-Transport-Security
Qué pasa y a quién afecta: no hay Content-Security-Policy, X-Content-Type-Options, frame-ancestors ni Referrer-Policy.
  Las herramientas tipo securityheaders.com darían "F". Agrava S-01. (En local sale X-Powered-By: Next.js; en Vercel no.)
Criterio del jurado afectado: calidad técnica (solo si alguien lo mira).
Arreglo propuesto (concreto): en next.config.ts, headers() para "/(.*)" con X-Content-Type-Options: nosniff,
  Referrer-Policy: strict-origin-when-cross-origin, Content-Security-Policy: frame-ancestors 'self', y
  poweredByHeader: false. No poner una CSP completa de scripts ahora (Next inyecta scripts en línea: riesgo de romper).
Esfuerzo: S     Riesgo de romper algo: bajo (si /relevo/demo no se embebe en un iframe de otro dominio; revisar slides)
```

```
S-08 · Tipos sin validar en las notas → error 500
Gravedad: baja     Evidencia: VERIFICADO
Dónde: src/app/api/relevo/note/route.ts:17 ((b.text ?? "").trim() falla si text no es texto)
Pasos: POST /note {w, as:"luis", to:"clinic", text:{"a":1}} → 500.
Qué pasa y a quién afecta: solo da un error feo a quien manipula la API; no corrompe datos.
Arreglo propuesto (concreto): const text = typeof b.text === "string" ? b.text.trim().slice(0, 1200) : "";
  y lo mismo con typeof para mime/kind/cardId.
Esfuerzo: S     Riesgo de romper algo: bajo
```

```
S-09 · README por defecto de create-next-app
Gravedad: baja     Evidencia: VERIFICADO
Dónde: README.md (36 líneas, plantilla de Next.js)
Qué pasa y a quién afecta: el jurado no ve qué es simulado (roles sin login, datos de sensores, seudónimos, cifrado del
  audio marcado MOCK en audio/route.ts:2) ni qué datos van a Gemini. Es la entrega final ("modo entrega" de CLAUDE.md).
Arreglo propuesto (concreto): sección "Privacy & what is simulated": sin login (roles MOCK), solo texto seudonimizado a
  Gemini, nunca la clínica redactada por IA, audio borrado a los 30 días (TTL), cifrado E2E = MOCK, claves solo en Vercel.
Esfuerzo: S     Riesgo de romper algo: bajo
```

```
S-10 · Registros de Playwright sin ignorar
Gravedad: baja     Evidencia: VERIFICADO
Dónde: .claude/.playwright-mcp/ (sin seguimiento, no está en .gitignore; contiene console-*.log)
Qué pasa y a quién afecta: un `git add .` los subiría al repo público. Pueden contener URLs con ?w= y textos de notas de
  la consola. Hoy no hay nada sensible real, pero conviene evitarlo.
Arreglo propuesto (concreto): añadir `.playwright-mcp/` (cualquier nivel) a .gitignore.
Esfuerzo: S     Riesgo de romper algo: bajo
```

## Notas fuera de alcance (Relay antiguo, "NO tocar")
- `/api/state` es un mundo global compartido sin id: cualquiera puede cambiarlo para todos los que miren `/demo` de Relay.
- `/api/app/*` con usuarios demo y contraseña pública `relay-demo` (intencionado). La cookie de sesión está bien
  configurada; S-01 permitiría usarla desde un script en el mismo dominio.

## Orden recomendado (todo S, ~45 min en total)
1. S-01 (lista blanca de MIME + nosniff/sandbox en audio). 2. S-02 punto 1 y 3 (mundo nuevo antes del pitch, línea en
README). 3. S-05 punto 1 (desactivar /api/suggest) y S-06 punto 1 (hideNames en servidor). 4. S-03, S-04, S-08 (validación
de entrada). 5. S-07, S-09, S-10.
