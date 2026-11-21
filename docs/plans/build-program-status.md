# Build program status (resume here)

Plans: [build-program.md](build-program.md), [calibration-plan.md](calibration-plan.md) (the last plan). Briefs: [calibration-briefs.md](calibration-briefs.md), [calibration-followup-briefs.md](calibration-followup-briefs.md), [build-program-briefs.md](build-program-briefs.md). Results and decisions: [calibration-results.md](calibration-results.md). Log: [build-program-log.md](build-program-log.md) (not read on resume; `git log --grep '<ID>'`). Older Owed lists, checklists and rough edges: [build-program-status-archive.md](build-program-status-archive.md) (not read on resume).

**State:** 2026-11-21, session closed. Nothing running. Every plan is built; calibration (CAL-0..5, F1..F4, P) is merged except the items under Next. **Next window: routine, then a design window.**

**Session rules (player):**
- Pace by the 5h limit; ignore the weekly limit unless > 97 %. The player resumes manually in a fresh session at each reset (CET = UTC+1); schedule a wake-up only when it opens a new session.
- A routine window starts a due design window itself as a subagent, without asking; player questions go to Open questions with a default held.
- Models: the skill's hybrid table (an Opus-high design window per wave for briefs and diagnosis; packs on Sonnet high or Codex Sol; long measurement on Codex, edit-heavy work on Claude).
- `pnpm check:fast` per merge batch; sims and full-loop checks only when a plan closes; calibration decisions are delegated to the build team (2026-11-20): choose the best-supported option, record the tradeoff and the miss; **player gates never block**.

## Next

0. Read CI on the last push (sims run only there). A red run is a fix pack first.
1. **Household sweep, sharded** (CAL-5 stopped after about 3 h in one process): one `HOUSEHOLD_SWEEP=1 HOUSEHOLD_SEEDS=10` run per district (`-t`), each in the background with its own log and a 30-minute cap, or as a CI nightly job. It is a safety/placement gate; its win rates are not targets.
2. **Design window** (Opus high, docs only): kit and frame briefs for the structural findings in [drawn-calibration.md](drawn-calibration.md): drawn hearts light 78 / medium 66 / heavy 78 % vs 60-75 / 45-60 / 30-45; 99 of 534 offered boards invalid on piece reach (one reach rule for kits and generator); walkovers 14.2 % vs 10; the fourth peal note displaced on length-6 trips (duplicate-note rule); weight-linked heart HP. Then CAL-5 task 3 remeasures (Codex, sharded).
3. **CAL-G1** (design window): the final tables from calibration-results.md and the verification files.
4. Needs the player's phone: real-iPhone timing (CAL-P owes it; emulated 108-111 ms median, 505-526 ms p95) and the BL-111 offline check (real Chrome: `pnpm build && pnpm preview`, SW installed, offline: home, a Seam trip, the Lab).
5. Open calibration misses (numbers in calibration-results.md): canals room 4 wins 100 % (target 65-80; the CAL-F2 candidate was rejected, worn mooring 42.6 %); foundry four bells 93 % (3 pp over 90); foundry loft 73 % but stall-shaped; Registrar solo +11 / duo +8 pp (move 1 kept); authored Chief crumbling 67.5 % (7.5 pp short, sound 80 %); quarter heart stalls 11 %; bridges worn pairs clear 0/40.

## Running or partial
none. (Reading usage: `node .claude/skills/implement/usage.mjs`. Codex: board `spawn_subagent` with `git: true`; the worker's patch comes back as `/tmp/<pack>.mbox`.)

## Needs design review
none.

## Owed (declared by a contract, not yet built)
Items still open from the earlier lists (full wording in the archive): `battle.svelte.ts:129` passes no footnotes to `rivalSheet`; a drawn bell stamp may lay fewer than 2-4 bells on a cramped board; `ShapeKit.stamp?` hook so lock stamps join the bot trials; `inkedPage.roomSetup` activating heart-frame rules; the doorway weight constant in loot.ts belongs in `DRAWN_LOOT`; Cleared.svelte's "The heart of the inked page is quiet" copy; the Registrar note's later-fight effect is unmeasured; the generator page logs one unexamined 404. A design window runs the ledger and prunes this list.

## Close checklist
Cartographers, Foundry, Ending: done (CI deployed after each push; ending's player gates EN-G1/EN-G3 open and non-blocking). Calibration closes with CAL-G1: full gate, one `code-review` of the plan's diff, DESIGN §11 / TECH §7 rows for the calibrated numbers, ledger (`node .claude/skills/implement/ledger.mjs docs/plans/build-program-log.md docs/plans/calibration-plan.md`), push and CI.

## Open questions for the player (defaults held)
- calibration-followup-briefs.md top: do 40-round stalls count as heart misses (default yes); may hung bells act directly on the Carillonneur (default no); may the Lamplighter's kit get stronger (default no).
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
