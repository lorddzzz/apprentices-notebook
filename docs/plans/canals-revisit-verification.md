# Canals revisit: verification sweep (CN-14)

Checked against `docs/plans/canals-revisit-plan.md` section 6 on branch `worktree-agent-af2c9639aa4d93f95`, based on main at 9b661ba (CN-F5). The phone checks ran on the `dev-alt` server (port 5190), which serves the main checkout at the same commit, so what was seen is the shipped build.

## 1. Golden fixtures

`tests/fixtures/district-kit/` canal files (`canals-win-2/4/5/6`, `canals-wipe-idle-1/4`, `lock-solve`, `lock-fire`) were re-recorded with `RECORD_GOLDEN=1 pnpm vitest run tests/run/golden.test.ts` and compared as parsed JSON against the committed files: **identical** (the re-record only changes whitespace, so the committed files were left alone). The canal fixtures were already regenerated from the current engine when CN-13's tuning and CN-7/CN-9 merged (the `DEEP` start HP 20 trips). `tests/run/golden.test.ts` (15 tests) is green.

## 2. Coverage table (plan section 6)

| Bullet | Covered by | Status |
|---|---|---|
| Mother's free-lamp call, cap, flare | `tests/scenarios/canals/mother.test.ts` (nearest free lamp, every lamp occupied, a call every non-flare round and a flare on 3 and 6, cap of four) | pass |
| Crate arrival causes: drift, Shove, Pull, Swap, step-jar, beached | `tests/scenarios/canals/barge.test.ts` (crate-drifts, -blocked, -beaches, -pushed-back, -pulled-onto-water, -opens-step-jar, moor-by-drift/shove/pull/swap) | pass |
| Every ruin | `barge.test.ts` (cargo-lost-fire, -burst, -strike, -crush, -eel, eel-prefers-member, no-credit). A fall (Drop) is untested, per CN-2's note | pass, Drop partial |
| Mooring and anchoring | `barge.test.ts` (moor-only-the-crate, anchored, moored-survives-reload, moored-grants-one-pick, unmoored-grants-nothing, bonus-survives-save) | pass |
| Room 4 with the Lamplighter | `tests/scenarios/canals/room4.test.ts` (5), `tests/scenarios/footnotes/canals-lamplighter.test.ts` | pass |
| Timing variants with `fourCombos` and capstones | `tests/scenarios/footnotes/canals-jar-fuse.test.ts` (jar:unit, jar:jar, fuse:unit, fuse:water fourCombos; jar-cap-ring, jar-cap-reseal, fuse-cap-chain, fuse-cap-reach), `canals-pitch-wick.test.ts`, `tests/scenarios/canal-lines.test.ts` | pass |
| The rival note | `canals-lamplighter.test.ts` (hidden without his page, offered with it, written in the margin) | pass |
| Run tests: recruit placement and guarantee | `tests/run/canals-recruit.test.ts` (10), `recruit-placement.test.ts` | pass |
| Key placement | `tests/run/canals-key.test.ts` (8: room 4 only, guaranteed on every seed, bridges heard, once per trip, lost on a wipe) | pass |
| Bonus pick and save round trip | `barge.test.ts` (moored-grants-one-pick, bonus-survives-save) | pass |
| Ledger banking across a wipe | `tests/districts/canal-ledgers.test.ts` (CN-9: filed in the profile at once, kept on a wipe) | pass |
| Fallback room 4 | `tests/data/canal-rooms.test.ts` (`layRival(…, false)`), `tests/sim/canal-rooms-play.test.ts` | pass |
| Bot targets: rooms 1-2 >=85%, room 3 >=75%, room 4 >=80% (fallback) or 65-80% (Lamplighter) | `tests/sim/canals.test.ts` "per-room fresh-HP win rates, party 2 and 3". CN-13 measured 100% on rooms 1-4 (pair, 50 seeds) | pass (above band on room 4 with the Lamplighter: 100% vs 65-80%; not tuned here) |
| Bot target: heart 50-65% per room | CN-13 tuned (player's pick): lamp-mother 56 HP, extra Snuffer and moth; pair 52% (layouts 50/82/24), trio 97%. Layout C is at 24% | pass overall, layout C below the band (reported by CN-13, not retuned) |
| Crate moored without trying in at most 25% of wins | `canals.test.ts` "the crate is moored without trying…": 0% rooms 2 and 4 | pass |
| Full trip with attrition (reported, not targeted) | `canals.test.ts` "whole trips with attrition": almost never clears the heart (0/100 seed scan, CN-13) | reported |
| Fuzz: canal trips at party 1-3 with crate and rival: no throw, cap held, crate never counted for the win, one key per trip | Party 1 sanity run and per-room party 2/3 runs in `canals.test.ts`; `barge.test.ts` won-with-crate-alive; `canals-key.test.ts` once-per-trip. No dedicated canal fuzz in `tests/sim/fuzz.test.ts` | partial: no single fuzz covers all four claims |
| Golden fixtures | section 1 | pass |
| Phone: each room size with three apprentices | Rooms 1 (5x9), 2 (6x9), 4 (6x9) and the heart (7x8) seen with two apprentices (the founding pair); the 7x7 room 3 was not photographed; three apprentices not reached (no Touch page) | partial |
| Phone: room 4 with rival telegraph + crate + current preview | section 3 | pass |
| Phone: landing card with a ledger and the runaway's offer | Ledger card seen; the runaway's offer not reachable (needs Fuse and Touch owned) | partial |
| Phone: Loot with the pass and a bonus pick | Loot seen at every room; the pass and a bonus pick not produced (forced wins skip mooring; the bridges were not heard) | not checked |
| Phone: the map's lock | section 3 | pass |
| Phone: the Jar margin | Not re-checked here (CN-F5 owns it) | not checked |
| Autofixer on every changed component | Run only on the two files edited here (`Cleared.svelte`, no issues); the others are per-task obligations of CN-10, CN-11 | not verified |

Also: `pnpm check:fast` green (269 files, 6957 tests). Full `pnpm check` result is in section 5.

## 3. Phone checks (375x812, localhost:5190)

Captures are under `docs/plans/canals-revisit-evidence/`. No horizontal overflow on any checked screen (`scrollWidth` 375 = `clientWidth`).

| Screen | Result | File |
|---|---|---|
| Canal room 1, "The lamplit quay" (5x9) | OK: one current lane, eel and rats, Draughtsman and Stoker | (seen, not kept) |
| Room 2, "The lock cottage", crate and mooring | OK: "Bonus pick: Moor the crate before the room is won." line; crate adrift on the lane (F4) with its tag; the mooring post (A4) ringed in dashes; current arrows read | `room2-crate-mooring.jpg` |
| Room 4, "The siphon" | OK: Lamplighter's lantern telegraph (red line and tinted tiles down column E to the Stoker), crate, mooring, current chevrons, bonus line | `room4-lamplighter.jpg` |
| Heart, "The lamp-mother's pool" (7x8) | OK: five lamps, mother 56/56 with HP bar, moths, Snuffer; board fits | `heart-pool.jpg` |
| Landing card with a ledger, after room 3 | OK: "A paper found: Lamp counts, in The Lamplighters's hand. Filed in the notebook." Leaves delivered 1, 2, 3 at rooms 1, 3, 5, as CN-9 specifies | `landing-card-ledger.jpg` |
| Map with the lock solved | OK: the opened lock (both leaves open, water line) beside "The oil-lit canals"; no burnt gate. Small (about 28 px), reads as a lock | `map-solved-lock.jpg` |
| Codex Papers tab (first phone check) | OK: "Lamp-ledgers" group, title, "In the hand of The Lamplighters", cursive text, no overflow. The build stamp sits over the last line at the bottom edge, as on every scrolling screen | `codex-papers.jpg` |

### Defects

1. **Possessive on the plural hand (fixed).** The loot note read "in The Lamplighters's hand". `Loot.svelte` now adds only an apostrophe after a name ending in s. Not seen in the browser after the fix (the preview server serves the main checkout, not this worktree); covered by `pnpm check:fast`.
2. **Canal heart ends on "The heart of the Seam is quiet." (fixed).** `Cleared.svelte` named the Seam for every district. It now reads the district's name (`placeInText(DISTRICTS[trip.district].name)`, "the oil-lit canals"). Not seen in the browser after the fix, same reason.
3. **Raw `{0}` in the Repeat card.** The Loot card for Repeat reads "{0} now, and once more next turn on the same tile." (`src/data/methods.ts` headline). Not canal-specific; a template slot that the offer card does not fill. Not fixed (data, not copy of this task).
4. **Layout C of the heart sits at 24%** for the pair (CN-13), well below the 50-65% band while the others are 50% and 82%. Reported, not retuned.
5. **Room 4 is at 100% for the bot, above the 65-80% band** with the Lamplighter. Reported, not retuned.

## 4. Not checked

The runaway's offer card (needs Touch and Fuse, and a landing after room 3), the wardens' pass and a real bonus pick on Loot, three apprentices on a canal board, room 3 (7x7), dark mode, device-only behaviour. The Jar margin phone check belongs to CN-F5.

## 5. Full gate

`pnpm check` (typecheck, lint, 291 test files including sims): green, 7496 passed, 1 skipped, 13 todo, no timeouts.

## 6. Rows for the orchestrator

DESIGN section 5b / section 11 (decisions made while building):
- The lamp-mother calls a moth every non-flare round at the nearest free lamp (an occupied lamp passes the call to the next); the flare stays every third round; cap four. Her HP is 56 (the player picked the heart tuning on 2026-10-29), with an extra Snuffer and moth in heart A and B and an extra moth in C.
- The crate is a bystander: it floats, never plans, can be ruined by fire, a burst, a stray Strike, a plate crush or the eel, and is never a win condition; moored (by any cause) it anchors and grants exactly one extra pick, which survives a save.
- Room 4 spawns the Lamplighter (banks his lantern page on a win) with a Snuffer fallback while `RIVALS_LIVE.lamplighter` is off.
- The wardens' pass is a guaranteed offer after room 4 once the bridges are heard; one key per trip; lost on a wipe.
- Lamp-ledger leaves are filed at each landing whose return policy allows home (rooms 1, 3 and the heart for a fresh profile), kept on a wipe.
- The canals' solved lock draws as an opened lock, not a burnt gate.

TECH section 7:
- `KitGate.afterRoom/guaranteed` and a `guaranteedKey` offer contributor; `EnemyDef.floats/bystander/summon` and `summonRule(e)`; core events `moored` and `cargoLost`; `findLandingPaper` in `engine/papers.ts`; `layRival(layout, live)` in canal data; `DistrictNode` draws a registered `solvedArt`.
- Golden canal trips use `DEEP` (start HP 20) because attrition trips almost never clear the heart.

ROADMAP:
- BL-91: done (CN-1). BL-119: done (CN-11), phone-checked here. BL-124: built, awaiting CN-P1. BL-92: calibrated by CN-13; the sim now shows heart layout C at 24% and room 4 at 100%, keep open for the playtest.
- New: add a canal fuzz at party 1-3 with crate and rival to `tests/sim` (partial coverage now). Fix the Repeat card's raw `{0}`. Photograph the runaway's offer, the pass and a bonus pick once reachable. Dark mode still unchecked.

## 7. CAL-1 baseline

The CAL-1 tables use seeds 1–50 per fresh layout and 50 complete trip starts per party and room-4 configuration. The trio adds the Runaway to the founding pair. Fresh entries start with full HP and charges. Worn entries come from earlier fights on the same run through the app's trip flow. The bot takes the first offer, keeps the doorway page, and always pushes on. It uses the shared greedy policy with gauge and cracks enabled, Hold scoring off, a 40-round limit, and a 600-action budget. Stalls and budget stops are visible in the tables.

Run the registered-room sweep with `CAL_DISTRICTS=seam,canals CAL=1 pnpm vitest run tests/sim/calibration-tables.test.ts --reporter=dot`. For crate and stand-in details, run `CAL1_MEASURE=canals-live` and `CAL1_MEASURE=canals-stand-in` with `pnpm vitest run tests/sim/seam-calibration.test.ts -t 'CAL-1 measurement' --reporter=dot`. The stand-in sweep substitutes the Snuffer via `layRival` for room 4 during the test and restores the layouts afterward.


### Fresh win bands with the Lamplighter

| Depth | Solo | Pair | Trio | Pair band | Pair result | Trio minus pair | Trio margin result |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | 150/150 (100.0%) | 150/150 (100.0%) | 150/150 (100.0%) | ≥85% | met | +0.0 points | met |
| 2 | 150/150 (100.0%) | 150/150 (100.0%) | 150/150 (100.0%) | ≥85% | met | +0.0 points | met |
| 3 | 150/150 (100.0%) | 150/150 (100.0%) | 150/150 (100.0%) | ≥75% | met | +0.0 points | met |
| 4 | 150/150 (100.0%) | 150/150 (100.0%) | 150/150 (100.0%) | 65–80% | 20.0 points high | +0.0 points | met |
| 5 | 0/150 (0.0%) | 78/150 (52.0%) | 146/150 (97.3%) | 50–65% | met | +45.3 points | 35.3 points above the +10 limit |

The fresh pair's heart results by layout are A 50%, B 82% and C 24%, a 58-point spread. Their trio counterparts are 92%, 100% and 100%, for margins of +42, +18 and +76 points. The 50–65% contract applies to the pooled heart.

### All layouts with the Lamplighter

Each cell shows wins/reached, mean total HP/charges on entry, and mean final round. A stop suffix, when present, gives all stalls / the subset stopped by the action budget. All worn rows are out of 50 trip starts per party, with the reached counts split by layout.

| State | Depth | Layout | Solo | Pair | Trio |
| --- | --- | --- | --- | --- | --- |
| fresh | 1 | A · The towpath | 50/50 · 6.0/5.0 · 4.0 r | 50/50 · 14.0/10.0 · 2.0 r | 50/50 · 20.0/16.0 · 2.0 r |
| fresh | 1 | B · The coal wharf | 50/50 · 6.0/5.0 · 4.0 r | 50/50 · 14.0/10.0 · 2.1 r | 50/50 · 20.0/16.0 · 1.9 r |
| fresh | 1 | C · The lamplit quay | 50/50 · 6.0/5.0 · 4.0 r | 50/50 · 14.0/10.0 · 2.0 r | 50/50 · 20.0/16.0 · 2.0 r |
| fresh | 2 | A · The drowned arcade | 50/50 · 6.0/5.0 · 3.7 r | 50/50 · 14.0/10.0 · 2.2 r | 50/50 · 20.0/16.0 · 2.0 r |
| fresh | 2 | B · The eel steps | 50/50 · 6.0/5.0 · 3.3 r | 50/50 · 14.0/10.0 · 2.2 r | 50/50 · 20.0/16.0 · 2.2 r |
| fresh | 2 | C · The lock cottage | 50/50 · 6.0/5.0 · 3.6 r | 50/50 · 14.0/10.0 · 2.4 r | 50/50 · 20.0/16.0 · 2.3 r |
| fresh | 3 | A · The sluice | 50/50 · 6.0/5.0 · 5.2 r | 50/50 · 14.0/10.0 · 2.3 r | 50/50 · 20.0/16.0 · 2.2 r |
| fresh | 3 | B · The crossing | 50/50 · 6.0/5.0 · 5.4 r | 50/50 · 14.0/10.0 · 2.1 r | 50/50 · 20.0/16.0 · 2.1 r |
| fresh | 3 | C · The tanners' cut | 50/50 · 6.0/5.0 · 5.7 r | 50/50 · 14.0/10.0 · 2.4 r | 50/50 · 20.0/16.0 · 2.2 r |
| fresh | 4 | A · The uphill reach | 50/50 · 6.0/5.0 · 6.8 r | 50/50 · 14.0/10.0 · 3.1 r | 50/50 · 20.0/16.0 · 2.9 r |
| fresh | 4 | B · The lamp market | 50/50 · 6.0/5.0 · 5.9 r | 50/50 · 14.0/10.0 · 3.0 r | 50/50 · 20.0/16.0 · 2.7 r |
| fresh | 4 | C · The siphon | 50/50 · 6.0/5.0 · 7.2 r | 50/50 · 14.0/10.0 · 3.1 r | 50/50 · 20.0/16.0 · 2.8 r |
| fresh | 5 | A · The lamp-mother's pool | 0/50 · 6.0/5.0 · 13.2 r | 25/50 · 14.0/10.0 · 26.2 r | 46/50 · 20.0/16.0 · 12.0 r |
| fresh | 5 | B · The lamp-mother's pool | 0/50 · 6.0/5.0 · 21.9 r | 41/50 · 14.0/10.0 · 22.7 r | 50/50 · 20.0/16.0 · 11.4 r |
| fresh | 5 | C · The lamp-mother's pool | 0/50 · 6.0/5.0 · 13.6 r | 12/50 · 14.0/10.0 · 19.8 r | 50/50 · 20.0/16.0 · 11.6 r |
| trip-worn | 1 | A · The towpath | 17/17 · 6.0/5.0 · 4.0 r | 17/17 · 14.0/10.0 · 2.0 r | 17/17 · 20.0/16.0 · 2.0 r |
| trip-worn | 1 | B · The coal wharf | 18/18 · 6.0/5.0 · 4.0 r | 18/18 · 14.0/10.0 · 2.0 r | 18/18 · 20.0/16.0 · 1.9 r |
| trip-worn | 1 | C · The lamplit quay | 15/15 · 6.0/5.0 · 4.0 r | 15/15 · 14.0/10.0 · 2.0 r | 15/15 · 20.0/16.0 · 2.0 r |
| trip-worn | 2 | A · The drowned arcade | 12/12 · 6.0/1.3 · 4.2 r | 12/12 · 14.0/6.8 · 2.1 r | 12/12 · 20.0/12.8 · 2.0 r |
| trip-worn | 2 | B · The eel steps | 18/18 · 6.0/1.4 · 3.4 r | 18/18 · 13.9/6.8 · 2.4 r | 18/18 · 20.0/12.5 · 2.4 r |
| trip-worn | 2 | C · The lock cottage | 20/20 · 6.0/1.5 · 4.0 r | 20/20 · 14.0/6.7 · 2.2 r | 20/20 · 20.0/12.5 · 2.1 r |
| trip-worn | 3 | A · The sluice | 9/17 · 5.4/0.0 · 23.1 r · 8/0 stops | 17/17 · 13.5/3.1 · 3.4 r | 17/17 · 19.8/8.9 · 2.5 r |
| trip-worn | 3 | B · The crossing | 10/15 · 5.5/0.0 · 17.4 r · 5/0 stops | 15/15 · 13.6/2.9 · 3.7 r | 15/15 · 19.8/8.7 · 2.9 r |
| trip-worn | 3 | C · The tanners' cut | 18/18 · 5.7/0.0 · 8.1 r | 16/18 · 13.4/3.3 · 7.2 r · 2/0 stops | 18/18 · 19.8/8.8 · 2.4 r |
| trip-worn | 4 | A · The uphill reach | 5/13 · 4.5/0.0 · 5.1 r | 17/17 · 12.5/0.4 · 5.8 r | 17/17 · 18.6/5.3 · 3.1 r |
| trip-worn | 4 | B · The lamp market | 8/9 · 4.3/0.0 · 6.8 r | 11/12 · 12.7/0.3 · 8.6 r · 1/0 stops | 13/13 · 18.2/5.4 · 3.0 r |
| trip-worn | 4 | C · The siphon | 7/15 · 4.7/0.0 · 5.4 r | 19/19 · 12.9/0.2 · 6.5 r | 20/20 · 18.8/5.4 · 4.0 r |
| trip-worn | 5 | A · The lamp-mother's pool | 0/7 · 3.6/0.0 · 9.4 r | 0/18 · 10.3/0.0 · 19.9 r | 1/20 · 17.0/2.9 · 22.1 r |
| trip-worn | 5 | B · The lamp-mother's pool | 0/7 · 3.6/0.0 · 9.1 r | 0/14 · 10.4/0.0 · 20.6 r | 2/15 · 17.7/3.1 · 23.9 r |
| trip-worn | 5 | C · The lamp-mother's pool | 0/6 · 3.7/0.0 · 10.0 r | 0/15 · 9.9/0.0 · 18.8 r | 0/15 · 16.3/3.5 · 20.2 r |

### CN-13 reproduction

`CAL1_MEASURE=canals-legacy` ran 100 worn pair trips in the current Lamplighter rooms with the older CN-13 policy settings (40 rounds, default scoring, unlimited action budget). **0/100** cleared the heart. It was reached 85 times (A/B/C 25/30/30); all 85 hearts ended in losses. Fourteen trips stalled before it and one wiped earlier. The pair entered the heart with about 10.2 total HP (14.0 fresh) and 0 charges (10 fresh). The crate moored in 0/100 room-2 wins and 58/85 room-4 wins (68.2%, 43.2 points above 25%). Trip clears are reported as attrition evidence.


### Crate and worn attrition with the Lamplighter

Accidental mooring means a `moored` event for `barge-1` in a win by the greedy bot, which assigns no value to the bystander crate. The fresh pair meets the 25% limit in both rooms (0/150 each). Worn room 4 is **34/47 (72.3%)**, 47.3 points above the threshold. Fresh solo room 4 is **107/150 (71.3%)**, 46.3 points above. Worn solo room 4 rises to **19/20 (95.0%)**, 70.0 points above. Room 2 has one accidental mooring across the worn solo wins (1/50) and none in the other cohorts.

| Party | State | Depth | Wins/reached | Stalls/budget stops | Mean HP in → out | Mean charges in → out | Crate moored/wins |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | fresh | 2 | 150/150 | 0/0 | 6.0 → 5.4 | 5.0 → 1.7 | 0/150 (0.0%) |
| 1 | fresh | 4 | 150/150 | 0/0 | 6.0 → 5.7 | 5.0 → 0.4 | 107/150 (71.3%) |
| 1 | trip-worn | 1 | 50/50 | 0/0 | 6.0 → 6.0 | 5.0 → 1.4 | — |
| 1 | trip-worn | 2 | 50/50 | 0/0 | 6.0 → 5.6 | 1.4 → 0.0 | 1/50 (2.0%) |
| 1 | trip-worn | 3 | 37/50 | 13/0 | 5.5 → 4.7 | 0.0 → 0.0 | — |
| 1 | trip-worn | 4 | 20/37 | 0/0 | 4.5 → 2.0 | 0.0 → 0.0 | 19/20 (95.0%) |
| 1 | trip-worn | 5 | 0/20 | 0/0 | 3.6 → 0.0 | 0.0 → 0.0 | — |
| 2 | fresh | 2 | 150/150 | 0/0 | 14.0 → 13.7 | 10.0 → 6.3 | 0/150 (0.0%) |
| 2 | fresh | 4 | 150/150 | 0/0 | 14.0 → 13.5 | 10.0 → 5.0 | 0/150 (0.0%) |
| 2 | trip-worn | 1 | 50/50 | 0/0 | 14.0 → 14.0 | 10.0 → 6.8 | — |
| 2 | trip-worn | 2 | 50/50 | 0/0 | 14.0 → 13.5 | 6.8 → 3.1 | 0/50 (0.0%) |
| 2 | trip-worn | 3 | 48/50 | 2/0 | 13.5 → 12.7 | 3.1 → 0.3 | — |
| 2 | trip-worn | 4 | 47/48 | 1/0 | 12.7 → 10.1 | 0.3 → 0.0 | 34/47 (72.3%) |
| 2 | trip-worn | 5 | 0/47 | 0/0 | 10.2 → 0.0 | 0.0 → 0.0 | — |
| 3 | fresh | 2 | 150/150 | 0/0 | 20.0 → 19.8 | 16.0 → 12.3 | 0/150 (0.0%) |
| 3 | fresh | 4 | 150/150 | 0/0 | 20.0 → 19.4 | 16.0 → 11.0 | 0/150 (0.0%) |
| 3 | trip-worn | 1 | 50/50 | 0/0 | 20.0 → 20.0 | 16.0 → 12.6 | — |
| 3 | trip-worn | 2 | 50/50 | 0/0 | 20.0 → 19.8 | 12.6 → 8.8 | 0/50 (0.0%) |
| 3 | trip-worn | 3 | 50/50 | 0/0 | 19.8 → 18.6 | 8.8 → 5.3 | — |
| 3 | trip-worn | 4 | 50/50 | 0/0 | 18.6 → 16.9 | 5.4 → 3.1 | 3/50 (6.0%) |
| 3 | trip-worn | 5 | 3/50 | 0/0 | 17.0 → 0.0 | 3.1 → 0.0 | — |

Mean HP and charges include losses and stalls. The pair carries 10.0 charges into room 1, 0.3 on average into room 4 and 0.0 into the heart. The live trip clears are 0/50 solo, 0/50 pair and 3/50 trio. The solo ends are 37 losses and 13 stalls, the pair ends are 47 losses and 3 stalls, and the remaining trio runs are losses.

### The Snuffer stand-in

The substitution affects fresh room 4 and the worn route from room 4 onward. All earlier worn results match the Lamplighter trials. The pair and trio both win all 150 fresh room-4 fights, meeting the fallback floor of 80% with a 0-point trio margin. Pair crate rates are 0/150 fresh and 6/34 (17.6%) worn, inside the limit. Solo rates are 70/150 (46.7%) fresh and 29/35 (82.9%) worn, 21.7 and 57.9 points above. Trio rates are 0/150 fresh and 1/50 (2.0%) worn.

| Party | State | Depth | Layout | Wins/reached | Stalls/budget stops | Mean HP in → out | Mean charges in → out | Crate moored/wins |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | fresh | 4 | A | 50/50 | 0/0 | 6.0 → 5.9 | 5.0 → 0.6 | 50/50 |
| 1 | fresh | 4 | B | 50/50 | 0/0 | 6.0 → 5.7 | 5.0 → 1.2 | 0/50 |
| 1 | fresh | 4 | C | 50/50 | 0/0 | 6.0 → 5.9 | 5.0 → 0.7 | 20/50 |
| 1 | trip-worn | 4 | A | 13/13 | 0/0 | 4.5 → 3.9 | 0.0 → 0.0 | 13/13 |
| 1 | trip-worn | 4 | B | 7/9 | 0/0 | 4.3 → 2.9 | 0.0 → 0.0 | 4/7 |
| 1 | trip-worn | 4 | C | 15/15 | 0/0 | 4.7 → 4.1 | 0.0 → 0.0 | 12/15 |
| 1 | trip-worn | 5 | A | 0/12 | 0/0 | 4.0 → 0.0 | 0.0 → 0.0 | — |
| 1 | trip-worn | 5 | B | 0/12 | 0/0 | 3.8 → 0.0 | 0.0 → 0.0 | — |
| 1 | trip-worn | 5 | C | 0/11 | 0/0 | 4.1 → 0.0 | 0.0 → 0.0 | — |
| 2 | fresh | 4 | A | 50/50 | 0/0 | 14.0 → 13.5 | 10.0 → 5.5 | 0/50 |
| 2 | fresh | 4 | B | 50/50 | 0/0 | 14.0 → 13.8 | 10.0 → 6.1 | 0/50 |
| 2 | fresh | 4 | C | 50/50 | 0/0 | 14.0 → 13.5 | 10.0 → 5.2 | 0/50 |
| 2 | trip-worn | 4 | A | 17/17 | 0/0 | 12.5 → 10.9 | 0.4 → 0.1 | 1/17 |
| 2 | trip-worn | 4 | B | 7/12 | 5/0 | 12.7 → 10.9 | 0.3 → 0.0 | 0/7 |
| 2 | trip-worn | 4 | C | 10/19 | 9/0 | 12.9 → 11.4 | 0.2 → 0.0 | 5/10 |
| 2 | trip-worn | 5 | A | 0/14 | 0/0 | 11.4 → 0.0 | 0.1 → 0.0 | — |
| 2 | trip-worn | 5 | B | 0/10 | 0/0 | 10.8 → 0.0 | 0.0 → 0.0 | — |
| 2 | trip-worn | 5 | C | 0/10 | 0/0 | 10.2 → 0.0 | 0.0 → 0.0 | — |
| 3 | fresh | 4 | A | 50/50 | 0/0 | 20.0 → 19.7 | 16.0 → 11.7 | 0/50 |
| 3 | fresh | 4 | B | 50/50 | 0/0 | 20.0 → 19.5 | 16.0 → 12.4 | 0/50 |
| 3 | fresh | 4 | C | 50/50 | 0/0 | 20.0 → 19.5 | 16.0 → 11.4 | 0/50 |
| 3 | trip-worn | 4 | A | 17/17 | 0/0 | 18.6 → 16.8 | 5.3 → 3.6 | 0/17 |
| 3 | trip-worn | 4 | B | 13/13 | 0/0 | 18.2 → 16.8 | 5.4 → 3.3 | 0/13 |
| 3 | trip-worn | 4 | C | 20/20 | 0/0 | 18.8 → 16.9 | 5.4 → 3.4 | 1/20 |
| 3 | trip-worn | 5 | A | 0/20 | 0/0 | 16.5 → 0.0 | 3.3 → 0.1 | — |
| 3 | trip-worn | 5 | B | 1/15 | 0/0 | 17.5 → 0.1 | 3.5 → 0.0 | — |
| 3 | trip-worn | 5 | C | 0/15 | 0/0 | 16.7 → 0.0 | 3.6 → 0.0 | — |

Full-trip clears with the stand-in are 0/50 solo, 0/50 pair and 1/50 trio. The solo ends are 37 losses and 13 stalls, the pair ends are 34 losses and 16 stalls, and the other 49 trio runs are losses.


### CAL-1 task 3

The Lamp-mother stays at 56 HP, moth cap four and flare every third round. Heart B moves its Snuffers to C3 and A7. Heart C moves the Lamp-mother down the lane to D6 and the moths to A2 and F2. The uphill reach and the siphon move the crate onto the eel's lane, six drifts from the mooring on a clear route. The uphill reach uses B7 to B1 and the siphon uses C7 to C1. Both retain their original start points.

The registered-room comparison uses `CAL_DISTRICTS=canals CAL=1 pnpm vitest run tests/sim/calibration-tables.test.ts --reporter=dot`. The live and stand-in crate counts come from the same seeds using `CAL1_PARTY=2 CAL1_MEASURE=canals-live` and `CAL1_PARTY=2 CAL1_MEASURE=canals-stand-in` with the measurement case in `tests/sim/seam-calibration.test.ts`. The fresh cohorts use seeds 1–50 per layout and the worn cohorts start 50 trips. Both use starter lattices, gauge plus cracks, 40 rounds, a 600-action budget, first loot and the unchanged doorway page.

| Pair measure | Before | After | Target |
| --- | --- | --- | --- |
| Fresh heart A / B / C | 25/50 / 41/50 / 12/50 | 25/50 / 31/50 / 38/50 | Layout spread 58 → 26 percentage points |
| Fresh heart pooled | 78/150 (52.0%) | 94/150 (62.7%) | 50–65% |
| Fresh room 4, live | 150/150 | 150/150 | 65–80%, still 20 points above the ceiling |
| Fresh room 4, stand-in | 150/150 | 150/150 | At least 80% |
| Fresh crate mooring, room 2 / live room 4 | 0/150 / 0/150 | 0/150 / 0/150 | At most 25% of wins |
| Worn crate mooring, room 2 / live room 4 | 0/50 / 34/47 (72.3%) | 0/50 / 10/47 (21.3%) | At most 25% of wins |
| Worn crate mooring, stand-in room 4 | 6/34 (17.6%) | 0/36 | At most 25% of wins |
| Worn trips cleared, live / stand-in | 0/50 / 0/50 | 3/50 / 2/50 | Attrition reported |

Live worn crate counts by room-four layout are A 0/17, B 3/11 and C 7/19. The live pair reached room 4 on 48 of 50 trips and won 47, as before. They reached the heart with about 9.6 HP and zero charges, compared with 10.2 HP and zero charges before. Heart C accounts for all three live clears and nine heart stalls. The fresh stand-in crate rate remained 0/150.

The fresh solo still wins 0/150 hearts. Heart C changes from 50 solo losses to 50 stalls at the round limit. Worn solo trips still clear 0/50, with 32 losses and 18 stalls after, compared with 37 losses and 13 stalls before. The fresh trio stays at 146/150 (97.3%), so the trio gap narrows from 45.3 to 34.7 percentage points. Worn trio clears rise from 3/50 to 9/50, with 36 losses and five stalls, all of the stalls in heart C.

Eight-seed tests of the Lamplighter at 10–36 HP still won every fresh pair fight in the uphill reach and siphon. At 60 HP the uphill reach won 9/12, with three round-limit stalls and a 27.8-round mean, up from about three rounds at 6 HP. A 42 HP Lamplighter crashed the live lamp market at fresh pair seed 9, round 6. In move scoring, the Stoker's hypothetical move from B1 to C1 opens the Lamplighter's step jar. Spark and pool fire take the Stoker to 0 HP, then the bot tries to score a south Shove in that hypothetical state. The rival's 6 HP is retained. Placement and terrain candidates that passed the layout checks also kept the fresh pair undefeated in screening.

An uphill reach candidate with a B8–B2 crate route and an A9 start reproduced the same bot flaw at worn trio seed 8. At round 5, a hypothetical move to C2 opens a lantern which kills the Draughtsman, then the bot tries to score a north Shove with her. The original uphill reach resolves this seed. The selected B7–B1 route and the original A8 start ran all 17 worn-trio visits to the uphill reach without a bot exception.

Canal win replays still use the original seeds and `DEEP` at 20 HP per apprentice. Seeds 2 and 5 no longer moor the crate in room 4 and still clear the heart. Seed 4's event changes concern the crate's drift, and seed 6 replayed the existing fixture.

The four-file play-through and replay check passed 21/21 with recording off. The canal layout and live Lamplighter scenario checks passed 22/22. The fast gate passed 8,702 tests across 413 files.
