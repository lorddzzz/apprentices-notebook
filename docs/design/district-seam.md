# The Seam, revisited: the owner's drawing

> **Status: Decided** (revisit round 2026-10-22; the base Seam is built, everything below that differs from it is unbuilt). Roadmap: BL-125. Part of the design pass: [district-ink-makers.md](district-ink-makers.md), [district-bathhouses.md](district-bathhouses.md), [district-bridges.md](district-bridges.md), [district-bell-foundry.md](district-bell-foundry.md) and the canals revisit ([city-and-districts.md](city-and-districts.md) §5b) came first; the apprentices are designed in [party.md](party.md) §2.
> Summary and decision log: [DESIGN.md](../../DESIGN.md) §6.7 and §11. The original v0 spec stays in DESIGN.md §9.2 as history. Runes and idioms: [rune-design-final.md](rune-design-final.md) §5.1 and §11.
> Names are placeholders until BL-40. Numbers are *tune by playing*.

**One-liner:** the owner's own drawing, where the canals, the ink-makers' quarter and the bathhouses grind into each other wrongly. It stays the **gentle two-apprentice tutorial** and then **grows**: after the owner's margins have been faced, a **lower Seam** opens with one floor for each district you've opened, each grinding a piece of that district's terrain into the basics. At the bottom is the owner's sealed door.

## What this revisit had to honor

| Source | What it asks of the Seam |
|---|---|
| [Canals §5b](city-and-districts.md) | The canals are heard by fire spreading across 3+ connected oil in the Seam; the lamps mark the drawing, and the Seam has no lamps |
| [Ink-makers](district-ink-makers.md) | Heard by a cross-apprentice Ink debt in the Seam; letters to the owner in the Cartographers' hand |
| [Bathhouses](district-bathhouses.md) | Heard by a Storm hitting 3 units in the Seam; the Seam's steam vent is the thermae's chimney; a ledger bears the owner's name |
| [Bridges](district-bridges.md) | Heard by performing The Wall in the Seam; one abandoned span leads toward it |
| [Foundry](district-bell-foundry.md) | Heard by a conducted burst hitting 3 units in the Seam; the Seam has no bell, so it is the one place that drifts |
| [Household](party.md) §0b | A duo until the canals' second landing, then a trio may return; no scaling for party size; boards sized per room; 4+ random start points |
| Rune design | The 13 basics, Conduct, Gallnut and Cinder; every school must stand on Seam basics alone; the first evening |
| The ink familiar | Already described as "a previous owner's leftover spirit" |

## 0. Decisions (2026-10-22)

| Layer | Decision | Why |
|---|---|---|
| Role across the game | **A district that grows.** The base Seam is the tutorial and is **tuned for two apprentices**. After the heart, a lower Seam opens, **tuned for three**, so the Seam never becomes trivial under the household's "no scaling" rule | Fits "grinding together wrongly" and keeps the basics relevant late |
| Its heart | **The Marginalia:** a boss made of the owner's leftover ink familiars gathered into one great figure, the margins of the notebook come alive. One tile, lots of HP, telegraphed; no rival system needed | The Seam finally has a face; gives the familiars a story |
| The fight | **The five hands.** Each round it "writes" a different kind onto the board in a telegraphed pattern, in turn: a mark, a slick, a cloud, a plate, a spark. Reading the cycle and mixing what it lays down is the fight, a final exam of the five kinds (*order and numbers: Proposal, tune by playing*) | Teaches the whole basics set at once |
| What opens the lower Seam | **Beating the Marginalia** (the page turns). Independent of the household build | A clear story beat |
| Lower Seam shape | **One floor per opened district.** Each district you open adds a lower floor featuring that district's terrain grinding into the basics; you descend as far as you like with **free return**; floors are tuned for three | The Seam literally grows as the map does |
| Intrusions | **One terrain piece** per floor, from an **opened** district (a canal lane with its current, a writ tile, a steam vent, a span with a pier, a pair of bells), **without** the district's full rule or gauge | Readable, easy to author, a preview of the district |
| The trip | **Intrusions are the twist.** No optional decision inside the trip: the base Seam stays plain (free return after any room), the lower floors change with the map. *(Margin scraps were considered and not chosen.)* | Keeps the tutorial plain; the twist arrives with the lower Seam |
| The bottom | **The owner's door, sealed:** the lowest floor ends at a sealed door that opens only after the **Cartographers' hall** is cleared. Beyond it is the owner, the final truth: the story ends where it began, in the Seam | Sets the endgame's geography and gives every lore thread somewhere to point |
| The owner is still in the drawing | The leftover spirits, the margin notes and the Marginalia suggest the owner never left: they went into their own drawing. The other districts' pieces (no bell, no lamp, the chimney, the spans, the letters) are why the Seam holds and why it drifts | One clear thread to pull; the Cartographers' round resolves who and why |
| The margins answer | **After the Marginalia, the margin notes start answering what you do:** a note changes after you master a school; a new line appears beside a page you've just proven. Delivered through the notebook already read, with no new rooms | A cheap, eerie lore channel (BL-41) |

## 1. Proposal defaults (*tune by playing*)

| Topic | Default |
|---|---|
| Base Seam | As built: four rooms and the heart, three layouts per depth, free return after any room, always open. The heart becomes the Marginalia. Conduct's guaranteed page on the first heart stays |
| Foes | Oil-rat, brass sentry and ink familiar stay. The familiars are the owner's leftover spirit (blurb already says so); the Marginalia is built from them |
| Re-laying | Every base room is re-laid with at least four start points drawn from the trip seed and a size chosen for the place (tight and cluttered early), per the household round |
| Hearing setups | Each of the five hearing events (fire on 3+ oil, cross-apprentice Ink debt, Storm on 3 units, The Wall, conducted burst on 3 units) must be **reachable with the starting basics in at least two base rooms**, with a `???` hint in the owner's voice. The older placeholder triggers in `src/data/districts.ts` (deep mark, grease fog, the Wall, Conduct) are replaced by those in each district doc |
| Lower floors | Floors appear in the order you opened the districts (canals first), one room each with three layouts, up to five floors (canals, quarter, thermae, bridges, foundry). No heart on a floor; the lowest ends at the door |
| What an intrusion brings (decided 2026-10-23, the player's pick) | **Its own piece rules, made gentler:** a lane drifts, bells ring by tone, writs and vents work; a span that falls drops an apprentice with the canals' survivable drop (4 and stunned) instead of out of the room. Never a district-wide rule (gauge, heat, pencil hand), hearing, rival or footnote |
| Intrusion loot | An intrusion never drops its district's own runes, methods or solvents (previews only); floors give ordinary basics-tier loot scaled for three |
| The Cartographers | They are not a floor; clearing their hall opens the sealed door |
| Small parties | The lower Seam is tuned for three; fewer is a pure challenge, as elsewhere |
| Margin answers | A second note variant on each page, chosen by mastery or proof; bounded, authored text |
| Apprentices | None found here. **Door arrival A, the Copyist**, a Seam-school generalist, knocks after your first witnessed idiom once the runaway has joined ([party.md](party.md) §2) |

## 2. Still open

- The Marginalia's HP, the five-hand order and telegraph, and how the leftover-familiar texture reads on the board.
- The lower floors' layouts and how each intrusion is drawn; the sealed door's art and map presentation.
- **Resolved (2026-10-22, [district-cartographers.md](district-cartographers.md) §2):** the Seam is a bad join in the city's drawing; the owner went into it to hold it; beyond the door the owner hands you the pen and the Seam becomes yours. The owner's name and face are still open.
- Whether a duo arriving at the lower Seam should be warned by the map; how floors are labelled by district on the sketch map.
- **Resolved:** nobody erases the Seam; it drifts because a join has no anchors, and the guild fears it will tear (they are custodians). Whether the join is mended after the ending is open.
