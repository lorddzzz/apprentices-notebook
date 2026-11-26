# UA-P pilot source art

Generated on 2026-11-26 with the built-in `image_gen` tool. The image model and seed were unexposed. Each source took one generation call.

| Source PNG | Native size | Source bytes | Generation time | Input |
| --- | --- | ---: | ---: | --- |
| Pell | 1024 × 1536 | 1,563,631 | 119 s | Lampwater subject and paint crops |
| Floor A | 1254 × 1254 | 2,117,421 | 35 s | Seam paint and architecture crop |
| Floor B | 1254 × 1254 | 1,931,472 | 27 s | Floor A source |
| Scene | 1214 × 1295 | 1,855,681 | 75 s | Seam paint and architecture crop |

Reference crops are reproducible from `docs/design/art-studies/`. Coordinates are top-left source pixels in x, y, width, height order.

| Reference | Study | Crop | SHA-256 |
| --- | --- | --- | --- |
| Pell subject | `lampwater-v2.png` | 296, 658, 130, 123 | `95549472f3efcc3c529f06869d328fe96062a52b2ee0ae409ade4b470348e05f` |
| Lampwater paint | `lampwater-v2.png` | 30, 252, 398, 350 | `df73b53bdb77908df7227852925f93d4c1476a59bc3a69f736723c4606c47c65` |
| Seam paint and architecture | `seam-v2.png` | 21, 230, 810, 1025 | `0c22314c709cbb855a353571ac5a5b3be1d00eb03d2fb68e03baf90f77cb6e16` |

## Source inspection

- All four PNGs decode. Pell contains 1,097,745 fully transparent pixels and 444,171 pixels with alpha at least 250. Its maximum alpha is 254. The tile and scene PNGs are opaque.
- Floor A and B differ by a mean of 3.36 out of 255 per RGB channel at corresponding perimeter pixels. Only 18 of 5,012 perimeter pixels match exactly. The 128×128 self-tiling and mixed-neighbor checks are pending.
- Processing depends on UA-2 and UF Pack 0b. Ground-contact placement, alpha edge review on light and dark tiles, shared tile edges, role-sized WebPs, sidecars and lossless masters, the contact sheet, clean-checkout binary handoff, phone-size review, Git growth and offline install measurements are pending. The table reports native PNG sizes only.

## Generation prompts

### pell

> Create a production sprite source for The Apprentice’s Notebook from the two attached crops. Image 1 identifies Pell, the draughtsman: slim young adult man, dark blue-slate work coat, a distinct long flat brim on a low dark hat, parchment folio tucked under one arm. Continue the referenced upper body to show a complete standing head-to-boots figure. Image 2 shows the matte hand-painted gouache finish only. High three-quarter overhead tactics camera, looking down steeply enough to plainly see the crown of his hat and tops of his boots, body facing toward screen-right with a slight turn toward the viewer. Both boots are fully present, with a clear ground contact between them. Simple large shapes legible downsampled to a roughly 50 CSS px cell, few fine engraved accents, warm soft upper-left light with cool deep folds. Keep his long brim, slim build and folio visually separate. A single centered full-body figure with padding around all edges on true transparency. Omit any contact or cast shadow, floor, lettering, gameplay indicators, brackets, selection frame, decorative base, or alternate figures.

### floor-a

> Create a single opaque square repeatable ground tile for The Seam in The Apprentice’s Notebook, based on the unobstructed slate floor in the attached study. Strict orthographic overhead. One broad worn flagstone with patches of slate-green grey #55625E, moisture and extremely muted copper undertone, low contrast with #253235, broad matte gouache paint masses, sparse shallow engravings and fine broken grain. Let the upper left lend a soft diffuse cue without a hotspot. Fill the entire square edge-to-edge. Keep all four perimeter strips level in value and visually even so neighbors join, with subtle wear confined to the interior. No outlines, outer frame, beveled border, corner vignettes, grid marks, symbols, oil drops, hardware, objects, figures or text. Curate the quiet value hierarchy for a layer underneath tactical marks, to be downsampled to 128 square.

### floor-b

> Edit the single square Seam ground tile into a second low-contrast floor variation for The Apprentice’s Notebook. Preserve the exact aspect ratio, framing, palette, lighting and all outside edges from the input. Leave a generous unchanged border about 20% in from each edge, including all four corners. Make a small enough edit that the two tiles look drawn from the same stone floor: add an uneven faint rubbed patch and two very short thin slate fissures in the center only. Blend within the middle square with the same quiet matte gouache grain; avoid bright highlights or obvious crossing marks. Return one opaque edge-to-edge square tile, still strictly overhead, with no objects, outlines, frames, UI, symbols, lettering or decorative shapes. It is intended for an A|B neighbor check at 128×128.

### scene

> Create an opaque background crop for a 750×800 Seam fight backdrop, using the attached Seam study as a paint and architecture reference. Near-square portrait aspect around 15:16. High overhead tactics camera over an old rain-damp working undercroft, nearly orthographic through the central battle area. Suggest The Seam with two adjacent brick courses that barely meet along the upper framing, a slim oxidized pipe by the left edge, a dark metal vent high at the right edge and only a fragment of steps at lower right. Keep the interior clear and subdued, populated with broad quiet wet slate value masses with no gameplay grid. Use dominant charcoal teal #253235, subdued stone #55625E, traces of copper #BC9273 at the upper left, top-left diffuse light, matte gouache and sparse engraved edges. No standing people, creatures, oil patches, steam clouds, tactical markings, numerals, icons, HUD, borders, labels or text. Put the environment at the edges and leave the wide center low contrast for the tactical layers.
