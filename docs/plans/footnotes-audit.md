# Footnotes: Seam fine-print audit (FN-1A, BL-101)

Audited 2026-10-23 against `src/data/lines.ts` (100 rows) and the engine sites that stamp lines (`withLine` in `resolve.ts`, `targets.ts`, `runes/actions.ts`, `push.ts`, `mix.ts`, `bursts.ts`, `marks.ts`, `inventions.ts`, `schedule.ts`, `solvents.ts`, `turn.ts`, `movement.ts`). Plan: [footnotes-plan.md](footnotes-plan.md) (FN-1A, P1, P5, §6). Design: [footnotes.md](../design/footnotes.md).

This is a documentation audit; it changes no rules. Every row below is a behaviour the code has today and that no fine-print row describes (or that a row describes wrongly). Nothing is listed to reach a count; a subject with nothing missing says so.

**Kinds of gap**

- **new**: no row; an event already exists where the line can be stamped.
- **new+event**: no row, and the engine returns silently today; FN-9/FN-10 must emit an event (usually a `miss`) to stamp it.
- **text**: an existing row fires here, but its text leaves the behaviour out or says something else. Fix the text (FD's stable-ID rule allows text changes), or split a row if the plan prefers.

**Proposed IDs** follow `subject:meets`. Where no existing `Meets` value fits, the ID is marked *(new meets)*; see Proposals.

## 1. Summary

| Subject | Rows now | Gaps | new | new+event | text |
|---|---|---|---|---|---|
| Bolt | 3 | 1 | 0 | 0 | 1 |
| Splash | 0 | 4 | 4 | 0 | 0 |
| Touch | 0 | 2 | 2 | 0 | 0 |
| Strike | 1 | 1 | 0 | 1 | 0 |
| Shove | 6 Seam (+3 district) | 2 | 1 | 0 | 1 |
| Guard | 1 | 2 | 0 | 1 | 1 |
| Ink | 10 | 5 | 3 | 0 | 2 |
| Oil | 6 | 3 | 2 | 0 | 1 |
| Steam | 7 | 3 | 3 | 0 | 0 |
| Brass | 7 | 5 | 3 | 1 | 1 |
| Spark | 17 | 9 | 2 | 0 | 7 |
| Fork | 1 | 4 | 2 | 0 | 2 |
| Bend | 0 | 0 | 0 | 0 | 0 |
| Conduct | 2 | 3 | 0 | 0 | 3 |
| Repeat | 1 | 2 | 0 | 1 | 1 |
| Margin | 1 | 2 | 0 | 2 | 0 |
| Bind | 3 | 5 | 0 | 3 | 2 |
| Lift | 2 | 1 | 0 | 0 | 1 |
| Gallnut | 1 | 2 | 0 | 0 | 2 |
| Cinder | 1 | 3 | 0 | 1 | 2 |
| **Total** | | **59** | **22** | **10** | **27** |

## 2. Seam runes

### Bolt (`bolt:cloud`, `bolt:plate`, `bolt:empty`)

| # | Behaviour | Firing case | Engine | Proposed | Kind |
|---|---|---|---|---|---|
| Bo1 | Every standing-up layer stops Bolt, not only a plate, grate or gate: a wall, kettle or skid plate does too (all are `isPlate`). The log names any of them "brass plate" | Bolt right at a kettle two tiles away: it stops on the kettle | `queries.ts::travel` (`blocksUnits`), `resolve.ts::flight` | `bolt:plate` | text |

Nothing else: range, first unit and the open-line landing are the headline and the three rows.

### Splash (no rows)

| # | Behaviour | Firing case | Engine | Proposed | Kind |
|---|---|---|---|---|---|
| Sp1 | Each tile's heading points **out from the centre** along the larger axis; the centre and the four corners take the caster-to-centre heading. A Shove after Splash scatters units outward | Splash + Shove centred on a rat with rats left and right of it: the left one is pushed left, the right one right, the centre one away from the caster | `targets.ts::areaTargets` (stamp on `aimed`) | `splash:unit` | new |
| Sp2 | Aimed at the caster's own tile, the centre and the corners have **no heading**, so a Shove there does nothing (`shove:noHeading` fires, whose text only talks about Touch) | Splash + Shove on your own tile: only the four edge tiles are pushed | `targets.ts::axisToward` returns null | `splash:noHeading` | new |
| Sp3 | The caster can stand inside its own Splash and is a target like anyone (range 3, radius 1) | Splash + Strike aimed at the tile beside you: you take 2 | `targets.ts::areaTargets`, `queries.ts::legalAims` | `splash:member` | new |
| Sp4 | Near an edge the 3×3 is clipped: fewer targets, no edge tile acted on | Splash aimed at a corner tile: 4 targets, not 9 | `queries.ts::clip` | `splash:edge` | new |

### Touch (no rows)

| # | Behaviour | Firing case | Engine | Proposed | Kind |
|---|---|---|---|---|---|
| To1 | Touch on yourself carries the direction of **your last step this turn**; it is cleared when you undo the move and at the start of your turn | Walk two tiles right, then Touch-self + Shove: you are pushed one more tile right | `targets.ts::aimTargets` (`caster.lastMove`), `movement.ts`, `turn.ts::beginPlayerPhase` | `touch:member` | new |
| To2 | Touch on an adjacent unit or tile carries the heading **away from you**: a Shove pushes it away, a Fork's branches go to its sides | Touch + Fork + Strike on the rat to your right: the tiles above and below it are struck | `targets.ts::aimTargets` (`axisToward`) | `touch:unit` | new |

### Strike (`strike:shielded`)

| # | Behaviour | Firing case | Engine | Proposed | Kind |
|---|---|---|---|---|---|
| St1 | Strike on a tile nobody stands on does nothing, and the log is silent | Bolt + Strike with no unit within 4: the Strike lands on an empty tile | `runes/actions.ts::strike` (returns before any event) | `strike:empty` | new+event |

### Shove (Seam: `noHeading`, `slick`, `plate`, `wall`, `unit`, `edge`)

| # | Behaviour | Firing case | Engine | Proposed | Kind |
|---|---|---|---|---|---|
| Sh1 | A plate **set into the room's floor** (`=` in a layout) never breaks under a crush; only cast plates do. `shove:plate` says "the plate breaks" | In a Seam room with a layout plate, shove a rat into it; it takes the crush and the plate stays | `push.ts::wearPlate` | `shove:plate` | text |
| Sh2 | A pushed apprentice can no longer undo their move this turn | Walk, then an ally's Bolt + Shove pushes you: Undo is gone | `push.ts::push` (`unit.undo = null`) | `shove:member` | new |

### Guard (`guard:shielded`)

| # | Behaviour | Firing case | Engine | Proposed | Kind |
|---|---|---|---|---|---|
| Gu1 | A second Guard adds its 2 and the shield keeps the **later** of the two end dates (a round-gifted Guard's longer date survives a plain one) | A round-gifted caster Guards an ally, then a plain Guard lands on them: 4 shield, lasting the gifted extra round | `damage.ts::gainShield` | `guard:shielded` | text |
| Gu2 | Guard on a tile nobody stands on does nothing, silently | Splash + Guard over your party: the empty tiles in the 3×3 do nothing | `runes/actions.ts::guard` | `guard:empty` | new+event |

### Ink (10 rows)

| # | Behaviour | Firing case | Engine | Proposed | Kind |
|---|---|---|---|---|---|
| In1 | Ink lands **on a unit** standing on the tile, not on the tile under it: it marks the unit and leaves the slick, cloud or plate below alone | Bolt + Ink at a rat standing on a slick: the rat is marked, no stain appears | `mix.ts::inkOnUnit` (last branch, `markUnit`) | `ink:unit` | new |
| In2 | A **plain** Ink mark on a unit in a cloud spreads to every unmarked unit in the connected cloud. This Seam behaviour is stamped `bind:cloud` (an Ink Quarter row), so it credits Bind, not Ink (P2), and costs Ink Quarter solvents to footnote | Steam a tile, Bolt + Ink a rat standing in that cloud next to another rat: both are marked | `marks.ts::spreadFrom` | `ink:spread` *(new meets)*, keeping `bind:cloud` for bound marks | new |
| In3 | A stain marks only a unit that **walks** onto it; one pushed or swapped there is not marked | Shove a rat onto a stain: no mark until it walks on it again | `mix.ts::stainMarks`, called only from `movement.ts` | `ink:stain` | text |
| In4 | A shackle uses up a **cast** collar; a **born** collar (the sentry's) stays under it and is back when the shackle wears off | Ink a sentry and a Brass-collared rat; three rounds later Spark a plate both touch: only the sentry conducts | `mix.ts::shackle` | `ink:collar` | text |
| In5 | Ink on bare floor leaves a blot that **never fades** by itself: it stays until something mixes with it, washes it, or it is drawn or erased | A round-1 blot is still there in round 6 for an Oil to turn into a stain | `mix.ts::newLayer` (`rounds = 0`), `decayStates` | `ink:empty` | new |

### Oil (6 rows)

| # | Behaviour | Firing case | Engine | Proposed | Kind |
|---|---|---|---|---|---|
| Oi1 | Oil on bare floor leaves a slick that **never fades**; it lasts until mixed, burnt, drawn or erased | A slick laid in round 1 is still there to light in round 5 | `mix.ts::newLayer`, `decayStates` | `oil:empty` | new |
| Oi2 | Oil never lands on a unit: it goes to the tile under it, so the unit slides when it is next pushed | Bolt + Oil + Shove at a rat: it is pushed and slides on | `mix.ts::landKindWith` (`unitOn` only for Ink, Brass) | `oil:unit` | new |
| Oi3 | A pool's soak turns a neighbouring **blot into a slick** (not a stain) and skips tiles with any other state or a plate | Oil on a slick with a blot beside it: the blot becomes a slick | `mix.ts::soakNeighbours` | `oil:slick` | text |

### Steam (7 rows)

| # | Behaviour | Firing case | Engine | Proposed | Kind |
|---|---|---|---|---|---|
| Se1 | Steam on bare floor makes a cloud that lasts 2 rounds and hides whoever stands in it | Steam a tile in round 1; it fades at the end of round 2 | `mix.ts::newLayer` | `steam:empty` | new |
| Se2 | Steam lands on the tile **under** a unit, so the unit is hidden inside it at once | Touch-self + Steam: the sentry's line shot stops on your tile's cloud and you take nothing | `mix.ts::landKindWith`, `queries.ts::travel` | `steam:unit` | new |
| Se3 | A cloud stops a **foe's** line shot or ink spit, as it stops Bolt; nothing is stamped there | A cloud between a sentry and an apprentice: its line is stopped | `turn.ts::resolveIntent` (`case 'cloud'`) | `steam:shot` *(new meets)* | new |

### Brass (7 rows)

| # | Behaviour | Firing case | Engine | Proposed | Kind |
|---|---|---|---|---|---|
| Br1 | Brass on a bare unit **collars** it: the unit counts as brass, joins the network and conducts | Bolt + Brass at a rat beside a plate, then Spark the plate: the rat and whoever touches it take 2 | `mix.ts::brassOnUnit`, `collar` | `brass:unit` | new |
| Br2 | Brass on a unit that already wears a collar (born or cast) does nothing, with no event | Bolt + Brass at a sentry | `mix.ts::brassOnUnit` (no branch) | `brass:collar` | new+event |
| Br3 | Brass on bare floor makes a plate that lasts 3 rounds, blocks walking, pushes and shots, and breaks after one crush | A plate in a corridor: the rat walks around it | `mix.ts::newLayer`, `queries.ts::blocksUnits` | `brass:empty` | new |
| Br4 | A plate (or any standing-up layer) stops a **foe's** line shot too | A plate between a sentry and an apprentice | `turn.ts::resolveIntent` (`case 'blocked'`) | `brass:shot` *(new meets)* | new |
| Br5 | Brass on a marked unit's shackle uses up a cast collar the same way as Ink (In4); a born collar stays | Brass a marked sentry: shackled, still brass, collar back after | `mix.ts::shackle` | `brass:mark` | text |

### Spark (17 rows)

| # | Behaviour | Firing case | Engine | Proposed | Kind |
|---|---|---|---|---|---|
| Sk1 | Spark **stings** the unit it lands on for 1, then bursts the unit layer, then the tile layer. If the sting kills the unit, its mark, shackle or collar never bursts (the tile still does) | Bolt + Spark at a marked 1-HP familiar on a slick: it dies of the sting, no detonation, the oil lights | `mix.ts::sparkLand` | `spark:unit` | new |
| Sk2 | Spark on a blot does nothing: plain ink does not burn | Bolt + Spark at an empty blot | `bursts.ts::burstTile` (`default`), `mix.ts:298` miss | `spark:blot` | new |
| Sk3 | The sting is a **hit**: a mark bound to "is hit" releases before Spark can detonate it, so the bound action happens and no detonation | Bind (Shove, is hit) a rat, then Spark it: it is shoved, takes 1, no 3 | `damage.ts::dealDamage` → `marks.ts::onHook` → `bursts.ts::burstUnit` | `spark:mark` | text |
| Sk4 | Fire running along connected oil turns **stains and pools** in the run into plain fire: no Inkfire marking, no pool's 3 | Spark a slick that touches a stain: the stain burns as plain fire and marks nobody | `bursts.ts::ignite` (`marks` only for `page:stain`) | `spark:slick` | text |
| Sk5 | Fire burns **whoever stands in it** for 1 at round end (not on entry). That burn is stamped `spark:slick`, whose text only says the fire burns 2 rounds | A rat pushed onto a burning tile takes 1 at dusk, not at once | `mix.ts::roundEndChemistry` | `spark:slick` | text |
| Sk6 | A storm started on a plain cloud runs through joined brand clouds, banks and grease fog **without their extras** (no double hits, no fog fire, no second storm) | Spark a cloud touching a brand cloud: marked units there are hit once | `bursts.ts::storm`, `networks.ts::cloudNet` | `spark:cloud` | text |
| Sk7 | A shackle snapped with **no heading** deals its 3 and throws nothing | Splash + Spark on your own tile with a shackled rat at a corner | `bursts.ts::pageShackle` | `spark:shackle` | text |
| Sk8 | A skid plate with no unit ahead flies off the board and is gone | Spark a skid plate heading at an empty row | `bursts.ts::pageSkid` | `spark:skidPlate` | text |
| Sk9 | A thunderhead's second storm needs a cloud still on the tile at dusk | Spark a bank, then Brass it (washed to a plate): no dusk storm | `bursts.ts::runThunderheads` | `spark:bank` | text |

### Fork (`fork:noHeading`)

| # | Behaviour | Firing case | Engine | Proposed | Kind |
|---|---|---|---|---|---|
| Fo1 | A branch that would leave the board is dropped silently | Bolt up along the left column + Fork + Strike: only the right branch strikes | `runes/flow.ts::forkSide` (`inBoard`) | `fork:edge` | new |
| Fo2 | A branch keeps the **heading of the target it came from**: a Shove after a Fork pushes along the spell's line, not sideways | Bolt right + Fork + Shove: the units above and below the target are pushed right | `runes/flow.ts::forkSide` (`add(..., heading, true)`) | `fork:unit` | new |
| Fo3 | Where two targets' sides fall on one tile, it is acted on once (the first wins) | Splash + Fork + Strike: a tile beside two targets is struck once | `runes/flow.ts::add` | `fork:unit` | text (with Fo2) |
| Fo4 | The left branch runs to the end before the right one starts | Fork left Shove into a crush, right Spark: the crush lands first | `resolve.ts::runStep` (LIFO queue) | `fork:unit` | text (with Fo2) |

### Bend (no rows)

Nothing to add. Bend acts on the page only (`lattice.ts`: it turns the walk; a Bend pointing back where the flow came from ends it), with no board event to stamp. Per P5 it gets only its capstone pair.

## 3. Methods and Seam solvents

### Conduct (`conduct:network`, `conduct:noTarget`)

| # | Behaviour | Firing case | Engine | Proposed | Kind |
|---|---|---|---|---|---|
| Co1 | Every conducted unit takes the **target's heading**: a conducted Shove pushes everyone on the brass the same way | Bolt right + Conduct(Shove) at a sentry with two rats on its plate: all three are pushed right | `inventions.ts::conduct` (headings map) | `conduct:network` | text |
| Co2 | A target beside **several separate** brass pieces conducts along all of them | A rat between two unconnected plates: units on both are reached | `inventions.ts::networkTouching` | `conduct:network` | text |
| Co3 | The network and who is on it are read once, before anyone acts: units pushed on or off it meanwhile don't change who is reached | Conduct(Shove) pushes a rat so it ends beside the brass: it is not reached a second time, and no newcomer is added | `inventions.ts::conduct` (limit 4) | `conduct:network` | text |

### Repeat (`repeat:empty`, canals)

| # | Behaviour | Firing case | Engine | Proposed | Kind |
|---|---|---|---|---|---|
| Re1 | A repeat **lapses** if its caster is down when it comes due | Repeat(Strike), then the caster falls in the enemy phase: nothing happens next turn | `schedule.ts::run` (owner HP check) | `repeat:member` | new+event |
| Re2 | A repeat keeps the **first cast's heading**: next turn's Shove pushes the same way, whoever stands there | Bolt right + Repeat(Shove): next turn the new occupant is pushed right | `inventions.ts::repeat` (`heading` stored) | `repeat:empty` | text |

### Margin (`margin:empty`, canals)

| # | Behaviour | Firing case | Engine | Proposed | Kind |
|---|---|---|---|---|---|
| Ma1 | A Margin never echoes a **Repeat invention** or an action already repeating (limit 5): it acts now and once more, not twice more | A Repeat(Strike) on a path touching a Margin | `inventions.ts::marginEcho` (`isRepeat`, `flow.repeated`) | `margin:` *(new meets)* | new+event |
| Ma2 | An echo lapses if its caster is down when it comes due (as Re1) | Margin path, caster falls before their turn | `schedule.ts::run` | `margin:member` | new+event |

### Bind (`bind:cloud`, `bind:mark`, `bind:empty`; Ink Quarter)

| # | Behaviour | Firing case | Engine | Proposed | Kind |
|---|---|---|---|---|---|
| Bi1 | Bind on a mark that **already holds** an action deepens it and keeps the old action; the new one is lost | Bind(Strike, hit) then Bind(Shove, hit) on one rat: the next hit releases Strike | `inventions.ts::bind` (`!unit.mark.bound`) | `bind:deepMark` | new+event |
| Bi2 | Bind on a collared unit makes a **shackle that holds nothing** | Bind(Shove, hit) on a sentry | `inventions.ts::bind`, `mix.ts::inkOnUnit` | `bind:collar` | new+event |
| Bi3 | A **killing** hit does not release an "is hit" mark; only a "dies" mark answers a death | Bind(Shove, hit) on a 2-HP rat, then Strike it: it dies, nothing is shoved | `marks.ts::onHook` (`!isAlive` return) | `bind:minion` *(or new meets)* | new+event |
| Bi4 | A released action's heading: the hit's own heading, else from the hitter toward the bearer, else the binding cast's | Bind(Shove, hit) cast from above; a foe bites from the left: the bearer is pushed right | `marks.ts::releaseHeading` (P30) | `bind:mark` | text |
| Bi5 | Releases nested more than 3 deep fizzle | Three bound marks in a cloud whose actions hit each other in turn | `marks.ts::release` (`RELEASE_DEPTH_LIMIT`) | `bind:mark` | text |

### Lift (`lift:unit`, `lift:noTarget`; Ink Quarter)

| # | Behaviour | Firing case | Engine | Proposed | Kind |
|---|---|---|---|---|---|
| Li1 | A lifted mark does **not spread** on arrival, even onto a unit standing in a cloud (it may spread later when its bearer walks into one) | Lift(Shove) a mark onto a rat in a cloud beside another rat: only the first is marked | `marks.ts::liftMark` (no `spreadFrom`) | `lift:unit` | text |

### Gallnut (`gallnut:unit`)

| # | Behaviour | Firing case | Engine | Proposed | Kind |
|---|---|---|---|---|---|
| Ga1 | On a **Lift**, Gallnut marks the unit the mark just left (it is what the Lift reached), so both end marked | Lift(Shove) + Gallnut on a marked rat beside another | `solvents.ts` `gallnut.onReach` after `inventions.ts::lift` | `gallnut:unit` | text |
| Ga2 | On a **Repeat**, Gallnut marks only on the first pass; the repeat next turn carries the solvent but not its marking | Repeat(Strike) + Gallnut; Spark spends the mark; next turn's Strike marks nobody | `inventions.ts::runInvention` (`onReach`), `schedule.ts::run` | `gallnut:unit` | text |

### Cinder (`cinder:slick`)

| # | Behaviour | Firing case | Engine | Proposed | Kind |
|---|---|---|---|---|---|
| Ci1 | Heating a tile makes **no event**; a hot tile with no oil shows nothing until oil lands | A Cinder invention on bare floor | `solvents.ts` `cinder.before` | `cinder:empty` | new+event |
| Ci2 | A **rat's oil trail** over a hot tile does not catch, although `cinder:slick` says oil "now or later" catches. Either the trail should call `catchIfHot` or the text should say "oil you land" | Heat a tile with Cinder; a rat runs across it: the slick stays unlit | `movement.ts::leaveSlick` (no `catchIfHot`) | `cinder:slick` | text (or engine fix) |
| Ci3 | Only the target's **starting tile** is heated: a pushed target leaves the heat behind; conducted units' tiles are not heated | Conduct(Shove) + Cinder on a rat on a plate edge: only the rat's first tile is hot | `solvents.ts` `cinder.before`/`after` | `cinder:slick` | text |

## 4. Candidate margin lines (P1)

A margin line must be witnessable, so lines marked **(FN-9)** or **(FN-10)** exist only once that task adds the row. Level I pairs already built (FN-3 migrates them) are marked **built**. Alternates are listed where two lines compete.

| Subject | Margin lines | Why these | Alternates |
|---|---|---|---|
| Bolt | `bolt:empty` (built), `bolt:cloud` | Where the shot lands and what a cloud does to it are the two wiring questions | `bolt:plate` |
| Splash | `splash:unit` (FN-9), `splash:member` (FN-9) | Outward headings make Splash a push shape; standing inside it is the other choice it forces | `splash:noHeading` |
| Touch | `touch:member` (FN-9), `touch:unit` (FN-9) | Both are heading rules; self-propulsion is Touch's identity | |
| Strike | `strike:shielded` | Its only honest line (P1: one) | |
| Shove | `shove:wall` (built), `shove:slick` (built) | Already have level I; crushes and slides are the wiring | `shove:unit` |
| Guard | `guard:shielded` | Its only honest line | |
| Ink | `ink:mark`, `ink:stain`, `ink:spread` (FN-9) | Deep marks, stains and spreading are the three ways Ink is wired | `ink:unit` (FN-9), `ink:cloud` |
| Oil | `oil:slick` (built), `oil:cloud` | Pool and grease fog are the two compounds Oil is reached for | `oil:plate` |
| Steam | `steam:unit` (FN-9), `steam:kettle` | Hiding under yourself and the kettle's scald are the two plays | `steam:cloud` (bank) |
| Brass | `brass:unit` (FN-9), `brass:plate` | Collars and walls change networks and crushes | `brass:empty` (FN-9) |
| Spark | `spark:slick` (built), `spark:mark`, `spark:plate` | Fire, detonation and conduct are the three bursts every build uses | `spark:cloud`, `spark:unit` (FN-9) |
| Fork | `fork:unit` (FN-9) | The heading rule is the only line a player wires around | `fork:edge` (FN-9) |
| Bend | none | P5: capstone pair only | |
| Conduct | `conduct:network` | The only line that acts | |
| Repeat | `repeat:empty` | Its waiting rule | `repeat:member` (FN-10) |
| Margin | `margin:empty` | Its waiting rule | |
| Bind | `bind:mark`, `bind:cloud` | Release and spread are what Bind is | `bind:deepMark` (FN-10) |
| Lift | `lift:unit` | The only line that acts | |
| Gallnut | `gallnut:unit` | Its one line (P4) | |
| Cinder | `cinder:slick` | Its one line (P4) | |

Seam runes: 23 margin lines (8 need FN-9 rows first; 5 are built at level I). Methods: 6. Seam solvents: 2.

## 5. Cross-cutting findings

- **Misfiled Seam line.** Plain Ink spreading in a cloud is stamped `bind:cloud` (district `inkQuarter`), so a Seam-only party earns Bind points and the line's footnote costs Ink Quarter solvents (In2). FN-9 should stamp unbound spreads with a Seam Ink row.
- **Foes fire lines.** A familiar's spit lands Ink through `landKindFree` and fires Ink's lines (`ink:slick`, `ink:mark`, …); under P2 these credit Ink like a player's cast. Fine by the design ("witnessed"), but worth knowing when tuning thresholds.
- **Cinder rewrites Spark's lines.** `catchIfHot` restamps every `spark:*` event in a heat-lit burst as `cinder:slick`, so an Inkfire or pool fire started by heat credits Cinder, not Spark. Consistent with P2; note it in the Cinder text if it surprises.
- **Text that says the wrong thing**: `shove:plate` (layout plates never break, Sh1), `spark:slick` (also stamps the round-end burn, Sk5), `cinder:slick` (rat trails, Ci2), `bolt:plate` (walls, kettles, skid plates, Bo1).
- **No subject**: vents (`@` in Seam rooms) refill clouds at dusk and rats lay slicks, unstamped; both are terrain or foe behaviour, not a rune's, so no row is proposed.

## 6. Per-district gaps for later batches

Each district's audit (template step 1) starts here. Zero-row runes first.

| District | Runes with no rows | Silent behaviours seen in passing |
|---|---|---|
| Canals | **Jar, Fuse, Afterglow** | A jar over the owner's limit crumbles (`jars.ts::sealJar`, `jarCrumbles` unstamped); any unit, foe or ally, opens a step jar; Afterglow's extra round is spent once (`mix.ts::decayStates`); the current carries units and floats with no line (`current.ts::drift`); gates burn from adjacent fire (`gateBurns` unstamped); Brass on a gate or grate is a bare `miss`; a crush into a gate or grate is stamped `shove:plate` although they never break; anchored and swimming foes are crushed with line `null` (`push.ts::stopAt`); fliers never slide or fall |
| Ink Quarter | **Levy, Tally** | Levy on an unmarked target does nothing silently; Tally counts a born collar and a shackle as things (`runes/flow.ts::tallyCount`) |
| Bathhouses | **Vat, Seep, Steep** | Steep copies only onto empty tiles and never puts a standing-up layer under a unit (`mix.ts::spreadSteep`); Fog jar's weaker push can be 0 tiles |
| Bridges | **Brink, Lay** (Hold has 1) | A wall edge is not an edge to Brink (P3); a Lay'd plate still breaks under a crush (`push.ts::wearPlate`) |
| Foundry | **Toll, Coil, Unison** | Coil reaches one further for bursts and Conduct, two when gifted; Unison ignores foes' casts (`runes/flow.ts::unisonWith`) |
| Cartographers | none (Swap 1, Draw 4, Erase 5) | Erase removing a tile state is stamped `null` (`runes/actions.ts::erase`); Draw silently refuses to move a state onto a gate or grate; Graphite puts a unit whose home is taken on the first free tile |

## 7. Proposals

| # | Proposal | Reason |
|---|---|---|
| A1 | Allow **new `Meets` values** where none fits (`spread`, `shot`, a limit-5 refusal for Margin) rather than bending an existing one | IDs never change once shipped; a misleading `meets` would be permanent |
| A2 | Fix wrong text (**text** rows) by editing the row, not by adding a second row for the same event | One event, one line; the stable-ID rule covers IDs, not text |
| A3 | Ci2 is left for the player as a design choice (trail catches, or text narrows to "oil you land") | It is a rule question, not an audit fact |
| A4 | Lines that would fire on nearly every cast (`splash:unit`, `fork:unit`, `oil:empty`) are still proposed: they are the honest place for the heading and duration rules, and P1 needs wiring-relevant lines | `bolt:empty` already works this way |
