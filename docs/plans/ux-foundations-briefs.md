# UX foundations: pack briefs

Plan: [ux-foundations-plan.md](ux-foundations-plan.md). Program contracts: [ux-program.md](ux-program.md) §3. Spawn with the standing-rules preamble from `.claude/skills/implement/templates.md` (Claude packs: `pack-worker`). Delete a brief when its pack merges. No Codex art packs belong to UF (UA owns raster art); all packs here need the Svelte autofixer or the browser, so they run on Claude.

Common to every brief: Svelte 5 runes only; run `svelte-autofixer` on each new or changed component until clean; UI checks at 375×812 with a screenshot; `pnpm check:fast` before the last commit; no balance changes; engine untouched.

---

## Pack 0a: Tokens, stubs, motion signature (UF-1 → UF-3), role Strong (Opus high)

```
Pack 0a of docs/plans/ux-foundations-plan.md: tasks UF-1 → UF-3. Merge FIRST and alone; FT, UH and UT start when it merges.
Base commit: <main at spawn; verify the plan files exist at this SHA>. Budget: 90 min pack, 30 min per command.

Read: plan §2 (UF-P1..P4, P5, P9, P12a), §3, §4; src/ui/theme.css + common/Button.svelte.
Own: src/ui/theme.css; src/ui/components/common/{AppHeader,ActionButton,Card,Unseen,StepMarker,MenuSheet}.svelte; src/app/prefs.svelte.ts (stub); tests/ui/{tokens,stubs}.test.ts.

Contract (quoted from the program; do not redefine):
C1 Tokens: theme.css stays the one token file, in sections. Type: --font-serif, --font-script, --font-hand (alias of --font-script; two faces only, UF-P1); scale --type-xs|sm|md|lg|xl|title; utility class .label (small caps); --font-mono kept for dev pages. World palettes --home-*, --city-*; a screen declares data-world="home|city|system". District light: [data-world][data-district="<id>"] (no bare [data-district]) sets --district-dark|mid|light (ids = DISTRICT_IDS: seam #253235/#55625E/#BC9273, canals #172C39/#456675/#BC8A57, inkQuarter #272632/#656475/#A28D6D, bathhouses #25373B/#5F8482/#ACC7BE, bridges #252F39/#596D79/#ADBBBC, foundry #292A2A/#6F6956/#B19060, cartographers #28323A/#768890/#D5D7CC, lowerSeam #232D30/#535E59/#8F9280, inkedPage #373239/#867A72/#D9CDB5). Meaning colours identical everywhere: --danger, --gold (unique to firsts and discoveries), rune-role hues, apprentice hues. --overlay-* (danger, reach, preview, first, shield) only in :root; **--overlay-preview must NOT alias the amber --select selection colour** (check the current preview paint and alias that, or declare a distinct value; a test asserts it). Spacing 4/8/16/24/32, --tap 44px, --radius, --shadow-1|2, --dur-quick|base|held = 250/400/800 ms. Keep every legacy name as an alias and the .desk .editor skin rules untouched. Fonts: declare the stacks with system fallbacks now; Pack A adds the faces.
C7 stubs, frozen props after you render a Study header and a two-line fight header (plain look, tokens only):
 AppHeader {variant:'study'|'subroom'|'city'|'system' (88/64/56/56, R28; the fight's two-line header is city); title; subtitle?; status?: Snippet (second line, fight: name/HP/rule); back?:{label; to: Route}|{label; onback}; crest?: Snippet; strip?: ArtId; right?: Snippet}; every icon-only control takes an accessible name; (⋯ always last, opens MenuSheet); export a crestSnippet(id) adapter (disc fallback) so FT/UT can pass a component as a Snippet
 ActionButton {kind?:'primary'|'secondary'|'quiet'; danger?; disabled?; onclick; label?; testid?; children?}
 Card {tone?:'paper'|'plain'; children}; Unseen {shape?:'box'|'chip'|'silhouette'; label?}; StepMarker {n; gold?; size?:24|32}; MenuSheet {open; onclose}
 prefs.svelte.ts exports prefs {motion:'normal'|'quick'}, motionScale() (stub: 1, final signature) and a live reduced-motion getter prefs.reduced (reacts to OS preference changes), from this first stub.
Owed by this pack: public interfaces and invariants; the Owed list (plan §4); anything unbuildable in C1/C7 (say so).

Done when:
- UF-1: tests `tokens: every C1 name is declared`, `tokens: overlay tokens only in :root`, `tokens: --overlay-preview is not --select`, `tokens: one [data-world][data-district] block per DISTRICT_IDS id`, `tokens: no bare [data-district] selector`, `tokens: legacy names still resolve`; Study and Codex at 375x812 unchanged (screenshots).
- UF-3: the six stubs exist with the props above, autofixer clean, svelte-check clean; a render test imports each; a screenshot of a Study-style header and a two-line fight header; a test flips reduced motion and sees the getter change.

Verify: `pnpm vitest run tests/ui --reporter=dot`
Phone check: yes, port 5190
```

---

## Pack 0b: Art registry, metadata, art:check, precache (UF-2), role Strong (Opus high)

```
Pack 0b of docs/plans/ux-foundations-plan.md: task UF-2. Runs beside 0a/0c. Merges before UA Pack A's package.json edit.
Base commit: <main at spawn>. Budget: 120 min pack, 30 min per command.

Read: plan §2 (UF-P7, P8), §3, §4; ux-program.md C2/C3/C4/R10/R19/R25/R26/R27; src/data/enemies.ts ENEMY_IDS, src/data/rivals/*, src/data/types.ts LootSpec, the threshold specs under src/data/districts/*; package.json (check and check:fast are independent scripts; deploy CI runs check); vite.config.ts.
Own: src/ui/art/* (registry.ts, spec.ts, meta.ts, inventory.ts, ArtImage.svelte); scripts/art-check.ts; package.json (the art:check script, wired into BOTH `check` and `check:fast`; UA Pack A adds sharp, art:process, art:sheet and pnpm-lock.yaml afterwards by grant, R11); vite.config.ts (workbox globPatterns webp,woff2 + size cap + the metadata plugin only); tests/ui/{art-registry,art-check,art-inventory}.test.ts.

Contract:
C2 registry: assets at src/assets/art/<family>/<scope>/<subject>[-<state>].webp, discovered with import.meta.glob (eager, ?url, no hand list); artUrl(id): string|null, artIds(), artSize(id), artMeta(id) = { role, w, h, bytes, bbox?, slice? } built at build time from the sidecars (decoded size, bbox in 750x3800 master pixels top-left x/y/w/h, slice insets in source pixels); <ArtImage id fallback alt fit>. Prompts, references and masters NEVER enter the client bundle (a test greps the build). Zero art present: everything passes and renders.
C3 sidecar declares role + size; roles: tile-opaque (128², no real transparency), material-overlay-alpha (128², alpha), figure (128x176 alpha; sidecar declares the ground-contact point), boss-figure (192x256 alpha), portrait (192² opaque), card (222x330 opaque), strip (width 750 or declared, height free), scene (750xN, opaque), map-plate (750x3800), map-patch-with-bbox (alpha; bbox inside 750x3800; patch size = bbox size), nine-slice (alpha; slice insets inside the image). Rules are by role, NOT family: a family holds several roles. art:check decodes the file and fails on: missing sidecar, dimensions != sidecar or role rule, real transparency where the role is opaque, no real alpha where the role needs it, missing master record (accepted source path or archive hash, per the D4 pilot ruling; record the rule and make the check a switch), bbox/slice out of bounds, scope over budget. Prints per-scope totals (decimal MB, stated) against shared+home 4.5, each district 1.5, map 0.8, total 15; budgets over/under are tests. Optional --root for temp-dir tests.
Inventory (R27): src/ui/art/inventory.ts maps every ENEMY_IDS id (33), rival, boss, loot offer kind (rune, method, ink, solvent, vellum, doorway, key) and the real threshold locks (paint only those in the threshold specs) to an ArtId, a shared alias or an intentional vector fallback; borrowed foes in other districts and name conversions (deadLetter->dead-letter, chiefWarden->chief-warden, dissolvedBather->bather, barge drawn by canals CrateArt, clockSeal by inkQuarter StaffToken) are explicit entries. A test fails on an unmapped id. Never change game data.
Owed by this pack: report interfaces; the precache list of a build that includes one dropped asset of every role and one font; built install-size method.

Done when: tests (see plan UF-2) incl. valid and invalid example per role, empty tree, representative file drops (one of each role) BEFORE you declare C2 frozen; `pnpm art:check` in both check and check:fast; `pnpm build` precache includes a dropped webp and a woff2.
Verify: `pnpm vitest run tests/ui/art-registry.test.ts tests/ui/art-check.test.ts tests/ui/art-inventory.test.ts --reporter=dot && pnpm art:check`
Phone check: no
```

---

## Pack 0c: Fixture loader, one hard case (UF-4), role Strong (Opus high)

```
Pack 0c of docs/plans/ux-foundations-plan.md: task UF-4. Runs beside 0a/0b.
Base commit: <main at spawn>. Budget: 90 min pack, 30 min per command.

Read: plan §2 (UF-P6), §3; src/app/{routes.ts,router.svelte.ts,instance.ts,flow.ts}; tests/fixtures/saves/record.ts (lock-solve recording), tests/drawing/fixtures.ts.
Own: src/app/dev/{fixtures,loader}.ts; src/app/instance.ts; tests/app/fixtures.test.ts.
Contract (C8/R21): dev-only #/fixture?name=<id>[&step=n][&grey=1] read in instance.ts BEFORE the GameStore singleton is built, selecting a memory SaveBackend (never localStorage; the real save is never read or written). Route entry uses the existing go(route, {replace:true}) (routes.ts maps unknown hashes to Study and router.svelte.ts snapshots the hash; bare history.replaceState does not update the store). Fixture {id; route; params?; setup?: (game)=>void for transient state (game.found, threshold.solved, game.wipe, deterministic replay); expect: testid awaited before taps; taps?: string[]; wipe?; note}. Built from engine/app-flow calls, never imports tests/ into src/. Dead code in production (import.meta.env.DEV; a test greps the build).
Prove ONE hard case first: `threshold-canals-burnt` (or `crossroads-seam`), whose state lives in a transient store and needs a recorded replay, then `study-fresh` as the second fixture.
Owed: report what the loader needs from the router; anything unreachable.

Done when: tests: cold load lands on the fixture's screen via go(...,{replace:true}); a second fixture in the same session; a planted localStorage save is byte-identical after both; the production bundle has no loader; `expect` awaited before taps; a screenshot shows the requested sub-state (burnt threshold), not only the route; &grey=1 greys the screen. Phone: both fixtures at 375x812.
Verify: `pnpm vitest run tests/app/fixtures.test.ts --reporter=dot`
Phone check: yes, port 5197
```

---

## Pack A: Faces and Gallery pages (UF-5 → UF-6 → UF-7), role Default (Sonnet high)

```
Pack A of docs/plans/ux-foundations-plan.md: tasks UF-5 → UF-6 → UF-7 (needs Pack 0a; UF-7 also Pack 0b). UF-7 is a final-review tool, not available to the anchor packs.
Base commit: <main at spawn>. Budget: 90 min pack, 30 min per command.

Read: plan §2 (UF-P1, P2, P8) and §4; src/ui/screens/Gallery.svelte (PARTS, part blocks; pattern); docs/design/art-studies/study-v2.png.
Own: public/fonts/*; index.html (the preload line only); src/ui/fonts.css (imported from theme.css by one additive line); src/ui/components/gallery/{TokensPage,ArtPage,GreyToggle}.svelte; Gallery.svelte (additive only: two PARTS entries, the toggle mount); tests/ui/fonts.test.ts.
Contract (on main from Pack 0): --font-serif, --font-script, --font-hand, scale --type-*, .label in theme.css; registry artIds()/artSize()/artUrl(); art-check budgets (src/ui/art/spec.ts); AppHeader/ActionButton stubs.
Faces: TWO. EB Garamond (Regular, Italic, SemiBold; keep OpenType smcp in the subset, latin) and Pinyon Script (titles/owner's hand; never below 20 px). Name the licensed source of each file; OFL files only; keep each license text in public/fonts/LICENSES.txt. woff2, font-display: swap, preload only the Garamond regular, as a <link rel="preload"> in index.html (you own that one line); fonts.css imported from theme.css by one additive line. Total fonts <= 400 KB. Render the sample at 375 px first (title, label small caps, body 16 px, an apprentice note at 14 px in Pinyon vs serif italic, digits, Dutch names Halvemeer Klokhof Verloren Corner). Keep two faces unless Pinyon cannot serve the apprentice notes at 14 px; then do NOT add a third face: report it as a player question (Kalam or another hand), with the screenshot.
Owed by this pack: nothing (Owed list: none).

Done when:
- UF-5: tests `fonts: every @font-face file exists`, `fonts: precache globs match woff2`, `fonts: --font-* stacks name the shipped faces` pass; sample screenshot at 375x812; on the phone run document.fonts.check confirms the loaded faces and .label shows real small caps on real copy.
- UF-6: `#/gallery?part=tokens` shows type scale, both world palettes, 9 district swatches, meaning colours, spacing, ActionButton kinds, four AppHeader variants; `?grey=1` greyscales any Gallery part (screenshot of `board` part) and, through UF-4's loader, any fixture.
- UF-7: `#/gallery?part=art` lists every registered ArtId at real size grouped by family and scope with per-scope bytes against budget and a flag for a missing sidecar; empty tree shows one line; with two temp assets shows both (screenshot, then remove the temp files).

Verify: `pnpm vitest run tests/ui --reporter=dot`
Phone check: yes, port 5191
```

---

## Pack B: Shared components (UF-8 → UF-9 → UF-10), role Default (Sonnet high)

```
Pack B of docs/plans/ux-foundations-plan.md: tasks UF-8 → UF-9 → UF-10 (needs Pack 0a).
Base commit: <main at spawn>. Budget: 90 min pack, 30 min per command.

Read: plan §2 (UF-P11), §4; docs/design/art-studies/study-v2.png and seam-v2.png (the target look); src/ui/components/common/Sheet.svelte (pattern for Sheet).
Own: common/{AppHeader,ActionButton,Card,Unseen,StepMarker,Sheet,Toasts}.svelte; tests/ui/components.test.ts.
Contract (props frozen by Pack 0; do not change names or types, only add optional ones):
 AppHeader {variant:'study'|'subroom'|'city'|'system'; title; subtitle?; status?: Snippet; back?:{label; to: Route}|{label; onback}; crest?: Snippet; strip?: ArtId; right?: Snippet}: study (88, home world) = wood bar, script title (--font-script), strip art 750×224 (UH-D1/R12: top 176 px header, lower 48 px bleed behind the seat tabs, cropped by object-fit); subroom (64, home world: Codex, Bench, Desk, Drawing table; 750×128 strip); city (56) = night bar, crest snippet left (vector, from crestFor), no back on a trip, round/depth as subtitle, also the fight's two-line header; system (56) = paper bar, small-caps title (Lab/Gallery). The back control and every icon >= 44x44. ⋯ always last in the right slot and opens MenuSheet. Without art, strip/crest fall back to flat world colours.
 ActionButton: one primary per screen (gold-edged lamp fill on home/city, ink fill on system); secondary outlined; quiet text; danger = --danger. Disabled is visibly distinct without colour alone.
 Card sizes to content (no min-height). Unseen: dashed frame + ??? or a silhouette, one style for chip/box; label optional. StepMarker: numbered disc, gold variant (--gold ring, same shape, distinguishable in greyscale by a double ring), 24 and 32 px.
 Sheet keeps open/title/onclose/children and gains optional size 'auto'|'tall' (max 70% / 86% height), a handle, title row + ✕, tap-out, Escape, swipe-down on the handle/title row only (pointer events, never on the scrolling body); reduced motion = fade; world-aware paper.
 Toasts keep the toast(text, tone: 'info'|'warn') store; restyle only; small facts only.
Owed by this pack: nothing.

Done when:
- UF-8: Gallery tokens page (Pack A) or a temporary harness shows all four AppHeader variants, ActionButton kinds and Card at 375x812; test `components: tappable controls declare min-height var(--tap)`.
- UF-9: Unseen and StepMarker in both variants, colour and greyscale screenshots.
- UF-10: the Study menu sheet and the welcome sheet behave as before (tap-out, ✕, Escape) and look restyled; swipe-down on the handle closes; body scroll does not close it; toast info and warn screenshot.

Verify: `pnpm vitest run tests/ui/components.test.ts --reporter=dot`
Phone check: yes, port 5192
```

---

## Pack C: Prefs and ⋯ menu (UF-11 → UF-12 → UF-13), role Default (Sonnet high)

```
Pack C of docs/plans/ux-foundations-plan.md: tasks UF-11 → UF-12 → UF-13 (needs Pack 0a). UF-13 is first in the R24 App.svelte order (UF-13 → UH-13 → UE-8).
Base commit: <main at spawn>. Budget: 90 min pack, 30 min per command.

Read: plan §2 (UF-P9, P10, P12); src/ui/screens/Study.svelte lines ~130-175 and ~427-480 (copySave, loadPasted, resetAll and the menu markup: behaviour to preserve); src/app/save.ts (backend injection, pattern).
Own: src/app/prefs.svelte.ts, src/app/prefs.ts (pure parts), common/MenuSheet.svelte, src/app/App.svelte (stamp removal only), tests/app/prefs.test.ts.
Contract:
 prefs: {motion:'normal'|'quick'} device prefs in localStorage under their own key ('apprentices-notebook:prefs'), never in the save (D7). motionScale(): 1 for normal, 0.5 for quick; prefs.reduced follows the prefers-reduced-motion media query and means cross-fades only. :root gets --dur-quick|base|held scaled by motionScale (250/400/800 ms at 1). Injected backend so it is testable without a DOM.
 MenuSheet {open; onclose} on common/Sheet: Settings (Motion Normal | Quick, two ActionButton-style segmented choices), Back up this notebook (Copy save, Paste save, using game.exportText() and the same import path Study uses; wording kept), Install to the Home Screen (iOS: Share, Add to Home Screen; one short paragraph), About (BUILD; credits link when seen), Start a new notebook (one confirm step, today's "Wipe everything" copy, calls game.reset(); Motion changes write only the prefs key, never the save), R4 contents: Settings, Install to the Home Screen, About (BUILD), Copy save, Paste save, Start a new notebook, the Lab (always visible, release included) and the Gallery (only when isDevEnabled: import.meta.env.DEV or ?dev in the URL). Use ActionButton/Card from Pack 0 stubs.
Also provide pure isDevEnabled(isDevBuild: boolean, search: string): boolean in src/app/prefs.ts (UE-4 reuses it). Owed by this pack: FT-2/FT-3 switch their timing.ts stand-in to motionScale() (R5); UH-13's edit of src/app/App.svelte follows yours (R1); note both in the report.

Done when:
- UF-11: tests `prefs: defaults normal`, `prefs: quick scales to 0.5`, `prefs: persists under its own key, not the save`, `prefs: unreadable value falls back`, `prefs: reduced-motion media forces cross-fades`, `dev: ?dev enables the Gallery, a plain release does not` pass (written first).
- UF-12: MenuSheet screenshots at 375x812: closed list (Lab visible), Settings with Quick chosen, Start a new notebook confirm; production-like run without ?dev hides the Gallery row only.
- UF-13: src/app/App.svelte has no floating .build; About shows BUILD; check:fast green (first of the R1 edits: UF-13 -> UH-13 -> UE-8).

Verify: `pnpm vitest run tests/app/prefs.test.ts --reporter=dot`
Phone check: yes, port 5193
```

---

## Packs D1–D4: State fixtures (D1 = UF-14a..c; D2 = UF-15a, 15b, 15f; D3 = UF-15c, 15d; D4 = UF-15g, 15e), role Default (Sonnet high); one task per subset, spawned when its first consumer needs it

```
Pack D<n> (subset <UF-14x/15x>) of docs/plans/ux-foundations-plan.md.
Base commit: <main at spawn>. Budget: 90 min per subset, 30 min per command.

Read: plan §2 (UF-P6), §3 (risks) and Pack D's subset table; src/app/dev/{fixtures,loader}.ts (Pack 0c); pattern: tests/drawing/fixtures.ts (handoverProfile, fullHousehold) and tests/fixtures/saves/record.ts (lock-solve recording).
Own: src/app/dev/fixtures.ts (append), src/app/dev/recipes.ts, tests/app/fixtures.test.ts.
Contract (R21): Fixture {id; route: Route; params?; save: SaveData; setup?: (game)=>void; expect: testid; wipe?: WipeSummary; taps?: string[]; step?: number; note}; every fixture satisfies resolveScreen(...) with redirect null and the intended screen, AND shows its semantic expected state (a mounted testid; the loader waits for it before taps; a missing tap target fails). Recipes: start-point radios use a remembered Cartographers checkpoint (Seam has none); filed-paper notice sets game.found; burnt threshold replays the lock-solve recording to set threshold.solved; wipes use UT-2's wipeFixture() with three distinct payloads (checkpoint-start first-room, start-from-zero crossing the checkpoint, nothing-lost); a frozen chain needs a deterministic replay setup giving the real start board and events; district fights are `fight-<id>` for all nine DISTRICT_IDS at their real board size (setOut + startBattle). Late profile from tests/drawing/fixtures.ts copied into dev code (never import tests/ from src/). The id list is the plan's "Fixture list" table (copy it into the test).
Subsets: 14a trip late states + loot; 14b wipes (only after UT-2 merges: no stub-only pass; a pending test is reported as pending); 14c ending states; 15a study + home (incl. study-unlocked, pocket-readonly); 15b map (+ setout-startpoint); 15c static fight boards (no FT dependency); 15d district fights; 15g interactive/replayed fight states (after FT-3 for step; per-fixture expected testids skipped visibly until the FT screen merges); 15e lab + Gallery parts (after UF-6/7); 15f glyph/Fair-copy recipes.
Owed by this pack: if a state cannot be reached from engine/app calls, say which and why (do not edit the engine).

Done when: per subset, the plan's Pack D row: tests that each fixture resolves to its screen and shows its expected state; one screenshot each at 375x812 (list in report); tap and frozen-step assertions fail on a missing target or mismatched step.
Verify: `pnpm vitest run tests/app/fixtures.test.ts --reporter=dot`
Phone check: yes, port 5194 (open each fixture of the subset; three fight fixtures with &grey=1)
```

---

## Pack E: Rune glyph redraw, BL-100 (UF-16), role Default (Sonnet high)

```
Pack E of docs/plans/ux-foundations-plan.md: task UF-16.
Base commit: <main at spawn>. Budget: 60 min pack, 30 min per command.

Read: src/ui/runeArt.ts (whole file; pattern); tests/ui/runeArt.test.ts; docs/ROADMAP.md BL-100 (the eight to redraw).
Own: src/ui/runeArt.ts, tests/ui/runeArt.test.ts (only additions).
Contract: 24-unit box, 2-wide round currentColor stroke, each glyph <= ~6 segments, all points inside 0..24; DIRECTIONAL_ART/FILLED_ART keep their meaning; vector only; crisp at 20 px and distinguishable from their role neighbours in greyscale. Redraw: runes margin (method mark), strike, coil, brink; method bind; solvents chalk, filings, quicksilver (METHOD_ART / RUNE_ART / SOLVENT_ART). Do not rename ids or touch RuneGlyph.svelte.
Owed by this pack: nothing.

Done when:
- UF-16: existing runeArt tests green unchanged, plus new test `runeArt: no two glyphs share a path`; Gallery `glyphs` part screenshots at 20 px and 48 px, colour and greyscale (?grey=1 once Pack A merges, else a CSS filter in devtools).

Verify: `pnpm vitest run tests/ui/runeArt.test.ts --reporter=dot`
Phone check: yes, port 5195 (Gallery glyphs part at 375x812)
```
