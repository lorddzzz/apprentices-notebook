# UX ending (UE): ending screens, Lab and Gallery, larger screens, program Close

Design: [ux-polish.md](../design/ux-polish.md) §0, §5, §6 · board §6 frames "Ending 1–3" and "OUTSIDE THE FICTION" (snapshot [ux-board-snapshot.txt](ux-board-snapshot.txt) lines 198–218, 362–390) · program: [ux-program.md](ux-program.md) · Roadmap: BL-135, BL-100, BL-73.
State: Drafted (2026-11-26), revised after review 3 (see the Review resolution at the end). Prefix `UE`. Phase 6, the last. Runner: Claude (Codex art comes from UA's ending scenes, a pure file drop).

Decision IDs used by the program and the decisions review: UE-D1 = Proposal 1 (larger screens), UE-D2 = Proposal 4 (Lab/Gallery gate, replaced by program R4), UE-D3…UE-D7 = Proposals 2, 3, 5, 6, 7. UE-D3 changed after review (no blocking rotate gate).

Scope: restyle the Drawing table, Handover and Credits to the system and the home world; restyle Lab (visible in release builds, program R4) and Gallery (dev builds or `?dev`) to the plain system look on the real board layers; decide and build larger-screen behaviour (BL-73); run the program Close. Rules, copy, content, drawing rules, room generation and the ending's text and flow stay as they are.

## 1. Settled (cited, not copied)

- Program §1, C1 (tokens, `data-world="home|city|system"`), C2 (art optional), C7 (`AppHeader`, `ActionButton`, `Sheet`, `Card`, `Unseen`, `MenuSheet`, `Toasts`), C8 (late-state fixtures first). Phone portrait is primary (DESIGN §7).
- Board frames: Drawing table = home header 64 + drawing-table strip, page tabs 44 (drawn = inked, blank = pencilled), page 420, pen pot + element groups row, rooms strip 90, one primary. Handover = full-bleed night scene, no header, only ⋯, letter card 260, one primary. Credits = the same scene dimmed, script title, household chips, district crests, idioms, tap pauses, swipe scrolls, one primary at the end. Lab/Gallery = system header 56, no art (the board says "dev builds only"; **program R4 overrides: the Lab is visible in release builds, the Gallery only in dev builds or with `?dev`**); Lab's board is the real fight board with placeholder tiles; Gallery has section chips, a 3-column fixture grid, tokens and the greyscale toggle (UF).
- Program gate UX-G3: the player's whole-game look playtest, on the finished build (program §4).

## 2. Proposals

1. **Larger screens (BL-73): one centred phone column, no reflow.** At widths ≥ 600 px the app is a column `min(100%, 480px)` wide and `min(100%, 1000px)` tall, centred, on the ink-dark page background that `html, body` already use, with a faint column shadow. Below 600 px nothing changes (a 375×812 screenshot is pixel-identical before and after, captured as a **deterministic pre-wrapper phone screenshot with fonts ready and motion settled** before UE-8 starts). **The column itself is probed before it is built** (UE-9): a mouse report from before the wrapper cannot establish containment. In the same column at 768×1024, 1024×768 and 1440×900 measure the household sheet, a toast, a transition plate, the map's node/art registration and 44 px board hit boxes; Credits currently uses viewport-relative padding and translation, so verify its last line and Skip inside the 1000 px height cap; test 599/600 px and a short landscape after the hint is dismissed. *(changed after review)* Every screen is designed on 375–430; two-column layouts would need new gestures and a design pass the program excludes. iPad portrait and landscape and desktop all get this. *Alternatives:* scale the column up with CSS `zoom` on tablets (open question 1); real two-pane layouts (a later BL).
2. **Landscape phones: no blocking rotate gate** *(changed after review; replaces the full-screen note)*. Landscape stays playable immediately. At most a **dismissible inline hint** ("Hold the notebook upright", an × button, session-only) when `orientation: landscape` and height < 500 px; it never covers the screen and takes no input barrier. The PWA manifest says `orientation: 'portrait'`, which iOS Safari ignores. (Player question: is any prompt wanted at all; default hint only.)
3. **Desktop input gaps are findings, not fixes.** The lattice pans by single-pointer drag with a second pointer cancelling (`latticePan.ts`; there is no two-finger pan to be missing), so a mouse drag already works; the **observed** mouse behaviour (long-press, wheel, drag, board taps, sheet dismiss) is recorded, not assumed. BL-73's job is verification: the Close run records findings in ux-polish.md and as backlog rows. *(changed after review)*
4. **The Lab is visible in release builds; the Gallery is dev or `?dev` only (program R4, replaces this proposal's earlier dev-only Lab). Redefines the board's "dev builds only".** The Study links to the Lab today, lessons use it and the player tests it on the live site. UF-12's ⋯ menu shows the Lab row always and the Gallery row only when UF-11's `isDevEnabled(isDevBuild, search)` is true; `#/gallery` is denied otherwise (the denial **follows the normal resolution** the app would give that route — the trip/wipe screen when one is active, else the Study — never an unconditional jump to the Study, so a trip is never hidden), `#/lab` always opens (reachable in release builds). The Lab's own city shortcuts and "everyone" pickers stay behind `?dev` / dev builds as `Lab.svelte`'s `devTools` reads today.
5. **Copy stays.** The board's primary labels for the Drawing table ("Finish this district") are Proposals; the existing wording and the existing actions (ink the page, clear, name, length) are kept, since copy is frozen.
6. **No new art beyond UA's ending scenes.** Credits reuses the Handover scene with `filter: brightness(.45)`; room thumbnails are vector from room data; pen, pot and element icons are vector.
7. **Credits gets "tap pauses".** The roll is a CSS animation today and a record of the moment (read once on arrival). A tap pauses and resumes it; swipe scrolls by hand (the handler **distinguishes a swipe from a tap**, so scrolling never toggles the pause); reduced motion = a plain scrollable list; the end, Skip and history-back paths are all verified. This adds one interaction, so it gets a phone check.

## 3. Current implementation and risks

Checked: `DrawingTable.svelte` (100 lines: header with `BackLink`, one `DrawingEditor` in a `.leaf`; state in `app/drawing.ts`), `components/drawing/{DrawingEditor,ElementGroup,PageTabs,PenPot}.svelte` (255/131/71/37), `Handover.svelte` (163; pages, `lastPageAction`, `game.updateProfile(handover)`), `Credits.svelte` (155; `creditsOf`, a scroll that marks credits seen on animation end or skip), `Lab.svelte` (362; already mounts `BattleView` + `BattleBoard` + `DISTRICT_UI`, with `components/lab/*`), `Gallery.svelte` (475) + `galleryFixtures.ts` (522), `app/App.svelte` (`main` is full width and `position: relative`; one `.build` stamp; `#app {height: 100dvh}` in `theme.css`), `app/flow.ts` `resolveScreen`, `vite.config.ts` manifest.

- **Riskiest unknown: BL-73 containment.** Only `components/study/HouseholdShelf.svelte` uses `position: fixed`; a column must make it column-relative without editing UH's file. UE-9 settles it first with `contain: layout` on `main` and a screenshot of the household sheet at 1024×768.
- The three ending screens were never captured; C8's late-state fixtures (UF) are the precondition. Without them UE-1 cannot be verified; if UF slips, UE-1 builds its own saves.
- `Handover.svelte` and `Credits.svelte` mutate the profile on completion (`handover`, `seeCredits`); restyle must not change when they fire. A test per screen asserts the same profile after the same taps (UE-2, UE-3).
- Lab on real board layers depends on FT's final `BattleBoard` props; UE-4 reads them at start.
- `Lab` and `Gallery` are lazily imported in `App.svelte`; keep that so release bundles stay lean.

## 4. Contracts

**Provides:** `shellMode(width, height): { mode: 'phone' | 'column'; hint: boolean }` (`src/app/shell.ts`, pure, tested; `hint` = short landscape) · the centred-column rule for every screen (documented in TECH §7) · `isDevScreenAllowed(screen, dev)` in `flow.ts` (guards `gallery` only) and an **explicit adapter**: `resolveScreen` gains an optional `dev?: boolean` input that defaults to UF-11's `isDevEnabled(import.meta.env.DEV, search)` read by the adapter itself, so the existing `App.svelte` caller needs no change and tests pass `dev` directly; the **owner of the edit is UE-4** (Pack B) · the Close records.

**Consumes (quoted):**
- C1: "A screen declares its world with `data-world="home|city|system"` on its root." Drawing table, Handover, Credits = `home`; Lab, Gallery = `system`. From UF-1.
- C7: `AppHeader` (UF-8; world, title, back or crest, right slot, ⋯ last; heights 64 home / 56 system), `ActionButton` (UF-8, "one primary per screen"), `Sheet` (UF-10), `Card`, `MenuSheet` (UF-12). UH-0's `HomeStrip` for the Drawing table strip.
- C8: fixtures `drawing-blank`, `drawing-two-inked`, `handover-ready`, `credits-full`, `lab-play`, `lab-board`, `lab-lattices` (UF-14, UF-15; late states first; UF's ids only). `AppHeader` heights come from UF's `variant` prop.
- C2/C4: `scenes/home/drawing-table-strip` (750×128) and `scenes/home/handover` (750×1624, UA-27, the ids are UA's); `portraits/shared/<id>` and, after the handover, `portraits/shared/owner` for household chips (R14: 9 apprentices + the owner); `crestFor(id)` (FT-4; UD-5…UD-15 supply the crests, 96×96).
- From UF: UF-11's `isDevEnabled`, UF-12's ⋯ rows (Lab always, Gallery in dev), UF-6/UF-7's Gallery `tokens` and `art` pages and greyscale toggle (UE-6 extends, never replaces them), the build stamp already moved into the menu (UF-13). From UD: `DISTRICT_REVIEW_BOARDS` (UD-3). From FT: the board in its zero-art placeholder rendering (C2). FT-8's brief promises markers and beats, **not** an explicit "placeholder mode": pin the Lab placeholder-board API with FT before UE-5 starts (status Owed: FT confirms the props, or UE-5 uses the plain zero-art board and never edits `components/board/*`).

**Grant and merge order, recorded in the status file (R1):** `src/app/App.svelte` UF-13 → UH-13 → UE-8 (UE-8 includes imports and any caller wiring); `src/app/flow.ts` UT-2 → UE-4; Gallery UF-6/UF-7 → UD-3 → UE-6.

**Owed:** Credits crests (UD-5…UD-15, via `crestFor` from FT-4) · late-state fixtures (UF-14/UF-15) · ending art (UA-27, optional) · every UE task below · Close records (UE-Z). `src/app/App.svelte` edit UE-8 comes last in the R1 order (UF-13 → UH-13 → UE-8); `src/app/flow.ts` edit UE-4 comes after UT-2's (R1).

## 5. Packs

Packs A, B and C own disjoint files and may run together (**Pack A may start on its listed providers (UF-8…UF-10, UF-14, UH-0, FT-4) without waiting for all districts**; A + B with the UA ending pack beside them; C alone, since it edits `src/app/App.svelte`, which UF-13 and UH-13 also touch: UE-8 goes last, R1). Close runs last.

### Pack A: Ending screens (role: Default; UI; depends on: UF-8…UF-10, UF-14 (late fixtures), UH-0 (`HomeStrip`), FT-4 (`crestFor`); UA-27 art optional)
Owns: `src/ui/screens/{DrawingTable,Handover,Credits}.svelte`, `src/ui/components/drawing/*`, new `src/ui/components/ending/*`, and the two named test files `tests/ui/handover-profile.test.ts`, `tests/ui/credits-seen.test.ts`.
Pattern: `src/ui/screens/Study.svelte` (study-layout, BL-134) for header, paper and world.

| ID | Goal | Size | Done when |
|---|---|---|---|
| UE-1 | Drawing table to the board frame: UH-0's `HomeStrip` (`AppHeader` `variant='subroom'`, 64 + strip), page tabs (inked/pencilled), page, one row for pen pot and groups, rooms strip, existing actions kept | M | fixture `drawing-blank` and `drawing-two-inked` at 375×812: header 64, page ~420, all taps ≥ 44, one primary; zero art renders; `tests/app/drawing*.test.ts` unchanged and green |
| UE-2 | Handover: full-bleed scene (placeholder = night wash + lamp glow), only ⋯, letter card, one primary; page flow and `handover` call unchanged | M | fixture `handover-ready` first and last page; scene missing = still readable; **Vitest is node-only**: pure profile/ending logic is checked with existing pure tests (`tests/ending/*`, `tests/ui/handover-profile.test.ts` over the pure page-action/profile functions) and the actual taps by a browser sequence on the phone; Handover fires exactly once, on the last action |
| UE-3 | Credits: dimmed scene, script title, household chips (portraits), crest rows via `crestFor`, idioms, tap pauses (a swipe never toggles it), swipe scrolls, one primary at the end; reduced motion = static list | M | fixture `credits-full`: roll runs, tap pauses and resumes, swipe scrolls, the last line and Skip visible inside the height cap, Back to the study visible at the end; `seeCredits` fires exactly once on end, on Skip **and on unmount** (including reduced motion and history back); **Skip returns to the opener** (the Study or Codex, wherever Credits was opened from); same profile after the same actions as on main; **phone check** |

### Pack B: Lab, Gallery and the dev gate (Default; UI + app; depends on: UF-6, UF-7 (Gallery pages), UF-11 (`isDevEnabled`), UF-12 (menu), UF-8…UF-10, UF-15 (lab fixtures), FT-8 (board), UD-3 (`DISTRICT_REVIEW_BOARDS`), UT-2 (`flow.ts` edit first))
Owns: `src/ui/screens/{Lab,Gallery}.svelte`, `src/ui/screens/gallery*.ts`, `src/ui/components/lab/*`, `src/app/flow.ts` (the `resolveScreen` guard only), `tests/app/dev-gate.test.ts`.
Pattern: `Study.svelte` for header slots; `Lab.svelte` as it is.

| ID | Goal | Size | Done when |
|---|---|---|---|
| UE-4 | Gallery gate, tests first (R4): denied `#/gallery` follows the normal trip/wipe resolution (Study if nothing is active), unless dev (UF-11's `isDevEnabled`: `import.meta.env.DEV` or `?dev`); `#/lab` always opens; `resolveScreen` takes an explicit `dev` input with the adapter default (the edit's owner is this task) | S | `dev-gate.test.ts` passes (dev on/off for gallery incl. with a trip active and with a wipe active, `lab` opens in both, other screens unaffected); a **production build** with and without the supported dev flag: direct `#/gallery` and `#/lab` hashes and the ⋯ menu rows (Gallery hidden when not dev, Lab always shown) checked in a browser |
| UE-5 | Lab to the system look: `AppHeader world="system"` (`variant` 56), tabs Play/Board/Lattices, scenario picker, board in its zero-art placeholder rendering (API pinned with FT, §4), tool panels sized to content, End turn the one primary | M | fixture `lab-play`, `lab-board`, `lab-lattices` at 375×812 with a colour and greyscale pair (fight board); same scenarios run; `tests/app/lab*.test.ts` green; **the save is byte-identical after an ordinary Lab play session** (the existing dev-only open-all action intentionally writes the profile and is excluded) |
| UE-6 | Gallery: section chips (visible 40 px, **44 px hit boxes**), 3-column grid, UF-6's tokens and UF-7's art pages kept, shared pieces, district boards from `DISTRICT_REVIEW_BOARDS`, an index of every fixture in UF's fixture list (C8), greyscale toggle kept, "Open the Lab" primary | M | each section opens at 375×812; greyscale toggle works on district boards; `tests/ui/fixtures.test.ts` green |

### Pack C: Larger screens (BL-73) (Default; UI; depends on: UF-13 and UH-13 merged (R1 order for `src/app/App.svelte`); Packs A and B optional)
Owns: `src/app/App.svelte` (shell wrapper, styles, imports and caller wiring only; the wrapper must contain UH-13's `TransitionLayer`), `src/app/shell.ts`, `src/ui/components/shell/OrientationHint.svelte`, `tests/app/shell.test.ts`.
Pattern: `App.svelte` today.

| ID | Goal | Size | Done when |
|---|---|---|---|
| UE-7 | `shellMode` pure function, tests first (phone < 600; column ≥ 600; `hint` on landscape < 500 high) | S | `shell.test.ts` passes: 375×812, 430×932, 599×800, 600×800, 768×1024, 1024×768, 1440×900, 812×375 (phone + hint) |
| UE-8 | Centred column wrapper with `contain: layout` and shadow (contains `TransitionLayer`); a dismissible inline orientation hint (session only, never blocking); App.svelte imports and caller wiring in the R1 order after UH-13 | M | at 768×1024, 1024×768 and 1440×900 Study, Map (node/art registration), Fight (44 px board hits), Loot, Codex, Handover, Credits (last line and Skip inside the cap), the household sheet, a toast and a going-out transition fill the column, sheets and toasts stay inside it; 375×812 pixel-identical to the deterministic pre-wrapper capture; 599/600 px boundary; 812×375 shows the hint and the app is playable before and after dismissing |
| UE-9 | **Probe the column itself** (a throwaway wrapper, before UE-8) and record desktop input: mouse long-press, wheel, single-pointer drag on the lattice, board taps, sheet dismiss; containment of household sheet, toast, transition, map registration and 44 px board hits | S | findings table appended to `docs/design/ux-polish.md` §7 (owner: orchestrator merges), observed mouse behaviour recorded, no gesture code changed |

UE-9 runs first within the pack (it settles the containment risk); order UE-7 → UE-9 (probe) → UE-8.

### Pack Z: Close (orchestrator; staged, one row per stage so the ledger sees each; depends on: every program plan merged)
| ID | Goal | Size | Done when |
|---|---|---|---|
| UE-Z1 | Gates: `pnpm check` full (sims included), `pnpm art:check`, bundle and precache sizes against C5 (shipped bytes measured separately; Underjoin ink counted in the map total) | S | all green; budget table in the log |
| UE-Z2a | Dev-fixture loop, group 1 (home): Study, Codex, Bench, Desk, household sheet, quiet doorway, trip page, Drawing table, Handover, Credits, ⋯ menu | M | screenshots under `docs/plans/ux-program-evidence/close/`; no overlap, clipped text, sub-44 px target or missing zero-art fallback |
| UE-Z2b | Dev-fixture loop, group 2 (trip and fight): Map, set-out sheet, Threshold, Fight × nine districts (`fight-<DistrictId>`, plus `DISTRICT_REVIEW_BOARDS`, colour and greyscale), Loot, Crossroads, Cleared, Wiped with See it | L | same evidence rule; defects become fix tasks |
| UE-Z2c | Lab and Gallery (release build: Lab reachable; dev build: Gallery) and a **real route loop** (not fixtures) | M | Lab, Gallery, set-out, quiet doorway, household and See it all in the evidence |
| UE-Z3 | **Installed production offline reload with real saves** (separate from the dev fixture coverage): serve the production build, install, verify the service worker controls the page, go offline, reload every screen family with a real save, check shipped art and fonts load, and record the **deployed commit** | M | table of screen × offline result; service worker control, art and fonts confirmed; commit recorded |
| UE-Z4 | Code review per subsystem (UF tokens + common, FT board + battle, UH study + lattice presentation, UT map + trip, UD districts, UE ending + lab + gallery + shell, `src/app` presentation) | M | one `code-review` each, findings fixed or logged |
| UE-Z5 | **Legacy usage audit before deletion**: every use of the old tokens, `Button` and `BackLink` is listed; what is still used is migrated or kept; only then are unused ones deleted | S | audit table in the log; `pnpm check` green after deletion |
| UE-Z6 | Records: DESIGN §11 (including the **accepted redefinitions**: Threshold meaning, no ??? offers, wipe data in memory, map size, Lab visible, R17 pocket read-only, UE-D3 inline hint, gold only for verified firsts); ux-polish.md §0 and §5 outcomes and §7 verification results plus the desktop gaps; TECH §7 implementation decisions (fonts, art registry and budget, overlay-token test, shell column, dev gate, art metadata module, transition signal); ROADMAP and ROADMAP-done with precise dispositions: **BL-135** done for delivered scope; **BL-73** done (verification) with desktop gaps as new rows; **BL-100** redraw archived but its **invention name/art and shelf/geometry audit** stays active as a linked stable row; **residual BL-75** stays open; plan states `Built` only after the ledger lists no open **and no prose-only** tasks; the stale-`Drafted` grep is **scoped to the program files** (`docs/plans/ux-*.md`, `docs/design/ux-polish.md`) | M | `git grep` over those files shows no stale "Drafted"; roadmap IDs unchanged; ledger clean |
| UE-G1 | Whole-game look playtest by the player (= UX-G3) on the deployed build after CI is green | gate | player returns feel/UX notes; does not block merge, feeds a follow-up list; nothing balance-related is tuned |

## 6. Verification

- Tests (Vitest is node-only: pure logic only; actual taps and navigation are a browser sequence): `dev-gate.test.ts`, `shell.test.ts`, existing pure profile/ending tests plus `handover-profile.test.ts` and `credits-seen.test.ts` over pure functions, existing `tests/app/drawing*.test.ts`, `tests/ending/*`, `tests/ui/fixtures.test.ts` unchanged.
- Phone states (375×812, zero art, then with UA scenes): see each Done-when; **phone check** on UE-3 (tap-pause) and UE-8 (orientation hint). Fixture ids are UF's list only; fixtures lose their memory backend on refresh, so reload checks use a persisted test save in an isolated browser. Ports: UE packs use **5195–5196** (UH 5191–5192, UT 5193–5194). Lab/Gallery boards are fight boards: colour/greyscale pairs, intent/target outlines inspected over figures, zero-art check, no tint or dim filter on a parent of the overlay.
- Larger screens (UE-8): 768×1024, 1024×768, 1440×900, 812×375, and the 599/600 boundary, on the screens listed in UE-8, probed first with UE-9.
- Only at Close: installed production offline run (UE-Z3), loops, review per subsystem, legacy audit, record rows, UX-G3.

## 7. Open questions

0. Player: is a landscape hint wanted at all? Default: a dismissible inline hint, never a gate.
1. Scale the column up on tablets with CSS `zoom` (default: no, a 480 px column on a dark page).
2. Column height cap 1000 px (default yes; taller iPads get dark bands top and bottom).
3. Does the owner want Credits' roll to loop on a long pause (default: no, stops at the end with the primary).

## 8. Execution notes

Critical path: UF + FT + UH + UT + UD merged → Packs A, B (parallel) → C → Z → UE-G1. About 16 tasks (≈ 2 M packs of three, one S/M pack, one orchestrator pack of one L). Briefs: [ux-ending-briefs.md](ux-ending-briefs.md).

## Review resolution (review 3, ending side)

7. **Ending ownership, guards, checks:** Pack A owns `handover-profile.test.ts` and `credits-seen.test.ts` (pure tests plus a browser tap sequence, since Vitest is node-only); Handover fires once on the last action; Credits seen on end, Skip and unmount (reduced motion, history back), Skip returns to the opener; dev input is an explicit `resolveScreen` adapter owned by UE-4; denied Gallery follows normal trip/wipe resolution, Lab reachable in release; production-build hash and menu checks with and without the dev flag; "byte-identical" scoped to ordinary Lab play; Lab placeholder-board API pinned with FT (§4); grant order recorded (App UF-13 → UH-13 → UE-8 incl. imports and caller wiring; flow UT-2 → UE-4; Gallery UF-6/7 → UD-3 → UE-6).
8. **Close:** staged rows UE-Z1…Z6 (Z2 split in three, offline production run separate from dev fixtures, legacy token/Button/BackLink audit before deletion, Lab/Gallery/set-out/doorway/household/See it in evidence); records list the accepted redefinitions, ux-polish §0/§5/§7, TECH §7, precise BL-135/BL-73/BL-100/BL-75 dispositions (BL-100 invention/shelf audit kept as a linked row, residual BL-75 open); Drafted grep scoped to program files; Built only after open and prose-only lists are clear.
6. **Acceptance states (UE side):** UF ids only; Lab and Gallery boards get colour/greyscale pairs; reload checks use a persisted save.
Should-fix: UE-1 uses `AppHeader.variant`; ports 5195–5196; the column is probed before it is built (UE-D1/UE-9) with measurements in the same column at three sizes, Credits cap, 599/600 and short landscape; deterministic pre-wrapper screenshot; UE-6 chips get 44 px hit boxes; Pack A starts on its listed providers.
UE-D3 changed after review: no blocking rotate gate, only a dismissible inline hint (`shellMode` now returns `{ mode, hint }`).
