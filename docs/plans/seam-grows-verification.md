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
| SM-6: win-rate table per room in the handoff; first-evening tests still pass | Calibration | not checked: not merged. The 72 HP change was dropped on the player's rule of 2026-11-04 (no balance tuning mid-build); the calibration test and the table were never merged and wait for calibration (CAL plan) |
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
| Bot and fuzz: base Seam calibration at party 1 to 3 | SM-6 | not checked: deferred (see SM-6 above) |
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
