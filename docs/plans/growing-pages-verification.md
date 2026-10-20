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
