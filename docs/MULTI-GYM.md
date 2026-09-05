# Design note: more than one gym

Not built. Written while the question was fresh, so that when a second gym
actually happens the thinking doesn't have to start from nothing.

**The question.** You start training somewhere else as well. Some exercises
have the same names, some don't, and the numbers on a machine called "Chest
press (sitting)" at one gym mean nothing at the other. You want one app, with
something at the start that asks which gym you're in, and the same
Push/Pull/Legs structure inside each.

**The worry that prompted it.** Exercise ids are made from names, so two gyms
with a machine of the same name would collide.

- [What the coupling actually is](#what-the-coupling-actually-is)
- [Two shapes I'd rule out](#two-shapes-id-rule-out)
- [The shape I'd build](#the-shape-id-build)
- [The interesting part: is it the same exercise?](#the-interesting-part-is-it-the-same-exercise)
- [What it touches](#what-it-touches)
- [When to build it](#when-to-build-it)

---

## What the coupling actually is

It's one function deep. `slugify` is called in exactly one place that mints an
id, in [`src/data/parse.ts`](../src/data/parse.ts):

```ts
const idFor = (name: string) => renames[slugify(name)] ?? slugify(name)
```

Everywhere else — `sessions[].entries[].exerciseId`, `seeds`, `catalog`,
`dayPlan`, `choicePicks` — holds an **opaque string**. Nothing downstream parses
an id, splits it, or assumes it resembles a name.

And the invariant "id equals the slug of the name" is **already broken on
purpose**. After the rename work, an exercise displayed as "Chest supported row"
has the id `chest-sup-row`, and everything kept working. Ids are already stable
keys that merely *default* to being minted from a name.

That's the property the whole design rests on. Scoping ids per gym is a change
to one function, not to the data model.

The one shallow coupling left is `OVERRIDES` in
[`src/data/notes.ts`](../src/data/notes.ts), a build-time map keyed by id. It
would need to become per-gym — and the `110s` / `plate` notes syntax has largely
superseded it anyway.

---

## Two shapes I'd rule out

### A second copy of the app

Two deployments, two service workers, two Drive backups, and every future change
made twice. It solves the collision by giving up on the app being one thing.

### A separate `AppState` per gym

The obvious move, and it looks clean: total isolation, no collisions possible,
every existing feature works untouched inside a gym.

It silos the wrong things. The week streak, the eight-week grid, "this week" —
those are facts about **you**, not about a building. Training on Tuesday at the
second gym would leave a hole in your consistency whenever you were looking at
the first. It gets the motivational half of the app wrong, which is the half
that has to be right on the day you don't feel like going.

It also doubles the backup surface and makes "am I training more than last
month?" unanswerable without merging two stores by hand.

---

## The shape I'd build

Split on the real seam: **a gym scopes the plan; you own the history.**

| Per gym | Global |
| --- | --- |
| Notes, day plan, catalog | Sessions, each tagged with its gym |
| `plates`, `barWeight`, `weightStep` | Activities, streak, week strip, history grid |
| Which side of each `OR` pair you use there | Rest timer, sound, vibrate, `repCeiling` |

That prefs split is worth noticing on its own. `plates` and `barWeight` are
already gym facts sitting in global prefs, and so is `weightStep` — "the
smallest jump you can make" is a property of the dumbbell rack, not of you.
Whereas `repCeiling` is a training preference and travels with you.

**Scope the id at the minting point only.** A new gym mints
`gymB:rear-delt-fly`; the original gym keeps bare slugs. Nothing migrates, and
not one existing session is rewritten. "No prefix" simply means the first gym,
which is what every row in the current store already is.

Model it as a named **plan** rather than a "gym". Identical mechanics, but it
also covers a travel or bodyweight block, or a deload phase, without having to
rename the concept later.

Workload should be scoped per (plan, day), extending the reason it is already
per day: different machines move different tonnage, so a combined chart tracks
the equipment rather than the effort.

---

## The interesting part: is it the same exercise?

"Is gym B's *Dumbbell press* the same exercise as gym A's?" has no single
answer:

- **Dumbbells are dumbbells.** 30 kg is 30 kg. One chart, one continuous
  history, one stall count — you'd want that shared.
- **"Chest press (sitting)" on another machine** is a different lever arm and a
  different stack. Shared, the chart is nonsense.
- **Barbell work** sits in between, and depends on whether the bars weigh the
  same.

So it has to be a per-exercise choice — and that is *the same question the
rename screen already asks*, with the same consequences and the same
confirmation UI. Setting up a second plan would walk through "a new machine, or
one you already track?", and `renames` is already the mechanism that carries a
history across two names.

Which means the hard part is built. What's missing is the scoping around it.

---

## What it touches

Roughly the size of the editable-notes work.

- **Storage shape and a migration.** `AppState` gains plans and an active plan;
  `notes` and `renames` become per-plan; existing state becomes plan one.
- **`parse.ts`** — `idFor` takes the plan.
- **`Session`** gains its plan id.
- **A switcher**, and a decision about where it lives. Probably not a blocking
  screen at launch: you're in one gym far more often than you're switching, and
  a full-screen question every time you open the app to log a set would get old
  fast. Better in the header, or on the home screen where the day cards are.
- **Every screen listing exercises** filters by the active plan: Progress
  picker, "Not moving", the counts-twice checklist, the notes editor.
- **Backup and Drive sync** carry the whole thing, which they already would —
  they serialise `AppState` wholesale.

---

## When to build it

When the second gym is real, not before.

Not because it's hard, but because the sharing decisions depend entirely on
what's actually in that gym — which machines match, which bars weigh the same,
which dumbbells go high enough. Building the mechanism against an imagined
second gym means guessing those, and the guesses are the part that would be
wrong.

Nothing in the code today paints you into a corner. That's the point of writing
this down rather than building it.
