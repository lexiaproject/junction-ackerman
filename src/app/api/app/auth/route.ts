// Iniciar sesión, darse de alta con código de invitación y cerrar sesión
import { bad, checkPassword, endSession, hashPassword, startSession } from "@/lib/app/auth";
import { getUserByEmail, getUserByInvite, saveUser, setEmailIndex } from "@/lib/app/repo";
import { kdel } from "@/lib/app/kv";
import { ensureDemo } from "@/lib/app/seed";

export async function POST(req: Request) {
  const body = (await req.json()) as { action: string; email?: string; password?: string; code?: string };
  await ensureDemo();

  if (body.action === "logout") {
    await endSession();
    return Response.json({ ok: true });
  }

  const email = (body.email ?? "").trim().toLowerCase();
  const password = body.password ?? "";

  if (body.action === "login") {
    const u = await getUserByEmail(email);
    if (!u || !checkPassword(password, u.passwordHash)) return bad("That email and password don't match.", 401);
    await startSession(u.id);
    return Response.json({ ok: true, role: u.role });
  }

  if (body.action === "demo") {
    // Acceso con un clic para el jurado: SOLO cuentas de prueba
    const u = await getUserByEmail(email);
    if (!u || !u.demo) return bad("That isn't a test account.", 403);
    await startSession(u.id);
    return Response.json({ ok: true, role: u.role });
  }

  if (body.action === "join") {
    const u = await getUserByInvite(body.code ?? "");
    if (!u || u.status !== "invited") return bad("That invite code isn't valid. Check it with your clinic.");
    if (!/^\S+@\S+\.\S+$/.test(email)) return bad("Enter a valid email.");
    if (password.length < 8) return bad("Use at least 8 characters for your password.");
    if (await getUserByEmail(email)) return bad("There's already an account with that email. Log in instead.");
    await kdel(`invite:${u.inviteCode}`);
    await saveUser({ ...u, email, passwordHash: hashPassword(password), status: "active", inviteCode: undefined });
    await setEmailIndex(email, u.id);
    await startSession(u.id);
    return Response.json({ ok: true, role: u.role });
  }

  return bad("Unknown action.");
}
