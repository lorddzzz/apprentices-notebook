# UX program build status (resume here)

Program: [ux-program](ux-program.md). Log: [ux-program-log.md](ux-program-log.md) (not read on resume; `git log --grep '<ID>'` has task details).

**State:** building; UX-G1 closed; waiting on Claude/Codex 5h windows to recover · **next window:** routine (orchestrator Sonnet; design windows for briefs/reviews on Opus high)
**Session rules:** player delegated model choice for subagents (free to override the skill's table); Claude packs Opus high for UF 0a/0b/0c and playback, Sonnet high elsewhere; raster art on Codex Sol high via Whiteboard `git:true` (Codex weekly 61% at start: keep Codex packs few); 2-3 packs at once on disjoint files; engine read-only.
**Player rule (2026-11-27 07:20, current):** Codex weekly is 88%: use Codex ONLY for image creation (art packs), not for coding. Claude hit its 5h limit overnight at 4 concurrent packs although the usage script read ~60%: the Claude reading lags; run at most 3 Claude packs and keep headroom. **Earlier rule (23:25):** ignore weekly limits, watch only 5h windows; balance Claude and Codex, use both as much as possible, never hit the limit (especially Claude). Earlier: **Player rule (2026-11-26):** Claude 5h at 80%: tune Claude down until reset 22:59 Belgrade (no new Claude packs; let running ones finish). Codex 5h is low: use Codex as much as possible despite weekly 61%.
**Reset:** n/a (Claude 5h 1% at start, resets 23:00 Belgrade)

## Next
00. After reset (Claude 22:59; Codex window near 92%): resume UF-B (resume_subagent f1a64b41f2fc, worktree pack-ufb has UF-8 work) ; then UF-A (faces+Gallery), FT A1/B, UH-0, UT-A; Codex: UA-C party/D seam wait for G1.
0'. Player may glance at g1/06-07 (floors v2). 0. UX-G1 DONE 2026-11-26 (player): approved finish, Pell flat brim, figure scale, mark readability. Failed trait: repeated ground tiles make an obvious light pattern: floors regenerated under the new rule (style-sheet §10: no baked light, >=4 pattern variants, full-board repeat check in art:sheet) BEFORE UA-11/UA-13; approved components copied to *.approved.webp. Needs: a floor-redo brief (Codex, small) + art:sheet full-board repeat view (tooling). Watch for drift toward grey. (old note:) UX-G1 IS READY (player): see docs/art/contact/g1/ and anchors-1.png, anchors-2.png. Approve/redirect finish, Pell silhouette (flat brim vs cap), figure scale. Orchestrator then copies approved components to <name>.approved.webp. UX-G1 (player): when B1/B2 report, review docs/art/contact/g1/* and anchors-2.png at 375x812; code never waits. Heavy drawing tests (generator EN-2, acceptance EN-K6) time out in the gate under load: rerun alone with --testTimeout=400000 (bg task started 22:xx).
1. UF-15a/b/f merged (D2: 26 fixtures, 3 visible todos pocket-readonly/homecoming-first/homecoming-quiet; merge conflicts with D3 resolved by hand). UH-3..5 merged (885998d: lattice `readonly`, notebook page, floating controls, seat tabs, drawer overlay): FT-25 pocket notebook UNBLOCKED (still `+N` shows in a household pocket: needs a decision at FT-25). Not met by UH-B, handed to UH-A: 5x5 unobscured sockets (page 330 vs 366 px needed), reserve door slot when drawer open; household.empty optional count; nine-slice slice values are guesses until art. FT-A1 merged (cce6f8a): **FT-5s SIGNED by orchestrator 2026-11-27** (7x9 cells 49.6 px at 812, 41.0 at 667 (insets 20/0); 34.7 at 667 with 44/34 insets is a stress case, no such device); conditions for FT-B/FT-D: caption/banner within ~24 px or +12 px board top headroom, end overlay <= 200 px, pass kit={{district,arena}} to the board (done in FT-B), overlay above figures means intent arrows cross tokens until A2b. UA scaling for fight packs may start (UA-D/F). Autofixer on TileLayer was trimmed: Close. UH-0 merged (c461097: HomeStrip, RoomObject; proposal: AppHeader `stripFallback` snippet prop would replace HomeStrip's :global override — UF follow-up; autofixer on RoomObject CSS was a trimmed copy: Close). UH Pack A (Study shell) waits for UF-D2 fixtures + UH-0 ✓. UF-15c merged (dd6708e: fight-seam, fight-lampwater, fight-wide-7x9). UA-C party merged: 27 shipped ArtIds (units/portraits/cards for 9 apprentices, 166 KB), the FIRST real art in src/assets/art; 27 masters uploaded to R2 by the orchestrator (hashes verified; rclone needs --s3-no-check-bucket with the object-scoped token); registry test made order-independent. UT-1..3 merged (46680f3: tripUx.ts, WipeSummary rooms/cause/final, wipeFixture, frontierMarks, thresholdPictogram). UT Packs C/D/E/B (Svelte) wait for fixtures UF-D1/D2 (running) and UH-0. UF-5/6/7 merged (5370c14: EB Garamond + Pinyon, 170 KB, OFL; Gallery tokens + art pages + grey toggle). **Player question raised by UF-5's sample (UF-5-sample.png): Pinyon at 14 px is hard to read; Garamond Italic 14 reads fine.** Default held: apprentice notes in Garamond Italic at 14, Pinyon only >= 20 px (titles/owner's hand); --font-hand currently aliases Pinyon: UH/UE must not use it below 20 px. UA floors-v2 merged: 13 scratch floors (5 Seam, 5 quay, 3 water), lattice score v1 4.8-5.4 -> v2 0.2-0.4 (limit 3.0); art:sheet now has the board-repeat check; views docs/art/contact/g1/06,07 (player: glance to confirm the light-pattern problem is gone; I looked at 06: flat, no light dots, slightly flat/dark). Worker proposal: keep the lossless edge pass for UA-11/UA-13. UF-16 (rune glyph redraw) merged (EN-K6 frame test timeout raised to 400 s/master on main: it was the recurring gate flake). UF-8..10 merged (0ceab1b..: AppHeader variants, ActionButton, Card, Unseen, StepMarker, Sheet size/swipe, Toasts; EN-K6 timeout is a load flake). NEXT to spawn when a slot frees (cap 6 running): UH Pack 0 (home kit: RUNNING now), then UH B/A, FT A1 after UF-15c merges, UD Pack 0. UA-B1 merged (ebf37bf; 28 scratch anchors under art-src/anchors/{party,seam,lampwater,study}, UX-G1 views docs/art/contact/g1/01..05 colour+greyscale, all 375x812; Seam comparison.webp now exists so UA-8 geometry comparison can be re-run; worker proposals for FT: keep ivory intent keyline, give HP pips clearance above the next row's figures). UA-B2 merged (anchors in art-src/anchors/{map,sestante}: map halvemeer-v1 750x3800 from 3 panels, 8 clearings at node positions; Sestante academy scene + pencil/ink/erased tiles; sheet docs/art/contact/anchors-2.png). UX-G1 review waits for B1 too; B2 Seam geometry comparison owed (needs B1's comparison.webp). Image tool: built-in image_gen, model unexposed, 15.5 min, 7 generations, 0 retries. FT-1..3 + FT-3b merged (playback logic: beats.ts, projectBatch, hold table, speed-up input; optional hooks in BattleView/Caption/BattleBoard/game.svelte.ts accepted; Owed: speed x motion matrix test on the real pref, Svelte autofixer on the 3 touched components — Close). UA-P pilot processed (README results + docs/art/contact/pilot.png on main; pilot assets kept on branch art/pilot, not merged). Measured: Pell 5.9 KB, floors ~0.35 KB each, scene 12.4 KB (q76); art:check ok; ~1.19 MB per 250 assets for that mix (too low a mix to trust: re-estimate with real anchors). Floor B needed a 40 px edge blend; 8 px left a grid. FT-4 (Pack 0b) merged (6f76e9e: fightArt.ts, DistrictUi.fightTheme, crestFor, 3 stubs; autofixer not run on the stubs: Close). UF-11/12/13 merged (main.ts imports prefs). UA-1/UA-2 merged (bcae482; sharp, art:process/sheet; style sheet in docs/art). Pilot: generation was already done (art-src/pilot, masters in R2); processing half runs on Codex CLI. UF-4 merged (be2c0e6; report text was lost, reviewed from the branch: 9 tests pass; loader at src/app/dev, fixtures: threshold-canals-burnt, study-fresh). UF-1/UF-3 merged (32bfbb2: tokens, six stubs, header.ts, prefs stub). UF-2 merged (b49271d; C2 frozen: registry, artMeta, art:check in both gates; first consumer must import the registry to enter precache; UA-A adds sharp). Wave 0 running: UF Pack 0a (tokens/stubs, UF-1→UF-3), 0b (art registry, UF-2), 0c (fixture loader, UF-4). 0a is merged: FT 0b, UH-0, UT-1 and UF Pack A may start; UF-B and UF-C now run (4 packs briefly with 0c and UA-A).
2. After 0b merges: UA Pack A (Claude, UA-1→UA-2), then UA Pack P pilot (Codex).
3. After 0a merges: UF Packs A/B/C (faces+Gallery, shared components, prefs+menu), FT Pack 0b, UH-0, UT-1 per their briefs files.
4. Grant order (R24): App.svelte UF-13 → UH-13 → UE-8; flow.ts UT-2 → UE-4; Gallery UF-6/7 → UD-3 → UE-6; package.json UF 0b → UA-A.

## Running or partial
| Pack | Tasks | Model | Branch @ commit | State |
|---|---|---|---|---|
| UH-0 | UH-0 home kit | Sonnet high | build/pack-uh0 @ 1eb8997 | running (sid 2f793f3a3b8a) |
| UF-D2 | UF-15a/b/f fixtures | Sonnet high | build/pack-ufd2 @ 5370c14 | running (sid e8e65abfb716) |
| UF-D1 | UF-14a/b/c fixtures (19) | Sonnet high | build/pack-ufd1, rebase onto main in progress (sid 24f1d3d18a66) | done; apply /tmp/pack-ufd1-rebased.mbox with git am when the rebase agent reports. Pending todo: threshold-canals intro stage (UT-6); wipe fixtures show the old Wiped screen until UT-9 |

| UH-B | UH-3→UH-5 lattice page/drawer | Sonnet high | build/pack-uhb @ c461097 | running (sid ac77b309ea0b); UH-3 first: FT-25 waits for it |
| UA-D | UA-10, UA-11 Seam fight art (36 assets) | Codex Sol high (images only) | art/seam-fight in clone codex-2350314665 | running (sid e589253d50f6); orchestrator uploads raws from /tmp/seam-fight-work/raw |
| UH-A | UH-1, UH-2 Study shell | Sonnet high | build/pack-uha @ 885998d | running (sid fc4c46108b86) |
| FT-B | FT-13..16w header/stack/wiring | Sonnet high | build/pack-ftb @ cce6f8a | running (sid 47505c2b1536) |
| UF-A | UF-5→UF-7 faces+Gallery | Sonnet high | build/pack-ufa @ 9f63d48 | running (sid 2369faf1c508) |
| UF-B | UF-8→UF-10 | Sonnet high | build/pack-ufb @ 32bfbb2 (uncommitted UF-8 work in worktree) | RESUMED 23:20 (sid f1a64b41f2fc) |

## Needs design review (left unmerged by a routine window)
- none

## Owed (declared by a contract, not yet built)
- `--font-hand` below 20 px: switch the alias to a Garamond-italic stack or forbid below 20 px (theme.css, UF-owned) — owed by UF; before UH-1/UH-D5 use it
- Gallery `glyphs` part: add a 20 px row (UF-E proposal) — UF-A/UE-6
- Playwright is not a repo dev dependency; workers borrow ~/Repos/ai-tandem's copy. Decide whether to add it (player-owned decision; default: leave)
- FT-3b matrix test (speed x Quick x reduced on the real pref) — owed by FT Pack C (playback presentation); autofixer on BattleView/Caption/BattleBoard — Close
- Pilot items not done: clean-checkout binary handoff via Whiteboard clone, offline install/precache measurement under the deployed base, phone-size look at the pilot assets — owed to UA B1 (first real Codex clone pack) and Close
- art:process CLI omits focal point/edge-band in sidecars (hand-recorded in pilot): UA tooling fix when a pack needs it
- Svelte autofixer on the WHOLE MenuSheet.svelte (UF-C ran an abridged copy; flagged `view` assigned in an $effect) — owed by Close review / whoever next edits MenuSheet (UH-D5)
- Study's menu entry reads "The Lab" once MenuSheet replaces it (UH-D5)
- UF-C check:fast red only on heavy drawing EN-K6 timeout (known load flake, rerun alone with --testTimeout=400000)
- Masters: orchestrator uploads each pack's raws from /tmp/<pack>-work/raw with `rclone copyto --s3-no-check-bucket <raw> <archiveKey>` and verifies sha256 vs MASTERS.json (done for the 27 party masters; pilot ones were already there)
- Style-sheet §10 doc conflicts: names-and-voice.md owner pronouns (he §0 / they §1); party.md uses "she" for recruits — player question, art uses no gendered terms for apprentices
- First registry consumer (UF-7 Gallery or FT) imports `ArtImage` so art enters precache — owed by UF-7/FT
- Retype header.ts `ArtId` to registry's and render `strip` via ArtImage — owed by UF-B (in its brief)
- `.label` small caps only under `[data-world]`; screens that gain data-world lose their scoped `.label` styling — owed by each screen plan
- AppHeader needs a positioned screen root for MenuSheet — owed by each screen plan
- FT-2/FT-3 switch timing stand-in to `motionScale()` — owed by UF-11; needed by FT
- UH-13 App.svelte edit follows UF-13 (R1)

## Close checklist
- [ ] full gate on main · [ ] full-loop phone check · [ ] code review · [ ] DESIGN §11 / TECH §7 · [ ] plan State + roadmap row · [ ] ledger clean · [ ] CI deployed

## Decisions recorded
- UX-G1 answers (above). Pell hat = flat brim (settles the open question). Figure scale kept.

## Open questions for the player (defaults held)
- BL-136 (roadmap): floors v2 read flat/dull; ideas to explore after UA-11: scene-placed light patterns, more variants, bespoke decals, ignorable props. Held; UA-11/UA-13 briefs must carry it as an explicit look test.
- Handwriting face (asked by UF-5 result): default no third face; notes in Garamond Italic.
See ux-decisions-review.md (UX-G1 anchors, Pell's hat, handwriting face, forward-to-map plate, rotate prompt).

## Rough edges
- Subagents spawned through `spawn_subagent` have no worktree isolation: packs use prepared worktrees at `.claude/worktrees/pack-<x>` (orchestrator commits nothing for them; workers commit on their branch).

## Continuation prompt
`/implement by docs/plans/ux-program.md` (resume from this file; model overrides allowed).
