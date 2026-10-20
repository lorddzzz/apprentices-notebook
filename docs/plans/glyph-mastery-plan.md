# Glyph mastery (stages C, D, G): implementation plan

Design: [research-and-mastery.md](../design/research-and-mastery.md) §0 (both tables; the second, of 2026-10-16, decides this build), §4.5, §4.7–§4.9, §5.2, §7 "Glyph sheet / Profiler", §9. Roadmap: BL-10, BL-11, BL-14. Where this plan and the design disagree, the design wins and the orchestrator asks. Project rules: [AGENTS.md](../../AGENTS.md). Run with the `implement` skill.

**Scope**

| # | Item | Task |
|---|---|---|
| C1 | Harm attribution per Glyph (Spell and Payload), per-version records | W0, E1 |
| C2 | Economy and Reliability tiers, best-ever, current form | E1, C0 |
| C3 | Rewards: −1 ink per Economy tier, extra exit (Reliability silver), second parameter (gold) | E1, E3, U4 |
| C4 | Profiler on the Glyph sheet: stats, dead cells, plain-language suggestion, versions | U1 |
| C5 | "Your Glyphs, ranked" | U2 |
| C6 | Revisions: edit the inside at home, new version, free revert | E2, U3 |
| C7 | Plain spells: last-trip profile (casts, harm, cells that never fired) on the trip page and recipe | E5, U6 |
| D1 | Glyph parameters: open cells, family constraint, args at placement, "( )" on the shelf | E3, U4 |
| G1 | The owner's drafts: loot, desk test, repair, reaction | E4, U5, D1 |

**Not in this plan:** footnotes (E), Crystallise and tier-2 recipes (F), Glyph nesting (depth limit 2), a codex section for drafts, districts, audio.

---

## 0. Team and models

Same setup as the [seam deepening plan](seam-deepening-plan.md) §0: an **Opus** orchestrator (W0 contracts, merges, docs, final verification), **Sonnet** implementers, **Haiku** clerks. Tasks run in worktrees with explicit file ownership. A task that fails review twice moves up one model.

UI agents use the preview ports `dev-alt` (5190), `dev-alt2` (5191) and `dev-alt3` (5192), one agent per port; the orchestrator assigns the port in the spawn prompt and keeps `dev` (5173). To see Glyphs with records, UI agents load the fixture save W0 writes (`tests/fixtures/glyph-mastery-save.json`) into localStorage via `javascript_exec`, then reload.

Subagents never edit `DESIGN.md`, `TECH.md` or `docs/design/*`. Every rule they invent goes under **Proposals** in their report.

---

## 1. Rules this plan settles (*Proposals*, log in DESIGN §11 and the feature doc §0 when built)

The 2026-10-16 round fixed the direction. These are the defaults to build; the player judges them by playing.

**Attribution and records**

| # | Topic | Default | Why |
|---|---|---|---|
| M1 | Harm | Σ `damage.amount` dealt to enemies + `TUNING.killHarm` (1) per enemy death. Same numbers as the trip ledger (amount before shield, overkill included) | One plain number, the same everywhere |
| M2 | Per-node attribution | The `trace` event gains `spans`: each node owns the log stretch of **its own effect** (source: `resolveSource`; material: its `apply…` call; trigger: its `trigger` events), never its children's. Reactions that finish inside a rune (ignite → fire damage, detonate, conduct) belong to it | Casts already resolve depth-first and sequentially, so log indices split cleanly |
| M3 | A Spell Glyph's cast | Every non-echo cast of its spell. Credited with the source span and its inner nodes' spans. Runes wired after its exit are the host page's work, not the Glyph's | The record measures the pattern, not its neighbours |
| M4 | A Payload Glyph's cast | A non-echo cast in which **≥ 1 of its inner nodes ran**: one sample per socket per cast, harm summed over every run (On Kill can run it once per victim). The host's source damage is not its own. If a gate before it fails, there's no sample | A payload that never got the chance isn't unreliable |
| M5 | Echoes and later damage | Not counted: echoes add no sample and no harm; burn-step fire, scald and heat damage in later rounds are not attributed | Fire from several casts merges, and outer Echo would inflate a Glyph for an aura it doesn't hold |
| M6 | Meaningful (Reliability) | ≥ 1 event from the proof set (`MEANINGFUL` in cast.ts) **inside the Glyph's own spans** | Setup Glyphs still score; a payload riding on its host's hit doesn't |
| M7 | When records update | At battle end, in the **same replay** that writes proof (`recordTripCasts`, win or wipe). Trip battles only: never Lab, Bench or desk tests. The replay uses the profile as at battle start; records are written after it | One replay, deterministic, survives a wipe like proof |
| M8 | Record shape | Per `id@version`: lifetime `casts`, `harm`, `meaningful`; `recent` (newest last, ≤ 10 samples of `{harm, cost, meaningful}`); `best` tiers (never drop); `fired` count per local cell (shape cells walked, and auras when a cell they touch fired) | Enough for tiers, form, dead cells and the ranked list; small in the save |
| M9 | Economy | Σ harm ÷ Σ cost over the window. A sample's cost = **base cost** (before the tier discount) + 1 per outer aura at that socket in that cast | Base cost avoids feedback (a discount must not raise its own score); outer Amplify adds harm, so its ink counts |
| M10 | Minimum casts | A tier needs a full window of `TUNING.tierWindow` = 10 casts. The tier is the best window ever reached; the sheet also shows current form (the last window, or "n / 10") | The decision says "the last 10 casts"; fewer would reward luck |
| M11 | Thresholds | Reliability 70 / 85 / 95 % (7, 9, 10 of 10). Economy: placeholders 0.8 / 1.2 / 1.8, replaced by task **C0**, which measures 10-cast windows of harm ÷ base ink in the sim and sets bronze / silver / gold ≈ p50 / p75 / p90, rounded to 0.1 | The draft numbers were for a different score |
| M12 | Rewards in the field | Rewards read the best tiers when needed. The ink discount applies at once, but ink only matters while editing (desk or doorway). The extra exit and a second parameter need a choice at the desk. So nothing changes in a fight. In a doorway the Glyph sheet is read-only | No mid-trip surprises, no extra state |
| M13 | Dead cells and suggestions | A local cell with 0 fires after ≥ `TUNING.deadAfterCasts` = 5 casts of that version. Suggestions, in order: a dead cell ("The Bend on row 2 never fired in 12 casts. Lifting it saves 1 ink", with the saving from `baseGlyphCost` without the cell, or "saves no ink, frees a Bend"); a trigger that ran but never opened; "4 of the last 10 casts did nothing". One line at a time | The profiler teaches; one sentence is readable on a phone |
| M14 | Ranked list | Current versions: best Economy, then best Reliability, then current Economy value. Glyphs under 10 casts are listed below, with "n / 10 casts to a tier" | Competition with your past self |
| M15 | Plain spells (last trip) | `SpellTally` gains `cells` (the spell's path cells when fought, a Glyph socket as one cell) and `fired` (union of trace cells). Dead cells show on the trip page row, as a faint ring on the Study page and as one line under the recipe, **only while the spell's current path still equals `cells`** | The decision says last trip only; a rewire makes it stale |
| M16 | Trip page | `TripStats.elegance` lists tier-ups (Glyph, version, metric, tier) in order; the page shows them as highlights ("Cashing In v2 reached silver Reliability. Pick its extra exit at the desk") | The moment a tier lands should be seen |

**Versions and revisions**

| # | Topic | Default | Why |
|---|---|---|---|
| M17 | Versioning | `GlyphDef.version` (1 on compile). The current version stays in `Profile.glyphs` (compile code is unchanged); older ones live in `Profile.glyphArchive`; records in `Profile.glyphRecords[id@v]`. `PlacedGlyph` keeps the id, which always means the current version. Saving a revision makes version max + 1 with a fresh record; revert swaps the current version with an archived one, and both keep their records. Versions are kept forever | Stable ids, no lattice rewrite, low churn |
| M18 | Editor bounds | The canvas is the bounding box of the inside plus a ring of 1, capped at 7 × 7. The entry is pinned at local (0,0) with flow entering rightward. Kind can't change: a Spell Glyph's entry is a Source with its arrow fixed right, and the only Source; a Payload's entry is a non-Source, non-Aura rune. 3–8 flow cells (auras don't count). Every flow cell must be reached by the static inner walk, and every aura must touch a reached cell. Arrow runes need arrows. Exits and idiom are recomputed | Same limits as a Fair Copy; a stranded rune is the bug the profiler teaches |
| M19 | When and what | Desk only (never in a doorway). One **Save** = one new version, not each tap. The palette is any rune owned ≥ 1 (≥ the count the inside uses). If the new inside overuses runes or ink on a page that holds it, the usual page issue shows and blocks leaving, and the editor warns "pushes the Stoker's page 1 ink over" before saving | Revisions are free; ownership stays the page's job |
| M20 | Settings vs inside | Open cells and the extra exit are **settings** of the current version: changing them is free and makes no version and no reset. On revise, settings carry over while still valid; a second open cell is dropped (the new record has no gold); the extra exit is kept but inactive until the new version earns silver | Otherwise opening a gold-earned second parameter would wipe the gold that earned it |

**Parameters (D)**

| # | Topic | Default | Why |
|---|---|---|---|
| M21 | Representation | `GlyphDef.params`: local cell keys. A slot's family is its default rune's family (Material, Trigger or Shape; never Source or Aura). The default rune stays in `cells`. `PlacedGlyph.args`: `{ [localCellKey]: { rune, dir? } }`; a missing arg means the default. An arrow arg starts at the default's arrow (or right) and turns in the picker | Keyed args survive slot changes; defaults keep a fresh Fair Copy identical |
| M22 | How many, where set | The Fair Copy sheet may mark **one** cell open (tap it: "( )"). The Glyph sheet can change open cells anytime. Allowance: 1, or 2 at Reliability gold | Design §4.3 step 3, plus the gold reward |
| M23 | Ownership and ink | An arg counts as the inner rune in place of the default (ownership, `canPlaceGlyph`, loadout). Ink includes the arg rune, which costs the same as the default because ink is per family; the sheet says so | The decision ("ink includes the parameter rune") holds by construction |
| M24 | Stats | One record per version whatever the args; fired counts by local cell | The function is the Glyph; args are inputs |
| M25 | Placement | Placing a Glyph with open cells opens the arg picker, pre-filled with the defaults (or the first owned rune of the family if the default is used up). Tapping a placed Glyph's card → "Arguments" reopens it | Filled at placement, from the collection |

**Extra exit (Reliability silver)**

| # | Topic | Default | Why |
|---|---|---|---|
| M26 | Representation | `GlyphDef.extraExit: Dir \| null`, a **local** side: up, right or down, never left (the way in) and not a side an exit already uses. Picked on the Glyph sheet, changeable free, active only while best Reliability ≥ silver | Decision: the player picks the side |
| M27 | Expansion | At the inner frame's **first** `beyond` call in walk order (the end of its first branch), the walk continues out of the socket in the exit's own direction, **then** out of the extra side (rotated by the Glyph's dir), main branch first like Fork's left. If the main branch already took those cells, the extra side adds nothing. A Glyph whose branches all end on insulators never fires it (the sheet says "no way out to share") | "Acts like a built-in Fork" with one readable rule |
| M28 | Identity, extended | (a) params: `events(Glyph with args) == events(flat lattice with the args stamped into the cluster)` over the fuzz's proven clusters; (b) extra exit: `extraExit = null` is unchanged; if the outer cell on the extra side is empty, a hole or an insulator, events equal those without it; reached cells with ⊇ without; plus scenario tests by event log | No flat twin exists for (b); these pin it down |

**The owner's drafts (G)**

| # | Topic | Default | Why |
|---|---|---|---|
| M29 | Data | `src/data/drafts.ts`: `DraftDef { id, order, depth, name, kind, inside (ASCII, the owner's broken page), entry (label), host?, note, test, reaction }`. Fixes live in the tests only | Data stays declarative; no answers in the content file |
| M30 | Loot | A `draft` entry, weight 1, in each of the shallow, deep and heart tables. It resolves to the **next draft in story order** that isn't owned, whose depth is ≤ the table's (shallow < deep < heart), and only once the profile owns ≥ 1 Glyph. At most one draft per trip (none if `trip.loot` already holds one). A wiped draft goes back in the queue | One at a time, in a fixed story; drafts follow compiling |
| M31 | Test stage | A Lab-mode battle from `test.board` (notation; caster `D`), the draft compiled as the Draughtsman (like the Bench). A Spell draft is his only spell; a Payload draft sits in `host` (e.g. `Bolt> G:draft>`). One cast at `test.aim`, then optionally `endTurn` with every enemy idle (`test.endRound`). Then the goal is checked | A small, fixed, readable stage that reuses the Bench idea |
| M32 | Goal DSL | `{all}` · `{happens: event, atLeast?}` · `{hurt: unitId, atLeast}` · `{dies: unitId}` · `{spared: unitId}` · `{tile: label, has: fire\|oil\|ink\|steam\|plate}`, checked on the log and the final state. The desk lists each goal as a plain line with a tick | Enough for every bug type; each line is easy to read |
| M33 | Repair | Passing on a valid inside (M18) marks the draft repaired and adds a Glyph v1 (`draft: id`, unproven, named after the draft) and shows the reaction. Its idiom is recorded but doesn't use up the free first compile | "A Glyph you didn't have to prove" |
| M34 | Editing a draft | The revision editor on a working copy kept in `Profile.drafts` ("Start over" restores the owner's page). `insideIssues` marks each issue `blocking` or not: a stranded cell or a lone aura is **not** blocking for a draft's test (it shows as "never reached", and the owner's page must be runnable to fail), but it blocks `repairDraft` and a revision's Save. Every draft is fixable with the runes on its own page; the palette also offers owned runes; ownership never blocks a test | Repair is reasoning, not shopping |
| M35 | Difficulty | One bug in shallow and deep drafts, two in heart drafts (decided). Bug kinds across the set: a wrong-way Bend, a gate before its cause, a rune off the flow, Fork's left-first habit, a misplaced aura | Each teaches a profiler cue |
| M36 | Where | A new route `#/desk` (closed on a trip, like the Bench), reached from the Study scene ("Drafts · 2"). Repaired drafts stay listed there with note and reaction; there's no codex section this build | One place where the lore is earned |

**Save**

| # | Topic | Default | Why |
|---|---|---|---|
| M37 | Save v4 | Migration 3 → 4: each `profile.glyphs[i]` gains `version: 1, params: [], extraExit: null`; the profile gains `glyphArchive: []`, `glyphRecords: {}` (a missing record reads as empty) and `drafts: []`; every `SpellTally` (live trip and `lastTrip`) gains `cells: [], fired: []`; `TripStats` gains `elegance: []`. `PlacedGlyph.args` is optional; `LootItem` `draft` is new | One migration, all additive |

---

## 2. Contracts (Wave 0, orchestrator)

`src/data/types.ts` and `src/data/tuning.ts`
- `Tuning` gains `killHarm: 1`, `tierWindow: 10`, `economyTiers: [0.8, 1.2, 1.8]`, `reliabilityTiers: [0.7, 0.85, 0.95]`, `deadAfterCasts: 5`, `paramSlots: 1`, `paramSlotsGold: 2`, `revisionCanvasMax: 7`.
- `LootSpec` gains `{ kind: 'draft' }`. `DraftId = string`. `DraftDef`, `DraftAim` (`{dir} | {tile: label} | {ally: MemberId}`), `DraftGoal` (M32; `happens` takes a `DraftEventType` union: ignite, detonate, conduct, arc, extinguish, slide, smear, heated, stained, pierced). `src/data/drafts.ts` holds `DRAFTS: readonly DraftDef[]` with one stub draft, and `src/data/elegance.ts` holds tier names and suggestion templates (placeholders).

`src/engine/types.ts`
```ts
export type TierLevel = 0 | 1 | 2 | 3; // none, bronze, silver, gold
export interface CastSample { harm: number; cost: number; meaningful: boolean }
export interface GlyphRecord {
  casts: number; harm: number; meaningful: number;          // lifetime
  recent: readonly CastSample[];                            // newest last, ≤ tierWindow
  best: { economy: TierLevel; reliability: TierLevel };     // never drops
  fired: Readonly<Record<CellKey, number>>;                 // local cell → casts it fired in
}
export interface GlyphArg { rune: RuneId; dir?: Dir }
// PlacedGlyph gains:  args?: Readonly<Record<CellKey, GlyphArg>>   (local cell key)
// GlyphDef gains:     version: number; params: readonly CellKey[]; extraExit: Dir | null;
//                     draft?: DraftId;  discount?: number   (effective view only, never saved)
export type GlyphInside = Pick<GlyphDef, 'kind' | 'cells' | 'entry'>;
export interface DraftCopy { id: DraftId; inside: GlyphInside; repaired: boolean }
// Profile gains: glyphArchive: GlyphDef[]; glyphRecords: Record<string, GlyphRecord>; drafts: DraftCopy[]
// LootItem gains: { kind: 'draft'; draft: DraftId }
// SpellTally gains: cells: CellKey[]; fired: CellKey[]     TripStats gains: elegance: TierUp[]
export interface TierUp { glyph: GlyphId; name: string; version: number; metric: 'economy' | 'reliability'; tier: TierLevel }
// SpellNode (both kinds) gains: viaInner?: readonly Coord[]  (local shape cells walked inside the same Glyph)
// LatticeIssue.kind gains 'arg'
```

`src/engine/events.ts`: the `trace` event gains `spans: NodeSpan[]` with `NodeSpan = { at: Coord; inner?: Coord; glyph?: GlyphId; viaInner?: Coord[]; from: number; to: number }`. `from` and `to` are offsets into the log from the cast's first effect event. W0 emits `spans: []`.

Stubs with final signatures (each returns a neutral value so `pnpm check` stays green):
- `src/engine/profiler.ts` (E1): `versionKey(id, v)`, `emptyRecord()`, `recordOf(p, id, v)`, `glyphSamples(events, p)`, `foldRecord(r, sample, fired)`, `windowTiers(recent)`, `economyOf(recent)`, `reliabilityOf(recent)`, `rewardsOf(record) → { discount; extraExit: boolean; params: number }`, `recordGlyphCasts(p, events)`, `tierUps(before, after)`, `deadCells(def, record)`, `innerFired(events, glyph)`.
- `src/engine/revision.ts` (E2): `insideOf(def)`, `revisionCanvas(inside)`, `insideIssues(inside) → InsideIssue[]`, `innerMeta(inside) → { exits; idiom }`, `reviseGlyph(p, id, inside)`, `revertGlyph(p, id, version)`, `glyphVersions(p, id)`, `setOpenCells(p, id, cells)`, `setExtraExit(p, id, dir | null)`, `extraExitSides(def)`.
- `src/engine/glyph.ts` (E3): `baseGlyphCost(def)`, `glyphRunes(def, args?)`, `withOpenCell(def, local | null)`. `glyphCost` subtracts `def.discount ?? 0` (min 1).
- `src/engine/drafts.ts` (E4): `draftInside(d)`, `draftTest(d, inside) → DraftRun { events; state; passed; goals: { goal; met }[] }`, `checkGoal(goal, events, state)`, `nextDraft(p, t, table)`, `bankDrafts(p, loot)`, `repairDraft(p, id)`, `editDraft(p, id, inside)`, `resetDraft(p, id)`.
- `src/engine/run.ts` (W0 only, nothing after): `glyphLibrary(p)` takes `Pick<Profile, 'glyphs' | 'glyphRecords'>` and returns the **effective** view (`discount`, `extraExit` only when active, `params` cut to the allowance, all via `rewardsOf`). `runesIn` and `canPlaceGlyph` go through `glyphRunes(def, args)`; `copyRune` copies `args`. `recordTripCasts(p, t)` does one replay → `recordProof` + `recordGlyphCasts` (`recordTripProof` stays as an alias). `closeBattle(p, t, b, log)` = `recordTripCasts` → `finishEncounter` → `stats.elegance += tierUps(...)`. `finishEncounter` passes each member's compiled spells to `accumulateStats`; `rollOffers` takes `draft: DraftId | null` from `nextDraft`. `returnHome` calls `bankDrafts`. `compileGlyph(p, m, cluster, name, open: Coord | null = null)` calls `withOpenCell`. The `parseProfile` / `parseSaveData` validators cover v4.
- `src/engine/lattice.ts`: populate `viaInner` in `walkIn` (inner frames only). The identity tests stay green.
- `src/app/save.ts`: `CURRENT_VERSION = 4`, migration 3 → 4 (M37) and its tests in `tests/app/save.test.ts`. `src/app/flow.ts`: `endBattle` calls `closeBattle`; the `desk` screen. `src/app/routes.ts`: route `desk`. `src/app/study.ts`: `GlyphSlot` gains `tiers` and `open: number`.
- **UI mount points** (so no later task edits these hot files): `Study.svelte` mounts `<GlyphRanking>`, `<RevisionEditor>` and `<ArgPicker>` stubs with their props and open state. `GlyphSheet.svelte` gets `onrevise`, mounts `<GlyphSettings>` and `<GlyphProfiler>` stubs. `RuneShelf.svelte` gets `onranking`. `LatticeEditor.svelte` gets `onargs(at)` and passes `deadCells` to `LatticeGrid.svelte`. `App.svelte` routes `desk` to a stub `screens/Desk.svelte`.
- Test fixtures: update the ~11 `GlyphDef` literals in tests to the new required fields. `tests/fixtures/glyph-mastery-save.json`: a v4 save with 3 Glyphs (one gold / silver with an archived v1, one parametrised, one under 10 casts with a dead cell), a last trip with a dead plain-spell cell, and two drafts (one repaired).

Commit `chore: glyph mastery contracts (W0)`, then push. **W0: Opus, L, ~15 %.**

---

## 3. Waves and tasks

Usage estimates are % of the 5-hour window (S ≈ 3, M ≈ 8, L ≈ 15, as logged in earlier builds). The whole plan is about 155 %: plan on two windows, with the break after Wave 2.

| Wave | Task | Model | Size · usage | Owns | Depends on |
|---|---|---|---|---|---|
| 1 | **E1** Attribution and records | Sonnet | L · 15 | `src/engine/cast.ts`, `src/engine/profiler.ts`; `tests/engine/profiler.test.ts`, `tests/scenarios/profiler.test.ts` | W0 |
| 1 | **E2** Versions and revisions | Sonnet | M · 8 | `src/engine/revision.ts`; `tests/run/revision.test.ts` | W0 |
| 1 | **E3** Parameters and the extra exit in the compiler | Sonnet | L · 15 | `src/engine/lattice.ts`, `src/engine/glyph.ts`, `src/engine/notation.ts`; `tests/engine/glyph.test.ts`, `tests/scenarios/glyph-identity.test.ts`, `tests/scenarios/params-and-exits.test.ts` | W0 |
| 1 | **E4** Drafts engine | Sonnet | M · 8 | `src/engine/drafts.ts`, `src/data/drafts.ts` (insides, boards, goals; text stays placeholder), `src/data/loot.ts`; `tests/run/drafts.test.ts` | W0 |
| 1 | **E5** Plain-spell last-trip cells | Haiku | S · 3 | `src/engine/tripStats.ts`; `tests/run/tripStats.test.ts` | W0 |
| 2 | **C0** Economy calibration | Sonnet | S · 4 | `tests/sim/calibrate.test.ts` (skipped unless `CALIBRATE=1`), `economyTiers` in `src/data/tuning.ts` | E1 |
| 2 | **U1** Profiler on the Glyph sheet | Sonnet | M · 8 | `study/GlyphSheet.svelte`, `study/GlyphProfiler.svelte`, `src/app/profiler.ts`; `tests/app/profiler.test.ts` | E1, E2 |
| 2 | **U2** Ranked list and shelf badges | Haiku | S · 3 | `study/GlyphRanking.svelte`, `lattice/RuneShelf.svelte`, `src/app/ranking.ts`; `tests/app/ranking.test.ts` | E1 |
| 2 | **U3** Revision editor | Sonnet | L · 15 | `study/RevisionEditor.svelte`, `src/app/revision.ts`; `tests/app/revision.test.ts` | E2 |
| 2 | **U6** Trip-facing views | Sonnet | M · 8 | `screens/TripPage.svelte`, `lattice/SpellList.svelte`, `lattice/LatticeGrid.svelte`, `trip/OfferCard.svelte`, `trip/LootChips.svelte` | E1, E4, E5 |
| 3 | **U4** Parameters and extra exit UI | Sonnet | L · 15 | `study/GlyphSettings.svelte`, `lattice/ArgPicker.svelte`, `lattice/LatticeEditor.svelte`, `study/FairCopySheet.svelte`, `src/app/study.ts`, `src/app/faircopy.ts`; `tests/app/study.test.ts`, `tests/app/faircopy.test.ts` | E2, E3 |
| 3 | **U5** The draft desk | Sonnet | L · 15 | `screens/Desk.svelte`, `components/desk/*`, `src/app/desk.ts`, `src/app/desk.svelte.ts`, `study/StudyScene.svelte`; `tests/app/desk.test.ts` | E4, U3 |
| 3 | **D1** Drafts and profiler text | Haiku | S · 3 | text fields of `src/data/drafts.ts`, `src/data/elegance.ts` | E4 |
| 3 | **F1** Fuzz | Sonnet | M · 8 | `tests/sim/fuzz.test.ts` | E1, E2, E3 |
| 4 | **W4** Wrap-up | Opus (+ Haiku QA) | M · 11 | docs, status file, fixes | all |

Start order inside the budget: E1 and E3 first (critical path, large), then E2 and E4, then E5. In Wave 2, U3 first (U5 needs it), then U1, U6, C0 and U2.

**Acceptance (every task):** `pnpm check` green; new rules covered by tests that assert on the event log (scenario tests per the `scenario` skill for any rule change); no file edited outside the task's ownership; Proposals in the report. **UI tasks additionally:** Svelte 5 runes only, `svelte-autofixer` clean on every new or changed component, and the `verify` skill at 375 × 812 on the assigned dev-alt port, with screenshots (light, and dark where colours changed) and no horizontal scroll.

### Task checks

- **E1:** spans are emitted for every node, sourced from `resolveSource`, each `apply…` call and each `trigger` emission, without changing any other event (the existing scenario logs are byte-identical apart from `trace`). Scenario tests, by event log: a Spell Glyph `Bolt ▸ Ink ▸ OnInked ▸ Spark` gets credit for the bolt's damage and the detonation; the same cluster as a Payload Glyph behind a plain Bolt is **not** credited with the bolt's 2; an On Kill payload that runs for two victims is one sample with both runs' harm; a gate that fails before a payload gives no sample; echoes give no sample; burn-step damage next round isn't counted; two sockets of the same Glyph in one cast give two samples; an outer Amplify adds 1 to that sample's cost. Records: the tier only after 10 casts, never drops, best-ever window; `fired` counts inner shape cells (`viaInner`) and auras; `deadCells` after 5 casts; `rewardsOf` (discount 0–3, extra exit at silver, 2 params at gold); `tierUps`; records are written in `recordTripCasts` only (a Lab battle and a Bench trial leave `glyphRecords` unchanged).
- **E2:** M17–M20. `reviseGlyph` makes v + 1 with an empty record and archives the old version with its record; revert brings the old record back; versions keep their numbers; every `insideIssues` rule has a test (pinned entry, kind, one Source, 3–8, stranded cell, a lone aura, arrows, canvas); settings carry over or drop as M20 says; `setExtraExit` refuses below silver and on taken sides; `setOpenCells` refuses Source and Aura cells and more than the allowance. Identity: a revised inside behaves exactly like the same cells stamped flat on a roomy lattice (a helper in its own test file).
- **E3:** args replace default cells in `innerFrame`; `glyphRunes` and ownership use args; `glyphCost` applies `discount`, while `baseGlyphCost` doesn't; `validateLattice` flags a wrong-family or unknown-slot arg (`'arg'`); notation reads and writes `G:g1>[1,0:Smear]`. M27 by event log: a Spell Glyph with the extra exit up into Oil ▸ Spark; the extra side into an empty socket changes nothing; main branch first. M28 (a) as a property over the identity fuzz's proven clusters with random same-family args, and (b) as fuzz invariants. A fresh Fair Copy with one open cell and no args is identical to before.
- **E4:** for each draft in the plan (§4): the owner's page **fails** its test, the fix (kept in the test file) **passes**, and for heart drafts each single fix alone still fails. `nextDraft`: the story order, the depth gate, the one-Glyph gate, one per trip, none when everything is owned; a wiped draft is offered again; `rollOffers` never puts two drafts in one offer; banking on return; `repairDraft` refuses a failing or invalid inside, adds the Glyph (with `draft` set) and leaves the free idiom compile unused. Every goal kind in M32 has a unit test.
- **E5:** `cells` and `fired` accumulate per spell across the trip's fights; a socket counts as one cell; a spell that never fired its Fork lists that cell in `cells` but not in `fired`.
- **C0:** plays ≥ 200 seeded bot trips with idiom Glyphs and random proven clusters compiled, collects 10-cast windows of harm ÷ base ink per Glyph, prints p25 / p50 / p75 / p90, and sets `economyTiers` to about p50 / p75 / p90 rounded to 0.1. The report carries the table (for TECH §7). The normal `pnpm check` doesn't run it.
- **U1:** the sheet header reads `Name v2 · Economy ◔ silver · Reliability ● gold`; then casts, average harm a cast, ink (base → with discount), current form; the inside view with dead cells faded, "( )" on open cells and the extra exit arrow; one suggestion line (M13); a Versions list with Revert and a confirm; a "Revise…" button (`onrevise`), hidden in a doorway. Rename still works. Screenshots: a gold Glyph, a fresh one at 3/10, and one with a dead cell.
- **U2:** a "Ranked" link on the Fair copies tab opens the list (M14), with one row per Glyph (name, version, tier marks, harm a cast, casts); tapping a row opens its Glyph sheet. Shelf tiles show tier marks and "( )" in the corner. It fits at 375 px with 8 Glyphs.
- **U3:** the editor is a full sheet: canvas (M18), a palette of owned runes with counts, tap to place, tap to turn, long-press to lift; the entry is locked; ink before → after; live `insideIssues` with the cell marked; Save is disabled while issues exist; the over-ink warning on pages (M19). It's a reusable component (props: inside, palette, issues, onsave) so U5 can mount it for drafts. Test the reducer in `src/app/revision.ts`.
- **U6:** the trip page shows the elegance highlights (M16) and a dead-cell note on each ledger row ("the Fork at C3 never fired"); `SpellList` shows one faint line per plain spell ("last trip: 6 casts, 9 harm · 1 cell never fired"); `LatticeGrid` draws a dashed ring on `deadCells`; offers and loot chips show a draft ("An owner's draft: The Lamplighter"). Stale data (M15) shows nothing.
- **U4:** the Fair Copy sheet's optional "Leave a cell open" (tap one cell, families per M21); on placement of a Glyph with open cells the arg picker opens pre-filled (M25); the Glyph card's "Arguments"; `GlyphSettings` on the sheet: open-cell toggles within the allowance, and the extra-exit side picker at silver (sides from `extraExitSides`), both read-only in a doorway. study.ts keeps the engine's word (`canPlaceGlyph` with args).
- **U5:** the Study scene shows "Drafts · n" once any draft is banked; `#/desk` lists drafts (torn-page look, note in handwriting); opening one shows the note, the goal lines, the test stage and "Edit" (U3's editor on the working copy) and "Run the test" (playback as on the Bench, fired cells lit and dead cells faded via `innerFired`), then the ticks; a pass shows the reaction and "Copy into my notebook" (`repairDraft`); "Start over". Screenshots: a failing run, a passing run with the reaction, the list with one repaired draft.
- **D1:** names, notes, reactions and the codex-style hint for each draft in §4 (the owner's voice: terse, wry, handwritten; see `RUNE_NOTES` and the torn-page lines), plus tier names and suggestion templates. It must not change any inside, board, aim or goal (E4's tests guard them).
- **F1:** bots occasionally revise (random valid insides), revert, open cells, set args and pick extra exits between trips. The invariants: `compileLattice` never throws, identity (M28) holds, ink and ownership issues are reported and never crash, records stay within their bounds (`recent` ≤ 10, best tiers never fall).
- **W4:** the `verify` skill on merged `main` through the whole loop (fight → tier-up on the trip page → sheet → revise → revert → open a cell → place with an arg → bank a draft → repair at the desk) at 375 × 812 with screenshots; `code-review` on the feature diff; DESIGN §11, feature doc §0 (M1–M37 as accepted, marked *Proposal*), TECH §7 (spans, effective library, save v4, calibration table), ROADMAP (BL-10, BL-11, BL-14 done, follow-ups added); a Haiku QA playthrough.

---

## 4. The owner's drafts (content proposal; E4 tunes boards, D1 polishes text)

Insides are in the Glyph's local frame: the entry is the given cell, and flow enters it moving right. Tokens are lattice notation. Boards are 5 × 3 unless noted; `d` dummy, `r` rat, `b` sentry, `o` oil.

**1 · The Lamplighter** (shallow · Spell · 1 bug: a wrong-way Bend)
```
Bolt>  Bend^        entry A1
.      Spark
```
*Note:* "Bolt it where it stands in the oil, then strike a light. I like a corner. It gives the spark a moment to think."
*Test:* `D . do . .` in the middle row, aim right. Goal: `ignite` + `hurt dummy-1 ≥ 3`. *Fix:* `Bendv`.
*Reaction:* "Down. It was always down. I drew it upside down on the tram."

**2 · Collection** (shallow · Spell · 1 bug: the gate before its cause)
```
Bolt>  OnInked  Ink  Spark        entry A1
```
*Note:* "Mark it and cash it in. Every time. It worked yesterday."
*Test:* a dummy two tiles right, aim right. Goal: `detonate`. *Fix:* swap Ink and On Inked.
*Reaction:* "The door before the mark. Nobody was ever going to knock."

**3 · Wet Work** (deep · Payload, host `Bolt> G:draft>` · 1 bug: a rune off the flow)
```
.    Oil   .
Ink  Fork  .                  entry A2
.    .     Spark
```
*Note:* "Mark, soak, light. One hand each. The fork does the sharing."
*Test:* a dummy two tiles right. Goal: `ignite` + `detonate`. *Fix:* move the Spark to B3.
*Reaction:* "One square. A whole evening, for one square."

**4 · Left Hand First** (deep · Spell · 1 bug: Fork's left-first habit)
```
.      Spark
Bolt>  Fork                   entry A2
.      Oil
```
*Note:* "Oil and the light together, so it never sees either coming."
*Test:* a dummy two tiles right. Goal: `ignite` + `hurt dummy-1 ≥ 3`. *Fix:* swap the Spark and the Oil.
*Reaction:* "Left first. It says so on the Fork. I wrote it there myself."

**5 · The Foundry Bell** (heart · Spell · 2 bugs: a misplaced Amplify and a wrong-way Bend)
```
.        Amp   .       .
Splash>  Ink   OnKill  Bend^      entry A2
.        .     .       Spark
```
*Note:* "Ring it once and the whole foundry hears. Every one that drops passes the spark along."
*Test:* 5 × 3, two rats side by side with a sentry beside them, Splash aimed at the rats. Goal: `dies rat-1` + `dies rat-2` + `detonate`. *Fix:* move the Amp beside the Splash (A1 or A3), and `Bendv`. Either fix alone fails: Splash for 1 doesn't kill, or the spark points at the ceiling.
*Reaction:* "Loud in the wrong place and pointing at the ceiling. That is me in one sentence."

E4 checks that each page compiles, keeps 3–8 flow cells and fails as written. Where a draft relies on stranded cells (1, 3, 5), the desk's "never reached" marks are the intended first clue.

---

## 5. Shared-file hotspots

- **`src/engine/types.ts`, `events.ts`, `run.ts`, `save.ts`, `flow.ts`, `routes.ts`, `App.svelte`, `Study.svelte`:** W0 only. Every hook a later task needs (effective library, `closeBattle`, `rollOffers(draft)`, `bankDrafts`, `compileGlyph(open)`, the mount points) is laid down in W0 against stubs in task-owned files. A task that finds a contract wrong reports it; the orchestrator changes the contract and rebases the waiting tasks.
- **`lattice.ts`:** W0's `viaInner` lands first; after that E3 is the only owner. E1 reads `viaInner` and never edits the compiler.
- **`GlyphSheet.svelte`:** U1 owns it; U4's controls live in `GlyphSettings.svelte`, mounted by W0. **`LatticeEditor.svelte`:** U4 owns it; U6 only renders `deadCells` in `LatticeGrid.svelte` (prop plumbed by W0).
- **`src/data/drafts.ts`:** E4 writes structure and puzzles, D1 only text fields, after E4 merges.
- **`tuning.ts`:** W0 adds the keys; C0 changes `economyTiers` values only.
- **`tests/sim/fuzz.test.ts`** and **`glyph-identity.test.ts`:** F1 and E3 respectively, never both in one wave.

## 6. Risks for the orchestrator to watch

- **Span offsets** (E1) are the foundation for everything in C. If an `apply…` function emits events after its children run, attribution leaks to the parent; the E1 tests must cover On Ignite (retargets mid-cast) and On Kill (loops).
- **Economy calibration on bots** (C0): bots aren't players. Treat the numbers as a first guess, and log them as a *Proposal* to tune by playing.
- **Extra exit plus Shape args** can create surprising paths (a Bend arg pointing into the extra side). M27's visited-cell rule keeps it safe; F1 must exercise the combination.
- **Revisions break pages**: a new inside can push a page over its ink or ownership. M19 keeps it visible and blocks leaving. Check the Study still lets you fix it (lift the Glyph, revert).
- **Desk puzzles too easy**: the static "never reached" marks give away drafts 1, 3 and 5. That's acceptable as a teaching ramp; if playtests find it flat, later drafts should lean on runtime bugs (gates, order).
- **Phone space** on the Glyph sheet (profiler + inside + settings + versions): U1 should fold Versions and Settings by default.

## 7. After the build

Play hypotheses for the player:
- Is optimising addictive: do you revise a Glyph just to push its Economy up a tier?
- Does the extra exit change how you wire, or is it just a number?
- Do parameters make you reuse one Glyph where you'd have compiled two?
- Is debugging the owner's drafts fun, and is the reaction worth it?
- Do the dead-cell lines make you rewire plain spells?
