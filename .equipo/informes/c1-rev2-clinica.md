# Segunda revisión de Seguridad clínica y privacidad · ciclo 1 (textos)

Revisor: especialista de seguridad clínica y privacidad. Fecha: 14/11. Solo lectura; sin commits; no he leído `.env.local`.
Base: `git diff HEAD -- README.md src/app/relevo/demo/page.tsx`, `README.md` completo y `LICENSE`, contra lo pedido en `c1-rev-clinica.md` (secciones 3 y 4).

## Veredictos

| Pieza | Veredicto |
|---|---|
| `README.md` | **APROBADO** |
| Franja de consentimientos (`demo/page.tsx`) | **APROBADO** |
| `LICENSE` | Correcta (MIT estándar, "Copyright (c) 2026 Ackerman Family (Junction 2026 team)"), coincide con la sección License del README |

## README: mis 4 arreglos, aplicados tal cual

- **3a** "Relevo quietly compares each person with their own usual…" (ya no "The phone") y "**Only the clinic ever sees health data.** Mentors only receive the voice notes sent to them." → aplicado literal.
- **3b** Paso 5: "Pablo says "Can't today": he gets no idea for Luis that day." → aplicado literal.
- **3c** Paso 6: "Pablo gets a calm message telling him he doesn't need to do anything else." → aplicado literal.
- **3d** Viñeta de la lista de crisis: "The filter only runs on the notes of people who turned on note analysis, and it misses phrasings that are not on the list." y viñeta de Gemini "…for the copilot, only for people who turned on note analysis" → ambos aplicados literal.

## README: comprobación contra los principios (nada lo contradice)

- Solo la clínica ve datos de salud: dicho con el matiz correcto; "the mentee and mentor apps never receive levels, scores or sensor features"; el navegador no calcula riesgo (Arquitectura).
- Detección de crisis por reglas: lista fija + Gemini solo puede **añadir** la marca, nunca quitarla; límites honestos (consentimiento de notas, frases fuera de la lista).
- Resumen clínico por plantilla: "It never writes anything for the clinic, whose summaries are deterministic templates."
- Nunca decir al mentor que está peor: pasos 3 y 7 dicen "is asked first, privately" y "offered a lighter pace / a pause"; ningún texto dice al mentor que el acompañado (o él mismo) empeora.
- Los avisos no mienten: el paso 6 ya no afirma que la clínica esté en contacto; el paso 5 ya no exagera ("respected"); V3 retenida por "one push per day" es lo que hace la simulación.
- Cifras: 88 %, 5 días, 2,45 y nivel 2 (48 %, 1 día, 0,5) en el mismo párrafo que "200 synthetic people", "synthetic data that we generated ourselves" y "**not** that it predicts relapse in real patients; that would need a clinical study". Marco correcto.
- No promete prevenir ni tratar: "Relevo does not diagnose, treat or replace emergency services." El problema se describe como "tries to catch the early drift", sin promesas.
- Novedades de privacidad honestas: el servidor no seudonimiza texto enviado directamente a la API; audio sin cifrar; sin login (cualquiera con el id ve el mundo, todos sintéticos).

## Franja de consentimientos

El `<span>` es exactamente el pedido:
`Luis turned off {…join(" and ")}. That&apos;s his choice; the scripted story assumes all three are on.`
Ya no sugiere que los consentimientos sean obligatorios (línea roja 8). Va en color de aviso (no rojo), `role="status"`, solo en la vista del presentador.
La frase opcional ("Without notes analysis, his notes aren't checked for crisis phrases.") no se añadió; era opcional y no bloquea. El README ya cubre ese límite (3d).

## Lo que NO he cambiado
Nada salvo este informe.
