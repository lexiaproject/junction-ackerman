"use client";
// Web de la clínica: responde primero a "¿a quién llamamos hoy?" y deja el detalle a un clic.
// Es el único sitio con datos. Los resúmenes son plantillas deterministas (nunca IA).
import { useState } from "react";
import { revealNames } from "@/lib/relevo/pseudo";
import { DomainBars, LEVEL_COLOR, LEVEL_TEXT, LineChart } from "./charts";
import { Avatar, Icon, act, useView } from "./kit";

type Row = { id: string; name: string; role: string; level: number; levelLabel: string; baseline: boolean; summary: string; daysInLevel: number; rhythm: string | null; lastContact: { label: string } | null; cta: string; flags: string[]; simulated: boolean };
type Alert = { id: string; person: string; name: string; kind: string; text: string; when: string; status: string; assignee: string | null; forwarded: boolean; resolvedWhen: string | null; severe: boolean; note: string | null };
type Cand = { mentorId: string; mentorName: string; percent: number; affinity: number; reasons: string[]; availability: string; stableDays: number; zone: string; prefs: string; sim: number };
type Match = { id: string; name: string; reason: string; pending: string | null; accepted: string | null; candidates: Cand[] };
type Feature = { key: string; name: string; signal: string; domain: string; unit: string; value: number | null; baseline: number | null; z: number | null; valid: string; available: boolean };
type Person = {
  id: string; name: string; role: string; weeksSinceTms: number; pair: { label: string; name: string; id: string } | null; mentee: { label: string; name: string; id: string } | null;
  level: number; levelLabel: string; since: string; daysInLevel: number; consent: boolean; baselineDone: boolean; baselineDay: number; background: boolean;
  summary: { text: string; parts: { text: string; feature?: string }[] }; rhythm: string | null; ideasPaused: boolean; ideasPausedM6: boolean; ideasPausedClinic: boolean;
  thresholds: { l1: number; l2: number; l3: number; domain: number };
  charts: { labels: string[]; Rs: (number | null)[]; level: number[]; sleep: (number | null)[]; sleepMean: (number | null)[]; sleepBand: Band; sleepSd: (number | null)[]; steps: (number | null)[]; stepsMean: (number | null)[]; stepsBand: Band; home: (number | null)[]; homeBand: Band; baselineEnd: number };
  domains: { key: string; label: string; s: number | null; smooth: number | null; feats: number }[];
  features: Feature[]; history: { when: string; kind: string; text: string; by: string | null }[]; notesCount: number;
  calls: { mode: string; when: string; scheduledFor: string | null; done: boolean }[]; crisisNote: { id: string; text: string } | null;
};
type Band = { lo: number | null; mid: number | null; hi: number | null } | null;
type Config = { l1_R: number; l2_R: number; l3_R: number; domain_hi: number; persist_up: number; persist_down: number; weights: Record<string, number>; noticeFrom: number; noticeTo: number; catalog: Record<string, boolean> };
type ClinicData = {
  clock: { t: number };
  panel: { counters: { people: number; needCall: number; early: number; severe: number }; rows: Row[] };
  alerts: Alert[]; matching: Match[];
  consents: { people: { id: string; name: string; data: boolean; notes: boolean; ideas: boolean; version: string; date: string; background: boolean }[]; audit: { when: string; who: string; what: string }[]; requests: { name: string; kind: string; when: string }[] };
  config: { current: Config; defaults: Config; catalog: { key: string; label: string; on: boolean; direct: boolean; domains: string[]; prior: number }[] };
  person: Person | null;
};

const NAV = [
  { id: "panel", label: "Panel", icon: "list" },
  { id: "alerts", label: "Alerts", icon: "alert" },
  { id: "matching", label: "Matching", icon: "users" },
  { id: "settings", label: "Settings", icon: "sliders" },
  { id: "consents", label: "Consents", icon: "shield" },
] as const;
type Tab = (typeof NAV)[number]["id"];

export function LevelTag({ level }: { level: number }) {
  return (
    <span className="rv-level" style={{ color: LEVEL_COLOR[level], background: `${LEVEL_COLOR[level]}14` }}>
      {level} {LEVEL_TEXT[level]}
    </span>
  );
}

export default function ClinicWeb({ w, clockLabel, onFocusPerson, resetKey }: { w: string; clockLabel?: string; onFocusPerson?: { id: string | null; n: number }; resetKey?: number }) {
  const [tab, setTab] = useState<Tab>("panel");
  const [person, setPerson] = useState<string | null>(null);
  const { data } = useView<ClinicData>(`/api/relevo/clinic?w=${w}${person ? `&person=${person}` : ""}`, 5000);
  // La demo puede pedir abrir una ficha (n cuenta los clics: funciona también la segunda vez)
  // y, al pasar de momento (resetKey), la clínica vuelve al Panel
  const [seen, setSeen] = useState({ n: onFocusPerson?.n, k: resetKey });
  if (seen.n !== onFocusPerson?.n || seen.k !== resetKey) {
    if (seen.k !== resetKey) {
      setTab("panel");
      setPerson(null);
    }
    if (onFocusPerson && seen.n !== onFocusPerson.n) setPerson(onFocusPerson.id);
    setSeen({ n: onFocusPerson?.n, k: resetKey });
  }
  if (!data) return <div className="rv-muted p-10">Loading…</div>;
  const newAlerts = data.alerts.filter((a) => a.status === "new").length;
  return (
    <div className="flex h-full min-h-0 bg-[#f3f5f2] text-[14px]">
      <aside className="flex w-[212px] shrink-0 flex-col border-r border-rv-line bg-white px-3 py-4">
        <div className="px-2 pb-5">
          <p className="text-[19px] font-semibold" style={{ fontFamily: "var(--rv-display)" }}>Relevo</p>
          <p className="rv-muted text-[12.5px]">Aalto TMS Clinic</p>
        </div>
        <nav className="flex flex-col gap-0.5" aria-label="Clinic">
          {NAV.map((n) => (
            <button key={n.id} onClick={() => { setTab(n.id); setPerson(null); }} aria-current={tab === n.id && !person ? "page" : undefined} className={`flex min-h-[40px] items-center gap-2.5 rounded-xl px-3 text-left font-semibold ${tab === n.id ? "bg-rv-sage text-rv-teal" : "text-rv-ink2 hover:bg-rv-bg"}`}>
              <Icon name={n.icon} size={18} />
              {n.label}
              {n.id === "alerts" && newAlerts > 0 && <span className="ml-auto rounded-full bg-rv-l3 px-1.5 text-[11.5px] text-white">{newAlerts}</span>}
            </button>
          ))}
        </nav>
        <div className="mt-auto px-2">
          <p className="rv-chip bg-[#f1ede4] text-[#6b5a2e]">Simulated sensor data</p>
          <p className="rv-muted mt-2 text-[12px]">Nurse Virtanen · on duty</p>
        </div>
      </aside>
      <main className="rv-scroll min-w-0 flex-1 overflow-y-auto px-7 py-6">
        {clockLabel && <p className="rv-muted mb-1 text-[12.5px]">{clockLabel}</p>}
        {person && data.person ? (
          <PersonFile w={w} now={data.clock.t} p={data.person} onBack={() => setPerson(null)} onOpen={setPerson} />
        ) : tab === "panel" ? (
          <Panel data={data} onOpen={setPerson} />
        ) : tab === "alerts" ? (
          <Alerts w={w} alerts={data.alerts} onOpen={setPerson} />
        ) : tab === "matching" ? (
          <Matching w={w} matching={data.matching} />
        ) : tab === "settings" ? (
          <Settings w={w} config={data.config} />
        ) : (
          <Consents data={data.consents} />
        )}
      </main>
    </div>
  );
}

/* ---------- C1 · ¿A quién llamamos hoy? ---------- */
function Panel({ data, onOpen }: { data: ClinicData; onOpen: (id: string) => void }) {
  const [level, setLevel] = useState<number | "all">("all");
  const [role, setRole] = useState<"all" | "Mentor" | "Mentee">("all");
  const [noData, setNoData] = useState(false);
  const c = data.panel.counters;
  const rows = data.panel.rows.filter((r) => (level === "all" || r.level === level) && (role === "all" || r.role === role) && (!noData || r.flags.includes("No data 48 h")));
  const counters = [
    { label: "People in the network", v: c.people, color: "#16211C" },
    { label: "Need a call", sub: "level 2", v: c.needCall, color: LEVEL_COLOR[2] },
    { label: "Early signs", sub: "level 1", v: c.early, color: LEVEL_COLOR[1] },
    { label: "Severe alerts", sub: "level 3", v: c.severe, color: c.severe > 0 ? LEVEL_COLOR[3] : "#16211C" },
  ];
  return (
    <>
      <h1 className="text-[28px]">Who do we call today?</h1>
      <div className="mt-4 grid grid-cols-4 gap-3">
        {counters.map((k) => (
          <div key={k.label} className={`rv-card px-4 py-3 ${k.label === "Severe alerts" && c.severe > 0 ? "shadow-[0_0_0_1.5px_#B91C1C]" : ""}`}>
            <p className="rv-num text-[30px] font-semibold leading-tight" style={{ color: k.color, fontFamily: "var(--rv-display)" }}>{k.v}</p>
            <p className="text-[13px] font-semibold">{k.label}{k.sub && <span className="rv-muted font-normal"> · {k.sub}</span>}</p>
          </div>
        ))}
      </div>
      <div className="mt-5 flex flex-wrap items-center gap-2">
        <Seg value={level} onChange={setLevel} options={[["all", "All levels"], [3, "3"], [2, "2"], [1, "1"], [0, "0"]]} />
        <Seg value={role} onChange={setRole} options={[["all", "Everyone"], ["Mentee", "Mentees"], ["Mentor", "Mentors"]]} />
        <label className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-[13px] font-semibold shadow-[0_0_0_1px_var(--color-rv-line)]">
          <input type="checkbox" checked={noData} onChange={(e) => setNoData(e.target.checked)} className="accent-[#0E6B5C]" />
          No data 48 h
        </label>
      </div>
      <div className="rv-card mt-3 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-[#fafbf9] text-[12px] text-rv-ink2">
            <tr>
              {["Person", "Level", "Automatic summary", "Days", "Pace", "Last human contact", ""].map((h) => <th key={h} className="px-3 py-2.5 font-semibold">{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} onClick={() => onOpen(r.id)} className="cursor-pointer border-t border-rv-line align-top hover:bg-[#fafbf9]">
                <td className="px-3 py-3">
                  <div className="flex items-center gap-2.5">
                    <Avatar name={r.name} size={30} />
                    <div>
                      <p className="font-semibold leading-tight">{r.name}</p>
                      <p className="rv-muted text-[12px]">{r.role}{r.simulated ? " · simulated" : ""}</p>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-3"><LevelTag level={r.level} /></td>
                <td className="max-w-[380px] px-3 py-3">
                  <p className="text-[13px] leading-snug">{r.summary}</p>
                  {r.flags.length > 0 && <div className="mt-1.5 flex flex-wrap gap-1">{r.flags.map((f) => <span key={f} className="rv-chip bg-[#fdf0e6] text-[#8a3a12]">{f}</span>)}</div>}
                </td>
                <td className="rv-num px-3 py-3">{r.baseline ? "—" : r.daysInLevel}</td>
                <td className="px-3 py-3 text-[13px]">{r.rhythm ?? <span className="rv-muted">—</span>}</td>
                <td className="px-3 py-3 text-[13px]">{r.lastContact?.label ?? <span className="rv-muted">—</span>}</td>
                <td className="px-3 py-3 text-right">
                  <button onClick={(e) => { e.stopPropagation(); onOpen(r.id); }} className={`rv-btn rv-btn-sm ${r.level >= 2 ? "rv-btn-primary" : "rv-btn-secondary"}`}>{r.cta}</button>
                </td>
              </tr>
            ))}
            {!rows.length && <tr><td colSpan={7} className="rv-muted px-3 py-8 text-center">Nobody matches these filters.</td></tr>}
          </tbody>
        </table>
      </div>
      <p className="rv-muted mt-2 text-[12px]">Ordered by level, then days in that level. Each person is compared only with their own baseline.</p>
    </>
  );
}
function Seg<T extends string | number>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: [T, string][] }) {
  return (
    <div className="flex rounded-full bg-white p-0.5 shadow-[0_0_0_1px_var(--color-rv-line)]">
      {options.map(([v, l]) => (
        <button key={String(v)} onClick={() => onChange(v)} className={`rounded-full px-3 py-1 text-[13px] font-semibold ${value === v ? "bg-rv-ink text-white" : "text-rv-ink2"}`}>{l}</button>
      ))}
    </div>
  );
}

/* ---------- C2 · Ficha de persona ---------- */
const FEATURE_CHART: Record<string, string> = {
  tst_sd14: "sleep", mid_sd14: "sleep", waso7: "sleep", awak7: "sleep", onset_delay7: "sleep", tst_excess7: "sleep",
  steps7: "steps", home7: "steps", entropy7: "steps", ra7: "domains", screen7: "domains", night7: "domains", latency7: "domains", reply7: "domains", rmssd7: "domains", rhr7: "domains",
};
const FEATURE_DOMAIN: Record<string, string> = { ra7: "ritmo", screen7: "movil_vinculo", night7: "movil_vinculo", latency7: "movil_vinculo", reply7: "movil_vinculo", rmssd7: "fisiologia", rhr7: "fisiologia" };
function PersonFile({ w, now, p, onBack, onOpen }: { w: string; now: number; p: Person; onBack: () => void; onOpen: (id: string) => void }) {
  const [hl, setHl] = useState<string | null>(null);
  const [details, setDetails] = useState(false);
  const [thr, setThr] = useState<{ l1: number; l2: number; domain: number } | null>(null);
  const [note, setNote] = useState(false);
  const c = p.charts;
  const chart = hl ? FEATURE_CHART[hl] : null;
  return (
    <>
      <button onClick={onBack} className="rv-btn rv-btn-ghost rv-btn-sm -ml-3"><Icon name="back" size={16} />Panel</button>
      <div className="mt-2 flex flex-wrap items-center gap-4">
        <Avatar name={p.name} size={52} />
        <div>
          <h1 className="text-[28px] leading-tight">{p.name}</h1>
          <p className="rv-muted text-[13.5px]">
            {p.role} · {p.weeksSinceTms} weeks since last TMS session
            {p.pair && <> · Mentor: <button className="font-semibold text-rv-teal underline-offset-2 hover:underline" onClick={() => onOpen(p.pair!.id)}>{p.pair.name}</button></>}
            {p.mentee && <> · Accompanies: <button className="font-semibold text-rv-teal underline-offset-2 hover:underline" onClick={() => onOpen(p.mentee!.id)}>{p.mentee.name}</button></>}
          </p>
        </div>
        <div className="ml-auto text-right">
          <LevelTag level={p.level} />
          <p className="rv-muted mt-1 text-[12.5px]">since {p.since}</p>
        </div>
      </div>

      {/* Resumen automático: cada frase enlaza al dato que la justifica */}
      <div className="mt-4 rounded-[20px] bg-rv-notice p-4 text-rv-notice-ink">
        <p className="text-[12px] font-semibold">Automatic summary · generated by rules from the data</p>
        <p className="mt-1 text-[15px] leading-snug">
          {p.summary.parts.map((part, i) =>
            part.feature ? (
              <button key={i} onMouseEnter={() => setHl(part.feature!)} onMouseLeave={() => setHl(null)} onFocus={() => setHl(part.feature!)} onBlur={() => setHl(null)} className="font-semibold underline decoration-dotted underline-offset-4">
                {part.text}
              </button>
            ) : (
              <span key={i}>{part.text}</span>
            ),
          )}
        </p>
      </div>

      {!p.consent ? (
        <p className="rv-card mt-4 p-5">No data consent. Relevo keeps working for notes and plans, without data-based notices.</p>
      ) : !p.baselineDone ? (
        <p className="rv-card mt-4 p-5">Baseline in progress: day {p.baselineDay} of 28. No risk engine yet; accompaniment only.</p>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rv-card p-4">
            <p className="font-semibold">Smoothed risk index</p>
            <LineChart ariaLabel="Smoothed risk index, last 35 days" labels={c.labels} lines={[{ values: c.Rs, color: "#16211C", label: "R smoothed" }]} thresholds={[{ v: p.thresholds.l1, label: `${p.thresholds.l1}`, color: LEVEL_COLOR[1] }, { v: p.thresholds.l2, label: `${p.thresholds.l2}`, color: LEVEL_COLOR[2] }, { v: p.thresholds.l3, label: `${p.thresholds.l3}`, color: LEVEL_COLOR[3] }]} yMin={0} steps={c.level} marker={c.baselineEnd} digits={2} />
          </div>
          <div className="rv-card p-4">
            <p className="font-semibold">Sleep hours and regularity</p>
            <LineChart ariaLabel="Sleep hours, last 35 days" highlight={chart === "sleep"} labels={c.labels} lines={[{ values: c.sleep, color: "#8fa8c8", label: "Night", width: 1.2, dots: true }, { values: c.sleepMean, color: "#24466e", label: "7-day mean" }]} band={c.sleepBand} unit=" h" digits={1} marker={c.baselineEnd} />
            <p className="rv-muted text-[11.5px]">Band: their usual (median ± 1 robust scale). Regularity (SD 14 d): {c.sleepSd.at(-1) ?? "—"} min.</p>
          </div>
          <div className="rv-card p-4">
            <p className="font-semibold">Daily steps and time at home</p>
            <LineChart ariaLabel="Steps, last 35 days" highlight={chart === "steps"} labels={c.labels} lines={[{ values: c.steps, color: "#9cc3b8", label: "Steps", width: 1.2, dots: true }, { values: c.stepsMean, color: "#0E6B5C", label: "Steps, 7-day mean" }]} band={c.stepsBand} digits={0} height={120} marker={c.baselineEnd} />
            <LineChart ariaLabel="Hours at home, last 35 days" highlight={chart === "steps"} labels={c.labels} lines={[{ values: c.home, color: "#7a3a14", label: "Hours at home, 7-day mean" }]} band={c.homeBand} unit=" h" digits={1} height={100} marker={c.baselineEnd} />
          </div>
          <div className={`rv-card p-4 ${chart === "domains" ? "shadow-[0_0_0_2px_var(--color-rv-teal)]" : ""}`}>
            <p className="mb-2 font-semibold">Current deviation by area</p>
            <DomainBars domains={p.domains} threshold={p.thresholds.domain} highlight={hl ? FEATURE_DOMAIN[hl] ?? null : null} />
          </div>
        </div>
      )}

      {p.baselineDone && p.consent && (
        <div className="rv-card mt-3">
          <button onClick={() => setDetails((d) => !d)} className="flex w-full items-center justify-between px-4 py-3 font-semibold" aria-expanded={details}>
            Detailed features · 11 signals measured as 16 features
            <Icon name="chevron" className={`transition-transform ${details ? "rotate-90" : ""}`} />
          </button>
          {details && (
            <table className="w-full border-t border-rv-line text-left text-[13px]">
              <thead className="text-[12px] text-rv-ink2"><tr>{["Signal", "Feature", "Area", "Value", "Baseline", "z", "Valid days"].map((h) => <th key={h} className="px-3 py-2 font-semibold">{h}</th>)}</tr></thead>
              <tbody>
                {p.features.map((f) => (
                  <tr key={f.key} className={`border-t border-rv-line ${hl === f.key ? "bg-rv-sage" : ""}`}>
                    <td className="px-3 py-1.5">{f.signal}</td>
                    <td className="px-3 py-1.5">{f.name}</td>
                    <td className="rv-muted px-3 py-1.5">{f.domain}</td>
                    {f.available ? (
                      <>
                        <td className="rv-num px-3 py-1.5">{f.value} <span className="rv-muted">{f.unit}</span></td>
                        <td className="rv-num px-3 py-1.5">{f.baseline}</td>
                        <td className="rv-num px-3 py-1.5 font-semibold" style={{ color: (f.z ?? 0) >= 1.5 ? LEVEL_COLOR[2] : undefined }}>{f.z}</td>
                      </>
                    ) : (
                      <td colSpan={3} className="rv-muted px-3 py-1.5">data not available</td>
                    )}
                    <td className="rv-num px-3 py-1.5">{f.valid}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      <div className="mt-3 grid grid-cols-[1fr_320px] gap-3">
        <div className="rv-card p-4">
          <p className="font-semibold">Accompaniment history</p>
          <p className="rv-muted text-[12.5px]">{p.notesCount} voice notes exchanged (content never shown). Notices, plans and answers to “How did it go?”.</p>
          <ul className="mt-2 max-h-[260px] divide-y divide-rv-line overflow-y-auto">
            {p.history.map((h, i) => (
              <li key={i} className="flex gap-3 py-2 text-[13px]">
                <span className="rv-muted w-[108px] shrink-0">{h.when}</span>
                <span>{h.text}{h.by && <span className="rv-muted"> · {h.by}</span>}</span>
              </li>
            ))}
            {!p.history.length && <li className="rv-muted py-3">Nothing yet.</li>}
          </ul>
        </div>
        <div className="rv-card flex flex-col gap-2 p-4">
          <p className="font-semibold">Actions</p>
          <button className="rv-btn rv-btn-primary" onClick={() => act(w, "clinic", "call", { person: p.id, mode: "now" })}><Icon name="phone" size={17} />Call</button>
          <button className="rv-btn rv-btn-secondary" onClick={() => act(w, "clinic", "call", { person: p.id, mode: "schedule", at: (Math.floor(now / 1440) + 1) * 1440 + 720 })}><Icon name="calendar" size={17} />Schedule call · tomorrow 12:00</button>
          {p.mentee && (p.ideasPausedClinic ? (
            <button className="rv-btn rv-btn-secondary" onClick={() => act(w, "clinic", "ideas_reactivate", { mentor: p.id })}>Resume ideas for this mentor</button>
          ) : (
            <button className="rv-btn rv-btn-secondary" onClick={() => act(w, "clinic", "ideas_pause", { mentor: p.id })}>Pause ideas to this mentor</button>
          ))}
          {p.ideasPausedM6 && <button className="rv-btn rv-btn-secondary" onClick={() => act(w, "clinic", "ideas_reactivate", { mentor: p.id })}>Reactivate ideas</button>}
          {p.pair && <PairReactivate w={w} mentorId={p.pair.id} />}
          {p.rhythm && (
            <label className="flex items-center justify-between gap-2 rounded-xl bg-rv-bg px-3 py-2 text-[13px]">
              <span className="font-semibold">Change pace</span>
              <select value={["Pause", "Light", "Normal", "Intense"].indexOf(p.rhythm)} onChange={(e) => act(w, "clinic", "clinic_rhythm", { mentor: p.id, rhythm: Number(e.target.value) })} className="rounded-lg bg-white px-2 py-1">
                {["Pause", "Light", "Normal", "Intense"].map((r, i) => <option key={r} value={i}>{r}</option>)}
              </select>
            </label>
          )}
          <button className="rv-btn rv-btn-ghost rv-btn-sm" onClick={() => setThr(thr ? null : { l1: p.thresholds.l1, l2: p.thresholds.l2, domain: p.thresholds.domain })}>Adjust thresholds for this person</button>
          {thr && (
            <div className="rounded-xl bg-rv-bg p-3 text-[13px]">
              {(["l1", "l2", "domain"] as const).map((k) => (
                <label key={k} className="flex items-center justify-between py-1">
                  {k === "l1" ? "Level 1 (R)" : k === "l2" ? "Level 2 (R)" : "Area threshold"}
                  <input type="number" step={0.1} value={thr[k]} onChange={(e) => setThr({ ...thr, [k]: Number(e.target.value) })} className="w-20 rounded-lg bg-white px-2 py-1 text-right" />
                </label>
              ))}
              <div className="mt-2 flex gap-2">
                <button className="rv-btn rv-btn-primary rv-btn-sm flex-1" onClick={async () => { await act(w, "clinic", "person_thresholds", { person: p.id, l1_R: thr.l1, l2_R: thr.l2, domain_hi: thr.domain }); setThr(null); }}>Save</button>
                <button className="rv-btn rv-btn-ghost rv-btn-sm" onClick={async () => { await act(w, "clinic", "person_thresholds", { person: p.id, clear: true }); setThr(null); }}>Defaults</button>
              </div>
            </div>
          )}
          {p.calls.length > 0 && <p className="rv-muted text-[12.5px]">{p.calls.map((cl) => (cl.mode === "schedule" ? `Call scheduled for ${cl.scheduledFor}${cl.done ? " (done)" : ""}` : `Called ${cl.when}`)).join(" · ")}</p>}
          {p.crisisNote && (
            <div className="mt-1 rounded-xl bg-[#fdf0ee] p-3 text-[13px]">
              <p className="font-semibold text-rv-l3">Crisis note (consented)</p>
              {note ? <p className="mt-1">“{revealNames(p.crisisNote.text)}”</p> : <button className="mt-1 font-semibold underline" onClick={() => setNote(true)}>Open the note</button>}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
function PairReactivate({ w, mentorId }: { w: string; mentorId: string }) {
  return <button className="rv-btn rv-btn-ghost rv-btn-sm" onClick={() => act(w, "clinic", "ideas_reactivate", { mentor: mentorId })}>Reactivate ideas for their mentor</button>;
}

/* ---------- C3 · Cola de alertas ---------- */
function Alerts({ w, alerts, onOpen }: { w: string; alerts: Alert[]; onOpen: (id: string) => void }) {
  const KIND: Record<string, string> = { level2: "Level 2 · High risk", severe: "Level 3 · Severe", help: "Help button", message: "Message from patient", data_request: "Data request", worried: "Companion is worried" };
  return (
    <>
      <h1 className="text-[28px]">Alerts</h1>
      <p className="rv-muted mt-1">A severe alert unattended for 15 minutes is forwarded to the on-call lead.</p>
      <div className="mt-4 flex flex-col gap-2">
        {alerts.map((a) => (
          <div key={a.id} className={`rv-card flex flex-wrap items-center gap-4 p-4 ${a.status === "resolved" ? "opacity-60" : ""}`} style={a.severe && a.status !== "resolved" ? { boxShadow: "0 0 0 1.5px #B91C1C" } : undefined}>
            <Avatar name={a.name} size={36} />
            <div className="min-w-0 flex-1">
              <p className="font-semibold">
                <span style={{ color: a.severe ? LEVEL_COLOR[3] : a.kind === "level2" ? LEVEL_COLOR[2] : undefined }}>{KIND[a.kind] ?? a.kind}</span>
                <span className="rv-muted font-normal"> · {a.when}</span>
                {a.forwarded && a.status === "new" && <span className="rv-chip ml-2 bg-[#fdf0ee] text-rv-l3">Forwarded to on-call</span>}
              </p>
              <p className="text-[13.5px]">{a.text}</p>
              {a.note && <p className="mt-1 rounded-xl bg-rv-bg px-3 py-2 text-[13px] italic">“{revealNames(a.note)}”</p>}
            </div>
            <span className="rv-chip bg-rv-bg text-rv-ink2">{a.status === "new" ? "New" : a.status === "in_progress" ? `In progress · ${a.assignee}` : `Resolved ${a.resolvedWhen ?? ""}`}</span>
            <div className="flex gap-2">
              <button className="rv-btn rv-btn-ghost rv-btn-sm" onClick={() => onOpen(a.person)}>View file</button>
              {a.status === "new" && <button className="rv-btn rv-btn-secondary rv-btn-sm" onClick={() => act(w, "clinic", "alert_take", { alertId: a.id })}>Take it</button>}
              {a.status !== "resolved" && <button className="rv-btn rv-btn-primary rv-btn-sm" onClick={() => act(w, "clinic", "resolve", { alertId: a.id })}>Resolve</button>}
            </div>
          </div>
        ))}
        {!alerts.length && <p className="rv-card rv-muted p-6 text-center">No alerts.</p>}
      </div>
    </>
  );
}

/* ---------- C4 · Emparejamientos ---------- */
function Matching({ w, matching }: { w: string; matching: Match[] }) {
  return (
    <>
      <h1 className="text-[28px]">Matching</h1>
      <p className="rv-muted mt-1">
        New patients without a mentor, and mentees whose mentor is on pause.{" "}
        <span className="cursor-help underline decoration-dotted underline-offset-4" title="affinity = 0.6 · fingerprint similarity + 0.2 · schedules + 0.2 · language and preferences">How affinity is computed</span>
      </p>
      {matching.map((m) => (
        <div key={m.id} className="rv-card mt-4 p-4">
          <div className="flex items-center gap-3">
            <Avatar name={m.name} size={38} />
            <div>
              <p className="text-[17px] font-semibold">{m.name}</p>
              <p className="rv-muted text-[13px]">{m.reason}</p>
            </div>
            {m.pending && (
              <span className="ml-auto flex items-center gap-2">
                <span className="rv-chip bg-rv-notice text-rv-notice-ink">Proposed to {m.pending} · waiting</span>
                <button className="rv-btn rv-btn-ghost rv-btn-sm" onClick={() => act(w, "clinic", "match_cancel", { mentee: m.id })}>Cancel proposal</button>
              </span>
            )}
          </div>
          <table className="mt-3 w-full text-left text-[13px]">
            <thead className="text-[12px] text-rv-ink2"><tr>{["Mentor", "Affinity", "Why", "Availability", "Stable days", ""].map((h) => <th key={h} className="px-2 py-1.5 font-semibold">{h}</th>)}</tr></thead>
            <tbody>
              {m.candidates.map((c) => (
                <tr key={c.mentorId} className="border-t border-rv-line align-top">
                  <td className="px-2 py-2.5"><span className="flex items-center gap-2 font-semibold"><Avatar name={c.mentorName} size={26} />{c.mentorName}</span></td>
                  <td className="rv-num px-2 py-2.5" title={`fingerprint similarity ${c.sim}`}><span className="text-[16px] font-semibold">{+(c.affinity * 100).toFixed(1)}%</span></td>
                  <td className="px-2 py-2.5">{c.reasons.join(" · ")}</td>
                  <td className="px-2 py-2.5">{c.availability}<span className="rv-muted"> · {c.zone}</span></td>
                  <td className="rv-num px-2 py-2.5">{c.stableDays}</td>
                  <td className="px-2 py-2.5 text-right">
                    <button disabled={!!m.pending} className="rv-btn rv-btn-secondary rv-btn-sm" onClick={() => act(w, "clinic", "match_propose", { mentor: c.mentorId, mentee: m.id })}>Propose</button>
                  </td>
                </tr>
              ))}
              {!m.candidates.length && <tr><td colSpan={6} className="rv-muted px-2 py-3">No mentor available right now.</td></tr>}
            </tbody>
          </table>
        </div>
      ))}
      {!matching.length && <p className="rv-card rv-muted mt-4 p-6 text-center">Everyone has an active mentor.</p>}
    </>
  );
}

/* ---------- C5 · Configuración ---------- */
const NOTICE_TEXTS = [
  ["V1", "Would you like to talk to Luis today?"], ["V2", "Pablo would like to talk to you"], ["V3", "Fancy sending Pablo a note? Pablo would love to hear from you"], ["V4", "Your clinic team will call you soon to see how you are"],
  ["V5", "Marta would like to talk to you"], ["V6", "This week, a lighter pace"], ["V7", "We haven't heard from you for a few days. All good?"], ["V8", "Your ring hasn't synced. Could you check it when you can?"],
];
function Settings({ w, config }: { w: string; config: ClinicData["config"] }) {
  const [c, setC] = useState(config.current);
  const [saved, setSaved] = useState(false);
  const num = (k: keyof Config, label: string, step = 0.1, note?: string) => (
    <label className="flex items-center justify-between gap-3 border-t border-rv-line py-2.5">
      <span>{label}{note && <span className="rv-muted block text-[12px]">{note}</span>}</span>
      <input type="number" step={step} value={c[k] as number} onChange={(e) => setC({ ...c, [k]: Number(e.target.value) })} className="rv-input !w-24 text-right" />
    </label>
  );
  const hm = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
  return (
    <>
      <h1 className="text-[28px]">Settings</h1>
      <p className="rv-muted mt-1">Every change is recorded in the audit log. The engine recalculates with the new values straight away.</p>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rv-card p-4">
          <p className="font-semibold">Level thresholds</p>
          {num("l1_R", "Level 1 · Early signs (R smoothed ≥)")}
          {num("l2_R", "Level 2 · High risk (R smoothed ≥)")}
          {num("l3_R", "Level 3 · Severe (R smoothed ≥)")}
          {num("domain_hi", "Area threshold (with ≥ 2 features)", 0.1, "1.2 = more lead time and twice the false alarms; 2.0 = fewer false alarms, less sensitive (simulation)")}
          {num("persist_up", "Days in a row to go up", 1)}
          {num("persist_down", "Days in a row to come down", 1)}
        </div>
        <div className="rv-card p-4">
          <p className="font-semibold">Weights by area</p>
          {Object.entries(c.weights).map(([k, v]) => (
            <label key={k} className="flex items-center gap-3 border-t border-rv-line py-2.5">
              <span className="w-40">{{ sueno: "Sleep", movilidad: "Mobility", ritmo: "Rhythm", movil_vinculo: "Phone & connection", fisiologia: "Physiology" }[k]}</span>
              <input type="range" min={0} max={0.5} step={0.05} value={v} onChange={(e) => setC({ ...c, weights: { ...c.weights, [k]: Number(e.target.value) } })} className="flex-1 accent-[#0E6B5C]" />
              <span className="rv-num w-10 text-right">{v.toFixed(2)}</span>
            </label>
          ))}
          <p className="mt-3 font-semibold">Notice hours</p>
          <p className="rv-muted text-[13px]">{hm(c.noticeFrom)} – {hm(c.noticeTo)} · at most one push a day per person</p>
        </div>
        <div className="rv-card p-4">
          <p className="font-semibold">Action catalogue</p>
          {config.catalog.map((a) => (
            <label key={a.key} className="flex items-center justify-between gap-3 border-t border-rv-line py-2.5">
              <span>{a.label}<span className="rv-muted block text-[12px]">{a.domains.join(", ")}{a.direct ? " · direct (level 2)" : ""} · evidence prior {a.prior}</span></span>
              <input type="checkbox" checked={c.catalog[a.key]} onChange={(e) => setC({ ...c, catalog: { ...c.catalog, [a.key]: e.target.checked } })} className="h-5 w-5 accent-[#0E6B5C]" />
            </label>
          ))}
        </div>
        <div className="rv-card p-4">
          <p className="font-semibold">Notice texts</p>
          <ul className="mt-1">
            {NOTICE_TEXTS.map(([k, t]) => <li key={k} className="flex gap-3 border-t border-rv-line py-2 text-[13px]"><span className="w-7 font-semibold">{k}</span>{t}</li>)}
          </ul>
        </div>
      </div>
      <div className="sticky bottom-0 mt-4 flex gap-2 bg-[#f3f5f2]/90 py-3 backdrop-blur">
        <button className="rv-btn rv-btn-primary" onClick={async () => { await act(w, "clinic", "config", { patch: c }); setSaved(true); setTimeout(() => setSaved(false), 2000); }}>Save settings</button>
        <button className="rv-btn rv-btn-ghost" onClick={async () => { await act(w, "clinic", "config", { patch: { reset: true } }); setC(config.defaults); }}>Back to defaults</button>
        {saved && <span className="self-center font-semibold text-rv-teal">Saved</span>}
      </div>
    </>
  );
}

/* ---------- C6 · Consentimientos y auditoría ---------- */
function Consents({ data }: { data: ClinicData["consents"] }) {
  const Y = ({ on }: { on: boolean }) => <span className={on ? "font-semibold text-rv-teal" : "rv-muted"}>{on ? "Yes" : "No"}</span>;
  return (
    <>
      <h1 className="text-[28px]">Consents and audit</h1>
      <div className="rv-card mt-4 overflow-hidden">
        <table className="w-full text-left text-[13px]">
          <thead className="bg-[#fafbf9] text-[12px] text-rv-ink2"><tr>{["Person", "Daily summaries", "Notes analysis", "AI ideas for mentor", "Version", "Date"].map((h) => <th key={h} className="px-3 py-2.5 font-semibold">{h}</th>)}</tr></thead>
          <tbody>
            {data.people.map((p) => (
              <tr key={p.id} className="border-t border-rv-line">
                <td className="px-3 py-2 font-semibold">{p.name}{p.background && <span className="rv-muted font-normal"> · simulated</span>}</td>
                <td className="px-3 py-2"><Y on={p.data} /></td>
                <td className="px-3 py-2"><Y on={p.notes} /></td>
                <td className="px-3 py-2"><Y on={p.ideas} /></td>
                <td className="px-3 py-2">{p.version}</td>
                <td className="px-3 py-2">{p.date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <div className="rv-card p-4">
          <p className="font-semibold">Who opened what</p>
          <ul className="mt-2 divide-y divide-rv-line text-[13px]">
            {data.audit.map((a, i) => <li key={i} className="flex gap-3 py-2"><span className="rv-muted w-[108px] shrink-0">{a.when}</span><span>{a.who}: {a.what}</span></li>)}
            {!data.audit.length && <li className="rv-muted py-2">No entries yet.</li>}
          </ul>
        </div>
        <div className="rv-card p-4">
          <p className="font-semibold">Data download and deletion requests</p>
          <ul className="mt-2 divide-y divide-rv-line text-[13px]">
            {data.requests.map((r, i) => <li key={i} className="flex gap-3 py-2"><span className="rv-muted w-[108px] shrink-0">{r.when}</span><span>{r.name}: {r.kind === "delete" ? "delete data" : "copy of data"}</span></li>)}
            {!data.requests.length && <li className="rv-muted py-2">No requests.</li>}
          </ul>
        </div>
      </div>
    </>
  );
}
