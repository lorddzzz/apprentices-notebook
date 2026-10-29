# Footnotes content: the Seam

> **State: Draft for review (FN-G1).** Tasks FN-A1 (the 13 Seam runes) and FN-A2 (the five methods, Gallnut and Cinder) of [footnotes-plan.md](../../plans/footnotes-plan.md). Rules: [footnotes.md](../footnotes.md) §1. Lines: `src/data/lines.ts`; audit: [footnotes-audit.md](../../plans/footnotes-audit.md). Built variants: `src/data/footnotes/seam-runes.ts`.
>
> Nothing here is built except the five level-I pairs marked **built**. Every text is a draft, *tune by playing*.

## 0. How to read this

- **Pair IDs** are `<Subject>-<meets>-<level>`: `Bolt-cloud-I` is the level I pair on `bolt:cloud`. Capstone pairs are `<Subject>-III`. Options are **a** and **b**; a **c** is a spare opinion, offered where two ideas compete for one place (the review keeps two of the three).
- Every option in a pair sits on the **line named in the pair's heading**. Its slug is the variant ID it would ship with (`<subject>-<slug>`, never changed once shipped).
- **Text** is what the margin says, in the owner's hand. **Engine** is a one-line sketch: the event or rule it bends, and whether it needs a new event, a new `Meets` value or a new line. "No new event" means an existing event (stamped with the slot's line) carries it.
- **Combos** checks the four level I × level II pairings on the line. A clash is called out with how the text resolves it.
- The design guidance applied throughout (footnotes.md §1): level I adjusts a rule's reach or length; level II adds an interaction with a neighbouring line; a capstone is a bounded "when X, also Y" that invites a new wiring and leaves the headline true. A pair is two opinions, not a worse and a better.
- Costs follow plan P3: level I and II pay in the **line's** district (Seam lines: Gallnut or Cinder; `repeat:` and `margin:` lines: canal solvents; `bind:` and `lift:` lines: ink-quarter solvents); capstones pay one of each of the subject's home district.

### Review batches for FN-G1

The pairs are grouped so a round with the player is 4–6 pairs. The suggested order follows the build tasks:

| Round | Pairs | Build task |
|---|---|---|
| 1 | Bolt, Shove (level II and Bolt's second line) | FN-C1 |
| 2 | Spark | FN-C2 |
| 3 | Ink, Oil | FN-C3 |
| 4 | Steam, Brass | FN-C4 |
| 5 | Strike, Guard, Splash, Touch, Fork | FN-C5 |
| 6 | Capstones: Bolt, Splash, Touch, Strike, Shove, Guard, Fork, Bend | FN-C6 |
| 7 | Capstones: Ink, Oil, Steam, Brass, Spark | FN-C7 |
| 8 | Conduct, Repeat, Margin | FN-C8 |
| 9 | Bind, Lift, Gallnut, Cinder | FN-C9 |

## 1. Margin lines

Plan P1: two margin lines per rune, three for Spark and Ink, one where a rune has a single honest line, none for Bend (P5). The audit's §4 is the starting point; the changes are marked.

| Subject | Margin lines | Note |
|---|---|---|
| Bolt | `bolt:empty` (I built), `bolt:cloud` | as audit |
| Splash | `splash:unit`, `splash:member` | as audit (both rows added by FN-9) |
| Touch | `touch:member`, `touch:unit` | as audit |
| Strike | `strike:shielded` | one line; `strike:empty` has nothing to choose |
| Shove | `shove:wall` (I built), `shove:slick` (I built) | as audit |
| Guard | `guard:shielded` | one line |
| Ink | `ink:mark`, `ink:stain`, `ink:spread` | as audit |
| Oil | `oil:slick` (I built), `oil:cloud` | as audit |
| Steam | `steam:kettle`, `steam:cloud` | **changed**: the audit's `steam:unit` has no row (flag F1) |
| Brass | `brass:plate`, `brass:mark` | **changed**: the audit's `brass:unit` has no row (flag F2) |
| Spark | `spark:slick` (I built), `spark:mark`, `spark:plate` | as audit |
| Fork | `fork:unit` | as audit |
| Bend | none | capstone pair only (P5) |
| Conduct | `conduct:network` | as audit |
| Repeat | `repeat:empty` | as audit |
| Margin | `margin:empty` | as audit |
| Bind | `bind:mark`, `bind:cloud` | as audit |
| Lift | `lift:unit` | as audit |
| Gallnut | `gallnut:unit` | as audit (P4) |
| Cinder | `cinder:slick` | as audit (P4) |

**Flags: lines that do not exist**

- **F1 `steam:unit`** (audit Se2: Steam lands under a unit and hides it at once). It is the better home for Steam's identity (hiding yourself). FN-9/FN-10 did not add it. If it is added, a natural pair is "the cloud you raise on yourself follows you one step" / "a foe that ends its turn beside your cloud loses sight of you too". Until then Steam uses `steam:kettle` and `steam:cloud`.
- **F2 `brass:unit`** (audit Br1: Brass collars a unit). Collars are what Conduct and `spark:collar` build on, so it would be Brass's best line. Until it is added Brass uses `brass:plate` and `brass:mark`.
- **F3 a killing-hit line for Bind** (audit Bi3, proposed `bind:minion` or a new `Meets`). Bind-mark-II-a changes that rule; it sits on `bind:mark`, which already fires on releases, so no new row is strictly needed, but the base rule ("a killing hit does not release") is unwitnessable today.

## 2. The Seam runes

### Bolt

Headline: *Aims a line at the first unit, range 4.*

**Bolt-empty-I** · `bolt:empty` · **built**

- a · `bolt-empty-far`: *An unobstructed Bolt shot lands one tile farther, if that tile is clear.* (built)
- b · `bolt-empty-near`: *An unobstructed Bolt shot lands one tile nearer, without landing on its caster.* (built)

**Bolt-empty-II** · `bolt:empty`

- a · `bolt-empty-seek`: *An unobstructed shot that ends beside a unit turns onto it; the spell keeps the shot's heading.*
  Engine: `targets.ts::boltTravel`, after the landing: the first neighbouring unit in reading order becomes the target. No new event; `aimed` carries the unit.
- b · `bolt-empty-settle`: *An unobstructed shot stops on the first tile holding a slick, blot or fire, and lands there.*
  Engine: `queries.ts::travel` gains a stop on a floor state. Needs a new `LineStop` value (`state`) for the `stopped` event, or stamps `lands` early; no new `Meets`.
- Combos: far + seek, near + seek: the shot moves first, then turns onto a neighbour; reads fine. far/near + settle: a shot that settles was not unobstructed to the end, so far/near never move it. Say so in the settle text at build time ("…and lands there; it is not moved farther or nearer").

**Bolt-cloud-I** · `bolt:cloud` (*A cloud stops Bolt on its tile, hiding any unit inside it.*)

- a · `bolt-cloud-through`: *Bolt passes through the first cloud tile it meets and stops at what lies beyond.*
  Engine: `queries.ts::travel` skips one cloud tile; `bolt:cloud` is stamped on the skipped tile. No new event. You lose the Bolt + Spark storm on a cloud in front of you.
- b · `bolt-cloud-find`: *A Bolt stopped by a cloud finds the unit hidden in it and aims at the unit, not the tile.*
  Engine: `resolve.ts::flight`, the cloud stop returns `targetOn` the unit. No new event. Bolt + Ink then marks the unit instead of branding the cloud.

**Bolt-cloud-II** · `bolt:cloud`

- a · `bolt-cloud-cover`: *A Bolt cast from inside a cloud is not stopped by the cloud it starts in.*
  Engine: `queries.ts::travel` ignores cloud tiles connected to the caster's tile along the line. No new event. Pairs with Steam on yourself.
- b · `bolt-cloud-clear`: *A cloud that stops a Bolt thins: that tile clears once the spell ends.*
  Engine: after `resolve.ts` finishes the spell, the stop tile's cloud layer is removed with a `stateFades`. No new event.
- Combos: through + cover: you shoot out of your cloud and through one more; fine. through + clear: the skipped tile is not the stop tile, so only a second cloud would clear; fine. find + cover: fine. find + clear: the hidden unit is hit and left in the open; reads well.

### Splash

Headline: *Aims a 3×3 within range 3.*

**Splash-unit-I** · `splash:unit` (*Splash points every tile outward from its centre…*)

- a · `splash-unit-gather`: *Splash points every tile toward its centre instead; the centre still takes the way from you to it.*
  Engine: `targets.ts::areaTargets` flips the per-tile heading. No new event. A Shove gathers units and crushes them into whoever stands in the middle.
- b · `splash-unit-sweep`: *Every Splash tile takes the way from you to the centre, so a Shove moves the whole 3×3 one way.*
  Engine: same site, one heading for all nine tiles. No new event. A Shove sweeps a row into a wall.

**Splash-unit-II** · `splash:unit`

- a · `splash-unit-ripple`: *A unit your Splash pushes into another unit passes the push on: the other one moves a tile instead of either being crushed.*
  Engine: `push.ts::stopAt` on a unit, when the push came from a Splash target: push the blocker 1 along the same heading. Existing `push` event; no new `Meets`.
- b · `splash-unit-press`: *A unit your Splash pushes into another unit inside the same Splash crushes it for the full crush, not 1.*
  Engine: `push.ts` crush damage for the hit unit, when both are Splash targets. Existing `crush` event.
- Combos: gather + ripple: units roll into the centre and push the centre unit on, out the far side; odd but readable. gather + press: the strongest pairing (everyone crushes the middle); fine as a choice. sweep + ripple: a row pushes a unit outside the area on; fine. sweep + press: rare (all move one way, few collisions); fine.

**Splash-member-I** · `splash:member` (*You can stand inside your own Splash, and are a target like anyone.*)

- a · `splash-member-spared`: *Your own Splash passes over you; allies inside are still targets.*
  Engine: `targets.ts::areaTargets` drops the caster's tile target. No new event. You lose Splash + Guard on yourself and your own cloud cover.
- b · `splash-member-ride`: *Inside your own Splash you take the way of your last step this turn, as a Touch would.*
  Engine: same site, the caster's heading is `caster.lastMove` (null if none). No new event. Splash + Shove carries you along with the scatter.

**Splash-member-II** · `splash:member`

- a · `splash-member-friendly`: *Strike and Spark in your Splash pass over your allies; kinds and pushes still reach them.*
  Engine: `runes/actions.ts::strike` and `mix.ts::sparkLand` skip allied unit targets of a Splash cast (the Spark still lands on the tile). Stamps `splash:member`. No new event.
- b · `splash-member-step`: *A Splash on your own tile points its centre and corners the way of your last step, so none of it is left without a heading.*
  Engine: `targets.ts::areaTargets`, where `axisToward` returns null, use `caster.lastMove`. Bends `splash:noHeading` (it stops firing when you have stepped). No new event.
- Combos: spared + friendly: you and your allies are safe from your own harm; strong but each costs a slot. spared + step: you are skipped, so the step heading reaches only the corners and the tile under you; fine. ride + friendly: fine. ride + step: both use your last step; the most coherent pairing.

### Touch

Headline: *Aims yourself or an adjacent unit or tile.*

**Touch-member-I** · `touch:member` (*Touch on yourself points the way of your last step this turn…*)

- a · `touch-member-memory`: *If you have not stepped this turn, Touch on yourself points the way of your last step last turn.*
  Engine: `turn.ts::beginPlayerPhase` keeps last turn's direction in a second field; `targets.ts::aimTargets` falls back to it. No new event.
- b · `touch-member-runup`: *A push from a Touch on yourself goes one tile for each tile you walked in a straight line this turn, up to 3.*
  Engine: `movement.ts` counts the straight run; `push.ts::push` reads it for a self-Touch target. Existing `push` event.

**Touch-member-II** · `touch:member`

- a · `touch-member-ram`: *If a Touch on yourself pushes you into a unit, it takes the full crush and you take 1.*
  Engine: `push.ts` crush split reversed for a self-Touch push. Existing `crush` event. Bends `shove:unit`.
- b · `touch-member-tow`: *When a Touch on yourself pushes you, a unit standing right behind you is pulled along one tile.*
  Engine: after the self push, move the unit on the tile behind (opposite the heading) by 1, as a pull arrival. Existing `pull`/`push` event; no new `Meets`.
- Combos: memory + ram: stand still and ram along last turn's line; fine. memory + tow: fine. run-up + ram: a long run-up rams hard (crush counts the tiles); intended. run-up + tow: the towed unit moves one tile, not the full run; say so at build time.

**Touch-unit-I** · `touch:unit` (*Touch on a neighbouring unit points away from you…*)

- a · `touch-unit-reach`: *Touch reaches a unit two tiles away in a straight line, over an empty tile.*
  Engine: `queries.ts::legalAims` for Touch adds the second tile; heading unchanged. No new event. (Not Pull: nothing moves until a rune says so.)
- b · `touch-unit-steer`: *If you stepped this turn, Touch on a neighbouring unit points the way you stepped, not away from you.*
  Engine: `targets.ts::aimTargets`, heading = `caster.lastMove` when set. No new event. Walk along a wall and shove the foe along it.
- c · *spare* `touch-unit-draw`: *Touch on a neighbouring unit points toward you: a Shove pulls it into you, and both take the crush.*
  Engine: heading flipped; `push.ts` treats the caster as the blocker. Competes with steer for "Touch's heading opinion".

**Touch-unit-II** · `touch:unit`

- a · `touch-unit-follow`: *When a Touch pushes a unit off, you step one tile after it.*
  Engine: after the target's `push`, move the caster 1 along the heading if free (a `moved` arrival; Undo is gone, as Sh2). Bends `touch:member` (your new step sets the heading for later Touches).
- b · `touch-unit-recoil`: *When a Touch pushes a unit off, you are pushed one tile the other way.*
  Engine: `push.ts::push` on the caster, opposite heading. Existing `push`; can crush you (the harm warning shows it).
- Combos: reach + follow: you step one tile into the gap, not two; fine. reach + recoil: fine. steer + follow: you chase it along your own line; coherent. steer + recoil: fine. With spare draw: draw + follow is a clash (it was pulled into you, there is no gap); if draw is kept, follow must read "if the tile ahead is free".

### Strike

Headline: *Deals 2 to the target. Mixes with nothing: the safe hit.*

**Strike-shielded-I** · `strike:shielded` (*A shield takes the blow first, but the unit has still been hit.*)

- a · `strike-shielded-break`: *Strike on a shielded unit breaks the whole shield, however large, and deals nothing past it.*
  Engine: `damage.ts::dealDamage`, Strike source: shield set to 0, `shieldAbsorbs` with the full amount. No new event. Bad news for an ally you Guard and then hit to trip a Bind.
- b · `strike-shielded-pierce`: *Strike sends 1 through a shield, whatever the shield holds.*
  Engine: same site, 1 bypasses the shield. Existing `damage`. Hurts the Guard-then-hit trick a little.

**Strike-shielded-II** · `strike:shielded`

- a · `strike-shielded-glance`: *A Strike a shield takes glances off: the nearest other unit beside the target takes 1.*
  Engine: after `shieldAbsorbs` from a Strike, deal 1 to the first neighbour in reading order. Existing `damage`.
- b · `strike-shielded-knock`: *A shielded unit you Strike is knocked one tile along the heading.*
  Engine: `push.ts::push` after the absorb. Existing `push`/`crush`. Bends `shove:*` lines (the knock can crush).
- Combos: break + glance: the shield goes and the neighbour takes 1; fine. break + knock: fine. pierce + glance: fine. pierce + knock: fine. None clash: II acts on the fact of the absorb, I on its size.

### Shove

Headline: *Pushes the target 1 tile along the heading.*

**Shove-wall-I** · `shove:wall` · **built**

- a · `shove-wall-soft`: *A crush against a wall skips the damage for distance, so the pushed unit takes only 1.* (built)
- b · `shove-wall-heavy`: *A crush against a wall deals 1 more to the unit pushed into it.* (built)

**Shove-wall-II** · `shove:wall`

- a · `shove-wall-ring`: *A unit crushed against a wall makes it ring: every other unit touching the wall is pushed one tile away, unharmed.*
  Engine: `push.ts::stopAt` on a wall calls the ring push of `bursts.ts` (Spark on a wall) without its damage. Existing `push`. Bends `spark:wall`.
- b · `shove-wall-through`: *A unit crushed into a wall that breaks goes on into the tile behind it, if that tile is free.*
  Engine: `push.ts::wearPlate` on a wall break: continue the push 1 tile. Existing `push`. A wall's second crush becomes a door.
- Combos: soft + ring: the wall becomes a gentle sorting tool; fine. soft + through, heavy + ring, heavy + through: fine. Soft is the opinion for the self-push and ally-push player; ring and through are about the room. No clash.

**Shove-slick-I** · `shove:slick` · **built**

- a · `shove-slick-far`: *A unit that slides on oil slides one tile further before it stops.* (built)
- b · `shove-slick-again`: *The oil a unit slides over stays slick for the round, so a second push can slide it again.* (built)

**Shove-slick-II** · `shove:slick`

- a · `shove-slick-carry`: *A sliding unit that hits another unit hands on the tiles it had left: the other one slides them, and neither is crushed.*
  Engine: `push.ts` slide loop, on a unit stop with tiles left: push the blocker that many, no `crush`. Existing `push`. Bends `shove:unit`.
- b · `shove-slick-smear`: *A unit that slides over a blot or stain picks up the ink and is marked.*
  Engine: `push.ts` slide loop calls `mix.ts::markUnit` on blot or stain tiles crossed. Existing `marked`. Bends `ink:stain` (which today marks only walkers, audit In3).
- Combos: far + carry: the extra tile passes on too; fine. again + carry: a second push can start a new hand-off; fine. far/again + smear: fine. No clash.

### Guard

Headline: *Shields the target from the next 2 damage until your next turn. A shielded hit is still a hit.*

**Guard-shielded-I** · `guard:shielded` (*Guard on a unit that already has a shield adds to it…*)

- a · `guard-shielded-long`: *A second Guard does not add to the shield; it makes it last one round longer.*
  Engine: `damage.ts::gainShield`, already shielded: amount unchanged, end date +1 round. Existing `shieldGained`.
- b · `guard-shielded-thick`: *A second Guard adds 3, not 2.*
  Engine: same site, amount 3. Existing `shieldGained`. A plain number, kept because Guard has one line and length vs size is the honest choice here.

**Guard-shielded-II** · `guard:shielded`

- a · `guard-shielded-spill`: *Guard on a shielded unit also shields the nearest unshielded ally beside it for 1.*
  Engine: after `gainShield`, a second `gainShield` of 1 on the first allied neighbour in reading order. Existing event.
- b · `guard-shielded-thorns`: *A unit Guarded twice bites back: whoever hits it while the shield lasts takes 1.*
  Engine: a flag on the shield; `damage.ts::dealDamage` deals 1 to the hitter on any hit. Existing `damage`; stamps `guard:shielded`. Bends Bind's "is hit" (a thorn is a hit on the hitter).
- Combos: long + spill, thick + spill: spill is its own 1, so it never reads the I choice; fine. long + thorns: a longer window for thorns; fine. thick + thorns: fine.

### Ink

Headline: *Lands Ink.*

**Ink-mark-I** · `ink:mark` (*Ink on a marked unit makes a deep mark, which takes two sparks to clear.*)

- a · `ink-mark-overflow`: *Ink on a marked unit runs over: the nearest unmarked unit beside it is marked instead, and the first mark stays plain.*
  Engine: `mix.ts::inkOnUnit`, already marked: `markUnit` on the first unmarked neighbour. Existing `marked`. You give up deep marks to mark two foes.
- b · `ink-mark-heavy`: *A deep-marked unit is too heavy to slide: pushed onto oil, it stops at once.*
  Engine: `push.ts` slide check skips a deep-marked unit. Existing `push`. Pins a foe you have marked twice, against your own oil tricks too.

**Ink-mark-II** · `ink:mark`

- a · `ink-mark-pass`: *When a Spark peels a deep mark, the plain mark left over jumps to the nearest unmarked unit beside it.*
  Engine: `bursts.ts` on `spark:deepMark`: move the remaining mark (`markLifted`). Existing event. Bends `spark:deepMark`.
- b · `ink-mark-flare`: *When a Spark peels a deep mark, each unit beside it takes 1.*
  Engine: same site, 1 to each neighbour. Existing `damage`.
- Combos: overflow + pass: few deep marks are made with overflow (only by other means: a second cast, a foe's spit), so pass fires rarely; fine but weak. Note for the player. heavy + pass, heavy + flare, overflow + flare: fine.

**Ink-stain-I** · `ink:stain` (*A stain marks a unit that ends its move on it.*)

- a · `ink-stain-pushed`: *A stain also marks a unit pushed, slid or swapped onto it.*
  Engine: `mix.ts::stainMarks` called from `push.ts` and swap arrivals as well as `movement.ts` (one arrival path after FD). Existing `marked`.
- b · `ink-stain-wet`: *A stain marks a unit that walks across it, not only one that stops on it.*
  Engine: `movement.ts` calls `stainMarks` on every tile of the walk. Existing `marked`.

**Ink-stain-II** · `ink:stain`

- a · `ink-stain-deepen`: *A stain deepens the mark of a marked unit that ends its move on it.*
  Engine: `stainMarks` on a marked unit calls the deep-mark mix. Existing `marked` (`deep: true`). Bends `ink:mark`.
- b · `ink-stain-wick`: *Fire running along oil burns a stain as Inkfire, not as plain fire.*
  Engine: `bursts.ts::ignite`, a stain in the run uses the `page:stain` burst. Existing `burst`. Bends `spark:slick` (audit Sk4).
- Combos: pushed + deepen: pushing a marked foe back onto a stain deepens it; fine. wet + deepen: walking across deepens; fine. pushed/wet + wick: unrelated parts of one stain; fine.

**Ink-spread-I** · `ink:spread` (*A plain mark that lands in a cloud… spreads to every unit in the connected cloud, allies too…*)

- a · `ink-spread-kin`: *A spreading mark reaches only units on its bearer's side: a foe's mark spreads to foes, an ally's to allies.*
  Engine: `marks.ts::spreadFrom` filters by side. Existing `markSpread`. A foe's spit on you still spreads to your allies; your ink on a foe spares them.
- b · `ink-spread-seep`: *A spreading mark also reaches units standing beside the cloud.*
  Engine: `spreadFrom` adds the cloud's outer neighbours. Existing `markSpread`. More reach, more friendly fire.
- c · *spare* `ink-spread-slow`: *A mark spreads one ring of the cloud per round, not all at once.*
  Engine: spread scheduled at round end, one step per round. Needs a `Scheduled` kind (`spread`). Competes with seep as the "reach" opinion.

**Ink-spread-II** · `ink:spread`

- a · `ink-spread-brand`: *A cloud a mark spreads through becomes a brand cloud.*
  Engine: after `markSpread`, convert the cloud network's tiles to `brandCloud` (`mixed` per tile). Existing event. Bends `ink:cloud` and `spark:brandCloud`.
- b · `ink-spread-deep`: *A marked unit the spread reaches has its mark deepened.*
  Engine: `spreadFrom` deepens instead of skipping a marked unit (still once per unit per fight). Existing `marked`. Bends `ink:mark`.
- Combos: kin + brand: the brand cloud then marks every unit at round end, allies too, which undoes kin's care; a real tension, keep it (note for the player). kin + deep, seep + brand, seep + deep: fine.

### Oil

Headline: *Lands Oil.*

**Oil-slick-I** · `oil:slick` · **built**

- a · `oil-slick-corners`: *Oil on a slick makes a pool that also covers the tiles diagonal to it.* (built)
- b · `oil-slick-short`: *Oil on a slick makes a pool that lasts one round less.* (built)

**Oil-slick-II** · `oil:slick`

- a · `oil-slick-lane`: *A pool also reaches one more tile ahead along the spell's heading.*
  Engine: `mix.ts::soakNeighbours` adds the tile two ahead. Existing `spreadState`. Makes a slide lane for Shove.
- b · `oil-slick-seep`: *A pool's soak turns a neighbouring blot into a stain, not a slick.*
  Engine: `soakNeighbours`, blot branch makes `stain` (audit Oi3). Existing `mixed`. Bends `ink:stain`.
- Combos: corners + lane: diagonals and one tile ahead; additive, fine. short + lane: fine. corners/short + seep: fine. Note: built `oil-slick-short` reads as a plain cost; its opinion is "the pool clears out of your own way sooner". Kept as built.

**Oil-cloud-I** · `oil:cloud` (*Oil on a cloud makes grease fog…*)

- a · `oil-cloud-wide`: *Oil on a cloud greases the whole connected cloud, not only its tile.*
  Engine: `mix.ts` grease-fog mix applied over `networks.ts::cloudNet`. Existing `mixed` per tile. You lose the plain cloud's storm and cover.
- b · `oil-cloud-long`: *Grease fog lasts one round longer.*
  Engine: `mix.ts::newLayer` rounds +1 for `greaseFog`. No new event.

**Oil-cloud-II** · `oil:cloud`

- a · `oil-cloud-drip`: *Grease fog leaves a slick on each of its tiles when it fades.*
  Engine: `decayStates`, `greaseFog` fades to `slick`. Existing `stateFades` plus `landed`/`mixed`. Fuel for a later fire.
- b · `oil-cloud-slip`: *In grease fog, a unit that walks slides one tile on, as if pushed.*
  Engine: `movement.ts`, an arrival in grease fog continues 1 along the step. Existing `push`. Foes and you both slip.
- Combos: wide + drip: a large cloud leaves a large slick; fine. wide + slip: a large slippery room; fine. long + drip, long + slip: fine.

### Steam

Headline: *Lands Steam.* (Margin lines changed from the audit; see F1.)

**Steam-kettle-I** · `steam:kettle` (*A kettle scalds each unit beside it for 1 at round end.*)

- a · `steam-kettle-corners`: *A kettle also scalds the units diagonal to it.*
  Engine: `mix.ts::roundEndChemistry` kettle reach adds diagonals. Existing `damage`.
- b · `steam-kettle-long`: *A kettle lasts one round longer.*
  Engine: `newLayer` rounds +1 for `kettle`. No new event.

**Steam-kettle-II** · `steam:kettle`

- a · `steam-kettle-press`: *A unit crushed against a kettle is scalded for 1 more.*
  Engine: `push.ts::stopAt` on a kettle: +1 `damage` with `steam:kettle`. Bends `shove:plate`.
- b · `steam-kettle-breath`: *At round end a kettle puts a cloud on the first empty tile beside it.*
  Engine: `roundEndChemistry` lands Steam on one neighbour (reading order). Existing `landed`. Feeds storms and cover.
- Combos: corners + press, long + press: fine. corners + breath: fine. long + breath: one more cloud per round; fine. No clash.

**Steam-cloud-I** · `steam:cloud` (*Steam on a cloud makes a bank, a thick cloud that lasts longer.*)

- a · `steam-cloud-wide`: *Steam on a cloud thickens the whole connected cloud into a bank.*
  Engine: the bank mix over `cloudNet`. Existing `mixed` per tile.
- b · `steam-cloud-long`: *A bank lasts one round longer still.*
  Engine: `newLayer` rounds +1 for `bank`. No new event.

**Steam-cloud-II** · `steam:cloud`

- a · `steam-cloud-thunder`: *A thunderhead's round-end storm strikes where the bank was, even if the cloud is gone.*
  Engine: `bursts.ts::runThunderheads` drops the cloud check (audit Sk9). Existing `burst`. Bends `spark:bank`.
- b · `steam-cloud-damp`: *Fire that runs into a bank goes out there and leaves the bank.*
  Engine: `bursts.ts::ignite` stops at bank tiles. Existing `burst` (fewer tiles). A firebreak for your own side.
- Combos: wide + thunder: a wide bank and a sure second storm; strong, fine. wide + damp: a wide firebreak; fine. long + either: fine.

### Brass

Headline: *Lands Brass.* (Margin lines changed from the audit; see F2.)

**Brass-plate-I** · `brass:plate` (*Brass on a plate makes a wall, which takes two hits to break.*)

- a · `brass-plate-stand`: *A wall never fades; it stands until it is broken.*
  Engine: `newLayer` rounds 0 for `wall` (as blots and slicks). No new event.
- b · `brass-plate-broad`: *Brass on a plate makes a second plate on the free tile behind it along the heading, instead of a wall.*
  Engine: `mix.ts` plate+brass branch lands a plate one ahead; `brass:plate` stamped there. Existing `landed`. Width instead of strength.

**Brass-plate-II** · `brass:plate`

- a · `brass-plate-hum`: *Spark on brass that touches a wall deals 1 more to every unit touching the wall.*
  Engine: `bursts.ts` conduct burst, extra damage for units beside a wall in the network. Existing `damage`. Bends `spark:plate`.
- b · `brass-plate-ground`: *A wall grounds a conduct: the burst stops at the wall and does not reach the brass beyond it.*
  Engine: `networks.ts` brass net does not pass through wall tiles. Existing `burst` (fewer units). Lets you Spark one half of a network safely.
- Combos: stand + hum, stand + ground: a lasting wall that amplifies or insulates; fine. broad + hum/ground: broad makes no wall, so II fires only on walls made by other means (Brass on a plate cast twice, a kettle washed…). **Clash in practice**: broad leaves II nearly idle. Note for the player; keep only if broad is rejected or II is moved onto plates in general.

**Brass-mark-I** · `brass:mark` (*Brass on a marked unit makes a shackle that replaces the mark.*)

- a · `brass-mark-long`: *A shackle lasts one round longer.*
  Engine: `mix.ts::shackle` rounds +1. Existing `shackle` effect.
- b · `brass-mark-keep`: *A shackle keeps the mark under it, but lasts one round less.*
  Engine: `shackle` does not spend the mark; rounds −1. Existing `marked` stays. The foe can be detonated while shackled.

**Brass-mark-II** · `brass:mark`

- a · `brass-mark-anchor`: *A shackled unit cannot be pushed either.*
  Engine: `push.ts::push` returns early for a shackled unit, as `shove:held` does. Existing `miss`/`push` with 0 tiles; stamps `brass:mark`. Your own Shoves fail on it too.
- b · `brass-mark-throw`: *Spark snapping a shackle throws the unit two tiles, not one.*
  Engine: `bursts.ts::pageShackle` push distance 2. Existing `push`/`crush`. Bends `spark:shackle`.
- Combos: long + anchor: a long, total lock; fine. keep + anchor: fine. long/keep + throw: fine. keep + throw: Spark on a kept-mark shackle bursts the unit layer: the shackle snaps first (unit layer order) and the mark stays; check the order at build time.

### Spark

Headline: *Lands Spark, the igniter.*

**Spark-slick-I** · `spark:slick` · **built**

- a · `spark-slick-hot`: *Spark on oil lights it for 3 now instead of 2.* (built)
- b · `spark-slick-long`: *Spark on oil lights it, and the fire burns for 3 rounds instead of 2.* (built)

**Spark-slick-II** · `spark:slick`

- a · `spark-slick-smoke`: *Fire that burns out leaves a cloud on its tile.*
  Engine: `decayStates`, `fire` fades to `cloud`. Existing `stateFades` plus `landed`. Cover and storm fuel after the burn.
- b · `spark-slick-soot`: *Fire that burns out leaves a blot on its tile.*
  Engine: `decayStates`, `fire` fades to `blot`. Oil then makes a stain there.
- Combos: hot/long + smoke/soot: the aftermath only; long delays it a round. No clash.

**Spark-mark-I** · `spark:mark` (*Spark on a marked unit detonates the mark: 3 damage, and the mark is spent.*)

- a · `spark-mark-wide`: *A detonation also deals 1 to each unit beside the marked one.*
  Engine: `bursts.ts::burstUnit` detonation, 1 to neighbours. Existing `damage`/`burst`.
- b · `spark-mark-keep`: *A detonation deals 2, and the mark stays.*
  Engine: same site, damage 2, mark not spent. No `markSpent`. A mark becomes a target for several Sparks.

**Spark-mark-II** · `spark:mark`

- a · `spark-mark-chain`: *A detonation in a cloud also detonates the spread copies of that mark in the same cloud.*
  Engine: `burstUnit` walks the mark's spread copies on `cloudNet` and detonates each once. Existing `burst`. Bends `ink:spread`. Strong; respects the 500-event cap and once per copy.
- b · `spark-mark-blast`: *A detonation knocks the unit one tile along the heading.*
  Engine: `push.ts::push` after the detonation. Existing `push`/`crush`. Bends `shove:*`.
- Combos: wide + chain: every copy also hits its neighbours; the biggest pairing, flag for tuning. wide + blast: fine. keep + chain: each copy deals 2 and stays; fine. keep + blast: a stay-marked unit knocked about; fine.

**Spark-plate-I** · `spark:plate` (*Spark on brass conducts: 2 damage to every unit on or touching the connected brass.*)

- a · `spark-plate-focus`: *A conduct deals 3 to units standing on the brass and no longer reaches units only beside it.*
  Engine: `bursts.ts` conduct target set and damage. Existing `burst`/`damage`.
- b · `spark-plate-spare`: *A conduct passes over your apprentices, but deals 1, not 2.*
  Engine: same site, filter allies, damage 1. Existing events.

**Spark-plate-II** · `spark:plate`

- a · `spark-plate-jolt`: *A unit a conduct hits is jolted one tile away from the brass.*
  Engine: after the conduct, `push.ts::push` each reached unit away from its nearest brass tile (no heading: skip units on the brass). Existing `push`/`crush`.
- b · `spark-plate-charge`: *Sparked brass stays charged for the round: the first unit to step onto or beside it takes 1.*
  Engine: a charged flag on the network; `movement.ts` arrival check. Existing `damage`; stamps `spark:plate`. Needs a round-end clear (a `Scheduled` kind or a layer field).
- Combos: focus + jolt: units on the brass have no "away" (they stand on it), so focus leaves jolt with no one to move. **Clash.** Resolve: jolt reads "…is jolted one tile off the brass, along the spark's heading". spare + jolt, focus + charge, spare + charge: fine (spare makes charge pass over your party too, say so in the text).

### Fork

Headline: *Left branch acts on the tile left of the target, right branch on the tile right.*

**Fork-unit-I** · `fork:unit` (*A Fork branch keeps the way of the spell…*)

- a · `fork-unit-splay`: *Each branch points its own side's way: a Shove on the left branch pushes left.*
  Engine: `runes/flow.ts::forkSide` heading = side direction. No new event.
- b · `fork-unit-wide`: *The branches act two tiles out to each side instead of one.*
  Engine: `forkSide` offset 2. No new event. Not the Stoker's habit (that adds the tile ahead).

**Fork-unit-II** · `fork:unit`

- a · `fork-unit-bounce`: *A branch that would leave the room acts on the target instead.*
  Engine: `forkSide` off-board returns the target. Bends `fork:edge` (it stops firing). No new event.
- b · `fork-unit-both`: *A tile reached by both branches is acted on by both, left first.*
  Engine: `runes/flow.ts::add` no longer dedups across branches (audit Fo3). No new event. Mostly after Splash.
- Combos: splay + bounce: a bounced branch points its side's way, so the target is shoved sideways; reads well. splay + both: a doubly reached tile is pushed left then right; fine. wide + bounce: fine. wide + both: fewer overlaps at range 2; fine.

### The thirteen capstones

Capstones need no witnessed line. Each is "when X, also Y"; the headline stays true.

**Bolt-III**
- a · `bolt-cap-onward`: *When Bolt's target dies during the spell, the runes still to come act on the next unit along the line.*
  Engine: `resolve.ts::runStep` on a dead unit target: re-aim along the stored path. No new event (`aimed` again).
- b · `bolt-cap-front`: *When Bolt reaches a unit, the rest also acts on the tile just in front of it.*
  Engine: `targets.ts::boltTravel` adds the last empty path tile as a second target. Oil in front, then a Shove into it.

**Splash-III**
- a · `splash-cap-heart`: *When a unit stands at the centre of your Splash, the rest acts on it twice.*
  Engine: `areaTargets` lists the centre twice (last). No new event.
- b · `splash-cap-trail`: *When your Splash lands a kind, it also lands on the tiles between you and the centre.*
  Engine: kind steps add the `travel` path tiles. Existing `landed`. Lay a line of oil to the fight.

**Touch-III**
- a · `touch-cap-behind`: *When Touch aims at a neighbouring unit, the rest also acts on the unit behind it in a line.*
  Engine: `aimTargets` adds the next unit along the heading (adjacent only). No new event.
- b · `touch-cap-wake`: *When Touch aims at yourself, the rest also acts on the tile you stepped from.*
  Engine: `aimTargets` adds the tile opposite `lastMove`. No new event.

**Strike-III**
- a · `strike-cap-finish`: *When Strike kills its target, the rest also acts on the nearest unit beside it.*
  Engine: `resolve.ts`, on `died` from Strike, re-target to the first neighbour. No new event.
- b · `strike-cap-crack`: *When Strike lands on a tile with a plate, wall, kettle or skid plate, it breaks it.*
  Engine: `runes/actions.ts::strike` on a tile target with a standing layer calls `wearPlate`. Existing `erased`/`stateFades`; a plate break event if `wearPlate` has one. Gives Strike a tile target.

**Shove-III** (the design's illustrative pair)
- a · `shove-cap-chain`: *When a crush happens, the unit crushed against is shoved one tile too.*
  Engine: `push.ts::stopAt` on a unit: push the blocker 1 (once, no recursion). Existing `push`.
- b · `shove-cap-oily`: *When a pushed unit slid on oil, the tile it stops on becomes a slick.*
  Engine: end of the slide loop lands Oil on the stop tile. Existing `landed`.

**Guard-III**
- a · `guard-cap-share`: *When you Guard someone else, you gain 1 shield too.*
  Engine: `runes/actions.ts::guard`, non-self target: `gainShield(caster, 1)`. Existing event.
- b · `guard-cap-brace`: *While a Guarded unit's shield lasts, pushes do not move it.*
  Engine: `push.ts::push` returns early for a Guard-shielded unit (a flag on the shield). Your own Shoves on it fail too.

**Ink-III**
- a · `ink-cap-trail`: *When a marked unit walks, it leaves a blot on the tile it left.*
  Engine: `movement.ts`, marked mover lands Ink on the departure tile. Existing `landed`. Oil those blots into stains.
- b · `ink-cap-seen`: *When a marked foe stands in a cloud, it is not hidden: Bolt stops on it, not on the cloud's edge.*
  Engine: `queries.ts::travel` cloud stop skips to a marked unit in the same cloud line. No new event. Bends `bolt:cloud`.

**Oil-III**
- a · `oil-cap-slip`: *When a unit walks onto a slick, it slides one tile on.*
  Engine: `movement.ts` arrival on a slick continues 1. Existing `push`. Foes and you alike.
- b · `oil-cap-skate`: *When one of your apprentices walks onto a slick, the next tile along costs no step.*
  Engine: `movement.ts` move budget +1 after a slick arrival, same direction. Existing `moved`. Your party only.

**Steam-III**
- a · `steam-cap-carry`: *When a unit standing in a cloud is pushed, its cloud tile goes with it.*
  Engine: `push.ts` relocates the cloud layer with the unit if the target tile is free of states. Existing `push`, `spreadState`. A brand cloud you can move.
- b · `steam-cap-scald`: *When you land Steam on a unit's tile, the cloud scalds that unit for 1 at round end.*
  Engine: a `hot` flag on the new cloud; `roundEndChemistry` deals 1. Existing `damage`.

**Brass-III**
- a · `brass-cap-magnet`: *When a collared unit is two tiles from a plate at round end, it is pulled one tile toward it.*
  Engine: `roundEndChemistry` pull step for collared units. Existing `pull`/`push`.
- b · `brass-cap-net`: *When a pushed unit hits a plate you cast, it is caught: no crush, and it is collared.*
  Engine: `push.ts::stopAt` on a cast plate: no damage, `collar`. Existing `collared`. Feeds Conduct.

**Spark-III** (a is from the design's illustrative pair)
- a · `spark-cap-pyre`: *When a burst kills a unit, its tile catches fire.*
  Engine: on `died` with a burst source, land a fire state. Existing `landed`/`burst`.
- b · `spark-cap-arc`: *When a Spark finds nothing to burst, it arcs to the nearest unit within 2 for 1.*
  Engine: `mix.ts:298` miss branch becomes a 1 `damage` to the nearest unit. Existing event. The design's other example (Spark opens a jar early) is left out: jars are canal content.

**Fork-III**
- a · `fork-cap-pinch`: *When both branches push units, they push toward the target, not along the spell.*
  Engine: `forkSide` heading toward the target when both branches carry a Shove and both sides hold units (checked at cast start, R8). Existing `push`/`crush`.
- b · `fork-cap-behind`: *When a branch's tile is empty, that branch acts on the tile behind the target instead.*
  Engine: `forkSide` empty side → tile opposite the heading. Both empty: the left takes it, the right is dropped.

**Bend-III**
- a · `bend-cap-turn`: *The runes after a Bend also turn the spell's heading the way the Bend turns.*
  Engine: `lattice.ts` records the turn; `resolve.ts` rotates the heading for later steps. No new event. A Bend → Shove pushes sideways.
- b · `bend-cap-back`: *The runes after a Bend act with the heading reversed.*
  Engine: same, rotated 180°. A Shove after it pulls toward you (stops against you, crushing both).

## 3. The methods

### Conduct

Headline: *An Action that travels the connected brass the target touches, reaching each unit on it once.*

**Conduct-network-I** · `conduct:network`

- a · `conduct-network-scatter`: *Each conducted unit takes its own heading, away from the brass, not the target's.*
  Engine: `inventions.ts::conduct` headings map per unit. No new event. Impulse scatters instead of sweeping.
- b · `conduct-network-spare`: *A conducted action passes over your apprentices on the brass.*
  Engine: `inventions.ts::conduct` filters allies. Existing `conducted`. Breaks the Brass shelter (Conduct(Guard)), so it is not free.

**Conduct-network-II** · `conduct:network`

- a · `conduct-network-collar`: *Every unit a conduct reaches is collared, so it joins the brass for the next one.*
  Engine: after `conducted`, `collar` each reached unit without one. Existing `collared`. Bends `spark:collar`.
- b · `conduct-network-hum`: *A conduct leaves its brass humming: Spark on it this round deals 1 more.*
  Engine: a round flag on the network; the conduct burst reads it. Needs a round-end clear. Bends `spark:plate`.
- Combos: scatter + collar: units are pushed away and carry the network with them; fine. spare + collar: allies are not collared (they were skipped); say so. scatter/spare + hum: fine.

**Conduct-III**
- a · `conduct-cap-mark`: *When the target is marked, every unit the conduct reaches is marked too.* (the design's illustrative capstone)
  Engine: `inventions.ts::conduct` copies a plain mark (not bound actions, limit 3 holds). Existing `marked`.
- b · `conduct-cap-cloud`: *When no brass touches the target, the action travels the connected cloud instead.*
  Engine: `conduct` falls back to `cloudNet`. Bends `conduct:noTarget` (it fires less). No new event.

### Repeat

Headline: *An Action that happens now and once more next turn, on the same tile.*

**Repeat-empty-I** · `repeat:empty` (canal line: canal solvents)

- a · `repeat-empty-follow`: *A repeat follows the unit it first hit, not the tile, while that unit lives.*
  Engine: `schedule.ts` stores a unit target; falls back to the tile when the unit is gone. Existing `repeated`.
- b · `repeat-empty-reaim`: *A repeat points from where its caster stands when it falls due, not the first cast's way.*
  Engine: `schedule.ts::run` recomputes the heading from the caster. No new event.

**Repeat-empty-II** · `repeat:empty`

- a · `repeat-empty-dusk`: *A repeat falls due at round end, not on your next turn.*
  Engine: `Scheduled` repeat runs in the round-end step. Existing `repeated`. It acts before the foes' next move, after yours.
- b · `repeat-empty-step`: *A repeat goes off early if a unit steps onto its tile before it falls due.*
  Engine: `movement.ts` arrival checks scheduled repeats on the tile (as a step jar). Existing `repeated`. Bends Jar's idea without a jar.
- c · *spare* `repeat-empty-faithful`: *A repeat still goes off if its caster is down.*
  Engine: `schedule.ts::run` skips the HP check. Bends `repeat:member`. Competes with dusk; close to a plain upgrade, so offered as spare only.
- Combos: follow + dusk: fine. reaim + dusk, reaim + step: fine. **follow + step clashes**: a repeat that follows a unit has no tile to step onto. Resolve: step reads "…if a unit steps onto its tile, or the unit it follows is moved, before it falls due".

**Repeat-III** (a is the design's illustrative capstone)
- a · `repeat-cap-pushed`: *When the target is pushed during your turn, the repeat acts at once on its new tile, and is spent.*
  Engine: `push.ts` arrival checks scheduled repeats for the unit. Existing `repeated`.
- b · `repeat-cap-patient`: *When a repeat falls due on an empty tile, it waits one more turn.*
  Engine: `schedule.ts::run` reschedules once (still spent after, limit 5 holds). Existing `scheduled`.

### Margin

Headline: *Turns a Repeat into an Aura: touching Actions repeat next turn.*

**Margin-empty-I** · `margin:empty` (canal line)

- a · `margin-empty-follow`: *An echo follows the unit it first hit, not the tile.*
  Engine: as `repeat-empty-follow`, for `margin` scheduled kinds.
- b · `margin-empty-wait`: *An echo on an empty tile waits until a unit stands there, up to two turns.*
  Engine: `schedule.ts::run` reschedules an empty echo up to twice. Existing `scheduled`.

**Margin-empty-II** · `margin:empty`

- a · `margin-empty-mirror`: *An echo points the opposite way to the first cast.*
  Engine: `schedule.ts` stored heading reversed. A Shove comes back; a Fork's sides swap.
- b · `margin-empty-relay`: *An echo falls due on the next apprentice's turn, not yours.*
  Engine: `schedule.ts` due on the next member in casting order. Existing `repeated`. Casting order becomes the echo's timing.
- Combos: follow + mirror: the followed unit is pushed back where it came from; fine. wait + mirror, follow/wait + relay: fine. wait + relay: "two turns" means two of the next apprentice's turns; say so.

**Margin-III**
- a · `margin-cap-diagonal`: *A Margin also reaches the Actions diagonally touching it on the page.*
  Engine: the FN-11 `auraDiagonal` mechanism for Margin inventions (FN-11 left aura inventions out; this is the extension). Proposal M1.
- b · `margin-cap-kinds`: *A Margin also echoes the Kinds it touches.*
  Engine: `inventions.ts::marginEcho` accepts Kind steps. Existing `repeated`. Oil now, oil again next turn.

### Bind

Headline: *Ink + an Action + an event: a mark that holds the action until the event.*

**Bind-mark-I** · `bind:mark` (ink-quarter line: Wax or Sand)

- a · `bind-mark-recoil`: *A released action always points from the hitter toward the bearer.*
  Engine: `marks.ts::releaseHeading` uses only the hitter rule (audit Bi4). No new event.
- b · `bind-mark-fixed`: *A released action always points the way the Bind was cast.*
  Engine: same site, cast heading only. Predictable for traps you set yourself.

**Bind-mark-II** · `bind:mark`

- a · `bind-mark-lastword`: *A hit that kills the bearer still releases its "is hit" mark.*
  Engine: `marks.ts::onHook` drops the `!isAlive` return for "hit" (audit Bi3, flag F3). Existing `released`.
- b · `bind-mark-layered`: *A deep mark holds two bound actions and releases them one per event.*
  Engine: `inventions.ts::bind` stores a second action on a deep mark instead of dropping it (bends `bind:deepMark`). Existing `released`. Limit 2 (one release per copy) holds per layer.
- Combos: recoil/fixed + lastword: fine; a dead bearer's release points as I says (recoil uses the killer). recoil/fixed + layered: both releases follow I's heading; fine.

**Bind-cloud-I** · `bind:cloud`

- a · `bind-cloud-kin`: *A bound mark spreads only to units on its bearer's side.*
  Engine: `marks.ts::spreadFrom` side filter for bound marks. Existing `markSpread`. Same opinion as `ink-spread-kin`; one rule, two subjects.
- b · `bind-cloud-late`: *A bound mark spreads at round end, not at once.*
  Engine: spread scheduled for round end. Needs a `Scheduled` kind (`spread`), shared with spare `ink-spread-slow`.

**Bind-cloud-II** · `bind:cloud`

- a · `bind-cloud-chorus`: *When one copy releases, every copy in the same cloud releases too.*
  Engine: `marks.ts::release` releases the cloud's copies once each; the depth-3 fizzle (Bi5) and the event cap hold. Existing `released`.
- b · `bind-cloud-haunt`: *A cloud a bound mark spread through keeps the action: a unit that walks in later is marked with it.*
  Engine: a held action on the cloud tiles; `movement.ts` arrival marks. Needs a layer field for the held action. Still once per unit per fight.
- Combos: kin + chorus: your side's copies all go off together; fine. kin + haunt: only units of the bearer's side are marked on entry; say so. late + chorus: fine. late + haunt: the cloud holds the action from round end; fine.

**Bind-III**
- a · `bind-cap-rearm`: *When a bound mark releases, its bearer is left with a plain mark.*
  Engine: after `released`, `markUnit` plain. Existing `marked`. A Spark then has something to detonate.
- b · `bind-cap-snare`: *Bind on an empty tile binds the blot: the first unit to step onto it is marked with the action.*
  Engine: `inventions.ts::bind` empty branch stores the action on the blot; `movement.ts` arrival marks. Needs a layer field (shared with `bind-cloud-haunt`). Bends `bind:empty`. Uses only the existing Bind events, so no district's event is taken early.

### Lift

Headline: *Turns an Action on a unit into one on its mark: moves the mark, with whatever it holds, to an adjacent unit.*

**Lift-unit-I** · `lift:unit` (ink-quarter line)

- a · `lift-unit-far`: *A lifted mark can travel two tiles along the heading to the first unit there.*
  Engine: `marks.ts::liftMark` looks one tile further. Existing `markLifted`.
- b · `lift-unit-aside`: *With no unit ahead, a lifted mark goes to a unit beside the target instead, left first.*
  Engine: `liftMark` fallback to the left then right neighbour. Bends `lift:noTarget`.

**Lift-unit-II** · `lift:unit`

- a · `lift-unit-spread`: *A lifted mark spreads on arrival if its new bearer stands in a cloud.*
  Engine: `liftMark` calls `spreadFrom` (audit Li1; the spread history still holds). Existing `markSpread`. Bends `ink:spread`.
- b · `lift-unit-deepen`: *A mark lifted onto a marked unit deepens its mark instead of being refused.*
  Engine: `liftMark` on a marked receiver: deep-mark mix; a held action keeps the old rule (`bind:deepMark`). Existing `marked`.
- Combos: far + spread, aside + spread: fine. far/aside + deepen: fine. None clash.

**Lift-III**
- a · `lift-cap-trade`: *When the receiving unit is marked, the two marks trade places.*
  Engine: `liftMark` swaps marks. Existing `markLifted` twice.
- b · `lift-cap-drop`: *When no unit can take the mark, it is left on the tile as a stain.*
  Engine: `liftMark` no-target branch lands a stain. Existing `landed`. Bends `lift:noTarget`. A held action is lost (limit 6: no release).

## 4. The Seam solvents

### Gallnut

Rule: *whoever it reaches is also marked.*

**Gallnut-unit-I** · `gallnut:unit`

- a · `gallnut-unit-deep`: *Gallnut deepens the mark of a unit that already carries one.*
  Engine: `solvents.ts` `gallnut.onReach` on a marked unit: deep-mark mix. Existing `marked`.
- b · `gallnut-unit-blot`: *Gallnut also leaves a blot under each unit it marks.*
  Engine: `onReach` lands Ink on the tile. Existing `landed`. Stains follow with Oil.

**Gallnut-unit-II** · `gallnut:unit`

- a · `gallnut-unit-every`: *A Gallnut repeat marks on every pass, not only the first.*
  Engine: `schedule.ts::run` calls `onReach` (audit Ga2). Existing `marked`. Bends `repeat:empty`.
- b · `gallnut-unit-heavy`: *A unit marked by Gallnut does not slide on oil until its mark is spent.*
  Engine: a flag on the mark; `push.ts` slide check. Bends `shove:slick`.
- Combos: deep + every: each pass deepens; fine (a deep mark cannot go deeper). blot + every: a blot each pass; fine. deep/blot + heavy: fine.

**Gallnut-III**
- a · `gallnut-cap-bloom`: *When the invention reaches a unit in a cloud, the connected cloud becomes a brand cloud.*
  Engine: `onReach` converts `cloudNet` to `brandCloud`. Existing `mixed`.
- b · `gallnut-cap-stain`: *When the invention reaches a unit on a slick, the slick becomes a stain.*
  Engine: `onReach` lands Ink on a slick tile. Existing `mixed`.

### Cinder

Rule: *it leaves the tile hot (oil there catches fire).*

**Cinder-slick-I** · `cinder:slick`

- a · `cinder-slick-long`: *A hot tile stays hot for three rounds.*
  Engine: `solvents.ts` `cinder.before` rounds 3. No new event.
- b · `cinder-slick-follow`: *The heat follows a pushed target: the tile it ends on is hot too.*
  Engine: `cinder.after` heats the target's end tile (audit Ci3). No new event (heating is silent, audit Ci1).

**Cinder-slick-II** · `cinder:slick`

- a · `cinder-slick-trails`: *A rat's oil trail over a hot tile catches too.*
  Engine: `movement.ts::leaveSlick` calls `catchIfHot` (audit Ci2). Existing `burst`. This is the open rule question A3 offered as a choice; if the player rules that trails always catch, this variant must change.
- b · `cinder-slick-steam`: *A cloud on a hot tile scalds the units in it for 1 at round end.*
  Engine: `roundEndChemistry` checks heat under clouds. Existing `damage`.
- Combos: long + trails: a long trap for rats; fine. follow + trails, long/follow + steam: fine.

**Cinder-III**
- a · `cinder-cap-spread`: *When a hot tile catches, the tiles beside it become hot.*
  Engine: `catchIfHot` heats neighbours (once; they do not chain further). No new event.
- b · `cinder-cap-brass`: *When the invention reaches brass, the whole connected brass is hot: units on it at round end take 1.*
  Engine: `cinder.before` on a plate or collar heats the network; `roundEndChemistry` deals 1. Existing `damage`. Needs heat on plates (today only floor tiles).

## 5. Counts

- **Runes:** 23 margin lines; 46 level I/II pairs (5 built, 41 new); 13 capstone pairs.
- **Methods:** 6 margin lines; 12 level I/II pairs; 5 capstone pairs.
- **Solvents:** 2 margin lines; 4 level I/II pairs; 2 capstone pairs.
- **Total new pairs:** 77 (57 line pairs, 20 capstone pairs). **Spares:** 3 (`touch-unit-draw`, `ink-spread-slow`, `repeat-empty-faithful`).
- **Flags:** missing lines F1 `steam:unit`, F2 `brass:unit`, F3 Bind's killing-hit line. Clashes noted: Brass-plate broad × II, Spark-plate focus × jolt (resolved in text), Repeat follow × step (resolved in text), Touch-unit draw × follow (spare only).
- **New engine pieces** (beyond hooks): a `LineStop` `state` (bolt-empty-settle); a `Scheduled` `spread` kind (ink-spread-slow, bind-cloud-late); a held action on a layer (bind-cloud-haunt, bind-cap-snare); round flags with a clear (spark-plate-charge, conduct-network-hum); heat on plates (cinder-cap-brass). No new `Meets` values.

## 6. Questions for the player

The pairs I am least sure of, in order:

1. **Splash-member-II** (friendly vs step): two good rules that are not about the same thing. Is a pair allowed to be "safety vs movement"?
2. **Spark-mark-II-a** `spark-mark-chain`: the strongest variant here (every spread copy detonates). Keep, or limit to copies beside the bearer?
3. **Brass-plate-I-b** `brass-plate-broad`: it leaves Brass-plate-II idle. Drop broad, or move II onto plates in general?
4. **Brass and Steam margin lines** (F1, F2): add `brass:unit` and `steam:unit` rows first (collars and hiding under yourself are each rune's best wiring), or ship on the lines that exist?
5. **Ink-spread-I and Bind-cloud-I** share the "kin" opinion. One rule on two subjects, or give Bind a different one?
6. **Guard-shielded-I-b** `guard-shielded-thick` is a plain number. Fine for a one-line rune, or should Guard's level I also change a wiring?
7. **Cinder-slick-II-a** depends on the open rat-trail question (A3): if you would rather trails always catch, this pair needs a new option.
8. **Gallnut-unit-II-b** `gallnut-unit-heavy` is the weakest idea in the file; a better second opinion is welcome.

## 7. Proposals

| # | Proposal | Reason |
|---|---|---|
| M1 | Margin's capstone a reuses FN-11's diagonal reach for Margin inventions | One mechanism; FN-11 left aura inventions out on purpose, this is the one place it fits |
| M2 | Steam and Brass margin lines move to `steam:kettle`/`steam:cloud` and `brass:plate`/`brass:mark` until F1/F2 rows exist | A slot needs a real, witnessable line; no row is invented here |
| M3 | Variants may bend a neighbouring line's behaviour but always stamp their own slot's line | Level II is defined as an interaction with a neighbour; credit stays with the subject that wrote it |
| M4 | No capstone takes another district's content (no jars, no "pushed" or "dies" Bind events) | A Seam-only household must be able to use every Seam capstone |
| M5 | Built `oil-slick-short` and `shove-wall-soft` stay as they are, though they read as costs | The brief keeps built pairs; their opinion is "less of the rule in your own way" |
