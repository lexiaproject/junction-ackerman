"use client";
// App del acompañado (Luis): se puede usar sin hacer nada. Abrir, escuchar, aceptar un plan o cerrar.
// Sin pestañas, sin contadores, sin rojos, sin gráficos. Nunca ve un número de salud.
import { useEffect, useState } from "react";
import { revealNames } from "@/lib/relevo/pseudo";
import { Avatar, Icon, Recorder, Sheet, TextNote, VoiceNote, act, usePlayer, useView, type NoteV } from "./kit";

type Notice = { id: string; code: string; text: string; buttons: { id: string; label: string }[]; from: string | null; noteId: string | null };
type PlanV = { id: string; title: string; icon: string; when: string; whenT: number; status: string; feedback: string | null; past: boolean; askFeedback: boolean; mentorName: string; note: NoteV | null; place: string | null };
type DeviceRow = { id: string; name: string; via?: string; detail: string; icon: string; status: string; statusText: string; sync: string | null; help: string | null };
export type MeData = {
  clock: { time: string; date: string; short: string; t: number };
  me: { id: string; name: string };
  onboarded: boolean;
  consents: { data: boolean; notes: boolean; ideas: boolean };
  mentor: { id: string; name: string; state: string; story: string } | null;
  intro: NoteV | null;
  notices: Notice[];
  last: NoteV | null;
  conversation: NoteV[];
  plan: PlanV | null;
  plans: PlanV[];
  social: { label: string } | null;
  openHelp: string | null;
  devices: { rows: DeviceRow[]; types: { key: string; label: string; purpose: string; on: boolean }[]; simulated: boolean };
  clinic: { name: string; phone: string };
  requests: { kind: string; when: string }[];
};

export default function MenteeApp({ w, as = "luis" }: { w: string; as?: string }) {
  const { data } = useView<MeData>(`/api/relevo/me?w=${w}&as=${as}`);
  const player = usePlayer(w);
  const [screen, setScreen] = useState<"home" | "chat" | "devices" | `plan:${string}`>("home");
  const [help, setHelp] = useState(false);
  const [seenHelp, setSeenHelp] = useState<string | null>(null);
  const [writeClinic, setWriteClinic] = useState(false);
  const [toast, setToast] = useState("");

  // A3 se abre sola si una nota activa el filtro de crisis (o si pide ayuda desde V7)
  useEffect(() => {
    if (data?.openHelp && data.openHelp !== seenHelp) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reacción a un dato del servidor
      setHelp(true);
      setSeenHelp(data.openHelp);
    } else if (data && !data.openHelp && seenHelp) {
      // La clínica resolvió la alerta (o se movió el reloj de la demo): la hoja que se abrió sola se cierra
      setHelp(false);
      setSeenHelp(null);
    }
  }, [data, seenHelp]);
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(""), 2600);
    return () => clearTimeout(id);
  }, [toast]);

  if (!data) return <div className="flex flex-1 items-center justify-center rv-muted">Loading…</div>;
  if (!data.onboarded) return <Welcome w={w} as={as} data={data} player={player} />;
  const mentor = data.mentor;
  const mName = mentor?.name ?? "your mentor";
  const go = (s: typeof screen) => {
    setScreen(s);
    document.getElementById(`rv-scroll-${as}`)?.scrollTo({ top: 0 });
  };

  async function onNotice(n: Notice, choice: string) {
    await act(w, as, "notice", { noticeId: n.id, choice }).catch(() => {});
    if (choice === "listen" && n.noteId) {
      const note = data!.conversation.find((x) => x.id === n.noteId);
      if (note) player.play(note);
    }
    if (choice === "note") go("chat");
    if (choice === "write") setWriteClinic(true);
    if (choice === "need_help") setHelp(true);
    if (choice === "check") go("devices");
  }

  const planScreen = screen.startsWith("plan:") ? data.plans.find((p) => p.id === screen.slice(5)) ?? null : null;

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      {/* Cabecera: saludo y ayuda siempre visible */}
      <header className="flex shrink-0 items-center justify-between px-5 pb-2 pt-2">
        {screen === "home" ? (
          <h1 className="text-[24px]">Hi, {data.me.name}</h1>
        ) : (
          <button onClick={() => go("home")} className="rv-btn rv-btn-ghost -ml-3 px-3" aria-label="Back to home">
            <Icon name="back" />
            <span className="text-[16px] text-rv-ink">{screen === "chat" ? mName : screen === "devices" ? "Devices and privacy" : "Plan"}</span>
          </button>
        )}
        <button onClick={() => setHelp(true)} className="rv-btn rv-btn-help rv-btn-sm !min-h-[44px] gap-1.5">
          <Icon name="heart" size={16} />
          Help
        </button>
      </header>

      <div id={`rv-scroll-${as}`} className="rv-scroll min-h-0 flex-1 overflow-y-auto">
        {screen === "home" && (
          <div className="flex flex-col gap-3 px-4 pb-6 pt-1">
            {/* Avisos amables (V2, V3, V4, V7, V8) */}
            {data.notices.map((n) => (
              <div key={n.id} className="rv-notice rv-in p-4">
                <div className="flex items-start gap-3">
                  {n.from ? <Avatar name={n.from} size={38} /> : <span className="flex h-[38px] w-[38px] items-center justify-center rounded-full bg-white/70"><Icon name={n.code === "V8" ? "ring" : n.code === "V4" ? "phone" : "heart"} size={18} /></span>}
                  <p className="pt-1.5 text-[16px] font-semibold leading-snug">{n.text}</p>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {n.buttons.map((b, i) => (
                    <button key={b.id} onClick={() => onNotice(n, b.id)} className={`rv-btn ${i === 0 ? "rv-btn-notice" : "rv-btn-ghost text-rv-notice-ink"} ${i === 0 ? "flex-1" : ""}`}>
                      {b.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}

            {/* Última nota del mentor */}
            {!mentor ? (
              <div className="rv-card p-5">
                <p className="text-[16px] font-semibold">We&apos;re looking for the person who will accompany you.</p>
                <p className="rv-muted mt-1">Meanwhile, your clinic is keeping an eye on you.</p>
              </div>
            ) : mentor.state === "left" ? (
              <div className="rv-card p-5">
                <p className="text-[16px] font-semibold">{mName} can&apos;t accompany you anymore.</p>
                <p className="rv-muted mt-1">We&apos;ll introduce you to someone soon.</p>
              </div>
            ) : data.last ? (
              <div className="rv-card p-4">
                <button onClick={() => go("chat")} className="mb-2 flex w-full items-center gap-3 text-left" aria-label={`Open conversation with ${mName}`}>
                  <Avatar name={mName} size={36} />
                  <span className="min-w-0">
                    <span className="block font-semibold">{mName} left you a note</span>
                    <span className="rv-muted block text-[12.5px]">{data.last.when}</span>
                  </span>
                  <Icon name="chevron" className="ml-auto text-rv-ink2" />
                </button>
                <VoiceNote note={data.last} player={player} />
              </div>
            ) : (
              <div className="rv-card flex items-center gap-3 p-4">
                <Avatar name={mName} size={36} />
                <p className="font-semibold">{mName} will write to you soon</p>
              </div>
            )}

            {/* Plan propuesto */}
            {data.plan && <PlanCard w={w} as={as} plan={data.plan} onOpen={() => go(`plan:${data.plan!.id}`)} onToast={setToast} />}

            {/* Recuerdo social: habla de la relación, no de su salud */}
            {data.social && !data.social.label.endsWith(": 0") && <p className="rv-muted px-2 text-center text-[13.5px]">{data.social.label}</p>}

            {/* Botón grande de grabar */}
            {mentor && mentor.state !== "left" && (
              <div className="mt-3 pb-2">
                <Recorder w={w} as={as} to={mentor.id} toName={mName} sub="Only if you feel like it. No need to reply." />
              </div>
            )}

            <button onClick={() => go("devices")} className="rv-muted mx-auto mt-2 text-[13px] underline underline-offset-4">
              My devices and privacy
            </button>
          </div>
        )}

        {screen === "chat" && mentor && (
          <div className="flex min-h-full flex-col">
            <div className="flex flex-1 flex-col gap-2.5 px-4 pb-4 pt-2">
              {data.conversation.length === 0 && <p className="rv-muted py-10 text-center">No notes yet.</p>}
              {data.conversation.map((n) => (
                <VoiceNote key={n.id} note={n} player={player} bubble />
              ))}
            </div>
            <ChatBar w={w} as={as} to={mentor.id} toName={mName} />
          </div>
        )}

        {screen === "devices" && <Devices w={w} as={as} data={data} />}
        {planScreen && <PlanDetail w={w} as={as} plan={planScreen} player={player} onToast={setToast} />}
      </div>

      {toast && (
        <div className="rv-in pointer-events-none absolute inset-x-6 bottom-6 z-30 rounded-full bg-rv-ink px-4 py-3 text-center text-[14px] font-semibold text-white shadow-lg" role="status">
          {toast}
        </div>
      )}
      {help && <HelpSheet w={w} as={as} mentorName={mentor && mentor.state !== "left" ? mName : null} clinic={data.clinic} onClose={() => setHelp(false)} />}
      {writeClinic && (
        <Sheet onClose={() => setWriteClinic(false)} label="Write to your clinic">
          <h2 className="text-[22px]">Write to your clinic</h2>
          <p className="rv-muted mt-1">Your clinic team will read it before they call.</p>
          <div className="mt-5">
            <Recorder w={w} as={as} to="clinic" toName="your clinic" label="Hold to record a note" onSent={() => setTimeout(() => setWriteClinic(false), 1600)} />
          </div>
          <div className="mt-4">
            <TextNote w={w} as={as} to="clinic" toName="your clinic" onSent={() => setWriteClinic(false)} />
          </div>
        </Sheet>
      )}
    </div>
  );
}

function ChatBar({ w, as, to, toName }: { w: string; as: string; to: string; toName: string }) {
  const [write, setWrite] = useState(false);
  return (
    <div className="sticky bottom-0 border-t border-rv-line bg-rv-bg/95 px-4 pb-4 pt-3 backdrop-blur">
      {write ? (
        <>
          <TextNote w={w} as={as} to={to} toName={toName} onSent={() => setWrite(false)} />
          <button className="rv-btn rv-btn-ghost mt-1 w-full" onClick={() => setWrite(false)}>
            Back to voice
          </button>
        </>
      ) : (
        <div className="flex items-center gap-3">
          <Recorder w={w} as={as} to={to} toName={toName} compact />
          <p className="rv-muted flex-1 text-[13px]">Hold to talk to {toName}. No need to reply.</p>
          <button className="rv-btn rv-btn-ghost px-2" onClick={() => setWrite(true)} aria-label="Write instead">
            <Icon name="text" />
          </button>
        </div>
      )}
    </div>
  );
}

const ICON_OF: Record<string, string> = { walk: "walk", basket: "basket", phone: "phone", cup: "cup", moon: "moon", breath: "breath" };

function PlanCard({ w, as, plan, onOpen, onToast }: { w: string; as: string; plan: PlanV; onOpen: () => void; onToast: (s: string) => void }) {
  const [busy, setBusy] = useState(false);
  const answer = async (choice: string) => {
    setBusy(true);
    await act(w, as, "plan", { planId: plan.id, choice }).catch(() => {});
    setBusy(false);
    if (choice === "in") onToast(`Done! ${plan.mentorName} knows`);
  };
  return (
    <div className="rv-card rv-in p-4">
      <button onClick={onOpen} className="flex w-full items-center gap-3 text-left">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-rv-sage text-rv-teal">
          <Icon name={ICON_OF[plan.icon] ?? "calendar"} size={22} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[16px] font-semibold leading-snug">{plan.title}</span>
          <span className="rv-muted block text-[13.5px]">{plan.when}</span>
        </span>
        <Icon name="chevron" className="text-rv-ink2" />
      </button>
      {plan.status === "proposed" && (
        <div className="mt-3 flex gap-2">
          <button disabled={busy} onClick={() => answer("in")} className="rv-btn rv-btn-primary flex-1">
            I&apos;m in
          </button>
          <button disabled={busy} onClick={() => answer("other_day")} className="rv-btn rv-btn-secondary">
            Another day
          </button>
        </div>
      )}
      {plan.status === "accepted" && !plan.past && (
        <p className="mt-3 flex items-center gap-2 text-[14px] font-semibold text-rv-teal">
          <Icon name="check" size={18} /> You&apos;re in. {plan.mentorName} knows.
        </p>
      )}
      {plan.askFeedback && <Feedback w={w} as={as} plan={plan} />}
    </div>
  );
}

function Feedback({ w, as, plan }: { w: string; as: string; plan: PlanV }) {
  return (
    <div className="mt-3 border-t border-rv-line pt-3">
      <p className="text-[14px] font-semibold">How did it go?</p>
      <div className="mt-2 flex gap-2">
        {[["good", "Good"], ["ok", "So-so"], ["didnt", "Didn't go"]].map(([k, l]) => (
          <button key={k} onClick={() => act(w, as, "plan_feedback", { planId: plan.id, feedback: k })} className="rv-btn rv-btn-secondary rv-btn-sm flex-1">
            {l}
          </button>
        ))}
      </div>
      <p className="rv-muted mt-1.5 text-[12px]">Optional. Skipping it is fine.</p>
    </div>
  );
}

/* ---------- A5 · Detalle de un plan ---------- */
const DAY0 = Date.UTC(2026, 8, 7); // 7/09/2026, día 0 de la demo
export function ics(plan: { id: string; title: string; whenT: number; place?: string | null }) {
  const start = new Date(DAY0 + plan.whenT * 60000 - 3 * 3600000); // hora de Finlandia (UTC+3 en otoño, aprox.)
  const end = new Date(start.getTime() + 30 * 60000);
  const f = (d: Date) => d.toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z";
  const body = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Relevo//EN", "BEGIN:VEVENT", `UID:${plan.id}@relevo`, `DTSTAMP:${f(new Date())}`, `DTSTART:${f(start)}`, `DTEND:${f(end)}`, `SUMMARY:${plan.title}`, plan.place ? `LOCATION:${plan.place}` : "", "END:VEVENT", "END:VCALENDAR"].filter(Boolean).join("\r\n");
  return URL.createObjectURL(new Blob([body], { type: "text/calendar" }));
}
function PlanDetail({ w, as, plan, player, onToast }: { w: string; as: string; plan: PlanV; player: ReturnType<typeof usePlayer>; onToast: (s: string) => void }) {
  const status =
    plan.status === "accepted" ? `You're in. ${plan.mentorName} knows.` : plan.status === "change_requested" ? `You asked ${plan.mentorName} for another time.` : plan.status === "cant" ? `${plan.mentorName} knows you can't make it.` : plan.status === "other_day" ? "Another day, then." : null;
  return (
    <div className="flex flex-col gap-3 px-4 pb-6 pt-2">
      <div className="rv-card p-5">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rv-sage text-rv-teal">
          <Icon name={ICON_OF[plan.icon] ?? "calendar"} size={24} />
        </span>
        <h2 className="mt-3 text-[24px] leading-tight">{plan.title}</h2>
        <p className="mt-1 flex items-center gap-2 text-[15px]"><Icon name="clock" size={17} className="text-rv-ink2" />{plan.when}</p>
        {plan.place && <p className="mt-1 flex items-center gap-2 text-[15px]"><Icon name="pin" size={17} className="text-rv-ink2" />{plan.place}</p>}
        {status && <p className="mt-3 text-[14px] font-semibold text-rv-teal">{status}</p>}
      </div>
      {plan.note && (
        <div className="rv-card p-3">
          <p className="rv-muted px-1 pb-1 text-[13px]">{plan.mentorName}&apos;s note about the plan</p>
          <VoiceNote note={plan.note} player={player} />
        </div>
      )}
      {plan.status === "proposed" && (
        <div className="flex gap-2">
          <button onClick={async () => { await act(w, as, "plan", { planId: plan.id, choice: "in" }); onToast(`Done! ${plan.mentorName} knows`); }} className="rv-btn rv-btn-primary rv-btn-lg flex-1">
            I&apos;m in
          </button>
          <button onClick={() => act(w, as, "plan", { planId: plan.id, choice: "other_day" })} className="rv-btn rv-btn-secondary rv-btn-lg">
            Another day
          </button>
        </div>
      )}
      {!plan.past && plan.status !== "cant" && (
        <div className="rv-card divide-y divide-rv-line">
          <a href={ics(plan)} download="relevo-plan.ics" className="flex min-h-[52px] items-center gap-3 px-4"><Icon name="calendar" className="text-rv-teal" />Add to my calendar</a>
          <button onClick={() => act(w, as, "plan", { planId: plan.id, choice: "change_time" })} className="flex min-h-[52px] w-full items-center gap-3 px-4 text-left"><Icon name="clock" className="text-rv-teal" />Change the time</button>
          <button onClick={() => act(w, as, "plan", { planId: plan.id, choice: "cant" })} className="flex min-h-[52px] w-full items-center gap-3 px-4 text-left"><Icon name="x" className="text-rv-teal" />I can&apos;t anymore</button>
        </div>
      )}
      {plan.askFeedback && (
        <div className="rv-card p-4">
          <Feedback w={w} as={as} plan={plan} />
        </div>
      )}
      {plan.feedback && <p className="rv-muted text-center text-[13.5px]">Thanks for telling us how it went.</p>}
    </div>
  );
}

/* ---------- A3 · Ayuda (también M7) ---------- */
export function HelpSheet({ w, as, mentorName, clinic, onClose }: { w: string; as: string; mentorName: string | null; clinic: { phone: string }; onClose: () => void }) {
  const [done, setDone] = useState<{ clinic?: boolean; mentor?: boolean }>({});
  const big = "rv-btn w-full !min-h-[72px] !rounded-[22px] text-[17px] justify-start px-5";
  return (
    <Sheet onClose={onClose} label="Need help right now?">
      <h2 className="text-[26px] leading-tight">Need help right now?</h2>
      <p className="rv-muted mt-1 text-[15px]">You&apos;re not alone. Choose what you need.</p>
      <div className="mt-5 flex flex-col gap-2.5">
        <a href="tel:112" className={`${big} rv-btn-emergency`}><Icon name="phone" />Emergency · 112</a>
        <a href="tel:+358925250111" className={`${big} rv-btn-secondary`}>
          <Icon name="phone" className="text-rv-help" />
          <span className="text-left leading-tight">MIELI crisis line · 09 2525 0111<span className="rv-muted block text-[12.5px] font-normal">24 h, in Finnish</span></span>
        </a>
        {/* K-09: la confirmación va fuera del botón (texto legible, anunciado con role=status); el botón no se
            deshabilita (conserva el foco) y un segundo toque no repite la acción. */}
        <div>
          <button
            className={`${big} rv-btn-secondary`}
            aria-disabled={!!done.clinic}
            onClick={async () => {
              if (done.clinic) return;
              setDone((d) => ({ ...d, clinic: true }));
              await act(w, as, "help", { type: "clinic" }).catch(() => {});
            }}
          >
            <Icon name="users" className="text-rv-help" />
            <span className="text-left leading-tight">Talk to my clinic</span>
          </button>
          <p role="status" className="px-5 text-[14px] font-semibold text-rv-teal">{done.clinic &&<span className="block pt-1.5">They&apos;ll call you as soon as possible</span>}</p>
        </div>
        {mentorName && (
          <div>
            <button
              className={`${big} rv-btn-secondary`}
              aria-disabled={!!done.mentor}
              onClick={async () => {
                if (done.mentor) return;
                setDone((d) => ({ ...d, mentor: true }));
                await act(w, as, "help", { type: "mentor" }).catch(() => {});
              }}
            >
              <Icon name="chat" className="text-rv-help" />
              <span className="text-left leading-tight">Ask {mentorName} to write to me</span>
            </button>
            <p role="status" className="px-5 text-[14px] font-semibold text-rv-teal">{done.mentor &&<span className="block pt-1.5">{mentorName} has your message</span>}</p>
          </div>
        )}
      </div>
      {mentorName && <p className="rv-muted mt-4 text-center text-[13px]">{mentorName} doesn&apos;t see your health data.</p>}
      <p className="rv-muted mt-1 text-center text-[12px]">Clinic {clinic.phone}</p>
    </Sheet>
  );
}

/* ---------- A4 / M4 · Dispositivos y privacidad ---------- */
const DOT: Record<string, string> = { connected: "bg-[#2f8a5b]", stale: "bg-rv-l1", permission: "bg-[#9aa39e]", none: "bg-transparent ring-1 ring-[#9aa39e]", soon: "bg-transparent ring-1 ring-[#c3cac5]" };
export function DeviceList({ w, as, devices }: { w: string; as: string; devices: MeData["devices"] }) {
  const [manage, setManage] = useState<string | null>(null);
  const [connected, setConnected] = useState<Record<string, boolean>>({});
  return (
    <>
      <p className="px-1 text-[15px]">Your clinic uses this data to know when a little company might do you good. You and your mentor won&apos;t see any numbers.</p>
      <p className="mt-2 px-1"><span className="rv-chip bg-[#f1ede4] text-[#6b5a2e]">Simulated data</span></p>
      <div className="rv-card mt-3 divide-y divide-rv-line">
        {devices.rows.map((d) => {
          const isOn = connected[d.id];
          const status = isOn ? "connected" : d.status;
          return (
            <div key={d.id} className="p-4">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-rv-bg text-rv-ink"><Icon name={d.icon === "home" ? "house" : d.icon} /></span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold leading-tight">{d.name}{d.via && <span className="rv-muted font-normal"> {d.via}</span>}</p>
                  <p className="rv-muted text-[13px]">{d.detail}</p>
                  <p className="mt-1 flex items-center gap-1.5 text-[13px] font-semibold">
                    <span className={`h-2 w-2 rounded-full ${DOT[status]}`} aria-hidden />
                    {isOn ? "Connected" : d.statusText}
                    {(isOn || d.sync) && <span className="rv-muted font-normal">· {isOn ? "Last sync: just now" : d.sync}</span>}
                  </p>
                  {d.help && !isOn && <p className="mt-0.5 text-[13px] text-rv-l1">{d.help}</p>}
                </div>
                {d.status === "connected" || isOn ? (
                  <button onClick={() => setManage(manage === d.id ? null : d.id)} className="rv-btn rv-btn-secondary rv-btn-sm" aria-expanded={manage === d.id}>Manage</button>
                ) : d.status === "permission" ? (
                  <button onClick={() => setManage(d.id)} className="rv-btn rv-btn-secondary rv-btn-sm">Turn on</button>
                ) : d.status === "none" ? (
                  // MOCK: en la web de la demo no hay conexión real con Salud ni Health Connect
                  <button onClick={() => setConnected((c) => ({ ...c, [d.id]: true }))} className="rv-btn rv-btn-secondary rv-btn-sm">Connect</button>
                ) : d.status === "stale" ? (
                  <button onClick={() => setManage(manage === d.id ? null : d.id)} className="rv-btn rv-btn-secondary rv-btn-sm">Manage</button>
                ) : null}
              </div>
              {manage === d.id && (
                <div className="mt-3 rounded-2xl bg-rv-bg p-1">
                  {devices.types.map((t) => (
                    <label key={t.key} className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5">
                      <span className="min-w-0 flex-1">
                        <span className="block text-[14px] font-semibold">{t.label}</span>
                        <span className="rv-muted block text-[12.5px]">{t.purpose}</span>
                      </span>
                      <Toggle on={t.on} onChange={(v) => act(w, as, "datatype", { key: t.key, on: v })} label={t.label} />
                    </label>
                  ))}
                  <p className="rv-muted px-3 pb-2 pt-1 text-[12px]">Turning one off doesn&apos;t break anything: your clinic sees “data not available”.</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <p className="rv-muted mt-2 px-1 text-[12.5px]">Data is processed on your phone and only daily summaries are sent to your clinic. The ring&apos;s own app will still show its numbers; Relevo can&apos;t change that.</p>
    </>
  );
}
export function Toggle({ on, onChange, label, disabled }: { on: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} disabled={disabled} onClick={(e) => { e.preventDefault(); onChange(!on); }} className={`relative h-7 w-12 shrink-0 rounded-full transition-colors disabled:opacity-40 ${on ? "bg-rv-teal" : "bg-[#77827d]"}`}>
      <span className={`absolute left-0 top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${on ? "translate-x-[22px]" : "translate-x-0.5"}`} />
    </button>
  );
}
export const CONSENT_TEXT = {
  data: "Share daily summaries of activity, sleep and phone use with my clinic",
  notes: "Automatically analyse the text of my voice notes to alert my clinic if it looks like I need urgent help",
  ideas: "Let my mentor receive ideas to accompany me, drafted with the help of AI (they never see my data or the analysis of my notes)",
};
export function DataRights({ w, as, requests, leaveLabel }: { w: string; as: string; requests: { kind: string; when: string }[]; leaveLabel: string }) {
  const [asked, setAsked] = useState<string | null>(null);
  const did = (k: string) => asked === k || requests.some((r) => r.kind === k);
  return (
    <div className="mt-6 flex flex-col items-center gap-1.5 pb-4 text-center">
      {/* Discreto, abajo: los datos se piden a la clínica (decisión del equipo) */}
      {did("download") ? <p className="rv-muted text-[12.5px]">Requested. Your clinic will send you a copy of your data.</p> : (
        <button onClick={async () => { await act(w, as, "request", { kind: "download" }); setAsked("download"); }} className="rv-muted text-[12.5px] underline underline-offset-4">Request a copy of my data from the clinic</button>
      )}
      {did("delete") ? <p className="rv-muted text-[12.5px]">Deletion requested. Your clinic will confirm it.</p> : (
        <button onClick={async () => { if (confirm("Ask your clinic to delete all your data? This can't be undone.")) { await act(w, as, "request", { kind: "delete" }); setAsked("delete"); } }} className="rv-muted text-[12.5px] underline underline-offset-4">Delete my data</button>
      )}
      <button onClick={() => alert("Your clinic will contact you to close your participation calmly.")} className="rv-muted text-[12.5px] underline underline-offset-4">{leaveLabel}</button>
    </div>
  );
}
function Devices({ w, as, data }: { w: string; as: string; data: MeData }) {
  return (
    <div className="px-4 pb-6 pt-1">
      <DeviceList w={w} as={as} devices={data.devices} />
      <h3 className="mt-6 px-1 text-[17px]">What you agreed to</h3>
      <div className="rv-card mt-2 divide-y divide-rv-line">
        {(["data", "notes", "ideas"] as const).map((k) => (
          <label key={k} className="flex items-center gap-3 p-4">
            <span className="flex-1 text-[14px] leading-snug">{CONSENT_TEXT[k]}</span>
            <Toggle on={data.consents[k]} onChange={(v) => act(w, as, "consent", { key: k, on: v })} label={CONSENT_TEXT[k]} />
          </label>
        ))}
      </div>
      <p className="rv-muted mt-2 px-1 text-[12.5px]">Without the first one Relevo still works for notes and plans, just without notices based on data.</p>
      <DataRights w={w} as={as} requests={data.requests} leaveLabel="Leave Relevo" />
    </div>
  );
}

/* ---------- A0 · Bienvenida y consentimientos (una sola vez) ---------- */
function Welcome({ w, as, data, player }: { w: string; as: string; data: MeData; player: ReturnType<typeof usePlayer> }) {
  const [step, setStep] = useState(0);
  const [c, setC] = useState({ data: false, notes: false, ideas: false });
  const [more, setMore] = useState(false);
  const m = data.mentor?.name;
  const finish = () => act(w, as, "onboard", c);
  return (
    <div className="flex min-h-0 flex-1 flex-col px-6 pb-6">
      <div className="flex gap-1.5 pb-6 pt-3" aria-label={`Step ${step + 1} of 4`}>
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className={`h-1 flex-1 rounded-full transition-colors ${i <= step ? "bg-rv-teal" : "bg-[#d5dbd6]"}`} />
        ))}
      </div>
      <div className="rv-scroll min-h-0 flex-1 overflow-y-auto">
        {step === 0 && (
          <div className="rv-in">
            <Chain a={m ?? "?"} b={data.me.name} />
            <h1 className="mt-8 text-[30px] leading-[1.1]">Someone who&apos;s been here before will walk with you</h1>
            <p className="rv-muted mt-3 text-[16px]">
              {m ? `${m} finished TMS a few months ago. ${m} will write to you now and then and suggest simple plans. You don't have to do anything.` : "We're finding someone who finished TMS a few months ago. They'll write to you now and then and suggest simple plans. You don't have to do anything."}
            </p>
          </div>
        )}
        {step === 1 && (
          <div className="rv-in flex flex-col items-center pt-6 text-center">
            <Avatar name={m ?? "?"} size={104} ring />
            <h1 className="mt-5 text-[28px]">{m ?? "Your mentor"}</h1>
            {data.mentor?.story && <p className="rv-muted mt-1 max-w-[28ch]">{data.mentor.story}</p>}
            {data.intro ? (
              <>
                <div className="rv-card mt-6 w-full p-3 text-left"><VoiceNote note={data.intro} player={player} /></div>
                <button onClick={() => player.play(data.intro!)} className="rv-btn rv-btn-secondary rv-btn-lg mt-4 w-full"><Icon name="play" filled size={16} />Listen to {m}</button>
              </>
            ) : (
              <p className="rv-muted mt-6">{m ? `${m} will record a short hello for you soon.` : "We'll introduce you as soon as we find the right person."}</p>
            )}
          </div>
        )}
        {step === 2 && (
          <div className="rv-in">
            <h1 className="text-[26px] leading-tight">What you agree to</h1>
            <p className="rv-muted mt-1">Each one is separate. You can change them any time.</p>
            <div className="rv-card mt-5 divide-y divide-rv-line">
              {(["data", "notes", "ideas"] as const).map((k) => (
                <label key={k} className="flex items-center gap-3 p-4">
                  <span className="flex-1 text-[14.5px] leading-snug">
                    {CONSENT_TEXT[k]}
                    {k === "data" && <span className="rv-muted block text-[12.5px]">Needed for the notices</span>}
                  </span>
                  <Toggle on={c[k]} onChange={(v) => setC((x) => ({ ...x, [k]: v }))} label={CONSENT_TEXT[k]} />
                </label>
              ))}
            </div>
            <button onClick={() => setMore((x) => !x)} className="mt-3 text-[14px] font-semibold text-rv-teal underline underline-offset-4" aria-expanded={more}>
              What&apos;s stored and how to delete it
            </button>
            {more && (
              <p className="rv-muted mt-2 text-[13.5px]">
                Your phone turns raw data into daily summaries; only those reach your clinic. Your voice notes are transcribed on your phone, and names are replaced before the text leaves it. Audio is deleted after 30 days. You can ask your clinic for a copy of everything, or to delete it, from “Devices and privacy”.
              </p>
            )}
          </div>
        )}
        {step === 3 && (
          <div className="rv-in">
            <h1 className="text-[26px] leading-tight">Your devices</h1>
            <div className="mt-4"><DeviceList w={w} as={as} devices={data.devices} /></div>
          </div>
        )}
      </div>
      <div className="pt-4">
        {step === 2 ? (
          <button disabled={!c.data} onClick={() => setStep(3)} className="rv-btn rv-btn-primary rv-btn-lg w-full">Accept and continue</button>
        ) : step === 3 ? (
          <div className="flex flex-col gap-2">
            <button onClick={finish} className="rv-btn rv-btn-primary rv-btn-lg w-full">Done</button>
            <button onClick={finish} className="rv-btn rv-btn-ghost w-full">Not now, the phone is enough</button>
          </div>
        ) : (
          <button onClick={() => setStep(step + 1)} className="rv-btn rv-btn-primary rv-btn-lg w-full">Next</button>
        )}
        {step === 2 && <p className="rv-muted mt-3 text-center text-[12px]">Relevo is for adults over 18. It doesn&apos;t replace your treatment.</p>}
      </div>
    </div>
  );
}

/** La cadena: dos (o tres) avatares unidos por flechas. */
export function Chain({ a, b, c, labels }: { a: string; b: string; c?: string; labels?: string[] }) {
  const people = [a, b, ...(c ? [c] : [])];
  return (
    <div className="flex items-start justify-center gap-1">
      {people.map((p, i) => (
        <div key={i} className="flex items-start">
          <div className="flex w-[84px] flex-col items-center text-center">
            <Avatar name={p} size={i === 1 && c ? 60 : 52} ring={i === 1 && !!c} />
            {labels?.[i] && <span className={`mt-2 text-[12.5px] leading-tight ${i === 1 && c ? "font-semibold" : "rv-muted"}`}>{revealNames(labels[i])}</span>}
          </div>
          {i < people.length - 1 && (
            <svg width="28" height="52" viewBox="0 0 28 52" className="text-rv-teal" aria-hidden>
              <path d="M3 26h20M17 20l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </div>
      ))}
    </div>
  );
}
