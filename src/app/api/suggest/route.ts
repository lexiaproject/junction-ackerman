// La IA (Gemini) elige UNA acción del catálogo y escribe el mensaje de ejemplo para el mentor.
// Si no hay clave o falla, usamos una respuesta fija para que la demo nunca se rompa.
import { CATALOG, fallbackSuggestion, type Level, type Suggestion } from "@/lib/engine";

const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

export async function POST(req: Request) {
  const { level, changes, learned } = (await req.json()) as {
    level: Level;
    changes: string[];
    learned: string[];
  };
  const fallback = fallbackSuggestion(level);
  const key = process.env.GEMINI_API_KEY;
  if (!key) return Response.json(fallback);

  const prompt = `You support a peer-mentor programme for people who had TMS treatment for depression.
A mentor (Mikko, a former patient) supports a pupil (Laura, currently in treatment).
The system compared Laura's passive phone signals with Laura's own first week and found:
${changes.map((c) => "- " + c).join("\n")}
Risk level: ${level === "high" ? "HIGH (several signals, several days)" : "EARLY SIGNS"}.
${learned.length ? `What has worked for this pair before: ${learned.join(", ")}.` : ""}

Pick ONE action from this catalogue: ${Object.entries(CATALOG)
    .map(([k, v]) => `${k} (${v})`)
    .join("; ")}.
${level === "high" ? "At high risk prefer more direct contact (call or meeting)." : "At early signs prefer an easy, low-effort plan."}

Rules:
- "headline": what the mentor reads, max 9 words, warm, uses the name Laura, NO health data, numbers or sensor names.
- "message": a sample message from Mikko to Laura, first person, max 2 short sentences, casual, concrete time if it is a plan, no medical advice, never mention data or sensors.
- "explanation": for the clinic only, max 30 words, why this action fits these changes.`;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
      {
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
      },
    );
    if (!res.ok) throw new Error(`Gemini ${res.status}: ${await res.text()}`);
    const data = await res.json();
    const parsed = JSON.parse(data.candidates[0].content.parts[0].text);
    if (!(parsed.action in CATALOG)) throw new Error("Unknown action " + parsed.action);
    const suggestion: Suggestion = { ...parsed, source: "gemini" };
    return Response.json(suggestion);
  } catch (err) {
    console.error("[suggest] Gemini failed, using fallback:", err);
    return Response.json(fallback);
  }
}
