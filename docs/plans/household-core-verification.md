# Household core: verification (HC-9)

> Plan: [household-core-plan.md](household-core-plan.md) §6. Run on branch `worktree-agent-ace881886a2718c50` after HC-1 to HC-8 (and AH-7, DK-11) were merged. `pnpm check` green (162 test files, 5415 tests).

## 1. Plan §6 checks

| Check | Result | Where |
|---|---|---|
| Placement determinism and subsets | Pass. Also swept: every room variant (27) x 5 lineups x 10 seeds, plus random parties of 1-3 from all nine apprentices: distinct standable start points, same spots on replay, a smaller party takes the leading spots of the larger draw | `tests/engine/rooms.test.ts`, `tests/sim/household-sweep.test.ts` |
| Notation `P` parse/serialize, error cells | Pass | `tests/engine/rooms.test.ts` |
| `checkRoom` on all room data | Pass (27 rooms and the lock) | `tests/data/integrity.test.ts`, sweep |
| Save v9 round trip, older versions cleared | Pass | `tests/run/save.test.ts`, `tests/app/save.test.ts` |
| `joinHousehold` | Pass | `tests/run/household.test.ts` |
| Trips of 1-3 through win, wipe, reload replay, doorway, banking | Pass | `tests/run/party.test.ts`, sweep (whole bot trips) |
| Lock solvable from every point | Pass (HC-5, 60 seeds) | `tests/run/lock.test.ts` |
| Bot and fuzz: no throw, no event-cap overrun, nothing spawned on a blocked tile | Pass. The bot never threw in any room with any lineup. Random legal walks (400 under the flag) with parties from all nine apprentices: events project to the engine state, casts stay under `CAST_EVENT_CAP`, no two living units share a tile | `tests/sim/household-sweep.test.ts` |
| Win rate at party size 2 against the pre-change baseline | Pass, no drop (see §2) | sweep |
| Phone screenshots | Mostly done (see §3) | scratchpad `hc9/` |

New test file: `tests/sim/household-sweep.test.ts` (default run about 90 s of CPU across 24 tests, each under the 30 s timeout). `HOUSEHOLD_SWEEP=1` runs the full table, `HOUSEHOLD_SEEDS=n` sets the seed count (the flag defaults to 50), e.g. `HOUSEHOLD_SWEEP=1 HOUSEHOLD_SEEDS=20 pnpm vitest run tests/sim/household-sweep.test.ts --silent=false -t "D.S: no throw"`. `tests/sim/bot.ts` gained an optional `order` argument (default: the founders present, unchanged behaviour). `tests/sim/pre-household-layouts.json` holds the 27 room boards from before HC-W0 (fixed `D`/`S`), used only for the baseline.

## 2. Win rates (greedy bot, 20 seeds per room, 27 room variants, 540 fights per lineup)

Per-room fights start with full HP and charges, as in the calibration test. Same seeds, same pages.

| Party | Won | Lost | Stalled (40 rounds) | Weak rooms |
|---|---|---|---|---|
| Draughtsman alone | 94% | 6% | 0% | Heart of the Seam 30%, furnace hall 55%, lamp-mother's pool (variant 2) 45% |
| Stoker alone | 100% | 0% | 0% | none |
| Draughtsman + Stoker, drawn start points | 100% | 0% | 0% | none |
| Draughtsman + Stoker, old fixed `D`/`S` (baseline, same engine) | 100% | 0% | 0% | none |
| Draughtsman + Stoker + Lamp-pole runaway | 100% | 0% | 0% | none |

So the drawn start points and HC-3's padded points cost the pair nothing in a single room (540 of 540 against 540 of 540). Fresh-HP rooms are too easy to tell the sizes apart except for the Draughtsman alone.

**Whole trips** (bot, 20 seeds in each of the Seam and the canals = 40 trips per lineup; a trip ends cleared, wiped, at a doorway, or `stalled` when a fight hits 40 rounds):

| Party | Cleared | Wiped | Stalled | Doorway |
|---|---|---|---|---|
| Draughtsman | 10 | 12 | 15 | 3 |
| Stoker | 13 | 10 | 15 | 2 |
| Draughtsman + Stoker | 15 | 4 | 17 | 4 |
| Draughtsman + Stoker + runaway | 31 | 1 | 4 | 4 |
| Stoker + runaway + Draughtsman (slot order changed) | 34 | 1 | 1 | 4 |

The pair stalls in 17 of 40 trips: the greedy bot runs out of charges mid-trip and paces (the HC-4 note "bot stalls under drawn start points"). No stall appears in a fresh-HP room, so it is attrition, not placement. No trip baseline was recorded before HC (the old build is not runnable on this engine), so whether placement changed trips cannot be proved; the per-room result above says it did not change fights. With a third apprentice (the runaway) the stalls nearly disappear, so the extra casts, not the spots, carry the bot.

Nine apprentices alone (Seam rooms 1, 2 and 4 under the default run): no throw. A lone Junior notary and a lone Towel-bearer stall 40 rounds in Seam room 3 and the first three canal rooms (their pages are weak, and the bot's search over Splash aims makes each stalled fight take 10 to 20 s). Treat as a bot/page note, not an engine bug.

## 3. Phone checks (375x812, dev server from this worktree, port 5194)

Screens are in `/private/tmp/claude-501/-Users-olivera--claude-spares-spare-pJVSVk/52def9d9-b67f-48af-b375-f1a4621a0689/scratchpad/hc9/`:

- `01-shelf-three-slotted.jpg`: three seats (Draughtsman, Stoker, Lamp-pole runaway) and a Bench tab with one waiting; all three cards fit without horizontal scroll.
- `02-bench-sheet.jpg`: the bench sheet with the Junior notary, "Dormant: needs Tally", Open page and Bring.
- `03-fight-three-members.jpg`: a real Seam fight (6x8) with three members on drawn spots; the strip fits one row.
- `04-spoils-ledger-three.jpg`: spoils and the three-person ledger.
- `05-home-trip-page.jpg`: Home from the Seam (a forced win has no casts, so the ledger is empty here).
- `06-fight-one-member.jpg`: a one-member trip (Stoker), with the Shove button and one card.

Not captured: a drag in progress (needs touch hold; HC-7 tested the drag logic, `tests/app/shelf.test.ts`), the Lab 7x9 and 5x6 boards and the greyscale/dark pass (HC-8 and HC-6 captured these), the threshold with one apprentice (HC-5 tested by script), and light/dark. The Svelte MCP was unavailable, so no autofixer was run. Real iOS touch is untested.

## 4. Bugs and rough edges found (not fixed)

1. **Party strip order follows the drawn spot**, not slot order: slots Draughtsman, Stoker, Runaway showed Stoker, Runaway, Draughtsman (`03`). Known HC-8 follow-up; `PartyStrip` should order by `trip.party`. (DK-13 owns the file.)
2. **Ledger row overflow:** "Lamp-pole runaway" runs into its HP pips in the spoils ledger (`04`). Needs an ellipsis or a shorter display name.
3. **Study lattice toolbar:** "Fit" and "Edit scale" show as plain unstyled buttons over the page in the Study (`01`, `02`). May predate HC; check.
4. **Greedy bot stalls** in whole trips (see §2): 15 to 17 of 40 for one or two apprentices. Not a game bug, but it limits what the bot can say about trip balance.
5. **Lone notary or Towel-bearer** cannot win several rooms with the bot; fine for a recruit, but check their starter pages when RC balances.

## 5. Status notes for the orchestrator

**DESIGN.md §6.1 (household):** "Built (HC): the household is an open roster (the registry in `src/data/apprentices.ts` plus RC's recruits), kept in the profile in join order with three trip slots. A fresh notebook holds the pair in slots 1 and 2; slot 3 shows once the household has three or more. One household ink allowance (`Profile.ink`) serves every page; an ink pick raises it for all. Parties of 1 to 3 play every room with no scaling and no bonus. The Study shows the household shelf (seats, Bench tab, card detail, tap or drag to slot, locked during a trip)."

**DESIGN.md §6.4 (rooms and boards):** "Built (HC): rooms carry start points (`P`, at least four, 5-7 wide, 6-9 tall); each fight draws the party's spots from the trip seed, in slot order, and a smaller party takes the leading spots of the same draw. Threshold rooms use the slotted party and a fixed seed, so Retry repeats the spots. The 27 converted rooms stay 6x8 with mechanical extra points; CN and SM re-lay them. The bot finds no per-room loss for the pair under drawn spots (540 of 540 won)."

**DESIGN §11 log:** one line, "HC: the pair's start spots are drawn, not fixed; one ink allowance for the household; older saves are cleared (v9)."

**TECH §7 rows:**
- *Save v9:* breaking change; every older version takes the older-edition path (`OlderEditionError`), the old text is kept in the corrupt slots (`addCorrupt`), a new notebook starts; `legacyV7.ts` and the v8 reader are removed. Household, `ink`, `lattices` and `proof` are keyed by household members and validated on parse.
- *`P` notation:* `P` marks a start point on any standable tile (a state or water may share it; never a unit, plate, gate or grate). `parseBoard` returns `starts` in reading order, `serializeBoard` writes them back; apprentice letters stay legal for scenarios, tests and the Lab (fixed placement), but room data uses `P` only (`checkRoom` in `$engine/rooms`: width 5-7, height 6-9, 4+ `P`, no apprentice tokens).
- *Draw salt:* the party is placed by a seeded shuffle of the room's start points, seed `deriveSeed(trip.seed, START_SALT + encounter)` with `START_SALT = 6000` (`startSeedFor`), derived and never stored; a battle with no trip uses `deriveSeed(seed, START_SALT)`; threshold rooms use `THRESHOLD_SEED = 1`. The battle's own rng state is untouched.
- *Sim sweep:* `tests/sim/household-sweep.test.ts` (flag `HOUSEHOLD_SWEEP`, seeds `HOUSEHOLD_SEEDS`); `botFight(state, rounds, order)`.

**ROADMAP updates:**
- BL-129 (household core): built, verified; playtest gate open (a Seam trip with two then one apprentice, the shelf by thumb, start-point fairness, the 7x9 Lab board).
- New or amended follow-ups: party strip order by slot (DK-13); ledger name overflow; Study toolbar buttons; a trip-level bot that spends charges sensibly (stalls hide balance, 15 of 40 trips); CN/SM to restore the turn-1 bite as a strict rule and re-lay the padded start points by hand; rooms are too easy at full HP for any party of two or three, so trip attrition (not single rooms) is where the sizes will differ: tune by playing; threshold seed may be salted per save (DK-15); consider dropping the unused `members` parameter of `rollOffers`.
