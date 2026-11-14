// La persona que ha iniciado sesión: datos, consentimiento, perfil, ayuda, pausa y borrado
import { bad, currentUser, endSession, unauthorized } from "@/lib/app/auth";
import { bumpStats, deleteUserData, getAlerts, getClinic, getUser, hasConsent, raiseAlert, saveAlerts, saveUser } from "@/lib/app/repo";
import { ensureDemo } from "@/lib/app/seed";
import type { User } from "@/lib/app/types";

const publicUser = (u: User) => ({
  id: u.id,
  name: u.name,
  role: u.role,
  email: u.email,
  treatment: u.treatment,
  consent: u.consent ?? null,
  availability: u.availability ?? "",
  story: u.story ?? "",
  paused: !!u.paused,
  demo: !!u.demo,
  crisis: !!u.crisisAt,
});

export async function GET() {
  await ensureDemo();
  const u = await currentUser();
  if (!u) return unauthorized();
  const clinic = await getClinic(u.clinicId);
  return Response.json({ user: publicUser(u), clinic: clinic ? { name: clinic.name, phone: clinic.phone } : null });
}

export async function POST(req: Request) {
  const u = await currentUser();
  if (!u) return unauthorized();
  const body = (await req.json()) as {
    action: string;
    give?: boolean;
    availability?: string;
    story?: string;
    hour?: number;
    about?: "me" | "mentee";
    paused?: boolean;
  };

  switch (body.action) {
    case "consent": {
      const consent = body.give ? { at: new Date().toISOString() } : { at: u.consent?.at ?? new Date().toISOString(), revokedAt: new Date().toISOString() };
      await saveUser({ ...u, consent });
      return Response.json({ ok: true });
    }
    case "profile":
      await saveUser({ ...u, availability: (body.availability ?? u.availability ?? "").slice(0, 60), story: (body.story ?? u.story ?? "").slice(0, 200) });
      return Response.json({ ok: true });
    case "ping": {
      // Señal real: abrir la app (y si es de madrugada). Solo con consentimiento.
      if (hasConsent(u) && u.role !== "clinic") {
        const h = Number(body.hour);
        await bumpStats(u.id, { opens: 1, night: h >= 0 && h < 5 ? 1 : 0 });
      }
      return Response.json({ ok: true });
    }
    case "help": {
      // Protocolo de crisis: la alerta va directa a la clínica, nunca al mentor
      const target = body.about === "mentee" && u.menteeId ? await getUser(u.menteeId) : u;
      if (!target) return bad("Not found.", 404);
      await saveUser({ ...target, crisisAt: new Date().toISOString() });
      await raiseAlert(u.clinicId, {
        userId: target.id,
        kind: "crisis",
        text: target.id === u.id ? `${u.name} pressed "I need help now".` : `${u.name} (mentor) is worried about ${target.name} and asked the clinic to step in.`,
      });
      return Response.json({ ok: true });
    }
    case "data_request": {
      // Derecho de acceso: la persona pide una copia y la clínica se la entrega (los gráficos no se muestran en la app)
      await raiseAlert(u.clinicId, { userId: u.id, kind: "data_request", text: `${u.name} asked for a copy of their data. Send it to them within one month.` });
      return Response.json({ ok: true });
    }
    case "pause": {
      if (u.role !== "mentor") return bad("Only mentors can pause.");
      await saveUser({ ...u, paused: !!body.paused });
      if (body.paused) await raiseAlert(u.clinicId, { userId: u.id, kind: "mentor_paused", text: `${u.name} paused mentoring. Check in and cover their mentee if needed.` });
      else {
        // Al reanudar, la alerta de pausa ya no hace falta
        const alerts = await getAlerts(u.clinicId);
        for (const a of alerts) if (a.userId === u.id && a.kind === "mentor_paused" && !a.handledAt) a.handledAt = new Date().toISOString();
        await saveAlerts(u.clinicId, alerts);
      }
      return Response.json({ ok: true });
    }
    case "delete": {
      if (u.role === "clinic") return bad("Clinic accounts can't be deleted here.");
      await deleteUserData(u);
      await endSession();
      return Response.json({ ok: true });
    }
  }
  return bad("Unknown action.");
}
