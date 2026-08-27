# Workout Tracker

A mobile-first push / pull / legs logger. Your gym notes, turned into an app you
can add to your phone's home screen and use with no signal.

- **Pick a day** — Push, Pull or Legs — and every exercise appears with last
  session's weights and reps as ghost numbers. Tap ✓ to accept them, or type over
  the ones that changed.
- **This-or-that** exercises (Chest press *or* Dumbbell press) are a row of
  chips at the top of the card. Each variant keeps its own history.
- **Extra work** sits behind one button at the bottom of the session, along
  with anything you skipped today.
- **Skip an exercise** you don't feel like doing and it disappears from the
  session — tap *skip today* on its card. It stays in your plan, and adding it
  back drops it into its original position.
- **Drop sets** are first-class: `70x8+55x3+45x3` round-trips exactly.
- **Rest timer** starts on its own each time you check a set off, then beeps and
  vibrates. The alert is handed to the audio clock when rest *starts*, not
  played when a timer notices zero — a backgrounded page has its timers
  throttled to the point of never firing. The screen is also held awake while a
  workout is open, which is the real reason an alert gets missed.
- **Notes** per exercise for seat height, pin position, or what to try next.
- **Progress** charts estimated 1RM per exercise; **History** shows every saved
  session and an 8-week training grid.

Everything is stored in the browser on your phone. No account, no server, no
network needed after the first load.

## Run it

```bash
npm install
npm run dev
```

## Deploy to Vercel

Push this repo to GitHub, then import it at [vercel.com/new](https://vercel.com/new).
Vercel detects Vite on its own — framework preset **Vite**, build command
`npm run build`, output directory `dist`. No environment variables.

Open the deployed URL on your phone and use **Add to Home Screen**. It then runs
full screen with no browser chrome and works offline.

## Editing your exercises

Everything comes from [`src/data/notes.ts`](src/data/notes.ts), which holds your
notes in the exact shape you already write them:

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
| A blank line inside a day | Everything below it is optional/extra |
| `... (note)` after the sets | Becomes the exercise note |
| A bare name, no ` - ` | Reuses an exercise from an earlier day |

Machines numbered by plate rather than kilos, and lifts measured in reps or
seconds instead of weight, are listed in `OVERRIDES` at the bottom of the same
file.

Edit, redeploy, and the app picks the changes up on its own — it fingerprints
the notes and rebuilds the catalog when they differ. (**Settings → Reload
exercises from notes** forces the same thing.) Everything you've logged is left
alone either way.

Removing an exercise from the notes *retires* it rather than deleting it: it
stops being offered in new workouts, but past sessions and its progress chart
still render.

`Upper` is marked as a substitute rather than part of the rotation (the
`rotation` flag on `DAYS` in [`src/data/parse.ts`](src/data/parse.ts)). It sits
under *Short on time* on the home screen, never claims the **Up next** badge,
and training it doesn't change which rotation day comes next — swapping it in
for a Push day leaves Push just as overdue as it was.

A day can reuse an exercise from an earlier day by listing its name on its own,
with no sets — that's how `Upper` is built out of Push and Pull lifts. It's the
**same exercise**, not a copy: one history, one progress chart, and it brings
its `OR` alternatives with it. Which side of a pair you're using is remembered
per day, though — dumbbells on Push and the machine on Upper is fine, and
switching one doesn't disturb the other.

A heading with nothing under it is a day you haven't filled in yet. It shows on
the home screen as *Not set up yet* and can't be started — `Upper` ships that
way, ready for exercises.

Whichever side of an `OR` pair is listed **first** is the one offered by
default. Because the notes decide that, editing them clears any choice you'd
swapped to inside the app — otherwise an old in-app pick would quietly override
the order you just wrote.

## Backups

Data lives in `localStorage`, so clearing your browser data erases it.
**Settings → Export backup** writes a JSON file; **Import backup** restores it.

### Google Drive

Better: connect Google Drive in Settings and it keeps one backup file in your
own Drive, re-uploaded automatically after every workout you save. Free, no
server, and the same file restores onto a laptop.

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

## Layout

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
