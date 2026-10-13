# Research and Mastery, first slice (Bench + Compile): implementation plan

Design: [docs/design/research-and-mastery.md](../design/research-and-mastery.md) (the *what*; where this plan and the design disagree, the design wins and the orchestrator asks). Summary: [DESIGN.md](../../DESIGN.md) §6.3. Project rules: [CLAUDE.md](../../CLAUDE.md).

**Slice scope** (design §11, stages A + B, decided to ship together):
- **A. Aspects + Bench:** 8 aspects on every rune, 6 new runes from the six Seam recipes, 3 Seam solvents, trial and commit, resonance and margin lines, silhouettes, 3 torn pages, typed research loot.
- **B. Compile (plain):** cast traces, proof, clusters, Fair Copy, Glyphs (spell and payload, no parameters), outer auras at +1 ink, 3 idioms, the identity property test.

**Not in this slice** (stages C–G, later plans): profiler and elegance, revisions and versions, parameters, footnotes, Crystallise, tier-2 recipes, owner's drafts, the 7 later recipes, Glyphs inside Glyphs.

---

## 0. Team and models

| Role | Model | Why this model |
|---|---|---|
| **Orchestrator** (the main session) | **Opus 5.5** (`claude-opus-5-5`) | Owns the contracts, merges, design calls, the DESIGN/TECH logs and the final verification. The only role that needs judgement across the whole codebase |
| **Implementer** subagents | **Sonnet** (`model: "sonnet"`, Sonnet 5.5) | Engine logic, Svelte screens, tests with real reasoning (compiler, resonance, proof matching) |
| **Clerk** subagents | **Haiku** (`model: "haiku"`, Haiku 5.5) | Mechanical work against a precise spec: data tables, codex text, SVG glyphs following existing ones, scenario entries, list screens copying an existing pattern |

**Escalation:** if a Haiku task fails review twice, re-run it on Sonnet. If a Sonnet task fails review twice (most likely B1 or B2), the orchestrator takes it over on Opus. Never escalate preemptively.

### How the orchestrator runs it
1. **Wave 0 is the orchestrator's own work**: the type contracts and stubs that every later task codes against. The whole wave keeps `pnpm check` green.
2. Each later task is one subagent spawned with `isolation: "worktree"` and the task's model. It works only in the files it **owns** (listed per task), commits on its worktree branch, and reports back.
3. Tasks in the same wave run **in parallel** (background agents). The orchestrator merges each finished branch into `main` in the listed order (`git merge --squash`, one conventional commit per task with the task id, e.g. `feat(engine): A3 bench resonance`), runs `pnpm check` after each merge, and fixes small conflicts itself.
4. **After each wave:** `pnpm check` green, then `git push` (CI deploys). Screens without an entry point stay unreachable until the wave that links them, so the live site never shows a half-built feature.
5. Subagents **never edit** `DESIGN.md`, `TECH.md` or `docs/design/*`. They list every rule they had to invent under *Proposals* in their report. The orchestrator logs those (DESIGN §11, feature doc §0, TECH §7) in the merge commit.
6. **Review before merge:** the orchestrator reads the diff, checks the acceptance list, and for UI tasks looks at the screenshots in the report (or takes them itself with the `verify` skill at 375×812 if the subagent had no browser pane).

### Subagent prompt template
Every spawn prompt is standalone and contains:
```
You are implementing task <ID> of docs/plans/research-and-mastery-plan.md in The Apprentice's Notebook.
Read first: CLAUDE.md, the plan's §0–§2 and task <ID>, and design doc sections <§…>.
You own these files (create or edit only these): <list>. Read anything else.
Contract (already on main, do not change it; ask in your report if it is wrong): <types/signatures>.
Done when: <acceptance list>. Run `pnpm check` until green. For .svelte files, run the Svelte MCP
`svelte-autofixer` until it reports no issues. For UI, follow the `verify` skill at 375×812.
Commit on your branch: "<type>(<area>): <ID> <summary>" with the Co-Authored-By trailer.
Report: what you built, test names, screenshots (UI), and "Proposals": every rule you had to decide that
the design/plan did not specify, one line each with your reason.
```

---

## 1. Rules this plan settles (*Proposals*, log in DESIGN §11 when built)

The design leaves these open. Each is the default to build; the player judges by playing.

| # | Rule | Reason |
|---|---|---|
| P1 | A Glyph in a lattice uses its inner runes from the collection, like placing them one by one. Any member can place a Glyph if the runes are free. There are no separate Glyph copies | "Shared across members, one copy each owned" without a second ownership system |
| P2 | Fair Copy collapses the cluster into its **entry socket** and empties the other cells. Runes outside the cluster stay where they are; the preview names any that would no longer connect | Compression frees space; nothing moves without the player seeing it |
| P3 | An aura travels into the Glyph only if it touches nothing outside the cluster. An aura that also powers outside cells **blocks** the Fair Copy, with a message naming it | Keeps the identity property exact (behaviour never changes on compile) |
| P4 | Spell Glyphs rotate like Sources (the arrow = the source's arrow). Payload Glyphs carry an arrow too: flow enters only when travelling in the arrow's direction, otherwise it stops there like an empty socket | One readable rule: the arrow is the way in |
| P5 | An outer Amplify adds its +1 to every inner Source and Material. An outer Echo touching a Spell Glyph echoes it, and does nothing on a Payload Glyph. Every outer aura touching a Glyph adds +1 ink | Design §0 (outer auras reach every inner rune, +1 ink each) applied to both auras |
| P6 | A cast counts toward proof only if it is a player cast (not an echo) in a **trip** battle and produced ≥ 1 meaningful event: damage, shield gained or absorbed, inked, puddle, oiled, steam, plates, coated, ignite, died | Design §4.2; echoes would double-count one decision |
| P7 | Proof is stored as the last **300 cast masks per member**; each mask is the fired cells (rune + arrow + position). Proof is written when the encounter ends, win or wipe | Design: proof survives a wipe; bounded save size |
| P8 | The Bench trial board: one training dummy two tiles from the caster (three in a row for area runes). If a parent is a Source, it is the spell's source and the other rune follows it; otherwise `Bolt> Left Right` | "The trial plays the real reaction" needs a fixed, readable stage |
| P9 | Writing a known recipe again makes another copy for one solvent. The first write also fills the codex page | Runes come in counts; the solvent stays the only cost |
| P10 | Save migration v1 → v2: each old research point becomes one solvent, round-robin Gallnut → Pitch → Cinder; vellum starts at 0 | Old "reagents for the desk" become what they were promised to be |
| P11 | The Bench opens when the profile first owns a solvent. Fair Copy appears once any cluster is proven. The first compile of a recognised idiom costs no vellum | Design §6.2 unlock sequence; gates are data in `src/data/tuning.ts` |
| P12 | The shelf gets two tabs, **Runes** (20, three rows of 7) and **Fair copies** (Glyphs) | 20 runes no longer fit two rows at ≥ 44 px |

---

## 2. Architecture (contracts written in Wave 0)

### 2.1 Data (`src/data/`)
```ts
// types.ts
export type Aspect = 'reach' | 'mark' | 'slick' | 'heat' | 'charge' | 'vapor' | 'hold' | 'return';
export type SolventId = 'chalk' | 'gallnut' | 'pitch' | 'cinder' | 'quicksilver' | 'fogJar' | 'rivet' | 'wax';
export type SourceRuneId = 'bolt' | 'splash' | 'ward' | 'quill';
export type MaterialRuneId = 'ink' | 'oil' | 'spark' | 'steam' | 'brass' | 'smear' | 'torch' | 'fog' | 'mist' | 'brand';
RuneDef += { aspects: readonly [Aspect, Aspect]; origin: 'loot' | 'bench' }
export interface AspectDef { id: Aspect; name: string; glyph: string; solvent: SolventId; margin: string }
export interface SolventDef { id: SolventId; name: string; aspect: Aspect; blurb: string }
export interface RecipeDef { id: string; result: RuneId; left: RuneId; right: RuneId; solvent: SolventId; torn: 'left' | 'right' | 'solvent' | null; ownerNote: string }
export type IdiomStep = { family?: RuneFamily; aspects?: readonly Aspect[] }; // a step matches a node if all given fields match (any listed aspect)
export interface IdiomDef { id: string; name: string; steps: readonly IdiomStep[]; ownerNote: string }
LootSpec/LootItem: research → { kind: 'solvent'; solvent: SolventId } | { kind: 'vellum'; amount: number }
CodexEntryDef.kind += 'recipe' | 'idiom' | 'aspect'
Tuning += { glyphMinCells: 3; glyphMaxCells: 8; provenCasts: 5; proofMasksPerMember: 300; compileVellum: 1 }
```
New files: `aspects.ts` (`ASPECTS`, `SOLVENTS`), `recipes.ts` (`RECIPES`, the six), `idioms.ts` (`IDIOMS`, three: Cashing In, Bonfire, Undertaker).

### 2.2 Engine (`src/engine/`)
```ts
// types.ts
export interface PlacedGlyph { at: Coord; glyph: GlyphId; dir: Dir }
export type Placed = PlacedRune | PlacedGlyph;           // Lattice.runes: readonly Placed[]
export const isGlyph = (p: Placed): p is PlacedGlyph => 'glyph' in p;
export type GlyphId = string;
export interface GlyphDef {
  id: GlyphId; name: string; kind: 'spell' | 'payload';
  cells: readonly PlacedRune[];   // local frame: entry at `entry`; flow enters travelling 'right' (spell: the source's arrow is 'right')
  entry: Coord;
  exits: readonly { from: Coord; dir: Dir }[]; // local; inner walk order
  idiom: string | null;
}
export type GlyphLibrary = Readonly<Record<GlyphId, GlyphDef>>;
SpellNode (both kinds) += { inner?: Coord }   // set for nodes inside a Glyph; `at` is then the Glyph's socket
PathCell += { inner?: Coord }
Spell.source: SourceRuneId (unchanged; a Spell Glyph's source is its inner source); Spell += { glyph?: GlyphId }
compileLattice(l, affinity, glyphs?: GlyphLibrary)   // default {}
inkUsed(l, glyphs?)                                  // Glyph = max(1, Σ inner − floor(cells/3)) + outer auras touching

// events.ts
| { type: 'trace'; caster: UnitRef; spell: SpellKey; cells: FiredCell[]; meaningful: boolean } // silent
export interface FiredCell { at: Coord; rune: RuneId | null; glyph?: GlyphId; dir?: Dir }
describe() returns null for silent events; describeLog() drops them; the UI projection ignores them.

// Profile (run layer), save version 2
Profile -= research; Profile += {
  solvents: Record<SolventId, number>; vellum: number;
  bench: { trials: string[]; known: string[] };   // trial keys "left+right+solvent" (parents sorted); recipe ids
  glyphs: GlyphDef[];
  proof: Record<MemberId, FiredCell[][]>;          // newest last, capped
  idioms: string[];                                // recognised idiom ids (codex)
}
```
New modules (stubs in Wave 0 throw `not implemented`):
| Module | Public API |
|---|---|
| `research.ts` | `trialKey(a)`, `trial(attempt, recipes, known) → { score: 0..6; margin: Aspect \| 'exact' \| 'none-left'; recipe: string \| null }`, `silhouettes(recipes, known)`, `trialLattice(attempt) → { board: string; lattice: string }` |
| `glyph.ts` | `glyphCost(g)`, `rotateLocal(c, dir)`, `fairCopy(lattice, cluster, glyph) → Lattice` (collapse), `disconnected(lattice, cluster) → Coord[]` |
| `cluster.ts` | `clustersOf(lattice, glyphs) → Cluster[]`, `canonical(cells) → string`, `blockingAuras(lattice, cluster) → Coord[]`, `toGlyphDef(lattice, cluster, name, id)` |
| `proof.ts` | `masksFrom(events, member) → FiredCell[][]`, `provenCount(cluster, masks)`, `maximalProven(lattice, at, masks)`, `matchIdioms(lattice) → string[]` |

`run.ts` gains `distil(p, attempt) → Profile` (throws unless exact), `recordProof(p, member, masks)`, `compileGlyph(p, member, cluster, name) → Profile`, `renameGlyph`. `available()`/`canPlace()` count Glyph inner runes (P1).

---

## 3. Waves and tasks

```
W0  orchestrator: contracts + stubs + placeholder data          (sequential)
W0b S: Placed refactor (lattices may hold Glyphs)                (sequential)
W1  A1 H data · A2 S new runes · A3 S resonance · A4 S run+save · B1 S glyph compile   (parallel)
W2  B2 S trace+proof+clusters+idioms · C1 S Bench UI · C2 H glyphs/icons · D1 H Lab scenarios  (parallel)
W3  C3 S Fair Copy + shelf tabs · C4 H codex pages · D2 S fuzz + integration                (parallel)
W4  orchestrator: full verification, docs, push, playtest hand-off
```
Merge order inside a wave: the order listed. S = Sonnet, H = Haiku.

### W0 Contracts (orchestrator, Opus)
- Every type in §2 written. Placeholder `RUNES` entries for the 6 new runes (real names, family, `base`, `charges: 4` for Quill, aspects from the design doc §2/§3.3, rule text from §3.3), `RUNE_GLYPH` placeholder shapes, empty `RECIPES`/`IDIOMS`/`ASPECTS` filled enough to typecheck, stubs for the four new modules, the `trace` event in the union with `describe` → null and `describeLog` filtering, `Profile` v2 type with `newProfile()` defaults. The new runes do nothing in battle yet (the material switch cases are no-ops with a `// A2` note).
- **Done when:** `pnpm check` is green; one commit `chore: research+compile contracts (W0)`; push.

### W0b Placed refactor (Sonnet)
- **Owns:** every file the typecheck flags after `Lattice.runes` becomes `readonly Placed[]` (engine `lattice.ts`, `notation.ts`, `run.ts`, `scenario.ts`; app `study.ts`, `recipe.ts`, `lab.ts`, `describe.ts`, `flowGeometry.ts`; the UI lattice components).
- Narrow with `isGlyph`. `compileLattice` treats a Glyph socket as an insulator for now (B1 implements it). Notation: lattice token `G:<id>>` (arrow suffix as usual) for Glyph sockets, round-trip tested.
- **Done when:** no behaviour change (all existing tests pass untouched), plus a notation round-trip test for a Glyph token.

### A1 Data content (Haiku)
- **Owns:** `src/data/aspects.ts`, `recipes.ts`, `idioms.ts`, `runes.ts` (aspects for the 14 + final defs for the 6), `codex.ts` (6 rune entries, 6 recipe entries with owner notes, 3 idioms, 8 aspects), `tests/data/integrity.test.ts`.
- Tables come verbatim from the design doc §2 (aspects, solvents, margin lines), §3.3 (the six Stage A recipes; torn: Smear solvent, Torch solvent, Mist solvent), §4.6 (Cashing In, Bonfire, Undertaker as `IdiomStep[]`).
- **Recipe validity test** (design §9.1): the four explainability rules; all 14 + 6 rune aspect pairs unique; every recipe result's aspects unique and not used by any other rune; every solvent's aspect exists; every recipe id has a codex entry.
- **Done when:** the validity test passes on real data and fails on a deliberately broken in-test copy (one negative case per rule).

### A2 New rune behaviours (Sonnet)
- **Owns:** `engine/materials.ts`, `cast.ts`, `damage.ts`, `notation.ts` (unit mod `%` = branded), `events.ts` (new event types + `describe` lines), `lattice.ts` (only `describeNode`/`describeSource`), `queries.ts` if needed, `tests/scenarios/research-runes.test.ts`, `tests/scenarios/harness.ts`, `.claude/skills/scenario/SKILL.md` (legend).
- Rules (design §3.3; magnitudes use the existing footprint rules):
  - **Smear:** ink the footprint like Ink; then every unit inked by it passes the mark to each orthogonally adjacent unit (one hop, no chain). Event `smear`.
  - **Torch:** oil the footprint, then ignite it (the existing `ignite` spreads along connected oil).
  - **Fog:** oil then steam on the footprint (slides from oil, blocks Bolts from steam).
  - **Mist:** flood the steam cloud(s) touching the footprint, ink every unit in them, then remove that steam. Event `mist`.
  - **Quill** (Source, like Bolt): hits the first unit in line for its magnitude, then pools ink under that unit's tile. The rest of the chain applies there.
  - **Brand:** marks like Ink (no puddle) and sets `branded`; a branded unit takes +2 from fire instead of the oil-soaked +1 (they don't stack: the larger applies).
- **Done when:** one scenario test per rune (design §9.3), plus Brand+fire, Mist with no steam (does nothing, logs nothing), Smear at a board edge; `describe` lines read naturally; the projection drift guard still passes (`tests/app/projection.test.ts`), so extend `app/playback.ts` projection for the new events (allowed file for this task).

### A3 Bench resonance (Sonnet)
- **Owns:** `engine/research.ts`, `tests/engine/research.test.ts`.
- Exactly design §3.2: per undiscovered recipe, try both parent assignments, slot scores 2 / 1 / 0 (solvent "shares" = its aspect is in the result's aspects), keep the best total; the best recipe across all undiscovered wins (ties: recipe order in data). Margin: in the winning assignment, the lowest-scoring slot (ties: left, right, solvent); its gap aspect = the first aspect of that slot's target (parent's aspects, or the result's aspects for the solvent) not carried by the attempt's ingredient. 6 → `'exact'`, nothing undiscovered → `'none-left'`.
- `silhouettes`: per undiscovered recipe, the result family, its two aspects, ink cost, parent families, and the torn sentence when `torn` is set.
- `trialLattice` implements P8.
- **Done when:** golden table tests with injected recipe tables (swapped parents, solvent-only match, ties, exhausted, none-left), plus one test on the real `RECIPES` that each recipe scores 6 and every one-slot change scores < 6.

### A4 Run layer and save v2 (Sonnet)
- **Owns:** `engine/run.ts`, `data/loot.ts`, `app/save.ts`, `app/flow.ts` (loot only), `src/ui/components/trip/OfferCard.svelte` and `LootChips.svelte` (labels for the new loot), `tests/run/*`, `tests/app/save.test.ts`, `tests/app/trip.test.ts`.
- Typed loot tables: Seam shallow/deep/heart get weighted Gallnut/Pitch/Cinder; deep and heart add vellum (1). The heart's picks may also be any of the three. `returnHome` banks solvents and vellum. `distil` per P9. Migration 1 → 2 per P10, and `parseSaveData` validates every new field (bad data → the existing "Not a valid save" path).
- **Done when:** migration test from a real v1 save string; parse rejects malformed v2 fields; `distil` spends exactly one solvent, adds one rune, marks the recipe known and records the trial; wipe and return paths covered.

### B1 Glyph compile (Sonnet)
- **Owns:** `engine/glyph.ts`, `engine/lattice.ts` (`compileLattice`, `inkUsed`, `validateLattice`), `tests/engine/glyph.test.ts`, `tests/scenarios/glyph-identity.test.ts`.
- Compile a Glyph socket in the walk: Spell Glyphs are Sources (sorted with them by reading order); Payload Glyphs are entered per P4. Inside, walk the local cells in the rotated frame with their own visited set; inner nodes get `at` = socket and `inner` = local cell; at each exit, continue the outer walk from the socket in the rotated exit direction. Auras per P5; inner auras use local adjacency. Ink per §2.2.
- **Identity property test (design §9.4, the most important test):** for each of the 3 idioms and 4 hand-made clusters (with a Fork exit, a trigger, an inner Amplify, an outer Amplify), the flat lattice and the compiled lattice (Glyph at the entry socket, the outside tail re-laid from the socket's exit neighbour) produce the same `describeLog` on 3 boards each. With outer auras, compare against the flat version with the same auras touching every inner cell.
- **Done when:** the identity tests pass, rotation (4 dirs) is tested, the cost formula and the outer-aura +1 are tested, and validation rejects unknown Glyph ids.

### B2 Trace, proof, clusters, idioms (Sonnet)
- **Owns:** `engine/cast.ts` (emit `trace` at the end of a non-echo `castSpell`), `engine/cluster.ts`, `engine/proof.ts`, `engine/run.ts` (`recordProof`, `compileGlyph`, `renameGlyph`, P1 counting), `app/flow.ts` (`endBattle` writes proof by replaying `trip.actions` from the seed, which is deterministic, so masks come from the full fight log), `tests/engine/cluster.test.ts`, `tests/engine/proof.test.ts`, `tests/run/proof.test.ts`.
- Fired cells: the source plus every node that ran, plus the shape cells walked to reach a node that ran (B2 adds `via: Coord[]` to nodes in `compileLattice`, coordinating with B1's merged code).
- Clusters (design §4.1): connected subtrees of a spell's flow tree containing their root, 3–8 cells, plus auras per P3; Spell kind iff the root is a Source. Canonical form: invariant under rotation and translation, not mirroring; arrows rotate with the cells. `provenCount` = masks (from **every** member, since a pattern proven in one lattice counts when rebuilt in another) containing some rotation and translation of the cluster. Heredity (sub-cluster of proven is proven) is tested as a property.
- Idioms: a cluster matches an idiom if one root-to-leaf branch, skipping shapes, matches the idiom's steps in order.
- **Done when:** the design §9.5 cluster tests; a recorded trip whose fifth cast proves a cluster; a wipe still records proof; a Lab battle records nothing; `compileGlyph` collapses per P2, spends vellum (free for a first idiom compile, P11) and refuses when P3 blocks.

### C1 Bench screen (Sonnet)
- **Owns:** `app/routes.ts` (`bench` route), `app/flow.ts` (route resolution only), `app/bench.ts` (pure reducer: slots, trial, commit), `app/bench.svelte.ts`, `ui/screens/Bench.svelte`, `ui/components/bench/*`, `ui/components/study/StudyScene.svelte` (a Bench entry, hidden until P11), `ui/components/lattice/RuneShelf.svelte` (rows only; tabs come in C3), `tests/app/bench.test.ts`.
- Layout per design §7 at 375×812, no scroll: three slots, trial board (reuse `BattleBoard` with the playback of the trial events), resonance pips (reuse `Pips`), margin line in handwriting, Trial / Write in ink, silhouette list with torn sentences, exhausted pairs greyed. Write in ink shows the new rune and toasts "New in the notebook".
- **Done when:** reducer tests; the `verify` skill at 375×812 with screenshots of an empty Bench, a 4/6 trial with its margin line, an exact commit, and the silhouettes; the shelf shows 20 runes in three rows at ≥ 44 px.

### C2 Glyph art and icons (Haiku)
- **Owns:** `ui/glyphs.ts`, `ui/components/RuneGlyph.svelte` (the Glyph socket look: folded corner), `ui/screens/galleryFixtures.ts`.
- Six rune glyphs in the style of the existing 14 (simple strokes, the family frame colours); 8 aspect marks (the design's ☍ ◈ ≋ ♨ ϟ ☁ ▣ ⟳ as SVG); 3 solvent icons; the Glyph socket (folded corner, name initial).
- **Done when:** the Gallery shows all of them, with a 375×812 screenshot in the report; the orchestrator approves the look.

### D1 Lab scenarios (Haiku)
- **Owns:** `src/data/scenarios.ts`.
- One Lab scenario per new rune (copy the existing entries' shape, `demo` + `expected` taken from A2's scenario tests), plus `glyph-cashing-in` (a Spell Glyph cast).
- **Done when:** `tests/scenarios/lab.test.ts` and `tests/app/lab.test.ts` pass with the new entries.

### C3 Fair Copy and the shelf tabs (Sonnet)
- **Owns:** `app/study.ts`, `app/faircopy.ts` (pure: select maximal, trim, preview, disconnect list, P3 messages), `ui/components/lattice/*` (proven glow, selection, Glyph sockets, shelf tabs per P12), `ui/components/study/GlyphSheet.svelte` (peek inside, rename), `ui/screens/Study.svelte`, `tests/app/faircopy.test.ts`.
- Flow per design §4.3 without parameters: tap a glowing cell → maximal proven cluster; tap a tail cell → trim; name (idiom name suggested); "Fair-copy (1 vellum)" or "free: idiom". The preview shows ink before → after, any disconnected outside runes (P2) and any blocking aura (P3). The Glyph then sits on the shelf's Fair copies tab and places like a rune.
- **Done when:** reducer tests; `verify` at 375×812: proven glow, selection with trim, the confirm sheet, the collapsed lattice with the Glyph, the shelf tab, a battle cast of the Glyph spell.

### C4 Codex pages (Haiku)
- **Owns:** `ui/screens/Codex.svelte`, `ui/components/codex/CodexEntry.svelte`, `engine/run.ts` (`codexView` only, for the new kinds).
- Sections: Runes (now with aspect marks), Recipes (silhouette until known, then the full sentence and owner's note), Idioms, Aspects. The header count covers every kind.
- **Done when:** `tests/app` codex view tests; a `verify` screenshot.

### D2 Fuzz and integration (Sonnet)
- **Owns:** `tests/sim/fuzz.test.ts`, `tests/scenarios/integration.test.ts`, new `tests/scenarios/research-loop.test.ts`.
- The fuzz bots get the new runes and random valid Glyph lattices (built through `clustersOf` + `compileGlyph`); invariants: no throw, `inkUsed` ≤ capacity, the projection matches the engine. The loop test: new profile → trip with seeded loot → solvent → distil Smear → place it → 5 trips' worth of casts → cluster proven → compile → the Glyph casts the same `describeLog` as before.
- **Done when:** both pass in CI time (< 10 s added).

### W4 Wrap-up (orchestrator, Opus)
1. `pnpm check`; full `verify` pass at 375×812 on the live dev server: the Study (Bench entry, shelf tabs), Bench (trial, commit), a trip with solvent loot, Fair Copy, a Glyph cast in battle, the Codex. Screenshots in the report to the player.
2. Docs in the same commit as the last merge: DESIGN §11 rows for P1–P12 and any subagent Proposals; the feature doc §0 and status (*Building* → slice shipped); TECH §7 rows (Placed union, the silent `trace` event, proof masks, save v2 migration, the Glyph compile path); DESIGN §10 checkbox; `docs/design/README.md` index status.
3. Push. Hand the player a playtest list: the design doc §10 hypotheses (is the Bench fun for 15 minutes? does compiling feel like a reward? does the ink saving change builds?) plus P2, P4 and P12, which are the most likely to feel wrong.

---

## 4. Risks for the orchestrator to watch

| Risk | Watch for | Response |
|---|---|---|
| B1 and B2 both touch `compileLattice` | the `via` field (B2) on B1's new walk | B2 runs after B1 is merged; the orchestrator rebases B2's worktree if needed |
| The Placed refactor (W0b) ripples into the UI | lattice components breaking at runtime, not at the typecheck | W0b includes a quick `verify` of the Study before merge |
| The identity test is weak | tests compare only spells, not battle logs | reject B1 unless it compares `describeLog` on real boards |
| The shelf at 20 runes doesn't fit 812 px | C1 screenshot | fall back to a scrollable third row before shrinking taps below 44 px |
| Proof replay cost at `endBattle` | slow on long fights | replay is engine-only and short (≤ ~40 actions); measure in D2 |
| A Haiku task drifts from the existing style | C2/C4 screenshots | one review round, then re-run on Sonnet |
