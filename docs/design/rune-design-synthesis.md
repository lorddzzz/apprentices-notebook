# Rune Design Synthesis

> **Status: Done** (2026-10-18, five rounds). The result is [rune-design-final.md](rune-design-final.md). Combines the four rune proposals ([01](rune-design-proposal-01.md), [02](rune-design-proposal-02.md), [03](rune-design-proposal-03.md), [04](rune-design-proposal-04.md)) into one final design. Problem frame: [rune-content.md](rune-content.md) (P1–P7, G1–G7).
> Answers given while a proposal was being written are **not** binding here. Everything can be asked again.
> How this file works: §1 summarises each proposal. §2 lists every distinct idea once, with its source and status. §3 logs the decisions. §4 grows into the final design. An idea is done when its status is Adopted, Merged or Dropped.

## 1. The four proposals

### 01 · Loads and Jars (Claude, five rounds, the most polished)

**Core:** a spell is a *delivery*. Loaders put measures of the five kinds (Ink, Oil, Steam, Brass, Spark) into the Source. Where the spell lands, they **mix two at a time** using a 15-cell compound table. A mix with Spark **bursts** now. A mix without Spark **lingers** for 2 rounds, and Spark landing on it later bursts it in its own way (10 more results). **Jars** (sealed loads that open on an event) are taught by only two guilds. Every rune has a one-line **headline** plus 6–8 hidden **fine-print lines**, found by witnessing them. The preview shows nothing you haven't seen yet. The Bench keeps today's deduction puzzle, and solvents steer the result. 31 runes.

| Pros | Cons |
|---|---|
| One idea (the load) carries everything, so it's the easiest to learn | Spark still decides *now or later*: the game is still mostly "set up, then Spark", only spread across casts |
| Discovery is built into the rules (fine print, terrain lines, a burst page to fill in), and it's the only proposal where old runes stay surprising in new districts | ~220 fine-print lines plus 25 compound cells: a lot of content to write, test and tune |
| Keeps what works today: board reactions, Bench deduction, Glyphs, the codex | Few verbs act on units (push, swap and hold come late or not at all). Spells mostly *put stuff on tiles* |
| The order you wire things in matters on the board (Fork flanks, Pour) | A preview that hides results can feel like a gotcha, though it always warns before you hurt your own party |

### 02 · The Board Is the Spell (another model, a first draft with known gaps)

**Core:** each path rune **transforms the current set of target tiles** and passes it on. Fork splits the set in two, Bend shifts it one tile, Bloom and Seep make it bigger, Exchange swaps the first two targets. Payoffs are verbs on states: **Sentence** (a mark becomes a push), **Levy** (marks become shields), Shunt collisions, Drop, Chime through networks, Douse. It splits triggers into *snapshot* triggers (they check the board) and *event* triggers (they listen after arming). It keeps the eight aspects. 27 runes.

| Pros | Cons |
|---|---|
| The most literal answer to "wire runes like code": a spell is a small program over tiles | It admits its own gaps: Fork does nothing on one target, Exchange needs two, one of its own examples doesn't work |
| Many non-Spark payoffs, each one a clear verb | Bend shifting targets ties the page layout to the board, so laying out a page gets harder |
| The clearest trigger types (snapshot or event) | Little discovery: every effect is stated up front |
| | Showing target sets after every rune is hard to read on a phone. The aspect grammar is still full |

### 03 · Spatial and Deterministic (another model, the thinnest)

**Core:** every rune is a **force or structure on the board**. The payoffs are physical: oil slides end in a **crush** against walls (damage per tile slid), **drops** (minions die, elites take 4 and lose their action), **Foreclose** (spends a mark to *cancel the enemy's telegraphed action*), Quench's pressure pop, a brass **stagger**, swaps. Triggers read the board as it stood when the cast began. Bend turns the spell's direction on the board. It adds a ninth aspect, **Axis**, and spreads even the materials across the guilds (Oil to the canals, Ink to the Notaries). 28 runes.

| Pros | Cons |
|---|---|
| The strongest tactical payoffs, in the spirit of Into the Breach: position, collisions, falls | No discovery system: it's a list of verbs with no hidden depth |
| **Cancelling an intent** is a great payoff against telegraphed foes | Spreading the materials leaves the Seam with 5 runes, and it moves Fork to the foundry |
| Plain guards against degenerate play (oil wears off, bosses get callouses, starved rivals still strike) | Bench recipes are ad hoc, and a ninth aspect only puts off the full-grammar problem |
| | Several runes are one-off tricks, not parts of a system |

### 04 · Discovery and Experimental Invention (Codex, ten rounds, the biggest change)

**Core:** runes are small atoms: **selectors** (Touch, Line, Self), **actions** (Strike, Shift, Guard, Hold, Heat), **materials** (Ink, Wax, Oil, Steam, Brass) and **methods** (Bind, Conduct, Lift, Delay, Repeat, Margin). At the Bench you **invent** runes by applying a method: Bind(Ink + Shift + after-hit) = **Recoil**. There are no secret recipes. **Materials pass on their behaviour** to inventions: ink spreads its stored action through steam (to allies too), and wax doesn't spread but melts. You can move existing magic, enemy magic included (Transfer). Full consequences are shown *on request*. It also rewrites the systems around runes: no copies (learned knowledge is permanent), no trip charges, no rune levels, Glyphs get cheaper through varied field achievements, Crystallise is removed. The player rated most of its scenes **Great**.

| Pros | Cons |
|---|---|
| Real invention: you design the rune, the game doesn't hide it | It replaces the Bench deduction puzzle (trials, resonance, silhouettes) that the brief says works |
| Surprises come out of the rules (stored actions spreading, network pushes), not from authored lines | Building from methods was rated only **Good**. The **Great** ratings were for the *consequences*, not the form-filling |
| The strongest manipulation verbs (Transfer, Afterimage auras) | Sources deal no damage and there's no Spark, so spells need more runes and feel more abstract |
| Simplifies the economy (no copies, no charges, no recipe score) | It rewrites half the game beyond runes (charges, copies, mastery, Crystallise, folios): a big scope jump |
| Clear laws that keep chains finite | Timing and carrier rules are dense (slots, pickup, spread history) |

### What stands out across all four

- **They all agree on:** keep the five materials as terrain, triggers must not confirm your own cast, the Bench makes rule-benders and never "A then B", runes are one sentence long, everything is deterministic and telegraphed, displacement counts as a payoff.
- **The real choice is the spine**, what a spell *is*: a load that mixes (01), a program over tiles (02), forces on a vector (03) or a composition of atoms (04). Most other differences come from this.
- **The two moments the player rated highest** in different processes are close: *a strange new result* and *a trap springing* (01), and *a material spreading a stored action, moving existing magic* (04). Both are **emergent discovery**. 02 and 03 contribute **payoffs and geometry** more than a spine.
- **Likely hybrid shape** (to test in round 1): one spine from 01 or 04, with the tactical payoffs of 03 (crush, drop, cancel intent) and the clean trigger types of 02.

## 2. Idea ledger

Status: **Adopted** (all agree, or obvious) · **Ask** (needs the player) · **Merged** (folded into another idea) · **Dropped**.

### Spine
| # | Idea | From | Status |
|---|---|---|---|
| S1 | A spell carries an ordered **load** that mixes where it lands | 01 | Adopted (round 1, the board's chemistry) |
| S2 | Each path rune **transforms the current target set** | 02 | Dropped (round 1) |
| S3 | Runes are **forces on the spell's direction** | 03 | Merged: its verbs and payoffs join the hybrid |
| S4 | Atoms + **methods**: the player composes inventions | 04 | Adopted for the Bench (round 1) |

### Discovery
| # | Idea | From | Status |
|---|---|---|---|
| D1 | A headline plus hidden **fine-print lines**, revealed when witnessed; the codex shows `3 / 7` | 01 | Adopted (round 1) |
| D2 | The preview leaves unwitnessed results blank (but always warns when your party gets hurt) | 01 | Adopted (round 1) |
| D3 | The full deterministic preview is available **on request** | 04 | Dropped (round 1); the Bench test scene takes its role |
| D4 | **Materials pass on behaviour** to whatever they carry (ink spreads a stored action through steam) | 04 | Adopted (round 1) |
| D5 | Each district's terrain gives old runes new behaviour | 01, 04 | Adopted (fits every spine) |
| D6 | Notable results are named in the owner's hand, with silhouettes ahead | 01 | Adopted (default: silhouettes now frame named results, not recipes) |

### Board and materials
| # | Idea | From | Status |
|---|---|---|---|
| M1 | Keep the five materials and today's board reactions | all | Adopted |
| M2 | A two-at-a-time compound table: lingering compounds and bursts | 01 | Adopted (round 1) |
| M3 | Spark's role: igniter (01), low-damage reactor (02), basic (03), replaced by Heat + Strike (04) | all | Adopted: igniter, one payoff of many (round 1) |
| M4 | **Wax**: a carrier that doesn't spread and melts in heat | 04 | Merged into solvents (round 4) |
| M5 | One state or compound per tile | 01 | Adopted (default) |
| M6 | Materials spread across guild districts instead of all in the Seam | 03 | Dropped (default: every guild must work with the Seam basics alone) |

### Shape and geometry
| # | Idea | From | Status |
|---|---|---|---|
| G1 | Spells have a **heading** (caster → target) | 01, 03 | Adopted |
| G2 | Fork: flanks (01, 03), splits the target set (02), or same targets in order (04) | all | Adopted: branch = side (round 2) |
| G3 | Bend: page only (01, 04), shifts targets (02), or turns the direction on the board (03) | all | Adopted: page only (round 2) |
| G4 | Wiring order means something on the board (Fork splits measures, Pour lands short) | 01 | Adopted (with S1) |
| G5 | Runes that grow the area: Seep, Bloom, Vat | 01, 02 | Adopted as bathhouse content (Vat, Seep) |
| G6 | **Neighbours**: retarget mid-spell; a unit target follows the unit | 04 | "Follows the unit" adopted as a rule; Neighbours dropped (Seep covers it) |
| G7 | Pierce | 03 | Dropped (default: G7 asks for a small set) |

### Payoffs
| # | Idea | From | Status |
|---|---|---|---|
| P1 | **Crush**: a push or slide into an obstacle deals damage per tile | 03, 02 | Adopted (round 3) |
| P2 | **Drops**: minions die; elites take 4 and lose their action | 03 | Adopted (round 3) |
| P3 | **Cancel an intent**: Foreclose (03); Fog makes it fall short (01) | 03, 01 | Dropped as a payoff (round 3). Fog's effect is reviewed with the compound table |
| P4 | A mark becomes another payoff: a push (Sentence), a shield (Levy) | 02 | Adopted (round 3) |
| P5 | Networks pass on **any** action (pushes and shields through brass), not only damage | 04, 02, 03, 01 | Adopted (round 3) |
| P6 | Quench's pressure pop; Douse turns fire into shields | 03, 02 | Merged into compound fine print (steam on fire) |
| P7 | Lingering compounds are payoffs in themselves (Fog, Shackle, Kettle) | 01 | Adopted (with M2) |
| P8 | Swap / Exchange | all | Adopted (details per spine) |

### Triggers
| # | Idea | From | Status |
|---|---|---|---|
| T1 | A trigger never sees its own cast's effects | all | Adopted |
| T2 | When it checks: when the cast begins (01, 03) or when the flow reaches it (02) | 01, 02, 03 | Adopted (default): when the cast begins |
| T3 | **Event triggers** that listen after arming (When Ally Struck, Reap, Bind events, jars) | 02, 04, 01 | Merged into Bind events and the Lamplighters' seals |
| T4 | Conditions on foes: telegraphing (At Dawn), at an edge (On Edge / Drop), unshielded (When Exposed) | 03, 02 | Adopted as content: Brink (bridges), Tally (Notaries), Unison (foundry) |
| T5 | A failed trigger still lands what was loaded before it | 01 | Merged: in wiring order, what came before has already happened |

### Waiting and manipulating magic
| # | Idea | From | Status |
|---|---|---|---|
| W1 | **Jars**: sealed loads, one per apprentice, from two guilds only | 01 | Adopted for tiles, from the Lamplighters (round 2). Notaries' writs merged into Bind |
| W2 | Fuse / Delay: the rest of the flow happens later | 02, 03 | Merged into the Lamplighters' seals (Jar, Fuse) |
| W3 | Repeat auras (Afterimage, Echo) | 04, 03 | Adopted: Repeat and Margin are the canals' methods |
| W4 | Laws that keep chains finite (one release each, no refresh, no self-scheduling) | 04 | Adopted |
| W5 | **Move existing magic**, foes' too: Transfer, Siphon, Draw, Erase | 04, 01 | Adopted: Lift (Notaries method), Draw and Erase (Cartographers) |

### Bench and grammar
| # | Idea | From | Status |
|---|---|---|---|
| B1 | Keep the **deduction puzzle** (trials, resonance, silhouettes, torn pages) | 01, 02 | Merged: trials and silhouettes stay, aimed at fine print rather than hidden recipes. Resonance score dropped (no hidden recipe to score against) |
| B2 | **Free invention** through methods, with no hidden recipes | 04 | Adopted (round 1) |
| B3 | The solvent steers the result; a result bends a rule of one parent | 01 | Adopted: the solvent is the district's flavour (round 3) |
| B4 | Grammar: school × role tags (01), 8 aspects (02), 9 aspects (03), properties (04) | all | Adopted (default): aspects go; school × role tags for leans and idioms; methods state their own compatibility |
| B5 | Inventions can go into further experiments | 04 | Adopted (with W4) |
| B6 | A test scene you can adjust, with known terrain and foes | 04 | Adopted (it's where hypotheses get checked, decision 4) |
| B7 | Never "A then B" | all | Adopted |

### Economy and progression (beyond runes; scope is a question too)
| # | Idea | From | Status |
|---|---|---|---|
| E1 | Trip charges (01–03) vs none, one cast per turn (04) | all | Adopted: charges stay (round 3) |
| E2 | Rune copies vs permanent household knowledge, paid for in ink per placement | 04 | Adopted: knowledge (round 3) |
| E3 | Footnotes earned by use and written with a solvent (01) vs no rune levels, Glyphs cheapen through field achievements (04) | 01, 04 | Adopted: footnotes (round 3) |
| E4 | Remove Crystallise | 04 | Adopted (round 5) |
| E5 | Elegance counts a cast's whole life (fixes BL-57) | 01 | Adopted |
| E6 | Rewire at home and at occasional safe places | 04 | Adopted (round 3) |
| E7 | Defeat keeps everything learned | 04 | Adopted (default) |
| E8 | Each apprentice has their own ink allowance | 04 | Adopted (default; fits "ink is the only limit") |

### Party, rivals, districts
| # | Idea | From | Status |
|---|---|---|---|
| R1 | Lean: trained (−1 ink) / gifted (+1 step) (01), discount on a method (04), ink discount (03) | 01, 03, 04 | Adopted: trained + some gifted (round 4) |
| R2 | Habits bend one headline | 01, 02, 04 | Adopted |
| R3 | Personal basic actions (pull, shunt, vault, swap) | 03, 04 | Adopted |
| R4 | Rival telegraphs are locked: no re-aiming | 03, 04 | Adopted |
| R5 | A broken rival chain lands what's left (01) / fizzles, with a fallback strike (03) | 01, 03 | Adopted (default): it stops where it breaks; a fully starved rival makes a plain strike |
| R6 | You can rebuild a rival's spell before beating them, if you have the parts | 04 | Adopted (follows from no hidden recipes) |
| R7 | Guards against degenerate play (oil wears off, boss callouses) | 03 | Adopted (as tuning tools) |
| X1 | Idioms are guild signatures, read on roles | 01 | Adopted |
| X2 | Threshold rooms state an outcome and accept any solution | 04 | Adopted (default) |
| X3 | Which runes each district teaches | all | Drafted in the final design §5 |

## 3. Decision log

| # | Round | Decision | Why |
|---|---|---|---|
| 1 | 1 | **Moments that are great:** the cloud bursting (01), the mark spreading (04), the slide and the drop (03). The fork dividing a target set (02) wasn't picked | The spine is a hybrid: 01's mixing board, 04's materials carrying actions, 03's physical payoffs. 02's target sets are dropped as a spine |
| 2 | 1 | A spreading mark is framed as **a combo you plan**, not a hazard to play around. It can still reach allies, and that's what makes it a tool (a rescue mark spread through steam) | The player's note on the moment |
| 3 | 1 | **Bench: invent, then find.** You compose a rune from known methods and parts, with no secret recipe. What it does on each material and terrain is fine print found in trials and fights | Invention is the player's, discovery stays the game's |
| 4 | 1 | **Preview: blank until witnessed, with a harm warning.** The Bench test scene is the safe place to check hypotheses | Discovery should feel like discovery; fairness is kept by the warning |
| 5 | 1 | **Spark: the igniter, and one payoff of many.** It decides "now or later" for mixes; crushes, drops, cancelled intents and network pushes pay off without it | Keeps the crowd-pleaser without the monopoly (P2) |
| 6 | 2 | **Waiting is made in two places.** Marks that hold an action (Recoil) are invented at the Bench with Bind. Jars on tiles come from a Seal rune on the page, taught by the Lamplighters | Marks are reusable inventions; tile traps stay a school you lean on |
| 7 | 2 | **Fork: branch = side.** What's wired on the left branch lands on the tile left of the target, the right branch on the right | The page mirrors the board |
| 8 | 2 | **Bend only routes the page** | The page stays free to lay out; Fork carries the geometry |
| 9 | 2 | **Sources only aim.** Damage comes from runes that do it: Strike (a plain hit), Spark (a hit that ignites and mixes), crushes and bursts | No rune is the damage rune unless you wire it. Strike vs Spark becomes a real choice (Spark sets oil under an ally on fire, Strike doesn't) |
| 10 | 3 | **Payoffs besides Spark: crush and drop, networks carry actions, marks turn into things.** Cancelling an intent as its own payoff is out | Position, transmission and spending marks give different setups different payoffs |
| 11 | 3 | **A solvent is the district's flavour**: the same method and parts give that district's variant | Travel feeds research; each invention has a second dial |
| 12 | 3 | **Knowledge, not copies.** A learned or invented rune belongs to the household; each placement costs ink | Invention needs it |
| 13 | 3 | **Rewire at home and at occasional safe places**, never in battle | A new idea can be tried before going home |
| 14 | 3 | **Trip charges stay, and so do footnotes** (01: earned by use, written with a solvent; a footnote rewrites a fine-print line you found). Glyph feats are not taken | Charges are the push-your-luck; footnotes tie mastery to discovery |
| 15 | 4 | **Runes act in wiring order.** Each rune acts on the target in turn, and each kind mixes with what's already on the tile. No load, no capacity | The page reads like a sentence, and order means something by itself |
| 16 | 4 | **Bind arrives with the Notaries**, not the Seam | The Seam is mixing and pushing; binding marks to actions is a turning point like the canals' jars |
| 17 | 4 | **Wax is a solvent**: Ink is the one carrier, and binding it with wax gives a mark that doesn't spread and melts in fire | Keeps the carrier choice without a sixth material |
| 18 | 4 | **Leans: trained (−1 ink) in one school, and some apprentices also gifted (+1 step) in one** | Apprentices feel more different |
| 19 | 5 | **The Seam teaches Conduct**; the first invention is Impulse (a shove through brass) | Mixing, pushing and invention in the first session |
| 20 | 5 | **One rule per solvent**, bending any method; its effect on each invention is fine print | Systemic, grows with every invention, avoids ~70 authored variants |
| 21 | 5 | **Strike (2, no mixing) and Spark (1, ignites and bursts) are both kept** | Strike is the safe hit; without it Spark would be the only damage rune again |
| 22 | 5 | **Crystallise is removed** | Inventions already re-enter research; Glyphs already save patterns |

## 4. The final design

Drafted in [rune-design-final.md](rune-design-final.md).
