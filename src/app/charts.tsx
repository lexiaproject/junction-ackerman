"use client";
// Gráficos interactivos (SVG propio): una señal frente a la línea base de la persona, y la evolución del grupo.
// Al pasar el ratón o el dedo se ve el valor de cada día.

import { useRef, useState } from "react";

const fmtDay = (d: string) => new Date(d + "T12:00:00Z").toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
const fmtNum = (v: number, digits: number) => v.toLocaleString("en-GB", { maximumFractionDigits: digits, minimumFractionDigits: digits });

// Índice del punto más cercano al puntero
function useHover(count: number) {
  const ref = useRef<SVGSVGElement>(null);
  const [i, setI] = useState<number | null>(null);
  const onMove = (e: React.PointerEvent) => {
    const r = ref.current?.getBoundingClientRect();
    if (!r || count < 1) return;
    const x = (e.clientX - r.left) / r.width;
    setI(Math.max(0, Math.min(count - 1, Math.round(x * (count - 1)))));
  };
  return { ref, i, onMove, onLeave: () => setI(null) };
}

export type SignalSeries = {
  label: string;
  unit: string;
  digits: number;
  mean: number;
  threshold: number;
  run: number;
  off: boolean;
  series: (number | null)[];
};

// Una señal: banda de "lo habitual" (línea base ± margen), línea diaria y los días fuera de lo habitual resaltados
export function SignalChart({ s, dates, height = 64, tone = "var(--color-cloudberry)" }: { s: SignalSeries; dates: string[]; height?: number; tone?: string }) {
  const W = 300;
  const H = height;
  const n = s.series.length;
  const vals = s.series.filter((v): v is number => v !== null);
  const lo = Math.min(...vals, s.mean - s.threshold) * 0.97;
  const hi = Math.max(...vals, s.mean + s.threshold) * 1.03 || 1;
  const x = (i: number) => (n <= 1 ? W / 2 : (i / (n - 1)) * W);
  const y = (v: number) => H - 4 - ((v - lo) / (hi - lo || 1)) * (H - 8);
  const { ref, i, onMove, onLeave } = useHover(n);
  const runStart = n - s.run;

  // Línea en tramos (se corta donde no hay dato)
  const segs: string[] = [];
  let cur = "";
  s.series.forEach((v, k) => {
    if (v === null) {
      if (cur) segs.push(cur);
      cur = "";
    } else cur += `${cur ? "L" : "M"}${x(k).toFixed(1)},${y(v).toFixed(1)}`;
  });
  if (cur) segs.push(cur);

  const hv = i !== null ? s.series[i] : null;
  return (
    <div className="relative">
      <svg
        ref={ref}
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        className="block h-auto w-full touch-none"
        style={{ height: H }}
        onPointerMove={onMove}
        onPointerDown={onMove}
        onPointerLeave={onLeave}
        role="img"
        aria-label={`${s.label}: ${s.off ? `off usual for ${s.run} days` : "within usual range"}`}
      >
        <rect x={0} y={y(s.mean + s.threshold)} width={W} height={Math.max(1, y(s.mean - s.threshold) - y(s.mean + s.threshold))} fill="var(--color-moss)" opacity={0.12} />
        <line x1={0} x2={W} y1={y(s.mean)} y2={y(s.mean)} stroke="var(--color-moss)" strokeWidth={1} strokeDasharray="3 3" opacity={0.6} vectorEffect="non-scaling-stroke" />
        {s.off && s.run > 0 && <rect x={x(runStart) - 4} y={0} width={W - x(runStart) + 4} height={H} fill={tone} opacity={0.08} />}
        {segs.map((d, k) => (
          <path key={k} d={d} pathLength={1} className="draw" fill="none" stroke="var(--color-pine)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        ))}
        {s.series.map((v, k) =>
          v !== null && s.off && k >= runStart ? <circle key={k} cx={x(k)} cy={y(v)} r={3.2} fill={tone} stroke="#fff" strokeWidth={1.5} vectorEffect="non-scaling-stroke" /> : null,
        )}
        {i !== null && (
          <>
            <line x1={x(i)} x2={x(i)} y1={0} y2={H} stroke="var(--color-pine)" strokeWidth={1} opacity={0.35} vectorEffect="non-scaling-stroke" />
            {hv !== null && <circle cx={x(i)} cy={y(hv)} r={4} fill="var(--color-pine)" stroke="#fff" strokeWidth={2} vectorEffect="non-scaling-stroke" />}
          </>
        )}
      </svg>
      {i !== null && (
        <div
          className="pointer-events-none absolute -top-2 z-10 -translate-y-full rounded-md bg-pine-deep px-2.5 py-1.5 text-xs text-white shadow-lg"
          style={{ left: `clamp(0px, calc(${(n <= 1 ? 0.5 : i / (n - 1)) * 100}% - 70px), calc(100% - 140px))`, width: 140 }}
        >
          <p className="font-semibold">{dates[i] ? fmtDay(dates[i]) : ""}</p>
          <p>
            {hv === null ? "No data" : `${fmtNum(hv, s.digits)}${s.unit && s.unit !== "/day" ? " " + s.unit : ""}`}
            <span className="opacity-70"> · usual {fmtNum(s.mean, s.digits)}</span>
          </p>
        </div>
      )}
    </div>
  );
}

// Evolución del grupo: personas por estado cada día (barras apiladas)
const STACK = [
  { key: "high", label: "High risk or crisis", color: "var(--color-lingon)" },
  { key: "early", label: "Early signs", color: "var(--color-cloudberry)" },
  { key: "stable", label: "Stable", color: "var(--color-moss)" },
  { key: "learning", label: "Learning baseline", color: "#b9c4be" },
] as const;
export type DayCount = { date: string; high: number; early: number; stable: number; learning: number };

export function CohortChart({ days }: { days: DayCount[] }) {
  const W = 600;
  const H = 150;
  const n = days.length;
  const max = Math.max(1, ...days.map((d) => d.high + d.early + d.stable + d.learning));
  const bw = W / n;
  const { ref, i, onMove, onLeave } = useHover(n);
  return (
    <div>
      <ul className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-sm">
        {STACK.map((s) => (
          <li key={s.key} className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: s.color }} />
            {s.label}
          </li>
        ))}
      </ul>
      <div className="relative">
        <svg ref={ref} viewBox={`0 0 ${W} ${H}`} className="block w-full touch-none" onPointerMove={onMove} onPointerDown={onMove} onPointerLeave={onLeave} role="img" aria-label="People by status over the last two weeks">
          {[0.5, 1].map((f) => (
            <line key={f} x1={0} x2={W} y1={H - 18 - f * (H - 26)} y2={H - 18 - f * (H - 26)} stroke="var(--color-mist)" strokeWidth={1} />
          ))}
          {days.map((d, k) => {
            let acc = 0;
            return (
              <g key={d.date} opacity={i === null || i === k ? 1 : 0.55}>
                {[...STACK].reverse().map((s) => {
                  const v = d[s.key];
                  if (!v) return null;
                  const h = (v / max) * (H - 26);
                  const yTop = H - 18 - acc - h;
                  acc += h;
                  return <rect key={s.key} x={k * bw + bw * 0.18} y={yTop + 1} width={bw * 0.64} height={Math.max(0, h - 2)} rx={2} fill={s.color} />;
                })}
                {(k % 2 === 0 || k === n - 1) && (
                  <text x={k * bw + bw / 2} y={H - 4} textAnchor="middle" fontSize={11} fill="#6b7b74">
                    {new Date(d.date + "T12:00:00Z").getUTCDate()}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
        {i !== null && days[i] && (
          <div
            className="pointer-events-none absolute top-0 z-10 rounded-md bg-pine-deep px-3 py-2 text-xs text-white shadow-lg"
            style={{ left: `clamp(0px, calc(${((i + 0.5) / n) * 100}% - 80px), calc(100% - 160px))`, width: 160 }}
          >
            <p className="mb-1 font-semibold">{fmtDay(days[i].date)}</p>
            {STACK.map((s) => (
              <p key={s.key} className="num flex justify-between gap-2">
                <span>{s.label}</span>
                <span>{days[i][s.key]}</span>
              </p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
