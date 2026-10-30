# Ink quarter calibration (IQ-20)

Produced by `INK_CAL=1 pnpm vitest run tests/sim/ink-calibration.test.ts` (120 seeds per row, seeds 1000-1119; about 10 minutes). The committed test runs 2 seeds per term room plus a 120-trip fuzz in under 10 s. Bot: `tests/sim/bot.ts` (greedy), founding pair (Stoker, Draughtsman). A trio was not run: the notary only joins at room 3, so a trio needs a recruit setup the sims do not have yet.

## Signing policy

`tests/sim/ink-bot.ts`, `SignPolicy`:
- `never`: refuse every termed card (baseline).
- `always`: take the termed card whenever one is offered and none is open (otherwise the first plain card).
- `winRoom`: sign only terms whose condition is `winRoom` (no clock to beat).

The bot never goes home early; it pushes on to the heart. Plain offers are taken first-card.

## Per room, fresh party

"Fresh party" = full HP and charges, the term signed in the room before (`roomRun`). `win` is the room won; `paid` is the term's condition held, of the rooms won.

| room | term | win | term paid | median rounds | max rounds |
|---|---|---|---|---|---|
| 1 | none | 100% | - | 2 | 2 |
| 2 | none | 100% | - | 2 | 3 |
| 2 | sampler | 100% | 100% | 2 | 3 |
| 3 | none | 100% | - | 3 | 4 |
| 3 | bind | 100% | 100% | 3 | 4 |
| 3 | wax | 100% | 100% | 3 | 4 |
| 3 | sand | 100% | 100% | 3 | 4 |
| 4 | none | 100% | - | 3 | 4 |
| 4 | wax | 100% | 100% | 3 | 4 |
| 4 | sand | 100% | 100% | 3 | 4 |
| 4 | ledger | 100% | 100% | 4 | 5 |
| 5 (heart) | none | 100% | - | 5 | 6 |
| 5 (heart) | wax | 100% | 100% | 5 | 6 |
| 5 (heart) | sand | 100% | 100% | 5 | 6 |
| 5 (heart) | ledger | 95% | 100% | 5 | 7 |

Wax was run at 5 rounds (95% paid at the heart); it is 7 in data, so its rows are shown at 7 (every won heart took at most 6 rounds, so the condition holds). Everything else is as printed by the big run. A term signed in room 4's loot is fought at the heart, with the clock live; the heart's own loot offers none.

## Real trips, no restocking

The bot goes room to room without going home; charges only drain.

| policy | won room 1 | room 2 | room 3 | room 4 | heart (cleared) | terms signed per trip |
|---|---|---|---|---|---|---|
| never | 100% | 100% | 89% | 9% | 3% | 0.0 |
| always | 100% | 100% | 89% | 7% | 3% | 3.0 |
| winRoom | 100% | 100% | 89% | 7% | 3% | 0.6 |

The founding pair runs out of charges around room 4 (spells are finite; stalls count as losses). That is the real difficulty: attrition, not any single room. It also makes a blocked way home (open term) a live decision once the pair is dry.

## Numbers set

The bot is a fast greedy player, so tight bounds are set from its worst case plus margin for a slower human (target: bot wins within the limit in 100% of runs; the playtest gate IQ-G1 retunes).

| term | withinRounds | was | bot max in the room(s) it can be fought | reason |
|---|---|---|---|---|
| sampler (room 2) | 5 | 8 | 3 | sampler is the first term; a 2-round margin; the stake (2 ink of the limit 3) is unchanged |
| bind (room 3) | 6 | 10 | 4 | gentle by design (P7); two spare rounds |
| wax (rooms 3-5) | 7 | 7 | 6 at the heart | the tightest case is the heart (median 5, max 6), so 7 is the least that stays meetable there |

`winRoom` terms (sand, ledger) have no number. Stake sizes are unchanged: `checkStakeDefs` passes, the handicaps are one mark, one dead letter, and 2 ink. The room win rate with a term never fell below the no-term rate by more than 5 points (the ledger at the heart, 95% against 100%), inside the 10-point rule.

## Is any room too easy?

Yes: with a fresh party every room is won 100% of the time in 2 to 6 rounds, and no term costs the bot a room. Suggestions (layouts are not touched here):
- Rooms 1-2 (median 2 rounds): add one more foe or an elite-lite sealed behind a stamp, so the room takes at least 4 rounds for the bot.
- Room 3 (tube hall): put the Sealer's seal on the stamp tile on turn 1 so forward must be used, not ignored.
- Room 4 (ledger stacks): two Sorters plus letters; today it falls in 3 rounds.
- Heart: the clock never comes due in 5 rounds; move the first deadline to round 3 (or serve on round 1) so answering it matters.
- A tighter `withinRounds` only bites once rooms take longer; retune after the layouts change.
