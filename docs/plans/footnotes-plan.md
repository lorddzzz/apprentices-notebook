# Footnotes: levels, capstones and margins (plan)

> Design: [footnotes.md](../design/footnotes.md) (all), [rune-design-final.md](../design/rune-design-final.md) §2, §6, §8. Roadmap: **BL-54**, with BL-101 (fine-print audit), BL-104 (solvent discovery) and BL-50 (diagonal aura reach). Prefix **FN**. Brief: [build-program.md](build-program.md).
>
> **State: Drafted (not approved)**
>
> Scope: the footnote level system for runes, methods and solvents, its desk and notebook margins, the fine print it needs, the aura diagonal capstone, the Seam content pass, and the template every district batch reuses.

## 1. Scope and settled rules

**Delivers**

- Per-subject points, household-wide, for runes, the five methods and the 14 solvents; thresholds per kind 8/25/60 (runes) and 5/15/36 (methods, solvents) in `src/data/tuning.ts` (footnotes.md §0, §1).
- Level I and II **line slots** (two variants each, independent of each other), a level III **capstone** per subject (two options, no witnessed line needed), cost 1 / 2 / one of each home-district solvent, free re-pick, writing and re-picking **at home only** (§1 "Slots").
- **Locked empty margins**: frames labelled with their threshold, no text (§0 "Locked levels").
- A **margin column** on rune, method and solvent pages; the preview, Bench and inspect text read the written variant in the owner's hand (§1 "Notebook presentation").
- The ten built level-I variants moved to the new shape (they become the first level-I pairs of Bolt, Shove, Spark, Oil).
- **BL-101** fine-print audit for the Seam subjects (no quota, no fabricated rows), **BL-104** persistent solvent discovery, **BL-50** the diagonal reach capstone and its overlay.
- The **Seam content pass**: levels I and II for the 13 Seam runes, 13 capstone pairs, the five methods (and the two Seam solvents, Proposal P4), each variant with a scenario test.
- The **per-district batch template** (§6 of this plan) and the **rival-note slot hook**.

**Leaves out**: district runes' and solvents' content (each district plan, via the template), rival pages and their ownership (RV), threshold tuning beyond one playtest round, invention shelf organisation (BL-122), a level past the capstone.

## 2. Proposals

| # | Proposal | Reason |
|---|---|---|
| P1 | **Redefines: "every witnessed line of a rune has slots".** A line has slots only if it has authored variants (a `margin line`). The Seam pass targets **2 margin lines per rune** (3 for Spark and Ink, which have 17 and 10 lines; 1 where a rune has only one honest line). Further margin lines can arrive with later batches | The Seam runes have 62 lines; four variants each is ~250 variants and as many 4-combination tests before any district. Two lines per rune is ~110 variants and still gives every rune two decisions per level |
| P2 | Points credit **every subject whose line fires**, read from the line ID alone (`subject:meets`). No invention provenance is tracked | Settles the open "credit the parts too?" question as the design default (both), with no extra event fields: rune lines inside an invention already carry the rune's ID; method and solvent lines carry theirs |
| P3 | Costs: level I = 1 solvent of the **line's** district; level II = 2 of the line's district, any mix, most-held first (as `solventFor` today); capstone = 1 of each solvent of the **subject's home district** (Seam runes and Conduct: Gallnut + Cinder; Repeat, Margin: Pitch + Wick; Bind, Lift: Wax + Sand; a solvent: its own district) | The design names "the line's district" for slots and "that district" for capstones; a capstone has no line, so the home district is the only reading |
| P4 | The Seam pass also writes **Gallnut and Cinder** (one margin line each, levels I–II, a capstone pair) | Every district batch carries its 2 solvents; the Seam is a district and no other plan would own them |
| P5 | A rune with no honest line after the audit (likely **Bend**, which acts on the page) gets **only its capstone pair**. No line is invented to host a slot | BL-101: "do not fabricate rows to hit a quota" |
| P6 | Bench trials **apply written footnotes** (they still award no points); the **Lab** gets a toggle to switch any authored variant on, for authoring, scenario writing and the review gate | The Bench is "the safe place to check" (D4): a written margin must be checkable. The Lab toggle lets the player try drafts before they ship |
| P7 | The diagonal capstone is one generic effect (`auraDiagonal`): an aura with it also touches the 4 diagonal cells on the page. FN authors this capstone for **Afterglow, Steep and Coil** at once; each aura's **other** capstone comes with its district batch (CN, BH, BF) | One mechanism and one overlay instead of three; Steep and Coil run in the Lab already |
| P8 | Content lives in **one file per batch**: `src/data/footnotes/<batch>.ts` (`seam-runes`, `seam-methods`, `canals`, …), joined in `src/data/footnotes/index.ts`. Variant IDs are `<subject>-<slug>` and never change once shipped (FD's stable ID rule) | Parallel district builds own disjoint files |
| P9 | Locked frames appear only for **witnessed** margin lines and for the capstone; an unwitnessed margin line shows nothing (its existence is only counted in `fine print 3 / 7`, as now) | Keeps D1/D2: you see that there is more, not where |
| P10 | Home-only is enforced in `app/desk.ts` (refuse while `save.trip` exists) as well as by routing; the Codex margin on the road is read-only | The engine cannot know where the household is; the app can |
| P11 | Re-picking level I never clears level II, and vice versa | The design makes them independent |
| P12 | **No save migration.** Old `footnotes` entries are dropped by HC's breaking reset. If HC slips, FN-0 adds a parse that maps old `chosen` to level-I slots and infers found solvents (stock > 0, inventions' solvents, witnessed solvent lines) | Assumes HC's reset lands first; the fallback is cheap |

## 3. Current implementation and risks

- `engine/footnotes.ts`: `footnotePoints`, `footnoteLevel` (one `FOOTNOTES.levels = [5, 15, 40]` for all), `awardFootnotePoints` (credits **runes only**, and only known ones), `footnoteOffers`, `solventFor`, `writeFootnote` (1 solvent on the first write), `footnoteTexts` (ctx carries **variant text** per line); `hasFootnote(ctx, id)` compares text. FD (BL-123) replaces this with variant IDs.
- `data/footnotes.ts`: 10 level-I variants on `bolt:empty`, `shove:wall`, `shove:slick`, `spark:slick`, `oil:slick`. Hook sites: `push.ts` (wall soft/heavy, slick far/again) and `mix.ts` (oil corners/short). The spark-slick pair should be checked for a hook site during FN-3.
- `Profile.footnotes` is keyed by `RuneId` with `chosen: Record<LineId, string>`; methods and solvents have no entry.
- `run.ts::learnFromFight` → `firedLines` (one per consecutive run) → `awardFootnotePoints`; won or lost. Bench (`app/bench.ts`) and replay in `run.ts` pass footnotes; the Bench passes none.
- `run.ts::isKnown` treats a solvent as known only while stock > 0 (BL-104); solvents are gained in `run.ts` loot (`solvents[item.solvent] += 1`) and spent by `writeInvention` and `writeFootnote`.
- `data/lines.ts`: 100 rows. Seam runes: Spark 17, Ink 10, Shove 9, Steam 7, Brass 7, Oil 6, Bolt 3, Strike 1, Guard 1, Fork 1, **Splash, Touch, Bend 0**. Methods: Bind 3, Conduct 2, Lift 2, Repeat 1, Margin 1. Solvents 1–2 each. Slots need witnessed lines, so BL-101 gates the content.
- Aura touch is 4-neighbour in `lattice.ts` (`aurasNear`, `touch`), carried by `cluster.ts`, drawn by `FlowOverlay.svelte` via `app/flowGeometry.ts`. The capstone makes compilation **profile-dependent**: Glyph compilation, proof masks and elegance must stay stable when a capstone is re-picked (risk; FN-10 tests it).
- UI: `Desk.svelte` (rune list + `OfferCard`), `app/desk.ts` (`deskRows`, `offerViews`, `writeAt`), `Codex.svelte` / `CodexEntry` (fine print, no margin). Methods and solvents tabs exist without fine print.
- Risk: variant effects land in shared engine files (`push.ts`, `mix.ts`, `bursts.ts`, `marks.ts`, `schedule.ts`) that district builds also touch. Content tasks keep each hook a one-line `hasFootnote(ctx, id)` branch next to the line's own stamp.
- Risk: Bind and Lift capstones cost Wax + Sand, which cannot be found until IQ ships; their content is testable in the Lab before then.

## 4. Contracts

**Provides**

- `FootnoteSubject = RuneId | MethodId | SolventId` with `subjectKind()`; `FOOTNOTES.levels: Record<'rune' | 'method' | 'solvent', [n, n, n]>`.
- `VariantDef` v2: `{ id, subject, slot: { line, level: 1 | 2 } | { capstone: true }, text, rival?: RivalId, credit?: string }`.
- Profile: `footnotes: Partial<Record<FootnoteSubject, { points; slots: Partial<Record<SlotKey, VariantId>>; capstone?: VariantId }>>` and `solventsFound: SolventId[]` (BL-104).
- Engine: `footnoteLevel(p, subject)`, `slotsOf(p, subject, opts)` (open / filled / locked with threshold), `writeFootnote(p, subject, slot, variantId, opts)` with errors `notReached | unknownVariant | noSolvent | notHeld`, `footnoteIds(p)` for `ctx.footnotes`, and `hasFootnote(ctx, id)` (unchanged name, ID semantics from FD). `opts.holdsRivalPage(rival)` is a predicate the app passes in.
- `foundSolvent(p, id)` and `isKnown` reading `solventsFound`.
- `compileLattice(..., { diagonalAuras })` and the `auraDiagonal` capstone ID per aura.
- App: `lineTextFor(p, line)` (base text plus the written variants, owner's hand), `marginView(p, subject)` for Desk and Codex.
- **Batch template** (§6) and test helper `fourCombos(line, l1Pair, l2Pair, scenario)` in `tests/scenarios/footnoteHarness.ts`.

**Consumes**

- **FD** (BL-123 task): stable variant IDs in `ctx.footnotes`, and learned Bind events stored explicitly. FN-0 waits for it; if FD lands IDs as a different shape, FN-0 adapts.
- **FD** (arrival pipeline): arrival-based lines (slides, drifts) stamp through one path, so variants on those lines have one hook site.
- **HC** (breaking save reset): the new `Profile.footnotes` and `solventsFound` ship inside the reset; no migration (P12).
- **RV** (pages, BL-118): `holdsPage(p, rival)` and the rival IDs. FN owns the slot hook only; each district plan writes its rival's note text through the template.
- **DK** nothing directly; district batches go through DK's district module layout for their own engine hooks.

## 5. Tasks

| ID | Goal | Owned area | Role | Size | Depends on | Acceptance |
|---|---|---|---|---|---|---|
| **Wave 0: contracts** | | | | | | |
| FN-0 | Types, per-kind thresholds, Profile shape, batch registry, test harness stubs | `data/types.ts`, `data/tuning.ts`, `data/footnotes/index.ts`, `engine/types.ts`, `tests/scenarios/footnoteHarness.ts` | Strong | M | FD (BL-123), HC (save reset) | Contract types compile; existing tests green with old behaviour behind the new shape; handoff names invariants |
| FN-1A | BL-101 audit for the Seam subjects: missing behaviour per rune, method and Seam solvent; candidate margin lines (P1); per-district gaps listed for later batches | `docs/plans/footnotes-audit.md` | Strong | M | none (starts at once) | Table of real behaviours without rows, each with a one-line firing case; no quota-filling |
| **Wave 1: the system** | | | | | | |
| FN-1 | Points for every subject (P2), levels per kind, slot and capstone openness, write and re-pick with 1/2/both costs (P3), independence (P11), rival gating | `engine/footnotes.ts` | Strong | M | FN-0 | Unit tests: thresholds per kind, no double count per run, Bench/Lab award none, costs, free re-pick, capstone without a witnessed line |
| FN-2 | BL-104: record found solvents on every gain; notebook knows spent solvents | `engine/run.ts` (gain sites, `isKnown`) | Medium | S | FN-0 | A solvent spent to zero keeps its page; scenario through loot and spend |
| FN-3 | Move the ten level-I variants to `data/footnotes/seam-runes.ts` with FD IDs; hook sites read IDs | `data/footnotes/`, `push.ts`, `mix.ts`, spark-slick site | Medium | S | FN-0 | Existing footnote scenarios pass unchanged in effect |
| FN-4 | Desk: subjects list (runes, methods, solvents), margin column with filled / open / locked frames, cost per level, home-only guard (P10) | `app/desk.ts`, `desk.svelte.ts`, `ui/screens/Desk.svelte`, `ui/components/desk/` | Medium | M | FN-1 | App tests; phone check of all three frame states and a write at 375×812 |
| FN-5 | Codex margin column (read-only) on rune, method and solvent pages; method and solvent pages list their witnessed fine print | `engine/run.ts` (`codexView`, `fineOf`), `ui/screens/Codex.svelte`, `ui/components/codex/` | Medium | M | FN-1, FN-2 | Codex test; phone check on the road and at home |
| FN-6 | Owner's hand: `lineTextFor` in Bench new lines, inspect and preview captions; Bench trials apply written footnotes (P6) | `app/bench.ts`, `app/describe.ts`, `app/peek.ts` | Medium | S | FN-1, FN-3 | A written variant reads as written wherever its line is shown; Bench awards no points |
| FN-7 | Lab variant toggle (any authored variant on/off, rival notes included) | `app/lab.ts`, `lab.svelte.ts`, Lab panel | Fast | S | FN-3 | Lab trial with a toggled variant shows its effect |
| FN-8 | Rival-note slot hook: third option in a named slot, hidden until `holdsPage`, same level and cost, credit line in the margin | `engine/footnotes.ts`, `app/desk.ts`, margin component | Medium | S | FN-1, FN-4, RV (pages contract) | Fixture rival note: hidden, then offered, then credited |
| **Wave 2: lines and the aura capstone** | | | | | | |
| FN-9 | Add the audited Seam lines with firing scenarios: sources and shapes (Splash, Touch, Fork, Bend, Strike, Guard) | `data/lines.ts`, the stamping engine sites | Medium | M | FN-1A | Each new row fires in a scenario; lines integrity test green |
| FN-10 | Audited lines for methods and Seam solvents | same | Medium | S | FN-1A | as FN-9 |
| FN-11 | `auraDiagonal` capstone: compile with diagonal touches from the profile, for Afterglow, Steep, Coil (P7); Glyph, proof and elegance stay consistent | `engine/lattice.ts`, `cluster.ts`, `run.ts::compiledFor`, `data/footnotes/auras.ts` | Strong | M | FN-1, FN-3 | Scenarios per aura with and without; re-pick does not corrupt Glyph records |
| FN-12 | Diagonal overlay on the lattice editor | `app/flowGeometry.ts`, `FlowOverlay.svelte` | Medium | S | FN-11 | Phone check: diagonal touches readable beside orthogonal ones |
| **Wave 3: Seam content (author, review, build)** | | | | | | |
| FN-A1 | Draft the Seam rune margins: margin lines per rune, level I and II pairs (with a spare opinion where two compete), 13 capstone pairs | `docs/design/footnotes-content/seam.md` | Strong | M | FN-1A | Every pair is two reasonable opinions; all 4 combinations read sensibly; design guidance §1 followed |
| FN-A2 | Draft the five methods and Gallnut, Cinder | same file | Strong | S | FN-1A | as FN-A1 |
| FN-G1 | **Player review gate** (design-round): the player picks between opinions, in small rounds; approved text becomes the spec | doc above, DESIGN §11 row | orchestrator | S | FN-A1, FN-A2 | Every batch below has approved text |
| FN-C1 | Bolt and Shove (pilot of the template): level I second lines, level II | `data/footnotes/seam-runes.ts`, `push.ts`, cast/target sites | Medium | M | FN-G1, FN-3, FN-9 | `fourCombos` scenario per margin line |
| FN-C2 | Spark (3 margin lines) | same, `bursts.ts` | Medium | M | FN-C1 | as FN-C1 |
| FN-C3 | Ink and Oil | same, `mix.ts`, `marks.ts` | Medium | M | FN-C1 | as FN-C1 |
| FN-C4 | Steam and Brass | same, `mix.ts`, `networks.ts` | Medium | M | FN-C1 | as FN-C1 |
| FN-C5 | Strike, Guard, Splash, Touch, Fork | same, `damage.ts`, `targets.ts` | Medium | M | FN-C1, FN-9 | as FN-C1 |
| FN-C6 | Capstones: Bolt, Splash, Touch, Strike, Shove, Guard, Fork, Bend | same | Medium | M | FN-C1 | One scenario per capstone; headline stays true |
| FN-C7 | Capstones: Ink, Oil, Steam, Brass, Spark | same | Medium | M | FN-C2–C4 | as FN-C6 |
| FN-C8 | Conduct, Repeat, Margin: levels I, II, capstones | `data/footnotes/seam-methods.ts`, `inventions.ts`, `schedule.ts` | Medium | M | FN-G1, FN-10 | `fourCombos` and capstone scenarios through an invention |
| FN-C9 | Bind, Lift, Gallnut, Cinder | same, `marks.ts`, `solvents.ts` | Medium | M | FN-C8 | as FN-C8 |
| FN-P1 | **Playtest gate**: thresholds and the feel of the margin after FN-4 and FN-C1–C2 | ROADMAP note | player | S | FN-4, FN-C2 | Thresholds kept or retuned in `tuning.ts`; DESIGN §11 row |

## 6. The per-district batch template

Each district plan (CN, IQ, BH, BR, BF, CG) adds one batch task set in this shape:

1. **Audit** its 3 runes and 2 solvents against its terrain (FN-1A's method; gaps listed there). Add missing lines with firing scenarios first.
2. **Author** a draft in `docs/design/footnotes-content/<district>.md`: per rune 2 margin lines × level I and II pairs and a capstone pair (an aura's diagonal capstone already exists, P7); per solvent 1 margin line and a capstone pair; the rival's note (rune, slot, text in the rival's voice, lore credit line).
3. **Player review gate** (design-round), as FN-G1.
4. **Build** in `src/data/footnotes/<district>.ts` (registered in the index), effect hooks in the district's own engine module where possible, `fourCombos` per margin line and one scenario per capstone and the rival note, under `tests/scenarios/footnotes/<district>.test.ts`.
5. **Check** the margin on a phone (375×812) and the lines integrity test.

Typical size: audit S, author S–M, build 2–3 M tasks.

## 7. Verification

- Unit tests for `engine/footnotes.ts` (per-kind thresholds, crediting per subject, costs, independence, rival gating, home-only refusal in the app).
- `fourCombos` scenario per margin line (4 combinations of level I × level II) and one scenario per capstone, per BL-101 line and per migrated variant; the lines integrity test both ways.
- Aura diagonal: scenarios per aura; Glyph identity and proof tests rerun with the capstone toggled.
- A fuzz/bot run (existing `tests/sim`) with every variant toggled on in turn: no thrown errors, the 500-event cap respected.
- Phone checks at 375×812 with screenshots: Desk (filled, open, locked frames; a write; a re-pick), Codex margins at home and on the road, the diagonal overlay, a preview showing a written variant.
- `pnpm check` green on every task.

## 8. Open questions for the player

1. P1: two margin lines per rune (three for Spark and Ink) instead of every line. Fine, or should the busiest runes get more?
2. Review gate format: read the drafts as text and pick, or try each candidate in the Lab first (FN-7 makes that possible, at the cost of building candidates you drop)?
3. Should a rival's note sit at level I (reachable early) or level II (a reward for mastery)? Each district can decide; a default helps.

## 9. Execution notes

- Critical path: FD (BL-123) and HC reset → FN-0 → FN-1 → FN-4 / FN-3 → FN-C1 → the remaining content. FN-1A starts immediately and runs beside Wave 0–1, so authoring (FN-A1/A2) and the review gate can finish before the system does.
- Parallel: FN-2, FN-3, FN-5, FN-6, FN-7 after FN-1; FN-9/FN-10 beside the UI; FN-11/12 beside content; FN-C2–C5 in parallel after the pilot FN-C1 (they touch different engine files, except `mix.ts` for C3/C4: run those two in sequence).
- District batches can start once FN-1, FN-3 and FN-C1 (the pilot that proves the template) are merged.
- Rough size: 27 tasks; system ~1 L of work (FN-0–FN-8, FN-11–12), audit and lines ~1 M+S, Seam content ~9 M after the gate.
