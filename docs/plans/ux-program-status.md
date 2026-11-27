# UX program build status (resume here)

Program: [ux-program](ux-program.md). Log: [ux-program-log.md](ux-program-log.md) (not read on resume; `git log --grep '<ID>'` has task details).

**State:** holding (session 2026-11-27/28 closed at Claude 5h 90%; all started packs merged; fast gate green on main) · **next window:** routine (Sonnet medium orchestrator is enough; a design window only for the Close and for new briefs)
**Session rules:** player delegated model choice for subagents (free to override the skill's table); Claude packs Opus high for UF 0a/0b/0c and playback, Sonnet high elsewhere; raster art on Codex Sol high via Whiteboard `git:true` (Codex weekly 61% at start: keep Codex packs few); 2-3 packs at once on disjoint files; engine read-only.
**Player rule (2026-11-27 07:20, current):** Codex weekly is 88%: use Codex ONLY for image creation (art packs), not for coding. Claude hit its 5h limit overnight at 4 concurrent packs although the usage script read ~60%: the Claude reading lags; run at most 3 Claude packs and keep headroom. **Earlier rule (23:25):** ignore weekly limits, watch only 5h windows; balance Claude and Codex, use both as much as possible, never hit the limit (especially Claude). Earlier: **Player rule (2026-11-26):** Claude 5h at 80%: tune Claude down until reset 22:59 Belgrade (no new Claude packs; let running ones finish). Codex 5h is low: use Codex as much as possible despite weekly 61%.
**Reset:** Claude 5h resets 2026-11-28 03:49 Belgrade; Codex 5h 02:56 UTC; Codex weekly (96%) resets 2026-11-28 12:33 UTC (~13:33 Belgrade): after that Codex image packs may start again.

## Next (start here)
Everything started is merged. Nothing is running. Session rules of 2026-11-27 eve (player): max 2 Claude + 1 Codex subagents; Codex ONLY for art packs, Terra 6.1 medium, no new Codex task at weekly >= 96%; Claude subagents Sonnet 5.5 medium or Haiku 5.5 high, no new Claude task when 5h > 75%; "report in under 200 words" in every spawn; fixtures one file per subset (src/app/dev/fixtures/<subset>.ts + one registration line); decide with the suggested default and note it. Claude's 5h burned ~90% in ~2 h with 2 packs + orchestrator: expect ~4-5 packs per window.

**Done this session:** fix pack (single safe-area inset, 44 px, stripFallback, fixtures), UT-6, UT-9, UT-4/5, UH-6/7, UH-8/9, UH-10/11, FT-9/10, FT-11/12 (12g not passed), FT-17..20 + FT-3b; art FX (9/12), Home (14/15).

**Claude packs ready (briefs in `docs/plans/ux-*-briefs.md`):**
1. **Pack F2 (art, Sonnet medium):** process the 23 Lampwater raws in `~/art-raw-staging/canals-raw` (brief in ux-art-briefs.md "Pack F2").
2. **FT Pack C follow-ups (small):** pass `speed={session.playback.speed}` to FxLayer/StepMarkerLayer/BeatCard; hide caption while Readout shows; Lab passes `named: profile.named`; give `aimed` an anchor; fixture notes claim gold on fight-first-beat (wrong); then FT-12g rerun items (zero-art jar off figure centre; steam joined cells is UD-6).
3. **FT Pack D** (boss/rival/trick/end overlay), **FT Pack E** (pocket notebook FT-24/25/27), then **UT Pack F** (UT-10 integration, needs FT-24 pocket).
4. **UH Pack F** (homecoming + transitions; UH-13 App.svelte grant after UF-13, done); UH Packs UH-12.. check plan.
5. **UD** Pack 0 (needs UF-15d district fight fixtures: a UF fixture pack first, `fight-<id>` for all nine), then district packs; **UE** late. **UF remaining:** D4 (UF-15g/15e), UF-15d, `homecoming-*`/`pocket-readonly` fixtures.
6. **Wave-end phone check (orchestrator, 375x812, 430, 480):** this wave's screens: Codex, Desk, Bench (foe swatches), household sheet drag lock toast + touch long-press, Map ink-in/revisit, Threshold, Wiped, FT fight chain. Several reports were thin or checked only some states.

**Codex image packs ready** (after Codex weekly resets ~13:33 Belgrade; briefs `ux-art-briefs.md`): FX remainder (fx-oil-catch, flourish-compound, flourish-name-flare: new prompts, raws were opaque clouds), Home door-plate (needs a calm amber plate, no shelf scene), lamp-pool (Lampwater), then G2/H/I home strips + transitions (UA-15/16), J map (UA-17; anchor art-src/anchors/map/halvemeer-v1), K trip scenes, L-Q the other districts, R ending. Codex's sandbox has no registry access: workers must leave raws in /tmp/<pack>-raw (+ prompts + MANIFEST with contact/height for figures) and the orchestrator or a Claude pack runs `art:process`; copy raws to ~/art-raw-staging before the next session. Always the floor rule (style-sheet section 10), the full-board repeat check, and BL-136 look test. Tell the worker the real anchor file names (`ls art-src/anchors/<x>`; Study anchors are header-v1/room-v1, not *.approved.webp).

## UX-G1 status
Closed 2026-11-27 (player): finish, Pell brim, scale, marks approved; floors redone (v2) and shipped for the Seam. Player noted floors read flat/dull: BL-136 in the roadmap (ideas parked).

## Running or partial
NOTHING RUNNING at session close (every 'Running:' below has merged). Caveats recorded below are still open.
Session rules (2026-11-27 eve, player): max 2 Claude + 1 Codex subagents; Codex only for art, Terra 6.1 medium, none after weekly 96% (was 92%); Claude Sonnet 5.5 medium or Haiku 5.5 high, none new when 5h > 75%; every spawn says 'report in under 200 words'; split fixtures one file per subset; decide with the suggested default and note it.
Merged this session: small fix pack (single safe-area inset, 44 px, stripFallback, fixtures fight-lampwater-trio/fight-multispell; `--font-hand` alias NOT changed: pinned by fonts/tokens tests), UT-6 Threshold. UT-9 Wiped merged (proposal: register `scenes/shared/wiped` in art spec; autofixer run on SeeItSheet clean). UA-12 FX merged 9 of 12 (orchestrator processed the raws from the worker's /tmp/fx-raw because a finished Codex worker cannot be resumed and its clone is off-limits; masters uploaded+verified). STILL OWED: fx-oil-catch, flourish-compound, flourish-name-flare (worker rejected twice; raws in /tmp/fx-raw are not good). Lesson: Codex briefs now grant MASTERS.json and require commit of partial work + raws in /tmp/<pack>-raw. UH-6/7 merged (autofixer not run on ApprenticeFull/GlyphSheet/etc; drag lock toast and touch long-press unconfirmed; `ApprenticeFull` has 12 px text; proposal: fixture opening GlyphSheet directly). Art G attempt 1 failed (anchors named header-v1/room-v1 not *.approved; no registry): respawned. UT-4/5 merged (not done: scroll restore; ink-in/revisit/under-Seam alignment unchecked in browser; autofixer on Map only; title truncates at 375: shorter MAP_HEADING; `map-back` sits in crest slot). UA-14 Home merged 14 of 15 (door-plate OWED: raw shows whole shelf scene; seat-tab/rune-card slices 24 px chosen by orchestrator; tiles made seamless by orchestrator from a centre crop; Codex clone sandbox cannot reach the registry: workers leave raws in /tmp/<pack>-raw and the orchestrator runs art:process). Fast gate on main green (EN-2 timeout rerun alone OK). FT-9/10 (A2a) and UH-8/9 merged (A2a: no true 375 screenshot, no tap-adjacency browser check, row-reorder may restart move anim; UH Pack D report thin: screens not confirmed, check at wave end). FT-11/12 (A2b) merged: FT-12g NOT passed (Thermae steam separate puffs, no joined-edge rule: UD-6 owns; zero-art jar covers foe glyph centre: move jar off centre); autofixer not run on token-only layer edits or BattleBoard; 36 screenshots in /tmp/fta2b-shots (may be gone). UA-13 Lampwater: Codex finished 23 of 24 raws, unprocessed (no registry in its sandbox): raws copied to ~/art-raw-staging/canals-raw (+ r2 _staging/canals-raw); brief `Pack F2` in ux-art-briefs.md for a Claude Sonnet medium processing pack (lamp-pool owed: both drafts rejected). UH-10/11 Bench merged (foe swatches and bench-strip art not looked at; 6x5 board fixed 362x304 px: recheck if BattleBoard sizing changes; autofixer clean on SubjectSwatches). Running: `build/pack-ftc` (FT-17..20),  `build/pack-uhe` (UH-10/11), Codex `art/canals` (Pack F, clone ~/.ai-whiteboard-workers/codex-1615645167; raws to /tmp/canals-raw if no install), `build/pack-uhd` (UH-8/9), `build/pack-fta2a` (FT-9/10), (UH-6/7), `build/pack-utb` (UT-4/5), Codex `art/fx` (clone ~/.ai-whiteboard-workers/codex-642718914).
 Stray: branch `art/pilot` (pilot assets, not merged; delete when no longer wanted) and leftover branch `worktree-agent-a7d9ce60e430bee68` (from an older session; check, then delete).

## Merged so far (2026-11-26/27)
UF: 1-16 (tokens, stubs, registry+art:check, fixtures 14a/b/c 15a/b/c/f, fonts, Gallery tokens+art pages, shared components, prefs, MenuSheet, glyph redraw). UA: style sheet + tools, pilot, anchors B1/B2, floors v2, party (27), Seam fight (36). FT: playback logic 1-3, contracts 4, board layout spike + board 5s-8, spell chip/header/stack/wiring 13-16w. UH: 0-5, 1-2 (kit, lattice page/drawer, Study shell). UT: 1-3 logic, 7-8 (loot, crossroads, cleared). Details: the log file.

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
- `.label` small caps only under `[data-world]`; screens that gain data-world lose their scoped `.label` styling — owed by each screen plan
- AppHeader needs a positioned screen root for MenuSheet — owed by each screen plan
- UH-13 App.svelte edit follows UF-13 (R1: UF-13 done; UH-13 and UE-8 still to do)
- UT-D follow-ups: Crossroads/Cleared pocket button (UT-10, after FT-24); 'Read the notebook' is still the codex link; span screens have no filled primary (rule held: tapping a span card acts, Go home outlined: tell the player); fixtures checked only at 375x812 (check 430/480 at the phase end)
- Fix-pack follow-ups: audit ~35 `var(--hand)` uses below 20 px (alias pinned by tests); `.peek` buttons in the Study strip 26 px; Svelte autofixer only ran on a stub for `stripFallback`; Threshold: AppHeader back button testid is fixed (`header-back`), `threshold-leave` sits in the right slot (add a `testid` prop to `back` if wanted); `it.todo` in fixtures.test.ts for threshold-canals to become a real test

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
