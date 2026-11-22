# Build program status (resume here)

Plans: [build-program.md](build-program.md), [calibration-plan.md](calibration-plan.md) (the last plan). Briefs: [drawn-calibration-briefs.md](drawn-calibration-briefs.md) (CAL-5H, next), [calibration-briefs.md](calibration-briefs.md) (CAL-G1 Close), [build-program-briefs.md](build-program-briefs.md). Results and decisions: [calibration-results.md](calibration-results.md), [drawn-calibration.md](drawn-calibration.md). Log: [build-program-log.md](build-program-log.md) (not read on resume; `git log --grep '<ID>'`). Older Owed lists, checklists and rough edges: [build-program-status-archive.md](build-program-status-archive.md) (not read on resume).

**State:** 2026-11-22, calibration closed (CAL-5R, CAL-5H merged; CAL-G1 dispositions recorded; full gate green at 24c6af5; code review clean). Every plan is built. Nothing running. Open: the full drawn-trip phone loop at 375x812 (the closing session had no browser tools), a drawn-page set-out offline (generation worker precache), nightly rerun of unfinished sweep shards, player gates and questions below. **Next window: routine, only if the player wants more work.**

**Session rules (player):**
- Pace by the 5h limit; ignore the weekly limit unless > 97 %. The player resumes manually in a fresh session at each reset (CET = UTC+1); schedule a wake-up only when it opens a new session.
- A routine window starts a due design window itself as a subagent, without asking; player questions go to Open questions with a default held.
- Models: the skill's hybrid table (an Opus-high design window per wave for briefs and diagnosis; packs on Sonnet high or Codex Sol; long measurement on Codex, edit-heavy work on Claude).
- `pnpm check:fast` per merge batch; sims and full-loop checks only when a plan closes; calibration decisions are delegated to the build team (2026-11-20): choose the best-supported option, record the tradeoff and the miss; **player gates never block**.

## Next

0. Merge `build/design-g1` (docs only; `pnpm check:fast` not needed). Read CI on the last push (sims run only there). A red run is a fix pack first.
1. **CAL-5H** ([drawn-calibration-briefs.md](drawn-calibration-briefs.md), Codex Sol 6.2 high, 90 min): the drawn Steward's own HP (`DRAWN_STEWARD_HP`). It screens 38/30/24/14 on 10-seed Steward heart shards, applies by rule and reruns the three heart bands. Copy its approval row into calibration-results.md at merge.
2. **CAL-G1 Close** ([calibration-briefs.md](calibration-briefs.md), routine orchestrator, Opus high) after CAL-5H: final tables using the G1 dispositions, one full `pnpm check`, the 375×812 drawn-trip loop (note the dev page's 404 URL, G1-12), one `code-review` of the calibration diff, TECH §7 rows for calibrated data, plan State, ledger, push, CI.
3. Decided 2026-11-22 (no pack): EN-13 medium/heavy retained as misses, escorts by weight deferred (G1-1); EN-S2 gate = the fuzz, corpus shown by lineup (G1-2); authored misses retained (G1-5..G1-11); the CAL-5R light rerun closed by identity (G1-4). Unfinished sweep shards (canals, bridges, cartographers' trips, Seam-Canals fixed-spot) may rerun as a nightly job.
4. Needs the player's phone (non-blocking): real-iPhone timing is DONE 2026-11-22 (median 144-152 ms direct, 206-221 ms worker; p95 349-537 ms; bar met; see calibration-results.md CAL-P). BL-111 offline check DONE 2026-11-22 on the live site on iPhone (home, a Seam trip with fight and loot, the Lab, all offline, fresh save; the drawn-page set-out offline was not tried). Nothing else open in that item.

## Running or partial
none. (Reading usage: `node .claude/skills/implement/usage.mjs`. Codex: board `spawn_subagent` with `git: true`; the worker's patch comes back as `/tmp/<pack>.mbox`.)

## Needs design review
none.

## Owed (declared by a contract, not yet built)
- CAL-5H's approval row and final EN-13 table, for calibration-results.md and CAL-G1's tables (owed by CAL-5H).
- TECH §7 rows for the calibrated data and bot changes (CAL-1..5R), owed by the CAL-G1 Close. The DESIGN §11 rows for CAL-5G/P and the G1 dispositions are written (2026-11-22), and so is P28's wording.

## Close checklist
Cartographers, Foundry, Ending: done (CI deployed after each push; ending's player gates EN-G1/EN-G3 open and non-blocking). Calibration closes with CAL-G1 (after CAL-5H): full gate, one `code-review` of the plan's diff, TECH §7 rows and a DESIGN §11 line for CAL-5H's value, ledger (`node .claude/skills/implement/ledger.mjs docs/plans/build-program-log.md docs/plans/calibration-plan.md`), push and CI.

## Open questions for the player (defaults held)
- Do 40-round stalls count as heart misses? Default yes. May hung bells act directly on the Carillonneur? Default no. May the Lamplighter's kit get stronger? Default no. Should long trips refill charges, given worn pairs clear 0 % on bridges because they run out of charges (G1-10)? Default no.
- A peal drawn with a master whose heart has no hooks: default, hang nothing and say so at the drawing table (CAL-5P). The alternative, earned bells hanging on any heart, is a rule.
- What makes a heavy drawing's heart harder: both HP-by-weight candidates were rejected (CAL-5R). Default now: nothing; weight scales the rooms before the heart and the loot (G1-1). Escorts by weight is the deferred lever, a rule for after the playtest.
- Should a solo's walkover also count its charges (a solo "full HP" win means untouched, 37.9 % of solo offers)? Default no: the walkover definition stays as EN-S2 set it (G1-2).
- Playtest gates (non-blocking): EN-G1/G3 (do three drawn districts feel different? any room unfair or a walkover? was a heavy drawing's loot worth its pen? did the handover feel like an ending?), IQ-G1, CG-G1, BH-G1, BR-G2, BF-G1.

## Rough edges
- Heavy drawing tests carry 300 s per-test timeouts (2026-11-21); a gate that still times out is rerun alone with `--testTimeout=400000` before it counts as red.
- The Registrar's note with `swap-unit-strand` is a sure erasure of a foe on pencil, and its later-fight effect is unmeasured: a watch item (CAL-4-D, G1-8).
- A basic Shove at an empty bridges span is legal and does nothing (kept for saves that replay recorded Shoves).
- CI cancels a run when the next push arrives: push once per merge batch.
- A test mocking `$engine/districts/kit` must not import the real Seam module in its factory; tests import `$engine` before district files. `src/engine/drawing/kits/**` imports district helpers: keep those imports out of `src/data`.
- The briefs name functions earlier packs define (`storeDrawing`, `inkRoom`, `GEN_KITS`, `HEART_FRAMES`, `ShapeKit.shape`): fix later briefs in the same merge if one is renamed.

## Continuation prompt (new session)

```
/implement Resume the build program from docs/plans/build-program-status.md.
```
