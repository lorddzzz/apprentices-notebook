# Platform closure: implementation plan (GATE, KIT-R, SAVE, MIX, FU, CL)

Design: none of its own. Source: [midpoint-audit.md](midpoint-audit.md) §1.1, §1.2, §2.1–2.3, §3, §4.2 (adopted by the player 2026-11-11), [build-program-status.md](build-program-status.md) ("Next" 2, "Rough edges"), [district-kit-plan.md](district-kit-plan.md) P8 and P10, [ending-plan.md](ending-plan.md) §4 (DK-E1–E6). Roadmap: **BL-110**, **BL-111**. Prefixes **GATE**, **KIT-R**, **SAVE**, **MIX**, **BL**, **FU**, **CL**. Brief: [build-program.md](build-program.md).
**State: Building (GATE-1, KIT-R1, KIT-R2, KIT-R3a, SAVE-1 merged; KIT-R3b split into KIT-R3b–g and its blockers decided, P5–P9, design window 2026-11-12).**
**Scope:** the audit's platform and leftover tracks: a faster stable gate, the kit seams (engine hooks, board UI registries, heart frames and trip shapes, legacy pair ids), save and rule-pair safety nets, the two tooling items, the status file's small follow-ups, and the owed close-out of FD, DK, RV, FN, SM, IQ. Pack letters here are this plan's own; the audit's first batch maps as audit Pack E = Pack C, Pack D (EN-0) = ending-plan.

## 1. Scope and settled rules

**Delivers:** audit §2.3's GATE-1, KIT-R1, KIT-R2, KIT-R3, SAVE-1, MIX-1, the new KIT-R4 (audit S5), BL-110, BL-111, the follow-up sweep (§6) and the close-out docs. **Leaves out:** content (BF, CG), the generator (EN), calibration (all numbers go to [calibration-plan.md](calibration-plan.md)), P0 records (orchestrator, audit §2.3).
**Lives in other plans, not repeated here:** BR-20 and the BR-7 leftovers, BR-19a/b ([bridges-plan.md](bridges-plan.md)); IQ-F1–F5 and IQ-FG ([ink-quarter-plan.md](ink-quarter-plan.md)); EN-0, EN-W0, EN-S1, EN-G0 ([ending-plan.md](ending-plan.md)); BF-3 with `eventCap` from `battle.ts` ([foundry-plan.md](foundry-plan.md)).
**Hard edges (audit §2.2):** BR-20 → KIT-R1. KIT-R2 → any new board UI (BF-17, BF-18, CG-12, EN-7). EN-0 → MIX-1, EN-S1, CAL. EN-W0 → KIT-R3 → EN-S1 and EN-K1–K5. KIT-R4 → EN-9. BL-111 → EN-4. GATE-1 first, alone.
**Rules for every task here (audit §4.2):** agents run their own test paths with `--reporter=dot` plus `tsc --noEmit` (full typecheck only when a `.svelte` file changed); no sims unless the pack owns them; no win-rate "Done when".

## 2. Proposals

| # | Proposal | Reason |
|---|---|---|
| P1 | **KIT-R4 is a new ID** for audit S5, a Sonnet S/M task, not in the audit's table | The audit names the finding and "one S task before EN-9" |
| P2 | **`check:changed` runs `vitest run --changed main --exclude 'tests/sim/**'`** exactly as audit §4.2; `check:fast` keeps the full non-sim run | The orchestrator's merge gate must not depend on a diff |
| P3 | **Packs F and M run sims; every other pack runs none** | Audit §4.2: only the pack that owns sims runs them |
| P4 | **Follow-ups that are rule or text changes** (FU-6, FU-7) are built as the status file words them; if a design reading is unclear the agent stops and reports | The player decides rules; the build keeps defaults |
| P5 | **Lent trip shapes (design window 2026-11-12).** `DistrictModule.shapes?: readonly TripShapeDef[]`: shapes a district lends to drawn districts without using them for its own trips; `registry.ts` puts them in `KIT.shapes` beside every `trip`. The Seam lends `seam:plain` (no hooks, state `null`); the canals lend `canals:landings` (`returnBlocks` lets a party home after the 0-based rooms 0, 2, 4 … that exist and at the heart, for any length, matching the canals' `ret: landings`). The Seam and canals keep no `trip`, so `carriesKit` and `parseTripKit` are unchanged and no save moves | Registering a `trip` on them makes `carriesKit` true, so every Seam and canal save without `Trip.kit` would stop parsing; a migration buys nothing their own trips use. The canals' own return stays in its `ret` data, so nothing is checked twice |
| P6 | **The bot's district terms (design window 2026-11-12).** `botValue(state)` in `districts/api.ts` sums every module's `bot.value` in registry order; `sim/bot.ts` adds it where it added the boil term (with `gauge` on, as today) and reads cracked tiles through `crackedTiles` (same set as `crackedSet`, the bridges being the only `unsupported` module). The boil term moves to `src/engine/districts/bathhouses/bot.ts` as the bathhouses' `bot.value`; seam, canals and bridges register `bot: {}`. Invariant: a module's `bot.value` is 0 on a board without its rule. The `!src/engine/sim/bot.ts` include and its sentence leave `biome.json` | Behaviour-neutral by construction (one module has a value, one has cracks); the lint rule then holds for every core file |
| P7 | **Heart frames from the authored hearts (design window 2026-11-12).** A frame's placements are derived from its district's first authored heart variant, never copied by hand: every unit, piece and terrain cell (not start points, not plain tiles) at its fraction of the board, master first, then units, pieces and terrain in reading order. A shared helper `src/engine/districts/frame.ts` holds the exemplar's steps (seeded mirror and lean, settle to the nearest bare plain tile, start top-up); the ink quarter's frame calls it with its own list, boards unchanged. Where a heart needs a structure a scatter would break, the district stamps it and a test names the invariant: the canals' current as one closed clockwise loop under the lamp-mother, the Steward on a 4-connected cloud of 4 or more tiles, the Chief Warden on the keystone with every other tile span, pier or fog and no span cracked at the start. File: `heartFrame.ts` where the district has a `heart.ts`; `seam/` and `canals/` gain one | Fractions copied by hand drift from the rooms the player knows; one helper keeps four frames short and alike |
| P8 | **KIT-R3b is split** into one task per district frame (KIT-R3b Seam with the helper, KIT-R3c canals, KIT-R3d bathhouses, KIT-R3e bridges) and one pack for the lent shapes and bot terms (KIT-R3f, KIT-R3g), which runs after the frames and after KIT-R4 (both edit the district module files or `sim/bot.ts`) | One run per area; the parked attempt mixed both and stopped on the two questions above |
| P9 | **FU-21, ink footnote follow-ups** (C2's report): `wax-cloud-smother` re-read (cloud beside the bearer, id kept), two text clauses (release beats peel; born brass is no collar), one end-to-end `wax-cap-seal` scenario; decisions in [inkQuarter.md](../design/footnotes-content/inkQuarter.md) §8 | A variant that cannot fire is a bug the player would find first |

## 3. Current implementation and risks (checked at `a6e8bfb`)

- **Gate.** `package.json`: `typecheck` is `svelte-check && tsc --noEmit` (4 min 40 s, audit §4.1); `check:fast` adds lint and `vitest run --exclude 'tests/sim/**'`; CI runs `pnpm check`. `vite.config.ts:67` sets `testTimeout: 30_000`. The two bridges play-throughs are `tests/districts/bridges/rooms-play.test.ts` and `rooms34-play.test.ts`. `tests/sim/canals.test.ts:39` sets `LONG = 30_000` in quick mode.
- **S1 confirmed.** Core imports a district at `engine/push.ts:6` (`refusesHold`, `resists`), `engine/solvents.ts:5`, `engine/runes/actions.ts:24-25` (`refusesHold`, `cracksOf`), `engine/runes/flow.ts:3` (`cracksOf`), `engine/trip/finish.ts:5` (`markDoorSeen`); `engine/run.ts:241` tests `d === 'inkQuarter'`. Also `engine/districts/inkQuarter/wax.ts:8` imports `bridges/rightOfWay` (a district importing a district; the audit's Pack B file list omits it).
- **S2 confirmed.** `UnitToken.svelte` imports five districts and keeps a local `STAFF` list; `FxLayer`, `BattleBoard`, `BadgeLayer`, `Combat` import districts; `DistrictUi` has no `unitArt`, `fx` or `boardLayers` slot. `highlightArt` exists and `highlightArtFor` is in `ui/districts/index.ts`.
- **S3 confirmed.** `app/inkTerms.ts`, `inkClock.ts`, `inkHighlights.ts`, `bridgeView.ts` exist; `app/overlay.ts:38` imports `ui/districts/seam/hands`; `describe.ts` is 882 lines and imports ink, bridges and bathhouse data (`rivalReadout`, `lootLine`, `gaugeLine`, `boilOverTiles`, `fallenTiles`).
- **Heart frames.** `DistrictModule.heart` and `.bot` are declared (`engine/districts/types.ts:431-432`, `HeartSetup`, `BotTerms`) and no module registers them. `trip` shapes exist for ink quarter, foundry, bathhouses, bridges and the lower Seam; the Seam and canals have none.
- **S5 confirmed.** `MEMBER_IDS` (`@deprecated`, `data/apprentices.ts:65`) is used in `app/lab.ts:16,843,927`, `app/faircopy.ts:1,32,56`, `engine/profiler.ts:1,99`, `LatticeEditor.svelte:3,87` and 12 test files (49 uses). Replacement: `tripParty` / `inHousehold` in `engine/household.ts`.
- **Riskiest unknown:** whether a lint pattern can forbid `engine/districts/*` for core files yet allow `kit`, `api`, `types`, `registry` (Biome `noRestrictedImports` group with `!` exceptions). KIT-R1 settles it first.

## 4. Contracts

**KIT-R1 provides** (names are **Proposals**, the audit gives the semantics only):
- `DistrictModule.unsupported?(s: BattleState): readonly Coord[]` and `crackedTiles(s)` in `engine/districts/api.ts` (union over modules in registry order): replaces `cracksOf` at `actions.ts:252` and `flow.ts:349`; bridges implements it from `bridges/support.ts`.
- `DistrictModule.afterBattleClose?(p: Profile, t: Trip): Profile` applied at `trip/finish.ts:188` in registry order: replaces `markDoorSeen`; the lower Seam implements it.
- `DistrictModule.bindsBeforeOpen?: true` replaces the `'inkQuarter'` test at `run.ts:241`.
- A Biome rule: files under `src/engine/` outside `engine/districts/` may import only `districts/{kit,api,types,registry,index}`.

**KIT-R2 provides** (names **Proposals**): `DistrictUi.unitArt` (by foe or piece def id; absent = default token), `fx` (by Fx kind), `boardLayers` (components drawn over the board), `describe` (`intent`, `loot`, `gauge`, `eventTiles` readers used by `app/describe.ts`), `highlights` (the producers `inkHighlights`/`handHighlights` run from the registry; rendering stays `highlightArt`); lookups `unitArtFor`, `fxFor`, `boardLayersFor` in `ui/districts/index.ts`. District-only app files move to `src/ui/districts/<id>/`.

**KIT-R3 provides:** per district a `heart: HeartSetup` (frame fits any allowed board size, seeded; P7) and `bot: BotTerms` (P6); lent shapes `seam:plain` and `canals:landings` in `KIT.shapes` through `DistrictModule.shapes` (P5), the Seam and canals keeping no `trip`; `frame.ts` (`placementsFrom`, `placeFrame`) for every later frame (the foundry's in BF-12, the cartographers' in CG-10); `botValue` in `districts/api.ts`. One exemplar (the ink quarter) first; the other four follow its test.

**Leaves for later tasks (the status file's Owed list):** BF-17, BF-18, CG-12, EN-7 each add a `unitArt`/`fx`/`boardLayers` entry; BF-12 and CG-10 register `heart` and `bot` for the foundry and cartographers (EN-K6, EN-K7 read them); the Seam's `'seam'` string tests at `engine/recruits.ts:200` and `engine/trip/place.ts:20` stay (the base district); `data/enemies.ts`, `data/loot.ts`, `data/types.ts` still aggregate by hand (audit S4, left); every future district with a support rule implements `unsupported`.

## 5. Packs

### Pack A: Gate (role: Default; tooling; depends on: nothing, runs first and alone)
Owns: `package.json`, `tsconfig.json`, `.gitignore`, `tests/sim/canals.test.ts`, `tests/sim/bridges-*-play.test.ts` (moved), AGENTS.md "Commands" lines.
Pattern: the existing `check:fast` script.

| ID | Goal | Size | Done when |
|---|---|---|---|
| GATE-1 | Time `svelte-check` and `tsc` separately; split them into scripts; drop the redundant one from `check:fast` (keep the one that covers `.svelte`); incremental build for the other; move the two bridges play-throughs to `tests/sim/`; the CN-13 quick test fits its timeout; add `check:changed` | S | Scripts `typecheck:svelte`, `typecheck:ts`, `check:changed` exist and `typecheck` still runs what CI needs; `tests/districts/bridges/rooms-play.test.ts` and `rooms34-play.test.ts` now live at `tests/sim/bridges-rooms-play.test.ts` and `bridges-rooms34-play.test.ts` with the same test titles; `pnpm vitest run tests/sim/canals.test.ts` passes alone twice in a row; idle `pnpm check:fast` wall time is **at most 3 min 30 s** (from 5 min 45 s; both stage times recorded in the log row; if the bound cannot be met the report says why and the orchestrator decides); `pnpm check` still includes every sim; AGENTS.md lists `check:changed` |

### Pack B: Kit engine hooks (role: Default; engine; depends on: BR-20 merged)
Owns: `src/engine/districts/{types,kit,api}.ts`, `engine/districts/bridges/support.ts` and `bridges.ts`, `engine/districts/lowerSeam.ts`, `engine/push.ts`, `solvents.ts`, `runes/actions.ts`, `runes/flow.ts`, `trip/finish.ts`, `run.ts` (one line), `biome.json`, `src/ui/screens/Crossroads.svelte`, `tests/engine/kit-hooks.test.ts` (new).
Pattern: `harmGuards` in `types.ts` and `kit.ts` (a module list read lazily through the registry).

| ID | Goal | Size | Done when |
|---|---|---|---|
| KIT-R1 | The two hooks of §4 and the lint rule; no core file names a district | M | `grep -rnE "districts/(seam\|canals\|bathhouses\|bridges\|inkQuarter\|foundry\|lowerSeam)" src/engine --include='*.ts' \| grep -v '^src/engine/districts/'` prints nothing; `grep -rn "rightOfWay" src` prints nothing; a probe import of `./districts/bridges/support` from `engine/push.ts` makes `pnpm lint` exit non-zero (probe removed); tests `"KIT-R1: crackedTiles unions every module's unsupported tiles"`, `"KIT-R1: afterBattleClose marks the door seen on a Seam win only"`; existing suites `tests/districts/bridges`, `tests/districts/lower-seam-*`, `tests/engine`, `tests/run` pass unchanged |
| FU-1 | `CrossroadsChoice.note?` carries a ledger line (BR-7 follow-up); the Crossroads card shows it | S | test `"FU-1: a choice note reaches the crossroads card data and survives a save"`; UI: the bridges span cards at 375×812, light, a note line under each label, and a choice without a note unchanged |

### Pack C: Board UI registries (role: Default; UI, port 5191; depends on: nothing; this is the audit's Pack E)
Owns: `src/ui/districts/index.ts`, each `src/ui/districts/<id>/index.ts`, `ui/components/board/{UnitToken,FxLayer,BattleBoard,BadgeLayer}.svelte`, `ui/screens/Combat.svelte` (the one import), `app/overlay.ts`, `app/describe.ts`, `app/ink{Terms,Clock,Highlights}.ts` and `app/bridgeView.ts` (moved with their tests' import paths).
Pattern: the 14 existing `DistrictUi` slots; `highlightArtFor`.

| ID | Goal | Size | Done when |
|---|---|---|---|
| KIT-R2 | The §4 slots; the five board components, `describe.ts` and `overlay.ts` read the registry; district files out of `app/` | M | `grep -rn "districts/\(seam\|canals\|bathhouses\|bridges\|inkQuarter\|foundry\)" src/ui/components src/ui/screens/Combat.svelte src/app/overlay.ts src/app/describe.ts` prints nothing; no `src/app/ink*.ts` or `bridgeView.ts` remains; `pnpm typecheck` and `pnpm vitest run tests/ui tests/app --reporter=dot` pass unchanged; one Lab screenshot per district (seam, canals, inkQuarter, bathhouses, bridges, foundry) at 375×812 identical in layout to the one taken before (a foe with no `unitArt` draws the default token); the autofixer is clean on every changed component. **Phone check** |

### Pack D: Heart frames and trip shapes (role: Default; engine; depends on: EN-W0, Pack B; split 2026-11-12, P8: frames KIT-R3b–e in one run, then KIT-R3f–g after KIT-R4)
Owns: `src/engine/districts/{seam,canals,inkQuarter,bathhouses,bridges}.ts` (the `heart`, `bot`, `shapes` lines), `src/engine/districts/frame.ts` (new), each district's `heart.ts`/`heartFrame.ts`, `bathhouses/bot.ts` (new), `districts/{types,registry,api}.ts` (KIT-R3f–g only), `src/engine/sim/bot.ts`, `biome.json`, `tests/districts/heart-frames.test.ts`, `tests/districts/trip-shapes-lent.test.ts` and `tests/engine/bot-terms.test.ts` (new).
Pattern: the types at `engine/districts/types.ts:391-432` and EN-W0's contract stubs.

| ID | Goal | Size | Done when |
|---|---|---|---|
| KIT-R3a | Exemplar: the ink quarter registers `heart` (the postmaster's frame) and `bot` terms; a frame test shape for the other four | M | test `"KIT-R3: inkQuarter frame places the postmaster on 5x5, 7x9 and the real room size, seeded"`; the frame passes `checkRoom` on three sizes |
| KIT-R3b | The Seam's frame (the Marginalia and familiars, plates, vents, oil) through the new `frame.ts` helper (P7); the ink frame moved onto the helper with identical boards | M | tests `"KIT-R3: seam frame places the Marginalia on 5x5, 7x9 and the real room size, seeded"`, `"KIT-R3: the frame helper leaves the ink frame's boards unchanged"` |
| KIT-R3c | The canals' frame: the lamp-mother on a stamped clockwise current loop, lamps on the rim, the roster by placement | S | tests `"KIT-R3: canals frame places the lamp-mother on 5x5, 7x9 and the real room size, seeded"`, `"KIT-R3: canals frame's current is one closed loop and the lamp-mother stands on it"` |
| KIT-R3d | The bathhouses' frame: the Steward on a stamped steam pool, vents and the bather by placement | S | tests `"KIT-R3: bathhouses frame places the Bath-Steward on 5x5, 7x9 and the real room size, seeded"`, `"KIT-R3: bathhouses frame stands the Steward on a connected cloud of four or more tiles"` |
| KIT-R3e | The bridges' frame: the Chief Warden on the keystone, piers and fog by placement, every other tile a span | S | tests `"KIT-R3: bridges frame places the Chief Warden on 5x5, 7x9 and the real room size, seeded"`, `"KIT-R3: bridges frame stands the Chief Warden on the keystone and no span starts cracked"` |
| KIT-R3f | Lent shapes (P5): `DistrictModule.shapes`, `seam:plain`, `canals:landings` | S | tests `"KIT-R3: KIT.shapes has seam:plain and canals:landings"`, `"KIT-R3: the Seam and canal trips still carry no kit"`, `"KIT-R3: canals:landings allows a return where the canals' policy does, at lengths 3 to 6"`; tests/app/save-compat.test.ts and tests/run golden fixtures unchanged |
| KIT-R3g | Bot terms (P6): `botValue`, the bathhouses' `bot.value`, `crackedTiles` in the bot, `bot` on every built module, the lint exemption gone | S | test `"KIT-R3: botValue sums the modules' terms and is 0 off their boards"`; `grep -n "sim/bot" biome.json` prints nothing and `pnpm lint` passes; `tests/sim` results identical before and after (JSON reporter, as EN-0) |

### Pack E: Legacy pair ids (role: Default; engine, UI; depends on: nothing; before EN-9)
Owns: `src/app/lab.ts`, `app/faircopy.ts`, `engine/profiler.ts`, `ui/components/lattice/LatticeEditor.svelte`, `data/apprentices.ts`, the 12 test files that use `MEMBER_IDS`.
Pattern: `tripParty` and `inHousehold` in `engine/household.ts`.

| ID | Goal | Size | Done when |
|---|---|---|---|
| KIT-R4 | Callers take the household or the trip party; `MEMBER_IDS` is deleted (audit S5) | M | `grep -rn "MEMBER_IDS" src tests` prints nothing; test `"KIT-R4: the Lab and the profiler list a recruited apprentice"`; `tests/app tests/engine tests/run tests/scenarios --reporter=dot` pass; UI: the lattice editor and the Lab with the founding pair plus one recruit (light, 375×812) show all three |

### Pack F: Save compatibility and rule pairs (role: Fast for SAVE-1, Default for MIX-1; tests; depends on: EN-0 for MIX-1)
Owns: `tests/fixtures/saves/` (new), `tests/app/save-compat.test.ts` (new), `tests/sim/rule-pairs.test.ts` (new).
Pattern: `tests/fixtures/growing-pages/v9-home.json` and `tests/sim/glyph-identity-fuzz.test.ts`.

| ID | Goal | Size | Done when |
|---|---|---|---|
| SAVE-1 | One recorded save per opened district (`PLAYABLE_DISTRICTS`: seam, canals, inkQuarter, bathhouses, bridges) and one mid-trip save in each | S | test `"SAVE-1: <district> save written by <commit> parses and loads"` for each of the five, and `"SAVE-1: <district> mid-trip save resumes to its next offer"`; fixtures are committed JSON recorded with the current build; the README line says to add one per district opened |
| MIX-1 | Fuzz pairs of district rules on one board | M | tests `"MIX-1: <ruleA> x <ruleB> never throws"`, `"... never overruns the event cap"`, `"... projection equals final state"` over every pair among boil-over, collapse, bells, writs, current, the Seam hands; `tests/sim/rule-pairs.test.ts` only (a failing pair is filed as a task, not fixed here) |

### Pack G: Shared scenario-log verification (role: Default; tooling; depends on: nothing; BL-110)
Owns: `tests/data/lines.test.ts`, `tests/app/projection.test.ts`, `tests/scenarios/lines-registry.ts`, a new shared registrar under `tests/scenarios/`.
Pattern: both files' current `import.meta.glob` blocks.

| ID | Goal | Size | Done when |
|---|---|---|---|
| BL-110 | Both guards read one shared run of the engine suites instead of each re-registering them | M | each of the two files takes at most 20 s alone (from 50 s); the guard tests `"lines fired by the suite (L1)"` and `"projection drift guard over the engine suites"` keep their titles and still fail when a line is un-fired or a projection drifts (one deliberate break each, reverted); mocked-suite isolation kept |

### Pack H: Bundle and precache cost (role: Default; tooling; depends on: nothing; before EN-4)
Owns: `vite.config.ts`, `src/main.ts`, `src/app/App.svelte` (the screen imports); the numbers go in the log row, no new file.
Pattern: none; measure first.

| ID | Goal | Size | Done when |
|---|---|---|---|
| BL-111 | Measure what drives the >500 kB advisory and the precache size; lazy-load Lab, Gallery and content where offline play survives | S | `pnpm build` output sizes before and after in the log row; Lab and Gallery are separate chunks; with the service worker installed and the network off, the home, a Seam trip and the Lab load (browser check, offline emulation); `globPatterns` still precaches every chunk |

### Pack I: Rivals and events leftovers (role: Default; engine; depends on: nothing)
Owns: `src/engine/rivals/**`, `src/engine/events.ts`, `data/footnotes/auras.ts`, `tests/rivals/**`, `tests/scenarios/footnotes/auras*.test.ts`.
Pattern: `rivals/tricks.ts` (`removeTrickObject`, `LockLost`).

| ID | Goal | Size | Done when |
|---|---|---|---|
| FU-2 | `LockLost` gains `met` and `spent`; `orderFails` reasons use them | S | test `"FU-2: a lock fails as spent when its charge is gone and met when its goal is reached"`; events text for both |
| FU-3 | `jarOpened` and `jarCrumbles` carry the jar id so wick fail reasons are exact (RV-3) | M | test `"FU-3: a wick order names the jar that opened or crumbled"`; suites that assert these events are updated in the same commit and listed in the report |
| FU-4 | A rival trick can add an arrival cause (RV-14 gap) | S | test `"FU-4: a trick's arrival cause enters FD's pipeline with its entered tiles"`; existing `tests/rivals` pass unchanged |
| FU-5 | Afterglow margin lines: the new events they need, then the rows (CN-F1) | M | each new row fires in a scenario; `lines.test.ts` integrity passes |

### Pack J: Bathhouse engine leftovers (role: Default; engine; depends on: Pack B merged)
Owns: `src/engine/districts/bathhouses/**`, `engine/districts/intrusion.ts`, `engine/turn.ts` (`vents` only), `data/districts/bathhouses.ts` (the intrusion block), `tests/districts/bathhouses/**`.
Pattern: `BATH_INTRUSION` in `data/districts/bathhouses.ts`.

| ID | Goal | Size | Done when |
|---|---|---|---|
| FU-6 | Wire the thermae's vent floor through `IntrusionSpec.terrain` (BH-11 left it unwired) | M | test `"FU-6: a thermae floor's vents puff at dusk"`; `checkFloor` passes for the floor; `lower-seam-floor` suites pass unchanged |
| FU-7 | Bathhouses plan P7: a vent beside a living boilerman puffs even if a state lies on it (`turn.ts::vents` skips it now) | S | test `"FU-7: a boilerman's vent puffs over a standing state; other vents do not"` |
| FU-8 | The attendant's and boilerman's planning reads the same footnotes as their resolve (BH-5) | S | test `"FU-8: a slick footnote does not make the shove telegraph differ from the shove"` |

### Pack K: Map and bathhouse UI (role: Default; UI, port 5192; depends on: Pack C merged)
Owns: `src/ui/components/map/DistrictNode.svelte`, `src/ui/districts/bathhouses/**`, the meter component the bathhouses use, `docs/plans/bathhouses-verification.md` (one line).
Pattern: `solvedArt` in `ui/districts/canals/index.ts`.

| ID | Goal | Size | Done when |
|---|---|---|---|
| FU-9 | The threshold button label comes from the district's data ("Try the lock" for the rest, a steam line for the dome) | S | Map at 375×812, light: Bathhouses node names its own action, Canals still "Try the lock" |
| FU-10 | Bath-dome solved art through `solvedArt` | S | Map with the dome solved, light and dark |
| FU-11 | The meter row no longer covers board row 9 (BH-12) | S | Combat at the heart on the tallest board, 375×812: row 9 fully visible; phone check |
| FU-12 | Phone check of the five bathhouse footnote margins (`tests/scenarios/footnotes/bathhouses-*.test.ts`); fix only layout bugs | S | one screenshot per subject at 375×812; findings in `bathhouses-verification.md` |

### Pack L: Seam and ink UI polish (role: Default; UI, port 5193; depends on: Pack C merged)
Owns: `src/ui/screens/{Map,Cleared,TripPage}.svelte`, `ui/components/**/SetOutSheet.svelte`, `ui/districts/seam/**`, `ui/districts/inkQuarter/**`, `ui/components/board/StepLayer.svelte`.
Pattern: the `verify` skill states list.

| ID | Goal | Size | Done when |
|---|---|---|---|
| FU-13 | Run the Svelte autofixer on `Map`, `Cleared` and `SetOutSheet` (SM-11) until clean | S | autofixer reports no issues for the three |
| FU-14 | Phone-check "The margin answered" trip-page card (SM-12/14): Seam-heart profile, a proven cluster, one fight | S | screenshot of the card at 375×812 in light; a layout fix if it overflows |
| FU-15 | The StepLayer pill no longer covers the Marginalia's HP on its tile (SM-2) | S | Combat at the Seam heart, 375×812: "16/16" readable; phone check |
| FU-16 | Ink quarter dark-mode pass | S | the room, a term card, the clock seal and the stamp preview in dark at 375×812, no unreadable contrast |

### Pack M: Test and engine leftovers (role: Default; tests, engine; depends on: nothing; runs sims, see P3)
Owns: `tests/sim/canals-fuzz.test.ts` (new), `tests/engine/cap.test.ts`, `src/engine/runes/mix.ts` (cap only if a bug shows), the Graphite restore code (`src/engine/schedule.ts`, `src/engine/outOfRoom.ts`; `grep -n graphite` finds it), `src/engine/recruits/offers.ts`.
Pattern: `tests/engine/cap.test.ts` `castWithCap`.

| ID | Goal | Size | Done when |
|---|---|---|---|
| FU-17 | Canal fuzz at party 1–3 with the crate and the rival | S | tests `"FU-17: canal trips at party 1, 2 and 3 never throw or overrun the cap"` (seeded, small seed set) |
| FU-18 | Cap sweep gains a push onto a jar and a mixing chain (`reserve` in `mix.ts`) | S | tests `"FU-18: cap sweep at every event index, push onto a jar"`, `"... mixing chain"` disagree nowhere |
| FU-19 | Graphite restore with no free tile no longer leaves two units on one tile (FD-3) | S | test `"FU-19: a restore with no free tile places the unit on the nearest free tile or reports it"`; no overlap in any cap-sweep state |
| FU-20 | Tighten the recruit card parse to the seven recruits (RC-4) | S | test `"FU-20: a recruit card naming a founder or an unknown id is rejected by the save parser"`; the DK-7 test card still parses where its test says |

### Pack O: Ink footnote follow-ups (role: Fast; data, engine; depends on: nothing; P9)
Owns: `src/engine/solvents.ts` (the `wax-cloud-smother` check only), `src/data/footnotes/inkQuarter.ts` (three texts), `tests/scenarios/footnotes/ink-*.test.ts`.
Pattern: the existing `wax-cloud-*` scenarios in `tests/scenarios/footnotes/ink-wax.test.ts`.

| ID | Goal | Size | Done when |
|---|---|---|---|
| FU-21 | `wax-cloud-smother` reads a cloud beside the bearer (id kept); clauses on `sentence-mark-peel`, `levy-mark-peel` (a bound mark is released, not peeled) and `sentence-unit-collar` (born brass is not a collar); an end-to-end `wax-cap-seal` cast | S | tests `"FU-21: wax-cloud-smother keeps a wax mark from melting in fire beside a cloud"`, `"FU-21: without a cloud beside it the mark melts as before"`, `"FU-21: wax-cap-seal holds through a real wax invention cast"`; `wax:cloud fourCombos` still passes; tests/data/integrity.test.ts passes |

### Pack N: Close (orchestrator; depends on: every pack above and the tracks that finish the built plans)
Pattern: [ink-quarter-verification.md](ink-quarter-verification.md) and the bathhouses and bridges verification files; DESIGN §11 and TECH §7 rows of finished plans.

| ID | Goal | Size | Done when |
|---|---|---|---|
| CL-1 | DESIGN §11 "built" rows for FD, DK, RV, FN, SM, IQ (check `grep -n` first; write only the missing ones) | S | one row each, same commit as the check |
| CL-2 | TECH §7 rows for the same six (RV already has §3 "Authoring a rival", IQ a DK-IQ row) | S | the missing ones written |
| CL-3 | Verification files `foundations-verification.md`, `district-kit-verification.md`, `rivals-verification.md`, `footnotes-verification.md`, `seam-grows-verification.md` (**SM-15**) from the log rows and the existing checks; `ink-quarter-verification.md` already exists | M | five files with a pass/not-checked table each; SM-15 row merged |
| CL-4 | One `code-review` run per subsystem: engine core and runes; kit and districts; rivals; footnotes and data; UI board and app | M | five runs; findings under 30 lines fixed in place, larger ones filed as briefs |
| CL-5 | Records and ledger: plan `State:` lines, ROADMAP §2.3, `ledger.mjs` clean for every plan, full `pnpm check` | S | `node .claude/skills/implement/ledger.mjs docs/plans/build-program-log.md docs/plans/*-plan.md` exits 0; `pnpm check` green |

## 6. Follow-up sweep (status file "Next" 2 and "Rough edges")

Mapped to tasks above: BR-7 `note?` → FU-1; RV-14 gaps → FU-2, FU-4 (no runtime rival registration: left, no consumer); RV-3 → FU-3; CN-F1 → FU-5; BH follow-ups → FU-6 to FU-12; SM → FU-13 to FU-15; ink dark mode → FU-16; canal fuzz, FD-6, FD-3, RC-4 → FU-17 to FU-20; C2's ink footnote follow-ups → FU-21 (Pack O, P9). IQ-15 registry → KIT-R2; `lines`/`projection` → BL-110; `MEMBER_IDS` → KIT-R4; timeouts → GATE-1 and EN-0's pack; `eventCap` → BF-3.
**Already done on main (dropped):** `DistrictModule.goals` typed (`types.ts`); `BoilOverState.line` (`bathhouses/types.ts`); `ModuleHearCondition` and hearing through `KIT.hearKinds` (`engine/hearing.ts`); Conduct respects `brass-plate-ground` (`bursts.ts:327-334`); the strict turn-1 bite tests (Seam SM-3, canals `canal-rooms.test.ts` P2); `splash-unit-press` text and engine agree (`push.ts:152-157`, `seam-runes.ts:308`).
**To calibration:** BH-16 tables, SM-6, IQ-20/23 levers, `INK_CAL` postmaster row, CN-13 numbers and the `DEEP` note, HC-4 greedy-bot stalls. **Player questions (not here):** every item under the status file's "Open questions". **Not tasks:** HC-5's fixed threshold seed (intended: "Retry same spots").

## 7. Verification

Per task as in the tables. Per merge batch the orchestrator runs `pnpm check:fast` once. Checked only at Close: full `pnpm check` (CL-5), the five code reviews (CL-4), a dark-mode phone sweep of Packs C, K and L screens. KIT-R2 and KIT-R4 are the only tasks with a new-interaction phone check; Packs K and L are screen fixes checked in the task.

## 8. Open questions for the player

None. FU-7 and FU-9 follow the plan and status wording; the agent stops on an unclear rule.

## 9. Execution notes

**Critical path:** GATE-1 → (BR-20 → Pack B) and (EN-0 → EN-W0 → Pack D) → EN-S1. Since 2026-11-12: KIT-R3b–e (frames) and KIT-R4 run first, then KIT-R3f–g (both touch the module files or `sim/bot.ts`), then EN-S1. FU-1 waits for KIT-R3f (both edit `districts/types.ts`); Pack J waits for KIT-R3g (bathhouses files). Pack C, E, G, H have no predecessors and run beside them (two or three agents at a time, file-disjoint). Pack F's MIX-1 waits for EN-0; SAVE-1 can go first. Packs J, K, L fill free slots; K and L wait for Pack C, J for Pack B. Pack N waits for the whole program. Rough total: 9 M-sized packs' worth plus 20 S follow-ups, about 12 agent runs.
