// La IA (Claude) elige UNA acción del catálogo y escribe el mensaje de ejemplo para el mentor.
// Si no hay clave o falla, usamos una respuesta fija para que la demo nunca se rompa.
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { CATALOG, fallbackSuggestion, type ActionKey, type Level, type Suggestion } from "@/lib/engine";

const SuggestionSchema = z.object({
  action: z.enum(Object.keys(CATALOG) as [ActionKey, ...ActionKey[]]),
  headline: z.string(),
  message: z.string(),
  explanation: z.string(),
});

export async function POST(req: Request) {
  const { level, changes, learned } = (await req.json()) as {
    level: Level;
    changes: string[];
    learned: string[];
  };
  const fallback = fallbackSuggestion(level);
  if (!process.env.ANTHROPIC_API_KEY) return Response.json(fallback);

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
    const client = new Anthropic({ timeout: 20_000, maxRetries: 1 });
    const response = await client.beta.messages.parse({
      model: "claude-opus-5-5",
      max_tokens: 2000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default", // si el modelo rechazara la petición, otro modelo la responde
      output_config: { effort: "low", format: betaZodOutputFormat(SuggestionSchema) },
      messages: [{ role: "user", content: prompt }],
    });
    if (response.stop_reason === "refusal" || !response.parsed_output) throw new Error(`No usable output (${response.stop_reason})`);
    const suggestion: Suggestion = { ...response.parsed_output, source: "claude" };
    return Response.json(suggestion);
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError) console.error("[suggest] Clave de Claude no válida");
    else if (err instanceof Anthropic.RateLimitError) console.error("[suggest] Límite de uso alcanzado");
    else console.error("[suggest] Claude falló, usamos la respuesta de reserva:", err);
    return Response.json(fallback);
  }
}
