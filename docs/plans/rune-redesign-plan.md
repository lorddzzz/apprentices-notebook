# Rune redesign ("Mix, Move, Invent"): implementation plan

Design: [docs/design/rune-design-final.md](../design/rune-design-final.md) (the authority; where this plan and the design disagree, the design wins and the orchestrator asks). Decisions behind it: [rune-design-synthesis.md](../design/rune-design-synthesis.md) §3. Problem frame: [rune-content.md](../design/rune-content.md). Project rules: [CLAUDE.md](../../CLAUDE.md).

**Scope:** the whole design in one build, replacing the rune / material / aspect / recipe model: 31 authored runes, the board chemistry (5 kinds, 10 lingering compounds, 5 bursts, the 10-entry burst page), push / slide / crush / drop, networks, jars, the resolution pipeline (R1–R9), fine print with witnessing and the blank preview (D1–D8), the Bench as methods + parts + solvent (5 methods, 14 solvents), per-apprentice ink with leans and habits, footnotes, lifetime elegance, a fresh save.

**Player's instructions for this build:** existing saves are ignored (fresh schema, no migration); no Lab prototypes first (design §14 is skipped); every rule the design leaves open gets a default here, marked *Proposal* (§1). The player playtests after W7 and we iterate.

---

## 0. Team and models

| Role | Model | Why this model |
|---|---|---|
| **Orchestrator** (main session) | **Opus 5.5** | Writes Wave 0 contracts, merges every branch, makes design calls, writes DESIGN/TECH logs, final verification |
| **Implementer** | **Sonnet** (`model: "sonnet"`) | Planned engine logic, Svelte screens, tests with real reasoning |
| **Clerk** | **Haiku** (`model: "haiku"`) | Precise-spec work: data tables, fine-print sentence rows, codex text, scenario entries, glyph art copying the existing style |
| **Specialist** | **Opus** (`model: "opus"`) | Only W0b (the cutover, cross-cutting) and E1 (the resolution pipeline, the hardest algorithm and the critical path) |

**Escalation:** a Haiku task that fails review twice re-runs on Sonnet; a Sonnet task that fails twice goes to the orchestrator on Opus. Never escalate preemptively.

**How the orchestrator runs it** (as in [research-and-mastery-plan.md](research-and-mastery-plan.md) §0, with the `implement` skill and a status file `docs/plans/rune-redesign-status.md`):
1. W0 is the orchestrator's own work. Every later task is one subagent with `isolation: "worktree"`, working only in the files it **owns**, committing on its branch.
2. Tasks in a wave run in parallel (2–4 at a time). Merge in the listed order with `git merge --squash`, one commit per task (`feat(engine): E2 board chemistry`), `pnpm check` after each.
3. **No push until W6 is merged** (*Proposal* P40): between W0b and W5 the game is a building site; CI stays green locally but the live site keeps the last old build. The first push is the playable game.
4. Subagents never edit `DESIGN.md`, `TECH.md`, `docs/design/*`, `docs/ROADMAP.md`. They report every rule they invented under *Proposals*; the orchestrator logs them at merge.
5. Review before merge: read the diff, tick the acceptance list, look at UI screenshots (or take them with `verify` at 375×812).
6. Subagent prompt: the template in research-and-mastery-plan.md §0, with this plan's §1, §2 and the task, plus the design sections named in the task.

---

## 1. Proposals (rules this plan settles; log in DESIGN §11 and the design doc §0 when built)

**Scope and what happens to existing systems**

| # | Rule | Reason |
|---|---|---|
| P1 | Save version jumps to **7** with no migrations: any older save (or unparseable one) shows "This notebook is from an older edition" and starts a fresh profile. The migration chain, `tests/fixtures/*-save.json` and their tests are deleted | Player's instruction; no dead migration code to maintain |
| P2 | **Playable districts: the Seam and the canals.** All 31 runes, 5 methods, 14 solvents, 4 Bind events and 9 idioms exist as data, work in the engine and have tests. The five other districts appear on the map as *heard, being drawn* (barred, no encounters); their runes, methods and solvents are reachable only in the **Lab** | Design §11: each district's terrain and foes need their own design round. Building the runes now means a district later adds boards, foes and terrain lines only |
| P3 | **Edges depend on the district** (player, 2026-10-19): each district has `edge: 'wall' \| 'drop'`; the Seam and the canals use **wall** (crush, never a drop), later districts decide in their own rounds. Terrain this build: **canal water is a drop** for land units (fliers and water foes are exempt); a new tile `_` **the drop** (a bridge's open side) exists in notation and the engine so Brink, Long Drop and Mortar can be tested; *unfinished paper* is not built (Erase's paper line waits for the Cartographers) | Design §1's "crushed against the wall behind" needs walls at edges; drops come from terrain, not every edge |
| P4 | **Fine print, first build: 132 lines** (codex totals count shipped lines only): Kinds 46 (16 mixing rows, 5 bursts, 10 burst-page rows, 5 "on a compound" defaults, 10 kind×unit/terrain rows), other Seam runes 30 (Shove 6, Strike 3, Guard 3, Bolt 3, Splash 2, Touch 2, Fork 3, Bend 0, plus 8 spread over terrain: water, drop, plate, jar), the 18 school runes 2 each = 36, methods 6 (one "nothing to act on" line each + Bind's "spread copy"), solvents 14 (one each) | The long-term 220 needs district terrain that doesn't exist yet; 132 covers every state, compound, burst and unit type the built districts have |
| P5 | Aspects, recipes, resonance scoring, silhouettes, torn pages and the 8 old solvents are **deleted**. The 8 Bench runes (Smear, Torch, Fog, Mist, Brand, Scald, Etch, Kiln), Quill, Ward, Pierce, Amplify, Echo, Thrift and the three old triggers are **deleted**. Affinity, magnitude and `amp` are **deleted** (gifted leans replace them). Crystallise was never built; its roadmap entry is closed | Design §6.2, §8 and P6 of the problem frame |
| P6 | The codex's **interactions** become **named results** (D7): 10 compounds, 15 bursts (5 + the page) and 9 idioms, each named the first time it happens, plus per-rune fine-print pages | Design D7 |
| P7 | **Glyphs stay** (Fair Copy, versions, open cells, extra exit, profiler, ranking). Open cells take **Kind or Action** runes. The "first compile of an idiom is free" rule is dropped: idioms are now log patterns, not lattice shapes. Proof masks and clusters work on roles instead of families | Design §8 "Glyphs compile as now"; idiom matching on the page no longer means anything |
| P8 | **Elegance counts the whole life of a cast** (fixes BL-57): every board object (state, mark, collar, jar, scheduled repeat) carries the `Origin` of the cast that made it, every event it causes is stamped with that origin, and the profiler credits harm to the origin's Glyph version when it lands (within the same fight) | Design §8 |
| P9 | **The five folios are retired** (they repair pages written in the old runes). The folio engine, `src/data/folios/*`, the desk's folio list and the draft loot kind are deleted. The **Desk** screen becomes the footnote desk. Roadmap: "rivals' lattice pages" (design §10) is the natural successor | Porting puzzles to new runes needs a design round of its own; recoverable from git |
| P10 | The canal **threshold room** is re-authored for the new runes: "the lock-keeper's eel-rat": shove a rat off the lock into the canal (goal `{ dies: 'rat-1' }`), solvable with Bolt → Oil → Shove | The gate needs a solvable puzzle; it teaches drops before the canals |
| P11 | **Rivals are not built** (rivals.md is still *Exploring*). The engine lets any `Unit` cast a `Spell` (`resolveSpell(ctx, caster: Unit, …)`), jars have an owner of any side, and foe attacks that ink (spit) fire Kind lines that count as witnessed | Keeps the door open without authoring enemy lattices |
| P12 | The party stays **two apprentices** (party.md's third is later). Basic actions stay **move and shove**; pull, swap and hop wait. Stepping onto any jar opens it, so "hop onto your own jar" works as a move | Smallest change that keeps design §9's combos |

**Board rules**

| # | Rule | Reason |
|---|---|---|
| P13 | Plain Ink on an empty tile is called a **blot** (the design calls it a "stain", which collides with the Ink+Oil compound **Stain**). A blot does nothing on its own: it counts for Tally and mixes | Two things can't share a name in the codex |
| P14 | **Layers:** Ink and Brass land on the unit if one stands on the target (mark, collar), else on the tile; Oil and Steam always land on the tile; Spark deals 1 to the unit, then bursts the unit layer, then the tile layer | Design §4.1 split made exact |
| P15 | **Unit compounds:** Ink on a marked unit = **Deep mark**; Brass on a marked unit or Ink on a collared unit = **Shackle** (replaces both). Every other mix happens on the tile | Design §4.2 applied to the two layers |
| P16 | A non-Spark kind landing on a compound **washes it out** and leaves its own plain state, unless that compound has a row for it (one "on a compound" line per kind) | Keeps the 40-cell kind×compound grid to 5 default lines + exceptions |
| P17 | **Durations:** lingering compounds 2 rounds, then vanish (Deep mark / Shackle fall back to nothing); cloud 2 rounds; rune plate 3 rounds; slick and blot until changed; fire 2 rounds; marks and collars until spent or the fight ends; layout plates permanent; Lay makes any state permanent until broken | Current tuning where it existed; numbers in `TUNING` |
| P18 | **Burst page, the four undrafted rows:** Deep mark → detonation 3 that leaves a plain mark; Stain → **Inkfire** (fire that marks whoever it hits); Grease fog → **Flashover** (storm 2, then each fog tile burns 1 round); Bank → **Thunderhead** (storm 2 now and again at round end) | Design §4.3 lists 6 of 10 |
| P19 | Spark on a marked unit = 1 (Spark) + 3 (Detonation). Crush = 1 + 1 per tile moved to the pushed unit, 1 to what it hit; a plate hit by a crush loses one hit (a Wall needs two). Drop: a minion is gone (`died`, no death-burst); an elite takes 4 and is **stunned** (skips its next action). Members count as elites | Design §4.4 numbers kept; members must never vanish |
| P20 | **Elites:** sentry, eel, snuffer, mother. Minions: rat, familiar, moth, dummy | A flag in `EnemyDef` |

**Resolution rules**

| # | Rule | Reason |
|---|---|---|
| P21 | **Bolt** with no unit in its line targets the last open tile in range (a tile target). Range 4; Splash range 3; Vat range 1 | Design R2 needs a fallback |
| P22 | **Heading:** Bolt = the aim direction; Touch on an adjacent tile = toward it; Touch on yourself = the caster's last move direction this turn, else **none** (heading actions then do nothing: a fine-print line); area tiles = from the centre outward along the larger axis; the centre and the diagonals take the caster→centre heading | Design R4 made total |
| P23 | **Area targets freeze at aim time:** each tile becomes its unit's target if a unit stands there, else a tile target; then each rune runs over all targets in reading order (R9), and unit targets follow their units (R7). A unit is acted on once per rune even if pushed onto another area tile | R7 + R9 without double hits |
| P24 | **Fork in an area:** each target gets its own left and right tiles; duplicates are dropped (first in reading order wins) | R5 per target |
| P25 | **The snapshot** (R8) is taken once per cast, before the source acts; a jar's or repeat's contents take a new snapshot when they run | A jar opening later is a new moment |
| P26 | **Unison:** passes if another apprentice's cast this player phase had the target among any of its step targets. Foe actions don't count | Design §5.2 made checkable |
| P27 | **Guard:** 2 shield until the start of the caster's next player phase; a fully shielded hit still counts as a hit (Bind) | Design headline |
| P28 | **Hold:** a pushed held unit doesn't move and takes no crush; slides stop on it as on a wall | "Not even by a push" |

**Marks, jars and inventions**

| # | Rule | Reason |
|---|---|---|
| P29 | A mark **spreads** when it lands on a unit standing in a cloud, or when its bearer enters a cloud tile: it copies to every unit in the connected cloud, allies included, once per unit per lineage (limit 3) | Design D5 made timed |
| P30 | **Release heading:** the heading of the effect that set it off (a cast's heading, a push's direction; for bursts, storms and conducts: from the effect's origin tile to the bearer); else the binding cast's heading | Recoil must know which way to shove |
| P31 | Only a mark's **bound event** releases it. Detonation, Sentence, Levy, expiry, replacement and Erase spend it without releasing (extends limit 6) | One rule, no double cash-ins |
| P32 | A **jar** opens on its tile; if a unit stands there, the unit is the target. It keeps the sealing cast's heading. Jars don't block, can't be pushed, and a jar sealed onto a jar replaces it | Design §7 made exact |
| P33 | **Ink costs:** Source 2, Action 2, Kind 1, Shape 1, Trigger 1, Seal 2, Aura 3; Bend 1. Trained: −1 on the school's runes, minimum 1. Inventions = Σ parts + method (Bind +2, Conduct +2, Repeat +2, Margin +1, Lift +1); a solvent adds no ink. Start allowance 8 each (as now) | Design §8 *(default)*; current costs where they existed |
| P34 | **Knowledge, not copies:** `Profile.known` replaces collection counts. A rune page in loot teaches an unknown rune of that district; a duplicate drops as 1 ink | Design §8 |
| P35 | **The first evening:** known at start: Bolt, Strike, Shove, Guard, Ink, Oil, Spark. Seam loot teaches Splash, Touch, Steam, Brass, Fork, Bend; the **Conduct** page drops in the Seam's deep and heart tables (guaranteed on the first heart clear). Start pages: Draughtsman `Bolt> Ink Strike`, Stoker `Bolt> Oil Spark` | Design §11 "the first evening" |
| P36 | **Leans:** Stoker trained **Seam**, gifted **Seam**; Draughtsman trained **Timing**, gifted **Contracts** (idle until the ink quarter ships). Each rune's gift is one data field: `push` (+1 tile pushed), `tile` (+1 range or area), `round` (+1 round lasting). **Habits:** Stoker "his Forks act on the tile ahead too"; Draughtsman "keeps two jars". The third habit waits for a third apprentice | Design §9 with two members |
| P37 | **Bench test scene:** a 6×5 board with the caster; place up to 3 subjects (foe types you've met) and paint states and terrain you've met (`Profile.met`). Trials are free and unlimited; lines witnessed there count (D4). Writing a plain invention is free; a flavoured one spends 1 solvent | Design §6.1 |
| P38 | **Solvent rules** are implemented as one hook each on any invention (table in E8). Seam and canal solvents drop in play; the other ten only in the Lab | Design §6.3 drafts made concrete |
| P39 | **Footnotes, this build:** a known rune earns 1 point per witnessed firing of its lines (trip battles only); levels at 5 / 15 / 40. A level offers two variants of one witnessed line; you write one at the desk with 1 solvent of that line's district; re-picking is free. Content shipped: level I for **Shove, Spark, Oil, Bolt** (8 variant rows). Glyphs snapshot nothing: footnotes apply to the rune wherever it sits | Design §8; the mechanism is cheap, the content grows per district |
| P40 | No push until W6 (see §0) | The live site never shows a half-built rune system |

**Preview (D2, D3)**

| # | Rule | Reason |
|---|---|---|
| P41 | The preview runs the real engine on a copy (as now). Events stamped with an **unwitnessed** line are masked: the landing tile gets a dotted outline with **no** text, number or `?`; the caption shows only the witnessed part ("Bolt hits rat at C1, then …"). Unit HP previews ignore masked damage | D2 |
| P42 | **Harm warning:** any damage, crush or drop to a party member, masked or not, shows that apprentice with a red hurt ring and "hurt" in the caption; the amount and cause show only if witnessed. End-turn and cast confirm add "Your party will be hurt" | D3 |

---

## 2. Contracts (written in Wave 0)

W0 writes these in **new files** that nothing imports yet, so the old code still compiles. W0b switches the codebase onto them and deletes the old model.

### 2.1 Data (`src/data/runeModel.ts`, merged into `data/types.ts` by W0b)
```ts
export type Role = 'source' | 'action' | 'kind' | 'shape' | 'trigger' | 'seal' | 'aura';
export type SchoolId = 'seam' | 'timing' | 'contracts' | 'areas' | 'structure' | 'resonance' | 'board';
export type DistrictId = 'seam' | 'canals' | 'inkQuarter' | 'bathhouses' | 'bridges' | 'foundry' | 'cartographers';
export type KindId = 'ink' | 'oil' | 'steam' | 'brass' | 'spark';
export type SourceRuneId = 'bolt' | 'splash' | 'touch' | 'vat';
export type ActionRuneId = 'strike' | 'shove' | 'guard' | 'sentence' | 'levy' | 'hold' | 'swap' | 'draw' | 'erase';
export type ShapeRuneId = 'fork' | 'bend' | 'seep' | 'lay' | 'toll';
export type TriggerRuneId = 'tally' | 'brink' | 'unison';
export type SealRuneId = 'jar' | 'fuse';
export type AuraRuneId = 'afterglow' | 'steep' | 'coil';
export type RuneId = SourceRuneId | ActionRuneId | KindId | ShapeRuneId | TriggerRuneId | SealRuneId | AuraRuneId; // 31
export type InventionId = `inv:${string}`;
export type RuneRef = RuneId | InventionId;
export type Gift = 'push' | 'tile' | 'round' | null;
export interface RuneDef { id: RuneId; name: string; token: string; role: Role; school: SchoolId; headline: string;
  arrow: boolean; charges: number; gift: Gift; district: DistrictId }

export type StateId = 'blot' | 'slick' | 'cloud' | 'plate' | 'fire';
export type CompoundId = 'deepMark' | 'stain' | 'brandCloud' | 'shackle' | 'pool' | 'greaseFog' | 'skidPlate' | 'bank' | 'kettle' | 'wall';
export type BurstId = 'detonation' | 'fire' | 'storm' | 'conduct' | 'surge' | `page:${CompoundId}`;
export interface MixRow { kind: KindId; on: StateId | 'mark' | 'collar'; makes: CompoundId }          // 16 rows, data/chemistry.ts
export interface BurstRow { on: StateId | CompoundId | 'mark'; burst: BurstId; damage: number }   // 15 rows

export type MethodId = 'conduct' | 'repeat' | 'margin' | 'bind' | 'lift';
export type BindEvent = 'hit' | 'enters' | 'pushed' | 'dies';
export type PartSlot = { accepts: 'instantAction' | 'movingAction' | 'carrier' | 'repeat' };
export interface MethodDef { id: MethodId; name: string; district: DistrictId; ink: number; makes: Role;
  slots: readonly PartSlot[]; events?: readonly BindEvent[]; headline: string /* template: "{0} travels the connected brass…" */ }
export type SolventId = 'gallnut' | 'cinder' | 'pitch' | 'wick' | 'wax' | 'sand' | 'bathSalt' | 'fogJar'
  | 'mortar' | 'chalk' | 'rivet' | 'filings' | 'quicksilver' | 'graphite';
export interface SolventDef { id: SolventId; name: string; district: DistrictId; rule: string }
export interface InventionDef { id: InventionId; name: string; method: MethodId; parts: readonly RuneRef[];
  event?: BindEvent; solvent: SolventId | null }

/** What a rune meets; a line is (rune, meets) → sentence (D8). */
export type Meets = StateId | CompoundId | 'empty' | 'mark' | 'collar' | 'minion' | 'elite' | 'member' | 'shielded'
  | 'held' | 'jar' | 'edge' | 'water' | 'drop' | 'unit' | 'noHeading' | 'noTarget' | 'network';
export type LineSubject = RuneId | MethodId | SolventId;
export type LineId = `${LineSubject}:${Meets}`;
export interface LineDef { id: LineId; subject: LineSubject; meets: Meets; text: string; district: DistrictId }
export interface VariantDef { id: string; line: LineId; level: 1 | 2 | 3; text: string }   // footnotes
export interface IdiomDef { id: string; name: string; district: DistrictId; ownerNote: string } // matched in engine/idioms.ts
EnemyDef += { elite: boolean }   MemberDef: affinity → { trained: SchoolId; gifted: SchoolId | null; habit: HabitId | null }
export type HabitId = 'forkAhead' | 'twoJars' | 'bindOnTile';
```
Files W0 creates with placeholder or real content: `data/runes.ts` (all 31 defs with **real** roles, schools, tokens, headlines from design §5; contract data), `data/chemistry.ts` (typed, rows filled by E2), `data/methods.ts` (5 defs, real), `data/solvents.ts` (14 defs, rule text from §6.3), `data/lines.ts` (`LINES: LineDef[]`, empty), `data/idioms.ts` (9 defs, real names), `data/footnotes.ts` (empty).

### 2.2 Engine board model (`src/engine/model.ts`, becomes the battle half of `types.ts` at W0b)
```ts
export interface Origin { caster: UnitId; spell: SpellKey; cast: number; glyph?: GlyphId }  // cast = BattleState.castSeq at cast start
export interface Layer { id: StateId | CompoundId; rounds: number /* 0 = permanent */; origin: Origin | null; hits?: number; set?: true }
export interface Terrain { water: Dir | null; drop: boolean; plate: boolean /* layout */; vent: boolean; grate: boolean; gate: boolean; lamp: boolean }
export interface Tile { terrain: Terrain; state: Layer | null; jar: Jar | null; hot: number /* Cinder */ }
export interface Bound { action: RuneRef; event: BindEvent; solvent: SolventId | null; heading: Dir | null }
export interface Mark { deep: boolean; lineage: number; bound: Bound | null; origin: Origin | null; wax?: true }
UnitBase = { id, name, pos, hp, maxHp, shield, guardUntil: number | null, mark: Mark | null, collar: Origin | null | false,
  shackle: number /* rounds, 0 = none */, held: number, stunned: boolean, elite: boolean, lastMove: Dir | null }
export interface Jar { owner: UnitId; event: 'step' | 'dusk'; rest: Step; heading: Dir | null; origin: Origin }
export interface Scheduled { when: 'ownerTurn' | 'roundEnd' | 'nextRoundEnd'; owner: UnitId; step: Step | RuneRef;
  target: Target; heading: Dir | null; origin: Origin; kind: 'repeat' | 'wick' | 'graphite' | 'filings' | 'thunderhead' }
BattleState += { castSeq: number; lineages: Record<number, { reached: UnitId[] }>; scheduled: Scheduled[];
  landed: { caster: UnitId; targets: string[] }[] /* this player phase, for Unison */; met: Meets[] /* for Profile.met */ }
```

### 2.3 Spells and steps (`src/engine/model.ts`)
```ts
interface StepBase { at: Coord; inner?: Coord; via?: readonly Coord[]; viaInner?: readonly Coord[] }   // Glyph fields kept
export type Step =
  | StepBase & { role: 'action' | 'kind'; rune: RuneRef; auras: readonly AuraRef[]; next: Step | null }
  | StepBase & { role: 'trigger'; rune: TriggerRuneId; next: Step | null }
  | StepBase & { role: 'shape'; rune: 'seep' | 'lay' | 'toll'; next: Step | null }
  | StepBase & { role: 'fork'; left: Step | null; right: Step | null }         // Bend leaves no step (R6)
  | StepBase & { role: 'seal'; rune: SealRuneId; rest: Step | null };          // J1: the rest goes in the jar
export type AuraRef = AuraRuneId | InventionId;                                // Margin inventions are auras
export interface Spell { key: SpellKey; at: Coord; source: SourceRuneId; first: Step | null; charges: number;
  path: readonly PathCell[]; glyph?: GlyphId; cells?: readonly FiredCell[]; ink: number }
compileLattice(l: Lattice, glyphs: GlyphLibrary, inventions: InventionLibrary, lean: Lean): CompiledLattice   // engine/lattice.ts
inkOf(ref: RuneRef, inventions: InventionLibrary, lean: Lean): number
```

### 2.4 Resolution (`src/engine/resolve.ts`, `targets.ts`, `runes/*.ts`)
```ts
export type Target = { kind: 'unit'; unit: UnitId } | { kind: 'tile'; at: Coord };
export interface Snapshot { tiles: readonly Tile[]; units: readonly Unit[]; landed: BattleState['landed'] } // R8, deep-frozen copy
export interface Flow { caster: Unit; origin: Origin; snapshot: Snapshot; heading: (t: Target) => Dir | null;
  lay: boolean; gifted: boolean; solvent: SolventId | null; habit: HabitId | null; depth: number /* nesting guard */ }
resolveSpell(ctx: Ctx, caster: Unit, spell: Spell, aim: Aim): void        // emits cast, aims, runs steps, emits trace
aimTargets(s: BattleState, caster: Unit, source: SourceRuneId, aim: Aim, gifted: boolean): { targets: Target[]; headings: Map<string, Dir | null> }
runStep(ctx: Ctx, step: Step | null, targets: readonly Target[], flow: Flow): void
export type Handler = (ctx: Ctx, t: Target, flow: Flow, step: Step) => void;
export const HANDLERS: Record<ActionRuneId | KindId, Handler>;             // runes/index.ts assembles runes/actions.ts + runes/kinds.ts
whereIs(s, t: Target): Coord | null                                       // unit target follows the unit (R7)
Aim = { kind: 'dir'; dir } | { kind: 'tile'; at } | { kind: 'self' }      // Touch adjacent unit or tile = 'tile'
```
**Boundary rule:** `resolve.ts` owns ordering (targets, headings, shapes, triggers, seals); `runes/*.ts` own what one rune does to one target; `mix.ts`, `push.ts`, `marks.ts`, `jars.ts`, `inventions.ts` own their mechanics and are called from handlers.

### 2.5 Mechanics APIs (stubs in W0 throw `not implemented (Ex)`)
```ts
// mix.ts / bursts.ts / networks.ts (E2)
landKind(ctx, kind: KindId, t: Target, flow: Flow): void
burstAt(ctx, at: Coord, layer: 'unit' | 'tile', flow: Flow | null): void
decayStates(ctx): void                                    // round end; Afterglow/Steep read Layer flags set at landing
brassNet(s, at): Coord[]; cloudNet(s, at): Coord[]; oilNet(s, at): Coord[]; sameStateNet(s, at): Coord[]   // Toll
// push.ts (E3)
export interface PushResult { moved: number; end: Coord; crushed: UnitId | 'wall' | 'plate' | null; dropped: boolean }
push(ctx, unit: Unit, dir: Dir, tiles: number, origin: Origin | null): PushResult   // slide on oil, crush, drop, Hold
// hooks.ts (W0 writes it for real: static fan-out, no registration)
export type Hook = { kind: 'hit'; unit: UnitId; heading: Dir | null; from: Coord | null } | { kind: 'entered'; unit: UnitId; at: Coord }
  | { kind: 'pushed'; unit: UnitId; dir: Dir } | { kind: 'died'; unit: UnitId };
notify(ctx, h: Hook): void        // → marks.onHook, jars.onHook, solvents.onHook
// marks.ts (E5)
applyMark(ctx, unit: Unit, mark: Omit<Mark, 'lineage'> & { lineage?: number }): void; spendMark(ctx, unit): Mark | null
spreadFrom(ctx, unit: Unit): void; liftMark(ctx, from: Unit, to: Unit): void; onHook(ctx, h: Hook): void
// jars.ts + schedule.ts (E6)
sealJar(ctx, at: Coord, jar: Jar): void; onHook(ctx, h: Hook): void; openJar(ctx, at: Coord): void
schedule(ctx, s: Scheduled): void; runScheduled(ctx, when: Scheduled['when'], owner?: UnitId): void
// inventions.ts (E7), solvents.ts (E8)
inventionIssue(def: InventionDef, known: KnownSet): string | null      // "a Shape has nothing to store"
inventionRole(def, lib): Role; headlineOf(def, lib): string; inventionInk(def, lib): number
runInvention(ctx, id: InventionId, t: Target, flow: Flow): void
export interface SolventRule { widen?(s, t: Target, flow): Target[]; onReach?(ctx, t, flow): void; pushBonus?: number;
  delay?: 'round'; reverse?: boolean; noSpread?: boolean; after?(ctx, t, flow): void; onHook?(ctx, h: Hook): void }
SOLVENT_RULES: Record<SolventId, SolventRule>
```

### 2.6 Lines, witnessing, preview (`src/engine/lines.ts`, `preview.ts`)
```ts
EventMeta = { line?: LineId; origin?: Origin }      // GameEvent = (variants) & EventMeta; emit() stamps both from ctx
withLine<T>(ctx, id: LineId, fn: () => T): T        // every non-headline behaviour runs inside one
witnessedIn(log: EventLog): LineId[]
maskPreview(log: EventLog, witnessed: ReadonlySet<LineId>, party: UnitId[]): { shown: GameEvent[]; blanks: Coord[]; hurt: UnitId[] }
```
Integrity test (`tests/data/lines.test.ts`, written by L1): every `LINES` row is fired by at least one scenario test (a test registry in `tests/scenarios/lines-registry.ts` records fired line ids), and every line id the engine fires in the whole test suite has a row.

### 2.7 New `GameEvent` variants (in `events.ts`; W0b removes the dead ones)
Kept: battleStart, round, phase, won, lost, moved, moveUndone, cast, lands, stopped, damage, shieldAbsorbs, shieldGained, died, telegraph, idle, attack, miss, drift, gateBurns, snuff, burst (foe), summon, flare, trace. Renamed: `shove` (basic action) stays; `pushed`/`slide`/`bump` → the push family below.
```ts
| { type: 'aimed'; source: SourceRuneId; targets: Target[]; heading: Dir | null }
| { type: 'landed'; kind: KindId; at: Coord; unit?: UnitRef; makes: StateId | CompoundId | 'mark' | 'collar' }
| { type: 'mixed'; at: Coord; unit?: UnitRef; compound: CompoundId }
| { type: 'washed'; at: Coord; was: CompoundId; now: StateId }
| { type: 'burst'; burst: BurstId; at: Coord; tiles: Coord[]; units: UnitRef[] }
| { type: 'stateFades'; tiles: Coord[] } | { type: 'spreadState'; from: Coord; to: Coord[] }   // Steep
| { type: 'push'; unit: UnitRef; dir: Dir; path: Coord[]; slid: number }
| { type: 'crush'; unit: UnitRef; into: UnitRef | 'wall' | 'plate'; damage: number }
| { type: 'dropped'; unit: UnitRef; at: Coord; elite: boolean }
| { type: 'stunned'; unit: UnitRef } | { type: 'held'; unit: UnitRef } | { type: 'swapped'; a: UnitRef; b: UnitRef }
| { type: 'drawn'; from: Coord; to: Coord; what: string } | { type: 'erased'; at: Coord; what: string }
| { type: 'marked'; unit: UnitRef; deep: boolean; bound: RuneRef | null } | { type: 'collared'; unit: UnitRef }
| { type: 'markSpread'; from: UnitRef; to: UnitRef[] } | { type: 'markSpent'; unit: UnitRef; released: boolean }
| { type: 'markLifted'; from: UnitRef; to: UnitRef } | { type: 'released'; unit: UnitRef; action: RuneRef }
| { type: 'conducted'; action: RuneRef; units: UnitRef[] }
| { type: 'jarSealed'; at: Coord; owner: UnitRef; event: 'step' | 'dusk' } | { type: 'jarOpened'; at: Coord; by: UnitRef | null }
| { type: 'jarCrumbles'; at: Coord } | { type: 'scheduled'; kind: Scheduled['kind']; at: Coord } | { type: 'repeated'; action: RuneRef }
| { type: 'triggered'; rune: TriggerRuneId; passed: boolean }
| { type: 'named'; what: 'compound' | 'burst' | 'idiom'; id: string }       // silent; the run layer turns it into a codex reveal
```
`describe()` gets one plain-English line per variant (W0 writes them; tasks may refine wording in their own scenario tests).

### 2.8 Profile v7 (`engine/types.ts`, run layer)
```ts
Profile = { known: RuneId[]; methods: MethodId[]; inventions: InventionDef[]; solvents: Record<SolventId, number>;
  inkCapacity: Record<MemberId, number>; lattices: Record<MemberId, Placed[]>; witnessed: LineId[]; named: string[];
  met: Meets[]; foesMet: EnemyId[]; footnotes: Record<RuneId, { points: number; chosen: Record<LineId, string> }>;
  vellum: number; glyphs: GlyphDef[]; glyphArchive: GlyphDef[]; glyphRecords: Record<string, GlyphRecord>;
  proof: Record<MemberId, FiredCell[][]>; city: CityState }
LootItem = { kind: 'rune'; rune } | { kind: 'method'; method } | { kind: 'solvent'; solvent } | { kind: 'ink'; member; amount }
  | { kind: 'vellum'; amount } | { kind: 'doorway' } | { kind: 'key'; district }
```

---

## 3. Waves

```
W0  orchestrator: contracts, stubs, real rune/method/solvent/idiom data            (sequential)
W0b O: cutover engine+data onto the new model, delete the old       } one pair, merged together
W0c S: cutover app+UI, save v7 fresh start                         } (W0c branches from W0b)
W1  E1 O resolve · E2 S chemistry · E3 S push+actions · R1 S run layer          (parallel)
W2  E5 S marks · E6 S jars+rounds · L1 S lines+named results · U4 H rune art     (parallel)
W3  E7 S inventions · U1 S board view+projection · U3 S lattice editor · C1 H line+codex text   (parallel)
W4  E8 S solvents · E9 S leans+habits · U2 S battle preview D2/D3 · F1 S footnotes engine     (parallel)
W5  U5 S Bench · U6 S codex · U7 S footnote desk · M1 S elegance+proof+idioms on roles         (parallel)
W6  S1 H Lab scenarios · T1 S fuzz+integration · K1 H dead-code sweep · R2 H encounters+loot content (parallel)
W7  orchestrator: verification at 375×812, code review, docs, first push
```
O = Opus, S = Sonnet, H = Haiku. Merge order inside a wave: as listed. Critical path: W0 → W0b/c → E1 → E5/E6 → E7 → E8 → U5.

### W0 Contracts (orchestrator, Opus) · M
- Everything in §2 as types in the new files; `data/runes.ts`, `methods.ts`, `solvents.ts`, `idioms.ts` with real content from design §5, §6.2, §6.3, §11; `hooks.ts` real; every §2.5 module as a stub; new `describe` lines. Written for real (small, shared by every task): `withLine` and the `EventMeta` stamping in a new `engine/meta.ts`, and the per-cast effect cap (500 events → `fizzles`), so W1 tasks tag lines and origins from day one.
- **Done when:** `pnpm check` green with nothing importing the new files except `tests/engine/contracts.test.ts` (31 runes, role counts 4/9/5/5/3/2/3, every rune has a school and a district); commit `chore: rune redesign contracts (W0)`.

### W0b Cutover: engine and data (Opus) · L · deps W0
- **Owns:** `src/engine/*`, `src/data/*`, `tests/**` (except `tests/app`, `tests/ui`), `.claude/skills/scenario/SKILL.md`.
- Move §2 types into `data/types.ts` / `engine/types.ts`; delete aspects, recipes, research, drafts/folios, old materials, damage bonuses, affinity/amp/magnitude, the old runes and triggers (P5, P9). Rewrite `compileLattice` to emit `Step` trees (the walk, Fork order, Bend, Glyph frames, aura touches stay; material→kind/action, triggers, seals, shapes per §2.3) and `inkOf` per P33. New notation: unit mods `!` mark, `!!` deep, `&` collar, `$` shackle, `+` shield; states `i` blot, `o` slick, `~` cloud, `=` layout plate, `#` rune plate, `*` fire, `{stain}` `{brand}` `{pool}` `{fog}` `{skid}` `{bank}` `{kettle}` `{wall}`; terrain `_` drop, water/grate/gate/lamp/vent as now; enemy elite from data. `resolve.ts` minimal: aim, emit `cast`/`aimed`/`trace`, then `runStep` stub (no effects yet). Foes, AI, drift, snuffers, moths, gates adapted to `Tile.state` (fire = state `fire`, oil = `slick`). Glyph, cluster, proof, profiler, revision compile on roles (P7). Delete tests of removed systems; rewrite `tests/engine/lattice.test.ts`, `notation.test.ts`, `glyph.test.ts`, `glyph-identity.test.ts` (identity now compares `Step` trees and the aim log), foes/AI/turn tests on new notation.
- **Done when:** engine typecheck and tests green; `glyph-identity` passes; notation round-trips every new token; the legend in the scenario skill is updated.

### W0c Cutover: app and UI (Sonnet) · L · deps W0b (branches from it; merged with it)
- **Owns:** `src/app/*`, `src/ui/**`, `tests/app/*`, `tests/ui/*`.
- Compile fixes onto the new model; delete Bench/recipe/desk-folio/aspect UI (`app/recipe.ts`, `bench.ts` body, `desk.ts` folio parts, `AspectMark`, `CodexAspect`, `CodexRecipe`, `SilhouetteList`, `SlotRow`, `DraftPage`); routes to Bench and Desk show a "being rewritten" page. Board layers draw `Tile.state` with the existing looks (oil, steam, fire, plate, ink) and a neutral chip for compounds. `save.ts`: version 7, P1. Shelf lists `Profile.known`.
- **Done when:** `pnpm check` green on the pair; `verify` at 375×812: Study, a Seam battle (move, end turn, a cast that only aims), Map, Codex open without console errors.

### E1 Resolution pipeline (Opus) · L · deps W0b/c
- **Owns:** `engine/resolve.ts`, `engine/targets.ts`, `engine/snapshot.ts`, `engine/runes/flow.ts` (sources, shapes, triggers, seal split), `engine/cast.ts` (thin: action → `resolveSpell`), `tests/engine/resolve.test.ts`, `tests/scenarios/wiring.test.ts`, `tests/scenarios/triggers.test.ts`.
- R1–R9 and P21–P26: aims for Bolt, Splash, Touch, Vat; headings; wiring order; R7 unit-follows (via `whereIs`); Fork sides with left first; Splash reading order over frozen targets; Seep, Toll, Lay; Tally, Brink, Unison against the snapshot; failed trigger stops the flow (`triggered` event); Seal hands the rest to `sealJar` with the heading; nesting depth guard (limit 1).
- Tests (with a fake handler table where needed): `oil-then-spark-vs-spark-then-oil` (design §1 rows 1–2 differ), `shove-then-strike-follows-unit`, `fork-left-before-right`, `fork-sides-follow-heading` (4 headings), `splash-reading-order`, `splash-shove-once-per-unit`, `touch-self-no-heading`, `bolt-empty-line-targets-tile`, `own-cast-cannot-satisfy-tally` (R8), `brink-reads-cast-start`, `unison-needs-other-apprentice`, `seal-splits-before-after`, `failed-trigger-keeps-earlier`.

### E2 Board chemistry (Sonnet) · L · deps W0b/c
- **Owns:** `engine/mix.ts`, `engine/bursts.ts`, `engine/networks.ts`, `engine/runes/kinds.ts`, `data/chemistry.ts`, `data/lines.ts` (kind rows only: E2 appends a `// kinds` block), `tests/scenarios/mixing.test.ts`, `tests/scenarios/bursts.test.ts`, `tests/engine/networks.test.ts`.
- §4.1–4.3 with P13–P19: the five kinds on each layer, 16 mix rows, 5 bursts, the 10-row burst page, wash-out defaults, networks (Conduct across brass + collared units, Storm across connected cloud, fire along connected oil), `decayStates` with `Layer.rounds`, Coil's +1 reach for bursts (reads `step.auras`). Every non-headline behaviour inside `withLine`. Brand cloud's round-end marking and Kettle's heat are functions E6 calls (`roundEndChemistry(ctx)` exported here).
- Tests: one scenario per mix row, burst and page row (`brand-cloud-storm-double`, `pool-goes-up-at-once`, `shackle-snaps`, `skid-plate-shoots`, `kettle-blows`, `wall-rings`, `deep-mark-two-sparks`, `inkfire`, `flashover`, `thunderhead`), `fire-runs-along-oil`, `storm-connected-cloud`, `conduct-reaches-collars`, `spark-on-marked-is-4`, `coil-reaches-one-further`, `compound-fades-after-2`.

### E3 Push and actions (Sonnet) · M · deps W0b/c
- **Owns:** `engine/push.ts`, `engine/movement.ts`, `engine/runes/actions.ts`, `engine/damage.ts` (hit/died hooks via `notify`, shield/Guard), `tests/scenarios/push.test.ts`, `tests/scenarios/actions.test.ts`.
- §4.4 + P19, P27, P28: push along heading, slide over oil (oil used up for the round), crush numbers, drop on `_` and canal water, stunned elites, Hold; actions Strike, Shove, Guard, Hold, Swap, Draw (state, plate or jar one tile), Erase (state, compound, mark or jar); Sentence and Levy spend marks via `spendMark` (W0 gives a trivial body; E5 replaces it). `notify` for `pushed`, `entered`, `hit`, `died`.
- Tests: `the-wall` (design §1 row 3: oil + shove → slide → crush), `crush-counts-tiles`, `slide-no-pinball`, `minion-drops-in-canal`, `elite-drops-takes-4-stunned`, `member-never-drops`, `hold-blocks-push`, `guarded-hit-still-hit`, `sentence-pushes-2`, `levy-shield-per-mark`, `swap-with-caster`, `draw-moves-jar`, `erase-removes-mark-no-release`.

### R1 Run layer, save, loot, city (Sonnet) · M · deps W0b/c
- **Owns:** `engine/run.ts`, `engine/city.ts`, `data/loot.ts`, `data/districts.ts`, `data/members.ts`, `app/save.ts`, `app/flow.ts` (loot and trip only), `ui/components/trip/OfferCard.svelte`, `LootChips.svelte`, `tests/run/*`, `tests/app/save.test.ts`, `tests/app/trip.test.ts`.
- Profile v7 (§2.8) with `newProfile()` per P35; `known` replaces counts (P34); typed loot tables: rune pages, Conduct page, Gallnut/Cinder in the Seam, Pitch/Wick and Repeat/Margin pages in the canals; `returnHome` banks; `met`/`foesMet` gathered from fights; witnessed lines banked at `finishEncounter` (won or lost; P39 points). Hearing conditions: `ignite atLeast` → `burst fire atLeast`. The five other districts as *heard, being drawn* (P2). Threshold room per P10. Members' leans and habits as data (P36).
- **Done when:** new-profile, loot, banking, wipe and save-parse tests (malformed v7 fields → "Not a valid save"; v6 → fresh start); `threshold-solvable` test with the intended lattice.

### E5 Marks, Bind, spreading, release (Sonnet) · L · deps E1, E2, E3
- **Owns:** `engine/marks.ts`, `tests/scenarios/marks.test.ts`.
- D5, §6.4 limits 2, 3, 6, P29–P31: plain / deep marks, lineages with one spread history, spread on landing in a cloud and on entering one, bound actions released on their event with the release heading, spent before the action runs, each copy releases once, Lift moves the mark with what it holds. Bind's carrier landing uses `landKind('ink')` then attaches `bound`.
- Tests: `recoil-spreads-through-brand-cloud` (design §1 row 5, the headline combo), `mark-spreads-once-per-lineage`, `copy-releases-once`, `moving-mark-keeps-lifetime`, `expiry-does-not-release`, `release-heading-from-hit`, `transfer-hands-mark-back`, `anchor-on-pushed`, `bound-in-bound-depth-limit`.

### E6 Jars, scheduling, the round (Sonnet) · L · deps E1, E2, E3
- **Owns:** `engine/jars.ts`, `engine/schedule.ts`, `engine/turn.ts`, `engine/runes/auras.ts` (Afterglow, Steep), `tests/scenarios/jars.test.ts`, `tests/scenarios/rounds.test.ts`.
- §7 J1–J5, P32: one jar per owner (old one crumbles), step and dusk events, visible to both sides, foes trip them, Draw/Erase work on them (E3 calls `jars.ts`); the scheduled queue (repeats, wick, graphite, filings, thunderhead); the round order: player phase → resolve (jars at dusk, round-end chemistry, decay, Steep spread, Afterglow) → enemy phase; Guard expiry; `landed` reset per player phase.
- Tests: `jar-ink-now-fire-on-step` (J1's example), `fuse-opens-at-dusk`, `new-jar-crumbles-old`, `foe-trips-jar`, `step-on-own-jar-opens`, `afterglow-plus-one-round`, `steep-spreads-each-round`, `round-order-golden` (one full round's log).

### L1 Lines, witnessing, named results, idioms (Sonnet) · M · deps E1, E2, E3
- **Owns:** `engine/lines.ts`, `engine/preview.ts`, `engine/idioms.ts`, `data/lines.ts` (adds a `pending: true` row with empty text for every line id W1 fired that has no row; C1 writes the text), `tests/data/lines.test.ts`, `tests/scenarios/lines-registry.ts`, `tests/scenarios/harness.ts`, `tests/engine/preview.test.ts`, `tests/engine/idioms.test.ts`.
- §2.6 (on W0's `withLine` and stamping): `witnessedIn`, `maskPreview` (P41, P42), the integrity test, the harness hook that records fired lines for the registry; named results (`named` events on a compound's, burst's or idiom's first appearance per fight); the 9 idioms as log patterns (Cashing In, Bonfire, The Wall, Lantern Walk, Debt Collection, Steam Room, Long Drop, Peal, Redraft), credited to the origin cast.
- Tests: `mask-hides-unwitnessed-result`, `mask-keeps-landing-tile`, `harm-warning-on-unwitnessed`, `witnessed-from-foe-cast`, one golden per idiom.

### U4 Rune art (Haiku) · M · deps W0b/c
- **Owns:** `ui/glyphs.ts`, `ui/components/RuneGlyph.svelte`, `ui/components/SolventIcon.svelte`, new `ui/components/MethodMark.svelte`, `ui/screens/Gallery.svelte`, `galleryFixtures.ts`.
- 31 rune glyphs in the existing stroke style, frame colour per **role** (7), school tick; 5 method marks; 14 solvent icons; an invention's glyph = its method mark over its first part's glyph.
- **Done when:** the Gallery shows them all; 375×812 screenshot; orchestrator approves the look.

### E7 Inventions and methods (Sonnet) · L · deps E5, E6
- **Owns:** `engine/inventions.ts`, `engine/runes/index.ts` (dispatch of `InventionId`), `tests/engine/inventions.test.ts`, `tests/scenarios/inventions.test.ts`.
- §6.1–6.2, §6.4: compatibility per slot (Conduct/Repeat: an Action that resolves at once; Bind: Ink + Action + event; Lift: a moving Action; Margin: a Repeat invention), invalid combinations explained, headline derivation from the method template and the parts' headlines, role, ink (P33), nesting with all parts paid, no self-containment. Runtime: Conduct (snapshot the brass network, each unit once, Coil +1), Repeat (now + scheduled once, repeat spent), Margin (aura: touching Actions repeat next turn), Bind (via marks), Lift.
- Tests: `impulse-pushes-one-into-other` (design §11's first evening), `brass-shelter-guards-network`, `afterimage-repeats-once`, `margin-echoes-touching`, `recoil-headline-text`, `bind-impulse-nested`, `cannot-contain-itself`, `shape-has-nothing-to-store`, `invention-ink-sum`.

### U1 Board view and projection (Sonnet) · L · deps E5, E6
- **Owns:** `app/view.ts`, `app/playback.ts`, `app/fx.ts`, `app/timing.ts`, `app/describe.ts`, `ui/components/board/*` (new `JarLayer.svelte`), `tests/app/projection.test.ts`, `playback.test.ts`, `fx.test.ts`, `view.test.ts`.
- Project every §2.7 event; draw states, the 10 compounds (each its own pattern), marks (plain, deep, bound with the held action's glyph), collars, shackles, shields, holds, jars (owner colour, contents peek on long-press), pushes with slide trails, crush and drop effects, bursts per type.
- **Done when:** the projection drift guard matches the engine on every scenario in `tests/scenarios/*`; `verify` screenshots of a Brand cloud, a jar, a slide-crush, a storm.

### U3 Lattice editor, shelf, ink (Sonnet) · M · deps E7
- **Owns:** `app/study.ts`, `ui/components/lattice/*`, `ui/screens/Study.svelte`, `ui/components/study/StudyScene.svelte`, `tests/app/study.test.ts`.
- Shelf tabs: **Runes** (known, grouped by role), **Inventions**, **Fair copies**; ink pot per apprentice with trained discounts shown; long-press shows headline + `fine print n / m`; the flow overlay draws Fork sides and the seal split (the rest drawn in jar colour).
- **Done when:** reducer tests; `verify` 375×812: shelf tabs, an invention placed, the ink pot after a trained discount, a seal split overlay.

### C1 Fine print and codex text (Haiku) · M · deps L1 (row shape), E2, E3
- **Owns:** `data/lines.ts` (text of every pending row, plus rows for W3–W4 behaviour as specified by the orchestrator), `data/codex.ts`, `data/footnotes.ts`.
- One sentence per line in the design's voice (D8: readable in one sentence, consistent with the headline), the P4 rows; codex entries for 31 runes, 10 compounds, 15 bursts, 5 methods, 14 solvents, 9 idioms with owner notes; the 8 footnote variants (P39).
- **Done when:** `tests/data/lines.test.ts` passes for the rows already fired by merged tests; rows for W4 behaviour are marked `pending: true` and the integrity test skips only those.

### E8 Solvents (Sonnet) · M · deps E7
- **Owns:** `engine/solvents.ts`, `tests/scenarios/solvents.test.ts`.
- One hook each (P38): Gallnut `onReach` marks; Cinder `onReach` hot tile (oil there ignites); Pitch on water drifts with the current each round; Wick `delay`; Wax `noSpread` + fire melts it unspent; Sand `reverse` (acts on whoever set it off); Bath salt `widen` to the connected cloud; Fog jar `widen` to neighbours one step weaker (push −1, damage −1, min 0); Mortar `pushBonus` +1; Chalk +1 reach (range or network depth); Rivet `onReach` Hold until your next turn; Filings on brass rings once more next round (schedule); Quicksilver `widen` to the mirrored tile; Graphite `after` undoes state changes a round later.
- Tests: one scenario per solvent on Impulse or Recoil, plus `wax-recoil-melts-in-fire` and `sand-recoil-hits-hitter`.

### E9 Leans and habits (Sonnet) · S · deps E7
- **Owns:** `engine/leans.ts`, edits to `engine/resolve.ts` (Fork ahead), `engine/jars.ts` (two jars), `engine/lattice.ts` (trained ink), `tests/scenarios/leans.test.ts`.
- P36: gifted +1 by each rune's `gift`; trained −1 ink; Stoker's Fork-ahead; Draughtsman's two jars.
- Tests: `gifted-shove-pushes-2`, `trained-discount-min-1`, `fork-ahead-habit`, `two-jars-habit`.

### U2 Battle preview D2/D3 and aiming (Sonnet) · M · deps L1, U1
- **Owns:** `app/battleInput.ts`, `app/battle.svelte.ts`, `ui/components/battle/*`, `ui/screens/Combat.svelte`, `tests/app/battleInput.test.ts`, `tests/app/preview.test.ts`.
- Aims for Touch (self / adjacent) and Vat; the preview per P41–P42 using `maskPreview`; the confirm sheet's caption; long-press on a jar or a mark shows its owner and contents (J3).
- **Done when:** reducer tests for masked and witnessed previews and the harm warning; `verify` 375×812: a blank-result preview, a harm warning, a witnessed preview.

### F1 Footnotes engine (Sonnet) · S · deps L1
- **Owns:** `engine/footnotes.ts`, `tests/run/footnotes.test.ts`.
- P39: points from banked witnessed firings, levels, offers, `writeFootnote(p, rune, line, variant)` spending one solvent of the line's district, free re-pick; variants switch the line's behaviour through `ctx.footnotes` (a `Record<LineId, string>` read in the four runes' handlers).
- Tests: level thresholds, offer contents, solvent spent, variant changes a scenario's log.

### U5 The Bench (Sonnet) · L · deps E7, E8, U1
- **Owns:** `app/bench.ts`, `app/bench.svelte.ts`, `ui/screens/Bench.svelte`, `ui/components/bench/*`, `app/routes.ts`, `tests/app/bench.test.ts`.
- §6.1 flow per P37 at 375×812 without scroll: method list (learned), part slots that accept only compatible runes (others greyed with the reason), solvent row, live headline, the test scene (reuse `BattleBoard` + playback) with a subject and state palette from `Profile.met`, trial button, witnessed lines appearing as they fire, name and write.
- **Done when:** reducer tests; `verify`: empty Bench, an invalid combination's message, Impulse trial pushing one subject into another, the write sheet, the new invention on the shelf.

### U6 Codex (Sonnet) · M · deps C1, L1
- **Owns:** `ui/screens/Codex.svelte`, `ui/components/codex/*`, `engine/run.ts` (`codexView` only), `tests/run/codex.test.ts`.
- Sections: Runes (headline + witnessed lines + `fine print n / m`), Inventions, the **compound table** (4×4 empty frames, named in the owner's hand when made), the **burst page** (15 frames), Methods, Solvents, Idioms.
- **Done when:** codex view tests; `verify` screenshots of an empty and a partly filled compound table.

### U7 The footnote desk (Sonnet) · M · deps F1, C1
- **Owns:** `ui/screens/Desk.svelte`, `ui/components/desk/*`, `app/desk.ts`, `app/desk.svelte.ts`, `tests/app/desk.test.ts`.
- Runes with points and levels; an offer shows the line and its two variants; write with the solvent (count shown); re-pick.
- **Done when:** reducer tests; `verify` of an offer and a written footnote.

### M1 Elegance, proof and clusters on the new model (Sonnet) · M · deps E7, L1
- **Owns:** `engine/profiler.ts`, `engine/tripStats.ts`, `engine/proof.ts`, `engine/cluster.ts`, `app/profiler.ts`, `app/ranking.ts`, `tests/engine/profiler.test.ts`, `tests/engine/proof.test.ts`, `tests/engine/cluster.test.ts`, `tests/run/tripStats.test.ts`.
- P7, P8: harm credited by `origin` (a Fuse's fire counts for the cast that sealed it); trip ledger and biggest chain per origin; meaningful-event set for the new events; clusters with Seal and Fork steps.
- Tests: `fuse-harm-credits-sealing-glyph`, `bound-mark-harm-credits-binder`, `payload-glyph-earns-economy` (BL-57's case).

### S1 Lab scenarios (Haiku) · S · deps W5
- **Owns:** `src/data/scenarios.ts`.
- Lab entries for the design §1 five spells, the first-evening Impulse, Lantern Walk, Long Drop, Steam Room, Peal; expected logs copied from the merged scenario tests. The Lab palette lists all runes, inventions, methods and solvents (P2).
- **Done when:** `tests/scenarios/lab.test.ts` and `tests/app/lab.test.ts` pass.

### T1 Fuzz and integration (Sonnet) · M · deps W5
- **Owns:** `tests/sim/*`, `tests/scenarios/integration.test.ts`, `tests/scenarios/first-evening.test.ts`.
- Fuzz bots on random valid lattices with inventions and solvents; invariants: no throw, every chain terminates (limits 1–5), `inkUsed ≤ capacity`, projection matches the engine, every fired line has a row. First-evening loop: new profile → Seam trip → Conduct page → invent Impulse at the Bench → trial → write → place → cast in a fight → line witnessed. Re-calibrate the Seam's encounter difficulty bands with the bots.
- **Done when:** both pass, < 15 s added to CI.

### K1 Dead-code sweep (Haiku) · S · deps W5
- **Owns:** any file that only references removed systems, from a grep list the orchestrator provides (expected: leftover `research`, `aspect`, `recipe`, `draft`, `interaction`, `affinity` identifiers, unused CSS, unused fixtures).
- **Done when:** a grep for the old identifiers returns nothing outside docs; `pnpm check` green.

### R2 Encounters and loot content (Haiku) · S · deps T1 calibration notes
- **Owns:** `data/encounters.ts`, `data/enemies.ts` (elite flags, blurbs), `data/loot.ts` (weights only).
- Seam and canal boards reviewed for the new rules: at least one board per depth with oil beside a wall, one with brass plates, canal boards with water a foe can be pushed into; weights from T1's calibration.
- **Done when:** `tests/run/variants.test.ts` and the sims pass.

### W7 Wrap-up (orchestrator, Opus)
1. `pnpm check`; full `verify` at 375×812 on the dev server: a new profile, the first evening (Seam fight with an oil-shove crush, Conduct page, Bench Impulse trial and write, a cast of Impulse), a Brand-cloud storm across both apprentices, a jar, a masked preview and a harm warning, the codex compound table, the footnote desk, a canal trip and the threshold room. Screenshots in the report.
2. `code-review` skill (high) over the whole diff since W0; fix or log findings.
3. Docs in the same commit as the last merge: DESIGN §11 rows for P1–P42 and every subagent Proposal, DESIGN §6.2–6.6 summaries rewritten for roles, kinds, Bench and fine print; `rune-design-final.md` status → *Building/Shipped* with §0 listing this plan's Proposals; `rune-content.md` status; TECH §7 rows (Step tree, `Origin` stamping, line meta and masked preview, hook fan-out, save v7 fresh start, deleted systems); `docs/design/README.md` index; `docs/ROADMAP.md` (BL-98 done; BL-12 and BL-57 absorbed; BL-14 folios retired; new items from §5).
4. First push. Playtest list for the player: design §13 questions, plus P3 (edges are walls), P14–P16 (layers), P22 (headings), P33 (ink), P41 (blank preview), which are the most likely to feel wrong.

---

## 4. Risks

| Risk | Watch for | Response |
|---|---|---|
| W0b/W0c is one huge diff | the pair runs long or leaves the UI half-broken | W0c starts from W0b's branch as soon as the engine typechecks; the orchestrator merges the pair only together; screens may be plain but never crash |
| E1's ordering rules interact (R7 × R9 × Fork × Seal) | flaky goldens, special cases | E1 is on Opus with the named tests; later tasks add cases to `wiring.test.ts` instead of patching `resolve.ts` |
| Infinite chains (marks spreading, jars opening jars, conducted repeats) | fuzz hangs | the §6.4 limits plus a hard per-cast effect cap (500 events → `fizzles`) in `ctx.ts` from W0 |
| Line tagging drifts from data | behaviour with no row, rows never fired | L1's integrity test fails both ways; C1 rows marked `pending` until their behaviour merges |
| The masked preview leaks hints | a blank tile that only ever means one thing | U2 screenshots reviewed against D2; masked tiles look identical whatever the line |
| E5/E6/E7 all touch release, scheduling and dispatch | merge conflicts | the §2.5 APIs and `hooks.ts` are fixed in W0; each owns one module and calls the others only through them |
| The Glyph identity property breaks on Seals and Forks | E1 merge | `glyph-identity.test.ts` gets a Seal and a Fork-in-Glyph case in E1 |
| Balance collapses (crushes too strong, Strike useless) | T1's bot win rates | tune `TUNING` numbers only; rule changes go to the player's playtest |
| Haiku drifts in art or voice | U4, C1 output | one review round, then Sonnet |

## 5. Out of scope / later
- The ink-makers' quarter, bathhouses, bridges, foundry and Cartographers' hall as playable districts (their boards, foes, terrain, terrain lines, design rounds); unfinished paper.
- Rivals (rivals.md), the third apprentice and the third habit (party.md), basic actions pull / swap / hop.
- Footnote levels II–III and footnotes for the other 27 runes and for inventions; the remaining ~90 fine-print lines toward 220.
- New folios or rivals' lattice pages to replace the retired folios.
- Lab prototypes from design §14 (skipped by the player's instruction).
