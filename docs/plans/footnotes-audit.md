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

## 8. Canals: the Timing runes (CN-F1, P12)

Audited 2026-11-04 against `src/data/lines.ts` and the sites that touch jars and waits: `jars.ts` (`sealJar`, `openJar`, `openDuskJars`), `arrival.ts` (`stepJar`), `schedule.ts::run`, `solvents.ts::driftWaiting`, `current.ts::drift`, `mix.ts::newLayer`/`decayStates`, `lattice.ts` (seal steps, `aurasAround`). Same kinds of gap as above. Rows added by CN-F1 are marked **added**; their firing cases are in `tests/scenarios/canal-lines.test.ts`.

| Subject | Rows before | Rows after |
|---|---|---|
| Jar | 1 (`jar:unit`, RV-20b) | 2 |
| Fuse | 0 | 2 |
| Afterglow | 0 | 0 |
| Pitch | 1 (`pitch:water`) | 1 |
| Wick | 1 (`wick:unit`) | 2 |

### Jar (`jar:unit`, `jar:jar`)

| # | Behaviour | Firing case | Engine | Line | Kind |
|---|---|---|---|---|---|
| Ja1 | A new jar crumbles the owner's oldest empty once they hold their limit (one, Jars and Fuses together; two with the Draughtsman's habit), and crumbles any jar already on its tile, whoever owns it. `jarCrumbles` was unstamped. A restore that crumbles keeps its own `restoreErase:jar` | Seal a Jar, end the turn, seal another: the first crumbles | `jars.ts::sealJar`/`crumble` | `jar:jar` | **added** |
| Ja2 | Every jar on water drifts one tile downstream at dusk and opens on a unit it floats under (Lantern Walk), **Pitch or not**; the drift is stamped `pitch:water`, so a plain Jar's float credits Pitch | `solvents.test` "pitch-jar-floats-and-opens-on-a-foe" seals a plain Jar | `solvents.ts::driftWaiting` | `jar:water` (and `fuse:water`) | new, **not added**: the stamp is in `solvents.ts`, outside CN-F1's files |
| Ja3 | A jar sealed under a standing unit does not open: it waits for the next arrival on the tile | Bolt + Jar + Strike at a rat: the rat stands on the jar untouched | `resolve.ts` (`seal`), `arrival.ts::stepJar` | none: `jar:unit` is the only fitting id and is taken; fold into its text (A2) if wanted | text |
| Ja4 | A unit pushed, pulled, swapped or carried onto a step-jar opens it (any arrival, not only a walk); a rival's walk over another's jar opens it only with the Lamplighter's note | Shove a rat onto your jar | `arrival.ts::stepJar`, `jars.ts::stepOpens` | `jar:unit` already fires on these | none |

### Fuse (`fuse:jar`, `fuse:unit`)

| # | Behaviour | Firing case | Engine | Line | Kind |
|---|---|---|---|---|---|
| Fu1 | A Fuse counts against the same jar limit as Jar and crumbles the oldest jar, and any jar on its tile | A Jar on the board, then seal a Fuse: the Jar crumbles | `jars.ts::sealJar` | `fuse:jar` | **added** |
| Fu2 | At dusk a Fuse opens on **whoever stands on its tile then**, foe included, not on the unit it was sealed at. This was stamped `jar:unit` (crediting Jar for a Fuse) whenever a non-owner stood there | Bolt + Fuse + Strike at a dummy: at dusk it opens under the dummy | `jars.ts::openJar` (`jarLine`) | `fuse:unit` | **added** (and the `jar:unit` misfile fixed) |
| Fu3 | Dusk jars open in **reading order**, not sealing order; a jar sealed while they open waits for the next dusk. P12's candidate said "sealing order": the code says reading order | Two Fuses, the lower one sealed first: the upper opens first | `jars.ts::openDuskJars` | none: no fitting `Meets` (`order` is the ink writs' Bench term) | new (needs a meets value) |
| Fu4 | A Fuse on water drifts before it opens, so it opens on its new tile | Fuse on a lane | `solvents.ts::driftWaiting` | `fuse:water` | as Ja2 |
| Fu5 | A step onto a Fuse jar does nothing (the Fuse habit aside, `fuseOnStep:jar`) | | | headline | none |

### Afterglow (no rows)

| # | Behaviour | Firing case | Engine | Line | Kind |
|---|---|---|---|---|---|
| Af1 | Only a **compound** takes the flag: Afterglow touching a plain cloud, slick or plate does nothing | Afterglow beside Steam on bare floor: the cloud lasts 2 | `mix.ts::newLayer` (`isCompound`) | `afterglow:cloud` or similar | new+event (the landing event already carries the kind's line) |
| Af2 | The extra round is spent once, at the first round end the compound would have ticked; a gifted Afterglow adds one more to its count | | `mix.ts::decayStates` | | new+event (decay is silent) |
| Af3 | A drifting stain keeps its Afterglow | Afterglow + Ink + Oil on a lane | `current.ts::drift` (the layer moves whole) | `afterglow:water` | new+event (`drift` carries no per-float line) |
| Af4 | A rest sealed in a jar keeps the Afterglow that touched the sealing path (P9) | `delayed.test` "afterglow-jar" | `jars.ts::sealedContext` | | none: the compound is landed by the jar's run, nothing distinct to say |

All of Afterglow's lines need an event in `mix.ts` or `current.ts`, neither CN-F1's; none is added. The page side (which paths it touches; diagonals only with FN-11's capstone) is page-only, like Bend.

### Pitch (`pitch:water`)

| # | Behaviour | Firing case | Engine | Line | Kind |
|---|---|---|---|---|---|
| Pi1 | Only a wait aimed at a **tile** drifts; one aimed at a unit follows the unit (the current carries it, or not). A drift into land or a blocker leaves it, silently | Pitch Afterimage at a rat in the lane | `solvents.ts::driftWaiting` (`target.kind === 'tile'`, `downstream`) | `pitch:unit` | new+event |
| Pi2 | `pitch:water` says "a jar or a waiting repeat"; jars float without Pitch (Ja2) | | | `pitch:water` | text, once Ja2 lands |

### Wick (`wick:unit`, `wick:member`)

| # | Behaviour | Firing case | Engine | Line | Kind |
|---|---|---|---|---|---|
| Wi1 | A Wick lapses if its caster is down when it wakes; it returned silently (Repeat and Margin already said so) | Bolt + a Wick Conduct(Strike), then the caster falls: next turn nothing, and a `miss` | `schedule.ts::run` (`LAPSES`) | `wick:member` | **added** (new+event) |
| Wi2 | A Wick aimed at a tile acts on whoever stands there when it wakes | | `schedule.ts::run` | | none: the same rule as Repeat's, its run's own lines fire |

### Canal proposals

| # | Proposal | Reason |
|---|---|---|
| C1 | Stamp a jar's drift with the sealing rune (`jar:water`, `fuse:water`) in `driftWaiting`, keeping `pitch:water` for Pitch waits; then narrow `pitch:water`'s text | Ja2: Pitch is credited for every jar's float today |
| C2 | A crumble inside another line's scope (a restore) keeps that line | `restoreErase:jar` already explains the crumble; one event, one line |
| C3 | `fuse:unit` fires only when someone other than the owner opens the Fuse, mirroring `jar:unit` | Keeps `fuseOnStep:jar` (owner arrivals) its own line |

## 9. Bathhouses: the Areas runes and solvents (BH-F1, P12)

Audited 2026-11-05 against `src/data/lines.ts` and the sites that touch them: `targets.ts` (`aimTargets`, `aimLine`), `runes/flow.ts::seep`, `resolve.ts` (`shape`), `mix.ts::spreadSteep`, `solvents.ts` (`bathSalt`, `fogJar`), `inventions.ts::runInvention`. Rows added by BH-F1 are marked **added**; their firing cases are in `tests/scenarios/bathhouse-lines.test.ts`. The gauge, heat and bather rules are the district's own and are not footnote lines.

| Subject | Rows before | Rows after |
|---|---|---|
| Vat | 0 (only the headline) | 4 |
| Seep | 0 | 1 |
| Steep | 0 | 3 |
| Bath salt | 1 (`bathSalt:cloud`) | 2 |
| Fog jar | 1 (`fogJar:unit`) | 3 |

### Vat

| # | Behaviour | Firing case | Engine | Line | Kind |
|---|---|---|---|---|---|
| Va1 | The 2×2 is the aimed tile and its right, lower and diagonal neighbours; every one is diagonal to the square's centre, so **all four take the one caster-to-square heading** (no outward spread as Splash has). A Shove pushes every unit in it the same way | Vat> Shove at two rats side by side: both go down | `targets.ts::areaTargets` | `vat:unit` | **added** |
| Va2 | The heading is the caster to the square's bottom-right tile, so a caster standing **on** that tile gives all four tiles no heading | Caster at B2, Vat aimed at A1, Shove: nothing moves | `areaTargets` (`inward` is null) | `vat:noHeading` | **added** |
| Va3 | A caster inside the square (aimed on its own tile, or top-left of it) is a target like anyone | Vat> Strike aimed at your own tile | `aimTargets` | `vat:member` | **added** |
| Va4 | At the last column or row the square is clipped: off-board tiles are dropped | Vat at D2 on a four-wide board: 2 targets | `clip` | `vat:edge` | **added** |
| Va5 | Vat on a cloud, slick or plate | | | | none: Vat only picks tiles; the kind on the tile is the Action's own line (`bolt:cloud` stops a Bolt, nothing for an area) |

### Seep

| # | Behaviour | Firing case | Engine | Line | Kind |
|---|---|---|---|---|---|
| Se1 | A neighbour past the room's edge is dropped; the rest still go. Fork says so (`fork:edge`); Seep was silent | Bolt> Seep Strike at a rat on the top row | `flow.ts::seep` (`off`), `resolve.ts` | `seep:edge` | **added** (new+event: a `miss`, as `fork:edge`) |
| Se2 | The neighbours are acted on whoever they are: the caster and allies beside the target are struck or shoved too | Seep Strike with an ally beside the target | `flow.ts::seep` | `seep:member` | new+event, **not added**: no event fires at the neighbour (an `aimed`-like "reached" event is a contract change) |
| Se3 | A neighbour keeps the target's heading (none stays none); on a cloud, a wall or a plate tile Seep still picks it, the Action then does what it does there | | `seep` | none | the Action's own lines (`shove:noHeading`, `shove:plate`) already say it |
| Se4 | After a Fork, Seep's neighbours lose the `fork:unit` mark | | `isForked` | | known drop (FN-9 notes it); not Seep's row |

### Steep

| # | Behaviour | Firing case | Engine | Line | Kind |
|---|---|---|---|---|---|
| St1 | Each round, a steeped compound with rounds left copies itself (with those rounds and the steep) onto every empty neighbour; the copies steep too, so the cloud keeps growing while it lasts. The spread was an unstamped event | Steep, Steam, Oil, one round | `mix.ts::spreadSteep` | `steep:spread` | **added** (stamp only) |
| St2 | A spread stops at a plate, a gate, a grate or a solid piece: it does not go around or over them | Steeped grease fog beside a plate at round end | `spreadSteep` (`blocksUnits`) | `steep:plate` | **added** (new+event: a `miss`, once per source per round) |
| St3 | A steeped plate, kettle or wall will not grow onto a tile where a unit stands (a cloud does) | Steeped kettle beside a rat | `spreadSteep` (`STANDS_UP`) | `steep:unit` | **added** (new+event: a `miss`) |
| St4 | A spread never overwrites a tile that already carries a layer (blot, slick, another compound) | | `spreadSteep` (`t.state`) | | none: silent and the common case in a mixed room; a line would fire most rounds |
| St5 | Lay'd and layout layers (0 rounds), and plain states, never spread | | `spreadSteep` | | none: the headline says "lingering compounds" |
| St6 | The gift (two tiles a round) | `leans.test` "gifted-steep-spreads-two-tiles" | | | none: the gift is the headline's reach |

### Bath salt (`bathSalt:cloud`, `bathSalt:member`)

| # | Behaviour | Firing case | Engine | Line | Kind |
|---|---|---|---|---|---|
| Ba1 | The salt reaches **every** unit in the connected cloud, so your own party in it is struck or shoved too, caster included | Salted Strike at a foe in a cloud with an ally further along | `solvents.ts` (`bathSalt.widen`, `lineFor`) | `bathSalt:member` | **added** (stamp only: `SolventRule.lineFor` picks the line per added target) |
| Ba2 | A target **not** in a cloud adds nothing, silently; a cloud cut by a gap or a diagonal strands the rest | Salted Strike at a foe in the open | `widen` | | new+event, **not added**: no fitting `Meets` ("dry" or `noCloud`) and a `miss` would need A1's new meets value |
| Ba3 | The salt travels with the invention's run only to units, not to bare cloud tiles | | `widen` (`unitAt`) | | none: the headline says "every unit" |

### Fog jar (`fogJar:unit`, `fogJar:member`, `fogJar:empty`)

| # | Behaviour | Firing case | Engine | Line | Kind |
|---|---|---|---|---|---|
| Fo1 | The jar reaches the units beside its target, the caster and allies included, one step weaker | Strike at a rat with an ally beside it | `solvents.ts` (`fogJar.widen`, `lineFor`) | `fogJar:member` | **added** |
| Fo2 | The target can be an **empty tile** (a Bolt that ends short, a tile aim): the units beside that tile still take the weaker hit | Bolt down a column, the rat is beside the tile it ends on | `widen` (`whereIs`) | `fogJar:empty` | **added** |
| Fo3 | A lone target with no neighbours adds nothing; a neighbour that is a wall or a cloud tile without a unit is skipped | | `widen` | | none: silent no-op, the headline's own case |
| Fo4 | Weaker applies only to the added targets; the original takes the full hit | `solvents.test` "fog-jar-neighbours-one-step-weaker" | `runInvention` | `fogJar:unit` | none: already the headline |

### Bathhouse proposals

| # | Proposal | Reason |
|---|---|---|
| B1 | Add a `Meets` value `dry` (or `noCloud`) and give Bath salt a `miss` row for a target outside any cloud (Ba2) | A real trap (the salt does nothing), and the only margin for "salt reaches one tile past the cloud" |
| B2 | Add a "reached" event (or let `aimed`-style events be stamped) so Seep can have `seep:member` (Se2) | The only way to say that Seep strikes your own party; needs `events.ts`, which BH-F1 does not own |
| B3 | `steep:plate` and `steep:unit` emit `miss` ("Steep hits nothing" in the log text); if that reads badly, give them a dedicated `spreadBlocked` event with the text "the spread stops at the plate" | Same precedent as `fork:edge` and `seep:edge`; a proper event is a contract change |
| B4 | Seep and Fork both log "hits nothing" at an edge even when the rest went; shorten both texts to "loses a branch at the edge" when the event gets a `what` field | Misleading log text, minor |

## 10. Bridges: the Structure runes and solvents (BR-17, P12)

Audited 2026-11-06 against `src/data/lines.ts` and the sites that touch the bridge terrain: `runes/actions.ts` (`hold`), `runes/flow.ts` (`beside`, `trial`), `resolve.ts` (`shape`, `trigger`), `mix.ts::newLayer` (Lay's `set` flag), `push.ts` (`stopAt`, drop), `solvents.ts` (Mortar, Chalk), `districts/bridges/support.ts` (cracked set), `wear.ts` and `collapse.ts` (the dusk fall). The terrain in play: a span tile is **cracked** when it is broken or cut off from every pier (still stone, still walkable, falls at dusk); a **fallen** span is fog (a drop tile, no piece); **fog** (`_`) is a drop tile; a **span** is walkable footing with no solid. Rows added by BR-17 are marked **added**; their firing cases are in `tests/scenarios/bridges-audit-lines.test.ts`.

| Subject | Rows before | Rows after |
|---|---|---|
| Hold | 1 (`hold:held`) | 2 |
| Brink | 0 | 3 |
| Lay | 0 | 1 |
| Mortar | 1 (`mortar:unit`) | 1 |
| Chalk | 1 (`chalk:network`) | 1 |

A new `Meets` value, `cracked`, was added to `data/types.ts` (a span tile that is broken or cut off from every pier). `drop` and `edge` already existed.

### Hold (`hold:held`, `hold:cracked`)

| # | Behaviour | Firing case | Engine | Line | Kind |
|---|---|---|---|---|---|
| Ho1 | A unit held on a cracked span cannot step off before dusk and falls with the stone. Hold pins foes and allies alike, so it is the cleanest way to spend a crack, and the trap to avoid on your own party | Bolt > Hold at a rat on a cracked span; dusk drops it | `actions.ts::hold` | `hold:cracked` | **added** (stamp on the existing `held` event) |
| Ho2 | A supported span: Hold is plain, no line | Same cast with a pier beside the span | | none | none |

### Brink (`brink:drop`, `brink:cracked`, `brink:edge`)

| # | Behaviour | Firing case | Engine | Line | Kind |
|---|---|---|---|---|---|
| Br1 | Beside a fallen span (a drop tile of fog) the rest goes through: fog is an edge. This is the row that hosts the Chief Warden's note on Brink (BR-18, BR-20) | Bolt > Brink Strike at a rat beside fog | `flow.ts::brinkLine`, `resolve.ts` (`trigger`) | `brink:drop` | **added** (stamp on `triggered`) |
| Br2 | Beside a **cracked** span the chain stops: it is still stone, so Brink does not count it as an edge until the fall. Reads the tiles as the cast began | Brink Strike at a rat with a cracked span below it | `brinkLine` | `brink:cracked` | **added** |
| Br3 | The room's own walls are not an edge to Brink (P3): only fog, water or a drop rim count. A trap in a walled room | Brink at a rat on the top row | `brinkLine` (`inBoard`) | `brink:edge` | **added** |
| Br4 | Beside canal water Brink passes with no line | | `beside` | none | none: the canals' own terrain, not a bridge behaviour |
| Br5 | A flier standing over fog: the tile counts as a drop | | `beside` | | none: no bridge foe or recruit is both |

### Lay (`lay:cracked`)

| # | Behaviour | Firing case | Engine | Line | Kind |
|---|---|---|---|---|---|
| La1 | A layer Lay sets into a **cracked** span tile (a cloud, a plate) falls with it at dusk and the board shows fog; "for good" means the tile, not the bridge. The fall was silent for the layer | Bolt > Lay Steam at a rat on a cracked span; dusk clears it | `collapse.ts::collapseStep` | `lay:cracked` | **added** (new+event: a `stateFades` stamped at the fall) |
| La2 | On a supported span a Lay'd layer is set like anywhere | Same cast with a pier beside | `mix.ts::newLayer` | none | none |
| La3 | Lay on a blot or slick (no rounds) changes nothing | | `newLayer` (`rounds > 0`) | | none: not bridge-specific |

### Mortar (`mortar:unit`)

| # | Behaviour | Firing case | Engine | Line | Kind |
|---|---|---|---|---|---|
| Mo1 | The extra tile carries a push over the last stone and into the fog: a rat two tiles from a drop is safe from a plain Shove and falls to a Mortar'd one. The fall itself is stamped `shove:drop`, the push `mortar:unit` | Impulse and Impulse with Mortar at a rat two tiles from fog | `push.ts::stopAt`, `solvents.ts` (`pushBonus`) | `mortar:unit` (push), `shove:drop` (fall) | none: the existing row says it; the test pins the terrain case |
| Mo2 | Beside the fog already, Mortar changes nothing: the first step drops it | | `stopAt` | | none |
| Mo3 | A span and a pier are not solid, so pushes and Mortar go over them; only a cracked section's fall at dusk ends it | | `stopAt` (`solid: 'none'`) | | none |

### Chalk (`chalk:network`)

| # | Behaviour | Firing case | Engine | Line | Kind |
|---|---|---|---|---|---|
| Ch1 | The reach is plain distance from the network, so a unit across a fallen tile is reached; fog never blocks it | Impulse with Chalk, a rat two tiles past the brass with fog between | `bursts.ts::unitsNear`, `inventions.ts` | `chalk:network` | none: the existing row says it; the test pins the terrain case |
| Ch2 | Brass on a span falls with it at dusk, so a network cut by a fall has nothing to conduct | | `collapse.ts` (clears `state`) | `conduct:noTarget` | none: Conduct's own row |

### Bridge proposals

| # | Proposal | Reason |
|---|---|---|
| Q1 | Let `brink:cracked` read the cracked set as the **dusk** will see it ("falls at dusk"), or add a preview so the player can see Brink miss before casting | Br2 is the surprise of the district: the span looks like an edge and is not, until it falls |
| Q2 | Give Hold's margin a capstone idea built on Ho1 (held units also take the fall as a crush from the cut) | The row is real and the game's cleanest set piece; BR-18 may want it |
| Q3 | Stamp Lay'd layers lost to a mend or a Mason's pier too (`lay:cracked` fires only at a fall) | Not built: the Mason replaces a fallen tile with fresh stone, nothing to fade |

## 11. Ink Quarter: the Contracts runes and solvents (IQ-F1, P12)

Audited 2026-11-11 against `src/data/lines.ts` and the sites that touch marks, collars and the quarter's pieces: `runes/actions.ts` (`sentence`, `levy`), `runes/flow.ts` (`tallyCount`, `trial`), `resolve.ts` (the `trigger` step), `damage.ts::gainShield`, `marks.ts` (`release`, `spreadFrom`, `spendMark`), `solvents.ts` (`turnBack`, `wax`) and `districts/inkQuarter/` (`writs.ts`, `forward.ts`, `wax.ts`). The quarter's own terrain is not a rune's fine print and gets no row: the writs (return, order, forward and address, the clock's stamp), the Sealer's seal and the terms are pieces and trip rules with their own events and Bench entries. Where one touches a rune, it is listed below.

**Scope of this pass.** IQ-F1 audits Sentence, Levy, Tally, Wax and Sand. Bind and Lift (the quarter's other treasures) were audited in FN-1A (Bi1 to Bi5, Li1) and built in FN-C8/C9; they are not part of this batch. Bi3 (`bind:minion`) and the Bind text rows are still open there.

**Why the new rows are `pending`.** Every new row needs a one-line stamp at an engine site that IQ-F1 does not own (the task owns `lines.ts`, this audit and the tests only). The rows carry final text and `pending: true`, and each `fires` test in `tests/scenarios/footnotes-ink-lines.test.ts` is `it.fails`. IQ-F3 stamps them (sites in the tables), then drops each `pending` flag and each `it.fails`. The `behaviour` tests next to them are green today and prove every claim in this section.

| Subject | Rows before | Rows after |
|---|---|---|
| Sentence | 2 (`sentence:unit`, `sentence:noHeading`) | 3 |
| Levy | 0 | 4 |
| Tally | 0 | 2 |
| Wax | 2 (`wax:cloud`, `wax:fire`) | 2 |
| Sand | 2 (`sand:unit`, `sand:noTarget`) | 2 (one text fix, Sa1) |

No new `Meets` value is needed: `mark`, `unit`, `member`, `shielded`, `collar` and `stamp` exist (`stamp` is the Bench's token for the clock's stamp; here it stands for pieces in general, see Q3).

### Sentence (`sentence:unit`, `sentence:noHeading`, `sentence:mark`)

| # | Behaviour | Firing case | Engine | Line | Kind |
|---|---|---|---|---|---|
| Se1 | A target with no mark has nothing to spend | Bolt > Sentence at an unmarked rat | `actions.ts::sentence` | `sentence:unit` | none: row exists, fires today |
| Se2 | No heading, no push, and the mark stays | Sentence on a tile with no heading | `sentence` | `sentence:noHeading` | none: row exists |
| Se3 | The mark is spent **before** the push, whole. A unit that cannot move (held by a seal or by Hold) still loses it, and the action a bound mark held is lost: it is never released (P31), unlike a hit, which releases | Held rat marked, Bolt > Sentence: the rat stays and the mark is gone; a Bind mark on a rat, Sentence: no `released` | `sentence` (`spendMark` before `push`) | `sentence:mark` | **added** (new: the `markSpent` event exists; wrap `spendMark` in `withLine(ctx, 'sentence:mark', …)`) |
| Se4 | Its push uses the Shove's rules and credits Shove's lines: a crush at the edge fires `shove:edge`, a held unit `shove:held` | Sentence at a marked rat on the last column | `push.ts` | the Shove rows | none: Shove's rows say it |
| Se5 | A unit pushed **past** a return stamp does not meet it: only the landing tile answers (P2). Landing on it sends the unit back to its start tile of the round, undoing the push | Sentence at a marked rat two tiles from a stamp | `districts/inkQuarter/writs.ts` (`RETURN_ARRIVAL`) | none | none: the stamp's rule and Bench entry (`return`); a Sentence-keyed line would stamp every push, because `inkQuarter:sentBack` carries only the cause (`push`), not the rune |
| Se6 | Sentence at an empty tile does nothing | Aim on a tile nobody stands on | `sentence` (`unitOf` null) | | none: nothing to read, as Vat's empty tiles |
| Se7 | A crush into a unit standing on a forwarding stamp: the damage is the stamp's to forward | | `forward.ts` | | none: the stamp's |

### Levy (`levy:unit`, `levy:mark`, `levy:member`, `levy:shielded`)

| # | Behaviour | Firing case | Engine | Line | Kind |
|---|---|---|---|---|---|
| Lv1 | A unit with no mark pays nothing: no shield, no event, no message. Levy over an area passes unmarked units in silence | Bolt > Levy at an unmarked rat | `actions.ts::levy` (`!u?.mark` returns) | `levy:unit` | **added** (new+event: a `miss` as `sentence:unit` does, when the unit exists and has no mark) |
| Lv2 | Each mark is spent **whole** for one shield: a deep mark (which takes two sparks) pays one, and what a bound mark held is lost, not released | Levy a deep-marked rat: shield 1; Levy a Bind mark: no `released` | `levy` (`spendMark`, `ACTIONS.levyShieldPerMark`) | `levy:mark` | **added** (new: stamp the `markSpent` of a foe's mark) |
| Lv3 | It takes the marks of **your own party** too, the caster's own included (a Splash puts the caster in the area), and the shield is always the **caster's**, never the bearer's | Bolt > Levy at a marked Stoker: his mark is gone, the Draughtsman has the shield | `levy` | `levy:member` | **added** (new: stamp the `markSpent` of a member's mark; it wins over `levy:mark` for that event, so `levy:mark` is witnessed only on foes) |
| Lv4 | Levy on a caster who already holds a shield adds to it and keeps the later lapse date, as Guard does | Caster with shield 2 until round 9, Levy a marked rat: shield 3, still until 9 | `damage.ts::gainShield` | `levy:shielded` | **added** (new: stamp the `shieldGained` when `caster.shield > 0`; the rule is `guard:shielded`'s, a Levy decision only in that the shield comes from marks) |
| Lv5 | The shield lapses when the next player phase begins; an **enemy's** lasts one round longer so it stands for the party's coming turn | `levy-shield-timing.test.ts` | `levy`, `gainShield` | | none: the lapse is one rule for Guard and Levy |
| Lv6 | The postmaster's clock "collects" every mark at its deadline (3 to the bearer, mark spent): a Levy that spent the marks first leaves nothing to collect | | `districts/inkQuarter/clock.ts` | | none: the clock's counter, not a Levy line |

### Tally (`tally:collar`, `tally:stamp`)

| # | Behaviour | Firing case | Engine | Line | Kind |
|---|---|---|---|---|---|
| Ta1 | A **collar** and a **shackle** each count as one thing, as a mark does: a collared unit alone is one (fails), with a mark it is two (passes), a shackled marked unit too. The headline lists "marks, states, jars" and leaves them out | Bolt > Tally Strike at a collared, marked rat | `flow.ts::tallyCount` | `tally:collar` | **added** (new: `trial` returns `line: 'tally:collar'` when a collar or a shackle was counted; the `triggered` event carries it) |
| Ta2 | **Pieces are not counted**: a writ, a seal, an address or any piece on the tile is not a state, so a marked unit standing on a stamp is one thing, not two. A plate is a state and does count | Marked rat on a return stamp, Tally: the chain stops; marked rat on a slick: the rest happens | `tallyCount` (reads `tile.state` and `tile.jar`, not `tile.piece`) | `tally:stamp` | **added** (new: `trial` returns `line: 'tally:stamp'` when the target's tile holds a piece; the quarter is where Tally stands on writs) |
| Ta3 | The count is read from the cast's snapshot: the cast's own Ink or Oil cannot satisfy it | `triggers.test.ts` "own-cast-cannot-satisfy-tally" | `trial`, `seenAt` | | none: the headline says "when the cast began" |
| Ta4 | A deep mark counts as one mark (two for the notary's habit) | | `tallyCount` | `markTwice:deepMark` | none: the habit's row says it; for a plain Tally one mark is one mark |
| Ta5 | A Tally gives one `triggered` event and so one line: when two apply (a habit's, a collar, a piece) only the first is stamped | | `resolve.ts` (`trigger` step) | | none: precedence, noted for IQ-F3 (habit, then collar, then piece) |

### Wax (`wax:cloud`, `wax:fire`)

| # | Behaviour | Firing case | Engine | Line | Kind |
|---|---|---|---|---|---|
| Wx1 | A wax mark never spreads, even in a cloud; the miss fires only if there was someone to spread to | Wax Recoil on a rat in a cloud with a neighbour | `marks.ts::spreadFrom` | `wax:cloud` | none: row exists, fires today (`solvents.test.ts`) |
| Wx2 | Fire melts a wax mark, spent and unreleased; the check is on a hit or an entered tile, so the round-end burn does it | Wax Recoil on a rat standing in fire | `solvents.ts` (`wax.onHook`) | `wax:fire` | none: row exists, fires today |
| Wx3 | A wax mark moves with a Lift and is spent like any mark by Sentence, Levy or Erase | | `marks.ts::liftMark` | | none: an ordinary mark that does not spread |
| Wx4 | A wax mark that holds a bound action does **not** leave it in the cloud (`haunt` skips wax marks) | Bind-cloud-II-b (`bind-cloud-haunt`) with Wax | `marks.ts::spreadFrom` (`!mark.wax`) | | none: exists only under a footnote; say so in that variant's text if Wax is meant to stop it |

Wax has nothing missing. The Sealer's wax **seal** (a piece, Bench token `wax`) is a different thing from the Wax solvent; it melts in fire by its own rule (`inkQuarter:unsealed`, `why: melted`) and has no rune line.

### Sand (`sand:unit`, `sand:noTarget`)

| # | Behaviour | Firing case | Engine | Line | Kind |
|---|---|---|---|---|---|
| Sa1 | Sand turns back only a release set off by a **hit**. A mark set to release on a death or an entered tile acts on the bearer as cast, and Sand says nothing: no turn, no miss | Bind (`dies`) with Sand on a rat, a Strike kills it: the action is released as without Sand, no Sand line | `solvents.ts::turnBack` (`h.kind !== 'hit'` returns null) | `sand:noTarget` | text + new+event: widen the row's text and stamp a `miss` at that return (A2: edit the row, the id stays) |
| Sa2 | The hitter is whoever hit, your own apprentice too (the standing test strikes with the Stoker), so a Sand mark is a trap for whoever collects it | `solvents.test.ts` "sand-recoil-hits-hitter" | `turnBack` | `sand:unit` | none: the row says "whoever hit the bearer" |
| Sa3 | A hit with no hitter (a fire) or the bearer hitting itself spends the mark | | `turnBack` | `sand:noTarget` | none: row exists, fires today |

### Writs and terms against the five

| Piece or rule | Touches | Result |
|---|---|---|
| Return stamp | Sentence's push, any push | Only a landing is answered; a push over the stamp passes (Se5). The stamp's own rule, with a Bench entry |
| Standing order | Sentence, Levy, Tally | The mark it puts on at dusk is a plain mark with no owner: Sentence and Levy spend it as any plain mark, Tally counts it as a mark. Nothing special |
| Forwarding and address | Sentence's crush, Levy | A hit or a mark lands on the address instead (once per stamp per round). Spending a mark is not a hit, so Sentence and Levy are never forwarded |
| The Sealer's seal | Sentence | A sealed unit is held: Se3 (the mark is still spent) |
| Terms | all | Stakes and conditions are trip rules; no rune line |

### Ink Quarter proposals

| # | Proposal | Reason |
|---|---|---|
| Q1 | Accept the seven rows as `pending` now and let IQ-F3 stamp them at the sites named above | The task cannot edit the engine; the rows' text is final and the `fires` tests flip when the stamp lands |
| Q2 | Fix `sand:noTarget`'s text (Sa1) when IQ-F4 builds Sand, by editing the row (A2): "If nobody hit the bearer, there is no one to turn back on: a fire, the bearer's own doing, a death or a step" | The row says "nobody set it off but the bearer itself", which is wrong for a death or a step |
| Q3 | Keep `Meets` `stamp` for `tally:stamp` (a piece on the tile) and add a `piece` value only if a second rune needs one | A new value is a types change; no row has `stamp` as a subject's meets today, so there is no clash with the Bench token |
| Q4 | Give Sentence a line only through its own stamps (Se3), not through the writs | `inkQuarter:sentBack` carries only the cause; stamping the writs per rune would make every push witness Sentence |
