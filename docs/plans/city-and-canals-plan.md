# The city and the canals: implementation plan

Design: [city-and-districts.md](../design/city-and-districts.md) §0 (all three tables), §1–§5. Roadmap: BL-22 (map, hearing, gates) and BL-21 (the oil-lit canals). Where this plan and the design disagree, the design wins and the orchestrator asks. Project rules: [CLAUDE.md](../../CLAUDE.md). Run with the `implement` skill.

**Order:** the canals are playable early. After Wave 2 (**milestone A**), you can open the canals from a dev toggle and play them end to end from the map: the current, the four foes, landings, and the lamp-mother. Wave 3 (**milestone B**) adds the real way in (hearing, the canal lock), keys and rumours, text, the fuzz and the wrap-up.

**Scope**

| # | Item | Task |
|---|---|---|
| K1 | Districts as data; a trip belongs to a district; the Seam moves in unchanged | W0 |
| K2 | The current: water lanes, drift at round end, grates, the wooden gate | E1 |
| K3 | Canal foes: eel, Snuffer, lamp-moth, swimming oil-rats, the lamp-mother | E2 |
| K4 | City state: heard / open / heart cleared, hearing, gates (discovery, threshold, key), rumours, landings | E3 |
| K5 | Canal rooms: 4 depths × 3 layouts + 3 heart variants, loot by depth, sim balance | C1 |
| K6 | The canal lock (threshold room) and its solver test | C2 |
| K7 | Board visuals for water, grate, gate, lamps, new foes and intents, drift preview | U1 |
| K8 | The sketch map behind the door | U2 |
| K9 | Landings at the Crossroads, "heard" on the trip page, rumours at the window | U3 |
| K10 | The threshold screen | U4 |
| K11 | Names, blurbs, owner's lines, hints | D1 |

**Not in this plan:** new runes, loot tables, solvents, recipes, aspects (pushed to the rune-content rework); any district after the canals (the key and rumour mechanisms are built and tested on fixture districts only); multi-tile units; a codex section for places (see K-22); audio.

---

## 0. Team and models

Same setup as the [glyph mastery plan](glyph-mastery-plan.md) §0: an **Opus** orchestrator (W0 contracts, merges, docs, final verification), **Sonnet** implementers, **Haiku** clerks. Tasks run in worktrees with explicit file ownership. A task that fails review twice moves up one model.

UI agents use the preview ports `dev-alt` (5190), `dev-alt2` (5191) and `dev-alt3` (5192), one agent per port. The orchestrator assigns the port in the spawn prompt and keeps `dev` (5173). To reach the canals before milestone B, UI agents load the fixture save W0 writes (`tests/fixtures/city-save.json`: canals open, a live canal trip at room 2) into localStorage via `javascript_exec`, then reload.

Subagents never edit `DESIGN.md`, `TECH.md` or `docs/design/*`. Every rule they invent goes under **Proposals** in their report.

---

## 1. Rules this plan settles (*Proposals*, log in DESIGN §11 and the design doc §0 when built)

**Districts and trips**

| # | Topic | Default | Why |
|---|---|---|---|
| K-1 | District data | `src/data/districts.ts`: `DistrictDef { id, name, material, guild, encounters, landings, hear, gate, map, line, barred }`. `DistrictId = 'seam' \| 'canals'`. The Seam's encounters move here unchanged; `ENCOUNTERS` stays exported as the Seam's list for old callers and tests | One entry per district, as the design doc §4 says |
| K-2 | Trips | `Trip.district`; `startTrip(p, seed, district)`; every `ENCOUNTERS[t.encounter]` becomes `encountersOf(t.district)[t.encounter]`. `variantFor` keeps `deriveSeed(seed, 2000 + encounter)` for the Seam and salts other districts (`3000 + 100·districtIndex + encounter`) | **Seam replays stay byte-identical**: existing saves, scenarios and sim logs must not change |
| K-3 | Loot by depth | The canals reuse the current tables: rooms 1–2 `shallow`, 3–4 `deep`, 5 `heart` (2 picks) | Loot content is out of scope |
| K-4 | Landings | `DistrictDef.landings: 'all' \| readonly number[]` (encounter indices after which you may return). Seam `'all'`; canals `[0, 2, 4]`. `returnHome` throws at a non-landing Crossroads; `nextLanding(t)` gives the next landing's room name for the greyed button | Design §5.2 |
| K-5 | Save v5 | Migration 4 → 5: `trip.district = 'seam'`, `lastTrip.district = 'seam'`, `profile.city = { heard: ['seam'], open: ['seam'], hearts: [], solved: [], trips: 0, fresh: [] }` | Old saves are Seam-only by definition |

**The current**

| # | Topic | Default | Why |
|---|---|---|---|
| K-6 | Tiles | `Tile` gains `water: Dir \| null` (a lane tile and its downstream direction), `grate: boolean`, `gate: boolean`, `lamp: boolean`. Board tokens (W0 checks they're free in `parseCell`): `w` + arrow for water (`w>`, `wv`, combinable with `o`, `i`, `~`), `h` grate (always on water), `g` gate, `l` lamp | Terrain is tile state, like vents and plates |
| K-7 | Wading | Members and land foes may walk into water. It costs nothing. Water conducts nothing (Spark included) | Design §5.1 default: water only carries |
| K-8 | Drift step | In `hazards`, **first**: everything floating on a water tile moves one tile along that tile's direction, computed from a snapshot (no double moves). Floats are oil (with its fire and stain) and ink puddles. A float leaving the board is gone. One moving onto a non-water tile stops where it is. Floats merge (oil ∪ oil; a lit float lights the oil it joins). Then `spreadFire`, then the existing burn step | Drift before burn: fire that floats onto an eel burns it this round. The lamp-mother is burned before she snuffs (K-15) |
| K-9 | Units in water | After the floats, units standing on water drift one tile if the target tile is free, not a plate, gate or grate, and on the board; else they stay. Swimmers (eel), fliers (moth) and anchored units (lamp-mother) don't drift. Order: downstream-most first | Members can be carried too, as the design says |
| K-10 | Grate | A water tile that floats pass but units, movement and projectiles don't (like a plate for them; doesn't conduct) | Closes the lock's "Bolt down the lane" leak (design §5.3) |
| K-11 | Gate | A wooden lock gate: blocks movement and projectiles like a plate, doesn't conduct, can't hold oil. At the burn step and right after any `ignite`, a gate orthogonally next to fire **burns**: `gate = false`, event `gateBurns` | One rule, checked where fire already is |
| K-12 | Events | `drift { floats: {from, to}[]; units: {unit, from, to}[] }` (one per round, only when something moved), `gateBurns { at }`, plus the foes' events (K-13 to K-16). Codex interaction `drift` is discovered the first time a float moves | Everything is a `GameEvent`, and the codex learns the current |

**Foes** (numbers from design §5.4, *tune by playing*)

| # | Topic | Default | Why |
|---|---|---|---|
| K-13 | EnemyDef | Gains `habitat: 'land' \| 'water' \| 'any'` (where it may stand), `flies`, `anchored`, `snuffs: boolean`, `bursts: boolean`, `boss: boolean`. Existing foes: `habitat: 'any'`, everything else false. Rats drift in water; their oil trail on water floats | Data, not engine branches per id |
| K-14 | Eel (`ai: 'lurker'`) | Paths only over water tiles (move 4) to the water tile next to the nearest member it can reach; telegraphs **Lunge** (adjacent, 2) at a member orthogonally beside its tile. With no member reachable it holds | A lurker you can plan around |
| K-15 | Snuffer (`ai: 'chaser'`) and snuffing | Move 1, **Pole** (adjacent, 1). Snuff step at the end of `hazards`, after burn: every fire in the 3×3 of a living snuffer is put out **with its oil**; event `snuff { by, tiles }` | "Leaves nothing" (design §0); after burn, so floated fire still lands its hit |
| K-16 | Lamp-moth (`ai: 'moth'`) | Flies (ignores water, drift and oil slide), move 3, toward the nearest fire, else the nearest member. Telegraphs **Burst** on an adjacent member. A burst (its own, or its death from fire, Spark or another burst) ignites the oil on its tile if any and deals 1 to each orthogonal neighbour; event `burst { unit, at }`. A moth that bursts dies. Bursts chain | "Leaves fire on its tile" means lighting oil there: the engine has no fire without oil |
| K-17 | Lamp-mother (`ai: 'mother'`, boss) | 14 HP, anchored on water, never moves. Intents gain a kind: `{ kind: 'summon', at: lamp }` every round at the lit lamp nearest a member (skipped if the lamp tile is taken or 4 moths live); `{ kind: 'flare' }` every third round instead: every moth bursts at once, in reading order. She snuffs like a Snuffer (K-15). Fire hurts her only on her own tile, which the burn step already does | Design §5.6. Intent kinds generalise for later bosses |
| K-18 | Boss display | `boss` foes show their name and an HP bar in the battle header | One-tile bosses need presence |

**City state, hearing and gates**

| # | Topic | Default | Why |
|---|---|---|---|
| K-19 | Profile.city | `{ heard, open, hearts, solved, trips, fresh }`: district ids heard, open, heart cleared, threshold rooms solved; finished trips; and `fresh` (heard since the map was last opened, drawn in new ink) | A plain ladder the map draws |
| K-20 | Hearing conditions | `HearCondition = { kind: 'ignite'; atLeast; district? } \| { kind: 'discovered'; codex } \| { kind: 'heart'; district } \| { kind: 'trips'; atLeast }`, each with `voice: 'owner' \| 'rumour'`. Owner conditions are checked in `closeBattle` on the battle log (**win or wipe**); rumour ones after the trip ends, in `returnHome` and on a wipe. A heard district goes in `TripStats.heard` for the trip page. The canals: `{ kind: 'ignite', atLeast: 3, district: 'seam', voice: 'owner' }` (one `ignite` event with ≥ 3 tiles) | Kept on a wipe (design §0); the event log already has the region size |
| K-21 | Gates | `Gate = { kind: 'none' } \| { kind: 'discovery' } \| { kind: 'threshold'; room: ThresholdDef } \| { kind: 'key'; from: DistrictId; table: LootTableId; weight }`. `discovery` opens on hearing; the Seam is `none` (open from the start) | Design §3 |
| K-22 | Threshold battle | `BattleSpec.objective?: DraftGoal` (reusing the drafts' goal DSL; `DraftEventType` gains `gateBurns`). With an objective the battle is won when the goal is met (checked after each action and at round end), never by "no enemies left", and lost only if the party falls. Played from the map with the current lattices, full HP and charges; not a trip, no proof, no records. Retry restarts; leaving changes nothing. Solving it adds to `city.solved` and opens the district. **The solved room shows on the map (a burnt gate) instead of a codex entry**; a codex "places" section waits | The design wanted a codex entry; the codex has no place kind yet, and the map already records it. Log as a design change |
| K-23 | Keys | `LootSpec { kind: 'key'; district }`. Offered by `rollOffers` in `from`'s table only while the target is heard and not open, at most one per trip, never again once banked. Trip loot: lost on a wipe, opens the district in `returnHome` | Design §3.2 |
| K-24 | Dev toggle | The Lab gets "Open every district" (dev builds and `?dev`) so milestone A is playable before hearing exists | Playable early, as asked |

---

## 2. Contracts (Wave 0, orchestrator)

`src/data/types.ts`, `src/data/districts.ts`, `src/data/index.ts`
- `DistrictId`, `DistrictDef`, `HearCondition`, `Gate`, `ThresholdDef { name; board; goal: DraftGoal; note }`. `LootSpec` / `LootItem` gain `key`. `DraftEventType` gains `gateBurns`. `InteractionId` gains `drift`.
- `EnemyId` gains `eel`, `snuffer`, `moth`, `mother`; `EnemyAi` gains `lurker`, `moth`, `mother`; `AttackId` gains `lunge`, `pole`, `burst`. `EnemyDef` gains K-13's fields (filled for the existing four). The new foes' stat lines as in K-14 to K-17, with placeholder blurbs.
- `districts.ts`: the Seam (encounters moved from `encounters.ts`, which re-exports them), and the canals with **one placeholder room per depth** (C1 replaces them), landings, hearing, and a threshold gate with a placeholder board (C2 replaces it).

`src/engine/types.ts`, `events.ts`
- `Tile` K-6 fields. `Intent` becomes `{ kind: 'attack'; attack; dir; order } \| { kind: 'summon'; at; order } \| { kind: 'flare'; order }` (existing code reads `kind: 'attack'`). `Trip.district`, `TripRecap.district`, `TripStats.heard: DistrictId[]`, `Profile.city` (K-19). `BattleSpec.objective`, `BattleState.objective`.
- Events: `drift`, `gateBurns`, `snuff`, `burst`, `summon`, `flare`, each with a `describeLog` line.

`src/engine/notation.ts`: K-6 tokens in `parseCell` and `serializeBoard`, with round-trip tests.

`src/engine/run.ts`, `turn.ts`, `battle.ts` (W0 only, nothing after)
- K-2 refactor: `encountersOf(district)`, `startTrip(p, seed, district = 'seam')`, `pushOn` / `placeOf` / `variantFor` / `finishEncounter` / `pickLoot` by district. `returnHome` calls `canReturn(t)` (E3) and `bankKeys` / `hearAfterTrip` (E3). `closeBattle` calls `hearFromBattle(p, t, log)` (E3). `rollOffers` takes `keyOffer(p, t, table)` (E3), like `nextDraft`.
- `turn.ts` `hazards` calls, in order: `drift(ctx)` (E1), the existing steps with `burnGates(ctx)` (E1) after burn, `snuffStep(ctx)` (E2). Intent resolution dispatches on `Intent.kind` to `resolveSpecial(ctx, e)` (E2) for summon and flare.
- `battle.ts` `checkEnd` honours `objective` via `objectiveMet(state, log)` (E3).
- **Seam identity test:** every existing scenario, sim and replay log is byte-identical after W0 (except new optional fields). This is the gate for W0.

Stubs with final signatures, each returning a neutral value:
- `src/engine/current.ts` (E1): `drift(ctx)`, `burnGates(ctx)`, `driftPreview(state) → { floats; units }` (where things will be after the next drift, for U1).
- `src/engine/foes.ts` (E2): `snuffStep(ctx)`, `resolveSpecial(ctx, e)`, `burstAt(ctx, unit)`, plus AI entry points that `ai.ts` dispatches to.
- `src/engine/city.ts` (E3): `cityDefaults()`, `hearFromBattle`, `hearAfterTrip`, `canReturn(t)`, `nextLanding(t)`, `keyOffer`, `bankKeys`, `objectiveMet`, `solveThreshold(p, district)`, `districtState(p, id) → 'unheard' \| 'heard' \| 'open'`, `openAll(p)` (dev).
- `src/app/save.ts`: `CURRENT_VERSION = 5`, migration 4 → 5 (K-5) and its tests.
- `src/app/routes.ts`: routes `map` and `threshold`. `src/app/flow.ts`: screens `map`, `threshold` (closed on a trip, like the Bench); `setOut(save, district)`.
- **UI mount points:** `screens/Map.svelte` (stub: a list of open districts, each with "Set out", so milestone A works before U2), `screens/Threshold.svelte` (stub). The Study door goes to `#/map`. The Lab gets the K-24 toggle.
- Fixtures: `tests/fixtures/city-save.json` (v5: canals open, a canal trip at room 2 with water on the board).

Commit `chore: city and canals contracts (W0)`, then push. **W0: Opus, L, ~15 %.**

---

## 3. Waves and tasks

Usage estimates are % of the 5-hour window (S ≈ 3, M ≈ 8, L ≈ 15). The whole plan is about 120 %: plan on two windows, with the break after Wave 2 (milestone A).

| Wave | Task | Model | Size · usage | Owns | Depends on |
|---|---|---|---|---|---|
| 1 | **E1** The current | Sonnet | M · 8 | `src/engine/current.ts`, `src/engine/movement.ts` (wading, grate and gate blocking); `tests/scenarios/current.test.ts`, `tests/engine/current.test.ts` | W0 |
| 1 | **E2** Canal foes | Sonnet | L · 15 | `src/engine/foes.ts`, `src/engine/ai.ts`, `src/engine/damage.ts` (burst on death), `src/data/enemies.ts`; `tests/scenarios/foes.test.ts` | W0 |
| 1 | **E3** City engine | Sonnet | M · 8 | `src/engine/city.ts`; `tests/run/city.test.ts` (fixture districts for keys and rumours) | W0 |
| 2 | **C1** Canal rooms | Sonnet | M · 10 | canal encounters in `src/data/districts.ts`; `tests/sim/canals.test.ts` | E1, E2 |
| 2 | **C2** The canal lock | Sonnet | S · 5 | the canals' `ThresholdDef` in `src/data/districts.ts` (after C1 merges); `tests/run/lock.test.ts` | E1, E3 |
| 2 | **U1** Board visuals | Sonnet | M · 10 | `components/board/*`, `components/battle/*`, `src/app/view.ts`, `src/app/overlay.ts` | E1, E2 |
| 2 | **U2** The sketch map | Sonnet | M · 10 | `screens/Map.svelte`, `components/map/*`, `src/app/city.ts`; `tests/app/city.test.ts` | E3 |
| 2 | **U3** Landings, heard, rumours | Haiku | S · 3 | `screens/Crossroads.svelte`, `screens/TripPage.svelte`, `study/StudyScene.svelte`, `src/app/tripviews.ts` | E3 |
| — | **Milestone A** | Opus | S · 3 | merge, `verify` a canal trip from the map (dev toggle) at 375 × 812, push | Wave 2 |
| 3 | **U4** Threshold screen | Sonnet | M · 8 | `screens/Threshold.svelte`, `src/app/threshold.svelte.ts`; `tests/app/threshold.test.ts` | C2, U1, U2 |
| 3 | **D1** Text | Haiku | S · 3 | text fields in `src/data/districts.ts`, `src/data/enemies.ts`, `src/data/codex.ts` (`drift`) | C1, C2 |
| 3 | **F1** Fuzz | Sonnet | M · 8 | `tests/sim/fuzz.test.ts` | E1, E2, E3, C1 |
| 4 | **W4** Wrap-up | Opus (+ Haiku QA) | M · 10 | docs, status file, fixes | all |

Start order: E2 first (largest, critical path to C1), then E1 and E3. In Wave 2, C1 and U2 first, then U1, C2, U3.

**Acceptance (every task):** `pnpm check` green; new rules covered by tests that assert on the event log (scenario tests per the `scenario` skill for any rule change); Seam logs unchanged; no file edited outside the task's ownership; Proposals in the report. **UI tasks also:** `svelte-autofixer` clean, the `verify` skill at 375 × 812 with a screenshot, no horizontal scroll.

### Task checks

- **E1:** scenarios by event log for K-6 to K-12: oil drifts one tile and merges; a lit float lights the oil it joins; a float leaves the board; a float stops at the lane's end; a stain and an ink puddle drift with their tile; a member and a rat drift, an eel and a moth don't; a unit blocked downstream stays; two units in one lane don't swap or collide (downstream-most first); fire that drifts onto a unit burns it in the same round; a grate passes oil but stops a Bolt and a walk; a gate burns from adjacent fire both at ignition and at the burn step; Spark on water conducts nothing. `driftPreview` matches the next `drift` in every scenario.
- **E2:** the eel never stands on land and lunges only from water; the Snuffer's snuff removes fire **and** oil in its 3×3, after burn; a moth chases fire before members, bursts on its intent and on death by fire or Spark, and bursts chain; the lamp-mother summons at the right lamp, skips a taken lamp and the fifth moth, flares every third round, snuffs, and takes burn damage from fire floated under her before the snuff; rats drift and their trail floats. AI is deterministic (same seed, same intents).
- **E3:** hearing from one `ignite` of 3 tiles in a Seam battle, kept on a wipe, not from 2 tiles, not from the canals; rumour conditions after a trip (heart, trips count); `discovery` opens on hearing; `canReturn` and `nextLanding` for the canals' landings; a key is offered only while heard and closed, once per trip, lost on a wipe, opens on return, never again; `objectiveMet` for `gateBurns`; `fresh` is cleared when the map is opened (an app call U2 makes).
- **C1:** design §5.5: 3 named layouts for each of rooms 1–4 and 3 heart variants; water grows by depth; room 4's "uphill reach" lane flows up; every room 1 has an eel in reach of a member by turn 1 (as the Seam's rat). `tests/sim/canals.test.ts`: ≥ 200 seeded bot trips with the start loadout plus the Seam's average deep-trip collection; report win rate per room and lamp-mother kills. Target bands (*tune by playing*): room 1 ≥ 90 %, heart 35–65 %. Adjust HP and layouts, not rules, to hit them; report the numbers.
- **C2:** the lock board per design §5.3 and K-10/K-11: no enemies, and the gate is reachable only by drift. `tests/run/lock.test.ts`: (a) at least three distinct solutions pass with start-collection lattices (oil upstream then spark as it passes; light then let it drift; Splash oil wide); (b) a brute-force search over every single-turn action set with no round end fails to burn the gate (no drift-free solution).
- **U1:** water lanes with faint downstream arrows; grates, the gate and lamps drawn with the existing minimal shapes; the eel, Snuffer, moth and lamp-mother tokens; intent marks for Lunge, Pole, Burst, summon (the lamp glows) and flare (every moth marked); the boss header with HP (K-18); **drift preview**: holding a water tile (or a "next round" toggle) shows ghosts of where floats and units will be after the drift (`driftPreview`). The drift animates as one slide per round. Readable at 375 × 812.
- **U2:** design §1: a torn notebook page (minimal shapes, ink lines) with the Seam in the middle; unheard = blank paper; heard = a smudged node with its line and how the way is barred; open = inked, tap → the "Set out?" sheet (moved from the Study); heart cleared = a small mark; a solved threshold = a burnt gate; `fresh` nodes in new ink until seen. A heard threshold district offers "Try the lock" (→ `#/threshold?d=canals`). Material and guild shown once heard.
- **U3:** the Crossroads at a non-landing room shows Push on and a greyed Return home with "No landing here. The next is after {room}"; the trip page has a highlight for each district heard ("The owner drew the canals on the map"); a rumour line appears once at the Study window after the trip that earned it.
- **U4:** the threshold screen runs the battle with the objective banner ("Burn the lock gate"), Retry and Leave; on success a short moment (the owner's line) and back to the map with the district open. Nothing changes on Leave. Uses U1's board.
- **D1:** names, blurbs and the owner's voice for the canals' line ("the black water climbs when lit"), `barred` text, the four foes, the lock's note, the Crossroads landing line, the `drift` codex entry and hint. Text only.
- **F1:** bots play canal trips and the lock: `compileLattice` and battles never throw; drift conserves floats (count never grows from drift alone; a float only moves downstream or off the board); no unit ever stands on a plate, gate or grate; the eel is always on water; replays are deterministic; city state only grows (heard ⊇ open ⊇ hearts).
- **W4:** the `verify` skill on merged `main` through the whole loop at 375 × 812 with screenshots: a Seam fire across 3 oil → the trip page says the canals were drawn → the map shows the smudge → the lock (fail once, retry, solve) → a canal trip with a landing refusal → the lamp-mother. Then `code-review`, docs (DESIGN §6.7 and §11, the design doc §0 with every Proposal and K-22's change, ROADMAP BL-21/BL-22 to the Done log), and the status file.

---

## 4. Shared-file hotspots

- **`src/engine/types.ts`, `events.ts`, `run.ts`, `turn.ts`, `battle.ts`, `save.ts`, `flow.ts`, `routes.ts`, `App.svelte`, `Study.svelte`:** W0 only. Every hook a later task needs is wired by W0 to a stub.
- **`src/data/districts.ts`:** W0 writes the structure; C1 owns the canal encounters, then C2 the threshold board (after C1 merges), then D1 the text fields only.
- **`ai.ts`:** E2 only. `movement.ts`: E1 only (E2 calls `enemyWalk` with its own path rules in `foes.ts`).
- **`components/board/*`:** U1 only; U4 uses it as is.
- **`tests/sim/fuzz.test.ts`:** F1 only.

## 5. Risks for the orchestrator to watch

- **Seam identity** (W0): the K-2 refactor touches every encounter lookup. Any change to a Seam log means a broken save replay. Keep the byte-identical test as the W0 gate.
- **Drift ordering** (E1): simultaneous moves, merges and lit floats are where bugs hide. Snapshot first, then apply; scenario tests for every merge case.
- **Readability of the current** (U1): the design's hypothesis is that it reads on a phone. If the preview is noisy, the arrows alone ship and the preview goes behind a hold.
- **Lamp-mother difficulty** (C1): a summoner can snowball. The cap of 4 moths and the flare clearing them are the brakes; the sim reports kills per heart.
- **The lock's leaks** (C2): the brute-force test is the guard. If the board needs a rule beyond K-10/K-11 to close a leak, report it as a Proposal; don't add it silently.
- **Hidden save growth:** `city` is small, but `TripStats.heard` and `fresh` must be cleared where they should be (E3 tests).

## 6. After the build

Play hypotheses for the player (from the design doc §7):
- Does the blank paper pull you as much as a `???` would?
- Does the free lock feel like a puzzle you're proud of, or a chore at the door?
- Is the current readable at 6 × 8, and do you plan a turn ahead with it?
- Do landings make the canals feel different from the Seam without making them a slog?
- Is the lamp-mother a fight you remember?
