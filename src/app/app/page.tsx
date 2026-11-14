"use client";
// Pestaña "Hoy": qué hacer hoy (mentor) o simplemente estar acompañado (pupilo)

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Button, ErrorText, api, timeAgo, useLive } from "../ui";
import { useMe } from "./AppShell";

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
};

const IDEA: Record<string, string> = {
  walk: "a short walk together",
  coffee: "a coffee together",
  call: "a short call",
  sleep_routine: "sharing what helped your sleep",
  shared_activity: "something to do together",
  hello: "a short hello",
};

export default function TodayPage() {
  const { me } = useMe();
  const { data, error, reload } = useLive<MentorToday | PupilToday>("/api/app/today", 15000);
  const first = me.user.name;
  // Tras pedir ayuda desde la cabecera, refrescar al momento
  useEffect(() => {
    reload();
  }, [me.user.crisis, me.user.paused, reload]);
  return (
    <div className="flex flex-col gap-4 p-4">
      <h1 className="font-display text-3xl font-bold">Hi {first}</h1>
      <ErrorText>{error}</ErrorText>
      {!data ? <p className="text-pine/70">Loading…</p> : data.role === "mentor" ? <Mentor t={data} reload={reload} /> : data.role === "pupil" ? <Pupil t={data} reload={reload} /> : null}
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
        <Link href="/app/me" className="rounded-2xl bg-birch px-4 py-3 text-sm">
          <b>Welcome to mentoring.</b> Add when you&apos;re usually available and your story in one sentence, so your mentee knows you.
        </Link>
      )}
      {t.paused && (
        <Card tone="mist">
          <p className="font-bold">Mentoring is paused</p>
          <p className="mt-1 text-sm">Take the time you need. The clinic knows and is covering for you. Resume anytime from the Me tab.</p>
        </Card>
      )}
      {t.ownCheck && !t.paused && <SelfCare support={t.support} reload={reload} />}

      {!m ? (
        <Card tone="mist">
          <p className="font-bold">No one to mentor yet</p>
          <p className="mt-1 text-sm">Your clinic will match you with someone starting TMS. You&apos;ll see them here.</p>
        </Card>
      ) : m.crisis ? (
        <Card tone="lingon">
          <p className="font-display text-xl font-bold">The clinic is taking care of {m.name}.</p>
          <p className="mt-1">You don&apos;t need to do anything else. Emergency: 112.</p>
        </Card>
      ) : t.paused ? null : m.phase === "meet" ? (
        <MeetCard id={m.id} name={m.name} />
      ) : m.needsYou && m.suggestion ? (
        <ActionCard m={m} s={m.suggestion} reload={reload} />
      ) : m.reachedOut ? (
        <Card tone="moss">
          <p className="font-bold">You&apos;ve done your part for today</p>
          <p className="mt-1 text-sm">{m.name} will see your message. If anything changes, Relay will let you know.</p>
          <Link href={`/app/chat#${m.id}`} className="mt-3 inline-block text-sm font-bold underline underline-offset-4">
            Open chat with {m.name}
          </Link>
        </Card>
      ) : (
        <Card tone="moss">
          <p className="font-bold">All calm with {m.name}</p>
          <p className="mt-1 text-sm">Last message {timeAgo(m.lastMessageAt)}. A short hello keeps you close; no need for more.</p>
          <Link href={`/app/chat#${m.id}`} className="mt-3 inline-block rounded-full bg-pine px-4 py-2.5 text-sm font-bold text-paper">
            Message {m.name}
          </Link>
        </Card>
      )}

      {m && m.learned.length > 0 && !m.crisis && (
        <p className="px-1 text-sm text-pine/75">
          What has helped {m.name} before: <b>{m.learned.join(", ").toLowerCase()}</b>.
        </p>
      )}

      {t.former
        .filter((f) => f.needsHello)
        .map((f) => (
          <Card key={f.id} tone="mist">
            <p className="font-bold">{f.name} could use a hello from you</p>
            <p className="mt-1 text-sm">You mentored {f.name} before. A short message from you can mean a lot right now.</p>
            <Link href={`/app/chat#${f.id}`} className="mt-3 inline-block text-sm font-bold underline underline-offset-4">
              Message {f.name}
            </Link>
          </Card>
        ))}

      {t.support && (
        <p className="px-1 text-sm">
          Your former mentor <b>{t.support.name}</b> is still here for you.{" "}
          <Link href={`/app/chat#${t.support.id}`} className="font-bold underline underline-offset-4">
            Talk to {t.support.name}
          </Link>
        </p>
      )}

      <details className="rounded-2xl border border-mist px-4 py-3 text-sm">
        <summary className="cursor-pointer font-bold">What mentors don&apos;t do</summary>
        <p className="mt-2">
          You don&apos;t give advice on medication, diagnose, or stay available 24 hours. You&apos;re not responsible for anyone&apos;s recovery and you
          never see health data. Anything serious goes to the clinic.
        </p>
      </details>
    </>
  );
}

function ActionCard({ m, s, reload }: { m: NonNullable<MentorToday["mentee"]>; s: Suggestion; reload: () => Promise<void> }) {
  const draft = useRef<HTMLTextAreaElement>(null);
  const [state, setState] = useState<"idle" | "busy" | "sent">("idle");
  const [error, setError] = useState("");
  const tone = m.level === "high" ? "lingon" : "cloudberry";

  async function send() {
    setState("busy");
    try {
      await api("/api/app/chat", { action: "send", to: m.id, text: draft.current?.value || s.message, plan: s.action, level: m.level });
      setState("sent");
    } catch (e) {
      setError((e as Error).message);
      setState("idle");
    }
  }
  async function later() {
    await api("/api/app/chat", { action: "dismiss", level: m.level }).catch(() => {});
    await reload();
  }

  if (state === "sent")
    return (
      <Card tone="moss">
        <p className="font-bold">Sent to {m.name}</p>
        <p className="mt-1 text-sm">They&apos;ll see your invitation. You&apos;ve done your part for today.</p>
        <Link href={`/app/chat#${m.id}`} className="mt-3 inline-block text-sm font-bold underline underline-offset-4">
          Open chat
        </Link>
      </Card>
    );

  return (
    <Card tone={tone} className="arrive">
      <p className="font-display text-xl font-bold leading-tight">{s.headline}</p>
      <p className="mt-1 text-sm">Idea: {IDEA[s.action] ?? s.action}</p>
      <textarea
        ref={draft}
        defaultValue={s.message}
        rows={3}
        aria-label={`Message to ${m.name}`}
        className="mt-3 w-full resize-none rounded-xl border border-mist bg-paper p-3 text-sm"
      />
      {m.level === "high" && <p className="mt-2 text-sm">Also remind {m.name} that the clinic is one call away.</p>}
      <ErrorText>{error}</ErrorText>
      <div className="mt-3 flex gap-2">
        <Button className="flex-1" disabled={state === "busy"} onClick={send}>
          Send to {m.name}
        </Button>
        <Button kind="ghost" onClick={later}>
          Not now
        </Button>
      </div>
      <p className="mt-3 text-xs text-pine/60">
        Suggested by Relay {s.source === "gemini" ? "with Gemini" : ""} from changes in {m.name}&apos;s routine. You decide what to send.
      </p>
    </Card>
  );
}

function MeetCard({ id, name }: { id: string; name: string }) {
  const starter = `Hi ${name}! I'm your Relay mentor. I finished TMS myself, so I know what the first weeks feel like. Happy to share my story whenever you like.`;
  return (
    <Card tone="cloudberry">
      <p className="font-display text-xl font-bold">Get to know {name}</p>
      <p className="mt-1 text-sm">A first conversation builds trust. Some ideas:</p>
      <ol className="mt-2 list-decimal pl-5 text-sm">
        <li>Tell your story: how TMS went for you.</li>
        <li>Talk about the sessions: what they feel like, what to bring.</li>
        <li>Share a fear you had, and what helped.</li>
      </ol>
      <Link
        href={`/app/chat#${id}`}
        onClick={() => sessionStorage.setItem(`relay:draft:${id}`, starter)}
        className="mt-3 inline-block rounded-full bg-pine px-4 py-2.5 text-sm font-bold text-paper"
      >
        Say hello to {name}
      </Link>
    </Card>
  );
}

function SelfCare({ support, reload }: { support: MentorToday["support"]; reload: () => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  return (
    <Card tone="mist">
      <p className="font-bold">How are you doing?</p>
      <p className="mt-1 text-sm">Your own routine has changed a bit lately. Looking after yourself comes first; you can pause mentoring anytime.</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          kind="line"
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
          <Link href={`/app/chat#${support.id}`} className="rounded-full px-4 py-2.5 text-sm font-bold underline underline-offset-4">
            Talk to {support.name}
          </Link>
        )}
      </div>
    </Card>
  );
}

/* ---------- Pupilo ---------- */
function Pupil({ t, reload }: { t: PupilToday; reload: () => Promise<void> }) {
  const [busy, setBusy] = useState("");
  async function answer(id: string, yes: boolean) {
    if (!t.mentor) return;
    setBusy(id);
    await api("/api/app/chat", { action: "answer", with: t.mentor.id, to: t.mentor.id, id, answer: yes ? "yes" : "no" }).catch(() => {});
    await reload();
    setBusy("");
  }
  return (
    <>
      {t.crisis ? (
        <Card tone="lingon">
          <p className="font-display text-xl font-bold">Your clinic has been alerted</p>
          <p className="mt-1">They will contact you today. If you&apos;re in danger right now, call 112.</p>
          <a href="tel:112" className="mt-3 inline-block rounded-full bg-lingon px-4 py-2.5 font-bold text-paper">
            Call 112
          </a>
        </Card>
      ) : (
        <p className="text-lg">You don&apos;t need to do anything today.</p>
      )}

      {t.invites.map((i) => (
        <Card key={i.id} tone="cloudberry" className="arrive">
          <p className="text-sm text-pine/70">{t.mentor?.name} invited you</p>
          <p className="mt-1 font-display text-lg font-bold leading-snug">{i.text}</p>
          <div className="mt-3 flex gap-2">
            <Button className="flex-1" disabled={busy === i.id} onClick={() => answer(i.id, true)}>
              Sounds good
            </Button>
            <Button kind="line" className="flex-1" disabled={busy === i.id} onClick={() => answer(i.id, false)}>
              Not this time
            </Button>
          </div>
        </Card>
      ))}

      {t.mentor ? (
        <Card tone="mist">
          <p className="text-sm text-pine/70">Your mentor</p>
          <p className="font-display text-2xl font-bold">{t.mentor.name}</p>
          {t.mentor.story && <p className="mt-1">&ldquo;{t.mentor.story}&rdquo;</p>}
          {t.mentor.availability && <p className="mt-2 text-sm">Usually around: {t.mentor.availability}</p>}
          {t.mentor.paused && <p className="mt-2 text-sm">{t.mentor.name} is taking a short break. Your clinic is here for you meanwhile.</p>}
          <Link href={`/app/chat#${t.mentor.id}`} className="mt-3 inline-block rounded-full bg-pine px-4 py-2.5 text-sm font-bold text-paper">
            Message {t.mentor.name}
          </Link>
        </Card>
      ) : (
        <Card tone="mist">
          <p className="font-bold">Your mentor is on the way</p>
          <p className="mt-1 text-sm">Your clinic is matching you with someone who has been through TMS. You&apos;ll see them here.</p>
        </Card>
      )}
    </>
  );
}

function Card({ tone, className = "", children }: { tone: "mist" | "moss" | "cloudberry" | "lingon"; className?: string; children: React.ReactNode }) {
  const border = { mist: "border-mist", moss: "border-moss", cloudberry: "border-cloudberry", lingon: "border-lingon" }[tone];
  return <section className={`rounded-2xl border-2 ${border} bg-paper p-4 ${className}`}>{children}</section>;
}
