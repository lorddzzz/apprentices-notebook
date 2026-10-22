# The ink-makers' quarter: the dead-letter office

> **Status: Decided** (design rounds 2026-10-22; not built). Roadmap: BL-113. Part of the one-district-at-a-time design pass; the other districts and the individual apprentices follow ([party.md](party.md) §0b says apprentices are designed once every district has its design).
> Summary and decision log: [DESIGN.md](../../DESIGN.md) §6.7 and §11. Frame: [city-and-districts.md](city-and-districts.md) (layers in §4; this district is #3–6 of the seven). School and runes: [rune-design-final.md](rune-design-final.md) §11. Rival rules: [rivals.md](rivals.md).
> Names are placeholders until BL-40. Numbers are *tune by playing*.

**One-liner:** the Notaries' quarter is a vast **dead-letter office** where every unsent letter holds a promise nobody kept. Contracts become physical: floor tiles that watch and act (writs), loot offered **with terms**, and a postmaster who serves you a contract with a clock.

## 0. Decisions (2026-10-22)

| Layer | Decision | Why |
|---|---|---|
| Place | **The dead-letter office**: sorting halls of undelivered letters, wax seals, brass tubes, sand trays for blotting. (Chosen from the vat rows, the court of small print, the binding-ink works, the debtors' exchange and the sponging-house.) Wax and Sand, the district's solvents, come straight from it | A place built around promises that were never kept; the solvents belong to the room |
| Guild and lean | **The Notaries**, lean **Ink** (as the district table has it), school **Contracts** | Unchanged from [city-and-districts.md](city-and-districts.md) §0a |
| Uncanny touch and lore | **Letters to the owner**: among the undelivered mail are letters addressed to the owner in the Cartographers' hand; their expulsion notice is here, never delivered. Pieces are found across the rooms (BL-41 lore delivery) | A real lore thread that points at the final district |
| Board rule | **Writs: conditional floor tiles.** Printed tiles watch for a condition (a unit enters, ends a turn, is hit) and then act. Foes and apprentices can both set them off. They mirror what the school's runes do on your lattice | Teaches "if this, then that" on the board |
| Writ kinds | **Return to sender** (a unit or parcel on or pushed onto a stamped tile is sent back to its start tile of the round), **Forwarding** (a tile passes damage or a mark from whoever stands on it to a unit elsewhere), **Standing order** (a tile marks whoever ends a turn on it). *Opened by a death* was not chosen and stays out | The three the player liked; each is readable and works with Shove, Strike and marks |
| Trip shape | **Offers with terms.** Loot offers here may come with a contract: a better reward now, a condition to meet. The term is shown clearly before you sign | Contracts as a decision, a new flavour of push or return |
| What a term stakes | **The reward itself** (break the term and it is taken back), **trip resources** (HP, charges, ink you hold this trip) and **the next room** (a mark at the start, an extra foe, a seal on a tile; never beyond a normal room's difficulty band). *A debt carried into a later offer* was not chosen | Three stakes that are all visible before signing and end with the trip |
| Going home | **A signed term blocks going home** until it is paid or broken; you may still push on | Contracts bind you. Strong push-or-return tension; wipe risk, so terms must be clearly fair (*tune by playing*) |
| Treasures | **The rare ones come only with a term:** the Bind method page and the solvents (Wax, Sand). The common school runes (Sentence, Levy, Tally) come in ordinary offers. Break a term and you lose the reward, but you can retry on another trip | A tempting optional risk; the school still stands on Seam basics alone |
| Foes | **The postal staff:** the **Sorter** (walks the floor and forwards a mark from one unit to another), the **Sealer** (stamps a wax seal onto a tile that holds whoever stands there) and the **dead letter** (a fluttering paper minion addressed to the nearest apprentice; it bursts on delivery). Each has one telegraph | Clear roles; the Sorter makes marks matter |
| Trip length | **Four rooms and the heart** (five fights in all, no landings: the terms decide when you can go home) | Short, because an unpaid term stops you returning |
| Heart | **The postmaster**, a rival inscriber (see [rivals.md](rivals.md)). Signature trick: **a contract with a clock.** Mid-fight he serves a visible writ ("pay by round 4": break his seal, or stand a unit on his stamp) or every mark on the board collects at once | Telegraphed and readable; the whole fight is a term you can meet or break |
| Hearing | **A cross-apprentice debt in the Seam:** mark a foe with Ink and have a **different apprentice's** cast hit it in the same turn. Back home a letter, returned to sender, lands in the attic. Uses starting basics and teaches that casting order between apprentices is the combo | The first lesson of Contracts and of the party |
| Gate | **Threshold room, "return to sender"**: a free, retryable board with no enemies. A dead letter lies on the floor; shove it onto the stamped tile and it flies back to its sender's desk, opening the door. Uses the Shove everyone has | The most visible writ, solvable with any build |

## 1. Proposal defaults (*tune by playing*)

| Topic | Default |
|---|---|
| Writs by room | Room 1 return to sender; room 2 adds standing order; room 3 adds forwarding; room 4 all three; the heart uses the postmaster's clock writ on top |
| Foe numbers | Sorter, Sealer and dead letter sized like the canals' foes (set when the district is built); the dead letter is paper, so fire kills it and the burst leaves a mark of ink on its tile |
| Terms | Examples: "clear the next room within N rounds or the page is taken back"; "start the next room with one of you marked"; "stake 2 ink from this trip for a second page". The player always sees reward, condition and penalty first; a term can be refused |
| Rival dependency | The postmaster is built after the **Lab rival prototype (BL-30)**. Until then the district may ship with a scripted stand-in heart, a decision for the build plan |
| Recovered page | Beating the postmaster follows the BL-118 reward format once that exists |
| Door recruit | None designed here. Apprentices are designed after every district ([party.md](party.md) §0b) |

## 2. Still open

- Exact rune/offer placement (which room offers Sentence, Levy, Tally, Bind and the solvents), the fine-print lines for Contracts and the Debt Collection idiom scenario (BL-101).
- The postmaster's lattice, locked-aim telegraph and starved-chain fallback (BL-30), and the clock-writ UI.
- New terrain art, the ten-plus room layouts (three per depth, as elsewhere) and the Letters-to-the-owner texts.
- How terms are saved in a trip (the engine needs a "term" object with a condition, a stake and a deadline).
