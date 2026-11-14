"use client";
// Pestaña "Me": perfil, consentimiento, fuentes de datos y derechos (ver, descargar, borrar)

import { useState } from "react";
import { Button, ErrorText, api } from "../../ui";
import { useMe } from "../AppShell";

export default function MePage() {
  const { me, reload } = useMe();
  const u = me.user;
  const consented = !!u.consent && !u.consent.revokedAt;
  const [availability, setAvailability] = useState(u.availability);
  const [story, setStory] = useState(u.story);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  async function act(body: Record<string, unknown>) {
    try {
      await api("/api/app/me", body);
      await reload();
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <div className="flex flex-col gap-6 p-4 pb-10">
      <div>
        <h1 className="font-display text-3xl font-bold">{u.name}</h1>
        <p className="text-pine/75">
          {u.role === "mentor" ? "Mentor" : "In treatment"} at {me.clinic?.name}
          {u.email ? ` (${u.email})` : ""}
        </p>
      </div>
      <ErrorText>{error}</ErrorText>

      {u.role === "mentor" && (
        <Section title="As a mentor">
          <label className="block text-sm">
            <span className="font-bold">When are you usually available?</span>
            <input value={availability} onChange={(e) => setAvailability(e.target.value)} placeholder="e.g. Weekdays 17–20" className="mt-1 w-full rounded-xl border border-mist px-3 py-2" />
          </label>
          <label className="mt-3 block text-sm">
            <span className="font-bold">Your story in one sentence</span>
            <input value={story} onChange={(e) => setStory(e.target.value)} placeholder="e.g. Finished TMS in spring; walks helped me most." className="mt-1 w-full rounded-xl border border-mist px-3 py-2" />
          </label>
          <div className="mt-3 flex items-center gap-3">
            <Button
              onClick={async () => {
                await act({ action: "profile", availability, story });
                setSaved(true);
              }}
            >
              Save
            </Button>
            {saved && <span className="text-sm">Saved</span>}
          </div>
          <div className="mt-5 border-t border-mist pt-4">
            <p className="font-bold">{u.paused ? "Mentoring is paused" : "Need a break?"}</p>
            <p className="mt-1 text-sm text-pine/75">
              You mentor one person at a time and can step back whenever you want. The clinic is told and covers for you.
            </p>
            <Button kind="line" className="mt-2" onClick={() => act({ action: "pause", paused: !u.paused })}>
              {u.paused ? "Resume mentoring" : "Pause mentoring"}
            </Button>
          </div>
        </Section>
      )}

      <Section title="Your consent">
        {consented ? (
          <p className="text-sm">
            You agreed on {new Date(u.consent!.at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })} that Relay may notice changes in
            how you use the app, so your {u.role === "mentor" ? "clinic" : "mentor and clinic"} can reach out at the right moment.
          </p>
        ) : (
          <p className="text-sm">Consent is withdrawn. Relay collects no signals about you; chat still works.</p>
        )}
        <Button kind="line" className="mt-3" onClick={() => act({ action: "consent", give: !consented })}>
          {consented ? "Withdraw consent" : "Give consent again"}
        </Button>
      </Section>

      <Section title="Data sources">
        <Source name="Activity in Relay" detail="How often you open the app, replies and reply times, use after midnight." on={consented} badge="Real" />
        <Source name="Apple Health / Google Fit" detail="Sleep, steps and heart rate. Coming with the native app." on={false} badge="Soon" />
        <Source name="Smart ring or watch" detail="Heart rate variability and sleep. Optional, coming with the native app." on={false} badge="Soon" />
        {u.demo && <Source name="Sample health data" detail="This test account includes 3 weeks of example sleep, steps and outings." on badge="Test account" />}
        <p className="mt-3 text-xs text-pine/65">
          Your mentor never sees any of this. They only get a suggestion of what to do. The clinic sees one line when someone may need a call.
        </p>
      </Section>

      <Section title="Your data">
        <a href="/api/app/export" className="inline-block rounded-full border border-pine px-4 py-2.5 text-sm font-bold">
          Download my data
        </a>
        <p className="mt-3 text-sm text-pine/75">Deleting your account removes your profile, signals and conversations for good.</p>
        <Button
          kind="danger"
          className="mt-2"
          onClick={async () => {
            if (!confirm("Delete your Relay account and all your data? This can't be undone.")) return;
            await api("/api/app/me", { action: "delete" });
            window.location.href = "/";
          }}
        >
          Delete my account
        </Button>
      </Section>

      <Button
        kind="ghost"
        onClick={async () => {
          await api("/api/app/auth", { action: "logout" });
          window.location.href = "/";
        }}
      >
        Log out
      </Button>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-2 font-display text-xl font-bold">{title}</h2>
      {children}
    </section>
  );
}

function Source({ name, detail, on, badge }: { name: string; detail: string; on: boolean; badge: string }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-mist py-2.5 last:border-0">
      <div>
        <p className="font-bold">{name}</p>
        <p className="text-sm text-pine/70">{detail}</p>
      </div>
      <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold ${on ? "bg-moss text-paper" : "bg-mist text-pine"}`}>{badge}</span>
    </div>
  );
}
