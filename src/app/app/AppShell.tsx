"use client";
// Marco de la app del paciente: cabecera con ayuda siempre visible, pestañas abajo y datos de la persona

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useState } from "react";
import { Button, Logo, api, useLive } from "../ui";

export type Me = {
  user: {
    id: string;
    name: string;
    role: "pupil" | "mentor" | "clinic";
    email?: string;
    treatment?: string;
    consent: { at: string; revokedAt?: string } | null;
    availability: string;
    story: string;
    paused: boolean;
    demo: boolean;
    crisis: boolean;
  };
  clinic: { name: string; phone: string } | null;
};

const MeContext = createContext<{ me: Me; reload: () => Promise<void> } | null>(null);
export const useMe = () => useContext(MeContext)!;

const TABS = [
  { href: "/app", label: "Today", icon: "M4 11.5 12 5l8 6.5V20h-5v-5h-6v5H4z" },
  { href: "/app/chat", label: "Chat", icon: "M4 5h16v11H9l-5 4z" },
  { href: "/app/me", label: "Me", icon: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm-8 8a8 8 0 0 1 16 0z" },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { data: me, reload } = useLive<Me>("/api/app/me");
  const router = useRouter();
  const path = usePathname();
  const [help, setHelp] = useState(false);

  // Redirecciones: la clínica tiene su propio panel; sin consentimiento inicial se pasa por la bienvenida
  useEffect(() => {
    if (!me) return;
    if (me.user.role === "clinic") router.replace("/clinic");
    else if (!me.user.consent) router.replace("/join");
  }, [me, router]);

  // Señal real: cada vez que la persona abre la app (y la hora, para detectar uso de madrugada)
  useEffect(() => {
    const ping = () => !document.hidden && api("/api/app/me", { action: "ping", hour: new Date().getHours() }).catch(() => {});
    ping();
    document.addEventListener("visibilitychange", ping);
    return () => document.removeEventListener("visibilitychange", ping);
  }, []);

  if (!me || me.user.role === "clinic" || !me.user.consent) return <p className="muted p-6">Loading…</p>;

  return (
    <MeContext.Provider value={{ me, reload }}>
      <div className="mx-auto flex h-dvh w-full max-w-md flex-col bg-birch sm:border-x sm:border-mist sm:shadow-[0_0_48px_-24px_rgb(14_35_31/0.3)]">
        <div className="brand-rule" />
        <header className="flex items-center justify-between border-b border-mist bg-paper px-4 py-2.5">
          <Logo className="text-xl" />
          <button onClick={() => setHelp(true)} className="btn btn-sm btn-danger-outline">
            Get help
          </button>
        </header>
        <main className="flex min-h-0 flex-1 flex-col overflow-y-auto">{children}</main>
        <nav className="grid grid-cols-3 border-t border-mist bg-paper pb-[env(safe-area-inset-bottom)]">
          {TABS.map((t) => {
            const active = t.href === "/app" ? path === "/app" : path.startsWith(t.href);
            return (
              <Link
                key={t.href}
                href={t.href}
                aria-current={active ? "page" : undefined}
                className={`relative flex min-h-14 flex-col items-center justify-center gap-1 text-xs transition-colors ${
                  active ? "font-semibold text-pine" : "text-pine/50 hover:text-pine/80"
                }`}
              >
                {active && <span className="absolute inset-x-8 top-0 h-0.5 rounded-b bg-pine" />}
                <svg viewBox="0 0 24 24" className="h-[22px] w-[22px]" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" aria-hidden>
                  <path d={t.icon} />
                </svg>
                {t.label}
              </Link>
            );
          })}
        </nav>
      </div>
      {help && <HelpSheet me={me} onClose={() => setHelp(false)} onSent={reload} />}
    </MeContext.Provider>
  );
}

// Protocolo de crisis: 112 y la clínica siempre a mano; la alerta va a la clínica, nunca al mentor
function HelpSheet({ me, onClose, onSent }: { me: Me; onClose: () => void; onSent: () => Promise<void> }) {
  const [sent, setSent] = useState("");
  const [busy, setBusy] = useState(false);
  async function alertClinic(about: "me" | "mentee") {
    setBusy(true);
    try {
      await api("/api/app/me", { action: "help", about });
      setSent(about === "me" ? "Your clinic has been alerted and will contact you today." : "The clinic has been alerted and will take it from here. You don't need to do anything else.");
      await onSent();
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-pine-deep/45" onClick={onClose}>
      <div role="dialog" aria-label="Get help" className="arrive w-full max-w-md rounded-t-2xl bg-paper px-5 pb-8 pt-3 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mx-auto mb-4 h-1 w-10 rounded bg-mist" />
        <h2 className="text-2xl font-bold">Get help</h2>
        <p className="muted mt-1">If you or someone else is in danger right now, call the emergency number.</p>
        <a href="tel:112" className="btn btn-danger btn-lg mt-4 w-full">
          Call 112
        </a>
        {me.clinic && (
          <a href={`tel:${me.clinic.phone.replace(/\s/g, "")}`} className="btn btn-secondary btn-lg mt-2 w-full">
            Call your clinic <span className="num font-normal">{me.clinic.phone}</span>
          </a>
        )}
        <div className="mt-5 border-t border-mist pt-4">
          {sent ? (
            <p className="rounded-lg border border-moss/30 bg-moss/10 px-3 py-2.5">{sent}</p>
          ) : (
            <>
              <p className="muted text-sm">Not an emergency, but you need the clinic to reach out?</p>
              <div className="mt-2 flex flex-col gap-2">
                <Button kind="danger-outline" disabled={busy} onClick={() => alertClinic("me")}>
                  {me.user.role === "pupil" ? "I need help now" : "Ask the clinic to contact me"}
                </Button>
                {me.user.role === "mentor" && (
                  <Button kind="secondary" disabled={busy} onClick={() => alertClinic("mentee")}>
                    I&apos;m worried about my mentee
                  </Button>
                )}
              </div>
            </>
          )}
        </div>
        <Button kind="quiet" className="mt-3 w-full" onClick={onClose}>
          Close
        </Button>
      </div>
    </div>
  );
}
