# UX program build status (resume here)

Program: [ux-program](ux-program.md). Log: [ux-program-log.md](ux-program-log.md) (not read on resume; `git log --grep '<ID>'` has task details).

**State:** running (session 2026-11-27 evening: packs fix, UT-C on Claude Sonnet medium; Art E on Codex Terra 6.1 medium) · **next window:** routine (Sonnet medium orchestrator is enough; a design window only for the Close and for new briefs)
**Session rules:** player delegated model choice for subagents (free to override the skill's table); Claude packs Opus high for UF 0a/0b/0c and playback, Sonnet high elsewhere; raster art on Codex Sol high via Whiteboard `git:true` (Codex weekly 61% at start: keep Codex packs few); 2-3 packs at once on disjoint files; engine read-only.
**Player rule (2026-11-27 07:20, current):** Codex weekly is 88%: use Codex ONLY for image creation (art packs), not for coding. Claude hit its 5h limit overnight at 4 concurrent packs although the usage script read ~60%: the Claude reading lags; run at most 3 Claude packs and keep headroom. **Earlier rule (23:25):** ignore weekly limits, watch only 5h windows; balance Claude and Codex, use both as much as possible, never hit the limit (especially Claude). Earlier: **Player rule (2026-11-26):** Claude 5h at 80%: tune Claude down until reset 22:59 Belgrade (no new Claude packs; let running ones finish). Codex 5h is low: use Codex as much as possible despite weekly 61%.
**Reset:** n/a (Claude 5h 1% at start, resets 23:00 Belgrade)

## Next (start here)
Everything started is merged. Nothing is running. Claude: cap 3 packs at once (the usage script under-reads Claude's 5h; four packs hit the limit overnight). Codex weekly is ~88%: Codex ONLY for image packs (player rule); all code packs on Claude.

**Claude packs ready to spawn** (briefs: `docs/plans/ux-*-briefs.md`, ports 5191-5199 distinct, worktrees `.claude/worktrees/pack-<x>`, standing-rules preamble as in earlier spawns):
1. **Small fix pack (do first):** the double safe-area inset (App.svelte pads, AppHeader adds `--safe-top`; also seen by UT-D) then re-measure the Study page (needs ~366 px at 812, 5x5 sockets; 5x4 at 667); reading strip 32 px / `seat-N-info` 40 px to 44; mono face in InkPot/GlyphProfiler (and bridges span cards, UD); `--font-hand` below 20 px alias; AppHeader `stripFallback` snippet prop. Fixtures: fight-lampwater 3rd member + a multi-spell fixture.
2. **UT Pack C** (threshold UT-6), **UT Pack E** (Wiped UT-9; needs FT board `readonly` for See it: on main), **UT Pack B** (map + set-out UT-4/5; fixtures on main), then **UT Pack F** (UT-10 integration, needs FT-24 pocket).
3. **UH Packs C-F** (household/Study sheets, Codex+Desk, Bench, homecoming + transitions; UH-13 App.svelte grant after UF-13 is done).
4. **FT:** Pack C (chain playback presentation, escalate to Opus high if needed), A2a (figures + HP pips), A2b (flat overlay + district-slot migration), D (boss/rival/trick/end overlay), E (pocket notebook, FT-24/25/27; the household pocket still shows `+N`: decide); FT-3b matrix test.
5. **UD** Pack 0 (needs UF-15d district fight fixtures: a UF fixture pack first, `fight-<id>` for all nine), then district packs; **UE** packs (Lab/Gallery/dev gate, larger screens, ending screens) late.
6. **UF remaining:** Pack D4 (UF-15g interactive fight states, after FT-17+; UF-15e lab+Gallery parts), UF-15d district fights, `homecoming-*`/`pocket-readonly` fixtures when their screens exist.

**Codex image packs ready** (briefs `docs/plans/ux-art-briefs.md`; spawn with `git:true`, preamble as before; the orchestrator uploads masters from the worker's /tmp raw folder: `rclone copyto --s3-no-check-bucket`, verify sha256 vs `art-src/MASTERS.json`): Pack E FX (UA-12), Pack F Lampwater (UA-13; use the v2 floors + BL-136 look test), G Home (UA-14; study room anchor art-src/anchors/study), H/I home scenes, J map (UA-17; anchor art-src/anchors/map/halvemeer-v1), K trip scenes, L-Q the other districts, R ending. Always the floor rule (style-sheet section 10) and the full-board repeat check.

## UX-G1 status
Closed 2026-11-27 (player): finish, Pell brim, scale, marks approved; floors redone (v2) and shipped for the Seam. Player noted floors read flat/dull: BL-136 in the roadmap (ideas parked).

## Running or partial
Session rules (2026-11-27 eve, player): max 2 Claude + 1 Codex subagents; Codex only for art, Terra 6.1 medium, none after weekly 96% (was 92%); Claude Sonnet 5.5 medium or Haiku 5.5 high, none new when 5h > 75%; every spawn says 'report in under 200 words'; split fixtures one file per subset; decide with the suggested default and note it.
Merged this session: small fix pack (single safe-area inset, 44 px, stripFallback, fixtures fight-lampwater-trio/fight-multispell; `--font-hand` alias NOT changed: pinned by fonts/tokens tests), UT-6 Threshold. Running: `build/pack-ute` (UT-9), `build/pack-utb` (UT-4/5), Codex `art/fx` (clone ~/.ai-whiteboard-workers/codex-642718914).
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
