# Build program status (resume here)

Plans: [build-program.md](build-program.md) (boundaries); in pack form [platform-closure](platform-closure-plan.md), [foundry](foundry-plan.md), [ending](ending-plan.md), [cartographers](cartographers-plan.md), [calibration](calibration-plan.md) (last). Briefs: [build-program-briefs.md](build-program-briefs.md). Log: [build-program-log.md](build-program-log.md) (not read on resume; `git log --grep '<ID>'`).

**State:** wave 23 merged 2026-11-17 (DEV-1, MET-1, EN-W1, N1; fast gate green on main). **Wave 24 running: Pack E and Pack H** (routine window; usage 23 % of 5h at the spawn). Next: wave 25 (I, G, F2) when E (and H for G) merge; N2 and EN-G2 as below.
**Session rules (player):**
- Pace by the 5h limit; ignore the weekly limit unless > 97 %. The player resumes manually in a fresh session at each reset (CET = UTC+1); schedule a wake-up only when it opens a new session.
- A routine window starts a due design window itself as a subagent, without asking; player questions go to Open questions with a default held.
- Models: the skill's table (Fast for content, Default for most, Strong only by role or escalation).
- `pnpm check:fast` per merge batch; sims and full-loop checks only when a wave or plan closes; no balance tuning (everything goes to CAL); **player gates never block**. Only EN-G2 (handover text) waits for the player.
**Reset:** not recorded this window; no wake-up scheduled; resume manually.

## Next
0. Read the CI run on the last push first (sims run only there); a red run is a fix pack before anything else. Log rows carry all six cells, usage Δ included.
1. Spawn from the briefs file as written, in this order (critical path first; two or three at a time; a pack starts when its "Starts when" is merged):

| Wave | Pack | Tasks | Model / effort | Starts when |
|---|---|---|---|---|
| 24 | **E** (critical path) | EN-2 → EN-3 | Sonnet 5.5 high (→ Opus 5.5 high) | EN-W1 |
| 24 | H | EN-6 | Sonnet 5.5 medium | EN-W1 |
| 25 | **I** (critical path) | EN-K1 → EN-K2 → EN-K3 | Sonnet 5.5 medium | E |
| 25 | G | EN-4 → EN-7 | Sonnet 5.5 medium | E and H |
| 25 | F2 | EN-8 | Sonnet 5.5 medium | E |
| 26 | J | EN-K4 → EN-K5 | Sonnet 5.5 high | I |
| 26 | K | EN-K6 → EN-K7 | Sonnet 5.5 high | I |
| held | L | EN-10 → EN-11 | Sonnet 5.5 medium | E **and EN-G2** (the player's approval) |
| quiet | N2 | CL-4, CL-5, CL-6 checks (a design-window agent) | strongest, high | no pack running in `src/app` or `src/ui`; best after wave 26 |

2. Then a design window: EN-14 (the ending's Close) and the CAL briefs. Plan B for the generator only if the player's room check fails (Open questions).
3. Every pack's `check:fast` runs `typecheck:ts` (CI-4); `Meets` may grow.
4. Hard edges: EN-W1 → E → I → J, K · MET-1 → E (both edit `trip/finish.ts`) · E, H → G · EN-G2 → L · everything → EN-14 → CAL.

## Running or partial
| Pack | Tasks | Model | Branch @ commit | State |
|---|---|---|---|---|
| E | EN-2 → EN-3 | Sonnet 5.5 high | worktree agent (worktree-agent-af055a704dbeeb05e) | spawned 2026-11-17 19:50 |
| H | EN-6 | Sonnet 5.5 medium | worktree agent (worktree-agent-abb6db643637183ee) | spawned together |

## Needs design review (left unmerged by a routine window)
- none. (Decided 2026-11-17: D5's numbers accepted as built and EN-G0 is a go, ending-plan P29; the fair-within-4 rate of 94.4 % and the dull rate of 5.6 % are CAL-5 watch numbers.)

## Owed (declared by a contract, not yet built)
- BL-111 (H): offline check unmet (real Chrome: `pnpm build && pnpm preview`, SW installed, offline: home, a Seam trip, the Lab); App.svelte not autofixed. Copied into Pack G (the worker chunk must be precached).
- From F8: Pack K (platform-closure): FU-12 did not see the footnote line slots; DistrictNode.svelte not autofixed; FU-11 checked in the Lab only. For N2's UI review.
- Foundry: EN-K6 wraps the frame (Pack K). **The foundry's Close was never run** (found by the ledger pass, 2026-11-17): CL-6, records in N1, checks in N2.
- From EF (EN-5): MET-1 merged (bf2a19f). Still owed: the palette reads only `module.trip`, so `canals:landings` is never offered: Pack I. The `district` arg of `metIn` is untested against real lower-Seam floors (nothing builds them yet): whoever wires the floors must pass a `t.district` other than 'canals'.
- From the design window of 2026-11-17 (ending-plan P30–P36): `GEN_LIMITS`, the kit and frame registries, `InkedTripState`, `storeDrawing`, `startTrip`'s `page`, `DistrictModule.sandbox` (declared by EN-W1); `roomInput` / `storeRoom` / `inkRoom`, the `sandbox` guards and `inkedPage` (Pack E); the lent shapes `inkQuarter:terms`, `bathhouses:heat`, `bridges:span`, `foundry:peal`, `cartographers:doorway` (Packs I, J, K); `EN-K: every element a full household can offer has a kit` loses its `it.fails` in the last kit pack to merge; `Profile.drawings` written by Pack H; `RoomInker` / `requestRoom` (Pack G); `DRAWN_LOOT` and `offersFor` (Pack F2); `ending.handover`, `creditsSeen`, `src/data/ending.ts` (Pack L).
- Ending, later: CAL-5 the numbers (`GEN_TUNING`, `GEN_LIMITS`, `DRAWN_LOOT`, the pen); EN-14 the Close.
- Close-out: CL-1…3 and the foundry file are done (N1, 2026-11-17); screenshots saved outside the repo read "not checked" in the verification files. Still open: CL-4, CL-5, CL-6 checks (N2). Plans' "Leaves for later" items: copied into every brief written.

## Close checklist (per plan; the program's own close is platform-closure Pack N, then CAL)
Cartographers (2026-11-16, main 01761c5): [x] full gate on main (403 files, 9059 passed, sims in) · [x] full-loop phone check (plan §6, Close verification) · [x] code review (Pack W) · [x] DESIGN §11 / TECH §7 · [x] plan State + roadmap row · [x] ledger clean · [x] CI deployed (d13f93a green, 2026-11-17)
Foundry: [ ] full gate · [ ] full-trip phone check · [ ] code review · [ ] verification file · [x] plan State + roadmap row (2026-11-17) — all CL-6
Ending: opens at EN-14.

Ledger: `node .claude/skills/implement/ledger.mjs docs/plans/build-program-log.md docs/plans/{platform-closure,calibration,foundry,cartographers,ending,bridges,ink-quarter,seam-grows}-plan.md`
Ledger run 2026-11-17: platform-closure 32/42 (open CL-1…6), calibration 0/7, foundry 24/25 (gate only), cartographers 22/26 (gates only; CG-17/18 merged), ending 7/29 (open: EN-12, EN-W1 and everything from EN-2 on, all briefed or held), bridges 22/25, ink-quarter 29/33, seam-grows 15/16.
Ledger caveats: IQ-13 shows open but is built. BR-19 = C3 (BR-19a/b) + C3b (BR-19c, merged 0c5af97). FU-13–16 and CAL-4 appear in the log's prose only (FU-13–15 built in SM's track; FU-16 dropped with the dark theme; CAL-4 belongs to CAL). SM-15 is a verification file (N1). EN-12 shows open: its draft is a docs commit (ending-text.md) and it closes at EN-G2. EN-G0 is a gate, decided in the plan (P29). EN-W1, DEV-1, MET-1, CL-6 and Pack W's FX-1…5 are new IDs: EN-W1 and CL-6 are in their plans' tables, DEV-1 and MET-1 only in the briefs. (The ledger does not count `docs: …` record commits or commit bodies, and reads every ID in a log row's first cell.)

## Open questions for the player (defaults held)
- **EN-G2, the one question that holds a pack:** read [the handover text](../design/ending-text.md) (six short pages in the owner's hand, the credits lines) and answer its four questions (§5): the voice, the apology for the Marginalia, the last line, the length. Pack L waits for this. *Default held:* wait. Or say "build L on the draft" and the text is swapped when you approve it (ending-plan P37).
- **EN-G0 room check (non-blocking):** once DEV-1 is merged, run `pnpm dev`, open `http://<mac LAN ip>:5173/apprentices-notebook/src/app/dev/generator.html` on the phone and look through seeds 1–20 and 21–40 for broken or dull rooms. *Default held:* go. More than 2 of 20 reopens Plan B (rooms validated at home), decided before Pack G merges.
- **Cartographers' hall playtest (CG-G1, CG-G4; dev "open all", or a campaign run):** (1) Does the pencil read at a glance: can you tell from the board alone which tiles will be inked and which rubbed out next round, and does round 1 (fates only in the Next round overlay until your first move) feel unfair? (2) The Registrar's circles: does "erase the circle, step off, or kill the holder" feel like a fair puzzle or a sudden loss? (3) The rhythm: do the free rooms 1–3 and then *Through the doorway* feel like a real decision, or do you always go home first? (4) Does the academy feel like a different place from the other districts (the hands, the paper, the lore), or like the same fights on new tiles?
- Held at default: ending-plan §7 Q1–Q3 (the pen's sources, the bot test at fresh HP, stand-in masters drawable); IQ-20 / IQ-G1, FN-1A A3, FN-4, DK-8, foundry Q2/Q3, FN-A1 M1, cartographers §7 Q1–Q3. Player gates open (non-blocking): IQ-G1, RV-G1, CN-P1, SM G1–G3, BH-G1, BR-G2, BF-G1, CG-G1/G2, HC/AH/RC playtests.

## Rough edges (risks)
- **The ending's interim state:** until the last kit pack merges, the drawing table can offer an element that has no kit, and generating it throws `No kit for <id>`. Nothing reaches the player before Pack L (the handover), and the `EN-K: every element…` test closes the gap; do not ship L before J and K.
- **The headless bot does not win the foundry's heart** (CAL-4): the Carillonneur's drawn heart will fall back to its authored board until calibration. Pack K reports the rate and does not tune.
- The districts' own trip shapes cannot run on a generated trip (they read home tables), so the kits lend their own (P33): if a district pack later changes a shape's rule, its kit's copy must follow.
- Accepted as implementation detail (details in the log rows): CG-A's lazy first plan (a strand-guard flip could differ between preview and result in a rare first-round case); Pack Q's `simulate` still runs with empty footnotes.
- A basic Shove at an empty bridges span is still legal and does nothing (kept for saves that replay recorded Shoves). Review at CAL-0.
- The Registrar's note with `swap-unit-strand` is a sure erasure of a foe on pencil (two slots and a held page): a CAL watch item.
- The SM-6 branch `worktree-agent-a7d9ce60e430bee68` is kept (tag `ref/sm-6`); review it at CAL-0 in calibration-plan.md.
- CI cancels a run when the next push arrives: push once per merge batch.
- A test mocking `$engine/districts/kit` must not import the real Seam module in its factory; tests import `$engine` before district files (the kit's lazy import cycle). `src/engine/drawing/kits/**` imports district helpers: keep those imports out of `src/data`.
- Cartographers' Close review, not material (N2's starting list): `inventions.ts::stampGap` logs a mender miss on every call (duplicate `mender:unit`/`mender:diagonal` misses, counted by the cast cap); `bursts.ts::announce` stamps `coil:bell` on fire and stain bursts that touch no bell; core files name `'cartographers:pencil'` instead of a `districts/api` re-export and `schedule.ts::touchesBrassAt` duplicates `solvents.ts::touchesBrass`; `graphite-cap-pin`'s 2 rounds and the foundry bot's 6/10/15 weights are literals in engine code (move to `src/data` at CAL).
- Cartographers' phone check: round 1 shows no fate marks until the party's first action (a playtest question); the Crossroads keeps the generic "deeper than the lamplight reaches" line in the academy (copy for CAL or a district `crossroadsNote`).
- The briefs name functions earlier packs define (`storeDrawing`, `inkRoom`, `GEN_KITS`, `HEART_FRAMES`, `ShapeKit.shape`): if a pack renames one, fix the later briefs in the same merge.

## Continuation prompt (new session)

```
/implement Resume the build program from docs/plans/build-program-status.md.
```

**Session 2026-11-17 end:** hit 72 % of the 5h limit after the design window; per the player's rule (>65 % = start nothing, finish, close) no packs were spawned. 5h reset 2026-11-17 02:10 UTC (03:10 CET). Next window = routine: spawn wave 23 (DEV-1, EN-W1, MET-1, N1) from the briefs file. Player rule for that session may differ; ask nothing, follow this file.
