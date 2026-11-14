"use client";
// Pestaña "Hoy": qué hacer hoy (mentor) o simplemente estar acompañado (pupilo)

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Avatar, Button, Chevron, ErrorText, api, timeAgo, useLive } from "../ui";
import { useMe } from "./AppShell";
import Treatment, { type Sessions } from "./Treatment";

type Suggestion = { action: string; headline: string; message: string; explanation: string; source: string };
type MentorToday = {
  role: "mentor";
  mentee: {
    id: string;
    name: string;
    crisis: boolean;
    needsYou: boolean;
    reachedOut: boolean;
    level: "early" | "high" | "stable";
    suggestion: Suggestion | null;
    phase: "meet" | "daily";
    lastMessageAt: string | null;
    learned: string[];
  } | null;
  former: { id: string; name: string; needsHello: boolean }[];
  support: { id: string; name: string } | null;
  ownCheck: boolean;
  paused: boolean;
};
type PupilToday = {
  role: "pupil";
  mentor: { id: string; name: string; availability: string; paused: boolean; story: string } | null;
  invites: { id: string; text: string; action: string; at: string }[];
  crisis: boolean;
  sessions: Sessions | null;
};

const IDEA: Record<string, string> = {
  walk: "A short walk together",
  coffee: "A coffee together",
  call: "A short call",
  sleep_routine: "Share what helped your sleep",
  shared_activity: "Something to do together",
  hello: "A short hello",
};

export default function TodayPage() {
  const { me } = useMe();
  const { data, error, reload } = useLive<MentorToday | PupilToday>("/api/app/today", 15000);
  // Tras pedir ayuda o pausar desde otra pantalla, refrescar al momento
  useEffect(() => {
    reload();
  }, [me.user.crisis, me.user.paused, reload]);
  const today = new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });

  return (
    <div className="stagger flex flex-col gap-4 px-4 pb-8 pt-5">
      <div>
        <p className="muted text-sm">{today}</p>
        <h1 className="text-[1.75rem] font-bold leading-tight">Hi {me.user.name}</h1>
      </div>
      <ErrorText>{error}</ErrorText>
      {!data ? (
        <div className="card h-40 animate-pulse" />
      ) : data.role === "mentor" ? (
        <Mentor t={data} reload={reload} />
      ) : data.role === "pupil" ? (
        <Pupil t={data} reload={reload} />
      ) : null}
    </div>
  );
}

/* ---------- Mentor ---------- */
function Mentor({ t, reload }: { t: MentorToday; reload: () => Promise<void> }) {
  const { me } = useMe();
  const m = t.mentee;
  return (
    <>
      {!me.user.availability && (
        <Link href="/app/me" className="card lift flex items-center justify-between gap-3 px-4 py-3 text-sm">
          <span>
            <b>Welcome to mentoring.</b> Add when you&apos;re usually available, so your mentee knows you.
          </span>
          <Chevron />
        </Link>
      )}
      {t.paused && (
        <Panel status="#8a9a92" title="Mentoring is paused">
          Take the time you need. The clinic knows and is covering for you. Resume anytime from the Me tab.
        </Panel>
      )}
      {t.ownCheck && !t.paused && <SelfCare support={t.support} reload={reload} />}

      {!m ? (
        <Panel status="#8a9a92" title="No one to mentor yet">
          Your clinic will match you with someone starting TMS. They&apos;ll appear here.
        </Panel>
      ) : m.crisis ? (
        <Panel status="var(--color-lingon)" title={`The clinic is taking care of ${m.name}`}>
          You don&apos;t need to do anything else. If someone is in danger, call 112.
        </Panel>
      ) : t.paused ? null : m.phase === "meet" ? (
        <MeetCard id={m.id} name={m.name} />
      ) : m.needsYou && m.suggestion ? (
        <ActionCard m={m} s={m.suggestion} reload={reload} />
      ) : m.reachedOut ? (
        <Panel status="var(--color-moss)" title="You've done your part for today">
          {m.name} will see your message. If anything changes, Relay will let you know.
        </Panel>
      ) : (
        <Panel status="var(--color-moss)" title={`All calm with ${m.name}`}>
          Nothing needs you today. A short hello now and then keeps you close.
        </Panel>
      )}

      <People t={t} />

      {m && m.learned.length > 0 && !m.crisis && (
        <div className="card px-4 py-3">
          <p className="text-sm font-semibold">What has helped {m.name} before</p>
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {m.learned.map((l) => (
              <li key={l} className="rounded-md bg-birch px-2 py-1 text-sm">
                {l}
              </li>
            ))}
          </ul>
          <p className="muted mt-2 text-xs">Relay learns this when {m.name}&apos;s routine improves after your plans.</p>
        </div>
      )}

      <details className="card group px-4 py-3 text-sm">
        <summary className="flex cursor-pointer list-none items-center justify-between font-semibold">
          What mentors don&apos;t do
          <span className="transition-transform group-open:rotate-90">
            <Chevron />
          </span>
        </summary>
        <p className="muted mt-2">
          No advice on medication, no diagnosing, no being available 24 hours. You&apos;re not responsible for anyone&apos;s recovery and you never see
          health data. Anything serious goes to the clinic.
        </p>
      </details>
    </>
  );
}

// Lista de personas: pupilo, antiguo mentor de apoyo y antiguos pupilos
function People({ t }: { t: MentorToday }) {
  const rows: { id: string; name: string; note: string; flag?: string }[] = [];
  if (t.mentee) rows.push({ id: t.mentee.id, name: t.mentee.name, note: `You mentor ${t.mentee.name}. Last message ${timeAgo(t.mentee.lastMessageAt)}.` });
  if (t.support) rows.push({ id: t.support.id, name: t.support.name, note: "Your former mentor, still here for you." });
  for (const f of t.former) rows.push({ id: f.id, name: f.name, note: "You mentored them before.", flag: f.needsHello ? "Could use a hello" : undefined });
  if (!rows.length) return null;
  return (
    <section>
      <h2 className="mb-2 mt-2 text-sm font-semibold">Your people</h2>
      <ul className="card divide-y divide-mist">
        {rows.map((r) => (
          <li key={r.id}>
            <Link href={`/app/chat#${r.id}`} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-birch/60">
              <Avatar name={r.name} />
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2 font-semibold">
                  {r.name}
                  {r.flag && <span className="rounded bg-[#f8eedd] px-1.5 py-0.5 text-xs font-semibold text-cloudberry-ink">{r.flag}</span>}
                </span>
                <span className="muted block truncate text-sm">{r.note}</span>
              </span>
              <Chevron />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function ActionCard({ m, s, reload }: { m: NonNullable<MentorToday["mentee"]>; s: Suggestion; reload: () => Promise<void> }) {
  const draft = useRef<HTMLTextAreaElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const color = m.level === "high" ? "var(--color-lingon)" : "var(--color-cloudberry)";

  async function send() {
    setBusy(true);
    try {
      await api("/api/app/chat", { action: "send", to: m.id, text: draft.current?.value || s.message, plan: s.action, level: m.level });
      await reload();
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }
  async function later() {
    await api("/api/app/chat", { action: "dismiss", level: m.level }).catch(() => {});
    await reload();
  }

  return (
    <section className="card card-status arrive p-4 pl-5" style={{ "--status": color } as React.CSSProperties}>
      <p className="muted text-sm">Suggested for today</p>
      <h2 className="mt-0.5 text-xl font-bold leading-snug">{s.headline}</h2>
      <div className="mt-3 flex items-center gap-2.5 rounded-lg bg-birch px-3 py-2">
        <IdeaIcon action={s.action} />
        <span className="text-sm font-semibold">{IDEA[s.action] ?? s.action}</span>
      </div>
      <label className="label mt-4" htmlFor="draft">
        Your message to {m.name}
      </label>
      <textarea id="draft" ref={draft} defaultValue={s.message} rows={3} className="input resize-none text-[0.9375rem] leading-snug" />
      {m.level === "high" && <p className="mt-2 text-sm">Also remind {m.name} that the clinic is one call away.</p>}
      <ErrorText>{error}</ErrorText>
      <div className="mt-3 flex gap-2">
        <Button className="flex-1" disabled={busy} onClick={send}>
          {busy ? "Sending…" : `Send to ${m.name}`}
        </Button>
        <Button kind="quiet" onClick={later}>
          Not now
        </Button>
      </div>
      <p className="muted mt-3 border-t border-mist pt-3 text-xs">
        Relay noticed a change in {m.name}&apos;s routine{s.source === "gemini" ? " and Gemini picked this idea" : ""}. You never see their data, and you decide
        what to send.
      </p>
    </section>
  );
}

function MeetCard({ id, name }: { id: string; name: string }) {
  const starter = `Hi ${name}! I'm your Relay mentor. I finished TMS myself, so I know what the first weeks feel like. Happy to share my story whenever you like.`;
  return (
    <section className="card card-status p-4 pl-5" style={{ "--status": "var(--color-cloudberry)" } as React.CSSProperties}>
      <p className="muted text-sm">First step</p>
      <h2 className="mt-0.5 text-xl font-bold">Get to know {name}</h2>
      <p className="mt-1 text-sm">A first conversation builds trust. Some ideas:</p>
      <ol className="mt-2 flex flex-col gap-1.5 text-sm">
        {["Tell your story: how TMS went for you.", "Talk about the sessions: what they feel like, what to bring.", "Share a fear you had, and what helped."].map((x, i) => (
          <li key={x} className="flex gap-2.5">
            <span className="num flex h-5 w-5 shrink-0 items-center justify-center rounded bg-birch text-xs font-semibold">{i + 1}</span>
            {x}
          </li>
        ))}
      </ol>
      <Link href={`/app/chat#${id}`} onClick={() => sessionStorage.setItem(`relay:draft:${id}`, starter)} className="btn btn-primary mt-4 w-full">
        Say hello to {name}
      </Link>
    </section>
  );
}

function SelfCare({ support, reload }: { support: MentorToday["support"]; reload: () => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  return (
    <Panel status="#8a9a92" title="How are you doing?">
      Your own routine has changed a bit lately. Looking after yourself comes first; you can pause mentoring anytime.
      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          kind="secondary"
          size="sm"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            await api("/api/app/me", { action: "pause", paused: true });
            await reload();
            setBusy(false);
          }}
        >
          Pause mentoring
        </Button>
        {support && (
          <Link href={`/app/chat#${support.id}`} className="btn btn-quiet btn-sm">
            Talk to {support.name}
          </Link>
        )}
      </div>
    </Panel>
  );
}

/* ---------- Pupilo ---------- */
function Pupil({ t, reload }: { t: PupilToday; reload: () => Promise<void> }) {
  const [busy, setBusy] = useState("");
  async function answer(id: string, yes: boolean) {
    if (!t.mentor) return;
    setBusy(id);
    await api("/api/app/chat", { action: "answer", to: t.mentor.id, id, answer: yes ? "yes" : "no" }).catch(() => {});
    await reload();
    setBusy("");
  }
  return (
    <>
      {t.crisis ? (
        <section className="card card-status p-4 pl-5" style={{ "--status": "var(--color-lingon)" } as React.CSSProperties}>
          <h2 className="text-xl font-bold">Your clinic has been alerted</h2>
          <p className="mt-1">They will contact you today. If you&apos;re in danger right now, call 112.</p>
          <a href="tel:112" className="btn btn-danger mt-3 w-full">
            Call 112
          </a>
        </section>
      ) : (
        <p className="text-lg">You don&apos;t need to do anything today.</p>
      )}

      {t.invites.map((i) => (
        <section key={i.id} className="card card-status arrive p-4 pl-5" style={{ "--status": "var(--color-cloudberry)" } as React.CSSProperties}>
          <p className="muted text-sm">{t.mentor?.name} invited you</p>
          <p className="mt-1 text-lg font-semibold leading-snug">{i.text}</p>
          <div className="mt-4 flex gap-2">
            <Button className="flex-1" disabled={busy === i.id} onClick={() => answer(i.id, true)}>
              Sounds good
            </Button>
            <Button kind="secondary" className="flex-1" disabled={busy === i.id} onClick={() => answer(i.id, false)}>
              Not this time
            </Button>
          </div>
        </section>
      ))}

      {t.sessions && <Treatment s={t.sessions} />}

      {t.mentor ? (
        <section className="card p-4">
          <div className="flex items-center gap-3">
            <Avatar name={t.mentor.name} large />
            <div>
              <p className="muted text-sm">Your mentor</p>
              <p className="text-xl font-bold">{t.mentor.name}</p>
            </div>
          </div>
          {t.mentor.story && <p className="mt-3 border-l-2 border-mist pl-3">{t.mentor.story}</p>}
          {t.mentor.availability && (
            <p className="muted mt-3 text-sm">
              Usually around: <span className="text-pine">{t.mentor.availability}</span>
            </p>
          )}
          {t.mentor.paused && <p className="mt-2 text-sm">{t.mentor.name} is taking a short break. Your clinic is here for you meanwhile.</p>}
          <Link href={`/app/chat#${t.mentor.id}`} className="btn btn-primary mt-4 w-full">
            Message {t.mentor.name}
          </Link>
        </section>
      ) : (
        <Panel status="#8a9a92" title="Your mentor is on the way">
          Your clinic is matching you with someone who has been through TMS. They&apos;ll appear here.
        </Panel>
      )}
    </>
  );
}

/* ---------- Piezas ---------- */
function Panel({ status, title, children }: { status: string; title: string; children: React.ReactNode }) {
  return (
    <section className="card card-status p-4 pl-5" style={{ "--status": status } as React.CSSProperties}>
      <h2 className="text-lg font-bold">{title}</h2>
      <div className="muted mt-1 text-[0.9375rem]">{children}</div>
    </section>
  );
}

const ICONS: Record<string, string> = {
  walk: "M13 4a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0M10 8l-3 3 1 1M11 8l1 5 3 2M11 13l-2 6",
  coffee: "M5 9h11v5a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4zM16 10h1.5a2 2 0 0 1 0 4H16M8 4v2M11 3v3",
  call: "M6 4h3l1.5 4-2 1.5a10 10 0 0 0 5 5l1.5-2 4 1.5v3a2 2 0 0 1-2 2A15 15 0 0 1 4 6a2 2 0 0 1 2-2",
  sleep_routine: "M19 14A8 8 0 1 1 10 5a6 6 0 0 0 9 9",
  shared_activity: "M8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6M16 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6M3 19a5 5 0 0 1 10 0M11 19a5 5 0 0 1 10 0",
  hello: "M4 6h16v10H9l-5 4z",
};
function IdeaIcon({ action }: { action: string }) {
  return (
    <span className="flex h-8 w-8 items-center justify-center rounded-md bg-paper shadow-[0_0_0_1px_var(--color-mist)]">
      <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d={ICONS[action] ?? ICONS.hello} />
      </svg>
    </span>
  );
}
