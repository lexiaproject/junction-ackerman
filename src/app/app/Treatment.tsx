"use client";
// Progreso del tratamiento TMS (MOCK: en uso real vendría de la agenda de la clínica)

export type Sessions = { done: number; total: number; next?: string };

export default function Treatment({ s }: { s: Sessions }) {
  const done = s.done >= s.total;
  return (
    <section className="card p-4">
      <div className="flex items-baseline justify-between">
        <h2 className="font-semibold">Your TMS treatment</h2>
        <p className="num muted text-sm">
          {s.done} of {s.total} sessions
        </p>
      </div>
      <div className="mt-3 flex gap-[3px]" aria-hidden>
        {Array.from({ length: s.total }, (_, k) => (
          <span key={k} className={`h-2 flex-1 rounded-sm ${k < s.done ? "bg-pine" : k === s.done ? "bg-cloudberry" : "bg-mist"}`} />
        ))}
      </div>
      <p className="muted mt-3 text-sm">
        {done
          ? "Treatment complete. When you're ready, your clinic may ask if you'd like to mentor someone new."
          : s.next
            ? `Next session: ${new Date(s.next).toLocaleString("en-GB", { weekday: "long", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}`
            : ""}
      </p>
    </section>
  );
}
