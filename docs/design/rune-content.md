# Rune Content Rework

> **Status: Answered and built** (2026-10-19). This is the historical problem frame, defined 2026-10-17 and scoped 2026-10-18 (§7). [rune-design-final.md](rune-design-final.md) is the current design; its implementation includes the formerly deferred mastery, Lab, integration, cleanup and encounter tasks.
> Summary and decision log: [DESIGN.md](../../DESIGN.md) §6.3 (runes), §6.5 (materials), §11. Related: [research-and-mastery.md](research-and-mastery.md) (aspects, Bench, Glyphs), [city-and-districts.md](city-and-districts.md), which held back "aspects, recipes, loot and solvents" **for this rework**. Roadmap: BL-98.

## 1. What the player said (2026-10-17)

- Battles, the two districts, the owner's puzzles (folios) and the Bench **as a concept** all work.
- **Rune content is the weakest part.**
- The basic runes are ok, but they **behave alike**. In a flow, each one builds up a state and then Spark sets it off.
- Bench runes are **too close to the basic ones**, and often do **what two runes in a flow already do**.
- The new content should draw on everything we planned and then paused.

## 2. The problem, diagnosed

Seven causes. Each one comes with evidence from the current data or rules.

### P1 · Most runes do one thing: put a state on the target

13 of the 26 runes are Materials, and every Material does the same thing: apply a state (mark, oil, cloud, plate, fire, heat) to the footprint the spell landed on. Shape, Trigger and Aura have 3 runes each. Inside one family, runes differ in *which* state they leave, not in *what they do*.

### P2 · Spark is the only way to cash in

The interaction matrix (DESIGN §6.5) is a star with Spark at the centre, not a web. Every reaction that deals damage is **Spark or Fire acting on something**: ignite (oil), conduct (brass), arc (steam), detonate (ink), heat (fire beside brass). The other runes are fuel. Outside the Heat aspect, no Material deals damage (Ink's +1 damage taken is a passive bonus).

So the best flow always looks the same: `Source → setup → setup → Spark`. The idioms say it too: *Cashing In* is Mark → Heat/Charge, *Bonfire* is Slick → Heat.

### P3 · Every rune lands on the same tiles

After the Source, every rune applies to the same target tiles. **Fork** sends both branches to the same targets, so it only sets the order (decided in v0.1). **Bend** only routes the wiring. Only Pierce, On Kill and On Ignite move the target. So:

- a spell is a **stack of effects on one hit**, and the order only matters as "setup before Spark";
- the lattice's geometry (wide Draughtsman, tall Stoker, forks, bends) **never reaches the board**. The Shape family shapes the wiring, not the spell.

### P4 · Triggers are a tax, not a decision

Triggers see effects from earlier in the same cast (v0 default, shipped). `Ink → On Inked` therefore always passes, and so does `Oil → Spark → On Ignite`. In practice a trigger checks whether your own previous rune worked. It costs 2 ink and almost never fails, so there is nothing to decide. On Kill is the exception, because a kill can fail. Nothing reacts to enemies, allies, turns or terrain the spell didn't make (*When ally hit* was planned and never built).

### P5 · Bench runes are hand-written Glyphs

The 9 Bench results, read against their parents:

| Bench rune | Parents | What it does | The wiring it replaces |
|---|---|---|---|
| Torch | Oil + Spark | oil, lit at once | `Oil → Spark` (without the spark damage) |
| Fog | Oil + Steam | oil, then steam | `Oil → Steam` |
| Mist | Ink + Steam | marks a cloud, clears it | `Steam → Ink` (the *diffuse* interaction) |
| Quill | Bolt + Ink | a bolt that pools ink under its target | `Bolt → Ink` |
| Kiln | Brass + Spark | a plate that starts hot | `Brass` + fire beside it |
| Brand | Ink + Spark | Ink with +2 from fire | Ink, a bit stronger |
| Scald | Spark + Steam | a steam cloud that hurts each round | Steam plus damage over time |
| Smear | Ink + Oil | Ink, passed one hop | Ink, wider |
| Etch | Ink + Brass | Ink, and spark through brass sets off marks | `Ink`, `Brass`, `Spark` together |

- 8 of 9 are Materials, and none is a Shape, Trigger or Aura. They add no new verb. They save a socket and an ink, which is **exactly what Compile already does** with a Glyph. Distil and Compile overlap.
- **The grammar pushes toward this.** The explainability rule makes each parent share an aspect with the result, and aspects are read off the rule. So the result tends to inherit both parents' behaviour: A plus B.

### P6 · The aspect grammar is full

26 runes use 26 of the 28 aspect pairs. Only ≋ϟ and ≋⟳ are free. This blocks the later recipes (BL-20, BL-24) and any new loot rune (BL-51). Any new content has to re-cut the aspects: a ninth aspect, a retag, or different rules.

### P7 · Few ways to deliver a spell

There are three Source shapes (a line, a 3×3, an ally) plus Pierce (a line that hits two). Because delivery barely varies, P3 shows even more: most spells are "one hit plus a stack".

**Knock-on effects:**
- Setup runes deal no harm, so Payload Glyphs almost never earn Economy (BL-57: bot p50 = 0).
- A member's affinity is a material. The Draughtsman and the Stoker differ only in which setup rune is cheaper, so the lattice shapes don't change what each member plays.

## 3. What works and must survive

- **The board's reactions**: oil burning, conduction, arcs, stains, heated brass, the current. The player likes the battles. The five materials as *terrain* aren't the problem. The problem is that the *runes* use them in only one way.
- Flow and aura reading (playtest 1: "yes"), telegraphed foes, determinism, no dice.
- Folios, the Bench's deduction (trials, resonance, silhouettes, torn pages), Glyphs with elegance, versions and parameters.
- The two districts and their rules: the Seam, and the canals with the current, landings, the Snuffer and the lamp-mother.
- The scope rule (DESIGN §1): **systemic depth over content volume**.

## 4. Goals for the new content (*Proposal*, to confirm in the design round)

1. **Each family has its own job**, and setup is no longer most of the rune set.
2. **Several ways to cash in**, not only Spark. Different payoffs want different setups.
3. **The lattice's shape reaches the board.** Shape runes change *where* the rest of a spell lands (split targets, bounce, spread, pull), so forks and bends are spatial decisions.
4. **Triggers react to things that can fail**: enemy state, allies, the turn, terrain you didn't make, or the order of events. A trigger should not exist only to confirm your own previous rune.
5. **Bench runes do what wiring can't**: new verbs, rule-benders, new trigger conditions, delivery shapes, aura kinds. Never "A, then B". Compile stays the place for compression.
6. **The aspect grammar fits the new set** and leaves room to grow.
7. **Small**: about as many runes as now or fewer, each one sentence long.

## 5. Connected material in the repo

### 5.1 Planned and paused ideas to draw on

| Source | Idea | Where | Why it matters here |
|---|---|---|---|
| BL-51 | **Pull** (Source), **Wider**, **Bounce** (Shape), **When ally hit** (Trigger) | ROADMAP §3, DESIGN §6.3 family table | Spatial shapes (P3), a trigger on something that can fail (P4), a new delivery (P7) |
| BL-24 | Later recipes: **Arc** (flow jumps to every unit in the steam, Shape), **Coil** (auras conduct one more hop, Aura), **Bulwark** (shield that raises a plate, Source), **Ricochet** (bolt bends off brass, Shape), **Canon** (both fork branches recast next turn, Shape), **Reap** (fires when a mark is used up, Trigger) | research-and-mastery §3.3 "later recipes" | Bench results outside the Material family (P5). Several are shapes and triggers |
| BL-24 | **Lance** (piercing electric bolt) | same | Now covered by `Bolt → Pierce → Spark`, so it shows P5 |
| BL-53 | **Thunderhead** (Spark + Steam + Fog jar: a cloud that stores charge) | §3.3 | "The solvent is the steering wheel": same parents, different solvent, different rune |
| BL-20 | Ninth aspect (*Light*, *Sound*) or a retag | ROADMAP §2 | P6 |
| BL-13 | Tier-2 **aspect-keyed recipes** (`[any ◈] + [any ♨] + Chalk`), e.g. *Resonant Lens*; crystals as ingredients | §3.5, §5.3 | A Bench that works on kinds, not exact runes |
| BL-12 | **Footnotes**: two exclusive rule edits per level (Bolt: *Bloodhound* keeps travelling after a kill; Spark: *Ball lightning*; Ink: *Indelible*…) | §5.1 | Variety per rune without new runes. The new set should leave room for them |
| BL-52 | Designed, unbuilt idioms: **Chain Gang** (forking payloads), **Static Cling** (diffuse, then arc with an aura) | §4.6 | Idioms read aspect shapes, so they get retagged along with the runes |
| BL-50 | Auras that also reach diagonally | DESIGN §10b | A possible aura kind or footnote |
| BL-55 | Fire as its own element or a state; terrain decay | DESIGN §6.5, §10 | Decides whether fire is a separate payoff |
| BL-57 | Payload Glyphs score no Economy | ROADMAP §3 | A symptom of P1 and P2 |
| BL-43 | A third member with a **Steam or Brass** affinity | ROADMAP §2 | Affinity could become more than a material |
| §10b | Member signature abilities (held back "until more affinities are explored") | DESIGN §10b | Same |
| BL-30 | Rival inscribers whose chains are telegraphed | ROADMAP §2 | Enemy lattices need runes that read clearly in one glance |
| Cut | Smear as an interaction (ink + oil spreads the mark), slippery brass (cut for good), condensation on brass ("?"), walls | DESIGN §6.5, §9.5, §10b | Leftover interactions |
| Open | Does water conduct Spark? (default no) | city-and-districts §5.1 | A canal-specific payoff |
| Open | "Do triggers see same-cast effects?" (shipped as yes; the checkbox is still open) | DESIGN §6.2, §10 | **The root of P4** |
| Sketch | Later districts: ink-makers' quarter (triggers-heavy), bathhouses (Steam, rooms bigger inside), brass bridges, rooftops, a guild archive (rivals) | city-and-districts §6 | Each district's solvents and runes belong to this rework |
| Unused | 5 of 8 solvents never drop: Chalk, Quicksilver, Fog jar, Rivet, Wax | aspects.ts, loot.ts | Room for the new Bench content per district |

### 5.2 The current content (what we'd swap)

| Family | Runes (origin) | Drops |
|---|---|---|
| Source (4) | Bolt, Splash, Ward (loot), Quill (Bench) | start: Bolt ×2, Ward; deep: Splash, Bolt, Ward |
| Material (13) | Ink, Oil, Spark, Steam, Brass (loot); Smear, Torch, Fog, Mist, Brand, Scald, Etch, Kiln (Bench) | start: Ink ×2, Oil, Spark ×2; shallow: all five |
| Shape (3) | Bend, Fork, Pierce (loot) | start: Bend ×2, Fork; shallow: Pierce |
| Trigger (3) | On Inked, On Kill, On Ignite (loot) | deep and heart |
| Aura (3) | Amplify, Echo, Thrift (loot) | deep and heart |

Interactions in the codex (10): ignite, conduct, arc, detonate, extinguish, slide, diffuse, heat, stain, drift. Idioms (3): Cashing In, Bonfire, Undertaker. Recipes: 9. Solvents dropping: Gallnut, Pitch, Cinder.

### 5.3 What a swap touches

- **Data:** `runes.ts`, `recipes.ts`, `aspects.ts`, `idioms.ts`, `loot.ts` (tables and the start collection), `members.ts` (affinities and starting lattices), `codex.ts` (hints), `scenarios.ts` (28 Lab scenarios), `folios/*` (all five folios are built from current runes and have designed regressions), `drafts.ts`.
- **Engine:** `cast.ts` handles each Material and Trigger in its own `case`; `materials.ts`, `lattice.ts` (Fork and Bend), `notation.ts` (tokens), `cluster.ts`, `glyph.ts`, `profiler.ts`. `RuneId` appears in 22 engine, app and UI files.
- **UI:** spell readouts (`recipe.ts`), fx, badges and tile layers per state, the Codex.
- **Tests:** a scenario per rune, `tests/fixtures/seam-identity.json`, the folio solutions, the Bench golden tests, the recipe validity test, three save fixtures.
- **Saves:** the collection counts, Glyph insides, proof masks and folio progress all store rune ids, so a swap needs a save migration (the next version after v6) that maps or refunds old runes and Glyphs.

## 6. Questions for the design round

Questions marked *settled* were answered by the scoping rounds (§7).

1. **Scope:** keep the five materials as board terrain and redesign only the runes, or rework the materials too? (*Leaning*: keep them; new terrain comes with districts.)
2. **Payoffs:** which verbs should cash in besides Spark (displacement, drowning in the current, crushing against plates, spreading, consuming a state for something other than damage)?
3. **Triggers:** *mostly settled*. Rivals' chains must be breakable and apprentices feed each other, so triggers watch the board. Still open: does a trigger also see what the same cast did?
4. **Shape:** should Fork really split targets (left and right on the board), and should Bend steer the spell's path on the board?
5. **Bench:** what may a Bench rune be? Only new rules (no sums), any family, aspect-keyed recipes? Cross-school parents?
6. **Members:** *settled*. An affinity becomes a school lean.
7. **The swap:** replace everything in one go, or keep the five basics and swap the rest?
8. **Grammar:** do schools replace aspects as the Bench's grammar, sit beside them, or get folded into them?
9. **Count:** how many runes per school, and how many basics in the Seam?

## 7. What the scoping rounds fixed (2026-10-18)

Three scoping rounds (decisions in [city-and-districts.md](city-and-districts.md) §0a, [rivals.md](rivals.md) §0, [party.md](party.md) §0) set the frame the runes must fit:

| Decision | What it asks of the runes |
|---|---|
| **Districts are guild schools** (runes, solvents, idioms), **a school is a verb**, about 5–6 districts | Every rune belongs to a school (the Seam's basics, or a guild). Schools are habits across materials (timing, conditions, areas, structure, rewriting), not materials. The canals' Lamplighters need a school retrofitted. Solvents come per district |
| **Districts add new terrain**, and generic runes find new uses there | Runes are verbs (push, spread, delay, copy, consume) that do something on terrain that doesn't exist yet. A rune written only for oil ages badly |
| **Idioms are guild signatures**, learned in the district and cast by rivals | Idioms move to the schools. They must be readable as a style when an enemy casts them |
| **Rivals use the same runes plus one trick; you break their chains** | Every rune must work in an AI's hands, be telegraphable in one line, and be **counterable**. Triggers that watch the board can be starved, while triggers that confirm their own cast can't, so the P4 fix is required |
| **Beating a rival gives a page of their lattice** | Folios gain a second source besides the owner's drafts. Their contents come from the guild's school |
| **Apprentices lean on schools, have a habit and a body** | A rune needs a school tag for the lean. Rules must be plain enough for a habit to bend ("forks split three ways"). Personal basic actions (pull, swap, hop) are displacement verbs runes can build on |
| **Party of 3, one feeds the other, casting order is the combo** | Runes should leave things for the *next* caster (states, armed triggers, set-ups that pay off in someone else's chain this turn). Combos run across casts, not only within one flow |
| **No lattice shapes; ink is the only limit** | Geometry still matters through forks, bends and aura placement, but not through member shape. A Glyph's space saving no longer matters, only ink, so Compile's value rests on ink, elegance and parameters. Watch the revision canvas cap (BL-88) |
| **Seven districts, seven schools** (Seam basics, timing, contracts, areas, structure, resonance, the board itself) | The rune set is organised by these schools. Shapes, triggers and auras are spread across them, not stacked in one family |
| **No fixed order after the canals** | Each guild school must work with the **Seam basics plus timing** alone, never needing another middle guild's runes. Cross-school combos are a bonus, not a requirement |
| **Spark has no district** (leans: oil, ink, steam, brass, height, paper) | Spark stays a Seam basic and is used everywhere, so it can't be the only payoff (P2) |
| **The Cartographers' school is the board itself** | The late game's runes move terrain and swap places. Early basics should leave room for that rather than spend it |
| **Board about 7×9** | Ranges and footprints are re-tuned on the bigger board |
| **The notebook carries progress** | Runes, Glyphs and footnotes are the whole progression curve. Members don't level |
