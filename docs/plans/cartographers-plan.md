# The Cartographers' hall: implementation plan

> Design: [district-cartographers.md](../design/district-cartographers.md) (rev. 2026-10-23), [rune-design-final.md](../design/rune-design-final.md) §5.2, §6.2–6.3, §11, [party.md](../design/party.md) §2 (door arrival B), [district-seam.md](../design/district-seam.md) (the sealed door), [rivals.md](../design/rivals.md). Roadmap: **BL-117**. Prefix **CG**. Brief: [build-program.md](build-program.md).
> **State: Building (CG-W0 merged; briefs for Packs A–I in build-program-briefs.md, 2026-11-12e).** Order: [midpoint-audit.md](midpoint-audit.md) §2.2 Track C; starts when BF-12 merges or a slot is free.
> Scope: the last district: pencil and ink, drawn-in reinforcements, the guild's hands, free-then-no-return with the doorway checkpoint, the Registrar (a real rival through RV's API from the start), the five-page hearing, the redraft threshold, the academy's lore, its footnote batch, Bench parity and the trigger for the owner's sealed door.

## 1. Scope and settled rules

**Delivers**
- **Pencil and ink** (design §0 "Board rule", §1 "Pencil"): pencilled tiles that the guild's hand inks (permanent) or rubs out (the tile vanishes) at round end, with next round's plan visible; Erase un-draws pencil, Draw and Swap move what stands on it; a unit on a rubbed-out tile is **erased from the fight** through DK's out-of-the-room state.
- **Drawn-in reinforcements:** foes arrive as pencil outlines one round before they ink in; Erase un-draws them.
- **The guild's hands:** Surveyor, Eraser, Tracer (design §0 "Foes").
- **Trip shape:** six encounters (five rooms and the Registrar); free return after rooms 1–3; the guaranteed quiet doorway after room 3 is the point of no return; the hall remembers the doorway as a checkpoint; a wipe on the final run sends you back to it (design §0 "Trip shape", "A wipe").
- **Treasures:** Swap, Draw, Erase, the Bind *dies* event page, Quicksilver and Graphite in rooms 1–3; ordinary deep loot in 4–6.
- **The Registrar** with *strike from the register*, built as a real rival through RV-11–14 with his recovered page through RV-15–20 (no stand-in; audit §2.1).
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
| P12 | **Redefines (audit §2.1): no stand-in.** The Registrar is a real rival from CG-7 (the old stand-in CG-7 and rival CG-15 are one task under the ID CG-7; the CG-15 row is gone). RV-14 and RV-15 are merged, and the bridges' stand-in cost a duplicate mechanism that BR-20 now deletes | Design §1 "Rival dependency" assumed RV would be late |
| P13 | **Trip data:** `ret: { kind: 'until', after: 3 }`, `checkpoint: { after: 3, name: 'the quiet doorway' }`; the Crossroads after room 3 offers *Return home* and *Through the doorway* (a DK-5a choice that applies today's doorway rewiring, then room 4). The doorway choice warns that what you carry is lost if you fall. Set Out offers *the doorway* (default once reached, DK P5) or *room 1* | Exactly design §0 through DK's data shape |
| P14 | **Redefines (light): rooms 1–3 each guarantee one unowned Board treasure** through `offersFor`, in the order Erase, Draw, Swap, then the *dies* page, Quicksilver, Graphite; the other offers roll as usual. The design says these come in "ordinary offers" | Six treasures across three rooms of three picks could take many trips by luck alone, and the exile and the Registrar both need the three pages; the Seam tables already guarantee Conduct this way |
| P15 | **The Bind *dies* page is an offer kind `bindEvent`** banked through FD-9's grant helper. Requested from DK as shared (BR's *pushed* page is the same thing); if DK declines, CG registers it in its module and BR reuses it | One mechanism for both Bind event pages |
| P16 | **Redraft threshold, "the drafting table":** a 6×7 board of pencil over blank, no enemies, fixed fates shown a round ahead; goal: reach the inked far bench within 4 rounds. Movement alone solves it from every `P` (any build, any of the nine kits); a second layout adds a lay-figure on rub-due pencil that a Shove, Pull or Swap can save for the same goal | Design: solvable with any build, teaches reading the pencil |
| P17 | **Lore as codex entries** unlocked by play: *the registry* (reaching room 2), *the owner's desk* (room 5's back hall), *the struck name* (the Registrar's fall), *the bad join* (the hall cleared: the design §2 threads in one page). Rooms carry academy names (lecture theatre, drafting benches, registry, back hall) | Physical lore (design §0 "Place") without a new screen |
| P18 | **The door trigger is the cleared heart:** `city.hearts` gains `cartographers` on the win (as every rival heart); CG shows one line ("Below the Seam, a lock turns.") and SM's gate reads the heart. CG adds no floor and no `IntrusionSpec` | SM owns the door; one clean predicate |

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
- `src/engine/districts/cartographers.ts`: pieces `pencil`, `blank`, `outline`, `circle` (art key only; the object is RV's); rule `guildHand` with `preview` (fates, outlines due); foes `surveyor`, `eraser`, `tracer` and their AIs; `offersFor` (P14); events `inked`, `rubbedOut`, `undrawn`, `drawnIn`, `circled`, `struck`.
- Lines: `erase:pencil`, `erase:outline`, `draw:blank`, `swap:pencil` (if the audit finds it fires), `quicksilver:undraw`; each with a firing scenario.
- `RivalDef` `registrar` and `RivalPageDef` (after RV-14); the Registrar's footnote note as an FN variant entry.
- The door predicate SM reads: `city.hearts.includes('cartographers')`.
- For RC: Swap, Draw and Erase offered (guaranteed in order) in rooms 1–3, bankable by returning home.

**Consumes**
- **FD-3** arrival pipeline (Surveyor swap, pushes onto blank, Draw onto units); **FD-7** relocation event shape; **FD-9** `grantBindEvent(p, 'dies')`.
- **HC-2/HC-3** `P`, `checkRoom`, sizes 5–7 × 6–9, party 1–3; **HC-5** thresholds by the slots.
- **DK-1/DK-18** module layout and template; **DK-3** `late` slot and preview shapes; **DK-4** pieces with rune-action triggers (request 1); **DK-5a** `ret: until`, choices, checkpoint, `startTrip(at: 'checkpoint')`; **DK-5b** `offersFor`; **DK-6** `removeFromRoom(…, 'erased')` and void pieces (request 2); **DK-7** offer kinds (`bindEvent`, request 3); **DK-8** `pages` with a set filter (request 4); **DK-13/14/15/16** board art, Bench/Lab registry, threshold data, map.
- **RV-11–14** trick hooks (per-round mark, round-end, objects) and goals; **RV-15–20** page banking, `pagesHeld`, Codex page, Bench trial, rival note.
- **FN-1/FN-8** and the §6 template.

- **KIT-R2** (audit §2.2) `DistrictUi` slots `unitArt`, `fx`, `boardLayers`, `describe`, highlights: CG-12 fills them and edits no board component.

**Leaves for later tasks** (becomes the status file's Owed list)
- CG-W0 declares piece, rule, foe, event and config types as stubs. Piece behaviour is CG-1 (`pencil`, `blank`) and CG-4 (`outline`); `guildHand` and its `preview` are CG-2; the `onErase`/`onDraw` triggers and the new lines (`erase:pencil`, `erase:outline`, `draw:blank`, `quicksilver:undraw`) are CG-3, and `swap:pencil` is CG-F1 if the audit finds it fires.
- Foe data and AIs: Surveyor and Eraser CG-5, Tracer CG-6; the Registrar's `RivalDef`, page, trick and `circle` object CG-7.
- `ret`, `checkpoint`, the doorway choice, `offersFor`, the `bindEvent` offer and the `cartographers:*` loot tables: CG-8. The threshold: CG-11. Room lists: CG-9 (rooms 1–3) and CG-10 (rooms 4–5, heart room).
- Bench palette entries with `met` keys and the Lab scenarios: CG-13. The `pages` hearing, map art, codex lore, door line and `gate` flip: CG-14. Board art through the KIT-R2 slots: CG-12.
- Footnote lines and variants: CG-F1–F4. For other plans: SM's gate reads `city.hearts`; RC's exile reads the three pages; EN-K7 composes the pieces and the Registrar's frame.

## 5. Packs

Roles are model tiers. Engine packs run their own test paths with `--reporter=dot` plus `tsc --noEmit`; UI packs run the full typecheck and the autofixer. Gates are not agent work and sit under the pack whose output they judge. Tuning (hand numbers, pencil share, room difficulty) is not in this plan: it goes to the CAL plan on the shared bot.

### Pack 0: Contracts (role: Strong; engine; depends on: none)
Owns: `src/engine/districts/cartographers.ts` and `cartographers/`, `src/data/districts/cartographers.ts` and `cartographers/`, `src/ui/districts/cartographers/`, `tests/districts/cartographers/acceptance.test.ts`
Pattern: `src/engine/districts/bathhouses.ts` and `bathhouses/`, `tests/districts/bh0-contracts.test.ts`, `src/engine/districts/foundry/pieces.ts`

| ID | Goal | Size | Done when |
|---|---|---|---|
| CG-W0 | District module skeleton: data, engine and UI files with index lines; piece, rule, foe, event and config types; `cartographers:*` loot table ids; stub hearing and threshold; the acceptance file with every `"<ID>: <rule>"` title named in the rows below as `it.fails` or `it.todo` | M | `pnpm check:fast` green; the district is still `gate: 'drawing'`; no behaviour change; every title below exists in the acceptance file; the handoff lists invariants P1–P3 |

### Pack A: Paper and the guild's hand (role: Strong; engine; depends on: Pack 0)
Owns: `src/engine/districts/cartographers/{pieces,guildHand}.ts`, `tests/districts/cartographers/{paper,guildHand}.test.ts`, arrival-matrix rows
Pattern: `src/engine/districts/foundry/pieces.ts`; `bathhouses/boilOver.ts` for a `late`-slot rule

| ID | Goal | Size | Done when |
|---|---|---|---|
| CG-1 | Paper pieces (P1, P2): `{pencil}`, `{blank}`, fixed-fate tokens, void semantics (push, slide, pull or swap onto blank erases; walking and AI paths avoid it); Draw onto blank fails | M | tests `CG-1: notation round-trips pencil, blank and fixed fates`, `CG-1: shove onto blank erases a member and gives 1 HP back on a win`, `CG-1: a minion pushed onto blank is gone`, `CG-1: an elite pushed onto blank takes the drop damage and loses its action`, `CG-1: draw onto blank fails with draw:blank`, `CG-1: walking and foe paths avoid blank` pass; arrival matrix rows added |
| CG-2 | The guild's hand (P3, P4): resolve due pencil, ink outlines, plan next round from the seeded stream, strand guard, `redraw`, preview of next round's fates | M | tests `CG-2: same seed gives the same plan`, `CG-2: preview equals the next round end`, `CG-2: a unit on a rub-due tile is erased at round end`, `CG-2: the strand guard never leaves a member without a standable neighbour` pass |

### Pack B: Runes on paper and outlines (role: Default; engine; depends on: Pack A)
Owns: `src/engine/districts/cartographers/paper.ts`, the CG block of `src/data/lines.ts`, `tests/districts/cartographers/{runes,outline}.test.ts`
Pattern: `src/engine/districts/bathhouses/dissolved.ts` for trigger wiring; the `scenario` skill for line scenarios

| ID | Goal | Size | Done when |
|---|---|---|---|
| CG-3 | Board runes on paper (P5) through DK-4 triggers: Erase un-draws pencil and outlines, inked tiles immune, Quicksilver mirrored un-draw, Graphite unchanged; new lines registered | M | tests `CG-3: erase on pencil under a foe erases it`, `CG-3: erase on an outline un-draws the foe`, `CG-3: inked paper cannot be erased`, `CG-3: quicksilver un-draws the mirrored pencil`, `CG-3: graphite after an un-draw leaves it blank`, `CG-3: redraft still names on pencil` and one firing scenario per new line pass |
| CG-4 | Drawn-in reinforcements (P6): outlines ink at their due round | S | tests `CG-4: an outline inks at its due round`, `CG-4: a standing unit delays the inking a round`, `CG-4: erase un-draws an outline foe` pass |

### Pack C: The guild's hands (role: Strong; engine; depends on: Pack A)
Owns: `src/engine/districts/cartographers/foes.ts`, `src/data/districts/cartographers/foes.ts`, `tests/districts/cartographers/hands.test.ts`
Pattern: `src/engine/districts/bathhouses/foes.ts`, `src/data/districts/bathhouses/`

| ID | Goal | Size | Done when |
|---|---|---|---|
| CG-5 | Surveyor and Eraser (P7, P8): data, telegraphed intents, routines | M | tests `CG-5: a swap out of range fails`, `CG-5: a held unit refuses the surveyor's swap`, `CG-5: swap onto rub-due pencil then erased`, `CG-5: the eraser rubs a jar`, `CG-5: the eraser un-draws pencil under an apprentice who stayed` pass |
| CG-6 | Tracer (P9): tether, mirrored walk, delayed mirrored strikes | S | tests `CG-6: strikes land on the mirrors of last turn's damaged tiles`, `CG-6: no strike after a turn with no damage` pass |

### Pack D: The Registrar (role: Strong; engine; depends on: Packs A and C; RV-14, RV-15)
Owns: `src/data/rivals/registrar.ts`, `src/data/rivals/index.ts` (one line), `src/engine/districts/cartographers/registrar.ts`, `tests/rivals/registrar.test.ts`
Pattern: `src/data/rivals/bathSteward.ts`, `tests/rivals/bathSteward.test.ts`; TECH §3 "Authoring a rival"

| ID | Goal | Size | Done when |
|---|---|---|---|
| CG-7 | The Registrar as a real rival (P10–P12; old CG-7 and CG-15 merged, the CG-15 row is gone): `RivalDef`, spells, routine, *strike from the register* through the per-round mark and round-end hooks, circles as erasable objects with holders, his page (recovered spell, annotation, story, trial scene), the heart | L | tests `CG-7: aims are locked at the telegraph`, `CG-7: starved Erase falls back to the swap`, `CG-7: Erase on the tile lifts a circle`, `CG-7: moving off lifts a circle`, `CG-7: killing the holder lifts a circle`, `CG-7: with no hand left the Registrar holds the circle`, `CG-7: a unit still circled at round end is erased`, `CG-7: the page banks on a win and is kept on a wipe`, `CG-7: clearing the heart adds cartographers to city.hearts` pass; no stand-in exists |
| **CG-G2** | **Playtest gate** (player, Lab fight from the doorway): the Registrar fight | | Sign-off or follow-ups filed; never blocks the build |

### Pack E: Trip shape, loot and threshold (role: Default; engine; depends on: Pack 0, Pack A)
Owns: `src/engine/districts/cartographers/trip.ts`, `src/data/districts/cartographers.ts` (trip and loot fields), `src/data/districts/cartographers/threshold.ts`, `tests/districts/cartographers/{trip,threshold}.test.ts`
Pattern: `src/engine/districts/bathhouses/trip.ts`; the bridges' threshold data for DK-15

| ID | Goal | Size | Done when |
|---|---|---|---|
| CG-8 | Trip shape and loot (P13–P15): `ret`, checkpoint, doorway choice and warning copy, six loot tables, the soft guarantee, the `bindEvent` offer | M | tests `CG-8: no return after the doorway`, `CG-8: the checkpoint is recorded on a win and a wipe`, `CG-8: a wipe in room 5 restarts at the doorway`, `CG-8: each treasure is reachable from rooms 1-3`, `CG-8: dies is granted once on banking` pass (the first three as fuzz over trip seeds: no throw) |
| CG-11 | Redraft threshold (P16) through DK-15: the drafting table and its lay-figure layout | S | tests `CG-11: a scripted solve exists from every P with each available kit alone`, `CG-11: retry replays the same fates` pass |

### Pack F: Rooms (role: Default; engine (data); depends on: Packs B, C, D, E)
Owns: `src/data/districts/cartographers/rooms.ts`, `tests/data/cartographers-rooms.test.ts`
Pattern: the bathhouses' room data and `tests/data/canal-rooms.test.ts`

| ID | Goal | Size | Done when |
|---|---|---|---|
| CG-9 | Rooms 1–3: three layouts each, pencil configs, Surveyor/Eraser/Tracer mixes, academy names | M | tests `CG-9: checkRoom passes for every room 1-3 layout at party sizes 1-3`, `CG-9: a scripted solve exists for every room 1-3 layout` pass |
| CG-10 | Rooms 4–5 and the heart room (three layouts each), `redraw`, outlines, the back hall; the heart room is a return point | M | tests `CG-10: checkRoom passes for every room 4-5 and heart layout`, `CG-10: a scripted solve exists for every deep layout`, `CG-10: the heart room is a return point` pass |

### Pack G: Hearing, Bench and hall fuzz (role: Default; engine; depends on: Packs D, E, F; BR-20, BF-9)
Owns: `src/engine/districts/cartographers/bench.ts`, `src/data/districts/cartographers/lore.ts`, `src/data/districts.ts` (the hearing line), `src/data/scenarios.ts` (CG lines), `tests/sim/cartographers-hall.test.ts`, `tests/districts/cartographers/{bench,hearing}.test.ts`
Pattern: `src/engine/districts/bridges/guarantee.ts` for Bench entries; `tests/sim/ink-trip.test.ts` for a trip fuzz

| ID | Goal | Size | Done when |
|---|---|---|---|
| CG-13 | Bench and Lab parity: palette entries with `met` keys (pencil with a chosen fate, blank, outline, the three hands; the Registrar never on the Bench) and Lab scenarios `cg-pencil`, `cg-hands`, `cg-registrar` | S | tests `CG-13: the bench offers pencil after it is met and not before`, `CG-13: the registrar is never on the bench`, `CG-13: each cg scenario opens from #/lab?scenario=` pass |
| CG-14 | Hearing, map and lore (P17, P18): `pages` hearing, the owner's line, map lean/solved art, codex entries, the door line on the heart clear; flip `gate` to the threshold | S | tests `CG-14: the hearing meets at five pages`, `CG-14: the hearing misses at four pages or with the Registrar's`, `CG-14: SM's gate reads cartographers in city.hearts` pass; dev "open all" shows the hall |
| CG-16 | Hall fuzz (§6 property tests); the verification notes fold into Close | M | `tests/sim/cartographers-hall.test.ts` passes: 200 seeds at party sizes 1–3 from room 1 and from the doorway, no throw, no event-cap overrun in the round-end phase, never stranded, no return after the doorway, checkpoint kept on a wipe, one Bind page granted once; plan preview equals round end; seeded determinism after save and load |

### Pack H: Board art and playback (role: Default; UI; depends on: Packs A–D; KIT-R2, DK-13)
Owns: `src/ui/districts/cartographers/`, the Gallery fixture for the hall
Pattern: `src/ui/districts/bathhouses/` (registry slots, `foes/`), `src/ui/screens/galleryFixtures.ts`

| ID | Goal | Size | Done when |
|---|---|---|---|
| CG-12 | Board art through the KIT-R2 slots: pencil, blank, fate marks, outlines, circles with holder lines, Tracer tether, foe tokens, event animations, "Next round" overlay entries; the readability pass folds in here (a Gallery sheet and the greyscale check, the BF-1 method) | L | Gallery sheet in light and dark with every piece, mark and foe legible in greyscale; Combat at 375×812 on a 7×9 room showing fates, an outline, a Surveyor telegraph and the Registrar's circles with holder lines, light and dark; no board component edited; autofixer clean |
| **CG-G1** | **Playtest gate** (player, Lab and dev hall, phone, after Packs G and H): pencil readability, erasure fairness, the threshold, the free-then-doorway rhythm | | Findings logged; numbers go to CAL; never blocks the build |

### Pack I: Footnote draft (role: Default; engine; depends on: Pack B; FN-1)
Owns: the CG block of `src/data/lines.ts`, `docs/plans/footnotes-audit.md` (a new section), `docs/design/footnotes-content/cartographers.md`
Pattern: `docs/design/footnotes-content/bathhouses.md`; footnotes-plan.md §6

| ID | Goal | Size | Done when |
|---|---|---|---|
| CG-F1 | Audit Swap, Draw, Erase, Quicksilver, Graphite against pencil, blank and outlines; add missing lines with firing scenarios | S | tests `CG-F1: every cartographers line row has a firing scenario` pass |
| CG-F2 | Author the batch: two margin lines × level I/II pairs and a capstone pair per rune, one line and a capstone pair per solvent, the Registrar's note (default on Erase) | M | the file exists; every pair is two reasonable opinions; all four combinations read |
| **CG-G3** | **Orchestrator review gate** (the player delegated footnote variant choice, 2026-10-23): the orchestrator approves the text before Pack J | | Approved text committed |

### Pack J: Footnote build (role: Default; engine; depends on: Pack I approved, Pack D; FN-8, RV-20)
Owns: `src/data/footnotes/cartographers.ts`, `src/data/footnotes/index.ts` (one line), `tests/scenarios/footnotes-cartographers*.test.ts`
Pattern: `src/data/footnotes/bathhouses.ts`

| ID | Goal | Size | Done when |
|---|---|---|---|
| CG-F3 | Build the Swap, Draw and Erase batch | M | tests `CG-F3: fourCombos reads for every margin line` and `CG-F3: one scenario per capstone` pass |
| CG-F4 | Build Quicksilver, Graphite and the Registrar's note | M | tests `CG-F4: fourCombos reads for every margin line`, `CG-F4: one scenario per capstone`, `CG-F4: the registrar's note is hidden until his page is held` pass |

### Close (role: orchestrator; depends on: all packs)

| ID | Goal | Size | Done when |
|---|---|---|---|
| Close | Full `pnpm check`; full-loop phone check (§6 list); `code-review` of the district; DESIGN §11 and TECH §7 rows; `cartographers-verification.md` (CG-16's notes folded in); ledger clean | S | Gate green; screenshots reported; ledger open list empty |
| **CG-G4** | **Playtest gate** (player): a campaign run to the Registrar and the door line | | Feedback recorded; never blocks |

## 6. Verification

- **Scenario tests** (`scenario` skill): every P-rule (erasure by rub, push onto blank, Erase on pencil, outline and inked tile, Quicksilver un-draw, Graphite after an un-draw, outline blocking, each hand's telegraph and failure cases, each circle counter), every new line, the threshold from every start point. They are the acceptance titles above.
- **Property/fuzz** (`tests/sim`, CG-16): the plan preview equals the round end; seeded determinism after save/load; random hall trips: no throw, no cap overrun, never stranded, the doorway and checkpoint rules, one Bind page.
- **Per wave, by the orchestrator:** one phone screenshot per UI state named in the rows. **At Close:** a pencilled 7×9 room, the Registrar's circles, the doorway Crossroads warning, Set Out with the doorway option, the threshold, codex lore and the Registrar's page, the Bench palette with pencil, the map with the hall; light and dark; autofixer on every changed component.
- No win-rate bands: room difficulty is checked by `checkRoom` and a scripted solve; its tuning belongs to the CAL plan.

## 7. Open questions for the player

1. **Erase as a kill:** Erase on pencil under a foe erases it (a minion is gone, an elite takes damage and loses its action). Default yes (P5); it makes Erase a strong school rune in its own hall. Too strong?
2. **"Kill the marker":** is the circle held by the nearest guild hand (P10, default) or only by the Registrar himself?
3. **Draw on bare pencil:** should Draw move the pencil itself (rewriting the plan by a tile), or only what stands on it? Default: only what stands on it, as the design table says.

## 8. Execution notes

- **Critical path** (audit §2.2 Track C): Pack 0 → A → B and C in parallel → D → E → F → G → H → I → J → Close. Pack E needs only Packs 0 and A, so it may start beside B and C; B and C own disjoint files. Pack G waits for BR-20 and BF-9 (five real masters for the hearing); Pack H waits for KIT-R2. Packs I and J share `src/data/lines.ts` with Pack B, so they never run beside it.
- **Start** when BF-12 merges or a slot is free. RV-14 and RV-15 are merged, so the hall is a real-rival hall from CG-7; nothing ships with a stand-in.
- **Requests to DK:** (1) DK-4 rune-action triggers on pieces (`onErase`, `onDraw`, target widening sees pieces) so CG never edits `runes/actions.ts`; (2) DK-6 void-piece semantics (a push onto it removes the unit with a cause; BR's gaps want the same) and a stated `out` vs Graphite/`isAlive` rule; (3) DK-7 a shared `bindEvent` offer kind (BR's *pushed*); (4) DK-8 `pages` with an `of` set; (5) DK-5b `offersFor` able to set a per-room guaranteed offer.
- **Requests to RV:** trick objects may declare `erasable` (Erase removes them) and a holder unit whose death lifts them; `pagesHeld` must distinguish the Registrar's page from the five.
- **Requests to SM:** the sealed door gate reads `city.hearts.includes('cartographers')` and shows CG's door line; no Cartographers floor in the lower Seam. **To RC:** the exile's precondition reads Swap, Draw and Erase known, checked on return home.
- **Size:** 20 tasks (CG-15 merged into CG-7) plus 4 gates in 10 packs and Close: 6 S, 12 M, 2 L; about one L-plan, Strong-heavy in Packs A, C and D.
