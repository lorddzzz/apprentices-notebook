# Folios build status (resume here)

Plan: [folios-plan](folios-plan.md). Orchestrator: Opus main session. Updated on every event and committed with every merge.

**State:** done (2026-10-17)
**Next:** the player's playtest of the folios. Follow-ups: ROADMAP BL-96, BL-97.

## Tasks
| ID | Model | Size | Status | Branch / commit | Usage Δ | Notes |
|---|---|---|---|---|---|---|
| W0 | opus (me) | M | merged | (this commit) | ~6% | 1248 tests |
| E1 | sonnet | M | merged | 393723d | ~5% | 1269 tests; tierUps check is static (no real trip) |
| C1 | sonnet | M | merged | 69f4b76 (with C2) | ~5% | |
| C2 | opus | L | merged | 69f4b76 (with C1) | ~15% | folios-deep 24 tests ~1 s; orchestrator moved SOLUTIONS to tests/helpers/folio-solutions.ts and rewrote the one-page-era repair tests in drafts.test.ts |
| U1 | sonnet | L | merged | bc8694d | ~6% | 1312 tests; orchestrator removed the cover line from the open folio (830bf2d) |
| U2 | sonnet | S | merged | (before 393723d) | ~4% | browser-checked on its own vite port (5-server cap); autofixer only on OwnerPage |
| D1 | haiku | S | merged | 18a24cc | ~1% | orchestrator restored two hints that gave the fix away, softened one lore line |
| W-final | opus (me) + sonnet reviewer | M | done | (this commit) | ~8% | browser loop at 375×812 on Wet Work (page 1 → broke → turn → editor → copy-in → bronze Glyph); review: 4 fixes |

## Usage log
| Time (UTC) | 5h % | resets in | weekly % | zone | action |
|---|---|---|---|---|---|
| 2026-10-17 09:11 | 9 | 2h49m | 33 | normal | baseline before planning |
| 2026-10-17 10:20 | 75 | 1h40m | 42 | normal | U1, D1 merged; final check + review done |
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

- U1: no "earlier notes" fold yet (older fragments are dimmed). Follow-up BL-97
- U1: the Lamplighter's page 1 drops only Oil ("+ Oil"); the plan's "+ Oil, + Amplify" was only an example. Accepted
- D1: Collection's lore ("in that order and never the other way round") and its reaction disagree on purpose. Accepted
- Review fixes (orchestrator): a mended folio shows all chips passing and is never re-run (a pre-v6 mended page can fail the rebuilt tests); turning a page clears the stale result; a playback that ends after leaving the folio drops its result; a saved page past the end is clamped instead of rejecting the save
- Orchestrator: an open folio shows the page fragments only; the cover line repeated page 1

## Follow-ups and rough edges
- BL-96: goal lines name units by id ("dummy-2 dies")
- BL-97: fold older note fragments on the 4-page folio if it reads heavy
- The desk store's late-playback guard has no unit test (needs the Svelte runtime); covered by reasoning and the browser loop only
- Not browser-checked: the owner's mark after this build's merges (U2 checked it on its branch), and a v5 save migrating in the browser (covered by tests)
