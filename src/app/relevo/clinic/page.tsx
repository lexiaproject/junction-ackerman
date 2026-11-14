"use client";
// Web de escritorio de la clínica (desde 1280 px)
import ClinicWeb from "../ClinicWeb";
import { useView, useWid } from "../kit";

export default function ClinicPage() {
  const w = useWid();
  const { data } = useView<{ clock: { date: string; time: string } }>(w ? `/api/relevo/demo?w=${w}` : null, 6000);
  if (!w) return null;
  return (
    <div className="h-dvh min-w-[1100px]">
      <ClinicWeb w={w} clockLabel={data ? `Demo time: ${data.clock.date} · ${data.clock.time}` : undefined} />
    </div>
  );
}
