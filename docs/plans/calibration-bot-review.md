# CAL-B: bot policy review (CAL-3 / CAL-4 preparation, HC-4)

Pack CAL-B prepares the shared bot (`src/engine/sim/bot.ts`) before the calibration passes. Everything here is a **policy comparison**: the same fresh fights (seed, starter pages, layout) are replayed under each policy, so the difference between columns is the bot, not the room. These are not district win rates (those wait for EN-14 and CAL-3/CAL-4) and no balance number was changed.

Reproduce: `CAL_BOT=1 CAL_BOT_SEEDS=8 CAL_BOT_OUT=out.md pnpm vitest run tests/sim/calibration-bot.test.ts` (about 6 minutes). The default run is a 13 s deterministic smoke.

## 1. Policy baseline (task 1)

**Corpus** (fixed, `CORPUS` in `tests/sim/calibration-bot.test.ts`): bridges (sound and crumbling spans), foundry (0 and 4 rung bells, injected the way CAL-0's adapter does), academy and baths; the first and the last (heart) room of each, every layout; party 1 (draughtsman) and party 2 (draughtsman + stoker); starter lattices; seeds 1-8; 40 rounds, budget 600 applied actions, `lite` off (the CAL-0 full setting). A fight is a *stall* (`s`) when the round limit passes with the room neither won nor lost, a *budget stop* (`x`) when the operation budget runs out first; any other non-win is a loss (the party was wiped). The key ends in `#n`, the layout index in the room's variant list (the crumbling span's third room-1 layout and the caldarium's three heart layouts have no or the same name).

Policies: `default` = `botFight` with no options (what `botTrial` runs, plus lite); `cracks` = `{ cracks: true }`; `district` = `{ gauge: true, cracks: true }` (what CAL-0 tables use: bridges falls, bathhouse boil-over forecast, foundry pulses, academy terms through `botValue`).

#### policy baseline, parties 1-2, seeds 1-8

| fight | default wins | default stalled seeds (s stall, x budget) | cracks wins | cracks stalled seeds (s stall, x budget) | district wins | district stalled seeds (s stall, x budget) |
| --- | --- | --- | --- | --- | --- | --- |
| bridges sound r1 The first arch#0 p1 | 8/8 | — | 8/8 | — | 8/8 | — |
| bridges sound r1 The long stair#1 p1 | 8/8 | — | 8/8 | — | 8/8 | — |
| bridges sound r5 The great arch#0 p1 | 0/8 | 1s 2s 3s 4s 5s 6s 7s 8s | 0/8 | 1s 2s 3s 4s 5s 6s 7s 8s | 0/8 | 1s 2s 3s 4s 5s 6s 7s 8s |
| bridges crumbling r1 The broken run#2 p1 | 8/8 | — | 8/8 | — | 8/8 | — |
| bridges crumbling r1 #3 p1 | 8/8 | — | 8/8 | — | 8/8 | — |
| bridges crumbling r5 The thin arch#1 p1 | 0/8 | 1s 2s 3s 4s 5s 6s 7s 8s | 0/8 | 1s 2s 3s 4s 5s 6s 7s 8s | 0/8 | 1s 2s 3s 4s 5s 6s 7s 8s |
| bridges sound r1 The first arch#0 p2 | 8/8 | — | 8/8 | — | 8/8 | — |
| bridges sound r1 The long stair#1 p2 | 8/8 | — | 8/8 | — | 8/8 | — |
| bridges sound r5 The great arch#0 p2 | 8/8 | — | 8/8 | — | 8/8 | — |
| bridges crumbling r1 The broken run#2 p2 | 8/8 | — | 8/8 | — | 8/8 | — |
| bridges crumbling r1 #3 p2 | 8/8 | — | 8/8 | — | 8/8 | — |
| bridges crumbling r5 The thin arch#1 p2 | 7/8 | 3s | 8/8 | — | 8/8 | — |
| foundry 0 r1 The first flight#0 p1 | 6/8 | — | 6/8 | — | 8/8 | — |
| foundry 0 r1 The landing#1 p1 | 8/8 | — | 8/8 | — | 8/8 | — |
| foundry 0 r1 The stairwell#2 p1 | 8/8 | — | 8/8 | — | 8/8 | — |
| foundry 0 r5 The great bell#0 p1 | 7/8 | — | 7/8 | — | 8/8 | — |
| foundry 0 r5 The clapper hall#1 p1 | 1/8 | — | 1/8 | — | 5/8 | — |
| foundry 0 r5 The sounding yoke#2 p1 | 6/8 | — | 6/8 | — | 0/8 | — |
| foundry 4 r1 The first flight#0 p1 | 6/8 | — | 6/8 | — | 8/8 | — |
| foundry 4 r1 The landing#1 p1 | 8/8 | — | 8/8 | — | 8/8 | — |
| foundry 4 r1 The stairwell#2 p1 | 8/8 | — | 8/8 | — | 8/8 | — |
| foundry 4 r5 The great bell#0 p1 | 7/8 | — | 7/8 | — | 8/8 | — |
| foundry 4 r5 The clapper hall#1 p1 | 0/8 | — | 0/8 | — | 8/8 | — |
| foundry 4 r5 The sounding yoke#2 p1 | 6/8 | — | 6/8 | — | 1/8 | 2s |
| foundry 0 r1 The first flight#0 p2 | 8/8 | — | 8/8 | — | 8/8 | — |
| foundry 0 r1 The landing#1 p2 | 8/8 | — | 8/8 | — | 8/8 | — |
| foundry 0 r1 The stairwell#2 p2 | 8/8 | — | 8/8 | — | 8/8 | — |
| foundry 0 r5 The great bell#0 p2 | 7/8 | — | 7/8 | — | 8/8 | — |
| foundry 0 r5 The clapper hall#1 p2 | 8/8 | — | 8/8 | — | 8/8 | — |
| foundry 0 r5 The sounding yoke#2 p2 | 7/8 | — | 7/8 | — | 8/8 | — |
| foundry 4 r1 The first flight#0 p2 | 8/8 | — | 8/8 | — | 8/8 | — |
| foundry 4 r1 The landing#1 p2 | 8/8 | — | 8/8 | — | 8/8 | — |
| foundry 4 r1 The stairwell#2 p2 | 8/8 | — | 8/8 | — | 8/8 | — |
| foundry 4 r5 The great bell#0 p2 | 8/8 | — | 8/8 | — | 8/8 | — |
| foundry 4 r5 The clapper hall#1 p2 | 8/8 | — | 8/8 | — | 8/8 | — |
| foundry 4 r5 The sounding yoke#2 p2 | 8/8 | — | 8/8 | — | 8/8 | — |
| academy authored r1 The tiered seats#0 p1 | 8/8 | — | 8/8 | — | 8/8 | — |
| academy authored r1 The lectern#1 p1 | 4/8 | — | 4/8 | — | 8/8 | — |
| academy authored r1 The projection wall#2 p1 | 7/8 | — | 7/8 | — | 8/8 | — |
| academy authored r5 The owner's desk#0 p1 | 5/8 | — | 5/8 | — | 7/8 | — |
| academy authored r5 The unswept floor#1 p1 | 5/8 | — | 5/8 | — | 6/8 | — |
| academy authored r5 The shuttered window#2 p1 | 1/8 | — | 1/8 | — | 4/8 | 6s |
| academy authored r1 The tiered seats#0 p2 | 8/8 | — | 8/8 | — | 8/8 | — |
| academy authored r1 The lectern#1 p2 | 7/8 | — | 7/8 | — | 8/8 | — |
| academy authored r1 The projection wall#2 p2 | 8/8 | — | 8/8 | — | 8/8 | — |
| academy authored r5 The owner's desk#0 p2 | 8/8 | — | 8/8 | — | 8/8 | — |
| academy authored r5 The unswept floor#1 p2 | 8/8 | — | 8/8 | — | 8/8 | — |
| academy authored r5 The shuttered window#2 p2 | 7/8 | — | 7/8 | — | 8/8 | — |
| baths authored r1 The changing hall#0 p1 | 3/8 | — | 3/8 | — | 8/8 | — |
| baths authored r1 The scrubbing floor#1 p1 | 7/8 | — | 7/8 | — | 8/8 | — |
| baths authored r1 The tepidarium#2 p1 | 8/8 | — | 8/8 | — | 8/8 | — |
| baths authored r5 The steward's caldarium#0 p1 | 0/8 | — | 0/8 | — | 8/8 | — |
| baths authored r5 The steward's caldarium#1 p1 | 0/8 | — | 0/8 | — | 8/8 | — |
| baths authored r5 The steward's caldarium#2 p1 | 0/8 | — | 0/8 | — | 8/8 | — |
| baths authored r1 The changing hall#0 p2 | 8/8 | — | 8/8 | — | 8/8 | — |
| baths authored r1 The scrubbing floor#1 p2 | 8/8 | — | 8/8 | — | 8/8 | — |
| baths authored r1 The tepidarium#2 p2 | 8/8 | — | 8/8 | — | 8/8 | — |
| baths authored r5 The steward's caldarium#0 p2 | 8/8 | — | 8/8 | — | 8/8 | — |
| baths authored r5 The steward's caldarium#1 p2 | 8/8 | — | 8/8 | — | 8/8 | — |
| baths authored r5 The steward's caldarium#2 p2 | 8/8 | — | 8/8 | — | 8/8 | — |
| **total** | 386/480 | 17 stalls, 0 budget | 387/480 | 16 stalls, 0 budget | 439/480 | 18 stalls, 0 budget |



### Reading the baseline

- Totals: `default` 386/480 wins with 17 stalls, `cracks` 387/480 with 16, `district` 439/480 with 18.
- **No fight ran out of budget** (600 actions) under any policy, so budget stops are not hiding results here; stalls are a round-limit effect.
- **Stalled seeds inventory** (all at party 1 unless noted):
  - bridges sound r5 "The great arch" and crumbling r5 "The thin arch": 8/8 stall under all three policies. One apprentice never clears either bridge heart in 40 rounds: it neither wins nor is wiped. This is the BR-21 "party 1 never clears" row; the stall (not a loss) is what a missing Hold or missing damage looks like. Task 2 measures it.
  - bridges crumbling r5 "The thin arch" party 2 seed 3 stalls under `default`; `cracks` fixes it (8/8). That is the whole measured effect of `cracks` on this corpus: 387 vs 386 wins.
  - academy r5 "The shuttered window" party 1: seed 6 stalls under `district` (wins 4/8, against 1/8 for `default`, which loses the rest).
  - foundry 4 bells r5 "The sounding yoke" party 1: seed 2 stalls under `district` (1/8 wins) where `default` wins 6/8.
- **`district` is not strictly better.** It lifts the baths from 3/8 and 0/8 (changing hall, caldarium) to 8/8: without the boil-over forecast the default bot walks into boil-overs every time, so default-policy baths numbers measure the bot, not the room. But foundry "The sounding yoke" at party 1 falls from 6/8 (both bell counts) to 0/8 (0 bells) and 1/8 (4 bells) when the pulse term is on, while the other foundry rooms rise (clapper hall 1/8 to 5/8 at 0 bells, 0/8 to 8/8 at 4). A policy term that helps most layouts and costs one means the pulse weights (section 3) are a policy choice worth recording, not a free fix.
- `default` and `cracks` agree everywhere except one fight, so for foundry/academy/baths cracks has no effect (no span there).
- **For CAL-3/CAL-4**: use the `district` policy (CAL-0's setting) and report the stalled seeds beside every rate; read bridges party 1 as stalls, and do not read the sounding yoke at party 1 as balance evidence until the pulse term is revisited.

## 2. Hold decision (task 2)

**Decision: the bot does not learn Hold by default. No-Hold is retained, with the evidence below.** `BotOptions.hold` exists, opt-in and off by default, so later packs can reproduce the comparison; production `botTrial` does not set it (generator trials are unchanged), and `calibration-tables`/CAL-0 do not set it either. **Later packs (CAL-3, CAL-4) use `{ gauge: true, cracks: true }` without `hold`.**

**The option** (`src/engine/sim/bot.ts`): a cast's gain is `value(after) - value(before)` plus `holdGain` for units that cast newly held. A foe held on a cracked tile is worth `10 * hp + 20` (it falls at dusk, as if removed); a foe held elsewhere is `HOLD_PIN = 0.5` (a tie-break below 1 HP of damage, 10); a member held costs `HOLD_SELF_PIN = 2`, or `30 * hp` on a cracked tile. A Hold before the move would spend the turn's action, so it opens only for the cracked-tile fall; after the move any pin counts. No new randomness, no wall-clock, no extra applied actions: the budget counts applied actions only, as before. Tests: `CAL-B: Hold policy is deterministic and respects the operation budget`, `CAL-B: a Hold option leaves default actions unchanged`.

**The loadout** (`holdLoadout` in the test): each member's starter page plus a second spell at x=4 (Bolt, or Touch for the runaway, into Hold) and 4 banked ink to draw it (ink grows through loot `onBank`, so the page is legal). The starters' data are untouched; nobody is granted a free Hold. Because Bolt is damage, "Bolt into Hold" is not a pure Hold: even the `no-hold` arm casts it (72 times) for the bolt, so the table measures *Hold valued by the bot*, not "Hold available vs not". Same corpus, seeds and pages for both arms; both use `gauge + cracks`.

| fight | no-hold wins | no-hold stalled seeds (s stall, x budget) | hold wins | hold stalled seeds (s stall, x budget) |
| --- | --- | --- | --- | --- |
| bridges sound r1 The first arch#0 p1 | 8/8 | — | 8/8 | — |
| bridges sound r1 The long stair#1 p1 | 8/8 | — | 8/8 | — |
| bridges sound r5 The great arch#0 p1 | 0/8 | 1s 2s 3s 4s 5s 6s 7s 8s | 0/8 | 1s 2s 3s 4s 5s 6s 7s 8s |
| bridges crumbling r1 The broken run#2 p1 | 8/8 | — | 8/8 | — |
| bridges crumbling r1 #3 p1 | 8/8 | — | 8/8 | — |
| bridges crumbling r5 The thin arch#1 p1 | 0/8 | 1s 2s 3s 4s 5s 6s 7s 8s | 0/8 | 1s 2s 3s 4s 5s 6s 7s 8s |
| bridges sound r1 The first arch#0 p2 | 8/8 | — | 8/8 | — |
| bridges sound r1 The long stair#1 p2 | 8/8 | — | 8/8 | — |
| bridges sound r5 The great arch#0 p2 | 8/8 | — | 8/8 | — |
| bridges crumbling r1 The broken run#2 p2 | 8/8 | — | 8/8 | — |
| bridges crumbling r1 #3 p2 | 8/8 | — | 8/8 | — |
| bridges crumbling r5 The thin arch#1 p2 | 8/8 | — | 8/8 | — |
| foundry 0 r1 The first flight#0 p1 | 8/8 | — | 8/8 | — |
| foundry 0 r1 The landing#1 p1 | 8/8 | — | 8/8 | — |
| foundry 0 r1 The stairwell#2 p1 | 8/8 | — | 8/8 | — |
| foundry 0 r5 The great bell#0 p1 | 8/8 | — | 8/8 | — |
| foundry 0 r5 The clapper hall#1 p1 | 6/8 | 5s 8s | 6/8 | 5s 8s |
| foundry 0 r5 The sounding yoke#2 p1 | 3/8 | 1s 2s 5s 7s 8s | 3/8 | 1s 2s 5s 7s 8s |
| foundry 4 r1 The first flight#0 p1 | 8/8 | — | 8/8 | — |
| foundry 4 r1 The landing#1 p1 | 8/8 | — | 8/8 | — |
| foundry 4 r1 The stairwell#2 p1 | 8/8 | — | 8/8 | — |
| foundry 4 r5 The great bell#0 p1 | 8/8 | — | 8/8 | — |
| foundry 4 r5 The clapper hall#1 p1 | 8/8 | — | 8/8 | — |
| foundry 4 r5 The sounding yoke#2 p1 | 4/8 | 1s 5s 7s 8s | 4/8 | 1s 5s 7s 8s |
| foundry 0 r1 The first flight#0 p2 | 8/8 | — | 8/8 | — |
| foundry 0 r1 The landing#1 p2 | 8/8 | — | 8/8 | — |
| foundry 0 r1 The stairwell#2 p2 | 8/8 | — | 8/8 | — |
| foundry 0 r5 The great bell#0 p2 | 8/8 | — | 8/8 | — |
| foundry 0 r5 The clapper hall#1 p2 | 8/8 | — | 8/8 | — |
| foundry 0 r5 The sounding yoke#2 p2 | 8/8 | — | 8/8 | — |
| foundry 4 r1 The first flight#0 p2 | 8/8 | — | 8/8 | — |
| foundry 4 r1 The landing#1 p2 | 8/8 | — | 8/8 | — |
| foundry 4 r1 The stairwell#2 p2 | 8/8 | — | 8/8 | — |
| foundry 4 r5 The great bell#0 p2 | 8/8 | — | 8/8 | — |
| foundry 4 r5 The clapper hall#1 p2 | 8/8 | — | 8/8 | — |
| foundry 4 r5 The sounding yoke#2 p2 | 8/8 | — | 8/8 | — |
| academy authored r1 The tiered seats#0 p1 | 8/8 | — | 8/8 | — |
| academy authored r1 The lectern#1 p1 | 8/8 | — | 8/8 | — |
| academy authored r1 The projection wall#2 p1 | 8/8 | — | 8/8 | — |
| academy authored r5 The owner's desk#0 p1 | 7/8 | — | 7/8 | 2s |
| academy authored r5 The unswept floor#1 p1 | 6/8 | — | 5/8 | — |
| academy authored r5 The shuttered window#2 p1 | 4/8 | 6s | 2/8 | 4s 6s |
| academy authored r1 The tiered seats#0 p2 | 8/8 | — | 8/8 | — |
| academy authored r1 The lectern#1 p2 | 8/8 | — | 8/8 | — |
| academy authored r1 The projection wall#2 p2 | 8/8 | — | 8/8 | — |
| academy authored r5 The owner's desk#0 p2 | 8/8 | — | 8/8 | — |
| academy authored r5 The unswept floor#1 p2 | 8/8 | — | 8/8 | — |
| academy authored r5 The shuttered window#2 p2 | 8/8 | — | 8/8 | — |
| baths authored r1 The changing hall#0 p1 | 8/8 | — | 8/8 | — |
| baths authored r1 The scrubbing floor#1 p1 | 8/8 | — | 8/8 | — |
| baths authored r1 The tepidarium#2 p1 | 8/8 | — | 8/8 | — |
| baths authored r5 The steward's caldarium#0 p1 | 8/8 | — | 8/8 | — |
| baths authored r5 The steward's caldarium#1 p1 | 8/8 | — | 8/8 | — |
| baths authored r5 The steward's caldarium#2 p1 | 8/8 | — | 8/8 | — |
| baths authored r1 The changing hall#0 p2 | 8/8 | — | 8/8 | — |
| baths authored r1 The scrubbing floor#1 p2 | 8/8 | — | 8/8 | — |
| baths authored r1 The tepidarium#2 p2 | 8/8 | — | 8/8 | — |
| baths authored r5 The steward's caldarium#0 p2 | 8/8 | — | 8/8 | — |
| baths authored r5 The steward's caldarium#1 p2 | 8/8 | — | 8/8 | — |
| baths authored r5 The steward's caldarium#2 p2 | 8/8 | — | 8/8 | — |
| **total** | 446/480 | 28 stalls, 0 budget, 72 Hold casts | 443/480 | 30 stalls, 0 budget, 240 Hold casts |



### Reading the Hold comparison

- **No gain.** 443/480 with the Hold policy against 446/480 without; stalls 30 against 28; Hold casts 240 against 72. The policy casts Hold three times as often and wins slightly less, all of the difference in academy at party 1 (owner's desk 7/8 both but one more stall, unswept floor 6/8 to 5/8, shuttered window 4/8 to 2/8): a pin there costs a turn's attack, and the `0.5` tie-break is enough to prefer it over a move that sets up a better line.
- **Bridges: Hold does not unlock the party-1 hearts.** Both span hearts stay 0/8 with every seed stalled, with or without Hold; party 2 is 8/8 either way. So the plan's suspicion that "small-party stalls may be a bot limit (fixed by EN-0 only if Hold is added)" is **not** supported for Hold. One probe of the sound heart (seed 1, party 1, `district` policy, no Hold): the chief warden stays at 8 HP while the lone draughtsman moves between two tiles every round (85 applied actions in 40 rounds, 15 casts, 5 damage events). That is a movement loop with no positive-gain cast, a greedy-bot limit but not a Hold limit. **Labelled for CAL-3: do not read the BR-21 party-1 rows (0/12) as balance evidence, and do not tune HP around them, until the loop is understood** (next step: print the chief's cast gains from the two tiles).
- Foundry yoke at party 1 differs between this table and section 1 (3/8 and 4/8 here against 0/8 and 1/8 in section 1) because the loadout gives a second Bolt spell, which is the same cause as the pulse note in section 1.
- Cannot distinguish balance from policy for: bridges hearts at party 1 (bot loop), foundry sounding yoke at party 1 (pulse weights, section 3), academy shuttered window at party 1 (stalls under `district` in both sections). These are labelled, not tuned.

## 3. Foundry pulse weights (task 3)

`pulseTerm` (`src/engine/districts/foundry/bot.ts`) had its weights as literals (foe +6, another +10 at 1 HP or less, member -15; CAL-plan §1.1). They now live in `FOUNDRY_TUNING.botPulse` (`src/data/districts/foundry.ts`) with the **same values**, read only by that term:

| key | value | meaning |
| --- | --- | --- |
| `botPulse.foe` | 6 | a foe standing where the next ring pulses |
| `botPulse.foeNearlyDown` | 10 | added when the foe has `nearlyDownHp` or less |
| `botPulse.nearlyDownHp` | 1 | the "nearly down" line (was the literal `u.hp <= 1`) |
| `botPulse.member` | 15 | subtracted for a party member there (never end a turn beside a ringing bell) |

Nothing else reads them and the game's own pulse numbers (`pulseDamage`, `alliedPulseDamage`) are untouched. The humming rule (R6-6: a tone already humming cannot ring again this round, so its tiles are not counted) is unchanged. Tests: `CAL-B: the pulse weights live in FOUNDRY_TUNING with the BF-20 values` and `CAL-B: the pulse term reads those weights`; the existing BF-20 pulse tests (`tests/sim/foundry.test.ts`) and the R6 humming review (`tests/districts/foundry/review.test.ts`) pass unchanged.

### Chosen policy and residual limits (for CAL-3 / CAL-4)

- **Chosen policy:** `{ gauge: true, cracks: true }`, no `hold`, no `lite` for tables (CAL-0's setting). `botTrial` (generator trials) keeps its `lite` default and sets neither `gauge`, `cracks` nor `hold`; **production is unchanged**. Options added: `BotOptions.hold` (opt-in, default off). Data keys added: `FOUNDRY_TUNING.botPulse.{foe, foeNearlyDown, nearlyDownHp, member}`.
- **BR-21 bot-limit caveat:** the party-1 bridge hearts stall in 8/8 seeds with and without Hold. The cause is a movement loop (one member alternating between two tiles with no positive-gain cast), not a missing Hold. Until it is understood, those rows measure the bot. Bridges room 1 at party 1 and every party-2 row of the corpus are not affected (rooms 2-4 were not measured).
- **Sounding yoke (foundry r5) at party 1:** wins 6/8 with `default`, 0/8 (0 bells) and 1/8 (4 bells) with the pulse term (section 1). The term helps the other foundry rooms, so it is kept. The suspected reason (a -15 member penalty makes a lone member refuse tiles from which it would strike) is **unconfirmed**; weights are not tuned here. CAL-4 should first try one fight with the term's member weight at 0 to see whether the yoke's result is the weight or the layout, and report that as a policy finding.
- **Academy shuttered window at party 1:** stalls in one seed (6) under `district` in section 1, and in seeds 6 (no Hold) and 4, 6 (Hold) in section 2. Registrar-note consequences are not read by the greedy bot (harness review watch item); do not read academy party-1 hearts as balance evidence.
- **Not covered:** trip-worn fights, party 3, drawn rooms and the ink quarter; the corpus is fresh fights at parties 1-2 only. Full district rates wait for EN-14.
