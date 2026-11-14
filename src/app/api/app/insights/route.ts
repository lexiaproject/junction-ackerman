// "Tu semana": la persona ve SUS propias señales (derecho de acceso) y, si es mentor, su impacto
import { currentUser, unauthorized } from "@/lib/app/auth";
import { assess } from "@/lib/app/logic";
import { getClinic, getThread, getUser } from "@/lib/app/repo";
import { SIGNALS } from "@/lib/app/signals";

export async function GET() {
  const u = await currentUser();
  if (!u) return unauthorized();
  const clinic = await getClinic(u.clinicId);
  if (!clinic) return Response.json({ error: "Clinic not found." }, { status: 404 });

  const a = await assess(u, clinic);
  const last = (s: (number | null)[]) => s.slice(-14);
  const signals = a.statuses.map((s) => ({
    key: s.key,
    label: SIGNALS[s.key].label,
    unit: SIGNALS[s.key].unit,
    kind: SIGNALS[s.key].kind,
    digits: SIGNALS[s.key].digits,
    mean: s.mean,
    threshold: s.threshold,
    run: s.run,
    off: s.run >= clinic.earlyDays,
    series: last(s.series),
  }));

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

  return Response.json({
    level: a.level,
    dates: a.dates.slice(-14),
    signals,
    impact,
    sessions: u.sessions ?? null,
  });
}
