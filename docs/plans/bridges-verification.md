# Bridges verification (BR-21)

## Authored calibration (CAL-3, BR-21)

Reproduce with `BRIDGES_TABLE=1 BRIDGES_OUT=/tmp/cal-3-bridges.md pnpm vitest run tests/sim/bridges-calibration.test.ts --reporter=dot`.
The three shared opening layouts precede the first span choice. Fresh rows at each later depth
combine equally sampled layouts from that span's authored pool. Worn rows carry HP and charges
through live loot and onward flow. Falls in the CAL-3 table count apprentices removed by a fall.
Wins, losses, round-limit stalls and action-budget stops are recorded separately. The Chief HP is
read from the actual spawned rival.

### Twelve-seed authored baseline

The aware fresh solo stalled in 12/12 sound hearts and 11/12 crumbling hearts, winning the
remaining crumbling fight. The fresh pair won 12/12 per heart. The worn pair stalled nine
times in 12 sound room-3 fights. At the heart it stalled in the one sound fight reached and
six of seven crumbling fights, with one loss on crumbling. The worn trio reached all 24
hearts and won 3/12 on sound (nine stalls) and 12/12 on crumbling. It averaged 0.17 and
0.08 member falls per heart fight respectively. CAL-B's first eight solo heart seeds
stalled with either Hold setting, consistent with the small number of clears here.

Seeds 1–12, 40 rounds, 600 applied actions, full starter-lattice bot. Aware uses gauge + cracks. Blind uses neither. Hold is off in both. Worn trips carry actual HP and charges, take the first loot and leave the doorway unchanged; cooled trips prioritize the cold plunge. Opening bridge layouts precede the first span choice.

| party | policy | state | depth | span | wins/fights | losses | stalls | budget | member falls/fight | entry HP | Chief HP |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | aware | fresh | 1 | opening | 36/36 | 0 | 0 | 0 | 0.00 | 6.00 | — |
| 1 | aware | fresh | 2 | sound | 20/24 | 0 | 4 | 0 | 0.00 | 6.00 | — |
| 1 | aware | fresh | 3 | sound | 14/24 | 0 | 10 | 0 | 0.00 | 6.00 | — |
| 1 | aware | fresh | 4 | sound | 20/24 | 0 | 4 | 0 | 0.00 | 6.00 | — |
| 1 | aware | fresh | 5 | sound | 0/12 | 0 | 12 | 0 | 0.00 | 6.00 | 10 |
| 1 | aware | trip-worn | 1 | sound | 12/12 | 0 | 0 | 0 | 0.00 | 6.00 | — |
| 1 | aware | trip-worn | 2 | sound | 7/12 | 0 | 5 | 0 | 0.00 | 6.00 | — |
| 1 | aware | trip-worn | 3 | sound | 4/7 | 0 | 3 | 0 | 0.00 | 6.00 | — |
| 1 | aware | trip-worn | 4 | sound | 4/4 | 0 | 0 | 0 | 0.00 | 6.00 | — |
| 1 | aware | trip-worn | 5 | sound | 0/4 | 0 | 4 | 0 | 0.00 | 6.00 | 10 |
| 1 | aware | fresh | 2 | crumbling | 24/24 | 0 | 0 | 0 | 0.00 | 6.00 | — |
| 1 | aware | fresh | 3 | crumbling | 24/24 | 0 | 0 | 0 | 0.00 | 6.00 | — |
| 1 | aware | fresh | 4 | crumbling | 24/24 | 0 | 0 | 0 | 0.00 | 6.00 | — |
| 1 | aware | fresh | 5 | crumbling | 1/12 | 0 | 11 | 0 | 0.00 | 6.00 | 10 |
| 1 | aware | trip-worn | 1 | crumbling | 12/12 | 0 | 0 | 0 | 0.00 | 6.00 | — |
| 1 | aware | trip-worn | 2 | crumbling | 8/12 | 0 | 4 | 0 | 0.00 | 6.00 | — |
| 1 | aware | trip-worn | 3 | crumbling | 6/8 | 0 | 2 | 0 | 0.00 | 6.00 | — |
| 1 | aware | trip-worn | 4 | crumbling | 0/6 | 0 | 6 | 0 | 0.00 | 6.00 | — |
| 1 | aware | trip-worn | 5 | crumbling | 0/0 | 0 | 0 | 0 | — | — | — |
| 1 | blind | fresh | 1 | opening | 36/36 | 0 | 0 | 0 | 0.00 | 6.00 | — |
| 1 | blind | fresh | 2 | sound | 20/24 | 0 | 4 | 0 | 0.00 | 6.00 | — |
| 1 | blind | fresh | 3 | sound | 14/24 | 0 | 10 | 0 | 0.00 | 6.00 | — |
| 1 | blind | fresh | 4 | sound | 20/24 | 0 | 4 | 0 | 0.00 | 6.00 | — |
| 1 | blind | fresh | 5 | sound | 0/12 | 0 | 12 | 0 | 0.00 | 6.00 | 10 |
| 1 | blind | trip-worn | 1 | sound | 12/12 | 0 | 0 | 0 | 0.00 | 6.00 | — |
| 1 | blind | trip-worn | 2 | sound | 7/12 | 0 | 5 | 0 | 0.00 | 6.00 | — |
| 1 | blind | trip-worn | 3 | sound | 4/7 | 0 | 3 | 0 | 0.00 | 6.00 | — |
| 1 | blind | trip-worn | 4 | sound | 2/4 | 2 | 0 | 0 | 0.50 | 6.00 | — |
| 1 | blind | trip-worn | 5 | sound | 0/2 | 0 | 2 | 0 | 0.00 | 6.00 | 10 |
| 1 | blind | fresh | 2 | crumbling | 24/24 | 0 | 0 | 0 | 0.00 | 6.00 | — |
| 1 | blind | fresh | 3 | crumbling | 24/24 | 0 | 0 | 0 | 0.00 | 6.00 | — |
| 1 | blind | fresh | 4 | crumbling | 23/24 | 1 | 0 | 0 | 0.04 | 6.00 | — |
| 1 | blind | fresh | 5 | crumbling | 1/12 | 0 | 11 | 0 | 0.00 | 6.00 | 10 |
| 1 | blind | trip-worn | 1 | crumbling | 12/12 | 0 | 0 | 0 | 0.00 | 6.00 | — |
| 1 | blind | trip-worn | 2 | crumbling | 8/12 | 0 | 4 | 0 | 0.00 | 6.00 | — |
| 1 | blind | trip-worn | 3 | crumbling | 6/8 | 0 | 2 | 0 | 0.00 | 6.00 | — |
| 1 | blind | trip-worn | 4 | crumbling | 0/6 | 0 | 6 | 0 | 0.00 | 6.00 | — |
| 1 | blind | trip-worn | 5 | crumbling | 0/0 | 0 | 0 | 0 | — | — | — |
| 2 | aware | fresh | 1 | opening | 36/36 | 0 | 0 | 0 | 0.00 | 14.00 | — |
| 2 | aware | fresh | 2 | sound | 24/24 | 0 | 0 | 0 | 0.00 | 14.00 | — |
| 2 | aware | fresh | 3 | sound | 24/24 | 0 | 0 | 0 | 0.00 | 14.00 | — |
| 2 | aware | fresh | 4 | sound | 24/24 | 0 | 0 | 0 | 0.00 | 14.00 | — |
| 2 | aware | fresh | 5 | sound | 12/12 | 0 | 0 | 0 | 0.00 | 14.00 | 10 |
| 2 | aware | trip-worn | 1 | sound | 12/12 | 0 | 0 | 0 | 0.00 | 14.00 | — |
| 2 | aware | trip-worn | 2 | sound | 12/12 | 0 | 0 | 0 | 0.00 | 13.75 | — |
| 2 | aware | trip-worn | 3 | sound | 3/12 | 0 | 9 | 0 | 0.00 | 13.42 | — |
| 2 | aware | trip-worn | 4 | sound | 1/3 | 0 | 2 | 0 | 0.00 | 12.67 | — |
| 2 | aware | trip-worn | 5 | sound | 0/1 | 0 | 1 | 0 | 0.00 | 13.00 | 10 |
| 2 | aware | fresh | 2 | crumbling | 24/24 | 0 | 0 | 0 | 0.00 | 14.00 | — |
| 2 | aware | fresh | 3 | crumbling | 24/24 | 0 | 0 | 0 | 0.00 | 14.00 | — |
| 2 | aware | fresh | 4 | crumbling | 24/24 | 0 | 0 | 0 | 0.00 | 14.00 | — |
| 2 | aware | fresh | 5 | crumbling | 12/12 | 0 | 0 | 0 | 0.00 | 14.00 | 10 |
| 2 | aware | trip-worn | 1 | crumbling | 12/12 | 0 | 0 | 0 | 0.00 | 14.00 | — |
| 2 | aware | trip-worn | 2 | crumbling | 12/12 | 0 | 0 | 0 | 0.00 | 13.75 | — |
| 2 | aware | trip-worn | 3 | crumbling | 12/12 | 0 | 0 | 0 | 0.00 | 13.75 | — |
| 2 | aware | trip-worn | 4 | crumbling | 7/12 | 0 | 5 | 0 | 0.00 | 13.67 | — |
| 2 | aware | trip-worn | 5 | crumbling | 0/7 | 1 | 6 | 0 | 0.14 | 13.71 | 10 |
| 2 | blind | fresh | 1 | opening | 36/36 | 0 | 0 | 0 | 0.00 | 14.00 | — |
| 2 | blind | fresh | 2 | sound | 24/24 | 0 | 0 | 0 | 0.00 | 14.00 | — |
| 2 | blind | fresh | 3 | sound | 24/24 | 0 | 0 | 0 | 0.00 | 14.00 | — |
| 2 | blind | fresh | 4 | sound | 24/24 | 0 | 0 | 0 | 0.00 | 14.00 | — |
| 2 | blind | fresh | 5 | sound | 12/12 | 0 | 0 | 0 | 0.00 | 14.00 | 10 |
| 2 | blind | trip-worn | 1 | sound | 12/12 | 0 | 0 | 0 | 0.00 | 14.00 | — |
| 2 | blind | trip-worn | 2 | sound | 12/12 | 0 | 0 | 0 | 0.00 | 13.75 | — |
| 2 | blind | trip-worn | 3 | sound | 3/12 | 0 | 9 | 0 | 0.00 | 13.42 | — |
| 2 | blind | trip-worn | 4 | sound | 1/3 | 0 | 2 | 0 | 0.00 | 12.67 | — |
| 2 | blind | trip-worn | 5 | sound | 0/1 | 0 | 1 | 0 | 0.00 | 13.00 | 10 |
| 2 | blind | fresh | 2 | crumbling | 24/24 | 0 | 0 | 0 | 0.00 | 14.00 | — |
| 2 | blind | fresh | 3 | crumbling | 24/24 | 0 | 0 | 0 | 0.00 | 14.00 | — |
| 2 | blind | fresh | 4 | crumbling | 24/24 | 0 | 0 | 0 | 0.08 | 14.00 | — |
| 2 | blind | fresh | 5 | crumbling | 9/12 | 0 | 3 | 0 | 0.25 | 14.00 | 10 |
| 2 | blind | trip-worn | 1 | crumbling | 12/12 | 0 | 0 | 0 | 0.00 | 14.00 | — |
| 2 | blind | trip-worn | 2 | crumbling | 12/12 | 0 | 0 | 0 | 0.00 | 13.75 | — |
| 2 | blind | trip-worn | 3 | crumbling | 12/12 | 0 | 0 | 0 | 0.00 | 13.75 | — |
| 2 | blind | trip-worn | 4 | crumbling | 7/12 | 0 | 5 | 0 | 0.00 | 13.67 | — |
| 2 | blind | trip-worn | 5 | crumbling | 0/7 | 1 | 6 | 0 | 0.14 | 13.71 | 10 |
| 3 | aware | fresh | 1 | opening | 36/36 | 0 | 0 | 0 | 0.00 | 20.00 | — |
| 3 | aware | fresh | 2 | sound | 24/24 | 0 | 0 | 0 | 0.00 | 20.00 | — |
| 3 | aware | fresh | 3 | sound | 24/24 | 0 | 0 | 0 | 0.00 | 20.00 | — |
| 3 | aware | fresh | 4 | sound | 24/24 | 0 | 0 | 0 | 0.00 | 20.00 | — |
| 3 | aware | fresh | 5 | sound | 12/12 | 0 | 0 | 0 | 0.00 | 20.00 | 10 |
| 3 | aware | trip-worn | 1 | sound | 12/12 | 0 | 0 | 0 | 0.00 | 20.00 | — |
| 3 | aware | trip-worn | 2 | sound | 12/12 | 0 | 0 | 0 | 0.00 | 19.75 | — |
| 3 | aware | trip-worn | 3 | sound | 12/12 | 0 | 0 | 0 | 0.00 | 19.42 | — |
| 3 | aware | trip-worn | 4 | sound | 12/12 | 0 | 0 | 0 | 0.00 | 18.92 | — |
| 3 | aware | trip-worn | 5 | sound | 3/12 | 0 | 9 | 0 | 0.17 | 18.67 | 10 |
| 3 | aware | fresh | 2 | crumbling | 24/24 | 0 | 0 | 0 | 0.00 | 20.00 | — |
| 3 | aware | fresh | 3 | crumbling | 24/24 | 0 | 0 | 0 | 0.00 | 20.00 | — |
| 3 | aware | fresh | 4 | crumbling | 24/24 | 0 | 0 | 0 | 0.00 | 20.00 | — |
| 3 | aware | fresh | 5 | crumbling | 12/12 | 0 | 0 | 0 | 0.00 | 20.00 | 10 |
| 3 | aware | trip-worn | 1 | crumbling | 12/12 | 0 | 0 | 0 | 0.00 | 20.00 | — |
| 3 | aware | trip-worn | 2 | crumbling | 12/12 | 0 | 0 | 0 | 0.00 | 19.75 | — |
| 3 | aware | trip-worn | 3 | crumbling | 12/12 | 0 | 0 | 0 | 0.00 | 19.75 | — |
| 3 | aware | trip-worn | 4 | crumbling | 12/12 | 0 | 0 | 0 | 0.00 | 19.67 | — |
| 3 | aware | trip-worn | 5 | crumbling | 12/12 | 0 | 0 | 0 | 0.08 | 19.67 | 10 |
| 3 | blind | fresh | 1 | opening | 36/36 | 0 | 0 | 0 | 0.00 | 20.00 | — |
| 3 | blind | fresh | 2 | sound | 24/24 | 0 | 0 | 0 | 0.00 | 20.00 | — |
| 3 | blind | fresh | 3 | sound | 24/24 | 0 | 0 | 0 | 0.00 | 20.00 | — |
| 3 | blind | fresh | 4 | sound | 24/24 | 0 | 0 | 0 | 0.00 | 20.00 | — |
| 3 | blind | fresh | 5 | sound | 12/12 | 0 | 0 | 0 | 0.00 | 20.00 | 10 |
| 3 | blind | trip-worn | 1 | sound | 12/12 | 0 | 0 | 0 | 0.00 | 20.00 | — |
| 3 | blind | trip-worn | 2 | sound | 12/12 | 0 | 0 | 0 | 0.00 | 19.75 | — |
| 3 | blind | trip-worn | 3 | sound | 12/12 | 0 | 0 | 0 | 0.00 | 19.42 | — |
| 3 | blind | trip-worn | 4 | sound | 12/12 | 0 | 0 | 0 | 0.00 | 18.92 | — |
| 3 | blind | trip-worn | 5 | sound | 3/12 | 0 | 9 | 0 | 0.17 | 18.67 | 10 |
| 3 | blind | fresh | 2 | crumbling | 24/24 | 0 | 0 | 0 | 0.00 | 20.00 | — |
| 3 | blind | fresh | 3 | crumbling | 24/24 | 0 | 0 | 0 | 0.00 | 20.00 | — |
| 3 | blind | fresh | 4 | crumbling | 24/24 | 0 | 0 | 0 | 0.08 | 20.00 | — |
| 3 | blind | fresh | 5 | crumbling | 12/12 | 0 | 0 | 0 | 0.25 | 20.00 | 10 |
| 3 | blind | trip-worn | 1 | crumbling | 12/12 | 0 | 0 | 0 | 0.00 | 20.00 | — |
| 3 | blind | trip-worn | 2 | crumbling | 12/12 | 0 | 0 | 0 | 0.00 | 19.75 | — |
| 3 | blind | trip-worn | 3 | crumbling | 12/12 | 0 | 0 | 0 | 0.00 | 19.75 | — |
| 3 | blind | trip-worn | 4 | crumbling | 12/12 | 0 | 0 | 0 | 0.08 | 19.67 | — |
| 3 | blind | trip-worn | 5 | crumbling | 12/12 | 0 | 0 | 0 | 0.08 | 19.08 | 10 |

<details><summary>12-seed run output for the original trip and fuzz tests</summary>

```text
party 1 sound: cleared 0/12 | r1 12/12 fall 0.0 rd 4.0 | r2 7/12 fall 0.0 rd 17.3 | r3 4/7 fall 0.0 rd 19.9 | r4 4/4 fall 0.3 rd 8.5 | r5 0/4 fall 0.0 rd 31.0 | boards 9
party 1 crumbling: cleared 0/12 | r1 12/12 fall 0.0 rd 4.0 | r2 8/12 fall 0.0 rd 12.8 | r3 6/8 fall 0.0 rd 11.3 | r4 0/6 fall 0.0 rd 31.0 | boards 9
party 2 sound: cleared 0/12 | r1 12/12 fall 0.0 rd 2.3 | r2 12/12 fall 0.0 rd 2.8 | r3 3/12 fall 0.0 rd 23.9 | r4 1/3 fall 0.0 rd 22.0 | r5 0/1 fall 0.0 rd 31.0 | boards 10
party 2 crumbling: cleared 0/12 | r1 12/12 fall 0.0 rd 2.3 | r2 12/12 fall 0.0 rd 2.0 | r3 12/12 fall 0.0 rd 2.0 | r4 7/12 fall 0.2 rd 14.1 | r5 0/7 fall 0.1 rd 27.4 | boards 10
party 3 sound: cleared 3/12 | r1 12/12 fall 0.0 rd 2.2 | r2 12/12 fall 0.0 rd 2.5 | r3 12/12 fall 0.0 rd 2.8 | r4 12/12 fall 0.0 rd 3.2 | r5 3/12 fall 0.2 rd 24.7 | boards 10
party 3 crumbling: cleared 12/12 | r1 12/12 fall 0.0 rd 2.2 | r2 12/12 fall 0.0 rd 1.8 | r3 12/12 fall 0.0 rd 1.8 | r4 12/12 fall 0.0 rd 1.8 | r5 12/12 fall 0.1 rd 4.5 | boards 10
falls: reading 3, blind 3
boards fuzzed: 17
5x7 The hanging stair
5x7 The sentry's stair
5x7 The thin arch
6x6 The last ledge
6x7 The lantern ledge
6x7 The loose span
6x7 The thin arch
6x9 The chalk walk
6x9 The first arch
6x9 The long stair
6x9 The split span
6x9 The two arches
7x9 The broken run
7x9 The gatehouse span
7x9 The great arch
7x9 The long arcade
7x9 The tall arcade
```

</details>

### Shared CAL-0 check at 50 seeds

The aware fresh pair won 100/100 room-4 fights and 50/50 hearts on each span. The fresh solo
stalled 50/50 times on sound and 32/50 on crumbling, with 18 crumbling wins. The worn pair
stalled in 34/50 sound room-3 fights. At the heart it stalled 6/6 times on sound and 17/21 times
on crumbling, with four crumbling losses. The worn trio won 11/50 sound hearts (37 stalls,
two losses) and 50/50 crumbling hearts. The pair is the fresh comparison for the unresolved P2
band. The 12-seed authored table above records member falls.

<details><summary>50-seed shared authored bridge table</summary>

Seeds 1–50; rounds 40; applied-action budget 600; starter lattices; greedy gauge+cracks; lite=false; first loot, onward, doorway unchanged; trip guard 60.

| party | axis | state | depth | layout | wins/reached | win % | reached/attempted | stalls | budget stops | mean rounds | entry HP | entry charges | entry bells |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | sound | fresh | 1 | The first arch | 50/50 | 100.0 | 50/50 | 0 | 0 | 4.0 | 6.0 | 5.0 | 0.0 |
| 1 | sound | fresh | 1 | The long stair | 50/50 | 100.0 | 50/50 | 0 | 0 | 4.0 | 6.0 | 5.0 | 0.0 |
| 1 | sound | fresh | 1 | The broken run | 50/50 | 100.0 | 50/50 | 0 | 0 | 4.0 | 6.0 | 5.0 | 0.0 |
| 1 | sound | fresh | 2 | The long arcade | 40/50 | 80.0 | 50/50 | 10 | 0 | 12.5 | 6.0 | 5.0 | 0.0 |
| 1 | sound | fresh | 2 | The two arches | 43/50 | 86.0 | 50/50 | 7 | 0 | 10.1 | 6.0 | 5.0 | 0.0 |
| 1 | sound | fresh | 3 | The gatehouse span | 5/50 | 10.0 | 50/50 | 45 | 0 | 37.4 | 6.0 | 5.0 | 0.0 |
| 1 | sound | fresh | 3 | The chalk walk | 50/50 | 100.0 | 50/50 | 0 | 0 | 5.7 | 6.0 | 5.0 | 0.0 |
| 1 | sound | fresh | 4 | The tall arcade | 31/50 | 62.0 | 50/50 | 19 | 0 | 20.1 | 6.0 | 5.0 | 0.0 |
| 1 | sound | fresh | 4 | The split span | 50/50 | 100.0 | 50/50 | 0 | 0 | 5.3 | 6.0 | 5.0 | 0.0 |
| 1 | sound | fresh | 5 | The great arch | 0/50 | 0.0 | 50/50 | 50 | 0 | 41.0 | 6.0 | 5.0 | 0.0 |
| 1 | sound | trip-worn | 1 | The first arch | 15/15 | 100.0 | 15/50 | 0 | 0 | 4.0 | 6.0 | 5.0 | 0.0 |
| 1 | sound | trip-worn | 1 | The long stair | 20/20 | 100.0 | 20/50 | 0 | 0 | 4.0 | 6.0 | 5.0 | 0.0 |
| 1 | sound | trip-worn | 1 | The broken run | 15/15 | 100.0 | 15/50 | 0 | 0 | 4.0 | 6.0 | 5.0 | 0.0 |
| 1 | sound | trip-worn | 2 | The long arcade | 10/27 | 37.0 | 27/50 | 17 | 0 | 28.5 | 6.0 | 1.5 | 0.0 |
| 1 | sound | trip-worn | 2 | The two arches | 18/23 | 78.3 | 23/50 | 5 | 0 | 13.3 | 6.0 | 1.9 | 0.0 |
| 1 | sound | trip-worn | 2 | The loose span UNREACHED | 0/0 | — | 0/50 | 0 | 0 | — | — | — | — |
| 1 | sound | trip-worn | 2 | The hanging stair UNREACHED | 0/0 | — | 0/50 | 0 | 0 | — | — | — | — |
| 1 | sound | trip-worn | 3 | The gatehouse span | 13/17 | 76.5 | 17/50 | 4 | 0 | 18.0 | 6.0 | 0.0 | 0.0 |
| 1 | sound | trip-worn | 3 | The chalk walk | 2/11 | 18.2 | 11/50 | 9 | 0 | 35.1 | 6.0 | 0.1 | 0.0 |
| 1 | sound | trip-worn | 3 | The sentry's stair UNREACHED | 0/0 | — | 0/50 | 0 | 0 | — | — | — | — |
| 1 | sound | trip-worn | 3 | The lantern ledge UNREACHED | 0/0 | — | 0/50 | 0 | 0 | — | — | — | — |
| 1 | sound | trip-worn | 4 | The tall arcade | 10/11 | 90.9 | 11/50 | 1 | 0 | 11.9 | 6.0 | 0.0 | 0.0 |
| 1 | sound | trip-worn | 4 | The split span | 0/4 | 0.0 | 4/50 | 4 | 0 | 41.0 | 6.0 | 0.0 | 0.0 |
| 1 | sound | trip-worn | 4 | The thin arch UNREACHED | 0/0 | — | 0/50 | 0 | 0 | — | — | — | — |
| 1 | sound | trip-worn | 4 | The last ledge UNREACHED | 0/0 | — | 0/50 | 0 | 0 | — | — | — | — |
| 1 | sound | trip-worn | 5 | The great arch | 0/10 | 0.0 | 10/50 | 10 | 0 | 41.0 | 6.0 | 0.0 | 0.0 |
| 1 | sound | trip-worn | 5 | The thin arch UNREACHED | 0/0 | — | 0/50 | 0 | 0 | — | — | — | — |
| 1 | crumbling | fresh | 2 | The loose span | 50/50 | 100.0 | 50/50 | 0 | 0 | 4.0 | 6.0 | 5.0 | 0.0 |
| 1 | crumbling | fresh | 2 | The hanging stair | 50/50 | 100.0 | 50/50 | 0 | 0 | 3.5 | 6.0 | 5.0 | 0.0 |
| 1 | crumbling | fresh | 3 | The sentry's stair | 50/50 | 100.0 | 50/50 | 0 | 0 | 3.6 | 6.0 | 5.0 | 0.0 |
| 1 | crumbling | fresh | 3 | The lantern ledge | 50/50 | 100.0 | 50/50 | 0 | 0 | 3.6 | 6.0 | 5.0 | 0.0 |
| 1 | crumbling | fresh | 4 | The thin arch | 50/50 | 100.0 | 50/50 | 0 | 0 | 4.0 | 6.0 | 5.0 | 0.0 |
| 1 | crumbling | fresh | 4 | The last ledge | 50/50 | 100.0 | 50/50 | 0 | 0 | 4.0 | 6.0 | 5.0 | 0.0 |
| 1 | crumbling | fresh | 5 | The thin arch | 18/50 | 36.0 | 50/50 | 32 | 0 | 28.4 | 6.0 | 5.0 | 0.0 |
| 1 | crumbling | trip-worn | 1 | The first arch | 15/15 | 100.0 | 15/50 | 0 | 0 | 4.0 | 6.0 | 5.0 | 0.0 |
| 1 | crumbling | trip-worn | 1 | The long stair | 20/20 | 100.0 | 20/50 | 0 | 0 | 4.0 | 6.0 | 5.0 | 0.0 |
| 1 | crumbling | trip-worn | 1 | The broken run | 15/15 | 100.0 | 15/50 | 0 | 0 | 4.0 | 6.0 | 5.0 | 0.0 |
| 1 | crumbling | trip-worn | 2 | The long arcade UNREACHED | 0/0 | — | 0/50 | 0 | 0 | — | — | — | — |
| 1 | crumbling | trip-worn | 2 | The two arches UNREACHED | 0/0 | — | 0/50 | 0 | 0 | — | — | — | — |
| 1 | crumbling | trip-worn | 2 | The loose span | 11/27 | 40.7 | 27/50 | 16 | 0 | 26.1 | 6.0 | 1.5 | 0.0 |
| 1 | crumbling | trip-worn | 2 | The hanging stair | 23/23 | 100.0 | 23/50 | 0 | 0 | 3.1 | 6.0 | 1.9 | 0.0 |
| 1 | crumbling | trip-worn | 3 | The gatehouse span UNREACHED | 0/0 | — | 0/50 | 0 | 0 | — | — | — | — |
| 1 | crumbling | trip-worn | 3 | The chalk walk UNREACHED | 0/0 | — | 0/50 | 0 | 0 | — | — | — | — |
| 1 | crumbling | trip-worn | 3 | The sentry's stair | 9/19 | 47.4 | 19/50 | 10 | 0 | 24.1 | 6.0 | 0.2 | 0.0 |
| 1 | crumbling | trip-worn | 3 | The lantern ledge | 14/15 | 93.3 | 15/50 | 1 | 0 | 5.5 | 6.0 | 0.1 | 0.0 |
| 1 | crumbling | trip-worn | 4 | The tall arcade UNREACHED | 0/0 | — | 0/50 | 0 | 0 | — | — | — | — |
| 1 | crumbling | trip-worn | 4 | The split span UNREACHED | 0/0 | — | 0/50 | 0 | 0 | — | — | — | — |
| 1 | crumbling | trip-worn | 4 | The thin arch | 0/16 | 0.0 | 16/50 | 16 | 0 | 41.0 | 6.0 | 0.0 | 0.0 |
| 1 | crumbling | trip-worn | 4 | The last ledge | 0/7 | 0.0 | 7/50 | 7 | 0 | 41.0 | 6.0 | 0.0 | 0.0 |
| 1 | crumbling | trip-worn | 5 | The great arch UNREACHED | 0/0 | — | 0/50 | 0 | 0 | — | — | — | — |
| 1 | crumbling | trip-worn | 5 | The thin arch UNREACHED | 0/0 | — | 0/50 | 0 | 0 | — | — | — | — |
| 2 | sound | fresh | 1 | The first arch | 50/50 | 100.0 | 50/50 | 0 | 0 | 2.5 | 14.0 | 10.0 | 0.0 |
| 2 | sound | fresh | 1 | The long stair | 50/50 | 100.0 | 50/50 | 0 | 0 | 2.2 | 14.0 | 10.0 | 0.0 |
| 2 | sound | fresh | 1 | The broken run | 50/50 | 100.0 | 50/50 | 0 | 0 | 2.2 | 14.0 | 10.0 | 0.0 |
| 2 | sound | fresh | 2 | The long arcade | 50/50 | 100.0 | 50/50 | 0 | 0 | 3.0 | 14.0 | 10.0 | 0.0 |
| 2 | sound | fresh | 2 | The two arches | 50/50 | 100.0 | 50/50 | 0 | 0 | 2.4 | 14.0 | 10.0 | 0.0 |
| 2 | sound | fresh | 3 | The gatehouse span | 50/50 | 100.0 | 50/50 | 0 | 0 | 2.8 | 14.0 | 10.0 | 0.0 |
| 2 | sound | fresh | 3 | The chalk walk | 50/50 | 100.0 | 50/50 | 0 | 0 | 2.9 | 14.0 | 10.0 | 0.0 |
| 2 | sound | fresh | 4 | The tall arcade | 50/50 | 100.0 | 50/50 | 0 | 0 | 2.7 | 14.0 | 10.0 | 0.0 |
| 2 | sound | fresh | 4 | The split span | 50/50 | 100.0 | 50/50 | 0 | 0 | 2.7 | 14.0 | 10.0 | 0.0 |
| 2 | sound | fresh | 5 | The great arch | 50/50 | 100.0 | 50/50 | 0 | 0 | 3.4 | 14.0 | 10.0 | 0.0 |
| 2 | sound | trip-worn | 1 | The first arch | 15/15 | 100.0 | 15/50 | 0 | 0 | 2.6 | 14.0 | 10.0 | 0.0 |
| 2 | sound | trip-worn | 1 | The long stair | 20/20 | 100.0 | 20/50 | 0 | 0 | 2.4 | 14.0 | 10.0 | 0.0 |
| 2 | sound | trip-worn | 1 | The broken run | 15/15 | 100.0 | 15/50 | 0 | 0 | 2.2 | 14.0 | 10.0 | 0.0 |
| 2 | sound | trip-worn | 2 | The long arcade | 27/27 | 100.0 | 27/50 | 0 | 0 | 3.0 | 13.6 | 6.4 | 0.0 |
| 2 | sound | trip-worn | 2 | The two arches | 23/23 | 100.0 | 23/50 | 0 | 0 | 2.5 | 13.7 | 6.3 | 0.0 |
| 2 | sound | trip-worn | 2 | The loose span UNREACHED | 0/0 | — | 0/50 | 0 | 0 | — | — | — | — |
| 2 | sound | trip-worn | 2 | The hanging stair UNREACHED | 0/0 | — | 0/50 | 0 | 0 | — | — | — | — |
| 2 | sound | trip-worn | 3 | The gatehouse span | 8/27 | 29.6 | 27/50 | 19 | 0 | 30.2 | 13.3 | 2.0 | 0.0 |
| 2 | sound | trip-worn | 3 | The chalk walk | 8/23 | 34.8 | 23/50 | 15 | 0 | 27.7 | 13.3 | 2.2 | 0.0 |
| 2 | sound | trip-worn | 3 | The sentry's stair UNREACHED | 0/0 | — | 0/50 | 0 | 0 | — | — | — | — |
| 2 | sound | trip-worn | 3 | The lantern ledge UNREACHED | 0/0 | — | 0/50 | 0 | 0 | — | — | — | — |
| 2 | sound | trip-worn | 4 | The tall arcade | 3/12 | 25.0 | 12/50 | 9 | 0 | 32.3 | 12.3 | 0.5 | 0.0 |
| 2 | sound | trip-worn | 4 | The split span | 3/4 | 75.0 | 4/50 | 1 | 0 | 12.8 | 13.0 | 0.0 | 0.0 |
| 2 | sound | trip-worn | 4 | The thin arch UNREACHED | 0/0 | — | 0/50 | 0 | 0 | — | — | — | — |
| 2 | sound | trip-worn | 4 | The last ledge UNREACHED | 0/0 | — | 0/50 | 0 | 0 | — | — | — | — |
| 2 | sound | trip-worn | 5 | The great arch | 0/6 | 0.0 | 6/50 | 6 | 0 | 41.0 | 12.5 | 0.0 | 0.0 |
| 2 | sound | trip-worn | 5 | The thin arch UNREACHED | 0/0 | — | 0/50 | 0 | 0 | — | — | — | — |
| 2 | crumbling | fresh | 2 | The loose span | 50/50 | 100.0 | 50/50 | 0 | 0 | 2.0 | 14.0 | 10.0 | 0.0 |
| 2 | crumbling | fresh | 2 | The hanging stair | 50/50 | 100.0 | 50/50 | 0 | 0 | 1.8 | 14.0 | 10.0 | 0.0 |
| 2 | crumbling | fresh | 3 | The sentry's stair | 50/50 | 100.0 | 50/50 | 0 | 0 | 2.0 | 14.0 | 10.0 | 0.0 |
| 2 | crumbling | fresh | 3 | The lantern ledge | 50/50 | 100.0 | 50/50 | 0 | 0 | 2.2 | 14.0 | 10.0 | 0.0 |
| 2 | crumbling | fresh | 4 | The thin arch | 50/50 | 100.0 | 50/50 | 0 | 0 | 2.0 | 14.0 | 10.0 | 0.0 |
| 2 | crumbling | fresh | 4 | The last ledge | 50/50 | 100.0 | 50/50 | 0 | 0 | 2.1 | 14.0 | 10.0 | 0.0 |
| 2 | crumbling | fresh | 5 | The thin arch | 50/50 | 100.0 | 50/50 | 0 | 0 | 2.8 | 14.0 | 10.0 | 0.0 |
| 2 | crumbling | trip-worn | 1 | The first arch | 15/15 | 100.0 | 15/50 | 0 | 0 | 2.6 | 14.0 | 10.0 | 0.0 |
| 2 | crumbling | trip-worn | 1 | The long stair | 20/20 | 100.0 | 20/50 | 0 | 0 | 2.4 | 14.0 | 10.0 | 0.0 |
| 2 | crumbling | trip-worn | 1 | The broken run | 15/15 | 100.0 | 15/50 | 0 | 0 | 2.2 | 14.0 | 10.0 | 0.0 |
| 2 | crumbling | trip-worn | 2 | The long arcade UNREACHED | 0/0 | — | 0/50 | 0 | 0 | — | — | — | — |
| 2 | crumbling | trip-worn | 2 | The two arches UNREACHED | 0/0 | — | 0/50 | 0 | 0 | — | — | — | — |
| 2 | crumbling | trip-worn | 2 | The loose span | 27/27 | 100.0 | 27/50 | 0 | 0 | 2.0 | 13.6 | 6.4 | 0.0 |
| 2 | crumbling | trip-worn | 2 | The hanging stair | 23/23 | 100.0 | 23/50 | 0 | 0 | 2.0 | 13.7 | 6.3 | 0.0 |
| 2 | crumbling | trip-worn | 3 | The gatehouse span UNREACHED | 0/0 | — | 0/50 | 0 | 0 | — | — | — | — |
| 2 | crumbling | trip-worn | 3 | The chalk walk UNREACHED | 0/0 | — | 0/50 | 0 | 0 | — | — | — | — |
| 2 | crumbling | trip-worn | 3 | The sentry's stair | 27/27 | 100.0 | 27/50 | 0 | 0 | 2.0 | 13.6 | 3.5 | 0.0 |
| 2 | crumbling | trip-worn | 3 | The lantern ledge | 22/23 | 95.7 | 23/50 | 1 | 0 | 3.7 | 13.7 | 3.3 | 0.0 |
| 2 | crumbling | trip-worn | 4 | The tall arcade UNREACHED | 0/0 | — | 0/50 | 0 | 0 | — | — | — | — |
| 2 | crumbling | trip-worn | 4 | The split span UNREACHED | 0/0 | — | 0/50 | 0 | 0 | — | — | — | — |
| 2 | crumbling | trip-worn | 4 | The thin arch | 12/28 | 42.9 | 28/50 | 16 | 0 | 24.3 | 13.5 | 0.9 | 0.0 |
| 2 | crumbling | trip-worn | 4 | The last ledge | 9/21 | 42.9 | 21/50 | 12 | 0 | 24.3 | 13.4 | 0.9 | 0.0 |
| 2 | crumbling | trip-worn | 5 | The great arch UNREACHED | 0/0 | — | 0/50 | 0 | 0 | — | — | — | — |
| 2 | crumbling | trip-worn | 5 | The thin arch | 0/21 | 0.0 | 21/50 | 17 | 0 | 34.5 | 13.5 | 0.1 | 0.0 |
| 3 | sound | fresh | 1 | The first arch | 50/50 | 100.0 | 50/50 | 0 | 0 | 2.3 | 20.0 | 16.0 | 0.0 |
| 3 | sound | fresh | 1 | The long stair | 50/50 | 100.0 | 50/50 | 0 | 0 | 2.1 | 20.0 | 16.0 | 0.0 |
| 3 | sound | fresh | 1 | The broken run | 50/50 | 100.0 | 50/50 | 0 | 0 | 2.1 | 20.0 | 16.0 | 0.0 |
| 3 | sound | fresh | 2 | The long arcade | 50/50 | 100.0 | 50/50 | 0 | 0 | 2.5 | 20.0 | 16.0 | 0.0 |
| 3 | sound | fresh | 2 | The two arches | 50/50 | 100.0 | 50/50 | 0 | 0 | 2.2 | 20.0 | 16.0 | 0.0 |
| 3 | sound | fresh | 3 | The gatehouse span | 50/50 | 100.0 | 50/50 | 0 | 0 | 2.4 | 20.0 | 16.0 | 0.0 |
| 3 | sound | fresh | 3 | The chalk walk | 50/50 | 100.0 | 50/50 | 0 | 0 | 2.6 | 20.0 | 16.0 | 0.0 |
| 3 | sound | fresh | 4 | The tall arcade | 50/50 | 100.0 | 50/50 | 0 | 0 | 2.4 | 20.0 | 16.0 | 0.0 |
| 3 | sound | fresh | 4 | The split span | 50/50 | 100.0 | 50/50 | 0 | 0 | 2.4 | 20.0 | 16.0 | 0.0 |
| 3 | sound | fresh | 5 | The great arch | 50/50 | 100.0 | 50/50 | 0 | 0 | 3.1 | 20.0 | 16.0 | 0.0 |
| 3 | sound | trip-worn | 1 | The first arch | 15/15 | 100.0 | 15/50 | 0 | 0 | 2.4 | 20.0 | 16.0 | 0.0 |
| 3 | sound | trip-worn | 1 | The long stair | 20/20 | 100.0 | 20/50 | 0 | 0 | 2.1 | 20.0 | 16.0 | 0.0 |
| 3 | sound | trip-worn | 1 | The broken run | 15/15 | 100.0 | 15/50 | 0 | 0 | 2.1 | 20.0 | 16.0 | 0.0 |
| 3 | sound | trip-worn | 2 | The long arcade | 27/27 | 100.0 | 27/50 | 0 | 0 | 2.6 | 19.8 | 12.4 | 0.0 |
| 3 | sound | trip-worn | 2 | The two arches | 23/23 | 100.0 | 23/50 | 0 | 0 | 2.2 | 19.7 | 12.5 | 0.0 |
| 3 | sound | trip-worn | 2 | The loose span UNREACHED | 0/0 | — | 0/50 | 0 | 0 | — | — | — | — |
| 3 | sound | trip-worn | 2 | The hanging stair UNREACHED | 0/0 | — | 0/50 | 0 | 0 | — | — | — | — |
| 3 | sound | trip-worn | 3 | The gatehouse span | 27/27 | 100.0 | 27/50 | 0 | 0 | 3.1 | 19.5 | 7.7 | 0.0 |
| 3 | sound | trip-worn | 3 | The chalk walk | 23/23 | 100.0 | 23/50 | 0 | 0 | 2.7 | 19.6 | 8.4 | 0.0 |
| 3 | sound | trip-worn | 3 | The sentry's stair UNREACHED | 0/0 | — | 0/50 | 0 | 0 | — | — | — | — |
| 3 | sound | trip-worn | 3 | The lantern ledge UNREACHED | 0/0 | — | 0/50 | 0 | 0 | — | — | — | — |
| 3 | sound | trip-worn | 4 | The tall arcade | 28/28 | 100.0 | 28/50 | 0 | 0 | 3.0 | 19.0 | 4.7 | 0.0 |
| 3 | sound | trip-worn | 4 | The split span | 22/22 | 100.0 | 22/50 | 0 | 0 | 3.1 | 19.2 | 3.8 | 0.0 |
| 3 | sound | trip-worn | 4 | The thin arch UNREACHED | 0/0 | — | 0/50 | 0 | 0 | — | — | — | — |
| 3 | sound | trip-worn | 4 | The last ledge UNREACHED | 0/0 | — | 0/50 | 0 | 0 | — | — | — | — |
| 3 | sound | trip-worn | 5 | The great arch | 11/50 | 22.0 | 50/50 | 37 | 0 | 32.1 | 19.1 | 2.3 | 0.0 |
| 3 | sound | trip-worn | 5 | The thin arch UNREACHED | 0/0 | — | 0/50 | 0 | 0 | — | — | — | — |
| 3 | crumbling | fresh | 2 | The loose span | 50/50 | 100.0 | 50/50 | 0 | 0 | 1.8 | 20.0 | 16.0 | 0.0 |
| 3 | crumbling | fresh | 2 | The hanging stair | 50/50 | 100.0 | 50/50 | 0 | 0 | 1.7 | 20.0 | 16.0 | 0.0 |
| 3 | crumbling | fresh | 3 | The sentry's stair | 50/50 | 100.0 | 50/50 | 0 | 0 | 1.8 | 20.0 | 16.0 | 0.0 |
| 3 | crumbling | fresh | 3 | The lantern ledge | 50/50 | 100.0 | 50/50 | 0 | 0 | 2.1 | 20.0 | 16.0 | 0.0 |
| 3 | crumbling | fresh | 4 | The thin arch | 50/50 | 100.0 | 50/50 | 0 | 0 | 1.9 | 20.0 | 16.0 | 0.0 |
| 3 | crumbling | fresh | 4 | The last ledge | 50/50 | 100.0 | 50/50 | 0 | 0 | 1.7 | 20.0 | 16.0 | 0.0 |
| 3 | crumbling | fresh | 5 | The thin arch | 50/50 | 100.0 | 50/50 | 0 | 0 | 2.6 | 20.0 | 16.0 | 0.0 |
| 3 | crumbling | trip-worn | 1 | The first arch | 15/15 | 100.0 | 15/50 | 0 | 0 | 2.4 | 20.0 | 16.0 | 0.0 |
| 3 | crumbling | trip-worn | 1 | The long stair | 20/20 | 100.0 | 20/50 | 0 | 0 | 2.1 | 20.0 | 16.0 | 0.0 |
| 3 | crumbling | trip-worn | 1 | The broken run | 15/15 | 100.0 | 15/50 | 0 | 0 | 2.1 | 20.0 | 16.0 | 0.0 |
| 3 | crumbling | trip-worn | 2 | The long arcade UNREACHED | 0/0 | — | 0/50 | 0 | 0 | — | — | — | — |
| 3 | crumbling | trip-worn | 2 | The two arches UNREACHED | 0/0 | — | 0/50 | 0 | 0 | — | — | — | — |
| 3 | crumbling | trip-worn | 2 | The loose span | 27/27 | 100.0 | 27/50 | 0 | 0 | 1.8 | 19.8 | 12.4 | 0.0 |
| 3 | crumbling | trip-worn | 2 | The hanging stair | 23/23 | 100.0 | 23/50 | 0 | 0 | 1.8 | 19.7 | 12.5 | 0.0 |
| 3 | crumbling | trip-worn | 3 | The gatehouse span UNREACHED | 0/0 | — | 0/50 | 0 | 0 | — | — | — | — |
| 3 | crumbling | trip-worn | 3 | The chalk walk UNREACHED | 0/0 | — | 0/50 | 0 | 0 | — | — | — | — |
| 3 | crumbling | trip-worn | 3 | The sentry's stair | 27/27 | 100.0 | 27/50 | 0 | 0 | 1.8 | 19.7 | 9.5 | 0.0 |
| 3 | crumbling | trip-worn | 3 | The lantern ledge | 23/23 | 100.0 | 23/50 | 0 | 0 | 2.0 | 19.7 | 9.4 | 0.0 |
| 3 | crumbling | trip-worn | 4 | The tall arcade UNREACHED | 0/0 | — | 0/50 | 0 | 0 | — | — | — | — |
| 3 | crumbling | trip-worn | 4 | The split span UNREACHED | 0/0 | — | 0/50 | 0 | 0 | — | — | — | — |
| 3 | crumbling | trip-worn | 4 | The thin arch | 28/28 | 100.0 | 28/50 | 0 | 0 | 1.9 | 19.6 | 6.8 | 0.0 |
| 3 | crumbling | trip-worn | 4 | The last ledge | 22/22 | 100.0 | 22/50 | 0 | 0 | 1.7 | 19.5 | 6.6 | 0.0 |
| 3 | crumbling | trip-worn | 5 | The great arch UNREACHED | 0/0 | — | 0/50 | 0 | 0 | — | — | — | — |
| 3 | crumbling | trip-worn | 5 | The thin arch | 50/50 | 100.0 | 50/50 | 0 | 0 | 4.3 | 19.5 | 4.9 | 0.0 |

Party 1, sound: trip ends {"stalled":50} / 50.
Party 1, crumbling: trip ends {"stalled":50} / 50.
Party 2, sound: trip ends {"stalled":50} / 50.
Party 2, crumbling: trip ends {"stalled":46,"lost":4} / 50.
Party 3, sound: trip ends {"stalled":37,"cleared":11,"lost":2} / 50.
Party 3, crumbling: trip ends {"cleared":50} / 50.

</details>

### Verification runs

The isolated 12-seed authored retry passed and reproduced the original artifact byte for byte.
The original run reported wall-clock timeouts. The three-seed live table and both shared CAL
sweeps (3 and 50 seeds) passed. The cracked-move regression passed by itself with both the quick
and 14-seed samples. The quick whole-trip and legal-walk checks passed in the single-file rerun.
The falls comparison passed a focused retry at the same quick seed count with the table
timeout. The full targeted command passed 82 tests across seven files on retry, including
the heart and Chief Warden regressions.

### BR-21 trial and P2 decision

P2 proposes the canals' band. The source band is fresh party 2 with at least 50 seeds per layout,
rooms 1–2 at least 85%, room 3 at least 75%, room 4 at 65–80% with the Lamplighter (the fallback
at least 80%), heart 50–65%, and party 3 within +10 points. Bridges still needs a decision on the
band, including how to apply the room-4 split. The trial below uses the fresh pair for the band
comparison and reports carryover separately.

The aware pair used seeds 1–8 per fresh layout and eight worn trips per span in each arm. The
tougher arm tried sound stone 3 (from 2), keystone HP 8 (from 6), Chief HP 14 (from 10), and
Warden/Gargoyle/Mason HP 5/4/4 (from 4/3/3). The candidate updates the actual rival, board shell
and `chiefHp` to 14. Chief spawn HP was 10 control and 14 candidate on both spans. Authored
crumbling stone is encoded as `{span:1}`. The generic out-of-room rule supplies elite fall damage
of 4. The `eliteFall` field is a nominal copy of that value. The trial kept crumbling stone at 1
and fall damage at 4. To rerun either arm with its listed data values, use
`BRIDGES_TABLE=1 BRIDGES_CANDIDATE=1 BRIDGES_SEEDS=8 pnpm vitest run tests/sim/bridges-calibration.test.ts -t 'live bridges' --reporter=dot`.

Both arms won every fresh pair fight, 16/16 per span at depth 4 and 8/8 per heart (descriptive
95% Wilson intervals 80.6–100% and 67.6–100%). If P2 adopts the 65–80% room-4 comparison,
both arms overshoot it by 20 points and the 50–65% heart comparison by 35 points. These fixed
seeds fall short of the proposed 50 seeds per layout and provide screening evidence.

| Arm | Worn sound r3 wins / stalls | Worn crumbling r3 wins / stalls | Worn sound heart wins / losses / stalls | Worn crumbling heart wins / losses / stalls |
| --- | --- | --- | --- | --- |
| Control | 2/8 / 6 | 8/8 / 0 | 0/1 / 0 / 1 | 0/6 / 1 / 5 |
| Tougher | 1/8 / 7 | 4/8 / 4 | 0/1 / 0 / 1 | 0/1 / 0 / 1 |

The stronger bodies increased worn room-3 stalls without changing fresh wins. CAL-B also
found both fresh solo hearts stalled in 8/8 seeds with Hold valued and 8/8 with Hold off.
Its sound-heart trace had the draughtsman oscillating with the Chief still at 8 HP. Keep that
policy limitation separate from the worn pair's inability to finish, and keep CAL-B's frozen
no-Hold policy. See [CAL-B's policy review](calibration-bot-review.md#2-hold-decision-task-2).

Proposed decision: retain current bridge numbers while the player decides P2. If the band is
adopted, review the low-charge play problem before using heavier bodies or interpreting stalls
as evidence of a successful difficulty increase.

<details><summary>Matched control trial output</summary>

Seeds 1–8, 40 rounds, 600 applied actions, full starter-lattice bot. Aware uses gauge + cracks. Blind uses neither. Hold is off in both. Worn trips carry actual HP and charges, take the first loot and leave the doorway unchanged; cooled trips prioritize the cold plunge. Opening bridge layouts precede the first span choice.

| party | policy | state | depth | span | wins/fights | losses | stalls | budget | member falls/fight | entry HP | Chief HP |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 2 | aware | fresh | 1 | opening | 24/24 | 0 | 0 | 0 | 0.00 | 14.00 | — |
| 2 | aware | fresh | 2 | sound | 16/16 | 0 | 0 | 0 | 0.00 | 14.00 | — |
| 2 | aware | fresh | 3 | sound | 16/16 | 0 | 0 | 0 | 0.00 | 14.00 | — |
| 2 | aware | fresh | 4 | sound | 16/16 | 0 | 0 | 0 | 0.00 | 14.00 | — |
| 2 | aware | fresh | 5 | sound | 8/8 | 0 | 0 | 0 | 0.00 | 14.00 | 10 |
| 2 | aware | trip-worn | 1 | sound | 8/8 | 0 | 0 | 0 | 0.00 | 14.00 | — |
| 2 | aware | trip-worn | 2 | sound | 8/8 | 0 | 0 | 0 | 0.00 | 13.75 | — |
| 2 | aware | trip-worn | 3 | sound | 2/8 | 0 | 6 | 0 | 0.00 | 13.38 | — |
| 2 | aware | trip-worn | 4 | sound | 1/2 | 0 | 1 | 0 | 0.00 | 13.00 | — |
| 2 | aware | trip-worn | 5 | sound | 0/1 | 0 | 1 | 0 | 0.00 | 13.00 | 10 |
| 2 | aware | fresh | 2 | crumbling | 16/16 | 0 | 0 | 0 | 0.00 | 14.00 | — |
| 2 | aware | fresh | 3 | crumbling | 16/16 | 0 | 0 | 0 | 0.00 | 14.00 | — |
| 2 | aware | fresh | 4 | crumbling | 16/16 | 0 | 0 | 0 | 0.00 | 14.00 | — |
| 2 | aware | fresh | 5 | crumbling | 8/8 | 0 | 0 | 0 | 0.00 | 14.00 | 10 |
| 2 | aware | trip-worn | 1 | crumbling | 8/8 | 0 | 0 | 0 | 0.00 | 14.00 | — |
| 2 | aware | trip-worn | 2 | crumbling | 8/8 | 0 | 0 | 0 | 0.00 | 13.75 | — |
| 2 | aware | trip-worn | 3 | crumbling | 8/8 | 0 | 0 | 0 | 0.00 | 13.75 | — |
| 2 | aware | trip-worn | 4 | crumbling | 6/8 | 0 | 2 | 0 | 0.00 | 13.63 | — |
| 2 | aware | trip-worn | 5 | crumbling | 0/6 | 1 | 5 | 0 | 0.17 | 13.67 | 10 |

</details>

<details><summary>Tougher data trial output</summary>

Seeds 1–8, 40 rounds, 600 applied actions, full starter-lattice bot. Aware uses gauge + cracks. Blind uses neither. Hold is off in both. Worn trips carry actual HP and charges, take the first loot and leave the doorway unchanged; cooled trips prioritize the cold plunge. Opening bridge layouts precede the first span choice.

| party | policy | state | depth | span | wins/fights | losses | stalls | budget | member falls/fight | entry HP | Chief HP |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 2 | aware | fresh | 1 | opening | 24/24 | 0 | 0 | 0 | 0.00 | 14.00 | — |
| 2 | aware | fresh | 2 | sound | 16/16 | 0 | 0 | 0 | 0.00 | 14.00 | — |
| 2 | aware | fresh | 3 | sound | 16/16 | 0 | 0 | 0 | 0.00 | 14.00 | — |
| 2 | aware | fresh | 4 | sound | 16/16 | 0 | 0 | 0 | 0.00 | 14.00 | — |
| 2 | aware | fresh | 5 | sound | 8/8 | 0 | 0 | 0 | 0.00 | 14.00 | 14 |
| 2 | aware | trip-worn | 1 | sound | 8/8 | 0 | 0 | 0 | 0.00 | 14.00 | — |
| 2 | aware | trip-worn | 2 | sound | 8/8 | 0 | 0 | 0 | 0.00 | 13.75 | — |
| 2 | aware | trip-worn | 3 | sound | 1/8 | 0 | 7 | 0 | 0.00 | 13.63 | — |
| 2 | aware | trip-worn | 4 | sound | 1/1 | 0 | 0 | 0 | 0.00 | 13.00 | — |
| 2 | aware | trip-worn | 5 | sound | 0/1 | 0 | 1 | 0 | 0.00 | 13.00 | 14 |
| 2 | aware | fresh | 2 | crumbling | 16/16 | 0 | 0 | 0 | 0.00 | 14.00 | — |
| 2 | aware | fresh | 3 | crumbling | 16/16 | 0 | 0 | 0 | 0.00 | 14.00 | — |
| 2 | aware | fresh | 4 | crumbling | 16/16 | 0 | 0 | 0 | 0.00 | 14.00 | — |
| 2 | aware | fresh | 5 | crumbling | 8/8 | 0 | 0 | 0 | 0.00 | 14.00 | 14 |
| 2 | aware | trip-worn | 1 | crumbling | 8/8 | 0 | 0 | 0 | 0.00 | 14.00 | — |
| 2 | aware | trip-worn | 2 | crumbling | 8/8 | 0 | 0 | 0 | 0.00 | 13.75 | — |
| 2 | aware | trip-worn | 3 | crumbling | 4/8 | 0 | 4 | 0 | 0.00 | 13.63 | — |
| 2 | aware | trip-worn | 4 | crumbling | 1/4 | 0 | 3 | 0 | 0.00 | 13.00 | — |
| 2 | aware | trip-worn | 5 | crumbling | 0/1 | 0 | 1 | 0 | 0.00 | 13.00 | 14 |

</details>

## Historical verification

Numbers recorded only, no tuning (session rule: calibration waits for the end). Source:
`tests/sim/bridges-calibration.test.ts`, run as
`BRIDGES_TABLE=1 BRIDGES_OUT=<file> pnpm vitest run tests/sim/bridges-calibration.test.ts`
(12 seeds per cell, ~7 min). The default run is 1 seed and rides in `pnpm check`.

## The bot

`tests/sim/bot.ts` (tests, not `src/`) gained `opts.cracks`: a move that would end on a cracked
span tile (`crackedSet`) is penalised beyond any attack's worth, so it is taken only when every
legal move is cracked. Units out of the room are skipped. A test replays the bot's moves over
both spans and asserts the rule holds at every move. The cracks-reading bot falls no more than
the blind one (2 vs 2 falls over 14 trips: falls are rare either way, so the bot's own policy
barely tests the collapse; the dusk fall is covered by the district's scenario tests).

## Win rate by room (founders then recruit, greedy bot, 12 seeds)

Cells are `wins/fights reached`. A "win" excludes a stall at 30 rounds (the bot paces with no
charges); `rd` is mean rounds per fight, so 31.0 means it stalled. Falls (members out of the
room) are 0.0-0.3 per fight everywhere.

| Party | Span | r1 | r2 | r3 | r4 | r5 (heart) | Trips cleared |
|---|---|---|---|---|---|---|---|
| 1 (D) | sound | 12/12 | 7/12 | 4/7 | 4/4 | 0/4 | 0/12 |
| 1 (D) | crumbling | 12/12 | 8/12 | 6/8 | 0/6 | - | 0/12 |
| 2 (D+S) | sound | 12/12 | 12/12 | 3/12 | 1/3 | 0/1 | 0/12 |
| 2 (D+S) | crumbling | 12/12 | 12/12 | 12/12 | 7/12 | 0/7 | 0/12 |
| 3 (D+S+R) | sound | 12/12 | 12/12 | 12/12 | 12/12 | 2/12 | 2/12 |
| 3 (D+S+R) | crumbling | 12/12 | 12/12 | 12/12 | 12/12 | 12/12 | 12/12 |

Reading (observations, not changes): the spans differ most from room 3 on. The sound span is
the harder road for parties of one and two (room 3 sound: 3/12 with two against 12/12 on the
crumbling span), and the party of three clears the crumbling heart every time but the sound
heart twice in twelve. The crumbling span's shorter, wearing board shortens fights (2-5 rounds
for three) and the brief asks that its better loot be worth the risk: here the bot pays almost
no price for it, since falls are near zero. Parties of one stall in rooms 2-5 and never clear.
A stall is the bot's weakness with no charges (it only paces), not a measured loss, so room 3-5
rates for small parties are floors.

## Fuzz

Random legal walks on a random room of a trip (earlier rooms won by the bot first), both spans,
parties of 1 to 3, 200 walks in the table run: no throw and no event-cap overrun. All 17 boards
were reached. No 5x6 board exists in the data: the smallest crumbling-side boards are the 5x7
stairs and the 6x6 last ledge, all fuzzed:

5x7 hanging stair, sentry's stair, thin arch; 6x6 last ledge; 6x7 lantern ledge, loose span,
thin arch; 6x9 chalk walk, first arch, long stair, split span, two arches; 7x9 broken run,
gatehouse span, great arch, long arcade, tall arcade.

## Not done

Data numbers (stone, foe counts, HP) are not tuned. The bot never uses the Hold or the
span-choice for loot value; one key per trip and trip replay after reload are covered by the
release tests, not here.
