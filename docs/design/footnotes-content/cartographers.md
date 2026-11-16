# Footnotes content: the Cartographers' hall (the Board)

> **State: Draft 2026-11-16 (CG-F2), awaiting the orchestrator's review at CG-G3.** Task CG-F2 of [cartographers-plan.md](../../plans/cartographers-plan.md) (Pack I; P5, P11). Rules: [footnotes.md](../footnotes.md) §1 and "Rival notes". Lines: `src/data/lines.ts` (the CG block; `swap:unit` is `pending`); audit: [footnotes-audit.md](../../plans/footnotes-audit.md) §13. Format and pair rules as in [seam.md](seam.md) §0, [bridges.md](bridges.md) and [foundry.md](foundry.md). Builds: CG-F3 (Swap, Draw, Erase) and CG-F4 (Quicksilver, Graphite, the Registrar's note) into `src/data/footnotes/cartographers.ts`.
>
> Nothing here is built. No variant data is written. Every number is *tune by playing*. Engine lines are sketches; the variant ids are final once approved.

## 0. How to read this

Same conventions as [foundry.md](foundry.md) §0: pair IDs `<Subject>-<meets>-<level>`, capstones `<Subject>-III`, options **a**/**b** with the variant ID they ship under (`<subject>-<slug>`, never changed once shipped), a **c** only for the rival's note. **Engine** is a one-line sketch; "no new event" means an existing event stamped with the slot's line carries it. **Combos** reads all four level I × level II pairings on the line (six on `erase:unit`, where the note adds a third level II option).

Costs (FN plan P3): level I and II pay in the line's district; every line here is `cartographers`. Capstones pay one Quicksilver and one Graphite.

**Vocabulary.** *Pencil* is a standable tile that carries a fate (`ink` or `rub`, due a round); the guild's hand resolves it at round end. *Blank* is a void: no unit stands there, nothing lands there, and whoever is carried onto it is erased from the fight. An *outline* is pencil carrying a foe; it is solid. To *un-draw* a tile is to turn it blank (Erase), and a unit on it is *erased from the fight* (a minion is gone, an elite takes 4 and loses its action, a member is hauled back at 1 HP on a win). *Meets*: a Swap "meets a hold" when the caster or the target is held.

**The `swap:unit` row** is final text, `pending`: the variants on it cannot be witnessed until CG-F3 stamps the `swapped` event (audit §13, Z4). **`Graphite-unit-II-a`** assumes the Graphite defect (audit Gr3) is fixed first (Z3).

### Review batches for CG-G3

| Round | Pairs | Build task |
|---|---|---|
| 1 | Erase: `erase:unit` (both levels) and the Registrar's note | CG-F3, CG-F4 |
| 2 | Erase: `erase:mark` | CG-F3 |
| 3 | Swap (both lines) | CG-F3 |
| 4 | Draw (both lines) | CG-F3 |
| 5 | Quicksilver, Graphite (both levels) | CG-F4 |
| 6 | Capstones: Swap, Draw, Erase, Quicksilver, Graphite | CG-F3, CG-F4 |

## 1. Margin lines

Two per rune (FN P1), one per solvent. Every line is a real, witnessable behaviour (FN P5).

| Subject | Margin lines | Note |
|---|---|---|
| Swap | `swap:held`, `swap:unit` | `swap:unit` is the pencil row added by CG-F1 (pending). Swap had one row before |
| Draw | `draw:jar`, `draw:drop` | `draw:drop` is the hall's line (blank paper). `draw:unit` and `draw:edge` stay unslotted: plain refusals with no second opinion worth having |
| Erase | `erase:unit`, `erase:mark` | `erase:unit` hosts the Registrar's note (level II). `erase:empty` (outlines), `erase:jar`, `erase:collar`, `erase:shackle` and `erase:deepMark` stay unslotted |
| Quicksilver | `quicksilver:edge` | Where the mirror lies is the one wiring question; `quicksilver:drop` (the mirrored un-draw) stays unslotted |
| Graphite | `graphite:unit` | Its one line |

## 2. The Board runes

### Swap

Headline: *The target and the caster trade places.*

**Swap-held-I** · `swap:held` (*A held unit will not change tiles, not even to trade places.*)

- a · `swap-held-around`: *A Swap aimed at a held unit trades with the nearest unit beside it instead, the first unheld one in reading order.*
  Engine: `runes/actions.ts::swap`, on the held refusal, retarget to the first unheld unit on the target's four neighbours (never the caster). Existing `held` and `swapped`, both stamped `swap:held`. A pinned foe becomes a way to reach the one beside it.
- b · `swap-held-slip`: *If you are held, your Swap still trades places, and your hold ends.*
  Engine: same site, a held caster passes and its `held` is cleared. Existing `swapped`. Swap as the way out of a Hold.

**Swap-held-II** · `swap:held`

- a · `swap-held-ease`: *A Swap that meets a hold lifts one turn off it.*
  Engine: same site, `held -= 1` on each held unit of the pair. No new event (the `held` event carries the new count).
- b · `swap-held-brace`: *A Swap that meets a hold gives you 1 shield.*
  Engine: same site, `damage.ts::gainShield` for the caster. Existing `shieldGained`. A refused Swap still pays.
- Combos: around + ease: the aimed unit's hold shortens by a turn and the Swap goes on around it. around + brace: shield, and the swap with the neighbour. slip + ease: your own hold ends outright, so ease acts on the other unit's hold only, if it is the held one. slip + brace: you break your hold, swap, and shield; the strongest pairing, fine as a choice. None needs a rule change.

**Swap-unit-I** · `swap:unit` (*Swap trades places, not paper: pencil stays on its tile, fate and all.*)

- a · `swap-unit-carry`: *A Swap trades the pencil too: each unit takes the pencil under it to its new tile, fate and all.*
  Engine: after `relocateAll`, `districts/cartographers/paper.ts` (new `carryPaper`) exchanges the two tiles' pencil pieces. Existing `swapped`. A rub-due tile is still under whoever stood on it: a swap that never changes anyone's paper.
- b · `swap-unit-strand`: *A foe your Swap leaves standing on pencil cannot move until your next turn.*
  Engine: same site, `held` on the foe through the existing `held` event. The Surveyor's trick, held by you: set a foe on pencil and pin it there.

**Swap-unit-II** · `swap:unit`

- a · `swap-unit-ink`: *The pencil you are left standing on by a Swap is inked in.*
  Engine: same site, the caster's tile turns plain paper through the existing `cartographers:inked`. A swap onto safe ground that stays safe.
- b · `swap-unit-rub`: *A foe your Swap leaves standing on pencil has that pencil rewritten to rub out this round.*
  Engine: same site, the pencil's data becomes `{ fate: 'rub', due: round }`. No new event. Turns the hand's own plan against the foe.
- Combos: carry + ink: your carried pencil is inked where you arrive, and the foe keeps its own paper; safe for you. carry + rub: the foe stands on its own carried pencil, which is rewritten to rub; fine. strand + ink: you on inked paper, the foe held on pencil; the trap pairing. strand + rub: a held foe on pencil rewritten to rub out this round, a sure erasure that costs two slots and needs the foe on pencil to begin with; the strongest, fine. None needs a rule change.

**Swap-III**
- a · `swap-cap-step`: *When a Swap finds nobody at its target, you step onto that tile instead, if it is empty paper within two tiles of you.*
  Engine: `actions.ts::swap`, the `!u` return: relocate the caster (`relocateAll`, cause `swap`) to a standable, unoccupied tile within two (never blank, never an outline). Existing `moved`. A free step you may aim; the headline stays "trade places".
- b · `swap-cap-pact`: *When you Swap with a friend, you both gain 1 shield.*
  Engine: after the swap, `gainShield` for both. Existing `shieldGained`. Needs a friend in the party (a household of one picks the other).

### Draw

Headline: *Moves what's on the target's tile (a state, a plate, a jar) one tile along the heading.*

**Draw-jar-I** · `draw:jar` (*A jar can be drawn to the next tile; it keeps its owner and what is sealed in it.*)

- a · `draw-jar-slide`: *A jar you Draw keeps going along the heading until the next tile holds a unit, a jar, blank paper or the edge.*
  Engine: `actions.ts::draw`, the hop loop continues for a jar while the next tile is free. Existing `drawn`, stamped `draw:jar`. A fuse thrown down a lane.
- b · `draw-jar-quiet`: *A jar you Draw arrives quietly: it does not open on arrival, even under a unit.*
  Engine: same site, the arrival (`objectArrives`) of the drawn jar is skipped. No new event. Move a step jar under a foe and keep it shut.

**Draw-jar-II** · `draw:jar`

- a · `draw-jar-trade`: *A jar you Draw onto another jar trades places with it.*
  Engine: `drawHop`, where `dst.jar` is set: exchange the two jar objects (each keeps its owner and contents). Existing `drawn`, twice.
- b · `draw-jar-claim`: *A jar you Draw becomes yours: it keeps what is sealed in it, and your name replaces its owner's.*
  Engine: same site, `jar.owner = caster` after the hop; it counts as your newest, so an older jar of yours may crumble (as a restored jar does). Existing `drawn`.
- Combos: slide + trade: a slide stops before a jar, so a trade happens only when the first tile already holds one, and the traded jar stops there. slide + claim: the jar is claimed where it ends. quiet + trade: both jars arrive quiet. quiet + claim: yours, and quiet. None needs a rule change.

**Draw-drop-I** · `draw:drop` (*Draw cannot carry a state or a jar onto blank paper, as at the board's edge.*)

- a · `draw-drop-over`: *A Draw hops over one blank tile to the paper beyond it, if that tile is free.*
  Engine: `drawHop`, when `dst` is blank: try the tile after it. Existing `drawn`. A bridge over a hole in the paper.
- b · `draw-drop-mend`: *A Draw refused by blank paper pencils the blank tile in, bare and unplanned.*
  Engine: `drawHop`'s refusal also writes the pencil piece (as `undrawOutline` writes one). No new event. The Draw still fails; the hole is paper again.

**Draw-drop-II** · `draw:drop`

- a · `draw-drop-yield`: *A Draw refused by blank paper gives you 1 shield.*
  Engine: same site, `gainShield` for the caster. Existing `shieldGained`.
- b · `draw-drop-spend`: *A state or jar a Draw is refused at blank paper is spent: it is gone, and the tile is inked in as paper.*
  Engine: same site, the carried state or jar is cleared and the blank tile is set to plain paper (no piece). Existing `stateFades` or `jarCrumbles`. The fix for a gap you cannot hop.
- Combos: over + yield: fires only when the gap is wider than one tile or the tile beyond is taken; a pair for rooms with long gaps. over + spend: spend is the answer to a gap `over` cannot clear. mend + yield: the hole is pencilled and you gain a shield; the Draw still fails. mend + spend: spend decides, so the tile ends inked and not pencil; reads as the stronger of the two on one tile. None needs a rule change; say in the text at build which happens "instead".

**Draw-III**
- a · `draw-cap-mix`: *When a Draw carries a state onto a tile that holds another state, the two mix as if you had landed it.*
  Engine: `drawHop`, where `dst.state` is set: pass the pair to `mix.ts` (the compound table) instead of refusing. Existing `mixed`. Draw becomes a way to mix Ink and Oil you already laid.
- b · `draw-cap-drag`: *When a Draw moves a state off a tile with a unit on it, the unit is drawn one tile along the heading too, if it is free.*
  Engine: after the hop, `push.ts` pushes the unit 1 (cause `draw`). Existing `push`. "A plate cannot go under a unit" still holds; the unit goes with the paint.

### Erase

Headline: *Removes the state, compound, mark or jar on the target; on unfinished paper, un-draws the tile.*

**Erase-unit-I** · `erase:unit` (*On unfinished paper, Erase un-draws the tile: whoever stands there is erased from the fight.*)

- a · `erase-unit-trace`: *A tile you un-draw is not lost: it turns back to bare pencil, and whoever stood on it is still erased.*
  Engine: `paper.ts::undrawPencil` writes the unplanned pencil piece instead of blank. Existing `cartographers:undrawn`. The hall keeps its floor; the foe does not keep its place.
- b · `erase-unit-wide`: *An Erase on pencil also un-draws every pencil tile touching the first.*
  Engine: `pencilStruck` repeats `undrawPencil` on the four neighbours that hold pencil. Existing `cartographers:undrawn`. A hole big enough for a crowd.

**Erase-unit-II** · `erase:unit`

- a · `erase-unit-spare`: *A party member standing on pencil you un-draw is not erased: she is set down on the nearest paper tile instead.*
  Engine: `undrawPencil`, for a member, relocates to the nearest standable free tile (the Graphite restore helper). Existing relocation event. Safe with a wide Erase.
- b · `erase-unit-sweep`: *The states and jars on the tiles beside an un-drawn tile are erased too.*
  Engine: after the un-draw, clear the neighbours' state and jar with `stateFades` and `jarCrumbles`. Existing events. The un-draw takes the scenery with it.
- c · `registrar:erase`: the Registrar's note (section 3). Hidden until his page is held.
- Combos: trace + spare: the tile stays pencil and a member standing on it is set down, not erased; the gentlest Erase. trace + sweep: pencil stays, the beside tiles are cleared; fine. wide + spare: members on any of the un-drawn tiles are set down. wide + sweep: sweep acts around every un-drawn tile; the widest clear, fine as a choice. trace + note and wide + note: the note's circle is on top of either; see F1.

**Erase-mark-I** · `erase:mark` (*Erase lifts a mark off; whatever the mark held is lost, never released.*)

- a · `erase-mark-clean`: *An Erase that lifts a mark also lifts the mark of every unit beside the target.*
  Engine: `actions.ts::erase`, after `spendMark`, repeats it on the four neighbours' units. Existing events, stamped `erase:mark`. Reach: the sweep.
- b · `erase-mark-release`: *A mark you Erase is released as it goes: whatever it held happens, then it is spent.*
  Engine: same site, `marks.ts::release` before `spendMark`. Existing `released`. Erase as a trigger, a cousin of Sentence for runs that want the mark's action, not its loss.

**Erase-mark-II** · `erase:mark`

- a · `erase-mark-ward`: *A friend whose mark you Erase gains 1 shield.*
  Engine: same site, `gainShield` on a member. Existing `shieldGained`.
- b · `erase-mark-reset`: *A bound mark you Erase comes back as a plain mark, its action gone.*
  Engine: same site, after the spend, a plain mark of the same depth is set (`marked`, unbound). Existing `marked`. Strip the Bind, keep the mark.
- Combos: clean + ward: each friend whose mark the sweep lifts gains a shield. clean + reset: every bound mark in reach is stripped to plain, none lifted. release + ward: the friend's mark releases (its action happens to them) and they gain a shield; useful with a harmless bound action. release + reset: the bound mark releases, then comes back plain; it fires once and stays, the strongest, fine as a choice. None needs a rule change.

**Erase-III**
- a · `erase-cap-through`: *When an Erase finds nothing to take, it acts on the next tile along its heading.*
  Engine: `actions.ts::erase`, when `holdsAny` is false and no paper piece answers, repeat on the next tile once (needs a heading). Existing events. A starved Erase falls through, like the Registrar's own fallback.
- b · `erase-cap-salvage`: *When an Erase un-draws a tile, the state or jar on it is not erased but drawn to the nearest paper tile.*
  Engine: `actions.ts::erase` reads the tile's pencil piece before it clears the tile (today the core clears state and jar first, audit Er3); moves them as `drawHop` does. Existing `drawn`. Un-draw the hole and save what was in it.

## 3. The Registrar's note

On **Erase, level II, slot `erase:unit`**, as a third option beside `erase-unit-spare` and `erase-unit-sweep` (the plan's default: "a third option on an Erase line"). Hidden until his page is held; still needs the slot's level and costs. Id `registrar:erase`, in the style of `postmaster:sentence` and `carillonneur:toll`.

- c · `registrar:erase`: *Struck from the register. An Erase on pencil circles the nearest foe to it; a circled foe still on its tile at round end is erased from the fight.*
  Credit line, in the household's hand under it: *Copied from the Registrar's register.*
  Engine: at the `erase:unit` stamp, add a one-round circle on that foe's tile (the same per-round object the Registrar's own *strike from the register* uses, RV P10; its holder is the household), lifted when the foe moves off. At the `late` slot (before the hand), a foe still on its tile is erased through `removeFromRoom(…, 'erased')`, the rule his circle already follows (a minion is gone, an elite takes 4 and loses its action). Existing `cartographers:circled` and `cartographers:struck`. No new harm beyond the erase the headline already names.

His page recovers *Bolt → Swap*, so the note sits on a rune beside it, not on a rune of the page: see F2. The idea is the Registrar's signature turned to the household's use: his round-end erasure, ready in your hand, answered the way his is (step off).

## 4. The solvents

### Quicksilver

Headline: *It also acts on the tile mirrored across the board.*

**Quicksilver-edge-I** · `quicksilver:edge` (*Quicksilver also runs the invention on the tile mirrored across the middle of the board.*)

- a · `quicksilver-edge-turn`: *Quicksilver mirrors top to bottom instead of left to right.*
  Engine: `solvents.ts::quicksilver.widen` mirrors `y` (`height − 1 − y`) instead of `x`. No new event. A tall board, a different pair of lanes.
- b · `quicksilver-edge-self`: *Quicksilver mirrors across you: the copy acts on the tile as far from you on the other side, if it is on the board.*
  Engine: `widen` takes the caster as an optional argument and reflects through it. No new event. The mirror travels with the caster.

**Quicksilver-edge-II** · `quicksilver:edge`

- a · `quicksilver-edge-middle`: *A target that is its own mirror is acted on twice, not once.*
  Engine: `widen` returns the tile twice where it returns it once today. No new event. The middle line pays double.
- b · `quicksilver-edge-spare`: *The mirrored copy passes over your own party.*
  Engine: the copy is tagged `mirror`; targets that are members are skipped for it. No new event. Safe with a wide invention.
- Combos: turn + middle: a target on the middle row acts twice. turn + spare: the copy skips members across the other axis. self + middle: "its own mirror" is the target on you, acted on twice; reads as a self-target double. self + spare: the copy often lands on friends, so spare is the natural pair. None needs a rule change.

**Quicksilver-III**
- a · `quicksilver-cap-rebound`: *When the copy would land on blank paper or off the board, it acts on the nearest paper tile on the mirror's side instead.*
  Engine: `widen` post-step: where `pieceVoid` is set or the tile is off the board, walk back toward the target to the first standable tile. No new event. The mirror no longer wastes itself on the hole.
- b · `quicksilver-cap-ward`: *When the copy would reach a party member, she gains 1 shield.*
  Engine: the copy tagged `mirror`, `gainShield` on a member it reaches (the action still lands unless `quicksilver-edge-spare` passes over her). Existing `shieldGained`. A mirror that steadies what it touches.

### Graphite

Headline: *What it changes is undone a round later.*

**Graphite-unit-I** · `graphite:unit` (*Graphite undoes the states the invention landed and the moves it made, a round later.*)

- a · `graphite-unit-late`: *Graphite waits one more round: it undoes at the start of your turn after next.*
  Engine: `solvents.ts::graphite.after` schedules one owner turn later. Existing `scheduled`. A number on "a round later" (F3): the paint stays a turn longer.
- b · `graphite-unit-stay`: *A unit whose home tile is taken when Graphite undoes its move stays where it is.*
  Engine: `undoBoard`, the `stuck` branch: keep the unit's tile instead of the nearest free one (the silent rule of audit §6). Existing `moveUndone` is skipped for it. No new event. A strict undo.

**Graphite-unit-II** · `graphite:unit`

- a · `graphite-unit-redraw`: *Graphite also puts back paper the invention un-drew: the tile returns as bare pencil.*
  Engine: `boardNow` also records tile pieces; `undoBoard` writes the unplanned pencil piece for a tile that was drawn and is now blank, and the undo is scheduled when only paper changed. Existing `cartographers:undrawn` reversed as a `stateFades`-style event (CG-F4 names it). Needs Z3 first. Undoes what Erase did to the hall.
- b · `graphite-unit-shield`: *Each unit Graphite sets back on its home tile gains 1 shield.*
  Engine: `undoBoard`, after `relocateAll`, `gainShield` for each unit that moved. Existing `shieldGained`. The undo steadies whoever it moves.
- Combos: late + redraw: the paper comes back a turn later too. late + shield: the shield comes with the late undo. stay + redraw: fine; paper is not a unit move. stay + shield: only units that actually go home are shielded; one that stays gets none. None needs a rule change.

**Graphite-III**
- a · `graphite-cap-trace`: *Graphite also undoes the marks and jars the invention placed.*
  Engine: `boardNow` records marks and jars; `undoBoard` clears the ones that were not there (`erased`, `jarCrumbles`). Existing events. Graphite with Ink or a Jar: a delay that takes it all back.
- b · `graphite-cap-rescue`: *A party member the invention moved who is erased from the fight before the undo is set back on her home tile at 1 HP instead.*
  Engine: `outOfRoom.ts::removeFromRoom` for a member consults the scheduled Graphite entries; if she has one, she is placed at home at 1 HP with the existing `moveUndone`. Bends the erasure of a member (a Strong task; F4). Swap onto rub-due pencil, and let the graphite bring you home.

## 5. Counts

- **Runes:** 6 margin lines (Swap 2, Draw 2, Erase 2); 12 level I/II pairs; 3 capstone pairs.
- **Solvents:** 2 margin lines; 4 level I/II pairs; 2 capstone pairs.
- **Total pairs:** 21 (16 line pairs, 5 capstone pairs). **Variants:** 42 plus the Registrar's note (every id above).
- **Clashes noted:** around + ease and slip + ease (Swap), strand + rub (Swap), over + yield and mend + spend (Draw), release + reset (Erase), stay + shield (Graphite). None needs a rule change.
- **New engine pieces:** one stamp (the `swapped` event for `swap:unit`); a `carryPaper` helper in `paper.ts`; a jar-trade and a claim in `drawHop`; the pencil piece written by `undrawPencil` and a neighbour sweep; a `mirror` tag and an optional caster argument on `widen`; `boardNow` records pieces, marks and jars; one `removeFromRoom` read for `graphite-cap-rescue`. No new `Meets` value, no new event type.

## 6. Defining words

The IQ-FG and BR-G1 rule: no variant undoes the one rule a subject is named for.

- **Swap** trades the caster's place with the target's. `swap-held-around` changes who is traded with, `swap-held-slip` who may; no variant lets a Swap leave both where they stood, and `swap-cap-step` adds a move only when nobody is there.
- **Draw** moves what is on a tile one tile. `draw-jar-slide` and `draw-drop-over` change how far; none removes the move, and `draw-cap-mix` and `-drag` add to it.
- **Erase** removes, and on paper un-draws. `erase-unit-trace` keeps the paper but still erases the unit; `erase-mark-release` changes what a lifted mark does, never whether it is lifted; no variant makes an Erase leave what it names.
- **Quicksilver** copies onto the mirrored tile. Its variants change where the mirror lies and who the copy reaches; none removes the copy.
- **Graphite** undoes a round later. `graphite-unit-late` changes the number, which levels I and II may; no variant removes the undo.

## 7. Proposals

| # | Proposal | Reason |
|---|---|---|
| F1 | CG-G3 to weigh the Registrar's note against `erase-unit-spare` and `-sweep`: his circle erases a foe anywhere at round end, with no pencil under it, which neither authored option does. Either accept it as the rare end, or trim it to "a foe on pencil" so it needs the paper | A rival's note should not be a straight upgrade (footnotes.md §1) |
| F2 | The note is on **Erase** (the plan's default) although his page recovers *Bolt → Swap*; footnotes.md says a note is "a variant of a rune on that page". Either keep it (his signature is erasure and his kit has Erase), or move it to level II of `swap:unit` and reword | The brief and the plan say Erase; the design text says a rune of the page |
| F3 | `graphite-unit-late` changes a number in a defining sentence ("a round later") | Levels I and II may change numbers (IQ-FG); the rule, an undo, stays |
| F4 | `graphite-cap-rescue` reads the erasure of a member (`removeFromRoom`) and is the heaviest variant here; CG-F4 may swap it for one that reads only the Graphite entry and say so in its report | A footnote must not change a rule it did not touch |
| F5 | `registrar:erase` needs the Registrar's circle as an object a household can hold; if Pack D's circle is Registrar-only, CG-F4 builds a smaller one-round erase mark and says so | The note is a draft until the circle API is read |
| F6 | `swap-cap-pact` needs a friend and `draw-jar-claim` a jar not yours; each is rare in a solo household | A trio is the usual party; a household of one picks the other capstone |
