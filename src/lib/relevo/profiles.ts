// Perfiles de las personas de la demo (personajes ficticios): biografía en primera persona, "lo que me ayudó" y gustos.
// Los escribe cada persona y son opcionales; nunca llevan datos de salud. MOCK: en la demo están fijos aquí.
export type Profile = { bio: string; helped?: string; likes: string[] };

export const PROFILE: Record<string, Profile> = {
  Luis: { bio: "Just finished TMS. Graphic designer, lifelong football fan, slowly getting back to my morning walks.", likes: ["walks", "football", "coffee", "music"] },
  Pablo: { bio: "Finished TMS in May. I walk my dog Toby by the shore every morning, I'm a terrible cook and a decent listener.", helped: "Getting outside before 10, even for five minutes.", likes: ["walks", "dogs", "coffee", "football"] },
  Marta: { bio: "Finished TMS two years ago. Primary school teacher, choir on Thursdays, always up for a sauna.", helped: "Saying yes to one small plan a day.", likes: ["singing", "sauna", "walks", "coffee"] },
  Sara: { bio: "Finished TMS last year. Night owl turned early bird, crosswords and long baths.", helped: "Keeping the same bedtime, even at weekends.", likes: ["puzzles", "reading", "coffee"] },
  Anna: { bio: "Nurse at Aalto TMS Clinic for eight years. When your clinic team checks in, I'm usually the one who calls.", likes: [] },
};

const SHARED: Record<string, string> = {
  walks: "You both like a good walk", football: "You both follow football", coffee: "You both enjoy a slow coffee", dogs: "You both love dogs",
  music: "You both love music", sauna: "You both like sauna", singing: "You both sing", puzzles: "You both like puzzles", reading: "You both read",
};

/** Cosas en común entre dos personas, en frases cortas. */
export function inCommon(a: string, b: string): string[] {
  const other = PROFILE[b]?.likes ?? [];
  return (PROFILE[a]?.likes ?? []).filter((x) => other.includes(x)).map((x) => SHARED[x]);
}
