# Drawn calibration: briefs for the CAL-5 structural findings

Traced at `bade83e` (2026-11-21, design window, Opus high). Sources: [drawn-calibration.md](drawn-calibration.md) ("Design findings for a separate brief", "Cross-kit reproduction", the approval rows), [calibration-results.md](calibration-results.md). The [shared measurement and approval contract](calibration-briefs.md#shared-measurement-and-approval-contract) applies unchanged: the standing delegation of 2026-11-20, isolated candidates, one writer for the common table, stalls counted as non-wins and reported separately. These packs continue **CAL-5** (task 3). They are checklists under that ID, not a new plan.

Delete each brief here when its pack merges.

## Findings and the mechanism each pack builds

| Finding (CAL-5, `48ac3f0`) | Cause traced in the code | Mechanism (no balance number is chosen here) | Pack |
|---|---|---|---|
| 99 of 534 offered ordinary boards invalid on piece reach; 653 attempts held back on `kit` | Three reach rules disagree. `generate.ts::walkable` walks anything not `blocksUnits`, so it walks through water and drops. `castable` (4 tiles) lets flying and anchored foes count as reached. The paper's `holdsOpen` (cartographers.ts) and the pier/span `strandedBy` (bridges.ts) walk on foot only, with water unstandable and no cast. So a generator-placed eel in a lane, or a flyer across a drop, fails the piece check. `checkGenerated` also validates every *selected* piece on the minimum fallback, which lays no pieces | One shared reach rule in `src/engine/drawing/reach.ts`, read by the generator, the paper and the bridge kits. Footing matches the engine's `standableTile`. Reach is judged after unsupported spans fall, plus a cast of at most 4 tiles for flying, anchored or water foes. A selected piece is validated only when it is on the board | G1 |
| Walkovers 76/534 (14.2 %) vs EN-S2's 10 % (57 of them solo) | (a) A held-back attempt (guardrail failure, no bot run) steps the budget **down** like a loss. P28 says "+1 after a walkover, −1 after a loss"; a held attempt carries no difficulty signal, so the walk drifts toward easy rooms. With 653 kit holds this happened often. (b) The budget candidates CAL-5 measured were rejected for raising invalid and unverified offers. The invalid part is the reach bug | A held-back attempt keeps its budget (P28 read literally; decided here under the delegation). After G1 and G2, R re-screens CAL-5's two budget candidates | G2, R |
| Drawn hearts: pair light 78 / medium 66 / heavy 78 % (pooled 76.0 / 70.8 / 74.0) vs EN-13 60-75 / 45-60 / 30-45 | `baseBudget` reads the weight band, but `composeHeart` uses the master's fixed frame, and `checkGenerated` exempts heart foe cost. Weight changes nothing at the heart | Weight-linked heart HP: `DRAWN_HEART_HP_BONUS` by band, **default 0/0/0** (no behaviour change). One function feeds the lite trial, the fallback trial and the played heart. R measures the CAL-5 prototype (4/12/24) | G3, R |
| Steward judge parity (heat 1 in the trial vs 4 in the app) | `generate.ts::trial` calls `listRules(state, ids)` with default configs. `inkedPage.ts::heartConfig` gives the played heart heat `HEART_HEAT`, the tune its trip seed and the guild's hand its pencil | One `heartConfig` shared by the trial and `roomSetup` | G4 |
| Fourth peal note displaced on length-6 trips (`1,2,3,4,1` hung as `1,1,2,3`) | `districts/foundry/peal.ts::alliedBellEdits` sorts all rung notes, then hands duplicates to bare hooks before distinct notes | Distinct notes first (named hooks honoured), then duplicates fill the bare hooks left. Five entries stay in trip state (already true: `pealAfterRoom` binds `rooms: length - 1`) | P1 |
| A peal with a hookless heart hangs zero bells (Heavy Marginalia pair, seed 2) | Only the Carillonneur's frame has `{hook}` tiles | Hang zero (unchanged), and **disclose it at the drawing table** (default held; player question below) | P2 |

## Held defaults (player questions; none blocks a pack)

1. **Stalls count as heart misses:** yes. R's selection prefers loss-shaped candidates and flags any heart whose median win round is above 25 for a playtest feel check.
2. **Hung bells act directly on the Carillonneur:** no. P must not add damage or any other effect from hung bells to the Carillonneur.
3. **Lamplighter kit stronger:** no. No pack here touches his kit.
4. **New: a peal drawn with a hookless master:** default *disclose and hang nothing* (P2). The alternative, earned bells hanging on any heart, is a rule and needs the player.
5. **New: the heart lever is HP by weight** (G3/R), as the CAL-5 finding asked. If every HP candidate is stall-shaped or turns hearts unverified, R records the miss and names "escorts by weight" as the next lever for the player. R does not build it.
6. **EN-13 bands read pooled** (equal weight across solo, pair and trio and the eight masters), as CAL-5 measured. Each lineup is printed alongside.

## Order and concurrency

| Window | Packs (disjoint Owns) | Runner / model / effort | Starts when | Budget |
|---|---|---|---|---|
| 1 | **CAL-5S** household sweep, sharded (the window's only slow-sim runner) | Codex, Sol 6.2 high (`gpt-6.2-sol`) | now | 90 min pack, 30 min per shard |
| 1 | **CAL-5G** reach rule → walk → heart HP mechanism → Steward parity | Claude, Sonnet 5.5 high (`sonnet`) → Opus 5.5 medium on a failed review | now; its one slow sim waits for S's slot ("sims owed") | 120 min pack, 30 min per command |
| 1 | **CAL-5P** peal notes → hookless notice → drawn Cleared copy | Claude, Sonnet 5.5 high (`sonnet`); needs the autofixer and a phone check | now | 90 min pack |
| 2 | **CAL-5R** drawn remeasure, sharded: baseline → candidates → application | Codex, Sol 6.2 high (`gpt-6.2-sol`) | G and P merged, S finished | 120 min pack, 30 min per shard |
| Then | **CAL-G1** (calibration-briefs.md) | design window | R merged | |

G and P share no file. S writes only its section of `drawn-calibration.md`, and R appends to that file later. G and P are edit-heavy and go to Claude (Spread by task type). If Claude is past 50 % of its 5h limit and Codex is under 30 % when you spawn, move G to Codex Sol 6.2 high: it has a Verify command and needs no browser. P stays on Claude.

---

## Pack CAL-5S (Codex Sol 6.2 high): household sweep, sharded

```text
Pack CAL-5S of calibration-plan.md (CAL-5 task 3, household part): tasks 1 -> 2 (sharded household sweep at 10 seeds; report).
Base commit: <main at spawn>. Budget: 90 min pack, 30 min per shard. Shards run one at a time (one slow sim on the machine).

Read: docs/plans/drawn-calibration.md "Task 3 verification" (the household paragraph and the Bridge 3.4 repro); tests/sim/household-sweep.test.ts (lines 40-60 and the describe blocks); pattern: none (run-only).
Own: docs/plans/drawn-calibration.md (a new section "Household sweep, sharded (CAL-5S)" only); /tmp/cal5s/*.log.
Read-only: tests/sim/household-sweep.test.ts (assertions and results contract unchanged; no env filter is added).
Tests pinning old numbers: none (no data changes).

Trace:
- The file has no district filter: HOUSEHOLD_SWEEP=1 turns on FULL (40 rounds, the report, 400 walks); HOUSEHOLD_SEEDS=n sets SEEDS
  (the "<id> alone" tests use min(SEEDS, 20)). Shard by test name with -t (a regex on the full name).
- At 50 seeds the unfiltered run did 33,170 fights in about 3 h before SIGTERM (exit 143, no assertion failure). At 10 seeds a
  lineup shard is 107 layouts x 10 = 1,070 fights, about 6 minutes at that rate.
- The HC-9 random-walk occupancy assertion was fixed before 48ac3f0 (it skips out-of-room units). The Bridge 3.4 repro
  (The lantern ledge, seed 5218, Stoker/Tuner/Owner) is the case to watch.
- The sweep plays authored districts only (PLAYABLE_DISTRICTS); the drawn packs G, P and R change nothing it reaches
  (P's peal allocation is identical when the notes are distinct, which every authored foundry trip's are).

Contract:
  "tests/sim/household-sweep.test.ts unchanged in result" means its original safety/placement/determinism acceptance passes,
  with no hidden skip or relaxed assertion. Distinguish a changed balance report from a broken invariant.
  Its win rates are not targets. A red assertion is a finding to report with its exact repro, not a test to edit.

1. Run these shards in sequence, in the background, each under `caffeinate -i` with its own log in /tmp/cal5s/ and a 30-minute cap
   (macOS has no `timeout`: prefix `perl -e 'alarm 1800; exec @ARGV' --`). Common prefix:
   `HOUSEHOLD_SWEEP=1 HOUSEHOLD_SEEDS=10 pnpm vitest run tests/sim/household-sweep.test.ts --reporter=verbose -t '<pattern>'`
   s1 'rooms hold up for every party size|the founders on the drawn spots'
   s2 '^.*D alone: no throw'      s3 '^.*S alone: no throw'      s4 'D\+S: no throw'
   s5 'D\+S\+R: no throw'         s6 'S\+R\+D: no throw'
   s7-s9 the nine '<id> alone plays their rooms' tests in three groups of three, in APPRENTICE_IDS order (get the exact names
         with `pnpm vitest list tests/sim/household-sweep.test.ts`), e.g. '(draughtsman|stoker|runaway) alone plays'
   s10 'trips run to a wipe or the heart'   s11 'random legal walks'
   A shard that hits its cap: record it as capped with the last batch logged, split it (e.g. s10 per lineup), rerun once.
   After every finished shard, write its pass/fail line and the printed table into the section (so a stop loses nothing).
2. Report in the section: per shard the test names, pass/fail, wall time, fights; the lineup tables (won/lost/stalled per district)
   as printed; any assertion failure with its exact repro (room, seed, lineup, walk/action). Compare each lineup's district rates
   with the 50-seed first batch where one exists (D alone: 60/23/17 % W/L/S) and flag any shard whose rate differs by more than
   10 points (the experiment's rule: such a shard reruns at 20 seeds).

Owed by this pack: the CAL-5 household gate (status Next 1).
Done when: every shard s1-s11 has a recorded pass (or a reported assertion failure with its repro) at HOUSEHOLD_SEEDS=10; the
section lists wall time per shard; no test file changed.
Verify: the shard logs (tail -30 of each).
Sims: tests/sim/household-sweep.test.ts, run-only, as above. Nothing else.
Phone check: no.
```

---

## Pack CAL-5G (Claude Sonnet 5.5 high): one reach rule, the walk, weight-linked heart HP, Steward parity

```text
Pack CAL-5G of calibration-plan.md (CAL-5 structural findings): tasks G1 -> G2 -> G3 -> G4.
Base commit: <main at spawn>. Budget: 120 min pack, 30 min per command.

Read: docs/plans/drawn-calibration-briefs.md "Findings and the mechanism each pack builds" (rows G1-G4);
      docs/plans/drawn-calibration.md "Design findings for a separate brief" and "Cross-kit reproduction";
      pattern: src/engine/drawing/kits/bridges.ts (strandedBy: a BFS with a `gone` set) and tests/drawing/honest-trial.test.ts
      (capturing the trial's battle states via the botTrial mock).
Own: src/engine/drawing/reach.ts (new), src/engine/drawing/heart.ts (new), src/engine/drawing/generate.ts,
     src/engine/drawing/kits/cartographers.ts, src/engine/drawing/kits/bridges.ts, src/engine/drawing/index.ts (exports only),
     src/engine/districts/inkedPage.ts, src/data/drawing.ts (GEN_LIMITS.castReach and DRAWN_HEART_HP_BONUS only);
     tests/drawing/reach.test.ts (new), tests/drawing/heart-hp.test.ts (new), tests/drawing/honest-trial.test.ts (one added case),
     tests/drawing/r8-reach.test.ts, tests/sim/generator.test.ts (the EN-S2 walk expectation for held-back attempts only).
Conditional (a test you may change only as stated, and must list as a Proposal):
     tests/drawing/generator.test.ts 'EN-2: unverified fallbacks are zero': if bathSteward goes red only because its trial now runs
     at HEART_HEAT (G4), move it out of the list with a comment like the Lamp-mother's, giving the trial result.
Read-only and must stay green: tests/drawing/acceptance.test.ts (EN-2 hearts and every frame's fallback green under
     checkGenerated; strandedBy on span choices), tests/drawing/kits-b.test.ts (strandedBy/unsupportedSpans cases, incl. the
     12-span board at line 219), tests/drawing/kits-a/kits-c, tests/drawing/r8-placement.test.ts, tests/districts/inkedPage/*.
     If one turns red under the shared rule, leave that item undone and report the board, the foe and the tile: an authored
     fallback or heart board is not edited in this pack.
Tests pinning old numbers: none for values (no test reads GEN_TUNING except tests/sim/drawn-calibration.test.ts mocks).
     Behaviour pins: tests/sim/generator.test.ts 'EN-S2: the budget walks up after a walkover and down after a loss'
     (line ~234, `else expect(b.budget).toBe(Math.max(1, a.budget - step))` covers held attempts); see G2.

Trace:
- Reach today, three rules:
  generate.ts::walkable(layout): BFS from starts[0] over tiles with !blocksUnits(t) -> water and drops count as walkable.
  generate.ts::castable(layout, walk, c): a cardinal line of up to BOLT_REACH = 4 to a walkable tile, stopped by blocksShots.
  placeKit keeps a tile if walk.has(c) || ((def.flies || def.anchored) && castable); checkGenerated's 'reach' guardrail is the same.
  cartographers.ts::reach/holdsOpen: BFS over standable = !blocksUnits && !drop && water === null; every start and every unit
  reached on foot, or standing on a PENCIL_PIECE tile (keep that exception). blankPiece.valid and outlinePiece.valid are holdsOpen.
  bridges.ts::strandedBy: gone = unsupportedSpans(layout); every start standing, all joined on foot (standing = !gone, !blocksUnits,
  !drop, water === null); every enemy in that region. spanKit.valid and pierKit.valid are holdsTogether = no unsupported span && !strandedBy.
  The engine's own footing is queries.ts::standableTile: !blocksUnits && !drop && !water && !pieceVoid (pieces.ts).
- checkGenerated (generate.ts, end): for every kit piece in spec.drawing.pieces, `!k.valid(layout)` adds 'Piece <id> is not valid
  on this layout'. compose(..., minimum = true) places no pieces, but this loop still runs on the fallback.
- Repro: CAL5_DRAWING='Medium Lamplighter' CAL5_DETAIL=1 CAL5_ORDINARY=1 (pair, seed 1) reports 'Piece cartographers:blank is not
  valid on this layout' at every ordinary depth; 'Heavy Mother' reports it for 'bridges:pier' at all five. Fixtures:
  tests/fixtures/calibration/drawings.ts (CAL_DRAWINGS, calibrationProfile, CAL_PARTIES).
- The walk: generateRoom sets `budget = Math.max(1, budget + (t.won ? step : -step))` after every attempt. heldBack(...) has
  won: null, so a guardrail failure steps down like a loss. P28: "+1 after a walkover, −1 after a loss (never below 1)".
- Heart HP readers: generate.ts::trial() `...(heart ? { enemyHp: frameOf(input.drawing).enemyHp } : {})` (generated attempts and the
  fallback trial both pass heart = true); districts/inkedPage.ts::inkedRoom `enemyHp = heart ? HEART_FRAMES[drawing.heart]?.enemyHp`
  (the played heart, via createEncounterBattle -> spawnEnemy: enemyHp[def.id] ?? def.hp). tests/drawing/kits-a.scripts.ts::scriptedSolve
  reads frame.enemyHp: leave it (it proves the fallback board is solvable at the frame's HP). Only marginalia (16) and chiefWarden (28)
  frames set enemyHp; the rest spawn at ENEMIES[setup.foe].hp. HeartSetup.foe is typed EnemyId | KitId; every frame's is an EnemyId.
  The drawing snapshot in trip state fixes the weight band for the whole trip, so a reload spawns the same HP.
- Rule configs: generate.ts::trialRules(drawing, heart) lists ids; trial() calls listRules(state, ids) with no config.
  inkedPage.ts::heartConfig(id, trip): tune -> { seed: trip.seed }, boil-over -> { heat: HEART_HEAT }, guild hand ->
  { ...(ROOM_PENCIL.at(-1) ?? DEFAULT_PENCIL) }; roomSetup applies it to the heart's frame rules only, a lent shape's config winning.
  GenInput.seed is the trip seed (drawing/trip.ts::roomInput).

Contract:
  "Preserve fresh-HP/charge judging, stored-room reload determinism, salted RNG, operation budgets and counted fallbacks.
   GEN_LIMITS.phone bars and the walkover definition are acceptance constraints, not knobs." (CAL-5 brief)
  "Never raise round, action or generation caps." Keep generateRoom/specFor/checkGenerated/inkRoom signatures and GenIssue shapes;
  keep strandedBy/unsupportedSpans exported from kits/bridges.ts (tests import them there; re-export if moved).
  Every new number lives in src/data/drawing.ts. heart.ts imports DRAWN_HEART_HP_BONUS from '$data/drawing' (not '$data'), so the
  corpus test's vi.mock('$data/drawing') reaches it. src/engine stays pure; no import of ui/ or app/.

G1. One reach rule. reach.ts exports (names may differ; one module, used by all three callers):
    footRegion(layout, gone?) — BFS from starts[0] over tiles where the standableTile predicate holds (blocksUnits, drop, water,
      void piece) and the tile is not in `gone`; gone defaults to unsupportedSpans(layout) (empty on a board without spans).
    castReach(layout, region, c) — a cardinal line of at most GEN_LIMITS.castReach (new, = 4, today's BOLT_REACH) tiles to a region
      tile, stopped by blocksShots.
    foeReached(layout, region, unit) — region has the tile, or (def.flies || def.anchored || def.habitat === 'water') && castReach.
    partyReach(layout) — { startsJoined, unreached: Coord[] } for the starts and every enemy.
    Rewire generate.ts (walkable, castable, placeKit, the 'reach' guardrail and the start check), cartographers.ts::holdsOpen (keep the
    pencil exception) and bridges.ts::strandedBy (keep its three messages and their order) onto it. In checkGenerated validate a
    selected piece only when a tile of the layout carries that piece id.
    Tests (tests/drawing/reach.test.ts, ASCII boards):
    'CAL-5G: an eel in a lane beside the shore is reached by the generator, the paper and the pier alike';
    'CAL-5G: a flyer across a drop is reached at 4 cast tiles and not at 5';
    'CAL-5G: a foe beyond water with no cast line is unreached by every check' (the generator used to walk through the water);
    'CAL-5G: reach is judged after unsupported spans fall';
    'CAL-5G: the minimum fallback validates only the selected pieces on its board';
    'CAL-5G: Medium Lamplighter and Heavy Mother offer no invalid piece at any ordinary depth (pair, seed 1)' (generateRoom per depth
    with the CAL-5 fixtures; no 'kit' or 'reach' issue on the offered layout; timeout 300_000 like the other heavy drawing tests).
    Extend r8-reach.test.ts only if a case there moves (report it).
G2. A held-back attempt keeps its budget: `t.won === null ? budget : Math.max(1, budget + (t.won ? step : -step))`; update the doc
    comment on generateRoom (it says "minus it after a loss or a guardrail failure"). Test: 'CAL-5G: a held-back attempt keeps its
    budget' (force a guardrail failure, e.g. vi.mock a kit's `valid` or a piece's `place`; see the rough edge on mocking $engine
    district modules). In tests/sim/generator.test.ts change only the walk expectation for `a.won === null` to `a.budget`.
G3. Weight-linked heart HP, mechanism only. drawing.ts: `DRAWN_HEART_HP_BONUS = { light: 0, medium: 0, heavy: 0 }` (satisfies
    Record<WeightBand, number>), comment: "Added to the drawn master's HP by weight band; CAL-5 measures it". heart.ts:
    heartEnemyHp(drawing): the frame's enemyHp with its master (frame.setup.foe) at base + bonus, base = frame.enemyHp?.[foe] ??
    ENEMIES[foe].hp; when the bonus is 0 return frame.enemyHp itself (so `undefined` stays undefined and inkedRoom's def is unchanged).
    Use it in trial() and inkedRoom. Tests (tests/drawing/heart-hp.test.ts; read the constant or mock it, never pin 0):
    'CAL-5G: with zero bonuses every heart keeps its frame enemyHp';
    'CAL-5G: a band bonus raises only the master, in the trial, the fallback trial and the played heart' (vi.mock '$data/drawing' with
    a non-zero bonus; capture the trial states as honest-trial does; build the played heart through inkedRoom/createEncounterBattle);
    'CAL-5G: every frame's master is an enemy with a base HP'.
G4. Steward judge parity. Move heartConfig to heart.ts as heartConfig(id: RuleId, tripSeed: number): Json | undefined; inkedPage
    calls it with input.trip.seed (behaviour identical: tests/drawing/honest-trial EN-K9 config cases pass unchanged); trial() passes
    the configs of the heart's frame rules (not the drawing's own rule) to listRules. Test (honest-trial.test.ts):
    'CAL-5G: the heart trial runs each frame rule at the config the played heart gets' (boil-over heat HEART_HEAT, tune seed = trip
    seed, guild hand = the hall's last pencil).

Owed by this pack: nothing further. The orchestrator records at merge: DESIGN §11 row "a held-back attempt keeps its budget (P28 read
literally)" and ending-plan P28's wording; "weight-linked heart HP, default 0" (numbers owed to CAL-5R).
Done when: the G1-G4 tests above pass; EN-K9/EN-K10, EN-2, EN-5, the kits-a/b/c scripted solves and inkedPage module tests pass
unchanged (or the stated conditional is reported); tests/sim/generator.test.ts passes 9/9 including 'EN-S2: offered rooms are
walkovers in at most 10 % of seeds' and the 50 deterministic replays; the report gives the 500-seed fuzz's fair-within-4, walkovers,
fallbacks and unverified before (94.0 %, 30, 0, 0) and after.
Verify: pnpm vitest run tests/drawing/reach.test.ts tests/drawing/heart-hp.test.ts tests/drawing/honest-trial.test.ts tests/drawing/r8-reach.test.ts tests/drawing/acceptance.test.ts tests/drawing/kits-b.test.ts tests/districts/inkedPage --reporter=dot --testTimeout=400000
Sims: `caffeinate -i pnpm vitest run tests/sim/generator.test.ts --reporter=dot` (about 2 min) for G1/G2, once, when the orchestrator
gives the slot (CAL-5S runs first); until then report "sims owed".
Phone check: no.
```

---

## Pack CAL-5P (Claude Sonnet 5.5 high): peal notes, hookless notice, drawn Cleared copy

```text
Pack CAL-5P of calibration-plan.md (CAL-5 structural findings): tasks P1 -> P2 -> P3.
Base commit: <main at spawn>. Budget: 90 min pack.

Read: docs/plans/drawn-calibration-briefs.md rows P1-P2 and "Held defaults" 2 and 4; docs/plans/drawn-calibration.md "Length-six peal
      setup probe" and "Steward, bells and peal" (last paragraph); pattern: src/engine/drawing/check.ts (sentences as exported consts)
      and src/ui/components/drawing/DrawingEditor.svelte (the `note-issue` paragraph).
Own: src/engine/districts/foundry/peal.ts (alliedBellEdits only); src/engine/drawing/check.ts (one new export);
     src/app/drawing.ts (TableView gains `caveats`; one helper for the cleared heading); src/ui/components/drawing/DrawingEditor.svelte;
     src/ui/screens/Cleared.svelte;
     tests/districts/foundry/peal.acceptance.test.ts (one added case), tests/drawing/peal-six.test.ts (new), tests/app/drawing.test.ts.
Read-only and must stay green: tests/drawing/kits-c.test.ts (EN-K6 hook cases), tests/districts/foundry/review.test.ts,
     tests/sim/drawn-calibration.test.ts ('CAL-5: length-six peal load and heart-hook capacity' still expects 4 allied bells).
Tests pinning old numbers: none. 'BF-8: hooks hang the rung notes ...' uses distinct notes, so its result [[0,4],[4,1],[6,3]] stays.

Trace:
- alliedBellEdits(state, hooks): notes = rung notes sorted; named = hook notes > 0; spare = notes not named (duplicates kept, sorted);
  hooks in reading order: a named hook takes its note if rung, a bare hook takes spare.shift(). For rung 1,2,3,4,1 and 4 bare hooks:
  spare = [1,1,2,3,4] -> 1,1,2,3. Callers: drawing/kits/foundry.ts::pealSetup (drawn heart: hooksOf(stored layout)) and
  districts/foundry/peal.ts::pealRoomSetup (authored heart: HEART_HOOKS; four rooms, four distinct notes, so no change there).
- pealAfterRoom already keeps the fifth entry (`rooms: input.length - 1`); the CAL-5 probe round-tripped all five through the save.
- Hooks exist only on the Carillonneur's frame (frames/carillonneur.ts fallback: four `{hook}`; districts/foundry/heartFrame.ts hangs
  four on every generated board, review.test.ts R6-7). hooksOf(layout) is exported from drawing/kits/foundry.ts. Other masters' hearts
  have none, so a peal paired with them hangs nothing.
- The drawing table: app/drawing.ts::tableView builds TableView (issues from checkDrawing); DrawingEditor.svelte shows
  `view.issues.filter(i => i.id === null)` as <p class="note-issue" data-testid="drawing-issue">. Issues block saving (canSave);
  a caveat must not.
- Cleared.svelte line 25: "The heart of {district name} is quiet." For an inked-page trip that reads "The heart of the inked page is
  quiet" (owed copy since Pack E). The drawing's name is parseInkedState(trip.kit.state).drawing.name.

Contract:
  P7 (foundry): "A hook that names a note takes that note if it was rung; the rest of the rung notes go to the bare hooks in reading order."
  Held default 2: hung bells get no new effect on the Carillonneur. Held default 4: a hookless heart hangs nothing; the table says so.
  Saving a drawing is unchanged: a caveat is never an Issue and never greys a row.

P1. Distinct notes first: after the named hooks take theirs, bare hooks take the distinct unhung notes in ascending order, then the
    duplicates. Tests: 'CAL-5P: five rungs 1,2,3,4,1 hang 1,2,3,4 on four bare hooks' (peal.acceptance) and
    'CAL-5P: a length-six drawn peal hangs four distinct notes at the Carillonneur's heart' (peal-six.test.ts, through pealSetup on the
    frame's fallback with the five entries, as the CAL-5 probe builds it).
P2. `drawingCaveats(d: Drawing): string[]` in check.ts, with `PEAL_NO_HOOKS_SENTENCE` (default copy: "This heart has no hooks: the
    peal's great bells ring in their rooms but none hangs at the heart."). It returns that line when d.shape === 'foundry:peal' and
    hooksOf(HEART_FRAMES[d.heart].fallback) is empty. TableView.caveats carries it; DrawingEditor shows each caveat under the issues
    as <p class="note-caveat" data-testid="drawing-caveat">, styled as a quiet note, not an error. Tests: 'CAL-5P: a peal with a
    hookless master shows the caveat and can still be saved', 'CAL-5P: a peal with the Carillonneur shows no caveat'.
P3. The cleared heading of a drawn trip names its drawing: "The heart of {drawing name} is quiet." (app helper + Cleared.svelte).
    Test: 'CAL-5P: a cleared drawn trip names its drawing'.

Owed by this pack: Cleared.svelte's inked-page copy (status Owed). The orchestrator records the held defaults in DESIGN §11 at merge.
Done when: the five CAL-5P tests pass; BF-8, EN-K6 and the CAL-5 peal probe pass unchanged; svelte-autofixer reports no issues on
DrawingEditor.svelte and Cleared.svelte; phone screenshots at 375x812 (light and dark) of the table with a peal + Marginalia drawing
(caveat visible, Save enabled) and of the Cleared screen after a drawn trip (dev save or Gallery fixture).
Verify: pnpm vitest run tests/districts/foundry/peal.acceptance.test.ts tests/drawing/peal-six.test.ts tests/app/drawing.test.ts tests/drawing/kits-c.test.ts --reporter=dot --testTimeout=400000
Phone check: yes, port 5194 (a new visible line on the table).
```

---

## Pack CAL-5R (Codex Sol 6.2 high): drawn remeasure, sharded

```text
Pack CAL-5R of calibration-plan.md (CAL-5 task 3, drawn part): tasks 1 -> 2 -> 3 (baseline on the structural fixes; candidates;
application and record).
Base commit: <main at spawn, with CAL-5G and CAL-5P merged>. Budget: 120 min pack, 30 min per shard; one shard at a time.

Read: docs/plans/drawn-calibration.md "Task 3 measurement protocol", "Paired data candidates", "Corpus and reproduction";
      docs/plans/drawn-calibration-briefs.md "Findings" and "Held defaults"; pattern: tests/sim/drawn-calibration.test.ts (its vi.mock
      candidate switch and the env filters at lines 200-225).
Own: src/data/drawing.ts (DRAWN_HEART_HP_BONUS and GEN_TUNING values only, under the selection rule below);
     tests/sim/drawn-calibration.test.ts (new candidate cases, a CAL5_BAND and a CAL5_HEARTS filter, a walkover-cause table;
     no assertion relaxed), tests/sim/calibration/drawn.ts (output only);
     docs/plans/drawn-calibration.md (a new section "Task 3 remeasure (CAL-5R)"; earlier sections stay as history).
Read-only: tests/sim/generator.test.ts (its EN-S1/EN-S2 assertions, incl. the 10 % walkover ceiling), tests/drawing/generator.test.ts.
Tests pinning old numbers: none read DRAWN_HEART_HP_BONUS or GEN_TUNING except the corpus test's mocks (CAL-5G's heart-hp tests
read the constant or mock it). A candidate that turns 'EN-2: unverified fallbacks are zero' or any EN-S1/EN-S2 test red is rejected,
not accommodated by editing the test.

Trace:
- The corpus test: CAL5=1 is the full run (24 drawings, parties 1-3, seeds 1-2 ordinary, 1-4 hearts, 1-2 carried trips; 859 s on
  48ac3f0). CAL5_ORDINARY=1 measures only fresh ordinary rooms (carried 0); CAL5_MASTER=<id> only that master's hearts;
  CAL5_DRAWING=<name> one drawing; CAL5_PAIR=1 the pair only. Candidates go through vi.mock('$data/drawing') keyed on CAL5_CANDIDATE.
- Add: CAL5_BAND=light|medium|heavy (filter drawings by the name's first word, as bandInName does) and CAL5_HEARTS=1 (hearts only,
  all drawings). Candidate cases: 'heart4-12-24' (DRAWN_HEART_HP_BONUS 4/12/24, the CAL-5 prototype), 'heart2-6-12' (half),
  'band123' (bandBonus 1/2/3), 'slope1' (perMember 1, bandBonus 3/4/5): the two budget candidates CAL-5 measured before the reach fix.
- Walkover cause per offered walkover: dull path vs fallback; party size; rounds <= 2 vs full HP; band; depth. Print it as a table.
- Frozen for pairing: corpus, lineups, starter pages, seeds and fight policy, as in the Task 3 protocol. Fresh-HP judging; fallbacks
  included in heart rates; EN-13 pooled with equal weight across lineups and masters, each lineup printed.

Contract:
  "Heart win rates light 60–75 %, medium 45–60 %, heavy 30–45 % (bot, fresh HP)." "Offered rooms stay inside EN-S2's walkover limit"
  (at most 10 %). The walkover definition, GEN_LIMITS and the phone bars are acceptance constraints, not knobs. Never raise round,
  action or generation caps. Held defaults 1-6 in the briefs file apply (stalls are non-wins).
  Selection rule (calibration-followup selection, unchanged): among candidates inside the band prefer fewer stalls, then the smaller
  data change, then the band's centre; if none is inside, apply the closest whose non-wins are mostly losses; a stall-shaped pick is
  labelled under held default 1. Additionally, for hearts: reject a candidate that raises unverified heart offers above the task-1
  baseline by more than 5 of 288, or turns EN-2 red. For ordinary rooms: reject a candidate that raises unverified ordinary offers
  above the task-1 baseline, or leaves any invalid offered board.

1. Baseline on merged main (structural fixes in, data unchanged). Shards, each `caffeinate -i` in the background with its own log and a
   30-minute cap (`perl -e 'alarm 1800; exec @ARGV' --`):
   b1-b3 `CAL5=1 CAL5_DETAIL=1 CAL5_BAND=<band> pnpm vitest run tests/sim/drawn-calibration.test.ts --reporter=dot`;
   b4 `pnpm vitest run tests/sim/generator.test.ts --reporter=dot` (the 500-seed fuzz).
   Report against 48ac3f0: invalid offered boards (must be 0; if not, stop and report the drawing, depth, seed and issue: that is a
   CAL-5G defect for a fix pack), walkovers (76/534) with the cause table, fair/fallback/unverified, held issues by guardrail, heart
   W/L/S by band, master and lineup, Steward hearts at heat 4 in both trial and app.
2. Candidates, paired against task 1 (same seeds): hearts `CAL5=1 CAL5_HEARTS=1 CAL5_CANDIDATE=heart4-12-24` (then heart2-6-12 only if
   the first is rejected or stall-shaped); ordinary `CAL5=1 CAL5_ORDINARY=1 CAL5_CANDIDATE=band123|slope1 -t 'production corpus
   tables'` (only if task 1's walkovers are above 10 %). A shard over its cap splits by CAL5_BAND. Per candidate: W/L/S, median
   rounds, HP left, fallback/unverified, walkovers, invalid, the band miss, and whether a median win round is above 25.
3. Apply the pick under the delegation (or retain the defaults: a valid recorded decision). Rerun b1-b4 on the applied data. Write the
   approval rows (schema in calibration-briefs.md) for: piece reach (CAL-5G), held-back walk (CAL-5G), heart HP bonus, the budget
   candidates, Steward parity, the peal (CAL-5P), with old -> new, seeds, W/L/S, median rounds, HP left. Return the rows for
   calibration-results.md in the report (the orchestrator copies them). Record each remaining miss for CAL-G1. If hearts stay above
   band with every HP candidate rejected, name "escorts by weight" as the next lever (held default 5); do not build it.

Owed by this pack: EN-13 and EN-S2 on the final drawn revision; the CAL-5 register rows deferred to design (heart weight, piece reach,
length-six peal, Steward parity).
Done when: the remeasure section has the task-1 baseline, the candidate table and the applied rerun, each with its command; invalid
offered boards are 0; 'CAL-5: drawn heart bands and production corpus tables' and the other CAL-5 tests pass; tests/sim/generator.test.ts
passes 9/9 on the applied data; `pnpm check:fast` passes.
Verify: pnpm vitest run tests/sim/drawn-calibration.test.ts tests/drawing/heart-hp.test.ts tests/drawing/generator.test.ts --reporter=dot --testTimeout=400000
Sims: tests/sim/drawn-calibration.test.ts and tests/sim/generator.test.ts as above. Not the household sweep (CAL-5S owns it).
Phone check: no (CAL-P owns device timing).
```
