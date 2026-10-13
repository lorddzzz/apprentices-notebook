# Seam deepening build status (resume here)

Plan: [seam-deepening-plan](seam-deepening-plan.md). Orchestrator: Opus main session. Updated on every event and committed with every merge.

**State:** building
**Next:** Merge F1, E3, L1 as they report. Then P1 (port 5190 after F1), C1 + C2 (D1 merged), then R1 → S1 (after L1), D2, W4. Orchestrator follow-up: recipe.ts text for Pierce/On Ignite/Thrift + Scald/Etch/Kiln after E3.

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
| E1 | sonnet | M | merged | (see log) | ~6% | added Spell.pierce / SpellNode.pierced |
| E2 | sonnet | M | merged | (see log) | ~4% | HEAT_DAMAGE moved to TUNING.heatDamage by me |
| F1 | sonnet | M | running | | | started 22:40 |
| E3 | sonnet | M | running | | | started 22:45 |
| L1 | sonnet | M | running | | | started 22:48, preview dev-alt2 (5191) |
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
| 22:44 | 46 | 3h16m | 46 | normal (task budget: 46 + E1/F1 rest ~8 + E3 8 = 62) | E2 merged; spawn E3 |
| 22:47 | 51 | 3h14m | 47 | normal | E1 merged + pushed; spawn L1 |

## Proposals (from agents, not yet in DESIGN/TECH)
- D1: Thrift rule text doesn't say whether several Thrifts stack (plan silent). Ask player / leave stacking like Amplify.
- D1: Kiln rule "scalds the units beside it for two rounds" compresses S5/S9. Accepted.
- D1: Etch rule says "any brass under it" for "brass in its footprint". Accepted.
- D1: Heat interaction text folds the 2 rounds and 1 damage into one sentence. Accepted.
- D1: all hints and owner notes written in the owner's voice by D1 (recipe hints rewritten by orchestrator). Player judges.

- E2: heat is checked on ignite (refreshing) and at the start of each hazard step for cold brass next to fire; it does not refresh every round (else a 2-round fire gives 3 scalds). Accepted.
- E2: re-heating hot brass is silent; only cold brass emits `heated`. Accepted.
- E2: hot brass scalds after fire damage via dealDamage, source "Heated brass"; it does not detonate inked survivors (unlike fire). Accepted (ask player if detonation feels missing).
- E2: scald order = hot sources in reading order, then victims; a unit beside two hot sources takes 2. Accepted.
- E2: ink stains oil under a unit too, but not oil under steam. Accepted.
- E2: a stain persists after being walked on (unlike a puddle); if both are on a tile the puddle fires first. Accepted.
- E2: a move ending on a stain cannot be undone (UndoRecord can't record it). Accepted for now; follow-up.
- E2: fire and a crumbling plate clear stain and heat silently. Accepted.

- E1: Pierce: both units take the Bolt's full damage, unit 1 first; Quill pools ink under each. Accepted.
- E1: runes before a Pierce act on unit 1 only; a Pierce anywhere on the path makes the spell pierce (the source resolves first), even behind a failing trigger. Accepted.
- E1: Pierce with no second unit: the projectile lands at the end; later runes target unit 1's tile plus the landing tile. Accepted.
- E1: pierced projectile's stopped/lands path is the full flight. Accepted.
- E1: Thrifts stack like Amplify (+1 each); a Glyph's inner Thrift counts too. Accepted (log as Proposal).
- E1: `pierced` counts as meaningful for proof. Accepted.

## Decisions and fixes made during the build

## Follow-ups and rough edges
- (fixed: aimPreview follows Pierce.) recipe.ts needs Pierce / On Ignite / Thrift text (orchestrator, after E3).
- Undo after walking onto a stain (needs `UndoRecord.stain`).
