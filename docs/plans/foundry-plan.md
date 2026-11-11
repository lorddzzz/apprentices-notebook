# The bell foundry: implementation plan

Design: [district-bell-foundry.md](../design/district-bell-foundry.md). Also [rune-design-final.md](../design/rune-design-final.md) §4.3–4.4, §5.2, §6.3, §11, [party.md](../design/party.md) §2 (the tuner), [rivals.md](../design/rivals.md), [footnotes.md](../design/footnotes.md). Roadmap: **BL-116**. Prefix **BF**. Brief: [build-program.md](build-program.md). Order and packs: [midpoint-audit.md](midpoint-audit.md) §2.2 (Track F), §3 Pack A.
**State: Building (BF-0, BF-1, BF-2 merged; repacked and acceptance tests written by BF-T, 2026-11-11; Pack A's hooks decided, P18–P20).**
**Scope:** the carillon towers as a playable district: sympathetic bells by tone, a peal across the trip, the ringers' staff, four rooms and the heart with the Carillonneur (a real rival through RV's API from the start, no stand-in), the far-bell gate, the conducted-burst hearing, the tuner's landmark room, a lower-Seam floor with a pair of bells, and the Resonance footnote batch.

## 1. Scope and settled rules

**Delivers**, all inside DK's district module files (`src/data/districts/foundry.ts`, `src/engine/districts/foundry.ts`, `src/ui/districts/foundry/`):

- **Sympathetic bells (design §0 board rule).** A bell is a solid one-tile piece of a *tone* (two tones early, three later; colour and pattern). Strike any bell and every bell of that tone rings; each ringing bell pulses 1 damage and a 1-tile push away from itself on its 4 neighbours. Bells need not touch. This is not Conduct: bells are not brass, join no brass network and need no Spark.
- **A peal across the trip.** One optional **great bell** per room with a small authored puzzle; every one rung hangs in the heart as an allied bell. Free return after any room, no extra currency.
- **The ringers' staff:** Ringer, Detuner (renamed 2026-10-23), Clapper. **Four rooms and the heart**, three layouts per depth.
- **The Carillonneur:** a four-note tune across his rounds, then the Great Peal. A real rival through RV's authoring API from the start (audit 2026-11-11: no scripted stand-in).
- **Hearing** (a conducted burst hitting 3 units in the Seam), **gate** (the far bell threshold room), **lore** ("the Seam has no bell"), **the tuner's landmark room**, the **lower-Seam floor** (a pair of bells), the **Resonance footnote batch**, Bench/Lab parity and phone readability of tones. Calibration (win rates, foe numbers, Q1) belongs to the CAL plan, not here.

**Settled by design (cited, not repeated):** everything in the design's §0 table and §1 defaults, party.md §2 for the tuner, the Peal idiom (already detected in `idioms.ts` from a Conduct burst over 3+ tiles; unchanged).

**Leaves out:** the platform pieces (DK, FD, HC, RV, RC, AH, SM, FN own theirs); the recruit's data, precondition and offer semantics (RC); Toll, Coil, Unison, Rivet and Filings as runes and solvents (built and Lab-usable; this plan only gives them loot placement and footnote content); the sealed door and the other districts' floors (SM).

## 2. Proposals

| # | Proposal | Why |
|---|---|---|
| P1 | **A bell is a DK piece** (`{bell:low}`, `{bell:mid}`, `{bell:high}`, plus `{bell:great}`, `{rope:<tone>}`, `{hook}`): solid like a plate, no HP, never destroyed, holds no state except a cloud, never brass. Brass nets, Conduct and Surge ignore it. The Clapper (a unit) counts as a member of its tone while it stands somewhere | The design wants it clearly different from Conduct; a piece keeps the parser, Lab and Bench untouched (DK P10) |
| P2 | **What strikes a bell:** damage landing on its tile (a spell's target, a foe's attack or projectile that stops there); a unit pushed into it (it is "what it hit" in the crush); Spark landing on it; a basic Shove aimed at it (no movement). **Not** kinds (Ink, Oil, Steam, Brass), Guard, marks or a Pull/Hop/Swap. Request to AH/DK: Shove at a piece is legal and means "strike" | Matches "struck by any damage, push or Spark"; one list the UI and tests share |
| P3 | **Redefines: "every bell of the same tone rings" gains a limit: a tone rings at most once per round** (the bells are then *humming* until round end, shown with a marker). Rings queue and resolve at the end of the action that caused them, in strike order; each unit is pulsed at most once per ring (the first bell in reading order), as limit 4 does for Conduct; a pulse that pushes a unit into another bell strikes it (another tone may ring, never the same twice). With three tones a chain is at most three rings | Cascade limit that is simple to state and to preview; also the *counter-toll*: ring a tone first and the Ringer's or Carillonneur's ring of that tone fizzles. Alternative (a cap per cast) is harder to read. The design's text has no limit, so this goes to the player (Q1) |
| P4 | **Retune and muffle with basics.** A Brass kind landing on a bell **retunes** it up one tone (low, mid, high, back to low); a Steam kind landing on a bell leaves a cloud there, and a **muffled** bell (cloud on its tile) is struck but makes no ring and joins no ring. The tuner's starter page `Bolt → Brass → Strike` retunes and strikes in one cast. The tone and the muffle are read when the queued ring resolves (end of the action), so the page rings the new tone and `Bolt → Steam` at a bell is silent | The design says "muting bells, retuning" without a verb; these use Seam kinds only and make Brass and Steam meaningful here |
| P5 | **Pulses are neutral:** a ringing bell hurts any unit beside it, foes included, so foes' own rings can hit their friends and the planner avoids it. Bell pulses carry the striker's origin (credit for proof, witnessed lines) | Positional play both ways; no new faction rule |
| P6 | **Great bells** are a fourth, private sound: not part of any tone net in their own room. Each has a lock and a *note* (1–4), and a hang tone in the heart (data). Locks, all solvable with the starting seven plus Brass (scripted solve test each): **1 Reach** (the bell hangs across a shaft of drop tiles; a Bolt, Strike-range cast or Spark across the gap strikes it), **2 Match** (it rings only when a ring of its listening tone reaches it: that tone's other bells are out of reach or muffled, so retune a near bell or herd the Clapper), **3 Unison** (needs strikes from two different apprentices in the same player phase; one if the party is alone), **4 Chord** (needs one ring of 3+ other bells; two stand in tone, a Clapper or a retuned bell makes the third, and killing the Clapper by habit spoils it). **Redefines (mild):** the design names "ring it with a Unison" and "toll a Peal"; the runes drop here, so the locks teach the idea and the runes only make it easy | A puzzle that needs a rune you have not found would lock the first trip's optional reward; each lock teaches one thing the school does |
| P7 | **Trip state** `{ rung: { room, note }[] }` through DK-5b. A room's `bonus` is "its great bell is rung and the room is won"; the reward is a **rung bell** written to trip state (`afterRoom` reads the `foundry:bellRung` event in the room's log), no offer card. The heart's `roomSetup` places an allied bell at each of the 4 `{hook}` tiles for every note rung. Returning home or a wipe discards them with the rest of the trip | The design's "no extra currency"; DK's trip state is the natural carrier |
| P8 | **Allied great bells** pulse **foes only**, for 2 and push 1 (the party stands beside them safely), may be struck once per round by an apprentice (a cast or Shove), and ring their hang tone so every sympathetic bell pulses too. Numbers *tune by playing* | "Allied" and "bigger finale" need a concrete rule; the humming rule gives "once per round" for free |
| P9 | **The tune.** At the fight's start a four-note tune (tones, seeded from the trip seed through `deriveSeed`, no tone more than twice) is shown in full. Each round at his turn he **rings the next note**: a real ring of that tone, telegraphed a round ahead. After the fourth note the **Great Peal** rings every bell not already humming, then a new tune begins. A note is **answered** (the tune restarts at note 1) when its tone is already humming, when no bell of the tone can ring (muffled, retuned away, none left), or when he cannot ring it (dead, stunned, silenced). Your hung great bells are extra bells of their tones, so you can answer from afar | The design: "he plays a tune; break it by muting, retuning or silencing him; the tune is the countdown; your bells counter-toll". The rules are pure functions |
| P10 | **Redefines (adopted in the midpoint audit, 2026-11-11): no stand-in.** The heart's master is the real Carillonneur through RV's API from BF-9 (RV-14 is merged): two Resonance spells, the `foundry:playsATune` per-round mark (called note, advance or failed), a routine, silence rules, the page `carillonneur:tune`. His token stays `V`; `carillonneurStandIn` leaves the data | The stand-in existed because RV-14 was not ready; the bridges show the cost of a stand-in that duplicates RV-11 and must be deleted |
| P11 | **Landmark room = room 3 (the tuning hall).** It carries the recruit offer for the tuner (RC's offer kind through DK-7); Unison's page is guaranteed in room 2's table until owned, so the precondition cannot soft-lock (a request to RC, section 4) | party.md: foundry entered and Unison learned; recruits bank at home, so she appears on a later trip |
| P12 | **Rooms:** 1 the belfry stair (5×7, two tones, Ringer, Clapper), 2 the ringers' gallery (6×7, two tones, two Ringers, Clapper), 3 the tuning hall (5×9, three tones, Detuner, Clapper, Ringer; quiet, long), 4 the clockwork loft (6×8, three tones, two Detuners, Ringer, Clapper), heart the Great Bell (7×9). Foe numbers start at Ringer 4 HP anchored, Detuner 3 HP move 2, Clapper 5 HP move 1 bump 1, Carillonneur about 14 HP | Gives the design's "long quiet halls" later and every layout a start-point count; numbers are *tune by playing* (CAL) |
| P13 | **Intrusion** = two bells of one tone far apart, in 3 layouts, with the piece-scoped `bells` rule only (strike, ring, hum). No Ringers, no tune, no great bells | DK P9: pieces bring their own behaviour, never a district rule; the gentle version of the district |
| P14 | **Tones read by three cues at once:** colour, a pattern and a silhouette size, plus 1, 2 or 3 pips in the corner. The hum marker is a ring around the bell and a dimmed pattern (BF-1 settled the glyph set) | Greyscale and colour-blind safe at 47px cells (7×9 at 375px) |
| P15 | **The Carillonneur's note** goes on **Toll**; **Coil's non-diagonal capstone** is authored in this batch (FN P7 leaves it to us) | Toll is the school's Shape rune and the one a tune tolls through; the diagonal capstone is FN's |
| P16 | **Approved (design window 2026-11-11).** The Detuner picks the nearest bell, ties in reading order, and does not skip muffled bells or bells of a humming tone. "Nearest" = fewest walking steps to a free tile 4-adjacent to the bell, by the foes' existing pathing; with none reachable this round it walks toward the nearest by the same measure (BF-T2 todos name it) | The plan said "priority rules" without stating one; the simplest deterministic rule is previewable |
| P17 | **Approved (design window 2026-11-11).** API shapes the tests pin (BF-T2): `applyAction(state, action, footnotes, eventCap?)` passes `eventCap` to the draft; the pure tune functions `newTune(seed): Tone[]`, `calledNote(t: TuneState): Tone`, `answerNote(t, reason): TuneState` (at 0, `answered` + 1) and `greatPeal(ctx)` are exported from `src/engine/districts/foundry.ts`; a bell strike arrives through the pieces' `onStruck` (shove, push, spark, burst) and `onHit` (a projectile stopping there), never through edits to `push.ts` or `damage.ts` | The audit's Pack A contract; a name and a place for each so BF-3, BF-4 and BF-9 are testable before they exist |
| P18 | **Settle points (design window 2026-11-11, replaces the stopped Pack A's `settle(ctx)` in `applyAction` only).** A board rule may have `settle?(ctx, own): S`: it resolves what the rule queued during an action and is a no-op (no events, same state) when nothing is queued. `settleRules(ctx)` in `rules.ts` runs every active rule's `settle` in slot then `order` order. It is called at four **settle points**: (1) the end of `resolveSpell`'s cast body, **inside the cast scope** (rings share the cast's 500-event cap, count toward `trace.meaningful` and `isStarved`, and are seen by the rival planner's `simulate` and every preview, which call `resolveSpell` directly); (2) `applyAction`, after `dispatch` inside `withIdioms` (a basic Shove, and anything the enemy phase left); (3) `endTurnAction`, after each foe's `resolveIntent` (a foe projectile rings at the end of that foe's action); (4) the bell rule's own `late` step, which settles before it clears the hum (jars, drift and other dusk strikes). A strike emits `foundry:bellStruck` when it happens and queues `{ at, by, origin }` in `BellsState`; the queue is empty after every settle point. Pulses run under the queued strike's origin | The applyAction-only hook missed casts simulated outside it (rival planning, previews) and put foe-caused rings at dusk; the cast-scope point keeps P3's "end of the action that caused them" for every caller |
| P19 | **Kinds on pieces (design window 2026-11-11).** `PieceTriggers.onKind?(ctx, at, piece, kind, origin): boolean` (kind = a plain kind, not Spark) runs from `mix.ts::landOnTile` **before** the `holds: 'clouds'` guard, through `pieces.ts::kindOnPiece`; `true` means the piece took the kind and nothing lands. The bell takes Brass (retune, `foundry:retuned`, no strike) and returns `false` for every other kind, so Steam still lands as the muffling cloud and Ink and Oil still miss | The generic answer to BF-2's "retune routes before the guard"; no core file names the foundry |
| P20 | **One acceptance line changes (design window 2026-11-11).** In `BF-3: applyAction passes eventCap to the draft`, `expect(run(s, action, {}, 3).events.at(-1)).toMatchObject({ type: 'fizzles', reason: 'cap' })` becomes `expect(run(s, action, {}, 3).events).toContainEqual(expect.objectContaining({ type: 'fizzles', reason: 'cap' }))` | A capped player cast always ends with its `trace` after the `fizzles` (checked on main); the test's point, that the fourth argument reaches the draft, is unchanged |

## 3. Current implementation and risks

- `src/data/districts.ts` has `foundry` as a `drawn()` stub: material `'spark'`, `gate: { kind: 'drawing' }`, hearing `named burst:conduct` plus `trips ≥ 6`. DK replaces it (P16 `lean`, DK-8 hearing kinds) and moves it to `src/data/districts/foundry.ts`.
- `src/engine/networks.ts` (`isBrass`, `brassNet`, `flood`), `bursts.ts` (`conduct`, `unitsNear`, `reachOf`): the model for a snapshot-once network. `push.ts::push` and `damage.ts::dealDamage` (which `notify`s `hit`) are the places a strike is detected; the crush into a plate is "what it hit takes 1" there.
- Toll (`runes/flow.ts` via `sameStateNet`), Coil, Unison (`unisonWith` over the snapshot's `landed`), Rivet and Filings (`solvents.ts`) all exist and work in the Lab; the Peal idiom exists. None of them mention bells yet.
- `ENEMIES` holds 8 foes; the `Intent` union (`types.ts`) has `attack`, `summon`, `flare` and RV adds more; `turn.ts::resolveIntent` and `view.ts`, `overlay.ts`, `describe.ts` switch on it. Ringer and Detuner need two new intents.
- `MEANINGFUL` (resolve.ts) decides starved casts for RV and proof: ring and pulse events must be classified there.
- **Risks:** (1) ring cascades inside a cast share the 500-event cap (FD P11): bounded by P3 (at most 3 rings of a few bells), proven by BF-4's cap sweep and fuzz. (2) Piece data (tone, muffle, rung) must be inside the battle clone and the replayed trip, or retunes desync playback. (3) The planner for Detuner and Ringer must stay rng-free and not harm friends. (4) Tones at phone size (P14, settled by BF-1). (5) BF-9 carries the rival's whole size (RV-14 is merged, so it no longer waits). (6) A threshold needs a strike: a party of only Pull, Swap or Hop apprentices cannot strike a bell (Q3).

## 4. Contracts

**Provides**

- `FoundryModule` (DK `DistrictModule`): pieces `bell`, `rope`, `hook`, `greatBell`; piece-scoped rule `bells` (strike detection, ring queue, hum, reset in DK's `late` slot, `preview` showing the tiles a tone would pulse); district rule `tune`; trip hooks (`roomSetup`, `afterRoom`, `offersFor`, `parseState`); `intrusion`.
- Engine API: `tonesOf(state)`, `strike(ctx, at, cause)`, `ringTone(ctx, tone, cause)`, `retune(ctx, at, delta)`, `isHumming(state, tone)`, and the pure tune functions of P17 (`newTune`, `calledNote`, `answerNote`, `greatPeal`), shared by the rival trick.
- Events: `bellStruck`, `ring { tone, bells, cause }`, `pulse`, `hum`, `retuned`, `muffled`, `bellRung`, `tuneNote`, `greatPeal`, with `describe` lines and `MEANINGFUL` entries.
- Data: `FOUNDRY` DistrictDef (rooms with `bonus`, `ret: any`, `hear`, `gate`, `intrusion`, loot tables `foundryShallow`, `foundryDeep`, `foundryHeart`, lore lines), enemies `ringer`, `detuner`, `clapper`, the rival `carillonneur` (`src/data/rivals/carillonneur.ts`), `FoundryTripState`.
- Footnote batch `src/data/footnotes/foundry.ts`.

**Leaves for later tasks** (declared by BF-0 to BF-2, filled by the task named; the status file's Owed list)

- Pieces' `triggers` are empty and `BELLS_RULE.step`, `preview` are no-ops, `strikable` is false: BF-3. Event `describe` lines are placeholders: BF-3. `BellData` has no hum field: BF-3 passes it to the art through piece data.
- `toneGroups` reads no unit tone (`NO_UNIT_TONES`): BF-6 supplies the Clapper's reader. Retune routes before `mix.ts`'s `holds: 'clouds'` guard: BF-5.
- Trip hooks `roomSetup`, `afterRoom` (BF-8), `offersFor` (BF-13); the district has no rooms, `drawing` gate, placeholder hearing: BF-10 to BF-12, BF-22, BF-14; `intrusion`: BF-16.
- `TUNE_RULE.step` is a no-op and `FOUNDRY_FOE_IDS` still lists `carillonneurStandIn`: BF-9. `applyAction` does not pass `eventCap`: BF-3.
- UI: art by tone and the registry entries exist only as BF-1's sheet: BF-17 to BF-19.
- Handed to the CAL plan, no task here: foe numbers, pulse and allied damage, tune length, puzzle difficulty, Q1.

**Consumes**

- **FD-3, FD-7, FD-9:** pulses and walks through the arrival pipeline and relocation event shape; the cap sentinel; the grant helper is not needed.
- **DK-1/17/18:** module contract and template district; **DK-3** rule slots (`late`, piece scope); **DK-4** pieces with `onStruck`, `onHit`, `componentsOf`; **DK-5a/b** `ret`, trip state, `roomSetup`, `afterRoom`, `offersFor`, room `bonus` and `Goal.piece`; **DK-7** offer kinds (recruit); **DK-8** `conducted` hearing kind; **DK-9** step registry (ordinary foes use it for ring and retune); **DK-10** intrusion; **DK-13/14/15/16** board rendering, Lab and Bench registry, threshold data, map. **KIT-R2** (board UI registries) before any board UI here.
- **HC-2/HC-3:** `P` start points, `checkRoom`; sizes 5–7 × 6–9.
- **RV-11–15, RV-20 (merged):** trick hooks (per-round mark with a timing slot), the `draw` descriptor, pages and the rival-note hook.
- **RC:** the tuner's recruit offer, preconditions and guaranteed page. **FN:** template §6, FN-8 slot, FN-C1 pilot. **SM-W0:** floor framework reading `IntrusionSpec`. **AH:** Shove at a piece. **EN-0:** the shared bot, for BF-20.

**Requests (to the plans named)**

- **DK:** (a) DK-4 reports `onStruck` for exactly the P2 sources, including a basic Shove at a piece, and offers an enemy-level `onStruck` hook for the Clapper; (b) DK-5b lets a bonus reward write trip state with no offer card, and `Goal.piece` read a piece state set during the fight; (c) DK-9's registered steps are also usable by ordinary AI foes (intents `ring` and `retune` with plan, resolve, preview, describe), otherwise BF-6 makes one reviewed edit to the `Intent` union; (d) piece data is cloned and serialised with the battle; (e) the "Next round" preview supports generic outlines and pulse marks (not only ghost moves); (f) `roomSetup.boardEdits` can place pieces at authored `{hook}` tiles after the start-point draw.
- **RV:** the per-round mark can resolve to "advance" or "failed" (decided by BF); a stunned or dead rival's mark counts as failed; the `draw` descriptor accepts tone-coloured outlines.
- **RC:** one function giving the guaranteed page for a recruit's precondition, called by the district's `offersFor`; confirm the landmark-room hook.
- **AH:** Pull, Hop and Swap at a bell are illegal; Shove is the strike.

## 5. Packs

Pack 0 (BF-T: this repack and the acceptance tests in `tests/districts/foundry/*.acceptance.test.ts`) is merged first. BF-0 to BF-2 are merged (contracts, the tone glyph sheet, the pieces). BF-9 is the old BF-9 and BF-23 in one task; BF-21 (tuning pass) is removed to the CAL plan. Every `it.fails` and `it.todo` below is named by its exact title; a pack removes the marker and changes no other line of its tests, and says so in the report.

### Pack A: Ring engine (role: Strong; engine; depends on: Pack 0)
Owns: `src/engine/districts/foundry.ts`, `src/engine/districts/foundry/**`, `tests/districts/foundry/**`, `tests/engine/rules-settle.test.ts` (new); and, widened by P18/P19 (design window 2026-11-11), only these edits outside the district: `BoardRule.settle` and `PieceTriggers.onKind` in `src/engine/districts/types.ts`, `settleRules` in `src/engine/rules.ts`, `kindOnPiece` in `src/engine/pieces.ts`, one call each in `mix.ts::landOnTile`, `resolve.ts` (end of `castBody`), `turn.ts::endTurnAction`, and `applyAction`'s `eventCap` parameter plus one call in `src/engine/battle.ts`.
Pattern: `src/engine/districts/bathhouses/boilOver.ts` (a rule, its preview) and `tests/districts/bathhouses/boil-over.test.ts`.

| ID | Goal | Size | Done when |
|---|---|---|---|
| BF-3 | Strike detection (P2) through the pieces' `onStruck` and `onHit`, the ring queue, hum (P3), pulses (damage then push, once per unit, neutral, origin), events, round-end reset in the `late` slot, preview of a tone's pulse tiles, and `applyAction`'s `eventCap` argument | L | in `bells.acceptance.test.ts`: `BF-3: a Bolt stopped by a bell strikes it and every bell of its tone rings`, `BF-3: a basic Shove at a bell is legal, strikes it and moves nothing`, `BF-3: a unit pushed into a bell strikes it`, `BF-3: a Spark landing on a bell strikes it`, `BF-3: a foe projectile that stops at a bell strikes it`, `BF-3: kinds, Pull, Hop and Swap are not strikes`, `BF-3: a tone rings once per round, hums, and the hum clears at round end`, `BF-3: a unit beside two bells of the ringing tone is hit once`, `BF-3: a chain low to mid to high rings each tone once and ends`, `BF-3: a pulse that strikes a bell of a humming tone does not ring it again`, `BF-3: a muffled bell is struck but silent, and joins no ring`, `BF-3: a pulse hurts every unit beside the bell, damage then push, credited to the striker`, `BF-3: applyAction passes eventCap to the draft` pass; todo `BF-3: the preview shows the tiles a tone would pulse` becomes a test and passes |
| BF-4 | Cascade proof: cap sweep at every event index, fuzz over random bell nets, projection equals final state | S | in `cascade.acceptance.test.ts`: `BF-4: a ring chain cut at every event index projects to the board it ended on`, `BF-4: random bell nets ring each tone once and never reach the cap`, `BF-4: random bell nets project to the final board` pass (zero drift, no `fizzles`, at most three rings) |
| BF-5 | Retune and muffle (P4): Brass retunes up, Steam muffles, cloud burst interplay, the tuner's page order | S | in `retune.acceptance.test.ts`: `BF-5: Bolt → Brass → Strike retunes the bell and rings the new tone`, `BF-5: Brass wraps high back to low`, `BF-5: Brass retunes a bell but is no strike: nothing rings`, `BF-5: a Steam cloud muffles a bell: struck, silent, and no ring at all`, `BF-5: a Storm on a muffled bell bursts, strikes it and stays silent` pass |

### Pack B: The staff and the great bells (role: Default; engine; depends on: Pack A)
Owns: `src/data/districts/foundry/enemies.ts` (new), the one-line registrations in `src/data/enemies.ts`, `src/engine/districts/foundry/foes.ts` and `peal.ts` (new), the trip hooks in `src/engine/districts/foundry.ts`, `tests/districts/foundry/**`. At most one reviewed edit to the `Intent` union (`src/engine/types.ts`) if DK-9's steps are not enough (request c).
Pattern: `src/engine/districts/bathhouses/foes.ts` and `trip.ts`; `src/engine/districts/bridges/enemies.ts`.

| ID | Goal | Size | Done when |
|---|---|---|---|
| BF-6 | Ringer (anchored on its rope, rings its tone each round) and Clapper (walking bell that rings when struck): data, rng-free plans that avoid harming friends, intents or steps, telegraph previews, describe lines, the Clapper's tone reader | M | in `staff.acceptance.test.ts`: `BF-6: the Ringer and the Clapper are in ENEMIES with the plan stats and tokens` passes; the todos `BF-6: the Ringer stands on its rope and telegraphs a ring a round ahead`, `BF-6: a Ringer ring fizzles when its tone already hums`, `BF-6: a Ringer ring pulses neutrally and can hurt its friends`, `BF-6: hitting the Clapper rings its tone`, `BF-6: a standing Clapper is a member of its tone; a dead one is not`, `BF-6: the Clapper plan is rng-free and avoids harming friends`, `BF-6: Ringer and Clapper plans are deterministic across seeds` become tests and pass |
| BF-7 | Detuner (P16): walks to a bell and retunes it, preview of tile and new tone, interplay with muffled and humming bells | S | `BF-7: the Detuner is in ENEMIES with the plan stats and token` passes; the todos `BF-7: the Detuner walks to the nearest bell and retunes it with a preview`, `BF-7: with two bells in reach it takes the nearest, reading order on a tie`, `BF-7: muffled and humming bells are retuned like any other`, `BF-7: killing or blocking the Detuner keeps the net as it was`, `BF-7: the Detuner choice is deterministic across seeds` become tests and pass |
| BF-8 | The peal: great bell with the four locks (P6), the rung bell written to trip state through `afterRoom` (P7), allied pulses (P8) | M | in `peal.acceptance.test.ts`: `BF-8: lock 1 reach: a Bolt across drop tiles rings the great bell`, `BF-8: lock 2 match: only a ring of its tone reaches it, and muffled the ring never comes`, `BF-8: lock 3 unison: needs two apprentices in the same player phase`, `BF-8: lock 3 unison: one strike when the party is alone`, `BF-8: lock 4 chord: needs one ring of three other bells`, `BF-8: a won room with a rung great bell writes a rung bell to trip state`, `BF-8: an allied great bell pulses foes only and spares the party` pass; the three remaining BF-8 todos stay todo (they need rooms, the heart and a foundry trip: BF-10, BF-12, BF-22 take them) |

### Pack C: The Carillonneur (role: Strong; engine; depends on: Pack B, RV-14, RV-15, RV-20)
Owns: `src/engine/districts/foundry/tune.ts` (new), the tune and trick registration in `src/engine/districts/foundry.ts`, `src/data/rivals/carillonneur.ts` (new) and the one-line additions to `src/data/rivals/index.ts` and `types.ts`, the foe ids in `src/data/districts/foundry.ts`, `tests/districts/foundry/**`.
Pattern: `src/data/rivals/bathSteward.ts` and its trick; `src/engine/districts/bathhouses/heart.ts`.

| ID | Goal | Size | Done when |
|---|---|---|---|
| BF-9 | The tune (P9) and the Carillonneur as a real rival from the start (P10): pure tune functions, the `tune` rule, two Resonance spells, the `foundry:playsATune` mark (called note, advance or failed), routine, silence rules, the page `carillonneur:tune` with annotation and story, the `draw` descriptor, hum counter-toll | L | in `tune.acceptance.test.ts`: `BF-9: newTune is four tones, none more than twice, seeded`, `BF-9: calledNote reads the tone at the current index`, `BF-9: answerNote restarts the tune at note 1 and counts it`, `BF-9: the Great Peal rings every tone not already humming`, `BF-9: the Carillonneur is a registered foundry rival with the tune trick`, `BF-9: no stand-in remains` pass; the todos `BF-9: he rings the next note each round`, `BF-9: after the fourth note the Great Peal rings and a new tune begins`, `BF-9: a note is answered when its tone already hums`, `BF-9: a note is answered when no bell of its tone can ring`, `BF-9: a note is answered when he cannot ring it`, `BF-9: ringing a tone first is the counter-toll`, `BF-9: hung great bells answer from afar`, `BF-9: he plays the same tune by round for the same seed`, `BF-9: his planner never rings into his own friends`, `BF-9: clearing the heart awards the page`, `BF-9: his draw descriptor names the called tone` become tests and pass |
| BF-24 | Page and note: recovered page text, the "Seam has no bell" thread in his story, the Toll note as an FN variant | S | a test shows the note hidden until the page is held, then offered, then credited; page text present |

### Pack D: Rooms (role: Default; data; depends on: Pack B, HC-2)
Owns: `src/data/districts/foundry.ts` (rooms), `tests/data/foundry-rooms.test.ts` (new). Packs D, E and F share the data file: one at a time, in order.
Pattern: the bathhouse rooms in `src/data/districts/bathhouses.ts` and `tests/data/` room tests.

| ID | Goal | Size | Done when |
|---|---|---|---|
| BF-10 | Rooms 1–2 (3 layouts each, 5×7 and 6×7, ≥4 `P`), foe lists, great bell puzzles 1 (Reach) and 2 (Match) with scripted solves | M | `checkRoom` passes for every layout; a scripted solve of each puzzle exists, using the starting seven plus Brass; the todo `BF-8: a room bonus is its great bell rung and the room won` becomes a test and passes |
| BF-11 | Rooms 3–4 (5×9 and 6×8) with puzzles 3 (Unison) and 4 (Chord); room 3 is the landmark room (recruit slot, quiet hall) | M | as BF-10; the Unison puzzle has a scripted solve with 1, 2 and 3 apprentices; a test shows killing the Clapper in puzzle 4 breaks the chord |

### Pack E: The heart and the loot (role: Default; data; depends on: Packs C and D, DK-7, RC-W0)
Owns: `src/data/districts/foundry.ts` (heart, loot, lore), `tests/data/foundry-rooms.test.ts`.
Pattern: `src/engine/districts/bathhouses/heart.ts` and the bathhouse loot tables.

| ID | Goal | Size | Done when |
|---|---|---|---|
| BF-12 | The heart: 3 layouts (7×9), tones, four `{hook}` tiles, the Carillonneur and foes beside him, `roomSetup` hanging rung bells; safe tiles for the party in the Peal | M | `checkRoom` passes for every layout; the todo `BF-8: roomSetup hangs an allied bell at each hook for every note rung` becomes a test and passes (0 and 4 notes rung; bells only at the hooks); a scripted full heart fight with 0 and with 4 bells hung ends without a throw |
| BF-13 | Loot and recruit: tables `foundryShallow/Deep/Heart` (Toll, Coil, Unison, Rivet, Filings, basics), Unison guarantee in room 2, the tuner offer in room 3 via RC, ink and lore lines per room and heart | S | a test shows the offer appears only when RC's preconditions hold; a trip can always bank Unison; every room and the heart has its text |

### Pack F: Thresholds and the floor (role: Default; data; depends on: Pack E, DK-8, DK-10, DK-15, HC-5, SM-W0)
Owns: `src/data/districts/foundry.ts` (hear, map, threshold, intrusion), `tests/data/foundry-rooms.test.ts`.
Pattern: the bathhouse hearing, threshold and intrusion entries.

| ID | Goal | Size | Done when |
|---|---|---|---|
| BF-14 | Hearing, lean, map: swap the placeholder for `conducted ≥ 3` in the Seam (owner's line: a note that carries), `lean: brass`, map caption and solved art key | S | a hearing test: meets, and narrowly misses |
| BF-15 | The far bell: threshold room with ≥4 `P`, two same-tone bells far apart, a decoy tone, free and retryable; goal reads the far bell rung | S | `checkRoom` passes; a scripted solve with Shove from every start point; Retry keeps the same spots; Q3 recorded |
| BF-16 | Lower-Seam floor: `IntrusionSpec` (a pair of bells, 3 layouts, piece rule only), the "Seam has no bell" floor line | S | a fixture floor builds; a strike rings the pair and it hums; no tune or staff appear |

### Pack G: Foundry screens (role: Default; UI; depends on: KIT-R2, Packs B and E)
Owns: `src/ui/districts/foundry/**`, `tests/ui/**` for these screens.
Pattern: `src/ui/districts/bathhouses/` and its registry entries; BF-1's `BellPiece`, `ToneSheet`.

| ID | Goal | Size | Done when |
|---|---|---|---|
| BF-17 | Board UI: bell art by tone with hum and muffle states, rope and hook art, ring and pulse animations, tone ring preview in "Next round", struck-bell highlight on previews | M | **phone check** (the animations carry meaning), Lab board at 375×812, light and dark: all three tones on a 7×9 board, a ring mid-animation, a Ringer telegraph, a humming bell and a muffled bell, a struck-bell highlight on a preview; autofixer clean |
| BF-19 | Bench and Lab: registry entries, `met` keys for bells, ropes and the three foes, Lab palette with tones, scenario presets for each lock | S | Bench lists bells and foes only after met; Lab places every piece and foe; a preset per lock loads (Lab, 375×812, light) |
| BF-18 | Heart UI: the four-note tune banner with the called note and countdown (RV's banner), hung great bells and a strike affordance, the Great Peal warning | M | **phone check** (the strike affordance is a new tap), Lab heart fixture 7×9 at 375×812, light and dark: banner with the called note and countdown, four hung bells at the hooks and one tapped to strike, the Peal telegraph visible over the board; autofixer clean |

### Pack H: Proof and open (role: Default; sim and data; depends on: Packs E and F, EN-0)
Owns: `src/engine/districts/foundry/bot.ts` (new), `tests/sim/foundry.test.ts` (new; the only pack here that runs `tests/sim/`), the gate and `PLAYABLE_DISTRICTS` lines in `src/data/districts/foundry.ts` and `index.ts`.
Pattern: the bathhouse sim test and bot terms; `tests/sim/` fuzz.

| ID | Goal | Size | Done when |
|---|---|---|---|
| BF-20 | The bot sees pulses in its greedy simulation and plays the rival; fuzz of full foundry trips (no win-rate table) | M | a test shows the bot prefers the cast whose ring pulses a foe; 200 seeded trips of random legal play find no throw and no cap overrun |
| BF-22 | Open the district: gate flipped from `drawing`, `PLAYABLE_DISTRICTS`, golden fixtures for Seam and canals unchanged | S | golden fixtures identical; `pnpm check:fast` green; a headless trip from room 1 to the heart runs; the todo `BF-8: returning home or a wipe discards the rung bells` becomes a test and passes |

### Pack I: Footnote audit (role: Strong; data; depends on: Pack C, FN-1)
Owns: `src/data/lines.ts`, `docs/design/footnotes-content/foundry.md` (new).
Pattern: the ink quarter's draft and lines pass.

| ID | Goal | Size | Done when |
|---|---|---|---|
| BF-F1 | Audit Toll, Coil, Unison, Rivet, Filings against bells and the staff (e.g. Filings or Toll on a bell, Unison for a great bell lock, Rivet on a Clapper); add missing lines with firing scenarios; author the draft with Coil's non-diagonal capstone and the Carillonneur's Toll note | M | table of real behaviours without rows; every pair reads sensibly in all four combinations |
| BF-FG | **Orchestrator review gate** (the player delegated footnote variant choice, 2026-10-23) on the draft | S | approved text is the spec |

### Pack J: Footnote build (role: Default; data; depends on: BF-FG, BF-24, FN-C1, FN-8)
Owns: `src/data/footnotes/foundry.ts`, hook sites in `src/engine/districts/foundry.ts`.
Pattern: `src/data/footnotes/inkQuarter.ts` (IQ-F2).

| ID | Goal | Size | Done when |
|---|---|---|---|
| BF-F2 | Build runes: levels I and II, capstones | M | `fourCombos` per margin line; one scenario per capstone |
| BF-F3 | Build solvents and the rival note | S | as BF-F2; the note is hidden, then offered, then credited |

### Gate

| ID | Goal | Size | Done when |
|---|---|---|---|
| BF-G1 | **Playtest gate (phone, non-blocking):** the player decides on: are tones readable, do rings and hum read, are the puzzles fun, does the tune read as a countdown, is free return worth the detour | S | feedback logged; numbers go to the CAL plan, rule changes to a new brief |

### Close (orchestrator)
After every pack: full `pnpm check`, one full-trip phone check (tones light and dark, a ring in progress, hum and muffle, each great bell, the tune banner and hung bells, the Peal telegraph, the threshold), one `code-review` run on the foundry subsystem, the verification note, DESIGN §11 and TECH §7 rows (BF-0 drafted the TECH one), ROADMAP BL-116, ledger clean. Calibration (win rates, foe numbers, pulse and allied damage, tune length, puzzle difficulty, Q1) is handed to the CAL plan.

## 6. Verification

- **Scenario tests** (`scenario` skill, ASCII board plus expected event log): the acceptance tests of Pack 0 (`tests/districts/foundry/*.acceptance.test.ts`) cover every strike source and non-source; a tone ringing once and humming; a unit beside two bells pulsed once; muffle and retune; each great-bell lock; allied bells sparing the party; the tune functions; the Carillonneur's registration. Added by their packs: the Ringer fizzling after a counter-toll, the Clapper, the Detuner, each tune reset reason, the Great Peal, hearing meets and misses, the threshold from every start point.
- **Property and fuzz:** BF-4 (random bell nets within the cap, projection equals final state, cap sweep at every index); BF-20 (200-seed foundry trips with random legal play: no throw, no cap overrun); save and reload at every room and mid-heart; golden fixtures for Seam and canals stay identical with the foundry registered (BF-22).
- **Calibration:** none in this plan (CAL).
- **Phone checks (375×812, `verify` skill) with screenshots:** BF-17 and BF-18 per their rows; the rest at Close: tones in colour and greyscale, light and dark, on a 7×9 board; each great bell; the threshold; Desk margins for the batch. `svelte-autofixer` on every changed component.

## 7. Open questions for the player

1. **Q1 (Redefines P3):** a tone rings at most once per round (hum), so ringing a tone first cancels a foe's or the Carillonneur's ring of it. Keep, or allow repeated rings with a cap per cast?
2. **Q2:** allied great bells hurt foes only and for 2, and the party stands safe beside them (P8). Fine, or should every pulse stay neutral?
3. **Q3:** the far-bell gate needs something that strikes (a Shove, a damaging cast). A party of only Pull, Swap and Hop apprentices cannot. Accept (the gate is retryable and they can swap a member in), or give the room a loose rat to pull into the bell?

## 8. Execution notes

- **Critical path:** Pack 0 → A → B → C and D (disjoint files, parallel) → E → F → H; Pack G (screens) follows B and E and runs beside F; Pack I (footnote audit) follows C and runs beside D to F, then BF-FG → J. Close last. BF-G1 never blocks.
- **Hard edges:** KIT-R2 before Pack G; EN-0 before BF-20; the Carillonneur (BF-9) before CG-14. Packs D, E and F share one data file, so they run one at a time.
- **Pack roles:** A and C and I Strong, the rest Default; BF-3 escalates to Opus after one failed review (audit §3).
- **Size:** 25 rows (23 tasks, the playtest gate and the footnote review gate): 2 L (BF-3, BF-9), 10 M, 11 S; ten packs plus Close, about one third engine core (A to C), one third rooms and screens (D to H), one third footnotes.
