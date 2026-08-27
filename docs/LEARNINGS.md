# Learning log

What building this app actually taught me — kept for two reasons: so the next
small web app goes faster, and so the lessons that aren't really about code come
with me to client work.

Each entry is **what happened here** → **the thing that generalises**. The
concrete half matters: a principle you can't trace back to a scar you earned is
one you'll ignore under pressure. Commit hashes are in brackets, so the original
reasoning can be read in full with `git show <hash>`.

---

## 1. Product judgement

### A new option with no history will break your ranking

"Up next" picks the day left untrained longest. Adding an `Upper` day put a
never-trained day into that ranking at timestamp 0, so it would have held the
badge permanently — pointing at a substitute session instead of the real one
[`9fb0c47`, `cba099a`].

> **Generalises:** whenever you add a new entrant to a ranked or scored list, ask
> what its *missing* data does to its position. New products, new regions, new
> cohorts default to zero, null, or "never" — and zero is rarely neutral. In a
> prioritisation matrix or a scoring model, the blank cell is a decision, not an
> absence of one.

### Decide explicitly what counts towards what

Logging squash raised two questions that look like one. It counts towards the
week total and the streak (it plainly is training) but not towards the rotation
(it isn't a substitute for Push day) [`b3f981a`]. `Upper` is the mirror image: it
counts as a workout everywhere except the rotation [`cba099a`].

> **Generalises:** "does this count?" is never one question. Every metric has its
> own inclusion rule, and the same event can be in one and out of another. Write
> the rule per metric, not per event type. This is exactly the argument that eats
> a week on any KPI definition.

### A label that doesn't match its denominator reads as a bug

The totals stat counted gym sessions only, sitting next to "4 this week" which
counted everything. "3 workouts / 4 this week" looks broken even though both
numbers were right. Fixed by counting everything and relabelling to "sessions"
[`b3f981a`].

> **Generalises:** two numbers on the same page are read as comparable whether or
> not you meant them to be. Inconsistent denominators sitting next to each other
> cost you the reader's trust in the whole page — and you rarely win it back with
> a footnote.

### Space is a budget, and the burden of proof is on each element

Folding `Upper` behind a "Short on time" disclosure freed 164px on a 375px
screen — about a fifth of the viewport — for something reached occasionally
rather than every session [`71dd082`]. The rest timer's progress bar went for the
same reason: it showed proportion remaining, which the clock already gave more
precisely. It became the bar's own draining background, which freed the whole
middle for a third control [`916a2a4`].

> **Generalises:** ask of every element "what does this earn?" Duplicated
> information is the cheapest thing to cut — two encodings of one fact, where one
> is more precise. Quantify the cost (a fifth of the screen, a third of the page)
> and the argument stops being about taste.

### Don't apply a good pattern where it doesn't pay

The same disclosure treatment was deliberately *not* applied to activity logging:
that button already opens a sheet, so a header above it would cost a tap to
reveal a control that opens another control, occupy the same row, and save no
space. Three taps to log squash, nothing gained. It was **moved** instead — out
of the "start a workout" zone, since recording something already done doesn't
belong there [`71dd082`].

> **Generalises:** the second use of a pattern is where it stops being judgement
> and starts being a habit. Re-derive the benefit each time. And note that where
> something sits carries meaning independently of what it says.

### Fix the cause, not the symptom you were handed

"The rest beep is too quiet" was two problems. One was real: a sine pair with no
harmonics to cut through gym noise. The other was that with the screen off the
alert often didn't fire at all — and the root cause of that wasn't the sound, it
was the screen locking during a workout at all. The fix was a wake lock, which
also removed the unlock-between-every-set annoyance nobody had reported
[`be74b6f`].

> **Generalises:** the reported symptom is where the client noticed, not where the
> problem lives. Keep asking "why is that happening" past the point it feels
> productive. The best fixes solve a problem nobody put on the list.

---

## 2. Data and modelling

### Identity decides whether things aggregate or split

`Upper` reuses Dumbbell press from Push. Copying the line would have collided ids
and silently dropped one exercise. Giving them *distinct* ids would have been
worse: history forks, "no history yet" appears for a lift trained for months, and
the progress chart splits in two. They are the same lift, so they became one
exercise appearing on two days — which forced day membership and running order
out of the catalog into a separate `dayPlan` [`4f4358f`].

> **Generalises:** this is entity resolution, and it's the same decision as
> whether two rows are one customer. Wrong towards "distinct" and your history
> fragments; wrong towards "same" and one record silently overwrites another.
> Note the structural consequence too: once a thing can belong to more than one
> parent, the relationship needs its own table. An attribute on the record can't
> express it.

### Positional keys break silently on reorder

`OR` choice groups were keyed by position — `choice-1`, `choice-2`. Adding or
removing a group anywhere above would move a stored preference onto a completely
different pair. They're now keyed by their sorted members, so the id is stable
wherever the group sits [`77f6b0b`].

> **Generalises:** never key on position when you can key on content. This is the
> spreadsheet sin — `VLOOKUP` on column index, hard-coded cell references, a
> lookup that holds only while nobody inserts a row. It doesn't error; it quietly
> returns the wrong answer.

### Preferences need the right grain

A stored `OR` choice was global, so picking the machine on `Upper` silently
flipped Push to the machine too. Re-keyed by day *and* group [`a1eae3f`].

> **Generalises:** ask what the correct unit of a setting, assumption, or override
> is — global, per segment, per user, per row. Too coarse is invisible until two
> cases disagree, and by then people have been living with a wrong number.

### Retire, don't delete

Removing an exercise from the notes doesn't delete it; it's marked retired, so
past sessions and charts that reference it still render, but it's never offered
in a new workout [`3b05bd9`].

> **Generalises:** anything historical records point at can't simply be removed.
> Soft-delete with an active flag preserves the past while changing the future —
> the same pattern as an org chart, a price list, or a product taxonomy that has
> to stay joinable to last year's data.

### Model the new thing as itself, not as a variant of the old

Activities (squash, a run) were kept separate from Sessions rather than modelled
as a fourth kind of day. They have no exercises, sets or progression, so making
them Sessions would have dragged them into day resolution, the prefill seeds and
the progress charts for no benefit [`b3f981a`].

> **Generalises:** reusing an existing category because it's adjacent imports all
> of that category's machinery. Before extending a taxonomy, check what the new
> member inherits and whether any of it applies.

---

## 3. Designing for where it's actually used

### The environment of use is not the environment of development

Auto-backup fired once — at the moment a workout is saved, which is inside a gym,
usually with no signal. It failed there and nothing tried again. The manual "Back
up now" worked at home, which is why it looked like a bug in the automatic path.
Now a save records that Drive is *behind*, and that debt is retried when a
connection plausibly returned: on the network reporting itself online, on the app
returning to the foreground, and on load [`b299b22`].

> **Generalises:** the single most valuable question in this project was "where is
> the user standing when this runs?" A one-shot action fails in exactly the
> conditions it was designed for. Model the obligation ("this is owed") rather
> than the attempt ("we tried once").

### Timers stop when you aren't looking

The rest alert was played when a JavaScript timer noticed zero. A backgrounded
page has its timers throttled to the point of never firing, so with the phone in
a pocket nothing happened. The alert is now scheduled on the audio clock the
moment rest starts — the audio thread keeps its own time [`be74b6f`].

> **Generalises:** know which clock is actually running. Anything that depends on
> your process being awake to notice a deadline will miss it. Schedule with the
> component that keeps time independently.

### Make field-only behaviour testable from a desk

The rest alert only mattered in a gym, and the only way to check it was to go to
one. So Settings got a "Play the alert now" button [`be74b6f`]. Similarly,
service workers only register in a production build, so a `preview` launch config
was added to get a real one locally [`271bdb2`].

> **Generalises:** when the feedback loop requires being somewhere, build the hook
> that brings the observation to you. The hook almost always costs less than one
> trip.

### Test the first run, not the steady state

The backup conflict guard read
`if (remote && !force && record.seenModifiedTime && ...)`. A device that had never
synced has no `seenModifiedTime`, so the check short-circuited and it uploaded —
an empty fresh install overwriting a backup holding every workout ever logged.
The exact case the feature existed to survive [`ea967c6`].

> **Generalises:** guards get written from the steady state, where the author is
> standing. Day one, the empty case, the first-time user, the migration — none of
> them have the state the guard depends on. Walk the zero state deliberately.

### Automate the reversible direction; gate the irreversible one

Uploading never touches local data, so auto-backup is safe to run unattended.
Restore replaces everything, so it's manual, confirmed, and names how many local
workouts would be dropped [`e06c7f5`].

> **Generalises:** classify each operation by what it destroys, and let that
> decide how much friction it gets. Symmetric-looking pairs — push/pull,
> import/export, sync up/down — usually have wildly asymmetric blast radii.

### Silent failure is worse than no feature

Backup failures were recorded and shown — but only in Settings, which is not
where anyone looks. A banner now sits on the home screen with a one-tap retry
until it clears [`e06c7f5`, `b299b22`].

> **Generalises:** a safety net people believe in but that has quietly stopped
> working is more dangerous than an absent one. Surface failure where attention
> already is, not where the feature lives.

### Pick the path that avoids the review queue

Drive backup uses the `drive.file` scope, which reaches only files the app
created. Google classes it non-sensitive, so there's no verification step and no
"unverified app" warning. The Sheets scope would have meant either a formal
review or sign-ins expiring every 7 days [`e06c7f5`].

> **Generalises:** platform, legal and compliance constraints are design inputs,
> not paperwork to handle afterwards. A narrower scope that skips an approval
> process beats a broader one that needs it — and the choice is far cheaper
> before you build than after.

---

## 4. Shipping and change management

### Shipping new reference data isn't the same as it taking effect

Removing an exercise from the notes did nothing on an existing install: stored
data won the merge. The fix was to fingerprint the notes file and rebuild the
catalog on load when it differs [`3b05bd9`, [`src/lib/storage.ts`](../src/lib/storage.ts)].
Reordering exercises needed a second, less obvious change — stale in-app choices
had to be cleared, or an old preference would override the order just written
[`77f6b0b`].

> **Generalises:** deployed things hold state, and cached state beats new logic by
> default. Any change to reference data needs an explicit trigger *and* a decision
> about what stored user overrides now mean. A version stamp or content hash on
> the inputs is the cheap general answer.

### Never persist what came back from outside without validating it

The service worker cached whatever the network returned as the app shell. A
deployment-protection login redirect could therefore be stored *as the app* and
served on every later visit. Navigation responses are now stored only when they
are a real page from this origin, and the cache version was bumped to evict
anything already poisoned [`271bdb2`].

> **Generalises:** a successful-looking response is not a valid one. Validate
> before you persist, and keep a way to invalidate everything once you discover
> you stored something bad. The blast radius of a bad write is every subsequent
> read, until someone thinks to look.

### Renames need a sweep, in every language without a compiler

Renaming the `--accent` design token to `--primary` left the progress chart's
line, area and dots with no colour — CSS variables fail silently. Fixed by
sweeping every `var()` reference against the defined tokens [`3b05bd9`].

> **Generalises:** know which of your artefacts have a compiler checking them and
> which don't. Config, CSS, SQL column names, spreadsheet named ranges, deck
> templates — all fail quietly. A rename in any of them is a find-all, not an
> edit.

### Tooling constraints shape file layout

Exporting the `useStore` hook from the same file as a component broke React Fast
Refresh, throwing "useStore must be used inside StoreProvider" on most edits.
Splitting the context and hook out fixed it [`3b05bd9`].

> **Generalises:** when the dev loop misbehaves in a way that looks like an
> application bug, suspect the tooling's rules before your own logic.

---

## 5. Interfaces and communication

### One document, one audience

The README had grown into a 155-line manual with no pictures, opening on syntax
rather than on what the app is. Split in two: the README became a front page —
what it is, four screenshots, the features, and the five-minute path to your own
copy — with the reference material moved intact to
[`docs/MANUAL.md`](MANUAL.md) and linked [`f912d59`].

> **Generalises:** the same content serving two audiences serves neither. This is
> the deck-versus-appendix split, and the test is the same: what does someone who
> lands here cold need in the first ten seconds? Nothing was wrong with the old
> README. Nobody read that far.

### Demo material needs data that says something

Screenshots were captured at a 390x1000 mobile viewport against a throwaway
browser profile seeded with synthetic sessions, so the charts and the training
grid had something to show. Real exercise names, invented numbers [`f912d59`].

> **Generalises:** a screenshot or a dashboard mock of an empty system
> demonstrates nothing. Seed it deliberately — and be explicit about which parts
> are illustrative.

### Use the platform's primitives

The disclosure is a native `<details>`/`<summary>`, so keyboard support, screen
reader semantics and open state come from the platform rather than being
reimplemented [`71dd082`]. Emoji icons were replaced with inline SVG, since emoji
render differently on every platform and can't take design tokens [`e7446ed`].

> **Generalises:** the built-in version has handled edge cases you haven't thought
> of yet. Reach for the standard component, template or chart type first, and
> diverge only with a reason you can state.

### Accessibility is a checklist, not a feeling

Every text/background pair verified at ≥4.5:1; `--border` (decorative) split from
`--border-strong` (control bounds, 3:1); touch targets ≥44px; visible focus
rings; `prefers-reduced-motion` honoured; pinch zoom re-enabled [`e7446ed`]. The
Skip button stayed a full 44px rather than shrinking to small text, because it's
the one control you'd most regret mis-tapping with sweaty hands [`916a2a4`].

> **Generalises:** these are measurable, and therefore checkable, unlike "does
> this look clear". And size controls by the cost of getting them wrong, not by
> how often they're used.

---

## 6. Working with an AI coding agent

### The commit message is the real deliverable

Almost every message in this repo states the problem, the cause (often quoting
the offending line), the fix, and the consequences knowingly accepted — for
instance that a shared `OR` group means switching a pair on one day switches it
on the other [`4f4358f`]. This log was written from those messages long after the
fact, and could not have been written from the diffs.

> **Generalises:** record *why*, not what. The what is recoverable from the
> artefact; the why is gone the moment the person who decided it moves on. And
> writing down the downside you accepted is what separates a decision from a
> mistake you haven't noticed yet.

### Real use finds what review doesn't

The three most valuable fixes all begin "reported after the first real gym
session" or "reported from the deployed app": the inaudible beep, the backup that
never retried, the day card whose text ran together [`be74b6f`, `b299b22`,
`e7446ed`]. None would have come out of another read-through.

> **Generalises:** ship the thin version and use it. An hour of real use beats a
> day of review, and the failure modes it finds are the ones that actually matter
> — noise levels, no signal, sweaty hands.

### Know what only you can contribute

The agent handled correctness, structure and consistency well, and repeatedly
caught consequences of a change that weren't asked about — the id collision
[`4f4358f`], the positional keys [`77f6b0b`], the ranking a new day would break
[`cba099a`]. What it could not know was gym noise, that the screen locks between
sets, and that a basement gym has no signal.

> **Generalises:** the leverage is in supplying the real-world context the model
> has no access to, and in checking its output against that. Same as any good
> analyst relationship — the value you add is the situation, not the mechanics.

### Say what you verified and what you didn't

The Drive commit states plainly that everything was verified up to the OAuth
round trip, which needed a real Google account [`e06c7f5`]. The first-connect
guard was verified against the real `backUp()` with Google stubbed at the network
boundary, four scenarios named — and it records that the check was written as a
throwaway script rather than committed, and why [`ea967c6`].

> **Generalises:** stating the boundary of what you tested is what makes the rest
> of the claim credible. "Verified" without a scope is worth nothing, and so is a
> caveat buried where nobody will find it.

### One change per branch, one branch per PR

Fifteen PRs, each a single user-visible change plus the plumbing it needs. Every
entry above maps to exactly one of them, which is the only reason this log was
cheap to write.

> **Generalises:** work in slices that are individually explainable. If you can't
> describe the change in a sentence, it's two changes.

---

## Next time: the checklist

**Before starting**

- Can this have no backend? No accounts, no server, no cost, no privacy question,
  no ops. Local-first removes a whole class of problems rather than solving them.
- What's the narrowest permission scope that works, and does it skip a review
  process?
- Where is the user physically standing when they use this? Design for that
  place, not the desk it's built at.

**While building**

- Key on content, never on position.
- Every setting: what's the right grain?
- Every new category: what does it inherit, and what does its missing history do
  to anything ranked?
- Every persisted write: validated before storing, invalidatable afterwards.
- Every failure: recorded, and surfaced where attention already is.
- Every destructive action: manual, confirmed, naming what will be lost.

**Before shipping a change**

- What does an existing install do with this? Is there a trigger for it to take
  effect?
- What stored user overrides now conflict with it?
- Walk the zero state: fresh device, empty data, first run.

**After shipping**

- Use it for real, in the real place. Then fix what that finds first.
