# Option 1: The Bench (research is deduction, mastery is witnessing)

> *Proposal, not a decision.* One of four packages for **desk research** and **mastery** (see [README](README.md)).
> Built on [DESIGN.md](../../DESIGN.md) §6.3 (runes come from loot, desk research, mastery) and §6.3b (research materials).

## Pitch

The previous owner's notebook is full of half-finished recipes: *"Spark + ?? + brine → something that jumps"*. Research is **solving those sentences**. You never roll dice at the desk. Every experiment is deterministic and tells you *how close you were*, so a failed attempt is information, never waste. Mastery follows the same spirit: a rune doesn't get stronger from grinding, it gets stronger from **being witnessed doing remarkable things**, and each witnessed thing is a footnote you write into the margin.

**One-line fantasy:** you are a scholar reading someone else's unfinished thesis and completing it.

## Inspirations (and what we take)

| Game | Taken |
|---|---|
| *Return of the Obra Dinn* | Deduce from partial evidence; the game confirms in small batches, so you are never lost for long |
| *Outer Wilds* (ship log) | Knowledge is the only progression; the codex *is* the map of what you don't know yet |
| *Potion Craft* / *Little Alchemy* | Combine ingredients, see what happens, a recipe book that fills in |
| *Wordle* / *Mastermind* | The feedback loop of a guess: exact / close / wrong |
| *Hades* (Weapon Aspects) / *Path of Exile* (ascendancy picks) | Mastery as a **fork you choose**, not a number that goes up |
| *Noita* | Experimenting on a sandbox beats reading a wiki |

## Desk research: the Bench

### The three slots
The Bench is a page of the notebook with three slots: **Left rune**, **Right rune**, **Solvent** (a reagent from loot). Press **Trial** and the engine runs the combination on a tiny 3×3 board (the Lab's engine, no new code for the sandbox).

### Aspects (the hidden grammar)
Every rune has 1–2 **aspects**, drawn from a small set. Aspects are the "periodic table" the player slowly learns. They are visible *once learned*, and each is learned by seeing it act in a fight (same trigger as codex interactions).

| Aspect | Meaning | Carried by (v0 examples) |
|---|---|---|
| ☍ Reach | travels / lands at distance | Bolt, Splash |
| ◈ Mark | tags a target | Ink, On Inked |
| ≋ Slick | spreads, slides, coats | Oil |
| ♨ Heat | burns, ignites | Spark (also Charge) |
| ϟ Charge | conducts, arcs | Spark, Brass |
| ☁ Vapor | diffuses, hides | Steam |
| ▣ Hold | blocks, shields, solid | Brass, Ward |
| ⟳ Return | repeats, comes back | Echo, Fork (split is "return" to two paths) |

A **recipe** is `Left + Right + Solvent → Result`, where the Solvent contributes exactly one aspect and the result's aspects equal the union of the parents', with one swapped for the Solvent's.

### Trial feedback (the Mastermind loop)
A Trial yields one of:

1. **Precipitate** (exact match): a new rune. Consumes the Solvent and the two runes' *copies are kept* (research doesn't destroy your collection).
2. **Residue** (close): the notebook writes a margin note about the *nearest* recipe, as a number of **resonance pips** (0–3) and one vague line in the owner's hand: *"too wet"*, *"wants a cousin of Fork"*. Solvent is **not** consumed.
3. **Inert** (nothing nearby): no pips, no cost. Also logged, so you never repeat a dead pair.

Pips are computed against the *closest undiscovered recipe that this pair could ever approach*, so a pair can show 0 pips for everything yet. This keeps the deduction honest and prevents brute force from being fast (about 14 runes → ~100 pairs × a handful of solvents, but every pair is remembered, and the notebook greys out exhausted pairs).

### What the player sees that pulls them forward (pillar 4)
Undiscovered recipes appear as **page silhouettes**: the result's *family icon*, its ink cost, and the *families* of its ingredients (`[Material] + [Shape] + [?]`). Each silhouette has a "heard rumour" line unlocked by fighting in a district: *"Ink-makers whisper about a smear that spreads."* The `???` is never blank, it is a locked sentence.

### Example recipes (draft, all reuse v0 content)

| Recipe | Result | Why it's satisfying |
|---|---|---|
| Ink + Oil + *Gallnut* | **Smear** (material): marks spread to neighbours | Returns the interaction cut from v0 as a *reward*, not a rule |
| Brass + Spark + *Brine* | **Coil** (aura): touching Spark paths conduct +1 hop | Reads straight from the matrix |
| Spark + Steam + *Cinder* | **Arc** (shape): the flow jumps to every unit in connected steam | Formalizes a codex interaction as a path tool |
| On Inked + On Kill + *Ash* | **Reap** (trigger): fires when a *mark is consumed*, from the victim's tile | A trigger family expansion |
| Echo + Fork + *Wax* | **Canon** (shape): both fork branches recast next turn | Combos of combos |
| Ward + Brass + *Rivet* | **Bulwark** (source): shield that raises a plate | Source from non-source ingredients |
| Bolt + Bend + *Quicksilver* | **Ricochet** (shape): bolt bends off the first brass | Tests the player's aspect model |

Solvents come from **research loot** (already in v0 as the counted-but-unused reagents). Each district favours certain solvents (Seam: Gallnut, Brine, Cinder; bathhouses: Wax…), so district choice becomes recipe choice.

### The owner's half-recipes (mystery for free)
About a third of recipes are **pre-written in the notebook with one slot torn out** (*"Spark + ?? + Cinder"*). Completing them gives a handwritten reaction: *"Yes! I knew it. It was the brine all along."* This threads the mystery seed (§6.7) through research instead of needing lore screens.

### UI at 375×812
```
┌ notebook page ────────────┐
│  [Spark]  +  [ ? ]  +  [Cinder] │   tap a slot, pick from shelf
│        ┌─ trial 3×3 ─┐          │   live mini-board
│        │  . ⚡ .     │          │
│        └─────────────┘          │
│  Resonance  ●●○   "too wet"     │
│  [ Trial ]   [ Write in ink ]   │   Write = commit when exact
├ margin notes (scroll) ────┤
│ Spark + Oil → ●○○ …             │
└─────────────────────────────────┘
```
One thumb: tap slot, tap rune, tap Trial. The trial plays through the same event-log animation as combat.

## Mastery: footnotes (witnessed, then chosen)

Each rune accumulates **Witness points**, not XP for being cast, but for *distinctive outcomes it was part of*. Examples: Spark ignites oil (1), Spark detonates a mark (2), Bolt kills through steam (2), Ward absorbs a hit that would have killed (3), Echo recast kills (2). Points come from the **event log**, which already exists, so the rule table is data: `{ rune, eventPattern, points }`.

At 5 / 15 / 40 points a rune gains a **Footnote slot** (levels I–III). Each level offers **two footnotes**, you pick one, and you may re-pick at the desk any time (free, like rewiring):

| Rune | Level I (pick 1) | Level II | Level III |
|---|---|---|---|
| **Bolt** | *Long reach*: +1 range through steam | *Sharpened*: +1 damage to inked | *Bloodhound*: if it kills, keep travelling to the next unit |
| **Spark** | *Hotter*: ignites oil at +1 ring | *Grounded*: conducts through brass without losing a step | *Ball lightning*: fork outputs 3 directions |
| **Ink** | *Deep stain*: marks last through a heal | *Seep*: marks one adjacent unit | *Indelible*: detonation leaves a puddle |

Rules of thumb for footnotes: they are **small rule edits** (never raw numbers), they are **mutually exclusive per level**, and they **change the ink cost** (some +1, some −1), so mastery trades with the lattice budget instead of just adding.

**Why witnessing?** It makes mastery *a record of play style*. A player who never uses oil never sees Spark ignite oil, so their Spark's tree skews toward conduction. It also ties directly into the codex: witnessed interactions *are* the codex entries.

## How research and mastery interlock
- Footnotes can be **traded as a catalyst**: a rune at Level III can be "pressed" (reset to Level 0, footnotes kept as a *pressed leaf*) to be used as the Solvent in a Bench recipe, producing a stronger variant. This is the only way to make T2 runes.
- A recipe's silhouette lists "needs a rune with a Level II footnote" for the advanced results, so mastery gates late research and research makes mastery worth finishing.

## Pillar check
| Pillar | Fit |
|---|---|
| Build like code | Strong: aspects are a tiny type system |
| Fair danger | Neutral (no combat change) |
| World reacts | Medium: solvents come from districts |
| Unknown is visible | **Very strong**: silhouettes, resonance pips, torn recipes |
| Home is cozy | Strong: a quiet puzzle at the desk |

## Engine and data impact
- `src/data/recipes.ts`: `{ left, right, solvent, result }`, aspects per rune in `runes.ts`.
- `src/engine/research.ts`: pure `trial(left, right, solvent, knownRecipes) → { kind, pips, hint }`. Deterministic, no RNG.
- `src/engine/mastery.ts`: folds the event log into witness points; footnotes are data-driven rule hooks (needs a small "rune modifier" seam in the flow engine).
- Tests: scenario test per recipe (the trial board and expected event log); table test that every non-recipe pair returns Inert/Residue and never throws; witness-point tests from recorded logs.

## Risks
- **Opaque aspects** feel like a wiki you must memorise. Mitigation: the Trial board shows the reaction; the notebook always prints the aspect list of known runes.
- **Too solvable** with a spreadsheet. That's the point for this player (theorycrafting), but keep ~20 recipes so it lasts about 5 evenings, not 30 minutes.
- Footnote balance across 14+ runes is a lot of content. Start with 4 runes × 3 levels.

## Smallest slice to build first
Bench with 6 recipes, 3 solvents, resonance pips, torn recipe pages; footnotes for **Bolt and Spark only**.

## Mix-and-match hooks
- Pairs very well with **Option 3** (Compile): recipes produce atoms, Compile produces molecules.
- Footnote system can be swapped with **Option 2**'s evolution or **Option 4**'s quirks without touching the Bench.
