# Build program: briefs for the packs not started yet

Spawn `pack-worker` with the role's model and effort and paste one brief as written ([templates](../../.claude/skills/implement/templates.md)). Delete a brief when its pack merges. A routine window runs these; a design window writes the next ones (listed at the end). Sources: [midpoint-audit.md](midpoint-audit.md) §3, the plans' pack tables.

Order: **GATE-1 alone first.** Then two or three of A–E at a time (they own disjoint files).

## GATE-1 (Default: Sonnet medium)

```
Pack A of docs/plans/platform-closure-plan.md: task GATE-1.

Read: platform-closure-plan.md row GATE-1; midpoint-audit.md §4.1 (the timing table) and §4.2 item 3.
Own: package.json (scripts), tsconfig*.json, vitest config, the two bridges play-through test files
(the two files under tests/districts/bridges/ that take over 20 s each: move them to tests/sim/),
tests/sim/canals.test.ts (the CN-13 timeout at line 39) and the global test timeout in vite.config.ts,
.github/workflows/* only if a script name it calls changes, AGENTS.md "Commands" (one line for check:changed).
Contract (on main): `pnpm check` stays the full gate and `pnpm check:fast` stays "typecheck + lint + tests
without tests/sim". No test is deleted or weakened: a moved test keeps its assertions; a timeout fix
raises the timeout or trims seeds with the reason in a comment.
Owed by this pack: nothing.

Done when:
- GATE-1: `svelte-check` and `tsc` are timed separately and the redundant pass is out of check:fast
  (state both times in the report; `pnpm typecheck` remains a full check); incremental builds on for the other.
- `pnpm check:changed` exists (`vitest run --changed main --exclude 'tests/sim/**'`).
- No file under tests/districts/ takes over 10 s; `pnpm vitest run tests/sim/canals.test.ts`
  passes three times in a row, alone.
- check:fast wall time on an idle machine is reported (target: 3 min 30 s or less).

Verify: `pnpm check:fast > check.log 2>&1; tail -20 check.log`
Sims: run `tests/sim/canals.test.ts` and the two moved files for task GATE-1.
```

## Pack A: foundry ring engine (Strong: Sonnet high; escalate to Opus high after one failed review)

```
Pack A of docs/plans/foundry-plan.md: tasks BF-3 → BF-4 → BF-5.

Read: foundry-plan.md §2 (P2–P4) and Pack A's rows; `git log --grep 'BF-[012]' --format=%B` (what the
contracts and pieces provide); pattern: src/engine/districts/bathhouses/boilOver.ts (a `late`-slot rule).
Own: src/engine/districts/foundry.ts, src/engine/districts/foundry/**, tests/districts/foundry/**,
and the single `eventCap` argument in src/engine/battle.ts.
Contract (on main):
- Set bell `onStruck`; reset hum and struck in `BELLS_RULE.step`; pass `hum` to the art through piece data.
- BF-5 routes Brass to retune before BF-2's `holds: 'clouds'` guard in mix.ts.
- Do not edit push.ts or damage.ts: strikes arrive through DK-4 piece triggers. If that is not enough,
  stop and report.
Owed by this pack: pass `eventCap` from battle.ts to the resolver (FD-6 left the 500-event cap unenforced
on the production path); do it in BF-3, before BF-4's sweep.

Done when:
- BF-3: every test titled "BF-3: …" in tests/districts/foundry/*.acceptance.test.ts passes with its
  `it.fails` marker removed and the test otherwise unchanged; `it.todo`s for BF-3 are written and pass.
- BF-4: the same for "BF-4: …" (cap sweep at every event index disagrees nowhere; projection equals final state).
- BF-5: the same for "BF-5: …" (`Bolt → Brass → Strike` rings in the new tone).
A test you had to change is a Proposal in your report.

Verify: `pnpm vitest run tests/districts/foundry tests/engine/arrival-matrix.test.ts --reporter=dot`
```

## Pack B: bridges completion (Default: Sonnet medium)

```
Pack B of docs/plans/bridges-plan.md: tasks BR-20 → BR-7 leftovers.

Read: bridges-plan.md P16, P17 and row BR-20; TECH.md §3 "Authoring a rival";
pattern: src/data/rivals/bathSteward.ts.
Own: src/data/rivals/chiefWarden.ts, src/data/rivals/index.ts (one line), src/engine/districts/bridges/**,
tests/rivals/chiefWarden.test.ts, tests/districts/bridges/**, and the `refusesHold` / `resists` call sites
in src/engine/push.ts, src/engine/runes/actions.ts, src/engine/runes/flow.ts, src/engine/solvents.ts,
src/engine/districts/inkQuarter/wax.ts (deletions only).
Contract (on main): the Chief Warden is authored through RV's API (RV-11 tricks, RV-14 authoring, RV-15 page);
he holds his tile while the keystone stands and falls only when it breaks (P17). The stand-in mechanism
`rightOfWay` is removed, not wrapped. Leave `cracksOf` imports alone (KIT-R1 replaces them next).
Owed by this pack: nothing.

Done when:
- BR-20: the existing heart scenarios in tests/districts/bridges pass unchanged against the rival;
  tests "BR-20: his page banks on a win" and "BR-20: his page is kept on a wipe" pass;
  `grep -rn rightOfWay src/` prints nothing; the stand-in entry is gone from bridges/enemies.ts.
- BR-7: `BridgeTripState.spans` is removed (it is never written); test "BR-7: a fall crumbles the jar on
  the tile" passes.

Verify: `pnpm vitest run tests/rivals tests/districts/bridges tests/engine --reporter=dot`
```

## Pack C1: ink quarter footnotes, audit and draft (Strong: Sonnet high)

```
Pack C1 of docs/plans/ink-quarter-plan.md: tasks IQ-F1 → IQ-F2. Stop after the draft: the orchestrator
reviews it (IQ-FG) and a second pack builds from the approved text.

Read: footnotes-plan.md §6 (the batch template); ink-quarter-plan.md rows IQ-F1 to IQ-F5;
pattern: docs/design/footnotes-content/bathhouses.md with src/data/footnotes/bathhouses.ts.
Own: the IQ block of src/data/lines.ts, docs/plans/footnotes-audit.md (a new section),
docs/design/footnotes-content/inkQuarter.md (new), tests/scenarios/footnotes-ink*.test.ts.
Contract (on main): margins on two or three chosen lines per rune (FN P1); every line has a firing scenario;
the postmaster's note sits on Sentence at level II and is hidden until his page is held.
Owed by this pack: nothing.

Done when:
- IQ-F1: the audit table lists real behaviours with no row missing; each new line has a scenario test
  titled "IQ-F1: <line id> fires".
- IQ-F2: the draft exists in the bathhouses draft's format, with every variant's four combinations reading
  sensibly and one capstone per rune.

Verify: `pnpm vitest run tests/scenarios tests/data --reporter=dot`
```

## Pack D: one bot (Default: Sonnet medium; escalate to Sonnet high)

```
Pack D of docs/plans/ending-plan.md: task EN-0 (with tests/sim/ink-bot.ts folded in).

Read: ending-plan.md row EN-0 and the P-rows on the bot; tests/sim/bot.ts; tests/sim/ink-bot.ts.
Own: src/engine/sim/** (new), tests/sim/**.
Contract (on main): behaviour-neutral. The bot is party-generic, deterministic, takes an op budget and
touches no DOM. tests/sim/bot.ts re-exports from src/engine/sim so no other test file changes.
The generic trip runner of ink-bot.ts moves with it; ink-specific terms stay in tests/sim.
Owed by this pack: nothing (district bot terms are KIT-R3).

Done when:
- EN-0: `pnpm vitest run tests/sim --reporter=json` gives identical test results before and after
  (save both outputs, diff the pass/fail and the recorded tables); test "EN-0: same state and budget give
  the same actions" passes; `tests/sim/calibration.test.ts` no longer times out under load
  (raise its timeout or trim seeds, with the reason in a comment).

Verify: `pnpm vitest run tests/sim --reporter=dot`, once at the start and once at the end.
Sims: run `tests/sim` for task EN-0. This is the only pack that runs sims.
```

## Pack E: board UI registries (Default: Sonnet medium; escalate to Sonnet high)

```
Pack C of docs/plans/platform-closure-plan.md (the audit's Pack E): task KIT-R2.

Read: platform-closure-plan.md row KIT-R2 and its contract (the slot names there are the ones to use); district-kit-plan.md P8 and P10;
pattern: src/ui/districts/index.ts (the existing registry slots).
Own: src/ui/districts/index.ts, each src/ui/districts/<id>/index.ts,
src/ui/components/board/{UnitToken,FxLayer,BattleBoard,BadgeLayer}.svelte, src/ui/screens/Combat.svelte
(the one import), src/app/overlay.ts (the highlight import), src/app/describe.ts (district branches only),
and the moves of src/app/ink*.ts and src/app/bridgeView.ts under their districts.
Contract (on main): behaviour-neutral. `DistrictUi` gains `unitArt`, `fx`, `boardLayers`, `describe` and
highlights go through the existing `highlightArt` registry. No board component imports a named district;
a foe with no `unitArt` entry draws the default token.
Owed by this pack: nothing.

Done when:
- KIT-R2: `grep -rnE "districts/(seam|canals|bathhouses|bridges|inkQuarter|foundry)" src/ui/components
  src/ui/screens/Combat.svelte src/app/overlay.ts` prints nothing; tests/ui and tests/app pass unchanged;
  one Lab screenshot per built district at 375×812, taken before and after, shows the same board;
  the autofixer is clean on every changed component.

Verify: `pnpm typecheck` and `pnpm vitest run tests/ui tests/app --reporter=dot`
Phone check: yes, port 5191 (the before and after screenshots are the acceptance).
```

## Written in the next design window

| Pack | Tasks | Starts when |
|---|---|---|
| B2 | KIT-R1 | Pack B merged |
| C2 | IQ-F3 → IQ-F4 → IQ-F5 (Fast) | IQ-FG approved |
| C3 | BR-19a → BR-19b | C2 merged (same files) |
| D2 | EN-W0 (contracts and the ending's acceptance tests) | Pack D merged |
| D3 | KIT-R3 (one exemplar, then four Fast) → EN-S1 → EN-G0 | D2 merged |
| F2… | the foundry packs after A | Pack A merged |
| S | SAVE-1 (Fast) | any free slot |
