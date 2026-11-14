"use client";
// Panel de la clínica: solo dice quién necesita una llamada y por qué, en una línea.

import { MENTOR, PUPIL } from "@/lib/data";
import { CATALOG, type Level } from "@/lib/engine";
import type { View, World } from "@/lib/world";
import { LevelPill, Loading, useWorld } from "../screens";

type Row = {
  pupil: string;
  mentor: string;
  level: Level;
  label?: string;
  reason: string;
  mentorNote: string;
  live?: boolean;
  urgent?: boolean;
};

// MOCK: otras parejas de la red, con datos de ejemplo
const OTHER_PAIRS: Row[] = [
  {
    pupil: "Pekka",
    mentor: "Sara",
    level: "early",
    reason: "Sleeping less for 3 nights. Sara suggested a walk and Pekka said yes.",
    mentorNote: "Sara: stable",
  },
  {
    pupil: "Elina",
    mentor: "Tomas",
    level: "high",
    label: "Mentor needs support",
    reason: "Tomas's own routine has dipped this week. Mentoring paused; Tomas's former mentor Aino was told.",
    mentorNote: "Tomas: early signs",
  },
  {
    pupil: "Ville",
    mentor: "Aino",
    level: "stable",
    reason: "Routine as usual. Coffee planned on Thursday.",
    mentorNote: "Aino: stable",
  },
];

function liveRow(w: World, v: View): Row {
  const sentLevel = v.alert && w.sentFor.includes(v.alert);
  let reason = "Routine as usual.";
  if (w.crisis) reason = w.crisisHandled ? "Help request handled by the clinic." : "Laura pressed the help button. Call Laura now.";
  else if (v.level === "learning") reason = "Learning Laura's usual week.";
  else if (v.level === "high")
    reason = sentLevel
      ? `Several signals off Laura's baseline for 4+ days. ${MENTOR} reached out: ${CATALOG[w.sentAction ?? "call"].toLowerCase()}.`
      : `Several signals off Laura's baseline for 4+ days. ${MENTOR} has been prompted to reach out. Consider a call.`;
  else if (v.level === "early")
    reason = sentLevel
      ? `Early changes in Laura's routine. ${MENTOR} reached out: ${CATALOG[w.sentAction ?? "walk"].toLowerCase()}.`
      : `Early changes in Laura's routine. ${MENTOR} has been prompted to reach out.`;
  else if (v.learned.length) reason = `Back to baseline after ${v.learned[0].toLowerCase()}.`;

  return {
    pupil: PUPIL,
    mentor: MENTOR,
    level: v.level,
    label: w.crisis && w.crisisHandled ? "Crisis: handled" : undefined,
    reason,
    mentorNote: `${MENTOR}: stable`, // MOCK: el estado del mentor también es simulado
    live: true,
    urgent: w.crisis && !w.crisisHandled,
  };
}

const PRIORITY: Record<Level, number> = { crisis: 0, high: 1, early: 2, stable: 3, learning: 4 };

export default function Clinic() {
  const { world: w, view: v, dispatch } = useWorld();
  if (!w || !v) return <Loading />;

  const rows = [liveRow(w, v), ...OTHER_PAIRS].sort(
    (a, b) => Number(b.urgent ?? 0) - Number(a.urgent ?? 0) || PRIORITY[a.level] - PRIORITY[b.level],
  );
  const needCall = rows.filter((r) => r.urgent || r.level === "high").length;

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6">
      <p className="font-display text-xl font-bold">Relay for clinics</p>
      <h1 className="mt-6 font-display text-4xl font-bold">
        {needCall === 0 ? "Nobody needs a call today" : `${needCall} ${needCall === 1 ? "person needs" : "people need"} a call today`}
      </h1>
      <p className="mt-2 max-w-2xl text-pine/75">
        Each pupil is compared only with their own baseline. Mentors never see health data; you see one line per pair.
      </p>

      <ul className="mt-8 divide-y divide-mist border-y border-mist">
        {rows.map((r) => (
          <li
            key={r.pupil}
            className={`grid gap-x-6 gap-y-2 py-4 sm:grid-cols-[180px_1fr_auto] sm:items-center ${r.urgent ? "-mx-3 rounded-xl bg-lingon/10 px-3" : ""}`}
          >
            <div>
              <p className="font-bold">
                {r.pupil}
                {r.live && <span className="ml-2 text-xs font-normal text-pine/60">live demo</span>}
              </p>
              <p className="text-sm text-pine/70">Mentor {r.mentor}</p>
            </div>
            <div>
              <p>{r.reason}</p>
              <p className="mt-0.5 text-xs text-pine/60">{r.mentorNote}</p>
            </div>
            <div className="flex items-center gap-2 sm:justify-end">
              {r.urgent ? (
                <button onClick={() => dispatch({ type: "handled" })} className="rounded-full bg-lingon px-4 py-2 text-sm font-bold text-paper">
                  Mark as handled
                </button>
              ) : (
                <LevelPill level={r.level} label={r.label} />
              )}
            </div>
          </li>
        ))}
      </ul>

      <p className="mt-6 text-sm text-pine/70">
        Crisis alerts come straight here, never to the mentor. The clinic sets the thresholds and reviews every serious alert.
      </p>
    </main>
  );
}
