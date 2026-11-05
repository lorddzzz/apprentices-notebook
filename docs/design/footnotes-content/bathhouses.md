# Footnotes content: the bathhouses (Areas)

> **State: Drafted 2026-11-05 for BH-FG (not approved).** Task BH-F2 of [bathhouses-plan.md](../../plans/bathhouses-plan.md). Rules: [footnotes.md](../footnotes.md) §1. Lines: `src/data/lines.ts` (BH-F1 block); audit: [footnotes-audit.md](../../plans/footnotes-audit.md) §9. Format and pair rules as in [seam.md](seam.md) §0. Builds: BH-F3 and BH-F4 into `src/data/footnotes/bathhouses.ts`; the Steward's note with the real Steward (RV API, BH-17).
>
> Nothing here is built except the Steep diagonal capstone (FN-11, `src/data/footnotes/auras.ts`). Every number is *tune by playing*.

## 0. How to read this

Same conventions as [seam.md](seam.md) §0: pair IDs `<Subject>-<meets>-<level>`, capstones `<Subject>-III`, options **a**/**b** with the variant ID they ship under (`<subject>-<slug>`, never changed once shipped; solvents use their line subject, `bathSalt-`, `fogJar-`). **Engine** is a one-line sketch; "no new event" means an existing event stamped with the slot's line carries it. **Combos** reads all four level I × level II pairings on the line (six where the rival note adds a third level II option).

Costs (FN plan P3): level I and II pay in the line's district; every line here is `bathhouses` (Bath salt and Fog jar), including `seep:member` once added (B2). Capstones pay one Bath salt and one Fog jar.

### Review batches for BH-FG

| Round | Pairs | Build task |
|---|---|---|
| 1 | Seep (both lines), the Steward's note | BH-F3, BH-17 |
| 2 | Vat (both lines) | BH-F3 |
| 3 | Steep (both lines) | BH-F3 |
| 4 | Bath salt, Fog jar | BH-F4 |
| 5 | Capstones: Vat, Seep, Steep (b), Bath salt, Fog jar | BH-F3, BH-F4 |

## 1. Margin lines

Two margin lines per rune, one per solvent. The lines are BH-F1's, plus `seep:member` (audit Se2, added by the B2 decision below as a stamp, no new event). None is invented to host a slot (FN P5).

| Subject | Margin lines | Note |
|---|---|---|
| Vat | `vat:unit`, `vat:edge` | `vat:member` and `vat:noHeading` stay unslotted: `aimLine` stamps one line per cast (`noHeading` > `member` > `edge` > `unit`), and both are narrow corners of the heading rule `vat:unit` already bends |
| Seep | `seep:edge`, `seep:member` | `seep:member` holds the Steward's note (level II). Needs B2 |
| Steep | `steep:spread`, `steep:plate` | `steep:spread` fires every round a steeped compound lasts. `steep:unit` stays unslotted: it fires only for steeped plates, kettles and walls, rare outside the Lab |
| Bath salt | `bathSalt:cloud` | Fires on every salted cast. `bathSalt:member` is bent by Bath-salt-cloud-II-a instead |
| Fog jar | `fogJar:unit` | Fires on every jarred cast. `fogJar:member` and `fogJar:empty` stay unslotted; `fogJar:empty` is used by Fog-jar-unit-II-b's text |

## 2. The Areas runes

### Vat

Headline: *Aims a 2×2 within range 1.*

**Vat-unit-I** · `vat:unit` (*A Vat points all four of its tiles the same way, from you to the square, so a Shove pushes every unit in it in one direction.*)

- a · `vat-unit-scatter`: *Your Vat points each tile away from the square's middle, so a Shove spreads its units apart.*
  Engine: `targets.ts::areaTargets` gives each tile its own outward diagonal (as Splash's outward heading). No new event. Clears a crowd off a choke point.
- b · `vat-unit-gather`: *Your Vat points each tile toward the square's middle, so a Shove packs its units together.*
  Engine: same site, the inward diagonal; pushes resolve in reading order and collide as any Shove does. No new event. Builds a knot for a Spark or a boil-over.

**Vat-unit-II** · `vat:unit`

- a · `vat-unit-pour`: *Each empty tile in your Vat pours its share on: the rest acts once more on the first unit in the square, at most twice.*
  Engine: `aimTargets` replaces each empty tile target with a repeat of the first unit target (reading order), capped at 2. No new event. Interacts with the empty-tile case; a Vat on one foe is a heavy hit.
- b · `vat-unit-fill`: *Each empty tile in your Vat takes a thin cloud for a round.*
  Engine: after the rest, `mix.ts::newLayer` lays plain steam (1 round) on the square's empty tiles that hold no layer. No new event (`stateLaid`). Feeds the cloud network and so the gauge (BH-1); a choice to court the boil.
- Combos: scatter + pour: pour moves no units, so scatter still decides the Shove; fine. scatter + fill: units leave, the cloud fills behind; reads well. gather + pour: a Shove at one foe pushed up to three times inward; say "pushed toward the middle each time" at build. gather + fill: a packed knot on fresh steam, the Steam Room in one cast; fine.

**Vat-edge-I** · `vat:edge` (*Near the edge of the room a Vat is clipped: tiles off the board are not acted on.*)

- a · `vat-edge-slide`: *At the room's edge your Vat slides inward to stay a full 2×2.*
  Engine: `clip` shifts the square's origin back by one on the overflowing axis (range is measured to the aimed tile, so it stays legal); the heading is recomputed from the new square. Stamps `vat:edge` on the shifted aim. Always four tiles.
- b · `vat-edge-press`: *Each tile your Vat loses at the edge makes the rest one step stronger on the tiles left, at most two.*
  Engine: `aimTargets` counts clipped tiles into the rest's power (the same step Fog jar weakens by). No new event. A corner Vat hits one tile hard.

**Vat-edge-II** · `vat:edge`

- a · `vat-edge-pin`: *A unit your Vat pushes against the room's edge cannot move until your next turn.*
  Engine: `push.ts`, a blocked step at the board's edge on a Vat target marks the unit held (Rivet's hold, scoped to this case). No new event. Borrows Rivet's idea, bounded to the wall of the room.
- b · `vat-edge-rebound`: *A unit your Vat pushes against the room's edge bounces one tile back the other way.*
  Engine: same site, the blocked step becomes one step with the reversed heading; it collides like any Shove. No new event (`push`).
- Combos: slide + pin: the slid square sits on the edge, so pins come often; fine. slide + rebound: a rebound can run into another unit of the square; it collides as a Shove would, say so in rebound's text. press + pin: fewer, stronger tiles, the survivors held; fine. press + rebound: fine.

### Seep

Headline: *The rest also acts on the target's 4 neighbours.*

**Seep-edge-I** · `seep:edge` (*Seep reaches only tiles on the board: a neighbour past the room's edge is dropped, and the rest still go.*)

- a · `seep-edge-back`: *Each neighbour Seep loses at the room's edge turns back: the rest acts once more on the target, at most twice.*
  Engine: `flow.ts::seep` appends the target once per `off` neighbour, capped at 2. No new event. Seep in a corner becomes a focused hit.
- b · `seep-edge-turn`: *Each neighbour Seep loses at the room's edge is replaced by the nearest diagonal neighbour on the board.*
  Engine: same site, an `off` neighbour maps to the first on-board diagonal next to it (reading order), skipping ones already taken. No new event. Seep keeps its count against the wall.

**Seep-edge-II** · `seep:edge`

- a · `seep-edge-wall`: *Seep also loses neighbours that are walls, gates or plates, and they count as lost at the edge.*
  Engine: `seep` adds blocking pieces (`blocksUnits`) to `off`, so level I treats them like the edge. Stamps `seep:edge`. Interacts with the plate line: walls now feed the level I choice.
- b · `seep-edge-along`: *A target at the room's edge makes Seep reach one tile further along the edge, both ways.*
  Engine: `seep` adds the next tile past each along-edge neighbour when the target is on the edge row or column. No new event. Seep becomes a sweep of the room's rim.
- Combos: back + wall: a target between two walls is hit up to three times; fine (the cap holds). back + along: the rim is swept and the target hit again; fine. turn + wall: walls are traded for diagonals; reads well. turn + along: in a corner both add tiles; say "along first, then diagonals" at build.

**Seep-member-I** · `seep:member` (*Seep acts on its neighbours whoever they are: you and your allies beside the target take the rest too.* Text proposed by B2.)

- a · `seep-member-spare-self`: *Seep never reaches you, the caster; your allies beside the target still take it.*
  Engine: `seep` drops the caster's tile from the neighbours. Stamps `seep:member` on the ally events that remain. Safe to Seep the foe you are fighting next to.
- b · `seep-member-pass`: *A neighbour of yours passes Seep along: the rest also acts on the tile beyond them.*
  Engine: `seep` adds, for each member neighbour, the tile one further from the target. No new event. Allies become relays; reach over safety.

**Seep-member-II** · `seep:member`

- a · `seep-member-away`: *A Seep Shove pushes your own party away from the target, not along its heading.*
  Engine: `seep` gives member neighbours the target-to-neighbour heading instead of the target's. No new event. Interacts with the Shove heading lines; clears your people out of a blast.
- b · `seep-member-guard`: *Your own party beside the target takes a Guard from Seep instead of the rest.*
  Engine: `resolve.ts`, a member neighbour runs the Guard step in place of the rest. No new event (`guarded`, stamped). Interacts with Guard; the cast that hurts the foe shields its neighbours.
- c · `bathSteward:steam`: the Steward's note (section 3). Hidden until his page is held.
- Combos: spare-self + away: allies pushed clear, you untouched; fine. spare-self + guard: allies guarded, you neither; fine. spare-self + note: fine. pass + away: the tile beyond is acted on first, then the ally pushed away; say the order at build. pass + guard: the ally holds and the rest goes past them; reads well. pass + note: an ally on a cloud is passed over and the rest re-forms; the re-formed rest does not pass along, say so in the note's build text.

### Steep

Headline: *Lingering compounds from touching paths spread one tile each round they last.*

**Steep-spread-I** · `steep:spread` (*A steeped compound copies itself onto each empty neighbour every round it lasts, with the rounds it has left, and the copies are steeped too.*)

- a · `steep-spread-thin`: *A copy takes one round fewer than its source, so the cloud fades as it grows.*
  Engine: `mix.ts::spreadSteep` copies with `rounds - 1` and skips at 0. No new event. A bounded cloud; harder to boil over by accident.
- b · `steep-spread-once`: *Copies are not steeped: each steeped compound grows one ring and stops.*
  Engine: same site, the copy drops `steep`. No new event. A predictable shape that keeps its full length.

**Steep-spread-II** · `steep:spread`

- a · `steep-spread-mix`: *A steeped compound also spreads onto a slick or a plain cloud, mixing with it as a cast would.*
  Engine: `spreadSteep` lets a non-compound layer through and calls the mix rule instead of copying. No new event (`mixed`). Bends audit St4; oil and steam become a fuse of grease fog.
- b · `steep-spread-spare`: *A steeped compound does not spread onto a tile where your own party stands.*
  Engine: `spreadSteep` skips member tiles (as `steep:unit` does for standing pieces). No new event. Safe to steep near your people; the cloud flows around them.
- Combos: thin + mix: fading copies mixing in; fine. thin + spare: fine. once + mix: one ring that can also turn slicks; fine. once + spare: fine.

**Steep-plate-I** · `steep:plate` (*A steeped compound does not spread onto a plate, a gate, a grate or a solid piece.*)

- a · `steep-plate-under`: *A spread stopped by a grate or a gate passes under it to the tile beyond.*
  Engine: `spreadSteep` lets a copy jump a grate or gate tile to the next empty one, same direction; plates and solid pieces still stop it. Stamps `steep:plate`. Steam leaks through the bathhouse's ironwork.
- b · `steep-plate-pool`: *A spread stopped at a plate pools: its source gains a round instead, at most once a round.*
  Engine: same site, a blocked direction adds 1 to the source's `rounds` (once per round). No new event. A cloud against a wall lasts.

**Steep-plate-II** · `steep:plate`

- a · `steep-plate-wear`: *A steeped compound pressing on a plate wears it by 1 each round.*
  Engine: `spreadSteep` calls `push.ts::wearPlate(1)` on a blocking plate (FN-C1's wear). No new event. Interacts with the wall lines; a slow way through.
- b · `steep-plate-ring`: *A spread stopped at a brass piece rings it once a round.*
  Engine: same site, a blocking brass piece emits its ring as if struck (Brass's existing event). No new event. Check at build that a brass plate's ring exists outside a hit; if not, this option needs the Brass line it bends named.
- Combos: under + wear: gates and grates leak, plates wear; fine. under + ring: fine. pool + wear: a cloud that both lasts and wears; the intended pair for a siege. pool + ring: fine.

### The three capstones

Capstones need no witnessed line. Each is "when X, also Y"; the headline stays true.

**Vat-III**
- a · `vat-cap-room`: *When every tile of your Vat holds a cloud, it also acts on the ring around the square, one step weaker.*
  Engine: `aimTargets` adds the twelve tiles around the square (clipped) at one step weaker. No new event. Rewards building the Steam Room first.
- b · `vat-cap-crowd`: *When your Vat holds two or more foes, the rest also strikes each one for 1 per other foe in it, at most 2.*
  Engine: after the rest, a damage step per foe. Existing `damage`.

**Seep-III**
- a · `seep-cap-chain`: *When Seep's rest defeats a neighbour, it also acts on that neighbour's own neighbours, once.*
  Engine: `resolve.ts` queues one more Seep on the fallen tile (a flag stops a second chain). No new event.
- b · `seep-cap-cloud`: *When Seep's target stands on a cloud, it also reaches the 4 diagonal neighbours.*
  Engine: `seep` adds the diagonals when the target tile carries a cloud. No new event.

**Steep-III**
- a · `steep-diagonal` (**built**, FN-11): *Steep also reaches the runes diagonally touching it on the page.*
- b · `steep-cap-carry`: *When a unit steps out of a steeped compound, it also carries a copy onto the tile it steps to.*
  Engine: an `arrival.ts` hook copies the departed tile's steeped layer onto an empty arrival tile (pushes included). No new event (`spreadState`). Foes spread your steam for you; the dissolved bather's walk becomes a weapon.

## 3. The Steward's note (BH-17)

On **Seep, level II, slot `seep:member`**, as a third option beside a and b (plan BH-F2; Seep is on his page: he lays a cloud near the party and shoves from within, so the page assumed is Steam, Seep, Shove; confirm at RV-15). Hidden until his page is held; still needs the slot's level and costs. Id `bathSteward:steam`, after the foe id and the Lamplighter's pattern.

- c · `bathSteward:steam`: *A regular is never splashed in his own steam. Any of yours standing in a cloud beside the target is passed over, and the rest re-forms on the farthest free tile of that cloud instead.*
  Credit line, in the household's hand under it: *Copied from the Steward's towel book.*
  Engine: `seep`, a member neighbour on a cloud tile is swapped for the free connected cloud tile farthest from it (ties in reading order), the same helper as his steams-away trick (plan P10, BH-8). No new event; with no free tile, the member is passed over and nothing re-forms. No new harm: the rest lands on a tile, so it strikes whoever is there (a foe, or nobody).

His trick is to dodge into the cloud; the note gives the household the same courtesy for its own people, and the cut-network answer (no free tile) still applies.

## 4. The solvents

### Bath salt

Headline: *It also reaches the connected cloud.*

**Bath-salt-cloud-I** · `bathSalt:cloud` (*Bath salt carries the invention to every unit in the connected cloud.*)

- a · `bathSalt-cloud-shore`: *Salt also reaches units standing one tile outside the cloud's edge.*
  Engine: `solvents.ts::bathSalt.widen` adds units beside the cloud's tiles. No new event. Reach.
- b · `bathSalt-cloud-near`: *Salt reaches only units within 3 tiles of the target, counted through the cloud.*
  Engine: same site, a flood fill capped at 3 steps. No new event. Aimable in a big network.

**Bath-salt-cloud-II** · `bathSalt:cloud`

- a · `bathSalt-cloud-kin`: *Salt passes over your own party in the cloud.*
  Engine: `widen` skips members. Bends `bathSalt:member` (it stops firing). No new event.
- b · `bathSalt-cloud-spent`: *Salt spends the cloud: every tile it carried through loses a round, and a 1-round tile clears.*
  Engine: after `widen`, each tile of the fill loses a round (`stateCleared` at 0). No new event. A way to cut the network, the Steward's answer, at the price of your own cloud.
- Combos: shore + kin: fine. shore + spent: shore tiles hold no cloud, nothing extra lost; fine. near + kin: fine. near + spent: only the tiles it carried through within 3 lose a round; say "carried through" at build.

**Bath-salt-III**
- a · `bathSalt-cap-again`: *When salt reaches three or more units, it also acts once more on the target.*
  Engine: `runInvention` repeats the target step once. No new event.
- b · `bathSalt-cap-condense`: *When salt carries an invention, it also leaves a 1-round plain cloud under the target if it had none.*
  Engine: `newLayer` plain steam on the target's tile after the run. No new event.

### Fog jar

Headline: *It also acts on the target's neighbours, one step weaker.*

**Fog-jar-unit-I** · `fogJar:unit` (*Fog jar carries the invention to the units beside its target, one step weaker.*)

- a · `fogJar-unit-line`: *Fog jar reaches only the neighbours in the invention's line, in front and behind, still one step weaker; with no heading it reaches all four.*
  Engine: `fogJar.widen` filters neighbours by the heading's axis. No new event. Aimed spill.
- b · `fogJar-unit-ring`: *Fog jar also reaches the diagonal neighbours, two steps weaker.*
  Engine: same site, diagonals at two steps weaker. No new event. Wide spill.

**Fog-jar-unit-II** · `fogJar:unit`

- a · `fogJar-unit-cloud`: *A neighbour standing on a cloud takes the full invention, not a weaker one.*
  Engine: `runInvention` skips the weakening for added targets on a cloud tile. No new event. Interacts with the cloud network.
- b · `fogJar-unit-mist`: *Fog jar leaves a 1-round plain cloud on each empty neighbour it reaches.*
  Engine: `newLayer` on empty neighbour tiles with no layer (the `fogJar:empty` case's tiles). No new event. Grows the network from any cast.
- Combos: line + cloud: in-line neighbours on steam take the full hit; fine. line + mist: mist only in the line; say so. ring + cloud: diagonals on a cloud also go full; say "full" means the target's strength. ring + mist: up to eight new cloud tiles; strong for the gauge, fine as a choice.

**Fog-jar-III**
- a · `fogJar-cap-spill`: *When a neighbour Fog jar reaches is defeated, it also reaches that unit's neighbours, one step weaker still.*
  Engine: `runInvention` adds one more ring from the fallen unit (once). No new event.
- b · `fogJar-cap-draw`: *When Fog jar acts, it also pulls each reached neighbour one tile toward the target.*
  Engine: a pull step per added target (AH's Pull). Existing `push`.

## 5. Counts

- **Runes:** 6 margin lines; 12 level I/II pairs; 3 capstone pairs (Steep's a built).
- **Solvents:** 2 margin lines; 4 level I/II pairs; 2 capstone pairs.
- **Total new pairs:** 21 (16 line pairs, 5 capstone pairs, one option already built). **Rival note:** 1 (effect not built).
- **Clashes noted:** gather × pour, slide × rebound, turn × along, pass × note, near × spent, line × mist (wording at build). None needs a rule change.
- **New engine pieces:** the `seep:member` stamp (B2), per-tile headings in `areaTargets` (scatter, gather), a clip shift (slide), a Seep re-target onto the farthest cloud tile (the note, shared with BH-8), an arrival copy hook (steep-cap-carry). No new events or `Meets` values.

## 6. Decisions on BH-F1's proposals

| # | Proposal | Decision (default) | Reason |
|---|---|---|---|
| B1 | `Meets` `dry` and a `miss` row for Bath salt outside a cloud | **Add it, unslotted** (`bathSalt:dry`, a stamped `miss` when no unit is added), in BH-F4 | A real trap the player should read in the log; one `Meets` value is cheap. It needs no slot: Bath-salt-cloud-I-a (shore) already covers the "one tile past" opinion |
| B2 | A "reached" event for `seep:member` | **No new event: stamp** the Action's own events at a member neighbour with `seep:member` (as `SolventRule.lineFor` does for Bath salt and Fog jar), in BH-F3 | Same precedent as `bathSalt:member` and `fogJar:member`, no contract change. A neighbour that produces no event (a Shove with no heading) simply does not witness it; acceptable |
| B3 | `steep:plate`/`steep:unit` as `miss` ("Steep hits nothing") or a `spreadBlocked` event | **Keep the `miss`**; give the log text per line (B4) | `fork:edge`/`seep:edge` precedent; a new event is a contract change for a once-a-round message |
| B4 | Shorten edge "hits nothing" texts | **Yes, by line, not a new field:** the log picks the text from the stamped line (`seep:edge`, `fork:edge`: "loses a branch at the edge"; `steep:plate`/`steep:unit`: "the spread stops here") | A stamped `miss` already carries its line, so no `what` field is needed |

## 7. Proposals

| # | Proposal | Reason |
|---|---|---|
| H1 | `seep:member` text as quoted in section 2, added with B2 | The Steward's slot needs the line to exist |
| H2 | The note on **level II** of `seep:member` (as planned), not level I | Level II adds an interaction (clouds), which is what the note does; level I there is about reach |
| H3 | Variant ids for solvents use the camelCase subject (`bathSalt-…`, `fogJar-…`) | Matches the line ids; canals had one-word solvents so set no precedent |
| H4 | `steep-plate-ring` only if Brass has a ring event outside a hit; otherwise swap for `steep-plate-seep` ("a stopped spread seeps under a plate as a 1-round plain cloud beyond") | Avoid inventing a Brass line |
| H5 | Vat-unit-II-b, Steep-spread-II-a and Fog-jar-unit-II-b grow clouds and so feed the gauge; keep them, the boil is the district's pressure to manage | A footnote that courts the boil is an opinion, not a trap; the gauge forecast (BH-1) shows it |
