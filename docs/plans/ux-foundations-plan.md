# UX foundations plan (UF)

Design: [ux-polish.md](../design/ux-polish.md) §0, §5, §6; board §5–§8 ([snapshot](ux-board-snapshot.txt)); program: [ux-program.md](ux-program.md) §2 (UF row), §3 (C1–C8), §4. Roadmap: BL-135 (absorbs BL-100). Briefs: [ux-foundations-briefs.md](ux-foundations-briefs.md).
State: Drafted (2026-11-26); revised after review 1/3 (see Review resolution at the end)
Scope: tokens, fonts, shared components, art registry and `art:check`, PWA precache, device prefs, ⋯ menu, state fixtures, Gallery tokens/art pages, rune glyph redraw. No screen layouts, no raster art.

## 1. Scope and settled rules

Settled by the program (quote, never reopen): C1 tokens, C2 registry, C3 sidecars, C4 sizes, C5 budget, C7 components, C8 fixtures, D7 (Motion is a device pref, not in the save), D8 (overlay never themed, enforced by a test), D9 (engine read-only; `src/app` only for presentation, test-first). Fonts ship self-hosted and precached (OFL); no mono in player UI; red = danger, gold = firsts; overlay tokens never overridden under `[data-world]` / `[data-district]`.
Out: any `.svelte` screen restyle (UH/FT/UT/UD/UE), any raster file (UA), sound, dark mode, a11y pass beyond contrast, 44 px targets and reduced motion.
UF delivers things screens *consume*. Screens migrate in their own plans (§8 migration note); until then old and new components coexist.

## 2. Proposals (decisions the design leaves open)

Numbering: the program and the decisions review cite these as UF-D# (UF-D2 = UF-P7, UF-D3 = UF-P1, UF-D4 = UF-P3, UF-D6 = UF-P10); UF-P# is this plan's own. "UF-0" in the program means Pack 0 below (UF-1…UF-4).

| # | Proposal | Reason |
|---|---|---|
| UF-P1 | **Faces: two. EB Garamond (serif, small caps via `smcp`; reading text) and Pinyon Script (titles and the owner's hand, ≥ 20 px only).** Self-hosted woff2, Latin subset keeping `smcp`, `font-display: swap`, system fallbacks listed; sources named and OFL notices shipped in `public/fonts/LICENSES.txt`. `--font-hand` aliases `--font-script` for now. Pack A renders a sample at 375 px (apprentice note at 14 px in Pinyon vs the serif italic). **Kalam (or another hand) is added only if the rendered sample shows Pinyon cannot serve the apprentice notes at 14 px, and then it becomes a player question, not a default** | §0 asks for one serif and one script; a third face is an unapproved choice. Garamond has real small caps and Dutch diacritics |
| UF-P2 | **Small caps are the `.label` class using `font-variant-caps: all-small-caps` + letter-spacing 0.06em**, never uppercase text | Keeps source strings, avoids shouting, uses the font's real small caps |
| UF-P3 | **Legacy token names stay as aliases** (`--parchment`, `--ink`, `--hand`→`--font-script`, `--mono`, `--space-1..4`, `--wood*`, `--wall`) until UE's Close deletes them. New code uses the C1 names only | Unmigrated screens must not break; migration is per plan |
| UF-P4 | **`--overlay-*` tokens are new aliases of the existing meaning colours** (`--overlay-danger`=`--danger`, `-reach`, `-preview` = its own existing preview colour (**not** the amber `--select` selection colour: Pack 0a checks the current preview paint and aliases that, or declares a distinct value), `-first`=`--gold` (discovery gold stays unique to firsts), `-shield`). Only `:root` may define them. **Three enforcement layers (D8):** (1) the text test over `theme.css` and any `src/ui/**/*.css` / `<style>` text for a `--overlay-*` declaration inside a `[data-world]`/`[data-district]` rule; (2) a source test over the tactical overlay component files (named by FT at its merge, registered in `tests/ui/overlay-paint.test.ts`): they may paint only `var(--overlay-*)` (no hex, rgb, named colour or other token in a `stroke`/`fill`/`color`/`background`), catching a hardcoded SVG stroke; (3) rendered checks: colour/greyscale screenshot pairs per district at phase end with real z-order, boss overlap and stacked FX (UD/FT own the captures; UF's Gallery greyscale toggle and fixtures provide the states). Hit rectangles are measured in both dimensions in the browser | Gives FT/UD one name to read; the test is text-level and cheap |
| UF-P5 | **District swatches** from board §7 as `[data-district="seam|canals|inkQuarter|bathhouses|bridges|foundry|cartographers|lowerSeam|inkedPage"]` (Seam, Lampwater, Verloren Corner, Thermae, Fog Arches, Klokhof, Sestante, Underjoin, player-drawn). `DistrictId` order is `DISTRICT_IDS` (`src/data/districts/index.ts`); a test asserts one block per id. **Selector scope (program R7):** until UD-1 renames about ten SVG marks' `data-district="…"` attributes to `data-mark`, every block targets screen roots only, as `[data-world][data-district="<id>"]`; a test asserts no bare `[data-district]` selector exists in `theme.css`. After UD-1 merges, UD asks (status Owed) for the `[data-world]` prefix to be dropped | Names in the board differ from ids; the mapping is stated once |
| UF-P6 | **Fixtures are dev code, not recorded JSON; the loader and the recipes are separate (R21).** `src/app/dev/fixtures.ts` builds each `SaveData` from engine and app-flow calls, so a save-version bump cannot rot them. Loader: `#/fixture?name=<id>` is read in `src/app/instance.ts` **before** the `GameStore` singleton is built: a memory `SaveBackend` is selected first (dev builds only, tree-shaken in production) and the player's localStorage is never read or written. The route is entered through the existing `go(route, { replace: true })` (`router.svelte.ts` snapshots the hash and `routes.ts` maps unknown hashes to Study, so bare `history.replaceState` is not enough). A fixture carries: `route` + route **params** (threshold district, Gallery part, `step`), a **setup recipe** `(game) => void` for transient state a save cannot hold (`game.found` for filed-paper notices, `threshold.solved` for a burnt lock, `game.wipe` payloads, a deterministic replay of a recorded lock-solve or chain to reach a frozen board/events), `taps` (testids clicked once the screen's declared **expected-state testid** has mounted: the loader waits for it), `grey=1` (root greyscale filter) and `note`. Recipes: **start-point** radios need a remembered Cartographers checkpoint (Seam has no checkpoint); **filed paper** sets `game.found`; **burnt threshold** replays the repo's lock-solve recording; **wipe** has three distinct payloads (checkpoint-start first-room, start-from-zero crossing the checkpoint, nothing-lost) from UT-2's `wipeFixture()`. A fixture whose tap target is missing or whose frozen step does not match fails its test; a resolved route alone proves nothing |
| UF-P7 | **Art spec lives in `src/ui/art/spec.ts`; rules are per ROLE, not per family (UF-D2/R10).** The sidecar declares `role` ∈ `tile-opaque` (128², no real transparency), `material-overlay-alpha` (128², alpha required, content inside the cell), `figure` (128×176 alpha, ground-contact point declared), `boss-figure` (192×256 alpha), `portrait` (192² opaque), `card` (222×330 opaque), `strip` (width 750 or declared, height free, opaque unless the sidecar says alpha), `scene` (750×N or 750×1624, opaque), `map-plate`, `map-patch-with-bbox` (alpha, bbox inside the 750×3800 master, bbox × scale = patch size), `nine-slice` (alpha, slice insets inside the image). A family may contain several roles (e.g. `props` = standing prop figure, 160² object, fx strip; `portraits` = portrait + card), so UA's valid output is never rejected on family alone. `art:check` decodes the file and checks: real alpha vs role (a fully opaque alpha channel fails a role needing transparency; real transparency fails an opaque role), dimensions equal sidecar and role rule, a master record exists (accepted source or archive hash, per the D4 pilot ruling), bbox/slice bounds. Valid and invalid examples are tests. No manifest (R10) | The program lists 750×N sizes and nine-slices; family-only rules would reject valid UA output |
| UF-P8 | **`ArtImage` props** `{ id: ArtId; fallback?: Snippet; alt?: string; fit?: 'cover'|'contain' }`; renders `<img>` with explicit width/height from the spec when known, else the fallback; `artUrl` is synchronous (eager `?url` glob). **Public metadata (R26):** a build-time module `src/ui/art/meta.ts` (generated by a Vite plugin from the sidecars, committed output not required) exports `artMeta(id): { role; w; h; bytes; bbox?; slice? }` (actual decoded size, bbox in master pixels, slice insets in source pixels, shipped bytes) for UT offsets, UH slices and Gallery byte counts. Prompts, references and masters never enter the client bundle (test greps the built output) | Placeholder-first needs a synchronous answer; no layout shift |
| UF-P9 | **Motion pref API**: `prefs.motion: 'normal'|'quick'`, `motionScale(): number` (1, 0.5 for quick; applied once, to `--dur-*` and the TS mirror; reduced-motion media query forces cross-fade mode: `prefs.reduced`, a live getter that reacts to OS preference changes, exported from the first stub in Pack 0a), `--dur-*` set on `:root` from it. FT ships a reduced-motion-only `motionScale()` stand-in in `src/app/timing.ts` (FT-D6, R5) and switches it to this one after UF-11 merges; that edit is FT's (FT-2/FT-3), listed in Owed | UF may not edit FT's files; one function is the whole interface |
| UF-P10 | **MenuSheet items (program R4)**: Settings (Motion Normal / Quick), Install to the Home Screen (iOS Add to Home Screen text), About (build stamp, credits link when seen), Copy save, Paste save (moved from Study's menu, behaviour unchanged), Start a new notebook (one confirm step, today's "Wipe everything" copy kept), **the Lab (visible in release builds, plain system look: the Study links to it today and lessons use it)**, and the Gallery (dev builds or `?dev` only). The dev predicate is a pure `isDevEnabled(isDevBuild, search)` in `src/app/prefs.ts` (UE-4 reuses it for the `#/gallery` guard). No stamp-tap flag | R4 replaces the Study's own ⋯ panel (UH-D5), the earlier stamp-×5 idea and UE-D2's dev-only Lab. **Redefines** the board's "Lab dev-only" (UF-D6) |
| UF-P11 | **Sheet keeps its props** (`open, title, onclose, children`) and gains optional `size: 'auto'|'tall'` (max 70% / 86%) and `handle` swipe: pointer-drag on the handle and title row only (not the scrolling body); tap-out and ✕ as today | Body scroll must not fight the swipe; additive only |
| UF-P12a | **Prefs scope in fixtures and Lab.** Changing Motion during a fixture writes only the device-prefs key (never the save); the memory backend isolates it from the real save. Copy save has a fallback when the clipboard is denied (shows the text in the sheet); Paste save handles invalid text with a message; Start a new notebook has cancel and confirm; returning from the Lab in a live trip is verified. All through existing `GameStore` import/reset/export methods | Review should-fix: device behaviour |
| UF-P12 | **Build stamp** leaves `App.svelte`; it shows in the menu's About. A screen with no `AppHeader` yet has no menu and no stamp until its plan migrates it (accepted for the build window; DEV builds also log it to the console) | Program item; stamp overlaps content today |
| UF-P13 | **Rune redraw (BL-100)** touches only `src/ui/runeArt.ts` and its test: margin, strike, coil, brink, bind, chalk, filings, quicksilver, same 24-unit box, 2-wide stroke, ≤ 6 segments, readable at 20 px in greyscale. The audit part of BL-100 (invention names, shelf metadata) is not UF's: left on the roadmap | `ROADMAP.md` BL-100 lists exactly these eight |

## 3. Current implementation and risks

Read: `src/ui/theme.css` (205 lines, one `:root`, `[data-theme=dark]` unused, `.desk .editor` skin rules that Study and Lab depend on: keep them), `common/{Button,Sheet,BackLink,Toasts}.svelte`, `src/app/{App.svelte,routes.ts,router.svelte.ts,flow.ts resolveScreen,instance.ts,game.svelte.ts,save.ts,toasts.svelte.ts,timing.ts,playback.svelte.ts}`, `vite.config.ts`, `Study.svelte` menu (lines ~427–480: Lab link, Copy / Paste / Start over via `Sheet`), `Gallery.svelte` (`PARTS`, `router.params.get('part')`), `tests/ui/runeArt.test.ts`, `tests/drawing/fixtures.ts`.
- **Riskiest unknown: late-state fixtures** (Handover, Drawing table, Credits need `profile.ending`, `ownerDoor(profile)==='open'`, hearts cleared). `handoverProfile()` and `fullHousehold()` in `tests/drawing/fixtures.ts` show it is reachable; they are test code, so UF-12 copies the recipe into `src/app/dev/`. Pack 0c proves the loader on ONE hard case first (router bootstrap through `go(…, {replace:true})` with the memory backend selected before the singleton, real save untouched, absent in production), then Pack D adds recipes.
- `GameStore` is a module singleton (`instance.ts`) built with `localBackend()`; swapping the backend must happen at construction. Wipe state is in memory (`game.wipe`).
- `resolveScreen` redirects `trip-page`, `bench`, `desk`, `drawing`, `handover`, `credits` when preconditions fail; each fixture's profile must satisfy them (asserted by `tests/app/fixtures.test.ts`).
- `BUILD` is also shown from `App.svelte`; moving it needs a screen without a header to still read fine.
- Workbox `globPatterns` is `js,css,html,svg,png,ico,webmanifest`: add `webp,woff2`; `maximumFileSizeToCacheInBytes` default 2 MiB is fine for map patches but the registry test checks it. Pack 0b inspects the *built* precache manifest (incl. inlined tiny assets and fonts); the combined install (precache total) is budgeted, not just source WebPs. Offline cold reload under the deployed base path after SW activation is a Close step and a pilot step.
- `art:check` must run in **both** `check` and `check:fast` (`package.json` has independent scripts and deploy CI runs `check`), with zero art present (empty `src/assets/art/` passes).
- Font subsetting must keep the `smcp` feature or `font-variant-caps` silently falls back to faux small caps.

## 4. Contracts

**Provides** (frozen at Pack 0's merge; quoted from the program, plus names UF chooses):
- C1 `theme.css` sections: type (`--font-serif|script|hand`, `--type-xs..title`, `.label`), worlds (`--home-*`, `--city-*`, `data-world="home|city|system"`), `[data-district]`, meaning colours, `--overlay-*`, spacing 4/8/16/24/32 (`--space-1..5`), `--tap`, `--radius`, `--shadow-1|2`, `--dur-quick|base|held`.
- C2 `src/ui/art/registry.ts`: `type ArtId`, `artUrl(id): string | null`, `artIds(): ArtId[]`, `artSize(id)`, `artMeta(id)` (R26); `<ArtImage id fallback alt fit>`.
- C3/C5 `pnpm art:check` (`scripts/art-check.ts`, run with `node --experimental-strip-types`): decoded file checked against the **role** rule declared in each sidecar (R10, UF-P7, no manifest), alpha, sidecar, per-scope budget table printed against shared + home ≤ 4.5 MB (UA-D13), district ≤ 1.5 MB, map ≤ 0.8 MB, total ≤ 15 MB; exit 1 on failure; wired into **both** `check` and `check:fast`. Inventory test (R27): every `ENEMY_IDS`/rival/boss/loot-kind/threshold-lock id maps in `src/ui/art/inventory.ts` to an ArtId, shared alias or vector fallback (the mapping is data owned by UF, the lists come from the UA briefs). UF owns `art:check`; UA Pack A adds `sharp`, `art:process`, `art:sheet` to `package.json` by grant (R11), after UF-2 merges.
- C7 (props, all Svelte 5 runes; **frozen after rendering a Study header and a two-line fight header in Pack 0a**, including: an accessible name (`aria-label`) on every icon-only control, `back` as a route link or an `onback` callback, a `status?: Snippet` second line for the fight header (boss name / HP / rule, R20), a `crest` component-to-snippet adapter (`crestSnippet(id)`), and the reduced-motion getter): `AppHeader {variant:'home'|'city'|'system'; title; subtitle?; status?: Snippet; back?: {label; to: Route}|{label; onback}; crest?: Snippet; strip?: ArtId; right?: Snippet; height?: 56|64|72|88}` (⋯ always last, mounts `MenuSheet` itself; 88 = the Study's strip header, UH-D1/R12, whose strip art is 750×224: top 176 px header, lower 48 px bleed behind the seat tabs; 56 = Lab/Gallery system header, UE; `crest` is a snippet rendering a vector crest from `crestFor(id)`, UD/FT-4: the `crests` art family stays unused); `ActionButton {kind?:'primary'|'secondary'|'quiet'; danger?; disabled?; onclick; label?; testid?; children?}`; `Sheet` (kept + `size`); `Unseen {shape?: 'box'|'chip'|'silhouette'; label?: string}`; `StepMarker {n; gold?; size?: 24|32}`; `MenuSheet {open; onclose}`; `Card {tone?:'paper'|'plain'; children}`; `Toasts` (same store `toast(text, tone)`).
- C8/R21 `#/fixture?name=` with `FIXTURES: Record<FixtureId, Fixture>` in `src/app/dev/fixtures.ts` and `fixtureIds()`; the id list is the table in Pack D (names requested by FT, UH, UT, UD and UE), partitioned by first consumer. Optional `&step=n`, `&grey=1` query params; `Fixture.{route, params, setup, expect, taps, wipe}`.
- App layer: `src/app/prefs.svelte.ts` (`prefs`, `motionScale()`), `src/app/prefs.ts` (`isDevEnabled`), tested.
- Gallery pages `tokens`, `art` (and a `?grey=1` greyscale toggle available on every Gallery part).
**Consumes:** UA-1 style sheet (docs/art/style-sheet.md) only for wording in the art page; nothing blocks on it. UT-2's `wipeFixture()` (R6) for `wiped-*` fixtures (UF-14 stubs it until UT-2 merges). FT-3's `freezeAt` for the `step` param (UF-15 builds the saves; the param works once FT-3 merges). No other plan's task IDs.
**Owed (for the status file):**
- Each screen plan replaces `Button`/`BackLink`/its header with C7 (UH-1/UH-8…UH-10, UT-4…UT-9, FT-14, UE-1…UE-6), see §8. They depend on Pack 0a (stubs, signatures), UF-8…UF-10 (looks), UF-12 (MenuSheet) and the fixture subset of their own first consumer (UF-14/UF-15 partitions).
- FT: FT-2/FT-3 switch `motionScale()` in `timing.ts` to `prefs.svelte.ts` after UF-11 merges; UH-13 and UT use the same function.
- UH-13 (TransitionLayer mount, incl. imports and caller wiring) edits `src/app/App.svelte` after UF-13, then UE-8 (R1/R24 order UF-13 → UH-13 → UE-8). Gallery order UF-6/7 → UD-3 → UE-6.
- UE-4 reuses `isDevEnabled` (UF-11) for the Gallery guard; UE-6 extends UF-6/UF-7's Gallery pages, it does not replace them.
- UA Pack A: `sharp`, `art:process`, `art:sheet` in `package.json` **and `pnpm-lock.yaml`** by grant after Pack 0b merges and its decoder works (R11, R24). Each UA pack: sidecar + master per C3 (UF's `art:check` fails otherwise).
- UD-1: renames SVG `data-district` marks to `data-mark` (R7), then asks for the `[data-world]` prefix to be dropped from UF-1's blocks; UD only edits swatch values if a greyscale check demands it (a UF-owned file: ask via the status file, R8).
- UE Close: delete legacy aliases (UF-P3), remove `Button.svelte`/`BackLink.svelte` when unused.
- Orchestrator at the UA pilot and the first art pack (UA-9): confirm the C5 numbers from `art:check`'s table, the master storage rule (D4) and install size.
- Name a separate final review dependency for UF-7 (Gallery art page): it is unavailable to the anchor packs; anchor review uses `art:sheet` contact views (R22).

## 5. Packs

### Wave 0 is three packs (review 1 #6)

One merge for CSS, six stubs, image validation, Workbox and a router bootstrap was too large. Land 0a first; 0b and 0c are independent of each other and run in parallel.

### Pack 0a: Tokens, stubs, motion signature (role: Strong; UI; depends on: nothing)
Owns: `src/ui/theme.css`, `src/ui/components/common/{AppHeader,ActionButton,Card,Unseen,StepMarker,MenuSheet}.svelte` (stubs), `src/app/prefs.svelte.ts` (stub with the final signature), `tests/ui/tokens.test.ts`, `tests/ui/stubs.test.ts`.
Pattern: `Button.svelte` for component shape.
**Unblocks FT, UH and UT** (they may start when 0a merges).

| ID | Goal | Size | Done when |
|---|---|---|---|
| UF-1 | Reorganise `theme.css` into C1 sections with aliases for every legacy name; write the nine `[data-world][data-district]` blocks (R7, R8); declare the overlay aliases (UF-P4: preview ≠ amber selection) | M | tests `tokens: every C1 name is declared`, `tokens: overlay tokens only in :root`, `tokens: --overlay-preview is not --select`, `tokens: one [data-world][data-district] block per DISTRICT_IDS id`, `tokens: no bare [data-district] selector`, `tokens: legacy names still resolve`; Study and Codex at 375×812 unchanged |
| UF-3 | Freeze C7 as working stubs: final props incl. `height 56|64|72|88`, `status` snippet, `crest: Snippet` adapter, accessible names, back route-or-callback; `motionScale()` + live `prefs.reduced` getter from the first stub. Render a Study header and a two-line fight header in a throwaway page before locking | M | `svelte-check` clean; autofixer clean; each stub renders via tests/ui import; props match §4; a test flips reduced-motion and sees the getter change |

### Pack 0b: Art registry, metadata, art:check, precache (role: Strong; app + tooling; depends on: nothing (0a only for shared `package.json` ordering))
Owns: `src/ui/art/*` (registry.ts, spec.ts, meta.ts, inventory.ts, ArtImage.svelte), `scripts/art-check.ts`, `package.json` (the `art:check` script, wired into BOTH `check` and `check:fast`; UA Pack A adds `sharp`, `art:process`, `art:sheet` afterwards by grant, R11), `vite.config.ts` (globPatterns, size cap, metadata plugin), `tests/ui/{art-registry,art-check,art-inventory}.test.ts`.
Pattern: `tests/app/routes.test.ts`.

| ID | Goal | Size | Done when |
|---|---|---|---|
| UF-2 | Registry, `ArtImage`, role `spec.ts`, public `artMeta` module (R26), `art-check` with role rules and master record, inventory mapping (R27), precache globs, wiring into `check` and `check:fast` | L | tests `registry: no art → artUrl null`, `registry: id from path`, `registry: artMeta gives bbox and slice in source pixels`, `art-check: missing sidecar fails`, `art-check: wrong size fails`, `art-check: opaque role with real transparency fails`, `art-check: alpha role without transparency fails`, `art-check: mismatched dimensions fail`, `art-check: missing master record fails`, `art-check: bbox out of bounds fails`, `art-check: valid examples of every role pass`, `art-check: over-budget scope fails deliberately`, `art-check: budget table printed` (decimal MB stated), `inventory: every ENEMY_IDS/rival/boss/loot kind/threshold lock maps` (R27), `bundle: no prompt or reference text` ; **proved on an empty tree and with representative file drops** (one of each role) before C2 is frozen; `pnpm art:check` passes on the empty tree and runs in both gates; `pnpm build` precache list includes a dropped test webp and a font |

### Pack 0c: Fixture loader, proven on one hard case (role: Strong; app; depends on: nothing)
Owns: `src/app/dev/{fixtures,loader}.ts`, `src/app/instance.ts`, `tests/app/fixtures.test.ts`.
Pattern: `tests/fixtures/saves/record.ts`.

| ID | Goal | Size | Done when |
|---|---|---|---|
| UF-4 | Fixture loader (`name`, `params`, `step`, `grey`, `taps`, `expect`, `setup`, `wipe`) and ONE hard case: `threshold-canals` or `crossroads-seam` (transient `threshold.solved` or ephemeral state), plus `study-fresh` as the second | M | tests: **cold load** of the fixture URL lands on its screen via `go(…, {replace:true})` (not bare `replaceState`); a **second fixture** after the first in the same session; **local save sentinel** (a planted localStorage save is byte-identical after both); **absent production loader** (built bundle has no loader); `expect` testid awaited before `taps`; a screenshot assertion that the requested sub-state (not just the route) shows; `&grey=1` greys the screen |

### Pack A: Faces and Gallery pages (role: Default; UI; depends on: Pack 0a (tokens); UF-7 also on Pack 0b)
Owns: `public/fonts/*`, `src/ui/fonts.css` (imported from `theme.css` by one additive line), `src/ui/components/gallery/{TokensPage,ArtPage,GreyToggle}.svelte`, `Gallery.svelte` (additive: two `PARTS` entries, one toggle mount), `tests/ui/fonts.test.ts`.
Pattern: `Gallery.svelte` part blocks.

| ID | Goal | Size | Done when |
|---|---|---|---|
| UF-5 | Fonts per UF-P1 (two faces): woff2 subsets keeping `smcp`, `@font-face`, `--font-*` wired, precached; licensed sources named, OFL notices shipped. **Actual theme import and preload location named**: `fonts.css` imported from `theme.css`, Garamond regular `<link rel="preload">` in `index.html` (UF-5 owns that one line) | M | tests `fonts: every @font-face file exists`, `fonts: precache globs match woff2`, `fonts: --font-* stacks name the shipped faces`, `fonts: loaded faces and real small caps on real copy (document.fonts.check in the phone run)`; sample at 375 px with screenshot incl. Pinyon at 14 px; `.label` renders real small caps. Verdict recorded: two faces suffice, or a hand-face player question is raised |
| UF-6 | Gallery `tokens` page + greyscale toggle (CSS `filter: grayscale(1)` on the root, `?grey=1`; the same param works on `#/fixture?name=…&grey=1` via UF-4's loader) | S | `#/gallery?part=tokens` shows type scale, both worlds, district swatches, meaning colours, spacing, buttons, header variants; `?grey=1` works on `board` part and on a fixture |
| UF-7 | Gallery `art` page: contact view of every registered ArtId at real size, grouped by family/scope, `artMeta` size + bytes per scope against budget, flags missing sidecar. **Final-review dependency only: not available to the anchor packs (R22)** | M | with 0 art: empty state line; with 2 temp test assets: both listed at real size, 375×812 screenshot |

### Pack B: Shared components (role: Default; UI; depends on: Pack 0a (UF-3); fonts swap in when Pack A (UF-5) merges)
Owns: `common/{AppHeader,ActionButton,Card,Unseen,StepMarker,Sheet,Toasts}.svelte`, `tests/ui/components.test.ts`.
Pattern: painted `study-v2.png`, `seam-v2.png`; `Button.svelte`.

| ID | Goal | Size | Done when |
|---|---|---|---|
| UF-8 | AppHeader home/city/system, ActionButton, Card | M | Gallery tokens page shows each variant; header 56/64/72/88 high, ⋯ last, back ≥ 44 px, crest slot falls back without art; one primary rule documented in a comment |
| UF-9 | Unseen and StepMarker | S | `Unseen` box/chip/silhouette; `StepMarker` gold variant, 24 and 32 px; greyscale still distinguishes gold |
| UF-10 | Sheet and Toasts restyle (props kept) | M | existing sheet users unchanged in behaviour (Study menu, welcome sheet); handle swipe on handle only, tap-out, ✕; toast tones `info|warn` kept; reduced motion = fade |

### Pack C: Prefs and ⋯ menu (role: Default; app test-first + UI; depends on: Pack 0a (UF-3); UF-12 wants UF-10's Sheet)
Owns: `src/app/prefs.svelte.ts`, `src/app/prefs.ts`, `common/MenuSheet.svelte`, `src/app/App.svelte` (stamp removal), `tests/app/prefs.test.ts`.
Pattern: `save.ts` backend injection.

| ID | Goal | Size | Done when |
|---|---|---|---|
| UF-11 | Device prefs, test-first | S | tests `prefs: defaults normal`, `prefs: quick scales to 0.5`, `prefs: persists under its own key, not the save`, `prefs: unreadable value falls back`, `prefs: reduced-motion media forces cross-fades`, `dev: ?dev enables the Gallery, a plain release does not` |
| UF-12 | MenuSheet with all UF-P10 items (R4) | M | `MenuSheet` over Gallery at 375×812: Settings (changing Motion in a fixture writes only the prefs key), Install to the Home Screen, About, Copy save (clipboard denied → text shown), Paste save (invalid text → message), Start a new notebook (cancel and confirm), the Lab (return from Lab in a live trip works); the Gallery row hidden in a production-like run without `?dev`; Copy/Paste reuse `game.exportText()` / `importSave` as Study does |
| UF-13 | Remove the floating build stamp (first of the R1 `App.svelte` edits: UF-13 → UH-13 → UE-8) | S | `src/app/App.svelte` has no `.build`; About shows `BUILD`; `pnpm check:fast` green |

### Pack D: State fixtures (role: Default; app; depends on: Pack 0c (UF-4); subsets below wait for their named dependency)
Owns: `src/app/dev/fixtures.ts` (after Pack 0c), `src/app/dev/recipes.ts`, `tests/app/fixtures.test.ts`.
Pattern: `tests/drawing/fixtures.ts`, `tests/fixtures/saves/record.ts` (lock-solve recording).

Fixtures are **partitioned by first consumer** (review 3 #6): each subset is its own task and merges when its consumer needs it; a subset that needs a not-yet-merged piece (UT-2 wipe, FT-3 playback) is marked pending and its test is skipped *visibly* (not passed) until that piece merges. A resolved route is never proof: each fixture declares an `expect` testid and a semantic expected state.

| ID | Subset (first consumer) | Size | Depends on | Done when |
|---|---|---|---|---|
| UF-14a | trip late states (UT-6…UT-9): `threshold-canals`, `threshold-canals-burnt` (replays the lock-solve recording to set `threshold.solved`), `threshold-nothing`, `crossroads-seam`, `crossroads-span`, `crossroads-no-way-home`, `cleared-seam`, `cleared-lower-seam`, `loot-three`, `loot-bonus`, `loot-paper-found` (sets `game.found`) | M | Pack 0c | test `fixtures: trip late states resolve to their screens and show their expected state`; a screenshot per fixture |
| UF-14b | wipes (UT-9, UH-13 exits): `wiped-seam`, `wiped-first-room` (checkpoint-start), `wiped-crossed-checkpoint` (start-from-zero), `wiped-nothing-lost` | S | **UT-2 `wipeFixture()` (merged first)** | three distinct payload tests; no stub-only pass |
| UF-14c | ending late states (UE-1…UE-3): `drawing-blank`, `drawing-two-inked`, `handover-ready`, `credits-full` | M | Pack 0c | test `fixtures: ending states resolve` |
| UF-15a | study + home (UH-1…UH-14): `study-*`, `household-full`, `homecoming-*`, `codex-early`, `bench-mid`, `desk-*`, `bench-page-trial` (a held-page trial on its authored board), `study-doorway`, `study-unlocked` (all three objects), `pocket-readonly` | L | Pack 0c | test `fixtures: study and home states exist and show their expected state` |
| UF-15b | map (UT-4, UT-5, UD-14, UD-15): `map-*`, `setout-*`, **`setout-startpoint`** (remembered Cartographers checkpoint; Seam has none) | M | Pack 0c | test names the checkpoint recipe |
| UF-15c | fight (FT-5…FT-26): `fight-seam`, `fight-lampwater`, `fight-wide-7x9`, aim/confirm/sheet/busy, `fight-chain` etc. with a **deterministic replay setup** giving the real start board and events for the frozen step, `pocket-sheet` | L | FT-3 `freezeAt` for `step` | test: the frozen step shows the expected step marker; a missing tap target fails |
| UF-15d | district fights (UD-1…UD-17): `fight-<id>` for all nine `DISTRICT_IDS` with the district's **real board size** (e.g. 7×7 Marginalia, 7×9 Lampwater) built from `setOut`/`startBattle` | M | Pack 0c | test: board dimensions match the district's authored size |
| UF-15e | lab + Gallery (UE-5, UE-6): `lab-play`, `lab-board`, `lab-lattices`; Gallery fixtures with `part` params (`tokens`, `art`, `glyphs`, `board`) | S | UF-6/7 for Gallery parts | test `fixtures: lab and gallery parts show the requested part` |
| UF-15f | Glyph/Fair-copy recipes: `glyph-settings`, `glyph-ranking`, `glyph-profiler`, `glyph-revision`, `faircopy-*` named by UH/UE | S | Pack 0c | recipes named, tests assert expected testids |

**Fixture list (C8/R6/R21; the only names the plans' Done-when cells may use).** The table below is the master list (ids); the subset task that builds each is the one above.

| Group | Ids | Asked by |
|---|---|---|
| late | `threshold-canals` (intro; taps `enter` → room; a solved variant `threshold-canals-burnt`), `threshold-nothing`, `crossroads-seam`, `crossroads-span` (bridges), `crossroads-no-way-home`, `cleared-seam`, `cleared-lower-seam`, `wiped-seam` (2 rooms, cause), `wiped-first-room`, `wiped-crossed-checkpoint`, `wiped-nothing-lost`, `drawing-blank`, `drawing-two-inked`, `handover-ready`, `credits-full` | UT-6…UT-9, UE-1…UE-3, UH-13 (cleared/wiped → trip page) |
| study | `study-fresh` (UF-4), `study-mid`, `study-doorway`, `study-unlocked`, `study-three-seats`, `study-trip-out`, `study-first-evening`, `household-full` (all 9 apprentices at home, 3 seated; the owner joins only at the handover, R14), `pocket-readonly` | UH-1…UH-7 |
| map | `map-fresh`, `map-frontier`, `map-lower-seam`, `map-inked-pages`, `setout-seam` (taps the Seam node), `setout-startpoint`, `setout-empty-party`, `setout-drawn-page` | UT-4, UT-5, UD-14, UD-15 |
| fight | `fight-seam` (idle, seat selected), `fight-lampwater` (canals), `fight-wide-7x9`, `fight-aim`, `fight-confirm` (party-harm warning), `fight-spell-sheet`, `fight-busy`, `fight-chain` (`step=3`), `fight-burst-beat`, `fight-first-beat`, `fight-boss` (with trick banner), `fight-rival`, `fight-won`, `fight-lost`, `fight-log-sheet`, `pocket-sheet`, plus `fight-<id>` for all nine `DISTRICT_IDS` at their real board sizes (`fight-inkedPage` is a lent shape) | FT-5…FT-26, UD-1…UD-17, UE-Z2 |
| loot | `loot-three` (a new rune, ink, a district card), `loot-bonus`, `loot-paper-found` | UT-7 |
| home | `homecoming-first`, `homecoming-quiet`, `codex-early`, `bench-mid`, `bench-trial`, `desk-empty`, `desk-open-row`, `desk-expanded` | UH-8…UH-14 |
| lab | `lab-play`, `lab-board`, `lab-lattices` | UE-5 |
| glyph / copy | `glyph-settings`, `glyph-ranking`, `glyph-profiler`, `glyph-revision`, `faircopy-ready` | UH/UE as named |

A plan that needs a fixture not in this table adds it here first (status file Owed), never invents a name in a Done-when. UF-14/15 are explicit **verification dependencies** of the screens that name their fixtures; a real route loop is exercised separately from fixture screenshots.

### Pack E: Rune glyph redraw, BL-100 (role: Default; UI; depends on: none, can start with Pack 0)
Owns: `src/ui/runeArt.ts`, `tests/ui/runeArt.test.ts`.
Pattern: existing entries in `RUNE_ART`, `METHOD_ART`, `SOLVENT_ART`.

| ID | Goal | Size | Done when |
|---|---|---|---|
| UF-16 | Redraw margin, strike, coil, brink, bind, chalk, filings, quicksilver | M | `runeArt.test.ts` unchanged and green (box 0..24, ≤ 6 segments); Gallery `glyphs` part screenshot at 20 px and 48 px, greyscale pass |

### UF-G1 gate: faces review (player, optional, never blocks)
On the Gallery tokens page screenshot at 375×812. Default: two faces. A hand-face (Kalam or other) is proposed only if the sample shows Pinyon fails at 14 px. A change is one `--font-*` edit.

### Close (orchestrator)
Full gate, phone run of tokens/art pages and menu, `code-review`, TECH §7 rows (fonts, registry, fixture loader, prefs key), DESIGN §11 row, roadmap, ledger clean.

## 6. Verification

- App-layer test-first: prefs (UF-11), fixtures resolve (UF-4/14/15), art spec and `art-check` (UF-2), tokens (UF-1). Names in the tables.
- UI states at 375×812: Gallery `tokens`, `art` (0 and 2 assets), `?grey=1`; MenuSheet open; Sheet open from Study; header variants; fixtures opened by hash. 44 px: a DOM-measure helper is not built here; targets are checked in the Gallery by eye and asserted as CSS `min-height: var(--tap)` strings in `components.test.ts`.
- Checked only at Close: offline load with fonts precached (`pnpm build && pnpm preview`, airplane mode), install size.

## 7. Open questions (defaults held)

- Does the apprentice need a distinct handwriting face? Default: no, two faces (EB Garamond + Pinyon Script); raised as a player question only if the rendered sample fails at 14 px.
- Settled (R4): the Lab stays visible in release builds; the Gallery is dev or `?dev` only. No open question.

## 8. Migration note (which old pieces each plan replaces)

| Old | Replaced by | Replaced in |
|---|---|---|
| `Button.svelte` (`primary|quiet|danger`) | `ActionButton` (`primary|secondary|quiet`, `danger`) | each screen's own plan (Study/Bench/Desk/Codex UH; Loot/Cleared/Wiped/Threshold UT; Combat FT; Handover/Credits UE); `DoorLine.svelte` UD |
| `BackLink.svelte` | `AppHeader` `back` | UH (Codex, Bench, Desk, DrawingTable→UE), UT, UE (Gallery) |
| Study title bar and menu (`Study.svelte` ~427–480) | `AppHeader` home + `MenuSheet` | UH |
| Map dark bar, Fight/Loot no bar | `AppHeader` city | UT, FT |
| `Toasts.svelte`, `Sheet.svelte` | same files restyled in place (UF-10) | UF |
| floating `.build` | MenuSheet About | UF-13 |
| `--hand`, `--mono`, `--space-*`, `.sheet`, `.chip` | C1 names | UE Close removes aliases |
| `Study.svelte` `.desk .editor` skin in `theme.css` | stays until UH moves it into `components/lattice` | UH |

## 9. Execution notes

- Critical path: **Pack 0a (merge first, alone, orchestrator review)** → FT/UH/UT may start; Packs 0b and 0c in parallel with each other and with 0a's consumers; then A, B, C, D subsets as consumers need them → UF-G1. Pack E is the filler pack.
- Port assignment: UF packs use 5190 (0a), 5196 (0b), 5197 (0c), 5191–5194 (A–D), 5195 (E); other plans pick distinct ports (UH 5200s, UT 5210s).
- Size: Pack 0a ≈ 0.6 L, 0b ≈ 0.9 L, 0c ≈ 0.5 L, A ≈ 1 L, B ≈ 1 L, C ≈ 0.7 L, D ≈ 1.2 L across subsets, E ≈ 0.5 L. About 6–7 L total.
- Codex: none of UF's packs needs Codex (all need Svelte autofixer or the browser). Art packs belong to UA.

## 10. Conflicts and notes for the program

- C2 "UA never edits code" holds because `art-check` sizes are family rules plus the sidecar-declared size (UF-P7, R10); there is no manifest.
- UF-5's `index.html` preload line is the only edit outside UF's Owns; UF-13's `App.svelte` edit is first in the R24 order.
- Program §3 C1 says `--dur-*` scaled by the Motion pref; `playback.svelte.ts` currently uses `prefersReducedMotion`: FT adds a stand-in `motionScale()` and adopts UF-11's after it merges (R5, Owed).
- "Lab dev-only" (board) vs. the Study menu's player-visible Lab link: resolved by R4 (UF-P10): Lab visible, Gallery dev or `?dev`.

## 11. Review resolution (review 1, plus review 3 #5/#6 for the UF side)

| Must-fix | How resolved |
|---|---|
| R1-1 One asset contract | UF-P7 rewritten as per-role rules (tile-opaque … nine-slice) in the sidecar; `art-check` decodes and tests valid/invalid examples; public `artMeta` module (UF-P8, R26) for size/bbox/slice/bytes; prompts/refs/masters never bundled; proven on an empty tree and representative drops in UF-2 before C2 is frozen. |
| R1-2 Round trip and recipes | Owned by UA (pilot pack, R23); UF supplies the decoder (Pack 0b) that must work before UA-A lands, and `art-check` accepts the processor's output paths. |
| R1-3 Repeatability | Sidecar carries ground-contact point and role; `art-check` validates it for `figure`/`boss-figure`; the processor test itself is UA's. Floor-variant mixed-neighbour test lives in UA's contact sheet. |
| R1-4 UX-G1 real-size | UF-7 is final-review only; anchors use `art:sheet` views (R22); Gallery greyscale toggle (UF-6) available. |
| R1-5 Inventory vs game | `src/ui/art/inventory.ts` + `inventory:` test in Pack 0b (R27): every ENEMY_IDS/rival/boss/loot kind (incl. key)/real threshold lock maps to ArtId, alias or vector fallback. |
| R1-6 Split Wave 0, fixture route | Pack 0a/0b/0c (§5); 0c proves the router bootstrap via `go(…, {replace:true})` with memory backend before the singleton, local-save sentinel, second fixture, absent production loader, state assertions; Pack D partitioned by first consumer with named recipes (UF-P6, R21). |
| R1-7 Ownership/prereqs | Lockfile grant and ordering for UA-A (R24); actual theme import/preload location in UF-5; UF-7 named as final-review dependency; fast-gate before commits kept. District-glob narrowing and pack ordering are UA's (see ux-art-plan.md §11). |
| R1-8 Readability/offline gates | UF-P4: three enforcement layers (token test, overlay-component source test, rendered colour/greyscale pairs); `art:check` in both `check` and `check:fast`; built precache, fonts and inlined assets inspected and offline cold reload at the pilot and Close (R25). |
| R3-5 Map coordinates | UF provides `artMeta` bbox in master pixels (R26) and the map transform rule is R19; UT applies it. |
| R3-6 Fixture reachability | R21 recipes: `game.found`, `threshold.solved` (lock-solve recording replay), three wipe payloads, Cartographers checkpoint for start-point, deterministic replay start board/events for frozen chain, wait-for-mounted testids; per-consumer partition; UF-14/15 are verification dependencies. |
| Should-fix: fonts | UF-P1 two faces, OFL notices and named sources; Kalam only as a player question. |
| Should-fix: C7/device | Props frozen after rendering a Study and a two-line fight header; accessible names, back route/callback, status snippet, crest adapter, reduced-motion getter; prefs scoped (UF-P12a). |
