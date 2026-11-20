# Cartographers' hall: verification (CAL-4)

Written 2026-11-20 by calibration pack CAL-4 for [cartographers-plan.md](cartographers-plan.md) rows CG-9 and CG-10 ("within the canals' band at party sizes 1-3"). This file holds only the combat tables; the hall's task acceptance rows stay in the plan and its test files. The hall has six encounters (rooms 1-5 and the heart, "The register hall"), so there is no one-to-one mapping to the canals' four rooms plus heart.

## CAL-4: academy fresh and worn combat tables

Produced by `tests/sim/cartographers-calibration.test.ts` (test `CAL-4: academy fresh and worn combat tables`). Reproduce: `CAL4=1 CAL4_SEEDS=8 CAL4_PARTIES=2 CAL4_OUT=out.md pnpm vitest run tests/sim/cartographers-calibration.test.ts -t "academy fresh"` (the default run is a smoke: one layout per room, aware bot, party 2; no gate, only no throw and no event-cap overrun). Every fight is `botFight` on the room as the trip builds it, 40 rounds, 600 applied actions, lite off, starter lattices, no forced victory, authored layouts only (drawn frames and fallbacks are CAL-5). Default bot (`botFight` with no options) and aware bot (`gauge + cracks`; the hall's rub term is read through `gauge`) are both kept. 8 seeds per layout, three layouts per room, so 24 fights per pooled cell. Party 1 = Draughtsman, 2 = + Stoker, 3 = + Runaway. HP counts an apprentice erased from the paper (`out`) as 0; "members down" counts hp 0 or erased.

`tests/sim/cartographers-hall.test.ts` wins by decree to verify trip wiring and is not a win-rate sweep; it is unchanged.

### Reading the academy tables

- **Depths 1-4 vs the canals' band (party 2, aware, fresh):** 100 / 100 / 100 / 100 %. Rooms 1-3 are in band (at least 85 / 85 / 75 %); room 4 is above the 65-80 % band by 20 points. Party 3 is also 100 % in all four (within +10 of party 2). Party 1: 100 / 92 / 50 / 88 %: room 3 ("The registry") is half stalls (10 of 24 fights run to the round limit with nobody down), which reads as a bot limit, not a balance number.
- **Room 5 (deeper, non-heart), reported separately; no numeric target assigned:** party 1 aware 71 %, party 2 100 %, party 3 100 % (default bot 46 / 96 / 100 %). The canals have no room 5. **Needs the player:** assign a numeric target to room 5 (and say whether it counts as "depth 4" or as a second heart-adjacent room) before any number is tuned against it.
- **Heart-to-heart (academy heart vs the canals' 50-65 % pair band):** party 1 aware 46 % (default 33 %), party 2 96 % (default 96 %), party 3 96 % (default 100 %). Pair and trio are about 30-45 points above the band; party 1 is just under it.
- **The aware bot is better than the default bot at every party-1 room** (heart 46 vs 33 %, room 5 71 vs 46 %, room 1 100 vs 79 %), so the default-policy rows mostly measure the bot's walk onto pencil.
- **Worn trips** (real trips with first loot): party 1 clears 0/8 (4-6 stalls, mostly at room 3; 2-4 wipes), party 2 clears 2-4/8, party 3 aware 6/8 (default 2/8). The party-2 and party-3 heart reached under real wear wins 67-86 % (aware), n 3-7, lower than fresh (96 %).
- **Registrar-note watch case** (a fixed `Bolt> Swap` opening, with and without `registrar:swap`): see the section "Registrar-note watch case" at the end of this file.
- The HP column is mostly erasure: academy damage comes from being rubbed off the paper, which the greedy bot only partly avoids; wins and stalls are the reliable columns.

#### Fresh rooms

| party | policy | room | layout | wins/n | win % | lost | stalled | budget stops | mean rounds | median win round | HP left % (all) | HP left % (wins) | mean members down |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | default | 1 | The tiered seats | 8/8 | 100 | 0 | 0 | 0 | 3.4 | 3 | 100 | 100 | 0.0 |
| 1 | default | 1 | The lectern | 4/8 | 50 | 4 | 0 | 0 | 3.3 | 5 | 50 | 100 | 0.5 |
| 1 | default | 1 | The projection wall | 7/8 | 88 | 1 | 0 | 0 | 4.4 | 5 | 88 | 100 | 0.1 |
| 1 | default | 2 | The long bench | 8/8 | 100 | 0 | 0 | 0 | 6.1 | 7 | 100 | 100 | 0.0 |
| 1 | default | 2 | The tracing tables | 6/8 | 75 | 0 | 2 | 0 | 14.6 | 6 | 98 | 100 | 0.0 |
| 1 | default | 2 | The inkwell row | 8/8 | 100 | 0 | 0 | 0 | 5.9 | 6 | 98 | 98 | 0.0 |
| 1 | default | 3 | The card index | 4/8 | 50 | 1 | 3 | 0 | 19.4 | 8 | 83 | 92 | 0.1 |
| 1 | default | 3 | The ledger stacks | 4/8 | 50 | 1 | 3 | 0 | 19.6 | 9 | 85 | 100 | 0.1 |
| 1 | default | 3 | The filing aisle | 4/8 | 50 | 0 | 4 | 0 | 24.0 | 7 | 96 | 100 | 0.0 |
| 1 | default | 4 | The corrections desk | 5/8 | 63 | 1 | 2 | 0 | 20.8 | 10 | 88 | 100 | 0.1 |
| 1 | default | 4 | The struck pages | 7/8 | 88 | 1 | 0 | 0 | 8.0 | 7 | 83 | 95 | 0.1 |
| 1 | default | 4 | The red pencil | 8/8 | 100 | 0 | 0 | 0 | 21.3 | 23 | 100 | 100 | 0.0 |
| 1 | default | 5 (deeper, non-heart) | The owner's desk | 5/8 | 63 | 3 | 0 | 0 | 10.3 | 9 | 60 | 97 | 0.4 |
| 1 | default | 5 (deeper, non-heart) | The unswept floor | 5/8 | 63 | 3 | 0 | 0 | 15.5 | 8 | 63 | 100 | 0.4 |
| 1 | default | 5 (deeper, non-heart) | The shuttered window | 1/8 | 13 | 7 | 0 | 0 | 5.4 | 9 | 13 | 100 | 0.9 |
| 1 | default | 6 (heart) | The register | 2/8 | 25 | 6 | 0 | 0 | 7.5 | 10 | 23 | 92 | 0.8 |
| 1 | default | 6 (heart) | The struck name | 3/8 | 38 | 5 | 0 | 0 | 10.0 | 8 | 38 | 100 | 0.6 |
| 1 | default | 6 (heart) | The ruled columns | 3/8 | 38 | 5 | 0 | 0 | 10.3 | 16 | 38 | 100 | 0.6 |
| 1 | aware | 1 | The tiered seats | 8/8 | 100 | 0 | 0 | 0 | 3.4 | 3 | 100 | 100 | 0.0 |
| 1 | aware | 1 | The lectern | 8/8 | 100 | 0 | 0 | 0 | 4.8 | 5 | 100 | 100 | 0.0 |
| 1 | aware | 1 | The projection wall | 8/8 | 100 | 0 | 0 | 0 | 4.8 | 5 | 100 | 100 | 0.0 |
| 1 | aware | 2 | The long bench | 8/8 | 100 | 0 | 0 | 0 | 5.8 | 6 | 100 | 100 | 0.0 |
| 1 | aware | 2 | The tracing tables | 6/8 | 75 | 0 | 2 | 0 | 14.6 | 6 | 98 | 100 | 0.0 |
| 1 | aware | 2 | The inkwell row | 8/8 | 100 | 0 | 0 | 0 | 5.9 | 6 | 98 | 98 | 0.0 |
| 1 | aware | 3 | The card index | 5/8 | 63 | 0 | 3 | 0 | 20.8 | 8 | 96 | 93 | 0.0 |
| 1 | aware | 3 | The ledger stacks | 4/8 | 50 | 1 | 3 | 0 | 19.6 | 9 | 85 | 100 | 0.1 |
| 1 | aware | 3 | The filing aisle | 3/8 | 38 | 1 | 4 | 0 | 23.6 | 7 | 88 | 100 | 0.1 |
| 1 | aware | 4 | The corrections desk | 5/8 | 63 | 1 | 2 | 0 | 21.0 | 10 | 88 | 100 | 0.1 |
| 1 | aware | 4 | The struck pages | 8/8 | 100 | 0 | 0 | 0 | 14.5 | 11 | 98 | 98 | 0.0 |
| 1 | aware | 4 | The red pencil | 8/8 | 100 | 0 | 0 | 0 | 20.5 | 23 | 100 | 100 | 0.0 |
| 1 | aware | 5 (deeper, non-heart) | The owner's desk | 7/8 | 88 | 1 | 0 | 0 | 12.3 | 9 | 85 | 98 | 0.1 |
| 1 | aware | 5 (deeper, non-heart) | The unswept floor | 6/8 | 75 | 2 | 0 | 0 | 16.9 | 14 | 75 | 100 | 0.3 |
| 1 | aware | 5 (deeper, non-heart) | The shuttered window | 4/8 | 50 | 3 | 1 | 0 | 12.8 | 14 | 63 | 100 | 0.4 |
| 1 | aware | 6 (heart) | The register | 2/8 | 25 | 5 | 1 | 0 | 11.5 | 10 | 35 | 92 | 0.6 |
| 1 | aware | 6 (heart) | The struck name | 4/8 | 50 | 4 | 0 | 0 | 9.1 | 8 | 50 | 100 | 0.5 |
| 1 | aware | 6 (heart) | The ruled columns | 5/8 | 63 | 3 | 0 | 0 | 10.4 | 13 | 60 | 97 | 0.4 |
| 2 | default | 1 | The tiered seats | 8/8 | 100 | 0 | 0 | 0 | 2.1 | 2 | 100 | 100 | 0.0 |
| 2 | default | 1 | The lectern | 7/8 | 88 | 1 | 0 | 0 | 3.0 | 3 | 67 | 77 | 0.6 |
| 2 | default | 1 | The projection wall | 8/8 | 100 | 0 | 0 | 0 | 2.0 | 2 | 95 | 95 | 0.1 |
| 2 | default | 2 | The long bench | 8/8 | 100 | 0 | 0 | 0 | 2.9 | 3 | 87 | 87 | 0.3 |
| 2 | default | 2 | The tracing tables | 8/8 | 100 | 0 | 0 | 0 | 3.1 | 4 | 96 | 96 | 0.0 |
| 2 | default | 2 | The inkwell row | 8/8 | 100 | 0 | 0 | 0 | 2.4 | 2 | 97 | 97 | 0.0 |
| 2 | default | 3 | The card index | 8/8 | 100 | 0 | 0 | 0 | 3.0 | 3 | 100 | 100 | 0.0 |
| 2 | default | 3 | The ledger stacks | 8/8 | 100 | 0 | 0 | 0 | 3.8 | 4 | 87 | 87 | 0.3 |
| 2 | default | 3 | The filing aisle | 8/8 | 100 | 0 | 0 | 0 | 3.5 | 3 | 88 | 88 | 0.3 |
| 2 | default | 4 | The corrections desk | 8/8 | 100 | 0 | 0 | 0 | 4.5 | 4 | 92 | 92 | 0.1 |
| 2 | default | 4 | The struck pages | 8/8 | 100 | 0 | 0 | 0 | 3.5 | 4 | 91 | 91 | 0.1 |
| 2 | default | 4 | The red pencil | 8/8 | 100 | 0 | 0 | 0 | 8.5 | 4 | 79 | 79 | 0.4 |
| 2 | default | 5 (deeper, non-heart) | The owner's desk | 8/8 | 100 | 0 | 0 | 0 | 6.9 | 5 | 76 | 76 | 0.4 |
| 2 | default | 5 (deeper, non-heart) | The unswept floor | 8/8 | 100 | 0 | 0 | 0 | 4.5 | 5 | 91 | 91 | 0.1 |
| 2 | default | 5 (deeper, non-heart) | The shuttered window | 7/8 | 88 | 1 | 0 | 0 | 5.5 | 6 | 51 | 58 | 1.0 |
| 2 | default | 6 (heart) | The register | 8/8 | 100 | 0 | 0 | 0 | 5.4 | 5 | 80 | 80 | 0.3 |
| 2 | default | 6 (heart) | The struck name | 7/8 | 88 | 1 | 0 | 0 | 5.0 | 4 | 72 | 83 | 0.4 |
| 2 | default | 6 (heart) | The ruled columns | 8/8 | 100 | 0 | 0 | 0 | 4.4 | 4 | 86 | 86 | 0.1 |
| 2 | aware | 1 | The tiered seats | 8/8 | 100 | 0 | 0 | 0 | 2.1 | 2 | 100 | 100 | 0.0 |
| 2 | aware | 1 | The lectern | 8/8 | 100 | 0 | 0 | 0 | 2.8 | 3 | 99 | 99 | 0.0 |
| 2 | aware | 1 | The projection wall | 8/8 | 100 | 0 | 0 | 0 | 2.0 | 2 | 100 | 100 | 0.0 |
| 2 | aware | 2 | The long bench | 8/8 | 100 | 0 | 0 | 0 | 2.9 | 3 | 99 | 99 | 0.0 |
| 2 | aware | 2 | The tracing tables | 8/8 | 100 | 0 | 0 | 0 | 3.1 | 4 | 96 | 96 | 0.0 |
| 2 | aware | 2 | The inkwell row | 8/8 | 100 | 0 | 0 | 0 | 2.4 | 2 | 97 | 97 | 0.0 |
| 2 | aware | 3 | The card index | 8/8 | 100 | 0 | 0 | 0 | 3.0 | 3 | 100 | 100 | 0.0 |
| 2 | aware | 3 | The ledger stacks | 8/8 | 100 | 0 | 0 | 0 | 3.5 | 4 | 99 | 99 | 0.0 |
| 2 | aware | 3 | The filing aisle | 8/8 | 100 | 0 | 0 | 0 | 3.1 | 3 | 100 | 100 | 0.0 |
| 2 | aware | 4 | The corrections desk | 8/8 | 100 | 0 | 0 | 0 | 4.1 | 4 | 99 | 99 | 0.0 |
| 2 | aware | 4 | The struck pages | 8/8 | 100 | 0 | 0 | 0 | 3.5 | 4 | 96 | 96 | 0.0 |
| 2 | aware | 4 | The red pencil | 8/8 | 100 | 0 | 0 | 0 | 3.9 | 4 | 100 | 100 | 0.0 |
| 2 | aware | 5 (deeper, non-heart) | The owner's desk | 8/8 | 100 | 0 | 0 | 0 | 4.8 | 4 | 89 | 89 | 0.1 |
| 2 | aware | 5 (deeper, non-heart) | The unswept floor | 8/8 | 100 | 0 | 0 | 0 | 4.4 | 4 | 98 | 98 | 0.0 |
| 2 | aware | 5 (deeper, non-heart) | The shuttered window | 8/8 | 100 | 0 | 0 | 0 | 4.6 | 5 | 93 | 93 | 0.1 |
| 2 | aware | 6 (heart) | The register | 8/8 | 100 | 0 | 0 | 0 | 4.6 | 5 | 92 | 92 | 0.0 |
| 2 | aware | 6 (heart) | The struck name | 7/8 | 88 | 1 | 0 | 0 | 5.4 | 4 | 80 | 92 | 0.3 |
| 2 | aware | 6 (heart) | The ruled columns | 8/8 | 100 | 0 | 0 | 0 | 4.4 | 4 | 86 | 86 | 0.1 |
| 3 | default | 1 | The tiered seats | 8/8 | 100 | 0 | 0 | 0 | 2.1 | 2 | 100 | 100 | 0.0 |
| 3 | default | 1 | The lectern | 8/8 | 100 | 0 | 0 | 0 | 2.8 | 3 | 74 | 74 | 0.8 |
| 3 | default | 1 | The projection wall | 8/8 | 100 | 0 | 0 | 0 | 2.0 | 2 | 96 | 96 | 0.1 |
| 3 | default | 2 | The long bench | 8/8 | 100 | 0 | 0 | 0 | 2.8 | 3 | 91 | 91 | 0.3 |
| 3 | default | 2 | The tracing tables | 8/8 | 100 | 0 | 0 | 0 | 2.5 | 3 | 98 | 98 | 0.0 |
| 3 | default | 2 | The inkwell row | 8/8 | 100 | 0 | 0 | 0 | 2.3 | 2 | 94 | 94 | 0.1 |
| 3 | default | 3 | The card index | 8/8 | 100 | 0 | 0 | 0 | 2.5 | 3 | 91 | 91 | 0.3 |
| 3 | default | 3 | The ledger stacks | 8/8 | 100 | 0 | 0 | 0 | 2.9 | 3 | 88 | 88 | 0.4 |
| 3 | default | 3 | The filing aisle | 8/8 | 100 | 0 | 0 | 0 | 3.0 | 3 | 88 | 88 | 0.4 |
| 3 | default | 4 | The corrections desk | 8/8 | 100 | 0 | 0 | 0 | 3.9 | 4 | 86 | 86 | 0.4 |
| 3 | default | 4 | The struck pages | 8/8 | 100 | 0 | 0 | 0 | 3.4 | 3 | 87 | 87 | 0.4 |
| 3 | default | 4 | The red pencil | 8/8 | 100 | 0 | 0 | 0 | 3.5 | 3 | 81 | 81 | 0.5 |
| 3 | default | 5 (deeper, non-heart) | The owner's desk | 8/8 | 100 | 0 | 0 | 0 | 3.6 | 4 | 80 | 80 | 0.5 |
| 3 | default | 5 (deeper, non-heart) | The unswept floor | 8/8 | 100 | 0 | 0 | 0 | 4.0 | 4 | 83 | 83 | 0.5 |
| 3 | default | 5 (deeper, non-heart) | The shuttered window | 8/8 | 100 | 0 | 0 | 0 | 3.9 | 4 | 71 | 71 | 0.9 |
| 3 | default | 6 (heart) | The register | 8/8 | 100 | 0 | 0 | 0 | 4.0 | 4 | 78 | 78 | 0.5 |
| 3 | default | 6 (heart) | The struck name | 8/8 | 100 | 0 | 0 | 0 | 4.1 | 4 | 66 | 66 | 0.9 |
| 3 | default | 6 (heart) | The ruled columns | 8/8 | 100 | 0 | 0 | 0 | 3.5 | 4 | 89 | 89 | 0.3 |
| 3 | aware | 1 | The tiered seats | 8/8 | 100 | 0 | 0 | 0 | 2.1 | 2 | 100 | 100 | 0.0 |
| 3 | aware | 1 | The lectern | 8/8 | 100 | 0 | 0 | 0 | 2.6 | 3 | 100 | 100 | 0.0 |
| 3 | aware | 1 | The projection wall | 8/8 | 100 | 0 | 0 | 0 | 2.0 | 2 | 100 | 100 | 0.0 |
| 3 | aware | 2 | The long bench | 8/8 | 100 | 0 | 0 | 0 | 2.8 | 3 | 100 | 100 | 0.0 |
| 3 | aware | 2 | The tracing tables | 8/8 | 100 | 0 | 0 | 0 | 2.5 | 3 | 98 | 98 | 0.0 |
| 3 | aware | 2 | The inkwell row | 8/8 | 100 | 0 | 0 | 0 | 2.4 | 2 | 98 | 98 | 0.0 |
| 3 | aware | 3 | The card index | 8/8 | 100 | 0 | 0 | 0 | 2.5 | 3 | 100 | 100 | 0.0 |
| 3 | aware | 3 | The ledger stacks | 8/8 | 100 | 0 | 0 | 0 | 2.8 | 3 | 100 | 100 | 0.0 |
| 3 | aware | 3 | The filing aisle | 8/8 | 100 | 0 | 0 | 0 | 2.6 | 3 | 98 | 98 | 0.0 |
| 3 | aware | 4 | The corrections desk | 8/8 | 100 | 0 | 0 | 0 | 3.4 | 3 | 99 | 99 | 0.0 |
| 3 | aware | 4 | The struck pages | 8/8 | 100 | 0 | 0 | 0 | 3.1 | 3 | 98 | 98 | 0.0 |
| 3 | aware | 4 | The red pencil | 8/8 | 100 | 0 | 0 | 0 | 3.1 | 3 | 99 | 99 | 0.0 |
| 3 | aware | 5 (deeper, non-heart) | The owner's desk | 8/8 | 100 | 0 | 0 | 0 | 3.4 | 3 | 99 | 99 | 0.0 |
| 3 | aware | 5 (deeper, non-heart) | The unswept floor | 8/8 | 100 | 0 | 0 | 0 | 3.9 | 4 | 99 | 99 | 0.0 |
| 3 | aware | 5 (deeper, non-heart) | The shuttered window | 8/8 | 100 | 0 | 0 | 0 | 3.9 | 4 | 99 | 99 | 0.0 |
| 3 | aware | 6 (heart) | The register | 8/8 | 100 | 0 | 0 | 0 | 4.0 | 4 | 96 | 96 | 0.0 |
| 3 | aware | 6 (heart) | The struck name | 7/8 | 88 | 1 | 0 | 0 | 3.9 | 4 | 78 | 89 | 0.6 |
| 3 | aware | 6 (heart) | The ruled columns | 8/8 | 100 | 0 | 0 | 0 | 3.5 | 4 | 93 | 93 | 0.1 |

#### Fresh, pooled over the layouts of each room

| party | policy | room | wins/n | win % | lost | stalled | budget stops | mean rounds | median win round | HP left % (all) | HP left % (wins) | mean members down |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | default | 1 | 19/24 | 79 | 5 | 0 | 0 | 3.7 | 4 | 79 | 100 | 0.2 |
| 1 | default | 2 | 22/24 | 92 | 0 | 2 | 0 | 8.9 | 6 | 99 | 99 | 0.0 |
| 1 | default | 3 | 12/24 | 50 | 2 | 10 | 0 | 21.0 | 7 | 88 | 97 | 0.1 |
| 1 | default | 4 | 20/24 | 83 | 2 | 2 | 0 | 16.7 | 12 | 90 | 98 | 0.1 |
| 1 | default | 5 (deeper, non-heart) | 11/24 | 46 | 13 | 0 | 0 | 10.4 | 9 | 45 | 98 | 0.5 |
| 1 | default | 6 (heart) | 8/24 | 33 | 16 | 0 | 0 | 9.3 | 10 | 33 | 98 | 0.7 |
| 1 | aware | 1 | 24/24 | 100 | 0 | 0 | 0 | 4.3 | 4 | 100 | 100 | 0.0 |
| 1 | aware | 2 | 22/24 | 92 | 0 | 2 | 0 | 8.8 | 6 | 99 | 99 | 0.0 |
| 1 | aware | 3 | 12/24 | 50 | 2 | 10 | 0 | 21.3 | 7 | 90 | 97 | 0.1 |
| 1 | aware | 4 | 21/24 | 88 | 1 | 2 | 0 | 18.7 | 14 | 95 | 99 | 0.0 |
| 1 | aware | 5 (deeper, non-heart) | 17/24 | 71 | 6 | 1 | 0 | 14.0 | 9 | 74 | 99 | 0.3 |
| 1 | aware | 6 (heart) | 11/24 | 46 | 12 | 1 | 0 | 10.3 | 8 | 49 | 97 | 0.5 |
| 2 | default | 1 | 23/24 | 96 | 1 | 0 | 0 | 2.4 | 2 | 87 | 91 | 0.3 |
| 2 | default | 2 | 24/24 | 100 | 0 | 0 | 0 | 2.8 | 3 | 93 | 93 | 0.1 |
| 2 | default | 3 | 24/24 | 100 | 0 | 0 | 0 | 3.4 | 3 | 91 | 91 | 0.2 |
| 2 | default | 4 | 24/24 | 100 | 0 | 0 | 0 | 5.5 | 4 | 87 | 87 | 0.2 |
| 2 | default | 5 (deeper, non-heart) | 23/24 | 96 | 1 | 0 | 0 | 5.6 | 5 | 73 | 76 | 0.5 |
| 2 | default | 6 (heart) | 23/24 | 96 | 1 | 0 | 0 | 4.9 | 4 | 79 | 83 | 0.3 |
| 2 | aware | 1 | 24/24 | 100 | 0 | 0 | 0 | 2.3 | 2 | 100 | 100 | 0.0 |
| 2 | aware | 2 | 24/24 | 100 | 0 | 0 | 0 | 2.8 | 3 | 98 | 98 | 0.0 |
| 2 | aware | 3 | 24/24 | 100 | 0 | 0 | 0 | 3.2 | 3 | 100 | 100 | 0.0 |
| 2 | aware | 4 | 24/24 | 100 | 0 | 0 | 0 | 3.8 | 4 | 99 | 99 | 0.0 |
| 2 | aware | 5 (deeper, non-heart) | 24/24 | 100 | 0 | 0 | 0 | 4.6 | 4 | 93 | 93 | 0.1 |
| 2 | aware | 6 (heart) | 23/24 | 96 | 1 | 0 | 0 | 4.8 | 4 | 86 | 90 | 0.1 |
| 3 | default | 1 | 24/24 | 100 | 0 | 0 | 0 | 2.3 | 2 | 90 | 90 | 0.3 |
| 3 | default | 2 | 24/24 | 100 | 0 | 0 | 0 | 2.5 | 2 | 94 | 94 | 0.1 |
| 3 | default | 3 | 24/24 | 100 | 0 | 0 | 0 | 2.8 | 3 | 89 | 89 | 0.3 |
| 3 | default | 4 | 24/24 | 100 | 0 | 0 | 0 | 3.6 | 3 | 85 | 85 | 0.4 |
| 3 | default | 5 (deeper, non-heart) | 24/24 | 100 | 0 | 0 | 0 | 3.8 | 4 | 78 | 78 | 0.6 |
| 3 | default | 6 (heart) | 24/24 | 100 | 0 | 0 | 0 | 3.9 | 4 | 78 | 78 | 0.5 |
| 3 | aware | 1 | 24/24 | 100 | 0 | 0 | 0 | 2.3 | 2 | 100 | 100 | 0.0 |
| 3 | aware | 2 | 24/24 | 100 | 0 | 0 | 0 | 2.5 | 3 | 99 | 99 | 0.0 |
| 3 | aware | 3 | 24/24 | 100 | 0 | 0 | 0 | 2.6 | 3 | 99 | 99 | 0.0 |
| 3 | aware | 4 | 24/24 | 100 | 0 | 0 | 0 | 3.2 | 3 | 99 | 99 | 0.0 |
| 3 | aware | 5 (deeper, non-heart) | 24/24 | 100 | 0 | 0 | 0 | 3.7 | 4 | 99 | 99 | 0.0 |
| 3 | aware | 6 (heart) | 23/24 | 96 | 1 | 0 | 0 | 3.8 | 4 | 89 | 93 | 0.3 |

#### Trip-worn (real trips, first loot, bot HP and charges carried)

| party | policy | room | wins/reached | win % | stalled | lost | budget stops | mean rounds | HP left % | entry HP (mean of reached) |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | default | 1 | 6/8 | 75 | 0 | 2 | 0 | 3.8 | 75 | 6.0 |
| 1 | default | 2 | 6/6 | 100 | 0 | 0 | 0 | 7.0 | 100 | 6.0 |
| 1 | default | 3 | 1/6 | 17 | 4 | 1 | 0 | 28.8 | 83 | 6.0 |
| 1 | default | 4 | 1/1 | 100 | 0 | 0 | 0 | 11.0 | 100 | 6.0 |
| 1 | default | 5 (deeper, non-heart) | 1/1 | 100 | 0 | 0 | 0 | 16.0 | 100 | 6.0 |
| 1 | default | 6 (heart) | 0/1 | 0 | 0 | 1 | 0 | 11.0 | 0 | 6.0 |
| 1 | aware | 1 | 8/8 | 100 | 0 | 0 | 0 | 4.5 | 100 | 6.0 |
| 1 | aware | 2 | 7/8 | 88 | 1 | 0 | 0 | 11.6 | 100 | 6.0 |
| 1 | aware | 3 | 2/7 | 29 | 4 | 1 | 0 | 27.0 | 86 | 6.0 |
| 1 | aware | 4 | 1/2 | 50 | 1 | 0 | 0 | 26.0 | 100 | 6.0 |
| 1 | aware | 5 (deeper, non-heart) | 1/1 | 100 | 0 | 0 | 0 | 32.0 | 100 | 6.0 |
| 1 | aware | 6 (heart) | 0/1 | 0 | 0 | 1 | 0 | 11.0 | 0 | 6.0 |
| 2 | default | 1 | 7/8 | 88 | 0 | 1 | 0 | 2.5 | 80 | 14.0 |
| 2 | default | 2 | 7/7 | 100 | 0 | 0 | 0 | 3.1 | 98 | 13.0 |
| 2 | default | 3 | 5/7 | 71 | 2 | 0 | 0 | 17.0 | 83 | 12.7 |
| 2 | default | 4 | 5/5 | 100 | 0 | 0 | 0 | 14.6 | 75 | 11.0 |
| 2 | default | 5 (deeper, non-heart) | 5/5 | 100 | 0 | 0 | 0 | 10.0 | 79 | 8.6 |
| 2 | default | 6 (heart) | 4/5 | 80 | 0 | 1 | 0 | 12.8 | 43 | 7.4 |
| 2 | aware | 1 | 8/8 | 100 | 0 | 0 | 0 | 2.3 | 100 | 14.0 |
| 2 | aware | 2 | 8/8 | 100 | 0 | 0 | 0 | 3.1 | 97 | 14.0 |
| 2 | aware | 3 | 4/8 | 50 | 4 | 0 | 0 | 23.6 | 94 | 13.6 |
| 2 | aware | 4 | 3/4 | 75 | 1 | 0 | 0 | 18.8 | 89 | 13.5 |
| 2 | aware | 5 (deeper, non-heart) | 3/3 | 100 | 0 | 0 | 0 | 15.7 | 100 | 13.3 |
| 2 | aware | 6 (heart) | 2/3 | 67 | 0 | 1 | 0 | 14.3 | 68 | 13.3 |
| 3 | default | 1 | 8/8 | 100 | 0 | 0 | 0 | 2.4 | 86 | 20.0 |
| 3 | default | 2 | 8/8 | 100 | 0 | 0 | 0 | 2.6 | 99 | 17.6 |
| 3 | default | 3 | 8/8 | 100 | 0 | 0 | 0 | 3.1 | 99 | 17.4 |
| 3 | default | 4 | 6/8 | 75 | 1 | 1 | 0 | 11.5 | 65 | 17.3 |
| 3 | default | 5 (deeper, non-heart) | 5/6 | 83 | 0 | 1 | 0 | 10.7 | 50 | 13.7 |
| 3 | default | 6 (heart) | 2/5 | 40 | 0 | 3 | 0 | 18.6 | 28 | 9.4 |
| 3 | aware | 1 | 8/8 | 100 | 0 | 0 | 0 | 2.3 | 100 | 20.0 |
| 3 | aware | 2 | 8/8 | 100 | 0 | 0 | 0 | 2.6 | 99 | 20.0 |
| 3 | aware | 3 | 8/8 | 100 | 0 | 0 | 0 | 3.1 | 99 | 19.8 |
| 3 | aware | 4 | 8/8 | 100 | 0 | 0 | 0 | 5.8 | 89 | 19.6 |
| 3 | aware | 5 (deeper, non-heart) | 7/8 | 88 | 1 | 0 | 0 | 11.1 | 80 | 17.8 |
| 3 | aware | 6 (heart) | 6/7 | 86 | 0 | 1 | 0 | 13.6 | 40 | 15.9 |
Party 1 default: trip ends {"stalled":4,"lost":4} / 8.
Party 1 aware: trip ends {"stalled":6,"lost":2} / 8.
Party 2 default: trip ends {"cleared":4,"lost":2,"stalled":2} / 8.
Party 2 aware: trip ends {"cleared":2,"stalled":5,"lost":1} / 8.
Party 3 default: trip ends {"cleared":2,"lost":5,"stalled":1} / 8.
Party 3 aware: trip ends {"stalled":1,"cleared":6,"lost":1} / 8.

## CAL-4 task 2: Registrar's HP candidates and the note's watch case (proposal-only, nothing applied)

Candidates are applied in memory (`CAL4_CAND=<name>`, `CANDIDATES` in `tests/sim/calibration/foundry-cartographers.ts`, restored after the run); no `src/data` file changed. Heart only, authored layouts, 10 seeds per layout (30 fights per cell), aware bot, party 2 unless stated. The Registrar's body is `REGISTRAR_TUNING.hp` 10 (`src/data/rivals/registrar.ts:23`; `REGISTRAR_RIVAL.hp` and `REGISTRAR_SHELL.hp` read it, and the spawned unit reads the shell).

| candidate | source fields | party 2 aware | party 2 default | party 1 aware / default | party 3 aware / default | read |
|---|---|---|---|---|---|---|
| committed (8 seeds) | `REGISTRAR_TUNING.hp` 10 | 23/24 (96 %) | 23/24 (96 %) | 11/24 (46 %) / 8/24 (33 %) | 23/24 (96 %) / 24/24 (100 %) | party 2 and 3 about +30 to +45 above the 50-65 % band |
| A1 | hp 20 | 28/30 (93 %) | n/a | n/a | n/a | above band |
| A2 | hp 30 | 23/30 (77 %) | n/a | n/a | n/a | above band |
| A3 | hp 20, `circles` 1 -> 2, `circlesBelowHalf` 2 -> 3 | 28/30 (93 %), **identical to A1** | n/a | n/a | n/a | the bot already steps off circles: 18 fights drew 70 circles (A1) vs 103 (A3) with 4 erasures in both |
| **A4** | **hp 40** | **18/30 (60 %)** | 17/30 (57 %) | 11/30 (37 %) / 7/30 (23 %) | 25/30 (83 %) / 22/30 (73 %) | **party 2 in band**; party 3 aware is +23 over party 2 (band wants within +10), party 1 under |
| A5 | hp 50 | 15/30 (50 %) | n/a | n/a | n/a | at the band's floor |

**Result.** A4 (Registrar hp 10 -> 40, three places: `REGISTRAR_TUNING.hp`, and the two copies read through `REGISTRAR_RIVAL`/`REGISTRAR_SHELL`) puts the pair in the canals' heart band (60 %, default bot 57 %) but not the trio: 83 % aware (73 % default), +23 / +16 over party 2 against "within +10". A4 is the proposal's best fit and still a **partial miss at party 3 by 13 points (aware)**; the lone apprentice is at 37 % (23 % default). The remaining levers (circles, the room-6 `ROOM_PENCIL` entry) were not measured beyond A3. The same A4 measurement says nothing about rooms 1-5: they stay above the band at party 2 (100 %), and room 5 has no assigned target (**needs the player**, see the reading above).

### Registrar-note watch case

Fixed case, not a bot play-through (`botFight` passes no footnotes and the starter pages have no Swap): the Draughtsman carries the Registrar's own `Bolt> Swap`; from every authored layout at round 1, 3 layouts x 10 seeds (30 states per room), every one-turn line (stay or any legal walk, then any legal Swap aim) is played to the end of the round with `registrar:swap` written and without it. Reproduce: `CAL4=1 CAL4_SEEDS=10 CAL4_WATCH_OUT=out.md pnpm vitest run tests/sim/cartographers-calibration.test.ts -t watch`.

| room | states | states with a Swap line leaving a foe on pencil (prevalence) | of those, the note erases a foe by round end | lines erasing the Registrar | states won outright by the erase | erased with no note (control) |
|---|---|---|---|---|---|---|
| 1 | 30 | 8 (27 %) | 8 | 0 | 0 | 0 |
| 2 | 30 | 10 (33 %) | 10 | 0 | 0 | 0 |
| 3 | 30 | 6 (20 %) | 6 | 0 | 0 | 0 |
| 4 | 30 | 8 (27 %) | 8 | 0 | 0 | 0 |
| 5 | 30 | 14 (47 %) | 14 | 0 | 0 | 0 |
| 6 (heart) | 30 | 15 (50 %) | 15 | 0 | 0 | 0 |

Benefit: where the opportunity exists, the note converts it into an erased foe at round end every time (6-15 of 30 states, 20-50 %), and with no note the same lines erase nobody (control 0). The Registrar was never erased and no state was won on round 1: in all three authored hearts he starts on plain floor (`Y`, not `y`), so a Swap cannot leave him on pencil in one turn. **Does it need a player rule decision? Not on these numbers**, because the one case that would matter (the note erasing the Registrar) did not occur in round 1; it is **unmeasured later in a fight** (he moves 1 and the pencil changes), so the check is a watch item, not cleared. The note was not nerfed. Not measured: the note's effect on a played-out fight (the bot does not cast Swap), so its win-rate benefit is unknown.

## CAL-4 task 3

Room 5’s `ROOM_PENCIL` row now schedules 80% of unplanned pencil each round (was 40%) and inks 10% of the scheduled tiles (was 45%). The room still draws two new pencil tiles per round. The higher rub rate makes the next few moves matter sooner. Room 5 has its own 65–80% fresh-pair band. The same 18 seeds were used on all three layouts after the change. The before sample uses 30 seeds per layout.

| Room 5 layout | Before | After | After losses | After stalls | After mean rounds | After party HP left |
|---|---:|---:|---:|---:|---:|---:|
| The owner’s desk | 29/30 | 15/18 | 3 | 0 | 9.8 | 67% |
| The unswept floor | 30/30 | 11/18 | 7 | 0 | 15.4 | 51% |
| The shuttered window | 30/30 | 15/18 | 3 | 0 | 13.8 | 63% |
| **Pooled, aware bot** | **89/90 (99%)** | **41/54 (76%)** | **13** | **0** | **13.0** | **61%** |

The 0.65/0.25 scheduling and ink candidate with redraw 3 reached 64/72 (89%). With redraw held at 2, 0.95/0.1 reached 21/36 (58%). The selected pair of values meets the band on the larger sample and preserves the existing redraw contract.

### Registrar

`REGISTRAR_TUNING.hp` increased from 10 to 40. The rival, shell and spawned enemy share that value. The district-aware bot played fresh starter parties on each of the three authored layouts, with 30 seeds per layout before and 24 after. Both samples used a 40-round cap and a 600-action budget. No fight exhausted the action budget.

| Party | Target | Before | After | After losses | After stalls | After mean rounds | After party HP left | Gap from target |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | 25% | 54/90 (60%) | 26/72 (36%) | 44 | 2 | 14.9 | 38% | +11 pp |
| 2 | 55% | 85/90 (94%) | 45/72 (63%) | 23 | 4 | 13.6 | 38% | +7.5 pp |
| 3 | 85% | 88/90 (98%) | 61/72 (85%) | 11 | 0 | 9.9 | 43% | −0.3 pp |

At 42 HP the same seeds yielded 24/72 solo, 44/72 duo and 60/72 trio wins (33%, 61%, 83%). The changes were two solo wins and one duo win closer to target, with one trio win lost. The 40 HP starting point stays because it lands on the trio aim and the nearby results differ by at most two fights per party size. At eight seeds per layout, the default bot’s fresh pair won 14/24 (58%) in the heart and 12/24 (50%) in room 5. The Registrar’s note stays a watch item for later-fight Swap erasures. His circle counts and the decree-based trip wiring checks were kept.

Reproduce the fresh samples with `CAL4=1 CAL4_SEEDS=24 CAL4_POLICIES=aware CAL4_ROOMS=5 CAL4_SKIP_WORN=1` for the heart on `tests/sim/cartographers-calibration.test.ts`. For room 5 use the same options with `CAL4_SEEDS=18 CAL4_PARTIES=2 CAL4_ROOMS=4`. The shared district table passed at `CAL=1 CAL_SEEDS=6 CAL_DISTRICTS=cartographers` on `tests/sim/calibration-tables.test.ts`. The aware bot cleared zero of six worn solo trips, two of six duo trips and two of six trio trips. Three pairs reached room 5 and all three advanced to the heart.

With the Registrar starting at 40 HP, the drawn fallback recording (EN-K7) ends before the fight is won. A fresh replay of the same drawn fallback and seed won in nine rounds. The shared fallback script needs the new recording. [Drawn fallback scripts](../../tests/drawing/kits-c.scripts.ts)

