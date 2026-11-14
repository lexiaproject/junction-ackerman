// Gemini solo en tres sitios (sección 0.4): T1 redactar la tarjeta de idea del mentor, T3 analizar el texto de las notas
// (copiloto) y T4 la frase de huella. NUNCA redacta textos para la clínica (sus resúmenes son plantillas deterministas).
// Solo recibe texto con seudónimos. Si no hay clave, falla o devuelve JSON no válido: se reintenta una vez y se usa la
// plantilla. El usuario no nota nada.
import { FORBIDDEN } from "./texts.ts";

const MODEL = process.env.GEMINI_MODEL || "gemini-3.8-flash";

async function gemini<T>(prompt: string, schema: object, timeoutMs = 10000): Promise<T | null> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": key },
        signal: AbortSignal.timeout(timeoutMs),
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseMimeType: "application/json", responseSchema: schema, temperature: 0.6, thinkingConfig: { thinkingLevel: "low" } } }),
      });
      if (!res.ok) throw new Error(`Gemini ${res.status}`);
      const data = await res.json();
      return JSON.parse(data.candidates[0].content.parts[0].text) as T;
    } catch (err) {
      console.error(`[relevo/ai] attempt ${attempt + 1} failed:`, (err as Error).message);
    }
  }
  return null;
}

/** T1: personaliza el mensaje sugerido de la tarjeta de idea. Nombres como seudónimos; palabras prohibidas -> plantilla. */
export async function draftIdeaMessage(p: { template: string; title: string; mentor: string; mentee: string }) {
  const out = await gemini<{ message: string }>(
    `You help a peer mentor (someone who finished TMS treatment for depression months ago) write a short voice-note script to the person they accompany.
Rewrite this suggested message so it sounds natural, warm and casual, first person, max 2 short sentences, same plan and same time:
"${p.template}"
The plan: ${p.title}. The mentor is ${p.mentor}; the person is ${p.mentee}. Keep the tokens ${p.mentor} and ${p.mentee} exactly as written.
Never mention health, sleep, data, sensors, symptoms, treatment, medication, diagnosis, dose or relapse. No emojis.`,
    { type: "OBJECT", properties: { message: { type: "STRING" } }, required: ["message"] },
  );
  const msg = out?.message?.trim();
  if (!msg || msg.length > 220 || FORBIDDEN.test(msg)) return null;
  return msg;
}

/** T3: afecto negativo y orientación a la acción de una nota (0-1). La crisis la decide la lista fija; esto solo puede añadir. */
export async function analyseNote(text: string) {
  const out = await gemini<{ afecto_negativo: number; orientacion_accion: number; crisis: boolean }>(
    `Rate this voice-note transcript between two peers (names are pseudonyms). Return:
- afecto_negativo: 0-1, how much negative affect it expresses
- orientacion_accion: 0-1, how much it proposes or plans a concrete action
- crisis: true only if it suggests a risk of self-harm or suicide
Transcript: "${text}"`,
    { type: "OBJECT", properties: { afecto_negativo: { type: "NUMBER" }, orientacion_accion: { type: "NUMBER" }, crisis: { type: "BOOLEAN" } }, required: ["afecto_negativo", "orientacion_accion", "crisis"] },
    8000,
  );
  if (!out || typeof out.afecto_negativo !== "number" || typeof out.orientacion_accion !== "number") return null;
  const c = (v: number) => Math.max(0, Math.min(1, v));
  return { afecto_negativo: c(out.afecto_negativo), orientacion_accion: c(out.orientacion_accion), crisis: !!out.crisis };
}

/* ---------- Ideas de respuesta para el mentor (botón "Ideas for your reply") ----------
   El mentor es un igual, no un clínico: las ideas se basan en técnicas de apoyo entre iguales con evidencia (validación,
   escucha reflexiva de la entrevista motivacional, activación conductual con pasos pequeños, lenguaje de esperanza y
   recuperación, pautas de comunicación segura). Nunca diagnostica, ni habla de medicación o tratamiento, ni da consejo
   clínico. Solo recibe texto con seudónimos. Si detecta riesgo, devuelve safety=true y no se enseñan respuestas. */
export const REPLY_TECHNIQUES = ["Validation", "Reflective listening", "Small shared step", "Hope and recovery", "Open question", "Gentle check-in"] as const;
export type ReplyIdea = { message: string; why: string; technique: (typeof REPLY_TECHNIQUES)[number] };
export async function suggestReplies(p: { conversation: string; mentor: string; mentee: string }) {
  const out = await gemini<{ opener: string; ideas: ReplyIdea[]; safety: boolean }>(
    `You are a warm, humble companion for ${p.mentor}, a peer mentor. ${p.mentor} finished TMS treatment for depression a few months ago and now
accompanies ${p.mentee}, who finished it recently. ${p.mentor} is NOT a clinician and has asked for help to answer ${p.mentee} well.

Read their recent voice-note conversation (transcripts, oldest first; names are pseudonym tokens):
${p.conversation}

Return JSON with:
- "opener": one or two warm, human sentences spoken directly to ${p.mentor} (use "you"). Acknowledge that caring this much matters and that
  there is no perfect reply. Gentle, never preachy, no exclamation marks.
- "ideas": exactly 3 different reply ideas ${p.mentor} could send to ${p.mentee}. Each has:
  - "message": first person, as ${p.mentor} would say it in a voice note, warm and casual, 1 to 3 short sentences, sounds like a friend who has
    been there, not like a therapist or a coach.
  - "why": one plain sentence explaining why this can help, naming the evidence-based peer-support principle behind it in everyday words
    (for example: feeling heard before being helped; reflecting back what you heard; one small step done together is easier than a big one;
    sharing your own experience briefly gives hope without pressure; an open question invites without demanding).
  - "technique": one of ${REPLY_TECHNIQUES.map((t) => `"${t}"`).join(", ")}. Use at least two different techniques.
- "safety": true if the conversation suggests any risk of self-harm, suicide or that someone is in danger; otherwise false.

Rules: follow peer-support and safe-messaging practice. Never diagnose, never mention medication, doses, treatment changes, symptoms or
disorders, never give medical or clinical advice, never mention data, sleep figures or sensors, never promise outcomes, never minimise
feelings, no toxic positivity ("cheer up", "look on the bright side"), no pressure to reply. Keep the tokens ${p.mentor} and ${p.mentee}
exactly as written. English. No emojis.`,
    {
      type: "OBJECT",
      properties: {
        opener: { type: "STRING" },
        ideas: { type: "ARRAY", items: { type: "OBJECT", properties: { message: { type: "STRING" }, why: { type: "STRING" }, technique: { type: "STRING", enum: [...REPLY_TECHNIQUES] } }, required: ["message", "why", "technique"] } },
        safety: { type: "BOOLEAN" },
      },
      required: ["opener", "ideas", "safety"],
    },
    12000,
  );
  if (!out || typeof out.opener !== "string" || !Array.isArray(out.ideas)) return null;
  if (out.safety) return { safety: true as const };
  const clean = (s: unknown, max: number) => (typeof s === "string" && s.trim().length > 0 && s.length <= max && !FORBIDDEN.test(s) ? s.trim() : null);
  const opener = clean(out.opener, 320);
  const ideas = out.ideas
    .map((i) => ({ message: clean(i?.message, 300), why: clean(i?.why, 260), technique: REPLY_TECHNIQUES.includes(i?.technique) ? i.technique : null }))
    .filter((i): i is ReplyIdea => !!i.message && !!i.why && !!i.technique)
    .slice(0, 3);
  if (!opener || ideas.length < 2) return null; // texto dudoso o incompleto -> ideas de plantilla
  return { safety: false as const, opener, ideas };
}
