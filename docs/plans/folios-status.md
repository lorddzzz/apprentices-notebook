# Folios build status (resume here)

Plan: [folios-plan](folios-plan.md). Orchestrator: Opus main session. Updated on every event and committed with every merge.

**State:** building
**Next:** wait for C2; then merge C1 + C2 together with a pass adapting the one-page-era tests; then U1 and D1.

## Tasks
| ID | Model | Size | Status | Branch / commit | Usage Δ | Notes |
|---|---|---|---|---|---|---|
| W0 | opus (me) | M | merged | (this commit) | ~6% | 1248 tests |
| E1 | sonnet | M | merged | 393723d | ~5% | 1269 tests; tierUps check is static (no real trip) |
| C1 | sonnet | M | reviewed, held | worktree-agent-aa32f43a35a863908 @ c9fdafc | ~5% | breaks 13 placeholder-era tests (drafts/desk/folio-contract/folio-engine); merge with C2 + a test-adaptation pass |
| C2 | opus | L | running | worktree | | started 09:27 UTC |
| U1 | sonnet | L | waiting | | | |
| U2 | sonnet | S | merged | (before 393723d) | ~4% | browser-checked on its own vite port (5-server cap); autofixer only on OwnerPage |
| D1 | haiku | S | waiting | | | |
| W-final | opus (me) | M | waiting | | | |

## Usage log
| Time (UTC) | 5h % | resets in | weekly % | zone | action |
|---|---|---|---|---|---|
| 2026-10-17 09:11 | 9 | 2h49m | 33 | normal | baseline before planning |
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
- C1: export folio constants from `$data` instead of deep imports. Accepted, done at merge

## Decisions and fixes made during the build
- Orchestrator: F19 added to the plan (drawer may hold unresearched Bench runes; using them unlocks nothing).

- W0 deviations from plan §2.2/§2.5: `repairDraft` is real (last page, issues, tray, full suite) and only the bronze record is left to E1; `draftRecord` and `turnPage` throw 'TODO E1'. No UI mount stubs: U2 owns `RuneShelf.svelte` and `GlyphSheet.svelte` outright (U1 never touches them). The desk store runs page 1's test until U1. Save v6 slot `migrateFolios` only adds `page: 0`; E1 implements F16. Helper `tests/helpers/folio.ts` also exports `place`, `lift`, `passesUpTo`, `OLD_FIXES`, `FOLIO_SIZE`; `oneEditNeighbours(inside, tray)` takes no kind (it reads `inside.kind`).

## Follow-ups and rough edges
