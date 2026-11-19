# Build program: briefs for the packs not started yet

Spawn `pack-worker` with the role's model and effort and paste one brief as written ([templates](../../.claude/skills/implement/templates.md)). Delete a brief when its pack merges. A routine window runs these; a design window writes the next ones (listed at the end). Written in the design window of 2026-11-19 (the kit-less elements and the ending's Close). The decisions behind them: [ending-plan.md](ending-plan.md) P38–P40 and [ending.md](../design/ending.md) §1.5. The briefs for Packs L, N2 and R1–R7 were removed when those packs merged (`git log --grep '<ID>'` has them).

## Order for the routine windows

A pack starts when the packs in its "Starts when" are merged. Packs on one row own disjoint files and run together on different runners.

| Wave | Packs (together) | Runner · model / effort | Starts when |
|---|---|---|---|
| 27 | K2a, K2b | merged 2026-11-19 (9acce50, a41288c) | – |
| 28 | **EN-14** the ending's Close: a design-window agent, not a `pack-worker` | Claude · strongest model, high | K2a and K2b merged, CI green |
| then | **CAL** the calibration plan (CAL-0 to CAL-5): its briefs live in [calibration-briefs.md](calibration-briefs.md), written separately; they start after EN-14 | as written there | EN-14 merged |

File clashes and how the order avoids them:
- K2a owns the palette, the needs check, `src/data/drawing.ts` and the canals, quarter and bridges kits; K2b owns `generate.ts`, `drawing/types.ts`, the foundry kit and `districts/inkedPage.ts`. Neither edits the other's files. Both add tests in their own files; K2a alone edits `tests/drawing/acceptance.test.ts` and `tests/drawing/generator.test.ts`.

Every brief's "Owed by this pack" items are also in the status file's Owed list.

---

## EN-14: the ending's Close (a design-window agent; Claude, strongest model, high effort)

Spawn as the skill's design window (one agent, in a worktree; not a `pack-worker`), once K2a and K2b are merged and CI on that push is green. It may fix in place; it commits on its branch and the orchestrator merges, pushes and edits the status file. Its instructions:

```
EN-14 of docs/plans/ending-plan.md: the ending's Close (the implement skill's Close steps for the ending plan).

Read: ending-plan.md §5 Close row EN-14 and §6 Verification; docs/design/ending.md (all, short); the implement skill's "Close" section. Pattern: docs/plans/foundry-verification.md (the verification file's format).
Own: anything the fixes below need, under the fix rule; docs/plans/ending-verification.md (new); docs/plans/ending-evidence/en14-*.jpg; DESIGN.md §6.7 and §11; TECH.md §7; docs/design/ending.md (status line); ending-plan.md (State line); docs/ROADMAP.md and ROADMAP-done.md (BL-126); docs/plans/calibration-plan.md §1.1 (numbers found, appended only); this briefs file (new briefs for larger findings); one EN-14 row in docs/plans/build-program-log.md. Not the status file, and not docs/plans/calibration-briefs.md.
Fix rule: fix a finding in place when it is under about 30 lines, changes no rule and its tests pass unchanged (a behaviour fix ships with a test that fails before it). Every larger finding becomes a brief in this file; every number found in engine code goes to calibration-plan §1.1. No balance tuning.

1. Gate: on the merged branch, `pnpm check > check.log 2>&1; tail -30 check.log` (the full gate, sims in). Red = fix (fix rule) or brief it, and say which.
2. Full-loop phone check at 375x812 (the `verify` skill), screenshots to docs/plans/ending-evidence/en14-<state>.jpg. Reach the states with a save built from tests/drawing/fixtures.ts (`handoverProfile()` before the scene, `fullHousehold()` after it) injected into the app's storage, from a scratch script outside the repo (or a fixture recorded with tests/fixtures/saves/record.ts if it supports it); `window.__inkDelay` shows the inking line, `window.__inkFail` a failed inking. States (ending-plan §6, plus the Owed items):
   the door row on the map before the scene and "Visit the owner's desk" after it (Pack L did not screenshot the row after the visit); every scene page and the gifted-pages line; the credits (mid-scroll, a skip) and both codex replays; the drawing table empty, full, over budget and with greyed reasons (one need, one pen); the map with three drawn pages and the lower floors; Set out; "inking the room…"; a failed inking with Try again and Home; a generated 7x9 room with three apprentices; one drawn heart per frame (Marginalia, lamp-mother, Lamplighter, postmaster, Bath-Steward, Chief Warden, Carillonneur, Registrar); the Codex's ending tab on a trip.
   There is no dark theme: record "dark: not applicable" (do not screenshot it). Run svelte-autofixer on every ending component until clean: src/ui/screens/{Handover,Credits,DrawingTable,Desk,Codex,Combat,Cleared}.svelte, src/ui/districts/inkedPage/PagesSlot.svelte, src/ui/districts/lowerSeam/{StairSlot,DoorLine}.svelte. Small visual defects: fix (fix rule).
3. `code-review` at high, once per subsystem, on the files as they stand: (a) the generator: src/engine/drawing/{generate,trial,check,palette,cost,loot,trip,profile}.ts, src/engine/sim/**, src/app/generation.ts and generation.worker.ts; (b) kits and frames: src/engine/drawing/kits/**, src/engine/drawing/frames/**, src/engine/districts/inkedPage.ts, src/data/drawing.ts; (c) the ending: src/engine/drawing/ending.ts, src/data/ending.ts, src/app/drawing.ts, the routes `handover`/`credits` in src/app/flow.ts, and the components above.
   Start from the known items: `ending.ts` re-derives door-open (Biome forbids the districts import): make it share `ownerDoor`'s rule or pin both with one test; the stale `it.todo('EN-4: worker results equal the synchronous path')` in tests/drawing/acceptance.test.ts (EN-4 is tested in tests/app/generation.test.ts): delete it; `battle.svelte.ts:129` passes no footnotes to `rivalSheet` (one line, R7's proposal); `hurtByPulse` exported for a test only; R2's core kinds flagged `sandbox: true` and the unbanked plunge (`onBank` a no-op): confirm it is intended or brief it; `window.__inkDelay`/`__inkFail` are dev-only; `MAP_PAGE_HEIGHT` 1900 and F2's doorway weight constant in loot.ts (numbers: §1.1).
4. Copy decisions held for this Close (worker-written lines not in ending-text.md): the handover's closing screen ("The owner takes a seat on the bench. The drawing table is on the desk.") and the Codex ending tab on a trip ("Out on a trip: these open again in the study."). Default: keep both as written (they follow ending.md §1.1 and say only what happens); list them in the report as player questions with that default. Cleared.svelte's "The heart of the inked page is quiet" stays copy for CAL.
5. Records: DESIGN.md §6.7 (the ending as built) and §11 (rows for P29–P40 that are not there yet: read §11 first; P38–P40 marked *Proposal*); docs/design/ending.md status "Decided" -> "Built (EN-14, <date>)"; TECH.md §7 (the generation worker and its prefetch, the EN salt range 7000–7999, the bot in src/engine/sim with its op budget, GEN_LIMITS/GEN_TUNING in data, the kit and frame registries; read §7 first and add only what is missing); docs/plans/ending-verification.md (task acceptance per EN task with commit and test file, the phone states with their screenshots, the review findings and what was done, what was not checked and why); ending-plan State line (done but the playtest gates EN-G1/EN-G3); ROADMAP BL-126 to ROADMAP-done.md.
6. Ledger: `node .claude/skills/implement/ledger.mjs docs/plans/build-program-log.md docs/plans/ending-plan.md`. Every ending task it lists as open or "in the log's prose only" is done, aliased in the log, or named in your report for the status file's Next. Add the EN-14 log row (six cells; findings counted in the Note).
7. Report (under 250 words): gate result, the phone states seen (and any not reached, with why), review findings fixed / briefed / moved to §1.1, records written, ledger result, the player questions with defaults, and two to four playtest questions for EN-G1/EN-G3 (variety, fairness and loot of drawn districts; the handover's feel).

The orchestrator then pushes once, confirms CI deployed that commit, and updates the status file (Close checklist for the ending, Next = CAL from calibration-briefs.md).
```

---

## Written in a later design window

| Pack | Tasks | Starts when |
|---|---|---|
| Plan B (only if needed) | rooms validated at home into a pool (ending-plan P29) | the player's look through the 40 sample rooms finds more than 2 of 20 broken or dull |
| Fix packs from EN-14 | whatever EN-14's review briefs here | EN-14 merged |
