# Build program status (resume here)

Plans: [build-program.md](build-program.md) (boundaries); in pack form [platform-closure](platform-closure-plan.md), [foundry](foundry-plan.md), [ending](ending-plan.md), [cartographers](cartographers-plan.md), [calibration](calibration-plan.md) (last). Briefs: [build-program-briefs.md](build-program-briefs.md). Log: [build-program-log.md](build-program-log.md) (not read on resume; `git log --grep '<ID>'`).

**State:** design window 2026-11-16 ran the cartographers' Close on main 01761c5: full gate green, phone check done, one review, records written, decisions taken (the hall joins `PLAYABLE_DISTRICTS`; *the bad join* filed by room 4). Briefs: Packs W and CG-K (wave 22). **Next window: routine** (wave 22), then the design window for Pack N.
**Session rules (player):**
- Pace by the 5h limit; ignore the weekly limit unless > 97 %. The player resumes manually in a fresh session at each reset (CET = UTC+1); schedule a wake-up only when it opens a new session.
- A routine window starts a due design window itself as a subagent, without asking; player questions go to Open questions with a default held.
- Models: the skill's table (Fast for content, Default for most, Strong only by role or escalation).
- `pnpm check:fast` per merge batch; sims and full-loop checks only when a wave or plan closes; no balance tuning (everything goes to CAL); **player gates never block**. Only EN-G2 (handover text) waits for the player.
**Reset:** 2026-11-13 01:30 CET (00:30 UTC); no wake-up scheduled; resume manually. Weekly 57 %.

## Next
0. Read each push's CI result (sims run only there); a red run is a fix pack in the current wave (player, 2026-11-12). Log rows carry all six cells, usage Δ included (the ledger checks the format).
1. **Routine window, wave 22:** Pack **W** (review fixes FX-1 → FX-5: `strikePiece` honours `struckBy`, Erase's neighbour marks, the collapse replay's wear, Rivet's anvil, rival trick copy and the doorway caption) and Pack **CG-K** (CG-17 the hall joins `PLAYABLE_DISTRICTS` with its SAVE-1 pair, CG-18 *the bad join* in room 4), together; briefs in build-program-briefs.md. Push once for the batch and confirm CI deployed it (the cartographers' last Close box).
2. Then: Pack N close-outs (CL-1…5, a design window); EN-G0 waits on the player's phone timings, then ending Packs E–L; EN-12 handover draft.
3. Every pack's `check:fast` now runs `typecheck:ts` (CI-4); `Meets` may grow.
4. Hard edges: EN-S2 → EN-G0 → ending Pack E · BL-111 → EN-4.

## Running or partial
| Pack | Tasks | Model | Branch @ commit | State |
|---|---|---|---|---|
| none | | | | |

## Needs design review (left unmerged by a routine window)
- none. (Decided 2026-11-16: the golden decision → replay re-store, Pack U; `LineId` → Pack T; Pencil Shove and Graphite on blank → Pack S; CG-I's proposals and the three drafts → DESIGN §11. F7, M and C3 recorded as accepted earlier; D5's numbers wait for EN-G0.)

## Owed (declared by a contract, not yet built)
- BL-111 (H): offline check unmet (real Chrome: `pnpm build && pnpm preview`, SW installed, offline: home, a Seam trip, the Lab); App.svelte not autofixed.
- From F8: Pack K: FU-12 did not see the footnote line slots; DistrictNode.svelte not autofixed; FU-11 checked in the Lab only.
- Foundry: EN-K6 wraps the frame.
- From EF (EN-5): rule `met` keys mostly unwired (only `bridges:collapse` declares `'span'`); the Registrar joins the masters at CG-10 (check in CG-F's merge record).
- From the cartographers' Close: Pack W (review fixes) and Pack CG-K (`PLAYABLE_DISTRICTS`, *the bad join* in room 4, SAVE-1 pair); `metIn` records pencil only if some survives the fight (kept).
- Ending (ending-plan §4): EN-G0 limits, EN-2 the walk, CAL-5 the numbers; EN-K1–K7 kits; EN-3/EN-8 `inkedPage`; EN-4 worker; EN-6/7/10/11 screens.
- Close-out for FD, DK, RV, FN, SM, IQ: CL-1…5 (Pack N). Plans' "Leaves for later" items: copied into every brief written.

## Close checklist (per plan; the program's own close is platform-closure Pack N, then CAL)
Cartographers (2026-11-16, main 01761c5): [x] full gate on main (403 files, 9059 passed, sims in) · [x] full-loop phone check (plan §6, Close verification) · [x] code review (Pack W) · [x] DESIGN §11 / TECH §7 · [x] plan State + roadmap row · [x] ledger clean (CG: 20/24 merged, the rest gates; CG-17/18 briefed) · [ ] CI deployed (after wave 22's push)

Ledger: `node .claude/skills/implement/ledger.mjs docs/plans/build-program-log.md docs/plans/{platform-closure,calibration,foundry,cartographers,ending,bridges,ink-quarter,seam-grows}-plan.md`
Ledger caveats (2026-11-16 run): IQ-13 shows open but is built. EN-10 shows open, which is right. BR-19 = C3 (BR-19a/b) + C3b (BR-19c, merged 0c5af97). FU-13–16 and CAL-4 appear in the log's prose only (FU-13–15 built in SM's track; FU-16 dropped with the dark theme; CAL-4 belongs to CAL). CG-F3 appears in the log's prose only (CG-J builds it). SM-15 is a verification file (CL). The 2026-11-16 briefs' new IDs (and Pack W's FX-1…5) are in no plan table; CG-17 and CG-18 show open until Pack CG-K merges. (The ledger does not count `docs: …` record commits or commit bodies, and reads every ID in a log row's first cell.)

## Open questions for the player
- **EN-G0:** time `#/dev/generator` on the iPhone (20 samples; median and p95 per offered room). D5's inputs: fair within 4 attempts 94.4 % (P28 says 98 %), 28/500 dull; EN-S1 guardrails test setup changed; dev page `src/app/dev/generator.html`.
- **Cartographers' hall playtest (CG-G1, CG-G4; dev "open all", or a campaign run):** (1) Does the pencil read at a glance: can you tell from the board alone which tiles will be inked and which rubbed out next round, and does round 1 (fates only in the Next round overlay until your first move) feel unfair? (2) The Registrar's circles: does "erase the circle, step off, or kill the holder" feel like a fair puzzle or a sudden loss? (3) The rhythm: do the free rooms 1–3 and then *Through the doorway* feel like a real decision, or do you always go home first? (4) Does the academy feel like a different place from the other districts (the hands, the paper, the lore), or like the same fights on new tiles?
- Held at default: IQ-20 / IQ-G1, FN-1A A3, FN-4, DK-8, foundry Q2/Q3, FN-A1 M1, cartographers §7 Q1–Q3. Player gates open (non-blocking): IQ-G1, RV-G1, CN-P1, SM G1–G3, BH-G1, BR-G2, BF-G1, CG-G1/G2, HC/AH/RC playtests.

## Rough edges (risks)
- Accepted as implementation detail (details in the log rows): CG-A's lazy first plan (a strand-guard flip could differ between preview and result in a rare first-round case); Pack Q's `simulate` still runs with empty footnotes.
- A basic Shove at an empty bridges span is still legal and does nothing (kept for saves that replay recorded Shoves; Pack S scopes the fix to the paper pieces). Review at CAL-0.
- The Registrar's note with `swap-unit-strand` is a sure erasure of a foe on pencil (two slots and a held page): a CAL watch item.
- The SM-6 branch `worktree-agent-a7d9ce60e430bee68` is kept (tag `ref/sm-6`); review it at CAL-0 in calibration-plan.md.
- CI cancels a run when the next push arrives: push once per merge batch.
- A test mocking `$engine/districts/kit` must not import the real Seam module in its factory; tests import `$engine` before district files (the kit's lazy import cycle).
- D5 raised foe budgets, so generator ops and timings grew; EN-G0 reads the new numbers.
- Cartographers' Close review, not material (CL or CAL): `inventions.ts::stampGap` logs a mender miss on every call, so `networkTouching` and `tollBells` can log duplicate `mender:unit`/`mender:diagonal` misses (counted by the cast cap); `bursts.ts::announce` stamps `coil:bell` on fire and stain bursts that touch no bell (may reveal the line early); core files name `'cartographers:pencil'` instead of a `districts/api` re-export and `schedule.ts::touchesBrassAt` duplicates `solvents.ts::touchesBrass`; `graphite-cap-pin`'s 2 rounds and the foundry bot's 6/10/15 weights are literals in engine code (move to `src/data` at CAL).
- Cartographers' phone check: round 1 shows no fate marks until the party's first action (the lazy first plan; overlay only), a playtest question; the Crossroads keeps the generic "deeper than the lamplight reaches" line in the academy (copy for CAL or a district `crossroadsNote`).
- The cartographers' briefs name functions earlier packs define (`pieceVoid`, `eraseTouches`, `GuildHandState.circles`): if a pack renames one, fix the later briefs in the same merge.

## Continuation prompt (new session)

```
/implement Resume the build program from docs/plans/build-program-status.md.
```
