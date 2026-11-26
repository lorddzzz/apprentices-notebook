# UX home (UH) briefs

Plan: [ux-home-plan.md](ux-home-plan.md). One spawn prompt per pack (format: `.claude/skills/implement/templates.md`). Paste the text of the block into the `pack-worker` prompt. Common to all: placeholder first (C2: every screen renders with zero art), no mono in player UI (C1), rules/content/save frozen, `src/engine` read-only, run the Svelte autofixer on every changed component, no balance tuning. Test ids already in use stay.

Run order: Pack 0 first; then B and A (B first: FT waits on UH-3, which is published early on its own), C, D, E, F beside them (two or three at a time). Ports: UH phone packs use **5191–5192 only** (A 5191, B 5192; C takes 5191 and F takes 5192 after those finish; never more than two at once). Fixture ids are UF's only; a state in a transient store (`game.wipe`, `game.found`, `threshold.solved`) needs a UF recipe named in the status Owed list. Review 3 resolutions are copied into the briefs below.

## Pack 0: Home kit

```
Pack 0 of docs/plans/ux-home-plan.md: tasks UH-0.
Base commit: <main at spawn>. Budget: 45 min pack, 30 min per command.

Depends on: UF-1…UF-4 and UF-8 (AppHeader). Read: plan §2 (UH-D3), §4 (Provides); ux-program.md C1, C2, C7; pattern: UF's AppHeader and ArtImage in src/ui/components/common/ and src/ui/art/.
Own: src/ui/components/home/HomeStrip.svelte, src/ui/components/home/RoomObject.svelte.
Contract (on main, from UF-1…UF-4 and UF-8):
- C2: `<ArtImage id fallback>`; every screen must render with zero art.
- C7: AppHeader (world, title, back or crest, subtitle, right slot, ⋯ last); screens never hand-roll shared pieces.
- C1: tokens `--font-script`, `.label` small caps, `data-world="home"`, `--tap: 44px`.
Define (Wave 0 style, no behaviour change to any screen):
- HomeStrip props: `strip: ArtId`, `title`, `back?: { to: Route; label: string }`, `right?: Snippet`, `fallback?: Snippet`; renders an AppHeader (world home) and passes `strip` to its `strip` prop (UF-8); the height comes from UF's `AppHeader.variant` (`'study'` 88 for the Study, `'subroom'` 64 for Codex/Bench/Desk/Drawing table), never inferred from the strip id; the zero-art fallback is the flat home-world colour (the Study's richer fallback is `StudyScene`, owned by Pack A: one owner of fallback chrome per screen). Consumers: UH-1, UH-8…UH-10 and UE-1.
- RoomObject props: `art: ArtId`, `label`, `onclick`, `lit?: boolean`, `fallback: Snippet` (glyph); ≥44 px hit area, ivory edge, small-caps label pill above, one shared action cue (the sparkle dots of study-v2.png); `data-testid` passthrough; a `hidden` mode that keeps the footprint (empty slot) so a locked object does not shift the layout.
- No transition.ts stub and no `it.todo` list: Pack F writes the failing tests with UH-12.
Report the public interfaces, the invariants, the integration risks, and anything declared that later tasks must fill (Owed list).
Owed by this pack: nothing.

Done when:
- UH-0: tsc passes; a throwaway fixture (not committed) shows RoomObject with and without art, and hidden with its footprint kept, at 375×812.

Verify: `pnpm exec tsc --noEmit`
Phone check: no (the orchestrator checks this wave's screens)
```

## Pack A: Study shell

```
Pack A of docs/plans/ux-home-plan.md: tasks UH-1 → UH-2.
Base commit: <main at spawn>. Budget: 90 min pack, 30 min per command.

Depends on: UH-0; UF-8; UH-2 also UF-12 (MenuSheet). Read: plan §2 (UH-D1, D2, D3, D5), §3 risks 2; docs/design/art-studies/study-v2.png; pattern: src/ui/components/study/StudyScene.svelte and Study.svelte today.
Own: src/ui/screens/Study.svelte, src/ui/components/study/AtticHeader.svelte, Door.svelte, StudyScene.svelte (reduce to the zero-art fallback of the strip).
Contract (on main):
- Pack 0: HomeStrip, RoomObject (components/home/); UF: AppHeader, ActionButton (one primary per screen), MenuSheet, ArtImage.
- Header is 88 px (R12: strip art `scenes/home/attic-header-night` is 750×224, anchored at its **top** (`object-position: top`): the top 176 px is the header; the lower 48 px (24 CSS px) is bleed that **`AtticHeader` itself paints** as a pointer-transparent layer behind the seat tabs, with the flat home colour in the zero-art fallback); objects: Codex always, Bench only when `benchUnlocked(profile)`, Desk only when `deskUnlocked(profile)`; ⋯ is always last. Test ids `codex-button`, `bench-button`, `desk-button`, `menu-button`, `door`, `field-done`, `field-header`, `rumour-line` keep working.
- Layout budget (UH-D2, flexible): header 88 and seat tabs 44 never compress; the page gets what is left; on short phones the drawer ends shrink, the spell strip collapses to one line and the door becomes a 52 px bar; the door's slot is reserved when hidden (drawer open) and Done takes the same footprint in doorway mode. Hidden Bench/Desk objects keep their footprint. Painted and fallback screens apply identical gates. Room objects are three independent ≥ 44×44 hotspots over book, jars, desk (no whole-strip target); the fallback shows exactly one control per door. Do not change LatticeEditor props (Pack B owns lattice/*); keep passing `household`, `fair`, `bind:drawerUp`.
- Art ids (all optional, fallback required; exactly UA's): scenes/home/attic-header-night, props/home/{book,jar,desk}, ui-plates/home/door-plate.
- Doorway mode: the field header ("A quiet doorway", Codex pill) uses the same header slots; Done replaces the door and shows `doneCaption`.
- The ⋯ panel (copy/paste/reset) is removed; the header's ⋯ opens UF-12's MenuSheet (R4: Settings, Install to the Home Screen, About, Copy save, Paste save, Start a new notebook, the Lab, the Gallery in dev).
Owed by this pack: nothing. Owed to this pack: UF-12; if it is not on main, keep the panel and report.

Done when:
- UH-1: fixtures study-fresh, study-three-seats, study-doorway, study-unlocked: header 88 px, strip top-aligned with the 24 px bleed behind the tabs, only unlocked objects shown (same in painted and fallback), every target ≥44×44 by measurement, one control per door in the fallback, rumour line visible as a paper note, no mono.
- UH-2: fixtures study-trip-out, study-first-evening, study-doorway, fair-copy, glyph-settings, glyph-ranking, glyph-profiler, glyph-revision (UF recipes; request them via the Owed list if missing): door caption shows the blocker when blocked; FirstEvening, NoteUnderDoor, WelcomeSheet, Glyph sheets, Fair copy sheet keep their place; tests/app/study.test.ts unchanged and green.
- Merged with Pack B (orchestrator or the later pack): the UH-D2 measurement at 375×812 and 375×667 with 44/34 px insets, painted vs fallback, three objects unlocked, menu closed, a rumour showing.

Verify: `pnpm vitest run tests/app/study.test.ts tests/app/flow.test.ts --reporter=dot && pnpm exec tsc --noEmit`
Phone check: yes, port 5191 (375×812 and 375×667 screenshots of each fixture; paper rectangle measured)
```

## Pack B: Page and drawer

```
Pack B of docs/plans/ux-home-plan.md: tasks UH-3 → UH-4 → UH-5.
Base commit: <main at spawn>. Budget: 100 min pack, 30 min per command.

Depends on: UH-0. FT-25 waits for UH-3 (R3): publish UH-3 first and early, independent of Pack A's painted shell (merge it before FT-25 starts). Read: plan §2 (UH-D2, D4, D12), §3 risks 1; study-v2.png; pattern: the `household` branch of src/ui/components/lattice/LatticeEditor.svelte, RuneShelf.svelte (`drawer`, `up`), LatticeViewport.svelte (`floating`, `controls`).
Own: src/ui/components/lattice/* (presentation only).
Contract (on main):
- Editing gestures and rules do not change, and are frozen **as built** (src/ui/attach/latticePan.ts): tap a socket, hold/lift, Erase, **single-pointer drag pans and a second pointer cancels it (there is no two-finger pan)**, cancellation, Fit, tap-region, Edit scale, `PAPER.editPitch` 60. Exercise each on the phone and report unchanged ink, orientation and viewport outcomes. Tests tests/app/latticeViewport.test.ts, shelf.test.ts, faircopy.test.ts stay green unchanged.
- New look only when `household` is set (Study); the Lab call keeps its look.
- Add optional `readonly?: boolean`: hides RuneShelf, drawer, Fair copy and the ink-spend; pass it **through Editor → Grid → Viewport** so socket tap, hold/lift and keyboard activation all do nothing; page, seat tabs, spell strip, pan, Fit and scale stay. The pocket uses its own view memory key (separate `sessionKey`) so it never moves the Study's view. FT-25's pocket notebook consumes it (R3), so its prop name and meaning are fixed; FT pins the button/sheet props, party/log sources and mount sites.
- Drawer (UH-D4): fixed painted tabs row (Runes / Inventions / Glyphs, small caps) and ends; the middle expands upward as an overlay over the strip and the page's lower edge; the page container must not resize, so closing returns to the same view (`rememberView` untouched). Picking a rune closes it and shows the rune in hand in the strip.
- Art ids (optional, UA's): ui-plates/home/{paper-tile,page-frame,wood-tile,drawer-top,drawer-mid,drawer-bottom,spell-strip,seat-tab,rune-card}.
- Keep every existing data-testid (`editor`, `info`, `drawer-pull`, `tab-runes`, `tab-inventions`, `tab-glyphs`, `shelf`, `fair-info`).
Owed by this pack: LatticeEditor `readonly` (needed by FT-25) — merge UH-3 first.

Done when:
- UH-3: on merged A + B (or A's fallback header until A merges), study-three-seats and study-unlocked at 375×812 show 5 columns × 5 **fully visible, unobscured** sockets at edit scale (controls, labels, borders allowed for), at 375×667 5 × 4, with 44/34 px insets; ink pot, Fit, Fair copy float on the paper; rune name under each rune; pocket-readonly ignores tap, hold/lift and keyboard activation but allows seat switch and pan.
- UH-4: seat tabs (token, name, HP · move, dashed visiting and Empty, `+N`) ≥44 px; tapping switches pages; `+N` calls `household.onmore`.
- UH-5: pan the page, open the drawer, pick a rune: the paper rectangle and view transform are identical before, during and after expansion, selection and dismissal; seven roles, Erase, Inventions, Glyphs all reachable; spell strip shows "Bolt → Oil → Spark" as a ribbon.

Verify: `pnpm vitest run tests/app/latticeViewport.test.ts tests/app/shelf.test.ts tests/app/faircopy.test.ts --reporter=dot && pnpm exec tsc --noEmit`
Phone check: yes, port 5192 (375×812 and 375×667; painted and fallback)
```

## Pack C: Household and Study sheets

```
Pack C of docs/plans/ux-home-plan.md: tasks UH-6 → UH-7.
Base commit: <main at spawn>. Budget: 90 min pack, 30 min per command.

Depends on: UH-0; UF-8…UF-10 (Card, Unseen, Sheet). Read: plan §3 risks 5; board frame "Household sheet" (docs/plans/ux-board-snapshot.txt, search l6-hh-n); pattern: UF Sheet, Card, Unseen; today's HouseholdShelf.svelte.
Own: src/ui/components/study/{HouseholdShelf,SeatCard,ApprenticeFull,drag.svelte.ts,FirstEvening,FairCopySheet,GlyphSheet,GlyphRanking,GlyphSettings,GlyphProfiler,RevisionEditor}.svelte/.ts. Component props and callbacks stay identical (Study.svelte, Pack A, passes them).
Contract (on main):
- Sheet ~86 % tall, Study visible above; top: three trip seats as portrait cards; below: At home, 3 per row, scrolls; tap a card shows the detail strip (lean, action, habit) with *Open page* as the one primary; empty slot = `Unseen` card.
- Drag a card onto a seat to bring in, drag a seat down to send home; locked while a trip is out (`TRIP_LOCK`); long-press arms drag as built.
- Portraits: `ArtImage` id `portraits/shared/<apprenticeId>` (shown 96 px; detail strip may use `portraits/shared/<apprenticeId>-card`, 222×330; owner = `portraits/shared/owner`, only after the handover, R14), fallback `ApprenticeToken`.
Owed by this pack: nothing.

Done when:
- UH-6: fixtures study-three-seats and household-full (9 apprentices): both rows visible; trip-out locks drag; long-press drag arms.
- UH-7: GlyphSheet, GlyphRanking, RevisionEditor, FairCopySheet, FirstEvening each open from their fixture and read at 375×812, no mono.

Verify: `pnpm vitest run tests/app/study.test.ts tests/app/ranking.test.ts tests/app/revision.test.ts --reporter=dot && pnpm exec tsc --noEmit`
Phone check: yes, port 5191 (household sheet drag; start after Pack A's phone check, or use 5192 if B is done)
```

## Pack D: Codex and Desk

```
Pack D of docs/plans/ux-home-plan.md: tasks UH-8 → UH-9.
Base commit: <main at spawn>. Budget: 90 min pack, 30 min per command.

Depends on: UH-0; UF-9 (Unseen). Read: plan §2 (UH-D11); board frames l6-cx-n and l6-dk-n in docs/plans/ux-board-snapshot.txt; pattern: Pack 0's HomeStrip and UF's Unseen.
Own: src/ui/screens/Codex.svelte, Desk.svelte, src/ui/components/codex/*, src/ui/components/desk/*, tests/ui/codex-tabs.test.ts.
Contract (on main):
- Header is HomeStrip (back = Study, or "Back to the road" from a trip as today; Codex stays reachable from trip screens). Header height 64; strip art ids scenes/home/codex-strip, scenes/home/desk-strip (750×128, UA-15; optional).
- Codex: tabs in small caps, one scroll row with edge fade, underline, no pills, no mono; one Unseen style (dashed frame, silhouette, ???); fine print and capstone as plain lines with n / m; owner's margin note on a paper strip in `--font-script`; "Next page ›" at the bottom (pure helper `nextTab(tabs, current)` returns the following tab or null on the last).
- Desk: points pot + filter row; rune rows 72 px with levels I–III as `Pips`; one row open at a time showing its margin columns (side-scroll if 3 columns do not fit 359 px); empty state = one voice line instead of blank space; *Write footnote* is the one primary. Footnote rules unchanged.
- Keep test ids (`codex-tab-*`, `codex-count`, `desk-empty`, `desk-stock`, `desk-group-*`, `desk-drawing-link`, `codex-replay-*`).
Owed by this pack: nothing.

Done when:
- UH-8: codex-early shows ??? entries in the Unseen style, no mono; tests `next page moves to the following tab and stops at the last` and tests/app/codex.test.ts pass.
- UH-9: desk-empty shows the voice line; desk-open-row and desk-expanded show three columns unclipped at 375 with the primary reachable; tests/app/desk.test.ts and desk-store.test.ts pass.

Verify: `pnpm vitest run tests/ui/codex-tabs.test.ts tests/app/codex.test.ts tests/app/desk.test.ts --reporter=dot && pnpm exec tsc --noEmit`
Phone check: no (the orchestrator checks this wave's screens)
```

## Pack E: Bench

```
Pack E of docs/plans/ux-home-plan.md: tasks UH-10 → UH-11.
Base commit: <main at spawn>. Budget: 90 min pack, 30 min per command.

Depends on: UH-0; UF-8; reads FT's components/board/art.ts read-only (FT-5…FT-7 may still edit it: rebase before merge). Read: plan §2 (UH-D10); board frame l6-bn-n in docs/plans/ux-board-snapshot.txt; pattern: today's src/ui/screens/Bench.svelte.
Own: src/ui/screens/Bench.svelte, src/ui/components/bench/* (new SubjectSwatches.svelte).
Contract (on main):
- Header HomeStrip (back = Study, or Codex when a page trial is open, as today); header height 64; strip art scenes/home/bench-strip (750×128, UA-15) optional.
- Method chips in one scroll row; grid 6×5 at 58 px (same cell size as the fight board) directly under the headline, no gap; Trial is the one primary at the bottom; Clear and Name and write secondary; parts / solvent strip opens PartSheet.
- Swatches show shape + letter, shapes read-only from FT's `components/board/art.ts`; do NOT edit `components/lab/Palette.svelte` or `components/board/*`.
- Methods, trial, parts, writing sheets and unlock gates stay as built; test ids keep.
Owed by this pack: nothing.

Done when:
- UH-10: bench-mid at 375×812: grid starts directly under the headline, Trial reachable by thumb; bench-page-trial: a held page uses its authored board at its own size (the ordinary Bench is 6×5), Back goes to Codex; colour and greyscale pair of the trial board (`&grey=1`); tests/app/bench*.test.ts green.
- UH-11: every subject swatch shows shape and letter; `git diff --stat` shows no change in components/lab/ or components/board/.

Verify: `pnpm vitest run tests/app/bench.test.ts tests/app/bench-page-trial.test.ts tests/app/bench-registry.test.ts --reporter=dot && pnpm exec tsc --noEmit`
Phone check: no (the orchestrator checks this wave's screens)
```

## Pack F: Homecoming and transitions

```
Pack F of docs/plans/ux-home-plan.md: tasks UH-12 → UH-13 → UH-14.
Base commit: <main at spawn>. Budget: 100 min pack, 30 min per command.

Depends on: UF-11 (Motion pref); UH-0 only for UH-13/14, not UH-12 (pure logic, start it early); UF-13 (the App.svelte grant comes after UF-13's stamp removal). Read: plan §2 (UH-D6, D7, D8, D9), §3 risks 3 and 4; board frames l6-hc-n and l6-th-n in docs/plans/ux-board-snapshot.txt; pattern: src/app/App.svelte (resolveScreen), TripPage.svelte today.
Own: src/app/transition.ts, tests/app/transition.test.ts, src/ui/screens/TripPage.svelte, src/ui/components/home/TransitionLayer.svelte, src/ui/components/home/Homecoming*.svelte.
Grant for UH-13 (R1 order: UF-13 → UH-13 → UE-8): you may edit src/app/App.svelte (one additive line mounting `<TransitionLayer screen={resolved.screen} />`), rebased on UF-13's version. Nothing else there; UE-8 wraps it afterwards. Do not edit game.svelte.ts, router.svelte.ts, flow.ts.
Contract (on main):
- C6: "Transitions (UH) and end-of-trip scenes (UT) use the same pref and the same skip rule." Motion pref `normal|quick` (`motionScale()`, UF-11) and the TS mirror of `--dur-*` come from UF.
- `transitionFor(prev: Screen | null, next: Screen, opts: { reduced; motion; deliberate })`: study→map = out; cleared|crossroads→tripPage = home at full lamp; wiped→tripPage = home, tone `low`; prev null (first mount, reload) = null; any other pair = null; `deliberate` false = null. **Deliberate** means a one-shot `navIntent` (`markNavigation(pair)` / `takeNavigation()` in transition.ts) set by the Study door handler and by the Home / Read the trip handlers of Cleared, Crossroads and Wiped (UT adds those calls; list them in Owed), consumed once by the watcher; **browser Forward/Back never plays** (default; player question). The watcher reads the **resolved** destination once after initialisation, cancels earlier timers on further navigation, and plays nothing on reload, redirect or a refused/denied navigation. ms: 1200 plate, 600 on quick, 300 fade when reduced. Crossroads' Go home calls `game.returnHome()` and lands on tripPage directly: that pair is covered.
- Layer: plate = `ArtImage` scenes/shared/transition-door (going out) and scenes/shared/transition-stair (coming home) (UA-16; fallback gradients: cold light from the door / warm lamp) + ui-plates/shared/rain-light; is **pointer-transparent** (`pointer-events: none`); the first pointer input anywhere dismisses it without cancelling that input, so the destination's first tap acts exactly once; unmounts on any further screen change and after `ms`; never delays the screen change (the save already holds it).
- Homecoming: scene scenes/home/homecoming (750×380, fallback gradient + coat/lamp vector) tinted by `[data-district]`; "Home from X." and deepest room; gold "A first for the notebook" bar with `discovery` lines only (verified firsts) revealed in turn (`--dur-quick` apart), tap shows all, reduced motion all at once; `proof` ("Nearly proven", possibly repeated across trips) and `chain` lines go in the plain ledger, never gold; district tint on the art plane only; ledger sized to content (hide when empty); owner's reply line in `--font-script`; *Back to the desk* (`back-to-desk`) is the one primary. Test ids `trip-page`, `highlights`, `tier-ups`, `terms`, `ledger`, `no-highlights`, `dead-note` keep.
Owed by this pack: nothing. Owed to this pack: UF-11 Motion pref reader; the App.svelte grant above. Fixtures for the Done-when (UF's ids; UF-14/UF-15 are explicit verification dependencies): study-three-seats (tap door → out), cleared-seam (tap return → home), crossroads-seam (tap return → home), wiped-seam (tap read-trip → low lamp; the wipe is the transient `game.wipe`, set by UT-2's `wipeFixture()`), homecoming-first, homecoming-quiet. The memory fixture loader replaces its URL and loses its backend on refresh, so reload checks use a persisted test save in an isolated browser profile.

Done when:
- UH-12 (write the failing tests first): tests named `a reload (no previous screen) never plays a transition`, `study to map plays going out`, `cleared to trip page plays coming home at full lamp`, `crossroads to trip page plays coming home at full lamp`, `a pair without the navigation signal (browser forward/back, redirect, refused go) plays nothing`, `a second navigation cancels the first plate's timers`, `wiped to trip page plays coming home at low lamp`, `other screen changes (map to study, study to codex, battle to loot) play nothing`, `reduced motion gives a 300 ms cross-fade`, `quick motion halves the plate time`, `no transition lasts longer than 1200 ms` pass.
- UH-13: from fixtures, going out and coming home (Cleared, Crossroads, Wiped) play and dismiss on first input; one tap on a real destination control during the plate acts exactly once (success routes, both Wiped exits, rapid Back, Quick, reduced motion); reload mid-scene (persisted test save, isolated browser) lands on the new screen with no plate; browser Forward to Map and Wiped → Read the trip by history replay play nothing; with reduced motion only a fade.
- UH-14: homecoming-first shows the gold lines in turn then all after a tap; a repeated-trip case shows *Nearly proven* in the ledger with no gold; homecoming-quiet has no empty box; tests/app/tripviews.test.ts and flow.test.ts unchanged and green.

Verify: `pnpm vitest run tests/app/transition.test.ts tests/app/tripviews.test.ts tests/app/flow.test.ts --reporter=dot && pnpm exec tsc --noEmit`
Phone check: yes, port 5192 (both transitions and the homecoming page; after Pack B's phone check)
```
