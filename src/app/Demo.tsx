"use client";
// Sala de control del presentador: los dos móviles, lo que ve el sistema y los botones para avanzar días.
// Usa el mismo estado compartido que /pupil, /mentor y /clinic, así que todo se mueve a la vez.

import { MENTOR, PUPIL } from "@/lib/data";
import { Loading, MentorScreen, Phone, PupilScreen, SystemPanel, Timeline, useWorld } from "./screens";

export default function Demo() {
  const { world: w, view: v, dispatch, busy } = useWorld();

  return (
    <main className="mx-auto w-full max-w-[1280px] px-4 py-6 sm:px-6 lg:py-10">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-5xl font-extrabold tracking-tight sm:text-6xl">Relay</h1>
          <p className="mt-1 max-w-xl text-lg">Every patient who gets better becomes the support for the next one.</p>
        </div>
        <div className="max-w-sm text-sm">
          <p className="text-pine/70">Simulated sensor data. Pattern detection, AI suggestions, chat and screens are real.</p>
          <p className="mt-2">
            Open on a phone:{" "}
            <a className="font-bold underline" href="/mentor" target="_blank">
              mentor
            </a>
            ,{" "}
            <a className="font-bold underline" href="/pupil" target="_blank">
              pupil
            </a>{" "}
            or{" "}
            <a className="font-bold underline" href="/clinic" target="_blank">
              clinic
            </a>
            .
          </p>
        </div>
      </header>

      {!w || !v ? (
        <Loading />
      ) : (
        <div className="grid gap-8 sm:grid-cols-2 xl:grid-cols-[300px_1fr_300px] xl:items-start">
          <Phone caption={`${PUPIL}'s phone`} sub="In TMS treatment. Doesn't need to do anything." href="/pupil">
            <PupilScreen w={w} v={v} dispatch={dispatch} />
          </Phone>

          <section className="order-first sm:col-span-2 xl:order-none xl:col-span-1">
            <Timeline v={v} w={w} busy={busy} dispatch={dispatch} />
            <div className="mt-6">
              <SystemPanel w={w} v={v} busy={busy} />
            </div>
          </section>

          <Phone caption={`${MENTOR}'s phone`} sub="Finished TMS in September. Mentors Laura." href="/mentor">
            <MentorScreen w={w} v={v} dispatch={dispatch} />
          </Phone>
        </div>
      )}
    </main>
  );
}
