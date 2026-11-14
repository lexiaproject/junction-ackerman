// Contraseñas cifradas (scrypt) y sesiones con cookie httpOnly
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { kdel, kget, kset } from "./kv";
import { getUser } from "./repo";
import type { User } from "./types";

const COOKIE = "relay_session";
const DAYS = 30;

export function hashPassword(pw: string) {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(pw, salt, 64).toString("hex")}`;
}

export function checkPassword(pw: string, stored?: string) {
  if (!stored) return false;
  const [salt, hash] = stored.split(":");
  const a = Buffer.from(hash, "hex");
  const b = scryptSync(pw, salt, 64);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function startSession(userId: string) {
  const token = randomBytes(32).toString("hex");
  await kset(`session:${token}`, { userId, exp: Date.now() + DAYS * 864e5 });
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: DAYS * 86400,
  });
}

export async function endSession() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) await kdel(`session:${token}`);
  jar.delete(COOKIE);
}

export async function currentUser(): Promise<User | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  const s = await kget<{ userId: string; exp: number }>(`session:${token}`);
  if (!s || s.exp < Date.now()) return null;
  return getUser(s.userId);
}

export const unauthorized = () => Response.json({ error: "Please log in." }, { status: 401 });
export const bad = (error: string, status = 400) => Response.json({ error }, { status });
