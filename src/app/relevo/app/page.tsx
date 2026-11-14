"use client";
// App móvil de Relevo (acompañado y mentor en una sola web app de 390 x 844, con selector de rol)
import Link from "next/link";
import { useEffect, useState } from "react";
import { Fit, Phone, useOfflineQueue, useView, useWid } from "../kit";
import MenteeApp from "../MenteeApp";
import MentorApp from "../MentorApp";

const ROLES = [
  { id: "luis", label: "Luis", sub: "accompanied" },
  { id: "pablo", label: "Pablo", sub: "his mentor" },
  { id: "marta", label: "Marta", sub: "Pablo's mentor" },
] as const;
type Role = (typeof ROLES)[number]["id"];

export default function AppPage() {
  const w = useWid();
  const [as, setAs] = useState<Role>("luis");
  const [narrow, setNarrow] = useState(false);
  useOfflineQueue();
  useEffect(() => {
    const r = new URLSearchParams(window.location.search).get("as");
    // eslint-disable-next-line react-hooks/set-state-in-effect -- el rol viene de la URL
    if (r === "luis" || r === "pablo" || r === "marta") setAs(r);
    const mq = window.matchMedia("(max-width: 520px)");
    setNarrow(mq.matches);
    const on = () => setNarrow(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  const { data: clock } = useView<{ clock: { time: string; date: string } }>(w ? `/api/relevo/demo?w=${w}` : null, 6000);
  const pick = (r: Role) => {
    setAs(r);
    const u = new URL(window.location.href);
    u.searchParams.set("as", r);
    window.history.replaceState(null, "", u);
  };
  if (!w) return null;
  const app = as === "luis" ? <MenteeApp key={as} w={w} /> : <MentorApp key={as} w={w} as={as} />;

  const selector = (
    <div className="flex rounded-full bg-white p-1 shadow-[0_0_0_1px_var(--color-rv-line)]" role="tablist" aria-label="View as">
      {ROLES.map((r) => (
        <button key={r.id} role="tab" aria-selected={as === r.id} onClick={() => pick(r.id)} className={`rounded-full px-3.5 py-1.5 text-[13px] font-semibold transition-colors ${as === r.id ? "bg-rv-teal text-white" : "text-rv-ink2 hover:text-rv-ink"}`}>
          {r.label}
          {!narrow && <span className={`ml-1 font-normal ${as === r.id ? "text-white/75" : "text-rv-ink2/70"}`}>· {r.sub}</span>}
        </button>
      ))}
    </div>
  );

  if (narrow)
    return (
      <div className="flex h-dvh flex-col">
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-rv-line bg-white px-3 py-2">
          {selector}
          <Link href="/relevo/demo" className="rv-muted text-[12px] underline">Demo</Link>
        </div>
        <div className="relative flex min-h-0 flex-1 flex-col pt-2">{app}</div>
      </div>
    );

  return (
    <div className="flex h-dvh flex-col items-center gap-4 overflow-hidden px-4 py-5">
      <div className="flex w-full max-w-3xl flex-wrap items-center justify-between gap-3">
        <Link href="/relevo" className="text-[20px] font-semibold" style={{ fontFamily: "var(--rv-display)" }}>Relevo</Link>
        {selector}
        <Link href="/relevo/demo" className="rv-muted text-[13px] underline underline-offset-4">Demo time: {clock?.clock.date ?? "…"} {clock?.clock.time}</Link>
      </div>
      <div className="h-[calc(100dvh-110px)] min-h-[520px] w-full max-w-[420px]">
        <Fit width={390} height={844}>
          <Phone time={clock?.clock.time ?? "9:41"} label={`${as}'s phone`}>{app}</Phone>
        </Fit>
      </div>
    </div>
  );
}
