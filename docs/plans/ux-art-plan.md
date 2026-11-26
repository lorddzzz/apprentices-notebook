# UX art: every raster asset in the game (plan UA)

Design: [ux-polish.md](../design/ux-polish.md) §0, §5, §6; art bible = whiteboard §7 + §8 ([snapshot](ux-board-snapshot.txt)); painted targets `docs/design/art-studies/*-v2.png`. Program: [ux-program.md](ux-program.md) (contracts C1–C8 quoted below, never redefined). Roadmap: BL-135. Briefs: [ux-art-briefs.md](ux-art-briefs.md).
State: Drafted (2026-11-26); revised after review 1/3 (see §11 Review resolution)
Scope: the art style sheet in the repo, a measured pilot, anchor studies, then ~20 packs of raster assets delivered as **pure file drops** (C2/C3). No `.svelte` or `.ts` file is touched by any UA pack.

## 1. Scope and settled rules

Settled by the program (cited, not copied): §1 art route (bespoke raster by Codex, vector for UI chrome, overlay and glyphs), fight camera (high 3/4, ~1.3 cells, feet on the cell, short down-right shadow), placeholder first, one art gate UX-G1, masters per the pilot-measured D4 ruling (accepted native-resolution source only; rejects stay outside Git), routing §5 (GPT-6.2 Sol high, `git: true`, branch `art/<pack>`, one return per pack). Bible rules (light top-left, matte gouache masses, texture kept off text and glyphs, tactical marks never painted in) are transcribed by UA-1 and win over the board once merged.

Out of scope: crests (vector, UF/UD), rune glyphs, icons, step markers, tactical overlay, pictograms, level pips, empty-slot frames, tints per district (code). Sound, dark mode: out.

## 2. Proposals (decisions the design leaves open)

- **UA-D1 Ids follow the code, names follow the bible; every game id maps explicitly (R27).** Scope = data `DistrictId` (`seam canals inkQuarter bathhouses bridges foundry cartographers lowerSeam inkedPage`); the style sheet maps bible names: Lampwater = canals, Verloren Corner = inkQuarter, Thermae = bathhouses, Fog Arches = bridges, Klokhof = foundry, Sestante = cartographers, Underjoin = lowerSeam, player-drawn = inkedPage. Subject names for people use the stable data id (`draughtsman`, `stoker`, `runaway`, `notary`, `towelBearer`, `warden`, `tuner`, `copyist`, `exile`, `owner`), not the placeholder names (BL-40 renames), so a rename never moves a file. **Every id in `ENEMY_IDS` (33), the rivals, bosses, loot offer kinds (incl. the `key` offer) and the real threshold locks maps to an ArtId, shared alias or vector fallback in UF's `src/ui/art/inventory.ts` (R27); pack tables derive their counts from enumerated id lists, and conversions (`deadLetter`→`dead-letter`, `chiefWarden`→`chief-warden`, `dissolvedBather`→`bather`) are explicit. `barge` is drawn by canals' CrateArt and `clockSeal` by inkQuarter's StaffToken: they stay vector fallbacks unless a pack's list says otherwise. Game data is never changed for art.**
- **UA-D2 Nine apprentices in the party pack; Marit (`owner`) with the ending pack.** Code has 9 playable (pair + 7 recruits) + the tenth, `owner`, who joins at the handover; the board's "10 apprentices + owner = 11" is off by one. The owner's face and name are kept for the reveal (bible, Underjoin), so her figure, portrait and card are not generated or shipped until pack T (the ending pack, UA-27; "UA-S" in earlier drafts). Every figure also has a 4th asset: a 222×330 household **card** (board §6 household sheet).
- **UA-D3 Boss and rival figures stay 1 cell.** The board draws boss figures 2×2 cells, but the engine has no unit footprint (`EnemyDef`, `RivalDef` have no size) and is frozen. Rivals (people) use the 128×176 figure canvas; the two bosses (Marginalia, lamp-mother) use **192×256, feet y = 232**, centred on their cell and allowed to overlap neighbours by art only. **Redefines** the board's "2×2 cells" (FT must draw by row; no engine change). Foes are 6 rivals + 2 bosses + 25 plain ids (33 in `ENEMY_IDS`; two of the 25, `barge` and `clockSeal`, stay vector fallbacks, so 23 plain foes are painted; counted per pack); the board's "7 boss + 4 rival" becomes 2 bosses + 6 rivals as the code has them.
- **UA-D4 Silhouette crops are derived, not generated.** C4's 48×48 greyscale silhouette is produced by `art:process` from the figure and goes on the contact sheet and Gallery review, not into `src/assets/`.
- **UA-D5 Materials are shared, grounds are per district.** Painted material states (oil, steam, brass plate, fire, the 10 compounds, vents, jars) live in `tiles/shared/`, painted light-neutral so they sit on any ground; districts add floor variants, border tiles, terrain and pieces. Only `plate`, `skidPlate`, `kettle`, `wall` get a `-worn` second state (the layers with hit pips, `PLATE_LIKE` in `board/art.ts`). Corner marks stay vector (FT).
- **UA-D6 FX and flourishes ship as `props/shared/fx-*` / `flourish-*`** (no new family): **one hero frame** per effect (512×128 canvas holding one centred frame, or 128² per effect; `fx-*` 128² alpha, `flourish-*` 512×256), animated by code (FT scales, rotates and fades it). Frame strips only if a later review asks (changed after review: four-frame strips dropped; GPT image models do not hold frames steady).
- **UA-D7 Study header strip is 750×224 (settled, program R12 / UH-D1).** UH's header is 88 CSS px (176 px @2x): the **top 176 px is the header**, the **lower 48 px is bleed behind the seat tabs** (cropped by `object-fit`; keep it calm, shelf and cup sit on the line at y≈176). The study-v2 target shows a window, vine, lamp, shelf and cup. Objects (`book`, `jar`, `desk`, 160×160 cutouts) sit on the shelf line at a fixed baseline and are placed by UH's `RoomObject`s. Night variant only (UH-D13): the day variant is dropped (it was UA-D13's first ladder step).
- **UA-D8 Map: a registered plate, shipped as cropped patches (R19, changed after review).** Generation frame: a registered **750×3800** plate (1:1 @2x of the 1900 CSS px map layer, `MAP_PAGE_HEIGHT`) built from **overlapping panels with shared landmarks** and a fixed placement mask (a single 5.07:1 image exceeds direct generation ratios, so panels are generated and stitched, or a sufficiently large source is cropped after checking resolution). Shipped assets: `map/city/halvemeer` (base, opaque) and `map/city/ink-<district>` as **cropped alpha patches** with `bbox` `[x,y,w,h]` in **master pixels** (top-left); the sidecar records the bbox and UF's `artMeta` exposes it. The map carries **no margin writing** (no lettering, no pseudo-text; illegible hand squiggles are banned). Underjoin's patch counts in the map allowance. The vector layer and patches share one transform at every page width (R19).
- **UA-D9 Tooling is UA's (program R11).** `scripts/art/process.mjs` (cutout trim, resize, WebP, master, silhouette, sidecar skeleton) and `scripts/art/sheet.mjs` (contact sheets) are plain `.mjs` files owned by UA Pack A (Claude); they need **`sharp` as a direct devDependency** (0.35.5 is already in the lockfile as a dependency of `@vite-pwa/assets-generator`, but pnpm's strict layout hides it). **Pack A adds `"sharp": "0.35.5"`, the scripts `art:process`, `art:sheet` and the matching `pnpm-lock.yaml` update to the grant**, after UF Pack 0b (`art:check` and a working decoder) has merged (UF owns `art:check`). The processor has explicit destinations: `--scratch` (anchors, `art-src/anchors/…`, never shipped) and `--ship` (`src/assets/art/…` + `art-src/…`); each pack's Owns lists both, and Pack A exercises both modes. This extends UA's ownership (program §2) by `scripts/art/`.
- **UA-D10 No manifest (dropped, program R10).** Each sidecar declares its `size`; UF's `art:check` checks it against the file and the family rule (UF-P7/UF-D2). The expected asset list of each pack lives in the briefs' tables (and the Gallery art page, UF-7, lists what exists).
- **UA-D11 Anchors live in `art-src/anchors/`** (not `src/assets/`, so they never ship): one contact view per anchor. After UX-G1 the approved *component files* (named individually, with candidate version) get `*.approved.webp` beside them and become the mandatory references for every pack; usable tiles and figures are promoted directly into the real packs. **Anchors are judged at the fight's real cell formula** (measured inner width; ~51 px on 7-column boards, 7×7 Marginalia, 7×9 Lampwater), not 58 px, in the actual overlay or a verified vector copy of it (UX-G1, R22).
- **UA-D12 One promising set per anchor; alternatives only for a failed or undecided trait** (changed after review: three whole sets × two rounds overproduced before any feedback). B1 alone estimated ~60 candidates; now ≈ 20. UX-G1 is shown as **separate 375×812 views** at the real cell size with adjacent figures, material under a figure, intent crossing a figure, HP, preview and charge, in colour and greyscale (never three candidate columns in one phone image). The approval record names the approved component files, candidate version and contact view. Later packs get one return round, then the pack is split.
- **UA-D14 Figure repeatability is processing + review, not luck.** One approved **identity reference** per person; portraits and cards are derived from it by crop or referenced edit. The sidecar carries a **ground-contact point** (source pixels) and body-height range; the processor places that point at the target baseline (y=160, boss y=232) and ignores the shadow/hem/pole tip when trimming; a **standard separate shadow** is composed by the processor (not trimmed with the figure). Floor variants share edge pixels (offset-wrap, repair seams) and are tested in **mixed A–D neighbours**, not only self-tiling. Each prompt carries the subject reference, a clean style crop and the palette strip; outputs are compared against the approved sample's dominant value masses and inspected at native and display size for lettering, pseudo-labels and copied UI.
- **UA-D15 Masters (D4 ruling, changed after review).** The pilot measures. Default: commit only the **accepted native-resolution source** of each shipped asset (not rejects, not contact-sheet candidates); the sidecar records original dimensions, hash, crop/anchor, processor version, quality and reference hashes. Rejects and regenerable full-size sheets stay outside Git. If the pilot projects > 300 MB of masters, switch to an external archive with hashes in Git. The player question about this is in the decisions review.

## 3. Current implementation and risks

Checked: `package.json` (no `sharp`/`cwebp`; `pnpm icons` only), `src/ui/components/board/art.ts` + `tones.ts` (all board art is SVG; `PLATE_LIKE`, `CLOUD_LIKE`, `maxHits`), `src/app/view.ts` (`LayerId` = 5 states + 10 compounds; `TileView` adds vent, drop, water(Dir), grate, gate, lamp, jar, piece), `src/data/{apprentices,recruits,enemies,rivals/*}`, `src/data/districts/*` and `src/ui/districts/*` piece components (inkQuarter: address, clock, forward, order, return, wax; canals: crate, mooring; bridges: pier, span, keystone; foundry: bell, greatBell, rope, hook; cartographers: pencil, outline, blank). There is no `src/assets/`, `art-src/` or `docs/art/` yet. The two v2 studies disagree: Pell wears a flat cap in `seam-v2.png` and a flat brim in `lampwater-v2.png`; Joost's build differs. The bible (flat brim) wins; UA-3 settles it.

Risks, riskiest first:
1. **Figure consistency across ~50 figures** from an image model with no seeds. Mitigation: anchors with a turnaround-free recipe (one approved figure per type as reference, the same pose family, flat neutral backdrop for cutout, ref image attached on every call), silhouette check at 24 px greyscale before commit. Settled first by UA-3.
2. **Cutout quality** (alpha edges, shadow). Mitigation: ask the model for a transparent background; `process.mjs` rejects a matte fringe (edge-luminance halo test on white and dark) and the baked shadow is a soft alpha blob inside the canvas (baseline y = 160).
3. **Budget C5**: estimated 4.0–4.3 MB for shared + home against the settled 4.5 MB (UA-D13, program C5; table §6). The pilot (UA-P) samples a full-height scene, transparent edges, four mixed tiles and the map before the caps are confirmed; UA-9 then confirms the real number; the ladder in §6 applies if it does not hold.
4. **Scale of repo growth**: not measured. The pilot (UA-P) measures masters, contact sheets, rejects and incremental Git growth separately; the decision is UA-D15. Planning assumptions (4.5 MB shared+home, 15 MB total, 120 MB masters) are unmeasured until then.
5. Models drift from the bible when prompts get long. Mitigation: a fixed prompt skeleton (preamble §3 of the briefs) and the style sheet's one-paragraph "house style" pasted verbatim.

## 4. Contracts

**Provides** (to UF, FT, UH, UT, UD, UE): files at `src/assets/art/<family>/<scope>/<subject>[-<state>].webp` per C2, with sidecar (role, size, bbox/slice, ground-contact) and master record per C3/UA-D15 and sizes per C4 (no manifest, R10). `docs/art/style-sheet.md` (palettes, rules, the district-name map), `docs/art/contact/<pack>.png`, and a **per-pack ArtId list** in the briefs (the consumers' "which ids exist" list; `import.meta.glob` is the truth at runtime).

**Consumes**: C2 `artUrl(id)` and `<ArtImage>` (UF-2, Pack 0b) only to view art (Gallery art page, UF-7); C3 `pnpm art:check` (UF-2) as the commit gate; C4/C5 sizes and budget; C1 `[data-district]` swatches (UA-1 supplies the hex values UF-1 puts in `theme.css`: these must match; UF-1 already carries the board §7 hexes, and UA-1's style sheet §3 must equal them, a UA-1 check).

**Owed** (for the status file): `sharp` + `art:process` / `art:sheet` scripts in `package.json` (UA Pack A, granted edit after UF-2, R11); Gallery art page listing a family/scope (UF-7) and the greyscale toggle (UF-6); FT-20 accepting the single-frame FX fallback (UA-D6) and FT-19 using the `flourish-*` ids; FT-22 drawing bosses from the 192×256 canvas over a 1-cell footprint (UA-D3, R13); UH-1/UH-2 using the 750×224 strip (R12); UH-8…UH-14, UT-4…UT-9, UE-1…UE-3 using the ids in the briefs; UD-4…UD-15 using each district pack's ids (UA-20…UA-26); the Underjoin map ink-in overlay (pack R, UA-25) used by UT-4; Marit assets (UA-27) used by UH-6/UE-3 after the reveal rule.

## 5. Packs (all briefs in ux-art-briefs.md)

Phase column = program §4. "UF-2" = UF's registry + `art:check` merged (UF Pack 0 = UF-1…UF-4). No pack edits code; Codex packs commit on `art/<pack>`.

| Pack | Tasks | Role | Runner | Phase | Depends on | Assets (shipped) | Est. size |
|---|---|---|---|---|---|---|---|
| **P Pilot** | UA-P one referenced figure, one ground tile, one scene crop: generation → processing → binary handoff (Git-enabled Codex clone) → re-open in a clean checkout; log observed image tool, whether the image model is exposed, refs, accepted bytes, elapsed time, retries; measure masters/Git growth; re-estimate packs | Strong | Codex (after A's processor) | 0 | A (processor), UF Pack 0b | 0 (pilot files discarded or kept as anchors) | n/a |
| A Bible & tooling | UA-1 style sheet + recipe, UA-2 `scripts/art/*` (scratch + ship modes) | Default | Claude Sonnet high | 0 | UA-1 none; UA-2's `package.json` + `pnpm-lock.yaml` grant after UF Pack 0b and a working decoder (UA-D9) | 0 | 0 |
| B1 Anchors (fight, study, party) | UA-3 party silhouettes, UA-4 Seam composite, UA-5 Lampwater composite, UA-6 attic study | Strong | Codex | 0 | A, **P** | 0 (anchors) | n/a (≈20 candidates, not 60) |
| B2 Anchors (story) | UA-7 owner's map plate (panels), UA-8 Sestante (needs a Seam comparison from B1 for its final sheet) | Strong | Codex | 0 | A, P (B1's Seam comparison for the final sheet) | 0 (anchors) | n/a |
| **UX-G1** | player approves component files in separate real-size views (R22) | gate | player | 0 | B1, B2 | | |
| C Party | UA-9 nine apprentices (figure, portrait, card), derived from one identity reference each | Strong | Codex | 1 | G1 (scaling), UF Pack 0b, FT-5s (the measured cell formula) | 27 | 0.55 MB (re-estimate after P) |
| D Seam fight | UA-10 materials, UA-11 Seam ground, scene, foes, Marginalia | Strong | Codex | 1 | G1, UF Pack 0b, FT-5s; **C's figures (or approved B1 copies) for the composite** | 35 (enumerated: 20 materials + 2 jars + 2 scenes + 5 grounds + 5 foes + 1 portrait; the count is derived from the list) | 1.0 MB |
| E FX | UA-12 FX hero frames and flourishes (one frame each; code animates) | Default | Codex | 2 | D | 12 | 0.2 MB |
| F Lampwater | UA-13 Lampwater ground, props, foes, lamp-mother, lamplighter (named files only; K owns canals crossroads/threshold) | Strong | Codex | 2 | G1, D (materials) | 24 | 1.0 MB |
| G Home | UA-14 header (night, 750×224), objects, plates, tiles, door (named files) | Strong | Codex | 3 | G1, A | 15 | 1.0 MB |
| H Room strips | UA-15 Bench, Desk, Codex strips, margin paper, vignette (**after G merges**) | Default | Codex | 3 | G (explicit order G → H → I) | 6 | 0.3 MB |
| I Transitions and homecoming | UA-16 two plates, rain-light, homecoming (**after G**; H and I may then run in parallel) | Default | Codex | 3 | G | 4 | 0.8 MB |
| J Map | UA-17 base plate from registered panels + 7 cropped ink patches (Underjoin's is in R); no margin writing | Strong | Codex | 4 | G1, B2 | 8 | ≤ 0.8 MB with Underjoin counted (re-measure at the pilot) |
| K Trip scenes | UA-18 crossroads ×7, stair, wiped, **threshold scenes only for the five real locks** (canals, inkQuarter, bathhouses, foundry, cartographers) | Default | Codex | 4 | G1, A | 14 | 1.2 MB (spread by district) |
| L Finds | UA-19 find art: one look per kind first (rune, method, ink, solvent, vellum, doorway, recruit); `key` offer keeps its existing card/vector fallback (R27) | Default | Codex | 4 | G1 | 7 | 0.15 MB |
| M Verloren Corner | UA-20 (named files only; K owns its crossroads/threshold) | Strong | Codex | 5 | G1, D, K | 19 | 0.9 MB |
| N Thermae | UA-21 | Strong | Codex | 5 | same | 14 | 0.8 MB |
| O Fog Arches | UA-22 | Strong | Codex | 5 | same | 19 | 1.0 MB |
| P Klokhof | UA-23 | Strong | Codex | 5 | same | 16 | 0.9 MB |
| Q Sestante | UA-24 | Strong | Codex | 5 | same + B2 | 15 | 0.9 MB |
| R Underjoin | UA-25 (map patch counted in the map allowance; verify its rendered slot below Seam first) | Default | Codex | 5 | same | 8 | 0.5 MB |
| S Player-drawn | UA-26 | Default | Codex | 5 | **G1 (and D for materials)**; M–R not required | 3 | 0.3 MB |
| T Ending | UA-27 handover scene, drawing-table strip, Marit figure/portrait/card | Strong | Codex | 6 | G1, G | 5 | 0.45 MB |

Task rows (ledger-visible; one row per UA task, counts as in the pack table; the briefs hold the lists):

| ID | Pack | Task |
|---|---|---|
| UA-P | P Pilot | one figure, one tile, one scene crop through the whole pipeline; measure |
| UA-1 | A | style sheet, recipe, review checklist |
| UA-2 | A | `scripts/art/*` (scratch + ship), `sharp`, `art:process`/`art:sheet` grant |
| UA-3 | B1 | party silhouettes (Pell, Joost, Hanneke) anchor |
| UA-4 | B1 | Seam composite anchor |
| UA-5 | B1 | Lampwater composite anchor |
| UA-6 | B1 | attic study anchor |
| UA-7 | B2 | owner's map plate anchor |
| UA-8 | B2 | Sestante anchor |
| UA-9 | C | nine apprentices (27 files) |
| UA-10 | D | shared materials + jars (22) |
| UA-11 | D | Seam ground, scenes, foes, Marginalia (13) |
| UA-12 | E | FX hero frames and flourishes (12) |
| UA-13 | F | Lampwater (24) |
| UA-14 | G | home header, objects, plates (15) |
| UA-15 | H | room strips (6) |
| UA-16 | I | transitions and homecoming (4) |
| UA-17 | J | map base + seven ink patches (8) |
| UA-18 | K | trip scenes (14) |
| UA-19 | L | finds (7) |
| UA-20 | M | Verloren Corner (19) |
| UA-21 | N | Thermae (14) |
| UA-22 | O | Fog Arches (19) |
| UA-23 | P Klokhof | Klokhof (16) |
| UA-24 | Q | Sestante (15) |
| UA-25 | R | Underjoin (8) |
| UA-26 | S | player-drawn (3) |
| UA-27 | T | ending (5) |

Order notes: **pilot first**, then B1 and B2 run in parallel (disjoint `art-src/anchors/<name>/`). C and D run in parallel after G1 (disjoint scopes; both wait for UF-2). Districts M–Q may run two at a time. Ids and exact lists: briefs. Total shipped ≈ 250 assets, ≈ 12–13 MB (C5 total ≤ 15 MB holds with slack); **all pack sizes are re-estimated after the pilot**; the combined install (precache) is budgeted as well as source WebPs.

## 6. Budget estimate against C5 (WebP q80, painted; planning assumptions, **unmeasured until the pilot**; decimal MB)

| Scope | Estimate | C5 | Note |
|---|---|---|---|
| shared | party 0.55, materials+jars 0.25, FX 0.4, finds 0.25, transitions 0.8, stair/wiped 0.25, ending 0.2 ≈ 2.7 MB | with home ≤ 4.5 MB (UA-D13) | |
| home | header 0.12 (night only), plates 0.5, objects 0.05, strips 0.3, homecoming 0.15, handover 0.3 ≈ 1.5 MB | | **shared + home ≈ 4.2 MB: inside the 4.5 MB budget (UA-D13)** |
| each district | scenes 0.3, grounds/terrain 0.2, props 0.1, foes 0.15, rival 0.05, crossroads 0.1, banner 0.15 ≈ 0.9–1.1 MB | ≤ 1.5 | fits |
| map | base 0.45 + patches (7 + Underjoin) ≈ 0.2 = 0.65; eight full 750×3800 layers would decode to ~98 MiB, so only cropped patches ship (R19) | ≤ 0.8 | to be measured |

Mitigation ladder if UA-9/UA-14 measurements overshoot 4.5 MB: (1) ~~drop the daytime header variant~~ already done (UH-D13); (2) q76 for scenes ≥ 750×800 (−0.25); (3) ask the player to move the C5 number. Settled: **UA-D13 shared + home 4.5 MB** (program C5, decisions review D5); reversible, total still ≤ 15 MB.

## 7. Verification

- **Pilot (UA-P) records:** observed image tool; whether the image model is exposed ("unexposed" if not; a Codex worker model name does not establish image capability); input refs; accepted bytes; elapsed time; retries; masters bytes, contact-sheet bytes, rejects and incremental Git growth (separately); decoded dimensions; built precache and install size; cold reload offline under the deployed base path after SW activation.

- Review also checks every output at native and display size for lettering, pseudo-labels and copied UI; compares dominant value masses against the approved sample; tests floors in mixed A–D neighbours; figure foot at (64,160) within tolerance (boss equivalent) on light and dark tiles.
- Each pack: `pnpm art:check` passes (sidecar, sidecar-declared size vs file and family rule, alpha, budget); `pnpm art:sheet <pack>` renders `docs/art/contact/<pack>.png`; the pack's report lists the checks below it ran.
- Orchestrator review per pack (the bible's "Review at 375×812", plus these): Gallery art page at 375×812; greyscale toggle; party and foe silhouettes at 24 px; every figure on the widest grid (7×9) overlapping the row behind: feet and shadow on both a light and a dark tile; material states side by side for a distinct silhouette and corner area (oil sheen+drop, steam scalloped, brass squared); no painted text, UI chrome, reach dots, arrows or rings in any asset (checked by eye on the contact sheet); a transparent asset has a clean edge on `#fff` and `#101820`.
- At phase end, one full-loop phone run happens in the other plans' packs; UA adds the **per-district greyscale + squint** pass (UD owns the code, UA owns the sheet): a district pack's board composite in greyscale must keep tile states, figures and overlay readable.
- `docs/art/review-checklist.md` (UA-1) is the one list the orchestrator and UF-7's Gallery art page use.

## 8. Open questions (defaults held)

- Day header variant: dropped (UH-D13 settles night only).
- Underjoin: `lowerSeam` has map data (50%, 92%) but renders as a slot below Seam in `Map.svelte`; pack R verifies the rendered location before paying for a patch (counted in the map allowance); drop if UT never draws that node.
- A raster crest set (7) instead of vector: default vector as the board says.
- Whether `foes` that are tokens (letter, dead letter, bather) read better as figures or small props: default figures on the 128×176 canvas, shorter ones keep the baseline.
- Header 750×224 and the manifest question are settled (R12, R10); nothing open here.

## 9. Execution notes

Critical path for art: A (≈1 h Claude; its `package.json` + lockfile edit waits for UF Pack 0b) → **P pilot** (≈2 h, measures everything, re-estimates) → B1 (≈1–2 runs of 90 min: ≈ 20 candidate images, one set per anchor) → **UX-G1** → C/D → E/F → G … Art never blocks code (placeholders). Parallelism: B1 ∥ B2; C ∥ D; G first, then H ∥ I (G → H, I); districts two at a time. Rough size: A = 1 M; each Codex pack ≈ one L (2–3 h of generation, one regeneration round expected); 20 packs ≈ 25–35 Codex hours is a planning assumption, re-estimated after the pilot. Close for UA: all packs merged, `art:check` green on `main`, per-scope totals recorded in the program log, the style sheet's "known drift" section filled from review notes.

## 11. Review resolution (review 1 plus review 3 #5 for the UA side)

| Must-fix | How resolved |
|---|---|
| R1-1 Asset contract | Roles declared in sidecars (C3, UF-P7); briefs' sidecar template adds `role`, `groundContact`, `masterRef`; sizes per role; nothing about prompts/refs/masters ships. |
| R1-2 Round trip | New pilot pack UA-P (R23) before anchors: one referenced figure, one ground tile, one scene crop through generation → processing → binary handoff → clean-checkout reopen, logging tool/model exposure/refs/bytes/time/retries; processor has explicit scratch/ship destinations (UA-D9); map built from overlapping panels (UA-D8). |
| R1-3 Repeatability | UA-D14: ground-contact point, standard separate shadow, one identity reference per person, portraits/cards derived, floor variants share edges and are tested in mixed A–D neighbours; lettering/value-mass review. |
| R1-4 UX-G1 | UA-D11/D12 and R22: real cell formula, separate phone views, one set per anchor, approval names component files; usable tiles/figures promoted directly; B2 gets B1's Seam comparison. |
| R1-5 Inventory | UA-D1/R27 mapping (UF data + test); Pack D count derived from the enumerated list; K paints only the five real locks; L covers the `key` offer by existing fallback. |
| R1-6 Wave 0 split | UF's Pack 0a/0b/0c (see UF plan); UA depends on 0b only. |
| R1-7 Ownership/prereqs | UA Pack A (UA-2) gets `pnpm-lock.yaml` after Pack 0b; plan files committed before spawn (R24); named-file Owns for F/K, J/R, G/H/T, C/T (briefs); G → H/I ordering; D needs C's figures or approved B1 copies; S needs G1; UF-7 is final-review only; pack timeout keeps accepted partial assets on an exportable branch with missing ids attached; fast gate before commits; sizes re-estimated after the pilot. |
| R1-8 Gates | UA §7 adds pilot install/offline measurements, native/display lettering review and per-district greyscale pairs (R25). |
| R3-5 Map | UA-D8/R19: patches with bbox in master pixels, no margin writing, both hearsAs excluded from frontier marks is UT's. |
