# Manual

Everything the [README](../README.md) doesn't need to say up front: the full
notes format, backups, and the handful of design decisions that explain why the
app behaves the way it does.

- [Writing your notes](#writing-your-notes)
- [Fixing a saved workout](#fixing-a-saved-workout)
- [How progress is scored](#how-progress-is-scored)
- [When a lift stops moving](#when-a-lift-stops-moving)
- [Workload](#workload)
- [Backups](#backups)
- [Backing up to Google Drive](#backing-up-to-google-drive)
- [Design decisions](#design-decisions)
- [Project layout](#project-layout)

---

## Writing your notes

Everything comes from [`src/data/notes.ts`](../src/data/notes.ts), which holds
your notes in the exact shape you already write them:

```
Push
Chest press (sitting) - 85x9 80x8 75x8 70x8+55x3+45x3
OR
Dumbbell press - 30x10 25x11 25x10 25x9
```

| Syntax | Meaning |
| --- | --- |
| `Push` / `Pull` / `Legs` / `Upper` | Day heading |
| `Name - 80x9 75x8` | Exercise, then `weight x reps` per set |
| `70x8+55x3` | `+` chains drop sets onto the same set |
| `OR` between two lines | Makes them alternatives you pick between |
| A blank line inside a day | Everything below it is optional / extra |
| `... (note)` after the sets | Becomes the exercise note |
| A bare name, no ` - ` | Reuses an exercise from an earlier day |

Machines numbered by plate rather than kilos, and lifts measured in reps or
seconds instead of weight, are listed in `OVERRIDES` at the bottom of the same
file.

Edit, redeploy, and the app picks the changes up on its own — it fingerprints
the notes and rebuilds the catalog when they differ. **Settings → Reload
exercises from notes** forces the same thing. Everything you've logged is left
alone either way.

Removing an exercise from the notes *retires* it rather than deleting it: it
stops being offered in new workouts, but past sessions and its progress chart
still render.

---

## Fixing a saved workout

Open **History**, tap a workout to expand it, then tap any exercise line. You
can correct a number you mistyped, add the set you forgot to tick off, remove
an exercise from that day, or delete the workout outright. Clearing a set's
numbers removes the set; removing the last exercise removes the workout.

The prefill follows the correction. A seed — the ghost numbers you see next
session — is only ever "whatever the latest session said", so fixing a wrong
number moves it too. Otherwise next week's ghosts would still show the mistake,
and accepting them would write it straight back in. Correcting an *older*
session leaves the seed alone, because a newer one still has the last word, and
deleting the only session an exercise appears in puts its seed back to the
starting numbers in your notes.

Each workout also carries a **note** of its own — how you slept, what hurt,
what to change next time. It's offered when you save the workout, since that's
the only moment you still remember, and it can be added or edited here later.
That's separate from an exercise's note, which is a standing setup reminder
that shows every time you train it.

---

## How progress is scored

Every exercise gets one number per session — its *score* — and that's what the
Progress tab charts. The score is always taken from the **single best set** of
that exercise in that session, never a sum or an average, so adding a fourth set
doesn't move the curve unless it was your hardest.

What "best" means depends on how the exercise is measured:

| Metric | Example | Score | Chart label |
| --- | --- | --- | --- |
| `weight_reps` | `80x9` | `weight × (1 + reps / 30)` — Epley | est. 1RM (kg) |
| `reps` | pull-ups | best rep count | best set |
| `time` | wall sit | best hold in seconds | best hold |
| `weight_time` | farmer's carry | `weight × seconds` | best hold |

The percentage beside the chart compares the first session on record with the
latest — not with your best — so a deliberate deload shows as a dip rather than
being hidden.

**On Epley.** It assumes a weight you can move for 9 reps sits about 30% below
your true single. It's reasonable between 1 and 10 reps and increasingly
optimistic above that; at 20 reps it claims `weight × 1.67`. It's also slightly
wrong at the bottom — a true single scores `weight × 1.033`, not `weight`. None
of this matters much for tracking yourself over time, because the bias is
consistent: the curve's shape is trustworthy even where its absolute value
isn't. Don't read the number as a weight to load on a bar.

**Drop sets are excluded.** `70x8+55x3+45x3` scores identically to `70x8`. The
drops are accumulated fatigue rather than evidence of a higher ceiling, so
counting them would inflate the estimate on exactly the sessions where you were
most tired. They *are* counted in session volume, which is what History totals.

**Plate-numbered machines** still run through Epley, and the axis reads
`est. 1RM (plate)`. Since the input is a plate index rather than kilos, the
output is only meaningful compared against itself on that same machine.

An exercise appears in the Progress picker as soon as it has one saved session,
but the curve only says anything from the second onwards.

---

## When a lift stops moving

Every exercise is counted against its own best: **sessions since your best** is
how many you've logged since the last time you beat it. Zero means the most
recent session *was* the best one.

Past four, the app says so — in the workout itself as a chip on the exercise
card, and at the top of **Progress → Lifts** as a list of everything that has
stopped going up, worst first. Four is low enough to catch a plateau while
there's still something to do about it, and high enough that one ordinary week,
or a session you went into tired, doesn't set it off.

Progress also offers somewhere to restart from: about a tenth off the weight,
rounded to a jump you can actually make. The point isn't the lighter weight —
it's clearing the old number with room to spare, so the way past it comes with
it. Nothing is offered for rep-only exercises, because there's no weight to come
down to and telling you to do fewer pull-ups isn't a plan.

Counting from the best, rather than from a rolling average, is deliberate: it's
what progressive overload actually asks. Sooner or later the number has to go
up again.

---

## Workload

**Progress → Workload** adds up every kilo you moved in a session — weight ×
reps across every set and drop set — and charts it over time, with the last four
sessions compared against the four before them.

**One day at a time, never all on one line.** A Legs session moves several times
the tonnage of a Push one, so a combined chart would be a sawtooth that tracks
which day it was rather than whether you're doing more.

Only lifts measured in kilos count. Plate-numbered machines and timed holds are
left out: their numbers aren't kilos, and adding them in would make the total
mean nothing.

---

## Backups

Data lives in `localStorage`, so clearing your browser data erases it.
Under **Settings → Your data**, **Export backup** writes a JSON file and
**Import backup** restores it.

---

## Backing up to Google Drive

Better: connect Google Drive in Settings and it keeps one backup file in your
own Drive, re-uploaded automatically after every workout you save. Free, no
server of your own, and the same file restores onto a laptop.

It uses the [`drive.file`](https://developers.google.com/identity/protocols/oauth2/scopes)
scope, which reaches only files the app itself created — Google classes that as
non-sensitive, so there's no verification and no "unverified app" warning, and
none of your other Drive files are visible to it.

Setup is once, about fifteen minutes:

1. In [Google Cloud Console](https://console.cloud.google.com), create a project.
2. **APIs & Services → Library**, search *Google Drive API*, **Enable**.
3. **OAuth consent screen** → **External**. Fill in app name and your email.
4. **Publish** the app rather than leaving it in Testing. `drive.file` is
   non-sensitive so publishing needs no review, and Testing mode expires your
   sign-in every 7 days.
5. **Credentials → Create credentials → OAuth client ID → Web application**.
   Under *Authorised JavaScript origins* add your deployed URL, and
   `http://localhost:5173` if you run it locally. Leave redirect URIs empty —
   this flow doesn't use them.
6. Copy the client ID.
7. In Vercel, **Settings → Environment Variables**, add
   `VITE_GOOGLE_CLIENT_ID` with that value, then **redeploy**. Vite bakes env
   vars in at build time, so a redeploy is required.

The client ID is public — it ends up in the JavaScript bundle by design, and is
not a secret. Without it the Drive section just says it isn't configured.

**Conflicts:** a backup never overwrites a copy this device hasn't seen. If you
log on two devices, Settings says so and lets you choose which one wins rather
than silently picking.

**Signing in again:** Google's browser sign-in lasts about an hour and can't be
renewed unattended, so by the end of a workout it has usually lapsed. Saving the
workout renews it — that tap is what lets the app ask — and Google normally
settles it without asking anything, since you've already granted access. If
you're offline it doesn't try, and the backup waits for signal instead.

---

## Design decisions

**Substitute days.** `Upper` is marked as a substitute rather than part of the
rotation (the `rotation` flag on `DAYS` in [`src/data/parse.ts`](../src/data/parse.ts)).
It sits under *Short on time* on the home screen, never claims the **Up next**
badge, and training it doesn't change which rotation day comes next — swapping
it in for a Push day leaves Push just as overdue as it was.

**Shared exercises.** A day can reuse an exercise from an earlier day by listing
its name on its own, with no sets — that's how `Upper` is built out of Push and
Pull lifts. It's the **same exercise**, not a copy: one history, one progress
chart, and it brings its `OR` alternatives with it. Which side of a pair you're
using is remembered per day, though — dumbbells on Push and the machine on Upper
is fine, and switching one doesn't disturb the other.

**Switching an `OR` never costs you work.** Tapping the other side of a pair
swaps it in while the card is still empty — that's the everyday case, deciding
what you're doing before you start. Once anything is typed or ticked, the
alternative is added *below* instead of replacing it, so the sets you already
logged stay put and you can log both halves in one session. That's also how you
deliberately do both: log a set on one, then tap the other.

**Defaults come from the notes.** Whichever side of an `OR` pair is listed
**first** is the one offered by default. Because the notes decide that, editing
them clears any choice you'd swapped to inside the app — otherwise an old in-app
pick would quietly override the order you just wrote.

**Rest alerts fire from the audio clock.** The beep is scheduled when rest
*starts* rather than played when a timer notices zero — a backgrounded page has
its timers throttled to the point of never firing. The screen is also held awake
while a workout is open (**Settings → Keep screen on**).

That alone wasn't enough, because the audio clock has a way of stopping too. A
context with nothing playing is suspended the moment the page goes to the
background, and its clock stops with it — so the beep waiting on that clock
either arrives late by however long the phone was away, or never arrives. Two
things now hold it together: a tone far too low and too quiet to hear plays for
the length of each rest, which is enough to keep the context running; and on
coming back to the app the two clocks are compared, so any time the audio clock
slept through is corrected for. If rest is already over by then it sounds
straight away, which is worse than on time and much better than never.

**Empty days.** A heading with nothing under it is a day you haven't filled in
yet. It shows on the home screen as *Not set up yet* and can't be started —
`Upper` ships that way, ready for exercises.

---

## Project layout

```
src/
  data/notes.ts      your notes, verbatim
  data/parse.ts      notes -> exercise catalog
  lib/types.ts       data model
  lib/calc.ts        1RM, volume, plate maths, progression hints
  lib/state.tsx      app state + localStorage persistence
  lib/storage.ts     load/save/export/import
  lib/useRestTimer.ts
  lib/useWakeLock.ts
  lib/drive.ts       Google Drive auth + REST calls
  lib/sync.ts        backup/restore orchestration and conflict handling
  components/        screens and the exercise card
public/sw.js         offline cache
scripts/make-icons.mjs  regenerates the PWA icons (npm run icons)
```

```bash
npm run dev      # vite dev server
npm run build    # tsc -b && vite build
npm run lint     # oxlint
npm run icons    # regenerate the PWA icons
```
