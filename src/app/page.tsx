import Link from "next/link";
import { Logo } from "./ui";

// MOCK: cuentas de prueba (ver src/lib/app/seed.ts)
const TEST_ACCOUNTS = [
  { email: "mikko@relay.demo", who: "Mentor. His mentee Laura shows early signs today." },
  { email: "laura@relay.demo", who: "In TMS treatment, mentored by Mikko." },
  { email: "aino@relay.demo", who: "Mentor who once mentored Mikko: the relay." },
  { email: "clinic@relay.demo", who: "Clinic team dashboard." },
];

export default function Landing() {
  return (
    <main className="mx-auto w-full max-w-3xl px-5 py-10 sm:py-16">
      <Logo className="text-3xl" />
      <h1 className="mt-10 max-w-2xl font-display text-5xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl">
        Every patient who gets better becomes the support for the next one.
      </h1>
      <p className="mt-5 max-w-xl text-lg text-pine/80">
        Relay keeps people well at home after TMS for depression. Someone who has just finished treatment mentors someone who is starting. Relay notices
        quiet changes in routine and tells the mentor one simple thing to do. Anything serious goes straight to the clinic.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/join" className="rounded-full bg-pine px-6 py-3 font-bold text-paper">
          I have an invite code
        </Link>
        <Link href="/login" className="rounded-full border border-pine px-6 py-3 font-bold">
          Log in
        </Link>
      </div>

      <section className="mt-14 rounded-3xl border-2 border-cloudberry bg-paper p-6">
        <h2 className="font-display text-2xl font-bold">Try it with a test account</h2>
        <p className="mt-1 text-pine/75">
          Password for all of them: <code className="rounded bg-birch px-1.5 py-0.5 font-bold">relay-demo</code>. Test data resets every day.
        </p>
        <ul className="mt-4 divide-y divide-mist">
          {TEST_ACCOUNTS.map((a) => (
            <li key={a.email} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-2.5">
              <Link href={`/login?email=${encodeURIComponent(a.email)}`} className="font-bold underline underline-offset-4">
                {a.email}
              </Link>
              <span className="text-sm text-pine/75">{a.who}</span>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-sm text-pine/70">
          Tip: open Mikko on one phone and Laura on another, and message each other. On a phone, choose &ldquo;Add to Home Screen&rdquo; to install Relay.
        </p>
      </section>

      <p className="mt-10 text-sm text-pine/65">
        Built at Junction 2026 for Aalto University&apos;s Beyond the Clinic challenge. Sleep and step data in test accounts are samples; activity in the app is
        real. <Link href="/demo" className="underline underline-offset-4">Presenter demo</Link>
      </p>
    </main>
  );
}
