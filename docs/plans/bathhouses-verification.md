# Bathhouses verification (BH)

Measurements for [bathhouses-plan.md](bathhouses-plan.md) §6.

## Authored calibration (CAL-3, BH-16)

Reproduce with `BATH_TABLE=1 pnpm vitest run tests/sim/bathhouses-calibration.test.ts --reporter=dot`.
Fresh fights use `startBattle` at each authored layout with full HP and charges. The fresh cooled rows
set the pending cold plunge before the same setup. Worn rows come from live trips and count only
fights reached. The cooled route takes the plunge after rooms 1–3 when offered. Depth 5 always uses
heat 4. Fresh canal comparisons use the same party, bot, seed range and depth, with equal numbers per
authored canal layout. Room 4 uses the current Lamplighter setup. Deltas are bath wins minus canal
wins in percentage points.

### Thirty-seed authored baseline

The aware fresh pair won 90/90 at every depth. The matching canal pair won 90/90 in rooms
1–4 and 50/90 at the heart. Ordinary bath rooms met the ±10-point comparison at 0.0 points.
The bath heart was 44.4 points above the canal heart and tied the ordinary bath rooms. The
aware fresh pair had 0–1 median boils at heat 1–2. The cooled worn pair had a median of 3 at
heat 2 in room 3, two over the limit, and the fresh solo reached a median of 3 in base heat 2.
The fresh pair's first-boil medians were dusk 3, 2, 2, 2 and 1 by depth at base heat. The
heart missed the timing by two rounds (the legacy trace reported round 2). All 90 fresh-pair
heart fights boiled and won.

The aware worn pair reached zero hearts on the base-heat route and won 1/2 on the plunge route.
Both worn pair heart fights boiled. The aware worn trio won 9 of 13 base-heat hearts reached
and 5 of 9 after plunges, with median 7 boils and first boil dusk 1 on either route. The
aware solo reached zero worn hearts. These rows track actual worn fights and carryover.
The canal comparison uses only matching fresh rows, and the trio gives a separate comparison.

Seeds 1–30, 40 rounds, 600 applied actions, full starter-lattice bot. Aware uses gauge + cracks. Blind uses neither. Hold is off in both. Worn trips carry actual HP and charges, take the first loot and leave the doorway unchanged; cooled trips prioritize the cold plunge. Opening bridge layouts precede the first span choice.

First boil uses the round in the event log, before the following round starts. The legacy bot column uses the post-action round. Both medians exclude fights without a boil. Win/loss counts exclude stalls and exhausted budgets.

#### Baths by depth and effective heat

| party | policy | state | depth | layout | heat | wins/fights | fresh canal wins/fights | delta pp | boils/fight | median boils | first boil dusk | legacy bot round | no boil | member hits/fight | wins/losses if boil | wins/losses if no boil | stalls | budget | entry HP | Steward HP |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | aware | fresh | 1 | all layouts | 1 | 90/90 | 90/90 | 0.0 | 1.04 | 1.00 | 4.00 | 5.00 | 9 | 0.00 | 81/0 | 9/0 | 0 | 0 | 6.00 | — |
| 1 | aware | fresh | 2 | all layouts | 2 | 90/90 | 90/90 | 0.0 | 2.81 | 3.00 | 2.00 | 3.00 | 0 | 0.00 | 90/0 | 0/0 | 0 | 0 | 6.00 | — |
| 1 | aware | fresh | 3 | all layouts | 3 | 38/90 | 90/90 | -57.8 | 2.82 | 3.00 | 2.00 | 3.00 | 0 | 0.00 | 38/52 | 0/0 | 0 | 0 | 6.00 | — |
| 1 | aware | fresh | 4 | all layouts | 4 | 14/90 | 90/90 | -84.4 | 4.10 | 4.00 | 2.00 | 3.00 | 0 | 0.00 | 14/76 | 0/0 | 0 | 0 | 6.00 | — |
| 1 | aware | fresh | 5 | all layouts | 4 | 88/90 | 0/90 | 97.8 | 6.16 | 6.00 | 1.00 | 2.00 | 0 | 1.60 | 88/2 | 0/0 | 0 | 0 | 6.00 | 14 |
| 1 | aware | fresh cooled | 2 | all layouts | 1 | 67/90 | 90/90 | -25.6 | 1.83 | 2.00 | 3.00 | 4.00 | 0 | 0.00 | 67/19 | 0/0 | 4 | 0 | 6.00 | — |
| 1 | aware | fresh cooled | 3 | all layouts | 2 | 38/90 | 90/90 | -57.8 | 2.82 | 3.00 | 2.00 | 3.00 | 0 | 0.00 | 38/52 | 0/0 | 0 | 0 | 6.00 | — |
| 1 | aware | fresh cooled | 4 | all layouts | 3 | 18/90 | 90/90 | -80.0 | 2.92 | 3.00 | 2.00 | 3.00 | 0 | 0.00 | 18/72 | 0/0 | 0 | 0 | 6.00 | — |
| 1 | aware | trip-worn | 1 | all layouts | 1 | 30/30 | — | — | 1.07 | 1.00 | 4.00 | 5.00 | 3 | 0.00 | 27/0 | 3/0 | 0 | 0 | 6.00 | — |
| 1 | aware | trip-worn | 2 | all layouts | 2 | 9/30 | — | — | 1.80 | 2.00 | 2.00 | 3.00 | 2 | 0.00 | 9/19 | 0/2 | 0 | 0 | 3.53 | — |
| 1 | aware | trip-worn | 3 | all layouts | 3 | 2/9 | — | — | 1.89 | 1.00 | 2.00 | 3.00 | 1 | 0.00 | 2/6 | 0/1 | 0 | 0 | 2.78 | — |
| 1 | aware | trip-worn | 4 | all layouts | 4 | 0/2 | — | — | 3.50 | 3.50 | 2.00 | 3.00 | 0 | 0.00 | 0/2 | 0/0 | 0 | 0 | 3.00 | — |
| 1 | aware | trip-worn | 5 | all layouts | 4 | 0/0 | — | — | — | — | — | — | 0 | — | 0/0 | 0/0 | 0 | 0 | — | — |
| 1 | aware | trip-worn cooled | 1 | all layouts | 1 | 30/30 | — | — | 1.07 | 1.00 | 4.00 | 5.00 | 3 | 0.00 | 27/0 | 3/0 | 0 | 0 | 6.00 | — |
| 1 | aware | trip-worn cooled | 2 | all layouts | 1 | 8/30 | — | — | 1.27 | 1.00 | 3.00 | 4.00 | 5 | 0.00 | 8/17 | 0/5 | 0 | 0 | 3.53 | — |
| 1 | aware | trip-worn cooled | 3 | all layouts | 2 | 2/8 | — | — | 2.00 | 1.00 | 2.00 | 3.00 | 1 | 0.00 | 2/5 | 0/1 | 0 | 0 | 2.88 | — |
| 1 | aware | trip-worn cooled | 4 | all layouts | 3 | 0/2 | — | — | 3.50 | 3.50 | 2.00 | 3.00 | 0 | 0.00 | 0/2 | 0/0 | 0 | 0 | 3.50 | — |
| 1 | aware | trip-worn cooled | 5 | all layouts | 4 | 0/0 | — | — | — | — | — | — | 0 | — | 0/0 | 0/0 | 0 | 0 | — | — |
| 1 | blind | fresh | 1 | all layouts | 1 | 65/90 | 90/90 | -27.8 | 0.90 | 1.00 | 4.00 | 5.00 | 9 | 0.40 | 56/25 | 9/0 | 0 | 0 | 6.00 | — |
| 1 | blind | fresh | 2 | all layouts | 2 | 57/90 | 90/90 | -36.7 | 2.44 | 2.00 | 2.00 | 3.00 | 0 | 0.57 | 57/33 | 0/0 | 0 | 0 | 6.00 | — |
| 1 | blind | fresh | 3 | all layouts | 3 | 14/90 | 90/90 | -84.4 | 2.56 | 2.00 | 2.00 | 3.00 | 0 | 0.38 | 14/76 | 0/0 | 0 | 0 | 6.00 | — |
| 1 | blind | fresh | 4 | all layouts | 4 | 0/90 | 90/90 | -100.0 | 3.71 | 4.00 | 2.00 | 3.00 | 0 | 0.39 | 0/90 | 0/0 | 0 | 0 | 6.00 | — |
| 1 | blind | fresh | 5 | all layouts | 4 | 0/90 | 0/90 | 0.0 | 4.31 | 4.00 | 1.00 | 2.00 | 0 | 3.00 | 0/90 | 0/0 | 0 | 0 | 6.00 | 14 |
| 1 | blind | fresh cooled | 2 | all layouts | 1 | 61/90 | 90/90 | -32.2 | 1.73 | 2.00 | 3.00 | 4.00 | 0 | 0.31 | 61/29 | 0/0 | 0 | 0 | 6.00 | — |
| 1 | blind | fresh cooled | 3 | all layouts | 2 | 14/90 | 90/90 | -84.4 | 2.56 | 2.00 | 2.00 | 3.00 | 0 | 0.38 | 14/76 | 0/0 | 0 | 0 | 6.00 | — |
| 1 | blind | fresh cooled | 4 | all layouts | 3 | 10/90 | 90/90 | -88.9 | 2.81 | 3.00 | 2.00 | 3.00 | 0 | 0.13 | 10/80 | 0/0 | 0 | 0 | 6.00 | — |
| 1 | blind | trip-worn | 1 | all layouts | 1 | 21/30 | — | — | 0.90 | 1.00 | 4.00 | 5.00 | 3 | 0.43 | 18/9 | 3/0 | 0 | 0 | 6.00 | — |
| 1 | blind | trip-worn | 2 | all layouts | 2 | 4/21 | — | — | 2.00 | 2.00 | 2.00 | 3.00 | 1 | 0.24 | 4/16 | 0/1 | 0 | 0 | 3.62 | — |
| 1 | blind | trip-worn | 3 | all layouts | 3 | 0/4 | — | — | 0.75 | 1.00 | 2.00 | 3.00 | 1 | 0.00 | 0/3 | 0/1 | 0 | 0 | 2.00 | — |
| 1 | blind | trip-worn | 4 | all layouts | 4 | 0/0 | — | — | — | — | — | — | 0 | — | 0/0 | 0/0 | 0 | 0 | — | — |
| 1 | blind | trip-worn | 5 | all layouts | 4 | 0/0 | — | — | — | — | — | — | 0 | — | 0/0 | 0/0 | 0 | 0 | — | — |
| 1 | blind | trip-worn cooled | 1 | all layouts | 1 | 21/30 | — | — | 0.90 | 1.00 | 4.00 | 5.00 | 3 | 0.43 | 18/9 | 3/0 | 0 | 0 | 6.00 | — |
| 1 | blind | trip-worn cooled | 2 | all layouts | 1 | 4/21 | — | — | 1.43 | 1.00 | 3.00 | 4.00 | 2 | 0.10 | 4/15 | 0/2 | 0 | 0 | 3.62 | — |
| 1 | blind | trip-worn cooled | 3 | all layouts | 2 | 0/4 | — | — | 0.75 | 1.00 | 2.00 | 3.00 | 1 | 0.00 | 0/3 | 0/1 | 0 | 0 | 2.00 | — |
| 1 | blind | trip-worn cooled | 4 | all layouts | 3 | 0/0 | — | — | — | — | — | — | 0 | — | 0/0 | 0/0 | 0 | 0 | — | — |
| 1 | blind | trip-worn cooled | 5 | all layouts | 4 | 0/0 | — | — | — | — | — | — | 0 | — | 0/0 | 0/0 | 0 | 0 | — | — |
| 2 | aware | fresh | 1 | all layouts | 1 | 90/90 | 90/90 | 0.0 | 0.04 | 0.00 | 3.00 | 4.00 | 86 | 0.00 | 4/0 | 86/0 | 0 | 0 | 14.00 | — |
| 2 | aware | fresh | 2 | all layouts | 2 | 90/90 | 90/90 | 0.0 | 0.36 | 0.00 | 2.00 | 3.00 | 58 | 0.00 | 32/0 | 58/0 | 0 | 0 | 14.00 | — |
| 2 | aware | fresh | 3 | all layouts | 3 | 90/90 | 90/90 | 0.0 | 0.97 | 1.00 | 2.00 | 3.00 | 3 | 0.00 | 87/0 | 3/0 | 0 | 0 | 14.00 | — |
| 2 | aware | fresh | 4 | all layouts | 4 | 90/90 | 90/90 | 0.0 | 1.20 | 1.00 | 2.00 | 3.00 | 0 | 0.00 | 90/0 | 0/0 | 0 | 0 | 14.00 | — |
| 2 | aware | fresh | 5 | all layouts | 4 | 90/90 | 50/90 | 44.4 | 3.44 | 3.50 | 1.00 | 2.00 | 0 | 2.41 | 90/0 | 0/0 | 0 | 0 | 14.00 | 14 |
| 2 | aware | fresh cooled | 2 | all layouts | 1 | 90/90 | 90/90 | 0.0 | 0.09 | 0.00 | 3.00 | 4.00 | 82 | 0.00 | 8/0 | 82/0 | 0 | 0 | 14.00 | — |
| 2 | aware | fresh cooled | 3 | all layouts | 2 | 90/90 | 90/90 | 0.0 | 0.93 | 1.00 | 2.50 | 3.50 | 6 | 0.00 | 84/0 | 6/0 | 0 | 0 | 14.00 | — |
| 2 | aware | fresh cooled | 4 | all layouts | 3 | 90/90 | 90/90 | 0.0 | 1.01 | 1.00 | 2.00 | 3.00 | 0 | 0.00 | 90/0 | 0/0 | 0 | 0 | 14.00 | — |
| 2 | aware | trip-worn | 1 | all layouts | 1 | 30/30 | — | — | 0.07 | 0.00 | 3.00 | 4.00 | 28 | 0.00 | 2/0 | 28/0 | 0 | 0 | 14.00 | — |
| 2 | aware | trip-worn | 2 | all layouts | 2 | 28/30 | — | — | 0.63 | 0.50 | 3.00 | 3.00 | 15 | 0.00 | 13/2 | 15/0 | 0 | 0 | 13.50 | — |
| 2 | aware | trip-worn | 3 | all layouts | 3 | 20/28 | — | — | 3.57 | 3.00 | 2.00 | 3.00 | 0 | 0.00 | 20/7 | 0/0 | 1 | 0 | 12.54 | — |
| 2 | aware | trip-worn | 4 | all layouts | 4 | 0/20 | — | — | 3.00 | 3.00 | 2.00 | 3.00 | 1 | 0.05 | 0/19 | 0/1 | 0 | 0 | 6.35 | — |
| 2 | aware | trip-worn | 5 | all layouts | 4 | 0/0 | — | — | — | — | — | — | 0 | — | 0/0 | 0/0 | 0 | 0 | — | — |
| 2 | aware | trip-worn cooled | 1 | all layouts | 1 | 30/30 | — | — | 0.07 | 0.00 | 3.00 | 4.00 | 28 | 0.00 | 2/0 | 28/0 | 0 | 0 | 14.00 | — |
| 2 | aware | trip-worn cooled | 2 | all layouts | 1 | 28/30 | — | — | 0.23 | 0.00 | 3.00 | 4.00 | 25 | 0.00 | 3/2 | 25/0 | 0 | 0 | 13.50 | — |
| 2 | aware | trip-worn cooled | 3 | all layouts | 2 | 22/28 | — | — | 3.32 | 3.00 | 2.00 | 3.00 | 0 | 0.00 | 22/6 | 0/0 | 0 | 0 | 12.54 | — |
| 2 | aware | trip-worn cooled | 4 | all layouts | 3 | 2/22 | — | — | 2.09 | 2.00 | 2.00 | 3.00 | 1 | 0.00 | 2/19 | 0/1 | 0 | 0 | 6.00 | — |
| 2 | aware | trip-worn cooled | 5 | all layouts | 4 | 1/2 | — | — | 5.50 | 5.50 | 1.00 | 2.00 | 0 | 1.50 | 1/1 | 0/0 | 0 | 0 | 2.50 | 14 |
| 2 | blind | fresh | 1 | all layouts | 1 | 90/90 | 90/90 | 0.0 | 0.04 | 0.00 | 3.00 | 4.00 | 86 | 0.01 | 4/0 | 86/0 | 0 | 0 | 14.00 | — |
| 2 | blind | fresh | 2 | all layouts | 2 | 90/90 | 90/90 | 0.0 | 0.33 | 0.00 | 2.00 | 3.00 | 60 | 0.09 | 30/0 | 60/0 | 0 | 0 | 14.00 | — |
| 2 | blind | fresh | 3 | all layouts | 3 | 90/90 | 90/90 | 0.0 | 0.97 | 1.00 | 2.00 | 3.00 | 3 | 0.20 | 87/0 | 3/0 | 0 | 0 | 14.00 | — |
| 2 | blind | fresh | 4 | all layouts | 4 | 90/90 | 90/90 | 0.0 | 1.18 | 1.00 | 2.00 | 3.00 | 0 | 0.13 | 90/0 | 0/0 | 0 | 0 | 14.00 | — |
| 2 | blind | fresh | 5 | all layouts | 4 | 90/90 | 50/90 | 44.4 | 2.87 | 3.00 | 1.00 | 2.00 | 0 | 3.92 | 90/0 | 0/0 | 0 | 0 | 14.00 | 14 |
| 2 | blind | fresh cooled | 2 | all layouts | 1 | 90/90 | 90/90 | 0.0 | 0.09 | 0.00 | 3.00 | 4.00 | 82 | 0.00 | 8/0 | 82/0 | 0 | 0 | 14.00 | — |
| 2 | blind | fresh cooled | 3 | all layouts | 2 | 90/90 | 90/90 | 0.0 | 0.93 | 1.00 | 2.50 | 3.50 | 6 | 0.26 | 84/0 | 6/0 | 0 | 0 | 14.00 | — |
| 2 | blind | fresh cooled | 4 | all layouts | 3 | 90/90 | 90/90 | 0.0 | 1.00 | 1.00 | 2.00 | 3.00 | 0 | 0.07 | 90/0 | 0/0 | 0 | 0 | 14.00 | — |
| 2 | blind | trip-worn | 1 | all layouts | 1 | 30/30 | — | — | 0.07 | 0.00 | 3.00 | 4.00 | 28 | 0.00 | 2/0 | 28/0 | 0 | 0 | 14.00 | — |
| 2 | blind | trip-worn | 2 | all layouts | 2 | 28/30 | — | — | 0.60 | 0.00 | 3.00 | 3.00 | 16 | 0.13 | 12/2 | 16/0 | 0 | 0 | 13.50 | — |
| 2 | blind | trip-worn | 3 | all layouts | 3 | 4/28 | — | — | 4.68 | 4.00 | 2.00 | 3.00 | 0 | 0.79 | 4/20 | 0/0 | 4 | 0 | 12.25 | — |
| 2 | blind | trip-worn | 4 | all layouts | 4 | 0/4 | — | — | 2.25 | 2.00 | 2.00 | 3.00 | 0 | 0.25 | 0/4 | 0/0 | 0 | 0 | 5.00 | — |
| 2 | blind | trip-worn | 5 | all layouts | 4 | 0/0 | — | — | — | — | — | — | 0 | — | 0/0 | 0/0 | 0 | 0 | — | — |
| 2 | blind | trip-worn cooled | 1 | all layouts | 1 | 30/30 | — | — | 0.07 | 0.00 | 3.00 | 4.00 | 28 | 0.00 | 2/0 | 28/0 | 0 | 0 | 14.00 | — |
| 2 | blind | trip-worn cooled | 2 | all layouts | 1 | 28/30 | — | — | 0.23 | 0.00 | 3.00 | 4.00 | 25 | 0.00 | 3/2 | 25/0 | 0 | 0 | 13.50 | — |
| 2 | blind | trip-worn cooled | 3 | all layouts | 2 | 4/28 | — | — | 4.43 | 3.50 | 2.00 | 3.00 | 0 | 0.96 | 4/23 | 0/0 | 1 | 0 | 12.54 | — |
| 2 | blind | trip-worn cooled | 4 | all layouts | 3 | 0/4 | — | — | 1.75 | 2.00 | 2.00 | 3.00 | 0 | 0.25 | 0/4 | 0/0 | 0 | 0 | 5.00 | — |
| 2 | blind | trip-worn cooled | 5 | all layouts | 4 | 0/0 | — | — | — | — | — | — | 0 | — | 0/0 | 0/0 | 0 | 0 | — | — |
| 3 | aware | fresh | 1 | all layouts | 1 | 90/90 | 90/90 | 0.0 | 0.02 | 0.00 | 3.00 | 4.00 | 88 | 0.00 | 2/0 | 88/0 | 0 | 0 | 20.00 | — |
| 3 | aware | fresh | 2 | all layouts | 2 | 90/90 | 90/90 | 0.0 | 0.13 | 0.00 | 2.00 | 3.00 | 78 | 0.00 | 12/0 | 78/0 | 0 | 0 | 20.00 | — |
| 3 | aware | fresh | 3 | all layouts | 3 | 90/90 | 90/90 | 0.0 | 0.77 | 1.00 | 2.00 | 3.00 | 21 | 0.00 | 69/0 | 21/0 | 0 | 0 | 20.00 | — |
| 3 | aware | fresh | 4 | all layouts | 4 | 90/90 | 90/90 | 0.0 | 0.97 | 1.00 | 2.00 | 3.00 | 8 | 0.00 | 82/0 | 8/0 | 0 | 0 | 20.00 | — |
| 3 | aware | fresh | 5 | all layouts | 4 | 90/90 | 87/90 | 3.3 | 2.83 | 3.00 | 1.00 | 2.00 | 0 | 2.41 | 90/0 | 0/0 | 0 | 0 | 20.00 | 14 |
| 3 | aware | fresh cooled | 2 | all layouts | 1 | 90/90 | 90/90 | 0.0 | 0.01 | 0.00 | 3.00 | 4.00 | 89 | 0.00 | 1/0 | 89/0 | 0 | 0 | 20.00 | — |
| 3 | aware | fresh cooled | 3 | all layouts | 2 | 90/90 | 90/90 | 0.0 | 0.51 | 1.00 | 2.00 | 3.00 | 44 | 0.00 | 46/0 | 44/0 | 0 | 0 | 20.00 | — |
| 3 | aware | fresh cooled | 4 | all layouts | 3 | 90/90 | 90/90 | 0.0 | 0.62 | 1.00 | 2.00 | 3.00 | 34 | 0.00 | 56/0 | 34/0 | 0 | 0 | 20.00 | — |
| 3 | aware | trip-worn | 1 | all layouts | 1 | 30/30 | — | — | 0.03 | 0.00 | 3.00 | 4.00 | 29 | 0.00 | 1/0 | 29/0 | 0 | 0 | 20.00 | — |
| 3 | aware | trip-worn | 2 | all layouts | 2 | 30/30 | — | — | 0.17 | 0.00 | 2.00 | 3.00 | 25 | 0.00 | 5/0 | 25/0 | 0 | 0 | 19.73 | — |
| 3 | aware | trip-worn | 3 | all layouts | 3 | 29/30 | — | — | 1.50 | 1.00 | 2.00 | 3.00 | 2 | 0.00 | 27/0 | 2/0 | 1 | 0 | 19.40 | — |
| 3 | aware | trip-worn | 4 | all layouts | 4 | 13/29 | — | — | 6.59 | 6.00 | 2.00 | 3.00 | 0 | 0.00 | 13/14 | 0/0 | 2 | 0 | 17.41 | — |
| 3 | aware | trip-worn | 5 | all layouts | 4 | 9/13 | — | — | 5.92 | 7.00 | 1.00 | 2.00 | 0 | 4.15 | 9/4 | 0/0 | 0 | 0 | 9.69 | 14 |
| 3 | aware | trip-worn cooled | 1 | all layouts | 1 | 30/30 | — | — | 0.03 | 0.00 | 3.00 | 4.00 | 29 | 0.00 | 1/0 | 29/0 | 0 | 0 | 20.00 | — |
| 3 | aware | trip-worn cooled | 2 | all layouts | 1 | 30/30 | — | — | 0.03 | 0.00 | 3.00 | 4.00 | 29 | 0.00 | 1/0 | 29/0 | 0 | 0 | 19.73 | — |
| 3 | aware | trip-worn cooled | 3 | all layouts | 2 | 30/30 | — | — | 1.27 | 1.00 | 2.00 | 3.00 | 2 | 0.00 | 28/0 | 2/0 | 0 | 0 | 19.43 | — |
| 3 | aware | trip-worn cooled | 4 | all layouts | 3 | 9/30 | — | — | 4.83 | 4.00 | 2.00 | 3.00 | 0 | 0.00 | 9/19 | 0/0 | 2 | 0 | 17.13 | — |
| 3 | aware | trip-worn cooled | 5 | all layouts | 4 | 5/9 | — | — | 5.78 | 7.00 | 1.00 | 2.00 | 0 | 3.89 | 5/4 | 0/0 | 0 | 0 | 7.89 | 14 |
| 3 | blind | fresh | 1 | all layouts | 1 | 90/90 | 90/90 | 0.0 | 0.02 | 0.00 | 3.00 | 4.00 | 88 | 0.02 | 2/0 | 88/0 | 0 | 0 | 20.00 | — |
| 3 | blind | fresh | 2 | all layouts | 2 | 90/90 | 90/90 | 0.0 | 0.16 | 0.00 | 2.00 | 3.00 | 76 | 0.11 | 14/0 | 76/0 | 0 | 0 | 20.00 | — |
| 3 | blind | fresh | 3 | all layouts | 3 | 90/90 | 90/90 | 0.0 | 0.76 | 1.00 | 2.00 | 3.00 | 22 | 0.23 | 68/0 | 22/0 | 0 | 0 | 20.00 | — |
| 3 | blind | fresh | 4 | all layouts | 4 | 90/90 | 90/90 | 0.0 | 0.90 | 1.00 | 2.00 | 3.00 | 9 | 0.30 | 81/0 | 9/0 | 0 | 0 | 20.00 | — |
| 3 | blind | fresh | 5 | all layouts | 4 | 90/90 | 87/90 | 3.3 | 1.86 | 2.00 | 1.00 | 2.00 | 0 | 3.03 | 90/0 | 0/0 | 0 | 0 | 20.00 | 14 |
| 3 | blind | fresh cooled | 2 | all layouts | 1 | 90/90 | 90/90 | 0.0 | 0.01 | 0.00 | 3.00 | 4.00 | 89 | 0.00 | 1/0 | 89/0 | 0 | 0 | 20.00 | — |
| 3 | blind | fresh cooled | 3 | all layouts | 2 | 90/90 | 90/90 | 0.0 | 0.49 | 0.00 | 2.00 | 3.00 | 46 | 0.21 | 44/0 | 46/0 | 0 | 0 | 20.00 | — |
| 3 | blind | fresh cooled | 4 | all layouts | 3 | 90/90 | 90/90 | 0.0 | 0.59 | 1.00 | 2.00 | 3.00 | 37 | 0.16 | 53/0 | 37/0 | 0 | 0 | 20.00 | — |
| 3 | blind | trip-worn | 1 | all layouts | 1 | 30/30 | — | — | 0.03 | 0.00 | 3.00 | 4.00 | 29 | 0.03 | 1/0 | 29/0 | 0 | 0 | 20.00 | — |
| 3 | blind | trip-worn | 2 | all layouts | 2 | 30/30 | — | — | 0.13 | 0.00 | 2.00 | 3.00 | 26 | 0.17 | 4/0 | 26/0 | 0 | 0 | 19.67 | — |
| 3 | blind | trip-worn | 3 | all layouts | 3 | 23/30 | — | — | 2.20 | 1.00 | 2.00 | 3.00 | 0 | 0.90 | 23/6 | 0/0 | 1 | 0 | 19.03 | — |
| 3 | blind | trip-worn | 4 | all layouts | 4 | 1/23 | — | — | 6.70 | 6.00 | 2.00 | 3.00 | 0 | 1.26 | 1/21 | 0/0 | 1 | 0 | 16.00 | — |
| 3 | blind | trip-worn | 5 | all layouts | 4 | 0/1 | — | — | 6.00 | 6.00 | 1.00 | 2.00 | 0 | 6.00 | 0/1 | 0/0 | 0 | 0 | 9.00 | 14 |
| 3 | blind | trip-worn cooled | 1 | all layouts | 1 | 30/30 | — | — | 0.03 | 0.00 | 3.00 | 4.00 | 29 | 0.03 | 1/0 | 29/0 | 0 | 0 | 20.00 | — |
| 3 | blind | trip-worn cooled | 2 | all layouts | 1 | 30/30 | — | — | 0.03 | 0.00 | 3.00 | 4.00 | 29 | 0.00 | 1/0 | 29/0 | 0 | 0 | 19.67 | — |
| 3 | blind | trip-worn cooled | 3 | all layouts | 2 | 23/30 | — | — | 2.13 | 1.00 | 2.00 | 3.00 | 1 | 1.00 | 22/6 | 1/0 | 1 | 0 | 19.37 | — |
| 3 | blind | trip-worn cooled | 4 | all layouts | 3 | 2/23 | — | — | 5.22 | 4.00 | 2.00 | 3.00 | 0 | 1.43 | 2/18 | 0/0 | 3 | 0 | 16.09 | — |
| 3 | blind | trip-worn cooled | 5 | all layouts | 4 | 0/2 | — | — | 3.50 | 3.50 | 1.00 | 2.00 | 0 | 4.50 | 0/2 | 0/0 | 0 | 0 | 6.00 | 14 |

<details><summary>Baths by layout</summary>

| party | policy | state | depth | layout | heat | wins/fights | fresh canal wins/fights | delta pp | boils/fight | median boils | first boil dusk | legacy bot round | no boil | member hits/fight | wins/losses if boil | wins/losses if no boil | stalls | budget | entry HP | Steward HP |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | aware | fresh | 1 | The changing hall #1 | 1 | 30/30 | 90/90 | 0.0 | 1.43 | 1.00 | 4.00 | 5.00 | 0 | 0.00 | 30/0 | 0/0 | 0 | 0 | 6.00 | — |
| 1 | aware | fresh | 1 | The scrubbing floor #2 | 1 | 30/30 | 90/90 | 0.0 | 0.70 | 1.00 | 4.00 | 5.00 | 9 | 0.00 | 21/0 | 9/0 | 0 | 0 | 6.00 | — |
| 1 | aware | fresh | 1 | The tepidarium #3 | 1 | 30/30 | 90/90 | 0.0 | 1.00 | 1.00 | 3.00 | 4.00 | 0 | 0.00 | 30/0 | 0/0 | 0 | 0 | 6.00 | — |
| 1 | aware | fresh | 2 | The steam gallery #1 | 2 | 30/30 | 90/90 | 0.0 | 3.33 | 3.00 | 2.00 | 3.00 | 0 | 0.00 | 30/0 | 0/0 | 0 | 0 | 6.00 | — |
| 1 | aware | fresh | 2 | The laundry #2 | 2 | 30/30 | 90/90 | 0.0 | 1.87 | 2.00 | 2.00 | 3.00 | 0 | 0.00 | 30/0 | 0/0 | 0 | 0 | 6.00 | — |
| 1 | aware | fresh | 2 | The boiler passage #3 | 2 | 30/30 | 90/90 | 0.0 | 3.23 | 3.00 | 2.00 | 3.00 | 0 | 0.00 | 30/0 | 0/0 | 0 | 0 | 6.00 | — |
| 1 | aware | fresh | 3 | The frigidarium #1 | 3 | 7/30 | 90/90 | -76.7 | 2.67 | 2.00 | 2.00 | 3.00 | 0 | 0.00 | 7/23 | 0/0 | 0 | 0 | 6.00 | — |
| 1 | aware | fresh | 3 | The long pool hall #2 | 3 | 24/30 | 90/90 | -20.0 | 3.00 | 3.00 | 2.00 | 3.00 | 0 | 0.00 | 24/6 | 0/0 | 0 | 0 | 6.00 | — |
| 1 | aware | fresh | 3 | The mosaic court #3 | 3 | 7/30 | 90/90 | -76.7 | 2.80 | 3.00 | 2.00 | 3.00 | 0 | 0.00 | 7/23 | 0/0 | 0 | 0 | 6.00 | — |
| 1 | aware | fresh | 4 | The great caldarium #1 | 4 | 0/30 | 90/90 | -100.0 | 3.67 | 4.00 | 2.00 | 3.00 | 0 | 0.00 | 0/30 | 0/0 | 0 | 0 | 6.00 | — |
| 1 | aware | fresh | 4 | The sudatorium #2 | 4 | 0/30 | 90/90 | -100.0 | 4.17 | 4.00 | 2.00 | 3.00 | 0 | 0.00 | 0/30 | 0/0 | 0 | 0 | 6.00 | — |
| 1 | aware | fresh | 4 | The hot springs #3 | 4 | 14/30 | 90/90 | -53.3 | 4.47 | 4.00 | 2.00 | 3.00 | 0 | 0.00 | 14/16 | 0/0 | 0 | 0 | 6.00 | — |
| 1 | aware | fresh | 5 | The steward's caldarium #1 | 4 | 30/30 | 0/90 | 100.0 | 6.07 | 6.00 | 1.00 | 2.00 | 0 | 1.47 | 30/0 | 0/0 | 0 | 0 | 6.00 | 14 |
| 1 | aware | fresh | 5 | The steward's caldarium #2 | 4 | 30/30 | 0/90 | 100.0 | 6.33 | 6.00 | 1.00 | 2.00 | 0 | 1.27 | 30/0 | 0/0 | 0 | 0 | 6.00 | 14 |
| 1 | aware | fresh | 5 | The steward's caldarium #3 | 4 | 28/30 | 0/90 | 93.3 | 6.07 | 6.00 | 1.00 | 2.00 | 0 | 2.07 | 28/2 | 0/0 | 0 | 0 | 6.00 | 14 |
| 1 | aware | fresh cooled | 2 | The steam gallery #1 | 1 | 7/30 | 90/90 | -76.7 | 2.63 | 2.00 | 3.00 | 4.00 | 0 | 0.00 | 7/19 | 0/0 | 4 | 0 | 6.00 | — |
| 1 | aware | fresh cooled | 2 | The laundry #2 | 1 | 30/30 | 90/90 | 0.0 | 1.10 | 1.00 | 3.00 | 4.00 | 0 | 0.00 | 30/0 | 0/0 | 0 | 0 | 6.00 | — |
| 1 | aware | fresh cooled | 2 | The boiler passage #3 | 1 | 30/30 | 90/90 | 0.0 | 1.77 | 2.00 | 3.00 | 4.00 | 0 | 0.00 | 30/0 | 0/0 | 0 | 0 | 6.00 | — |
| 1 | aware | fresh cooled | 3 | The frigidarium #1 | 2 | 7/30 | 90/90 | -76.7 | 2.67 | 2.00 | 2.00 | 3.00 | 0 | 0.00 | 7/23 | 0/0 | 0 | 0 | 6.00 | — |
| 1 | aware | fresh cooled | 3 | The long pool hall #2 | 2 | 24/30 | 90/90 | -20.0 | 3.00 | 3.00 | 2.00 | 3.00 | 0 | 0.00 | 24/6 | 0/0 | 0 | 0 | 6.00 | — |
| 1 | aware | fresh cooled | 3 | The mosaic court #3 | 2 | 7/30 | 90/90 | -76.7 | 2.80 | 3.00 | 2.00 | 3.00 | 0 | 0.00 | 7/23 | 0/0 | 0 | 0 | 6.00 | — |
| 1 | aware | fresh cooled | 4 | The great caldarium #1 | 3 | 0/30 | 90/90 | -100.0 | 2.27 | 2.00 | 2.00 | 3.00 | 0 | 0.00 | 0/30 | 0/0 | 0 | 0 | 6.00 | — |
| 1 | aware | fresh cooled | 4 | The sudatorium #2 | 3 | 8/30 | 90/90 | -73.3 | 3.17 | 3.00 | 2.00 | 3.00 | 0 | 0.00 | 8/22 | 0/0 | 0 | 0 | 6.00 | — |
| 1 | aware | fresh cooled | 4 | The hot springs #3 | 3 | 10/30 | 90/90 | -66.7 | 3.33 | 3.00 | 2.00 | 3.00 | 0 | 0.00 | 10/20 | 0/0 | 0 | 0 | 6.00 | — |
| 1 | aware | trip-worn | 1 | The changing hall #1 | 1 | 11/11 | — | — | 1.45 | 1.00 | 4.00 | 5.00 | 0 | 0.00 | 11/0 | 0/0 | 0 | 0 | 6.00 | — |
| 1 | aware | trip-worn | 1 | The scrubbing floor #2 | 1 | 10/10 | — | — | 0.70 | 1.00 | 4.00 | 5.00 | 3 | 0.00 | 7/0 | 3/0 | 0 | 0 | 6.00 | — |
| 1 | aware | trip-worn | 1 | The tepidarium #3 | 1 | 9/9 | — | — | 1.00 | 1.00 | 3.00 | 4.00 | 0 | 0.00 | 9/0 | 0/0 | 0 | 0 | 6.00 | — |
| 1 | aware | trip-worn | 2 | The steam gallery #1 | 2 | 3/8 | — | — | 2.13 | 2.50 | 2.00 | 3.00 | 1 | 0.00 | 3/4 | 0/1 | 0 | 0 | 4.00 | — |
| 1 | aware | trip-worn | 2 | The laundry #2 | 2 | 3/14 | — | — | 1.71 | 2.00 | 2.00 | 3.00 | 1 | 0.00 | 3/10 | 0/1 | 0 | 0 | 3.50 | — |
| 1 | aware | trip-worn | 2 | The boiler passage #3 | 2 | 3/8 | — | — | 1.63 | 1.50 | 2.00 | 3.00 | 0 | 0.00 | 3/5 | 0/0 | 0 | 0 | 3.13 | — |
| 1 | aware | trip-worn | 3 | The frigidarium #1 | 3 | 0/3 | — | — | 1.33 | 1.00 | 2.00 | 3.00 | 0 | 0.00 | 0/3 | 0/0 | 0 | 0 | 3.00 | — |
| 1 | aware | trip-worn | 3 | The long pool hall #2 | 3 | 2/3 | — | — | 3.67 | 4.00 | 2.00 | 3.00 | 0 | 0.00 | 2/1 | 0/0 | 0 | 0 | 3.33 | — |
| 1 | aware | trip-worn | 3 | The mosaic court #3 | 3 | 0/3 | — | — | 0.67 | 1.00 | 2.00 | 3.00 | 1 | 0.00 | 0/2 | 0/1 | 0 | 0 | 2.00 | — |
| 1 | aware | trip-worn | 4 | The great caldarium #1 | 4 | 0/0 | — | — | — | — | — | — | 0 | — | 0/0 | 0/0 | 0 | 0 | — | — |
| 1 | aware | trip-worn | 4 | The sudatorium #2 | 4 | 0/0 | — | — | — | — | — | — | 0 | — | 0/0 | 0/0 | 0 | 0 | — | — |
| 1 | aware | trip-worn | 4 | The hot springs #3 | 4 | 0/2 | — | — | 3.50 | 3.50 | 2.00 | 3.00 | 0 | 0.00 | 0/2 | 0/0 | 0 | 0 | 3.00 | — |
| 1 | aware | trip-worn | 5 | The steward's caldarium #1 | 4 | 0/0 | — | — | — | — | — | — | 0 | — | 0/0 | 0/0 | 0 | 0 | — | — |
| 1 | aware | trip-worn | 5 | The steward's caldarium #2 | 4 | 0/0 | — | — | — | — | — | — | 0 | — | 0/0 | 0/0 | 0 | 0 | — | — |
| 1 | aware | trip-worn | 5 | The steward's caldarium #3 | 4 | 0/0 | — | — | — | — | — | — | 0 | — | 0/0 | 0/0 | 0 | 0 | — | — |
| 1 | aware | trip-worn cooled | 1 | The changing hall #1 | 1 | 11/11 | — | — | 1.45 | 1.00 | 4.00 | 5.00 | 0 | 0.00 | 11/0 | 0/0 | 0 | 0 | 6.00 | — |
| 1 | aware | trip-worn cooled | 1 | The scrubbing floor #2 | 1 | 10/10 | — | — | 0.70 | 1.00 | 4.00 | 5.00 | 3 | 0.00 | 7/0 | 3/0 | 0 | 0 | 6.00 | — |
| 1 | aware | trip-worn cooled | 1 | The tepidarium #3 | 1 | 9/9 | — | — | 1.00 | 1.00 | 3.00 | 4.00 | 0 | 0.00 | 9/0 | 0/0 | 0 | 0 | 6.00 | — |
| 1 | aware | trip-worn cooled | 2 | The steam gallery #1 | 1 | 2/8 | — | — | 1.38 | 1.50 | 3.00 | 4.00 | 2 | 0.00 | 2/4 | 0/2 | 0 | 0 | 4.00 | — |
| 1 | aware | trip-worn cooled | 2 | The laundry #2 | 1 | 6/14 | — | — | 1.43 | 1.50 | 3.00 | 4.00 | 1 | 0.00 | 6/7 | 0/1 | 0 | 0 | 3.50 | — |
| 1 | aware | trip-worn cooled | 2 | The boiler passage #3 | 1 | 0/8 | — | — | 0.88 | 1.00 | 3.00 | 4.00 | 2 | 0.00 | 0/6 | 0/2 | 0 | 0 | 3.13 | — |
| 1 | aware | trip-worn cooled | 3 | The frigidarium #1 | 2 | 0/2 | — | — | 0.50 | 0.50 | 2.00 | 3.00 | 1 | 0.00 | 0/1 | 0/1 | 0 | 0 | 1.50 | — |
| 1 | aware | trip-worn cooled | 3 | The long pool hall #2 | 2 | 2/3 | — | — | 4.00 | 4.00 | 2.00 | 3.00 | 0 | 0.00 | 2/1 | 0/0 | 0 | 0 | 4.00 | — |
| 1 | aware | trip-worn cooled | 3 | The mosaic court #3 | 2 | 0/3 | — | — | 1.00 | 1.00 | 2.00 | 3.00 | 0 | 0.00 | 0/3 | 0/0 | 0 | 0 | 2.67 | — |
| 1 | aware | trip-worn cooled | 4 | The great caldarium #1 | 3 | 0/0 | — | — | — | — | — | — | 0 | — | 0/0 | 0/0 | 0 | 0 | — | — |
| 1 | aware | trip-worn cooled | 4 | The sudatorium #2 | 3 | 0/0 | — | — | — | — | — | — | 0 | — | 0/0 | 0/0 | 0 | 0 | — | — |
| 1 | aware | trip-worn cooled | 4 | The hot springs #3 | 3 | 0/2 | — | — | 3.50 | 3.50 | 2.00 | 3.00 | 0 | 0.00 | 0/2 | 0/0 | 0 | 0 | 3.50 | — |
| 1 | aware | trip-worn cooled | 5 | The steward's caldarium #1 | 4 | 0/0 | — | — | — | — | — | — | 0 | — | 0/0 | 0/0 | 0 | 0 | — | — |
| 1 | aware | trip-worn cooled | 5 | The steward's caldarium #2 | 4 | 0/0 | — | — | — | — | — | — | 0 | — | 0/0 | 0/0 | 0 | 0 | — | — |
| 1 | aware | trip-worn cooled | 5 | The steward's caldarium #3 | 4 | 0/0 | — | — | — | — | — | — | 0 | — | 0/0 | 0/0 | 0 | 0 | — | — |
| 1 | blind | fresh | 1 | The changing hall #1 | 1 | 11/30 | 90/90 | -63.3 | 1.00 | 1.00 | 4.00 | 5.00 | 0 | 0.63 | 11/19 | 0/0 | 0 | 0 | 6.00 | — |
| 1 | blind | fresh | 1 | The scrubbing floor #2 | 1 | 24/30 | 90/90 | -20.0 | 0.70 | 1.00 | 4.00 | 5.00 | 9 | 0.20 | 15/6 | 9/0 | 0 | 0 | 6.00 | — |
| 1 | blind | fresh | 1 | The tepidarium #3 | 1 | 30/30 | 90/90 | 0.0 | 1.00 | 1.00 | 3.00 | 4.00 | 0 | 0.37 | 30/0 | 0/0 | 0 | 0 | 6.00 | — |
| 1 | blind | fresh | 2 | The steam gallery #1 | 2 | 4/30 | 90/90 | -86.7 | 3.70 | 3.00 | 2.00 | 3.00 | 0 | 1.23 | 4/26 | 0/0 | 0 | 0 | 6.00 | — |
| 1 | blind | fresh | 2 | The laundry #2 | 2 | 30/30 | 90/90 | 0.0 | 1.87 | 2.00 | 2.00 | 3.00 | 0 | 0.23 | 30/0 | 0/0 | 0 | 0 | 6.00 | — |
| 1 | blind | fresh | 2 | The boiler passage #3 | 2 | 23/30 | 90/90 | -23.3 | 1.77 | 2.00 | 2.00 | 3.00 | 0 | 0.23 | 23/7 | 0/0 | 0 | 0 | 6.00 | — |
| 1 | blind | fresh | 3 | The frigidarium #1 | 3 | 0/30 | 90/90 | -100.0 | 2.67 | 2.00 | 2.00 | 3.00 | 0 | 0.77 | 0/30 | 0/0 | 0 | 0 | 6.00 | — |
| 1 | blind | fresh | 3 | The long pool hall #2 | 3 | 7/30 | 90/90 | -76.7 | 2.20 | 2.00 | 2.00 | 3.00 | 0 | 0.23 | 7/23 | 0/0 | 0 | 0 | 6.00 | — |
| 1 | blind | fresh | 3 | The mosaic court #3 | 3 | 7/30 | 90/90 | -76.7 | 2.80 | 3.00 | 2.00 | 3.00 | 0 | 0.13 | 7/23 | 0/0 | 0 | 0 | 6.00 | — |
| 1 | blind | fresh | 4 | The great caldarium #1 | 4 | 0/30 | 90/90 | -100.0 | 3.07 | 3.00 | 2.00 | 3.00 | 0 | 0.60 | 0/30 | 0/0 | 0 | 0 | 6.00 | — |
| 1 | blind | fresh | 4 | The sudatorium #2 | 4 | 0/30 | 90/90 | -100.0 | 4.07 | 4.00 | 2.00 | 3.00 | 0 | 0.10 | 0/30 | 0/0 | 0 | 0 | 6.00 | — |
| 1 | blind | fresh | 4 | The hot springs #3 | 4 | 0/30 | 90/90 | -100.0 | 4.00 | 4.00 | 2.00 | 3.00 | 0 | 0.47 | 0/30 | 0/0 | 0 | 0 | 6.00 | — |
| 1 | blind | fresh | 5 | The steward's caldarium #1 | 4 | 0/30 | 0/90 | 0.0 | 4.07 | 4.00 | 1.00 | 2.00 | 0 | 3.00 | 0/30 | 0/0 | 0 | 0 | 6.00 | 14 |
| 1 | blind | fresh | 5 | The steward's caldarium #2 | 4 | 0/30 | 0/90 | 0.0 | 4.87 | 5.00 | 1.00 | 2.00 | 0 | 3.00 | 0/30 | 0/0 | 0 | 0 | 6.00 | 14 |
| 1 | blind | fresh | 5 | The steward's caldarium #3 | 4 | 0/30 | 0/90 | 0.0 | 4.00 | 4.00 | 1.00 | 2.00 | 0 | 3.00 | 0/30 | 0/0 | 0 | 0 | 6.00 | 14 |
| 1 | blind | fresh cooled | 2 | The steam gallery #1 | 1 | 4/30 | 90/90 | -86.7 | 2.33 | 2.00 | 3.00 | 4.00 | 0 | 0.83 | 4/26 | 0/0 | 0 | 0 | 6.00 | — |
| 1 | blind | fresh cooled | 2 | The laundry #2 | 1 | 27/30 | 90/90 | -10.0 | 1.10 | 1.00 | 3.00 | 4.00 | 0 | 0.10 | 27/3 | 0/0 | 0 | 0 | 6.00 | — |
| 1 | blind | fresh cooled | 2 | The boiler passage #3 | 1 | 30/30 | 90/90 | 0.0 | 1.77 | 2.00 | 3.00 | 4.00 | 0 | 0.00 | 30/0 | 0/0 | 0 | 0 | 6.00 | — |
| 1 | blind | fresh cooled | 3 | The frigidarium #1 | 2 | 0/30 | 90/90 | -100.0 | 2.67 | 2.00 | 2.00 | 3.00 | 0 | 0.77 | 0/30 | 0/0 | 0 | 0 | 6.00 | — |
| 1 | blind | fresh cooled | 3 | The long pool hall #2 | 2 | 7/30 | 90/90 | -76.7 | 2.20 | 2.00 | 2.00 | 3.00 | 0 | 0.23 | 7/23 | 0/0 | 0 | 0 | 6.00 | — |
| 1 | blind | fresh cooled | 3 | The mosaic court #3 | 2 | 7/30 | 90/90 | -76.7 | 2.80 | 3.00 | 2.00 | 3.00 | 0 | 0.13 | 7/23 | 0/0 | 0 | 0 | 6.00 | — |
| 1 | blind | fresh cooled | 4 | The great caldarium #1 | 3 | 0/30 | 90/90 | -100.0 | 2.27 | 2.00 | 2.00 | 3.00 | 0 | 0.00 | 0/30 | 0/0 | 0 | 0 | 6.00 | — |
| 1 | blind | fresh cooled | 4 | The sudatorium #2 | 3 | 0/30 | 90/90 | -100.0 | 3.17 | 3.00 | 2.00 | 3.00 | 0 | 0.27 | 0/30 | 0/0 | 0 | 0 | 6.00 | — |
| 1 | blind | fresh cooled | 4 | The hot springs #3 | 3 | 10/30 | 90/90 | -66.7 | 3.00 | 3.00 | 2.00 | 3.00 | 0 | 0.13 | 10/20 | 0/0 | 0 | 0 | 6.00 | — |
| 1 | blind | trip-worn | 1 | The changing hall #1 | 1 | 4/11 | — | — | 1.00 | 1.00 | 4.00 | 5.00 | 0 | 0.64 | 4/7 | 0/0 | 0 | 0 | 6.00 | — |
| 1 | blind | trip-worn | 1 | The scrubbing floor #2 | 1 | 8/10 | — | — | 0.70 | 1.00 | 4.00 | 5.00 | 3 | 0.20 | 5/2 | 3/0 | 0 | 0 | 6.00 | — |
| 1 | blind | trip-worn | 1 | The tepidarium #3 | 1 | 9/9 | — | — | 1.00 | 1.00 | 3.00 | 4.00 | 0 | 0.44 | 9/0 | 0/0 | 0 | 0 | 6.00 | — |
| 1 | blind | trip-worn | 2 | The steam gallery #1 | 2 | 0/7 | — | — | 2.14 | 2.00 | 2.00 | 3.00 | 0 | 0.43 | 0/7 | 0/0 | 0 | 0 | 3.71 | — |
| 1 | blind | trip-worn | 2 | The laundry #2 | 2 | 4/10 | — | — | 2.00 | 2.00 | 2.00 | 3.00 | 1 | 0.00 | 4/5 | 0/1 | 0 | 0 | 3.50 | — |
| 1 | blind | trip-worn | 2 | The boiler passage #3 | 2 | 0/4 | — | — | 1.75 | 1.50 | 2.00 | 3.00 | 0 | 0.50 | 0/4 | 0/0 | 0 | 0 | 3.75 | — |
| 1 | blind | trip-worn | 3 | The frigidarium #1 | 3 | 0/1 | — | — | 1.00 | 1.00 | 2.00 | 3.00 | 0 | 0.00 | 0/1 | 0/0 | 0 | 0 | 2.00 | — |
| 1 | blind | trip-worn | 3 | The long pool hall #2 | 3 | 0/2 | — | — | 0.50 | 0.50 | 2.00 | 3.00 | 1 | 0.00 | 0/1 | 0/1 | 0 | 0 | 1.50 | — |
| 1 | blind | trip-worn | 3 | The mosaic court #3 | 3 | 0/1 | — | — | 1.00 | 1.00 | 2.00 | 3.00 | 0 | 0.00 | 0/1 | 0/0 | 0 | 0 | 3.00 | — |
| 1 | blind | trip-worn | 4 | The great caldarium #1 | 4 | 0/0 | — | — | — | — | — | — | 0 | — | 0/0 | 0/0 | 0 | 0 | — | — |
| 1 | blind | trip-worn | 4 | The sudatorium #2 | 4 | 0/0 | — | — | — | — | — | — | 0 | — | 0/0 | 0/0 | 0 | 0 | — | — |
| 1 | blind | trip-worn | 4 | The hot springs #3 | 4 | 0/0 | — | — | — | — | — | — | 0 | — | 0/0 | 0/0 | 0 | 0 | — | — |
| 1 | blind | trip-worn | 5 | The steward's caldarium #1 | 4 | 0/0 | — | — | — | — | — | — | 0 | — | 0/0 | 0/0 | 0 | 0 | — | — |
| 1 | blind | trip-worn | 5 | The steward's caldarium #2 | 4 | 0/0 | — | — | — | — | — | — | 0 | — | 0/0 | 0/0 | 0 | 0 | — | — |
| 1 | blind | trip-worn | 5 | The steward's caldarium #3 | 4 | 0/0 | — | — | — | — | — | — | 0 | — | 0/0 | 0/0 | 0 | 0 | — | — |
| 1 | blind | trip-worn cooled | 1 | The changing hall #1 | 1 | 4/11 | — | — | 1.00 | 1.00 | 4.00 | 5.00 | 0 | 0.64 | 4/7 | 0/0 | 0 | 0 | 6.00 | — |
| 1 | blind | trip-worn cooled | 1 | The scrubbing floor #2 | 1 | 8/10 | — | — | 0.70 | 1.00 | 4.00 | 5.00 | 3 | 0.20 | 5/2 | 3/0 | 0 | 0 | 6.00 | — |
| 1 | blind | trip-worn cooled | 1 | The tepidarium #3 | 1 | 9/9 | — | — | 1.00 | 1.00 | 3.00 | 4.00 | 0 | 0.44 | 9/0 | 0/0 | 0 | 0 | 6.00 | — |
| 1 | blind | trip-worn cooled | 2 | The steam gallery #1 | 1 | 0/7 | — | — | 1.57 | 2.00 | 3.00 | 4.00 | 1 | 0.14 | 0/6 | 0/1 | 0 | 0 | 3.71 | — |
| 1 | blind | trip-worn cooled | 2 | The laundry #2 | 1 | 4/10 | — | — | 1.40 | 1.50 | 3.00 | 4.00 | 1 | 0.00 | 4/5 | 0/1 | 0 | 0 | 3.50 | — |
| 1 | blind | trip-worn cooled | 2 | The boiler passage #3 | 1 | 0/4 | — | — | 1.25 | 1.00 | 3.00 | 4.00 | 0 | 0.25 | 0/4 | 0/0 | 0 | 0 | 3.75 | — |
| 1 | blind | trip-worn cooled | 3 | The frigidarium #1 | 2 | 0/1 | — | — | 1.00 | 1.00 | 2.00 | 3.00 | 0 | 0.00 | 0/1 | 0/0 | 0 | 0 | 2.00 | — |
| 1 | blind | trip-worn cooled | 3 | The long pool hall #2 | 2 | 0/2 | — | — | 0.50 | 0.50 | 2.00 | 3.00 | 1 | 0.00 | 0/1 | 0/1 | 0 | 0 | 1.50 | — |
| 1 | blind | trip-worn cooled | 3 | The mosaic court #3 | 2 | 0/1 | — | — | 1.00 | 1.00 | 2.00 | 3.00 | 0 | 0.00 | 0/1 | 0/0 | 0 | 0 | 3.00 | — |
| 1 | blind | trip-worn cooled | 4 | The great caldarium #1 | 3 | 0/0 | — | — | — | — | — | — | 0 | — | 0/0 | 0/0 | 0 | 0 | — | — |
| 1 | blind | trip-worn cooled | 4 | The sudatorium #2 | 3 | 0/0 | — | — | — | — | — | — | 0 | — | 0/0 | 0/0 | 0 | 0 | — | — |
| 1 | blind | trip-worn cooled | 4 | The hot springs #3 | 3 | 0/0 | — | — | — | — | — | — | 0 | — | 0/0 | 0/0 | 0 | 0 | — | — |
| 1 | blind | trip-worn cooled | 5 | The steward's caldarium #1 | 4 | 0/0 | — | — | — | — | — | — | 0 | — | 0/0 | 0/0 | 0 | 0 | — | — |
| 1 | blind | trip-worn cooled | 5 | The steward's caldarium #2 | 4 | 0/0 | — | — | — | — | — | — | 0 | — | 0/0 | 0/0 | 0 | 0 | — | — |
| 1 | blind | trip-worn cooled | 5 | The steward's caldarium #3 | 4 | 0/0 | — | — | — | — | — | — | 0 | — | 0/0 | 0/0 | 0 | 0 | — | — |
| 2 | aware | fresh | 1 | The changing hall #1 | 1 | 30/30 | 90/90 | 0.0 | 0.00 | 0.00 | — | — | 30 | 0.00 | 0/0 | 30/0 | 0 | 0 | 14.00 | — |
| 2 | aware | fresh | 1 | The scrubbing floor #2 | 1 | 30/30 | 90/90 | 0.0 | 0.00 | 0.00 | — | — | 30 | 0.00 | 0/0 | 30/0 | 0 | 0 | 14.00 | — |
| 2 | aware | fresh | 1 | The tepidarium #3 | 1 | 30/30 | 90/90 | 0.0 | 0.13 | 0.00 | 3.00 | 4.00 | 26 | 0.00 | 4/0 | 26/0 | 0 | 0 | 14.00 | — |
| 2 | aware | fresh | 2 | The steam gallery #1 | 2 | 30/30 | 90/90 | 0.0 | 0.43 | 0.00 | 2.00 | 3.00 | 17 | 0.00 | 13/0 | 17/0 | 0 | 0 | 14.00 | — |
| 2 | aware | fresh | 2 | The laundry #2 | 2 | 30/30 | 90/90 | 0.0 | 0.43 | 0.00 | 3.00 | 3.00 | 17 | 0.00 | 13/0 | 17/0 | 0 | 0 | 14.00 | — |
| 2 | aware | fresh | 2 | The boiler passage #3 | 2 | 30/30 | 90/90 | 0.0 | 0.20 | 0.00 | 2.50 | 3.00 | 24 | 0.00 | 6/0 | 24/0 | 0 | 0 | 14.00 | — |
| 2 | aware | fresh | 3 | The frigidarium #1 | 3 | 30/30 | 90/90 | 0.0 | 1.00 | 1.00 | 2.00 | 3.00 | 0 | 0.00 | 30/0 | 0/0 | 0 | 0 | 14.00 | — |
| 2 | aware | fresh | 3 | The long pool hall #2 | 3 | 30/30 | 90/90 | 0.0 | 1.00 | 1.00 | 2.00 | 3.00 | 0 | 0.00 | 30/0 | 0/0 | 0 | 0 | 14.00 | — |
| 2 | aware | fresh | 3 | The mosaic court #3 | 3 | 30/30 | 90/90 | 0.0 | 0.90 | 1.00 | 2.00 | 3.00 | 3 | 0.00 | 27/0 | 3/0 | 0 | 0 | 14.00 | — |
| 2 | aware | fresh | 4 | The great caldarium #1 | 4 | 30/30 | 90/90 | 0.0 | 1.00 | 1.00 | 2.00 | 3.00 | 0 | 0.00 | 30/0 | 0/0 | 0 | 0 | 14.00 | — |
| 2 | aware | fresh | 4 | The sudatorium #2 | 4 | 30/30 | 90/90 | 0.0 | 1.33 | 1.00 | 2.00 | 3.00 | 0 | 0.00 | 30/0 | 0/0 | 0 | 0 | 14.00 | — |
| 2 | aware | fresh | 4 | The hot springs #3 | 4 | 30/30 | 90/90 | 0.0 | 1.27 | 1.00 | 2.00 | 3.00 | 0 | 0.00 | 30/0 | 0/0 | 0 | 0 | 14.00 | — |
| 2 | aware | fresh | 5 | The steward's caldarium #1 | 4 | 30/30 | 50/90 | 44.4 | 3.03 | 3.00 | 1.00 | 2.00 | 0 | 1.87 | 30/0 | 0/0 | 0 | 0 | 14.00 | 14 |
| 2 | aware | fresh | 5 | The steward's caldarium #2 | 4 | 30/30 | 50/90 | 44.4 | 3.93 | 4.00 | 1.00 | 2.00 | 0 | 2.70 | 30/0 | 0/0 | 0 | 0 | 14.00 | 14 |
| 2 | aware | fresh | 5 | The steward's caldarium #3 | 4 | 30/30 | 50/90 | 44.4 | 3.37 | 3.00 | 1.00 | 2.00 | 0 | 2.67 | 30/0 | 0/0 | 0 | 0 | 14.00 | 14 |
| 2 | aware | fresh cooled | 2 | The steam gallery #1 | 1 | 30/30 | 90/90 | 0.0 | 0.00 | 0.00 | — | — | 30 | 0.00 | 0/0 | 30/0 | 0 | 0 | 14.00 | — |
| 2 | aware | fresh cooled | 2 | The laundry #2 | 1 | 30/30 | 90/90 | 0.0 | 0.17 | 0.00 | 3.00 | 4.00 | 25 | 0.00 | 5/0 | 25/0 | 0 | 0 | 14.00 | — |
| 2 | aware | fresh cooled | 2 | The boiler passage #3 | 1 | 30/30 | 90/90 | 0.0 | 0.10 | 0.00 | 3.00 | 4.00 | 27 | 0.00 | 3/0 | 27/0 | 0 | 0 | 14.00 | — |
| 2 | aware | fresh cooled | 3 | The frigidarium #1 | 2 | 30/30 | 90/90 | 0.0 | 1.00 | 1.00 | 3.00 | 4.00 | 0 | 0.00 | 30/0 | 0/0 | 0 | 0 | 14.00 | — |
| 2 | aware | fresh cooled | 3 | The long pool hall #2 | 2 | 30/30 | 90/90 | 0.0 | 1.00 | 1.00 | 2.00 | 3.00 | 0 | 0.00 | 30/0 | 0/0 | 0 | 0 | 14.00 | — |
| 2 | aware | fresh cooled | 3 | The mosaic court #3 | 2 | 30/30 | 90/90 | 0.0 | 0.80 | 1.00 | 2.50 | 3.50 | 6 | 0.00 | 24/0 | 6/0 | 0 | 0 | 14.00 | — |
| 2 | aware | fresh cooled | 4 | The great caldarium #1 | 3 | 30/30 | 90/90 | 0.0 | 1.00 | 1.00 | 2.00 | 3.00 | 0 | 0.00 | 30/0 | 0/0 | 0 | 0 | 14.00 | — |
| 2 | aware | fresh cooled | 4 | The sudatorium #2 | 3 | 30/30 | 90/90 | 0.0 | 1.03 | 1.00 | 2.00 | 3.00 | 0 | 0.00 | 30/0 | 0/0 | 0 | 0 | 14.00 | — |
| 2 | aware | fresh cooled | 4 | The hot springs #3 | 3 | 30/30 | 90/90 | 0.0 | 1.00 | 1.00 | 2.00 | 3.00 | 0 | 0.00 | 30/0 | 0/0 | 0 | 0 | 14.00 | — |
| 2 | aware | trip-worn | 1 | The changing hall #1 | 1 | 11/11 | — | — | 0.00 | 0.00 | — | — | 11 | 0.00 | 0/0 | 11/0 | 0 | 0 | 14.00 | — |
| 2 | aware | trip-worn | 1 | The scrubbing floor #2 | 1 | 10/10 | — | — | 0.00 | 0.00 | — | — | 10 | 0.00 | 0/0 | 10/0 | 0 | 0 | 14.00 | — |
| 2 | aware | trip-worn | 1 | The tepidarium #3 | 1 | 9/9 | — | — | 0.22 | 0.00 | 3.00 | 4.00 | 7 | 0.00 | 2/0 | 7/0 | 0 | 0 | 14.00 | — |
| 2 | aware | trip-worn | 2 | The steam gallery #1 | 2 | 7/8 | — | — | 0.63 | 0.00 | 2.00 | 3.00 | 5 | 0.00 | 2/1 | 5/0 | 0 | 0 | 13.75 | — |
| 2 | aware | trip-worn | 2 | The laundry #2 | 2 | 13/14 | — | — | 0.64 | 0.50 | 3.00 | 3.00 | 7 | 0.00 | 6/1 | 7/0 | 0 | 0 | 13.50 | — |
| 2 | aware | trip-worn | 2 | The boiler passage #3 | 2 | 8/8 | — | — | 0.63 | 1.00 | 3.00 | 3.00 | 3 | 0.00 | 5/0 | 3/0 | 0 | 0 | 13.25 | — |
| 2 | aware | trip-worn | 3 | The frigidarium #1 | 3 | 6/8 | — | — | 2.88 | 2.50 | 2.00 | 3.00 | 0 | 0.00 | 6/2 | 0/0 | 0 | 0 | 12.13 | — |
| 2 | aware | trip-worn | 3 | The long pool hall #2 | 3 | 10/14 | — | — | 4.00 | 4.00 | 2.00 | 3.00 | 0 | 0.00 | 10/3 | 0/0 | 1 | 0 | 12.71 | — |
| 2 | aware | trip-worn | 3 | The mosaic court #3 | 3 | 4/6 | — | — | 3.50 | 3.00 | 2.00 | 3.00 | 0 | 0.00 | 4/2 | 0/0 | 0 | 0 | 12.67 | — |
| 2 | aware | trip-worn | 4 | The great caldarium #1 | 4 | 0/4 | — | — | 1.25 | 1.00 | 2.00 | 3.00 | 1 | 0.00 | 0/3 | 0/1 | 0 | 0 | 5.75 | — |
| 2 | aware | trip-worn | 4 | The sudatorium #2 | 4 | 0/11 | — | — | 3.55 | 3.00 | 2.00 | 3.00 | 0 | 0.00 | 0/11 | 0/0 | 0 | 0 | 5.91 | — |
| 2 | aware | trip-worn | 4 | The hot springs #3 | 4 | 0/5 | — | — | 3.20 | 3.00 | 2.00 | 3.00 | 0 | 0.20 | 0/5 | 0/0 | 0 | 0 | 7.80 | — |
| 2 | aware | trip-worn | 5 | The steward's caldarium #1 | 4 | 0/0 | — | — | — | — | — | — | 0 | — | 0/0 | 0/0 | 0 | 0 | — | — |
| 2 | aware | trip-worn | 5 | The steward's caldarium #2 | 4 | 0/0 | — | — | — | — | — | — | 0 | — | 0/0 | 0/0 | 0 | 0 | — | — |
| 2 | aware | trip-worn | 5 | The steward's caldarium #3 | 4 | 0/0 | — | — | — | — | — | — | 0 | — | 0/0 | 0/0 | 0 | 0 | — | — |
| 2 | aware | trip-worn cooled | 1 | The changing hall #1 | 1 | 11/11 | — | — | 0.00 | 0.00 | — | — | 11 | 0.00 | 0/0 | 11/0 | 0 | 0 | 14.00 | — |
| 2 | aware | trip-worn cooled | 1 | The scrubbing floor #2 | 1 | 10/10 | — | — | 0.00 | 0.00 | — | — | 10 | 0.00 | 0/0 | 10/0 | 0 | 0 | 14.00 | — |
| 2 | aware | trip-worn cooled | 1 | The tepidarium #3 | 1 | 9/9 | — | — | 0.22 | 0.00 | 3.00 | 4.00 | 7 | 0.00 | 2/0 | 7/0 | 0 | 0 | 14.00 | — |
| 2 | aware | trip-worn cooled | 2 | The steam gallery #1 | 1 | 7/8 | — | — | 0.25 | 0.00 | 7.00 | 8.00 | 7 | 0.00 | 0/1 | 7/0 | 0 | 0 | 13.75 | — |
| 2 | aware | trip-worn cooled | 2 | The laundry #2 | 1 | 13/14 | — | — | 0.21 | 0.00 | 4.00 | 5.00 | 12 | 0.00 | 1/1 | 12/0 | 0 | 0 | 13.50 | — |
| 2 | aware | trip-worn cooled | 2 | The boiler passage #3 | 1 | 8/8 | — | — | 0.25 | 0.00 | 3.00 | 4.00 | 6 | 0.00 | 2/0 | 6/0 | 0 | 0 | 13.25 | — |
| 2 | aware | trip-worn cooled | 3 | The frigidarium #1 | 2 | 7/8 | — | — | 3.38 | 3.50 | 2.50 | 3.50 | 0 | 0.00 | 7/1 | 0/0 | 0 | 0 | 12.13 | — |
| 2 | aware | trip-worn cooled | 3 | The long pool hall #2 | 2 | 11/14 | — | — | 3.36 | 3.00 | 2.00 | 3.00 | 0 | 0.00 | 11/3 | 0/0 | 0 | 0 | 12.71 | — |
| 2 | aware | trip-worn cooled | 3 | The mosaic court #3 | 2 | 4/6 | — | — | 3.17 | 3.00 | 2.00 | 3.00 | 0 | 0.00 | 4/2 | 0/0 | 0 | 0 | 12.67 | — |
| 2 | aware | trip-worn cooled | 4 | The great caldarium #1 | 3 | 0/5 | — | — | 1.20 | 1.00 | 2.00 | 3.00 | 1 | 0.00 | 0/4 | 0/1 | 0 | 0 | 5.80 | — |
| 2 | aware | trip-worn cooled | 4 | The sudatorium #2 | 3 | 2/12 | — | — | 2.42 | 2.00 | 2.00 | 3.00 | 0 | 0.00 | 2/10 | 0/0 | 0 | 0 | 6.17 | — |
| 2 | aware | trip-worn cooled | 4 | The hot springs #3 | 3 | 0/5 | — | — | 2.20 | 2.00 | 2.00 | 3.00 | 0 | 0.00 | 0/5 | 0/0 | 0 | 0 | 5.80 | — |
| 2 | aware | trip-worn cooled | 5 | The steward's caldarium #1 | 4 | 0/1 | — | — | 4.00 | 4.00 | 1.00 | 2.00 | 0 | 2.00 | 0/1 | 0/0 | 0 | 0 | 2.00 | 14 |
| 2 | aware | trip-worn cooled | 5 | The steward's caldarium #2 | 4 | 0/0 | — | — | — | — | — | — | 0 | — | 0/0 | 0/0 | 0 | 0 | — | — |
| 2 | aware | trip-worn cooled | 5 | The steward's caldarium #3 | 4 | 1/1 | — | — | 7.00 | 7.00 | 1.00 | 2.00 | 0 | 1.00 | 1/0 | 0/0 | 0 | 0 | 3.00 | 14 |
| 2 | blind | fresh | 1 | The changing hall #1 | 1 | 30/30 | 90/90 | 0.0 | 0.00 | 0.00 | — | — | 30 | 0.00 | 0/0 | 30/0 | 0 | 0 | 14.00 | — |
| 2 | blind | fresh | 1 | The scrubbing floor #2 | 1 | 30/30 | 90/90 | 0.0 | 0.00 | 0.00 | — | — | 30 | 0.00 | 0/0 | 30/0 | 0 | 0 | 14.00 | — |
| 2 | blind | fresh | 1 | The tepidarium #3 | 1 | 30/30 | 90/90 | 0.0 | 0.13 | 0.00 | 3.00 | 4.00 | 26 | 0.03 | 4/0 | 26/0 | 0 | 0 | 14.00 | — |
| 2 | blind | fresh | 2 | The steam gallery #1 | 2 | 30/30 | 90/90 | 0.0 | 0.43 | 0.00 | 2.00 | 3.00 | 17 | 0.00 | 13/0 | 17/0 | 0 | 0 | 14.00 | — |
| 2 | blind | fresh | 2 | The laundry #2 | 2 | 30/30 | 90/90 | 0.0 | 0.43 | 0.00 | 3.00 | 3.00 | 17 | 0.17 | 13/0 | 17/0 | 0 | 0 | 14.00 | — |
| 2 | blind | fresh | 2 | The boiler passage #3 | 2 | 30/30 | 90/90 | 0.0 | 0.13 | 0.00 | 2.00 | 3.00 | 26 | 0.10 | 4/0 | 26/0 | 0 | 0 | 14.00 | — |
| 2 | blind | fresh | 3 | The frigidarium #1 | 3 | 30/30 | 90/90 | 0.0 | 1.00 | 1.00 | 2.00 | 3.00 | 0 | 0.03 | 30/0 | 0/0 | 0 | 0 | 14.00 | — |
| 2 | blind | fresh | 3 | The long pool hall #2 | 3 | 30/30 | 90/90 | 0.0 | 1.00 | 1.00 | 2.00 | 3.00 | 0 | 0.37 | 30/0 | 0/0 | 0 | 0 | 14.00 | — |
| 2 | blind | fresh | 3 | The mosaic court #3 | 3 | 30/30 | 90/90 | 0.0 | 0.90 | 1.00 | 2.00 | 3.00 | 3 | 0.20 | 27/0 | 3/0 | 0 | 0 | 14.00 | — |
| 2 | blind | fresh | 4 | The great caldarium #1 | 4 | 30/30 | 90/90 | 0.0 | 1.00 | 1.00 | 2.00 | 3.00 | 0 | 0.00 | 30/0 | 0/0 | 0 | 0 | 14.00 | — |
| 2 | blind | fresh | 4 | The sudatorium #2 | 4 | 30/30 | 90/90 | 0.0 | 1.40 | 1.00 | 2.00 | 3.00 | 0 | 0.40 | 30/0 | 0/0 | 0 | 0 | 14.00 | — |
| 2 | blind | fresh | 4 | The hot springs #3 | 4 | 30/30 | 90/90 | 0.0 | 1.13 | 1.00 | 2.00 | 3.00 | 0 | 0.00 | 30/0 | 0/0 | 0 | 0 | 14.00 | — |
| 2 | blind | fresh | 5 | The steward's caldarium #1 | 4 | 30/30 | 50/90 | 44.4 | 2.77 | 3.00 | 1.00 | 2.00 | 0 | 3.33 | 30/0 | 0/0 | 0 | 0 | 14.00 | 14 |
| 2 | blind | fresh | 5 | The steward's caldarium #2 | 4 | 30/30 | 50/90 | 44.4 | 3.17 | 3.00 | 1.00 | 2.00 | 0 | 4.50 | 30/0 | 0/0 | 0 | 0 | 14.00 | 14 |
| 2 | blind | fresh | 5 | The steward's caldarium #3 | 4 | 30/30 | 50/90 | 44.4 | 2.67 | 3.00 | 1.00 | 2.00 | 0 | 3.93 | 30/0 | 0/0 | 0 | 0 | 14.00 | 14 |
| 2 | blind | fresh cooled | 2 | The steam gallery #1 | 1 | 30/30 | 90/90 | 0.0 | 0.00 | 0.00 | — | — | 30 | 0.00 | 0/0 | 30/0 | 0 | 0 | 14.00 | — |
| 2 | blind | fresh cooled | 2 | The laundry #2 | 1 | 30/30 | 90/90 | 0.0 | 0.17 | 0.00 | 3.00 | 4.00 | 25 | 0.00 | 5/0 | 25/0 | 0 | 0 | 14.00 | — |
| 2 | blind | fresh cooled | 2 | The boiler passage #3 | 1 | 30/30 | 90/90 | 0.0 | 0.10 | 0.00 | 3.00 | 4.00 | 27 | 0.00 | 3/0 | 27/0 | 0 | 0 | 14.00 | — |
| 2 | blind | fresh cooled | 3 | The frigidarium #1 | 2 | 30/30 | 90/90 | 0.0 | 1.00 | 1.00 | 3.00 | 4.00 | 0 | 0.30 | 30/0 | 0/0 | 0 | 0 | 14.00 | — |
| 2 | blind | fresh cooled | 3 | The long pool hall #2 | 2 | 30/30 | 90/90 | 0.0 | 1.00 | 1.00 | 2.00 | 3.00 | 0 | 0.37 | 30/0 | 0/0 | 0 | 0 | 14.00 | — |
| 2 | blind | fresh cooled | 3 | The mosaic court #3 | 2 | 30/30 | 90/90 | 0.0 | 0.80 | 1.00 | 2.50 | 3.50 | 6 | 0.10 | 24/0 | 6/0 | 0 | 0 | 14.00 | — |
| 2 | blind | fresh cooled | 4 | The great caldarium #1 | 3 | 30/30 | 90/90 | 0.0 | 1.00 | 1.00 | 2.00 | 3.00 | 0 | 0.00 | 30/0 | 0/0 | 0 | 0 | 14.00 | — |
| 2 | blind | fresh cooled | 4 | The sudatorium #2 | 3 | 30/30 | 90/90 | 0.0 | 1.00 | 1.00 | 2.00 | 3.00 | 0 | 0.20 | 30/0 | 0/0 | 0 | 0 | 14.00 | — |
| 2 | blind | fresh cooled | 4 | The hot springs #3 | 3 | 30/30 | 90/90 | 0.0 | 1.00 | 1.00 | 2.00 | 3.00 | 0 | 0.00 | 30/0 | 0/0 | 0 | 0 | 14.00 | — |
| 2 | blind | trip-worn | 1 | The changing hall #1 | 1 | 11/11 | — | — | 0.00 | 0.00 | — | — | 11 | 0.00 | 0/0 | 11/0 | 0 | 0 | 14.00 | — |
| 2 | blind | trip-worn | 1 | The scrubbing floor #2 | 1 | 10/10 | — | — | 0.00 | 0.00 | — | — | 10 | 0.00 | 0/0 | 10/0 | 0 | 0 | 14.00 | — |
| 2 | blind | trip-worn | 1 | The tepidarium #3 | 1 | 9/9 | — | — | 0.22 | 0.00 | 3.00 | 4.00 | 7 | 0.00 | 2/0 | 7/0 | 0 | 0 | 14.00 | — |
| 2 | blind | trip-worn | 2 | The steam gallery #1 | 2 | 7/8 | — | — | 0.63 | 0.00 | 2.00 | 3.00 | 5 | 0.00 | 2/1 | 5/0 | 0 | 0 | 13.75 | — |
| 2 | blind | trip-worn | 2 | The laundry #2 | 2 | 13/14 | — | — | 0.64 | 0.50 | 3.00 | 3.00 | 7 | 0.14 | 6/1 | 7/0 | 0 | 0 | 13.50 | — |
| 2 | blind | trip-worn | 2 | The boiler passage #3 | 2 | 8/8 | — | — | 0.50 | 0.50 | 2.50 | 3.50 | 4 | 0.25 | 4/0 | 4/0 | 0 | 0 | 13.25 | — |
| 2 | blind | trip-worn | 3 | The frigidarium #1 | 3 | 1/8 | — | — | 4.63 | 4.00 | 2.00 | 3.00 | 0 | 0.75 | 1/6 | 0/0 | 1 | 0 | 11.88 | — |
| 2 | blind | trip-worn | 3 | The long pool hall #2 | 3 | 2/14 | — | — | 4.36 | 3.50 | 2.00 | 3.00 | 0 | 0.86 | 2/11 | 0/0 | 1 | 0 | 12.43 | — |
| 2 | blind | trip-worn | 3 | The mosaic court #3 | 3 | 1/6 | — | — | 5.50 | 3.00 | 2.00 | 3.00 | 0 | 0.67 | 1/3 | 0/0 | 2 | 0 | 12.33 | — |
| 2 | blind | trip-worn | 4 | The great caldarium #1 | 4 | 0/1 | — | — | 2.00 | 2.00 | 2.00 | 3.00 | 0 | 0.00 | 0/1 | 0/0 | 0 | 0 | 3.00 | — |
| 2 | blind | trip-worn | 4 | The sudatorium #2 | 4 | 0/3 | — | — | 2.33 | 2.00 | 2.00 | 3.00 | 0 | 0.33 | 0/3 | 0/0 | 0 | 0 | 5.67 | — |
| 2 | blind | trip-worn | 4 | The hot springs #3 | 4 | 0/0 | — | — | — | — | — | — | 0 | — | 0/0 | 0/0 | 0 | 0 | — | — |
| 2 | blind | trip-worn | 5 | The steward's caldarium #1 | 4 | 0/0 | — | — | — | — | — | — | 0 | — | 0/0 | 0/0 | 0 | 0 | — | — |
| 2 | blind | trip-worn | 5 | The steward's caldarium #2 | 4 | 0/0 | — | — | — | — | — | — | 0 | — | 0/0 | 0/0 | 0 | 0 | — | — |
| 2 | blind | trip-worn | 5 | The steward's caldarium #3 | 4 | 0/0 | — | — | — | — | — | — | 0 | — | 0/0 | 0/0 | 0 | 0 | — | — |
| 2 | blind | trip-worn cooled | 1 | The changing hall #1 | 1 | 11/11 | — | — | 0.00 | 0.00 | — | — | 11 | 0.00 | 0/0 | 11/0 | 0 | 0 | 14.00 | — |
| 2 | blind | trip-worn cooled | 1 | The scrubbing floor #2 | 1 | 10/10 | — | — | 0.00 | 0.00 | — | — | 10 | 0.00 | 0/0 | 10/0 | 0 | 0 | 14.00 | — |
| 2 | blind | trip-worn cooled | 1 | The tepidarium #3 | 1 | 9/9 | — | — | 0.22 | 0.00 | 3.00 | 4.00 | 7 | 0.00 | 2/0 | 7/0 | 0 | 0 | 14.00 | — |
| 2 | blind | trip-worn cooled | 2 | The steam gallery #1 | 1 | 7/8 | — | — | 0.25 | 0.00 | 7.00 | 8.00 | 7 | 0.00 | 0/1 | 7/0 | 0 | 0 | 13.75 | — |
| 2 | blind | trip-worn cooled | 2 | The laundry #2 | 1 | 13/14 | — | — | 0.21 | 0.00 | 4.00 | 5.00 | 12 | 0.00 | 1/1 | 12/0 | 0 | 0 | 13.50 | — |
| 2 | blind | trip-worn cooled | 2 | The boiler passage #3 | 1 | 8/8 | — | — | 0.25 | 0.00 | 3.00 | 4.00 | 6 | 0.00 | 2/0 | 6/0 | 0 | 0 | 13.25 | — |
| 2 | blind | trip-worn cooled | 3 | The frigidarium #1 | 2 | 1/8 | — | — | 4.38 | 4.00 | 2.50 | 3.50 | 0 | 0.88 | 1/7 | 0/0 | 0 | 0 | 12.13 | — |
| 2 | blind | trip-worn cooled | 3 | The long pool hall #2 | 2 | 2/14 | — | — | 4.07 | 3.50 | 2.00 | 3.00 | 0 | 0.86 | 2/12 | 0/0 | 0 | 0 | 12.71 | — |
| 2 | blind | trip-worn cooled | 3 | The mosaic court #3 | 2 | 1/6 | — | — | 5.33 | 3.00 | 2.00 | 3.00 | 0 | 1.33 | 1/4 | 0/0 | 1 | 0 | 12.67 | — |
| 2 | blind | trip-worn cooled | 4 | The great caldarium #1 | 3 | 0/1 | — | — | 1.00 | 1.00 | 2.00 | 3.00 | 0 | 0.00 | 0/1 | 0/0 | 0 | 0 | 3.00 | — |
| 2 | blind | trip-worn cooled | 4 | The sudatorium #2 | 3 | 0/3 | — | — | 2.00 | 2.00 | 2.00 | 3.00 | 0 | 0.33 | 0/3 | 0/0 | 0 | 0 | 5.67 | — |
| 2 | blind | trip-worn cooled | 4 | The hot springs #3 | 3 | 0/0 | — | — | — | — | — | — | 0 | — | 0/0 | 0/0 | 0 | 0 | — | — |
| 2 | blind | trip-worn cooled | 5 | The steward's caldarium #1 | 4 | 0/0 | — | — | — | — | — | — | 0 | — | 0/0 | 0/0 | 0 | 0 | — | — |
| 2 | blind | trip-worn cooled | 5 | The steward's caldarium #2 | 4 | 0/0 | — | — | — | — | — | — | 0 | — | 0/0 | 0/0 | 0 | 0 | — | — |
| 2 | blind | trip-worn cooled | 5 | The steward's caldarium #3 | 4 | 0/0 | — | — | — | — | — | — | 0 | — | 0/0 | 0/0 | 0 | 0 | — | — |
| 3 | aware | fresh | 1 | The changing hall #1 | 1 | 30/30 | 90/90 | 0.0 | 0.00 | 0.00 | — | — | 30 | 0.00 | 0/0 | 30/0 | 0 | 0 | 20.00 | — |
| 3 | aware | fresh | 1 | The scrubbing floor #2 | 1 | 30/30 | 90/90 | 0.0 | 0.00 | 0.00 | — | — | 30 | 0.00 | 0/0 | 30/0 | 0 | 0 | 20.00 | — |
| 3 | aware | fresh | 1 | The tepidarium #3 | 1 | 30/30 | 90/90 | 0.0 | 0.07 | 0.00 | 3.00 | 4.00 | 28 | 0.00 | 2/0 | 28/0 | 0 | 0 | 20.00 | — |
| 3 | aware | fresh | 2 | The steam gallery #1 | 2 | 30/30 | 90/90 | 0.0 | 0.20 | 0.00 | 2.00 | 3.00 | 24 | 0.00 | 6/0 | 24/0 | 0 | 0 | 20.00 | — |
| 3 | aware | fresh | 2 | The laundry #2 | 2 | 30/30 | 90/90 | 0.0 | 0.17 | 0.00 | 2.00 | 3.00 | 25 | 0.00 | 5/0 | 25/0 | 0 | 0 | 20.00 | — |
| 3 | aware | fresh | 2 | The boiler passage #3 | 2 | 30/30 | 90/90 | 0.0 | 0.03 | 0.00 | 2.00 | 3.00 | 29 | 0.00 | 1/0 | 29/0 | 0 | 0 | 20.00 | — |
| 3 | aware | fresh | 3 | The frigidarium #1 | 3 | 30/30 | 90/90 | 0.0 | 0.77 | 1.00 | 2.00 | 3.00 | 7 | 0.00 | 23/0 | 7/0 | 0 | 0 | 20.00 | — |
| 3 | aware | fresh | 3 | The long pool hall #2 | 3 | 30/30 | 90/90 | 0.0 | 1.00 | 1.00 | 2.00 | 3.00 | 0 | 0.00 | 30/0 | 0/0 | 0 | 0 | 20.00 | — |
| 3 | aware | fresh | 3 | The mosaic court #3 | 3 | 30/30 | 90/90 | 0.0 | 0.53 | 1.00 | 2.00 | 3.00 | 14 | 0.00 | 16/0 | 14/0 | 0 | 0 | 20.00 | — |
| 3 | aware | fresh | 4 | The great caldarium #1 | 4 | 30/30 | 90/90 | 0.0 | 0.80 | 1.00 | 2.00 | 3.00 | 6 | 0.00 | 24/0 | 6/0 | 0 | 0 | 20.00 | — |
| 3 | aware | fresh | 4 | The sudatorium #2 | 4 | 30/30 | 90/90 | 0.0 | 1.07 | 1.00 | 2.00 | 3.00 | 0 | 0.00 | 30/0 | 0/0 | 0 | 0 | 20.00 | — |
| 3 | aware | fresh | 4 | The hot springs #3 | 4 | 30/30 | 90/90 | 0.0 | 1.03 | 1.00 | 2.00 | 3.00 | 2 | 0.00 | 28/0 | 2/0 | 0 | 0 | 20.00 | — |
| 3 | aware | fresh | 5 | The steward's caldarium #1 | 4 | 30/30 | 87/90 | 3.3 | 2.77 | 3.00 | 1.00 | 2.00 | 0 | 2.17 | 30/0 | 0/0 | 0 | 0 | 20.00 | 14 |
| 3 | aware | fresh | 5 | The steward's caldarium #2 | 4 | 30/30 | 87/90 | 3.3 | 3.00 | 3.00 | 1.00 | 2.00 | 0 | 2.63 | 30/0 | 0/0 | 0 | 0 | 20.00 | 14 |
| 3 | aware | fresh | 5 | The steward's caldarium #3 | 4 | 30/30 | 87/90 | 3.3 | 2.73 | 3.00 | 1.00 | 2.00 | 0 | 2.43 | 30/0 | 0/0 | 0 | 0 | 20.00 | 14 |
| 3 | aware | fresh cooled | 2 | The steam gallery #1 | 1 | 30/30 | 90/90 | 0.0 | 0.00 | 0.00 | — | — | 30 | 0.00 | 0/0 | 30/0 | 0 | 0 | 20.00 | — |
| 3 | aware | fresh cooled | 2 | The laundry #2 | 1 | 30/30 | 90/90 | 0.0 | 0.00 | 0.00 | — | — | 30 | 0.00 | 0/0 | 30/0 | 0 | 0 | 20.00 | — |
| 3 | aware | fresh cooled | 2 | The boiler passage #3 | 1 | 30/30 | 90/90 | 0.0 | 0.03 | 0.00 | 3.00 | 4.00 | 29 | 0.00 | 1/0 | 29/0 | 0 | 0 | 20.00 | — |
| 3 | aware | fresh cooled | 3 | The frigidarium #1 | 2 | 30/30 | 90/90 | 0.0 | 0.40 | 0.00 | 3.00 | 4.00 | 18 | 0.00 | 12/0 | 18/0 | 0 | 0 | 20.00 | — |
| 3 | aware | fresh cooled | 3 | The long pool hall #2 | 2 | 30/30 | 90/90 | 0.0 | 0.83 | 1.00 | 2.00 | 3.00 | 5 | 0.00 | 25/0 | 5/0 | 0 | 0 | 20.00 | — |
| 3 | aware | fresh cooled | 3 | The mosaic court #3 | 2 | 30/30 | 90/90 | 0.0 | 0.30 | 0.00 | 2.00 | 3.00 | 21 | 0.00 | 9/0 | 21/0 | 0 | 0 | 20.00 | — |
| 3 | aware | fresh cooled | 4 | The great caldarium #1 | 3 | 30/30 | 90/90 | 0.0 | 0.47 | 0.00 | 2.00 | 3.00 | 16 | 0.00 | 14/0 | 16/0 | 0 | 0 | 20.00 | — |
| 3 | aware | fresh cooled | 4 | The sudatorium #2 | 3 | 30/30 | 90/90 | 0.0 | 0.93 | 1.00 | 2.00 | 3.00 | 2 | 0.00 | 28/0 | 2/0 | 0 | 0 | 20.00 | — |
| 3 | aware | fresh cooled | 4 | The hot springs #3 | 3 | 30/30 | 90/90 | 0.0 | 0.47 | 0.00 | 2.00 | 3.00 | 16 | 0.00 | 14/0 | 16/0 | 0 | 0 | 20.00 | — |
| 3 | aware | trip-worn | 1 | The changing hall #1 | 1 | 11/11 | — | — | 0.00 | 0.00 | — | — | 11 | 0.00 | 0/0 | 11/0 | 0 | 0 | 20.00 | — |
| 3 | aware | trip-worn | 1 | The scrubbing floor #2 | 1 | 10/10 | — | — | 0.00 | 0.00 | — | — | 10 | 0.00 | 0/0 | 10/0 | 0 | 0 | 20.00 | — |
| 3 | aware | trip-worn | 1 | The tepidarium #3 | 1 | 9/9 | — | — | 0.11 | 0.00 | 3.00 | 4.00 | 8 | 0.00 | 1/0 | 8/0 | 0 | 0 | 20.00 | — |
| 3 | aware | trip-worn | 2 | The steam gallery #1 | 2 | 8/8 | — | — | 0.13 | 0.00 | 2.00 | 3.00 | 7 | 0.00 | 1/0 | 7/0 | 0 | 0 | 19.88 | — |
| 3 | aware | trip-worn | 2 | The laundry #2 | 2 | 14/14 | — | — | 0.14 | 0.00 | 2.00 | 3.00 | 12 | 0.00 | 2/0 | 12/0 | 0 | 0 | 19.50 | — |
| 3 | aware | trip-worn | 2 | The boiler passage #3 | 2 | 8/8 | — | — | 0.25 | 0.00 | 2.50 | 3.00 | 6 | 0.00 | 2/0 | 6/0 | 0 | 0 | 20.00 | — |
| 3 | aware | trip-worn | 3 | The frigidarium #1 | 3 | 7/8 | — | — | 2.00 | 1.00 | 2.00 | 3.00 | 1 | 0.00 | 6/0 | 1/0 | 1 | 0 | 19.00 | — |
| 3 | aware | trip-worn | 3 | The long pool hall #2 | 3 | 16/16 | — | — | 1.38 | 1.00 | 2.00 | 3.00 | 0 | 0.00 | 16/0 | 0/0 | 0 | 0 | 19.56 | — |
| 3 | aware | trip-worn | 3 | The mosaic court #3 | 3 | 6/6 | — | — | 1.17 | 1.00 | 2.00 | 3.00 | 1 | 0.00 | 5/0 | 1/0 | 0 | 0 | 19.50 | — |
| 3 | aware | trip-worn | 4 | The great caldarium #1 | 4 | 1/8 | — | — | 6.50 | 6.00 | 2.00 | 3.00 | 0 | 0.00 | 1/6 | 0/0 | 1 | 0 | 17.50 | — |
| 3 | aware | trip-worn | 4 | The sudatorium #2 | 4 | 9/14 | — | — | 6.29 | 6.00 | 2.00 | 3.00 | 0 | 0.00 | 9/5 | 0/0 | 0 | 0 | 17.50 | — |
| 3 | aware | trip-worn | 4 | The hot springs #3 | 4 | 3/7 | — | — | 7.29 | 6.00 | 2.00 | 3.00 | 0 | 0.00 | 3/3 | 0/0 | 1 | 0 | 17.14 | — |
| 3 | aware | trip-worn | 5 | The steward's caldarium #1 | 4 | 6/8 | — | — | 6.00 | 7.00 | 1.00 | 2.00 | 0 | 4.13 | 6/2 | 0/0 | 0 | 0 | 10.50 | 14 |
| 3 | aware | trip-worn | 5 | The steward's caldarium #2 | 4 | 2/2 | — | — | 7.00 | 7.00 | 1.00 | 2.00 | 0 | 3.50 | 2/0 | 0/0 | 0 | 0 | 9.00 | 14 |
| 3 | aware | trip-worn | 5 | The steward's caldarium #3 | 4 | 1/3 | — | — | 5.00 | 5.00 | 1.00 | 2.00 | 0 | 4.67 | 1/2 | 0/0 | 0 | 0 | 8.00 | 14 |
| 3 | aware | trip-worn cooled | 1 | The changing hall #1 | 1 | 11/11 | — | — | 0.00 | 0.00 | — | — | 11 | 0.00 | 0/0 | 11/0 | 0 | 0 | 20.00 | — |
| 3 | aware | trip-worn cooled | 1 | The scrubbing floor #2 | 1 | 10/10 | — | — | 0.00 | 0.00 | — | — | 10 | 0.00 | 0/0 | 10/0 | 0 | 0 | 20.00 | — |
| 3 | aware | trip-worn cooled | 1 | The tepidarium #3 | 1 | 9/9 | — | — | 0.11 | 0.00 | 3.00 | 4.00 | 8 | 0.00 | 1/0 | 8/0 | 0 | 0 | 20.00 | — |
| 3 | aware | trip-worn cooled | 2 | The steam gallery #1 | 1 | 8/8 | — | — | 0.00 | 0.00 | — | — | 8 | 0.00 | 0/0 | 8/0 | 0 | 0 | 19.88 | — |
| 3 | aware | trip-worn cooled | 2 | The laundry #2 | 1 | 14/14 | — | — | 0.00 | 0.00 | — | — | 14 | 0.00 | 0/0 | 14/0 | 0 | 0 | 19.50 | — |
| 3 | aware | trip-worn cooled | 2 | The boiler passage #3 | 1 | 8/8 | — | — | 0.13 | 0.00 | 3.00 | 4.00 | 7 | 0.00 | 1/0 | 7/0 | 0 | 0 | 20.00 | — |
| 3 | aware | trip-worn cooled | 3 | The frigidarium #1 | 2 | 8/8 | — | — | 0.88 | 1.00 | 3.00 | 4.00 | 1 | 0.00 | 7/0 | 1/0 | 0 | 0 | 19.00 | — |
| 3 | aware | trip-worn cooled | 3 | The long pool hall #2 | 2 | 16/16 | — | — | 1.56 | 1.00 | 2.00 | 3.00 | 0 | 0.00 | 16/0 | 0/0 | 0 | 0 | 19.63 | — |
| 3 | aware | trip-worn cooled | 3 | The mosaic court #3 | 2 | 6/6 | — | — | 1.00 | 1.00 | 2.00 | 3.00 | 1 | 0.00 | 5/0 | 1/0 | 0 | 0 | 19.50 | — |
| 3 | aware | trip-worn cooled | 4 | The great caldarium #1 | 3 | 3/8 | — | — | 3.88 | 4.00 | 2.00 | 3.00 | 0 | 0.00 | 3/5 | 0/0 | 0 | 0 | 16.38 | — |
| 3 | aware | trip-worn cooled | 4 | The sudatorium #2 | 3 | 4/14 | — | — | 5.43 | 5.50 | 2.00 | 3.00 | 0 | 0.00 | 4/9 | 0/0 | 1 | 0 | 17.79 | — |
| 3 | aware | trip-worn cooled | 4 | The hot springs #3 | 3 | 2/8 | — | — | 4.75 | 4.50 | 2.00 | 3.00 | 0 | 0.00 | 2/5 | 0/0 | 1 | 0 | 16.75 | — |
| 3 | aware | trip-worn cooled | 5 | The steward's caldarium #1 | 4 | 2/5 | — | — | 5.60 | 6.00 | 1.00 | 2.00 | 0 | 4.00 | 2/3 | 0/0 | 0 | 0 | 6.60 | 14 |
| 3 | aware | trip-worn cooled | 5 | The steward's caldarium #2 | 4 | 2/3 | — | — | 5.67 | 7.00 | 1.00 | 2.00 | 0 | 3.67 | 2/1 | 0/0 | 0 | 0 | 9.67 | 14 |
| 3 | aware | trip-worn cooled | 5 | The steward's caldarium #3 | 4 | 1/1 | — | — | 7.00 | 7.00 | 1.00 | 2.00 | 0 | 4.00 | 1/0 | 0/0 | 0 | 0 | 9.00 | 14 |
| 3 | blind | fresh | 1 | The changing hall #1 | 1 | 30/30 | 90/90 | 0.0 | 0.00 | 0.00 | — | — | 30 | 0.00 | 0/0 | 30/0 | 0 | 0 | 20.00 | — |
| 3 | blind | fresh | 1 | The scrubbing floor #2 | 1 | 30/30 | 90/90 | 0.0 | 0.00 | 0.00 | — | — | 30 | 0.00 | 0/0 | 30/0 | 0 | 0 | 20.00 | — |
| 3 | blind | fresh | 1 | The tepidarium #3 | 1 | 30/30 | 90/90 | 0.0 | 0.07 | 0.00 | 3.00 | 4.00 | 28 | 0.07 | 2/0 | 28/0 | 0 | 0 | 20.00 | — |
| 3 | blind | fresh | 2 | The steam gallery #1 | 2 | 30/30 | 90/90 | 0.0 | 0.27 | 0.00 | 2.00 | 3.00 | 22 | 0.10 | 8/0 | 22/0 | 0 | 0 | 20.00 | — |
| 3 | blind | fresh | 2 | The laundry #2 | 2 | 30/30 | 90/90 | 0.0 | 0.17 | 0.00 | 2.00 | 3.00 | 25 | 0.17 | 5/0 | 25/0 | 0 | 0 | 20.00 | — |
| 3 | blind | fresh | 2 | The boiler passage #3 | 2 | 30/30 | 90/90 | 0.0 | 0.03 | 0.00 | 2.00 | 3.00 | 29 | 0.07 | 1/0 | 29/0 | 0 | 0 | 20.00 | — |
| 3 | blind | fresh | 3 | The frigidarium #1 | 3 | 30/30 | 90/90 | 0.0 | 0.73 | 1.00 | 2.00 | 3.00 | 8 | 0.03 | 22/0 | 8/0 | 0 | 0 | 20.00 | — |
| 3 | blind | fresh | 3 | The long pool hall #2 | 3 | 30/30 | 90/90 | 0.0 | 1.00 | 1.00 | 2.00 | 3.00 | 0 | 0.53 | 30/0 | 0/0 | 0 | 0 | 20.00 | — |
| 3 | blind | fresh | 3 | The mosaic court #3 | 3 | 30/30 | 90/90 | 0.0 | 0.53 | 1.00 | 2.00 | 3.00 | 14 | 0.13 | 16/0 | 14/0 | 0 | 0 | 20.00 | — |
| 3 | blind | fresh | 4 | The great caldarium #1 | 4 | 30/30 | 90/90 | 0.0 | 0.77 | 1.00 | 2.00 | 3.00 | 7 | 0.13 | 23/0 | 7/0 | 0 | 0 | 20.00 | — |
| 3 | blind | fresh | 4 | The sudatorium #2 | 4 | 30/30 | 90/90 | 0.0 | 1.00 | 1.00 | 2.00 | 3.00 | 0 | 0.63 | 30/0 | 0/0 | 0 | 0 | 20.00 | — |
| 3 | blind | fresh | 4 | The hot springs #3 | 4 | 30/30 | 90/90 | 0.0 | 0.93 | 1.00 | 2.00 | 3.00 | 2 | 0.13 | 28/0 | 2/0 | 0 | 0 | 20.00 | — |
| 3 | blind | fresh | 5 | The steward's caldarium #1 | 4 | 30/30 | 87/90 | 3.3 | 2.23 | 2.00 | 1.00 | 2.00 | 0 | 3.83 | 30/0 | 0/0 | 0 | 0 | 20.00 | 14 |
| 3 | blind | fresh | 5 | The steward's caldarium #2 | 4 | 30/30 | 87/90 | 3.3 | 1.87 | 2.00 | 1.00 | 2.00 | 0 | 3.23 | 30/0 | 0/0 | 0 | 0 | 20.00 | 14 |
| 3 | blind | fresh | 5 | The steward's caldarium #3 | 4 | 30/30 | 87/90 | 3.3 | 1.47 | 1.00 | 1.00 | 2.00 | 0 | 2.03 | 30/0 | 0/0 | 0 | 0 | 20.00 | 14 |
| 3 | blind | fresh cooled | 2 | The steam gallery #1 | 1 | 30/30 | 90/90 | 0.0 | 0.00 | 0.00 | — | — | 30 | 0.00 | 0/0 | 30/0 | 0 | 0 | 20.00 | — |
| 3 | blind | fresh cooled | 2 | The laundry #2 | 1 | 30/30 | 90/90 | 0.0 | 0.00 | 0.00 | — | — | 30 | 0.00 | 0/0 | 30/0 | 0 | 0 | 20.00 | — |
| 3 | blind | fresh cooled | 2 | The boiler passage #3 | 1 | 30/30 | 90/90 | 0.0 | 0.03 | 0.00 | 3.00 | 4.00 | 29 | 0.00 | 1/0 | 29/0 | 0 | 0 | 20.00 | — |
| 3 | blind | fresh cooled | 3 | The frigidarium #1 | 2 | 30/30 | 90/90 | 0.0 | 0.37 | 0.00 | 3.00 | 4.00 | 19 | 0.17 | 11/0 | 19/0 | 0 | 0 | 20.00 | — |
| 3 | blind | fresh cooled | 3 | The long pool hall #2 | 2 | 30/30 | 90/90 | 0.0 | 0.80 | 1.00 | 2.00 | 3.00 | 6 | 0.40 | 24/0 | 6/0 | 0 | 0 | 20.00 | — |
| 3 | blind | fresh cooled | 3 | The mosaic court #3 | 2 | 30/30 | 90/90 | 0.0 | 0.30 | 0.00 | 2.00 | 3.00 | 21 | 0.07 | 9/0 | 21/0 | 0 | 0 | 20.00 | — |
| 3 | blind | fresh cooled | 4 | The great caldarium #1 | 3 | 30/30 | 90/90 | 0.0 | 0.47 | 0.00 | 2.00 | 3.00 | 16 | 0.03 | 14/0 | 16/0 | 0 | 0 | 20.00 | — |
| 3 | blind | fresh cooled | 4 | The sudatorium #2 | 3 | 30/30 | 90/90 | 0.0 | 0.87 | 1.00 | 2.00 | 3.00 | 4 | 0.43 | 26/0 | 4/0 | 0 | 0 | 20.00 | — |
| 3 | blind | fresh cooled | 4 | The hot springs #3 | 3 | 30/30 | 90/90 | 0.0 | 0.43 | 0.00 | 2.00 | 3.00 | 17 | 0.00 | 13/0 | 17/0 | 0 | 0 | 20.00 | — |
| 3 | blind | trip-worn | 1 | The changing hall #1 | 1 | 11/11 | — | — | 0.00 | 0.00 | — | — | 11 | 0.00 | 0/0 | 11/0 | 0 | 0 | 20.00 | — |
| 3 | blind | trip-worn | 1 | The scrubbing floor #2 | 1 | 10/10 | — | — | 0.00 | 0.00 | — | — | 10 | 0.00 | 0/0 | 10/0 | 0 | 0 | 20.00 | — |
| 3 | blind | trip-worn | 1 | The tepidarium #3 | 1 | 9/9 | — | — | 0.11 | 0.00 | 3.00 | 4.00 | 8 | 0.11 | 1/0 | 8/0 | 0 | 0 | 20.00 | — |
| 3 | blind | trip-worn | 2 | The steam gallery #1 | 2 | 8/8 | — | — | 0.13 | 0.00 | 2.00 | 3.00 | 7 | 0.13 | 1/0 | 7/0 | 0 | 0 | 19.88 | — |
| 3 | blind | trip-worn | 2 | The laundry #2 | 2 | 14/14 | — | — | 0.14 | 0.00 | 2.00 | 3.00 | 12 | 0.14 | 2/0 | 12/0 | 0 | 0 | 19.50 | — |
| 3 | blind | trip-worn | 2 | The boiler passage #3 | 2 | 8/8 | — | — | 0.13 | 0.00 | 2.00 | 3.00 | 7 | 0.25 | 1/0 | 7/0 | 0 | 0 | 19.75 | — |
| 3 | blind | trip-worn | 3 | The frigidarium #1 | 3 | 7/8 | — | — | 2.13 | 1.00 | 2.00 | 3.00 | 0 | 0.13 | 7/0 | 0/0 | 1 | 0 | 18.75 | — |
| 3 | blind | trip-worn | 3 | The long pool hall #2 | 3 | 10/16 | — | — | 2.69 | 2.00 | 2.00 | 3.00 | 0 | 1.56 | 10/6 | 0/0 | 0 | 0 | 19.25 | — |
| 3 | blind | trip-worn | 3 | The mosaic court #3 | 3 | 6/6 | — | — | 1.00 | 1.00 | 2.00 | 3.00 | 0 | 0.17 | 6/0 | 0/0 | 0 | 0 | 18.83 | — |
| 3 | blind | trip-worn | 4 | The great caldarium #1 | 4 | 0/6 | — | — | 5.50 | 5.50 | 2.00 | 3.00 | 0 | 0.83 | 0/6 | 0/0 | 0 | 0 | 16.67 | — |
| 3 | blind | trip-worn | 4 | The sudatorium #2 | 4 | 0/12 | — | — | 8.25 | 7.50 | 2.00 | 3.00 | 0 | 1.83 | 0/11 | 0/0 | 1 | 0 | 16.25 | — |
| 3 | blind | trip-worn | 4 | The hot springs #3 | 4 | 1/5 | — | — | 4.40 | 4.00 | 2.00 | 3.00 | 0 | 0.40 | 1/4 | 0/0 | 0 | 0 | 14.60 | — |
| 3 | blind | trip-worn | 5 | The steward's caldarium #1 | 4 | 0/0 | — | — | — | — | — | — | 0 | — | 0/0 | 0/0 | 0 | 0 | — | — |
| 3 | blind | trip-worn | 5 | The steward's caldarium #2 | 4 | 0/0 | — | — | — | — | — | — | 0 | — | 0/0 | 0/0 | 0 | 0 | — | — |
| 3 | blind | trip-worn | 5 | The steward's caldarium #3 | 4 | 0/1 | — | — | 6.00 | 6.00 | 1.00 | 2.00 | 0 | 6.00 | 0/1 | 0/0 | 0 | 0 | 9.00 | 14 |
| 3 | blind | trip-worn cooled | 1 | The changing hall #1 | 1 | 11/11 | — | — | 0.00 | 0.00 | — | — | 11 | 0.00 | 0/0 | 11/0 | 0 | 0 | 20.00 | — |
| 3 | blind | trip-worn cooled | 1 | The scrubbing floor #2 | 1 | 10/10 | — | — | 0.00 | 0.00 | — | — | 10 | 0.00 | 0/0 | 10/0 | 0 | 0 | 20.00 | — |
| 3 | blind | trip-worn cooled | 1 | The tepidarium #3 | 1 | 9/9 | — | — | 0.11 | 0.00 | 3.00 | 4.00 | 8 | 0.11 | 1/0 | 8/0 | 0 | 0 | 20.00 | — |
| 3 | blind | trip-worn cooled | 2 | The steam gallery #1 | 1 | 8/8 | — | — | 0.00 | 0.00 | — | — | 8 | 0.00 | 0/0 | 8/0 | 0 | 0 | 19.88 | — |
| 3 | blind | trip-worn cooled | 2 | The laundry #2 | 1 | 14/14 | — | — | 0.00 | 0.00 | — | — | 14 | 0.00 | 0/0 | 14/0 | 0 | 0 | 19.50 | — |
| 3 | blind | trip-worn cooled | 2 | The boiler passage #3 | 1 | 8/8 | — | — | 0.13 | 0.00 | 3.00 | 4.00 | 7 | 0.00 | 1/0 | 7/0 | 0 | 0 | 19.75 | — |
| 3 | blind | trip-worn cooled | 3 | The frigidarium #1 | 2 | 7/8 | — | — | 1.88 | 1.00 | 3.00 | 4.00 | 0 | 0.50 | 7/0 | 0/0 | 1 | 0 | 19.00 | — |
| 3 | blind | trip-worn cooled | 3 | The long pool hall #2 | 2 | 10/16 | — | — | 2.75 | 2.00 | 2.00 | 3.00 | 0 | 1.50 | 10/6 | 0/0 | 0 | 0 | 19.50 | — |
| 3 | blind | trip-worn cooled | 3 | The mosaic court #3 | 2 | 6/6 | — | — | 0.83 | 1.00 | 2.00 | 3.00 | 1 | 0.33 | 5/0 | 1/0 | 0 | 0 | 19.50 | — |
| 3 | blind | trip-worn cooled | 4 | The great caldarium #1 | 3 | 1/6 | — | — | 3.83 | 4.00 | 2.00 | 3.00 | 0 | 1.17 | 1/5 | 0/0 | 0 | 0 | 15.33 | — |
| 3 | blind | trip-worn cooled | 4 | The sudatorium #2 | 3 | 0/12 | — | — | 6.08 | 5.00 | 2.00 | 3.00 | 0 | 2.00 | 0/10 | 0/0 | 2 | 0 | 16.75 | — |
| 3 | blind | trip-worn cooled | 4 | The hot springs #3 | 3 | 1/5 | — | — | 4.80 | 4.00 | 2.00 | 3.00 | 0 | 0.40 | 1/3 | 0/0 | 1 | 0 | 15.40 | — |
| 3 | blind | trip-worn cooled | 5 | The steward's caldarium #1 | 4 | 0/1 | — | — | 3.00 | 3.00 | 1.00 | 2.00 | 0 | 4.00 | 0/1 | 0/0 | 0 | 0 | 5.00 | 14 |
| 3 | blind | trip-worn cooled | 5 | The steward's caldarium #2 | 4 | 0/0 | — | — | — | — | — | — | 0 | — | 0/0 | 0/0 | 0 | 0 | — | — |
| 3 | blind | trip-worn cooled | 5 | The steward's caldarium #3 | 4 | 0/1 | — | — | 4.00 | 4.00 | 1.00 | 2.00 | 0 | 5.00 | 0/1 | 0/0 | 0 | 0 | 7.00 | 14 |

</details>

<details><summary>Fresh canal comparison by layout</summary>

| party | policy | depth | layout | wins/fights | stalls | budget |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | aware | 1 | The towpath #1 | 30/30 | 0 | 0 |
| 1 | aware | 1 | The coal wharf #2 | 30/30 | 0 | 0 |
| 1 | aware | 1 | The lamplit quay #3 | 30/30 | 0 | 0 |
| 1 | aware | 2 | The drowned arcade #1 | 30/30 | 0 | 0 |
| 1 | aware | 2 | The eel steps #2 | 30/30 | 0 | 0 |
| 1 | aware | 2 | The lock cottage #3 | 30/30 | 0 | 0 |
| 1 | aware | 3 | The sluice #1 | 30/30 | 0 | 0 |
| 1 | aware | 3 | The crossing #2 | 30/30 | 0 | 0 |
| 1 | aware | 3 | The tanners' cut #3 | 30/30 | 0 | 0 |
| 1 | aware | 4 | The uphill reach #1 | 30/30 | 0 | 0 |
| 1 | aware | 4 | The lamp market #2 | 30/30 | 0 | 0 |
| 1 | aware | 4 | The siphon #3 | 30/30 | 0 | 0 |
| 1 | aware | 5 | The lamp-mother's pool #1 | 0/30 | 0 | 0 |
| 1 | aware | 5 | The lamp-mother's pool #2 | 0/30 | 0 | 0 |
| 1 | aware | 5 | The lamp-mother's pool #3 | 0/30 | 0 | 0 |
| 1 | blind | 1 | The towpath #1 | 30/30 | 0 | 0 |
| 1 | blind | 1 | The coal wharf #2 | 30/30 | 0 | 0 |
| 1 | blind | 1 | The lamplit quay #3 | 30/30 | 0 | 0 |
| 1 | blind | 2 | The drowned arcade #1 | 30/30 | 0 | 0 |
| 1 | blind | 2 | The eel steps #2 | 30/30 | 0 | 0 |
| 1 | blind | 2 | The lock cottage #3 | 30/30 | 0 | 0 |
| 1 | blind | 3 | The sluice #1 | 30/30 | 0 | 0 |
| 1 | blind | 3 | The crossing #2 | 30/30 | 0 | 0 |
| 1 | blind | 3 | The tanners' cut #3 | 30/30 | 0 | 0 |
| 1 | blind | 4 | The uphill reach #1 | 30/30 | 0 | 0 |
| 1 | blind | 4 | The lamp market #2 | 30/30 | 0 | 0 |
| 1 | blind | 4 | The siphon #3 | 30/30 | 0 | 0 |
| 1 | blind | 5 | The lamp-mother's pool #1 | 0/30 | 0 | 0 |
| 1 | blind | 5 | The lamp-mother's pool #2 | 0/30 | 0 | 0 |
| 1 | blind | 5 | The lamp-mother's pool #3 | 0/30 | 0 | 0 |
| 2 | aware | 1 | The towpath #1 | 30/30 | 0 | 0 |
| 2 | aware | 1 | The coal wharf #2 | 30/30 | 0 | 0 |
| 2 | aware | 1 | The lamplit quay #3 | 30/30 | 0 | 0 |
| 2 | aware | 2 | The drowned arcade #1 | 30/30 | 0 | 0 |
| 2 | aware | 2 | The eel steps #2 | 30/30 | 0 | 0 |
| 2 | aware | 2 | The lock cottage #3 | 30/30 | 0 | 0 |
| 2 | aware | 3 | The sluice #1 | 30/30 | 0 | 0 |
| 2 | aware | 3 | The crossing #2 | 30/30 | 0 | 0 |
| 2 | aware | 3 | The tanners' cut #3 | 30/30 | 0 | 0 |
| 2 | aware | 4 | The uphill reach #1 | 30/30 | 0 | 0 |
| 2 | aware | 4 | The lamp market #2 | 30/30 | 0 | 0 |
| 2 | aware | 4 | The siphon #3 | 30/30 | 0 | 0 |
| 2 | aware | 5 | The lamp-mother's pool #1 | 15/30 | 0 | 0 |
| 2 | aware | 5 | The lamp-mother's pool #2 | 25/30 | 0 | 0 |
| 2 | aware | 5 | The lamp-mother's pool #3 | 10/30 | 0 | 0 |
| 2 | blind | 1 | The towpath #1 | 30/30 | 0 | 0 |
| 2 | blind | 1 | The coal wharf #2 | 30/30 | 0 | 0 |
| 2 | blind | 1 | The lamplit quay #3 | 30/30 | 0 | 0 |
| 2 | blind | 2 | The drowned arcade #1 | 30/30 | 0 | 0 |
| 2 | blind | 2 | The eel steps #2 | 30/30 | 0 | 0 |
| 2 | blind | 2 | The lock cottage #3 | 30/30 | 0 | 0 |
| 2 | blind | 3 | The sluice #1 | 30/30 | 0 | 0 |
| 2 | blind | 3 | The crossing #2 | 30/30 | 0 | 0 |
| 2 | blind | 3 | The tanners' cut #3 | 30/30 | 0 | 0 |
| 2 | blind | 4 | The uphill reach #1 | 30/30 | 0 | 0 |
| 2 | blind | 4 | The lamp market #2 | 30/30 | 0 | 0 |
| 2 | blind | 4 | The siphon #3 | 30/30 | 0 | 0 |
| 2 | blind | 5 | The lamp-mother's pool #1 | 15/30 | 0 | 0 |
| 2 | blind | 5 | The lamp-mother's pool #2 | 25/30 | 0 | 0 |
| 2 | blind | 5 | The lamp-mother's pool #3 | 10/30 | 0 | 0 |
| 3 | aware | 1 | The towpath #1 | 30/30 | 0 | 0 |
| 3 | aware | 1 | The coal wharf #2 | 30/30 | 0 | 0 |
| 3 | aware | 1 | The lamplit quay #3 | 30/30 | 0 | 0 |
| 3 | aware | 2 | The drowned arcade #1 | 30/30 | 0 | 0 |
| 3 | aware | 2 | The eel steps #2 | 30/30 | 0 | 0 |
| 3 | aware | 2 | The lock cottage #3 | 30/30 | 0 | 0 |
| 3 | aware | 3 | The sluice #1 | 30/30 | 0 | 0 |
| 3 | aware | 3 | The crossing #2 | 30/30 | 0 | 0 |
| 3 | aware | 3 | The tanners' cut #3 | 30/30 | 0 | 0 |
| 3 | aware | 4 | The uphill reach #1 | 30/30 | 0 | 0 |
| 3 | aware | 4 | The lamp market #2 | 30/30 | 0 | 0 |
| 3 | aware | 4 | The siphon #3 | 30/30 | 0 | 0 |
| 3 | aware | 5 | The lamp-mother's pool #1 | 27/30 | 0 | 0 |
| 3 | aware | 5 | The lamp-mother's pool #2 | 30/30 | 0 | 0 |
| 3 | aware | 5 | The lamp-mother's pool #3 | 30/30 | 0 | 0 |
| 3 | blind | 1 | The towpath #1 | 30/30 | 0 | 0 |
| 3 | blind | 1 | The coal wharf #2 | 30/30 | 0 | 0 |
| 3 | blind | 1 | The lamplit quay #3 | 30/30 | 0 | 0 |
| 3 | blind | 2 | The drowned arcade #1 | 30/30 | 0 | 0 |
| 3 | blind | 2 | The eel steps #2 | 30/30 | 0 | 0 |
| 3 | blind | 2 | The lock cottage #3 | 30/30 | 0 | 0 |
| 3 | blind | 3 | The sluice #1 | 30/30 | 0 | 0 |
| 3 | blind | 3 | The crossing #2 | 30/30 | 0 | 0 |
| 3 | blind | 3 | The tanners' cut #3 | 30/30 | 0 | 0 |
| 3 | blind | 4 | The uphill reach #1 | 30/30 | 0 | 0 |
| 3 | blind | 4 | The lamp market #2 | 30/30 | 0 | 0 |
| 3 | blind | 4 | The siphon #3 | 30/30 | 0 | 0 |
| 3 | blind | 5 | The lamp-mother's pool #1 | 27/30 | 0 | 0 |
| 3 | blind | 5 | The lamp-mother's pool #2 | 30/30 | 0 | 0 |
| 3 | blind | 5 | The lamp-mother's pool #3 | 30/30 | 0 | 0 |

</details>

### Shared CAL-0 check at 50 seeds

The aware fresh pair and trio each won 150/150 fights at every depth. The aware solo won
142/150 fresh hearts and reached zero worn hearts in 50 trips. The worn pair reached 3/50
hearts and won 1/3; the worn trio reached 23/50 and won 15/23. At room 4 the worn pair won
3/32, versus 23/49 for the trio. These are reached-room rates and serve as a separate
carryover check alongside the heat and timing table.

<details><summary>50-seed shared authored bath table</summary>

Seeds 1–50; rounds 40; applied-action budget 600; starter lattices; greedy gauge+cracks; lite=false; first loot, onward, doorway unchanged; trip guard 60.

| party | axis | state | depth | layout | wins/reached | win % | reached/attempted | stalls | budget stops | mean rounds | entry HP | entry charges | entry bells |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | authored | fresh | 1 | The changing hall | 50/50 | 100.0 | 50/50 | 0 | 0 | 6.9 | 6.0 | 5.0 | 0.0 |
| 1 | authored | fresh | 1 | The scrubbing floor | 50/50 | 100.0 | 50/50 | 0 | 0 | 6.1 | 6.0 | 5.0 | 0.0 |
| 1 | authored | fresh | 1 | The tepidarium | 50/50 | 100.0 | 50/50 | 0 | 0 | 6.0 | 6.0 | 5.0 | 0.0 |
| 1 | authored | fresh | 2 | The steam gallery | 50/50 | 100.0 | 50/50 | 0 | 0 | 10.7 | 6.0 | 5.0 | 0.0 |
| 1 | authored | fresh | 2 | The laundry | 50/50 | 100.0 | 50/50 | 0 | 0 | 7.6 | 6.0 | 5.0 | 0.0 |
| 1 | authored | fresh | 2 | The boiler passage | 50/50 | 100.0 | 50/50 | 0 | 0 | 11.4 | 6.0 | 5.0 | 0.0 |
| 1 | authored | fresh | 3 | The frigidarium | 15/50 | 30.0 | 50/50 | 0 | 0 | 9.6 | 6.0 | 5.0 | 0.0 |
| 1 | authored | fresh | 3 | The long pool hall | 39/50 | 78.0 | 50/50 | 0 | 0 | 9.2 | 6.0 | 5.0 | 0.0 |
| 1 | authored | fresh | 3 | The mosaic court | 15/50 | 30.0 | 50/50 | 0 | 0 | 9.4 | 6.0 | 5.0 | 0.0 |
| 1 | authored | fresh | 4 | The great caldarium | 0/50 | 0.0 | 50/50 | 0 | 0 | 9.9 | 6.0 | 5.0 | 0.0 |
| 1 | authored | fresh | 4 | The sudatorium | 0/50 | 0.0 | 50/50 | 0 | 0 | 10.4 | 6.0 | 5.0 | 0.0 |
| 1 | authored | fresh | 4 | The hot springs | 23/50 | 46.0 | 50/50 | 0 | 0 | 10.2 | 6.0 | 5.0 | 0.0 |
| 1 | authored | fresh | 5 | The steward's caldarium | 50/50 | 100.0 | 50/50 | 0 | 0 | 6.8 | 6.0 | 5.0 | 0.0 |
| 1 | authored | fresh | 5 | The steward's caldarium | 50/50 | 100.0 | 50/50 | 0 | 0 | 6.7 | 6.0 | 5.0 | 0.0 |
| 1 | authored | fresh | 5 | The steward's caldarium | 42/50 | 84.0 | 50/50 | 0 | 0 | 6.8 | 6.0 | 5.0 | 0.0 |
| 1 | authored | trip-worn | 1 | The changing hall | 19/19 | 100.0 | 19/50 | 0 | 0 | 7.1 | 6.0 | 5.0 | 0.0 |
| 1 | authored | trip-worn | 1 | The scrubbing floor | 17/17 | 100.0 | 17/50 | 0 | 0 | 6.3 | 6.0 | 5.0 | 0.0 |
| 1 | authored | trip-worn | 1 | The tepidarium | 14/14 | 100.0 | 14/50 | 0 | 0 | 6.0 | 6.0 | 5.0 | 0.0 |
| 1 | authored | trip-worn | 2 | The steam gallery | 4/14 | 28.6 | 14/50 | 0 | 0 | 6.9 | 3.4 | 0.2 | 0.0 |
| 1 | authored | trip-worn | 2 | The laundry | 3/19 | 15.8 | 19/50 | 0 | 0 | 6.1 | 3.3 | 0.1 | 0.0 |
| 1 | authored | trip-worn | 2 | The boiler passage | 5/17 | 29.4 | 17/50 | 0 | 0 | 5.2 | 2.8 | 0.1 | 0.0 |
| 1 | authored | trip-worn | 3 | The frigidarium | 0/4 | 0.0 | 4/50 | 0 | 0 | 4.8 | 2.5 | 0.0 | 0.0 |
| 1 | authored | trip-worn | 3 | The long pool hall | 3/4 | 75.0 | 4/50 | 0 | 0 | 12.0 | 2.8 | 0.0 | 0.0 |
| 1 | authored | trip-worn | 3 | The mosaic court | 0/4 | 0.0 | 4/50 | 0 | 0 | 4.3 | 2.0 | 0.0 | 0.0 |
| 1 | authored | trip-worn | 4 | The great caldarium UNREACHED | 0/0 | — | 0/50 | 0 | 0 | — | — | — | — |
| 1 | authored | trip-worn | 4 | The sudatorium UNREACHED | 0/0 | — | 0/50 | 0 | 0 | — | — | — | — |
| 1 | authored | trip-worn | 4 | The hot springs | 0/3 | 0.0 | 3/50 | 0 | 0 | 6.3 | 2.3 | 0.0 | 0.0 |
| 1 | authored | trip-worn | 5 | The steward's caldarium UNREACHED | 0/0 | — | 0/50 | 0 | 0 | — | — | — | — |
| 1 | authored | trip-worn | 5 | The steward's caldarium UNREACHED | 0/0 | — | 0/50 | 0 | 0 | — | — | — | — |
| 1 | authored | trip-worn | 5 | The steward's caldarium UNREACHED | 0/0 | — | 0/50 | 0 | 0 | — | — | — | — |
| 2 | authored | fresh | 1 | The changing hall | 50/50 | 100.0 | 50/50 | 0 | 0 | 2.2 | 14.0 | 10.0 | 0.0 |
| 2 | authored | fresh | 1 | The scrubbing floor | 50/50 | 100.0 | 50/50 | 0 | 0 | 2.7 | 14.0 | 10.0 | 0.0 |
| 2 | authored | fresh | 1 | The tepidarium | 50/50 | 100.0 | 50/50 | 0 | 0 | 2.9 | 14.0 | 10.0 | 0.0 |
| 2 | authored | fresh | 2 | The steam gallery | 50/50 | 100.0 | 50/50 | 0 | 0 | 3.0 | 14.0 | 10.0 | 0.0 |
| 2 | authored | fresh | 2 | The laundry | 50/50 | 100.0 | 50/50 | 0 | 0 | 2.8 | 14.0 | 10.0 | 0.0 |
| 2 | authored | fresh | 2 | The boiler passage | 50/50 | 100.0 | 50/50 | 0 | 0 | 3.2 | 14.0 | 10.0 | 0.0 |
| 2 | authored | fresh | 3 | The frigidarium | 50/50 | 100.0 | 50/50 | 0 | 0 | 4.2 | 14.0 | 10.0 | 0.0 |
| 2 | authored | fresh | 3 | The long pool hall | 50/50 | 100.0 | 50/50 | 0 | 0 | 4.2 | 14.0 | 10.0 | 0.0 |
| 2 | authored | fresh | 3 | The mosaic court | 50/50 | 100.0 | 50/50 | 0 | 0 | 3.8 | 14.0 | 10.0 | 0.0 |
| 2 | authored | fresh | 4 | The great caldarium | 50/50 | 100.0 | 50/50 | 0 | 0 | 4.0 | 14.0 | 10.0 | 0.0 |
| 2 | authored | fresh | 4 | The sudatorium | 50/50 | 100.0 | 50/50 | 0 | 0 | 4.7 | 14.0 | 10.0 | 0.0 |
| 2 | authored | fresh | 4 | The hot springs | 50/50 | 100.0 | 50/50 | 0 | 0 | 4.1 | 14.0 | 10.0 | 0.0 |
| 2 | authored | fresh | 5 | The steward's caldarium | 50/50 | 100.0 | 50/50 | 0 | 0 | 3.9 | 14.0 | 10.0 | 0.0 |
| 2 | authored | fresh | 5 | The steward's caldarium | 50/50 | 100.0 | 50/50 | 0 | 0 | 4.0 | 14.0 | 10.0 | 0.0 |
| 2 | authored | fresh | 5 | The steward's caldarium | 50/50 | 100.0 | 50/50 | 0 | 0 | 3.5 | 14.0 | 10.0 | 0.0 |
| 2 | authored | trip-worn | 1 | The changing hall | 19/19 | 100.0 | 19/50 | 0 | 0 | 2.1 | 14.0 | 10.0 | 0.0 |
| 2 | authored | trip-worn | 1 | The scrubbing floor | 17/17 | 100.0 | 17/50 | 0 | 0 | 2.6 | 14.0 | 10.0 | 0.0 |
| 2 | authored | trip-worn | 1 | The tepidarium | 14/14 | 100.0 | 14/50 | 0 | 0 | 3.1 | 14.0 | 10.0 | 0.0 |
| 2 | authored | trip-worn | 2 | The steam gallery | 13/14 | 92.9 | 14/50 | 0 | 0 | 4.2 | 13.3 | 5.4 | 0.0 |
| 2 | authored | trip-worn | 2 | The laundry | 18/19 | 94.7 | 19/50 | 0 | 0 | 3.6 | 13.3 | 5.5 | 0.0 |
| 2 | authored | trip-worn | 2 | The boiler passage | 16/17 | 94.1 | 17/50 | 1 | 0 | 5.5 | 13.2 | 5.5 | 0.0 |
| 2 | authored | trip-worn | 3 | The frigidarium | 10/13 | 76.9 | 13/50 | 0 | 0 | 10.4 | 12.4 | 0.7 | 0.0 |
| 2 | authored | trip-worn | 3 | The long pool hall | 16/22 | 72.7 | 22/50 | 2 | 0 | 13.8 | 12.8 | 0.6 | 0.0 |
| 2 | authored | trip-worn | 3 | The mosaic court | 6/12 | 50.0 | 12/50 | 0 | 0 | 11.3 | 12.3 | 0.7 | 0.0 |
| 2 | authored | trip-worn | 4 | The great caldarium | 2/10 | 20.0 | 10/50 | 0 | 0 | 6.9 | 6.6 | 0.0 | 0.0 |
| 2 | authored | trip-worn | 4 | The sudatorium | 0/13 | 0.0 | 13/50 | 0 | 0 | 9.2 | 6.3 | 0.0 | 0.0 |
| 2 | authored | trip-worn | 4 | The hot springs | 1/9 | 11.1 | 9/50 | 0 | 0 | 8.8 | 7.7 | 0.0 | 0.0 |
| 2 | authored | trip-worn | 5 | The steward's caldarium | 1/2 | 50.0 | 2/50 | 0 | 0 | 6.5 | 5.5 | 0.0 | 0.0 |
| 2 | authored | trip-worn | 5 | The steward's caldarium | 0/1 | 0.0 | 1/50 | 0 | 0 | 3.0 | 4.0 | 0.0 | 0.0 |
| 2 | authored | trip-worn | 5 | The steward's caldarium UNREACHED | 0/0 | — | 0/50 | 0 | 0 | — | — | — | — |
| 3 | authored | fresh | 1 | The changing hall | 50/50 | 100.0 | 50/50 | 0 | 0 | 2.3 | 20.0 | 16.0 | 0.0 |
| 3 | authored | fresh | 1 | The scrubbing floor | 50/50 | 100.0 | 50/50 | 0 | 0 | 2.3 | 20.0 | 16.0 | 0.0 |
| 3 | authored | fresh | 1 | The tepidarium | 50/50 | 100.0 | 50/50 | 0 | 0 | 2.6 | 20.0 | 16.0 | 0.0 |
| 3 | authored | fresh | 2 | The steam gallery | 50/50 | 100.0 | 50/50 | 0 | 0 | 2.4 | 20.0 | 16.0 | 0.0 |
| 3 | authored | fresh | 2 | The laundry | 50/50 | 100.0 | 50/50 | 0 | 0 | 2.4 | 20.0 | 16.0 | 0.0 |
| 3 | authored | fresh | 2 | The boiler passage | 50/50 | 100.0 | 50/50 | 0 | 0 | 2.5 | 20.0 | 16.0 | 0.0 |
| 3 | authored | fresh | 3 | The frigidarium | 50/50 | 100.0 | 50/50 | 0 | 0 | 3.3 | 20.0 | 16.0 | 0.0 |
| 3 | authored | fresh | 3 | The long pool hall | 50/50 | 100.0 | 50/50 | 0 | 0 | 3.2 | 20.0 | 16.0 | 0.0 |
| 3 | authored | fresh | 3 | The mosaic court | 50/50 | 100.0 | 50/50 | 0 | 0 | 3.3 | 20.0 | 16.0 | 0.0 |
| 3 | authored | fresh | 4 | The great caldarium | 50/50 | 100.0 | 50/50 | 0 | 0 | 3.2 | 20.0 | 16.0 | 0.0 |
| 3 | authored | fresh | 4 | The sudatorium | 50/50 | 100.0 | 50/50 | 0 | 0 | 3.7 | 20.0 | 16.0 | 0.0 |
| 3 | authored | fresh | 4 | The hot springs | 50/50 | 100.0 | 50/50 | 0 | 0 | 3.1 | 20.0 | 16.0 | 0.0 |
| 3 | authored | fresh | 5 | The steward's caldarium | 50/50 | 100.0 | 50/50 | 0 | 0 | 3.1 | 20.0 | 16.0 | 0.0 |
| 3 | authored | fresh | 5 | The steward's caldarium | 50/50 | 100.0 | 50/50 | 0 | 0 | 3.1 | 20.0 | 16.0 | 0.0 |
| 3 | authored | fresh | 5 | The steward's caldarium | 50/50 | 100.0 | 50/50 | 0 | 0 | 3.2 | 20.0 | 16.0 | 0.0 |
| 3 | authored | trip-worn | 1 | The changing hall | 19/19 | 100.0 | 19/50 | 0 | 0 | 2.4 | 20.0 | 16.0 | 0.0 |
| 3 | authored | trip-worn | 1 | The scrubbing floor | 17/17 | 100.0 | 17/50 | 0 | 0 | 2.2 | 20.0 | 16.0 | 0.0 |
| 3 | authored | trip-worn | 1 | The tepidarium | 14/14 | 100.0 | 14/50 | 0 | 0 | 2.7 | 20.0 | 16.0 | 0.0 |
| 3 | authored | trip-worn | 2 | The steam gallery | 14/14 | 100.0 | 14/50 | 0 | 0 | 2.3 | 19.9 | 11.4 | 0.0 |
| 3 | authored | trip-worn | 2 | The laundry | 19/19 | 100.0 | 19/50 | 0 | 0 | 2.4 | 19.5 | 11.4 | 0.0 |
| 3 | authored | trip-worn | 2 | The boiler passage | 17/17 | 100.0 | 17/50 | 0 | 0 | 2.5 | 19.9 | 11.1 | 0.0 |
| 3 | authored | trip-worn | 3 | The frigidarium | 13/14 | 92.9 | 14/50 | 1 | 0 | 7.1 | 19.3 | 6.1 | 0.0 |
| 3 | authored | trip-worn | 3 | The long pool hall | 24/24 | 100.0 | 24/50 | 0 | 0 | 4.9 | 19.6 | 6.1 | 0.0 |
| 3 | authored | trip-worn | 3 | The mosaic court | 12/12 | 100.0 | 12/50 | 0 | 0 | 4.5 | 19.4 | 5.8 | 0.0 |
| 3 | authored | trip-worn | 4 | The great caldarium | 8/18 | 44.4 | 18/50 | 1 | 0 | 15.4 | 17.7 | 1.4 | 0.0 |
| 3 | authored | trip-worn | 4 | The sudatorium | 10/19 | 52.6 | 19/50 | 0 | 0 | 16.4 | 17.7 | 1.3 | 0.0 |
| 3 | authored | trip-worn | 4 | The hot springs | 5/12 | 41.7 | 12/50 | 1 | 0 | 15.8 | 17.6 | 1.0 | 0.0 |
| 3 | authored | trip-worn | 5 | The steward's caldarium | 9/12 | 75.0 | 12/50 | 0 | 0 | 6.6 | 9.8 | 0.0 | 0.0 |
| 3 | authored | trip-worn | 5 | The steward's caldarium | 5/5 | 100.0 | 5/50 | 0 | 0 | 7.0 | 11.8 | 0.0 | 0.0 |
| 3 | authored | trip-worn | 5 | The steward's caldarium | 1/6 | 16.7 | 6/50 | 0 | 0 | 4.3 | 7.0 | 0.0 | 0.0 |

Party 1, authored: trip ends {"lost":50} / 50.
Party 2, authored: trip ends {"stalled":3,"lost":46,"cleared":1} / 50.
Party 3, authored: trip ends {"lost":32,"cleared":15,"stalled":3} / 50.

</details>

### Verification runs

The isolated 30-seed authored retry passed and reproduced the original table byte for byte.
The original run reported wall-clock timeouts. The three-seed live table and both shared CAL
sweeps (3 and 50 seeds) passed. The full targeted command passed 82 tests across seven files on
retry, and the raw smoke kept its two-win assertion. TypeScript and Biome checks passed.

### Candidate trials for player review

The matched control and both trials use the aware fresh pair, seeds 1–8 on each of three layouts
per depth and heat (24 fights per depth and mode). To rerun an arm with its listed data values,
use `BATH_TABLE=1 BATH_CANDIDATE=1 BATH_SEEDS=8 pnpm vitest run tests/sim/bathhouses-calibration.test.ts -t 'live bathhouses' --reporter=dot`.
These are screening samples of fixed bot seeds. A 24/24 win count has a descriptive 95% Wilson
interval of 86.2–100%, and 20/24 gives 64.1–93.3%. Repeated layouts and the fixed bot limit how
much these intervals say about player difficulty.

| Arm | Heat 1/2/3/4 tile, vent (quarters) | Capacity, feeder, stoke (pips) | Attendant, boilerman, bather, Steward HP | Steward fallback damage |
| --- | --- | --- | --- | --- |
| Control | (2,4), (3,8), (4,8), (5,12) | 12, 2, 4 | 4, 3, 3, 14 | 1 |
| Pressure | (2,4), (3,8), (3,8), (3,8) | 24, 1, 1 | 4, 3, 3, 14 | 1 |
| Pressure and bodies | (2,4), (3,8), (3,8), (2,6) | 32, 1, 1 | 7, 5, 5, 20 | 2 |

| Arm | Base-heat wins r1 / r2 / r3 / r4 / heart | Heart first dusk (legacy round) | Heart boils/fight / median | Heart member hits/fight | Heat 1–2 median boils | Heart wins/losses with boil | r4 wins/losses with boil |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Control | 24/24 · 24/24 · 24/24 · 24/24 · 24/24 | 1 (2) | 3.46 / 3 | 2.50 | 0–1 | 24/0 | 24/0 |
| Pressure | 24/24 · 24/24 · 24/24 · 24/24 · 24/24 | 2 (3) | 1.50 / 1.5 | 0.88 | 0 | 24/0 | 0/0 |
| Pressure and bodies | 24/24 · 24/24 · 24/24 · 20/24 · 24/24 | 3 (4) | 1.08 / 1 | 0.46 | 0 | 24/0 | 6/2 |

Pressure alone misses first dusk by one round in all three heart layouts and removes the boil
from all 168 non-heart fights, including cooled rows. Pressure and bodies reaches dusk 3, 3 and
4 across the heart layouts and produces both outcomes with a boil in room 4. The heart still
wins 24/24, 4 wins more than room 4 (+16.7 points), reversing the intended difficulty order.
Room 4's 83.3% is 6.7 points below the 90% lower bound suggested by the 30-seed canal baseline.
That comparison uses different sample sizes. Heat 4 in this trial gives less pressure per cloud
and vent than heat 3. The ordinary
foe HP changes are global and were screened from room 1. The Steward really spawned with 14,
14 and 20 HP respectively, and the shell used the same values.

Proposed decision: retain the current numbers for now. If heat 4 should still feel hotter than
heat 3 and the heart should open at dusk 3 or later, review the Steward's opening Steam hall
and whether his first stoke should wait. A later first stoke changes the rival's routine and
needs player approval. The old raw-board smoke assertion of two wins for both bots in every room
still runs. Replacing that acceptance check with authored timing and an approved win band also
needs player approval.

<details><summary>Matched control per-layout trial output</summary>

Seeds 1–8, 40 rounds, 600 applied actions, full starter-lattice bot. Aware uses gauge + cracks. Blind uses neither. Hold is off in both. Worn trips carry actual HP and charges, take the first loot and leave the doorway unchanged; cooled trips prioritize the cold plunge. Opening bridge layouts precede the first span choice.

First boil uses the round in the event log, before the following round starts. The legacy bot column uses the post-action round. Both medians exclude fights without a boil. Win/loss counts exclude stalls and exhausted budgets.

#### Baths by depth and effective heat

| party | policy | state | depth | layout | heat | wins/fights | fresh canal wins/fights | delta pp | boils/fight | median boils | first boil dusk | legacy bot round | no boil | member hits/fight | wins/losses if boil | wins/losses if no boil | stalls | budget | entry HP | Steward HP |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 2 | aware | fresh | 1 | all layouts | 1 | 24/24 | — | — | 0.04 | 0.00 | 3.00 | 4.00 | 23 | 0.00 | 1/0 | 23/0 | 0 | 0 | 14.00 | — |
| 2 | aware | fresh | 2 | all layouts | 2 | 24/24 | — | — | 0.21 | 0.00 | 2.00 | 3.00 | 19 | 0.00 | 5/0 | 19/0 | 0 | 0 | 14.00 | — |
| 2 | aware | fresh | 3 | all layouts | 3 | 24/24 | — | — | 0.96 | 1.00 | 2.00 | 3.00 | 1 | 0.00 | 23/0 | 1/0 | 0 | 0 | 14.00 | — |
| 2 | aware | fresh | 4 | all layouts | 4 | 24/24 | — | — | 1.25 | 1.00 | 2.00 | 3.00 | 0 | 0.00 | 24/0 | 0/0 | 0 | 0 | 14.00 | — |
| 2 | aware | fresh | 5 | all layouts | 4 | 24/24 | — | — | 3.46 | 3.00 | 1.00 | 2.00 | 0 | 2.50 | 24/0 | 0/0 | 0 | 0 | 14.00 | 14 |
| 2 | aware | fresh cooled | 2 | all layouts | 1 | 24/24 | — | — | 0.04 | 0.00 | 3.00 | 4.00 | 23 | 0.00 | 1/0 | 23/0 | 0 | 0 | 14.00 | — |
| 2 | aware | fresh cooled | 3 | all layouts | 2 | 24/24 | — | — | 0.92 | 1.00 | 3.00 | 4.00 | 2 | 0.00 | 22/0 | 2/0 | 0 | 0 | 14.00 | — |
| 2 | aware | fresh cooled | 4 | all layouts | 3 | 24/24 | — | — | 1.04 | 1.00 | 2.00 | 3.00 | 0 | 0.00 | 24/0 | 0/0 | 0 | 0 | 14.00 | — |

#### Baths by layout

| party | policy | state | depth | layout | heat | wins/fights | fresh canal wins/fights | delta pp | boils/fight | median boils | first boil dusk | legacy bot round | no boil | member hits/fight | wins/losses if boil | wins/losses if no boil | stalls | budget | entry HP | Steward HP |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 2 | aware | fresh | 1 | The changing hall #1 | 1 | 8/8 | — | — | 0.00 | 0.00 | — | — | 8 | 0.00 | 0/0 | 8/0 | 0 | 0 | 14.00 | — |
| 2 | aware | fresh | 1 | The scrubbing floor #2 | 1 | 8/8 | — | — | 0.00 | 0.00 | — | — | 8 | 0.00 | 0/0 | 8/0 | 0 | 0 | 14.00 | — |
| 2 | aware | fresh | 1 | The tepidarium #3 | 1 | 8/8 | — | — | 0.13 | 0.00 | 3.00 | 4.00 | 7 | 0.00 | 1/0 | 7/0 | 0 | 0 | 14.00 | — |
| 2 | aware | fresh | 2 | The steam gallery #1 | 2 | 8/8 | — | — | 0.25 | 0.00 | 2.00 | 3.00 | 6 | 0.00 | 2/0 | 6/0 | 0 | 0 | 14.00 | — |
| 2 | aware | fresh | 2 | The laundry #2 | 2 | 8/8 | — | — | 0.38 | 0.00 | 3.00 | 3.00 | 5 | 0.00 | 3/0 | 5/0 | 0 | 0 | 14.00 | — |
| 2 | aware | fresh | 2 | The boiler passage #3 | 2 | 8/8 | — | — | 0.00 | 0.00 | — | — | 8 | 0.00 | 0/0 | 8/0 | 0 | 0 | 14.00 | — |
| 2 | aware | fresh | 3 | The frigidarium #1 | 3 | 8/8 | — | — | 1.00 | 1.00 | 2.00 | 3.00 | 0 | 0.00 | 8/0 | 0/0 | 0 | 0 | 14.00 | — |
| 2 | aware | fresh | 3 | The long pool hall #2 | 3 | 8/8 | — | — | 1.00 | 1.00 | 2.00 | 3.00 | 0 | 0.00 | 8/0 | 0/0 | 0 | 0 | 14.00 | — |
| 2 | aware | fresh | 3 | The mosaic court #3 | 3 | 8/8 | — | — | 0.88 | 1.00 | 2.00 | 3.00 | 1 | 0.00 | 7/0 | 1/0 | 0 | 0 | 14.00 | — |
| 2 | aware | fresh | 4 | The great caldarium #1 | 4 | 8/8 | — | — | 1.00 | 1.00 | 2.00 | 3.00 | 0 | 0.00 | 8/0 | 0/0 | 0 | 0 | 14.00 | — |
| 2 | aware | fresh | 4 | The sudatorium #2 | 4 | 8/8 | — | — | 1.50 | 1.50 | 2.00 | 3.00 | 0 | 0.00 | 8/0 | 0/0 | 0 | 0 | 14.00 | — |
| 2 | aware | fresh | 4 | The hot springs #3 | 4 | 8/8 | — | — | 1.25 | 1.00 | 2.00 | 3.00 | 0 | 0.00 | 8/0 | 0/0 | 0 | 0 | 14.00 | — |
| 2 | aware | fresh | 5 | The steward's caldarium #1 | 4 | 8/8 | — | — | 3.13 | 3.00 | 1.00 | 2.00 | 0 | 2.00 | 8/0 | 0/0 | 0 | 0 | 14.00 | 14 |
| 2 | aware | fresh | 5 | The steward's caldarium #2 | 4 | 8/8 | — | — | 4.13 | 4.00 | 1.00 | 2.00 | 0 | 2.63 | 8/0 | 0/0 | 0 | 0 | 14.00 | 14 |
| 2 | aware | fresh | 5 | The steward's caldarium #3 | 4 | 8/8 | — | — | 3.13 | 3.00 | 1.00 | 2.00 | 0 | 2.88 | 8/0 | 0/0 | 0 | 0 | 14.00 | 14 |
| 2 | aware | fresh cooled | 2 | The steam gallery #1 | 1 | 8/8 | — | — | 0.00 | 0.00 | — | — | 8 | 0.00 | 0/0 | 8/0 | 0 | 0 | 14.00 | — |
| 2 | aware | fresh cooled | 2 | The laundry #2 | 1 | 8/8 | — | — | 0.13 | 0.00 | 3.00 | 4.00 | 7 | 0.00 | 1/0 | 7/0 | 0 | 0 | 14.00 | — |
| 2 | aware | fresh cooled | 2 | The boiler passage #3 | 1 | 8/8 | — | — | 0.00 | 0.00 | — | — | 8 | 0.00 | 0/0 | 8/0 | 0 | 0 | 14.00 | — |
| 2 | aware | fresh cooled | 3 | The frigidarium #1 | 2 | 8/8 | — | — | 1.00 | 1.00 | 3.00 | 4.00 | 0 | 0.00 | 8/0 | 0/0 | 0 | 0 | 14.00 | — |
| 2 | aware | fresh cooled | 3 | The long pool hall #2 | 2 | 8/8 | — | — | 1.00 | 1.00 | 2.00 | 3.00 | 0 | 0.00 | 8/0 | 0/0 | 0 | 0 | 14.00 | — |
| 2 | aware | fresh cooled | 3 | The mosaic court #3 | 2 | 8/8 | — | — | 0.75 | 1.00 | 3.00 | 4.00 | 2 | 0.00 | 6/0 | 2/0 | 0 | 0 | 14.00 | — |
| 2 | aware | fresh cooled | 4 | The great caldarium #1 | 3 | 8/8 | — | — | 1.00 | 1.00 | 2.00 | 3.00 | 0 | 0.00 | 8/0 | 0/0 | 0 | 0 | 14.00 | — |
| 2 | aware | fresh cooled | 4 | The sudatorium #2 | 3 | 8/8 | — | — | 1.13 | 1.00 | 2.00 | 3.00 | 0 | 0.00 | 8/0 | 0/0 | 0 | 0 | 14.00 | — |
| 2 | aware | fresh cooled | 4 | The hot springs #3 | 3 | 8/8 | — | — | 1.00 | 1.00 | 2.00 | 3.00 | 0 | 0.00 | 8/0 | 0/0 | 0 | 0 | 14.00 | — |

</details>

<details><summary>Pressure per-layout trial output</summary>

Seeds 1–8, 40 rounds, 600 applied actions, full starter-lattice bot. Aware uses gauge + cracks. Blind uses neither. Hold is off in both. Worn trips carry actual HP and charges, take the first loot and leave the doorway unchanged; cooled trips prioritize the cold plunge. Opening bridge layouts precede the first span choice.

First boil uses the round in the event log, before the following round starts. The legacy bot column uses the post-action round. Both medians exclude fights without a boil. Win/loss counts exclude stalls and exhausted budgets.

#### Baths by depth and effective heat

| party | policy | state | depth | layout | heat | wins/fights | fresh canal wins/fights | delta pp | boils/fight | median boils | first boil dusk | legacy bot round | no boil | member hits/fight | wins/losses if boil | wins/losses if no boil | stalls | budget | entry HP | Steward HP |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 2 | aware | fresh | 1 | all layouts | 1 | 24/24 | — | — | 0.00 | 0.00 | — | — | 24 | 0.00 | 0/0 | 24/0 | 0 | 0 | 14.00 | — |
| 2 | aware | fresh | 2 | all layouts | 2 | 24/24 | — | — | 0.00 | 0.00 | — | — | 24 | 0.00 | 0/0 | 24/0 | 0 | 0 | 14.00 | — |
| 2 | aware | fresh | 3 | all layouts | 3 | 24/24 | — | — | 0.00 | 0.00 | — | — | 24 | 0.00 | 0/0 | 24/0 | 0 | 0 | 14.00 | — |
| 2 | aware | fresh | 4 | all layouts | 4 | 24/24 | — | — | 0.00 | 0.00 | — | — | 24 | 0.00 | 0/0 | 24/0 | 0 | 0 | 14.00 | — |
| 2 | aware | fresh | 5 | all layouts | 4 | 24/24 | — | — | 1.50 | 1.50 | 2.00 | 3.00 | 0 | 0.88 | 24/0 | 0/0 | 0 | 0 | 14.00 | 14 |
| 2 | aware | fresh cooled | 2 | all layouts | 1 | 24/24 | — | — | 0.00 | 0.00 | — | — | 24 | 0.00 | 0/0 | 24/0 | 0 | 0 | 14.00 | — |
| 2 | aware | fresh cooled | 3 | all layouts | 2 | 24/24 | — | — | 0.00 | 0.00 | — | — | 24 | 0.00 | 0/0 | 24/0 | 0 | 0 | 14.00 | — |
| 2 | aware | fresh cooled | 4 | all layouts | 3 | 24/24 | — | — | 0.00 | 0.00 | — | — | 24 | 0.00 | 0/0 | 24/0 | 0 | 0 | 14.00 | — |

#### Baths by layout

| party | policy | state | depth | layout | heat | wins/fights | fresh canal wins/fights | delta pp | boils/fight | median boils | first boil dusk | legacy bot round | no boil | member hits/fight | wins/losses if boil | wins/losses if no boil | stalls | budget | entry HP | Steward HP |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 2 | aware | fresh | 1 | The changing hall #1 | 1 | 8/8 | — | — | 0.00 | 0.00 | — | — | 8 | 0.00 | 0/0 | 8/0 | 0 | 0 | 14.00 | — |
| 2 | aware | fresh | 1 | The scrubbing floor #2 | 1 | 8/8 | — | — | 0.00 | 0.00 | — | — | 8 | 0.00 | 0/0 | 8/0 | 0 | 0 | 14.00 | — |
| 2 | aware | fresh | 1 | The tepidarium #3 | 1 | 8/8 | — | — | 0.00 | 0.00 | — | — | 8 | 0.00 | 0/0 | 8/0 | 0 | 0 | 14.00 | — |
| 2 | aware | fresh | 2 | The steam gallery #1 | 2 | 8/8 | — | — | 0.00 | 0.00 | — | — | 8 | 0.00 | 0/0 | 8/0 | 0 | 0 | 14.00 | — |
| 2 | aware | fresh | 2 | The laundry #2 | 2 | 8/8 | — | — | 0.00 | 0.00 | — | — | 8 | 0.00 | 0/0 | 8/0 | 0 | 0 | 14.00 | — |
| 2 | aware | fresh | 2 | The boiler passage #3 | 2 | 8/8 | — | — | 0.00 | 0.00 | — | — | 8 | 0.00 | 0/0 | 8/0 | 0 | 0 | 14.00 | — |
| 2 | aware | fresh | 3 | The frigidarium #1 | 3 | 8/8 | — | — | 0.00 | 0.00 | — | — | 8 | 0.00 | 0/0 | 8/0 | 0 | 0 | 14.00 | — |
| 2 | aware | fresh | 3 | The long pool hall #2 | 3 | 8/8 | — | — | 0.00 | 0.00 | — | — | 8 | 0.00 | 0/0 | 8/0 | 0 | 0 | 14.00 | — |
| 2 | aware | fresh | 3 | The mosaic court #3 | 3 | 8/8 | — | — | 0.00 | 0.00 | — | — | 8 | 0.00 | 0/0 | 8/0 | 0 | 0 | 14.00 | — |
| 2 | aware | fresh | 4 | The great caldarium #1 | 4 | 8/8 | — | — | 0.00 | 0.00 | — | — | 8 | 0.00 | 0/0 | 8/0 | 0 | 0 | 14.00 | — |
| 2 | aware | fresh | 4 | The sudatorium #2 | 4 | 8/8 | — | — | 0.00 | 0.00 | — | — | 8 | 0.00 | 0/0 | 8/0 | 0 | 0 | 14.00 | — |
| 2 | aware | fresh | 4 | The hot springs #3 | 4 | 8/8 | — | — | 0.00 | 0.00 | — | — | 8 | 0.00 | 0/0 | 8/0 | 0 | 0 | 14.00 | — |
| 2 | aware | fresh | 5 | The steward's caldarium #1 | 4 | 8/8 | — | — | 1.88 | 2.00 | 2.00 | 3.00 | 0 | 1.50 | 8/0 | 0/0 | 0 | 0 | 14.00 | 14 |
| 2 | aware | fresh | 5 | The steward's caldarium #2 | 4 | 8/8 | — | — | 1.50 | 1.50 | 2.00 | 3.00 | 0 | 0.88 | 8/0 | 0/0 | 0 | 0 | 14.00 | 14 |
| 2 | aware | fresh | 5 | The steward's caldarium #3 | 4 | 8/8 | — | — | 1.13 | 1.00 | 2.00 | 3.00 | 0 | 0.25 | 8/0 | 0/0 | 0 | 0 | 14.00 | 14 |
| 2 | aware | fresh cooled | 2 | The steam gallery #1 | 1 | 8/8 | — | — | 0.00 | 0.00 | — | — | 8 | 0.00 | 0/0 | 8/0 | 0 | 0 | 14.00 | — |
| 2 | aware | fresh cooled | 2 | The laundry #2 | 1 | 8/8 | — | — | 0.00 | 0.00 | — | — | 8 | 0.00 | 0/0 | 8/0 | 0 | 0 | 14.00 | — |
| 2 | aware | fresh cooled | 2 | The boiler passage #3 | 1 | 8/8 | — | — | 0.00 | 0.00 | — | — | 8 | 0.00 | 0/0 | 8/0 | 0 | 0 | 14.00 | — |
| 2 | aware | fresh cooled | 3 | The frigidarium #1 | 2 | 8/8 | — | — | 0.00 | 0.00 | — | — | 8 | 0.00 | 0/0 | 8/0 | 0 | 0 | 14.00 | — |
| 2 | aware | fresh cooled | 3 | The long pool hall #2 | 2 | 8/8 | — | — | 0.00 | 0.00 | — | — | 8 | 0.00 | 0/0 | 8/0 | 0 | 0 | 14.00 | — |
| 2 | aware | fresh cooled | 3 | The mosaic court #3 | 2 | 8/8 | — | — | 0.00 | 0.00 | — | — | 8 | 0.00 | 0/0 | 8/0 | 0 | 0 | 14.00 | — |
| 2 | aware | fresh cooled | 4 | The great caldarium #1 | 3 | 8/8 | — | — | 0.00 | 0.00 | — | — | 8 | 0.00 | 0/0 | 8/0 | 0 | 0 | 14.00 | — |
| 2 | aware | fresh cooled | 4 | The sudatorium #2 | 3 | 8/8 | — | — | 0.00 | 0.00 | — | — | 8 | 0.00 | 0/0 | 8/0 | 0 | 0 | 14.00 | — |
| 2 | aware | fresh cooled | 4 | The hot springs #3 | 3 | 8/8 | — | — | 0.00 | 0.00 | — | — | 8 | 0.00 | 0/0 | 8/0 | 0 | 0 | 14.00 | — |

</details>

<details><summary>Pressure and bodies per-layout trial output</summary>

Seeds 1–8, 40 rounds, 600 applied actions, full starter-lattice bot. Aware uses gauge + cracks. Blind uses neither. Hold is off in both. Worn trips carry actual HP and charges, take the first loot and leave the doorway unchanged; cooled trips prioritize the cold plunge. Opening bridge layouts precede the first span choice.

First boil uses the round in the event log, before the following round starts. The legacy bot column uses the post-action round. Both medians exclude fights without a boil. Win/loss counts exclude stalls and exhausted budgets.

#### Baths by depth and effective heat

| party | policy | state | depth | layout | heat | wins/fights | fresh canal wins/fights | delta pp | boils/fight | median boils | first boil dusk | legacy bot round | no boil | member hits/fight | wins/losses if boil | wins/losses if no boil | stalls | budget | entry HP | Steward HP |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 2 | aware | fresh | 1 | all layouts | 1 | 24/24 | — | — | 0.00 | 0.00 | — | — | 24 | 0.00 | 0/0 | 24/0 | 0 | 0 | 14.00 | — |
| 2 | aware | fresh | 2 | all layouts | 2 | 24/24 | — | — | 0.00 | 0.00 | — | — | 24 | 0.00 | 0/0 | 24/0 | 0 | 0 | 14.00 | — |
| 2 | aware | fresh | 3 | all layouts | 3 | 24/24 | — | — | 0.00 | 0.00 | — | — | 24 | 0.00 | 0/0 | 24/0 | 0 | 0 | 14.00 | — |
| 2 | aware | fresh | 4 | all layouts | 4 | 20/24 | — | — | 0.33 | 0.00 | 11.00 | 12.00 | 16 | 0.00 | 6/2 | 14/2 | 0 | 0 | 14.00 | — |
| 2 | aware | fresh | 5 | all layouts | 4 | 24/24 | — | — | 1.08 | 1.00 | 3.00 | 4.00 | 0 | 0.46 | 24/0 | 0/0 | 0 | 0 | 14.00 | 20 |
| 2 | aware | fresh cooled | 2 | all layouts | 1 | 24/24 | — | — | 0.00 | 0.00 | — | — | 24 | 0.00 | 0/0 | 24/0 | 0 | 0 | 14.00 | — |
| 2 | aware | fresh cooled | 3 | all layouts | 2 | 24/24 | — | — | 0.00 | 0.00 | — | — | 24 | 0.00 | 0/0 | 24/0 | 0 | 0 | 14.00 | — |
| 2 | aware | fresh cooled | 4 | all layouts | 3 | 21/24 | — | — | 0.58 | 0.50 | 8.00 | 9.00 | 12 | 0.00 | 9/3 | 12/0 | 0 | 0 | 14.00 | — |

#### Baths by layout

| party | policy | state | depth | layout | heat | wins/fights | fresh canal wins/fights | delta pp | boils/fight | median boils | first boil dusk | legacy bot round | no boil | member hits/fight | wins/losses if boil | wins/losses if no boil | stalls | budget | entry HP | Steward HP |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 2 | aware | fresh | 1 | The changing hall #1 | 1 | 8/8 | — | — | 0.00 | 0.00 | — | — | 8 | 0.00 | 0/0 | 8/0 | 0 | 0 | 14.00 | — |
| 2 | aware | fresh | 1 | The scrubbing floor #2 | 1 | 8/8 | — | — | 0.00 | 0.00 | — | — | 8 | 0.00 | 0/0 | 8/0 | 0 | 0 | 14.00 | — |
| 2 | aware | fresh | 1 | The tepidarium #3 | 1 | 8/8 | — | — | 0.00 | 0.00 | — | — | 8 | 0.00 | 0/0 | 8/0 | 0 | 0 | 14.00 | — |
| 2 | aware | fresh | 2 | The steam gallery #1 | 2 | 8/8 | — | — | 0.00 | 0.00 | — | — | 8 | 0.00 | 0/0 | 8/0 | 0 | 0 | 14.00 | — |
| 2 | aware | fresh | 2 | The laundry #2 | 2 | 8/8 | — | — | 0.00 | 0.00 | — | — | 8 | 0.00 | 0/0 | 8/0 | 0 | 0 | 14.00 | — |
| 2 | aware | fresh | 2 | The boiler passage #3 | 2 | 8/8 | — | — | 0.00 | 0.00 | — | — | 8 | 0.00 | 0/0 | 8/0 | 0 | 0 | 14.00 | — |
| 2 | aware | fresh | 3 | The frigidarium #1 | 3 | 8/8 | — | — | 0.00 | 0.00 | — | — | 8 | 0.00 | 0/0 | 8/0 | 0 | 0 | 14.00 | — |
| 2 | aware | fresh | 3 | The long pool hall #2 | 3 | 8/8 | — | — | 0.00 | 0.00 | — | — | 8 | 0.00 | 0/0 | 8/0 | 0 | 0 | 14.00 | — |
| 2 | aware | fresh | 3 | The mosaic court #3 | 3 | 8/8 | — | — | 0.00 | 0.00 | — | — | 8 | 0.00 | 0/0 | 8/0 | 0 | 0 | 14.00 | — |
| 2 | aware | fresh | 4 | The great caldarium #1 | 4 | 5/8 | — | — | 0.25 | 0.00 | 11.00 | 12.00 | 6 | 0.00 | 1/1 | 4/2 | 0 | 0 | 14.00 | — |
| 2 | aware | fresh | 4 | The sudatorium #2 | 4 | 7/8 | — | — | 0.63 | 1.00 | 11.00 | 12.00 | 3 | 0.00 | 4/1 | 3/0 | 0 | 0 | 14.00 | — |
| 2 | aware | fresh | 4 | The hot springs #3 | 4 | 8/8 | — | — | 0.13 | 0.00 | 13.00 | 13.00 | 7 | 0.00 | 1/0 | 7/0 | 0 | 0 | 14.00 | — |
| 2 | aware | fresh | 5 | The steward's caldarium #1 | 4 | 8/8 | — | — | 1.00 | 1.00 | 3.00 | 4.00 | 0 | 1.00 | 8/0 | 0/0 | 0 | 0 | 14.00 | 20 |
| 2 | aware | fresh | 5 | The steward's caldarium #2 | 4 | 8/8 | — | — | 1.25 | 1.00 | 3.00 | 4.00 | 0 | 0.38 | 8/0 | 0/0 | 0 | 0 | 14.00 | 20 |
| 2 | aware | fresh | 5 | The steward's caldarium #3 | 4 | 8/8 | — | — | 1.00 | 1.00 | 4.00 | 5.00 | 0 | 0.00 | 8/0 | 0/0 | 0 | 0 | 14.00 | 20 |
| 2 | aware | fresh cooled | 2 | The steam gallery #1 | 1 | 8/8 | — | — | 0.00 | 0.00 | — | — | 8 | 0.00 | 0/0 | 8/0 | 0 | 0 | 14.00 | — |
| 2 | aware | fresh cooled | 2 | The laundry #2 | 1 | 8/8 | — | — | 0.00 | 0.00 | — | — | 8 | 0.00 | 0/0 | 8/0 | 0 | 0 | 14.00 | — |
| 2 | aware | fresh cooled | 2 | The boiler passage #3 | 1 | 8/8 | — | — | 0.00 | 0.00 | — | — | 8 | 0.00 | 0/0 | 8/0 | 0 | 0 | 14.00 | — |
| 2 | aware | fresh cooled | 3 | The frigidarium #1 | 2 | 8/8 | — | — | 0.00 | 0.00 | — | — | 8 | 0.00 | 0/0 | 8/0 | 0 | 0 | 14.00 | — |
| 2 | aware | fresh cooled | 3 | The long pool hall #2 | 2 | 8/8 | — | — | 0.00 | 0.00 | — | — | 8 | 0.00 | 0/0 | 8/0 | 0 | 0 | 14.00 | — |
| 2 | aware | fresh cooled | 3 | The mosaic court #3 | 2 | 8/8 | — | — | 0.00 | 0.00 | — | — | 8 | 0.00 | 0/0 | 8/0 | 0 | 0 | 14.00 | — |
| 2 | aware | fresh cooled | 4 | The great caldarium #1 | 3 | 6/8 | — | — | 0.63 | 0.50 | 9.50 | 10.50 | 4 | 0.00 | 2/2 | 4/0 | 0 | 0 | 14.00 | — |
| 2 | aware | fresh cooled | 4 | The sudatorium #2 | 3 | 7/8 | — | — | 0.88 | 1.00 | 8.00 | 9.00 | 2 | 0.00 | 5/1 | 2/0 | 0 | 0 | 14.00 | — |
| 2 | aware | fresh cooled | 4 | The hot springs #3 | 3 | 8/8 | — | — | 0.25 | 0.00 | 8.50 | 9.00 | 6 | 0.00 | 2/0 | 6/0 | 0 | 0 | 14.00 | — |

</details>

## Historical raw-board calibration (BH-16)

Setup: `tests/sim/bathhouses-calibration.test.ts`, rooms driven straight from `BATH_ROOMS_12`, `BATH_ROOMS_34` and `BATH_HEART` (not yet in the kit), founding pair, fresh HP, gauge listed at the room's heat (rooms 1-4 = heat 1-4, heart = 4), 20 seeds per layout, 40-round cap. Reproduce: `BATH_SEEDS=20 pnpm vitest run tests/sim/bathhouses-calibration.test.ts --disable-console-intercept` (about 2.5 minutes; `BATH_TABLE=1` uses 30 seeds). The default run is a quick two-seed win check per room and both bots (about 5 s, in `check:fast`).

Two bots: **blind** (the old greedy bot) and **gauge** (`botFight(..., { gauge: true })`): it adds the forecast boil-over to its scoring, so it will not end a round with a member in a cloud when the gauge would boil (-30 per HP lost, -200 for a down), and it values a forecast boil-over that hits foes (+10 per HP, +20 for a kill), which is the "brew on purpose" case. "Party hits" is members stormed per fight; "1st boil rd" is the median round of a fight's first boil-over (fights with none are left out).

| room | layout | heat | blind win | blind boil/fight | blind party hits | blind 1st boil rd | gauge win | gauge boil/fight | gauge party hits | gauge 1st boil rd |
|---|---|---|---|---|---|---|---|---|---|---|
| The changing hall | The changing hall | 1 | 20/20 | 0.0 | 0.0 | - | 20/20 | 0.0 | 0.0 | - |
| The changing hall | The scrubbing floor | 1 | 20/20 | 0.0 | 0.0 | - | 20/20 | 0.0 | 0.0 | - |
| The changing hall | The tepidarium | 1 | 20/20 | 0.1 | 0.1 | 4 | 20/20 | 0.1 | 0.0 | 4 |
| The steam gallery | The steam gallery | 2 | 20/20 | 0.3 | 0.0 | 3 | 20/20 | 0.3 | 0.0 | 3 |
| The steam gallery | The laundry | 2 | 20/20 | 0.3 | 0.2 | 3 | 20/20 | 0.3 | 0.0 | 3 |
| The steam gallery | The boiler passage | 2 | 20/20 | 0.3 | 0.1 | 3 | 20/20 | 0.3 | 0.0 | 3 |
| The long pools | The frigidarium | 3 | 20/20 | 1.0 | 0.1 | 4 | 20/20 | 1.0 | 0.0 | 4 |
| The long pools | The long pool hall | 3 | 20/20 | 1.0 | 0.5 | 3 | 20/20 | 1.0 | 0.0 | 3 |
| The long pools | The mosaic court | 3 | 20/20 | 0.8 | 0.2 | 3 | 20/20 | 0.8 | 0.0 | 3 |
| The caldarium | The great caldarium | 4 | 20/20 | 1.0 | 0.0 | 3 | 20/20 | 1.0 | 0.0 | 3 |
| The caldarium | The sudatorium | 4 | 20/20 | 1.1 | 0.4 | 3 | 20/20 | 1.3 | 0.0 | 3 |
| The caldarium | The hot springs | 4 | 20/20 | 1.1 | 0.0 | 3 | 20/20 | 1.1 | 0.0 | 3 |
| The steward's caldarium | layout 1 | 4 | 20/20 | 2.0 | 1.6 | 2 | 20/20 | 2.0 | 0.4 | 2 |
| The steward's caldarium | layout 2 | 4 | 20/20 | 2.2 | 2.3 | 2 | 20/20 | 2.0 | 0.3 | 2 |
| The steward's caldarium | layout 3 | 4 | 20/20 | 2.0 | 1.8 | 2 | 20/20 | 2.1 | 0.6 | 2 |

### Reading against §6 (for the end-of-build calibration, nothing changed)

- **Win rate: every room 100% for both bots, above the band.** The plan wants rooms within 10 points of the canal rooms at the same depth and hearts lower by design; at party size 2 with fresh HP the bot never loses, so the rooms (the heart included) are easier than the canals. Candidate for the end: raise foe numbers, or measure with trip-worn HP rather than fresh.
- **Boil-overs per fight: rooms 1-2 at 0-0.4 and room 3-4 at about 1 are inside "at most one in a median fight at heat 1-2".** The heart boils twice a fight and first on round 2, which breaks "no room where the median fight boils over before round 3". The Steward's stoke (+4 pips) is the likely cause. Candidate: a smaller stoke or a later first stoke.
- **Both outcomes occur** (boil-over wins or loses): the boil-over often wins fights (it storms foes), but with 100% wins no fight is lost to it. The blind bot stormed its own party 0.4-2.3 times a heart fight; the gauge bot cuts that to 0.3-0.6 and to 0.0 in rooms 1-4 beyond the tepidarium. Caveat: the gauge bot's brew-on-purpose term rarely changes the boil count (the heat tables fill mostly from vents and foe-side steam), so "boil-overs per fight" is unchanged between the bots.

## Release (BH-18)

The district is open: `BATHHOUSES_KIT` carries rooms 1-4 (`BATH_ROOMS_12` + `BATH_ROOMS_34`) and the heart (`BATH_HEART`) with each room's ledger entry as `lore`, `gate: threshold` on the dome, the towel-bearer's `recruit` and `recruitPages` (`BATH_RECRUIT_KIT`), and it is in `PLAYABLE_DISTRICTS`. The threshold battle now lists the rules its spec names (`src/app/threshold.ts::thresholdStart`; before, the dome's gauge never appeared in the app). The stand-in Steward was deleted in BH-17b; the real rival plays the heart.

Not wired: `intrusion: BATH_INTRUSION`. The lower Seam's `checkFloor` (`lowerSeam.ts::carriesIntrusion`) accepts only a piece the intrusion brings or a terrain read by one of its piece-scoped rules, and nothing piece-scoped reads the vent (the boil-over rule is district-scoped, P9). Fix, Seam owner's call: let `IntrusionSpec` name a `terrain` flag (`vent`) that `carriesIntrusion` accepts. Until then the lower Seam has no bathhouse floors (the plan's P12 is open).

### §6 checklist

| Check | Result | Evidence |
|---|---|---|
| Scenarios: gauge at each heat, boil-over (shields, immunity, deaths, chain), forecast = result | pass | `tests/districts/bathhouses/boil-over.test.ts` (fill per heat, boil at cap, shielded, downed, towel-bearer, last foe, forecast through End turn) |
| Bather movement and pass-through; attendant heading and crush; boilerman; Steward dodge, re-form, cut | pass | `dissolved.test.ts`, `foes.test.ts`, `heart.test.ts`, `tests/rivals/bathSteward.test.ts` |
| A Steam Room performed in a bathhouse room: idiom fires, fight then boils | not checked | no scenario found by name; the gauge counts every cloud kind (`boil-over.test.ts`), which covers the mechanism |
| Plunge across save/load and a wipe | pass | `plunge.test.ts` (save/load, wipe drops it) |
| Hearing meet and narrow miss | pass | `tests/data/bathhouse-lore.test.ts`, DK-8 hearing entry |
| Threshold solved from every start | pass | `tests/data/bathhouse-threshold.test.ts`; app lists the gauge (`release.test.ts`) |
| Fuzz/bot: never stranded, heat parses back, trip state survives saves, fights terminate, 500-event cap | partial | `release.test.ts` plays four seeded whole trips (heat 1,2,3,4,4, clears, hearts); `trip.test.ts` covers heat/saves; fights terminate in the calibration sim; the generic fuzz does not yet include the district; no 500-cap bathhouse test |
| Same seed, same boil-over | pass | calibration is seeded; boil-over is deterministic in `boil-over.test.ts` |
| Bot: win rate within ±10 of canal rooms; heart lower | FAIL (out of band, not tuned) | 100% everywhere, see Calibration above |
| Bot: at most one boil-over in a median fight at heat 1-2; no median boil before round 3 | partial | heat 1-2 pass (0-0.4); heart's first boil is round 2 and in the phone check the heart forecast a full 12-pip boil in round 1 (the Steward's steam hall); recorded |
| Both outcomes (boil-over wins or loses a fight) occur | partial | boil-over often wins; none lost at 100% win rate |
| Phone: gauge strip, 7x9 board, three members, forecast, light and dark | pass (BH-12) | BH-12 shots; dark not rechecked here |
| Phone: bather dissolved and solid; attendant telegraph and crush | pass (BH-14) | `bh14-*.jpg` in `bathhouses-evidence/` |
| Phone: plunge card on the loot screen | pass | `bh18-plunge-card.jpg` (stakes "heat 2 to 1, your only pick" read before the pick) |
| Phone: Crossroads with heat copy | pass | `bh18-crossroads-heat.jpg` ("Next hall: heat 1, cooled by the plunge"); before the heart "as hot as it gets: heat 4" |
| Phone: the dome threshold | pass | `bh18-map-threshold.jpg`, `bh18-dome.jpg` (gauge strip, "Pressure 0 to 1") |
| Phone: map caption | pass | barred caption and "Try the lock" button on the map; opened node after solving (no bath art for `bath-dome`: generic solved tick) |
| Phone: footnote margins for the five subjects | pass (FU-12) | Desk at 375x812 with Vat, Seep, Steep, Bath salt, Fog jar each opened: no horizontal overflow, text wraps inside the frames, nothing clipped. Only the capstone frame showed (a synthetic save at 80 points, nothing written); the line slots were not seen. No layout fix needed. Also FU-11: the meter row sits 14px under board row 9 (Lab room 7x9, heat 4), no overlap |
| Svelte autofixer | n/a | no `.svelte` file changed |
| `pnpm check` | see Full check | |
| Golden fixtures unchanged | pass | check green |

### Full-loop phone check (375x812)

Map (heard, barred, "Try the lock") -> dome (gauge listed; `bh18-dome.jpg`) -> solved node on the map -> Set out sheet -> room 1 fight with the gauge (`bh18-room1-gauge.jpg`: pressure 0 to 4 forecast, vent warning ring, Feed tag) -> plunge card -> Crossroads with heat -> heart (`bh18-heart-steward.jpg`: Bath-Steward 14/14, "Steam hall" intent, forecast boil banner, Pressure 0 to 12, Next round pill, End turn confirm). No horizontal overflow (375/375), no console errors. Rooms 2-4 and the loot between them were driven by the engine (`release.test.ts` and a generated save), not tapped through; the dome was not played to a win in the browser (the unit test solves it).

### Out-of-band numbers (recorded, not tuned)

- Win rate 100% in every room for both bots (calibration above): easier than the canals.
- Heart: first boil round 2 in the sim; in the browser the opening forecast already reads Pressure 0 to 12 with the party outside the steam. The stoke and steam hall need to be smaller or later (end-of-build lever).
- Heart at full party HP with trip-worn HP unmeasured.

### Findings

- `Try the lock` is the shared map button label for every threshold district; it reads oddly for the dome.
- The heart's room id `bath-caldarium` duplicates room 4's `bath-caldarium` (heart title "The steward's caldarium"); integrity tests pass but a per-id lookup would collide.
- `intrusion` unwired (above).

### Rows for the orchestrator

- **DESIGN §11:** "Bathhouses open (BH-18). The dome (fill it with steam to the line) is the gate; rooms 1-4 and the Bath-Steward's heart are playable; the towel-bearer's landmark is in room 3. The steam-vent floor in the lower Seam (P12) is built but unwired until the floor check accepts a terrain."
- **TECH §7:** "Threshold battles list the rules their `ThresholdSpec` names (`thresholdStart`), so a district gauge appears in its gate room. `PLAYABLE_DISTRICTS` gains `bathhouses`. `lowerSeam.carriesIntrusion` only accepts pieces and rule-read terrain; vents need an `IntrusionSpec.terrain`."
- **ROADMAP:** done: BH-18 release. New items: wire the bathhouse floor (Seam owner: `IntrusionSpec.terrain`); calibration (win rates 100%, heart boils from round 1-2); per-threshold button label ("Try the lock"); give the heart a unique room id; bath-dome solved art; footnote margins phone check.
