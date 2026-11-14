// Gemini elige UNA acción de un catálogo validado y escribe un mensaje de ejemplo para el mentor.
// La IA sugiere; el mentor decide si lo envía. Sin clave o si falla: respuesta fija.
import type { Level, Suggestion } from "./types";

export const CATALOG: Record<string, string> = {
  walk: "A short walk together",
  coffee: "A coffee together",
  call: "A short call",
  sleep_routine: "Share what helped your sleep",
  shared_activity: "Something to do together",
  hello: "A short hello",
};

const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

function fallback(level: Level, pupil: string, learned: string[]): Suggestion {
  if (level === "high")
    return {
      action: "call",
      headline: `${pupil} could use more contact right now`,
      message: "Hey, I've been thinking of you. Can I call you this evening, just ten minutes?",
      explanation: "Several signals have stayed off their own baseline for days. A direct, personal call is the next step; the mentor also points to the clinic.",
      source: "fallback",
    };
  const action = learned.includes("coffee") ? "coffee" : "walk";
  return {
    action,
    headline: `${pupil} might be having a quieter week`,
    message:
      action === "coffee"
        ? "Fancy a quick coffee tomorrow afternoon? My treat, no pressure."
        : "I'm heading out for a walk tomorrow at 10. Want to join me for 20 minutes? No pressure.",
    explanation: "A few signals drifted from their own baseline for several days. A small plan with someone is the easiest thing to say yes to.",
    source: "fallback",
  };
}

export async function suggest(p: { level: Level; mentor: string; pupil: string; changes: string[]; learned: string[] }): Promise<Suggestion> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return fallback(p.level, p.pupil, p.learned);

  const prompt = `You support a peer-mentor programme for people treated with TMS for depression.
${p.mentor} (a former patient) mentors ${p.pupil} (currently in treatment). The mentor is not a therapist.
The system compared ${p.pupil}'s passive signals with ${p.pupil}'s own first week and found:
${p.changes.map((c) => "- " + c).join("\n")}
Risk level: ${p.level === "high" ? "HIGH (several signals, several days)" : "EARLY SIGNS"}.
${p.learned.length ? `What has helped this pair before: ${p.learned.map((a) => CATALOG[a] ?? a).join(", ")}.` : ""}

Pick ONE action from this validated catalogue: ${Object.entries(CATALOG)
    .map(([k, v]) => `${k} (${v})`)
    .join("; ")}.
${p.level === "high" ? "At high risk prefer more direct contact (call or meeting)." : "At early signs prefer an easy, low-effort plan; prefer what has helped before."}

Rules:
- "headline": what the mentor reads, max 9 words, warm, uses the name ${p.pupil}, NO health data, numbers or sensor names.
- "message": a sample message from ${p.mentor} to ${p.pupil}, first person, max 2 short sentences, casual, concrete time if it is a plan, no medical advice, never mention data or sensors.
- "explanation": for the clinic only, max 30 words, why this action fits these changes.`;

  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      signal: AbortSignal.timeout(10000),
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: {
            type: "OBJECT",
            properties: {
              action: { type: "STRING", enum: Object.keys(CATALOG) },
              headline: { type: "STRING" },
              message: { type: "STRING" },
              explanation: { type: "STRING" },
            },
            required: ["action", "headline", "message", "explanation"],
          },
        },
      }),
    });
    if (!res.ok) throw new Error(`Gemini ${res.status}: ${await res.text()}`);
    const data = await res.json();
    const parsed = JSON.parse(data.candidates[0].content.parts[0].text);
    if (!(parsed.action in CATALOG)) throw new Error("Unknown action " + parsed.action);
    return { ...parsed, source: "gemini" };
  } catch (err) {
    console.error("[ai] Gemini failed, using fallback:", err);
    return fallback(p.level, p.pupil, p.learned);
  }
}
