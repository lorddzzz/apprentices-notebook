# Build program status (resume here)

Plans: [build-program.md](build-program.md), order in [ROADMAP §2](../ROADMAP.md). One status file for the whole program (instead of one per plan) so a fresh session sees every running task across plans; a plan's section moves to its own file only if it grows too long. Updated on every event and committed with every merge.

**State:** building (Stage 1)
**Reset:** new 5h window from 20:51 UTC 2026-10-23 (ends ~01:50 UTC); resume manually by reading this file.
**Next:**
1. Collect HC-4, AH-W0, FD-1, FD-2 (HC-4 and AH-W0 both edit `engine/types.ts`, in different interfaces: merge carefully).
2. Then: FN-0 (after AH-W0: both touch `data/types.ts`), HC-6, RV-W0, FD-3 (after FD-1) → DK-3/DK-4, DK-5a/DK-6 (after HC-4), HC-5.

## Tasks
| ID | Role / model / effort | Size | Status | Branch / commit | Usage Δ | Notes |
|---|---|---|---|---|---|---|
| DK-0 | Medium / Sonnet 5.5 / high | S | merged | worktree-agent-a45dca724bc1d7c9f @ 3826907 | shared | 14 fixtures (596 KB): 6 Seam, 6 canal trips, lock solve/fire; replays stored actions (not the bot); re-record `RECORD_GOLDEN=1 pnpm vitest run tests/run/golden.test.ts`. DK-2 must keep reachable: run.ts `startTrip`, `beginEncounter`, `variantFor`, `placeOf`, `closeBattle`, `pickLoot`, `pushOn`, `returnHome`, `parseSaveData`, `newProfile`, `parseLattice`; app `thresholdStart`/`thresholdOutcome`; battle `applyAction`, `boardOf`, `memberById` |
| DK-1 | Strong / Opus 5.5 / medium | M | merged | worktree-agent-a1bbe60c878733ab7 @ 177eac0 | shared | `engine/districts/` {types, registry `buildKit` (duplicates throw), api stubs, index `DISTRICT_MODULES`/`KIT`, seam}; `data/districts/index.ts` (kit data types, `DistrictKitData` beside legacy `DistrictDef` until DK-17); `ui/districts/index.ts`. **Import `$data/districts/index`** (old `data/districts.ts` shadows the folder until DK-17). Fields owed: DK-3 `BattleState.rules`, DK-4 `Tile.piece`, DK-6 `Unit.out`/`bystander` + `outOfRoom` event, DK-7 `LootItem`→`KitLootItem`, DK-5a/b `Trip.kit`, `city.checkpoints`, `Profile.papers`. Placeholders left: `Telegraph` (RV-W0), `RecruitPlacement`/`RecruitPages` (RC-W0). Orchestrator replaced FD placeholders with `$engine/arrival` at merge |
| FD-10 | Fast / Haiku 5.5 / high | S | merged | worktree-agent-a32ab5a8f351b9aff @ 2021644 | shared | `ensureBattle` second failure → `abandonFight()` (trip closed as wiped, Study, warn toast); `addCorrupt`/`readCorrupt`, `CORRUPT_KEEP = 3`, key `apprentices-notebook:save.corrupt` now a JSON array (legacy raw value = one entry). HC-1's save reset should reuse `addCorrupt` (keep-before-replace) |
| HC-1 | Strong / Opus 5.5 / medium | L | merged | worktree-agent-a5add137d20a7edb1 @ 80ccb0f | shared | Profile v9: `household {members, slots}`, `ink`, `lattices`/`proof` partial by member; `pageOf`/`proofOf` throw for outsiders; `joinHousehold`/`inHousehold`/`setSlot(p, slot, id, trip?)`/`tripParty`/`FOUNDERS`/`emptyHousehold` exported from `$engine`; save v9 only (older → `OlderEditionError`, kept aside); `legacyV7.ts` removed. Golden re-recorded: logs/outcomes identical, only ink `member` and profile shape changed. **HC-4 owes:** trip hp/charges parsing, `perMember`, `rollOffers` default and `action.unit` checks still on `MEMBER_IDS`; `validateLoadout` to narrow to the party. One-line edits in OfferCard/Study/TripPage .svelte (autofixer not run: Svelte MCP down; browser check folded into HC-7/HC-9) |
| HC-2 | Strong / Opus 5.5 / medium | M | merged | worktree-agent-a9efb421e68e7f94b @ ae9d883 | shared | `P` token (may share with state/water; not unit/plate/gate/grate); `BoardSpec.starts`; `checkRoom`, `placeParty`, `startSeedFor`, `MAX_PARTY = 3` in `$engine/rooms` (not in `$engine` index); `BattleSpec.lineup`/`startSeed` optional. HC-4: `createBattle({…, lineup, startSeed: startSeedFor(trip, encounter)})`; a lineup on a board with apprentice tokens throws, so HC-3 first |
| HC-4 | Strong / Opus 5.5 / medium | L | running | worktree | | party 1–3 in trips; bake `P`, drop `startLayout` |
| AH-W0 | Strong / Opus 5.5 / medium | M | running | worktree | | actions + habits contracts |
| FD-1 | Strong / Opus 5.5 / medium | M | running | worktree | | arrival matrix test |
| FD-2 | Strong / Opus 5.5 / medium | M | running | worktree | | delayed/cap repros |
| RC-W0 | Strong / Opus 5.5 / medium | S | merged | worktree-agent-ace64eca89eca4392 @ cc83bcf | shared | `data/recruits.ts`: `Beat`, `RecruitFound`, `RecruitDef extends ApprenticeDef` (found, beat, runes), `RecruitPlacement`, `RecruitPages` ({runes} or {any}), `RECRUIT_HABITS`, empty `RECRUITS`; `engine/recruits.ts` stubs + `RecruitLootItem`, `RecruitsState`, `EMPTY_RECRUITS`. `Profile.recruits` not added yet (RC-6). Habit ids for AH: runaway `fuseOnStep`, notary `markTwice`, towel-bearer `steamproof`, warden `holdTwo`, tuner `nearUnison`, Copyist `longTouch`, exile `restoreErase`. RC-1 blocked on AH-W0 (`HabitId` closed). **DK-R1 → DK-7:** run contributors every roll; `must` after the table's `guaranteed`, `extra` after the three normal offers; `{kind:'recruit'}` round-trips in save parsing |
| FD-9 | Medium / Sonnet 5.5 / high | S | merged | worktree-agent-a8aba70dffdb3a7e3 @ dfd1904 | shared | `Profile.bindEvents` (inferred on load when absent), `grantBindEvent(p, e)` idempotent; `knownSetOf` = stored ∪ old district rule until something grants events. Golden re-recorded (+`bindEvents: []` only). BR/CG call `grantBindEvent` for *pushed*/*dies* |
| HC-3 | Medium / Sonnet 5.5 / high | M | merged (partial by design) | worktree-agent-a21bdc1e0b9451570 @ 1598f0e | shared | `startLayout(layout)` in `data/encounters.ts` turns D/S into P and pads to 4 points; integrity test runs `checkRoom` on all 27 rooms + the lock. Data strings unchanged. **HC-4 must** use `startLayout(variant.layout)` + `placeParty` in `beginEncounter`, then bake the `P`s into the data and delete `startLayout` (orchestrator: required, not optional) |
| FD-8 | Medium / Sonnet 5.5 / high | S | merged | worktree-agent-a05163adbb243d5ff @ 9148efe | shared | `Ctx.footnotes: FootnoteIds`; `footnoteIds(profile, variants?)` replaces `footnoteTexts` (unknown ids skipped); `hasFootnote` compares ids. Touched `trip/start.ts` (one line) |
| DK-2 | Medium / Sonnet 5.5 / high | M | merged | worktree-agent-a83761a444c02f1fd @ ccf9e52 | shared | `engine/trip/`: place (`variantFor`, `placeOf`; leaf), shared (`need`, `perMember`, `copyRune`, `withAll`; not public), start (`startTrip`, `beginEncounter`, `recordAction`, `chargesOf`; **HC-4 here**), offers (`rollOffers`, `ownedBy`; DK-7/RC), finish (`closeBattle`, `finishEncounter`, `learnFromFight`, `recordTripCasts`), crossroads (`pickLoot`, `pushOn`, `returnHome`), doorway; explicit re-exports. `run.ts` = profile/save core (**HC-1 here**). No city/run/trip cycle |
| FD-0 | Strong / Opus 5.5 / medium | S | merged | worktree-agent-ad62c68dd4db72616 @ 34b97a0 | shared | `engine/arrival.ts`: `ArrivalCauses` (cause → `'each'`/`'landing'`, extended by module augmentation), `PlacementCause` (`restore`/`spawn`), `UnitTraits` (flies/swims/anchored), `ArrivalHook` {id, answers, subjects, causes?, exceptCauses?, exempt?, run → `'go'`/`'stop'`}, core hooks solvent/markSpread/bindEnters/stepJar/stain + empty `fire`; `RelocationFields` (unemitted); `Jar.id`, `SealedContext`, `BattleState.nextJar`; `Ctx.eventCap`. Risks: augmenting plans also add a runtime entered-tiles list; `nextJar`/`context` optional (FD-4/5 handle old saves); FD-7 moves moved/push/swapped/drift at once (view.ts, fx.ts switch on them); `eventCap` not yet threaded through `battle.ts` (FD-2/FD-6) |
| HC-W0 | Strong / Opus 5.5 / medium | M | merged | worktree-agent-abb1dc27aa7a53596 @ b4e2727 | shared | `ApprenticeDef`/`APPRENTICES`/`APPRENTICE_IDS`/`isApprenticeId`/`leanOf` in `data/apprentices.ts` (members.ts removed; `MEMBERS`/`MEMBER_IDS`/`MemberId` kept as deprecated views); `HABITS` (twoJars, forkAhead); `RECRUITS = {}` (entries `as const satisfies Record<string, ApprenticeDef<string>>`, avoid circular key type); stubs in `engine/household.ts`, `engine/rooms.ts` (`ROOM_LIMITS`, `START_SALT = 6000`), not re-exported from `$engine`. Risk: once RC adds entries `MEMBER_IDS` spans the registry, so `run.ts` loops must use the household first (HC-1/HC-4) |
| FN-1A | Strong / Opus 5.5 / medium | M | merged | worktree-agent-aeb0431faf9056812 @ 5a09d70 | shared | 59 gaps (22 new, 10 new+event, 27 text); `bind:cloud` misfiled on plain Ink spread |

## Usage log
| Time (UTC) | 5h % | resets in | weekly % | zone | action |
|---|---|---|---|---|---|
| 17:42 | 38 | 3h08 | 23 | Normal | baseline; spawn DK-0, FD-0, HC-W0, FN-1A |
| 17:52 | 58 | 2h57 | 25 | Narrow (burn ~2%/min with 4 agents) | merge FN-1A; no new spawns until the three running agents report |
| 17:58 | 60 | 2h51 | 25 | Normal | merge HC-W0; spawn DK-1, FD-10 |
| 18:04 | 66 | 2h46 | 26 | Narrow (~1%/min) | merge FD-0, DK-0; spawn DK-2 (critical path) |
| 18:17 | 71 | 2h33 | 27 | Narrow (~0.4%/min) | merge FD-10, DK-1, DK-2; spawn HC-1, HC-2, FD-8 |
| 18:28 | 84 | 2h22 | 29 | Narrow→Wrap (~1.2%/min) | merge FD-8; narrow nudges to HC-1, HC-2 |
| 18:32 | 85 | 2h18 | 29 | Narrow | merge HC-2; spawn HC-3 (smallest critical-path task) |
| 18:46 | 92 | 2h04 | 30 | Wrap | merge HC-3; one agent (HC-1) running, no new spawns |
| 19:00 | 93 | 2h00 | 30 | Wrap | merge HC-1; spawn FD-9 (smallest) |
| 19:10 | 95 | 1h49 | 30 | Wrap | merge FD-9; spawn RC-W0 (S) |
| 19:18 | 98 | 1h41 | 31 | Hold | merge RC-W0; hold for the 20:50 reset |
| 20:51 | 0 | 5h | 31 | Normal | new window; spawn HC-4, AH-W0, FD-1, FD-2 |

## Proposals (from agents, not yet in DESIGN/TECH)
- RC-W0: AH-W0 derives or checks `HabitId` against `RECRUIT_HABITS`. Accepted (pass to AH-W0).
- HC-1: `setSlot` refuses when a trip is passed; `offerOf` still burns the old member draw so seeds roll the same offers (drop when a reroll is fine); a saved household needs ≥1 member and lattices/proof keys equal to the members; `FOUNDERS` lives in `engine/household.ts`; ink offer text "A bigger ink pot for every page in the household." Accepted.
- HC-2: salt applied once in `startSeedFor` (`deriveSeed(trip.seed, START_SALT + encounter)`); default `startSeed` = `deriveSeed(seed, START_SALT)`; a smaller party takes the leading spots of the same shuffle; `P` allowed on water/drop tiles; size/count problems have `cell: null`. Accepted.
- FD-8: `footnoteTexts` removed; a removed variant on an old save is ignored, not an error. Accepted.
- DK-2: `recordTripCasts` in `trip/finish.ts`; leaf `place.ts` breaks the city→run import; explicit re-exports keep helpers private. Accepted.
- DK-1: kit fields all-optional beside legacy `DistrictDef` until DK-17; data types in `data/districts/index.ts`; point of no return = `ret: {kind:'until'}` plus separate `CheckpointDef`; rule `step` returns next state (pure); piece tokens unique across districts; bonus reward = extra pick, offer, or trip-state tag; papers kept in found order and survive a wipe. Accepted. TECH §7 draft row kept for DK finish.
- FD-10: an abandoned fight is recorded as `wiped` (unbanked loot lost, banked kept, per P15), goes to the Study, toast "This fight could not be resumed, so the party came home."; corrupt texts not de-duplicated. Accepted.
- DK-0: canal "wipes" are idle-party round-1 wipes (the bot never loses there); replay from stored actions; canal wins use the default notebook with maxRounds 100. Accepted (test-only).
- FD-0: causes/traits extended by module augmentation of `$engine/arrival`; hooks filter with `causes` + `exceptCauses`; hooks return `'go'`/`'stop'`; new cause `draw` (P6); placement causes `restore`/`spawn`; `InterruptReason` includes `cap`. All accepted (TECH §7 at FD finish).
- HC-W0: habit id `bindOnTile` removed (unused). Accepted.
- HC-W0: pair `leansOn` = Jar (Draughtsman), Fork (Stoker); HC-7 must exempt the starting pair from the dormant flag (P12). Accepted, passed to HC-7.
- HC-W0: pair hues named `slate` (Draughtsman), `rust` (Stoker). Accepted.
- FN-1A A1: new `Meets` values (`spread`, `shot`, Margin's limit refusal) instead of bending existing ones (shipped IDs never change). Accepted.
- FN-1A A2: wrong text is fixed by editing the row, not adding a second one. Accepted.
- FN-1A A3: Cinder vs a rat's oil trail over a hot tile (doesn't catch; the line says "now or later"): rule choice. **Ask player** at the next design round; default until then = fix the text to match the engine.
- FN-1A A4: keep near-always lines (`splash:unit`, `fork:unit`, `oil:empty`) as the honest home for heading/duration rules. Accepted.

## Decisions and fixes made during the build
- DK-1 × FD-0: FD's arrival contract wins. DK's placeholder `ArrivalCause`/`ArrivalInfo`/`ArrivalHook` removed; districts augment `ArrivalCauses` with namespaced keys and give runtime values as `DistrictModule.causes: KitCauses` (`{'bridges:fall': 'landing'}`); `Kit.causes` is the merged `Record<string, EnteredTiles>` FD-3 composes with the core table; `PieceDef.onArrive` is FD's `ArrivalHook` minus id (returns `'go'`/`'stop'`).
- One program-wide status file instead of per-plan files (orchestrator, 2026-10-23).

## Follow-ups and rough edges
- HC-3's padded start points are mechanical (bottom rows, nearest the pair); CN/SM re-lay rooms by hand; HC-5 authors the lock's 4 `P`; HC-9 compares party-size-2 win rates.
- `tests/sim/calibration.test.ts` (Seam bots, 15 s timeout) times out under load while agents run `pnpm check` in parallel; passes alone in 10 s. Rerun alone before treating as a failure.
