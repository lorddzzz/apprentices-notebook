# Foundations: verification (CL-3)

Written 2026-11-17 for [foundations-plan.md](foundations-plan.md) section 5, from the build log rows (`grep -n 'FD-' build-program-log-archive.md`) and the test files on main. One row per acceptance line. "pass" names the test file (re-run for this file, see the note at the end) or the commit that carried the proof. "not checked" means nothing on record can be pointed at. Commits are the hashes on main.

| Check | How | Result |
|---|---|---|
| FD-0: contract types compile; all existing logs unchanged | Contract test; golden trips replay unchanged | pass (90ffd62; tests/engine/fd0-contracts.test.ts, tests/run/golden.test.ts) |
| FD-1: matrix passes on today's code; inconsistencies listed as `todo` cases with the P-rule | Cause by hook by trait table | pass (8eb05e3; tests/engine/arrival-matrix.test.ts). The 15 `todo` rows left are causes not built yet |
| FD-2: each BL-105/106/107 report reproduced or kept as a regression | Scenario and cap tests, first as `it.fails` | pass (f097458; tests/scenarios/delayed.test.ts, tests/engine/cap.test.ts) |
| FD-3: matrix green with only P6 and P7 rows changed, each a reviewed diff | Flipped cells in the matrix | pass (2d5af57; tests/engine/arrival-matrix.test.ts) |
| FD-3: no mover sets `pos` outside the pipeline | Grep test over `src/engine` | pass (2d5af57; tests/engine/arrival-pipeline.test.ts, "no engine file but arrival.ts assigns a unit position") |
| FD-4: BL-105 cases pass with P9's outcomes; limit 5 and Glyph credit tests unchanged | Delayed-context scenarios | pass (1d96ccd; tests/scenarios/delayed.test.ts) |
| FD-5: replacement jar waits until next dusk; ids never reused | Dusk and jar id scenarios | pass (1afcad0; tests/scenarios/delayed.test.ts) |
| FD-6: cap sweep, projection equals final state at every cut; cast terminates | Cap sweep over ink, oil-spark, impulse and zap chains | pass (7d58843; tests/engine/cap.test.ts) |
| FD-6: fuzz bound tightened | Fuzz bound now `CAST_EVENT_CAP + 3` | not checked: the bound is in `tests/sim/fuzz.test.ts`, which this pack does not run; the log row records the change |
| FD-7: projection and fuzz pass with the guess helpers removed | Projection test over scenarios and engine suites | pass (43a7e1f; tests/app/projection.test.ts) |
| FD-7: masked previews disclose nothing new | Review of the `jarSealed` peek and masks | not checked: the log row names no test for it |
| FD-8: footnote scenarios pass; a variant's text can change without changing behaviour | Footnote scenarios and a reword test | pass (34e909b; tests/run/footnotes.test.ts, "a variant text can be reworded without changing behaviour") |
| FD-9: Bench offers the same events on existing saves; a grant helper adds one; codex unchanged | Bind event inference and grant tests | pass (6b72687; tests/run/bind-events.test.ts) |
| FD-10: a save whose fight fails twice returns home with a toast; three corrupt texts kept; app tests | Fallback tests | pass (6550818; tests/app/fallback.test.ts) |
| FD-11: `pnpm check` green, no `it.fails` left, expected logs updated where a P-rule says so | Sweep of every scenario and fixture touched by FD-3 to FD-7 | pass (1600115, a docs commit: no code change needed, 15 `it.todo` left for causes not built) |
| FD-11: phone check at 375x812 of a drift onto a jar and a crush into a plate | Log: Lantern Walk jar drift and The Wall crush, final frames match the logs | not checked: the screenshots were saved to a scratchpad and none is in the repo |
| Plan section 6: phone check of a slide through a step-jar and a dusk with a replacement jar | Listed in the plan | not checked: no row or screenshot on record |
| Plan section 6: `svelte-autofixer` on changed components | Per-task duty | not checked: the FD log rows record no run |

## Notes

- Re-run on 2026-11-17: every non-sim test file cited in the six close-out verification files, together: 112 files, 5327 passed, 12 todo. `tests/sim/` was not run; rows that cite a sim name the log row.
- Open follow-ups from the log rows, none a failed check: `eventCap` is not threaded through `battle.ts` or `runDraft`; the cap sweep lacks mix, Bind, piece and push-onto-jar chains; a detached run inside a cast gets a fresh budget, so the cap is not strict for jar-opening casts (FD-6). `moveUndone` is not yet on `RelocationFields` (FD-7).
- Q1 and Q2 of the plan were built at their defaults (fire has no arrival effect; a Repeat keeps its auras). DESIGN section 11, 2026-11-17 "Foundations built (FD)".
