# The Cartographers' hall: implementation plan

> Design: [district-cartographers.md](../design/district-cartographers.md) (rev. 2026-10-23), [rune-design-final.md](../design/rune-design-final.md) §5.2, §6.2–6.3, §11, [party.md](../design/party.md) §2 (door arrival B), [district-seam.md](../design/district-seam.md) (the sealed door), [rivals.md](../design/rivals.md). Roadmap: **BL-117**. Prefix **CG**. Brief: [build-program.md](build-program.md).
> **State: Drafted (not approved).**
> Scope: the last district: pencil and ink, drawn-in reinforcements, the guild's hands, free-then-no-return with the doorway checkpoint, the Registrar (stand-in first, rival later), the five-page hearing, the redraft threshold, the academy's lore, its footnote batch, Bench parity and the trigger for the owner's sealed door.

## 1. Scope and settled rules

**Delivers**
- **Pencil and ink** (design §0 "Board rule", §1 "Pencil"): pencilled tiles that the guild's hand inks (permanent) or rubs out (the tile vanishes) at round end, with next round's plan visible; Erase un-draws pencil, Draw and Swap move what stands on it; a unit on a rubbed-out tile is **erased from the fight** through DK's out-of-the-room state.
- **Drawn-in reinforcements:** foes arrive as pencil outlines one round before they ink in; Erase un-draws them.
- **The guild's hands:** Surveyor, Eraser, Tracer (design §0 "Foes").
- **Trip shape:** six encounters (five rooms and the Registrar); free return after rooms 1–3; the guaranteed quiet doorway after room 3 is the point of no return; the hall remembers the doorway as a checkpoint; a wipe on the final run sends you back to it (design §0 "Trip shape", "A wipe").
- **Treasures:** Swap, Draw, Erase, the Bind *dies* event page, Quicksilver and Graphite in rooms 1–3; ordinary deep loot in 4–6.
- **The Registrar** with *strike from the register*: a scripted stand-in through DK-9 first, then the rival through RV-11–14 with his recovered page through RV-15–20.
- **Hearing** by five recovered rival pages (DK-8 `pages`), replacing the placeholder in `src/data/districts.ts`. **Gate:** the free redraft threshold, solvable with any build.
- **Lore:** the registry, the owner's desk, the resolution of every earlier thread (design §2) as codex entries.
- **Footnote batch** (FN §6): Swap, Draw, Erase, Quicksilver, Graphite and the Registrar's note.
- **Bench parity** (DK-14) for pencil, blank paper, outlines and the three hands; Lab scenarios.
- **The owner's door trigger:** clearing the hall's heart is what SM's sealed door reads.

**Leaves out:** a lower-Seam floor or intrusion (the Cartographers are not a floor, Seam doc §0); the sealed door itself, its art and what lies beyond (SM; the ending sandbox BL-126); the exile's data and arrival (RC); the rival engine and page machinery (RV); generic hooks (DK); footnote mechanics (FN).

## 2. Proposals

| # | Proposal | Why |
|---|---|---|
| P1 | **Three paper states, as board pieces (DK-4):** `{pencil}` (standable, holds states/jars/units, carries a *fate* `ink \| rub` and a *due* round once planned), plain inked paper (an ordinary tile) and `{blank}` (no tile: never standable, holds nothing, blocks shots like the board edge). Authored fixed fates (`{pencil:rub@2}`) are legal for the threshold, the Lab and scenarios | One piece family covers rooms, threshold, Lab and Bench without new terrain flags |
| P2 | **Blank paper is a void that erases.** Walking never enters it; a push, slide, pull or Surveyor swap that would carry a unit onto blank stops the unit there and it is **erased** (`removeFromRoom(…, 'erased')`, DK-6), exactly as the bridges' fall. Draw onto blank fails like the edge (new line `draw:blank`) | "The tile vanishes" needs a rule for what is left; sharing the bridges' fall keeps one "out of the room" idea and gives the Shove kit a district payoff |
| P3 | **The guild's hand is a district-scoped round-end rule** (DK-3, slot `late`, after fire and snuff): it resolves the pencil tiles due this round (ink or rub, units on rubbed tiles erased), then inks due outlines, then **plans next round**: picks the next batch of pencil and their fates from a seeded stream (`deriveSeed(battle seed, 7000)`, separate from foe rolls). The plan shown during your turn is exactly what happens at its end. The pencil *piece* itself is piece-scoped, so a Lab or Bench pencil with a fixed fate resolves without the district | DK P9 split; deterministic; "the pencil shows next round's plan" |
| P4 | **Room pencil config** in data: `{ share ≈ 1/3, perRound, inkBias, redraw }`. Default: about a third pencilled; each round end resolves about a third of what remains, roughly half ink, never rubbing out a tile that would leave a member with no standable neighbour; `redraw > 0` in rooms 4–6 lets the hand pencil 1–2 new tiles beside inked paper each round, so the deep rooms keep moving. *Tune by playing* | Gives the designers' numbers a home; the strand guard keeps erasure a telegraphed risk, not a trap |
| P5 | **Board runes on pencil:** Erase on a pencil tile un-draws it at once (it becomes blank; a unit standing there is erased; an elite takes the drop damage). Erase on an outline un-draws the foe. Inked paper cannot be erased. Draw and Swap move states, jars and units across pencil as on any tile; Quicksilver's mirror un-draws the mirrored pencil too. **Graphite does not restore un-drawn paper or erased units** in the base rule (its snapshot stays states and positions); restoring pencil is a candidate Graphite margin line for the batch | Follows the headline ("on unfinished paper, un-draws the tile"); keeps Graphite's undo honest without a new layer |
| P6 | **Outlines:** `{outline:<foe>}` is pencil carrying a foe; it inks at its due round end. A unit standing on it blocks the inking for that round (it waits a round, shown). Erase un-draws it | Pencil applies to units (design); body-blocking is a counter any build has |
| P7 | **Surveyor** (move 2): telegraphs a swap of two named units, both within range 3 of him when he acts; the swap follows the units (R7), fails if either moved out of range or is held, anchored or flying (party §1), and arrives through FD's `swap` cause. His routine prefers putting an apprentice on pencil due to rub, or next to blank for a later push | Telegraphed, avoidable by moving out of range, Hold or killing him |
| P8 | **Eraser** (move 2, priority target): each round telegraphs one tile; at its action it removes that tile's state, mark or jar, or un-draws it early if it is pencil (erasing whoever stands there). Prefers your jars and marks, then pencil under an apprentice | A counter to setups (design); the telegraph makes "step off" the answer |
| P9 | **Tracer** (move 1, no attack of its own): bound to one apprentice (a shown tether); it walks toward that apprentice's mirrored tile (Quicksilver's mirror, `x → width−1−x`) and its telegraph is **the mirror of every tile that apprentice damaged last turn**, 1 damage each, at its next action. One round of delay makes "mirrors their attacks" an ordinary telegraph with no reaction hook | Honest telegraph rule; reads like a copy; punishes casting through the board's middle line |
| P10 | **Strike from the register:** each round the Registrar circles 1 unit (2 below half HP) on its tile; the circle is a trick-owned object (RV P10, `per-round mark`). At round end (`late` slot, before the hand) a unit still on a circled tile is erased. Lifted by Erase on the tile, by moving off, or by **killing the circle's holder**: each circle is held by the nearest living guild hand when drawn (a shown line), or by the Registrar himself if none is left | Makes "kill the marker" a real choice rather than "win the fight"; keeps the hands relevant in the finale |
| P11 | **The Registrar's kit** (draft for CG-14): `Bolt → Erase` (rubs a setup or un-draws pencil under you; starved on an empty tile, so the fallback tells) and `Bolt → Swap` (pulls an apprentice into a circle), 10 HP, move 1, four charges each; his page recovers **Bolt → Swap** with a note in his hand | Uses the school's own runes; the starved Erase is the readable weakness |
| P12 | **Stand-in first** (DK-9): the same circles and a scripted cycle (circle, swap, erase) so the hall is completable before RV's API; `standIn: true`, no page. The rival replaces it in data only | Design §1 "Rival dependency"; DK P14 |
| P13 | **Trip data:** `ret: { kind: 'until', after: 3 }`, `checkpoint: { after: 3, name: 'the quiet doorway' }`; the Crossroads after room 3 offers *Return home* and *Through the doorway* (a DK-5a choice that applies today's doorway rewiring, then room 4). The doorway choice warns that what you carry is lost if you fall. Set Out offers *the doorway* (default once reached, DK P5) or *room 1* | Exactly design §0 through DK's data shape |
| P14 | **Redefines (light): rooms 1–3 each guarantee one unowned Board treasure** through `offersFor`, in the order Erase, Draw, Swap, then the *dies* page, Quicksilver, Graphite; the other offers roll as usual. The design says these come in "ordinary offers" | Six treasures across three rooms of three picks could take many trips by luck alone, and the exile and the Registrar both need the three pages; the Seam tables already guarantee Conduct this way |
| P15 | **The Bind *dies* page is an offer kind `bindEvent`** banked through FD-9's grant helper. Requested from DK as shared (BR's *pushed* page is the same thing); if DK declines, CG registers it in its module and BR reuses it | One mechanism for both Bind event pages |
| P16 | **Redraft threshold, "the drafting table":** a 6×7 board of pencil over blank, no enemies, fixed fates shown a round ahead; goal: reach the inked far bench within 4 rounds. Movement alone solves it from every `P` (any build, any of the nine kits); a second layout adds a lay-figure on rub-due pencil that a Shove, Pull or Swap can save for the same goal | Design: solvable with any build, teaches reading the pencil |
| P17 | **Lore as codex entries** unlocked by play: *the registry* (reaching room 2), *the owner's desk* (room 5's back hall), *the struck name* (the Registrar's fall), *the bad join* (the hall cleared: the design §2 threads in one page). Rooms carry academy names (lecture theatre, drafting benches, registry, back hall) | Physical lore (design §0 "Place") without a new screen |
| P18 | **The door trigger is the cleared heart:** `city.hearts` gains `cartographers` on the win (rival or stand-in, as every heart); CG shows one line ("Below the Seam, a lock turns.") and SM's gate reads the heart. CG adds no floor and no `IntrusionSpec` | SM owns the door; one clean predicate |

## 3. Current implementation and risks

- **Runes** (`src/engine/runes/actions.ts`): `swap` trades caster and target positions, refuses held units (`swap:held`), calls `notify('entered')` for both (FD-3 moves it onto the arrival pipeline). `draw`/`drawHop` move a tile's state and jar along the heading (`draw:noHeading`, `draw:edge`, `draw:unit`, `draw:jar`), not units, not onto gates/grates. `erase` spends a mark (never released), clears collar, shackle, state and jar. **No unfinished paper exists**: the Erase headline in `src/data/runes.ts` mentions it, nothing implements it.
- **Solvents** (`src/engine/solvents.ts`): Quicksilver widens to the x-mirrored tile (`quicksilver:edge`); Graphite snapshots tile states and unit positions (`boardNow`/`undoBoard`), restores next owner turn (`graphite:unit`), units only when free and alive.
- **Bind *dies*** works in `marks.ts` (`died → dies`); learning it is gated by `BIND_EVENT_DISTRICT.dies = 'cartographers'` in `src/data/methods.ts` and `run.ts::knownSetOf` (FD-9 replaces this with grants).
- **Redraft** is already detected in `src/engine/idioms.ts` (Draw or Swap onto a tile a later burst goes off on).
- **District stub** (`src/data/districts.ts`): `drawn('cartographers', …, 'ink', …)` with placeholder hearing (canals' heart or 8 trips), `gate: 'drawing'`, no rooms. Loot tables are a closed `LootTableId` union (DK P2 opens it).
- **Risks:** (1) the deepest dependency stack of any plan (FD-3, FD-9, HC-2, DK-3/4/5/6/7/8/9/13/14/15/16, RV-14/15, FN-8): CG is last on the roadmap and should start after DK-18; (2) a busy 7×9 phone board: pencil fates, outlines, circles with holder lines, the Tracer tether and rival telegraphs together (CG-12 and the gate judge it); (3) round-end erasure can strand or wipe a party with little play (P4's guard, the bot sweep); (4) Graphite and out-of-the-room units (`isAlive` vs `out`) need a defined interaction (DK-6); (5) the hall cannot be heard in a campaign until all four middle hearts are real rivals with pages; development and playtests use the dev "open all" toggle.

## 4. Contracts

**Provides**
- `src/data/districts/cartographers.ts`: the `DistrictDef` (`lean: 'paper'`, six encounters, `ret`, `checkpoint`, hearing `{ kind: 'pages', atLeast: 5, of: [lamplighter + the four masters] }`, threshold, loot tables `cartographers:*`), and the room pencil config.
- `src/engine/districts/cartographers.ts`: pieces `pencil`, `blank`, `outline`, `circle` (art key only; the object is RV's); rule `guildHand` with `preview` (fates, outlines due); foes `surveyor`, `eraser`, `tracer` and their AIs; the stand-in heart script; `offersFor` (P14); events `inked`, `rubbedOut`, `undrawn`, `drawnIn`, `circled`, `struck`.
- Lines: `erase:pencil`, `erase:outline`, `draw:blank`, `swap:pencil` (if the audit finds it fires), `quicksilver:undraw`; each with a firing scenario.
- `RivalDef` `registrar` and `RivalPageDef` (after RV-14); the Registrar's footnote note as an FN variant entry.
- The door predicate SM reads: `city.hearts.includes('cartographers')`.
- For RC: Swap, Draw and Erase offered (guaranteed in order) in rooms 1–3, bankable by returning home.

**Consumes**
- **FD-3** arrival pipeline (Surveyor swap, pushes onto blank, Draw onto units); **FD-7** relocation event shape; **FD-9** `grantBindEvent(p, 'dies')`.
- **HC-2/HC-3** `P`, `checkRoom`, sizes 5–7 × 6–9, party 1–3; **HC-5** thresholds by the slots.
- **DK-1/DK-18** module layout and template; **DK-3** `late` slot and preview shapes; **DK-4** pieces with rune-action triggers (request 1); **DK-5a** `ret: until`, choices, checkpoint, `startTrip(at: 'checkpoint')`; **DK-5b** `offersFor`; **DK-6** `removeFromRoom(…, 'erased')` and void pieces (request 2); **DK-7** offer kinds (`bindEvent`, request 3); **DK-8** `pages` with a set filter (request 4); **DK-9** stand-in script with a round-end step and an object (request 5); **DK-13/14/15/16** board art, Bench/Lab registry, threshold data, map.
- **RV-11–14** trick hooks (per-round mark, round-end, objects) and goals; **RV-15–20** page banking, `pagesHeld`, Codex page, Bench trial, rival note.
- **FN-1/FN-8** and the §6 template.

## 5. Tasks

| ID | Goal | Owned area | Role | Size | Depends on | Acceptance |
|---|---|---|---|---|---|---|
| **Wave 0: contracts** | | | | | | |
| CG-W0 | District module skeleton from DK-18's template: data, engine and UI files with index lines; piece, rule, foe, event and config types; loot table ids; stub hearing and threshold | `src/data/districts/cartographers.ts`, `src/engine/districts/cartographers.ts`, `src/ui/districts/cartographers/` | Strong | S | DK-17, DK-18 | `pnpm check` green; the district still `gate: 'drawing'`; handoff lists invariants (P1–P3) |
| **Wave 1: the board rule and its foes** | | | | | | |
| CG-1 | Paper pieces (P1, P2): `{pencil}`, `{blank}`, fixed-fate tokens, void semantics (push/slide/pull/swap onto blank erases; walking and AI paths avoid it), Draw onto blank fails | engine module, data | Strong | M | CG-W0, DK-4, DK-6, FD-3 | Notation round-trips; scenarios: shove onto blank erases a member (1 HP back on a win), a minion is gone, an elite takes damage and loses its action; arrival matrix rows added |
| CG-2 | The guild's hand (P3, P4): resolve, ink outlines, plan next round from the seeded stream, strand guard, `redraw`, preview of next round's fates | engine module (`guildHand`) | Strong | M | CG-1, DK-3 | Same seed gives the same plan; preview equals the next round end in a property test; a scenario erases a unit on a rub-due tile |
| CG-3 | Board runes on paper (P5): Erase un-draws pencil and outlines, inked tiles immune, Quicksilver mirrored un-draw, Graphite unchanged; new lines registered | engine module via DK-4 triggers, `src/data/lines.ts` rows | Medium | M | CG-1, DK-4 | One scenario per new line; Graphite after an un-draw leaves it blank; Redraft still names on pencil |
| CG-4 | Drawn-in reinforcements (P6) | engine module, data | Medium | S | CG-2 | Scenarios: outline inks at its round, a standing unit delays it, Erase un-draws it |
| CG-5 | Surveyor and Eraser (P7, P8): data, telegraphed intents, routines | engine module, `src/data/districts/cartographers.ts` (foes) | Strong | M | CG-2, FD-3 | Scenarios: out-of-range swap fails, held unit refuses, swap onto rub-due pencil then erased; Eraser rubs a jar, un-draws pencil under an apprentice who stayed |
| CG-6 | Tracer (P9): tether, mirrored walk, delayed mirrored strikes | same | Medium | S | CG-5 | Scenario: strikes land on the mirrors of last turn's damaged tiles; no strike after a turn with no damage |
| CG-7 | Stand-in Registrar (P10, P12): circles with holders, round-end strike, scripted cycle, heart | engine module, data | Strong | M | CG-2, DK-9 | Scenarios: each of the four counters lifts a circle; clearing it marks the heart, `pagesHeld` unchanged |
| **Wave 2: trip, rooms, gate, screens (parallel)** | | | | | | |
| CG-8 | Trip shape and loot (P13–P15): `ret`, checkpoint, doorway choice and warning copy, six loot tables, the soft guarantee, `bindEvent` offer | data, `offersFor` in the engine module | Medium | M | CG-W0, DK-5a, DK-5b, DK-7, FD-9 | Fuzz: never return after the doorway, checkpoint recorded on win and wipe, a wipe in room 5 restarts at the doorway; each treasure reachable from rooms 1–3; *dies* granted on banking |
| CG-9 | Rooms 1–3: three layouts each, pencil configs, Surveyor/Eraser/Tracer mixes, academy names | data | Medium | M | CG-5, CG-6, CG-4, HC-2 | `checkRoom` green; bot sweep at party sizes 1–3 within the canals' band |
| CG-10 | Rooms 4–5 and the heart room (three layouts each), `redraw`, outlines, the back hall | data | Medium | M | CG-9, CG-7 | Same as CG-9; the heart room is a return point |
| CG-11 | Redraft threshold (P16) through DK-15 | data, threshold copy | Medium | S | CG-2, DK-15, HC-5 | Scripted solve from every `P` with each available kit alone; Retry replays the same fates |
| CG-12 | Board art and playback: pencil, blank, fate marks, outlines, circles with holder lines, Tracer tether, foe tokens, event animations, "Next round" overlay entries | `src/ui/districts/cartographers/` | Medium | M | CG-2…CG-7, DK-13 | Phone check 375×812 on a 7×9 room with all marks; light and dark; autofixer clean |
| CG-13 | Bench and Lab parity: palette entries with `met` keys (pencil with a chosen fate, blank, outline, the three hands; the Registrar never on the Bench), Lab scenarios `cg-pencil`, `cg-hands`, `cg-registrar` | registry entries in the district module, `src/data/scenarios.ts` lines | Fast | S | CG-1…CG-7, DK-14 | Bench offers pencil after it is met and not before; scenarios open from `#/lab?scenario=` |
| CG-14 | Hearing, map and lore (P17, P18): `pages` hearing and the owner's line, map lean/solved art, codex entries, the door line on the heart clear; flip `gate` to the threshold | data, codex lines, map entry | Fast | S | CG-8, DK-8, DK-16, RV-15 | Hearing test meets at five pages and misses at four or with the Registrar's; dev "open all" shows the hall; SM's gate test reads the heart |
| **CG-G1** | **Playtest gate** (Lab and dev hall, phone): pencil readability, erasure fairness, hand numbers, the threshold, the free-then-doorway rhythm | n/a | Player | S | CG-8…CG-13 | Findings logged; configs and numbers retuned before Wave 3 |
| **Wave 3: the Registrar as a rival** | | | | | | |
| CG-15 | Registrar `RivalDef` (P11): spells, routine, *strike from the register* via the per-round mark and round-end hooks, circles as erasable objects; his page (recovered spell, annotation, story, trial scene); replace the stand-in in data | `src/data/rivals/registrar.ts`, trick in the engine module | Strong | M | CG-G1, CG-7, RV-14, RV-15 | Scenarios: locked aims, starved Erase with fallback, each circle counter; the page banks on the win |
| **CG-G2** | **Playtest gate**: the Registrar fight from the doorway | n/a | Player | S | CG-15 | Sign-off or changes fed back into CG-15 |
| **Wave 4: footnote batch** (FN §6) | | | | | | |
| CG-F1 | Audit Swap, Draw, Erase, Quicksilver, Graphite against pencil, blank and outlines; add missing lines with firing scenarios | `src/data/lines.ts`, engine module | Strong | S | CG-3, FN-1 | No row without a firing case |
| CG-F2 | Author `docs/design/footnotes-content/cartographers.md`: two margin lines × level I/II pairs and a capstone pair per rune, one line and a capstone pair per solvent, the Registrar's note (default on Erase) | that file | Strong | M | CG-F1, CG-15 | Every pair two reasonable opinions; all four combinations read |
| **CG-G3** | **Player review gate** (design-round) | doc | orchestrator | S | CG-F2 | Approved text |
| CG-F3 | Build the Swap, Draw and Erase batch | `src/data/footnotes/cartographers.ts`, engine module hooks | Medium | M | CG-G3, FN-1 | `fourCombos` per margin line, one scenario per capstone |
| CG-F4 | Build Quicksilver, Graphite and the Registrar's note | same | Medium | M | CG-F3, FN-8, RV-20 | As CG-F3; note hidden until his page is held |
| **Wave 5: proof** | | | | | | |
| CG-16 | Verification sweep: full-hall bot trips from room 1 and from the doorway, invariants, phone screenshots, verification file, DESIGN/TECH/ROADMAP notes for the orchestrator | `tests/sim/`, `docs/plans/cartographers-verification.md` | Medium | M | all above | §6 passes |
| **CG-G4** | **Playtest gate**: a campaign run to the Registrar and the door line | n/a | Player | S | CG-16 | Feedback recorded |

## 6. Verification

- **Scenario tests** (`scenario` skill): every P-rule above (erasure by rub, push onto blank, Erase on pencil, outline and inked tile, Quicksilver un-draw, Graphite after an un-draw, outline blocking, each hand's telegraph and failure cases, each circle counter), every new line, the threshold from every start point.
- **Property/fuzz** (`tests/sim`): the plan preview equals the round end; seeded determinism after save/load; random hall trips over 200 seeds at party sizes 1–3: no throw, the 500-event cap respected in the round-end phase, never stranded (P4), no return after the doorway, checkpoint kept on wipe, one Bind page granted once.
- **Phone checks** (375×812, `verify`): a pencilled 7×9 room with fates, outlines and a Surveyor telegraph; the Registrar's circles with holder lines; the doorway Crossroads warning; Set Out with the doorway option; the threshold; the codex lore and the Registrar's page; the Bench palette with pencil; the map with the hall. Autofixer on every changed component.

## 7. Open questions for the player

1. **Erase as a kill:** Erase on pencil under a foe erases it (a minion is gone, an elite takes damage and loses its action). Default yes (P5); it makes Erase a strong school rune in its own hall. Too strong?
2. **"Kill the marker":** is the circle held by the nearest guild hand (P10, default) or only by the Registrar himself?
3. **Draw on bare pencil:** should Draw move the pencil itself (rewriting the plan by a tile), or only what stands on it? Default: only what stands on it, as the design table says.

## 8. Execution notes

- **Critical path:** CG-W0 → CG-1 → CG-2 → CG-5 → CG-7 → CG-9 → CG-10 → CG-G1 → CG-15 → CG-G2 → CG-16. CG-3, CG-4, CG-6 run beside CG-5; CG-8, CG-11, CG-12, CG-13 beside the rooms; the footnote wave can start its audit after CG-3.
- **Start** after DK-18 and FD-3; Wave 3 waits for RV-14/15, so Waves 0–2 ship a playable hall with the stand-in.
- **Requests to DK:** (1) DK-4 rune-action triggers on pieces (`onErase`, `onDraw`, target widening sees pieces) so CG never edits `runes/actions.ts`; (2) DK-6 void-piece semantics (a push onto it removes the unit with a cause; BR's gaps want the same) and a stated `out` vs Graphite/`isAlive` rule; (3) DK-7 a shared `bindEvent` offer kind (BR's *pushed*); (4) DK-8 `pages` with an `of` set; (5) DK-9 stand-ins that own a round-end step and an erasable object; (6) DK-5b `offersFor` able to set a per-room guaranteed offer.
- **Requests to RV:** trick objects may declare `erasable` (Erase removes them) and a holder unit whose death lifts them; RV-14's "strike from the register" fixture should follow P10; `pagesHeld` must distinguish the Registrar's page from the five.
- **Requests to SM:** the sealed door gate reads `city.hearts.includes('cartographers')` and shows CG's door line; no Cartographers floor in the lower Seam.
- **Requests to RC:** the exile's precondition reads Swap, Draw and Erase known (plus a proven invention), checked on return home; CG guarantees the three pages are offered in rooms 1–3.
- **Size:** 21 tasks plus 4 gates: 7 S, 14 M; about one L-plan, Strong-heavy in Wave 1.
