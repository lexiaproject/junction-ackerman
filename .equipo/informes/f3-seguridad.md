# F3 · Seguridad · Congelación

Autor: especialista de seguridad · Fecha: 14/11/2026 · Alcance: `git log inicio-sesion..HEAD -p` (12 commits, 60 archivos,
incluidos los de `.equipo/`) + `.gitignore` + README. Solo lectura; `.env.local` no se ha abierto.

## Resumen
- **No hay ningún secreto real** en los commits de la sesión (ni en `src/`, ni en `scripts/`, ni en `README.md`, ni en `.equipo/`).
- `.env.local` sigue ignorado (`.gitignore:34 .env*`) y **nunca se ha versionado** (`git log --all -- .env.local` vacío).
  Solo `.env.example` está en git (permitido con `!.env.example`).
- `.playwright-mcp/` está ignorado (`.gitignore:45`, sin barra: cubre también `.claude/.playwright-mcp/`). No hay binarios en el diff.
- No hay `console.log/error` nuevos en `src/`; ninguno vuelca textos de notas ni datos de salud.
- Un hallazgo menor (bajo): el nombre de usuario de Windows aparece en rutas absolutas dentro de 11 informes de `.equipo/`.

## Qué busqué y qué salió
| Búsqueda (líneas añadidas) | Resultado |
|---|---|
| `AIza`, `sk-…`, `ghp_`, `github_pat`, `xox[bp]-`, `Bearer `, `password`, `secret`, `api_key` | Ninguna clave. Solo menciones en texto ("tokens" de diseño, "en secreto" en prosa). |
| `KV_REST`, `UPSTASH`, `*.upstash.io`, `NOMBRE=valor` | Solo **nombres** de variables. La única asignación es `GEMINI_API_KEY=clave-falsa-de-prueba` con el resto vacías, en un informe de QA (valor inventado, inofensivo). Ningún host `*.upstash.io`. |
| Cadenas largas (≥32 caracteres) | Solo rutas, ids de sesión del scratchpad y listas de palabras. Nada con pinta de clave. |
| URLs | `localhost:3000`, `junction-ackerman.vercel.app/relevo/demo` (pública a propósito), `aistudio.google.com/apikey`. Los `?w=…` son ids de mundos de prueba aleatorios, sin datos personales. |
| Correos / teléfonos | Ningún correo. Teléfonos: `+358 9 4512 3300` (clínica ficticia, el README lo declara) y `09 2525 0111` (línea pública de crisis MIELI, dato público correcto). |
| `console.*` nuevos | Solo 2 en `scripts/relevo-demo-walk.mjs` (imprime "OK/FAIL" + números de la demo). En `src/` no se añadió ni quitó ninguno; los existentes (`src/lib/relevo/ai.ts:24`, `src/lib/gemini.ts:58`, `src/lib/app/ai.ts:88`) no son de esta sesión y no imprimen el texto de la nota. |
| Rutas API cambiadas (`act`, `audio`, `note`, `mentor`) | No registran nada. `note` recorta el texto a 1200 caracteres y no lo escribe en logs. `mentor` manda a Gemini solo seudónimos (`hideNames`). `audio` sirve con `nosniff` + `CSP: sandbox` (cierra el XSS S-01). Los errores de `act` repiten el `type` recibido dentro de JSON (inofensivo). |

## Hallazgo
**F3-S1 · Nombre de usuario local en informes · baja.** Rutas como `C:\Users\<usuario>\AppData\Local\Temp\claude\…\scratchpad\…`
y `C:\Users\<usuario>\Downloads\junction-pack\.claude\.playwright-mcp\…` aparecen en 11 archivos de `.equipo/informes/`
(c1-backend, c1-diseno, c1-rev-qa, c1-rev2-qa, c2-rev-clinica, c2-rev-qa, f1-calidad, f1-clinica, f1-qa, f1-rendimiento, f1-ux).
Solo revela el nombre de usuario de Windows del portátil; no es una clave ni da acceso. El README no lo contiene.
Opcional si el repo va a ser público: sustituir esas rutas por `<scratchpad>` o no publicar `.equipo/`. No bloquea la entrega.

## README
Sin valores de claves: solo la tabla de nombres (`GEMINI_API_KEY`, `KV_REST_API_URL/TOKEN`, `UPSTASH_REDIS_REST_*`), el enlace
público de la demo y la aclaración de que clínica y teléfono son ficticios. Nada que exponer.

## Notas
- HEAD (`7a1bb6a`) no está todavía en ninguna rama remota; esta revisión vale para lo que se publique desde aquí.
- Hay cambios sin commitear en `.equipo/ESTADO.md` y `.equipo/REGISTRO.md` (de otros agentes); no se revisaron por no estar en commits.
