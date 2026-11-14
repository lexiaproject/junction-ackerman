# Relevo · Demo guide (3 minutes)

For whoever presents, and for the jury if they open the repo. Everything below matches the current code of
`/relevo/demo`: the story is a fixed script of events (`src/lib/relevo/sim.ts`), so the same presses always show the
same screens.

**How the demo view works.** Three columns: **Luis** (left, the person who just finished TMS), **Pablo / Marta**
(middle, the mentor's phone; it switches to Marta by itself when needed), **Clinic** (right, the clinic web). Press
**Next moment** (or the right arrow key) to jump to the next moment; there are 15. Press **E** to show or hide
**"Show how Relevo decides"**, the bottom layer with what the engine computed. Luis and Pablo never see that layer.

**Guide for first-time viewers (on by default).** For a juror who opens the demo alone: the start screen says who is
who, and each moment shows a bar under the timeline with "4 / 15", one plain sentence and "Look at …"; the column it
names gets a teal border. Moment 12 carries the content note and moment 15 says it is the end. Press **H** (or
More → Hide the guide) to hide it when presenting live; the browser remembers the choice, and H shows it again.

---

## 1. The 3-minute script

Structure: problem (20 s) → solution (20 s) → demonstration (about 2 min, 9 steps, 15 presses) → impact (15 s) → next step (10 s).
"Press N" = the N-th press of **Next moment** from the start screen.

### Problem · 0:00 (start screen, before any press)

The banner "Beyond the clinic" is on screen.

> "TMS works for many people with depression, but the course ends after a few weeks and the person goes home alone.
> The months after are when relapse risk is high, and the clinic usually hears about it when things are already bad.
> People don't want an app watching them, and a clinic can't call everyone every week."

### Solution · 0:20 (still the start screen)

> "Relevo is a chain of TMS patients. Each person is accompanied by someone who finished TMS a few months earlier.
> The phone quietly compares you only with your own usual. When something drifts, nobody gets an alarm: a person
> gets a small, private nudge to reach out. And only the clinic ever sees health data."

### Demonstration · 0:40 (about 2 minutes, 15 presses)

**Step 1 · Day 0 · Matching (press 1) · ~15 s.**
The bottom layer opens by itself (don't press E here, it would close it). Look at it: "Matching by how relapses started".
> "The clinic picks a mentor by how each person's last relapse started. Pablo scores **88.6 %** with Luis, Sara
> **77.2 %**: Luis and Pablo both started out sleeping more and going out less."

The layer closes by itself at press 2 (or close it now with E).

**Step 2 · Days 27-40 · His own usual, then the copilot (presses 2-3) · ~15 s.**
Press 2 (day 27): nothing changes on the phones, on purpose.
> "Luis gives three separate consents, and for four weeks Relevo only learns his usual. It never compares him with
> anyone else."

Press 3 (day 40), middle column: Pablo gets a private tip, "Only you see this".
> "Luis has sent three notes in a row about the same thing. Pablo gets a private tip on how to reply. Luis sees nothing."

**Step 3 · Day 47 · Asking the mentor first (presses 4-6) · ~20 s.**
Press 4: the clinic column shows Luis at **1 · Early signs** ("fewer steps"). Nothing appears on either phone.
> "One bad day does nothing. It takes three days in a row of a clear change, and only the clinic sees it."

Press 5, middle column: **"Would you like to talk to Luis today?"** with Yes / Can't today.
> "Pablo is asked first, in private. He can say no."

Press 6 (or tap **Yes** on Pablo's phone yourself; the script answers Yes at 08:41 either way). Left column: Luis reads
**"Pablo would like to talk to you"**. Middle column: Pablo gets an idea, **"Suggest a walk tomorrow morning"**.
> "Luis never sees an alarm, only a friend who wants to talk."

**Step 4 · Days 47-48 · The walk (presses 7-8) · ~15 s.**
Press 7: Pablo sends the walk as a voice note; Luis sees "20-minute walk · Tomorrow, Sunday, 10:00". Tap **I'm in** on
Luis's phone (optional: tap **Thanks** under Pablo's note; it reads "Thanked"). If you don't tap, the script does it at 11:20.
Press 8: Pablo's phone shows **"Luis said it went well"**. Then **E**: in the layer table "A personal solution", the row
"Walk together" goes from **0.62** to **0.70** in the "Now" column.
> "The walk went well, so Relevo learns that walks work for this pair, not for the average person."

Close the layer (E).

**Step 5 · Day 54 · Level 2, the clinic steps in (presses 9-10) · ~15 s.**
Press 9: clinic column, Luis at **2 · High risk**, with "Call today". Press 10: Luis reads **"Anna, your nurse, will
call you soon to see how you are"**. Pablo's phone shows nothing for Luis: he answered "Can't today".
> "When the mentor can't, that's respected. The clinic takes over, and Luis gets at most one notification a day."

**Step 6 · Day 56 · The mentor drifts too (press 11) · ~10 s.**
The middle column switches to **Marta** by itself: "Would you like to talk to Pablo today?".
> "Pablo is still recovering too, so Relevo watches him exactly like Luis. His own mentor, Marta, is asked first."

**Content note, say it before press 12:**
> "Content note: the next moment involves a message with a suicidal thought. We'll show what the system does, not the
> message itself."

**Step 7 · Days 57-59 · Crisis phrase (presses 12-13) · ~20 s.**
Do **not** press the play button on Luis's note, and do not read the note aloud.
Press 12. Left column: the help sheet opens on Luis's phone ("Need help right now?": 112, the MIELI crisis line, his
clinic, ask Pablo to write). Right column: **1 Severe alert**, Luis at **3 · Severe** with "Call now". Middle column:
Pablo reads "Anna, Luis's nurse, and the clinic team have been told. You don't need to do anything else." (and sees
"This note was passed to Luis's clinic team." instead of the note itself).
> "A phrase from a fixed list moves Luis to level 3 immediately. Help opens on his phone, the clinic gets a severe
> alert, and Pablo is told he doesn't have to carry this."

Press 13 (day 59): the clinic resolves the alert; Luis goes back to what his data say (level 2). Pablo's phone closes the
loop: "Anna's team is with Luis now. Thank you for being there."
(Behind the scenes, an alert left unattended for 15 minutes goes to the on-call lead; it is in the layer's log if E is open.)

**Step 8 · Day 60 · Protecting the mentor (press 14) · ~10 s.**
Pablo is at level 2: his phone offers **"A few days for you · We suggest a pause"**; the clinic shows **"Review pace"**
for Pablo and "No active mentor" for Luis.
> "Pablo is offered a pause, Luis stays supported by the clinic team, and nobody is blamed."

**Step 9 · Close · What the simulation shows (press 15, the layer opens by itself) · ~20 s.**
The layer shows **90 %**, **6 days**, **2.37**.
> "On 1,000 synthetic people that we generated ourselves, with 500 simulated relapses, level 1 catches 90 % of them with
> a median of 6 days' notice and 2.37 false alarms per person per year, and a false alarm only costs a walk with the
> mentor. Level 2, the one that reaches the clinic, is much stricter: 62 %. This proves the logic works as designed,
> not that it predicts relapse in real patients. That needs a clinical study."

**Said only in words (no moment of its own):** one bad day does nothing; one notification a day at most; if the mentor
says "Can't today" it is respected; an unattended severe alert goes to the on-call lead after 15 minutes. The retired
moments are still in `src/lib/relevo/demo.ts` (marked `off`) and can be brought back.

### Impact · 2:40

> "The clinic gets days of notice instead of a crisis. The patient gets a person who has been there, not a red
> notification. And every patient who recovers becomes the next mentor."

### Next step · 2:50

> "Next: a clinically validated crisis list and thresholds reviewed with the clinic, real sensor connections, and a
> pilot study with Aalto to measure whether it works with real patients."

---

## 2. Checklist before presenting (10 minutes before)

- [ ] **Deployed version**, in Chrome: https://junction-ackerman.vercel.app/relevo/demo (not `npm run dev`: in dev a
      Next.js "N" badge appears and everything is slower). The deployed site only has what was merged to `main`; check
      it matches what you rehearsed.
- [ ] **A fresh world**: a Chrome window never used for rehearsing, or **More → Reset everything people did (keep the
      time)** and then **More → Go back to day 0**.
- [ ] **Warm up**: walk the whole demo once with Next moment (the first request on a cold server takes about 1 s),
      then More → Go back to day 0.
- [ ] **Microphone**: allow it in Chrome only if you plan to record a note live.
- [ ] **Projector** at 1920×1080 if possible. Practise opening and closing the layer with the **E** key.
- [ ] **Only forward** during the demo: Next moment or the right arrow. To repeat, More → Go back to day 0.
- [ ] Don't project the URL with `?w=` or the More menu: anyone with that link can move the demo.
- [ ] Day 57 (press 12): let the script resolve the alert at press 13 (pressing "Resolve" earlier is safe, but it changes the story you tell).
- [ ] Content note said before step 7 (press 12); the crisis note is never played aloud.
- [ ] **Guide bar**: decide whether you keep it on screen while presenting. **H** hides it (and remembers it in that browser).
- [ ] Live taps are optional: "Yes" (press 5) and "I'm in" (press 7). If you skip them, the script does them a few minutes later.

---

## 3. Plan B (no network, or a service is down)

**Build in advance, while you still have internet** (the build downloads the fonts):

```bash
npm install
npm run build
```

Then, on the day, even offline:

```bash
npx next start
```

Open **http://localhost:3000/relevo/demo**. If port 3000 is busy: `npx next start -p 3001` and use port 3001.
(With internet, `npm run build && npx next start` does both in one go.)

- **No KV variables → worlds live in server memory.** It works the same; worlds reset when the server restarts.
- **No Gemini key, or Gemini fails → template text.** Pablo's idea card then says **"Suggested · you can change it"**
  instead of "Suggested with AI · you can change it". Nothing else changes.
- If this laptop has a `.env.local` with keys and there is no internet, start it with the keys blanked, so it uses
  memory and templates instead of waiting on the network (Git Bash):

  ```bash
  KV_REST_API_URL= KV_REST_API_TOKEN= UPSTASH_REDIS_REST_URL= UPSTASH_REDIS_REST_TOKEN= GEMINI_API_KEY= npx next start
  ```

- Quick health check against the running server (19 checks, uses its own throwaway world):
  `node scripts/relevo-demo-walk.mjs` (or add the URL, e.g. `node scripts/relevo-demo-walk.mjs http://localhost:3001`).

---

## 4. The three most likely jury questions

**"Does the AI decide anything clinical?"**
No. Levels 0-3 come from a deterministic rule engine that compares each person with their own baseline; crisis
detection is a fixed phrase list. Gemini only drafts the mentor's idea message and analyses the tone of voice notes for
the copilot (only for people who turned on note analysis); it can add a crisis flag but never remove one. Clinic
summaries are fixed templates. Without Gemini everything still works.

**"How do you know it works?"**
Two ways, both honest about their limits. The engine is checked by automated checks (story dates, matching, learning, privacy
contract), and the 8 demo steps by an end-to-end walk. The 90 % / 6 days / 2.37 false alarms figures come from
1,000 synthetic people we generated ourselves (`scripts/relevo-evaluate.mjs`): they show the logic does what we designed, not clinical accuracy. That
would need a clinical study.

**"Privacy / GDPR?"**
Only the clinic sees health data. Luis's and Pablo's apps never receive a level, a score or a sensor value; the mentor
only gets prompts ("Would you like to talk to Luis today?") and the voice notes sent to him. Consents are separate (data summaries, note analysis, AI ideas). Names are
replaced by codes in the browser before a note leaves the app. In the demo all data is synthetic, there is no login and
audio is not encrypted yet; a real deployment would need per-role login, end-to-end encrypted audio, and the AI provider
under a data-processing agreement in an EU region with no training on our data.
