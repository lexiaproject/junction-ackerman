"use client";

// Formación y pautas para el acompañante (feedback de los mentores del reto: el acompañante no tiene formación clínica,
// así que necesita unas pautas claras y una salida fácil hacia la clínica).
// · TrainingCards: 4 tarjetas cortas antes del primer acompañado (en la invitación M0).
// · CompanionGuide: las mismas pautas siempre a mano (pestaña My relay).
// · WorriedButton / WorriedSheet: "I'm worried about …" avisa a la clínica. Es una pieza aparte para poder retirarla
//   sin tocar lo demás (quitar este componente, la acción "worried" en sim.ts/server.ts y la línea de la tarjeta 3).
import { useState } from "react";
import { Icon, Sheet, act } from "./kit";

type Item = { kind: "do" | "avoid" | "step"; text: string };
type Card = { title: string; icon: string; intro: string; items: Item[] };

const cards = (mentee: string): Card[] => [
  {
    title: "Listen, don't fix",
    icon: "chat",
    intro: "Most of the time, being heard helps more than advice.",
    items: [
      { kind: "do", text: "Say back what you heard: “It sounds like the nights are really hard.”" },
      { kind: "do", text: "Ask open questions: “What has today been like?”" },
      { kind: "do", text: "Leave out medical advice, even about sleep or medication." },
    ],
  },
  {
    title: "What helps, what to avoid",
    icon: "heart",
    intro: "Small, warm words go a long way.",
    items: [
      { kind: "do", text: "“That sounds really hard.”" },
      { kind: "do", text: "“I'm here. No need to reply.”" },
      { kind: "do", text: "“Fancy a short walk together?”" },
      { kind: "avoid", text: "“Just think positive.”" },
      { kind: "avoid", text: "“I know exactly how you feel.”" },
      { kind: "avoid", text: "“You should…”" },
    ],
  },
  {
    title: "When to hand over",
    icon: "shield",
    intro: `Some things are not yours to carry. If ${mentee} talks about not wanting to live or hurting themselves, or you're really worried:`,
    items: [
      { kind: "step", text: `Tell their clinic team: tap “I'm worried about ${mentee}” in your conversation.` },
      { kind: "step", text: "In an emergency, call 112." },
      { kind: "step", text: "Crisis phrases in notes already reach the clinic on their own." },
    ],
  },
  {
    title: "Look after yourself",
    icon: "sun",
    intro: "Your own recovery comes first.",
    items: [
      { kind: "do", text: "Choose your pace, or take a pause, in My relay." },
      { kind: "do", text: "Your own companion is there for you too." },
      { kind: "do", text: "If it ever feels heavy, you can stop. No one is blamed." },
    ],
  },
];

function CardBody({ card }: { card: Card }) {
  const icon = { do: "check", avoid: "x", step: "arrow" } as const;
  const color = { do: "text-rv-teal", avoid: "text-rv-help", step: "text-rv-teal" } as const;
  return (
    <>
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-rv-sage text-rv-teal"><Icon name={card.icon} size={24} /></span>
      <h2 className="mt-4 text-[26px] leading-[1.1]">{card.title}</h2>
      <p className="mt-2 text-[16px] leading-snug">{card.intro}</p>
      <ul className="mt-4 flex flex-col gap-2.5">
        {card.items.map((it) => (
          <li key={it.text} className="flex items-start gap-2.5 text-[15px] leading-snug">
            <Icon name={icon[it.kind]} size={18} className={`mt-0.5 ${color[it.kind]}`} />
            <span>{it.kind === "avoid" && <span className="sr-only">Avoid: </span>}{it.text}</span>
          </li>
        ))}
      </ul>
    </>
  );
}

/* ---------- Formación antes del primer acompañado (dentro de la invitación) ---------- */
export function TrainingCards({ mentee, onDone }: { mentee: string; onDone: () => void }) {
  const list = cards(mentee);
  const [i, setI] = useState(0);
  const last = i === list.length - 1;
  return (
    <div className="rv-in flex min-h-0 flex-1 flex-col">
      <div className="flex items-center justify-between pt-4">
        <p className="text-[13px] font-semibold text-rv-teal">Companion basics · {i + 1} of {list.length}</p>
        <div className="flex gap-1.5" aria-hidden>
          {list.map((c, k) => <span key={c.title} className={`h-1.5 w-6 rounded-full ${k <= i ? "bg-rv-teal" : "bg-rv-line"}`} />)}
        </div>
      </div>
      <div key={i} className="rv-in rv-scroll min-h-0 flex-1 overflow-y-auto pt-5">
        <CardBody card={list[i]} />
        {i === 0 && <p className="rv-muted mt-5 text-[13px] leading-snug">About five minutes. Based on peer-support and psychological first aid practice. Your clinic will also invite you to a short in-person session.</p>}
      </div>
      <button className="rv-btn rv-btn-primary rv-btn-lg mt-4 w-full" onClick={() => (last ? onDone() : setI(i + 1))}>{last ? "I'm ready" : "Next"}</button>
      <button className="rv-btn rv-btn-ghost mt-2 w-full" onClick={() => setI(Math.max(0, i - 1))} disabled={i === 0}>Back</button>
    </div>
  );
}

/* ---------- Las mismas pautas, siempre a mano ---------- */
export function CompanionGuide({ mentee, onWorried }: { mentee: string | null; onWorried?: () => void }) {
  const [open, setOpen] = useState(false);
  const list = cards(mentee ?? "the person you accompany");
  return (
    <>
      <div className="rv-card p-4">
        <p className="text-[17px] font-semibold">Companion guide</p>
        <p className="rv-muted mt-1 text-[14px]">The basics from your training, whenever you need them.</p>
        <button className="rv-btn rv-btn-secondary mt-3 w-full" onClick={() => setOpen(true)}><Icon name="list" size={18} />Open the guide</button>
      </div>
      {open && (
        <Sheet onClose={() => setOpen(false)} label="Companion guide">
          <h2 className="pr-12 text-[22px] leading-tight">Companion guide</h2>
          <p className="rv-muted mt-1 text-[14px]">You&apos;re a companion, not a therapist.</p>
          <div className="mt-4 flex flex-col gap-3">
            {list.map((c) => <div key={c.title} className="rv-card p-4 [&_h2]:text-[20px]"><CardBody card={c} /></div>)}
          </div>
          {mentee && onWorried && (
            <button className="rv-btn rv-btn-help mt-4 w-full" onClick={() => { setOpen(false); onWorried(); }}><Icon name="shield" size={16} />I&apos;m worried about {mentee}</button>
          )}
        </Sheet>
      )}
    </>
  );
}

/* ---------- "I'm worried about …": avisa a la clínica y el acompañante no carga con nada más ---------- */
export function WorriedButton({ mentee, onClick }: { mentee: string; onClick: () => void }) {
  return (
    <button className="rv-btn rv-btn-ghost rv-btn-sm mb-3 w-full gap-1.5 text-rv-help" onClick={onClick}>
      <Icon name="shield" size={16} />I&apos;m worried about {mentee}
    </button>
  );
}

export function WorriedSheet({ w, as, mentee, onClose }: { w: string; as: string; mentee: string; onClose: () => void }) {
  const [state, setState] = useState<"ask" | "sending" | "sent" | "error">("ask");
  const send = async () => {
    setState("sending");
    try {
      await act(w, as, "worried");
      setState("sent");
    } catch {
      setState("error");
    }
  };
  return (
    <Sheet onClose={onClose} label={`Worried about ${mentee}?`}>
      {state !== "sent" ? (
        <>
          <h2 className="pr-12 text-[22px] leading-tight">Worried about {mentee}?</h2>
          <p className="mt-2 text-[16px] leading-snug">We&apos;ll let {mentee}&apos;s clinic team know. They&apos;ll take it from here. You don&apos;t need to explain or do anything else.</p>
          <p className="rv-muted mt-2 text-[14px]">{mentee} won&apos;t be told it came from you.</p>
          {state === "error" && <p className="mt-3 rounded-2xl bg-white p-3 text-[14px]">Couldn&apos;t send it. Try again, or call the clinic.</p>}
          <button className="rv-btn rv-btn-help rv-btn-lg mt-5 w-full" onClick={send} disabled={state === "sending"}>{state === "sending" ? "Sending…" : "Let the clinic know"}</button>
          <button className="rv-btn rv-btn-ghost mt-2 w-full" onClick={onClose}>Not now</button>
          <p className="rv-muted mt-3 text-center text-[13px]">In an emergency, call 112.</p>
        </>
      ) : (
        <>
          <h2 className="pr-12 text-[22px] leading-tight">Thanks for telling us</h2>
          <p className="mt-2 text-[16px] leading-snug">{mentee}&apos;s clinic team has been told and will take it from here. You don&apos;t need to do anything else.</p>
          <p className="rv-muted mt-2 text-[14px]">You can keep writing to {mentee} as usual, or take a break. Both are fine.</p>
          <button className="rv-btn rv-btn-primary rv-btn-lg mt-5 w-full" onClick={onClose}>OK</button>
        </>
      )}
    </Sheet>
  );
}
