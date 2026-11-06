# Build program status (resume here)

Plans: [build-program.md](build-program.md), order in [ROADMAP §2](../ROADMAP.md). History (every task's report, usage log, accepted proposals, decisions) is in [build-program-log.md](build-program-log.md): **do not read it on resume**, grep it for a task ID when you need details. Keep this file short: when a task merges, add one row to the log's tables, not here.

**State:** building, window 7 (2026-11-06, started ~11:12Z at 0%; weekly 68%). Window 6 merged CN-F5, CN-14 (canals plan built), BH-12…BH-17b (Steward live), BR-0…BR-4, BR-12 and small fixes (rows in the log). Worktrees: 12 locked old ones are safe to remove (the classifier blocked a bulk remove; ask the player); `worktree-agent-a7d9ce60e430bee68` = SM-6 (unmerged calibration).
**Player rule (2026-11-04):** play-through sims and full-loop checks only when a wave or plan finishes (`pnpm check:fast` per commit/merge, full `pnpm check` at milestones and in CI); no balance tuning mid-build (keep design numbers; SM-6 and other calibration wait for the end); the player tests mostly at the end, so **gates never block**: build past IQ-G1, RV-G1, FN-G1, CN-G1, SM G1–G3 on the defaults and the open-question defaults below.
**Pacing rules (player):** pace by the 5h limit; ignore the weekly limit unless > 97%. Near the window's end schedule a wake-up for the reset (CronCreate one-shot, session-only), **session 2026-11-06: keep scheduling one per window** until the player says a window is the last one or weekly usage passes 85%. Subagents: weaker models than usual (Haiku for content, Sonnet for UI/engine; Opus only for exceptionally complex tasks).

## Remaining (by ID; verify with `grep -n 'ID' build-program-log.md`)
- Bathhouses: built and open; BH-G1 (player); follow-ups: wire the vent floor (`IntrusionSpec.terrain`), calibration, per-threshold "Try the lock" label, bath-dome solved art, footnote margins phone check. Bridges: BR-5…BR-11, BR-13…BR-21, BR-G1.
- Footnotes: SM-15; RV-8/9/11…13, RV-G1; CN-P1, CN-G1 (player). BF, CG, EN not started.

## Next
1. Window 7: BR-7, BR-8, BR-5 merged; stoke planner fix merged; BR-6, BH-18 merged (bathhouses open and live; plan built). Hold/intent fixes, BR-9 merged. BR-14 merged; BH-18 deployed (CI 26b553e). BR-10 merged. BR-13 merged. Running: BR-15 (crossroads copy, incl. bindEvent card), BR-11 (heart), BR-17 (footnotes audit). Next BR-16 (after BR-15); rooms + `BRIDGE_RECRUIT_KIT` still need wiring into `BRIDGES_KIT` (no plan task names it: do it at plan end), BF in ROADMAP §2 order. Also: `thresholdStart` rules.
2. Small follow-ups: BR-7: `BridgeTripState.spans` never written (drop it or add a DK `onChoice` hook), `CrossroadsChoice` lacks `note?` for ledger lines; canal fuzz at party 1–3 with crate and rival in `tests/sim`; RV-14 gaps (no runtime rival registration, a trick can't add an arrival cause, `LockLost` lacks met/spent; IQ-22 types `DistrictModule.goals`); BH-1: `BoilOverState.line` numeric for BH-9; widen `KitHearCondition`; route `KitId` hearing through `KIT.hearKinds`; IQ-15 highlight registry (overlay.ts imports `inkHighlights` and `ui/districts/seam/hands`); ink dark-mode pass; `lines.test.ts`/`projection.test.ts` (~35 s); autofixer not run on SM-11's edited Map/Cleared/SetOutSheet; New: add a postmaster heart row to `INK_CAL`; P7 vent puffs even if a state lies on it (`turn.ts::vents`); `splash-unit-press` text vs engine; Conduct respecting `brass-plate-ground`; BH-5 planning uses no footnotes.
3. Gates (non-blocking; the player tests at the end): IQ-G1, RV-G1, CN-G1 (texts approved by the orchestrator), CN-P1, SM G1–G3, BH-G1, HC/AH/RC playtests. Calibration (BH-16 tables: heart boils on round 2, 100% wins; SM-6 branch `worktree-agent-a7d9ce60e430bee68`, IQ-20 levers, IQ-23: give the postmaster a move or a non-Bolt opener) waits for the end.
4. At the end of a plan: full `pnpm check`, one full-loop phone check, code review, DESIGN §11 / TECH §7 / ROADMAP updates (SM, RV, CN, IQ all owe them; RV-14 already wrote TECH §3 "Authoring a rival").

## Open questions for the player (ask in the next design round; defaults held)
- **IQ-20 / IQ-G1:** the bot never loses an ink-quarter room with a fresh pair (staff deal 1–2, the clock seal (3 HP) is always broken in time; real trips fail only from charge attrition, heart cleared 3%). Default: playtest first; candidate levers: a real damage source on the postmaster/Sealer, `CLOCK_TUNING.collect` up, a sturdier or out-of-reach clock seal.
- **CN-2:** shoving a moored crate crushes it (anchored = wall); a crate pushed across the mooring without stopping does not moor. Default: as built.
- **RV-20b / RV-G1:** the rival planner never walks onto a step-jar, so the "Jar" note has no visible effect yet. (a) planner ignores jars when the note is written, (b) a different effect.
- **RV-5 / RV-10 (RV-G1):** the wick deals ~4 damage and is planned right after the lantern lands; should the planner account for allies? Default no.
- **FN-A1 (FN-G1):** M1 Margin capstone a reuses FN-11's diagonal reach; M2 add `steam:unit`/`brass:unit` lines first?; M5 `oil-slick-short`/`shove-wall-soft` read as costs, keep?
- **FN-1A A3:** Cinder vs a rat's oil trail over a hot tile; default: fix the text to match the engine.
- **FN-4:** Desk rows still need ≥1 point (zero-point subject with margins stays hidden). Default keep.
- **DK-8:** should friendly fire (apprentices reached) count for hearing (`burstUnits`/`conducted`)? Default keep (it counts).

## Rough edges (risks worth remembering)
- BH-12: the meter row overlaps board row 9 (P4's top-edge strip not built).
- SM-12/14: the trip-page "The margin answered" card is still not phone-checked (answers are in data now; reach it with a Seam-heart profile and a proven cluster, then one fight). SM-2: the StepLayer pill covers the Marginalia's 16/16 HP on its tile; `app/overlay.ts` imports `handHighlights` from `ui/districts/seam` (no district-highlight registry; IQ-15 follow-up). CN-F1: Afterglow has no lines yet (needs new events), so CN-F2/F4's Afterglow margins have no rows.
- `tests/data/canal-rooms.test.ts` CN-13 (30 s) can time out in a full `pnpm check` even with no agents running; passes alone. Raise its timeout or trim seeds. SM-1 made `engine/districts/seam.ts` import damage/mix (→ kit): any test that mocks `$engine/districts/kit` must not import the real Seam module in its factory (deadlock; see tests/run/kit.test.ts).
- `tests/sim/calibration.test.ts` (15 s) times out while agents run `pnpm check` in parallel; passes alone in ~10 s. Rerun alone before treating it as a failure. Give each UI agent its own port (5190–5193).
- FD-6: cap sweep lacks push-onto-jar and a mixing chain (`reserve` in mix.ts untested); `eventCap` not passed from `battle.ts`. RV-3: exact wick fail reasons need jar ids on `jarOpened`/`jarCrumbles`. FD-3: Graphite restore with no free tile leaves the unit overlapping.
- HC-4: greedy bot stalls on some drawn start points; CN/SM should restore the strict turn-1 bite test. HC-5: threshold seed constant per party. `MEMBER_IDS` still used by UI, Lab, profiler, scenarios.
- RC-4: recruit save cards accept any registry apprentice (tighten to the seven). Canal golden wins record with `DEEP` (startHp 20) since the CN-13 tuning merged; check the trio margin (97%) in the CN playtest.

## Continuation prompt (new session)

```
/implement Resume the build program from docs/plans/build-program-status.md (do not read build-program-log.md; grep it for task IDs). Rules: `pnpm check:fast` per commit and merge, full `pnpm check` only when a wave or plan finishes; no balance tuning mid-build; gates never block. Weaker models for subagents (Haiku for content/small fixes, Sonnet for UI/engine; Opus only for exceptionally complex tasks). Tell agents to send their final report once, then stop (repeats are duplicates). Pick from Next item 1, 2–4 agents, file-disjoint; UI agents run `pnpm dev --port 519x --strictPort` from their own worktree (the dev-alt previews serve the main checkout). Burn ~0.5%/min with 2–3 agents. Keep the status file short; append each merged task's row to build-program-log.md. Session rule: near the window's end schedule a wake-up for the reset (CronCreate one-shot; local time is CET = UTC+1), every window, until the player says a window is the last one or weekly usage passes 85%.
```
