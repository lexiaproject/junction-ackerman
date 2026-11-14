"use client";
// Vista de demo (sección 12): el móvil de Luis, el de Pablo (o Marta) y la web de la clínica a la vez,
// con un deslizador de días y la "Capa de explicación" que enseña lo que calculó el motor.
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { revealNames } from "@/lib/relevo/pseudo";
import { LEVEL_COLOR, LEVEL_TEXT, LineChart } from "../charts";
import ClinicWeb, { LevelTag } from "../ClinicWeb";
import { Fit, Icon, Phone, act, useOfflineQueue, useView, useWid } from "../kit";
import MenteeApp from "../MenteeApp";
import MentorApp from "../MentorApp";

type Today = { date: string; baselineDone: boolean; level: number; cand: number; streak: number; Rs: number | null; R: number | null; domains: { key: string; label: string; s: number | null; smooth: number | null; feats: number }[]; top: { key: string; name: string; z: number | null }[] };
type Series = { labels: string[]; Rs: (number | null)[]; level: number[]; cand: number[]; domains: Record<string, (number | null)[]> };
type P = { key: string; label: string; p: number | null };
type DemoData = {
  clock: { t: number; day: number; time: string; date: string };
  moments: { t: number; key: string; label: string; group: string; day: number; time: string }[];
  index: number; group: string;
  luis: { today: Today; series: Series }; pablo: { today: Today; series: Series };
  match: { luis: number[]; pablo: number[]; sara: number[]; pabloLuis: { affinity: number; reasons: string[] } | null; saraLuis: { affinity: number; reasons: string[] } | null };
  bandit: { contextLabel: string; evidence: P[]; pablo: P[]; start: P[]; now: P[]; cards: { day: string; label: string; level: number; probs: P[]; draws: P[]; prepared: boolean; status: string }[]; history: { when: string; label: string; reward: number; context: string }[] };
  copilot: { notes: { who: string; text: string; afecto_negativo: number; repeticion: number; orientacion_accion: number; indice_queja: number }[]; fired: boolean };
  notices: { code: string; to: string; text: string; time: string; status: string; pushed: boolean; why: string | null }[];
  crisis: { alert: { text: string; when: string; status: string; forwarded: boolean } | null };
  trace: { when: string; who: string; text: string; scripted: boolean }[];
  luisConsents?: { onboarded: boolean; off: ("data" | "notes" | "ideas")[] };
  evaluation: { l1: { sensitivity: number; lead: number; iqr: number[]; fa: number }; l2: { sensitivity: number; lead: number; fa: number }; people: number; relapses: number };
};
const DAY = 1440;
const END = 62 * DAY + 1439;
const DOM_COLOR: Record<string, string> = { sueno: "#3b6ea8", movilidad: "#0E6B5C", ritmo: "#8a5aa8", movil_vinculo: "#b7791f", fisiologia: "#8d99a0" };
const DOM_LABEL: Record<string, string> = { sueno: "Sleep", movilidad: "Mobility", ritmo: "Rhythm", movil_vinculo: "Phone & connection", fisiologia: "Physiology" };

export default function DemoPage() {
  const w = useWid();
  const [mentor, setMentor] = useState<"pablo" | "marta">("pablo");
  // Empieza cerrada para que los teléfonos se lean en el proyector; tecla E para abrir/cerrar
  const [explain, setExplain] = useState(false);
  // Ficha que la capa pide abrir en la clínica; n cuenta los clics para que funcione también la segunda vez
  const [focus, setFocus] = useState<{ id: string | null; n: number } | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [lost, setLost] = useState(false);
  useOfflineQueue();
  const { data, error } = useView<DemoData>(w ? `/api/relevo/demo?w=${w}` : null, 5000);

  // Aviso "Connection lost" durante 4 s si falla una acción del presentador
  const lostTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const viaKey = useRef(false); // el selector "Jump to moment" se está usando con teclado
  const flagLost = useCallback(() => {
    setLost(true);
    clearTimeout(lostTimer.current);
    lostTimer.current = setTimeout(() => setLost(false), 4000);
  }, []);

  // Último destino pedido del reloj: "Next" rápido parte de ahí y no del reloj que aún no ha llegado
  const target = useRef<number | null>(null);
  const chain = useRef<Promise<unknown>>(Promise.resolve());
  const pending = useRef(0);
  const setClock = useCallback(
    (to: number) => {
      if (!w) return;
      const t = Math.max(0, Math.min(END, to));
      target.current = t;
      pending.current++;
      setBusy(true);
      // En cadena: las peticiones llegan al servidor en el orden en que se pulsaron
      chain.current = chain.current
        .then(() => act(w, "demo", "clock", { to: t }))
        .catch(() => {
          if (target.current === t) target.current = null;
          flagLost();
        })
        .finally(() => {
          if (--pending.current === 0) setBusy(false);
        });
      setTimeout(() => {
        if (target.current === t) target.current = null;
      }, 5000);
    },
    [w, flagLost],
  );
  useEffect(() => {
    if (data && target.current === data.clock.t) target.current = null;
  }, [data]);
  // Un solo sitio que mueve el reloj a un momento y elige qué teléfono enseña la columna del mentor
  const pickMoment = useCallback(
    (m: DemoData["moments"][number]) => {
      setClock(m.t);
      if (m.group === "mentor" || m.group === "mentor2") setMentor(m.key === "pl1" ? "marta" : "pablo");
      else if (m.group === "solution" || m.group === "high" || m.group === "crisis" || m.group === "detect") setMentor("pablo");
    },
    [setClock],
  );
  const next = useCallback(() => {
    if (!data) return;
    const base = target.current ?? data.clock.t;
    const m = data.moments.find((x) => x.t > base);
    if (m) pickMoment(m);
  }, [data, pickMoment]);
  const prev = useCallback(() => {
    if (!data) return;
    const base = target.current ?? data.clock.t;
    const m = [...data.moments].reverse().find((x) => x.t < base);
    if (m) pickMoment(m);
    else setClock(0);
  }, [data, pickMoment, setClock]);
  // Tecla "+": reinicia la demo entera (borra lo que hicieron las personas, vuelve al principio y recarga la página)
  const restart = useCallback(() => {
    if (!w) return;
    setBusy(true);
    chain.current = chain.current
      .then(() => act(w, "demo", "reset"))
      .then(() => act(w, "demo", "clock", { to: 0 }))
      .then(() => window.location.reload())
      .catch(() => { setBusy(false); flagLost(); });
  }, [w, flagLost]);
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const el = e.target as HTMLElement;
      const tag = el.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el.isContentEditable) return;
      if (e.key === "+" && !e.repeat) return restart(); // también con una hoja abierta, por si algo se queda pillado
      if (el.closest?.('[role="dialog"],[role="radiogroup"]')) return;
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prev();
      if ((e.key === "e" || e.key === "E") && !e.shiftKey && !e.repeat) setExplain((x) => !x);
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [next, prev, restart]);

  // Al llegar hacia delante a un momento de "match" o "close" la capa se abre sola; si se cierra con E no se reabre en ese grupo
  const [seen, setSeen] = useState<{ t: number; g: string | null } | null>(null);
  if (data && (!seen || seen.t !== data.clock.t)) {
    const mm = data.index >= 0 ? data.moments[data.index] : null;
    const g = mm && (mm.group === "match" || mm.group === "close") ? mm.group : null;
    if (seen && data.clock.t > seen.t && g && seen.g !== g) setExplain(true);
    setSeen({ t: data.clock.t, g });
  }

  if (!w || !data)
    return <div className="rv-muted flex flex-1 items-center justify-center" role="status">{error ? "Can't reach Relevo right now · retrying…" : "Loading the demo…"}</div>;
  const c = data.clock;
  const moment = data.index >= 0 ? data.moments[data.index] : null;
  const share = typeof window !== "undefined" ? `${window.location.origin}/relevo/app?w=${w}` : "";
  const CONSENT_LABEL = { data: "data summaries", notes: "notes analysis", ideas: "AI ideas" } as const;
  const off = data.luisConsents?.onboarded ? data.luisConsents.off : [];

  return (
    <div className="flex min-h-dvh flex-col lg:h-dvh lg:min-h-[640px] lg:overflow-hidden">
      {/* Barra superior: reloj de la demo, momentos y deslizador de días */}
      <header className="shrink-0 border-b border-rv-line bg-white px-5 pb-2 pt-3">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <Link href="/relevo" className="text-[20px] font-semibold" style={{ fontFamily: "var(--rv-display)" }}>Relevo</Link>
          <div className="min-w-0">
            <p className="rv-num text-[17px] font-semibold leading-tight" style={{ fontFamily: "var(--rv-display)" }}>{c.date} · {c.time} <span className="rv-muted text-[13px] font-normal">day {c.day} after Luis&apos;s last TMS session</span></p>
            <p className="rv-muted truncate text-[13px]">{moment ? moment.label : "Before the demo starts"}</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            {(error || lost) && <span role="status" className="rv-chip bg-rv-notice text-rv-notice-ink">Connection lost · retrying…</span>}
            <button className="rv-btn rv-btn-ghost rv-btn-sm" onClick={prev} disabled={busy} aria-label="Previous moment"><Icon name="back" size={18} /></button>
            <button className="rv-btn rv-btn-primary" onClick={next} disabled={busy || data.index >= data.moments.length - 1}>Next moment<Icon name="chevron" size={18} /></button>
            <details
              className="relative"
              onKeyDown={(e) => {
                if (e.key !== "Escape" || !e.currentTarget.open) return;
                e.currentTarget.open = false;
                e.currentTarget.querySelector("summary")?.focus();
              }}
            >
              <summary className="rv-btn rv-btn-ghost rv-btn-sm list-none">More</summary>
              <div className="absolute right-0 z-50 mt-1 w-72 rounded-2xl bg-white p-3 text-[13px] shadow-xl ring-1 ring-rv-line">
                <label className="block px-2 pb-2">
                  <span className="rv-muted block pb-1">Jump to moment</span>
                  <select
                    aria-label="Jump to moment"
                    className="w-full rounded-lg border border-rv-line bg-white px-2 py-1.5"
                    value={moment?.key ?? ""}
                    onKeyDown={() => { viaKey.current = true; }}
                    onPointerDown={() => { viaKey.current = false; }}
                    onChange={(e) => {
                      const m = data.moments.find((x) => x.key === e.target.value);
                      if (m) pickMoment(m);
                      if (viaKey.current) return; // con teclado el foco y el menú se quedan
                      e.currentTarget.blur(); // las flechas vuelven a mover de momento
                      const d = e.currentTarget.closest("details");
                      if (d) d.open = false;
                    }}
                  >
                    {!moment && <option value="">Before the demo starts</option>}
                    {data.moments.map((m) => (
                      <option key={m.key} value={m.key}>Day {m.day} {m.time} · {m.label}</option>
                    ))}
                  </select>
                </label>
                <button className="block w-full rounded-lg px-2 py-2 text-left hover:bg-rv-bg" onClick={() => setClock(8 * 60)}>Go back to day 0</button>
                <button className="block w-full rounded-lg px-2 py-2 text-left hover:bg-rv-bg" onClick={restart}>Restart the whole demo <span className="rv-muted">(key +)</span></button>
                <button className="block w-full rounded-lg px-2 py-2 text-left hover:bg-rv-bg" onClick={() => act(w, "demo", "reset").catch(flagLost)}>Reset everything people did (keep the time)</button>
                <a className="block rounded-lg px-2 py-2 hover:bg-rv-bg" href={`/relevo/app?w=${w}&as=luis`} target="_blank">Open Luis&apos;s app on its own</a>
                <a className="block rounded-lg px-2 py-2 hover:bg-rv-bg" href={`/relevo/clinic?w=${w}`} target="_blank">Open the clinic web on its own</a>
                <p className="rv-muted mt-2 border-t border-rv-line px-2 pt-2">Same demo on a real phone: <span className="break-all font-semibold text-rv-ink">{share}</span></p>
              </div>
            </details>
          </div>
        </div>
        <Timeline data={data} onPick={setClock} onMoment={pickMoment} />
        {/* J-08 · Antes del primer momento: por qué hace falta Relevo (sin cifras clínicas) */}
        {data.index < 0 && (
          <div className="mt-2 flex flex-wrap items-center gap-x-6 gap-y-1 rounded-2xl bg-rv-sage px-4 py-3">
            <p className="text-[19px] font-semibold text-rv-teal" style={{ fontFamily: "var(--rv-display)" }}>Beyond the clinic</p>
            <ul className="min-w-0 flex-1 text-[14px] leading-snug">
              <li>After the last TMS session, each person goes home on their own.</li>
              <li>Relevo pairs every patient with someone who finished TMS a few months earlier.</li>
              <li>The phone nudges a person, never an alarm, and only the clinic sees health data.</li>
            </ul>
            <p className="font-semibold">Press <kbd className="rounded-md border border-rv-line bg-white px-1.5 text-[13px]">→</kbd> to start</p>
          </div>
        )}
        {off.length > 0 && (
          <div role="status" className="mt-1 flex flex-wrap items-center gap-2 rounded-xl bg-rv-notice px-3 py-1.5 text-[13px] text-rv-notice-ink">
            <span>Luis turned off {off.map((k) => CONSENT_LABEL[k]).join(" and ")}. That&apos;s his choice; the scripted story assumes all three are on.</span>
            <button className="font-semibold underline" onClick={() => act(w, "demo", "reset").catch(flagLost)}>Reset</button>
          </div>
        )}
      </header>

      {/* Las tres superficies a la vez */}
      <div data-rv-demo className="grid grid-cols-1 gap-6 px-5 pt-3 sm:grid-cols-2 lg:min-h-0 lg:flex-1 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,0.9fr)_minmax(0,1.6fr)] lg:gap-4">
        <Column title="Luis" sub="accompanied · just finished TMS">
          <Fit width={390} height={844}><Phone time={c.time} label="Luis's phone"><MenteeApp w={w} /></Phone></Fit>
        </Column>
        <Column
          title={mentor === "pablo" ? "Pablo" : "Marta"}
          sub={mentor === "pablo" ? "Luis's mentor · 4 months after TMS" : "Pablo's mentor"}
          right={
            <div className="flex rounded-full bg-white p-0.5 text-[12px] font-semibold shadow-[0_0_0_1px_var(--color-rv-line)]" role="tablist" aria-label="View as">
              {(["pablo", "marta"] as const).map((m) => (
                <button key={m} role="tab" aria-selected={mentor === m} onClick={() => setMentor(m)} className={`rounded-full px-2.5 py-1 ${mentor === m ? "bg-rv-teal text-white" : "text-rv-ink2"}`}>{m === "pablo" ? "Pablo" : "Marta"}</button>
              ))}
            </div>
          }
        >
          <Fit width={390} height={844}><Phone time={c.time} label={`${mentor}'s phone`}><MentorApp key={mentor} w={w} as={mentor} resetKey={data.index} /></Phone></Fit>
        </Column>
        <Column title="Clinic" sub="Aalto TMS Clinic · desktop web" right={<span className="rv-chip bg-[#f1ede4] text-[#6b5a2e]">Simulated sensor data</span>}>
          <Fit width={1100} height={820}>
            <div className="h-[820px] w-[1100px] overflow-hidden rounded-2xl shadow-[0_0_0_1px_var(--color-rv-line),0_20px_40px_-24px_rgb(0_0_0/0.35)]">
              <ClinicWeb w={w} onFocusPerson={focus} resetKey={data.index} />
            </div>
          </Fit>
        </Column>
      </div>

      {/* Capa de explicación: solo existe en la demo */}
      <section className={`shrink-0 border-t border-rv-line bg-white ${explain ? "lg:h-[30vh] lg:min-h-[220px]" : ""}`}>
        <div className="flex items-center gap-3 px-5 py-2">
          <label className="flex cursor-pointer items-center gap-2.5 font-semibold">
            <button role="switch" aria-checked={explain} onClick={() => setExplain((e) => !e)} className={`relative h-6 w-10 rounded-full transition-colors ${explain ? "bg-rv-teal" : "bg-[#cdd3ce]"}`}>
              <span className={`absolute left-0 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${explain ? "translate-x-[18px]" : "translate-x-0.5"}`} />
            </button>
            Show how Relevo decides
            <kbd className="rounded-md border border-rv-line bg-rv-bg px-1.5 text-[12px] font-semibold text-rv-ink2" aria-label="Keyboard shortcut E" title="Press E to show or hide">E</kbd>
          </label>
          <span className="rv-muted text-[13px]">What the engine computed to make the phones show what they show. Luis and Pablo never see any of this.</span>
          <span className="rv-chip ml-auto bg-[#f1ede4] text-[#6b5a2e]">Simulated sensor data</span>
        </div>
        {explain && (
          <div className="rv-scroll grid grid-cols-1 gap-5 px-5 pb-3 lg:h-[calc(100%-44px)] lg:grid-cols-[minmax(0,1fr)_300px] lg:overflow-hidden">
            <div className="rv-scroll min-w-0 overflow-y-auto pr-1"><Explain data={data} onFocus={(id) => setFocus((f) => ({ id, n: (f?.n ?? 0) + 1 }))} /></div>
            <EngineLog trace={data.trace} />
          </div>
        )}
      </section>
    </div>
  );
}

function Column({ title, sub, right, children }: { title: string; sub: string; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex h-[640px] min-h-0 flex-col last:sm:col-span-2 last:h-[440px] lg:h-auto last:lg:col-span-1 last:lg:h-auto">
      <div className="mb-2 flex items-center gap-2">
        <p className="font-semibold" style={{ fontFamily: "var(--rv-display)" }}>{title}</p>
        <p className="rv-muted truncate text-[12.5px]">{sub}</p>
        <div className="ml-auto">{right}</div>
      </div>
      <div className="min-h-0 flex-1">{children}</div>
    </div>
  );
}

function Timeline({ data, onPick, onMoment }: { data: DemoData; onPick: (t: number) => void; onMoment: (m: DemoData["moments"][number]) => void }) {
  const c = data.clock;
  const pct = (t: number) => (t / END) * 100;
  const [drag, setDrag] = useState<number | null>(null);
  const day = drag ?? c.day;
  // Un punto por día (los momentos del mismo día se solapaban): lleva al primer momento de ese día
  const days: { first: number; list: DemoData["moments"] }[] = [];
  data.moments.forEach((m, i) => {
    const g = days.at(-1);
    if (g && data.moments[g.first].day === m.day) g.list.push(m);
    else days.push({ first: i, list: [m] });
  });
  return (
    <div className="relative mt-2 pb-1">
      <div className="relative h-5">
        {/* Línea base de Luis (días 0-27) */}
        <div className="absolute top-2 h-1 rounded-full bg-rv-sage" style={{ left: 0, width: `${pct(28 * DAY)}%` }} title="Luis's baseline: days 0-27" />
        {days.map(({ first, list }) => {
          const m = list[0];
          const all = list.map((x) => `${x.time} · ${x.label}`).join("\n");
          return (
            <button
              key={m.key}
              onClick={() => onMoment(m)}
              title={`Day ${m.day}\n${all}`}
              aria-label={`Day ${m.day}: ${list.map((x) => `${x.time} ${x.label}`).join("; ")}`}
              className={`absolute top-0.5 h-4 w-4 -translate-x-1/2 rounded-full border-2 transition-transform hover:scale-125 ${first <= data.index ? "border-rv-teal bg-rv-teal" : "border-rv-teal bg-white"}`}
              style={{ left: `${pct(m.t)}%` }}
            />
          );
        })}
      </div>
      <input
        type="range"
        min={0}
        max={62}
        step={1}
        value={day}
        aria-label="Day of the demo"
        aria-valuetext={`Day ${day}`}
        onChange={(e) => setDrag(Number(e.target.value))}
        onPointerUp={(e) => {
          if (drag !== null) {
            onPick(drag * DAY + (c.t % DAY));
            setDrag(null);
          }
          e.currentTarget.blur(); // tras arrastrar, las flechas vuelven a mover de momento (no de día)
        }}
        onKeyUp={() => drag !== null && (onPick(drag * DAY + (c.t % DAY)), setDrag(null))}
        className="w-full accent-[#0E6B5C]"
      />
      <div className="rv-muted relative h-4 text-[11.5px]">
        {[[0, "Day 0 · 7 Sep"], [27, "Baseline ends · day 27"], [35, "Prodrome starts · day 35"], [62, "Day 62 · 8 Nov"]].map(([d, l]) => (
          <span key={d} className={`absolute whitespace-nowrap ${d === 0 ? "" : d === 62 ? "-translate-x-full" : "-translate-x-1/2 max-sm:hidden"}`} style={{ left: `${((d as number) / 62) * 100}%` }}>{l}</span>
        ))}
      </div>
      {drag !== null && <p className="rv-num absolute -top-1 rounded-md bg-rv-ink px-1.5 text-[11px] text-white" style={{ left: `${(drag / 62) * 100}%` }}>day {drag}</p>}
    </div>
  );
}

function EngineLog({ trace }: { trace: DemoData["trace"] }) {
  return (
    <div className="flex min-h-0 flex-col rounded-2xl bg-rv-bg p-3">
      <p className="text-[13px] font-semibold">What just happened</p>
      <ul className="rv-scroll mt-1 min-h-0 flex-1 overflow-y-auto text-[12px]">
        {trace.map((e, i) => (
          <li key={i} className="border-b border-rv-line py-1.5 last:border-0">
            <span className="rv-muted rv-num">{e.when}</span> · <span className="font-semibold">{e.who}</span>
            {e.scripted && <span className="rv-muted"> (script)</span>}
            <br />
            {revealNames(e.text)}
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ---------- Contenido de la capa según el momento ---------- */
function Explain({ data, onFocus }: { data: DemoData; onFocus: (id: string | null) => void }) {
  const g = data.group;
  const L = data.luis;
  const Pb = data.pablo;
  if (g === "match") {
    const dims = ["Sleep", "Rhythm", "Mobility", "Phone & connection", "Physiology", "Sleep direction"];
    const rows: [string, number[]][] = [["Luis", data.match.luis], ["Pablo", data.match.pablo], ["Sara", data.match.sara]];
    return (
      <div className="grid grid-cols-2 gap-6">
        <div>
          <H>Matching by how relapses started</H>
          <p className="rv-muted mt-1 text-[13.5px]">Entry questionnaire: what changed in their last relapse (0 no, 1 a bit, 2 a lot; sleep direction +1 more, −1 less).</p>
          <table className="mt-2 w-full text-[13px]">
            <thead><tr><th className="py-1 text-left"></th>{dims.map((d) => <th key={d} className="rv-muted px-1 py-1 text-center text-[11.5px] font-semibold">{d}</th>)}</tr></thead>
            <tbody>{rows.map(([n, v]) => <tr key={n} className="border-t border-rv-line"><td className="py-1.5 font-semibold">{n}</td>{v.map((x, i) => <td key={i} className="rv-num text-center">{x > 0 && i === 5 ? `+${x}` : x}</td>)}</tr>)}</tbody>
          </table>
        </div>
        <div>
          <p className="text-[13px] font-semibold">affinity = 0.6 · fingerprint similarity + 0.2 · schedules + 0.2 · language and preferences</p>
          {[["Pablo → Luis", data.match.pabloLuis], ["Sara → Luis", data.match.saraLuis]].map(([n, m]) => {
            const mm = m as DemoData["match"]["pabloLuis"];
            return (
              <div key={n as string} className="mt-3">
                <div className="flex justify-between text-[14px]"><span className="font-semibold">{n as string}</span><span className="rv-num font-semibold">{mm ? `${+(mm.affinity * 100).toFixed(1)}%` : ""}</span></div>
                <div className="mt-1 h-2.5 rounded-full bg-[#eef1ee]"><div className="h-full rounded-full bg-rv-teal" style={{ width: `${(mm?.affinity ?? 0) * 100}%` }} /></div>
                <p className="rv-muted mt-1 text-[12.5px]">{mm?.reasons.join(" · ")}</p>
              </div>
            );
          })}
          <Quote>Sara started with insomnia; Luis and Pablo both started out sleeping more and going out less.</Quote>
        </div>
      </div>
    );
  }
  if (g === "baseline")
    return (
      <div className="max-w-3xl">
        <H>Learning Luis&apos;s usual</H>
        <Quote>Relevo doesn&apos;t compare Luis with anyone. It learns his usual for four weeks: the median and a robust scale of each of his 16 features.</Quote>
        <p className="mt-3 text-[14px]">From day 28, each feature is expressed as how far it is from <em>his</em> usual (robust z, clipped at ±4). Areas: sleep 0.30 · mobility 0.25 · phone &amp; connection 0.20 · rhythm 0.15 · physiology 0.10.</p>
        <p className="rv-muted mt-2 text-[13px]">The phones look exactly the same as before: there is nothing for Luis or Pablo to see.</p>
      </div>
    );
  if (g === "copilot")
    return (
      <div>
        <H>Copilot: a complaint loop, seen only by Pablo</H>
        <p className="rv-muted mt-1 text-[13.5px]">For every voice note: complaint index = 0.4 · negative affect + 0.4 · repetition + 0.2 · (1 − action orientation). Repetition = similarity with the 3 previous notes.</p>
        <table className="mt-2 w-full text-[13px]">
          <thead className="text-[12px] text-rv-ink2"><tr><th className="py-1 text-left">Note</th><th>Negative</th><th>Repetition</th><th>Action</th><th>Index</th></tr></thead>
          <tbody>
            {data.copilot.notes.map((n, i) => (
              <tr key={i} className="border-t border-rv-line">
                <td className="py-1.5 pr-3">{n.who}: “{revealNames(n.text)}”</td>
                <td className="rv-num text-center">{n.afecto_negativo}</td><td className="rv-num text-center">{n.repeticion}</td><td className="rv-num text-center">{n.orientacion_accion}</td>
                <td className="rv-num text-center font-semibold" style={{ color: n.indice_queja >= 0.7 ? LEVEL_COLOR[2] : undefined }}>{n.indice_queja}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <Quote>{data.copilot.fired ? "Two notes in a row at 0.7 or more: Pablo gets a private suggestion in his conversation (then 72 h of silence). Luis sees nothing." : "When the last two notes both reach 0.7, Pablo gets a private suggestion."}</Quote>
      </div>
    );
  if (g === "detect" || g === "high" || g === "crisis") {
    const t = L.today;
    return (
      <div className="grid grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] gap-6">
        <div>
          <H>{g === "detect" ? "Detecting the prodrome" : g === "high" ? "High risk: the clinic steps in" : "Severe protocol"}</H>
          <p className="rv-muted mb-1 mt-1 text-[12.5px]">Luis · smoothed deviation by area (EWMA, λ 0.3) and level since day 28</p>
          <LineChart ariaLabel="Luis: smoothed deviation by area" labels={L.series.labels} height={170} lines={Object.entries(L.series.domains).filter(([, v]) => v.some((x) => x !== null)).map(([k, v]) => ({ values: v, color: DOM_COLOR[k], label: DOM_LABEL[k] }))} thresholds={[{ v: 1.5, label: "area threshold 1.5" }]} steps={L.series.level} digits={2} />
          <div className="mt-1 flex flex-wrap gap-3 text-[12px]">{Object.keys(DOM_LABEL).map((k) => <span key={k} className="flex items-center gap-1.5"><span className="h-0.5 w-3.5 rounded" style={{ background: DOM_COLOR[k] }} />{DOM_LABEL[k]}</span>)}</div>
        </div>
        <div className="text-[13.5px]">
          <p className="font-semibold">Today · {t.date}</p>
          {!t.baselineDone ? <p className="rv-muted">Baseline still in progress.</p> : (
            <>
              <div className="mt-1 flex items-center gap-2"><LevelTag level={t.level} /><span className="rv-num">R smoothed <b>{t.Rs}</b></span>{t.cand > t.level && t.level < 3 && <span className="rv-chip bg-rv-notice text-rv-notice-ink">candidate {Math.min(3, t.cand)} · day {t.streak} of 3</span>}</div>
              <table className="mt-2 w-full">
                <tbody>
                  {t.domains.filter((d) => d.s !== null).map((d) => (
                    <tr key={d.key} className="border-t border-rv-line">
                      <td className="py-1">{d.label}</td>
                      <td className="rv-num text-right">s {d.s?.toFixed(2)}</td>
                      <td className="rv-num text-right font-semibold" style={{ color: (d.smooth ?? 0) >= 1.5 ? LEVEL_COLOR[2] : undefined }}>smoothed {d.smooth?.toFixed(2)}</td>
                      <td className="rv-muted text-right text-[12px]">{d.feats} feat.</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="rv-muted mt-1 text-[12.5px]">Highest: {t.top.map((x) => `${x.name} z ${x.z}`).join(" · ")}</p>
            </>
          )}
          {g === "detect" && <Quote>No single data point fires anything. It takes three days in a row of a clear change in one area with several features.</Quote>}
          {g === "high" && (
            <>
              <p className="mt-2 font-semibold">Notices today and the one-push-a-day rule</p>
              <ul className="mt-1">{data.notices.map((n, i) => <li key={i} className="border-t border-rv-line py-1 text-[12.5px]"><b>{n.code}</b> → {n.to} · {n.time} · {n.status}{n.pushed ? " · push" : ""}{n.why ? <span className="rv-muted"> — {n.why}</span> : null}</li>)}</ul>
              <button className="mt-2 text-[13px] font-semibold text-rv-teal underline" onClick={() => onFocus("luis")}>Open Luis&apos;s file in the clinic</button>
            </>
          )}
          {g === "crisis" && (
            <>
              <Quote>A phrase from the fixed list → level 3 without waiting three days. The AI doesn&apos;t decide: the list rules, the AI could only add.</Quote>
              {data.crisis.alert && <p className="mt-2 text-[13px]">Alert: {data.crisis.alert.text} · {data.crisis.alert.when} · {data.crisis.alert.status}{data.crisis.alert.forwarded ? " · forwarded to on-call after 15 min" : ""}</p>}
            </>
          )}
        </div>
      </div>
    );
  }
  if (g === "solution") {
    const b = data.bandit;
    const cols: [string, P[]][] = [["Evidence prior", b.evidence], ["What worked for Pablo (with Marta)", b.pablo], ["Pablo & Luis start (half and half)", b.start], ["Now", b.now]];
    return (
      <div className="grid grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] gap-6">
        <div>
          <H>A personal solution: Thompson sampling</H>
          <p className="rv-muted mt-1 text-[13px]">Context = Luis&apos;s most changed area today ({b.contextLabel}). Only actions offered in that context compete; each has a Beta probability of “working” for this pair.</p>
          <table className="mt-2 w-full text-[13px]">
            <thead className="text-[11.5px] text-rv-ink2"><tr><th className="py-1 text-left">Action</th>{cols.map(([h]) => <th key={h} className="px-1 font-semibold">{h}</th>)}</tr></thead>
            <tbody>
              {b.evidence.map((a, i) => (
                <tr key={a.key} className="border-t border-rv-line">
                  <td className="py-1.5 font-semibold">{a.label}</td>
                  {cols.map(([h, v]) => <td key={h} className="rv-num text-center" style={{ fontWeight: h === "Now" ? 700 : 400, color: h === "Now" && v[i].p !== b.start[i].p ? "#0E6B5C" : undefined }}>{v[i].p?.toFixed(2)}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="text-[13.5px]">
          {b.cards.slice(-2).map((cd, i) => (
            <p key={i} className="border-t border-rv-line py-1.5"><b>{cd.day}</b>: drew {cd.draws.map((d) => `${d.label} ${d.p?.toFixed(2)}`).join(", ")} → <b>{cd.label}</b>{cd.level >= 2 ? " (direct only)" : ""}{cd.prepared ? " · prepared for the next day" : ""}</p>
          ))}
          {b.history.slice(-2).map((h, i) => <p key={i} className="border-t border-rv-line py-1.5">{h.when}: {h.label} gets reward <b>{h.reward}</b> ({h.context})</p>)}
          <Quote>This is how it learns what works for this pair, not for the average.</Quote>
        </div>
      </div>
    );
  }
  if (g === "mentor" || g === "mentor2") {
    const t = Pb.today;
    return (
      <div className="grid grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] gap-6">
        <div>
          <H>Protecting the mentor</H>
          <p className="rv-muted mb-1 mt-1 text-[12.5px]">Pablo is watched exactly like Luis: smoothed deviation by area and level</p>
          <LineChart ariaLabel="Pablo: smoothed deviation by area" labels={Pb.series.labels} height={170} lines={Object.entries(Pb.series.domains).filter(([, v]) => v.some((x) => x !== null)).map(([k, v]) => ({ values: v, color: DOM_COLOR[k], label: DOM_LABEL[k] }))} thresholds={[{ v: 1.5, label: "area threshold 1.5" }]} steps={Pb.series.level} digits={2} />
        </div>
        <div className="text-[13.5px]">
          <div className="flex items-center gap-2"><LevelTag level={t.level} /><span className="rv-num">R smoothed <b>{t.Rs}</b></span></div>
          <p className="mt-2">{g === "mentor" ? "Pablo enters level 1. Marta is asked first (“Would you like to talk to Pablo today?”). Only when she says yes does Pablo read “Marta would like to talk to you”." : "Pablo enters level 2: he's offered a pause, ideas for Luis are paused even if he prefers to continue, and the clinic sees “Review pace” and can propose a temporary mentor in Matching."}</p>
          <Quote>Pablo never sees a number about himself. We never tell him he&apos;s worse.</Quote>
          <button className="mt-2 text-[13px] font-semibold text-rv-teal underline" onClick={() => onFocus("pablo")}>Open Pablo&apos;s file in the clinic</button>
        </div>
      </div>
    );
  }
  const e = data.evaluation;
  return (
    <div className="grid grid-cols-3 gap-4">
      <div className="col-span-3"><H>What the simulation shows</H><p className="rv-muted mt-1 text-[13px]">{e.people} synthetic people we generated, {e.relapses} simulated relapses, default thresholds. This checks that the logic works as designed, not that it predicts relapse in real patients.</p></div>
      {[["Level 1 catches", `${Math.round(e.l1.sensitivity * 100)}%`, "of simulated relapses"], ["Median lead time", `${e.l1.lead} days`, `IQR ${e.l1.iqr[0]}–${e.l1.iqr[1]} days`], ["False alarms, level 1", `${e.l1.fa}`, "per person per year: a walk with the mentor"]].map(([a, b, cc]) => (
        <div key={a} className="rounded-2xl bg-rv-bg p-4"><p className="rv-num text-[30px] font-semibold text-rv-teal" style={{ fontFamily: "var(--rv-display)" }}>{b}</p><p className="font-semibold">{a}</p><p className="rv-muted text-[12.5px]">{cc}</p></div>
      ))}
      <p className="col-span-3 text-[14px]">Level 2 is much stricter: it catches <b>{Math.round(e.l2.sensitivity * 100)}%</b> with a median of <b>{e.l2.lead} {e.l2.lead === 1 ? "day's" : "days'"}</b> notice, and gives <b>{e.l2.fa}</b> false alarms per person per year. <i>Cheap false alarms (a walk) go to the mentor; costly ones reach the clinic far less often. Real-world accuracy would need a clinical study.</i></p>
      <p className="rv-muted col-span-3 text-[12px]">Levels: {LEVEL_TEXT.map((l, i) => `${i} ${l}`).join(" · ")}</p>
    </div>
  );
}

function H({ children }: { children: React.ReactNode }) {
  return <h3 className="text-[19px] leading-tight">{children}</h3>;
}
function Quote({ children }: { children: React.ReactNode }) {
  return <p className="mt-2 border-l-2 border-rv-teal pl-3 text-[14.5px] italic text-rv-ink">{children}</p>;
}
