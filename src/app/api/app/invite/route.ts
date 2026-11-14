// Comprueba un código de invitación antes de crear la cuenta
import { bad } from "@/lib/app/auth";
import { getClinic, getUserByInvite } from "@/lib/app/repo";
import { ensureDemo } from "@/lib/app/seed";

export async function GET(req: Request) {
  await ensureDemo();
  const code = new URL(req.url).searchParams.get("code") ?? "";
  const u = await getUserByInvite(code);
  if (!u || u.status !== "invited") return bad("That invite code isn't valid. Check it with your clinic.", 404);
  const clinic = await getClinic(u.clinicId);
  return Response.json({ name: u.name, role: u.role, clinic: clinic?.name ?? "" });
}
