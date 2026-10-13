# Option 4: Scars & Slow Work (runes have a history, research is a slow project)

> *Proposal, not a decision.* One of four packages for **desk research** and **mastery** (see [README](README.md)).

## Pitch

Runes aren't clean, they're **lived-in**. Each inscribed rune keeps a handwritten **chronicle** of what happened to it (*"Scorched in the Seam. Killed a sentry while inked. Dropped in a canal."*). Enough of the same kind of event hardens into a **quirk**: a permanent, sometimes double-edged personality (*Singed*, *Shy*, *Bloodthirsty*). Research isn't a puzzle at a bench, it's **Slow Work**: you put projects on the **slate**, feed them reagents and *specific things from the world*, and they finish **after a number of expeditions**, while the study keeps its own life (the notebook writes back, the previous owner's marginalia shifts).

This is the weirdest of the four and the most narrative: the runes and the notebook feel **haunted**.

**One-line fantasy:** you aren't improving a toolkit, you're keeping a household of difficult, brilliant objects.

## Inspirations (and what we take)

| Game | Taken |
|---|---|
| *Darkest Dungeon* | Quirks gained from stress and events, good and bad; the town's slow upgrade tasks between trips |
| *Cultist Simulator* | Verbs on a table; projects that take **time** and consume odd ingredients; text that feels like a haunted book |
| *Shadow of Mordor* (Nemesis) | Things remember what happened to them, and carry grudges / fame |
| *Caves of Qud* | Mutations as identity; defects are interesting |
| *Hades* (Keepsakes) / *Hollow Knight* (Charms) | Equippable personality modifiers |
| *Disco Elysium* (Thought Cabinet) | Slowly "internalising" a thought over time, with permanent effects |
| *Book of Hours* | The occult study as a place with time passing |

## Mastery: the chronicle and quirks

### Instances, not counts
Each rune you own is a **specific copy** with a **chronicle**: a list of event tags written by the engine from the existing `GameEvent` log, along with where and against what. Examples of tags: `ignited-oil`, `killed-inked`, `absorbed-lethal`, `fell-in-steam`, `survived-wipe`, `echoed`, `friendly-fire`.

### Quirks crystallise from patterns
A quirk forms when a tag count crosses a threshold (3 / 8 for a stronger form) and the rune is next **inscribed or removed at the desk**: the notebook shows a reveal ("Your Spark has gotten used to the smell of oil"). The rune has **at most 2 quirks**. A third pattern replaces the oldest unless you **lock** one with a reagent.

| Tag pattern | Quirk | Good | Bad |
|---|---|---|---|
| ignited oil ×8 | **Singed** | Fires linger 1 round longer | Your own oil can't be placed adjacent to a friendly |
| killed inked ×8 | **Bloodhound** | +1 damage to inked | Treats un-inked as -1 |
| absorbed lethal ×3 (Ward) | **Martyr** | Shield 3 | Ward can't target self |
| friendly-fire ×3 | **Reckless** | Splash +1 radius | Friendly fire dmg +1 |
| cast in steam ×8 | **Shy** | Steam cover bonus (untargeted) | Won't hit units outside steam on Bolt |
| fell/slid into canal ×3 | **Damp** | Resists fire | Spark −1 |
| survived wipe ×1 | **Veteran** | Never fizzles; echo survives a downed caster | Costs +1 ink |

Quirks are **small rule edits**, always readable in one line, and **about 40% are mixed blessings**, as in *Darkest Dungeon*: the point is to make the player **decide**, not just collect. Ink cost changes too, so a quirky rune competes for the same budget.

### Steering (so it isn't just luck)
You can't pick a quirk, but you can **steer**: a rune only gains tags when it participates in a cast, so you put it where you want it to learn. The codex lists every quirk silhouette (`???` with the *tag family* visible, e.g. "forged by fire"), so the player knows what class of thing leads there. A **Dwell** option in the notebook ("keep it out of play") freezes a rune's tags so it won't pick up an unwanted habit.

### Rumours and grudges (a spice, optional)
Runes that have a **long chronicle** become known to the guilds: Brass Guild wardens might recognise your *Veteran* Bolt. This creates a tiny **Nemesis** hook for rival inscriber fights (post-v0): an enemy lattice can contain a *copy of your famous rune*, a mirror match.

## Desk research: Slow Work

### The slate
The desk has a **slate** with **2 project slots** (a third as ink capacity grows). A **project** has:
- a **verb** (what kind of work),
- **ingredients** (some are reagents from loot, some are *world tokens*, see below),
- a **duration in beats**. A **beat** passes at the end of every **encounter** won in the field (so a 3-encounter trip ticks 3 times; pushing on is faster but riskier).
- a **result** revealed on completion.

Projects tick *only while you're out*, so pushing deeper literally buys the study time to think. Idle evenings don't help, which keeps the loop honest.

### Verbs (kinds of project)

| Verb | Ingredients | Beats | Result |
|---|---|---|---|
| **Transcribe** | a rune you own + ink reserve fragment | 2 | a **second copy** of that rune, with its *chronicle erased* (a clean twin) |
| **Distill** | a rune with a quirk + *Alembic* | 3 | extracts the quirk into a **Tincture** and leaves the rune clean |
| **Imbue** | a Tincture + a rune | 2 | attaches that quirk to another rune (quirks are transplantable) |
| **Decipher** | a `???` page + a **world token** | 3–4 | unlocks a new rune from a half-written recipe |
| **Cross-reference** | two runes you own | 4 | a **hybrid**: one slot that behaves as either parent (chosen at cast time) |
| **Exorcise** | a rune with a bad quirk + *salt* | 1 | removes a quirk, keeping the others |

### World tokens (the world reacts)
Decipher projects need **tokens dropped by specific enemies or places**, not generic currency:
- *Brass sentry core* (Brass Guild constructs)
- *Wet ledger page* (canal districts)
- *Familiar's quill* (ink familiars)
- *A jar of fogged air* (bathhouses)

The slate shows the required token as a silhouette. This lets the **district map** (post-v0) matter for research: you *go* somewhere to get a specific piece. The `???` is both a recipe and a destination.

### The notebook writes back
Between trips the notebook gives **one marginal note** per completed project and per notable chronicle event, in the previous owner's hand, sometimes contradicting itself: *"I told them the oil would hold. It did not."* Notes are selected by tag from a small pool; the **mystery thread** advances by project verbs, not cutscenes. Projects are the quiet clock for the owner's story.

### UI at 375×812
```
┌ slate ────────────────────┐
│ ① Decipher "Smear"   ●●○  (2/3 beats)   needs: familiar's quill ✓
│ ② Distill Singed     ●○○                  needs: alembic ✓
│ ③ (locked: more ink)      │
├ shelf (runes with chronicles) ──┤
│ [Spark ✎ Singed][Bolt ✎]… │   ✎ = open chronicle
└ note ─────────────────────┘
   "Day 14. The Bolt has opinions."
```

## How research and mastery interlock
- **Distill / Imbue** moves quirks between runes: mastery isn't locked to a rune; it's a currency of **personality**. A *Bloodhound* quirk found on a Bolt can end up on a Splash.
- **Exorcise / Dwell** give the player control over the dark side, so mastery stays a build choice.
- Projects make **time a resource**: deeper expeditions = more beats, but also more risk to the very runes you want to use.

## Pillar check
| Pillar | Fit |
|---|---|
| Build like code | Medium: runes are now partially analogue |
| Fair danger | Strong: quirks are readable; nothing hidden except their formation |
| World reacts | **Strong**: tokens, chronicles, districts |
| Unknown is visible | Strong: silhouettes for quirks and tokens |
| Home is cozy | **Very strong**: the haunted notebook and slate |

## Engine and data impact
- Rune **instances** with `{id, chronicle: TagCount, quirks}` (same save migration as Option 2).
- Events must carry the originating rune instance: add an `origin` field to relevant `GameEvent`s.
- `src/data/quirks.ts` (tag pattern → quirk → rule hook), `projects.ts` (verbs, ingredients, beats), `notes.ts` (flavour pool).
- `src/engine/chronicle.ts` (pure fold of log → tag deltas), `quirks.ts` (apply as modifiers in flow, the same seam as Option 1 footnotes), `slate.ts` (tick on encounter win).
- Tests: tag derivation from golden logs; quirk-form thresholds; each quirk has a scenario test; project ticking incl. wipe behaviour (a wipe **doesn't tick** but also doesn't lose work); distill/imbue round-trip.

## Risks
- **Beat-gated research** can feel slow on a 1–2h evening. Mitigation: first project completes in 1 beat (tutorial), beats are per *encounter* and trips are 3–5, so most evenings finish something.
- **Mixed blessings** may feel like punishment to a player who hates it; the Exorcise path must be cheap, and bad quirks need a clearly stated upside.
- Quirk reveal is a *surprise*, which fights "Fair danger" slightly. Keep the reveal at the desk only, never mid-fight.
- Most narrative authoring effort of the four.

## Smallest slice to build first
Chronicle with 6 tags, 5 quirks, reveal at desk, plus one project verb (**Transcribe**) with beat-ticking on encounter win.

## Mix-and-match hooks
- Quirks ↔ **Option 2** traits (very similar data; pick the *acquisition* you like: breeding vs lived history).
- The slate's beat clock can pace **Option 1**'s Bench (e.g. trials are free but committing a recipe takes 1 beat).
- Chronicle stats feed **Option 3**'s profiler.
