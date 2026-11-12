# Footnotes content: the bridges (Structure)

> **State: Approved 2026-11-12 at BR-G1** (orchestrator review, design window; the decisions are in §8). This text is the spec for BR-19a (Hold, Brink, Lay) and BR-19b (Mortar, Chalk, the Chief Warden's note). Drafted 2026-11-06 by task BR-18 of [bridges-plan.md](../../plans/bridges-plan.md). Rules: [footnotes.md](../footnotes.md) §1 and "Rival notes". Lines: `src/data/lines.ts` (BR-17 block); audit: [footnotes-audit.md](../../plans/footnotes-audit.md) §10. Format and pair rules as in [bathhouses.md](bathhouses.md) §0 and [seam.md](seam.md) §0. Builds: BR-19a and BR-19b into `src/data/footnotes/bridges.ts`; the Chief Warden's note in BR-19b (his rival and page are BR-20's, merged).
>
> Nothing here is built yet. Every number is *tune by playing*. Engine lines are sketches; the variant ids are final.

## 0. How to read this

Pair IDs `<Subject>-<meets>-<level>`, capstones `<Subject>-III`, options **a**/**b** with the variant ID they ship under (`<subject>-<slug>`, never changed once shipped). **Combos** reads all four level I x level II pairings (six where the rival note adds a third level II option). Level I and II pay in the line's district (`bridges`); capstones pay one Mortar and one Chalk.

### Review batches for BR-G1

| Round | Pairs | Build task |
|---|---|---|
| 1 | Hold (both lines), Brink (both lines) and the Chief Warden's note | BR-19, BR-20 |
| 2 | Lay, Mortar, Chalk | BR-19 |
| 3 | Capstones: Hold, Brink, Lay, Mortar, Chalk | BR-19 |

## 1. Margin lines

Only lines the audit made real; none is invented to host a slot (FN P5).

| Subject | Margin lines | Note |
|---|---|---|
| Hold | `hold:held`, `hold:cracked` | `hold:cracked` is the district's set piece (audit Ho1) |
| Brink | `brink:cracked`, `brink:drop` | `brink:drop` hosts the Chief Warden's note (level II). `brink:edge` stays unslotted: a walled-room trap with no second opinion worth having (see Proposals) |
| Lay | `lay:cracked` | **One line only**: the audit found no second real Lay behaviour (La2, La3 are plain). Short of the 2-per-rune target on purpose |
| Mortar | `mortar:unit` | One existing line; the terrain cases (audit Mo1-Mo3) have no line of their own |
| Chalk | `chalk:network` | One existing line (audit Ch1) |

## 2. The Structure runes

### Hold

Headline: *The target can't change tiles until your next turn, not even by a push.*

**Hold-held-I** · `hold:held` (*Holding a unit that is already held does not stack; it only keeps the longer hold.*)

- a · `hold-held-extend`: *A second Hold on a held unit adds one turn: held through your turn after next.*
  Engine: `actions.ts::hold` adds 1 to the remaining hold when one exists, at most 2 extra in all. No new event (stamps `hold:held` on `held`). Lockdown.
- b · `hold-held-pass`: *A second Hold on a held unit is not wasted: it passes to the nearest unit beside it.*
  Engine: same site, retargets to the first unheld neighbour (reading order). No new event. Spreads the pin; may pin an ally, say so.

**Hold-held-II** · `hold:held`

- a · `hold-held-exposed`: *A unit held twice takes one step more from every hit until it is free.*
  Engine: a `held` count of 2 or more raises incoming power by 1 (the Mark step). No new event. A pinned target is a target.
- b · `hold-held-shake`: *A unit held twice is freed at your next turn and cannot be held again for a round.*
  Engine: sets a one-round immunity at release. No new event. The answer to a lock you do not want.
- Combos: extend + exposed: a long pin that hurts more each hit; the strongest, fine as a choice. extend + shake: the long pin ends in a safe window; reads well. pass + exposed: the second target is held once, so not exposed; say "twice" at build. pass + shake: fine.

**Hold-cracked-I** · `hold:cracked` (*A unit held on a cracked span cannot step off before dusk, so it falls with the stone.*)

- a · `hold-cracked-lean`: *Hold leans on the stone too: a cracked tile you hold waits one more dusk before it falls, once.*
  Engine: `collapse.ts` skips a cracked tile whose occupant carries a fresh hold stamp, the first time. Stamps `hold:cracked`. Buys a round; the span is not saved.
- b · `hold-cracked-pinned`: *A unit held on a cracked span takes one step more from every hit until the fall.*
  Engine: same raise as Hold-held-II-a, keyed to the cracked tile. No new event. Finish what you pin.

**Hold-cracked-II** · `hold:cracked`

- a · `hold-cracked-spare`: *A member held on a cracked span is lowered onto the nearest standing tile at dusk instead of falling.*
  Engine: `collapseStep` moves a held member to the nearest sound span or pier tile before the fall (reading order ties). No new event (`moved`). Hold becomes safe for your own.
- b · `hold-cracked-knot`: *Hold also holds the units beside the target on the same cracked span.*
  Engine: `hold` widens to neighbours that stand on a cracked tile. No new event. Pins the whole knot, allies included.
- Combos: lean + spare: the crack waits a dusk, your held member is lowered later; fine. lean + knot: a long wait for the knot to fall; fine. pinned + spare: the foe is exposed, the member is saved, the usual use; reads well. pinned + knot: every pinned unit is exposed, yours too; say "units beside the target, yours included" at build.

**Hold-III** (on `hold:cracked`)
- a · `hold-cap-crush`: *When a unit you held falls with the stone, it also takes the fall as a crush, as if cut.* (BR-17 Q2)
  Engine: `collapse.ts` stamps a crush hit on a held unit at the fall (reuse the `shove:drop` damage). Existing `hit` event. A set piece for a pinned foe.
- b · `hold-cap-hang`: *When a unit you held would fall, it hangs instead: set on the nearest standing tile, held until your next turn.*
  Engine: `collapseStep` as `hold-cracked-spare`, for any unit with a fresh hold. No new event. The save, for you or for a foe you wanted alive.

### Brink

Headline: *The rest happens only if the target stood beside an edge or canal when the cast began.*

**Brink-cracked-I** · `brink:cracked` (*A cracked span is still stone until dusk, so Brink does not count it as an edge yet.*)

- a · `brink-cracked-dusk`: *Brink counts a cracked tile as an edge if it will fall this dusk.* (audit Q1)
  Engine: `flow.ts::brinkLine` reads the cracked set as the dusk will see it. Stamps `brink:cracked` when it now passes. The trigger reads the fall coming.
- b · `brink-cracked-half`: *Beside a cracked tile Brink lets the rest through one step weaker.*
  Engine: same site, passes with a power cut of 1. No new event. A half edge.

**Brink-cracked-II** · `brink:cracked`

- a · `brink-cracked-look`: *A Brink that misses beside a cracked tile gives you a Guard of 1: you looked first.*
  Engine: on the `brink:cracked` miss, adds a caster Guard step. No new event (`guarded`). Softens the surprise.
- b · `brink-cracked-find`: *A Brink that misses beside a cracked tile acts on the nearest unit within 2 that does stand at an edge.*
  Engine: on that miss, retargets to the nearest unit beside fog, water or a rim (reading order). No new event. The trigger looks for its edge elsewhere.
- Combos: dusk + look: passes now, so look fires only when it still misses; fine. dusk + find: same; fine. half + look: half-strength passes, look covers misses; reads well. half + find: a miss retargets at full strength; say so at build.

**Brink-drop-I** · `brink:drop` (*A fallen span is fog now, and fog counts as an edge: Brink lets the rest through beside it.*)

- a · `brink-drop-near`: *Brink also counts the tiles diagonal to fog as beside it.*
  Engine: `brinkLine` widens the neighbourhood to eight tiles for drop tiles. Stamps `brink:drop`. Reach.
- b · `brink-drop-keen`: *Beside fog the rest is one step stronger.*
  Engine: same site, +1 power on a `brink:drop` pass. No new event. The edge rewards the daring.

**Brink-drop-II** · `brink:drop`

- a · `brink-drop-stay`: *A foe struck beside fog is also held until your next turn.*
  Engine: after the rest, `hold` on a surviving foe target. No new event (`held`). It does not go over.
- b · `brink-drop-nudge`: *The rest also pushes the target one tile toward the fog.*
  Engine: a one-tile push along the fog-ward axis after the rest. Existing `push`; its fall stamps `shove:drop`. Risky and loud.
- c · `chiefWarden:brink`: the Chief Warden's note (section 3). Hidden until his page is held.
- Combos: near + stay: wider reach, foes pinned; fine. near + nudge: a diagonal target is pushed toward the nearest fog tile (reading order); say so at build. keen + stay: fine. keen + nudge: a hard hit then a push into the fall; fine, strong. near + note, keen + note: see section 3.

**Brink-III** (on `brink:cracked`)
- a · `brink-cap-fall`: *When the target falls this dusk, Brink's rest acts once more on the tile it was standing on.*
  Engine: a dusk hook replays the rest onto the vacated tile, once. No new event. Rewards the read of the crack.
- b · `brink-cap-rim`: *Brink never misses on the rim: the room's walls count as an edge for it.*
  Engine: `brinkLine` drops the `inBoard` wall exclusion (audit Br3). Stamps `brink:edge`. Undoes P3 for one rune, a conscious trade for a capstone.

### Lay

Headline: *What the rest lands sets into the tile for good (until broken), instead of lingering.*

**Lay-cracked-I** · `lay:cracked` (*Lay sets a layer into the tile, not into the bridge: it falls with a cracked span.*)

- a · `lay-cracked-spent`: *A layer Lay sets on a cracked tile is one step stronger: it will not last, so it spends itself.*
  Engine: `mix.ts::newLayer` adds 1 power to a set layer on a cracked tile. Stamps `lay:cracked`. Use the doomed tile.
- b · `lay-cracked-both`: *On a cracked tile Lay also sets a copy into the nearest standing tile.*
  Engine: same site, a second `newLayer` on the nearest sound span or pier tile. No new event. The layer survives the fall.

**Lay-cracked-II** · `lay:cracked`

- a · `lay-cracked-cloud`: *A layer lost to the fall leaves a 1-round plain cloud on the nearest standing tile.*
  Engine: `collapseStep`, on `stateFades` at a fall, adds `newLayer` plain steam. No new event (`stateLaid`). Fog under the fall.
- b · `lay-cracked-last`: *A layer lost to the fall acts once more on a unit that falls with it.*
  Engine: `collapseStep` runs the layer's step on that tile's occupant before it drops. Existing events. Last word of the stone.
- Combos: spent + cloud: a stronger layer, a cloud when it falls; fine. spent + last: the last action uses the raised power; fine. both + cloud: the copy stands, the original falls and leaves a cloud; fine. both + last: fine.

**Lay-III** (on `lay:cracked`)
- a · `lay-cap-footing`: *When Lay sets a plate into a span tile, the plate counts as a pier for that tile.*
  Engine: `support.ts` counts a Lay'd plate on a span as a pier while it stands. No new event. Lay as repair; a new terrain rule, check against P12.
- b · `lay-cap-trail`: *When Lay sets a layer, it also sets a copy one round shorter into the tile behind the target.*
  Engine: `newLayer` a second time on the rear tile (opposite the heading). No new event.

## 3. The Chief Warden's note (BR-20)

On **Brink, level II, slot `brink:drop`**, a third option beside a and b (plan BR-18; default level II per FN Q3: level II adds an interaction, which is what a right of way is). Hidden until his page (**Mind the edge**) is held; still needs the slot's level and solvents. Id `chiefWarden:brink`. His page includes Brink (BR-20 built it); BR-20 wrote the note's slot as `brink:edge`, and BR-19b moves it to `brink:drop` (§8).

- c · `chiefWarden:brink`: *A Warden does not fall off a bridge they walk. Any of yours beside the fog is passed over by Brink's rest, and takes a Guard of 1 instead.*
  Credit line, in the household's hand under it: *Copied from the Chief Warden's day-book.*
  Engine: `brinkLine`/`resolve.ts`, a member target on a `brink:drop` pass takes the Guard step in place of the rest. Existing `guarded`, stamped. No new harm.
- Combos: near + note: a member on the diagonal is guarded too; fine. keen + note: the stronger rest never reaches your own; reads well.

## 4. The solvents

### Mortar

Headline: *Pushes in it go 1 tile further.*

**Mortar-unit-I** · `mortar:unit` (*Mortar makes every push in the invention go one tile further.*)

- a · `mortar-unit-rim`: *Mortar's extra tile is dropped if it would carry a unit into fog: the push stops on the last stone.*
  Engine: `push.ts::stopAt` ignores the bonus step when the next tile is a drop. Stamps `mortar:unit`. Safe shove.
- b · `mortar-unit-fall`: *A unit Mortar carries into the fog takes the fall one step harder.*
  Engine: `push.ts` +1 on the `shove:drop` hit when the bonus step ended it. Existing `hit`. The loud shove.

**Mortar-unit-II** · `mortar:unit`

- a · `mortar-unit-guard`: *A member of your party that Mortar pushes still goes the extra tile, and takes a Guard of 1 where it stops.*
  Engine: after the push, a Guard step on a member target (`push.ts`, the Mortar bonus site). Existing `guarded`. Mortar that knows friends. (Replaces the draft's `mortar-unit-kin` at BR-G1: a Mortar that pushes your own as plain undoes the solvent's one rule.)
- b · `mortar-unit-behind`: *A Mortar'd push also pushes the unit behind the target one tile.*
  Engine: `push` adds one step for the next unit along the heading (once). Existing `push`. A line of pushed units.
- Combos: rim + guard: both safeties for your own, a cautious Mortar; fine. rim + behind: the unit behind is pushed even when the first stops short; fine. fall + guard: a member carried into fog falls, and a fall is no stop, so no Guard; say so at build. fall + behind: the second unit takes no bonus; say "one tile, plain" at build.

**Mortar-III**
- a · `mortar-cap-set`: *When a Mortar'd push ends on a chipped span tile, it sets the stone sound again.*
  Engine: `wear.ts` resets stone on a push end tile. No new event (stone state is bridges data).
- b · `mortar-cap-scatter`: *When a Mortar'd push drops a unit into the fog, it also pushes each unit beside it one tile.*
  Engine: after the drop, a one-tile push for neighbours of the vacated tile. Existing `push`.

### Chalk

Headline: *It reaches 1 tile further.*

**Chalk-network-I** · `chalk:network` (*Chalk lets a conducted action reach one tile further along the network.*)

- a · `chalk-network-square`: *Chalk's reach counts diagonal tiles as one step.*
  Engine: `bursts.ts::unitsNear` uses a Chebyshev measure for the extra tile. No new event. Reach.
- b · `chalk-network-end`: *Chalk reaches one tile further past the brass at the network's far end only.*
  Engine: `inventions.ts` adds the extra tile at the last node of the path. No new event. Aimed reach.

**Chalk-network-II** · `chalk:network`

- a · `chalk-network-ring`: *A network cut by a fall still reaches from where the brass stood, once.*
  Engine: `collapse.ts` records the fallen brass tile for the cast; the next conduct reads it as a node. No new event. Chalk remembers the circle.
- b · `chalk-network-kin`: *Chalk's extra reach passes over your own party.*
  Engine: the extra tile skips members. No new event. Safe reach.
- Combos: square + ring: fine. square + kin: fine. end + ring: the remembered tile can be the far end; say "last node as the cast began" at build. end + kin: fine.

**Chalk-III**
- a · `chalk-cap-circle`: *When Chalk reaches a unit across fog, it reaches the units beside that unit too, one step weaker.*
  Engine: `unitsNear` adds neighbours of fog-side hits at one step weaker. No new event. The far bank.
- b · `chalk-cap-line`: *When a conducted action ends at brass, Chalk draws it on: the action runs once more from the next brass.*
  Engine: `inventions.ts` repeats the final node step once on the next network tile. No new event.

## 5. Counts

- **Runes:** 4 margin lines (Hold 2, Brink 2) plus Lay's one; 10 level I/II pairs; 3 capstone pairs.
- **Solvents:** 2 margin lines; 4 level I/II pairs; 2 capstone pairs.
- **Total pairs:** 19 (14 line pairs, 5 capstone pairs). **Rival note:** 1 (effect built by BR-19b).
- **Clashes noted:** pass x exposed, half x find, near x nudge, fall x behind (wording at build). None needs a rule change.
- **New engine pieces:** dusk hooks in `collapse.ts` (lean, spare, hang, fall, cloud, last), a held-twice count, a power raise and a copy tile in `newLayer`, a stone reset on a push end.

## 6. Open questions

1. **Lay has one line.** Accept one pair, or BR-17 adds a real second Lay row.
2. The capstones on `brink:cracked` and `hold:cracked` rely on dusk hooks that do not exist; BR-19 should check them against the `collapse.ts` order before approval.

## 7. Proposals

| # | Proposal | Reason |
|---|---|---|
| P1 | Slot `brink:cracked` and `brink:drop`, leave `brink:edge` unslotted | Br3 is a one-room trap; `brink-cap-rim` uses it as a capstone instead |
| P2 | The Chief Warden's note on level II of `brink:drop` (default FN Q3) | Level II adds an interaction; level I there is about reach |
| P3 | Hold capstone `hold-cap-crush` as BR-17 Q2 proposed, with `hold-cap-hang` as its opposite | Two opinions: spend the crack, or save the unit |
| P4 | Accept Lay, Mortar, Chalk with one margin line each | No second real behaviour; no invented rows (FN P5) |

## 8. BR-G1 review (orchestrator, design window 2026-11-12)

Approved with these changes; everything not named here is approved as drafted.

1. **Defining words stay true** (the IQ-FG rule): `mortar-unit-kin` (your own pushed as plain) undoes Mortar's one rule for a whole class of targets and is replaced by `mortar-unit-guard` (the extra tile stays; a member takes a Guard of 1 where it stops). `mortar-unit-rim` stays: it is an interaction with fog, as `wax-cloud-smother` was with a cloud, and every other push still goes the extra tile. `chalk-network-kin` stays: the reach is unchanged, only who it touches.
2. **Open questions answered.** Q1: Lay keeps one margin line (P4 approved; no invented row). Q2: the dusk hooks live in `collapse.ts`'s own step, each behind `hasFootnote`, in this order before the fall: `hold-cracked-spare` and `hold-cap-hang` move a held unit to the nearest standing tile, then `hold-cracked-lean` skips a tile once, then the fall (with `hold-cap-crush`, `brink-cap-fall`, `lay-cracked-cloud`, `lay-cracked-last` on what falls). `fallingTiles` stays the one selection, so the preview and the fall agree.
3. **The Chief Warden's note** sits on `brink:drop`, level II (P2 approved). `CHIEF_WARDEN_PAGE.note.line` changes from `brink:edge` to `brink:drop` in BR-19b; the variant id `chiefWarden:brink`, his credit line and his page stay.
4. **Build notes for BR-19a and BR-19b:** each "say so at build" becomes a clause in the variant's text or a one-line comment beside it: `hold-held-pass` says "yours included"; `hold-cracked-knot` says "units beside the target, yours included"; pass + exposed counts "held twice"; `hold-cap-crush` says a minion is gone either way and an elite takes the crush on top of the drop damage; `brink-cracked-dusk` reads "will fall this dusk" as `fallingTiles`; near + nudge pushes toward the nearest fog tile (reading order); half + find retargets at full strength; end + ring reads "the last node as the cast began"; `mortar-cap-set` runs after any wear the push did. Core files (`push.ts`, `mix.ts`, `resolve.ts`, `runes/*`, `bursts.ts`, `inventions.ts`) read bridges state only through `districts/api` (`crackedTiles`); an effect that writes bridges state (stone, the fall, support) lives in `src/engine/districts/bridges/`. `fourCombos` per margin line (Hold 2, Brink 2, Lay 1, Mortar 1, Chalk 1), one scenario per capstone option (10), the note hidden, then offered, then credited.
