"use client";
// Gráficos de la clínica (C2) y de la capa de explicación. SVG propio: líneas de 2 px, banda de su normalidad,
// rejilla discreta, un solo eje por gráfico y tooltip al pasar el ratón o tocar.
import { useState } from "react";

export const LEVEL_COLOR = ["#6B7280", "#B45309", "#C2410C", "#B91C1C"];
export const LEVEL_TEXT = ["Stable", "Early signs", "High risk", "Severe"];

type Line = { values: (number | null)[]; color: string; label: string; width?: number; dashed?: boolean; dots?: boolean };
export function LineChart({
  labels, lines, band, thresholds = [], height = 150, yMin, yMax, unit = "", digits = 1, highlight = false, steps, marker, ariaLabel,
}: {
  labels: string[]; lines: Line[]; band?: { lo: number | null; hi: number | null; mid?: number | null } | null; thresholds?: { v: number; label: string; color?: string }[];
  height?: number; yMin?: number; yMax?: number; unit?: string; digits?: number; highlight?: boolean; steps?: number[]; marker?: number; ariaLabel: string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 560;
  const H = height;
  const padL = 34;
  const padR = 10;
  const padT = 8;
  const stepH = steps ? 16 : 0;
  const padB = 18 + stepH;
  const all = lines.flatMap((l) => l.values).filter((v): v is number => v !== null);
  const extra = [...thresholds.map((t) => t.v), band?.lo ?? null, band?.hi ?? null].filter((v): v is number => v !== null);
  let lo = yMin ?? Math.min(...all, ...extra);
  let hi = yMax ?? Math.max(...all, ...extra);
  if (!Number.isFinite(lo) || !Number.isFinite(hi)) {
    lo = 0;
    hi = 1;
  }
  if (hi - lo < 1e-6) hi = lo + 1;
  const span = hi - lo;
  if (yMin === undefined) lo -= span * 0.08;
  if (yMax === undefined) hi += span * 0.08;
  const n = labels.length;
  const x = (i: number) => padL + (n <= 1 ? 0 : (i / (n - 1)) * (W - padL - padR));
  const y = (v: number) => padT + (1 - (v - lo) / (hi - lo)) * (H - padT - padB);
  const path = (vals: (number | null)[]) => {
    let d = "";
    let pen = false;
    vals.forEach((v, i) => {
      if (v === null) return void (pen = false);
      d += `${pen ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`;
      pen = true;
    });
    return d;
  };
  const ticks = [lo + (hi - lo) * 0.15, lo + (hi - lo) * 0.5, lo + (hi - lo) * 0.85];
  const fmt = (v: number | null) => (v === null ? "—" : v.toLocaleString("en-GB", { maximumFractionDigits: digits, minimumFractionDigits: digits > 0 && Math.abs(v) < 10 ? Math.min(digits, 1) : 0 }));
  return (
    <div className={`relative rounded-2xl transition-shadow ${highlight ? "shadow-[0_0_0_2px_var(--color-rv-teal)]" : ""}`}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="block w-full touch-none select-none"
        role="img"
        aria-label={ariaLabel}
        onPointerMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          const px = ((e.clientX - r.left) / r.width) * W;
          setHover(Math.max(0, Math.min(n - 1, Math.round(((px - padL) / (W - padL - padR)) * (n - 1)))));
        }}
        onPointerLeave={() => setHover(null)}
      >
        {ticks.map((t, i) => (
          <g key={i}>
            <line x1={padL} x2={W - padR} y1={y(t)} y2={y(t)} stroke="#e7ebe7" strokeWidth={1} />
            <text x={padL - 6} y={y(t) + 3.5} textAnchor="end" fontSize={10} fill="#7b8782">{fmt(t)}</text>
          </g>
        ))}
        {band && band.lo !== null && band.hi !== null && (
          <>
            <rect x={padL} y={y(band.hi)} width={W - padL - padR} height={Math.max(1, y(band.lo) - y(band.hi))} fill="#0E6B5C" opacity={0.08} />
            {band.mid !== undefined && band.mid !== null && <line x1={padL} x2={W - padR} y1={y(band.mid)} y2={y(band.mid)} stroke="#0E6B5C" strokeOpacity={0.35} strokeDasharray="3 4" />}
          </>
        )}
        {thresholds.map((t) => (
          <g key={t.label}>
            <line x1={padL} x2={W - padR} y1={y(t.v)} y2={y(t.v)} stroke={t.color ?? "#9aa39e"} strokeDasharray="4 4" strokeWidth={1} />
            <text x={W - padR - 2} y={y(t.v) - 3} textAnchor="end" fontSize={9.5} fill={t.color ?? "#7b8782"}>{t.label}</text>
          </g>
        ))}
        {marker !== undefined && marker >= 0 && marker < n && <line x1={x(marker)} x2={x(marker)} y1={padT} y2={H - padB} stroke="#9aa39e" strokeDasharray="2 3" />}
        {lines.map((l) => (
          <g key={l.label}>
            <path d={path(l.values)} fill="none" stroke={l.color} strokeWidth={l.width ?? 2} strokeLinejoin="round" strokeLinecap="round" strokeDasharray={l.dashed ? "5 4" : undefined} />
            {l.dots && l.values.map((v, i) => (v === null ? null : <circle key={i} cx={x(i)} cy={y(v)} r={2} fill={l.color} opacity={0.55} />))}
          </g>
        ))}
        {steps && steps.map((lv, i) => (
          <rect key={i} x={x(i) - (W - padL - padR) / Math.max(1, n - 1) / 2} y={H - stepH - 2} width={(W - padL - padR) / Math.max(1, n - 1) + 0.5} height={10} fill={LEVEL_COLOR[lv]} opacity={lv === 0 ? 0.18 : 0.85} />
        ))}
        {[0, Math.floor((n - 1) / 2), n - 1].filter((v, i, a) => a.indexOf(v) === i && v >= 0).map((i) => (
          <text key={i} x={x(i)} y={H - 4} textAnchor={i === 0 ? "start" : i === n - 1 ? "end" : "middle"} fontSize={10} fill="#7b8782">{labels[i]}</text>
        ))}
        {hover !== null && (
          <g>
            <line x1={x(hover)} x2={x(hover)} y1={padT} y2={H - padB} stroke="#16211C" strokeOpacity={0.25} />
            {lines.map((l) => (l.values[hover] === null ? null : <circle key={l.label} cx={x(hover)} cy={y(l.values[hover]!)} r={4} fill="#fff" stroke={l.color} strokeWidth={2} />))}
          </g>
        )}
      </svg>
      {hover !== null && (
        <div className="pointer-events-none absolute top-1 z-10 rounded-xl bg-rv-ink px-2.5 py-1.5 text-[12px] text-white shadow-lg" style={{ left: `${Math.min(70, Math.max(2, (x(hover) / W) * 100 - 10))}%` }}>
          <p className="font-semibold">{labels[hover]}</p>
          {lines.map((l) => (
            <p key={l.label} className="rv-num flex items-center gap-1.5">
              <span className="h-0.5 w-3 rounded" style={{ background: l.color }} />
              {l.label}: {fmt(l.values[hover])}{unit}
            </p>
          ))}
          {steps && <p>Level: {steps[hover]} {LEVEL_TEXT[steps[hover]]}</p>}
        </div>
      )}
    </div>
  );
}

/** Desviación actual por dominio: barras horizontales con la línea del umbral (1,5). */
export function DomainBars({ domains, threshold, highlight }: { domains: { key: string; label: string; s: number | null; smooth: number | null; feats: number }[]; threshold: number; highlight?: string | null }) {
  const max = Math.max(4, ...domains.map((d) => Math.abs(d.s ?? 0)));
  const pct = (v: number) => (Math.max(0, v) / max) * 100;
  return (
    <div className="flex flex-col gap-2.5 py-1">
      {domains.map((d) => (
        <div key={d.key} className={`rounded-lg px-1 ${highlight === d.key ? "bg-rv-sage" : ""}`}>
          <div className="mb-1 flex justify-between text-[12.5px]">
            <span className="font-semibold">{d.label}</span>
            <span className="rv-num rv-muted">{d.s === null ? "data not available" : `s ${d.s.toFixed(2)} · smoothed ${d.smooth?.toFixed(2) ?? "—"}`}</span>
          </div>
          <div className="relative h-2.5 rounded-full bg-[#eef1ee]">
            {d.s !== null && <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${pct(d.s)}%`, background: (d.s ?? 0) >= threshold ? "#C2410C" : "#0E6B5C" }} />}
            <div className="absolute -inset-y-1 w-0.5 rounded bg-rv-ink/60" style={{ left: `${pct(threshold)}%` }} title={`Threshold ${threshold}`} />
          </div>
        </div>
      ))}
      <p className="rv-muted text-[11.5px]">Line at {threshold}: area threshold (needs ≥ 2 features).</p>
    </div>
  );
}
