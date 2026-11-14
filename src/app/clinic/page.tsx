"use client";
// Panel de la clínica: quién necesita una llamada, alertas, personas (con sus señales), evolución del grupo,
// el relevo, emparejar, dar de alta y umbrales

import Link from "next/link";
import { Fragment, useState } from "react";
import { CohortChart, SignalChart, type DayCount, type SignalSeries } from "../charts";
import { Avatar, Button, ErrorText, Logo, StatusChip, api, timeAgo, useLive, type Level } from "../ui";

type Row = {
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
  dates: string[];
  signals: (SignalSeries & { key: string; kind: string })[];
};
type ChainNode = { id: string; name: string; role: string; level: Level; current: boolean; children: ChainNode[] };
type Overview = {
  clinic: { name: string; phone: string; earlyDays: number };
  needCall: number;
  stats: { people: number; pairs: number; early: number; stable: number; messages: number; invites: number; accepted: number };
  history: DayCount[];
  chain: ChainNode[];
  rows: Row[];
  alerts: { id: string; userId: string; kind: string; text: string; at: string; name: string }[];
  invited: { id: string; name: string; role: string; code?: string }[];
  freeMentors: { id: string; name: string; availability: string }[];
  unpaired: { id: string; name: string }[];
};
type Act = (b: Record<string, unknown>) => Promise<Record<string, unknown> | null>;

export default function ClinicPage() {
  const { data, error, reload } = useLive<Overview>("/api/app/clinic", 6000);
  const [actionError, setActionError] = useState("");

  const act: Act = async (body) => {
    try {
      const r = await api<Record<string, unknown>>("/api/app/clinic", body);
      setActionError("");
      await reload();
      return r;
    } catch (e) {
      setActionError((e as Error).message);
      return null;
    }
  };

  if (!data)
    return (
      <main className="mx-auto w-full max-w-7xl px-5 py-10">
        <ErrorText>{error}</ErrorText>
        <div className="card h-48 animate-pulse" />
      </main>
    );

  const s = data.stats;
  return (
    <main className="w-full">
      <div className="brand-rule" />
      <header className="border-b border-mist bg-paper">
        <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-3 px-5 py-3">
          <div className="flex items-center gap-3">
            <Logo className="text-xl" />
            <span className="h-5 w-px bg-mist" />
            <span className="text-sm font-semibold">{data.clinic.name}</span>
          </div>
          <div className="flex items-center gap-2">
            <Button kind="quiet" size="sm" onClick={() => confirm("Reset all test data to today's starting point?") && act({ action: "reset" })}>
              Reset test data
            </Button>
            <Button
              kind="secondary"
              size="sm"
              onClick={async () => {
                await api("/api/app/auth", { action: "logout" });
                window.location.href = "/";
              }}
            >
              Log out
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-7xl px-5 pb-16 pt-8">
        <p className="muted text-sm">{new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">
          {data.needCall === 0 ? "Nobody needs a call today" : `${data.needCall} ${data.needCall === 1 ? "person needs" : "people need"} a call today`}
        </h1>
        <p className="muted mt-2 max-w-2xl">Each person is compared only with their own usual weeks. Mentors never see health data. Relay suggests; your team decides.</p>

        <dl className="stagger mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          <Tile label="People in the network" value={s.people} note={`${s.pairs} active pairs`} />
          <Tile label="Need a call" value={data.needCall} note="High risk or crisis" tone="var(--color-lingon)" />
          <Tile label="Early signs" value={s.early} note="Mentor prompted to reach out" tone="var(--color-cloudberry)" />
          <Tile label="Plans accepted, 7 days" value={s.invites ? `${s.accepted}/${s.invites}` : "0"} note={`${s.messages} messages between pairs`} tone="var(--color-moss)" />
        </dl>
        <ErrorText>{actionError || error}</ErrorText>

        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="flex min-w-0 flex-col gap-8">
            {data.alerts.length > 0 && <Alerts alerts={data.alerts} act={act} />}
            <People rows={data.rows} earlyDays={data.clinic.earlyDays} act={act} />
          </div>
          <aside className="stagger flex flex-col gap-6">
            <Card title="The last two weeks" note="People by status each day. Touch a bar for details.">
              <CohortChart days={data.history} />
            </Card>
            <Card title="The relay" note="Who walked alongside whom. Every recovered patient supports the next one.">
              <Chain nodes={data.chain} />
            </Card>
            <Pairing data={data} act={act} />
            <InviteForm act={act} invited={data.invited} />
            <Thresholds earlyDays={data.clinic.earlyDays} act={act} />
          </aside>
        </div>

        <p className="muted mt-12 text-sm">
          Test clinic with sample data.{" "}
          <Link href="/" className="underline underline-offset-4">
            Back to start
          </Link>
        </p>
      </div>
    </main>
  );
}

function Tile({ label, value, note, tone }: { label: string; value: string | number; note: string; tone?: string }) {
  return (
    <div className="card card-status lift px-4 py-3" style={{ "--status": tone ?? "var(--color-pine)" } as React.CSSProperties}>
      <dt className="muted text-sm">{label}</dt>
      <dd className="num mt-0.5 text-3xl font-bold tracking-tight">{value}</dd>
      <dd className="muted mt-0.5 text-xs">{note}</dd>
    </div>
  );
}

function Card({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <section className="card p-4">
      <h2 className="font-bold">{title}</h2>
      {note && <p className="muted mb-3 mt-0.5 text-sm">{note}</p>}
      {children}
    </section>
  );
}

function Alerts({ alerts, act }: { alerts: Overview["alerts"]; act: Act }) {
  return (
    <section>
      <h2 className="mb-3 text-lg font-bold">Alerts</h2>
      <ul className="flex flex-col gap-2">
        {alerts.map((a) => {
          const crisis = a.kind === "crisis";
          return (
            <li
              key={a.id}
              className={`card card-status arrive flex flex-wrap items-center justify-between gap-3 py-3 pl-5 pr-4 ${crisis ? "bg-[#fdf4f6]" : ""}`}
              style={{ "--status": crisis ? "var(--color-lingon)" : a.kind === "data_request" ? "var(--color-pine)" : "var(--color-cloudberry)" } as React.CSSProperties}
            >
              <div className="min-w-0">
                <p className="flex items-center gap-2 font-semibold">
                  {crisis && <span className="relative flex h-2.5 w-2.5"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-lingon opacity-60" /><span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-lingon" /></span>}
                  {crisis ? "Help requested" : a.kind === "mentor_paused" ? "Mentor paused" : a.kind === "data_request" ? "Data request" : "Mentor may need support"}
                  <span className="muted text-xs font-normal">{timeAgo(a.at)}</span>
                </p>
                <p className="mt-0.5">{a.text}</p>
              </div>
              <div className="flex gap-2">
                {a.kind === "data_request" && (
                  <a href={`/api/app/export?id=${a.userId}`} className="btn btn-secondary btn-sm">
                    Download file
                  </a>
                )}
                <Button kind={crisis ? "danger" : "secondary"} size="sm" onClick={() => act({ action: "handle", alertId: a.id })}>
                  Mark as handled
                </Button>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

const FILTERS = [
  { id: "attention", label: "Needs attention", test: (r: Row) => ["crisis", "high", "early"].includes(r.level) },
  { id: "all", label: "Everyone", test: () => true },
  { id: "pupil", label: "In treatment", test: (r: Row) => r.role === "pupil" },
  { id: "mentor", label: "Mentors", test: (r: Row) => r.role === "mentor" },
] as const;

function People({ rows, earlyDays, act }: { rows: Row[]; earlyDays: number; act: Act }) {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["id"]>("all");
  const [open, setOpen] = useState<string | null>(rows.find((r) => r.level === "high" || r.level === "early")?.id ?? null);
  const f = FILTERS.find((x) => x.id === filter)!;
  const shown = rows.filter(f.test);
  return (
    <section>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold">People</h2>
        <div className="flex max-w-full overflow-x-auto rounded-lg border border-line bg-paper p-0.5 text-sm" role="tablist">
          {FILTERS.map((x) => (
            <button
              key={x.id}
              role="tab"
              aria-selected={filter === x.id}
              onClick={() => setFilter(x.id)}
              className={`shrink-0 whitespace-nowrap rounded-md px-3 py-1.5 font-semibold transition-colors ${filter === x.id ? "bg-pine text-white" : "text-pine/70 hover:text-pine"}`}
            >
              {x.label}
              <span className="num ml-1.5 opacity-60">{rows.filter(x.test).length}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="card overflow-hidden">
        <table className="w-full text-left text-[0.9375rem]">
          <thead className="hidden border-b border-mist bg-birch/60 text-xs text-pine/60 md:table-header-group">
            <tr>
              <th className="px-4 py-2 font-semibold">Person</th>
              <th className="px-4 py-2 font-semibold">Status</th>
              <th className="px-4 py-2 font-semibold">Why</th>
              <th className="w-8 px-4 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-mist">
            {shown.map((r) => (
              <Fragment key={r.id}>
                <tr
                  onClick={() => setOpen(open === r.id ? null : r.id)}
                  className={`cursor-pointer align-top transition-colors hover:bg-birch/50 md:align-middle ${open === r.id ? "bg-birch/50" : ""}`}
                  aria-expanded={open === r.id}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar name={r.name} />
                      <div>
                        <p className="font-semibold">{r.name}</p>
                        <p className="muted text-sm">
                          {r.role === "pupil"
                            ? r.partner
                              ? `Mentored by ${r.partner}`
                              : "No mentor yet"
                            : r.partner
                              ? `Mentors ${r.partner}`
                              : r.paused
                                ? "Paused"
                                : "Free to mentor"}
                        </p>
                      </div>
                    </div>
                    <div className="mt-2 md:hidden">
                      <StatusChip level={r.level} />
                      <p className="mt-1.5 text-sm">{r.reason}</p>
                    </div>
                  </td>
                  <td className="hidden px-4 py-3 md:table-cell">
                    <StatusChip level={r.level} />
                  </td>
                  <td className="hidden px-4 py-3 md:table-cell">{r.reason}</td>
                  <td className="px-4 py-3 text-right">
                    <svg viewBox="0 0 20 20" className={`ml-auto h-4 w-4 text-pine/40 transition-transform ${open === r.id ? "rotate-90" : ""}`} fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                      <path d="m8 5 5 5-5 5" />
                    </svg>
                  </td>
                </tr>
                {open === r.id && (
                  <tr className="bg-birch/50">
                    <td colSpan={4} className="px-4 pb-5 pt-1">
                      <Detail r={r} earlyDays={earlyDays} act={act} />
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
            {shown.length === 0 && (
              <tr>
                <td colSpan={4} className="muted px-4 py-8 text-center">
                  Nobody here right now.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Detail({ r, earlyDays, act }: { r: Row; earlyDays: number; act: Act }) {
  const ordered = [...r.signals].sort((a, b) => Number(b.off) - Number(a.off));
  const tone = r.level === "high" || r.level === "crisis" ? "var(--color-lingon)" : "var(--color-cloudberry)";
  return (
    <div className="arrive">
      {ordered.length === 0 ? (
        <p className="muted py-2 text-sm">Not enough history yet. Relay needs one week to learn {r.name}&apos;s usual routine.</p>
      ) : (
        <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
          {ordered.map((s) => (
            <div key={s.key} className="rounded-lg bg-paper p-3 shadow-[0_0_0_1px_var(--color-mist)]">
              <div className="mb-1.5 flex items-baseline justify-between gap-2">
                <p className="text-sm font-semibold">{s.label}</p>
                <p className={`text-xs ${s.off ? "font-semibold text-lingon-ink" : "muted"}`}>
                  {s.off ? `Off for ${s.run} days` : "Within usual"}
                  <span className="muted font-normal"> · {s.kind === "in-app" ? "in-app" : "wearable"}</span>
                </p>
              </div>
              <SignalChart s={s} dates={r.dates} tone={tone} />
            </div>
          ))}
        </div>
      )}
      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
        {r.learned.length > 0 && (
          <span>
            What helps {r.name}: <b>{r.learned.join(", ").toLowerCase()}</b>
          </span>
        )}
        <span className="muted">Flagged after {earlyDays}+ days off the usual band.</span>
        <span className="ml-auto flex gap-2">
          {r.role === "pupil" && (
            <Button size="sm" kind="secondary" onClick={() => act({ action: "treatment", id: r.id, treatment: r.treatment === "finished" ? "in_treatment" : "finished" })}>
              {r.treatment === "finished" ? "Undo treatment finished" : "Mark treatment finished"}
            </Button>
          )}
          {r.canPromote && (
            <Button size="sm" onClick={() => confirm(`Make ${r.name} a mentor? Their mentor stays on as support.`) && act({ action: "promote", pupilId: r.id })}>
              Make {r.name} a mentor
            </Button>
          )}
        </span>
      </div>
    </div>
  );
}

// El relevo como árbol: antiguo mentor → mentor → pupilo
function Chain({ nodes }: { nodes: ChainNode[] }) {
  if (!nodes.length) return <p className="muted text-sm">The relay starts when the first pair is matched.</p>;
  return (
    <ul className="flex flex-col gap-1">
      {nodes.map((n) => (
        <ChainItem key={n.id} n={n} depth={0} />
      ))}
    </ul>
  );
}
function ChainItem({ n, depth }: { n: ChainNode; depth: number }) {
  return (
    <li>
      <div className="flex items-center gap-2 py-1" style={{ paddingLeft: depth * 18 }}>
        {depth > 0 && (
          <svg viewBox="0 0 12 12" className="h-3 w-3 shrink-0 text-pine/30" aria-hidden>
            <path d="M1 0v6h10" fill="none" stroke="currentColor" strokeWidth="1.5" />
          </svg>
        )}
        <span
          className="h-2.5 w-2.5 shrink-0 rounded-full"
          style={{ background: n.role === "mentor" ? "var(--color-pine)" : "var(--color-cloudberry)", opacity: n.current ? 1 : 0.45 }}
        />
        <span className="font-semibold">{n.name}</span>
        <span className="muted text-xs">{!n.current && n.role === "mentor" ? "now a mentor" : n.role === "mentor" ? "mentor" : "in treatment"}</span>
        {(n.level === "high" || n.level === "early" || n.level === "crisis") && <span className="ml-auto"><StatusChip level={n.level} /></span>}
      </div>
      {n.children.length > 0 && (
        <ul>
          {n.children.map((c) => (
            <ChainItem key={c.id} n={c} depth={depth + 1} />
          ))}
        </ul>
      )}
    </li>
  );
}

function Pairing({ data, act }: { data: Overview; act: Act }) {
  const [choice, setChoice] = useState<Record<string, string>>({});
  return (
    <Card title="Match a mentor" note="Mentors have finished TMS, are stable and mentor one person at a time.">
      {data.unpaired.length === 0 ? (
        <p className="text-sm">Everyone in treatment has a mentor.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {data.unpaired.map((p) => (
            <li key={p.id}>
              <p className="label">{p.name}</p>
              {data.freeMentors.length === 0 ? (
                <p className="muted text-sm">No free mentors right now.</p>
              ) : (
                <div className="flex gap-2">
                  <select
                    aria-label={`Mentor for ${p.name}`}
                    value={choice[p.id] ?? data.freeMentors[0].id}
                    onChange={(e) => setChoice({ ...choice, [p.id]: e.target.value })}
                    className="input min-w-0 flex-1"
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
    </Card>
  );
}

function InviteForm({ act, invited }: { act: Act; invited: Overview["invited"] }) {
  const [name, setName] = useState("");
  const [role, setRole] = useState("pupil");
  const [created, setCreated] = useState<{ name: string; code: string } | null>(null);
  return (
    <Card title="Add a patient" note="They get a code to create their account.">
      <form
        className="flex flex-col gap-3"
        onSubmit={async (e) => {
          e.preventDefault();
          const r = await act({ action: "invite", name, role, treatment: role === "mentor" ? "finished" : "in_treatment" });
          if (r?.code) {
            setCreated({ name, code: String(r.code) });
            setName("");
          }
        }}
      >
        <input aria-label="Name" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} required className="input" />
        <div className="grid grid-cols-2 gap-1 rounded-lg border border-line bg-birch p-1 text-sm font-semibold" role="radiogroup">
          {[
            ["pupil", "Starting TMS"],
            ["mentor", "Mentor"],
          ].map(([v, l]) => (
            <button
              type="button"
              role="radio"
              aria-checked={role === v}
              key={v}
              onClick={() => setRole(v)}
              className={`rounded-md py-2 transition-colors ${role === v ? "bg-paper shadow-[0_0_0_1px_var(--color-line)]" : "text-pine/60"}`}
            >
              {l}
            </button>
          ))}
        </div>
        <Button type="submit">Create invite</Button>
        {created && (
          <div className="arrive rounded-lg border border-moss/30 bg-moss/10 px-3 py-2.5 text-sm">
            Code for {created.name}
            <p className="num text-2xl font-bold tracking-[0.2em]">{created.code}</p>
            They join at <b>/join</b>.
          </div>
        )}
      </form>
      {invited.length > 0 && (
        <div className="mt-4 border-t border-mist pt-3">
          <p className="text-sm font-semibold">Waiting to join</p>
          <ul className="mt-1 flex flex-col gap-1 text-sm">
            {invited.map((i) => (
              <li key={i.id} className="flex justify-between">
                <span>
                  {i.name} <span className="muted">({i.role === "mentor" ? "mentor" : "starting TMS"})</span>
                </span>
                <b className="num tracking-widest">{i.code}</b>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}

function Thresholds({ earlyDays, act }: { earlyDays: number; act: Act }) {
  return (
    <Card title="Thresholds" note="Your team decides when Relay flags a change.">
      <p className="label">Early signs after</p>
      <div className="grid grid-cols-3 gap-1 rounded-lg border border-line bg-birch p-1 text-sm font-semibold" role="radiogroup">
        {[2, 3, 4].map((n) => (
          <button
            key={n}
            role="radio"
            aria-checked={earlyDays === n}
            onClick={() => act({ action: "settings", earlyDays: n })}
            className={`rounded-md py-2 transition-colors ${earlyDays === n ? "bg-paper shadow-[0_0_0_1px_var(--color-line)]" : "text-pine/60"}`}
          >
            {n} days
          </button>
        ))}
      </div>
      <p className="muted mt-3 text-sm">
        High risk: three or more signals off for {earlyDays + 2}+ days. Crisis: someone presses the help button; it always comes straight here.
      </p>
    </Card>
  );
}
