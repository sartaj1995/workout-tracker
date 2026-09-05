# Learning log

What building this app actually taught me — kept for two reasons: so the next
small web app goes faster, and so the lessons that aren't really about code come
with me to client work.

Each entry is **what happened here** → **the thing that generalises**. The
concrete half matters: a principle you can't trace back to a scar you earned is
one you'll ignore under pressure. Commit hashes are in brackets, so the original
reasoning can be read in full with `git show <hash>`.

Started after the first fifteen pull requests, extended after the next twelve.
One entry below is marked **revised**: the principle was right, the fix
underneath it was still wrong, and finding that out was worth more than either.

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

### Typed is work, ticked is just bookkeeping

Tapping the other side of an `OR` pair rebuilt the card from scratch, so two sets
logged on the single-handle pushdown vanished the moment you tapped the bar to
see what it was. The swap is *right* when the card is empty — deciding what
you're doing before you start is the everyday case — and only destructive once
there's work in it, so the behaviour now branches on that. Crucially the
threshold is **typed, not ticked**: numbers entered but not yet checked off were
being thrown away too [`486ac31`].

> **Generalises:** the same gesture can be a convenience or a data loss depending
> on state, so branch on "has this person invested anything yet?" And set that
> line at the first keystroke, not at the formal act of completion. A half-filled
> form, an unsaved draft, an unsubmitted model — all of it is somebody's work,
> and none of it has been marked as such.

### Build the detector for the case that needs telling

The progression hint fired when you *cleared* the rep ceiling — the happy case,
where you already know it went well. The opposite case, stuck on the same weight
for weeks, is where you actually need telling, and nothing said anything. Every
exercise is now counted against its own best and flagged past four sessions
without beating it [`9bf08b6`].

> **Generalises:** monitoring gets built around events, and stagnation isn't one.
> The absence of movement generates no signal, announces nothing, and is exactly
> what a human stops noticing. Ask what the *silent* failure state is and
> instrument that, not just the one that raises its hand.

### An insight has to arrive where the decision is

Stall detection shows as a chip on the exercise card during the workout — before
you load the same weight you've loaded five times without thinking — not only as
a list in the Progress tab. It also carries the action: a restart weight about a
tenth down, rounded to a jump the equipment can actually make. Rep-only exercises
get no number at all, because telling someone to do fewer pull-ups isn't a plan
[`9bf08b6`].

> **Generalises:** an insight delivered somewhere other than the moment of the
> decision is a fact, not a recommendation, and it changes nothing. Put it in the
> path of the choice it should alter — and if you can't attach an action to it,
> think harder before shipping it as advice.

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

### An inconsistent error is worse than a large consistent one

A set logged as `30x8` counted 240kg towards workload, but there are two 30kg
dumbbells, so 480kg actually left the chest. Halving everything would have been
survivable on its own — a trend line doesn't care about a constant factor. What
isn't survivable is that **the factor isn't constant**: it lands on some
exercises and not others, including both halves of the same `OR` pair. Three sets
of dumbbell press read 825kg where the machine press it alternates with read
2,005kg, so switching sides moved the day's workload by 2.4× with no change in
effort — precisely the reading the chart exists to give [`b1d7909`].

The same change deliberately left the *progress* charts alone. A dumbbell number
there means one dumbbell, which is how the lift is normally quoted; workload says
"kg moved", so it has to be true.

> **Generalises:** size is the wrong axis to judge an error on. A large bias that
> applies evenly cancels out of every comparison you care about; a small one that
> applies unevenly corrupts all of them, and hides inside plausible-looking
> numbers. And the same figure can be correct in one exhibit and wrong in the
> next — what makes it right is **the claim the exhibit is making**, not the
> arithmetic.

### A combined series can track its mix instead of its trend

Workload is charted one day at a time and never all on one line. A Legs session
moves several times the tonnage of a Push one — 4,130kg against 1,808kg in the
test data — so a combined chart would be a sawtooth tracking *which day it was*
rather than whether the work is going anywhere. Plate-numbered machines and timed
holds stay out of the total entirely, since their numbers aren't kilos
[`9bf08b6`].

> **Generalises:** when you aggregate across categories with different baselines,
> the resulting line moves with the composition of the period, not the
> performance in it. Every apparent trend then has to be defended against "did
> the mix just change?" Split the series, or index each category to itself. And
> anything measured in units that aren't the same units doesn't belong in the sum
> at any weight.

### Compute on read, so a correction reaches the past

Workload is derived when it's displayed rather than stored when it's logged, so
ticking the two-implement flag for an exercise fixes its entire history rather
than only what comes next [`b1d7909`].

> **Generalises:** storing a derived value bakes in the definition you held on the
> day you wrote it. Recomputing from the raw record makes a definition change
> retroactive and keeps the back-series comparable — which is usually what you
> want, and always what you want while the definition is still being argued about.

### A rename is a delete plus a create unless someone says otherwise

Ids are slugs of names, so tidying "Chest sup row" into "Chest supported row"
reads to the system as one exercise vanishing and an unrelated one arriving.
Every session, chart, best and stall count stays behind on a name you can no
longer see, and the new one starts from zero. Nothing errors, and you'd notice
weeks later. Anything that both appears and disappears in one edit is now asked
about, and answering "renamed from" carries the id — and the history with it
[`4e05680`].

> **Generalises:** continuity of identity is information only a person holds; no
> diff contains it. Any system keyed off a label needs an explicit channel for
> "this is the same thing under a new name" — otherwise every reorganisation,
> rebrand or taxonomy tidy-up silently truncates the history it passes through.

### A correction has to travel as far as the error did

Nothing that reached History could be changed, and a saved number isn't inert: it
becomes next session's prefill, a point on the progress chart, and possibly a
false personal best. One mistyped `250` for `25` quietly poisoned three things at
once. Making sessions editable meant making the *seed* follow — a correction
moves it, correcting an older session doesn't (a newer one still has the last
word), and deleting the last session an exercise appears in resets its seed to the
notes, so deleting a workout logged by mistake genuinely undoes it [`e7ae76e`].

> **Generalises:** fixing the source record is the easy half. Everything
> downstream that was computed from it — caches, seeds, derived tables, the deck
> someone already circulated — still carries the bad number, and none of it will
> tell you. Trace the blast radius of a correction as carefully as you'd trace the
> blast radius of a bug.

### Don't infer a durable fact from a transient artefact

"Has this person ever granted Drive access?" was answered by looking for an access
token. Tokens last about an hour, so a token that had expired or been rejected
read as consent withdrawn, and the app asked for full consent again instead of
quietly reissuing. The grant is now recorded separately and cleared only by an
explicit Disconnect [`b17d3ab`].

> **Generalises:** a convenient proxy is not the fact. Presence of a session isn't
> agreement, activity isn't engagement, a returned form isn't approval — and the
> moment the proxy expires on a different schedule than the fact, the system
> starts asserting something untrue. Store the thing you actually mean.

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

### Timers stop when you aren't looking — *revised*

The rest alert was played when a JavaScript timer noticed zero. A backgrounded
page has its timers throttled to the point of never firing, so with the phone in
a pocket nothing happened. The alert was moved onto the audio clock, which keeps
its own time [`be74b6f`].

That fix was right in principle and still wrong in fact. **The audio clock stops
too.** A context with nothing playing is suspended the moment the page
backgrounds, and its clock suspends with it — measured in the browser, four
seconds of wall time advanced the audio clock by zero. So the alert fired late by
however long you were away, or never. Both of the original symptoms, back again,
from a mechanism chosen specifically to avoid them.

What actually holds: something inaudible plays for the length of every rest — a
30Hz tone at a ten-thousandth of gain — because a context with something playing
keeps running. And under that, a net: both clocks are recorded when the alert is
scheduled, and on return whatever the audio clock failed to advance is time the
alert didn't count down, so it's re-scheduled against the wall clock [`e4251f8`].

> **Generalises:** knowing which clock is running is only half of it. The
> replacement you reach for can share the failure you're escaping — a different
> subsystem is not automatically an exempt one. **Verify the new mechanism in the
> failure condition itself**, rather than trusting the reasoning that led you to
> it. Two rounds here, and the second was only found by measuring.

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

### Attach the ask to a gesture that already exists

Finishing a workout kept reporting "Google sign-in needed" and leaving the backup
owed. Browser sign-in hands out a token good for about an hour, with no refresh
token available to a page with no backend, so by the time a workout ends the
token is almost always dead — and the automatic backup, running without a
gesture, correctly refused to raise a window nobody asked for. The gesture was
there all along: **"Save workout" is a tap, moments before the backup runs.** The
token is now requested from that handler [`b17d3ab`].

It has to be called from inside the handler, not from an `await` that settles a
moment later, because Safari only opens a window from the handler itself. And the
library is fetched on app open rather than inside the gesture, since downloading
a script can consume the whole window the tap bought you.

> **Generalises:** when a system needs authorisation, attention or a decision,
> don't manufacture a new interruption for it — find the moment the person is
> already acting and attach it there. The budget for interrupting someone is
> small, and it is nearly always cheaper to ride an existing action than to
> invent one. Note also how narrow the window can be: permission to interrupt
> expires, sometimes in milliseconds.

### A fallback has to prove the failure it exists to cover

The net that re-schedules a missed rest alert could easily cause the double beep
it exists to prevent. So it acts only on evidence: the tones report having
sounded via their own `ended` event rather than being assumed to have played, and
the two clocks are compared rather than the audio context's state being sampled,
which races with the browser resuming it. Verified in both directions — nothing
re-fires when the alert was already heard, nothing re-fires when the page never
left [`e4251f8`].

> **Generalises:** a safety net that triggers on suspicion becomes a second
> source of the fault. Gate recovery on positive evidence that the thing actually
> failed, and test the *false-positive* direction as deliberately as the case you
> built it for. Retries, failovers and reconciliation jobs all fail this way, and
> they fail loudly in production.

### The repair path has to reach the place the problem is found

Adding an exercise meant editing a TypeScript file and redeploying — impossible
from the gym floor, which is exactly where you are when you discover the gym has
a machine your notes don't. Settings now opens the same notes in a text box
[`4e05680`].

> **Generalises:** it isn't enough to design the product for where it's used; the
> **means of fixing it** has to be usable from there too. A correction that
> requires a laptop, a VPN, or a person who's on holiday is a correction that
> doesn't happen at the moment it's needed — and the gap between noticing and
> being able to act is where most bad data gets written.

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

### When you remove the friction, you remove the check it was doing

Letting people edit their exercises in the app took the laptop out of the loop —
and with it something nobody had written down. *What a deploy quietly provided
was a diff and a moment to notice something was wrong.* Replacing it took
deliberate work: a live count of exercises per day that should match the home
screen, and warnings for lines that parsed to nothing — a name above the first
heading, a bare name matching no earlier exercise, or the long dash a phone
keyboard substitutes for `" - "` [`4e05680`].

> **Generalises:** slow paths accumulate safeguards that nobody records as
> safeguards — a review, a diff, a second pair of eyes, the pause before you
> press send. Streamline the path and those disappear silently, and the failure
> shows up later as "how did that get through?" **Before removing a step, name
> what it was catching**, then decide explicitly whether to rebuild it or accept
> its loss. This is the whole argument about removing approval gates.

### Once people can edit it, your file is a starting point, not an instruction

Notes edited in the app take over from that point; the shipped file stops being a
standing instruction and becomes a seed, with an explicit way back to it. That
needed the load path fixed — it compared the stored fingerprint against the
*built-in* notes and rebuilt from them on any difference, which would have thrown
away phone edits on the very next page load [`4e05680`].

> **Generalises:** the moment you let people edit something you also generate,
> authority over it inverts, and any sync logic written under the old assumption
> now destroys their work on a schedule. Decide who owns each field, and make
> "reset to default" a deliberate action rather than the default behaviour.

### Write claims that don't decay

The README said eleven merged pull requests and 3,400 lines of source; by the
time anyone read it, it was twenty and past four thousand. Both were rephrased to
describe the shape of the thing rather than a number needing maintenance
[`d503730`]. Separately, the README had drifted about a week behind the app —
the manual was updated with each feature and the front page wasn't, and every
screenshot showed an older UI [`fd72078`].

> **Generalises:** any figure you write into a document is a maintenance
> commitment you're unlikely to honour. Either give it an owner and a refresh
> trigger, or write the sentence so it stays true — the second is almost always
> better. And documentation rots hardest in the parts your change didn't touch,
> so "which other artefacts describe this?" belongs on the checklist, screenshots
> included.

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

### Publish a derived number with the ways it misleads

The Progress tab charted "est. 1RM (kg)" with nothing anywhere saying what it
was. Log `80x9`, see `104`, and there's no way to tell where it came from or
whether it means you can lift 104. The docs now give the formula, a worked
example, why an estimate beats raw weight — and, most usefully, the three ways it
misreads: it tracks your best set rather than your workload, drop sets don't
raise it, and it runs optimistic past ten reps [`d12880f`].

> **Generalises:** a derived number without its derivation is either ignored or
> over-trusted, and you don't get to choose which. Ship the definition where the
> number is *read*, not in an appendix — and state its failure modes explicitly.
> Naming the three ways your metric lies is what makes the other readings
> credible; it reads as confidence, not weakness.

### Ask while they still know the answer

Workouts now carry a note — how you slept, what hurt, what to change. It's
offered in the finish sheet because that is the only moment you still remember,
and it stays editable from History afterwards. It's kept distinct from an
exercise's note, which is a standing setup reminder rather than a record of one
day [`e7ae76e`].

> **Generalises:** context decays fast, and a form sent the next morning collects
> a worse answer than the same question asked at the moment of the event. Put
> capture at the point of knowledge, keep it optional, and let it be corrected
> later — retrospective reconstruction is the most expensive and least reliable
> data you can gather.

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

### A confident wrong guess costs more than a question

When a notes edit both removes a name and adds one, the app guesses at a rename
by name similarity — but the guess is only ever a **pre-selection**, never an
auto-confirm. A wrong confident answer would silently strand months of history on
an invisible id, so the confirmation stays with the person [`4e05680`].

> **Generalises:** the right question for any automated inference isn't "how often
> is it right?" but "what does a wrong one cost, and would anyone notice?" High
> accuracy plus a silent, expensive, late-surfacing failure is a worse trade than
> a slightly annoying prompt. Let the machine do the work and propose the answer;
> keep the confirmation where the consequence lands.

### Measure the assumption instead of reasoning about it

The audio-clock fix was a sound piece of reasoning from a plausible model of how
browsers behave, and it was wrong. What settled it wasn't more argument but a
measurement: with the context suspended, four seconds of wall time advanced the
audio clock by zero [`e4251f8`].

> **Generalises:** a model and I can both produce confident, coherent, internally
> consistent reasoning about a system neither of us has actually observed — and
> plausibility is exactly what makes that hard to catch in review. When a fix
> rests on how something behaves, go and measure the behaviour. One number ends
> the discussion that a page of argument won't.

---

## Next time: the checklist

**Before starting**

- Can this have no backend? No accounts, no server, no cost, no privacy question,
  no ops. Local-first removes a whole class of problems rather than solving them.
- What's the narrowest permission scope that works, and does it skip a review
  process?
- Where is the user physically standing when they use this? Design for that
  place, not the desk it's built at — and can they *fix* it from there too?

**While building**

- Key on content, never on position.
- Every setting: what's the right grain?
- Every new category: what does it inherit, and what does its missing history do
  to anything ranked?
- Every persisted write: validated before storing, invalidatable afterwards.
- Every failure: recorded, and surfaced where attention already is.
- Every destructive action: manual, confirmed, naming what will be lost.
- Every derived number: shipped with its definition and the ways it misleads.
- Every aggregate across unlike categories: is that line tracking the trend, or
  the mix?
- Every error in the data: is it consistent? An uneven small one beats an even
  large one only in size, and loses on everything else.
- Every stored fact: is it the fact, or a proxy that expires on its own schedule?
- Every gesture that discards work: does it branch on whether there's work to
  discard — counting typed, not just ticked?
- Every automated guess: what does a wrong one cost, and would anyone notice?

**Before shipping a change**

- What does an existing install do with this? Is there a trigger for it to take
  effect?
- What stored user overrides now conflict with it?
- Walk the zero state: fresh device, empty data, first run.
- What was the slow path quietly checking that the fast one no longer does?
- What else describes this? README, manual, screenshots, the deck — the parts
  your change didn't touch are where it rots.
- Any claim with a number in it: does it need an owner, or a rewrite that can't
  go stale?

**After shipping**

- Use it for real, in the real place. Then fix what that finds first.
- When a fix rests on how something behaves, measure the behaviour. The
  second-round bug hides inside reasoning that sounded right.
