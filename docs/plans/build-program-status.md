# Build program status (resume here)

Plans: boundary map [build-program.md](build-program.md); order [midpoint-audit.md](midpoint-audit.md) §2.2; remaining work in pack form: [platform-closure-plan.md](platform-closure-plan.md), [foundry-plan.md](foundry-plan.md), [ending-plan.md](ending-plan.md), [cartographers-plan.md](cartographers-plan.md), [calibration-plan.md](calibration-plan.md) (last). Briefs: [build-program-briefs.md](build-program-briefs.md). Log: [build-program-log.md](build-program-log.md) (not read on resume; `git log --grep '<ID>'` has each task's details; work before 2026-11-11 is in the archive log, grep only).

**State:** design window 2026-11-12 done: KIT-R3b's blockers decided (platform-closure P5–P8; KIT-R3b split into R3b–e frames and R3f–g shapes and bot terms), BR-G1 approved (C3 spawnable), every open proposal from A, D2, F2, B2, C2, F3 accepted or redirected (foundry P21–P26, ending P22–P25, closure P9, inkQuarter.md §8), briefs written for waves 5–9 and the free-slot packs · **next window: routine** (Sonnet medium), from wave 5.
**Session rules (player):**
- Pace by the 5h limit; ignore the weekly limit unless > 97 %. Schedule a wake-up at each reset (CronCreate one-shot, session-only; local time CET = UTC+1) until the player says a window is the last one or weekly usage passes 85 %.
- Models: the skill's table (Fast for content, Default for most, Strong only by role or escalation).
- 2026-11-04: `pnpm check:fast` per merge batch; sims and full-loop checks only when a wave or plan closes; no balance tuning during the build (everything goes to CAL); the player tests at the end, so **player gates never block** (build on the defaults below). Only EN-G2 (handover text) waits for the player.
**Reset:** set by the next routine session from its usage reading.

## Next
1. **Routine window, in the briefs file's order** (two or three at a time, file-disjoint; one sims pack at a time):
   wave 5 **D3b** (KIT-R3b→e) · **F4** (BF-10→11) · **E1** (KIT-R4) → wave 6 **D3c** (KIT-R3f→g, after D3b and E1) · **C3** (BR-19a→b) · **EF** (EN-5) → wave 7 **D4** (EN-S1, after D3c) · **F6** (BF-12→13, after F4 and D3b) · **ED** (EN-1→9, after E1 and C3) → wave 8 **F5** (BF-F1, after C3 and ED) · **F7** (BF-14→16) · **F8** (BF-17→19→18, UI) → wave 9 **F9** (BF-20→22) · **CW0** (CG-W0) · **O** (FU-21). Free slots: G, H, K, L now; J and B1 after D3c; I after F5; M and MIX when no sims pack runs.
2. **Next design window** (when D4 reports, F5 reports, or the review list has three entries): EN-G0 on D4's report (needs the player's phone timings on `#/dev/generator`); BF-FG review of the foundry draft and Pack J's brief; EN-12 handover draft; briefs for cartographers Packs A–J (after CW0) and ending Packs E–L (after EN-G0); the ledger.
3. Hard edges: KIT-R3b–g → EN-S1 → EN-G0 → ending Pack E · KIT-R4 → EN-9 · MIX-1 → EN-2 · BL-111 → EN-4 · KIT-R3b (frame.ts) → BF-12, CG-10 · BR-20 and BF-9 → CG-14 · CW0 → every CG pack.

## Running or partial
| Pack | Tasks | Model | Branch @ commit | State |
|---|---|---|---|---|
| none | | | | |

## Needs design review (left unmerged by a routine window)
- **Pack C3 (BR-19a→b), agent a4b7448295a7c66ac, no commits.** Four variants (`hold-held-exposed`, `hold-cracked-pinned` and their fourCombos) are "one step more from every hit", but a hit's amount is fixed in `dealDamage` (`const amount = base`, src/engine/damage.ts, not owned). Harm guards can't change an amount; `Flow.weaker` only reaches rune-handler hits, not foe attacks, bursts, crushes or falls. Options: (1) add damage.ts to the Own list for one line `amount = base + exposedBonus(ctx, unit)` (helper in actions.ts or districts/bridges/; cracked-span reads via `districts/api` `crackedTiles`); (2) narrow those variants to rune-handler hits via `Flow.weaker` (a design change to the approved bridges draft). Smaller plans the agent will take on resume: per-unit "held twice" count in an unregistered `s.rules` key valid only while held; `hold-held-shake` via capping `held` to 1 + immune-until round; `brink-cracked-dusk` reads falling spans via `crackedTiles` (a shattered keystone is the only difference). Needs a design call, then re-brief C3.
- none (KIT-R3b's two questions answered 2026-11-12: platform-closure P5 and P6; the parked attempt left no commits).

## Owed (declared by a contract, not yet built)
- From F6 (BF-12, BF-13 merged: 170837a, 45c216f): BF-22 must register the foundry loot tables (`foundry:shallow`/`deep`/`heart`) in `LootTableId`/`LOOT_TABLES` and swap the rooms' placeholder `loot` ids (or `rollOffers` throws), merge `FOUNDRY_RECRUIT_KIT` and `FOUNDRY_ROOMS_12/_34` into `FOUNDRY_KIT` (as BH-18 did), and discard rung bells on return/wipe (the BF-8 todo); BF-20 fills the bot value (`bot: {}` now); EN-K6 wraps the frame. `HEART_HOOKS` is now per heart layout (`HookTile[][]`).
- From EF (EN-5 merged, 218e771): DK-E4 rule `met` keys are mostly unwired (only `bridges:collapse` declares `'span'`; `metIn` records no rule keys), so most rules don't appear in `paletteOf.rules` until their district adds the key; foundry/cartographers masters (Carillonneur, Registrar) absent until their heart setups register (BF-12, CG-10); `ledger.districts` fed by EN-1; NEEDS map water/lamps to `canals:current`, vents to `bathhouses:boilOver` (no lane/lamp/vent piece ids).
- From F4 (BF-10, BF-11 merged: df10e08, 68524b5): rooms are exported as `FOUNDRY_ROOMS_12/_34`, not merged into `FOUNDRY_KIT.rooms` (BF-22 merges them); loot uses placeholder tables 'shallow'/'deep' (BF-13 swaps in foundry ids); room 3's recruit slot attaches by index in BF-13.
- `DistrictModule.heart` for Seam, canals, bathhouses, bridges — KIT-R3b–e (D3b); `bot` for the same four, lent shapes `seam:plain`, `canals:landings` — KIT-R3f–g (D3c); needed by EN-S1, EN-K1–K5.
- sim/bot.ts imports `bathhouses/boilOver` and `bridges/preview` under a lint exemption — KIT-R3g moves them to `botValue`/`crackedTiles` and drops the exemption.
- Foundry: `HEART_HOOKS` and the tune seed `rulesConfig: { 'foundry:tune': { seed: trip.seed } }` in `pealRoomSetup`, the foundry's `heart`/`bot` — BF-12 (P24); the foundry's `bot.value` — BF-20; the Toll note's effect (placeholder line `toll:network`) — BF-F1 confirms the line, BF-F3 builds it; the foundry save pair — BF-22.
- Cartographers' `heart` frame through `frame.ts` and `bot` — CG-10.
- Ending (from EN-W0, ending-plan §4 "Leaves for later"): ledger EN-1; owner and `mender` EN-9; palette, pen, costs, `NEEDS` EN-5 (its "generates" test EN-2); generator EN-S1 then EN-2; limits EN-G0; kits EN-K1–K7; `inkedPage` EN-3/EN-8; worker EN-4; screens EN-6/7/10/11 (`handover`, `creditsOf` in `drawing/ending.ts`).
- Ink footnote follow-ups (smother re-read, three text clauses, a `wax-cap-seal` end-to-end test) — FU-21 (Pack O).
- Close-out for FD, DK, RV, FN, SM, IQ (DESIGN §11 / TECH §7 rows, verification files incl. SM-15, a code review per subsystem) — CL-1…5 (platform-closure Pack N).
- Plans' "Leaves for later" items: copied into every brief written; copy the rest into later briefs.

## Close checklist (per plan; the program's own close is platform-closure Pack N, then CAL)
- [ ] full gate on main · [ ] full-loop phone check · [ ] code review · [ ] DESIGN §11 / TECH §7 · [ ] plan State + roadmap row · [ ] ledger clean · [ ] CI deployed

Ledger: `node .claude/skills/implement/ledger.mjs docs/plans/build-program-log.md docs/plans/{platform-closure,calibration,foundry,cartographers,ending,bridges,ink-quarter,seam-grows}-plan.md`

Ledger caveats (2026-11-12): counted merged but **open** because a commit names them: KIT-R3b, BF-12, BF-20, BF-22, BF-F1. IQ-13 shows open but is built. BR-19 = C3 (BR-19a/b). Name no open task ID in a docs commit message.

## Open questions for the player
Round held 2026-11-12 (DESIGN §11 last row): RV-20b, RV-5/10, CN-2, foundry P23, foundry Q1/P18, FN-A1 M2/M5 and the CAL bands are **decided** (all defaults except FN-A1 M2: add `steam:unit`/`brass:unit` first). Follow-ups to build: RV-20b — planner ignores jars when the Jar note is written; FN-A1 M2 — two new margin lines, to a footnote pack.
Still held at default (no decision needed): IQ-20 / IQ-G1 (playtest first), FN-1A A3 (fix text to engine), FN-4, DK-8, foundry Q2/Q3, FN-A1 M1.
- **EN-G0 (later):** the generator's phone timings come from the player's iPhone on `#/dev/generator` once D4 merges.
- Player gates open (non-blocking): IQ-G1, RV-G1, CN-P1, SM G1–G3, BH-G1, BR-G2, BF-G1, HC/AH/RC playtests.

## Rough edges (risks; the code follow-ups are FU-1…21 in the closure plan)
- 15 old agent worktrees (~3.5 GB): bulk remove needs the player's OK; tag `worktree-agent-a7d9ce60e430bee68` (SM-6, `4c77215`) as `ref/sm-6` first.
- CI cancels a run when the next push arrives: push once per merge batch.
- A test that mocks `$engine/districts/kit` must not import the real Seam module in its factory (deadlock; see `tests/run/kit.test.ts`); foundry tests import `$engine` before district files (the kit's lazy import cycle).
- UI agents: one port each (5191–5193). SM-12/14's "The margin answered" card and BH-12's meter overlap are still not phone-checked (FU-11, FU-14).
- `vents` in `turn.ts` skips tiles with a state, the opposite of bathhouses P7 (FU-7).
- C3 widens into seven core files by one guarded call each (bridges.md §8); review its diff of those files line by line before merging.

## Continuation prompt (new session)

```
/implement Resume the build program from docs/plans/build-program-status.md.
```
