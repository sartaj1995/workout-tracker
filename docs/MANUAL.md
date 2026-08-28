# Manual

Everything the [README](../README.md) doesn't need to say up front: the full
notes format, backups, and the handful of design decisions that explain why the
app behaves the way it does.

- [Writing your notes](#writing-your-notes)
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
while a workout is open (**Settings → Keep screen on**), which is the real
reason an alert gets missed.

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
