# Rune redesign build status (resume here)

Plan: [rune-redesign-plan](rune-redesign-plan.md). Orchestrator: Opus main session. Updated on every event and committed with every merge.

**State:** building
**Next:** W0c running on top of W0b's branch; E1, E2, E3 running on top of W0b's branch (`worktree-agent-acf3bae867e3e905f` @ 6922d1c, which adds handler stubs). Merge W0b+W0c to main together, then E1→E2→E3 (merge main into each first). Then R1 (touches app/save.ts, needs W0c), then W2.

**Player calls (2026-10-19):** P2 Seam + canals playable, the rest Lab-only (accepted). P9 folios retired (accepted). P3 changed: edges depend on the district; wall in the Seam and the canals, later districts decide in their own rounds. No push until W6 (P40).

## Tasks
| ID | Model | Size | Status | Branch / commit | Usage Δ | Notes |
|---|---|---|---|---|---|---|
| plan | opus agent | M | done | 859dbf9 | ~? | 457 lines, 42 Proposals |
| W0 | opus (me) | M | merged | (this commit) | ~5% | contracts in `src/data/next/` and `src/engine/next/` (not the plan's runeModel.ts/model.ts names); W0b moves them in |
| W0b | opus | L | done, not merged | worktree-agent-acf3bae867e3e905f @ 046f9af (+ 6922d1c orchestrator handler stubs) | ~74% of a 5h window, ~10% weekly | 513 engine tests; app/ui red until W0c |
| W0c | sonnet | L | running | worktree (from W0b) | | started 00:43 UTC |
| E1 | sonnet | L | running | worktree (from W0b) | | moved to Sonnet to save weekly usage; started 00:47 |
| E2 | sonnet | L | running | worktree (from W0b) | | started 00:47 |
| E3 | sonnet | M | done, not merged | worktree-agent-a7f0621bb86e37774 @ fdce332 | | 540 engine tests; 23 line rows. At merge: add `Layer.slid?`, Tuning keys sentenceTiles/holdRounds/levyShieldPerMark (now local consts) |
| R1 | sonnet | M | waiting | | | |
| E5 | sonnet | L | waiting | | | |
| E6 | sonnet | L | waiting | | | |
| L1 | sonnet | M | waiting | | | |
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

## Proposals (from agents, not yet in DESIGN/TECH)
- W0b contract changes: `Step` gains a `split` role (a Glyph's extra exit); `MemberDef.lean: Lean`; `PlacedRune`/`GlyphArg`/`FiredCell` runes are `RuneRef`; `compileLattice`/`inkOf` take default args; `Profile.footnotes` Partial; new `BattleSpec.edge`, `DistrictDef.edge`, `EnemyDef.elite` (`oilSoaked` removed); HearCondition `ignite`→`burst`, `discovered`→`named`; new gate `drawing` for unbuilt districts; codex kinds rune/method/idiom; `vent` event kept. Accepted.
- E3: push lines are `shove:*` whoever pushes (a crush via Sentence reveals Shove's line); `slid` counts only tiles beyond the push (one slick under the target adds no slide); a dropped elite/member stays on the last solid tile; a flier on a drop edge is crushed as on a wall; a struck held unit still takes damage; Swap with a tile/self does nothing and Hold blocks it; Draw moves state and jar independently, a plate won't go under a unit, gifted Draw goes 2; Erase clears mark, cast collar, shackle, tile state and jar (a born collar stays); layout plates can be erased and drawn but never break by crush; `*:empty` lines dropped (area spells would spam them). Accepted.
- W0b: `+` notation = 1 shield each; `$` shackle lasts 2 rounds; layout plate `=` never breaks; a cloud or plate that stops a Bolt becomes its target; Vat's 2×2 has the aimed tile top-left; gifted Splash/Vat = +1 range, not a bigger area; auras touch any path cell they sit beside; a shackled or held member can't move; vents puff only onto empty tiles; floats never displace a cloud; a moth lights its connected slick; rat trails land per tile; spit marks the unit or leaves a blot; unknown inventions insulate and are flagged; invention token `inv:name`. Accepted (tune by playing).

## Decisions and fixes made during the build
- 2026-10-19: weekly at 61% after W0b on Opus (~10% weekly for one L task). E1 moved from Opus to Sonnet; escalate only after two failed reviews. Watch weekly 85%.
- Orchestrator added `src/engine/runes/{actions,kinds,index}.ts` stubs on W0b's branch (6922d1c) so E1/E2/E3 own disjoint files.
- W0: Bind makes a **Kind** (it lands a mark); `PartAccepts` gained `'action'` for Bind's second slot; Margin's slot takes a Repeat invention. Gifts per rune: Bolt/Splash/Vat/Steep/Coil tile, Shove/Sentence/Draw push, Guard/Steam/Brass/Afterglow/Hold round; Touch has 6 charges. `Scheduled.kind` gained `margin` and `pitch`. The foe's old `burst` event must be renamed (`foeBursts`) since `burst` is now the Spark burst.

## Follow-ups and rough edges
- **For E6 (from E3):** the enemy phase and members must skip a `stunned` unit's next action and clear the flag; `held` counts player-phase starts (decrement at player-phase start, not round end); enemy AI/movement must respect `held`; clear shields where `guardUntil <= round` at player-phase start.
- Art to redraw later: margin (reads as P), strike (reads as T), coil (zigzag reads electric; want a spiral), brink, bind (weak knot), chalk, filings, quicksilver.
