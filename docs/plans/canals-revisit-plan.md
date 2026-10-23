# Canals revisit: the canals at the new standard (CN)

> Design: [city-and-districts.md](../design/city-and-districts.md) §5 (the built canals) and **§5b** (this revisit); [party.md](../design/party.md) §0d and §2 (the lamp-pole runaway); [rivals.md](../design/rivals.md) §2 (the Lamplighter); [footnotes.md](../design/footnotes.md) §1 (rival notes, district batches). Roadmap: **BL-124**, with **BL-91** (lamp-mother cadence) and **BL-119** (lock illustration); calibrates for BL-92. Brief: [build-program.md](build-program.md). Prefix **CN**.
> **State: Drafted (not approved).**
> Scope: bring the built canals up to the four newer districts: the runaway at the second landing, the Lamplighter rival in room 4 with the wardens' pass, barge cargo in rooms 2 and 4, rooms re-laid at per-room sizes with 4+ start points, the every-round lamp-mother, lamp-ledger lore, the opened-lock map art, Bench parity and **the Timing footnote batch** (Jar, Fuse, Afterglow, Pitch, Wick, plus the Lamplighter's note on Jar).

## 1. Scope and settled rules

**Delivers** (each row cites the decision; numbers are *tune by playing*):

| Item | Design source |
|---|---|
| The runaway as the canals' recruit, a "someone joins you" offer at the landing after room 3, offered on every later trip until taken; hidden until Fuse and Touch are owned; a Fuse page guaranteed in rooms 1–3 while she is missing | §5b "The third apprentice", party §0d, §2 "When each appears" |
| The Lamplighter (RV's `lamplighter`) as room 4's elite, with a no-rival fallback until RV ships and the player passes RV-G1 | §5b "A rival", rivals §2 |
| The wardens' pass as an offer after room 4, only once the bridges are heard, at most one key per trip, lost on a wipe; map hint "carried far down the canal" kept | §5b "The key", city §3.2 |
| Barge cargo in rooms 2 and 4: a crate drifting on a lane; moored before the room is won = a bonus pick; ruined by fire under it or an eel; optional | §5b "Optional barge cargo" |
| Rooms re-laid: per-room sizes (long towpath, wide crossing, a pool), three named layouts per room as today, ≥4 `P` start points, fair for a 6 HP body | §5b "Canal rooms", party §1 "Start points and boards" |
| Lamp-mother calls a moth **every round at the nearest free lit lamp**; cap of 4 live moths and the flare every third round stay (BL-91) | §5b "Lamp-mother's rhythm" |
| Lamp-ledger leaves found at the landings (the lamps mark the drawing) | §5b "Lore thread" |
| The map's solved-gate art: an opened, rat-free lock instead of the burnt wooden gate (BL-119) | city §3.1, ROADMAP BL-119 |
| Bench parity entries for canal content (the registry is DK-14's) | DK-14, BL-102 |
| The Timing footnote batch through FN §6: audit, author, orchestrator review, build, phone check | footnotes §0 "Content pacing", FN §6 |
| Calibration with the bots: per-room and full-trip, room 4 and the heart against BL-92's old 39% | BL-92 |

**Kept as built (§5b "What stays"):** the current, landings after rooms 1, 3, 5, the eel, Snuffer, lamp-moth, lamp-mother (one tile, 14 HP, anchored, snuffs her 3×3, burnt only on her own tile), the lock threshold and the fire-on-3-oil hearing; the old drop in water (a member takes 4 and is stunned, a minion is gone).

**Leaves out (owner):** the current as a rule, landings as `ret`, the canal intrusion and the move into module files (DK-3, DK-5a, DK-10, DK-17); the mechanical 6×8 conversion and the lock's four `P` (HC-3, HC-5); the rival engine, the Lamplighter's kit, routine, telegraph and page banking (RV); the recruit offer kind, preconditions and guarantee mechanism, the runaway's data entry (RC); Pull and her Fuse habit (AH); footnote levels, slots, the Afterglow diagonal capstone (FN-11); repeat/Margin method margins (FN-C8, Seam methods pass); the bridges' gate data itself (BR).

## 2. Proposals

| # | Proposal | Why |
|---|---|---|
| P1 | **Board sizes:** room 1 **5×9** (towpath: one lane down a long quay), room 2 **6×9** (a two-wide lane, the barge's run), room 3 **7×7** (two lanes crossing under a bridge), room 4 **6×9** (two lanes, little quay; the uphill reach flows up the screen), heart **7×8** (a pool with islands, 5–6 lamps on the rim). 4 `P` in rooms 1–2, 5 in rooms 3–5. Each room keeps its three §5.5 layout names | §5b asks for shapes that serve the place; all inside HC's 5–7 × 6–9 |
| P2 | **Fairness rule for authors:** no `P` adjacent to a foe that telegraphs on round 1 except in room 1, where at least two `P` sit beside the eel's lane so most draws show a lunge on turn 1 (the old depth-1 lesson, restored after HC P9 made it best effort); no `P` on water | Random draws need every point fair (party §1); keeps the first-room teaching |
| P3 | **The barge is a bystander unit, not a board piece.** `ENEMIES.barge` (token in P4), 1 HP, no AI, never telegraphs, trait `floats` (carried by the current like any unit in water, exempt from drops, can be beached on a quay and pushed back). It is a target for casts and basic actions (Shove, Pull, Swap move it; Bolt can hit it), so steering uses existing rules. Any damage ruins it (`cargoLost`): fire under it at round end, a burst, a stray Strike. Eels lunge at it when it is beside their tile and no member is. **Redefines (cross-plan):** DK §1 and FD P6 list the crate as a piece/object | Units already drift, get pushed, pulled, swapped, open step-jars on arrival (FD P7) and take fire; a piece would need new "targetable piece" and "pushed piece" rules for one crate |
| P4 | **Tokens:** barge `k` (crate), mooring `{moor}` (DK piece, non-solid, on water). The Lamplighter is RV's `L`; lamps stay `l` | No collision with `b`/`B` (towel-bearer) or the roster letters |
| P5 | **Mooring:** one `{moor}` tile per barge room, on the barge's lane, far enough downstream that the current alone reaches it about **two rounds after the bot's median win** in that layout. Arriving there by any cause (FD arrival hook) emits `moored` and anchors the crate. Room bonus (DK-5b): `{ goal: { happens: 'moored' }, reward: extraPick }` = **one more pick from the same offers**. Blockers on the lane (an eel, a rat, your own body) stop its drift | "Pushes, Pitch jars or timing" all work: speed it, clear its lane, or drag the fight out at a cost |
| P6 | **Room 4's elite is the Lamplighter in place of the Snuffer** (room 4: Lamplighter, eel, one moth, a rat, the barge). **Redefines:** §5.5 room 4 "all four". Fallback: room 4 layouts carry `L`, and while `lamplighter` is not enabled (`RIVALS_LIVE` data flag, flipped by CN-7 after RV-G1) the loader reads `L` as `n` (Snuffer), which is today's room | A Snuffer beside a fire-trap rival dulls both; six foes plus a crate on 6×9 is unreadable at 375×812 |
| P7 | **The wardens' pass is guaranteed after room 4** while the bridges are heard and not open and no key is on the trip: it takes one of the three offer cards. Key placement by room, not by table weight. **Redefines:** the built K-23 weighted key in `canalDeep` | §5b makes room 4 the place the pass is carried; a random chance makes the hunt a grind. The barge's extra pick is the way to take both pass and rune |
| P8 | **Recruit placement data:** `recruit: { apprentice: 'runaway', afterRoom: 3, guarantee: { rune: 'fuse', rooms: [1, 2, 3] } }` in the canal district file, read by RC's offer kind. Touch is guaranteed by the base Seam (party §0d), not here | Placement and guarantee are district data; the mechanism is RC's |
| P9 | **Lamp-ledgers:** five short leaves in the Lamplighters' hand (route, lamp counts, a lamp found dark where a street had moved, the order never to light the Seam, a page that ends mid-word). The first unread leaf is found at each landing reached (after rooms 1, 3, 5), shown as a card on the landing's Crossroads, banked at once (kept on a wipe, like hearing) and kept in a codex "Papers" page | §5b "pieces are lamp-ledgers found at the landings"; landings are the safe stops; knowledge never rides on a wipe |
| P10 | **Lamp-mother numbers move to data** (`summon: { cap: 4, flareEvery: 3 }` on her `EnemyDef`); "nearest free lit lamp" = nearest to a living member among lamps with no unit, ties in reading order; none free = no call that round | AGENTS.md: tunables in `src/data/`; BL-91's bug is that an occupied nearest lamp idles her |
| P11 | **Timing batch shape** (FN §6): Jar, Fuse, Afterglow get 2 margin lines each with level I/II pairs and a capstone pair (Afterglow's second capstone only; the diagonal one is FN-11's); Pitch and Wick one margin line each and a capstone pair. The **Lamplighter's note sits in a level II slot on a Jar line** (candidate: "the wick does not care who lit it": your jar also opens when fire reaches its tile), authored by CN and referenced by RV-20 | Answers FN Q3 for this district: level II rewards mastery and the page arrives mid-district |
| P12 | **Jar, Fuse and Afterglow have no fine-print lines today**; the audit adds honest ones (candidates: a jar placed under a standing unit waits; a new jar crumbles the old; a foe trips your jar; a Fuse opens at round end in sealing order; a drifting Fuse still opens at dusk; Afterglow on a drifting compound). No row is invented to host a slot (FN P5) | The batch is gated by real lines (BL-101) |

## 3. Current implementation and risks

- **Data:** `src/data/districts.ts` holds the canals inline: `CANAL_1…CANAL_4`, `CANAL_HEART` (3 variants each, all 6×8 with `D`/`S`), `room()` assigns `canalShallow` (1–2), `canalDeep` (3–4), `canalHeart`; `landings: [0, 2, 4]`; lamps `l` only on the heart. The lock is `gate.threshold.room`. HC-3 and DK-17 rewrite these first; CN starts from `src/data/districts/canals.ts`.
- **Loot:** `src/data/loot.ts` canal tables have no `guaranteed`; `rollOffers` (`run.ts`) supports one guaranteed page per table and appends a key via `keyOffer` (`city.ts`, gate `{ kind: 'key', from, table, weight }`).
- **Lamp-mother:** `foes.ts` `summonLamp` returns the lamp nearest a member regardless of occupancy; `canSummonAt` then fails and `planMother` idles: the "every other round" of BL-91. `MOTHS_AT_MOST = 4`, `FLARE_EVERY = 3` are engine constants.
- **Current:** `current.ts` `carried` excludes swimmers, fliers, anchored; `driftUnits` moves other units in water, so a floating crate drifts with no new rule. Win check `ctx.ts` `checkEnd` counts every living enemy: a crate needs exclusion.
- **Lines:** `src/data/lines.ts` has `pitch:water` and `wick:unit` only; nothing for Jar, Fuse, Afterglow.
- **Map:** `DistrictNode.svelte` draws `burntGate` from `app/city.ts`. **No lore system exists** (TripPage's "ledger" is the trip ledger). **No canal calibration sim** is in `tests/sim` now; C1's status recorded rooms 1–3 100%, room 4 96%, heart 39% at the old rhythm.
- **Risks:** (1) re-laying changes every canal event log, so DK-0's canal golden fixtures must be replaced deliberately by CN, never "fixed" to pass; (2) room 4 now carries a rival, a crate, a key and a bonus: readability on a phone; (3) RV-G1 may change the Lamplighter's numbers or kit after rooms are authored, hence the fallback slot; (4) the every-round mother makes the heart harder than the 39% result; (5) `lines.ts` is shared with FN-9/FN-10: CN appends a canals block only.

## 4. Contracts

**Provides**
- Canal district data (`src/data/districts/canals.ts`): re-laid rooms with `P`, barge `k`, `{moor}`, `L` slot; `bonus` on rooms 2 and 4; the `recruit` placement (P8); the key placement (P7) the bridges' gate points at; `RIVALS_LIVE.lamplighter`; five `LoreDef` ledger leaves.
- Canal module (`src/engine/districts/canals.ts`): the `barge` bystander def and `floats` trait use, the `{moor}` piece and its arrival hook, events `moored` and `cargoLost` with describe lines, the eel's crate lunge, the lamp-mother's free-lamp call.
- Canal UI (`src/ui/districts/canals/`): crate and mooring art, `moored`/`cargoLost` animations, the opened-lock solved art, the bonus line.
- `src/data/footnotes/canals.ts`: the Timing batch, including the variant `jar-lamplighter-*` with `rival: 'lamplighter'` that RV-20 references.

**Consumes**
- **DK-17** canals already in module files (with DK-3 current rule, DK-5a landings, DK-10 intrusion); **DK-4** pieces (`{moor}`, arrival trigger); **DK-5b** room `bonus` + `happens` goal + extra-pick reward; **DK-7** offer kinds incl. the key and `extra`; **DK-13** board art/preview registry; **DK-14** Bench registry; **DK-16** `solvedArt`.
- **HC-2** `P`, `checkRoom`, `placeParty`; **HC-4** parties of 1–3 (bot runs at 2 and 3).
- **FD-3** arrival pipeline (crate arrivals, moored hook, step-jars opened by a drifting crate); **FD-7** relocation events; **FD-8** variant ids.
- **RV-5** `lamplighter` def; **RV-15** page banking on a won room; **RV-G1** sign-off before `RIVALS_LIVE` flips; **RV-20** the note hook.
- **RC** (assumed): a `recruit` offer kind registered via DK-7, reading a district's `recruit` placement, enforcing hidden-until-ready and the `guarantee` rooms, banking through `joinHousehold`; the runaway's `ApprenticeDef` (R, 6/3, Pull, Timing/Seam, `Touch → Oil → Spark`).
- **AH** (assumed): `pull` action and the runaway's habit id (Fuse jar opens on her step) for integration scenarios.
- **FN-1, FN-3, FN-8, FN-C1** (template proven), **FN-11** (Afterglow diagonal), `fourCombos`.

**Requests to other plans**
- **DK R1:** a `bystander` unit flag honoured by `checkEnd`, foe targeting/turn order and kill-based credit (idioms, hearing), next to DK-6's "alive but gone" edits. Fallback: CN-0 adds it with the orchestrator merging.
- **DK R2:** a small **lore registry**: `DistrictDef.lore`, a Crossroads card slot for "found here", `Profile.lore` banked at once, a codex "Papers" page. Every later district's lore (BL-41) reuses it. Fallback: CN builds it in `src/engine/lore.ts` as the template.
- **DK R3:** key placement by `afterRoom` and a `guaranteed` flag in DK-7's key kind (P7).
- **RV:** RV-20 references CN's variant id instead of authoring the note text; RV-5 keeps Jar as the trap's Seal so the note stays on Jar.
- **RC:** the placement shape of P8; a test hook to force "preconditions met".
- **FN:** confirm level II for rival notes (FN Q3) and that `lines.ts` takes per-district appended blocks.
- **BR:** set the bridges' gate to `{ kind: 'key', from: 'canals', afterRoom: 4 }`.

## 5. Tasks

| ID | Goal | Owned area | Role | Size | Depends on | Acceptance |
|---|---|---|---|---|---|---|
| **Wave 0: contracts** | | | | | | |
| CN-0 | Canal content contracts: barge def + `floats`, `{moor}` piece id, `moored`/`cargoLost` events, `recruit` and key placement fields, `RIVALS_LIVE`, `LoreDef` entries' shape, `summon` data on the mother; stubs compile | `src/data/districts/canals.ts`, `src/engine/districts/canals.ts`, type exports | Strong | S | DK-17, HC-2 | `pnpm check` green, canal golden unchanged; handoff lists the R1–R3 requests' status |
| **Wave 1: rules and rooms** | | | | | | |
| CN-1 | Lamp-mother cadence (BL-91, P10) | `src/engine/districts/canals.ts` (or `foes.ts` mother section), enemy data | Medium | S | CN-0 | Scenarios: nearest lamp occupied → next free lamp called the same round; a call every non-flare round; cap 4 holds; flare on rounds 3, 6 |
| CN-2 | Barge cargo (P3, P5): bystander crate drifts, is pushed/pulled/swapped, opens step-jars it drifts onto, beaches; ruin by fire, bursts, strikes, the eel's lunge; mooring hook, anchoring, bonus pick through DK-5b | canal engine module, `{moor}` piece, `tests/scenarios/canals/barge.test.ts` | Strong | M | CN-0, DK-4, DK-5b, FD-3, DK R1 | Scenarios for each cause of arrival and ruin; a moored crate grants exactly one extra pick and survives save/reload; the room is won with the crate alive; never required |
| CN-3 | Re-lay rooms 1 and 2 (6 layouts, P1, P2), room 2 with barge and mooring | `src/data/districts/canals.ts` (rooms 1–2) | Medium | M | CN-2 | `checkRoom` passes; P2 checked by a data test; each layout plays to a win in the bot |
| CN-4 | Re-lay rooms 3 and 4 (6 layouts), room 4 with barge, mooring and the `L` slot (P6 fallback reads `n`) | same (rooms 3–4) | Medium | M | CN-2 | as CN-3; with `RIVALS_LIVE` off, room 4 spawns a Snuffer in the slot |
| CN-5 | Re-lay the heart (3 variants, 7×8, 5–6 lamps) | same (heart) | Medium | S | CN-1 | as CN-3; every variant has ≥2 lamps free of `P` and foes |
| CN-6 | Recruit landing (P8): placement data and the Fuse guarantee; integration tests | canal data, `tests/run/canals-recruit.test.ts` | Medium | S | CN-0, RC (offer kind), DK-7 | Hidden without Fuse or Touch; with both, offered after room 3; declined → offered next trip; taken → trip loot, lost on a wipe, joins on return; Fuse offered first in rooms 1–3 only while lacking it and she is absent |
| CN-7 | The Lamplighter in room 4: flip `RIVALS_LIVE`, room 4 scenario with canal foes and the barge, page banked on a win (RV-15) | canal data, `tests/scenarios/canals/room4.test.ts` | Medium | S | CN-4, RV-5, RV-15, **RV-G1** | His desired scene plays on a room 4 board; fallback test still green with the flag off |
| CN-8 | The wardens' pass after room 4 (P7) | canal data, key placement in canal module | Fast | S | CN-0, DK-7, DK R3 | With a fixture key gate: offered after room 4 only, only when heard and closed, once per trip, lost on a wipe, banked opens the district; not offered after other rooms |
| CN-9 | Lamp-ledger delivery (P9) via DK R2 (texts arrive from CN-G1) | canal data (lore), DK's lore slot or `src/engine/lore.ts` | Medium | S | CN-0, DK R2 | Leaf n found at landing n in order, banked at once, kept on a wipe, never repeated, readable in the codex |
| **Wave 2: screens and parity** | | | | | | |
| CN-10 | Canal board art: crate, mooring, `moored`/`cargoLost` animations, crate's next tile in the "Next round" preview, a bonus line in the room header, "bonus pick" on the Loot screen | `src/ui/districts/canals/` | Medium | M | CN-2, DK-13, DK-12 | Phone check 375×812, light and dark: a crate under oil and a jar is still readable; autofixer clean |
| CN-11 | BL-119: the opened, rat-free lock as the canals' `solvedArt` (may ship alone before DK-16 in `DistrictNode.svelte` if scheduled first) | `src/ui/districts/canals/` (or `DistrictNode.svelte`) | Fast | S | DK-16 (or none) | Phone screenshot of the map with the lock solved; no burnt gate left |
| CN-12 | Bench parity: register the crate, mooring, lamps and the lamp-mother as met canal items; confirm DK-14's eel/Snuffer/moth/water entries; the Lamplighter stays off (RV P9) | canal module's bench entries | Fast | S | DK-14, CN-2 | Bench offers the crate only after a barge room is met; three-subject limit kept |
| **Wave 3: the Timing footnote batch (FN §6)** | | | | | | |
| CN-F1 | Audit Jar, Fuse, Afterglow, Pitch, Wick against the current and jars (P12); add honest lines with firing scenarios | `src/data/lines.ts` (canals block), stamping sites in `jars.ts`/`schedule.ts`/`lattice.ts`, `docs/plans/footnotes-audit.md` (canals section) | Strong | M | FN-1A, FD-3, FD-8 | Every new row fires in a scenario; no filler rows; lines integrity test green |
| CN-F2 | Author `docs/design/footnotes-content/canals.md` (P11) and the five ledger leaves (P9) | that file | Strong | M | CN-F1 | Every pair is two reasonable opinions, all four combinations read; the note in the Lamplighter's voice with its credit line |
| **CN-G1** | **Orchestrator review gate** (the player delegated footnote variant choice, 2026-10-23): the Timing batch and the ledger texts | doc above | orchestrator | S | CN-F2 | Approved text is the spec; DESIGN §11 row drafted |
| CN-F3 | Build Jar and Fuse margins and capstones | `src/data/footnotes/canals.ts`, hooks in the canal module or `jars.ts` | Medium | M | CN-G1, FN-1, FN-3, FN-C1 | `fourCombos` per margin line, one scenario per capstone |
| CN-F4 | Build Afterglow (second capstone), Pitch and Wick | same file, `lattice.ts`/`solvents.ts` hooks | Medium | M | CN-F3, FN-11 | as CN-F3; Afterglow's diagonal capstone untouched |
| CN-F5 | The Lamplighter's note on Jar: variant, scenario, hidden until his page is held | same file | Fast | S | CN-F3, FN-8, RV-20 | Hidden without the page, offered at level II with it, credited in the margin; phone check of the Jar margin |
| **Wave 4: calibration and proof** | | | | | | |
| CN-13 | Canal calibration sim (§6 targets): per-room fresh-HP rates per layout at party 2 and 3 (pair + runaway) and a party-1 sanity run; full trips with attrition; room 4 with rival and fallback; heart; crate moored rate when the bot ignores it. Tune only data (mother HP/cap/flare, lamps, foe placement, mooring distance) | `tests/sim/canals.test.ts`, canal data | Medium | M | CN-1, CN-3–CN-5, CN-2 (CN-7 when live) | Targets met or the miss reported with numbers; sim under 20 s in the gate |
| CN-14 | Verification sweep and handoff: new canal golden fixtures replace DK-0's, phone checks, `docs/plans/canals-revisit-verification.md`, notes for DESIGN §5b/§11, TECH §7, ROADMAP (BL-91, BL-92, BL-119, BL-124) | `tests/fixtures/district-kit/` (canal files), verification doc | Medium | M | CN-1–CN-13, CN-F5 | `pnpm check` green; screenshots captured |
| **CN-P1** | **Playtest:** a canal trip with the household: the runaway's landing, room 4 (rival, crate, pass), the heart's rhythm, start-point fairness, the new board shapes on a phone | player | — | — | CN-14 | Feedback recorded; BL-92/BL-93 updated |

## 6. Verification

- **Scenarios** (`scenario` skill): the mother's free-lamp call, cap and flare; every crate arrival cause (drift, Shove, Pull, Swap, onto a step-jar, beached), every ruin, mooring and anchoring; room 4 with the Lamplighter; the Timing variants with `fourCombos` and capstones; the rival note.
- **Run tests:** recruit placement and guarantee, key placement, bonus pick and save round trip, ledger banking across a wipe, fallback room 4.
- **Bot targets** (fresh HP, ≥50 seeds per layout, party 2; party 3 within +10 points): rooms 1–2 ≥85%, room 3 ≥75%, room 4 65–80% with the Lamplighter (fallback ≥80%), heart **50–65%** per room (old 39% was full-trip-blind and at the half rhythm); full trip with attrition reported, not targeted. Crate moored without trying in ≤25% of wins, so mooring is a choice.
- **Fuzz** (`tests/sim`): canal trips at party 1–3 with the crate and rival: no throw, event cap held, a crate never counted for the win, one key per trip.
- **Phone (375×812, `verify`)**: each room size with three apprentices, room 4 with rival telegraph + crate + current preview, the landing card with a ledger and the runaway's offer, Loot with the pass and a bonus pick, the map's lock, the Jar margin. Autofixer on every changed component.

## 7. Open questions for the player

1. **Mooring by waiting:** P5 lets the current alone moor the crate if the fight runs about two rounds long, so stalling is one way to earn it. Or should it need at least one push (a berth just off the lane)? *Default:* reachable by waiting.
2. **Room 4's foes:** P6 swaps the Snuffer for the Lamplighter. Keep that, or keep the Snuffer as well on a bigger board?

## 8. Execution notes

- **Critical path:** DK-17 + HC-2 → CN-0 → CN-2 → CN-4 → CN-13 → CN-14 → CN-P1. CN-7 waits for RV-G1 and can land late, since the fallback room ships first.
- **Parallel:** CN-1, CN-6, CN-8, CN-9 beside CN-2; CN-3/CN-4/CN-5 are separate sections of one file (merge in order); CN-10–CN-12 after CN-2; the footnote track (CN-F1 → CN-F2 → CN-G1) can start as soon as FN-1A and FD-3 land and runs beside everything else; CN-F3–F5 after FN-C1.
- **Size:** 20 tasks plus two gates (CN-G1, CN-P1): 10 S, 10 M; roughly one **L** build, with the footnote track about a third of it.
