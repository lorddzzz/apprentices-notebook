# Calibration: implementation plan (CAL)

Source: [midpoint-audit.md](midpoint-audit.md) §1.2 item 8 and §2.1 (every win-rate band and tuning task leaves the content plans), [build-program.md](build-program.md) §5 (plan changes in force). Prefix **CAL**.
**State: Planned (runs last, after all content; needs EN-0).**
**Scope:** collect every deferred calibration item with its numbers, then run one pass per district on the shared bot (`src/engine/sim/` after EN-0) against the target bands. **No number is tuned while content is built** (player rule, 2026-11-04). The SM-6 branch `worktree-agent-a7d9ce60e430bee68` (commit `4c77215`, tag `ref/sm-6`) is kept for review at CAL-0; delete it only with the player's OK. Its change is recorded in §1.

## 1. Deferred items (numbers as of `a6e8bfb`)

All "main" values are what is committed now. "Source" is where the item was recorded (`log` = [build-program-log-archive.md](build-program-log-archive.md), grep the ID).

| Item | Tunable (file:line) | Main value | Measured / proposed | Source |
|---|---|---|---|---|
| **SM-6** Marginalia HP | `MARGINALIA.hp`, `src/data/districts/seam.ts:274` | 16 | **72** on the branch (commit `4c77215`) for a heart win rate of about 58 % at party 2 (target 40-60 %, seam-grows-plan.md row SM-6); at 16 HP the pair kills it in about 4 rounds, before the spark hand lands; median heart fight 15-20 rounds; furnace hall heart 0-13 % vs 70-93 % for the other two; rooms 1-3 100 % at every party size | log SM-6 |
| SM-6 hands | `MARGINALIA_TUNING`, `seam.ts:257` | `familiars: 2`, `reach: 1` | unchanged on the branch; the spark hand stays per-tile (per-cloud would make it easier) | log SM-6 |
| SM-6 golden trips | `SEAM_DEEP` in `tests/run/golden.test.ts` (new constant on the branch; `BOT = { maxRounds: 100 }` is the main option) | `seam-win-6/8/9` use `BOT` | `{ maxRounds: 100, startHp: 20 }` for the three win trips (the 72-HP heart is a coin toss for a fresh pair); fixtures `tests/fixtures/district-kit/seam-win-6/8/9.json` and `seam-wipe-7/23.json` re-recorded | branch diff |
| SM-6 test fallout | `tests/sim/seam-rooms-play.test.ts:29` "the heart plays to an end and is no walkover" | passes at 16 HP | **failed at 72 HP** (the reason the branch was dropped) | log SM-6 |
| **IQ-20** levers | `CLOCK_TUNING`, `src/data/districts/inkQuarter/enemies.ts:112` | `deadlineAfter 3`, `collect 3`, `cooldown 2` | a fresh pair never loses an ink room (rooms 100 %, heart cleared 3 % on real trips from charge attrition); deadline 2 / cooldown 1: 91 serves, 0 collections in 80 fights; candidate levers: a real damage source on the postmaster or Sealer, `collect` up, a sturdier or out-of-reach clock seal (`CLOCK_SEAL`, 3 HP, `enemies.ts:122`) | log IQ-20b; status "Open questions" |
| IQ-20 terms | `withinRounds`, `inkQuarter/terms.ts:18,30,43` | sampler 5, bind 6, wax 7 | terms met 30/30 (bind 6 = room 3 maximum, no slack); tighten only after layouts change; table in [ink-quarter-calibration.md](ink-quarter-calibration.md) | log IQ-20 |
| **IQ-23** postmaster | `src/data/rivals/postmaster.ts` (kit and routine; `collect` has `charges: 5`) | as built | give him a move or a non-Bolt opener; the heart-win test needs the bot to win at least 1 of 3 seeds | log IQ-23 |
| `INK_CAL` postmaster row | `tests/sim/ink-calibration.test.ts:21,104` (per-room loop; room 5 is only labelled `(heart)`) | no row for his trick or page | add a postmaster heart row to the `INK_CAL=1` table | log IQ-23 |
| **BH-16** tables | `HEAT`, `data/districts/bathhouses/types.ts:56`; `BOIL_CAPACITY_PIPS :63` (12); `FEEDER_PIPS :65` (2); foe numbers in `data/districts/bathhouses.ts` | heat rows `{tile,vent}` quarters: 1 `{2,4}`, 2 `{3,8}`, 3 `{4,8}`, 4 `{5,12}` | fresh pair, 20 seeds: 100 % wins everywhere (above the band); the heart boils about 2 times a fight, first on round 2 (breaks "no median boil before round 3"); rooms 1-2 0-0.4 boils, 3-4 about 1; levers: a smaller or later stoke, more foe HP or damage in the heart and later rooms; measure with trip-worn HP or a trio | log BH-16; [bathhouses-verification.md](bathhouses-verification.md) "Calibration (BH-16)" |
| **BR-21** tuning half | `BRIDGE_TUNING`, `data/districts/bridges/types.ts:65`: `stone {sound 2, crumbling 1}`, `keystoneHp 6`, `chiefHp 10`, `eliteFall 4`; foes `:90-95` (warden 4, gargoyle 3, mason 3 HP) | as listed | recorded, not tuned: party 1 never clears; party 2 0/12 on both spans; party 3 crumbling 12/12, sound 2/12 (all lost at the heart); falls 0-0.3 a fight; the bot cannot use Hold, so small-party stalls may be a bot limit (fixed by EN-0 only if Hold is added) | log BR-21; [bridges-verification.md](bridges-verification.md) |
| **CN-13** canals | lamp-mother `hp`, `src/data/enemies.ts:218` (56) with `summon { cap 4, flareEvery 3 }` (`:230`); heart layouts `CANAL_HEART`, `data/districts/canals.ts:262` (A/B +1 Snuffer +1 moth, C +1 moth) | the CN-13 tuning is **merged** (mother HP 14 to 56) | pair heart 52 % (layouts 50/82/24), trio 97 % (target: pair +10), full trips with attrition almost never clear it (0/100), crate moored without trying 0 % in rooms 2 and 4 (limit 25 %) | log CN-13, CN-14 (heart C 24 %) |
| CN-13 golden | `DEEP = { maxRounds: 100, startHp: 20 }`, `tests/run/golden.test.ts:47` | used by the canal win trips | the golden wins only clear the heart with a full house; the trio margin (97 %) was to be checked in the CN playtest (status "Rough edges") | status file |
| **BF-20 / BF-21** | `FOUNDRY_TUNING`, `data/districts/foundry.ts:84`: `pulseDamage 1`, `pulsePush 1`, `alliedPulseDamage 2`, `alliedPulsePush 1`, `tuneLength 4`, `maxPerToneInTune 2`, `tonesInRoom {2,2,3,3,3}` | as listed | no table yet (BF-12 not merged); BF-21 is the tuning pass after BF-G1 | foundry-plan.md rows BF-20, BF-21 |
| **EN-13** drawn rooms | `src/data/drawing.ts` (planned, EN-8) | none yet | pen on bot-campaign and real saves, drawn trips per weight band at party 1-3, fallback rate, phone timing | ending-plan.md row EN-13 |
| EN-S2 generator numbers | `GEN_TUNING`, `src/data/drawing.ts` (EN-S2): `perMember`, `perDepth`, band bonus, `walkover { rounds, hpLeft }`, the walk's step; `ROOM_ROUNDS` 12 (`src/engine/drawing/generate.ts`) | EN-S2's defaults | EN-S1 at `3 + depth + band`: 100 % first try, median win round 2, median HP left 100 % (all walkovers); EN-S2's report has the after numbers | ending-plan P28 |
| HC-4 bot | `tests/sim/bot.ts` limits | greedy; stalls on some drawn start points; no Hold; never loses an ink room | fixed by EN-0's shared bot where possible; record what remains | status "Rough edges", "Known limits" |

## 2. Target bands (quoted, not set here)

| District | Band | Citation |
|---|---|---|
| Canals | fresh HP, party 2, 50+ seeds per layout: rooms 1-2 at least 85 %, room 3 at least 75 %, room 4 65-80 % with the Lamplighter (fallback at least 80 %), heart 50-65 %; party 3 within +10 points | canals-revisit-plan.md §6 "Bot targets" (line 118) |
| Seam | heart 40-60 % at party 2, 1 and 3 reported | seam-grows-plan.md row SM-6 |
| Bathhouses | room win rate within +-10 points of the canal rooms at the same depth, hearts lower by design; at most one boil-over in a median fight at heat 1-2; both outcomes occur | bathhouses-plan.md §6 (line 123) |
| Ink quarter | terms never beyond a normal room's band; term rooms at least baseline minus 10 points; the heart can be lost | ink-quarter-plan.md row IQ-20 and the settled rules (line 11) |
| Cartographers | "within the canals' band" at party sizes 1-3 | cartographers-plan.md row CG-9 |
| Bridges, foundry | **no band is stated.** Proposal: the canals' band, with the foundry's 0-bell heart winnable and 4 bells clearly easier (BF-20 wording) | bridges-plan.md BR-21 and foundry-plan.md BF-20 name no number |
| Drawn rooms | heart win rates light 60-75 %, medium 45-60 %, heavy 30-45 % (bot, fresh HP) | ending-plan.md row EN-13 |

## 3. Tasks

| ID | Goal | Size | Done when |
|---|---|---|---|
| CAL-0 | Harness: one table runner over `src/engine/sim/` (party 1-3, fresh and trip-worn HP, both span kinds, hung bells 0-4), output as markdown; the tag `ref/sm-6` (`4c77215`) already exists; review the kept SM-6 branch and port its `seam-calibration.test.ts` (`SEAM_SIM=1` table) | M | `CAL=1 pnpm vitest run tests/sim/calibration-tables.test.ts` prints one table per district in the §2 format; the default run is under 20 s and asserts no throw and no cap overrun only |
| CAL-1 | Seam and canals: apply SM-6's 72 HP only if the table agrees; re-run CN-13 (heart pair, trio, crate); update `SEAM_DEEP`/`DEEP` and the golden fixtures together | M | both districts inside their §2 band, or the miss written down with numbers; `tests/sim/seam-rooms-play.test.ts` "the heart plays to an end and is no walkover" passes; golden tests pass |
| CAL-2 | Ink quarter: pick the IQ-20 lever, give the postmaster a move or opener (IQ-23), add the `INK_CAL` postmaster row | M | table row exists; the heart is lost in some seeds and won in others; `tests/sim/postmaster-heart.test.ts` passes |
| CAL-3 | Bathhouses and bridges: BH-16 levers, BR-21 numbers; decide whether the bot learns Hold | M | tables inside the §2 band or the proposal's; no median boil before round 3 |
| CAL-4 | Foundry and cartographers (BF-20, BF-21, CG-9/10): tables at party 1-3, hung bells 0-4 | M | as CAL-3; 0 bells winnable, 4 clearly easier |
| CAL-5 | Drawn rooms (EN-13, with EN-S2's generator numbers) and the shared household sweep | M | EN-13's three weight bands; offered rooms stay inside EN-S2's walkover limit; `tests/sim/household-sweep.test.ts` unchanged in result |
| CAL-G1 | **Gate (orchestrator):** the player sees the final tables before the playtest; the player decides any band the plan could not meet | S | tables committed to a verification file; the player's call logged |

## 4. Proposals, contracts and open questions

| # | Proposal | Reason |
|---|---|---|
| P1 | **Record before drop.** Tag `ref/sm-6` (`4c77215`) is set; the SM-6 branch stays until the CAL-0 review, then goes only with the player's OK; §1 holds the data change, the tag holds the sim and the fixtures | The audit says the branch will not survive two more weeks of data changes |
| P2 | **Bridges and foundry use the canals' band** (§2) until the player names one | Neither plan states a number; BR-21 and BF-20 only say "recorded" or "inside the target band" |
| P3 | **Order inside a pass:** bot fixes first (Hold, cracks, pulses), then data numbers, then re-record golden fixtures once at the end | Golden fixtures break on any data change; one re-record avoids churn |
| P4 | **A band the data cannot reach by numbers** (the bot never loses an ink room) becomes a filed design question, not a rule change | Player decides rules; the plan decides numbers |

**Provides:** one table runner and one markdown table per district, committed to each district's verification file. **Consumes:** EN-0's `src/engine/sim/`, every content plan finished (BF-12, CG-10, EN-8), the closure plan's GATE-1 (`tests/sim/` holds the long runs). **Leaves for later tasks:** none; this plan ends the build.
**Open questions for the player:** IQ-20/IQ-G1's lever (status file "Open questions", default: playtest first); whether a heart that the bot cannot clear under attrition (canals 0/100, ink 3 %, Seam at 72 HP) should stay that hard for a human.

**Execution notes:** CAL-0 first; CAL-1 to CAL-4 are file-disjoint (data per district) and run two at a time; each pass ends with the pack's own sim (this plan owns sims). Close with one full `pnpm check`.
