# Folios build status (resume here)

Plan: [folios-plan](folios-plan.md). Orchestrator: Opus main session. Updated on every event and committed with every merge.

**State:** building
**Next:** U1 and D1 running; then W-final (verify the loop at 375×812, code review, docs). Note: until U1 merges, the live desk runs only page 1 and can't mend a folio.

## Tasks
| ID | Model | Size | Status | Branch / commit | Usage Δ | Notes |
|---|---|---|---|---|---|---|
| W0 | opus (me) | M | merged | (this commit) | ~6% | 1248 tests |
| E1 | sonnet | M | merged | 393723d | ~5% | 1269 tests; tierUps check is static (no real trip) |
| C1 | sonnet | M | merged | 69f4b76 (with C2) | ~5% | |
| C2 | opus | L | merged | 69f4b76 (with C1) | ~15% | folios-deep 24 tests ~1 s; orchestrator moved SOLUTIONS to tests/helpers/folio-solutions.ts and rewrote the one-page-era repair tests in drafts.test.ts |
| U1 | sonnet | L | running | worktree | | started 10:00 UTC |
| U2 | sonnet | S | merged | (before 393723d) | ~4% | browser-checked on its own vite port (5-server cap); autofixer only on OwnerPage |
| D1 | haiku | S | running | worktree | | started 10:00 UTC |
| W-final | opus (me) | M | waiting | | | |

## Usage log
| Time (UTC) | 5h % | resets in | weekly % | zone | action |
|---|---|---|---|---|---|
| 2026-10-17 09:11 | 9 | 2h49m | 33 | normal | baseline before planning |
| 2026-10-17 10:00 | 59 | 2h01m | 40 | normal→narrow by projection (59 + U1 12 + D1 2 + final 10 ≈ 83) | C1+C2 merged; start U1, D1; last spawns |
| 2026-10-17 09:34 | 40 | 2h26m | 37 | normal (only C2 running) | U2, E1 merged and pushed; C1 held |
| 2026-10-17 09:26 | 21 | 2h34m | 35 | normal (21 + E1 8 + C1 8 + C2 15 + U2 3 ≈ 55) | W0 merged; start E1, C1, C2, U2 |

## Proposals (from agents, not yet in DESIGN/TECH)
- U2: lore keeps its line breaks (`white-space: pre-line`), so D1 can write short paragraphs. Accepted
- U2: a new quill path for the owner's mark (the Quill rune icon is an arrow + drop). Accepted
- E1: `turnPage` on a mended copy says "already mended" before the last-page check. Accepted
- E1: `editDraft` and `repairDraft` use the `trayIssue` text as their error. Accepted
- E1: `migrateFolios` keeps a repaired copy's inside, only sets its page (F16). Accepted
- E1: the bronze raise is skipped when `glyphRecords` or `glyphs` aren't the expected shapes. Accepted
- C1: Lamplighter page 2 needs hurt ≥ 5 (Bolt 2 + Spark 1 + fire 1 = 4 passed without the Amp). Accepted
- C1: Pierce anywhere on the path works (it flags the whole spell), so Collection has no "Pierce too late" trap and no designed regression. Accepted (tutorial)
- C1: export folio constants from `$data` instead of deep imports. Changed: tests look them up in `DRAFTS`
- C2: On Inked moved from Wet Work to Left Hand First (as a pure gate it was decoration in Wet Work). Accepted
- C2: Wet Work gets 2 Amps; the heart a third Amp (page 2) and drops Ink from its final shape. Accepted
- C2: watchers on the heart's pages 3–4 block a shortcut that skipped On Kill. Accepted
- C2: pre-inked units (`r!`) allowed on folio boards (brass carries a spark far, nothing inks that far). Accepted
- C2: keep "a spark that kills a brass unit doesn't conduct": the heart's hp numbers depend on it. Accepted (existing rule)

## Decisions and fixes made during the build
- Orchestrator: F19 added to the plan (drawer may hold unresearched Bench runes; using them unlocks nothing).

- W0 deviations from plan §2.2/§2.5: `repairDraft` is real (last page, issues, tray, full suite) and only the bronze record is left to E1; `draftRecord` and `turnPage` throw 'TODO E1'. No UI mount stubs: U2 owns `RuneShelf.svelte` and `GlyphSheet.svelte` outright (U1 never touches them). The desk store runs page 1's test until U1. Save v6 slot `migrateFolios` only adds `page: 0`; E1 implements F16. Helper `tests/helpers/folio.ts` also exports `place`, `lift`, `passesUpTo`, `OLD_FIXES`, `FOLIO_SIZE`; `oneEditNeighbours(inside, tray)` takes no kind (it reads `inside.kind`).

## Follow-ups and rough edges
