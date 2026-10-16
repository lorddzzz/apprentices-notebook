# City and canals build status (resume here)

Plan: [city-and-canals-plan](city-and-canals-plan.md). Orchestrator: Opus main session. Updated on every event and committed with every merge.

**State:** building
**Next:** Wave 1: spawn E2 (canal foes, Sonnet), E1 (the current, Sonnet), E3 (city engine, Sonnet) in worktrees from W0's commit.

## Tasks
| ID | Model | Size | Status | Branch / commit | Usage Δ | Notes |
|---|---|---|---|---|---|---|
| W0 | opus (me) | L | merged | (this commit) | ~9% | contracts, stubs, save v5, fixtures, Seam identity gate |
| E1 | sonnet | M | pending | | | |
| E2 | sonnet | L | pending | | | |
| E3 | sonnet | M | pending | | | |
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

## W0 contract notes (for the agents)
- `Intent = AttackIntent | SpecialIntent`; every reader narrows on `kind === 'attack'`. `telegraph` events carry any `Intent`; `attack` events an `AttackIntent`.
- Board tokens: `w` + arrow (`w>`, `wv`, `w<`, `w^`; the arrow belongs to the water, so `ew^` is an eel on water flowing up), `h` grate (water only, no unit), `g` gate (alone, no unit), `l` lamp. Foe tokens: eel `e`, snuffer `n`, moth `m`, lamp-mother `M`.
- Hooks wired to stubs: `hazards` = `drift` first … burn, `burnGates`, … vents, `snuffStep` last; `ignite` calls `burnGates` after heating; `resolveIntent` sends non-attack intents to `resolveSpecial`; `ai.ts` sends `lurker`/`moth`/`mother` to `foeAct`; `checkEnd` uses `objectiveMet(state, ctx.log)` (this action's log) when `state.objective` is set.
- `closeBattle` calls `hearFromBattle`, and `hearAfterTrip(…, 'wiped')` on a wipe; `returnHome` checks `canReturn`, then `bankKeys`, then `hearAfterTrip(…, 'returned')` (which also counts the trip and marks a cleared heart). `goHome` diffs `city.heard` to add rumours to the recap's `stats.heard`.
- `rollOffers(…, draft, key)`: a key from `keyOffer` joins the end of the pool with its weight, so the Seam's rolls don't change when it is null.
- `seeMap(p)` (clears `fresh`) is an extra city stub for U2.
- Seam identity gate: `tests/run/seam-identity.test.ts` against `tests/fixtures/seam-identity.json` (written from the commit before W0). Never regenerate it.

## Proposals (from agents, not yet in DESIGN/TECH)

## Decisions and fixes made during the build
- W0: the Seam's encounters stay in `encounters.ts`; `districts.ts` imports them (`DISTRICTS.seam.encounters === ENCOUNTERS`) instead of moving the code. Same effect, less churn.
- W0: the lamp-mother's token is `M` (the design table didn't give one). Attack verbs: lunge, "swing its pole", burst.
- W0: the Study door now goes to `#/map`; the stub map lists open districts with "Set out". The old "Set out?" sheet stays in Study.svelte, unreachable, for U2 to move.

## Follow-ups and rough edges
