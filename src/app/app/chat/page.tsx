"use client";
// Pestaña "Chat": conversaciones reales con el mentor/pupilo (y con el antiguo mentor de apoyo)

import { useEffect, useState } from "react";
import { Button, ErrorText, api, timeAgo, useLive } from "../../ui";
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
    <div className="p-4">
      <h1 className="font-display text-3xl font-bold">Chat</h1>
      {!data ? (
        <p className="mt-4 text-pine/70">Loading…</p>
      ) : data.threads.length === 0 ? (
        <p className="mt-4 text-pine/75">Once your clinic matches you with someone, your conversation will appear here.</p>
      ) : (
        <ul className="mt-4 divide-y divide-mist">
          {data.threads.map((t) => (
            <li key={t.id}>
              <button onClick={() => setOpen(t.id)} className="flex w-full items-center gap-3 py-3 text-left">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-pine font-display text-lg font-bold text-paper">
                  {t.name[0]}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="font-bold">{t.name}</span>
                    <span className="shrink-0 text-xs text-pine/55">{t.last ? timeAgo(t.last.at) : ""}</span>
                  </span>
                  <span className="block text-xs text-pine/60">{t.relation}</span>
                  <span className="block truncate text-sm text-pine/80">
                    {t.last ? `${t.last.mine ? "You: " : ""}${t.last.text}` : "No messages yet. Say hello."}
                  </span>
                </span>
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
      <div className="flex items-center gap-2 border-b border-mist px-2 py-2">
        <button onClick={onBack} className="rounded-full px-3 py-1.5 text-sm font-bold" aria-label="Back to conversations">
          ← Back
        </button>
        <p className="font-display text-lg font-bold">{data?.with.name ?? ""}</p>
      </div>
      <ErrorText>{error}</ErrorText>
      <div className="flex min-h-0 flex-1 flex-col-reverse overflow-y-auto px-3 py-3">
        <div className="flex flex-col gap-1.5">
          {msgs.length === 0 && data && <p className="py-8 text-center text-sm text-pine/60">No messages yet. Say hello to {data.with.name}.</p>}
          {msgs.map((m, i) => {
            const mine = m.from === me.user.id;
            const day = new Date(m.at).toDateString();
            const newDay = i === 0 || new Date(msgs[i - 1].at).toDateString() !== day;
            return (
              <div key={m.id} className="flex flex-col">
                {newDay && (
                  <p className="my-2 text-center text-[11px] text-pine/50">
                    {new Date(m.at).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}
                  </p>
                )}
                {m.plan ? (
                  <div className={`max-w-[85%] rounded-2xl border-2 border-cloudberry bg-paper px-3 py-2 text-sm ${mine ? "self-end" : "self-start"}`}>
                    <p className="text-xs text-pine/60">Invitation</p>
                    <p>{m.text}</p>
                    {m.plan.answer ? (
                      <p className="mt-1 text-xs font-bold">{m.plan.answer === "yes" ? "Accepted" : "Not this time"}</p>
                    ) : !mine ? (
                      <div className="mt-2 flex gap-2">
                        <Button className="flex-1 !py-1.5" onClick={() => answer(m.id, true)}>
                          Sounds good
                        </Button>
                        <Button kind="line" className="flex-1 !py-1.5" onClick={() => answer(m.id, false)}>
                          Not now
                        </Button>
                      </div>
                    ) : (
                      <p className="mt-1 text-xs text-pine/60">Waiting for an answer</p>
                    )}
                  </div>
                ) : (
                  <p
                    className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-1.5 text-sm ${
                      mine ? "self-end rounded-br-sm bg-pine text-paper" : "self-start rounded-bl-sm bg-birch"
                    }`}
                  >
                    {m.text}
                  </p>
                )}
                <span className={`mt-0.5 text-[10px] text-pine/45 ${mine ? "self-end" : "self-start"}`}>
                  {new Date(m.at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
            );
          })}
        </div>
      </div>
      <ErrorText>{sendError}</ErrorText>
      <form onSubmit={send} className="flex items-end gap-2 border-t border-mist px-3 py-2">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) send(e);
          }}
          rows={Math.min(4, Math.max(1, text.split("\n").length))}
          placeholder={`Message ${data?.with.name ?? ""}`}
          aria-label="Message"
          className="min-w-0 flex-1 resize-none rounded-2xl border border-mist bg-birch/60 px-3 py-2 text-sm"
        />
        <Button type="submit" disabled={busy || !text.trim()}>
          Send
        </Button>
      </form>
    </div>
  );
}
