# Build program status (resume here)

Plans: [build-program.md](build-program.md), order in [ROADMAP §2](../ROADMAP.md). History (every task's report, usage log, accepted proposals, decisions) is in [build-program-log.md](build-program-log.md): **do not read it on resume**, grep it for a task ID when you need details. Keep this file short: when a task merges, add one row to the log's tables, not here.

**State:** building in the 2026-11-05 window 4 (started 16:10Z; 82% at 16:57Z; reset 20:30Z; one-shot wake-up set for 20:33Z, the chain's first of two). Merged this window: IQ-22 (postmaster, 8 scenarios), IQ-23, CN-F2 (canals.md draft), BH-F2 (bathhouses.md draft), BH-2, BH-3, BH-5, FN-C2, FN-C3, FN-C4, FN-C5. Running: BH-4 (dissolved bather, Opus). Log rows are in build-program-log.md. Burn ~1%/min with 4 agents.
**Player rule (2026-11-04):** play-through sims and full-loop checks only when a wave or plan finishes (`pnpm check:fast` per commit/merge, full `pnpm check` at milestones and in CI); no balance tuning mid-build (keep design numbers; SM-6 and other calibration wait for the end); the player tests mostly at the end, so **gates never block**: build past IQ-G1, RV-G1, FN-G1, CN-G1, SM G1–G3 on the defaults and the open-question defaults below.
**Pacing rules (player):** pace by the 5h limit; ignore the weekly limit unless > 97%. Near the window's end schedule a wake-up for the reset (CronCreate one-shot, session-only), at most 2 per session chain (chain 2026-10-30 ended by the player; a new session starts a new chain). In the window after a wake-up wrap up at > 70%: status, commit, push, continuation prompt.

## Remaining tasks (computed 2026-10-29 from the plans minus the log; everything else in FD, DK, HC, AH, RC is merged)
- RV-8 (rival sheet), RV-9 (Lab scenarios), RV-11…RV-14 (authoring API, after **RV-G1**), RV-G1.
- FN-12, FN-A2 (check the log row "FN-A1/A2"), FN-C1…C9, FN-P1, **FN-G1**.
- CN-7, CN-9, CN-14, CN-F1…F5, CN-P1, **CN-G1**. SM-1…SM-15. IQ, BH, BR, BF, CG, EN not started.
- Verify against the plan before spawning: `grep -n 'ID' build-program-log.md`.

## Next
1. Ready picks: **BH-4** (running; then BH-6/BH-7 rooms, BH-8 heart, BH-9+), **FN-C6, FN-C7** (capstones; FN-C7 needs carry, scald, magnet, net, Spark capstone), **FN-C8/C9** (FN-C8 needs FN-G1 (approved) and FN-10), **CN-F3/F4/F5** (canal footnote builds from `footnotes-content/canals.md`: jar carrier, dusk count, `openJar` heading override, reseal flag, extra Wick wait; Afterglow has no rows), **BH-F3/F4** (build bathhouses.md; B1–B4 decided), then BR, BF in ROADMAP §2 order. CN-14/CN-P1 and SM-15 remain (check plans).
2. Small follow-ups: RV-14 gaps (no runtime rival registration, a trick can't add an arrival cause, `LockLost` lacks met/spent; IQ-22 types `DistrictModule.goals`); `floorListedRules()` returns `[]` (delete or redefine; two tests pin it); BH-1: `meter` preview `forecast?`/`danger?` (DK-13), `BoilOverState.line` numeric for BH-9; widen `KitHearCondition`; route `KitId` hearing through `KIT.hearKinds`; IQ-15 highlight registry (overlay.ts imports `inkHighlights` and `ui/districts/seam/hands`); ink dark-mode pass; `lines.test.ts`/`projection.test.ts` (~35 s); autofixer not run on SM-11's edited Map/Cleared/SetOutSheet; CN-9's landing card and codex Papers tab not phone-checked. New: IQ-22 Levy shield for enemy-cast Levy does nothing (`runes/actions.ts:452`, `turn.ts:177`: give enemy-cast Levy one more round); add a postmaster heart row to `INK_CAL`; P7 vent puffs even if a state lies on it (`turn.ts::vents`); wire footnotes into the UI's aim legality (`touch-unit-reach`, FN-4 UI); `splash-unit-press` text vs engine; Conduct respecting `brass-plate-ground`; BH-5 planning uses no footnotes.
3. Gates (non-blocking; the player tests at the end): IQ-G1, RV-G1, CN-G1 (texts approved by the orchestrator), CN-P1, SM G1–G3, BH-G1, HC/AH/RC playtests. Calibration (SM-6 branch `worktree-agent-a7d9ce60e430bee68`, IQ-20 levers, IQ-23: give the postmaster a move or a non-Bolt opener) waits for the end.
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
- SM-12/14: the trip-page "The margin answered" card is still not phone-checked (answers are in data now; reach it with a Seam-heart profile and a proven cluster, then one fight). SM-2: the StepLayer pill covers the Marginalia's 16/16 HP on its tile; `app/overlay.ts` imports `handHighlights` from `ui/districts/seam` (no district-highlight registry; IQ-15 follow-up). CN-F1: Afterglow has no lines yet (needs new events), so CN-F2/F4's Afterglow margins have no rows.
- `tests/data/canal-rooms.test.ts` CN-13 (30 s) can time out in a full `pnpm check` even with no agents running; passes alone. Raise its timeout or trim seeds. SM-1 made `engine/districts/seam.ts` import damage/mix (→ kit): any test that mocks `$engine/districts/kit` must not import the real Seam module in its factory (deadlock; see tests/run/kit.test.ts).
- `tests/sim/calibration.test.ts` (15 s) times out while agents run `pnpm check` in parallel; passes alone in ~10 s. Rerun alone before treating it as a failure. Give each UI agent its own port (5190–5193).
- FD-6: cap sweep lacks push-onto-jar and a mixing chain (`reserve` in mix.ts untested); `eventCap` not passed from `battle.ts`. RV-3: exact wick fail reasons need jar ids on `jarOpened`/`jarCrumbles`. FD-3: Graphite restore with no free tile leaves the unit overlapping.
- HC-4: greedy bot stalls on some drawn start points; CN/SM should restore the strict turn-1 bite test. HC-5: threshold seed constant per party. `MEMBER_IDS` still used by UI, Lab, profiler, scenarios.
- RC-4: recruit save cards accept any registry apprentice (tighten to the seven). Canal golden wins record with `DEEP` (startHp 20) since the CN-13 tuning merged; check the trio margin (97%) in the CN playtest.

## Continuation prompt (new session)

```
/implement Resume the build program from docs/plans/build-program-status.md (do not read build-program-log.md; grep it for task IDs). Check usage and record the baseline. Player rule (2026-11-04): `pnpm check:fast` per commit and merge, full `pnpm check` only when a wave or plan finishes; no balance tuning mid-build; gates never block (the player tests at the end). First finish IQ-22 on its branch (missing scenario tests), then file-disjoint picks from Next item 1, 2–4 agents: BH-2…BH-5 (one engine file: sequence them), BH-F2, FN-C2…C8, CN-F2, IQ-23; fold small follow-ups from Next item 2 into related tasks. UI agents start Vite from their own worktree with Bash on 5191–5193. Tell agents to send their final report once, then stop. Pace by the 5h limit (burn ~1%/min with 4 agents; check usage after every merge). Session rule: near the window's end schedule a wake-up for the reset, at most 2 per session chain; wrap up at >70% in a window after a wake-up. When a task merges, append its row to build-program-log.md and keep the status file short.
```
