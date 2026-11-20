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

## Hardened (post-IQ-20)

Reduced sample: 30 seeds per room, founding pair, fresh party (seeds 1000-1029). Layouts and `CLOCK_TUNING` only; no engine change.

| room | before (win / median / max) | after |
|---|---|---|
| 1 | 100% / 2 / 2 | 100% / 3 / 3 (6 dead letters, was 3) |
| 2 | 100% / 2 / 3 | 100% / 3 / 4 (Sorter + 4 dead letters, was 2) |
| 3 | 100% / 3 / 4 | 100% / 4 / 6 (5 dead letters, was 2) |
| 4 | 100% / 3 / 4 | 100% / 4 / 5 (two Sorters, 3 dead letters) |
| heart | 100% / 5 / 6 | 100% / 5 / 6 (roster and clock unchanged) |

- `CLOCK_TUNING` left unchanged (deadline 3, cooldown 2). The bot answers the clock whatever the number: with deadline 2 and cooldown 1, 80 heart fights gave 91 serves and 0 collections; deadline 1 gave 3 collections in 49 fights. Engine tests (ink-clock, ink-standin) also hard-code serve+3, so a change needs those updated.
- Terms re-checked (30 seeds, every term and room): all won 30/30 and paid 30/30, so sampler 5, bind 6, wax 7 stand. Bind's limit is now the room-3 max (6): no slack.
- Not reached: the 85-95% room win rate and a 60-80% heart win rate. The postal foes cannot damage the party (dead letters and Sorters have no attack, the Sealer only holds), so a fresh party can only lose by stalling. More rounds, not more losses, is all layouts can buy. The heart needs a damaging foe, a larger `collect`, or a sturdier clock seal (data/engine outside this pass).

## CAL-2 baseline (2026-11-20): the postmaster rows and term deltas

Measured before any lever was tried, on the current data (`CLOCK_TUNING` 3/3/2, seal 3 HP, postmaster 14 HP, move 0, terms 5/6/7). `INK_CAL=1 pnpm vitest run tests/sim/ink-calibration.test.ts` (120 fresh seeds, 1000-1119; about 25 minutes under load). Bot: the shared greedy bot, founding pair. These are the numbers to remeasure after any change, not targets. The older tables above are history; where they differ (room 4 reached 9 % then, 43 % now) the layouts were hardened in between.

### Per room, fresh party, each term against its room without one

| room | term | win | baseline win | delta (pts) | paid | broken | median rounds | max rounds |
|---|---|---|---|---|---|---|---|---|
| 1 | none | 100% | - | - | - | - | 3 | 3 |
| 2 | none | 100% | - | - | - | - | 3 | 4 |
| 2 | sampler | 100% | 100% | 0 | 100% | 0% | 3 | 4 |
| 3 | none | 100% | - | - | - | - | 4 | 6 |
| 3 | bind | 100% | 100% | 0 | 100% | 0% | 4 | 6 |
| 3 | wax | 100% | 100% | 0 | 100% | 0% | 4 | 6 |
| 3 | sand | 100% | 100% | 0 | 100% | 0% | 4 | 6 |
| 4 | none | 100% | - | - | - | - | 4 | 5 |
| 4 | wax | 100% | 100% | 0 | 100% | 0% | 4 | 5 |
| 4 | sand | 100% | 100% | 0 | 100% | 0% | 4 | 5 |
| 4 | ledger | 100% | 100% | 0 | 100% | 0% | 4 | 8 |
| 5 (heart) | none | 100% | - | - | - | - | 5 | 6 |
| 5 (heart) | wax | 100% | 100% | 0 | 100% | 0% | 5 | 6 |
| 5 (heart) | sand | 100% | 100% | 0 | 100% | 0% | 5 | 7 |
| 5 (heart) | ledger | 95% | 100% | -5 | 95% | 0% | 5 | 7 |

Paid and broken are shares of all 120 fights (of the won, paid + broken = the win rate); a lost room settles neither.

Paid and broken are shares of all 120 fights; a lost room settles neither.

### The postmaster at the heart, fresh party (his trick, opener and page)

| sample | fights | won | lost | stalled | served / lifted / collected | opener | trick | page banked | median rounds | median HP left | mean charges (notice, collect) | mean party HP |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| fresh, no term | 120 | 120 (100%) | 0 (0%) | 0 (0%) | 134 / 131 / 0 | the clock writ x120 | the clock writ x120 | 120/120 wins | 5 | 0 | 4.9, 5.0 | 13.2 |
| fresh, wax | 120 | 120 (100%) | 0 (0%) | 0 (0%) | 134 / 131 / 0 | the clock writ x120 | the clock writ x120 | 120/120 wins | 5 | 0 | 4.9, 5.0 | 13.2 |
| fresh, sand | 120 | 120 (100%) | 0 (0%) | 0 (0%) | 134 / 131 / 0 | the clock writ x120 | the clock writ x120 | 120/120 wins | 5 | 0 | 4.9, 5.0 | 13.2 |
| fresh, ledger | 120 | 114 (95%) | 0 (0%) | 6 (5%) | 150 / 136 / 0 | the clock writ x120 | the clock writ x120 | 114/114 wins | 5 | 0 | 4.8, 5.0 | 13.1 |

### Real trips under the three signing policies

| policy | reached room 2 | 3 | 4 | 5 (heart) | cleared | signed per trip | terms paid / broken / unsettled |
|---|---|---|---|---|---|---|---|
| never | 100% | 94% | 43% | 1% | 0% | 0.0 | 0 / 0 / 0 |
| always | 100% | 94% | 43% | 1% | 0% | 2.4 | 123 / 42 / 120 |
| winRoom | 100% | 94% | 43% | 1% | 0% | 0.3 | 0 / 0 / 34 |

### Worn heart: the trip's own heart fight, 500 trips (never policy, seeds 20000-20499; `INK_WORN=500`)

| sample | fights | won | lost | stalled | served / lifted / collected | opener | trick | his casts per fight | page banked | median rounds | median HP left | mean charges (notice, collect) | mean party HP |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| worn, never | 6 | 3 (50%) | 0 (0%) | 3 (50%) | 20 / 18 / 1 | the clock writ x6 | the clock writ x6 | 1.5 | 3/3 wins | 41 | 0 | 3.5, 5.0 | 4.5 |

Reading the tables:
- **Terms:** no term room is more than 5 points under its baseline (the ledger at the heart: 114/120 against 120/120, six stalls), and every term pays in every win. The 10-point rule and "terms never beyond a normal room's band" hold; with every room at 100% there is nothing for a term to be harder than. In real trips (policy `always`) terms are paid 123 times, broken 42 and left unsettled 120 (the trip ended first).
- **Postmaster, fresh:** 120/120 won, 0 lost, 0 stalled; the page banks on every win. His opener is always the clock writ (round 1, first routine step): served 134 times, lifted 131, collected 0. He casts 0.1 times a fight: he is dead by round 5 with 5/5 charges, so his Bolt> Ink Sentence kit is almost never used. The pair ends with about 13.2 of 14 HP.
- **Postmaster, worn:** about 1 trip in 100 reaches the heart (1 of 120; 6 of 500 on the larger sample). Of those 6: 3 won (page banked 3/3), 3 stalled out of charges at the 40-round cap, **0 lost**; 20 writs served, 18 lifted, 1 collected. The old "heart cleared 3 %" is now a heart reached on about 1 % of trips, because room 4 is reached by 43 %.
- **The heart has never been lost** in 480 fresh fights (four sign states) and 7 worn ones. The bot's only failures are stalls from spent charges. That is the quantified miss for "the heart can be lost".
