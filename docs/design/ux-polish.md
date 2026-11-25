# UX and UI polish (the visual pass)

> **Status: In progress** (started 2026-11-24). Step 1 done: the starting state is documented here and on the *UX-and-UI-polish* whiteboard. Next: design rounds per screen family, then plans. Roadmap: BL-135. Builds on [study-layout.md](study-layout.md) (BL-134, the first piece of this work).

## Why now

The main feature set is built (every plan in [ROADMAP.md](../ROADMAP.md) §2.3 is built bar playtests and calibration) and the narrative is in ([names-and-voice.md](names-and-voice.md)). The screens grew plan by plan, each right for its own purpose. This pass makes them one game: one visual language, one set of patterns, a higher level of finish. It is a UX and UI pass. Rules, content and balance do not change in it.

## 0. Decisions

| Question | Decision | Why |
|---|---|---|
| Scope | Every screen at 375×812 (phone stays primary), then larger screens | DESIGN §7: portrait phone first |
| Rules and content | Frozen during the pass; copy changes only where the layout needs them | Keeps playtests comparable |
| Starting state | This doc and the whiteboard are the baseline; screenshots in [ux-baseline/](ux-baseline/) | One place to compare against |
| Calibration and the study layout playtest | Not blocked by this pass | AGENTS.md: playtest gates never block |

Everything else (direction, tokens, motion, art) is **open** and goes through design rounds (`design-round` skill).

## 1. Starting state: screens

Screenshots were taken 2026-11-24 at 375×812 @2x from the repo's fixture saves (`tests/fixtures/saves/`), build `b2f7c4a`. File names are in [ux-baseline/](ux-baseline/). The routes are in `src/app/routes.ts`; which screen shows is decided by `resolveScreen` (`src/app/flow.ts`).

| Screen | Route / file | What it is | Capture |
|---|---|---|---|
| Study | `#/study`, `screens/Study.svelte` (644 lines) | The home. Title bar with a scene strip; seat tabs (the three trip seats, "+N" opens the household sheet); the lattice page with floating ink pot, Fit and Fair copy; spell strip; rune drawer (Runes / Inventions / Glyphs); the door. Doorway mode for quiet rooms. Overlays: the first evening, the rumour line, the note under the door, welcome sheet, Glyph sheets | `study.jpg`, `study-fresh.jpg`, `study-household-sheet.jpg` |
| Map | `#/map`, `Map.svelte` | The owner's map: a tall parchment ribbon with district nodes and paths; tap a node for the set-out sheet | `map.jpg` |
| Fight | `#/trip` (status fight), `Combat.svelte` + `components/battle/*` + `components/board/*` | Turn-based grid: top bar (round, depth), the board with layered tiles, pieces, intents, jars, marks; caption; party strip; spell and action bar; Log and Skip / End turn. Boss and rival headers, trick banners, end overlay, log sheet | `fight-seam.jpg`, `fight-cartographers.jpg` |
| Loot | `Loot.svelte` | Pick one of three offers (rune page, ink, method, solvent, vellum, doorway); trip status panel under it | `loot.jpg` |
| Crossroads | `Crossroads.svelte` | Push on or go home; choices per district | not captured |
| Cleared / Wiped | `Cleared.svelte`, `Wiped.svelte` | End of a trip: carried home, or lost with them and what the notebook keeps | not captured |
| Trip page | `#/trip-page`, `TripPage.svelte` | "Home from X": firsts for the notebook, the ledger, back to the desk | `trip-page.jpg` |
| Threshold | `#/threshold`, `Threshold.svelte` | District banner and try-it room before a heart | not captured (needs live state) |
| Codex | `#/codex`, `Codex.svelte` | The notebook's back pages: Runes, Made, Table, Bursts, Methods, Solvents, Idioms, Household; fine print, capstones, margin notes, `???` for the unseen | `codex.jpg` |
| Bench | `#/bench`, `Bench.svelte` | Research: pick a method and parts, place subjects on a 6×5 grid, Trial, Name and write | `bench.jpg` |
| Desk | `#/desk`, `Desk.svelte` | Footnote research: per-rune points and levels I–III, margin columns | `desk.jpg` |
| Drawing table | `#/drawing`, `DrawingTable.svelte` | Endgame: drawn districts, pen pot, page tabs | not captured (late save needed) |
| Handover, Credits | `#/handover`, `#/credits` | The ending | not captured (late save needed) |
| Lab | `#/lab`, `Lab.svelte` | Free-play sandbox on the battle UI: Play / Board / Lattices tabs, scenario picker | `lab.jpg` |
| Gallery | `#/gallery`, `Gallery.svelte` | Dev page of every visual piece (fixtures) | not captured |
| Toasts, sheets | `common/Toasts.svelte`, `common/Sheet.svelte` | Shared overlays | in captures |

District-specific UI lives in `src/ui/districts/` (canals, bathhouses, bridges, foundry, ink quarter, cartographers, seam, lower Seam, cards, banners).

## 2. Interactions and levers worth knowing

- **Flow:** Study → door → Map → set-out sheet → Fight ⇄ Loot → Crossroads → … → Cleared / Wiped → Trip page → Study. Codex, Bench and Desk hang off the Study title bar (Bench and Desk appear once unlocked). The trip in the save decides the screen on reload.
- **Lattice editing:** tap a socket with a rune in hand; long-press for details; Erase tool; two-finger pan; Fit; Edit scale (60 px pitch). Fair copy turns a cluster into a named invention. Ink is one household pot, spent per rune.
- **Rune drawer:** one row at rest, swipe or ▲ for the full shelf by role; picking drops it back.
- **Household sheet:** hold a seat tab or "+N"; drag cards onto seats; locked while a trip is out.
- **Fight input:** tap a unit, then a dot to move or a spell to aim; previews show where a chain lands; masked previews must not disclose; current toggle and Log. Skip ▸▸ and End turn; Undo move.
- **Visual levers (all in `src/ui/theme.css`):** parchment and ink palette; material, rune-role and apprentice hues (each at least 4.5:1 on parchment); the attic study's wood and wall tokens; `--hand` (Snell Roundhand, a system script font), a serif body and a mono for labels; 4/8/16/24 spacing, 44 px tap, 6 px radius. Rune art is `runeArt.ts` plus `RuneGlyph.svelte`; board art in `components/board/art.ts`; district pieces under `ui/districts/*`.
- **Not yet in the game:** audio (BL-42), accessibility pass (BL-75), larger-screen check (BL-73).

## 3. Observations from the baseline

Judged from the captures. These are starting hypotheses for design rounds, not decisions.

1. **Two visual worlds.** Only the Study has the attic (wood, wall, lamp, rain). Every other screen is flat parchment, so entering the Map or a fight feels like leaving the game's place.
2. **Four headers.** Study: wood bar with scene. Map: dark bar with a script title. Codex, Bench, Desk: tan bar with "← Study". Fight and Loot: no bar. Back navigation and titles differ per screen.
3. **Type roles are unclear.** Serif, script and mono each appear as body, label and chip. The mono chips (Codex tabs, "FINE PRINT 0 / 3") read as dev UI. The script depends on the device's system fonts.
4. **Empty and oversized areas.** Loot offers are about 300 px tall each with little content; the Map is mostly blank ribbon; the Bench has a large gap above the grid; the Desk is nearly empty early on.
5. **Fight bottom stack.** Caption, party strip, spell bar and Log / Skip take about a quarter of the height in four separate boxes of different styles; the board floats with spare space above and below.
6. **Build stamp overlaps content** (bottom right) on Study, Bench and Codex. Fine for a dev build; hide or move for the polished build.
7. **Controls differ per screen.** Primary buttons: dark filled (Back to the desk, End turn), tan outlined (Skip, Log), grey disabled (Take), underlined link (Read the notebook).
8. **Study is the benchmark.** The study layout pass (BL-134) is the nearest thing to the target level of finish; use it to judge the rest.
9. **Rune art** is uneven: BL-100 lists runes still to redraw.
10. **Dev and late screens** (Lab, Gallery, Threshold without state) should be styled as intentional or kept out of the player's path.

## 4. Process

1. **Baseline** (done): this doc, the board, the roadmap row.
2. **Direction round:** one overall look (what carries across screens: the notebook, the study, the city), with 2–3 mood options on the board.
3. **System round:** tokens (type, colour, spacing, elevation), header and navigation pattern, buttons, cards, sheets, empty states, motion rules.
4. **Screen families**, in order of how often the player sees them: Fight (board, bottom stack), Study leftovers, Loot / Crossroads / end-of-trip, Map, Codex / Bench / Desk, ending screens, Lab / Gallery.
5. Each family: sketch on the board, a plan in `docs/plans/`, build with the `implement` skill, a 375×812 check with screenshots (`verify` skill).

Capture more states as the work needs them (crossroads, wiped, drawing table, handover, credits, dark mode if any).

## 5. Open questions

- One overall direction: the lamplit study carried everywhere, a plainer notebook with the study only at home, or something else?
- Is a dark theme in scope? (the Map and Study are already dark in places)
- Is audio part of this pass or kept as BL-42?
- Which screens may change layout, and which only get restyled (the lattice and the fight board are the core and the most tested)?
- Fonts: ship a web font for the script and serif (offline PWA, needs precache) or keep system fonts?
