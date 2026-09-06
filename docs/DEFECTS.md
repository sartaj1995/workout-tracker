# Defect register

Every defect in this project so far, in one table, with what caused it and what
caught it. Thirty-five of them across thirty merged pull requests.

This exists because [`LEARNINGS.md`](LEARNINGS.md) can't do this job. That file
is prose organised by theme, and it is selective on purpose — an incident earns
a place there by generalising. Two things get lost in that filter. First, you
can't count anything: five separate Drive backup defects sit under five
different headings in two different sections, so the fact that one feature
produced a fifth of all the damage never surfaces. Second, the entries record
the wrong *state* and not the wrong *decision*, so they read as though every bug
was walked to directly.

So this is the register and that is the essay. This one is data you sort; that
one is prose you read.

Reconstructed from the commit messages, which is only possible because they
record why rather than what. Where a message states how something was found —
"reported after the first real gym session", "spotted in the gym", "found while
testing this" — that wording is the source for the **Caught by** column, not a
reconstruction after the fact.

---

## What counts as a defect here

Anything that was wrong, or would have been wrong on the next install, and had
to be changed. That includes four things people often leave out of a bug count:

- **Near misses** — caught during the change that would have introduced them,
  never shipped. Twelve of the thirty-five. They're in because the cause class
  is identical to the ones that did ship; only the timing differed.
- **Documentation defects.** A README that says eleven pull requests when there
  are twenty is wrong in the same way a wrong number on a chart is wrong.
- **Dev-loop defects.** The Fast Refresh break cost real time and had a real
  cause.
- **Missing repair paths.** No way to correct a saved workout isn't an absent
  feature when a mistyped number silently propagates to three other places.

Excluded: design decisions that were right first time, however much thought they
took. Charting workload per day rather than on one line was a good call, not a
fixed bug.

**Caught by** uses five values: `Real use` (reported from the gym or the
deployed app), `Design` (caught while making the change, never shipped),
`Adjacent work` (found while building something else), `Measurement` (found by
going and measuring), `Review pass` (found in a deliberate read-through).

---

## The register

| # | What went wrong | Class | Caught by | Fix |
|---|---|---|---|---|
| 1 | Day card text ran together — "Push5 exercises". `.name` and `.meta` were inline spans with no `display` set. | Rendering | Real use | [`e7446ed`](https://github.com/sartaj1995/workout-tracker/commit/e7446ed) |
| 2 | Tapping a day started a session immediately, so browsing Pull then Push raised "discard your workout?" for something never started. | Work loss | Real use | [`e7446ed`](https://github.com/sartaj1995/workout-tracker/commit/e7446ed) |
| 3 | Progress chart's line, area and dots had no colour. The redesign renamed `--accent` to `--primary`; CSS variables fail silently. | Identity & renames | Review pass | [`3b05bd9`](https://github.com/sartaj1995/workout-tracker/commit/3b05bd9) |
| 4 | Removing an exercise from `notes.ts` did nothing on an existing install — the stored catalog won the merge. | Stored state | Design | [`3b05bd9`](https://github.com/sartaj1995/workout-tracker/commit/3b05bd9) |
| 5 | Exporting `useStore` beside a component broke Fast Refresh, throwing "useStore must be used inside StoreProvider" on most edits. | Platform semantics | Adjacent work | [`3b05bd9`](https://github.com/sartaj1995/workout-tracker/commit/3b05bd9) |
| 6 | The service worker cached whatever the network returned as the app shell. A deployment-protection login redirect could be stored *as the app* and served forever after. | Stored state | Real use | [`271bdb2`](https://github.com/sartaj1995/workout-tracker/commit/271bdb2) |
| 7 | Font caching never worked. Assets required `res.ok`, but the Google Fonts stylesheet returns opaque (`ok === false`), so offline typography fell back — despite a previous commit claiming it was fixed. | Platform semantics | Adjacent work | [`271bdb2`](https://github.com/sartaj1995/workout-tracker/commit/271bdb2) |
| 8 | `OR` groups were keyed by position (`choice-1`, `choice-2`), so adding or removing a group anywhere above silently moved a stored choice onto a different pair. | Identity & renames | Design | [`77f6b0b`](https://github.com/sartaj1995/workout-tracker/commit/77f6b0b) |
| 9 | A stale in-app swap would have overridden the exercise order just written into the notes, since the group id survives a reorder. | Stored state | Design | [`77f6b0b`](https://github.com/sartaj1995/workout-tracker/commit/77f6b0b) |
| 10 | A day with no exercises would win "up next" every time — nothing to train, but never trained. | Zero state | Design | [`9fb0c47`](https://github.com/sartaj1995/workout-tracker/commit/9fb0c47) |
| 11 | Empty-state elements hidden with the `hidden` attribute would have stayed on screen: an author `display` rule beats the UA `[hidden]` rule. | Platform semantics | Design | [`9fb0c47`](https://github.com/sartaj1995/workout-tracker/commit/9fb0c47) |
| 12 | Copying exercise lines verbatim onto Upper would collide ids — `store.defs` is built with `Object.fromEntries`, so one lift silently overwrites the other. | Identity & renames | Design | [`4f4358f`](https://github.com/sartaj1995/workout-tracker/commit/4f4358f) |
| 13 | A never-trained day sits at timestamp 0, so `Upper` would have held the "up next" badge permanently, pointing at a substitute instead of the real session. | Zero state | Design | [`cba099a`](https://github.com/sartaj1995/workout-tracker/commit/cba099a) |
| 14 | `OR` choices were keyed by group alone and Upper shares Push's exercises, so picking Chest press on Push silently flipped Upper too. | Identity & renames | Design | [`a1eae3f`](https://github.com/sartaj1995/workout-tracker/commit/a1eae3f) |
| 15 | `swapChoice` rewrote the running session even when the swap was made while browsing a different day. | Work loss | Adjacent work | [`a1eae3f`](https://github.com/sartaj1995/workout-tracker/commit/a1eae3f) |
| 16 | The Drive conflict guard read `record.seenModifiedTime &&` — a device that had never synced has none, so the check short-circuited and an empty fresh install uploaded over a backup holding every workout ever logged. | Zero state | Review pass | [`ea967c6`](https://github.com/sartaj1995/workout-tracker/commit/ea967c6) |
| 17 | The rest beep was too quiet to hear in a gym: a sine pair at 0.35 gain, and sine has no harmonics to cut through the noise. | Environment of use | Real use | [`be74b6f`](https://github.com/sartaj1995/workout-tracker/commit/be74b6f) |
| 18 | The rest alert didn't fire with the screen off. It was played when a JS timer noticed zero, and a backgrounded page has its timers throttled to the point of never firing. | Platform semantics | Real use | [`be74b6f`](https://github.com/sartaj1995/workout-tracker/commit/be74b6f) |
| 19 | Auto-backup fired exactly once — at the moment a workout is saved, which is inside a gym, usually with no signal. It failed there and nothing ever retried. | Environment of use | Real use | [`b299b22`](https://github.com/sartaj1995/workout-tracker/commit/b299b22) |
| 20 | Backup failures were recorded but shown only in Settings, which is not where anyone looks. | Failure visibility | Design | [`b299b22`](https://github.com/sartaj1995/workout-tracker/commit/b299b22) |
| 21 | Opening the app with a backup owed could raise Google sign-in popups with no user action at all — a token request can prompt even when asked to stay quiet. | Platform semantics | Adjacent work | [`b299b22`](https://github.com/sartaj1995/workout-tracker/commit/b299b22) |
| 22 | "3 workouts" sat next to "4 this week". Both numbers were right; the totals stat counted gym sessions and the week counted everything. | Derived number | Design | [`b3f981a`](https://github.com/sartaj1995/workout-tracker/commit/b3f981a) |
| 23 | Tapping the other side of an `OR` pair rebuilt the card from scratch, so logged sets vanished on the tap — and tapping back built a third empty entry rather than restoring them. There was no stash. | Work loss | Real use | [`486ac31`](https://github.com/sartaj1995/workout-tracker/commit/486ac31) |
| 24 | Finishing a workout kept reporting "Google sign-in needed". The token lasts about an hour with no refresh token available to a page with no backend, and the backup ran with no gesture, so `authorise` correctly refused to raise a window. | Auth lifecycle | Real use | [`b17d3ab`](https://github.com/sartaj1995/workout-tracker/commit/b17d3ab) |
| 25 | Consent was re-requested in full whenever the token had been dropped, because "have they ever granted this?" was answered by looking for the token. | Auth lifecycle | Adjacent work | [`b17d3ab`](https://github.com/sartaj1995/workout-tracker/commit/b17d3ab) |
| 26 | Settings reported an expired sign-in as a failed backup, which reads far worse than it is. | Failure visibility | Adjacent work | [`b17d3ab`](https://github.com/sartaj1995/workout-tracker/commit/b17d3ab) |
| 27 | **Regression of #18.** The audio clock suspends too — a context with nothing playing stops the moment the page backgrounds, so the alert fired late or never. Both original symptoms, from the mechanism chosen to avoid them. | Unverified replacement | Measurement | [`e4251f8`](https://github.com/sartaj1995/workout-tracker/commit/e4251f8) |
| 28 | The README said eleven merged pull requests and 3,400 lines of source. By the time anyone read it, twenty and past four thousand. | Doc rot | Review pass | [`d503730`](https://github.com/sartaj1995/workout-tracker/commit/d503730) |
| 29 | The Progress tab charted "est. 1RM (kg)" with nothing anywhere saying what it was. Log 80x9, see 104, no way to work out why. | Derived number | Review pass | [`d12880f`](https://github.com/sartaj1995/workout-tracker/commit/d12880f) |
| 30 | Nothing that reached History could be changed. A mistyped `250` for `25` was permanent — and became next session's prefill, a point on the progress chart, and possibly a false personal best. | Work loss | Real use | [`e7ae76e`](https://github.com/sartaj1995/workout-tracker/commit/e7ae76e) |
| 31 | The load path compared the stored fingerprint against the *built-in* notes and rebuilt from them on any difference — so edits made on the phone would have been discarded on the very next page load. | Stored state | Design | [`4e05680`](https://github.com/sartaj1995/workout-tracker/commit/4e05680) |
| 32 | Ids are slugs of names, so renaming "Chest sup row" to "Chest supported row" reads as one exercise vanishing and another arriving. Every session, chart, best and stall count strands on an invisible id. Nothing errors; you notice weeks later. | Identity & renames | Design | [`4e05680`](https://github.com/sartaj1995/workout-tracker/commit/4e05680) |
| 33 | A set logged as `30x8` counted 240kg, but there are two 30kg dumbbells. The factor wasn't constant — it landed on some exercises and not others, moving a day's workload 2.4× across one `OR` pair with no change in effort. | Derived number | Real use | [`b1d7909`](https://github.com/sartaj1995/workout-tracker/commit/b1d7909) |
| 34 | The README had drifted about a week behind the app: four features missing, Progress described as one chart when it had two tabs, every screenshot showing an older UI. | Doc rot | Review pass | [`fd72078`](https://github.com/sartaj1995/workout-tracker/commit/fd72078) |
| 35 | A second "Rear delt fly" under Push resolved to the same id as Pull's: two catalog entries sharing one id, Pull's starting numbers overwriting Push's, the exercise listed twice in the Progress picker — with no warning, because the notes review step only asks about names that appear or disappear and a duplicate does neither. | Identity & renames | Measurement | [`6c662af`](https://github.com/sartaj1995/workout-tracker/commit/6c662af) |

---

## By cause

| Class | n | Rows | What it means |
|---|---|---|---|
| Identity & renames | 6 | 3, 8, 12, 14, 32, 35 | Something is referenced by a name or a position that can change, and nothing checks the reference. |
| Platform semantics | 5 | 5, 7, 11, 18, 21 | The browser or the tooling behaves differently from the mental model held while writing it. |
| Work loss | 4 | 2, 15, 23, 30 | A gesture destroyed work the user had done, or the app made a mistake permanent. |
| Stored state | 4 | 4, 6, 9, 31 | Something persisted on a device beat the code that was just shipped. |
| Zero state | 3 | 10, 13, 16 | A guard written from the steady state, by someone standing in the steady state. |
| Derived number | 3 | 22, 29, 33 | A computed figure that was wrong, unexplained, or not comparable to the one beside it. |
| Auth lifecycle | 2 | 24, 25 | A token's lifetime didn't match the lifetime of the thing it stood for. |
| Environment of use | 2 | 17, 19 | Built at a desk, used in a gym. |
| Failure visibility | 2 | 20, 26 | The failure was recorded, and recorded somewhere nobody looks. |
| Doc rot | 2 | 28, 34 | Prose that was true when written. |
| Unverified replacement | 1 | 27 | The fix for a defect reproduced it through a different subsystem. |
| Rendering | 1 | 1 | Layout that only breaks with real content on a real device. |

---

## What the counts say

**Ten of the thirty-five were found by using the app for real** — and the subset
that could not have been found any other way is the part that matters. #17, #18
and #19 are pure environment: gym noise, a phone in a pocket, a basement with no
signal. #33 needed a real rack of dumbbells to notice. #1 needed a real phone.
The information those five turned on simply wasn't in the repository, and no
amount of review would have produced them. That's the argument for shipping thin
and going to the gym, not for reviewing harder — and note that it only covers
half the real-use column. The other five (#2, #6, #23, #24, #30) were findable
at a desk and weren't found there.

**One feature produced seven defects.** Google Drive backup: #16, #19, #20, #21,
#24, #25, #26 — exactly a fifth of the register, from roughly a tenth of the
code. It is also the only part of the app with an external system, an auth
lifecycle, and a two-way sync; everything else is local, single-writer and
synchronous. The cluster isn't bad luck, it's the one place where the app
stopped being a local app.

Those seven span five different cause classes — zero state, environment of use,
failure visibility, platform semantics, auth lifecycle — which is the more
useful reading of the number. It wasn't one hard problem generating seven
attempts. It was five unrelated problems that all arrive together the first time
you talk to someone else's server, and get budgeted as one line item called
"add backup".

**Identity is the largest class, six of thirty-five, and the only one that
recurred after being fixed.** #8, #12, #14, #32 and #35 are all the same root
cause wearing different clothes: a thing is addressed by something mutable — a
position in a list, a slug of its display name — and nothing checks that the
address still points where it did. (#3 is the same shape in CSS, where the
mutable thing is a token name and the compiler that would have caught it doesn't
exist.)

What makes this the most expensive pattern isn't the count. It's that *the fix
for one didn't cover the next*. #32 built a guard for renames: anything that
both appears and disappears in one notes edit gets asked about. **The next day**,
#35 walked straight past it — a duplicate name neither appears nor disappears,
so the id was already known, nothing was flagged, and Pull's starting numbers
quietly overwrote Push's.

One day is the part worth sitting with. This wasn't a guard that decayed, or one
whose author had moved on and left no context. It was written, shipped, and
bypassed inside twenty-four hours, by someone holding the whole problem in mind,
because it had been scoped to the instance in front of it rather than to the
class. The class is "ids are derived from a mutable label". A guard built for
the class asks a different question: not *did a name change?* but *did the set
of ids change in a way nobody stated?*

**Twelve never shipped** — #4, #8, #9, #10, #11, #12, #13, #14, #20, #22, #31,
#32 — caught while the change was being made. The sharpest are the ones whose
commit message says the obvious way of writing it would have done the opposite
of what was wanted: #13, where a never-trained day would have permanently held
the badge meant for the most overdue one, and #31, where the load path would
have discarded phone edits on the next page load. That is the system working.
It's also why the register includes them: they cost nothing here only because
the question got asked in time, and the same question unasked is #35.

**Nothing was caught by an automated test, because there are none.** The one
piece of real verification in the project — four Drive scenarios against the
real `backUp()` with Google stubbed at the network boundary — was written as a
throwaway script and deliberately not committed, and [`ea967c6`](https://github.com/sartaj1995/workout-tracker/commit/ea967c6)
records why: wiring up a runner needed a bundler the project doesn't ship, and
the postinstall was blocked by the repo's script policy. That decision was made
once, early, for good local reasons, and it has been paid for continuously ever
since.

**One regression, and only measurement caught it.** #18 → #27. The fix for a
backgrounded-timer bug reproduced both of that bug's symptoms through a
different subsystem. The reasoning behind it was sound, coherent and wrong, and
what settled it was one number: with the context suspended, four seconds of wall
time advanced the audio clock by zero.

---

## What I'd have done differently from the start

Ordered by how many rows of the table each one would have removed, not by how
good it sounds.

**1. Given every exercise a stable id, independent of its name, on day one.**
Removes #8, #12, #14, #32 and #35 outright — five defects across five pull
requests, plus the guard-that-didn't-generalise problem, plus every future one
of the same shape. The whole cluster exists because `id = slug(name)` was a
reasonable shortcut in a file only I would ever edit. It stopped being
reasonable the moment a second day reused a lift, and again the moment the notes
became editable from a phone, and the shortcut outlived both.

The tell was there in the first commit and I wrote it without reading it.
"Tricep pushdown (single)" and "Tricep pushdown (bar)" are in
[`7534c7a`](https://github.com/sartaj1995/workout-tracker/commit/7534c7a), the
initial build — two exercises whose *display names* carry a suffix that exists
only to force their ids apart. The moment a name is doing two jobs and one of
them is load-bearing, that's the point to separate them.

It didn't happen. Twenty-four pull requests later the same trick was reached for
again, this time as the *fix* for #35: the new Push lines are named "(push)",
and the commit justifies it by pointing at "(single)" and "(bar)" as precedent.
A workaround from day one had become the house style, and it is still standing
in for the design decision it was covering.

**2. Asked "where is the user standing?" before writing any of it.** Removes
#17, #19, and probably #18 — three defects, all reported by a user, all inside
the first two weeks. The question costs one minute and it is the highest-yield
minute in the project. A gym is loud, has no signal, and locks your screen; each
of those three facts broke a feature that had been built and reviewed at a desk.

**3. Picked the test harness in the first commit.** Not because tests would have
caught most of this — they wouldn't, the environmental ones are unreachable from
a test runner — but because #16 is the one defect in the table that would have
destroyed real data, it *was* verified, and the verification was thrown away for
tooling reasons. The cost of choosing a runner on day one is an hour. The cost
of choosing it at PR #10 is that you don't.

**4. Budgeted the Drive integration as five problems, not one.** Seven defects
from one feature isn't an argument against building it — the feature is right
and the app is better for it. It's an argument for knowing, before starting,
that "add backup" is shorthand for an auth lifecycle, an offline case, a
conflict case, a failure-visibility case and a first-run case, and that they all
arrive on the same day. Written out as five lines on a plan, at least three of
them get their zero state walked before the code exists.

**5. Written the zero state as the first case for every guard.** #10, #13 and
#16 are one mistake made three times: a guard written from the steady state, by
someone standing in the steady state. The empty install, the never-trained day,
the first sync. It reduces to a habit — write the `if` for "this has never
happened before" before the one for "this happened last time".

**6. Kept the README's claims unfalsifiable from the start.** #28 and #34 are
low-severity and completely avoidable. Any number written into prose is a
maintenance commitment; write the sentence so it stays true instead.

---

## What this register can't tell you

Worth stating, since a register that looks complete invites more confidence than
it has earned.

- **No cost data.** Nothing here records how long each defect took to find or to
  fix, so every row weighs the same. #1 was a CSS line; #16 could have destroyed
  every workout ever logged. The table doesn't know the difference.
- **Detection is inferred where the commit didn't say.** Thirteen rows quote the
  commit directly — #1, #2, #6, #17, #18, #19, #21, #24, #25, #26, #27, #33, #35
  carry wording like "reported after the first real gym session" or "found while
  testing this". The other twenty-two are read from context: a defect fixed
  inside a feature commit was almost certainly found while building it. Several
  of those could reasonably be labelled differently, and the *Design* count is
  the one most likely to be flattering.
- **Survivorship.** This is every defect that was *found*. The register has
  nothing to say about what's still in there, and the most useful row in it —
  #35, a silent id collision that produced no error at all — is a reminder that
  this class is specifically the kind you don't find.
- **It stops at PR #31.** Any later change adds a row.
