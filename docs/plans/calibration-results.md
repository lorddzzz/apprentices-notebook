# Calibration results and approval register

Status: **design round complete, calibration applications and reruns owed**. CAL-0 owns this file until merge, then transfers ownership to the orchestrator. Later passes attach evidence here; CAL-G1 publishes the final tables before playtesting.

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
