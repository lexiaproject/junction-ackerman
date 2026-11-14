// Chat real entre mentor y pupilo (y con el antiguo mentor de apoyo)
import { bad, currentUser, unauthorized } from "@/lib/app/auth";
import { CATALOG } from "@/lib/app/ai";
import { markDone, assess } from "@/lib/app/logic";
import { getActions, getClinic, getThread, getUser, saveActions, saveThread, sendMessage, todayStr } from "@/lib/app/repo";
import type { Level, User } from "@/lib/app/types";

// Con quién puede hablar cada persona
function contacts(u: User) {
  return [u.mentorId, u.menteeId, u.supportId, ...(u.formerMenteeIds ?? [])].filter((x): x is string => !!x);
}

export async function GET(req: Request) {
  const u = await currentUser();
  if (!u) return unauthorized();
  const withId = new URL(req.url).searchParams.get("with");

  if (!withId) {
    const list = [];
    for (const id of contacts(u)) {
      const other = await getUser(id);
      if (!other) continue;
      const msgs = await getThread(u.id, id);
      const last = msgs[msgs.length - 1];
      const relation =
        id === u.mentorId ? "Your mentor" : id === u.menteeId ? "You mentor" : id === u.supportId ? "Your former mentor" : "Your former mentee";
      list.push({ id, name: other.name, relation, last: last ? { text: last.text, at: last.at, mine: last.from === u.id } : null });
    }
    return Response.json({ threads: list });
  }

  if (!contacts(u).includes(withId)) return bad("You can't message this person.", 403);
  const other = await getUser(withId);
  return Response.json({ with: { id: withId, name: other?.name ?? "" }, messages: await getThread(u.id, withId) });
}

export async function POST(req: Request) {
  const u = await currentUser();
  if (!u) return unauthorized();
  const body = (await req.json()) as { action: string; to?: string; text?: string; plan?: string; level?: Level; id?: string; answer?: "yes" | "no" };

  if (body.action === "dismiss") {
    if (!u.menteeId || (body.level !== "early" && body.level !== "high")) return bad("Nothing to dismiss.");
    await markDone(u.menteeId, body.level, "later");
    return Response.json({ ok: true });
  }

  const otherId = body.to ?? "";
  if (!contacts(u).includes(otherId)) return bad("You can't message this person.", 403);
  const other = await getUser(otherId);
  if (!other) return bad("Not found.", 404);

  if (body.action === "send") {
    const text = (body.text ?? "").trim();
    if (!text) return bad("Write a message first.");
    const plan = body.plan && body.plan in CATALOG && otherId === u.menteeId ? { action: body.plan } : undefined;
    const msg = await sendMessage(u, other, text, plan);

    // Responder: el mentor ha enviado la acción sugerida → se registra para aprender si ayudó
    if (plan && (body.level === "early" || body.level === "high")) {
      const clinic = await getClinic(u.clinicId);
      const a = clinic ? await assess(other, clinic) : null;
      const log = await getActions(other.id);
      await saveActions(other.id, [...log, { date: todayStr(), action: plan.action, level: body.level, flagged: a?.flagged ?? 0 }]);
      await markDone(other.id, body.level, "sent");
    }
    return Response.json({ ok: true, message: msg });
  }

  if (body.action === "answer") {
    // El pupilo acepta o no una invitación
    const msgs = await getThread(u.id, otherId);
    const m = msgs.find((x) => x.id === body.id);
    if (!m || !m.plan || m.from !== otherId) return bad("Invitation not found.", 404);
    m.plan.answer = body.answer === "yes" ? "yes" : "no";
    await saveThread(u.id, otherId, msgs);
    await sendMessage(u, other, body.answer === "yes" ? "Yes, let's do it." : "Not this time, but thank you for asking.");
    return Response.json({ ok: true });
  }

  return bad("Unknown action.");
}
