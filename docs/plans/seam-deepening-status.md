# Seam deepening build status (resume here)

Plan: [seam-deepening-plan](seam-deepening-plan.md). Orchestrator: Opus main session. Updated on every event and committed with every merge.

**State:** building
**Next:** Review/merge wave 1 reports as they arrive (E1, E2, F1, D1 running). Then P1 (after F1 frees port 5190), L1, E3 (after E2), C1/C2 (after D1).

## Contracts added in W0 (beyond the plan's §2)
- `Tile.scald: boolean` (Scald's steam). Board notation: `$` stained oil, `s` scalding steam, `^` hot, `#` etched (brass unit or plate `=^#`).
- Events: `pierced`, `heated`, `cooled`, `scalded`, `stained`, `etched`; `inked.via` gains `'stain'`. `heated` → interaction `heat`, `stained` → `stain`.
- `finishEncounter(p, t, b, log = [])` returns `stats` too (survives a wipe). S1 must pass the battle log from `flow.endBattle`.
- `SaveData.lastTrip: TripRecap | null` (outcome, deepest encounter, stats) for the trip page. Save v3 migration adds empty `trip.stats` and `lastTrip: null`.
- `applyDoorway(p, t, lattices) → { profile, trip }` (not just Trip). `variantFor(t, encounter)` stub returns 0.
- `EncounterDef.variants` built in `encounters.ts` from `BASE` (one variant each); L1 adds two per depth.
- Recipes Scald (spark+steam+cinder), Etch (ink+brass+gallnut), Kiln (brass+spark+cinder) are in `recipes.ts` with TODO notes; D1 writes the text.
- `src/ui/glyphs.ts` has placeholder circles for the 6 runes and 2 interactions: C1 owns that file too.
- The doorway is **not** in any loot table yet: R1 adds it (D1 must not).

## Tasks
| ID | Model | Size | Status | Branch / commit | Usage Δ | Notes |
|---|---|---|---|---|---|---|
| W0 | opus (me) | M | merged | 88f115d | 5% | contracts, stubs, save v3, worktrees pruned |
| P1 | haiku | S | todo | | | |
| D1 | haiku | S | merged | (see log) | ~2% | recipe hints rewritten by me (D1's named the ingredients) |
| E1 | sonnet | M | running | | | started 22:40 |
| E2 | sonnet | M | running | | | started 22:40 |
| F1 | sonnet | M | running | | | started 22:40 |
| E3 | sonnet | M | todo | | | after E2 |
| L1 | sonnet | M | todo | | | |
| C1 | sonnet | M | todo | | | after D1 |
| C2 | haiku | S | todo | | | after D1 |
| R1 | sonnet | L | todo | | | after L1 |
| S1 | sonnet | M | todo | | | after L1; merge after R1 |
| D2 | haiku→sonnet | M | todo | | | all |
| W4 | opus (me) | S | todo | | | |

## Usage log
| Time (UTC) | 5h % | resets in | weekly % | zone | action |
|---|---|---|---|---|---|
| 22:32 | 28 | 3h28m (01:59:59Z) | 44 | normal | start, W0 |
| 22:39 | 33 | 3h21m | 44 | normal | W0 merged; spawn E1 E2 F1 D1 |
| 22:43 | 43 | 3h17m | 46 | narrow? (2.5%/min burst) | D1 merged; hold new spawns until rate settles |

## Proposals (from agents, not yet in DESIGN/TECH)
- D1: Thrift rule text doesn't say whether several Thrifts stack (plan silent). Ask player / leave stacking like Amplify.
- D1: Kiln rule "scalds the units beside it for two rounds" compresses S5/S9. Accepted.
- D1: Etch rule says "any brass under it" for "brass in its footprint". Accepted.
- D1: Heat interaction text folds the 2 rounds and 1 damage into one sentence. Accepted.
- D1: all hints and owner notes written in the owner's voice by D1 (recipe hints rewritten by orchestrator). Player judges.

## Decisions and fixes made during the build

## Follow-ups and rough edges
