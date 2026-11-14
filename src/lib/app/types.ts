// Tipos de la app real (compartidos entre servidor y pantallas)

export type Role = "pupil" | "mentor" | "clinic";
export type Level = "learning" | "stable" | "early" | "high" | "crisis" | "paused";

export type User = {
  id: string;
  clinicId: string;
  name: string;
  role: Role;
  status: "invited" | "active";
  createdAt: string;
  email?: string;
  passwordHash?: string;
  inviteCode?: string;
  phone?: string;
  treatment?: "in_treatment" | "finished";
  consent?: { at: string; revokedAt?: string };
  availability?: string; // franja en la que el mentor suele estar disponible
  paused?: boolean; // el mentor ha pausado la mentoría
  mentorId?: string; // pupilo → su mentor
  menteeId?: string; // mentor → su pupilo (solo uno a la vez)
  supportId?: string; // mentor → su antiguo mentor (el relevo)
  formerMenteeIds?: string[]; // antiguo mentor → a quién sigue apoyando
  story?: string; // mentor: su historia en una frase (para la fase "conocerse")
  crisisAt?: string; // ha pedido ayuda y la clínica aún no lo ha atendido
  demo?: boolean;
};

export type Clinic = {
  id: string;
  name: string;
  phone: string;
  patientIds: string[];
  earlyDays: number; // días seguidos fuera de lo habitual para "primeras señales" (lo decide la clínica)
};

export type Message = {
  id: string;
  from: string;
  text: string;
  at: string;
  plan?: { action: string; answer?: "yes" | "no" }; // invitación concreta del mentor
};

// Señales recogidas dentro de la app (reales)
export type DayStats = { opens: number; night: number; received: number; replied: number; latencyMin: number };
// Señales de salud de muestra (solo cuentas de prueba; en la app nativa vendrían de Apple Health / Google Fit)
export type HealthDay = { sleep: number; steps: number; outings: number; hrv: number };

export type ActionLog = { date: string; action: string; level: Level; flagged: number; helped?: boolean };

export type Alert = {
  id: string;
  userId: string;
  kind: "crisis" | "mentor_support" | "mentor_paused";
  text: string;
  at: string;
  handledAt?: string;
};

export type Suggestion = {
  action: string;
  headline: string;
  message: string;
  explanation: string;
  source: "gemini" | "fallback";
};
