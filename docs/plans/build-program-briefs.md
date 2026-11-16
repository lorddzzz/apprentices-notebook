# Build program: briefs for the packs not started yet

Spawn `pack-worker` with the role's model and effort and paste one brief as written ([templates](../../.claude/skills/implement/templates.md)). Delete a brief when its pack merges. A routine window runs these; a design window writes the next ones (listed at the end). Written in the design window of 2026-11-17 (EN-G0 go; the ending's Packs W1 and E–L; DEV-1; platform-closure Pack N). The decisions behind them: [ending-plan.md](ending-plan.md) P29–P37, DESIGN §11 and TECH §7, 2026-11-17.

## Order for the routine windows

A pack starts when the packs in its "Starts when" are merged. Run two or three at a time; packs on one row own disjoint files.

| Wave | Packs (together) | Model / effort | Starts when |
|---|---|---|---|
| 23 | **DEV-1** generator page scrolls (minutes; start it with the others and merge it first) · **EN-W1** contracts and failing tests for the ending · **MET-1** the drawable rules' `met` keys · **N1** close-out records (CL-1, CL-2, CL-3, CL-6; docs only, so it may run as a fourth) | Haiku 5.5 high · Sonnet 5.5 high · Sonnet 5.5 medium · Sonnet 5.5 medium | now (main d13f93a + this window's docs; read CI first) |
| 24 | **E** generator and `inkedPage` (EN-2, EN-3) · **H** drawing table (EN-6) | Sonnet 5.5 high (→ Opus 5.5 high) · Sonnet 5.5 medium | EN-W1 (E also MET-1) |
| 25 | **I** kits: Seam, canals, quarter (EN-K1–K3) · **G** worker and map nodes (EN-4, EN-7) · **F2** loot by depth (EN-8) | Sonnet 5.5 medium · Sonnet 5.5 medium · Sonnet 5.5 medium | E (G also H: both edit `src/app/flow.ts`) |
| 26 | **J** kits: bathhouses, bridges (EN-K4, EN-K5) · **K** kits: foundry, cartographers (EN-K6, EN-K7) | Sonnet 5.5 high · Sonnet 5.5 high | I (the kit pattern) |
| any, after E | **L** handover and credits (EN-10, EN-11) | Sonnet 5.5 medium | E **and EN-G2** (the player approves [ending-text.md](../design/ending-text.md)); the one pack a player gate holds |
| quiet | **N2** five code reviews, records, ledger (CL-4, CL-5): a design-window agent, not a `pack-worker` | strongest model, high | no pack running in `src/app` or `src/ui`; best after wave 26 |
| last | **EN-14** the ending's Close (orchestrator), then CAL | design window | every pack above |

File clashes and how the order avoids them:
- `src/app/flow.ts`, `src/app/routes.ts`, `src/app/App.svelte`: H (wave 24), then G (25), then L. Never two of them at once.
- `src/engine/drawing/kits/index.ts`, `frames/index.ts`, `tests/drawing/acceptance.test.ts`: I, J, K and F2 each add or unmark their own lines; merge conflicts there are one line and are resolved by keeping both.
- `src/engine/districts/inkedPage.ts`: E creates it; afterwards only F2 edits it (its offers).
- `src/engine/trip/finish.ts`: MET-1 (wave 23, `metIn`), then E (wave 24, the `sandbox` guard). `tests/drawing/palette.test.ts`: MET-1, then I.
- Sims: E runs `tests/sim/generator.test.ts` and `tests/sim/household-sweep.test.ts` (it adds a district id). No other pack runs `tests/sim`.
- Phone checks: DEV-1, H, G and L check themselves (new pages or interactions). I, J, K, F2, E, EN-W1 start no browser.

Every brief's "Owed by this pack" items are also in the status file's Owed list.

---

## DEV-1 (wave 23; Fast: Haiku 5.5 high)

```
Small pack DEV-1 (build-program-status.md, Next): make the generator dev page scroll on a phone.

Read: src/ui/theme.css lines 100-125 (the cause); src/app/dev/generator.html and generator.ts; pattern: none needed.
Own: src/app/dev/generator.html, src/app/dev/generator.ts, src/app/dev/Generator.svelte (its <style> only), tests/app/dev-generator-page.test.ts (new). Everything else is read-only; do not edit theme.css (the game needs its scroll lock).

The cause (traced): the page imports src/ui/theme.css, which sets `html, body { height: 100%; overscroll-behavior: none }` and `#app { height: 100dvh; overflow: hidden }`. The dev page mounts into `<div id="app">`, so everything below the first screen is clipped and the body cannot scroll in iOS Safari. The 20 sample rooms sit below the summary.

Contract:
- generator.html mounts into `<div id="dev">` (not `#app`); generator.ts looks up `#dev`.
- Generator.svelte's global style lets the document scroll on this page only: `:global(html), :global(body) { height: auto; min-height: 100%; overflow-y: auto; overscroll-behavior: auto; }` and adds `padding-bottom: env(safe-area-inset-bottom)` to `main`.
- No change to what the page computes or shows; no engine file is touched.
Owed by this pack: nothing.

Done when:
- test `DEV-1: the generator page does not mount into the scroll-locked #app` passes (reads generator.html and generator.ts as text: no `id="app"`, and the mount target is `#dev`).
- Phone check at 375x812 (mobile preset): open /apprentices-notebook/src/app/dev/generator.html, press "Run 20", wait for 20 rows; `document.scrollingElement.scrollHeight > window.innerHeight` is true; scroll to the bottom; screenshot showing the board of seed 20. Report that real iOS Safari was not checked (the player confirms on the phone).
- svelte-autofixer run on Generator.svelte.

Verify: `pnpm vitest run tests/app/dev-generator-page.test.ts --reporter=dot`
Phone check: yes, port 5190.
```

---

## MET-1 (wave 23; Default: Sonnet 5.5 medium)

Found in this window: `paletteOf` offers a rule only when the rule declares a `met` key the profile holds (DK-E4), and only `bridges:collapse` declares one (`met: 'span'`). So a household could draw no other rule. This pack is the owed half of DK-E4.

```
Small pack MET-1 (ending-plan P3; district-kit request DK-E4): the six drawable rules declare their `met` key.

Read: ending-plan.md §2 row P3; src/engine/drawing/palette.ts (how `rules` is derived) and `metIn` in src/engine/trip/finish.ts (how keys are recorded); pattern: `COLLAPSE_RULE` in src/engine/districts/bridges.ts (`met: 'span'`, the key its span piece's `bench.met` records).
Own: one `met:` line on each of five rules: 'canals:current' (src/engine/districts/canals.ts), `WRITS_RULE_ID` (src/engine/districts/inkQuarter/writs.ts), `BOIL_OVER_RULE_ID` (src/engine/districts/bathhouses/boilOver.ts), `BELLS_RULE_ID` (src/engine/districts/foundry.ts), `PENCIL_RULE_ID` (src/engine/districts/cartographers/guildHand.ts);
     src/data/types.ts (`Meets`, only if a new key is needed) and `metIn` in src/engine/trip/finish.ts (only to record a new key);
     tests/drawing/palette.test.ts (new cases), tests/drawing/met-keys.test.ts (new).

Contract:
- `BoardRule.met?: string` is "met once a fight ran under the rule". For each of the five rules choose a key that the district's fights already record and that no fight outside that rule records (a piece's `bench.met` that only this rule's rooms hold). The Seam has water and vents, so 'water' and 'vent' are not valid keys for the current and boil-over.
- Where no such key exists, add one `Meets` value (`'current'`, `'boilOver'`, ...) and record it in `metIn` when the battle's active rules include the rule's id. A lower-Seam intrusion must not record it (P3: an intrusion counts only for its piece): record it only when the rule is district-scoped or the battle's district is the rule's own.
- A key already recorded changes no save and no golden. A new key adds one entry to `profile.met` after fights in that district: re-store the affected goldens with `RECORD_GOLDEN=replay pnpm vitest run tests/run/golden.test.ts` and list each fixture and its diff in the report. A golden diff that is more than the new `met` entry is a Proposal: stop and report it.
- No other behaviour changes; the Bench palette (which reads the same keys) offers nothing new.
Owed by this pack: "From EF (EN-5): rule `met` keys mostly unwired".

Done when:
- tests `MET-1: each of the six drawable rules declares a met key`, `MET-1: a fight in the rule's district records its key`, `MET-1: a lower-Seam floor records the piece but not the rule`, `MET-1: the palette offers a rule only after a fight under it` pass.
- tests/drawing/palette.test.ts, tests/app/bench*.test.ts and tests/run/golden.test.ts pass (goldens re-stored only as described).

Verify: `pnpm vitest run tests/drawing tests/run/golden.test.ts tests/app/bench.test.ts tests/app/bench-registry.test.ts --reporter=dot`
Phone check: no.
```

---

## EN-W1 (wave 23; Strong: Sonnet 5.5 high)

```
Pack W1 of docs/plans/ending-plan.md: task EN-W1 (Wave 0 for Packs E-L; engine, tests-first).

Read: ending-plan.md §2 rows P28-P35 and §5 Packs W1, E, F, I-L (the test titles); docs/design/ending.md §1.4; pattern: tests/drawing/acceptance.test.ts (EN-W0's file, which you extend) and src/engine/districts/lowerSeam.ts (a module with per-trip rooms).
Own: src/data/drawing.ts (GEN_LIMITS, MASTER_HOME only; change no existing number);
     src/engine/drawing/types.ts, generate.ts, profile.ts, index.ts;
     src/engine/drawing/trip.ts (new), kits/index.ts, kits/seam.ts, kits/canals.ts, frames/index.ts, frames/marginalia.ts (new);
     src/engine/districts/types.ts (two additive, optional members, below); src/engine/trip/start.ts and src/engine/trip/shape.ts (`newTripKit`) for the `page` option;
     tests/drawing/** and tests/districts/inkedPage/** (new folder).
     Do not create the `inkedPage` district or touch `DistrictId` (Pack E does).

Define these contracts (signatures are decided; report anything you had to change as a Proposal):
1. src/data/drawing.ts
   export const GEN_LIMITS = { attempts: 4, heartAttempts: 3, rounds: 12, heartRounds: 16, draws: 8,
     foeDistance: 3, blockedShare: 0.3, phone: { medianMs: 500, p95Ms: 2000 } } as const;
   export const MASTER_HOME: Record<MasterId, DistrictId> = { marginalia: 'seam', mother: 'canals', lamplighter: 'canals',
     postmaster: 'inkQuarter', bathSteward: 'bathhouses', chiefWarden: 'bridges', carillonneur: 'foundry', registrar: 'cartographers' };
   generate.ts keeps exporting ROOM_ROUNDS, MAX_ATTEMPTS, MIN_FOE_DISTANCE, BLOCKED_SHARE, MAX_DRAWS, now read from GEN_LIMITS. Same values.
2. Registries (P34): kits/index.ts `export const GEN_KITS: readonly GenKit[]`; frames/index.ts `export const HEART_FRAMES: Partial<Record<MasterId, HeartFrame>>`.
   Move the spike's SEAM_KIT and CANALS_KIT out of generate.ts into kits/seam.ts and kits/canals.ts unchanged; `SPIKE_KITS` stays exported as an alias of GEN_KITS; `specFor` reads GEN_KITS.
   frames/marginalia.ts: a minimal frame from the Seam module's `heart` (HeartSetup): size 7x7, no escorts, `ruleAt: []`, `fallback` = `setup.frame` on a blank 7x7 board at seed 0, cost `COSTS.hearts.marginalia`, needs `NEEDS.marginalia ?? []` (P35; EN-K1 replaces it).
3. types.ts: `ShapeKit` gains `shape: TripShapeDef` (P33). Add
   export interface InkedTripState { slot: 0 | 1 | 2; drawing: Drawing; rooms: (string | null)[]; inner: Json }
4. trip.ts (stubs that throw `notBuilt('EN-3')`, except parse):
   export function parseInkedState(raw: unknown): InkedTripState            // built: strict, throws on a bad shape; `readDrawing` for the drawing
   export function roomInput(p: Profile, t: Trip, room?: number): GenInput   // seed t.seed, party t.party, the snapshot drawing
   export function storeRoom(t: Trip, room: number, layout: string): Trip    // throws if a different layout is stored there
   export function inkRoom(p: Profile, t: Trip, room?: number): Trip         // stored already: returns `t` itself
5. profile.ts (built now, small):
   export function storeDrawing(p: Profile, slot: 0 | 1 | 2, d: Drawing | null, trip: Trip | null): Profile
   Throws when `checkDrawing(p, d)` is not empty (message: the first issue's reason), when `endingOf(p).handover` is false, or when `trip` is a drawn trip using `slot` (read `trip.kit.state` through `parseInkedState`; a trip of another district never locks). `null` clears the slot. Stores `drawings` only once non-empty (P22).
6. districts/types.ts: `TripShapeDef.initState(p?: Profile, opts?: { page?: number }): S` and `DistrictModule.sandbox?: true` (doc: "a drawn district: its trips give no hearing, heart, key, recruit, rival page or lore", P16; nothing reads it yet).
   trip/start.ts: `startTrip(p, seed, district, opts: { at?: StartAt; page?: 0 | 1 | 2 })` passes `{ page }` to `newTripKit(shape, p, opts)` and on to `initState`. Every existing shape ignores it; behaviour for all eight districts is identical.
7. Acceptance tests: in tests/drawing/acceptance.test.ts turn each `it.todo` of Packs E, F (EN-8), I, J, K and EN-10/EN-11 into a real test marked `it.fails` wherever the setup can exist on your contracts (it must fail for the right reason: a `not built` stub, a missing kit, a missing module); leave `it.todo` only where it cannot (say why in one comment line each). Titles unchanged. Add as `it.fails`:
   `EN-K: every element a full household can offer has a kit` (a profile with every district open and every heart cleared: each id in `paletteOf(p)` has a kit in GEN_KITS or a frame in HEART_FRAMES);
   `EN-3: beginEncounter on a room that is not inked throws`;
   `EN-3: a drawn trip leaves city.hearts, city.heard and recruits as they were`.
   The trip tests go in tests/districts/inkedPage/trip.test.ts, the generator tests in tests/drawing/generator.test.ts, the rest stay in acceptance.test.ts. Fixture drawings: export `FIXTURE_DRAWINGS` from tests/drawing/fixtures.ts (plain Seam; the current with eel and moth; lengths 3 and 6; hearts marginalia and mother).

Report the public interfaces, the invariants, the integration risks, and everything you declared that later tasks must fill in (the Owed list).
Owed by this pack: the limits EN-G0 decided (GEN_LIMITS); nothing else.

Done when:
- EN-W1: tests named `EN-W1: GEN_LIMITS carries the spike's limits`, `EN-W1: the registries hold the spike's kits`, `EN-W1: storeDrawing refuses an unfit drawing and a page in use`, `EN-W1: startTrip passes the page to the shape` pass.
- Behaviour-neutral: tests/drawing/palette.test.ts, tests/districts/trip-shapes-lent.test.ts, tests/districts/lower-seam-trip.test.ts and tests/run/golden.test.ts pass unchanged.
- No balance number changes (GEN_TUNING, COSTS, WEIGHT_BANDS untouched).

Verify: `pnpm vitest run tests/drawing tests/districts/inkedPage tests/districts/trip-shapes-lent.test.ts --reporter=dot`
Sims: run `tests/sim/generator.test.ts` once after the kit move (the summary line it prints must be identical to main's: firstTry 0.448, withinTwo 0.732, dull 28, fallbacks 0).
```

---

## Pack E (wave 24; Strong: Sonnet 5.5 high, escalation Opus 5.5 high)

```
Pack E of docs/plans/ending-plan.md: tasks EN-2 -> EN-3.

Read: ending-plan.md §2 rows P1, P7-P10, P15, P16, P28, P31-P35 and §5 Pack E; docs/design/ending.md §1.4; pattern: src/engine/districts/lowerSeam.ts with src/data/districts/lowerSeam.ts (a trip-only district whose module supplies `encounter` and `length`).
Own: src/engine/drawing/generate.ts, trip.ts, index.ts; src/engine/districts/inkedPage.ts (new); src/data/districts/inkedPage.ts (new);
     the registration lines: src/data/types.ts (`DistrictId` gains 'inkedPage'), src/data/districts/index.ts (`DISTRICTS`, and `DISTRICT_IDS` with 'inkedPage' LAST, after 'lowerSeam'; not in `PLAYABLE_DISTRICTS`), src/engine/districts/kit.ts (INKED_PAGE_MODULE last);
     the places that already single out 'lowerSeam' as a trip-only district, one line each where the compiler or a test asks: src/engine/drawing/palette.ts, src/engine/outOfRoom.ts, src/data/loot.ts, src/app/city.ts (`mapNodes` must not list it), src/ui/screens/Map.svelte, src/ui/components/map/SetOutSheet.svelte, src/ui/screens/Cleared.svelte (run `grep -rn lowerSeam src` and treat 'inkedPage' the same; no new UI);
     the P16 guards: src/engine/city.ts (line ~104 adds `t.district` to `city.hearts`), src/engine/hearing.ts, src/engine/trip/crossroads.ts and finish.ts, each reading `KIT.modules[d]?.sandbox`;
     tests/drawing/generator.test.ts, tests/districts/inkedPage/**, the EN-2/EN-3/EN-5 lines of tests/drawing/acceptance.test.ts, tests/sim/generator.test.ts (only if an import moved).
     Read-only: kits/**, frames/** (Packs I-K), palette logic, GEN_TUNING and GEN_LIMITS values.

Contract (on main after EN-W1):
- export function generateRoom(input: GenInput): GeneratedRoom  // now also for the heart index (P35) and with kits from GEN_KITS
- export function checkGenerated(layout: BoardSpec, spec: GenSpec): GenIssue[]  // the full P9 oracle
- trip.ts: roomInput, storeRoom, inkRoom, parseInkedState, InkedTripState { slot; drawing; rooms: (string | null)[]; inner: Json } as EN-W1 declared them.
- INKED_PAGE_MODULE: DistrictModule = { id: 'inkedPage', sandbox: true, trip: INKED_TRIP (id 'inkedPage:page'), length: (t) => state.drawing.length, encounter, isOpen: (p) => endingOf(p).handover && drawingsOf(p).some((d) => d !== null) }.
Invariants:
1. Snapshot (P1): `initState(p, { page })` copies the drawing with `cloneData`; throws without a page, on an empty slot, or when `checkDrawing(p, d)` is not empty. After that nothing in the trip reads `profile.drawings`.
2. Rooms (P31): `encounter(t, i)` is pure and cheap: id `inkedPage:<slot>:<i>`, title `<name>, room <i+1>` (the last: `<name>: the heart`), `depth: i + 1`, `heart: i === length - 1`, layout = the stored layout or a fixed 5x5 placeholder; it never runs the bot. `beginEncounter` on a room with no stored layout throws `Room <n> is not inked` (throw it from the shape's `roomSetup`). `inkRoom` on a stored room returns the same trip object.
3. Determinism: the same profile and trip give the same layout, attempts and ops; every draw comes from `deriveSeed(t.seed, salt)` with salts 7000-7999 only (EN_SALT); no clock, no `Math.random()`.
4. The walk (P28) and the limits are unchanged: read GEN_TUNING and GEN_LIMITS, change no number. A heart: the frame from HEART_FRAMES (`setup.frame` on the frame's size, the drawing's rule stamped only on `ruleAt` tiles, escorts placed), judged at `heartRounds` for `heartAttempts`, then the frame's `fallback` board. A master with no frame, or an element with no kit, throws `RangeError('No kit for <id>')`.
5. Production pipeline (P8): size from depth and kit hints, Seam ground, rule stamp through `RuleKit.stamp`, extra pieces in descending `PieceKit.matters` order through `place`, start points, foes by budget at Manhattan distance >= GEN_LIMITS.foeDistance from every P and passing `FoeKit.valid`.
6. Rule and shape (P15, P33): the shape's `roomSetup` returns `{ activate: [drawing.rule] }` (when not null) merged with the lent shape's own setup; the lent shape is `ShapeKit.shape` for `drawing.shape` ('plain' -> `KIT.shapes['seam:plain']`, 'canals:landings' -> `KIT.shapes['canals:landings']`), called with a ShapeInput whose `state` is `inner` and `length` is the drawing's; its `returnBlocks`, `choices`, `afterRoom` and `offersFor` pass through. `src/data/districts/inkedPage.ts` has `ret: { kind: 'any' }` and no checkpoint.
7. P16: a drawn trip (win, return or wipe) never changes `city.heard`, `city.open`, `city.hearts`, `city.checkpoints`, recruits, keys, rival pages or lore papers. It does bank loot, proof, Glyph records, footnote points, witnessed lines, `met`, `foesMet` and the ledger like any trip.
8. Loot until EN-8: every room reads the Seam's deepest table with 1 pick, the heart 2 (EN-8 replaces this through `offersFor`).
Owed by this pack: EN-2 the walk and the limits (read GEN_LIMITS everywhere, no literal left in generate.ts); EN-3 `inkedPage`; `DistrictModule.sandbox` read by the guards; `EN-5: every offered combination generates` (P23), scoped to elements that have a kit.

Accepted test changes (list each in the report; anything else is a Proposal): tests/data/integrity.test.ts expects `DISTRICT_IDS` of length 9 ending 'lowerSeam', 'inkedPage'; any test that enumerates districts and needs 'inkedPage' skipped the way it skips 'lowerSeam'.

Done when:
- EN-2: tests `EN-5: every offered combination generates`, `EN-2: checkGenerated is green on every seed of every fixture drawing`, `EN-2: same input gives the same layout, attempts and ops`, `EN-2: no foe starts within distance 2 of any P`, `EN-2: depth bands scale the foe budget`, `EN-2: unverified fallbacks are zero` pass with their markers removed and otherwise unchanged.
- EN-3: tests `EN-3: trips of length 3 and 6 start, reload, return and wipe`, `EN-3: reload replays stored layouts without running the bot`, `EN-3: a redraw during a trip changes nothing`, `EN-3: no hearing, heart, page or recruit is given`, `EN-3: beginEncounter on a room that is not inked throws`, `EN-3: a drawn trip leaves city.hearts, city.heard and recruits as they were` pass with their markers removed.
- The three EN-S1 and five EN-S2 tests pass unchanged; the goldens (tests/run/golden.test.ts) pass unchanged; saves of the eight districts are byte-identical.

Verify: `pnpm vitest run tests/drawing tests/districts/inkedPage tests/data/integrity.test.ts --reporter=dot`
Phone check: no.
Sims: run `tests/sim/generator.test.ts` for EN-2 and `tests/sim/household-sweep.test.ts` for EN-3 (a district id is added).
```

---

## Pack H (wave 24; Default: Sonnet 5.5 medium)

```
Pack H of docs/plans/ending-plan.md: task EN-6 (the drawing table; one new screen with new interactions).

Read: ending-plan.md §2 rows P2-P7 and §5 Pack H; docs/design/ending.md §1.3; pattern: src/ui/screens/Desk.svelte with src/app/desk.ts (a profile-editing screen and its view model).
Own: src/app/drawing.ts (new), tests/app/drawing.test.ts (new), src/ui/screens/DrawingTable.svelte (new), src/ui/components/drawing/** (new);
     one branch each for the new route `drawing`: src/app/routes.ts (`Route`, `ROUTES`), src/app/flow.ts (`Screen` gains 'drawingTable'; `resolveScreen`: `route === 'drawing' && !trip && !wipe && endingOf(profile).handover`; add the profile as an optional last parameter, default: closed), src/app/App.svelte (one `{:else if}`), tests/app/flow.test.ts (new cases only);
     src/ui/screens/Desk.svelte: one link row "The drawing table", shown only when `endingOf(p).handover`;
     src/ui/screens/galleryFixtures.ts and Gallery.svelte: fixtures for the states below.
     Read-only: src/engine/** (the engine side is done: paletteOf, penOf, costOf, weightBand, checkDrawing, storeDrawing, drawingsOf, DRAWING_SLOTS, NAME_MAX).

Contract (src/app/drawing.ts; app logic is tested first):
  export type PickElement = 'rule' | 'foe' | 'piece' | 'shape' | 'heart';
  export interface ElementRow { element: PickElement; id: string; label: string; cost: number; picked: boolean; greyed: string | null }
  export interface TableView { slots: (Drawing | null)[]; draft: Drawing; pen: Pen; cost: number; band: WeightBand; depth: string;
    rows: Record<PickElement, ElementRow[]>; issues: Issue[]; canSave: boolean; locked: boolean }
  export function blankDrawing(p: Profile): Drawing             // plain, length 3, no rule, the first master of the palette
  export function tableView(p: Profile, slot: 0 | 1 | 2, draft: Drawing | null, trip: Trip | null): TableView
  export function toggle(draft: Drawing, element: PickElement, id: string): Drawing   // rule, shape, heart: one of; foes at most 3; pieces at most 2
  export function saveDraft(save: SaveData, slot: 0 | 1 | 2, draft: Drawing | null): SaveData   // through storeDrawing
Invariants:
- Rows come only from `paletteOf(p)` (unmet content is never listed), plus "none" for the rule and "plain" for the shape.
- `greyed` is the sentence of the `checkDrawing` issue for that row's id on the draft with that element picked (the NEEDS reason), or null. A greyed row stays visible with its sentence and cannot be picked ("the table never hides why").
- `canSave` is `issues.length === 0 && !locked`; over the pen shows the pen issue's sentence. Each page has the whole pen.
- `depth` is the band as words: light "a shallow page", medium "a deep page", heavy "the deepest page". Costs and bands come from the engine; no number is written in the UI.
- An empty slot reads "a district not yet drawn". The name field: trimmed, 1 to NAME_MAX characters, rendered as text (never as HTML).
- Svelte 5 runes only; svelte-autofixer on every new component.
Owed by this pack: `Profile.drawings` is written here (through storeDrawing).

Done when:
- EN-6: tests `EN-6: rows list only the palette`, `EN-6: a row whose need is unmet is greyed with its sentence`, `EN-6: an over-budget draft cannot be saved and says why`, `EN-6: a fourth foe or a third piece is refused`, `EN-6: a page in use by a trip is locked`, `EN-6: the table is closed before the handover` pass.
- Screens at 375x812 (light; dark too if the theme has it), from Gallery fixtures: three empty pages; a full drawing that fits; an over-budget drawing with the pen line; two greyed rows showing their sentences; the name field focused with the keyboard up; the locked state. Nothing overlaps, every tap target is at least 44 px.

Verify: `pnpm vitest run tests/app/drawing.test.ts tests/app/flow.test.ts --reporter=dot`
Phone check: yes, port 5191.
```

---

## Pack I (wave 25; Default: Sonnet 5.5 medium)

```
Pack I of docs/plans/ending-plan.md: tasks EN-K1 -> EN-K2 -> EN-K3 (kits and heart frames for the Seam, the canals and the ink quarter).

Read: ending-plan.md §2 rows P4, P5, P13, P14, P15, P33-P35 and §5 Pack I; src/engine/drawing/types.ts (the kit and frame interfaces); pattern: src/engine/drawing/kits/canals.ts (the spike's kit) and each district's `heart` (HeartSetup) in src/engine/districts/{seam,canals,inkQuarter}.ts.
Own: src/engine/drawing/kits/{seam,canals,inkQuarter}.ts; src/engine/drawing/frames/{marginalia,lampMother,lamplighter,postmaster}.ts; your lines in kits/index.ts and frames/index.ts; tests/drawing/kits-a.test.ts (new); the EN-K1..K3 lines of tests/drawing/acceptance.test.ts;
     src/engine/drawing/palette.ts (one change: `shapes` also lists a module's lent `shapes` ids except 'seam:plain', once that district is open) and its test file.
     Read-only: every file under src/engine/districts/ and src/data/districts/ (P14: no district file is edited; import their exported helpers).

Contract (on main):
  interface RuleKit { id: RuleId; needs; brings: readonly PieceId[]; stamp(layout, seed, minimum): BoardSpec }
  interface PieceKit { id: PieceId; needs; cost: number; place(layout, seed): BoardSpec | null; matters(layout): number; valid(layout): boolean }
  interface FoeKit { id: EnemyId; needs; budget: number; habitat: Habitat; valid(layout, at): boolean }
  interface ShapeKit { id: ShapeId; needs; lengths: readonly Drawing['length'][]; shape: TripShapeDef }
  interface HeartFrame { master: MasterId; needs; cost: number; size; setup: HeartSetup; escorts: readonly EnemyId[]; ruleAt: readonly Coord[]; fallback: BoardSpec }
Invariants:
- `needs` is always `NEEDS[id] ?? []` and costs come from `COSTS` (src/data/drawing.ts); a kit writes no number of its own except a foe's `budget` in minion-equivalents (1 minion, 2 elite, from `ENEMIES[id].elite`).
- Kits list only plain foes (no boss, rival, stand-in or bystander); the masters are frames.
- A lent shape works at lengths 3 to 6 (P15): landings = rooms 1, 3, 5 that exist (already `canals:landings`); terms = one termed card each room, none at the heart, under id 'inkQuarter:terms'.
- A frame's `fallback` is an authored board that passes `checkGenerated` and is won by a fixed action script stored in the test (a scripted solve, not a bot win rate). The Lamplighter plays his usual rival routine and his page is not awarded (P16).
- Everything is pure and seeded; no balance tuning (report the bot's pass rate per frame, do not chase it).
Owed by this pack: EN-K1 replaces EN-W1's stub Marginalia frame; `canals:landings` is offered by the palette once the canals are open (P33); if this pack merges after J and K, remove the `it.fails` marker of `EN-K: every element a full household can offer has a kit`.

Done when:
- EN-K1: `EN-K1: the frame passes checkGenerated over 50 seeds`, `EN-K1: the fallback board passes checkGenerated and has a scripted solve`, `EN-K1: the bot trial ends within its op budget` pass.
- EN-K2: the same three titled `EN-K2: ...` for the lamp-mother and the Lamplighter frames, plus `EN-K2: eel and moth are greyed without water and lamps`, `EN-K2: landings are offered once the canals are open`.
- EN-K3: the same three titled `EN-K3: ...`, plus `EN-K3: no term at the heart`.
- tests/drawing/palette.test.ts and the Pack E tests pass (only the palette's new shape line may change an expectation: list it).

Verify: `pnpm vitest run tests/drawing --reporter=dot`
Phone check: no.
```

---

## Pack G (wave 25; Default: Sonnet 5.5 medium)

```
Pack G of docs/plans/ending-plan.md: tasks EN-4 -> EN-7 (the generation worker, then the drawn pages on the map).

Read: ending-plan.md §2 rows P12, P20, P31, P32, P36 and §5 Pack G; docs/design/ending.md §1.4 (first bullet) and docs/design/ending-text.md §4 (the lines to show); pattern: src/ui/districts/lowerSeam/ (index.ts, StairSlot.svelte: the slot under the Seam node) and src/app/city.ts `underSeam`.
Own: src/app/generation.ts and src/app/generation.worker.ts (new), tests/app/generation.test.ts (new);
     src/app/flow.ts (`setOut(save, district, opts?: { page?: 0 | 1 | 2 })`; nothing else), src/app/crossroads.ts (`setOutAt` passes the page), src/app/game.svelte.ts (the `setOut` and battle-start call sites, lines ~276-305: ink before the fight);
     src/app/city.ts (`UnderSeam` gains `pages`), tests/app/city-map.test.ts and tests/app/city.test.ts (new cases);
     src/ui/districts/inkedPage/** (new: index.ts, PagesSlot.svelte), one line in src/ui/districts/index.ts, src/ui/screens/Map.svelte (render the second slot under the Seam, after the stair), src/ui/components/map/SetOutSheet.svelte (a drawn page's sheet), the battle entry screen that shows the inking line (src/ui/screens/Combat.svelte or the wrapper game.svelte.ts drives).
     Read-only: src/engine/**.

Contract (P36):
  // src/app/generation.ts
  export interface RoomInker { ink(profile: Profile, trip: Trip, room: number): Promise<{ layout: string; ms: number }> }
  export const syncInker: RoomInker            // the engine directly: serializeBoard(generateRoom(roomInput(profile, trip, room)).layout)
  export function workerInker(): RoomInker     // new Worker(new URL('./generation.worker.ts', import.meta.url), { type: 'module' })
  export function requestRoom(save: SaveData, room: number, inker: RoomInker): Promise<SaveData>
  // src/app/generation.worker.ts
  export function handle(msg: { profile: Profile; trip: Trip; room: number }): { layout: string; ms: number }   // pure; `onmessage` only wraps it
Invariants:
- `requestRoom` stores through the engine's `storeRoom` only when the save's trip is still a drawn trip with the same `seed` and no layout for `room`; otherwise it returns the save it was given (a stale result is dropped, never an error).
- Room 1 is inked right after Set out; room n+1 is requested when the trip enters `looting`. The fight never starts on a room that is not stored: the screen shows "inking the room…" until it is, then `startBattle`.
- The worker and the synchronous path give the same layout for the same input (the engine is deterministic); messages are plain JSON (the profile and trip as saved).
- If `Worker` is unavailable or errors, fall back to `syncInker`.
- The map (DK-E5): under the Seam node, after the stair, up to three drawn pages in slot order, each a node that opens Set out for that page (name, depth words, rule and heart as text); with the handover done and no drawing, a blank page with the line "the rest is mine to draw". Before the handover nothing is drawn. `underSeam(p).pages: { slot: 0 | 1 | 2; name: string; band: WeightBand }[]`.
- Svelte 5 runes only; svelte-autofixer on every new or changed component.
Owed by this pack: BL-111's offline check (never done): after `pnpm build`, confirm the worker chunk is in the precache list of the generated service worker (`grep` the built sw file for the worker's file name) and report what could not be checked in a real browser; EN-4 `requestRoom`; EN-7 the map nodes.

Done when:
- EN-4: tests `EN-4: worker results equal the synchronous path` (`handle` against `syncInker` on the fixture drawings), `EN-4: a stale result is dropped`, `EN-4: a stored room is not inked again` pass. Phone check: Set out on a drawn page, win a room, pick loot, enter the next room: no stall; with an inker delayed by 1.5 s (a dev flag or test double) the "inking the room…" line shows. Screenshots of both.
- EN-7: tests `EN-7: the row under the Seam lists the stair, then up to three pages`, `EN-7: nothing overlaps with 0, 1 and 3 pages and five floors` (through `mapProblems`) pass. Screens at 375x812: the map with 0, 1 and 3 drawn pages and five lower floors; the Set out sheet of a drawn page; the blank page with its line.

Verify: `pnpm vitest run tests/app/generation.test.ts tests/app/city-map.test.ts tests/app/city.test.ts tests/app/flow.test.ts --reporter=dot`
Phone check: yes, port 5192.
```

---

## Pack F2 (wave 25; Default: Sonnet 5.5 medium)

```
Pack F (second half) of docs/plans/ending-plan.md: task EN-8 (loot by depth for drawn trips).

Read: ending-plan.md §2 rows P7, P16, P17 and §5 Pack F; docs/design/ending.md §1.4 (Rewards); pattern: src/engine/districts/bridges/guarantee.ts (derived offers) and `cartographersOffersFor` in src/engine/districts/cartographers/trip.ts (a shape's `offersFor`).
Own: src/engine/drawing/loot.ts (new); the offers of src/engine/districts/inkedPage.ts (`offersFor` on INKED_TRIP and, if needed, one `offerContributors` entry; no other part of the file); src/data/drawing.ts (`DRAWN_LOOT` only); tests/drawing/loot.test.ts (new); the EN-8 lines of tests/drawing/acceptance.test.ts.

Contract:
  export function sourcesOf(d: Drawing): DistrictId[]   // the districts the rule, foes, pieces, shape and heart come from: the id's prefix for KitIds, the kit that lists a foe (GEN_KITS), MASTER_HOME for the heart; 'seam' always
  export function drawnOffers(p: Profile, t: Trip, room: number): RoomOffers   // what `offersFor` returns
  // src/data/drawing.ts
  export const DRAWN_LOOT = { picks: { light: 1, medium: 1, heavy: 1 }, heavyPicksBeforeHeart: 2, heartPicks: 2,
    weights: { light: { page: 1, solvent: 1, ink: 3, vellum: 2 }, medium: { page: 2, solvent: 2, ink: 2, vellum: 2 }, heavy: { page: 3, solvent: 2, ink: 1, vellum: 1 } } } as const;
Invariants:
- Offers are rolled like `rollOffers` (seeded from the trip, same salts as any district); the table is derived once per trip from the snapshot drawing, never from `profile.drawings`.
- Entries: rune and method pages of the source districts' tables that the household lacks (a page it holds is never offered; duplicates become ink as everywhere), the solvents of the source districts only, ink reserve, vellum, the quiet doorway.
- Never a key, a recruit, a rival page, a lore paper or a hearing (P16).
- Heavy drawings give two picks in the room before the heart and at the heart (P7); the numbers above are defaults for CAL and are not tuned here.
Owed by this pack: EN-8 replaces Pack E's placeholder table.

Done when:
- EN-8: tests `EN-8: offers come only from source districts or basics`, `EN-8: a page you hold is never offered`, `EN-8: solvents come only from drawn districts` pass with their markers removed (each as a fuzz over the fixture drawings and 50 trip seeds: no throw), plus `EN-8: a heavy drawing gives two picks before the heart and at it`.
- Pack E's tests pass unchanged.

Verify: `pnpm vitest run tests/drawing tests/districts/inkedPage --reporter=dot`
Phone check: no.
```

---

## Pack J (wave 26; Strong: Sonnet 5.5 high)

```
Pack J of docs/plans/ending-plan.md: tasks EN-K4 -> EN-K5 (kits and heart frames for the bathhouses and the bridges).

Read: ending-plan.md §2 rows P4, P5, P13-P15, P33-P35 and §5 Pack J; src/engine/drawing/types.ts; pattern: Pack I's src/engine/drawing/kits/inkQuarter.ts and frames/postmaster.ts (a kit with a lent shape and a frame with an authored fallback).
Own: src/engine/drawing/kits/{bathhouses,bridges}.ts; src/engine/drawing/frames/{steward,chiefWarden}.ts; your lines in kits/index.ts and frames/index.ts; tests/drawing/kits-b.test.ts (new); the EN-K4 and EN-K5 lines of tests/drawing/acceptance.test.ts.
     Read-only: every file under src/engine/districts/ and src/data/districts/ (P14); import their exported helpers (`BATH_HEART_SETUP`, `BRIDGES_HEART`, the heat and span helpers).

Contract (on main): the kit and frame interfaces of src/engine/drawing/types.ts as Pack I used them (RuleKit.stamp, PieceKit.place/matters/valid, FoeKit.budget/valid, ShapeKit.shape, HeartFrame.fallback).
Invariants:
- `needs` is `NEEDS[id] ?? []`, costs from `COSTS`; foe budgets 1 minion, 2 elite; plain foes only.
- Rising heat (id 'bathhouses:heat'): heat 1 at room 1 rising to 4, spread over the trip's length, the heart always at 4, for every length 3 to 6. It needs boil-over on the drawing (NEEDS).
- Span choice (id 'bridges:span'): before each room after the first, a choice of sound or crumbling; the choice changes the next room's spec (sound: a bigger board and more foes within the walk's budget; crumbling: the collapse stamp at its fuller setting), never a variant pool (generated rooms have none). The party can never be stranded: every room keeps a walkable route from each P that survives the collapse rule's first step, checked by the kit's `valid`.
- The Chief Warden's frame stands him on the keystone with piers and spans and no span starts cracked; the Steward's frame stands him on a connected cloud of four or more tiles (the KIT-R3 frame tests name both properties).
- Each frame's `fallback` passes `checkGenerated` and is won by a fixed action script stored in the test. No tuning: report the bot's pass rate per frame.
Owed by this pack: if this pack merges after I and K, remove the `it.fails` marker of `EN-K: every element a full household can offer has a kit`.

Done when:
- EN-K4: `EN-K4: the frame passes checkGenerated over 50 seeds`, `EN-K4: the fallback board passes checkGenerated and has a scripted solve`, `EN-K4: the bot trial ends within its op budget`, `EN-K4: heat reaches 4 at the heart for every length` pass.
- EN-K5: the same three titled `EN-K5: ...`, plus `EN-K5: never stranded on a span choice`.
- Pack E's and Pack I's tests pass unchanged.

Verify: `pnpm vitest run tests/drawing --reporter=dot`
Phone check: no.
```

---

## Pack K (wave 26; Strong: Sonnet 5.5 high)

```
Pack K of docs/plans/ending-plan.md: tasks EN-K6 -> EN-K7 (kits and heart frames for the foundry and the Cartographers' hall).

Read: ending-plan.md §2 rows P4, P5, P13-P15, P33-P35 and §5 Pack K; src/engine/drawing/types.ts; pattern: Pack I's src/engine/drawing/kits/inkQuarter.ts and frames/postmaster.ts.
Own: src/engine/drawing/kits/{foundry,cartographers}.ts; src/engine/drawing/frames/{carillonneur,registrar}.ts; your lines in kits/index.ts and frames/index.ts; tests/drawing/kits-c.test.ts (new); the EN-K6 and EN-K7 lines of tests/drawing/acceptance.test.ts.
     Read-only: every file under src/engine/districts/ and src/data/districts/ (P14); import their exported helpers (`FOUNDRY_HEART_SETUP`, the great-bell lock stamps, `CARTOGRAPHERS_HEART_SETUP`, the guild hand's pencil config).

Contract (on main): the kit and frame interfaces of src/engine/drawing/types.ts as Pack I used them.
Invariants:
- `needs` is `NEEDS[id] ?? []`, costs from `COSTS`; foe budgets 1 minion, 2 elite; plain foes only (the Registrar's Tracer is an escort of his frame, not a palette foe).
- A peal (id 'foundry:peal'): one great bell per room before the heart, placed from the foundry's lock stamps; a bell hangs at the heart's hook tiles only if it was rung in its room. It needs bells on the drawing (NEEDS). The Carillonneur's frame has four hook tiles.
- Free-then-no-return (id 'cartographers:doorway'): free return through room ceil(length / 2), none after it, the heart always a return point, and no checkpoint (a generated trip remembers no room).
- Pencil and ink as a drawn rule: the rule kit's `stamp` lays pencil tiles; each room's guild-hand config is the hall's default pencil config (the hall's per-room table is not used).
- Each frame's `fallback` passes `checkGenerated` and is won by a fixed action script stored in the test. The headless bot does not win the foundry's heart today (a calibration item): expect that frame to reach its fallback, do not tune, and report the pass rate.
Owed by this pack: "Foundry: EN-K6 wraps the frame" (the Carillonneur's `HeartSetup` wrapped as a HeartFrame with its hooks); if this pack merges after I and J, remove the `it.fails` marker of `EN-K: every element a full household can offer has a kit`.

Done when:
- EN-K6: `EN-K6: the frame passes checkGenerated over 50 seeds`, `EN-K6: the fallback board passes checkGenerated and has a scripted solve`, `EN-K6: the bot trial ends within its op budget`, `EN-K6: bells hang only where rung` pass.
- EN-K7: the same three titled `EN-K7: ...`, plus `EN-K7: no return after the point and none needed at the heart`.
- Pack E's and Pack I's tests pass unchanged.

Verify: `pnpm vitest run tests/drawing --reporter=dot`
Phone check: no.
```

---

## Pack L (held for EN-G2; Default: Sonnet 5.5 medium)

Do not spawn until the player has approved [ending-text.md](../design/ending-text.md) (status file, Open questions) and Pack E is merged. If the approved text differs from the draft, the brief stands: the text is read from the file.

```
Pack L of docs/plans/ending-plan.md: tasks EN-10 -> EN-11 (the handover, then the credits).

Read: ending-plan.md §2 rows P16, P18, P20-P22 and §5 Pack L; docs/design/ending-text.md (the approved text, copied word for word); pattern: src/ui/screens/Cleared.svelte (a tap-through scene).
Own: src/data/ending.ts (new: the text as data), src/engine/drawing/ending.ts, tests/ending/** (new), the EN-10 and EN-11 lines of tests/drawing/acceptance.test.ts;
     src/ui/screens/Handover.svelte and Credits.svelte (new); routes `handover` and `credits`: src/app/routes.ts, src/app/flow.ts (`Screen`, `resolveScreen`: both need no trip and no wipe; `handover` needs `ownerDoor(p) === 'open'`), src/app/App.svelte (two branches), tests/app/flow.test.ts (new cases);
     src/ui/districts/lowerSeam/StairSlot.svelte, door.ts, DoorLine.svelte and tests/districts/lower-seam-door.test.ts (the door row on the map and SM-10's line, below);
     src/ui/screens/Codex.svelte (two replay entries), src/app/codexHousehold.ts only if the owner's row needs a line.

Contract:
  export function handover(p: Profile): Profile   // throws unless ownerDoor(p) === 'open'; idempotent
  export function creditsOf(p: Profile): Credits  // { districts, idioms, casts, trips, biggest } as src/engine/drawing/types.ts declares
  // src/data/ending.ts
  export const HANDOVER_PAGES: readonly string[]   // the scene's pages, in order
  export const CREDITS_LINES: { household: string; districts: string; idioms: string; noIdioms: string; counts: string; chain: string; close: string }
  export const ENDING_LINES: { door: string; doorSub: string; desk: string; deskSub: string; inTrip: string; blankPage: string }
Invariants:
- `handover`: `joinHousehold(p, 'owner')`; each rune of the owner's starter page other than Spark (Splash, Steam; read them from `OWNER.starterPage` in src/data/apprentices/owner.ts) is added to `known` only when missing (P18); `ending.handover` becomes true. Nothing else changes: no ink, vellum, proof, lattice of another member or city field. A second call returns the same profile.
- `creditsOf`: districts from `ledgerOf(p).districts` (opening order), idioms from the `idiom:` entries of `p.named`, casts and biggest from the ledger, trips from `p.city.trips`.
- P20: while the door is open and the handover is not done, the row under the Seam shows "The owner's door" and opens the scene (a free visit: no trip, no charges); afterwards it reads "Visit the owner's desk" and replays the scene. `doorLine`'s open state becomes `ENDING_LINES.inTrip` ("The door stands open. You can visit it from home."), a line and not a way through; `DOOR_PLACEHOLDER` is removed.
- The scene is tapped through page by page and can be left at any page without losing anything; `handover(p)` is applied when the last page is closed. The credits scroll, can be skipped at any moment, and set `ending.creditsSeen`. Both replay from the codex once seen.
- After the scene the owner's gifted pages are shown as learned ("from the owner's own pages"), only those that were missing.
- Svelte 5 runes only; svelte-autofixer on every new or changed component.
Owed by this pack: `ending.handover` set by EN-10 and `creditsSeen` by EN-11; SM-10's in-trip door line points home (P20).

Accepted test change: tests/districts/lower-seam-door.test.ts expects the open door's new label and sub line (list it in the report).

Done when:
- EN-10: tests `EN-10: the handover is hidden before the door opens`, `EN-10: the handover is idempotent`, `EN-10: nothing is lost on joining`, `EN-10: gifted pages are learned only when missing` pass with their markers removed. Phone check at 375x812: the door row on the map, every scene page, the gifted-pages line.
- EN-11: tests `EN-11: creditsOf lists districts in opening order`, `EN-11: creditsOf carries the ledger counts` pass with their markers removed. Phone check: the scroll, a skip, and both replays from the codex.

Verify: `pnpm vitest run tests/ending tests/drawing/acceptance.test.ts tests/districts/lower-seam-door.test.ts tests/app/flow.test.ts --reporter=dot`
Phone check: yes, port 5193.
```

---

## Close-outs: platform-closure Pack N

Pack N is split so its record work does not wait for the reviews. What the ledger and a `grep` of the records showed on 2026-11-17 (main d13f93a):
- DESIGN §11 has no "built" row for FD, DK, RV, FN, SM or IQ. TECH §7 has rows for DK (DK-18, DK-19) and none for FD, RV, FN, SM or IQ.
- Verification files exist for IQ, BH, BR, CN, HC, RC, AH; none for FD, DK, RV, FN, SM (SM-15) or the foundry.
- **The foundry never had its Close** (24 of 25 rows merged, BF-G1 open): no verification file, no full-loop phone check on record, no code review. This is **CL-6**, new.

### N1 (wave 23; Default: Sonnet 5.5 medium; docs only)

```
Pack N1 of docs/plans/platform-closure-plan.md: tasks CL-1 -> CL-2 -> CL-3, then CL-6's record half. Documentation only: change no file under src/ or tests/.

Read: platform-closure-plan.md §5 Pack N; docs/plans/build-program-log.md and build-program-log-archive.md (the rows of FD, DK, RV, FN, SM, IQ and BF tasks; `git log --grep '<ID>'` has each task's detail); pattern: docs/plans/ink-quarter-verification.md (the shape of a verification file) and the 2026-11-06 "Bathhouses built and open (BH)" rows of DESIGN.md §11 and TECH.md §7.
Own: DESIGN.md (§11: append rows only), TECH.md (§7: append rows only), docs/plans/{foundations,district-kit,rivals,footnotes,seam-grows,foundry}-verification.md (new), the `State:` lines of docs/plans/{foundations,district-kit,rivals,footnotes,seam-grows}-plan.md.

Contract:
- CL-1: one DESIGN §11 row per plan (FD, DK, RV, FN, SM, IQ), dated today, titled "<Plan> built (<prefix>)": the rules as built and the accepted build Proposals, marked *Proposal*, each traceable to a log row or commit. Check `grep -n` first and write only what is missing; never restate a rule an earlier row already records, link it.
- CL-2: one TECH §7 row per plan for FD, RV, FN, SM, IQ (DK has two): where the code lives, the contracts other plans rely on, the seed salts and save fields it added.
- CL-3 and CL-6: six verification files, each a table with columns Check | How | Result, where Result is "pass (<test file or commit>)" or "not checked". Every acceptance line of the plan's tasks appears once. Do not write "pass" for anything you cannot point at: a phone check with no screenshot on record is "not checked". The foundry file lists its Close checks (full gate, full-trip phone check, code review) as "not checked: CL-6, done by N2".
- Plain English, short sentences, no em dashes.
Owed by this pack: the close-out docs for FD, DK, RV, FN, SM, IQ (CL-1 to CL-3, SM-15); the foundry's verification file (CL-6).

Done when:
- CL-1: `grep -c "built (FD)\|built (DK)\|built (RV)\|built (FN)\|built (SM)\|built (IQ)" DESIGN.md` gives 6.
- CL-2: five new TECH §7 rows.
- CL-3: five files exist, each with a table; seam-grows-verification.md closes SM-15. CL-6: foundry-verification.md exists.
- `git diff --stat` shows only the owned files.

Verify: `node .claude/skills/implement/ledger.mjs docs/plans/build-program-log.md docs/plans/{platform-closure,seam-grows}-plan.md` (the output must still parse; SM-15 and CL-1..3 are recorded by the orchestrator's log rows).
Phone check: no.
```

### N2 (a design-window agent, strongest model, high effort; not a `pack-worker`)

Spawn as the skill's design window (one agent, in a worktree), when no pack is running in `src/app` or `src/ui`. Its instructions:

1. **CL-4**: one `code-review` run per subsystem, each on the files as they stand on `main`: (a) engine core and runes (`src/engine/*.ts` without `districts/`, `rivals/`, `drawing/`, `sim/`); (b) kit and districts (`src/engine/districts/**`, `src/engine/trip/**`, `src/data/districts/**`); (c) rivals (`src/engine/rivals/**`, `src/data/rivals*`); (d) footnotes and data (`src/engine/footnotes*`, `src/data/**` without districts); (e) UI board and app (`src/ui/**`, `src/app/**`). Start from the known findings in the status file's Rough edges (the cartographers' Close review items: `stampGap`'s duplicate mender misses, `bursts.ts::announce` stamping `coil:bell` on bursts that touch no bell, `'cartographers:pencil'` named in core files, `touchesBrassAt` duplicating `touchesBrass`, literals in engine code). Fix a finding in place when it is under 30 lines, changes no rule, and its tests pass unchanged; write every larger one as a brief in this file; move every number found in engine code to the calibration plan's list (no tuning).
2. **CL-6**: the foundry's Close: the full-trip phone check its plan lists (§6), the foundry's share of review run (b), then its plan `State:` line, the ROADMAP row and the "not checked" rows of `foundry-verification.md`.
3. **CL-5**: plan `State:` lines of every plan in the program, ROADMAP §2.3, the full `pnpm check` on `main`, and the ledger: every task it lists as open or "in the log's prose only" is either done or in the status file's Next (the ending's and CAL's open tasks stay listed until those plans close).
4. Record five CL rows and CL-6 in the log, with the review findings counted in the Note cell.

---

## Written in a later design window

| Pack | Tasks | Starts when |
|---|---|---|
| EN-14 | the ending's Close: full gate, the full-loop phone check (ending-plan §6), `code-review` of the generator, the kits and the ending, DESIGN §6.7 and §11, TECH §7, `ending-verification.md`, ledger | Packs E–L merged |
| Plan B (only if needed) | rooms validated at home into a pool (ending-plan P29) | the player's look through the 40 sample rooms finds more than 2 of 20 broken or dull |
| CAL | the calibration plan's packs (CAL-0 to CAL-5): briefs written when EN-14 closes | the end |
