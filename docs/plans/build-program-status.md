# Build program status (resume here)

Plans: boundary map [build-program.md](build-program.md); order [midpoint-audit.md](midpoint-audit.md) §2.2; remaining work in pack form: [platform-closure-plan.md](platform-closure-plan.md), [foundry-plan.md](foundry-plan.md), [ending-plan.md](ending-plan.md), [cartographers-plan.md](cartographers-plan.md), [calibration-plan.md](calibration-plan.md) (last). Briefs: [build-program-briefs.md](build-program-briefs.md). Log: [build-program-log.md](build-program-log.md) (not read on resume; `git log --grep '<ID>'` has each task's details; work before 2026-11-11 is in the archive log, grep only).

**State:** consolidated for the new `implement` skill 2026-11-11; nothing running · **next window:** routine
**Session rules (player):**
- Pace by the 5h limit; ignore the weekly limit unless > 97 %. Schedule a wake-up at each reset (CronCreate one-shot, session-only; local time CET = UTC+1) until the player says a window is the last one or weekly usage passes 85 %.
- Models: the skill's table (Fast for content, Default for most, Strong only by role or escalation).
- 2026-11-04: `pnpm check:fast` per merge batch; sims and full-loop checks only when a wave or plan closes; no balance tuning during the build (everything goes to CAL); the player tests at the end, so **player gates never block** (build on the defaults below). Only EN-G2 (handover text) waits for the player.
**Reset:** none recorded; resume: manual, with the continuation prompt below

## Next
1. **GATE-1 alone** (brief written). Every later pack pays for the gate.
2. Then two or three at a time, briefs written, file-disjoint: **Pack A** foundry ring engine (BF-3 → BF-4 → BF-5) · **Pack B** bridges completion (BR-20 → BR-7 leftovers) · **Pack C1** ink footnote audit and draft (IQ-F1 → IQ-F2, then IQ-FG review) · **Pack D** one bot (EN-0) · **Pack E** board UI registries (KIT-R2).
3. A design window is due when A–E are merged or the review list has three entries. It writes the briefs listed at the end of the briefs file (KIT-R1, IQ-F3–F5, BR-19a/b, EN-W0, KIT-R3 → EN-S1 → EN-G0, the next foundry packs, SAVE-1), reviews IQ-FG, drafts EN-12, and runs the ledger.
4. Hard edges: BR-20 → KIT-R1 · KIT-R2 → any new board UI (BF-17, BF-18, CG-12, EN-7) · EN-0 → EN-W0 → KIT-R3 → EN-S1 → EN-G0 · EN-0 → MIX-1 → EN-2 · KIT-R4 → EN-9 · BL-111 → EN-4 · BR-20 and BF-9 → CG-14 · cartographers start when BF-12 merges or a slot is free.

## Running or partial
| Pack | Tasks | Model | Branch @ commit | State |
|---|---|---|---|---|

## Needs design review (left unmerged by a routine window)
- none

## Owed (declared by a contract, not yet built)
- `eventCap` passed from `battle.ts` (FD-6) — owed by BF-3; needed by BF-4.
- `DistrictModule.heart` and `.bot` for Seam, canals, ink quarter, bathhouses, bridges; `trip` shape for Seam and canals — owed by KIT-R3; needed by EN-S1, EN-K1–K5. The foundry and cartographers register theirs in their own plans (BF-12, CG-10).
- `rightOfWay` stand-in removed, including its import in `inkQuarter/wax.ts` — owed by BR-20; needed by KIT-R1.
- Ink quarter footnote batch (no draft, no data file) — owed by IQ-F1–F5.
- Close-out for FD, DK, RV, FN, SM, IQ (DESIGN §11 / TECH §7 rows, verification files incl. SM-15, a code review per subsystem; none was ever run) — owed by CL-1…5 (platform-closure Pack N).
- Each plan's own "Leaves for later tasks" list (§4 of the foundry, ending, cartographers and closure plans) — copy the matching items into each brief.

## Close checklist (per plan; the program's own close is platform-closure Pack N, then CAL)
- [ ] full gate on main · [ ] full-loop phone check · [ ] code review · [ ] DESIGN §11 / TECH §7 · [ ] plan State + roadmap row · [ ] ledger clean · [ ] CI deployed

Ledger: `node .claude/skills/implement/ledger.mjs docs/plans/build-program-log.md docs/plans/{platform-closure,calibration,foundry,cartographers,ending,bridges,ink-quarter,seam-grows}-plan.md`

Ledger caveats: it counts GATE-1 and BF-3 to BF-9 as merged because two consolidation commits of 2026-11-11 name them in their messages; they are **open**. IQ-13 shows open but is built (archive log, prose only). The foundry's acceptance tests (`tests/districts/foundry/*.acceptance.test.ts`, 36 `it.fails`, 27 `it.todo`) are the Done-when for BF-3 to BF-9; proposals P16 and P17 in the foundry plan came with them and want a look in the next design window.

## Open questions for the player (defaults held; ask in the next design round)
- **IQ-20 / IQ-G1:** the bot never loses an ink-quarter room with a fresh pair. Default: playtest first; levers are in the calibration plan.
- **CN-2:** shoving a moored crate crushes it; a crate pushed across the mooring without stopping does not moor. Default: as built.
- **RV-20b:** the rival planner never walks onto a step-jar, so the "Jar" note has no visible effect. (a) planner ignores jars when the note is written, (b) a different effect.
- **RV-5 / RV-10:** should the planner account for allies when the wick lands? Default no.
- **FN-A1:** M1 Margin capstone reuses FN-11's diagonal reach; M2 add `steam:unit`/`brass:unit` lines first?; M5 `oil-slick-short`/`shove-wall-soft` read as costs, keep?
- **FN-1A A3:** Cinder vs a rat's oil trail over a hot tile. Default: fix the text to match the engine.
- **FN-4:** Desk rows still need ≥ 1 point. Default keep. **DK-8:** friendly fire counts for hearing. Default keep.
- **CAL:** bridges and the foundry have no stated win-rate band. Default: the canals' band.
- Player gates open (non-blocking): IQ-G1, RV-G1, CN-P1, SM G1–G3, BH-G1, BR-G2, HC/AH/RC playtests.

## Rough edges (risks; the code follow-ups are FU-1…20 in the closure plan)
- 15 old agent worktrees (about 3.5 GB) are squash-merged sources and safe to remove; a bulk remove needs the player's OK. `worktree-agent-a7d9ce60e430bee68` is SM-6 (unmerged calibration, commit `4c77215`): its numbers are in the calibration plan, tag it `ref/sm-6` before removing.
- Main is not fully green until GATE-1: `tests/sim/canals.test.ts:39` (CN-13) can time out at 30 s run alone; `tests/sim/calibration.test.ts` times out while agents run checks in parallel (Pack D fixes it). CI cancels a run when the next push arrives: push once per merge batch.
- A test that mocks `$engine/districts/kit` must not import the real Seam module in its factory (deadlock; see `tests/run/kit.test.ts`).
- UI agents: one port each (5191–5193). SM-12/14's "The margin answered" card and BH-12's meter overlap are still not phone-checked (FU tasks).
- `vents` in `turn.ts` skips tiles with a state, the opposite of bathhouses P7 (FU task; not a calibration item).

## Continuation prompt (new session)

```
/implement Resume the build program from docs/plans/build-program-status.md.
```
