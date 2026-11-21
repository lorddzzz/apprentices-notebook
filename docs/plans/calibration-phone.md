# CAL-P: phone evidence for the drawn corpus (emulated only)

Revision: branch `build/pack-p` on `48ac3f0` plus the dev-page selector. Corpus: the merged CAL-5 `CAL_DRAWINGS` (seed `s` takes drawing `(s-1) mod n`, one room of it, pair household, `calibrationProfile`). Device: **emulated**, HeadlessChrome 153 on macOS (Playwright, 375×812 @2x, touch), dev server `pnpm dev --port 5194`. It checks layout and the worker path; it is **not** iPhone hardware.

## EN-13 timing (60 rooms, seeds 1-60, emulated desktop CPU)

Definitions: `ms` = `performance.now()` around `generateRoom` on the main thread. `workerMs` = the production worker's own reported `ms` (`generation.worker.ts::handle`). Round trip = main-thread wall time of `workerInker().ink`. Median/p95 are over accepted (non-fallback) rooms; 11 of 60 were fallbacks (not counted).

| Run | Direct median / p95 | Worker (inside) median / p95 | Worker round trip median / p95 | Accepted |
|---|---|---|---|---|
| cold (first since load) | 111 / 526 ms | 115 / 520 ms | 116 / 520 ms | 49 |
| warm (second run) | 108 / 505 ms | 118 / 522 ms | 119 / 522 ms | 49 |

Bar: median ≤0.5 s, p95 ≤2 s per accepted room. Met on the emulated desktop CPU. **Real-iPhone timing is owed and unverified**; do not read these as phone numbers, nor as a regression proof against the old P29 iPhone timings. Fallback rate (11/60 = 18%) and 8 dull rooms are the CAL-5 corpus's, reported here without a bar.

Raw samples (corpus, UA, viewport, definition, per-seed ms/workerMs/wallMs): `calibration-evidence/cal-p-timing-chromium-cold.json`, `...-warm.json`. Screenshots: `cal-p-generator-chromium-cold.png`, `...-warm.png`. Reproduce: open `/apprentices-notebook/src/app/dev/generator.html`, Corpus "CAL-5 frozen drawings", Rooms 60, Run; "Raw samples" holds the JSON. On a real iPhone, run it twice (cold, then warm) and attach the export.

## Playable states at 375×812 (emulated)

Save: `calibrationProfile(pair)` with handover set, Light, Medium and Heavy Marginalia in the three slots. One light trip played to the end with `window.__game.debug.forceWin()` (no fights fought for real). No horizontal overflow in any state; no console errors in the app run.

| State | Screenshot |
|---|---|
| Drawing table, three pages | `calibration-evidence/cal-p-01-drawing-table.png` |
| Desk (runes, pen) | `cal-p-02-desk-pen.png` |
| Set out dialog, light / medium / heavy | `cal-p-03-setout-dialog-light.png`, `-04-...-medium.png`, `-05-...-heavy.png` |
| Set out, inking (1.5 s dev delay) | `cal-p-06-setout-inking.png` |
| Loot, room 2 prefetch | `cal-p-07-loot-prefetch.png`, `cal-p-08-loot-prefetch-after-wait.png` |
| Crossroads | `cal-p-09-crossroads-enc0.png`, `cal-p-11-crossroads-enc1.png` |
| Reload mid-trip (room 2 fight resumed) | `cal-p-10-reload-mid-trip-fight-enc1.png` |
| Drawn heart (marginalia) and win | `cal-p-12-heart-room.png`, `cal-p-13-heart-won.png` |
| Cleared / returned home | `cal-p-14-state-cleared.png`, `cal-p-15-returned-home.png` |

Prefetch: at the first loot screen the trip's rooms were `[1,0,0]` inked; 2.5 s later `[1,1,0]` (room 2 inked while choosing loot). Not exercised: setting out on the medium and heavy pages (only their dialogs), a real played fight, Home Screen install, safe-area notches.
