"use client";
// Pestaña "Me": tu semana, tu impacto (mentor), tu tratamiento (pupilo), fuentes de datos, consentimiento y derechos

import { useState } from "react";
import { SignalChart, type SignalSeries } from "../../charts";
import { Avatar, Button, ErrorText, api, useLive } from "../../ui";
import { useMe } from "../AppShell";
import Treatment from "../Treatment";

type Insights = {
  level: string;
  dates: string[];
  signals: (SignalSeries & { key: string; kind: string })[];
  impact: { days: number; people: string[]; sent: number; invites: number; accepted: number } | null;
  sessions: { done: number; total: number; next?: string } | null;
};

export default function MePage() {
  const { me, reload } = useMe();
  const u = me.user;
  const consented = !!u.consent && !u.consent.revokedAt;
  const { data: ins } = useLive<Insights>("/api/app/insights");
  const [availability, setAvailability] = useState(u.availability);
  const [story, setStory] = useState(u.story);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  async function act(body: Record<string, unknown>) {
    try {
      await api("/api/app/me", body);
      await reload();
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <div className="stagger flex flex-col gap-6 px-4 pb-10 pt-5">
      <div className="flex items-center gap-3">
        <Avatar name={u.name} large />
        <div className="min-w-0">
          <h1 className="text-2xl font-bold leading-tight">{u.name}</h1>
          <p className="muted truncate text-sm">
            {u.role === "mentor" ? "Mentor" : "In treatment"} at {me.clinic?.name}
          </p>
        </div>
      </div>
      <ErrorText>{error}</ErrorText>

      {ins?.impact && <Impact i={ins.impact} />}
      {ins?.sessions && <Treatment s={ins.sessions} />}
      {ins && <YourWeek ins={ins} consented={consented} />}

      {u.role === "mentor" && (
        <Section title="Mentoring">
          <div className="p-4">
            <label className="label" htmlFor="avail">
              When are you usually available?
            </label>
            <input id="avail" className="input" value={availability} onChange={(e) => setAvailability(e.target.value)} placeholder="e.g. Weekdays 17–20" />
            <label className="label mt-3" htmlFor="story">
              Your story in one sentence
            </label>
            <input id="story" className="input" value={story} onChange={(e) => setStory(e.target.value)} placeholder="e.g. Finished TMS in spring; walks helped me most." />
            <div className="mt-3 flex items-center gap-3">
              <Button
                size="sm"
                onClick={async () => {
                  await act({ action: "profile", availability, story });
                  setSaved(true);
                }}
              >
                Save
              </Button>
              {saved && <span className="muted text-sm">Saved</span>}
            </div>
          </div>
          <Row title={u.paused ? "Mentoring is paused" : "Need a break?"} detail="You mentor one person at a time and can step back whenever you want. The clinic covers for you.">
            <Button size="sm" kind="secondary" onClick={() => act({ action: "pause", paused: !u.paused })}>
              {u.paused ? "Resume" : "Pause"}
            </Button>
          </Row>
        </Section>
      )}

      <Sources consented={consented} />

      <Section title="Consent">
        <Row
          title={consented ? "Signals on" : "Signals off"}
          detail={
            consented
              ? `Since ${new Date(u.consent!.at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}. Your mentor never sees your data; your clinic sees one line if you may need a call.`
              : "You withdrew consent. Relay collects no signals about you; chat still works."
          }
        >
          <Button size="sm" kind="secondary" onClick={() => act({ action: "consent", give: !consented })}>
            {consented ? "Withdraw" : "Turn on"}
          </Button>
        </Row>
      </Section>

      <Section title="Your data">
        <Row title="Download my data" detail="Everything Relay stores about you, in one file.">
          <a href="/api/app/export" className="btn btn-secondary btn-sm">
            Download
          </a>
        </Row>
        <Row title="Delete my account" detail="Removes your profile, signals and conversations for good.">
          <Button
            size="sm"
            kind="danger-outline"
            onClick={async () => {
              if (!confirm("Delete your Relay account and all your data? This can't be undone.")) return;
              await api("/api/app/me", { action: "delete" });
              window.location.href = "/";
            }}
          >
            Delete
          </Button>
        </Row>
      </Section>

      <Button
        kind="secondary"
        onClick={async () => {
          await api("/api/app/auth", { action: "logout" });
          window.location.href = "/";
        }}
      >
        Log out
      </Button>
    </div>
  );
}

/* ---------- Tu impacto (mentor) ---------- */
function Impact({ i }: { i: NonNullable<Insights["impact"]> }) {
  const rate = i.invites ? Math.round((100 * i.accepted) / i.invites) : 0;
  return (
    <section className="card overflow-hidden">
      <div className="relative bg-pine px-4 py-4 text-white">
        <RelayRings />
        <p className="text-sm opacity-80">Your impact</p>
        <p className="mt-0.5 text-xl font-bold leading-snug">
          {i.people.length > 1 ? `You've walked alongside ${i.people.length} people` : `${i.days} days alongside ${i.people[0] ?? "your mentee"}`}
        </p>
      </div>
      <dl className="grid grid-cols-3 divide-x divide-mist">
        <Stat label="Invitations" value={i.invites} />
        <Stat label="Messages" value={i.sent} />
        <Stat label="Plans accepted" value={i.invites ? `${rate}%` : "–"} />
      </dl>
      <p className="muted border-t border-mist px-4 py-2.5 text-xs">Helping someone is part of staying well yourself. Thank you.</p>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="px-3 py-3 text-center">
      <dd className="num text-2xl font-bold">{value}</dd>
      <dt className="muted text-xs">{label}</dt>
    </div>
  );
}

// Detalle decorativo: los dos círculos del relevo, en grande y casi transparentes
function RelayRings() {
  return (
    <svg viewBox="0 0 120 60" className="pointer-events-none absolute -right-4 -top-3 h-24 w-48 opacity-20" aria-hidden>
      <circle cx="40" cy="30" r="26" fill="none" stroke="#fff" strokeWidth="1.5" />
      <circle cx="72" cy="30" r="26" fill="none" stroke="var(--color-cloudberry)" strokeWidth="1.5" />
    </svg>
  );
}

/* ---------- Tu semana: tus propias señales ---------- */
function YourWeek({ ins, consented }: { ins: Insights; consented: boolean }) {
  const [tab, setTab] = useState<"in-app" | "sample">("sample");
  if (!consented) return null;
  if (!ins.signals.length)
    return (
      <Section title="Your weeks">
        <p className="muted p-4 text-sm">Relay is learning your usual routine. Charts appear after your first week.</p>
      </Section>
    );
  const shown = ins.signals.filter((s) => s.kind === tab);
  const anyOff = ins.signals.some((s) => s.off);
  return (
    <section>
      <div className="mb-2 flex items-end justify-between">
        <h2 className="text-sm font-semibold">Your last two weeks</h2>
        <div className="flex rounded-lg border border-line bg-paper p-0.5 text-xs font-semibold" role="tablist">
          {(
            [
              ["sample", "Body"],
              ["in-app", "Activity"],
            ] as const
          ).map(([k, l]) => (
            <button
              key={k}
              role="tab"
              aria-selected={tab === k}
              onClick={() => setTab(k)}
              className={`rounded-md px-3 py-1.5 transition-colors ${tab === k ? "bg-pine text-white" : "text-pine/70 hover:text-pine"}`}
            >
              {l}
            </button>
          ))}
        </div>
      </div>
      <div className="card divide-y divide-mist">
        <p className="px-4 py-3 text-sm">
          {anyOff ? "Some things look different from your usual lately. That's okay; your mentor may check in." : "Everything is close to your usual. Nice and steady."}
        </p>
        {shown.map((s) => (
          <div key={s.key} className="px-4 py-3">
            <div className="mb-1.5 flex items-baseline justify-between">
              <p className="text-sm font-semibold">{s.label}</p>
              <p className="muted text-xs">
                usual {s.mean.toLocaleString("en-GB", { maximumFractionDigits: s.digits })}
                {s.unit && s.unit !== "/day" ? ` ${s.unit}` : ""}
              </p>
            </div>
            <SignalChart s={s} dates={ins.dates} height={56} />
          </div>
        ))}
        <p className="muted px-4 py-2.5 text-xs">The shaded band is your usual range from your first week. Touch a chart to see each day.</p>
      </div>
    </section>
  );
}

/* ---------- Fuentes de datos (MOCK: conexiones simuladas para ver cómo sería en uso real) ---------- */
const SOURCES = [
  { id: "relay", name: "Activity in Relay", detail: "App opens, replies, reply times, late nights", sync: "Live" },
  { id: "phone", name: "Phone sensors", detail: "Steps, time outside, screen time at night", sync: "Synced 2 min ago" },
  { id: "health", name: "Apple Health", detail: "Sleep duration and regularity, resting heart rate", sync: "Synced 14 min ago" },
  { id: "ring", name: "Oura Ring", detail: "Heart rate variability, sleep stages", sync: "Synced 1 h ago · battery 64%" },
];

function Sources({ consented }: { consented: boolean }) {
  const [off, setOff] = useState<string[]>([]);
  return (
    <Section title="Data sources">
      {SOURCES.map((s) => {
        const on = consented && !off.includes(s.id);
        return (
          <div key={s.id} className="flex items-center justify-between gap-3 px-4 py-3">
            <SourceIcon id={s.id} on={on} />
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{s.name}</p>
              <p className="muted text-sm">{s.detail}</p>
              <p className={`mt-0.5 text-xs ${on ? "text-moss-ink" : "muted"}`}>{on ? s.sync : consented ? "Paused" : "Off: consent withdrawn"}</p>
            </div>
            <Switch on={on} disabled={!consented} label={s.name} onChange={() => setOff((o) => (o.includes(s.id) ? o.filter((x) => x !== s.id) : [...o, s.id]))} />
          </div>
        );
      })}
    </Section>
  );
}

function Switch({ on, onChange, label, disabled }: { on: boolean; onChange: () => void; label: string; disabled?: boolean }) {
  return (
    <button
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={disabled}
      onClick={onChange}
      className={`relative h-7 w-12 shrink-0 rounded-full transition-colors duration-200 disabled:opacity-40 ${on ? "bg-moss" : "bg-line"}`}
    >
      <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform duration-200 ${on ? "translate-x-[22px]" : "translate-x-0.5"}`} />
    </button>
  );
}

const SRC_ICON: Record<string, string> = {
  relay: "M7 12a4 4 0 1 0 8 0 4 4 0 0 0-8 0M11 12a4 4 0 1 0 8 0 4 4 0 0 0-8 0",
  phone: "M8 3h8a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1M11 18h2",
  health: "M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10",
  ring: "M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16m0 3a5 5 0 1 1 0 10 5 5 0 0 1 0-10",
};
function SourceIcon({ id, on }: { id: string; on: boolean }) {
  return (
    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${on ? "bg-[#e5efe8] text-moss-ink" : "bg-birch text-pine/40"}`}>
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d={SRC_ICON[id]} />
      </svg>
    </span>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-2 text-sm font-semibold">{title}</h2>
      <div className="card divide-y divide-mist">{children}</div>
    </section>
  );
}

function Row({ title, detail, children }: { title: string; detail: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3">
      <div className="min-w-0">
        <p className="font-semibold">{title}</p>
        <p className="muted text-sm">{detail}</p>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}
