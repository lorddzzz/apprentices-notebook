# Feature design docs

[DESIGN.md](../../DESIGN.md) is the game at a glance: pitch, pillars, a short summary of every system, open questions, and the one chronological **decision log** (§11). When a feature's design outgrows a section there, it gets its own file here, and DESIGN.md keeps only a summary and a link.

## Index

| Feature | Doc | Status | Summary in DESIGN.md | Plan |
|---|---|---|---|---|
| Desk research + mastery ("The Scholar's Press") | [research-and-mastery.md](research-and-mastery.md) | **Superseded** 2026-10-19 by the rune design (aspects, recipes, folios gone; Glyphs and footnotes kept) | §6.3 | [research-and-mastery-plan.md](../plans/research-and-mastery-plan.md), [glyph-mastery-plan.md](../plans/glyph-mastery-plan.md) |
| The city map, hearing, gates, and the oil-lit canals | [city-and-districts.md](city-and-districts.md) | **Built** Seam + canals; current lock updated for runes; five later districts scoped | §6.7 | [city-and-canals-plan.md](../plans/city-and-canals-plan.md) , [district-kit-plan.md](../plans/district-kit-plan.md), [canals-revisit-plan.md](../plans/canals-revisit-plan.md) |
| Rune content rework | [rune-content.md](rune-content.md) | **Answered and built** 2026-10-19 (historical problem frame) | §6.3 | — |
| Runes: Mix, Move, Invent | [rune-design-final.md](rune-design-final.md) | **Shipped** 2026-10-19 (Seam + canals; planned mastery/Lab/testing/content continuation complete) | §6.3, §6.5, §6.6 | [rune-redesign-plan.md](../plans/rune-redesign-plan.md) |
| Rival inscribers | [rivals.md](rivals.md) | **Core direction decided** 2026-10-22; long-wick Lamplighter and Bench trial copies; prototype defaults unvalidated, unbuilt | §6.7 | [rivals-plan.md](../plans/rivals-plan.md) |
| Footnotes: levels, capstones, methods | [footnotes.md](footnotes.md) | **Decided** 2026-10-23; level I for four runes built, the rest unbuilt | §6.3 | [footnotes-plan.md](../plans/footnotes-plan.md) |
| The party (apprentices) | [party.md](party.md) | **Designed** 2026-10-23 (household systems, basic actions, habit rules, door arrivals, all nine apprentices, consistency fixes in §0d); only the pair, leans/habits and growing pages built | §6.1 | [household-core](../plans/household-core-plan.md), [actions-habits](../plans/actions-habits-plan.md), [recruitment](../plans/recruitment-plan.md) |
| The ink-makers' quarter (dead-letter office) | [district-ink-makers.md](district-ink-makers.md) | **Decided** 2026-10-22; unbuilt | §6.7 | [ink-quarter-plan.md](../plans/ink-quarter-plan.md) |
| The bathhouses (the grand thermae) | [district-bathhouses.md](district-bathhouses.md) | **Decided** 2026-10-22; unbuilt | §6.7 | [bathhouses-plan.md](../plans/bathhouses-plan.md) |
| The bridges (the arches in the fog) | [district-bridges.md](district-bridges.md) | **Decided** 2026-10-22; unbuilt | §6.7 | [bridges-plan.md](../plans/bridges-plan.md) |
| The bell foundry (the carillon towers) | [district-bell-foundry.md](district-bell-foundry.md) | **Decided** 2026-10-22; unbuilt | §6.7 | [foundry-plan.md](../plans/foundry-plan.md) |
| The Seam, revisited (the owner's drawing) | [district-seam.md](district-seam.md) | **Decided** 2026-10-22; base Seam built, growth unbuilt | §6.7 | [seam-grows-plan.md](../plans/seam-grows-plan.md) |
| The Cartographers' hall (the academy) | [district-cartographers.md](district-cartographers.md) | **Decided** 2026-10-22, trip shape revised 2026-10-23; unbuilt | §6.7 | [cartographers-plan.md](../plans/cartographers-plan.md) |
| Growing lattice pages | [growing-pages.md](growing-pages.md) | **Built** 2026-10-21; automatic growth, phone pan/Fit and Glyph revision growth | §6.2 | [growing-pages-plan.md](../plans/growing-pages-plan.md) |

## Current references and historical material

Current gameplay authority: DESIGN.md §6 and rune-design-final.md. Build order for every plan: [ROADMAP.md](../ROADMAP.md) §2 and [build-program.md](../plans/build-program.md). City, party and rivals describe both the shipped boundary and explicitly marked future design. The [2026-10-20 audit](../plans/rune-redesign-audit.md) tracks plan deviations; the [roadmap](../ROADMAP.md) owns actionable work.

Research-and-mastery, rune-content, proposals 01–04 and rune-design-synthesis preserve foundations, problem framing and decision history. Their old aspects, recipes, folios, affinities and same-cast trigger rules must not be used as current specifications. Historical prototype sections and chronological decision logs are also preserved.

## How a feature doc works

1. **One file per feature**, named for the feature (`kebab-case.md`), never for an option or a version.
2. **Header block:** title, a `Status:` line (*Exploring* · *Decided* · *Building* · *Shipped*, plus *Parked* if shelved), links to its DESIGN.md section and its implementation plan.
3. **§0 Decisions:** a table of what was decided, when, and why, in the player's terms. It mirrors the DESIGN.md §11 row(s) in more detail. Draft numbers are marked *tune by playing*.
4. **The body:** rules, content tables, screens, risks, hypotheses to test by playing. It covers the *what* only. Engine and data architecture belong in the plan or TECH.md.
5. **Links both ways:** the DESIGN.md section summarises the feature in a few bullets and links here. The §11 row links here. This doc links back to both.

## Lifecycle

- **Exploring:** while a design round compares alternatives, options can live in a temporary file or folder. **Once one is chosen, delete the others**, keep only the chosen design, and name the commit holding the removed options in the doc header so they stay recoverable from git history.
- **Decided → Building:** the plan goes in `docs/plans/<feature>-plan.md`. Rule changes found while building are recorded here (§0) and in DESIGN.md §11 in the same commit as the code.
- **Shipped:** the status line says so. The doc stays the reference for the feature's rules.
