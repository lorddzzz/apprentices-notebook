# The Cartographers' hall: the academy

> **Status: Decided** (design rounds 2026-10-22; not built). Roadmap: BL-117 (and BL-126 for the ending). The last of the seven districts to be designed ([district-ink-makers.md](district-ink-makers.md), [district-bathhouses.md](district-bathhouses.md), [district-bridges.md](district-bridges.md), [district-bell-foundry.md](district-bell-foundry.md), the canals revisit in [city-and-districts.md](city-and-districts.md) §5b and [district-seam.md](district-seam.md) came first). Individual apprentices are designed next ([party.md](party.md) §0b).
> Summary and decision log: [DESIGN.md](../../DESIGN.md) §6.7 and §11. School and runes: [rune-design-final.md](rune-design-final.md) §5.2 and §11. Rival rules: [rivals.md](rivals.md).
> Names are placeholders until BL-40. Numbers are *tune by playing*.

**One-liner:** the guild that draws the city into being, and expelled the owner. Its hall is an **academy**: lecture theatres, long drafting benches, a registry of past students, the owner's old desk in a back hall. The paper is **pencil and ink**: provisional tiles that the guild's hand either inks in or rubs out each round. A **long gauntlet** with no way home until **the Registrar** falls; then the owner's sealed door opens in the Seam.

## 0. Decisions (2026-10-22)

| Layer | Decision | Why |
|---|---|---|
| Place | **The academy** (chosen from the map room, the drawing studios and the archive of corrections): lecture theatres, drafting benches and the registry, with the owner's old desk in a back hall. The uncanny touch is that **the benches draw on you** | The lore is physical: a registry entry crossed out, a desk nobody dared clear |
| Guild and school | **The Cartographers**, no material lean, school **the board itself** (Swap, Draw, Erase; the Bind *dies* event; solvents Quicksilver and Graphite; idiom Redraft) | Unchanged from [city-and-districts.md](city-and-districts.md) §0a and the rune design |
| The guild's nature | **Custodians.** They keep the city drawn; if the drawing stops, the city unravels, and they truly believe the Seam is a flaw that threatens it. Not villains: grave, polite, certain. The Registrar erases people because the register says so | Uncanny and morally grey, per the game's tone |
| The Seam's truth | **A bad join in the city's drawing.** The city is a drawing, and the Seam is literally the seam: where the guild joined the original pieces badly (canals, quarter and baths grinding together). The owner found the join and drew into it, making a real place and proving that the city is paper. Expelled **for the knowledge, not the drawing** | Explains the name and every thread: nothing anchors a join, so it has no lamps or bell and it drifts; the chimney is where the pieces overlap; the spans lead toward it; the letters are the polite notices |
| Board rule | **Pencil and ink.** Parts of each room are **pencilled**: provisional tiles you can see but that are not there yet. Each round the guild's hand **inks** some (they become real and permanent) and **rubs out** others (the tile vanishes). The pencil shows next round's plan. **Draw, Swap and Erase rewrite it:** Erase on a pencil tile un-draws it (as the rune design says); Draw and Swap move what stands there | The district's school is the rule; the telegraph is the pencil |
| An erased tile | A unit on a tile that is rubbed out is **erased from the fight** (an apprentice is out of the room until its end and hauled back at 1 HP, a minion is gone, an elite takes 4 and loses its next action), exactly the bridges' fall rule (*Proposal*, shares the bridges' wording) | One rule for both districts' "out of the room" |
| Drawn-in reinforcements | New foes **arrive as pencil outlines** that ink in at round end; **Erase un-draws them** before they exist (*Proposal*) | Pencil applies to units, a clear telegraph for spawns |
| Foes | **The guild's hands:** the **Surveyor** (swaps two units' places, telegraphed, dragging your apprentices onto pencil about to be rubbed out), the **Eraser** (rubs out a tile's state, mark or jar each round and un-draws pencil early, a counter to setups) and the **Tracer** (a living copy that stands at the mirrored tile of an apprentice and mirrors their attacks) | Each uses the board itself |
| Trip shape | **The long gauntlet.** No landings and **no way home until the Registrar falls.** One commitment, a true finale | The player chose the highest stakes for the last district |
| A wipe | **The hall remembers.** You lose the trip's loot as everywhere, but the rooms you cleared **stay cleared**: next trip you start from the room where you fell, with full HP and charges. The gauntlet becomes a campaign over several evenings | A long, no-return run must not be all-or-nothing |
| The master | **The Registrar**, the one who struck the owner's name from the register, a rival ([rivals.md](rivals.md)). Signature: **strike from the register.** Each round pencil circles ring some units; at round end they are **erased from the fight** unless you Erase the circle, move, or kill the marker. Personal, and tied to the owner and the Bind *dies* event | The finale is the question of who gets written out |
| Hearing | **Five recovered rival pages.** Each rival's page (the four middle masters and the Lamplighter) is a fragment of the guild's city plan; when you hold all five, **the owner's hand draws in the academy.** Replaces the placeholder "clear the canals' heart or eight trips" in `src/data/districts.ts` | Gives the rival pages (BL-118) a purpose; a rival kill is part of the key |
| Gate | **A free "redraft" threshold room:** a retryable board that teaches pencil and Draw/Swap before the gauntlet. No enemies | The same proven pattern |
| The ending | **The owner hands you the pen.** After the Registrar falls, the Seam's sealed door opens: the owner gives you the notebook for good, and **the Seam becomes yours**; you can ink your own district into it. The credits roll onto a late-game sandbox, the earlier "your drawing to finish" idea earned as the reward (BL-126, unbuilt, to be designed) | Gentle, warm and open-ended |

## 1. Proposal defaults (*tune by playing*)

| Topic | Default |
|---|---|
| Length | **Five rooms and the Registrar**, with a **guaranteed quiet doorway** (rewiring) after room 3 as the gauntlet's one relief |
| Pencil | Roughly a third of a room is pencilled at first; the inking and rubbing-out are shown a round ahead; inked tiles are permanent and cannot be erased (Erase works on pencil only). Draw and Swap move units, states and jars across pencil |
| Foe numbers | Sized between the canals' foes and the heart bosses; the Eraser is the priority target; reinforcements arrive as pencil one round before they ink in |
| Treasures | The school's pages (Swap, Draw, Erase), the Bind *dies* method page, Quicksilver and Graphite come in the hall's ordinary offers, since the hall is the last district; Redraft is the district's named idiom |
| Small parties | A gauntlet for fewer than three is a pure challenge, as elsewhere |
| Apprentices | None found here ([party.md](party.md) §0b); a door arrival may follow the ending |
| Rival dependency | The Registrar is built after the **Lab rival prototype (BL-30)**; until then the hall may ship with a scripted stand-in, decided in the build plan |

## 2. How every earlier lore thread resolves

| Thread | Resolution |
|---|---|
| The Seam has no lamps (canals) and no bell (foundry) | The guild's anchors only ever stood where they drew whole streets; nobody anchored a join |
| The steam vent is the thermae's chimney (bathhouses) | It is where the baths' drawing overlaps the other pieces at the join |
| Spans to places not yet drawn, one toward the Seam (bridges) | The wardens built to the guild's plans, including the one the guild abandoned at the join |
| Letters to the owner in the Cartographers' hand (ink-makers) | The guild's polite notices: the expulsion and the reasons it gave |
| The ledger with the owner's name (bathhouses) | The owner's visits to the baths while studying the join |
| Leftover spirits and the Marginalia (Seam) | The owner's attempts to hold the join in place with ink: they stayed |
| The owner is still in the drawing (Seam) | They went into the join to keep it from tearing; they have been holding it |
| The margins answering (Seam) | The owner, writing back across the join |

## 3. Still open

- The Registrar's lattice, circle telegraph, starved-chain fallback and how the circles read on a phone-sized board (BL-30).
- The recovered-rival-page format and how five pages read as one city plan (BL-118), and the redraft threshold board.
- Room layouts and sizes (three per depth), the academy's art, the benches that draw on you, the registry and the owner's desk, the Surveyor/Eraser/Tracer numbers.
- The late-game sandbox the ending opens (BL-126): what "ink your own district" means, what it costs and whether it feeds the notebook.
- The Seam's drift after the ending: whether the join is mended, or stays as the player's page.
