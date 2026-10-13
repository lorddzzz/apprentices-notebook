# Option 3: Compile & Refactor (research is writing macros, mastery is optimisation)

> *Proposal, not a decision.* One of four packages for **desk research** and **mastery** (see [README](README.md)).

## Pitch

This is the most literal reading of "build like code". You **don't find new runes, you write them**. When a pattern in your lattice has proven itself in the field, you can **fair-copy** it at the desk: the notebook compresses that connected cluster into a single new rune, a **Glyph**, that occupies one socket. A Glyph can have **open slots** (parameters), so one hard-won pattern becomes a reusable function. Mastery is the Zachtronics question: *can you do the same thing with less?* Glyphs have **elegance tiers** that reward shrinking ink cost and footprint, and every glyph keeps a **changelog** you can open and refactor.

**One-line fantasy:** your power grows by understanding your own spells so well you can name them.

## Inspirations (and what we take)

| Game | Taken |
|---|---|
| *Opus Magnum* / *SpaceChem* / *TIS-100* (Zachtronics) | Optimise the same solution by cost / size / speed; compare to your past self |
| *Factorio* blueprints | Select a region, save it as a reusable piece |
| *Baba Is You* | Rules as objects you rearrange, discover idioms |
| *Noita* wand building | Spell order and wrapping behaviours; multicast and modifiers |
| *Magicka* | Emergent combinations that you then name and remember |
| Real programming | Functions, parameters, refactoring, naming |
| *Slay the Spire* / *Balatro* | The "this is my engine" moment, but you wrote the engine |

## Desk research: the Fair Copy

### Step 1: Patterns are *proven*, not just built
The engine tags each **connected sub-lattice** (a cluster of runes connected by flow, source included) with a **fingerprint** (a canonical hash of runes, rotations and adjacency). During expeditions it counts how many times that fingerprint **resolved a cast with at least one meaningful event** (damage, mark, ignition, kill). At **5 resolutions** it becomes **proven**. Proven clusters glow faintly on the notebook page. A cluster that is a subset of a larger proven cluster tracks separately, so you can compress the core and not the whole.

### Step 2: Fair-copy
At the desk, tap a proven cluster and press **Fair-copy**. Costs **1 vellum** (research loot). The notebook:
1. Draws a box around the cluster and shows the **interface**: one **input port** (where the flow enters) and one or more **output ports** (where it exits, usually its last cells).
2. Lets you choose which runes inside become **parameters**: an **open slot** for a rune of a given family (e.g. "any Material"), so the Glyph is a template.
3. Asks you to **name it** (free text with a suggestion from an idiom table, e.g. *Cashing In* for `Ink → On Inked → Spark`).
4. Replaces the cluster with one Glyph rune. Ink cost = **sum of the inner costs minus the compression bonus** (see below).

### Idioms (the discovery layer)
The notebook has a hidden **idiom list**: well-known patterns the previous owner recognised, with their names and a margin note. Building one anywhere (not just in a fight) prints *"Idiom recognised: Cashing In"* and fills a codex page. Idioms are **free to compile** (no vellum) the first time. This is the `???` pull: the codex lists idiom silhouettes (the family sequence, not the runes).

| Idiom | Pattern | What it teaches |
|---|---|---|
| **Cashing In** | `Ink → On Inked → Spark` | marks pay off; triggers see same-cast effects |
| **Bonfire** | `Oil → Spark` on Splash | area + fuel |
| **Chain Gang** | `Bolt → Fork → (Bend → Spark) × 2` | forking payload |
| **Undertaker** | `Bolt → On Kill → Splash` | cascade on death |
| **Static Cling** | `Steam → Spark` with Amplify adjacent | diffuse then arc |

### Parametric Glyphs (the clever bit)
A Glyph with an **open slot** takes a rune at placement. Example: *Cashing In (Material)* with slot = `Ink`/`Oil`/`Steam` gives three related spells from one Glyph. Rule: an open slot accepts any rune of a family, never a Source, never another Glyph with open slots (**depth limit 2**, so the engine stays flat).

### How it hits the engine (this is cheaper than it sounds)
The engine **expands Glyphs back into flat runes** before resolving. Glyphs are *a UI/ink concept*: stored as a lattice fragment + interface, inlined by a pure `expand(lattice)` step. Combat, the event log and all existing rules stay untouched. Previews show the expanded flow on demand ("peek inside").

## Mastery: elegance and profiling

### Compression bonus (the shrink that matters)
Lattices are small (5×3, 3×6) and ink is scarce, so Glyphs are an answer to the **space and ink** limits. Compile compresses cost:
- Base: Glyph ink = inner sum − `floor(inner runes / 3)`.
- Each **elegance tier** lowers it further by 1 (min 1).

### Elegance tiers (bronze / silver / gold, like Opus Magnum histograms)
Each glyph tracks three metrics from **lifetime stats**:

| Metric | Measures | Tier thresholds (draft) |
|---|---|---|
| **Economy** | ink cost per average damage/effect | tiers when ratio drops |
| **Reach** | distinct materials/tiles affected per cast | tiers by footprint |
| **Reliability** | % of casts that resolved with ≥1 event | 70 / 85 / 95% |

Each metric tier adds **one cosmetic glyph flourish** (a ring in the notebook), and the **Reliability** tier unlocks a **Revision** (below). The point: these are *player-visible goals* ("I want my Cashing In at gold Reliability"), not hidden XP.

### Revisions and refactoring
A Glyph is **editable**: open it, see its inner lattice, change runes (consumes the same ink budget rules), re-save as **v2**. Old versions are kept in the glyph's changelog and can be **reverted for free**. A Revision at silver Reliability allows adding **one extra output port** (a free Fork-equivalent), at gold a **second parameter**.

### Profiler
A **profile view** after an expedition lists, per Glyph: casts, events, "dead branches" (inner cells that never fired), and a suggestion: *"The Bend on row 3 never fired, you could remove it (−1 ink)."* This is the teaching tool that turns the player into the optimiser (theorycrafter-friendly), and it's built from the event log.

## How research and mastery interlock
- Research (compile) *creates* the thing; mastery (elegance) rewards **iterating on it**. Both are the same verb: **editing your own lattice**.
- Vellum is the only research material; its loot rate paces Glyph creation. Idioms are free so there's always something to try.
- Late game: Glyphs can contain Glyphs (depth 2). A player's "signature spell" is a nested Glyph that is entirely theirs, not on any wiki.

## Pillar check
| Pillar | Fit |
|---|---|
| Build like code | **Maximum** |
| Fair danger | Neutral |
| World reacts | Weak: research is detached from the map |
| Unknown is visible | Medium: idiom silhouettes; but most of it is open-ended |
| Home is cozy | Strong for tinkerers; may feel like homework to others |

## Engine and data impact
- `src/engine/glyph.ts`: `fingerprint(cluster)`, `expand(lattice)`, `interface(cluster)`, all pure and testable on ASCII boards.
- `src/data/idioms.ts`: pattern table (family sequences + names + notes).
- Stats: `engine/stats.ts` folds the event log by fingerprint. Save adds `glyphs: Glyph[]`.
- Tests: scenario tests that a Glyph and its expansion produce **identical event logs** (golden property test: compile∘expand = id), fingerprint stability under rotation, profiler dead-branch detection, depth-limit enforcement.

## Risks
- **UI weight** on a phone: selecting a cluster in a 3×6 grid with one thumb. Mitigation: tap a proven cluster's glow, don't box-select; clusters are pre-computed.
- **Combinatorial explosion** of fingerprints; limit to clusters of 3–8 cells.
- **The lack of "new content"**: the player doesn't unlock new capabilities, only reorganises. Mitigation: pair with loot/rune drops (still v0 behaviour) or **Option 1**'s recipes for new atoms.
- Balance: compression could make the lattice effectively larger. Cap by ink: compile reduces cost only by `floor(n/3)`.

## Smallest slice to build first
Fingerprint + proven tracking + Fair-copy with **no parameters**, 3 idioms, and the profiler's dead-branch hint. Elegance tiers later.

## Mix-and-match hooks
- **Option 1**'s Bench makes new *atoms*, this option makes *molecules*; a very natural pair.
- **Option 2**'s traits could attach to Glyphs (a fused, traited, compiled signature spell).
- **Option 4**'s quirks could attach to Glyphs as "bugs" that the profiler flags.
