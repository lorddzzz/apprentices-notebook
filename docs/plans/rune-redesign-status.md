# Rune redesign build status (resume here)

Plan: [rune-redesign-plan](rune-redesign-plan.md). Orchestrator: Opus main session. Updated on every event and committed with every merge.

**State:** building
**Next:** W0b (Opus) cutover running → then W0c (Sonnet) from W0b's branch; merge the pair together.

**Player calls (2026-10-19):** P2 Seam + canals playable, the rest Lab-only (accepted). P9 folios retired (accepted). P3 changed: edges depend on the district; wall in the Seam and the canals, later districts decide in their own rounds. No push until W6 (P40).

## Tasks
| ID | Model | Size | Status | Branch / commit | Usage Δ | Notes |
|---|---|---|---|---|---|---|
| plan | opus agent | M | done | 859dbf9 | ~? | 457 lines, 42 Proposals |
| W0 | opus (me) | M | merged | (this commit) | ~5% | contracts in `src/data/next/` and `src/engine/next/` (not the plan's runeModel.ts/model.ts names); W0b moves them in |
| W0b | opus | L | running | worktree | | started 22:14 UTC |
| W0c | sonnet | L | waiting | | | deps W0b; merged with it |
| E1 | opus | L | waiting | | | |
| E2 | sonnet | L | waiting | | | |
| E3 | sonnet | M | waiting | | | |
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

## Proposals (from agents, not yet in DESIGN/TECH)

## Decisions and fixes made during the build
- W0: Bind makes a **Kind** (it lands a mark); `PartAccepts` gained `'action'` for Bind's second slot; Margin's slot takes a Repeat invention. Gifts per rune: Bolt/Splash/Vat/Steep/Coil tile, Shove/Sentence/Draw push, Guard/Steam/Brass/Afterglow/Hold round; Touch has 6 charges. `Scheduled.kind` gained `margin` and `pitch`. The foe's old `burst` event must be renamed (`foeBursts`) since `burst` is now the Spark burst.

## Follow-ups and rough edges
- Art to redraw later: margin (reads as P), strike (reads as T), coil (zigzag reads electric; want a spiral), brink, bind (weak knot), chalk, filings, quicksilver.
