"use client";
// La app tal como se ve en el móvil de Laura (/pupil) o de Mikko (/mentor)

import { Loading, MentorScreen, PupilScreen, useWorld } from "./screens";

export default function MobileApp({ role }: { role: "pupil" | "mentor" }) {
  const { world: w, view: v, dispatch } = useWorld();
  const Screen = role === "pupil" ? PupilScreen : MentorScreen;
  return (
    <main className="mx-auto flex h-dvh w-full max-w-md flex-col bg-paper sm:border-x sm:border-mist">
      <p className="bg-pine px-4 py-1.5 font-display text-sm font-bold text-paper">Relay</p>
      {w && v ? <Screen w={w} v={v} dispatch={dispatch} /> : <Loading />}
    </main>
  );
}
