"use client";
// Entrar con un clic en una cuenta de prueba (para el jurado)

import { useState } from "react";
import { Avatar, Chevron, api } from "./ui";

const ACCOUNTS = [
  { email: "mikko@relay.demo", name: "Mikko", role: "Mentor", note: "His mentee Laura shows early signs today. See what Relay suggests." },
  { email: "laura@relay.demo", name: "Laura", role: "In TMS treatment", note: "Gets invitations from Mikko. Doesn't have to do anything." },
  { email: "aino@relay.demo", name: "Aino", role: "Mentor, two years after TMS", note: "Mentored Mikko once. Relay asks her to check on Tomas." },
  { email: "clinic@relay.demo", name: "Clinic", role: "Aalto TMS Clinic", note: "Who needs a call today, alerts, matching and the relay." },
];

export default function TryButtons() {
  const [busy, setBusy] = useState("");
  async function go(email: string) {
    setBusy(email);
    try {
      const r = await api<{ role: string }>("/api/app/auth", { action: "demo", email });
      window.location.assign(r.role === "clinic" ? "/clinic" : "/app"); // recarga completa: la sesión es nueva
    } catch {
      setBusy("");
    }
  }
  return (
    <ul className="card divide-y divide-mist">
      {ACCOUNTS.map((a) => (
        <li key={a.email}>
          <button
            onClick={() => go(a.email)}
            disabled={!!busy}
            className="flex w-full items-center gap-4 px-4 py-3.5 text-left transition-colors hover:bg-birch/70 disabled:opacity-60"
          >
            <Avatar name={a.name} />
            <span className="min-w-0 flex-1">
              <span className="font-semibold">{a.name}</span> <span className="muted text-sm">{a.role}</span>
              <span className="muted block text-sm">{busy === a.email ? "Opening…" : a.note}</span>
            </span>
            <Chevron />
          </button>
        </li>
      ))}
    </ul>
  );
}
