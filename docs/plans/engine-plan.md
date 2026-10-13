# v0 Engine + Data Implementation Plan

Scope: `src/engine/`, `src/data/`, `tests/` only. No UI. Authoritative rules: DESIGN.md §9.5; where it is silent this plan decides (see **Decisions taken**, §10). Every rule interpretation listed there must be recorded in DESIGN.md (§9.5 note + §11 log row) by the step that implements it; TECH.md §7 gets one row for the engine architecture (step 1).

Pre-req: DESIGN.md currently has the uncommitted §9.5 block. Commit it (`docs: v0 rule defaults`) before step 1.

---

## 0. Ground rules for implementers

- Strict TS, no `any`, no `!` non-null assertions (use throwing getters: `tileAt`, `unitById`). `noUncheckedIndexedAccess` is on.
- `src/engine/**` never imports `ui/`, `app/`, svelte (Biome enforces). Engine imports `$data` (values + types). `src/data/**` imports engine **types only** (`import type … from '$engine/grid'` / `'$engine/types'`). No runtime cycle.
- Randomness only through `engine/rng.ts`. Battle resolution in v0 uses **no randomness at all** (AI tie-breaks are fixed order); rng is used for loot. `BattleState.rngState` is still threaded for future use.
- **Immutability contract:** every *public* function that "changes" state takes a `BattleState`/`Profile`/`Trip` and returns a new one; the input is never mutated. Internally, `applyAction` does one `structuredClone(state)` and all effect helpers mutate that draft through a `Ctx` (`ctx.s` = draft, `ctx.log` = events). Query helpers (`queries.ts`) are pure and read-only.
- Coordinates: `{x, y}`, x right, y down; labels `A1` = `{0,0}` (existing `label()`). **Reading order** = y asc, then x asc. **DIRS order** = up, right, down, left (existing). Both are the only tie-breaks used anywhere.
- Each step ends with `pnpm check` green and one commit (`feat(engine): …`, `feat(data): …`, `test: …`).

---

## 1. Module layout

### src/data/ (content + tunables, typed TS objects, no logic)
| File | Responsibility |
|---|---|
| `types.ts` | All id unions + def interfaces (RuneDef, MemberDef, EnemyDef, AttackDef, EncounterDef, LootTableDef, CodexEntryDef, ScenarioDef, Tuning). |
| `tuning.ts` | `TUNING`: every number (ink costs, damages, durations, ranges, grid size, affinity bonus…). |
| `runes.ts` | `RUNE_IDS`, `RUNES: Record<RuneId, RuneDef>` (14 runes). |
| `members.ts` | `MEMBER_IDS`, `MEMBERS: Record<MemberId, MemberDef>` incl. lattice shape + start lattice as ASCII. |
| `enemies.ts` | `ENEMY_IDS`, `ENEMIES`, `ATTACKS: Record<AttackId, AttackDef>`. |
| `encounters.ts` | `ENCOUNTERS: readonly EncounterDef[]` (the Seam, 4, in order) with ASCII layouts. |
| `loot.ts` | `LOOT_TABLES: Record<LootTableId, LootTableDef>`, `START_COLLECTION`. |
| `codex.ts` | `INTERACTION_IDS`, `CODEX: readonly CodexEntryDef[]` (14 rune + 7 interaction entries). |
| `scenarios.ts` | `SCENARIOS: readonly ScenarioDef[]` (Lab deep-link scenarios, each with demo actions + expected log). Created step 5, extended step 7. |
| `index.ts` | Re-exports everything. |

### src/engine/
| File | Responsibility | Public? |
|---|---|---|
| `grid.ts` (exists) | + `key`, `parseKey`, `byReadingOrder`, `neighbors4`, `square(c,r)`, `chebyshev`, `inBoundsOf(state)`. | yes |
| `rng.ts` (exists) | + `deriveSeed(seed, salt)`, `pickWeighted`. | yes |
| `types.ts` | Engine state types: lattice, spell tree, battle, actions, run layer, save. | yes |
| `events.ts` | `GameEvent` union, `UnitRef`, `who()`, `describe()`, `describeLog()`, `discoveriesIn()`. | yes |
| `notation.ts` | ASCII board + lattice parse/serialize, cell-token parser (shared by tests, encounters, Lab). | yes |
| `lattice.ts` | Compiler (flow walk → `Spell[]`), `describeSpell`, ink cost, lattice validation, socket edit ops. | yes |
| `queries.ts` | Pure reads on `BattleState`: tile/unit lookup, projectile `travel`, BFS `reachable`/`distanceField`, floods (steam cloud, brass net, oil region), footprints, legal-move/target queries, previews. | yes |
| `ctx.ts` | `Ctx` type, `runDraft(state, fn)`, `emit`, mutable accessors, `ref(unit)`, `checkEnd`. | internal (tests may import) |
| `damage.ts` | `dealDamage`, `kill`, `detonate`, `sparkHit`, `burn`. | internal |
| `materials.ts` | `applyInk/Oil/Steam/Brass/Spark`, `ignite`, `spreadFire`, `footprint` use. | internal |
| `movement.ts` | member move/undo, `pushUnit` (bump, slide), `settle` (ink puddle), enemy walk + oil trail. | internal |
| `cast.ts` | `castAction`, `castSpell`, `resolveSource`, `runNodes`, triggers, `runEchoes`. | internal |
| `ai.ts` | Enemy planning: destination + intent per AI type; `enemyPhase(ctx, {move})`. | internal |
| `turn.ts` | `endTurnAction`: resolve intents, hazards, next round, enemy phase, player phase, echoes. | internal |
| `battle.ts` | `createBattle`, `applyAction` (dispatcher + legality), `isLegal`, `replay`, `boardOf`, `labSetCell`. | yes |
| `scenario.ts` | `scenarioBattle(spec)`, `runScenario(def)`, `labSetLattice`. | yes |
| `run.ts` | Profile, trip, loot offers, codex view, loadout validation, save data. | yes |
| `index.ts` | Re-exports public modules (grid, rng, types, events, notation, lattice, queries, battle, scenario, run). |

Step 1 creates every engine file listed as public with `export {};` placeholders and the final `index.ts`, so later (parallel) steps never edit `index.ts`.

---

## 2. Core types

### 2.1 `src/data/types.ts`
```ts
import type { Dir } from '$engine/grid';
import type { Action } from '$engine/types';

export type RuneFamily = 'source' | 'material' | 'shape' | 'trigger' | 'aura';
export type SourceRuneId = 'bolt' | 'splash' | 'ward';
export type MaterialRuneId = 'ink' | 'oil' | 'spark' | 'steam' | 'brass';
export type ShapeRuneId = 'bend' | 'fork';
export type TriggerRuneId = 'onInked' | 'onKill';
export type AuraRuneId = 'amplify' | 'echo';
export type RuneId = SourceRuneId | MaterialRuneId | ShapeRuneId | TriggerRuneId | AuraRuneId;
export type MaterialId = MaterialRuneId;            // affinity talks about these
export type MemberId = 'draughtsman' | 'stoker';
export type EnemyId = 'rat' | 'sentry' | 'familiar' | 'dummy';
export type AttackId = 'bite' | 'line' | 'spit';
export type InteractionId = 'ignite' | 'conduct' | 'arc' | 'detonate' | 'extinguish' | 'slide' | 'diffuse';
export type Rarity = 'common' | 'uncommon' | 'rare';
/** What "magnitude" means for this rune. footprint: radius = magnitude − 1 (Chebyshev square). */
export type Scale = 'damage' | 'shield' | 'footprint' | 'none';

export interface RuneDef {
  id: RuneId;
  name: string;        // 'Bolt', 'On Inked'
  token: string;       // lattice ASCII token: 'Bolt', 'OnInked', 'Amp'
  family: RuneFamily;
  rule: string;        // one-line rule (codex + tooltip)
  arrow: boolean;      // true for sources + bend (absolute, rotatable arrow)
  base: number;        // base magnitude (0 for shape/trigger/aura)
  scale: Scale;
  charges: number;     // per trip, sources only; 0 otherwise
  rarity: Rarity;
}

export interface MemberDef {
  id: MemberId; name: string; token: string;   // board token 'D' / 'S'
  hp: number; move: number;
  affinity: readonly MaterialId[];
  shape: string;        // lattice ASCII: '.' socket, 'x' hole
  startLattice: string; // lattice ASCII, same dims/holes as shape
  blurb: string;
}

export interface AttackDef {
  id: AttackId; name: string;           // damage source label: 'Bite' | 'Line' | 'Spit'
  verb: string; verbs: string;          // 'bite'/'bites', 'fire'/'fires', 'spit'/'spits'
  kind: 'adjacent' | 'projectile';
  range: number;                        // 1, 99 (unlimited), 2
  damage: number;
  inks: boolean;
}

export type EnemyAi = 'chaser' | 'liner' | 'spitter' | 'idle';
export interface EnemyDef {
  id: EnemyId; name: string; token: string;    // name lowercase: 'rat' | 'sentry' | 'familiar' | 'dummy'
  hp: number; move: number;
  attack: AttackId | null; ai: EnemyAi;
  brass: boolean; oilSoaked: boolean; oilTrail: boolean;
  blurb: string;
}

export type LootTableId = 'shallow' | 'deep' | 'heart';
export interface EncounterDef {
  id: string; title: string; depth: number;    // 1..4
  layout: string;                              // board ASCII, 6×8, includes D and S
  loot: LootTableId; picks: number;            // heart: 2
  heart: boolean;
}

export type LootSpec =
  | { kind: 'rune'; rune: RuneId }
  | { kind: 'ink' }                            // member chosen when rolled
  | { kind: 'research'; amount: number };
export interface LootEntry { spec: LootSpec; weight: number }
export interface LootTableDef { id: LootTableId; entries: readonly LootEntry[] }

export interface CodexEntryDef {
  id: string;                                   // 'rune:bolt', 'interaction:ignite'
  kind: 'rune' | 'interaction';
  ref: RuneId | InteractionId;
  title: string; text: string;                  // the rule
  ownerNote: string;                            // previous owner's cryptic margin note
}

export interface ScenarioDef {
  id: string; title: string; note: string;
  board: string;                                // board ASCII
  lattices?: Partial<Record<MemberId, string>>; // omitted member → Lab uses profile lattice; tests use none
  hp?: Readonly<Record<string, number>>;        // by cell label 'C1'
  intents?: Readonly<Record<string, Dir>>;      // by cell label; listed enemies telegraph this dir, others idle
  demo: readonly Action[];
  expected: readonly string[];                  // describeLog of all demo events concatenated
}

export interface Tuning {
  grid: { width: number; height: number };
  inkCost: Record<RuneFamily, number>;
  startInk: number; inkReserve: number;
  affinityBonus: number;
  inkedBonus: number; detonateDamage: number; bumpDamage: number;
  fireDamage: number; oilSoakedBonus: number; fireRounds: number; steamRounds: number;
  splashRange: number; splashRadius: number;
  echoDivisor: number; reviveHp: number; offersPerWin: number;
}
```

### 2.2 Data values (exact)
`TUNING`: grid 6×8; inkCost {source 2, material 1, shape 1, trigger 2, aura 3}; startInk 8; inkReserve 2; affinityBonus 1; inkedBonus 1; detonateDamage 2; bumpDamage 1; fireDamage 1; oilSoakedBonus 1; fireRounds 2; steamRounds 2; splashRange 3; splashRadius 1; echoDivisor 2; reviveHp 1; offersPerWin 3.

`RUNES` (id · name · token · family · arrow · base · scale · charges · rarity):
- bolt · Bolt · `Bolt` · source · ✓ · 2 · damage · 3 · common
- splash · Splash · `Splash` · source · ✓ · 1 · damage · 2 · uncommon
- ward · Ward · `Ward` · source · ✓ · 2 · shield · 2 · uncommon
- ink · Ink · `Ink` · material · – · 1 · footprint · 0 · common
- oil · Oil · `Oil` · material · – · 1 · footprint · 0 · common
- spark · Spark · `Spark` · material · – · 1 · damage · 0 · common
- steam · Steam · `Steam` · material · – · 1 · footprint · 0 · uncommon
- brass · Brass · `Brass` · material · – · 1 · footprint · 0 · uncommon
- bend · Bend · `Bend` · shape · ✓ · 0 · none · 0 · common
- fork · Fork · `Fork` · shape · – · 0 · none · 0 · common
- onInked · On Inked · `OnInked` · trigger · – · 0 · none · 0 · uncommon
- onKill · On Kill · `OnKill` · trigger · – · 0 · none · 0 · rare
- amplify · Amplify · `Amp` · aura · – · 0 · none · 0 · rare
- echo · Echo · `Echo` · aura · – · 0 · none · 0 · rare

`MEMBERS`:
- draughtsman · Draughtsman · `D` · hp 6 · move 3 · affinity [ink]
  shape `". . . . .\n. . . . .\nx . . . x"`; startLattice:
  ```
  .     .   . . .
  Bolt> Ink . . .
  x     .   . . x
  ```
- stoker · Stoker · `S` · hp 8 · move 3 · affinity [spark, oil]
  shape `"x . x\n. . .\n. . .\n. . .\n. . .\nx . x"`; startLattice:
  ```
  x Boltv x
  . Spark .
  . .     .
  . .     .
  . .     .
  x .     x
  ```

`ATTACKS`: bite {Bite, bite/bites, adjacent, range 1, dmg 1, inks false}; line {Line, fire/fires, projectile, 99, 2, false}; spit {Spit, spit/spits, projectile, 2, 1, true}.

`ENEMIES`: rat {`r`, hp 2, move 3, bite, chaser, brass false, oilSoaked true, oilTrail true}; sentry {`b`, hp 5, move 1, line, liner, brass true}; familiar {`f`, hp 1, move 2, spit, spitter}; dummy {`d`, hp 12, move 0, attack null, idle — Lab/test only, never in encounters}.

`ENCOUNTERS` (layouts are drafts; integrity test enforces counts):
```
1 'three-rats' "Three rats" depth 1, loot shallow, picks 1
. . r . . .
. . . . r .
r . . . . .
. . . . . .
. . . . . .
. . . . . .
. D . . S .
. . . . . .

2 'rats-and-familiar' "A familiar's errand" depth 2, shallow, 1
. f . . . .
. . . . r .
. o o . . .
. . . . i .
r . . . . .
. . . . . .
. . D . S .
. . . . . .

3 'sentry-post' "The sentry post" depth 3, deep, 1
. . b . . .
. . . . . r
. o o o . .
. o . o . .
r . . . . .
. . = . . .
. D . . S .
. . . . . .

4 'heart' "Heart of the Seam" depth 4, heart, picks 2, heart true
b . . f . b
. = . . = .
. . @~ ~ . r
r o o . . .
. . . . @~ .
. = . . . .
. . D S . .
. . . . . .
```

`LOOT_TABLES` (weights):
- shallow: Ink 3, Spark 3, Oil 3, Bend 2, Fork 2, Steam 2, Brass 2, ink-reserve 3, research(1) 2
- deep: Steam 2, Brass 2, OnInked 3, Splash 2, Ward 2, Bolt 1, Amplify 1, OnKill 1, ink-reserve 3, research(2) 2
- heart: Amplify 3, Echo 3, OnKill 3, OnInked 2, Splash 2, ink-reserve 2, research(3) 1

`START_COLLECTION`: bolt 2, ward 1, ink 2, spark 2, oil 1, bend 2, fork 1, all others 0.

### 2.3 `src/engine/types.ts`
```ts
import type { AttackId, EnemyId, InteractionId, MaterialRuneId, MemberId, RuneId,
  SourceRuneId, TriggerRuneId, AuraRuneId } from '$data';
import type { Coord, Dir } from './grid';
import type { GameEvent } from './events';

export type CellKey = string;        // "x,y"
export type SpellKey = CellKey;      // the source rune's lattice cell
export type UnitId = string;         // MemberId for members; `${enemyId}-${n}` (n from 1, per def, board reading order)

// ── Lattice ─────────────────────────────────────────────
export interface PlacedRune { at: Coord; rune: RuneId; dir?: Dir }     // dir iff RUNES[rune].arrow
export interface LatticeShape { width: number; height: number; holes: readonly Coord[] }
export interface Lattice { shape: LatticeShape; runes: readonly PlacedRune[] }

export type SpellNode =
  | { kind: 'material'; rune: MaterialRuneId; at: Coord; amp: number; magnitude: number; next: readonly SpellNode[] }
  | { kind: 'trigger'; rune: TriggerRuneId; at: Coord; next: readonly SpellNode[] };
/** A list of sibling nodes = a Fork's branches, left branch's nodes first. */

export interface PathCell { at: Coord; rune: RuneId; dir: Dir }        // dir = travel direction on entry (source: its arrow)
export interface AuraTouch { aura: AuraRuneId; from: Coord; to: Coord } // aura cell → touched path/source cell
export interface Spell {
  key: SpellKey; at: Coord; source: SourceRuneId;
  amp: number; magnitude: number;      // base + amp (sources get no affinity)
  echo: boolean;                       // an Echo touches the source cell
  charges: number;                     // max charges per trip (RUNES[source].charges)
  nodes: readonly SpellNode[];
  path: readonly PathCell[];           // every cell the flow entered, in walk order (for highlighting)
}
export interface CompiledLattice { spells: Spell[]; reached: CellKey[]; auraTouches: AuraTouch[] }
export interface LatticeIssue {
  kind: 'ink' | 'owned' | 'socket' | 'arrow' | 'overlap';
  at?: Coord; rune?: RuneId; message: string;
}

// ── Battle ──────────────────────────────────────────────
export interface Tile { oil: boolean; ink: boolean; steam: number; fire: number; plate: boolean; vent: boolean }
export interface Intent { attack: AttackId; dir: Dir; order: number }  // dir is from the enemy's CURRENT position at resolve time
export type Aim =
  | { kind: 'dir'; dir: Dir }          // Bolt
  | { kind: 'tile'; at: Coord }        // Splash
  | { kind: 'ally'; unit: UnitId };    // Ward

interface UnitBase {
  id: UnitId; name: string; pos: Coord;
  hp: number; maxHp: number; shield: number;
  inked: boolean; brass: boolean; oilSoaked: boolean;
}
export interface UndoRecord { from: Coord; puddle: boolean }           // puddle: the move consumed an ink puddle
export interface MemberUnit extends UnitBase {
  kind: 'member'; def: MemberId; move: number;
  moved: boolean; acted: boolean; undo: UndoRecord | null;
  spells: Spell[]; charges: Record<SpellKey, number>;
}
export interface EnemyUnit extends UnitBase { kind: 'enemy'; def: EnemyId; intent: Intent | null }
export type Unit = MemberUnit | EnemyUnit;   // hp 0 = dead/down: stays in array, ignored by all board queries

export interface EchoEntry { caster: UnitId; spell: SpellKey; aim: Aim }
export type BattlePhase = 'player' | 'won' | 'lost';
export interface BattleState {
  title: string; width: number; height: number;
  tiles: Tile[];                 // row-major, index y*width+x
  units: Unit[];                 // creation order = board reading order (members and enemies interleaved)
  round: number; phase: BattlePhase;
  echoes: EchoEntry[];
  discovered: InteractionId[];   // interactions seen in this battle (dedup, first-seen order)
  rngState: number;
  lab: boolean;                  // charges are not spent
}

export type Action =
  | { type: 'move'; unit: UnitId; to: Coord }
  | { type: 'undoMove'; unit: UnitId }
  | { type: 'cast'; unit: UnitId; spell: SpellKey; aim: Aim }
  | { type: 'shove'; unit: UnitId; dir: Dir }
  | { type: 'endTurn' };
export interface ActionResult { state: BattleState; events: GameEvent[] }

export interface PartyInit { hp?: number; spells?: Spell[]; charges?: Record<SpellKey, number> }
export interface BattleSpec {
  title: string; board: string; seed: number;
  party?: Partial<Record<MemberId, PartyInit>>;  // member tokens on the board are spawned; this overrides hp/spells/charges
  hp?: Readonly<Record<string, number>>;         // by label, any unit
  intents?: Readonly<Record<string, Dir>>;       // by label; if given, round-1 AI telegraph is skipped, unlisted enemies idle
  lab?: boolean;
}

// ── Run layer ───────────────────────────────────────────
export type LootItem =
  | { kind: 'rune'; rune: RuneId }
  | { kind: 'ink'; member: MemberId; amount: number }
  | { kind: 'research'; amount: number };
export interface Profile {
  collection: Record<RuneId, number>;            // owned counts
  inkCapacity: Record<MemberId, number>;
  lattices: Record<MemberId, PlacedRune[]>;      // shape comes from MEMBERS[m].shape
  interactions: InteractionId[];                 // codex: discovered interactions (runes: derived from collection)
  research: number;
}
export type TripStatus = 'fight' | 'looting' | 'crossroads' | 'cleared';
export interface Trip {
  seed: number;
  encounter: number;                             // index into ENCOUNTERS of the current/next fight
  status: TripStatus;                            // fight: go fight `encounter`; looting: pick from offers; crossroads: push or return; cleared: heart won, must return
  hp: Record<MemberId, number>;
  charges: Record<MemberId, Record<SpellKey, number>>;
  loot: LootItem[];                              // pending, banked on return, lost on wipe
  offers: LootItem[]; picksLeft: number;
}
export interface SaveData { profile: Profile; trip: Trip | null; seedCounter: number }
```

### 2.4 `src/engine/events.ts`
```ts
export interface UnitRef { id: UnitId; name: string; at: Coord; member: boolean }  // snapshot at event time
export type GameEvent =
  | { type: 'battleStart'; title: string }
  | { type: 'round'; round: number }
  | { type: 'phase'; phase: 'resolve' | 'enemy' | 'player' }
  | { type: 'won' } | { type: 'lost' }
  | { type: 'moved'; unit: UnitRef; to: Coord; path: Coord[] }
  | { type: 'moveUndone'; unit: UnitRef; to: Coord }
  | { type: 'shove'; by: UnitRef; target: UnitRef; dir: Dir }
  | { type: 'pushed'; unit: UnitRef; to: Coord }
  | { type: 'bump'; unit: UnitRef; into: string }                 // 'the edge' | 'a brass plate' | who(other)
  | { type: 'slide'; unit: UnitRef; to: Coord; path: Coord[] }
  | { type: 'cast'; caster: UnitRef; spell: string; aim: Aim; aimText: string; echo: boolean }
  | { type: 'echoQueued'; caster: UnitRef }
  | { type: 'echoFizzles'; caster: UnitRef }
  | { type: 'lands'; source: string; at: Coord; path: Coord[] }
  | { type: 'stopped'; source: string; at: Coord; by: 'steam' | 'brass plate'; path: Coord[] }
  | { type: 'splash'; center: Coord; tiles: Coord[] }
  | { type: 'damage'; target: UnitRef; amount: number; source: string; bonus: string[]; hpLeft: number }
  | { type: 'shieldAbsorbs'; unit: UnitRef; absorbed: number; left: number }
  | { type: 'shieldGained'; unit: UnitRef; amount: number }
  | { type: 'died'; unit: UnitRef }
  | { type: 'inked'; unit: UnitRef; via: 'mark' | 'puddle' }
  | { type: 'puddle'; tiles: Coord[] }
  | { type: 'diffuse'; at: Coord; tiles: Coord[] }
  | { type: 'oiled'; tiles: Coord[] }
  | { type: 'steam'; tiles: Coord[] }
  | { type: 'plates'; tiles: Coord[] }
  | { type: 'coated'; unit: UnitRef }
  | { type: 'detonate'; unit: UnitRef }
  | { type: 'ignite'; at: Coord; tiles: Coord[] }                 // tiles = whole lit region incl. `at`, reading order
  | { type: 'extinguish'; tiles: Coord[] }
  | { type: 'arc'; from: Coord; tiles: Coord[] }
  | { type: 'conduct'; from: Coord; tiles: Coord[] }
  | { type: 'trigger'; rune: TriggerRuneId; passed: boolean; at?: Coord }
  | { type: 'telegraph'; unit: UnitRef; intent: Intent; verb: string }
  | { type: 'idle'; unit: UnitRef }
  | { type: 'attack'; unit: UnitRef; intent: Intent; verbs: string }
  | { type: 'miss'; source: string }
  | { type: 'fireOut'; tiles: Coord[] }
  | { type: 'steamFades'; tiles: Coord[] }
  | { type: 'vent'; at: Coord };
```
`who(r)` = `r.member ? r.name : \`${r.name} at ${label(r.at)}\``. `list(tiles)` = labels joined with `', '`.

**describe() wording (exact; tests compare against these):**
| type | line |
|---|---|
| battleStart | `Encounter: ${title}` |
| round | `Round ${round}` |
| phase | resolve → `Enemies act`; enemy → `Enemies move`; player → `Your turn` |
| won / lost | `The party wins` / `The party is wiped out` |
| moved | `${who} moves to ${L(to)}` |
| moveUndone | `${who} steps back to ${L(to)}` |
| shove | `${who(by)} shoves ${who(target)} ${dir}` |
| pushed | `${who} is pushed to ${L(to)}` |
| bump | `${who} bumps into ${into}` |
| slide | `${who} slides across the oil to ${L(to)}` |
| cast | echo ? `Echo: ${caster}'s ${spell} repeats ${aimText} at half strength` : `${caster} casts ${spell} ${aimText}` (aimText: `right` / `at C4` / `on Stoker`) |
| echoQueued | `Echo: ${caster}'s spell will repeat next turn` |
| echoFizzles | `Echo: ${caster}'s spell fizzles` |
| lands | `${source} lands at ${L(at)}` |
| stopped | `${source} is stopped by the ${by} at ${L(at)}` |
| splash | `Splash bursts at ${L(center)}` |
| damage | `${source} hits ${who} for ${amount}` + (bonus.length ? ` (${bonus.join(', ')})` : '') |
| shieldAbsorbs | `${who}'s shield absorbs ${absorbed} (${left} left)` |
| shieldGained | `${who} gains a shield of ${amount}` |
| died | member → `${name} is down`; enemy → `${who} dies` |
| inked | mark → `${who} is inked`; puddle → `${who} steps in ink and is inked` |
| puddle | `ink pools at ${list}` |
| diffuse | `ink diffuses through the steam at ${L(at)}` |
| oiled | `oil coats ${list}` |
| steam | `steam rises at ${list}` |
| plates | 1 tile → `a brass plate rises at ${L}`; else `brass plates rise at ${list}` |
| coated | `${who} is coated in brass` |
| detonate | `the ink on ${who} detonates` |
| ignite | `oil at ${L(at)} ignites` + (rest.length ? `, fire spreads to ${list(rest)}` : '') where rest = tiles minus `at` |
| extinguish | `steam puts out the fire at ${list}` |
| arc | `Spark arcs through the steam from ${L(from)} (${tiles.length} tiles)` |
| conduct | `Spark conducts through the brass from ${L(from)} (${tiles.length} tiles)` |
| trigger | onInked pass `On Inked: a target is inked`; fail `On Inked: no inked target, the chain stops`; onKill pass `On Kill: bursts from ${L(at)}`; fail `On Kill: nothing died, the chain stops` |
| telegraph | `${who} will ${verb} ${dir}` |
| idle | `${who} waits` |
| attack | `${who} ${verbs} ${dir}` |
| miss | `${source} hits nothing` |
| fireOut | `the fire at ${list} burns out` |
| steamFades | `the steam at ${list} fades` |
| vent | `the vent at ${L(at)} puffs steam` |

`discoveriesIn(events): InteractionId[]` maps ignite→ignite, conduct→conduct, arc→arc, detonate→detonate, extinguish→extinguish, slide→slide, diffuse→diffuse (dedup, first-seen order).

---

## 3. Notation (src/engine/notation.ts)

### 3.1 Board ASCII
Whitespace-separated cell tokens, one row per line, blank lines ignored, rows right-padded with `.`. Token = `.` or `[unit?][mods*][layers*]`:
- Unit (first char): members by `MemberDef.token` (`D`, `S`); enemies by `EnemyDef.token` (`r` rat, `b` brass sentry, `f` familiar, `d` dummy).
- Mods (only after a unit): `!` inked, `&` brass-coated.
- Layers: `o` oil, `i` ink puddle, `~` steam (= `steamRounds`), `*` fire (= `fireRounds`, implies oil), `=` brass plate, `@` steam vent.
- Errors (throw, message names char + cell label): unknown char, mod without unit, unit on `=`, duplicate member token.
- Examples: `r` rat; `ro` rat on oil; `r!~` inked rat in steam; `r&` brass-coated rat; `*` burning oil; `@~` vent with steam; `=` plate.

```ts
export interface BoardUnit { kind: 'member' | 'enemy'; def: MemberId | EnemyId; at: Coord; inked: boolean; brass: boolean }
export interface BoardSpec { width: number; height: number; tiles: Tile[]; units: BoardUnit[] }   // units in reading order
export function parseBoard(ascii: string): BoardSpec;
export function parseCell(token: string, at: Coord): { tile: Tile; unit: BoardUnit | null };
export function serializeBoard(spec: BoardSpec): string;   // canonical: unit, mods (! &), layers in order o i ~ * = @ ; fire tile writes `*` not `o*`; columns padded to equal width
```
(The current harness `parseBoard`/`Board` is replaced; `tests/scenarios/smoke.test.ts` is rewritten.)

### 3.2 Lattice ASCII
Whitespace-separated tokens: `.` empty socket, `x` hole, rune token (`RuneDef.token`) with an arrow suffix iff `arrow`: `>` right, `<` left, `^` up, `v` down. E.g. `Bolt>`, `Bendv`, `Ink`, `OnInked`, `Amp`. Shape is derived from the grid (all non-`x` cells are sockets).
```ts
export function parseLattice(ascii: string): Lattice;       // throws on unknown token / missing or extra arrow
export function serializeLattice(l: Lattice): string;       // padded columns; round-trips through parseLattice
```

---

## 4. Lattice compiler (src/engine/lattice.ts)

```ts
export function compileLattice(l: Lattice, affinity: readonly MaterialId[]): CompiledLattice;
export function describeSpell(s: Spell): string;
export function inkCost(rune: RuneId): number;               // TUNING.inkCost[family]
export function inkUsed(l: Lattice): number;
export function countRunes(ls: readonly Lattice[]): Record<RuneId, number>;
export function validateLattice(l: Lattice, capacity: number | null): LatticeIssue[];  // null = unlimited (Lab); checks socket/hole, overlap, arrow presence, ink
export function socketAt(l: Lattice, at: Coord): PlacedRune | null;
export function isSocket(shape: LatticeShape, at: Coord): boolean;
export function setSocket(l: Lattice, at: Coord, rune: RuneId | null, dir?: Dir): Lattice;   // arrow runes default dir 'right'
export function rotateSocket(l: Lattice, at: Coord): Lattice;   // arrow runes: turnRight
```

**Walk algorithm** (per Source cell, sources in reading order):
```
visited = {key(source.at)};  path = [{at, rune, dir: source.dir}]
nodes = walk(step(source.at, source.dir), source.dir)

walk(cell, dir): SpellNode[]
  if !isSocket(cell) or socketAt(cell) is empty or visited has cell → []
  r = socketAt(cell); def = RUNES[r.rune]
  if def.family is 'aura' or 'source' → []           // insulators; nothing is marked visited
  visited.add(cell); path.push({at: cell, rune, dir})
  shape bend:  out = r.dir; if out === opposite(dir) → []; return walk(step(cell, out), out)
  shape fork:  L = turnLeft(dir), R = turnRight(dir)
               left = walk(step(cell, L), L)          // MUST run before right: left claims visited cells first
               right = walk(step(cell, R), R); return [...left, ...right]
  material:    amp = ampCount(cell); m = def.base + amp + (affinity has rune ? TUNING.affinityBonus : 0)
               return [{kind:'material', rune, at: cell, amp, magnitude: m, next: walk(step(cell, dir), dir)}]
  trigger:     return [{kind:'trigger', rune, at: cell, next: walk(step(cell, dir), dir)}]
```
- `ampCount(cell)` = number of orthogonal neighbours holding Amplify (stacks). Source: `amp = ampCount(source.at)`, `magnitude = base + amp` (no affinity on sources).
- `echo` = some orthogonal neighbour of the source cell holds Echo (multiple Echo don't stack).
- Visited is structural (static), per cast, shared across Fork branches. Triggers do not affect the walk.
- `reached` = all path cells of all spells; `auraTouches` = each (aura, path-or-source cell) adjacency that has effect (Amplify→any path cell incl. source; Echo→source cells only).

**describeSpell** (deterministic string, tested):
- Source: Bolt `Bolt (${m} damage)`; Splash `Splash (${m} damage, 3×3)`; Ward `Ward (shield ${m})`.
- Node list render `R(nodes)`: 0 → `''`; 1 → `node`; ≥2 → `[${nodes.map(node).join(' | ')}]`.
- material node: Spark `Spark (${m} damage)`; footprint runes `Ink` if m=1, else `Ink ${2m−1}×${2m−1}`; followed by ` → ${R(next)}` if next non-empty.
- trigger node: onInked `if inked: ${R(next)}`; onKill `on kill, from each victim: ${R(next)}`; empty next renders `(nothing)`.
- Full: `${source}` + (nodes ? ` → ${R(nodes)}` : '') + (echo ? ' · echoes next turn at half strength' : '').
- Examples: start Draughtsman `Bolt (2 damage) → Ink 3×3`; start Stoker `Bolt (2 damage) → Spark (2 damage)`.

---

## 5. Combat resolution

### 5.1 Public API (battle.ts / queries.ts / scenario.ts)
```ts
createBattle(spec: BattleSpec): ActionResult
createEncounterBattle(enc: EncounterDef, party: Partial<Record<MemberId, PartyInit>>, seed: number): ActionResult
applyAction(state: BattleState, action: Action): ActionResult      // throws IllegalActionError(reason) if !legal
isLegal(state, action): string | null                               // null = legal, else reason
replay(spec: BattleSpec, actions: readonly Action[]): { states: BattleState[]; events: GameEvent[] }  // states[0] = created
boardOf(state): string                                              // serializeBoard of current board (Lab "copy as scenario")
labSetCell(state, at, token): BattleState                           // Lab edit: replace tile + unit at cell (new unit id)
// queries.ts (pure)
tileAt, unitAt(state, c): Unit | null (living only), unitById, livingUnits, members, enemies
legalMoves(state, unit): Coord[]          // [] if moved/dead/not player phase
canUndoMove(state, unit): boolean
shoveDirs(state, unit): Dir[]
castableSpells(state, unit): { spell: Spell; charges: number; usable: boolean }[]
legalAims(state, unit, spell: SpellKey): Aim[]
aimPreview(state, unit, spell, aim): { path: Coord[]; targets: Coord[] }   // projectile path + initial target tiles
intentPreview(state, enemy): { path: Coord[]; hit: Coord | null } | null
travel(state, from, dir, range, ignore?: UnitId): Travel
// scenario.ts
scenarioBattle(def: ScenarioDef | (BattleSpec & {lattices?}), opts?): ActionResult   // compiles lattices with member affinity
runScenario(def: ScenarioDef): { state: BattleState; events: GameEvent[]; lines: string[] }  // plays demo
labSetLattice(state, member, lattice): BattleState                 // recompile spells, reset charges
```
Pure previews: the UI may call `applyAction` on any state to preview an action and discard the result.

### 5.2 createBattle
1. `parseBoard(spec.board)`; tiles copied. Units created in board reading order. Members: hp = party[m].hp ?? def.hp (maxHp = def.hp), spells = party[m].spells ?? [], charges = party[m].charges ?? {key: spell.charges}. Enemies: id `${def}-${n}`, hp def.hp, brass = def.brass || token `&`, oilSoaked = def.oilSoaked, inked = `!`. `spec.hp` overrides by label.
2. round = 1, phase 'player', echoes [], discovered [], rngState = spec.seed >>> 0, lab = !!spec.lab.
3. Events: `battleStart`, `round 1`, `phase enemy`, then telegraphs: if `spec.intents` → set those enemies' intents (attack = def.attack, order by unit order) and emit `telegraph`; others `idle`. Else `enemyPhase(ctx, {move: false})`. Then `phase player`.
4. No win/lose check at creation.

### 5.3 Projectile `travel(state, from, dir, range, ignore)`
```
path = []; cur = from
repeat range times: nxt = step(cur, dir); if !inBounds → break
  path.push(nxt); cur = nxt
  if tile.steam > 0            → {path, stop: nxt, reason: 'steam'}     // steam checked FIRST: units inside are shielded
  if living unit (≠ ignore)    → {path, stop: nxt, reason: 'unit', unit}
  if tile.plate                → {path, stop: nxt, reason: 'brass'}
return path.length ? {path, stop: last, reason: 'end'} : {path: [], stop: null, reason: 'none'}
```
Used by Bolt (range = max(width,height)), Line (99), Spit (2), and AI line checks.

### 5.4 Damage pipeline (damage.ts)
```
dealDamage(ctx, unit, base, source, extra: string[] = []): boolean(killed)
  amount = base; bonus = [...extra]
  if unit.inked: amount += inkedBonus; bonus.push('inked +1')
  absorbed = min(unit.shield, amount); unit.shield -= absorbed; unit.hp = max(0, unit.hp − (amount − absorbed))
  emit damage {target: ref, amount, source, bonus, hpLeft: unit.hp}
  if absorbed > 0: emit shieldAbsorbs {absorbed, left: unit.shield}
  if unit.hp === 0: kill(ctx, unit); return true
kill: emit died; if ctx.cast push {unit: id, at: pos} to ctx.cast.kills; enemy.intent = null; member.undo = null
detonate(ctx, u): u.inked = false; emit detonate; dealDamage(u, detonateDamage, 'Detonation')
sparkHit(ctx, u, dmg): killed = dealDamage(u, dmg, 'Spark'); if !killed && u.inked → detonate
burn(ctx, u): extra = u.oilSoaked ? ['oil-soaked +1'] : []; killed = dealDamage(u, fireDamage + (soaked ? oilSoakedBonus : 0), 'Fire', extra); if !killed && u.inked → detonate
```
Inked +1 applies to every damage instance (bolt, splash, spark, fire, bite, line, spit, bump) except Detonation (mark already gone).

### 5.5 Material interactions (materials.ts). All take tile lists, process in reading order.
- `footprint(targets, m)`: union of `square(t, max(0, m−1))` clipped to board, dedup, reading order.
- **applyInk(tiles)** (Ink rune, Spit): `cloudDone = Set`; for each tile: plate → skip; steam>0 → if not in cloudDone: `cloud = steamCloud(t)`; add all to cloudDone; emit `diffuse {at: t, tiles: cloud}`; each living un-inked unit in cloud (reading order): inked=true, emit `inked mark`. Else living unit → if !inked: mark + emit. Else if !tile.ink: tile.ink = true, collect. End: emit `puddle` if any collected. (`diffuse` interaction.)
- **applyOil(tiles)**: tiles without plate and without oil → oil=true; emit `oiled` if any; then `spreadFire()`.
- **applySteam(tiles)**: tiles without plate → steam = steamRounds; emit `steam` if any; those with fire>0 → fire=0 (oil stays); emit `extinguish` if any.
- **applyBrass(tiles)**: living unit → if !brass: brass=true, emit `coated`. Else if !plate: plate=true, oil=ink=false, steam=fire=0, collect. Emit `plates` if any.
- **applySpark(tiles, dmg)**:
  ```
  reached = Set; cloudDone = Set; brassDone = Set
  for t of tiles: spread(t)
  spread(t):
    if reached has t → return; reached.add(t)
    u = unitAt(t); if u → sparkHit(u, dmg)
    if tile.oil && tile.fire === 0 → ignite(t)              // ignite handles steam smothering
    if tile.steam > 0 && !cloudDone.has(t):
       cloud = steamCloud(t); mark all cloudDone; others = cloud − reached
       if others.length: emit arc {from: t, tiles: cloud}; for c of others (reading order) spread(c)
    if isBrassTile(t) && !brassDone.has(t):                 // plate, or living brass unit on t
       net = brassNet(t); mark all brassDone; others = net − reached
       if others.length: emit conduct {from: t, tiles: net}; for c of others spread(c)
  ```
  Networks mix naturally (a brass sentry standing in steam bridges both). Each tile/unit is sparked at most once per Spark application.
- **ignite(at)**: if !oil or fire>0 → return. If steam>0 at `at` → emit `extinguish [at]`, return. `region` = flood (orthogonal) over tiles with oil && fire===0 && steam===0, starting at `at`; neighbouring oil tiles that have steam are collected as `smothered` (not entered). Set fire = fireRounds on region. Emit `ignite {at, tiles: region}`; emit `extinguish {tiles: smothered}` if any. Then each living unit on region tiles (reading order): `burn`.
- **spreadFire()**: one pass over all tiles in reading order: oil && fire===0 && steam===0 && some neighbour fire>0 → `ignite(t)`. Called after any oil placement (rune or rat trail).
- Floods (`queries.ts`): `steamCloud(t)` (orthogonal steam>0), `brassNet(t)` (orthogonal isBrassTile), `oilRegion` as above; all return reading order.

### 5.6 Movement (movement.ts)
- `reachable(state, unit, move)`: BFS from pos, neighbours in DIRS order, passable = in bounds, no plate, no living unit. Returns Map key → {dist, path} (path excludes start). Destinations exclude start.
- **move action** (member): legal if phase player, alive, !moved, `to` ∈ reachable. `from=pos; pos=to; moved=true`; emit `moved {ref at from, to, path}`; `puddle = settle(unit)`; `undo = {from, puddle}`.
- **settle(unit)**: if tile.ink && !unit.inked → unit.inked = true; tile.ink = false; emit `inked puddle`; return true. Called after every completed move: member move, enemy walk, push, slide end.
- **undoMove**: legal if undo ≠ null and `undo.from` has no living unit and no plate. If undo.puddle: unit.inked=false; tile(pos).ink=true. pos = from; moved=false; undo=null; emit `moveUndone`.
- `undo` is cleared when the member casts/shoves, when it is pushed, and at the start of each player phase.
- **shove action**: legal if !acted, living unit at step(pos, dir). acted=true, undo=null; emit `shove`; `pushUnit(target, dir)`.
- **pushUnit(u, dir)**: dest = step(pos, dir). Out of bounds → emit `bump into 'the edge'`, dealDamage(u, bump, 'Bump'). Plate → `bump 'a brass plate'` + damage u. Living unit v → `bump who(v)`, damage u, then damage v. Else: pos=dest; if member: undo=null; emit `pushed`; `slide(u, dir)`; `settle(u)`.
- **slide(u, dir)**: `path=[]`; while tile(u.pos).oil: nxt = step(pos, dir); stop if out of bounds / plate / living unit; pos = nxt; path.push(nxt). If path non-empty emit `slide {to: pos, path}` (`slide` interaction). No bump damage while sliding; no fire damage passing through.
- **enemyWalk(e, path)**: emit `moved`; pos = end; if def.oilTrail: tiles = [start, ...path] lacking oil → oil=true, emit `oiled`, `spreadFire()`; `settle(e)`.

### 5.7 Cast (cast.ts) — exact step order
```
castAction(ctx, {unit, spell, aim}):
  legal: phase player; member alive; !acted; spell in unit.spells; (lab || charges[key] > 0); aim ∈ legalAims
  if !lab: charges[key]--;  acted = true; undo = null
  castSpell(ctx, unit, spell, aim, false)

castSpell(ctx, caster, spell, aim, echo):
  scale = m => echo ? max(1, floor(m / echoDivisor)) : m
  emit cast {caster, spell: RUNES[source].name, aim, aimText, echo}
  ctx.cast = { kills: [] }
  targets = resolveSource(...)                         // step 1: source effect
  runNodes(ctx, spell.nodes, targets, scale)            // step 2: path, depth-first
  if spell.echo && !echo && caster alive: push EchoEntry; emit echoQueued     // step 3
  ctx.cast = null
  (applyAction then: update discovered, checkEnd)

resolveSource:
  bolt:   r = travel(caster.pos, aim.dir, ∞, caster.id)
          unit → dealDamage(u, scale(m), 'Bolt'); steam → emit stopped 'steam'; brass → emit stopped 'brass plate'; end → emit lands
          return [r.stop]
  splash: tiles = square(aim.at, splashRadius) clipped; emit splash; each living unit on tiles (reading order) → dealDamage(scale(m), 'Splash'); return tiles
  ward:   ally = unitById(aim.unit); if dead → return []; ally.shield += scale(m); emit shieldGained; return [ally.pos]

runNodes(nodes, targets, scale): for node of nodes (in order):
  material: m = scale(node.magnitude)
            spark → applySpark(targets, m); ink/oil/steam/brass → applyX(footprint(targets, m))
            runNodes(node.next, targets, scale)
  onInked:  pass = some living unit on `targets` is inked (evaluated now)
            emit trigger {passed}; if pass → runNodes(node.next, targets, scale)
  onKill:   victims = snapshot of ctx.cast.kills
            if none → emit trigger fail
            else for v of victims: emit trigger {passed, at: v.at}; runNodes(node.next, burst(v.at), scale)
            burst(c) = [c, ...neighbors4(c)] in bounds, reading order
```
Chain reactions resolve synchronously inside each apply call, so they finish before the next node. A battle that ends mid-cast still finishes the cast; `checkEnd` runs after.

**Echo**: `runEchoes(ctx)` (called at the start of each player phase): take `s.echoes`, clear it; for each: caster alive and aim still valid (bolt: travel ≠ none; ward: ally alive, adjacency not required; splash: always) → `castSpell(…, echo=true)`; else emit `echoFizzles`. Echo casts spend no charge and no action and never queue another echo.

**legalAims**: bolt → dirs whose adjacent tile is in bounds; splash → every tile with chebyshev(caster, t) ≤ splashRange; ward → self + orthogonally adjacent living members.

### 5.8 Enemy AI (ai.ts) — deterministic, no rng
Shared: `distanceField(state, target, self)` = BFS distances from target.pos over passable tiles (self's tile treated as free). Nearest member = min BFS distance from enemy (tie: member order draughtsman, stoker). Candidates = `[stay] ∪ reachable(enemy, def.move)` when moving; `[stay]` when `move: false` (round 1).

- **chaser (rat)**: target = nearest member. Choose candidate minimizing (distanceField[c], pathLen, y, x). Walk there (if ≠ stay). Then if some living member is orthogonally adjacent: intent bite toward target if adjacent else the first adjacent member in DIRS order. Else `idle`.
- **liner (sentry)**: candidates sorted (pathLen, y, x) (stay first). First (candidate, dir in DIRS) where `travel(candidate, dir, 99, self)` stops on a living member (reason 'unit' and member) → walk there, intent line dir. Fallback: move like chaser toward nearest member, then intent line toward it: dominant axis of (dx, dy), tie → vertical.
- **spitter (familiar)**: same as liner with range 2 and attack spit.
- **idle (dummy)**: emit `idle`.
- `enemyPhase(ctx, {move})`: for each living enemy in unit order: plan + walk + telegraph sequentially (later enemies see earlier moves). Intent orders assigned 1..n in that sequence. Emit `telegraph {verb}` or `idle`.

### 5.9 Turn loop (turn.ts)
```
endTurnAction(ctx):                         // legal only in phase player
  emit phase resolve
  for enemy with intent, alive, by intent.order: resolveIntent(e); if checkEnd → return
  hazards(); if checkEnd → return
  round++; emit round; emit phase enemy
  enemyPhase(ctx, {move: true}); if checkEnd → return
  emit phase player
  members: moved = acted = false; undo = null
  runEchoes(ctx); checkEnd

resolveIntent(e): att = ATTACKS[intent.attack]; emit attack {verbs}
  adjacent: u = unitAt(step(pos, dir)); u ? dealDamage(u, att.damage, att.name) : emit miss
  projectile: r = travel(pos, dir, att.range, e.id)
    none → miss; unit → dealDamage; if att.inks && alive → applyInk([stop])
    steam → stopped 'steam'; if inks → applyInk([stop]) (diffuses)
    brass → stopped 'brass plate'
    end → lands; if inks → applyInk([stop]) (puddle)

hazards():
  1. each living unit on a fire tile (reading order): burn(u)
  2. fire>0 tiles: fire--; reaching 0 → oil=false; emit fireOut (aggregated)
  3. steam>0 tiles: steam--; reaching 0 → emit steamFades (aggregated)
  4. vents: if steam === 0 → emit vent; steam = steamRounds (also puts out fire there → extinguish)

checkEnd(ctx): no living enemies → phase 'won', emit won, true; no living members → 'lost', emit lost, true.
```
`applyAction` dispatch: move/undoMove/shove → movement; cast → cast; endTurn → turn; then append `discoveriesIn(events)` to `state.discovered` (dedup), then `checkEnd` (for non-endTurn). Any action when phase ≠ 'player' is illegal.

---

## 6. Run layer (src/engine/run.ts, pure)

```ts
newProfile(): Profile                         // START_COLLECTION, startInk each, start lattices (parseLattice(...).runes), [] , 0
latticeOf(p: Profile, m: MemberId): Lattice   // shape from parseLattice(MEMBERS[m].shape).shape
compiledFor(p, m): CompiledLattice            // compileLattice(latticeOf, MEMBERS[m].affinity)
validateLoadout(p): Partial<Record<MemberId, LatticeIssue[]>>   // validateLattice per member + 'owned' issues when countRunes(all) > collection
available(p, rune): number                    // collection − placed across both lattices
canPlace(p, m, at, rune): string | null       // reason: no socket / occupied / none left / not enough ink
setMemberLattice(p, m, l: Lattice): Profile

startTrip(p, seed): Trip                      // throws if validateLoadout has issues; status 'fight', encounter 0, full hp, charges from compiled spells
beginEncounter(p, t): ActionResult            // createEncounterBattle(ENCOUNTERS[t.encounter], party from trip, deriveSeed(t.seed, t.encounter)); requires status 'fight'
finishEncounter(p, t, b: BattleState): { profile: Profile; trip: Trip | null; outcome: 'won' | 'wiped' }
  // both: profile.interactions ∪= b.discovered
  // won: hp from units (0 → reviveHp), charges from units, offers = rollOffers(...), picksLeft = enc.picks, status 'looting'
  // lost: trip null (loot lost)
rollOffers(seed: number, table: LootTableId, members: MemberId[]): LootItem[]   // offersPerWin distinct entries, weighted, without replacement; ink entry → member = members[rng.int], amount = inkReserve; rng = createRng(deriveSeed(seed, 1000 + encounter))
pickLoot(t, index): Trip                      // move offer to loot; picksLeft--; at 0: offers [], status = heart ? 'cleared' : 'crossroads'
pushOn(t): Trip                               // requires 'crossroads'; encounter++, status 'fight'
returnHome(p, t): Profile                     // requires 'crossroads' | 'cleared'; banks loot: rune → collection+1, ink → inkCapacity[m]+amount, research → +amount
codexView(p): { entry: CodexEntryDef; known: boolean }[]   // rune known iff collection > 0; interaction iff in p.interactions
newSave(seed: number): SaveData               // {profile: newProfile(), trip: null, seedCounter: seed}
nextTripSeed(save): { seed: number; save: SaveData }       // seed = deriveSeed(seedCounter, 0); seedCounter+1
parseSaveData(data: unknown): SaveData        // structural validation; throws 'Not a valid save'; missing rune keys filled with 0
```
Save compatibility: `src/app/save.ts` stores `SaveEnvelope<SaveData>`; `migrations` stays empty, so this shape is **version 0**. Any later change to `Profile`/`Trip` needs a migration there. Saves are written only when `trip === null` or `trip.status !== 'fight'` **or** right before a fight starts (status 'fight'); battle state is never saved, so reopening mid-fight re-creates the same encounter from the same seed. (App glue `src/app/game.svelte.ts` belongs to the UI plan; engine only provides the functions above. The app passes `Date.now()` as the first seed — engine never reads the clock.)

---

## 7. Scenario harness + Lab scenarios

### 7.1 `tests/scenarios/harness.ts` (thin; parsing lives in the engine)
```ts
export { parseBoard, parseLattice, label } from '$engine';
export function expectLog(events: readonly GameEvent[], lines: readonly string[]): void      // exact (exists)
export function expectLogIncludes(events, lines): void        // `lines` appear as a contiguous run
export function board(ascii: string, opts?: Partial<BattleSpec>): BattleState               // step 4: createBattle({title:'test', seed:1, board: ascii, ...opts}).state
export function withLattices(ascii: string, lattices: Partial<Record<MemberId, string>>, opts?): BattleState   // step 5: scenarioBattle
export function act(state, action): { state: BattleState; events: GameEvent[]; lines: string[] }
export function cast(state, member: MemberId, aim: Dir | Aim, spell?: SpellKey)   // default spell = first; Dir → {kind:'dir'}
export function unitAtLabel(state, lbl: string): Unit
```
Header comment + `.claude/skills/scenario/SKILL.md` legend updated to the §3 notation (board and lattice).

### 7.2 `src/data/scenarios.ts` (Lab deep links `#/lab?scenario=<id>`)
Each `ScenarioDef` has `demo` + `expected`; one test replays them all (`runScenario`), so every Lab scenario is a guaranteed-valid regression test. Lab UI can offer "play demo".

| id | step | content |
|---|---|---|
| `sandbox` | 5 | 6×8: D at B7, S at E7, two dummies at B2/E2, oil patch C4–D4, steam at B5, plate at E5. No lattices (profile's), demo [] |
| `ink-spark-detonation` | 5 | §7.4 S1 |
| `oil-chain` | 5 | S2 |
| `brass-conduction` | 5 | S3 |
| `steam-arc` | 5 | S4 |
| `on-kill-burst` | 5 | S5 |
| `fork-order` | 5 | S6 |
| `amplify` | 5 | S7 |
| `self-combo` | 5 | S11 (Ink → On Inked → Spark) |
| `diffuse` | 5 | S12 |
| `shove-slide` | 5 | S9 |
| `echo` | 7 | S8 (needs endTurn) |
| `sentry-steam-block` | 7 | S10 |
| `ward-cloak` | 7 | S13 |

### 7.3 Spell keys in demos
Lattice `Bolt> Spark` puts the source at `"0,0"`; actions: `{type:'cast', unit:'stoker', spell:'0,0', aim:{kind:'dir', dir:'right'}}`.

### 7.4 Key chain scenarios (expected lines are exact)
Members: Draughtsman (affinity Ink → Ink footprint 3×3), Stoker (affinity Spark, Oil → Spark 2 dmg, Oil 3×3). Dummy HP 12, rat HP 2, sentry HP 5, familiar HP 1.

**S1 ink-spark-detonation** — board
```
D . . d . .
. . . . . .
. . . S . .
```
lattices D `Bolt> Ink`, S `Bolt^ Spark`. Cast D right:
`Draughtsman casts Bolt right` · `Bolt hits dummy at D1 for 2` · `dummy at D1 is inked` · `ink pools at C1, E1, C2, D2, E2`
Cast S up: `Stoker casts Bolt up` · `Bolt hits dummy at D1 for 3 (inked +1)` · `Spark hits dummy at D1 for 3 (inked +1)` · `the ink on dummy at D1 detonates` · `Detonation hits dummy at D1 for 2`. Assert dummy hp 2, not inked.

**S2 oil-chain** — board
```
. . . . . d
S . ro o ro o
```
S `Bolt> Spark`, cast right: `Stoker casts Bolt right` · `Bolt hits rat at C2 for 2` · `rat at C2 dies` · `oil at C2 ignites, fire spreads to D2, E2, F2` · `Fire hits rat at E2 for 2 (oil-soaked +1)` · `rat at E2 dies`. Fire = 2 on C2–F2.

**S3 brass-conduction** — board
```
S . = = b
. . . . r&
```
S `Bolt> Spark`, right: `Stoker casts Bolt right` · `Bolt is stopped by the brass plate at C1` · `Spark conducts through the brass from C1 (4 tiles)` · `Spark hits sentry at E1 for 2` · `Spark hits rat at E2 for 2` · `rat at E2 dies`.

**S4 steam-arc** — board
```
D . ~ ~ ~
. . r~ . f~
```
D `Bolt> Spark`, right: `Draughtsman casts Bolt right` · `Bolt is stopped by the steam at C1` · `Spark arcs through the steam from C1 (5 tiles)` · `Spark hits rat at C2 for 1` · `Spark hits familiar at E2 for 1` · `familiar at E2 dies`.

**S5 on-kill-burst** — board
```
. . . r .
D . . r r
. . . . .
```
D `Bolt> OnKill Spark`, right: `Draughtsman casts Bolt right` · `Bolt hits rat at D2 for 2` · `rat at D2 dies` · `On Kill: bursts from D2` · `Spark hits rat at D1 for 1` · `Spark hits rat at E2 for 1`.

**S6 fork-order** — board `D . d .`, D lattice
```
.     Oil   .
Bolt> Fork  .
.     Spark .
```
`Draughtsman casts Bolt right` · `Bolt hits dummy at C1 for 2` · `oil coats C1` · `Spark hits dummy at C1 for 1` · `oil at C1 ignites` · `Fire hits dummy at C1 for 1`.
Mirror (Spark on top, Oil below): `… Bolt hits dummy at C1 for 2` · `Spark hits dummy at C1 for 1` · `oil coats C1` (no fire).

**S7 amplify** — board `D . d`, D lattice
```
Amp   .
Bolt> Spark
.     Amp
```
`Draughtsman casts Bolt right` · `Bolt hits dummy at C1 for 3` · `Spark hits dummy at C1 for 2`.

**S8 echo** — board `D . d`, D lattice `Echo .` / `Bolt> Spark` (source key "0,1"). Cast: `Draughtsman casts Bolt right` · `Bolt hits dummy at C1 for 2` · `Spark hits dummy at C1 for 1` · `Echo: Draughtsman's spell will repeat next turn`. endTurn (whole log): `Enemies act` · `Round 2` · `Enemies move` · `dummy at C1 waits` · `Your turn` · `Echo: Draughtsman's Bolt repeats right at half strength` · `Bolt hits dummy at C1 for 1` · `Spark hits dummy at C1 for 1`. Charges 3→2; dummy hp 7.

**S9 shove-slide** — board `S r o o . .`, shove right: `Stoker shoves rat at B1 right` · `rat at B1 is pushed to C1` · `rat at C1 slides across the oil to E1`.

**S10 sentry-steam-block** — board `b . ~ . D`, intents {A1: right}. endTurn includes, from the start: `Enemies act` · `sentry at A1 fires right` · `Line is stopped by the steam at C1`. Control (no `~`): `Enemies act` · `sentry at A1 fires right` · `Line hits Draughtsman for 2`.

**S11 self-combo** — board `S . d`, S `Bolt> Ink OnInked Spark`: `Stoker casts Bolt right` · `Bolt hits dummy at C1 for 2` · `dummy at C1 is inked` · `On Inked: a target is inked` · `Spark hits dummy at C1 for 3 (inked +1)` · `the ink on dummy at C1 detonates` · `Detonation hits dummy at C1 for 2`.

**S12 diffuse** — board `S . ~ r~ .`, S `Bolt> Ink`: `Stoker casts Bolt right` · `Bolt is stopped by the steam at C1` · `ink diffuses through the steam at C1` · `rat at D1 is inked`.

**S13 ward-cloak** — board `b . S D`, intents {A1: right}, D `Ward> Steam`. Cast D ward on Stoker: `Draughtsman casts Ward on Stoker` · `Stoker gains a shield of 2` · `steam rises at C1`. endTurn starts: `Enemies act` · `sentry at A1 fires right` · `Line is stopped by the steam at C1`.

---

## 8. Ordered implementation steps

Dependency graph: **1 → 2 → {3 ∥ 4} → {5 (needs 3+4) ∥ 6 (needs 4)} → 7 (needs 5+6)**.
Parallel pairs touch disjoint files (listed). Parallel agents should work in separate worktrees and rebase; the only expected overlap is none (index.ts is pre-wired in step 1; stubs for cast/ai/turn are created in step 4).

### Step 1 — Types, events, data (sequential, first)
Files: `src/data/{types,tuning,runes,members,enemies,encounters,loot,codex,index}.ts`; `src/engine/types.ts`, `events.ts` (full union + describe + who + discoveriesIn), `grid.ts` (+ key, parseKey, byReadingOrder, neighbors4, square, chebyshev), `rng.ts` (+ deriveSeed (e.g. mulberry32 of `seed ^ Math.imul(salt, 0x9e3779b1)`), pickWeighted); placeholders `notation.ts lattice.ts queries.ts battle.ts scenario.ts run.ts` = `export {};`; `index.ts` re-exports grid, rng, types, events, notation, lattice, queries, battle, scenario, run. Rewrite `tests/scenarios/smoke.test.ts` to the new union (one `damage` + one `died` event). TECH.md §7 row: "Engine layout: Ctx draft mutation inside one structuredClone per action; data imports engine types only".
Tests:
- `tests/engine/events.test.ts`: `describe covers every variant` (a fixture array with one event per `type`, assert each exact line from §2.4 table, incl. damage with/without bonus, plates 1 vs many, ignite with/without spread, died member vs enemy, inked mark vs puddle, cast echo vs not); `discoveriesIn maps and dedups`.
- `tests/engine/grid.test.ts`: + `key/parseKey round-trip`, `byReadingOrder sorts rows then columns`, `square clips nothing itself` (radius 1 → 9 coords), `chebyshev`.
- `tests/engine/rng.test.ts`: + `deriveSeed is stable and salt-sensitive`, `pickWeighted respects zero weights`.
- `tests/data/integrity.test.ts`: `14 runes, unique tokens`, `arrow iff source or bend`, `sources have charges (bolt 3, splash 2, ward 2)`, `every family has an ink cost`, `loot tables reference real runes, ≥3 entries, positive weights`, `codex has an entry per rune and per interaction`, `encounters: 4, depth 1..4, only last is heart with picks 2`, `dummy never in encounter layouts` (string check `d` token absent).
Commit: `feat(engine): v0 types, event log and game data`.

### Step 2 — Notation + harness (after 1)
Files: `src/engine/notation.ts`, `tests/scenarios/harness.ts` (expectLog, expectLogIncludes, re-exports), `.claude/skills/scenario/SKILL.md` legend, `tests/engine/notation.test.ts`, extend `tests/data/integrity.test.ts`.
Tests:
- `parses units, mods and layers` (`r!o` → inked rat on oil; `*` → fire 2 + oil; `@~` vent+steam; `=` plate; `r&` brass).
- `rejects unknown chars / unit on plate / mod without unit / duplicate member` (message contains cell label).
- `pads short rows with floor`; `serializeBoard round-trips` (parse → serialize → parse equal).
- `parses lattice tokens and arrows` (`Bolt>` dir right, `Bendv` down, `x` hole); `rejects arrow on Ink / missing arrow on Bolt`; `serializeLattice round-trips`.
- integrity: `encounter layouts parse to 6×8 with D and S`, `encounter enemy counts` (1: 3 rats; 2: 2 rats + familiar; 3: sentry + 2 rats + oil; 4: 2 sentries, familiar, 2 rats, ≥1 vent, ≥1 plate), `member start lattices match their shape (dims + holes)`.
Commit: `feat(engine): ASCII board and lattice notation`.

### Step 3 — Lattice compiler (after 2; parallel with 4)
Files: `src/engine/lattice.ts`, `tests/engine/lattice.test.ts`. (No other files.)
Tests (lattices written in ASCII):
- `straight flow`: `Bolt> Ink Spark` → nodes Ink → Spark.
- `bend uses absolute arrow`: `Bolt> Bendv` / `. Spark` → [Spark]; `bend pointing back stops`: `Bolt> Bend<` → [], bend in path.
- `fork is relative to travel`: `Boltv .` / `Fork Ink` → [Ink] (entering down: left = right/east).
- `fork resolves left before right` (fork-order lattice) → nodes [Oil, Spark] in that order.
- `visited per cast stops loops`: `Bolt> Ink Bendv` / `. Bend^ Bend<` → [Ink], path length 5.
- `left branch claims shared cells first` (fork whose both branches can reach one cell: the cell appears only under the left branch).
- `sources share runes`: `Bolt> Ink Bolt<` → two spells, each [Ink]; flow into another Source stops.
- `auras insulate`: `Bolt> Amp Spark` → nodes []; bolt magnitude 3.
- `amplify stacks`: Spark with 2 adjacent Amp → magnitude 3 (Draughtsman); source amp.
- `affinity adds magnitude`: start lattices → Draughtsman Ink magnitude 2, Stoker Spark magnitude 2.
- `echo only on source`: Echo next to Spark → echo false; next to Bolt → true.
- `triggers gate the rest`: `Bolt> OnInked Spark` → trigger node with next [Spark].
- `describeSpell`: start Draughtsman `Bolt (2 damage) → Ink 3×3`; start Stoker `Bolt (2 damage) → Spark (2 damage)`; DESIGN §6.2 example (plain 5×3 lattice: row0 `Amp . . . .`, row1 `Bolt> Ink Fork . .`, row2 `. . Bend> OnInked Spark`, Draughtsman) → `Bolt (3 damage) → Ink 3×3 → if inked: Spark (1 damage)`; fork-order → `Bolt (2 damage) → [Oil | Spark (1 damage)]`; Ink + one Amp (Draughtsman) → `Ink 5×5`; echo suffix.
- `ink cost`: DESIGN example costs 11; `validateLattice` with capacity 8 → one 'ink' issue; capacity null → none; `rune in hole → 'socket'`; `Bolt without dir → 'arrow'`.
- `setSocket / rotateSocket` pure (input unchanged; rotate cycles right→down→left→up).
Commit: `feat(engine): lattice compiler and spell descriptions`.

### Step 4 — Battle core: state, damage, materials, movement (after 2; parallel with 3)
Files: `src/engine/{queries,ctx,damage,materials,movement,battle}.ts`; stubs `cast.ts` (`castAction` throws `Error('cast: not implemented')`, `runEchoes` no-op), `ai.ts` (`enemyPhase` emits `idle` for each enemy), `turn.ts` (`endTurnAction` throws). `applyAction` dispatches all five action types already. `createBattle` with `spec.intents` support (sets intents directly), `boardOf`, `labSetCell`. Harness: `board()`, `act()`, `unitAtLabel()`. Tests: `tests/engine/{queries,damage,materials,movement,battle}.test.ts`, `tests/scenarios/materials.test.ts`. Internal functions are exercised via `runDraft(state, ctx => applySpark(ctx, …))` from `$engine/ctx`.
Tests:
- battle: `createBattle spawns units in reading order with ids rat-1, rat-2`; `hp overrides by label`; `explicit intents emit telegraph lines` (`sentry at A1 will fire right`); `applyAction never mutates its input` (deep-equal snapshot before/after); `illegal action throws with reason`; `boardOf round-trips the board`.
- queries: `travel stops at steam before unit` (unit in steam → reason steam), `travel stops at unit, plate, end; none when first tile off-board`; `reachable ≤3, not through units or plates, BFS path in DIRS order`; `steamCloud / brassNet floods orthogonally`.
- damage: `inked takes +1 and line shows (inked +1)`; `shield absorbs first` (`Stoker's shield absorbs 2 (0 left)`); `death: enemy dies line, unit off the board`; `member is down`.
- materials: `ink marks unit, pools on empty tiles, skips plates`; `ink into steam diffuses through the whole cloud`; `oil next to fire ignites` (board `* .` + applyOil([B1]) → `oil coats B1` · `oil at B1 ignites`); `steam puts out fire, oil stays`; `brass plates rise on empty tiles and coat units`; `spark hits, then detonates an inked survivor`; `spark on a killed inked unit does not detonate`; `fire region stops at steam` (board `. . o o ~o o` / `D . . . . d`, applySpark([C1], 1) → `oil at C1 ignites, fire spreads to D1` · `steam puts out the fire at E1`; F1 stays unlit); `fire damage +1 to oil-soaked`; `mixed network: brass sentry in steam bridges arc and conduct`; `each unit sparked once per application`; `footprint radius from magnitude`.
- movement: `member moves along BFS path`; `cannot move twice`; `stepping on a puddle inks and consumes it` (`Draughtsman steps in ink and is inked`); `undo restores position, puddle and ink` (`Draughtsman steps back to A1`); `undo cleared after acting`; shove: S9 lines; `bump into unit damages both` (`S r b`: `Stoker shoves rat at B1 right` · `rat at B1 bumps into sentry at C1` · `Bump hits rat at B1 for 1` · `Bump hits sentry at C1 for 1`); `bump into the edge` (`S r`); `slide stops before a blocker` (`S r o o b` → `rat at C1 slides across the oil to D1`); `slide ends on puddle and inks` (`S r o i`).
Commit: `feat(engine): battle state, damage, materials and movement`.

### Step 5 — Casting + scenario runner (after 3 and 4; parallel with 6)
Files: `src/engine/cast.ts` (replace stub), `src/engine/scenario.ts`, `src/data/scenarios.ts` (rows marked step 5 in §7.2), harness `withLattices()` + `cast()`, `tests/engine/cast.test.ts`, `tests/scenarios/chains.test.ts`, `tests/scenarios/lab.test.ts`. (Does not touch ai.ts/turn.ts.)
Tests:
- chains (each exact, §7.4): `ink-spark-detonation` (S1), `oil-chain` (S2), `brass-conduction` (S3), `steam-arc` (S4), `on-kill-burst` (S5), `fork-order` + mirrored (S6), `amplify` (S7), `self-combo` (S11), `diffuse` (S12), `on-inked fails without ink` (`Bolt> OnInked Spark` on dummy → `On Inked: no inked target, the chain stops`), `on-kill fails` (`On Kill: nothing died, the chain stops`), `on-kill counts chain-reaction kills` (board `D . = r&` / `. . . d`, hp {D1: 1}, D `Bolt> Spark OnKill Steam`: `Draughtsman casts Bolt right` · `Bolt is stopped by the brass plate at C1` · `Spark conducts through the brass from C1 (2 tiles)` · `Spark hits rat at D1 for 1` · `rat at D1 dies` · `On Kill: bursts from D1` · `steam rises at D1, D2`), `splash friendly fire` (board `D . . .` / `. r S .`, D `Splash>`, aim B2: `Draughtsman casts Splash at B2` · `Splash bursts at B2` · `Splash hits Draughtsman for 1` · `Splash hits rat at B2 for 1` · `Splash hits Stoker for 1`), `brass rune` (`Bolt> Brass` to the edge: `Bolt lands at F1` · `a brass plate rises at F1`; onto rat: `rat at C1 is coated in brass`), `steam on fire` (`D . *`, `Bolt> Steam`: `Bolt lands at C1` · `steam rises at C1` · `steam puts out the fire at C1`), `win mid-cast` (`D . r`: … `rat at C1 dies` · `The party wins`, phase 'won').
- cast: `spends a charge, not in lab`; `no charges → illegal`; `cannot cast twice`; `legalAims: bolt dirs exclude off-board, splash range 3 chebyshev, ward self + adjacent members`; `echo queues an entry` (state.echoes length 1 + `Echo: … will repeat next turn`); `runEchoes recasts at half strength` (via runDraft); `echo fizzles when caster is down`; `discovered accumulates interactions from the cast` (S1 → ['detonate']).
- lab: `every Lab scenario replays to its expected log` (loop over SCENARIOS); `scenario ids are unique and kebab-case`; `labSetLattice recompiles spells`.
Commit: `feat(engine): spell casting, triggers, echo and lab scenarios`.

### Step 6 — Enemies + turn loop (after 4; parallel with 5)
Files: `src/engine/ai.ts`, `src/engine/turn.ts` (replace stubs), `tests/engine/ai.test.ts`, `tests/scenarios/turns.test.ts`. (Does not touch cast.ts/battle.ts; echo tests that need casting go to step 7.)
Tests:
- ai: `round 1 telegraphs without moving` (`r . D` → `rat at A1 waits`; `r D` → `rat at A1 will bite right`); `rat chases nearest member and trails oil` (board `r . . . .` / `. . . . .` / `. . . . D`, endTurn includes `rat at A1 moves to D1` · `oil coats A1, B1, C1, D1` · `rat at D1 waits`); `rat bites when it reaches` (`r . D`: `rat at A1 moves to B1` · `oil coats A1, B1` · `rat at B1 will bite right`); `sentry lines up` (`b . D` → `sentry at A1 will fire right`, no move); `sentry falls back toward nearest member` (3×3 board, D at C3 → moves to B1, will fire down); `familiar keeps range 2` (`f . D` → `familiar at A1 will spit right`); `tie-breaks are reading order` (two equal destinations → the upper-left one); `intent order follows unit order`.
- turns: `bite resolves` (`r D`: `Enemies act` · `rat at A1 bites right` · `Bite hits Draughtsman for 1`); `spit damages and inks` (`familiar at A1 spits right` · `Spit hits Draughtsman for 1` · `Draughtsman is inked`); `spit that lands on empty floor leaves a puddle`; `sentry-steam-block` + control (S10); `shove moves the intent` (board `. . . . .` / `b . . . D` / `S . . . .`, intents {A2: right}; shove up → endTurn: `sentry at A1 fires right` · `Line lands at E1`); `attacks hit whoever stands there` (rat shoved so its bite hits another rat); `fire burns for 2 rounds` (`D . d*`: endTurn 1 includes `Fire hits dummy at C1 for 1`; endTurn 2 includes `Fire hits dummy at C1 for 1` · `the fire at C1 burns out`; tile oil false); `steam lasts 2 rounds` (`the steam at … fades` on 2nd endTurn); `vent refills steam`; `members reset each round`; `party wipe` (D at hp 1 facing a line: `Line hits Draughtsman for 2` · `Draughtsman is down` · `The party is wiped out`, later intents not resolved); `determinism: same board + same actions → identical logs`.
Commit: `feat(engine): enemy AI, intents and turn loop`.

### Step 7 — Run layer, save, replay, integration (after 5 and 6)
Files: `src/engine/run.ts`, `src/data/scenarios.ts` (add echo, sentry-steam-block, ward-cloak), `tests/run/{profile,trip,save}.test.ts`, `tests/scenarios/integration.test.ts`. DESIGN.md: §9.5 "engine interpretations" paragraph + §11 row summarizing §10 Decisions taken (if not already added by earlier steps).
Tests:
- profile: `new profile has the start collection and valid lattices` (validateLoadout empty); `available counts across both lattices`; `canPlace reasons` ('Not enough ink', 'None left', 'No socket here'); `codexView: runes known by ownership, interactions ??? until discovered`.
- trip: `startTrip sets full hp and charges per spell key` ({draughtsman: {'0,1': 3}, stoker: {'1,0': 3}}); `beginEncounter is deterministic per seed`; `finishEncounter won → looting with 3 distinct offers, picks 1`; `heart gives 2 picks then cleared`; `offers deterministic per seed and differ by encounter`; `ink offer names a member and +2`; `pickLoot/pushOn/returnHome flow banks loot`; `wipe loses loot but keeps codex discoveries`; `downed member returns at 1 HP after a win`; `charges and hp carry into the next encounter`; `illegal transitions throw` (pushOn while looting, returnHome during fight).
- save: `SaveData round-trips through src/app/save serialize/parse at version 0`; `parseSaveData rejects garbage`; `missing rune keys default to 0`.
- integration: `echo` (S8 full endTurn log); `ward-cloak` (S13); `shield absorbs a bite` (`Bite hits Stoker for 1` · `Stoker's shield absorbs 1 (1 left)`); `replay equals step-by-step application` (encounter 1, scripted moves + endTurns; compare final state + concatenated log); `encounter 1 with idle party for 3 rounds is reproducible` (two runs, identical logs); `Lab scenarios added in this step replay to expected`.
Commit: `feat(engine): run layer, saves and replay`.

---

## 9. Public engine API summary (for the UI planner)

Import everything from `$engine` (types from `$engine` too); content from `$data`.

**Content**: `RUNES, RUNE_IDS, MEMBERS, MEMBER_IDS, ENEMIES, ATTACKS, ENCOUNTERS, LOOT_TABLES, CODEX, INTERACTION_IDS, SCENARIOS, TUNING`.

**Event log**: every state-changing call returns `{ state, events }`. Animate `events` in order; `describe(e)` gives the line for a log panel. Events carry coords (`at`, `to`, `path`, `tiles`) and `UnitRef` snapshots for animation. `state.discovered` lists interactions seen this battle (for "new codex entry" toasts).

**Study (profile)**: `newProfile, latticeOf, compiledFor, describeSpell, validateLoadout, available, canPlace, inkUsed, inkCost, setSocket, rotateSocket, setMemberLattice, codexView`. `CompiledLattice.spells[].path` / `reached` / `auraTouches` drive lattice highlighting.

**Trip**: `startTrip → beginEncounter → (battle) → finishEncounter → pickLoot×picks → pushOn | returnHome`. `Trip.status` tells the UI which screen applies ('fight' | 'looting' | 'crossroads' | 'cleared').

**Battle**:
- create: `beginEncounter(profile, trip)` or `scenarioBattle(SCENARIOS[i])` (Lab, `lab: true`).
- read: `state.units` (`kind`, `pos`, `hp/maxHp`, `shield`, `inked`, `brass`, enemy `intent {attack, dir, order}`, member `moved/acted/spells/charges`), `state.tiles` (`oil, ink, steam, fire, plate, vent`), `state.round`, `state.phase`.
- player options: `legalMoves(state, unit)`, `canUndoMove`, `shoveDirs`, `castableSpells`, `legalAims(state, unit, spellKey)`, `aimPreview(...)` (path + target tiles), `intentPreview(state, enemy)` (danger overlay).
- act: `applyAction(state, action)` with `Action = move | undoMove | cast | shove | endTurn`. Pure, so previews = call and discard. `isLegal` for button states. Illegal actions throw.
- replay: `replay(spec, actions)` → all intermediate states.
- Lab: `labSetCell(state, at, token)` (palette = board tokens §3.1), `labSetLattice`, `boardOf(state)` / `serializeLattice` to copy a found combo as a scenario.

**Save**: `newSave(seed)`, `nextTripSeed`, `parseSaveData(env.data)`; store via `src/app/save.ts` (`saveToStorage(saveData)`), version 0. Save only between encounters (never a battle).

---

## 10. Decisions taken (where §9.5 was ambiguous)

1. **Magnitude meaning per rune** (`RuneDef.scale`): Bolt/Splash/Spark = damage, Ward = shield, Ink/Oil/Steam/Brass = footprint (radius = magnitude − 1, Chebyshev square: 1 tile, 3×3, 5×5…). Amplify (+1 per touching Amplify) and affinity (+1, `TUNING.affinityBonus`) both add magnitude. Consequences: the Draughtsman's Ink covers 3×3, the Stoker's Oil covers 3×3 and its Spark deals 2. Flag for playtest; set `affinityBonus` to 0 to disable.
2. **Steam shields its occupants from projectiles**: Bolt, Line and Spit stop *at* a steam tile and deal no direct damage, even to a unit inside; later runes still apply to that tile (so Bolt → Spark into steam arcs, Ward → Steam is a real cloak). Bites and Splash still hit units in steam.
3. Bolt that hits nothing lands on the last tile before the edge; a direction whose first tile is off-board is not a legal aim.
4. **On Inked is a pure gate**: passes if any living unit on the current target tiles is inked at that moment; it does not filter targets.
5. **On Kill** counts every death during the cast (enemies or allies, direct or chain). It loops over the victims known when it is evaluated; each victim's burst = its tile + 4 orthogonal neighbours.
6. Flow entering another Source rune stops (sources insulate like auras). The visited set is static (computed at compile time) and shared by both Fork branches; the left branch claims cells first.
7. Amplify on shape/trigger cells does nothing; Echo counts only on the source cell; several Echoes don't stack.
8. **Spark/Fire on an inked unit**: the hit lands first (with inked +1); if the unit survives, the mark detonates for 2 and is consumed. Inked +1 applies to every damage instance except the detonation itself (incl. bumps, burns, enemy attacks).
9. **Spark spread**: each reached tile → hit the unit, ignite oil, arc through the connected steam cloud, conduct through connected brass (plates, brass sentries, coated units). Networks chain into each other; each tile is sparked at most once per Spark rune. Arc/conduct are logged only when the network reaches another tile.
10. **Fire**: spreads through connected oil but not into steam tiles (logged as extinguish); oil placed next to fire (rune or rat trail) ignites at once; fire damages units on newly lit tiles and at each end-of-round tick, never units passing through; Steam on fire puts it out and the oil stays. Oil-soaked +1 applies to fire damage only.
11. **Ink puddle** is consumed when it marks a unit; it triggers when any move ends there (walk, push, slide), only if the unit isn't already inked.
12. **Slide**: the pushed unit keeps moving while it stands on oil; it stops on the first non-oil tile or before a blocker (no bump damage while sliding).
13. **Bump**: the pushed unit takes 1; a blocking unit also takes 1; edges and plates take nothing.
14. Dead enemies and downed members stay in `units` with hp 0 but leave the board (they don't block or get targeted).
15. **Round 1**: enemies telegraph without moving, so hand-placed layouts are what the player sees.
16. **AI is fully deterministic without rng**: BFS in DIRS order, tie-break by distance, then path length, then reading order; enemies act in unit (layout) order, which is also the intent resolution order.
17. **Spit** = projectile, range 2, 1 damage, then Ink applied to the stop tile (unit inked / puddle / steam diffuses). This covers "the familiar inks tiles near it".
18. **Ward** shields stack additively; Ward targets members only. An echoed Ward needs the ally alive, not adjacent.
19. **Echo** recasts at the start of the caster's next player phase (after the enemy telegraph), every magnitude halved (floor, min 1), no charge, no action, never re-echoes; fizzles if the caster is down or the aim is invalid.
20. **Charges** are per Source rune placed (keyed by its lattice cell), not per rune type. Lab battles spend no charges.
21. A move can be undone until that member casts/shoves (a move made after acting stays undoable until end of turn). Undo also reverts a puddle the move consumed. Being pushed clears undo.
22. **Plates** replace every other layer on their tile; oil, ink and steam can't be placed on a plate.
23. **Walls are dropped** from v0 (only plates, units and edges block). Vents (`@`) refill steam every round.
24. **Loot**: an ink-reserve offer names one member (rng) and gives that member +2. The heart's 2 picks come from the same 3 offers; after the heart the trip must return.
25. **Codex**: interactions discovered in a fight are kept even on a wipe (knowledge isn't loot). Rune entries are known iff the rune is owned.
26. A **training dummy** enemy (`d`, HP 12, no attack, no move) exists for Lab and tests only.
27. Damage modifier order: base → fire's oil-soaked bonus → inked +1 → shield → HP. The log line shows the total before the shield.
28. Engine internals mutate one `structuredClone` per action through `Ctx`; public functions are pure. (Pragmatic reading of "small pure functions".)
29. Saves stay at envelope version 0 (no migrations yet); battle state is never saved.
