# Footnotes content: the ink-makers' quarter (Contracts)

> **State: Drafted 2026-11-11 for IQ-FG (not approved).** Task IQ-F2 of [ink-quarter-plan.md](../../plans/ink-quarter-plan.md). Rules: [footnotes.md](../footnotes.md) §1. Lines: `src/data/lines.ts` (the IQ-F1 block, rows `pending` until IQ-F3 stamps them); audit: [footnotes-audit.md](../../plans/footnotes-audit.md) §11. Format and pair rules as in [seam.md](seam.md) §0 and [bathhouses.md](bathhouses.md). Builds: IQ-F3 (Sentence, Levy, Tally) and IQ-F4 (Wax, Sand) into `src/data/footnotes/inkQuarter.ts`; the postmaster's note with IQ-F5 (RV API, IQ-22).
>
> Nothing here is built. Every number is *tune by playing*.

## 0. How to read this

Same conventions as [seam.md](seam.md) §0: pair IDs `<Subject>-<meets>-<level>`, capstones `<Subject>-III`, options **a**/**b** with the variant ID they ship under (`<subject>-<slug>`, never changed once shipped), a **c** only for the rival's note. **Engine** is a one-line sketch; "no new event" means an existing event stamped with the slot's line carries it. **Combos** reads all four level I × level II pairings on the line (six where the note adds a third level II option).

Costs (FN plan P3): level I and II pay in the line's district; every line here is `inkQuarter` (Wax and Sand). Capstones pay one Wax and one Sand.

**Mark vocabulary.** A *plain* mark is spent whole by one Spark, Sentence or Levy. A *deep* mark (Ink on a marked unit) takes two sparks; Sentence and Levy spend it whole today. A *bound* mark holds an action (Bind). Spending a mark never releases what it holds; only its event does (P31).

**Pending lines.** `sentence:mark`, `levy:mark`, `levy:member`, `tally:collar` and `tally:stamp` are IQ-F1 rows with final text and no engine stamp yet; the build task stamps them first (audit §11 names each site), so every pair below has a line to hang on. `sentence:unit` and `sand:unit` are live rows.

### Review batches for IQ-FG

| Round | Pairs | Build task |
|---|---|---|
| 1 | Sentence (both lines), the postmaster's note | IQ-F3, IQ-F5 |
| 2 | Levy (both lines) | IQ-F3 |
| 3 | Tally (both lines) | IQ-F3 |
| 4 | Capstones: Sentence, Levy, Tally | IQ-F3 |
| 5 | Wax, Sand (line pairs and capstones) | IQ-F4 |

## 1. Margin lines

Two margin lines per rune, one per solvent. None is invented to host a slot (FN P5): all six rune lines are IQ-F1's or already live, and each one bends a real decision.

| Subject | Margin lines | Note |
|---|---|---|
| Sentence | `sentence:mark`, `sentence:unit` | `sentence:mark` holds the postmaster's note (level II). `sentence:noHeading` stays unslotted: it fires only for a headless aim, rare in a lattice |
| Levy | `levy:mark`, `levy:member` | `levy:unit` and `levy:shielded` stay unslotted: the first is a miss with nothing to choose, the second is Guard's rule over again |
| Tally | `tally:collar`, `tally:stamp` | **The weakest pair of the draft** (a trigger has little to wire around); it can drop to `tally:collar` alone at IQ-FG (P1 allows one) |
| Wax | `wax:cloud` | `wax:fire` stays unslotted: `wax-cloud-smother` and `wax-cloud-drip` bend it from here |
| Sand | `sand:unit` | `sand:noTarget` stays unslotted: `sand-unit-nearest` bends it from here |

## 2. The Contracts runes

### Sentence

Headline: *Spends the target's mark to push it 2 tiles along the heading.*

**Sentence-mark-I** · `sentence:mark` (*Sentence spends the mark whole before it pushes: a unit that cannot move still loses it, and the action a bound mark held is lost, not released.*)

- a · `sentence-mark-release`: *The action a bound mark held is released on the unit as Sentence spends it, before the push.*
  Engine: `actions.ts::sentence` runs the mark's bound action through the same step a hit's release uses (depth limit and event cap hold), then pushes. Existing `released`. A Bind on a foe becomes a debt you can collect on demand.
- b · `sentence-mark-peel`: *A deep mark is only peeled: it drops to a plain mark and the unit is still pushed.*
  Engine: `sentence`, a deep mark sets `deep` false instead of spending (Spark's `pageDeepMark` peel, without its damage). Existing `marked`. A double-Inked foe can be pushed twice.

**Sentence-mark-II** · `sentence:mark`

- a · `sentence-mark-held`: *A unit Sentence cannot move, held or sealed, keeps its mark.*
  Engine: `sentence` checks `held > 0` before `spendMark`; the push then reports the hold as it does now. Existing `held`. Bends `shove:held` and the Sealer's seal.
- b · `sentence-mark-pass`: *When Sentence spends a mark whole, a plain mark lands on the nearest unmarked unit beside where the pushed unit ends.*
  Engine: `sentence` after the push, `bursts.ts::unmarkedBeside` then `applyMark` plain with the Sentence's origin. Existing `marked`. A chain of notices down a line of foes.
- c · `postmaster:sentence`: the postmaster's note (section 3). Hidden until his page is held.
- Combos: release + held: a held unit keeps its mark, so nothing is released; say so in held's text at build. release + pass: the action fires on the unit and what passes is a plain mark, never the action. peel + held: fine. peel + pass: a peeled mark is not spent whole, so nothing passes; a plain mark does; say "spends a mark whole" at build. release + note, peel + note: the note acts on the crush, not the mark; independent.

**Sentence-unit-I** · `sentence:unit` (*A unit with no mark has nothing to spend: Sentence does nothing to it.*)

- a · `sentence-unit-nudge`: *Sentence on an unmarked unit still pushes it one tile, and spends nothing.*
  Engine: `sentence`, the `!u.mark` branch pushes 1 under `sentence:unit` instead of the bare miss. Existing `push`. Sentence stops being dead without Ink, at the cost of being a weak Shove.
- b · `sentence-unit-serve`: *Sentence on an unmarked unit marks it plain instead of pushing.*
  Engine: same branch calls `markUnit`. Existing `marked`. The first notice of a two-cast Sentence.

**Sentence-unit-II** · `sentence:unit`

- a · `sentence-unit-collar`: *A collared unit counts as marked: Sentence strikes the collar off and pushes the full two tiles.*
  Engine: `sentence`, no mark but `collar !== false`: the collar-off step Erase uses (`erased`), then the push. Existing `erased`. Bends Brass's collar lines.
- b · `sentence-unit-shield`: *A shielded unit counts as marked: Sentence strips the shield and pushes the full two tiles.*
  Engine: same branch, shield set to 0 by the step `strike-shielded-break` uses. Existing events. Bends `strike:shielded`; a Sentence is the answer to a Guard.
- Combos: nudge + collar, nudge + shield: the collar or shield makes the unit count as marked, so it gets the full two tiles; only a bare unit is nudged. serve + collar, serve + shield: same; only a bare unit is marked. Say "counts as marked" first in both texts.

### Levy

Headline: *Spends every mark in the target area; the caster gains 1 shield per mark.*

**Levy-mark-I** · `levy:mark` (*Levy spends each mark whole, for one shield: a deep mark pays only one, and the action a bound mark held is lost, not released.*)

- a · `levy-mark-deep`: *A deep mark pays two shields, one for each spark it would have taken.*
  Engine: `actions.ts::levy` gains 2 for a deep mark (`ACTIONS.levyShieldPerMark` per layer). Existing `shieldGained`. Cash a double-Inked foe in one go.
- b · `levy-mark-peel`: *A deep mark is only peeled to a plain one, and still pays a shield.*
  Engine: `levy`, a deep mark sets `deep` false (the peel as in `sentence-mark-peel`) and pays 1. Existing `marked`. Two Levies for the same ink: one shield now, one later, and a Spark or Sentence can have the plain mark between.

**Levy-mark-II** · `levy:mark`

- a · `levy-mark-release`: *The action a bound mark held is released on its bearer as Levy spends it.*
  Engine: as `sentence-mark-release`, one helper for both. Existing `released`. Bends `bind:mark`: a Bind on a foe is paid out and shielded in one cast.
- b · `levy-mark-ward`: *The shield Levy gains lasts one round longer.*
  Engine: `levy` adds 1 to the `until` it passes `gainShield`. Existing `shieldGained` (`until`). Bends `levy:shielded` and Guard's lapse rule.
- Combos: deep + release: a deep bound mark pays two shields and releases its action. peel + release: the action is released first and the mark left behind is plain and empty; say so at build. deep + ward, peel + ward: fine.

**Levy-member-I** · `levy:member` (*Levy takes the marks of your own party too, yourself included, and the shield is always the caster's.*)

- a · `levy-member-self`: *Levy never takes your own mark, the caster's; your allies' marks still pay.*
  Engine: `levy` skips the caster's unit. No new event. Splash > Levy with you in the area stops costing you your own mark.
- b · `levy-member-share`: *When Levy spends the mark of one of your party, that ally gains the shield instead of the caster.*
  Engine: `levy`, a member bearer takes the `gainShield` (the caster's own mark still pays the caster). Existing `shieldGained`. Cleaning your people of foes' ink becomes a way to guard them.

**Levy-member-II** · `levy:member`

- a · `levy-member-repay`: *An ally whose mark Levy spends also gains 1 shield, besides the caster's.*
  Engine: `levy`, a member bearer other than the caster gains 1 more. Existing `shieldGained`. Bends `guard:shielded`.
- b · `levy-member-near`: *Levy also spends the mark of each of your party standing beside the caster, even outside its area.*
  Engine: `levy` adds the caster's 4 neighbours that are members to its targets. No new event. Bends `splash:member`: a Bolt > Levy now cleans the people beside you.
- Combos: self + repay: allies only; fine. self + near: the caster is still skipped, the neighbours are cleaned; fine. share + repay: the ally gains the share and the extra, the caster nothing; strong, the pair is "give everything to the bearer". share + near: neighbours' shields go to them; fine. With no ally beside the caster, near adds nothing.

**Levy-III**
- a · `levy-cap-bank`: *When Levy spends three or more marks in one cast, every member of your party gains 1 shield.*
  Engine: after the marks, `gainShield` for each member. Existing `shieldGained`. Rewards a Splash across a marked crowd.
- b · `levy-cap-draw`: *When Levy spends a foe's mark, that foe is also pulled one tile toward you.*
  Engine: a pull step per foe spent (AH's Pull). Existing `push`. Collect, then they come.

### Tally

Headline: *The rest happens only if the target and its tile held 2 or more things (marks, states, jars) when the cast began.*

**Tally-collar-I** · `tally:collar` (*A collar and a shackle each count as a thing for Tally, as a mark does.*)

- a · `tally-collar-twice`: *A collar counts twice: a collared unit alone passes.*
  Engine: `flow.ts::tallyCount` counts a collar as 2. No new event (`triggered` carries the line). Brass collars become a key.
- b · `tally-collar-shackle`: *A shackle counts twice, and a collar still counts once.*
  Engine: same site, `shackle > 0` counts 2. No new event. Ink bound on brass is a double debt.

**Tally-collar-II** · `tally:collar`

- a · `tally-collar-net`: *Each collared unit beside the target counts as one more thing, at most two.*
  Engine: `tallyCount` adds collared neighbours, capped at 2. No new event. Bends Brass's collar and network lines: a brass-wired room counts.
- b · `tally-collar-spend`: *When a collar or a shackle carried Tally through, it is struck off the unit.*
  Engine: after a pass whose count needed it (the count falls below 2 without it), the collar-off step (`erased`). Existing event. The debt is called in once.
- Combos: twice + net: a collared target with two collared neighbours counts 4; fine. twice + spend: a collared unit alone passes and loses its collar, once. shackle + net: fine. shackle + spend: the shackle is spent as it carries the pass. In all four, "needed it" is read as: the count would be under 2 without it.

**Tally-stamp-I** · `tally:stamp` (*Tally counts marks, collars, shackles, states and jars, not pieces: a writ, a seal or anything else standing on the tile is not counted.*)

- a · `tally-stamp-count`: *A piece on the target's tile counts as one thing.*
  Engine: `tallyCount` counts `tile.piece`. No new event. Standing on a writ is now worth something.
- b · `tally-stamp-beside`: *A piece on a tile beside the target's counts as one thing, at most one.*
  Engine: same site, the 4 neighbours' pieces, capped at 1. No new event. A room's furniture counts.

**Tally-stamp-II** · `tally:stamp`

- a · `tally-stamp-cloud`: *A cloud or a compound on the tile counts as two things, not one.*
  Engine: `tallyCount` counts `tile.state` of a cloud or compound twice. No new event. Bends the headline's states; Steam and Oil become keys.
- b · `tally-stamp-jar`: *A jar on the tile counts as two things, not one.*
  Engine: same site, `tile.jar` counts 2. No new event. A jar is a debt and a promise.
- Combos: count + cloud: a piece with a cloud counts 3; fine. count + jar: fine. beside + cloud, beside + jar: fine. None clash.

**Tally-III**
- a · `tally-cap-surplus`: *When Tally counts four or more things on a target, the rest acts on it twice.*
  Engine: `resolve.ts` `trigger` step queues the rest twice for such a target. No new event. Invites stacking things, with the level II counts above.
- b · `tally-cap-refund`: *When Tally stops a cast on a target, a plain blot is left on its tile.*
  Engine: `trigger` step, a failed trial lands Ink (`landKind`) on the tile. Existing `landed`. A failed gate is not a wasted cast.

## 3. The postmaster's note (IQ-F5)

On **Sentence, level II, slot `sentence:mark`**, as a third option beside a and b (plan P10 and IQ-F5; his page is *Serve notice*, `Bolt> Ink Sentence`). Hidden until his page is held; still needs the slot's level and costs. Id `postmaster:sentence` (named after the rune, as the Steward's note was).

- c · `postmaster:sentence`: *Served at the wall is served for good. A unit Sentence crushes against a wall or the room's edge is held until your next turn.*
  Credit line, in the household's hand under it: *Copied from the postmaster's receipt book.*
  Engine: `sentence`, after the push, a stop of kind crush against a wall or edge (`shove:wall`, `shove:edge`) holds the unit one round (the hold step `vat-edge-pin` uses, `held`). No new harm: the crush already hurts; this is the notice staying put. A rival's immunity to holds still wins (`trickResists`).

His page's own annotation says "aim it at a stamp or an edge and the notice delivers itself"; the note is the same idea in the margin. He serves a notice, the household learns to leave it served.

## 4. The solvents

### Wax

Headline: *It never spreads, and fire melts it unspent.*

**Wax-cloud-I** · `wax:cloud` (*A wax mark never spreads, even in a cloud.*)

- a · `wax-cloud-copy`: *A wax mark spreads once: one copy to the nearest unmarked unit in its cloud, in reading order, and the copy does not spread.*
  Engine: `marks.ts::spreadFrom` for a wax mark copies to the first unmarked unit of the net and stamps the copy wax. Existing `markSpread`. Bends the headline's "never"; the capstones keep it.
- b · `wax-cloud-stay`: *A unit with a wax mark cannot be pushed while it stands in a cloud: the wax holds it.*
  Engine: `push.ts` refuses a step for a wax-marked unit on a cloud tile (the held path, `shove:held`). Existing `held`. A pin you set with a cloud and a mark, the Sealer's seal without the Sealer.

**Wax-cloud-II** · `wax:cloud`

- a · `wax-cloud-smother`: *A wax mark in a cloud is not melted by fire: the cloud smothers the flame on its tile.*
  Engine: `solvents.ts` `wax.onHook` skips a unit on a cloud tile. No new event. Bends `wax:fire`.
- b · `wax-cloud-drip`: *When fire melts a wax mark, the wax runs: its tile takes a blot.*
  Engine: `wax.onHook` after the melt lands Ink (`landKind`) on the tile. Existing `landed`. Bends `wax:fire`: a melted mark leaves a stain behind.
- Combos: copy + smother: a cloud of waxed units that fire cannot melt; fine, the intended pair for a trap room. copy + drip: each melt leaves a blot; fine. stay + smother: a pinned unit that fire cannot free, strong, say so in the text. stay + drip: fine.

**Wax-III**
- a · `wax-cap-seal`: *When a unit takes a wax mark, it is held until your next turn.*
  Engine: `markUnit` with Wax holds the unit one round (`held`, as the Sealer's seal does). Existing `held`. Wax becomes the seal you carry in your lattice.
- b · `wax-cap-spatter`: *When fire melts a wax mark, each unit beside its bearer is marked with plain Ink.*
  Engine: `wax.onHook` after the melt `markUnit` on the bearer's neighbours. Existing `marked`. Fire is how a wax trap spreads.

### Sand

Headline: *It turns back: it acts on whoever set it off instead.*

**Sand-unit-I** · `sand:unit` (*Sand turns a released action back on whoever hit the bearer, pushed the way it came.*)

- a · `sand-unit-onward`: *The turned-back action keeps the heading it was released with: the hitter is pushed on, not back.*
  Engine: `solvents.ts::turnBack` returns the heading unreversed. No new event. A Shove becomes a throw past the bearer.
- b · `sand-unit-both`: *The action also acts on the bearer, as if Sand had not turned it.*
  Engine: `marks.ts::release` runs the bound action twice, once turned and once as cast (depth limit holds). Existing `released`. The trap costs the hitter and the bearer.

**Sand-unit-II** · `sand:unit`

- a · `sand-unit-nearest`: *With no one to turn back on (a fire, the bearer's own doing), Sand turns the action on the nearest other unit instead of spending it.*
  Engine: `turnBack`'s no-hitter branch picks the nearest living unit (reading order on ties). Existing `released`. Bends `sand:noTarget`; a fire release stops being wasted.
- b · `sand-unit-spared`: *Sand never turns an action back on your own party: an ally's hit releases it as cast.*
  Engine: `turnBack` returns null for a member hitter. No new event. Makes a Sand mark safe to leave on a foe among your own apprentices.
- Combos: onward + nearest: the heading stays as cast on the nearest unit; fine. onward + spared: an ally's hit releases as cast; the foe's hit is thrown onward. both + nearest: the nearest unit and the bearer both take it. both + spared: an ally's hit releases once, as cast, not twice; say so at build.

**Sand-III**
- a · `sand-cap-return`: *When Sand turns an action back, the hitter is also marked with plain Ink.*
  Engine: after the turned run, `markUnit` on the hitter. Existing `marked`. Returned to sender: Sentence and Levy have something to spend.
- b · `sand-cap-ricochet`: *When the turned-back action defeats the hitter, it also acts on the bearer.*
  Engine: `release` after the turned run, if the hitter is down, runs the bound action as cast on the bearer (once). Existing `released`.

## 5. Counts

- **Runes:** 6 margin lines; 12 level I/II pairs; 3 capstone pairs.
- **Solvents:** 2 margin lines; 4 level I/II pairs; 2 capstone pairs.
- **Total new pairs:** 21 (16 line pairs, 5 capstone pairs). **Variants:** 42 plus the rival note. **Rival note:** 1 (effect not built).
- **Clashes noted:** release × held, peel × pass, peel × release, shackle/twice × spend ("needed it"), both × spared, stay × smother (wording at build). None needs a rule change.
- **New engine pieces:** five line stamps (audit §11); one shared "release as it is spent" helper (Sentence, Levy); one peel (Sentence, Levy); a collar-off and a shield-off step reused from Erase and Strike; pulls (Levy cap); a held-on-cloud push rule (Wax); the `turnBack` variants (Sand). No new events or `Meets` values.

## 6. Proposals

| # | Proposal | Reason |
|---|---|---|
| I1 | The note is on **level II** of `sentence:mark` (as planned), not on `sentence:unit` | The note works on a crush, which is the push, not the mark; level II is where Sentence meets its neighbour lines (`shove:wall`, `shove:edge`) |
| I2 | Sentence and Levy share the same two ideas (a release, a peel) on `*:mark`, in different levels | One rule, two subjects (the `ink-spread-kin` and `bind-cloud-kin` precedent); the levels differ so a household can mix |
| I3 | `postmaster:sentence` holds, it does not hurt | A rival's note adds no new harm (the Steward's precedent); a hold already exists as the seal and as `vat-edge-pin` |
| I4 | Tally keeps two lines in the draft; drop `tally:stamp` if IQ-FG finds it thin | A trigger has few lines worth choosing on; P1 allows one honest line |
| I5 | `levy-member-near` reaches only members beside the caster | Without the cap it is Splash for free |
| I6 | The `wax-cloud-copy` option bends "never spreads"; the capstones leave the headline true | Level I may change a rule's reach; the capstone rule (headline stays true) is for level III |
