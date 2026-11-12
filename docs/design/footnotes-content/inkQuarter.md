# Footnotes content: the ink-makers' quarter (Contracts)

> **State: Approved 2026-11-11 at IQ-FG** (orchestrator review, design window; the decisions are in §7). This text is the spec for IQ-F3 to IQ-F5. Drafted by task IQ-F2 of [ink-quarter-plan.md](../../plans/ink-quarter-plan.md). Rules: [footnotes.md](../footnotes.md) §1. Lines: `src/data/lines.ts` (the IQ-F1 block, rows `pending` until IQ-F3 stamps them); audit: [footnotes-audit.md](../../plans/footnotes-audit.md) §11. Format and pair rules as in [seam.md](seam.md) §0 and [bathhouses.md](bathhouses.md). Builds: IQ-F3 (Sentence, Levy, Tally) and IQ-F4 (Wax, Sand) into `src/data/footnotes/inkQuarter.ts`; the postmaster's note with IQ-F5 (RV API, IQ-22).
>
> Nothing here is built yet. Every number is *tune by playing*.

## 0. How to read this

Same conventions as [seam.md](seam.md) §0: pair IDs `<Subject>-<meets>-<level>`, capstones `<Subject>-III`, options **a**/**b** with the variant ID they ship under (`<subject>-<slug>`, never changed once shipped), a **c** only for the rival's note. **Engine** is a one-line sketch; "no new event" means an existing event stamped with the slot's line carries it. **Combos** reads all four level I × level II pairings on the line (six where the note adds a third level II option).

Costs (FN plan P3): level I and II pay in the line's district; every line here is `inkQuarter` (Wax and Sand). Capstones pay one Wax and one Sand.

**Mark vocabulary.** A *plain* mark is spent whole by one Spark, Sentence or Levy. A *deep* mark (Ink on a marked unit) takes two sparks; Sentence and Levy spend it whole today. A *bound* mark holds an action (Bind). Spending a mark never releases what it holds; only its event does (P31).

**Pending lines.** `sentence:mark`, `levy:mark`, `levy:member`, `tally:collar` and `tally:stamp` are IQ-F1 rows with final text and no engine stamp yet; the build task stamps them first (audit §11 names each site), so every pair below has a line to hang on. `sentence:unit` and `sand:unit` are live rows. `tally:stamp` is stamped like the others but carries no slot (cut at IQ-FG).

### Review batches for IQ-FG

| Round | Pairs | Build task |
|---|---|---|
| 1 | Sentence (both lines), the postmaster's note | IQ-F3, IQ-F5 |
| 2 | Levy (both lines) | IQ-F3 |
| 3 | Tally (`tally:collar`; `tally:stamp` cut) | IQ-F3 |
| 4 | Capstones: Sentence, Levy, Tally | IQ-F3 |
| 5 | Wax, Sand (line pairs and capstones) | IQ-F4 |

## 1. Margin lines

Two margin lines for Sentence and Levy, one for Tally, one per solvent. None is invented to host a slot (FN P5): all five rune lines are IQ-F1's or already live, and each one bends a real decision.

| Subject | Margin lines | Note |
|---|---|---|
| Sentence | `sentence:mark`, `sentence:unit` | `sentence:mark` holds the postmaster's note (level II). `sentence:noHeading` stays unslotted: it fires only for a headless aim, rare in a lattice |
| Levy | `levy:mark`, `levy:member` | `levy:unit` and `levy:shielded` stay unslotted: the first is a miss with nothing to choose, the second is Guard's rule over again |
| Tally | `tally:collar` | `tally:stamp` stays fine print with no slot (cut at IQ-FG: its level II options counted states and jars, not pieces, so they did not bend its own line) |
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
- Combos: release + held: a held unit keeps its mark, so nothing is released; say so in held's text at build. release + pass: the action fires on the unit and what passes is a plain mark, never the action. peel + held: fine. peel + pass: a peeled mark is not spent whole, so nothing passes; a plain mark does; say "spends a mark whole" at build. release + note: the note acts on the crush, not the mark; independent. peel + note: a peeled unit crushed at a wall is held, so a second Sentence spends its plain mark but cannot push it; the note trades the double push for the pin; say so in the note's build comment.

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

**Sentence-III** (added at IQ-FG: the draft had none)
- a · `sentence-cap-blot`: *When Sentence spends a mark, the tile the unit was pushed from takes a blot.*
  Engine: `sentence`, after the push, `landKind` Ink on the start tile when the unit left it (nothing when it did not move). Existing `landed`. The next unit to step there is stained (`stainMarks`): a notice nailed where the debtor stood.
- b · `sentence-cap-cosign`: *When Sentence pushes a unit into another unit, the unit it hits is marked plain.*
  Engine: `sentence`, a crush whose obstacle is a living unit, `applyMark` plain on it with the Sentence's origin (skipped when it is already marked). Existing `marked`. Aim into a crowd and the next Sentence has a target. With `sentence-mark-pass` both may mark; a unit is marked once.

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

**`tally:stamp`: cut at IQ-FG.** The line stays as fine print (IQ-F3 stamps it, its `fires` test comes off `it.fails`), with no slot and no variants. The four drafted options (`tally-stamp-count`, `-beside`, `-cloud`, `-jar`) are not built and their ids are not reserved.

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

- a · `wax-cloud-keep`: *A cloud does not thin on the tile of a unit with a wax mark: the wax keeps it while the mark stands.*
  Engine: `mix.ts::decayStates` skips the cloud's countdown on a tile whose unit bears a wax mark (stamped `wax:cloud`; no `stateFades` that round). No new event. The mark keeps its cover; the cloud ends when the mark is spent or melted. (Replaces the draft's `wax-cloud-copy` at IQ-FG: a Wax that spreads undoes the solvent's one rule.)
- b · `wax-cloud-stay`: *A unit with a wax mark cannot be pushed while it stands in a cloud: the wax holds it.*
  Engine: `push.ts` refuses a step for a wax-marked unit on a cloud tile (the held path, `shove:held`). Existing `held`. A pin you set with a cloud and a mark, the Sealer's seal without the Sealer.

**Wax-cloud-II** · `wax:cloud`

- a · `wax-cloud-smother`: *A wax mark in a cloud is not melted by fire: the cloud smothers the flame on its tile.*
  Engine: `solvents.ts` `wax.onHook` skips a unit on a cloud tile. No new event. Bends `wax:fire`.
- b · `wax-cloud-drip`: *When fire melts a wax mark, the wax runs: its tile takes a blot.*
  Engine: `wax.onHook` after the melt lands Ink (`landKind`) on the tile. Existing `landed`. Bends `wax:fire`: a melted mark leaves a stain behind.
- Combos: keep + smother: a waxed unit in a cloud that neither thins nor lets fire melt the mark; a lasting pocket, strong, the intended pair for a trap room. keep + drip: the cloud lasts until fire melts the mark, which then leaves a blot; fine. stay + smother: a pinned unit that fire cannot free, strong, say so in the text. stay + drip: fine.

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
- b · `sand-unit-still`: *The turned-back action does not push: the hitter takes the rest of it where it stands.*
  Engine: `solvents.ts::turnBack` returns `heading: null` (a push in it reads as a headless aim, as `sentence:noHeading` already handles). No new event. The pair is about the push: draw the hitter in (onward) or pin it in place (still). (Replaces the draft's `sand-unit-both` at IQ-FG: acting on the bearer too undoes "instead".)

**Sand-unit-II** · `sand:unit`

- a · `sand-unit-nearest`: *With no one to turn back on (a fire, the bearer's own doing), Sand turns the action on the nearest other unit instead of spending it.*
  Engine: `turnBack`'s no-hitter branch picks the nearest living unit (reading order on ties). Existing `released`. Bends `sand:noTarget`; a fire release stops being wasted.
- b · `sand-unit-spared`: *Sand never turns an action back on your own party: an ally's hit releases it as cast.*
  Engine: `turnBack` returns null for a member hitter. No new event. Makes a Sand mark safe to leave on a foe among your own apprentices.
- Combos: onward + nearest: the heading stays as cast on the nearest unit; fine. onward + spared: an ally's hit releases as cast; the foe's hit is thrown onward. still + nearest: the nearest unit takes it without a push; fine. still + spared: an ally's hit releases as cast (with its push), a foe's is turned and pins; fine.

**Sand-III**
- a · `sand-cap-return`: *When Sand turns an action back, the hitter is also marked with plain Ink.*
  Engine: after the turned run, `markUnit` on the hitter. Existing `marked`. Returned to sender: Sentence and Levy have something to spend.
- b · `sand-cap-ricochet`: *When the turned-back action defeats the hitter, it also acts on the bearer.*
  Engine: `release` after the turned run, if the hitter is down, runs the bound action as cast on the bearer (once). Existing `released`.

## 5. Counts

- **Runes:** 5 margin lines; 10 level I/II pairs; 3 capstone pairs.
- **Solvents:** 2 margin lines; 4 level I/II pairs; 2 capstone pairs.
- **Total new pairs:** 19 (14 line pairs, 5 capstone pairs). **Variants:** 38 plus the rival note. **Rival note:** 1 (effect not built).
- **Clashes noted:** release × held, peel × pass, peel × release, peel × note, shackle/twice × spend ("needed it"), stay × smother (wording at build). None needs a rule change.
- **New engine pieces:** the seven line stamps (audit §11, `tally:stamp` included); one shared "release as it is spent" helper (Sentence, Levy); one peel (Sentence, Levy); a collar-off and a shield-off step reused from Erase and Strike; pulls (Levy cap); a held-on-cloud push rule and a kept cloud (Wax); the `turnBack` variants (Sand). No new events or `Meets` values.

## 6. Proposals

| # | Proposal | Reason |
|---|---|---|
| I1 | The note is on **level II** of `sentence:mark` (as planned), not on `sentence:unit` | The note works on a crush, which is the push, not the mark; level II is where Sentence meets its neighbour lines (`shove:wall`, `shove:edge`) |
| I2 | Sentence and Levy share the same two ideas (a release, a peel) on `*:mark`, in different levels | One rule, two subjects (the `ink-spread-kin` and `bind-cloud-kin` precedent); the levels differ so a household can mix |
| I3 | `postmaster:sentence` holds, it does not hurt | A rival's note adds no new harm (the Steward's precedent); a hold already exists as the seal and as `vat-edge-pin` |
| I4 | **Decided at IQ-FG:** `tally:stamp` dropped; Tally has one margin line | Its level II options counted states and jars, so the line had no second decision of its own; P1 allows one honest line |
| I5 | `levy-member-near` reaches only members beside the caster | Without the cap it is Splash for free |
| I6 | **Replaced at IQ-FG:** `wax-cloud-copy` became `wax-cloud-keep` | See §7 |

## 7. IQ-FG review (orchestrator, design window 2026-11-11)

Approved with these changes; everything not named here is approved as drafted.

1. **Tally:** `tally:stamp` loses its slot (I4). The line itself stays and is stamped.
1a. **Sentence had no capstone** (IQ-F2's Done-when asks one per rune): `sentence-cap-blot` and `sentence-cap-cosign` are added above.
2. **Defining words stay true.** Level I and II may change a subject's numbers or reach (`levy-mark-deep` pays two, `sentence-unit-nudge` pushes one), but no variant undoes the one rule a solvent is named for. `wax-cloud-copy` ("spreads once") is replaced by `wax-cloud-keep`; `sand-unit-both` (also acts on the bearer, against "instead") by `sand-unit-still`. `wax-cloud-smother` stays: it keeps fire from reaching the mark in a cloud, an interaction with a neighbouring line, and fire still melts a wax mark it reaches. `sand-cap-ricochet` stays: a capstone's bounded "when X, also" is allowed.
3. **The postmaster's note** holds the crushed unit (a root: it cannot move or be pushed until your next turn; it still acts). No new harm; a rival's hold immunity wins. It trades against `sentence-mark-peel`'s double push (the combo line above). Approved as drafted.
4. **Build notes for IQ-F3 to IQ-F5:** each "say so at build" in a Combos line becomes a short clause in the variant's text or a one-line comment beside it; the ids above are final; `fourCombos` per margin line (Sentence 2, Levy 2, Tally 1, Wax 1, Sand 1), one scenario per capstone (10), the note hidden, then offered, then credited.

## 8. After the build (design window 2026-11-12, on IQ-F3 to IQ-F5's report)

1. **`wax-cloud-smother` could never fire:** a tile holds one layer, so a waxed unit on a cloud tile never stands in fire. Its id stays (it shipped) and it is re-read as an interaction that can happen: *A wax mark does not melt in fire while a cloud stands beside its bearer: the steam keeps the wax cool.* Engine: `solvents.ts` `wax.onHook` checks a cloud on any 4-neighbour of the bearer instead of its own tile. Combos: keep + smother, a waxed unit holding a cloud whose neighbour stays safe from fire beside it; stay + smother, fine. Built by FU-21.
2. **Levy emits one miss per unmarked target, area casts included:** accepted as built (each target's line is true; the log may group them later).
3. **`levy-cap-bank` fires at the third spend, once per cast:** accepted; the shield lands mid-cast, the same party result.
4. **A bound deep mark: release beats peel** (`sentence-mark-peel`, `levy-mark-peel`): accepted; the mark is spent, so its action is released and nothing is peeled. FU-21 adds the clause "a bound mark is released, not peeled" to both texts.
5. **`sentence-unit-collar` strikes only removable collars:** accepted; a born-brass unit's brass is its body, not a collar. FU-21 adds "(born brass is not a collar)" to the text.
6. **The wax seal** lives in `solvents.ts`'s wax rule hooks and runs only in wax invention runs: accepted; FU-21 adds one end-to-end scenario for `wax-cap-seal`.
