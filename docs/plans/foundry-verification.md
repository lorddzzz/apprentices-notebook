# Bell foundry: verification (CL-6, record half)

Written 2026-11-17 for [foundry-plan.md](foundry-plan.md) section 5, from the build log rows (`grep -n 'BF-' build-program-log.md build-program-log-archive.md`) and the test files on main. The foundry was built and opened without a Close; this file is that Close's record. One row per acceptance line. "pass" names the test file (re-run for this file, see the note at the end; sim files are not re-run) or the commit that carried the proof. "not checked" means nothing on record can be pointed at: a phone check with no screenshot in the repo counts as not checked. The Close checks themselves (section 3) belong to Pack N2.

## 1. Task acceptance

BF-0 to BF-2 were built before the plan was repacked, so the plan's table has no acceptance line for them; the rows below use the log's description.

| Check | How | Result |
|---|---|---|
| BF-0: contracts (tones, bell pieces, rule and trip state, events) | Contract test | pass (58e1efc; tests/districts/bf0-contracts.test.ts) |
| BF-1: tone glyph set readable in colour, greyscale and colour-blind views | Gallery sheet `#/gallery?part=foundry` | pass (af12570; screenshots docs/plans/foundry-evidence/bf1-light-colour.jpg, bf1-light-greyscale.jpg, bf1-light-protan.jpg, bf1-light-deutan.jpg, bf1-dark-greyscale.jpg) |
| BF-2: bell, rope, hook and great-bell pieces; notation; clouds only | Piece tests | pass (7599388; tests/districts/foundry/pieces.test.ts) |
| BF-3: the strike sources and non-sources, a tone ringing once and humming | Acceptance tests of Pack 0 | pass (72e8b7f; tests/districts/foundry/bells.acceptance.test.ts) |
| BF-4: a ring chain cut at every event index projects to the board it ended on; random bell nets never reach the cap | Cascade proof | pass (3eb1d0d; tests/districts/foundry/cascade.acceptance.test.ts) |
| BF-5: Brass retunes a bell and rings the new tone; Brass wraps; a Steam cloud muffles | Retune tests | pass (1fb3f26; tests/districts/foundry/retune.acceptance.test.ts) |
| BF-6, BF-7: the Ringer, the Clapper and the Detuner telegraph, fizzle, retune and choose as the plan states | Staff tests | pass (1742421; tests/districts/foundry/staff.acceptance.test.ts) |
| BF-8: each great-bell lock, the peal, allied bells sparing the party | Peal tests | pass (c65f7b1; tests/districts/foundry/peal.acceptance.test.ts) |
| BF-9: the tune functions and the Carillonneur as a registered rival, no stand-in | Tune tests | pass (4e0e89c; tests/districts/foundry/tune.acceptance.test.ts) |
| BF-24: the note is hidden until the page is held, then offered, then credited; page text present | Carillonneur tests | pass (089473c; tests/rivals/carillonneur.test.ts) |
| BF-10: `checkRoom` passes for every layout; a scripted solve of each puzzle with the starting seven plus Brass; "a room bonus is its great bell rung and the room won" is a test | Room tests | pass (df10e08; tests/data/foundry-rooms.test.ts, tests/districts/foundry/peal.acceptance.test.ts) |
| BF-11: as BF-10; the Unison puzzle has a scripted solve with 1, 2 and 3 apprentices; killing the Clapper in puzzle 4 breaks the chord | Room tests | pass (68524b5; tests/data/foundry-rooms.test.ts) |
| BF-12: `checkRoom` passes; allied bell hung at each hook for every note rung; the heart's tune is seeded from the trip seed; the frame places the Carillonneur; a scripted full heart fight | Heart tests | pass (170837a; tests/data/foundry-rooms.test.ts, tests/districts/foundry/peal.acceptance.test.ts, tests/districts/heart-frames.test.ts) |
| BF-13: the offer appears only when RC's preconditions hold; a trip can always bank Unison; every room and the heart has its text | Loot and text tests | pass (45c216f; tests/data/foundry-rooms.test.ts) |
| BF-14: a hearing test, meets and narrowly misses | Hearing | pass (4127679; tests/data/foundry-threshold.test.ts) |
| BF-15: `checkRoom` passes; a scripted Shove solve from every start point; Retry keeps the same spots; Q3 recorded | Threshold room | pass (6320e44; tests/data/foundry-threshold.test.ts) |
| BF-16: a fixture floor builds; a strike rings the pair and it hums; no tune or staff appear | Lower-Seam floor | pass (eec836e; tests/data/foundry-intrusion.test.ts) |
| BF-17: phone check, Lab board at 375x812, light and dark: three tones on a 7x9 board, a ring mid-animation, a Ringer telegraph, humming and muffled bells, a struck-bell highlight; autofixer clean | Board art | not checked: the log says light only (no dark theme exists) and no screenshot is in the repo (logic: tests/ui/foundry-board.test.ts, 038eba7). The log records the autofixer as run on some components only |
| BF-19: the Bench lists bells and foes only after met; the Lab places every piece and foe; a preset per lock loads (Lab, 375x812, light) | Bench and Lab | pass for Bench and Lab logic (a9dae1d; tests/ui/foundry-bench.test.ts). The phone view: not checked, no screenshot in the repo |
| BF-18: phone check, Lab heart fixture 7x9 at 375x812, light and dark: banner with the called note and countdown, four hung bells and one tapped to strike, the Peal telegraph; autofixer clean | Heart UI | not checked: light only per the log, no screenshot in the repo (logic: tests/ui/foundry-board.test.ts, 5385674) |
| BF-20: the bot prefers the cast whose ring pulses a foe; 200 seeded trips of random legal play find no throw and no cap overrun | Bot term and fuzz | pass (a8bd59a; tests/sim/foundry.test.ts). The log records that the bot never wins room 4 or the heart headless (CAL-4) |
| BF-22: golden fixtures identical; `pnpm check:fast` green; a headless trip from room 1 to the heart runs; returning home or a wipe discards the rung bells | The foundry opens | pass (139c416; tests/sim/foundry.test.ts, tests/app/save-compat.test.ts, tests/run/golden.test.ts; fixtures tests/fixtures/saves/foundry-mid-trip.json and foundry-returned.json) |
| BF-F1: a table of real behaviours without rows; every pair reads sensibly in all four combinations | Audit and draft | pass (e6e3c78; tests/scenarios/foundry-audit-lines.test.ts) |
| BF-FG: approved text is the spec | Design window 2026-11-12e | pass (DESIGN section 11, 2026-11-12 "Design window 2026-11-12e") |
| BF-F2: `fourCombos` per margin line; one scenario per capstone | 29 variants stamped | pass (b071e86; tests/scenarios/footnotes/foundry-runes.test.ts, tests/scenarios/footnotes/foundry-solvents.test.ts) |
| BF-F3: as BF-F2; the note is hidden, then offered, then credited | Rivet, Filings and the Carillonneur's note | pass (fd8eb8f; tests/scenarios/footnotes/foundry-solvents.test.ts, tests/rivals/carillonneur.test.ts) |
| BF-G1: feedback logged; numbers go to the CAL plan, rule changes to a new brief | Player playtest gate | not checked: no playtest on record |

## 2. Plan section 6 sweep (the part that was not tied to one task)

| Check | How | Result |
|---|---|---|
| Save and reload at every room and mid-heart | Two recorded saves exist (mid-trip, returned) | pass for those two saves (139c416; tests/app/save-compat.test.ts). Every room and mid-heart: not checked |
| Golden fixtures for Seam and canals stay identical with the foundry registered | Golden trips | pass (139c416; tests/run/golden.test.ts) |
| Phone: tones in colour and greyscale, light and dark, on a 7x9 board | Close | not checked: CL-6, done by N2 (the BF-1 sheet covers the glyphs, not a 7x9 board) |
| Phone: each great bell; the threshold; Desk margins for the batch | Close | not checked: CL-6, done by N2 |

## 3. Close checks (CL-6)

| Check | How | Result |
|---|---|---|
| Full gate: `pnpm check`, sims included | Run once at Close | not checked: CL-6, done by N2 |
| Full-trip phone check at 375x812 of foundry-plan section 6, screenshots saved under `docs/plans/foundry-evidence/` | `verify` skill | not checked: CL-6, done by N2 |
| Code review of the foundry's share of kit and districts | `code-review` run | not checked: CL-6, done by N2 |
| Plan `State:` line and ROADMAP row | Records | not checked: CL-6, done by N2 |

## Notes

- Re-run on 2026-11-17: every non-sim test file cited in the six close-out verification files, together: 112 files, 5327 passed, 12 todo. `tests/sim/` was not run; rows that cite a sim name the log row.
- Known debt from the log rows, none a failed check: the bot never wins room 4 or the heart headless (CAL-4); six existing tests that assumed the foundry unopened were edited at BF-22; the foundry's art was checked in light only.
- Rules and proposals of the build: DESIGN section 11, 2026-11-11 "Foundry ring timing and the Detuner", 2026-11-12 and 2026-11-12e design windows, and TECH section 7 "Settle points and kinds on pieces".
