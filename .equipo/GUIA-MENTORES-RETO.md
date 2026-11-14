# Guía: enseñar Relevo a los mentores del reto (Aalto) · unos 6 minutos

Para quien presenta. Las frases entre comillas son para decirlas en inglés; lo demás son instrucciones.
Ellos no son el jurado: son expertos y ya nos dijeron qué les preocupa. Objetivo: que vean que hemos
escuchado su feedback (1) **el mentor no carga con la salud mental del otro** y (2) **pocos datos, bien elegidos**.

## Atajo: la visita guiada automática
Si no quieres presentarla tú: en la demo pulsa **G** (o "More → Play the guided tour"). Se abre una demo nueva y,
al pulsar **Start the tour**, recorre sola esta misma guía en unos 5 minutos: resalta la columna de la que habla,
hace los clics importantes y enseña cada frase en inglés (y la lee en voz alta; el icono del altavoz la apaga).
Barra espaciadora pausa · ← → pasos · Esc termina. En la crisis nunca reproduce la nota de Luis.

## Antes de empezar (5 minutos antes)
1. Abrir https://junction-ackerman.vercel.app/relevo/demo en Chrome, pantalla grande.
2. Pulsar **+** para empezar desde cero. Recorrer la demo una vez con la flecha → para "calentarla" y volver a pulsar **+**.
3. Tener claras tres teclas: **→** siguiente momento · **E** abre/cierra "Show how Relevo decides" · **+** reinicia todo.
4. No enseñar el menú "More" ni el enlace con `?w=`.

## Guion

### 0 · Apertura (pantalla inicial, 30 s)
> "Thank you for your feedback. We took two things from it: mentors must never carry responsibility for someone
> else's mental health, and we should collect only the data that supports our approach. Let me show you how Relevo
> handles both."

Tres columnas: Luis (acaba de terminar el TMS), Pablo (su mentor, 4 meses después), la clínica.

### 1 · Emparejamiento y la invitación al mentor (→ 1 vez, 1 min)
- Pulsar **E**: la capa muestra cómo se empareja por cómo empezó la última recaída. Pablo **87 %**, Sara **75,8 %**.
> "The clinic matches people by how their last relapse started. Pablo and Luis both started by sleeping more and
> going out less."
- Cerrar con **E**. En el móvil de Pablo, pulsar **I'm interested**: sale **"What accompanying means"**.
  **Este es el momento clave para ellos.** Leer en voz alta el recuadro "What's not on you".
> "Before accepting, the mentor sees what is not on them: they're not a therapist, they never see health data,
> anything serious goes to the clinic, and they can pause or stop at any time. A companion, not a guide."
- **No** pulsar "Sounds good" ni "Accompany Luis": seguir con →.
- **Si alguien pulsa "Propose" en Sara por error:** en la clínica, Matching → **Cancel proposal** (o tecla **+**).

### 2 · Consentimiento y línea base (→ 3 veces, 20 s)
> "Luis gives three separate consents, and for four weeks Relevo only learns his usual. It never compares him with
> anyone else."

### 3 · Apoyo al mentor sin responsabilidad (→ 1 vez, día 40, 1 min)
- Columna de Pablo: aparece una sugerencia privada ("Only you see this") porque Luis lleva tres notas quejándose de lo mismo.
- Pulsar la pestaña **Conversation** de Pablo → **"Not sure what to say? Get reply ideas"**. Tarda unos 6 segundos.
> "If the mentor doesn't know what to say, they can ask for ideas. These are warm peer-support techniques, like
> validation or suggesting a small shared step. Never clinical advice. If there's any sign of crisis, it doesn't
> suggest anything: the clinic takes over."
- Cerrar la hoja de ideas.

### 4 · Detección tranquila: primero se pregunta al mentor (→ 5 veces + 3 más para el paseo, días 43-48, 1 min)
- Un pico de un día no dispara nada. Tres días seguidos → Luis en nivel 1 (solo lo ve la clínica).
- Pablo recibe **"Would you like to talk to Luis today?"**. Puede decir que no.
> "One bad day does nothing. After three days of a clear change, the mentor is asked first, privately, and can say
> no. Luis never sees an alarm, only 'Pablo would like to talk to you'."
- Tres → más: Pablo manda el paseo como nota de voz, Luis dice "I'm in" y Relevo aprende que a esta pareja le funcionan los paseos.

### 5 · Si el mentor no puede, la clínica se encarga (→ 6 veces, días 54-55, 40 s)
> "When Pablo says 'Can't today', that's respected: he gets nothing to do. The clinic sees Luis at high risk and
> calls him. Luis gets at most one notification a day."

### 6 · El mentor también está protegido (→ 2 veces, día 56, 40 s)
- La columna cambia sola a **Marta**, la mentora de Pablo.
> "Mentors are still recovering too, so Relevo watches them exactly like mentees. If Pablo starts to drift, his own
> mentor is asked first. If it gets worse, he's offered a pause, ideas for Luis stop, and the clinic can assign a
> temporary mentor."

### 7 · Crisis (→ 2 veces, día 57, 40 s) · avisar antes
> "Content note: the next moment involves a message with a suicidal thought. We'll show what the system does, not
> the message."
- **No** reproducir la nota de Luis.
> "A phrase from a fixed list goes straight to level 3: help opens on Luis's phone and the clinic gets a severe alert.
> Pablo doesn't even receive the message. He's told: 'Luis's clinic team has been told. You don't need to do
> anything else.'"

### 8 · Cierre (→ 4 veces hasta el final, días 59-62, 30 s)
> "So: the mentor offers company, never treatment. The clinic keeps clinical responsibility, and every patient who
> recovers can become the next companion, but only when they're ready."

## Preguntas que pueden hacer
- **"¿Qué datos recogéis?"**
  > "Today the prototype simulates several signals, but we're focusing on the ones that match how relapses start:
  > sleep, activity and social contact. Everything else is optional."
- **"¿Y si el mentor recae?"** → Paso 6: pausa, ideas paradas, su mentora pregunta, la clínica asigna un mentor temporal.
- **"¿Quién puede ser mentor?"**
  > "Only people the clinic invites once they're stable. It's an invitation, and they can say no or stop at any time."
- **"¿La IA decide algo clínico?"**
  > "No. Levels come from a fixed rule that compares each person only with their own usual. Crisis detection is a
  > fixed list. The AI only helps write warm messages."
- **"¿Está validado?"**
  > "We tested the logic on 200 synthetic people we generated: 88 % of simulated relapses caught, about 5 days early.
  > That shows the logic works as designed, not clinical accuracy. That needs a pilot with you."

## Si algo falla
- Algo se queda raro o atascado → **+** (reinicia todo y vuelve al principio).
- Las ideas tardan más de 10 s → seguir hablando; si fallan, salen ideas de plantilla igual de válidas.
- Sin internet → plan B de `docs/DEMO.md`, apartado 3.
