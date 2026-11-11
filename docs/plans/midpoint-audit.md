# Build program: midpoint audit (2026-11-11)

> Audit of the build program at `a6e8bfb` (main, clean). Sources: ROADMAP §2, build-program.md, the status file, the log's task and usage tables, every remaining plan's task table, and the code. Nothing was changed in the repo except this file.
> How it was checked: each plan's task IDs were matched against the log and `git log --grep`; imports and district ids were grepped across `src/`; the check pipeline was timed stage by stage on an idle machine (§4.1).

## 0. Summary

- **Where the program is.** FD, DK, HC, AH, RC are complete. RV, FN (Seam content), CN, SM, IQ, BH, BR are built bar a few tasks. BF is 3 of 30 tasks in. CG and EN have not started. Roughly 165 tasks merged, about 95 left.
- **The biggest finding is ordering, not code.** The ending's generator go/no-go (EN-S1 → EN-G0) and its prerequisite EN-0 were scheduled "early, beside Stage 2" and have not started, while five districts of content were built on top. It is the largest remaining technical risk and it decides the shape of the last plan. It should run now.
- **The kit boundary leaked.** "One index line per district" did not hold: each district build edited 15–22 core files. Engine core imports the bridges module directly; five board components hard-code districts. Two more districts and a generator that composes all of them will multiply this. Two refactor tasks close it (§1.1).
- **Three pieces of work fell off the books:** the ink quarter's footnote batch (IQ-F1–F5), heart frames and bot terms for every built district (EN needs them; 0 of 5 registered), and the end-of-plan code review (never run for any of the nine built plans).
- **The gate is slow and one sim fails on main.** `check:fast` takes about 5 min 45 s on an idle machine, of which the typecheck is 4 min 40 s. The full check takes about 11 minutes and `tests/sim/canals.test.ts` timed out when run alone (§4.1).
- **Usage:** quota is spent on spin-up and verification, not on writing code. Spawning fewer, larger packs with executable acceptance, and running the gate once per merge batch, are the changes that matter (§4).

## 1. Coherence and drift (the finished part)

### 1.1 Architectural seams

| # | Finding | Evidence | Consequence | Fix |
|---|---|---|---|---|
| S1 | **Engine core imports a district.** | `engine/push.ts`, `runes/actions.ts`, `runes/flow.ts`, `solvents.ts` import `districts/bridges/rightOfWay` (`refusesHold`, `resists`) and `districts/bridges/support` (`cracksOf`); `trip/finish.ts` imports `lowerSeam.markDoorSeen`; `run.ts:241` tests `d === 'inkQuarter'` | Core rules know about one district. `push.ts:341` already calls two parallel refusal mechanisms side by side (`trickResists` from RV-11 and the bridges stand-in's `resists`). A drawn district that activates the collapse rule (DK-E2) works only by accident of these imports | BR-20 deletes the right-of-way stand-in (it is designed to). A new **KIT-R1** adds two kit hooks: a tile-support query (replaces `cracksOf` imports) and an after-battle-close hook (replaces `markDoorSeen`) |
| S2 | **Board UI hard-codes districts.** | `UnitToken.svelte` imports five district modules and is an `if` chain over foe ids (plus a local `STAFF` id list); `FxLayer`, `BattleBoard`, `BadgeLayer`, `Combat`, `Gallery` import districts directly. `DistrictUi` has 14 registry slots but none for unit art, effects or board layers | Every district edits the same five components, so parallel UI agents conflict. BF-17 and CG-12 will each add another branch | **KIT-R2**: add `unitArt`, `fx` and `boardLayers` slots to `DistrictUi`; the five components read the registry |
| S3 | **District code lives in `app/`.** | `app/inkTerms.ts`, `inkClock.ts`, `inkHighlights.ts`, `bridgeView.ts`; `app/describe.ts` imports ink, bridges and bathhouse data; `app/overlay.ts` imports `ui/districts/seam/hands` (app → ui) although a `highlightArt` registry exists | Two highlight systems; `describe.ts` (882 lines) grows with each district | Part of KIT-R2: a `describe` and a `highlights` entry per district module; move the four files under their district |
| S4 | **Central data files aggregate by hand.** | `data/enemies.ts` and `data/loot.ts` import each district; `data/types.ts` was edited 5–7 times per district build | The most-conflicted files in the log (merge conflicts in HC-4, FN-0, RV-15, DK-4) | Low priority. Spread from `DISTRICT_KIT` where types allow; otherwise leave |
| S5 | **Legacy pair ids remain.** | `MEMBER_IDS` still used in `app/lab.ts`, `app/faircopy.ts`, `engine/profiler.ts`, `LatticeEditor.svelte`, `data/apprentices.ts` and 12 test files | The owner as a tenth apprentice (EN-9) and recruits in the Lab and profiler take the fixed-pair path | One S task before EN-9 |
| S6 | **Two bots and no shared sim.** | `tests/sim/bot.ts` plus `tests/sim/ink-bot.ts`; `tests/sim` is 4,900 lines of per-district harnesses. Known limits in the status file: cannot use Hold, stalls on some start points, never loses an ink room | End-of-build calibration and the generator both depend on one trustworthy bot | EN-0 now, and fold the generic parts of `ink-bot.ts` into it |

### 1.2 Hidden unlisted tasks

These are owed by decisions already recorded, but appear in no "Next" or "Remaining" list.

1. **Heart frames and bot terms (EN, DK-E6).** build-program.md §4 says every district "registers its trip shape and its heart frame when it runs". `DistrictModule.heart` and `.bot` are declared in `engine/districts/types.ts` and registered by no district. The Seam and the canals register no `trip` shape either. EN-K1–K5 cannot start without them. → **KIT-R3**.
2. **The ink quarter's footnote batch (IQ-F1–F5, IQ-FG).** No draft (`footnotes-content/inkQuarter.md`), no data file (`data/footnotes/inkQuarter.ts`), no log entry, not in the status file. Unblocked since FN-C1 and IQ-22 merged.
3. **BR-19 and BR-20 are listed as gated but are not.** BR-G1 is an orchestrator review (the player delegated footnote choices), and RV-14, RV-15 and RV-20 are merged. Under the 2026-11-04 rule both are ready.
4. **`eventCap` is not passed from `battle.ts`** (FD-6 rough edge). The 500-event cap is tested but not enforced on the production path. The foundry's bell cascades (BF-3, BF-4) are the first content that can realistically hit it. Wire it before BF-4.
5. **End-of-plan obligations skipped.** The skill's Finish step asks for a code review, DESIGN §11 and TECH §7 rows and a verification file per plan. The log has no code review at all. DESIGN §11 has no built row for FD, DK, RV, FN, SM or IQ. Verification files are missing for FD, DK, RV, FN and SM (SM-15).
6. **Save durability.** The save parser is strict (`bad()` on any unknown shape) and one version (v9) has absorbed every field added since (`papers`, `checkpoints`, `doorSeen`, kit trip state). Every push deploys. No test proves that a save written by an earlier build still loads, and the player's real save is what the final playtest runs on. → **SAVE-1**: record a save fixture per opened district and assert it parses on main.
7. **Rule × rule interactions.** Lower-Seam floors and drawn districts put one district's rule on another's board. Each rule is tested alone. Nothing fuzzes pairs (boil-over with collapse, bells with writs). → **MIX-1**, before EN-2.
8. **Calibration has no plan.** It is deferred by the player's rule, correctly, but it is now spread over SM-6 (an unmerged branch), IQ-20/23, BH-16, BR-21, CN-13/14, BF-20/21 and EN-13. SM-6 moved the Marginalia from 16 to 72 HP, so the design numbers are far from the targets and the end pass is large. → one **CAL** plan on the shared bot. Record SM-6's numbers in that plan and drop the branch, which will not survive two more weeks of data changes.

### 1.3 Records that no longer match the code

| Record | Says | Actual |
|---|---|---|
| ROADMAP §2.3 | FD, DK "building"; SM, IQ, BF "planned" | FD and DK complete; SM lacks only SM-15; IQ built and open with the real postmaster; BF building |
| Status "Remaining" | "RV-8/9/11…13" open | All merged |
| Plans' `State:` lines | "Drafted (not approved)" | Built or building |
| Log task table | One row per task | Rows stop at BH-1; later tasks are bullets under "Decisions", so task accounting by table fails (a script found ~150 "missing") |
| `implement` skill | `pnpm check` before every commit; one UI agent on port 5190; Opus for Wave 0 | The real rules (`check:fast`, ports 519x, weaker models) live only in the continuation prompt, so every session relearns them from a paragraph |
| Worktrees | 13 "safe to remove" | 14 remain, 3.4 GB. All are squash-merged sources except SM-6 |

### 1.4 What held up well

The engine stayed pure (Biome enforces it, no violations). `run.ts` was split into `engine/trip/` as planned. The arrival pipeline, harm guards and rival tricks are real registries that districts use. There are no TODO or FIXME markers in `src/`, and only five `it.todo` in the tests, all naming known future cases.

## 2. Pruning and re-alignment (the remaining part)

### 2.1 Cut, merge or rescope

| Change | Why |
|---|---|
| **Build the Carillonneur and the Registrar as real rivals from the start.** Merge BF-9 with BF-23 and CG-7 with CG-15 | The stand-in step existed because RV-14 was not ready. It is merged, and BH and IQ already shipped real masters. The bridges show the cost of the detour: a stand-in mechanism that duplicates RV-11 and now has to be deleted |
| **Remove win-rate bands from task acceptance** (BF-10/11/12/20, CG-9/10, EN-K*, BR-21). Replace with: `checkRoom` passes, a scripted solve exists, fuzz finds no throw and no cap overrun | The bands contradict the no-tuning rule and are a direct cause of rework loops (SM-6, IQ-20 "room hardening", CN-13). Bands move to CAL |
| **Drop BF-21, BR-21's tuning half, IQ-20's levers as in-plan tasks** → CAL | Same reason |
| **Drop BF-1-style readability spikes for CG**; fold into CG-12 | BF-1 already settled the method (Gallery sheet, greyscale check) |
| **Fold per-plan verification tasks** (SM-15, BF-22's notes, CG-16, EN-14's notes) into one doc pass per plan written by the orchestrator at close | They are 30 minutes of orchestrator writing, not agent tasks |
| **BL-111 (bundle cost) moves into the program**, before EN-4 | Seven districts plus a generator worker in an offline-first PWA: precache size is now a real constraint, not a backlog idea |
| **BL-110 (shared scenario-log verification) moves into the program** | `lines.test.ts` and `projection.test.ts` re-run most engine suites and dominate the fast gate (§4.1) |

### 2.2 Order of execution

Tracks run in parallel; within a track the order is strict. `→` means "must merge before".

```
Track P (platform closure)          Track L (leftovers)            Track F (foundry)
  P0 records + skill (orch.)          BR-20 real Chief Warden        BF-3 (+ eventCap wiring)
  EN-0 bot to engine/sim              → KIT-R1 engine hooks          → BF-4, BF-5
  KIT-R2 UI registries                IQ-F1 → F2 → FG → F3 → F4/F5   → BF-6 → BF-7
  EN-W0 contracts                     BR-19a → BR-19b                → BF-8 → BF-9+23 (real rival)
  → KIT-R3 frames + shapes            follow-up sweep (status §2)    → BF-10, BF-11 → BF-12
  → EN-S1 spike → EN-G0 (go/no-go)    SAVE-1                         → BF-13…16, BF-19 (data)
                                                                     → BF-17, BF-18 (needs KIT-R2)
                                                                     → BF-24, BF-F1 → FG → F2 → F3
                                                                     → BF-22 open

Track C (cartographers; starts when BF-12 merges or a slot is free)
  CG-W0 → CG-1 → CG-2 → CG-3, CG-4, CG-5 → CG-6 → CG-7+15 (real rival)
  → CG-8 → CG-9 → CG-10 → CG-11, CG-13, CG-14 → CG-12 → CG-F1 → F2 → G3 → F3 → F4

Track E (ending; after EN-G0)
  early, independent:  EN-1 ledger · S5 MEMBER_IDS cleanup → EN-9 owner · EN-12 text → EN-G2 (player)
  MIX-1 → EN-2 → EN-3 → EN-4 (after BL-111), EN-7, EN-8
  EN-5 → EN-6
  EN-K1…K5 (after KIT-R3) · EN-K6 (after BF-12) · EN-K7 (after CG-10)
  EN-10 (needs CG-14) → EN-11

Close (after all tracks)
  CAL plan → BL-110 if not done → code review by subsystem → phone sweep (dark mode, capture debts)
  → DESIGN §11 / TECH §7 rows → full `pnpm check` → the player's playtest
```

Hard cross-track edges, the only ones an orchestrator needs to remember:

- BR-20 before KIT-R1 (BR-20 removes half of what KIT-R1 would otherwise wrap).
- KIT-R2 before any new board UI (BF-17, BF-18, CG-12, EN-7).
- EN-0 before EN-S1, CAL, and any new calibration harness.
- KIT-R3 before EN-S1 (the spike needs the Seam and canal shapes) and EN-K1–K5.
- BR-20 and BF-9+23 before CG-14 (the five-page hearing needs five real masters).
- EN-12 as early as possible: EN-G2 is the one gate that truly waits on the player (text approval), and their turnaround is days.

If EN-G0 is a no-go, Plan B (rooms validated at home against a pool) changes EN-2 to EN-4 and is a *Redefines* for the player. Learning that now costs one L task. Learning it after CG costs a replan under time pressure.

### 2.3 New tasks

| ID | Goal | Size | Model | Depends on |
|---|---|---|---|---|
| GATE-1 | Faster, stable gate: split the typecheck, move stray play-throughs to `tests/sim/`, fix the CN-13 timeout, add `check:changed` (§4.2) | S | Sonnet | none |
| P0 | Records: fix ROADMAP §2.3, status "Remaining", plan `State:` lines; update the skill files to the real rules; remove merged worktrees (player's OK) | S | orchestrator | none |
| KIT-R1 | Kit hooks for tile support and after-battle-close; no core file imports a district module; a lint rule (Biome `noRestrictedImports` on `engine/*.ts`) keeps it so | M | Sonnet | BR-20 |
| KIT-R2 | `DistrictUi.unitArt`, `fx`, `boardLayers`, `describe`, highlights through the registry; district files out of `app/` | M | Sonnet | none |
| KIT-R3 | `heart` frame and `bot` terms for Seam, canals, ink quarter, bathhouses, bridges; `trip` shape for Seam and canals | M (one exemplar, then four S) | Sonnet, then Haiku | EN-W0 |
| SAVE-1 | A recorded save per opened district parses on main; a mid-trip save in each | S | Haiku | none |
| MIX-1 | Fuzz pairs of district rules on one board: no throw, no cap overrun, projection equals final state | M | Sonnet | EN-0 |
| CAL | One calibration plan on the shared bot, all districts, with the deferred numbers collected | plan | orchestrator, then Sonnet | EN-0, all content |

## 3. Execution packs (the next batch)

Five packs, file-disjoint, each a single agent run of two to four sequential tasks. Each brief is meant to be pasted as is, with the standard rules appended (see §4.2 for the changed rules).

### Pack A: Foundry ring engine (Sonnet 5.5 high; escalate BF-3 to Opus after one failed review)

- **Tasks:** BF-3, then BF-4, then BF-5, in that order, one commit each.
- **Owns:** `src/engine/districts/foundry.ts`, `src/engine/districts/foundry/**`, `tests/districts/foundry/**`, and the single `eventCap` argument in `src/engine/battle.ts`.
- **Read:** foundry-plan.md §3 (P2–P4) and rows BF-3 to BF-5; the log's BF-0, BF-1 and BF-2 rows (`grep -n 'BF-[012]' docs/plans/build-program-log.md`); `engine/districts/bathhouses/boilOver.ts` as the pattern for a `late`-slot rule.
- **Contract:** set bell `onStruck`; reset hum and struck in `BELLS_RULE.step`; pass `hum` to the art through piece data; BF-5 routes Brass to retune before BF-2's `holds: 'clouds'` guard in `mix.ts`. Do not edit `push.ts` or `damage.ts`: strikes arrive through DK-4 piece triggers. If that is not enough, stop and report.
- **Done when:** a scenario per strike source; a tone rings once per round; a unit beside two bells is hit once; cap sweep at every event index disagrees nowhere; `Bolt → Brass → Strike` rings in the new tone.
- **Verify:** `pnpm vitest run tests/districts/foundry tests/engine/arrival-matrix.test.ts --reporter=dot` and `pnpm exec tsc --noEmit`.

### Pack B: Bridges completion (Sonnet 5.5 high)

- **Tasks:** BR-20 (the real Chief Warden through RV's API), then the BR-7 leftovers (drop the unwritten `BridgeTripState.spans`; `jarCrumbles` on a fall).
- **Owns:** `src/data/rivals/chiefWarden.ts`, `src/data/rivals/index.ts` (one line), `src/engine/districts/bridges/**`, `tests/rivals/chiefWarden.test.ts`, `tests/districts/bridges/**`, and the `refusesHold`/`resists` call sites in `push.ts`, `runes/actions.ts`, `solvents.ts` (deletions only).
- **Read:** bridges-plan.md P16, P17 and row BR-20; TECH §3 "Authoring a rival"; `src/data/rivals/bathSteward.ts` as the pattern.
- **Done when:** the existing heart scenarios pass unchanged against the rival; `rightOfWay.ts` is deleted and no core file imports it; his page banks on a win and is kept on a wipe; the stand-in entry is gone from `bridges/enemies.ts`.
- **Verify:** `pnpm vitest run tests/rivals tests/districts/bridges tests/engine --reporter=dot`.

### Pack C: Ink quarter footnotes (Sonnet 5.5 high for F1–F2, Haiku 5.5 high for F3–F5)

- **Tasks:** IQ-F1 and IQ-F2 in one run, ending with the draft. The orchestrator approves it (IQ-FG). A second, cheaper run builds IQ-F3, F4 and F5 from the approved text.
- **Owns:** the IQ block of `src/data/lines.ts`, `docs/plans/footnotes-audit.md` (a new section), `docs/design/footnotes-content/inkQuarter.md`, `src/data/footnotes/inkQuarter.ts`, `src/data/footnotes/index.ts` (one line), `tests/scenarios/footnotes-ink*.test.ts`.
- **Read:** footnotes-plan.md §6 (the batch template); `footnotes-content/bathhouses.md` and `data/footnotes/bathhouses.ts` as the pattern; ink-quarter-plan.md rows IQ-F1 to IQ-F5.
- **Done when:** no line without a firing scenario; `fourCombos` per margin line; one scenario per capstone; the postmaster's note is hidden until his page is held.
- **Verify:** `pnpm vitest run tests/scenarios tests/data --reporter=dot`.
- **Queue behind it (same files, so not in parallel):** BR-19a and BR-19b, same shape, drafts already in `footnotes-content/bridges.md`.

### Pack D: One bot (Sonnet 5.5 high)

- **Tasks:** EN-0, with `ink-bot.ts`'s generic trip runner folded in; raise or trim the two tests that time out under load (`tests/sim/calibration.test.ts`, `tests/data/canal-rooms.test.ts`).
- **Owns:** `src/engine/sim/**` (new), `tests/sim/**`, the timeout line in `tests/data/canal-rooms.test.ts`.
- **Read:** ending-plan.md row EN-0 and P-rows on the bot; `tests/sim/bot.ts`, `tests/sim/ink-bot.ts`.
- **Contract:** behaviour-neutral. Party-generic, deterministic, an op budget, no DOM. `tests/sim/bot.ts` re-exports so no other test file changes.
- **Done when:** every sim test gives identical results before and after (compare the JSON reporter output for `tests/sim`); same state and budget give the same actions.
- **Verify:** `pnpm vitest run tests/sim --reporter=dot` once at the start and once at the end. This pack is the only one that runs sims.

### Pack E: Board UI registries (Sonnet 5.5 high, UI, port 5191)

- **Tasks:** KIT-R2.
- **Owns:** `src/ui/districts/index.ts`, each `src/ui/districts/<id>/index.ts`, `src/ui/components/board/{UnitToken,FxLayer,BattleBoard,BadgeLayer}.svelte`, `src/ui/screens/Combat.svelte` (the one import), `src/app/overlay.ts` (the highlight import), and the moves of `app/ink*.ts` and `app/bridgeView.ts` under their districts.
- **Read:** `src/ui/districts/index.ts` (the existing slots are the pattern); district-kit-plan.md P8 and P10.
- **Contract:** behaviour-neutral. No board component imports a named district; foes with no `unitArt` entry draw the default token.
- **Done when:** `grep -rn "districts/\(seam\|canals\|bathhouses\|bridges\|inkQuarter\|foundry\)" src/ui/components src/ui/screens/Combat.svelte src/app/overlay.ts` prints nothing; one Lab screenshot per district at 375×812 matches the one taken before the change; the autofixer is clean.
- **Verify:** `pnpm typecheck` (Svelte files changed, so the full typecheck is right here) and `pnpm vitest run tests/ui tests/app --reporter=dot`.

**Orchestrator, alongside:** P0 (records and skill), EN-12 (draft the handover text so the player can review it early), and the brief for EN-W0, which starts when Pack D reports.

## 4. Workflow and usage

### 4.1 What the numbers say

From the log's usage table (about 100 readings over eight sessions):

- **Burn is linear in agents:** about 0.4 %/min with one agent, 1.2–2.3 %/min with four. A window is spent in 1.5–2.5 hours and then holds for the reset. Throughput is bound by quota, so the only lever is usage per merged task.
- **Spin-up is the visible spike.** The log repeatedly records "spin-up burst" readings of ~2 %/min right after spawning. Each agent begins by reading AGENTS.md, a 130-line plan, a design section and the code around its task. With about 165 spawns, mostly S and M tasks, that fixed cost was paid 165 times.
- **Model mix:** of the tasks with a recorded model, 58 ran on Opus, 97 on Sonnet, 9 on Haiku. A third of the work ran on the most expensive worker.
- **Verification** was timed stage by stage on main with nothing else running (16 cores, 16 GB):

| Stage | Wall time | Notes |
|---|---|---|
| `pnpm typecheck` (`svelte-check`, then `tsc`) | **4 min 40 s** | 81 % of `check:fast`. `svelte-check` already type-checks the `.ts` files in `tsconfig.json`, so the `tsc` pass that follows repeats most of that work |
| `pnpm lint` | 3 s | |
| Fast tests (307 files, 7,491 tests) | 60 s | `lines.test.ts` and `projection.test.ts` take 50 s each and set the floor (BL-110). Two bridges play-throughs (25 s and 29 s) sit in `tests/districts/` rather than `tests/sim/` |
| Sims (24 files, 546 tests) | 5 min 12 s | `household-sweep` alone is 5 min 07 s. **One test failed:** `tests/sim/canals.test.ts` (CN-13 win rates) timed out at 30 s on an idle machine |
| **`check:fast` total** | **about 5 min 45 s** | Per commit, per agent, per merge |
| **`pnpm check` total** | **about 11 min** | And currently red-prone on main for a timing reason, not a logic one |

Two consequences. First, an agent that commits three times and an orchestrator that merges it spend about 23 minutes of wall time in `check:fast`, most of it in a typecheck whose output is "0 errors"; with four agents sharing 16 cores it is slower still, which is where the recorded test timeouts come from. Second, CI takes 11–14 minutes and 9 of the last 12 runs were cancelled by the next push, so most merge commits never saw the full gate. That is acceptable only because the last run of each session passed; a flaky sim can leave the live site on an old build without anyone noticing.

### 4.2 Three changes

**1. Spawn packs, not tasks, with the context already digested.**
One agent takes two to four sequential tasks in the same files (the packs in §3). The brief carries the contract excerpt and names one pattern file, so the agent reads three files rather than exploring. This cuts spawns by about two thirds and removes most merge conflicts, because sequential work in one area never meets itself. Keep two or three agents running rather than bursts of four: the log shows the same burn per agent either way, and the tests that time out do so only under four-way load. Opus workers only by escalation after a failed review; the remaining Wave 0s (CG-W0, EN-W0) follow a template that five districts have already instantiated.

**2. Make acceptance executable and cap the returns.**
Returns happen when "done" is a prose goal that the orchestrator interprets on review. For each pack, the brief lists the scenario test names that must exist and pass (the plans' acceptance columns already nearly do this), and the agent's report is the test output for exactly those names. Remove win-rate bands from acceptance (§2.1); they cannot be met without tuning, which the player's rule forbids. One return per pack at most: a second problem under about 30 lines is fixed by the orchestrator, and anything larger becomes a new brief with the review notes. The orchestrator reviews the test diff and the public surface, and leaves line-level review to one `code-review` run per subsystem at the close.

**3. Tier verification and stop paying for it in context.**

| Who | Runs | When |
|---|---|---|
| Agent | The pack's own test paths with `--reporter=dot`, plus `tsc --noEmit` (full `pnpm typecheck` only if a `.svelte` file changed) | Before each commit |
| Orchestrator | `pnpm check:fast`, output to a file, read only the tail | Once per merge batch (two or three merges), not per merge |
| CI | Full `pnpm check` with sims | On push; read the run's result rather than repeating it locally |
| Orchestrator | Full `pnpm check` locally | Only when a plan closes |

Three fixes to the gate itself, one S task (**GATE-1**, Sonnet, before the next wave):

- Split the typecheck: time `svelte-check` and `tsc` separately, drop whichever is redundant from `check:fast`, and turn on incremental builds for the other. Until then agents working only in `.ts` files run `tsc --noEmit` alone.
- Move the two bridges play-throughs to `tests/sim/`, and give the CN-13 calibration test a timeout that fits (or fewer seeds). A gate that fails on timing teaches everyone to rerun it.
- Add `check:changed` (`vitest run --changed main --exclude 'tests/sim/**'`) for agents, so a pack runs the tests its diff can affect.

Agents should never run sims unless the pack owns them (Pack D). Put these rules in `templates.md` and `SKILL.md` so the continuation prompt can shrink to "resume from the status file".

**Smaller habits that add up:**

- **End the session at each Hold and start fresh at the reset.** A 12-hour session carries its whole history through every turn and every compaction, and the prompt cache expires during a three-hour hold anyway. The status file exists so that a cold start is cheap.
- **Log rows of one line.** The log is 235 KB for about 165 tasks, roughly 1.4 KB of orchestrator-written prose per task. Put the detail in the squash commit's body, where `git log --grep` finds it for free, and keep the log row to ID, commit, model and one clause. Restore the table format so task accounting works again.
- **Write the window's briefs up front.** Decide the two or three packs at the start of a window, then merge and record. Deciding the next task after every merge is where orchestrator turns go.
