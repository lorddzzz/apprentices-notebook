# UX home plan (UH): the Study, the household, Codex, Bench, Desk, homecoming, transitions

Design: [ux-polish.md](../design/ux-polish.md) §0, §5, §6; [study-layout.md](../design/study-layout.md) (BL-134, the base); board §6 "Study", "Household sheet", "Bench", "Desk", "Codex", "Homecoming", "Threshold" frames and §8 study notes ([snapshot](ux-board-snapshot.txt)); target image [study-v2.png](../design/art-studies/study-v2.png). Roadmap: BL-135. Program: [ux-program.md](ux-program.md) (row UH). Briefs: [ux-home-briefs.md](ux-home-briefs.md).
State: Drafted (2026-11-26), revised after review 3 (see the Review resolution at the end). Runner: Claude. Phase 3 (after UF-8…UF-10 shared components; parallel with FT).

## 1. Scope and settled rules

Delivers (presentation only, rules, content and save frozen):
- **Study** restyled to study-v2: attic header strip with Codex (book), Bench (jars) and Desk as tappable room objects (ivory edge, small-caps label, one shared action cue); seat tabs; page with floating ink pot, Fit, Fair copy; aim 5 columns × 5 rows, 4 on tight screens; spell strip; rune drawer with fixed painted ends and an expandable middle; "Out into the city" as the one primary; doorway (quiet room) mode.
- **Household sheet** ("At home") with portraits.
- **Codex, Bench, Desk** with the home header and their board frames.
- **Homecoming page** (`TripPage.svelte`) as a scene with "a first for the notebook" written in.
- **Going-out and coming-home transitions** (two plates, ~1.2 s, tap to skip).

Leaves out: lattice editing gestures and rules (standard vs novel rule, L4); the pocket notebook (FT); the Map, Threshold, Loot, Crossroads, Cleared, Wiped (UT); Drawing table, Handover, Credits, Lab, Gallery (UE); raster art (UA); tokens, shared components, ⋯ menu, Motion pref, fixtures (UF).

Settled, cited not copied: program §1 (direction B, placeholder first, rules frozen), contracts C1–C8, ux-polish §5 principles P1–P9 and L4. Overlays that must keep their place: FirstEvening, rumour line, `NoteUnderDoor`, WelcomeSheet, Glyph sheets (GlyphSheet, GlyphRanking, GlyphSettings), FairCopySheet, RevisionEditor, GlyphProfiler.

## 2. Proposals (decisions the design leaves open)

Decision rows are labelled `Decision UH-Dn` in the first cell (the ledger's task-row pattern is a first cell that is exactly an ID, so a bare `UH-D1` would be read as an open task).

| ID | Proposal | Why |
|---|---|---|
| Decision UH-D1 *(changed after review)* | **Attic header is 88 px** (board says 72; program R12): `AtticHeader` owns it. The art strip `scenes/home/attic-header-night` (750×224, UA-14) is anchored at its **top** (`object-position: top`), so the top 176 px (88 CSS px) is the header. The lower 48 px (24 CSS px) is bleed: **`AtticHeader` paints it** as its own absolutely positioned layer (same `ArtImage`, clipped to the 24 px under the header, `pointer-events: none`) behind the seat tabs, so tabs and the shelf line share one painted edge; the zero-art fallback paints the same 24 px with the flat home colour. The three room objects are independent ≥ 44×44 hotspots over the painted book, jars and desk (each a real `<button>` with `data-testid`, no whole-strip click target); the fallback (`StudyScene`) renders exactly one control per door, never a second one over the art. A hidden object (locked Bench/Desk) keeps its footprint (empty slot), so the painted scene and the layout do not shift when it unlocks. Codex, Bench, Desk (and UE's Drawing table) use the 64 px header with the 750×128 strips (UA-15). `HomeStrip` selects the height with `AppHeader`'s `variant` prop (UF-8: `'study'` 88, `'subroom'` 64), never by inference from the strip id. | Objects need a 44 px target plus a label; the budget below defines what compresses. |
| Decision UH-D2 *(changed after review)* | **Flexible layout budget, measured on the assembled scene.** Targets: **375×812: 5 columns × 5 fully visible, unobscured sockets at edit scale; 375×667: 5 × 4** (the painted study-v2 shows four rows; the bible says "keep four rows on tighter screens"). "Fully visible" means the whole socket plus its rune name label sits inside the paper, clear of the floating ink pot / Fit / Fair copy, the paper frame border and the spell strip. The old figures (header 88, tabs 44, page ≥ 330, strip 48, drawer 124, door 64, gaps 36 = 734) leave only 78 px for both safe areas and everything omitted, so they are a **starting point, not a promise**; the page takes whatever is left and `PAPER.editPitch` stays 60, so rows follow height. What compresses, in order, on short phones (< 740 px of usable height): (1) the **drawer's closed ends** shrink from 124 to its minimum (tabs row only, 56); (2) the **spell strip collapses to one line** (48 → 32, ribbon text truncated, full reading in the info sheet); (3) the **door shrinks** to a 52 px bar (caption keeps its blocker line); (4) gaps drop to 4/8; the **header (88) and seat tabs (44) never compress**. The door's footprint is **reserved while it is hidden** (drawer open, doorway mode swaps it for Done at the same height) so the page rectangle never moves. Verification (UH-3/UH-5, again at Close): on **merged A + B**, at 375×812 and 375×667 with simulated safe-area insets 44 top / 34 bottom, with all three room objects unlocked, the ⋯ menu closed and a rumour line showing, measure in the browser (a) fully visible socket columns × rows, (b) the paper rectangle and view transform before, during and after drawer expansion, a socket selection and dismissal (must be identical before and after), (c) every control ≥ 44×44 (room objects included), and compare the painted screen with the zero-art fallback at both heights. If 5 rows do not fit at 812 on the merged screen, report it rather than shrinking the pitch (open question 2). | No pitch change, so editing gestures stay as built. |
| Decision UH-D3 | **Locked Bench / Desk objects are hidden** (as built, board agrees); Codex always shows. | No dead objects (P8). |
| Decision UH-D4 | **Drawer expands upward as an overlay** over the spell strip and the page's lower edge; the page container never resizes, so closing returns to the same page view by construction. The door hides while it is up (as built) but **its slot stays reserved** (UH-D2), so the shell never reflows; page rectangle and view transform are measured before, during and after (UH-D2). | `LatticeViewport` re-frames on resize (`resizeView`); an overlay avoids it. |
| Decision UH-D5 | **The Study's ⋯ panel code goes**; UF-12's `MenuSheet` carries the R4 contents (Settings, Install to the Home Screen, About, Copy save, Paste save, Start a new notebook, the Lab, the Gallery in dev). `AppHeader` mounts it; Study keeps no menu state. | Program gives the ⋯ to UF (C7, R4). UH-2 waits for UF-12 (Owed, §4). |
| Decision UH-D6 *(changed after review)* | **Transitions are a watcher on the resolved screen, played only on deliberate in-app navigation.** `TransitionLayer` in `App.svelte` (logic in `src/app/transition.ts`) watches the **resolved** destination (after redirects). Pairs: going out = `study`→`map`; coming home = `cleared`→`tripPage` (full lamp), `crossroads`→`tripPage` (full lamp: Crossroads' Go home also calls `game.returnHome()` and lands directly on the trip page), `wiped`→`tripPage` (low lamp); nothing else, never on first mount. **A pair alone is not enough** (Study→Map also happens with browser Forward, Wiped→trip page on history replay): a **transient navigation signal** (`navIntent`, a module-level one-shot in `transition.ts`, set by the Study door's handler and by Cleared/Crossroads Go home and Wiped *Read the trip*, via a call in each screen's click handler, not by editing `game.svelte.ts`/`router.svelte.ts`/`flow.ts`) marks the change as deliberate; the watcher consumes it once and plays only if the signal matches the pair. **Default: browser Forward/Back never plays** (also a player question, §7). Also: the watcher reads the resolved destination once after initialisation (no plate on reload, on redirect, or when `go()` is refused/denied); a further navigation cancels the previous timers and removes the plate; the plate is **pointer-transparent** (`pointer-events: none`), and the first pointer input anywhere dismisses it **without consuming the input**, so the destination's first tap acts exactly once. | The save and `resolveScreen` already hold the new screen, so a reload lands right and nothing blocks. |
| Decision UH-D7 | **Timings:** plate 1200 ms (Motion pref Quick: 600 ms), reduced motion 300 ms cross-fade. Wiped uses the same plate with a lower lamp (dim in code, no extra art). Removed on any further screen change; it never takes input (UH-D6). | Board "Threshold" note; C6. |
| Decision UH-D8 | **Homecoming is one shared scene + per-district tint** from `[data-district]` tokens (board proposal). New pieces live in `components/home/`, not `components/trip/` (UT's). | Board BUILD said `components/trip/*`; that is UT's by the program table. |
| Decision UH-D9 *(changed after review)* | **"A first" is written in, gold only for verified firsts:** gold bar, each first-kind `Highlight` revealed in turn (`--dur-quick` apart), tap skips to all shown, reduced motion shows all at once. Gold bar = `discovery` highlights (verified firsts). **`proof` ("Nearly proven", which `tripHighlights` can emit on repeated trips) goes into the plain ledger, not the gold bar**, as does `chain`. | P7 gold is firsts; G4; a repeated near-proof is progress, not a first. |
| Decision UH-D10 | **Bench swatches get their own component** (`components/bench/SubjectSwatches.svelte`, shape + letter); `components/lab/Palette.svelte` is not edited. | Palette is shared with the Lab (UE); keeps packs disjoint. Shapes are read from FT's board art, read-only. |
| Decision UH-D11 | **Codex "Next page ›"** at the bottom steps to the next tab, hidden on the last. Entry for the owner's margin note moves onto a paper strip in `--font-script`. | Board proposal. |
| Decision UH-D12 *(changed after review)* | **LatticeEditor restyle applies only under `household` mode** (the Study); the Lab call (no `household`) keeps today's look (UE-5 does not flip it; `components/lattice/*` stays UH's). New optional `readonly` prop (UH-3) serves FT-25's pocket sheet (R3): it is **passed through Editor → Grid → Viewport**, covering socket tap, hold/lift and keyboard activation; it still permits seat selection and view navigation (pan, Fit, scale). The pocket uses **its own view memory key** (separate `sessionKey`), never the Study's. | Lab and pocket sheet share the file; additive props keep them working. |
| Decision UH-D13 | **Attic art: night only.** The board's day variant is dropped (the game has no clock); UA Pack G ships `attic-header-night` only. | Less art, nothing reads it. |

## 3. Current implementation and risks

- `screens/Study.svelte` (644 lines) mixes logic (doorway draft, Fair copy mode, glyph sheets, revision, args, ⋯ panel with `copySave`/`loadPasted`/`resetAll`) with markup. Restyle touches only markup/style plus removing the ⋯ panel; derived values stay.
- `components/study/StudyScene.svelte` is an inline SVG attic (window, lamp, rain) with Bench/Desk/Codex/menu `knob` buttons (test ids `bench-button`, `desk-button`, `codex-button`, `menu-button`) and the rumour line (`rumourLine`). It becomes the **zero-art fallback** of the new strip; keep the test ids.
- `components/lattice/LatticeEditor.svelte` (686 lines) owns seat tabs (`bookmarks`, `+N`), ink pot, page, info strip, spell reading, fair panel and the `RuneShelf` drawer (`drawerUp` bindable). It is used by Study and Lab; `LatticeViewport` (`floating`, `controls`, `readonly`) measures its container and sets pitch from `PAPER.editPitch`; view memory is per `sessionKey` (`rememberView`, `resizeView` in `app/latticeViewport.ts`).
- Navigation: `App.svelte` renders `resolveScreen(...)`'s screen; `game.returnHome()` does `go('trip-page', undefined, {replace:true})`, `readTrip()` goes to the trip page from Wiped. Study's door is `go('map')`.
- Codex/Bench/Desk use `BackLink` and mono chips (`font: 700 … var(--mono)` in `Codex.svelte`); Bench embeds `BattleBoard` (FT) and `lab/Palette` (UE). `TripPage.svelte` builds `highlights` from `tripHighlights`, `joinedHighlights`, `heardHighlights`, `answeredHighlights`; the ledger is a `<details>`.
- Vitest runs in node (`include: tests/**/*.test.ts`): no DOM tests. UI is proven by fixtures + screenshots; logic by app-layer tests.

Risks, in order:
1. **LatticeEditor is shared** (Study, Lab, FT pocket sheet). Mitigation: Pack B goes first, additive optional props only, `household` gates the new look; FT's pocket task waits for UH-3.
2. **5×5 at 812 / 4 at 667** must hold with real chrome. UH-3 and UH-5 measure it; UH-1/UH-2 header and door heights are fixed numbers (UH-D2).
3. **Transition correctness** (no replay on reload, no replay on redirect, never traps taps). Settled first by UH-12, test-first.
4. **`src/app/App.svelte` is not in UH's Owns.** One additive line (mount `TransitionLayer`) is a grant, taken in the R1 order UF-13 → UH-13 → UE-8 (§4).
5. Household drag inside a scrolling sheet: keep long-press arming (`drag.svelte.ts`) untouched.
6. **Gestures are frozen as built** (`src/ui/attach/latticePan.ts`): tap a socket; hold/lift; Erase; **single-pointer drag pans, and a second pointer cancels the gesture** (there is no two-finger pan); cancellation rules; Fit; Edit scale (`PAPER.editPitch` 60); tap-region. Pack B restyles around them and proves unchanged ink, orientation and viewport outcomes on the phone.

## 4. Contracts

**Consumes** (quoted from ux-program.md; not redefined):
- C1 tokens: `--font-serif|script|hand`, `.label` small caps, `data-world="home"`, `--home-*`, `--gold`, `--danger`, `--tap: 44px`, `--dur-quick|base|held`; "no mono in player UI".
- C2 registry: `artUrl(id)`, `<ArtImage id fallback>`; "Every screen must render correctly with zero art present."
- C4 sizes: portraits 192×192 shown 48–96 px; scene strips 750×128 / 750×N; full-bleed 750×1624.
- C6: transitions "use the same pref and the same skip rule" (Motion `normal|quick`, reduced motion = cross-fades).
- C7 `AppHeader`, `ActionButton` (one primary per screen), `Sheet`, `Unseen`, `Card`, `MenuSheet`; C8 fixtures for every state below.
- From **UF**: UF-1 (tokens, `[data-world][data-district]` light), UF-2 (art registry, `ArtImage`), UF-3 (API-frozen C7 stubs), UF-8 (`AppHeader`, `ActionButton`, `Card`), UF-9 (`Unseen`), UF-10 (`Sheet`, `Toasts`), UF-11 (`motionScale()`, reduced-motion flag), UF-12 (`MenuSheet`), UF-13 (stamp out of `App.svelte`), UF-14/UF-15 (fixtures).

**Provides:**
- `components/home/HomeStrip.svelte` (strip `ArtId` + fallback snippet, passed to `AppHeader`'s `strip` prop; height chosen with `AppHeader.variant`, UH-D1; one owner of fallback chrome: `StudyScene`/`AtticHeader`, not the header) and `RoomObject.svelte` (UH-0). Consumers: UH-8…UH-10 and **UE-1** (Drawing table strip).
- `LatticeEditor` optional `readonly?: boolean` (hides shelf, drawer, Fair copy; ignores socket tap, hold/lift and keyboard activation, threaded Editor → Grid → Viewport; page, seat tabs, pan, Fit and scale stay) (UH-3). **Published early, independently of the painted shell**: merge UH-3 before FT-25; FT-25's pocket uses a separate view memory key. Button/sheet props, the source of party/log per screen and the mount sites (including the field header) are pinned in FT's pocket pack; UT gets an integration task after the working FT pocket merges (see UT plan). **FT-25's pocket notebook consumes it (R3), waits for UH-3 and must not edit `components/lattice/*`.**
- `src/app/transition.ts`: `transitionFor(prev: Screen | null, next: Screen, opts: { reduced: boolean; motion: 'normal' | 'quick'; deliberate: boolean }): Transition | null`, `Transition = { kind: 'out' | 'home'; tone: 'full' | 'low'; mode: 'plate' | 'fade'; ms: number }`, plus `markNavigation(pair)` / `takeNavigation()` (the one-shot `navIntent`, UH-D6).
- `TransitionLayer.svelte` mounted once in `src/app/App.svelte` (UH-13, second of the R1 edits; UE-8's column wrapper must contain it); UT's screens call `markNavigation` in their Home / Read the trip handlers (a one-line additive call, listed in UT's Owed): Cleared's and Crossroads' Home (`game.returnHome()`) play the full-lamp plate; Wiped's "Read the trip" (`readTrip()`) plays the low-lamp plate; Wiped's Home goes to the Study and plays nothing.

**Art ids UH consumes (Owed by UA; each has a fallback, so none blocks):**
(ids exactly as UA ships them, UA-14…UA-16, UA-9, UA-27): `scenes/home/attic-header-night` (750×224: 176 header + 48 bleed, R12), `props/home/{book,jar,desk,ink-pot}` (160²), `ui-plates/home/door-plate` (718×144), `scenes/home/{codex,bench,desk}-strip` (750×128), `ui-plates/home/{paper-tile,page-frame,wood-tile,drawer-top,drawer-mid,drawer-bottom,spell-strip,seat-tab,rune-card,margin-strip}`, `portraits/shared/<apprenticeId>` (+ `-card`, 222×330, for the detail strip) and `portraits/shared/owner` after the handover (R14: 9 apprentices + the owner), `scenes/shared/transition-door` (going out) and `scenes/shared/transition-stair` (coming home) (750×1624), `ui-plates/shared/rain-light`, `scenes/home/homecoming` (750×380).

**Owed to UH by others (add to the status file):**
- UF-12 `MenuSheet` with the R4 contents (UH-D5); needed by UH-2.
- Grant for `src/app/App.svelte`: one additive mount line; needed by UH-13, after UF-13 has merged and before UE-8 (R1).
- C8 fixtures, built by UF-14/UF-15 from UF's fixture list (UF's ids only): `study-fresh`, `study-mid`, `study-three-seats`, `study-doorway`, `study-trip-out`, `study-first-evening`, `household-full`, `homecoming-first`, `homecoming-quiet`, `codex-early`, `bench-mid`, `desk-empty`, `desk-open-row`. **Recipes UH needs UF to add to its fixture table first** (status Owed; a plan never invents a name in a Done-when): `study-unlocked` (Bench, Desk, Codex all unlocked, a rumour showing, three seats), `faircopy-ready` (Study in Fair copy mode), `glyph-settings`, `glyph-ranking`, `glyph-profiler`, `glyph-revision` (each opens its sheet via `taps`), `pocket-readonly` (the Study with `readonly` on, for UH-3 and FT-25), `desk-expanded` (a rune row open), `bench-page-trial` (a held page, authored board). Fixtures that use only the save and a route are plain; any state held in a transient store (none for UH apart from the wipe payload used by `wiped-seam` below) gets a UF recipe saying so; the transitions are exercised from `study-three-seats` (tap `door`), `cleared-seam` (tap `return`), `crossroads-seam` (tap `return`) and `wiped-seam` (tap `read-trip`; the wipe payload is a transient store, `game.wipe`, set by UT-2's `wipeFixture()`). **Fixtures load with a memory save backend and replace the URL, so a reload loses the state:** the reload checks use a persisted test save in an isolated browser profile, and a real route loop is exercised separately from fixture screenshots (UH-V).
- UA ids above (UA-9, UA-14…UA-16, UA-27) as pure file drops.

## 5. Packs

Packs 0, A, B, C, D, E, F own disjoint files and may run together (two or three at a time) once Pack 0 merges. UH-3 is the one task other plans wait on (FT-25, R3).

### Pack 0: Home kit (role: Default; UI; depends on: UF-1…UF-4, UF-8 (`AppHeader`, `variant` prop))
Owns: `src/ui/components/home/HomeStrip.svelte`, `RoomObject.svelte`.
Pattern: UF's `AppHeader`, `ArtImage`.

| ID | Goal | Size | Done when |
|---|---|---|---|
| UH-0 | `HomeStrip` (header height via `AppHeader.variant`), `RoomObject` (sprite or glyph fallback, label pill, ivory edge, shared cue, ≥44 px, `lit`, footprint kept when hidden). **No `transition.ts` stub and no `it.todo` list** (no caller needs them yet; the failing tests are written with UH-12) | S | tsc passes; a throwaway fixture shows `RoomObject` with and without art at 375×812 |

### Pack A: Study shell (role: Default; UI; depends on: UH-0, UF-8 (`AppHeader`, `ActionButton`); UH-2 also UF-12 (`MenuSheet`))
Owns: `src/ui/screens/Study.svelte`, `components/study/{AtticHeader,Door,StudyScene}.svelte` (StudyScene reduced to the fallback art; `AtticHeader` is the single owner of fallback chrome and of the 24 px bleed layer, UH-D1).
Pattern: study-v2.png; today's `StudyScene`.

| ID | Goal | Size | Done when |
|---|---|---|---|
| UH-1 | `AtticHeader`: strip anchored at top + 24 px bleed layer + script title + Codex/Bench/Desk `RoomObject`s (hidden = footprint reserved) + ⋯ last; rumour line as a paper note (no mono); doorway-mode header ("A quiet doorway", Codex pill) | M | fixtures `study-fresh`, `study-three-seats`, `study-doorway`, `study-unlocked`: header 88 px, strip top-aligned, bleed behind the tabs, only unlocked objects (same gates painted and fallback), three independent ≥ 44×44 hotspots over book/jars/desk, exactly one control per door in the fallback, rumour line visible; test ids kept |
| UH-2 | `Door` as `ActionButton` primary with door scene (`ui-plates/home/door-plate`; fallback = today's planks); `Done` in doorway at the same footprint; delete ⋯ panel in favour of `MenuSheet` (UF-12); check overlay placement | M | `study-trip-out`, `study-first-evening`, `study-doorway`, `faircopy-ready`, `glyph-settings`, `glyph-ranking`, `glyph-profiler`, `glyph-revision`: caption shows the blocker, FirstEvening, `NoteUnderDoor`, WelcomeSheet and Glyph sheets sit as before; phone check at 375×812 and 375×667 |

### Pack B: Page and drawer (role: Default; UI; depends on: UH-0; **UH-3 is published first and early, independent of the painted shell**)
Owns: `src/ui/components/lattice/*` (presentation; gestures untouched).
Pattern: study-v2.png; today's `household` branch of `LatticeEditor`.

| ID | Goal | Size | Done when |
|---|---|---|---|
| UH-3 | `readonly` prop threaded Editor → Grid → Viewport (tap, hold/lift, keyboard; seat selection and navigation still work); page frame (paper, wood, corner ornaments), floating ink pot / Fit / Fair copy, rune name labels under runes; frozen gestures kept (§3 risk 6) | M | on merged A + B (or A's fallback header until A merges), `study-three-seats` and `study-unlocked`: 375×812 = 5 × 5 fully visible unobscured sockets, 375×667 = 5 × 4 (UH-D2 measurements); `pocket-readonly` ignores tap, hold/lift and keyboard activation but allows seat switch and pan; tap, hold/lift, Erase, drag, second-pointer cancel, Fit, Edit scale give unchanged ink, orientation and viewport outcomes on the phone; **phone check** |
| UH-4 | Seat tabs: token, name, HP · move, dashed visiting and Empty tabs, `+N` | S | `study-three-seats`, one-seat save: tabs ≥44 px, switch page, `+N` opens the sheet |
| UH-5 | Spell strip (ribbon of the focused spell; one line on short phones) and drawer: fixed painted tabs/ends, expandable middle, close returns to the same view | M | with the page panned, open then pick a rune: paper rectangle and view transform identical before, during and after expansion, selection and dismissal; rune in hand shown in the strip; seven roles + Erase + Inventions + Glyphs reachable; painted vs fallback compared at 375×812 and 375×667; **phone check** |

### Pack C: Household and Study sheets (role: Default; UI; depends on: UH-0, UF-8…UF-10 (`Card`, `Unseen`, `Sheet`))
Owns: `components/study/{HouseholdShelf,SeatCard,ApprenticeFull,drag.svelte.ts,FirstEvening,FairCopySheet,GlyphSheet,GlyphRanking,GlyphSettings,GlyphProfiler,RevisionEditor}.svelte`. Props unchanged.
Pattern: UF `Sheet`, `Card`, `Unseen`.

| ID | Goal | Size | Done when |
|---|---|---|---|
| UH-6 | Household sheet: ~86 % tall, three seat portrait cards above, At home 3 per row, detail strip with *Open page* primary, empty slot as `Unseen`; portraits via `ArtImage` with `ApprenticeToken` fallback | M | `study-three-seats` + `household-full` (9 apprentices): sheet shows both rows; trip-out fixture locks drag; long-press drag still arms |
| UH-7 | The other Study sheets and FirstEvening moved onto restyled `Sheet`/tokens (no mono) | S | each sheet opens from its fixture and reads at 375×812 |

### Pack D: Codex and Desk (role: Default; UI; depends on: UH-0, UF-9 `Unseen`)
Owns: `screens/{Codex,Desk}.svelte`, `components/{codex,desk}/*`, `tests/ui/codex-tabs.test.ts`.

| ID | Goal | Size | Done when |
|---|---|---|---|
| UH-8 | Codex: `HomeStrip` header with back, tabs in small caps one scroll row with edge fade, one Unseen style, margin note on a script paper strip, "Next page ›" (test `next page moves to the following tab and stops at the last`) | M | `codex-early` shows ??? entries in the Unseen style and no mono; tab test passes |
| UH-9 | Desk: strip header, rune rows 72 px with I–III pips, open row shows margin columns (side-scroll when tight), empty-state voice line, *Write footnote* primary | M | `desk-empty` shows the voice line, `desk-open-row` shows three columns without clipping at 375, `desk-expanded` (a row open with margin columns and the primary still reachable) |

### Pack E: Bench (role: Default; UI; depends on: UH-0, UF-8; reads FT's `components/board/art.ts` read-only, which FT-5…FT-7 may still edit: rebase before merge)
Owns: `screens/Bench.svelte`, `components/bench/*`.

| ID | Goal | Size | Done when |
|---|---|---|---|
| UH-10 | Layout: strip header, method chips in one scroll row, grid 6×5 at 58 px moved up under the headline (no gap), *Trial* the one primary, Clear / Name and write secondary; a **held-page trial** keeps its authored board (size from the page, not 6×5) and its Codex back | M | `bench-mid` at 375×812: grid starts directly under the headline, Trial in thumb reach; `bench-page-trial`: authored board shown at its own size, Back goes to Codex; colour and greyscale pair of the trial board (fight board art, UF `grey=1`) |
| UH-11 | `SubjectSwatches` (shape + letter) and parts/solvent strip opening the parts sheet | S | each swatch shows shape and letter; `lab/Palette.svelte` unchanged (git diff empty) |

### Pack F: Homecoming and transitions (role: Strong for UH-12, Default after; UI + app; depends on: UH-0 (not for UH-12, which is pure logic), UF-11 (Motion pref), UF-13 (UH-13 edits `src/app/App.svelte` after it); consumed by UT (Wiped/Cleared plates) and UE-8 (column wrapper contains the layer))
Owns: `src/app/transition.ts`, `tests/app/transition.test.ts`, `screens/TripPage.svelte`, `components/home/{TransitionLayer,Homecoming*}.svelte`. Grant: one line in `src/app/App.svelte` (R1: after UF-13, before UE-8).

| ID | Goal | Size | Done when |
|---|---|---|---|
| UH-12 | `transitionFor`, `navIntent` one-shot and timing, **test-first (the failing tests are written here, not as todos earlier)** (§6 names) | S | all transition tests pass |
| UH-13 | `TransitionLayer`: plate (`ArtImage` `scenes/shared/transition-door|transition-stair` with gradient fallback + `ui-plates/shared/rain-light`), pointer-transparent, first input dismisses without being consumed, cross-fade when reduced, stale timers cancelled, `markNavigation` calls added to the Study door and (by UT's handoff) the Home / Read the trip handlers, mounted in `src/app/App.svelte` (after UF-13) | M | going out and coming home (Cleared and Crossroads, full lamp; Wiped, low lamp) play from fixtures; no plate on reload (persisted test save, isolated browser profile), redirect, refusal, browser Forward/Back; rapid Back; one tap on a real destination control during the plate acts exactly once across both success routes, both Wiped exits, Quick and reduced motion; **phone check** |
| UH-14 | Homecoming scene page: scene + district tint (art plane only), "Home from X", deepest room, gold "first" bar written in (verified firsts only; *Nearly proven* in the plain ledger), ledger sized to content, owner's reply line, *Back to the desk* primary | M | `homecoming-first` shows the gold bar lines appearing in turn and fully shown after a tap; `homecoming-quiet` has no empty box; a repeated-trip fixture/test shows *Nearly proven* in the ledger and no gold; `back-to-desk` works |

### Pack V: Close (orchestrator, depends on: A–F; a ledger-visible task row, not a prose heading)

| ID | Goal | Size | Done when |
|---|---|---|---|
| UH-V | `pnpm check`, a **real route loop** on the phone (Study → Map → trip → Crossroads Go home and Cleared → trip page → Study; a wipe → Read the trip; Codex/Bench/Desk visits), separate from fixture screenshots; the merged-Study measurement of UH-D2 at both heights (painted vs fallback); one `code-review`, DESIGN §11 / TECH §7 rows, plan State, roadmap, status ledger clean. UH-14's verification names UF-14/UF-15 fixtures as explicit dependencies. | L | `pnpm check` green; ledger clean; every open **and prose-only** task of this plan listed by the ledger is done or in the status file's Next before State becomes Built |

## 6. Verification

App-layer, test-first (`tests/app/transition.test.ts`): `a reload (no previous screen) never plays a transition`; `study to map plays going out`; `cleared to trip page plays coming home at full lamp`; `crossroads to trip page plays coming home at full lamp`; `a pair without the navigation signal (browser forward/back, redirect, refused go) plays nothing`; `a second navigation cancels the first plate's timers`; `wiped to trip page plays coming home at low lamp`; `other screen changes (map to study, study to codex, battle to loot) play nothing`; `reduced motion gives a 300 ms cross-fade`; `quick motion halves the plate time`; `no transition lasts longer than 1200 ms`. `tests/ui/codex-tabs.test.ts` as above. Browser (UH-13, phone): one tap on a real destination control during the plate acts exactly once; reload with a persisted save in an isolated browser (the memory fixture loader loses its backend on refresh).
UI: each task's fixture state at 375×812 (and 375×667 for the Study), screenshot, Svelte autofixer on every changed component, zero-art rendering checked by running with no art files. Dev servers: UH packs share ports **5191–5192** (Pack A 5191, Pack B 5192; C and F take 5191/5192 when run alone or after one of them finishes, never more than two UH phone packs at once; UT uses 5193–5194, UE 5195–5196). Phone check only where marked. At the Close: rows-visible check on the merged Study (5 fully visible at 812, 4 at 667, UH-D2), every tappable ≥44 px by measurement in the browser, existing `tests/app/study.test.ts`, `latticeViewport.test.ts` and `flow.test.ts` unchanged and green.

## 7. Open questions (defaults held)

- Settled: `AppHeader` takes the strip art through its `strip: ArtId` prop (UF-8); `HomeStrip` passes it.
- Should Study's header grow back to the board's 72 px if 5 rows fit anyway? Default 88 (UH-D1).
- Homecoming scene per district or shared? Default shared + tint (UH-D8).
- **Player question:** should the going-out plate play when revisiting the Map with browser Forward? Default: deliberate in-app navigation only (UH-D6).
- If 5 fully visible rows do not fit at 812 on the merged Study, which compresses first: the spell strip or the drawer? Default order in UH-D2.

## 8. Execution notes

Critical path: UH-0 → Pack B (FT-25's pocket sheet needs UH-3) → Pack A. C, D, E, F run beside them, two or three at a time on disjoint files (F's UH-12 can start right after UH-0 since it is pure logic). Rough size: 15 tasks ≈ 6 S + 8 M, about two L of work per pack pair; ~6 agent runs plus Close. Proposals for the player: UH-D1, D4, D5, D6, D7, D12 (none redefines an earlier decision; D1 deviates from the board's 72 px figure).

## Review resolution (review 3, home side)

1. **Assembled Study:** UH-D1/D2/D4 rewritten: top-anchored strip, `AtticHeader` paints the 24 px bleed, independent 44×44 hotspots, one fallback control per door, reserved door slot, short-phone compression order, 5×5 at 812 and 5×4 at 667 measured on merged A + B with insets, drawer/selection/dismissal transform checks, painted vs fallback at both heights (UH-1/3/5, UH-V).
2. **Gestures and pocket (UH side):** frozen set recorded as built (single-pointer pan, second pointer cancels); `readonly` threaded Editor → Grid → Viewport incl. hold and keyboard; separate pocket view memory; UH-3 published early before FT-25 (UH-D12, UH-3). UT integration task lives in the UT plan; the FT pocket pins its own props.
3. **Transitions:** UH-D6 rewritten (Crossroads → trip page added, `navIntent` one-shot, no history replay, resolved destination, stale timers cancelled, pointer-transparent plate, first input acts once); tests and browser checks in UH-12/13 and §6.
6. **Acceptance states (UH side):** `study-unlocked`, `faircopy-ready`, glyph and revision recipes, `pocket-readonly`, `desk-expanded`, `bench-page-trial` named for UF; transient `game.wipe` called out; UF-14/15 are explicit verification dependencies; real route loop separate from fixtures; Bench trial board gets a colour/greyscale pair.
Should-fix: UH-0 trimmed (no stub, no todos; `AppHeader.variant`; single fallback owner); ports 5191–5192; expanded Desk and held-page Bench trial added; UH-D9 gold only for firsts; UH-3 publication ordering.
