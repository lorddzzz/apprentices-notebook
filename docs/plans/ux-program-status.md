# UX program build status (resume here)

Program: [ux-program](ux-program.md). Log: [ux-program-log.md](ux-program-log.md) (not read on resume; `git log --grep '<ID>'` has task details).

**State:** building (wave 0) · **next window:** routine (orchestrator Sonnet; design windows for briefs/reviews on Opus high)
**Session rules:** player delegated model choice for subagents (free to override the skill's table); Claude packs Opus high for UF 0a/0b/0c and playback, Sonnet high elsewhere; raster art on Codex Sol high via Whiteboard `git:true` (Codex weekly 61% at start: keep Codex packs few); 2-3 packs at once on disjoint files; engine read-only.
**Player rule (2026-11-26):** Claude 5h at 80%: tune Claude down until reset 22:59 Belgrade (no new Claude packs; let running ones finish). Codex 5h is low: use Codex as much as possible despite weekly 61%.
**Reset:** n/a (Claude 5h 1% at start, resets 23:00 Belgrade)

## Next
0. UX-G1 (player): when B1/B2 report, review docs/art/contact/g1/* and anchors-2.png at 375x812; code never waits. Heavy drawing tests (generator EN-2, acceptance EN-K6) time out in the gate under load: rerun alone with --testTimeout=400000 (bg task started 22:xx).
1. FT-1..3 + FT-3b merged (playback logic: beats.ts, projectBatch, hold table, speed-up input; optional hooks in BattleView/Caption/BattleBoard/game.svelte.ts accepted; Owed: speed x motion matrix test on the real pref, Svelte autofixer on the 3 touched components — Close). UA-P pilot processed (README results + docs/art/contact/pilot.png on main; pilot assets kept on branch art/pilot, not merged). Measured: Pell 5.9 KB, floors ~0.35 KB each, scene 12.4 KB (q76); art:check ok; ~1.19 MB per 250 assets for that mix (too low a mix to trust: re-estimate with real anchors). Floor B needed a 40 px edge blend; 8 px left a grid. FT-4 (Pack 0b) merged (6f76e9e: fightArt.ts, DistrictUi.fightTheme, crestFor, 3 stubs; autofixer not run on the stubs: Close). UF-11/12/13 merged (main.ts imports prefs). UA-1/UA-2 merged (bcae482; sharp, art:process/sheet; style sheet in docs/art). Pilot: generation was already done (art-src/pilot, masters in R2); processing half runs on Codex CLI. UF-4 merged (be2c0e6; report text was lost, reviewed from the branch: 9 tests pass; loader at src/app/dev, fixtures: threshold-canals-burnt, study-fresh). UF-1/UF-3 merged (32bfbb2: tokens, six stubs, header.ts, prefs stub). UF-2 merged (b49271d; C2 frozen: registry, artMeta, art:check in both gates; first consumer must import the registry to enter precache; UA-A adds sharp). Wave 0 running: UF Pack 0a (tokens/stubs, UF-1→UF-3), 0b (art registry, UF-2), 0c (fixture loader, UF-4). 0a is merged: FT 0b, UH-0, UT-1 and UF Pack A may start; UF-B and UF-C now run (4 packs briefly with 0c and UA-A).
2. After 0b merges: UA Pack A (Claude, UA-1→UA-2), then UA Pack P pilot (Codex).
3. After 0a merges: UF Packs A/B/C (faces+Gallery, shared components, prefs+menu), FT Pack 0b, UH-0, UT-1 per their briefs files.
4. Grant order (R24): App.svelte UF-13 → UH-13 → UE-8; flow.ts UT-2 → UE-4; Gallery UF-6/7 → UD-3 → UE-6; package.json UF 0b → UA-A.

## Running or partial
| Pack | Tasks | Model | Branch @ commit | State |
|---|---|---|---|---|
| UF-B | UF-8→UF-10 | Sonnet high | build/pack-ufb @ 32bfbb2 (uncommitted UF-8 work in worktree) | STOPPED for Claude usage (80%); resume_subagent f1a64b41f2fc when Claude < 60% |
| UA-B1 | UA-3→UA-6 anchors | Codex Sol high | art/anchors-1 in clone codex-1557953521 | running (sid 422805d4dce0) |
| UA-B2 | UA-7, UA-8 anchors | Codex Sol high | art/anchors-2 in clone codex-884991958 | running (sid 24e930e81455) |

## Needs design review (left unmerged by a routine window)
- none

## Owed (declared by a contract, not yet built)
- FT-3b matrix test (speed x Quick x reduced on the real pref) — owed by FT Pack C (playback presentation); autofixer on BattleView/Caption/BattleBoard — Close
- Pilot items not done: clean-checkout binary handoff via Whiteboard clone, offline install/precache measurement under the deployed base, phone-size look at the pilot assets — owed to UA B1 (first real Codex clone pack) and Close
- art:process CLI omits focal point/edge-band in sidecars (hand-recorded in pilot): UA tooling fix when a pack needs it
- Svelte autofixer on the WHOLE MenuSheet.svelte (UF-C ran an abridged copy; flagged `view` assigned in an $effect) — owed by Close review / whoever next edits MenuSheet (UH-D5)
- Study's menu entry reads "The Lab" once MenuSheet replaces it (UH-D5)
- UF-C check:fast red only on heavy drawing EN-K6 timeout (known load flake, rerun alone with --testTimeout=400000)
- Upload each accepted master with the printed `rclone copyto` command (art:process records it in MASTERS.json) — owed by whoever runs art:process; orchestrator verifies before accepting a pack
- Style-sheet §10 doc conflicts: names-and-voice.md owner pronouns (he §0 / they §1); party.md uses "she" for recruits — player question, art uses no gendered terms for apprentices
- First registry consumer (UF-7 Gallery or FT) imports `ArtImage` so art enters precache — owed by UF-7/FT
- Retype header.ts `ArtId` to registry's and render `strip` via ArtImage — owed by UF-B (in its brief)
- `.label` small caps only under `[data-world]`; screens that gain data-world lose their scoped `.label` styling — owed by each screen plan
- AppHeader needs a positioned screen root for MenuSheet — owed by each screen plan
- FT-2/FT-3 switch timing stand-in to `motionScale()` — owed by UF-11; needed by FT
- UH-13 App.svelte edit follows UF-13 (R1)

## Close checklist
- [ ] full gate on main · [ ] full-loop phone check · [ ] code review · [ ] DESIGN §11 / TECH §7 · [ ] plan State + roadmap row · [ ] ledger clean · [ ] CI deployed

## Open questions for the player (defaults held)
See ux-decisions-review.md (UX-G1 anchors, Pell's hat, handwriting face, forward-to-map plate, rotate prompt).

## Rough edges
- Subagents spawned through `spawn_subagent` have no worktree isolation: packs use prepared worktrees at `.claude/worktrees/pack-<x>` (orchestrator commits nothing for them; workers commit on their branch).

## Continuation prompt
`/implement by docs/plans/ux-program.md` (resume from this file; model overrides allowed).
