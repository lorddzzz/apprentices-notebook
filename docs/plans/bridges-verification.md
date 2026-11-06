# Bridges verification (BR-21)

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
