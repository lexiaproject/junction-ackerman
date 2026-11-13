# CLAUDE.md — Equipo Ackerman Family · Junction 2026

## Quiénes somos
Somos 3 personas de 20 años en un hackathon de 48h (Junction 2026, Espoo).
**No somos programadores.** No sabemos leer bien código ni usar la terminal con soltura.
Tú (Claude) eres el que programa. Nosotros decidimos el producto y probamos.

Trátanos así:
- Explica todo en castellano y en lenguaje sencillo, sin jerga. Si usas un término técnico, explícalo en una frase.
- Ejecuta tú los comandos (instalar, arrancar, git, deploy). No nos pidas que los escribamos nosotros salvo que sea imprescindible, y si lo es, dinos exactamente qué pegar y dónde.

## Contexto del hackathon
- Tenemos 48h. Una demo que funcione vale más que código perfecto o muchas funciones.
- Prioridad absoluta: **un flujo principal que funcione de principio a fin**. Nada de funciones extra hasta que ese flujo esté terminado y desplegado.
- Si algo no es esencial para la demo, propón simularlo (datos fijos, respuestas de ejemplo) y márcalo claramente en el código con `// MOCK:` para que sepamos qué es real y qué no.
- Si te pedimos algo que va a costar mucho tiempo o es arriesgado, avísanos ANTES y propón una versión más simple.

Fechas clave (hora de Finlandia): entrega preliminar viernes 23:59 · entrega final domingo 10:00. El proyecto se publica con licencia MIT.
Algunas empresas premian "el mejor uso de su tecnología": si encaja con nuestra idea, propón usar la API de un partner.

## Reglas para no rompernos el proyecto
1. **Commits frecuentes.** Cada vez que algo funcione, haz commit con un mensaje claro en castellano. Antes de un cambio grande, asegúrate de que hay un commit limpio al que volver.
2. **Regla de los 3 intentos.** Si intentas arreglar el mismo error 3 veces y sigue fallando, PARA. Explícanos qué está pasando y propón: (a) volver al último commit que funcionaba, o (b) otro enfoque más simple. No entres en bucles.
3. **Causa antes que arreglo.** Ante cualquier error, usa la skill `depurar`: primero la causa, luego un único cambio.
4. **Si te falta información, pídela.** Si un error depende de algo que no ves (una clave, una configuración, lo que sale en el navegador), pídenos exactamente qué copiar: el mensaje de error completo, la consola del navegador (F12 → Console), etc. No adivines.
5. **No rompas lo que funciona.** Cuando cambies algo, comprueba que el flujo principal sigue funcionando.
6. **Nunca borres archivos, ramas ni datos** sin preguntarnos primero.
7. **Lo mínimo que funcione.** Nada que no hayamos pedido, ni abstracciones o "por si acaso". Si lo puedes hacer en 50 líneas en vez de 200, hazlo en 50.
8. **Cambios quirúrgicos.** Toca solo lo necesario para la tarea; no "mejores" ni reorganices código que funciona.
9. **Si algo es ambiguo, pregunta antes.** Di tus suposiciones; si hay dos formas de entenderlo, plantéalas en vez de elegir en silencio.

## Claves y secretos
- Las API keys van SIEMPRE en `.env.local` (o el equivalente), nunca escritas en el código.
- Asegúrate de que `.env*` está en `.gitignore` antes del primer commit.
- Mantén un `.env.example` con los nombres de las variables (sin valores) para que los otros dos sepan qué necesitan.
- Si falta una variable, dinos exactamente cuál y de dónde sacarla.

## Trabajo en equipo (3 portátiles, un repo en GitHub)
- Cada persona trabaja en su propia rama (`git checkout -b nombre-tarea`). Nunca directamente en `main`.
- Antes de empezar una sesión: traer lo último de `main` (`git pull`).
- Para juntar trabajo: haz merge a `main` cuando la tarea funcione. Si hay conflictos, explícanos qué choca y resuélvelo con cuidado; si dudas, pregunta.
- Intenta que cada persona toque archivos/carpetas distintos para evitar conflictos.

## Deploy
- Despliega pronto (el sábado por la mañana como tarde), no al final.
- Tras cada merge importante a `main`, comprueba que el deploy sigue funcionando.
- Si el deploy falla pero en local funciona, sospecha primero de variables de entorno no configuradas en la plataforma de deploy.

## APIs o datos de la empresa del challenge
- Puede que no conozcas su API o que sea muy nueva. No inventes cómo funciona: pídenos la documentación y trabaja a partir de ella.
- Si algo de su API no queda claro, dínoslo para preguntar a los mentores de la empresa.

## Herramientas extra (en .claude/, sacadas de ECC, Superpowers y Anthropic)
Úsalas por tu cuenta cuando haga falta, sin que te las nombremos (los comandos: lee su archivo en `.claude/commands/` y síguelo). Avisa en una línea cuál usas. Cada una solo en su momento, nunca "por si acaso":
- Elegir idea (viernes): `product-lens`, solo modo 1 → `PRODUCT-BRIEF.md`.
- Función nueva que toca varios archivos: `/plan`. Cambios pequeños, sin plan.
- Falla el build o el deploy: `/build-fix`.
- Primera versión de la interfaz (estilo, tipografía, colores): `frontend-design`. Que no parezca una plantilla genérica.
- Pulir interfaz, solo con el flujo principal ya funcionando: `make-interfaces-feel-better`.
- Vídeo de la demo (sábado noche): `ui-demo`.
- Slides del pitch, en inglés: `frontend-slides`.
- Dudas sobre cómo usar una librería (Next.js, Supabase…): MCP `context7` para leer la documentación actual en vez de tirar de memoria.
- Comprobar que la web funciona de verdad (clicar, rellenar formularios, ver errores de consola): MCP `playwright`.

## Antes de la entrega (domingo)
Cuando digamos "modo entrega", ayúdanos a revisar:
- [ ] El flujo principal funciona en la versión desplegada (no solo en local).
- [ ] No hay claves en el código ni en GitHub.
- [ ] README con: qué hace, problema que resuelve, cómo usarlo, tecnologías y qué partes son simuladas.
- [ ] Datos de ejemplo cargados para que la demo luzca.
- [ ] Repo público (o con acceso para el jurado) si lo piden las normas.
