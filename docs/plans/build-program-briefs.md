# Build program: briefs for the packs not started yet

Spawn `pack-worker` with the role's model and effort and paste one brief as written ([templates](../../.claude/skills/implement/templates.md)). Delete a brief when its pack merges. A routine window runs these; a design window writes the next ones (listed at the end). Written in the design window of 2026-11-12 (A, S, D2, F2, B2, C2, F3 and KIT-R3a merged; their briefs are deleted).

## Order for the routine window

Two or three at a time; a pack starts when the packs in its "Starts when" are merged. Packs on one line own disjoint files and may run together. **Sims:** D3c, D4, F9, M and MIX run `tests/sim`; never two of them at once.

| Wave | Packs (together) | Starts when |
|---|---|---|
| 5 | **D3b** heart frames · **F4** foundry rooms 1–4 · **E1** KIT-R4 | now |
| 6 | **D3c** lent shapes and bot terms · **C3** bridges footnotes · **EF** EN-5 | D3c: D3b and E1 merged · C3: now · EF: now |
| 7 | **D4** EN-S1 · **F6** foundry heart and loot · **ED** ledger and owner | D4: D3c · F6: F4 and D3b · ED: E1 and C3 |
| 8 | **F5** foundry footnote audit · **F7** foundry thresholds and floor · **F8** foundry screens | F5: C3 and ED · F7: F6 · F8: F6 |
| 9 | **F9** foundry proof and open · **CW0** cartographers contracts · **O** FU-21 | F9: F7 and F8 · CW0: any free slot · O: ED |
| free slots | **G** BL-110 · **H** BL-111 · **K** FU-9–12 · **L** FU-13–16 · **J** FU-6–8 · **B1** FU-1 · **I** FU-2–5 · **M** FU-17–20 · **MIX** MIX-1 | G, H, K, L: now · J, B1: D3c · I: F5 (both edit `src/data/lines.ts`) · M, MIX: no other sims pack running |

File clashes that set this order: D3b and D3c both edit the district module files; E1 and D3c both edit `src/engine/sim/bot.ts`; C3 and ED both edit the cast paths (`resolve.ts`, `bursts.ts`, `inventions.ts`, `solvents.ts` callers); C3, ED, F5 and I all edit `src/data/lines.ts`; F4, F6, F7 and F9 share `src/data/districts/foundry.ts` (one at a time); D3c and B1 both edit `districts/types.ts`; D3c and J both edit `bathhouses/**`; ED and O both touch `solvents.ts`. UI ports: E1 and F8 5191, K 5192, L 5193 (E1 and F8 never overlap).

Every brief's "Leaves for later" items are also in the status file's Owed list.

## Pack D3b: heart frames (Default: Sonnet medium; escalate to Sonnet high)

```
Pack D of docs/plans/platform-closure-plan.md: tasks KIT-R3b → KIT-R3c → KIT-R3d → KIT-R3e.

Read: platform-closure-plan.md P7, P8 and Pack D's rows; ending-plan.md P13; pattern:
src/engine/districts/inkQuarter/heart.ts with tests/districts/heart-frames.test.ts (the exemplar).
Own: src/engine/districts/frame.ts (new), src/engine/districts/inkQuarter/heart.ts (move onto the helper),
src/engine/districts/seam/heartFrame.ts, canals/heartFrame.ts, bathhouses/heartFrame.ts,
bridges/heartFrame.ts (all new), the `heart:` line in src/engine/districts/{seam,canals,bathhouses,bridges}.ts,
tests/districts/heart-frames.test.ts. Not `bot`, `shapes`, types.ts or registry.ts (Pack D3c).
Contract (on main):
- `HeartSetup { foe: EnemyId | KitId; rules: readonly RuleId[]; frame(board: BoardSpec, seed: number): BoardSpec }`.
  `frame` is pure and seeded; it keeps the board's size, places the master and its roster without
  stacking two on a tile, leaves at least `ROOM_LIMITS.minStarts` start points, and its result passes
  `checkRoom` on every legal size (5–7 wide, 6–9 tall); a 5x5 test board must not throw.
- KIT-R3b first writes src/engine/districts/frame.ts with the exemplar's steps, unchanged:
  `export interface Placement { token: string; at: { x: number; y: number } }` (fractions 0..1);
  `export function placementsFrom(source: BoardSpec): Placement[]`: every unit, piece and terrain cell
  of the source that is neither plain nor a start point, `at = { x: x / (w - 1), y: y / (h - 1) }`,
  the master first, then the other units, pieces, then terrain, each group in reading order;
  `export function placeFrame(board, seed, salt, placements, structure?): BoardSpec`: mirror and lean
  from `createRng(deriveSeed(seed, salt))` as the exemplar, each placement settled to the nearest bare
  tile (no unit, piece, start point, terrain flag or state), the whole cell copied (unit, piece,
  terrain, state), then start points topped up on the bottom rows; `structure` (optional) stamps a
  district's structure first and the placements settle around it.
  Ink's frame calls `placeFrame(board, seed, 7100, PLACEMENTS)`: record its boards (7x9, seeds 1–4,
  serialized) in the test before the move and assert them equal after.
- Each district: `const SOURCE = parseBoard(<the district's first authored heart variant's layout>)`
  read from src/data/districts/<id>.ts (never retyped); placements `placementsFrom(SOURCE)` at module
  load; salts seam 7110, canals 7120, bathhouses 7130, bridges 7140; `foe` is the master's id; `rules`
  are the rule ids the district runs in its heart room (as the exemplar lists `inkQuarter:clock`).
- Structures (stamped, never scattered): canals: the current as one closed clockwise loop, the
  authored loop's bounding box scaled to the board (at least 3x3, kept off the bottom two rows), with
  the lamp-mother on it and lamps on the rim; bathhouses: a 4-connected steam pool of at least 4 tiles
  (the authored pool's bounding box scaled) with the Steward on it; bridges: the Chief Warden on
  `{keystone}`, piers and fog by placement, every other tile `{span}` as bridgeBoard lays it, and a fog
  cell that would leave a span unsupported is dropped. The Seam needs none.
Owed by this pack: `DistrictModule.heart` for Seam, canals, bathhouses, bridges (status Owed).
Leaves for later: `bot` and lent shapes (D3c); the foundry's frame (BF-12) and the cartographers'
(CG-10) use frame.ts; EN-K1–K5 wrap these frames in `HeartFrame` with their fallback boards.

Done when (each test copies the exemplar's loop with the district's real heart size added):
- KIT-R3b: "KIT-R3: seam frame places the Marginalia on 5x5, 7x9 and the real room size, seeded" and
  "KIT-R3: the frame helper leaves the ink frame's boards unchanged" pass; the ink test passes unchanged.
- KIT-R3c: "KIT-R3: canals frame places the lamp-mother on 5x5, 7x9 and the real room size, seeded" and
  "KIT-R3: canals frame's current is one closed loop and the lamp-mother stands on it" pass.
- KIT-R3d: "KIT-R3: bathhouses frame places the Bath-Steward on 5x5, 7x9 and the real room size, seeded"
  and "KIT-R3: bathhouses frame stands the Steward on a connected cloud of four or more tiles" pass.
- KIT-R3e: "KIT-R3: bridges frame places the Chief Warden on 5x5, 7x9 and the real room size, seeded" and
  "KIT-R3: bridges frame stands the Chief Warden on the keystone and no span starts cracked" pass
  (cracked read through `crackedTiles` on a battle built from the frame).
- tests/districts and tests/run pass unchanged otherwise.
A test you had to change is a Proposal in your report.

Verify: `pnpm vitest run tests/districts/heart-frames.test.ts tests/districts tests/run --reporter=dot`
```

## Pack F4: foundry rooms 1–4 (Default: Sonnet medium; escalate to Sonnet high)

```
Pack D of docs/plans/foundry-plan.md: tasks BF-10 → BF-11.

Read: foundry-plan.md §2 (P6, P11, P12, P22, P23) and Pack D's rows; `git log --grep 'BF-8' --format=%B`;
pattern: the bathhouse rooms in src/data/districts/bathhouses.ts with tests/data/bathhouse-rooms12.test.ts.
Own: src/data/districts/foundry.ts (the rooms only), tests/data/foundry-rooms.test.ts (new), the one todo
"BF-8: a room bonus is its great bell rung and the room won" in tests/districts/foundry/peal.acceptance.test.ts.
Contract (on main):
- Room sizes and foes are P12's: 1 belfry stair 5x7 (two tones, Ringer, Clapper), 2 ringers' gallery 6x7
  (two tones, two Ringers, Clapper), 3 tuning hall 5x9 (three tones, Detuner, Clapper, Ringer; the landmark
  room, a recruit slot left for BF-13), 4 clockwork loft 6x8 (three tones, two Detuners, Ringer, Clapper);
  three layouts each, at least four `P`, tokens `{bell:<tone>}`, `{rope:<tone>}`, `{greatBell:<note>}`,
  foes Z (Ringer), X (Detuner), Q (Clapper).
- Great bell locks (P6): room 1 Reach, 2 Match, 3 Unison, 4 Chord; each solvable with the starting seven
  plus Brass; a room's `bonus` is its great bell rung and the room won.
- P22: a Clapper's tone is its order among the room's Clappers (`clapper-1` low); build each lock around
  it. If a lock needs a lone Clapper of another tone, stop and report.
- P23: a Shove strikes but signs no Unison; the Unison room's hint says casts and Spark count, and its
  scripted solves use casts.
- Numbers are P12's defaults; no tuning. The district stays `gate: 'drawing'` (BF-22 opens it).
Owed by this pack: nothing from the status file. Leaves for later: the heart, loot, recruit offer
and lore (BF-12, BF-13); thresholds and floor (BF-14–16); the remaining BF-8 todos (BF-12, BF-22).

Done when:
- BF-10: `checkRoom` passes for every layout of rooms 1–2 (test "BF-10: rooms 1 and 2 pass checkRoom");
  "BF-10: lock 1 reach has a scripted solve" and "BF-10: lock 2 match has a scripted solve" pass; the todo
  "BF-8: a room bonus is its great bell rung and the room won" is a passing test.
- BF-11: the same for rooms 3–4 ("BF-11: rooms 3 and 4 pass checkRoom"); "BF-11: lock 3 unison has a
  scripted solve with 1, 2 and 3 apprentices", "BF-11: lock 4 chord has a scripted solve" and
  "BF-11: killing the Clapper breaks the chord" pass.
A test you had to change is a Proposal in your report.

Verify: `pnpm vitest run tests/data/foundry-rooms.test.ts tests/districts/foundry --reporter=dot`
```

## Pack E1: legacy pair ids (Default: Sonnet medium; escalate to Sonnet high)

```
Pack E of docs/plans/platform-closure-plan.md: task KIT-R4.

Read: platform-closure-plan.md §3 "S5 confirmed" and row KIT-R4; pattern: `tripParty` and `inHousehold`
in src/engine/household.ts.
Own: src/app/lab.ts, src/app/faircopy.ts, src/engine/profiler.ts, src/ui/components/lattice/LatticeEditor.svelte,
src/data/apprentices.ts (the MEMBER_IDS export), src/engine/sim/bot.ts (the MEMBER_IDS import and the
default `order` only), and the test files `grep -rln MEMBER_IDS tests` lists (12 today).
Contract: callers take the household (`inHousehold`, the profile's household list) or the trip party
(`tripParty`); a call site with neither in reach takes an explicit list from its caller. The founding pair
stays the default where a test or the bot has no profile, in today's order, so sims and golden fixtures
are unchanged (`botFight`'s default order is still the members on the board, founding pair first).
Owed by this pack: nothing. Leaves for later: EN-9 (Pack ED) adds the owner through the household.

Done when:
- KIT-R4: `grep -rn "MEMBER_IDS" src tests` prints nothing; test "KIT-R4: the Lab and the profiler list a
  recruited apprentice" passes; `pnpm vitest run tests/app tests/engine tests/run tests/scenarios --reporter=dot`
  passes; screenshots at 375×812, light: the lattice editor and the Lab with the founding pair plus one
  recruit show all three; the autofixer is clean on LatticeEditor.svelte.

Verify: `pnpm vitest run tests/app tests/engine tests/run tests/scenarios --reporter=dot`
Phone check: yes, port 5191.
```

## Pack D3c: lent shapes and bot terms (Default: Sonnet medium; escalate to Sonnet high)

Starts when D3b and E1 are merged. The only sims pack while it runs.

```
Pack D of docs/plans/platform-closure-plan.md: tasks KIT-R3f → KIT-R3g.

Read: platform-closure-plan.md P5, P6 and rows KIT-R3f, KIT-R3g; src/engine/trip/shape.ts (`carriesKit`,
`parseTripKit`, `shapeOf`) and src/engine/trip/ret.ts (`policyAllows`); pattern: `harmGuards` in
src/engine/districts/{types,registry}.ts (a per-module list collected by the registry).
Own: src/engine/districts/types.ts (`DistrictModule.shapes` only), registry.ts (one loop line), api.ts
(`botValue`), the `shapes:` and `bot:` lines in src/engine/districts/{seam,canals,bathhouses,bridges}.ts,
src/engine/districts/canals/shape.ts and bathhouses/bot.ts (new), src/engine/sim/bot.ts (its district
imports and `value` only), biome.json (the second override), tests/districts/trip-shapes-lent.test.ts and
tests/engine/bot-terms.test.ts (new).
Contract (approved, platform-closure P5 and P6):
- `DistrictModule.shapes?: readonly TripShapeDef[]` — "shapes it lends to drawn districts, not used for
  its own trips"; registry.ts adds each to `KIT.shapes` with the same duplicate check as `trip`.
- `seam:plain`: `{ id: 'seam:plain', parseState: () => null, initState: () => null }`, no hooks.
  `canals:landings`: `returnBlocks` is empty exactly when `policyAllows({ kind: 'landings', after: <every
  even 0-based room below the heart> }, input.room, input.length - 1)`, else `[{ why: 'No landing here.' }]`.
- The Seam and canals register no `trip`; `carriesKit`, `newTripKit`, `parseTripKit` are not edited; no save
  changes shape.
- `export function botValue(state: BattleState): number` in districts/api.ts: the sum of every module's
  `bot?.value?.(state) ?? 0` in registry order. Invariant: a module's value is 0 on a board without its rule.
- bathhouses/bot.ts: `BATH_BOT: BotTerms = { value: boilTerm }` (the boil term moved from sim/bot.ts as is);
  seam, canals and bridges register `bot: {}`. sim/bot.ts: `value(s, gauge)` adds `botValue(s)` where it
  added `boilTerm(s)` (with `gauge` on, as today); `crackCost` reads `crackedTiles(next)` from
  `../districts/api`; sim/bot.ts imports no district file.
- biome.json: the second override's `includes` loses `"!src/engine/sim/bot.ts"` and its message loses the
  parenthetical sentence about it.
Owed by this pack: `trip` shapes for Seam and canals (as P5's lent shapes); `bot` for Seam, canals,
bathhouses, bridges; the sim/bot.ts imports of `bathhouses/boilOver` and `bridges/preview` and the lint
exemption (status Owed). Leaves for later: the foundry's `bot.value` (BF-20) and the cartographers' (CG);
EN-S1 composes `botValue` in its trials.

Done when:
- KIT-R3f: tests "KIT-R3: KIT.shapes has seam:plain and canals:landings", "KIT-R3: the Seam and canal trips
  still carry no kit" (`shapeOf(id).trip` undefined, `newTripKit` undefined, the SAVE-1 fixtures parse) and
  "KIT-R3: canals:landings allows a return where the canals' policy does, at lengths 3 to 6" pass;
  tests/app/save-compat.test.ts and tests/run pass unchanged.
- KIT-R3g: test "KIT-R3: botValue sums the modules' terms and is 0 off their boards" passes; `grep -n "sim/bot"
  biome.json` prints nothing and `pnpm lint` passes; the JSON reporter output of `tests/sim` is identical
  before and after the pack (as EN-0 checked it).

Verify: `pnpm lint && pnpm vitest run tests/districts tests/engine tests/run tests/app/save-compat.test.ts --reporter=dot`
Sims: run `pnpm vitest run tests/sim --reporter=json` once before KIT-R3g and once after; compare.
```

## Pack C3: bridges footnotes build (Default: Sonnet medium; escalate to Sonnet high)

Starts now (BR-G1 approved 2026-11-12; C2 and B2 merged).

```
Pack C3 of docs/plans/bridges-plan.md: tasks BR-19a (Hold, Brink, Lay: lines and capstones) →
BR-19b (Mortar, Chalk, the Chief Warden's note on Brink).

Read: docs/design/footnotes-content/bridges.md (approved; §8 lists the review's changes and build notes);
footnotes-audit.md §10; pattern: src/data/footnotes/inkQuarter.ts with tests/scenarios/footnotes/ink-*.test.ts
and the postmaster's note in tests/rivals/postmaster.test.ts.
Own: src/data/footnotes/bridges.ts (new), one line in src/data/footnotes/index.ts, the variant hooks at the
sites the draft names: src/engine/runes/actions.ts (`hold`), src/engine/runes/flow.ts (`brinkLine`),
src/engine/resolve.ts (Brink's rest and target step only), src/engine/mix.ts (`newLayer` only),
src/engine/push.ts (the Mortar bonus only), src/engine/bursts.ts (`unitsNear` only), src/engine/inventions.ts
(Chalk's path end only), src/engine/districts/bridges/{collapse,support,wear}.ts, src/data/rivals/chiefWarden.ts
(`note`), tests/scenarios/footnotes/bridges-*.test.ts (new), tests/rivals/chiefWarden.test.ts. Not bridges.ts,
not heart.ts or heartFrame.ts (Packs D3b, D3c).
Contract (on main): a variant's effect runs only when `hasFootnote(ctx, '<variant id>')`; its events carry
the slot's line (`withLine`). Ids are the approved draft's, final (`mortar-unit-guard`, not `-kin`). No new
event types or `Meets` values. Core files read bridges state only through `districts/api` (`crackedTiles`);
an effect that writes bridges state (stone, the fall, support) lives in src/engine/districts/bridges/ — if
one cannot be reached from there, stop and report. The dusk hooks run in collapse.ts's step in §8's order;
`fallingTiles` stays the one selection. Every "say so at build" in §8 becomes a clause in the variant text or
a one-line comment. `CHIEF_WARDEN_PAGE.note = { rune: 'brink', line: 'brink:drop', variant: 'chiefWarden:brink' }`
(was `brink:edge`), credit "Copied from the Chief Warden's day-book.". Do not touch the settle calls in
resolve.ts and mix.ts.
Owed by this pack: nothing from the status file. Leaves for later: none.

Done when:
- BR-19a: tests "<line> fourCombos: …" for hold:held, hold:cracked, brink:cracked, brink:drop, lay:cracked;
  one scenario per capstone option (hold-cap-crush, hold-cap-hang, brink-cap-fall, brink-cap-rim,
  lay-cap-footing, lay-cap-trail).
- BR-19b: the same for mortar:unit and chalk:network; scenarios for mortar-cap-set, mortar-cap-scatter,
  chalk-cap-circle, chalk-cap-line; the note's tests "hidden without his page", "offered once his page is
  held, credited, and writing it files it in the slot" and "written: a member beside the fog takes a Guard
  of 1 instead of Brink's rest".
- tests/data/integrity.test.ts passes (every line fires both ways); tests/districts/bridges and tests/rivals
  pass unchanged otherwise. A test you had to change is a Proposal in your report.

Verify: `pnpm vitest run tests/scenarios tests/data tests/rivals tests/districts/bridges --reporter=dot`
Phone check: no (the orchestrator checks the margin at the wave's end).
```

## Pack EF: palette, pen and compatibility (Default: Sonnet medium)

```
Pack F of docs/plans/ending-plan.md: task EN-5 (before the generator, P23).

Read: ending-plan.md P3–P7, P23 and row EN-5; `git log --grep 'EN-W0' --format=%B`; pattern:
src/engine/districts/bridges/guarantee.ts (a value derived from the profile, never stored).
Own: src/engine/drawing/{palette,cost,check}.ts, src/data/drawing.ts (new), tests/drawing/palette.test.ts
(new), the four EN-5 lines of tests/drawing/acceptance.test.ts (three become passing tests there or move to
palette.test.ts with the same titles; "EN-5: every offered combination generates" stays it.todo).
Contract (on main, EN-W0's types in src/engine/drawing/types.ts):
- `paletteOf(p): Palette` (P3, derived): rules fought under (DK-E4 `met` keys; a lower-Seam intrusion counts
  only its piece), foes from `foesMet` minus bosses and rivals, pieces from DK-14 `met`, shapes of districts
  whose trip the household started, masters from `city.hearts` plus the Lamplighter once `holdsPage(lamplighter)`.
- `penOf(p): Pen` (P6): 1 per heart cleared, 1 per four known rune pages (floor), 1 per level-III capstone;
  `total` is the sum of `parts`.
- `costOf(d)` from `COSTS` in src/data/drawing.ts (element costs as designed, heart costs per P13);
  `weightBand(d)`: light ≤ 9, medium 10–14, heavy ≥ 15 (P7).
- `checkDrawing(p, d): Issue[]`: every unmet need (P5 table as `NEEDS` by element id in
  src/data/drawing.ts, any-of, with its sentence), every element not in the palette, the pen exceeded,
  the name (trimmed, 1–24 characters) — one `Issue` each, never thrown. A rule brings its activating
  pieces at no cost (P4).
Owed by this pack: palette, pen, cost, weight, checkDrawing and the src/data/drawing.ts numbers (status
Owed, from EN-W0). Leaves for later: "EN-5: every offered combination generates" (EN-2); kits and frames
read `NEEDS[id]` (EN-K1–K7); loot by depth (EN-8).

Done when:
- EN-5: "EN-5: each need greys its element with its sentence", "EN-5: the palette grows only with met
  content", "EN-5: pen parts sum to the total" pass; the stub tests in acceptance.test.ts for these five
  functions are removed or changed to assert real values (say which in the report).

Verify: `pnpm vitest run tests/drawing --reporter=dot`
```

## Pack D4: generator spike (Strong: Sonnet high; escalate to Opus high)

Starts when D3c is merged. The only sims pack while it runs.

```
Pack B of docs/plans/ending-plan.md: task EN-S1.

Read: ending-plan.md P8–P12, P25 and rows EN-S1, EN-G0; tests/sim/trip-shape.test.ts (a seed fuzz);
pattern: src/engine/districts/bathhouses/trip.ts (room setup) and EN-W0's stubs in src/engine/drawing/.
Own: src/engine/drawing/generate.ts, tests/sim/generator.test.ts (new), src/app/dev/** (the `#/dev/generator` page).
Contract (on main): built content only (Seam foes and ground, the canals' current and lamps); the P8
pipeline; `checkGenerated` per P9; the bot trial per P10 through src/engine/sim (`botTrial`, which reads the
modules' terms through `botValue`) with an op budget (default 6000 applied actions), salts
`7000 + 10·room + attempt`, fallback salt `7900 + room`; pure and deterministic; no wall-clock limit inside
the engine. Heart frames (KIT-R3) exist for Seam, canals, ink quarter, bathhouses, bridges; the spike
generates rooms, not hearts.
Owed by this pack: `generateRoom`, `checkGenerated`, `botTrial` first built (EN-2 finishes them).
Leaves for later: the limits in src/data/tuning.ts (EN-G0); the worker (EN-4).

Done when:
- EN-S1: tests "EN-S1: guardrails hold on 500 seeds", "EN-S1: no event-cap overrun inside trials",
  "EN-S1: same input gives the same layout, attempts and ops" pass; the report has first-try acceptance,
  the attempts histogram, fallback rate, ops per trial, desktop timings, and the dev page's URL with 20
  sample rooms (screenshots at 375×812). Phone timings come from the player (EN-G0).

Verify: `pnpm vitest run tests/sim/generator.test.ts --reporter=dot`
Phone check: yes, port 5192 (the dev page is new).
```

## Pack F6: foundry heart and loot (Default: Sonnet medium; escalate to Sonnet high)

Starts when F4 and D3b are merged.

```
Pack E of docs/plans/foundry-plan.md: tasks BF-12 → BF-13.

Read: foundry-plan.md §2 (P7, P8, P11, P24) and Pack E's rows; platform-closure-plan.md P7 (frames);
pattern: src/engine/districts/bathhouses/heartFrame.ts (D3b) and the bathhouse heart and loot tables in
src/data/districts/bathhouses.ts.
Own: src/data/districts/foundry.ts (heart, loot, lore), src/engine/districts/foundry/peal.ts (`HEART_HOOKS`,
`pealRoomSetup`), src/engine/districts/foundry/heartFrame.ts (new), the `heart:`, `bot:` and `offersFor`
lines in src/engine/districts/foundry.ts, tests/data/foundry-rooms.test.ts, the BF-12 todo in
tests/districts/foundry/peal.acceptance.test.ts, one test in tests/districts/heart-frames.test.ts.
Contract (on main):
- Heart (P12): three 7x9 layouts, three tones, four `{hook}` tiles each, the Carillonneur `V` and foes
  beside him, safe tiles for the party in the Peal. `HEART_HOOKS` lists each layout's hooks (a `RoomSetup`
  cannot read the board); `pealRoomSetup` at the heart returns the hung bells' `boardEdits` and
  `rulesConfig: { 'foundry:tune': { seed: input.trip.seed } }` (P24).
- The foundry's `heart: HeartSetup` through `placeFrame` (salt 7150, placements from the first heart layout,
  the four hooks as its stamped structure) and `bot: {}` (BF-20 fills the value).
- Loot (BF-13): tables `foundryShallow`, `foundryDeep`, `foundryHeart` (Toll, Coil, Unison, Rivet, Filings,
  basics); Unison guaranteed in room 2's table until owned (RC's guarantee function); the tuner's recruit offer
  in room 3 through RC's offer kind; ink and lore lines per room and the heart. Numbers are defaults.
Owed by this pack: `HEART_HOOKS` and the tune seed in `pealRoomSetup` (status Owed, from BF-8/BF-9);
`DistrictModule.heart` and `.bot` for the foundry. Leaves for later: BF-22 opens the district and turns the
last BF-8 todo; BF-20 the bot value; EN-K6 wraps the frame.

Done when:
- BF-12: `checkRoom` passes for every heart layout; the todo "BF-8: roomSetup hangs an allied bell at each
  hook for every note rung" is a passing test (0 and 4 notes; bells only at hooks); "BF-12: the heart's tune
  is seeded from the trip seed" and "KIT-R3: foundry frame places the Carillonneur on 5x5, 7x9 and the real
  room size, seeded" pass; a scripted full heart fight with 0 and with 4 bells hung ends without a throw.
- BF-13: "BF-13: the tuner's offer appears only when her preconditions hold", "BF-13: a trip can always bank
  Unison" and "BF-13: every room and the heart has its ink and lore lines" pass.

Verify: `pnpm vitest run tests/data/foundry-rooms.test.ts tests/districts/foundry tests/districts/heart-frames.test.ts --reporter=dot`
```

## Pack ED: ledger and owner (Default: Sonnet medium; escalate to Sonnet high)

Starts when E1 (KIT-R4) and C3 are merged.

```
Pack D of docs/plans/ending-plan.md: tasks EN-1 → EN-9.

Read: ending-plan.md P18, P19, P21, P24 and Pack D's rows; party.md §1 (habit rules); pattern: an existing
habit row in src/data/habits.ts with its scenario test, and the entries in src/data/recruits.ts.
Own: src/engine/ledger.ts (new), the bank sites in src/engine/trip/ (`returnHome` in crossroads.ts and the
wipe path), src/data/apprentices/owner.ts (new) and its one registry line in src/data/apprentices.ts,
src/data/habits.ts (the `mender` row), src/engine/networks.ts (the `gap` option), the network callers'
mender checks (bursts.ts, resolve.ts, marks.ts, solvents.ts, inventions.ts: one guarded call each), the EN
block at the end of src/data/lines.ts, tests/run/ledger.test.ts (new), tests/scenarios/habits-mender.test.ts
(new), the EN-1 and EN-9 todos in tests/drawing/acceptance.test.ts.
Contract (on main, EN-W0's `Profile.ledger` and readers in src/engine/drawing/profile.ts):
- EN-1: `Profile.ledger` { casts, biggest chain with caster and name, districts in opening order } is fed by
  `returnHome` and the wipe path only (never Lab or Bench); stored only once non-empty (P22).
- EN-9: the owner (O, 5/3, Pull, Seam/Board, starter page `Splash → Steam → Spark`, habit `mender`); P19:
  on the owner's own casts two network tiles in a straight line with exactly one empty tile between (no
  state, compound, unit or blocking piece) join; the gap tile is not in the network; never diagonal,
  never round-end fire spread, never bells. Fine print `mender:unit`, `mender:diagonal`, `mender:dusk`.
- P24: the nine EN-9 scenarios live in tests/scenarios/habits-mender.test.ts; their duplicate todos leave
  acceptance.test.ts (titles unchanged).
Owed by this pack: `ledger` fed by EN-1; the owner def and `mender` row by EN-9 (status Owed). Leaves for
later: the handover joins the owner (EN-10); credits read the ledger (EN-11).

Done when:
- EN-1: "EN-1: counts grow on return and on wipe", "EN-1: lab and bench never feed the ledger",
  "EN-1: city.open keeps opening order", "EN-1: the ledger round-trips through save" pass.
- EN-9: the nine "EN-9: …" scenarios named in ending-plan row EN-9 pass; tests/data/integrity.test.ts passes.

Verify: `pnpm vitest run tests/run tests/drawing tests/scenarios/habits-mender.test.ts tests/data --reporter=dot`
```

## Pack F5: foundry footnote audit (Strong: Sonnet high; escalate to Opus high)

Starts when C3 and ED are merged (all three edit `src/data/lines.ts`).

```
Pack I of docs/plans/foundry-plan.md: task BF-F1.

Read: foundry-plan.md P15, P25 and Pack I's row; footnotes.md §1 and "Rival notes"; pattern: the ink
quarter's audit (footnotes-audit.md §11) and draft (docs/design/footnotes-content/inkQuarter.md with its §7).
Own: src/data/lines.ts (a new BF block at its end, `pending` rows only where the engine does not stamp yet),
docs/plans/footnotes-audit.md (a new §12), docs/design/footnotes-content/foundry.md (new),
tests/scenarios/foundry-audit-lines.test.ts (new; `it.fails` for each pending line, named "BF-F1: <line> fires").
Contract: audit Toll, Coil, Unison, Rivet and Filings against bells, the hum, muffle, retune and the staff
(Filings or Toll on a bell, Unison for lock 3, Rivet on a Clapper); a line exists only for a real behaviour
(FN P5); the draft gives per rune two margin lines × levels I and II and a capstone pair, per solvent one
margin line and capstones, Coil's non-diagonal capstone, and the Carillonneur's note on Toll (level II;
BF-24's placeholder line `toll:network` is confirmed or replaced, P25). Defining words stay true (the IQ-FG
and BR-G1 rule). No engine change.
Owed by this pack: nothing. Leaves for later: BF-FG (a design window) approves the draft; BF-F2 and BF-F3
build it, BF-F3 the Toll note's effect.

Done when:
- BF-F1: §12 of the audit has the table of real behaviours without rows; the draft exists with every pair's
  Combos read in all four combinations; tests/data/integrity.test.ts passes with the new rows (pending rows
  excluded as today).

Verify: `pnpm vitest run tests/data tests/scenarios/foundry-audit-lines.test.ts --reporter=dot`
```

## Pack F7: foundry thresholds and floor (Default: Sonnet medium)

Starts when F6 is merged.

```
Pack F of docs/plans/foundry-plan.md: tasks BF-14 → BF-15 → BF-16.

Read: foundry-plan.md P13, P26 and Pack F's rows; pattern: the bathhouse hearing test, threshold (BH-9) and
intrusion (BH-11) entries in src/data/districts/bathhouses.ts with their tests in tests/data/bathhouse-*.test.ts.
Own: src/data/districts/foundry.ts (map, threshold, intrusion), tests/data/foundry-rooms.test.ts,
tests/data/foundry-threshold.test.ts and foundry-intrusion.test.ts (new).
Contract (on main): BF-14 (P26): `hear` and `lean` are already in FOUNDRY_KIT; add the map caption and the
solved art key. BF-15: the far bell, a threshold room with ≥ 4 `P`, two same-tone bells far apart and a
decoy tone, free and retryable; its goal reads the far bell rung; a Shove from every start point solves it
(foundry Q3 stays open, default as planned). BF-16 (P13): an `IntrusionSpec` with a pair of bells of one tone
far apart, 3 layouts, the piece-scoped `bells` rule only (no Ringers, tune or great bells), the "Seam has no
bell" floor line.
Owed by this pack: nothing. Leaves for later: BF-22 flips the gate.

Done when:
- BF-14: "BF-14: the foundry is heard by a conducted burst reaching three units in the Seam" and "BF-14: two
  units are not enough" pass; the map entry has its caption and solved art key.
- BF-15: `checkRoom` passes; "BF-15: a Shove from every start point rings the far bell" passes; "BF-15: Retry
  keeps the same spots" passes.
- BF-16: "BF-16: a foundry floor builds from its IntrusionSpec", "BF-16: a strike rings the pair and it hums"
  and "BF-16: no tune, staff or great bell appears" pass; `checkFloor` passes for each layout.

Verify: `pnpm vitest run tests/data/foundry-*.test.ts tests/districts/foundry --reporter=dot`
```

## Pack F8: foundry screens (Default: Sonnet medium; escalate to Sonnet high)

Starts when F6 is merged.

```
Pack G of docs/plans/foundry-plan.md: tasks BF-17 → BF-19 → BF-18.

Read: foundry-plan.md P14 and Pack G's rows; platform-closure-plan.md §4 "KIT-R2 provides" (the slots
`unitArt`, `fx`, `boardLayers`); pattern: src/ui/districts/bathhouses/ and its registry entries, and BF-1's
`BellPiece` and `ToneSheet` in src/ui/districts/foundry/.
Own: src/ui/districts/foundry/**, tests/ui/foundry-*.test.ts (new), the foundry Lab scenario presets.
Contract: board UI only through the KIT-R2 registry slots (no board component edits); tones read by colour,
pattern, silhouette size and 1–3 pips (P14); hum = a ring and a dimmed pattern; muffled = the cloud over the
bell; Bench lists bells, ropes and the three foes only after met (DK-14 `met` keys).
Owed by this pack: nothing. Leaves for later: the Close sweep checks dark mode on every foundry screen.

Done when:
- BF-17: Lab board at 375×812, light and dark: all three tones on 7x9, a ring mid-animation, a Ringer
  telegraph, a humming and a muffled bell, a struck-bell highlight on a preview; autofixer clean.
- BF-19: Bench lists bells and foes only after met; the Lab places every piece and foe; a preset per lock
  loads (Lab, 375×812, light).
- BF-18: Lab heart fixture 7x9 at 375×812, light and dark: the tune banner with called note and countdown,
  four hung bells at the hooks and one tapped to strike, the Peal telegraph over the board; autofixer clean.

Verify: `pnpm vitest run tests/ui --reporter=dot && pnpm typecheck`
Phone check: yes, port 5191 (rings, the strike tap and the banner carry meaning).
```

## Pack F9: foundry proof and open (Default: Sonnet medium; escalate to Sonnet high)

Starts when F7 and F8 are merged. The only sims pack while it runs.

```
Pack H of docs/plans/foundry-plan.md: tasks BF-20 → BF-22.

Read: foundry-plan.md Pack H's rows and P24; platform-closure-plan.md P6 (bot terms); pattern:
src/engine/districts/bathhouses/bot.ts (D3c) and tests/sim/bathhouses-calibration.test.ts.
Own: src/engine/districts/foundry/bot.ts (new), the `bot:` line in src/engine/districts/foundry.ts,
tests/sim/foundry.test.ts (new), the gate and `PLAYABLE_DISTRICTS` lines in src/data/districts/foundry.ts and
src/data/districts/index.ts, tests/fixtures/saves/ (one foundry pair, per its README), the last BF-8 todo.
Contract: the foundry's `bot.value` scores pulses that will hit foes and members (0 off a foundry board);
the bot plays the Carillonneur through RV as any rival; opening the district changes no Seam or canal golden
fixture. No win-rate target.
Owed by this pack: the foundry's save pair (SAVE-1 README). Leaves for later: calibration (CAL).

Done when:
- BF-20: "BF-20: the bot prefers the cast whose ring pulses a foe" passes; "BF-20: 200 seeded foundry trips
  never throw or overrun the cap" passes.
- BF-22: golden fixtures identical; a headless trip from room 1 to the heart runs; the todo "BF-8: returning
  home or a wipe discards the rung bells" is a passing test; "SAVE-1: foundry save written by <commit> parses
  and loads" and "… mid-trip save resumes to its next offer" pass; `pnpm check:fast` green.

Verify: `pnpm vitest run tests/sim/foundry.test.ts tests/districts/foundry tests/run tests/app/save-compat.test.ts --reporter=dot`
Sims: `tests/sim/foundry.test.ts` for BF-20.
```

## Pack CW0: cartographers contracts (Strong: Sonnet high; escalate to Opus high)

Any free slot (unblocked; cartographers-plan "starts when BF-12 merges or a slot is free").

```
Pack 0 of docs/plans/cartographers-plan.md: task CG-W0.

Read: cartographers-plan.md §2 (P1–P18), §4 and every row of §5; district-cartographers.md §0; pattern:
src/engine/districts/bathhouses.ts and bathhouses/types.ts with tests/districts/bh0-contracts.test.ts.
Own: src/engine/districts/cartographers.ts and cartographers/ (new), src/data/districts/cartographers.ts and
cartographers/, src/ui/districts/cartographers/ (new), the module line in src/engine/districts/kit.ts, the
index lines in src/data/districts/index.ts and src/ui/districts/index.ts, tests/districts/cartographers/acceptance.test.ts (new).
Contract: behaviour-neutral. Declare the piece (`pencil`, `blank`, `outline`, `circle` art key), rule
(`guildHand`), foe (`surveyor`, `eraser`, `tracer`), event (`inked`, `rubbedOut`, `undrawn`, `drawnIn`,
`circled`, `struck`) and room pencil config types of §4 as stubs; `cartographers:*` loot table ids; stub
hearing (already `pages ≥ 5`) and threshold; the district stays `gate: 'drawing'` with no rooms. Invariants
P1–P3 stated in the handoff (paper states, blank erases as a fall, the hand plans next round from
`deriveSeed(battle seed, <salt>)`: pick a salt outside 7000–7999, which EN owns, and say which).
Owed by this pack: nothing. Leaves for later (§4, copy into the handoff): every item of "Leaves for later
tasks" (CG-1 to CG-14, CG-F1–F4), including the cartographers' `heart` frame through frame.ts (CG-10) and
`bot` terms.

Done when:
- CG-W0: `pnpm check:fast` green; no existing test changes; every "<ID>: <rule>" title named in a §5 row
  exists in the acceptance file as `it.fails` or `it.todo`; the handoff lists invariants P1–P3 and the Owed items.

Verify: `pnpm vitest run tests/districts --reporter=dot`
```

## Pack O: ink footnote follow-ups (Fast: Haiku high; escalate to Sonnet medium)

Starts when ED is merged.

```
Pack O of docs/plans/platform-closure-plan.md: task FU-21.

Read: docs/design/footnotes-content/inkQuarter.md §8; platform-closure-plan.md P9 and row FU-21; pattern:
the `wax-cloud-*` scenarios in tests/scenarios/footnotes/ink-wax.test.ts.
Own: src/engine/solvents.ts (the `wax-cloud-smother` check in `wax.onHook` only), src/data/footnotes/inkQuarter.ts
(the texts of wax-cloud-smother, sentence-mark-peel, levy-mark-peel, sentence-unit-collar),
tests/scenarios/footnotes/ink-*.test.ts.
Contract: `wax-cloud-smother` keeps its id; its text becomes "A wax mark does not melt in fire while a cloud
stands beside its bearer: the steam keeps the wax cool." and its check reads a cloud on any 4-neighbour of
the bearer instead of its own tile. Clauses: both `*-mark-peel` texts end "A bound mark is released, not
peeled."; `sentence-unit-collar` adds "(born brass is not a collar)". No other behaviour changes.
Owed by this pack: nothing. Leaves for later: none.

Done when:
- FU-21: "FU-21: wax-cloud-smother keeps a wax mark from melting in fire beside a cloud", "FU-21: without a
  cloud beside it the mark melts as before" and "FU-21: wax-cap-seal holds through a real wax invention cast"
  pass; "wax:cloud fourCombos" passes; tests/data/integrity.test.ts passes.

Verify: `pnpm vitest run tests/scenarios/footnotes tests/data --reporter=dot`
```

## Pack G: shared scenario-log verification (Default: Sonnet medium)

```
Pack G of docs/plans/platform-closure-plan.md: task BL-110.

Read: platform-closure-plan.md row BL-110; pattern: the `import.meta.glob` blocks in tests/data/lines.test.ts
and tests/app/projection.test.ts.
Own: tests/data/lines.test.ts, tests/app/projection.test.ts, tests/scenarios/lines-registry.ts, one new shared
registrar under tests/scenarios/.
Contract: tests only. Both guards read one shared run of the engine suites; the guard titles "lines fired by
the suite (L1)" and "projection drift guard over the engine suites" stay; mocked-suite isolation is kept (a
suite that mocks `$engine/districts/kit` is not imported into the shared run).
Owed by this pack: nothing. Leaves for later: new scenario files are picked up by the shared registrar.

Done when:
- BL-110: each of the two files takes at most 20 s alone (times before and after in the report); each guard
  still fails on one deliberate break (an un-fired line, a projection drift), both reverted.

Verify: `pnpm vitest run tests/data/lines.test.ts tests/app/projection.test.ts --reporter=dot`
```

## Pack H: bundle and precache cost (Default: Sonnet medium)

```
Pack H of docs/plans/platform-closure-plan.md: task BL-111.

Read: platform-closure-plan.md row BL-111; vite.config.ts (the PWA block); pattern: none, measure first.
Own: vite.config.ts, src/main.ts, src/app/App.svelte (the screen imports only).
Contract: offline play survives: with the service worker installed and the network off, the home, a Seam
trip and the Lab load; `globPatterns` still precaches every chunk.
Owed by this pack: nothing. Leaves for later: EN-4's worker chunk follows the same split.

Done when:
- BL-111: `pnpm build` sizes before and after in the report; Lab and Gallery are separate chunks; the offline
  check passes in the browser (offline emulation), screenshots at 375×812.

Verify: `pnpm build && pnpm vitest run tests/app --reporter=dot`
Phone check: yes, port 5193 (offline load).
```

## Pack K: map and bathhouse UI (Default: Sonnet medium)

```
Pack K of docs/plans/platform-closure-plan.md: tasks FU-9 → FU-10 → FU-11 → FU-12.

Read: platform-closure-plan.md Pack K's rows; pattern: `solvedArt` in src/ui/districts/canals/index.ts.
Own: src/ui/components/map/DistrictNode.svelte, src/ui/districts/bathhouses/**, the meter component the
bathhouses use, docs/plans/bathhouses-verification.md (one line).
Contract: screens only; the threshold label comes from district data (canals keep "Try the lock"); no
engine change.
Owed by this pack: nothing. Leaves for later: dark-mode sweep at Close.

Done when:
- FU-9: Map at 375×812, light: Bathhouses names its own action, Canals still "Try the lock".
- FU-10: Map with the dome solved, light and dark.
- FU-11: Combat at the bathhouse heart on the tallest board, 375×812: row 9 fully visible.
- FU-12: one screenshot per bathhouse footnote margin subject at 375×812; findings in bathhouses-verification.md.
- autofixer clean on every changed component.

Verify: `pnpm typecheck && pnpm vitest run tests/ui --reporter=dot`
Phone check: yes, port 5192.
```

## Pack L: Seam and ink UI polish (Default: Sonnet medium)

```
Pack L of docs/plans/platform-closure-plan.md: tasks FU-13 → FU-14 → FU-15 → FU-16.

Read: platform-closure-plan.md Pack L's rows; the `verify` skill's states list; pattern: src/ui/districts/seam/.
Own: src/ui/screens/{Map,Cleared,TripPage}.svelte, src/ui/components/**/SetOutSheet.svelte, src/ui/districts/seam/**,
src/ui/districts/inkQuarter/**, src/ui/components/board/StepLayer.svelte.
Contract: layout and contrast fixes only; no engine change.
Owed by this pack: "The margin answered" card (SM-12/14) phone check and the StepLayer pill (SM-2) from the
status file's Rough edges. Leaves for later: none.

Done when:
- FU-13: the autofixer reports no issues for Map, Cleared and SetOutSheet.
- FU-14: the card at 375×812 in light (Seam-heart profile, a proven cluster, one fight); a fix if it overflows.
- FU-15: Combat at the Seam heart, 375×812: the Marginalia's "16/16" readable.
- FU-16: the ink room, a term card, the clock seal and the stamp preview in dark at 375×812, readable.

Verify: `pnpm typecheck && pnpm vitest run tests/ui --reporter=dot`
Phone check: yes, port 5193.
```

## Pack J: bathhouse engine leftovers (Default: Sonnet medium)

Starts when D3c is merged.

```
Pack J of docs/plans/platform-closure-plan.md: tasks FU-6 → FU-7 → FU-8.

Read: platform-closure-plan.md P4 and Pack J's rows; bathhouses-plan.md P7; pattern: `BATH_INTRUSION` in
src/data/districts/bathhouses.ts.
Own: src/engine/districts/bathhouses/** (not bot.ts, heart.ts or heartFrame.ts), src/engine/districts/intrusion.ts,
src/engine/turn.ts (`vents` only), src/data/districts/bathhouses.ts (the intrusion block), tests/districts/bathhouses/**.
Contract: FU-6 wires the thermae vent floor through `IntrusionSpec.terrain`; FU-7: a vent beside a living
boilerman puffs even when a state lies on it, other vents keep today's rule; FU-8: the attendant's and
boilerman's plans read the same footnotes as their resolve. If a design reading is unclear, stop and report (P4).
Owed by this pack: the `vents` rough edge (status). Leaves for later: none.

Done when:
- FU-6: "FU-6: a thermae floor's vents puff at dusk" passes; `checkFloor` passes; lower-seam-floor suites unchanged.
- FU-7: "FU-7: a boilerman's vent puffs over a standing state; other vents do not" passes.
- FU-8: "FU-8: a slick footnote does not make the shove telegraph differ from the shove" passes.

Verify: `pnpm vitest run tests/districts/bathhouses tests/districts/lower-seam-floor* tests/engine --reporter=dot`
```

## Pack B1: crossroads note (Default: Sonnet medium)

Starts when D3c is merged.

```
Pack B of docs/plans/platform-closure-plan.md: task FU-1.

Read: platform-closure-plan.md row FU-1; `git log --grep 'BR-7' --format=%B`; pattern: `warn` on
`CrossroadsChoice` and how src/ui/screens/Crossroads.svelte draws it.
Own: `CrossroadsChoice` in src/engine/districts/types.ts (one optional field), src/engine/districts/bridges/trip.ts
(the span choices' note), src/ui/screens/Crossroads.svelte, tests/run/crossroads-note.test.ts (new).
Contract: `CrossroadsChoice.note?: string` — a ledger line shown under the label; a choice without one renders
as today; it survives a save through the stored `TakenChoice` only where today's fields do (no new saved field).
Owed by this pack: nothing. Leaves for later: none.

Done when:
- FU-1: "FU-1: a choice note reaches the crossroads card data and survives a save" passes; screenshot of the
  bridges span cards at 375×812, light, a note line under each label, and a choice without a note unchanged;
  autofixer clean on Crossroads.svelte.

Verify: `pnpm vitest run tests/run tests/districts/bridges --reporter=dot && pnpm typecheck`
Phone check: no (the orchestrator checks it with the wave's screens).
```

## Pack I: rivals and events leftovers (Default: Sonnet medium)

Starts when F5 is merged (FU-5 edits `src/data/lines.ts`).

```
Pack I of docs/plans/platform-closure-plan.md: tasks FU-2 → FU-3 → FU-4 → FU-5.

Read: platform-closure-plan.md Pack I's rows; TECH.md §3 "Authoring a rival"; pattern: `removeTrickObject`
and `LockLost` in src/engine/rivals/tricks.ts.
Own: src/engine/rivals/**, src/engine/events.ts, src/data/footnotes/auras.ts, the afterglow rows of src/data/lines.ts,
tests/rivals/**, tests/scenarios/footnotes/auras*.test.ts, and the suites that assert `jarOpened`/`jarCrumbles`
(FU-3; list them in the report).
Contract: FU-2 `LockLost` gains `met` and `spent`; FU-3 `jarOpened` and `jarCrumbles` carry the jar id;
FU-4 a trick may add an arrival cause that enters FD's pipeline with its entered tiles; FU-5 the afterglow
margin lines with the events they need.
Owed by this pack: nothing. Leaves for later: none.

Done when:
- FU-2: "FU-2: a lock fails as spent when its charge is gone and met when its goal is reached" passes.
- FU-3: "FU-3: a wick order names the jar that opened or crumbled" passes.
- FU-4: "FU-4: a trick's arrival cause enters FD's pipeline with its entered tiles" passes; tests/rivals unchanged otherwise.
- FU-5: each new row fires in a scenario; tests/data/integrity.test.ts passes.

Verify: `pnpm vitest run tests/rivals tests/scenarios tests/data --reporter=dot`
```

## Pack M: test and engine leftovers (Default: Sonnet medium)

No other sims pack running.

```
Pack M of docs/plans/platform-closure-plan.md: tasks FU-17 → FU-18 → FU-19 → FU-20.

Read: platform-closure-plan.md P3 and Pack M's rows; pattern: `castWithCap` in tests/engine/cap.test.ts.
Own: tests/sim/canals-fuzz.test.ts (new), tests/engine/cap.test.ts, src/engine/mix.ts (the cap only, if a bug
shows), the Graphite restore code (`grep -n graphite src/engine/schedule.ts src/engine/outOfRoom.ts`),
src/engine/recruits/offers.ts, tests/run/recruit-parse.test.ts (new).
Contract: FU-19: a restore with no free tile places the unit on the nearest free tile or reports it, never two
units on one tile; FU-20: the recruit card parse accepts the seven recruits only (the DK-7 test card still
parses where its test says).
Owed by this pack: nothing. Leaves for later: none.

Done when:
- FU-17: "FU-17: canal trips at party 1, 2 and 3 never throw or overrun the cap" passes (seeded, small set).
- FU-18: "FU-18: cap sweep at every event index, push onto a jar" and "… mixing chain" pass.
- FU-19: "FU-19: a restore with no free tile places the unit on the nearest free tile or reports it" passes.
- FU-20: "FU-20: a recruit card naming a founder or an unknown id is rejected by the save parser" passes.

Verify: `pnpm vitest run tests/engine tests/run tests/sim/canals-fuzz.test.ts --reporter=dot`
Sims: tests/sim/canals-fuzz.test.ts for FU-17.
```

## Pack MIX: rule pairs (Default: Sonnet medium)

No other sims pack running. Gates ending Pack E (EN-2).

```
Pack F of docs/plans/platform-closure-plan.md: task MIX-1.

Read: platform-closure-plan.md row MIX-1; pattern: tests/sim/glyph-identity-fuzz.test.ts.
Own: tests/sim/rule-pairs.test.ts (new).
Contract: tests only; every pair among boil-over, collapse, bells, writs, current and the Seam hands on one
board, seeded; a failing pair is filed as a task in the report, not fixed here.
Owed by this pack: nothing. Leaves for later: the cartographers' guild hand joins the pairs when CG-2 merges.

Done when:
- MIX-1: "MIX-1: <ruleA> x <ruleB> never throws", "… never overruns the event cap", "… projection equals final
  state" exist for every pair; the report lists any failing pair.

Verify: `pnpm vitest run tests/sim/rule-pairs.test.ts --reporter=dot`
Sims: this file only.
```

## Close-outs (platform-closure Pack N; orchestrator, not a pack-worker run)

Platform-closure Pack N (CL-1 → CL-5) runs last, by the orchestrator in a design window, after every pack above and the tracks that finish the built plans: DESIGN §11 and TECH §7 rows for FD, DK, RV, FN, SM, IQ (write only the missing ones), the five verification files (SM-15 among them), five `code-review` runs, records and the ledger, full `pnpm check`.

## Written in a later design window

| Pack | Tasks | Starts when |
|---|---|---|
| EN-G0 | go/no-go on D4's report and the player's phone timings | D4 merged |
| BF-FG | orchestrator review of the foundry footnote draft; brief for Pack J (BF-F2 → BF-F3) | F5 merged |
| EN-12 | the handover text draft (orchestrator, docs only) | any design window |
| CG A… | cartographers Packs A–J briefs | CW0 merged |
| EN E… | ending Packs E–L briefs (E needs EN-G0 go and MIX-1) | EN-G0 |
| CL | platform-closure Pack N | the end |
