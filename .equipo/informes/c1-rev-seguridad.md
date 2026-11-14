# C1 · Revisión de seguridad (solo lectura)

Fecha: 14/11/2026 · Rama `sesion-autonoma`, cambios sin commit (`git diff HEAD`) · Pruebas contra `http://localhost:3000`
(sin Gemini) con mundos aleatorios `secc1…`, `secc2…`, `secc3…`, `secc4…`. `.env.local` no se ha abierto.
Referencia: `.equipo/informes/f1-seguridad.md` (S-01…S-10).

## Veredicto por cambio

| Archivo | Qué arregla | Veredicto |
|---|---|---|
| `src/lib/relevo/store.ts` (`safeAudioMime`) + `audio/route.ts` + `note/route.ts` | S-01 XSS por el tipo del audio | **Aprobado** (un detalle menor: SC1-01) |
| `src/app/api/relevo/act/route.ts` | S-03 tamaño, S-04 validación, claves de prototipo | **Arreglos menores** (SC1-02, SC1-03) |
| `src/app/api/relevo/note/route.ts` (tipos) | S-08 error 500 | **Aprobado** |
| `src/app/api/relevo/mentor/route.ts` (`after()` + marca `try:`) | Gemini fuera de la respuesta | **Aprobado** (no abre una vía nueva de gasto; ver nota) |
| `src/lib/relevo/sim.ts` (`try/catch` por evento) | Un evento malo no deja el mundo en 500 | **Aprobado** |
| `.gitignore` | S-10 | **Aprobado** |
| `README.md` | S-09 | **Arreglos menores** (SC1-04) |

## Lo comprobado (VERIFICADO)

- **S-01 cerrado.** `POST /note` con `mime:"text/html"` y `<html><script>…` en base64 → `GET /audio` responde
  `content-type: audio/webm`, `x-content-type-options: nosniff`, `content-security-policy: sandbox`. El HTML ya no se
  interpreta. `audio/webm;codecs=opus` se conserva. Un intento de inyectar cabeceras (`audio/webm;\r\nX-Evil: 1`) cae a
  `audio/webm` (el `:` no pasa la expresión). Los audios antiguos también salen con tipo seguro porque se revalida al servir.
- **Tamaño de `/act`.** `p` de 5 KB → 413 "Too much data"; 3,9 KB → 200. Un cuerpo de 20 MB con el relleno fuera de `p`
  → 200, pero no se guarda nada (solo se guarda `p`). En Vercel el cuerpo ya está limitado a 4,5 MB.
- **Prototipos.** Rechazados con 403/400: `as:"__proto__"`, `as:"constructor"`, `as:"toString"`, `type:"__proto__"`,
  `as:["luis"]`, `person_thresholds` con `person:"__proto__"`/`"constructor"`, `call` con `person:"__proto__"`/`"constructor"`,
  `match_propose` con `mentee:"hasOwnProperty"`, `clinic_rhythm` con `rhythm:7`. En `config`, `weights`/`catalog` con
  claves `__proto__`, `constructor`, `toString` y valores `"zz"`/`null` → se ignoran (solo claves propias y tipos
  correctos). `datatype`/`consent` con `key:"__proto__"`/`"constructor"` → 200 sin efecto dañino (el literal
  `{[k]: …}` crea una propiedad propia, no cambia el prototipo). Después, `/clinic`, `/me`, `/mentor`, `/demo` → 200.
- **Notas.** `text` objeto → 400 "The note is empty" (antes 500); `audio` objeto → 400 "Bad recording"; cuerpo `null` o `5`
  → 400. Texto de 20 MB → se recorta a 1200.
- **Eventos con datos raros** (`rhythm:"abc"`/`99`, `kind` objeto, `id` objeto) no tumban ninguna vista: el `try/catch`
  de `sim.ts` y `str()` los absorben. La interfaz solo compara `kind`, no lo pinta, así que no rompe React.
- **`.playwright-mcp/` ignorado:** `git check-ignore -v .claude/.playwright-mcp/console-1.log` → `.gitignore:45`.
  `git ls-files` no tiene nada de Playwright.
- **README sin secretos:** solo nombres de variables, sin valores. Sin claves en `src/`, `README.md` ni `.equipo/`
  (solo aparece `clave-falsa-de-prueba` en un informe, a propósito).

## Nota sobre `/mentor` y `after()` (INFERIDO: sin clave de Gemini en local no se dispara la llamada)

La marca `try:t1:<tarjeta>:<idea>` se guarda **antes** de llamar a Gemini, así que cada tarjeta+idea pide un solo
borrador (como mucho 2 intentos de 10 s, dentro de `maxDuration = 30`). Límites que quedan, todos acotados:
dos sondeos simultáneos pueden colarse a la vez (ventana de milisegundos → 2 llamadas); "Another idea" cambia la idea →
1 llamada nueva por idea del catálogo; un `reset` o un mundo nuevo vacían `world.ai` → otra llamada. Para gastar cuota
en bucle hay una vía más barata y anterior: cada nota con consentimiento llama a Gemini (S-05, sigue abierto). Este cambio
no empeora eso.

## Hallazgos

```
SC1-01 · La lista de tipos de audio deja pasar saltos de línea → 500 al servir ese audio
Gravedad: baja     Evidencia: VERIFICADO
Dónde: src/lib/relevo/store.ts:25 (AUDIO_MIME usa \s, que incluye \r y \n)
Qué pasa: mime "audio/webm; a\r\n b" pasa la expresión, se guarda, y GET /audio de esa nota da 500 (la cabecera no es
  válida). Solo rompe el audio que mandó el propio atacante; no hay inyección de cabeceras ni XSS.
Arreglo: cambiar \s por un espacio: /^audio\/(webm|ogg|mp4|mpeg)(;[\w=. -]*)?$/
```

```
SC1-02 · Los umbrales numéricos de la clínica siguen sin rango (resto de S-04)
Gravedad: baja     Evidencia: VERIFICADO
Dónde: src/app/api/relevo/act/route.ts:54-58 (l1_R, l2_R, l3_R, domain_hi, persist_up, persist_down, noticeFrom, noticeTo)
Qué pasa: {patch:{noticeFrom:1e308, l1_R:-5, persist_up:1e9}} → 200. En el día 47 la clínica muestra early:0
  (con la configuración por defecto: early:2). No da 500 y se recupera con {patch:{reset:true}}, pero desde la API se
  puede dejar la demo "muda" en silencio.
Arreglo: limitar con Math.min/Math.max: umbrales R y domain_hi 0-10, persist_* 1-14 enteros, noticeFrom/To 0-1440
  (ajustar a lo que ofrecen los deslizadores de C5).
```

```
SC1-03 · El número de eventos por mundo no tiene tope (resto de S-03)
Gravedad: baja     Evidencia: VERIFICADO (local) / INFERIDO (Upstash)
Dónde: src/lib/relevo/store.ts:18-22 (addEvent) · act/route.ts:29 (solo limita cada petición)
Qué pasa: 300 acciones de 3,9 KB en 14 s → mundo de ~1,2 MB; las vistas siguen en 46 ms en local. Con muchas más, el
  mundo puede pasar el tamaño máximo por petición de Upstash y quedar sin poder guardarse (no comprobado en su plan).
  Solo afecta a un mundo cuyo id se conoce (S-02).
Arreglo: en addEvent, si world.events.length > 2000 → rechazar con 429 en la ruta, o recortar los más antiguos.
```

```
SC1-04 · El README dice que los nombres se cambian antes de ir a la IA, pero solo lo hace el navegador
Gravedad: baja     Evidencia: VERIFICADO (lectura de código)
Dónde: README.md:75-76 · src/app/relevo/kit.tsx:283 (hideNames en el cliente) · src/app/api/relevo/note/route.ts:31
  (analyseNote(text) sin hideNames en el servidor)
Qué pasa: quien llame a /api/relevo/note directamente manda nombres reales a Gemini. La frase del README es cierta para
  la app, no para la API. Un juez técnico puede pillarlo. El resto del README es honesto: dice que no hay login, que
  cualquiera con el id ve el mundo, que el audio no está cifrado y que las cifras son sintéticas.
Arreglo (una línea, sin riesgo): en note/route.ts, const text = hideNames(...) antes de analizar y guardar
  (hideNames es idempotente). O cambiar el README a "the app replaces the names in the browser before…".
```

```
SC1-05 · Un "p" anidado 5000 niveles devuelve 500
Gravedad: informativa     Evidencia: VERIFICADO
Dónde: src/app/api/relevo/act/route.ts (sin límite de profundidad)
Qué pasa: respuesta 500 sin cuerpo; el mundo no queda guardado ni roto (las peticiones siguientes van bien).
Arreglo: opcional; envolver el cuerpo de POST en try/catch → bad("Bad data"). No hace falta para la demo.
```

## Sigue abierto de F1 (fuera de este ciclo)
S-02 (sin identidad: blindar el pitch con un mundo nuevo), S-05 (cuota de Gemini por notas y `/api/suggest`),
S-06 (seudónimos solo en el cliente, ver SC1-04) y S-07 (cabeceras globales).
