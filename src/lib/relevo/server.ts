// Ayudas comunes de las rutas de API de Relevo
import { validWid } from "./store";

export const bad = (msg: string, status = 400) => Response.json({ error: msg }, { status });
export function wid(req: Request) {
  const w = new URL(req.url).searchParams.get("w");
  return validWid(w) ? w : null;
}
export const ok = (data: unknown) => Response.json(data, { headers: { "Cache-Control": "no-store" } });

// Qué puede hacer cada actor (el servidor lo comprueba; la interfaz no decide nada)
export const ALLOWED: Record<string, string[]> = {
  luis: ["onboard", "consent", "datatype", "notice", "plan", "plan_feedback", "help", "request"],
  pablo: ["worried", "m0_answer", "v1_answer", "idea", "notice", "rhythm", "help", "consent", "datatype", "copilot", "request", "leave", "plan", "plan_feedback"],
  marta: ["worried", "v1_answer", "idea", "notice", "rhythm", "help", "consent", "datatype", "copilot", "request", "leave"],
  clinic: ["call", "alert_take", "resolve", "ideas_pause", "ideas_reactivate", "clinic_rhythm", "match_propose", "match_cancel"],
};
