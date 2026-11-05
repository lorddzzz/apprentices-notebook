# Footnotes content: the canals (Timing)

> **State: Drafted 2026-11-05 for CN-G1 (not approved).** Task CN-F2 of [canals-revisit-plan.md](../../plans/canals-revisit-plan.md) (P11 batch shape, P9 ledgers). Rules: [footnotes.md](../footnotes.md) §1. Lines: `src/data/lines.ts` (CN-F1 block); audit: [footnotes-audit.md](../../plans/footnotes-audit.md) §8. Format and pair rules as in [seam.md](seam.md) §0. Builds: CN-F3 (Jar, Fuse), CN-F4 (Afterglow, Pitch, Wick), CN-F5 (the Lamplighter's note) into `src/data/footnotes/canals.ts`.
>
> Nothing here is built except the Afterglow diagonal capstone (FN-11, `src/data/footnotes/auras.ts`) and the Lamplighter's note's effect (RV-20b, `src/data/rivals/lamplighter.ts`). Every number is *tune by playing*.

## 0. How to read this

Same conventions as [seam.md](seam.md) §0: pair IDs `<Subject>-<meets>-<level>`, capstones `<Subject>-III`, options **a**/**b** with the variant ID they ship under (`<subject>-<slug>`, never changed once shipped). **Engine** is a one-line sketch; "no new event" means an existing event stamped with the slot's line carries it. **Combos** reads all four level I × level II pairings on the line (six where the rival note adds a third level I option).

Costs (FN plan P3): level I and II pay in the line's district. Every canal line is `canals` (Pitch and Wick) except `jar:unit`, which RV-20b filed as `seam` (see K1). Capstones pay one Pitch and one Wick.

### Review batches for CN-G1

| Round | Pairs | Build task |
|---|---|---|
| 1 | Jar (both lines), the Lamplighter's note | CN-F3, CN-F5 |
| 2 | Fuse (both lines) | CN-F3 |
| 3 | Pitch, Wick | CN-F4 |
| 4 | Capstones: Jar, Fuse, Afterglow (b), Pitch, Wick | CN-F3, CN-F4 |

## 1. Margin lines

P11 asks for two margin lines on Jar, Fuse and Afterglow and one on Pitch and Wick. The lines are CN-F1's; none is invented here (FN P5).

| Subject | Margin lines | Note |
|---|---|---|
| Jar | `jar:unit`, `jar:jar` | `jar:unit` holds the Lamplighter's note (level I, built effect). `jar:water` is left unslotted: its opinions would repeat Fuse-water's |
| Fuse | `fuse:unit`, `fuse:water` | |
| Afterglow | **none** | No line exists: every candidate (audit Af1 plain vs compound, Af3 a drifting stain) needs a new event in `mix.ts` or `current.ts`. Margins get no rows until then; the capstone pair is below |
| Pitch | `pitch:water` | Text narrowed by CN-7 ("a waiting repeat or Wick") |
| Wick | `wick:unit` | `wick:unit` fires on every wake, so it earns; `wick:member` (the lapse) is bent by Wick-unit-II-b instead |

## 2. The Timing runes

### Jar

Headline: *Seals the rest in a jar on the target's tile; it opens when a unit steps onto it.*

**Jar-unit-I** · `jar:unit` (*A jar opens under whatever unit stands on it, foe included, and what it holds is still its owner's.*)

- a · `jar-unit-kin`: *Your jar stays shut under you and your allies; only a foe opens it.*
  Engine: `jars.ts::stepOpens` returns false for a member opener (any cause). No new event; the jar simply waits. A safe trap you can stand guard on, at the cost of your own Jar + Touch tricks.
- b · `jar-unit-standing`: *A jar sealed under a standing unit opens on it at once, as if it had just stepped in.*
  Engine: `jars.ts::sealJar`, a step jar on an occupied tile calls `openJar(at, unit)` after `jarSealed` (audit Ja3: today it waits). Existing `jarOpened`. A jar becomes a sure delay inside one cast instead of a trap.
- c · `lamplighter:wick`: the Lamplighter's note (section 3). Hidden until his page is held.

**Jar-unit-II** · `jar:unit`

- a · `jar-unit-pushed`: *A unit pushed, pulled or swapped onto your jar opens it facing the way it came; the rest takes that heading, not the seal's.*
  Engine: `arrival.ts::stepJar` passes the arrival heading to `openJar`, which overrides `jar.heading` for the run. No new event. Shove into a jar of Bolt and the Bolt flies on the way of the shove.
- b · `jar-unit-slide`: *A unit sliding on oil stops on your jar and opens it, instead of sliding on past.*
  Engine: the slide already answers each tile (`arrival.ts`, `slide: 'each'`); the `stepJar` hook ends the slide on the owner's jar. No new event (`push` ends early). Oil and a jar become one trap.
- Combos: kin + pushed: a shoved ally passes over, so pushed only matters for foes; fine. kin + slide: a sliding ally slides on; say so in slide's text at build ("a foe sliding…" when kin is written). standing + pushed: the jar opens at sealing with the seal's heading, so pushed covers later arrivals only; fine. standing + slide: unrelated moments; fine. note + pushed: a rival pushed already opened jars without the note; the heading rule applies to him too; fine. note + slide: a slide is not a walk, so it opened before; slide now also stops him; fine.

**Jar-jar-I** · `jar:jar` (*A new jar crumbles your oldest empty once you hold your limit (one, Jars and Fuses together), and crumbles any jar already on its tile.*)

- a · `jar-jar-spill`: *A jar crumbled by your newer one opens instead, on whoever stands there or on the bare tile.*
  Engine: `jars.ts::crumble` calls `openJar(at, unitAt(at))` in place of `jarCrumbles` for the owner's jars. Existing `jarOpened`. Sealing again is how you set off the old one.
- b · `jar-jar-keep`: *At your limit a new jar fizzles instead: the old one stays and the new rest is lost.*
  Engine: `jars.ts::sealJar` returns early with `jarCrumbles` on the new tile. No new event. A carefully placed trap is not lost to a lattice that seals on every cast.

**Jar-jar-II** · `jar:jar`

- a · `jar-jar-share`: *Your Fuses keep a limit of their own: one Jar and one Fuse can wait together.*
  Engine: `leans.ts::jarLimit` (and `jarsOf`) count per seal rune. No new event. Bends `fuse:jar` (the neighbour line); stamps `jar:jar` on what it spares.
- b · `jar-jar-stack`: *A jar sealed onto your own jar opens the old one first; the new one then waits in its place.*
  Engine: `sealJar`'s same-tile crumble becomes `openJar` then the seal. Existing events. Two layers of trap on one tile, the first set off by the second.
- Combos: spill + share: fewer crumbles, so fewer spills; fine. spill + stack: the stack's opening is not a crumble, so nothing opens twice; fine. keep + share: keep bites only when the same rune is at its limit; fine. keep + stack: **clash**: resolve in keep's text ("counted after a stack opens"), so stacking onto your only jar still works.

### Fuse

Headline: *Seals the rest in a jar on the target's tile; it opens at the end of the round.*

**Fuse-unit-I** · `fuse:unit` (*A Fuse opens at dusk on whoever stands on its tile then, foe included, not on the unit it was sealed at.*)

- a · `fuse-unit-follow`: *A Fuse sealed under a foe goes with that foe and opens at dusk wherever it stands.*
  Engine: `Jar` gains a `carrier`; the unit's relocation events move it (FD-7, `drawn` with `what: 'jar'`). It no longer floats on its own. Tag a foe, not a place.
- b · `fuse-unit-late`: *A Fuse waits one dusk longer before it opens.*
  Engine: `openDuskJars` skips a jar on its first dusk (a `dusks` count on the jar). No new event. Set up two rounds ahead.

**Fuse-unit-II** · `fuse:unit`

- a · `fuse-unit-fire`: *Fire reaching your Fuse's tile opens it at once, on whoever stands there.*
  Engine: `mix.ts`, a fire layer landing or spreading on a tile with a dusk jar calls `openJar`. Existing `jarOpened`, stamped `fuse:unit`. Oil a lane, then light the Fuse early. (This is P11's former note candidate; the built note took a different rule, so it is free here.)
- b · `fuse-unit-spare`: *A Fuse that would open under you or an ally waits for the next dusk instead.*
  Engine: `openDuskJars` skips a jar with a member on it. No new event. Fuses become safe to sit beside.
- Combos: follow + fire: the tagged foe walks into fire and sets it off; reads well. follow + spare: follow carries only foes, so spare never holds it; fine. late + fire: the wait is a most, fire comes first; fine. late + spare: holds a dusk more each time an ally stands there; fine.

**Fuse-water-I** · `fuse:water` (*A Fuse on water floats one tile downstream each round, and opens at dusk on whoever stands where it has floated to.*)

- a · `fuse-water-slow`: *Your Fuse floats only every other round.*
  Engine: `solvents.ts::driftWaiting` skips an owner's dusk jar on odd rounds. No new event. Easier to aim at a foe in the lane.
- b · `fuse-water-swift`: *Your Fuse floats two tiles downstream each round.*
  Engine: same site, two `downstream` steps, stopping at land or a blocker. No new event. Reaches the far end of a long towpath.

**Fuse-water-II** · `fuse:water`

- a · `fuse-water-wake`: *A Fuse that floats under a unit opens on it at once, as a Jar would.*
  Engine: `driftWaiting` treats an owner's dusk jar like a step jar on arrival. Existing `jarOpened`. The lane's eel and the barge become triggers.
- b · `fuse-water-heading`: *A Fuse that has floated opens facing downstream; the rest takes the current's heading.*
  Engine: `openJar` overrides `jar.heading` with the tile's current when the jar has drifted. No new event. A floating Shove pushes with the water.
- Combos: slow + wake: slower, so it waits for the foe; fine. slow + heading: fine. swift + wake: stops on the first unit of the two tiles; say so in wake's text. swift + heading: fine.

### Afterglow

Headline: *Lingering compounds from touching paths last 1 round longer.*

**Margins: no rows.** Afterglow has no fine-print line yet (audit §8, Af1–Af3 need new events in `mix.ts`/`current.ts`). When a line lands (likely `afterglow:cloud` for "a plain state takes no extra round" and `afterglow:water` for a drifting stain), its pairs are written then, not here.

### The five capstones

Capstones need no witnessed line. Each is "when X, also Y"; the headline stays true.

**Jar-III**
- a · `jar-cap-ring`: *When a unit opens your jar, the rest also acts on the first unit beside it.*
  Engine: `openJar` adds the first neighbour in reading order as a second target. No new event.
- b · `jar-cap-reseal`: *When your jar opens, it also seals again once, with the same rest, for the next step.*
  Engine: `openJar` re-seals with a `resealed` flag that stops a second reseal; it is the same jar for the limit. Existing `jarSealed`.

**Fuse-III**
- a · `fuse-cap-chain`: *When your Fuse opens, any other jar beside it also opens, in reading order.*
  Engine: `openDuskJars` opens neighbours after it (once each). Existing `jarOpened`. Sets off a rival's waiting jar on your terms.
- b · `fuse-cap-reach`: *When your Fuse opens on an empty tile, the rest also acts on the nearest unit within 2.*
  Engine: `openJar` with no unit picks the nearest unit (ties in reading order) as target. No new event.

**Afterglow-III**
- a · `afterglow-diagonal` (**built**, FN-11): *Afterglow also reaches the runes diagonally touching it on the page.*
- b · `afterglow-cap-plain`: *When a touching path lands a plain cloud, slick or plate, it also lasts 1 round longer.*
  Engine: `mix.ts::newLayer` gives the gift to non-compounds too. No new event.

## 3. The Lamplighter's note (CN-F5)

On **Jar, level I, slot `jar:unit`**, as a third option beside a and b (footnotes.md §1, decided 2026-10-28; built by RV-20b). Hidden until his page (`lamplighter:lantern`) is held; still needs the slot's level and costs.

- c · `lamplighter:wick`: *The wick does not care who lit it. A careful boot finds a jar as well as a careless one, mine included, and the light is still yours.*
  Credit line, in the household's hand under it: *Copied from the Lamplighter's route sheet.*
  Engine (built): `jars.ts::stepOpens` lets a rival's own walk open a jar he does not own; contents, credit and points stay the owner's. No new harm.

The built text repeats the line's own fine print ("opened by anyone… still counts as yours"); the rewrite above says only what the note changes (a rival's careful step), in the voice of the ledger leaves.

## 4. The solvents

### Pitch

Headline: *It floats: on water it drifts with the current.*

**Pitch-water-I** · `pitch:water` (*Pitch floats: a waiting repeat or Wick on water drifts one tile downstream each round.*)

- a · `pitch-water-far`: *A waiting Pitch invention drifts two tiles each round.*
  Engine: `driftWaiting`, two steps, stopping at land or a blocker. No new event.
- b · `pitch-water-upstream`: *A waiting Pitch invention drifts one tile upstream each round, against the current.*
  Engine: same site, the reverse of `downstream`. No new event. Meets what the current brings down.

**Pitch-water-II** · `pitch:water`

- a · `pitch-water-catch`: *A drifting wait that floats onto a unit fixes on it, and acts on that unit wherever it goes.*
  Engine: `driftWaiting` swaps the tile target for the unit (target kind `unit`), so it stops drifting. No new event.
- b · `pitch-water-wash`: *A drifting wait carries its tile's slick or cloud along with it.*
  Engine: `driftWaiting` moves the layer with the wait (`drawn`, `what: 'state'`). No new event.
- Combos: far + catch: fixes on the first unit of its two tiles; say so in catch's text. far + wash: the state jumps two tiles; fine. upstream + catch: the most coherent pairing, it swims to meet foes. upstream + wash: oil carried up the lane; fine.

**Pitch-III**
- a · `pitch-cap-wake`: *When a drifting wait acts, it also acts on the tile it last drifted from.*
  Engine: `schedule.ts::run` adds the previous tile (kept by `driftWaiting`) as a second target. No new event.
- b · `pitch-cap-shore`: *When a drifting wait is stopped by a quay or a blocker, it also wakes at once.*
  Engine: `driftWaiting` runs the entry early on a failed step. Existing events.

### Wick

Headline: *It waits one round before it acts.*

**Wick-unit-I** · `wick:unit` (*Wick holds the invention back: it waits a round and acts at the start of your next turn.*)

- a · `wick-unit-long`: *Wick holds the invention two rounds, not one.*
  Engine: `Scheduled.when` gains a second round for a Wick entry. No new event.
- b · `wick-unit-dusk`: *Wick acts at dusk of the same round, after the foes have moved, not at your next turn.*
  Engine: the entry is scheduled `roundEnd` instead of `ownerTurn`. No new event.

**Wick-unit-II** · `wick:unit`

- a · `wick-unit-jar`: *A Wick invention that wakes on your jar's tile opens the jar first, then acts.*
  Engine: `schedule.ts::run` calls `openJar` on the target tile before the step. Existing `jarOpened`.
- b · `wick-unit-proxy`: *A Wick whose caster is down when it wakes still acts, from where they fell.*
  Engine: `schedule.ts::run` skips the lapse for Wick entries. Bends `wick:member` (it stops firing for Wick). No new event.
- Combos: long + jar: a two-round fuse on a step jar; fine. long + proxy: fine. dusk + jar: the jar opens at dusk next to your Fuses; reads fine. dusk + proxy: fine.

**Wick-III**
- a · `wick-cap-twice`: *When a Wick invention wakes, it also acts once more at dusk of that round.*
  Engine: `run` reschedules once with `roundEnd` and a flag. Existing `scheduled`.
- b · `wick-cap-trip`: *When a foe steps beside a waiting Wick invention's target, it also wakes at once.*
  Engine: an arrival hook in `arrival.ts` runs the entry early. Existing events.

## 5. The lamp-ledgers (P9)

The five leaves are **approved and built** (CN-9, [canal-ledgers.md](canal-ledgers.md), `CANAL_LEDGERS` in `src/data/districts/canals.ts`): the route, lamp counts, a lamp found dark, never the Seam, a page that ends mid-word. CN-F2 does not change them; the note's voice above follows theirs (short, practical, the lamps keep the streets).

## 6. Counts

- **Runes:** 4 margin lines (Afterglow none); 8 level I/II pairs; 3 capstone pairs (Afterglow's a built).
- **Solvents:** 2 margin lines; 4 level I/II pairs; 2 capstone pairs.
- **Total new pairs:** 17 (12 line pairs, 5 capstone pairs, one option already built). **Rival note:** 1 (effect built, text rewritten).
- **Clashes noted:** Jar-jar keep × stack (resolved in text); swift/far × wake/catch (wording at build); kin × slide (wording at build).
- **New engine pieces:** a `carrier` on a jar (fuse-unit-follow), a dusk count (fuse-unit-late), a heading override on `openJar` (jar-unit-pushed, fuse-water-heading), a reseal flag (jar-cap-reseal), an extra Wick wait (wick-unit-long). No new events or `Meets` values.

## 7. Proposals

| # | Proposal | Reason |
|---|---|---|
| K1 | Refile `jar:unit` from `seam` to `canals` | Jar is a canal rune; as filed, its level I/II (and the note's slot) cost Seam solvents |
| K2 | The note stays at **level I** (footnotes.md 2026-10-28, built), not P11's level II | Already decided and built; moving it would change a shipped slot |
| K3 | Rewrite the note's text as in section 3; keep its id `lamplighter:wick` (not P11's `jar-lamplighter-*`) | The built text restates the line; ids never change once shipped |
| K4 | `fuse-unit-fire` takes P11's old note candidate (fire opens a jar) | A good rule left free when the note took another one |
| K5 | Afterglow margins wait for real lines; write them with the `mix.ts`/`current.ts` events | No row is invented to host a slot (FN P5) |
