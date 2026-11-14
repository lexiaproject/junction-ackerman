# Ensayo y día de la demo (K-49) · sin código

Lista corta para quien presenta. Todo sale de los informes de la fase 1 y de DECISIONES.md.

## Antes de subir al escenario (10 minutos antes)
1. Abrir la versión desplegada (https://junction-ackerman.vercel.app/relevo/demo) en Chrome, no `npm run dev`
   (en desarrollo sale el icono "N" de Next.js en una esquina y todo va más lento).
2. Usar un mundo NUEVO: abrir la demo en una ventana normal de Chrome que no se haya usado para ensayar, o pulsar
   "More → Reset everything people did (keep the time)" y luego "Go back to day 0".
3. Recorrer la demo entera una vez con "Next moment" (calienta el servidor: la primera petición en frío tarda ~1 s).
   Volver al día 0.
4. Conceder el permiso de micrófono si se va a grabar una nota en directo.
5. Pantalla del proyector a 1920×1080 si es posible. La capa "Show how Relevo decides" se abre y cierra con la tecla E.

## Durante la demo
- Avanzar solo hacia delante ("Next moment" o flecha derecha). Si hay que repetir, ir al día 0 desde "More".
- No proyectar la URL con `?w=` ni el menú "More": quien tenga el enlace puede mover la demo.
- Paso 3 (pulsación 5): pulsar "Yes" en el móvil de Pablo. Si Gemini tarda o falla, el mensaje sale igual con el texto de respaldo
  (se ve "Suggested · you can change it" en vez de "Suggested with AI").
- Día 57 (crisis): dejar que el guion resuelva el día 59. Pulsar "Resolve" antes ya es seguro (Luis vuelve al nivel de sus datos), pero cambia la historia.
- No reproducir en voz alta la nota de crisis de Luis (botón de play) delante del jurado: basta con decir que una frase de
  la lista fija la ha activado. Aviso de contenido antes del paso 7 (pulsación 12).
- Si la red cae: plan B local con `npm run build && npm start` y abrir http://localhost:3000/relevo/demo (sin variables
  KV funciona con memoria del servidor; sin clave de Gemini usa el texto de respaldo).

## Qué decir si preguntan
- "¿La IA decide algo clínico?" No: los niveles los decide una regla determinista; la crisis, una lista fija; Gemini solo
  redacta mensajes entre iguales y analiza el tono.
- "¿Cómo sabéis que funciona?" 1.000 personas sintéticas generadas por nosotros (90 % de recaídas detectadas, ~6 días antes): valida que la lógica hace lo que diseñamos,
  no la precisión clínica.
- "¿Privacidad?" Solo la clínica ve datos; el paciente y el mentor nunca ven un número; consentimientos separados.
