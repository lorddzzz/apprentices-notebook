# District kit: verification (CL-3)

Written 2026-11-17 for [district-kit-plan.md](district-kit-plan.md) section 5, from the build log rows (`grep -n 'DK-' build-program-log-archive.md`) and the test files on main. One row per acceptance line. "pass" names the test file (re-run for this file, see the note at the end) or the commit that carried the proof. "not checked" means nothing on record can be pointed at: a phone check whose screenshots went to a scratchpad and were not saved in the repo counts as not checked.

| Check | How | Result |
|---|---|---|
| DK-0: the golden test replays the fixtures green on today's code | 14 recorded trips (6 Seam, 6 canals, lock solve and fire) | pass (2885b4a; tests/run/golden.test.ts) |
| DK-1: `pnpm check` green | Merge gate | pass (cfdc2ea; tests/engine/contracts.test.ts) |
| DK-1: reviewed against the HC, RC, RV, SM and FD contracts | Orchestrator review at merge | not checked: no review note is on record beyond the log row |
| DK-1: TECH section 7 row drafted | The DK-18 "Adding a district" row | pass (TECH.md section 7, 2026-10-29 row) |
| DK-2: golden green; no public API change except new paths | `run.ts` split into `engine/trip/` with explicit re-exports | pass (8a9c1ab; tests/run/golden.test.ts) |
| DK-3: golden logs identical; a fixture rule in each slot proves order | Rule slots and `roundEnd` | pass (aa33900; tests/engine/rules.test.ts, tests/run/golden.test.ts) |
| DK-4: notation round trips; a scenario per trigger with a fixture piece; golden green | Piece registry | pass (883fcfc; tests/engine/pieces.test.ts, tests/engine/notation.test.ts, tests/run/golden.test.ts) |
| DK-5a: golden green; fuzz covers every `ret` kind and keeps "the heart is a return point" | Return policy, shape, checkpoint | pass (e2a9f4c; tests/run/trip-shape.test.ts, tests/sim/trip-shape.test.ts) |
| DK-5b: a fixture trip carries a counter into its heart and a bonus goal grants a pick; save round trip | Trip state, room setup, goal kinds | pass (c7bbe37; tests/engine/trip-shape-state.test.ts) |
| DK-6: one member out then win (1 HP back), all out is a wipe, minion gone, elite stunned; canals' drop unchanged in golden | Out-of-room scenarios | pass (368d055; tests/scenarios/out-of-room.test.ts, tests/run/golden.test.ts) |
| DK-7: fixture kinds bank, vanish on a wipe, respect limits, parse back from a save | Offer-kind registry | pass (9f7743c; tests/engine/offer-kinds.test.ts) |
| DK-8: each kind has a log-fixture test (meets and narrowly misses); old canal hearing unchanged | Hearing kinds registry | pass (4f8715b; tests/engine/hearing-kinds.test.ts) |
| DK-9: a stand-in telegraphs and acts deterministically by round; clearing marks the heart, `pages` stays 0 | Stand-in scenarios | pass (f2b20ff; tests/scenarios/stand-in.test.ts) |
| DK-10: SM's floor builder reads it; a fixture floor drifts but carries no district-scoped rule | Intrusion spec | pass (6d5fc53; tests/districts/intrusion.test.ts) |
| DK-11: phone check at 375x812 of landings, a two-span choice and the doorway on fixture districts | Log: checked with temporary edits, since reverted | not checked: screenshots went to a scratchpad, none in the repo (logic: tests/app/crossroads.test.ts passes, 7311242) |
| DK-12: phone check with a fixture termed offer and a key | Log: checked | not checked: no screenshot in the repo (logic: tests/app/offer-cards.test.ts, 230b093) |
| DK-13: canal boards look and preview as before (screenshot compare); fixture piece and gauge visible at 375x812 | Log: phone-checked with a temporary dev fixture | not checked: no screenshot in the repo (logic: tests/app/district-board.test.ts, d8c4ae2) |
| DK-14: Bench offers the canal eel after it is met and not before; tests for `sceneItems` and `subjectsIn` | Registry-driven palettes | pass (d430813; tests/app/bench-registry.test.ts) |
| DK-14: phone check | Log: checked | not checked: no screenshot in the repo |
| DK-15: canal lock plays and reads as today; golden threshold solve green | Threshold as kit data | pass (44026be; tests/run/lock.test.ts, tests/run/golden.test.ts). The log row records no browser check |
| DK-16: dev "open all" screenshot at 375x812, no overlaps, paths clear of captions | Map for seven districts | not checked: no screenshot in the repo (35e00f2) |
| DK-17: golden fixtures identical | One `DistrictData` per file | pass (6c687bb; tests/run/golden.test.ts) |
| DK-17: fuzz and calibration sims unchanged within noise | `tests/sim` | not checked: the log row records golden only and this pack does not run sims |
| DK-18: one test file walks a full trip through every hook | Fixture district, mocked kit | pass (2952383; tests/run/kit.test.ts, tests/fixtures/district-kit/fixture-district/) |
| DK-18: a short "how to add a district" note goes to TECH | TECH section 7, 2026-10-29 row | pass (TECH.md section 7) |

## Additions to the plan, merged under DK IDs

| Check | How | Result |
|---|---|---|
| DK-19: module hearing kinds read through `KIT.hearKinds`; board rules built lazily; `DistrictEvent` in `GameEvent` | The DK-18 `it.fails` flipped | pass (9d1a76b; tests/run/kit.test.ts) |
| DK-IQ: harm guards, foe behaviours, kit goals, `aiAvoid`, brought rules (ink requests D1 to D3, D7, D8) | Kit tests | pass (3cb92fa; tests/districts/kit-iq.test.ts) |
| DK-D9: `lootAfterRoom` runs on won rooms; a broken term takes its page back | Kit loot tests | pass (97420e6; tests/districts/kit-loot.test.ts) |
| DK-PAPERS: papers found at once, kept on a wipe | Papers registry | pass (ed34c34; tests/run/papers.test.ts, tests/engine/papers.test.ts) |

## Notes

- Re-run on 2026-11-17: every non-sim test file cited in the six close-out verification files, together: 112 files, 5327 passed, 12 todo. `tests/sim/` was not run; rows that cite a sim name the log row.
- Open follow-ups from the log rows, none a failed check: `roomSetup.variantPool` is ignored by DK-5b; `rules` is not wired through `createBattle` for thresholds (DK-15); `tripviews.heardVoice` reads `.hear`, not `hearOf` (DK-17); the Lab piece palette and `slots` in Lab and Combat (DK-13).
- Autofixer: the log rows for DK-14 and DK-15 say it was not run (DK-14 "MCP down"). Not checked for the other UI tasks.
- Rules and accepted Proposals: DESIGN section 11, 2026-11-17 "District kit built (DK)".
