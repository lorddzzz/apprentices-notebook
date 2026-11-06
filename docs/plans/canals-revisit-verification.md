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
