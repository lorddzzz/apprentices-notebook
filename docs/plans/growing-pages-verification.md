# Growing pages verification

Implementation remains in progress. This report distinguishes completed checks from pending acceptance.

## Shared viewport (V1)

Browser: Codex in-app browser,375×812, temporary standalone harness on port5190 (not a game route).

- Editing sockets measured60×60CSS pixels. No horizontal document overflow or console errors.
- Drag from occupied(0,0),120px left and60px up: cell moved exactly; tap and hold counters stayed0.
- 600ms hold: exactly one hold callback and no tap.
- Fit of two runes at(-1000000,-10)/(1000000,10): two visible inset4px markers, sparse DOM. Blank-space overview tap changed to edit mode without an edit callback.
- Tapping the left marker navigated to exact(-1000000,-10), centered at edit scale; callback counts unchanged.
- Erase all retained exact same visible first-cell coordinates and rectangle. Enter activated a cell exactly once.
- Pointer cancel, capture loss, second pointer, session change during hold and teardown are unit-tested; physical multitouch/device safe areas not tested.

Screenshots inspected:
- [Sparse Fit](growing-pages-evidence/v1-sparse-fit.jpg)
- [Exact marker navigation](growing-pages-evidence/v1-marker-edit.jpg)

Svelte MCP autofixer unavailable. Official Svelte documentation plus project checks used. V1 branch check:99files/3013tests, zero Svelte errors/warnings, lint clean.

## Pending

Study/doorway/Lab/revision integrated phone playthrough, save/reload, proof/Fair Copy, Glyph save/revert, full cross-feature regressions, independent review, final check/build and deployed feature SHA are not yet verified.

## Engine/save integration (E1)

Main gate:3101tests passed. Frozen v7 home/mid-fight/doorway decoded data, compiled spells and replay match their captured baselines; migrated data reloads as v8. Long quiet casts and deferred Jar continuations preserve Source identity without stack overflow.

The cold-load resource-refusal panel was checked in an isolated fake-backend harness at375×812: readable text, no horizontal overflow or console errors, backup button222×55. Download succeeded and retained8388609bytes, matching the fake oversized original. [Screenshot](growing-pages-evidence/e1-resource-refusal.jpg). The fake harness was removed; ordinary player storage was untouched.

## Manual-resume checkpoint

Combined `pnpm check` passed:103files,3113tests, no Svelte errors/warnings or lint errors. Production `pnpm build` passed, with Vite's533kB main-chunk size advisory. A1 has signed Lab cast/action+edit undo/reset/export tests and20kflow-zone coverage. These are pre-UI-integration checks; U1/U2/R1/Q1/F1 remain pending. The integration is preserved on a checkpoint branch and is not deployed to the live game.

## Ordinary editor integration (U1, current resume)

On preview5190 at375×812, Study and doorway use60px sockets with visible ink/shelf controls and no horizontal overflow. Armed-tool dragging did not place/rotate; negative top/left placements preserve the surviving Source's exact screen position. Partial clipped cell taps address the correct signed coordinate without programmatic scrolling; Enter activates once. Erasing a proven Source removes Fair Copy availability without moving the paper. These checks found and fixed resize-camera drift, overflow-focus scrolling and conditional-header layout shift.

A sparse two-million-cell-span page used two overview visual markers; tapping its left marker returned exactly to(-1000000,-10) at edit scale without editing. Fair Copy dragging selected nothing, tapping the proven signed Source selected its three-cell cluster, and naming/fair-copying succeeded with signed selection labels. Doorway growth kept the surviving Glyph anchor fixed; Done retained a pending Vellum pick and distinct spent charges (4/5,2/5,1/5), which survived reload and return home.

Screenshots: [signed growth](growing-pages-evidence/u1-top-left.jpg), [sparse Fit](growing-pages-evidence/u1-distant-fit.jpg), [doorway growth](growing-pages-evidence/u1-doorway-growth.jpg). Lab's integrated lattice controls render at375×812 without horizontal overflow; its full cast/undo/export loop and member-camera checks remain pending. Revision UI, independent review and final integrated acceptance/deployment remain pending. Svelte MCP autofixer unavailable.

Lab follow-up: signed Ink(-1,-2) placement survived switching Stoker→Draughtsman, with the surviving Source rectangle exactly unchanged and paper scrollTop0. [Phone screenshot](growing-pages-evidence/u1-lab.jpg). This verifies member-camera retention; Lab cast/undo/export acceptance remains pending.

## Current combined checkpoint

After U1, engine resource fixes and R1 integration: pnpmcheck passes108files/3178tests, zero Svelte errors/warnings and clean lint. Production build passes with the existing>500kBchunk advisory. R1 adds real-cast/event identity coverage across fixed/growing geometry, signed proof/Fair Copy, version/arg/revert semantics, distinct doorway charges/pending loot/next cast, v7 replay, long sparse inputs and hostile resource boundaries. This remains a local/checkpoint-branch build; U2/revision UI, full independent phone QA/review and final feature deployment remain unfinished.

## Resume4 ordinary-editor acceptance (root browser)

Integrated main92619b5 at375×812:
- Imported an empty page; controls, free paper and shelf fit without horizontal overflow. Placed Source(0,0), dragged from it with Bolt armed180px left/120px up: no rotation/placement; panned again to writable right/bottom margin. Built a second Bolt→Ink→Strike at(6,5)–(8,5), beyond the old right/bottom bounds.
- Held Strike(8,5)600ms: exactly one lift, ink7→5, Source(6,5) rectangle stayed exactlyx157.5/y363.890625. Fit showed both distant spells; tapping G6 returned to60px edit target and unchanged ink/Source.
- Lab sandbox: added Ink/Strike and unused Oil(-1,0). Undo removed only the Oil edit; re-added it. Copy lattices and Copy as scenario contain @lattice1growing and exact signed/world coordinates, including(-1,0),(6,5),(7,5), with no blank rectangle.
- Actual Lab Bolt-up cast hit the steam cloud at B5 and produced brand cloud; log records the cast/stopping cloud, unlimited charges stay5/5. Undo restored original steam cloud. Reset removed Lab-only edits; returning Study retained precisely its original three placements, proving notebook isolation.
- Screenshots inspected: q1-right-bottom.jpg, q1-two-spell-fit.jpg and q1-lab-cast.jpg in growing-pages-evidence. Existing unit/scenario tests cover parsing/export roundtrip beyond this visible export check.

Revision integration and independent phone QA/review remain pending at this point.

## Revision UI (U2)

Sourcec210d76 verified at375×812 onrootpreview5191. A valid eight-cell inside throughlocalx7 has60px targets; Fit shows its entire flow, tappingx7 returns to edit scale and makesblankx8 writable. Adding a ninth flow cell yields the independent3–8flowcells issue and disablesSave; Reset restores the original without a version. ReplacingInk(6,0)withOil enablesSave; armedtool drag overOil does notedit. Save createdexactlyv3 with0casts; profilerVersions retainedv2's12casts. Revert restoredv2 and its silver/goldrecords throughreload.

Negative bent inside showsaligned flow through(-2,-1),(-1,-1),(0,-1). Erase onpinnedentry(0,0) leavesSourceunchanged and reportsentry-stays; validnegativeedit enablesSave,Canceldiscardsit. Longread-onlyinside scrollswithin sheet at40pxcells withoutdocumentoverflow, withnormalexit anchoredtoterminalcell. Controls/issues/palette/footerremainreachable in sheet. No consoleerrors; SvelteMCPautofixer unavailable. Screenshots:u2-long-fit.jpg,u2-long-edit.jpg,u2-negative.jpg,u2-version-v3.jpg.

## Independent review findings and fixes

Final Medium review confirmed a resource bug:1500plain Sources feeding downward Bends converged into1,128,750retained path cells from a153KBaccepted save, with~264MBadditionaldesktopheap. This is measured desktop evidence, not a physical phone timing. An allocation-free aggregate traversal/trail preflight is being integrated; a focused save/scenario/backend regression gate covers the refusal.

Root phone confirmed the reviewer's sparse-profiler concern: accepted Glyph cells at(0,0),(1000000,0),(1000001,0) produced a33,554,432pxCSSgrid and zero-width distant cells. Sourceb030a0c fixes this: compact insides (<=12cells per axis) keep readable scrolling; larger bounds use the shared bounded read-only viewport. Fit's distant marker navigates to exactInk/Strike coordinates at60px, maxdialogdescendant375px, nohorizontaloverflow, unchangedv2aftertap. [Before](growing-pages-evidence/f1-profiler-before.jpg), [fixed](growing-pages-evidence/f1-profiler-bounded.jpg). Sourcegate3183tests/108files.
