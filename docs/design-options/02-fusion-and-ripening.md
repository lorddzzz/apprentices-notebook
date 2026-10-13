# Option 2: Fusion & Ripening (research is fusion, mastery is evolution)

> *Proposal, not a decision.* One of four packages for **desk research** and **mastery** (see [README](README.md)).

## Pitch

Runes aren't tools, they're **specimens**. At the desk you press two of them together in a **fusion press** and get a child that inherits some of each parent's traits, sometimes with a mutation. In the field, a rune that is used a lot ripens and **evolves** along a branch decided by *how* you used it. It is monster-collecting for a wizard's pressed-flower album: you aren't catching creatures, you're cultivating a garden of rules.

**One-line fantasy:** you are a breeder-botanist of magic, tuning a lineage until it does exactly one beautiful thing.

## Inspirations (and what we take)

| Game | Taken |
|---|---|
| *Shin Megami Tensei* / *Persona* (fusion) | A **fusion chart**: A × B = C, a triangle table that fills with `???` until you try it |
| *Pokémon* / *Digimon* (evolution) | Conditional evolution: levels, items, and "how you raised it" |
| *Monster Sanctuary* / *Dragon Quest Monsters* | Inheriting skills from parents when you breed |
| *Path of Exile* (crafting) | Gambling with currency toward a target; "I want a rune with trait X and Y" |
| *Slay the Spire* (upgrades) | An upgraded copy is a distinct, visible thing |
| *Spore* | A creature built from parts, readable at a glance |

## Desk research: the Fusion Press

### Runes become *items with traits*
A rune stays a rule (Bolt = a line spell) but each **owned rune** now has up to **3 trait slots**. Traits are small and legible rule tweaks, e.g.:

| Trait | Effect |
|---|---|
| *Lean* | −1 ink cost (min 1) |
| *Hot* | Spark/Fire effects of this rune reach +1 tile |
| *Sticky* | Marks/oil from this rune last 1 round longer |
| *Hardy* | Source: +1 charge per trip |
| *Quick* | Echo/Source: casts at the start of the trip's first turn free |
| *Volatile* | +1 magnitude, but friendly fire radius +1 |

Traits are the "genes". Starting runes have zero or one trait; trait count and quality grow through fusion and evolution.

### Fusion = recipe lookup + inheritance
Put **two runes** into the press, optionally add **one catalyst** (research reagent), press.

1. **The species** of the child comes from a **fusion chart** (hand-authored, data-driven). Default: same-family pair → same species with more traits ("sibling fusion"). Cross-family pairs → a *new species* from the chart.
2. **The traits** of the child: take the union of parent traits, then keep up to 3. You choose which to keep, **but** each fusion also rolls on the **mutation table** (seeded RNG, see below).
3. **The parents are consumed** (one copy each), so fusion has a real cost; it can eat your only Fork.

The chart is shown as a triangle table. Cells for pairs you haven't tried display `?`; tried cells show the result's silhouette; cells you can't ever reach yet are fogged. SMT players will recognize this instantly.

### Species chart (draft, v0 runes)

| | Ink | Oil | Spark | Steam | Brass | Bolt |
|---|---|---|---|---|---|---|
| **Ink** | Ink+ | **Smear** | **Brand** (mark that detonates on any hit) | **Mist** (mark cloud) | **Plate-etch** (permanent mark on plates) | **Quill** (bolt that marks and leaves a puddle) |
| **Oil** | | Oil+ | **Torch** (oil that ignites on placement) | **Fog** (slick cloud) | **Rust** (oiled brass slows) | **Skid** (bolt pushes) |
| **Spark** | | | Spark+ | **Arc** (jump through steam) | **Coil** | **Lance** (piercing electric bolt) |

The `+` same-family result isn't a new rune, it's a **trait transfer**: you get a better version of the same rune.

### Mutation (the gamble) and why it isn't annoying
Each fusion rolls **one mutation** from a table (60% none, 25% a minor trait, 10% a major trait, 5% a "flaw" with a big upside, e.g. *Volatile*). Rules that keep it fair:
- Randomness uses the existing seeded RNG; the **desk seed advances only when you press**, so reloading doesn't reroll. (Save-scum-proof but not punishing.)
- **Catalysts** (reagents) bias or lock: *Salt* guarantees no flaw, *Sulphur* guarantees a mutation, *Ash* removes a chosen trait before pressing.
- You **see the odds** before pressing, as exact percentages. This is a build game, not a slot machine.
- A failed fusion (no mutation) still produces a valid child. Nothing is wasted except the parents.

### UI at 375×812
```
┌ fusion press ─────────────┐
│  [Ink ●○]    [Oil ○○]     │   parent cards: trait pips
│        ↓  ↓               │
│     ( SMEAR )   ← silhouette until pressed
│  traits kept: [Sticky] [  ] [  ]
│  mutation: 60% none · 25% minor · 10% major · 5% flaw
│  catalyst: [ Salt ]        │
│  [ Press ]                 │
├ chart ───────────────────┤
│  triangle table (scroll)   │
└───────────────────────────┘
```

## Mastery: ripening and evolution

### XP is cheap, the *form* is the choice
Every rune copy has a **ripeness** counter that rises when it **participates in a cast that resolves**. Ripeness is per copy, not per species, so the Bolt in the Draughtsman's lattice ripens separately from the spare Bolt on the shelf. At ripeness 10 / 30 / 60 it is **ripe**, and when you return home it can **evolve**.

### Evolution is conditional on *what the rune did* (the Eevee rule)
Each rune has 2–3 evolution branches, each with a **condition** counted over the event log. The player sees the **category** of each condition (`kills`, `ignitions`, `marks detonated`, `damage absorbed`) as a `???` card with the number hidden until the counter is half full.

| Base | Branch | Condition (lifetime, this copy) | Result |
|---|---|---|---|
| **Bolt** | **Lancet** | killed 8 units that were inked | long pierce, +1 damage to inked |
| **Bolt** | **Hammer** | pushed (via Shove-chain) 10 units into oil or steam | knockback bolt |
| **Bolt** | **Whisper** | killed 6 units *through steam* | steam-piercing, silent (doesn't wake sentries) |
| **Spark** | **Cinder** | ignited oil 12 times | ignition leaves embers (burns +1 round) |
| **Spark** | **Tesla** | conducted through brass to 3+ units, 6 times | arcs chain 1 further hop |
| **Ward** | **Aegis** | absorbed 20 damage | shield 3, reflects 1 |
| **Ward** | **Cloak** | cast into steam 8 times | grants steam cover (untargetable) |

- Evolution is **permanent for that copy**, but a **seedling** of the base can be re-grown at the desk with a catalyst, so the evolution gamble isn't a trap.
- A fully evolved rune may evolve once more into a **named relic** (stage 3) if it was fused with the right traits, e.g. Lancet + *Hot* → **Thunderlance**. This is where the chart and the evolution tree meet.

### Mastery levels are visible stages on the shelf
The shelf shows each rune as a small pressed plant: seed → sprout → bloom. A glance tells you what is ripe and what is stuck. Ripe runes get a gold edge on the shelf, so going home from an expedition has a "harvest" moment (a mini reveal like a Pokémon evolution animation, which in this game is the rune re-inscribing itself).

## How research and mastery interlock
- **Fusion consumes** runes; **evolution rewards** keeping one rune in play for a long time. You'll feel the tension: "Do I fuse my bloomed Bolt or keep it ripening?"
- Evolved forms are **new species** in the chart, so they open new fusions (a Lancet × Ink gives something a plain Bolt × Ink cannot). The tree is deep because the two systems feed each other.
- Reagent economy has two sinks (catalysts, regrowth), which gives research loot a real price.

## Pillar check
| Pillar | Fit |
|---|---|
| Build like code | Medium: runes get dirtier (traits), but lattice wiring stays clean |
| Fair danger | Neutral |
| World reacts | **Strong**: evolutions are conditioned on interactions with the world (oil, steam, brass) |
| Unknown is visible | Strong: chart cells and `???` evolution cards |
| Home is cozy | Strong: pressing flowers, a greenhouse feel |

## Engine and data impact
- Rune instances need an `id` and `{traits, ripeness, form}` (today the collection is counts: `src/data/types.ts` collection becomes `RuneInstance[]`; a migration in the save loader).
- `src/data/fusion.ts` (chart), `evolutions.ts` (conditions as event patterns), `traits.ts`.
- `src/engine/fuse.ts` (pure, uses `engine/rng.ts` with the desk seed), `src/engine/ripen.ts` (folds event log per rune instance; each logged event needs the originating rune instance id).
- Tests: chart totality test (every pair resolves or is declared inert), seeded fusion golden tests, condition counters from recorded logs, save migration.

## Risks
- **RNG at the desk** can feel bad for an indecisive theorycrafter. Mitigation: visible odds, catalysts, and a "preview without pressing" button (shows the chart result, not the mutation).
- Per-copy instances **bloat the Study UI**; the shelf needs grouping and a filter.
- Heavy content count (chart cells × traits × branches). Start with 3 species × 4 traits × 2 evolutions.

## Smallest slice to build first
Same-family fusion only (trait inheritance), 4 traits, and 3 evolutions (Bolt → Lancet, Spark → Cinder, Ward → Aegis). No chart yet.

## Mix-and-match hooks
- **Evolution** can be dropped into Option 1 in place of footnotes (conditioned on witnessed events).
- **Fusion chart** can replace Option 3's discovery layer if compile feels too abstract.
- The ripeness counter overlaps with Option 4's rune history, pick one or merge (traits ≈ quirks).
