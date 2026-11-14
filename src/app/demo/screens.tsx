"use client";
// Piezas de pantalla compartidas por la sala de control (/), /pupil, /mentor y /clinic.

import { useCallback, useEffect, useRef, useState } from "react";
import { BASELINE_DAYS, MENTOR, PUPIL, SIGNALS, TOTAL_DAYS, type ChatMsg, type DayData } from "@/lib/data";
import { CATALOG, type Level, type SignalStatus } from "@/lib/engine";
import { derive, type Action, type View, type World } from "@/lib/world";

export const LEVEL_TEXT: Record<Level, string> = {
  learning: "Learning Laura's usual week",
  stable: "Stable",
  early: "Early signs",
  high: "High risk",
  crisis: "Crisis: clinic alerted",
};
export const LEVEL_COLOR: Record<Level, string> = {
  learning: "var(--color-mist)",
  stable: "var(--color-moss)",
  early: "var(--color-cloudberry)",
  high: "var(--color-lingon)",
  crisis: "var(--color-lingon)",
};

// Lee el estado compartido cada 2 segundos y permite enviar acciones
export function useWorld() {
  const [world, setWorld] = useState<World | null>(null);
  const [busy, setBusy] = useState(false);
  const accept = useCallback((w: World) => setWorld((prev) => (prev && prev.rev > w.rev ? prev : w)), []);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const res = await fetch("/api/state", { cache: "no-store" });
        if (alive && res.ok) accept(await res.json());
      } catch {
        // sin conexión: lo intentamos en la siguiente vuelta
      }
    };
    const onVisible = () => !document.hidden && load();
    load();
    // Cada 2 s, solo si la pantalla está a la vista (ahorra batería y peticiones)
    const id = setInterval(() => !document.hidden && load(), 2000);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      alive = false;
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [accept]);

  async function dispatch(action: Action) {
    setBusy(true);
    try {
      const res = await fetch("/api/state", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(action),
      });
      if (res.ok) accept(await res.json());
    } finally {
      setBusy(false);
    }
  }

  return { world, view: world ? derive(world) : null, dispatch, busy };
}

type Dispatch = (a: Action) => void;

export function Loading() {
  return <p className="p-6 text-pine/70">Loading…</p>;
}

/* ---------- Pantalla de Laura (pupila) ---------- */
export function PupilScreen({ w, v, dispatch }: { w: World; v: View; dispatch: Dispatch }) {
  return (
    <>
      <ScreenHeader title={MENTOR} sub="Your mentor" />
      <Chat msgs={v.chat} me="pupil" day={w.day} />
      {v.pendingPlan && !w.crisis && (
        <div className="flex gap-2 border-t border-mist px-3 py-2">
          <button onClick={() => dispatch({ type: "answer", yes: true })} className="flex-1 rounded-full bg-pine px-3 py-2 text-sm font-bold text-paper">
            Sounds good
          </button>
          <button onClick={() => dispatch({ type: "answer", yes: false })} className="flex-1 rounded-full border border-pine px-3 py-2 text-sm font-bold">
            Not today
          </button>
        </div>
      )}
      <Composer placeholder={`Message ${MENTOR}`} onSend={(text) => dispatch({ type: "chat", from: "pupil", text })} />
      {w.crisis ? (
        <div className="border-t border-lingon/30 bg-lingon/10 px-4 py-3 text-sm">
          The clinic has been told and will contact you today. In danger right now? Call <b>112</b>.
        </div>
      ) : (
        <div className="flex items-center justify-between border-t border-mist px-4 py-3 text-sm">
          <span>Emergency: 112</span>
          <button onClick={() => dispatch({ type: "help" })} className="rounded-full bg-lingon px-3 py-1.5 font-bold text-paper">
            I need help now
          </button>
        </div>
      )}
    </>
  );
}

/* ---------- Pantalla de Mikko (mentor) ---------- */
export function MentorScreen({ w, v, dispatch }: { w: World; v: View; dispatch: Dispatch }) {
  const draft = useRef<HTMLTextAreaElement>(null);
  const sug = v.suggestion;
  return (
    <>
      <ScreenHeader title={PUPIL} sub="You're mentoring" />
      <Chat msgs={v.chat} me="mentor" day={w.day} />
      {w.crisis ? (
        <div className="arrive m-3 rounded-xl border border-lingon/40 bg-paper p-4">
          <p className="font-bold">The clinic is taking care of Laura.</p>
          <p className="mt-1 text-sm">You don&apos;t need to do anything else. Emergency: 112.</p>
        </div>
      ) : v.showCard && sug && v.alert ? (
        <div key={v.alert + sug.source} className="arrive m-3 rounded-xl border-2 p-3" style={{ borderColor: LEVEL_COLOR[v.alert] }}>
          <p className="font-display text-lg font-bold leading-tight">{sug.headline}</p>
          <p className="mt-1 text-sm">Idea: {CATALOG[sug.action].toLowerCase()}</p>
          <textarea
            ref={draft}
            defaultValue={sug.message}
            rows={3}
            aria-label="Message to send"
            className="mt-2 w-full resize-none rounded-lg border border-mist bg-birch/60 p-2 text-sm"
          />
          {v.alert === "high" && <p className="mt-1 text-xs">Also remind Laura the clinic is one call away.</p>}
          <div className="mt-2 flex gap-2">
            <button
              onClick={() => dispatch({ type: "send", text: draft.current?.value ?? "" })}
              className="flex-1 rounded-full bg-pine px-3 py-2 text-sm font-bold text-paper"
            >
              Send to Laura
            </button>
            <button onClick={() => dispatch({ type: "dismiss" })} className="rounded-full px-3 py-2 text-sm">
              Not now
            </button>
          </div>
        </div>
      ) : (
        <Composer placeholder={`Message ${PUPIL}`} onSend={(text) => dispatch({ type: "chat", from: "mentor", text })} />
      )}
    </>
  );
}

function Composer({ placeholder, onSend }: { placeholder: string; onSend: (text: string) => void }) {
  const [text, setText] = useState("");
  return (
    <form
      className="flex gap-2 border-t border-mist px-3 py-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (!text.trim()) return;
        onSend(text);
        setText("");
      }}
    >
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="min-w-0 flex-1 rounded-full border border-mist bg-birch/60 px-3 py-2 text-sm"
      />
      <button type="submit" className="rounded-full bg-pine px-4 py-2 text-sm font-bold text-paper">
        Send
      </button>
    </form>
  );
}

export function ScreenHeader({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="border-b border-mist px-4 pb-2 pt-4">
      <p className="text-xs text-pine/60">{sub}</p>
      <p className="font-display text-lg font-bold">{title}</p>
    </div>
  );
}

function Chat({ msgs, me, day }: { msgs: ChatMsg[]; me: "mentor" | "pupil"; day: number }) {
  const shown = msgs.filter((m) => m.day <= day + 1);
  return (
    <div className="flex flex-1 flex-col-reverse overflow-y-auto px-3 py-3">
      <div className="flex flex-col gap-1.5">
        {shown.map((m, i) => {
          const mine = m.from === me;
          const newDay = i === 0 || shown[i - 1].day !== m.day;
          return (
            <div key={i} className="flex flex-col">
              {newDay && <p className="my-1 text-center text-[11px] text-pine/50">Day {m.day}</p>}
              <p
                className={`max-w-[85%] rounded-2xl px-3 py-1.5 text-sm ${
                  mine ? "self-end rounded-br-sm bg-pine text-paper" : "self-start rounded-bl-sm bg-birch"
                }`}
              >
                {m.text}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ---------- Marco de móvil (solo en la sala de control) ---------- */
export function Phone({ caption, sub, href, children }: { caption: string; sub: string; href: string; children: React.ReactNode }) {
  return (
    <figure className="mx-auto w-full max-w-[300px]">
      <figcaption className="mb-2">
        <a href={href} target="_blank" className="font-display text-lg font-bold underline decoration-mist underline-offset-4">
          {caption}
        </a>
        <p className="text-sm text-pine/70">{sub}</p>
      </figcaption>
      <div className="flex h-[580px] flex-col overflow-hidden rounded-[36px] border-[6px] border-pine bg-paper shadow-[0_20px_40px_-20px_rgba(30,59,53,0.45)]">
        {children}
      </div>
    </figure>
  );
}

/* ---------- Lo que ve el sistema ---------- */
export function SystemPanel({ w, v, busy }: { w: World; v: View; busy: boolean }) {
  const sug = v.suggestion;
  return (
    <div className="rounded-2xl border border-mist bg-paper/70 p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-display text-2xl font-bold">What the system sees</h2>
        <p className="text-sm text-pine/70">Hidden from {MENTOR}. Compared only with Laura&apos;s own first week.</p>
      </div>
      <ul className="mt-4 divide-y divide-mist">
        {v.statuses.map((s) => (
          <SignalRow key={s.key} s={s} days={v.days} day={w.day} />
        ))}
      </ul>
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <LevelPill level={v.level} />
        {busy && <span className="text-sm">Working…</span>}
      </div>
      {w.crisis ? (
        <p className="mt-3">Alert sent straight to the clinic. {MENTOR} is told the clinic is handling it, nothing more.</p>
      ) : (
        sug &&
        v.alert && (
          <div className="mt-3">
            <p>
              <b>{sug.source === "gemini" ? "Gemini" : "Backup rules"} chose:</b> {CATALOG[sug.action]}
            </p>
            <p className="mt-1 text-pine/80">{sug.explanation}</p>
          </div>
        )
      )}
      {v.learned.length > 0 && (
        <p className="mt-3 rounded-lg bg-moss/15 px-3 py-2">
          Back to baseline. Learned for this pair: <b>{v.learned[0].toLowerCase()}</b> helps.
        </p>
      )}
    </div>
  );
}

export function LevelPill({ level, label }: { level: Level; label?: string }) {
  return (
    <span
      className="inline-flex shrink-0 items-center rounded-full px-3 py-1 text-sm font-bold"
      style={{ background: LEVEL_COLOR[level], color: level === "learning" ? "var(--color-pine)" : "var(--color-paper)" }}
    >
      {label ?? LEVEL_TEXT[level]}
    </span>
  );
}

export function Timeline({
  v,
  w,
  busy,
  dispatch,
}: {
  v: View;
  w: World;
  busy: boolean;
  dispatch: Dispatch;
}) {
  return (
    <div>
      <div className="flex items-end justify-between gap-4">
        <p className="font-display text-4xl font-bold">
          Day {w.day + 1}
          <span className="text-xl font-normal text-pine/60"> of {TOTAL_DAYS}</span>
        </p>
        <div className="flex gap-2">
          <button onClick={() => dispatch({ type: "restart" })} disabled={busy} className="rounded-full border border-pine px-4 py-2 font-bold disabled:opacity-40">
            Restart
          </button>
          <button
            onClick={() => dispatch({ type: "nextDay" })}
            disabled={busy || w.day >= TOTAL_DAYS - 1}
            className="rounded-full bg-pine px-5 py-2 font-bold text-paper disabled:opacity-40"
          >
            Next day
          </button>
        </div>
      </div>
      <ol className="mt-4 grid gap-1" style={{ gridTemplateColumns: `repeat(${TOTAL_DAYS}, 1fr)` }}>
        {v.levels.map((l, i) => {
          const shown: Level = i === w.day && w.crisis ? "crisis" : l;
          return (
            <li
              key={i}
              title={`Day ${i + 1}: ${i <= w.day ? LEVEL_TEXT[shown] : "not yet"}`}
              className="h-10 rounded-md"
              style={{
                background: i <= w.day ? LEVEL_COLOR[shown] : "transparent",
                border: i <= w.day ? "none" : "1px dashed var(--color-mist)",
                outline: i === w.day ? "2px solid var(--color-pine)" : undefined,
                outlineOffset: 2,
              }}
            />
          );
        })}
      </ol>
      <div className="mt-1 flex text-xs text-pine/70">
        <span style={{ width: `${(BASELINE_DAYS / TOTAL_DAYS) * 100}%` }}>Week 1: learning Laura&apos;s usual</span>
        <span>Week 2: watching for change</span>
      </div>
    </div>
  );
}

function fmt(s: SignalStatus) {
  const sig = SIGNALS[s.key];
  const d = s.key === "replies" || s.key === "steps" ? Math.round(s.delta) : Number(s.delta.toFixed(sig.digits));
  const num = Math.abs(d).toLocaleString("en-US", { maximumFractionDigits: sig.digits });
  return `${d < 0 ? "−" : "+"}${num}${sig.unit ? " " + sig.unit : ""}`;
}

function SignalRow({ s, days, day }: { s: SignalStatus; days: DayData[]; day: number }) {
  const sig = SIGNALS[s.key];
  const W = 150,
    H = 34;
  const all = days.map((d) => d[s.key]);
  const lo = Math.min(...all, s.mean - s.threshold);
  const hi = Math.max(...all, s.mean + s.threshold);
  const r1 = (n: number) => Math.round(n * 10) / 10; // evita diferencias de decimales servidor/navegador
  const x = (i: number) => r1((i / (TOTAL_DAYS - 1)) * W);
  const y = (val: number) => r1(H - 3 - ((val - lo) / (hi - lo || 1)) * (H - 6));
  const pts = all.slice(0, day + 1).map((val, i) => `${x(i)},${y(val)}`).join(" ");
  const off = s.run > 0;

  return (
    <li className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 py-2.5 sm:grid-cols-[1fr_150px_120px]">
      <div>
        <p className="font-bold leading-tight">{sig.label}</p>
        <p className="text-xs text-pine/60">
          {sig.source} · {sig.inApp ? "in-app signal" : "simulated"}
        </p>
      </div>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="hidden sm:block" aria-hidden>
        <rect x={0} y={y(s.mean + s.threshold)} width={W} height={y(s.mean - s.threshold) - y(s.mean + s.threshold)} fill="var(--color-moss)" opacity={0.18} />
        <polyline points={pts} fill="none" stroke="var(--color-pine)" strokeWidth={1.75} strokeLinejoin="round" />
        <circle cx={x(day)} cy={y(all[day])} r={3.5} fill={off ? "var(--color-lingon)" : "var(--color-pine)"} />
      </svg>
      <p className="text-right text-sm" style={{ color: off ? "var(--color-lingon)" : undefined }}>
        {day < BASELINE_DAYS ? "learning" : off ? `${fmt(s)}, ${s.run} day${s.run > 1 ? "s" : ""}` : "usual"}
      </p>
    </li>
  );
}
