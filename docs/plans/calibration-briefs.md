# Calibration: briefs for CAL-0–CAL-5

Order

| Window | Packs that may run together (disjoint Owns) | Suggested runner / model / effort | Starts when |
|---|---|---|---|
| Preparation 1 | **CAL-0** harness and SM-6 review, first | Codex / Strong: Sol 6.1 / medium | **Now**: EN-0 is merged; inspect `ref/sm-6` read-only. No content calibration yet. |
| Preparation 2 | **CAL-N** core literals · **CAL-D** drawn-loot literals | Codex / Default: Terra 6.1 / high, each | **Startable now after CAL-0**, independently of EN-14 and the remaining kit packs; serialize with any other worker owning these files. |
| Preparation 3 | **CAL-B** bot readiness and foundry scoring literals | Codex / Default: Terra 6.1 / high | **Startable now after CAL-0**; may overlap CAL-N/CAL-D within the two-worker limit. Existing R6 fixes must be merged (they are at this snapshot). |
| Measurement 1 | **CAL-1** Seam/canals · **CAL-2** quarter | Codex / Default: Terra 6.1 / high, each | **EN-14 and all kit packs merged**, CAL-0/N/D/B merged; baseline bot and data revision frozen. |
| Measurement 2 | **CAL-3** baths/bridges · **CAL-4** foundry/academy | Codex / Default: Terra 6.1 / high, each | Same content/preparation boundary; normally after Measurement 1 to reuse its canal comparison table. Can start earlier with the frozen CAL-0 canal baseline, explicitly labelled. |
| Measurement 3 | **CAL-5** drawn trips, pen and household sweep | Codex / Default: Terra 6.1 / high | CAL-1–4 measurement reports integrated, kit completeness green; repeat after any approved authored-data changes. |
| Device | **CAL-P** CAL-5 phone evidence (**Claude only**) | Claude / Default: Sonnet 5.5 / medium | CAL-5's input corpus and current candidate are frozen. Can overlap a district approval continuation only if it cannot change the measured drawing/heart or its dependencies. |
| Approval continuations | Resume **CAL-1 + CAL-2**, then **CAL-3 + CAL-4**, then **CAL-5**, for their third task | Same runner/model as the originating pack | Only the corresponding rows of `calibration-results.md` have explicit player approval, or an explicit decision to retain current values. CAL-1's conditional SM-6 exception is described below. |
| Close | **CAL-G1** final tables, full gate and handoff (**Claude only**, orchestrator) | Claude / design orchestrator: strongest available / high | Every measurement delivered; every proposed change applied or explicitly retained/deferred; final CAL-5/P reruns include all applied changes. |

Two measurement workers maximum; do not overlap slow sweeps with a full gate. All engine/data/bot packs have a CLI Verify command and prefer Codex. If using Codex CLI, paste the standing-rules preamble from `.claude/skills/implement/templates.md`: the orchestrator commits; the worker never writes git metadata. Default escalation is Terra 6.1 high → Sol 6.1 high; Strong escalation is Sol 6.1 medium → Sol 6.1 extra high, only after failed review. Claude Default escalates Sonnet 5.5 medium → Sonnet 5.5 high or Opus 5.5 medium. A runner shortage may serialize Codex packs; no need to route a phone task to it.

These are execution briefs, traced at `6f17c3a`. Each contains two to four numbered tasks; suffixes are checklist items of the existing CAL ID, not new plan/ledger IDs. “Owns” grants writes only to the named files. Consumers named in Trace are read-only unless also owned. A Read list is at most three entries; quoted contracts and Trace supply the rest of the context. Refresh renamed interfaces at merge time.

## Shared measurement and approval contract

> “No number is tuned while content is built.” — calibration-plan §1.
>
> “Order inside a pass: bot fixes first (Hold, cracks, pulses), then data numbers, then re-record golden fixtures once at the end.” — §4 P3.
>
> “A band the data cannot reach by numbers … becomes a filed design question, not a rule change.” — §4 P4.

Every district pack first measures committed defaults. Candidate experiments happen only in its isolated worktree, only in owned files, and are restored before a proposal-only report; preserve the exact candidate diff/configuration with the evidence so the run is reproducible. Never leave an unapproved number, new damage mechanic, revised lattice or routine in shipping source. The one already specified conditional application is CAL-1's SM-6 72 HP. Literal extraction keeps current values and needs no balance approval. Bot improvements allowed by CAL-3 are policy changes, not new game rules; record before/after evidence and freeze the policy before comparing districts.

Each measurement pack has three tasks: baseline, candidate table, approved application/regression. It can return after task 2 as **measured; application owed**, freeing its runner while the next measurements proceed. Player gates do not hold other packs. Resume task 3 after the player's decision; retaining the baseline is a valid recorded decision. Do not claim the CAL ID is complete while an application or required verification is owed.

**One writer for the common table.** CAL-0 creates `docs/plans/calibration-results.md`, then transfers its write ownership to the orchestrator. Parallel workers write their district verification files and return literal markdown rows for that common file. At each merge the orchestrator copies those rows into it without choosing values, recording the pack/revision and linking the district evidence. Thus every CAL pack's proposed numbers reach the requested approval table without concurrent edits to one file. The orchestrator may publish rows while other packs run, but must not edit their verification files. CAL-G1 becomes the sole owner of the common file at Close.

Use this approval-table schema (one row per lever/candidate, no fabricated measurements):

`Pack | Tunable / source | Current | Candidate | Baseline measurement | Candidate measurement | Band / miss | Bot / corpus / command / revision | Player decision | Applied revision / rerun`

Initial cells may say `not measured` and `pending`; never imply approval from elapsed time. Track retained values and missed bands as well as changes. District verification files hold the full markdown tables; the common file holds the decision rows and links.

Every table records seed range/count, layout, room/depth, party composition and compiled pages, HP **and charges**, fresh versus carried trip state, bot options, round/operation limits, wins/losses/stalls/exhaustions, reached-room denominator, median rounds and HP remaining. Report missing attrition rooms as **not reached**, never manufacture a worn party or force a win. Run fresh fights with the district's real `roomSetup`/rules; `createBattle` on raw notation alone omits some of them. Hearts and room-4 rival/fallback cases stay separate. Report stalls separately and include them in the non-win denominator.

Current shared interfaces, to preserve:

```ts
botFight(initial: BattleState, maxRounds = 40,
  order?: readonly ApprenticeId[], opts?: BotOptions)
// returns { state, events, actions, firstBoil, exhausted }
botTrial(initial: BattleState, budget = TRIAL_BUDGET,
  order?: readonly ApprenticeId[], opts?: BotOptions)
// returns the above plus { won, ops }; lite policy, deterministic action budget
runTrip(start: SaveData, flow: TripFlow, hooks: TripHooks, guardMax = 60)
// returns { save, end }; engine receives flow callbacks, never imports app/
```

`BotOptions` currently has `gauge`, `cracks`, `budget`, `lite`. `gauge: true` enables **all** registered `botValue` terms, including foundry pulses and academy paper, not just baths. Hold spells are enumerated already, but a pure Hold has no immediate HP score. `tests/sim/bot.ts` re-exports the engine bot; do not fork another policy there. Generation calls `botTrial` through `drawing/trial.ts`; compare its actual defaults separately from a district-aware policy. Never silently improve production generation by changing a calibration option.

Each engine worker runs its own Verify command plus the required TS check and `pnpm check:fast` before its last commit/report. Only the explicitly listed owners run the slow sims; each brief's Sims line grants run-only ownership of the named commands, including filtered use of the shared table test, without granting edits to that shared test. `CAL=1` is the complete table mode; CAL-0 supplies `CAL_DISTRICTS` to select a pack's districts. The new filenames below are explicitly marked new; the common runner/adapters are created by CAL-0 before later packs receive them.

## Pack CAL-N (Default: Terra 6.1 high; suggested runner: Codex)

```text
Pack CAL-N, CAL-0 preparation from calibration-plan §1.1: tasks 1 -> 2 -> 3 (core numbers, consumers, equivalence).

Read: calibration-plan.md §1.1; src/data/tuning.ts; pattern: tests/scenarios/footnotes/spark.test.ts.
Owns: src/data/tuning.ts, src/engine/bursts.ts, src/engine/runes/actions.ts, src/engine/solvents.ts;
       tests/scenarios/calibration-literals.test.ts (new), docs/plans/calibration-literals-review.md (new).

Trace:
- bursts.ts defines KEEP/WIDE/FOCUS/SPARE/CHARGE/FLARE/HUM_DAMAGE = 2/1/3/1/1/1/1; detonation, charge, plate/hum and flare handlers read them. It also selects spark-slick-long rounds 3 and spark-slick-hot damage 3.
- actions.ts uses touch-member-runup cap 3 and guard-shielded-thick shield 3; solvents.ts uses graphite-cap-pin held minimum 2. Existing FOOTNOTE/SOLVENT tuning exports in data/tuning.ts are the data home; a new dedicated export avoids widening the typed core Tuning interface unnecessarily.
- Sentence, Hold and Levy already read ACTIONS.sentenceTiles=2, holdRounds=1 and levyShieldPerMark=1 from data/tuning.ts. The plan's claim that these are missing is stale. Preserve those keys; do not create duplicate constants.
- Consumers' regression coverage: tests/scenarios/{bursts,actions,solvents}.test.ts and tests/scenarios/footnotes/{spark,brass,methods,solvents-marks}.test.ts. Golden replays assert their public event behavior; no fixture rewrite for extraction.

Contract:
  "CAL moves each into src/data/ ... with its current value, then tunes it with the rest."
  Values and all event ordering/amounts/durations remain identical. A failed unchanged test is an extraction bug, not a request to recalibrate its assertion.

1. Move the seven burst damages and the two Spark overrides to named data fields, preserving each current value and handler branch.
2. Move the runup cap, thick shield and graphite pin duration to named data fields. Check off the already-extracted ACTIONS keys with their consumers and unchanged values.
3. Add event-level equivalence cases for the affected footnotes using the scenario harness; write a literal-to-data/consumer table, including the already-done ACTIONS rows. These are behavior checks, not tests merely asserting the new object shape.

Owed by this pack: all core rows of calibration-plan §1.1; foundry scoring belongs to CAL-B and drawing loot to CAL-D.

Done when: existing affected scenarios pass unchanged; 'CAL-N: burst footnotes keep their damage and fire duration', 'CAL-N: runup and thick shield keep their cap', 'CAL-N: graphite pin keeps two rounds' pass; review.md accounts for every owned §1.1 row. No balance delta.
Verify: pnpm vitest run tests/scenarios/calibration-literals.test.ts tests/scenarios/bursts.test.ts tests/scenarios/actions.test.ts tests/scenarios/solvents.test.ts tests/scenarios/footnotes/spark.test.ts tests/scenarios/footnotes/brass.test.ts tests/scenarios/footnotes/methods.test.ts tests/scenarios/footnotes/solvents-marks.test.ts tests/run/golden.test.ts --reporter=dot
Sims: none. Phone check: no.
```

## Pack CAL-D (Default: Terra 6.1 high; suggested runner: Codex)

```text
Pack CAL-D, CAL-5 preparation from calibration-plan §1.1: tasks 1 -> 2 (doorway weight, placeholder metadata).

Read: calibration-plan.md §1.1; src/data/drawing.ts; pattern: tests/drawing/loot.test.ts.
Owns: src/data/drawing.ts, src/engine/drawing/loot.ts, src/engine/districts/inkedPage.ts, tests/drawing/loot.test.ts;
       docs/plans/calibration-drawing-literals.md (new).

Trace:
- drawing/loot.ts::tableFor reads DRAWN_LOOT.weights, but adds doorway with local DOORWAY_WEIGHT=1. drawnOffersFor selects picks from DRAWN_LOOT and returns guaranteed cards to the trip offer roller.
- districts/inkedPage.ts::inkedRoom still writes LOOT='deep' and PICKS={room:1,heart:2} into encounter metadata. The lent shape's offersFor replaces them with drawnOffersFor; its termed-card extras are already wired at this snapshot. Do not remove that code on the basis of stale Owed notes.
- tests/drawing/loot.test.ts covers the real offers; tests/run/trip-shape.test.ts and tests/drawing/lent.test.ts cover delegation. F2 and kit continuations may own these files: do not overlap them.

Contract:
  "Drawn-room placeholder loot ... drop them or point them at DRAWN_LOOT."
  "Doorway weight ... 1"; move to DRAWN_LOOT with the same value.
  Keep drawnOffersFor(t, room, owned, snapshot?) and drawnOffers(p, t, room) behavior identical, including no doorway at the heart and no campaign rewards.

1. Move doorway weight 1 into DRAWN_LOOT; preserve roll order, salts, pools and weights.
2. Point placeholder loot/pick metadata at data-owned defaults (preserve deep, room 1, heart 2), or remove only demonstrably unnecessary metadata if the EncounterDef contract allows it. Add a focused regression proving actual offers/picks and term extras still come from offersFor. Write the before/after data mapping and verify unchanged results.

Owed by this pack: Pack F2 doorway constant and §1.1 placeholder rows. No generator tuning or kit/rule changes.
Done when: 'CAL-D: data-owned defaults preserve drawn offers and picks' and 'CAL-D: placeholder metadata cannot override lent extras' pass; existing loot/lent tests pass unchanged; review lists no numeric delta.
Verify: pnpm vitest run tests/drawing/loot.test.ts tests/drawing/lent.test.ts tests/run/trip-shape.test.ts --reporter=dot
Sims: none. Phone check: no.
```

## Pack CAL-B (Default: Terra 6.1 high; suggested runner: Codex)

```text
Pack CAL-B, CAL-3/CAL-4 bot preparation: tasks 1 -> 2 -> 3 (policy baseline, Hold decision, pulse constants).

Read: calibration-plan.md §1 HC-4, §1.1 foundry bot row, §3 CAL-3 and §4 P3; src/engine/sim/bot.ts; pattern: tests/sim/bot-determinism.test.ts.
Owns: src/engine/sim/bot.ts, src/engine/districts/foundry/bot.ts, src/data/districts/foundry.ts;
       tests/sim/bot-determinism.test.ts, tests/sim/calibration-bot.test.ts (new), docs/plans/calibration-bot-review.md (new).

Trace:
- sim/bot.ts::attacks already enumerates legal usable Hold casts; value() scores HP/mark plus botValue only with gauge=true. Pure Holds usually have zero gain. cracks=true already consults crackedTiles. Foundry FOUNDRY_BOT already skips humming tones (R6-6).
- district terms are gathered by districts/api.ts; bridge falls, baths forecasts, foundry pulses and academy rub-term must be compared with their actual options, not assumed active. drawing/trial.ts re-exports botTrial, so a default policy change also changes generator trials.
- foundry/bot.ts::pulseTerm has foe +6, another +10 at HP<=1, member -15. Move those exact weights into FOUNDRY_TUNING, consumed only here. tests/sim/foundry.test.ts tests the pulse preference; tests/districts/foundry/review.test.ts covers the R6 humming fix.

Contract:
  "Decide whether the bot learns Hold"; "bot fixes first (Hold, cracks, pulses), then data numbers".
  Preserve botFight/botTrial signatures and deterministic operation budgeting. Any added option is optional and defaults to the prior behavior until its effect on generation is measured and explicitly accepted. No game-rule changes, no new randomness, no wall-clock stopping, no cap bypass.

1. Record default, cracks-aware and district-aware results on a fixed small bridges/foundry/academy/baths corpus using CAL-0. Inventory starts that stall. Full district rates wait for EN-14; these are policy-comparison measurements.
2. Test a deterministic Hold-capable policy on a legal Hold loadout; compare to the unchanged policy on identical seeds and pages. Select the measured policy or explicitly retain no-Hold with evidence. If implemented, keep it opt-in for comparisons, write deterministic action/budget tests, and record whether production botTrial uses it (do not switch production defaults silently). Do not grant the starters a free Hold spell. Later packs use the same declared choice.
3. Extract pulse weights 6/10/15 unchanged; run the existing pulse/humming regressions and report the data keys, options, chosen policy and residual limits. Export no new bot branch from tests/sim/bot.ts.

Owed by this pack: HC-4's no-Hold/cracks/pulses assessment; §1.1 foundry bot weights; BR-21's bot-limit caveat. If evidence cannot distinguish balance from policy, label it instead of tuning HP around it.
Done when: 'CAL-B: Hold policy is deterministic and respects the operation budget', 'CAL-B: a Hold option leaves default actions unchanged' (if added), existing EN-0 determinism tests and BF-20 pulse tests pass; review.md contains paired policy results, stalled seeds and an explicit Hold decision. No balance number changed.
Verify: pnpm vitest run tests/sim/calibration-bot.test.ts tests/sim/bot-determinism.test.ts tests/sim/foundry.test.ts tests/districts/foundry/review.test.ts --reporter=dot
Sims owned: calibration-bot.test.ts, bot-determinism.test.ts and foundry.test.ts for this preparation only; CAL-4 takes foundry.test.ts after this merges. No broad sweep here.
Phone check: no.
```

## Pack CAL-1 (Default: Terra 6.1 high; suggested runner: Codex)

```text
Pack CAL-1 of calibration-plan.md: tasks 1 -> 2 -> 3 (measure Seam/canals, propose, apply/verify).

Read: calibration-plan.md §§1–2 CAL-1 items and §3 CAL-1; docs/plans/calibration-harness-review.md; pattern: tests/run/golden.test.ts.
Owns: src/data/districts/seam.ts, src/data/enemies.ts (canal definitions only), src/data/districts/canals.ts;
       tests/sim/calibration/seam-canals.ts, tests/sim/seam-calibration.test.ts,
       tests/sim/seam-rooms-play.test.ts, tests/sim/canal-rooms-play.test.ts;
       tests/run/golden.test.ts, tests/fixtures/district-kit/record.ts,
       tests/fixtures/district-kit/seam-{win-6,win-8,win-9,wipe-7,wipe-23}.json,
       tests/fixtures/district-kit/canals-{win-2,win-4,win-5,win-6}.json;
       docs/plans/seam-grows-verification.md, docs/plans/canals-revisit-verification.md.

Trace:
- MARGINALIA.hp=16 and MARGINALIA_TUNING.familiars=2/reach=1 live in data/districts/seam.ts. engine/districts/seam.ts supplies the per-tile hands and death hook; foes.ts::makeEnemy reads ENEMIES, which includes SEAM_ENEMIES through data registration.
- data/enemies.ts::ENEMIES.mother has hp=56 and summon={cap:4,flareEvery:3}; engine/foes.ts consumes the summon values. data/districts/canals.ts::CANAL_HEART supplies three layouts. The Lamplighter room and stand-in must be measured separately; current/crate behavior is in engine/districts/canals.ts and its shape helpers.
- golden.test.ts has BOT={maxRounds:100}, DEEP={maxRounds:100,startHp:20}, no SEAM_DEEP yet. record.ts drives bot fights for recording and recorded actions for replay; replay never chooses a new bot action. The five Seam reference fixtures are exactly the owned Seam JSONs. Do not rewrite locks, idle wipes, or unrelated save fixtures.

Contract:
  "Apply SM-6's 72 HP only if the table agrees"; "update SEAM_DEEP/DEEP and the golden fixtures together".
  "Seam: heart 40–60 % at party 2, 1 and 3 reported."
  "Canals: fresh HP, party 2, 50+ seeds per layout: rooms 1–2 at least 85 %, room 3 at least 75 %, room 4 65–80 % with the Lamplighter (fallback at least 80 %), heart 50–65 %; party 3 within +10 points."
  "Crate moored without trying in ≤25% of wins"; full-trip attrition reported, not targeted.
  A miss is written down with numbers. No per-cloud Spark conversion, automatic trio nerf, free HP restocking or new combat rule.

1. Run baseline fresh and real-trip tables, party 1–3, all layouts, 50+ seeds/layout for canals; report HP/charges attrition, crate mooring without pursuing it, and trio-minus-pair deltas. Reproduce the old 0/100 worn-canal issue rather than adopting it as a target.
2. Compare the specified 72-HP Marginalia candidate against 16 with the current bot, including heart-layout spread, hand/first-Spark timing, rounds, attrition and the old failing heart-play test. Its application is permitted only if the full table supports the quoted band and unchanged regression acceptance passes. Otherwise leave 16 and propose the measured next step. All other numeric proposals, including canals HP/layout counts and any new golden startHp, go as explicit approval rows through the orchestrator to results.md. Keep ref/sm-6 and the retained branch.
3. Apply only explicitly approved remaining rows (or recorded retain decisions). Set SEAM_DEEP/DEEP only to the justified agreed recording configuration; label inflated HP as golden coverage, never as fresh balance evidence. Re-record affected golden trips once after final source numbers/options, review their event/outcome diffs, then replay without recording. Preserve the existing one-or-more heart-win regression rather than weakening it to make 72 pass.

Owed by this pack: SM-6 branch/fixture fallout; CN-13 pair/trio margin and crate rate; no approval to delete the reference. Return proposal-only after task 2 if other rows await a decision.
Done when: both full tables and candidate/decision rows exist, with band status or quantified misses; 'the heart plays to an end and is no walkover' and 'CN-13: the bot plays every variant to an end; the pool is no walkover (target 50-65%)' pass; all golden '<name>: replays to the recorded events, offers, stats and end save' cases pass after any approved recording. Report unchanged defaults when no change is approved.
Verify: pnpm vitest run tests/sim/seam-calibration.test.ts tests/sim/seam-rooms-play.test.ts tests/sim/canal-rooms-play.test.ts tests/run/golden.test.ts --reporter=dot
Sims owned: the three above and CAL_DISTRICTS=seam,canals CAL=1 pnpm vitest run tests/sim/calibration-tables.test.ts --reporter=dot
Recording, only at task 3: RECORD_GOLDEN=1 pnpm vitest run tests/run/golden.test.ts -t 'seam-win|seam-wipe-(7|23):|canals-win' --reporter=dot
Phone check: no.
```

## Pack CAL-2 (Default: Terra 6.1 high; suggested runner: Codex)

```text
Pack CAL-2 of calibration-plan.md: tasks 1 -> 2 -> 3 (quarter baseline, lever proposals, approved pass).

Read: calibration-plan.md §1 IQ-20/IQ-23, §2 quarter and §3 CAL-2; docs/plans/ink-quarter-calibration.md; pattern: tests/sim/ink-calibration.test.ts.
Owns: src/data/districts/inkQuarter/enemies.ts, src/data/districts/inkQuarter/terms.ts, src/data/rivals/postmaster.ts;
       tests/sim/calibration/ink.ts, tests/sim/ink-bot.ts, tests/sim/ink-calibration.test.ts, tests/sim/postmaster-heart.test.ts;
       tests/rivals/postmaster.test.ts, tests/districts/inkQuarter/terms.test.ts;
       docs/plans/ink-quarter-calibration.md, docs/plans/ink-quarter-verification.md.

Trace:
- CLOCK_TUNING={deadlineAfter:3,collect:3,cooldown:2} and CLOCK_SEAL.hp=3 are in inkQuarter/enemies.ts; clock.ts reads those fields in serveClock/endWrit/collect. The same data file owns SEALER and the legacy POSTMASTER shell, so shell HP/move must stay consistent with the actual rival if changed.
- terms.ts contains withinRounds sampler 5, bind 6, wax 7; engine/districts/inkQuarter/{terms,stakes}.ts evaluates these. ink-bot.ts already calls engine sim/runTrip; its skip mode forces wins for wiring properties, so use mode='bot' for balance.
- rivals/postmaster.ts owns move=0, Bolt> Ink Sentence opener, Splash> Levy collect charges=5 and routine. spawnRival in engine/rivals/unit.ts compiles these; engine/districts/inkQuarter/postmaster.ts supplies trick/goals, not a generic damage lever.
- INK_CAL's room-5 '(heart)' label lacks the trick/page result row. postmaster-heart.test.ts 'a won heart banks the page, once' demands a real bot win on at least one of seeds 1000–1002.

Contract:
  "Terms never beyond a normal room's band; term rooms at least baseline minus 10 points; the heart can be lost."
  "Pick the IQ-20 lever, give the postmaster a move or opener (IQ-23), add the INK_CAL postmaster row."
  Status default is playtest first for the unresolved IQ-20 lever. A new damage source, changed lattice/routine or new reach/placement rule is a design proposal, not an automatically approved numeric fix. Do not change clock collection, bound-mark release, fairness, or page banking rules to hit a rate.

1. Add explicit postmaster rows to INK_CAL and the shared adapter: fresh/worn wins/losses/stalls, served/lifted/collected writs, actual trick and opener, page banked, remaining HP/charges. Run terms with never/always/winRoom signing policies; use 120 fresh seeds as the existing full table does.
2. Compare data-only IQ-20 levers from §1, and present the movement-versus-opener alternatives as measured proposals. Keep deadline/cooldown history distinct from new measurements. Propose exact candidate values only after measuring them; record terms' paid/broken rate and baseline-minus-term delta. Send literal approval rows to results.md via the orchestrator. If all fresh rooms still win, state why this cannot establish a target without a player rule choice.
3. Apply only player-approved lever and movement/opener rows, preserving rival/page coherence and shell data. Run the heart banking regression and terms fairness unchanged; existing no-stranding/skip-mode properties remain useful but do not count as combat wins. A chosen new opener must have a legal cast regression and annotation/page consistency reviewed; an unapproved opener remains proposed.

Owed by this pack: IQ-23 missing INK_CAL row; IQ-20 unresolved lever; fresh-pair 100% rooms versus worn-heart 3% is a baseline to remeasure, not a target to enforce.
Done when: INK_CAL includes a named postmaster trick/page row; fresh/worn and term-delta tables plus decision rows are committed; heart wins and losses both measured or their absence recorded as a quantified miss/design question. 'a won heart banks the page, once', 'a wiped heart keeps a held page and banks none', terms fairness tests and postmaster rival tests pass after approved application. No balancing by changing seed 1000–1002 to an easier trio.
Verify: pnpm vitest run tests/sim/ink-calibration.test.ts tests/sim/postmaster-heart.test.ts tests/rivals/postmaster.test.ts tests/districts/inkQuarter/terms.test.ts --reporter=dot
Sims owned: those two sim files; INK_CAL=1 pnpm vitest run tests/sim/ink-calibration.test.ts --reporter=dot; CAL_DISTRICTS=inkQuarter CAL=1 pnpm vitest run tests/sim/calibration-tables.test.ts --reporter=dot
Phone check: no.
```

## Pack CAL-3 (Default: Terra 6.1 high; suggested runner: Codex)

```text
Pack CAL-3 of calibration-plan.md: tasks 1 -> 2 -> 3 (baths/bridges baseline, candidates, approved pass).

Read: calibration-plan.md §1 BH-16/BR-21, §2 and §3 CAL-3; docs/plans/calibration-bot-review.md; pattern: tests/sim/bathhouses-calibration.test.ts.
Owns: src/data/districts/bathhouses.ts, src/data/districts/bathhouses/types.ts, src/data/rivals/bathSteward.ts;
       src/data/districts/bridges/types.ts, src/data/districts/bridges/enemies.ts, src/data/rivals/chiefWarden.ts;
       tests/sim/calibration/bath-bridges.ts, tests/sim/bathhouses-calibration.test.ts, tests/sim/bridges-calibration.test.ts;
       tests/districts/bathhouses/heart.test.ts, tests/districts/bathhouses/boil-over.test.ts, tests/districts/bridges/heart.test.ts;
       tests/rivals/bathSteward.test.ts, tests/rivals/chiefWarden.test.ts;
       docs/plans/bathhouses-verification.md, docs/plans/bridges-verification.md.

Trace:
- baths/types.ts::HEAT rows are tile/vent quarters {2,4}/{3,8}/{4,8}/{5,12}; capacity 12 pips, feeder 2 pips. engine/districts/bathhouses/boilOver.ts consumes them. bathhouses.ts has foe bodies and STEWARD_TUNING.stokePips=4, read by engine/districts/bathhouses/heart.ts; rivals/bathSteward.ts defines the real master's HP, spells and stoke goal. The shell alone is not his live kit.
- bridges/types.ts::BRIDGE_TUNING holds sound/crumbling stone 2/1, keystoneHp 6, chiefHp 10, eliteFall 4, foe bodies (warden/gargoyle/mason 4/3/3, chiefWarden 10). enemies.ts reads foes.chiefWarden.hp; rivals/chiefWarden.ts separately writes 10. Measure actual spawn HP, not just chiefHp. Engine bridges/{wear,collapse,foes,heart}.ts consume these values.
- bathhouses-calibration currently constructs raw notation then lists boil-over; use live authored setup as the primary table, with old raw-board results labelled. Its quick test currently assumes two wins for every room; any requested change to it is a player-reviewed acceptance change, never an automatic relaxation.
- bridges-calibration already uses cracks=true and spans sound/crumbling. Its property/fuzz tests assert legal movement/caps, not a target band. Shared Hold/policy edits belong to CAL-B, never to this parallel pack.

Contract:
  "Room win rate within ±10 points of the canal rooms at the same depth, hearts lower by design; at most one boil-over in a median fight at heat 1–2; both outcomes occur."
  "No median boil before round 3."
  Bridges has no settled numeric band: "Proposal: the canals' band". Quote its proposed comparison without claiming approval.
  Use CAL-B's recorded Hold decision; no change to Hold rules, span support/collapse rules, or stoke timing mechanics without a player decision.

1. Measure party 1–3 fresh and worn, all baths heat/layout rows, both bridge spans, declared blind/aware options and the frozen Hold policy. For each heat report boils/fight, median boils, first-boil median among fights that boil, no-boil count, member hits, and win/loss by boil occurrence. Report falls/room for bridges. Compare baths to the matching fresh canal rows, never to worn-trip completion rates.
2. Measure numeric candidates for later-room/heart foe bodies, heat/feeder/capacity/stoke amounts and BR-21 numbers. Treat a later stoke as a routine/rule proposal unless represented by existing tunable data. Return exact proposed values, confidence/sample sizes, the median-first-boil miss (including the old round-2 issue), and P2's unresolved bridge-band decision for results.md. Do not silently use a trio to claim the pair band.
3. Apply approved numbers only; keep rival and shell bodies coherent. Re-run tables and behavior tests. Keep property tests intact; list any old all-wins balance assertion requiring player acceptance as an explicit proposed test change. If the band or no-early-boil condition cannot be met by numbers, publish the measured miss and question rather than changing the mechanics.

Owed by this pack: BH-16 worn/trio measurement, early-boil timing, BR-21 small-party stalls versus Hold-policy evidence. Drawn Steward trials without active boil-over are CAL-5's setup coverage, not a reason to change authored bath rules here.
Done when: baths tables contain all boil metrics and canal deltas, bridges tables contain both spans/party sizes/falls and separate stalls; candidate/decision rows exist. Existing heart/boil/collapse regressions and 'a move onto a cracked tile is only taken when every legal move is cracked' pass. Median first boil >=3 and heat-1/2 median boils <=1, or explicit quantified misses with proposed decisions; do not turn missing boils into a fake first-boil round.
Verify: pnpm vitest run tests/sim/bathhouses-calibration.test.ts tests/sim/bridges-calibration.test.ts tests/districts/bathhouses/heart.test.ts tests/districts/bathhouses/boil-over.test.ts tests/districts/bridges/heart.test.ts tests/rivals/bathSteward.test.ts tests/rivals/chiefWarden.test.ts --reporter=dot
Sims owned: both calibration files; BATH_TABLE=1 pnpm vitest run tests/sim/bathhouses-calibration.test.ts --reporter=dot; BRIDGES_TABLE=1 BRIDGES_OUT=/tmp/cal-3-bridges.md pnpm vitest run tests/sim/bridges-calibration.test.ts --reporter=dot (archive this output with the verification table); CAL_DISTRICTS=bathhouses,bridges CAL=1 pnpm vitest run tests/sim/calibration-tables.test.ts --reporter=dot
Phone check: no.
```

## Pack CAL-4 (Default: Terra 6.1 high; suggested runner: Codex)

```text
Pack CAL-4 of calibration-plan.md: tasks 1 -> 2 -> 3 (foundry/academy tables, candidates, approved pass).

Read: calibration-plan.md §1 BF-20/BF-21, §2 and §3 CAL-4; docs/plans/calibration-bot-review.md; pattern: tests/sim/foundry.test.ts.
Owns: src/data/districts/foundry.ts, src/data/districts/foundry/enemies.ts, src/data/rivals/carillonneur.ts;
       src/data/districts/cartographers/{types,rooms,foes}.ts, src/data/rivals/registrar.ts;
       tests/sim/calibration/foundry-cartographers.ts, tests/sim/foundry-calibration.test.ts (new), tests/sim/cartographers-calibration.test.ts (new),
       tests/sim/foundry.test.ts, tests/sim/cartographers-hall.test.ts;
       tests/districts/foundry/{peal,tune}.acceptance.test.ts, tests/rivals/carillonneur.test.ts, tests/rivals/registrar.test.ts;
       docs/plans/foundry-verification.md, docs/plans/cartographers-verification.md (new).

Trace:
- FOUNDRY_TUNING in data/districts/foundry.ts owns pulses 1/1, allied pulses 2/1, tune length 4, max same-tone 2, tones by room 2/2/3/3/3 and foe bodies. Engine foundry/{ring,tune,peal}.ts reads these; pealRoomSetup hangs the recorded notes on HEART_HOOKS. Carillonneur shell reads FOUNDRY_TUNING.carillonneur.hp=14; rivals/carillonneur.ts also writes 14 and owns the live spell/routine. CAL-B has already extracted pulse score weights and preserved R6's humming exclusion.
- Academy types.ts::DEFAULT_PENCIL and rooms.ts::ROOM_PENCIL define the paper configs; foes.ts::CARTOGRAPHERS_FOE_TUNING owns Surveyor/Eraser/Tracer stats. rivals/registrar.ts::REGISTRAR_TUNING={hp:10,move:1,circles:1,circlesBelowHalf:2}; engine cartographers/{guildHand,paper,foes,registrar,trip}.ts consumes them. The heart frame's separate pencil scatter and bot rub term are consumers/watch points, not permission for an unrelated rewrite.
- tests/sim/cartographers-hall.test.ts wins by decree to verify trip wiring; it is not a win-rate sweep. foundry.test.ts has real early bot play plus separately rolled loot and random-action fuzz; neither proves a 0–4-bell difficulty curve. Add genuine bot calibration tests with no forced victories.

Contract:
  "Tables at party 1–3, hung bells 0–4"; "0 bells winnable, 4 clearly easier."
  Academy: "within the canals' band" at party sizes 1–3. Six academy rooms have no one-to-one five-room canal mapping; report depths 1–4, deeper non-heart room 5 separately, and heart-to-heart; ask the player before assigning a new numeric target to room 5.
  Foundry numeric band remains P2 (canals' band), a Proposal. Do not invent a minimum percentage-point gap for "clearly easier": report paired seeds, wins, rounds, HP and stalls for all five bell counts.

1. Produce real fresh/worn party-1/2/3 tables over all foundry and academy layouts. For the foundry heart construct legal trip peals with exactly 0,1,2,3,4 hung bells and label controlled-heart trials separately from naturally earned bells. Use real rules/tune/pencil setup and CAL-B's declared district-aware policy. Retain both default-bot and aware-bot comparisons where they differ.
2. Measure data candidates and return proposed rows to results.md. Report 0-versus-4 paired outcomes rather than assuming the stale "bot never wins foundry heart" note is current: Pack K reported 50/50 drawn wins. Keep authored hearts separate from drawn frames/fallbacks (CAL-5). Include a fixed Registrar-note swap-on-pencil watch case, its prevalence/benefit with versus without the note, and say explicitly whether it needs a player rule decision; do not nerf the note here.
3. Apply approved numbers only; preserve shell/rival consistency, tune rules and per-room paper behavior. Re-run the genuine bot tables and original peal/tune/Registrar regressions; keep decree-based trip wiring tests unchanged. File any unreached band, unsupported room-5 mapping or bot limitation with numbers rather than relaxing setup or constraints.

Owed by this pack: BF-20/21's missing calibration tables, CG-9/10 combat tables, stale foundry-heart risk correction, Registrar note watch item. Drawn bell stamps with fewer than requested bells and mother fallback rates are owned by CAL-5.
Done when: 'CAL-4: foundry party and hung-bell tables' and 'CAL-4: academy fresh and worn combat tables' pass no-throw/cap invariants and print their full measurements; peal/tune and Registrar regressions pass; 0-bell wins and measured 4-bell improvement are shown or a quantified miss and player decision recorded. Candidate rows name source fields and the unresolved P2/room-5 comparisons.
Verify: pnpm vitest run tests/sim/foundry-calibration.test.ts tests/sim/cartographers-calibration.test.ts tests/sim/foundry.test.ts tests/sim/cartographers-hall.test.ts tests/districts/foundry/peal.acceptance.test.ts tests/districts/foundry/tune.acceptance.test.ts tests/rivals/carillonneur.test.ts tests/rivals/registrar.test.ts --reporter=dot
Sims owned: the four files above; CAL_DISTRICTS=foundry,cartographers CAL=1 pnpm vitest run tests/sim/calibration-tables.test.ts --reporter=dot
Phone check: no.
```

## Pack CAL-5 (Default: Terra 6.1 high; suggested runner: Codex)

```text
Pack CAL-5 of calibration-plan.md: tasks 1 -> 2 -> 3 (drawn/household baseline, pen and candidates, approved pass).

Read: calibration-plan.md §1 EN-13/EN-S2, §2 and §3 CAL-5; ending-plan.md §2 P6/P10/P28–P35; pattern: tests/sim/generator.test.ts.
Owns: src/data/drawing.ts, src/engine/drawing/palette.ts;
       tests/sim/calibration/drawn.ts, tests/sim/drawn-calibration.test.ts (new), tests/sim/generator.test.ts,
       tests/sim/household-sweep.test.ts (run-only; unchanged assertions and results contract),
       tests/drawing/palette.test.ts, tests/drawing/loot.test.ts,
       tests/fixtures/calibration/drawings.ts and tests/fixtures/calibration/profiles.json (new, reproducible measured corpus);
       docs/plans/drawn-calibration.md (new).

Trace:
- drawing.ts owns GEN_TUNING={perMember:2,perDepth:1,bandBonus:0/1/2,walkover:{rounds:2,hpLeft:1},step:1}, GEN_LIMITS={attempts:4,heartAttempts:3,rounds:12,heartRounds:16,draws:8,foeDistance:3,blockedShare:0.3,phone:{medianMs:500,p95Ms:2000}}, COSTS, WEIGHT_BANDS=9/14 and DRAWN_LOOT. CAL-D already moved doorway/placeholder defaults here.
- generate.ts::baseBudget/specFor/generateRoom/inkRoom reads those values; ROOM_ROUNDS already aliases GEN_LIMITS.rounds (do not extract it again). offeredTrial chooses the actually offered layout. Hearts are exempt from the walkover test and own their foes; never apply non-heart budget checks to them to improve numbers.
- palette.ts::penOf currently counts hearts + floor(known/4) + capstones; cost.ts/check.ts consume drawing costs, weight bands and pen. If proposing pen-source weights, first move their current factors/divisor to named drawing.ts data without changing behavior; no Profile/save schema change.
- generator.test.ts's 500-seed corpus uses app/dev/samples.ts (spike sample, not the entire production palette). household-sweep.test.ts enumerates PLAYABLE_DISTRICTS and the shared bot across lineups; its structural/determinism/cap assertions remain intact. Authored win rates may legitimately change after approved data; report those deltas without altering the sweep's invariant expectations.
- Generated district/shape behavior comes from districts/inkedPage.ts and drawing/kits/**; frame setup rules are composed in generate.ts. Steward boil-over activation, mother fallback, stamped bell count and peal notes on length-6 trips must be observed in the final kit revision, not assumed fixed from status prose.

Contract:
  "Heart win rates light 60–75 %, medium 45–60 %, heavy 30–45 % (bot, fresh HP)."
  "Offered rooms stay inside EN-S2's walkover limit"; existing test limit is at most 10% of seeds, median offered win round >=3 and median HP left <1.
  "tests/sim/household-sweep.test.ts unchanged in result" means its original safety/placement/determinism acceptance passes, with no hidden skip or relaxed assertion. Distinguish a changed balance report from a broken invariant.
  Preserve fresh-HP/charge judging, stored-room reload determinism, salted RNG, operation budgets and counted fallbacks. GEN_LIMITS.phone bars and the walkover definition are acceptance constraints, not knobs to raise to claim success.
  EN-G0's 94.4% fair-within-four and 5.6% dull are watch baselines, not newly imposed targets; no Plan B change without the player's call.

1. Measure generated trips by weight band, length 3–6, party 1–3, each rule/shape and every master, using legal combinations from a full palette plus labelled campaign-profile and available real-save snapshots. Fresh generation trials and actual carried trip runs are separate. Include the old 500-seed sample corpus for comparison. Report unverified fallback count, per-master fallback rate, fair/offered/verified rates by attempt, dull/walkover rate, budget/attempt histograms, rounds/HP distributions, ops and desktop timing. Verify Steward gauge activation, actual stamped bell counts and length-6 peal state. Any absent setup is a measured design/implementation issue, not an approved rule edit.
2. Measure pen total/parts and affordable drawings on campaign snapshots and any available real saves; never label synthetic profiles as player saves. Report missing save evidence instead of requesting it to start other work. Compare measured generator/loot/cost/pen candidates in owned data and return exact proposal rows to results.md. Export the frozen corpus for CAL-P. Separate acceptance bars from tunable budget/cost values; do not reclassify heavy drawings as light to reach a heart band.
3. Apply explicitly approved values or retained defaults, run the generator fuzz and full household sweep unchanged, and remeasure after all authored-district applications. Update only numeric expectations that the player explicitly accepted (e.g. step), never guardrails or the walkover ceiling. A needed change in generate.ts, kits/frames or a game rule is a separately briefed design fix; report the exact missing rule/setup and continue other measurements. Record any remaining band miss with numbers for CAL-G1.

Owed by this pack: EN-13, pen calibration, GEN_TUNING/GEN_LIMITS/DRAWN_LOOT, accepted D5 watch numbers; stale mother/foundry fallback claims; Steward inactive-gauge and cramped-bell observations. Do not infer that a verified scripted fallback was won by the bot. Device timing belongs to CAL-P.
Done when: 'CAL-5: drawn heart bands and production corpus tables' prints measured heart wins/losses/stalls per band and master; 'CAL-5: pen availability is reported for labelled profile sources' outputs the pen/cost table; all EN-S1 guardrail/determinism/cap and EN-S2 walkover tests pass; household sweep's placement, every-room, whole-trip and random-walk properties pass unchanged. Final tables give target/miss and pending/approved decisions, with no invented real-save data.
Verify: pnpm vitest run tests/sim/drawn-calibration.test.ts tests/sim/generator.test.ts tests/sim/household-sweep.test.ts tests/drawing/palette.test.ts tests/drawing/loot.test.ts --reporter=dot
Sims owned: the three above; CAL_DISTRICTS=inkedPage CAL=1 pnpm vitest run tests/sim/calibration-tables.test.ts --reporter=dot; HOUSEHOLD_SWEEP=1 pnpm vitest run tests/sim/household-sweep.test.ts --reporter=dot
Phone check: no (CAL-P owns it).
```

## Pack CAL-P (Default: Sonnet 5.5 medium; suggested runner: Claude only)

```text
Pack CAL-P, CAL-5 device evidence: tasks 1 -> 2 (phone performance, playable states).

Read: calibration-plan.md §1 EN-13 and §3 CAL-5; ending-plan.md §2 P12/P29/P36; pattern: src/app/dev/Generator.svelte.
Owns: src/app/dev/Generator.svelte, src/app/dev/samples.ts (only additive corpus selection/measurement display);
       tests/app/dev-generator-page.test.ts;
       docs/plans/calibration-phone.md (new), docs/plans/calibration-evidence/ (new screenshots/timing exports).

Trace:
- dev/generator.html mounts Generator.svelte through generator.ts. Generator directly times generateRoom on its device; that is distinct from the production worker path in app/generation.ts::workerInker and game.svelte.ts::ensureRoom.
- CAL-5 exports fixture drawings/profiles read-only. samples.ts's current spike subset must remain reproducible; add a selector if needed, not a replacement baseline. Production worker reports {layout,ms}; browser instrumentation may observe it without changing its API.
- Drawing-table and map states use ui/screens/Desk.svelte, ui/districts/inkedPage/PagesSlot.svelte and app game/flow; these are read-only here. A source defect gets its own brief. No dark theme exists.

Contract:
  "Targets on the player's phone median ≤0.5 s, p95 ≤2 s per accepted room."
  Measure at 375×812 with screenshots. Emulation verifies layout, not iPhone hardware performance; identify device/browser and warm/cold runs. Real iPhone numbers missing at handoff stay explicitly unverified.
  Keep UI additions dev-only and preserve existing spike seeds 1–40. Svelte 5 runes; autofixer on every changed component; use the modern-web-guidance skill before any HTML/CSS/client-JS edit.

1. Load the final CAL-5 corpus on the dev page; if needed, add a small corpus selector and existing ms/attempt/fallback fields to the existing layout. Measure accepted-room median/p95 on the available phone hardware, including the production worker separately from direct generation. Save raw samples, corpus/revision, timing definition and counts; report a bar miss without raising the bar.
2. Browser-check drawing/pen at handover, light/medium/heavy choices, Set out/inking, prefetch at loot, one drawn heart and return/reload at 375×812. Capture screenshots and console errors. Run autofixer for changed components and the dev-page regression; send measured rows for results.md through the orchestrator. If only emulation is available, complete it and list real-device timing as owed; do not block the other packs.

Owed by this pack: EN-13 phone timing; compare final numbers to the old P29 iPhone timings without treating different hardware as a regression proof. EN-14 owns the ending/copy review; do not silently rewrite Cleared/Crossroads text here.
Done when: calibration-phone.md links the 375×812 states and raw timing sample export, records device/browser and measured median/p95 or explicitly missing hardware evidence; 'DEV-1: the generator page does not mount into the scroll-locked #app' passes; changed components autofix cleanly, or unavailable autofixer is explicitly reported.
Verify: pnpm vitest run tests/app/dev-generator-page.test.ts --reporter=dot
Phone check: yes, port 5194; pnpm dev --port 5194, /apprentices-notebook/src/app/dev/generator.html and the production app route.
Sims: none; reads CAL-5's output, never starts another full fuzz.
```

## Pack CAL-G1 (design orchestrator: strongest available, high; suggested runner: Claude only)

```text
Pack CAL-G1 of calibration-plan.md: tasks 1 -> 2 -> 3 (decisions, final gate/loop, records).

Read: calibration-plan.md §3 CAL-G1 and §4; docs/plans/calibration-results.md; pattern: docs/plans/foundry-verification.md.
Owns: docs/plans/calibration-results.md, docs/plans/calibration-verification.md (new), docs/plans/calibration-evidence/ (after CAL-P);
       docs/plans/calibration-plan.md (State/decision records), docs/plans/build-program-status.md,
       docs/plans/build-program-log.md (append records only; do not read for context), docs/plans/calibration-briefs.md (remove merged briefs);
       DESIGN.md §11, TECH.md §7, docs/ROADMAP.md, docs/ROADMAP-done.md (CAL closure entries only).
Run-only ownership: full pnpm check, including tests/sim/**; other workers/sweeps must be idle. No source/test edits in this Close pack.

Trace:
- District verification files and drawn-calibration.md contain the full results; results.md is the single proposal/approval ledger. The status file tracks owed applications, missing hardware/save evidence and open rule questions. git log --grep '<ID>' supplies historical specifics; never read the build log as history.
- pnpm check runs Svelte/TS, Biome and all Vitest files, including every slow sim. The ledger command parses log/plan records mechanically; it does not require reading the build log's prose.

Contract:
  "The player sees the final tables before the playtest; the player decides any band the plan could not meet."
  "Close with one full pnpm check." Only this pack owns that full gate; each district pack owns its named sweeps.
  No proposed band becomes settled, and no unresolved measured miss becomes a pass, without the player's recorded decision. Missing evidence stays visible. SM-6 reference deletion still requires explicit player OK and is not part of this pack.

1. Assemble final district links, baseline/candidate/applied rows and player decisions in results.md; show the table before the playtest. Obtain decisions on unreachable bands, P2 for bridges/foundry, academy room-5 comparison, IQ lever/opener and attrition-heart difficulty. While decisions are pending, complete independent verification and records; approval continuations run in their original owned packs. Record retain/defer explicitly instead of applying unapproved values.
2. After approved applications and final CAL-5/P reruns, run the full gate once on merged main and the full drawn-trip loop at 375×812. Record exact revision, summary, screenshots and device limits. Review the calibration diff for unintended rule changes; material findings get a fix pack and the relevant verification rerun, not broader write ownership here.
3. Write calibration-verification.md and closure records (plan State, DESIGN §11 accepted choices, TECH §7 data/bot changes, roadmap, status and task records). Run the existing ledger mechanically and account for every open/prose-only CAL ID. The orchestrator commits/pushes when its runtime permits and confirms CI/deploy for that revision. Do not mark complete with unverified gates, unrecorded decisions or application work owed.

Owed by this pack: CAL-G1 table-before-playtest and player band decisions; final full gate; build closure. Missing real phone/save data must be explicit in verification and status, not fabricated or silently dropped.
Done when: calibration-verification.md names the final revision, all eight district/drawn table links, final gate summary and screenshot evidence; results.md records each applied/retained/deferred row and every band miss's player disposition; ledger lists every unfinished item in status or shows CAL complete. CI/deploy confirmation is recorded by the integrating orchestrator. The player's playtest asks about feel/UX/direction, not finding bugs.
Verify: pnpm check
Sims owned: all tests/sim/** only for this final full gate; no parallel sim runs.
Phone check: yes, 375×812 full drawn-trip loop, reuse CAL-P hardware evidence only when its revision/corpus is still applicable.
```

## Decisions held for the player; boundaries for the routine runner

- Bridges/foundry adopting the canal band is P2, not an invented settled band. Academy room 5 lacks a directly comparable canal depth. The worker reports both facts with measurements.
- Quarter movement/opener/damage levers and hearts under attrition remain player questions. Measurement and other packs continue while those rows are pending.
- The only pre-specified candidate is SM-6 72 HP, conditional on new evidence and unchanged regression acceptance. CN-13's mother 56 HP is already merged; CAL does not apply that change a second time.
- CAL-N accounts for all core §1.1 literals; CAL-B accounts for pulse weights; CAL-D accounts for placeholder/doorway loot. Existing ACTIONS and GEN_LIMITS aliases are already data-owned.
- A missing kit/frame rule (including inactive Steward boil-over) needs its own source-ownership/design brief. CAL-5 must measure and report it; these calibration briefs grant no quiet structural rewrite. CAL begins its final passes only after EN-14 and kit completion.
- Remaining ending/copy/real-Chrome offline obligations stay with EN-14 or their existing owner; they are not hidden inside a numeric calibration pack.
