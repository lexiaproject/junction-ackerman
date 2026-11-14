# DECISIONES

1. **Criterios de evaluación pendientes.** El bloque 0 no los trae. El Juez de Producto usa los cuatro ejes genéricos
   (impacto y encaje con el reto, innovación, ejecución técnica, presentación y experiencia) y lo anota como supuesto.
2. **Rama en vez de main.** La memoria de la sesión decía "trabajar en main y subir cada avance"; el documento de esta
   sesión manda trabajar en `sesion-autonoma` sin push. Manda el documento (instrucción más reciente del usuario).
3. **Servidor local sin Gemini.** Se arranca `next dev` con `GEMINI_API_KEY` vacía: no se gasta cuota en pruebas y se
   ejercita el camino de respaldo (prioridad del bloque 0). La ruta con Gemini se verifica una sola vez al final.
4. **Prueba de extremo a extremo creada en la fase 0** (`scripts/relevo-demo-walk.mjs`) para que la puerta de cada ciclo
   incluya el recorrido de los 8 pasos con los números del contrato, además de las 33 comprobaciones.
5. **Mecánica de la jerarquía.** Los subagentes no lanzan otros subagentes: el Director encadena especialistas y después
   el jefe de su rama con los informes como entrada (sección 4).
6. **Lógica del camino de crisis: no se toca en esta sesión (regla del bloque 0, que manda sobre el resto).** K-04 (resolver el
   mismo día deja nivel 3), K-05 (alerta de la nota queda abierta si también pulsó "Talk to my clinic"), K-14 (Pablo recibe la
   frase de crisis literal), K-15 (sin consentimiento de notas o sin red no se abre ayuda), K-16 (apóstrofo tipográfico ’ no
   detectado), K-17 ("Ask Pablo to write" durante crisis/pausa), K-29 y la espera de Gemini en /note (K-02, parte de notas):
   NO se cambia su lógica. Van al informe final como "necesita tu decisión", con el arreglo exacto propuesto. Para la demo,
   mitigación por guion: no pulsar "Resolve" el día 57; dejar que el guion resuelva el día 59.
7. **K-01 sí (persistencia, no lógica de crisis).** /mentor y /note recargan el mundo justo antes de guardar, para no borrar lo
   ocurrido mientras esperaban a Gemini. No cambia qué se detecta ni qué se muestra; requiere visto bueno de Seguridad clínica
   por tocar la ruta de notas.
8. **K-13 no.** La especificación v3 manda "Aceptar y seguir, activo con al menos el primero"; hacer opcional el consentimiento
   de datos contradice la decisión de producto. En su lugar, K-06: aviso en la vista de demo si se desactivan consentimientos.
9. **Accesibilidad en zonas de crisis (K-08, K-09, K-33, K-34): sí**; **K-10 (texto de M6) y K-29 (texto de la hoja de ayuda): NO**, porque la regla prohíbe cambiar el contenido del mensaje a Pablo y de la pantalla de ayuda. **K-19 (texto de M5, protección del mentor): sí**. Todo ello por ser visual/de accesibilidad o copy que
   hace que el aviso no mienta, siempre con visto bueno de Seguridad clínica. El contenido de la pantalla de ayuda (112, MIELI,
   clínica, mentor) no cambia.
10. **Gemini en /mentor (K-02, parte del mentor): sí**, sin tocar modelo ni configuración: se apunta el intento para no
    reintentar en cada sondeo y el teléfono no se congela.
11. **LICENSE MIT** a nombre de "Ackerman Family (Junction 2026 team)" (el CLAUDE.md del equipo dice que el proyecto se publica con MIT; el equipo puede cambiar el titular).
12. **Publicación (petición expresa del usuario: "Actualiza ya el Vercel y el repositorio").** Se fusiona en `main` con
    `git merge --squash` (un solo commit) en vez de avance rápido: dos commits intermedios de la rama contenían el nombre de
    usuario de Windows en rutas de los informes; así el historial público de `main` no lo lleva. La rama `sesion-autonoma`
    conserva el detalle commit a commit en local. Las rutas de los informes se han anonimizado (`Users\<user>`).
