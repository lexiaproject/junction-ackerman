"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button, ErrorText, Field, Logo, api } from "../ui";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // Si viene de la portada con una cuenta de prueba, rellenamos el email
  useEffect(() => {
    const e = new URLSearchParams(window.location.search).get("email");
    // eslint-disable-next-line react-hooks/set-state-in-effect -- dato del navegador, solo existe tras montar
    if (e) setEmail(e);
  }, []);

  async function submit(ev: React.FormEvent) {
    ev.preventDefault();
    setBusy(true);
    try {
      const r = await api<{ role: string }>("/api/app/auth", { action: "login", email, password });
      window.location.assign(r.role === "clinic" ? "/clinic" : "/app");
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <main className="topo flex min-h-dvh w-full flex-col">
      <div className="brand-rule" />
      <div className="mx-auto flex w-full max-w-sm flex-1 flex-col px-5 pb-10 pt-6 sm:pt-14">
        <Link href="/" aria-label="Relay home">
          <Logo className="text-2xl" />
        </Link>
        <div className="stagger mt-12">
          <h1 className="text-3xl font-bold tracking-tight">Welcome back</h1>
          <p className="muted mt-1">Log in to see how your people are doing.</p>
          <form onSubmit={submit} className="card mt-6 flex flex-col gap-4 p-5">
            <Field label="Email" type="email" inputMode="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            <Field label="Password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
            <ErrorText>{error}</ErrorText>
            <Button type="submit" size="lg" disabled={busy}>
              {busy ? "Logging in…" : "Log in"}
            </Button>
          </form>
          <p className="mt-6 text-sm">
            New to Relay?{" "}
            <Link href="/join" className="font-semibold underline underline-offset-4">
              Use your invite code
            </Link>
          </p>
          <p className="muted mt-2 text-sm">
            Just exploring?{" "}
            <Link href="/#try" className="font-semibold text-pine underline underline-offset-4">
              Open a test account in one click
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
