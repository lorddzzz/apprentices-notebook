# The Apprentice's Notebook — Design Doc

> Working title. Living document: updated after every design round and playtest.
> Last updated: 2026-10-12 (after discovery rounds 1–12). **v0 design complete.**
>
> Legend: **Decided** = player chose it · *Proposal* = Claude's suggestion, awaiting the player's reaction · *Open* = not discussed yet

## 1. Project frame

- A personal game, made by two collaborators (the player and Claude). It will never be published.
- It must cost nothing to build, host, or play.
- **Process:** discovery questions → design doc → prototype v0 → play → feedback → iterate and extend.
- **Scope rule:** systemic depth over content volume. A few pieces that combine in many ways beat lots of content.
- Nothing here is a hard limit. Any decision can be revisited.

## 2. Player profile (what this game is for)

| Signal | What it means for design |
|---|---|
| Absorbed by RPG character building: unlocks, combining effects, maxing synergies | The build is the core of the game. Everything else serves it. |
| Payoff = chain reactions + discovering hidden combos | Effects must trigger other effects. Combinations should be emergent, not hand-authored. |
| Pulled forward by locked doors / `???` slots | Make the unknown visible. Show silhouettes of what can still be found. |
| Turn-based, evening sessions (1–2h) | Room for depth and thinking time. No reflex demands. |
| Losing is fine if it was fair and readable | Telegraph danger. Death = a planning mistake, never bad luck. |
| Clear rules, surprising results | Each piece is simple and fully explained. The surprise comes from how pieces combine. |
| Wants to be the inscriber of runes | Magic is built like code: you write and link runes. |
| Cozy workshop / tiny room | Home base is an intimate, cluttered study. |
| References: Path of Exile / Diablo, Darkest Dungeon / Into the Breach, Noita / Magicka | PoE: linked modifiers and a deep tree. ItB: telegraphed grid tactics. DD: small party and expeditions. Noita: systemic spellcraft. |
| Self-described as indecisive on fine-grained mechanics | Claude proposes a default with reasoning. Prototype and play to decide. Don't block on choices. |

## 3. Pitch

You inherit a cluttered arcane study and the half-finished notebook of its previous owner. You and your small party of apprentices are **rune inscribers**. You write your power into **rune lattices**, venture out from your rented attic into **a rain-soaked city of rival inscriber guilds**, and fight turn-based battles where oil, steam, spark, brass and ink react to each other. You bring back fragments, knowledge, and mastery, and rewrite your lattices again.

## 4. Core loop

```
        ┌──────────────── THE STUDY (home) ────────────────┐
        │  rewire lattices (ink budget)                    │
        │  research new runes at the desk                  │
        │  read / fill the codex                           │
        │  heal, restore spell charges                     │
        └───────────────┬──────────────────────▲───────────┘
                        │ venture out          │ return (keep loot)
                        ▼                      │
        ┌──────────── EXPEDITION (the city) ───┴───────────┐
        │  encounter → choose: push deeper or go home      │
        │  HP and spell charges carry over (attrition)     │
        │  rare safe spots: rewire in the field            │
        │  party wipe → lose this trip's loot only         │
        └──────────────────────────────────────────────────┘
```

## 5. Pillars

1. **Build like code.** Runes are small, honest rules. Wiring them makes programs that do surprising things.
2. **Fair danger.** Enemies show their intent. When you lose, you can see why.
3. **The world reacts.** Materials and terrain interact, so a chain reaction plays out on the map, not just in the numbers.
4. **The unknown is visible.** `???` entries in the codex and empty sockets keep pulling you forward.
5. **Home is cozy.** The study is a calm place to tinker between dangerous trips.

## 6. Systems

### 6.1 Party
- **Decided:** a small party. Each member has their **own lattice**. Prototype v0 has **2 members**.
- **Decided:** members differ by **material affinity** (cheaper or stronger with one material) and by **lattice shape** (a different socket layout). Each role is explained through **lore and personality**, not classic RPG classes.
- **Decided (v0 pair):**
  - **The Draughtsman.** Ink affinity. A wide, shallow lattice (many short paths), so it's good at marking, setup, and support triggers.
  - **The Stoker.** Spark/Oil affinity. A long, narrow lattice (few, long chains), so it's good at big cascading payoffs.
- *Open:* max party size, recruitment, permanent death (likely no).

### 6.2 Rune lattice
- **Decided:** each character's lattice is a **small grid** of sockets. The member's shape determines which cells exist.
- **Decided:** rewiring is free and unlimited in the study, and possible at **rare safe spots** during an expedition.
- **Decided:** **ink is a build budget only.** Each inscribed rune costs ink, and capacity grows slowly. Ink is *not* spent in combat.
- **Decided (hypothesis, test in v0): hybrid reading.**
  - **Flow:** *source* runes (the spells) emit energy that flows into adjacent runes. The path it travels is the spell's chain, and forks split the spell.
  - **Auras:** one rune family doesn't sit on the path. Instead it buffs **every path it touches**, so one well-placed aura can power two spells. This creates the placement puzzle.
- **Decided: flow rules v0** (hypothesis, test by playing):
  1. A **Source** rune has an arrow and can be rotated. When cast, energy leaves through the arrow into the neighboring cell.
  2. Energy travels **straight**. Each rune it enters applies its effect and passes the energy on in the same direction.
  3. **Shape** runes can redirect: *Bend* turns 90°, and *Fork* splits left and right (both branches continue).
  4. Flow **stops** at an empty socket, the lattice edge, or a cell already visited this cast, so there are no infinite loops.
  5. A **Trigger** on the path makes everything *after* it conditional. "On hit inked → Spark → Fork" fires only if the spell hit an inked target.
  6. **Auras** are insulators. Energy never enters them, but they modify every path cell orthogonally adjacent to them.
  7. Reading order is shown visually, so you can always trace what a spell will do. A preview panel describes the resulting spell in plain words.
- *Example:*
  ```
    [Amplify]   .       .         .         .
    [BOLT>]   [Ink]   [Fork]      .         .
      .         .     [Bend→]  [OnInked]  [Spark]
  ```
  BOLT fires right → Ink → Fork. Fork splits: the up branch hits an empty cell and stops. The down branch hits Bend, turns right → OnInked → Spark, which fires only if the target is inked. Amplify touches BOLT, so it boosts it.
  Result: *"Ink bolt. If the target is inked, it also sparks (detonating the mark)."*
- *Open (answer by playing):* do triggers see effects applied earlier in the same cast? If yes, Ink → … → On Inked always fires, which is a deliberate self-combo worth discovering. If no, you need a setup turn first.
- **Starting values (tune by playing):** lattice sizes: the Draughtsman is wide (about 5×3) and the Stoker is tall (about 3×6), both with a few missing cells to give each shape character.
- **Decided:** ink capacity grows through **ink reserves** found as loot.

### 6.3 Runes
- **Decided:** each rune follows one simple, fully documented rule.
- **Decided:** in combat the lattice gives you **spells (cast chains) plus triggers that hook onto them and onto events.** Casting is the "program start", and triggers make it ripple outward.
- **Decided: rune families** (examples are still drafts):

| Family | Role | Examples (draft) |
|---|---|---|
| **Source** | A castable spell. The start of a flow. | Bolt (line), Splash (area), Ward (self/ally), Pull |
| **Material** | Gives the flow a material | Spark, Oil, Steam, Brass, Ink |
| **Shape** | Changes how it travels or lands | Pierce, Fork, Wider, Bounce |
| **Trigger** | "When X → continue flow" | On hit inked, On kill, On ignite, When ally hit |
| **Aura** | Buffs all touching paths (not on a path) | Amplify, Echo, Thrift (+1 charge) |

- **Decided:** runes come from **expedition loot**, **desk research** (combine known runes), and **mastery** (frequently used runes evolve or branch). v0 covers loot only.

### 6.3b Loot (besides runes)
- **Decided:** **ink reserves** (permanently raise ink capacity, which answers how ink grows) and **research materials** (reagents consumed at the desk to derive new runes).
- Not chosen for now: lattice sockets as loot, notebook pages as loot.

### 6.4 Combat (expeditions)
- **Decided:** turn-based, on a grid, with Into the Breach's readability.
- **Decided:** each party member gets **move + 1 cast** per turn.
- **Decided:** enemies **telegraph** their next action.
- **Decided:** **HP and spell charges carry over** between encounters within a trip. Both are restored at home. This is the push-or-return tension.
- **Decided:** after each encounter, choose to **push deeper** (better loot, more danger) or **return home**. A party wipe loses this trip's loot only.
- **Decided:** enemies have **material traits** that make them pieces in your chains (brass = conducts, oil-soaked = flammable, …). Start **simple** and keep the complexity on the player's side.
- **Decided:** turn order is **party, then enemies**. All members act in any order, then enemies execute their telegraphed moves (Into the Breach-style).
- **Decided:** combat grid is **6 wide × 8 tall** (fits portrait).
- **Decided:** each Source spell has **2–3 charges per trip**. Each member also has an **uncharged basic action** (Shove: push an adjacent unit 1 tile), so you're never stuck with nothing, and pushing units into oil and steam is a useful tactic.

### 6.5 Materials & terrain
- **Decided:** the materials palette is workshop stuff: **Ink, Oil, Steam, Spark, Brass**.
- **Decided: interaction matrix** (starting draft, to be tuned by play):

| | on **Oil** | on **Steam** | on **Brass** | on **Ink** |
|---|---|---|---|---|
| **Spark** | ignites → **Fire** (spreads along connected oil) | arcs to everything inside the cloud | conducts along connected brass | ignites the mark: burst damage, mark consumed |
| **Fire** | spreads | is extinguished; makes more steam | heats brass → scalds adjacent | burns away the mark (same as Spark) |
| **Steam** | — | — | condensation makes brass slippery? | diffuses ink: marks everyone in the cloud |
| **Oil** | — | — | coats brass: slick | ink + oil = **smear**, mark spreads to neighbors |

  - **Ink** = a *mark*. Inked targets are what many triggers look for ("On hit inked …").
  - **Steam** = a cloud that blocks line of sight and conducts Spark.
  - **Brass** = solid terrain and constructs. It conducts.
  - **Oil** = slick tiles (pushed units slide) and fuel.
- *Open:* the final matrix, whether Fire counts as its own element or a state, and whether terrain decays over turns.

### 6.6 The codex (notebook)
- **Decided:** a must-have. It fills in as you discover runes and interactions, and undiscovered entries appear as `???`.
- **Decided:** the codex **is** the previous owner's notebook. Some entries are already written in their hand, half-finished or cryptic. Your discoveries complete them, which ties the codex to the mystery for free.
- *Open:* automatic vs. player-written entries, and hints for `???`.

### 6.7 Setting & mystery
- **Decided:** **the city of guilds.** The study is a rented attic in a big, old, rain-soaked city of rival inscriber guilds. Expeditions go **out**: oil-lit canals, brass bridges, steam baths, the ink-makers' quarter, rooftops, forbidden guild archives.
  - Districts are regions, and each favors a material (ink-makers' quarter = Ink, canals = Oil, bathhouses = Steam, …).
  - "Deeper" means farther from home, into parts of the city that shouldn't exist.
  - Mystery seed: the owner was expelled from a guild. Why?
- **Rejected:** *the Works* (an underground workshop). It felt too underground and confined. The player wants to go *out*, with sky, scale, and variety.
- Reserve ideas: the notebook-pages world, the wandering study, the ink sea.
- **Decided: guilds are rivals *and* sources of knowledge.** Each guild specializes in a material and guards its secrets. Their wardens and constructs are some of your enemies, and their archives and workshops hold runes and research materials.
- **Decided: map = a district map with paths.** The city map shows districts. Each district is a short chain of encounters leading toward its heart (push or return after each one). New districts unlock over time, and locked districts show as `???`.
- **Decided: tone = weird and uncanny.** A city that's slightly wrong: streets that don't stay put, guilds doing strange things to reality, and the further from home, the stranger it gets.
- **Decided: enemies:**
  - **Guild constructs:** brass sentries, steam golems, ink familiars.
  - **Mutated city vermin:** canal eels, oil-rats, bathhouse slugs, warped by spilled magic.
  - **Rival inscribers:** people with lattices of their own. They are the hardest and most interesting foes. Probably post-v0, but a great late goal: fights where *their* chains are telegraphed too.
- Lore stays low priority until the core is fun.

## 7. Presentation

- **Visual style:** clean minimal shapes and icons, possibly with an ink-and-parchment notebook feel.
- No art pipeline is needed for the prototype. Shapes, glyphs, and color carry the information.
- **Decided:** **portrait phone** is the primary layout (one-handed, couch). The grid goes on top and the controls below. iPad and desktop should also work.
- Audio: *open*.

## 8. Tech (high level only)

> The player wants technical decisions handled in a **separate decision-making process**. This doc only records high-level constraints.

- Plays on **iPhone (portrait) first**, plus iPad, Mac, and Windows. A web app / PWA is the current lean.
- **Free** to build, host, and play.
- Optimized for **fast iteration** between Claude and the player, who codes.
- Rules and data (runes, materials, interactions) should be separate from presentation, so mechanics can be tuned and swapped cheaply.
- Saves are local for now.
- Stack, rendering, architecture, and deploy: **decided in [TECH.md](TECH.md).**

## 9. Prototype v0: intended scope (draft)

The goal is to prove that **lattice wiring + material chain reactions on a telegraphed grid** is fun. Nothing else.

- 2 party members (Draughtsman + Stoker), each with a small, differently shaped lattice
- About 14 runes across the five families (see §9.1)
- The 5 materials and a reduced interaction matrix
- 2–3 enemy types with telegraphed intents and simple material traits
- 1 district (**a mixed borderland**, see §9.2) of a few encounters with a push-or-return choice. HP and charges carry over.
- Minimal study screen: edit lattices, show the ink budget
- Codex: a simple list with `???`
- Portrait phone layout
- Out of scope for v0: mystery/lore text, desk research, mastery, art, **audio (decided: none)**, rival inscribers, district map, meta-progression balance, field rewiring

### 9.1 v0 rune set (**decided**)

| Family | Rune | Rule (draft) |
|---|---|---|
| Source | **Bolt** | Fires in a line; hits the first unit. |
| Source | **Splash** | Hits a 3×3 area within range 3. |
| Source | **Ward** | Shields self or an adjacent ally. A shield being hit counts as an event for triggers. |
| Material | **Ink** | Marks the target (inked). |
| Material | **Oil** | Coats target tile(s) with oil. |
| Material | **Spark** | Electric damage. Ignites oil, conducts through brass/steam, detonates ink marks. |
| Material | **Steam** | Creates a steam cloud on target tile(s). |
| Material | **Brass** | Raises a brass plate (blocks movement, conducts). |
| Shape | **Bend** | Turns the flow 90° (rotatable). |
| Shape | **Fork** | Splits the flow left and right. |
| Trigger | **On Inked** | Rest of path fires only if the spell hit an inked target. |
| Trigger | **On Kill** | Rest of path fires only if the spell killed something; it originates at the victim's tile. |
| Aura | **Amplify** | Touching path cells: +1 effect magnitude. |
| Aura | **Echo** | Touching Source: the spell repeats once at half strength next turn. |

Cut candidates if it's too much: Splash, Echo. Next additions: Pierce, On Ignite, Thrift.

### 9.2 v0 district: the Seam (**decided**)

- **"The Seam":** where the canals, the ink-makers' quarter, and the bathhouses grind into each other wrongly. Streets overlap, and a canal runs uphill into a steam vent. That is weird and uncanny, and it puts every material on one map.
- **v0 enemies** (simple, with material traits):
  - **Oil-rat:** weak, comes in packs, oil-soaked (flammable), and leaves oil where it walks.
  - **Brass sentry:** sturdy, makes a telegraphed line attack, and conducts Spark to adjacent brass.
  - **Ink familiar:** fragile and inks tiles near it. It's dangerous to *you* and useful to your triggers.
- **Run:** about 3–5 encounters. After each one, push on or go home. The last encounter is a tougher "heart of the Seam" fight.

### 9.3 v0 study screen (**decided**)

A **workbench with a sense of place**: the same tools as a plain editor, framed as a desk in the attic and drawn with minimal shapes.

```
  rain ╲╲╲   ┌─window─┐   lamp ◯
             └────────┘
┌─ desk ──────────────────────┐
│ open notebook page =        │
│   the lattice editor        │
│ ink pot = ink meter         │
│ shelf = rune collection     │
└─────────────────────────────┘
 door → "Set out into the city"
```

- Party switch: tabs or bookmarks on the notebook (Draughtsman / Stoker).
- The spell preview shows each source's resulting spell in plain words.
- Codex: the notebook's back pages (a list with `???`).
- The door leads to the Seam (no city map in v0).

### 9.4 Names (**decided: placeholders**)

Working titles until names emerge from play: *The Apprentice's Notebook* (game), *the Draughtsman* / *the Stoker* (apprentices), *the city* / *the Seam*.

### 9.5 v0 rule defaults (*Proposal*: Claude's defaults, tune by playing)

The doc leaves these details open, so v0 picks a default for each. Every number lives in `src/data/`.

**Lattice reading**
- A socket holds at most one rune. **Source** and **Bend** have an absolute arrow (rotate by tapping). Energy entering a Bend leaves through its arrow; if the arrow points back the way it came, the flow stops.
- **Fork** splits relative to the travel direction: the left branch resolves first, then the right.
- Each Source in a lattice is one castable spell. Paths of different sources may share runes, because the rule against revisiting a cell applies per cast.
- **Amplify** gives +1 magnitude to each path cell it touches, and stacks if several touch. If it touches the Source, the base effect gets +1.
- **Echo** only counts when it touches the Source cell. The spell then recasts at the start of the caster's next turn at half magnitude (rounded down, min 1), with the same aim.
- **Triggers see same-cast effects (decided default: yes).** The path resolves step by step, so `Ink → On Inked → Spark` always fires. It's a self-combo worth discovering.
- **On Kill** passes if the cast has killed anything so far, including through chain reactions. The rest of the path then re-targets to each victim's tile and its 4 orthogonal neighbors (a small burst), once per victim.
- Resolution is deterministic: depth-first along the path, Fork left before right. Within a step, targets resolve in reading order (top row first, then left to right). Chain reactions (fire spread, conduction, arcs) resolve fully before the next step.

**Sources and magnitudes**
- **Bolt:** aimed in one of 4 directions. It travels until it reaches a unit, a brass plate, a steam tile or the edge, and hits that tile. 2 damage.
- **Splash:** a target tile within range 3 (Chebyshev). Deals 1 damage to every unit in the 3×3 area, and later runes apply to all 9 tiles. **Friendly fire is on.**
- **Ward:** targets self or an orthogonally adjacent ally. Gives a shield of 2 that absorbs damage and lasts until used up or the encounter ends. Later runes apply to the warded ally's tile (Ward → Steam = a cloak).
- **Spark** deals 1 damage. On a material tile, **Amplify** grows the footprint by one ring per +1 instead of adding magnitude. **Affinity:** +1 magnitude for the member's materials (Draughtsman: Ink, Stoker: Spark and Oil).

**Reduced interaction matrix**
- **Ink** marks a unit as inked. On a tile with no unit, it leaves an ink puddle that marks whoever ends a move there. **Inked units take +1 damage from every hit.**
- **Spark or Fire on an inked unit** detonates the mark: +2 burst damage, and the mark is consumed.
- **Oil** coats tiles. A unit pushed onto oil slides until it leaves the oil.
- **Spark on oil** ignites it. Fire spreads instantly through connected oil, deals 1 damage to each unit standing in it (+1 to oil-soaked units), burns for 2 rounds (1 damage to units ending their turn in it), then the oil is gone.
- **Spark** reaching a brass plate or a brass unit conducts through every connected brass (plates, brass sentries, brass-coated units) and hits each unit there.
- **Steam** is a cloud lasting 2 rounds. It blocks Bolts and enemy line attacks. Spark reaching steam arcs to every unit in the connected cloud, and Ink applied into steam marks everyone in the cloud. Fire touching steam is put out.
- **Brass** raises a plate on an empty tile (blocks movement, conducts). On a unit it brass-coats the unit for the encounter, so the unit conducts.
- Cut from v0: smear (ink + oil), heated brass, slippery brass.

**Turns (Into the Breach style)**
1. **Enemy phase:** each enemy moves, then telegraphs an intent relative to itself (a direction and a pattern), so shoving an enemy also moves its attack. Intents show their resolution order.
2. **Player phase:** each member gets one move (up to 3 tiles, orthogonal, not through units or plates) and one action (cast or Shove), in any order. A move can be undone until that member acts.
3. **Resolve:** intents fire in order, fire burns, steam decays, and the next round starts.
- **Shove:** pushes an adjacent unit 1 tile away. If the unit is blocked by a unit, plate or edge, both take 1 bump damage.
- **Death:** a member at 0 HP is down for the rest of the encounter, and is back at 1 HP afterward if the party wins. If everyone is down, the party wipes.

**Party, enemies and the Seam**
- **Draughtsman:** HP 6, lattice 5×3. **Stoker:** HP 8, lattice 3×6. Both have a move of 3.
- **Oil-rat:** HP 2, move 3. It chases the nearest member and bites adjacent for 1. It leaves oil on every tile it walks, and it's oil-soaked.
- **Brass sentry:** HP 5, move 1, brass. Its line attack deals 2 to the first unit in line.
- **Ink familiar:** HP 1, move 2. It spits at range 2 for 1 damage and inks its target.
- **Encounters (4):** (1) three rats. (2) two rats and a familiar. (3) a sentry, two rats and oil puddles. (4) **Heart of the Seam:** two sentries, a familiar, two rats, steam vents and brass. Each one has a hand-placed layout.
- **Charges per trip:** Bolt 3, Splash 2, Ward 2.

**Ink, collection, loot, codex**
- **Ink costs:** Source 2, Material 1, Shape 1, Trigger 2, Aura 3. Each member starts with 8 ink capacity, and an ink reserve gives +2.
- **Collection:** you own runes as counts, and you can't place more copies than you own across both lattices. **Start:** Bolt ×2, Ward, Ink ×2, Spark ×2, Oil, Bend ×2, Fork. **Starting lattices:** Draughtsman `Bolt → Ink`, Stoker `Bolt → Spark`.
- **Loot:** after each win, pick 1 of 3 offers (a rune, an ink reserve or research materials). The heart gives 2 picks, and deeper encounters offer rarer runes. Loot is banked on returning home and lost on a wipe. Research materials are only counted in v0.
- **Codex:** a rune entry shows `???` until you own the rune, and an interaction entry (ignite, conduct, arc, detonate, extinguish, slide, diffuse) shows `???` until it's first seen in a fight.
- **Saves:** between encounters only. Closing the game mid-fight restarts that encounter.

**Engine interpretations** (the engine had to pick; all tunable, judge them by playing)
- **Magnitude is per rune.** Bolt, Splash and Spark: damage. Ward: shield. Ink, Oil, Steam and Brass: footprint, so magnitude 2 covers 3×3 and 3 covers 5×5. Affinity (+1) and Amplify (+1 each) both add to it. The Draughtsman's Ink covers 3×3 and the Stoker's Spark deals 2.
- **Steam shields what stands in it.** Bolt, Line and Spit stop at a steam tile and hurt nothing there, even a unit inside. The rest of the spell still lands on that tile, so Bolt → Spark arcs and Ward → Steam is a real cloak. Bites and Splash still hit units in steam.
- **On Inked is a gate.** It passes if any target is inked at that moment, and doesn't filter targets. **On Kill** counts every death in the cast, allies included.
- **Inked +1 hits everything:** bolts, fire, bumps and enemy attacks. Only the detonation itself skips it. Spark or fire on an inked unit that survives sets off the mark.
- **Fire** spreads through connected oil but never into steam. Oil placed next to fire lights at once. Units that merely walk through don't burn.
- **Sliding** stops at the first dry tile or before a blocker, with no bump damage. A bump hurts the pushed unit and any unit it hits, not edges or plates.
- **Round 1:** enemies telegraph without moving, so the hand-placed layout is what you see. After that the AI is deterministic: no dice in combat.
- **Echo** recasts at the start of your next turn, after enemies telegraph. It costs no charge and no action, never echoes again, and fizzles if the caster is down.
- **Charges belong to each Source rune** on the lattice, not to the rune type.
- **Loot:** an ink reserve names one member and gives that member +2. The heart's 2 picks come from the same 3 offers. After the heart you must go home.
- **Wipes and the codex:** a wipe loses the trip's loot, but interactions seen in the fight stay discovered. A downed member returns at 1 HP after a win.
- **Brass plates from the rune crumble after 3 rounds; plates in a layout are permanent.** Prevents walling yourself in. (Lab/serialized boards keep a rune plate as a permanent `=`.)
- **Walls are cut from v0.** Only plates, units and the board edge block. A training dummy exists for the Lab and tests only.

## 10. Open questions (next design rounds)

**Before building v0:**
- [x] Tech decisions (separate process, see [TECH.md](TECH.md))
- [x] Project skeleton deployed to GitHub Pages and installed on the iPhone (see [TECH.md](TECH.md) §8). Next: build v0.
- [x] v0 built and deployed (2026-10-13): engine, Study, Codex, the Seam expedition, Lab. Build decisions for review: [docs/v0-build-log.md](docs/v0-build-log.md). Next: the player plays v0.

**Answer by playing v0** (no need to decide upfront):
- [ ] Hybrid flow + aura: does it feel good?
- [ ] Do triggers see same-cast effects? (§6.2)
- [ ] Lattice sizes, ink costs, charge counts, enemy numbers
- [ ] Final interaction matrix details (Fire as element or state, terrain decay)

**Post-v0:**
- [ ] Desk research, mastery, district map, guild content, rival inscribers, the mystery, audio, real names

## 11. Decision log

| Date | Decision | Why |
|---|---|---|
| 2026-10-12 | Chose seed "The Apprentice's Notebook" over grid-only and grimoire-circuit seeds | Persistent character + rewirable lattice + cozy study matched the player best |
| 2026-10-12 | Losing an expedition loses trip loot only | Player is fine with losing if it's fair, but not with losing an evening's build |
| 2026-10-12 | Ink is the lattice constraint, build budget only | Player's pick. Keeps combat resources separate. |
| 2026-10-12 | Small party, prototype with 2 | Player wants a party; 2 limits scope while testing the idea |
| 2026-10-12 | Members differ by affinity + lattice shape, framed by lore/role | Player's combination of options |
| 2026-10-12 | Lattice = spells + triggers, linked | Most expressive. Matches "chain reactions" |
| 2026-10-12 | Small-grid lattice, hybrid flow + aura reading as a v0 hypothesis | Player was torn between flow and adjacency, so we test both by playing |
| 2026-10-12 | Move + 1 cast per member per turn | Into the Breach readability |
| 2026-10-12 | HP + charges carry over, rare field rewiring | Gives push-or-return real tension |
| 2026-10-12 | Materials: Ink, Oil, Steam, Spark, Brass | Most "arcane workshop" palette |
| 2026-10-12 | Enemies: simple, with material traits | Complexity lives on the player's side |
| 2026-10-12 | Portrait phone layout | How the player pictures playing |
| 2026-10-12 | Web/PWA + TypeScript | Free, fast iteration, plays on iPhone |
| 2026-10-12 | Kept proposals: codex = owner's notebook, Draughtsman + Stoker, 5 rune families, interaction matrix | Player accepted as-is |
| 2026-10-12 | Loot: ink reserves + research materials | Player's pick; ink reserves answer how ink grows |
| 2026-10-12 | Turn order: party, then enemies | Puzzle-like readability |
| 2026-10-12 | Setting: city of rival inscriber guilds (rejected the Works) | The Works felt too underground and confined; the player wants to go out |
| 2026-10-12 | Guilds = rivals + sources of knowledge; district map with paths; weird & uncanny tone; foes = constructs, mutated vermin, rival inscribers | Player's picks |
| 2026-10-12 | Flow rules v0, 6×8 grid, 2–3 charges/trip, uncharged Shove | Player accepted the proposed defaults |
| 2026-10-12 | v0 district = a mixed borderland | Lets all interactions be tested |
| 2026-10-12 | No audio in v0 | Core first |
| 2026-10-12 | Tech decisions moved to a separate process; doc stays high level | Player's request |
| 2026-10-12 | v0 rune set (14), the Seam + 3 enemies, study = workbench with a sense of place, placeholder names | Final v0 design round |
| 2026-10-13 | v0 rule defaults (§9.5): triggers see same-cast effects, ItB-style relative intents, inked = +1 damage taken, pick-1-of-3 loot | Needed to build v0. Proposals to be judged by playing. |
| 2026-10-13 | Engine interpretations (§9.5): magnitude per rune (footprints, 3×3 Ink), steam shields occupants from projectiles, On Inked is a gate, inked +1 on every hit, wipes keep codex finds | The engine needed exact rules where §9.5 was silent. Judge by playing; numbers live in `src/data/`. |
| 2026-10-13 | Rune-raised brass plates crumble after 3 rounds; layout plates are permanent | The fuzz bots found a member walling itself in (plates block movement and Bolts, rats wait forever). Duration is `TUNING.plateRounds`. |
| 2026-10-13 | Battle controls (*Proposal*): tap a member for reach dots; a spell tints its aims (Bolt: any tile in a line aims that way); a spell with one legal aim previews at once; tap the aim again or Confirm; Cancel steps back one level; tapping an enemy or tile reads it out while the member stays selected | Into the Breach clarity with one thumb; the caption always says what the next tap does |
| 2026-10-13 | Full outcome previews also outline every tile whose materials change and name plain effects (ink pools, steam rises); interaction names stay `???` until discovered (the Lab names them all) | You see the whole chain before committing, without the codex being spoiled |
| 2026-10-13 | Attacks that steam or a plate will stop are drawn dashed with no danger hatch; a member's "!" follows the pending preview (a shove or Ward can clear it) | The danger overlay must say who actually gets hit |
| 2026-10-13 | End turn asks for a second tap only while someone could still cast, and stays armed until any other input (no timeout) | Prevents throwing away a cast without a timer racing the player |
| 2026-10-13 | Study (*Proposal*): an attic desk. Rainy window and a hanging lamp above, the notebook page (lattice editor) on the desk with the members as bookmarks, the ink pot beside them, the rune shelf below, and the door ("Set out into the city") at the bottom, shut until expeditions arrive | §9.3 as a place, not a form. Everything fits one phone screen with no scrolling |
| 2026-10-13 | Editing a lattice is tap-only (*Proposal*): pick a rune from the shelf then tap a socket; it stays in hand while copies remain; tap a placed arrow rune to turn it; hold a rune (or use Erase) to lift it; another shelf rune on an occupied socket swaps if the ink allows | One thumb, no drag. Judge by playing |
| 2026-10-13 | The shelf shows all 14 runes; ones you don't own are `???` and say "Not found yet" when tapped | Pillar 4: the empty slots show there is more to find |
| 2026-10-13 | Codex: unknown entries are a bare `???` with a dashed outline and no hint; known ones show the rule plus the previous owner's note in handwriting; header counts `7 / 21 known` | Hints for `???` stay an open question (§10) |
| 2026-10-13 | Save backup is copy/paste text in the Study menu; a save the game can't read is kept aside and replaced by a new notebook with a warning | iOS can clear site data, and a bad save should never be silently lost |
| 2026-10-13 | Expedition screens (*Proposal*): the door asks "Set out?" and lists what each member carries; after a win, Loot (pick 1 of 3, the heart gives 2) then the Crossroads, which shows HP and charges left and what is carried, with Push on / Return home and a link to the notebook; the heart ends in Cleared (return only); a wipe shows what was lost (struck through) and what the notebook kept | The push-or-return tension needs HP, charges and pending finds on one screen. Judge by playing |
| 2026-10-13 | A first interaction seen in a trip battle toasts "New in the notebook: <name>" once; a reload mid-fight restarts that encounter with the trip's HP and charges as they were at its start | Closing the app can't be used to undo a bad fight or to bank discoveries |
| 2026-10-13 | Polish (*Proposal*): the selected Study bookmark is the filled, taller tab joined to the page, the other is a muted outline with a small member-colour dot; only the action in use (one spell or Shove) is lit in battle; the end-turn warning names only members with a usable spell and a legal aim; research loot reads "Reagents for the desk. Research arrives in a later version." | A selected state must be unmistakable, and a warning that cries wolf teaches the player to ignore it |
| 2026-10-13 | Lab tools (*Proposal*): a Play / Board / Lattices switch under the scenario picker. Board paints one palette item per tap (units replace units, a second tap removes; ! and & toggle on a unit; fire sits on oil; a plate stands alone; the eraser clears), Lattices has unlimited ink and runes (shelf and pot show ∞), and the ⋯ sheet offers Play demo, Reset, Undo last action (casts, moves and edits alike), Copy board, Copy lattices and Copy as scenario (a block to paste into `src/data/scenarios.ts`; if the clipboard is blocked the text appears in a sheet to copy by hand). `#/lab?scenario=<id>&demo=1` plays the demo on arrival | The workshop is where discoveries get made and kept as regression tests; nothing in it touches the notebook |
| 2026-10-13 | Code review (*Proposal*): only a second tap on the same tile confirms a spell (tapping further along a Bolt's line re-previews instead of firing); a cast or shove by anyone ends every pending move undo; a reload mid-fight resumes it, and a wipe can no longer be escaped by reloading | Tapping an enemy to read it fired a Bolt (build log #28); undo after another member's action could rewrite the board (a used ink puddle came back); reloading made losing free |
