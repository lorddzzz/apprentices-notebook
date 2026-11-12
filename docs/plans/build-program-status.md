# Build program status (resume here)

Plans: boundary map [build-program.md](build-program.md); order [midpoint-audit.md](midpoint-audit.md) §2.2; remaining work in pack form: [platform-closure-plan.md](platform-closure-plan.md), [foundry-plan.md](foundry-plan.md), [ending-plan.md](ending-plan.md), [cartographers-plan.md](cartographers-plan.md), [calibration-plan.md](calibration-plan.md) (last). Briefs: [build-program-briefs.md](build-program-briefs.md). Log: [build-program-log.md](build-program-log.md) (not read on resume; `git log --grep '<ID>'` has each task's details; work before 2026-11-11 is in the archive log, grep only).

**State:** design window 2026-11-12b done (waves 5–7 merged but C3 and ED; their questions decided in bridges-plan P21–P23 and ending-plan P26–P27; D4's walkovers answered by EN-S2, ending-plan P28; briefs for waves 8–13) · **next window: routine** (Sonnet medium), from wave 8.
**Session rules (player):**
- Pace by the 5h limit; ignore the weekly limit unless > 97 %. Schedule a wake-up at each reset (CronCreate one-shot, session-only; local time CET = UTC+1) until the player says a window is the last one or weekly usage passes 85 %.
- Models: the skill's table (Fast for content, Default for most, Strong only by role or escalation).
- 2026-11-04: `pnpm check:fast` per merge batch; sims and full-loop checks only when a wave or plan closes; no balance tuning during the build (everything goes to CAL); the player tests at the end, so **player gates never block** (build on the defaults below). Only EN-G2 (handover text) waits for the player.
**Reset:** window reset 2026-11-12 13:50 CET; wave 8 ran (F7, D5 merged, C3 merged with review items). CW0 merged (fa1876d). G merged (0ffa10b). F8 merged (5385674). L reported (FU-13–15 verified, FU-16 open). K reported (FU-9–12 done). F9 merged (139c416); foundry is open. H reported (BL-111 partial). MIX merged (168494e). M reported (FU-17–20 committed). J merged (FU-6/7/8). Nothing running; check:fast green on main (341 files, 7882 tests), shared main checkout; B1 and M not started; ED held on C3 review; check:fast green on main (339 files, 7869 tests). ED waits on the C3 design review.

## Next
1. **Routine windows, in the briefs file's order** (two or three at a time, file-disjoint; one sims pack at a time):
   wave 8 **C3** (BR-19a→b) · **D5** (EN-S2, sims) · **F7** (BF-14→16) → wave 9 **ED** (EN-1→9, after C3) · **F8** (BF-17→19→18, UI) · **CW0** (CG-W0) → wave 10 **F5** (BF-F1, after C3 and ED) · **F9** (BF-20→22, after F7, F8, CW0; sims) · **O** (FU-21, after ED) → wave 11 **I** (after F5) · **MIX** (sims) · **G** → wave 12 **M** (after C3; sims) · **K** · **L** → wave 13 **J** · **B1** · **H**. Free-slot packs may move up into an open slot if the clash list allows.
2. **Filed by MIX (new task MIX-F1, unassigned, Default):** make the Seam hand and telegraph events project the intent and `born` flag the engine reaches at the end of the enemy phase; remove the four `KNOWN_FAILS` entries in `tests/sim/rule-pairs.test.ts` when it lands. The cartographers' guild hand joins `FEATURES` there when CG-2 merges.
3. **Next design window** (when D5 reports and the player has timed its dev page, F5 reports, CW0 reports, or the review list has three entries): EN-G0 on D5's report and the phone timings; BF-FG review of the foundry draft and Pack J's brief; EN-12 handover draft; briefs for cartographers Packs A–J (after CW0) and ending Packs E–L (after EN-G0); the ledger.
4. Hard edges: EN-S2 → EN-G0 → ending Pack E (also needs MIX-1) · C3 → ED → F5 → I · ED → O · F7, F8, CW0 → F9 · CW0 → every CG pack · BL-111 → EN-4 · BR-20 and BF-9 → CG-14.

## Running or partial
| Pack | Tasks | Model | Branch @ commit | State |
|---|---|---|---|---|
| none | | | | |

## Needs design review (left unmerged by a routine window)
- **C3 @ main (d39aa96, bbf7b32), committed but with open questions:** (1) `brink-cap-fall` and `chalk-network-ring` are not built (cap-fall needs Brink's rest carried cast→dusk, nothing can carry a Step across turns; chalk ring needs a `districts/api` reader for the fallen brass tile and a bridges-state field, `parseBridges` drops unknown fields); Brink's capstone slot has `brink-cap-rim` only. Decide: add a dusk-replay carrier and api reader, or cut both. (2) Edits outside the owned list: `inventions.ts` `conduct`, `mix.ts` `landOnTile`, `actions.ts` shove `bonus`, `push.ts` `PushOptions.bonus`; resolve.ts +189 lines; core reaches bridges via a `shove` piece strike keyed by `ctx.meta.line` handled in `wear.ts`. (3) `lay-cracked-spent` text reworded (plates and walls only); shake beats `hold-held-extend`; `hold-cap-crush` foes only; test count 211→239 in `tests/data/footnotes.test.ts`. Review the core-file diff line by line and check no golden moved before ED starts.
- **F7 (4127679…eec836e):** far-bell goal `{ happens: 'foundry:ring' }` (no per-tone goal kind); `FOUNDRY_FLOOR_LINE` exported as plain const.
- **D5 (0d13e6e):** EN-G0 reads: fair within 4 attempts 94.4 % (P28 says 98 %), 28/500 dull; EN-S1 guardrails test setup changed; dev page is `src/app/dev/generator.html`.

- **M (FU-20) @ main:** the DK-7 round-trip card in `tests/engine/offer-kinds.test.ts` named the founder `stoker`, which FU-20's parse now rejects, so the agent renamed it to `runaway` (a test change, not accepted by a routine window). Decide: is renaming the card right, or should DK-7's card keep a founder where its own test says? FU-19 has no 'reports it' event: only no-overlap is guaranteed.

## Owed (declared by a contract, not yet built)
- BL-111 (H): the offline check (service worker installed, network off: home, a Seam trip, the Lab) is unmet; needs real Chrome (Claude in Chrome or the player): open `pnpm build && pnpm preview`, install the SW, go offline in DevTools. Further splitting (Codex, Study, Bench, engine) is a separate decision; App.svelte not autofixed.
- FU-16 (ink room, term card, clock seal, stamp preview in dark) is open: `theme.css` has only dark accent hues, no dark surfaces (`--parchment`, `--ink`), so a dark check is meaningless until a dark theme exists (design question: build one, or drop the dark checks from the Close sweep). Also needs a Lab or fixture ink-quarter trip.
- From F8: `Meets` gained `bell` and `rope` in `src/data/types.ts` (ED also edits that file; rebase on it). Dark mode of foundry screens: app has no dark theme, Close sweep. The shared browser tab on port 5192 was navigated away by F8; harmless.
- Pack K left: FU-12 did not see the footnote line slots (synthetic save had only the capstone frame); DistrictNode.svelte not autofixed; FU-11 checked in the Lab only. `DistrictUi.thresholdLabel` added (additive). Stale FU-11 'meter overlap' note in Rough edges is resolved.
- Foundry (from F4, F6): BF-22 registers the foundry loot tables and swaps the rooms' placeholder ids, merges rooms, heart and recruit kit into `FOUNDRY_KIT`, discards rung bells on return/wipe, adds the save pair; BF-20 the `bot.value`; EN-K6 wraps the frame (all in F9's brief). BF-F1 confirms the Toll note's line (`toll:network`), BF-F3 builds it.
- From EF (EN-5): DK-E4 rule `met` keys mostly unwired (only `bridges:collapse` declares `'span'`), so most rules stay out of `paletteOf.rules` until their district adds the key; the Registrar joins the masters at CG-10; `ledger.districts` fed by EN-1.
- From D4 (EN-S1): rooms are walkovers; EN-S2 (D5) adds the two-sided judge, the walk and `GEN_TUNING`; EN-G0 the limits in `src/data/tuning.ts`; EN-2 the walk in production; CAL-5 the numbers.
- From CW0: CG-1 registers `CARTOGRAPHERS_MODULE` in `src/engine/districts/kit.ts` and moves the fixtures in `tests/engine/pieces.test.ts` and `tests/app/bench-registry.test.ts` to another module id in the same commit; hand salt is `HAND_SALT = 8100`.
- Cartographers' `heart` frame through `frame.ts` (salt 7160) and `bot` — CG-10.
- Ending (EN-W0, ending-plan §4): ledger EN-1; owner and `mender` EN-9; generator EN-S2 then EN-2 (with "EN-5: every offered combination generates"); limits EN-G0; kits EN-K1–K7; `inkedPage` EN-3/EN-8; worker EN-4; screens EN-6/7/10/11 (`handover`, `creditsOf` in `drawing/ending.ts`).
- Ink footnote follow-ups — FU-21 (Pack O).
- Close-out for FD, DK, RV, FN, SM, IQ (DESIGN §11 / TECH §7 rows, verification files incl. SM-15, a code review per subsystem) — CL-1…5 (platform-closure Pack N).
- Plans' "Leaves for later" items: copied into every brief written; copy the rest into later briefs.

## Close checklist (per plan; the program's own close is platform-closure Pack N, then CAL)
- [ ] full gate on main · [ ] full-loop phone check · [ ] code review · [ ] DESIGN §11 / TECH §7 · [ ] plan State + roadmap row · [ ] ledger clean · [ ] CI deployed

Ledger: `node .claude/skills/implement/ledger.mjs docs/plans/build-program-log.md docs/plans/{platform-closure,calibration,foundry,cartographers,ending,bridges,ink-quarter,seam-grows}-plan.md`

Ledger caveats (2026-11-12b): counted merged but **open** because a commit names them: BF-20, BF-22, BF-F1. IQ-13 shows open but is built. BR-19 = C3 (BR-19a/b). EN-S2 is new (D5). Name no open task ID in a docs commit message.

## Open questions for the player
- **EN-G0 (needs the player, after D5 merges):** time `#/dev/generator` on the iPhone (20 samples; median and p95 per offered room). D4's rooms were walkovers, so their timings would undercount the rooms that ship.
- Held at default (no decision needed): IQ-20 / IQ-G1 (playtest first), FN-1A A3, FN-4, DK-8, foundry Q2/Q3, FN-A1 M1. Decided 2026-11-12, not yet briefed (next design window): RV-20b (planner ignores jars when the Jar note is written), FN-A1 M2 (`steam:unit`, `brass:unit` margin lines).
- Player gates open (non-blocking): IQ-G1, RV-G1, CN-P1, SM G1–G3, BH-G1, BR-G2, BF-G1, HC/AH/RC playtests.

## Rough edges (risks; the code follow-ups are FU-1…21 in the closure plan)
- 15 old agent worktrees (~3.5 GB): bulk remove needs the player's OK; tag `worktree-agent-a7d9ce60e430bee68` (SM-6, `4c77215`) as `ref/sm-6` first.
- CI cancels a run when the next push arrives: push once per merge batch.
- A test that mocks `$engine/districts/kit` must not import the real Seam module in its factory (deadlock; see `tests/run/kit.test.ts`); foundry tests import `$engine` before district files (the kit's lazy import cycle).
- UI agents: one port each (5191–5193, as the briefs assign). SM-12/14's card and BH-12's meter overlap are now phone-checked (FU-14, FU-11).
- `vents` in `turn.ts` skips tiles with a state, the opposite of bathhouses P7 (FU-7).
- C3 widens into eight core files by one guarded call each (bridges.md §8, plus `dealDamage`'s exposure step, P21) and adds two optional `Unit` fields; review its diff of those files line by line before merging, and check no golden or scenario output moved.
- D5 raises foe budgets, so generator ops and timings grow; EN-G0 reads the new numbers, not EN-S1's.

## Continuation prompt (new session)

```
/implement Resume the build program from docs/plans/build-program-status.md.
```
