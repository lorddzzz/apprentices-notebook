# The bell foundry: the carillon towers

> **Status: Decided** (design rounds 2026-10-22; not built). Roadmap: BL-116. Part of the one-district-at-a-time design pass ([district-ink-makers.md](district-ink-makers.md), [district-bathhouses.md](district-bathhouses.md) and [district-bridges.md](district-bridges.md) came first); individual apprentices are designed after every district ([party.md](party.md) §0b).
> Summary and decision log: [DESIGN.md](../../DESIGN.md) §6.7 and §11. Frame: [city-and-districts.md](city-and-districts.md) (layers in §4). School and runes: [rune-design-final.md](rune-design-final.md) §5.2 and §11. Rival rules: [rivals.md](rivals.md).
> Names are placeholders until BL-40. Numbers are *tune by playing*.

**One-liner:** a forest of belfries (stairs, ringers' galleries, ropes and clockwork) with quiet tuning halls inside, where bells ring a tune the streets obey. Rooms hold **bells of two or three tones**: strike one and every bell of the same tone rings. Each room hides an optional **great bell**; every one you ring hangs in the heart and tolls for you.

## 0. Decisions (2026-10-22)

| Layer | Decision | Why |
|---|---|---|
| Place | **The carillon towers, with the tuning halls** (more of the towers): belfry stairs, ringers' galleries, rope and clockwork, with the long quiet halls of hung bells inside the later rooms. (Chosen from the casting floors and the cracked-bell yard too.) | Vertical and musical, with a quiet counterpoint |
| Guild and lean | **The bell foundry guild** (name later, BL-40; the Bellwrights?), lean **brass**, school **Resonance** (Toll, Coil, Unison; no method; solvents Rivet and Filings; idiom Peal) | Unchanged from [city-and-districts.md](city-and-districts.md) §0a and the rune design |
| Uncanny touch | **The bells ring a tune that the streets obey, and a wrong note moves a street.** In the tuning halls, sound is solid: you can lean on a chord | The foundry's job in the city, felt on the board |
| Lore thread | **The Seam has no bell.** The bells anchor the Cartographers' drawn streets and the Great Bell's tune is the city's map. The Seam, the owner's own drawing, has no note in it, so it is the one place that drifts. This is why the Seam grinds wrongly and why the owner was dangerous to the guild (BL-41) | Connects the foundry to the Seam and the final district |
| Board rule | **Sympathetic bells.** Rooms have bells of two or three **tones** (colour and pattern). Strike any bell and **every bell of the same tone rings**; each ringing bell pulses on its own neighbours. The bells needn't touch, so a net of rings spreads across the room | Clearly different from Conduct, where Spark runs along **connected** brass and hits units on or touching it; this network is by tone, across gaps, and its effect is the bells' own pulse |
| Trip shape | **A peal across the trip.** Each room hides **one optional great bell** with its own small challenge. Every great bell you ring hangs in the heart's tower and tolls for you there; skipping is allowed, but the more you rang, the bigger your finale. **Free return after any room** | A reason to push on and look around, with a payoff at the end and no extra currency |
| Great-bell challenges | **A small authored puzzle per room**, each teaching something about the school: ring it with a Unison, tone-match two bells, toll a Peal across 3+ tiles, reach it across a gap | Varied, and a teaching tool |
| Foes | **The ringers' staff:** the **Ringer** (stands on a rope tile and rings a bell each round; the pulse is telegraphed), the **Tuner** (retunes one bell to another tone, spoiling your plan) and the **Clapper** (a walking bell that rings its own tone whenever it's struck, so hitting it sets off its sympathetic bells) | Each acts on the tone network |
| Heart | **The Carillonneur at the Great Bell,** a rival ([rivals.md](rivals.md)) fighting from the Great Bell. Signature trick: **he plays a tune.** Each round he rings one note of a visible **four-note tune**; finish it and the **Great Peal** rings every bell at once. You break the tune by muting bells, retuning, or silencing him. The tune is the countdown | The richest combination with the great bells |
| Your bells at the heart | **Allied bells you can ring.** Each great bell you rang hangs in the heart as a board piece you can strike once per round (an apprentice's cast or shove), and it rings its tone, so sympathetic bells pulse everywhere. More bells, a bigger network, a bigger finale; they can counter-toll the Great Peal | Interactive and rewarded by play |
| Hearing | **A conducted burst hitting three units:** in the Seam, one Spark conducted through connected brass damages 3 or more units at once. The owner's hand inks in the foundry with a line about a note that carries | Teaches Conduct, the network result the foundry then twists |
| Gate | **Threshold room, "the far bell":** a free, retryable hall with two bells of the same tone far apart. Strike the near one (a shove or a hit) and the far one rings, tripping the door | Teaches sympathetic rings before you enter and works with any build |

## 1. Proposal defaults (*tune by playing*)

| Topic | Default |
|---|---|
| Trip length | **Four rooms and the heart:** four great bells match the Carillonneur's four-note tune. Free return after any room |
| The bell piece | A bell is a solid one-tile board piece (it blocks like a plate). It is struck by any damage, push or Spark landing on it. Its pulse is 1 damage and a 1-tile push away from the bell on each of its 4 neighbours |
| Tones | Two tones in early rooms, three later. Tones use colour **and** a pattern, so they read without colour. A tone's network is every bell of that tone on the board |
| Unison, Peal | Unison (an apprentice's cast landed on this target this turn) and Peal (one burst tolled across 3+ tiles) are the school's signature plays; the rung great bells and the Great Peal use the same ring rule |
| Foe numbers | Sized like the canals' foes at build time; the Tuner is the priority target |
| Rival dependency | The Carillonneur is built after the **Lab rival prototype (BL-30)**; until then the district may ship with a scripted stand-in heart, decided in the build plan |
| Apprentice | **The tuner** (Swap, her Unison also counts a cast landing beside the target), a loot offer at a landmark room ([party.md](party.md) §2) |

## 2. Still open

- Rune and solvent placement (Rivet and Filings, Toll, Coil, Unison), the Resonance fine-print lines and the Peal scenario (BL-101).
- The four great-bell puzzles and their rooms; the Carillonneur's lattice, locked-aim telegraph and starved-chain fallback (BL-30), and how the four-note tune is shown.
- Layouts (three per depth), bell, rope and tuning-hall art, and how tones read on a phone-sized board.
- How tone networks and rung bells live in the engine (rung bells are persistent trip state carried into the heart).
