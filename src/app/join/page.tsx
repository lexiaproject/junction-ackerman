"use client";
// Alta con el código de la clínica → cuenta → bienvenida → consentimiento → (mentor) disponibilidad

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button, ErrorText, Field, Logo, api } from "../ui";

type Step = "loading" | "code" | "account" | "welcome" | "consent" | "mentor";
type Invite = { name: string; role: "pupil" | "mentor"; clinic: string };

export default function JoinPage() {
  const [step, setStep] = useState<Step>("loading");
  const [code, setCode] = useState("");
  const [invite, setInvite] = useState<Invite | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [agree, setAgree] = useState(false);
  const [availability, setAvailability] = useState("");
  const [story, setStory] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // ¿Ya ha iniciado sesión pero le falta la bienvenida/consentimiento?
  useEffect(() => {
    (async () => {
      const c = new URLSearchParams(window.location.search).get("code");
      if (c) setCode(c.toUpperCase());
      const res = await fetch("/api/app/me", { cache: "no-store" });
      if (res.ok) {
        const me = await res.json();
        if (me.user.role === "clinic") return (window.location.href = "/clinic");
        if (me.user.consent) return (window.location.href = "/app");
        setInvite({ name: me.user.name, role: me.user.role, clinic: me.clinic?.name ?? "" });
        setStep("welcome");
      } else setStep("code");
    })();
  }, []);

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const checkCode = (e: React.FormEvent) => {
    e.preventDefault();
    run(async () => {
      setInvite(await api<Invite>(`/api/app/invite?code=${encodeURIComponent(code.trim())}`));
      setStep("account");
    });
  };
  const createAccount = (e: React.FormEvent) => {
    e.preventDefault();
    run(async () => {
      await api("/api/app/auth", { action: "join", code, email, password });
      setStep("welcome");
    });
  };
  const consent = (give: boolean) =>
    run(async () => {
      await api("/api/app/me", { action: "consent", give: true });
      if (!give) await api("/api/app/me", { action: "consent", give: false });
      if (invite?.role === "mentor") setStep("mentor");
      else window.location.href = "/app";
    });
  const saveMentor = (e: React.FormEvent) => {
    e.preventDefault();
    run(async () => {
      await api("/api/app/me", { action: "profile", availability, story });
      window.location.href = "/app";
    });
  };

  const order: Step[] = invite?.role === "mentor" ? ["code", "account", "welcome", "consent", "mentor"] : ["code", "account", "welcome", "consent"];
  const stepIndex = Math.max(0, order.indexOf(step));

  return (
    <main className="topo flex min-h-dvh w-full flex-col">
      <div className="brand-rule" />
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 pb-8 pt-6 sm:pt-12">
        <div className="flex items-center justify-between">
          <Link href="/" aria-label="Relay home">
            <Logo className="text-2xl" />
          </Link>
          {step !== "loading" && (
            <p className="muted num text-sm">
              Step {stepIndex + 1} of {order.length}
            </p>
          )}
        </div>
        {step !== "loading" && (
          <div className="mt-4 flex gap-1.5" aria-hidden>
            {order.map((s, i) => (
              <span key={s} className={`h-1 flex-1 rounded-full transition-colors duration-500 ${i <= stepIndex ? "bg-pine" : "bg-mist"}`} />
            ))}
          </div>
        )}

        {step === "loading" && <div className="card mt-10 h-48 animate-pulse" />}

        {step === "code" && (
          <form key="code" onSubmit={checkCode} className="stagger mt-10 flex flex-col gap-4">
            <h1 className="text-3xl font-bold tracking-tight">Join Relay</h1>
            <p className="muted">Your clinic gives you a 6-character invite code when they add you to Relay.</p>
            <label className="block">
              <span className="label">Invite code</span>
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
                autoCapitalize="characters"
                autoComplete="one-time-code"
                required
                maxLength={6}
                placeholder="······"
                className="input num h-16 text-center text-3xl font-bold tracking-[0.45em]"
              />
              <span className="muted mt-1.5 block text-sm">
                No code? Try <button type="button" className="font-semibold text-pine underline underline-offset-4" onClick={() => setCode("OSK4RI")}>OSK4RI</button> to see how a new patient joins.
              </span>
            </label>
            <ErrorText>{error}</ErrorText>
            <Button type="submit" size="lg" disabled={busy || code.trim().length < 6}>
              {busy ? "Checking…" : "Continue"}
            </Button>
            <p className="text-sm">
              Already have an account?{" "}
              <Link href="/login" className="font-semibold underline underline-offset-4">
                Log in
              </Link>
            </p>
          </form>
        )}

        {step === "account" && invite && (
          <form key="account" onSubmit={createAccount} className="stagger mt-10 flex flex-col gap-4">
            <div className="card flex items-center gap-3 p-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#e5efe8] text-moss-ink" aria-hidden>
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m5 12 4 4 10-10" />
                </svg>
              </span>
              <p className="text-sm">
                <b>{invite.clinic}</b> invited you as {invite.role === "mentor" ? "a mentor" : "someone starting TMS"}.
              </p>
            </div>
            <h1 className="text-3xl font-bold tracking-tight">Hi {invite.name}, create your account</h1>
            <Field label="Email" type="email" autoComplete="email" inputMode="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            <label className="block">
              <span className="label">Password</span>
              <input type="password" autoComplete="new-password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} className="input" />
              <span className="mt-2 flex gap-1" aria-hidden>
                {[4, 8, 12].map((n) => (
                  <span key={n} className={`h-1 flex-1 rounded-full transition-colors ${password.length >= n ? (password.length >= 12 ? "bg-moss" : "bg-cloudberry") : "bg-mist"}`} />
                ))}
              </span>
              <span className="muted mt-1.5 block text-sm">{password.length < 8 ? "At least 8 characters." : password.length < 12 ? "Good. Longer is even safer." : "Strong password."}</span>
            </label>
            <ErrorText>{error}</ErrorText>
            <Button type="submit" size="lg" disabled={busy}>
              {busy ? "Creating…" : "Create account"}
            </Button>
          </form>
        )}

        {step === "welcome" && invite && (
          <div key="welcome" className="stagger mt-8 flex flex-col">
            <RelayIllustration />
            <h1 className="mt-6 text-3xl font-bold tracking-tight">Welcome, {invite.name}</h1>
            <ul className="mt-4 flex flex-col gap-4">
              {(invite.role === "pupil"
                ? [
                    ["Someone who has been there", "Your clinic matches you with a mentor who finished TMS not long ago and knows what it's like."],
                    ["Nothing to do", "Your mentor reaches out with small plans. You just say yes or no."],
                    ["Quietly looked after", "If Relay notices a harder week, your mentor is nudged to check in. Anything serious goes straight to your clinic."],
                  ]
                : [
                    ["Pass it forward", "You've been through TMS. Now you can be there for someone who is just starting."],
                    ["Relay tells you when", "A message, a walk, a call: one simple idea at the right moment. You never see health data."],
                    ["Good for you too", "Helping gives your days structure and meaning. Crises are the clinic's job, and you can pause anytime."],
                  ]
              ).map(([t, d], i) => (
                <li key={t} className="flex gap-3">
                  <span className="num mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-pine text-sm font-bold text-white">{i + 1}</span>
                  <span>
                    <span className="block font-semibold">{t}</span>
                    <span className="muted">{d}</span>
                  </span>
                </li>
              ))}
            </ul>
            <Button size="lg" className="mt-8 w-full" onClick={() => setStep("consent")}>
              Continue
            </Button>
          </div>
        )}

        {step === "consent" && (
          <div key="consent" className="stagger mt-8">
            <h1 className="text-3xl font-bold tracking-tight">Your data, your choice</h1>
            <p className="muted mt-2">Read what Relay does with your data. You can change your mind anytime.</p>
            <dl className="card mt-5 divide-y divide-mist">
              <Item icon="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12m10 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6" term="What Relay notices">
                How you use the app (opens, replies, late nights) and, if you connect them, sleep, steps and heart rate from your phone, Apple Health or ring.
              </Item>
              <Item icon="M4 19h16M7 16V9M12 16V5M17 16v-4" term="Compared with whom">
                Only with yourself. Relay learns your usual weeks and looks for changes that last several days, not one bad day.
              </Item>
              <Item icon="M12 3l8 4v5c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7z" term="Who sees what">
                {invite?.role === "mentor"
                  ? "Your clinic sees one line if you might need support. Nobody else sees your data."
                  : "Your mentor only gets a suggestion of what to do, never your data. Your clinic sees one line if you might need a call."}
              </Item>
              <Item icon="M12 8v4l3 2M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18" term="Your rights">
                Withdraw consent, download or delete your data anytime from the Me tab. Relay suggests; a person always decides.
              </Item>
            </dl>
            <label className="card mt-4 flex cursor-pointer items-start gap-3 p-4 transition-colors has-[:checked]:border-pine has-[:checked]:bg-[#f4f7f4]">
              <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--color-pine)]" />
              <span>I understand and agree that Relay may use these signals to help my {invite?.role === "mentor" ? "clinic" : "mentor and clinic"} reach out at the right moment.</span>
            </label>
            <ErrorText>{error}</ErrorText>
            <Button size="lg" className="mt-4 w-full" disabled={!agree || busy} onClick={() => consent(true)}>
              Agree and continue
            </Button>
            <Button kind="quiet" className="mt-2 w-full" disabled={busy} onClick={() => consent(false)}>
              Continue without signals
            </Button>
          </div>
        )}

        {step === "mentor" && (
          <form key="mentor" onSubmit={saveMentor} className="stagger mt-8 flex flex-col gap-4">
            <h1 className="text-3xl font-bold tracking-tight">So your mentee knows you</h1>
            <p className="muted">Your clinic also uses this to find a good match.</p>
            <div>
              <Field label="When are you usually available?" placeholder="e.g. Weekdays 17–20" value={availability} onChange={(e) => setAvailability(e.target.value)} />
              <div className="mt-2 flex flex-wrap gap-1.5">
                {["Weekday evenings", "Mornings", "Weekends", "Lunch breaks"].map((s) => (
                  <button
                    type="button"
                    key={s}
                    onClick={() => setAvailability(s)}
                    className={`rounded-md border px-2.5 py-1.5 text-sm transition-colors ${availability === s ? "border-pine bg-pine text-white" : "border-line bg-paper hover:bg-birch"}`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <Field label="Your story in one sentence" placeholder="e.g. Finished TMS in spring; walks helped me most." value={story} onChange={(e) => setStory(e.target.value)} />
            <ErrorText>{error}</ErrorText>
            <Button type="submit" size="lg" disabled={busy}>
              Start mentoring
            </Button>
          </form>
        )}
      </div>
    </main>
  );
}

function Item({ icon, term, children }: { icon: string; term: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3 p-4">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-birch" aria-hidden>
        <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          <path d={icon} />
        </svg>
      </span>
      <div>
        <dt className="font-semibold">{term}</dt>
        <dd className="muted text-[0.9375rem]">{children}</dd>
      </div>
    </div>
  );
}

// Ilustración del relevo: una persona pasa el testigo a la siguiente
function RelayIllustration() {
  return (
    <svg viewBox="0 0 320 120" className="w-full" aria-hidden>
      <defs>
        <linearGradient id="arc" x1="0" x2="1">
          <stop offset="0" stopColor="var(--color-pine)" />
          <stop offset="1" stopColor="var(--color-cloudberry)" />
        </linearGradient>
      </defs>
      <path d="M60 78 C 120 10, 200 10, 260 78" fill="none" stroke="url(#arc)" strokeWidth="2" strokeDasharray="4 6" pathLength={1} className="draw" />
      <circle cx="60" cy="80" r="30" fill="var(--color-pine)" opacity="0.12" />
      <circle cx="60" cy="80" r="18" fill="var(--color-pine)" />
      <circle cx="160" cy="62" r="22" fill="var(--color-moss)" opacity="0.18" />
      <circle cx="160" cy="62" r="11" fill="var(--color-moss)" />
      <circle cx="260" cy="80" r="30" fill="var(--color-cloudberry)" opacity="0.16" />
      <circle cx="260" cy="80" r="18" fill="var(--color-cloudberry)" />
    </svg>
  );
}
