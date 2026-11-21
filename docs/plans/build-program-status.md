# Build program status (resume here)

Plans: [build-program.md](build-program.md), [calibration-plan.md](calibration-plan.md) (the last plan). Briefs: [drawn-calibration-briefs.md](drawn-calibration-briefs.md) (CAL-5S/G/P/R, next), [calibration-briefs.md](calibration-briefs.md) (CAL-G1), [build-program-briefs.md](build-program-briefs.md). Results and decisions: [calibration-results.md](calibration-results.md), [drawn-calibration.md](drawn-calibration.md). Log: [build-program-log.md](build-program-log.md) (not read on resume; `git log --grep '<ID>'`). Older Owed lists, checklists and rough edges: [build-program-status-archive.md](build-program-status-archive.md) (not read on resume).

**State:** 2026-11-21, design window done (briefs for the CAL-5 structural findings, ledger clean). Nothing running. Every plan is built; calibration (CAL-0..4, F1..F5, P, CAL-5 tasks 1-2 and the rerun) is merged; CAL-5 task 3 is the packs under Next. **Next window: routine.**

**Session rules (player):**
- Pace by the 5h limit; ignore the weekly limit unless > 97 %. The player resumes manually in a fresh session at each reset (CET = UTC+1); schedule a wake-up only when it opens a new session.
- A routine window starts a due design window itself as a subagent, without asking; player questions go to Open questions with a default held.
- Models: the skill's hybrid table (an Opus-high design window per wave for briefs and diagnosis; packs on Sonnet high or Codex Sol; long measurement on Codex, edit-heavy work on Claude).
- `pnpm check:fast` per merge batch; sims and full-loop checks only when a plan closes; calibration decisions are delegated to the build team (2026-11-20): choose the best-supported option, record the tradeoff and the miss; **player gates never block**.

## Next

0. Read CI on the last push (sims run only there). A red run is a fix pack first.
1. **CAL-5S** household sweep (Codex, running, bridges shard in progress; patch will be /tmp/cal5-sweep.mbox). CAL-5P, CAL-5G (G1-G4) merged and fast-gate green; **not pushed yet** (hold for the batch).
2. When S has finished: run `tests/sim/generator.test.ts` and the 500-seed fuzz on main (baseline 94.0 %, 30, 0, 0) for the reach-rule after-numbers; then **CAL-5R** drawn remeasure, sharded (Codex Sol 6.2 high). Then **CAL-G1** (design window). DESIGN §11 rows owed: budget stays after a failed layout check; any foe cast-reachable (castReach 4); update the brief's G1 text.
3. Needs the player's phone (non-blocking): real-iPhone timing (CAL-P: emulated 108-111 ms median, 505-526 ms p95) and the BL-111 offline check (real Chrome: `pnpm build && pnpm preview`, SW installed, offline: home, a Seam trip, the Lab).
4. Open authored misses, for CAL-G1's tables (numbers in calibration-results.md): canals room 4 at 100 %; foundry four bells 93 %; foundry loft 73 % (stall-shaped); Registrar solo +11 / duo +8 pp; authored Chief crumbling 67.5 %; quarter heart stalls 11 %; bridges worn pairs clear 0/40.

## Running or partial
none. (Reading usage: `node .claude/skills/implement/usage.mjs`. Codex: board `spawn_subagent` with `git: true`; the worker's patch comes back as `/tmp/<pack>.mbox`.)

## Needs design review
none.

## Owed (declared by a contract, not yet built)
- Cleared.svelte reads "The heart of the inked page is quiet" for a drawn trip — owed by CAL-5P (P3).
- DESIGN §11 rows at merge: held-back attempt keeps its budget (P28 wording; CAL-5G), weight-linked heart HP default 0 (CAL-5G, numbers by CAL-5R), peal distinct-first and the hookless caveat (CAL-5P) — owed by the orchestrator.
- CAL-5 register rows deferred to design (heart weight, piece reach, length-six peal, Steward parity) — owed by CAL-5R; copied into calibration-results.md at its merge.
- The Registrar note's later-fight effect is unmeasured (watch) — CAL-G1 notes it.
- The dev generator page logs one unexamined 404 (CAL-P) — CAL-G1 or a routine fix.

## Close checklist
Cartographers, Foundry, Ending: done (CI deployed after each push; ending's player gates EN-G1/EN-G3 open and non-blocking). Calibration closes with CAL-G1: full gate, one `code-review` of the plan's diff, DESIGN §11 / TECH §7 rows for the calibrated numbers, ledger (`node .claude/skills/implement/ledger.mjs docs/plans/build-program-log.md docs/plans/calibration-plan.md`), push and CI.

## Open questions for the player (defaults held)
- Do 40-round stalls count as heart misses? Default yes. May hung bells act directly on the Carillonneur? Default no. May the Lamplighter's kit get stronger? Default no.
- A peal drawn with a master whose heart has no hooks: default, hang nothing and say so at the drawing table (CAL-5P). The alternative, earned bells hanging on any heart, is a rule.
- What makes a heavy drawing's heart harder: default, master HP by weight (CAL-5G/R). If every HP candidate stalls or goes unverified, the next lever is escorts by weight (a rule; not built).
- Playtest gates (non-blocking): EN-G1/G3 (do three drawn districts feel different? any room unfair or a walkover? was a heavy drawing's loot worth its pen? did the handover feel like an ending?), IQ-G1, CG-G1, BH-G1, BR-G2, BF-G1.

## Rough edges
- Heavy drawing tests carry 300 s per-test timeouts (2026-11-21); a gate that still times out is rerun alone with `--testTimeout=400000` before it counts as red.
- The Registrar's note with `swap-unit-strand` is a sure erasure of a foe on pencil: a watch item.
- A basic Shove at an empty bridges span is legal and does nothing (kept for saves that replay recorded Shoves).
- CI cancels a run when the next push arrives: push once per merge batch.
- A test mocking `$engine/districts/kit` must not import the real Seam module in its factory; tests import `$engine` before district files. `src/engine/drawing/kits/**` imports district helpers: keep those imports out of `src/data`.
- The briefs name functions earlier packs define (`storeDrawing`, `inkRoom`, `GEN_KITS`, `HEART_FRAMES`, `ShapeKit.shape`): fix later briefs in the same merge if one is renamed.

## Continuation prompt (new session)

```
/implement Resume the build program from docs/plans/build-program-status.md.
```
