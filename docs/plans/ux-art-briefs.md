# UX art: Codex art-worker preamble and pack briefs (plan UA)

Plan: [ux-art-plan.md](ux-art-plan.md). **Dispatch precondition (R24): the plan files, board snapshot and art studies are committed on `main` at the base SHA; the orchestrator verifies every input a brief lists exists at that SHA before spawning.** Program contracts C1–C8: [ux-program.md](ux-program.md) §3. Paste **§1 (preamble) + the pack's brief** into the Codex spawn (Whiteboard `git: true`, branch `art/<pack>`). Pack A (Claude) uses the standard `pack-worker` spawn with its brief only.

## 1. Codex art-worker preamble (paste before every Codex brief)

```
You produce ONE ART PACK for The Apprentice's Notebook: raster assets as pure file drops. You never edit .svelte, .ts, .css, package.json, DESIGN.md, TECH.md, docs/design/*, the roadmap or any status file. You own only the paths the brief lists.

START
1. Work only in your clone (a Git-enabled Codex clone). Check root and HEAD, create branch art/<pack> from HEAD, run `pnpm install --frozen-lockfile --prefer-offline`. Log at the top of your report: the observed image tool, whether the image model is exposed ("unexposed" if not; a worker model name does not establish image capability), input references attached, accepted bytes, elapsed time and retries.
2. Read AGENTS.md, docs/art/style-sheet.md (the house style, palettes, negative rules; it wins over the board) and only what the brief lists. Open the brief's reference images (art-src/anchors/**/*.approved.webp and listed assets).

TOOLS
- Generate with the image tool (image generation with reference images). Each prompt carries: the subject's identity reference, a clean style crop of the approved anchor and the palette strip. Attach them on EVERY call. Ask for a transparent background for cutouts (figures, props, material states, plates). Generate at the largest size offered, then downscale; never upscale.
- Process with `pnpm art:process` (scripts/art/process.mjs, sharp). Two destinations: `--scratch` (anchors: writes under `art-src/anchors/...`, never shipped) and `--ship` (writes `src/assets/art/<ArtId>.webp` + `art-src/<ArtId>.json` + the master record); each brief's Owns lists both paths. `pnpm art:process <raw.png> <ArtId> --ship --role <role> --size WxH [--alpha] [--ground-contact x,y] [--baseline 160] [--slice t,r,b,l] [--bbox x,y,w,h] [--tile]` trims **by the declared ground-contact point and body-height range, not by alpha extent** (a shadow, hem or pole tip never moves the feet), places the contact at the target baseline, composes the standard separate shadow, enforces the role's size, writes WebP (q80; q76 for scenes >= 750x800), a skeleton sidecar with the role and the **master record** and the 48 px greyscale silhouette for figures. **Masters (UA-D15):** keep only the accepted native-resolution source of each shipped asset (`art-src/<ArtId>.master.webp`, or per the pilot's archive rule); the sidecar records original dimensions, hash, crop/anchor, processor version, quality and reference hashes. Never commit rejects, contact-sheet candidates or regenerable full-size sheets. Rejects an alpha edge halo (matte fringe). If the script is missing, stop and report; do not hand-roll another tool.
- Keep raw generations in /tmp, not in the repo.

STYLE (verbatim house style; the style sheet has the full text)
"Painted 2D game art, broad matte gouache-like value masses, fine paint grain, sparse engraved ink detail at material edges. Light from the upper left. Warm lamp light against cold blue night; wet surfaces catch small highlights. Soft distant detail. No text, no letters, no numbers, no UI, no frames, no arrows, no grid lines, no reach dots, no health bars, no targeting rings, no watermark."

PROMPT SKELETON (fill every slot; store the final text in the sidecar)
"[ASSET: subject, pose, size on canvas]. [CAMERA: overhead square ground | high 3/4 standing figure, feet on the bottom-centre baseline, short soft shadow down-right | flat scene]. [LIGHT: top-left key; local lamp light; district swatches #dark #mid #light]. [PALETTE: world and district hexes from the style sheet]. [EDGES/TEXTURE]. [SILHOUETTE KEY: the one shape that must read at 24 px]. [REFERENCES: 'match the style, proportions and finish of the attached approved anchors']. [NEGATIVE: house negatives]."

RULES
- Figures: canvas 128x176 alpha (bosses 192x256), the declared ground-contact point lands at (64,160) (bosses (96,232)) within the checker's tolerance; the standard shadow is composed by the processor (generate the figure WITHOUT a baked shadow), about 1.3 cells tall, no side rim (the rim is code), a faint top-left edge light only. One approved identity reference per person; portraits and cards are derived from it (crop or referenced edit), never generated afresh.
- Tiles: 128x128. Ground tiles opaque and seamless at all four edges; floor variants A-D share edge pixels (offset-wrap, repair seams) and are checked in MIXED neighbours (A|B, B|C, A over D...) as well as self-tiling 3x3. Material states: alpha, content inside the cell, a distinct silhouette that reads in greyscale; NO corner marks, no pips (vector, FT).
- Portraits 192x192 opaque, head and shoulders, the figure's own colours, plain painted backdrop in the district's mid swatch; the same silhouette marker as the figure. Cards 222x330 opaque, three-quarter bust, same marker.
- Scenes and plates: exact sizes from the brief. Keep the central 60% of a scene calm (UI sits on it); no figures in fight scenes (units are separate layers).
- Never paint: text, tactical marks (red arrows, dots, outlines, rings, step numbers, HP), or UI. Fight scenes are muted: lower contrast and saturation than tiles, so tiles and units pop.
- Two rounds of regeneration per asset at most. Pick the best, note rejects in the pack report (outside Git). Anything that fails the checks below is not committed. **Timeout:** if the budget ends, keep accepted assets on an exportable branch (`git format-patch` incl. binaries) and list the exact missing ArtIds in the report.
- Inspect every output at native AND display size for lettering, pseudo-labels, copied UI, and compare its dominant value masses with the approved sample.

SIDECAR (art-src/<ArtId>.json, one per shipped asset; C3)
{ "id": "<ArtId>", "screen": "...", "district": "<DistrictId|home|city|shared>", "subject": "...", "state": null,
  "role": "<tile-opaque|material-overlay-alpha|figure|boss-figure|portrait|card|strip|scene|map-plate|map-patch-with-bbox|nine-slice>", "size": [w,h], "alpha": true|false, "groundContact": [x,y]|null, "master": {"path": "...", "origSize": [w,h], "sha256": "...", "processor": "<version>", "quality": 80, "refSha256": ["..."]}, "crop": "...", "focal": [x,y], "angle": "overhead|high-3/4|flat",
  "light": "top-left; ...", "palette": ["#..",".."], "model": "<image model id>", "prompt": "<full final prompt>",
  "references": ["art-src/anchors/.../x.approved.webp", ...], "generationId": "<id or null>", "seed": null,
  "date": "YYYY-MM-DD", "pack": "<pack>", "slice": [t,r,b,l]|null, "bbox": [x,y,w,h]|null, "layerId": "<LayerId|null>" }

CHECKS BEFORE COMMIT (each must hold; list results in the report)
0. Use the project fast gate before commits (`pnpm check:fast` or the narrower `pnpm art:check`; the art validator is part of both `check` and `check:fast`).
1. `pnpm art:check` passes (sidecar, role rule, decoded size and alpha, master record, bbox/slice bounds, budget; there is no manifest).
2. `pnpm art:sheet <pack>` renders docs/art/contact/<pack>.png: every asset on light (#E9DFC8) and dark (#101820) backgrounds, greyscale row, 24 px row for figures/portraits, 3x3 tiling and mixed A-D neighbours for ground tiles, the board crop at 375 wide for scenes.
3. Greyscale + 24 px: each figure/portrait is told apart from its siblings by silhouette alone.
4. No painted text/UI/tactical marks, no pseudo-lettering (look at every asset once at native size and once at display size).
5. Transparent assets show no halo on #fff and #101820.

COMMIT (stage explicit named paths only, never a directory glob shared with another pack: src/assets/art/<pack's named files>, art-src/<same>, docs/art/contact/<pack>.png)
`art(<pack>): <UA-ids> <summary>`, body = asset count, size total, rejects; end with the attribution line the session gives. Also write `git format-patch --binary` of the commits to /tmp/<pack>.mbox; the orchestrator applies it in a clean checkout and re-opens the images to confirm the binary handoff.

REPORT once, under 250 words: branch, assets by ArtId count vs the brief, bytes shipped vs the estimate, contact sheet path, check results 1-5, rejects and drift you noticed, PROPOSALS (anything the brief did not decide).
```

### Palettes (the style sheet §3 holds these; board §7 swatches)

| Scope (id) | Bible name | dark | mid | light |
|---|---|---|---|---|
| seam | The Seam | #253235 | #55625E | #BC9273 |
| canals | Lampwater | #172C39 | #456675 | #BC8A57 |
| inkQuarter | Verloren Corner | #272632 | #656475 | #A28D6D |
| bathhouses | The Thermae | #25373B | #5F8482 | #ACC7BE |
| bridges | The Fog Arches | #252F39 | #596D79 | #ADBBBC |
| foundry | Klokhof | #292A2A | #6F6956 | #B19060 |
| cartographers | The Sestante | #28323A | #768890 | #D5D7CC |
| lowerSeam | The Underjoin | #232D30 | #535E59 | #8F9280 |
| inkedPage | Player-drawn | #373239 | #867A72 | #D9CDB5 |
| home | Attic study | sample from `study-v2.png` (UA-1 records: lamp amber, window blue, timber brown, paper cream, ink) | | |

Apprentice accent hues (small clothing accent only): slate, rust, amber, moss, teal, plum, rose, ochre, indigo (owner: gilt).

---

## 2. Pack briefs

### Pack A: Bible and tooling (Claude; UA-1, UA-2)

```
Pack A of docs/plans/ux-art-plan.md: tasks UA-1 → UA-2.
Base commit: <main at spawn; plan files committed here>. Budget: 90 min pack, 30 min per command.

Read: ux-board-snapshot.txt sections 7-art and 8-studies; ux-art-plan.md §2–§4; docs/design/art-studies/*-v2.png (look).
Own: docs/art/ (README.md, style-sheet.md, review-checklist.md, recipes/, contact/ placeholder), scripts/art/ (process.mjs, sheet.mjs, README), and by grant (R11/R24) the direct `sharp` devDependency, the `art:process` / `art:sheet` entries of package.json and the resulting `pnpm-lock.yaml` change.
Contract (on main):
C2 `src/assets/art/<family>/<scope>/<subject>[-<state>].webp`, family ∈ scenes|tiles|props|units|portraits|foes|map|ui-plates|crests|finds, scope = district id | home | city | shared. C3 each asset has art-src/<same path>.json + .master.webp; `pnpm art:check` fails on missing sidecar, wrong size, missing alpha, district over budget. C4 tile 128², figures 128×176 (feet y=160), portraits 192², strips 750×N, Study header strip 750×224 (top 176 px header, lower 48 px bleed behind the seat tabs, R12), full-bleed 750×1624, map 750×3800 (UT-D8), bosses 192×256 (R13), WebP q80. C5 shared+home ≤ 4.5 MB (UA-D13), district ≤ 1.5, map ≤ 0.8, total ≤ 15. There is no manifest (R10): sidecars declare size and UF-2's `art:check` checks it.
Owed by this pack: scripts (UA-D9). Granted additive edit to package.json (program R11): devDependency "sharp": "0.35.5" and scripts art:process, art:sheet. Sequence the package.json + lockfile edit AFTER UF Pack 0b (art:check, role decoder) has merged and its decoder works on a sample; rebase on it. UF owns art:check. `pnpm install --frozen-lockfile` must pass in a clean clone after your change.

Done when:
- UA-1: style-sheet.md contains: §1 art vision per world (attic, map, city); §2 paint/light/edge/texture rules; §3 palette tables (the nine district triples above, home swatches sampled from study-v2.png as hex, city/night tokens) plus the board-name→DistrictId map; §4 figure rules and the silhouette key per figure (Pell: slim, long flat brim, folio; Joost: broad, bareheaded, dark beard, leather apron; Hanneke: pointed rain hood, narrow cape, hooked pole; Floris, Mieke, Willem, Tess, Nelle, Wessel from the table in pack C, checked against docs/design/party.md §2 and names-and-voice.md; pronouns from those docs, never invented); §5 prompt recipe template; §6 negative rules; §7 naming (kebab-case subject, `-state` suffix, layer ids to kebab, people by data id); §8 contact-sheet format; §9 acceptance at 375×812 (the bible's list); §10 "known drift" (empty) and the v2-study conflicts (Pell cap vs brim). review-checklist.md lists the orchestrator review steps of ux-art-plan.md §7. §3 must carry the same nine swatch triples as UF-1's theme.css blocks (compare, report a mismatch to the orchestrator). The briefs' tables are the expected asset lists (no manifest).
- UA-2: `node scripts/art/process.mjs` and `sheet.mjs` work in BOTH modes (`--scratch` for anchors, `--ship` for shipped files, with explicit destinations) on a sample: **a figure whose shadow, hem or pole tip extends below the feet** (foot at source ground-contact lands at (64,160) within tolerance on light and dark tiles; boss equivalent at (96,232)), an alpha-edge halo case, a role-rule failure, and a floor set with the mixed A–D neighbour check. Masters/sidecar follow UA-D15. Both pass `pnpm lint`. A README shows the commands. Prove that a processed asset passes UF's `art:check`.
Verify: `pnpm lint`, `pnpm install --frozen-lockfile` in a clean clone, and both scripts on the samples (temp files deleted).
Phone check: no
```

### Pack P: Pilot (Codex; UA-P). Branch art/pilot. Depends on A (UA-2 processor) and UF Pack 0b

```
Pack P (pilot) of docs/plans/ux-art-plan.md: task UA-P. Branch art/pilot.
Base commit: <main at spawn; plan files, studies and Pack A's processor committed here>. Budget: 120 min pack, 30 min per command.

Purpose: prove the pipeline and measure it BEFORE any anchor is generated. Three assets only:
1. ONE referenced figure: Pell (draughtsman), 128x176, generated from an attached subject reference and a style crop of docs/design/art-studies/lampwater-v2.png, WITHOUT a baked shadow; processed with --ground-contact; a hem or pole extending below the feet is fine.
2. ONE ground tile: tiles/seam/floor-a, 128² opaque, plus a second variant floor-b sharing edge pixels; test self-tiling and the A|B mixed pair.
3. ONE scene crop: a muted 750×800 Seam fight scene with no figures.
Handoff: commit on art/pilot from the Git-enabled Codex clone; `git format-patch --binary` to /tmp/pilot.mbox; the orchestrator applies it in a CLEAN checkout and re-opens all three images, runs `pnpm art:check`, and opens them at 375×812.
Own: art-src/pilot/** and, for the three shipped test copies, units/seam-pilot, tiles/seam-pilot, scenes/seam-pilot (named paths; the orchestrator removes or promotes them), docs/art/contact/pilot.png.
Report (the pilot log): observed image tool; whether the image model is exposed ("unexposed" if not); input refs attached; accepted bytes (shipped and master separately); elapsed time per asset; retries; Git growth per asset; decoded dimensions; whether the binary patch applied cleanly in a clean checkout; the foot at (64,160) check on light and dark tiles; built precache and install size with these assets; cold reload offline under the deployed base path after SW activation (orchestrator).
Then the orchestrator RE-ESTIMATES every pack size and the D4 master rule (accepted native source only; if projected masters > 300 MB, switch to an external archive with hashes in Git) and updates ux-art-plan.md §5/§6 and the decisions review.
Verify: `pnpm art:check && pnpm art:sheet pilot`
Phone check: no
```

---

### Pack B1: Anchors, fight/study/party (Codex; UA-3 → UA-6)

```
Pack B1 of docs/plans/ux-art-plan.md: tasks UA-3 → UA-4 → UA-5 → UA-6. Branch art/anchors-1. After the pilot and Pack A.
Base commit: <main at spawn>. Budget: 150 min pack, 30 min per command.

Read: docs/art/style-sheet.md; board snapshot §7 (art-fight-*, art-anchors-*) is summarised in it; look at docs/design/art-studies/{seam-v2,lampwater-v2,study-v2}.png as targets, not finals.
Own: art-src/anchors/{party,seam,lampwater,study}/** (scratch destination) and docs/art/contact/{anchors-1.png,g1/**}. Nothing in src/assets/art (usable tiles and figures are promoted into their real packs by the orchestrator after approval).
Contract: anchors are NOT shipped (UA-D11; use `--scratch`). Output per anchor: **ONE promising set** (`v1`) processed to final sizes so approved components can be promoted by copying. Produce an alternative (`v2`) ONLY for a specific trait that failed or is undecided (name the trait in the sidecar). The identity reference per person (Pell, Joost, Hanneke) is the first deliverable; portraits and cards derive from it.
Owed by this pack: the UX-G1 views (below) and a **Seam comparison** image (the Seam composite at real size, art-src/anchors/seam/comparison.webp) for B2.

Done when:
- UA-3 party silhouettes: figures 128×176 for Pell (draughtsman), Joost (stoker), Hanneke (runaway), one set (a v2 only for a failed trait), plus a 192² portrait per figure derived from the same identity reference. Silhouette keys as in the style sheet. On the sheet: all three side by side at 24 px greyscale and at the **real cell size (~51 px on 7-column boards)** on a Seam floor tile and a Lampwater quay tile. Flat brim on Pell, not a cap.
- UA-4 Seam composite: one ground-tile set (floor-a..d, 128² opaque seamless with shared edges: damp masonry, patched floor, vent haze), material states (oil `slick`, steam `cloud`, brass `plate`, `vent`) on alpha, Pell, Joost and a brass sentry (128×176), assembled by `art:sheet` in the real camera: **7 columns × 7 rows (Marginalia's board) using the fight layout's measured inner width and cell formula (~51 px, not 58)** on a muted Seam scene (750×800), the real overlay or a verified vector copy of it (drawn by the sheet script, NOT by the model), plus the greyscale version. Two adjacent brick courses that barely meet appear somewhere in the scene (bible).
- UA-5 Lampwater composite (7×9 board, same cell formula): same method: floor/quay tiles, water with directional flow (water tile painted flowing down; the sheet script draws the crisp flow arrow), quay lamp pool, canal eel, Hanneke, lit quay and a lamp post; Pell + Joost from UA-3 as references. Light: amber lamps on blue-black water.
- UA-6 attic study: one candidate of the full 750×1624 study composition (empty page, seat tab row, drawer, door) as one painted reference matching study-v2.png: warm lamp, blue window with rain, worn timber, rubbed paper page with room to write; NO text anywhere (UI labels are code; leave plain paper tabs and empty plates). Plus the header crop 750×224 (one candidate).
- **UX-G1 views**, each a SEPARATE 375×812 image (never three candidate columns in one phone image): (1) Seam 7×7 board with adjacent figures; (2) a material under a figure; (3) an intent arrow crossing a figure; (4) HP, preview and charge states; (5) Lampwater 7×9 with the same; each in colour and greyscale. Saved under `docs/art/contact/g1/`.
Verify: `pnpm art:sheet anchors-1` runs; every anchor component has a sidecar.
Phone check: no (the player reviews the sheet at 375×812: UX-G1)
```

### Pack B2: Anchors, story (Codex; UA-7, UA-8). Branch art/anchors-2

```
Pack B2 of docs/plans/ux-art-plan.md: tasks UA-7 → UA-8. After the pilot and Pack A; UA-8's final sheet needs B1's Seam comparison.
Base commit: <main at spawn>. Budget: 120 min pack, 30 min per command.
Read: docs/art/style-sheet.md; src/data/districts/*.ts `map` fields (positions in % of the map: foundry 25/22, cartographers 75/22, inkQuarter 25/43, bridges 75/43, canals 25/70, seam 50/72, bathhouses 75/70, lowerSeam 50/92); docs/design/city-and-districts.md (names and places).
Own: art-src/anchors/{map,sestante}/** (scratch destination), docs/art/contact/anchors-2.png.
Done when:
- UA-7 owner's map: one candidate of the registered **750×3800** plate (the map layer is 1900 CSS px at @2x), **built from overlapping panels with shared landmarks and a fixed placement mask** (a single 5.07:1 generation exceeds the ~3:1 direct-generation ratio; alternatively crop a large source after checking its resolution): an ink-and-wash survey of Halvemeer on aged paper with banks, canals, washes, stains and a folded-edge look; **no margin writing, no lettering, no pseudo-text**; the eight district areas are left as plain pencil/blank paper at the % positions above (about 220×260 px each at 750 wide, roughly 110×130 CSS px, soft pencil outline only; check against the Map node positions) so a vector layer and ink-in overlays can fill them; a clear route between them stays open. Warm paper at a cold threshold: slightly cooler wash toward the top. No nodes, labels or route lines.
- UA-8 Sestante pencil-to-ink: one candidate (a v2 only for a failed trait) of a 750×800 fight scene (muted, cool graphite drafting bench academy) plus three 128² tile masters in the same set: ghosted pencil, solid ink, erased space; three distinct reads in greyscale; geometry compared against B1's Seam comparison on the sheet.
- Sheet `anchors-2.png`: map at 375 px wide scrolled in three crops, greyscale; Sestante tiles at the real cell size (~51 px).
Verify: `pnpm art:sheet anchors-2` runs; sidecars present.
Phone check: no
```

**UX-G1 (player):** review the separate real-size views under `docs/art/contact/g1/` and `anchors-2.png` at 375×812. Approve or redirect the finish, Pell silhouette and figure scale; ask for alternatives only for a named trait. The orchestrator copies each approved COMPONENT file to `<name>.approved.webp`, records the candidate version, the contact view and the approved component file paths in the status file, and promotes usable tiles and figures directly. Packs C onward use these as references. Code proceeds while the player decides.

---

### Pack C: Party (Codex; UA-9). Branch art/party. Depends on G1 (scaling), UF Pack 0b

```
Pack C of docs/plans/ux-art-plan.md: task UA-9.
Base commit: <main at spawn>. Budget: 150 min, 30 min per command.
Read: docs/art/style-sheet.md §4; docs/design/party.md §2 (table, pronouns); art-src/anchors/party/*.approved.webp.
Own (named files only; T owns the owner's): src/assets/art/units/shared/{draughtsman,stoker,runaway,notary,towelBearer,warden,tuner,copyist,exile}.webp, src/assets/art/portraits/shared/ the same nine ids and `-card` variants, matching art-src, docs/art/contact/party.png. One approved identity reference per person (from B1 for the first three); portraits and cards are derived from it by crop or referenced edit.
Contract (C2/C4): ArtId `units/shared/<id>` role figure 128×176 alpha (ground contact → (64,160)); `portraits/shared/<id>` role portrait 192×192; `portraits/shared/<id>-card` role card 222×330. ~1.3 cells tall; standard shadow by the processor.
Owed by this pack: figures + portraits + cards for the nine playable apprentices (not Marit: pack T).
Assets (27): for each id below × {unit, portrait, card}:
```

| id (data) | Name | Silhouette key (starting point; the anchor wins for the first three) | Accent hue |
|---|---|---|---|
| draughtsman | Pell | slim; long flat brim; long coat; folio under arm | slate |
| stoker | Joost | broad; bareheaded; dark beard; leather apron | rust |
| runaway | Hanneke | pointed rain hood; narrow cape; hooked pole taller than her | amber |
| notary | Floris | tall narrow; stiff collar; snug skullcap; spectacles; ledger-satchel low on the hip | moss |
| towelBearer | Mieke | widest body; headcloth knot; towel rope diagonal over the shoulder; rolled sleeves | teal |
| warden | Willem | peaked cap with pale band; square-shouldered heavy cloak; chalk-line reel at the belt | plum |
| tuner | Tess | slim; tall topknot; tuning fork held up at the shoulder (a Y); long scarf | rose |
| copyist | Nelle | low cloth cap; sleeve guards; tilted writing board against the hip; pen behind the ear | ochre |
| exile | Wessel | bareheaded, low tie; drafting apron with a pale rubbed-out patch; rolled-paper tube on the back diagonal | indigo |

```
Pronouns and age from party.md/names-and-voice.md; do not invent. Every figure must differ from every other by silhouette alone at 24 px greyscale (check on the contact sheet, row of nine). Portraits and cards repeat the same silhouette marker and clothing accent. Backdrop: a plain painted wall in the Seam mid swatch (#55625E) for portraits; cards a warm paper-toned backdrop. No names, no frames.
Done when: 27 files present; `pnpm art:check` green; contact sheet shows the row of nine at 24/58/128 px, greyscale; all nine on a light and a dark tile at the 7×9 overlap crop (figure lapping 1/3 cell into the row above). Measure bytes: report the total (sets the real shared budget number).
Verify: `pnpm art:check && pnpm art:sheet party`
Phone check: no (orchestrator reviews via the Gallery art page)
```

### Pack D: Seam fight (Codex; UA-10, UA-11). Branch art/seam-fight. Depends on G1, UF-2

```
Pack D of docs/plans/ux-art-plan.md: tasks UA-10 → UA-11.
Base commit: <main at spawn>. Budget: 150 min, 30 min per command.
Read: docs/art/style-sheet.md; src/ui/components/board/art.ts (PLATE_LIKE, CLOUD_LIKE); art-src/anchors/seam/*.approved.webp; src/app/view.ts (LayerId, TileView).
Own (named files only; K owns scenes/seam/{crossroads,threshold}): the enumerated list below under src/assets/art/{tiles/shared,props/shared/jar-*,tiles/seam,scenes/seam/{fight,arena},foes/seam,portraits/seam/marginalia}, matching art-src, docs/art/contact/seam-fight.png. Depends on pack C's figures (or approved B1 copies) for the real-camera composite.
Contract (C2/C4): tiles 128²; foes 128×176 alpha (feet y=160); boss 192×256 alpha (feet y=232); scenes 750×800.
Owed: material states, Seam pieces for FT; marginalia boss art.
Assets (35: 20 materials + 2 jars + 2 scenes + 5 grounds + 5 foes + 1 portrait; the expected count is derived from this enumerated list and checked by the inventory test):
UA-10 tiles/shared (alpha 128², neutral-light so they sit on any ground), 20:
 blot (plain ink pool), slick (oil: sheen + droplet), cloud (steam: scalloped edge + cloud), plate, plate-worn (brass: squared plate, dented), fire, mark-plain, mark-deep (debt marks, ink seal shapes), stain, brand-cloud, pool, grease-fog, skid-plate, skid-plate-worn, bank (fog bank), kettle, kettle-worn, wall (stood stone/brass wall), wall-worn, vent (iron grate; visible haze).
 props/shared (alpha 128²), 2: jar-step, jar-dusk (sealed jar, two glass/seal looks; contents peek is vector).
UA-11 Seam, 13:
 scenes/seam/fight (750×800 muted: damp masonry, patched floor, vent haze, pipe on the left, stair at the lower right; no units), scenes/seam/arena (darker heart variant).
 tiles/seam/floor-a, floor-b, floor-c, floor-d (128² opaque, seamless, patched floor), border (128² opaque wall course, tileable).
 foes/seam/rat, sentry (brass), familiar (ink familiar, small, hp1), dummy (training dummy), marginalia (192×256: a living marginal scrawl/hand-and-page figure, the five hands ink/oil/steam/brass/spark visible).
 portraits/seam/marginalia (192² header chip).
Done when: 35 files present; art:check green; sheet shows materials side by side on the Seam floor in greyscale (each state distinct by silhouette); floors tile self and in mixed A–D neighbours; foes at 24 px greyscale; the real-camera composite (7×9 grid at the real cell size, ~51 px) with all five foes and Pell/Joost from pack C. Bytes reported.
Verify: `pnpm art:check && pnpm art:sheet seam-fight`
Phone check: no
```

### Pack E: FX (Codex; UA-12). Branch art/fx. Depends on D (UA-D6: ONE hero frame per effect; code animates)

```
Pack E of docs/plans/ux-art-plan.md: task UA-12.
Base commit: <main at spawn>. Budget: 90 min.
Read: docs/art/style-sheet.md; src/ui/components/board/FxLayer.svelte and src/app/fx.ts (Tone names); material states from pack D as style references.
Own: src/assets/art/props/shared/fx-*, flourish-*, matching art-src, docs/art/contact/fx.png.
Assets (12), alpha. Each `fx-*` is ONE hero frame, 128² alpha, centred (no frame strips; FT scales, rotates and fades it; a frame strip only if a later review asks): fx-fire (catches, flickers), fx-steam (billows), fx-spark (jumps), fx-brass-ring (a ring pulse), fx-oil-catch (a sheen flash), fx-ink-splash, fx-impact (hit flash, no red), fx-shield-pulse. Flourishes 512×256 single frame: flourish-burst, flourish-compound, flourish-name-flare (behind a name card, neutral), flourish-first-gold (gold, for firsts; hex #C9A227 family). Centre-weighted, soft edges, additive-friendly (dark halos not allowed).
Done when: 12 files; art:check green; the sheet shows each frame on dark and light backgrounds.
Verify: `pnpm art:check && pnpm art:sheet fx`
```

### Pack F: Lampwater (Codex; UA-13). Branch art/canals. Depends on G1, D

```
Pack F of docs/plans/ux-art-plan.md: task UA-13.
Base commit: <main at spawn>. Budget: 150 min.
Read: style-sheet; art-src/anchors/lampwater/*.approved.webp; src/data/districts/canals.ts (water Dir, grate, gate, lamp, crates, moorings), src/ui/districts/canals/ (CrateArt, MooringPiece).
Own (the named files in the list below only; K owns scenes/canals/{crossroads,threshold}): src/assets/art/{scenes/canals/{fight,arena},tiles/canals/*,props/canals/*,foes/canals/*,portraits/canals/{lamplighter,mother}}, matching art-src, docs/art/contact/canals.png. `barge` stays drawn by CrateArt (vector fallback, R27) unless the orchestrator adds it.
Palette: #172C39 / #456675 / #BC8A57. Blue-black water, amber quay lamps, slick landing edges; lamp silhouettes readable across water; the lamp-mother is a floating lantern.
Assets (24):
 scenes/canals/fight (750×800 muted), scenes/canals/arena (lamp-mother's water, darker).
 tiles/canals: floor-a..d (opaque quay stone, wet), water-a, water-b (opaque, painted flowing downward; the flow arrow is vector, never painted; code rotates), quay-edge (opaque, quay lip to water), lamp-pool (alpha warm light pool), lock-gate (opaque terrain), grate (opaque).
 props/canals (alpha): lamp (128×176 lit lamp post, feet y=160), crate, mooring, barrel, rope-coil (each 128², sit on the cell).
 foes/canals: eel (128×176, low in water), snuffer, moth (lamp-moth), lamplighter, mother (lamp-mother boss 192×256, feet y=232).
 portraits/canals/lamplighter, portraits/canals/mother (192²).
Done when: 24 files; art:check; the sheet shows the real-camera composite (water column with flow arrows drawn by the sheet), greyscale, foes at 24 px, lamp readable against water. Bytes reported.
Verify: `pnpm art:check && pnpm art:sheet canals`
```

### Pack G: Home (Codex; UA-14). Branch art/home. Depends on G1, A

```
Pack G of docs/plans/ux-art-plan.md: task UA-14.
Base commit: <main at spawn>. Budget: 150 min.
Read: style-sheet; art-src/anchors/study/*.approved.webp; docs/design/art-studies/study-v2.png (placement target); board §6 Study frame in ux-board-snapshot.txt (l6-st-n).
Own (named files only; H owns margin-strip/margin-tape and the room strips): the 15 files in the list below, matching art-src, docs/art/contact/home.png. G merges BEFORE H and I (explicit order G → H, I).
Rules: NO text in any plate (labels are code). Objects are separate cutouts with a thin ivory edge, readable on the shelf line at fixed baseline. Texture stays out of text areas: paper tile and plate centres are calm.
Assets (15):
 scenes/home/attic-header-night (750×224 opaque, night only: UH-D13 drops the day variant. Top 176 px = the 88 px header: window with ivy and rain, rafters, lamp at right, shelf line at y≈176 with a cup; the lower 48 px is calm bleed behind the seat tabs, cropped by object-fit (R12); the book, jar and desk objects are NOT in the scene).
 props/home (alpha 160×160): book (Codex: a worn red-leather book), jar (Bench: glass jar with lavender or reeds), desk (Desk: ledger + pen), ink-pot (ink bottle).
 ui-plates/home: page-frame (role nine-slice, 512×512 alpha, slice [64,64,64,96]: open notebook edge, rings on the left, curled paper edge, transparent centre), paper-tile (512² opaque seamless warm rubbed paper), wood-tile (512² opaque seamless dark timber), drawer-top (750×96 alpha fixed painted top lip), drawer-mid (750×64 opaque, vertically tileable), drawer-bottom (750×80 alpha), spell-strip (384×96 alpha 9-slice, slice [32,48,32,48]: purple ribbon plate), door-plate (718×144 opaque: warm amber plate with faint city silhouettes, calm centre), seat-tab (192×88 alpha 9-slice, ivory paper tab), rune-card (160×192 alpha 9-slice, ivory card with stitched edge).
Done when: 15 files; art:check; the sheet places header (176 px header + 48 px bleed behind the tabs) + objects + frame + drawer + door in the 375×812 study layout (script composite), shows plate centres tile correctly, greyscale; objects readable at 44 px. Bytes reported.
Verify: `pnpm art:check && pnpm art:sheet home`
```

### Pack H: Room strips (Codex; UA-15). Branch art/room-strips. Depends on G (merged first)

```
Pack H: task UA-15. Base commit: <main at spawn>. Budget: 90 min.
Read: style-sheet; the home pack's header and paper-tile as references.
Own: src/assets/art/{scenes/home/{bench-strip,desk-strip,codex-strip,desk-vignette},ui-plates/home/{margin-strip,margin-tape}}, matching art-src, docs/art/contact/room-strips.png.
Assets (6): scenes/home/bench-strip (750×128: bench top, jars, lamp), desk-strip (750×128: lamp, pen, ledger), codex-strip (750×128: stacked back pages, ribbon), desk-vignette (300×120 alpha: a lamp, an empty ledger, a pen), ui-plates/home/margin-strip (640×120 alpha paper strip with torn edge, calm centre), margin-tape (160×48 alpha masking tape, translucent). No text.
Done when: 6 files; art:check; the sheet shows each strip under a 64 px header height crop at 375 wide.
Verify: `pnpm art:check && pnpm art:sheet room-strips`
```

### Pack I: Transitions and homecoming (Codex; UA-16). Branch art/transitions. Depends on G (merged first; H and I may then run in parallel)

```
Pack I: task UA-16. Base commit: <main at spawn>. Budget: 90 min.
Read: style-sheet; board snapshot l6-th-n (transitions), l6-hc-n (homecoming).
Own: src/assets/art/{scenes/shared/transition-*,ui-plates/shared/rain-light,scenes/home/homecoming}, matching art-src, docs/art/contact/transitions.png.
Assets (4): scenes/shared/transition-door (750×1624: the study door opening on cold blue rain light spilling across warm floor; no figures), transition-stair (750×1624: a stair going up, rain fading, lamp glow growing at the top), ui-plates/shared/rain-light (512² alpha seamless tiling: diagonal rain streaks and cold light, subtle), scenes/home/homecoming (750×380: lamp warm again, wet coat on the hook; the contrast with the city). q76 for the plates.
Done when: 4 files; art:check; sheet shows the two plates as a 3-frame mock cross-fade strip and the rain tile 3×3.
Verify: `pnpm art:check && pnpm art:sheet transitions`
```

### Pack J: Map (Codex; UA-17). Branch art/map. Depends on G1, B2

```
Pack J: task UA-17. Base commit: <main at spawn>. Budget: 150 min.
Read: style-sheet; art-src/anchors/map/*.approved.webp (the registered 750×3800 plate; panels overlap with shared landmarks); district map positions (pack B2); src/ui/screens/Map.svelte (the node layer is a fixed 1900 CSS px high layer in a variable-width page; Underjoin is a slot below Seam).
Own (named files only; R owns ink-lowerSeam): src/assets/art/map/city/{halvemeer,ink-seam,ink-canals,ink-inkQuarter,ink-bathhouses,ink-bridges,ink-foundry,ink-cartographers}.webp, matching art-src, docs/art/contact/map.png.
Assets (8): map/city/halvemeer (role map-plate, 750×3800 opaque; final version of the approved anchor; district areas left as pencil/blank paper; NO margin writing, lettering or pseudo-text); map/city/ink-<district> ×7 (role map-patch-with-bbox: **cropped alpha WebPs**, each only that district's inked art at its exact position over the base plate, soft ink-wash edge so it blends; sidecar `bbox` = [x,y,w,h] in 750×3800 master pixels, top-left, patch size = bbox size; generated on the registered plate then cropped, never shipped as full canvases). Each patch uses its district's mid swatch for wash and shows that district's signature (seam: join of two brick courses; canals: canal with lamps; inkQuarter: racks and wax; bathhouses: domes and steam; bridges: arches in fog; foundry: bell tower; cartographers: drafting academy). No text; no nodes or route lines.
Done when: 8 files; art:check (incl. bbox in bounds); sheet shows base alone, base with all patches, each patch alone at 375 px and at a 430 px page width in three scroll crops, node/patch alignment using ONE transform (bbox x/width normalised to the measured node-layer width, y/height to 1900); known ink stays visible on revisit (UT's rule); total map bytes (with Underjoin's patch) ≤ 0.8 MB, and decoded patch memory reported.
Verify: `pnpm art:check && pnpm art:sheet map`
```

---

### Pack K: Trip scenes (Codex; UA-18). Branch art/trip-scenes. Depends on G1, A

```
Pack K: task UA-18. Base commit: <main at spawn>. Budget: 150 min.
Read: style-sheet (palettes); board snapshot l6-cs-n, l6-cl-n, l6-wp-n, l6-th2-n; the real `ThresholdSpec`s: src/data/districts/{canals.ts CANALS_THRESHOLD, inkQuarter/threshold.ts, bathhouses.ts BATH_THRESHOLD, foundry.ts FOUNDRY_THRESHOLD, cartographers/threshold.ts}.
Own (named files only): src/assets/art/scenes/<d>/crossroads.webp for the seven districts, scenes/<d>/threshold.webp for the FIVE real locks only (canals, inkQuarter, bathhouses, foundry, cartographers), scenes/shared/{stair,wiped}, matching art-src, docs/art/contact/trip-scenes.png.
Assets (14): scenes/<d>/crossroads (750×440 ×7: the district's light, a lamp-post kit shared across all seven, a fork; no figures, calm lower third), scenes/<d>/threshold (750×580 ×5: the real lock room of canals, inkQuarter, bathhouses, foundry, cartographers; Seam, Bridges and Underjoin have no threshold room: do NOT paint heart doors for them), scenes/shared/stair (750×520: the lit stair out of a district, neutral, tinted in code), scenes/shared/wiped (750×440: dropped lamp, wet stone, quiet).
Threshold per real lock (paint what its spec says): canals the lock (rat on the sill, plates either side); inkQuarter the return-to-sender counter; bathhouses the dome threshold; foundry its bell threshold; cartographers the drafting table.
Done when: 14 files; art:check; the sheet shows all crossroads and thresholds in greyscale as a grid, check the lamp-post kit is recognisable across districts.
Verify: `pnpm art:check && pnpm art:sheet trip-scenes`
```

### Pack L: Finds (Codex; UA-19). Branch art/finds. Depends on G1

```
Pack L: task UA-19. Base commit: <main at spawn>. Budget: 90 min.
Read: style-sheet; src/data/types.ts LootSpec kinds (rune, method, ink, solvent, vellum, doorway, key) + recruit offers (src/data/recruits.ts). The `key` offer (added by keyOffer) keeps its EXISTING card or vector fallback (R27): do not paint it.
Own: src/assets/art/finds/shared/**, matching art-src, docs/art/contact/finds.png.
Assets (7 first, 176×192 alpha, object on a calm painted paper-toned base, soft shadow; a `-b` look only if the integrated phone check shows visible repetition): finds/shared/{rune,method,ink,solvent,vellum,doorway,recruit}-a: rune page (a loose engraved page), method page (a folded diagram sheet), ink (bottle), solvent (flask), vellum (a rolled skin), doorway (a small ajar door), recruit (a letter with a seal). No text.
Done when: 7 files; art:check; greyscale sheet: the seven kinds differ by silhouette at 88 px.
Verify: `pnpm art:check && pnpm art:sheet finds`
```

### District packs M–Q (Codex; UA-20 … UA-24). Common frame

Each: branch `art/<districtId>`, depends on G1, D (materials), K (so the district's thresholds exist) and, for Q, B2. Base commit `<main at spawn>`. Budget 150 min. Read: style-sheet (palette row), the district's bible paragraph (quoted below), `src/data/districts/<id>.ts` and `src/ui/districts/<id>/` piece components, art-src/anchors/seam approved set (finish) and the pack's own district references. Own: the **named files** of its table row plus `scenes/<id>/{fight,arena}`, `tiles/<id>/*`, props/foes/portraits listed (NOT `scenes/<id>/{crossroads,threshold}`, which pack K owns), matching `art-src`, `docs/art/contact/<id>.png`. Done when: files present per list, art:check, the sheet shows the real-camera composite (7×9, real cell size ~51 px) in colour and greyscale with the district's foes and Pell/Joost/Hanneke, and the greyscale/squint check from plan §7 passes on the composite (a state, a foe and the intent line stay distinct). Verify: `pnpm art:check && pnpm art:sheet <id>`.

Every pack's list includes: `scenes/<id>/fight` (750×800 muted), `scenes/<id>/arena`, `tiles/<id>/floor-a..d` (128² opaque seamless), `tiles/<id>/border`.

| Pack (UA id, branch) | Bible paragraph to follow | Extra assets | Count |
|---|---|---|---|
| M Verloren Corner (UA-20, `inkQuarter`) #272632 #656475 #A28D6D | "A dead-letter office of sorters' racks, dusty labels and desaturated wax. Distinct stamps for Return to Sender, Forwarding, Standing Order. Recovered letters hint at the owner's expulsion." | props/inkQuarter (alpha 128²): address, clock, forward, order, return, wax; foes/inkQuarter (128×176): dead-letter, sorter, sealer, letter, postmaster (rival); portraits/inkQuarter/postmaster | 19 |
| N Thermae (UA-21, `bathhouses`) #25373B #5F8482 #ACC7BE | "Blue-green mosaic, limestone, tiers of pale steam. Cloud edges show which cells join; treatment inside the cell stays translucent. Pressure gauge with a readable threshold. Bathers dissolve into the same cloud." | props/bathhouses: feeder (gauge, 128²), bench; foes: attendant, boilerman, bather, bath-steward; portraits/bathhouses/bath-steward | 14 |
| O Fog Arches (UA-22, `bridges`) #252F39 #596D79 #ADBBBC | "Slate bridges over a soft fog drop with pier caps in chalk light. Sound, chipped, cracked, collapsing stone by fracture shape and edge. Keep the load path to a pier visible across the mist." | tiles/bridges: span-sound, span-chipped, span-cracked, span-collapsing (opaque 128², differ by fracture shape in greyscale), drop-edge (open side); props/bridges: pier, keystone; foes: warden, gargoyle, mason, chief-warden; portraits/bridges/chief-warden | 19 |
| P Klokhof (UA-23, `foundry`) #292A2A #6F6956 #B19060 | "Bell towers, tuning galleries, dull bronze, rope. Match bells by pattern as well as hue. Pulses around separated bells are code; the Great Bell dominates the heart." | props/foundry: bell, great-bell (192×256 alpha, feet y=232), rope, hook; foes: ringer, detuner, clapper, carillonneur; portraits/foundry/carillonneur | 16 |
| Q Sestante (UA-24, `cartographers`) #28323A #768890 #D5D7CC | "Cool graphite and drafting benches. Ghosted pencil, solid ink, empty erased space are three distinct reads. The Registrar feels like an office made human. Paper becomes literal." | tiles/cartographers: pencil, outline, blank (opaque 128², use the approved B2 anchors; three reads must hold in greyscale); foes: surveyor, eraser, tracer, registrar; portraits/cartographers/registrar | 15 |

For N–Q the `tiles/<id>/border`, floors and scenes are counted in the totals (2 scenes + 4 floors + 1 border = 7; extras listed above). For Verloren Corner, Thermae and Klokhof the district's rival and portrait are listed; the rival is a 1-cell person figure (128×176).

### Pack R: Underjoin (Codex; UA-25). Branch art/lowerSeam. Depends as M

```
Pack R: task UA-25. Base commit: <main at spawn>. Budget: 120 min.
Bible: "Bring one borrowed material or structure into each descent. Seams in brick, absent lamps and hints of borrowed architecture lead toward the owner's sealed door. Keep the handover's face, name and pen for the reveal." Palette #232D30 #535E59 #8F9280. Foes are the Seam's (reuse pack D). No heart.
Own (named files): src/assets/art/{scenes/lowerSeam/fight,tiles/lowerSeam/*,props/lowerSeam/sealed-door}, src/assets/art/map/city/ink-lowerSeam (a cropped patch; J owns the other seven), matching art-src, docs/art/contact/lowerSeam.png. Before paying for the patch, verify where `Map.svelte` renders the Underjoin slot (a slot below Seam, not necessarily the data entry's 50%/92%) and place the bbox accordingly.
Assets (8): scenes/lowerSeam/fight (750×800 muted), tiles/lowerSeam/floor-a..d, border, props/lowerSeam/sealed-door (128×176 alpha, the owner's sealed door, no face, no name, no pen), map/city/ink-lowerSeam (role map-patch-with-bbox: cropped alpha patch with bbox in 750×3800 master pixels at its rendered slot).
Verify: `pnpm art:check && pnpm art:sheet lowerSeam`
```

### Pack S: Player-drawn (Codex; UA-26). Branch art/inkedPage

```
Pack S: task UA-26. Base commit: <main at spawn>. Budget: 60 min.
Bible: "Start from a quiet version of the Seam. Reuse modular rules, foes, props and silhouettes from the authored districts. Keep the player's pen and blank paper at the drawing table." Palette #373239 #867A72 #D9CDB5.
Own (named files): src/assets/art/{scenes/inkedPage/fight,tiles/inkedPage/{floor-a,floor-b}}, matching art-src, docs/art/contact/inkedPage.png. Depends on G1 (and pack D's materials).
Assets (3): scenes/inkedPage/fight (750×800 muted, a quiet Seam-like room with paper-white margins), tiles/inkedPage/floor-a, floor-b (128² opaque seamless; a paler Seam floor).
Verify: `pnpm art:check && pnpm art:sheet inkedPage`
```

### Pack T: Ending (Codex; UA-27). Branch art/ending. Depends on G1, G (and the reveal rule)

```
Pack T: task UA-27. Base commit: <main at spawn>. Budget: 120 min.
Read: style-sheet; docs/design/ending.md and ending-text.md; src/data/apprentices/owner.ts (Marit Vos, Mender, gilt, "held the join"); board l6-ho-n.
Own (named files; C's nine are not yours): src/assets/art/{scenes/home/{handover,drawing-table-strip},units/shared/owner,portraits/shared/owner,portraits/shared/owner-card}, matching art-src, docs/art/contact/ending.png.
Assets (5): scenes/home/handover (750×1624: the study at night, a figure at the door seen from behind or in shadow so the face stays for the portrait reveal, the lamp low), scenes/home/drawing-table-strip (750×128: pen pot, paper edge, lamp), units/shared/owner (128×176 alpha, silhouette key: mender's apron with a thread-and-needle satchel, the join mended; gilt accent), portraits/shared/owner (192²), portraits/shared/owner-card (222×330). Pronouns from the ending docs.
Verify: `pnpm art:check && pnpm art:sheet ending`; the figure must also pass the 24 px greyscale test against the nine; portrait and card derive from one identity reference.
```

---

## 3. Orchestrator review procedure (per pack, before merge)

1. Fetch the branch or apply `/tmp/<pack>.mbox` (`git am` in a CLEAN checkout, then re-open the images to confirm the binary handoff); run `pnpm art:check` (must pass). On a timed-out pack, take the accepted partial assets from the exported branch and write the missing ArtIds into the next brief.
2. Open the contact sheet `docs/art/contact/<pack>.png`, then the Gallery art page (UF-7) for the scope at 375×812 in colour and with the greyscale toggle.
3. Silhouettes: figures and portraits at 24 px greyscale, each told apart from every sibling; foes against party.
4. Figure overlap: the widest grid 7×9 with figures lapping 1/3 cell into the row above; feet and shadow on a light and a dark tile; the shadow falls down-right.
5. Materials: oil, steam, brass, fire and compounds side by side on a ground: distinct painted silhouettes without the corner mark; no painted tactical mark, text or UI (look at each asset).
6. Transparent assets on `#fff` and `#101820`: clean edge. Ground tiles tile 3×3 AND in mixed A–D neighbours without a seam. Every output inspected at native and display size for lettering, pseudo-labels and copied UI; dominant value masses compared with the approved sample; figure foot at (64,160) (boss (96,232)) on light and dark tiles.
7. Bytes: per-scope totals from `art:check` against C5 and the plan's estimate; record shipped bytes, decoded dimensions, master bytes, contact sheets, rejects and incremental Git growth separately in the program log (decimal MB).
8a. At each district phase end: colour/greyscale screenshot pair at 375×812 with real z-order, boss overlap and stacked FX (R25), and a durable review result per district and art revision for Close.
8. Style drift against the approved anchors (side by side); log drift in style-sheet §10.
9. One return per pack (the Return template), then split the failing assets into a new brief. Pass: merge; record ArtIds delivered in the status file.
