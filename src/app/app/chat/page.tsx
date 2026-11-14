"use client";
// Pestaña "Chat": conversaciones reales con el mentor/pupilo (y con el antiguo mentor de apoyo)

import { useEffect, useState } from "react";
import { Avatar, Button, Chevron, ErrorText, api, timeAgo, useLive } from "../../ui";
import { useMe } from "../AppShell";

type ThreadItem = { id: string; name: string; relation: string; last: { text: string; at: string; mine: boolean } | null };
type Msg = { id: string; from: string; text: string; at: string; plan?: { action: string; answer?: "yes" | "no" } };

export default function ChatPage() {
  const [open, setOpen] = useState<string | null>(null);
  const { data, reload } = useLive<{ threads: ThreadItem[] }>("/api/app/chat", 5000);

  // Abrir directamente una conversación desde un enlace (/app/chat#id)
  useEffect(() => {
    const fromHash = () => setOpen(window.location.hash.slice(1) || null);
    fromHash();
    window.addEventListener("hashchange", fromHash);
    return () => window.removeEventListener("hashchange", fromHash);
  }, []);

  if (open)
    return (
      <Thread
        id={open}
        onBack={() => {
          history.replaceState(null, "", "/app/chat");
          setOpen(null);
          reload();
        }}
      />
    );

  return (
    <div className="px-4 pb-8 pt-5">
      <h1 className="text-[1.75rem] font-bold leading-tight">Messages</h1>
      {!data ? (
        <div className="card mt-4 h-32 animate-pulse" />
      ) : data.threads.length === 0 ? (
        <p className="muted mt-4">Once your clinic matches you with someone, your conversation appears here.</p>
      ) : (
        <ul className="card mt-4 divide-y divide-mist">
          {data.threads.map((t) => (
            <li key={t.id}>
              <button onClick={() => setOpen(t.id)} className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-birch/60">
                <Avatar name={t.name} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="font-semibold">{t.name}</span>
                    <span className="muted num shrink-0 text-xs">{t.last ? timeAgo(t.last.at) : ""}</span>
                  </span>
                  <span className="muted block text-xs">{t.relation}</span>
                  <span className="block truncate text-sm">{t.last ? `${t.last.mine ? "You: " : ""}${t.last.text}` : "No messages yet. Say hello."}</span>
                </span>
                <Chevron />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Thread({ id, onBack }: { id: string; onBack: () => void }) {
  const { me } = useMe();
  const { data, error, reload } = useLive<{ with: { id: string; name: string }; messages: Msg[] }>(`/api/app/chat?with=${encodeURIComponent(id)}`, 3000);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [sendError, setSendError] = useState("");

  // Borrador sugerido (p. ej. el primer "hola" del mentor)
  useEffect(() => {
    const key = `relay:draft:${id}`;
    const d = sessionStorage.getItem(key);
    if (d) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- borrador guardado en el navegador, solo existe tras montar
      setText(d);
      sessionStorage.removeItem(key);
    }
  }, [id]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setBusy(true);
    try {
      await api("/api/app/chat", { action: "send", to: id, text });
      setText("");
      setSendError("");
      await reload();
    } catch (err) {
      setSendError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function answer(msgId: string, yes: boolean) {
    await api("/api/app/chat", { action: "answer", to: id, id: msgId, answer: yes ? "yes" : "no" }).catch(() => {});
    await reload();
  }

  const msgs = data?.messages ?? [];
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center gap-2 border-b border-mist bg-paper px-2 py-2">
        <button onClick={onBack} className="btn btn-quiet btn-sm" aria-label="Back to messages">
          <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="m12 5-5 5 5 5" />
          </svg>
          Back
        </button>
        {data && (
          <span className="flex items-center gap-2">
            <Avatar name={data.with.name} />
            <span className="font-semibold">{data.with.name}</span>
          </span>
        )}
      </div>
      <ErrorText>{error}</ErrorText>
      <div className="flex min-h-0 flex-1 flex-col-reverse overflow-y-auto px-3 py-3">
        <div className="flex flex-col gap-1">
          {msgs.length === 0 && data && <p className="muted py-10 text-center text-sm">No messages yet. Say hello to {data.with.name}.</p>}
          {msgs.map((m, i) => {
            const mine = m.from === me.user.id;
            const day = new Date(m.at).toDateString();
            const newDay = i === 0 || new Date(msgs[i - 1].at).toDateString() !== day;
            const time = new Date(m.at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
            return (
              <div key={m.id} className="flex flex-col">
                {newDay && (
                  <p className="muted my-3 text-center text-xs font-medium">
                    {new Date(m.at).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "short" })}
                  </p>
                )}
                {m.plan ? (
                  <div className={`card w-[85%] overflow-hidden ${mine ? "self-end" : "self-start"}`}>
                    <p className="flex items-center gap-1.5 border-b border-mist bg-[#f8eedd] px-3 py-1.5 text-xs font-semibold text-cloudberry-ink">
                      <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
                        <rect x="2" y="3" width="12" height="11" rx="1.5" />
                        <path d="M2 6.5h12M5.5 1.5v3M10.5 1.5v3" />
                      </svg>
                      Invitation
                    </p>
                    <p className="px-3 pt-2 text-[0.9375rem]">{m.text}</p>
                    {m.plan.answer ? (
                      <p className="px-3 pb-2.5 pt-1.5 text-sm font-semibold">{m.plan.answer === "yes" ? "Accepted" : "Not this time"}</p>
                    ) : !mine ? (
                      <div className="flex gap-2 p-3">
                        <Button size="sm" className="flex-1" onClick={() => answer(m.id, true)}>
                          Sounds good
                        </Button>
                        <Button size="sm" kind="secondary" className="flex-1" onClick={() => answer(m.id, false)}>
                          Not now
                        </Button>
                      </div>
                    ) : (
                      <p className="muted px-3 pb-2.5 pt-1.5 text-sm">Waiting for an answer</p>
                    )}
                  </div>
                ) : (
                  <p
                    className={`max-w-[82%] whitespace-pre-wrap px-3 py-2 text-[0.9375rem] leading-snug ${
                      mine ? "self-end rounded-[14px] rounded-br-[4px] bg-pine text-white" : "self-start rounded-[14px] rounded-bl-[4px] border border-mist bg-paper"
                    }`}
                  >
                    {m.text}
                  </p>
                )}
                <span className={`muted num mb-1.5 mt-0.5 text-[11px] ${mine ? "self-end" : "self-start"}`}>{time}</span>
              </div>
            );
          })}
        </div>
      </div>
      <ErrorText>{sendError}</ErrorText>
      <form onSubmit={send} className="flex items-end gap-2 border-t border-mist bg-paper px-3 py-2.5">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) send(e);
          }}
          rows={Math.min(4, Math.max(1, text.split("\n").length))}
          placeholder={`Message ${data?.with.name ?? ""}`}
          aria-label="Message"
          className="input min-w-0 flex-1 resize-none py-2.5 leading-snug"
        />
        <Button type="submit" disabled={busy || !text.trim()}>
          Send
        </Button>
      </form>
    </div>
  );
}
