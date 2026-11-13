---
name: depurar
description: Úsala ante cualquier error, fallo o comportamiento raro, ANTES de proponer un arreglo. Encuentra la causa real en vez de probar parches a ciegas. Versión corta de systematic-debugging (obra/superpowers, MIT).
---

# Depurar (encontrar la causa antes de arreglar)

Regla de oro: **nada de arreglos hasta saber la causa.** Probar cambios "a ver si va" es lo que crea bucles.

1. **Reproduce.** Consigue el error exacto: mensaje completo, consola del navegador, logs. Si no lo ves tú, pide al equipo exactamente qué copiar (o usa el MCP `playwright` para verlo tú).
2. **Mira qué cambió.** Revisa el último commit o los últimos cambios (`git diff`). Si antes funcionaba, la causa suele estar ahí.
3. **Una hipótesis cada vez.** Di en una frase: "Creo que falla porque X". Comprueba esa hipótesis con la prueba más pequeña posible (un log, una consulta). Si no se confirma, descártala y pasa a la siguiente. No cambies varias cosas a la vez.
4. **Arregla la causa, no el síntoma.** Un solo cambio, mínimo. Comprueba que el error desaparece y que el flujo principal sigue funcionando.
5. **Señales de que estás adivinando (para y vuelve al paso 1):** "probemos a cambiar X", "seguramente es Y", cada arreglo destapa un error nuevo en otro sitio, o ya llevas 2 intentos.
6. **3 intentos fallidos:** aplica la regla de los 3 intentos del CLAUDE.md (volver al último commit bueno o enfoque más simple).

Al acabar, explica en 1-2 frases en castellano cuál era la causa.
