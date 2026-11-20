# Bell foundry: verification (CL-6)

Written 2026-11-17 for [foundry-plan.md](foundry-plan.md) section 5, from the build log rows (`grep -n 'BF-' build-program-log.md build-program-log-archive.md`) and the test files on main. The foundry was built and opened without a Close; this file is that Close's record. One row per acceptance line. "pass" names the test file (re-run for this file, see the note at the end; sim files are not re-run) or the commit that carried the proof. "not checked" means nothing on record can be pointed at: a phone check with no screenshot in the repo counts as not checked. The Close checks themselves (section 3) were run by Pack N2 on 2026-11-18 (phone shots against main 1e2365b, the build stamp in each; full gate on N2's branch).

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
| BF-17: phone check, Lab board at 375x812, light and dark: three tones on a 7x9 board, a ring mid-animation, a Ringer telegraph, humming and muffled bells, a struck-bell highlight; autofixer clean | Board art | pass for the trip boards at 375x812, light (N2: three tones, Ringer telegraphs, humming and clouded bells on rooms 1-4 and the 7x9 heart; docs/plans/foundry-evidence/cl6-01-room1.jpg, cl6-12-room2.jpg, cl6-13-room3.jpg, cl6-14-room4.jpg, cl6-20-heart.jpg). Dark: not applicable (the app has no dark theme). A ring mid-animation and a struck-bell highlight: not checked (headless shots, no cast played; logic: tests/ui/foundry-board.test.ts, 038eba7) |
| BF-19: the Bench lists bells and foes only after met; the Lab places every piece and foe; a preset per lock loads (Lab, 375x812, light) | Bench and Lab | pass (a9dae1d; tests/ui/foundry-bench.test.ts). Phone, N2: every Lab preset loads at 375x812 with no horizontal overflow (cl6-4x-lab-tones.jpg, -reach, -match, -unison, -chord, -peal) |
| BF-18: phone check, Lab heart fixture 7x9 at 375x812, light and dark: banner with the called note and countdown, four hung bells and one tapped to strike, the Peal telegraph; autofixer clean | Heart UI | pass for the banner, called note, countdown, rival bar and Peal telegraph at 375x812 on a real heart (cl6-20-heart.jpg; greyscale cl6-21-heart-greyscale.jpg). Four hung bells with one tapped: not checked (the forced wins hang none; logic: tests/ui/foundry-board.test.ts, 5385674). Dark: not applicable |
| BF-20: the bot prefers the cast whose ring pulses a foe; 200 seeded trips of random legal play find no throw and no cap overrun | Bot term and fuzz | pass (a8bd59a; tests/sim/foundry.test.ts). The log records that the bot never wins room 4 or the heart headless (CAL-4). **Corrected by CAL-4 (section 4 below):** the pair and trio bots win the controlled heart in 92-100 % of fights (aware) and Pack K's 50/50 drawn wins were not a fluke; the lone apprentice wins it 54-71 % |
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
| Phone: tones in colour and greyscale, light and dark, on a 7x9 board | Close | pass (N2: the 7x9 heart in colour and greyscale, cl6-20-heart.jpg, cl6-21-heart-greyscale.jpg; the three tones read apart by stripe, hatch and dots). Dark: not applicable (no dark theme) |
| Phone: each great bell; the threshold; Desk margins for the batch | Close | pass (N2: the four lock presets reach, match, unison, chord and the peal, cl6-4x-lab-*.jpg, and rooms 1-4 on the trip; the threshold *The far bell* from the map's "Try the lock", cl6-30-map-foundry-locked.jpg, cl6-31-threshold.jpg; Desk margins of Toll, Coil, Unison, Filings and Rivet with seeded points, cl6-50-desk.jpg, cl6-51-desk-toll-margin.jpg, cl6-52-desk-filings-margin.jpg). The threshold was not solved on the phone (its solve from every start point is tests/data/foundry-threshold.test.ts) |

## 3. Close checks (CL-6)

| Check | How | Result |
|---|---|---|
| Full gate: `pnpm check`, sims included | Run once at Close | pass (N2 branch at e3a7aea, 2026-11-18: 418 files, 9197 passed, 1 expected fail, 2 skipped, 14 todo; tests/sim/foundry.test.ts included) |
| Full-trip phone check at 375x812 of foundry-plan section 6, screenshots saved under `docs/plans/foundry-evidence/` | `verify` skill | pass (N2: set out from the map, rooms 1-4, the heart, both heart picks, cleared, home, the map's heart mark; fights ended with the dev `forceWin`; no horizontal overflow on any screen; cl6-01 to cl6-25). The crossroads reads the generic "deeper than the lamplight" line in the foundry too (already a CAL copy item) |
| Code review of the foundry's share of kit and districts | `code-review` run | pass (N2: review (b) of kits and districts found nothing in the foundry, so a separate run over src/engine/districts/foundry/**, the foundry data and its drawing kit found 10 items; 1 fixed in place, the strike's one-blow check skipping foe tone rings; 9 briefed as Pack R6 in build-program-briefs.md) |
| Plan `State:` line and ROADMAP row | Records | pass (N2, 2026-11-18) |

## Notes

- Not checked at Close, none a failed check: save and reload at every room and mid-heart (two recorded saves only); a ring mid-animation, a struck-bell highlight and a tapped hung bell on the phone; BF-G1 (the player's playtest).
- Re-run on 2026-11-17: every non-sim test file cited in the six close-out verification files, together: 112 files, 5327 passed, 12 todo. `tests/sim/` was not run; rows that cite a sim name the log row.
- Known debt from the log rows, none a failed check: the bot never wins room 4 or the heart headless (CAL-4); six existing tests that assumed the foundry unopened were edited at BF-22; the foundry's art was checked in light only.
- Rules and proposals of the build: DESIGN section 11, 2026-11-11 "Foundry ring timing and the Detuner", 2026-11-12 and 2026-11-12e design windows, and TECH section 7 "Settle points and kinds on pieces".

## 4. CAL-4: foundry party and hung-bell tables (2026-11-20)

Produced by `tests/sim/foundry-calibration.test.ts` (test `CAL-4: foundry party and hung-bell tables`). Reproduce: `CAL4=1 CAL4_SEEDS=8 CAL4_PARTIES=2 CAL4_OUT=out.md pnpm vitest run tests/sim/foundry-calibration.test.ts` (one process per party, about 1-1.5 h each under load; the default run is a smoke of about 20 fights, no gate but no throw, no event-cap overrun and the hung-bell count equal to the request). Every fight is `botFight` on the room as the trip builds it (`flow.startBattle`), 40 rounds, 600 applied actions, lite off, starter lattices, no forced victory. Two policies are kept side by side because they differ: **default** (`botFight` with no options) and **aware** (`gauge + cracks`, CAL-B's declared district policy; the foundry's pulse term is read through `gauge`). 8 seeds per layout (24 fights per pooled cell). Party 1 = Draughtsman, 2 = + Stoker, 3 = + Runaway.

**Controlled heart.** The heart is started at each of its three authored layouts with a legal trip peal written before `startBattle`: bells from the first N rooms, each its own note (room + 1), N = 0..4. The test asserts that exactly N allied great bells hang on the board. These trials are labelled *controlled*: nobody earned the bells. Same seed, same layout in every bell column, so columns are paired. **Earned bells** come only from the real worn trips table at the end (the bot rings a great bell about once a trip at best: mean 0-1 at the heart's entry).

Columns: wins/n, win %, lost (party wiped), stalled (round limit, nobody down), budget stops (action budget spent first), mean rounds, median win round, member HP left as % of entry HP over all fights and over wins, mean members down.

### Reading the foundry tables

- **Pair and trio hearts are far above the P2 (canals') band.** Aware bot, controlled heart, pooled: party 2 wins 24/24 at every bell count (band 50-65 %), party 3 24/24; the default bot wins 75-100 % (party 2) and 79-88 % (party 3). Party 1 wins 13-17 of 24 (54-71 %), inside the band, but with n = 24 per cell and 3-4 stalls (round limit) under the aware bot at 2-3 bells.
- **0 bells is winnable at every party size** (party 1 54-58 %, party 2 92-100 %, party 3 83-100 %).
- **4 bells is not "clearly easier" today, and the 0-vs-4 gap cannot show at a saturated rate.** Paired 0 vs 4 (24 pairs): party 1 aware 13 both / 0 only-0 / 4 only-4 / 7 neither (rounds 18.8 -> 20.8, HP 37 -> 39 %); party 1 default 13 / 1 / 0 / 10 (HP 44 -> 30 %: bells hurt the default bot, which stands in its own bells' reach); party 2 aware 24 / 0 / 0 / 0; party 2 default 22 / 0 / 2 / 0; party 3 aware 24/0/0/0; party 3 default 18 / 2 / 1 / 3. No minimum point gap for "clearly easier" was invented; section 5 repeats the pair at 30 seeds for parties 1 and 3.
- The old "bot never wins the foundry heart" note is stale: see the corrected BF-20 row in section 1.
- **Rooms 1-4 fresh (aware bot, pooled over layouts):** party 2 and 3 100 % in every room; party 1 100 / 92 / 100 / **33 %**: 15 of the 24 room-4 fights stall at the round limit with nobody down ("The clock floor" 1/8 wins, 7 stalls; "The escapement" 0/8, 8 stalls; "The weights" 7/8), so that row reads as the aware bot not finishing the room, a bot limit; the default bot wins 92 / 83 / 100 / 58 %. Room 4 at party 2 (100 %) is above the band's 65-80 %.
- **Worn trips** (real loot and carried HP): the lone apprentice almost never reaches the heart (aware: stalls at rooms 2-3; default: wiped in room 2); the pair under the aware bot clears 1/8 trips, the trio 5/8. Stalls in worn rooms 3-4 (party 1-2 aware, 20-34 mean rounds) are the bot unable to finish a room it wins fresh; the cause was not examined (the room is won fresh in 100 % of party 2 fights), so they are labelled a likely bot limit, not balance evidence.
- Policy differences worth keeping: the aware bot is better everywhere the foundry is crowded (party 2 heart 100 % vs 75-100 %, party 3 100 % vs 79-88 %), so default-policy rows measure the bot. Party 1 aware has stalls (round limit) that default turns into losses.
- CAL-B asked CAL-4 to test the pulse term's member weight at 0 on the sounding yoke at party 1 first; that was **not done** here (see "not done" in section 5).

### Band status (P2, a Proposal; canals' band at party 2, aware bot, fresh)

| Room | Band | Foundry party 2 | Status |
|---|---|---|---|
| 1-2 | at least 85 % | 100 / 100 % | in band |
| 3 | at least 75 % | 100 % | in band |
| 4 | 65-80 % | 100 % | **above** (+20) |
| heart | 50-65 % | 92-100 % (0-4 bells) | **above** (+27 to +50) |
| party 3 within +10 of party 2 | | 100 vs 100 % | holds, both above |

#### Fresh rooms 1-4 (all layouts)

| party | policy | room | layout | wins/n | win % | lost | stalled | budget stops | mean rounds | median win round | HP left % (all) | HP left % (wins) | mean members down |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | default | 1 | The first flight | 6/8 | 75 | 2 | 0 | 0 | 3.8 | 4 | 63 | 83 | 0.3 |
| 1 | default | 1 | The landing | 8/8 | 100 | 0 | 0 | 0 | 4.0 | 4 | 88 | 88 | 0.0 |
| 1 | default | 1 | The stairwell | 8/8 | 100 | 0 | 0 | 0 | 5.0 | 5 | 100 | 100 | 0.0 |
| 1 | default | 2 | The gallery rail | 8/8 | 100 | 0 | 0 | 0 | 5.0 | 5 | 75 | 75 | 0.0 |
| 1 | default | 2 | The rope loft | 6/8 | 75 | 2 | 0 | 0 | 6.5 | 7 | 63 | 83 | 0.3 |
| 1 | default | 2 | The sounding floor | 6/8 | 75 | 2 | 0 | 0 | 7.3 | 7 | 50 | 67 | 0.3 |
| 1 | default | 3 | The long hall | 8/8 | 100 | 0 | 0 | 0 | 4.8 | 5 | 67 | 67 | 0.0 |
| 1 | default | 3 | The quiet nave | 8/8 | 100 | 0 | 0 | 0 | 5.3 | 5 | 88 | 88 | 0.0 |
| 1 | default | 3 | The tuning floor | 8/8 | 100 | 0 | 0 | 0 | 5.4 | 5 | 63 | 63 | 0.0 |
| 1 | default | 4 | The clock floor | 7/8 | 88 | 1 | 0 | 0 | 7.6 | 7 | 42 | 48 | 0.1 |
| 1 | default | 4 | The escapement | 4/8 | 50 | 4 | 0 | 0 | 11.5 | 6 | 42 | 83 | 0.5 |
| 1 | default | 4 | The weights | 3/8 | 38 | 5 | 0 | 0 | 8.9 | 5 | 25 | 67 | 0.6 |
| 1 | aware | 1 | The first flight | 8/8 | 100 | 0 | 0 | 0 | 4.0 | 4 | 88 | 88 | 0.0 |
| 1 | aware | 1 | The landing | 8/8 | 100 | 0 | 0 | 0 | 4.0 | 4 | 88 | 88 | 0.0 |
| 1 | aware | 1 | The stairwell | 8/8 | 100 | 0 | 0 | 0 | 4.0 | 4 | 83 | 83 | 0.0 |
| 1 | aware | 2 | The gallery rail | 8/8 | 100 | 0 | 0 | 0 | 5.0 | 5 | 75 | 75 | 0.0 |
| 1 | aware | 2 | The rope loft | 6/8 | 75 | 0 | 2 | 0 | 15.5 | 6 | 96 | 94 | 0.0 |
| 1 | aware | 2 | The sounding floor | 8/8 | 100 | 0 | 0 | 0 | 6.5 | 7 | 96 | 96 | 0.0 |
| 1 | aware | 3 | The long hall | 8/8 | 100 | 0 | 0 | 0 | 4.4 | 4 | 100 | 100 | 0.0 |
| 1 | aware | 3 | The quiet nave | 8/8 | 100 | 0 | 0 | 0 | 5.5 | 5 | 90 | 90 | 0.0 |
| 1 | aware | 3 | The tuning floor | 8/8 | 100 | 0 | 0 | 0 | 6.0 | 7 | 79 | 79 | 0.0 |
| 1 | aware | 4 | The clock floor | 1/8 | 13 | 0 | 7 | 0 | 36.6 | 6 | 94 | 50 | 0.0 |
| 1 | aware | 4 | The escapement | 0/8 | 0 | 0 | 8 | 0 | 41.0 | — | 100 | — | 0.0 |
| 1 | aware | 4 | The weights | 7/8 | 88 | 0 | 1 | 0 | 14.1 | 12 | 96 | 100 | 0.0 |
| 2 | default | 1 | The first flight | 8/8 | 100 | 0 | 0 | 0 | 3.0 | 3 | 65 | 65 | 0.5 |
| 2 | default | 1 | The landing | 8/8 | 100 | 0 | 0 | 0 | 3.5 | 4 | 84 | 84 | 0.0 |
| 2 | default | 1 | The stairwell | 8/8 | 100 | 0 | 0 | 0 | 2.9 | 3 | 78 | 78 | 0.0 |
| 2 | default | 2 | The gallery rail | 8/8 | 100 | 0 | 0 | 0 | 2.5 | 3 | 100 | 100 | 0.0 |
| 2 | default | 2 | The rope loft | 8/8 | 100 | 0 | 0 | 0 | 4.0 | 4 | 75 | 75 | 0.3 |
| 2 | default | 2 | The sounding floor | 7/8 | 88 | 1 | 0 | 0 | 5.0 | 3 | 78 | 89 | 0.3 |
| 2 | default | 3 | The long hall | 8/8 | 100 | 0 | 0 | 0 | 3.0 | 3 | 89 | 89 | 0.0 |
| 2 | default | 3 | The quiet nave | 8/8 | 100 | 0 | 0 | 0 | 3.4 | 4 | 86 | 86 | 0.0 |
| 2 | default | 3 | The tuning floor | 8/8 | 100 | 0 | 0 | 0 | 3.4 | 4 | 94 | 94 | 0.0 |
| 2 | default | 4 | The clock floor | 8/8 | 100 | 0 | 0 | 0 | 3.8 | 4 | 91 | 91 | 0.0 |
| 2 | default | 4 | The escapement | 8/8 | 100 | 0 | 0 | 0 | 4.0 | 4 | 92 | 92 | 0.0 |
| 2 | default | 4 | The weights | 8/8 | 100 | 0 | 0 | 0 | 4.3 | 3 | 83 | 83 | 0.1 |
| 2 | aware | 1 | The first flight | 8/8 | 100 | 0 | 0 | 0 | 3.0 | 4 | 94 | 94 | 0.0 |
| 2 | aware | 1 | The landing | 8/8 | 100 | 0 | 0 | 0 | 3.5 | 4 | 93 | 93 | 0.0 |
| 2 | aware | 1 | The stairwell | 8/8 | 100 | 0 | 0 | 0 | 2.9 | 3 | 93 | 93 | 0.0 |
| 2 | aware | 2 | The gallery rail | 8/8 | 100 | 0 | 0 | 0 | 2.9 | 3 | 98 | 98 | 0.0 |
| 2 | aware | 2 | The rope loft | 8/8 | 100 | 0 | 0 | 0 | 3.5 | 4 | 99 | 99 | 0.0 |
| 2 | aware | 2 | The sounding floor | 8/8 | 100 | 0 | 0 | 0 | 3.1 | 3 | 97 | 97 | 0.0 |
| 2 | aware | 3 | The long hall | 8/8 | 100 | 0 | 0 | 0 | 3.0 | 3 | 98 | 98 | 0.0 |
| 2 | aware | 3 | The quiet nave | 8/8 | 100 | 0 | 0 | 0 | 3.1 | 3 | 94 | 94 | 0.0 |
| 2 | aware | 3 | The tuning floor | 8/8 | 100 | 0 | 0 | 0 | 3.6 | 4 | 91 | 91 | 0.0 |
| 2 | aware | 4 | The clock floor | 8/8 | 100 | 0 | 0 | 0 | 3.4 | 3 | 91 | 91 | 0.0 |
| 2 | aware | 4 | The escapement | 8/8 | 100 | 0 | 0 | 0 | 4.0 | 4 | 98 | 98 | 0.0 |
| 2 | aware | 4 | The weights | 8/8 | 100 | 0 | 0 | 0 | 4.0 | 4 | 91 | 91 | 0.0 |
| 3 | default | 1 | The first flight | 8/8 | 100 | 0 | 0 | 0 | 2.8 | 3 | 69 | 69 | 0.4 |
| 3 | default | 1 | The landing | 8/8 | 100 | 0 | 0 | 0 | 3.0 | 3 | 84 | 84 | 0.0 |
| 3 | default | 1 | The stairwell | 8/8 | 100 | 0 | 0 | 0 | 3.0 | 3 | 70 | 70 | 0.4 |
| 3 | default | 2 | The gallery rail | 6/8 | 75 | 2 | 0 | 0 | 9.9 | 2 | 63 | 84 | 1.0 |
| 3 | default | 2 | The rope loft | 8/8 | 100 | 0 | 0 | 0 | 5.1 | 3 | 73 | 73 | 0.4 |
| 3 | default | 2 | The sounding floor | 8/8 | 100 | 0 | 0 | 0 | 4.5 | 3 | 79 | 79 | 0.1 |
| 3 | default | 3 | The long hall | 8/8 | 100 | 0 | 0 | 0 | 2.9 | 3 | 94 | 94 | 0.0 |
| 3 | default | 3 | The quiet nave | 8/8 | 100 | 0 | 0 | 0 | 5.5 | 3 | 74 | 74 | 0.1 |
| 3 | default | 3 | The tuning floor | 8/8 | 100 | 0 | 0 | 0 | 2.8 | 3 | 96 | 96 | 0.0 |
| 3 | default | 4 | The clock floor | 8/8 | 100 | 0 | 0 | 0 | 3.1 | 3 | 90 | 90 | 0.0 |
| 3 | default | 4 | The escapement | 8/8 | 100 | 0 | 0 | 0 | 5.6 | 4 | 83 | 83 | 0.3 |
| 3 | default | 4 | The weights | 6/8 | 75 | 2 | 0 | 0 | 17.5 | 19 | 26 | 35 | 1.9 |
| 3 | aware | 1 | The first flight | 8/8 | 100 | 0 | 0 | 0 | 2.4 | 2 | 96 | 96 | 0.0 |
| 3 | aware | 1 | The landing | 8/8 | 100 | 0 | 0 | 0 | 2.8 | 3 | 97 | 97 | 0.0 |
| 3 | aware | 1 | The stairwell | 8/8 | 100 | 0 | 0 | 0 | 2.8 | 3 | 95 | 95 | 0.0 |
| 3 | aware | 2 | The gallery rail | 8/8 | 100 | 0 | 0 | 0 | 2.1 | 2 | 98 | 98 | 0.0 |
| 3 | aware | 2 | The rope loft | 8/8 | 100 | 0 | 0 | 0 | 2.5 | 3 | 94 | 94 | 0.0 |
| 3 | aware | 2 | The sounding floor | 8/8 | 100 | 0 | 0 | 0 | 2.9 | 3 | 98 | 98 | 0.0 |
| 3 | aware | 3 | The long hall | 8/8 | 100 | 0 | 0 | 0 | 2.8 | 3 | 99 | 99 | 0.0 |
| 3 | aware | 3 | The quiet nave | 8/8 | 100 | 0 | 0 | 0 | 3.1 | 3 | 96 | 96 | 0.0 |
| 3 | aware | 3 | The tuning floor | 8/8 | 100 | 0 | 0 | 0 | 3.1 | 3 | 96 | 96 | 0.0 |
| 3 | aware | 4 | The clock floor | 8/8 | 100 | 0 | 0 | 0 | 3.4 | 3 | 96 | 96 | 0.0 |
| 3 | aware | 4 | The escapement | 8/8 | 100 | 0 | 0 | 0 | 3.6 | 4 | 98 | 98 | 0.0 |
| 3 | aware | 4 | The weights | 8/8 | 100 | 0 | 0 | 0 | 3.4 | 3 | 90 | 90 | 0.0 |

#### Controlled heart: legal peals with exactly N hung bells (authored heart layouts)

| party | policy | bells | layout | wins/n | win % | lost | stalled | budget stops | mean rounds | median win round | HP left % (all) | HP left % (wins) | mean members down |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | default | 0 | The great bell | 7/8 | 88 | 1 | 0 | 0 | 20.9 | 21 | 65 | 74 | 0.1 |
| 1 | default | 0 | The clapper hall | 1/8 | 13 | 7 | 0 | 0 | 12.1 | 25 | 6 | 50 | 0.9 |
| 1 | default | 0 | The sounding yoke | 6/8 | 75 | 2 | 0 | 0 | 19.8 | 23 | 63 | 83 | 0.3 |
| 1 | default | 1 | The great bell | 7/8 | 88 | 1 | 0 | 0 | 20.9 | 21 | 65 | 74 | 0.1 |
| 1 | default | 1 | The clapper hall | 2/8 | 25 | 6 | 0 | 0 | 13.6 | 25 | 8 | 33 | 0.8 |
| 1 | default | 1 | The sounding yoke | 6/8 | 75 | 2 | 0 | 0 | 19.8 | 23 | 63 | 83 | 0.3 |
| 1 | default | 2 | The great bell | 7/8 | 88 | 1 | 0 | 0 | 20.9 | 21 | 65 | 74 | 0.1 |
| 1 | default | 2 | The clapper hall | 2/8 | 25 | 6 | 0 | 0 | 12.1 | 25 | 8 | 33 | 0.8 |
| 1 | default | 2 | The sounding yoke | 6/8 | 75 | 2 | 0 | 0 | 21.3 | 25 | 50 | 67 | 0.3 |
| 1 | default | 3 | The great bell | 7/8 | 88 | 1 | 0 | 0 | 20.9 | 21 | 65 | 74 | 0.1 |
| 1 | default | 3 | The clapper hall | 0/8 | 0 | 8 | 0 | 0 | 9.0 | — | 0 | — | 1.0 |
| 1 | default | 3 | The sounding yoke | 6/8 | 75 | 2 | 0 | 0 | 21.3 | 25 | 50 | 67 | 0.3 |
| 1 | default | 4 | The great bell | 7/8 | 88 | 1 | 0 | 0 | 19.4 | 21 | 65 | 74 | 0.1 |
| 1 | default | 4 | The clapper hall | 0/8 | 0 | 8 | 0 | 0 | 8.1 | — | 0 | — | 1.0 |
| 1 | default | 4 | The sounding yoke | 6/8 | 75 | 2 | 0 | 0 | 22.0 | 26 | 25 | 33 | 0.3 |
| 1 | aware | 0 | The great bell | 8/8 | 100 | 0 | 0 | 0 | 22.3 | 23 | 50 | 50 | 0.0 |
| 1 | aware | 0 | The clapper hall | 5/8 | 63 | 3 | 0 | 0 | 20.5 | 26 | 60 | 97 | 0.4 |
| 1 | aware | 0 | The sounding yoke | 0/8 | 0 | 8 | 0 | 0 | 13.8 | — | 0 | — | 1.0 |
| 1 | aware | 1 | The great bell | 8/8 | 100 | 0 | 0 | 0 | 21.6 | 22 | 50 | 50 | 0.0 |
| 1 | aware | 1 | The clapper hall | 5/8 | 63 | 3 | 0 | 0 | 20.8 | 26 | 44 | 70 | 0.4 |
| 1 | aware | 1 | The sounding yoke | 2/8 | 25 | 6 | 0 | 0 | 16.3 | 26 | 8 | 33 | 0.8 |
| 1 | aware | 2 | The great bell | 8/8 | 100 | 0 | 0 | 0 | 22.5 | 22 | 42 | 42 | 0.0 |
| 1 | aware | 2 | The clapper hall | 5/8 | 63 | 0 | 3 | 0 | 30.4 | 24 | 73 | 67 | 0.0 |
| 1 | aware | 2 | The sounding yoke | 2/8 | 25 | 6 | 0 | 0 | 16.3 | 26 | 8 | 33 | 0.8 |
| 1 | aware | 3 | The great bell | 8/8 | 100 | 0 | 0 | 0 | 22.5 | 22 | 42 | 42 | 0.0 |
| 1 | aware | 3 | The clapper hall | 5/8 | 63 | 0 | 3 | 0 | 30.1 | 24 | 73 | 67 | 0.0 |
| 1 | aware | 3 | The sounding yoke | 1/8 | 13 | 6 | 1 | 0 | 18.4 | 28 | 8 | 33 | 0.8 |
| 1 | aware | 4 | The great bell | 8/8 | 100 | 0 | 0 | 0 | 22.5 | 22 | 42 | 42 | 0.0 |
| 1 | aware | 4 | The clapper hall | 8/8 | 100 | 0 | 0 | 0 | 21.4 | 21 | 67 | 67 | 0.0 |
| 1 | aware | 4 | The sounding yoke | 1/8 | 13 | 6 | 1 | 0 | 18.4 | 28 | 8 | 33 | 0.8 |
| 2 | default | 0 | The great bell | 7/8 | 88 | 1 | 0 | 0 | 5.9 | 5 | 67 | 77 | 0.3 |
| 2 | default | 0 | The clapper hall | 8/8 | 100 | 0 | 0 | 0 | 5.9 | 6 | 62 | 62 | 0.0 |
| 2 | default | 0 | The sounding yoke | 7/8 | 88 | 1 | 0 | 0 | 7.3 | 6 | 71 | 82 | 0.3 |
| 2 | default | 1 | The great bell | 7/8 | 88 | 1 | 0 | 0 | 5.9 | 5 | 67 | 77 | 0.3 |
| 2 | default | 1 | The clapper hall | 8/8 | 100 | 0 | 0 | 0 | 5.9 | 6 | 62 | 62 | 0.0 |
| 2 | default | 1 | The sounding yoke | 7/8 | 88 | 1 | 0 | 0 | 7.3 | 6 | 71 | 82 | 0.3 |
| 2 | default | 2 | The great bell | 7/8 | 88 | 1 | 0 | 0 | 5.9 | 5 | 67 | 77 | 0.3 |
| 2 | default | 2 | The clapper hall | 4/8 | 50 | 4 | 0 | 0 | 10.0 | 6 | 38 | 75 | 1.0 |
| 2 | default | 2 | The sounding yoke | 7/8 | 88 | 1 | 0 | 0 | 7.3 | 6 | 71 | 82 | 0.3 |
| 2 | default | 3 | The great bell | 8/8 | 100 | 0 | 0 | 0 | 5.4 | 5 | 74 | 74 | 0.0 |
| 2 | default | 3 | The clapper hall | 4/8 | 50 | 4 | 0 | 0 | 9.9 | 6 | 37 | 73 | 1.0 |
| 2 | default | 3 | The sounding yoke | 8/8 | 100 | 0 | 0 | 0 | 5.9 | 6 | 79 | 79 | 0.0 |
| 2 | default | 4 | The great bell | 8/8 | 100 | 0 | 0 | 0 | 5.8 | 6 | 74 | 74 | 0.0 |
| 2 | default | 4 | The clapper hall | 8/8 | 100 | 0 | 0 | 0 | 6.4 | 7 | 65 | 65 | 0.0 |
| 2 | default | 4 | The sounding yoke | 8/8 | 100 | 0 | 0 | 0 | 5.9 | 6 | 79 | 79 | 0.0 |
| 2 | aware | 0 | The great bell | 8/8 | 100 | 0 | 0 | 0 | 6.0 | 6 | 85 | 85 | 0.0 |
| 2 | aware | 0 | The clapper hall | 8/8 | 100 | 0 | 0 | 0 | 5.8 | 6 | 91 | 91 | 0.0 |
| 2 | aware | 0 | The sounding yoke | 8/8 | 100 | 0 | 0 | 0 | 5.1 | 5 | 87 | 87 | 0.0 |
| 2 | aware | 1 | The great bell | 8/8 | 100 | 0 | 0 | 0 | 6.0 | 6 | 85 | 85 | 0.0 |
| 2 | aware | 1 | The clapper hall | 8/8 | 100 | 0 | 0 | 0 | 5.8 | 6 | 91 | 91 | 0.0 |
| 2 | aware | 1 | The sounding yoke | 8/8 | 100 | 0 | 0 | 0 | 5.1 | 5 | 85 | 85 | 0.0 |
| 2 | aware | 2 | The great bell | 8/8 | 100 | 0 | 0 | 0 | 6.0 | 6 | 85 | 85 | 0.0 |
| 2 | aware | 2 | The clapper hall | 8/8 | 100 | 0 | 0 | 0 | 5.9 | 6 | 92 | 92 | 0.0 |
| 2 | aware | 2 | The sounding yoke | 8/8 | 100 | 0 | 0 | 0 | 5.0 | 5 | 86 | 86 | 0.0 |
| 2 | aware | 3 | The great bell | 8/8 | 100 | 0 | 0 | 0 | 5.8 | 6 | 83 | 83 | 0.0 |
| 2 | aware | 3 | The clapper hall | 8/8 | 100 | 0 | 0 | 0 | 5.8 | 6 | 91 | 91 | 0.0 |
| 2 | aware | 3 | The sounding yoke | 8/8 | 100 | 0 | 0 | 0 | 6.1 | 5 | 89 | 89 | 0.0 |
| 2 | aware | 4 | The great bell | 8/8 | 100 | 0 | 0 | 0 | 5.8 | 6 | 83 | 83 | 0.0 |
| 2 | aware | 4 | The clapper hall | 8/8 | 100 | 0 | 0 | 0 | 6.1 | 6 | 90 | 90 | 0.0 |
| 2 | aware | 4 | The sounding yoke | 8/8 | 100 | 0 | 0 | 0 | 6.1 | 5 | 89 | 89 | 0.0 |
| 3 | default | 0 | The great bell | 8/8 | 100 | 0 | 0 | 0 | 5.5 | 6 | 58 | 58 | 0.5 |
| 3 | default | 0 | The clapper hall | 8/8 | 100 | 0 | 0 | 0 | 5.5 | 5 | 56 | 56 | 0.5 |
| 3 | default | 0 | The sounding yoke | 4/8 | 50 | 4 | 0 | 0 | 11.4 | 5 | 42 | 84 | 1.5 |
| 3 | default | 1 | The great bell | 8/8 | 100 | 0 | 0 | 0 | 5.5 | 6 | 58 | 58 | 0.5 |
| 3 | default | 1 | The clapper hall | 8/8 | 100 | 0 | 0 | 0 | 5.5 | 5 | 56 | 56 | 0.5 |
| 3 | default | 1 | The sounding yoke | 4/8 | 50 | 4 | 0 | 0 | 11.4 | 5 | 42 | 84 | 1.5 |
| 3 | default | 2 | The great bell | 8/8 | 100 | 0 | 0 | 0 | 5.5 | 6 | 58 | 58 | 0.5 |
| 3 | default | 2 | The clapper hall | 8/8 | 100 | 0 | 0 | 0 | 5.5 | 5 | 58 | 58 | 0.3 |
| 3 | default | 2 | The sounding yoke | 4/8 | 50 | 4 | 0 | 0 | 11.4 | 5 | 40 | 80 | 1.5 |
| 3 | default | 3 | The great bell | 8/8 | 100 | 0 | 0 | 0 | 5.6 | 6 | 59 | 59 | 0.4 |
| 3 | default | 3 | The clapper hall | 8/8 | 100 | 0 | 0 | 0 | 5.3 | 5 | 58 | 58 | 0.1 |
| 3 | default | 3 | The sounding yoke | 5/8 | 63 | 3 | 0 | 0 | 10.1 | 5 | 48 | 76 | 1.1 |
| 3 | default | 4 | The great bell | 8/8 | 100 | 0 | 0 | 0 | 5.6 | 6 | 59 | 59 | 0.4 |
| 3 | default | 4 | The clapper hall | 6/8 | 75 | 2 | 0 | 0 | 8.0 | 6 | 39 | 52 | 1.1 |
| 3 | default | 4 | The sounding yoke | 5/8 | 63 | 3 | 0 | 0 | 10.1 | 5 | 48 | 76 | 1.1 |
| 3 | aware | 0 | The great bell | 8/8 | 100 | 0 | 0 | 0 | 4.5 | 5 | 88 | 88 | 0.0 |
| 3 | aware | 0 | The clapper hall | 8/8 | 100 | 0 | 0 | 0 | 4.8 | 5 | 88 | 88 | 0.0 |
| 3 | aware | 0 | The sounding yoke | 8/8 | 100 | 0 | 0 | 0 | 4.6 | 5 | 88 | 88 | 0.0 |
| 3 | aware | 1 | The great bell | 8/8 | 100 | 0 | 0 | 0 | 4.5 | 5 | 88 | 88 | 0.0 |
| 3 | aware | 1 | The clapper hall | 8/8 | 100 | 0 | 0 | 0 | 4.8 | 5 | 88 | 88 | 0.0 |
| 3 | aware | 1 | The sounding yoke | 8/8 | 100 | 0 | 0 | 0 | 4.8 | 5 | 88 | 88 | 0.0 |
| 3 | aware | 2 | The great bell | 8/8 | 100 | 0 | 0 | 0 | 4.5 | 5 | 88 | 88 | 0.0 |
| 3 | aware | 2 | The clapper hall | 8/8 | 100 | 0 | 0 | 0 | 4.8 | 5 | 88 | 88 | 0.0 |
| 3 | aware | 2 | The sounding yoke | 8/8 | 100 | 0 | 0 | 0 | 4.8 | 5 | 88 | 88 | 0.0 |
| 3 | aware | 3 | The great bell | 8/8 | 100 | 0 | 0 | 0 | 4.6 | 5 | 88 | 88 | 0.0 |
| 3 | aware | 3 | The clapper hall | 8/8 | 100 | 0 | 0 | 0 | 4.8 | 5 | 88 | 88 | 0.0 |
| 3 | aware | 3 | The sounding yoke | 8/8 | 100 | 0 | 0 | 0 | 5.0 | 5 | 88 | 88 | 0.0 |
| 3 | aware | 4 | The great bell | 8/8 | 100 | 0 | 0 | 0 | 4.6 | 5 | 88 | 88 | 0.0 |
| 3 | aware | 4 | The clapper hall | 8/8 | 100 | 0 | 0 | 0 | 5.3 | 5 | 86 | 86 | 0.0 |
| 3 | aware | 4 | The sounding yoke | 8/8 | 100 | 0 | 0 | 0 | 5.0 | 5 | 88 | 88 | 0.0 |

#### Controlled heart pooled over the three layouts

| party | policy | bells | wins/n | win % | lost | stalled | budget stops | mean rounds | median win round | HP left % (all) | HP left % (wins) | mean members down |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | default | 0 | 14/24 | 58 | 10 | 0 | 0 | 17.6 | 23 | 44 | 76 | 0.4 |
| 1 | default | 1 | 15/24 | 63 | 9 | 0 | 0 | 18.1 | 23 | 45 | 72 | 0.4 |
| 1 | default | 2 | 15/24 | 63 | 9 | 0 | 0 | 18.1 | 25 | 41 | 66 | 0.4 |
| 1 | default | 3 | 13/24 | 54 | 11 | 0 | 0 | 17.0 | 25 | 38 | 71 | 0.5 |
| 1 | default | 4 | 13/24 | 54 | 11 | 0 | 0 | 16.5 | 21 | 30 | 55 | 0.5 |
| 1 | aware | 0 | 13/24 | 54 | 11 | 0 | 0 | 18.8 | 23 | 37 | 68 | 0.5 |
| 1 | aware | 1 | 15/24 | 63 | 9 | 0 | 0 | 19.5 | 25 | 34 | 54 | 0.4 |
| 1 | aware | 2 | 15/24 | 63 | 6 | 3 | 0 | 23.0 | 24 | 41 | 49 | 0.3 |
| 1 | aware | 3 | 14/24 | 58 | 6 | 4 | 0 | 23.7 | 24 | 41 | 50 | 0.3 |
| 1 | aware | 4 | 17/24 | 71 | 6 | 1 | 0 | 20.8 | 22 | 39 | 53 | 0.3 |
| 2 | default | 0 | 22/24 | 92 | 2 | 0 | 0 | 6.3 | 6 | 67 | 73 | 0.2 |
| 2 | default | 1 | 22/24 | 92 | 2 | 0 | 0 | 6.3 | 6 | 67 | 73 | 0.2 |
| 2 | default | 2 | 18/24 | 75 | 6 | 0 | 0 | 7.7 | 6 | 59 | 78 | 0.5 |
| 2 | default | 3 | 20/24 | 83 | 4 | 0 | 0 | 7.0 | 6 | 63 | 76 | 0.3 |
| 2 | default | 4 | 24/24 | 100 | 0 | 0 | 0 | 6.0 | 6 | 73 | 73 | 0.0 |
| 2 | aware | 0 | 24/24 | 100 | 0 | 0 | 0 | 5.6 | 6 | 88 | 88 | 0.0 |
| 2 | aware | 1 | 24/24 | 100 | 0 | 0 | 0 | 5.6 | 6 | 87 | 87 | 0.0 |
| 2 | aware | 2 | 24/24 | 100 | 0 | 0 | 0 | 5.6 | 6 | 88 | 88 | 0.0 |
| 2 | aware | 3 | 24/24 | 100 | 0 | 0 | 0 | 5.9 | 6 | 88 | 88 | 0.0 |
| 2 | aware | 4 | 24/24 | 100 | 0 | 0 | 0 | 6.0 | 6 | 88 | 88 | 0.0 |
| 3 | default | 0 | 20/24 | 83 | 4 | 0 | 0 | 7.5 | 5 | 52 | 63 | 0.8 |
| 3 | default | 1 | 20/24 | 83 | 4 | 0 | 0 | 7.5 | 5 | 52 | 63 | 0.8 |
| 3 | default | 2 | 20/24 | 83 | 4 | 0 | 0 | 7.5 | 5 | 52 | 63 | 0.8 |
| 3 | default | 3 | 21/24 | 88 | 3 | 0 | 0 | 7.0 | 5 | 55 | 63 | 0.5 |
| 3 | default | 4 | 19/24 | 79 | 5 | 0 | 0 | 7.9 | 5 | 49 | 61 | 0.9 |
| 3 | aware | 0 | 24/24 | 100 | 0 | 0 | 0 | 4.6 | 5 | 88 | 88 | 0.0 |
| 3 | aware | 1 | 24/24 | 100 | 0 | 0 | 0 | 4.7 | 5 | 88 | 88 | 0.0 |
| 3 | aware | 2 | 24/24 | 100 | 0 | 0 | 0 | 4.7 | 5 | 88 | 88 | 0.0 |
| 3 | aware | 3 | 24/24 | 100 | 0 | 0 | 0 | 4.8 | 5 | 88 | 88 | 0.0 |
| 3 | aware | 4 | 24/24 | 100 | 0 | 0 | 0 | 5.0 | 5 | 87 | 87 | 0.0 |

#### Paired 0 bells vs 4 bells (same seed and layout; `wins 0 / wins 4` counts)

| party | policy | both won | only 0 bells | only 4 bells | neither | n | rounds 0 → 4 | HP left % (all) 0 → 4 |
|---|---|---|---|---|---|---|---|---|
| 1 | default | 13 | 1 | 0 | 10 | 24 | 17.6 → 16.5 | 44 → 30 |
| 1 | aware | 13 | 0 | 4 | 7 | 24 | 18.8 → 20.8 | 37 → 39 |
| 2 | default | 22 | 0 | 2 | 0 | 24 | 6.3 → 6.0 | 67 → 73 |
| 2 | aware | 24 | 0 | 0 | 0 | 24 | 5.6 → 6.0 | 88 → 88 |
| 3 | default | 18 | 2 | 1 | 3 | 24 | 7.5 → 7.9 | 52 → 49 |
| 3 | aware | 24 | 0 | 0 | 0 | 24 | 4.6 → 5.0 | 88 → 87 |

#### Real worn trips (bells earned, not injected)

| party | policy | room | wins/reached | win % | stalled | lost | budget stops | mean rounds | HP left % | mean bells at entry |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | default | 1 | 8/8 | 100 | 0 | 0 | 0 | 4.4 | 90 | — |
| 1 | default | 2 | 0/8 | 0 | 0 | 8 | 0 | 8.6 | 0 | — |
| 1 | default | 3 | 0/0 | — | 0 | 0 | 0 | — | — | — |
| 1 | default | 4 | 0/0 | — | 0 | 0 | 0 | — | — | — |
| 1 | default | 5 (heart) | 0/0 | — | 0 | 0 | 0 | — | — | — |
| 1 | aware | 1 | 8/8 | 100 | 0 | 0 | 0 | 4.0 | 83 | — |
| 1 | aware | 2 | 3/8 | 38 | 5 | 0 | 0 | 29.8 | 85 | — |
| 1 | aware | 3 | 0/3 | 0 | 2 | 1 | 0 | 29.3 | 56 | — |
| 1 | aware | 4 | 0/0 | — | 0 | 0 | 0 | — | — | — |
| 1 | aware | 5 (heart) | 0/0 | — | 0 | 0 | 0 | — | — | — |
| 2 | default | 1 | 8/8 | 100 | 0 | 0 | 0 | 3.4 | 75 | — |
| 2 | default | 2 | 8/8 | 100 | 0 | 0 | 0 | 4.3 | 83 | — |
| 2 | default | 3 | 3/8 | 38 | 1 | 4 | 0 | 13.0 | 35 | — |
| 2 | default | 4 | 1/3 | 33 | 0 | 2 | 0 | 7.7 | 0 | — |
| 2 | default | 5 (heart) | 0/1 | 0 | 0 | 1 | 0 | 1.0 | 0 | 1 |
| 2 | aware | 1 | 8/8 | 100 | 0 | 0 | 0 | 3.1 | 91 | — |
| 2 | aware | 2 | 7/8 | 88 | 1 | 0 | 0 | 7.9 | 95 | — |
| 2 | aware | 3 | 4/7 | 57 | 3 | 0 | 0 | 20.9 | 83 | — |
| 2 | aware | 4 | 1/4 | 25 | 3 | 0 | 0 | 33.5 | 88 | — |
| 2 | aware | 5 (heart) | 1/1 | 100 | 0 | 0 | 0 | 20.0 | 43 | 1 |
| 3 | default | 1 | 8/8 | 100 | 0 | 0 | 0 | 2.8 | 78 | — |
| 3 | default | 2 | 8/8 | 100 | 0 | 0 | 0 | 3.9 | 82 | — |
| 3 | default | 3 | 7/8 | 88 | 0 | 1 | 0 | 5.1 | 65 | — |
| 3 | default | 4 | 2/7 | 29 | 2 | 3 | 0 | 20.1 | 34 | — |
| 3 | default | 5 (heart) | 0/2 | 0 | 0 | 2 | 0 | 6.5 | 0 | 0,1 |
| 3 | aware | 1 | 8/8 | 100 | 0 | 0 | 0 | 2.4 | 96 | — |
| 3 | aware | 2 | 8/8 | 100 | 0 | 0 | 0 | 2.8 | 96 | — |
| 3 | aware | 3 | 8/8 | 100 | 0 | 0 | 0 | 3.6 | 94 | — |
| 3 | aware | 4 | 7/8 | 88 | 1 | 0 | 0 | 10.1 | 88 | — |
| 3 | aware | 5 (heart) | 5/7 | 71 | 2 | 0 | 0 | 25.1 | 28 | 1,1,1,1,1,0,1 |
Party 1 default: trip ends {"lost":8} / 8.
Party 1 aware: trip ends {"stalled":7,"lost":1} / 8.
Party 2 default: trip ends {"lost":7,"stalled":1} / 8.
Party 2 aware: trip ends {"stalled":7,"cleared":1} / 8.
Party 3 default: trip ends {"stalled":2,"lost":6} / 8.
Party 3 aware: trip ends {"cleared":5,"stalled":3} / 8.

## 5. CAL-4 task 2: 0-vs-4 pairs, candidates (proposal-only, nothing applied)

Candidates are applied in memory by the test (`CAL4_CAND=<name>`, `CANDIDATES` in `tests/sim/calibration/foundry-cartographers.ts`, restored after the run); no `src/data` file changed. Aware bot, controlled heart, three layouts, 10 seeds each (30 fights per cell), party 2 unless stated.

**0 vs 4 hung bells at 30 seeds per layout (90 pairs; committed numbers).** Reproduce: `CAL4=1 CAL4_SEEDS=30 CAL4_PARTIES=1 CAL4_BELLS=0,4 CAL4_HEART_ONLY=1 ...`.

| party | policy | wins 0 bells | wins 4 bells | both | only 0 | only 4 | neither | rounds 0 -> 4 | HP left % 0 -> 4 |
|---|---|---|---|---|---|---|---|---|---|
| 1 | default | 43/90 (48 %) | 46/90 (51 %) | 39 | 4 | 7 | 40 | 15.7 -> 16.1 | 33 -> 25 |
| 1 | aware | 52/90 (58 %) | 62/90 (69 %) | 46 | 6 | 16 | 22 | 21.0 -> 20.6 | 41 -> 47 |
| 3 | default | 72/90 (80 %) | 79/90 (88 %) | 68 | 4 | 11 | 7 | 8.2 -> 7.5 | 52 -> 51 |
| 3 | aware | 90/90 (100 %) | 90/90 (100 %) | 90 | 0 | 0 | 0 | 4.7 -> 5.0 | 85 -> 84 |

So 0 bells is winnable at every party size and bot, and 4 bells helps the lone apprentice (+11 points aware, +3 default) and the default-bot trio (+8) by a small margin, but at party 2 and the aware trio the heart is already 100 % with no bells, so there is nothing for 4 bells to improve. The bells' pulse is not the cause: in 18 four-bell party-2 hearts the allied great bells pulsed a foe **0 times** (the foes never stand beside a hook; raising `alliedPulseDamage` 2 -> 3 in candidate F3 changed nothing, results identical to F2). Any 0-vs-4 difference is therefore board geometry and the tune (a bell on each hook), not allied damage.

**Candidates for the Carillonneur's body** (`FOUNDRY_TUNING.carillonneur.hp` 14, `src/data/districts/foundry.ts:120`; also `src/data/rivals/carillonneur.ts` `hp: 14`, and the shell in `src/data/districts/foundry/enemies.ts:72` reads the tuning; all three must change together). The spawned unit reads the shell; the test sets the shell.

| candidate | source fields | wins 0 bells | wins 4 bells | paired both / only 0 / only 4 / neither | rounds 0 -> 4 | stalls 0 / 4 | read |
|---|---|---|---|---|---|---|---|
| committed (8 seeds) | carillonneur.hp 14 | 24/24 (100 %) | 24/24 (100 %) | 24 / 0 / 0 / 0 | 5.6 -> 6.0 | 0 / 0 | above band (+35 over the 65 % cap) |
| F1 | hp 24 | 30/30 (100 %) | 28/30 (93 %) | 28 / 2 / 0 / 0 | 8.2 -> 11.5 | 0 / 2 | above band; 4 bells slightly **harder** |
| F2 | hp 36 | 29/30 (97 %) | 26/30 (87 %) | 26 / 3 / 0 / 1 | 17.1 -> 19.4 | 1 / 4 | above band; 4 bells harder |
| F3 | hp 36 + `alliedPulseDamage` 3 | identical to F2 | identical to F2 | 26 / 3 / 0 / 1 | 17.1 -> 19.4 | 1 / 4 | `alliedPulseDamage` has no measured effect |
| F4 | hp 60 | 21/30 (70 %) | 21/30 (70 %) | 19 / 2 / 2 / 7 | 38.1 -> 35.5 | 9 / 8 | near the band but 30 % of fights hit the 40-round limit with nobody down |
| F5 | hp 90 | 0/30 | 0/30 | 0 / 0 / 0 / 30 | 41.0 -> 40.4 | 30 / 29 | every fight stalls: a round-limit cliff |

**Result: the P2 band is not reached with a clean number.** The HP lever goes from 97 % (36) to 70 % (60) to 0 % (90) with the loss turning into stalls, not losses, so the 50-65 % band lies on the round-limit cliff between 60 and 90, where the rate measures the bot's 40-round budget. And no candidate makes 4 bells clearly easier at party 2: F1-F2 make them slightly harder (4 vs 0: 93 vs 100 %, 87 vs 97 %), F4 ties. **Quantified miss, player decision needed:** (a) what band the foundry heart should have at party 2 (the canals' 50-65 % is a Proposal, P2), and (b) whether hung bells should do anything the bot can measure (they pulse nothing today unless a foe stands beside a hook). No number is proposed for application.

**Pulse term probe (CAL-B's request).** `CAL4_CAND=P0` sets `FOUNDRY_TUNING.botPulse.member` 15 -> 0, party 1, aware, 10 seeds per layout:

| layout | committed (8 seeds, 0 bells) | member weight 0 (0 bells) | member weight 0 (4 bells) |
|---|---|---|---|
| The great bell | 8/8 | 5/10 | 5/10 |
| The clapper hall | 5/8 | 1/10 | 0/10 |
| The sounding yoke | 0/8 | 7/10 | 7/10 |
| all | 13/24 (54 %) | 13/30 (43 %) | 12/30 (40 %) |

The sounding yoke's party-1 result is the member weight (0/8 -> 7/10), not the layout; the other two layouts get worse, so the weight is a policy trade-off and no single value is right. It is a policy label, not balance evidence; the yoke at party 1 should not be read as a balance number. Weights were not changed.

## 6. CAL-4 task 3

The sympathetic ring used the foes’ tone groups for every strike. Those groups exclude hung bells, so only a direct strike could pulse from a hook. Apprentice rings now include matching, unmuffled hung bells. Their pulses still use the existing adjacent, foe-only targeting. The ring’s reading order, one hit per unit and humming limit apply to the whole ring. The regression reproduces the missing pulse from a matching-tone Bolt and checks that the Great Peal still uses the foes’ groups. A separate assertion covers the hum when a hung bell is the only bell of its tone.

With the fix alone at 14 Carillonneur HP and the original staff tuning, four hung bells logged two allied foe hits in 18 aware-bot fights (seeds 1–6 on each layout), up from zero in the previous sample. Both hits landed on staff. The authored hooks sit at the edges, outside the anchored Carillonneur’s adjacent tiles on all three layouts.

The selected data are `FOUNDRY_TUNING.carillonneur.hp` 14 → 57 and Clapper HP/move/bump 5/1/1 → 6/2/4. The rival and shell read the same HP field. The candidate comparisons below use the pulse fix throughout. Zero- and four-bell fights share their seeds and layouts within each row.

| Carillonneur HP | Clapper HP/move/bump | Zero bells | Four bells | Stalls, zero / four | Fresh pair room 4 |
|---:|---|---:|---:|---:|---:|
| 56 | 5/1/1 | 23/36 (64%) | 26/36 (72%) | 13 / 9 | — |
| **57** | **6/2/4** | **5/18 (28%)** | **12/18 (67%)** | **9 / 6** | **18/18 (100%)** |
| 57 | 8/2/4 | 6/24 (25%) | 15/24 (63%) | 13 / 9 | 24/24 (100%) |
| 58 | 9/1/4 | 8/21 (38%) | 11/21 (52%) | 13 / 4 | 21/21 (100%) |
| 62 | 5/1/1 | 9/21 (43%) | 13/21 (62%) | 12 / 8 | — |
| 52 | 12/1/7 | 13/21 (62%) | 4/21 (19%) | 4 / 7 | 14/21 (67%) |
| 59 | 14/1/6 | 3/36 (8%) | 4/36 (11%) | 32 / 23 | 21/36 (58%) |

The selected candidate meets the zero-bell band and gives the largest paired improvement in these comparisons. Nine pairs won only with four bells, two won only with zero, three won both and four won neither. Four bells still miss the lower bound by 13.3 percentage points. The 40-round limit accounts for all six four-bell non-wins. The 8 HP candidate broke the Rivet position regression: its Clapper survived the delayed pulse and was pushed after the hold expired. Both Rivet checks pass at 6 HP. The 12 HP, 7 damage Clapper reached the room-4 band and reversed the advantage of bells in the heart. Room 4 remains 20 points above its ceiling with the selected shared staff values.

### Fresh-pair ordinary rooms

Each row pools three authored layouts. The district-aware bot used seeds 1–30 before and 1–6 after. There were no losses, stalls or action-budget stops in either sample.

| Room | Before | After | Win target |
|---:|---:|---:|---:|
| 1 | 90/90 (100%) | 18/18 (100%) | ≥85% |
| 2 | 90/90 (100%) | 18/18 (100%) | ≥85% |
| 3 | 90/90 (100%) | 18/18 (100%) | ≥75% |
| 4 | 90/90 (100%) | 18/18 (100%) | 65–80% |

### Fresh-pair controlled hearts

The aware bot played each bell count with the same six seeds (1–6) and all three authored layouts after tuning. Before tuning it played seeds 1–30 on the same layouts. All before rows had zero stalls and losses. Neither run exhausted the action budget. HP left is pooled across all fights. Allied hits count foe targets in the allied pulse events.

| Hung bells | Before wins | Before rounds | Before HP left | After wins | After losses | After stalls | After rounds | After HP left | After allied hits (Carillonneur) |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 0 | 90/90 | 5.8 | 87% | 5/18 (28%) | 4 | 9 | 33.5 | 23% | 0 (0) |
| 1 | 90/90 | 5.8 | 86% | 8/18 (44%) | 0 | 10 | 39.1 | 35% | 0 (0) |
| 2 | 90/90 | 5.8 | 86% | 11/18 (61%) | 0 | 7 | 36.4 | 46% | 0 (0) |
| 3 | 90/90 | 6.0 | 86% | 11/18 (61%) | 0 | 7 | 37.6 | 40% | 0 (0) |
| 4 | 90/90 | 6.4 | 87% | 12/18 (67%) | 0 | 6 | 37.3 | 36% | 0 (0) |

The selected bot runs still logged zero allied hits. The layout and counter-toll affect the fight even when enemies stay outside the pulse. With the default bot, zero bells won 6/18 (33%) and four bells won 5/18 (28%). The default bot stalled seven and 11 times at those counts. Before tuning, two of 30 worn pairs reached the heart with one naturally earned bell each and one won. After tuning, three of six worn pairs stalled in room 3 and the other three stalled in room 4. The controlled hearts use legal injected peals to measure the fight independently of the approach.

Reproduce with `CAL4=1 CAL4_SEEDS=6 CAL4_PARTIES=2 CAL4_POLICIES=aware` on `tests/sim/foundry-calibration.test.ts`. Test hooks beside enemy approach lanes before another HP increase, then measure allied hits and the 0–4 curve again. Measure room 4 independently of the heart before changing their shared staff stats further.

The drawn Carillonneur’s recorded fallback solve (EN-K6) attempts to move a downed apprentice under the selected tuning. A fresh replay of the same drawn fallback and seed won in 35 rounds. The shared fallback script needs the new recording. [Drawn fallback scripts](../../tests/drawing/kits-c.scripts.ts)

