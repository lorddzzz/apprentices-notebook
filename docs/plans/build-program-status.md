# Build program status (resume here)

Plans: [build-program.md](build-program.md), order in [ROADMAP §2](../ROADMAP.md). One status file for the whole program (instead of one per plan) so a fresh session sees every running task across plans; a plan's section moves to its own file only if it grows too long. Updated on every event and committed with every merge.

**State:** building (Stage 0)
**Reset:** 5h window resets 2026-10-23 20:50 UTC; resume manually by reading this file.
**Next:**
1. Collect reports from HC-1, HC-2, FD-8; review, squash-merge, push.
2. Ready: FD-1 (arrival matrix), FD-2 (repros) — test files only. After HC-1: FD-9 (`run.ts`), FN-0 (after FD-9 too). After HC-2: HC-3. After HC-1+HC-2: HC-4. RV-W0 and RC-W0 (contracts) are ready now.

## Tasks
| ID | Role / model / effort | Size | Status | Branch / commit | Usage Δ | Notes |
|---|---|---|---|---|---|---|
| DK-0 | Medium / Sonnet 5.5 / high | S | merged | worktree-agent-a45dca724bc1d7c9f @ 3826907 | shared | 14 fixtures (596 KB): 6 Seam, 6 canal trips, lock solve/fire; replays stored actions (not the bot); re-record `RECORD_GOLDEN=1 pnpm vitest run tests/run/golden.test.ts`. DK-2 must keep reachable: run.ts `startTrip`, `beginEncounter`, `variantFor`, `placeOf`, `closeBattle`, `pickLoot`, `pushOn`, `returnHome`, `parseSaveData`, `newProfile`, `parseLattice`; app `thresholdStart`/`thresholdOutcome`; battle `applyAction`, `boardOf`, `memberById` |
| DK-1 | Strong / Opus 5.5 / medium | M | merged | worktree-agent-a1bbe60c878733ab7 @ 177eac0 | shared | `engine/districts/` {types, registry `buildKit` (duplicates throw), api stubs, index `DISTRICT_MODULES`/`KIT`, seam}; `data/districts/index.ts` (kit data types, `DistrictKitData` beside legacy `DistrictDef` until DK-17); `ui/districts/index.ts`. **Import `$data/districts/index`** (old `data/districts.ts` shadows the folder until DK-17). Fields owed: DK-3 `BattleState.rules`, DK-4 `Tile.piece`, DK-6 `Unit.out`/`bystander` + `outOfRoom` event, DK-7 `LootItem`→`KitLootItem`, DK-5a/b `Trip.kit`, `city.checkpoints`, `Profile.papers`. Placeholders left: `Telegraph` (RV-W0), `RecruitPlacement`/`RecruitPages` (RC-W0). Orchestrator replaced FD placeholders with `$engine/arrival` at merge |
| FD-10 | Fast / Haiku 5.5 / high | S | merged | worktree-agent-a32ab5a8f351b9aff @ 2021644 | shared | `ensureBattle` second failure → `abandonFight()` (trip closed as wiped, Study, warn toast); `addCorrupt`/`readCorrupt`, `CORRUPT_KEEP = 3`, key `apprentices-notebook:save.corrupt` now a JSON array (legacy raw value = one entry). HC-1's save reset should reuse `addCorrupt` (keep-before-replace) |
| HC-1 | Strong / Opus 5.5 / medium | L | running | worktree | | profile + save v9; may re-record golden end saves only (logs identical) |
| HC-2 | Strong / Opus 5.5 / medium | M | running | worktree | | `P` notation, starts, checkRoom, placeParty, any size |
| FD-8 | Medium / Sonnet 5.5 / high | S | running | worktree | | footnote variant ids |
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

## Proposals (from agents, not yet in DESIGN/TECH)
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
- `tests/sim/calibration.test.ts` (Seam bots, 15 s timeout) times out under load while agents run `pnpm check` in parallel; passes alone in 10 s. Rerun alone before treating as a failure.
