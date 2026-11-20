# Seam grows: verification (SM-15)

Written 2026-11-17 for [seam-grows-plan.md](seam-grows-plan.md): the plan's task acceptance lines (section 5) and its section 6 sweep, which is what SM-15 asks for ("section 7 passes" in the plan row means this sweep; section 7 itself holds three open questions, answered by their defaults). Sources: the build log rows (`grep -n 'SM-' build-program-log-archive.md`) and the test files on main. One row per acceptance line. "pass" names the test file (re-run for this file, see the note at the end; sim files are not re-run) or the commit that carried the proof. "not checked" means nothing on record can be pointed at: a phone check whose screenshots went to a scratchpad or tool-results folder and were not saved in the repo counts as not checked.

## 1. Task acceptance

| Check | How | Result |
|---|---|---|
| SM-0: `pnpm check` green; DK-10 can write the canals' spec against it | Contract test | pass (13715ba; tests/engine/sm0-contracts.test.ts) |
| SM-1: each hand lands as a cast of its kind; the cycle repeats; mixes with an earlier hand; spark hand bursts a cloud with three units; self-harm; familiars fall on its death; deterministic replay | Marginalia scenarios | pass (6b4bd29; tests/districts/marginalia.test.ts) |
| SM-2: phone check 375x812, the next hand and its tiles read without the inspect sheet; autofixer clean | Hand token, cycle banner, tile marks | not checked: the log says checked through a temporary Lab scenario but no screenshot is in the repo, and it records no autofixer run (logic: tests/ui/seam-hands.test.ts, 33e3416) |
| SM-3: `checkRoom` passes; every `P` fair for a 6 HP body (no foe telegraph on turn 1 at range 1 except the depth-1 bite); setup matrix in the handoff | Twelve re-laid layouts | pass (08307ec; tests/data/seam-rooms.test.ts, tests/data/integrity.test.ts) |
| SM-4: all scripted solutions hear the right district; bot reach at least 50 percent per (event, room) for the two rooms P4 names | Scripts and a seating sweep | pass (3d54fa8; tests/scenarios/seam-hearing.test.ts; log: reach 78 to 100 percent of 36 seatings) |
| SM-5: phone check, a fresh save shows five `???` lines; after a canal hearing four remain; nothing names a district | Owner's margin sheet | not checked for the phone: the log says checked in an 800x600 pane, no screenshot in the repo, and the sheet's scroll on a real 812px viewport is unconfirmed. Logic: pass (64862ed; tests/ui/seam-hints.test.ts) |
| SM-6: win-rate table per room in the handoff; first-evening tests still pass | Calibration | measured during CAL-1 below. The baseline heart is above the pair's band |
| SM-7: trips with 0 (refused), 1 and 3 fixture floors start, replay after reload, return after any floor, wipe; a storm on 3 in a floor hears the bathhouses | Lower Seam trip | pass (2483470; tests/districts/lower-seam-trip.test.ts) |
| SM-8: a fixture floor with a district-scoped rule rejects it; a lane floor drifts; offers never contain the intruding district's pages (fuzz) | Floor builder and loot table | pass (ee772b3; tests/districts/lower-seam-floor.test.ts, 15 tests including two fuzz) |
| SM-9: `checkFloor` passes; bot win rate at party 3 close to room 3 of the base Seam at party 2 | Canals' reference floor | pass for `checkFloor` and bot ends within the cap (5b22e31; tests/districts/canal-floor.test.ts). Win-rate closeness: not checked, the log says "no tuning" |
| SM-10: tests for the three door states; a fixture "cartographers cleared" opens it | Sealed door | pass (932dfd2; tests/districts/lower-seam-door.test.ts) |
| SM-11: phone check with 0, 1 and 5 fixture floors; no overlap with the Seam's caption | Stair, floor labels, door art | not checked: the log says the orchestrator viewed the 5-floor shot, but no screenshot is in the repo (logic: tests/app/lower-seam-map.test.ts, 8998e75) |
| SM-12: no answer before the Marginalia; proof answers once a containing cluster is proven; mastery at level II; Lab and Bench never trigger | `noteFor` | pass (8754dc5; tests/engine/margins.test.ts, tests/app/margin-answered.test.ts) |
| SM-13: each answer replies to the page's first note; none names the owner | Approved answers document | pass (1f758e9; tests/data/margin-answers.test.ts) |
| SM-14: phone check of an answered and an unanswered page; autofixer clean | Codex answered pages | not checked: the log says checked (Cashing In answered, a rune unanswered) but no screenshot is in the repo; the trip-page card and an answered rune page were not checked; no autofixer run recorded (data: tests/data/margin-answers.test.ts, 4f13f09) |
| G1: a fresh notebook through the Seam with two apprentices; readability, HP and clutter feedback recorded | Player playtest gate | not checked: no playtest on record |
| SM-15: this file; the section 6 sweep below | Verification and handoff | pass as a record (this file). Status notes for DESIGN and TECH are the 2026-11-17 rows; the ROADMAP note is the orchestrator's. The rows marked "not checked" stay open |

## 2. Section 6 sweep

| Check | How | Result |
|---|---|---|
| Scenarios: each hand, the cycle, mixes with earlier hands, the spark hand's storm | Marginalia scenarios | pass (tests/districts/marginalia.test.ts) |
| Scenarios: the spark hand's fire and conduct; anchoring against Shove, Pull and Swap | The anchored trait is asserted; no test is named for Shove, Pull or Swap against it | not checked beyond the anchored trait |
| Scenarios: familiars falling; one scripted solution per hearing event per room variant | SM-1 and SM-4 | pass (tests/districts/marginalia.test.ts, tests/scenarios/seam-hearing.test.ts) |
| Bot and fuzz: hearing reach over every start-point assignment | Seating sweep | pass (3d54fa8; tests/sim/seam-hearing-sweep.test.ts, tests/scenarios/seam-hearing.test.ts) |
| Bot and fuzz: base Seam calibration at party 1 to 3 | SM-6 | measured for all three party sizes in CAL-1 below |
| Bot and fuzz: lower Seam trips over 0 to 5 fixture floors (never stranded, floors fixed per trip, no district pages in offers, door state monotone) | Trip, floor and door tests | pass for floors fixed, offers and door states (tests/districts/lower-seam-trip.test.ts, lower-seam-floor.test.ts, lower-seam-door.test.ts). "Never stranded" and "monotone" are not named in a test: not checked |
| Bot and fuzz: the 500-event cap respected with the spark hand | Cap test | not checked: no test names the spark hand under the cap |
| Integrity: `checkRoom` on all Seam layouts | Room tests | pass (tests/data/seam-rooms.test.ts) |
| Integrity: `checkFloor` on every `IntrusionSpec` | Floor tests | pass for the canals' floor (tests/districts/canal-floor.test.ts); the ink quarter's (tests/districts/ink-floor.test.ts) |
| Integrity: every answer's `when` names a subject the page has; five hints for five districts | Data tests | pass (tests/data/margin-answers.test.ts, tests/ui/seam-hints.test.ts) |
| Phone: the Marginalia's telegraph and cycle strip | SM-2 | not checked: see SM-2 |
| Phone: a re-laid 5x6 room with three apprentices | Not in any log row | not checked |
| Phone: the Seam's margin sheet | SM-5 | not checked: see SM-5 |
| Phone: the stair, floor labels and door states on the map; Set out's quiet line | SM-10, SM-11 | not checked: see SM-10 and SM-11 |
| Phone: an answered codex page | SM-14 | not checked: see SM-14 |
| Phone: light and dark | Both themes | not checked: no dark theme exists yet (the log notes this for several tasks) |
| `svelte-autofixer` on every changed component | Per-task duty | not checked: run on StairSlot only (SM-11); none recorded for the rest |

## Notes

- Re-run on 2026-11-17: every non-sim test file cited in the six close-out verification files, together: 112 files, 5327 passed, 12 todo. `tests/sim/` was not run; rows that cite a sim name the log row.
- Open follow-ups from the log rows, none a failed check: `floorListedRules()` still returns `[]` (SM-8, SM-9); a bridges pier rule must call `removeFromRoom` (SM-8); the step pill covers the 16/16 HP on its tile and the corner badge under a unit token is partly hidden (SM-2, the pill fixed under SM-5).
- Rules and accepted Proposals: DESIGN section 11, 2026-11-17 "Seam grows built (SM)".

## 3. CAL-1 baseline

The baseline uses the current 16 HP Marginalia and the shared greedy bot (gauge and cracks on, Hold scoring off). The fresh table runs seeds 1–50 in each registered layout with the starter pages and full HP and charges. The worn table follows 50 real trips per party, using the first loot offer, keeping the doorway page and pushing on. The trip carries HP and spell charges forward through the normal app flow. Each fight has a 40-round limit and a 600-action budget.

`CAL_DISTRICTS=seam,canals CAL=1 pnpm vitest run tests/sim/calibration-tables.test.ts --reporter=dot` produces the registered-room tables. `CAL1_MEASURE=seam-16 pnpm vitest run tests/sim/seam-calibration.test.ts -t 'CAL-1 measurement' --reporter=dot` adds heart event timing and battle entry/exit HP and charges.

### All layouts at 16 HP

Each cell shows wins/reached, mean total HP/charges on entry, and mean final round. A stop suffix, when present, gives all stalls / the subset stopped by the action budget. All worn rows are out of 50 trip starts per party, with the reached counts split by layout.

| State | Depth | Layout | Solo | Pair | Trio |
| --- | --- | --- | --- | --- | --- |
| fresh | 1 | A · The lamplit landing | 50/50 · 6.0/5.0 · 3.0 r | 50/50 · 14.0/10.0 · 2.0 r | 50/50 · 20.0/16.0 · 1.2 r |
| fresh | 1 | B · The drainage cut | 50/50 · 6.0/5.0 · 3.0 r | 50/50 · 14.0/10.0 · 2.1 r | 50/50 · 20.0/16.0 · 1.6 r |
| fresh | 1 | C · The coal chute | 50/50 · 6.0/5.0 · 3.0 r | 50/50 · 14.0/10.0 · 2.0 r | 50/50 · 20.0/16.0 · 1.2 r |
| fresh | 2 | A · The oil cellar | 50/50 · 6.0/5.0 · 3.0 r | 50/50 · 14.0/10.0 · 2.1 r | 50/50 · 20.0/16.0 · 1.6 r |
| fresh | 2 | B · The scullery | 50/50 · 6.0/5.0 · 3.0 r | 50/50 · 14.0/10.0 · 2.0 r | 50/50 · 20.0/16.0 · 1.4 r |
| fresh | 2 | C · The flooded stair | 50/50 · 6.0/5.0 · 3.0 r | 50/50 · 14.0/10.0 · 2.0 r | 50/50 · 20.0/16.0 · 1.6 r |
| fresh | 3 | A · The sentry post | 50/50 · 6.0/5.0 · 4.9 r | 50/50 · 14.0/10.0 · 2.4 r | 50/50 · 20.0/16.0 · 2.1 r |
| fresh | 3 | B · The brass gallery | 50/50 · 6.0/5.0 · 5.2 r | 50/50 · 14.0/10.0 · 2.5 r | 50/50 · 20.0/16.0 · 2.3 r |
| fresh | 3 | C · The boiler alley | 50/50 · 6.0/5.0 · 5.0 r | 50/50 · 14.0/10.0 · 3.1 r | 50/50 · 20.0/16.0 · 2.9 r |
| fresh | 4 | A · Heart of the Seam | 50/50 · 6.0/5.0 · 11.6 r | 50/50 · 14.0/10.0 · 4.1 r | 50/50 · 20.0/16.0 · 3.9 r |
| fresh | 4 | B · The furnace hall | 50/50 · 6.0/5.0 · 11.5 r | 50/50 · 14.0/10.0 · 4.3 r | 50/50 · 20.0/16.0 · 3.7 r |
| fresh | 4 | C · The old foundry | 37/50 · 6.0/5.0 · 12.4 r | 50/50 · 14.0/10.0 · 3.7 r | 50/50 · 20.0/16.0 · 3.0 r |
| trip-worn | 1 | A · The lamplit landing | 21/21 · 6.0/5.0 · 3.0 r | 21/21 · 14.0/10.0 · 2.0 r | 21/21 · 20.0/16.0 · 1.2 r |
| trip-worn | 1 | B · The drainage cut | 18/18 · 6.0/5.0 · 3.0 r | 18/18 · 14.0/10.0 · 2.1 r | 18/18 · 20.0/16.0 · 1.5 r |
| trip-worn | 1 | C · The coal chute | 11/11 · 6.0/5.0 · 3.0 r | 11/11 · 14.0/10.0 · 2.0 r | 11/11 · 20.0/16.0 · 1.3 r |
| trip-worn | 2 | A · The oil cellar | 8/13 · 6.0/2.0 · 17.6 r · 5/0 stops | 13/13 · 14.0/7.0 · 2.1 r | 13/13 · 20.0/13.0 · 1.7 r |
| trip-worn | 2 | B · The scullery | 14/21 · 6.0/2.0 · 15.7 r · 7/0 stops | 21/21 · 14.0/7.0 · 2.0 r | 21/21 · 20.0/13.0 · 1.4 r |
| trip-worn | 2 | C · The flooded stair | 12/16 · 6.0/2.0 · 12.8 r · 4/0 stops | 16/16 · 14.0/7.0 · 2.0 r | 16/16 · 20.0/13.0 · 1.4 r |
| trip-worn | 3 | A · The sentry post | 12/12 · 6.0/0.0 · 7.4 r | 19/19 · 13.8/4.1 · 2.7 r | 19/19 · 19.9/10.1 · 2.0 r |
| trip-worn | 3 | B · The brass gallery | 10/14 · 6.0/0.0 · 13.3 r · 2/0 stops | 20/20 · 13.9/4.0 · 2.8 r | 20/20 · 20.0/10.0 · 2.3 r |
| trip-worn | 3 | C · The boiler alley | 5/8 · 6.0/0.0 · 20.4 r · 3/0 stops | 11/11 · 13.8/4.2 · 4.3 r | 11/11 · 19.7/10.2 · 3.0 r |
| trip-worn | 4 | A · Heart of the Seam | 1/8 · 3.0/0.0 · 10.6 r | 12/14 · 12.6/1.1 · 10.6 r | 14/14 · 18.6/6.3 · 4.8 r |
| trip-worn | 4 | B · The furnace hall | 8/9 · 2.2/0.0 · 13.6 r | 14/14 · 12.0/0.9 · 9.3 r | 14/14 · 18.7/6.5 · 5.5 r |
| trip-worn | 4 | C · The old foundry | 8/10 · 3.6/0.0 · 14.5 r | 20/22 · 12.4/0.9 · 9.8 r | 22/22 · 18.9/6.6 · 3.9 r |

Fresh heart wins were **137/150 (91.3%)** solo, **150/150 (100%)** for the pair and **150/150 (100%)** for the trio. The pair exceeds the 60% upper bound by 40 points. The fresh trio-minus-pair margin is 0 points. Full-trip clears were **17/50**, **46/50** and **50/50**. Solo trips ended in 12 losses and 21 stalls. The four remaining pair trips were losses, leaving a trio-minus-pair clear margin of +8 points.

## 4. CAL-1 Marginalia comparison

Run once per party with `CAL1_PARTY` set to 1, 2 or 3. For example, `CAL1_MEASURE=seam-72 CAL1_PARTY=2 pnpm vitest run tests/sim/seam-calibration.test.ts -t 'CAL-1 measurement' --reporter=dot` uses the same seeds and shared policy as the 16 HP sweep. It changes only the Marginalia's HP within the measurement. The two familiars, reach of 1, and per-tile Spark are held fixed. Each party enters all three fresh heart layouts and also starts 50 real trips. The earlier fresh rooms are unaffected by the boss HP.

The unchanged “the heart plays to an end and is no walkover” regression won **15/15** at 16 HP and **7/15** at 72 HP (A 4/5, B 0/5, C 3/5). The historical regression failure at 72 HP did not recur. This test uses its existing setup and small seed set, so the balance band is checked against the registered-room sweep.

At 72 HP, plain recorded-action replay failed for all five Seam trip references: the three win fixtures produced three rooms against four recorded, and the two wipe fixtures differed in the heart event log. The reference tag `ref/sm-6` and its retained branch `worktree-agent-a7d9ce60e430bee68` still point to `4c77215`. The reference's inflated 20 HP party starting point exists for golden coverage.


### Heart by party and layout

A is Heart of the Seam, B is The furnace hall, and C is The old foundry. The round is the median final battle round. Hands are landed hand events per fight. The first-Spark column gives fights with a Spark hand / reached, followed by the mean first such round. HP and charges are means across all fights, including losses and stalls. All worn cohorts started 50 trips per party.

| Marginalia HP | Party | State | Layout | Wins/reached | Stalls/budget stops | Median final round | Mean HP in → out | Mean charges in → out | Mean hands | First Spark fights @ round |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 16 | 1 | fresh | A | 50/50 | 0/0 | 12.0 | 6.0 → 2.6 | 5.0 → 0.0 | 10.8 | 50/50 @ 5.0 |
| 16 | 1 | fresh | B | 50/50 | 0/0 | 12.0 | 6.0 → 5.1 | 5.0 → 0.0 | 10.5 | 50/50 @ 5.0 |
| 16 | 1 | fresh | C | 37/50 | 0/0 | 11.0 | 6.0 → 1.8 | 5.0 → 0.0 | 11.7 | 50/50 @ 5.0 |
| 16 | 1 | trip-worn | A | 1/8 | 0/0 | 10.0 | 3.0 → 0.1 | 0.0 → 0.0 | 10.5 | 8/8 @ 5.0 |
| 16 | 1 | trip-worn | B | 8/9 | 0/0 | 15.0 | 2.2 → 0.1 | 0.0 → 0.0 | 13.4 | 9/9 @ 5.0 |
| 16 | 1 | trip-worn | C | 8/10 | 0/0 | 15.0 | 3.6 → 2.4 | 0.0 → 0.0 | 14.0 | 9/10 @ 5.0 |
| 16 | 2 | fresh | A | 50/50 | 0/0 | 4.0 | 14.0 → 12.8 | 10.0 → 4.2 | 3.1 | 2/50 @ 5.0 |
| 16 | 2 | fresh | B | 50/50 | 0/0 | 5.0 | 14.0 → 13.5 | 10.0 → 2.8 | 3.4 | 3/50 @ 5.0 |
| 16 | 2 | fresh | C | 50/50 | 0/0 | 4.0 | 14.0 → 13.6 | 10.0 → 3.6 | 2.7 | 0/50 @ — |
| 16 | 2 | trip-worn | A | 12/14 | 0/0 | 10.0 | 12.6 → 4.9 | 1.1 → 0.0 | 10.0 | 14/14 @ 5.0 |
| 16 | 2 | trip-worn | B | 14/14 | 0/0 | 9.0 | 12.0 → 8.2 | 0.9 → 0.0 | 8.3 | 14/14 @ 5.0 |
| 16 | 2 | trip-worn | C | 20/22 | 0/0 | 9.5 | 12.4 → 8.0 | 0.9 → 0.0 | 8.9 | 22/22 @ 5.0 |
| 16 | 3 | fresh | A | 50/50 | 0/0 | 4.0 | 20.0 → 18.8 | 16.0 → 10.0 | 2.9 | 0/50 @ — |
| 16 | 3 | fresh | B | 50/50 | 0/0 | 4.0 | 20.0 → 19.0 | 16.0 → 9.1 | 2.7 | 0/50 @ — |
| 16 | 3 | fresh | C | 50/50 | 0/0 | 3.0 | 20.0 → 19.4 | 16.0 → 9.6 | 2.0 | 0/50 @ — |
| 16 | 3 | trip-worn | A | 14/14 | 0/0 | 5.0 | 18.6 → 14.8 | 6.3 → 2.0 | 4.4 | 8/14 @ 5.0 |
| 16 | 3 | trip-worn | B | 14/14 | 0/0 | 5.0 | 18.7 → 14.9 | 6.5 → 2.2 | 4.6 | 7/14 @ 5.0 |
| 16 | 3 | trip-worn | C | 22/22 | 0/0 | 4.0 | 18.9 → 17.9 | 6.6 → 1.8 | 3.0 | 0/22 @ — |
| 72 | 1 | fresh | A | 0/50 | 0/0 | 20.0 | 6.0 → 0.0 | 5.0 → 0.0 | 22.7 | 50/50 @ 5.0 |
| 72 | 1 | fresh | B | 0/50 | 0/0 | 20.0 | 6.0 → 0.0 | 5.0 → 0.0 | 19.0 | 50/50 @ 5.0 |
| 72 | 1 | fresh | C | 0/50 | 0/0 | 15.0 | 6.0 → 0.0 | 5.0 → 0.0 | 18.5 | 50/50 @ 5.0 |
| 72 | 1 | trip-worn | A | 0/8 | 0/0 | 10.0 | 3.0 → 0.0 | 0.0 → 0.0 | 11.3 | 8/8 @ 5.0 |
| 72 | 1 | trip-worn | B | 0/9 | 0/0 | 15.0 | 2.2 → 0.0 | 0.0 → 0.0 | 13.9 | 9/9 @ 5.0 |
| 72 | 1 | trip-worn | C | 0/10 | 2/0 | 27.5 | 3.6 → 0.6 | 0.0 → 0.0 | 27.4 | 9/10 @ 5.0 |
| 72 | 2 | fresh | A | 35/50 | 0/0 | 20.0 | 14.0 → 0.6 | 10.0 → 0.0 | 18.6 | 50/50 @ 5.0 |
| 72 | 2 | fresh | B | 8/50 | 0/0 | 20.0 | 14.0 → 0.4 | 10.0 → 0.0 | 19.7 | 50/50 @ 5.0 |
| 72 | 2 | fresh | C | 46/50 | 0/0 | 21.0 | 14.0 → 5.6 | 10.0 → 0.0 | 20.5 | 50/50 @ 5.0 |
| 72 | 2 | trip-worn | A | 0/14 | 0/0 | 22.5 | 12.6 → 0.0 | 1.1 → 0.0 | 22.9 | 14/14 @ 5.0 |
| 72 | 2 | trip-worn | B | 0/14 | 0/0 | 15.0 | 12.0 → 0.0 | 0.9 → 0.0 | 16.9 | 14/14 @ 5.0 |
| 72 | 2 | trip-worn | C | 3/22 | 5/0 | 34.5 | 12.4 → 1.6 | 0.9 → 0.0 | 30.2 | 22/22 @ 5.0 |
| 72 | 3 | fresh | A | 43/50 | 0/0 | 10.0 | 20.0 → 5.7 | 16.0 → 2.6 | 9.6 | 50/50 @ 5.0 |
| 72 | 3 | fresh | B | 34/50 | 0/0 | 14.5 | 20.0 → 4.4 | 16.0 → 1.9 | 13.1 | 50/50 @ 5.0 |
| 72 | 3 | fresh | C | 50/50 | 0/0 | 9.0 | 20.0 → 10.9 | 16.0 → 0.1 | 8.1 | 50/50 @ 5.0 |
| 72 | 3 | trip-worn | A | 4/14 | 0/0 | 25.0 | 18.6 → 0.3 | 6.3 → 0.5 | 22.9 | 14/14 @ 5.0 |
| 72 | 3 | trip-worn | B | 2/14 | 0/0 | 20.0 | 18.7 → 0.2 | 6.5 → 0.7 | 20.8 | 14/14 @ 5.0 |
| 72 | 3 | trip-worn | C | 15/22 | 1/0 | 26.5 | 18.9 → 4.0 | 6.6 → 0.1 | 27.4 | 22/22 @ 5.0 |

At 72 HP the fresh heart clears are **0/150 (0%)** solo, **89/150 (59.3%)** pair and **127/150 (84.7%)** trio. The pair meets the 40–60% band with 0.7 points to spare. Layouts A/B/C are **70% / 16% / 92%**, a 76-point spread. The trio margin is +25.3 points fresh (0 at 16 HP). Pair medians rise from 4–5 to 20–21 rounds and mean landed hands from 3.1 to 19.6. Round-5 Spark lands in 5/150 fresh pair fights at 16 HP and 150/150 at 72 HP.

At 72 HP, full-trip clears drop from 17/46/50 to **0/3/21 out of 50** for solo/pair/trio, with a +36-point trio-minus-pair margin. Earlier worn fights match at both HP values. At 72 HP the solo has 27 losses and 23 stalls, the pair 42 losses and 5 stalls, and the trio 28 losses and 1 stall. The pair reaches every heart in both sweeps with about 12.3 HP and 1.0 charge, then averages 7.2 HP out at 16 HP or 0.7 at 72 HP. Full-trip attrition is reported alongside the fresh band.

### Applied in CAL-1 task 3

The authored Marginalia is now 72 HP, up from 16 HP. At normal starting HP the measured fresh-pair rate moves from 150/150 to 89/150 (100% to 59.3%), inside the 40–60% band. Trip-worn pair clears drop from 46/50 to 3/50. Furnace hall remains the hardest fresh layout at 8/50; A and C clear 35/50 and 46/50. Familiars and hand reach retain their measured values.

The drawn frame inherited authored HP before this change. At 72 HP the EN-2 lite-bot check produced an unverified fallback within the 16-round heart limit. The drawn frame now supplies its own 16 HP to both the trial and the playable encounter, including reloads. This preserves the drawn encounter's previous difficulty and generation limits.

The three win goldens now use `SEAM_DEEP` with `maxRounds: 100` and `startHp: 20` for replay coverage. The three furnace hall wins took 158, 142, and 116 actions, up from 48, 44, and 40. In the two `BOT` wipe recordings, the heart damage events report 56 more HP left and the action counts are identical. All five outcomes were preserved. The recording pass wrote ledger and jar fields the replay ignores; the saved fixtures and future recordings omit those fields. The four-file replay and play-through check passed 21/21 with recording off.
