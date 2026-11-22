# Drawn calibration: briefs for the CAL-5 structural findings

CAL-5S, G, P and R are merged (briefs deleted; `git log --grep 'CAL-5[SGPR]'`). Remaining: **CAL-5H** below, traced at `2c87ba3` (2026-11-22, CAL-G1 design window). The findings table is history, traced at `bade83e` (2026-11-21, design window, Opus high). Sources: [drawn-calibration.md](drawn-calibration.md) ("Design findings for a separate brief", "Cross-kit reproduction", the approval rows), [calibration-results.md](calibration-results.md). The [shared measurement and approval contract](calibration-briefs.md#shared-measurement-and-approval-contract) applies unchanged: the standing delegation of 2026-11-20, isolated candidates, one writer for the common table, stalls counted as non-wins and reported separately. These packs continue **CAL-5** (task 3). They are checklists under that ID, not a new plan.

Delete each brief here when its pack merges.

## Findings and the mechanism each pack builds

| Finding (CAL-5, `48ac3f0`) | Cause traced in the code | Mechanism (no balance number is chosen here) | Pack |
|---|---|---|---|
| 99 of 534 offered ordinary boards invalid on piece reach; 653 attempts held back on `kit` | Three reach rules disagree. `generate.ts::walkable` walks anything not `blocksUnits`, so it walks through water and drops. `castable` (4 tiles) lets flying and anchored foes count as reached. The paper's `holdsOpen` (cartographers.ts) and the pier/span `strandedBy` (bridges.ts) walk on foot only, with water unstandable and no cast. So a generator-placed eel in a lane, or a flyer across a drop, fails the piece check. `checkGenerated` also validates every *selected* piece on the minimum fallback, which lays no pieces | One shared reach rule in `src/engine/drawing/reach.ts`, read by the generator, the paper and the bridge kits. Footing matches the engine's `standableTile`. Reach is judged after unsupported spans fall, plus a cast of at most `GEN_LIMITS.castReach` (4) tiles. **As shipped (8c7192f): any foe counts as reached when such a cast lands on the walkable region** (the party casts at what it cannot walk to), not only flying, anchored or water foes. A selected piece is validated only when it is on the board. Result: invalid offers 99 → 0 | G1 |
| Walkovers 76/534 (14.2 %) vs EN-S2's 10 % (57 of them solo). After G and R: 484/2,670 (18.1 %) on the 10-seed corpus; resolved by CAL-G1 G1-2 | (a) A held-back attempt (guardrail failure, no bot run) steps the budget **down** like a loss. P28 says "+1 after a walkover, −1 after a loss"; a held attempt carries no difficulty signal, so the walk drifts toward easy rooms. With 653 kit holds this happened often. (b) The budget candidates CAL-5 measured were rejected for raising invalid and unverified offers. The invalid part is the reach bug | A held-back attempt keeps its budget (P28 read literally; decided here under the delegation). After G1 and G2, R re-screens CAL-5's two budget candidates | G2, R |
| Drawn hearts: pair light 78 / medium 66 / heavy 78 % (pooled 76.0 / 70.8 / 74.0) vs EN-13 60-75 / 45-60 / 30-45 | `baseBudget` reads the weight band, but `composeHeart` uses the master's fixed frame, and `checkGenerated` exempts heart foe cost. Weight changes nothing at the heart | Weight-linked heart HP: `DRAWN_HEART_HP_BONUS` by band, **default 0/0/0** (no behaviour change). One function feeds the lite trial, the fallback trial and the played heart. R measures the CAL-5 prototype (4/12/24). Both HP candidates rejected; retained 0/0/0 and deferred escorts by weight (CAL-G1 G1-1) | G3, R |
| Steward judge parity (heat 1 in the trial vs 4 in the app) | `generate.ts::trial` calls `listRules(state, ids)` with default configs. `inkedPage.ts::heartConfig` gives the played heart heat `HEART_HEAT`, the tune its trip seed and the guild's hand its pencil | One `heartConfig` shared by the trial and `roomSetup` | G4 |
| Fourth peal note displaced on length-6 trips (`1,2,3,4,1` hung as `1,1,2,3`) | `districts/foundry/peal.ts::alliedBellEdits` sorts all rung notes, then hands duplicates to bare hooks before distinct notes | Distinct notes first (named hooks honoured), then duplicates fill the bare hooks left. Five entries stay in trip state (already true: `pealAfterRoom` binds `rooms: length - 1`) | P1 |
| A peal with a hookless heart hangs zero bells (Heavy Marginalia pair, seed 2) | Only the Carillonneur's frame has `{hook}` tiles | Hang zero (unchanged), and **disclose it at the drawing table** (default held; player question below) | P2 |

## Held defaults (player questions; none blocks a pack)

1. **Stalls count as heart misses:** yes. R's selection prefers loss-shaped candidates and flags any heart whose median win round is above 25 for a playtest feel check.
2. **Hung bells act directly on the Carillonneur:** no. P must not add damage or any other effect from hung bells to the Carillonneur.
3. **Lamplighter kit stronger:** no. No pack here touches his kit.
4. **New: a peal drawn with a hookless master:** default *disclose and hang nothing* (P2). The alternative, earned bells hanging on any heart, is a rule and needs the player.
5. **The heart lever was HP by weight** (G3/R). Both candidates were rejected (unverified offers above the +5 rule and stall-shaped). CAL-G1 retained 0/0/0 and deferred "escorts by weight" to after the playtest, because it faces the same generator filter (G1-1). No pack builds it.
6. **EN-13 bands read pooled** (equal weight across solo, pair and trio and the eight masters), as CAL-5 measured. Each lineup is printed alongside.

## CAL-G1 decisions (2026-11-22)

The dispositions for every measured miss are in [calibration-results.md](calibration-results.md#cal-g1-dispositions-design-window-2026-11-22-under-the-standing-delegation), rows G1-1 to G1-12. The only fix chosen is the drawn Steward's own HP (G1-3), CAL-5H below. Everything else is retained with a recorded miss or closed. The Close ([calibration-briefs.md](calibration-briefs.md#pack-cal-g1-close-routine-orchestrator-opus-high-suggested-runner-claude-only)) starts when CAL-5H merges.

## Order and concurrency

| Window | Packs (disjoint Owns) | Runner / model / effort | Starts when | Budget |
|---|---|---|---|---|
| Routine | **CAL-5H** drawn Steward HP: mechanism → paired screen → application and final heart rerun (the window's only slow-sim runner) | Codex, Sol 6.2 high (`gpt-6.2-sol`): measurement-heavy with a Verify command. Fallback: Claude Sonnet 5.5 high | now | 90 min pack, 30 min per shard |
| Then | **CAL-G1** Close (calibration-briefs.md): tables, full gate, phone loop, code review, records | routine orchestrator (Claude, Opus high) | CAL-5H merged | |

---

## Pack CAL-5H (Codex Sol 6.2 high): the drawn Steward's own HP and the final heart rerun

```text
Pack CAL-5H of calibration-plan.md (CAL-5 task 3, drawn hearts): tasks H1 -> H2 -> H3 (the drawn Steward's own HP; paired screen;
application and the final heart rerun).
Base commit: <main at spawn>. Budget: 90 min pack, 30 min per shard. One shard at a time, each under `caffeinate -i` in the
background with its own log in /tmp/cal5h/ (macOS has no `timeout`: prefix `perl -e 'alarm 1800; exec @ARGV' --`).

Read: docs/plans/calibration-results.md "CAL-G1 dispositions", row G1-3; docs/plans/drawn-calibration.md "Task 3 remeasure (CAL-5R)"
      §1 (the per-master heart table) and §2 (its commands); pattern: commit 930f5a8 (CAL-F1, which pinned the drawn Chief Warden's
      HP: one drawing.ts constant, one frame line and one kits-b test).
Own: src/data/drawing.ts (DRAWN_STEWARD_HP only), src/engine/drawing/frames/steward.ts (the frame's enemyHp line and its doc comment);
     tests/drawing/kits-b.test.ts (one added case), tests/sim/drawn-calibration.test.ts (three candidate cases in the vi.mock switch,
     nothing else); docs/plans/drawn-calibration.md (a new section "Drawn Steward HP (CAL-5H)"; earlier sections stay as history).
Conditional (change only as stated; list it as a Proposal): tests/drawing/kits-b.scripts.ts, SCRIPTS_B.bathSteward and the comment
     above it. Change it only if the applied value makes 'EN-K4: the fallback board passes checkGenerated and has a scripted solve'
     fail, because the script now wins earlier and a later step throws "The battle is over". Then cut the script after the winning
     step, or re-record it from the lite bot as CAL-3 did. The assertion (phase 'won') stays.
Read-only and must stay green: tests/drawing/generator.test.ts ('EN-2: unverified fallbacks are zero' lists bathSteward),
     tests/drawing/honest-trial.test.ts (the CAL-5G Steward config case), tests/drawing/heart-hp.test.ts, tests/drawing/acceptance.test.ts,
     tests/districts/bathhouses/**, tests/rivals/bathSteward.test.ts, tests/sim/bathhouses-calibration.test.ts (the authored Steward
     keeps BATH_STEWARD.hp = 38; that file is not touched).
Tests pinning old numbers: no test reads the drawn Steward's HP. The script above is the only replay recorded at 38.

Trace:
- The drawn Steward spawns at ENEMIES.bathSteward.hp = BATH_STEWARD.hp (src/data/districts/bathhouses.ts) = 38. CAL-3 set that
  value (3778348: 14 -> 38) for the authored party-2 heart. frames/steward.ts has no enemyHp. marginalia.ts has
  DRAWN_MARGINALIA_HP 16 (CAL-1) and chiefWarden.ts has DRAWN_CHIEF_WARDEN_HP 28 (CAL-F1); both were pinned when the authored
  value moved.
- heart.ts::heartEnemyHp(drawing) returns frame.enemyHp while the band bonus is 0 (DRAWN_HEART_HP_BONUS is 0/0/0). With a bonus it
  adds it to frame.enemyHp?.[master] ?? ENEMIES[master].hp. Its readers are generate.ts::trial (generated attempts and the fallback
  trial) and districts/inkedPage.ts::inkedRoom (the played heart). The frame line therefore moves all three together. Reload
  determinism is unchanged: the trip's drawing snapshot fixes the frame.
- kits-b.scripts.ts::scriptedSolveB replays the script at frame.enemyHp, so it follows the frame.
- The corpus test: CAL5=1 CAL5_MASTER=bathSteward measures only the three Steward drawings' fresh hearts, at parties 1-3
  (onlyHearts). CAL5_HEART_SEEDS sets the heart seeds (default 4 under CAL5=1). Candidates go through vi.mock('$data/drawing')
  keyed on CAL5_CANDIDATE (see 'marginalia32').
- CAL-5R baseline (8c7192f, heart seeds 1-4): Steward 28/0/8 W/L/S of 36. Solo 12/0/0, with a median of 40 rounds in every band
  (wins at the 40-round cap). Pair 4/0/8, with stalls at 41 rounds and 8-13 HP left. Trio 12/0/0 in 7-8 rounds.
  Fallback/unverified 17/14. Trial and app heat 4 throughout.

Contract:
  "Heart win rates light 60–75 %, medium 45–60 %, heavy 30–45 % (bot, fresh HP)." Held defaults 1 and 6 of this file apply (stalls
  are non-wins; EN-13 is read pooled). Never raise round, action or generation caps. The authored Steward stays 38. Every new
  number lives in src/data/drawing.ts, and the frame imports it from '$data/drawing' so the corpus mock reaches it.
  Selection rule (decided by CAL-G1, 2026-11-22). Candidates: 38 (current), then 30, 24 and 14 (EN-K4's designed value). Pick the
  highest HP that meets all three conditions on the 10-seed screen:
    (a) for every lineup, the median win round over the three Steward drawings is 25 or less;
    (b) Steward stalls are no more than at 38;
    (c) Steward unverified offers are no more than at 38.
  If none meets (a)-(c), retain 38 and record the miss. Report the selected value's EN-13 cost (the change in pooled wins per band)
  with the pick. The cost does not veto the pick (G1-3 accepted it).

H1. Mechanism, no behaviour change. Write the test first, in kits-b.test.ts beside CAL-F1:
    'CAL-5H: the drawn Steward keeps DRAWN_STEWARD_HP'. It checks that the frame's enemyHp equals { bathSteward: DRAWN_STEWARD_HP }
    and that a played drawn heart, built through inkRoom and beginEncounter, spawns the Steward with hp and maxHp equal to
    DRAWN_STEWARD_HP. It reads the constant and never pins a number.
    Then drawing.ts gets `export const DRAWN_STEWARD_HP = 38;` with the comment the other two carry, and frames/steward.ts gets
    `enemyHp: { bathSteward: DRAWN_STEWARD_HP }`.
    Corpus candidates: 'steward30', 'steward24', 'steward14' -> { ...data, DRAWN_STEWARD_HP: n }.
H2. Paired screen. Each shard runs `env CAL5=1 CAL5_MASTER=bathSteward CAL5_HEART_SEEDS=10 CAL5_DETAIL=1 [CAL5_CANDIDATE=<c>]
    pnpm vitest run tests/sim/drawn-calibration.test.ts --reporter=dot`, with 90 hearts each (3 drawings x lineups 1-3 x seeds 1-10).
    s1 runs the defaults. Then run the candidates in descending order (30, 24, 14) and stop at the first that meets (a)-(c).
    For each shard and lineup report W/L/S, median rounds, median win rounds, HP left, fallback/unverified, trial and app heats, and
    wall time.
H3. Apply the pick in drawing.ts, or retain 38. If you apply a value: take the conditional script step if needed, then rerun the three
    fresh-heart shards paired to CAL-5R (`env CAL5=1 CAL5_HEARTS=1 CAL5_DETAIL=1 CAL5_BAND=<band>`, heart seeds 1-4, each under the
    same 30-minute cap). Publish the final EN-13 table: band, pooled wins, W/L/S, solo/pair/trio, fallback/unverified and the miss,
    with the per-master rows. In either case, write the approval row (schema in calibration-briefs.md) and return it in the report
    for calibration-results.md.

Owed by this pack: the drawn Steward's 40-round wins (status Next 2; CAL-G1 G1-3) and the final EN-13 numbers for CAL-G1's table.
Done when: 'CAL-5H: the drawn Steward keeps DRAWN_STEWARD_HP' passes; EN-2, the EN-K4 scripted solve, and the CAL-5G heart-hp and
honest-trial cases pass; the section has the screen table with its commands, the pick and its reason under the rule, and, if a value
was applied, the final EN-13 table; `pnpm check:fast` passes.
Verify: pnpm vitest run tests/drawing/kits-b.test.ts tests/drawing/acceptance.test.ts tests/drawing/heart-hp.test.ts tests/drawing/honest-trial.test.ts tests/drawing/generator.test.ts --reporter=dot --testTimeout=400000
Sims: tests/sim/drawn-calibration.test.ts as above (run-only apart from its three candidate cases). Do not run
tests/sim/generator.test.ts: its fuzz never generates a heart (room <= length - 2). Do not run the household sweep: it plays authored
districts only.
Phone check: no.
```
