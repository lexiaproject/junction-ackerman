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

type Kind = "primary" | "secondary" | "danger" | "danger-outline" | "quiet";

export function Button({
  children,
  kind = "primary",
  size,
  className = "",
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { kind?: Kind; size?: "sm" | "lg" }) {
  return (
    <button {...rest} className={`btn btn-${kind} ${size ? `btn-${size}` : ""} ${className}`}>
      {children}
    </button>
  );
}

export function Field({ label, hint, ...rest }: React.InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      <input {...rest} className="input" />
      {hint && <span className="muted mt-1.5 block text-sm">{hint}</span>}
    </label>
  );
}

export function ErrorText({ children }: { children: React.ReactNode }) {
  if (!children) return null;
  return (
    <p role="alert" className="rounded-lg border border-lingon/25 bg-lingon/5 px-3 py-2 text-sm text-lingon-ink">
      {children}
    </p>
  );
}

// Estados: siempre punto + texto, nunca solo color
export type Level = "learning" | "stable" | "early" | "high" | "crisis" | "paused";
export const STATUS: Record<Level, { text: string; color: string; bg: string; fg: string }> = {
  crisis: { text: "Crisis", color: "var(--color-lingon)", bg: "#f8e6ea", fg: "var(--color-lingon-ink)" },
  high: { text: "High risk", color: "var(--color-lingon)", bg: "#f8e6ea", fg: "var(--color-lingon-ink)" },
  early: { text: "Early signs", color: "var(--color-cloudberry)", bg: "#f8eedd", fg: "var(--color-cloudberry-ink)" },
  stable: { text: "Stable", color: "var(--color-moss)", bg: "#e5efe8", fg: "var(--color-moss-ink)" },
  learning: { text: "Learning baseline", color: "#8a9a92", bg: "#eef1ed", fg: "#4c5e56" },
  paused: { text: "No consent", color: "#8a9a92", bg: "#eef1ed", fg: "#4c5e56" },
};

export function StatusChip({ level, label }: { level: Level; label?: string }) {
  const s = STATUS[level];
  return (
    <span className="chip" style={{ "--chip-bg": s.bg, "--chip-fg": s.fg, "--chip-dot": s.color } as React.CSSProperties}>
      {label ?? s.text}
    </span>
  );
}

export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 font-extrabold tracking-tight ${className}`}>
      <svg viewBox="0 0 34 20" className="h-[0.85em] w-auto" aria-hidden>
        <circle cx="10" cy="10" r="9" fill="currentColor" opacity="0.28" />
        <circle cx="23" cy="10" r="9" fill="var(--color-cloudberry)" />
      </svg>
      Relay
    </span>
  );
}

export function Avatar({ name, large }: { name: string; large?: boolean }) {
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-full bg-[#e3e9e2] font-bold text-pine ${large ? "h-12 w-12 text-lg" : "h-10 w-10"}`}
      aria-hidden
    >
      {name[0]}
    </span>
  );
}

export function Chevron() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4 shrink-0 text-pine/40" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="m8 5 5 5-5 5" />
    </svg>
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
