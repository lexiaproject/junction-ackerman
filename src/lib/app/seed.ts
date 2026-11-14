// MOCK: clínica y cuentas de prueba con 3 semanas de historial para que el jurado vea la app viva.
// Contraseña de todas las cuentas de prueba: relay-demo
import { hashPassword } from "./auth";
import { kdel, kget, kset } from "./kv";
import { addDays, saveActions, saveAlerts, saveClinic, saveHealth, saveStats, saveThread, saveUser, setEmailIndex, todayStr } from "./repo";
import type { ActionLog, Clinic, DayStats, HealthDay, Message, User } from "./types";

export const DEMO_PASSWORD = "relay-demo";
export const DEMO_CLINIC = "demo-clinic";
export const DEMO_ACCOUNTS = [
  { email: "mikko@relay.demo", who: "Mikko, mentor of Laura (she has early signs today)" },
  { email: "laura@relay.demo", who: "Laura, in TMS treatment" },
  { email: "aino@relay.demo", who: "Aino, mentor and former mentor of Mikko" },
  { email: "clinic@relay.demo", who: "Clinic team" },
];

const DAYS = 21;
const noise = (i: number, k: number) => {
  const x = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453;
  return (x - Math.floor(x)) * 2 - 1;
};

// decline(i) de 0 (normal) a 1 (peor) para cada día i del historial
function history(id: string, mentor: boolean, decline: (i: number) => number, sample = true) {
  const start = addDays(todayStr(), -DAYS);
  const stats: Record<string, DayStats> = {};
  const health: Record<string, HealthDay> = {};
  const seed = id.length;
  for (let i = 0; i < DAYS; i++) {
    const d = addDays(start, i);
    const f = decline(i);
    const n = (k: number) => noise(i + seed, k);
    const received = mentor ? 2 : 3;
    const replied = Math.max(0, Math.round(received * (0.95 - 0.75 * f) + 0.3 * n(1)));
    stats[d] = {
      opens: Math.max(0, Math.round((mentor ? 5 : 3) * (1 - 0.75 * f) + 0.6 * n(2))),
      night: Math.max(0, Math.round(3.2 * f + 0.4 * n(3))),
      received,
      replied,
      latencyMin: replied * Math.round(55 + 520 * f + 15 * n(4)),
    };
    if (sample)
      health[d] = {
        sleep: Math.round((7.4 - 2.3 * f + 0.25 * n(5)) * 10) / 10,
        steps: Math.round(7200 - 5000 * f + 500 * n(6)),
        outings: Math.max(0, Math.round(2 - 1.8 * f + 0.4 * n(7))),
        hrv: Math.round(49 - 14 * f + 2.5 * n(8)),
      };
  }
  return { stats, health };
}

const at = (dayIndex: number, hhmm: string) => `${addDays(todayStr(), -DAYS + dayIndex)}T${hhmm}:00.000Z`;
const msg = (id: string, from: string, dayIndex: number, hhmm: string, text: string, plan?: Message["plan"]): Message => ({
  id,
  from,
  text,
  at: at(dayIndex, hhmm),
  plan,
});

export async function ensureDemo(force = false) {
  if (!force && (await kget<string>("demo:seededOn")) === todayStr()) return;

  const clinic: Clinic = { id: DEMO_CLINIC, name: "Aalto TMS Clinic", phone: "+358 9 4512 3300", patientIds: [], earlyDays: 2 };
  const pw = hashPassword(DEMO_PASSWORD);
  const consent = { at: at(0, "08:00") };
  const base = { clinicId: clinic.id, status: "active" as const, createdAt: at(0, "08:00"), demo: true, consent };

  const users: User[] = [
    { ...base, id: "d-clinic", name: "Clinic team", role: "clinic", email: "clinic@relay.demo", passwordHash: pw },
    { ...base, id: "d-mikko", name: "Mikko", role: "mentor", email: "mikko@relay.demo", passwordHash: pw, treatment: "finished", menteeId: "d-laura", supportId: "d-aino", availability: "Weekdays 17–20", story: "Finished TMS in September. Walks by the sea got me through." },
    { ...base, id: "d-laura", name: "Laura", role: "pupil", email: "laura@relay.demo", passwordHash: pw, treatment: "in_treatment", mentorId: "d-mikko", sessions: { done: 14, total: 20, next: at(DAYS + 1, "07:30") } },
    { ...base, id: "d-aino", name: "Aino", role: "mentor", email: "aino@relay.demo", passwordHash: pw, treatment: "finished", menteeId: "d-ville", formerMenteeIds: ["d-mikko", "d-tomas"], availability: "Evenings and weekends", story: "Two years after TMS. I still swim every Sunday." },
    { ...base, id: "d-ville", name: "Ville", role: "pupil", email: "ville@relay.demo", passwordHash: pw, treatment: "finished", mentorId: "d-aino", sessions: { done: 20, total: 20 } },
    { ...base, id: "d-sara", name: "Sara", role: "mentor", email: "sara@relay.demo", passwordHash: pw, treatment: "finished", menteeId: "d-pekka", availability: "Mornings", story: "TMS in spring. Cooking with friends helped me most." },
    { ...base, id: "d-pekka", name: "Pekka", role: "pupil", email: "pekka@relay.demo", passwordHash: pw, treatment: "in_treatment", mentorId: "d-sara", sessions: { done: 9, total: 20, next: at(DAYS + 2, "11:00") } },
    { ...base, id: "d-tomas", name: "Tomas", role: "mentor", email: "tomas@relay.demo", passwordHash: pw, treatment: "finished", menteeId: "d-elina", supportId: "d-aino", availability: "Weekends" },
    { ...base, id: "d-elina", name: "Elina", role: "pupil", email: "elina@relay.demo", passwordHash: pw, treatment: "in_treatment", mentorId: "d-tomas", sessions: { done: 6, total: 20, next: at(DAYS + 1, "13:15") } },
    { ...base, id: "d-jari", name: "Jari", role: "mentor", email: "jari@relay.demo", passwordHash: pw, treatment: "finished", availability: "Weekdays after 18" },
    { ...base, id: "d-noora", name: "Noora", role: "pupil", email: "noora@relay.demo", passwordHash: pw, treatment: "in_treatment", createdAt: at(DAYS - 3, "09:00"), sessions: { done: 3, total: 20, next: at(DAYS + 1, "08:45") } },
    { ...base, id: "d-oskari", name: "Oskari", role: "pupil", status: "invited", treatment: "in_treatment", inviteCode: "OSK4RI", consent: undefined },
  ];
  clinic.patientIds = users.filter((u) => u.role !== "clinic").map((u) => u.id);

  // Historiales: quién está bien, quién empieza a empeorar y quién necesita una llamada
  const laura = (i: number) => (i >= 8 && i <= 10 ? 0.6 : i >= 18 ? [0.45, 0.7, 0.9][i - 18] : 0); // primeras señales hoy
  const pekka = (i: number) => (i >= 14 ? Math.min(1, (i - 13) * 0.22) : 0); // riesgo alto
  const tomas = (i: number) => (i >= 17 ? 0.75 : 0); // el mentor también empeora
  const flat = () => 0;
  const hist: [string, boolean, (i: number) => number][] = [
    ["d-laura", false, laura],
    ["d-mikko", true, flat],
    ["d-aino", true, flat],
    ["d-ville", false, flat],
    ["d-sara", true, flat],
    ["d-pekka", false, pekka],
    ["d-tomas", true, tomas],
    ["d-elina", false, flat],
    ["d-jari", true, flat],
  ];
  for (const [id, mentor, f] of hist) {
    const h = history(id, mentor, f);
    await saveStats(id, h.stats);
    await saveHealth(id, h.health);
  }
  // Noora acaba de empezar: solo 3 días (aún aprendiendo su rutina)
  const noora = history("d-noora", false, flat);
  const last3 = Object.keys(noora.stats).slice(-3);
  await saveStats("d-noora", Object.fromEntries(last3.map((d) => [d, noora.stats[d]])));
  await saveHealth("d-noora", Object.fromEntries(last3.map((d) => [d, noora.health[d]])));

  // Conversaciones
  await saveThread("d-laura", "d-mikko", [
    msg("m1", "d-mikko", 0, "16:10", "Hi Laura, I'm Mikko. I finished my TMS in September. The clinic thought we'd be a good match."),
    msg("m2", "d-mikko", 0, "16:11", "The first week felt strange to me too. Happy to tell you what it was like, and what helped."),
    msg("m3", "d-laura", 0, "18:40", "Hi Mikko! Honestly I'm a bit nervous about the sessions. Does it hurt?"),
    msg("m4", "d-mikko", 0, "19:02", "It's more like a tapping on your head. Loud, but you get used to it fast. Bring headphones for after."),
    msg("m5", "d-laura", 3, "15:20", "Session 4 done. Tired but okay."),
    msg("m6", "d-mikko", 3, "17:05", "That's four more than last week 🙂 Proud of you."),
    msg("m7", "d-mikko", 9, "17:30", "I'm walking by the shore tomorrow at 10. Want to join for 20 minutes?", { action: "walk", answer: "yes" }),
    msg("m8", "d-laura", 9, "20:55", "Okay, yes. I haven't been out much this week."),
    msg("m9", "d-laura", 10, "11:15", "Thanks for today. The sea air actually helped."),
    msg("m10", "d-mikko", 16, "17:40", "Coffee at Kaisa library on Saturday?", { action: "coffee", answer: "yes" }),
    msg("m11", "d-laura", 16, "19:10", "Sounds good!"),
    msg("m12", "d-laura", 14, "16:00", "Halfway through treatment. The nurses say I'm doing well."),
    msg("m13", "d-mikko", 14, "17:15", "That's huge. Halfway was when I started noticing small changes too."),
    msg("m14", "d-mikko", 19, "17:20", "How was this week's session?"),
    msg("m15", "d-mikko", 20, "18:05", "Hey, no pressure to answer. Just thinking of you."),
  ]);
  await saveThread("d-mikko", "d-aino", [
    msg("a1", "d-aino", 2, "19:00", "How is it going with your first mentee?"),
    msg("a2", "d-mikko", 2, "20:10", "Good! She's nervous, like I was. Reminds me of us a year ago."),
    msg("a3", "d-aino", 2, "20:30", "You'll be great. And I'm still here if you need me."),
  ]);
  await saveThread("d-pekka", "d-sara", [
    msg("s1", "d-sara", 1, "09:10", "Morning Pekka! How did the first session go?"),
    msg("s2", "d-pekka", 1, "12:30", "Fine. Long day."),
    msg("s3", "d-sara", 15, "09:05", "Want to cook something together on Thursday?", { action: "shared_activity", answer: "no" }),
    msg("s4", "d-pekka", 16, "23:50", "Not this week, sorry."),
    msg("s5", "d-sara", 18, "09:00", "No worries. I'm here whenever."),
  ]);
  await saveThread("d-ville", "d-aino", [
    msg("v1", "d-ville", 17, "14:00", "Last session today! I can't believe it."),
    msg("v2", "d-aino", 17, "18:30", "Congratulations! Maybe soon you'll be the one helping someone new 🙂"),
    msg("v3", "d-aino", 18, "10:00", "Sunday swim to celebrate? Töölö beach sauna, 11:00.", { action: "shared_activity", answer: "yes" }),
    msg("v4", "d-ville", 18, "12:20", "Yes! First time in the sea this winter."),
  ]);
  await saveThread("d-elina", "d-tomas", [msg("e1", "d-tomas", 4, "10:00", "Hi Elina, Tomas here. Weekends are my best time to chat.")]);
  

  // Registro de acciones: el paseo del día 9 ayudó (lo que el sistema "aprendió")
  const log: ActionLog[] = [
    { date: addDays(todayStr(), -DAYS + 9), action: "walk", level: "early", flagged: 4, helped: true },
    { date: addDays(todayStr(), -DAYS + 16), action: "coffee", level: "stable", flagged: 0, helped: true },
  ];
  await saveActions("d-laura", log);
  await saveActions("d-pekka", [{ date: addDays(todayStr(), -DAYS + 15), action: "shared_activity", level: "early", flagged: 2, helped: false }]);
  await saveActions("d-ville", []);
  await saveActions("d-elina", []);

  // Limpiar alertas y lo que pasó hoy (acciones hechas, sugerencias guardadas)
  await saveAlerts(clinic.id, []);
  const asOf = addDays(todayStr(), -1);
  for (const u of users)
    for (const lvl of ["early", "high"]) {
      await kdel(`done:${u.id}:${asOf}:${lvl}`);
      await kdel(`sugg:${u.id}:${asOf}:${lvl}`);
    }
  for (const u of users) {
    await saveUser(u);
    if (u.email) await setEmailIndex(u.email, u.id);
    if (u.inviteCode) await kset(`invite:${u.inviteCode}`, u.id);
  }
  await saveClinic(clinic);
  await kset("demo:seededOn", todayStr());
}
