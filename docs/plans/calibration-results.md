# Calibration results and approval register

Status: **CAL-G1 dispositions recorded 2026-11-22 (below); CAL-5H owed, then the Close.** CAL-0 owns this file until merge, then transfers ownership to the orchestrator. Later passes attach evidence here; CAL-G1 publishes the final tables before playtesting.

Apply measured calibration changes that meet the agreed targets. Where targets conflict or remain out of reach, the build team chooses and applies the best supported option, records the tradeoff and remaining miss, and verifies the result. The player delegated these decisions for the rest of calibration on 2026-11-20.

[Harness and SM-6 review](calibration-harness-review.md) · [Plan §2 bands and §4 proposals](calibration-plan.md#2-target-bands-quoted-not-set-here)

## Quoted bands (calibration-plan.md §2)

| District | Band | Citation |
|---|---|---|
| Canals | fresh HP, party 2, 50+ seeds per layout: rooms 1-2 at least 85 %, room 3 at least 75 %, room 4 65-80 % with the Lamplighter (fallback at least 80 %), heart 50–65%. The heart allows a larger trio advantage. Narrow the layout spread. In the live fourth room, the 25% accidental-mooring ceiling applies separately to fresh and worn pair wins | canals-revisit-plan.md §6 “Bot targets” (line 118) |
| Seam | heart 40-60 % at party 2, 1 and 3 reported | seam-grows-plan.md row SM-6 |
| Bathhouses | Ordinary rooms within ±10 points of the canals at the same depth. Give the party until round three to react to the Steward’s first boil. Aim for 40–55% fresh-pair heart wins and a median of at most one boil per ordinary fight at heat one or two. | BH-16 and player round 2026-11-20 |
| Ink quarter | terms never beyond a normal room's band; term rooms at least baseline minus 10 points; the heart can be lost | ink-quarter-plan.md row IQ-20 and the settled rules (line 11) |
| Cartographers | Depths 1–4 use the canals comparison. Aim for about 25% solo, 55% duo and 85% trio fresh wins against the Registrar. Use 40 HP as the measured starting point. Academy room five targets 65–80% fresh-pair wins. | CG-9 and player round 2026-11-20 |
| Bridges, foundry | Foundry heart, fresh pair: 20–30% wins with zero bells and 80–90% with four. On each span, aim for 75–90% fresh-pair heart wins and 25–35% worn-pair clears per trip started. Count stalls separately from losses. These are working targets to test. Ordinary foundry rooms target at least 85% fresh-pair wins in rooms 1–2, at least 75% in room 3 and 65–80% in room 4. | bridges-plan.md BR-21 and foundry-plan.md BF-20 name no number |
| Drawn rooms | heart win rates light 60-75 %, medium 45-60 %, heavy 30-45 % (bot, fresh HP) | ending-plan.md row EN-13 |

**P2 decided 2026-11-20.** Use the district-specific bridge and foundry targets above. Record observed rates separately from targets.

## Approval schema (copy for each district/pass)

| Field | Required record |
|---|---|
| Identity | district, CAL task, code commit, date, evidence/table link |
| Reproduction | exact command, seed range/count, party lineup and loadout, policy flags, round/action/trip caps |
| Axes | encounter depth, layout, fresh vs actual trip-worn, bridge span, hung bells 0–4, drawn band/drawing identity |
| Denominators | wins/reached, reached/attempted trips, zero-reach depths/layouts, stalled/exhausted fights, trip endings |
| State | entry HP and charges; naturally earned bells on worn trips; no synthetic HP discount |
| Other outcomes | rounds distribution, falls, boils/first boil, terms, cargo, heart trick/page, generated attempts/fallbacks/walkovers as applicable |
| Comparison | quoted band/citation, observed miss, policy limits/confounders; “not measured” for missing evidence |
| Proposal | old → candidate value, reason, affected files/fixtures, P2 status if relevant |
| Validation | named checks, runtime, golden/heart-play fallout, unchanged production boundary where applicable |
| Player decision | pending / approved / rejected / exception; player's exact decision, date and decision-log link |
| Ownership | implementer, orchestrator after merge, next action |

No automatic win-percentage acceptance assertion belongs in CAL-0. A later pass must explain misses; the build team resolves exceptions and unsettled bands under the standing decision above.

## Harness usage and baseline evidence

- `pnpm vitest run tests/sim/calibration-tables.test.ts tests/sim/seam-calibration.test.ts --reporter=dot`: bounded smoke (one seed, founding pair, first layout/axis/depth per district plus real trips; four rounds and 32 applied actions per fight). Ported Seam smoke uses the same surface. Only throws/cap overruns fail; stalls, wipes and missing depths remain evidence.
- `CAL=1 pnpm vitest run tests/sim/calibration-tables.test.ts --reporter=dot`: all eight tables, parties 1–3, every authored layout, all fresh depths, real trip reach by layout/depth, both spans, foundry fresh 0–4 bells and naturally earned worn bells, drawn light/medium/heavy. Defaults: seeds 1–50, 40 rounds, 600 applied actions, full movement search. Gauge and cracks enabled; first loot, onward, unchanged doorway; 60-step trip guard. This policy differs from historical SM-6; remeasure rather than reuse 58%.
- `CAL_DISTRICTS=Seam,canals` filters table names (district IDs also accepted). Omitting it preserves all eight tables. `CAL_SEEDS`, `CAL_ROUNDS`, `CAL_BUDGET` override positive integer counts, which are printed. Shortened runs are harness evidence only.
- `SEAM_SIM=1 SEAM_SEEDS=50 pnpm vitest run tests/sim/seam-calibration.test.ts --reporter=dot`: thin SM-6 port. Optional `SEAM_PAIR=1` and zero-based `SEAM_ROOMS=0,3` narrow fresh output; attrition still starts at depth one.

Fresh layouts are selected through a test-only singleton variant pool before `startBattle`, preserving registered module setup. Worn trips use shared `runTrip` with app callbacks, real HP/charge losses, module state, doorway and loot transitions. An unreached room is printed as UNREACHED with 0/0 wins and 0/N reach. No prior-room wins are assumed. Foundry injected bells are fresh-only; worn bells are earned, not a forced 0–4 condition.

Drawn fixtures use the production generator, kits/heart frames and `inkRoom`: light rat/Marginalia, medium rat+sentry+familiar/Registrar, heavy the same foes/Registrar plus sympathetic bells and rope. Lengths are 3/6/6. The test profile unlocks those elements and supplies the pen through known pages, seven hearts and a Bind capstone; it retains starter lattices. Generation retains production limits: four attempts (three at the heart), eight layout draws per attempt, 12-round trials (16 at the heart), and the shared lite trial policy with its 6,000-action budget. Table round/action overrides govern measured fights, not generation trials. These are representative drawings, not an exhaustive palette or household sweep. CAL-5 owns broader samples and fallback/timing outcomes.

CAL-0 verification (2026-11-19; uncommitted worktree, git index writes denied):

| Check | Result |
|---|---|
| Both owned default sims, `--reporter=dot` | 2/2 passed; final measured combined runtime 7.16 s, below 20 s including import/transform and the ported smoke |
| `pnpm exec tsc --noEmit` | passed |
| `pnpm check:fast` | passed, 398 files / 8,654 tests; 14 existing todos and one existing unused `over` lint warning in an untouched component |
| `CAL=1 CAL_SEEDS=1 CAL_ROUNDS=1 CAL_BUDGET=8` on the table file | all eight tables passed; bounded axis/shape evidence only, 69.88 s |
| `CAL=1 CAL_SEEDS=1` on the table file | all eight tables passed with normal 40-round/600-action caps; 321.37 s; actual worn wins, wipes and stalls observed |
| `SEAM_SIM=1 SEAM_SEEDS=1` on the port file | passed, 10.90 s; pair/trio reached the heart with carried losses |

The default 50-seed full measurement was not run in CAL-0; later passes must collect it before comparing bands. No baseline percentage is accepted by this schema. Pending: CAL-1–5 collect full calibration evidence, metrics specific to each district, and misses for CAL-G1. CAL-4 must watch the Registrar note and policy limitations. Preserve legal empty-span bridges Shove for save replay.

## Approval rows (orchestrator copies from pack reports; player decisions and delegated applications)

### CAL-1 (merged 2026-11-20, 7a2cc20; tables in seam-grows-verification.md and canals-revisit-verification.md)
| ID | Current | Proposed decision | Evidence | Player decision |
|---|---|---|---|---|
| SM-6 Marginalia | 16 HP, 2 familiars, reach 1 | Apply 72 HP with the golden update in task 3; keep hand settings | Fresh pair 89/150, regression 7/15; worn pair clears 3/50; furnace hall fresh 8/50; solo/pair/trio heart 0/59.3/84.7 % | Approved 72 HP. Application and rerun owed. |
| SM-6 golden | `BOT`, no `SEAM_DEEP` | Add `SEAM_DEEP` `{maxRounds:100,startHp:20}` for win coverage; wipes stay `BOT` | All five replays diverge at 72 HP | Use the proposed win fixture when applying 72 HP. Review and replay all affected recordings. |
| CN-13 heart | Mother 56 HP, cap 4, flare 3 | Retain pending a decision on the trio margin and layout spread | Pair 52 %, trio 97.3 % (+45 vs +10 limit), layouts 50/82/24 % | Keep the Lamp-mother at 56 HP and allow a substantial trio advantage. Bring the hardest and easiest layouts closer together while retaining the 50–65% pooled fresh-pair target. |
| CN-13 room 4 and crate | Live Lamplighter, Snuffer fallback | Retain pending decisions on live-room difficulty and whether the crate limit applies to worn wins | Fresh both 100 % (ceiling 80); pair mooring 0 % fresh, 72.3 % worn live, 17.6 % fallback | Target 65–80% fresh-pair wins in the live fourth room. Accidental crate mooring should occur in at most 25% of wins, measured separately for fresh and trip-worn pairs. Test layout changes. |
| CN-13 golden | `DEEP` startHp 20 | Retain | Replays pass | Decided. Retain the 20-HP win replay and use normal starting HP for all difficulty measurements. |

### CAL-2 (merged 2026-11-20, c5d0caa; tables in ink-quarter-calibration.md)
| ID | Decision | Measured | Proposed default | Player decision |
|---|---|---|---|---|
| IQ-20-L | Clock lever | All data levers 120/120 fresh wins; deadline 1 is the only one that collects (3 %) | Playtest first; keep `CLOCK_TUNING` 3/3/2, `CLOCK_SEAL` 3 | Retain during the helper experiment. |
| IQ-20-D | A damage source for the heart (design) | Notice-first + Strike + 28 HP: 0 lost, 10.9/14 HP, 15 % stalls | Design round; without it the bot cannot lose the heart | Approved direction. Test a visible, preventable delivery by a helper that can hurt the party. Measure actual losses and stalls separately. |
| IQ-23-M | Postmaster movement | move 1/2 identical to baseline | Leave 0 | Retain 0 during the experiment. |
| IQ-23-O | Postmaster opener | Writ in every row | Keep the writ | Retain the opening writ. |
| IQ-20-T | Terms 5/6/7 | Deltas 0 to -5 points, all pay | Keep | Retain current terms. |

### CAL-4 (merged 2026-11-20, d8ccf26; tables in foundry-verification.md and cartographers-verification.md)
| ID | Proposal | Evidence | Player decision |
|---|---|---|---|
| CAL-4-A | Registrar HP 10 → 40 (`REGISTRAR_TUNING.hp` plus `REGISTRAR_RIVAL` and `REGISTRAR_SHELL` copies); needs acceptance of party 3 at +13 over the +10 limit | Party 2 aware 60 % (default 57 %), party 3 83 %, party 1 37 %; extra circles do nothing | The player accepts a large trio advantage. Aim for about 25% solo, 55% duo and 85% trio fresh wins against the Registrar. Use 40 HP as the measured starting point. At 40 HP the gaps from the three aims are +12, +5 and −2 percentage points. |
| CAL-4-B | Carillonneur HP stays 14; the player picks a foundry band and says what hung bells should do | Aware bot wins the heart 100 % at party 2 for 0-4 bells (allied pulses hit foes 0 times in 18 four-bell hearts); HP 36 → 97/87 %, HP 60 → 70/70 % with 9 stalls; the "bot never wins the heart" note is stale | Decided. Allied bells must hit enemies. Target 20–30% fresh-pair wins at zero bells and 80–90% at four. Measure all five counts on paired seeds. No HP candidate selected. |
| CAL-4-C | Academy room-5 numeric target (no canals counterpart) | Party 2 aware room 5 100 % | Decided. Target 65–80% fresh-pair wins. |
| CAL-4-D | Registrar note kept, watch item | A Swap line leaves a foe on pencil in 15/30 states and the note erases it each time; later-fight effect unmeasured | none now |

### CAL-3 (merged 2026-11-20, ca3466e; tables in bathhouses-verification.md and bridges-verification.md)
| ID | Proposal | Evidence | Player decision |
|---|---|---|---|
| BH-16 pressure | Keep current values pending review of the Steward's opening Steam hall and first stoke | Heat quarters (2,4)/(3,8)/(3,8)/(3,8), capacity/feeder/stoke 24/1/1 pips; first boil dusk 2; 24/24 heart wins; zero boils in 168 non-heart fights. Fresh pair matches canals in rooms 1-4; heart 90/90 vs canals 50/90 (+44 pts); worn pair median boils at heat 2 is 3 (limit 1) | Give the party until round three to react to the Steward’s first boil. Aim for 40–55% fresh-pair heart wins and a median of at most one boil per ordinary fight at heat one or two. |
| BH-16 bodies | Keep current values pending a decision on timing and heart difficulty | Heat (2,4)/(3,8)/(3,8)/(2,6), capacity/feeder/stoke 32/1/1, attendant/boilerman/bather/Steward HP 7/5/5/20, fallback damage 2: first boil dusk 3, heart 24/24, room 4 20/24 (8 seeds/layout) | Use the round-three candidate as an experiment. It won 24/24 fresh hearts, so the body values still need tuning. |
| BH-16 acceptance | Replace the historical two-win assertion with authored timing and an agreed win band? | Existing assertion passes and stays | Test the authored warning time and both fight outcomes. Replace the historical two-win expectation when the revised encounter is verified against the agreed target. |
| P2 / BR-21 | Adopt the canals' fresh-pair band for bridges (with a room-4 mapping), or a bridge-specific band? | Stone 3/1, keystone 8, Chief 14, foes 5/4/4, elite fall 4: fresh hearts still 8/8 per span; worn room-3 stalls up (sound 6→7, crumbling 0→4 of 8). Baseline: fresh pairs 50/50 hearts on both spans, worn pairs clear 0, worn trios 11/50 sound and 50/50 crumbling | On each span, aim for 75–90% fresh-pair heart wins and 25–35% worn-pair clears per trip started. Count stalls separately from losses. These are working targets to test. Retain current values for the next comparison. Investigate low-charge stalls on the approach before increasing enemy HP. |

## Task 3 applications (2026-11-21, delegated; details in each district's verification file)
| ID | Applied | Result | Remaining miss |
|---|---|---|---|
| SM-6 | Marginalia 72 HP, SEAM_DEEP golden win config; drawn frame keeps 16 | fresh pair 89/150 | none |
| CN-13 | heart layouts B/C rebalanced, eel-lane crate routes, Mother 56 | layouts 50/62/76 %, pooled 62.7 %; mooring 0 % fresh / 21.3 % worn | room 4 live 100 % (target 65-80); Lamplighter 42 HP crashes the bot (`Stoker is down`) |
| IQ-20-D2 | postmaster deliveries: 4 shielded letters, burst 4 | fresh heart 79 % won / 10 % lost / 11 % stalled; worn 6/6 lost | IQ-20-W: wax bar at the heart 75 → 55 % (paid 61 %) |
| BH-16 | heat 2/3/3/2 quarters, capacity 32, feeder/stoke 1, bodies 6/4/4, Steward 38, fallback damage 2 | see bathhouses-verification.md | check the heart band 40-55 % in CAL-5/G1 |
| BR-21 | Chief Warden 28 (32 hit the drawn-room generator, EN-K8) | sound heart may overshoot 75-90 % | remeasure |
| CAL-4-A | Registrar 40 HP | solo/duo/trio 36/63/85 % | solo +11 pp, duo +8 pp |
| CAL-4-B/C | allied pulses fixed; Carillonneur 57, clapper 6/2/4; room-5 pencil | paired 0-4 bells 28/44/61/61/67 %; room 5 76 % | four bells 13 pp short; foundry room 4 100 % |

### CAL-F2 (measured 2026-11-21, not applied)
| ID | Candidate C4 | Measured | Decision |
|---|---|---|---|
| CAL-F2 room 4 | Lamplighter 18 HP, two eels | fresh pair 150/0/0, 5 rounds, 11 HP; mooring fresh 0 → 22 %, worn 21.3 → 42.6 % (ceiling 25 %) | Rejected under delegation: no win-rate gain, worn mooring regressed. Room 4 stays at 100 % wins as an open miss; a stronger Lamplighter kit is player question 3 (default no). Patch kept at /tmp/calf2.mbox. |
| CAL-F2 Snuffer fallback | two eels and rats | 150/0/0; mooring fresh 0 %, worn 19.1 % | Not applied with the rest. |

### CAL-F3 and CAL-F4 (applied 2026-11-21)
| ID | Applied | Result | Remaining miss |
|---|---|---|---|
| CAL-F3 hooks | H2: first hook beside the Carillonneur, pulse damage 2 | 0 bells 16/60 (27 %), 4 bells 56/60 (93 %) | four bells 3 pp over the ceiling |
| CAL-F3 loft | clapper 12, detuner 6 | room 4 44/60 (73 %): 3 losses, 13 stalls | stall-shaped (player Q1, default: stalls are misses) |
| CAL-F3 Registrar | move kept 1 (move 2: 26/72/81 %) | solo +11, duo +8 pp | accepted |
| CAL-F4 Chief | authored 32 HP (drawn stays 28) | sound 80 %, crumbling 67.5 % fresh pair | crumbling 7.5 pp short; worn pairs clear 0/40 per span |
| CAL-F4 Steward | 38 kept | 46.7 % hearts, first boil dusk 3-4 | none |

### CAL-P (merged 2026-11-21; docs/plans/calibration-phone.md)
| ID | Result | Status |
|---|---|---|
| EN-13 timing, emulated (HeadlessChrome 153, macOS), 60 rooms, 49 accepted / 11 fallbacks | direct median/p95 cold 111/526 ms, warm 108/505 ms; worker round trip cold 116/520, warm 119/522 ms | bar (median 0.5 s, p95 2 s) met on desktop CPU only; real iPhone owed |
| EN-13 timing, **real iPhone** (iOS 18.7, Safari, 2026-11-22, 60 rooms, 58 accepted / 2 fallbacks, 9 dull, 26 median ops) | direct median/p95 cold 144/349 ms, warm 152/371 ms; worker inside cold 206/505, warm 221/537 ms; round trip cold 214/774, warm 222/682 ms | **bar met** (median 0.5 s, p95 2 s) with about 4x margin at p95. The two fallback rooms (seeds 2, 31) cost 1.3 s and 2.4 s in the worker (warm), outside the accepted-room bar: the worst-case wait before a fallback room |
| BL-111 offline check, real iPhone, live site, fresh save (2026-11-22) | home, a Seam trip (fight, loot) and the Lab all worked in Airplane Mode | **met**; set-out on a drawn page offline (generation worker chunk) not tried |
| Phone states 375x812 | 15 screenshots in calibration-evidence/, no horizontal overflow, no app console errors; light trip played, medium/heavy only to the dialog | generator page logs one unexamined 404 |

## Household sweep, sharded (10 seeds)

CAL-5 safety and placement measurement on `bade83e4daa093894ba3b08c5f858e357ec438d2`, 2026-11-21 (macOS x64, Node 24.19.0, Vitest 5.0.3). The frozen install completed using a local pnpm store after the registry DNS lookup failed.

The checked-in HC-9 suite groups cases by lineup. A temporary Vitest adapter prefixed case names by district, scoped the room and trip loops, and logged completed samples and failure context. Seam and Canals used the original case order and Vitest console buffering. The other five shards ran the random-walk and trip suites before the fresh-fight batches and streamed console output. For the legacy drawn-versus-fixed case, the adapter retained each district's totals for the original combined assertion across Seam and Canals.

```sh
CAL5_DISTRICT="$district" HOUSEHOLD_SWEEP=1 HOUSEHOLD_SEEDS=10 \
  pnpm vitest run tests/sim/household-sweep.test.ts -t "$district" \
  --config /tmp/cal5-sweep-run/vite.config.mjs --reporter=verbose
```

Logs are `/tmp/cal5-sweep-<district>.log`. The supervisor ran up to two shards at once, with a 30-minute command cap, a 20-minute log inactivity cap and a 90-minute total budget. The watchdog checked every second. Fresh fights and carried trips used seeds 1–10, starter pages, and the HC-9 greedy bot's 40-round limit. Full-mode placement retained its 50 fixed seeds per layout and lineup, plus 30 seeded random parties per layout. The scoped fuzz case sampled 400 legal walks per district, up to 30 actions each, wherever it ran.

Fresh rates pool the five standard lineups over completed layout-and-lineup batches. D is Draughtsman, S is Stoker and R is Runaway. The pool includes losses and stalls in its denominator. The ten additional solo cases and the legacy comparison have separate samples. Win rates are descriptive.

| District | Shard status | Safety failures | Pooled fresh wins | D / S / D+S / D+S+R / S+R+D | Fresh W/L/S | Trips cleared | Wall (m:ss) |
|---|---|---|---|---|---|---|---:|
| Seam | Finished (25 passed) | None | 519/600 (86.5%) | 75.0% / 75.0% / 90.8% / 93.3% / 98.3% | 519/66/15 | 7/50 | 25:38 |
| Canals | Unfinished (30-minute command timeout) | No logged test failure | 675/750 (90.0%) | 80.0% / 80.0% / 92.0% / 98.0% / 100.0% | 675/55/20 | — | 30:00 |
| Ink quarter | Finished (24 passed) | None | 632/750 (84.3%) | 45.3% / 82.7% / 94.7% / 98.7% / 100.0% | 632/64/54 | 0/50 | 19:40 |
| Bathhouses | Finished (24 passed) | None | 559/750 (74.5%) | 17.3% / 67.3% / 88.0% / 100.0% / 100.0% | 559/117/74 | 0/50 | 23:57 |
| Bridges | Unfinished (30-minute command timeout) | No logged test failure | 791/850 (93.1%) | 79.4% / 88.2% / 97.6% / 100.0% / 100.0% | 791/2/57 | 0/50 | 30:01 |
| Foundry | Finished (24 passed) | None | 540/750 (72.0%) | 46.0% / 60.7% / 81.3% / 86.0% / 86.0% | 540/168/42 | 0/50 | 13:39 |
| Cartographers | Unfinished (90-minute overall budget) | No logged test failure | 828/900 (92.0%) | 69.4% / 94.4% / 96.1% / 100.0% / 100.0% | 828/7/65 | 1/50 | 18:44 |

All seven districts passed the three room-layout and placement cases, covering 107 authored layouts. All five standard fresh-fight lineups completed in every district, totaling 5,350 fights. Every district except Canals passed the whole-trip and random-walk cases, totaling 300 carried trips and 2,400 legal walks. The legacy combined drawn-versus-fixed assertion remains unverified. Seam reported 109 drawn wins and 120 fixed wins over 120 fights per mode. Canals did not reach that case.

### Seed sensitivity

The swing is the absolute change in win rate between seeds 1–5 and 6–10, in percentage points. Layout-and-lineup counts cover completed samples, including the separate solo cases.

| District | Pooled swing | Layout-and-lineup cells over 10 pp | Largest cell swing |
|---|---:|---:|---:|
| Seam | 3.7 pp | 7/180 | 60 pp |
| Canals | 1.3 pp | 5/135 | 60 pp |
| Ink quarter | 0.5 pp | 29/225 | 40 pp |
| Bathhouses | 0.8 pp | 43/225 | 60 pp |
| Bridges | 0.7 pp | 8/149 | 20 pp |
| Foundry | 4.8 pp | 47/225 | 40 pp |
| Cartographers | 1.3 pp | 7/160 | 60 pp |

The pooled rates and lineup rates stayed within 10 pp.

### Failures and unfinished work

No invariant failure, crash, or unplaceable room was logged. The full sweep remains incomplete.

- Canals — Unfinished (30-minute command timeout). The last completed case was the solo Notary. The solo Towel-bearer and later solo cases, legacy comparison, whole trips, and random walks did not finish.
- Bridges — Unfinished (30-minute command timeout). The solo Notary completed 13 of 17 layouts and was interrupted at 4.3, The thin arch. The later solo cases did not run.
- Cartographers — Unfinished (90-minute overall budget). The solo Notary completed 16 of 18 layouts and was interrupted at 6.2, The struck name. The later solo cases did not run.

## CAL-5R approval rows (drawn remeasure; data retained)

| Pack | Tunable / source | Current | Candidate | Baseline measurement | Candidate measurement | Band / miss | Bot / corpus / command / revision | Player decision | Applied revision / rerun |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| CAL-5R | Piece reach (CAL-5G) | Foot-only kit checks; all selected pieces checked | Shared footing and cardinal cast reach 4; check stamped pieces after unsupported spans fall | 99/534 invalid, 510/6/18 W/L/S | 0/534 paired invalid; 509/6/19 W/L/S, 4 median rounds, 13 median HP left; 0/2,670 invalid across seeds 1–10 | Zero invalid offers met | Ordinary seeds 1–2 paired, `48ac3f0` → `8c7192f`, b1–b3 | Retain shipped reach rule | Shipped at `8c7192f`; Independent rerun passed for fuzz, heavy, medium; light outstanding |
| CAL-5R | Held-back budget (CAL-5G) | −1 on hold | 0 on hold | 76/534 walkovers, 653 held kit issues, 510/6/18 W/L/S | 90/534 walkovers, zero held kit issues; 509/6/19 W/L/S, 4 median rounds, 13 median HP left | 16.9%, 6.9 pp above 10% in paired sample | Ordinary seeds 1–2 paired, `48ac3f0` → `8c7192f`, b1–b3; EN-S2 fuzz and CAL-5G reach test | Retain shipped budget rule; structural changes measured together | Shipped at `8c7192f`; Independent rerun passed for fuzz, heavy, medium; light outstanding |
| CAL-5R | `DRAWN_HEART_HP_BONUS` | 0/0/0 | 4/12/24 | 213/12/63 W/L/S, 12 median rounds, 6 median HP left, 99 unverified | 197/24/67 W/L/S, 16 median rounds, 6 median HP left, 139 unverified | 74.0% / 68.8% / 62.5%; medium +8.8 pp, heavy +17.5 pp | Fresh hearts, 24 drawings × lineups 1–3, seeds 1–4, `CAL5_HEARTS=1`, `heart4-12-24` at `540903d` | Reject, +40 unverified and stall-shaped misses | Defaults at `540903d`; Independent rerun passed for fuzz, heavy, medium; light outstanding |
| CAL-5R | `DRAWN_HEART_HP_BONUS` | 0/0/0 | 2/6/12 | 213/12/63 W/L/S, 12 median rounds, 6 median HP left, 99 unverified | 206/19/63 W/L/S, 14 median rounds, 6 median HP left, 125 unverified | 74.0% / 69.8% / 70.8%; medium +9.8 pp, heavy +25.8 pp | Fresh hearts, 24 drawings × lineups 1–3, seeds 1–4, `CAL5_HEARTS=1`, `heart2-6-12` at `540903d` | Reject, +26 unverified and stall-shaped misses | Defaults at `540903d`; Independent rerun passed for fuzz, heavy, medium; light outstanding |
| CAL-5R | `GEN_TUNING.bandBonus` | 0/1/2 | 1/2/3 | 484/2,670 walkovers, 16 unverified, 2539/38/93 W/L/S, 4 median rounds, 13 median HP left | 408/2,670 walkovers, 42 unverified, 0 invalid, 2466/58/146 W/L/S, 4 median rounds, 13 median HP left | 408/2670 (15.3%); 5.3 pp above 10% | Fresh ordinary, 24 drawings × lineups 1–3, seeds 1–10, `CAL5_ORDINARY=1`, `band123` at `540903d` | Reject, +26 unverified | Defaults at `540903d`; Independent rerun passed for fuzz, heavy, medium; light outstanding |
| CAL-5R | `GEN_TUNING.perMember` and `bandBonus` | 2 and 0/1/2 | 1 and 3/4/5 | 484/2,670 walkovers, 16 unverified, 2539/38/93 W/L/S, 4 median rounds, 13 median HP left | 414/2,670 walkovers, 71 unverified, 0 invalid, 2443/75/152 W/L/S, 4 median rounds, 13 median HP left | 414/2670 (15.5%); 5.5 pp above 10% | Fresh ordinary, 24 drawings × lineups 1–3, seeds 1–10, `CAL5_ORDINARY=1`, `slope1` at `540903d` | Reject, +55 unverified | Defaults at `540903d`; Independent rerun passed for fuzz, heavy, medium; light outstanding |
| CAL-5R | Steward trial parity (CAL-5G) | Trial heat 1, app heat 4 | Heat 4 on both paths | Fresh 28/0/8 W/L/S, 17 fallback, 14 unverified | Fresh 28/0/8 W/L/S, 40 median rounds, 8 median HP left; 94/94 trial and 36/36 app at heat 4 | Trial/app parity met | Three Steward drawings, lineups 1–3, fresh seeds 1–4 and carried seeds 1–2, b1–b3 | Retain shipped shared heart config | Shipped at `8c7192f`; Independent rerun passed for fuzz, heavy, medium; light outstanding |
| CAL-5R | Length-six peal (CAL-5P) | Sorted earned notes | Distinct notes first; disclose hookless limit | `1,2,3,4,1` hung `1,1,2,3` | Same entries hang `1,2,3,4`; carried Heavy Carillonneur trio seed 2 0/1/0 W/L/S, round 10, 0 HP left | Fourth distinct note restored | Seed 1 save/reload setup probe; seed 2 carried, b1–b3 | Retain shipped hook allocation and notice | Shipped at `8c7192f`; Independent rerun passed for fuzz, heavy, medium; light outstanding |

## CAL-G1 dispositions (design window, 2026-11-22, under the standing delegation)

Decided from the measured numbers above, in [drawn-calibration.md](drawn-calibration.md) "Task 3 remeasure (CAL-5R)" and the district verification files. No sim was run for this section. A **retained** miss stays a miss and is published with its size in the final tables. One fix is briefed: [CAL-5H](drawn-calibration-briefs.md#pack-cal-5h-codex-sol-62-high-the-drawn-stewards-own-hp-and-the-final-heart-rerun). Row IDs G1-1 to G1-12 are checklist items of CAL-G1, not new plan IDs.

| ID | Miss (measured) | Band | Disposition | Why, from the numbers |
|---|---|---|---|---|
| G1-1 | EN-13 drawn hearts, medium 72/96 (75.0 %, +15.0 pp) and heavy 70/96 (72.9 %, +27.9 pp); light 71/96 (74.0 %) in band | 45-60 / 30-45 % pooled | **Retain** `DRAWN_HEART_HP_BONUS` 0/0/0. **Defer** escorts by weight: not built in calibration | (1) Weight does not move the heart: the three bands are within 2.1 pp of one another (74.0 / 75.0 / 72.9 %), while lineup (solo 49/96, pair 70/96, trio 94/96) and master (Carillonneur 12/36 to Marginalia 36/36) move it by 50-60 pp. (2) The heavy ceiling is arithmetically out of reach while trios win: 45 % pooled over equal lineups needs solo + pair at most 12 wins of 64 with the trio at 31/32 (now 39 of 64). (3) The generator offers the first heart the lite bot wins within 16 rounds, else the frame's fixed fallback, so a harder heart turns into fallbacks rather than losses: HP 4/12/24 moved heavy only 10.4 pp and raised fallbacks 103 → 144 and unverified 99 → 139, and 2/6/12 moved heavy 2.1 pp for +26 unverified. Both were rejected by CAL-5R's +5 rule. (4) Escorts by weight face the same filter, and a third of hearts are the authored fallback board (103/288), where no escort can be added without changing a scripted-solve board. The expected result is the same rejection at the cost of two packs. Tradeoff accepted: a heavy drawing is harder before its heart (fresh ordinary wins light 508/510, medium 929/960, heavy 1102/1200) and pays richer loot; its heart plays like a light one. Escorts by weight stays the named lever for the player after the playtest (open question 3) |
| G1-2 | EN-S2 walkovers: drawn corpus 484/2,670 (18.1 %); the 500-seed fuzz 26/500 (5.2 %) | ≤ 10 % | **Retain** `GEN_TUNING`. **Acceptance:** EN-S2's own test, the fuzz, stays the gate (passes). The corpus is published by lineup as coverage evidence | The two runs measure different populations. The fuzz (`app/dev/samples.ts`) uses parties of 2 or 3 (trio twice as likely), Seam and canal foes only, no pieces, a plain shape and one random ordinary room. P28/P29 set the 10 % ceiling on that population. The corpus covers parties 1-3 equally on 24 full-palette drawings at every ordinary depth. Read by lineup, the corpus gives solo 337/890 (37.9 %), pair 98/890 (11.0 %) and trio 49/890 (5.5 %), so parties 2-3 give 147/1,780 (8.3 %), inside the ceiling. Solo walkovers are 70 % of the total, and 333 of the 337 are "full HP" wins longer than two rounds: for one apprentice, "ends with all the party's HP" means untouched. The criterion grows stricter with party size, and the solo spends most of its charges (48ac3f0 depth table: light depth 1 charges 5 → median 1). The two budget candidates cut the total by only 2.6-2.8 pp and added 26 and 55 unverified offers (rejected). The walkover definition is an acceptance constraint. **Recorded misses:** solo 37.9 %; light pair 34/170 (20.0 %). Judging a solo walkover by charges as well as HP would be a rule (open question, default no) |
| G1-3 | Drawn Steward: solo wins at a median of 40 rounds in every band (12/0/0, at the cap); pair 4/0/8, with stalls at 41 rounds and 8-13 HP left | feel watch (> 25 rounds) | **Build: CAL-5H.** The drawn Steward gets its own HP, as the drawn Marginalia (16) and Chief Warden (28) have. CAL-5H screens 38/30/24/14 and applies by rule | The drawn Steward inherited CAL-3's authored raise from 14 to 38 (3778348), which was tuned for the authored party-2 heart with its round-three warning. The drawn heart runs at `HEART_HEAT` from round one (CAL-5G parity). The two masters whose authored HP moved earlier had their drawn HP pinned by that precedent. Cost: at most +8 pooled wins of 288 if every Steward stall becomes a win (light ≤ 76.0 %, medium ≤ 79.2 %, heavy ≤ 75.0 %). This is recorded with G1-1 and accepted: a 40-round grind is worse play than a heart missing a band it misses anyway |
| G1-4 | CAL-5R independent light rerun stopped at the pack limit | — | **Closed by identity**; CAL-5H reruns all three heart bands if it applies a value | No `src/` file changed between `8c7192f` (the baseline, all three bands measured) and `2c87ba3`. Heavy and medium reruns reproduced the baseline exactly |
| G1-5 | Canals room 4 (live Lamplighter) fresh pair 100 % | 65-80 % | **Retain**, recorded miss (+20 pp) | Layout lever C4 rejected (no win change, worn mooring 21.3 → 42.6 % over the 25 % cap). The HP lever is stall-shaped: at 60 HP 9/12, all 3 non-wins stalls, mean 27.8 rounds; 10-36 HP won every fight. The 42 HP crash is fixed by the bot attack guard (`sim/bot.ts`), but more HP only lengthens the fight. A stronger kit is open question 3 (default no) |
| G1-6 | Foundry heart, four bells 56/60 (93 %) | 80-90 % | **Retain** | 3 pp over is 0.8 standard errors at n = 60. All 4 non-wins are losses. Zero bells 16/60 (27 %) is in band |
| G1-7 | Foundry loft (room 4) 44/60 (73 %), 3 losses and 13 stalls | 65-80 % | **Retain**: in band with stalls counted as non-wins | Stall-shaped on the escapement (12 HP Clapper). No loss-shaped candidate reached the band. Feel watch |
| G1-8 | Registrar solo 36 % (+11 pp) and duo 63 % (+8 pp); trio 85 % on target | ~25 / 55 / 85 % | **Retain** 40 HP and move 1 (accepted at CAL-F3) | Move 2 fixes solo (26 %) but moves duo and trio away (72 / 81 %). At 42 HP the result is within two fights per party size. The Registrar note's later-fight effect stays a watch item (CAL-4-D) |
| G1-9 | Authored Chief Warden, crumbling span, fresh pair 27/40 (67.5 %); sound 80 % | 75-90 % | **Retain** 32 HP | 1.1 standard errors under the floor at n = 40. Loss-shaped (13 losses, 0 stalls; 0.28 falls per fight). One HP serves both spans: 28 gave 15/16 crumbling and 16/16 sound, and 32 centres sound |
| G1-10 | Bridges worn pairs clear 0/40 per span | 25-35 % per trip started | **Retain**, recorded miss (the whole band). Not an enemy-number problem | Every worn-pair stall ends with 0-2 charges left and foes near full HP. Lower room foes (3/2/2) brought every pair to the heart, and all still stalled there. Chief HP 10-18 cleared none. The household sweep's carried trips clear 0-7 of 50 in every district, so the bot's charge economy is the limit. Charge refills or a charge-free damage line would be a rule (player) |
| G1-11 | Quarter heart 11 % stalls (fresh 79 / 10 / 11 % W/L/S) | the heart can be lost | **Retain** | The heart now loses (10 %), as IQ-20-D asked. Stalls are the greedy bot running out of charges against shielded letters (IQ-20-S) |
| G1-12 | Dev generator page logs one 404 (CAL-P) | — | **No pack.** CAL-G1's 375×812 browser check confirms the URL | Probable cause: `src/app/dev/generator.html` declares no icon, so the browser requests `/favicon.ico`. The page is dev-only and not shipped |

## CAL-5H approval row (drawn Steward HP; applied 9aae581)

| Pack | Tunable / source | Current | Candidate | Baseline | Candidate | Band / miss | Command / revision | Decision | Applied |
|---|---|---:|---:|---|---|---|---|---|---|
| CAL-5H | `DRAWN_STEWARD_HP` (src/data/drawing.ts) | 38 | 14 | 72/0/18 W/L/S, median wins solo/pair/trio 40/15/7, 38 fallback, 32 unverified | 84/0/6, median wins 16/4/4, 20 fallback, 13 unverified, heat 4 | Final EN-13: light 74.0 % in band; medium 78.1 % (+18.1 pp); heavy 74.0 % (+29.0 pp), kept as recorded misses (G1-1) | `CAL5_MASTER=bathSteward CAL5_CANDIDATE=steward14`, seeds 1-10 | Apply 14 under G1-3 | 9aae581; reruns passed. Proposal: EN-K4 fallback replay now ends at the Stoker's round-three cast (assertion unchanged) |
