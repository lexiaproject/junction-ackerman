import Link from "next/link";
import TryButtons from "./TryButtons";
import { Logo } from "./ui";

const LOOP = [
  { title: "Sense", text: "Relay notices how someone uses the app: replies, reply times, late nights. Later also sleep and steps." },
  { title: "Compare", text: "Each person is compared only with their own usual week. One bad day is ignored; a change that lasts is not." },
  { title: "Suggest", text: "The mentor gets one concrete idea and a message to send. Never the data. Anything serious goes to the clinic." },
  { title: "Learn", text: "If the routine recovers after a walk or a coffee, Relay remembers what works for that pair." },
];

export default function Landing() {
  return (
    <main className="topo w-full">
      <div className="brand-rule" />
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-5">
        <Logo className="text-2xl" />
        <nav className="flex items-center gap-2">
          <Link href="/join" className="btn btn-quiet btn-sm">
            I have a code
          </Link>
          <Link href="/login" className="btn btn-secondary btn-sm">
            Log in
          </Link>
        </nav>
      </header>

      <section className="mx-auto grid w-full max-w-6xl items-center gap-12 px-5 pb-20 pt-8 lg:grid-cols-[1.1fr_0.9fr] lg:pt-14">
        <div className="stagger">
          <p className="muted text-sm font-medium">Maintenance at home after TMS for depression</p>
          <h1 className="mt-3 text-[2.6rem] font-extrabold leading-[1.04] tracking-[-0.03em] sm:text-6xl">
            Every patient who gets better becomes the support for the next one.
          </h1>
          <p className="muted mt-6 max-w-xl text-lg leading-relaxed">
            When daily clinic visits end, the risk is that depression returns, and people stop opening apps right when they need help most. In Relay, someone
            who just finished TMS mentors someone who is starting. Relay tells the mentor when to reach out and what to do.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a href="#try" className="btn btn-primary btn-lg">
              Try it now
            </a>
            <Link href="/join" className="btn btn-secondary btn-lg">
              Join with an invite code
            </Link>
          </div>
        </div>
        <Preview />
      </section>

      <section className="border-y border-mist bg-paper">
        <div className="mx-auto w-full max-w-6xl px-5 py-14">
          <h2 className="text-2xl font-bold sm:text-3xl">How Relay works</h2>
          <ol className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {LOOP.map((s, i) => (
              <li key={s.title} className="border-t-2 border-pine pt-4">
                <p className="num text-sm font-semibold text-cloudberry-ink">Step {i + 1}</p>
                <h3 className="mt-1 text-lg font-bold">{s.title}</h3>
                <p className="muted mt-1.5">{s.text}</p>
              </li>
            ))}
          </ol>
          <p className="muted mt-8 max-w-3xl">
            Helping is also the mentor&apos;s own maintenance: responsibility, routine and contact. Relay watches the mentor&apos;s routine too, and if they
            struggle, mentoring pauses and their own former mentor is asked to check in.
          </p>
        </div>
      </section>

      <section id="try" className="mx-auto grid w-full max-w-6xl gap-10 px-5 py-14 lg:grid-cols-[0.8fr_1.2fr]">
        <div>
          <h2 className="text-2xl font-bold sm:text-3xl">Try it with a test account</h2>
          <p className="muted mt-3">
            One click, no password. The test clinic has ten people with three weeks of history, and it resets every day.
          </p>
          <p className="muted mt-3">
            Best experience: open Mikko on one phone and Laura on another, then send the suggested invitation. On a phone, choose &ldquo;Add to Home
            Screen&rdquo; to install Relay.
          </p>
        </div>
        <TryButtons />
      </section>

      <footer className="border-t border-mist">
        <div className="muted mx-auto flex w-full max-w-6xl flex-wrap justify-between gap-3 px-5 py-6 text-sm">
          <p>Built at Junction 2026 for Aalto University&apos;s Beyond the Clinic challenge.</p>
          <p>
            Activity in the app is real; sleep and steps in test accounts are samples.{" "}
            <Link href="/demo" className="underline underline-offset-4">
              Presenter demo
            </Link>
          </p>
        </div>
      </footer>
    </main>
  );
}

// Vista previa estática de la tarjeta que recibe el mentor (mismo estilo que la app)
function Preview() {
  return (
    <div className="arrive relative mx-auto w-full max-w-sm" aria-hidden>
      <div className="absolute -inset-10 -z-10 rounded-full bg-[radial-gradient(closest-side,rgb(194_122_23/0.18),transparent)] blur-2xl" />
      <div className="card overflow-hidden shadow-[0_30px_60px_-30px_rgb(14_35_31/0.4)]">
        <div className="flex items-center justify-between border-b border-mist px-4 py-2.5">
          <Logo className="text-base" />
          <span className="btn btn-sm btn-danger-outline pointer-events-none">Get help</span>
        </div>
        <div className="bg-birch p-4">
          <p className="muted text-xs">Saturday</p>
          <p className="text-xl font-bold">Hi Mikko</p>
          <div className="card card-status mt-3 p-4 pl-5" style={{ "--status": "var(--color-cloudberry)" } as React.CSSProperties}>
            <p className="muted text-xs">Suggested for today</p>
            <p className="mt-0.5 font-bold leading-snug">Laura might be having a quieter week</p>
            <p className="mt-2 rounded-md bg-birch px-2.5 py-1.5 text-sm font-semibold">A short walk together</p>
            <p className="mt-3 rounded-lg border border-line px-3 py-2 text-sm">I&apos;m heading out for a walk tomorrow at 10. Want to join me for 20 minutes?</p>
            <span className="btn btn-primary btn-sm pointer-events-none mt-3 w-full">Send to Laura</span>
          </div>
          <div className="card mt-3 px-4 py-3 text-sm">
            <p className="font-semibold">What has helped Laura before</p>
            <p className="muted">A short walk together, a coffee together</p>
          </div>
        </div>
      </div>
      <div className="card absolute -bottom-16 -left-10 hidden w-56 p-3 text-sm sm:block">
        <p className="muted text-xs">Clinic sees</p>
        <p className="mt-0.5 font-semibold">Replies and sleep off Laura&apos;s usual for 3 days. Mentor reached out.</p>
      </div>
    </div>
  );
}
