"use client";
// Piezas comunes de las pantallas de la app real

import { useCallback, useEffect, useState } from "react";

export async function api<T = Record<string, unknown>>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(path, {
    method: body === undefined ? "GET" : "POST",
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && !path.includes("/auth")) {
    window.location.href = "/login";
    throw new Error("Please log in.");
  }
  if (!res.ok) throw new Error((data as { error?: string }).error ?? "Something went wrong. Try again.");
  return data as T;
}

// Carga datos y los refresca cada `every` ms mientras la pantalla está a la vista
export function useLive<T>(path: string | null, every = 0) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState("");
  const reload = useCallback(async () => {
    if (!path) return;
    try {
      setData(await api<T>(path));
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }, [path]);
  useEffect(() => {
    let alive = true;
    const run = () => alive && reload();
    run();
    const id = every ? setInterval(() => !document.hidden && run(), every) : undefined;
    const onVis = () => !document.hidden && run();
    document.addEventListener("visibilitychange", onVis);
    return () => {
      alive = false;
      if (id) clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [reload, every]);
  return { data, error, reload };
}

export function Button({
  children,
  kind = "primary",
  className = "",
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { kind?: "primary" | "ghost" | "danger" | "line" }) {
  const styles = {
    primary: "bg-pine text-paper",
    danger: "bg-lingon text-paper",
    line: "border border-pine text-pine",
    ghost: "text-pine underline underline-offset-4",
  }[kind];
  return (
    <button
      {...rest}
      className={`rounded-full px-4 py-2.5 text-sm font-bold transition-opacity disabled:opacity-40 ${styles} ${className}`}
    >
      {children}
    </button>
  );
}

export function Field({ label, hint, ...rest }: React.InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string }) {
  return (
    <label className="block">
      <span className="text-sm font-bold">{label}</span>
      <input {...rest} className="mt-1 block w-full rounded-xl border border-mist bg-paper px-3 py-2.5" />
      {hint && <span className="mt-1 block text-xs text-pine/60">{hint}</span>}
    </label>
  );
}

export function ErrorText({ children }: { children: React.ReactNode }) {
  if (!children) return null;
  return (
    <p role="alert" className="rounded-lg bg-lingon/10 px-3 py-2 text-sm text-lingon">
      {children}
    </p>
  );
}

export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 font-display font-extrabold tracking-tight ${className}`}>
      <svg viewBox="0 0 40 24" className="h-[0.9em] w-auto" aria-hidden>
        <circle cx="12" cy="12" r="11" fill="currentColor" opacity="0.35" />
        <circle cx="27" cy="12" r="11" fill="var(--color-cloudberry)" />
      </svg>
      Relay
    </span>
  );
}

export function timeAgo(iso: string | null) {
  if (!iso) return "never";
  const min = Math.round((Date.now() - Date.parse(iso)) / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min} min ago`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.round(h / 24);
  return d === 1 ? "yesterday" : `${d} days ago`;
}
