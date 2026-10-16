# Glyph mastery build status (resume here)

Plan: [glyph-mastery-plan](glyph-mastery-plan.md). Orchestrator: Opus main session. Updated on every event and committed with every merge.

**State:** building
**Next:** after the 17:10 UTC reset: merge C0/U2/D1 if not yet merged, then start U6, U4, U5 (U5 needs U3, merged), then F1, then W4.

## Tasks
| ID | Model | Size | Status | Branch / commit | Usage Δ | Notes |
|---|---|---|---|---|---|---|
| W0 | opus | L | merged | 8720ca7 | ~30% (incl. planner) | 847 tests; contract additions listed below |
| E1 | sonnet | L | merged | 5023fb5 | ~8% | 942 tests |
| E2 | sonnet | M | merged | 696ff23 | ~5% | 906 tests; rewardsOf mocked in its tests |
| E3 | sonnet | L | merged | (after 5023fb5) | ~8% | 971 tests |
| E4 | sonnet | M | merged | 32d1cdf | ~5% | 1015 tests |
| E5 | haiku | S | merged | df5742c | ~2% | 853 tests |
| C0 | sonnet | S | pending | | | |
| U1 | sonnet | M | merged | 7b33b5e | ~5% | doorway read-only view not browser-checked |
| U2 | haiku | S | pending | | | |
| U3 | sonnet | L | merged | e81523c | ~5% | browser-checked light only |
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
| 2026-10-16 13:46 | 64 | 3h24m | 9 | wrap by projection (~1.2%/min, 2 agents) | E2 merged; E1, E3 running |
| 2026-10-16 13:48 | 66 | 3h22m | 9 | normal (66 + 21 ≈ 87) | E1, E3 merged; start E4, U3, U1, C0 |
| 2026-10-16 13:58 | 84 | 3h12m | 12 | narrow (84 + C0 + U2 + D1 ≈ 89) | E4, U3, U1 merged; wrap nudges to U1/C0; start U2, D1 (Haiku); then hold for the 17:10 UTC reset |

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
- E2: every issue blocks `reviseGlyph` (stranded and lone aura too); kind change and unknown id refused. Accepted
- E2: an unchanged inside isn't refused by the engine; the UI disables Save. Accepted
- E2: new version = max(current, archived, record keys) + 1; numbers never reused. Accepted
- E2: canvas = bbox (entry included) + ring, capped at `revisionCanvasMax` (7); past the cap the ring goes first, then cells fall off (blocking `canvas`). Fine while pages are ≤ 5×6; see follow-ups
- E2: issue kinds: `entry` (missing, not at 0,0, Source arrow not right), `kind`, `source` (non-entry Source); stranded/aura checks skipped while entry/kind issues exist; "aura touches a reached cell" is literal. Accepted
- E2: `innerMeta` exits from its own walk; every step onto an empty cell is an exit (a revision can list more exits than its v1). Accepted
- E2: on revise an open cell carries over only if the same cell still holds a rune of that family, at most `paramSlots`; the extra exit only if its side is still free. Accepted
- E2: `revisionWarning` compares `validateLoadout` before/after (includes the lost discount); wording "Pushes the Stoker's page ink over" / "…over the Amplify you own". Accepted
- E1: spans are per run, not per node: On Kill emits one trigger span per victim, each inner run its own spans (M4 sums runs). Accepted
- E1: a node's `glyph` comes from `spell.cells`; a Spell Glyph's source `inner` from `spell.path[0]`. Accepted
- E1: samples grouped by Glyph and socket; a Spell Glyph always samples; a Payload samples when any inner span exists (its own failing trigger gives a non-meaningful sample). Accepted
- E1: outer-aura cost counted from the caster's lattice, as `placedInk`. Accepted
- E1: `fired` = inner + viaInner cells + inner auras beside a fired cell; a trigger that ran but didn't open counts as fired. Accepted
- E1: `innerFired` returns span cells only (no auras). Accepted
- E1: `tierUps` one entry per metric with the new tier, economy first, even on a jump of two. Accepted
- E1: `deadCells` covers every cell of `def.cells` (entry, auras, open cells included); records update only for current versions. Accepted
- E1: `MEANINGFUL` exported from cast.ts. Accepted
- E3: the compiler honours an arg only on a `params` cell of the default's family; else the default (stale saves never throw); `glyphRunes` follows the same filter. Accepted
- E3: `validateLattice` flags args on missing, non-param, Source/Aura or wrong-family cells. Accepted
- E3: an arrow arg without a direction takes the default's arrow, then right. Accepted
- E3: notation `G:g1>[1,0:Smear]`, several args in local reading order, arrow suffix on arrow args. Accepted
- E3: the extra exit hangs off the first `beyond`; skipped when it equals the main exit. Accepted
- E3: Shape-family args can't keep identity once a tail exists (exit geometry changes); the shape-arg identity test runs on lone Spell Glyphs only. Accepted: a Shape arg is meant to change where the flow goes
- E4: test stage: the draft's Glyph id is `draft`; a Spell draft sits alone in a 5×3 lattice at (0,1); enemies idle (`intents: {}`). Accepted
- E4: a page that can't compile has no spell, so the test fails and never throws. Accepted
- E4: `nextDraft` = first unowned draft by order with depth ≤ table; "owned" includes repaired. Accepted
- E4: `repairDraft` refuses any `insideIssues` entry (stranded and lone aura too). Accepted
- E4: repair adds the idiom to `p.idioms` like `compileGlyph`, but `freeIdiomCompile` still treats it as unused; repaired Glyph id = next free `gN` incl. the archive. Accepted
- E4: `editDraft`/`resetDraft` refuse unowned or repaired drafts; `editDraft` refuses a kind change and stores any inside unchecked. Accepted
- E4: `bankDrafts` skips duplicates (a working copy is never reset) and unknown ids. Accepted
- E4: `checkGoal` `dies` = a `died` event or hp ≤ 0; `hurt` sums `damage.amount`; `DraftRun.goals` flattens `all`. Accepted
- E4: boards 5×3 with D at A2; heart `D . r r .` / `. . . b .` aimed at C2; Wet Work host `Bolt> G:draft> . . .` mid row. Accepted
- U3: RevisionEditor props `inside, title, palette, issues(inside), warning?(inside), saveLabel?, lenient?, onsave(inside) → string|null, onclose`. `lenient` = the desk's working-copy mode (only blocking issues stop Save). Accepted
- U3: a Spell Glyph's entry fully locked; a Payload's entry can change rune and turn but never be lifted. Accepted
- U3: Erase is the lift tool, alongside long-press (long-press isn't discoverable). Accepted
- U3: the palette caps at `count` per rune (counting the inside's total); the desk passes `count: null`. Accepted
- U3: canvas follows the working copy's `revisionCanvas` (grows and shrinks; can shift cells near top/left edges). Accepted, watch in playtest
- U3: ink shown as base cost before → after, "before any discount"; warning only once the inside changed; Reset restores the start. Accepted
- U1: Versions list hidden when there's only one version; folded by default otherwise; Revert uses an inline two-step confirm; read-only in a doorway. Accepted
- U1: dead-cell line names the first dead cell in reading order; trigger line when a fired trigger's neighbour fired 0 times and nothing is dead yet; idle line when ≥ 1 cast in the window did nothing. Accepted
- U1: form shows `◔ 1.2 ink · ◑ 90%` at a full window, else "n / 10"; average harm = lifetime harm ÷ casts of the current version; ink = base → base − discount. Accepted
- U1: sheet title "Fair copy", name in the header; extra-exit arrow drawn outside the dashed box. Accepted
- W0 contract additions: `DraftDef.hint`; `DraftTest {board, aim, endRound?, hp?, goal}`; `canPlaceGlyph(p, m, at, glyph, args?)`; `accumulateStats(stats, log, known, compiled = {})`; `rollOffers(seed, enc, table, members, draft = null)` (null drops draft entries so rolls are unchanged); `revisionWarning` (revision.ts), `lastTripDeadCells` (tripStats.ts), `effectiveGlyph`/`masteryDefaults`/`freeIdiomCompile` (run.ts), `setGlyphArgs`/`revisionPalette`/`PaletteSlot` (study.ts), `game.updateProfile`, `game.fairCopy(…, open)`. profiler.ts and drafts.ts must never import run.ts (cycle). Span offsets start at the first event after `cast`; `to` exclusive. The save validator ignores `'arg'` issues so a stale arg never makes a save unloadable

## Decisions and fixes made during the build
- Orchestrator: M34 amended. Stranded cells and lone auras don't block a draft's test (the broken page must run and fail), but they block repair and a revision's Save.
- Orchestrator: W0 is delegated to an Opus agent instead of written in the main session, to keep the orchestrator's context lean for a two-window build.

## Follow-ups and rough edges
- ESM cycle revision.ts → run.ts → drafts.ts → revision.ts (function-level only; harmless today).
- The app has no dark theme; U1/U3 dark checks are moot.
- Revision canvas cap 7: a 7+-long Glyph line would be unrevisable; raise `revisionCanvasMax` (and E2's tests) if pages ever grow past 5×6.
- E2's tests mock `rewardsOf`; once E1 lands, nothing in revision tests exercises the real one (F1 fuzz will).
