# Design options: desk research and mastery

> Written 2026-10-13 for discussion. **The direction is now chosen (see the end of this page)**; the options themselves are not decisions. Each package answers both open questions from [DESIGN.md](../../DESIGN.md) §6.3 and §10 (desk research: combining known runes; mastery: frequently used runes evolve or branch). They were made deliberately different so we can mix and match parts.

## The four options

| # | Option | Research is… | Mastery is… | Core feel | Closest games |
|---|---|---|---|---|---|
| 1 | [The Bench](01-the-bench-deduction.md) | **Deduction.** Deterministic trials, resonance pips, torn recipe pages | **Footnotes.** Witnessed outcomes unlock a fork you choose | Scholar solving a thesis | Obra Dinn, Outer Wilds, Potion Craft, Hades aspects |
| 2 | [Fusion & Ripening](02-fusion-and-ripening.md) | **Fusion.** Press two runes, inherit traits, gamble on mutations | **Evolution.** Conditional branches by how a copy was used | Breeder-botanist of magic | Shin Megami Tensei, Pokémon, Monster Sanctuary, PoE crafting |
| 3 | [Compile & Refactor](03-compile-and-refactor.md) | **Writing macros.** Proven lattice patterns compress into Glyphs with parameters | **Optimisation.** Elegance tiers, profiler, versioned refactors | Programmer naming her own spells | Opus Magnum, Factorio blueprints, Baba Is You, Noita |
| 4 | [Scars & Slow Work](04-scars-and-slow-work.md) | **Slow projects.** Slate of tasks that finish after expedition beats, fed world tokens | **Chronicle & quirks.** Runes keep a history that hardens into personality | Keeper of haunted, difficult objects | Darkest Dungeon, Cultist Simulator, Shadow of Mordor, Caves of Qud |

## At a glance

| | 1 Bench | 2 Fusion | 3 Compile | 4 Scars |
|---|---|---|---|---|
| Randomness | none | seeded, odds shown | none | none (steerable) |
| Gives **new capability**? | yes (new runes) | yes (new species) | no (reorganises) | partly (hybrids, deciphered runes) |
| Pull of the unknown (pillar 4) | very strong | strong | medium | strong |
| Build-like-code (pillar 1) | strong | medium | **max** | medium |
| World reacts (pillar 3) | medium | strong | weak | **strong** |
| Cozy home (pillar 5) | strong | strong | medium | **very strong** |
| Rune model change | add aspects | **instances + traits** | glyph layer (flat expand) | **instances + chronicle** |
| Engine risk | low | medium | medium (fingerprints) | medium (event origin) |
| Content authoring | recipes + footnotes | chart + traits + evolutions | idioms (small) | quirks + projects + notes (large) |
| Playtime per research step | minutes (puzzle) | seconds (press) | minutes (design) | none (wait for beats) |
| Biggest risk | feels like a wiki | RNG at the desk | no new content | slow on an evening |

## Which parts snap together

```
 NEW ATOMS ───────┬─ Bench recipes (1)   or   Fusion chart (2)   or   Decipher project (4)
 NEW MOLECULES ───┴─ Glyphs (3)
 RUNE PERSONALITY ── Footnotes (1)  /  Evolution (2)  /  Quirks (4)         ← pick ONE, they overlap
 THE CLOCK ──────── instant (1,2,3)   or   beats per encounter (4)
 THE MYSTERY ────── torn recipe pages (1)  /  notebook writes back (4)
```

- **Instances are a shared cost.** Options 2 and 4 both need runes to become individual objects (`RuneInstance`); doing it once enables either.
- **Option 3 is orthogonal** to the other three. It changes how you *combine in the lattice*, not what a rune *is*, so it pairs with any of them.
- **Footnotes, evolution, quirks** are three answers to one question. Footnotes are chosen, evolution is conditional, quirks are lived. Mixing two of them will probably clutter the shelf.

## Three combos worth discussing (my leanings, for the chat)

1. **"Scholar's Press" = 1 + 3.** Bench recipes make atoms, Compile makes molecules. Fully deterministic, strongest on the *theorycrafting* and *build like code* signals. Best fit if the biggest joy is solving. Cost: least world feel.
2. **"The Haunted Garden" = 2 + 4 (instances) with quirks acquired through use and fusion for new species.** Best fit for the *Darkest Dungeon* and cozy-uncanny tone. Cost: the most content and the heaviest save migration.
3. **"Lean engine" = 1 (Bench only) + 4's chronicle/quirks, no slate.** Instant research with lived-in mastery. The cheapest route to a distinct feel; my default if we want to build something soon.

## Chosen direction

**[05 The Scholar's Press](05-scholars-press.md)** (1 + 3, designed as one system): shared aspect grammar, deterministic Bench, Glyph compilation, elegance and footnote mastery, and Crystallise to close the loop. **Decided 2026-10-13** after a design round (see its §0 and [DESIGN.md](../../DESIGN.md) §11). Options 01–04 stay here as the parts bin.

In short: resonance shows a total only, aspects describe what a rune does, outer auras reach into a Glyph for +1 ink each, crystals are permanent, patterns prove themselves only on expeditions, and the first playable slice is Bench + Compile.

## Process note

Per [CLAUDE.md](../../CLAUDE.md), once we choose, the decision goes in DESIGN.md §11 and the shape of it into §6.3; the engine work gets scenario tests. All four are sized to a "smallest slice" listed at the bottom of each doc.
