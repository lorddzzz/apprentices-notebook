# City and canals build status (resume here)

Plan: [city-and-canals-plan](city-and-canals-plan.md). Orchestrator: Opus main session. Updated on every event and committed with every merge.

**State:** building
**Next:** Wave 1 running (E1, E2, E3 started 21:32 UTC). If cut off: resume after the 22:10 reset, review partial branches, re-spawn with "continue from commit X".

## Tasks
| ID | Model | Size | Status | Branch / commit | Usage Δ | Notes |
|---|---|---|---|---|---|---|
| W0 | opus (me) | L | merged | (this commit) | ~9% | contracts, stubs, save v5, fixtures, Seam identity gate |
| E1 | sonnet | M | merged | (E1 merge commit) | ~7% | 31 tests; added `blocksUnits` to queries.ts (contract change, approved) |
| E2 | sonnet | L | running | | | started 21:32 |
| E3 | sonnet | M | merged | (E3 merge commit) | ~5% | 28 tests in tests/run/city.test.ts; touched doorway.test.ts (returnHome now counts a trip) |
| C1 | sonnet | M | pending | | | needs E1, E2 |
| C2 | sonnet | S | pending | | | needs E1, E3; after C1 merges |
| U1 | sonnet | M | pending | | | needs E1, E2 |
| U2 | sonnet | M | pending | | | needs E3 |
| U3 | haiku | S | pending | | | needs E3 |
| A | opus (me) | S | pending | | | milestone A verify |
| U4 | sonnet | M | pending | | | needs C2, U1, U2 |
| D1 | haiku | S | pending | | | needs C1, C2 |
| F1 | sonnet | M | pending | | | needs E1–E3, C1 |
| W4 | opus | M | pending | | | |

## Usage log
| Time (UTC) | 5h % | resets in | weekly % | zone | action |
|---|---|---|---|---|---|
| 21:15 | 61 | 54m | 21 | normal | baseline, start W0 |
| 21:25 | 69 | 45m | 22 | normal | W0 mid-way |
| 21:31 | 73 | 39m | 23 | normal→narrow | W0 merged (~12%); start E1, E2, E3 anyway (reset before they finish) |
| 21:37 | 84 | 33m | 24 | narrow→wrap | E3 merged; E1, E2 running; start U3 (smallest unblocked) |

## W0 contract notes (for the agents)
- `Intent = AttackIntent | SpecialIntent`; every reader narrows on `kind === 'attack'`. `telegraph` events carry any `Intent`; `attack` events an `AttackIntent`.
- Board tokens: `w` + arrow (`w>`, `wv`, `w<`, `w^`; the arrow belongs to the water, so `ew^` is an eel on water flowing up), `h` grate (water only, no unit), `g` gate (alone, no unit), `l` lamp. Foe tokens: eel `e`, snuffer `n`, moth `m`, lamp-mother `M`.
- Hooks wired to stubs: `hazards` = `drift` first … burn, `burnGates`, … vents, `snuffStep` last; `ignite` calls `burnGates` after heating; `resolveIntent` sends non-attack intents to `resolveSpecial`; `ai.ts` sends `lurker`/`moth`/`mother` to `foeAct`; `checkEnd` uses `objectiveMet(state, ctx.log)` (this action's log) when `state.objective` is set.
- `closeBattle` calls `hearFromBattle`, and `hearAfterTrip(…, 'wiped')` on a wipe; `returnHome` checks `canReturn`, then `bankKeys`, then `hearAfterTrip(…, 'returned')` (which also counts the trip and marks a cleared heart). `goHome` diffs `city.heard` to add rumours to the recap's `stats.heard`.
- `rollOffers(…, draft, key)`: a key from `keyOffer` joins the end of the pool with its weight, so the Seam's rolls don't change when it is null.
- `seeMap(p)` (clears `fresh`) is an extra city stub for U2.
- Seam identity gate: `tests/run/seam-identity.test.ts` against `tests/fixtures/seam-identity.json` (written from the commit before W0). Never regenerate it.

## Proposals (from agents, not yet in DESIGN/TECH)
- E3: `discovered` conditions read `interaction:<id>` from `p.interactions` and `idiom:<id>` from `p.idioms`; other codex ids never match. Accepted.
- E3: owner-voiced conditions are checked only in `hearFromBattle` (`ignite`, `discovered`), rumour-voiced only in `hearAfterTrip` (`heart`, `trips`, `discovered`). Accepted.
- E3: an `ignite` condition with `district` counts only in that district's battles, and only the largest single `ignite` counts (no summing). Accepted (matches K-20 "one ignite event").
- E3: every trip counts (wiped or returned); a heart is marked only on a return with status `cleared` (also adds it to heard/open defensively). Accepted.
- E3: `canReturn` = landings 'all' or the index listed, no special case for `cleared`. A heart not listed as a landing would strand the party: districts must list their heart (canals do). Accepted; add a data integrity check in F1/W4.
- E3: `nextLanding` is null at a landing and when no later landing exists. Accepted.
- E3: `keyOffer` takes the first matching district in `DISTRICT_IDS` order; any key already in loot/offers blocks another. Accepted.
- E3: `bankKeys` adds the district to `heard` if missing, not to `fresh`; `solveThreshold`/`openAll` leave `fresh` alone. Accepted.

- E1: one `drift` event per round carries floats and units; a unit's `ref.at` is the tile it left. Accepted.
- E1: fire does not enter steam: a lit float drifting into steam goes out, the oil stays. Accepted (matches ignite's rule).
- E1: a unit carried by the current loses its move-undo. Accepted.
- E1: floats don't carry steam. Accepted.
- E1: a unit drifting onto an ink puddle or stain is not inked (no settle). Accepted for now; *tune by playing*.
- E1: two units whose targets are each other's tiles both stay. Accepted.
- E1: a unit may drift off water onto free land. Accepted (the design says units drift "if the tile is free").

## Decisions and fixes made during the build
- E1 contract change: `queries.ts` gains `blocksUnits(tile) = plate || gate || grate`, used by `isOpen` and `travel`, so walks, pushes, slides and projectiles stop at gates and grates.
- W0: the Seam's encounters stay in `encounters.ts`; `districts.ts` imports them (`DISTRICTS.seam.encounters === ENCOUNTERS`) instead of moving the code. Same effect, less churn.
- W0: the lamp-mother's token is `M` (the design table didn't give one). Attack verbs: lunge, "swing its pole", burst.
- W0: the Study door now goes to `#/map`; the stub map lists open districts with "Set out". The old "Set out?" sheet stays in Study.svelte, unreachable, for U2 to move.

## Follow-ups and rough edges
- A Bolt stopped by a grate or gate still logs "stopped by the brass plate" (`stopped.by` is typed 'steam' | 'brass plate'). Widen the type and the wording in W4 or a fix task.
