# The ending: implementation plan (EN)

> Design: [ending.md](../design/ending.md) (all), [district-cartographers.md](../design/district-cartographers.md) §0 ("The ending") and §2, [district-seam.md](../design/district-seam.md) (the sealed door), [party.md](../design/party.md) §1 (habit rules, start points) and §2 (the tenth). Roadmap: **BL-126**. Brief: [build-program.md](build-program.md). Prefix **EN**.
> **State: Building (EN-0 and EN-W0 merged; D2's proposals decided and EN-5 moved before the generator, P22–P25, design window 2026-11-12).** Order: [midpoint-audit.md](midpoint-audit.md) §2.2 Track E and §3 Pack D (EN-0 first). Calibration (the old EN-13) moved to the CAL plan.
> Scope: the handover visit and credits, the owner as the tenth apprentice, the drawing table with its pen, drawn districts on the map, and the **room generator** with its guardrails and bot test, plus drawn hearts and loot.

## 1. Scope and settled rules

**Delivers** (design cited, not copied)
- **The handover** (ending §1.1): a free visit from the Seam's map node once `ownerDoor(p) === 'open'`; a tap-through scene in the owner's hand; the owner joins; the drawing table appears; a blank page is drawn under the Seam with the line *"the rest is mine to draw"*.
- **Credits** (§1.1): household tokens, districts in opening order, named idioms, ledger counts (trips, casts, biggest chain); skippable; replayable from the codex, as is the scene.
- **The owner** (§1.2, party §2): the data entry (O, 5/3, Pull, Seam/Board, `Splash → Steam → Spark`), the **mender** habit with its preview, fine print and scenario tests.
- **The drawing table** (§1.3): three page slots, the seven elements, the pen and element costs, visible compatibility with reasons, weight shown as depth, redraw at home only, drawings saved in the profile.
- **Drawn districts** (§1.4): map nodes below the Seam, open on drawing; trips with rooms **generated fresh each trip** from the trip seed under HC's room rules; the **bot test** with seed redraws and a safe fallback; the heart as a chosen master on a **heart frame**; the drawing's rule and trip shape applied through DK's hooks; loot by depth; ordinary proof, footnote points and fine print.

**Leaves out**: every district's own rules, pieces, foes, masters and trip shapes (their plans; EN composes their registrations); the sealed door's states and art (SM); the trigger that opens it (CG P18); the owner's real name, face and final art (BL-40); exporting drawings as text (ending §2, a follow-up).

**Settled and kept**: no fight at the door; the owner never fills a slot alone and needs no offer or note; habit rules of party §1 (one rule, no damage/ink/cast, previewed, witnessed, tested); a redraw never touches a trip in progress; a wipe loses trip loot; the player never sees a rejected room.

## 2. Proposals

| # | Proposal | Why |
|---|---|---|
| P1 | **One district module `inkedPage`** (appended last to `DISTRICT_IDS`, after SM's `lowerSeam`, so every other salt holds). A trip carries `{ slot, drawing, rooms: string[] }`: a **snapshot** of the drawing at Set out and the accepted layout of each room once generated. Drawn pages never enter `city.heard/open/hearts`. (The id avoids the existing `gate: 'drawing'` word for unbuilt districts) | The snapshot is the "locked while in a trip" rule by construction; stored layouts make reloads cheap and immune to later generator changes |
| P2 | **A drawing is data**: `{ name, rule: RuleId \| null, foes: EnemyId[1..3], pieces: PieceId[≤2], shape: ShapeId \| 'plain', length: 3..6, heart: MasterId }`. `Profile.drawings: [Drawing \| null ×3]`. Names: trimmed, 1–24 characters, escaped like invention names | Small, JSON-safe, parsed with an empty default (DK P18) |
| P3 | **Palette = only what you've met**, derived, never stored: a rule once you have **fought a room under it** (DK-14 `met` key for the rule; a lower-Seam intrusion counts only for its piece, never its district-scoped rule); foes from `foesMet` minus bosses and rivals; pieces from DK-14 `met`; shapes from districts whose trip you started; masters from `city.hearts` (that district's heart foe) plus the Lamplighter once `holdsPage(lamplighter)` | The design's two wordings ("districts you opened" / "a rule you played") agree on "played"; the Lamplighter is a room rival, so his page is the proof of a win |
| P4 | **A rule brings its activating pieces** at no piece cost (the current brings lanes, boil-over vents, collapse spans and piers, sympathetic bells their bells, pencil and ink the pencil tiles). The two piece picks are for *extra* kinds | Otherwise "the current" without lanes would be greyed, and the cheap rule would cost more than the design says |
| P5 | **Compatibility is declared, not inferred.** Every foe kit, piece kit, shape and heart frame lists `needs` (a rule or piece, any-of) with a reason string; `checkDrawing(p, d)` returns every unmet need, and the table greys the element with the sentence (*"The lamp-mother needs water: draw the current or lanes."*). Known needs: eel → water; moth → lamps; lamp-mother → water + lamps; postmaster → writs; Bath-Steward → vents or boil-over; Chief Warden → collapse; Carillonneur → bells; rising heat → boil-over; span choice → collapse; peal → bells; Registrar, Marginalia, Lamplighter → nothing | The Bench's "never hide why" rule, testable as a table |
| P6 | **Redefines: the pen's weights.** As designed (1 per rune page, 1 per footnote level, 2 per heart) the pen at the handover is about **45–70** (25–31 pages, 5–20 levels, 14 from seven hearts) against a 20-point maximum drawing, so it never binds. Default: **1 per heart cleared (7) + 1 per four known rune pages (6–8) + 1 per level-III capstone** (0–5 at the handover, up to dozens later): about 13–20 at the handover, a full drawing needs more mastery, and the long tail is footnotes. Element costs stay as designed. Alternative: keep the pen and triple every cost. the CAL plan calibrates either with real saves | "The pen grows" must mean it starts short; capstones are the mastery that keeps growing after the credits |
| P7 | **Weight and depth**: weight = total cost; **light ≤ 9, medium 10–14, heavy ≥ 15**. Depth sets the foe budget per room (+1 minion-equivalent per band), the loot tier and picks (heavy: two picks before the heart as well as at it) | "Heavier plays harder and pays richer" in one number |
| P8 | **Generator pipeline** (pure, `src/engine/drawing/generate.ts`): size from depth and kit hints (5–7 × 6–9) → **Seam ground** (2–5 tiles of plates, oil or vents so a Seam-basics page always has something to mix) → rule stamp → piece placement by each kit's `place` and `matters` scores → start points (4–5 `P` in one third of the board, standable, fair for a 5 HP body: no foe telegraph reaching them on turn 1) → foes by budget, each at **Manhattan distance ≥ 3 from every `P`**, on reachable tiles, honouring habitat needs → `checkGenerated` | One guardrail function; "two tiles from every start point" read as two clear tiles between, so no move-1 foe bites on turn 1 |
| P9 | **`checkGenerated(layout, spec)`** = HC's `checkRoom` + foe distance + reachability (every `P`, unit and objective tile reachable by walking from some `P`, ignoring units; fliers and anchored foes reachable by a cast line) + each kit's `valid` + rule needs met + caps (blocked tiles ≤ 30 %, foes ≤ budget, no unit starting in a burst or fire) | The design's guardrails as a test oracle the fuzz runs on every seed |
| P10 | **Bot trial**: the generator's bot plays the room with the trip's party and their compiled lattices at **fresh HP and charges** (the room is judged fair, not the trip), seed salt `7000 + 10·room + attempt`; it must **win within 12 rounds (16 at the heart)**. Accept the first pass; at most **4 attempts** (3 at the heart), then the **safe fallback**: the same spec with half the foe budget, no extra pieces and the rule's minimum stamp (salt `7900 + room`), bot-tested once; a heart falls back to its frame's **authored fallback board**. A fallback that still fails is offered anyway and counted (the fuzz holds that count at 0) | Deterministic inputs, a bounded cost, and the player never sees a rejected room |
| P11 | **The bot moves into the engine** first, behaviour-neutral (EN-0, audit §3 Pack D: `src/engine/sim/`, `tests/sim/ink-bot.ts`'s generic trip runner folded in; pure and party-generic; `tests/sim/bot.ts` re-exports it) with a **deterministic operation budget** (applied actions per trial, default 6000; exceeding it = not won), never a wall-clock limit, and a **lite policy** for generation (moves pruned to the 6 tiles nearest a foe). District modules may register bot value terms (a keystone's stone, a bell rung) through DK | The generator runs in the app; a time limit would make rooms differ by phone |
| P12 | **Measured cost and limits.** Today's bot plays the 24 Seam fights of `tests/sim/calibration.test.ts` in 4.25 s on the dev Mac (≈180 ms a fight, two apprentices on 6×8, warm-up included). Its cost is ≈ (moves + 2) × attacks applied actions per apprentice-round, so three apprentices on 7×9 with district foes cost 3–6× more, and an iPhone is 1.5–3× slower: **0.5–3 s per attempt** before the lite policy. Limits: generation runs in a **Web Worker**, prefetching the next room while the loot or Crossroads screen is open (room 1 while the Set out sheet is open); targets on the player's phone **median ≤ 0.5 s, p95 ≤ 2 s per accepted room**; a short "inking the room…" line if the player is faster than the worker | Hides the cost behind screens the player reads anyway; the spike measures the real numbers |
| P13 | **Heart frames** (one per master, EN-owned in `src/engine/drawing/frames/`): size, the master and its fixed escorts, the terrain it needs (lamp-mother's pool and rim lamps, the keystone with piers and spans, the Great Bell with four `{hook}` tiles, the postmaster's counter, the registry floor, a cloud network for the Steward), where the drawing's rule may be added, the frame's `needs`, cost (Marginalia 2, lamp-mother 2, Lamplighter 3, postmaster 3, Steward 3, Chief Warden 3, Carillonneur 3, Registrar 4) and one authored fallback board. A rival uses its usual routine; a stand-in heart is used while its rival is unbuilt | Each master "redrawn in your rules" without editing its district |
| P14 | **Kits are EN's composition layer**: `src/engine/drawing/kits/<district>.ts` adapts that district's registered rule, pieces, foes and shape for the generator (`place`, `matters`, `valid`, `needs`, budget cost, bot terms), reviewed by the district's owner. No district file is edited by EN | Keeps districts' content theirs and EN's guesses about it in one reviewable place |
| P15 | **Trip shapes through DK's hooks, parameterised by room index and length**: plain = `ret: any`; landings = rooms 1, 3, 5 that exist; terms = IQ's termed card each room, none at the heart; rising heat = heat 1 → 4 spread over the length, the heart at 4; span choice = before each room after the first, sound (bigger board, more foes, `sound` table) or crumbling; peal = one great bell per room from BF's lock stamps, hung at the heart's hooks; free-then-no-return = free return through room ⌈length/2⌉, then none, **no checkpoint** | "Works as in its home district" on a trip of any length; a checkpoint on a generated trip would remember a room that will never exist again |
| P16 | **What a drawn trip never gives**: hearing, a heart in `city.hearts` (so no pen from it), a rival page (RV-15 banks only in the rival's home district), recruits, keys or lore papers (idioms named there still count toward door notes, as `named` is profile-wide). It does give proof, Glyph records, footnote points, witnessed lines and named results like any trip fight | The design's "real trips", without farming the campaign's ladder |
| P17 | **Loot by depth**: one table per trip, built at Set out from the source districts of the drawing's rule, foes, pieces, shape and heart: their rune and method pages you lack (duplicates become ink), their solvents, ink reserve, vellum and the quiet doorway; tier weights by depth band (P7); the heart rolls from the deep tier with two picks | "Pages you lack, solvents of the districts you drew from" as one derivation, seeded like `rollOffers` |
| P18 | **Redefines (narrow): the owner brings their own pages.** party.md §1 requires the household to own every starter-page rune; the owner has no preconditions. At the handover, any of Splash and Steam the household lacks is learned as the owner's gift, shown in the scene | Keeps the starter page working the moment they join without inventing a precondition |
| P19 | **Mender is planned here, not in AH**: data row `mender` (lattice, `leansOn: spark`, rule `networkGap: 1`) in AH's habit table, and a `gap` option on `networks.ts` (`brassNet`, `cloudNet`, `oilNet`, `sameStateNet`): on the owner's own casts two network tiles in a straight line with **one empty tile** between them (no state, compound, unit or blocking piece) join; the gap tile is not part of the network. Never diagonal, never round-end fire spread, never bells | AH's scope closes with the seven; the owner arrives last and needs Toll's network from BF. Fine print: `mender:unit` (a unit in the gap blocks it), `mender:diagonal`, `mender:dusk` (the fire spreading at dusk does not jump) |
| P20 | **The door visit lives on the map**, as ending §1.1 says: the Seam node's sheet (and SM's stair sheet) shows *The owner's door* while `ownerDoor(p) === 'open'` and the handover is not done; afterwards it stays as *Visit the owner's desk* (scene replay). SM-10's in-trip line becomes "The door stands open. You can visit it from home." | ending.md (later) wins over SM P11's in-trip route; a free visit should not need a trip |
| P21 | **A lifetime ledger lands early** (`Profile.ledger`: casts, biggest chain ever with its caster and name, the order districts opened), fed by `returnHome` and the wipe path from the moment it ships | Credits need counts the profile does not keep today (only `city.trips`); a late field would show zeros for a long campaign |
| P22 | **Accepted from EN-W0 (design window 2026-11-12):** `Profile.drawings`, `.ending` and `.ledger` are optional and stored only once non-empty (a save without them is unchanged; the readers give P2's empty defaults); `MasterId` is a literal union of the eight; `handover` and `creditsOf` live in `src/engine/drawing/ending.ts` (Pack L builds them there; no `src/engine/ending.ts`) | Saves stay byte-identical until the ending is used; one folder for the ending's engine |
| P23 | **EN-5 runs before the generator.** The `needs` table of P5 and the element costs are data in `src/data/drawing.ts` (`NEEDS` by element id, `COSTS`), read by `checkDrawing` now and by every kit and frame later (a kit's `needs` is `NEEDS[id] ?? []`, so the reasons are written once). EN-5's last test, `EN-5: every offered combination generates`, stays `it.todo` and joins EN-2's Done-when | The palette, pen and compatibility need no generator; only the "generates" check does |
| P24 | **EN-9's acceptance todos move:** Pack D writes the nine EN-9 scenarios in `tests/scenarios/habits-mender.test.ts` and deletes their duplicate `it.todo` lines from `tests/drawing/acceptance.test.ts` (titles unchanged) | One home per test, as the `scenario` skill keeps them |
| P25 | **Re-sequenced (design window 2026-11-12):** KIT-R3 is now KIT-R3b–g (platform-closure P8); EN-S1 starts when KIT-R3g merges; EN-G0 follows EN-S1's report and the player's phone timings, in a design window | The frames and bot terms EN-S1 composes land first |

## 3. Current implementation and risks

- **Seeds** (`src/engine/rng.ts`): mulberry32, `deriveSeed(seed, salt)`, `pickWeighted`. Salts in use: offers `1000+e`, Seam variants `2000+e`, others `3000+100·i+e`, HC's start points `6000+…`. EN takes `7000–7999`.
- **Trip flow** (`src/engine/run.ts`, moved to `src/engine/trip/` by DK-2): `startTrip`, `variantFor`, `beginEncounter` (replays `t.actions` on the room's layout), `rollOffers`, `pushOn`, `returnHome`. Rooms are static `EncounterDef`s from `encountersOf(district)`; a generated district needs a dynamic source (request DK-E1).
- **Bot** (`tests/sim/bot.ts`, 85 lines, plus `tests/sim/ink-bot.ts`): greedy, fixed `MEMBER_IDS`, shove and casts only, a move search that re-scores every attack from every reachable tile; known limits: cannot use Hold, stalls on some start points. It lives in `tests/` and cannot be used by the app today (EN-0 moves it first).
- **Networks** (`src/engine/networks.ts`): `flood`-based `brassNet`, `cloudNet`, `oilNet`, `sameStateNet`, called from `bursts.ts`, `resolve.ts`, `marks.ts`, `solvents.ts`, `inventions.ts`; mender adds one option there.
- **Profile** (`src/engine/types.ts`): no lifetime casts or chains; `city.open` is append-ordered (asserted by a test in EN-1).
- **Risks** (the riskiest unknown, the generator's cost and acceptance rate, is settled by EN-S1 and EN-G0, which run first): (1) **the generator's quality**: rooms that pass every guardrail can still be dull or lopsided; the bot only proves "winnable". (2) **Bot blindness**: a greedy HP bot fails rooms that need a mechanic (the keystone, bells, circles), which would push hearts to the fallback; bot terms per kit (KIT-R3 registers them for the built districts) and authored fallbacks contain it. (3) **Phone cost** (P12). (4) EN composes every district, so it is last on the critical path and any district contract change ripples into a kit; kits land one per district as each build finishes. (5) Event caps and long rival planning inside bot trials (RV P4's ≈45 simulated casts per rival turn).

## 4. Contracts

**Provides**
- *Data/profile (EN-W0):* `Drawing`, `MasterId`, `ShapeId`; `Profile.drawings`, `Profile.ending: { handover: boolean; creditsSeen: boolean }`, `Profile.ledger`; the owner's `ApprenticeDef` (`src/data/apprentices/owner.ts`) and the `mender` habit row.
- *Engine:* `paletteOf(p)`, `penOf(p) → { total, parts }`, `costOf(d)`, `weightBand(d)`, `checkDrawing(p, d) → Issue[]` (element, reason); `GenKit`, `PieceKit`, `FoeKit`, `RuleKit`, `ShapeKit`, `HeartFrame` interfaces; `generateRoom(input) → { layout, attempts, fallback, ops }`, `checkGenerated(layout, spec)`; `botTrial(state, budget)`; the `inkedPage` module; `handover(p)`; `creditsOf(p)`.
- *App/UI:* the generation worker contract `requestRoom(trip, room)`, `DrawingTable.svelte`, `Handover.svelte`, `Credits.svelte`, map node registration below the Seam.

**Consumes**
- **KIT-R2** (audit §2.2): board UI through registries before EN-7. **KIT-R3**: `heart` frames and `bot` terms for the five built districts and the Seam and canal `trip` shapes, before EN-S1 and EN-K1–K5. **KIT-R4**: the `MEMBER_IDS` cleanup before EN-9. **MIX-1**: rule-pair fuzz before EN-2. **BL-111**: bundle cost before EN-4.
- **SM-0/SM-10/SM-11:** `ownerDoor(p)`, the stair sheet and the row under the Seam node; **CG-14:** `city.hearts` gains `cartographers` (P18 there).
- **HC-2/HC-4/HC-1:** `P`, `checkRoom`, `placeParty`, `Trip.party`, `joinHousehold`, save v9; **HC-6:** a tenth hue and shape (request).
- **DK-1, DK-3 (rules, `scope`), DK-4 (pieces), DK-5a/5b (ret, choices, trip state, `roomSetup`), DK-7 (offers), DK-9 (stand-ins), DK-14 (`met` keys: the palette source), DK-16 (map slot), DK-18 (fixture district for tests).**
- **RC-1/RC-8:** recruit entries are data (the owner follows the same shape), the Household tab lists the owner once joined.
- **AH-W0/AH-2:** the habit table, `habitOf`, `flow.habit` carried into bursts; **RV-1/RV-4/RV-15:** rivals spawn on any board with their routine; `holdsPage`; banking filtered by home district (request).
- **FN-1:** level-III capstones reached, for the pen; points awarded in any trip fight.
- **District plans** (CN, IQ, BH, BR, BF, CG, SM): their registered rule, pieces, foes, heart foe and trip shape; each district owner reviews its kit and frame.

**Requests** (small; each names the receiving task)
- **DK-E1** (DK-5a/5b): a module may supply rooms per trip (`encounter(trip, i)`, `length(trip)`) instead of static `rooms`. **DK-E2** (DK-3/5b): `roomSetup` may activate another district's district-scoped rule by id. **DK-E3** (DK-5b): a **`TripShapeDef` registry**, each shape's hooks taking `(trip, roomIndex, length)`, registered by its owner district. **DK-E4** (DK-14): `met` keys for rules (a fight under the rule). **DK-E5** (DK-16): the row under the Seam holds SM's stair and up to three drawn nodes. **DK-E6** (DK-1): optional `DistrictModule.bot` value terms and extra actions.
- **IQ, BH, BR, BF:** register their shape as a `TripShapeDef` (S each; KIT-R3 covers the Seam and canals); **BF:** great-bell locks as reusable stamps; **BR, BF, IQ, CG, BH, CN, SM:** heart foe setup callable outside the district (a function, not inline room data).
- **SM:** SM-10's in-trip door line points home (P20). **RV:** RV-15 banks only in the rival's home district. **HC:** tenth hue and shape; one spread line for `owner.ts` in the registry. **AH:** reserve the id `mender` in AH-W0's habit union. **Orchestrator:** EN-0 runs first (Pack A), before anything extends the bot.


**Leaves for later tasks** (becomes the status file's Owed list)
- EN-W0 declares stubs for everything under *Provides*. The profile fields are parsed with empty defaults: `ledger` is fed by EN-1; `ending.handover` is set by EN-10 and `creditsSeen` by EN-11; `drawings` is written by EN-6.
- `paletteOf`, `penOf`, `costOf`, `weightBand`, `checkDrawing` and the numbers in `src/data/drawing.ts`: EN-5. `generateRoom`, `checkGenerated`, `botTrial`: first built by EN-S1, finished by EN-2. The limits in `src/data/tuning.ts`: EN-G0.
- The `GenKit`, `PieceKit`, `FoeKit`, `RuleKit`, `ShapeKit` and `HeartFrame` interfaces are filled one district at a time: Seam, canals, quarter EN-K1–K3, bathhouses and bridges EN-K4–K5, foundry and cartographers EN-K6–K7 (each with its frame's authored fallback board). Heart frames and bot terms for the built districts come from KIT-R3 first.
- The `inkedPage` module's hooks (dynamic rooms, shape delegation, rule activation, offers): EN-3, with offers by depth EN-8. The generation worker `requestRoom`: EN-4. Screens: `DrawingTable` EN-6, map nodes EN-7, `Handover` EN-10, `Credits` EN-11.
- The owner's `ApprenticeDef` and the `mender` habit row, `handover(p)`, `creditsOf(p)`: EN-9, EN-10, EN-11. The handover text: EN-12, approved at EN-G2.
- Requests DK-E1–E6, the other districts' `TripShapeDef` registrations, one spread line for `owner.ts`, the tenth hue: owed by DK, IQ/BH/BR/BF, HC; EN tasks that need one stop and report if it is missing.

## 5. Packs

Roles are model tiers. Engine packs run their own test paths with `--reporter=dot` plus `tsc --noEmit`; UI packs run the full typecheck and the autofixer. Gates are not agent work. Only EN-G2 (text approval) can hold a pack (Pack L); other player gates never block the build. Calibration (pen weights, drawn-trip difficulty, heart win rates) left this plan: it goes to the CAL plan on the shared bot. **External tasks** in the order: KIT-R3 (platform-closure plan) between Pack 0 and Pack B; MIX-1 before Pack E; KIT-R4 before Pack D; BL-111 before Pack G; KIT-R2 before Pack G.

### Pack A: One bot (role: Default; engine; depends on: none)
Owns: `src/engine/sim/**` (new), `tests/sim/**`, the timeout line in `tests/data/canal-rooms.test.ts`
Pattern: midpoint-audit.md §3 Pack D; `tests/sim/bot.ts` and `tests/sim/ink-bot.ts`

| ID | Goal | Size | Done when |
|---|---|---|---|
| EN-0 | Move the bot into `src/engine/sim/` (audit §3 Pack D): party-generic, deterministic, an op budget, a lite policy, no DOM; fold in the generic trip runner of `tests/sim/ink-bot.ts`; `tests/sim/bot.ts` re-exports so no other test file changes; raise or trim the timeouts of `tests/sim/calibration.test.ts` and `tests/data/canal-rooms.test.ts`. Behaviour-neutral | M | the JSON reporter output of `tests/sim` is identical before and after; test `EN-0: same state and budget give the same actions` passes; both timeout tests pass under load |

### Pack 0: Contracts (role: Strong; engine; depends on: Pack A)
Owns: `src/engine/drawing/` (types, stubs), `src/data/types.ts` (drawing), `src/engine/types.ts` (profile fields), `tests/drawing/acceptance.test.ts`
Pattern: `tests/districts/bh0-contracts.test.ts`, `src/engine/districts/bathhouses/types.ts`

| ID | Goal | Size | Done when |
|---|---|---|---|
| EN-W0 | Types and stubs for §4 *Provides*; kit and frame interfaces checked against DK, RV and two district contracts; requests written up; TECH §7 row drafted; the acceptance file with every `"<ID>: <rule>"` title named below as `it.fails` or `it.todo` | M | `pnpm check:fast` green; no behaviour change; every title below exists in the acceptance file; the handoff lists the requests |

### Pack B: Generator spike (role: Strong; engine; depends on: Pack 0, KIT-R3, HC-2, HC-4, DK-3, DK-17)
Owns: `src/engine/drawing/generate.ts`, `tests/sim/generator.test.ts`, `src/app/dev/` (the `#/dev/generator` page)
Pattern: `tests/sim/trip-shape.test.ts` for a seed fuzz; `src/engine/districts/bathhouses/trip.ts` for room setup

| ID | Goal | Size | Done when |
|---|---|---|---|
| EN-S1 | Generator spike on built content only (Seam foes and ground, the canals' current and lamps): the P8 pipeline, `checkGenerated`, bot trial with redraws and fallback, a 500-seed fuzz, and a dev page that times generation on the phone and shows 20 rooms | L | tests `EN-S1: guardrails hold on 500 seeds`, `EN-S1: no event-cap overrun inside trials`, `EN-S1: same input gives the same layout, attempts and ops` pass; the report (first-try acceptance, attempts histogram, fallback rate, ops per trial, desktop and phone timings, 20 screenshots) is in the handoff |
| **EN-G0** | **Go/no-go**, decided by the orchestrator on the spike's report, with the player's phone timings. **Go** if guardrails hold on 100 % of seeds, at least 60 % accept on the first attempt and 98 % within 4, unverified fallbacks are 0, phone median is 0.5 s or less and p95 2 s or less per accepted room, and at most 2 of the 20 sample rooms look broken or dull. **No-go** is a **Redefines** for the player: Plan B validates rooms at home when a drawing is saved, against a reference party, into a pool of 8 per depth (EN-2 to EN-4 change) | | Decision and limits recorded in `src/data/tuning.ts`; a no-go goes to the player before Pack E |

### Pack C: Handover text (role: orchestrator; docs; depends on: Pack 0)
Owns: `docs/design/ending-text.md`
Pattern: `docs/design/district-cartographers.md` §2 (the threads to tie)

| ID | Goal | Size | Done when |
|---|---|---|---|
| EN-12 | Early orchestrator draft of the handover text (5–7 pages) and the credits lines in the owner's voice, so EN-G2 can run while the code builds | S | each page one short paragraph; every thread of the cartographers design §2 lands once |
| **EN-G2** | **Player review** of the handover text. The one gate that holds a pack: Pack L waits for it | | Approved text committed; DESIGN §11 row drafted |

### Pack D: Ledger and owner (role: Default; engine; depends on: Pack 0, KIT-R4, HC-1, AH-W0, AH-2)
Owns: `src/engine/ledger.ts`, the bank sites in `src/engine/trip/`, `src/data/apprentices/owner.ts`, `src/data/habits.ts` (one row), `src/engine/networks.ts`, the EN block of `src/data/lines.ts`, `tests/scenarios/habits-mender.test.ts`
Pattern: the entries in `src/data/recruits.ts` and `src/data/apprentices.ts`; an existing habit row for `habits.ts`; the `scenario` skill

| ID | Goal | Size | Done when |
|---|---|---|---|
| EN-1 | Lifetime ledger (P21), fed on return and wipe, first in the pack so it ships early; `city.open` order asserted | S | tests `EN-1: counts grow on return and on wipe`, `EN-1: lab and bench never feed the ledger`, `EN-1: city.open keeps opening order`, `EN-1: the ledger round-trips through save` pass |
| EN-9 | The owner (P18, P19): data entry, the mender rule in `networks.ts` and the cast paths, preview tag, fine print rows | M | scenarios `EN-9: mender joins Storm across one gap`, `EN-9: mender joins Conduct across one gap`, `EN-9: mender ignites fire across one gap`, `EN-9: mender joins Toll across one gap`, `EN-9: a unit in the gap blocks the join`, `EN-9: no diagonal join`, `EN-9: dusk fire does not jump the gap`, `EN-9: the same page cast by another apprentice behaves as today`, `EN-9: the owner's starter page fires a Storm` pass |

### Pack E: Generator and module (role: Strong; engine; depends on: EN-G0 (go), MIX-1; DK-5a, DK-5b, DK-7, DK-E1–E3)
Owns: `src/engine/drawing/` (all but `palette.ts`, `kits/`, `frames/`), `src/engine/districts/inkedPage.ts`, `src/data/districts/inkedPage.ts`, `tests/drawing/generator.test.ts`, `tests/districts/inkedPage/`
Pattern: the spike's `generate.ts`; `src/engine/districts/bathhouses.ts` for module assembly

| ID | Goal | Size | Done when |
|---|---|---|---|
| EN-2 | Production generator: kit composition, `matters` scoring, depth budgets (P7), size hints, stored layouts, the full P9 oracle | M | tests `EN-5: every offered combination generates` (P23), `EN-2: checkGenerated is green on every seed of every fixture drawing`, `EN-2: same input gives the same layout, attempts and ops`, `EN-2: no foe starts within distance 2 of any P`, `EN-2: depth bands scale the foe budget`, `EN-2: unverified fallbacks are zero` pass |
| EN-3 | `inkedPage` module (P1, P15, P16): snapshot, dynamic rooms, shape delegation, rule activation, heart from its frame, nothing given that P16 excludes | M | tests `EN-3: trips of length 3 and 6 start, reload, return and wipe`, `EN-3: reload replays stored layouts without running the bot`, `EN-3: a redraw during a trip changes nothing`, `EN-3: no hearing, heart, page or recruit is given` pass |

### Pack F: Palette, pen and loot (role: Default; engine; EN-5 depends on: Pack 0, DK-14, DK-E4, FN-1, RV-15 (P23: before the generator); EN-8 depends on: Pack E)
Owns: `src/engine/drawing/{palette,cost,check}.ts`, `src/data/drawing.ts`, the offers in `src/engine/districts/inkedPage.ts` (EN-8), `tests/drawing/{palette,loot}.test.ts`
Pattern: `src/engine/districts/bridges/guarantee.ts` for derived offers

| ID | Goal | Size | Done when |
|---|---|---|---|
| EN-5 | Palette, pen, costs, compatibility (P3–P7, P23): `paletteOf`, `penOf`, `costOf`, `weightBand`, `checkDrawing` with reasons; `NEEDS` and `COSTS` in `src/data/drawing.ts` | M | tests `EN-5: each need greys its element with its sentence`, `EN-5: the palette grows only with met content`, `EN-5: pen parts sum to the total` pass; `EN-5: every offered combination generates` stays todo (EN-2, P23) |
| EN-8 | Loot by depth (P17) and rewards: the derived table, picks by band, proof and points as any trip | S | tests `EN-8: offers come only from source districts or basics`, `EN-8: a page you hold is never offered`, `EN-8: solvents come only from drawn districts` pass (as fuzz: no throw) |

### Pack G: Generation worker and map nodes (role: Default; UI; depends on: Pack E; BL-111, KIT-R2, DK-16, SM-11)
Owns: `src/app/generation.ts`, `src/app/flow.ts` (calls only), `src/ui/districts/inkedPage/`, the map registry line
Pattern: `src/ui/districts/bathhouses/index.ts` for registry slots

| ID | Goal | Size | Done when |
|---|---|---|---|
| EN-4 | Generation worker and flow: prefetch at Set out, the loot and Crossroads screens; "inking the room…" state; a synchronous path for tests | M | test `EN-4: worker results equal the synchronous path` passes; **phone check:** entering a room after a normal loot pick shows no stall, and the "inking the room…" line appears when the worker is slower |
| EN-7 | Map nodes below the Seam (DK-E5) and Set out for a drawn page; the blank page and its line | S | Map at 375×812, light and dark, with 0, 1 and 3 drawn pages and five lower floors: nothing overlaps; Set out sheet for a drawn page visible |

### Pack H: Drawing table (role: Default; UI; depends on: Pack F)
Owns: `src/ui/screens/DrawingTable.svelte`, `src/ui/components/drawing/`, `src/app/drawing.ts`
Pattern: `src/ui/screens/Desk.svelte` and `src/app/desk.ts` for a profile-editing screen (single-task pack: one new screen with new interactions)

| ID | Goal | Size | Done when |
|---|---|---|---|
| EN-6 | The drawing table screen: three pages, element rows, pen pot, weight as depth, greyed reasons, name field, redraw at home, locked during a trip | M | Screen at 375×812, light and dark, with an empty page, a full drawing and an over-budget drawing, greyed rows showing their sentence, the name field, the locked state; **phone check**; autofixer clean |

### Pack I: Kits for the Seam, canals and quarter (role: Default; engine; depends on: Pack E, KIT-R3; SM-1, SM-3, CN-5, RV-5, IQ-10, IQ-3)
Owns: `src/engine/drawing/kits/{seam,canals,inkQuarter}.ts`, `src/engine/drawing/frames/{marginalia,lampMother,lamplighter,postmaster}.ts`, `tests/drawing/kits-a.test.ts`
Pattern: the spike's Seam and canals fixtures; the district's own registered rule, pieces and foes

| ID | Goal | Size | Done when |
|---|---|---|---|
| EN-K1 | Seam and lower-Seam kit; the Marginalia frame | S | tests `EN-K1: the frame passes checkGenerated over 50 seeds`, `EN-K1: the fallback board passes checkGenerated and has a scripted solve`, `EN-K1: the bot trial ends within its op budget` pass |
| EN-K2 | Canals kit (current, lanes, lamps, eel, moth, landings); lamp-mother and Lamplighter frames | M | the same three as EN-K1 titled `EN-K2: …`, plus `EN-K2: eel and moth are greyed without water and lamps` |
| EN-K3 | Quarter kit (writs, terms); postmaster frame | S | the same three titled `EN-K3: …`, plus `EN-K3: no term at the heart` |

### Pack J: Kits for bathhouses and bridges (role: Strong; engine; depends on: Pack E, KIT-R3; BH-8, BR-11, BR-7, BR-20)
Owns: `src/engine/drawing/kits/{bathhouses,bridges}.ts`, `src/engine/drawing/frames/{steward,chiefWarden}.ts`, `tests/drawing/kits-b.test.ts`
Pattern: Pack I's kits

| ID | Goal | Size | Done when |
|---|---|---|---|
| EN-K4 | Bathhouses kit (boil-over, vents, heat); Steward frame | S | the three standard titles as `EN-K4: …` (frame over 50 seeds, fallback with a scripted solve, bot trial within budget), plus `EN-K4: heat reaches 4 at the heart for every length` |
| EN-K5 | Bridges kit (collapse, spans, piers, span choice); Chief Warden frame with its keystone | M | the three standard titles as `EN-K5: …`, plus `EN-K5: never stranded on a span choice` |

### Pack K: Kits for the foundry and cartographers (role: Strong; engine; depends on: Pack E; BF-12, CG-10, CG-7)
Owns: `src/engine/drawing/kits/{foundry,cartographers}.ts`, `src/engine/drawing/frames/{carillonneur,registrar}.ts`, `tests/drawing/kits-c.test.ts`
Pattern: Pack I's kits

| ID | Goal | Size | Done when |
|---|---|---|---|
| EN-K6 | Foundry kit (bells, peal with lock stamps); Carillonneur frame with hooks | M | the three standard titles as `EN-K6: …`, plus `EN-K6: bells hang only where rung` |
| EN-K7 | Cartographers kit (pencil, guild hands, free-then-no-return); Registrar frame | M | the three standard titles as `EN-K7: …`, plus `EN-K7: no return after the point and none needed at the heart` |

### Pack L: Handover and credits (role: Default; UI; depends on: Packs D and E, Pack C (EN-G2 approved); SM-10, SM-11, CG-14)
Owns: `src/engine/drawing/ending.ts` (P22), `src/ui/screens/Handover.svelte`, `src/ui/screens/Credits.svelte`, `src/ui/screens/Codex.svelte` (one entry), the SM sheet registration line, `tests/ending/`
Pattern: `src/ui/screens/Cleared.svelte` for a tap-through scene

| ID | Goal | Size | Done when |
|---|---|---|---|
| EN-10 | The handover (P20): the door on the map, the scene from the approved text, `joinHousehold('owner')` with the gifted pages, `ending.handover`, the drawing table and the blank page unlocked | M | tests `EN-10: the handover is hidden before the door opens`, `EN-10: the handover is idempotent`, `EN-10: nothing is lost on joining`, `EN-10: gifted pages are learned only when missing` pass; **phone check:** the door sheet and every scene page at 375×812, light and dark |
| EN-11 | Credits and codex replay: `creditsOf`, skippable scroll, replay entries for the scene and the credits | S | tests `EN-11: creditsOf lists districts in opening order`, `EN-11: creditsOf carries the ledger counts` pass; **phone check:** the skippable scroll and a replay from the codex |

### Close (role: orchestrator; depends on: all packs)

| ID | Goal | Size | Done when |
|---|---|---|---|
| EN-14 | Close: full `pnpm check`; the full-loop phone check (§6); `code-review` by subsystem (generator, kits, ending); DESIGN §6.7 and §11 and TECH §7 rows (worker, salts, bot in engine); `ending-verification.md` (EN-14's notes folded in); ledger clean | M | gate green; screenshots reported; ledger open list empty |
| **EN-G1** | **Playtest gate** (player): draw three districts and play them; judge variety, fairness and loot (the pen's numbers go to CAL) | | Feedback recorded; never blocks |
| **EN-G3** | **Playtest gate** (player): a campaign save through the door, the credits and the first drawing | | Sign-off |

## 6. Verification

- **Scenarios** (`scenario` skill): mender across a gap for each network kind, gap blocked by a unit, diagonal refused, dusk fire unchanged, fine print witnessed; the owner's starter page firing a Storm (Pack D titles).
- **Generator fuzz** (`tests/sim/generator.test.ts`, spike then Pack E): 500 seeds per fixture drawing (each rule, each shape, lengths 3 and 6, parties 1–3): `checkGenerated` always green; determinism; attempt histogram and fallback rate reported; unverified fallbacks 0; no throw and no event-cap overrun inside trials.
- **Trip invariants** (DK-18 style): never stranded under every shape; a redraw mid-trip changes nothing; reload replays stored layouts; no hearing, heart, page, recruit or key; offers only from source districts. **Compatibility table:** every `needs` pair greyed with its reason, and every offered combination generates.
- **Phone (375×812, `verify`), per pack as listed; at Close:** the door sheet, every scene page, credits, the drawing table (empty, full, over budget, greyed reasons), the map with three pages and five floors, Set out, "inking the room…", a generated 7×9 room with three apprentices, a drawn heart per frame; light and dark; autofixer on every component. Generator timing is read from `#/dev/generator` on the player's iPhone (EN-G0).
- No win-rate bands: frames and fallbacks are checked by `checkGenerated` and a scripted solve; heart difficulty and the pen's numbers belong to the CAL plan.

## 7. Open questions for the player

1. **The pen** (P6): rescale its sources (default: 1 per heart, 1 per four pages, 1 per capstone) or keep them and triple every cost?
2. **The bot test's party** (P10): fresh HP and charges (default: the room is fair, the trip is yours to manage), or the HP the party walks in with?
3. **A master beaten only as a stand-in** (before its rival shipped): drawable as the stand-in, or only once its rival is real? *Default:* drawable as whatever its district currently fields.

## 8. Execution notes

- **Critical path** (audit §2.2 Track E): Pack A (EN-0) → Pack 0 (EN-W0) → KIT-R3 (b–g, P25) → Pack B (EN-S1 → **EN-G0**) → Pack E → Packs I–K → Close. EN-5 (P23) and Pack D (after KIT-R4) run beside the KIT-R3 packs. The risk (the generator) is retired at EN-G0, long before the districts finish.
- **Early and independent:** Pack C (EN-12 draft, then EN-G2) runs from Pack 0 on, because EN-G2 is the one gate that waits on the player; Pack D (ledger, owner) after KIT-R4.
- **Parallel:** Pack C beside B; Pack D beside B and E (no shared files); Packs F, G, H after E and in any order (F and G own disjoint files; H follows F); Packs I and J follow their districts, K waits for BF-12 and CG-10; Pack L waits for Packs D and E, EN-G2 approval and CG-14. MIX-1 gates Pack E, BL-111 and KIT-R2 gate Pack G.
- **Size:** 23 tasks and 4 gates (EN-13 moved to CAL) in 13 packs and Close: 8 S, 14 M, 1 L; about an L build, with the generator (EN-S1, EN-2, EN-K5–K7) the heaviest.
