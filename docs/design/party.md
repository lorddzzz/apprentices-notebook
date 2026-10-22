# The Party: Apprentices

> **Status: Systems decided** (scoped 2026-10-18; household systems decided 2026-10-22 in §0b; **individual apprentices are designed later, together with the districts**). Not built beyond the current two. Roadmap: BL-43.
> Summary and decision log: [DESIGN.md](../../DESIGN.md) §6.1, §6.2 and §11. **Supersedes** the 2026-10-12 decisions "members differ by material affinity and lattice shape" and "each lattice is a small grid shaped by its member". Related: [city-and-districts.md](city-and-districts.md) (guild schools), [rivals.md](rivals.md), [current rune rules](rune-design-final.md) §9.

## Current implementation boundary (2026-10-21)

Two apprentices remain playable. Both move 3 and share basic Shove. The Draughtsman has 6 HP, trained Timing, gifted Contracts and the two-jars habit; the Stoker has 8 HP, trained/gifted Seam and Fork-ahead. Training discounts school runes by 1 ink (minimum 1); gifts improve the rune's declared range, push or duration. Ink is currently per apprentice, with household reserve upgrades increasing both allowances.

**Growing pages are built (BL-103/88):** both apprentices use paper that grows in all directions, phone pan/Fit and the same freedom in Glyph revision. Fixed geometry remains available for authored scenario layouts. Details: [growing-pages.md](growing-pages.md). Recruitment, selection of three, larger rooms and personal basic actions remain BL-43. No new recruit needs an aspect pair or a material affinity.

## 0. Decided in the scoping round (2026-10-18)

| Question | Decision | Why |
|---|---|---|
| Where apprentices come from | **Both: found in the districts and at the door.** Some are recruited in a guild district (a runaway, a clerk) and arrive trained in that guild's school; others turn up at the attic over time (rumours, letters) | The city map is also a recruitment map, and the attic gets its own slow trickle |
| Who goes on a trip | **Pick 3 of many.** The household grows, and the party is 3 | Bigger combos. The trio is a build decision, like wiring |
| What makes one different | **School lean** (one or two schools they're trained in, cheaper or stronger there; replaces material affinity), **a habit** (one small passive rule that bends how their lattice reads), **a body on the board** (HP, move and a personal basic action instead of everyone's Shove: pull, swap, hop…) | Identity by how they play, not by what they're allowed to wire |
| Lattice shape | **Removed.** No fixed member shape. A lattice is a page that **widens as needed**, like the Fair Copy and revision canvas | Fixed shapes limited exploration |
| What limits a lattice | **Ink only** | One budget, as now. Long chains and wide forks compete for the same ink |
| The board | **A little bigger, about 7×9** if it still fits portrait well; rooms are re-laid (*tune by playing*) | Three apprentices plus foes crowd 6×8 |
| How their magic meets | **One feeds the other**: one apprentice's spell leaves a state or trips a trigger that the next one's chain cashes in that same turn. **Casting order is the combo** | Triggers that watch the board make this natural |
| Growth | **The notebook carries it.** Runes, Glyphs, footnotes and ink grow; apprentices are who you bring and how they lean. A new recruit is useful at once | Keeps the build in the runes |


## 0b. Decided in the household round (2026-10-22)

This round fixed the **systems**: how many, how recruited, how picked, how deployed. It deliberately designs **no specific apprentice**; each new one (body, action, lean, habit, starter page, where found) is designed with the district that holds them. Where this table differs from §0, this table wins.

| Question | Decision | Why |
|---|---|---|
| Household size | **About 8–9 in all**: the current two, about one found per middle district (four), and two or three door arrivals (*Proposal*: the Cartographers add none; tune by playing) | Every pick of three is a real choice, and each apprentice can still be authored with care |
| Lattice pages | **Each apprentice keeps their own page, forever.** Swapping the trio never means rewiring; a recruit arrives with a working starter page. A "copy page from…" helper is a later polish idea, not decided | Wiring is part of who they are; keeps their lean and habit tied to their lattice |
| Recruiting in a district | **A loot offer you can pick** ("someone joins you", like the quiet doorway). Taking it costs that pick. Each district's recruit is a fixed, authored apprentice at a landmark room; **if declined, they are offered again on later trips** until taken (*Proposal*: one per district) | Fits the existing offer system and keeps recruiting a real choice against runes and ink, without losing anyone for good |
| Recruiting at the door | **Free arrivals at home, triggered by notebook milestones** (first idiom witnessed, a Glyph reaching a tier, a proven invention…). Someone has heard of your work. Exact milestones are decided per apprentice | The notebook carries growth; arrivals recognise what the player built |
| What a recruit brings | **Only a starter page**, built from runes the household already owns, plus body, lean, action and habit. No new rune page, no signature Glyph | Districts keep control of when each school's runes arrive; signature pages overlap BL-118 |
| When the trio first exists | **The third apprentice comes from the canals** (a district recruit offer). The Seam is a duo until then; the trio can return to any room | The first district-found recruit teaches recruiting by itself |
| Choosing the trio | **At home, in one household shelf in the Study**: portrait cards with the three trip slots on top and the rest on a bench. Tap a card to open that apprentice's page; tap or drag to fill a slot. **Fixed for the whole trip** (no doorway swap, no per-fight swap) | Wiring and picking in one place; swapping mid-trip would undercut the rare doorway and the push-or-return tension |
| Fewer than three | **Allowed: 1–3 apprentices.** A pure challenge with **no scaling and no bonus**: rooms and loot stay the same; fewer casts and less total ink. *Tune by playing* if it proves a trap or an exploit | No special rules to build or exploit; you choose it for a story, a combo or a test |
| Ink | **Uniform for everyone**, raised by the household's reserve upgrades; every recruit gets the current reserve (*Proposal*). Ink is not part of identity | Identity is body, lean, action and habit; a recruit is comparable and useful at once |
| Kit parts | Every apprentice has a **body** (HP, move), **exactly one personal basic action** that replaces Shove, a **school lean** and **one unique habit**. **Revised 2026-10-22 (same day):** the action is *not* picked from a menu; it is chosen to **fit that apprentice's narrative**. Actions may be **shared by several apprentices**, so we never invent a needlessly complex or odd action just for variety | Actions stay cheap and readable, and they come from who the apprentice is; habits carry personality |
| Falling in battle | **Unchanged from the build:** a downed apprentice returns at 1 HP after a won fight; the trip is wiped when all are down (*Proposal*, not asked) | Keeps attrition as it is |
| Board size | **Per room, for narrative, not for party size** (this replaces §0's "about 7×9" and DESIGN §6.4's fixed 6×8). Rooms are re-laid with start points instead of the named Draughtsman and Stoker | The room shape serves the place and the foes |
| Starting spots | Each board defines **more than three start points** (at least four); the party's spots are **drawn at random, each time, from the trip seed** through the engine's seeded rng, so replays and tests stay deterministic. A smaller party uses a random subset. Foe telegraphs show immediately, as now | Authored safety plus variety; keeps the engine deterministic. Authors must keep every start point fair for a frail body (*tune by playing*) |

## 1. What stays open

- **The apprentices themselves** (body, action, lean, habit, starter page, how they join): designed with each district, not before.
- Which **basic actions** exist (Shove, Pull, Hop, Swap… are candidates only): each is decided with the apprentice it fits, and an existing action is reused when it suits the story. The **rules for habits** that bend a lattice's reading, and the third habit, are open.
- Which **notebook milestones** call a door arrival, and their pacing.
- **Board sizes and start-point count** per room; room re-laying and the Seam's three layouts per depth (*tune by playing*).
- Household shelf and portrait/token visuals for eight or nine apprentices, per-apprentice credit in the trip ledger and Lab, and the **save migration** for a household roster: a technical plan, not yet written.
- Whether a "copy page from…" helper is wanted once the roster grows.
- How the existing pair fits recruitment balance; their leans and habits are implemented as described above.
