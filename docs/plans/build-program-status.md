# Build program status (resume here)

Plans: [build-program.md](build-program.md), order in [ROADMAP §2](../ROADMAP.md). History (every task's report, usage log, accepted proposals, decisions) is in [build-program-log.md](build-program-log.md): **do not read it on resume**, grep it for a task ID when you need details. Keep this file short: when a task merges, add one row to the log's tables, not here.

**State:** building, last round of the window (resets 2026-10-30 01:40 UTC; 5h 70% at 00:46 local). Merged this window: CN-13 tuning (player's pick a), IQ-W0, FU-A, FU-B, IQ-3, IQ-1, DK-IQ, DK-D9, IQ-2, IQ-5a. Running: **IQ-5b** (Medium; Sealer + seal), **IQ-8** (Medium; district data, gate stays drawing). Burn ~1.3%/min with 2–3 agents. Wake-ups: both used; finish this window without a timer.
**Pacing rules (player):** pace by the 5h limit; ignore the weekly limit unless > 97%. Near the window's end schedule a wake-up for the reset (CronCreate one-shot, session-only), at most 2 per session chain (both used: this next window is the last, finish without a timer). In the window after a wake-up wrap up at > 70%: status, commit, push, continuation prompt.

## Remaining tasks (computed 2026-10-29 from the plans minus the log; everything else in FD, DK, HC, AH, RC is merged)
- DK-10 (lower-Seam intrusion). RV-8 (rival sheet), RV-9 (Lab scenarios), RV-11…RV-14 (authoring API, after **RV-G1**), RV-G1.
- FN-12, FN-A2 (check the log row "FN-A1/A2"), FN-C1…C9, FN-P1, **FN-G1**.
- CN-7, CN-9, CN-14, CN-F1…F5, CN-P1, **CN-G1**. SM-1…SM-15. IQ, BH, BR, BF, CG, EN not started.
- Verify against the plan before spawning: `grep -n 'ID' build-program-log.md`.

## Next
1. Ready, file-disjoint picks from the remaining list: DK-10, RV-8, RV-9, FN-12, FN-C batches, SM Wave 1 (SM-1…), CN-14/CN-F*; district plans from the DK-18 template in ROADMAP §2 order.
2. Small follow-ups left: widen `KitHearCondition` with the module-kind shape; route `KitId` hearing through `KIT.hearKinds`; BL-132 phone captures (needs a path); `dev-alt` (5190) serves the main checkout, not the agent's worktree: give UI agents a worktree-rooted launch entry.
2b. **Ink quarter (IQ) building:** merged IQ-W0, IQ-1, IQ-2, IQ-3, IQ-5a, DK-IQ (kit D1–D3, D7, D8), DK-D9 (`lootAfterRoom`). Ready next (check deps in the plan): **IQ-4** stakes (needs IQ-3 ✓, D9 ✓), **IQ-5b** the Sealer (token `z`), **IQ-8** district data (IQ-3 ✓), then IQ-6 clock (after IQ-5b; exclude cause `return` on the clock stamp; extend the late-slot list in `tests/engine/rules.test.ts`). Kit still owed: a `push` call point for `guardHarm` (BH, IQ); D5 HUD banner; D6 show `homeNote`. IQ-6 must exclude cause `return` on the clock stamp.
3. Blocked on the player (gates): **FN-G1** footnote review rounds (`docs/design/footnotes-content/seam.md`, nine batches, §0; questions §6); **RV-G1** Lamplighter Lab playtest (gates CN-7 and RV-11+); **CN-G1** ledger texts (gates CN-9); HC, AH, RC playtests (see each plan's verification doc).

## Open questions for the player (ask in the next design round; defaults held)
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
/implement Resume the build program from docs/plans/build-program-status.md (do not read build-program-log.md). Check usage and record the baseline. First ask the player the CN-13 heart-tuning question in "Open questions" (design-round; default: leave data unchanged until the CN playtest). Then start the next ready work in Next item 2: the first district plan from the DK-18 template (ROADMAP §2 order; read build-program.md for which), plus the small follow-ups in Next item 3, file-disjoint, merging each as it reports. Pace by the 5h limit (real burn ~1%/min with 2–3 Strong agents; check usage after every merge; agents log `pnpm check` inside their own worktree). Session rule: both wake-ups are used, so finish the window without a timer and write a continuation prompt. When a task merges, append its row to build-program-log.md and keep the status file short.
```
