# The bathhouses: the grand thermae

> **Status: Decided** (design rounds 2026-10-22; not built). Roadmap: BL-114. Part of the one-district-at-a-time design pass ([district-ink-makers.md](district-ink-makers.md) was first); individual apprentices are designed after every district ([party.md](party.md) §0b).
> Summary and decision log: [DESIGN.md](../../DESIGN.md) §6.7 and §11. Frame: [city-and-districts.md](city-and-districts.md) (layers in §4). School and runes: [rune-design-final.md](rune-design-final.md) §5.2 and §11. Rival rules: [rivals.md](rivals.md).
> Names are placeholders until BL-40. Numbers are *tune by playing*.

**One-liner:** vaulted bath-halls bigger inside than out, where bathers who stay too long become part of the steam. Every room has a **pressure gauge**: the more cloud on the board, the nearer a **boil-over** that storms everyone in the cloud, you included. The **heat rises** each room, and the school (Areas) is about growing exactly those clouds.

## 0. Decisions (2026-10-22)

| Layer | Decision | Why |
|---|---|---|
| Place | **The grand thermae**: vaulted bath-halls with mosaics, long pools and attendants in white; every door opens onto a larger hall. (Chosen from the laundries, the cure-house and the pump-house.) | Big, lush rooms give clouds room to grow |
| Guild and lean | A **bathhouse guild** (name later, BL-40), lean **Steam**, school **Areas** (Vat, Seep, Steep; no method; solvents Bath salt and Fog jar; idiom Steam Room) | Unchanged from [city-and-districts.md](city-and-districts.md) §0a and the rune design |
| Uncanny touch | **People who stay too long become part of the steam.** The dissolved bathers are those who did | Ties the foes, the place and the cloud rule together |
| Lore thread | **The Seam's chimney:** the steam vent in the Seam is the thermae's chimney; the owner's drawing welded the canals, the ink-makers' quarter and the baths there. Rooms hold a bather's ledger with the owner's name in it | Answers why the Seam grinds wrongly; connects three districts (BL-41) |
| Board rule | **Boil-over.** Each room shows a pressure gauge: the more cloud on the board, the higher it rises. At the top the room **storms every unit standing in any cloud** (the Storm result, 2) and the gauge resets. Foes and your apprentices alike: herd foes into steam and keep your trio out, or vent early by shoving, burning or splitting clouds | Big clouds are both your weapon and a ticking bomb; reuses the existing Storm |
| Trip shape | **The heat rises:** each room is hotter than the last, so the gauge fills faster and vents puff more. **Return is free after any room.** Loot offers include a **cold plunge** that cools the next room at the cost of another pick | A pace-setter distinct from the canals' landings and the quarter's terms |
| What the heat gives | **Better offers as it climbs:** hotter rooms offer richer loot (the school's runes and solvents later and better, a second pick at the top). Push-or-return becomes whether you can take another hotter room | Risk comes with reward, so the heat is worth pushing into |
| Foes | **The steam's people:** the **dissolved bather** (moves instantly along any connected cloud, solid only when it steps out), the **attendant** (shoves a unit 2 tiles toward the nearest edge, wall or unit, using the push and crush rules on you) and the **boilerman** (feeds a vent each round, raising the pressure) | Each one changes how you read the cloud; all three use the district rule |
| Trip length | **Four rooms and the heart:** heat 1 to 4, with the heart the hottest room | Matches the quarter; the cold plunge becomes a real choice by room 3 |
| Heart | **The Bath-Steward**, a rival inscriber ([rivals.md](rivals.md)). Signature trick: **he steams away.** When hit inside a cloud he disperses and re-forms anywhere in that connected cloud, so you must cut the cloud network (shove, burn or split it) to hurt him | Reads as a puzzle on the district's own rule |
| Hearing | **A storm that hits three units:** in the Seam, one Spark through a steam cloud damages 3 or more units at once. The owner's hand inks in the thermae with a line about steam that remembers who stood in it | Teaches Storm, the basic area result |
| Gate | **Threshold room, "fill the dome":** a free, retryable board with a pressure gauge and a marked line; grow the cloud (Vat, Seep or any basics) until the gauge reaches the line and the dome door pops | Teaches boil-over before you enter |

## 1. Proposal defaults (*tune by playing*)

| Topic | Default |
|---|---|
| Heat | Four levels, one per room; each level fills the gauge faster and adds vent puff. The heart runs at level 4 |
| Cold plunge | An offer that costs a pick and cools the next room by one level. It cannot cool below level 1 |
| Offers by heat | Vat, Seep and Steep appear in ordinary offers from heat 1–2; the solvents Bath salt and Fog jar from heat 3–4; heat 4 also offers a second pick. Exact placement at build time |
| The gauge | Always visible beside the board; fills by cloud tiles plus vent puff; storm damage as the Storm result (2). A boil-over does not break the 500-event cast cap because it happens in the round-end phase |
| Foe numbers | Sized like the canals' foes at build time. The dissolved bather is solid and killable when it steps out; the boilerman is a priority target |
| Rival dependency | The Bath-Steward is built after the **Lab rival prototype (BL-30)**; until then the district may ship with a scripted stand-in heart, decided in the build plan |
| Idiom | Steam Room (one compound over 6+ tiles) is the district's signature; with boil-over, a Steam Room is also a bomb |
| Apprentice | **The towel-bearer** (Pull, steam never hurts her and the boil-over skips her), a loot offer at a landmark room ([party.md](party.md) §2) |

## 2. Still open

- Rune and solvent placement, Areas fine-print lines and the Steam Room scenario (BL-101).
- The Bath-Steward's lattice, locked-aim telegraph, starved-chain fallback and how re-forming within a cloud is shown (BL-30).
- Layouts (three per depth), terrain art for pools and mosaics, the bather's-ledger texts, and the gauge UI on a phone-sized board.
- How heat and gauge interact in the engine (heat as a multiplier or a vent schedule).
