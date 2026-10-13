# v0 UI + App Layer Implementation Plan

Scope: `src/app/`, `src/ui/`, `index.html`, `tests/app/`, plus DESIGN/TECH log rows. The engine (`src/engine/`, `src/data/`) is built in parallel per `engine-plan.md`; **its §9 API is the contract**. The UI never re-implements a rule: it calls engine functions, renders `BattleState`/`Profile`, and animates `GameEvent[]`.

Svelte 5 runes only. Run `svelte-autofixer` (Svelte MCP) on every new/changed `.svelte` file until clean. `pnpm check` green + one commit per step (`feat(ui): …`). Each step ends with the `verify` skill at 375×812.

---

## 0. Ground rules for implementers

1. **Immutable engine state goes in `$state.raw`, never `$state`.** The engine does `structuredClone(state)` inside `applyAction`; a deep `$state` proxy throws `DataCloneError` there. Every `BattleState`, `SaveData`, `Profile`, `Trip`, `Lattice`, `GameEvent[]` held by a store is `$state.raw` and replaced wholesale (`this.save = next`).
2. **Logic lives in plain `.ts` files** (pure functions, or classes with an injected clock/backend) and is tested in `tests/app/*.test.ts` (Vitest, node env, no DOM). `.svelte.ts` files are thin reactive wrappers: `$state.raw` fields + methods that call the plain functions. Tests never import `.svelte.ts` files or `router.svelte.ts` (module-level `location` access).
3. Reactive module state: export a class instance or a `const` object, never a reassigned `export let x = $state()` (Svelte can't export reassigned state across modules).
4. Components are dumb: props in, callbacks out (`onX` props, no `createEventDispatcher`). Screens read stores. Typed props via `interface Props` + `let {...}: Props = $props()`. Children via `Snippet`.
5. Expensive engine calls (`applyAction` previews, `legalMoves`) run **on tap** inside the input reducer and are stored in the input mode; templates only read results. `$derived` is fine for cheap reads (`viewOf(state)`, `compileLattice` on a lattice change).
6. Every tappable thing is ≥ 44×44 CSS px (visual can be smaller; extend with padding). Every board cell is an element with `role="button"` and an `aria-label` (e.g. `C4: rat, 2 of 2 HP, oil`) so `read_page`/`find` can drive and verify it. Key regions carry `data-testid` (listed per component).
7. Imports: `$engine`, `$data`, `$ui/*`. App code uses relative `../app/...` from `ui/` (no `$app` alias; don't add one).
8. Dev hook: `src/main.ts` does `if (import.meta.env.DEV) Object.assign(window, { __game: game, __lab: lab })` so verification can inspect state with `javascript_exec`. Never relied on by the game itself.

---

## 1. Screens and flow

### 1.1 Routes (hash router, existing `src/app/router.svelte.ts`)
`Route = 'study' | 'trip' | 'codex' | 'lab' | 'gallery'` (rename `combat` → `trip`; add `gallery`, a dev page of all visual pieces, linked only from the Lab).
- `#/study` workbench · `#/trip` whatever the current trip status shows · `#/codex` notebook back pages · `#/lab?scenario=<id>[&demo=1]` free play · `#/gallery[?part=board|lattice|glyphs]` visual fixtures.
- Router API (step U1): `parseHash`, `href(route, params?)` move to plain `src/app/routes.ts` (testable); `router.svelte.ts` keeps the reactive `router` object, guards `typeof location !== 'undefined'`, and adds `go(route, params?, { replace? })` (replace uses `history.replaceState` + manual re-parse, so redirects don't pile up history).

### 1.2 Screen resolution (pure, `src/app/flow.ts`)
```ts
export type Screen = 'study' | 'battle' | 'loot' | 'crossroads' | 'cleared' | 'wiped' | 'codex' | 'lab' | 'gallery';
export function resolveScreen(route: Route, trip: Trip | null, wipe: WipeSummary | null): { screen: Screen; redirect: Route | null };
```
| route | trip null, wipe null | trip null, wipe set | trip.status fight / looting / crossroads / cleared |
|---|---|---|---|
| study | study | wiped (redirect `trip`) | battle / loot / crossroads / cleared (redirect `trip`) |
| trip | study (redirect `study`) | wiped | battle / loot / crossroads / cleared |
| codex | codex | codex | codex (back link → `#/trip`) |
| lab / gallery | lab / gallery | same | same (lab never touches the save or the trip battle) |

`App.svelte`: `const res = $derived(resolveScreen(router.route, game.save.trip, game.wipe))`; an `$effect` calls `go(res.redirect, undefined, { replace: true })` when set; renders the screen. The trip **is** the source of truth: reload → the save's `trip.status` reopens the right screen; status `fight` with no live battle → `game.ensureBattle()` recreates it from the seed (DESIGN: closing mid-fight restarts that encounter).

### 1.3 Flow
```
Study ──door (confirm sheet)──▶ setOut(): save written, trip.status=fight ──▶ Battle
Battle ──won overlay "Gather the spoils"──▶ finishEncounter → Loot (picks 1, heart 2)
Loot ──take──▶ Crossroads (push on → Battle depth+1 | return home → Study, loot banked)
Loot after heart ──▶ Cleared ("The heart of the Seam is quiet") ──return home──▶ Study
Battle ──lost overlay "The party is wiped out"──▶ finishEncounter → Wiped (lost loot listed, discoveries kept) ──▶ Study
Codex reachable from Study (book button) and Crossroads/Loot ("Read the notebook"). Lab from Study menu.
```

### 1.4 Screen specs (portrait 375×812 first; real iPhone usable height ≈ 719 after safe areas)

**Study** (`screens/Study.svelte`, testids `study`, `lattice`, `shelf`, `inkpot`, `spells`, `door`). Column, no scroll:
1. `StudyScene` band 64px: rainy window, lamp glow (reuse the placeholder SVG shapes, scaled), title "The Study"; right: Codex button (book glyph, 44) and menu button (⋯, 44 → Sheet: Lab, Copy save, Paste save).
2. Bookmarks row 44px: two ribbon tabs (Draughtsman / Stoker, member colors) + `InkPot` on the right (pot glyph + `6/8`).
3. Notebook page, `flex: 1; min-height: 0; container-type: size`: ruled-paper background, `LatticeGrid` centered, socket size `--cell: min(56px, 100cqh / rows - 4px, 100cqw / cols - 4px)`. Top-right of page: Erase toggle (44).
4. Info region ≤ 84px: when a shelf rune is selected → `name · family · N ink` + its one-line rule; otherwise `SpellList` (each source: glyph + `describeSpell(s)` + charges `3`), tapping a spell focuses its flow path.
5. `RuneShelf` 2 rows × 7 slots of 48px (354 wide).
6. Door button 52px: "Set out into the Seam →" (disabled + reason if `validateLoadout` reports issues).

**Combat** (`screens/Combat.svelte` → `battle/BattleView.svelte`, testids `board`, `caption`, `party`, `actions`, `footer`). Column:
1. `TopBar` 32px: `Round 2 · The sentry post` · Log button.
2. Board region `flex: 1; min-height: 0`: `BattleBoard` SVG, `viewBox="-24 -24 624 824"` (100 units per cell + 24-unit label gutter, column letters A–F on top, row numbers 1–8 left), `width/height: 100%`, `preserveAspectRatio="xMidYMid meet"`. At 375 wide: 359/6.24 ≈ 57.5px cells → board ≈ 474px tall. At 719 usable height the board gets ≈ 467px → 56.7px cells. Never < 44px on any iPhone ≥ SE.
3. `Caption` 36px (2 lines, 13px): current event line during playback; otherwise the hint/inspect/preview text.
4. `PartyStrip` 52px: two member chips (color dot + name, HP pips, shield badge, ink blot if inked, status ticks `move ✓ act ✓`). Tap = select.
5. `ActionBar` 60px: for the selected member: one button per spell (source glyph + charges pips, 56×56), `Shove`, `Undo move`. Horizontal scroll if > 6 (not expected in v0).
6. `Footer` 48px: idle → `[Log] [End turn ▸]`; confirming → `[Cancel] [Confirm <Bolt right>]`.
Total ≈ 32 + 467 + 36 + 52 + 60 + 48 + gaps 24 = 719. Fits without scroll.

**Loot** (`screens/Loot.svelte`, testids `offers`): header "Spoils of <encounter title>" + `picks left: 1`; 3 `OfferCard`s stacked (88px each: glyph, name, one-line rule / "+2 ink for the Stoker" / "Research materials ×2"); tap = select (ring), `Take` button confirms (irreversible). `TripStatus` strip at the bottom (HP pips, charges left per spell, pending loot count, depth `2 / 4`).

**Crossroads** (`screens/Crossroads.svelte`, testids `push`, `return`): "The Seam goes on." `TripStatus` large (HP and charges matter here: the push-or-return tension), pending loot list (glyphs), two big buttons: `Push on: <next encounter title> (depth n)` and `Return home (keep N finds)`. Link "Read the notebook".

**Cleared**: `TripStatus`, loot list, single `Return home` button. **Wiped** (`screens/Wiped.svelte`): "The party is wiped out." Lost loot list struck through; "The notebook keeps what you learned:" + interactions discovered this trip; `Back to the study` (clears `game.wipe`).

**Codex** (`screens/Codex.svelte`, testid `codex`): parchment page, scrollable (the only scrolling screen besides sheets). Two sections, "Runes" (14) then "Interactions" (7), from `codexView(profile)`. Known: `RuneGlyph` (or interaction glyph), title, rule text, owner's note in `--hand` font, slightly rotated margin style. Unknown: `???` with a silhouette (`RuneGlyph rune={null}` or blank circle), no text. Counter `9 / 21 known`. Back link (study or trip per §1.2).

**Lab** (`screens/Lab.svelte`, testids `lab`, `scenario-picker`, `palette`). Same skeleton as Combat with `TopBar` replaced by a Lab bar: native `<select>` scenario picker (44px tall) + mode segmented control `[Play | Board | Lattices]` + `⋯` (Sheet: Play demo, Reset, Undo last action, Copy board, Copy lattices, Copy as scenario, Gallery).
- Play: identical to Combat controls (`BattleView` with `extras` snippet); `state.lab = true` → no charges spent.
- Board: `PartyStrip` + `ActionBar` replaced by `Palette` (2 rows × 8 × 44px: `D S r b f d ! & o i ~ * = @ .` and eraser) ; tap a cell toggles the selected token piece there.
- Lattices: board hidden; member bookmarks + `LatticeEditor` with unlimited ink and unlimited runes (shelf shows `∞`); each edit calls `labSetLattice`.
- Deep link `#/lab?scenario=<id>` loads that scenario; unknown id → `sandbox` + toast `Unknown scenario "<id>"`. `&demo=1` auto-plays the scenario's `demo` actions through the playback queue. Picking a scenario rewrites the hash with `replace`.

**Gallery** (`screens/Gallery.svelte`): static fixtures for visual checks before the engine is complete: all 14 `RuneGlyph`s (+ arrows in 4 dirs, + `???`), every tile layer alone and combined, every unit type with HP pips/shield/ink/brass, intents with order badges, a lattice with flow + aura highlights, every fx kind replayable by tapping it.

---

## 2. App state layer (`src/app/`)

### 2.1 Files
| File | Kind | Responsibility |
|---|---|---|
| `routes.ts` | plain | `Route`, `ROUTES`, `parseHash`, `href` (moved from router). |
| `router.svelte.ts` | reactive | `router` (route, params), `go(route, params?, {replace?})`. |
| `save.ts` (exists) | plain | + `SaveBackend {read(): string \| null; write(text: string): void}`, `localBackend(key?)`, `memoryBackend(initial?)`, `loadSave(backend, now): {save: SaveData; recovered: boolean}` (parse → `parseSaveData`; garbage → copies text to `<key>.corrupt`, returns `newSave(now)` + `recovered: true`), `writeSave(backend, save)`. |
| `flow.ts` | plain | Screen resolution + save reducers (§2.2). |
| `study.ts` | plain | Lattice-editing decisions (§2.4). |
| `view.ts` | plain | `BoardView` model, `viewOf`, `viewOfSpec`, `project` (event → view patch) (§2.5). |
| `fx.ts` + `timing.ts` | plain | Event → transient effects; per-event durations (§2.5). |
| `playback.ts` | plain | `buildSteps`, `Sequencer` (clock-injected timer chain) (§2.5). |
| `playback.svelte.ts` | reactive | `Playback` class wrapping `Sequencer` (§2.5). |
| `battleInput.ts` | plain | Input state machine reducer: tap → mode/action, previews (§2.6). |
| `overlay.ts` | plain | `overlayFor(state, mode)` → highlights, intent draws, badges, ghosts (§2.6). |
| `describe.ts` | plain | UI wording: `unitLine(unit)`, `tileLine(tile)`, `aimLine(aim)`, `lootLine(item)`, `hintFor(mode, state)`. |
| `battle.svelte.ts` | reactive | `BattleSession` (shared by trip and Lab) (§2.3). |
| `game.svelte.ts` | reactive | `GameStore` class (§2.3). |
| `lab.ts` | plain | Token toggling, member relocation, scenario export (§2.7). |
| `lab.svelte.ts` | reactive | `LabStore` class (§2.7). |
| `toasts.svelte.ts` | reactive | `export const toasts = $state({ items: [] as Toast[] })`, `toast(text, tone?)` (auto-dismiss 2.5 s). |
| `instance.ts` | glue | `export const game = new GameStore(localBackend(), () => Date.now())`, `export const lab = new LabStore(game)`. Imported by screens and `main.ts`. |

### 2.2 `flow.ts` (pure; tested)
```ts
export interface WipeSummary { encounter: string; lost: LootItem[]; learned: InteractionId[] }
export interface BattleEnd { save: SaveData; outcome: 'won' | 'wiped'; wipe: WipeSummary | null; learned: InteractionId[] }

export function resolveScreen(route, trip, wipe): { screen: Screen; redirect: Route | null };
export function setOut(save: SaveData): SaveData;                 // nextTripSeed + startTrip; throws if loadout invalid
export function startBattle(save: SaveData): ActionResult;        // beginEncounter(profile, trip); requires status 'fight'
export function endBattle(save: SaveData, battle: BattleState): BattleEnd;   // finishEncounter; learned = battle.discovered − old profile.interactions
export function takeOffer(save: SaveData, index: number): SaveData;          // pickLoot
export function pushOnward(save: SaveData): SaveData;                        // pushOn
export function goHome(save: SaveData): SaveData;                            // returnHome → trip null
export function newDiscoveries(events: readonly GameEvent[], known: readonly InteractionId[], toasted: readonly InteractionId[]): InteractionId[];
```
Persist rule (engine §6): write after **every** `save` change made by `GameStore` (lattice edits, setOut, endBattle, takeOffer, pushOnward, goHome, import). The battle itself is never written.

### 2.3 Stores
```ts
// battle.svelte.ts
export type SessionMode = 'trip' | 'lab';
export class BattleSession {
  state = $state.raw<BattleState>();                // authoritative, post-action
  log = $state.raw<GameEvent[]>([]);                // every event this battle (LogSheet, Lab export)
  input = $state.raw<InputMode>({ kind: 'idle' });
  history = $state.raw<BattleState[]>([]);          // lab only: states before each action (undo)
  actions = $state.raw<Action[]>([]);               // actions since the Lab base (export)
  readonly playback = new Playback();
  constructor(init: ActionResult, readonly mode: SessionMode, private onEvents?: (e: GameEvent[]) => void);
  get view(): BoardView;            // playback.current?.view ?? viewOf(state)
  get busy(): boolean;              // playback.playing
  get overlay(): Overlay;           // busy ? minimal (intent chevrons only) : overlayFor(state, input)
  get caption(): string;            // busy ? playback.current.line : hintFor(input, state)
  // input (all no-ops while busy, except tap → skip)
  tapCell(at: Coord): void;  selectMember(id: UnitId): void;
  chooseSpell(key: SpellKey): void;  chooseShove(): void;  confirm(): void;  cancel(): void;
  undoMove(): void;  endTurn(): void;  skip(): void;  undoAction(): void /* lab */;
  dispatch(action: Action): Promise<void>;   // applyAction → history/actions/log → playback.play(viewOf(prev), events, viewOf(next)) → onEvents
  replaceState(state: BattleState): void;    // lab edits: no events, clears input/history
}
```
`dispatch` sets `this.state = next` immediately (so logic is never behind) while the board renders playback views until done. Illegal actions can't be produced by the reducer; if `applyAction` throws anyway, `toast(err.message)` and keep the old state.

```ts
// game.svelte.ts
export class GameStore {
  save = $state.raw<SaveData>();
  battle = $state.raw<BattleSession | null>(null);   // trip battle only
  wipe = $state.raw<WipeSummary | null>(null);
  recovered = $state(false);                          // corrupt save was replaced (Study shows a toast once)
  constructor(backend: SaveBackend, now: () => number);
  // study
  place(m: MemberId, at: Coord, rune: RuneId): string | null;   // null = ok, else reason (toast)
  tapSocket(m: MemberId, at: Coord, tool: ShelfTool): string | null;   // delegates to study.ts decide()
  remove(m: MemberId, at: Coord): void;  rotate(m: MemberId, at: Coord): void;
  exportText(): string;  importText(text: string): string | null;     // serialize/parse via save.ts + parseSaveData
  // trip
  setOut(): void;            // flow.setOut, persist, go('trip')
  ensureBattle(): void;      // status 'fight' && battle null → new BattleSession(startBattle(save), 'trip', toastDiscoveries)
  finishBattle(): void;      // after won/lost overlay: endBattle → save, wipe, battle = null, persist
  take(index: number): void; pushOn(): void; returnHome(): void; dismissWipe(): void;
  debug = { forceWin(): void; forceLose(): void };   // DEV only: sets enemies (or members) hp 0 + phase; used by verification
}
```
`ensureBattle` is called from `Combat.svelte` in an `$effect` (status fight and no battle). The initial `ActionResult` events (battleStart, round 1, telegraphs) are played from `withoutIntents(viewOf(state))` so enemies "declare" their intents one by one.

### 2.4 `study.ts` (pure; tested)
```ts
export type ShelfTool = { kind: 'rune'; rune: RuneId } | { kind: 'erase' } | { kind: 'none' };
export type SocketDecision =
  | { kind: 'place'; rune: RuneId } | { kind: 'replace'; rune: RuneId } | { kind: 'rotate' }
  | { kind: 'remove' } | { kind: 'inspect' } | { kind: 'reject'; reason: string };
export function decideSocketTap(p: Profile, m: MemberId, at: Coord, tool: ShelfTool): SocketDecision;
export function applyDecision(p: Profile, m: MemberId, at: Coord, d: SocketDecision): Profile;
export interface ShelfSlot { rune: RuneId; known: boolean; owned: number; free: number | null /* null = ∞ (lab) */; cost: number; usable: boolean; reason: string | null }
export function shelfSlots(p: Profile | null, m: MemberId, capacity: number | null): ShelfSlot[];   // RUNE_IDS order; null profile = lab (all known, ∞)
```
Rules: empty socket + rune tool → `place` if `canPlace` ok else `reject(reason)`. Occupied + rune tool with a **different** rune → `replace` if `canPlace` passes on the profile with that socket cleared, else reject. Occupied + same rune or `none` tool → `rotate` if arrow rune, else `inspect`. Occupied + erase → `remove`. Hole → nothing. Long-press on an occupied socket → `remove` regardless of tool. The rune tool stays selected after placing while `free > 0` (fast multi-place); it clears itself when `free` hits 0.

### 2.5 Board view, effects, playback (pure; tested)
```ts
// view.ts
export interface TileView { oil: boolean; ink: boolean; steam: number; fire: number; plate: boolean; vent: boolean }
export interface UnitView {
  id: UnitId; kind: 'member' | 'enemy'; def: MemberId | EnemyId; name: string; pos: Coord;
  hp: number; maxHp: number; shield: number; inked: boolean; brass: boolean; oilSoaked: boolean;
  alive: boolean; intent: Intent | null;
}
export interface BoardView { width: number; height: number; tiles: TileView[]; units: UnitView[]; round: number; phase: BattlePhase }
export function viewOf(s: BattleState): BoardView;
export function viewOfSpec(spec: BoardSpec): BoardView;          // gallery fixtures from parseBoard
export function withoutIntents(v: BoardView): BoardView;
export function project(v: BoardView, e: GameEvent): BoardView;  // returns a new view
```
`project` patches only what events state explicitly (counts that silently tick, like steam 2→1, update at the final snap):
moved/pushed/slide/moveUndone → `pos` · damage → `hp = hpLeft` · shieldAbsorbs → `shield = left` · shieldGained → `shield += amount` · died → `alive = false`, `intent = null` · inked → `inked = true` (+ via puddle: tile ink false at the unit's pos) · detonate → `inked = false` · coated → `brass = true` · puddle → tiles ink · oiled → tiles oil · steam → tiles `steam = TUNING.steamRounds` · plates → plate, clear oil/ink/steam/fire · ignite → tiles `oil = true, fire = TUNING.fireRounds` · extinguish → `fire = 0` · fireOut → `fire = 0, oil = false` · steamFades → `steam = 0` · vent → `steam = TUNING.steamRounds` · telegraph → `intent` · idle/attack → `intent = null` · round → `round` · won/lost → `phase`. Everything else: unchanged.

```ts
// fx.ts
export type Tone = 'ink' | 'oil' | 'steam' | 'spark' | 'brass' | 'fire' | 'danger' | 'shield' | 'source' | 'member';
export type Fx =
  | { kind: 'trail'; cells: Coord[]; tone: Tone }                   // projectile/move path
  | { kind: 'burst'; cells: Coord[]; tone: Tone; stagger: number }  // tiles flash in order (ms between)
  | { kind: 'zap'; from: Coord; cells: Coord[] }                    // arc/conduct zigzags from → each
  | { kind: 'float'; at: Coord; text: string; tone: Tone }          // "−3", "+2 shield"
  | { kind: 'pulse'; at: Coord; tone: Tone }                        // cast, detonate, coat
  | { kind: 'banner'; text: string };                               // "Your turn", "Round 3"
export function fxFor(e: GameEvent, before: BoardView): Fx[];
// timing.ts
export const STEP_MS = { quiet: 0, short: 160, normal: 260, big: 420, banner: 500 } as const;
export function durationOf(e: GameEvent): number;
```
Mapping: moved → trail(member/danger) normal · pushed/slide → trail normal · cast → pulse source short · lands/stopped → trail(source, path) normal · splash → burst big · damage → float `−N` danger normal · shieldAbsorbs/Gained → float shield short · died → pulse danger normal · inked/puddle/diffuse → burst ink normal · oiled → burst oil · steam/vent → burst steam · plates/coated → burst/pulse brass · detonate → pulse ink big · ignite → burst fire stagger 50 big · extinguish → burst steam · arc/conduct → zap big · trigger → float `if inked ✓` / `on kill ✓` / `✗` short · telegraph → short (arrow appears via view) · attack → trail danger along `intent` dir normal · miss/idle/echo* → short · fireOut/steamFades → short · round → banner short · phase player → banner `Your turn` banner, other phases quiet · battleStart → banner · won/lost → banner big.
`prefersReducedMotion.current` (svelte/motion) → all durations × 0.5, no trails.

```ts
// playback.ts
export interface Step { event: GameEvent; line: string; view: BoardView; fx: Fx[]; ms: number }
export function buildSteps(start: BoardView, events: readonly GameEvent[], scale?: number): Step[];  // view = state after the event; quiet steps keep ms 0
export interface Clock { set(fn: () => void, ms: number): number; clear(h: number): void }
export class Sequencer {
  constructor(clock: Clock);
  run(durations: readonly number[], onStep: (i: number) => void, onDone: () => void): void;  // finishes any running run first (skip semantics)
  skip(): void;            // synchronously onStep(last) + onDone, exactly once
  get running(): boolean;
}
// playback.svelte.ts
export class Playback {
  steps = $state.raw<Step[]>([]); index = $state(-1);
  get playing(): boolean; get current(): Step | null;
  play(start: BoardView, events: readonly GameEvent[]): Promise<void>;   // resolves when done or skipped
  skip(): void;
}
```
Consecutive `ms: 0` steps are coalesced (shown for 0 ms, never flicker). While playing, the board renders `current.view` + `current.fx`; tapping the board, caption or any control calls `skip()` (the tap is swallowed). When done, `index = -1` and the board renders `viewOf(state)` (the authoritative post-state; any projection drift self-heals here).

### 2.6 Input state machine and previews (`battleInput.ts`, `overlay.ts`; pure; tested)
```ts
export interface Preview {
  action: Action; result: ActionResult;          // applyAction on a copy, discarded unless confirmed
  damage: Record<UnitId, number>;                // summed damage events per target
  kills: UnitId[];                               // died events
  path: Coord[]; targets: Coord[];               // aimPreview (cast) or push dest (shove)
  summary: string;                               // "Bolt right: rat C2 −2 (dies), oil ignites"  (no ??? spoilers: interaction words only if known)
}
export type InputMode =
  | { kind: 'idle' }
  | { kind: 'member'; unit: UnitId; moves: Coord[] }                  // tap reachable tile = move
  | { kind: 'aim'; unit: UnitId; spell: SpellKey; aims: Aim[] }
  | { kind: 'confirm'; unit: UnitId; spell: SpellKey | null; preview: Preview }   // spell null = shove
  | { kind: 'shove'; unit: UnitId; dirs: Dir[] }
  | { kind: 'inspect'; unit: UnitId | null; at: Coord };              // enemy or tile info
export interface InputResult { mode: InputMode; action?: Action }
export function onCell(s: BattleState, m: InputMode, at: Coord, known: readonly InteractionId[]): InputResult;
export function onMember(s, m, id: UnitId): InputResult;
export function onSpell(s, m, key: SpellKey): InputResult;   // no usable charge → stays, caption explains
export function onShove(s, m): InputResult;
export function onConfirm(s, m): InputResult;                // confirm → action
export function onCancel(s, m): InputResult;                 // confirm → aim/shove → member → idle
export function aimAt(s: BattleState, unit: UnitId, spell: SpellKey, at: Coord): Aim | null;   // bolt: same row/col as caster → dir; splash: tile in legalAims; ward: self/ally on that tile
export function previewOf(s: BattleState, action: Action, known): Preview;
export function afterAction(s: BattleState, prev: InputMode): InputMode;   // keeps the member selected if it can still act/move, else selects the next ready member, else idle
```
Tap semantics in `onCell`: `member` mode → tap tile in `moves` ⇒ `{action: move}`; tap a living member ⇒ select it; tap enemy/empty ⇒ `inspect`. `aim` → tap resolves `aimAt`; legal ⇒ `confirm` with preview; same tile in `confirm` ⇒ `{action}` (tap-again-to-confirm); another legal aim ⇒ re-preview; illegal ⇒ back to `aim` (caption says why). `shove` → tap an adjacent unit in `dirs` ⇒ `confirm`. Idle → tap a member selects; tap enemy/tile inspects.

`overlayFor(s, mode, previewState?) → { highlights: Highlight[]; intents: IntentDraw[]; badges: Badge[]; ghosts: Ghost[]; selected: UnitId | null }`:
- `reach` dots on `mode.moves`; `aim` tint on each legal aim tile (bolt: every tile of each of the 4 `aimPreview(dir).path`s, faint, plus a chevron next to the caster); `target` outline on `preview.targets`; `path` line along `preview.path`; `shove` ring on adjacent shove targets.
- Danger overlay: for each living enemy with an intent, `intentPreview(stateForIntents, enemy)` → `IntentDraw {from, path, hit, order, attack, dir}`; `stateForIntents = preview?.result.state ?? s`, so a pending shove shows where the attack will go after it. Hit tiles get a red hatch; if a member stands there, its chip in `PartyStrip` shows a red "!".
- `badges`: `−N` on each unit in `preview.damage`, skull on `preview.kills`, `+N` shield for wards. `ghosts`: units whose `pos` differs in `preview.result.state` (dashed outline at the new pos).
- `inspect` on an enemy: its intent drawn emphasized, others dimmed.
- End turn: `endTurn()` arms on first tap if any living member has `!acted` and a usable spell (`Footer` shows `End turn?` for 2.5 s); second tap dispatches.

### 2.7 Lab (`lab.ts`, `lab.svelte.ts`)
```ts
// lab.ts (pure; tested)
export type PaletteItem = 'D' | 'S' | 'r' | 'b' | 'f' | 'd' | '!' | '&' | 'o' | 'i' | '~' | '*' | '=' | '@' | '.';
export function cellTokens(s: BattleState): string[][];          // from boardOf(s), [y][x]
export function toggleToken(token: string, item: PaletteItem): string;   // canonical order unit, ! &, o i ~ * = @ ; unit replaces unit (drops mods); same unit removes it; mod without unit → unchanged; '*' implies oil (writes '*' not 'o*'); '.' clears
export function paletteEdits(s: BattleState, at: Coord, item: PaletteItem): { at: Coord; token: string }[];   // placing D/S that exists elsewhere first clears its old cell
export interface LabBase { board: string; lattices: Record<MemberId, Lattice>; hp: Record<string, number>; intents: Record<string, Dir> }
export function baseOf(s: BattleState, lattices: Record<MemberId, Lattice>): LabBase;   // hp: units with hp ≠ maxHp by label; intents by label
export function toScenarioDef(id: string, base: LabBase, actions: readonly Action[], events: readonly GameEvent[]): ScenarioDef;   // expected = describeLog(events since base)
export function formatScenario(def: ScenarioDef): string;      // TS object literal with template-string board/lattices, ready to paste into src/data/scenarios.ts
export function labLocation(params: URLSearchParams): { scenario: string; demo: boolean };
// lab.svelte.ts
export class LabStore {
  session = $state.raw<BattleSession | null>(null);
  scenarioId = $state('sandbox'); mode = $state<'play' | 'board' | 'lattices'>('play');
  member = $state<MemberId>('draughtsman'); palette = $state<PaletteItem>('r');
  lattices = $state.raw<Record<MemberId, Lattice>>(); base = $state.raw<LabBase>();
  constructor(game: GameStore);
  load(id: string): void;            // scenarioBattle(def, { lab: true }); members without def.lattices get latticeOf(profile, m) via labSetLattice; base = baseOf(...)
  playDemo(): Promise<void>;         // load(id) then dispatch each def.demo action, awaiting playback
  paint(at: Coord): void;            // paletteEdits → labSetCell each (throws → toast) → session.replaceState; base = baseOf
  editLattice(m: MemberId, at: Coord, tool: ShelfTool, longPress?: boolean): void;   // unlimited: setSocket/rotateSocket; labSetLattice
  copy(kind: 'board' | 'lattices' | 'scenario'): Promise<void>;   // navigator.clipboard.writeText; failure → CopySheet with a selectable textarea
}
```

---

## 3. Components

### 3.1 Visual language (`src/ui/theme.css` additions; light parchment only)
```css
--parchment: #f1e6cc; --parchment-dark: #e2d2ae; --parchment-deep: #d6c39a;
--ink: #2b2118; --ink-soft: #5a4a3a; --ink-faint: rgba(43,33,24,.45); --line: rgba(43,33,24,.22);
--accent: #8b3a2b; --lamp: #e8b04a; --night: #1f2a3a;
/* materials (tile layers and material-rune frames) */
--m-ink: #1d2a4a;            /* iron-gall blue-black: puddles, marks */
--m-oil: #7a6420; --m-oil-tint: rgba(122,100,32,.30);   /* olive amber sheen */
--m-steam: #a9bcc6;          /* pale blue-grey cloud, drawn at .6 over units */
--m-spark: #e2a312;          /* electric gold, always with an ink outline */
--m-brass: #b5882e; --m-brass-dark: #7a5a1a;
--m-fire: #d2552a; --m-fire-tint: rgba(210,85,42,.40);
--vent: #55606a;
/* families */
--f-source: #8b3a2b; --f-shape: #5a4a3a; --f-trigger: #5b4a8a; --f-aura: #b07d1e;   /* material = its --m-* */
/* roles */
--member-draughtsman: #2f4f6f; --member-stoker: #a2471f; --enemy: #2b2118;
--danger: #b3261e; --danger-tint: rgba(179,38,30,.16); --shield: #4f7ea8; --select: #e8b04a; --reach: rgba(47,79,111,.35);
--hand: "Snell Roundhand", "Segoe Script", "Bradley Hand", cursive; --mono: ui-monospace, Menlo, monospace;
--tap: 44px; --radius: 6px;
```
Plus utility classes: `.tap` (min 44×44), `.sheet`, `.chip`. Text fields (`textarea` in CopySheet / save import) get `user-select: text`.

**Glyphs** (`src/ui/glyphs.ts`): `RUNE_GLYPH: Record<RuneId, string>` — SVG path `d` on a 24-unit box, drawn `stroke: currentColor; stroke-width: 2; fill: none` (unless noted):
bolt `M3 12h15M14 7l5 5-5 5M3 9l3 3-3 3` (fletched arrow) · splash `M8 12a4 4 0 1 0 8 0a4 4 0 1 0-8 0M12 2v4M12 18v4M2 12h4M18 12h4` · ward `M12 3 5 6v6c0 4 3 7 7 9 4-2 7-5 7-9V6z` · ink `M12 3c-4 6-6 9-6 12a6 6 0 0 0 12 0c0-3-2-6-6-12z` (filled) · oil `M12 4c-3 5-5 7-5 10a5 5 0 0 0 10 0c0-3-2-5-5-10zM4 21h16` · spark `M12 2l2 8 8 2-8 2-2 8-2-8-8-2 8-2z` (filled) · steam `M7 20c-2-3 2-5 0-8s2-5 0-8M12 20c-2-3 2-5 0-8s2-5 0-8M17 20c-2-3 2-5 0-8s2-5 0-8` · brass `M12 3l8 4.5v9L12 21l-8-4.5v-9zM12 9a3 3 0 1 0 0 6a3 3 0 1 0 0-6` · bend `M6 4v10h12M14 10l4 4-4 4` · fork `M12 21v-8M12 13 5 5M12 13l7-8` · onInked `M12 8c-2 3-3 4.5-3 6a3 3 0 0 0 6 0c0-1.5-1-3-3-6z` · onKill `M8 8l8 8M16 8l-8 8` · amplify `M12 5v14M5 12h14` · echo `M12 12m-2 0a2 2 0 1 0 4 0a2 2 0 1 0-4 0M15 7a7 7 0 0 1 0 10M18 4a11 11 0 0 1 0 16`.
Interaction glyphs (codex): ignite (flame `M12 3c3 4 5 6 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-5 1-9z`), conduct (brass + zig), arc (steam + zig), detonate (spark star filled), extinguish (steam over flame), slide (arrow over oil line), diffuse (ink drop + rings).
**Family frames** (`RuneGlyph`): source = circle stroke 2.5 `--f-source`; material = rounded square filled with the material color at 25% + stroke; shape = square outline `--f-shape`; trigger = diamond `--f-trigger`; aura = dashed circle `--f-aura` + soft halo. Arrow runes: a solid triangular notch on the frame edge in `dir`. `rune = null` → `???`: dashed grey frame + "?".
**Units** (board): member = parchment circle r 34 with 6-unit ring in member color + serif initial `D`/`S`; rat = ink circle r 26 + parchment `r`; sentry = brass rounded square 64 + dark `b` stroke `--m-brass-dark`; familiar = ink diamond + `f`; dummy = grey cross-post. HP: pips (6×10 units) in a row under the token, filled `--ink`, empty outlined; `maxHp > 8` → `7/12` text. Shield: blue shield badge top-left with number. Inked: ink blot top-right (`--m-ink`). Brass-coated: 4-unit brass ring. Dead: removed after its `died` fx. Selected: lamp-gold ring + soft glow.
**Tiles** (layer order, bottom → top): floor (parchment, 1-unit `--line` grid) → oil (`--m-oil-tint` fill + 3 diagonal sheen strokes) → ink puddle (irregular blot path `--m-ink` .7) → fire (`--m-fire-tint` + 2–3 flame glyphs; rounds-left digit bottom-right) → plate (brass rect inset 8, rivets, dark stroke) → vent (dark circle grate with 3 slots) → highlights → intents → units → steam (3 overlapping circles `--m-steam` .6, rounds digit) → badges → fx.
**Intents**: `--danger` stroke 6 along the intent path from the enemy to the hit tile, arrowhead on the hit tile, hit tile `--danger-tint` with diagonal hatch; bite = short arrow into the adjacent tile; order number in a red circle (r 14) at the enemy's top-left. During playback only a chevron + order badge (paths need `BattleState`).

### 3.2 Tree (`src/ui/components/**`, `src/ui/screens/**`)
| File | Props | Responsibility / testid |
|---|---|---|
| `common/Button.svelte` | `variant?: 'primary'\|'quiet'\|'danger'`, `disabled?`, `onclick`, `label?`, `testid?`, `children?: Snippet` | ≥44px button. |
| `common/Sheet.svelte` | `open`, `title`, `onclose`, `children: Snippet` | Bottom sheet overlay, max 70% height, scrolls inside. |
| `common/Toasts.svelte` | — | Renders `toasts.items` above the footer. |
| `common/Pips.svelte` | `value`, `max`, `tone?` | HP/charges pips (text fallback > 8). |
| `common/BackLink.svelte` | `to: Route`, `label` | 44px back link. |
| `RuneGlyph.svelte` | `rune: RuneId \| null`, `dir?: Dir`, `size?: number`, `dim?`, `selected?` | Inline SVG glyph with family frame + arrow notch. |
| `board/BattleBoard.svelte` | `view: BoardView`, `overlay: Overlay`, `fx: Fx[]`, `fxKey: number`, `ontap: (at: Coord) => void` | Root SVG (testid `board`), label gutter, composes the layers below; one transparent `<rect role="button" aria-label=…>` per cell on top. |
| `board/TileLayer.svelte` | `tile: TileView`, `at: Coord` | Floor/oil/ink/fire/plate/vent of one cell. |
| `board/SteamLayer.svelte` | `view: BoardView` | Steam clouds above units. |
| `board/UnitToken.svelte` | `unit: UnitView`, `selected: boolean`, `dim: boolean` | Keyed `<g>` with `style="transform: translate({x*100}px,{y*100}px); transition: transform 220ms ease"`. |
| `board/HighlightLayer.svelte` | `highlights: Highlight[]` | Reach dots, aim tints, target outlines, paths, shove rings. |
| `board/IntentLayer.svelte` | `intents: IntentDraw[]`, `minimal: boolean` | Danger arrows, hatch, order badges. |
| `board/BadgeLayer.svelte` | `badges: Badge[]`, `ghosts: Ghost[]` | Preview damage/kill/shield badges, ghost outlines. |
| `board/FxLayer.svelte` | `fx: Fx[]`, `fxKey: number` | `{#key fxKey}` → CSS keyframe animations per fx kind (trail dash, burst flash with `animation-delay: i*stagger`, zap polyline, float rise, pulse ring, banner). |
| `lattice/LatticeGrid.svelte` | `lattice: Lattice`, `compiled: CompiledLattice`, `focus: SpellKey \| null`, `ontap(at)`, `onlongpress(at)` | CSS grid of `<button>` sockets (testid `lattice`, aria `B2: Ink` / `B2: empty socket`), holes as gaps; runes not in `reached`/not a source/not a touching aura → dimmed (“does nothing yet”). Long press = 450 ms via `{@attach longpress(cb)}` (pointer events; cancels on move > 10px; `-webkit-touch-callout: none`, `contextmenu` prevented). |
| `lattice/FlowOverlay.svelte` | `compiled`, `focus`, `cols`, `rows` | Absolute SVG over the grid: for each path cell (except the source) a segment from `step(at, opposite(dir))` to `at` with a mid arrowhead (works across forks); focused spell `--f-source` stroke 3, others `--ink-faint`; aura touches as dashed `--f-aura` lines + glow on touched cells. |
| `lattice/RuneShelf.svelte` | `slots: ShelfSlot[]`, `tool: ShelfTool`, `onselect(tool)` | 2×7 slots (testid `shelf`): glyph, big `free` count, small `/owned`; `???` silhouettes for unknown; unusable → dim + reason on tap (toast). |
| `lattice/InkPot.svelte` | `used`, `capacity: number \| null`, `pending?: number` | Pot glyph with fill level, `6/8`, dashed ghost for the selected rune's cost; `∞` in lab (testid `inkpot`). |
| `lattice/SpellList.svelte` | `spells: Spell[]`, `charges?: Record<SpellKey, number>`, `focus`, `onfocus` | `describeSpell` rows (testid `spells`). |
| `lattice/LatticeEditor.svelte` | `lattice`, `compiled`, `capacity: number \| null`, `slots`, `tool`, `ontool`, `onsocket(at, longPress)`, `member: MemberId`, `onmember` | Bookmarks + page + info/spells + shelf; used by Study and Lab (Lattices mode). |
| `battle/TopBar.svelte` | `title`, `round`, `onlog`, `children?: Snippet` | 32px bar. |
| `battle/Caption.svelte` | `text`, `tone?: 'hint'\|'event'\|'warn'`, `ontap` | testid `caption`; tap = skip during playback. |
| `battle/PartyStrip.svelte` | `members: MemberUnit[]`, `selected`, `threatened: UnitId[]`, `onselect` | testid `party`. |
| `battle/ActionBar.svelte` | `member: MemberUnit \| null`, `spells: CastableSpell[]`, `mode: InputMode`, `canUndo`, `onspell`, `onshove`, `onundo` | testid `actions`; buttons labelled by `describeSpell` (aria) and glyph (visual). |
| `battle/Footer.svelte` | `mode`, `armed`, `busy`, `onconfirm`, `oncancel`, `onendturn`, `onlog`, `confirmLabel` | testid `footer`. |
| `battle/LogSheet.svelte` | `open`, `log: GameEvent[]`, `onclose` | `describe()` lines grouped by `Round n`, auto-scrolled to bottom. |
| `battle/EndOverlay.svelte` | `phase: 'won'\|'lost'`, `label`, `oncontinue` | Shown when `phase ≠ player` and playback done. |
| `battle/BattleView.svelte` | `session: BattleSession`, `title`, `top?: Snippet`, `controls?: Snippet` (Lab replaces party/actions in Board mode), `oncontinue?` | Whole combat layout; used by Combat and Lab. |
| `trip/TripStatus.svelte` | `trip: Trip`, `profile: Profile` | HP pips, charges per spell, depth `n / 4`, loot glyphs. |
| `trip/OfferCard.svelte` | `item: LootItem`, `selected`, `onselect` | Loot offer card. |
| `lab/LabBar.svelte` | `ids`, `current`, `mode`, `onpick`, `onmode`, `onmenu` | Picker (testid `scenario-picker`) + segmented mode control. |
| `lab/Palette.svelte` | `selected: PaletteItem`, `onselect` | 2×8 token palette (testid `palette`), each drawn with the same tile/unit visuals. |
| `lab/CopySheet.svelte` | `open`, `text`, `onclose` | Fallback selectable textarea (mono). |
| `study/StudyScene.svelte` | `oncodex`, `onmenu` | Window + rain (slow CSS animation, paused under reduced motion), lamp, title. |
| `codex/CodexEntry.svelte` | `entry: CodexEntryDef`, `known: boolean` | Entry or `???`. |
| `screens/Study.svelte` · `Combat.svelte` · `Loot.svelte` · `Crossroads.svelte` · `Cleared.svelte` · `Wiped.svelte` · `Codex.svelte` · `Lab.svelte` · `Gallery.svelte` | — | Per §1.4. `Trip` has no screen file: `App.svelte` switches on `resolveScreen`. |

---

## 4. Touch interaction (no drag in v0)

**Combat**
- Select: tap a member token or its `PartyStrip` chip. At the start of each player phase the first ready member is auto-selected (`afterAction`).
- Move: with a member selected, reachable tiles show dots; tap one → moves immediately (undoable). `Undo move` button while `canUndoMove`.
- Cast: tap a spell button → legal aims tint (Bolt: the four lines + chevrons by the caster; Splash: tiles within range 3; Ward: self + adjacent allies) → tap an aim → preview (path, targets, `−N` badges, skulls, ghosts, intents recomputed) and `Footer` shows `Confirm` → tap `Confirm` or the same tile again. `Cancel` or tapping the spell button again steps back.
- Shove: `Shove` button → adjacent units ringed → tap one → preview (push destination ghost, bump damage, redirected intents) → confirm.
- Inspect: tap an enemy (its intent emphasized; caption `rat at C2 · 2/2 HP · oil-soaked · bites right (2nd)`) or a tile (`C4: oil, steam (1 round)`).
- End turn: `End turn ▸`; arms to `End turn?` if someone could still act. During playback any tap skips to the end.
- Log: the `Log` button opens the full event log sheet.

**Lattice editor (Study and Lab)**
- Select a rune on the shelf (it highlights; the info region shows its rule and cost; the ink pot shows the ghost cost) → tap an empty socket to place. It stays selected while copies remain.
- Tap a placed arrow rune (Source, Bend) to rotate it 90° clockwise. Tap a placed non-arrow rune to inspect (info region shows its rule).
- Shelf rune selected + tap an occupied socket with a different rune → replace (if affordable after the refund).
- Remove: long-press (450 ms) a placed rune, or toggle `Erase` and tap.
- Tap a spell row (or a source socket while inspecting) → focus that spell's flow path.

**Sizes**: board cells ≈ 57px; sockets 56px (Study), shelf slots 48px, palette 44px, all buttons ≥ 44px tall. Board taps hit full cells (no small targets inside the board).

---

## 5. Ordered implementation steps

Engine steps (engine-plan §8): **E1** types/data · **E2** notation · **E3** lattice compiler · **E4** battle core · **E5** casting + scenarios · **E6** AI + turns · **E7** run layer/save/replay.
UI dependency graph: **U1 (E1) → {U2 (E2) ∥ U3 (E3)} → U4 (E4+E5; E6 for end turn) → {U5 ∥ U6 (E7)} → U7**. Steps marked ∥ touch disjoint files and can run in separate worktrees, in parallel with the engine steps named.

Every step: `pnpm check` green; `svelte-autofixer` clean on all touched components; `verify` skill at 375×812 (mobile preset) with a screenshot; general checks on every route touched: `document.documentElement.scrollWidth === document.documentElement.clientWidth`, no console errors, `[...document.querySelectorAll('button,[role=button]')].filter(b => { const r = b.getBoundingClientRect(); return r.height && r.height < 44 })` is empty. Reset the viewport to desktop at the end.

### U1 — Foundations (after E1; ∥ E2, E3, E4)
Files: `src/ui/theme.css` (tokens §3.1), `src/ui/glyphs.ts`, `src/ui/components/RuneGlyph.svelte`, `common/{Button,Sheet,Toasts,Pips,BackLink}.svelte`, `src/app/routes.ts`, `router.svelte.ts` (routes + `go`), `save.ts` (backends; `loadSave/writeSave` land in U6 since they need `parseSaveData`), `view.ts` (types + `project` + `withoutIntents`; `viewOf` typed against `BattleState` from E1), `fx.ts`, `timing.ts`, `playback.ts`, `playback.svelte.ts`, `toasts.svelte.ts`, `screens/Gallery.svelte` (glyphs part), `App.svelte` (route switch incl. `trip` → existing Combat placeholder, `gallery`), `Combat.svelte` placeholder link updated.
Tests (`tests/app/`):
- `routes.test.ts`: `parses trip, gallery and lab params`; `unknown routes fall back to study`; `href builds query strings`.
- `view.test.ts` (handwritten `BoardView` fixture + handwritten events typed as `GameEvent`): `moved/pushed/slide update pos`; `damage sets hp from hpLeft, died clears intent`; `puddle then inked-via-puddle clears the tile`; `plates clear other layers`; `ignite sets fire and oil on every tile`; `fireOut removes oil`; `telegraph sets intent, attack clears it`; `project never mutates its input`.
- `playback.test.ts` (fake `Clock`): `steps fire in order with their durations`; `zero-ms steps coalesce`; `skip jumps to the last step and calls onDone once`; `run while running finishes the previous run first`; `buildSteps: step i view = project of steps 0..i`.
- `fx.test.ts`: `ignite → staggered fire burst over all tiles`; `damage → float "−3"`; `phase player → banner`, `phase enemy → 0 ms`; `reduced motion halves durations`.
- `save.test.ts` (extend): `memoryBackend round-trips`.
Browser checklist: `#/gallery?part=glyphs` → 14 rune glyphs with names, each family frame distinct, Bolt/Bend shown in 4 rotations, a `???` slot; text "Gallery" visible. `#/study` still renders; `#/trip` shows the combat placeholder; `#/combat` falls back to study. Screenshot the gallery.
Docs: TECH §7 rows: "UI state: engine objects in `$state.raw` (structuredClone-safe); logic in plain .ts, reactive wrappers in .svelte.ts" and "Playback: UI projects events onto a view model, snaps to engine state at the end".

### U2 — Battle board rendering (after E2 + U1; ∥ U3, E3–E6)
Files: `board/{BattleBoard,TileLayer,SteamLayer,UnitToken,HighlightLayer,IntentLayer,BadgeLayer,FxLayer}.svelte`, `view.ts` (`viewOfSpec`), `screens/Gallery.svelte` (`part=board`: a fixture board from `parseBoard` showing every layer and unit, hand-made `Overlay` with reach dots, an aim line, two intents with orders 1/2, badges `−3` and a skull, a ghost; `part=fx`: buttons that replay a hand-written event list for S2 oil-chain through `Playback` on that board).
Tests: `view.test.ts` + `viewOfSpec maps parseBoard tiles/units` (`r!o` → inked rat on oil, `@~` vent + steam 2, `*` fire + oil); `overlay-shapes.test.ts` only if helper math is extracted (e.g. `cellCenter`, `intentArrowPoints`) — keep geometry helpers in `src/ui/board/geometry.ts`, pure, tested: `cell centers in viewBox units`, `arrow ends on the hit tile`.
Browser checklist: `#/gallery?part=board` at 375×812 → board fills the width (board `getBoundingClientRect().width` ≥ 355), labels A–F and 1–8 visible, each cell `role=button` with a sensible `aria-label` (`find("C2")`), oil/ink/fire/plate/vent/steam distinguishable in the screenshot, intent arrows with `1` and `2` badges, HP pips readable. Tap a cell → caption-like readout in the gallery shows the tapped label. `#/gallery?part=fx` → tap "Play oil chain": rat token disappears after its damage float, fire spreads tile by tile (screenshot mid-play), tap the board → skips to the end state.

### U3 — Lattice editor components (after E3 + U1; ∥ U2, E4–E6)
Files: `lattice/{LatticeGrid,FlowOverlay,RuneShelf,InkPot,SpellList,LatticeEditor}.svelte`, `src/ui/attach/longpress.ts` (attachment factory, `Attachment<HTMLElement>`), `src/app/study.ts` (decision logic written against `Lattice` + a local capacity/collection argument now; the `Profile` overloads land in U6 once E7 exists — define `decideSocketTap` over `{lattice, capacity, free: (rune) => number | null}` so it doesn't need `Profile`), `src/app/flowGeometry.ts` (`flowSegments(compiled, focus)`), Gallery `part=lattice` (local `$state.raw` lattice per member starting from `parseLattice(MEMBERS[m].startLattice)`, capacity 8, collection `START_COLLECTION`, fully interactive).
Tests: `study.test.ts`: `place on empty socket`; `reject when ink is short (reason text)`; `reject when none left`; `replace refunds the old rune's ink`; `tap arrow rune rotates; non-arrow inspects`; `erase removes`; `holes ignore taps`; `tool clears when the last copy is placed`. `flowGeometry.test.ts`: `straight path → segments between neighbours`; `fork right branch starts at the fork cell`; `aura touches produce dashed links to touched cells only`; `unreached runes listed as idle`.
Browser checklist: `#/gallery?part=lattice` → Draughtsman tab shows `Bolt▸ Ink` with a flow arrow from Bolt to Ink, spell list reads `Bolt (2 damage) → Ink 3×3`, ink pot `3/8`. Tap Spark on the shelf, tap the socket right of Ink → spell list updates to `… → Ink 3×3 → Spark (1 damage)`, pot `4/8`. Tap Bolt → it rotates (arrow notch moves down), flow arrow follows/vanishes. Long-press Spark (hold via `computer` left_click_drag of 0px is not possible: use `javascript_exec` to dispatch `pointerdown`, wait 500 ms, `pointerup`) → removed. Erase mode works. Switch to Stoker → 3×6 shape with corner holes; whole page fits without scroll at 375×812 (`scrollHeight === clientHeight` on the page container). Screenshot both members.

### U4 — Battle interaction, played in the Lab (after E4 + E5 + U2 + U3; End turn needs E6)
Files: `src/app/{battleInput,overlay,describe}.ts`, `src/app/battle.svelte.ts`, `src/app/lab.ts` (only `labLocation`), `src/app/lab.svelte.ts` (load + Play mode only), `src/app/instance.ts` (lab only; `game` stub not needed yet: Lab members without scenario lattices use `MEMBERS[m].startLattice` until U6 wires the profile), `battle/{TopBar,Caption,PartyStrip,ActionBar,Footer,LogSheet,EndOverlay,BattleView}.svelte`, `lab/LabBar.svelte`, `screens/Lab.svelte`. If E6 isn't merged, `End turn` is disabled with caption "Enemy turns arrive with the turn loop" (remove that guard when E6 lands; no other change needed).
Tests (use `scenarioBattle` / `SCENARIOS` boards):
- `battleInput.test.ts`: `tap member selects and lists moves` (sandbox); `tap reachable tile emits a move action`; `tap enemy inspects`; `spell → aim → confirm on S1 board emits the cast`; `bolt aim from any tile in the line`; `tapping the same aim twice confirms`; `illegal aim keeps aim mode`; `spell without charges stays in member mode` (trip-mode state with charges 0); `shove flow emits shove with dir`; `afterAction selects the next ready member`.
- `preview.test.ts`: `S1 second cast preview: dummy −8 total (3+3+2)`; `S2 preview lists both rat kills`; `preview never changes the session state`; `summary hides unknown interaction names` (known = [] → no "ignites").
- `overlay.test.ts`: `intents drawn for each enemy with order`; `pending shove recomputes intents from the preview state` (turn-test board "shove moves the intent"); `ghost when a unit would move`.
- `projection.test.ts` (**the drift guard**): for every `SCENARIOS` entry, `runScenario`-style replay of `demo` from `scenarioBattle(def)`: the last step of `buildSteps(viewOf(initial), events)` equals `viewOf(final)` on units (pos, hp, alive, inked, shield, brass) and tiles (oil, ink, plate, vent, `steam > 0`, `fire > 0`).
Browser checklist:
- `#/lab?scenario=sandbox` → board with D at B7, S at E7, two dummies, oil patch C4–D4, steam B5, plate E5; Lab bar shows `sandbox`. Tap D → reach dots (≤ 3 tiles), caption hint. Tap B6 → D moves, `Undo move` enabled → tap it → back at B7.
- `#/lab?scenario=ink-spark-detonation` → tap D, tap its Bolt button, tap a tile right of D → preview badges on the dummy, Footer `Confirm Bolt right` → confirm → caption steps through `Draughtsman casts Bolt right` … `ink pools at …`, ink blots appear. Then S: Bolt up → confirm → playback shows `the ink on dummy at D1 detonates`; final dummy HP `2/12`. Open Log → lines match engine §7.4 S1.
- `#/lab?scenario=oil-chain` → cast, take a screenshot mid-playback (fire spreading), tap board → skip, both rats gone, fire on C2–F2 with digit `2`.
- `#/lab?scenario=shove-slide` → S, Shove, tap the rat → ghost at E1 in preview → confirm → slide animation.
- With E6: `#/lab?scenario=sentry-steam-block` → End turn (armed, second tap) → `sentry at A1 fires right` · `Line is stopped by the steam at C1`.
- Layout: nothing below the footer is cut off; `[data-testid=footer]` bottom ≤ `innerHeight`; screenshot.

### U5 — Lab tools (after U4; ∥ U6, E7)
Files: `src/app/lab.ts` (rest), `lab.svelte.ts` (paint, lattices, copy, playDemo, undo), `lab/{Palette,CopySheet}.svelte`, `screens/Lab.svelte` (Board + Lattices modes, `⋯` sheet), Gallery link.
Tests `lab.test.ts`: `toggleToken` table (`. + r → r`, `r + r → .`, `r + b → b`, `r! + f → f`, `ro + ! → r!o`, `o + * → *`, `* + * → o` (removing fire leaves the oil), `ro + . → .`), `mod without unit is ignored`, `paletteEdits moves an existing member`, `baseOf records hp and intents by label`, **`toScenarioDef round-trips`**: load `oil-chain`, apply its demo, export → `runScenario(def).lines` equals `def.expected`; `formatScenario output contains board and lattices as template strings`; `labLocation defaults to sandbox`.
Browser checklist: `#/lab?scenario=sandbox` → Board mode: palette visible (16 items, each ≥ 44px), select `r`, tap A1 → rat appears; select `o`, tap A1 → `ro`; select `D`, tap A3 → Draughtsman relocates (only one D). Lattices mode: shelf shows `∞`, pot `∞`; add Spark after Bolt for D → back to Play, cast → Spark hits. `⋯ → Copy as scenario` → toast "Copied" or CopySheet textarea containing `board:` and `expected:`. `⋯ → Undo last action` restores. `#/lab?scenario=self-combo&demo=1` → demo auto-plays, Log ends with `Detonation hits dummy at C1 for 2`. Unknown `#/lab?scenario=nope` → sandbox + toast. Screenshot Board mode.

### U6 — Game store, Study, Codex (after E7 + U3; ∥ U5)
Files: `src/app/save.ts` (`loadSave`, `writeSave`), `flow.ts` (resolveScreen + study reducers), `study.ts` (Profile overloads: `decideSocketTap(p, m, at, tool)`, `shelfSlots(p, m, capacity)`), `game.svelte.ts` (study + persistence parts), `instance.ts` (`game`), `lab.svelte.ts` (profile lattices for members without scenario lattices), `App.svelte` (resolveScreen + redirect effect), `study/StudyScene.svelte`, `codex/CodexEntry.svelte`, `screens/{Study,Codex}.svelte`, `main.ts` (dev hook, `game` import).
Tests: `flow.test.ts`: full `resolveScreen` table (§1.2) incl. redirects; `loadSave: empty backend → new save; garbage → recovered + .corrupt copy; valid text → same SaveData`; `study reducers persist` (memory backend: a placement writes once). `study.test.ts` (extend): `shelfSlots: unknown runes are ??? and unusable`, `free counts across both lattices`, `profile placement honours canPlace reasons`.
Browser checklist: clear storage (`localStorage.clear()` then reload) → `#/study`: scene band, bookmarks, Draughtsman lattice `Bolt▸ Ink`, pot `3/8`, spells list, shelf with Bolt `0 /2` (one placed in each lattice), Ward `1 /1`, Bend `2 /2`, unowned runes as `???`, door enabled. Place Oil on the Stoker → reload → still there (persisted). Tap a `???` slot → toast "Not found yet". Book button → `#/codex`: `???` entries for unowned runes and all 7 interactions, counter `7 / 21 known` (the start collection owns 7 rune types), owner notes in the hand font for known runes; back → study. Menu → Copy save → toast; Paste garbage → error toast, save unchanged. Whole Study fits 375×812 for both members (`document.scrollingElement.scrollHeight <= innerHeight`). Screenshot Study (both tabs) and Codex.
Docs: DESIGN §11 rows for the UI decisions (§6 below: codex unknown = blank `???`, tap semantics, full outcome previews).

### U7 — Expedition flow (after U4 + U6)
Files: `flow.ts` (setOut/startBattle/endBattle/takeOffer/pushOnward/goHome/newDiscoveries), `game.svelte.ts` (trip part, debug), `trip/{TripStatus,OfferCard}.svelte`, `screens/{Combat,Loot,Crossroads,Cleared,Wiped}.svelte`, `Study.svelte` (door confirm sheet → `game.setOut()`), `App.svelte` (`ensureBattle` effect lives in Combat).
Tests `trip.test.ts`: `setOut writes a fight trip`; `startBattle is deterministic for a save (reload restarts the same fight)`; `endBattle won → looting with offers; learned = only new interactions`; `endBattle lost → trip null and WipeSummary lists the lost loot`; `takeOffer → crossroads; heart takeOffer×2 → cleared`; `goHome banks loot into the collection`; `newDiscoveries dedups against known and already-toasted`; `resolveScreen follows each status`.
Browser checklist (clear storage first):
1. `#/study` → door → confirm sheet → `Set out` → URL `#/trip`, board shows encounter 1 (three rats), enemies declare intents in playback, TopBar `Round 1 · Three rats`.
2. Play a turn by tapping: move D, cast Bolt at a rat, End turn → enemies act, rats move leaving oil.
3. Reload the page mid-fight → back on `#/trip`, same encounter at round 1 (restart).
4. `__game.debug.forceWin()` → won overlay → `Gather the spoils` → Loot with 3 offers → select one → `Take` → Crossroads shows HP/charges carried (charges reduced if a spell was cast), pending loot glyph. Reload → still Crossroads.
5. `Push on` → encounter 2 battle. `forceWin` → loot → take → `Return home` → Study: the taken rune's shelf count increased (or ink capacity +2).
6. New trip → `forceLose` → wipe overlay → Wiped screen lists lost loot → `Back to the study` → loot not banked; Codex keeps interactions discovered (if any were triggered by real play, e.g. cast Stoker's Spark on oil in encounter 3).
7. Codex from Crossroads → back returns to `#/trip`.
Screenshots: battle, loot, crossroads, wiped. Final pass of the general checks on every route.
Docs: TECH §7 row "Trip screens derived from `trip.status`; reload mid-fight recreates the encounter from the seed".

---

## 6. Decisions taken (invented here; record in DESIGN §11 / TECH §7 in the step that ships them)

1. **Route `combat` renamed `trip`**; the trip status, not the URL, picks battle/loot/crossroads/cleared. Study is unreachable while a trip is active (you're out in the city); Codex stays reachable. Lab never touches the save.
2. **Full outcome previews** (Into the Breach style): before confirming a cast or shove you see path, targets, damage numbers, kills, push ghosts and redirected intents, computed by calling `applyAction` and discarding. Interaction *names* in the preview caption are hidden until discovered, so `???` entries are still found by playing.
3. **Tap again to confirm** a cast/shove, or press Confirm. Moves need no confirmation (they're undoable). End turn needs a second tap only if a member could still act.
4. **Playback** is a UI projection of the event log onto a view model (no rule code), 160–420 ms per event, tap anywhere to skip; the board always snaps to the engine's post-state at the end. A test replays every Lab scenario to guard projection drift.
5. **During playback, intents show only as chevrons + order numbers**; full danger paths reappear when idle (they need engine queries on a real state).
6. **Lattice editing by tap**: shelf rune → socket places; tapping a placed arrow rune rotates clockwise; long-press (450 ms) or Erase mode removes; a different shelf rune on an occupied socket replaces. The shelf tool stays selected while copies remain.
7. **Shelf shows all 14 runes**; unowned ones are `???` silhouettes (pillar 4).
8. **Codex unknown entries show only `???`** and a silhouette; the owner's note appears once known. Hints for `???` stay an open design question.
9. **Board coordinate labels** (A–F, 1–8) are always shown in a thin gutter so the log ("rat at C2") maps to the board.
10. **Material colors** as listed in §3.1 (ink blue-black, oil olive amber, steam pale blue-grey drawn above units at 60%, spark gold with ink outline, brass, fire vermilion, vent slate); danger red for intents; member colors blue-ink (Draughtsman) and ember (Stoker).
11. **Light parchment theme only**; no dark mode in v0.
12. **No mid-fight retreat**; a fight always ends in a win or a wipe.
13. **Save export/import** lives in the Study menu as copy/paste text (TECH's backup against iOS eviction). A corrupt save is kept under `<key>.corrupt` and replaced by a new game with a toast.
14. **Lab** shows the event log and offers "Copy as scenario", producing a `ScenarioDef` literal (board, lattices, hp, intents, demo, expected) for `src/data/scenarios.ts`; a test proves the export replays to its own expected lines. Shields and charges aren't captured (not in the notation).
15. **New interaction toast** in trip battles: "New in the notebook: Ignite" the first time an interaction appears.
16. **Dev-only `window.__game` / `__lab`** handles, plus `__game.debug.forceWin/forceLose`, exist for verification; stripped from production builds via `import.meta.env.DEV`.
17. **Reduced motion** halves playback durations and drops trails; the rain in the study pauses.

### Engine-contract assumptions to confirm with the engine owner
- `scenarioBattle(def, { lab: true })` exists (or `lab` defaults to true for Lab use); `labSetCell` throws a readable `Error` for invalid tokens (unit on a plate).
- `intentPreview(state, enemy)` takes an `EnemyUnit` (or id) and returns the path and hit tile; `aimPreview` returns the full projectile path for each bolt dir; `castableSpells` returns `{ spell, charges, usable }`.
- `PathCell.dir` is the travel direction on entry (so the previous cell is `step(at, opposite(dir))`).
- `ScenarioDef` is importable as a type from `$data`, and `describeLog`/`describe` from `$engine`.
