"use client";

// Piezas para que las personas se sientan personas: tarjeta de perfil (retrato, biografía, lo que le ayudó,
// cosas en común) y los hitos de la relación (días juntos, planes hechos). Nunca enseñan datos de salud.
import { PROFILE, inCommon } from "@/lib/relevo/profiles";
import { Avatar } from "./kit";

export type Together = { since: string; days: number; plans: number; chainFrom?: string | null };

export function Milestones({ together, other }: { together: Together; other: string }) {
  const items = [
    together.days >= 1 ? `${together.days} ${together.days === 1 ? "day" : "days"} together` : "Your first day together",
    together.plans > 0 ? `${together.plans} ${together.plans === 1 ? "plan" : "plans"} with ${other}` : null,
    `Since ${together.since}`,
  ].filter(Boolean) as string[];
  return (
    <ul className="flex flex-wrap gap-1.5" aria-label="Your time together">
      {items.map((t) => <li key={t} className="rv-chip bg-rv-sage text-[13px] text-rv-teal">{t}</li>)}
    </ul>
  );
}

/** Perfil de una persona tal y como lo ve otra (me): con las cosas que tienen en común. */
export function PersonCard({ name, role, me, children, big = false }: { name: string; role: string; me?: string; children?: React.ReactNode; big?: boolean }) {
  const p = PROFILE[name];
  const shared = me ? inCommon(me, name) : [];
  return (
    <div className="rv-card p-4">
      <div className="flex items-center gap-3">
        <Avatar name={name} size={big ? 64 : 52} ring />
        <div className="min-w-0">
          <p className={`${big ? "text-[20px]" : "text-[17px]"} font-semibold leading-tight`} style={{ fontFamily: "var(--rv-display)" }}>{name}</p>
          <p className="rv-muted text-[13.5px]">{role}</p>
        </div>
      </div>
      {p && <p className="mt-3 text-[15px] leading-snug">{p.bio}</p>}
      {p?.helped && (
        <p className="mt-3 rounded-2xl bg-rv-bg px-3 py-2.5 text-[14.5px] leading-snug">
          <span className="block text-[12.5px] font-semibold text-rv-teal">What helped me</span>“{p.helped}”
        </p>
      )}
      {shared.length > 0 && (
        <ul className="mt-3 flex flex-col gap-1.5" aria-label="Things in common">
          {shared.map((s) => <li key={s} className="flex items-center gap-2 text-[14px]"><span className="h-1.5 w-1.5 rounded-full bg-rv-teal" aria-hidden />{s}</li>)}
        </ul>
      )}
      {children}
    </div>
  );
}
