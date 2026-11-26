# Program, foundations and art review

## Summary verdict

Start the placeholder fight and a small art pilot after correcting the shared contracts. Hold production art until UX-G1.  
As written, a worker following the art brief can deliver correct pixels that fail UF's validator or never appear in the game.  
The painted targets establish the finish. They also contain text, tactical marks and UI that a whole-image reference can reproduce.  
The 25–35 hour estimate, offline budget and repository projection are planning assumptions. None has been measured on a representative pack.

## Must-fix

1. **Give producers and consumers one usable asset contract.** Program C2–C4/R10/R19, UF-2/7, UA preamble and J/R. UF requires opaque tiles and alpha 192² portraits. UA requires transparent shared material tiles, opaque portraits and 222×330 cards in that same portrait family. UF expects a full-size map where R19 requires cropped overlays. Define rules by asset role within each path, including boss, standing prop, vignette, strip and nine-slice exceptions. Test valid and invalid examples, including real transparency, missing master, mismatched dimensions and out-of-bounds bbox. Define a build-derived public metadata lookup for actual size, original-canvas bbox and slice in source pixels. UT needs offsets, UH needs slice insets and Gallery needs byte counts. Keep prompts, references and masters out of the client bundle. Prove this with an empty tree and representative file drops before freezing C2.
2. **Prove the image-worker round trip and make the recipes executable.** UA-A/§1/B1/B2/J. The sample 1024² PNG skips reference attachment, returned-image access in the worker clone, transparent generation and anchor-only output. The only documented processor writes shipping files outside B1/B2's Owns. Pilot one referenced figure, ground and scene crop through generation, processing, binary patch import and re-open in a clean checkout. Give the processor explicit scratch/anchor and ship destinations. Build the 750×3800 map from overlapping panels with shared landmarks and a fixed placement mask, or crop a sufficiently large source after checking resolution. The 5.07:1 target exceeds the documented 3:1 direct-generation ratio. Log the observed tool, exposed image model or “unexposed”, input refs, accepted bytes, elapsed time and retries. A Codex worker model name cannot establish image capabilities. [OpenAI image generation guide](https://developers.openai.com/api/docs/guides/image-generation)
3. **Make repeatability a processing and review task.** UA preamble, A, C–G, M–Q. Alpha trim sees the shadow, hem or pole tip as well as the feet. Supply a source-pixel ground-contact point, target centre/baseline, body-height range and shadow mask or separate standard shadow. Test a foot at (64,160) within a declared tolerance, plus the boss equivalent, on light/dark tiles. Keep one approved identity reference per person and derive portraits/cards by crop or referenced edit. Give each prompt the subject reference, a clean style crop and the palette strip. Compare dominant value masses against the approved sample and inspect every output at native and display size for lettering, pseudo-labels and copied UI. Ban map margin writing per the board. For floors, derive variants with common edge pixels, offset-wrap and repair seams, then test mixed A–D neighbours as well as self-tiling. A 3×3 repeat of A can pass while A/B has a visible border.
4. **Make UX-G1 a real-size, bounded approval.** Program §4, UA-D11/D12, briefs B1/B2/D. Seven 58 px cells need 406 px before padding. Real frames include 7×7 Marginalia and 7×9 Lampwater. Use the fight layout's measured inner width and cell formula (roughly 51 px on the wide board), plus its actual overlay or a verified vector copy. Show separate 375×812 views with adjacent figures, material under a figure, intent crossing it, HP, preview and charge in colour and greyscale. Do not fit three columns of candidates into one phone image. B1 alone estimates ~60 candidates before retries. Pick one promising set per anchor, allow alternatives only for failed traits, and name the approved *component files*, candidate version and contact view in the approval record. Promote usable tiles and figures directly. B2 needs a Seam comparison from B1 for its final sheet. Code proceeds while the player decides.
5. **Reconcile the inventory against actual game states.** UA-D1/D3, packs D/F/K/L/M/N/R, FT-D7. There are 33 entries in `src/data/enemies.ts:ENEMY_IDS`; `barge` is drawn by canals' CrateArt, `clockSeal` by inkQuarter's StaffToken, and `dissolvedBather` is called `bather` in UA. Even `deadLetter` and `chiefWarden` require explicit filename conversion. Test a stable mapping for each data id to an ArtId, shared alias or intentional vector fallback, including borrowed foes in other districts. Pack D's list sums to 36 (20 materials + 2 jars + 2 scenes + 5 grounds + 5 foes + portrait), against 35 required. K paints heart doors for seven districts although Threshold is an entrance puzzle, Seam has no gate and Bridges uses the wardens' pass. Paint the five actual locks from their threshold specs. L omits the real key offer in `src/data/types.ts:LootSpec`; specify its existing card or art fallback. Keep the expected IDs in durable pack data or tests before completed briefs are deleted. Never change game data to satisfy an illustration.
6. **Split Wave 0 and prove the fixture route before scheduling consumers.** UF plan §4–5/9, briefs 0/D, program C8/R6/R18. One 1.5 L merge gates both streams on CSS, six stubs, image validation, Workbox and a router bootstrap. Land C1/C7 and motion signatures first, then independent art-contract and fixture-loader packs with named consumers. Prove one hard case early. `routes.ts` maps unknown hashes to Study, `router.svelte.ts` snapshots the hash, and bare `history.replaceState` does not update that store. Use the existing `go(...,{replace:true})` path after selecting a memory backend before singleton construction. Define fixture route params (e.g. threshold district, Gallery part), semantic expected state, post-mount tap readiness and the actual replay start board/events for a frozen chain. Test cold load, a second fixture, local save sentinel, absent production loader and a screenshot assertion for the requested step/sheet. Partition UF-14/15's dozens of fixtures by first consumer. UT-2 supplies a wipe and FT-3 playback before those subsets pass. A resolved route or a copied list of names cannot prove the displayed sub-state.
7. **Repair pack ownership, prerequisites and worker handoff.** Program §4/§7, UA plan §5/9, UA briefs A–T, UF A–D. At review time the plans, board snapshot and studies are untracked. A Git-enabled worker sees only its base commit. At build start verify the selected inputs exist at that SHA. Grant UA-A `pnpm-lock.yaml` for its direct sharp importer, sequence its package edit after UF-2, and ensure UF-2's decoder works before UA-A lands. Give UF-A the actual theme import and preload location. Narrow district globs to named files (UA-F/K, J/R, G/H/T, C/T). Explicitly order G before H/I. D needs C's figures or approved B1 copies, and S needs G1. Name a separate final review dependency for UF-7, which is unavailable to the anchor packs. B/C depend on A's Gallery harness for some screenshots or need an owned temporary harness. Keep accepted partial assets on an exportable branch at timeout, attach exact missing IDs, and use the project fast gate before commits. Re-estimate remaining pack sizes after the pilot.
8. **Enforce the readability and offline gates on the integrated build.** Program §6, UF-1/2/7/8, UA §7. A selector scan misses a hardcoded SVG stroke, a district-coloured ancestor/filter, or a figure/FX covering a valid token. Assert the allowed tactical paints at their consumers and compare the same danger, reach and preview state over light/dark art across districts. Require the greyscale phone view with actual z-order, boss overlap and stacked effects after either layer changes. Measure hit rectangles in both dimensions in the browser. `package.json` has independent `check` and `check:fast` scripts and deploy CI runs `check`. Put the art validator in both paths. At the pilot and Close inspect built precache entries, fonts and tiny inlined assets, and cold-reload offline under the deployed base path after service-worker activation. Budget the combined install as well as source WebPs.

## Should-fix

- **Budget and masters (D4/D5, UA §3/6).** The party pack measures mostly small figures. Sample a full-height scene, transparent edges, four mixed tiles and the map before committing to the caps. Record shipped bytes, decoded dimensions, master bytes, contact sheets, rejects and incremental Git growth separately. Eight full map layers plus base would decode to about 98 MiB at four bytes/pixel if loaded together. R19 materially reduces this. Count Underjoin in the map allowance. State decimal MB or MiB and make over-budget and missing-master tests fail deliberately. The proposed “second drawer middle” cut has no corresponding asset in G.
- **Archival policy (C3, UA preamble/G1).** State whether the lossless master is the accepted native-resolution source or the final-size processed cutout. A 128×176 lossless export cannot recover discarded detail. Retain the accepted source or a backed-up content-addressed archive plus original dimensions, hash, crop/anchor, processor version, quality and reference hashes. Keep rejected candidates and regenerable full-size sheets outside permanent Git history. A later LFS migration cannot shrink already-cloned history without a rewrite. Measure one pack before promising 120 or 150–300 MB.
- **Map placement (B2/J/R, UT-4).** `src/ui/screens/Map.svelte` anchors nodes to a fixed 1900 CSS px layer inside a variable-width page. Normalise bbox x/width to its measured width and y/height to that fixed height. Check 375 and 430 widths and a tall page with appended drawn districts. Underjoin is a slot below Seam in this component. Verify its rendered location before paying for a patch at the data entry's 50%/92%.
- **C7 and device behaviour (UF-3/8/11/12).** Freeze the actual props consumers compile against, including accessible name for icon-only buttons, back callback versus route, two-line fight status, crest component-to-snippet adapter and reduced-motion getter. Render a Study and a fight header before locking the signatures. Scope prefs so changing Motion during a fixture cannot write the real save. Verify copy fallback when clipboard is denied, invalid paste, cancel/confirm reset, and returning from Lab in a live trip. Use the existing GameStore import/reset methods.
- **Decision record (D11).** The player sheet cites R1–R15, later adds R16/17, omits R18/19 and exposes only selected UF/UA decisions. Link all local decisions and aliases to their canonical row. Resolve “UA-2 anchors” (tooling is UA-2, anchors UA-3…8), “UA-S owner” (T), and “nothing waits” (G1 gates scaling). Give the reviewer a concrete picker for each anchor. Authorise only the existing quiet-doorway editing route. A generic “Open in the Study” on Crossroads could grant rewiring outside the existing `trip.status === 'doorway'` flow.
- **Acceptance quality (UF-5/16, UA R/S/T).** Name the licensed font sources and subset features, include OFL notices and test loaded faces and small caps on real copy. A distinct SVG path string cannot prove two glyphs read differently at 20 px. For R/S/T give explicit Done-when rows, exact refs, recognisability checks and no-spoiler before/after fixtures. Carry a durable review result per district and art revision into Close.

## Decision verdicts

Local UF-P numbers below include the corresponding UF-D aliases used in the player sheet. R1–R19 are evaluated as the governing decisions.

| Decision id | Agree/disagree | Reason | Suggested change |
|---|---|---|---|
| D1 | Agree | File drops keep layouts playable during art work. | Validate zero, partial and full art sets. |
| D2 | Agree | Fight is the tightest composition. | Release tasks by prerequisite, including early UH-3 and UT-2. |
| D3 | Agree | One player choice limits expensive drift. | Use the bounded native-size G1 in finding 4. |
| D4 | Disagree | Committing every revision before measuring locks in binary history. | Decide accepted-source storage at the pilot. |
| D5 | Agree | Offline access is settled and limits can be measured. | Include install size and largest scene/map samples. |
| D6 | Agree | Fixed delivery geometry simplifies row overlap. | Separate model input, source master, ship size and cropped exceptions. |
| D7 | Agree | Motion belongs to the device and leaves SaveData intact. | Apply scaling once and react to OS preference changes. |
| D8 | Disagree | Declaration scans alone cannot enforce flat, visible tactical marks. | Gate on real consumers and rendered states too. |
| D9 | Agree | Presentation reducers and playback can be tested without altering rules. | Include existing-save and doorway eligibility regression cases. |
| D10 | Agree | Routing matches the intended division of labour. | Verify actual image capability and binary handoff in the selected clone. |
| D11 | Agree | Shared ownership needs a single authority. | Publish all 19 rulings in runnable briefs. |
| UF-P1 / UF-D3 | Disagree | §0 asks for one serif and one script. A third face adds an unapproved choice. | Show the two-face sample first. Hold Kalam for player choice. |
| UF-P2 | Agree | Small caps preserve authored strings. | Verify subset features on device. |
| UF-P3 / UF-D4 | Agree | Existing screens still read the legacy variables. | Remove aliases only after checking consumers. |
| UF-P4 | Disagree | The proposed test allows bypasses. Current preview alias points to amber selection. | Verify actual overlay paints and keep discovery gold unique. |
| UF-P5 | Agree | Nine scoped blocks match DISTRICT_IDS. | Keep the world-root prefix permanently. |
| UF-P6 | Agree | Memory fixtures protect the notebook. | Specify router bootstrap, params and state assertions. |
| UF-P7 / UF-D2 | Disagree | Family-only size and alpha rules reject valid UA output. | Use role-specific rules with tested exceptions. |
| UF-P8 | Agree | Synchronous fallback supports independent merges. | Add minimal geometry metadata for bbox and slices. |
| UF-P9 | Agree | One motion scale is sufficient. | Export reduced state from the first stub and test live updates. |
| UF-P10 / UF-D6 | Agree | Release Lab preserves the existing lesson path. | Retain existing save-action safeguards in every world. |
| UF-P11 | Agree | A handle-only gesture preserves scrolling. | Exercise Escape, swipe cancellation, body scroll and dismissal. |
| UF-P12 | Agree | About can own the build id. | Land a usable About entry with stamp removal. |
| UF-P13 | Agree | Eight bounded vector redraws leave mechanics untouched. | Test same-role recognition at 20 px. |
| UA-D1 | Agree | Stable data ids survive copy changes. | Specify every exceptional lookup and fallback. |
| UA-D2 | Agree | Pair plus seven recruits matches the registry. | Gate owner visibility by existing progression in every player UI. |
| UA-D3 | Agree | The two larger bosses still occupy one rules cell. | Show neighbour intents, own-cell outline and edge clipping. |
| UA-D4 | Agree | A derived silhouette measures the shipped figure. | Preserve aspect ratio and inspect at 24 px too. |
| UA-D5 | Agree | Shared material shapes teach one visual vocabulary. | Test compound/worn variants on wet and pale grounds. |
| UA-D6 | Disagree | Four generated phases add continuity work before proving value. | Default to one hero frame and FT's scale/fade. |
| UA-D7 | Agree | The header can use the agreed top crop. | Specify top alignment, shelf baseline and object coordinates. |
| UA-D8 | Disagree | Full-canvas overlays conflict with R19 and the map's memory budget. | Generate on a registered plate, ship cropped patches. |
| UA-D9 | Agree | Shared scripts can normalise exports. | Grant lockfile and exercise both anchor and ship modes. |
| UA-D10 | Agree | Automatic discovery avoids duplicate runtime registration. | Retain durable build/test expectations per pack. |
| UA-D11 | Agree | Anchors outside runtime assets keep approval cheap to reverse. | Record approved component paths and use correct grid width. |
| UA-D12 | Disagree | Three whole sets times two rounds overproduces before feedback. | Generate alternatives only for a failed or undecided trait. |
| UA-D13 | Agree | 4.5 MB is a workable provisional allocation. | Validate with representative scenes and total install. |
| R1 | Agree | Ordered shared-file edits are mergeable. | Name the predecessor SHA and precise grant at dispatch. |
| R2 | Agree | A single district lookup avoids divergent theme data. | Resolve shared and borrowed foes via their definition. |
| R3 | Agree | One read-only lattice view reduces behavioural drift. | Schedule UH-3 before FT pocket and UT mounts. |
| R4 | Agree | Menu keeps Lab accessible and Gallery gated. | Test direct hashes as well as menu rows. |
| R5 | Agree | A timing adapter keeps FT moving. | Assign removal to a named FT merge after UF-11. |
| R6 | Agree | Wipe stays ephemeral as it is today. | Carry UT-2 into UF's actual fixture acceptance. |
| R7 | Agree | SVG marks currently use the same attribute. | Preserve the scoped selector after the rename. |
| R8 | Agree | One owner prevents district CSS conflicts. | Compare UA swatches against the same nine values. |
| R9 | Agree | Steam has one component owner. | Give FT the failing Thermae fixture and screenshot. |
| R10 | Agree | A sidecar can describe each delivered file. | Validate the decoded file, master and role. |
| R11 | Agree | A reproducible processor and derived silhouette pay for themselves. | Resolve direct dependency and clone installation. |
| R12 | Agree | The 176+48 crop is explicit. | Exercise seating tabs, shelf objects and tap areas on device. |
| R13 | Agree | Paint can overlap without enlarging a target. | Verify the neighbour remains selectable under a boss. |
| R14 | Agree | APPRENTICES and RIVALS support the counts. | Audit ordinary foes separately against ENEMY_IDS. |
| R15 | Agree | An intro and known offers preserve the existing choices. | Remove inaccessible threshold art and cover key offers. |
| R16 | Agree | Small vector crests remain crisp. | Type and render the FT crest through UF's snippet. |
| R17 | Agree | One editor preserves draft and commit semantics. | Show the edit link only in a legal doorway. |
| R18 | Agree | Fixtures need repeatable interaction and replay state. | Fail on missing taps or mismatched frozen step. |
| R19 | Agree | Cropped ink saves transfer and decoded memory. | Publish bbox units and test overlay registration at two widths. |

## Cuts/simplifications

- Keep one accepted version per identity. Reuse approved anchor pieces in the first party and district drops. Use a single redraw request for a named defect.
- Start with one find per kind, two compatible floor variants, one FX frame and a vector key if its existing card suffices. Add variants after the integrated phone check identifies visible repetition.
- Keep Gallery focused on what a reviewer can see. Report missing masters, provenance and budgets in the build script. This removes the need to ship private metadata for a developer screen.
- Remove the proposed selector-prefix cleanup and spare header sizes until a real caller needs them. Put fixture recipes beside the per-screen acceptance work instead of building every future sub-state up front.

## Questions only the player can answer

- At UX-G1, which paint finish, Pell silhouette and figure scale read as your game at actual phone size? Default to the bible's flat brim and the smallest scale that keeps each person recognisable.
- After seeing measured source and clone sizes, do you value a self-contained Git history enough to carry the accepted native masters, or prefer a backed-up art archive with hashes in Git?
- Does the apprentice need a distinct handwriting face alongside the owner's script and reading serif? Default to the two faces already agreed until the phone sample shows a reason to add one.
