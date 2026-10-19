# Rune Design: Mix, Move, Invent

> **Status: Shipped** (built 2026-10-19; [DESIGN.md](../../DESIGN.md) §6.3, §6.5, §6.6; plan [rune-redesign-plan.md](../plans/rune-redesign-plan.md), build log and every builder's call in [rune-redesign-status.md](../plans/rune-redesign-status.md)). The hybrid of the four rune proposals, built in four decision rounds. The process, the idea ledger and the decision log are in [rune-design-synthesis.md](rune-design-synthesis.md).
> Problem frame: [rune-content.md](rune-content.md) (P1–P7, G1–G7). Where each part comes from: **01** Loads and Jars, **02** Board Is the Spell, **03** Spatial, **04** Invention.
> Numbers, names and fine-print lines are drafts, *tune by playing*. Rules marked *(default)* were picked by Claude and can be overturned.

## 0. Decisions

**Built 2026-10-19.** The player's calls at build time: the Seam and the canals are playable, the other five districts' runes, methods and solvents work but are reachable only in the Lab (plan P2); the folios are retired (P9); **board edges depend on the district**, walls in the Seam and the canals (P3). Every rule the build had to settle is a *Proposal* in the plan §1 (P1–P42) and in the status file's Proposals list (one block per task). The ones most likely to feel wrong, to judge by playing: P14–P16 (which layer a kind lands on, wash-out), P22 (headings), P33 (ink costs), P41 (blank previews), and that a unit only slides over oil it moves onto.

The 22 decisions behind this design, from five rounds (2026-10-18), are logged with their reasons in [rune-design-synthesis.md](rune-design-synthesis.md) §3. Each of the ~60 ideas from the four proposals, and what became of it, is in its §2.

## 1. The idea in one page

A spell is a **sentence**. The Source aims it, and each rune after that acts on the target, **in the order it's wired**.

Three layers make up the game:

1. **The board mixes** (01). The five kinds (Ink, Oil, Steam, Brass, Spark) land on tiles and mix with what's already there. A mix with Spark **bursts** at once. A mix without Spark **lingers** and works while it lasts, until Spark finds it and bursts it in its own way.
2. **Things move** (03). Shoves push units along the spell's heading. Oil makes them slide. A unit that hits something is **crushed**; one pushed off an edge **drops**.
3. **You invent** (04). At the Bench you apply a **method** to runes you know and get a new rune: one that sends a push through brass, or a mark that holds an action until its bearer is hit. **Materials pass their behaviour on**: a mark spreads through steam, and so does the action stored in it.

Every rune has one **headline** you can always read. What it does on each thing it meets is **fine print** you find by playing. Every new district has new things for old runes to meet.

**Five spells, read aloud:**

| Wiring | What happens |
|---|---|
| `Bolt → Oil → Spark` | The target's tile is oiled, then the spark lights it: **Fire**. |
| `Bolt → Spark → Oil` | A spark hits the target, then its tile is oiled. Same runes, different spell. |
| `Bolt → Oil → Shove` | The tile is oiled and the foe is shoved: it slides to the end of the oil and **is crushed** against the wall behind. |
| `Splash → Ink → Steam` | A **Brand cloud** settles over the 3×3 and marks whoever is inside. It lingers. The next apprentice's `Bolt → Spark` bursts it into a storm that hits marked foes twice. |
| `Bolt → Recoil` *(an invention)* into the Brand cloud | The recoil mark spreads through the cloud to everyone inside. Now the storm's every hit **shoves** someone, into each other and into the walls. |

## 2. The discovery rules

- **D1 · Headline and fine print** (01). Every authored rune has a headline (one sentence, always true, always shown) and **6–8 fine-print lines**: what it does on each state, compound, terrain or unit type. A line is revealed when it **fires and is witnessed**: in a fight, in a Bench trial, or when a foe uses it on you.
- **D2 · The preview never hints** (01). It describes only what you've witnessed. Where an unwitnessed line will apply, it draws the landing and leaves the result blank, with no `?`.
- **D3 · The harm warning.** The preview **always** warns when your own party will be hurt, even by an unwitnessed line: the apprentice shows as hurt and the reason stays blank.
- **D4 · The Bench is the safe place to check** (04). The test scene runs the real engine on terrain and foes you've met. What you witness there counts.
- **D5 · Materials pass on behaviour** (04). Whatever a material carries behaves like that material: an ink mark spreads through steam, and so does the action bound into it.
- **D6 · The board is the grammar** (01). Each district adds **terrain** (water, the drop, unfinished paper…), and every old rune and invention has new, unwitnessed lines for it.
- **D7 · Named results** (01). A notable result (a compound, a burst, an idiom) is named in the owner's hand the first time. The codex shows a rune's page as `fine print 3 / 7`, and the compound table and burst page as empty frames until you make them.
- **D8 · Fairness** (01). A line is deterministic, readable in one sentence after one sighting, and consistent with its headline. Each line is a data row `(rune, what it meets) → sentence` with a scenario test that makes it fire.

## 3. How a spell resolves

- **R1 · Roles.** **Source** (aims), **Action** (does something to the target), **Kind** (lands one of the five kinds), **Shape** (changes where the rest goes), **Trigger** (lets the rest continue only if the board allows), **Seal** (puts the rest in a jar), **Aura** (off the path, changes the path cells it touches). Inventions belong to one of these roles.
- **R2 · Sources only aim.** Bolt targets the first unit in a line; Splash targets a 3×3; Touch targets yourself or an adjacent unit or tile. A Source deals no damage. Damage comes from Strike, Spark, crushes and bursts.
- **R3 · Wiring order.** After the Source, each rune acts on the current target in turn. A failed trigger stops the flow, and what already happened stays.
- **R4 · The heading** (01, 03) is the direction from caster to target, or, for Splash, from the centre outward. Shoves go along it; Fork's sides are left and right of it.
- **R5 · Fork: branch = side.** What's wired on the Fork's left branch acts on the tile left of the target, the right branch on the tile right of it. The left branch resolves first.
- **R6 · Bend** turns the flow on the page only.
- **R7 · A unit target follows the unit** (04). If a Shove moves the target, later runes act where it ended up. A tile target stays a tile.
- **R8 · Triggers read the board as it stood when the cast began** (01, 03). Your own cast can't satisfy your own trigger; setup comes from an earlier turn, another apprentice, a foe or the terrain.
- **R9 · Splash** applies each rune to every tile in its area, in reading order.

## 4. The board

### 4.1 Kinds and states

A tile holds **one state or compound**, plus a unit and a jar. A unit can carry **one mark** (ink) and **one collar** (brass). *(default)*

| Kind | Lands as |
|---|---|
| Ink | a **mark** on the unit, or a **stain** on an empty tile |
| Oil | a **slick** tile: pushed units slide until they leave it; it's fuel |
| Steam | a **cloud**: blocks sight and lines; joins touching clouds |
| Brass | a **plate** on an empty tile (blocks, conducts); a **collar** on a unit (it conducts) |
| Spark | **1 damage** to a unit, and bursts whatever it lands on |

A kind landing on a plain state mixes with it by the table. One landing on a compound does what that compound's fine print says.

### 4.2 Lingering compounds (no Spark), 2 rounds

| | Ink | Oil | Steam | Brass |
|---|---|---|---|---|
| **Ink** | **Deep mark**: a mark that takes two Sparks to clear | **Stain**: marks any unit that ends its move here | **Brand cloud**: marks every unit inside at round end | **Shackle**: the unit can't move by itself |
| **Oil** | | **Pool**: slick on the tile and its 4 neighbours | **Grease fog**: a cloud in which pushed units slide until they leave it | **Skid plate**: a plate that slides when shoved, until it hits something |
| **Steam** | | | **Bank**: a thick cloud that lasts 2 rounds longer | **Kettle**: a hot plate; units beside it at round end take 1 |
| **Brass** | | | | **Wall**: a plate that takes two hits to break |

### 4.3 Bursts (with Spark)

| Spark lands on | Burst |
|---|---|
| a mark | **Detonation**: 3 to the marked unit; the mark is spent |
| oil | **Fire**: 2 now; the tile burns for 2 rounds and fire runs along connected oil |
| a cloud | **Storm**: 2 to every unit in the connected cloud |
| brass | **Conduct**: 2 to every unit on or touching the connected brass |
| a spark's fire | **Surge**: 3, and it arcs once to the nearest other unit for 1 |

And the **burst page**: Spark landing on each lingering compound bursts it in its own way (10 results, hidden until found). Drafts: a Brand cloud bursts as a storm that hits marked units twice; a Pool goes up all at once; a Shackle snaps (3, and the unit is thrown 1 tile); a Skid plate shoots along the heading; a Kettle blows; a Wall rings and pushes everyone touching it 1 away.

### 4.4 Moving things (03)

- **Crush.** A unit pushed into a wall, plate or unit takes **1 + 1 per tile it moved** in that push, and what it hit takes 1. *(numbers default)*
- **Slide.** A pushed unit on oil slides until it leaves the oil, and the tiles slid count toward a crush. Oil a unit slid over is used up that round (no pinball). *(03's guard)*
- **Drop.** A unit pushed off an edge or into a canal: a minion is gone; an elite takes 4 and loses its next action.
- **Networks.** Spark travels connected brass (Conduct) and connected clouds (Storm). Marks travel connected steam, with what they carry (D5). Any other action travels a network only if a **Conduct** invention sends it (§6).

## 5. The runes

**31 authored runes**: 13 in the Seam and 3 in each of the six guild schools. Inventions come on top (§6). Each guild school works with the Seam basics alone.

### 5.1 The Seam: mixing and pushing (13)

| Rune | Role | Headline |
|---|---|---|
| **Bolt** | Source | Aims a line at the first unit, range 4. |
| **Splash** | Source | Aims a 3×3 within range 3. |
| **Touch** | Source | Aims yourself or an adjacent unit or tile. |
| **Strike** | Action | Deals 2 to the target. Mixes with nothing: the safe hit. |
| **Shove** | Action | Pushes the target 1 tile along the heading. |
| **Guard** | Action | Shields the target from the next 2 damage until your next turn. A shielded hit is still a hit. |
| **Ink** | Kind | Lands Ink. |
| **Oil** | Kind | Lands Oil. |
| **Steam** | Kind | Lands Steam. |
| **Brass** | Kind | Lands Brass. |
| **Spark** | Kind | Lands Spark, the igniter. |
| **Fork** | Shape | Left branch acts on the tile left of the target, right branch on the tile right. |
| **Bend** | Shape | Turns the flow 90° on the page. |

### 5.2 The six guild schools

| School | Rune | Role | Headline |
|---|---|---|---|
| **Timing** (the Lamplighters, canals) | **Jar** | Seal | Seals the rest in a jar on the target's tile; it opens when a unit steps onto it. |
| | **Fuse** | Seal | Seals the rest in a jar on the target's tile; it opens at the end of the round. |
| | **Afterglow** | Aura | Lingering compounds from touching paths last 1 round longer. |
| **Contracts** (the Notaries, ink-makers' quarter) | **Sentence** | Action | Spends the target's mark to push it 2 tiles along the heading. |
| | **Levy** | Action | Spends every mark in the target area; the caster gains 1 shield per mark. |
| | **Tally** | Trigger | The rest happens only if the target and its tile held 2 or more things (marks, states, jars) when the cast began. |
| **Areas** (the bathhouses) | **Vat** | Source | Aims a 2×2 within range 1. |
| | **Seep** | Shape | The rest also acts on the target's 4 neighbours. |
| | **Steep** | Aura | Lingering compounds from touching paths spread one tile each round they last. |
| **Structure** (the bridge-wardens, bridges) | **Hold** | Action | The target can't change tiles until your next turn, not even by a push. |
| | **Brink** | Trigger | The rest happens only if the target stood beside an edge or canal when the cast began. |
| | **Lay** | Shape | What the rest lands sets into the tile for good (until broken), instead of lingering. |
| **Resonance** (the bell foundry) | **Toll** | Shape | The rest also acts on every tile connected to the target by the same state. |
| | **Coil** | Aura | Bursts and conducted actions from touching paths reach one tile further. |
| | **Unison** | Trigger | The rest happens only if another apprentice's cast landed on this target this turn. |
| **The board** (the Cartographers) | **Swap** | Action | The target and the caster trade places. |
| | **Draw** | Action | Moves what's on the target's tile (a state, a plate, a jar) one tile along the heading. |
| | **Erase** | Action | Removes the state, compound, mark or jar on the target; on unfinished paper, un-draws the tile. |

### 5.3 Each role's job (G1)

| Role | Authored | Job |
|---|---|---|
| Source | 4 | Where the spell aims, how wide |
| Action | 9 | What happens to a unit or tile: hit, push, shield, hold, spend marks, swap, move, erase |
| Kind | 5 | The board's chemistry (the only "apply a state" runes) |
| Shape | 6 | Where the rest acts: sides, neighbours, connected tiles, set for good (and Bend on the page) |
| Trigger | 3 | Whether the rest happens: the board's history, an edge, the party's order |
| Seal | 2 | When the rest happens: on a step, at dusk |
| Aura | 3 | Longer, spreading, further |

## 6. The Bench: invent, then find

### 6.1 How a session works

1. **Pick a method** you've learned, and the **parts** it asks for: runes you know, inventions included.
2. **Optionally add a solvent.** It gives the invention its district's flavour (§6.3).
3. **Read the headline.** It's derived from the method and parts, and always shown. There's no secret recipe and no score.
4. **Run trials** on the test scene: the real engine, terrain and foes you've met, two or three subjects you place. Trials are free. What you witness there reveals the invention's fine print.
5. **Name it and write it.** Writing is free. A flavoured invention spends one of its solvent. The rune is the household's from then on (§8).

An invalid combination explains what doesn't fit ("a Shape has nothing to store"). A valid invention that does little in some situation is still valid: that's fine print, not an error.

### 6.2 Methods

| Method | Taught in | Makes | Example |
|---|---|---|---|
| **Conduct** | the Seam | An Action that travels the connected brass the target touches, reaching each unit on it once | **Impulse** = Conduct(Shove): pushes everyone on the network. **Brass shelter** = Conduct(Guard) |
| **Repeat** | the canals | An Action that happens now and once more next turn, on the same tile | **Afterimage** = Repeat(Shove) |
| **Margin** | the canals | Turns a Repeat into an Aura: touching Actions repeat next turn | One aura, two spells that echo |
| **Bind** | the Notaries | Ink + an Action + an event: a mark that holds the action until the event. Events: **hit** and **enters a tile**; the bridges add **pushed**, the Cartographers **dies** | **Recoil** = Bind(Ink, Shove, hit). **Anchor** = Bind(Ink, Hold, pushed) |
| **Lift** | the Notaries | Turns an Action on a unit into one on its mark: moves the mark, with whatever it holds, to an adjacent unit | **Transfer** = Lift(Shove): hand a foe's mark back to them |

Compatibility is visible, not secret (04): Conduct and Repeat take an Action that resolves at once; Bind takes a carrier, an Action and an event; Lift takes a moving Action. An invention can be a part in another (Bind(Ink, Impulse, hit) = a mark that sends a pulse through brass when hit).

### 6.3 Solvents: the district's flavour

Each district has two solvents. A solvent bends **any** method in one way, so there are 14 rules, not a table of authored recipes. What a solvent does to each particular invention is fine print you find. *(Decided in round 5; the rules themselves are drafts)*

| District | Solvent | Bends the invention so that… |
|---|---|---|
| Seam | Gallnut | whoever it reaches is also marked |
| | Cinder | it leaves the tile hot (oil there catches fire) |
| Canals | Pitch | it floats: on water it drifts with the current |
| | Wick | it waits one round before it acts |
| Ink quarter | Wax | it never spreads, and fire melts it unspent (decision 17) |
| | Sand | it turns back: it acts on whoever set it off instead |
| Bathhouses | Bath salt | it also reaches the connected cloud |
| | Fog jar | it also acts on the target's neighbours, one step weaker |
| Bridges | Mortar | pushes in it go 1 tile further |
| | Chalk | it reaches 1 tile further |
| Foundry | Rivet | what it reaches can't move until your next turn |
| | Filings | on brass, it rings once more next round |
| Cartographers | Quicksilver | it also acts on the tile mirrored across the board |
| | Graphite | what it changes is undone a round later |

### 6.4 Limits that keep chains finite (04)

1. A rune or invention can't contain itself. Nested inventions show all their parts and pay for them.
2. A mark is spent before its action runs. Each spread copy has one release.
3. A mark and all its spread copies share one lifetime and one spread history: it spreads to each unit once per fight. Moving it doesn't refresh it.
4. A conducted action snapshots its network and reaches each unit once.
5. A repeat has its repeat spent; it can't schedule itself again.
6. Expiry, replacement and Erase don't release what a mark holds.

## 7. Jars (the Lamplighters)

- **J1 · Sealing** (01). A Seal rune splits the flow in time: everything **before** it happens now; everything **after** it is sealed in a jar on the target's tile and runs there when the jar opens. `Bolt → Ink → Jar → Oil → Spark` = ink now, fire when someone steps in.
- **J2 · Each Seal names its event** in its headline.
- **J3 · Visible.** A jar shows its owner and its contents to both sides. It doesn't block movement.
- **J4 · One per apprentice.** A new jar makes your old one crumble empty. Rivals follow the same rule.
- **J5 · Fair game.** Foes trip your jars and you can trip theirs. Draw moves one, Erase removes one.

A lingering compound waits **in the open** (for time, or for Spark). A jar waits **for an event**. A bound mark waits **on a unit**.

## 8. Mastery, Glyphs and the economy

- **Knowledge, not copies.** A learned or invented rune belongs to the household. Any apprentice can inscribe it, as often as their ink allows.
- **Ink per apprentice.** Each apprentice has their own ink allowance; household upgrades raise everyone's. An invention costs the sum of its parts plus its method's cost (Bind +2, Conduct +2, Repeat +2, Margin +1, Lift +1). *(default)*
- **Trip charges stay.** Sources carry charges per trip; going home refills them.
- **Rewire** freely at home and at occasional safe places; never in battle.
- **Footnotes** (01). Witnessed lines earn a rune points. At each level (I–III) it offers **two variants of a line you know**. You write one at the desk with a solvent from the district where that line was found. Inventions earn footnotes too.
- **Glyphs** compile as now. **Elegance** counts what a cast did over its whole life: lingering compounds, jars and bound marks count toward the cast that made them (fixes BL-57).
- **Crystallise goes** (round 5): inventions already re-enter research, so it has no job left.
- **Defeat** ends the trip and loses unbanked loot, never anything learned.

## 9. The party

- **Casting order is the combo.** One apprentice leaves a lingering compound, a jar or a bound mark; the next one bursts it, shoves a foe into it, or lands on the same target (Unison).
- **Leans** (decision 18): every apprentice is **trained** in one school (its runes cost them 1 ink less), and some are also **gifted** in one (its runes work one step better: +1 tile, +1 round or +1 push). The Seam counts as a school.
- **Habits** bend one headline: *her Forks act on the tile ahead too*; *he keeps two jars*; *her Bind marks can be left on an empty tile for the next unit to pick up* (04's rated scene).
- **Bodies and basic actions** (pull, swap, hop) work with the board: hop onto your own jar to open it early, pull a foe through grease fog.

## 10. Rivals

- **Same runes, plus one trick**: an invention you don't have yet, or a habit.
- **Telegraph** the path, the landing and each rune's effect. Their aim is **locked** when shown.
- **Breaking a chain:** move the target, starve a trigger, break the network, burst their compound early, open their jar on an empty tile, Erase or Transfer their marks. A chain stops where it breaks; what already happened stays. A rival whose chain is fully starved makes a plain strike instead.
- **They teach.** What they cast on you reveals fine print. If you know the method and parts, you can **rebuild their invention** at the Bench before you've beaten them. Beating one gives a page of their lattice.

## 11. The districts

| District | School | Runes | Method | Solvents | Signature idiom |
|---|---|---|---|---|---|
| The Seam | mixing and pushing | 13 basics | Conduct | Gallnut, Cinder | Cashing In, Bonfire, **The Wall** (a slide that ends in a crush) |
| The canals | timing | Jar, Fuse, Afterglow | Repeat, Margin | Pitch, Wick | Lantern Walk (a jar of fire drifting downstream) |
| The ink-makers' quarter | contracts | Sentence, Levy, Tally | Bind, Lift | Wax, Sand | Debt Collection (a bound mark opened by another apprentice's hit) |
| The bathhouses | areas | Vat, Seep, Steep | — | Bath salt, Fog jar | Steam Room (one compound over 6+ tiles) |
| The bridges | structure | Hold, Brink, Lay | Bind event: *pushed* | Mortar, Chalk | The Long Drop (a foe pushed off the edge) |
| The bell foundry | resonance | Toll, Coil, Unison | — | Rivet, Filings | Peal (one burst tolled across 3+ tiles) |
| The Cartographers' hall | the board itself | Swap, Draw, Erase | Bind event: *dies* | Quicksilver, Graphite | Redraft (Draw or Swap something into a compound that then goes off) |

Districts without their own method deepen the others through their solvents, their terrain and new Bind events. Each district's own design round names its terrain; every old rune and invention gets fine-print lines for it.

**The first evening:** prepared pages with Bolt, Strike, Shove, Guard and a few kinds. In the Seam, find the five kinds and the first crushes. Back home, learn Conduct from a found page and invent Impulse; test it on a brass plate with two subjects, and see it push one into the other. Take it back out.

## 12. How it answers the problem

| | Problem (rune-content §2) | Answer |
|---|---|---|
| P1 | Most runes only apply a state | Only the 5 Kinds do; 26 authored runes do something else |
| P2 | Spark is the only cash-in | Crush, drop, spending marks (Sentence, Levy), lingering compounds, conducted actions, bound marks |
| P3 | Every rune lands on the same tiles | Fork's sides, Seep, Toll, units followed after a push, jars, spreading marks |
| P4 | Triggers confirm your own cast | Triggers read the board at cast start (R8); jars and marks wait for events anyone can cause or starve |
| P5 | Bench runes are hand-written Glyphs | The Bench makes what wiring can't: conducted, repeated, bound and lifted actions |
| P6 | The aspect grammar is full | Aspects go; methods state their own compatibility; school × role tags |
| P7 | Few ways to deliver | 4 Sources, sides, neighbours, connected tiles, networks, jars, marks that spread |

## 13. Still open, tune by playing

- All numbers: damage, crush, push distances, lingering time, ink costs and allowances.
- Strike 2 vs Spark 1: is the safe hit worth its ink?
- The burst page's ten results and each district's terrain.
- The solvents' rules (§6.3) and which ones are fun.
- How much fine print to write before the first prototype (220 lines is the long-term size).
- Whether the Seam's Conduct makes the foundry feel late.

## 14. Next steps

1. **Lab prototype 1: the Seam.** Sources only aim, wiring order, the five kinds, 6 compounds, Shove with slide and crush. Question: *do I find things, and do I want more?*
2. **Lab prototype 2: the Bench.** Conduct with Impulse, the test scene, fine print revealed in trials.
3. **Lab prototype 3: Bind and spreading.** Recoil in a Brand cloud, a Spark storm across two apprentices.
4. If they play well, move the decisions into DESIGN.md and the feature docs, and write a plan in `docs/plans/`.
