# Changelog

Every change that reached the app, newest first, with the pull request that
carried it. Thirty-seven merged pull requests across sixteen days.

This exists because the other four docs all describe the app as it is *now*.
[`MANUAL.md`](MANUAL.md) tells you how to use what's there.
[`LEARNINGS.md`](LEARNINGS.md) and [`DEFECTS.md`](DEFECTS.md) do look backwards,
but one is organised by theme and the other by cause — neither can tell you
*when* something arrived, or what the app could not do the week before. That
ordering is the axis this file adds, and it's the one you want when you're
trying to remember whether a behaviour is new or has always been wrong.

There are no version numbers here, and inventing them after the fact would be a
fiction. Every merge to `main` deploys to Vercel, so the unit of release is the
pull request and the date is the day it landed. Commit hashes are in brackets;
`git show <hash>` has the full reasoning, which is where the real detail lives.

---

## Where it started, and where it is

| | First version — 26 Aug, PR #1 | Now — 10 Sep, PR #38 |
|---|---|---|
| **Days** | Push, Pull, Legs | Plus Upper, a substitute for when time is short |
| **Logging a set** | Type it, or tick last time's prefill | Same, plus a stopwatch for holds and per-exercise skip |
| **When it happened** | Always now | Backdate a forgotten session, or fix one dated wrong |
| **Mistakes** | Permanent once saved | Edit any saved workout; eight seconds to undo a delete |
| **Rest timer** | Fixed, silent, dies with the screen | Plus and minus 15s, audible over gym noise, survives a locked phone |
| **Progress** | A chart of estimated 1RM | Plus stall detection, workload per day, and a bests tab |
| **Notes** | — | Per-workout, readable from the chart point they explain |
| **Your exercises** | Edit `notes.ts`, redeploy | Edit them in Settings, from the gym floor |
| **Your data** | In the browser, and nowhere else | JSON backup, optional Google Drive sync, CSV of every set |
| **Written down** | A blank README | README, manual, learning log, defect register, this file |

Three things did *not* change, and were never meant to: no account, no server,
and nothing leaves the phone unless you ask it to.

---

## The log

Tags: *feature* is something you can now do, *fix* is something that was wrong,
*routine* is a change to the exercises themselves, *docs* is writing only.

### 10 September

- **#38 · Export every set as CSV** *(feature)* — one row per set, because that's
  the atomic thing the app records; anything coarser bakes in one summary and
  throws the rest away. Drop sets get their own rows rather than being crushed
  into a text field. RFC 4180 quoting, verified by parsing the output back, and
  a BOM so Excel reads it as UTF-8. [`1ab65e9`]
- **#38 · Disabled buttons now look disabled** *(fix)* — found while building the
  export. Nothing in the stylesheet styled the disabled state, so eight buttons
  across seven files looked fully tappable while doing nothing. The attribute was
  right everywhere; only the appearance lied. [`1ab65e9`]

### 9 September

- **#37 · Undo a deleted workout** *(feature)* — the old confirmation warned there
  was no undo, which is a fair warning and a poor offer. A bar now names what went
  and gives you eight seconds. Undo restores the prefills too, not just the row.
  [`3dfdc0b`]
- **#36 · A Bests tab** *(feature)* — every exercise's best in one place. Sorted by
  when rather than by size, because 43kg on a dumbbell press and 18 on a
  plate-numbered pulldown aren't the same kind of number, and ranking them invites
  a comparison that doesn't mean anything. [`f070e72`]
- **#35 · A stopwatch for timed holds** *(feature)* — wall sits, hangs and farmer
  carries were typed in from memory, which assumes you counted accurately while
  hanging off a bar. Counting is from the wall clock, so the number is right
  whatever the page was doing. [`b985d4a`]
- **#34 · Log a workout you forgot, or fix one dated wrong** *(feature)* — sessions
  were hardcoded to `Date.now()`, and the editor let you correct every number in a
  saved workout except which day it was. The app would accept a squash match
  backdated three days but not the Pull session you actually did. [`65cf2ef`]

### 7 September

- **#33 · Defect register** *(docs)* — every defect so far in one table with its
  cause and what caught it, because the learning log is organised by theme and
  therefore can't count. Five Drive backup failures sat under five headings, so
  the fact that one feature caused a fifth of the damage never surfaced.
  [`1f5716c`]

### 6 September

- **#32 · Design note on training at two gyms** *(docs)* — nothing in the app
  changed. Exercise ids are slugs of names, so two gyms with a machine of the same
  name would collide; the answer turned out to be mostly reassurance, which is
  exactly the kind of thing that gets forgotten and re-derived badly a year later.
  [`11818f1`]
- **#31 · Rear delt fly and face pulls on Push** *(routine)* — both names already
  existed under Pull, and ids are slugs of names, so writing them plainly would
  have produced one exercise on two days sharing one history. Checked against the
  parser rather than assumed. [`6c662af`]
- **#30 · A workout's note shows on the chart point it explains** *(feature)* —
  notes were only readable in History, which isn't where the question gets asked.
  You see a dip weeks later and the answer was already written down, one tab away,
  on a screen you'd have to know to go looking through. [`20ec7e5`]
- **#28 · Learning log extended** *(docs)* — nineteen new entries covering the
  second dozen pull requests. [`12ef5b7`]
- **#27 · README caught up with four features** *(docs)* — the manual had been
  updated with each of them and the front page had not, so it sat about a week
  behind the app. [`fd72078`]

### 5 September

- **#26 · Dumbbell and one-arm work counts twice towards workload** *(fix)* —
  spotted in the gym: 30x8 counted 240kg, but there are two 30kg dumbbells. A
  constant error would have been survivable; this one landed on some exercises and
  not others, including both halves of the same OR pair. [`b1d7909`]
- **#25 · Edit your exercises in the app** *(feature)* — adding one meant editing a
  TypeScript file and redeploying, which is impossible from the gym floor, which is
  exactly where you are when you find out the gym has a machine your notes don't.
  [`4e05680`]

### 1 September

- **#24 · Stall detection and the Workload chart** *(feature)* — two things the
  logged data already knew and never said. The old suggestion only fired when you
  cleared the rep ceiling; being stuck for weeks, the case where you actually need
  telling, said nothing. [`9bf08b6`]
- **#23 · Correct a saved workout, and give it a note** *(feature)* — nothing that
  reached History could be changed. A saved number becomes next session's prefill,
  a point on the chart, and possibly a false best, so mistyping 250 for 25 quietly
  poisoned three things at once. [`e7ae76e`]

### 31 August

- **#22 · Explain the est. 1RM number** *(docs)* — the chart said "est. 1RM (kg)"
  with nothing anywhere saying what it was. Someone who logs 80x9 sees 104 and has
  no way to work out why, or whether it means they can lift 104. [`d12880f`]
- **#21 · README hero tidied, two stale claims fixed** *(docs)* — the subtitle led
  on "Push / Pull / Legs", which is jargon in the first line anyone reads.
  [`d503730`]

### 29 August

- **#20 · The rest alert lands with the screen off** *(fix)* — the beep was
  scheduled on the audio clock, which is right, because JS timers are throttled in
  the background. What it missed is that an audio context with nothing playing is
  suspended too, and its clock with it. [`e4251f8`]
- **#19 · Google sign-in renews from the tap that saves the workout** *(fix)* —
  browser sign-in hands out a token good for about an hour, with no refresh token
  available to a page with no backend, so by the time a workout ends the token is
  almost always dead. [`b17d3ab`]
- **#18 · Logged sets survive looking at an OR alternative** *(fix)* — tapping the
  other side of a pair rebuilt the entry from scratch, so two sets logged on the
  single-handle pushdown vanished the moment you tapped the bar to see what it was.
  [`486ac31`]

### 28 August

- **#17 · Learning log started** *(docs)* — the commit messages record why, but one
  change at a time. The patterns only show up when you read fifteen together.
  [`3ab65e2`]
- **#16 · MIT license** *(docs)* — the README invites people to fork the app, and
  without a license file that invitation isn't one. [`01ca897`]
- **#15 · Log activities that aren't gym days** *(feature)* — squash, basketball, a
  run: training that showed in the app as a gap, indistinguishable from sitting on
  the sofa. Kept separate from sessions rather than modelled as a fourth kind of
  day. Also folded Upper behind a "Short on time" disclosure, which gave back about
  a fifth of a 375px screen. [`b3f981a`, `71dd082`, `561333a`]

### 27 August

- **#14 · README rewritten as a front page** *(docs)* — it had grown into a manual:
  155 lines of dense reference, no pictures, opening on syntax rather than on what
  the app is. Split in two. [`f912d59`]
- **#13 · An owed Drive backup retries** *(fix)* — saving at the gym didn't upload;
  a manual tap at home did. The auto-backup fired correctly and recorded the
  failure, but only ever fired once — inside a gym, usually with no signal.
  [`b299b22`]
- **#12 · The rest alert is audible, and the screen stays awake** *(fix)* — reported
  after the first real gym session. A sine pair has no harmonics to cut through gym
  noise; it's now four alternating square tones where a phone speaker is loudest.
  [`be74b6f`]
- **#11 · Minus 15s on the rest timer** *(feature)* — rest could only be extended,
  which is the wrong half to have when you routinely overshoot. Room came from the
  progress bar, which showed proportion remaining that the clock already gave more
  precisely. [`916a2a4`]
- **#10 · A fresh device can't overwrite the Drive backup** *(fix)* — the conflict
  guard only fired when the device had synced before, so a new phone short-circuited
  it and uploaded an empty file over everything. That is the exact case the feature
  exists to survive. [`ea967c6`]
- **#9 · Back up to Google Drive** *(feature)* — one JSON file in your own Drive,
  re-uploaded when a workout is saved, restorable onto another device. Uses the
  `drive.file` scope, which reaches only files this app created, so there's no
  verification step and no "unverified app" warning. [`e06c7f5`]
- **#8 · OR choices are remembered per day** *(fix)* — Upper shares exercises with
  Push and Pull, so it shared their choices: picking the machine on Push silently
  flipped Upper too, with no way to keep dumbbells on one and the machine on the
  other. [`a1eae3f`]
- **#7 · Upper filled in, and treated as a substitute** *(feature)* — it borrows five
  lifts from Push and Pull. Left in the rotation it would have done the opposite of
  what's wanted: "up next" goes to the day left longest, and a day never trained
  sits at timestamp 0, so Upper would have held that badge permanently.
  [`4f4358f`, `cba099a`]
- **#6 · Bulgarian split squats, and an empty Upper day** *(routine)* — adding a
  fourth day needed more than a heading, since every screen assumed a day has
  something in it. [`9fb0c47`]
- **#5 · Push and Pull reordered** *(routine)* — dumbbell press leads its pair,
  single tricep pushdown leads its group, and Push gets its first optional block.
  [`77f6b0b`]
- **#4 · The service worker stops caching junk as the app shell** *(fix)* — the
  navigation branch cached whatever the network returned with no check on the
  response, so any successful-looking reply could be stored as the app itself.
  [`271bdb2`]

### 26 August

- **#3 · Pull-ups and free squats dropped, per-exercise skip added** *(routine)* —
  removing an exercise from `notes.ts` previously did nothing to an existing
  install, because the stored catalog won the merge. The catalog is now
  fingerprinted against the notes and rebuilt when they differ. [`3b05bd9`]
- **#2 · Home screen redesign** *(fix)* — both problems reported from the deployed
  app: day card text ran together ("Push5 exercises"), and tapping a day started a
  session immediately, so browsing Pull then Push raised a "discard your workout?"
  prompt for something you never started. [`e7446ed`, `86bf245`]
- **#1 · The app** *(feature)* — a mobile-first PWA that turns the phone notes into
  a logger. Exercises come from `notes.ts` in the exact format the notes were
  already written in. Last time's numbers appear as ghost placeholders, and
  checking a set off accepts them, so a normal set takes one tap. [`7534c7a`]

---

<sub>The numbering skips #29 — that pull request was never merged.</sub>

---

## Keeping this current

One bullet per merged pull request, added in the change that makes it — not
reconstructed later. Reconstruction only worked this once because the commit
messages record why rather than what, and that isn't a thing to rely on twice.

What earns the words is the *why*, not the diff. Anyone can read the diff; nobody
can recover the reason six months on. A line saying what changed plus one clause
on what was wrong before is the right size. If it needs a paragraph it belongs in
[`LEARNINGS.md`](LEARNINGS.md), and if it's a defect it should be counted in
[`DEFECTS.md`](DEFECTS.md) as well.

If versions ever start to matter — an install that someone other than you has to
update — the place to start is a `v0.1.0` tag on the current commit and a heading
here per tag. Until then the date and the pull request number carry everything a
version number would, and unlike a version number they can't drift out of date.
