# Build program status (resume here)

Plans: [build-program.md](build-program.md) (boundaries); in pack form [platform-closure](platform-closure-plan.md), [foundry](foundry-plan.md), [ending](ending-plan.md), [cartographers](cartographers-plan.md), [calibration](calibration-plan.md) (last). Briefs: [build-program-briefs.md](build-program-briefs.md). Log: [build-program-log.md](build-program-log.md) (not read on resume; `git log --grep '<ID>'`).

**State:** design window 2026-11-12e done: briefs for waves 14–19 written (cartographers Packs A–I, BF-J, P, Q, L, H3), BF-FG approved. CI green on main (e0ebe16). **Next window: routine** (wave 14).
**Session rules (player):**
- Pace by the 5h limit; ignore the weekly limit unless > 97 %. The player resumes manually in a fresh session at each reset (CET = UTC+1); schedule a wake-up only when it opens a new session.
- A routine window starts a due design window itself as a subagent, without asking; player questions go to Open questions with a default held.
- Models: the skill's table (Fast for content, Default for most, Strong only by role or escalation).
- `pnpm check:fast` per merge batch; sims and full-loop checks only when a wave or plan closes; no balance tuning (everything goes to CAL); **player gates never block**. Only EN-G2 (handover text) waits for the player.
**Reset:** 2026-11-13 01:30 CET (00:30 UTC); no wake-up scheduled; resume manually. Weekly 57 %.

## Next
0. Read each push's CI result (sims run only there); a red run is a fix pack in the current wave (player, 2026-11-12). Log rows carry all six cells, usage Δ included (the ledger checks the format).
1. **Wave 14 (now, together):** CG-A (Strong) · BF-J (Default) · Q (Default, phone check). Then waves 15–19 per the briefs' order table (CG-C, CG-E, P → CG-B, L → CG-D, H3 → CG-F, CG-I → CG-G, CG-H).
2. **`src/data/lines.ts` is shared by named blocks** in these waves (briefs' order notes): a merge conflict there is row appends; keep both sides. Same for the cartographers' acceptance file.
3. **Next design window** (when the routine windows reach it, or three reviews pile up): approve the drafts from P (Afterglow pairs, canals.md), L (`steam:unit`/`brass:unit` pairs, seam.md) and CG-I (cartographers.md, CG-G3), then brief FU-5b, FN-M2b and CG-J; EN-G0 once the player has timed the dev page, then ending Packs E–L; EN-12 handover draft.
4. Hard edges: EN-S2 → EN-G0 → ending Pack E · CG-A → CG-B, CG-C, CG-E · BF-J → CG-B, P, L · P → L · CG-B, CG-C → CG-D · CG-B..E → CG-F → CG-G · CG-D → CG-H · BL-111 → EN-4.

## Running or partial
| Pack | Tasks | Model | Branch @ commit | State |
|---|---|---|---|---|
| none | | | | |

## Needs design review (left unmerged by a routine window)
- none. (F7, M and C3 recorded as accepted; BF-FG inputs decided in DESIGN §11 2026-11-12e; D5's numbers wait for EN-G0 below.)

## Owed (declared by a contract, not yet built)
- From C3b (guard done in ED): the `brink:cracked` replay line is overridden by the inner rune's own line (by design, tests assert damage events).
- **C3 hygiene** → Pack H3 (brief written).
- From B1 (FU-1) → Pack Q.
- BL-111 (H): offline check unmet (real Chrome: `pnpm build && pnpm preview`, SW installed, offline: home, a Seam trip, the Lab); App.svelte not autofixed.
- From F8: Pack K: FU-12 did not see the footnote line slots; DistrictNode.svelte not autofixed; FU-11 checked in the Lab only.
- Foundry (F4, F6): Toll note's slot `toll:bell` level II → Pack BF-J. EN-K6 wraps the frame.
- From EF (EN-5): rule `met` keys mostly unwired (only `bridges:collapse` declares `'span'`); the Registrar joins the masters at CG-10 (Pack CG-F).
- From CW0: kit registration and the two fixture ids → Pack CG-A; `heart` frame (salt 7160) and `bot` → Pack CG-F.
- From ED (EN-9): `mender:*` Meets, rows and stamps → Pack L.
- From I (FU-5): Af2, Af3 events and lines → Pack P; the Afterglow variants after review (FU-5b).
- FN-A1 M2: `steam:unit`/`brass:unit` lines → Pack L; variants after review (FN-M2b).
- DK request 1 (rune-action triggers on pieces) was never built: Pack CG-B adds the Erase/Draw `strikePiece` calls and the `eraseAt` hook (TECH §7 2026-11-12e).
- Ending (ending-plan §4): EN-G0 limits, EN-2 the walk, CAL-5 the numbers; EN-K1–K7 kits; EN-3/EN-8 `inkedPage`; EN-4 worker; EN-6/7/10/11 screens.
- Close-out for FD, DK, RV, FN, SM, IQ: CL-1…5 (Pack N). Plans' "Leaves for later" items: copied into every brief written.

## Close checklist (per plan; the program's own close is platform-closure Pack N, then CAL)
- [ ] full gate on main · [ ] full-loop phone check · [ ] code review · [ ] DESIGN §11 / TECH §7 · [ ] plan State + roadmap row · [ ] ledger clean · [ ] CI deployed

Ledger: `node .claude/skills/implement/ledger.mjs docs/plans/build-program-log.md docs/plans/{platform-closure,calibration,foundry,cartographers,ending,bridges,ink-quarter,seam-grows}-plan.md`
Ledger caveats (2026-11-13 run): IQ-13 shows open but is built. FU-16 and EN-10 show unmerged, which is right. BR-19 = C3 (BR-19a/b) + C3b (BR-19c, merged 0c5af97). FU-13–15 and CAL-4 appear in the log's prose only (FU-13–15 built in SM's track; CAL-4 belongs to CAL). SM-15 is a verification file (CL). (The ledger no longer counts `docs: …` record commits or commit bodies, and reads every ID in a log row's first cell.)

## Open questions for the player
- **EN-G0:** time `#/dev/generator` on the iPhone (20 samples; median and p95 per offered room). D5's inputs: fair within 4 attempts 94.4 % (P28 says 98 %), 28/500 dull; EN-S1 guardrails test setup changed; dev page `src/app/dev/generator.html`.
- Held at default: IQ-20 / IQ-G1, FN-1A A3, FN-4, DK-8, foundry Q2/Q3, FN-A1 M1, cartographers §7 Q1–Q3. Player gates open (non-blocking): IQ-G1, RV-G1, CN-P1, SM G1–G3, BH-G1, BR-G2, BF-G1, CG-G1/G2, HC/AH/RC playtests.

## Rough edges (risks)
- Old agent worktrees removed 2026-11-13 (~3.5 GB). 13 merged-or-superseded branches deleted. The SM-6 branch `worktree-agent-a7d9ce60e430bee68` is kept (tag `ref/sm-6`); review it at CAL-0 in calibration-plan.md.
- CI cancels a run when the next push arrives: push once per merge batch.
- A test mocking `$engine/districts/kit` must not import the real Seam module in its factory; tests import `$engine` before district files (the kit's lazy import cycle). CG-A registers the cartographers in the kit: watch the two fixture tests.
- D5 raised foe budgets, so generator ops and timings grew; EN-G0 reads the new numbers.
- The cartographers' briefs after CG-A name functions CG-A and CG-B define (`pieceVoid`, `eraseTouches`): if a pack renames one, fix the later briefs in the same merge.

## Continuation prompt (new session)

```
/implement Resume the build program from docs/plans/build-program-status.md.
```
