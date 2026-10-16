# The Apprentice's Notebook — Design Doc

> Working title. Living document: updated after every design round and playtest.
> Last updated: 2026-10-13 (research + mastery decided). **v0 design complete.**
>
> **Feature docs:** a feature too big for one section gets its own file in [docs/design/](docs/design/README.md). This doc keeps its summary and a link, and the decision log (§11) stays here. Current: [Research and Mastery](docs/design/research-and-mastery.md) (§6.3).
>
> **What's next:** [docs/ROADMAP.md](docs/ROADMAP.md) holds the backlog, roadmap tracks and parked ideas (§10b here is the older, shorter list).
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
- **Decided (2026-10-13): research and mastery follow "The Scholar's Press".** Full design: **[docs/design/research-and-mastery.md](docs/design/research-and-mastery.md)**. Implementation: [docs/plans/research-and-mastery-plan.md](docs/plans/research-and-mastery-plan.md). The shape:
  - **Aspects** are the shared grammar: 8 properties (Reach, Mark, Slick, Heat, Charge, Vapor, Hold, Return). Every rune has two, **read off what its rule does**, and every pair is unique.
  - **Distil (the Bench):** two known runes plus a **solvent** (research loot, one aspect each) make a new rune. Trials are free and play the real reaction. The answer is a **total-only resonance** (x / 6) plus one margin line, so you deduce it rather than look it up. Committing costs the solvent; the parents are kept. Undiscovered recipes show silhouettes, and some are torn pages in the owner's hand.
  - **Compile (the Fair Copy):** a lattice pattern that has resolved 5 times **in expeditions** (not the Lab) can be compressed into a **Glyph**: one socket, cheaper in ink, optionally with parameters, refactorable in versions. **Outer auras reach every inner rune**, at +1 ink per touching aura. Proof survives a wipe.
  - **Mastery:** atoms earn **footnotes** (witnessed outcomes unlock a choice of two small rule edits), and Glyphs earn **elegance** (Economy and Reliability tiers, shown in a profiler).
  - **Crystallise:** a polished Glyph becomes a new atom with its own aspects, which can feed the Bench again. **Permanent**: the Glyph is gone for good.
  - **First playable slice: Bench + Compile together** (six Seam recipes, three Seam solvents, Glyphs without parameters), **built 2026-10-13**.
  - **Stages C, D, G built 2026-10-16:** a profiler and elegance tiers (harm a cast per ink, share of casts that did something; best 10-cast form, kept), revisions with versions, Glyph parameters (open cells filled at placement), the extra exit at Reliability silver, and the owner's drafts repaired at the desk. Footnotes and crystals follow.
- **Decided (2026-10-14): three loot runes** (the parked "next runes"; plan: [seam-deepening-plan.md](docs/plans/seam-deepening-plan.md)):
  - **Pierce** (Shape, ☍ Reach · ϟ Charge): a projectile passes through the first unit and stops at the second. Both get the rest of the flow, the first one first. Steam and plates still stop it, and it does nothing on area or self spells.
  - **On Ignite** (Trigger, ♨ Heat · ⟳ Return): passes if this cast has lit oil so far. The rest of the flow lands **on every tile that just caught fire**, not on the cast's targets, so Spark → Oil → On Ignite → Ink marks everyone in the blaze.
  - **Thrift** (Aura, ϟ Charge · ⟳ Return): +1 charge per trip to every spell it touches.
- **Decided (2026-10-14): three more Seam recipes:** **Scald** (Spark + Steam + Cinder, ♨ ☁: a cloud that burns everyone inside each round), **Etch** (Ink + Brass + Gallnut, ◈ ϟ: a mark etched into brass; spark conducting through it sets off marks on everything it reaches), **Kiln** (Brass + Spark + Cinder, ♨ ▣: a plate that arrives already hot). Effects are drafts, see the [feature doc](docs/design/research-and-mastery.md) §3.3.

### 6.3b Loot (besides runes)
- **Decided:** **ink reserves** (permanently raise ink capacity, which answers how ink grows) and **research materials** (reagents consumed at the desk to derive new runes). Research materials become typed: **solvents** (one per aspect), **vellum** (for compiling) and **mercury** (for crystallising) (§6.3).
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
- **Decided:** each Source spell has **3–5 charges per trip** (raised in v0.1, see §9.5). Each member also has an **uncharged basic action** (Shove: push an adjacent unit 1 tile), so you're never stuck with nothing, and pushing units into oil and steam is a useful tactic.
- **Decided (2026-10-14): field rewiring is a rare loot offer**, "a quiet doorway". Taking it costs that pick and opens the notebook right away, with your banked collection. The player chose this over a once-per-trip Crossroads action: rewiring should be a find, not a routine.
- **Decided (2026-10-14): alternate layouts.** Each depth of a district has several hand-placed layouts. The trip's seed draws one per depth, and the Crossroads names the next fight ("the flooded stair"), so you push on knowing a little.
- **Decided (2026-10-14): the trip page.** Back home, a page sums up the trip: two or three highlights at the top (the biggest chain, first discoveries, a pattern nearly proven) and a folded ledger below (casts, damage and proof per spell).

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
- **Decided (2026-10-14): heated brass.** Fire next to a brass plate or brass unit heats it. Hot brass scalds every orthogonally adjacent unit for 1 at the end of the round, and cools after 2 rounds. **Slippery brass is cut**: plates can't be walked on, so it has nothing to act on.
- **Decided (2026-10-14): stained oil** (the board's version of smear). Ink landing on oil stains the puddle, and a unit that ends its move in stained oil is inked. It's a trap you lay. The spreading mark stays the Bench rune *Smear*. Fire burns the stain away along with the oil.
- *Open:* the final matrix, whether Fire counts as its own element or a state, and whether terrain decays over turns.

### 6.6 The codex (notebook)
- **Decided:** a must-have. It fills in as you discover runes and interactions, and undiscovered entries appear as `???`.
- **Decided:** the codex **is** the previous owner's notebook. Some entries are already written in their hand, half-finished or cryptic. Your discoveries complete them, which ties the codex to the mystery for free.
- **Decided (2026-10-14): hints for `???`.** Every unknown entry carries one half-legible line in the owner's hand that hints without naming anything ("the black water does not like the kettle…").
- *Open:* automatic vs. player-written entries.

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
- The notebook page (the lattice) is the centrepiece and takes all the height the rest leaves. Under it, one compact strip shows the focused spell in plain words (or the rune in hand). Tap the strip to read every spell step by step in a sheet.
- The shelf leads with Erase, shows only runes you own, and scrolls past two rows. In Fair copy mode, the selection panel takes the shelf's place.
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
- **Charges per trip:** Bolt 5, Splash 3, Ward 3 (v0.1; was 3/2/2, which ran low after the second fight). *Tune by playing.*

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

**v0.1 legibility (decided 2026-10-13, from the first playtest):** the player could not tell how runes in one spell connect, how spark meets brass and steam, or what makes a unit special. The rules stay as they are; the game shows them.
- [x] **Recipe:** the Study numbers every path rune in resolution order and writes the spell out as steps, naming the reactions it causes ("② Spark hits it → the oil ignites: fire"). Unknown interactions stay unnamed until discovered.
- [x] **Fork:** keeps its meaning (both branches act on the same targets, left finishes first). The lattice shows the order on the branches (①/②), so it is never hidden. Since "left" is relative to the flow (it can be the right-hand side on screen), the recipe says "follow the numbers" instead of naming sides.
- [x] **Unit traits:** the tap readout spells out each trait with its effect ("oil-soaked (fire +1)", "leaves an oil trail", "brass (conducts spark)", "its spit inks"), oil-soaked units carry an oil-drop badge (brass units already look brass), and the party strip shows each member's affinity ("spark·oil+1").
- [x] **Charges** loosened to Bolt 5, Splash 3, Ward 3.

**Answer by playing v0** (no need to decide upfront):
- [x] Hybrid flow + aura: does it feel good? **Yes** (playtest 1). Upgraded auras could later reach diagonally too (§10b).
- [ ] Do triggers see same-cast effects? (§6.2)
- [ ] Lattice sizes, ink costs, charge counts, enemy numbers
- [ ] Final interaction matrix details (Fire as element or state, terrain decay)

**Post-v0:**
- [x] Desk research + mastery direction: **The Scholar's Press** (decided 2026-10-13, §6.3, [feature doc](docs/design/research-and-mastery.md)).
- [x] Bench + Compile slice built (2026-10-13, [plan](docs/plans/research-and-mastery-plan.md)). Next: the player plays it (hypotheses in the feature doc §10).
- [x] **Seam deepening** (decided and built 2026-10-14, [plan](docs/plans/seam-deepening-plan.md), [build log](docs/plans/seam-deepening-status.md)): slice polish, Pierce / On Ignite / Thrift, Scald / Etch / Kiln, alternate layouts, owner's hints, the quiet doorway, heated brass, stained oil, the trip page.
- [ ] District map, guild content, rival inscribers, the mystery, audio, real names (full list in §10b)

## 10b. Parked (cut or deferred; come back to these)

Nothing here is planned yet. The next feature gets its own plan before any of it is built.

- **Rune upgrades:** auras that also reach diagonally (from playtest 1).
- **Materials and terrain cut from v0:** walls, and slippery brass (cut for good on 2026-10-14). Smear, heated brass and stained oil are in the Seam deepening plan.
- **Research directions not chosen:** fusion with rune evolution, and rune chronicles with slow projects. They were removed from the docs; git history has them at `86e1b25`.
- **Systems:** the district map, guild content, rival inscribers (their chains telegraphed too), the mystery and lore, audio, real names.
- **Members:** signature abilities beyond lattice, affinity and HP. Held back until more affinities are explored (playtest 1).
- **Input alternatives**, if the double tap ever misfires again: Confirm-only casting, or an undo for the last cast.
- **Trip pacing alternatives**, if charges become a problem again: charges per fight, or a refill on each win.
- **Wipe penalty alternatives**, if trips become longer or costlier: keep one item on a wipe.

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
| 2026-10-13 | v0.1 legibility: numbered recipe in the Study, Fork order shown on the lattice, visible unit traits. The rules don't change | First playtest: the chain rules were invisible, not wrong. The player picked the written recipe over a live test bench, Fork as ordered steps over a spatial split, and traits on the board over Codex-only |
| 2026-10-13 | v0.1 built from playtest 1: recipe and step numbers in the Study, unit trait readouts and badges, affinity in the party strip, charges Bolt 5 / Splash 3 / Ward 3. Kept as they are: the same-tile double tap, losing all loot on a wipe, members defined by lattice and affinity only. Aura adjacency feels right | Playtest 1: the chain rules were invisible and charges ran low after fight 2. Expeditions are cheap, so a full wipe loss is fine. Explore more affinities before giving members abilities |
| 2026-10-13 | Desk research + mastery = **The Scholar's Press** (Bench deduction + Glyph compiling, footnotes + elegance, Crystallise). Design round: total-only resonance; aspects describe what a rune does (all 14 retagged); outer auras reach every inner rune of a Glyph at +1 ink each; crystals are permanent; patterns prove themselves only on expeditions; proof survives a wipe; first slice is Bench + Compile together. Kept defaults: free trials, parents kept, shared Glyphs, 8 aspects | Strongest fit for theorycrafting and "build like code", with no dice. The player leaned toward deduction and toward weight and commitment, except where learning is at stake. Auras: power with a price beat a readable but weaker rule. Full detail: [research-and-mastery.md](docs/design/research-and-mastery.md) §0 |
| 2026-10-13 | Design docs split by feature: [docs/design/](docs/design/README.md) holds one file per feature, while DESIGN.md keeps summaries, open questions and this log. Options are deleted once one is chosen | DESIGN.md was outgrowing one file, and keeping rejected options next to the decision blurs which one holds |
| 2026-10-13 | Research slice build defaults (*Proposal*, plan §1 P1–P12): a Glyph uses its inner runes from the collection (no separate copies); Fair Copy collapses into the entry socket and leaves outside runes where they are (the preview names any that disconnect); an aura that also powers outside cells, or another spell flowing through the selection, blocks the Fair Copy; every Glyph carries an arrow that is the way in; an outer Amplify adds +1 to every inner Source and Material, an outer Echo echoes a Spell Glyph, each outer aura costs +1 ink; proven cells glow, a Fair copy toggle selects the largest proven pattern and a tap on its last rune trims it; proof = the last 300 meaningful player casts per member in trip battles (not echoes, not the Lab), written win or wipe; the Bench trial is a 5×3 stage with one dummy (three for area runes); writing a known recipe again makes another copy; old research points became solvents round-robin Gallnut → Pitch → Cinder; the Bench appears with the first solvent, Fair Copy once something is proven, the first compile of each idiom is free; the shelf has Runes and Fair copies tabs | Defaults to play, not rules carved in stone. Full list and reasons: [research-and-mastery.md](docs/design/research-and-mastery.md) §0 |
| 2026-10-13 | Research slice content (*Proposal*): Quill 2 damage, 4 charges; Brand also inks, never pools, lasts the battle, +2 fire instead of oil-soaked +1 (the larger applies); Smear passes the mark one hop, allies included; Torch lights every oil tile in its footprint; Mist inks a whole touched cloud and clears it; idioms match as an ordered subsequence along one branch (`Bolt ▸ Ink ▸ On Inked ▸ Spark` is Cashing In), Undertaker = Source → On Kill → any Material; Seam loot tables carry Gallnut/Pitch/Cinder (weight 1 each) and vellum in deep and heart; margin lines for the five unwritten aspects ("too cold", "nothing to wake it", "too narrow, it wants air", "it will not stay", "it happens only once"); an aspect counts as known in the Codex once an owned rune carries it | Everything the design left as a draft got a value so the slice is playable. Tune by playing |
| 2026-10-14 | **Seam deepening** (three design rounds): Fair Copy tidies stranded runes up to the Glyph's way out; a trim that breaks an idiom says so while you trim; every `???` gets an owner's hint line; a trip page (highlights + folded ledger); Pierce hits two in a line; On Ignite lands on the new fire; Thrift +1 charge per trip; seeded alternate layouts named at the Crossroads; field rewiring as a rare loot offer ("a quiet doorway"); heated brass in, slippery brass cut; stained oil on the board; new recipes Scald, Etch, Kiln | The player took the defaults everywhere except the safe spot, where a find beat a routine Crossroads action. Small depth inside the Seam before any new district. Plan: [seam-deepening-plan.md](docs/plans/seam-deepening-plan.md) |
| 2026-10-14 | Aspect pairs for the new runes: Pierce ☍ϟ, On Ignite ♨⟳, Thrift ϟ⟳, Scald ♨☁, Etch ◈ϟ, Kiln ♨▣. Only ≋ϟ and ≋⟳ remain free | Each pair reads off the rule (Pierce drives through, Thrift returns charge). The cost: the 7 later-district recipes no longer fit in 8 aspects. Lance is covered by Bolt → Pierce → Spark; the rest get retagged, cut, or wait for a new aspect when their districts are designed |
| 2026-10-14 | Seam deepening built. Rule defaults (*Proposal*, plan §1 S1–S18; tune by playing): **Pierce**: both units take the source's damage, the first one first; runes before the Pierce act on the first unit only; a Pierce anywhere on the path counts; with no second unit the later runes land on the first unit and the landing tile. **Thrift** stacks (+1 per Thrift) and counts inside a Glyph. **On Ignite** lands on every tile any earlier step of the cast lit. **Heated brass**: heats on ignition and when cold brass sits beside fire at the burn step (no refresh every round, so a 2-round fire gives 2 scalds); hot brass scalds after fire, source "Heated brass", and doesn't detonate; a unit beside two hot sources takes 2. **Stain**: ink on unlit, un-steamed oil (also under a unit); the stain stays after being walked on; a move that ends on a stain can't be undone. Scald, Etch, Kiln: see the feature doc §0 | The player took the defaults; these are the calls the build had to make |
| 2026-10-14 | Seam deepening, run layer (*Proposal*): layouts per depth: *The lamplit landing, The drainage cut, The coal chute · The oil cellar, The scullery, The flooded stair · The sentry post, The brass gallery, The boiler alley · Heart of the Seam, The furnace hall, The old foundry*; the Crossroads reads "Deeper: The flooded stair (depth 2 of 4)", and the room's name is used everywhere after (battle header and log, "Spoils of the flooded stair", the trip page). Every depth-1 room opens with a rat beside a member, so turn 1 shows a bite coming. **The doorway**: deep table only (weight 1); a Source that stays on its own cell keeps its count, moved or new ones take the spare counts of their type highest first (capped at their maximum), extra copies start full; renaming Glyphs waits until home; a reload keeps you in the doorway but drops unsaved edits. **Trip page**: highlights are the first new interaction, the biggest chain (≥ 3 reactions) and the pattern nearest proof (3–4 of 5); damage and kills count only inside the cast that caused them; idioms aren't trip discoveries (they're recognised in the Study). The Lab intro plays only for demos | Rewiring must never refill a spell, and a no-op doorway must change nothing |
| 2026-10-14 | Study layout reworked around the board (*Proposal*): the lattice takes all the height left over. The spell recipe moved from a fixed 168px panel to a 64px strip that opens a sheet. Erase moved from the page corner into the shelf as its first slot, so it no longer covers the Draughtsman's top-right socket on a big board. The shelf shows only owned runes and scrolls past 2½ rows. Fair copy's panel replaces the shelf while it's on. **Reverses** the 2026-10-13 call to show unowned runes as `???` on the shelf: the Codex still lists them | On the phone the Stoker's 3×6 board had shrunk to a ~50px strip that couldn't be used. Wiring flows needs the board big; the recipe is one tap away and the step badges on the board still tie it to the sheet |
| 2026-10-16 | Seam deepening playtest (BL-01): first impression positive on all points. Player answers: no stranded-rat stalemate seen in play (BL-02 parked); Etch kept as is (BL-03); Bench pips fine (BL-04 closed); Thrift is a real choice against Pierce and On Ignite. The player will do detailed playtests later | Feel and direction look right for now. Revisit Etch and the stalemate in detailed playtests |
| 2026-10-16 | **Track M round** (stages C, D, G of the Scholar's Press, built together): effect score = **harm only** (damage to enemies plus kills); an elegance tier is the **best form of the last 10 casts, kept** (never drops); editing a Glyph makes a **new version with a fresh record**, free, no new proof, revert brings the old record back; plain spells get a **last-trip** profile with dead cells, Glyphs a full record; Reliability silver keeps the **free extra exit**; an owner's draft is repaired by **a test at the desk** against its note's goal; drafts are **harder deeper** (one bug shallow and mid, two at the heart) | The player chose a plain number and rewards that never take ink away. Details: [research-and-mastery.md](docs/design/research-and-mastery.md) §0 |
| 2026-10-16 | **Stages C, D, G built** (*Proposal* defaults, plan M1–M37; tune by playing): each rune is credited only with its own effect (a Payload Glyph never gets its host's damage); echoes and later-round fire don't count; Economy = harm ÷ base ink over the last 10 casts with tiers 0.7 / 1.0 / 1.3 (from bot trips, gold raised), Reliability 7 / 9 / 10 of 10; a version keeps its id, open cells and the extra exit are settings; one open cell from the Fair Copy sheet, two at gold; the extra exit leaves after the first exit, main branch first; five owner's drafts, one per trip, in story order, after the first Glyph; plain spells get a last-trip line and dashed rings on cells that never fired. Fixed on the way: a Fair Copy no longer drops a tail silently when another spell also reaches it | The calls the build had to make. Details: [research-and-mastery.md](docs/design/research-and-mastery.md) §0 (third table) |
