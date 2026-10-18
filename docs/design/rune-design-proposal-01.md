# Rune Design Proposal: Loads and Jars

> **Status: Proposal, unified draft** (2026-10-18). One design for the rune content rework, built from three alternatives and five design rounds the same day (§0). It is the candidate for the final design and is not yet in DESIGN.md. **No existing file was changed.** §15 lists what would change if it's adopted.
> Problem and frame: [rune-content.md](rune-content.md) (P1–P7, goals G1–G7 in its §4, scoping in its §7). Connected: [city-and-districts.md](city-and-districts.md), [party.md](party.md), [rivals.md](rivals.md), [research-and-mastery.md](research-and-mastery.md).
> Existing implemented content is ignored on purpose. Numbers, names and fine-print lines are drafts, *tune by playing*.

## 0. Decisions

### 0.1 From the design rounds (the player's choices)

| # | Topic | Decision | Why |
|---|---|---|---|
| 1 | The root | **Discovery of rules, content and results** is what the system is built on (§2) | What the player likes most about the game |
| 2 | Direction | **Loads everywhere, jars in two schools.** A spell *carries* stuff that mixes where it lands (proposal B). Proposal C's hooks shrink to **sealed jars** taught by two guilds. Proposal A and the rest of C are dropped (Appendix) | The two moments to remember are *a strange new result* and *a trap springing* |
| 3 | How they share the game | **The Seam mixes, the guilds wait.** The Seam teaches loads and compounds. Waiting arrives with the Lamplighters and the Notaries | One big idea at a time. The canals become a turning point |
| 4 | The preview | **Says nothing about the unknown.** It shows only what you've already witnessed | Discovery should feel like discovery |
| 5 | Where secrets show | **The codex count only**: a rune's page says `fine print 3 / 7`, with the owner's hints | A pull at home; fights stay surprising |
| 6 | How much on the board | **A few, all important**: about 2–4 planted things per side | Readable on a phone with three apprentices and a rival |
| 7 | Spark | **The igniter.** Mixes with Spark **burst** at once; mixes without it **linger**. Spark landing on a lingering compound **bursts it, each in its own way** | Spark stays the crowd-pleaser, but as *now or later*, and the bursts are ten more results to find |
| 8 | What a hook is | **A sealed jar**: a planted load that opens on an event | One idea (the load) carries the whole game |
| 9 | Who waits | **Only the Lamplighters (timing) and the Notaries (contracts)** | Waiting stays a school you choose to lean on |
| 10 | Districts and mixing | **New terrain, same five kinds.** The table stays at 15 cells; each district adds terrain as fine print | Learnable, and every district reopens it |
| 11 | Fine-print volume | **The whole game**: 6–8 lines per rune, spread through every district | A long collection is the point |
| 12 | Reading a jar | **Before the jar lands now, after it is sealed.** `Bolt → Ink → Jar → Oil → Spark` = ink now, fire later | Reads left to right like a sentence; order means something |
| 13 | The lattice on the board | **Only Fork reaches the board** (it lands on the two tiles beside the target). Bend just routes the page | The page stays free to lay out |
| 14 | The Seam's "if" | **None. The board is the if**: what's on the tile decides what a mix does. Trigger runes arrive with the Notaries | The Notaries' arrival means something |
| 15 | The Bench | **Two runes plus one solvent**, with the deduction kept (trials, total-only resonance, silhouettes, torn pages). Results bend a rule, never "A then B" | Keep the puzzle you like and change what it makes |
| 16 | Solvents | **One set per district**, carrying its guild's school | Travel feeds research |
| 17 | Mastery | **Footnotes earned by use and written at the desk** with a solvent | Mastery of what you've discovered |
| 18 | Ward | **Its load lands on whoever breaks the shield** | Ward gets its own job: a small reactive spell in the Seam |
| 19 | Broken rival chains | **A broken chain lands what's left** | Breaking a chain changes what it makes, and you can read what's left |

### 0.2 Defaults Claude picked (*Proposal*, the player can overturn any)

| Topic | Default | Why |
|---|---|---|
| Bolt's capacity | **2** (the player said "decide for me") | Your first wired spell (`Bolt → Oil → Spark`) already makes fire. A Bolt that carries only 1 would bring back "set up, then Spark" |
| The lean (the player was split) | **Both kinds, per apprentice.** Every apprentice is *trained* in one school (its runes cost them −1 ink); some are also *gifted* in one (its runes work one step better: +1 capacity, +1 round or +1 tile) | [party.md](party.md) already says "cheaper or stronger", and it makes apprentices more different. Playtests will show which kind of lean people actually pick for |
| Lingering time | 2 rounds; Afterglow +1 | Long enough for the next apprentice, short enough to keep the board clean |
| Jars | One per apprentice; a new one makes the old one crumble empty | Holds decision 6 on its own |

### 0.3 Fixed by the consistency check

| Problem in the earlier draft | Fix |
|---|---|
| Two names for each kind ("Steam" added "Vapor") | The kinds are named after their loaders: **Ink, Oil, Steam, Brass, Spark** |
| Brass + Spark was "Magnet", which lost conduction, a board reaction that must survive (rune-content §3) | It is **Conduct** again |
| Siphon lifted from the target and landed back on the same target, which does nothing | It lifts from **what the spell crosses on its way**, or else **from the target's readied spell** |
| Pour had no tile on the board | It lands on **the last tile before the landing** |
| Fork's flanks and Heave's push had no direction | Spells have a **heading** (caster → target) |
| Draught modified nothing | Replaced by **Steep** (lingering compounds spread) |
| The Seam had no aura, although reading auras worked in playtest 1 | **Brim** (+1 capacity) |
| Unison's "same kind" was unclear | It passes if **another apprentice's cast landed on the target this turn** |
| One "opens when hit" rule for all jars broke Heir | **Each jar's headline names its own event** |
| Hidden lines could hurt your own party, and there's no `?` to warn you | Self-harm a rune causes on its own (spills) is in its headline, and **the preview always warns when your party will be hurt**, even by an unwitnessed line: the apprentice is marked as hurt and the reason stays blank (D7). *Claude's call: fair danger (pillar 2) beats "say nothing" in this one case* |

## 1. The idea in one page

A spell is a **delivery**. The Source is the vessel, loaders fill it, shapes decide where each measure lands, and what lands **mixes**: with the rest of the load and with what's already on the tile. A mix with Spark **goes off now**. A mix without Spark **stays and waits**: for time, for the next apprentice's Spark, for a foe to walk through it.

The guilds teach new ways to deliver. Later and on a footstep (the Lamplighters' jars). On someone, collected when they're hit or die (the Notaries' writs). Wider and seeping (the bathhouses). Heavier, set in stone, pushed over the edge (the bridges). Through everything connected (the foundry). Somewhere else entirely (the Cartographers).

Every rune says one **headline**. What it does on each thing it meets is **fine print** you find by playing, and every new district has new things for old runes to meet.

**Four spells, read aloud:**

| Wiring | What it does |
|---|---|
| `Bolt → Oil → Spark` | The bolt carries oil and spark: the target **bursts into Fire**. |
| `Splash → Ink → Steam` | A **Brand cloud** settles over the 3×3 and marks whoever is inside at each round's end. It lingers. |
| …then the next apprentice: `Bolt → Spark` into the cloud | Spark lands on a lingering compound and **bursts it** (a Brand cloud bursts as a storm that hits marked units twice). Casting order is the combo. |
| `Splash → Jar → Oil → Spark` | Nothing happens now. A **jar of fire** sits on the tile until something steps onto it. |

## 2. The discovery rules

These sit under everything else.

- **D1 · Headline and fine print.** Every rune has a **headline** (one sentence, always true, always shown) and **6–8 fine-print lines**: what it does on each state, compound, terrain or unit type it can meet. Compounds have fine print too: how each one behaves on each terrain. A line is revealed when it **fires and is witnessed**: in a fight, in the Lab, in a Bench trial, or **when a foe or rival uses it on you**.
- **D2 · The preview never lies, and never hints.** It describes what you've witnessed. Where an unwitnessed line will apply, it draws the landing and leaves the result blank, with no `?`. You find out by casting.
- **D3 · The codex holds the secrets.** A rune's page shows `fine print 3 / 7` and a half-legible hint in the owner's hand for each missing line. The **compound table** and the **burst page** show their cells as empty frames until you make them.
- **D4 · The board is the grammar.** Five **kinds** (Ink, Oil, Steam, Brass, Spark) make **states** and **compounds** on tiles. Each district adds **terrain** (water, the drop, unfinished paper…), and every old rune gets new, unwitnessed lines for it. *This is why old runes stay surprising.*
- **D5 · Triggers read the board as it stood when the cast began.** Your own cast can't satisfy your own trigger; setup comes from an earlier turn, another apprentice, a rival or the terrain. **Jars** watch live: they open the moment their event happens.
- **D6 · Named results.** A notable result (a compound, a burst, an idiom) is **named in the owner's hand** the first time, with silhouettes ahead. Each guild's idioms are its signature (§10).
- **D7 · The fairness contract.** A line is deterministic, readable in one sentence after one sighting, and consistent with its headline. Harm a rune does to its own caster (a spill) is in its headline. **The preview always warns when your own party will be hurt**, even by an unwitnessed line: the apprentice shows as hurt, and the reason stays blank. Lines are data rows `(rune, what it meets) → sentence`, and each line has a scenario test that makes it fire.

## 3. The load

The spell's **load** is a short ordered list of **measures**. A measure is one of five kinds: **Ink, Oil, Steam, Brass, Spark.**

- **L1 · Capacity.** Bolt 2, Splash 2, Ward 1, Vat 3. Brim adds 1. A loader past capacity **spills at the caster's feet** (in every loader's headline).
- **L2 · The heading** is the direction from caster to target. Fork's flanks are left and right of it; pushes go along it.
- **L3 · Resolution order.** The flow runs through the lattice as now (straight, Bend, Fork, stops at empty cells, edges and visited cells; auras are insulators). On the way, **loaders** add measures, **verbs** act at once, **triggers** check (a failed trigger stops the flow, and *what was loaded before it still lands*), and **Seal** runes seal the rest. When the flow ends, the load **lands**, as shaped by **shapes**.
- **L4 · Landing.** Bolt lands on the first unit in its line; Splash lands its whole load on every tile of its 3×3. A Bolt or Splash with an empty load still hits for 1.
- **L5 · Mixing.** On landing, the load mixes **in the order loaded, two measures at a time**, by the compound table (§4). A measure left over lands plain.
- **L6 · The tile joins in.** A plain measure that lands on a **plain state** mixes with it by the same table (Spark on an oiled tile = Fire). One landing on a **lingering compound**: Spark bursts it (§4.3); the other kinds do what that compound's fine print says. A compound landing on anything does what its own fine print says.
- **L7 · Spark is the igniter.** Every cell with Spark **bursts**: it acts at once, in full, and is used up. Every cell without Spark **lingers** for 2 rounds and works while it lasts.
- **L8 · Order is meaning.** Fork splits the load so far: the **first** measure lands on the tile **left** of the target, the **second** on the tile **right** of it. A branch that starts empty can still load after the Fork. Pour sets the **first** measure down on **the last tile before the landing**. So `Oil, Spark` and `Spark, Oil` are different spells once they meet a Fork or a Pour.
- **L9 · One thing per tile.** A tile holds at most one state or compound, plus a unit and a jar. A new arrival mixes with what's there or replaces it, as the table and the fine print say.

**Plain measures on their own:**

| Kind | Lands as |
|---|---|
| Ink | a **mark** on the unit or tile |
| Oil | a **slick** tile (pushed units slide; fuel) |
| Steam | a **cloud** (blocks sight and shots) |
| Brass | a **plate** on an empty tile (blocks, conducts); on a unit, a brass collar (the unit conducts) |
| Spark | **2 damage** (a burst), mixing with whatever plain state is there |

## 4. The compound table

### 4.1 Lingering compounds (no Spark)

| | Ink | Oil | Steam | Brass |
|---|---|---|---|---|
| **Ink** | **Deep mark**: a mark that takes two Sparks to clear | **Stain**: marks any unit that ends its move here | **Brand cloud**: marks every unit inside at round end | **Shackle**: the unit can't move by itself; its mark holds |
| **Oil** | | **Pool**: slick on the tile and its 4 neighbours | **Fog**: units inside can't see out, so their telegraphed attacks and spells **fall short**, landing one tile short of where they aimed | **Skid plate**: a plate that can be shoved; it slides until it hits something |
| **Steam** | | | **Bank**: a thick cloud that lasts 2 rounds longer | **Kettle**: a hot plate; units beside it at round end take 1 |
| **Brass** | | | | **Wall**: a plate that takes two hits to break |

### 4.2 Burst compounds (with Spark)

| | Burst |
|---|---|
| **Ink + Spark** | **Detonation**: 3 to the marked one; the mark is gone |
| **Oil + Spark** | **Fire**: 2 now; the tile burns for 2 rounds and fire runs along connected oil |
| **Steam + Spark** | **Storm**: 2 to every unit in the connected cloud |
| **Brass + Spark** | **Conduct**: 2 to every unit on or touching the connected brass |
| **Spark + Spark** | **Surge**: 3, and it arcs once to the nearest other unit for 1 |

These keep the board reactions the player likes: ignite, conduct, arc, detonate, stain, diffuse (the Brand cloud), heated brass (Fire and the Kettle), the current.

### 4.3 Bursts of lingering compounds (Spark lands on one)

Ten results, hidden until found (the codex's **burst page**). Drafts:

| Compound | Bursts as |
|---|---|
| Deep mark | Detonates twice |
| Stain | Burns as Fire, and detonates the mark of whoever stands on it |
| Brand cloud | A Storm that hits marked units twice |
| Shackle | Snaps: 3 damage, and the unit is thrown 1 tile along the heading |
| Pool | Fire on every tile of the pool at once |
| Fog | A flash: everyone inside loses their next move |
| Skid plate | The plate shoots along the heading until it hits something (bump 3) |
| Bank | A Storm that arcs again next round |
| Kettle | Blows: 2 to everyone within 1; the plate is gone, a cloud is left |
| Wall | Rings: every unit touching it takes 2 and is pushed 1 away |

## 5. Jars

A **jar** is a sealed load waiting at a place. Jars are taught by two guilds only (decision 9).

- **J1 · Sealing.** A **Seal** rune splits the flow in time: everything **before** it lands now, and everything **after** it (measures, verbs, shapes) is sealed in a jar. When the jar opens, the sealed part runs and lands there, by the load rules.
- **J2 · Each jar names its event** in its rune's headline: a step onto the tile, the round's end, the unit being hit, the unit dying.
- **J3 · Visible.** A jar shows its owner and its contents as dots, for both sides. It doesn't block movement.
- **J4 · One per apprentice.** Sealing a new jar makes your old one crumble empty (in every Seal rune's headline). Three apprentices hold three jars at most; rivals follow the same rule.
- **J5 · Fair game.** Foes trip your jars, and you can trip theirs. **Erase** removes a jar, **Siphon** lifts it (it opens where your spell lands), **Draw** moves it.

A lingering compound and a jar both wait, but differently: a compound waits **in the open** (for time, or for Spark), and a jar waits **for an event**.

## 6. The runes

**31 runes**: 13 in the Seam (the owner's basics) and 3 in each of the six guild schools. Bench results come on top (§8). Each guild school works with the Seam basics alone.

**Roles:**
- **Source**: the vessel. Has charges, aims, carries.
- **Loader**: adds a measure.
- **Shape**: changes how or where the load lands.
- **Verb**: acts at once, on the spot.
- **Seal**: seals the rest in a jar.
- **Trigger**: lets the rest continue only if the board allows it (D5).
- **Aura**: sits off the path and changes every path cell it touches.

### 6.1 The Seam: the owner's basics (13)

| Rune | Role | Headline |
|---|---|---|
| **Bolt** | Source | Fires a line at the first unit; carries 2. |
| **Splash** | Source | Hits a 3×3 within range 3, every tile getting the whole load; carries 2. |
| **Ward** | Source | Shields self or an adjacent ally from one hit; carries 1, which lands on whoever breaks the shield. |
| **Ink** | Loader | Adds Ink (past capacity, it spills at your feet). |
| **Oil** | Loader | Adds Oil (past capacity, it spills at your feet). |
| **Steam** | Loader | Adds Steam (past capacity, it spills at your feet). |
| **Brass** | Loader | Adds Brass (past capacity, it spills at your feet). |
| **Spark** | Loader | Adds Spark, the igniter (past capacity, it spills at your feet, and hurts you). |
| **Fork** | Shape | Splits the load so far: the first measure lands left of the target, the second right. |
| **Bend** | Shape | Turns the flow 90° on the page. |
| **Pour** | Shape | Sets the first measure down on the last tile before the landing. |
| **Siphon** | Verb | Lifts one measure into the load: from the first thing the spell crosses, or else from the target's readied spell. |
| **Brim** | Aura | Touching Sources carry 1 more. |

### 6.2 The six guild schools

| School | Rune | Role | Headline |
|---|---|---|---|
| **Timing** (the Lamplighters, the canals) | **Jar** | Seal | Seals the rest in a jar on the landing tile; it opens when a unit steps onto it. |
| | **Fuse** | Seal | Seals the rest in a jar on the landing tile; it opens at the end of the round, after the foes act. |
| | **Afterglow** | Aura | Lingering compounds from touching paths last 1 round longer. |
| **Contracts** (the Notaries, the ink-makers' quarter) | **Writ** | Seal | Seals the rest on the target unit; it opens when that unit is next hit, by anyone. |
| | **Heir** | Seal | Seals the rest on the target unit; when it dies, the jar breaks over its 4 neighbours. |
| | **Tally** | Trigger | The rest happens only if the target and its tile had 2 or more things on them (marks, states, compounds, jars) when the cast began. |
| **Areas** (the bathhouses) | **Vat** | Source | Fills a 2×2 within range 1; carries 3. |
| | **Seep** | Shape | What lands also lands on the 4 neighbours, one measure lighter. |
| | **Steep** | Aura | Lingering compounds from touching paths spread one tile each round they last. |
| **Structure** (the bridge-wardens, the bridges) | **Heave** | Verb | Pushes the target along the heading 1 tile, plus 1 per Brass in the load; the load lands where it stops. |
| | **Lay** | Shape | What lands sets into the tile for good (until broken), instead of lingering. |
| | **Shore** | Verb | Braces the landing tile for 2 rounds: nothing on it can be pushed, and it can't crumble. |
| **Resonance** (the bell foundry) | **Toll** | Shape | What lands, lands again on every tile connected to the landing by the same state. |
| | **Coil** | Aura | Bursts from touching paths reach one tile further. |
| | **Unison** | Trigger | The rest happens only if another apprentice's cast landed on this target this turn. |
| **The board** (the Cartographers) | **Swap** | Verb | Target and caster trade places. |
| | **Draw** | Verb | Lifts what's on the landing tile (a state, a plate, a jar, a lane) and sets it down one tile along the heading. |
| | **Erase** | Verb | Removes the state, compound or jar on the landing tile; on unfinished paper, un-draws the tile. |

### 6.3 What each family's job is now (G1)

| Role | Count | Job |
|---|---|---|
| Source | 4 | What carries, how far, how wide |
| Loader | 5 | What it carries (the only "apply a state" runes left) |
| Shape | 6 | Where and how it lands: split, short, wider, set, rung (and Bend, which routes the page) |
| Verb | 6 | Acts on the board at once: lift, push, brace, swap, move, erase |
| Seal | 4 | When it lands: on a step, at dusk, on a hit, on a death |
| Trigger | 2 | Whether it lands: the board's state, the party's order |
| Aura | 4 | More capacity, longer, spreading, further |

## 7. Fine print

### 7.1 How it spreads through the game

Each rune has about 6–8 lines, about **220 in all**. About half are found in the rune's home district (its states and the Seam's). The rest are **terrain lines** waiting in other districts: a Seam rune has lines for water, the drop and unfinished paper. A few lines stay hidden until the Cartographers.

Each district's own design round names its terrain. Placeholders:

| District | Terrain old runes meet there (placeholder) |
|---|---|
| The Seam | the five states, the 15 compounds, fire |
| The canals | water, the current, grates and gates |
| The ink-makers' quarter | ink vats, sealed doors |
| The bathhouses | hot water, rooms bigger inside than out |
| The bridges | the drop, cracking spans |
| The bell foundry | bells (brass that rings), moulds |
| The Cartographers' hall | unfinished paper, redrawn streets |

### 7.2 One rune followed through: Siphon

Headline: *lifts one measure into the load: from the first thing the spell crosses, or else from the target's readied spell.*

| Found in | Line |
|---|---|
| Seam | Over a puddle: lifts Oil; the puddle is gone. |
| Seam | Over a fire: lifts Spark; the fire goes out and the oil stays. *(You can carry the spark of a fire.)* |
| Seam | Over a cloud: lifts Steam; the cloud is gone. |
| Seam | A Splash crosses nothing, so it lifts from the centre tile, and the mix lands on all nine. *(Fire from one puddle on nine tiles.)* |
| Seam | Over a jar: lifts the jar as one measure; it opens where your spell lands. |
| Canals | Over water: lifts what floats there, and the current skips that tile this round. |
| Bridges | Over the drop: lifts nothing, and the spell falls short onto the last tile before the drop. |
| Cartographers | Over unfinished paper: lifts the tile itself; the gap goes with the spell and opens under the target. |

### 7.3 More lines, as examples

| Rune | Meets | Line |
|---|---|---|
| Jar | a unit standing on the tile | The jar is under it and opens when that unit leaves. |
| Jar | water | The jar floats and drifts with the current. |
| Fuse | a hit | A Fuse jar that is hit opens at once. |
| Fork | Splash | The left branch lands on the area's left column, the right on its right column. |
| Pour | Splash | A lobbed spell crosses nothing: Pour lands its first measure on the centre tile alone, before the rest lands. |
| Heave | the drop | Pushed over the edge, the unit falls (§10, *the Long Drop*). |
| Ward | a shove | A shove breaks the shield too: the load lands on whoever shoved. |
| Toll | water | Rings along the whole lane. |

## 8. The Bench

### 8.1 How it works

As in [research-and-mastery.md](research-and-mastery.md) §3: **two known runes plus one solvent**, free trials on a test board with the real engine, a **total-only resonance** (x / 6) with one margin line, silhouettes for undiscovered results, and torn pages in the owner's hand. Committing costs the solvent and keeps the parents.

What changes:
- **Tags replace aspects.** Every rune has two tags, both read off the rune: its **school** (where it's learned) and its **role** (§6). Solvents carry a **district**, and so a school.
- **Scoring:** a slot is exact (2), or shares a tag with the recipe's (1): the same school or role for a rune; another solvent of the same district for a solvent.
- **The explainability rule:** a Bench rune belongs to its **solvent's school**. Its rule **bends something about one parent, using the other**. Never "A then B". The same two runes with another district's solvent make a different rune: *the solvent is the steering wheel*.
- **Margin lines** are keyed to schools and roles: *"it wants to wait"* (missing timing), *"nothing to carry it"* (missing a Source), *"it has no say in where it lands"* (missing a Shape).
- **No ceiling.** Tags are 7 schools × 7 roles, and a recipe is keyed on its exact parents and solvent, so new districts add room instead of filling a grid (P6).

### 8.2 Solvents and results (drafts)

Two solvents per district and about two results each (three in the Seam for the tutorial arc). **15 results.** † = a torn page in the owner's hand.

| District | Solvents | Result | Recipe | Rewrite |
|---|---|---|---|---|
| Seam | Gallnut, Cinder | **Wake** † | Bolt + Pour + Cinder | A bolt that lays its first measure on every tile it crosses (a new delivery) |
| | | **Catalyst** † | Ink + Spark + Cinder | A burst keeps one measure, which lands plain after it |
| | | **Sponge** | Siphon + Steam + Gallnut | Lifts from every tile it crosses, not just the first |
| Canals | Pitch, Wick | **Damper** | Spark + Steam + Wick | A Spark mix lingers instead of bursting: a stored storm that goes off once a round for 2 rounds (BL-53's *Thunderhead*) |
| | | **Cracked Jar** | Jar + Oil + Pitch | The jar leaks: it lands its first measure each round while it waits |
| Ink quarter | Wax, Sand | **Lien** | Writ + Ink + Wax | When the Writ opens, it re-seals itself once on the nearest marked unit |
| | | **Forfeit** | Heir + Spark + Sand | If the unit is killed, the jar breaks over its killer instead |
| Bathhouses | Bath salt, Fog jar | **Crucible** | Brass + Steam + Bath salt | The load mixes three at a time: **triple compounds**, a new table found in the bathhouses |
| | | **Undertow** | Seep + Oil + Fog jar | Seep pulls instead: the neighbours' states are drawn into the landing tile and mix there |
| Bridges | Mortar, Chalk | **Hammer** | Heave + Brass + Mortar | Heaves a plate: it slides until it hits something, and the load lands there |
| | | **Keystone** | Shore + Jar + Chalk | A jar that opens when anything is pushed off its tile (a new event) |
| Foundry | Rivet, Filings | **Ringer** | Toll + Brass + Rivet | Toll rings across all connected things (oil, brass, cloud) as one network |
| | | **Overtone** | Coil + Spark + Filings | A burst that hits brass rings again next round |
| Cartographers | Quicksilver, Graphite | **Mirror** | Swap + Fork + Quicksilver | The load lands twice: on the target and on the tile mirrored across the board's centre line |
| | | **Palimpsest** | Erase + Ink + Graphite | What you erase comes back one round later and mixes with whatever is there |

## 9. Mastery, Glyphs and folios

- **Footnotes.** Witnessed lines earn a rune points, as in research-and-mastery §5.1. At each level (I–III) a rune offers **two variants of one line you know**. You **write** one at the desk with a solvent from the district where that line was found. Rewriting it later costs the same solvent again. A footnote still changes ink by ±1.
- **Glyphs (Compile).** A cluster compiles as now. A **Spell Glyph** carries its inner Source's capacity; a **Payload Glyph** adds its measures in order where it sits. A Glyph may hold a Seal (*a prepared trap*). Parameters can leave a loader open: *Cashing In ( Loader )*.
- **Elegance.** Economy counts what a cast did **over its whole life**: lingering compounds' effects and a jar's effects when it opens count toward the cast that made them. This fixes BL-57 (Payload Glyphs scoring no Economy).
- **Crystallise.** A crystal's tags are the school and role that most of its effects came from.
- **Folios.** The owner's drafts are built from Seam runes. Rivals' pages bring folios built from their own school (rivals.md).

## 10. Idioms: the guilds' signatures

Idioms are read on **roles, kinds and timing**, not exact runes, so Bench results and Glyphs count too. Each guild has a signature, which you learn in its district and see its rivals cast.

| Guild | Idiom | Shape |
|---|---|---|
| The owner (Seam) | **Cashing In** | A mark from one cast, Spark from a later one |
| | **Bonfire** | An area Source carrying Oil and Spark |
| | **Carry the Flame** | Siphon over a fire, landing somewhere else |
| Lamplighters | **Lantern Walk** | A jar of fire planted on water, drifting downstream |
| Notaries | **Debt Collection** | A Writ opened by *another* apprentice's hit |
| Bathhouses | **Steam Room** | One lingering compound covering 6 or more tiles |
| Bridge-wardens | **The Long Drop** | A foe heaved over the drop |
| Foundry | **Peal** | One burst tolled across 3 or more connected tiles |
| Cartographers | **Redraft** | Draw or Swap something into a compound or jar that then goes off |

## 11. The party

- **Casting order is the combo.** One apprentice leaves a lingering compound or a jar; the next one bursts it, pushes a foe into it, or lands on the same target (**Unison**). A **Writ** is opened by whoever hits next.
- **Leans** (default §0.2): *trained* in one school (−1 ink), and some *gifted* in one (one step stronger). The Seam counts as a school for leans.
- **Habits** bend one headline, in load terms. Examples: *her Forks send the second measure ahead instead of right*; *he keeps two jars*; *her spills land on the target instead of at her feet*.
- **Bodies.** The personal basic actions (pull, swap, hop) work with jars and compounds: you hop onto your own jar to open it early, or pull a foe through a Fog.

## 12. Rivals

- **Same runes, plus one trick** (a Bench rewrite you don't have yet, or a habit).
- **Telegraph:** the path, the landing and the load as dots. Their jars stand on the board with their dots.
- **Breaking a chain:** a broken chain **lands what's left**. Ways to break one:
  - Siphon their readied spell (you lift one measure, and it lands on them).
  - Fog them (their spell falls short).
  - Move the target.
  - Burst their lingering compounds early, or open their jars on an empty tile.
  - Erase or Siphon their jars.
- **They teach.** What they cast at you reveals fine print (D1). Beating one gives a page of their lattice (rivals.md).

## 13. The districts

| District | School | Runes | Solvents | Waits? | Signature |
|---|---|---|---|---|---|
| The Seam | the owner's basics: **mixing** | 13 | Gallnut, Cinder | no | Cashing In, Bonfire, Carry the Flame |
| The canals | **timing** | Jar, Fuse, Afterglow | Pitch, Wick | **jars** | Lantern Walk |
| The ink-makers' quarter | **contracts** | Writ, Heir, Tally | Wax, Sand | **writs** | Debt Collection |
| The bathhouses | **areas** | Vat, Seep, Steep | Bath salt, Fog jar | no | Steam Room |
| The bridges | **structure** | Heave, Lay, Shore | Mortar, Chalk | no | The Long Drop |
| The bell foundry | **resonance** | Toll, Coil, Unison | Rivet, Filings | no | Peal |
| The Cartographers' hall | **the board itself** | Swap, Draw, Erase | Quicksilver, Graphite | no | Redraft |

**The canals, retrofitted:** jars float on the current, so the Lamplighters' school fits the board rule built there. The lamp-mother (fire on her tile burns her) becomes a target for a drifting jar of fire.

## 14. How it answers the problem

| | Problem (rune-content §2) | Answer |
|---|---|---|
| P1 | Most runes only apply a state | Only the 5 loaders do; 26 runes do something else |
| P2 | Spark is the only cash-in | 10 lingering compounds are payoffs on their own (Fog, Shackle, Kettle…); Spark is *when*, not *whether* |
| P3 | Every rune lands on the same tiles | Fork splits the load across flanks, Pour lands short, Seep, Toll, Vat and the Seals change where and when |
| P4 | Triggers confirm your own cast | Triggers read the board at cast start (D5); jars wait for events anyone can cause or starve |
| P5 | Bench runes are hand-written Glyphs | Results bend a rule (new deliveries, events, mixing rules), never "A then B" |
| P6 | The aspect grammar is full | School × role tags, plus exact recipes: no ceiling |
| P7 | Few ways to deliver | 4 Sources, flanks, short drops, trails (Wake), jars, writs, mirrors |

| Goal (rune-content §4) | Met by |
|---|---|
| G1 own job per family | §6.3 |
| G2 several cash-ins | §4: 15 compounds + 10 bursts |
| G3 the lattice reaches the board | Fork's flanks, and the order the load is wired in (L8) |
| G4 triggers that can fail | D5, Tally, Unison, jars |
| G5 Bench does what wiring can't | §8 |
| G6 the grammar fits and grows | §8.1 |
| G7 small | 31 runes + 15 Bench results, each rune one sentence long |

## 15. What adopting it would change (not done yet)

**Docs:**
- **DESIGN.md** §6.2: the open question "do triggers see same-cast effects?" is answered: no.
- **DESIGN.md** §6.3: the families become the seven roles.
- **DESIGN.md** §6.5: the interaction matrix becomes the compound table.
- **DESIGN.md** §11: log the decisions of §0.
- **rune-content.md** §6: its questions are answered by §0 here.
- **city-and-districts.md** §0a: the Seam's school is "mixing", not "the first triggers". Add the solvents and runes per district.
- **research-and-mastery.md**: aspects → tags (§2), the recipes (§3.3), footnotes (§5.1), crystal tags (§5.3).
- **party.md**: the lean default.
- **rivals.md**: a broken chain lands what's left.

**Code:** this is a rewrite of the flow resolution (a load instead of a stack of effects), of `materials.ts`, `cast.ts`, notation and previews, plus a jar layer, fine-print data and a save migration. rune-content §5.3 lists everything a swap touches.

## 16. Still open, tune by playing

- All numbers: capacities, damages, durations, Pool and Seep sizes, the jar cap.
- Each district's terrain, named in its own design round (§7.1 placeholders).
- Whether Fog's "fall short" and the flash burst are too strong against bosses.
- Trained or gifted leans: which one do players actually pick for?
- The Crucible's triple table (bathhouses): content for that district's round.
- Rival targeting: fixed at telegraph time (default, like Into the Breach) or re-aimed (rivals.md).

## 17. Next steps

1. **Lab prototype 1: the Seam load.** Bolt, Splash, the five loaders, Fork, and 6 compounds (Fire, Detonation, Storm, Conduct, Stain, Fog). The question to answer by playing: *do I find things, and do I want to find more?*
2. **Lab prototype 2: linger and burst across two apprentices**, the four bursts of lingering compounds that go with prototype 1's compounds, and D2 (a blank result where a line is unwitnessed).
3. **Lab prototype 3: Jar and Fuse on a canal board.**
4. If they play well: move the decisions into DESIGN.md and the feature docs (§15), and write a plan in `docs/plans/`.

## Appendix: paths not taken

- **A · The Verb Book.** Every rune a verb on properties, with a heading; Collect consumed a state for a payout that depended on the state. *Kept from it:* the heading, Fork's flanks, fine print per property, Heave, Shore, Swap, Erase.
- **C · The Hooks.** Every trigger a deferred rule (planted on a tile, unit or event) with ten events and hooks tripping hooks. *Kept from it:* hooks as jars, in two schools; Heir; Keystone's new event; the idea that rivals' traps are drawn and breakable.
- **The earlier drafts of both** were in this file before the rewrite on 2026-10-18 and were never committed.
