// Derecho de acceso: la clínica descarga todos los datos de una persona de su clínica para entregárselos
// (el paciente lo pide desde la app; no ve sus gráficos directamente)
import { currentUser, unauthorized } from "@/lib/app/auth";
import { getActions, getHealth, getStats, getThread, getUser } from "@/lib/app/repo";

export async function GET(req: Request) {
  const me = await currentUser();
  if (!me) return unauthorized();
  const id = new URL(req.url).searchParams.get("id");
  const u = me.role === "clinic" && id ? await getUser(id) : null;
  if (!u || u.clinicId !== me.clinicId) return Response.json({ error: "Only your clinic can export this data." }, { status: 403 });

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
      "Content-Disposition": `attachment; filename="relay-data-${u.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.json"`,
    },
  });
}
