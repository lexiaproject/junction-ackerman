"use client";

import { useMemo, useRef, useState } from "react";
import {
  BASELINE_DAYS,
  MENTOR,
  PUPIL,
  SEED_CHAT,
  SIGNALS,
  TOTAL_DAYS,
  generateDays,
  type ChatMsg,
  type DayData,
} from "@/lib/data";
import { CATALOG, analyse, describeChanges, type ActionKey, type Level, type SignalStatus, type Suggestion } from "@/lib/engine";

const START_DAY = BASELINE_DAYS; // la demo empieza el día 8, con la línea base ya aprendida
type Alert = "early" | "high";

const LEVEL_TEXT: Record<Level, string> = {
  learning: "Learning Laura's usual week",
  stable: "Stable",
  early: "Early signs",
  high: "High risk",
  crisis: "Crisis: clinic alerted",
};
const LEVEL_COLOR: Record<Level, string> = {
  learning: "var(--color-mist)",
  stable: "var(--color-moss)",
  early: "var(--color-cloudberry)",
  high: "var(--color-lingon)",
  crisis: "var(--color-lingon)",
};

export default function Demo() {
  const [day, setDay] = useState(START_DAY);
  const [actionDay, setActionDay] = useState<number | null>(null);
  const [sentAction, setSentAction] = useState<ActionKey | null>(null);
  const [sentFor, setSentFor] = useState<Alert[]>([]);
  const [dismissed, setDismissed] = useState<Alert[]>([]);
  const [suggestions, setSuggestions] = useState<Partial<Record<Alert, Suggestion>>>({});
  const [loading, setLoading] = useState<Alert | null>(null);
  const [extraChat, setExtraChat] = useState<ChatMsg[]>([]);
  const [crisis, setCrisis] = useState(false);
  const draft = useRef<HTMLTextAreaElement>(null);

  const days = useMemo(() => generateDays(actionDay), [actionDay]);
  const levels = useMemo(() => days.map((_, i) => analyse(days, i).level), [days]);
  const { statuses } = analyse(days, day);
  const level: Level = crisis ? "crisis" : levels[day];
  const alert: Alert | null = level === "early" || level === "high" ? level : null;
  const learned = actionDay !== null && day > actionDay && levels[day] === "stable" && sentAction ? [CATALOG[sentAction]] : [];

  const chat = [...SEED_CHAT, ...extraChat].filter((m) => m.day <= day + 1);
  const lastMsg = chat[chat.length - 1];
  const pendingPlan = lastMsg?.from === "mentor" && lastMsg.plan && lastMsg.day === day + 1 && extraChat.includes(lastMsg);

  async function fetchSuggestion(a: Alert, s: SignalStatus[]) {
    setLoading(a);
    try {
      const res = await fetch("/api/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ level: a, changes: describeChanges(s), learned }),
      });
      const sug: Suggestion = await res.json();
      setSuggestions((prev) => ({ ...prev, [a]: sug }));
    } finally {
      setLoading(null);
    }
  }

  function nextDay() {
    if (day >= TOTAL_DAYS - 1) return;
    const next = day + 1;
    const res = analyse(days, next);
    setDay(next);
    if ((res.level === "early" || res.level === "high") && !suggestions[res.level]) fetchSuggestion(res.level, res.statuses);
  }

  function restart() {
    setDay(START_DAY);
    setActionDay(null);
    setSentAction(null);
    setSentFor([]);
    setDismissed([]);
    setSuggestions({});
    setExtraChat([]);
    setCrisis(false);
  }

  function send(a: Alert, sug: Suggestion) {
    const text = draft.current?.value.trim() || sug.message;
    setExtraChat((c) => [...c, { day: day + 1, from: "mentor", text, plan: true }]);
    setSentFor((s) => [...s, a]);
    if (actionDay === null) {
      setActionDay(day);
      setSentAction(sug.action);
    }
  }

  function answer(yes: boolean) {
    setExtraChat((c) => [
      ...c,
      { day: day + 1, from: "pupil", text: yes ? "Okay, yes. That actually sounds nice." : "Not today, but thank you for asking." },
    ]);
  }

  const showCard = alert && !crisis && !sentFor.includes(alert) && !dismissed.includes(alert);
  const sug = alert ? suggestions[alert] : undefined;

  return (
    <main className="mx-auto w-full max-w-[1280px] px-4 py-6 sm:px-6 lg:py-10">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-5xl font-extrabold tracking-tight sm:text-6xl">Relay</h1>
          <p className="mt-1 max-w-xl text-lg">Every patient who gets better becomes the support for the next one.</p>
        </div>
        <p className="max-w-xs text-sm text-pine/70">
          Demo with simulated sensor data. Pattern detection, AI suggestions and screens are real.
        </p>
      </header>

      <div className="grid gap-8 sm:grid-cols-2 xl:grid-cols-[300px_1fr_300px] xl:items-start">
        {/* Móvil del pupilo */}
        <Phone caption={`${PUPIL}'s phone`} sub="In TMS treatment. Doesn't need to do anything.">
          <PhoneHeader title={MENTOR} sub="Your mentor" />
          <Chat msgs={chat} me="pupil" />
          {pendingPlan && !crisis && (
            <div className="flex gap-2 border-t border-mist px-3 py-2">
              <button onClick={() => answer(true)} className="flex-1 rounded-full bg-pine px-3 py-2 text-sm font-bold text-paper">
                Sounds good
              </button>
              <button onClick={() => answer(false)} className="flex-1 rounded-full border border-pine px-3 py-2 text-sm font-bold">
                Not today
              </button>
            </div>
          )}
          {crisis ? (
            <div className="border-t border-lingon/30 bg-lingon/10 px-4 py-3 text-sm">
              The clinic has been told and will contact you today. In danger right now? Call <b>112</b>.
            </div>
          ) : (
            <div className="flex items-center justify-between border-t border-mist px-4 py-3 text-sm">
              <span>Emergency: 112</span>
              <button onClick={() => setCrisis(true)} className="rounded-full bg-lingon px-3 py-1.5 font-bold text-paper">
                I need help now
              </button>
            </div>
          )}
        </Phone>

        {/* Lo que ve el sistema */}
        <section className="order-first sm:col-span-2 xl:order-none xl:col-span-1">
          <Timeline levels={levels} day={day} crisis={crisis} onNext={nextDay} onRestart={restart} />

          <div className="mt-6 rounded-2xl border border-mist bg-paper/70 p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="font-display text-2xl font-bold">What the system sees</h2>
              <p className="text-sm text-pine/70">Hidden from {MENTOR}. Compared only with Laura&apos;s own first week.</p>
            </div>

            <ul className="mt-4 divide-y divide-mist">
              {statuses.map((s) => (
                <SignalRow key={s.key} s={s} days={days} day={day} />
              ))}
            </ul>

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <span
                className="inline-flex items-center gap-2 rounded-full px-3 py-1 font-bold"
                style={{ background: LEVEL_COLOR[level], color: level === "learning" ? "var(--color-pine)" : "var(--color-paper)" }}
              >
                {LEVEL_TEXT[level]}
              </span>
              {loading && <span className="text-sm">Asking Claude for the right action…</span>}
            </div>

            {crisis ? (
              <p className="mt-3">Alert sent straight to the clinic. {MENTOR} is told the clinic is handling it, nothing more.</p>
            ) : (
              sug &&
              alert && (
                <div className="mt-3">
                  <p>
                    <b>{sug.source === "claude" ? "Claude" : "Backup rules"} chose:</b> {CATALOG[sug.action]}
                  </p>
                  <p className="mt-1 text-pine/80">{sug.explanation}</p>
                </div>
              )
            )}
            {learned.length > 0 && (
              <p className="mt-3 rounded-lg bg-moss/15 px-3 py-2">
                Back to baseline. Learned for this pair: <b>{learned[0].toLowerCase()}</b> helps.
              </p>
            )}
          </div>
        </section>

        {/* Móvil del mentor */}
        <Phone caption={`${MENTOR}'s phone`} sub="Finished TMS in September. Mentors Laura.">
          <PhoneHeader title={PUPIL} sub="You're mentoring" />
          <Chat msgs={chat} me="mentor" />
          {crisis ? (
            <div className="arrive m-3 rounded-xl border border-lingon/40 bg-paper p-4">
              <p className="font-bold">The clinic is taking care of Laura.</p>
              <p className="mt-1 text-sm">You don&apos;t need to do anything else. Emergency: 112.</p>
            </div>
          ) : showCard && sug ? (
            <div key={alert + sug.source} className="arrive m-3 rounded-xl border-2 p-3" style={{ borderColor: LEVEL_COLOR[alert] }}>
              <p className="font-display text-lg font-bold leading-tight">{sug.headline}</p>
              <p className="mt-1 text-sm">Idea: {CATALOG[sug.action].toLowerCase()}</p>
              <textarea
                ref={draft}
                defaultValue={sug.message}
                rows={3}
                aria-label="Message to send"
                className="mt-2 w-full resize-none rounded-lg border border-mist bg-birch/60 p-2 text-sm"
              />
              {alert === "high" && <p className="mt-1 text-xs">Also remind Laura the clinic is one call away.</p>}
              <div className="mt-2 flex gap-2">
                <button onClick={() => send(alert, sug)} className="flex-1 rounded-full bg-pine px-3 py-2 text-sm font-bold text-paper">
                  Send to Laura
                </button>
                <button onClick={() => setDismissed((d) => [...d, alert])} className="rounded-full px-3 py-2 text-sm">
                  Not now
                </button>
              </div>
            </div>
          ) : (
            <p className="border-t border-mist px-4 py-3 text-sm text-pine/70">
              {loading ? "…" : "All quiet. A short hello keeps you close."}
            </p>
          )}
        </Phone>
      </div>
    </main>
  );
}

function Timeline({
  levels,
  day,
  crisis,
  onNext,
  onRestart,
}: {
  levels: Level[];
  day: number;
  crisis: boolean;
  onNext: () => void;
  onRestart: () => void;
}) {
  return (
    <div>
      <div className="flex items-end justify-between gap-4">
        <p className="font-display text-4xl font-bold">
          Day {day + 1}
          <span className="text-xl font-normal text-pine/60"> of {TOTAL_DAYS}</span>
        </p>
        <div className="flex gap-2">
          <button onClick={onRestart} className="rounded-full border border-pine px-4 py-2 font-bold">
            Restart
          </button>
          <button
            onClick={onNext}
            disabled={day >= TOTAL_DAYS - 1}
            className="rounded-full bg-pine px-5 py-2 font-bold text-paper disabled:opacity-40"
          >
            Next day
          </button>
        </div>
      </div>
      <ol className="mt-4 grid grid-cols-14 gap-1" style={{ gridTemplateColumns: `repeat(${TOTAL_DAYS}, 1fr)` }}>
        {levels.map((l, i) => {
          const shown: Level = i === day && crisis ? "crisis" : l;
          return (
            <li
              key={i}
              title={`Day ${i + 1}: ${i <= day ? LEVEL_TEXT[shown] : "not yet"}`}
              className="h-10 rounded-md"
              style={{
                background: i <= day ? LEVEL_COLOR[shown] : "transparent",
                border: i <= day ? "none" : "1px dashed var(--color-mist)",
                outline: i === day ? "2px solid var(--color-pine)" : undefined,
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
  const y = (v: number) => r1(H - 3 - ((v - lo) / (hi - lo || 1)) * (H - 6));
  const pts = all.slice(0, day + 1).map((v, i) => `${x(i)},${y(v)}`).join(" ");
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

function Phone({ caption, sub, children }: { caption: string; sub: string; children: React.ReactNode }) {
  return (
    <figure className="mx-auto w-full max-w-[300px]">
      <figcaption className="mb-2">
        <p className="font-display text-lg font-bold">{caption}</p>
        <p className="text-sm text-pine/70">{sub}</p>
      </figcaption>
      <div className="flex h-[580px] flex-col overflow-hidden rounded-[36px] border-[6px] border-pine bg-paper shadow-[0_20px_40px_-20px_rgba(30,59,53,0.45)]">
        {children}
      </div>
    </figure>
  );
}

function PhoneHeader({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="border-b border-mist px-4 pb-2 pt-4">
      <p className="text-xs text-pine/60">{sub}</p>
      <p className="font-display text-lg font-bold">{title}</p>
    </div>
  );
}

function Chat({ msgs, me }: { msgs: ChatMsg[]; me: "mentor" | "pupil" }) {
  return (
    <div className="flex flex-1 flex-col-reverse overflow-y-auto px-3 py-3">
      <div className="flex flex-col gap-1.5">
        {msgs.map((m, i) => {
          const mine = m.from === me;
          const newDay = i === 0 || msgs[i - 1].day !== m.day;
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
