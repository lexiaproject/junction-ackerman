// Pantalla "Hoy": distinta para mentor y pupilo
import { currentUser, unauthorized } from "@/lib/app/auth";
import { mentorToday, pupilToday } from "@/lib/app/logic";
import { getClinic } from "@/lib/app/repo";

export async function GET() {
  const u = await currentUser();
  if (!u) return unauthorized();
  const clinic = await getClinic(u.clinicId);
  if (!clinic) return Response.json({ error: "Clinic not found." }, { status: 404 });
  if (u.role === "mentor") return Response.json({ role: "mentor", ...(await mentorToday(u, clinic)) });
  if (u.role === "pupil") return Response.json({ role: "pupil", ...(await pupilToday(u)) });
  return Response.json({ role: "clinic" });
}
