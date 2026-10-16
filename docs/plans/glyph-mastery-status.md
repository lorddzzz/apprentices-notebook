# Glyph mastery build status (resume here)

Plan: [glyph-mastery-plan](glyph-mastery-plan.md). Orchestrator: Opus main session. Updated on every event and committed with every merge.

**State:** building
**Next:** Wave 1: E1, E3, E2, E5 running; E4 starts when usage allows.

## Tasks
| ID | Model | Size | Status | Branch / commit | Usage Δ | Notes |
|---|---|---|---|---|---|---|
| W0 | opus | L | merged | 8720ca7 | ~30% (incl. planner) | 847 tests; contract additions listed below |
| E1 | sonnet | L | pending | | | |
| E2 | sonnet | M | pending | | | |
| E3 | sonnet | L | pending | | | |
| E4 | sonnet | M | pending | | | |
| E5 | haiku | S | merged | df5742c | ~2% | 853 tests |
| C0 | sonnet | S | pending | | | |
| U1 | sonnet | M | pending | | | |
| U2 | haiku | S | pending | | | |
| U3 | sonnet | L | pending | | | |
| U6 | sonnet | M | pending | | | |
| U4 | sonnet | L | pending | | | |
| U5 | sonnet | L | pending | | | |
| D1 | haiku | S | pending | | | |
| F1 | sonnet | M | pending | | | |
| W4 | opus | M | pending | | | |

## Usage log
| Time (UTC) | 5h % | resets in | weekly % | zone | action |
|---|---|---|---|---|---|
| 2026-10-16 12:54 | 6 | 4h16m | 1 | normal | baseline before planning |
| 2026-10-16 13:34 | 42 | 3h35m | 6 | normal (42 + wave 1 ≈ 83) | W0 merged; start E1, E3, E2, E5 |
| 2026-10-16 13:43 | 59 | 3h27m | 8 | wrap by projection (~2%/min) | E5 merged; narrow nudges sent; no new spawns |

## Proposals (from agents, not yet in DESIGN/TECH)
- W0: version-record keys are `id@N`; an archived version must belong to a current Glyph and not repeat its current version (no orphan records). Accepted
- W0: open cells only on Material, Trigger or Shape cells, checked by the validator. Accepted
- W0: `extraExit` accepts only up, right or down (M26). Accepted
- W0: a trip's loot plus offers hold at most one draft (M30). Accepted
- W0: tally `cells`/`fired` and record `fired` keys are `x,y` cell keys. Accepted
- W0: revert and settings changes refused in a doorway ("Only at home"), per M12/M19. Accepted
- W0: switching member closes the argument picker. Accepted
- W0: `setGlyphArgs` with an empty set removes `args`, so a fresh Fair Copy stays identical (M21). Accepted
- E5: `lastTripDeadCells` skips Spell Glyph sources (they get M13 elsewhere). Accepted
- E5: `cells` is the latest fought path (a doorway rewire updates it); `fired` stays a union across fights. Accepted
- E5: echo casts add casts/damage and refresh cells, but nothing to `fired` (no trace). Accepted
- W0 contract additions: `DraftDef.hint`; `DraftTest {board, aim, endRound?, hp?, goal}`; `canPlaceGlyph(p, m, at, glyph, args?)`; `accumulateStats(stats, log, known, compiled = {})`; `rollOffers(seed, enc, table, members, draft = null)` (null drops draft entries so rolls are unchanged); `revisionWarning` (revision.ts), `lastTripDeadCells` (tripStats.ts), `effectiveGlyph`/`masteryDefaults`/`freeIdiomCompile` (run.ts), `setGlyphArgs`/`revisionPalette`/`PaletteSlot` (study.ts), `game.updateProfile`, `game.fairCopy(…, open)`. profiler.ts and drafts.ts must never import run.ts (cycle). Span offsets start at the first event after `cast`; `to` exclusive. The save validator ignores `'arg'` issues so a stale arg never makes a save unloadable

## Decisions and fixes made during the build
- Orchestrator: M34 amended. Stranded cells and lone auras don't block a draft's test (the broken page must run and fail), but they block repair and a revision's Save.
- Orchestrator: W0 is delegated to an Opus agent instead of written in the main session, to keep the orchestrator's context lean for a two-window build.

## Follow-ups and rough edges
