# Build program status (resume here)

Plans: boundary map [build-program.md](build-program.md); order [midpoint-audit.md](midpoint-audit.md) §2.2; remaining work in pack form: [platform-closure-plan.md](platform-closure-plan.md), [foundry-plan.md](foundry-plan.md), [ending-plan.md](ending-plan.md), [cartographers-plan.md](cartographers-plan.md), [calibration-plan.md](calibration-plan.md) (last). Briefs: [build-program-briefs.md](build-program-briefs.md). Log: [build-program-log.md](build-program-log.md) (not read on resume; `git log --grep '<ID>'` has each task's details; work before 2026-11-11 is in the archive log, grep only).

**State (now):** R3a merged (8263248); R3b parked for design review (above); F3 running. Next window: design (decide R3b blockers, rewrite its brief as frames-per-district tasks), then D4.
**State (current):** C2 (IQ-F3–F5, 300e481, 7d8aa8d, 87d09e8) merged and pushed; remaining Wave 3: D3 (KIT-R3), F3 (Carillonneur); then D4. Design-window items from C2: (1) `wax-cloud-smother` cannot fire (a tile holds one layer; fire tile never holds cloud) — needs a design call; (2) Levy emits a miss per unmarked target even in an area; (3) levy bank fires at the third spend in a cast; (4) bound deep mark: release beats peel; (5) Sentence strikes only removable collars, not born-brass `&`; (6) wax seal lives in solvents.ts wax rule hooks, only in wax invention runs, no end-to-end test; footnote line-variant count 182→211. Ink-quarter footnotes are done.
**State (newest):** Wave 2 done: B2 (KIT-R1, dec8acf) and F2 (BF-6–8, 1742421, c65f7b1) merged and pushed; next Wave 3 (C2, D3, F3). F2 proposals for design window: one line in core `damage.ts` `dealDamage` calls `behaviourOf(unit)?.onStruck`; EnemyId gains the 3 foes; Clapper tone from id ordinal; a Shove has no origin so no distinct striker for Unison; `HEART_HOOKS` in peal.ts empty, BF-12 fills it. D3 must remove the `!src/engine/sim/bot.ts` include and its sentence from biome.json's second override (KIT-R3b).
**State (latest):** D2 (EN-W0, 001e345) merged; next Wave 2: F2 and B2 (both unblocked). D2 proposals for design window: Profile.drawings/ending/ledger optional (stored only when non-empty); handover/creditsOf stubs live in src/engine/drawing/ending.ts (Pack L moves or re-exports); MasterId is a literal union of eight; EN-9 todos duplicated in tests/drawing (Pack D removes them). Owed list from D2 is in the commit body (`git log --grep EN-W0`).
**State (updated):** Wave 1 packs A and S merged; D2 not started (usage). Next: D2, then Wave 2 (F2, B2) per the briefs file. Pack A proposals to look at in the next design window: duplicate strikes on one bell collapse until settle; a capped action drops the queue; two BF-3 acceptance boards got a far foe row; bf0-contracts/pieces/tune tests touched; foundry tests must `import '$engine'` first (kit import cycle).
**State (older):** design window 2026-11-11 done: Pack A's hooks decided (foundry P18–P20), IQ-FG approved, briefs written for waves 1–4 · **next window:** routine
**Session rules (player):**
- Pace by the 5h limit; ignore the weekly limit unless > 97 %. Schedule a wake-up at each reset (CronCreate one-shot, session-only; local time CET = UTC+1) until the player says a window is the last one or weekly usage passes 85 %.
- Models: the skill's table (Fast for content, Default for most, Strong only by role or escalation).
- 2026-11-04: `pnpm check:fast` per merge batch; sims and full-loop checks only when a wave or plan closes; no balance tuning during the build (everything goes to CAL); the player tests at the end, so **player gates never block** (build on the defaults below). Only EN-G2 (handover text) waits for the player.
**Reset:** 2026-11-12 03:30 CET (02:30 UTC); wake-up scheduled 03:33 CET (CronCreate, session-only: if the session is closed, resume manually with the continuation prompt below). Held at 90 % of 5h, weekly 25 %. Next: D3 and F3 together (both Strong/Default), then D4; routine window.

## Next
1. **Routine window, in the briefs file's order** (two or three at a time, file-disjoint as the table there states):
   wave 1 **A** (BF-3→5) · **D2** (EN-W0) · **S** (SAVE-1 + canal-rooms timeout) → wave 2 **F2** (BF-6→8, after A) · **B2** (KIT-R1, after A and D2) → wave 3 **C2** (IQ-F3→F5, after A and B2) · **D3** (KIT-R3a→b, after B2 and D2) · **F3** (BF-9→24, after F2) → wave 4 **D4** (EN-S1, after D3).
2. **Next design window** (when the briefs above run out or the review list has three entries): BR-G1 review of `docs/design/footnotes-content/bridges.md` and C3's ids; EN-G0 on D4's report (needs the player's phone timings); EN-12 draft (after D2); briefs for foundry Packs D–J (rooms share `src/data/districts/foundry.ts`: one at a time), closure Packs E, G–M and the FU sweep, KIT-R4, MIX-1; the ledger.
3. Hard edges: KIT-R2 (merged) → any new board UI (BF-17, BF-18, CG-12, EN-7) · EN-0 → EN-W0 → KIT-R3 → EN-S1 → EN-G0 · EN-0 → MIX-1 → EN-2 · KIT-R4 → EN-9 · BL-111 → EN-4 · BR-20 and BF-9 → CG-14 · cartographers start when BF-12 merges or a slot is free.

## Running or partial
| Pack | Tasks | Model | Branch @ commit | State |
|---|---|---|---|---|
| none | | | | |

## Needs design review (left unmerged by a routine window)
- none (Pack A's question answered by foundry P18–P20, 2026-11-11; the stopped agent left no commits or worktree: spawn A fresh from its brief).

## Owed (declared by a contract, not yet built)
- `eventCap` passed through `applyAction` (FD-6) — owed by BF-3 (Pack A); needed by BF-4.
- Settle points (foundry P18) — owed by BF-3: `BoardRule.settle`, `settleRules` at four points; any later rule with a mid-action queue uses it.
- TECH.md §3 still names `bridges:rightOfWay` as its authoring example (now `bridges:keystoneRight`) — owed by KIT-R1 (B2). Stand-in steps stay in `bridges/heart.ts` for the Lab.
- `src/engine/sim/bot.ts` imports `bathhouses/boilOver` and `bridges/preview` (since EN-0) — KIT-R1 exempts it in the lint rule; KIT-R3b moves them into `bot` terms and drops the exemption.
- `DistrictModule.heart` and `.bot` for Seam, canals, ink quarter, bathhouses, bridges; `trip` shape for Seam and canals — owed by KIT-R3 (D3); needed by EN-S1, EN-K1–K5. The foundry and cartographers register theirs in their own plans (BF-12, CG-10).
- Ink quarter footnotes (approved text, IQ-FG): IQ-F3 adds the seven engine stamps (sentence:mark in actions.ts `sentence`; levy:unit miss, levy:mark/member at `markSpent`, levy:shielded in `levy`; tally:collar/stamp as the `line` from flow.ts `trial`), drops `pending` and `it.fails`; IQ-F4 widens `sand:noTarget`; `finePrint` in `src/app/study.ts` filters pending rows — all in Pack C2.
- `tests/data/canal-rooms.test.ts` timeout (one line) — Pack S.
- Close-out for FD, DK, RV, FN, SM, IQ (DESIGN §11 / TECH §7 rows, verification files incl. SM-15, a code review per subsystem) — owed by CL-1…5 (platform-closure Pack N).
- Plans' "Leaves for later" items: copied into every brief written; copy the rest into later briefs.

## Close checklist (per plan; the program's own close is platform-closure Pack N, then CAL)
- [ ] full gate on main · [ ] full-loop phone check · [ ] code review · [ ] DESIGN §11 / TECH §7 · [ ] plan State + roadmap row · [ ] ledger clean · [ ] CI deployed

Ledger: `node .claude/skills/implement/ledger.mjs docs/plans/build-program-log.md docs/plans/{platform-closure,calibration,foundry,cartographers,ending,bridges,ink-quarter,seam-grows}-plan.md`

Ledger caveats (run 2026-11-11, design window): it counts GATE-1 and BF-3 to BF-9 as merged because two consolidation commits name them; BF-3 to BF-9 are **open** (GATE-1 is merged). It counts **IQ-F3** as merged because commit 61ffb54 names it; it is open (Pack C2). IQ-13 shows open but is built (archive log, prose only). Every other open ID is in Next 1 or 2.

## Open questions for the player (defaults held; ask in the next design round)
- **IQ-20 / IQ-G1:** the bot never loses an ink-quarter room with a fresh pair. Default: playtest first; levers are in the calibration plan.
- **CN-2:** shoving a moored crate crushes it; a crate pushed across the mooring without stopping does not moor. Default: as built.
- **RV-20b:** the rival planner never walks onto a step-jar, so the "Jar" note has no visible effect. (a) planner ignores jars when the note is written, (b) a different effect.
- **RV-5 / RV-10:** should the planner account for allies when the wick lands? Default no.
- **FN-A1:** M1 Margin capstone reuses FN-11's diagonal reach; M2 add `steam:unit`/`brass:unit` lines first?; M5 `oil-slick-short`/`shove-wall-soft` read as costs, keep?
- **FN-1A A3:** Cinder vs a rat's oil trail over a hot tile. Default: fix the text to match the engine.
- **FN-4:** Desk rows still need ≥ 1 point. Default keep. **DK-8:** friendly fire counts for hearing. Default keep.
- **CAL:** bridges and the foundry have no stated win-rate band. Default: the canals' band.
- **Foundry Q1–Q3** (plan §7): once-per-round ring (hum), allied bells spare the party, the far-bell gate needs a striker. Defaults as planned; P18's ring timing joins Q1 at BF-G1.
- **EN-G0 (later):** the generator's phone timings come from the player's iPhone on `#/dev/generator` once D4 merges.
- Player gates open (non-blocking): IQ-G1, RV-G1, CN-P1, SM G1–G3, BH-G1, BR-G2, HC/AH/RC playtests.

## Rough edges (risks; the code follow-ups are FU-1…20 in the closure plan)
- 15 old agent worktrees (~3.5 GB) are merged sources; a bulk remove needs the player's OK. Tag `worktree-agent-a7d9ce60e430bee68` (SM-6, `4c77215`) as `ref/sm-6` first.
- CI cancels a run when the next push arrives: push once per merge batch.
- A test that mocks `$engine/districts/kit` must not import the real Seam module in its factory (deadlock; see `tests/run/kit.test.ts`).
- UI agents: one port each (5191–5193). SM-12/14's "The margin answered" card and BH-12's meter overlap are still not phone-checked (FU tasks).
- `vents` in `turn.ts` skips tiles with a state, the opposite of bathhouses P7 (FU task; not a calibration item).
- Pack A widens into seven core files by one call or field each (foundry P18–P19); review its diff of those files line by line before merging.

## Continuation prompt (new session)

```
/implement Resume the build program from docs/plans/build-program-status.md.
```
