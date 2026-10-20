# Folios: rebuild the owner's drafts (BL-14), implementation plan

> **For the player, in five lines**
> 1. Each of the owner's five drafts becomes a folio of 2 to 4 pages: the two shallow ones have 2, the two deep ones 3, the heart one 4.
> 2. You mend a folio only with the runes on its page and the scraps in its drawer, which have counts. Your own collection plays no part.
> 3. Each page adds a test and 1 or 2 scraps. Every test you have unlocked runs on every attempt, so a fix for page 3 can break page 1.
> 4. The last two folios hide a decoy or two in the drawer. The final shapes are bigger than a quick fix: forks, triggers and auras, about 5 to 12 runes.
> 5. The reward is a Glyph that starts at Reliability bronze and carries the owner's mark, plus a page of the owner's story you can read again.

Design: [research-and-mastery.md](../design/research-and-mastery.md) §0 (the table "Decided in the drafts round of 2026-10-17", which supersedes the 2026-10-16 rows on drafts) and §4.7. Roadmap: BL-14. If this plan and the design disagree, the design wins and the orchestrator asks the player. Project rules: [AGENTS.md](../../AGENTS.md). Run it with the `implement` skill. Status: [folios-status.md](folios-status.md).

**Scope**

| # | Item | Task |
|---|---|---|
| F-a | Folio data model: pages, tests, scraps, decoys, lore | W0 |
| F-b | Engine: the tray, running the full suite, turning pages, the bronze reward, save v6 | W0, E1 |
| F-c | The five folios rewritten and proven by tests | C1, C2 |
| F-d | The desk: pages, drawer, per-test ticks, regressions, turning, lore | U1 |
| F-e | The owner's mark and the lore on the Glyph sheet and shelf | U2 |
| F-f | The owner's voice: page notes, hints, reactions, lore | D1 |

**Not in this plan:** a Codex section for drafts or lore, new rune mechanics, footnotes (BL-12), changes to how drafts drop (`nextDraft` stays as it is), and tuning the bronze head start (left to playtests).

---

## 0. Team and models

The setup is the same as in [glyph-mastery-plan.md](glyph-mastery-plan.md) §0:
- An **Opus** orchestrator writes the contracts (W0), merges, keeps the docs and does the final check.
- **Sonnet** implements the engine and the Svelte work.
- **Opus** designs the deep and heart puzzles (C2), which is real puzzle design against the simulator.
- **Haiku** writes the owner's voice to a precise spec.

Each task runs in its own git worktree and owns its files exclusively. A task that fails review twice moves up one model. UI agents use the `dev-alt` preview (port 5190); the orchestrator keeps `dev` (5173). Subagents never edit `DESIGN.md`, `TECH.md` or `docs/design/*`. Every rule a subagent invents goes under **Proposals** in its report.

---

## 1. Rules this plan settles (*Proposals*: log them in DESIGN §11 and feature doc §0 when built, tune by playing)

| # | Topic | Default | Why |
|---|---|---|---|
| F1 | The tray | Tray(page k) = the runes on the owner's starting page, at their counts, plus the scraps of pages 1..k. Lifting a rune puts it back in the tray. The entry Source counts toward the tray but stays locked, as in the revision editor | One closed set of parts: use what's here |
| F2 | One working page | A folio has one working inside for all its pages, and turning a page keeps your work | The suite grows; the code stays the same code |
| F3 | Progress persists | `DraftCopy.page` is the highest unlocked page (0-based), and pages never re-lock. "Start over" resets only the inside, back to the owner's page; the drawer keeps its unlocked scraps | Starting over must not cost tests already earned |
| F4 | Running | "Run the tests" runs **every unlocked test**. Each test shows a ✓ or ✗ chip, and each goal line under it has its own tick | Decided: the whole suite runs every time |
| F5 | Playback | One board animates: the first failing test, or the newest test if all pass. Tapping a test chip shows that test's board in its final state, with its lit and faded cells (no replay) | One board fits on a phone |
| F6 | Regressions | A test that passed on the previous run in this desk session and now fails reads "broke". This is never saved | Regressions are the puzzle, so make them visible |
| F7 | Turning the page | When every unlocked test passes and this isn't the last page, "Turn the page" appears. It reveals the next note fragment, a "+ Oil, + Amplify" drawer line, and the new test, shown before you run it | The moment of progress, and the new scraps hint at the next fix |
| F8 | Copying in | On the last page, once every test passes, the page has no issues and it uses only tray runes, you can copy the folio into your notebook. Copying in shows the reaction, then the lore page | Same gate as today, plus the tray |
| F9 | The bronze reward | The Glyph's v1 record is `emptyRecord()` with `best.reliability = TUNING.draftRewardTier.reliability` (1 = bronze). Economy stays 0 and the window is empty, so current form reads 0 / 10. Bronze gives no concrete reward yet (the extra exit needs silver) | Decided: bronze reached, window empty |
| F10 | Revisions | A revision makes v2 or later with a fresh empty record (the existing M17 rule). The `draft` field is copied to every version, so the mark stays. Reverting to v1 brings bronze back | Records stay honest; the mark records where the Glyph came from |
| F11 | The owner's mark | Any `GlyphDef` with `draft` set shows a small quill mark on its shelf tile and "in the owner's hand" in the sheet header | Decided: the owner's mark on the shelf |
| F12 | Lore | `DraftDef.lore` is 3 to 6 sentences in the owner's voice. The desk shows it under the reaction once the folio is mended. A mended folio stays readable (notes, tests, final page), and the Glyph sheet has a fold, "The owner's page", with the same text | Readable in two places; no Codex section needed yet |
| F13 | Decoys | Never labelled in the UI. `DraftDef.decoys` lists them for the tests only. None in folios 1 to 3, 1 in Left Hand First, 2 in The Foundry Bell | Decided: decoys only in later folios |
| F14 | Sizes | Pages: 2, 2, 3, 3, 4. Final shapes: about 5–7 runes for the tutorials, 8–10 for the deep folios, 10–12 for the heart, auras included. Flow cells stay 3–8 (`glyphMinCells`/`glyphMaxCells`), the canvas stays at most 7×7, and boards are at most 7 wide and 5 tall | Richer than a minimal fix, inside the Glyph limits |
| F15 | Old fixes no longer suffice | Each draft's 2026-10-16 fix (today's `tests/run/drafts.test.ts` FIXES) must **fail** that folio's last page | The player found the minimal fix too simple |
| F16 | Save v6 | See §2.4. Unrepaired copies start again at page 1 from the new folio's start. Repaired copies stay repaired (page = last). An already-repaired draft Glyph gets the bronze record if it has none | Old work no longer matches the new folios; the reward should be the same for everyone |
| F17 | The free idiom compile | Unchanged: a draft Glyph doesn't use up an idiom's first free compile (P11, M33) | — |
| F18 | Desk list rows | Each row shows the name, "page 2 / 3" or "mended", and the cover note | Shows where you stand |
| F19 | Bench runes in a drawer | A drawer may hold runes the player hasn't researched yet (Smear, Etch, Brand…). Using one at the desk doesn't unlock or research it, and it isn't added to the collection | The owner's drawer is the owner's; it lets you try a rune early without spoiling the Bench |

---

## 2. Contracts (Wave 0, orchestrator)

### 2.1 Data (`src/data/types.ts`)

```ts
/** One page of a folio: the next fragment of the note, one test, the scraps it drops (F1, F7). */
export interface FolioPage {
  note: string;   // this page's fragment of the owner's note
  hint: string;   // a codex-style nudge for this page
  test: DraftTest;
  scraps: Partial<Record<RuneId, number>>; // into the drawer when the page opens (page 1: on banking)
}
export interface DraftDef {
  id: DraftId; order: number; depth: LootTableId; name: string;
  kind: 'spell' | 'payload';
  inside: string; entry: string; host?: string;   // the owner's broken starting page (unchanged meaning)
  note: string;                     // the cover line (desk list)
  pages: readonly FolioPage[];      // 2–4; tests accumulate
  decoys: readonly RuneId[];        // drawer scraps the intended fix leaves unused (tests only, F13)
  reaction: string;
  lore: string;                     // the owner's story page (F12)
}
```

The top-level `test` and `hint` fields go away. `tuning.ts` gets `draftRewardTier: { reliability: 1 }`.

`src/data/drafts.ts` becomes an assembler, `DRAFTS = [LAMPLIGHTER, COLLECTION, WET_WORK, LEFT_HAND_FIRST, FOUNDRY_BELL]`, importing **one file per folio** from `src/data/folios/<id>.ts` so that C1 and C2 never share a file. W0 fills each folio with a placeholder: page 1 = today's test, `scraps: {}`, `decoys: []`, `lore: 'TODO'`.

### 2.2 Engine (`src/engine/types.ts`, `src/engine/drafts.ts`)

```ts
export interface DraftCopy { id: DraftId; inside: GlyphInside; page: number; repaired: boolean } // page: 0-based (F3)

export function trayCounts(d: DraftDef, page: number): Partial<Record<RuneId, number>>; // F1
export function trayIssue(d: DraftDef, page: number, inside: GlyphInside): string | null; // "The drawer has no more Oil"
export function draftTest(d: DraftDef, test: DraftTest, inside: GlyphInside): DraftRun;  // was (d, inside)
export interface FolioRun { tests: DraftRun[]; passed: boolean }                         // tests[i] ↔ pages[i]
export function folioRun(d: DraftDef, page: number, inside: GlyphInside): FolioRun;      // tests 0..page (F4)
export function turnPage(p: Profile, id: DraftId): Profile;   // throws unless every unlocked test passes and page < last
export function repairDraft(p: Profile, id: DraftId): Profile; // + last page, + trayIssue, + bronze record (F8, F9)
export function draftRecord(): GlyphRecord;                    // emptyRecord() with best.reliability from TUNING
// editDraft: also refuses trayIssue. resetDraft: keeps page (F3). bankDrafts: page 0.
```

W0 writes these for real, because the content tasks need them:
- `draftTest(d, test, inside)`, a mechanical change of the current function;
- `trayCounts`, `trayIssue` and `folioRun`.

W0 stubs `turnPage`, `draftRecord` and the new `repairDraft` so they throw `'TODO E1'`, and updates `parseDraftCopy` in `run.ts` to read `page` (an integer from 0 to pages − 1).

### 2.3 Test helper (`tests/helpers/folio.ts`, W0)

```ts
export type Tweak = (i: GlyphInside) => GlyphInside;          // moved here from drafts.test.ts (moveCell, patchCell, both, place, lift)
export function checkFolio(d: DraftDef, solutions: readonly GlyphInside[]): string[]; // problems, [] = sound
export function oneEditNeighbours(inside: GlyphInside, tray: Partial<Record<RuneId, number>>, kind: 'spell' | 'payload'): GlyphInside[];
```

`checkFolio` reports a problem for each of these:
- the start passes test 0;
- `solutions[k]` breaks the tray of page k, or fails any of tests 0..k;
- `solutions[k]` already passes test k+1 (the next page would be free);
- the final solution uses a listed decoy, or leaves a non-decoy scrap unused;
- the page count is wrong for the depth (F14);
- the final rune count is out of the F14 range.

`oneEditNeighbours` yields every single place, lift or turn on the canvas that the tray allows (the entry stays locked).

### 2.4 Save (`src/app/save.ts`; W0 adds the slot, E1 implements it)

Migration 5 → 6 is `migrateFolios`. For each `profile.drafts` entry:
- an unrepaired copy becomes `{ id, page: 0, repaired: false, inside: draftInside(draftById(id)) }`;
- a repaired copy becomes `{ id, page: pages.length - 1, repaired: true, inside }`, keeping its old inside;
- an unknown id passes through unchanged (`deskRows` already drops it).

For each Glyph with `draft` set, the migration sets `glyphRecords[versionKey(id, 1)].best.reliability` to max(its value, 1), creating the record if it's missing. It reads content at migration time on purpose: the intent is "reset to the new folio".

### 2.5 UI mount points (W0, so later tasks don't share hot files)

- `Desk.svelte` is split into `screens/Desk.svelte` (the list, and the switch between list and folio; owned by U1) and a new `components/desk/Folio.svelte` stub (U1).
- `components/desk/Drawer.svelte` and `components/desk/TestChips.svelte` are stubs (U1).
- `GlyphSheet.svelte` mounts a stub `components/study/OwnerPage.svelte` with the prop `glyph` (U2).
- The shelf passes `mark` for draft Glyphs to its tile, which renders nothing yet (U2).
- `src/app/desk.ts`: `draftPalette` is renamed `trayPalette(d, page)` and returns `PaletteSlot[]` with counts. W0 writes it for real (a few lines over `trayCounts`).

---

## 3. Waves and tasks

| Wave | Task | Model | Size | Deps | Owns |
|---|---|---|---|---|---|
| 0 | **W0** contracts, placeholders, helper, mount points | Opus (orchestrator) | M | — | `src/data/types.ts`, `tuning.ts`, `src/data/drafts.ts`, `src/data/folios/*` (placeholders), `src/engine/types.ts`, `run.ts` (parse), `drafts.ts` (§2.2 parts), `tests/helpers/folio.ts`, `save.ts` (slot), the §2.5 mount points |
| 1 | **E1** folio engine and save v6 | Sonnet | M | W0 | `src/engine/drafts.ts`, `src/app/save.ts`, `tests/run/drafts.test.ts`, `tests/app/save.test.ts` (folio cases) |
| 1 | **C1** tutorial folios (The Lamplighter, Collection) | Sonnet | M | W0 | `src/data/folios/lamplighter.ts`, `collection.ts`, `tests/run/folios-shallow.test.ts` |
| 1 | **C2** deep and heart folios (Wet Work, Left Hand First, The Foundry Bell) | Opus | L | W0 | `src/data/folios/wet-work.ts`, `left-hand-first.ts`, `foundry-bell.ts`, `tests/run/folios-deep.test.ts` |
| 2 | **U1** the desk as folios | Sonnet | L | E1, C1, C2 | `src/app/desk.ts`, `desk.svelte.ts`, `screens/Desk.svelte`, `components/desk/*`, `tests/app/desk.test.ts`, `tests/fixtures/folios-save.json` |
| 2 | **U2** the owner's mark and lore on the sheet and shelf | Sonnet | S | E1 | `components/study/OwnerPage.svelte`, the Glyph tile component, `GlyphProfiler.svelte` (bronze at 0 / 10 only), `tests/app/owner-mark.test.ts` |
| 2 | **D1** the owner's voice | Haiku | S | C1, C2 merged | text fields only in `src/data/folios/*` |
| 3 | **W-final** verify, review, docs | Opus (orchestrator) | M | all | DESIGN §11, feature doc §0, TECH §7, ROADMAP |

C1 and C2 depend only on W0's real `folioRun`, `trayCounts` and helper, so they run in parallel with E1. U1 waits for the content so its fixture and screenshots use the real folios.

### Task acceptance

**E1**
- `trayCounts` gives the page runes plus the cumulative scraps; `trayIssue` names the first rune over its count.
- `editDraft` refuses an inside that breaks the tray and still allows stranded cells (it stays lenient).
- `folioRun` runs exactly tests 0..page and gives per-goal ticks.
- `turnPage` refuses while a test fails, on the last page and on a repaired copy, and it keeps the inside.
- `resetDraft` keeps `page`.
- `repairDraft`:
  - refuses before the last page, when a test fails, when the tray is broken and when the page has issues;
  - otherwise adds the Glyph with `draft` set and `glyphRecords[versionKey(g, 1)]` equal to `draftRecord()`;
  - `rewardsOf` gives it no extra exit or discount, `tierUps` doesn't report it as a trip tier-up, and `parseSaveData` accepts a best tier with an empty window.
- `reviseGlyph` on a draft Glyph keeps `draft` and starts v2 empty; reverting brings bronze back.
- Migration:
  - a v5 save with one unrepaired copy, one repaired copy and the repaired copy's Glyph migrates as §2.4 says;
  - an unrepaired copy whose old inside held collection runes comes back as the new start;
  - a round trip through serialize and parse works.
- The existing `nextDraft`, banking and offer tests keep passing, with banked copies now at `page: 0`.

**C1 and C2 (content).** For each folio, the test file holds `SOLUTIONS[id]`, one inside per page built from the start with `Tweak`s, and `TEMPTING[id]`, a list of `{ page, tweak, breaks }`.
- `checkFolio(def, SOLUTIONS[id])` returns `[]`.
- The old 2026-10-16 fix fails the last page (F15).
- C2 only: in each folio of 3 or more pages, at least one tempting fix passes its own page's new test but fails an earlier one (a designed-in regression), and the test asserts exactly that.
- C2 only: no single edit from `oneEditNeighbours(SOLUTIONS[id][k], trayCounts(d, k + 1))` passes tests 0..k+1 for any k ≥ 1, so later pages need at least two changes. If this check takes more than about 10 s, put it behind the same opt-in flag as the old calibration run and report the timing.
- Each decoy is plausible (related to fire, ink or flow), and the intended final shape passes without it.
- The report gives every final shape as lattice ASCII, its rune count, and any change to the §4 sketches with the reason.
- Content tasks write working placeholder text in the owner's voice; D1 polishes it.

**U1 (the desk).** Screenshots at 375×812 of each of these:
- the list, with one folio mid-way and one mended;
- folio page 1 failing;
- page 2 with test 1 marked "broke";
- all tests passing, with "Turn the page";
- the turned page with "+ scraps";
- the last page passing, with the reaction and copy-in;
- a mended folio showing its lore.

On a phone, the folio view reads top to bottom:
1. the cover note and the unlocked note fragments (the newest in full ink);
2. the test chips (`1 ✓ 2 ✗ 3 ○`);
3. the selected test's goal lines with ticks;
4. the board;
5. "The page" (`DraftPage`, marked from the selected test);
6. "The drawer": a chip per tray rune with its free count, new scraps tagged "new";
7. the actions: Edit, Run the tests, Turn the page or copy-in, Start over.

The editor palette is `trayPalette(def, copy.page)` with counts, so the existing `placeRune` refuses a placement the tray can't cover. `DeskStore` holds the last `FolioRun` keyed by the page contents (stale after an edit) and the previous run's pass flags (F6), and plays one test (F5).

`tests/app/desk.test.ts` covers `trayPalette` and the drawer view, `goalSentences` per test, `deskRows` with page labels, the "broke" diff, and which test plays. U1 runs `svelte-autofixer` on every changed component. The fixture save holds all five folios at mixed pages, one of them mended, plus its Glyph.

**U2 (mark and lore)**
- The quill mark shows on draft Glyph tiles in the shelf's "Fair copies" tab, with an aria label ending ", in the owner's hand".
- The Glyph sheet header shows "in the owner's hand · The Lamplighter".
- `OwnerPage` is a folded section, "The owner's page", showing the lore (`draftById(glyph.draft).lore`). It is hidden for Glyphs without `draft`.
- The profiler shows "Reliability ● bronze" with "0 / 10" for a freshly mended Glyph.
- Screenshots of the shelf and the sheet at 375×812; `svelte-autofixer` clean.

**D1 (the owner's voice)**
- D1 writes, for all five folios, the cover `note`, each page's `note` and `hint`, the `reaction` and the `lore`, in the owner's voice: terse, wry and handwritten, like the existing reactions and `RUNE_NOTES`.
- Page notes are fragments that read as one note in order.
- Hints describe an effect and never name the rune to place.
- Lore is one page per folio, 3 to 6 sentences. Together the five pages build the mystery seed (the owner was expelled from a guild; the Lamplighters exist in the canals) without solving it, and The Foundry Bell's page comes closest.
- D1 never touches insides, boards, aims, goals, scraps or decoys. The C tests guard them, and `pnpm check` stays green.

**W-final**
- The `verify` skill on merged `main`:
  - bank a draft (with the dev save helper or the fixture);
  - work a deep folio through a regression to a turned page;
  - finish a folio and see the bronze Glyph with its mark and lore;
  - check that an old v5 save migrates and loads.
- `code-review` on the feature diff.
- Docs: DESIGN §11, feature doc §0 (F1–F19 marked *Proposal*), TECH §7 (save v6, the folio helper), ROADMAP (BL-14 done, plus follow-ups).

---

## 4. The five folios (content sketches for C1 and C2)

These are **drafts that the tests must prove**. C1 and C2 may change any board, scrap or shape the engine disagrees with. The page counts, names, story order, F13 and F14 are fixed.

Notation: lattice ASCII, entry first, flow entering rightward. Boards use `D` for the Draughtsman, `d` a dummy, `r` a rat, `b` a sentry, `o` oil and `#` brass. "Tray" means the page runes plus the drawer.

### 1 · The Lamplighter (shallow · Spell · 2 pages · no decoys)
- **Start:** today's page, `Bolt> Bend^ / . Spark`, with the Bend pointing the wrong way.
- **Page 1** (note: strike a light where it stands in the oil). Scraps: Oil ×1. Test: a dummy standing in oil; goal `ignite`, `hurt ≥ 3`. Intent: turn the Bend. The Oil is a gift you don't need yet.
- **Page 2** (note: and if the street is dry, bring your own). Scraps: Amplify ×1. Test: a dry board, the dummy farther away with more hp; goal `ignite`, `hurt ≥ 4`. Intent: the Oil goes in the chain *before* the Spark, with the Amp touching the Spark.
- **Tempting fix:** Oil after the Spark. Nothing lights, which teaches order.
- **Final shape (about 5 runes):** `Bolt> Bendv / . Oil / . Spark`, with the Amp beside the Spark.

### 2 · Collection (shallow · Spell · 2 pages · no decoys)
- **Start:** today's page, `Bolt> OnInked Ink Spark` (the gate comes before the mark).
- **Page 1** (note: mark it and cash it in). Scraps: Pierce ×1. Test: one dummy; goal `detonate`. Intent: swap Ink and On Inked.
- **Page 2** (note: every one of them, mind). Scraps: Amplify ×1. Test: two dummies in a row; goal `detonate ≥ 2`, `hurt dummy-2 ≥ N`. Intent: Pierce *before* the Ink, so both units are marked and cashed, with the Amp on the Spark.
- **Check:** whether Pierce still passes test 1 with a single unit. If it doesn't, that is a free regression lesson; keep it if it reads fairly.
- **Final shape (about 6 runes):** `Bolt> Pierce Ink OnInked Spark`, plus the Amp.

### 3 · Wet Work (deep · Payload in `Bolt> G:draft>` · 3 pages · no decoys)
- **Start:** today's page, the Ink/Fork/Oil cluster with the Spark stranded.
- **Page 1** (note: mark, soak, light). Scraps: Bend ×1. Test: today's, `ignite` and `detonate`. Intent: bring the Spark into the flow. The Bend is one way; moving the Spark is another.
- **Page 2** (note: one hand each, nobody else gets wet). Scraps: On Inked ×1. Test: the target with a second unit beside it; goal `detonate`, `spared dummy-2`. Intent: gate the lighting branch, so the fire and damage land only on a marked target.
- **Page 3** (note: if it is already burning, finish it). Scraps: On Ignite ×1, Amplify ×1. Test: the target beside an oil pool, not on it; goal `tile X has fire`, `hurt ≥ N`, still `spared dummy-2`. Intent: the follow-up lands on the new fire, through On Ignite.
- **Regression to design in:** page 3's natural fix, an Amp beside the Fork, also boosts the branch that hits dummy-2 and breaks test 2.
- **Final shape (about 8–9 runes):** Ink and Oil on one side of the Fork; On Inked, On Ignite and Spark on the other; the Amp placed carefully.

### 4 · Left Hand First (deep · Spell · 3 pages · 1 decoy)
- **Start:** today's page: a Fork with the Spark on the left (it resolves first) and the Oil on the right.
- **Page 1** (note: oil and the light together). Scraps: Ink ×1. Test: today's, `ignite` and `hurt ≥ 3`. Intent: swap the Spark and the Oil.
- **Page 2** (note: and the mark, so it pays twice). Scraps: Bend ×1, On Inked ×1. Test: a dry board; goal `ignite`, `detonate`. Intent: the left branch carries Oil and Ink, the right branch goes through On Inked to the Spark, and the Bend makes room.
- **Page 3** (note: the big ones too). Scraps: Amplify ×1 and **Steam ×1 (the decoy)**: Steam "carries sparks" but puts the fire out. Test: a high-hp target and a second unit; goal `hurt ≥ 6`, `ignite`, `spared`.
- **Regression to design in:** an Amp touching the Fork's left branch changes what page 2 relies on.
- **Final shape (about 8–9 runes):** a Fork with a 2-rune left arm and a 2–3-rune right arm, plus the Amp. The Steam stays in the drawer.

### 5 · The Foundry Bell (heart · Spell · 4 pages · 2 decoys)
- **Start:** today's page, `Splash> Ink OnKill Bend^ / Spark`, with the Amp misplaced.
- **Page 1** (note: ring it once). Scraps: Amplify ×1. Test: two rats; goal both `dies`. Intent: move the Amp so it touches the Splash.
- **Page 2** (note: every one that drops passes it on). Scraps: Bend ×1. Test: today's, rats plus a sentry; goal `detonate`. Intent: turn the Bend down; the second Bend lets the reroute fit.
- **Page 3** (note: even the ones at the back). Scraps: Smear ×1 and **Brand ×1 (a decoy)**, which looks fire-related but there is no fire. Test: a third rat outside the 3×3; goal `dies rat-3`. Intent: Smear passes the mark, so On Kill's repeat detonates the far rat.
- **Page 4** (note: the whole foundry hears). Scraps: Etch ×1 and **Echo ×1 (a decoy)**, idle because the test is a single cast. Test: a board with a brass line (`#`) to a far rat and a sentry; goal `dies rat-4`, plus `spared` on a unit off the network. Intent: replace a rune with Etch, or add one, so the Spark conducting through etched brass sets off the inked units on and beside the line.
- **Regression to design in:** the Etch swap breaks page 1's kill threshold unless the Amps are rearranged.
- **Final shape (about 10–12 runes, two Amps):** `Splash> Etch Smear OnKill Bendv … Spark`, or a variant.

---

## 5. Shared-file hotspots

- **W0 only:** `src/engine/types.ts`, `src/data/types.ts`, `tuning.ts`, `run.ts`, `src/data/drafts.ts`, `GlyphSheet.svelte` and the shelf. If a later task finds a contract wrong, it reports it, and the orchestrator changes the contract and rebases the waiting tasks.
- **`src/data/folios/*`:** C1 and C2 own disjoint files. D1 edits text fields only, after both have merged.
- **`src/engine/drafts.ts`:** W0 writes §2.2's real parts first; after that, E1 is the only owner.
- **`tests/helpers/folio.ts`:** W0 owns it. A content task that needs another helper adds it in its own test file and reports it.

## 6. Risks to watch

- **The puzzles might not hold in the engine.** C2 is the long pole. If a sketch's mechanic doesn't behave, C2 redesigns it within F13 and F14 rather than adding rules. That's why it is L on Opus, and a report that changes the sketches is acceptable.
- **Search cost.** One-edit neighbours × up to 4 tests × 3 folios could slow `pnpm check`. Keep it within 10 s, or make it opt-in as C2's acceptance says.
- **Unintended easy solutions.** The tray limits the search space, but a rune already on the page can be reused in surprising ways. The one-edit check catches the cheapest shortcuts; the orchestrator also tries each folio by hand during W-final.
- **Fitting on a phone.** Four tests, the board, the page and the drawer make a long scroll. Keep the board and test chips near the top, and fold old note fragments behind "earlier notes" if needed.
- **The migration needs content.** It reads `draftInside` at migration time, which works because the folio ids are stable. Keep the five ids.
