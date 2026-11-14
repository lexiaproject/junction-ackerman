// Derecho de acceso: la persona descarga todos sus datos en un archivo
import { currentUser, unauthorized } from "@/lib/app/auth";
import { getActions, getHealth, getStats, getThread } from "@/lib/app/repo";

export async function GET() {
  const u = await currentUser();
  if (!u) return unauthorized();
  const { passwordHash: _hidden, ...profile } = u;
  void _hidden;
  const partners = [u.mentorId, u.menteeId, u.supportId, ...(u.formerMenteeIds ?? [])].filter((x): x is string => !!x);
  const conversations = Object.fromEntries(await Promise.all(partners.map(async (p) => [p, await getThread(u.id, p)])));
  const data = {
    exportedAt: new Date().toISOString(),
    profile,
    inAppSignals: await getStats(u.id),
    healthSignals: await getHealth(u.id),
    mentorActions: u.role === "pupil" ? await getActions(u.id) : [],
    conversations,
  };
  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="relay-my-data.json"`,
    },
  });
}
