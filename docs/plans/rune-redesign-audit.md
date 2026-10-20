# Rune redesign: implementation and documentation audit

Audited 2026-10-20 against the current source, [plan](rune-redesign-plan.md), [status](rune-redesign-status.md) and [verification](rune-redesign-verification.md). This is a documentation audit; it changes no game rules. Roadmap IDs below are the actionable follow-ups.

## What is complete

The W0–W7 task set is implemented: 31 runes, seven roles, five kinds, ten compounds, fifteen bursts, movement and drops, bound marks, jars, five invention methods, fourteen solvents, witnessing/masked previews, level-I footnotes, lifetime Glyph credit/proof, Lab authoring/lessons and teaching layouts. The original verification reports 2,909 passing tests; that is historical verification, not a fresh run for this audit.

The ten authored footnote **variants** are five pairs on lines belonging to Bolt, Shove, Spark and Oil; they are not ten rune upgrades. Wax cloud suppression is now stamped in `engine/marks.ts`; `tests/data/lines.test.ts` has an empty unstamped allowlist. The old notes calling Wax unfinished are stale. Positive Lantern Walk, Lab methods/solvents/inventions and later enemies/terrain are also complete.

## Actual gaps against the plan or accepted design

| Finding | Evidence and scope | Follow-up |
|---|---|---|
| Fine-print content below P4's stated 132 | `data/lines.ts` has 100 rows (50 `seam(...)` calls + 50 object rows). The integrity test checks registered/fired rows both ways, but cannot prove every possible rule has a row. Do not fill a numerical quota with redundant lines. Audit coverage by behavior and author useful missing cases. D1's 6–8 per rune is a target, not shipped coverage. | BL-101 |
| Bench cannot reproduce everything met (P37/U5) | `app/bench.ts` maps only rat/sentry/familiar; its state list omits canal water, vents and compounds. Subject counting only accepts the original enemy tokens. The expanded **Lab** palette did not expand the **Bench**. | BL-102 |
| No growing lattice page | `engine/run.ts::memberLattice` reconstructs fixed shapes from `data/members.ts`; `app/study.ts` rejects non-sockets. This predates the redesign and is an unfulfilled accepted party/lattice design, not an unmerged W-task. | BL-103, then BL-43 |
| Discovery does not persist for spent solvents | `engine/run.ts::isKnown` checks solvent count > 0; spending the last one hides its known entry. | BL-104 |

## Known rough edges to investigate, not silently declare fixed

| Finding | Current evidence / required next check | Follow-up |
|---|---|---|
| Delayed invention context | `schedule.ts::stepOf` reconstructs bare parts with empty auras; `runDetached` starts with empty auras; nested Wick uses a shared `woken` flag. Reproduce Coil/Margin and nested-solvent cases before choosing intended behavior. Reapplying widening on Repeat is a separate design choice, not automatically a bug. | BL-105 |
| Dusk replacement can open immediately | `jars.ts::openDuskJars` snapshots coordinates, then opens whichever dusk jar occupies each coordinate. Replacement at a later queued coordinate can open during the same pass despite the comment promising next dusk. | BL-106 |
| Effect cap may leave unlogged changes | `ctx.ts::emit` stops logging at 500, but mutation helpers/loops also need to stop. Audit each continuation, including detached casts, with projection invariants. | BL-107 |
| Current arrival hooks differ | `current.ts` directly moves cargo/units; inspect arrival into marks, stains, fire and jars together. Preserve deliberate exemptions for swimming/flying/anchored foes; distinguish design decisions from missing event hooks. | BL-108 |
| Projection contracts infer state | `jarSealed` lacks contents; `held` lacks duration; crush location/direction can be inferred rather than logged. | BL-109 |
| Repeated test registration and bundle size | Lines integrity and projection guards repeat suites; previous production build exceeded the 500 kB advisory. | BL-110, BL-111 |
| Rune/editor polish and save fallback | Some glyphs need redraws; invention names/art and optional shelf metadata need a screen-by-screen audit. `game.svelte.ts::ensureBattle` has an unguarded fallback; save recovery has one corrupt slot. | BL-100, BL-112 |

The runtime footnote context still compares display text (`engine/footnotes.ts::hasFootnote`), and Bind events are derived from methods/open districts (`engine/run.ts::knownSetOf`). Stable IDs and explicit learned-event storage are BL-123, before more progression content depends on them.

Not reproduced here: the delayed-context, cap and current-arrival reports. They remain explicitly scoped investigations with regression expectations, rather than claims of confirmed new failures.

## Deliberately deferred scope

- Five playable districts and their unique terrain, gates, foes and loot: BL-113–BL-117. Their runes already run in the Lab; these are world/progression builds, not new rune-system implementations. Unfinished paper and Erase's paper behavior wait for BL-117.
- Recruitment, three-member expeditions, third habit, personal basic actions and larger boards: BL-43. Existing leans/two habits are already implemented; free page growth is isolated as BL-103.
- Rivals and their lattice rewards: BL-30 and BL-118. No folio replacement exists yet.
- Footnote levels II–III, other runes and inventions: BL-54. The current point thresholds are 5/15/40, but only level-I content exists.
- Long-term fine-print expansion toward 220 follows actual district terrain; prototypes in design §14 were explicitly skipped.

## Design clarifications, not implementation requests

`Bolt → Oil → Shove` oils the departure tile. Sliding extends a push only when the unit **enters** slick/grease fog; it does not automatically slide from the newly oiled starting tile. Update the example to require oil ahead, and keep the alternate rule open under BL-56.

The current canal lock requires a rat's death **and** a `dropped` event. The old fire-and-wooden-gate puzzle is retired; its burnt-gate map illustration is cosmetic (BL-119).

Historical proposals, synthesis, research/folios documents, build logs and chronological decision rows are preserved. Current summaries now distinguish shipped rules from future intentions. Older plans remain historical specifications; this audit records their deviations without rewriting history.
