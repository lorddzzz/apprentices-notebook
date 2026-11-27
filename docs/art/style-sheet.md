# Art style sheet

The authority for every raster asset in The Apprentice's Notebook. Once merged it wins over the whiteboard art bible (board §7 and §8, [snapshot](../plans/ux-board-snapshot.txt)) wherever the two differ. Plan: [ux-art-plan.md](../plans/ux-art-plan.md) (UA-D1…D15). Contracts C2–C5 are quoted here for convenience and never redefined; the code truth is `src/ui/art/spec.ts` and `pnpm art:check`.

Painted targets (look, do not copy): `docs/design/art-studies/{study,seam,lampwater}-v2.png`. They are mood and value studies. Their baked-in UI (HP pips, arrows, rings, labels, grid lines) is **not** art; see §6 and §10.

## 1. Art vision, one per world

Three worlds, one hand. The notebook is the same object in all of them.

### Attic (`home`): warm lamp, blue window

You inherit a room someone meant to come back to. Worn timber, rubbed paper and a pool of lamp light make editing feel like settling in to work. Clutter arrives through found objects and notes, never through noise in the page. Warm lamp amber against a cold blue rain window; the page is the calmest, lightest, most legible thing in the frame. Target: `study-v2.png`.

### Map (`city` threshold): warm paper at a cold threshold

The owner's ink-and-wash survey is a thing you unfold before going out. The door and the returning lamp carry the change of mood (door and rain going out, lamp and notebook coming back, pen at the handover). Paper, banks and washes are painted; district states, route lines, labels and margin notes are separate code layers. **The map carries no lettering and no pseudo-writing** (UA-D8). Unseen districts stay `???` in code.

### City (`city`): cool air, local pools of light

Halvemeer at night. Guilds do ordinary work in a city that behaves strangely. Rain, work lights and wet surfaces tie it together. Each district gets **one signature material, one light and one uncanny detail** (§3 table). Fight scenes are muted so tiles and units pop.

## 2. Paint, light, edges, texture

- **Paint.** Broad, matte, gouache-like value masses. Fine grain in the paint. No glossy 3D render look, no airbrush gradients, no photographic detail.
- **Light.** Key light from the **upper left**, always. Local lamp or work light adds warm pools; wet surfaces catch small highlights. Distant detail stays soft.
- **Edges.** Soft at distance, crisp only where the player must read or act (the figure outline, a plate's squared edge). Sparse engraved or inked details sit at material edges. Figures get a faint top-left edge light only; **the side rim light is code** (FT).
- **Texture.** Texture lives in paint and stone. **Keep texture out of dense text, grid marks and small glyphs.** Writing is always on clean paper; no texture behind a label, no painted label.
- **Value.** A district scene is lower in contrast and saturation than its tiles and units. Check dominant value masses against the approved anchor of the same kind.
- **Camera.** Overhead square ground for tiles. High 3/4 standing figures and props, feet anchored to the owning cell, a short down-right shadow (composed by the processor). A figure starts at about 1.3 cells tall. Layers back to front: muted district scene → tiles and materials → units → flat shared tactical overlay (code) → brief FX.
- **Cell size.** Judge art at the fight's real cell formula (about 51 px inner on 7-column boards, 7×7 Marginalia, 7×9 Lampwater), not 58 px (UA-D11).
- **Study objects.** Tappable Study objects carry a thin ivory edge and let room lighting carry the scenery; the edge, label and cue are code.

## 3. Palettes

Scene swatches are **working colours** (dark / mid / light). Shared danger, preview and discovery colours are applied separately by code and are never painted into a district.

### 3.1 District triples (`[data-district]` in `src/ui/theme.css`; these must match)

| Scope (DistrictId) | Bible name | Tag | dark | mid | light |
|---|---|---|---|---|---|
| `seam` | The Seam | Basics, the owner's uneven join | `#253235` | `#55625E` | `#BC9273` |
| `canals` | Lampwater | Timing, the Lamplighters | `#172C39` | `#456675` | `#BC8A57` |
| `inkQuarter` | Verloren Corner | Contracts, the Notaries | `#272632` | `#656475` | `#A28D6D` |
| `bathhouses` | The Thermae | Areas, the Thermae Guild | `#25373B` | `#5F8482` | `#ACC7BE` |
| `bridges` | The Fog Arches | Structure, the Keystone Watch | `#252F39` | `#596D79` | `#ADBBBC` |
| `foundry` | Klokhof | Resonance, the Bellwrights | `#292A2A` | `#6F6956` | `#B19060` |
| `cartographers` | The Sestante | The board itself, the Cartographers | `#28323A` | `#768890` | `#D5D7CC` |
| `lowerSeam` | The Underjoin | The Seam's lower floors | `#232D30` | `#535E59` | `#8F9280` |
| `inkedPage` | Player-drawn districts | After the handover | `#373239` | `#867A72` | `#D9CDB5` |

Hexes are uppercase here; `theme.css` writes them lowercase (same values).

### 3.2 District signatures (one material, one light, one uncanny detail)

| Scope | Material and light | Draw |
|---|---|---|
| `seam` | Damp masonry, patched floor, vent haze | Keep the stair felt in the framing. Two adjacent brick courses that barely meet. Brass sentries, ink familiars and the Marginalia come from the materials you learn. |
| `canals` | Blue-black water, amber quay lamps, slick landing edges | Directional ripples under a crisp flow indicator (the indicator is code). Lamp silhouettes readable across water. The Lamp-mother is a floating lantern. |
| `inkQuarter` | A dead-letter office: sorters' racks, dusty labels, desaturated wax | Distinct stamps for Return to Sender, Forwarding and Standing Order. Recovered letters hint at the owner's expulsion. **No readable lettering.** |
| `bathhouses` | Blue-green mosaic, limestone, tiers of pale steam | Cloud edges show exactly which cells join; the inside of a cell stays translucent. Readable pressure-gauge threshold. Bathers dissolve into the same cloud. |
| `bridges` | Slate bridges over a soft fog drop, pier caps in chalk light | Sound, chipped, cracked and collapsing stone differ by fracture shape and edge. The load path to a pier stays visible across the mist. |
| `foundry` | Bell towers and tuning galleries, dull bronze and rope | Bells match by pattern as well as hue. Pulses are drawn around separated bells; a connected path is reserved for brass conduction. The Great Bell dominates the heart. |
| `cartographers` | An academy: cool graphite, drafting benches | Ghosted pencil, solid ink and empty erased space are three distinct reads. The Registrar is an office made human (faceless). Paper becomes literal. |
| `lowerSeam` | One borrowed material or structure per descent | Seams in brick, absent lamps, hints of borrowed architecture lead to the owner's sealed door. **Keep the handover's face, name and pen for the reveal.** |
| `inkedPage` | A quiet version of the Seam | Reuse modular rules, foes, props and silhouettes from the authored districts; a borrowed heart keeps its visual tell. The player's pen and blank paper at the drawing table. |

### 3.3 Home (attic) swatches

Sampled (area means, rounded) from `docs/design/art-studies/study-v2.png`. Working colours, not tokens: the live tokens are the `--home-*` set in `theme.css`.

| Role | Hex | Where in the study |
|---|---|---|
| Lamp glow (amber, hot) | `#FAD48E` | the lamp's globe |
| Lamp amber (warm) | `#FBA731` | the door button, light spill |
| Lamp brass | `#8C4C1D` | the lamp's base |
| Window blue | `#2B63A2` | rain-lit panes |
| Window blue, deep | `#346489` | panes in shade |
| Window frame | `#283549` | mullions |
| Timber, beam | `#6B351D` | roof beam |
| Timber, shelf | `#553530` | the shelf under the header |
| Timber, drawer | `#693A26` | the rune drawer |
| Timber, deep | `#432824` | floor and corners |
| Wall shadow | `#4C3139` | bottom corner shade |
| Paper page | `#E7BA8D` | the writing page (lit; the token `--home-paper` `#F1E6CC` is the UI paper) |
| Ink | `#29232E` | the ink bottle |
| Leather | `#592A20` | the codex |

Token anchors to keep in the same family: `--home-wall #2E2420`, `--home-wood #6B4A2F`, `--home-wood-dark #4A3426`, `--home-wood-deep #2A1D15`, `--home-lamp #E8B04A`, `--home-paper #F1E6CC`, `--home-ink #2B2118`.

### 3.4 City and night tokens

`--city-night #1F2A3A` (page ground), `--city-stone #3A4148` (wet stone), `--city-stone-light #5D666D`, `--city-rain #A9BCC6` (rain light), `--city-ink #E9E2D0` (text on night). Material accents the paint should respect: ink `#1D2A4A`, oil `#7A6420`, steam `#A9BCC6`, spark `#E2A312`, brass `#B5882E` (dark `#7A5A1A`), fire `#D2552A`, vent `#55606A`.

Apprentice clothing accents (a small accent only, never a full garment): slate, rust, amber, moss, teal, plum, rose, ochre, indigo (the owner: gilt). Day-ink values: `#2F4F6F`, `#A2471F`, `#8F5A00`, `#44651F`, `#17625C`, `#7B3A6C`, `#A8324C`, `#6B6412`, `#4A3F94`, `#6E5200`; night-lit variants lighten them (see `theme.css`).

### 3.5 Board name → DistrictId (UA-D1, R27)

Scopes in file paths are the **code ids**. The bible's names map as follows; no file or sidecar ever uses a bible name.

| Bible name | DistrictId (scope) |
|---|---|
| The Seam | `seam` |
| Lampwater | `canals` |
| Verloren Corner | `inkQuarter` |
| The Thermae | `bathhouses` |
| The Fog Arches | `bridges` |
| Klokhof | `foundry` |
| The Sestante | `cartographers` |
| The Underjoin | `lowerSeam` |
| Player-drawn districts | `inkedPage` |

Non-district scopes: `home` (attic), `city` (map, thresholds in the city world), `shared` (people, materials, FX, finds, transitions).

## 4. Figures

### 4.1 Rules

- **Canvas.** Figures 128×176 alpha, bosses 192×256 alpha. Role `figure`: the **ground-contact point lands at (64,160)** (boss `boss-figure`: (96,232)), within `GROUND_TOLERANCE` 4 px. The processor places it; a hem, pole tip or shadow below the feet never moves the feet (UA-D14).
- **Height.** About 1.3 cells tall. Rivals (people) use the 128×176 canvas; only the two bosses (Marginalia, lamp-mother) use 192×256 over a one-cell footprint (UA-D3, R13).
- **Shadow.** Generate **without** a baked shadow. The processor composes the standard soft down-right shadow. No side rim (code); a faint top-left edge light only.
- **One identity reference per person.** Portraits (192², opaque) and cards (222×330, opaque) are **derived** from it by crop or referenced edit, never generated afresh. Backdrop: portraits a plain painted wall in the district's mid swatch (the party's: Seam mid `#55625E`); cards a warm paper tone. No names, no frames.
- **Pronouns.** Apprentices and the player are **never gendered** in prompts, sidecars or captions (names-and-voice.md §0). Rivals are he/him. The owner is the one named exception (§4.3). Describe bodies by clothing and silhouette only.
- **24 px greyscale rule.** Every figure must differ from every sibling by silhouette alone at 24 px in greyscale. Pairs and rows are checked on the contact sheet (§8).

### 4.2 The party: silhouette key per figure

The silhouette key is the one shape that must survive 24 px greyscale. The first three are fixed by the bible; the anchor (UA-3) wins for them. The other six are starting points from the pack C table; the data id is the file subject.

| Data id (subject) | Name, trade | Silhouette key | Accent | Source for body notes |
|---|---|---|---|---|
| `draughtsman` | Pell, the Draughtsman | **Slim; long flat brim; long coat; folio under the arm** | slate | board §7; `lampwater-v2` |
| `stoker` | Joost, the Stoker | **Broad; bareheaded; dark beard; leather apron** | rust | board §7; both v2 studies |
| `runaway` | Hanneke, the Runaway | **Pointed rain hood; narrow cape; hooked pole taller than the figure** | amber | board §7; `lampwater-v2`; party.md §2 (a Lamplighter's apprentice, the hooked pole is her Pull) |
| `notary` | Floris, the Junior Notary | Tall and narrow; stiff collar; snug skullcap; spectacles; ledger satchel low on the hip | moss | party.md §2 (a clerk who stamps things true) |
| `towelBearer` | Mieke, the Towel-bearer | Widest body; headcloth knot; towel rope diagonal over the shoulder; rolled sleeves | teal | party.md §2 (big, calm, steam-soaked) |
| `warden` | Willem, the Warden | Peaked cap with a pale band; square-shouldered heavy cloak; chalk-line reel at the belt | plum | party.md §2 (left the keystone watch, brings the wardens' chalk) |
| `tuner` | Tess, the Tuner | Slim; tall topknot; tuning fork held up at the shoulder (a Y); long scarf | rose | party.md §2 (listens for what is slightly out of tune) |
| `copyist` | Nelle, the Copyist | Low cloth cap; sleeve guards; tilted writing board against the hip; pen behind the ear | ochre | party.md §2 (a student copying pamphlets about the notebook) |
| `exile` | Wessel, the Unregistered | Bareheaded, low tie; drafting apron with a pale rubbed-out patch; rolled-paper tube on the back diagonal | indigo | party.md §2 (rubbed from the register; a grumpy Cartographer in exile) |

Names and epithets are from `names-and-voice.md` §1. The ids above are the **stable data ids**, never the placeholder names, so a rename never moves a file (UA-D1). The "she/her" that `party.md` §2 uses in its table is older than the 2026-11-23 pronoun decision; **art does not use it** (§4.1).

### 4.3 The owner

Marit Vos (`owner`) joins at the handover. Her face, name and pen are kept for the reveal, so her figure, portrait and card ship only with the ending pack (UA-27) and are not generated earlier. The pronoun for the owner is **unsettled in the docs** (names-and-voice.md §0 says he/him, §1 says they/them; see §10): use neither in any prompt or sidecar; use "the owner".

### 4.4 Foes, rivals and bosses

Foes follow the same canvas and ground-contact rules; an item that is a token (letter, dead letter, bather) is a figure on the 128×176 canvas and shorter ones keep the baseline. Every foe reads by silhouette in greyscale against the party. Rivals are he/him in text. Boss figures (Marginalia, lamp-mother) are 192×256 with the feet at y=232 and may overlap neighbours by art only. The expected id lists live in the UA briefs and `src/ui/art/inventory.ts`.

### 4.5 Materials and occupied cells

Every active material state gets a distinct painted silhouette that reads in greyscale: **oil** keeps a sheen and a droplet, **steam** a scalloped edge and a cloud shape, **brass** a squared plate. Terrain pieces get their own stamp. Content stays inside the cell. A unit, a jar and a state can share a cell, so each stays distinct from reach, targeting and danger. **Corner marks and hit pips are vector (FT), never painted.**

## 5. Prompt recipe

### 5.1 House style (paste verbatim into every prompt)

> Painted 2D game art, broad matte gouache-like value masses, fine paint grain, sparse engraved ink detail at material edges. Light from the upper left. Warm lamp light against cold blue night; wet surfaces catch small highlights. Soft distant detail. No text, no letters, no numbers, no UI, no frames, no arrows, no grid lines, no reach dots, no health bars, no targeting rings, no watermark.

### 5.2 Prompt skeleton (fill every slot; store the final text in the sidecar)

> [ASSET: subject, pose, size on canvas]. [CAMERA: overhead square ground | high 3/4 standing figure, feet on the bottom-centre baseline, short soft shadow down-right | flat scene]. [LIGHT: top-left key; local lamp light; district swatches #dark #mid #light]. [PALETTE: world and district hexes from §3]. [EDGES/TEXTURE]. [SILHOUETTE KEY: the one shape that must read at 24 px]. [REFERENCES: "match the style, proportions and finish of the attached approved anchors"]. [NEGATIVE: house negatives].

### 5.3 How to use it

1. Open the brief and the approved anchors (`art-src/anchors/**/*.approved.webp`). Attach, on **every** call: the subject's identity reference, a clean style crop of the approved anchor and the palette strip.
2. Fill the slots. **Camera** per family: tiles overhead; figures, props and foes high 3/4 with the feet on the bottom-centre baseline and **no baked shadow**; scenes flat. **Light** always top-left with the district's three swatches. **Edges/texture** from §2. **Silhouette key** from §4.2.
3. Ask for a transparent background for cutouts (figures, props, material states, plates). Generate at the largest size offered and downscale; never upscale.
4. At most **two rounds of regeneration** per asset. Keep rejects outside Git.
5. Process with `pnpm art:process` (see `scripts/art/README.md`). Store the final prompt, model, references and generation id in the sidecar.

Recipes for recurring cases (figure, floor set, material state, scene) live in [recipes/](recipes/).

## 6. Negative rules

Never paint, in any asset:

- text, letters, numbers, pseudo-lettering or illegible hand squiggles (including on signs, labels, stamps, book spines and the map);
- UI or copied UI: frames, buttons, bars, chips, cards, step numbers, level pips, empty-slot frames, tab shapes;
- tactical marks: red arrows, reach dots, outlines, targeting or selection rings, danger or preview marks, HP bars, corner marks, grid lines;
- a baked figure shadow (the processor composes it) or a side rim light;
- watermarks, signatures, borders or vignettes baked in (a vignette is its own named asset);
- the handover's face, name or pen before the reveal (§4.3);
- texture inside dense text areas, around small glyphs or over a grid mark.

Also: scene crops keep the **central 60 % calm** (UI sits on it) and show **no figures** in fight scenes (units are separate layers). A cutout shows **no matte halo** on `#FFFFFF` or `#101820`. Rune glyphs, icons, crests, step markers, tints per district and pictograms are vector and out of scope for raster.

## 7. Naming

Path: `src/assets/art/<family>/<scope>/<subject>[-<state>].webp`; sidecar and master record at `art-src/<same path>.json` (+ `MASTERS.json` entry, D4).

- **family**: `scenes | tiles | props | units | portraits | foes | map | ui-plates | crests | finds`.
- **scope**: a DistrictId (§3.5), `home`, `city` or `shared`.
- **subject**: lower-case, `kebab-case`, letters and digits only: `floor-a`, `skid-plate`, `bath-steward`, `halvemeer`.
- **state**: a `-state` suffix on the subject: `-worn`, `-card` (portrait card variant), `-night`, `-b`. Variants of a floor set are `floor-a … floor-d`.
- **Layer ids → kebab**: a `LayerId` like `skidPlate` ships as `skid-plate`, `deepMark` as `mark-deep` (see the Pack D list for each exception). Foe ids convert the same way: `deadLetter` → `dead-letter`, `chiefWarden` → `chief-warden`, `dissolvedBather` → `bather`.
- **People by data id**, not by name: `draughtsman`, `stoker`, `runaway`, `notary`, `towelBearer`, `warden`, `tuner`, `copyist`, `exile`, `owner` (people keep the data id's camelCase, the one exception to kebab-case). A name change (BL-40) never moves a file.
- Subjects are never bible names and never contain a district name; the scope carries it.
- Map patches: `map/city/halvemeer` (base) and `map/city/ink-<district-kebab>` (patch).

## 8. Contact-sheet format

`pnpm art:sheet <pack>` renders `docs/art/contact/<pack>.png` (the folder is committed with a placeholder). Every asset on:

- a **light** ground (`#E9DFC8`) and a **dark** ground (`#101820`), side by side;
- a **greyscale row** (same assets, desaturated);
- a **24 px row** for figures and portraits (and the 48 px greyscale silhouette derived by the processor);
- **3×3 self-tiling** and the **mixed A–D neighbour** check for ground tiles (A|B, B|C, C|D, A over D, …);
- the **board crop at 375 px wide** for scenes;
- figures also at the real cell size (about 51 px) and at 58 and 128 px, on a light and a dark tile.

The sheet is what the player and the orchestrator review. Contact sheets and candidates are not shipped and not masters.

## 9. Acceptance at 375×812

From the art bible's "Review at 375 × 812". Reviewed on the Gallery art page and in the product, at phone size:

1. Spot the principal Study controls and the marked fight tiles at a glance.
2. Compare avatars at 24 px in greyscale: each figure and portrait is told apart by silhouette.
3. Check spell selection and charge reads, the widest grid (7×9), stacked effects, tap areas and figure overlap (feet and shadow on both a light and a dark tile).
4. Play a complete chain and skip it.
5. Check final type, text contrast and offline loading once the art is integrated.

Plus (plan §7): every material state side by side has a distinct silhouette and corner area; nothing painted is text, UI chrome, reach dots, arrows or rings; a transparent asset is clean on `#FFFFFF` and `#101820`.

## 10. Known drift and study conflicts

**Known drift:**

- **Floors v2 look flat (player, 2026-11-27):** even lighting fixed the lattice but the ground now reads dull. Ideas parked as BL-136 (light pattern here and there not per tile; more variants; more bespoke ground decals; non-interactable ignorable environment props). Do not undo the no-baked-light-pool rule to fix it.

- **UX-G1 (2026-11-26, player):** finish approved (matte gouache; keep an eye on drifting too grey: hold the district swatch saturation), Pell's flat brim and the ~1.3-cell figure scale approved, marks readable over the art in colour and greyscale. **One trait failed: repeated ground tiles show an obvious lighting pattern** (each tile carries its own pooled highlight, which tiles into a visible dot grid across a 7-column board). Rule for every floor set from now on: **no baked light pools, bright spots or vignette in a ground tile**; tiles carry even, low-contrast stone value only; light is the scene layer's job and a code-drawn lamp pool. Ship **at least four** floor variants per ground, with different stone patterns (not just lighting) and edge-shared; `art:sheet` must show a **full-board repeat check** (7×7 and 7×9 filled by a seeded random variant pick) and the review compares its value mean/variance per cell to catch a visible lattice. The seam/v1 floor-a..d and Lampwater quay/water tiles are therefore **not approved**: regenerate under this rule before UA-11/UA-13 scale them. Approved components (promoted as `*.approved.webp`): the three party figures, portraits and identity references, Seam sentry/slick/cloud/plate/vent, Lampwater eel/lamp-post/lamp-pool.

**Conflicts between the v2 studies, resolved here (the bible wins; UA-3 settles the figures):**

| Item | `seam-v2.png` | `lampwater-v2.png` | Rule |
|---|---|---|---|
| Pell's headwear | a soft **flat cap** | a **long flat brim** | **Flat brim.** Never a cap. The brim is the silhouette key. |
| Pell's carry | a rolled scroll / satchel | a **folio** | **Folio** under the arm. |
| Joost's build | broad, cap-free, holds a staff | broad, bareheaded, dark beard, **apron** | Broad, bareheaded, dark beard, leather apron (no staff). |
| Hanneke | not shown | **pointed hood, narrow cape, hooked pole** | As the bible. |
| Floor | dark patched stone, no grid | stone with a **painted pale grid** | Grid lines are never painted (§6); seams are the tile edges. |
| UI baked into the studies | HP pips, a red arrow, a white selection ring, reach dots, painted labels | HP pips, arrows, rings, dots, labels, flow arrows | All of these are code overlays; **none is art**. |
| Camera | high 3/4 | nearly top-down figures | High 3/4 with feet on the cell, about 1.3 cells tall. |

**Doc conflicts reported to the orchestrator (not resolved here):**

- names-and-voice.md §0 says the owner is "he/him"; §1 says Marit Vos is "they/them". The style sheet uses neither (§4.3).
- party.md §2 describes recruits with "she/her" in its table; names-and-voice.md says apprentices are never gendered. Art follows names-and-voice.
