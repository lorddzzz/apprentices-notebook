# The bridges: the arches in the fog

> **Status: Decided** (design rounds 2026-10-22; not built). Roadmap: BL-115. Part of the one-district-at-a-time design pass ([district-ink-makers.md](district-ink-makers.md), [district-bathhouses.md](district-bathhouses.md) came first); individual apprentices are designed after every district ([party.md](party.md) §0b).
> Summary and decision log: [DESIGN.md](../../DESIGN.md) §6.7 and §11. Frame: [city-and-districts.md](city-and-districts.md) (layers in §4; keys in §3.2). School and runes: [rune-design-final.md](rune-design-final.md) §5.2 and §11. Rival rules: [rivals.md](rivals.md).
> Names are placeholders until BL-40. Numbers are *tune by playing*.

**One-liner:** ancient aqueduct arches stepping across white nothing, with the drop hidden in fog so the floor feels thin. Each room's span **stands only while it is connected to a pier**; cut the link and the cut-off section falls with everything on it. A fallen apprentice is out of the fight until the room ends.

## 0. Decisions (2026-10-22)

| Layer | Decision | Why |
|---|---|---|
| Place | **The arches in the fog**: aqueduct arches across white nothing, the drop hidden in mist; quiet and vertiginous. (Chosen from the toll-bridges, the masons' scaffold-spans and the chain bridges.) | A thin floor with real stakes |
| Guild and lean | **The bridge-wardens**, lean **height** (the drop), school **Structure** (Hold, Brink, Lay; the Bind *pushed* event; solvents Mortar and Chalk; idiom The Long Drop) | Unchanged from [city-and-districts.md](city-and-districts.md) §0a and the rune design |
| Uncanny touch | **You can't see what the arches carry water to.** Spans lead to places that aren't there | Stone spans to nowhere, as the district theme says |
| Lore thread | **Spans to the Cartographers' places:** the wardens' ledgers show they build spans to places the Cartographers drew, before those places existed. One long-abandoned span leads toward the Seam, the owner's drawing. Points straight at the final district and the owner's expulsion | Ties the city's wrongness to the last guild (BL-41) |
| Board rule | **Piers: unsupported spans fall.** A span stands only while it is connected to a pier (a solid tile). Break the link (a crush, a burst, a pushed pier-stone) and the cut-off section **falls at round end**, with everything on it. Cracks show which sections are cut. Works like clouds and brass: a network you can cut | Makes the Long Drop a plan, not an accident |
| Falling: apprentices | **An apprentice who falls is out of the room until its end**, and is hauled back at 1 HP when the room is won (the same as a downed member). A collapse that drops the whole party is a wipe | A fall is a real sacrifice, and the collapse is telegraphed by cracks so you can walk off |
| Falling: foes | As built: a dropped minion is gone; an elite takes 4 and loses its next action | Keeps the existing drop rule for foes |
| Trip shape | **Choose your span.** After each room you pick one of two spans: a **sound long** span (more foes, solid floor) or a **crumbling short** one (fewer foes, few piers, better loot). **Return is free after any room** | A route-and-risk choice that is different from the other districts' pacing |
| Trip length | **Five rooms and the heart**, so four span choices before the heart | A long span network with variety in the choices |
| Foes | **The wardens' staff:** the **Warden** (holds a unit in place with a chalk circle, so you can't walk off a crumbling span), the **Gargoyle** (flies, immune to drops, grabs an apprentice and carries it toward the edge; its target is telegraphed) and the **Mason** (rebuilds a fallen tile or lays a new pier each round, so protect it or hunt it) | All three act on piers and drops |
| Heart | **The Chief Warden, a rival on the keystone** ([rivals.md](rivals.md)). Signature trick: **right of way:** he can't be pushed or held and can't fall while the keystone stands. He fights from the great arch's keystone, which is his pier: crush and burst it to bring him down, and felling him brings the bridge down | The most dramatic finale; the district's rule is the boss |
| Hearing | **Perform The Wall** in the Seam: a slide that ends in a crush (a named idiom). The owner's hand inks in the bridges with a line about stone that holds because it was pushed against | Uses an idiom and teaches push and crush, which the district runs on |
| Gate | **A key from the canals:** "the wardens' pass", a loot offer deep in the canals (taken instead of a rune, **lost on a wipe**, banked at home). The first key in the game. The map hints where to look | Pulls you back into an old district and sharpens push-or-return |

## 1. Proposal defaults (*tune by playing*)

| Topic | Default |
|---|---|
| Collapse timing | A section cut from every pier is marked cracked at once and falls at the end of that round, after the enemies act. Telegraphed foe actions are fixed beforehand, so foes don't dodge. The cutter must move off, or sacrifice |
| Edge policy | Bridge rooms' edges are drops; the Seam and canals keep their walls and water. The drop-edge flag already exists (`EdgeRule`) |
| The two spans | Each room has a "sound" and a "crumbling" variant; the trip seed chooses the layouts. Crumbling spans have fewer piers and the Mason is rarer |
| The keystone fight | The keystone is a pier with its own HP that crush and bursts wear down. When the Chief Warden dies, the bridge falls **after the win**: no fall penalty for the party |
| The key offer | Only after the bridges are heard; at most one key per trip; offered in the canals' deeper rooms; never again once banked |
| Foe numbers | Sized like the canals' foes at build time; the Gargoyle is the district's only flier |
| Rival dependency | The Chief Warden is built after the **Lab rival prototype (BL-30)**; until then the district may ship with a scripted stand-in heart, decided in the build plan |
| Door recruit | None designed here ([party.md](party.md) §0b) |

## 2. Still open

- **Resolved (2026-10-22):** the "out of the room" fall is bridges-only; the canals keep the old drop (member takes 4, stunned), see [city-and-districts.md](city-and-districts.md) §5b.
- Rune and solvent placement, Structure fine-print lines and the Long Drop scenario (BL-101); the Bind *pushed* event page.
- The Chief Warden's lattice, locked-aim telegraph, starved-chain fallback and right-of-way presentation (BL-30).
- Layouts (three per depth, sound and crumbling variants), fog and crack art, mason's-ledger texts, and how a cracked section is shown on a phone-sized board.
- How piers and the connected-support check live in the engine (the cut-off section is computed like a connected cloud).
