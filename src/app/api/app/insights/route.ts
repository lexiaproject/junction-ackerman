// Pestaña "Me": impacto del mentor y tratamiento. Las señales de salud NO se envían al paciente: solo las ve la clínica
import { currentUser, unauthorized } from "@/lib/app/auth";
import { getThread, getUser } from "@/lib/app/repo";

export async function GET() {
  const u = await currentUser();
  if (!u) return unauthorized();

  // Impacto del mentor: calculado de sus conversaciones reales
  let impact = null;
  if (u.role === "mentor") {
    const people = [u.menteeId, ...(u.formerMenteeIds ?? [])].filter((x): x is string => !!x);
    let sent = 0;
    let invites = 0;
    let accepted = 0;
    let first: string | null = null;
    for (const id of people) {
      for (const m of await getThread(u.id, id)) {
        if (!first || m.at < first) first = m.at;
        if (m.from !== u.id) continue;
        sent++;
        if (m.plan) {
          invites++;
          if (m.plan.answer === "yes") accepted++;
        }
      }
    }
    const names = await Promise.all(people.map(async (id) => (await getUser(id))?.name ?? ""));
    impact = {
      days: first ? Math.max(1, Math.round((Date.now() - Date.parse(first)) / 864e5)) : 0,
      people: names.filter(Boolean),
      sent,
      invites,
      accepted,
    };
  }

  return Response.json({ impact, sessions: u.sessions ?? null });
}
