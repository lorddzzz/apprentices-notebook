# UX program build log

| ID | Commit | Model / effort | Returns | Usage Δ | Note |
|---|---|---|---|---|---|
| UF-1, UF-3 | 5ad3cf5, 32bfbb2 | Opus / high | 0 | ~7% | tokens (C1, aliases kept), six C7 stubs, header.ts helpers, prefs stub; proposals accepted (.label under [data-world], --overlay-preview = --m-oil, --gold #c9a227) |
| UA-1, UA-2 | 89b1f39, bcae482 | Sonnet / high | 0 | ~8% | style sheet + review checklist + recipes; process.mjs/sheet.mjs/selftest (figure ground point, halo, role fail, A–D check); sharp 0.35.5 |
| UF-11, UF-12, UF-13 | 5554332..259f986 | Sonnet / high | 0 | ~9% | device prefs, MenuSheet (R4), stamp out of App.svelte; main.ts import added by orchestrator |
| FT-4 (FT Pack 0b) | 6f76e9e | Codex Sol / high | 0 | ~3% Codex | fightArt.ts, fightTheme, crestFor; 7 tests; crestSnippet got optional props (accepted) |
| UA-P (processing) | see git log art(pilot) | Codex Sol / high (CLI) | 0 | ~25% Codex 5h | processed 4 pilot sources; tooling worked, sidecar gaps noted; generation half was done earlier by the player |
| FT-1, FT-2, FT-3, FT-3b | 2912ae1..7a955df (+FT-3b) | Codex Sol / high | 0 | ~25% Codex | projectBatch/firsts, hold table, input routing; 35 tests; FT-3b done by orchestrator (prefs guard for fake document) |
| UA-7, UA-8 (B2) | see git log art(anchors-2) | Codex Sol / high | 0 | ~10% Codex | map plate + Sestante anchors; 237 KB accepted; orchestrator looked at the sheet, looks right |
| UA-3..UA-6, UX-G1 (B1) | see git log art(anchors-1) | Codex Sol / high | 0 | ~25% Codex | 28 scratch anchors, 453 KB; two generation retries (Hanneke shadow/hook, vent brackets); 10 UX-G1 views |
| UF-8, UF-9, UF-10 | f4a8293, 88d6590, d7470fd | Sonnet / high | 1 (stopped/resumed for usage) | ~15% | AppHeader/ActionButton/Card/Unseen/StepMarker looks, Sheet size+swipe, Toasts; first report lost, reviewed from branch |
| UF-16 | bb330ab | Sonnet / high | 0 | ~4% | eight glyphs redrawn; 8 runeArt tests; 20/48 px colour+grey screenshots |
| UA floors-v2 | see git log art(floors-v2) | Codex Sol / high | 0 | ~15% Codex | repeat check in art:sheet + selftest; 13 floors 34.8 KB; 3 retries; lattice 4.8->0.24 |
| UF-5, UF-6, UF-7 | 93d2eaa..a717092 | Sonnet / high | 0 | ~12% | fonts (OFL, 170 KB), Gallery tokens/art pages, grey toggle; report lost, reviewed from branch |
| UT-1, UT-2, UT-3 | be58d3a, 6082736, 662bf6e | Codex Sol / high | 0 | ~25% Codex | tripUx.ts pure logic + flow.ts optional WipeSummary fields; 20 tests |
| UA-9 (party) | see git log art(party) | Codex Sol / high | 0 | ~20% Codex | 27 assets, 166 KB; 0 retries; masters uploaded by orchestrator |
| UH-0 | c461097 | Sonnet / high | 0 | ~4% | HomeStrip + RoomObject (hidden keeps footprint); proposals noted |
| UF-15c (D3) | dd6708e | Sonnet / high | 0 | ~5% | three static fight fixtures; report lost, reviewed from branch |
| UF-4 | be2c0e6 | Opus / high | 0 | ~5% | dev fixture loader (memory backend, go replace), burnt-threshold replay + study-fresh, grey=1; report lost, reviewed from branch |
| UF-2 | b49271d | Opus / high | 0 | ~6% | registry, artMeta, role art:check (both gates), inventory; 26+8+5 tests; proposals accepted (2 MiB single-asset cap, ±4 px ground tolerance) |

## Usage readings

| Time | Claude 5h / week | Codex 5h / week | Action |
|---|---|---|---|
| 2026-11-26 start | 1% / 19% | 3% / 61% | wave 0 spawn |
| 22:48 | 93% / 27% | 92% / 75% | throttled; B1 merged |
| 23:17 | 0% / 27% | 0% / 75% | windows reset; spawned UA floors + UA-C party (Codex), UF-A (Claude), resumed UF-B |
