# Drawn calibration (CAL-5)

Measured on the authored-district revision `29063e5` after the CAL-1–4 applications. The drawn Marginalia has its own 16 HP. The source revision already includes the 72 HP authored Marginalia, revised canal layouts, baths 32/1/1 and Steward 38, Chief Warden 28, quarter deliveries, Registrar 40 and Carillonneur 57.

## Corpus and reproduction

The frozen corpus contains eight drawings per weight band and one of each master in each band. They cover every offered rule and shape at least once and lengths 3–6. The entries pair several masters with different shapes or drawing rules and hold their shipped frame setup. The roster is the Draughtsman, then the Stoker, then the Lamp-pole Runaway. Each member uses their starter lattice, with compiled source coordinates, paths and charge counts in the `CAL5 CONFIG` output. The profile fixtures specify synthetic milestone inputs for pen and device reproduction. Player-exported saves were unavailable. [Drawings](../../tests/fixtures/calibration/drawings.ts) · [Profiles](../../tests/fixtures/calibration/profiles.json)

Run the commands serially. The production judge uses fresh HP and charges, salted boards, 4 tries (3 at the heart), 8 draws per try, 12/16 rounds and 6,000 applied actions per trial. The actual fights start through the same battle setup as the app. They use gauge and cracks, full movement search, Hold scoring off, 40 rounds and 600 applied actions. Fresh fights inspect all depths with initial shape state and default route. Carried trips pick the first loot, leave the quiet doorway with the same lattice and continue for up to 60 steps. The bridge fork uses its offered routes in seed order. Carried reach and clears use the original trips as their denominator. Round limits, operation limits, losses and stalls are recorded separately.

```sh
caffeinate -i pnpm vitest run tests/sim/generator.test.ts --reporter=dot
caffeinate -i env CAL5=1 CAL5_DETAIL=1 pnpm vitest run tests/sim/drawn-calibration.test.ts --reporter=dot
caffeinate -i env CAL5=1 CAL5_PAIR=1 CAL5_ORDINARY=1 CAL5_CANDIDATE=step2 pnpm vitest run tests/sim/drawn-calibration.test.ts -t 'production corpus tables' --reporter=dot
caffeinate -i env CAL5=1 CAL5_MASTER=marginalia CAL5_CANDIDATE=marginalia32 pnpm vitest run tests/sim/drawn-calibration.test.ts -t 'production corpus tables' --reporter=dot
caffeinate -i env HOUSEHOLD_SWEEP=1 pnpm vitest run tests/sim/household-sweep.test.ts --reporter=dot
```

Defaults are seeds 1–2 per fresh ordinary encounter, 1–4 per fresh heart and 1–2 per carried trip. The emitter prints distributions in p05/median/p95 order, by master, band, party and depth, and exposes per-room JSON with `CAL5_DETAIL=1`. It includes generation outcomes even when app setup or a fight throws. Candidate overrides are confined to the Vitest module for this file. The historical generator sweep and household assertions retain the production configuration. Desktop generation timings use Node 24.19 on macOS 26.7.3 (x86_64), with concurrent machine load. CAL-P owns device measurements.

## Historical 500-seed EN-S1/EN-S2 sweep

9/9 passed in 121 s, including the 50 deterministic replays. Offered attempts 1–4 were 239/131/67/63. First fair by attempt was 239/131/67/33, with 30 seeds never fair. Within two attempts was 370/500 (74.0%). All 500 were verified within four and all passed the layout oracle, with zero fallback, unverified or capped trials. Dull and walkovers were both 30/500 (6.0%), compared with EN-G0's 28/500 (5.6%) watch. Fair within four was 470/500 (94.0%) compared with the 94.4% watch. Offered win round p05/median/p95 was 3/3/4, with 60/85.7/95% HP remaining.

| Budget | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Offered | 8 | 21 | 85 | 123 | 112 | 88 | 52 | 10 | 1 |

The 954 bot trials had median/p95 13/20 operations. Per-room median/p95/max was 22/47/90 operations. There were six guardrail redraws and no rejected attempts. Desktop median/p95 was 187/423 ms.

## Pen, cost and loot candidates

Pen contributions are hearts/pages/capstones. Affordability counts the frozen light/medium/heavy groups, with palette and needs enforced. The opening and mid-campaign milestones predate the handover, so these rows describe potential pen capacity before the drawing table unlocks.

| Snapshot | Origin | Known pages | Pen contributions | Total | Compatible | Affordable L/M/H | Largest affordable corpus cost |
| --- | --- | ---: | --- | ---: | ---: | --- | ---: |
| Opening | Synthetic | 8 | 1/2/0 | 3 | 1 | 1/0/0 | 3 |
| Mid-campaign | Synthetic | 18 | 4/4/0 | 8 | 8 | 3/0/0 | 8 |
| Low handover | Synthetic | 25 | 7/6/0 | 13 | 24 | 8/8/0 | 13 |
| High handover | Synthetic | 31 | 7/7/5 | 19 | 24 | 8/8/8 | 18 |
| Full palette | Synthetic | 31 | 7/7/7 | 21 | 24 | 8/8/8 | 18 |
| Seven returned district saves | Frozen bot recordings, before handover | 8 each | 0/2/0 each | 2 each | 0 each | 0/0/0 each | — |

Run `CAL5_CANDIDATE=pen5 pnpm vitest run tests/sim/drawn-calibration.test.ts -t 'pen availability' --reporter=dot` (or `piece2` in the same command) and `CAL5_CANDIDATE=loot4 pnpm vitest run tests/sim/drawn-calibration.test.ts -t 'seeded drawn loot' --reporter=dot`. Compare to the same tests with no override.

| Source and exact candidate | Paired comparison | Delegated decision |
| --- | --- | --- |
| `PEN_TUNING.pagesPerPoint` 4 → 5 | Milestone totals 3/8/13/19/21 → 2/7/12/18/20. Low handover affordance 8/8/0 → 8/4/0. High handover still affords all 24. | Retain 4. Current progression gives low handover a full medium selection while reserving the sampled heavy drawings for mastery. |
| `COSTS.piece` 1 → 2 | Low handover 8/8/0 → 8/5/0. High handover 8/8/8 → 8/8/7. Frozen drawing bands agree across both values. | Retain 1. The candidate narrows ordinary composition at low handover and has no demonstrated combat benefit. |
| `DRAWN_LOOT.weights.heavy.page` 3 → 4 | Seeds 1–64 at high handover yielded 512 openings and 512 hearts per band with three cards each. Heavy method cards rose from 398 to 455 at the opening and from 393 to 452 at the heart (of 1,536 each). Heart method cards for light/medium rose from 494/400 to 566/475. Pick counts stayed 1/1/2 before the heart and 2 at the heart. | Retain 3. The heavier page weighting cuts the relative share of consumables at every heart. There is no evidence from player saves to prefer that exchange. |

## Length-six peal setup probe

A setup-only save with five recorded entries `1,2,3,4,1` round-tripped all five through the save parser. The Carillonneur fallback's four bare hooks received `1,1,2,3`, with the repeated one displacing note four. Tune activated at battle start. Combat and trip totals exclude this probe. A design choice is needed on whether a repeated note should occupy a hook ahead of a distinct note when a peal has five approaches.
