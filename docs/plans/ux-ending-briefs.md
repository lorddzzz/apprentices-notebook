# UX ending: briefs (ready to spawn)

Plan: [ux-ending-plan.md](ux-ending-plan.md). Spawn format: [templates.md](../../.claude/skills/implement/templates.md). Paste a brief's text into the prompt; delete it when its pack merges. All Claude, Default role (Sonnet 5.5 high, `pack-worker`). Pack Z is the orchestrator's. Review 3 resolutions are copied into the briefs. Dev ports for UE: **5195–5196** (UH 5191–5192, UT 5193–5194). Fixture ids are UF's only. Vitest is node-only: test pure logic in Vitest and exercise actual taps and navigation in a browser sequence; reload checks use a persisted test save in an isolated browser (fixtures lose their memory backend on refresh). Grant and merge order is recorded in the status file: App.svelte UF-13 → UH-13 → UE-8; flow.ts UT-2 → UE-4; Gallery UF-6/UF-7 → UD-3 → UE-6.

## Pack A: Ending screens

```
Pack A of docs/plans/ux-ending-plan.md: tasks UE-1 → UE-2 → UE-3.
Base commit: <main at spawn>. Budget: 90 min pack, 30 min per command.

Depends on: UF-8…UF-10, UF-14, UH-0, FT-4 (crestFor); may start on these providers without waiting for all districts. Read: plan §1, §2 (1–7 as they touch these screens), §3; board frames "Ending 1–3" (docs/plans/ux-board-snapshot.txt lines 198–218); pattern: src/ui/screens/Study.svelte.
Own: src/ui/screens/DrawingTable.svelte, Handover.svelte, Credits.svelte; src/ui/components/drawing/*; src/ui/components/ending/* (new); tests/ui/handover-profile.test.ts and tests/ui/credits-seen.test.ts (new, granted).
Contract (on main):
- C1: root of each screen has `data-world="home"`; tokens only, no new hex literals; `--overlay-*` untouched.
- C7: use `AppHeader` (Drawing table: via UH-0's `HomeStrip`, `AppHeader` `variant='subroom'` (64), back to Desk, title, strip `scenes/home/drawing-table-strip`; Handover: no header, only the ⋯; Credits: none until the end), `ActionButton` (one primary per screen), `Card` (letter card), `Sheet` as is. Never hand-roll these.
- C2: `<ArtImage id="scenes/home/drawing-table-strip" …>` (UA-27, 750×128) and `scenes/home/handover` (UA-27, 750×1624) with fallbacks (a night wash and lamp glow); Credits reuses the Handover scene with `filter: brightness(.45)`. Zero art must render correctly. Household chips use `portraits/shared/<id>` and `portraits/shared/owner` (R14: 9 + the owner).
- District crests in Credits: `crestFor(id)` from `$ui/districts` (FT-4; UD-5…UD-15 supply the crests), 96×96; a plain disc until UD has merged.
- Behaviour frozen: copy, drawing rules, `saveDraft`, `handover`, `seeCredits` timing, `lastPageAction`, route flow. Credits: tap pauses and resumes the roll (a swipe is distinguished from a tap and never toggles it), swipe scrolls, reduced motion = static scrollable list; "seen" fires exactly once on end, on Skip **and on unmount** (including reduced motion and history back); Skip returns to the opener (Study or Codex, wherever it was opened from); the last line and Skip stay inside the 1000 px column cap (Credits uses viewport-relative padding/translation today). Handover fires once, on the last action only.
Owed by this pack: Drawing table, Handover, Credits restyled to the system.

Done when:
- UE-1: fixtures `drawing-blank` and `drawing-two-inked` (UF-14; create your own saves only if absent) at 375×812: header 64, page ~420, tabs 44 (inked vs pencilled), pen pot + groups on one row, rooms strip, every target ≥ 44; `tests/app/drawing*.test.ts` unchanged and passing.
- UE-2: fixture `handover-ready`, first and last page; no art = readable; test `tests/ui/handover-profile.test.ts` (node-only, over the pure page-action and profile functions, plus the existing `tests/ending/*`) shows the profile after the same actions equals main's; a browser sequence on the phone covers the real taps and that Handover fires once on the last action.
- UE-3: fixture `credits-full`: roll runs, tap pauses/resumes, swipe scrolls, end shows "Back to the study"; test `tests/ui/credits-seen.test.ts` (pure logic): seen fires on end, on skip and on unmount; browser sequence: reduced motion, history back, Skip back to the opener (also from Codex), last line and Skip visible inside the height cap.

Verify: `pnpm exec vitest run tests/ui tests/app/drawing tests/ending --reporter=dot && pnpm exec tsc --noEmit`; run the Svelte autofixer on every changed component.
Phone check: yes, port 5195, for UE-3 (tap-pause); screenshots in docs/plans/ux-ending-evidence/.
```

## Pack B: Lab, Gallery, dev gate

```
Pack B of docs/plans/ux-ending-plan.md: tasks UE-4 → UE-5 → UE-6.
Base commit: <main at spawn>. Budget: 90 min pack, 30 min per command.

Depends on: UF-6, UF-7, UF-8…UF-12, UF-15, FT-8, UD-3 (Gallery order UF-6/UF-7 → UD-3 → UE-6); UT-2 merged first (it also edits flow.ts, R1: UT-2 → UE-4). The Lab placeholder-board API is pinned with FT before UE-5 (see Contract). Read: plan §2 (4, 6), §3; board "OUTSIDE THE FICTION" (snapshot lines 362–390); pattern: src/ui/screens/Lab.svelte (as is).
Own: src/ui/screens/Lab.svelte, Gallery.svelte, galleryFixtures.ts, galleryTricks.ts; src/ui/components/lab/*; src/app/flow.ts (the resolveScreen guard only); tests/app/dev-gate.test.ts (new).
Contract (on main):
- C1: roots carry `data-world="system"`: no scene, no art, vector icons only.
- C7: `AppHeader` (system, 56: back, title, ⋯), `ActionButton`, `Sheet`, `MenuSheet` rows from UF-12 (Lab row always; Gallery row only when UF-11's `isDevEnabled` is true).
- Gate (program R4; Redefines the board's "dev builds only" for the Lab): the Lab is visible in release builds (reachable by direct hash and by the ⋯ row); the Gallery is dev only = `isDevEnabled` (UF-11: `import.meta.env.DEV` or `?dev`). Add `isDevScreenAllowed(screen, dev): boolean` and give `resolveScreen` an optional explicit `dev` input whose default is an adapter that reads `isDevEnabled(import.meta.env.DEV, search)` (so the App.svelte caller needs no change and tests pass `dev` directly; you own this edit). When `dev` is false, a `gallery` request **follows the normal resolution** (an active trip or wipe screen, else the Study), it is not an unconditional redirect to the Study; `lab` always resolves to the Lab. Lab-internal dev tools stay behind `?dev` as `Lab.svelte`'s `devTools` reads today. Keep the lazy `import()` of both screens in App.svelte (do not edit App.svelte).
- Lab uses the real `BattleBoard` / `BattleView` in the zero-art placeholder rendering. FT-8's brief promises markers and beats, not an explicit placeholder mode: read FT's props on main first; if no mode exists, use the plain zero-art board and report an Owed item to FT (never edit components/board/*). An ordinary Lab session never writes the save or a trip (the existing dev-only open-all action intentionally writes the profile and is excluded).
- Gallery: section chips (40 px visible, 44 px hit boxes), 3-column fixture grid, UF-6's tokens page and UF-7's art page kept (restyle chrome only), shared pieces, a Districts section iterating `DISTRICT_REVIEW_BOARDS` (UD-3), an index linking every fixture in UF's fixture list (C8), the greyscale toggle (UF-6) kept, "Open the Lab" primary.
Owed by this pack: Gallery gate, Lab and Gallery in the system look.

Done when:
- UE-4 (tests first): dev-gate.test.ts passes for dev on/off × gallery (denied when off, resolving to the active trip/wipe screen or else the Study), lab (opens in both) and study, other screens unaffected; then on a **production build** with and without the supported dev flag, direct `#/gallery` and `#/lab` hashes and the menu rows are checked in a browser.
- UE-5: fixtures `lab-play`, `lab-board`, `lab-lattices` at 375×812 (colour and greyscale pair, intent/target outlines inspected over figures, zero-art check, no tint or dim filter on a parent of the overlay); End turn is the one primary; an ordinary Lab play session leaves `game.save` byte-identical; `tests/app/lab*.test.ts` and `tests/scenarios` unchanged and green.
- UE-6: each Gallery section opens at 375×812; greyscale toggle works on district boards; `tests/ui/fixtures.test.ts` green.

Verify: `pnpm exec vitest run tests/app tests/ui --reporter=dot && pnpm exec tsc --noEmit`; Svelte autofixer on changed components.
Phone check: no (the orchestrator checks these screens at wave end, at 5196 if a server is needed).
```

## Pack C: Larger screens (BL-73)

```
Pack C of docs/plans/ux-ending-plan.md: tasks UE-7 → UE-9 (probe) → UE-8.
Base commit: <main at spawn; UF-13 and UH-13's App.svelte changes merged (R1 order)>. Budget: 75 min pack, 30 min per command.

Before anything: capture a deterministic pre-wrapper 375×812 phone screenshot (fonts ready, motion settled) for the pixel-identical check.
Read: plan §2 (1–3), §3 (BL-73 risk); src/app/App.svelte; pattern: tests/ui/geometry.test.ts for a pure-function test.
Own: src/app/App.svelte (shell wrapper, its styles, imports and caller wiring only), src/app/shell.ts (new), src/ui/components/shell/OrientationHint.svelte (new), tests/app/shell.test.ts (new).
Contract (on main):
- Decision (Proposal 1–2): width < 600 → 'phone' (nothing changes, 375×812 pixel-identical); ≥ 600 → 'column': a wrapper `min(100%, 480px)` × `min(100%, 1000px)`, centred on the existing ink page background, faint shadow, `contain: layout` so `position: fixed` descendants (HouseholdShelf), sheets and UH-13's TransitionLayer stay in the column; landscape with height < 500 → still 'phone' but `hint` true: a **dismissible inline hint** "Hold the notebook upright" with an × (session only, not saved); **never a blocking gate**, the app is playable before and after dismissing.
- `shellMode(width: number, height: number): { mode: 'phone' | 'column'; hint: boolean }`, pure, no DOM. No edits to any screen, to theme.css, to UH's HouseholdShelf, or to gestures.
- Safe-area padding (`--safe-*`) stays on `main`.
Owed by this pack: the shell and shellMode; findings table for desktop input (report only).

Done when:
- UE-7: shell.test.ts passes for 375×812, 430×932, 599×800, 600×800, 768×1024, 1024×768, 1440×900, 812×375 (phone with hint).
- UE-9 (probe **the column itself**, before UE-8; use a throwaway wrapper, since a pre-wrapper report cannot establish containment): in the same column at 768×1024, 1024×768 and 1440×900 measure the household sheet, a toast, a going-out transition plate, the map's node/art registration and 44 px board hit boxes; report a table of what works and breaks with a mouse using the live Study, a fixture fight and a sheet: long-press, single-pointer lattice drag (the lattice has no two-finger pan: a second pointer cancels), wheel, board taps, sheet dismiss. Record observed behaviour. No gesture code changed.
- UE-8: screenshots at 768×1024, 1024×768, 1440×900 of Study, Map, Fight, Loot, Codex, Handover, Credits (last line and Skip inside the height cap), the open household sheet, a toast and a going-out transition: column centred, sheets and toasts inside it; 599 and 600 px boundary; 375×812 identical to the pre-wrapper capture; 812×375 shows the dismissible hint, the app is usable before dismissing, and the hint stays dismissed.

Verify: `pnpm exec vitest run tests/app/shell.test.ts --reporter=dot && pnpm exec tsc --noEmit`; Svelte autofixer on App.svelte and OrientationHint.
Phone check: yes, port 5196 (orientation hint at 812×375; unchanged 375×812).
```

## Pack Z: Close (orchestrator, not spawned; staged, one stage per ledger row UE-Z1…UE-Z6, UE-G1 in the plan)

1. **UE-Z1:** `pnpm check` (sims included), `pnpm art:check`, shipped bytes per scope vs C5 measured separately, Underjoin ink counted in the map total.
2. **UE-Z2a/b/c:** dev-fixture loops at 375×812 in three groups (home; trip and fight incl. `fight-<DistrictId>` × nine, `DISTRICT_REVIEW_BOARDS`, greyscale via `&grey=1`; Lab, Gallery and a real route loop), evidence under `docs/plans/ux-program-evidence/close/`, including Lab, Gallery, set-out, quiet doorway, household and See it.
3. **UE-Z3:** installed production offline reload with real saves, separate from the dev fixtures: service-worker control, shipped art and fonts, deployed commit recorded.
4. **UE-Z4:** `code-review` per subsystem; fix or log each finding.
5. **UE-Z5:** legacy usage audit (old tokens, `Button`, `BackLink`) before any deletion.
6. **UE-Z6:** records: DESIGN.md §11 (accepted redefinitions), ux-polish.md §0/§5 outcomes and §7 verification and desktop gaps, TECH.md §7, ROADMAP and ROADMAP-done with BL-135 / BL-73 done for delivered scope, BL-100 redraw archived but its invention name/art and shelf/geometry audit kept as a linked row, residual BL-75 left open, desktop gaps as new rows; plan `State: Built` only when the ledger shows no open and no prose-only tasks; stale-"Drafted" grep scoped to program files; ledger script clean.
7. **UE-G1 (= UX-G3):** give the player the deployed URL after CI is green, with the evidence set; collect look/UX notes; nothing blocks.
