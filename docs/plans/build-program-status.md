# Build program status (resume here)

Plans: [build-program.md](build-program.md), order in [ROADMAP §2](../ROADMAP.md). History (every task's report, usage log, accepted proposals, decisions) is in [build-program-log.md](build-program-log.md): **do not read it on resume**, grep it for a task ID when you need details. Keep this file short: when a task merges, add one row to the log's tables, not here.

**State:** building, window 2 of 2026-10-30 (after wake-up 1; **one wake-up left**; wrap up at > 70%). Running: **SM-1** Marginalia engine (Opus). Merged this window: IQ-18 + D5, RV-8, RV-9 (+ two projection-drift fixes: fire drift joins any float; new `trickUsed` event). Baseline 11:24Z: 5h 0%, weekly 54%. Previous window: 17 IQ tasks + DK-10 merged, quarter playable and live, peak 87%.
**Pacing rules (player):** pace by the 5h limit; ignore the weekly limit unless > 97%. Near the window's end schedule a wake-up for the reset (CronCreate one-shot, session-only), at most 2 per session chain (chain 2026-10-30: 1 used). In the window after a wake-up wrap up at > 70%: status, commit, push, continuation prompt.

## Remaining tasks (computed 2026-10-29 from the plans minus the log; everything else in FD, DK, HC, AH, RC is merged)
- RV-8 (rival sheet), RV-9 (Lab scenarios), RV-11…RV-14 (authoring API, after **RV-G1**), RV-G1.
- FN-12, FN-A2 (check the log row "FN-A1/A2"), FN-C1…C9, FN-P1, **FN-G1**.
- CN-7, CN-9, CN-14, CN-F1…F5, CN-P1, **CN-G1**. SM-1…SM-15. IQ, BH, BR, BF, CG, EN not started.
- Verify against the plan before spawning: `grep -n 'ID' build-program-log.md`.

## Next
1. Ready, file-disjoint picks from the remaining list: RV-8, RV-9, FN-12, FN-C batches, SM Wave 1 (SM-1 ready: SM-0, DK-9, FD-7 merged; SM-8 now unblocked by DK-10 once SM-7 lands), CN-14/CN-F*; district plans from the DK-18 template in ROADMAP §2 order.
2. Small follow-ups left: widen `KitHearCondition` with the module-kind shape; route `KitId` hearing through `KIT.hearKinds`; BL-132 phone captures (needs a path); UI agents start Vite from their own worktree with Bash on 5191–5193 (`dev-alt*` serves the main checkout).
2b. **Ink quarter (IQ):** playable since 2026-10-30 (gate flip). Merged IQ-W0…IQ-17, IQ-19, IQ-20, DK-IQ, DK-D9, DK-10 (grep the log). Left: **IQ-18 + D5** (generic district banner slot in BattleView; move TermBanner and ClockCount there), IQ-21 verification sweep, then **IQ-G1** playtest; IQ-F1…F5 footnotes; IQ-22/23 after RV-G1. Follow-ups: IQ-15's highlight registry (overlay.ts imports `inkHighlights` directly) and a `preview` on `WRITS_RULE`; a clock-serving Lab fixture; map tiers instead of `MAP_PAGE_HEIGHT`.
3. Blocked on the player (gates): **FN-G1** footnote review rounds (`docs/design/footnotes-content/seam.md`, nine batches, §0; questions §6); **RV-G1** Lamplighter Lab playtest (gates CN-7 and RV-11+); **CN-G1** ledger texts (gates CN-9); HC, AH, RC playtests (see each plan's verification doc).

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
- `tests/sim/calibration.test.ts` (15 s) times out while agents run `pnpm check` in parallel; passes alone in ~10 s. Rerun alone before treating it as a failure. Give each UI agent its own port (5190–5193).
- FD-6: cap sweep lacks push-onto-jar and a mixing chain (`reserve` in mix.ts untested); `eventCap` not passed from `battle.ts`. RV-3: exact wick fail reasons need jar ids on `jarOpened`/`jarCrumbles`. FD-3: Graphite restore with no free tile leaves the unit overlapping.
- HC-4: greedy bot stalls on some drawn start points; CN/SM should restore the strict turn-1 bite test. HC-5: threshold seed constant per party. `MEMBER_IDS` still used by UI, Lab, profiler, scenarios.
- RC-4: recruit save cards accept any registry apprentice (tighten to the seven). Canal golden wins record with `DEEP` (startHp 20) since the CN-13 tuning merged; check the trio margin (97%) in the CN playtest.

## Continuation prompt (new session)

```
/implement Resume the build program from docs/plans/build-program-status.md (do not read build-program-log.md; grep it for task IDs). Check usage and record the baseline. Continue the ink-makers' quarter (Next item 2b): IQ-4 stakes, IQ-6 clock and the rooms IQ-9/IQ-10, file-disjoint, 2–3 agents, merging each as it reports (IQ tasks all add hunks to src/engine/districts/inkQuarter.ts: resolve on merge). Fill gaps with the small follow-ups in Next item 2. Pace by the 5h limit (burn ~1.3%/min with 2–3 agents, can spike; check usage after every merge; agents run `pnpm check` in their own worktree, slow sims can time out under load). Session rule: when the window nears its end, schedule a wake-up for the reset, at most 2 times; the third time, finish without a timer and write a continuation prompt. When a task merges, append its row to build-program-log.md and keep the status file short.
```
