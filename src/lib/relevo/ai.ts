// Gemini solo en tres sitios (sección 0.4): T1 redactar la tarjeta de idea del mentor, T3 analizar el texto de las notas
// (copiloto) y T4 la frase de huella. NUNCA redacta textos para la clínica (sus resúmenes son plantillas deterministas).
// Solo recibe texto con seudónimos. Si no hay clave, falla o devuelve JSON no válido: se reintenta una vez y se usa la
// plantilla. El usuario no nota nada.
import { FORBIDDEN } from "./texts.ts";

const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

async function gemini<T>(prompt: string, schema: object, timeoutMs = 6000): Promise<T | null> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": key },
        signal: AbortSignal.timeout(timeoutMs),
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseMimeType: "application/json", responseSchema: schema, temperature: 0.6 } }),
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
    4500,
  );
  if (!out || typeof out.afecto_negativo !== "number" || typeof out.orientacion_accion !== "number") return null;
  const c = (v: number) => Math.max(0, Math.min(1, v));
  return { afecto_negativo: c(out.afecto_negativo), orientacion_accion: c(out.orientacion_accion), crisis: !!out.crisis };
}
