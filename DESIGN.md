# The Apprentice's Notebook — Design Doc

> Working title. Living document: updated after every design round and playtest.
> Last updated: 2026-10-20 (current rules and post-redesign roadmap audit). **Rune redesign built.**
>
> **Feature docs:** a feature too big for one section gets its own file in [docs/design/](docs/design/README.md). This doc keeps its summary and a link, and the decision log (§11) stays here. Current: [Mix, Move, Invent](docs/design/rune-design-final.md) (§6.3). [Research and Mastery](docs/design/research-and-mastery.md) records the retained Glyph foundations and the retired research model.
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
        │  invent at the Bench; write footnotes at the desk                  │
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
4. **The unknown is visible.** Blank compound/burst frames and unwitnessed fine print keep pulling you forward.
5. **Home is cozy.** The study is a calm place to tinker between dangerous trips.

## 6. Systems

### 6.1 Party
- **Built:** two apprentices, each with their own lattice and ink budget; no character levels. The household shares learned runes, inventions and Glyphs.
- **Built:** the Draughtsman (6 HP, move 3) is trained in Timing, gifted in Contracts and keeps two jars. The Stoker (8 HP, move 3) is trained and gifted in the Seam; his Forks also act on the tile ahead. Trained runes cost 1 less ink, minimum 1; gifted runes gain their specified range, push or duration bonus.
- **Decided systems, unbuilt (2026-10-22):** a household of about 8–9; each apprentice keeps their own lattice page and a uniform ink allowance; recruits are a pickable loot offer in a district (offered again if declined) or free door arrivals triggered by notebook milestones; the third apprentice comes from the canals; the trio (or 1–2 as a pure challenge, no scaling) is picked at home from a household shelf and fixed for the trip; each apprentice has a body, exactly one personal basic action chosen to fit that apprentice's story (several may share one), a school lean and a unique habit. Boards are sized per room for narrative, with at least four start points drawn at random from the trip seed. Individual apprentices are designed later with their districts. [Party design](docs/design/party.md) §0b, BL-43.
- **Built (BL-103):** growing lattice pages for the existing two apprentices; recruitment and trio selection remain separate.

### 6.2 Rune lattice
- **Built:** a Source's arrow starts a path. Energy travels straight, Bend turns the path, Fork splits it, and empty cells/edges/revisited cells stop it. Auras insulate their cells and modify orthogonally touching path cells.
- **Built:** the Source only aims; later runes act in wiring order. A unit target follows the unit after movement. Fork branches act left and right of the target relative to the spell heading, left first. Triggers read the board at **cast start**; same-cast setup cannot satisfy them. Seals store the remaining path in a jar.
- **Example:** `Bolt → Oil → Spark` oils the target tile, then ignites it. `Bolt → Spark → Oil` sparks first, then lays oil. To slide a foe into a wall, place oil **ahead of it** before pushing: only entering slick/grease fog extends a push.
- **Built:** rewiring is free at home and at a rare quiet doorway, never during battle. Ink is a build budget, not a combat currency; loot reserves increase each apprentice's allowance. Learned runes have no copy limit.
- **Built (BL-103/88):** paper grows in every direction, including former member holes; ink alone limits the build. Drag to pan at readable editing scale, use Fit for an overview, and tap a region to return without editing. Study, quiet doorway, Lab and Glyph revision share these controls. Revision retains its 3–8 flow-cell rule; its separate 7×7 canvas cap is gone. Growth preserves wiring, proof, Source charges and Glyph records. [Growing pages](docs/design/growing-pages.md) records the rules and phone defaults to tune by playing. Fair Copy, open Kind/Action cells and extra exits remain available through Glyph mastery.

### 6.3 Runes, the Bench and mastery ("Mix, Move, Invent")
- **Decided and built (2026-10-19):** the rune model is **[rune-design-final.md](docs/design/rune-design-final.md)** (plan: [rune-redesign-plan.md](docs/plans/rune-redesign-plan.md)). It replaces aspects, recipes, the old Bench runes, Crystallise and the folios. Summary:
  - **A spell is a sentence.** The Source only aims (Bolt, Splash, Touch, Vat); every rune after it acts on the target **in wiring order**. A unit target follows its unit after a push.
  - **31 authored runes in 7 roles:** Source, Action (Strike, Shove, Guard, …), Kind (Ink, Oil, Steam, Brass, Spark: the only runes that land a state), Shape (Fork's sides, Bend, Seep, Lay, Toll), Trigger (read the board **as the cast began**: Tally, Brink, Unison), Seal (Jar, Fuse: the rest waits in a jar), Aura (Afterglow, Steep, Coil). 13 in the Seam, 3 per guild school.
  - **The Bench invents:** a **method** (Conduct, Repeat, Margin, Bind, Lift) applied to runes you know makes a new rune, optionally flavoured by one of 14 district **solvents**. Compatibility and the headline are always shown; trials on a test scene run the real engine. *Impulse* = Conduct(Shove); *Recoil* = Bind(Ink, Shove, hit).
  - **Headline and fine print:** every rune has one always-true headline and fine-print lines (what it does on each state, compound, terrain or unit) revealed when **witnessed**. The preview never hints: unwitnessed results are blank, but party harm is always flagged.
  - **Knowledge, not copies:** a learned or invented rune belongs to the household; ink per apprentice is the only limit. Inventions cost their parts plus the method.
  - **Mastery:** witnessed lines earn a rune **footnote** points; authored level-I lines offer two variants, written at the desk with a district solvent. **Glyphs** compile as before; **elegance** credits the cast's whole life, including lingering compounds, jars and bound marks, to the creating Glyph socket. Delayed tails count toward proof and fired-cell records without adding casts. Levels II–III are future content.
  - **Playable now:** the Seam and the canals. All 31 runes, 5 methods and 14 solvents work and are tested; the other five districts' pages are reachable only in the Lab until their own design rounds.
- *History:* the aspect grammar and recipes ("The Scholar's Press", 2026-10-13) are in [research-and-mastery.md](docs/design/research-and-mastery.md) and git history.

### 6.3b Loot (besides runes)
- **Decided:** **ink reserves**, **rune pages** (teach a rune of that district; a page you know drops as 1 ink), **method pages** (Conduct in the Seam's deep and heart rooms, guaranteed on the first heart; Repeat and Margin in the canals), **solvents** (two per district) and **vellum** (for compiling Glyphs).

### 6.4 Combat (expeditions)
- **Decided:** turn-based, on a grid, with Into the Breach's readability.
- **Decided:** each party member gets **move + 1 cast** per turn.
- **Decided:** enemies **telegraph** their next action.
- **Decided:** **HP and spell charges carry over** between encounters within a trip. Both are restored at home. This is the push-or-return tension.
- **Decided:** after each encounter, choose to **push deeper** (better loot, more danger) or **return home**. A party wipe loses this trip's loot only.
- **Decided:** enemies have **material traits** that make them pieces in your chains (brass = conducts, oil-soaked = flammable, …). Start **simple** and keep the complexity on the player's side.
- **Decided:** turn order is **party, then enemies**. All members act in any order, then enemies execute their telegraphed moves (Into the Breach-style).
- **Decided:** combat grid is **6 wide × 8 tall** (fits portrait) *Built today; the 2026-10-22 household round makes board size per room, see [party.md](docs/design/party.md) §0b.*
- **Decided:** each Source spell has **3–5 charges per trip** (raised in v0.1, see §9.5). Each member also has an **uncharged basic action** (Shove: push an adjacent unit 1 tile), so you're never stuck with nothing, and pushing units into oil and steam is a useful tactic.
- **Decided (2026-10-14): field rewiring is a rare loot offer**, "a quiet doorway". Taking it costs that pick and opens the notebook right away, with your banked collection. The player chose this over a once-per-trip Crossroads action: rewiring should be a find, not a routine.
- **Decided (2026-10-14): alternate layouts.** Each depth of a district has several hand-placed layouts. The trip's seed draws one per depth, and the Crossroads names the next fight ("the flooded stair"), so you push on knowing a little.
- **Decided (2026-10-14): the trip page.** Back home, a page sums up the trip: two or three highlights at the top (the biggest chain, first discoveries, a pattern nearly proven) and a folded ledger below (casts, damage and proof per spell).

### 6.5 The board: kinds, compounds, pushes
- **Decided and built (2026-10-19):** see [rune-design-final.md](docs/design/rune-design-final.md) §4.
  - **Five kinds** land on tiles or units: Ink (a mark, or a blot on an empty tile), Oil (a slick), Steam (a cloud), Brass (a plate, or a collar on a unit), Spark (1 damage and bursts what it lands on).
  - **Lingering compounds** (no Spark, 2 rounds): Deep mark, Stain, Brand cloud, Shackle, Pool, Grease fog, Skid plate, Bank, Kettle, Wall. Each works while it lasts.
  - **Bursts** (with Spark): Detonation, Fire (runs along connected oil), Storm (the connected cloud), Conduct (connected brass), Surge; plus a burst page of 10, one per compound.
  - **Moving things:** a pushed unit slides on oil, is **crushed** against a wall, plate or unit (1 + 1 per tile moved), or **drops** into a canal or off an open side. **Board edges depend on the district:** walls in the Seam and the canals.
  - **Marks travel connected steam**, with whatever action is bound into them; Spark travels brass and clouds; any other action travels brass only through a Conduct invention.

### 6.6 The codex (notebook)
- **Decided:** the codex **is** the previous owner's notebook, filled in as you discover things.
- **Decided (2026-10-19):** a rune's page shows its headline and its witnessed fine print (`fine print 3 / 7`); the compound table and the burst page are empty frames until you make each result, which is then **named in the owner's hand**. Idioms (Cashing In, Bonfire, The Wall, Lantern Walk, …) are named the first time a cast makes them. Compound/burst entries are blank frames until named. **Remaining mismatch:** unknown rune entries still use `???` and owner hints; the intended presentation needs a deliberate follow-up (BL-101).

### 6.7 Setting & mystery
- **Decided:** **the city of guilds.** The study is a rented attic in a big, old, rain-soaked city of rival inscriber guilds. Expeditions go **out**: oil-lit canals, brass bridges, steam baths, the ink-makers' quarter, rooftops, forbidden guild archives.
  - Districts are regions, and each favors a material (ink-makers' quarter = Ink, canals = Oil, bathhouses = Steam, …).
  - "Deeper" means farther from home, into parts of the city that shouldn't exist.
  - Mystery seed: the owner was expelled from a guild. Why?
- **Rejected:** *the Works* (an underground workshop). It felt too underground and confined. The player wants to go *out*, with sky, scale, and variety.
- Reserve ideas: the notebook-pages world, the wandering study, the ink sea.
- **Decided: guilds are rivals *and* sources of knowledge.** Each guild specializes in a school of spellcraft and guards its secrets. Their wardens and constructs are some of your enemies, and their archives and workshops hold runes and research materials.
- **Decided: map = a district map with paths.** The city map shows districts. Each district is a short chain of encounters leading toward its heart (push or return after each one). Unheard districts stay blank; heard districts show their gate or that the page is still being drawn.
- **Built (2026-10-17):** the sketch map, hearing, the canal lock and the oil-lit canals (BL-21, BL-22).
- **Decided (2026-10-16): the city and its districts**, in [city-and-districts.md](docs/design/city-and-districts.md). The door opens on the **owner's sketch map**. Districts are drawn in only once you **hear** of them (the owner inks one in after a discovery, or a rumour reaches the attic). Each heard district has one **gate**: a discovery, a **threshold room** (a hand-made board you solve with your own lattice), or a **key** (a loot pick deep in another district, lost on a wipe). A district has four flavor layers: a material lean, one board rule, a guild, and its own trip shape. **The second district is the oil-lit canals**: Oil, the Lamplighters, **the current** (water carries what floats one tile downstream each round), and **landings** (you can go home only every other room). You hear of them by running fire along oil in the Seam, and you enter by solving the canal lock. Their foes are the **canal eel** (a water-bound lurker), the **Snuffer** (the Lamplighters' warden, puts out fire and leaves nothing), **lamp-moths** (drawn to fire, burst into flame) and swimming oil-rats. Rooms get wetter as you go, and the heart is a first boss, **the lamp-mother**, who calls moths and snuffs fire near her. You burn her with oil floated under her on the current.
- **Decided (2026-10-18, scoping): districts are guild schools.** **Seven districts** (revised the same day): the Seam (the owner's own drawing, the basics), the oil-lit canals (the Lamplighters, *timing*), then in any order the ink-makers' quarter (the Notaries, *contracts*), the bathhouses (*areas*), the bridges (crumbling spans over a drop, *structure*) and the bell foundry (brass, *resonance*), and last the **Cartographers' hall**: the guild that draws the city into being and expelled the owner for drawing the Seam (*the board itself*). Each district brings its guild's **school** (a few runes, its solvents, its idioms), and a school is **a way of thinking, not a material** (timing, conditions, areas, structure…). Runes mix freely, but apprentices lean toward schools. **Idioms are guild signatures.** Districts vary in everything (trip shape, foes, bosses, return paths, drops and doors) and add a **new terrain or state** that generic runes find new uses for. Details: [city-and-districts.md](docs/design/city-and-districts.md) §0a.
- **Decided (2026-10-18, scoping): rival inscribers** are each guild's inscribers (elites, the heart's master, a few named faces). They use **the same runes plus one signature trick**, you win by **breaking their telegraphed chains**, and beating one gives **a page of their lattice** (their idiom, and a recovered spell page whose repair/Glyph format is still to be designed). Details: [rivals.md](docs/design/rivals.md).
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

## 9. Historical prototype v0 (superseded rules)

This section preserves the original prototype specification, not the current rune rules. Ward, Echo, affinities, same-cast triggers and the old materials below were replaced on 2026-10-19. Use §6 and the current rune design for play; the Seam setting and placeholder names remain relevant.

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

## 10. Current follow-ups

[ROADMAP.md](docs/ROADMAP.md) is the authoritative task list; [the rune audit](docs/plans/rune-redesign-audit.md) separates plan gaps, known rough edges and deliberate later scope.

- **Implemented:** core rune redesign, lifetime Glyph mastery, Lab authoring/lessons, two playable districts and level-I variants on four runes.
- **Leftovers:** fine-print coverage (100 rows against plan P4's stated 132), Bench parity with met canal content, and persistent solvent discovery.
- **Investigate:** delayed aura/solvent context, dusk replacement timing, state changes after the event cap and current arrival hooks.
- **Future design:** recruitment and trio selection, the five remaining playable districts, rivals/recovered spell pages, higher footnotes and atmosphere. Old aspect capacity, recipe content, Fire's category and same-cast trigger questions are resolved.
- **Tune by playing:** build/charge attrition, Strike versus Spark/crush, oil departure sliding and blank previews. No standalone playtest tasks are required.

## 10b. Parked directions

See ROADMAP §5 for the maintained parked list. Old folios, aspects, recipes, material affinities and Crystallise are retired. Input alternatives, charge refills and wipe penalties can be reopened by concrete feedback; reserve settings and an extra elegance metric remain optional ideas.

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
| 2026-10-16 | The Revert confirm on a Glyph sheet warns before swapping versions (BL-90), like Revise: the Economy discount it loses or gains (records stay with their versions), then any page pushed over its ink or past owned runes | A revert can cost ink without the player editing anything; the warning keeps the page blocker from appearing only afterwards |
| 2026-10-16 | **City and districts round** (Track W): the owner's sketch map; districts appear only once heard (the owner draws them in, or a rumour at home); one gate per district (discovery for the first few, a threshold room, or a key from deep loot that's lost on a wipe); four flavor layers (material lean, board rule, guild, trip shape); second district = **the oil-lit canals** (the current, landings, hear by fire along oil in the Seam, enter by the canal lock). Claude's defaults: threshold rooms are free and retryable, hearing is kept on a wipe, the Lamplighters, 5 rooms with landings after 1, 3, 5 | The player wants keys and spells as the main gates and discovery now and then; surprise over a full `???` map. Aspects, recipes, loot and solvents are deliberately left for a later rune-content rework. Doc: [city-and-districts.md](docs/design/city-and-districts.md) |
| 2026-10-16 | **Canals round** (BL-21): canal eel = a water-bound lurker; the warden = **the Snuffer** (puts out fire in its 3×3, fire and oil gone); lamp-moths and swimming oil-rats; rooms wetter as you go; heart = a first boss, **the lamp-mother** (calls a moth each round, flares every third round, snuffs nearby fire); the canal lock = one gate lit by burning oil on the current. Claude's defaults: stats in the doc §5.4, she burns only from fire on her own tile (oil floated under her), one-tile bosses | The player took the lurker and the lock as proposed, and chose the Snuffer, moths and a boss over the walking lamp-post, barges and a hard room. Doc: [city-and-districts.md](docs/design/city-and-districts.md) §5 |
| 2026-10-17 | **The city and the oil-lit canals built** (BL-21, BL-22; *Proposal* rules in [city-and-districts.md](docs/design/city-and-districts.md) §0 "Built", tune by playing): the study door opens the owner's sketch map; the canals are heard by lighting 3+ oil in one Seam cast, opened by solving the canal lock (a free, retryable puzzle board on the map: build a slick down the lane over a few turns and light it at the grate), then played as 5 rooms with landings after rooms 1, 3 and the heart; the current, grates, the wooden gate, the eel, the Snuffer, lamp-moths and the lamp-mother. **Design change:** a solved threshold shows as a burnt gate on the map instead of a codex entry (no codex 'places' kind yet) | The second district and the map that frames every later one; the lock had to be lengthened so Splash can't skip the current |
| 2026-10-17 | **Stain moves can be undone** (BL-05): supersedes the 2026-10-14 "a move that ends on a stain can't be undone". Undo lifts the ink and puts the unit back; the stain stays on the tile (`UndoRecord.stain`) | A one-way trap on a move the player can otherwise take back felt like a bug, not a rule |
| 2026-10-17 | **Owner's drafts round** (stage G, after its first playtest): a draft becomes a **folio** of 2–4 pages (rising with depth) mended from a **fixed tray** (the page's runes plus a drawer of scraps, nothing from the collection); each page adds a test and 1–2 scraps, and **every test runs on every attempt**; decoy scraps only in later folios; the reward is a Glyph that **starts at Reliability bronze** with the owner's mark and a lore page; all five drafts get rebuilt. Supersedes the 2026-10-16 "a test at the desk" and "harder deeper" | The player found minimal fixes too simple next to their own Fair Copies and unlimited runes too easy. Details: [research-and-mastery.md](docs/design/research-and-mastery.md) §0, §4.7 |
| 2026-10-17 | **Folios built** (BL-14; *Proposal* defaults, [folios plan](docs/plans/folios-plan.md) F1–F19; tune by playing): the tray is the page runes plus the unlocked scraps, with counts in the editor; one working page per folio, pages never re-lock; every unlocked test runs on each attempt, one board plays, a test that passed last run and fails now reads "broke"; copy-in gives a Glyph at Reliability bronze (window empty) with the owner's quill mark and lore on its sheet; the five folios have 2/2/3/3/4 pages, 5–10 runes, designed regressions, decoys Steam, Brand and Echo; drawer runes unlock nothing; boards may hold pre-inked units; save v6 restarts unmended copies. Also: flow lines on the draft page and the revision editor | The player's drafts round of the same day. Details: [research-and-mastery.md](docs/design/research-and-mastery.md) §0 "Folios built" |
| 2026-10-17 | **Rune content rework opened** (BL-98): the player calls rune content the weakest feature. Problem defined in [rune-content.md](docs/design/rune-content.md): runes mostly set up a state for Spark, every rune lands on the same tiles, triggers confirm their own cast, Bench runes are sums of two runes, the aspect grammar is full | Basic runes behave alike and Bench runes repeat what a flow already does |
| 2026-10-18 | **Scoping round: idioms and districts.** Districts are guild schools (runes, solvents, idioms); a school is a verb, not a material; free mixing with apprentices leaning; about 5–6 districts ending at the owner's old guild; idioms are guild signatures; districts vary in everything and add terrain that generic runes use. Details: [city-and-districts.md](docs/design/city-and-districts.md) §0a | Know where connected systems are going before designing runes, so they aren't redesigned again |
| 2026-10-18 | **Scoping round: rival inscribers.** Each guild's inscribers (elites, heart masters, named faces); the same runes plus one signature trick; the joy is breaking their chain; the reward is a page of their lattice. Details: [rivals.md](docs/design/rivals.md) | The player took the defaults, except one trick per rival over pure symmetry |
| 2026-10-18 | **Scoping round: the party.** Found in districts and at the door; pick 3 of many; identity = school lean, a habit, a body; **fixed lattice shapes removed** (the page widens, ink only); spells feed each other; the notebook carries progress; board about 7×9. Supersedes the 2026-10-12 affinity and shape decisions. Details: [party.md](docs/design/party.md) | The player found fixed shapes limit exploration |
| 2026-10-18 | **Districts round: themes and schools.** Seven districts: the Seam (no guild, the owner's drawing, the basics), the canals (Lamplighters, timing), the ink quarter (Notaries, contracts), the bathhouses (areas), the bridges (crumbling spans over a drop, structure), the bell foundry (brass, resonance), and last the Cartographers (unfinished paper, the board itself), who expelled the owner for drawing the Seam. No fixed order between the canals and the Cartographers. Details: [city-and-districts.md](docs/design/city-and-districts.md) §0a | The player wanted all three middle districts (7 instead of 5–6). Claude picked the bridges' boards, since the player liked every option |
| 2026-10-19 | **Rune redesign built ("Mix, Move, Invent")**, from [rune-design-final.md](docs/design/rune-design-final.md) with the plan's 42 Proposals and the builders' calls ([rune-redesign-status.md](docs/plans/rune-redesign-status.md)). The player's calls: the Seam and the canals are playable, the other five districts' runes are Lab-only (P2); the five folios are retired (P9); **board edges depend on the district**, walls in the Seam and the canals (P3). Saves restart at v7. Aspects, recipes, the old Bench, Crystallise and the folios are gone | The player called rune content the weakest feature (BL-98); the four proposals were merged in five rounds and built in one pass, to be tuned by playing |
| 2026-10-19 | Rune redesign continuation authorized: finish M1/S1/T1/K1/R2 before handoff. Delayed effects credit the creating Glyph socket, and Lab scenarios preserve their preset inventions on edits and export | Completes P8 and makes S1 invention demos replayable |
| 2026-10-19 | Calibration distinguishes fresh-room victories from full-trip survival: starter spells exhaust their charges by depth 3 on seeds 7/42. R2 improves chemistry teaching terrain without raising enemy strength or changing charges | 24/24 isolated rooms won, while the two full starter trips fail or stall at the heart |
| 2026-10-19 | M1 complete: lifetime damage, deaths and chain credit follow the cast and exact Glyph socket. Stored tails count toward proof and fired-cell records when they execute, without adding another cast | Completes P7/P8 and fixes payload Economy credit |
| 2026-10-19 | R2 places oil beside walls and a brass plate at every Seam depth, with a pushable land foe beside water in each canal room. Foe strength, loot weights and Conduct guarantee stay as calibrated | Terrain makes the new chemistry and drop rules usable without masking trip charge pressure |
| 2026-10-19 | S1 complete: unrestricted Lab inventions use all methods, Bind events and solvents without changing the notebook; undo/reset/export preserve session libraries. User approved two Bolt unobstructed landing-distance footnotes (one tile farther/nearer), implementation in progress | Completes P2 Lab access; Bolt variants must preserve unit/blocker targeting |
| 2026-10-19 | Level-I footnotes complete: all eight initial rows have their described effects; two player-approved Bolt variants move only an unobstructed landing one clear tile farther or one tile nearer, never onto the caster. Levels II–III stay later content | Ten variant rows preserve existing choices; first-unit and obstacle targeting are unchanged |
| 2026-10-20 | **Post-redesign documentation audit:** current summaries distinguish implemented rules from accepted future party/world design; 100 fine-print rows and incomplete Bench palette recorded as plan gaps, fixed lattice shapes as accepted-design debt. Roadmap split into correctness, growing pages/household, five district builds, rivals/recovered pages and mastery. Historical proposals/logs preserved. [Audit](docs/plans/rune-redesign-audit.md) | Documentation reconciliation; no gameplay rule changes or new feature approvals |
| 2026-10-20 | **Growing pages round (BL-103/88):** automatic paper growth in every direction, ink as the budget, readable editing scale with drag-to-pan and Fit, and the same growing paper inside Glyphs instead of a 7×7 cap. Stable viewport during edits and tap-to-enter from Fit are proposals to tune by playing. Existing wiring, proof and charges must survive. [Growing pages](docs/design/growing-pages.md) | Player chose unfolding paper, close-up editing with an overview, and equal freedom for Glyph revisions. Design decided; implementation remains pending |
| 2026-10-21 | **Growing pages built (BL-103/88):** signed paper grows around the wiring in Study, quiet doorway, Lab and Glyph revision; former member holes are writable. Ink remains the page budget; revision still allows 3–8 flow cells. Accepted *Proposal* defaults: stable camera through edits/erasure, 60px edit pitch, one-cell margin, 10px drag, 450ms hold, navigation-only tiny Fit targets and readable scrolling Glyph displays. Old notebooks retain proof, Source charges and Glyph records through v7→v8 migration. [Growing pages](docs/design/growing-pages.md) | Implements the accepted design for the existing pair; recruitment and larger rooms remain BL-43. Phone defaults remain tune-by-playing proposals |
| 2026-10-22 | **Household systems round (BL-43):** about 8–9 apprentices; own lattice page each; uniform ink; pickable recruit offers in districts (re-offered if declined) and free milestone-triggered door arrivals; the third from the canals; trio picked at home from a household shelf, fixed for the trip; 1–3 allowed as a pure challenge; one story-fitting basic action each, shareable, with unique habits; per-room board sizes with 4+ random start points from the trip seed. No individual apprentice designed yet | Player's picks, with the loot-offer recruit, small-party challenge and room/start-point rules chosen over the proposed defaults. Details and *Proposal* defaults in [party.md](docs/design/party.md) §0b |
| 2026-10-22 | **Basic actions revised (BL-43):** each apprentice has exactly one basic action, chosen to fit their narrative, not picked from a shared menu. Several apprentices may share an action, so no odd or complex action is invented just for variety. Replaces the "shared menu of about 4–5" in the household round | Player's change of mind: actions should come from the character, and sharing keeps the engine small. See [party.md](docs/design/party.md) §0b |
