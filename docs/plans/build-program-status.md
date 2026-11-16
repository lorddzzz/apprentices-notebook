# Build program status (resume here)

Plans: [build-program.md](build-program.md) (boundaries); in pack form [platform-closure](platform-closure-plan.md), [foundry](foundry-plan.md), [ending](ending-plan.md), [cartographers](cartographers-plan.md), [calibration](calibration-plan.md) (last). Briefs: [build-program-briefs.md](build-program-briefs.md). Log: [build-program-log.md](build-program-log.md) (not read on resume; `git log --grep '<ID>'`).

**State:** design window 2026-11-16 done (docs only): every design review decided (DESIGN §11, TECH §7 2026-11-16), the three drafts approved, briefs written for S, T, U, V, CG-J; CG-G and CG-H amended. CG-F merged (3062b50, logged). Routine window 2026-11-16: wave 19: T merged (6fbe977); S, CG-G, U running. **Next window: routine.**
**Session rules (player):**
- Pace by the 5h limit; ignore the weekly limit unless > 97 %. The player resumes manually in a fresh session at each reset (CET = UTC+1); schedule a wake-up only when it opens a new session.
- A routine window starts a due design window itself as a subagent, without asking; player questions go to Open questions with a default held.
- Models: the skill's table (Fast for content, Default for most, Strong only by role or escalation).
- `pnpm check:fast` per merge batch; sims and full-loop checks only when a wave or plan closes; no balance tuning (everything goes to CAL); **player gates never block**. Only EN-G2 (handover text) waits for the player.
**Reset:** 2026-11-13 01:30 CET (00:30 UTC); no wake-up scheduled; resume manually. Weekly 57 %.

## Next
0. Read each push's CI result (sims run only there); a red run is a fix pack in the current wave (player, 2026-11-12). Log rows carry all six cells, usage Δ included (the ledger checks the format).
1. **Routine:** record CG-F (3062b50). Start **S**, **T** and **CG-G** now (wave 19). Then wave 20: **CG-H** and **CG-J** (after S), **U** (after T). Then wave 21: **V** (after U). Order table and clash notes: the briefs file.
2. A pack that edits `src/data/types.ts` runs `pnpm exec tsc --noEmit` (CI-3); T may add it to `check:fast`.
3. **Next design window** (when the briefs run out, or three reviews pile up): EN-G0 once the player has timed the dev page, then ending Packs E–L; EN-12 handover draft; cartographers Close after CG-G/H/J.
4. Hard edges: EN-S2 → EN-G0 → ending Pack E · S → CG-H, CG-J · T → U → V · BL-111 → EN-4.

## Running or partial
| Pack | Tasks | Model | Branch @ commit | State |
|---|---|---|---|---|
| S | CG-3b, CG-F1b | Sonnet 5.5 medium | pack-worker worktree | running (5h 6 %) |
| U | FN-M2c, EN-9c | Sonnet 5.5 medium | pack-worker worktree | running |
| CG-G | CG-8b, 13, 14, 16 | Sonnet 5.5 medium | pack-worker worktree | running (5h 6 %) |

## Needs design review (left unmerged by a routine window)
- none. (Decided 2026-11-16: the golden decision → replay re-store, Pack U; `LineId` → Pack T; Pencil Shove and Graphite on blank → Pack S; CG-I's proposals and the three drafts → DESIGN §11. F7, M and C3 recorded as accepted earlier; D5's numbers wait for EN-G0.)

## Owed (declared by a contract, not yet built)
- BL-111 (H): offline check unmet (real Chrome: `pnpm build && pnpm preview`, SW installed, offline: home, a Seam trip, the Lab); App.svelte not autofixed.
- From F8: Pack K: FU-12 did not see the footnote line slots; DistrictNode.svelte not autofixed; FU-11 checked in the Lab only.
- Foundry: EN-K6 wraps the frame.
- From EF (EN-5): rule `met` keys mostly unwired (only `bridges:collapse` declares `'span'`); the Registrar joins the masters at CG-10 (check in CG-F's merge record).
- From ED (EN-9) and the golden decision: `mender:diagonal` row and stamp, `steam:unit`/`brass:unit` stamps → Pack U (`mender:dusk` dropped).
- From I (FU-5) and FN-A1 M2: the Afterglow and `steam:unit`/`brass:unit` variants → Pack V.
- From CG-I: CG-F3 stamps `swap:unit` on `swapped` → Pack CG-J. From CG-D: his page note (`registrar:swap`) → CG-J; the heart/wipe tests on the real district → CG-G.
- From CG-E: *Through the doorway* app wiring; from CG-F: `ROOM_PENCIL` applied per room through `roomSetup` → Pack CG-G (CG-8b).
- Ending (ending-plan §4): EN-G0 limits, EN-2 the walk, CAL-5 the numbers; EN-K1–K7 kits; EN-3/EN-8 `inkedPage`; EN-4 worker; EN-6/7/10/11 screens.
- Close-out for FD, DK, RV, FN, SM, IQ: CL-1…5 (Pack N). Plans' "Leaves for later" items: copied into every brief written.

## Close checklist (per plan; the program's own close is platform-closure Pack N, then CAL)
- [ ] full gate on main · [ ] full-loop phone check · [ ] code review · [ ] DESIGN §11 / TECH §7 · [ ] plan State + roadmap row · [ ] ledger clean · [ ] CI deployed

Ledger: `node .claude/skills/implement/ledger.mjs docs/plans/build-program-log.md docs/plans/{platform-closure,calibration,foundry,cartographers,ending,bridges,ink-quarter,seam-grows}-plan.md`
Ledger caveats (2026-11-16 run): IQ-13 shows open but is built. EN-10 shows open, which is right. BR-19 = C3 (BR-19a/b) + C3b (BR-19c, merged 0c5af97). FU-13–16 and CAL-4 appear in the log's prose only (FU-13–15 built in SM's track; FU-16 dropped with the dark theme; CAL-4 belongs to CAL). CG-F3 appears in the log's prose only (CG-J builds it). SM-15 is a verification file (CL). The 2026-11-16 briefs' new IDs are in no plan table. (The ledger does not count `docs: …` record commits or commit bodies, and reads every ID in a log row's first cell.)

## Open questions for the player
- **EN-G0:** time `#/dev/generator` on the iPhone (20 samples; median and p95 per offered room). D5's inputs: fair within 4 attempts 94.4 % (P28 says 98 %), 28/500 dull; EN-S1 guardrails test setup changed; dev page `src/app/dev/generator.html`.
- Held at default: IQ-20 / IQ-G1, FN-1A A3, FN-4, DK-8, foundry Q2/Q3, FN-A1 M1, cartographers §7 Q1–Q3. Player gates open (non-blocking): IQ-G1, RV-G1, CN-P1, SM G1–G3, BH-G1, BR-G2, BF-G1, CG-G1/G2, HC/AH/RC playtests.

## Rough edges (risks)
- Accepted as implementation detail (details in the log rows): CG-A's lazy first plan (a strand-guard flip could differ between preview and result in a rare first-round case); Pack Q's `simulate` still runs with empty footnotes.
- A basic Shove at an empty bridges span is still legal and does nothing (kept for saves that replay recorded Shoves; Pack S scopes the fix to the paper pieces). Review at CAL-0.
- The Registrar's note with `swap-unit-strand` is a sure erasure of a foe on pencil (two slots and a held page): a CAL watch item.
- The SM-6 branch `worktree-agent-a7d9ce60e430bee68` is kept (tag `ref/sm-6`); review it at CAL-0 in calibration-plan.md.
- CI cancels a run when the next push arrives: push once per merge batch.
- A test mocking `$engine/districts/kit` must not import the real Seam module in its factory; tests import `$engine` before district files (the kit's lazy import cycle).
- D5 raised foe budgets, so generator ops and timings grew; EN-G0 reads the new numbers.
- The cartographers' briefs name functions earlier packs define (`pieceVoid`, `eraseTouches`, `GuildHandState.circles`): if a pack renames one, fix the later briefs in the same merge.

## Continuation prompt (new session)

```
/implement Resume the build program from docs/plans/build-program-status.md.
```
