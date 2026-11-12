# Footnotes content: the bell foundry (Resonance)

> **State: Approved 2026-11-12e at BF-FG (DESIGN §11), as written; built by Pack BF-J.** Task BF-F1 of [foundry-plan.md](../../plans/foundry-plan.md) (P15 the Carillonneur's note and Coil's non-diagonal capstone, P25 the note's line). Rules: [footnotes.md](../footnotes.md) §1. Lines: `src/data/lines.ts` (the BF-F1 block, rows `pending` until BF-F2 and BF-F3 stamp them); audit: [footnotes-audit.md](../../plans/footnotes-audit.md) §12. Format and pair rules as in [seam.md](seam.md) §0, [inkQuarter.md](inkQuarter.md) and [bridges.md](bridges.md). Builds: BF-F2 (Toll, Coil, Unison) and BF-F3 (Rivet, Filings, the Carillonneur's note) into `src/data/footnotes/foundry.ts`.
>
> Nothing here is built except the Coil diagonal capstone (FN-11, `src/data/footnotes/auras.ts`) and the note's text and page (BF-24, `src/data/rivals/carillonneur.ts`; its effect and its slot are BF-F3's). Every number is *tune by playing*.

## 0. How to read this

Same conventions as [seam.md](seam.md) §0: pair IDs `<Subject>-<meets>-<level>`, capstones `<Subject>-III`, options **a**/**b** with the variant ID they ship under (`<subject>-<slug>`, never changed once shipped; the solvents use their line subject, `rivet-`, `filings-`), a **c** only for the rival's note. **Engine** is a one-line sketch; "no new event" means an existing event stamped with the slot's line carries it. **Combos** reads all four level I × level II pairings on the line (six on Toll, where the note adds a third level II option).

Costs (FN plan P3): level I and II pay in the line's district; every line here is `foundry` (Rivet and Filings). Capstones pay one Rivet and one Filings.

**Vocabulary.** A *bell* is a piece with a tone and no state; a *great bell* hangs a tone too. A *strike* queues a ring, which is settled at the end of the action; a tone then *hums* until round end and rings no more. The *staff* are the Ringer (anchored on a rope of a tone), the Clapper (a walking member of its tone) and the Detuner. A *pulse* is the 1 damage and 1 push a ringing bell gives each unit beside it, friends included.

**Pending lines.** `toll:bell`, `coil:bell`, `unison:bell` and `filings:bell` are BF-F1 rows with final text and no engine stamp yet; the build task stamps each first (audit §12 names the site), so every pair below has a line to hang on. `rivet:unit` is a live row. **Hit amounts.** The only variant here that changes how hard a hit lands is `rivet-unit-anvil`; it uses `exposedStep`'s pattern (one guarded term in `src/engine/exposed.ts`, bridges plan P21), not a new damage path. No other variant touches `dealDamage`.

### Review batches for BF-FG

| Round | Pairs | Build task |
|---|---|---|
| 1 | Toll (`toll:bell`, both levels), the Carillonneur's note | BF-F2, BF-F3 |
| 2 | Coil (`coil:bell`, both levels) | BF-F2 |
| 3 | Unison (`unison:bell`, both levels) | BF-F2 |
| 4 | Rivet (`rivet:unit`, both levels) | BF-F3 |
| 5 | Filings (`filings:bell`, both levels) | BF-F3 |
| 6 | Capstones: Toll, Coil (b), Unison, Rivet, Filings | BF-F2, BF-F3 |

## 1. Margin lines

One margin line per subject. FN P1 asks for two on a rune and P5 forbids inventing one to host a slot: the audit (§12, Q6) found one real behaviour each for Toll, Coil and Unison against the foundry that no other subject's row already holds, as the Ink Quarter found for Tally. None is invented here.

| Subject | Margin line | Note |
|---|---|---|
| Toll | `toll:bell` | Holds the Carillonneur's note (level II). Replaces BF-24's placeholder `toll:network` (audit Q2) |
| Coil | `coil:bell` | One line, two clauses (a burst's reach, a ring's pulse); only the first is stamped (audit Q3) |
| Unison | `unison:bell` | Bent from both sides: which casts count (level I), how long and for whom (level II) |
| Rivet | `rivet:unit` | A live row. The audit's Ri1 to Ri3 (the Clapper, the Detuner, the Ringer) are bent from here |
| Filings | `filings:bell` | `filings:plate` stays unslotted: its sentence is the brass condition, and `filings-bell-brass` bends it from here |

## 2. The Resonance runes

### Toll

Headline: *The rest also acts on every tile connected to the target by the same state.*

**Toll-bell-I** · `toll:bell` (*A bell holds no state, so a Toll aimed at one joins nothing: only that bell is struck.*)

- a · `toll-bell-clappers`: *A Toll aimed at a bell also reaches every Clapper of its tone.*
  Engine: `resolve.ts` `shape` step, after `toll(...)`: when a target tile holds a bell, add the unit target of each standing Clapper whose tone is the bell's (`foundry/pieces.ts` `toneGroups`, `clapperTone`). No new event. The walkers are reachable from a bell: a Strike or a Shove lands on each, and a hit Clapper rings (audit To4).
- b · `toll-bell-ringers`: *A Toll aimed at a bell also reaches every Ringer on a rope of its tone.*
  Engine: same site, the units standing on a `foundry:rope` of that tone (`ropeTone`). No new event. The anchored Ringers, across the room, answered from the bell.

**Toll-bell-II** · `toll:bell`

- a · `toll-bell-beside`: *A Toll aimed at a bell also reaches the units standing beside it.*
  Engine: same site, the unit on each of the bell's four neighbours. No new event. The pulse's own zone, now a place to land a Strike or a Shove.
- b · `toll-bell-next`: *A Toll aimed at a bell also strikes the nearest other bell of its tone, ties in reading order.*
  Engine: same site, `strikePiece(ctx, at, 'damage')` on that bell (a great bell hung of the tone counts). Existing `foundry:bellStruck`. The rest does not land there; it is a strike, so it signs Unison and answers a lock that wants one (locks 1 and 3).
- c · `carillonneur:toll`: the Carillonneur's note (section 3). Hidden until his page is held.
- Combos: clappers + beside: the Clappers of the tone and the units around the bell are all reached, and a unit that is both is reached once (the target list drops repeats). clappers + next: the second bell is only struck, so the Clappers stay the only extra targets of the rest. ringers + beside, ringers + next: the same, with Ringers. clappers + note: the note's tone-wide strike and its beside-each reach come on top of the Clappers; repeats dropped. ringers + note: the same. The note is the far end of the axis `beside` and `next` start (the bell's neighbours, one tone-mate, every tone-mate with their neighbours), which is why it is rare; see F1.

**Toll-III**
- a · `toll-cap-gap`: *A Toll also joins tiles of its state across a gap of one tile.*
  Engine: `sameStateNet(s, at, 1)` as `ruleOf(flow.habit).networkGap` already passes it for the owner's mender (P19); with the mender the gap stays 1, never 2. No new event. A cloud, a slick or a plate with a hole in it is one network.
- b · `toll-cap-knell`: *When a Toll's strike makes a bell ring, the units its pulses push are pushed one tile further.*
  Engine: the Toll step tags the strike (a `knell` flag on the `QueuedStrike`, JSON like the rest); `ring.ts::hurt` takes `pushBy + 1` for a tagged ring. Existing `push`. A rung bell shoves its neighbours off a ledge or into the next bell.

### Coil

Headline: *Bursts and conducted actions from touching paths reach one tile further.*

**Coil-bell-I** · `coil:bell` (*Coil widens a burst's reach for units, never for bells: a bell just past the burst is not struck, and a ring's pulse is not widened.*)

- a · `coil-bell-strike`: *A bell on Coil's extra tile is struck by the burst.*
  Engine: `bursts.ts::announce` (or its callers) strikes the bell tiles within `reachOf(flow)` of the burst's tiles, as it strikes the tiles themselves (`strikePiece(ctx, c, 'burst')`). Existing `foundry:bellStruck`. A Storm that ends beside a bell rings it.
- b · `coil-bell-retune`: *A bell on Coil's extra tile is retuned one tone up instead, and not struck.*
  Engine: same site, `ring.ts::retune(ctx, at, 1)` on each such bell. Existing `foundry:retuned`. A burst's heat detunes what it cannot ring; with Brass in the room it is a second tuner.

**Coil-bell-II** · `coil:bell`

- a · `coil-bell-pulse`: *A ring that a burst Coil widened caused pulses one tile further.*
  Engine: the burst tags the strike it makes (a `wide` flag on the `QueuedStrike`); `ring.ts::pulse` also takes the units two tiles from each ringing bell. Existing `foundry:pulse`. Bends the line's second clause.
- b · `coil-bell-muffle`: *A bell on Coil's extra tile takes a cloud for one round.*
  Engine: same site, `mix.ts::newLayer` lays a one-round cloud on the bell's tile when it holds no layer (a bell holds clouds). Existing `stateLaid`. Bends muffle: silence from a burst's edge.
- Combos: strike + pulse: a bell the burst's edge strikes rings and pulses wide; the strongest pairing and the one the line invites. strike + muffle: the bell is struck and clouded in one cast, and the ring is read at the end of the action, so it is silent: a strike with no ring, which is what Unison and the locks that need a strike (1 and 3) want; say so in the text at build. retune + pulse: a retuned bell is not struck, so nothing rings and no pulse widens unless another strike rings that tone later; fine, say so at build. retune + muffle: retuned and silenced, a quiet detune.

**Coil-III**
- a · `coil-diagonal` (**built**, FN-11): *Coil also reaches the runes diagonally touching it on the page.*
- b · `coil-cap-surge`: *When a burst or conducted action Coil widened hits three or more units, its reach grows one tile further for that hit, once.*
  Engine: `bursts.ts`, after `unitsNear`, a second `unitsNear` with `reachOf + 1` when the first found three or more and Coil is on the step; the new units are hit once, and the conduct path reads the same helper. No new event. A crowd is the target; the headline stays one tile, the surge is the exception. (Coil's non-diagonal capstone, P15: it is not about bells, so it works in the Seam too.)

### Unison

Headline: *The rest happens only if another apprentice's cast landed on this target this turn.*

**Unison-bell-I** · `unison:bell` (*Unison on a bell waits for another apprentice's cast on that same bell: another bell of its tone, a ring or a basic Shove does not count.*)

- a · `unison-bell-tone`: *A cast that landed on a bell counts for Unison on every bell of its tone.*
  Engine: `flow.ts::unisonWith`, for a target tile holding a bell, counts the others' landed entries whose snapshot tile holds a bell of the same tone (`toneOfPiece`). Existing `triggered`. Bends the tone-mate case of audit Un1; a cast on the near bell signs the far one.
- b · `unison-bell-beside`: *A cast that landed on a tile beside a bell counts for Unison on it.*
  Engine: `unisonWith` takes `reach` 1 for a bell target, as the tuner's habit does for any target (AH P16). Existing `triggered`. Redundant for the tuner by design (F4).

**Unison-bell-II** · `unison:bell`

- a · `unison-bell-lingers`: *A cast that landed on a bell still counts for Unison on it during your next turn.*
  Engine: the landed entries whose target is a bell tile are carried one phase longer in the snapshot. Existing `triggered`. Reads "this turn" as two for bells (a number, F5); a slow chord: sign now, answer next turn.
- b · `unison-bell-hush`: *A ring that a passed Unison caused does not pulse your own party.*
  Engine: the strike a passed Unison's cast makes is tagged (`spare` on the `QueuedStrike`); `ring.ts::pulse` skips members for it, as `alliedPulse` skips everyone but foes. Existing `foundry:pulse`. Bends pulses being neutral (P5): a chord is the one ring you may stand beside.
- Combos: tone + lingers: a cast on one bell counts for every bell of its tone through the next turn too; strong, the pair for a slow Peal. tone + hush: a tone-wide Unison whose ring spares your party. beside + lingers: a cast beside a bell counts next turn as well. beside + hush: fine. None needs a rule change; `beside` adds nothing for the tuner.

**Unison-III**
- a · `unison-cap-three`: *When two or more other apprentices signed the target, the rest acts twice.*
  Engine: `resolve.ts` `trigger` step queues the rest twice when `unisonWith` finds two distinct casters on the target (it already reads every landed entry). No new event. Needs a trio; a household of two never sees it (F6).
- b · `unison-cap-share`: *When a Unison passes, each apprentice whose cast signed it gains 1 shield.*
  Engine: after a pass, `damage.ts::gainShield` for each signing caster, as Levy gives its own. Existing `shieldGained`. The chord steadies the party that played it.

## 3. The Carillonneur's note

On **Toll, level II, slot `toll:bell`**, as a third option beside `toll-bell-beside` and `toll-bell-next` (P15; the plan's contract puts it on level II). Hidden until his page *Tune* (`carillonneur:tune`, `Bolt> Toll Strike`) is held; still needs the slot's level and costs. Id `carillonneur:toll`, as BF-24 shipped it.

- c · `carillonneur:toll`: *Tolled as one. A Toll that reaches a bell strikes every bell of its tone at once, and the rest of the cast lands beside each of them.*
  Credit line, in the household's hand under it: *Copied from the Carillonneur's tuning sheet.*
  Engine: at the `toll:bell` stamp site, when the Toll's target tile holds a bell: strike every other bell of its tone (`toneGroups`; the ring dedupes, one ring) and add the units on the neighbours of each. Existing events. No new harm: the pulse already hurts; the note is the cast landing where the bells already ring. Built by BF-F3 (P25); BF-24 wrote the text, page and variant.

**The line is confirmed as replaced** (audit Q2): BF-24's placeholder was `toll:network`, which names no behaviour; `toll:bell` is the sentence the note's own first words answer (*a Toll aimed at a bell joins nothing*, so *tolled as one*). BF-F3 moves the note from the capstone slot to `{ line: 'toll:bell', level: 2 }` in `src/data/rivals/carillonneur.ts` and fixes `tests/rivals/carillonneur.test.ts` to match. The text is kept word for word.

His page's own annotation says the Toll takes "as much metal as it is wide"; the note is the same idea in the margin, and the Carillonneur's habit of ringing one bell and having the tone answer.

## 4. The solvents

### Rivet

Headline: *What it reaches can't move until your next turn.*

**Rivet-unit-I** · `rivet:unit` (*Rivet holds whoever the invention reaches in place until your next turn.*)

- a · `rivet-unit-anvil`: *A unit you Rivet takes one more from every hit while it is held.*
  Engine: **`exposedStep`'s pattern (bridges plan P21), not a new damage path.** One guarded term in `src/engine/exposed.ts::exposedStep`, read after the two Hold terms: `hasFootnote(ctx, 'rivet-unit-anvil') && unit.held > 0 && (unit.holds ?? 0) === 0` returns `{ step: 1, line: 'rivet:unit' }`. The step stays 0 or 1 (it never stacks with Hold's), `dealDamage` already adds it to a hit of base 1 or more and stamps the line on the `damage` event. Pulses, crushes, burns and rune hits alike. A Riveted unit beside a bell takes the pulse, cannot be pushed (audit Ri1), and takes one more.
- b · `rivet-unit-spare`: *Rivet never holds your own party.*
  Engine: `solvents.ts` `rivet.onReach` returns for a `kind === 'member'` unit. No new event. Safe with wide runes (a Toll, a Splash); the same shape as `sand-unit-spared`.

**Rivet-unit-II** · `rivet:unit`

- a · `rivet-unit-strike`: *A Clapper you Rivet rings its tone as the Rivet lands.*
  Engine: `rivet.onReach` calls `ringTone(ctx, clapperTone(u), 'clapper', origin, u.pos)` (`foundry/ring.ts`; it already does nothing on a board with no bell). Existing `foundry:ring`. A Rivet without a Strike becomes a ring, and the Clapper is pinned where its pulse falls.
- b · `rivet-unit-gag`: *A Ringer or Detuner you Rivet loses its next act.*
  Engine: the staff's `plan` and `resolve` (`foundry/foes.ts`) return nothing while `held > 0` for those two foes. No new event (the foe's usual `idle`). Answers audit Ri2: held stops walking, not acting, and the plain rule keeps that.
- Combos: anvil + strike: a pinned Clapper is rung at once, takes the pulse where it stands and takes one more; pins, rings and punishes, the intended pairing. anvil + gag: a gagged Detuner takes one more from every hit while it stands there; strong control, fine. spare + strike: your party is never held, and the Clapper is a foe; unaffected. spare + gag: fine. None needs a rule change.

**Rivet-III**
- a · `rivet-cap-pair`: *When Rivet holds a unit that stands beside another unit, that unit is held too, once.*
  Engine: `rivet.onReach` also holds the first unit beside the target in reading order, with no chain; `rivet-unit-spare` still keeps your party out. Existing `held`.
- b · `rivet-cap-lock`: *When Rivet holds a unit beside a bell, that bell cannot be retuned until your next turn.*
  Engine: a `locked` list on `BellsState` cleared on the owner's turn; `ring.ts::retune` refuses a locked bell and the Detuner's `resolve` already emits a `miss` when a retune does not happen. Existing `miss`. A pinned Detuner cannot retune its way out of a lock; Brass does not retune a locked bell either.

### Filings

Headline: *On brass, it rings once more next round.*

**Filings-bell-I** · `filings:bell` (*Filings comes back to the tile, not to what struck it: a bell is not struck again, so it does not ring, and a Clapper that walked off is missed.*)

- a · `filings-bell-strike`: *Filings' second run strikes the bell it comes back to, so it rings again.*
  Engine: `schedule.ts::run`, for a `filings` entry whose tile holds a bell, `strikePiece(ctx, at, 'damage', origin)` before the step runs. Existing `foundry:bellStruck`. The hum is gone by then (round end clears it), and the tone is read when the ring settles, so a retune in between changes it (audit Fi5). The design's "rings once more", made literal for a bell.
- b · `filings-bell-follow`: *Filings' second run follows the unit it reached: it hits the unit wherever it stands then.*
  Engine: `filings.after` records the unit id on the entry; `schedule.ts::run` targets that unit while it lives (the `live` path the unit entries already take). No new event. A Clapper that walks off is still struck, and rings.

**Filings-bell-II** · `filings:bell`

- a · `filings-bell-brass`: *A bell counts as brass for Filings: it comes back to a bell with no brass beside it.*
  Engine: `solvents.ts::touchesBrass` is true for a bell tile when this is written. Existing `scheduled` (stamped `filings:plate` as the brass row is). Bends audit Fi2 (a bell is never brass).
- b · `filings-bell-twice`: *Filings comes back at the start of each of your next two turns.*
  Engine: the second run schedules one more entry (its `repeated` flag is spent after the third run, not the second). Existing `repeated`. A number on "once more" (F5); a bell on a plate rung on three turns.
- Combos: strike + brass: a bell with no brass beside it is struck again next turn and rings; Filings becomes a bell-ringer's delay. strike + twice: struck on both of the next two turns (the hum clears every round end); fine. follow + brass: independent axes; a unit is followed and a bell counts as brass; fine. follow + twice: the unit is followed on both runs. None needs a rule change.

**Filings-III**
- a · `filings-cap-plate`: *When Filings comes back and no brass touches the target, a plate lands on its tile.*
  Engine: the second run lays Brass on the target tile (`landKind`) when it is empty and nothing brass touches; a bell tile refuses (it holds clouds only, and Brass retunes a bell instead: nothing lands there, a `miss` as today). Existing `landed`. Filings makes its own brass for the next net.
- b · `filings-cap-guard`: *When Filings comes back, you gain 1 shield.*
  Engine: `schedule.ts::run` calls `gainShield` on the entry's owner for a `filings` run. Existing `shieldGained`. The second ring steadies the one who rang it.

## 5. Counts

- **Runes:** 3 margin lines (Toll, Coil, Unison); 6 level I/II pairs; 3 capstone pairs (Coil's pair is the built diagonal and `coil-cap-surge`).
- **Solvents:** 2 margin lines; 4 level I/II pairs; 2 capstone pairs.
- **Total new pairs:** 15 (10 line pairs, 5 capstone pairs). **Variants:** 29 new plus the built diagonal and the rival note. **Rival note:** 1 (text, page and variant built by BF-24; effect and slot are BF-F3's).
- **Clashes noted:** strike × muffle (Coil), retune × pulse (Coil), anvil × Ri1, the note against `beside` and `next` (F1). None needs a rule change.
- **New engine pieces:** the four line stamps (audit §12); three flags on the queued strike (`knell`, `wide`, `spare`) and one list on `BellsState` (`locked`), all JSON; one guarded term in `exposedStep` (`rivet-unit-anvil`); a bell-aware reach in `unisonWith` and the burst; the staff's `held` reads; a unit id on the Filings entry. No new `Meets` value, no new event type.

## 6. Defining words

The IQ-FG and BR-G1 rule: no variant undoes the one rule a subject is named for.

- **Toll** follows a state network; every Toll variant adds targets or reach beyond it and never removes the network. `toll-cap-gap` extends it.
- **Coil** reaches one tile further; its variants decide what that tile does to a bell, and the surge reaches further under a condition. None narrows it.
- **Unison** needs another apprentice's cast. `unison-bell-tone` and `-beside` widen where that cast landed, `-lingers` when (a number), and no variant lets a Unison pass with no second apprentice; `unison-cap-three` needs more of them.
- **Rivet** holds. No variant frees; `rivet-unit-spare` narrows who is held (as `sand-unit-spared` does), `-gag` holds the act too.
- **Filings** comes back once. `filings-bell-twice` changes the number, which levels I and II may; no variant removes the return.

## 7. Proposals

| # | Proposal | Reason |
|---|---|---|
| F1 | BF-FG to weigh the note against `toll-bell-beside` and `toll-bell-next`: it is both ideas, for every bell of the tone. Either accept it as the rare wide end, or trim its second clause ("the rest lands beside each") so it is one idea | A rival's note should not be a straight upgrade (footnotes.md §1); this one overlaps two authored options |
| F2 | One margin line each for Toll, Coil and Unison (audit Q6) | FN P5; every other real behaviour belongs to a row that is not theirs |
| F3 | `toll-cap-gap` repeats the owner's mender (P19) for any household; keep it, since the capstone costs a solvent pair and the mender is one apprentice's habit | One engine path; no new code beyond reading the footnote |
| F4 | `unison-bell-beside` is the tuner's habit for bells only, so it is redundant for her; keep it for every other household | The habit is a recruit; a footnote is for the notebook |
| F5 | `unison-bell-lingers` (two turns for bells) and `filings-bell-twice` (twice) change a number in a defining sentence | Levels I and II may change numbers (IQ-FG); the sentences' rules stay |
| F6 | `unison-cap-three` needs three apprentices | A trio is the usual party; a household of two picks the other capstone |
| F7 | If a flag on the queued strike (`knell`, `wide`, `spare`) proves heavier than it looks, BF-F2 may swap that variant for one that reads only `Flow` state and say so in its report | The ring queue is shared by every action; a flag there must not change a ring a variant did not touch |
