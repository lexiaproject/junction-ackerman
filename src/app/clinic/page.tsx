"use client";
// Panel de la clínica: quién necesita una llamada, alertas, pacientes, parejas, invitaciones, relevo y umbrales

import Link from "next/link";
import { useState } from "react";
import { Button, ErrorText, Logo, api, timeAgo, useLive } from "../ui";

type Level = "learning" | "stable" | "early" | "high" | "crisis" | "paused";
type Overview = {
  clinic: { name: string; phone: string; earlyDays: number };
  needCall: number;
  rows: {
    id: string;
    name: string;
    role: "pupil" | "mentor";
    treatment: string;
    partner: string | null;
    level: Level;
    reason: string;
    paused: boolean;
    learned: string[];
    canPromote: boolean;
  }[];
  alerts: { id: string; userId: string; kind: string; text: string; at: string; name: string }[];
  invited: { id: string; name: string; role: string; code?: string }[];
  freeMentors: { id: string; name: string; availability: string }[];
  unpaired: { id: string; name: string }[];
};

const LEVEL: Record<Level, { text: string; bg: string; fg: string }> = {
  crisis: { text: "Crisis", bg: "var(--color-lingon)", fg: "var(--color-paper)" },
  high: { text: "High risk", bg: "var(--color-lingon)", fg: "var(--color-paper)" },
  early: { text: "Early signs", bg: "var(--color-cloudberry)", fg: "var(--color-paper)" },
  stable: { text: "Stable", bg: "var(--color-moss)", fg: "var(--color-paper)" },
  learning: { text: "Learning", bg: "var(--color-mist)", fg: "var(--color-pine)" },
  paused: { text: "No consent", bg: "var(--color-mist)", fg: "var(--color-pine)" },
};

export default function ClinicPage() {
  const { data, error, reload } = useLive<Overview>("/api/app/clinic", 5000);
  const [actionError, setActionError] = useState("");

  async function act(body: Record<string, unknown>) {
    try {
      const r = await api<Record<string, unknown>>("/api/app/clinic", body);
      setActionError("");
      await reload();
      return r;
    } catch (e) {
      setActionError((e as Error).message);
      return null;
    }
  }

  if (!data)
    return (
      <main className="mx-auto max-w-5xl px-5 py-10">
        <ErrorText>{error}</ErrorText>
        <p className="text-pine/70">Loading…</p>
      </main>
    );

  const pupils = data.rows.filter((r) => r.role === "pupil");
  const mentors = data.rows.filter((r) => r.role === "mentor");

  return (
    <main className="mx-auto w-full max-w-5xl px-5 py-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Logo className="text-2xl" />
          <span className="text-pine/70">for {data.clinic.name}</span>
        </div>
        <div className="flex items-center gap-2">
          <Button kind="ghost" onClick={() => confirm("Reset all test data to today's starting point?") && act({ action: "reset" })}>
            Reset test data
          </Button>
          <Button
            kind="line"
            onClick={async () => {
              await api("/api/app/auth", { action: "logout" });
              window.location.href = "/";
            }}
          >
            Log out
          </Button>
        </div>
      </header>

      <h1 className="mt-8 font-display text-4xl font-bold sm:text-5xl">
        {data.needCall === 0 ? "Nobody needs a call today" : `${data.needCall} ${data.needCall === 1 ? "person needs" : "people need"} a call today`}
      </h1>
      <p className="mt-2 max-w-2xl text-pine/75">
        Each person is compared only with their own usual week. Mentors never see health data; you see one line per person. Relay suggests, your team
        decides.
      </p>
      <ErrorText>{actionError || error}</ErrorText>

      {data.alerts.length > 0 && (
        <section className="mt-8">
          <h2 className="font-display text-2xl font-bold">Alerts</h2>
          <ul className="mt-3 flex flex-col gap-2">
            {data.alerts.map((a) => (
              <li
                key={a.id}
                className={`flex flex-wrap items-center justify-between gap-3 rounded-2xl border-2 px-4 py-3 ${a.kind === "crisis" ? "border-lingon bg-lingon/10" : "border-cloudberry"}`}
              >
                <div>
                  <p className="font-bold">{a.kind === "crisis" ? "Help requested" : a.kind === "mentor_paused" ? "Mentor paused" : "Mentor may need support"}</p>
                  <p>{a.text}</p>
                  <p className="text-xs text-pine/60">{timeAgo(a.at)}</p>
                </div>
                <Button kind={a.kind === "crisis" ? "danger" : "primary"} onClick={() => act({ action: "handle", alertId: a.id })}>
                  Mark as handled
                </Button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <People title="People in treatment" rows={pupils} act={act} />
      <People title="Mentors" rows={mentors} act={act} />

      <div className="mt-10 grid gap-8 md:grid-cols-2">
        <Pairing data={data} act={act} />
        <InviteForm act={act} invited={data.invited} />
      </div>

      <section className="mt-10 rounded-2xl border border-mist p-5">
        <h2 className="font-display text-2xl font-bold">Thresholds</h2>
        <p className="mt-1 text-pine/75">Flag early signs when a signal stays off someone&apos;s usual for this many days in a row:</p>
        <div className="mt-3 flex gap-2">
          {[2, 3, 4].map((n) => (
            <button
              key={n}
              onClick={() => act({ action: "settings", earlyDays: n })}
              className={`rounded-full px-4 py-2 text-sm font-bold ${data.clinic.earlyDays === n ? "bg-pine text-paper" : "border border-pine"}`}
            >
              {n} days
            </button>
          ))}
        </div>
        <p className="mt-2 text-sm text-pine/65">High risk: three or more signals off for {data.clinic.earlyDays + 2}+ days. Crisis: someone presses the help button.</p>
      </section>

      <p className="mt-10 text-sm text-pine/60">
        Test clinic with sample data. <Link href="/" className="underline underline-offset-4">Back to start</Link>
      </p>
    </main>
  );
}

function People({ title, rows, act }: { title: string; rows: Overview["rows"]; act: (b: Record<string, unknown>) => Promise<unknown> }) {
  return (
    <section className="mt-10">
      <h2 className="font-display text-2xl font-bold">{title}</h2>
      <ul className="mt-3 divide-y divide-mist border-y border-mist">
        {rows.map((r) => (
          <li key={r.id} className="grid gap-x-6 gap-y-2 py-4 md:grid-cols-[170px_1fr_auto] md:items-center">
            <div>
              <p className="font-bold">{r.name}</p>
              <p className="text-sm text-pine/70">
                {r.role === "pupil" ? (r.partner ? `Mentor: ${r.partner}` : "No mentor yet") : r.partner ? `Mentors ${r.partner}` : r.paused ? "Paused" : "Free to mentor"}
              </p>
            </div>
            <div>
              <p>{r.reason}</p>
              {r.learned.length > 0 && <p className="mt-0.5 text-sm text-pine/65">What helps: {r.learned.join(", ").toLowerCase()}</p>}
              <div className="mt-1 flex flex-wrap gap-3 text-sm">
                {r.role === "pupil" && (
                  <button className="underline underline-offset-4" onClick={() => act({ action: "treatment", id: r.id, treatment: r.treatment === "finished" ? "in_treatment" : "finished" })}>
                    {r.treatment === "finished" ? "Treatment finished (undo)" : "Mark treatment finished"}
                  </button>
                )}
                {r.canPromote && (
                  <button className="font-bold underline underline-offset-4" onClick={() => confirm(`Make ${r.name} a mentor? Their mentor stays on as support.`) && act({ action: "promote", pupilId: r.id })}>
                    Make {r.name} a mentor
                  </button>
                )}
              </div>
            </div>
            <span className="justify-self-start rounded-full px-3 py-1 text-sm font-bold md:justify-self-end" style={{ background: LEVEL[r.level].bg, color: LEVEL[r.level].fg }}>
              {LEVEL[r.level].text}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Pairing({ data, act }: { data: Overview; act: (b: Record<string, unknown>) => Promise<unknown> }) {
  const [choice, setChoice] = useState<Record<string, string>>({});
  return (
    <section>
      <h2 className="font-display text-2xl font-bold">Match a mentor</h2>
      {data.unpaired.length === 0 ? (
        <p className="mt-2 text-pine/75">Everyone in treatment has a mentor.</p>
      ) : (
        <ul className="mt-3 flex flex-col gap-3">
          {data.unpaired.map((p) => (
            <li key={p.id} className="rounded-2xl border border-mist p-4">
              <p className="font-bold">{p.name}</p>
              {data.freeMentors.length === 0 ? (
                <p className="text-sm text-pine/70">No free mentors right now.</p>
              ) : (
                <div className="mt-2 flex flex-wrap gap-2">
                  <select
                    aria-label={`Mentor for ${p.name}`}
                    value={choice[p.id] ?? data.freeMentors[0].id}
                    onChange={(e) => setChoice({ ...choice, [p.id]: e.target.value })}
                    className="min-w-0 flex-1 rounded-xl border border-mist bg-paper px-3 py-2"
                  >
                    {data.freeMentors.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                        {m.availability ? ` (${m.availability})` : ""}
                      </option>
                    ))}
                  </select>
                  <Button onClick={() => act({ action: "pair", pupilId: p.id, mentorId: choice[p.id] ?? data.freeMentors[0].id })}>Match</Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      <p className="mt-3 text-sm text-pine/65">Mentors have finished TMS, are stable and mentor one person at a time.</p>
    </section>
  );
}

function InviteForm({ act, invited }: { act: (b: Record<string, unknown>) => Promise<unknown>; invited: Overview["invited"] }) {
  const [name, setName] = useState("");
  const [role, setRole] = useState("pupil");
  const [created, setCreated] = useState<{ name: string; code: string } | null>(null);
  return (
    <section>
      <h2 className="font-display text-2xl font-bold">Add a patient</h2>
      <form
        className="mt-3 flex flex-col gap-3 rounded-2xl border border-mist p-4"
        onSubmit={async (e) => {
          e.preventDefault();
          const r = (await act({ action: "invite", name, role, treatment: role === "mentor" ? "finished" : "in_treatment" })) as { code?: string } | null;
          if (r?.code) {
            setCreated({ name, code: r.code });
            setName("");
          }
        }}
      >
        <label className="text-sm">
          <span className="font-bold">Name</span>
          <input value={name} onChange={(e) => setName(e.target.value)} required className="mt-1 w-full rounded-xl border border-mist px-3 py-2" />
        </label>
        <fieldset className="flex gap-4 text-sm">
          <legend className="sr-only">Role</legend>
          <label className="flex items-center gap-2">
            <input type="radio" checked={role === "pupil"} onChange={() => setRole("pupil")} /> Starting TMS
          </label>
          <label className="flex items-center gap-2">
            <input type="radio" checked={role === "mentor"} onChange={() => setRole("mentor")} /> Mentor (finished TMS)
          </label>
        </fieldset>
        <Button type="submit">Create invite</Button>
        {created && (
          <p className="rounded-xl bg-moss/15 px-3 py-2 text-sm">
            Give {created.name} this code: <b className="font-display text-lg tracking-widest">{created.code}</b>. They join at /join.
          </p>
        )}
      </form>
      {invited.length > 0 && (
        <div className="mt-4">
          <p className="text-sm font-bold">Waiting to join</p>
          <ul className="mt-1 text-sm">
            {invited.map((i) => (
              <li key={i.id}>
                {i.name} ({i.role === "mentor" ? "mentor" : "starting TMS"}): <b className="tracking-widest">{i.code}</b>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
