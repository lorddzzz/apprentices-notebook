# Seam deepening build status (resume here)

Plan: [seam-deepening-plan](seam-deepening-plan.md). Orchestrator: Opus main session. Updated on every event and committed with every merge.

**State:** building
**Next:** Wave 1: spawn P1, D1, E1, E2, F1 (keep 2–4 running; E1/E2/F1 first, then D1, P1).

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
| W0 | opus (me) | M | merged | (this commit) | | contracts, stubs, save v3, worktrees pruned |
| P1 | haiku | S | todo | | | |
| D1 | haiku | S | todo | | | |
| E1 | sonnet | M | todo | | | |
| E2 | sonnet | M | todo | | | |
| F1 | sonnet | M | todo | | | |
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

## Proposals (from agents, not yet in DESIGN/TECH)

## Decisions and fixes made during the build

## Follow-ups and rough edges
