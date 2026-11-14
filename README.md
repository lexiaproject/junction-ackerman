# Relevo — recovery that passes forward

**Junction 2026 · Aalto challenge "Beyond the Clinic": home maintenance after TMS for depression.**

Relevo is a chain of TMS patients. Each person who has just finished TMS is accompanied by a peer mentor who finished
a few months earlier, and later becomes a mentor for someone behind. Relevo quietly compares each person with their
own usual in three areas the clinic cares about: sleep, mobility and, with a watch or ring, physiology. When something drifts, nobody gets an alarm: a human gets a small,
private nudge to reach out. **Only the clinic ever sees health data.** Mentors only receive the voice notes sent to them.

## ▶ Live demo

### **[junction-ackerman.vercel.app/relevo/demo](https://junction-ackerman.vercel.app/relevo/demo)**

Three surfaces side by side (Luis's phone, his mentor Pablo's phone, the clinic web), a day slider, and a
**"Show how Relevo decides"** layer that shows what the engine computed behind each screen.
Press **Next moment** (or the arrow keys) to walk through the story: 15 moments, grouped into the 9 steps below.
Presenting it? See the 3-minute script, checklist and plan B in [docs/DEMO.md](docs/DEMO.md).

## The problem

TMS works for many people with depression, but the course ends after a few weeks and the person goes home. The months
after are when relapse risk is high, and the clinic only sees the person again when things are already bad. Patients
don't want to be watched by an app, and clinics can't call everyone every week. Relevo tries to catch the early drift
and answer it with a person who has been there, not with a red notification.

## The demo in 9 steps

Day 0 is 7 September, the day after Luis's last TMS session. The contract numbers below (0.886, 0.772, 0.62 → 0.70, 90 %, 6 days, 2.37, 1,000) are checked automatically by `scripts/relevo-demo-walk.mjs` against the running app.

1. **Day 0 · Matching.** The clinic proposes a mentor for Luis: affinity **0.886** with Pablo vs **0.772** with Sara.
   Pablo accepts and records an intro.
2. **Days 27-40 · His own usual, then the copilot.** For four weeks Relevo only learns Luis's usual. Then the copilot: Luis's third voice note in a complaint loop → Pablo gets a private tip on how to reply.
   Luis sees nothing.
3. **Day 47 · Two-step ask.** Luis has been drifting for three days (level 1). Pablo is asked first, privately. Only after
   he says "Yes" does Luis read "Pablo would like to talk to you". Pablo receives an idea: a walk (drafted by Gemini, or
   by a template if the AI is unavailable).
4. **Days 47-48 · The walk.** Pablo sends it as a voice note, Luis taps "I'm in", then "Good" → the idea's learned
   probability goes **0.62 → 0.70**.
5. **Day 54 · Level 2.** Pablo says "Can't today": he gets no idea for Luis that day. The clinic schedules a call and Luis reads
   "Anna, your nurse, will call you soon" (one push per day at most).
6. **Day 56 · The mentor drifts too.** Pablo starts to drift himself → his own mentor Marta is asked first.
7. **Days 57-59 · Crisis phrase.** A note with a crisis phrase → level 3 immediately: the help sheet opens on Luis's phone,
   a severe alert appears at the clinic, and Pablo gets a calm message telling him he doesn't need to do anything else. Unattended for 15 minutes, it goes
   to the on-call lead. On day 59 the clinic resolves it and Pablo is thanked.
8. **Day 60 · Protecting the mentor.** Pablo is offered a pause, and the clinic sees "Review pace". (A lighter pace is proposed after 5 days at level 1; Pablo
   reaches level 2 after 4, so the demo goes straight to the pause.)
9. **Close · What the simulation shows.** Level 1 catches **90 %** of simulated relapses with a median of **6 days** of
   notice and **2.37 false alarms per person-year**, on **1,000 synthetic people** (500 simulated relapses). Level 2 is much
   stricter: 62 %, 1 day, 0.77 false alarms.
   These figures come from `scripts/relevo-evaluate.mjs`, which runs the engine on synthetic people that we generated
   ourselves, with default thresholds. They show that the logic works as designed, **not** that it predicts relapse in
   real patients; that would need a clinical study. The demo displays them; it does not recompute them.

## What is real and what is simulated

**Real (working code):**
- The risk engine: a deterministic TypeScript port of our Python reference engine (`src/lib/relevo/engine.ts`). Each
  person is compared only with their own baseline; levels 0-3 with persistence rules.
- The simulation of the whole network (`src/lib/relevo/sim.ts`): every action is a timestamped event, replayed minute by
  minute up to the demo clock (daily engine run at 03:15, notices V1-V8 with priorities and "one push a day", idea
  selection by a small learning bandit, mentor pace, crisis path, clinic alerts). Same world + same clock = same result,
  so the slider can go back and forth.
- What each role can see (`src/lib/relevo/views.ts`): the mentee and mentor apps never receive levels, scores or
  sensor features.
- Voice notes recorded in the browser, the crisis-phrase filter, the copilot, the clinic panel and its settings.
- Gemini (`gemini-3.8-flash`) drafts the mentor's idea message and analyses the text of new voice notes for the
  copilot, only for people who turned on note analysis (it can add a crisis flag, never remove one). It never writes anything for the clinic, whose summaries are
  deterministic templates. With no key, or if it fails, the template / rule-based result is used and nothing breaks.

**Simulated / MOCK (marked `// MOCK:` in the code):**
- **Sensor data.** All sleep, mobility and physiology data is synthetic. Luis and Pablo use fixed synthetic data
  tuned so the story falls on the same days; Marta, Sara and five background people are generated. Nothing connects to Apple
  Health, Health Connect or a ring. *Less movement inside the home* is experimental and simulated: it is shown in the
  clinic file but never used for alerts.
- **No login and no roles.** The role comes from the URL (`?as=luis|pablo|marta`) and each demo "world" from an id
  (`?w=`). Anyone with the id can see that world. Every world is synthetic. In production: a session per role, and the
  clinic behind SSO.
- **Scripted story.** The characters' actions in the 8 steps are a fixed script of events; the presenter can also act
  on any phone.
- **Pseudonyms.** Before a note leaves the app, the names of the 9 people in Relevo are replaced by fixed codes (e.g.
  ⟨P-41⟩). This happens in the browser, so the server API itself does not pseudonymise text sent to it directly. Browser dictation (Web Speech API, Chrome) stands in for on-device transcription. Scripted notes have no
  recorded audio and are read aloud by the browser's voice. In production the AI provider would run under a
  data-processing agreement, on a paid tier with no training on our data, in an EU region.
- **Audio encryption is not implemented.** Recorded audio is stored as-is; production would use end-to-end encryption
  with the recipient's key.
- **Clinic and phone number are fictional.** "Aalto TMS Clinic" and "+358 9 4512 3300" are demo values.
- **The crisis list is a short illustrative list.** A real deployment would use a clinically validated phrase list
  reviewed by the clinic, with the AI only ever adding alerts, never removing them. The filter only runs on the notes of people who turned on
  note analysis, and it misses phrasings that are not on the list.
- Relevo does not diagnose, treat or replace emergency services.

## Architecture

Next.js 16 (App Router) with React 19, TypeScript and Tailwind CSS 4. The browser never computes risk: it polls small
API routes (`src/app/api/relevo/*`) that rebuild the world from its event log with the deterministic simulation and
return only what that role may see. The engine is a port of the Python reference and is checked by 33 automated
checks (`scripts/relevo-check.mjs`: same outputs as the Python engine's CSVs, plus the acceptance list). Worlds are
stored in Upstash Redis on Vercel (in local memory when no KV variables are set). Gemini 3.8 Flash is optional, with
template fallbacks everywhere.

## Run it locally (under 5 minutes)

Requires Node.js 20+.

```bash
npm install
npm run dev
```

Open **http://localhost:3000/relevo/demo**. No configuration is needed: without a Gemini key the AI texts use their
templates, and without KV variables the worlds live in server memory (they reset when the server restarts).

Optional variables in `.env.local` (never commit it):

| Variable | What for |
|---|---|
| `GEMINI_API_KEY` | AI-drafted texts (get one at https://aistudio.google.com/apikey) |
| `GEMINI_MODEL` | Override the model (default `gemini-3.8-flash`) |
| `KV_REST_API_URL`, `KV_REST_API_TOKEN` | Upstash Redis for persistent worlds (`UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` also work) |

Checks:

```bash
node scripts/relevo-check.mjs        # engine vs Python reference + acceptance list: 33 checks
node scripts/relevo-demo-walk.mjs    # the 8 demo steps against a running server (default http://localhost:3000): 19 checks
```

Other pages: `/relevo` (entry), `/relevo/app?as=luis` or `?as=pablo` (phone apps), `/relevo/clinic` (clinic web).

> `/` is our earlier prototype (Relay). Relevo lives under `/relevo`.

## License

MIT — see [LICENSE](LICENSE). The code is MIT; the profile photos are not (see below).

### Profile photos

The people in the demo are fictional characters. Their profile photos (`public/relevo/people/`) are stock photos licensed
by the team and are **not** covered by the MIT license: Shutterstock #2605781241 (Luis) and #2734807253 (Sara),
Depositphotos #279989456 (Pablo), iStock #1386479313 (Marta), Freepik 273609-5677 (Juho), 273609-12356 (Eero) and
23-2148856070 (Sanna), Unsplash photo-1566616213894 (Helmi), and one more stock portrait (Anna). Noora uses an
illustrated portrait.
