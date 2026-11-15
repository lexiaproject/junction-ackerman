"use client";
// App del mentor (Pablo, y Marta como mentora de Pablo): como mucho una acción al día, y protege al mentor
// tanto como al acompañado. Nunca ve datos ni niveles de nadie, tampoco los suyos.
import { useCallback, useEffect, useState } from "react";
import { Avatar, ChatComposer, Icon, Recorder, Sheet, TextNote, VoiceNote, act, useLocalHelp, usePlayer, useView, type NoteV } from "./kit";
import { PROFILE, inCommon } from "@/lib/relevo/profiles";
import { Milestones, PersonCard, type Together } from "./People";
import { CompanionGuide, TrainingCards, WorriedButton, WorriedSheet } from "./Companion";
import { CONSENT_TEXT, Chain, DataRights, DeviceList, HelpSheet, Toggle, ics, type MeData } from "./MenteeApp";

type Card = { id: string; menteeName: string; kind: string; question: string | null; title: string; reason: string; message: string; aiDrafted: boolean; icon: string; prepared: boolean };
type Self = { id: string; code: string; text: string; buttons: { id: string; label: string }[]; from: string | null; noteId: string | null };
export type MentorData = {
  clock: { time: string; date: string; short: string; t: number };
  me: { id: string; name: string };
  greeting: string;
  m0: { menteeId: string; menteeName: string; percent: number; reasons: string[] } | null;
  together: Together | null;
  self: Self[];
  mentorNote: NoteV | null;
  m5: { variant: "pause" | "light"; mentorName: string | null; menteeName: string | null } | null;
  m6: { menteeName: string } | null;
  m6After: { menteeName: string } | null;
  card: Card | null;
  sent: { menteeName: string } | null;
  plan: { id: string; title: string; when: string; whenT: number; icon: string; menteeName: string; status: string } | null;
  mentee: { id: string; name: string } | null;
  menteeQuiet: { until: string } | null;
  kind: { menteeName: string; text: string; detail: string | null } | null;
  myMentor: { id: string; name: string } | null;
  conversations: { mentee: NoteV[]; mentor: NoteV[] };
  copilot: { id: string; text: string; example: string } | null;
  rhythm: { value: number; label: string; paused: boolean; reviewing: boolean };
  devices: MeData["devices"];
  consents: MeData["consents"];
  left: boolean;
  requests: { kind: string; when: string }[];
};

const TABS = [
  { id: "today", label: "Today", icon: "today" },
  { id: "chat", label: "Conversation", icon: "chat" },
  { id: "relay", label: "My relay", icon: "chain" },
  { id: "settings", label: "Settings", icon: "settings" },
] as const;
type Tab = (typeof TABS)[number]["id"];

export default function MentorApp({ w, as, resetKey }: { w: string; as: "pablo" | "marta"; resetKey?: number }) {
  const { data } = useView<MentorData>(`/api/relevo/mentor?w=${w}&as=${as}`);
  const player = usePlayer(w);
  const [tab, setTab] = useState<Tab>("today");
  const [thread, setThread] = useState<"mentee" | "mentor">("mentee");
  const [help, setHelp] = useState(false);
  const openHelp = useCallback(() => setHelp(true), []);
  useLocalHelp(as, openHelp); // K-15: si el propio mentor escribe una frase de la lista fija, su móvil le abre la ayuda
  const [ideasOpen, setIdeasOpen] = useState(false);
  const [worriedOpen, setWorriedOpen] = useState(false);
  const [compose, setCompose] = useState<{ to: string; toName: string; script?: string; cardId?: string; kind?: string; title: string } | null>(null);
  const [m5Open, setM5Open] = useState(true);
  // La demo cambia resetKey al pasar de momento: el teléfono vuelve a Today y se cierran las hojas abiertas
  // (así no se puede enviar dos veces la nota del paseo con una hoja que se quedó abierta)
  const [seenKey, setSeenKey] = useState(resetKey);
  if (seenKey !== resetKey) {
    setSeenKey(resetKey);
    setTab("today");
    setThread("mentee");
    setCompose(null);
    setHelp(false);
    setIdeasOpen(false);
    setWorriedOpen(false);
  }
  if (!data) return <div className="flex flex-1 items-center justify-center rv-muted">Loading…</div>;
  const mentee = data.mentee;
  const mine = data.myMentor;
  const go = (t: Tab, th?: "mentee" | "mentor") => {
    setTab(t);
    if (th) setThread(th);
    document.getElementById(`rv-scroll-${as}`)?.scrollTo({ top: 0 });
  };

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <header className="flex shrink-0 items-start justify-between px-5 pb-2 pt-1">
        <div>
          <p className="rv-muted text-[13px]">{data.clock.date}</p>
          <h1 className="text-[24px] leading-tight">{tab === "today" ? data.greeting : TABS.find((t) => t.id === tab)!.label}</h1>
        </div>
        <div className="flex items-center gap-2 pt-1">
          <Avatar name={data.me.name} size={34} />
          <button onClick={() => setHelp(true)} className="rv-btn rv-btn-help gap-1.5">
            <Icon name="heart" size={16} />
            Help
          </button>
        </div>
      </header>

      <div id={`rv-scroll-${as}`} className="rv-scroll min-h-0 flex-1 overflow-y-auto">
        {tab === "today" && (
          <Today w={w} as={as} data={data} player={player} onCompose={setCompose} onTab={go} onM5={() => setM5Open(true)} />
        )}
        {tab === "chat" && (
          <div className="flex min-h-full flex-col">
            {mine && mentee && (
              <div className="mx-4 mb-2 flex rounded-full bg-white p-1 shadow-[0_0_0_1px_var(--color-rv-line)]" role="tablist">
                {(["mentee", "mentor"] as const).map((k) => (
                  <button key={k} role="tab" aria-selected={thread === k} onClick={() => setThread(k)} className={`flex-1 rounded-full py-2 text-[14px] font-semibold transition-colors ${thread === k ? "bg-rv-teal text-white" : "text-rv-ink2"}`}>
                    {k === "mentee" ? mentee.name : mine.name}
                  </button>
                ))}
              </div>
            )}
            {(() => {
              const other = thread === "mentor" || !mentee ? mine : mentee;
              if (!other) return <p className="rv-muted px-6 py-10 text-center">You&apos;re not accompanying anyone yet.</p>;
              const notes = thread === "mentor" || !mentee ? data.conversations.mentor : data.conversations.mentee;
              return (
                <>
                  <div className="flex flex-1 flex-col gap-2.5 px-4 pb-4 pt-1">
                    {/* Copiloto: solo lo ve el mentor; no resume ni enseña el análisis de las notas */}
                    {thread === "mentee" && data.copilot && (
                      <div className="rv-notice rv-in p-4">
                        <p className="flex items-center gap-1.5 text-[12.5px] font-semibold"><Icon name="lock" size={14} />Only you see this</p>
                        <p className="mt-1.5 text-[15px] leading-snug">{data.copilot.text}</p>
                        <p className="mt-2 rounded-2xl bg-white/70 px-3 py-2 text-[14px] italic">“{data.copilot.example}”</p>
                        <div className="mt-3 flex gap-2">
                          <button className="rv-btn rv-btn-notice flex-1" onClick={async () => { await act(w, as, "copilot", { id: data.copilot!.id, choice: "use" }); setCompose({ to: other.id, toName: other.name, script: data.copilot!.example, title: `Note to ${other.name}` }); }}>Use idea</button>
                          <button className="rv-btn rv-btn-ghost text-rv-notice-ink" onClick={() => act(w, as, "copilot", { id: data.copilot!.id, choice: "dismiss" })}>Dismiss</button>
                        </div>
                      </div>
                    )}
                    {notes.length === 0 && <p className="rv-muted py-8 text-center">No notes yet.</p>}
                    {/* "Thanks" solo hacia arriba en la cadena (a las notas de su propio mentor) */}
                    {notes.map((n) => <VoiceNote key={n.id} note={n} player={player} bubble onThanks={other === mine ? () => act(w, as, "thanks", { noteId: n.id }).catch(() => {}) : undefined} />)}
                  </div>
                  <div className="sticky bottom-0 border-t border-rv-line bg-rv-bg/95 px-4 pb-4 pt-3 backdrop-blur">
                    {/* Solo para mentores: ideas de respuesta privadas, basadas en técnicas de apoyo entre iguales */}
                    {thread === "mentee" && mentee && (
                      <button className="rv-btn rv-btn-secondary rv-btn-sm mb-1.5 w-full gap-1.5" onClick={() => setIdeasOpen(true)}>
                        <Icon name="bulb" size={16} className="text-rv-teal" />Not sure what to say? Get reply ideas
                      </button>
                    )}
                    {thread === "mentee" && mentee && <WorriedButton mentee={mentee.name} onClick={() => setWorriedOpen(true)} />}
                    <ChatComposer w={w} as={as} to={other.id} toName={other.name} />
                  </div>
                </>
              );
            })()}
          </div>
        )}
        {tab === "relay" && <Relay w={w} as={as} data={data} player={player} onTalk={() => go("chat", "mentor")} onWorried={() => setWorriedOpen(true)} />}
        {tab === "settings" && (
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
            <h3 className="mt-6 px-1 text-[17px]">Notice hours</h3>
            <div className="rv-card mt-2 flex items-center justify-between p-4">
              <span>Between</span>
              <span className="rv-num font-semibold">08:30 – 21:00</span>
            </div>
            <p className="rv-muted mt-2 px-1 text-[12.5px]">At most one notification a day. Help is always available, whatever the time.</p>
            <DataRights w={w} as={as} requests={data.requests} leaveLabel="Stop being a mentor" />
          </div>
        )}
      </div>

      <nav className="grid shrink-0 grid-cols-4 border-t border-rv-line bg-white/95 pb-3 pt-1.5 backdrop-blur" aria-label="Main">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => go(t.id)} aria-current={tab === t.id ? "page" : undefined} className={`flex min-h-[48px] flex-col items-center justify-center gap-0.5 text-[11px] font-semibold ${tab === t.id ? "text-rv-teal" : "text-[#7c8883]"}`}>
            <Icon name={t.icon} size={22} />
            {t.label}
          </button>
        ))}
      </nav>

      {data.m0 && <M0 w={w} as={as} me={data.me.name} m0={data.m0} />}
      {data.m5 && m5Open && !data.m0 && <M5 w={w} as={as} m5={data.m5} onLater={() => setM5Open(false)} />}
      {help && <HelpSheet w={w} as={as} mentorName={mine?.name ?? null} clinic={{ phone: "+358 9 4512 3300" }} onClose={() => setHelp(false)} />}
      {worriedOpen && mentee && <WorriedSheet w={w} as={as} mentee={mentee.name} onClose={() => setWorriedOpen(false)} />}
      {ideasOpen && mentee && (
        <ReplyIdeas
          w={w}
          as={as}
          menteeName={mentee.name}
          mentorOfMe={mine?.name ?? null}
          onClose={() => setIdeasOpen(false)}
          onUse={(message) => {
            setIdeasOpen(false);
            setCompose({ to: mentee.id, toName: mentee.name, script: message, title: `Note to ${mentee.name}` });
          }}
          onHelp={() => {
            setIdeasOpen(false);
            setHelp(true);
          }}
        />
      )}
      {compose && (
        <Sheet onClose={() => setCompose(null)} label={compose.title}>
          <h2 className="text-[22px]">{compose.title}</h2>
          {compose.script !== undefined && (
            <div className="mt-3 rounded-2xl bg-rv-sage p-4">
              <p className="text-[12px] font-semibold text-rv-teal">Your script</p>
              <p className="mt-1 text-[16px] leading-snug">{compose.script}</p>
            </div>
          )}
          <div className="mt-5">
            <Recorder w={w} as={as} to={compose.to} toName={compose.toName} script={compose.script} cardId={compose.cardId} kind={compose.kind} label="Hold to record" onSent={() => setTimeout(() => setCompose(null), 1500)} />
          </div>
          <div className="mt-2">
            <TextNote key={compose.script} w={w} as={as} to={compose.to} toName={compose.toName} initial={compose.script ?? ""} cardId={compose.cardId} kind={compose.kind} onSent={() => setCompose(null)} />
          </div>
        </Sheet>
      )}
    </div>
  );
}

/* ---------- M1 · Hoy ---------- */
function Today({ w, as, data, player, onCompose, onTab, onM5 }: { w: string; as: string; data: MentorData; player: ReturnType<typeof usePlayer>; onCompose: (c: { to: string; toName: string; script?: string; cardId?: string; kind?: string; title: string }) => void; onTab: (t: Tab, th?: "mentee" | "mentor") => void; onM5: () => void }) {
  const [msg, setMsg] = useState<Record<string, string>>({});
  const mentee = data.mentee;
  const card = data.card;
  const mine = data.myMentor;
  const recentMentorNote = data.mentorNote;
  const showMentorNote = recentMentorNote && !data.self.some((s) => s.code === "V5") && /today|yesterday|min ago|just now/.test(recentMentorNote.when);
  const nothing = !card && !data.plan && !data.m6 && !data.sent && !data.copilot && !data.kind && !data.m6After;
  return (
    <div className="flex flex-col gap-3 px-4 pb-6 pt-1">
      {/* Avisos para sí mismo */}
      {data.self.map((s) => (
        <div key={s.id} className="rv-notice rv-in p-4">
          <div className="flex items-start gap-3">
            {s.from && <Avatar name={s.from} size={38} />}
            <p className="pt-1.5 text-[16px] font-semibold leading-snug">{s.text}</p>
          </div>
          <div className="mt-3 flex gap-2">
            {s.buttons.map((b, i) => (
              <button
                key={b.id}
                className={`rv-btn ${i === 0 ? "rv-btn-notice flex-1" : "rv-btn-ghost text-rv-notice-ink"}`}
                onClick={async () => {
                  await act(w, as, "notice", { noticeId: s.id, choice: b.id }).catch(() => {});
                  if (b.id === "listen" && s.noteId && data.mentorNote) player.play(data.mentorNote);
                  if (b.id === "note") onTab("chat", s.code === "HELP" ? "mentee" : "mentor");
                }}
              >
                {b.label}
              </button>
            ))}
          </div>
        </div>
      ))}
      {showMentorNote && mine && (
        <div className="rv-card p-3">
          <p className="px-1 pb-1 font-semibold">{mine.name} left you a note</p>
          <VoiceNote note={recentMentorNote!} player={player} onThanks={() => act(w, as, "thanks", { noteId: recentMentorNote!.id }).catch(() => {})} />
        </div>
      )}
      {data.m5 && (
        <button onClick={onM5} className="rv-card flex items-center gap-3 p-4 text-left">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-rv-sage text-rv-teal"><Icon name="sun" /></span>
          <span className="flex-1 font-semibold">{data.m5.variant === "pause" ? "A few days for you" : "This week, a lighter pace"}</span>
          <Icon name="chevron" className="text-rv-ink2" />
        </button>
      )}

      {/* M6 · La clínica se ocupa */}
      {/* Pausa suave pedida por la persona acompañada: solo se ve que se toma un respiro, nunca por qué */}
      {data.menteeQuiet && mentee && (
        <div className="rv-card rv-in flex items-start gap-3 p-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rv-sage text-rv-teal"><Icon name="moon" size={20} /></span>
          <p className="text-[15px] leading-snug"><span className="font-semibold">{mentee.name} is taking a breather until {data.menteeQuiet.until}.</span> No need to write. If you want, one short note is fine.</p>
        </div>
      )}

      {data.m6 && (
        <div className="rv-card rv-in p-5">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-rv-sage text-rv-teal"><Icon name="shield" /></span>
          <p className="mt-3 text-[17px] font-semibold leading-snug">Anna, {data.m6.menteeName}&apos;s nurse, and the clinic team have been told. You don&apos;t need to do anything else.</p>
          {mine && <button onClick={() => onTab("chat", "mentor")} className="rv-btn rv-btn-secondary mt-4 w-full">Talk to {mine.name}</button>}
        </div>
      )}

      {/* Cierre tras la crisis: que el mentor no se quede con la preocupación sin saber cómo acaba */}
      {data.m6After && mentee && (
        <div className="rv-card rv-in p-5">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-rv-sage text-rv-teal"><Icon name="shield" /></span>
          <p className="mt-3 text-[17px] font-semibold leading-snug">Anna&apos;s team is with {data.m6After.menteeName} now. Thank you for being there.</p>
          <p className="rv-muted mt-1">When you feel ready, a short note is welcome. No need to mention what happened.</p>
          <button className="rv-btn rv-btn-secondary mt-4 w-full" onClick={() => onTab("chat", "mentee")}><Icon name="mic" size={18} />Note to {mentee.name}</button>
        </div>
      )}

      {/* Tarjeta de la idea del día (máximo una) */}
      {card && mentee && (
        <div className="rv-card rv-in overflow-hidden">
          <div className="flex items-center gap-2 px-4 pt-4">
            <Avatar name={card.menteeName} size={26} />
            <p className="rv-muted text-[13px] font-semibold">Idea for today · {card.menteeName}</p>
          </div>
          {card.question ? (
            <div className="p-4 pt-3">
              <p className="text-[20px] font-semibold leading-snug" style={{ fontFamily: "var(--rv-display)" }}>{card.question}</p>
              <div className="mt-4 flex gap-2">
                <button className="rv-btn rv-btn-primary rv-btn-lg flex-1" onClick={() => act(w, as, "v1_answer", { choice: "yes" })}>Yes</button>
                <button className="rv-btn rv-btn-secondary rv-btn-lg" onClick={() => act(w, as, "v1_answer", { choice: "cant" })}>Can&apos;t today</button>
              </div>
              <p className="rv-muted mt-3 text-[12.5px]">Only if you say yes will {card.menteeName} read that you&apos;d like to talk.</p>
            </div>
          ) : (
            <div className="p-4 pt-2">
              <h2 className="text-[20px] leading-snug">{card.title}</h2>
              <p className="rv-muted mt-1 text-[14.5px]">{card.reason}</p>
              <div className="mt-3 rounded-2xl bg-rv-sage p-3">
                <textarea
                  aria-label="Suggested message"
                  className="min-h-[64px] w-full resize-none bg-transparent text-[15px] leading-snug outline-none"
                  value={msg[card.id + card.title] ?? card.message}
                  onChange={(e) => setMsg((m) => ({ ...m, [card.id + card.title]: e.target.value }))}
                />
                <p className="text-[11.5px] font-semibold text-rv-teal">{card.aiDrafted ? "Suggested with AI · you can change it" : "Suggested · you can change it"}</p>
              </div>
              <button className="rv-btn rv-btn-primary rv-btn-lg mt-3 w-full" onClick={() => onCompose({ to: mentee.id, toName: mentee.name, script: msg[card.id + card.title] ?? card.message, cardId: card.id, title: `Voice note to ${mentee.name}` })}>
                <Icon name="mic" size={18} />Send as voice note
              </button>
              <div className="mt-2 flex gap-2">
                {card.kind === "idea" && <button className="rv-btn rv-btn-secondary flex-1" onClick={() => act(w, as, "idea", { cardId: card.id, action: "other" })}>Another idea</button>}
                <button className="rv-btn rv-btn-ghost flex-1" onClick={() => act(w, as, "idea", { cardId: card.id, action: "not_now" })}>Not now</button>
              </div>
            </div>
          )}
        </div>
      )}

      {data.sent && (
        <div className="rv-card flex items-center gap-3 p-4">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-rv-sage text-rv-teal"><Icon name="check" /></span>
          <p className="font-semibold">Sent. {data.sent.menteeName} will hear it whenever it suits.</p>
        </div>
      )}

      {/* Lo que le llega de vuelta de la persona que acompaña (un "Good" tras un plan): que sepa que su ayuda sirve */}
      {data.kind && (
        <div className="rv-card rv-in flex items-center gap-3 p-4">
          <Avatar name={data.kind.menteeName} size={40} />
          <div className="min-w-0 flex-1">
            <p className="font-semibold leading-snug">{data.kind.text}</p>
            {data.kind.detail && <p className="rv-muted text-[13.5px]">{data.kind.detail.replace(/^./, (c) => c.toUpperCase())}</p>}
          </div>
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-rv-sage text-rv-teal"><Icon name="heart" size={18} /></span>
        </div>
      )}

      {/* Plan en marcha */}
      {data.plan && (
        <div className="rv-card p-4">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-rv-sage text-rv-teal"><Icon name={data.plan.icon === "basket" ? "basket" : data.plan.icon} size={22} /></span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold leading-tight">{data.plan.title.replace(/^\d+-minute /, "").replace(/^./, (c) => c.toUpperCase())} with {data.plan.menteeName}</p>
              <p className="rv-muted text-[13.5px]">
                {data.plan.when} ·{" "}
                {data.plan.status === "accepted" ? `${data.plan.menteeName} is in` : data.plan.status === "change_requested" ? `${data.plan.menteeName} asked for another time` : data.plan.status === "cant" || data.plan.status === "other_day" ? `${data.plan.menteeName} can't this time` : `waiting for ${data.plan.menteeName}`}
              </p>
            </div>
          </div>
          {data.plan.status === "accepted" && (
            <a href={ics({ id: data.plan.id, title: `${data.plan.title} with ${data.plan.menteeName}`, whenT: data.plan.whenT })} download="relevo-plan.ics" className="rv-btn rv-btn-secondary rv-btn-sm mt-3">
              <Icon name="calendar" size={16} />Add to calendar
            </a>
          )}
        </div>
      )}

      {/* Copiloto visible en Today: solo el aviso privado, sin análisis; la sugerencia está en Conversation */}
      {data.copilot && !data.m6 && mentee && (
        <div className="rv-notice rv-in p-4">
          <p className="flex items-center gap-1.5 text-[12.5px] font-semibold"><Icon name="lock" size={14} />Only you see this</p>
          <p className="mt-1.5 text-[16px] font-semibold leading-snug">A private idea for your next note to {mentee.name}</p>
          <button className="rv-btn rv-btn-notice mt-3 w-full" onClick={() => onTab("chat", "mentee")}>Open</button>
        </div>
      )}

      {nothing && mentee && (
        <div className="rv-card p-5 text-center">
          <p className="text-[16px] font-semibold">Nothing pending today.</p>
          <p className="rv-muted mt-1">If you feel like it, send {mentee.name} a note.</p>
          <button className="rv-btn rv-btn-secondary mt-4" onClick={() => onTab("chat", "mentee")}><Icon name="mic" size={18} />Note to {mentee.name}</button>
        </div>
      )}
      {!mentee && !data.m0 && (
        <div className="rv-card p-5 text-center">
          <p className="text-[16px] font-semibold">You&apos;re not accompanying anyone right now.</p>
          <p className="rv-muted mt-1">Your clinic will propose someone when it&apos;s a good moment for you.</p>
        </div>
      )}
    </div>
  );
}

/* ---------- M3 · Mi relevo ---------- */
function Relay({ w, as, data, player, onTalk, onWorried }: { w: string; as: string; data: MentorData; player: ReturnType<typeof usePlayer>; onTalk: () => void; onWorried: () => void }) {
  const mine = data.myMentor;
  const mentee = data.mentee;
  const PACE = [
    { v: 1, label: "Light", detail: "One note a week" },
    { v: 2, label: "Normal", detail: "Almost daily, with ideas" },
    { v: 3, label: "Intense", detail: "Frequent plans" },
  ];
  return (
    <div className="flex flex-col gap-3 px-4 pb-6 pt-2">
      <div className="rv-card px-2 py-6">
        <Chain a={mine?.name ?? "Clinic"} b={data.me.name} c={mentee?.name ?? "…"} labels={[mine ? `${mine.name} walks with you` : "Your clinic supports you", "You", mentee ? `You walk with ${mentee.name}` : "Someone soon"]} />
      </div>
      {mentee && (
        <PersonCard name={mentee.name} role={`You walk with ${mentee.name}`} me={data.me.name}>
          {data.together && <div className="mt-3"><Milestones together={data.together} other={mentee.name} /></div>}
        </PersonCard>
      )}
      {mine && (
        <PersonCard name={mine.name} role="Walks with you" me={data.me.name}>
          {data.mentorNote ? <div className="mt-3"><VoiceNote note={data.mentorNote} player={player} onThanks={() => act(w, as, "thanks", { noteId: data.mentorNote!.id }).catch(() => {})} /></div> : <p className="rv-muted mt-3">{mine.name} will write to you soon.</p>}
          <button className="rv-btn rv-btn-secondary mt-3 w-full" onClick={onTalk}><Icon name="chat" size={18} />Talk to {mine.name}</button>
        </PersonCard>
      )}
      <div className="rv-card p-4">
        <p className="text-[17px] font-semibold">Your pace</p>
        {data.rhythm.paused ? (
          <>
            <p className="mt-2 flex items-center gap-2"><span className="rv-chip bg-rv-sage text-rv-teal">On pause</span><span className="rv-muted text-[13.5px]">{mentee ? `${mentee.name} is looked after by the team.` : ""}</span></p>
            <button className="rv-btn rv-btn-primary mt-4 w-full" onClick={() => act(w, as, "rhythm", { rhythm: 1, source: "m3" })}>Come back whenever you like</button>
          </>
        ) : (
          <>
            <div className="mt-3 flex flex-col gap-2" role="radiogroup" aria-label="Your pace">
              {PACE.map((p) => (
                <button key={p.v} role="radio" aria-checked={data.rhythm.value === p.v} onClick={() => act(w, as, "rhythm", { rhythm: p.v, source: "m3" })} className={`flex min-h-[52px] items-center justify-between rounded-2xl px-4 text-left transition-colors ${data.rhythm.value === p.v ? "bg-rv-teal text-white" : "bg-rv-bg"}`}>
                  <span className="font-semibold">{p.label}</span>
                  <span className={`text-[13px] ${data.rhythm.value === p.v ? "text-white/85" : "rv-muted"}`}>{p.detail}</span>
                </button>
              ))}
            </div>
            <p className="rv-muted mt-2 text-[12.5px]">Relevo may suggest a change; you decide.</p>
            <button className="rv-btn rv-btn-ghost mt-2 w-full" onClick={() => act(w, as, "rhythm", { rhythm: 0, source: "m3" })}>Take a pause</button>
            <p className="rv-muted text-center text-[12px]">Your clinic will know. No reason needed.</p>
          </>
        )}
      </div>
      <CompanionGuide mentee={mentee?.name ?? null} onWorried={onWorried} />
    </div>
  );
}

/* ---------- M0 · Invitación y emparejamiento ---------- */
function M0({ w, as, me, m0 }: { w: string; as: string; me: string; m0: NonNullable<MentorData["m0"]> }) {
  const [step, setStep] = useState<"invite" | "role" | "train" | "meet">("invite");
  return (
    <div className="absolute inset-0 z-30 flex flex-col bg-rv-bg px-6 pb-7 pt-4">
      {step === "invite" ? (
        <div className="rv-in flex flex-1 flex-col">
          <div className="flex-1 pt-10">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-rv-sage text-rv-teal"><Icon name="chain" size={28} /></span>
            <h1 className="mt-6 text-[30px] leading-[1.1]">We&apos;d like to invite you to accompany someone in Relevo</h1>
            <p className="rv-muted mt-3 text-[16px]">Someone who&apos;s just finished TMS, like you did a few months ago. You&apos;d be a companion, not a guide. It can help you too, and you can say no or stop whenever you like.</p>
          </div>
          <button className="rv-btn rv-btn-primary rv-btn-lg w-full" onClick={() => setStep("role")}>I&apos;m interested</button>
          <button className="rv-btn rv-btn-ghost mt-2 w-full" onClick={() => act(w, as, "m0_answer", { choice: "decline" })}>Not now</button>
        </div>
      ) : step === "role" ? (
        // Lo que hace el acompañante y, sobre todo, lo que NO le toca: nadie le hace responsable de la salud mental del otro
        <div className="rv-in flex min-h-0 flex-1 flex-col">
          <div className="rv-scroll min-h-0 flex-1 overflow-y-auto pt-6">
            <h1 className="text-[28px] leading-[1.1]">What accompanying means</h1>
            <p className="mt-5 font-semibold">What you do</p>
            <ul className="mt-2 flex flex-col gap-2.5">
              {["Send a voice note now and then", "Suggest small plans together, like a walk or a coffee", "Share what helped you, only if you feel like it"].map((t) => (
                <li key={t} className="flex items-start gap-2.5 text-[15px]"><Icon name="check" size={18} className="mt-0.5 shrink-0 text-rv-teal" />{t}</li>
              ))}
            </ul>
            <div className="rv-notice mt-5 p-4">
              <p className="font-semibold">What&apos;s not on you</p>
              <ul className="mt-2 flex flex-col gap-2.5">
                {["You're not their therapist, and you don't have to fix anything", "You never see their health data", "If something serious happens, their clinic team steps in, not you", "You can pause or stop at any time, no questions asked"].map((t) => (
                  <li key={t} className="flex items-start gap-2.5 text-[15px]"><Icon name="shield" size={18} className="mt-0.5 shrink-0" />{t}</li>
                ))}
              </ul>
            </div>
          </div>
          <button className="rv-btn rv-btn-primary rv-btn-lg mt-4 w-full" onClick={() => setStep("train")}>Sounds good</button>
          <button className="rv-btn rv-btn-ghost mt-2 w-full" onClick={() => act(w, as, "m0_answer", { choice: "decline" })}>Not now</button>
        </div>
      ) : step === "train" ? (
        <TrainingCards mentee={m0.menteeName} onDone={() => setStep("meet")} />
      ) : (
        <div className="rv-in flex flex-1 flex-col">
          <div className="flex-1 pt-6 text-center">
            <Avatar name={m0.menteeName} size={96} ring />
            <h1 className="mt-4 text-[28px]">Meet {m0.menteeName}</h1>
            <p className="mt-2"><span className="rv-chip bg-rv-sage text-[14px] text-rv-teal">Affinity {m0.percent}%</span></p>
            {PROFILE[m0.menteeName] && <p className="mx-auto mt-4 max-w-[32ch] rounded-2xl bg-white px-4 py-3 text-[15px] italic leading-snug">“{PROFILE[m0.menteeName].bio}”</p>}
            <ul className="mx-auto mt-5 flex max-w-[30ch] flex-col gap-2.5 text-left">
              {[...m0.reasons, ...inCommon(me, m0.menteeName)].map((r) => (
                <li key={r} className="flex items-start gap-2.5 text-[15px]"><Icon name="check" size={18} className="mt-0.5 text-rv-teal" />{r}</li>
              ))}
            </ul>
          </div>
          <button className="rv-btn rv-btn-primary rv-btn-lg w-full" onClick={() => act(w, as, "m0_answer", { choice: "accept" })}>Accompany {m0.menteeName}</button>
          <button className="rv-btn rv-btn-ghost mt-2 w-full" onClick={() => act(w, as, "m0_answer", { choice: "decline" })}>I can&apos;t right now</button>
        </div>
      )}
    </div>
  );
}

/* ---------- M5 · Ritmo más ligero (nunca dice que sus datos han empeorado) ---------- */
function M5({ w, as, m5, onLater }: { w: string; as: string; m5: NonNullable<MentorData["m5"]>; onLater: () => void }) {
  const pause = m5.variant === "pause";
  return (
    <div className="absolute inset-0 z-30 flex flex-col bg-rv-bg px-6 pb-7 pt-4">
      <button onClick={onLater} className="rv-btn rv-btn-ghost -ml-3 self-start px-3" aria-label="Later"><Icon name="x" /></button>
      <div className="rv-in flex-1 pt-8">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-rv-sage text-rv-teal"><Icon name="sun" size={28} /></span>
        <h1 className="mt-6 text-[30px] leading-[1.1]">{pause ? "A few days for you" : "This week, a lighter pace"}</h1>
        <p className="rv-muted mt-3 text-[16px]">
          {pause ? `We suggest a pause. ${m5.menteeName ?? "The person you accompany"} will stay supported by the team and you can come back whenever you like.` : "Helping is tiring too. We suggest a light pace for a few days."}
        </p>
        {m5.mentorName && <p className="mt-6 flex items-center gap-2 text-[15px]"><Avatar name={m5.mentorName} size={30} />You can write to {m5.mentorName} whenever you like.</p>}
      </div>
      {pause ? (
        <>
          <button className="rv-btn rv-btn-primary rv-btn-lg w-full" onClick={() => act(w, as, "rhythm", { rhythm: 0, source: "m5" })}>OK, a pause</button>
          <button className="rv-btn rv-btn-ghost mt-2 w-full" onClick={() => act(w, as, "rhythm", { decline: true, source: "m5" })}>I&apos;d rather keep going with notes only</button>
        </>
      ) : (
        <>
          <button className="rv-btn rv-btn-primary rv-btn-lg w-full" onClick={() => act(w, as, "rhythm", { rhythm: 1, source: "m5" })}>OK, light pace</button>
          <button className="rv-btn rv-btn-secondary mt-2 w-full" onClick={() => act(w, as, "rhythm", { rhythm: 0, source: "m5" })}>Take a pause</button>
          <button className="rv-btn rv-btn-ghost mt-1 w-full" onClick={() => act(w, as, "rhythm", { decline: true, source: "m5" })}>I&apos;d rather keep going as I am</button>
        </>
      )}
    </div>
  );
}

/* ---------- Ideas de respuesta (solo mentores): privadas, cálidas y basadas en técnicas de apoyo entre iguales ---------- */
type ReplyIdea = { message: string; why: string; technique: string };
type IdeasResult = { status: "ok"; opener: string; ideas: ReplyIdea[]; source: "gemini" | "template" } | { status: "consent" | "clinic" | "worried"; menteeName: string };
function ReplyIdeas({ w, as, menteeName, mentorOfMe, onClose, onUse, onHelp }: { w: string; as: string; menteeName: string; mentorOfMe: string | null; onClose: () => void; onUse: (message: string) => void; onHelp: () => void }) {
  const [res, setRes] = useState<IdeasResult | null>(null);
  const [err, setErr] = useState("");
  useEffect(() => {
    let alive = true;
    fetch("/api/relevo/reply-ideas", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ w, as }) })
      .then(async (r) => {
        const j = await r.json();
        if (!r.ok) throw new Error(j.error ?? "Couldn't get ideas right now");
        if (alive) setRes(j);
      })
      .catch((e) => alive && setErr((e as Error).message));
    return () => {
      alive = false;
    };
  }, [w, as]);
  return (
    <Sheet onClose={onClose} label="Ideas for your reply">
      <h2 className="pr-12 text-[22px] leading-tight">Ideas for your reply</h2>
      <p className="mt-1 flex items-center gap-1.5 text-[12.5px] font-semibold text-rv-notice-ink"><Icon name="lock" size={14} />Only you see this</p>
      {!res && !err && (
        <div className="mt-5 flex items-center gap-3 rounded-2xl bg-white p-4" role="status">
          <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-rv-teal" aria-hidden />
          <p className="text-[15px]">Reading your conversation with {menteeName}…</p>
        </div>
      )}
      {err && <p className="mt-5 rounded-2xl bg-white p-4 text-[15px]">{err}. You know {menteeName} best: a few honest words are always enough.</p>}
      {res?.status === "consent" && (
        <p className="mt-5 rounded-2xl bg-white p-4 text-[15px] leading-snug">
          {res.menteeName} hasn&apos;t turned on the analysis of their notes, so Relevo can&apos;t read your conversation. That&apos;s their choice. You can still write from the heart: a short, warm note is always a good reply.
        </p>
      )}
      {(res?.status === "clinic" || res?.status === "worried") && (
        <div className="mt-5 rounded-2xl bg-white p-4">
          <p className="text-[16px] font-semibold leading-snug">
            {res.status === "clinic" ? `${res.menteeName}'s clinic team is involved. You don't need to handle this alone.` : `This sounds like something to share with ${res.menteeName}'s clinic team.`}
          </p>
          <p className="rv-muted mt-1 text-[14px]">If you&apos;re worried about {res.menteeName}&apos;s safety right now, use Help.{mentorOfMe ? ` And if you need someone to talk to, ${mentorOfMe} is there for you.` : ""}</p>
          <button className="rv-btn rv-btn-help mt-3 w-full" onClick={onHelp}><Icon name="heart" size={16} />Help</button>
        </div>
      )}
      {res?.status === "ok" && (
        <>
          <p className="rv-notice mt-4 p-4 text-[15px] leading-snug">{res.opener}</p>
          <ul className="mt-3 flex flex-col gap-3">
            {res.ideas.map((idea, i) => (
              <li key={i} className="rv-card p-4">
                <span className="rv-chip bg-rv-sage text-rv-teal">{idea.technique}</span>
                <p className="mt-2 rounded-2xl bg-rv-bg p-3 text-[15px] leading-snug">“{idea.message}”</p>
                <p className="rv-muted mt-2 text-[13px] leading-snug"><span className="font-semibold text-rv-ink">Why it can help: </span>{idea.why}</p>
                <button className="rv-btn rv-btn-primary rv-btn-sm mt-3 w-full" onClick={() => onUse(idea.message)}>Use this</button>
              </li>
            ))}
          </ul>
          <p className="rv-muted mt-4 text-[12px] leading-snug">
            {res.source === "gemini" ? "Suggested with AI" : "Suggested"} from peer-support practice (feeling heard, small shared steps, hope), not medical advice. Make it yours: your own words matter most.
          </p>
        </>
      )}
    </Sheet>
  );
}
