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
      window.location.href = r.role === "clinic" ? "/clinic" : "/app";
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-sm px-5 py-12">
      <Link href="/">
        <Logo className="text-2xl" />
      </Link>
      <h1 className="mt-8 font-display text-3xl font-bold">Log in</h1>
      <form onSubmit={submit} className="mt-6 flex flex-col gap-4">
        <Field label="Email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        <Field label="Password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        <ErrorText>{error}</ErrorText>
        <Button type="submit" disabled={busy}>
          {busy ? "Logging in…" : "Log in"}
        </Button>
      </form>
      <p className="mt-6 text-sm">
        New to Relay? <Link href="/join" className="font-bold underline underline-offset-4">Use your invite code</Link>
      </p>
    </main>
  );
}
