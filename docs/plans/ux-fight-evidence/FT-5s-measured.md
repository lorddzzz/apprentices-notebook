# FT-5s: layout spike, measured table

Status: **measured, awaiting orchestrator signature.** Pack A1 (A1a), `build/pack-fta1`, base `dd6708e`.

## How this was measured

- The **real `BattleBoard`** is mounted in `ft5s/harness.html` inside a 375-wide frame laid out with the FT-D9 budget: header 56, bottom stack 200 (party 56 + spell row 56 + one 52 row of log icon, Skip, End turn + three 12 gaps; the old 6 px column gap between blocks stays), the board filling the rest, a 28 px caption/trick banner overlaying the board's top edge (`pointer-events: none`). Header and stack are placeholders with the budgeted sizes; Pack B builds the real ones. The board scales by the existing `viewBox` + `preserveAspectRatio="xMidYMid meet"` rule, which is exactly what `boardLayout` (FT-5) computes.
- `ft5s/measure.mjs` (headless Chromium, `getBoundingClientRect`, `elementFromPoint`) drives every size of the plan's matrix. The matrix's sizes all lie in cols 5-7 x rows 6-9, so all **12** are measured (each listed district size, and the drawn pages' 5-7 x 6-9). States: **normal** (idle), **tall** (a figure on rows 1 and 2 of every column: vertically adjacent pairs, a figure at the top edge), **boss** (boss figure at the top edge, boss line in the header, trick banner), **end** (the end overlay of 200 replaces the stack; the final board is checked). Devices: 375x812 with 44/34 insets; 375x667 with 20/0 (what a 667 phone, the SE/8 class, really has: no notch, no home bar); and 375x667 with 44/34 as a stress case no real 667 device has.
- Re-run: `pnpm dev --port 5191 --strictPort`, then `PLAYWRIGHT_CORE=<path to playwright-core> node ft5s/measure.mjs`. Playwright is not a repo dependency.
- "cells obscured" = cells whose centre or any inner corner hits another element than that cell's hit rect (the caption does not count: it ignores pointer events). "headroom above row 1" = px from the top of the board area to the top of row 1 (column-label gutter plus meet slack). "lap needed" = a third of the cell, what a standing figure rises into the row above (FT-D10).

## Result

| check | 812 (44/34) | 667 (20/0) | 667 (44/34, stress) |
|---|---|---|---|
| cell px, smallest (7x9) / largest (5x6) | **49.6** / 68.5 | **41.0** / 60.7 | **34.7** / 51.4 |
| gate: 7x9 >= 44 at 812, >= 38 at 667 | pass | pass | **fail (34.7)**; 5-7 x 9 and 5-7 x 8 (39.0 ok) |
| every size fits, all cells present, first/last hit rect inside the frame | pass | pass | pass |
| hit rects exactly one cell (never smaller) | pass | pass | pass |
| all controls >= 44 (log icon is 44 x 52) | pass | pass | pass |
| primary control (End turn / Take your find) clear of the board, 149.5 x 52 (end: 359 x 200) | pass | pass | pass |
| no cell obscured by chrome, all four states (end overlay = 200) | pass | pass | pass |
| headroom above row 1 >= a third of a cell (lap) | **fails on 24 of 48** (7x9: 15.8 vs 16.5) | **fails on 36 of 48** | fails on 44 of 48 |

Keyboard, hold and adjacent taps (7x9, tall, 812; last section): Enter and Space on a focused cell tap it; Tab walks cells in reading order; a 550 ms press on the last cell fires `onhold` once and the release tap is swallowed; taps 3 px either side of a cell edge hit the right cell each time. All pass.

## Findings for the orchestrator's signature

1. **Budget holds at 812**: 7x9 keeps 49.6 px cells (>= 44) in every state; the end state with the 200 overlay leaves the final board clear. The cell never exceeds the hit rect (one cell each).
2. **At 667 the budget holds only without notch insets** (7x9: 41.0 px, above the 38 visual floor). With 44/34 insets on a 667 frame the 7x9 is 34.7 px; no 667-class iPhone has those insets, so this is recorded, not a defect. If it ever mattered the 200 stack would need to collapse (party strip into the spell row) first.
3. **Old end overlay (282 px rising over the stack) hides 14 of 63 cells on 7x9** (see the second table): the plan's rule "the end overlay replaces the stack" (<= 200) is the one that keeps the final board unobscured. Pack D must size it that way.
4. **Top-row headroom is short.** The column-label gutter (24 units) plus meet slack gives 8.3 to 15.8 px above row 1 on 7x9; a standing figure laps a third of a cell (13.7 to 16.5 px), so a boss on the top edge rises about 1 to 7 px past the gutter, and the 28 px caption/trick banner covers the column labels and the top 12 to 18 px of row 1 (screenshots `FT-5s-7x9-boss-812.png`, `FT-5s-7x9-tall-667.png`). Nothing clips (the svg overflows visibly), so figures and taps still work, but tactical marks on the top row sit under the banner. Proposal: keep the banner and caption within the headroom band (<= 24 px, one line) or let Pack C/A2 give the board an extra 12 px of top headroom out of the stack's slack. Not fixed here (header and stack are Pack B's; the figures A2a's).

`boardLayout` therefore keeps the label gutter at 24 units (labels drawn smaller, 18 px font) and exposes `lap` and `headroom` so A2 can place the caption.

## Measured table (generated by `ft5s/measure.mjs`)

| device | size | state | cell px | A1 hit rect (x,y w×h) | last hit rect (x,y w×h) | primary control (y, w×h) | headroom above row 1 | lap needed (⅓ cell) | caption over row 1 | cells obscured | last row to controls | overflow x,y | verdict |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 812 (44/34) | 5×6 | normal | 68.5 | 24.4,141.7 68.5×68.5 | 298.5,484.2 68.5×68.5 | 714, 149.5×52 | 35.7 | 22.8 (ok) | 0 | 0 | 25.2 | -8, -225.2 | cell≥44 ok; fits ok; ctrl≥44 ok; board clear ok |
| 812 (44/34) | 5×6 | tall | 68.5 | 24.4,141.7 68.5×68.5 | 298.5,484.2 68.5×68.5 | 714, 149.5×52 | 35.7 | 22.8 (ok) | 0 | 0 | 25.2 | -8, -225.2 | cell≥44 ok; fits ok; ctrl≥44 ok; board clear ok |
| 812 (44/34) | 5×6 | boss | 68.5 | 24.4,141.7 68.5×68.5 | 298.5,484.2 68.5×68.5 | 714, 149.5×52 | 35.7 | 22.8 (ok) | 0 | 0 | 25.2 | -8, -225.2 | cell≥44 ok; fits ok; ctrl≥44 ok; board clear ok |
| 812 (44/34) | 5×6 | end | 68.5 | 24.4,141.7 68.5×68.5 | 298.5,484.2 68.5×68.5 | 578, 359×200 | 35.7 | 22.8 (ok) | 0 | 0 | 25.2 | -8, -225.2 | cell≥44 ok; fits ok; ctrl≥44 ok; board clear ok |
| 812 (44/34) | 5×7 | normal | 64.4 | 34.3,121.4 64.4×64.4 | 291.8,507.6 64.4×64.4 | 714, 149.5×52 | 15.4 | 21.5 (FAIL) | 12.6 | 0 | 6 | -18.9, -206 | cell≥44 ok; fits ok; ctrl≥44 ok; board clear ok |
| 812 (44/34) | 5×7 | tall | 64.4 | 34.3,121.4 64.4×64.4 | 291.8,507.6 64.4×64.4 | 714, 149.5×52 | 15.4 | 21.5 (FAIL) | 12.6 | 0 | 6 | -18.9, -206 | cell≥44 ok; fits ok; ctrl≥44 ok; board clear ok |
| 812 (44/34) | 5×7 | boss | 64.4 | 34.3,121.4 64.4×64.4 | 291.8,507.6 64.4×64.4 | 714, 149.5×52 | 15.4 | 21.5 (FAIL) | 12.6 | 0 | 6 | -18.9, -206 | cell≥44 ok; fits ok; ctrl≥44 ok; board clear ok |
| 812 (44/34) | 5×7 | end | 64.4 | 34.3,121.4 64.4×64.4 | 291.8,507.6 64.4×64.4 | 578, 359×200 | 15.4 | 21.5 (FAIL) | 12.6 | 0 | 6 | -18.9, -206 | cell≥44 ok; fits ok; ctrl≥44 ok; board clear ok |
| 812 (44/34) | 5×8 | normal | 56.6 | 52.9,119.6 56.6×56.6 | 279.1,515.4 56.6×56.6 | 714, 149.5×52 | 13.6 | 18.9 (FAIL) | 14.4 | 0 | 6 | -39.3, -206 | cell≥44 ok; fits ok; ctrl≥44 ok; board clear ok |
| 812 (44/34) | 5×8 | tall | 56.6 | 52.9,119.6 56.6×56.6 | 279.1,515.4 56.6×56.6 | 714, 149.5×52 | 13.6 | 18.9 (FAIL) | 14.4 | 0 | 6 | -39.3, -206 | cell≥44 ok; fits ok; ctrl≥44 ok; board clear ok |
| 812 (44/34) | 5×8 | boss | 56.6 | 52.9,119.6 56.6×56.6 | 279.1,515.4 56.6×56.6 | 714, 149.5×52 | 13.6 | 18.9 (FAIL) | 14.4 | 0 | 6 | -39.3, -206 | cell≥44 ok; fits ok; ctrl≥44 ok; board clear ok |
| 812 (44/34) | 5×8 | end | 56.6 | 52.9,119.6 56.6×56.6 | 279.1,515.4 56.6×56.6 | 578, 359×200 | 13.6 | 18.9 (FAIL) | 14.4 | 0 | 6 | -39.3, -206 | cell≥44 ok; fits ok; ctrl≥44 ok; board clear ok |
| 812 (44/34) | 5×9 | normal | 50.4 | 67.5,118.1 50.4×50.4 | 269.2,521.6 50.4×50.4 | 714, 149.5×52 | 12.1 | 16.8 (FAIL) | 15.9 | 0 | 6 | -55.4, -206 | cell≥44 ok; fits ok; ctrl≥44 ok; board clear ok |
| 812 (44/34) | 5×9 | tall | 50.4 | 67.5,118.1 50.4×50.4 | 269.2,521.6 50.4×50.4 | 714, 149.5×52 | 12.1 | 16.8 (FAIL) | 15.9 | 0 | 6 | -55.4, -206 | cell≥44 ok; fits ok; ctrl≥44 ok; board clear ok |
| 812 (44/34) | 5×9 | boss | 50.4 | 67.5,118.1 50.4×50.4 | 269.2,521.6 50.4×50.4 | 714, 149.5×52 | 12.1 | 16.8 (FAIL) | 15.9 | 0 | 6 | -55.4, -206 | cell≥44 ok; fits ok; ctrl≥44 ok; board clear ok |
| 812 (44/34) | 5×9 | end | 50.4 | 67.5,118.1 50.4×50.4 | 269.2,521.6 50.4×50.4 | 578, 359×200 | 12.1 | 16.8 (FAIL) | 15.9 | 0 | 6 | -55.4, -206 | cell≥44 ok; fits ok; ctrl≥44 ok; board clear ok |
| 812 (44/34) | 6×6 | normal | 57.5 | 21.8,173.3 57.5×57.5 | 309.5,461 57.5×57.5 | 714, 149.5×52 | 67.3 | 19.2 (ok) | 0 | 0 | 59.5 | -8, -259.5 | cell≥44 ok; fits ok; ctrl≥44 ok; board clear ok |
| 812 (44/34) | 6×6 | tall | 57.5 | 21.8,173.3 57.5×57.5 | 309.5,461 57.5×57.5 | 714, 149.5×52 | 67.3 | 19.2 (ok) | 0 | 0 | 59.5 | -8, -259.5 | cell≥44 ok; fits ok; ctrl≥44 ok; board clear ok |
| 812 (44/34) | 6×6 | boss | 57.5 | 21.8,173.3 57.5×57.5 | 309.5,461 57.5×57.5 | 714, 149.5×52 | 67.3 | 19.2 (ok) | 0 | 0 | 59.5 | -8, -259.5 | cell≥44 ok; fits ok; ctrl≥44 ok; board clear ok |
| 812 (44/34) | 6×6 | end | 57.5 | 21.8,173.3 57.5×57.5 | 309.5,461 57.5×57.5 | 578, 359×200 | 67.3 | 19.2 (ok) | 0 | 0 | 59.5 | -8, -259.5 | cell≥44 ok; fits ok; ctrl≥44 ok; board clear ok |
| 812 (44/34) | 6×7 | normal | 57.5 | 21.8,144.5 57.5×57.5 | 309.5,489.7 57.5×57.5 | 714, 149.5×52 | 38.5 | 19.2 (ok) | 0 | 0 | 30.7 | -8, -230.7 | cell≥44 ok; fits ok; ctrl≥44 ok; board clear ok |
| 812 (44/34) | 6×7 | tall | 57.5 | 21.8,144.5 57.5×57.5 | 309.5,489.7 57.5×57.5 | 714, 149.5×52 | 38.5 | 19.2 (ok) | 0 | 0 | 30.7 | -8, -230.7 | cell≥44 ok; fits ok; ctrl≥44 ok; board clear ok |
| 812 (44/34) | 6×7 | boss | 57.5 | 21.8,144.5 57.5×57.5 | 309.5,489.7 57.5×57.5 | 714, 149.5×52 | 38.5 | 19.2 (ok) | 0 | 0 | 30.7 | -8, -230.7 | cell≥44 ok; fits ok; ctrl≥44 ok; board clear ok |
| 812 (44/34) | 6×7 | end | 57.5 | 21.8,144.5 57.5×57.5 | 309.5,489.7 57.5×57.5 | 578, 359×200 | 38.5 | 19.2 (ok) | 0 | 0 | 30.7 | -8, -230.7 | cell≥44 ok; fits ok; ctrl≥44 ok; board clear ok |
| 812 (44/34) | 6×8 | normal | 56.6 | 24.6,119.6 56.6×56.6 | 307.4,515.4 56.6×56.6 | 714, 149.5×52 | 13.6 | 18.9 (FAIL) | 14.4 | 0 | 6 | -11.1, -206 | cell≥44 ok; fits ok; ctrl≥44 ok; board clear ok |
| 812 (44/34) | 6×8 | tall | 56.6 | 24.6,119.6 56.6×56.6 | 307.4,515.4 56.6×56.6 | 714, 149.5×52 | 13.6 | 18.9 (FAIL) | 14.4 | 0 | 6 | -11.1, -206 | cell≥44 ok; fits ok; ctrl≥44 ok; board clear ok |
| 812 (44/34) | 6×8 | boss | 56.6 | 24.6,119.6 56.6×56.6 | 307.4,515.4 56.6×56.6 | 714, 149.5×52 | 13.6 | 18.9 (FAIL) | 14.4 | 0 | 6 | -11.1, -206 | cell≥44 ok; fits ok; ctrl≥44 ok; board clear ok |
| 812 (44/34) | 6×8 | end | 56.6 | 24.6,119.6 56.6×56.6 | 307.4,515.4 56.6×56.6 | 578, 359×200 | 13.6 | 18.9 (FAIL) | 14.4 | 0 | 6 | -11.1, -206 | cell≥44 ok; fits ok; ctrl≥44 ok; board clear ok |
| 812 (44/34) | 6×9 | normal | 50.4 | 42.3,118.1 50.4×50.4 | 294.4,521.6 50.4×50.4 | 714, 149.5×52 | 12.1 | 16.8 (FAIL) | 15.9 | 0 | 6 | -30.1, -206 | cell≥44 ok; fits ok; ctrl≥44 ok; board clear ok |
| 812 (44/34) | 6×9 | tall | 50.4 | 42.3,118.1 50.4×50.4 | 294.4,521.6 50.4×50.4 | 714, 149.5×52 | 12.1 | 16.8 (FAIL) | 15.9 | 0 | 6 | -30.1, -206 | cell≥44 ok; fits ok; ctrl≥44 ok; board clear ok |
| 812 (44/34) | 6×9 | boss | 50.4 | 42.3,118.1 50.4×50.4 | 294.4,521.6 50.4×50.4 | 714, 149.5×52 | 12.1 | 16.8 (FAIL) | 15.9 | 0 | 6 | -30.1, -206 | cell≥44 ok; fits ok; ctrl≥44 ok; board clear ok |
| 812 (44/34) | 6×9 | end | 50.4 | 42.3,118.1 50.4×50.4 | 294.4,521.6 50.4×50.4 | 578, 359×200 | 12.1 | 16.8 (FAIL) | 15.9 | 0 | 6 | -30.1, -206 | cell≥44 ok; fits ok; ctrl≥44 ok; board clear ok |
| 812 (44/34) | 7×6 | normal | 49.6 | 19.9,196.2 49.6×49.6 | 317.4,444.1 49.6×49.6 | 714, 149.5×52 | 90.2 | 16.5 (ok) | 0 | 0 | 84.3 | -8, -284.3 | cell≥44 ok; fits ok; ctrl≥44 ok; board clear ok |
| 812 (44/34) | 7×6 | tall | 49.6 | 19.9,196.2 49.6×49.6 | 317.4,444.1 49.6×49.6 | 714, 149.5×52 | 90.2 | 16.5 (ok) | 0 | 0 | 84.3 | -8, -284.3 | cell≥44 ok; fits ok; ctrl≥44 ok; board clear ok |
| 812 (44/34) | 7×6 | boss | 49.6 | 19.9,196.2 49.6×49.6 | 317.4,444.1 49.6×49.6 | 714, 149.5×52 | 90.2 | 16.5 (ok) | 0 | 0 | 84.3 | -8, -284.3 | cell≥44 ok; fits ok; ctrl≥44 ok; board clear ok |
| 812 (44/34) | 7×6 | end | 49.6 | 19.9,196.2 49.6×49.6 | 317.4,444.1 49.6×49.6 | 578, 359×200 | 90.2 | 16.5 (ok) | 0 | 0 | 84.3 | -8, -284.3 | cell≥44 ok; fits ok; ctrl≥44 ok; board clear ok |
| 812 (44/34) | 7×7 | normal | 49.6 | 19.9,171.4 49.6×49.6 | 317.4,468.9 49.6×49.6 | 714, 149.5×52 | 65.4 | 16.5 (ok) | 0 | 0 | 59.5 | -8, -259.5 | cell≥44 ok; fits ok; ctrl≥44 ok; board clear ok |
| 812 (44/34) | 7×7 | tall | 49.6 | 19.9,171.4 49.6×49.6 | 317.4,468.9 49.6×49.6 | 714, 149.5×52 | 65.4 | 16.5 (ok) | 0 | 0 | 59.5 | -8, -259.5 | cell≥44 ok; fits ok; ctrl≥44 ok; board clear ok |
| 812 (44/34) | 7×7 | boss | 49.6 | 19.9,171.4 49.6×49.6 | 317.4,468.9 49.6×49.6 | 714, 149.5×52 | 65.4 | 16.5 (ok) | 0 | 0 | 59.5 | -8, -259.5 | cell≥44 ok; fits ok; ctrl≥44 ok; board clear ok |
| 812 (44/34) | 7×7 | end | 49.6 | 19.9,171.4 49.6×49.6 | 317.4,468.9 49.6×49.6 | 578, 359×200 | 65.4 | 16.5 (ok) | 0 | 0 | 59.5 | -8, -259.5 | cell≥44 ok; fits ok; ctrl≥44 ok; board clear ok |
| 812 (44/34) | 7×8 | normal | 49.6 | 19.9,146.6 49.6×49.6 | 317.4,493.7 49.6×49.6 | 714, 149.5×52 | 40.6 | 16.5 (ok) | 0 | 0 | 34.7 | -8, -234.7 | cell≥44 ok; fits ok; ctrl≥44 ok; board clear ok |
| 812 (44/34) | 7×8 | tall | 49.6 | 19.9,146.6 49.6×49.6 | 317.4,493.7 49.6×49.6 | 714, 149.5×52 | 40.6 | 16.5 (ok) | 0 | 0 | 34.7 | -8, -234.7 | cell≥44 ok; fits ok; ctrl≥44 ok; board clear ok |
| 812 (44/34) | 7×8 | boss | 49.6 | 19.9,146.6 49.6×49.6 | 317.4,493.7 49.6×49.6 | 714, 149.5×52 | 40.6 | 16.5 (ok) | 0 | 0 | 34.7 | -8, -234.7 | cell≥44 ok; fits ok; ctrl≥44 ok; board clear ok |
| 812 (44/34) | 7×8 | end | 49.6 | 19.9,146.6 49.6×49.6 | 317.4,493.7 49.6×49.6 | 578, 359×200 | 40.6 | 16.5 (ok) | 0 | 0 | 34.7 | -8, -234.7 | cell≥44 ok; fits ok; ctrl≥44 ok; board clear ok |
| 812 (44/34) | 7×9 | normal | 49.6 | 19.9,121.8 49.6×49.6 | 317.4,518.5 49.6×49.6 | 714, 149.5×52 | 15.8 | 16.5 (FAIL) | 12.2 | 0 | 9.9 | -8, -209.9 | cell≥44 ok; fits ok; ctrl≥44 ok; board clear ok |
| 812 (44/34) | 7×9 | tall | 49.6 | 19.9,121.8 49.6×49.6 | 317.4,518.5 49.6×49.6 | 714, 149.5×52 | 15.8 | 16.5 (FAIL) | 12.2 | 0 | 9.9 | -8, -209.9 | cell≥44 ok; fits ok; ctrl≥44 ok; board clear ok |
| 812 (44/34) | 7×9 | boss | 49.6 | 19.9,121.8 49.6×49.6 | 317.4,518.5 49.6×49.6 | 714, 149.5×52 | 15.8 | 16.5 (FAIL) | 12.2 | 0 | 9.9 | -8, -209.9 | cell≥44 ok; fits ok; ctrl≥44 ok; board clear ok |
| 812 (44/34) | 7×9 | end | 49.6 | 19.9,121.8 49.6×49.6 | 317.4,518.5 49.6×49.6 | 578, 359×200 | 15.8 | 16.5 (FAIL) | 12.2 | 0 | 9.9 | -8, -209.9 | cell≥44 ok; fits ok; ctrl≥44 ok; board clear ok |
| 667 (20/0, SE) | 5×6 | normal | 60.7 | 42.9,96.6 60.7×60.7 | 285.9,400.3 60.7×60.7 | 603, 149.5×52 | 14.6 | 20.2 (FAIL) | 13.4 | 0 | 6 | -28.4, -206 | cell≥38 ok; fits ok; ctrl≥44 ok; board clear ok |
| 667 (20/0, SE) | 5×6 | tall | 60.7 | 42.9,96.6 60.7×60.7 | 285.9,400.3 60.7×60.7 | 603, 149.5×52 | 14.6 | 20.2 (FAIL) | 13.4 | 0 | 6 | -28.4, -206 | cell≥38 ok; fits ok; ctrl≥44 ok; board clear ok |
| 667 (20/0, SE) | 5×6 | boss | 60.7 | 42.9,96.6 60.7×60.7 | 285.9,400.3 60.7×60.7 | 603, 149.5×52 | 14.6 | 20.2 (FAIL) | 13.4 | 0 | 6 | -28.4, -206 | cell≥38 ok; fits ok; ctrl≥44 ok; board clear ok |
| 667 (20/0, SE) | 5×6 | end | 60.7 | 42.9,96.6 60.7×60.7 | 285.9,400.3 60.7×60.7 | 467, 359×200 | 14.6 | 20.2 (FAIL) | 13.4 | 0 | 6 | -28.4, -206 | cell≥38 ok; fits ok; ctrl≥44 ok; board clear ok |
| 667 (20/0, SE) | 5×7 | normal | 52.3 | 62.9,94.6 52.3×52.3 | 272.3,408.7 52.3×52.3 | 603, 149.5×52 | 12.6 | 17.4 (FAIL) | 15.4 | 0 | 6 | -50.3, -206 | cell≥38 ok; fits ok; ctrl≥44 ok; board clear ok |
| 667 (20/0, SE) | 5×7 | tall | 52.3 | 62.9,94.6 52.3×52.3 | 272.3,408.7 52.3×52.3 | 603, 149.5×52 | 12.6 | 17.4 (FAIL) | 15.4 | 0 | 6 | -50.3, -206 | cell≥38 ok; fits ok; ctrl≥44 ok; board clear ok |
| 667 (20/0, SE) | 5×7 | boss | 52.3 | 62.9,94.6 52.3×52.3 | 272.3,408.7 52.3×52.3 | 603, 149.5×52 | 12.6 | 17.4 (FAIL) | 15.4 | 0 | 6 | -50.3, -206 | cell≥38 ok; fits ok; ctrl≥44 ok; board clear ok |
| 667 (20/0, SE) | 5×7 | end | 52.3 | 62.9,94.6 52.3×52.3 | 272.3,408.7 52.3×52.3 | 467, 359×200 | 12.6 | 17.4 (FAIL) | 15.4 | 0 | 6 | -50.3, -206 | cell≥38 ok; fits ok; ctrl≥44 ok; board clear ok |
| 667 (20/0, SE) | 5×8 | normal | 46 | 78,93 46×46 | 262,415 46×46 | 603, 149.5×52 | 11 | 15.3 (FAIL) | 17 | 0 | 6 | -67, -206 | cell≥38 ok; fits ok; ctrl≥44 ok; board clear ok |
| 667 (20/0, SE) | 5×8 | tall | 46 | 78,93 46×46 | 262,415 46×46 | 603, 149.5×52 | 11 | 15.3 (FAIL) | 17 | 0 | 6 | -67, -206 | cell≥38 ok; fits ok; ctrl≥44 ok; board clear ok |
| 667 (20/0, SE) | 5×8 | boss | 46 | 78,93 46×46 | 262,415 46×46 | 603, 149.5×52 | 11 | 15.3 (FAIL) | 17 | 0 | 6 | -67, -206 | cell≥38 ok; fits ok; ctrl≥44 ok; board clear ok |
| 667 (20/0, SE) | 5×8 | end | 46 | 78,93 46×46 | 262,415 46×46 | 467, 359×200 | 11 | 15.3 (FAIL) | 17 | 0 | 6 | -67, -206 | cell≥38 ok; fits ok; ctrl≥44 ok; board clear ok |
| 667 (20/0, SE) | 5×9 | normal | 41 | 89.9,91.8 41×41 | 253.9,420 41×41 | 603, 149.5×52 | 9.8 | 13.7 (FAIL) | 18.2 | 0 | 6 | -80, -206 | cell≥38 ok; fits ok; ctrl≥44 ok; board clear ok |
| 667 (20/0, SE) | 5×9 | tall | 41 | 89.9,91.8 41×41 | 253.9,420 41×41 | 603, 149.5×52 | 9.8 | 13.7 (FAIL) | 18.2 | 0 | 6 | -80, -206 | cell≥38 ok; fits ok; ctrl≥44 ok; board clear ok |
| 667 (20/0, SE) | 5×9 | boss | 41 | 89.9,91.8 41×41 | 253.9,420 41×41 | 603, 149.5×52 | 9.8 | 13.7 (FAIL) | 18.2 | 0 | 6 | -80, -206 | cell≥38 ok; fits ok; ctrl≥44 ok; board clear ok |
| 667 (20/0, SE) | 5×9 | end | 41 | 89.9,91.8 41×41 | 253.9,420 41×41 | 467, 359×200 | 9.8 | 13.7 (FAIL) | 18.2 | 0 | 6 | -80, -206 | cell≥38 ok; fits ok; ctrl≥44 ok; board clear ok |
| 667 (20/0, SE) | 6×6 | normal | 57.5 | 21.8,105.8 57.5×57.5 | 309.5,393.5 57.5×57.5 | 603, 149.5×52 | 23.8 | 19.2 (ok) | 4.2 | 0 | 16 | -8, -216 | cell≥38 ok; fits ok; ctrl≥44 ok; board clear ok |
| 667 (20/0, SE) | 6×6 | tall | 57.5 | 21.8,105.8 57.5×57.5 | 309.5,393.5 57.5×57.5 | 603, 149.5×52 | 23.8 | 19.2 (ok) | 4.2 | 0 | 16 | -8, -216 | cell≥38 ok; fits ok; ctrl≥44 ok; board clear ok |
| 667 (20/0, SE) | 6×6 | boss | 57.5 | 21.8,105.8 57.5×57.5 | 309.5,393.5 57.5×57.5 | 603, 149.5×52 | 23.8 | 19.2 (ok) | 4.2 | 0 | 16 | -8, -216 | cell≥38 ok; fits ok; ctrl≥44 ok; board clear ok |
| 667 (20/0, SE) | 6×6 | end | 57.5 | 21.8,105.8 57.5×57.5 | 309.5,393.5 57.5×57.5 | 467, 359×200 | 23.8 | 19.2 (ok) | 4.2 | 0 | 16 | -8, -216 | cell≥38 ok; fits ok; ctrl≥44 ok; board clear ok |
| 667 (20/0, SE) | 6×7 | normal | 52.3 | 36.7,94.6 52.3×52.3 | 298.5,408.7 52.3×52.3 | 603, 149.5×52 | 12.6 | 17.4 (FAIL) | 15.4 | 0 | 6 | -24.2, -206 | cell≥38 ok; fits ok; ctrl≥44 ok; board clear ok |
| 667 (20/0, SE) | 6×7 | tall | 52.3 | 36.7,94.6 52.3×52.3 | 298.5,408.7 52.3×52.3 | 603, 149.5×52 | 12.6 | 17.4 (FAIL) | 15.4 | 0 | 6 | -24.2, -206 | cell≥38 ok; fits ok; ctrl≥44 ok; board clear ok |
| 667 (20/0, SE) | 6×7 | boss | 52.3 | 36.7,94.6 52.3×52.3 | 298.5,408.7 52.3×52.3 | 603, 149.5×52 | 12.6 | 17.4 (FAIL) | 15.4 | 0 | 6 | -24.2, -206 | cell≥38 ok; fits ok; ctrl≥44 ok; board clear ok |
| 667 (20/0, SE) | 6×7 | end | 52.3 | 36.7,94.6 52.3×52.3 | 298.5,408.7 52.3×52.3 | 467, 359×200 | 12.6 | 17.4 (FAIL) | 15.4 | 0 | 6 | -24.2, -206 | cell≥38 ok; fits ok; ctrl≥44 ok; board clear ok |
| 667 (20/0, SE) | 6×8 | normal | 46 | 55,93 46×46 | 285,415 46×46 | 603, 149.5×52 | 11 | 15.3 (FAIL) | 17 | 0 | 6 | -44, -206 | cell≥38 ok; fits ok; ctrl≥44 ok; board clear ok |
| 667 (20/0, SE) | 6×8 | tall | 46 | 55,93 46×46 | 285,415 46×46 | 603, 149.5×52 | 11 | 15.3 (FAIL) | 17 | 0 | 6 | -44, -206 | cell≥38 ok; fits ok; ctrl≥44 ok; board clear ok |
| 667 (20/0, SE) | 6×8 | boss | 46 | 55,93 46×46 | 285,415 46×46 | 603, 149.5×52 | 11 | 15.3 (FAIL) | 17 | 0 | 6 | -44, -206 | cell≥38 ok; fits ok; ctrl≥44 ok; board clear ok |
| 667 (20/0, SE) | 6×8 | end | 46 | 55,93 46×46 | 285,415 46×46 | 467, 359×200 | 11 | 15.3 (FAIL) | 17 | 0 | 6 | -44, -206 | cell≥38 ok; fits ok; ctrl≥44 ok; board clear ok |
| 667 (20/0, SE) | 6×9 | normal | 41 | 69.4,91.8 41×41 | 274.5,420 41×41 | 603, 149.5×52 | 9.8 | 13.7 (FAIL) | 18.2 | 0 | 6 | -59.5, -206 | cell≥38 ok; fits ok; ctrl≥44 ok; board clear ok |
| 667 (20/0, SE) | 6×9 | tall | 41 | 69.4,91.8 41×41 | 274.5,420 41×41 | 603, 149.5×52 | 9.8 | 13.7 (FAIL) | 18.2 | 0 | 6 | -59.5, -206 | cell≥38 ok; fits ok; ctrl≥44 ok; board clear ok |
| 667 (20/0, SE) | 6×9 | boss | 41 | 69.4,91.8 41×41 | 274.5,420 41×41 | 603, 149.5×52 | 9.8 | 13.7 (FAIL) | 18.2 | 0 | 6 | -59.5, -206 | cell≥38 ok; fits ok; ctrl≥44 ok; board clear ok |
| 667 (20/0, SE) | 6×9 | end | 41 | 69.4,91.8 41×41 | 274.5,420 41×41 | 467, 359×200 | 9.8 | 13.7 (FAIL) | 18.2 | 0 | 6 | -59.5, -206 | cell≥38 ok; fits ok; ctrl≥44 ok; board clear ok |
| 667 (20/0, SE) | 7×6 | normal | 49.6 | 19.9,128.7 49.6×49.6 | 317.4,376.6 49.6×49.6 | 603, 149.5×52 | 46.7 | 16.5 (ok) | 0 | 0 | 40.8 | -8, -240.8 | cell≥38 ok; fits ok; ctrl≥44 ok; board clear ok |
| 667 (20/0, SE) | 7×6 | tall | 49.6 | 19.9,128.7 49.6×49.6 | 317.4,376.6 49.6×49.6 | 603, 149.5×52 | 46.7 | 16.5 (ok) | 0 | 0 | 40.8 | -8, -240.8 | cell≥38 ok; fits ok; ctrl≥44 ok; board clear ok |
| 667 (20/0, SE) | 7×6 | boss | 49.6 | 19.9,128.7 49.6×49.6 | 317.4,376.6 49.6×49.6 | 603, 149.5×52 | 46.7 | 16.5 (ok) | 0 | 0 | 40.8 | -8, -240.8 | cell≥38 ok; fits ok; ctrl≥44 ok; board clear ok |
| 667 (20/0, SE) | 7×6 | end | 49.6 | 19.9,128.7 49.6×49.6 | 317.4,376.6 49.6×49.6 | 467, 359×200 | 46.7 | 16.5 (ok) | 0 | 0 | 40.8 | -8, -240.8 | cell≥38 ok; fits ok; ctrl≥44 ok; board clear ok |
| 667 (20/0, SE) | 7×7 | normal | 49.6 | 19.9,103.9 49.6×49.6 | 317.4,401.4 49.6×49.6 | 603, 149.5×52 | 21.9 | 16.5 (ok) | 6.1 | 0 | 16 | -8, -216 | cell≥38 ok; fits ok; ctrl≥44 ok; board clear ok |
| 667 (20/0, SE) | 7×7 | tall | 49.6 | 19.9,103.9 49.6×49.6 | 317.4,401.4 49.6×49.6 | 603, 149.5×52 | 21.9 | 16.5 (ok) | 6.1 | 0 | 16 | -8, -216 | cell≥38 ok; fits ok; ctrl≥44 ok; board clear ok |
| 667 (20/0, SE) | 7×7 | boss | 49.6 | 19.9,103.9 49.6×49.6 | 317.4,401.4 49.6×49.6 | 603, 149.5×52 | 21.9 | 16.5 (ok) | 6.1 | 0 | 16 | -8, -216 | cell≥38 ok; fits ok; ctrl≥44 ok; board clear ok |
| 667 (20/0, SE) | 7×7 | end | 49.6 | 19.9,103.9 49.6×49.6 | 317.4,401.4 49.6×49.6 | 467, 359×200 | 21.9 | 16.5 (ok) | 6.1 | 0 | 16 | -8, -216 | cell≥38 ok; fits ok; ctrl≥44 ok; board clear ok |
| 667 (20/0, SE) | 7×8 | normal | 46 | 32,93 46×46 | 308,415 46×46 | 603, 149.5×52 | 11 | 15.3 (FAIL) | 17 | 0 | 6 | -21, -206 | cell≥38 ok; fits ok; ctrl≥44 ok; board clear ok |
| 667 (20/0, SE) | 7×8 | tall | 46 | 32,93 46×46 | 308,415 46×46 | 603, 149.5×52 | 11 | 15.3 (FAIL) | 17 | 0 | 6 | -21, -206 | cell≥38 ok; fits ok; ctrl≥44 ok; board clear ok |
| 667 (20/0, SE) | 7×8 | boss | 46 | 32,93 46×46 | 308,415 46×46 | 603, 149.5×52 | 11 | 15.3 (FAIL) | 17 | 0 | 6 | -21, -206 | cell≥38 ok; fits ok; ctrl≥44 ok; board clear ok |
| 667 (20/0, SE) | 7×8 | end | 46 | 32,93 46×46 | 308,415 46×46 | 467, 359×200 | 11 | 15.3 (FAIL) | 17 | 0 | 6 | -21, -206 | cell≥38 ok; fits ok; ctrl≥44 ok; board clear ok |
| 667 (20/0, SE) | 7×9 | normal | 41 | 48.9,91.8 41×41 | 295,420 41×41 | 603, 149.5×52 | 9.8 | 13.7 (FAIL) | 18.2 | 0 | 6 | -39, -206 | cell≥38 ok; fits ok; ctrl≥44 ok; board clear ok |
| 667 (20/0, SE) | 7×9 | tall | 41 | 48.9,91.8 41×41 | 295,420 41×41 | 603, 149.5×52 | 9.8 | 13.7 (FAIL) | 18.2 | 0 | 6 | -39, -206 | cell≥38 ok; fits ok; ctrl≥44 ok; board clear ok |
| 667 (20/0, SE) | 7×9 | boss | 41 | 48.9,91.8 41×41 | 295,420 41×41 | 603, 149.5×52 | 9.8 | 13.7 (FAIL) | 18.2 | 0 | 6 | -39, -206 | cell≥38 ok; fits ok; ctrl≥44 ok; board clear ok |
| 667 (20/0, SE) | 7×9 | end | 41 | 48.9,91.8 41×41 | 295,420 41×41 | 467, 359×200 | 9.8 | 13.7 (FAIL) | 18.2 | 0 | 6 | -39, -206 | cell≥38 ok; fits ok; ctrl≥44 ok; board clear ok |
| 667 (44/34, stress) | 5×6 | normal | 51.4 | 65.1,118.3 51.4×51.4 | 270.8,375.6 51.4×51.4 | 569, 149.5×52 | 12.3 | 17.1 (FAIL) | 15.7 | 0 | 6 | -52.7, -206 | cell≥38 ok; fits ok; ctrl≥44 ok; board clear ok |
| 667 (44/34, stress) | 5×6 | tall | 51.4 | 65.1,118.3 51.4×51.4 | 270.8,375.6 51.4×51.4 | 569, 149.5×52 | 12.3 | 17.1 (FAIL) | 15.7 | 0 | 6 | -52.7, -206 | cell≥38 ok; fits ok; ctrl≥44 ok; board clear ok |
| 667 (44/34, stress) | 5×6 | boss | 51.4 | 65.1,118.3 51.4×51.4 | 270.8,375.6 51.4×51.4 | 569, 149.5×52 | 12.3 | 17.1 (FAIL) | 15.7 | 0 | 6 | -52.7, -206 | cell≥38 ok; fits ok; ctrl≥44 ok; board clear ok |
| 667 (44/34, stress) | 5×6 | end | 51.4 | 65.1,118.3 51.4×51.4 | 270.8,375.6 51.4×51.4 | 433, 359×200 | 12.3 | 17.1 (FAIL) | 15.7 | 0 | 6 | -52.7, -206 | cell≥38 ok; fits ok; ctrl≥44 ok; board clear ok |
| 667 (44/34, stress) | 5×7 | normal | 44.3 | 82,116.6 44.3×44.3 | 259.3,382.7 44.3×44.3 | 569, 149.5×52 | 10.6 | 14.8 (FAIL) | 17.4 | 0 | 6 | -71.3, -206 | cell≥38 ok; fits ok; ctrl≥44 ok; board clear ok |
| 667 (44/34, stress) | 5×7 | tall | 44.3 | 82,116.6 44.3×44.3 | 259.3,382.7 44.3×44.3 | 569, 149.5×52 | 10.6 | 14.8 (FAIL) | 17.4 | 0 | 6 | -71.3, -206 | cell≥38 ok; fits ok; ctrl≥44 ok; board clear ok |
| 667 (44/34, stress) | 5×7 | boss | 44.3 | 82,116.6 44.3×44.3 | 259.3,382.7 44.3×44.3 | 569, 149.5×52 | 10.6 | 14.8 (FAIL) | 17.4 | 0 | 6 | -71.3, -206 | cell≥38 ok; fits ok; ctrl≥44 ok; board clear ok |
| 667 (44/34, stress) | 5×7 | end | 44.3 | 82,116.6 44.3×44.3 | 259.3,382.7 44.3×44.3 | 433, 359×200 | 10.6 | 14.8 (FAIL) | 17.4 | 0 | 6 | -71.3, -206 | cell≥38 ok; fits ok; ctrl≥44 ok; board clear ok |
| 667 (44/34, stress) | 5×8 | normal | 39 | 94.8,115.3 39×39 | 250.6,388 39×39 | 569, 149.5×52 | 9.3 | 13 (FAIL) | 18.7 | 0 | 6 | -85.4, -206 | cell≥38 ok; fits ok; ctrl≥44 ok; board clear ok |
| 667 (44/34, stress) | 5×8 | tall | 39 | 94.8,115.3 39×39 | 250.6,388 39×39 | 569, 149.5×52 | 9.3 | 13 (FAIL) | 18.7 | 0 | 6 | -85.4, -206 | cell≥38 ok; fits ok; ctrl≥44 ok; board clear ok |
| 667 (44/34, stress) | 5×8 | boss | 39 | 94.8,115.3 39×39 | 250.6,388 39×39 | 569, 149.5×52 | 9.3 | 13 (FAIL) | 18.7 | 0 | 6 | -85.4, -206 | cell≥38 ok; fits ok; ctrl≥44 ok; board clear ok |
| 667 (44/34, stress) | 5×8 | end | 39 | 94.8,115.3 39×39 | 250.6,388 39×39 | 433, 359×200 | 9.3 | 13 (FAIL) | 18.7 | 0 | 6 | -85.4, -206 | cell≥38 ok; fits ok; ctrl≥44 ok; board clear ok |
| 667 (44/34, stress) | 5×9 | normal | 34.7 | 104.8,114.3 34.7×34.7 | 243.8,392.3 34.7×34.7 | 569, 149.5×52 | 8.3 | 11.6 (FAIL) | 19.7 | 0 | 6 | -96.5, -206 | cell≥38 FAIL; fits ok; ctrl≥44 ok; board clear ok |
| 667 (44/34, stress) | 5×9 | tall | 34.7 | 104.8,114.3 34.7×34.7 | 243.8,392.3 34.7×34.7 | 569, 149.5×52 | 8.3 | 11.6 (FAIL) | 19.7 | 0 | 6 | -96.5, -206 | cell≥38 FAIL; fits ok; ctrl≥44 ok; board clear ok |
| 667 (44/34, stress) | 5×9 | boss | 34.7 | 104.8,114.3 34.7×34.7 | 243.8,392.3 34.7×34.7 | 569, 149.5×52 | 8.3 | 11.6 (FAIL) | 19.7 | 0 | 6 | -96.5, -206 | cell≥38 FAIL; fits ok; ctrl≥44 ok; board clear ok |
| 667 (44/34, stress) | 5×9 | end | 34.7 | 104.8,114.3 34.7×34.7 | 243.8,392.3 34.7×34.7 | 433, 359×200 | 8.3 | 11.6 (FAIL) | 19.7 | 0 | 6 | -96.5, -206 | cell≥38 FAIL; fits ok; ctrl≥44 ok; board clear ok |
| 667 (44/34, stress) | 6×6 | normal | 51.4 | 39.3,118.3 51.4×51.4 | 296.6,375.6 51.4×51.4 | 569, 149.5×52 | 12.3 | 17.1 (FAIL) | 15.7 | 0 | 6 | -27, -206 | cell≥38 ok; fits ok; ctrl≥44 ok; board clear ok |
| 667 (44/34, stress) | 6×6 | tall | 51.4 | 39.3,118.3 51.4×51.4 | 296.6,375.6 51.4×51.4 | 569, 149.5×52 | 12.3 | 17.1 (FAIL) | 15.7 | 0 | 6 | -27, -206 | cell≥38 ok; fits ok; ctrl≥44 ok; board clear ok |
| 667 (44/34, stress) | 6×6 | boss | 51.4 | 39.3,118.3 51.4×51.4 | 296.6,375.6 51.4×51.4 | 569, 149.5×52 | 12.3 | 17.1 (FAIL) | 15.7 | 0 | 6 | -27, -206 | cell≥38 ok; fits ok; ctrl≥44 ok; board clear ok |
| 667 (44/34, stress) | 6×6 | end | 51.4 | 39.3,118.3 51.4×51.4 | 296.6,375.6 51.4×51.4 | 433, 359×200 | 12.3 | 17.1 (FAIL) | 15.7 | 0 | 6 | -27, -206 | cell≥38 ok; fits ok; ctrl≥44 ok; board clear ok |
| 667 (44/34, stress) | 6×7 | normal | 44.3 | 59.8,116.6 44.3×44.3 | 281.5,382.7 44.3×44.3 | 569, 149.5×52 | 10.6 | 14.8 (FAIL) | 17.4 | 0 | 6 | -49.2, -206 | cell≥38 ok; fits ok; ctrl≥44 ok; board clear ok |
| 667 (44/34, stress) | 6×7 | tall | 44.3 | 59.8,116.6 44.3×44.3 | 281.5,382.7 44.3×44.3 | 569, 149.5×52 | 10.6 | 14.8 (FAIL) | 17.4 | 0 | 6 | -49.2, -206 | cell≥38 ok; fits ok; ctrl≥44 ok; board clear ok |
| 667 (44/34, stress) | 6×7 | boss | 44.3 | 59.8,116.6 44.3×44.3 | 281.5,382.7 44.3×44.3 | 569, 149.5×52 | 10.6 | 14.8 (FAIL) | 17.4 | 0 | 6 | -49.2, -206 | cell≥38 ok; fits ok; ctrl≥44 ok; board clear ok |
| 667 (44/34, stress) | 6×7 | end | 44.3 | 59.8,116.6 44.3×44.3 | 281.5,382.7 44.3×44.3 | 433, 359×200 | 10.6 | 14.8 (FAIL) | 17.4 | 0 | 6 | -49.2, -206 | cell≥38 ok; fits ok; ctrl≥44 ok; board clear ok |
| 667 (44/34, stress) | 6×8 | normal | 39 | 75.3,115.3 39×39 | 270.1,388 39×39 | 569, 149.5×52 | 9.3 | 13 (FAIL) | 18.7 | 0 | 6 | -66, -206 | cell≥38 ok; fits ok; ctrl≥44 ok; board clear ok |
| 667 (44/34, stress) | 6×8 | tall | 39 | 75.3,115.3 39×39 | 270.1,388 39×39 | 569, 149.5×52 | 9.3 | 13 (FAIL) | 18.7 | 0 | 6 | -66, -206 | cell≥38 ok; fits ok; ctrl≥44 ok; board clear ok |
| 667 (44/34, stress) | 6×8 | boss | 39 | 75.3,115.3 39×39 | 270.1,388 39×39 | 569, 149.5×52 | 9.3 | 13 (FAIL) | 18.7 | 0 | 6 | -66, -206 | cell≥38 ok; fits ok; ctrl≥44 ok; board clear ok |
| 667 (44/34, stress) | 6×8 | end | 39 | 75.3,115.3 39×39 | 270.1,388 39×39 | 433, 359×200 | 9.3 | 13 (FAIL) | 18.7 | 0 | 6 | -66, -206 | cell≥38 ok; fits ok; ctrl≥44 ok; board clear ok |
| 667 (44/34, stress) | 6×9 | normal | 34.7 | 87.4,114.3 34.7×34.7 | 261.1,392.3 34.7×34.7 | 569, 149.5×52 | 8.3 | 11.6 (FAIL) | 19.7 | 0 | 6 | -79.1, -206 | cell≥38 FAIL; fits ok; ctrl≥44 ok; board clear ok |
| 667 (44/34, stress) | 6×9 | tall | 34.7 | 87.4,114.3 34.7×34.7 | 261.1,392.3 34.7×34.7 | 569, 149.5×52 | 8.3 | 11.6 (FAIL) | 19.7 | 0 | 6 | -79.1, -206 | cell≥38 FAIL; fits ok; ctrl≥44 ok; board clear ok |
| 667 (44/34, stress) | 6×9 | boss | 34.7 | 87.4,114.3 34.7×34.7 | 261.1,392.3 34.7×34.7 | 569, 149.5×52 | 8.3 | 11.6 (FAIL) | 19.7 | 0 | 6 | -79.1, -206 | cell≥38 FAIL; fits ok; ctrl≥44 ok; board clear ok |
| 667 (44/34, stress) | 6×9 | end | 34.7 | 87.4,114.3 34.7×34.7 | 261.1,392.3 34.7×34.7 | 433, 359×200 | 8.3 | 11.6 (FAIL) | 19.7 | 0 | 6 | -79.1, -206 | cell≥38 FAIL; fits ok; ctrl≥44 ok; board clear ok |
| 667 (44/34, stress) | 7×6 | normal | 49.6 | 19.9,123.7 49.6×49.6 | 317.4,371.6 49.6×49.6 | 569, 149.5×52 | 17.7 | 16.5 (ok) | 10.3 | 0 | 11.8 | -8, -211.8 | cell≥38 ok; fits ok; ctrl≥44 ok; board clear ok |
| 667 (44/34, stress) | 7×6 | tall | 49.6 | 19.9,123.7 49.6×49.6 | 317.4,371.6 49.6×49.6 | 569, 149.5×52 | 17.7 | 16.5 (ok) | 10.3 | 0 | 11.8 | -8, -211.8 | cell≥38 ok; fits ok; ctrl≥44 ok; board clear ok |
| 667 (44/34, stress) | 7×6 | boss | 49.6 | 19.9,123.7 49.6×49.6 | 317.4,371.6 49.6×49.6 | 569, 149.5×52 | 17.7 | 16.5 (ok) | 10.3 | 0 | 11.8 | -8, -211.8 | cell≥38 ok; fits ok; ctrl≥44 ok; board clear ok |
| 667 (44/34, stress) | 7×6 | end | 49.6 | 19.9,123.7 49.6×49.6 | 317.4,371.6 49.6×49.6 | 433, 359×200 | 17.7 | 16.5 (ok) | 10.3 | 0 | 11.8 | -8, -211.8 | cell≥38 ok; fits ok; ctrl≥44 ok; board clear ok |
| 667 (44/34, stress) | 7×7 | normal | 44.3 | 37.6,116.6 44.3×44.3 | 303.7,382.7 44.3×44.3 | 569, 149.5×52 | 10.6 | 14.8 (FAIL) | 17.4 | 0 | 6 | -27, -206 | cell≥38 ok; fits ok; ctrl≥44 ok; board clear ok |
| 667 (44/34, stress) | 7×7 | tall | 44.3 | 37.6,116.6 44.3×44.3 | 303.7,382.7 44.3×44.3 | 569, 149.5×52 | 10.6 | 14.8 (FAIL) | 17.4 | 0 | 6 | -27, -206 | cell≥38 ok; fits ok; ctrl≥44 ok; board clear ok |
| 667 (44/34, stress) | 7×7 | boss | 44.3 | 37.6,116.6 44.3×44.3 | 303.7,382.7 44.3×44.3 | 569, 149.5×52 | 10.6 | 14.8 (FAIL) | 17.4 | 0 | 6 | -27, -206 | cell≥38 ok; fits ok; ctrl≥44 ok; board clear ok |
| 667 (44/34, stress) | 7×7 | end | 44.3 | 37.6,116.6 44.3×44.3 | 303.7,382.7 44.3×44.3 | 433, 359×200 | 10.6 | 14.8 (FAIL) | 17.4 | 0 | 6 | -27, -206 | cell≥38 ok; fits ok; ctrl≥44 ok; board clear ok |
| 667 (44/34, stress) | 7×8 | normal | 39 | 55.8,115.3 39×39 | 289.6,388 39×39 | 569, 149.5×52 | 9.3 | 13 (FAIL) | 18.7 | 0 | 6 | -46.5, -206 | cell≥38 ok; fits ok; ctrl≥44 ok; board clear ok |
| 667 (44/34, stress) | 7×8 | tall | 39 | 55.8,115.3 39×39 | 289.6,388 39×39 | 569, 149.5×52 | 9.3 | 13 (FAIL) | 18.7 | 0 | 6 | -46.5, -206 | cell≥38 ok; fits ok; ctrl≥44 ok; board clear ok |
| 667 (44/34, stress) | 7×8 | boss | 39 | 55.8,115.3 39×39 | 289.6,388 39×39 | 569, 149.5×52 | 9.3 | 13 (FAIL) | 18.7 | 0 | 6 | -46.5, -206 | cell≥38 ok; fits ok; ctrl≥44 ok; board clear ok |
| 667 (44/34, stress) | 7×8 | end | 39 | 55.8,115.3 39×39 | 289.6,388 39×39 | 433, 359×200 | 9.3 | 13 (FAIL) | 18.7 | 0 | 6 | -46.5, -206 | cell≥38 ok; fits ok; ctrl≥44 ok; board clear ok |
| 667 (44/34, stress) | 7×9 | normal | 34.7 | 70.1,114.3 34.7×34.7 | 278.5,392.3 34.7×34.7 | 569, 149.5×52 | 8.3 | 11.6 (FAIL) | 19.7 | 0 | 6 | -61.7, -206 | cell≥38 FAIL; fits ok; ctrl≥44 ok; board clear ok |
| 667 (44/34, stress) | 7×9 | tall | 34.7 | 70.1,114.3 34.7×34.7 | 278.5,392.3 34.7×34.7 | 569, 149.5×52 | 8.3 | 11.6 (FAIL) | 19.7 | 0 | 6 | -61.7, -206 | cell≥38 FAIL; fits ok; ctrl≥44 ok; board clear ok |
| 667 (44/34, stress) | 7×9 | boss | 34.7 | 70.1,114.3 34.7×34.7 | 278.5,392.3 34.7×34.7 | 569, 149.5×52 | 8.3 | 11.6 (FAIL) | 19.7 | 0 | 6 | -61.7, -206 | cell≥38 FAIL; fits ok; ctrl≥44 ok; board clear ok |
| 667 (44/34, stress) | 7×9 | end | 34.7 | 70.1,114.3 34.7×34.7 | 278.5,392.3 34.7×34.7 | 433, 359×200 | 8.3 | 11.6 (FAIL) | 19.7 | 0 | 6 | -61.7, -206 | cell≥38 FAIL; fits ok; ctrl≥44 ok; board clear ok |

### End overlay of the old design (282 px rising over the stack), 7×9

| device | board bottom | overlay top | cells obscured of 63 | cell px |
|---|---|---|---|---|
| 812 (44/34) | 568.1 | 498 | 14 | 49.6 |
| 667 (20/0, SE) | 461 | 387 | 14 | 41 |

### Keyboard, hold and adjacent-tap targeting (7×9, tall, 812)

- Enter on A1, Tab, Space: taps ["0,0","1,0"] (expect "0,0" then "1,0").
- Hold 550 ms on the last cell: holds ["6,8"]; the release tap was swallowed: true.
- Taps 3 px either side of the A1/A2 edge: ["0,0","0,1"] (expect "0,0" then "0,1").
