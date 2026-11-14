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

  return (
    <main className="mx-auto w-full max-w-md px-5 py-10">
      <Link href="/">
        <Logo className="text-2xl" />
      </Link>

      {step === "loading" && <p className="mt-8 text-pine/70">Loading…</p>}

      {step === "code" && (
        <form onSubmit={checkCode} className="mt-8 flex flex-col gap-4">
          <h1 className="font-display text-3xl font-bold">Join Relay</h1>
          <p className="text-pine/80">Your clinic gives you a 6-letter invite code when they add you to Relay.</p>
          <Field label="Invite code" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} autoCapitalize="characters" required maxLength={6} hint="Try OSK4RI to see how a new patient joins." />
          <ErrorText>{error}</ErrorText>
          <Button type="submit" disabled={busy || code.trim().length < 6}>
            Continue
          </Button>
          <p className="text-sm">
            Already have an account? <Link href="/login" className="font-bold underline underline-offset-4">Log in</Link>
          </p>
        </form>
      )}

      {step === "account" && invite && (
        <form onSubmit={createAccount} className="mt-8 flex flex-col gap-4">
          <h1 className="font-display text-3xl font-bold">Hi {invite.name}</h1>
          <p className="text-pine/80">
            {invite.clinic} invited you to Relay as {invite.role === "mentor" ? "a mentor" : "someone starting TMS"}. Create your account.
          </p>
          <Field label="Email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          <Field label="Password" type="password" autoComplete="new-password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} hint="At least 8 characters." />
          <ErrorText>{error}</ErrorText>
          <Button type="submit" disabled={busy}>
            Create account
          </Button>
        </form>
      )}

      {step === "welcome" && invite && (
        <div className="mt-8">
          <h1 className="font-display text-3xl font-bold">Welcome, {invite.name}</h1>
          {invite.role === "pupil" ? (
            <div className="mt-4 flex flex-col gap-3 text-lg">
              <p>Your clinic will match you with a mentor: someone who finished TMS not long ago and knows what it&apos;s like.</p>
              <p>You don&apos;t have to do anything. Your mentor reaches out, you say yes or no.</p>
              <p>If Relay notices you might be having a harder time, it lets your mentor know to check in. Anything serious goes straight to your clinic.</p>
            </div>
          ) : (
            <div className="mt-4 flex flex-col gap-3 text-lg">
              <p>You&apos;ve been through TMS. Now you can be there for someone who is just starting.</p>
              <p>Relay tells you when and what to do: a message, a walk, a call. You never see health data, and you&apos;re never responsible for a crisis; that&apos;s the clinic&apos;s job.</p>
              <p>Helping someone also gives your own days structure and meaning. If you need a break, you can pause anytime.</p>
            </div>
          )}
          <Button className="mt-6 w-full" onClick={() => setStep("consent")}>
            Continue
          </Button>
        </div>
      )}

      {step === "consent" && (
        <div className="mt-8">
          <h1 className="font-display text-3xl font-bold">Your data, your choice</h1>
          <dl className="mt-4 flex flex-col gap-3">
            <Item term="What Relay notices">How often you open the app, how quickly you reply, and use after midnight. Later, with your permission, sleep and steps from your phone or ring.</Item>
            <Item term="Compared with whom">Only with yourself. Relay learns your usual week and looks for changes that last several days, not one bad day.</Item>
            <Item term="Who sees what">{invite?.role === "mentor" ? "Your clinic sees one line if you might need support." : "Your mentor only gets a suggestion of what to do, never your data. Your clinic sees one line if you might need a call."}</Item>
            <Item term="Who decides">Relay suggests; a person always decides. The clinic reviews every serious alert.</Item>
            <Item term="Your rights">Withdraw consent, download or delete your data anytime from the Me tab.</Item>
          </dl>
          <label className="mt-5 flex items-start gap-3 rounded-xl border border-mist p-3">
            <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-1 h-5 w-5 accent-[var(--color-pine)]" />
            <span>I understand and agree that Relay may use these signals to help my {invite?.role === "mentor" ? "clinic" : "mentor and clinic"} reach out at the right moment.</span>
          </label>
          <ErrorText>{error}</ErrorText>
          <Button className="mt-4 w-full" disabled={!agree || busy} onClick={() => consent(true)}>
            Agree and continue
          </Button>
          <Button kind="ghost" className="mt-2 w-full" disabled={busy} onClick={() => consent(false)}>
            Continue without signals
          </Button>
        </div>
      )}

      {step === "mentor" && (
        <form onSubmit={saveMentor} className="mt-8 flex flex-col gap-4">
          <h1 className="font-display text-3xl font-bold">One last thing</h1>
          <p className="text-pine/80">This helps your clinic match you, and your mentee know you.</p>
          <Field label="When are you usually available?" placeholder="e.g. Weekdays 17–20" value={availability} onChange={(e) => setAvailability(e.target.value)} />
          <Field label="Your story in one sentence" placeholder="e.g. Finished TMS in spring; walks helped me most." value={story} onChange={(e) => setStory(e.target.value)} />
          <ErrorText>{error}</ErrorText>
          <Button type="submit" disabled={busy}>
            Start
          </Button>
        </form>
      )}
    </main>
  );
}

function Item({ term, children }: { term: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="font-bold">{term}</dt>
      <dd className="text-pine/80">{children}</dd>
    </div>
  );
}
