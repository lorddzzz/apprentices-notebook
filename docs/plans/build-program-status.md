# Build program status (resume here)

Plans: [build-program.md](build-program.md) (boundaries); in pack form [platform-closure](platform-closure-plan.md), [foundry](foundry-plan.md), [ending](ending-plan.md), [cartographers](cartographers-plan.md), [calibration](calibration-plan.md) (last). Briefs: [build-program-briefs.md](build-program-briefs.md). Log: [build-program-log.md](build-program-log.md) (not read on resume; `git log --grep '<ID>'`).

**State:** routine window 2026-11-12d; ED, O, F5 merged (e6e3c78); I running.
**Session rules (player):**
- Pace by the 5h limit; ignore the weekly limit unless > 97 %. Wake-up at each reset (CronCreate one-shot, session-only; CET = UTC+1) until the player says stop or weekly usage passes 85 %.
- Models: the skill's table (Fast for content, Default for most, Strong only by role or escalation).
- `pnpm check:fast` per merge batch; sims and full-loop checks only when a wave or plan closes; no balance tuning (everything goes to CAL); **player gates never block**. Only EN-G2 (handover text) waits for the player.
**Reset:** 2026-11-12 18:50 CET (17:50 UTC); no wake-up scheduled (the player cancelled it earlier); resume manually. Held at 90 % of 5h, weekly 52 %. C3b merged (0c5af97); nothing running; check:fast green on main (343 files, 7896 tests).

## Next
1. **Routine windows, in the briefs file's order:** wave 11 **I** (FU-2–5).
2. **Filed by MIX (MIX-F1, unassigned, Default):** Seam hand and telegraph events project the intent and `born` flag the engine reaches at the end of the enemy phase; remove the four `KNOWN_FAILS` in `tests/sim/rule-pairs.test.ts` when it lands. The cartographers' hand joins `FEATURES` there when CG-2 merges.
3. **Next design window:** briefs for cartographers Packs A–J (CW0 merged: due now); EN-G0 once the player has timed the dev page; BF-FG (F5 merged; its questions in Needs design review); EN-12 handover draft; ending Packs E–L after EN-G0; RV-20b and FN-A1 M2 briefs; the ledger.
4. Hard edges: EN-S2 → EN-G0 → ending Pack E · C3b → ED → F5 → I · ED → O · CW0 → every CG pack · BL-111 → EN-4 · BR-20 and BF-9 → CG-14.

## Running or partial
| Pack | Tasks | Model | Branch @ commit | State |
|---|---|---|---|---|
| none | | | | |

## Needs design review (left unmerged by a routine window)
- C3: decided, briefed (pack C3b, bridges-plan P24).
- **F7 (4127679…eec836e):** far-bell goal `{ happens: 'foundry:ring' }` (no per-tone goal kind); `FOUNDRY_FLOOR_LINE` exported as plain const.
- **D5 (0d13e6e):** EN-G0 reads: fair within 4 attempts 94.4 % (P28 says 98 %), 28/500 dull; EN-S1 guardrails test setup changed; dev page `src/app/dev/generator.html`.
- **BF-FG inputs (from F5, e6e3c78):** note dominance over `toll-bell-beside`/`toll-bell-next` (trim its second clause?); Bolt stops at the cloud before a muffled bell (Q4); Filings' second run strikes nothing on a bell, a Rivet-held Detuner/Ringer still acts (Q5); one margin line each for Toll/Coil/Unison (FN P5); variants need strike flags `knell`/`wide`/`spare` and `BellsState.locked`; `coil-cap-surge` is not about bells.
- M (FU-20): decided 2026-11-12c, the `runaway` rename stands. FU-19 has no "reports it" event: only no-overlap is guaranteed.

## Owed (declared by a contract, not yet built)
- From C3b (guard done in ED): the `brink:cracked` replay line is overridden by the inner rune's own line (by design, tests assert damage events).
- **C3 hygiene (bridges Close code review):** `lay-cap-footing` and `mortar-cap-set` write bridges state through a `shove` piece strike keyed by `ctx.meta.line` (mix.ts, push.ts → wear.ts `footnoteTouch`): replace with named `districts/api` writes as P24's `spendFallenBrass`; `brinkLine` calls `crackedTiles` on snapshot tiles with the live rule state; `runStep` gained a generic `{ after }` job for Brink's follow-ups (keep it Brink-only or document it).
- From B1 (FU-1): `note?` on `WayView` (`src/app/crossroads.ts`), rendered as its own line in `CrossroadsChoices.svelte`; Small, Default; phone check.
- BL-111 (H): offline check unmet (real Chrome: `pnpm build && pnpm preview`, SW installed, offline: home, a Seam trip, the Lab); App.svelte not autofixed.
- From F8: `Meets` gained `bell`, `rope` in `src/data/types.ts` (ED rebases on it). Pack K: FU-12 did not see the footnote line slots; DistrictNode.svelte not autofixed; FU-11 checked in the Lab only.
- Foundry (F4, F6): the Toll note's line is `toll:bell` at level II (BF-F1); BF-F3 builds it and edits src/data/rivals/carillonneur.ts and tests/rivals/carillonneur.test.ts; EN-K6 wraps the frame.
- From EF (EN-5): rule `met` keys mostly unwired (only `bridges:collapse` declares `'span'`); the Registrar joins the masters at CG-10.
- From CW0: CG-1 registers `CARTOGRAPHERS_MODULE` in `districts/kit.ts` and moves the fixtures in `tests/engine/pieces.test.ts` and `tests/app/bench-registry.test.ts` to another module id in the same commit; `HAND_SALT = 8100`; `heart` frame (salt 7160) and `bot` at CG-10.
- From ED (EN-9): fine print `mender:diagonal` and `mender:dusk` need two new `Meets` members in src/data/types.ts, then their rows in lines.ts; the engine stamps none of the three `mender:*` keys yet (`mender:unit` row is `pending`). Small, Default; next engine pack touching types.ts.
- Ending (ending-plan §4): EN-G0 limits, EN-2 the walk, CAL-5 the numbers; EN-K1–K7 kits; EN-3/EN-8 `inkedPage`; EN-4 worker; EN-6/7/10/11 screens.
- Close-out for FD, DK, RV, FN, SM, IQ: CL-1…5 (Pack N). Plans' "Leaves for later" items: copied into every brief written.

## Close checklist (per plan; the program's own close is platform-closure Pack N, then CAL)
- [ ] full gate on main · [ ] full-loop phone check · [ ] code review · [ ] DESIGN §11 / TECH §7 · [ ] plan State + roadmap row · [ ] ledger clean · [ ] CI deployed

Ledger: `node .claude/skills/implement/ledger.mjs docs/plans/build-program-log.md docs/plans/{platform-closure,calibration,foundry,cartographers,ending,bridges,ink-quarter,seam-grows}-plan.md`
Ledger caveats: counted merged but **open** because a commit names them: BF-20, BF-22, BF-F1. IQ-13 shows open but is built. BR-19 = C3 (BR-19a/b); BR-19c = C3b (open). Name no open task ID in a docs commit message.

## Open questions for the player
- **EN-G0:** time `#/dev/generator` on the iPhone (20 samples; median and p95 per offered room).
- Held at default: IQ-20 / IQ-G1, FN-1A A3, FN-4, DK-8, foundry Q2/Q3, FN-A1 M1. Player gates open (non-blocking): IQ-G1, RV-G1, CN-P1, SM G1–G3, BH-G1, BR-G2, BF-G1, HC/AH/RC playtests.

## Rough edges (risks)
- `brink-cap-fall` is in the data (offerable) with no effect until C3b merges; a mid-fight save with it written restarts its fight once C3b lands (the "no longer replays" path).
- 15 old agent worktrees (~3.5 GB): removal needs the player's OK; first tag `worktree-agent-a7d9ce60e430bee68` (`4c77215`) as `ref/sm-6`.
- CI cancels a run when the next push arrives: push once per merge batch.
- A test mocking `$engine/districts/kit` must not import the real Seam module in its factory; tests import `$engine` before district files (the kit's lazy import cycle).
- D5 raised foe budgets, so generator ops and timings grew; EN-G0 reads the new numbers.

## Continuation prompt (new session)

```
/implement Resume the build program from docs/plans/build-program-status.md.
```
