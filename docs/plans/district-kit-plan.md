# The district kit: implementation plan

Design: [city-and-districts.md](../design/city-and-districts.md) (§1–§4, §5b) and every district doc: [Seam](../design/district-seam.md), [ink-makers](../design/district-ink-makers.md), [bathhouses](../design/district-bathhouses.md), [bridges](../design/district-bridges.md), [bell foundry](../design/district-bell-foundry.md), [Cartographers](../design/district-cartographers.md) (rev. 2026-10-23). Roadmap: **BL-127** (new), absorbs BL-94, BL-95, BL-102. Brief: [build-program.md](build-program.md). Prefix **DK**.
**State: Drafted (not approved).**
**Scope:** one shared framework so the five new districts and the two revisits can be built in parallel, each in its own files; proven by porting the Seam and the canals onto it with no behaviour change. No district content.

## 1. Scope and settled rules

**Delivers** (each row is what the designs ask of more than one district, or of the shell around all of them):

| Need | Who asks | Design source |
|---|---|---|
| A district module: data file + optional engine module + optional UI module | all seven | build-program §1 |
| Return policy per room: free / landings / blocked by a signed term / no return past a point | Seam, bathhouses, bridges, foundry (free); canals (landings); quarter (terms); Cartographers (free 1–3, then none) | city §5.2, ink §0, carto §0 |
| Crossroads choices: span choice, the doorway as point of no return | bridges, Cartographers | bridges §0, carto §0–§1 |
| A checkpoint later trips may start at (the hall remembers the doorway) | Cartographers | carto §0 "A wipe" |
| Trip-scoped district state carried room to room and into the heart: heat, rung great bells, chosen spans, signed terms | bathhouses, foundry, bridges, quarter | each §0 |
| Room setup from trip state: heat level, "next room" stakes, allied bells in the heart, span variant pools | same | each §0–§1 |
| Optional room objectives with a reward: barge cargo, great-bell puzzles; term conditions in the same goal language | canals §5b, foundry, quarter | |
| Round-end board rule with its own state and a preview: current, boil-over, collapse, pencil | canals, bathhouses, bridges, Cartographers | |
| Board pieces with triggers (enter, end turn, struck, hit) and Lab/Bench/preview presence: writs, gauge, piers/keystone, bells, pencil tiles and outlines, barge, mooring | all five new + canals | |
| New offer kinds: terms, cold plunge, key (exists), recruit (RC's semantics), bonus pick | quarter, bathhouses, bridges/canals, RC | |
| Hearing kinds: cross-apprentice Ink debt, storm on 3+ units, an idiom performed in a district, conducted burst on 3+ units, five rival pages held | Seam doc §1, each district's "Hearing" | |
| Threshold rooms as data with copy, start points and rules (BL-94) | four threshold gates | city §3.1 |
| Bench scene parity with met content as a registry (BL-102) | every district's met foes/pieces | ROADMAP BL-102 |
| Out-of-the-room unit state (fall, erase) | bridges §0, carto §0 | |
| Lower-Seam intrusion contribution per district | Seam §0–§1 | |
| Scripted stand-in hearts until rivals exist | quarter, bathhouses, bridges, foundry, Cartographers §1 | |
| The map with seven districts, solved-gate art per district, sealed door slot (BL-95) | city §1 | |

**Leaves out:** any district's terrain rules, foes, rooms, heart, loot tables, lore (district plans); recruit semantics (RC); household boards, start points, party size (HC); the arrival pipeline (FD); rival foes and recovered pages (RV); the lower-Seam floors, their order and the sealed door's opening (SM); footnote batches (FN).

**Settled and kept as built:** landings after canal rooms 1, 3, 5; the heart must be a return point (fuzz check, city K-table); at most one key per trip; hearing kept on a wipe; threshold rooms free and retryable; drift is the first round-end step; the canals keep the old drop (city §5b).

## 2. Proposals

| # | Proposal | Why |
|---|---|---|
| P1 | **File layout.** `src/data/districts/<id>.ts` (the `DistrictDef`, rooms, loot tables, threshold, hearing, intrusion), `src/engine/districts/<id>.ts` (the `DistrictModule`: rules, pieces, offer kinds, trip hooks), `src/ui/districts/<id>/` (piece art, event animations, preview overlay, offer card copy). Each folder has an `index.ts` with **one line per district**; those lines are the only shared edits a district build makes | Parallel builds touch disjoint files; append-only index lines merge trivially |
| P2 | **Open unions by aggregation.** Closed unions that districts extend (`EnemyId`, `AttackId`, `LootTableId`, `StateId` where needed, `Meets`, `GameEvent`) are rebuilt as the union of per-district type exports re-exported from the index (e.g. `type EnemyId = SeamEnemyId \| CanalEnemyId \| …`). `LootTableId` becomes `${DistrictId}:${string}`-checked keys owned by each district file | Keeps strict typing without everyone editing `src/data/types.ts` |
| P3 | **Return policy is data first, hook second.** `DistrictDef.ret` replaces `landings`: `{ kind: 'any' }`, `{ kind: 'landings', after: number[] }`, or `{ kind: 'until', after: n }` (free up to room n, no return beyond). A module may add **blocks** from trip state (a signed term) with a reason string. Result is `{ ok } \| { ok: false, why, next? }` for the greyed button | Covers all seven shapes; the canals are the `landings` case unchanged |
| P4 | **The Crossroads asks the module for its choices.** Default `[push, return]`; a module may replace push with several labelled choices (sound span / crumbling span; return home / through the doorway). A choice is recorded on the trip and decides the next room's variant pool, so replays stay seeded | Span choice and the doorway are both "which way next" |
| P5 | **Point of no return and checkpoint are trip-shape data.** `DistrictDef.checkpoint?: { after: n, name }` with `noReturnAfter`. Reaching it is recorded in the trip and applied to `city.checkpoints` when the trip ends **win or wipe** (like hearing). Set out offers "start at the doorway" (full HP and charges, then the rewiring doorway) or room 1; **default the doorway** once reached | Matches carto §0; a wipe on the final run sends you back to the doorway |
| P6 | **Cold plunge is an offer kind, not a Crossroads choice** (the design calls it an offer that costs a pick). Offer kinds are a registry: `{ id, roll?, onPick, onBank, onWipe, parse, card }`. The key and the doorway are ported into it; RC registers `recruit`; IQ registers termed offers; BH the plunge | One mechanism for every non-page offer, saved and validated the same way |
| P7 | **Trip-scoped district state** is one JSON-safe value per trip, `trip.district.state`, owned and parsed by the module, never read by another district. Hooks: `roomSetup(trip, room) → { rulesConfig, boardEdits, variantPool }`, `afterRoom(trip, log, state) → trip`, `offersFor(trip, room) → { table, picks, extra }` | Heat, rung bells, terms and spans all fit; the heart reads what earlier rooms wrote |
| P8 | **Board rules run in three fixed round-end slots** around today's `hazards`: `carry` (where `drift` and `driftWaiting` run), `afterChemistry` (where `burnGates` runs) and `late` (after `snuffStep`). Rules declare a slot and an order; state lives in `BattleState.rules[ruleId]`; each rule may export `preview(state)` returning generic overlay shapes (ghost moves, cracked tiles, gauge level, next round's pencil) | Exactly reproduces today's order; boil-over, collapse and pencil each fit a slot; the UI draws one "Next round" overlay instead of a layer per rule |
| P9 | **Rule activation.** A rule is active when its district lists it **or** when its activating piece is on the board (the current is activated by water). Rules declare `scope: 'piece' \| 'district'`; a lower-Seam intrusion or a Lab board brings piece-scoped rules only (a lane brings its current; the gauge and the heat never come without their district) | Keeps today's "water drifts anywhere, even in the Lab"; answers the Seam doc's "without the full rule or gauge" mechanically (see Q1) |
| P10 | **Board pieces in one registry**: notation token (namespaced braces, `{bell:a}`, `{writ:return}`, `{pier}`, `{pencil}`), solidity (blocks units/shots like a plate or not), optional per-piece data, triggers (`onArrive` through FD's pipeline, `onTurnEnd`, `onStruck` by damage/push/Spark, `onHit`), Lab palette entry, Bench palette entry with its `met` key, and a UI art key. Existing terrain flags (`water`, `drop`, `vent`, `grate`, `gate`, `lamp`) stay as they are; new terrain arrives as `Tile.piece` | No churn on built terrain; every new district adds pieces without editing the parser, the Lab or the Bench |
| P11 | **One out-of-the-room state**: `Unit.out: 'fell' \| 'erased' \| null`, entered through `removeFromRoom(ctx, unit, cause)`. A member out of the room is off the board, untargetable, its delayed effects lapse as for a downed caster; the room is lost when no member is alive **and** in the room; on a win it is hauled back at 1 HP. A minion is gone; an elite takes the drop damage and loses its next action. Event `outOfRoom { unit, cause }` | Bridges and Cartographers share the wording; the canals keep `dropped` |
| P12 | **Hearing kinds become a registry of pure log/profile predicates** with an optional `district` filter. New kinds: `crossDebt` (Ink mark by one apprentice hit by a different apprentice's cast the same turn), `burstUnits` (a burst such as `storm` reaching ≥ n units), `conducted` (a conducted Spark reaching ≥ n units), `performed` (an idiom named in this battle, in this district) and `pages` (≥ n recovered rival pages, from RV). DK swaps the five drawn districts' placeholder triggers for the designed ones (data only; SM proves reachability) | The Seam doc asks for exactly these and says the placeholders go |
| P13 | **Room objectives**: `EncounterDef.bonus?: { goal, reward }`, checked when a room ends, rewards through the offer registry (extra pick, a rung bell into trip state). The `Goal` language gains `withinRounds`, `piece` (a piece in a state, e.g. bell rung, barge on mooring) and `outOfRoom` | Cargo, great bells and term conditions read one language that threshold rooms already use |
| P14 | **Stand-in hearts are scripted foes**: an `EnemyDef.script` of telegraphed steps cycled by round, each step an action the district module registers (ring a note, serve the clock writ). `standIn: true` marks the heart: it clears the district but never awards a rival page. The script uses RV's telegraph contract so a rival later replaces it in data | The designs allow a stand-in and say it gives no page (carto §0) |
| P15 | **Threshold rooms (BL-94)**: `ThresholdDef` gains `goalText` (the banner line now hard-coded in `Threshold.svelte`), HC's start points, `rules`/`pieces` as any board, and `solvedArt` (the map illustration key, so the canals' burnt gate becomes per-district; BL-119's art stays CN's) | One screen for all four thresholds |
| P16 | **`DistrictDef.lean`** replaces `material`: a kind or `'height'`/`'paper'` with display text; `PLAYABLE_DISTRICTS` is derived from which districts have rooms; drawn districts stay `gate: 'drawing'` until their build flips it | The map shows bridges as brass and the foundry as spark today; the design says height and brass |
| P17 | **The trip flow moves out of `run.ts`** into `src/engine/trip/` (start, rooms, offers, crossroads, return, doorway) before the hooks land; `run.ts` keeps profile and save. Mechanical, behaviour-neutral, done first | `run.ts` is 1528 lines and HC, RC, FD and DK all touch it; one early split avoids four-way conflicts |
| P18 | **Save shape:** new fields parse with empty defaults, so DK does not need HC's breaking reset to land first; if they ship together, fold into HC's version | Removes an ordering constraint |

No **Redefines**: every proposal implements a decided rule or fills a gap the design left open. P9 is the closest (it decides how much of a district comes with an intrusion) and is also Q1.

## 3. Current implementation and risks

- **Districts:** `src/data/districts.ts` holds all seven in one object; the canals' rooms, threshold and hearing inline; five `drawn()` stubs with placeholder hearing (`compound:deepMark`, `greaseFog`, `idiom:theWall`, `burst:conduct`, canals' heart / trips). `landings: 'all' | number[]`; `edge` per district. `variantFor` salts the Seam with `2000+encounter` and others with `3000+100·index+encounter`: the port must keep both salts and `DISTRICT_IDS` order.
- **Trip flow** (`src/engine/run.ts`): `startTrip`, `beginEncounter` (replays `t.actions`), `finishEncounter` → `rollOffers(seed, encounter, table, members, keyOffer, owned)`, `pickLoot` (doorway special-cased), `pushOn`, `returnHome` (`canReturn`, `bankKeys`), `applyDoorway`. `LootItem` and `parseLoot` are closed switches; `parseTrip` enforces one key.
- **City** (`src/engine/city.ts`): `hearFromBattle` knows only `burst` (by tile count) and `named` (profile-wide, so "in the Seam" can't be expressed); `canReturn`/`nextLanding`; `keyOffer`; `checkGoal`. Imports `placeOf` from `run.ts` (cycle risk once the trip flow moves).
- **Round end** (`src/engine/turn.ts` `hazards`): a fixed list; `drift`/`burnGates` imported from `current.ts`; `vents` and `coolTiles` local. `driftPreview` clones the state and reruns the drift; the UI's `DriftLayer` + "Current" toggle in `BattleView.svelte` read it.
- **Terrain/notation** (`src/engine/types.ts` `Terrain`, `src/engine/notation.ts`): six boolean/dir flags parsed per char; `{name}` braces already used for states.
- **Lab/Bench** (`src/app/lab.ts` `PaletteItem`/`PALETTE`, `src/app/bench.ts` `FOE_ITEMS`, `STATE_MET`, `isSubject` regex `^[rbfd]`): hard-coded, Seam foes only on the Bench (BL-102).
- **Screens:** `Crossroads.svelte` hard-codes Push on / Return and "The Seam goes on."; `Threshold.svelte` hard-codes "Drop the rat in the canal."; `Map.svelte`/`app/city.ts` draw nodes from `DistrictDef.map` with `RUNES[material].name`.
- **End of battle** (`ctx.ts` `checkEnd`): lost when no member is alive; no notion of "alive but gone".
- **Risks:** (1) the port must be byte-identical in event logs, so a golden baseline comes first; (2) `run.ts`/`types.ts` are hot files for HC, RC and FD in the same window; (3) FD's arrival pipeline rewrites how carried units arrive, which piece `onArrive` triggers depend on; (4) the generic preview must stay readable at 375×812 when several overlays coexist (only the Lab and the lower Seam mix districts).

## 4. Contracts

**Provides**
- `DistrictModule` (engine): `rules`, `pieces`, `offerKinds`, `hearKinds`, `events` (+ `describe`), `trip: { returnBlocks, choices, roomSetup, afterRoom, offersFor, parseState }`, `intrusion`. All optional; an empty module is a plain district like the Seam.
- `DistrictDef` (data): `id, name, lean, guild, edge, rooms, ret, checkpoint?, hear, gate, threshold copy, map, line, barred, intrusion?` and per-room `bonus?`.
- `BoardRule { id, slot, order, scope, activatedBy?, init, step(ctx), preview? }`; `BattleState.rules`.
- `PieceDef { id, token, solid, data?, triggers, palette, bench, art }`; `Tile.piece`; generic `componentsOf(state, predicate)` for cut/connected checks (piers, cloud networks).
- `OfferKind { id, onPick, onBank, onWipe, limitPerTrip?, parse, card }`; `rollOffers` extended with `extra` offers.
- `HearKind` registry; `Goal` additions (`withinRounds`, `piece`, `outOfRoom`).
- `returnPolicy(trip)`, `crossroadsChoices(trip)`, `chooseAt(trip, choice)`, `startTrip(p, seed, district, { at: 'start' | 'checkpoint' })`, `city.checkpoints`.
- `removeFromRoom(ctx, unit, cause)`, `Unit.out`, event `outOfRoom`.
- `EnemyDef.script` + `standIn`; scripted-step registry.
- `IntrusionSpec { district, pieces, rooms (3 layouts), loot: 'basics' }` read by SM.
- UI: `src/ui/districts` registries for piece art, event animation, preview overlay, offer cards; the "Next round" preview toggle; Map nodes for seven districts with `solvedArt`.

**Consumes**
- **FD-W0:** the arrival pipeline interface (piece `onArrive` hooks register into it); authoritative event contracts and the 500-event cap (rule events count in the round-end phase).
- **HC-W0:** variable party (`MemberId` set and per-trip slots), per-room board size and start-point notation, threshold rooms played by the trip slots. DK's `roomSetup` board edits apply after HC's start-point draw.
- **RC-W0:** the recruit offer semantics, registered as an offer kind through DK-7.
- **RV-W0:** the telegraph/intent contract for stand-ins; the recovered-page record that `pages` hearing counts.
- **SM-W0:** the lower-Seam floor framework that reads `IntrusionSpec`; SM owns the sealed door gate.

## 5. Tasks

| ID | Goal | Owned area | Role | Size | Depends on | Acceptance |
|---|---|---|---|---|---|---|
| **Wave 0: contracts and baseline** | | | | | | |
| DK-0 | Golden baseline: recorded bot trips and battles for the Seam and the canals (several seeds, wins and wipes, a threshold solve) with their full event logs and end saves, committed as fixtures | `tests/fixtures/district-kit/`, `tests/run/golden.test.ts` | Medium | S | none | Test replays the fixtures green on today's code |
| DK-1 | Contract types and empty registries for P1–P16 (interfaces only, the Seam as an empty module), file layout and index files | `src/engine/districts/`, `src/data/districts/index.ts`, `src/ui/districts/index.ts`, type re-exports | Strong | M | none | `pnpm check` green; reviewed against HC/RC/RV/SM/FD contracts; TECH §7 row drafted for the orchestrator |
| DK-2 | Trip flow out of `run.ts` (P17), break the `city.ts` ↔ `run.ts` cycle | `src/engine/trip/`, `run.ts`, `city.ts` | Medium | M | DK-0 | Golden green; no public API change except new paths |
| **Wave 1: framework (parallel after DK-1/2)** | | | | | | |
| DK-3 | Round-end rule hook (P8, P9): slots, ordering, rule state, activation, generic preview; port the current and lock gates as the canals' rule; `driftPreview` becomes the rule's preview | `src/engine/turn.ts`, `src/engine/rules.ts`, `src/engine/districts/canals.ts`, `current.ts` | Strong | M | DK-1, FD-W0 | Golden logs identical; a fixture rule in each slot proves order in a unit test |
| DK-4 | Board-piece registry (P10): `Tile.piece`, namespaced notation tokens, solidity, triggers wired into FD's arrival hook, damage/landing (`onStruck`, `onHit`) and turn end, `componentsOf` | `src/engine/pieces.ts`, `notation.ts`, `types.ts` (Tile), trigger call sites | Strong | M | DK-1, FD-W0 | Round-trip notation tests; scenario tests with a fixture piece for each trigger; golden green |
| DK-5a | Trip shape, return side (P3–P5): `ret`, return blocks, Crossroads choices recorded on the trip, variant pools, checkpoint/no-return, `startTrip` at checkpoint; canals' landings ported to `ret` | `src/engine/trip/` (return, choices), `src/data/districts/{seam,canals}.ts` | Strong | M | DK-2, HC-W0 | Golden green; fuzz (`tests/sim`) covers every `ret` kind on fixture districts and keeps "the heart is a return point" |
| DK-5b | Trip shape, state side (P7, P13): trip state with parse defaults, `roomSetup`/`afterRoom`/`offersFor`, room bonus objectives, Goal additions | `src/engine/trip/` (state, setup), `city.ts` (goals) | Strong | M | DK-5a | Fixture trip carries a counter into its heart and a bonus goal grants a pick; save round-trip test |
| DK-6 | Out of the room (P11): unit state, `removeFromRoom`, targeting/turn-order exclusions, loss and haul-back, event and describe line | `src/engine/outOfRoom.ts`, `ctx.ts`, `queries.ts`, trip HP carry | Strong | M | DK-1, HC-W0 | Scenarios: one member out then win (1 HP back), all out = wipe, minion gone, elite stunned; canals' drop unchanged in golden |
| DK-7 | Offer-kind registry (P6): `LootItem` extension, pick/bank/wipe/parse/limit, `extra` offers in `rollOffers`; port key and doorway | `src/engine/trip/offers.ts`, save parsing of loot | Strong | M | DK-2, RC-W0 | Golden green; fixture kinds bank, vanish on wipe, respect limits and parse back from a save |
| DK-8 | Hearing kinds (P12): registry, district-scoped `named`, the five new kinds; replace the drawn districts' placeholder triggers with the designed ones | `src/engine/hearing.ts`, `city.ts`, `src/data/districts/*.ts` (hear only) | Medium | M | DK-1, RV-W0 (`pages`) | Each kind has a log-fixture test (meets and narrowly misses); old canal hearing unchanged |
| DK-9 | Stand-in hearts (P14): script steps, telegraph through RV's contract, `standIn` → heart cleared, no page | `src/engine/foes.ts` (script runner), `src/data/enemies` types | Medium | M | DK-1, RV-W0 | Scenario: a fixture stand-in telegraphs and acts deterministically by round; clearing it marks the heart, `pages` stays 0 |
| DK-10 | Lower-Seam intrusion contribution: `IntrusionSpec`, piece-scoped rule import (P9), the canals' intrusion (a lane with its current) as the first entry | `src/engine/districts/` (intrusion), `src/data/districts/canals.ts` | Medium | S | DK-3, DK-4, SM-W0 | SM's floor builder reads it; a fixture floor drifts but carries no district-scoped rule |
| **Wave 2: screens and tools (parallel)** | | | | | | |
| DK-11 | Generic Crossroads and Set out: choices from the module, greyed reasons, "after this room: no way home" warning on the push choice, checkpoint start option | `Crossroads.svelte`, `SetOutSheet.svelte`, `src/app/` helpers | Medium | M | DK-5a, DK-5b | Phone check 375×812 for landings, a two-span choice and the doorway on fixture districts |
| DK-12 | Offer cards from the registry; Loot screen handles extra picks and kinds with stakes (a "terms" slot showing reward/condition/penalty) | `Loot.svelte`, `OfferCard.svelte`, `src/ui/districts/` | Medium | S | DK-7 | Phone check with a fixture termed offer and a key |
| DK-13 | Board rendering from the registries: piece art, rule preview overlay replacing `DriftLayer` (toggle "Next round"), `outOfRoom` token in the party strip, default event animation | `src/ui/components/board/`, `BattleView.svelte`, `PartyStrip.svelte` | Medium | M | DK-3, DK-4, DK-6 | Canal boards look and preview as before (screenshot compare); fixture piece and gauge visible at 375×812 |
| DK-14 | Lab and Bench from the registry (BL-102): palettes list registered foes/pieces/states, Bench shows what is `met` (canal foes, water/current, vents, compounds), subject counting from the registry, three-subject limit and discovery gates kept | `src/app/lab.ts`, `src/app/bench.ts`, Lab/Bench screens | Medium | M | DK-4 | Bench offers the canal eel after it is met and not before; tests for `sceneItems`/`subjectsIn`; phone check |
| DK-15 | Threshold data (BL-94, P15): copy, start points, rules/pieces, `solvedArt`; screen reads it | `src/data/districts/canals.ts` (threshold), `app/threshold.ts`, `Threshold.svelte` | Fast | S | DK-1, HC-W0 | Canal lock plays and reads as today; golden threshold solve green |
| DK-16 | The map for seven (BL-95, P16): positions and label spacing for all seven, `lean` captions, per-district solved art, a slot for the lower Seam/sealed door that SM fills, a checkpoint mark | `Map.svelte`, `DistrictNode.svelte`, `app/city.ts`, `src/data/districts/*` (map only) | Medium | M | DK-1 | Dev "open all" screenshot at 375×812: no overlaps, paths clear of captions |
| **Wave 3: proof** | | | | | | |
| DK-17 | Port proof: Seam and canals live entirely in their module files; `districts.ts` is only the index; the drawn five sit in their own stub files | `src/data/districts/`, `src/engine/districts/` | Medium | S | DK-3…DK-16 | Golden fixtures identical; fuzz and calibration sims unchanged within noise |
| DK-18 | Fixture district (test only) that exercises every hook: a terms-like block, span choice, a checkpoint with no return, trip state into the heart, a rule in each slot, a piece with every trigger, an offer kind, a hearing kind, a stand-in heart, an out-of-room fall. Doubles as the template district plans copy | `tests/fixtures/district-kit/fixture-district/`, `tests/run/kit.test.ts` | Strong | M | DK-17 | One test file walks a full trip through every hook; a short "how to add a district" note goes to the orchestrator for TECH.md |

## 6. Verification

- **Golden equivalence** (DK-0, rerun after every task): the Seam and canal trips, battles and the lock solve produce identical event logs and end saves.
- **Scenario tests** (`scenario` skill): rule slot order, each piece trigger, out-of-the-room cases, stand-in script, each hearing kind's meet/miss pair.
- **Fuzz/bot** (`tests/sim`): random trips over the fixture district and the canals; invariants: never stranded (the heart and every checkpoint are reachable return points or lead to one), no return past the point of no return, trip state survives save/load, one key per trip, offer kinds bank or vanish correctly.
- **Phone checks** (375×812, `verify` skill): Crossroads (landing, span choice, doorway), Loot with a termed offer, a canal board with the "Next round" preview, Bench palette after meeting canal foes, the threshold screen, the map with all seven opened via dev toggle.
- `svelte-autofixer` on every changed component; `pnpm check` per task.

## 7. Open questions for the player

1. **What comes with a lower-Seam intrusion?** Proposal P9: a piece brings its own behaviour (a lane drifts, a pier's cut span falls, bells ring by tone) but never a district-wide rule (the boil-over gauge, the heat, the guild's pencil hand). Is "a span with a pier" that can collapse still gentle enough for the Seam, or should intrusions be inert pieces?
2. **Starting the Cartographers' hall once the doorway is known:** default to the doorway (P5), with room 1 one tap away? Or always ask?

## 8. Execution notes

- **Critical path:** DK-0 → DK-2 → DK-5a → DK-5b → DK-11 → DK-17 → DK-18. DK-1 runs beside DK-0/DK-2. Wave 1 tasks run in parallel once DK-1 and DK-2 are merged (DK-3/DK-4 also wait for FD-W0, DK-5a/DK-6 for HC-W0, DK-7 for RC-W0, DK-8/DK-9 for RV-W0, DK-10 for SM-W0). Wave 2 is five independent UI tasks on separate preview ports.
- **Sequencing request to the orchestrator:** schedule DK-2 (the `run.ts` split) before HC, RC and FD start editing the trip flow; it is mechanical and short.
- **District plans start after DK-17;** they can use DK-18's fixture as their template. Until a district build lands, its stub stays `gate: 'drawing'`.
- **Size:** 20 tasks: 5 S, 15 M; about one L-plan of work, mostly Strong in Waves 0–1.
