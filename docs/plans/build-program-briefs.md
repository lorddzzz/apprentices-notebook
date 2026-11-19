# Build program: briefs for the packs not started yet

Spawn `pack-worker` with the role's model and effort and paste one brief as written ([templates](../../.claude/skills/implement/templates.md)). Delete a brief when its pack merges. A routine window runs these; a design window writes the next ones (listed at the end). Written in the design window of 2026-11-19 (the kit-less elements and the ending's Close). The decisions behind them: [ending-plan.md](ending-plan.md) P38–P40 and [ending.md](../design/ending.md) §1.5. The briefs for Packs L, N2 and R1–R7 were removed when those packs merged (`git log --grep '<ID>'` has them).

## Order for the routine windows

A pack starts when the packs in its "Starts when" are merged. Packs on one row own disjoint files and run together on different runners.

| Wave | Packs (together) | Runner · model / effort | Starts when |
|---|---|---|---|
| 27 | **K2a** the kit-less elements (EN-K8) · **K2b** an honest trial (EN-K9 → EN-K10) | K2a: Codex (CLI runner) · Terra 6.1 high (→ Sol 6.1 high) · K2b: Claude · Sonnet 5.5 high (→ Opus 5.5 high) | now (read CI on the last push first) |
| 28 | **EN-14** the ending's Close: a design-window agent, not a `pack-worker` | Claude · strongest model, high | K2a and K2b merged, CI green |
| then | **CAL** the calibration plan (CAL-0 to CAL-5): its briefs live in [calibration-briefs.md](calibration-briefs.md), written separately; they start after EN-14 | as written there | EN-14 merged |

File clashes and how the order avoids them:
- K2a owns the palette, the needs check, `src/data/drawing.ts` and the canals, quarter and bridges kits; K2b owns `generate.ts`, `drawing/types.ts`, the foundry kit and `districts/inkedPage.ts`. Neither edits the other's files. Both add tests in their own files; K2a alone edits `tests/drawing/acceptance.test.ts` and `tests/drawing/generator.test.ts`.
- Sims: K2b runs `tests/sim/generator.test.ts` (it changes what every trial runs). K2a runs no sim. EN-14 runs the full gate.
- Phone checks: none in K2a or K2b (engine only). EN-14 does the ending's full loop.

Every brief's "Owed by this pack" items are also in the status file's Owed list.

---

## Pack K2a (Default; Codex CLI runner: Terra 6.1 high)

Prepend the standing-rules preamble (templates.md, Codex CLI runner: the orchestrator commits).

```
Pack K2a of docs/plans/ending-plan.md: task EN-K8 (P38, the kit-less elements).

Read: ending-plan.md §2 row P38 and §5 Pack K2; docs/design/ending.md §1.5; pattern: src/engine/drawing/kits/bridges.ts (`pierKit`, a PieceKit) and kits/inkQuarter.ts (`writsKit.stamp`, where writs go).
Own: src/data/drawing.ts (`UNDRAWN`, new), src/engine/drawing/palette.ts, src/engine/drawing/check.ts,
     src/engine/drawing/kits/canals.ts, src/engine/drawing/kits/inkQuarter.ts, src/engine/drawing/kits/bridges.ts (the `spanKit.needs` line only);
     tests/drawing/kits-a.test.ts (new EN-K8 cases), the EN-K line of tests/drawing/acceptance.test.ts, the EN-5 combination test in tests/drawing/generator.test.ts.

Contract (on main):
  // src/engine/drawing/types.ts (unchanged)
  interface PieceKit extends Needing { id: PieceId; cost: number; place(layout: BoardSpec, seed: number): BoardSpec | null; matters(layout: BoardSpec): number; valid(layout: BoardSpec): boolean }
  // src/engine/drawing/kits/seam.ts (unchanged): foeKit(id: EnemyId): FoeKit   // budget from `elite`, habitat from the enemy's data, needs from NEEDS
  // new, src/data/drawing.ts
  /** P38: elements a drawing never offers, id -> reason (for review; never shown). */
  export const UNDRAWN: Readonly<Record<string, string>> = {
    dummy: 'Lab and tests only',
    clockSeal: "the postmaster's clock writ lays it",
    letter: "the quarter threshold's errand object",
    'inkQuarter:wax': 'the Sealer lays it',
    'inkQuarter:clockStamp': "the postmaster's clock writ lays it",
    'inkQuarter:address': 'comes with forwarding',
    'canals:moor': "it moors the barge's crate only",
  };
Invariants:
- `paletteOf(p)` leaves out every id in `UNDRAWN` (foes and pieces); nothing else in the palette changes. The Lab's and the Bench's `paletteOf` (src/app/lab.ts, a different function) are not touched.
- CANALS_KIT.foes gains `foeKit('snuffer')`. INK_KIT.foes gains `foeKit` of `deadLetter`, `sorter`, `sealer` (no NEEDS rows). INK_KIT.pieces gains three PieceKits at `COSTS.piece`, no needs:
  `inkQuarter:return` and `inkQuarter:order` lay one `{return}` / `{order}` on a plain tile above the bottom two rows (as `writsKit.stamp` does); `inkQuarter:forward` lays the pair `{forward:a}` and `{address:a}` on two plain tiles above the bottom two rows that are not neighbours, or returns null when the board has no room for both. Pair letters: the first letter not used by a pair already on the board. `valid` is true when every forward stamp on the board has its address.
- No piece has a need: `checkDrawing` reads `NEEDS[id]` for foes, shapes and hearts only, and `spanKit.needs` is `[]` (today the span piece borrows the span-choice shape's row "A span choice needs collapse", because they share the id `bridges:span`). The shape keeps its need.
- `sourcesOf` (loot.ts) picks the new kits up by itself (canals for the snuffer, the quarter for its foes and stamps); do not edit loot.ts.
- No district file is edited (P14). The comment above INK_KIT ("its foes and pieces have no kit yet") is updated.
Owed by this pack: `EN-K: every element a full household can offer has a kit` loses its `it.fails` (P34); the Owed lines from Packs I, J and K on the kit-less elements close with it.

Done when:
- EN-K8: `EN-K: every element a full household can offer has a kit` passes with `it.fails` removed and its body unchanged; the EN-5 test `EN-5: every offered combination generates` drops its `missingKit(drawing) !== null` skip and still passes;
  new tests pass: `EN-K8: every offered foe and piece generates in a room` (each new foe and piece in a 3-room plain drawing with the Marginalia heart: `generateRoom` on room 0 returns a layout that passes `checkGenerated`, and for a piece the piece is on it), `EN-K8: dropped elements are never offered` (fullHousehold's palette holds none of `UNDRAWN`'s ids), `EN-K8: forwarding lays its address` (50 seeds: every `{forward:x}` has its `{address:x}`), `EN-K8: the span piece needs nothing` (`checkDrawing` with piece `bridges:span` and no rule reports no need; the span-choice shape without collapse still does).

Verify: `pnpm vitest run tests/drawing/acceptance.test.ts tests/drawing/kits-a.test.ts tests/drawing/palette.test.ts tests/drawing/generator.test.ts tests/app/drawing.test.ts tests/drawing/loot.test.ts --reporter=dot`
Phone check: no. Sims: none.
```

---

## Pack K2b (Strong first setting; Claude: Sonnet 5.5 high)

```
Pack K2b of docs/plans/ending-plan.md: tasks EN-K9 -> EN-K10 (P39, P40: the bot judges the room the player plays).

Read: ending-plan.md §2 rows P10, P39, P40 and §5 Pack K2; docs/design/ending.md §1.5 (the last three bullets); pattern: src/engine/drawing/kits/foundry.ts (`pealSetup`, `lockEdits`) and src/engine/trip/setup.ts (`setUpRoom`, `roomRules`: how a room lists its rules).
Own: src/engine/drawing/generate.ts (`trial`, `compose`), src/engine/drawing/types.ts (`ShapeKit.stamp?` only), src/engine/drawing/kits/foundry.ts (`pealKit`, `pealSetup`),
     src/engine/districts/inkedPage.ts (`INKED_TRIP.roomSetup`); tests/drawing/honest-trial.test.ts (new), tests/drawing/kits-c.test.ts (new EN-K10 cases only).

Contract (on main):
  // src/engine/districts/types.ts (unchanged)
  interface HeartSetup { foe: EnemyId | KitId; rules: readonly RuleId[]; frame(board: BoardSpec, seed: number): BoardSpec }
  interface RoomSetup { activate?: readonly RuleId[]; rulesConfig?: ...; boardEdits?: readonly BoardEdit[]; ... }
  // src/engine/drawing/frames/index.ts (unchanged): HEART_FRAMES: Partial<Record<MasterId, HeartFrame>>  (read lazily: the KIT import cycle)
  // src/engine/rules.ts (unchanged): listRules(state, ids, config, rules)
  // src/engine/drawing/kits/foundry.ts (unchanged signatures): lockEdits(layout, note, seed): BoardEdit[]; noteOfRoom(room): Note; pealSetup(input): RoomSetup
  // new, src/engine/drawing/types.ts
  interface ShapeKit { ...; /** P40: what the shape lays on room `room` (never the heart) at generation, before the guardrails and the trial. */ stamp?(layout: BoardSpec, room: number, length: number, seed: number): BoardSpec }
Invariants:
- EN-K9 (P39): `INKED_TRIP.roomSetup` in the heart room (room === drawing.length - 1) activates the drawing's rule, the lent shape's `activate`, and `HEART_FRAMES[drawing.heart].setup.rules`, with no duplicates. Each frame rule gets the config the district's own heart room passes for it (read the district's `roomSetup`/heart for it, e.g. the tune's `{ seed: trip.seed }`); a config the lent shape already set wins. Rooms before the heart are unchanged.
- EN-K9: `trial` (generate.ts) lists on the trial battle the drawing's rule and, at the heart, the frame's rules (default config; the lent shape's state-dependent config, such as the baths' heat by room, is not reproduced: write a one-line CAL note in your report). A drawing with no rule and a heart with no rules gives the trial battle exactly as today (the trial seeds and salts unchanged).
- EN-K10 (P40): `compose` applies the drawing's shape kit's `stamp` (if any) to rooms before the heart, after `startPoints` and before `placeFoes`, with seed `deriveSeed(seed, 3)`; the frame path (`composeHeart`) is untouched. `pealKit.stamp` lays `lockEdits(layout, noteOfRoom(room), seed)`; `checkGenerated` and the trial see the stamped board and the stored layout carries it.
- EN-K10: `pealSetup` before the heart returns the lock edits only when the stored layout has no `foundry:greatBell` (a trip inked before this change), with today's seed `deriveSeed(trip.seed, 7400 + room)`; otherwise no edits. The heart's allied bells and its tune activation are unchanged. Peal notes repeating on a length-6 trip stay as built.
Owed by this pack: Pack K's undecided proposals (`ShapeKit.stamp?`, `inkedPage.roomSetup` activating the heart frame's rules), decided as P39/P40. The status file's line "the Steward bot trials never switch boil-over on" closes with EN-K9.

Accepted test changes (list each in the report): `tests/districts/inkedPage/module.test.ts`'s heart-room `activate` expectation (room 3 of a length-4 drawing) may gain the frame's rules; nothing else. EN-K1–K7's tests must pass unchanged; the fallback boards' scripted solves are not re-recorded.

Done when:
- EN-K9: tests `EN-K9: a drawn heart lists its master's rules on a plain shape` (for every master whose setup lists rules: the postmaster's clock, the Carillonneur's tune, the Registrar's guild hand, the Steward's boil-over, the Chief Warden's collapse), `EN-K9: the trial lists the drawing's rule` (a boil-over drawing's trial battle has `bathhouses:boilOver` in its rules), `EN-K9: the trial lists the heart's rules` pass.
- EN-K10: tests `EN-K10: a peal room is stored with its great bell` (lengths 3 to 6, every room before the heart), `EN-K10: the trial sees the lock stamp` (the board the trial battle is created from holds the great bell), `EN-K10: a trip inked before stamp still gets its bell` (a stored layout without a great bell gets the edits from `pealSetup`; one with it gets none) pass; `EN-K6: bells hang only where rung` passes unchanged.

Verify: `pnpm vitest run tests/drawing tests/districts/inkedPage tests/districts/foundry/review.test.ts --reporter=dot`
Phone check: no.
Sims: run `pnpm vitest run tests/sim/generator.test.ts` after EN-K9 and after EN-K10. Report the fuzz's attempt histogram, fallback and dull rates against EN-G0's (P29: offered within 2 attempts 73.2 %, verified within 4 100 %, dull 28 of 500). A bar that fails because trials now run the real rules is a report item for CAL-5, not a tuning task: do not change `GEN_TUNING` or `GEN_LIMITS`.
```

---

## EN-14: the ending's Close (a design-window agent; Claude, strongest model, high effort)

Spawn as the skill's design window (one agent, in a worktree; not a `pack-worker`), once K2a and K2b are merged and CI on that push is green. It may fix in place; it commits on its branch and the orchestrator merges, pushes and edits the status file. Its instructions:

```
EN-14 of docs/plans/ending-plan.md: the ending's Close (the implement skill's Close steps for the ending plan).

Read: ending-plan.md §5 Close row EN-14 and §6 Verification; docs/design/ending.md (all, short); the implement skill's "Close" section. Pattern: docs/plans/foundry-verification.md (the verification file's format).
Own: anything the fixes below need, under the fix rule; docs/plans/ending-verification.md (new); docs/plans/ending-evidence/en14-*.jpg; DESIGN.md §6.7 and §11; TECH.md §7; docs/design/ending.md (status line); ending-plan.md (State line); docs/ROADMAP.md and ROADMAP-done.md (BL-126); docs/plans/calibration-plan.md §1.1 (numbers found, appended only); this briefs file (new briefs for larger findings); one EN-14 row in docs/plans/build-program-log.md. Not the status file, and not docs/plans/calibration-briefs.md.
Fix rule: fix a finding in place when it is under about 30 lines, changes no rule and its tests pass unchanged (a behaviour fix ships with a test that fails before it). Every larger finding becomes a brief in this file; every number found in engine code goes to calibration-plan §1.1. No balance tuning.

1. Gate: on the merged branch, `pnpm check > check.log 2>&1; tail -30 check.log` (the full gate, sims in). Red = fix (fix rule) or brief it, and say which.
2. Full-loop phone check at 375x812 (the `verify` skill), screenshots to docs/plans/ending-evidence/en14-<state>.jpg. Reach the states with a save built from tests/drawing/fixtures.ts (`handoverProfile()` before the scene, `fullHousehold()` after it) injected into the app's storage, from a scratch script outside the repo (or a fixture recorded with tests/fixtures/saves/record.ts if it supports it); `window.__inkDelay` shows the inking line, `window.__inkFail` a failed inking. States (ending-plan §6, plus the Owed items):
   the door row on the map before the scene and "Visit the owner's desk" after it (Pack L did not screenshot the row after the visit); every scene page and the gifted-pages line; the credits (mid-scroll, a skip) and both codex replays; the drawing table empty, full, over budget and with greyed reasons (one need, one pen); the map with three drawn pages and the lower floors; Set out; "inking the room…"; a failed inking with Try again and Home; a generated 7x9 room with three apprentices; one drawn heart per frame (Marginalia, lamp-mother, Lamplighter, postmaster, Bath-Steward, Chief Warden, Carillonneur, Registrar); the Codex's ending tab on a trip.
   There is no dark theme: record "dark: not applicable" (do not screenshot it). Run svelte-autofixer on every ending component until clean: src/ui/screens/{Handover,Credits,DrawingTable,Desk,Codex,Combat,Cleared}.svelte, src/ui/districts/inkedPage/PagesSlot.svelte, src/ui/districts/lowerSeam/{StairSlot,DoorLine}.svelte. Small visual defects: fix (fix rule).
3. `code-review` at high, once per subsystem, on the files as they stand: (a) the generator: src/engine/drawing/{generate,trial,check,palette,cost,loot,trip,profile}.ts, src/engine/sim/**, src/app/generation.ts and generation.worker.ts; (b) kits and frames: src/engine/drawing/kits/**, src/engine/drawing/frames/**, src/engine/districts/inkedPage.ts, src/data/drawing.ts; (c) the ending: src/engine/drawing/ending.ts, src/data/ending.ts, src/app/drawing.ts, the routes `handover`/`credits` in src/app/flow.ts, and the components above.
   Start from the known items: `ending.ts` re-derives door-open (Biome forbids the districts import): make it share `ownerDoor`'s rule or pin both with one test; the stale `it.todo('EN-4: worker results equal the synchronous path')` in tests/drawing/acceptance.test.ts (EN-4 is tested in tests/app/generation.test.ts): delete it; `battle.svelte.ts:129` passes no footnotes to `rivalSheet` (one line, R7's proposal); `hurtByPulse` exported for a test only; R2's core kinds flagged `sandbox: true` and the unbanked plunge (`onBank` a no-op): confirm it is intended or brief it; `window.__inkDelay`/`__inkFail` are dev-only; `MAP_PAGE_HEIGHT` 1900 and F2's doorway weight constant in loot.ts (numbers: §1.1).
4. Copy decisions held for this Close (worker-written lines not in ending-text.md): the handover's closing screen ("The owner takes a seat on the bench. The drawing table is on the desk.") and the Codex ending tab on a trip ("Out on a trip: these open again in the study."). Default: keep both as written (they follow ending.md §1.1 and say only what happens); list them in the report as player questions with that default. Cleared.svelte's "The heart of the inked page is quiet" stays copy for CAL.
5. Records: DESIGN.md §6.7 (the ending as built) and §11 (rows for P29–P40 that are not there yet: read §11 first; P38–P40 marked *Proposal*); docs/design/ending.md status "Decided" -> "Built (EN-14, <date>)"; TECH.md §7 (the generation worker and its prefetch, the EN salt range 7000–7999, the bot in src/engine/sim with its op budget, GEN_LIMITS/GEN_TUNING in data, the kit and frame registries; read §7 first and add only what is missing); docs/plans/ending-verification.md (task acceptance per EN task with commit and test file, the phone states with their screenshots, the review findings and what was done, what was not checked and why); ending-plan State line (done but the playtest gates EN-G1/EN-G3); ROADMAP BL-126 to ROADMAP-done.md.
6. Ledger: `node .claude/skills/implement/ledger.mjs docs/plans/build-program-log.md docs/plans/ending-plan.md`. Every ending task it lists as open or "in the log's prose only" is done, aliased in the log, or named in your report for the status file's Next. Add the EN-14 log row (six cells; findings counted in the Note).
7. Report (under 250 words): gate result, the phone states seen (and any not reached, with why), review findings fixed / briefed / moved to §1.1, records written, ledger result, the player questions with defaults, and two to four playtest questions for EN-G1/EN-G3 (variety, fairness and loot of drawn districts; the handover's feel).

The orchestrator then pushes once, confirms CI deployed that commit, and updates the status file (Close checklist for the ending, Next = CAL from calibration-briefs.md).
```

---

## Written in a later design window

| Pack | Tasks | Starts when |
|---|---|---|
| Plan B (only if needed) | rooms validated at home into a pool (ending-plan P29) | the player's look through the 40 sample rooms finds more than 2 of 20 broken or dull |
| Fix packs from EN-14 | whatever EN-14's review briefs here | EN-14 merged |
