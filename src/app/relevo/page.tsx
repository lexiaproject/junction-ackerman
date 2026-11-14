// Entrada de Relevo: qué es y las cuatro puertas (demo, acompañado, mentor, clínica)
import Link from "next/link";

const DOORS = [
  { href: "/relevo/demo", title: "Open the demo", text: "Luis's phone, Pablo's phone and the clinic side by side, with a day slider and the engine explained.", primary: true },
  { href: "/relevo/app?as=luis", title: "Luis's app", text: "Just finished TMS. Nothing to do: listen, accept a plan or close." },
  { href: "/relevo/app?as=pablo", title: "Pablo's app", text: "Four months after TMS. At most one small action a day." },
  { href: "/relevo/clinic", title: "Clinic web", text: "Who do we call today? The only place where data is shown." },
];

export default function RelevoHome() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center px-5 py-12">
      <p className="text-[22px] font-semibold" style={{ fontFamily: "var(--rv-display)" }}>Relevo</p>
      <h1 className="mt-6 max-w-[17ch] text-[44px] leading-[1.04] sm:text-[60px]">Recovery that passes forward.</h1>
      <p className="rv-muted mt-5 max-w-[60ch] text-[17px]">
        A chain of TMS patients. Each person is accompanied by someone a few months ahead, and later accompanies someone behind. The phone notices early changes quietly; nobody gets an alarm, a human gets a nudge to reach out. Only the clinic ever sees data.
      </p>
      <div className="mt-10 grid gap-3 sm:grid-cols-2">
        {DOORS.map((d) => (
          <Link key={d.href} href={d.href} className={`group rounded-[22px] p-5 transition-colors ${d.primary ? "bg-rv-teal text-white hover:bg-rv-teal-deep" : "rv-card hover:bg-[#fbfcfa]"}`}>
            <p className="text-[20px] font-semibold" style={{ fontFamily: "var(--rv-display)" }}>{d.title}</p>
            <p className={`mt-1 text-[14.5px] ${d.primary ? "text-white/85" : "rv-muted"}`}>{d.text}</p>
          </Link>
        ))}
      </div>
      <p className="rv-muted mt-8 text-[13px]">Sensor data in this demo is simulated. Voice notes, transcription, the copilot, the crisis filter, the risk engine, notices and learning are real.</p>
    </main>
  );
}
