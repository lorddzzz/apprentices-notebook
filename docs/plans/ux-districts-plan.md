# UX districts (UD): per-district fight look, marks and theme entries

Design: [ux-polish.md](../design/ux-polish.md) §5 (L5 fight readability) · board §7 "District style sheets", "Materials and occupied cells", "Tactical marks" (snapshot [ux-board-snapshot.txt](ux-board-snapshot.txt)) · program: [ux-program.md](ux-program.md) · Roadmap: BL-135.
State: Drafted (2026-11-26); revised after review 2 (2026-11-26). Prefix `UD`. Phase 5 of the program. Runner: Claude code packs; Codex art packs come from UA (referenced, not owned).

Decision IDs used by the program and the decisions review (aligned after review; the old "UD-D<n> = Proposal n" rule is dropped):

| ID | Proposal | Subject | Status |
|---|---|---|---|
| Decision UD-D1 | 1 | Theme registration (FT defines, UD fills; borrowed-asset precedence pinned) | agreed |
| Decision UD-D2 | 3 | Mark rules: decorative marks vs tactical signals | **changed after review** |
| Decision UD-D3 | 5 | Orchestrator-run readability gate (fallback and painted art; painted failure blocks the asset's deploy, not the code merge) | **changed after review** |
| Decision UD-D4 | 4 | Crests are vector components (adapted to the header snippet at the call site) | **changed after review** |
| Decision UD-D5 | 7 | Evidence per district (a shared parameterised checklist, committed evidence files) | new numbering |
| Decision UD-D6 | 6 | Drawn pages borrow and keep the lent rule's visual tell | **changed after review** |
| (none) | 2 | `data-district` → `data-mark` rename (R7), cited as "Proposal 2 / R7", distinct from UD-D2 | **changed after review** |

Scope: restyle `src/ui/districts/*` so every district-specific mark obeys the flat, never-themed overlay and the bible's per-district rule; register one theme entry per district (C1 `[data-district]`, crest, scene); a greyscale + squint check per district before merge. Covers the six districts below, the lower Seam (Underjoin) and player-drawn pages; marks of the Seam and Lampwater get the same restyle after FT's proving pass. Rules, content, engine and balance are untouched.

## 1. Settled (cited, not copied)

- Program §1 and C1–C8 apply as written; this plan quotes only what it consumes. The overlay is never themed: `--overlay-*` is never overridden under `[data-district]` (C1, D8). Red = danger only, gold = firsts (C1, ux-polish §5 L3 P7).
- Bible, per district (board §7): Thermae cloud edges show exactly which cells join; Fog Arches sound/chipped/cracked/collapsing by fracture shape; Klokhof bells matched by pattern as well as hue, pulses drawn around separated bells, a connected path reserved for brass; Sestante ghosted pencil / solid ink / erased space as three reads; Verloren Corner distinct stamps for Return to Sender, Forwarding, Standing Order; Lampwater directional current and a crisp flow indicator.
- A unit, jar and state can share a cell; district marks stay distinct from reach, targeting and danger (board "Materials and occupied cells").
- Art is a pure file drop (C2); no UD code pack waits for art. Each district passes greyscale + squint before merge (program §4 phase 5).

### Bible name → code id → files

| Bible | `DistrictId` | UI dir | Swatches (dark / mid / light) | Swatch-bearing marks |
|---|---|---|---|---|
| The Seam | `seam` | `seam/` | #253235 #55625E #BC9273 | HandTile, MarginaliaArt, CycleBanner |
| Lampwater | `canals` | `canals/` | #172C39 #456675 #BC8A57 | CrateArt, MooringPiece, CanalFx, RuinFx |
| Verloren Corner | `inkQuarter` | `inkQuarter/` | #272632 #656475 #A28D6D | ReturnPiece, ForwardPiece/Ring, OrderPiece, WaxPiece, ClockPiece/Count, SentBackGhost, ThreadHighlight, AddressPiece, StaffArt |
| The Thermae | `bathhouses` | `bathhouses/` | #25373B #5F8482 #ACC7BE | BathDome, BoilArt/Fx, foes/BathArt+BathToken, heat/* |
| The Fog Arches | `bridges` | `bridges/` | #252F39 #596D79 #ADBBBC | SpanPiece, PierPiece, KeystonePiece, BridgeLayer, FallArt/Fx, BridgeToken |
| Klokhof | `foundry` | `foundry/` | #292A2A #6F6956 #B19060 | BellPiece, GreatBellPiece, HookPiece, RopePiece, Halo, Struck/Hung/Muffled, RingArt, tones.ts |
| The Sestante | `cartographers` | `cartographers/` | #28323A #768890 #D5D7CC | PencilPiece, OutlinePiece, BlankPiece, LinkMark, CircleMark, PaperFx, HallArt |
| The Underjoin | `lowerSeam` | `lowerSeam/` | #232D30 #535E59 #8F9280 | StairSlot, DoorLine (map side); no board art of its own |
| Player-drawn | `inkedPage` | `inkedPage/` | #373239 #867A72 #D9CDB5 | PagesSlot (map side); board pieces are the borrowed districts' |

## 2. Proposals

1. **Theme registration (program R1, R2: FT defines, UD fills).** FT-4 defines `DistrictFightTheme` in `components/board/fightArt.ts` (`{ id; scene?; sceneFocal?; arena?; tiles?; tileTone?; crest?: Component<{ size: number }> }`) and adds the optional `fightTheme?: DistrictFightTheme` field and `crestFor(id)` to `DistrictUi` in `districts/index.ts`; FT-12 writes the Seam and Lampwater entries. UD fills the other districts in their own `<dir>/index.ts` (UD-5, UD-7, UD-9, UD-11, UD-13, UD-14, UD-15), so district packs stay disjoint. The board resolves art by convention ids (C2) and reads overrides from `fightTheme`; `FIGHT_KITS` is that lookup, not a second registry. UD-1 only confirms the shape on main.
2. **Rename the SVG marks' `data-district="foundry:struck"` attributes to `data-mark`** (**11** files: foundry Struck/Hung/Muffled/Halo, inkQuarter ForwardRing/SentBackGhost/ThreadHighlight/ClockCount, seam HandTile, cartographers LinkMark and **CircleMark**). They share C1's attribute name with a different meaning; no test reads them. The grep is case-insensitive and covers mixed-case ids (`inkQuarter`): `grep -rniE 'data-district="[a-z]+:' src` must be empty. Done in UD-1 before any pack starts. UF's root selector `[data-world][data-district]` stays even after the rename (R7/R8).
3. **Two classes of district signal (UD-D2, changed after review).**
   - **Decorative marks** (stamps, bell patterns, span wear texture, pencil/ink reads, hands, crates: anything that says "what this is" without threatening): shape and pattern carry the meaning, hue only helps (greyscale-safe); no `--danger`, red-hue literal, `--gold` (except firsts) or `--overlay-*` as fill; they live **inside their own cell** edge/corner and never cover HP, intent, reach or preview. A test scans `src/ui/districts/**` for these rules with a per-district allowlist that must shrink. The allowlist covers **decorative marks only**.
   - **Tactical district signals** (anything that carries real danger or a rules fact the player acts on: Fog Arches fracture perimeter, load path and carry arrow; Lampwater current/flow direction; Klokhof pulse rings and the brass conduction path; Thermae cloud-edge joins; Sestante erased-space danger; Verloren Corner standing-order triggers): drawn in the **shared overlay vocabulary** (shared tactical ink, `--overlay-*`/`--danger` tokens, the overlay group of the board), **never a district hue**, and they may cross cell edges where the rule requires (a fracture perimeter or a load path spans cells). They are listed per district in the brief; a test asserts they render in the overlay group with overlay tokens. They are outside the decorative allowlist and not subject to the inside-the-cell rule.
   A red-literal scan alone cannot prove geometry or contrast; the readability gate (Proposal 5) does.
4. **Crests are vector components, 96×96, one tint + ink, owned by UD (UD-D4, changed after review).** Each crest is a Svelte component `Crest.svelte` taking `{ size }`; the header's `crest` Snippet is built **at the call site** (`{#snippet crest()}<Crest size={24} />{/snippet}`, via `crestFor(id)`'s component), so one component scales from header to credits. UD supplies five (Verloren Corner, Thermae, Fog Arches, Klokhof, Sestante) and **both proving crests are owned by FT-12** (Seam, Lampwater). Underjoin uses the Seam crest with a dashed lower line; **drawn pages use the blank-page crest** (own component, `inkedPage/Crest.svelte`); this resolves the earlier blank-page-vs-Seam wording: drawn pages borrow the Seam *scene tint* only as a fallback, never its crest. `crestFor(id: DistrictId)` is FT-4's.
5. **Readability gate run by the orchestrator, not the player (UD-D3, changed after review).** Per district, evidence is **colour + greyscale + 3 px blur screenshot pairs**, from a staged fight (not a plain `BoardView`) with: overlapping figures (vertically adjacent pair), HP, intents and previews, the real z-order, a top-edge boss overlap (where the district has a boss), stacked FX, on **painted art and zero art**. A shared parameterised checklist (§6) is used for all districts, with one evidence set per distinct candidate (not per duplicate state). Evidence in `docs/plans/ux-districts-evidence/<district>-{colour,grey,blur}[-art].png`. **The gate must pass before a district's art deploys**; code (fallback look) may merge earlier on passing zero-art evidence. A failing UA asset is held off deployable main until its composite passes; the gate re-runs when either the code or the art changes. R9 (Thermae steam) failures go back to FT with a required rerun.
6. **Drawn pages borrow, they do not theme (UD-D6, changed after review).** `inkedPage` borrows pieces, scenes and banners; borrowed rule pieces resolve through the global `pieceArtFor/highlightArtFor` lookups and keep their district's look. Scene: `scenes/inkedPage/fight` (UA-26) when present, else a Seam-derived tint. Underjoin: `scenes/lowerSeam/*` as UA-25 commissions, else the Seam tint. Banners: `bannersFor(trip.district)` filters by exact district; **a lent heart whose rule needs a visible tell must show it** (UD-15 establishes the current source of the tell in code first). If the redesign would hide an existing warning, fixing and retesting its presentation is an **owned task (UD-15b)**, app-layer test-first if it touches `bannersFor`; unrelated existing content gaps go to the backlog.
7. **Test layout is disjoint per district (review 2 #7).** Shared harness in `tests/ui/districtMarks/harness.ts` (Pack 0). Each district gets its **own** files: `tests/ui/districtMarks/<dir>.test.ts` (decorative-mark rules, its own allowlist constant, tactical-signal assertions) and `tests/ui/districtTheme/<id>.test.ts` (theme + crest registration, overlay tokens not overridden). Packs 1–7 edit only their own pair; no pack edits a shared test file. The integrator removes remaining exceptions at Pack Z. The old single `district-marks.test.ts` / `district-theme.test.ts` with `it.todo` rows are dropped.

No **Redefines**.

## 3. Current implementation and risks

Checked: `src/ui/districts/index.ts` (the `DistrictUi` registry, global lookups `pieceArtFor`, `unitArtFor`, `fxFor`, `boardLayersFor`, `bannersFor`), `logic.ts` (component-free highlights and describe), `foundry/tones.ts` (bells already carry four cues: size, hue, stripes/diagonals/dots, pips), `bridges/PierPiece.svelte` (flat masonry using `--ink`, `--parchment`), per-district `index.ts` files, `data/districts/*.ts` (ids, names, `hearsAs`), `tests/fixtures/saves/*-mid-trip.json` (seam, canals, inkQuarter, bathhouses, bridges, foundry, cartographers; none for `lowerSeam`, `inkedPage`).

- Marks hard-code hex in 26 files (foundry BellPiece 8, bridges BridgeLayer 5, ToneSheet 7, HallSheet 4 …) and use theme tokens elsewhere; none read `--district-*` yet. Restyle moves colours to tokens or `--district-*` where it is scene chrome, and keeps pattern cues.
- **Riskiest unknown: the FT hook shape.** Settled by R1/R2: FT-4 defines it. The nine `[data-district]` blocks are written by UF-1 for all ids (R8); they target `[data-world][data-district]` until UD-1's `data-mark` rename merges (R7), after which UD-1 asks UF (status Owed) to drop the `[data-world]` prefix. `theme.css` is UF's; UD never edits it.
- Thermae steam edges: the cloud is drawn by `components/board/SteamLayer.svelte` (FT-owned, every district). UD-6 checks FT's layer against the rule on the Thermae fixture and, if it does not show joined cells, raises it to FT; UD only owns Thermae pieces (dome, boil, bathers dissolving into the cloud).
- `bannersFor(trip.district)` filters by exact district: a drawn page that lends a district's rule may lose its banner. See Proposal 6 (UD-15, UD-15b).
- `src/ui/districts/{seam,canals}` are edited by FT in phase 2; Pack 7 starts only after FT A2b and Pack B merge, and runs **first** as the proving pass.
- `galleryFixtures.ts` is UF/UE's; UD adds `src/ui/districts/fixtures.ts` (review recipes per district), a small Gallery adapter and one additive grant line (after UF-6/UF-7 and before UE-6), plus additions to `tests/ui/fixtures.test.ts` (UD-3 owns those additions). See UD-3.
- **Board sizes (real, counted from `DISTRICTS` and the runtime builders)** used by fixtures and gates: Seam 5×6, 6×6, 6×7, 6×8, 7×8; Lampwater 5×9, 6×9, 7×7, 7×8; Verloren Corner 6×8, 6×9, 7×9; Thermae 6×8, 6×9, 7×8, 7×9; Fog Arches 5×7, 6×6, 6×7, 6×9, 7×9; Klokhof 5×7, 5×9, 6×7, 6×8, 7×9; Sestante 6×8, 7×8, 7×9; Underjoin 6×8 or 7×8; drawn page 5–7 × 6–9 (lent 7×7, 7×8, 7×9). Each district's gate uses its largest size and one mid size.

## 4. Contracts

**Provides:** the district crest components behind `crestFor(id)`; `DISTRICT_REVIEW_RECIPES` (`src/ui/districts/fixtures.ts`): for each district id a recipe `{ fixture: 'fight-<id>' (canals → `fight-lampwater`, seam → `fight-seam`), size, taps?, step? (frozen **shown** ordinal), zeroArt, safeInsets, expected observations }` naming a UF staged fight session (deterministic, with compound/boss/district checks as needed), consumed by a small Gallery adapter (`src/ui/screens/galleryDistricts.ts`, new, UD-3) that UE-6's Gallery renders; `docs/plans/ux-districts-evidence/`; the per-district mark and theme tests (Proposal 7).

**Consumes (quoted):**
- C1: "District light: `[data-district="<id>"]` sets `--district-dark|mid|light` from the bible swatches (board §7). Only scene chrome and art tint read these." and "Overlay tokens `--overlay-*` are **never** overridden under `[data-district]` or `[data-world]`". From UF-1.
- C2: "`artUrl(id)` … `<ArtImage id fallback>` … Every screen must render correctly with zero art present." Scopes are district ids (`scenes|tiles|props|foes|portraits/<id>/…`; crests are vector, not art). From UF-2 (code) and the UA district packs (files).
- C4/C5: tile masters 128², figures 128×176 feet y=160, district ≤ 1.5 MB.
- C8: fixtures. UF-15's `fight-<DistrictId>` rows for all nine ids, **staged fight sessions** with the real sizes above (a UF-4 seed fight cannot satisfy wide, compound, boss or district checks; a plain `BoardView` cannot exercise cast previews, busy FX, meters, borrowed banners or trip context), `fight-lowerSeam` and `fight-inkedPage` included, plus `map-lower-seam`, `map-inked-pages`; `canals` ↔ `fight-lampwater`. UD-3 records extra saves under `tests/fixtures/saves/` only if the recipe cannot reach a state (report it). Use the curated fixtures as soon as FT-3/UF-15 are available.
- **From FT:** FT-4 (`DistrictFightTheme`, `DistrictUi.fightTheme`, `crestFor`), FT-8 (board layers that read `fightTheme`), FT-12 (Seam and Lampwater entries), FT Pack A2's `SteamLayer`, the overlay layers and `StepMarkerLayer` as shared layers UD must not edit (R9). **From UF:** UF-6 (greyscale toggle, also `&grey=1` on fixtures), UF-1 (tokens and the nine blocks). **From UT:** UT-7's `OfferCard` hosts district cards unchanged (no UD edit).
- **From UA (district packs, pure file drops):** UA-20 Verloren Corner (UD Pack 1), UA-21 Thermae (Pack 2), UA-22 Fog Arches (Pack 3), UA-23 Klokhof (Pack 4), UA-24 Sestante (Pack 5), UA-25 Underjoin + UA-26 player-drawn (Pack 6); Seam (UA-10/UA-11) and Lampwater (UA-13) for Pack 7.

**Owed (for the status file):** nine `[data-world][data-district]` blocks (UF-1) · `DistrictFightTheme`, `DistrictUi.fightTheme`, `crestFor` (FT-4) · `DISTRICT_REVIEW_RECIPES` → Gallery adapter + one grant line (UD-3; UE-6 renders it) · Seam and Lampwater crests and entries (FT-12) · after UD-1: drop the `[data-world]` prefix in UF-1's blocks (UF) · each district's theme entry, crest, restyle and gate (UD-4…UD-17) · per-district test pair enabled with its pack · `crestFor` consumers: FT-14, UT headers, UE-3 · R9 failures → FT with a rerun · UA assets held off deployable main until their gate passes.

## 5. Packs

Order (changed after review): **Pack 7 (Seam and Lampwater marks) runs first as the proving pass**, as soon as FT A2b, FT Pack B and the fixtures have merged, before its pattern is copied; Packs 1–6 then run two or three at a time, each with its UA art pack beside it. Each later district merges its code on passing zero-art evidence; its art deploys only after the readability gate passes on painted art. Order by risk after the proof: Klokhof, Fog Arches and Verloren Corner first; Thermae and Sestante next; Pack 6 last. Every pack owns a **disjoint pair of test files** (Proposal 7); none edits a shared test.

### Pack 0: Foundation (role: Default; UI; depends on: UF-1, UF-6, UF-15d (district fight fixtures); FT-4 and FT-12)
Owns: `src/ui/districts/index.ts` (confirm FT-4's field; add only the Underjoin crest fallback and the drawn-page blank crest registration), `src/ui/districts/logic.ts` (no change expected), the **11** files of Proposal 2, `src/ui/districts/fixtures.ts` (new), `src/ui/screens/galleryDistricts.ts` (new adapter), `tests/ui/districtMarks/harness.ts` (new), `tests/ui/fixtures.test.ts` (additions only), `tests/ui/districtTheme/` and `tests/ui/districtMarks/` skeleton (one empty-but-passing file per district, owned afterwards by that district's pack).
Pattern: `tests/ui/rule-preview-layer.test.ts`.

| ID | Goal | Size | Done when |
|---|---|---|---|
| UD-1 | Confirm FT-4's `DistrictUi.fightTheme` and `crestFor` on main; rename `data-district` marks to `data-mark` (11 files, R7); confirm the nine `[data-world][data-district]` blocks (UF-1) and ask UF to keep the root scoping | S | `grep -rniE 'data-district="[a-z]+:' src` empty; svelte-check green; per-district theme test files exist and pass |
| UD-2 | Harness for the decorative-mark rules and the tactical-signal assertion; per-district allowlist constants in each district's own test file; assert no `--overlay-*` override under any selector | M | harness passes with each current offending file listed in **its district's** allowlist; adding a red literal in a temp string fails; tactical signals are not in any allowlist |
| UD-3 | `fixtures.ts` recipes for all nine ids onto UF's staged `fight-<id>` sessions (real sizes, taps, shown-ordinal step, zero-art switch, safe insets, expected observations); Gallery adapter + one additive grant line; new cases in `tests/ui/fixtures.test.ts` | M | each id opens at 375×812 from the Gallery with greyscale on and zero art; `fixtures.test.ts` passes with a case per id; `canals` maps to `fight-lampwater` |

### Pack 1: Verloren Corner (role: Default; UI; depends on: Pack 7's proof, Pack 0) — Owns `src/ui/districts/inkQuarter/`, `tests/ui/districtMarks/inkQuarter.test.ts`, `tests/ui/districtTheme/inkQuarter.test.ts`
| ID | Goal | Size | Done when |
|---|---|---|---|
| UD-4 | Restyle: three stamps (Return to Sender, Forwarding, Standing Order) differ by outline and glyph, not hue; wax and clock marks to the decorative rules; standing-order triggers are tactical signals in overlay ink | M | review recipe `inkQuarter`: the stamps tell apart in greyscale; allowlist rows for this dir removed |
| UD-5 | `fightTheme` entry + `Crest.svelte`, `crestFor('inkQuarter')` | S | Gallery crest at 24 and 96 px; zero art renders; theme test enabled |
| UD-G1 | Readability gate (Proposal 5) | gate | checklist §6 passes on zero art; evidence committed; art deploys only after the painted pass |

### Pack 2: Thermae (Default; UI; Pack 0) — Owns `src/ui/districts/bathhouses/`, its test pair
| ID | Goal | Size | Done when |
|---|---|---|---|
| UD-6 | Restyle dome, boil, bather tokens (dissolving into the cloud), heat badges; check FT's steam edges on three joined cells, an isolated cell and a bather (R9) | M | recipe board: a 3-cell cloud and a 1-cell cloud read as different shapes; translucent inside, bather still legible; a failure is reported to FT for a rerun |
| UD-7 | theme entry + crest | S | as UD-5 |
| UD-G2 | gate | gate | as UD-G1 |

### Pack 3: Fog Arches (Default; UI; Pack 0) — Owns `src/ui/districts/bridges/`, its test pair (FT-owned `BridgeLayer` split already merged by A2b; UD restyles both halves)
| ID | Goal | Size | Done when |
|---|---|---|---|
| UD-8 | Span wear states by fracture shape (sound, chipped, cracked, collapsing) as decorative surface pieces; fracture perimeter, load path and carry arrow kept as tactical signals in overlay ink | M | four states in greyscale: distinct outlines, no hue needed; load path to a pier visible over fog; a unit standing on a cracked span still legible |
| UD-9 | theme entry + crest | S | as UD-5 |
| UD-G3 | gate | gate | as UD-G1 |

### Pack 4: Klokhof (Default; UI; Pack 0) — Owns `src/ui/districts/foundry/`, its test pair
| ID | Goal | Size | Done when |
|---|---|---|---|
| UD-10 | Keep the four-cue bells (size, hue, pattern, pips) as decorative marks; Halo pulse rings around separated bells and the brass conduction path as tactical signals (dashed ring vs solid connected line) | M | low/mid/high bells tell apart at 24 px in greyscale; pulse and conduction path distinct on one board |
| UD-11 | theme entry + crest (Great Bell for the heart scene) | S | as UD-5 |
| UD-G4 | gate | gate | as UD-G1 |

### Pack 5: Sestante (Default; UI; Pack 0) — Owns `src/ui/districts/cartographers/`, its test pair
| ID | Goal | Size | Done when |
|---|---|---|---|
| UD-12 | Three reads: ghosted pencil (dashed, thin, light), solid ink (heavy, filled), erased space (blank notch, no outline fill); link and circle marks decorative | M | all three on one board, tell apart in greyscale and under squint |
| UD-13 | theme entry + crest | S | as UD-5 |
| UD-G5 | gate | gate | as UD-G1 |

### Pack 6: Underjoin and drawn pages (Default; UI; Pack 0) — Owns `src/ui/districts/lowerSeam/`, `src/ui/districts/inkedPage/`, test pairs for both ids
| ID | Goal | Size | Done when |
|---|---|---|---|
| UD-14 | Underjoin: map-side pieces (StairSlot, DoorLine) in the system look; theme entry (Seam crest with dashed line; scene from UA-25 else Seam tint) | S | fixtures `map-lower-seam` and `fight-lowerSeam` (6×8 and 7×8): stair and door line read at 375×812; zero art |
| UD-15 | Drawn pages: PagesSlot restyle; theme entry (drawn swatches, blank-page crest, UA-26 scene else tint); borrowed-heart fixture (lent 7×7, 7×8, 7×9) showing pieces and banners; establish the current source of each lent rule's tell | M | fixtures `map-inked-pages` and `fight-inkedPage`: borrowed pieces keep their look; every lent rule's tell is visible, or the gap is listed for UD-15b |
| UD-15b | **Only if UD-15 finds a hidden tell**: restore it (app-layer test-first for `bannersFor`, a Proposal) and retest | S | the tell shows on the lent-heart fixture; test passes |
| UD-G6 | gate | gate | as UD-G1 on both |

### Pack 7: Proving-district marks (Default; UI; Pack 0; **FT-12, FT A2b and FT Pack B merged; runs first**) — Owns `src/ui/districts/seam/`, `src/ui/districts/canals/`, test pairs for both
| ID | Goal | Size | Done when |
|---|---|---|---|
| UD-16 | Lampwater crates, mooring, ruin as decorative marks; the current/flow indicator confirmed directional and kept as a tactical signal in overlay ink (add none) | S | recipe `canals` (5×9 and 7×8); allowlist rows removed |
| UD-17 | Seam marks (hands, marginalia, cycle banner) decorative | S | recipe `seam`; allowlist empty for these dirs |
| UD-G7 | **Proving gate**: full Proposal 5 evidence, which also proves the recipe, harness and checklist before they are copied | gate | gate passes; pattern recorded in the log |

### Pack Z: Close of the phase (orchestrator)
| ID | Goal | Size | Done when |
|---|---|---|---|
| UD-Z | Allowlists empty; per-district tests enabled; contact grid of nine boards in greyscale; `pnpm check`; code review of `src/ui/districts`; one live loop per **genuinely different interaction** (fracture, steam, conduction/pulse, erase, stamps, lent heart), not nine duplicate excursions; UD status row in the log | M | `pnpm check` green; grid committed as evidence; every UD-G row recorded |

## 6. Verification

- Tests: per-district `tests/ui/districtMarks/<dir>.test.ts` (decorative rules, tactical signals in the overlay group with overlay tokens) and `tests/ui/districtTheme/<id>.test.ts` (theme + crest registered, overlay tokens not overridden); existing `tests/districts/*` and `tests/ui/*` unchanged. Vitest has no browser layout: rendered structure and target sizes are checked in a browser or by server-render markup, as appropriate.
- Verify commands name real files: Seam → `tests/districts/marginalia.test.ts`; canals → `tests/districts/canal-floor.test.ts tests/districts/canal-ledgers.test.ts`; Underjoin → `tests/districts/lower-seam-floor.test.ts tests/districts/lower-seam-door.test.ts tests/districts/lower-seam-trip.test.ts`; drawn page → `tests/districts/inkedPage tests/districts/trip-shapes-lent.test.ts tests/districts/heart-frames.test.ts`; others → `tests/districts/<dir>`.
- **Shared readability checklist (UD-G), parameterised by district recipe:** each state of the district is told apart by shape alone; danger arrows, reach dots and the cast outline are the first thing read; HP and intent are not covered; marks and signals at the real cell size (≥ 44 px, ~51 px at 7 columns, per FT-D9/R20; 38 px visual at 375×667; hit rects stay the whole cell); squint (blur 3 px) still shows tile state and figures apart; a vertically adjacent pair, a top-edge boss, stacked FX, real z-order; the threatened cell, the harmed party member, HP and the underlying tile identifiable; colour/greyscale/blur with painted art and with zero art; no tap target under 44 px added; hit rects above all art. One evidence set per distinct candidate.
- Phone check: no for UD-1; per pack the orchestrator checks the recipe and one live mid-trip save. Gate failures: code failures go back to the pack; art failures hold the asset off deployable main; R9 failures go to FT with a required rerun.
- Checked at Close of the program only: offline precache of district art (UF art check), whole-game look.

## 7. Open questions

- Should drawn pages ever get their own scene (default: yes if UA-26 ships `scenes/inkedPage/fight`, else the Seam tint)?
- Crest for Underjoin: Seam variant with a dashed line (default) or its own (holds unless the owner asks).

## 8. Execution notes

Critical path: UF-1 → FT-4 → FT-12 → FT A2b + B → UD-1 → **Pack 7 proving pass** → six packs (two or three at a time) → Z. About 19 tasks (S 8, M 9, gates 7; nothing is L). Briefs: [ux-districts-briefs.md](ux-districts-briefs.md).

## Review resolution (2026-11-26, review 2)

1. Budget actual board space → FT-D9 owns it; here the real size matrix is in §3 and every district gate uses its largest and a mid size on a staged fixture.
2. One numbered presentation → FT-D1…D3; UD recipes use a frozen **shown** ordinal (`step`), per UF fixtures (R18).
3. Speed and busy input → FT-D4; UD gates check stacked FX at ×4 only through FT's gate, not re-specified here.
4. Tactical meaning under overlap → Proposal 3 splits decorative marks (shape-first, no red/gold/overlay hues, inside the cell, allowlist) from tactical signals (shared overlay vocabulary, never a district hue, may span cells); Proposal 5 gate checks colour/grey/blur with overlap, boss overlap, stacked FX, painted and zero art; BridgeLayer split is FT A2b's, restyle is Pack 3.
5. Bind art to real IDs and mounts → FT-D7/D8/FT-4; here Proposal 6 resolves Underjoin/drawn-page scenes and crests (UA-25/26, tint only as fallback) and the blank-page vs Seam crest conflict.
6. Integration work → FT-D14; here UD-3 owns the Gallery adapter, `fixtures.test.ts` additions and a one-line grant; crest Snippet built at the call site (UD-D4).
7. Runnable inputs and disjoint owners → recipes onto UF's staged `fight-<id>` fixtures (`canals` → `fight-lampwater`), real sizes; per-district test-file pairs; grep covers 11 files and mixed-case ids; Pack 7 proving pass first; failing art held off deploy; R9 failures back to FT with a rerun.
Should-fix: UD-15 lent-heart tell and owned UD-15b; brief hygiene (real test paths, no `tests/districts/lower-seam/`); cuts (shared checklist, one set per candidate, one loop per different interaction).
Decision rows marked "changed after review": UD-D2, UD-D3, UD-D4, UD-D6, Proposal 2 (R7); UD-D5 renumbered (evidence).
