# Calibration: follow-up briefs for the misses after CAL task 3

These briefs are traced at `c866ccd`. They cover the misses recorded in [calibration-results.md](calibration-results.md) under "Task 3 applications". The [shared measurement and approval contract](calibration-briefs.md#shared-measurement-and-approval-contract) applies to every pack below without change. That covers the standing delegation, isolated candidates, one writer for the common table, the table schema, and stalls counted as non-wins and reported separately. The heavy drawing-test timeouts are a gate fix handled elsewhere, so they are not briefed here. Pack IDs are CAL-F1 to CAL-F5. Each is a checklist under the CAL ID it continues (CN-13, BF-20/CAL-4, CG-9, BR-21/BH-16, IQ-20-W), not a new plan ID.

## Player questions (rule decisions only; a default is held for each)

1. **Stall-shaped misses.** Several hearts reach their band mostly because the bot does not finish within 40 rounds, not because it loses. The baths heart's 48 non-wins are all stalls. The foundry's six four-bell non-wins are all stalls. The Lamplighter at 60 HP stalled 3 times in 12 and never lost. A player has no round limit, so for them a stall is a long fight, not a defeat. *Default:* count stalls as non-wins, as now. Choose loss-shaped candidates over stall-shaped ones wherever one exists, and mark any heart whose median win round is above 25 for a feel check in the playtest. Making these hearts losable would need rule changes to the routines or kits.
2. **Foundry bells, only if CAL-F3's hooks miss.** Moving hooks is data. If four bells still miss 80 %, the next lever is a rule: for example, a hung bell takes HP off the Carillonneur, or allied pulses reach further. *Default:* no rule change. Record the miss.
3. **Lamplighter kit, only if CAL-F2's room data misses.** If room HP plus a second eel cannot reach 65–80 %, the next lever is his kit (lantern damage, Herd reach), which is a rule. *Default:* no kit change. Apply the closest room candidate and record the miss.

Every other default below falls under the standing delegation of 2026-11-20.

## Default decisions at a glance

| Miss | Default | Reason | First numbers to try |
|---|---|---|---|
| Bot crash `Stoker is down` | Fix the bot policy (CAL-F1) | Move scoring calls `bestAttack` on the state after a hypothetical move. If that move downed the mover, `basics()` still lists her Shove directions, because `BASIC_ACTIONS.*.check` never tests whether the actor is alive. `applyAction` → `isLegal` then throws. Production generation calls the same bot through `botTrial`, and the worker passes engine errors on, so a drawn lantern room could fail to ink | Before listing attacks, check that the member is alive and the phase is `player` |
| Canals room 4 at 150/150 (target 65–80 %) | Override HP in room 4 only, and add a second eel | HP alone produces stalls, not losses: 10–36 HP won every fight, 60 HP won 9/12 with 3 stalls and 0 losses. A fresh pair loses about 0.5 of 14 HP in the room, so it lacks damage, not bulk. The player asked to test layout changes. A room-level override leaves the Lab and drawn Lamplighter at 6 | `enemyHp: { lamplighter: 18 }` and a second eel on the lane without the crate: uphill reach E3, lamp market E1, siphon F7 |
| Foundry heart, four bells 67 % (80–90 %) | Move the first two hooks beside the Carillonneur | In the selected runs, allied pulses hit foes 0 times, because every hook sits on an edge, out of reach of the anchored Carillonneur. Hooks are layout data. Zero bells hang nothing, so the 28 % zero-bell rate should hold | Hooks move from A1/G1 → C1/E1 (the great bell), A1/G1 → D1/F1 (the clapper hall) and A3/G3 → C1/E1 (the sounding yoke). Then `alliedPulseDamage` 2 → 3 if needed |
| Foundry room 4 at 100 % (65–80 %) | Override staff HP in room 4 only | The shared staff stats also move the heart: Clapper 12/1/7 reached room 4 at 67 % but reversed the bells' advantage. `EncounterDef.enemyHp` exists and is read by `createEncounterBattle`, but no data uses it yet | `{ clapper: 12 }` → `{ clapper: 12, detuner: 6 }` → `{ clapper: 16, detuner: 6 }` |
| Registrar solo +11 pp, duo +8 pp | Keep 40 HP and screen one movement value | The trio is on target. HP moves all three party sizes together: at 42 HP no size changed by more than two fights. At n = 72 the gaps are about 2 and 1.4 standard errors | `REGISTRAR_TUNING.move` 1 → 2. Apply only if solo ≤ 31 %, duo ≤ 61 % and trio ≥ 80 % |
| Drawn Chief: 32 HP timed out EN-K8 | Give the drawn frame its own HP, as `DRAWN_MARGINALIA_HP` 16 does (CAL-F1) | Generation passed at 10, 14, 20 and 28. The EN-K5 fallback was re-recorded at 28. The frame field is already read by trials (`generate.ts:594`), by play (`inkedPage.ts:210`) and by scripted solves | `DRAWN_CHIEF_WARDEN_HP = 28`, which is today's value, so behaviour does not change |
| Bridges sound heart may overshoot at 28 | Once the drawn frame is separate, remeasure the authored Chief at 30, then use 32 | 28 gave 16/16 sound and 15/16 crumbling. 32 gave 80 % sound and 67.5 % crumbling. 30 lies between and was never measured, because its run hung | Chief 30, at 40 seeds per span |
| Baths heart 40–55 % | No change. Confirm on new seeds | 42/90 (46.7 %) is in band, but its 95 % interval is about ±10 pp | Heart only, fresh pair, aware bot, 50 new seeds per layout |
| Quarter wax at the heart (bar lowered to 55 %) | Take Wax out of room 4's terms (`rooms: [1, 2]`) and restore the 75 % bar | Keeps all three recorded decisions: terms 5/6/7, a losable heart, and meetability as "a clear majority". A 55 % bar is not a clear majority. The change is data only and reversible. Options (b) and (d) each overturn one of those decisions | `term-wax.rooms` [1, 2, 3] → [1, 2] |

## Order

| Window | Packs (disjoint Owns; one slow sim at a time) | Runner / model / effort | Starts when |
|---|---|---|---|
| 1 | **CAL-F1** bot fix and drawn Chief frame HP (no sims) · **CAL-F5** quarter wax (the window's only slow sim) | F1: Claude Sonnet high (or Codex Sol 6.2 high) · F5: Claude Sonnet high | Now. If the heavy-test timeout fix owns `tests/drawing/kits-b.test.ts`, serialize F1's task 3 after it |
| 2 | **CAL-F2** canals room 4 (slow sims) | Codex Sol 6.2 high | F1 merged (the HP screens at 18–24 last longer and reach the crash path) |
| 3 | **CAL-F4** authored Chief and baths confirmation (slow sims) | Codex Sol 6.2 high | F1 merged (drawn Chief decoupled first); after F2's sims finish |
| 4 | **CAL-F3** foundry heart hooks, room 4 and the Registrar screen (the slowest sims) | Codex Sol 6.2 high | F1 merged; after F4's sims. Last, so the player has time to answer question 2. Its task 1 code and unit tests may start during window 3 |
| Then | **CAL-5** as briefed in calibration-briefs.md | as briefed | CAL-F1 to F5 merged. CAL-5 owns `src/data/drawing.ts` after F1 and must measure the final authored numbers. Without F1, its drawn lantern trials can throw |

Never run more than three workers at once. While another pack's sims run, a pack may do its no-sim task, which each brief marks, then report "sims owed" and wait for the slot. No stronger model is available this session, so a failed review switches the runner (Codex ↔ Claude) rather than raising the effort.

## Selection rule (all packs)

Screen on the fresh pair with the aware bot (gauge and cracks), 40 rounds and 600 actions, then confirm the chosen candidate at the sample size the contract names. Among candidates inside the band, prefer, in order:

1. fewer stalls (losses over stalls);
2. the smaller data change;
3. the result closest to the band's centre.

If no candidate is inside the band, apply the closest one whose non-wins are mostly losses. If only stall-shaped candidates reach the band, apply one and label it under question 1. Never raise round, action or generation caps. Every applied row records the old and new values, the seeds, wins/losses/stalls, median rounds and HP left.

## Pack CAL-F1 (Claude Sonnet high, or Codex Sol 6.2 high)

```text
Pack CAL-F1: tasks 1 -> 2 -> 3 (bot: downed-mover attacks; bot: fight-ending moves; drawn Chief frame HP). No sims.

Read: src/engine/sim/bot.ts; docs/plans/canals-revisit-verification.md "CAL-1 task 3" (the crash paragraphs); pattern: src/engine/drawing/frames/marginalia.ts (enemyHp + DRAWN_MARGINALIA_HP).
Owns: src/engine/sim/bot.ts; tests/engine/bot-hypothetical.test.ts (new);
       src/data/drawing.ts (one new constant only), src/engine/drawing/frames/chiefWarden.ts;
       tests/drawing/kits-b.test.ts (one added case).
Tests pinning old numbers: none. Tasks 1-2 change only paths that threw before (task 2: see below); task 3 keeps today's value, 28.

Trace:
- botFight's move loop: next = applyAction(state, move); then bestAttack(next, id, ...) -> attacks(next, id)
  -> basics(next, id) checks only m.acted -> basicDirs -> BASIC_ACTIONS[a].dirs, whose `check`
  (shove: unitAt(step(u.pos, dir)) !== null) never asks whether the actor is alive -> applyAction(next, shove)
  -> isLegal returns "<name> is down" -> IllegalActionError. castableSpells and legalMoves already gate on
  activeMember (alive and player's turn); basics does not. The same throw happens with "The battle is over" when
  the hypothetical move ends the fight (phase won/lost) and a unit is adjacent.
- The crash repro: live lamp market, fresh pair seed 9, round 6, Lamplighter at 42 HP. The Stoker's hypothetical
  B1 -> C1 opens his lantern; Spark and pool fire take her to 0 HP; the bot then scores a south Shove. A second
  repro: an uphill-reach candidate (crate B8-B2, start A9), worn trio seed 8, round 5, a hypothetical C2 move kills
  the Draughtsman and the bot scores a north Shove.
- Production: drawing/trial.ts -> botTrial -> botFight (lite). generation.worker.ts posts engine errors back and
  generation.ts rethrows them, so the same throw would fail to ink a drawn room.
- Move scoring also computes distance = Math.min(...enemies) over an empty list (Infinity) when a hypothetical
  move leaves no living foe, so a move that wins the fight scores -Infinity and is never chosen.
- HeartFrame.enemyHp (drawing/types.ts:133) is read by offeredTrial (generate.ts:594), by the played drawn battle
  (districts/inkedPage.ts:210) and by scriptedSolve (tests/drawing/kits-a.scripts.ts:100). CHIEF_WARDEN_FRAME sets
  none, so the drawn Chief follows BRIDGE_TUNING via the shell. EN-K8 (kits-a) timed out at 32 and passes at 28.

Contract:
  "Bot improvements ... are policy changes, not new game rules; record before/after evidence."
  The bot never forks (tests/sim/bot.ts re-exports the engine bot). Keep the botFight/botTrial signatures and BotOptions.
  Do not touch isLegal or BASIC_ACTIONS: the rule is right; the bot asked an illegal question.
  The drawn Chief's value stays 28, so no drawn behaviour changes now; CAL-5 owns tuning it against EN-13.

1. In bot.ts, attacks()/basics() return [] unless s.phase === 'player' and the member isAlive (hp > 0, not out).
   Test first: a small scenario board where the only legal move onto a lethal step-jar sits next to another unit,
   so botFight would score that member's Shove after the move. It must play to an end without throwing and must not
   choose the lethal move. Add the lamp-market repro: the room's setup via createEncounterBattle with
   enemyHp { lamplighter: 42 } in the test only, fresh pair, seed 9, 40 rounds, no throw.
2. When no living non-bystander foe remains after a hypothetical move, use distance 0. This can change a completed
   fight only where a move would have won it. Count such moves in the CAL-0 smoke (calibration-tables default run)
   and report the count; the smoke itself must pass. No district table is rerun here.
3. Add `DRAWN_CHIEF_WARDEN_HP = 28` beside DRAWN_MARGINALIA_HP, with the same one-line reason, and set
   CHIEF_WARDEN_FRAME.enemyHp = { chiefWarden: DRAWN_CHIEF_WARDEN_HP }. Add a kits-b case: the frame's HP equals the
   constant, and a drawn Chief heart built through inkRoom/inkedPage spawns him at that HP.

Owed by this pack: nothing else. Do not add frames for the Carillonneur (57) or the Registrar (40): CAL-5 decides those with the drawn bands.
Done when: 'CAL-F1: a hypothetical move that downs the mover never scores a basic action', 'CAL-F1: the lamp market at 42 Lamplighter HP plays to an end (fresh pair, seed 9)', 'CAL-F1: a move that ends the fight scores by its value' and 'CAL-F1: the drawn Chief Warden keeps DRAWN_CHIEF_WARDEN_HP' pass. The Lamplighter Lab scenarios (win and loss), golden replays and EN-K5's scripted solve pass unchanged. The report gives the task-2 count.
Verify: pnpm vitest run tests/engine/bot-hypothetical.test.ts tests/drawing/kits-b.test.ts tests/scenarios/lamplighter-lab.test.ts tests/run/golden.test.ts --reporter=dot
Sims owned: none beyond the CAL-0 default smoke (pnpm vitest run tests/sim/calibration-tables.test.ts --reporter=dot).
Phone check: no.
```

## Pack CAL-F2 (Codex Sol 6.2 high)

```text
Pack CAL-F2 (CN-13 room 4): tasks 1 -> 2 -> 3 (room-level HP plumbing; candidate screen; apply, re-record, confirm).

Read: docs/plans/canals-revisit-verification.md §7 "CAL-1 task 3"; calibration-results.md CN-13 rows; pattern: tests/data/canal-rooms.test.ts.
Owns: src/data/districts/canals.ts (CANAL_4 layouts and the room-4 def's optional enemyHp; the `room` helper may take an optional enemyHp);
       tests/data/canal-rooms.test.ts (pins room 4's foes 'eel,lamplighter,moth,rat');
       tests/scenarios/canals/room4.test.ts (the lamp market's scripted scene; positions may shift);
       tests/sim/canal-rooms-play.test.ts, tests/sim/canals.test.ts (room 4 on its stand-in), tests/sim/canals-fuzz.test.ts;
       tests/sim/seam-calibration.test.ts, tests/sim/calibration/seam-canals.ts (the CAL1_MEASURE harness);
       tests/fixtures/district-kit/canals-win-{2,4,5,6}.json (re-record only);
       docs/plans/canals-revisit-verification.md.
Tests pinning old numbers: canal-rooms.test.ts foe list and layout checks; room4.test.ts; canals-win-{2,4,5,6} replays (every win trip crosses room 4).

Trace:
- CANAL_4 (canals.ts) holds three 6x9 layouts, `L` passed through layRival(live). room('canal-reach', ..., 4, CANAL_4, ...) builds a
  KitRoomDef, which extends EncounterDef; EncounterDef.enemyHp exists, and createEncounterBattle passes it into createBattle.
  spawnEnemy uses enemyHp[def.id] ?? def.hp, and the rival unit's def id is 'lamplighter'. No district sets enemyHp yet,
  so this is its first data use. Check the trip path (trip/start.ts and flow.startBattle) actually spawns with it.
- The stand-in (Snuffer, via layRival(..., false)) shares the layouts: a second eel also lands in the fallback room,
  which must stay at least 80 %. An enemyHp key for lamplighter does not touch the Snuffer.
- LAMPLIGHTER.hp = 6 (rivals/lamplighter.ts) and the shell in enemies.ts stay unchanged: Lab scenarios, the drawn frame
  (frames/lamplighter.ts builds its own canals heart, not CANAL_4) and his page trial read them.
- Eel: 3 HP, move 4, lunge 2, lurker, habitat water; the strongest canal hitter. Room 4 now has one eel, sharing the
  crate's lane in the uphill reach and the siphon. The eel can ruin the crate.
- Canal golden replays use DEEP {maxRounds:100, startHp:20}; replay never asks the bot, so CAL-F1 does not change them,
  but a room-4 layout change does.

Contract:
  "Room 4 65-80 % with the Lamplighter (fallback at least 80 %)"; "Accidental crate mooring should occur in at most 25% of wins,
  measured separately for fresh and trip-worn pairs. Test layout changes." Fresh HP, party 2, 50+ seeds per layout.
  Keep the heart (Mother 56, B/C layouts) and rooms 1-3 as they are. No kit, routine or rule change (player question 3).
  Never put the second eel in the crate's lane or beside a start point; keep layout checks green.

1. (No sim.) Let the room-4 def carry enemyHp; test 'CAL-F2: room 4 spawns the Lamplighter at the room's HP through the trip'.
2. Screen fresh pair, 12 seeds per layout (36 fights), CAL-F1 merged. Candidates in order:
   C1 enemyHp { lamplighter: 18 } + second eel: uphill reach E3 (ew^), lamp market E1 (ew^), siphon F7 (ew<);
   C2 as C1 with lamplighter 24; C3 as C1 with { lamplighter: 18, eel: 5 }; C4 as C1 plus a second rat on dry floor,
   at least 3 tiles from every start. If C1 is below 65 %, try C0: second eel only, no enemyHp.
   Stop at the first candidate in band under the selection rule. For each candidate report the per-layout spread
   (keep it at or under 25 pp), losses vs stalls, and the fresh stand-in room.
3. Confirm the pick at 50 seeds per layout: fresh pair (the band), solo and trio (reported); worn live and stand-in
   crate mooring (CAL1_PARTY=2 CAL1_MEASURE=canals-live / canals-stand-in). Apply it, update pinned tests, re-record
   canals-win-{2,4,5,6} once with DEEP, review the event diffs, then replay with recording off.

Owed by this pack: CN-13 room-4 band. If no candidate reaches 65-80 %, apply the closest loss-shaped one and report it under question 3.
Done when: 'CAL-F2: room 4 spawns the Lamplighter at the room's HP through the trip' and the updated 'foes: room 3 ...; room 4 ...' pass; 'CN-13: the bot plays every variant to an end; the pool is no walkover (target 50-65%)' passes; all canals golden '<name>: replays to the recorded events, offers, stats and end save' pass. The verification file has the screen and 50-seed tables with band status.
Verify: pnpm vitest run tests/data/canal-rooms.test.ts tests/scenarios/canals/room4.test.ts tests/sim/canal-rooms-play.test.ts tests/run/golden.test.ts --reporter=dot
Sims owned: tests/sim/seam-calibration.test.ts with CAL1_MEASURE=canals-live|canals-stand-in; CAL_DISTRICTS=canals CAL=1 pnpm vitest run tests/sim/calibration-tables.test.ts --reporter=dot; tests/sim/canals.test.ts and canals-fuzz.test.ts.
Recording: RECORD_GOLDEN=1 pnpm vitest run tests/run/golden.test.ts -t 'canals-win' --reporter=dot
Phone check: no.
```

## Pack CAL-F3 (Codex Sol 6.2 high)

```text
Pack CAL-F3 (BF-20/CAL-4-B, CAL-4 room 4, CG-9): tasks 1 -> 2 -> 3 (heart hooks; room-4 staff HP; Registrar screen).

Read: docs/plans/foundry-verification.md §6 "CAL-4 task 3"; docs/plans/cartographers-verification.md "CAL-4 task 3"; pattern: tests/data/foundry-rooms.test.ts (BF-12).
Owns: src/data/districts/foundry.ts (FOUNDRY_HEART_VARIANTS hook tiles, the 'foundry-loft' def's optional enemyHp, FOUNDRY_TUNING.alliedPulseDamage);
       src/data/rivals/registrar.ts (REGISTRAR_TUNING.move only);
       tests/data/foundry-rooms.test.ts, tests/districts/foundry/peal.acceptance.test.ts, tests/districts/heart-frames.test.ts,
       tests/drawing/kits-c.test.ts and tests/drawing/kits-c.scripts.ts (drawn hooks; EN-K6/EN-K7 fallback recordings if still red),
       tests/districts/bf0-contracts.test.ts (pins alliedPulseDamage 2), tests/rivals/carillonneur.test.ts, tests/rivals/registrar.test.ts (literal move: 1 fixture);
       tests/sim/foundry-calibration.test.ts, tests/sim/cartographers-calibration.test.ts, tests/sim/calibration/foundry-cartographers.ts, tests/sim/foundry.test.ts;
       docs/plans/foundry-verification.md, docs/plans/cartographers-verification.md.
Tests pinning old numbers: bf0-contracts (alliedPulseDamage 2); foundry-rooms BF-12 (4 hooks, no start beside a bell) and room 4's foe list
       'clapper,detuner,detuner,ringer' (unchanged under the default); peal.acceptance (hooks in reading order); heart-frames and kits-c
       (the drawn frame stamps four hooks from layout 0); registrar.test.ts if move changes.
       Serialize kits-c edits with the heavy-test timeout fix if it owns that file.

Trace:
- Heart layouts (7x9): the great bell has V at D1 with ropes C2/E2 and hooks at A1, G1, A6, G6. The clapper hall has V at E1 with
  ropes D2/F2 and the same hooks. The sounding yoke has V at D1 with ropes C2/E2 and hooks at A3, G3, A6, G6. peal.ts::HEART_HOOKS
  reads the {hook} tiles of each layout; alliedBellEdits hangs rung notes on bare hooks in reading order, so the first two
  hooks get bells 1-2. An allied great bell pulses its four neighbours (foes only) for alliedPulseDamage 2 + push 1 when an
  apprentice's ring includes its tone (the CAL-4 fix). The Carillonneur is anchored and never walks.
- foundryHeartFrame (districts/foundry/heartFrame.ts) stamps hooks scaled from layout 0, so the drawn Carillonneur heart moves
  with it. The frame's FALLBACK is written out (frames/carillonneur.ts), so EN-K6's fallback board does not change.
- Room 4 'The clockwork loft' (FOUNDRY_4) holds clapper, detuner x2 and a ringer. foundryRoom() builds a KitRoomDef with no
  enemyHp; the field and createEncounterBattle's pass-through exist. Staff stats are shared with the heart (FOUNDRY_TUNING.foes).
- REGISTRAR_TUNING = { hp: 40, move: 1, circles: 1, circlesBelowHalf: 2 }; the rival and the shell read it. Extra circles did
  nothing (the bot steps off them).

Contract:
  "Target 20-30% fresh-pair wins at zero bells and 80-90% at four. Measure all five counts on paired seeds."
  "Allied bells must hit enemies." Ordinary room 4: 65-80 % fresh pair. Registrar: about 25/55/85 % solo/duo/trio, 40 HP the start.
  Keep the Carillonneur at 57 and the Clapper at 6/2/4 (their Rivet regression holds at 6). Keep 4 hooks per layout and no start beside a bell.
  No rule change to pulses, rings or the tune (player question 2).

1. Hooks. (No-sim part: layouts plus tests, including 'CAL-F3: a hung bell beside the Carillonneur pulses him on a matching ring'.)
   H1: move the first two hooks of each layout beside the Carillonneur, leaving one open tile beside him: the great bell
   A1/G1 -> C1/E1, the clapper hall A1/G1 -> D1/F1, the sounding yoke A3/G3 -> C1/E1. Screen 0-4 bells paired, fresh pair, aware,
   6 seeds per layout (as CAL-4). If four bells are under 80 %: H3 = H1 plus alliedPulseDamage 3. If four bells are over 90 %:
   H2 = only the first hook beside him. Accept when 0 bells is 20-30 %, 4 bells is 80-90 %, and 1-3 bells do not fall by more than
   one fight in 18. Report allied hits on the Carillonneur per count. If drawn hook tests fail at small sizes, leave layout 0's
   hooks and move only layouts 1-2. Confirm the pick at 20 seeds per layout for 0 and 4 bells.
2. Room 4. Add the enemyHp plumbing test 'CAL-F3: the clockwork loft spawns its staff at the room's HP'. Screen fresh pair,
   12 seeds per layout: { clapper: 12 } -> { clapper: 12, detuner: 6 } -> { clapper: 16, detuner: 6 }. Stop by the selection rule.
   Confirm at 20 seeds per layout. Room 3 and the heart must not move.
3. Registrar. Screen move 2 on the heart only, parties 1-3, 24 seeds per layout. Apply only if solo <= 31 %, duo <= 61 % and
   trio >= 80 %. Otherwise keep move 1 and record solo +11 / duo +8 as an accepted miss under the delegation.
   The Registrar-note watch item stays as it is.

Owed by this pack: four-bell band, foundry room 4, CG-9 small-party gap. A miss after H3 goes to question 2 with numbers.
Done when: the two new CAL-F3 tests pass; 'BF-12: every heart layout passes checkRoom with its tones, hooks and staff', 'BF-8: hooks hang the rung notes: a named hook its note, bare hooks the rest in reading order', 'KIT-R3: foundry frame places the Carillonneur ...' and 'EN-K6: the Carillonneur hangs four hook tiles and lists the tune' pass; 'CAL-4: foundry party and hung-bell tables' and 'CAL-4: academy fresh and worn combat tables' pass their no-throw/cap checks and print. The verification files give paired 0-4 tables, room-4 and Registrar rows, and band status.
Verify: pnpm vitest run tests/data/foundry-rooms.test.ts tests/districts/foundry/peal.acceptance.test.ts tests/districts/heart-frames.test.ts tests/districts/bf0-contracts.test.ts tests/rivals/carillonneur.test.ts tests/rivals/registrar.test.ts --reporter=dot; then, alone: pnpm vitest run tests/drawing/kits-c.test.ts --testTimeout=400000 --reporter=dot
Sims owned: foundry-calibration (CAL4=1 CAL4_PARTIES=2 CAL4_POLICIES=aware CAL4_BELLS=... CAL4_HEART_ONLY=1, and room 4), cartographers-calibration (CAL4_ROOMS=5 CAL4_SKIP_WORN=1), tests/sim/foundry.test.ts.
Phone check: no.
```

## Pack CAL-F4 (Codex Sol 6.2 high)

```text
Pack CAL-F4 (BR-21, BH-16): tasks 1 -> 2 -> 3 (Chief 30 diagnosis; authored Chief pick; baths heart confirmation).

Read: docs/plans/bridges-verification.md "Approved numbers applied" and the orchestrator note; docs/plans/bathhouses-verification.md "Approved numbers applied"; pattern: tests/sim/bridges-calibration.test.ts.
Owns: src/data/districts/bridges/types.ts (BRIDGE_TUNING.chiefHp and foes.chiefWarden.hp), src/data/rivals/chiefWarden.ts (hp);
       tests/districts/br0-contracts.test.ts (pins chiefHp 28);
       tests/sim/bridges-calibration.test.ts, tests/sim/bathhouses-calibration.test.ts, tests/sim/calibration/bath-bridges.ts
       (heart-only depth filter, a first-seed option and per-fight timing lines, if missing);
       docs/plans/bridges-verification.md, docs/plans/bathhouses-verification.md.
Tests pinning old numbers: br0-contracts 'chiefHp toBe(28)'. chiefWarden.test.ts and bridges/heart.test.ts read the data (no edit).

Trace:
- Three places hold the Chief's HP: BRIDGE_TUNING.chiefHp, foes.chiefWarden.hp (the shell in bridges/enemies.ts reads it) and
  rivals/chiefWarden.ts. The heart is one encounter with a sound and a crumbling variant, and EncounterDef.enemyHp is
  per encounter, not per variant, so a per-span HP would need a new field. That is not this pack.
- After CAL-F1 the drawn Chief reads DRAWN_CHIEF_WARDEN_HP (28), so an authored change no longer reaches EN-K8.
- Prior evidence (aware fresh pair): 28 gave 16/16 sound and 15/16 crumbling (16 seeds); 32 gave sound 32/40 (8 stalls) and
  crumbling 27/40 (13 losses, 0.28 falls per fight). A 40-seed run at 30 ran over an hour; a 16-seed retry passed 14 minutes,
  against about 3 for 28 or 32. The cause is unknown.
- Baths heart after CAL-3: 42/90, 48 stalls, 0 losses, seeds 1-30; first boil dusk 4 (median).

Contract:
  "On each span, aim for 75-90% fresh-pair heart wins and 25-35% worn-pair clears per trip started. Count stalls separately."
  Worn-pair clears are a known charge-economy miss: report them, do not target them. No change to span support, collapse, Hold or stoke.
  Baths: "40-55% fresh-pair heart wins", first boil not before round 3, median boils <= 1 at heat 1-2. No baths number changes here.

1. Chief 30, one seed at a time, both spans, with wall time per fight printed. If any single fight runs over 5 minutes, stop:
   record seed, span, round, action count and the state's unit list, report it as a bot-performance finding, and continue
   with task 2 without 30.
2. At 40 seeds per span (fresh pair, aware, heart only), measure 30 if task 1 cleared it, and 28 (the current value,
   measured so far only at 16 seeds); 32 already has 40-seed rows. Apply the value with the smallest total distance outside
   75-90 % across the two spans; break ties by fewer stalls. Expected: 30, else 32. Update the three data places and the br0 pin.
   Rerun the authored bridges table once (BRIDGES_TABLE=1, 40 seeds, parties 2-3) to report worn clears and falls.
3. Baths heart, out of sample: fresh pair, aware, seeds 31-80 on all three layouts (150 fights): wins, losses, stalls, boils,
   first boil. Record the result against 40-55 % and keep the numbers. If it falls outside, report it with a proposal;
   do not tune here.

Owed by this pack: BR-21 sound overshoot; BH-16 heart verification.
Done when: br0-contracts and 'the Chief spawns at BRIDGE_TUNING.chiefHp' style heart tests pass at the new value; CAL-F1's drawn-Chief test still passes, now with authored and drawn values different; the bridges and baths verification files carry the 40-seed span table, the task-1 timing note and the out-of-sample baths heart row.
Verify: pnpm vitest run tests/districts/br0-contracts.test.ts tests/districts/bridges/heart.test.ts tests/rivals/chiefWarden.test.ts tests/drawing/kits-b.test.ts --reporter=dot
Sims owned: BRIDGES_TABLE=1 / BRIDGES_CANDIDATE=1 with BRIDGES_SEEDS and BRIDGES_OUT on tests/sim/bridges-calibration.test.ts; BATH_TABLE=1 BATH_CANDIDATE=1 BATH_DEPTHS=5 on tests/sim/bathhouses-calibration.test.ts.
Phone check: no.
```

## Pack CAL-F5 (Claude Sonnet high)

```text
Pack CAL-F5 (IQ-20-W): tasks 1 -> 2 (Wax out of room 4's terms and the bar restored; measure).

Read: docs/plans/ink-quarter-calibration.md "Open conflict" and "Proposals"; calibration-results.md IQ rows; pattern: tests/sim/ink-calibration.test.ts.
Owns: src/data/districts/inkQuarter/terms.ts (term-wax rooms and the file's comment);
       tests/sim/ink-calibration.test.ts (the room-5 55 % special case); tests/data/ink-quarter.test.ts;
       docs/plans/ink-quarter-calibration.md.
Tests pinning old numbers: ink-calibration.test.ts `room === 5 ? 55 : 75`. ink-quarter.test.ts 'rooms 3 and 4 offer one term at most,
       from Wax, Sand and the ledger' stays true as a subset; check it still passes.

Trace:
- INK_TERMS: term-wax { withinRounds 7, rooms [1, 2, 3] } (0-based; signed in room 4 = index 3, fought at the heart).
  ink-calibration builds one test per (term, signed room), so removing index 3 removes the 'term-wax, fought in room 5' case.
  Sand and the ledger keep room 4 (winRoom conditions, unaffected by fight length).
- The heart after CAL-2: 4 shielded letters, burst 4; won 95, lost 12, stalled 13 of 120; wax paid 58 of 95 wins (61 %).
- "Each page is offered on a term until it is found": Wax remains offered in rooms 2-3.

Contract:
  Keep terms 5/6/7, the deliveries (3 shields, burst 4) and "the heart can be lost". Meetability: "the condition holds in a
  clear majority of the wins" at 75 % for every room. DESIGN.md and the district design doc are the orchestrator's to update (§11 row).

1. Set term-wax rooms to [1, 2] and fix the comment ("Wax is termed in rooms 2-3, Sand in rooms 2-4"). Remove the room-5
   55 % branch so every term room uses 75 %.
2. INK_CAL=1 at 120 fresh seeds: the term table (fairness and meetability for every remaining term room); the heart row
   (wins/losses/stalls must match CAL-2's, since the heart fight is unchanged); and wax found per trip under the never,
   always and winRoom signing policies, before and after. Report the drop in wax found; no target.

Owed by this pack: IQ-20-W.
Done when: every 'inkQuarter:term-*, fought in room N' case passes at 75 %; 'a won heart banks the page, once' and 'a wiped heart keeps a held page and banks none' pass unchanged; ink-quarter.test.ts and terms fairness tests pass; the calibration file holds the before/after rows.
Verify: pnpm vitest run tests/data/ink-quarter.test.ts tests/districts/inkQuarter/terms.test.ts tests/sim/postmaster-heart.test.ts tests/sim/ink-calibration.test.ts --reporter=dot
Sims owned: INK_CAL=1 pnpm vitest run tests/sim/ink-calibration.test.ts --reporter=dot (and the ink trip runs it uses).
Phone check: no.
```

## Records for the orchestrator at merge

- results.md: one row per applied or retained value above, in the shared schema, with the selection-rule reason. The Registrar's "accepted miss" and the baths "verified, unchanged" are rows too.
- DESIGN.md §11: Wax no longer offered in room 4 (CAL-F5); the room-level HP overrides in canals and foundry room 4, plus the second eel (CAL-F2/F3), if applied; the moved heart hooks (CAL-F3). TECH.md §7: the bot fix (CAL-F1) and the drawn Chief frame HP.
- The status file's Open questions: questions 1–3 above, defaults held.
