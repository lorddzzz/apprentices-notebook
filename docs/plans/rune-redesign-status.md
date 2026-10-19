# Rune redesign build status (resume here)

Plan: [rune-redesign-plan](rune-redesign-plan.md). Orchestrator: Opus main session. Updated on every event and committed with every merge.

**State:** building
**Next:** L1 running (wrap zone, started at 90%). After the 05:40 UTC reset: E7 (critical), R1, U1 in parallel, then (run layer), then W2: E5 marks, E6 jars+rounds, L1 lines. Weekly watch: ask the player before a new wave above ~85% weekly.

**Player calls (2026-10-19):** P2 Seam + canals playable, the rest Lab-only (accepted). P9 folios retired (accepted). P3 changed: edges depend on the district; wall in the Seam and the canals, later districts decide in their own rounds. No push until W6 (P40).

## Tasks
| ID | Model | Size | Status | Branch / commit | Usage Δ | Notes |
|---|---|---|---|---|---|---|
| plan | opus agent | M | done | 859dbf9 | ~? | 457 lines, 42 Proposals |
| W0 | opus (me) | M | merged | (this commit) | ~5% | contracts in `src/data/next/` and `src/engine/next/` (not the plan's runeModel.ts/model.ts names); W0b moves them in |
| W0b | opus | L | merged (with W0c, E1–E3) | worktree-agent-acf3bae867e3e905f @ 046f9af (+ 6922d1c orchestrator handler stubs) | ~74% of a 5h window, ~10% weekly | 513 engine tests; app/ui red until W0c |
| W0c | sonnet | L | merged | (this commit) | ~25% 5h | 842 tests on its own; screenshots in session tool-results |
| E1 | sonnet | L | merged | worktree-agent-ae1e7b0831f4ee754 @ 03ad3e5 | | 555 engine tests; seam `withSeams` + `tests/scenarios/fake-runes.ts`; edited glyph-identity test (wrap in withSeams; E6 can drop). At merge: `scenarioSpec` must pass `spec.edge` |
| E2 | sonnet | L | merged | worktree-agent-a523e267400073b23 @ 0c7cb67 | | 49 kind lines; 15 burst rows; `CHEMISTRY` tuning |
| E3 | sonnet | M | merged | worktree-agent-a7f0621bb86e37774 @ fdce332 | | 540 engine tests; 23 line rows. At merge: add `Layer.slid?`, Tuning keys sentenceTiles/holdRounds/levyShieldPerMark (now local consts) |
| R1 | sonnet | M | waiting | | | |
| E5 | sonnet | L | merged | (this commit) | ~5% | 1069 tests; touched bursts.ts (markUnit→applyMark), lines.ts, actions tests (markSpent) |
| E6 | sonnet | L | merged | (this commit) | ~6% | 1055 tests; touched movement.ts, turns/integration tests (spit line) |
| L1 | sonnet | M | running | worktree | | started 01:36 in wrap zone |
| U4a | haiku | S | merged | 0554e60 | ~2% | art data only in `src/ui/runeArt.ts` (imports `$data/next/types`: fix at W0b merge). Wiring into RuneGlyph/Gallery = U4b after W0c |
| E7 | sonnet | L | waiting | | | |
| U1 | sonnet | L | waiting | | | |
| U3 | sonnet | M | waiting | | | |
| C1 | haiku | M | waiting | | | |
| E8 | sonnet | M | waiting | | | |
| E9 | sonnet | S | waiting | | | |
| U2 | sonnet | M | waiting | | | |
| F1 | sonnet | S | waiting | | | |
| U5 | sonnet | L | waiting | | | |
| U6 | sonnet | M | waiting | | | |
| U7 | sonnet | M | waiting | | | |
| M1 | sonnet | M | waiting | | | |
| S1 | haiku | S | waiting | | | |
| T1 | sonnet | M | waiting | | | |
| K1 | haiku | S | waiting | | | |
| R2 | haiku | S | waiting | | | |
| W7 | opus (me) | M | waiting | | | |

## Usage log
| Time (UTC) | 5h % | resets in | weekly % | zone | action |
|---|---|---|---|---|---|
| 2026-10-18 21:51 | 11 | 2h49m | 49 | normal | baseline; plan agent started |
| 2026-10-18 22:13 | 26 | 2h27m | 51 | normal | plan + W0 done (~15%); start W0b |
| 2026-10-19 00:41 | 0 | 5h | 61 | normal (weekly watch) | 5h limit hit during W0b, reset; start W0c, E1, E2, E3 |
| 2026-10-19 01:35 | 90 | 4h05m | 73 | wrap | E5 merged; start L1 (smallest critical) |
| 2026-10-19 01:27 | 85 | 4h14m | 72 | narrow | E6 merged; start E5 |
| 2026-10-19 01:16 | 79 | 4h24m | 71 | narrow | core merged; start E6 only |
| 2026-10-19 01:01 | 59 | 4h39m | 68 | narrow (5h) / weekly watch | E1, E2, E3 done (~15% 5h each); W0c running; no new spawns until it lands |

## Proposals (from agents, not yet in DESIGN/TECH)
- E5: release heading: hook heading or push dir, then from the hit's `from` tile to the bearer, then `bound.heading`; a killing hit doesn't release a `hit` mark (only `dies`, on the death tile); release depth capped at 3 nested, the 4th fizzles; a spread skips units that already hold a mark; `entered` spreads first, then releases `enters`; Lift doesn't re-spread, adds the new bearer to the lineage, and onto a marked unit is a no-op; Spark's own 1 damage releases a hit-bound mark before Detonation. `expireMark` exists for lifetimes. Accepted.
- E6: shackle wears off at round end in `decayStates` (only `held` counts player-phase starts); a stunned foe loses its telegraphed attack; a stunned apprentice comes back with moved+acted true; a move that triggered a jar or stain can't be undone; a jar sealed onto any other jar crumbles it; dusk jars sealed during dusk wait for the next dusk; `nextRoundEnd` becomes `roundEnd` after the pass; `ownerTurn` entries run after `landed` resets; a move opens a jar only on arrival (pushes fire `entered` per tile). No `runes/auras.ts` needed. Accepted.
- W0c: an older save (version < 7) shows "from an older edition", a corrupt v7 shows the old "could not be read"; known runes have no copy limit (ink and "not known" are the only refusals); `Profile.named` ids drive the "New in the notebook" toasts; the Bench entry appears once the household has a method, invention or solvent; Fair Copy has no idiom naming/free compile (P7); Lab palette gains `$` and `_`, `!` cycles none/mark/deep. No dark `--role-*` values (no dark theme). Accepted.
- W0b contract changes: `Step` gains a `split` role (a Glyph's extra exit); `MemberDef.lean: Lean`; `PlacedRune`/`GlyphArg`/`FiredCell` runes are `RuneRef`; `compileLattice`/`inkOf` take default args; `Profile.footnotes` Partial; new `BattleSpec.edge`, `DistrictDef.edge`, `EnemyDef.elite` (`oilSoaked` removed); HearCondition `ignite`→`burst`, `discovered`→`named`; new gate `drawing` for unbuilt districts; codex kinds rune/method/idiom; `vent` event kept. Accepted.
- E2: fire ignites all connected oil (slick, pool, stain) at once, 2 per unit on it; Pool = centre + slicks on its 4 empty neighbours, bursts for 3; Inkfire marks every unmarked unit it hits; Kettle blows 2 to adjacent units and leaves a cloud; Wall rings 1 and pushes touching units 1 away, the Wall stays; Skid plate is spent, hits the first unit in line for 3 and pushes it 1 (no heading: just breaks); Thunderhead = `Scheduled{thunderhead}`, fizzles if the cloud is gone; Brand storm hits a marked unit twice as two hits; Surge 3 + 1 to the nearest other unit; Spark on a collared unit conducts; a shackle keeps a born collar, replaces cast collars and marks; Ink on a Deep mark/Shackle washes it, Brass on a Shackle collars; Ink on a blot or plate misses, Brass on a blot makes a plate; Oil feeds fire, Ink/Steam/Brass put it out leaving their plain state; Coil +1 tile on area bursts; gifted Steam/Brass +1 round, Bank lasts 4; Lay doesn't apply to unit compounds; Steep spreads only to empty open tiles and not for Lay'd layers. Accepted.
- E1: Brink counts a board edge only when `edge === 'drop'` (canal water and `_` always, incl. the target's own tile); triggers filter per target, one `triggered` event per step (passed if any target passed); Tally counts mark, collar, shackle, state/compound and jar on target+tile at the snapshot; Fork sides keep their source target's heading, both computed before either branch runs, off-board sides dropped; an Action step skips a tile target that now holds a unit already acted on in that step (Kinds not skipped); a Seal with nothing after it seals nothing, Splash seals one jar per target; a step with no live targets stops quietly; Unison matches exact target keys, `s.landed` includes Seep/Fork neighbours; depth guard fizzles at depth > 1 (E7's `runInvention` must increment depth). Accepted.
- E3: push lines are `shove:*` whoever pushes (a crush via Sentence reveals Shove's line); `slid` counts only tiles beyond the push (one slick under the target adds no slide); a dropped elite/member stays on the last solid tile; a flier on a drop edge is crushed as on a wall; a struck held unit still takes damage; Swap with a tile/self does nothing and Hold blocks it; Draw moves state and jar independently, a plate won't go under a unit, gifted Draw goes 2; Erase clears mark, cast collar, shackle, tile state and jar (a born collar stays); layout plates can be erased and drawn but never break by crush; `*:empty` lines dropped (area spells would spam them). Accepted.
- W0b: `+` notation = 1 shield each; `$` shackle lasts 2 rounds; layout plate `=` never breaks; a cloud or plate that stops a Bolt becomes its target; Vat's 2×2 has the aimed tile top-left; gifted Splash/Vat = +1 range, not a bigger area; auras touch any path cell they sit beside; a shackled or held member can't move; vents puff only onto empty tiles; floats never displace a cloud; a moth lights its connected slick; rat trails land per tile; spit marks the unit or leaves a blot; unknown inventions insulate and are flagged; invention token `inv:name`. Accepted (tune by playing).

## Decisions and fixes made during the build
- 2026-10-19: weekly at 61% after W0b on Opus (~10% weekly for one L task). E1 moved from Opus to Sonnet; escalate only after two failed reviews. Watch weekly 85%.
- Orchestrator added `src/engine/runes/{actions,kinds,index}.ts` stubs on W0b's branch (6922d1c) so E1/E2/E3 own disjoint files.
- W0: Bind makes a **Kind** (it lands a mark); `PartAccepts` gained `'action'` for Bind's second slot; Margin's slot takes a Repeat invention. Gifts per rune: Bolt/Splash/Vat/Steep/Coil tile, Shove/Sentence/Draw push, Guard/Steam/Brass/Afterglow/Hold round; Touch has 6 charges. `Scheduled.kind` gained `margin` and `pitch`. The foe's old `burst` event must be renamed (`foeBursts`) since `burst` is now the Spark burst.

## Follow-ups and rough edges
- **For E7 (from E5):** Bind = land Ink as a plain mark, then `attachBound` (don't call `applyMark` twice; `applyMark` with `bound` also works on an unmarked unit); `attachBound` emits a second `marked` event; Lift calls `liftMark`; a real Bind-in-Bind test is E7's.
- **For E7 (from E6):** Repeat must not schedule itself again (§6.4 limit 5): `runDetached`'s flow has no "from a repeat" flag yet. Nothing writes `Tile.hot` yet (Cinder, E8).
- **For E5 (from E2):** `bursts.ts` `markUnit` sets the mark directly; swap its body for `applyMark`. E2 doesn't emit `markSpent` (spendMark is trivial); E5's should. `Mark` has no `rounds`, so a Deep mark doesn't fade after 2 rounds: add `Mark.rounds?` if P17 applies.
- **For E6 (from E2):** in `hazards()` call `roundEndChemistry(ctx)` first (replaces the fire-burn loop: Thunderhead, Brand cloud marks, Kettle, fire), then `decayStates(ctx)` (replaces `ageStates`); `burnGates` stays. `runScheduled` must skip `thunderhead` entries. Movement should call `stainMarks(ctx, unit)` after a move; `spitInk` can call `landKindFree`; `foes.ts` `lightSlick` could call `burstAt`. `Tile.hot` (Cinder) isn't decayed anywhere yet.
- **For E6 (from E3):** the enemy phase and members must skip a `stunned` unit's next action and clear the flag; `held` counts player-phase starts (decrement at player-phase start, not round end); enemy AI/movement must respect `held`; clear shields where `guardUntil <= round` at player-phase start.
- Art to redraw later: margin (reads as P), strike (reads as T), coil (zigzag reads electric; want a spiral), brink, bind (weak knot), chalk, filings, quicksilver.
