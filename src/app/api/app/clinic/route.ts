// Panel de la clínica: pacientes, invitaciones, parejas, alertas, relevo y umbrales
import { bad, currentUser, unauthorized } from "@/lib/app/auth";
import { clinicOverview } from "@/lib/app/logic";
import { kset } from "@/lib/app/kv";
import { getAlerts, getClinic, getUser, newId, newInviteCode, saveAlerts, saveClinic, saveUser } from "@/lib/app/repo";
import { ensureDemo } from "@/lib/app/seed";

async function clinicStaff() {
  const u = await currentUser();
  if (!u || u.role !== "clinic") return null;
  const clinic = await getClinic(u.clinicId);
  return clinic ? { u, clinic } : null;
}

export async function GET() {
  const s = await clinicStaff();
  if (!s) return unauthorized();
  return Response.json(await clinicOverview(s.clinic));
}

export async function POST(req: Request) {
  const s = await clinicStaff();
  if (!s) return unauthorized();
  const { clinic } = s;
  const body = (await req.json()) as Record<string, string | number | undefined>;
  const str = (k: string) => String(body[k] ?? "").trim();

  switch (body.action) {
    case "invite": {
      const name = str("name").slice(0, 40);
      const role = body.role === "mentor" ? "mentor" : "pupil";
      if (!name) return bad("Write the patient's name.");
      const code = newInviteCode();
      const id = newId();
      await saveUser({
        id,
        clinicId: clinic.id,
        name,
        role,
        status: "invited",
        inviteCode: code,
        createdAt: new Date().toISOString(),
        treatment: body.treatment === "finished" ? "finished" : "in_treatment",
        phone: str("phone").slice(0, 30) || undefined,
      });
      await kset(`invite:${code}`, id);
      await saveClinic({ ...clinic, patientIds: [...clinic.patientIds, id] });
      return Response.json({ ok: true, code });
    }
    case "pair": {
      // Un mentor acompaña a una sola persona
      const pupil = await getUser(str("pupilId"));
      const mentor = await getUser(str("mentorId"));
      if (!pupil || !mentor || pupil.role !== "pupil" || mentor.role !== "mentor") return bad("Choose a pupil and a mentor.");
      if (mentor.menteeId) return bad(`${mentor.name} already mentors someone.`);
      await saveUser({ ...pupil, mentorId: mentor.id });
      await saveUser({ ...mentor, menteeId: pupil.id });
      return Response.json({ ok: true });
    }
    case "promote": {
      // El relevo: el pupilo que termina el TMS pasa a ser mentor; su mentor sigue como apoyo
      const pupil = await getUser(str("pupilId"));
      if (!pupil || pupil.role !== "pupil") return bad("Not a pupil.");
      const oldMentor = pupil.mentorId ? await getUser(pupil.mentorId) : null;
      await saveUser({ ...pupil, role: "mentor", treatment: "finished", mentorId: undefined, supportId: oldMentor?.id });
      if (oldMentor)
        await saveUser({ ...oldMentor, menteeId: undefined, formerMenteeIds: [...new Set([...(oldMentor.formerMenteeIds ?? []), pupil.id])] });
      return Response.json({ ok: true });
    }
    case "treatment": {
      const p = await getUser(str("id"));
      if (!p) return bad("Not found.", 404);
      await saveUser({ ...p, treatment: body.treatment === "finished" ? "finished" : "in_treatment" });
      return Response.json({ ok: true });
    }
    case "handle": {
      const alerts = await getAlerts(clinic.id);
      const a = alerts.find((x) => x.id === str("alertId"));
      if (!a) return bad("Alert not found.", 404);
      a.handledAt = new Date().toISOString();
      await saveAlerts(clinic.id, alerts);
      if (a.kind === "crisis") {
        const p = await getUser(a.userId);
        if (p) await saveUser({ ...p, crisisAt: undefined });
      }
      return Response.json({ ok: true });
    }
    case "settings": {
      const n = Number(body.earlyDays);
      if (![2, 3, 4].includes(n)) return bad("Choose 2, 3 or 4 days.");
      await saveClinic({ ...clinic, earlyDays: n });
      return Response.json({ ok: true });
    }
    case "reset":
      if (clinic.id !== "demo-clinic") return bad("Only the demo clinic can be reset.");
      await ensureDemo(true);
      return Response.json({ ok: true });
  }
  return bad("Unknown action.");
}
