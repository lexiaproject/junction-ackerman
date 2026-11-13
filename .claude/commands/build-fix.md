---
description: Arreglar errores de build/deploy uno a uno con cambios mínimos.
---

# /build-fix (versión corta, basada en ECC)

1. Ejecuta el build del proyecto (`npm run build` si existe; si no, `npx tsc --noEmit`). Si el fallo es solo en el deploy, pide el log del deploy.
2. Agrupa los errores. Empieza por imports y tipos, luego lógica.
3. Para cada error: lee solo las líneas cercanas, arregla con el cambio más pequeño posible y vuelve a ejecutar el build.
4. No refactorices, no cambies dependencias ni configuración salvo que el error lo exija (y avisa antes).
5. Si un mismo error sigue tras 3 intentos, para y aplica la regla de los 3 intentos del CLAUDE.md.
6. Al acabar: 2 líneas en castellano con qué estaba mal y qué has cambiado.
