// Acceso a los datos de la app (usuarios, clínica, mensajes, señales, alertas)
import { randomBytes } from "node:crypto";
import { kdel, kget, kset } from "./kv";
import type { ActionLog, Alert, Clinic, DayStats, HealthDay, Message, Suggestion, User } from "./types";

export const newId = () => randomBytes(8).toString("hex");
export const todayStr = () => new Date().toISOString().slice(0, 10);
export const addDays = (date: string, n: number) => new Date(Date.parse(date) + n * 864e5).toISOString().slice(0, 10);
export const hasConsent = (u: User) => !!u.consent && !u.consent.revokedAt;

/* ---------- Usuarios ---------- */
export const getUser = (id: string) => kget<User>(`user:${id}`);
export const saveUser = (u: User) => kset(`user:${u.id}`, u);
export async function getUserByEmail(email: string) {
  const id = await kget<string>(`email:${email.trim().toLowerCase()}`);
  return id ? getUser(id) : null;
}
export const setEmailIndex = (email: string, id: string) => kset(`email:${email.trim().toLowerCase()}`, id);
export async function getUserByInvite(code: string) {
  const id = await kget<string>(`invite:${code.trim().toUpperCase()}`);
  return id ? getUser(id) : null;
}
export function newInviteCode() {
  const abc = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sin letras que se confunden (O/0, I/1)
  return Array.from(randomBytes(6), (b) => abc[b % abc.length]).join("");
}

/* ---------- Clínica ---------- */
export const getClinic = (id: string) => kget<Clinic>(`clinic:${id}`);
export const saveClinic = (c: Clinic) => kset(`clinic:${c.id}`, c);
export async function clinicPatients(c: Clinic) {
  const users = await Promise.all(c.patientIds.map(getUser));
  return users.filter((u): u is User => !!u);
}

/* ---------- Mensajes ---------- */
const threadKey = (a: string, b: string) => `thread:${[a, b].sort().join(":")}`;
export const getThread = async (a: string, b: string) => (await kget<Message[]>(threadKey(a, b))) ?? [];
export const saveThread = (a: string, b: string, msgs: Message[]) => kset(threadKey(a, b), msgs);

// Envía un mensaje y registra las señales reales: el otro "recibe" y, si el emisor contestaba a algo, cuenta como respuesta
export async function sendMessage(from: User, to: User, text: string, plan?: Message["plan"]) {
  const msgs = await getThread(from.id, to.id);
  const now = new Date();
  const last = msgs[msgs.length - 1];
  const msg: Message = { id: newId(), from: from.id, text: text.trim().slice(0, 1000), at: now.toISOString(), plan };
  await saveThread(from.id, to.id, [...msgs, msg]);
  if (hasConsent(to)) await bumpStats(to.id, { received: 1 });
  if (hasConsent(from) && last && last.from === to.id) {
    await bumpStats(from.id, { replied: 1, latencyMin: Math.round((now.getTime() - Date.parse(last.at)) / 60000) });
  }
  return msg;
}

/* ---------- Señales ---------- */
const EMPTY: DayStats = { opens: 0, night: 0, received: 0, replied: 0, latencyMin: 0 };
export const getStats = async (id: string) => (await kget<Record<string, DayStats>>(`stats:${id}`)) ?? {};
export const saveStats = (id: string, s: Record<string, DayStats>) => kset(`stats:${id}`, s);
export async function bumpStats(id: string, add: Partial<DayStats>, date = todayStr()) {
  const all = await getStats(id);
  const d = { ...EMPTY, ...all[date] };
  for (const [k, v] of Object.entries(add)) d[k as keyof DayStats] += v ?? 0;
  all[date] = d;
  await saveStats(id, all);
}
export const getHealth = async (id: string) => (await kget<Record<string, HealthDay>>(`health:${id}`)) ?? {};
export const saveHealth = (id: string, h: Record<string, HealthDay>) => kset(`health:${id}`, h);

/* ---------- Acciones, sugerencias y alertas ---------- */
export const getActions = async (pupilId: string) => (await kget<ActionLog[]>(`actions:${pupilId}`)) ?? [];
export const saveActions = (pupilId: string, a: ActionLog[]) => kset(`actions:${pupilId}`, a);
export const getSuggestion = (pupilId: string, key: string) => kget<Suggestion>(`sugg:${pupilId}:${key}`);
export const saveSuggestion = (pupilId: string, key: string, s: Suggestion) => kset(`sugg:${pupilId}:${key}`, s);

export const getAlerts = async (clinicId: string) => (await kget<Alert[]>(`alerts:${clinicId}`)) ?? [];
export const saveAlerts = (clinicId: string, a: Alert[]) => kset(`alerts:${clinicId}`, a);
// Añade una alerta si no hay ya una igual sin atender
export async function raiseAlert(clinicId: string, a: Omit<Alert, "id" | "at">) {
  const all = await getAlerts(clinicId);
  if (all.some((x) => x.userId === a.userId && x.kind === a.kind && !x.handledAt)) return;
  await saveAlerts(clinicId, [{ ...a, id: newId(), at: new Date().toISOString() }, ...all].slice(0, 200));
}

/* ---------- Borrar datos de una persona (derecho de supresión) ---------- */
export async function deleteUserData(u: User) {
  await Promise.all([kdel(`stats:${u.id}`), kdel(`health:${u.id}`), kdel(`actions:${u.id}`)]);
  for (const other of [u.mentorId, u.menteeId, u.supportId]) if (other) await kdel(threadKey(u.id, other));
  if (u.email) await kdel(`email:${u.email.toLowerCase()}`);
  if (u.inviteCode) await kdel(`invite:${u.inviteCode}`);
  // Desvincular de su pareja
  if (u.mentorId) {
    const m = await getUser(u.mentorId);
    if (m && m.menteeId === u.id) await saveUser({ ...m, menteeId: undefined });
  }
  if (u.menteeId) {
    const p = await getUser(u.menteeId);
    if (p && p.mentorId === u.id) await saveUser({ ...p, mentorId: undefined });
  }
  const c = await getClinic(u.clinicId);
  if (c) await saveClinic({ ...c, patientIds: c.patientIds.filter((id) => id !== u.id) });
  await kdel(`user:${u.id}`);
}
