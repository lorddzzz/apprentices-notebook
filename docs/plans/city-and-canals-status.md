# City and canals build status (resume here)

Plan: [city-and-canals-plan](city-and-canals-plan.md). Orchestrator: Opus main session. Updated on every event and committed with every merge.

**State:** holding for reset (resumes ~22:11 UTC)
**Next:** after the 22:10 reset: check C2 (running or cut off: review its branch, re-spawn with "continue from commit X"); start U2 (map) and U1 (board visuals); then milestone A.

## Tasks
| ID | Model | Size | Status | Branch / commit | Usage Δ | Notes |
|---|---|---|---|---|---|---|
| W0 | opus (me) | L | merged | (this commit) | ~9% | contracts, stubs, save v5, fixtures, Seam identity gate |
| E1 | sonnet | M | merged | (E1 merge commit) | ~7% | 31 tests; added `blocksUnits` to queries.ts (contract change, approved) |
| E2 | sonnet | L | merged | (E2 merge commit) | ~8% | 18 scenario tests; edited turn.ts (burst intent), approved |
| E3 | sonnet | M | merged | (E3 merge commit) | ~5% | 28 tests in tests/run/city.test.ts; touched doorway.test.ts (returnHome now counts a trip) |
| C1 | sonnet | M | merged | (C1 merge commit) | ~8% | sim: rooms 1–3 100%, room 4 96%, heart 39% (34/55/31 by variant), 74/200 mother kills; sim adds ~20 s to the gate |
| C2 | sonnet | S | running | | | started 21:57 at 96% (may be cut off; resume from its last commit) |
| U1 | sonnet | M | pending | | | needs E1, E2 |
| U2 | sonnet | M | pending | | | needs E3 |
| U3 | haiku | S | merged | (U3 merge commit) | ~3% | 12 tests; browser-checked greyed Return only; trip page + rumour line unverified (milestone A) |
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
| 21:40 | 87 | 30m | 25 | wrap | E1, E2 merged; wave 1 done; start C1 (critical path) |
| 21:46 | 92 | 26m | 25 | wrap | U3 merged |
| 21:57 | 96 | 13m | 26 | hold | C1 merged; start C2 (smallest unblocked) per pacing rule |

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
- E2: any moth death bursts (Bolt, bump, detonation too). Accepted (simplest; "a fuse").
- E2: every lamp counts as lit; the mother calls at the lamp nearest a member (Manhattan, ties in reading order). Accepted.
- E2: a summon is skipped at plan time (she waits) if the lamp is taken or 4 moths live; re-checked silently at resolution. Accepted.
- E2: the flare is telegraphed every third round even with no moths on the board. Accepted.
- E2: the eel swims any water without grate, gate, plate or unit, up to 4 tiles toward the water beside the nearest member, then lunges at an adjacent member. Accepted.
- E2: the moth flies to the nearest fire (Manhattan) and may land on it, then burns and bursts; without fire it chases like a rat. Accepted.
- E2: a burst lights the oil on its tile, then 1 ("Burst") to each orthogonal neighbour in reading order. Accepted.
- E2: snuff clears fire, oil and stain only on tiles that burn. Accepted.
- U3: the heard voice is inferred from the district's hear list (any owner condition = owner). Accepted.
- U3: canal Crossroads heading "Deeper still."; trip page "Home from {district}." off the Seam. Accepted (D1 may reword).
- U3: rumour line at the top of the Study window, small italic mono; both voices' highlights titled "A new page of the map". Accepted.
- C1: sim loadout = start collection + 2 oil, 1 spark, 2 splash wired into Splash/Oil/Spark chains (the plan's "Seam average deep-trip collection" was vague). Accepted.
- C1: rooms lighter than the design table (room 3 no rat, room 4 one moth, heart one moth) to keep charges for the heart. Accepted for now, *tune by playing*; ask the player in the playtest.
- C1: the start loadout alone can't clear room 3; the hearing gate (light 3 oil tiles) means the player already has an oil-spark chain. Accepted.

## Decisions and fixes made during the build
- E2 merge fix (me): `resolveSpecial(ctx, e, intent)` now takes the telegraphed intent, so a summon lands at the lamp that glowed, not one re-derived at resolution. Contract change.
- E2 contract change: `turn.ts` resolves a `burst` attack intent with `burstAt` (the moth dies bursting) instead of a plain hit.
- E1 contract change: `queries.ts` gains `blocksUnits(tile) = plate || gate || grate`, used by `isOpen` and `travel`, so walks, pushes, slides and projectiles stop at gates and grates.
- W0: the Seam's encounters stay in `encounters.ts`; `districts.ts` imports them (`DISTRICTS.seam.encounters === ENCOUNTERS`) instead of moving the code. Same effect, less churn.
- W0: the lamp-mother's token is `M` (the design table didn't give one). Attack verbs: lunge, "swing its pole", burst.
- W0: the Study door now goes to `#/map`; the stub map lists open districts with "Set out". The old "Set out?" sheet stays in Study.svelte, unreachable, for U2 to move.

## Follow-ups and rough edges
- Preview ports 5190/5191 are held by dev servers running from the main checkout (they serve main, not a worktree). UI agents must start vite from their own worktree on their assigned port (`pnpm dev --port 519x --strictPort`) and stop it after.
- StudyScene: full-file svelte-autofixer pass still owed (U3 checked only its change).
- A Bolt stopped by a grate or gate still logs "stopped by the brass plate" (`stopped.by` is typed 'steam' | 'brass plate'). Widen the type and the wording in W4 or a fix task.
