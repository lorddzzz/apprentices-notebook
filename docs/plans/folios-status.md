# Folios build status (resume here)

Plan: [folios-plan](folios-plan.md). Orchestrator: Opus main session. Updated on every event and committed with every merge.

**State:** building
**Next:** E1, C1, C2 running in parallel; then U1, U2 (after E1), D1 (after C1+C2).

## Tasks
| ID | Model | Size | Status | Branch / commit | Usage Δ | Notes |
|---|---|---|---|---|---|---|
| W0 | opus (me) | M | merged | (this commit) | ~6% | 1248 tests |
| E1 | sonnet | M | waiting | | | |
| C1 | sonnet | M | waiting | | | |
| C2 | opus | L | waiting | | | |
| U1 | sonnet | L | waiting | | | |
| U2 | sonnet | S | waiting | | | |
| D1 | haiku | S | waiting | | | |
| W-final | opus (me) | M | waiting | | | |

## Usage log
| Time (UTC) | 5h % | resets in | weekly % | zone | action |
|---|---|---|---|---|---|
| 2026-10-17 09:11 | 9 | 2h49m | 33 | normal | baseline before planning |

## Proposals (from agents, not yet in DESIGN/TECH)

## Decisions and fixes made during the build
- Orchestrator: F19 added to the plan (drawer may hold unresearched Bench runes; using them unlocks nothing).

- W0 deviations from plan §2.2/§2.5: `repairDraft` is real (last page, issues, tray, full suite) and only the bronze record is left to E1; `draftRecord` and `turnPage` throw 'TODO E1'. No UI mount stubs: U2 owns `RuneShelf.svelte` and `GlyphSheet.svelte` outright (U1 never touches them). The desk store runs page 1's test until U1. Save v6 slot `migrateFolios` only adds `page: 0`; E1 implements F16. Helper `tests/helpers/folio.ts` also exports `place`, `lift`, `passesUpTo`, `OLD_FIXES`, `FOLIO_SIZE`; `oneEditNeighbours(inside, tray)` takes no kind (it reads `inside.kind`).

## Follow-ups and rough edges
