# UX program build status (resume here)

Program: [ux-program](ux-program.md). Log: [ux-program-log.md](ux-program-log.md) (not read on resume; `git log --grep '<ID>'` has task details).

**State:** building (wave 0) · **next window:** routine (orchestrator Sonnet; design windows for briefs/reviews on Opus high)
**Session rules:** player delegated model choice for subagents (free to override the skill's table); Claude packs Opus high for UF 0a/0b/0c and playback, Sonnet high elsewhere; raster art on Codex Sol high via Whiteboard `git:true` (Codex weekly 61% at start: keep Codex packs few); 2-3 packs at once on disjoint files; engine read-only.
**Player rule (2026-11-26):** Claude 5h at 80%: tune Claude down until reset 22:59 Belgrade (no new Claude packs; let running ones finish). Codex 5h is low: use Codex as much as possible despite weekly 61%.
**Reset:** n/a (Claude 5h 1% at start, resets 23:00 Belgrade)

## Next
1. UF-1/UF-3 merged (32bfbb2: tokens, six stubs, header.ts, prefs stub). UF-2 merged (b49271d; C2 frozen: registry, artMeta, art:check in both gates; first consumer must import the registry to enter precache; UA-A adds sharp). Wave 0 running: UF Pack 0a (tokens/stubs, UF-1→UF-3), 0b (art registry, UF-2), 0c (fixture loader, UF-4). 0a is merged: FT 0b, UH-0, UT-1 and UF Pack A may start; UF-B and UF-C now run (4 packs briefly with 0c and UA-A).
2. After 0b merges: UA Pack A (Claude, UA-1→UA-2), then UA Pack P pilot (Codex).
3. After 0a merges: UF Packs A/B/C (faces+Gallery, shared components, prefs+menu), FT Pack 0b, UH-0, UT-1 per their briefs files.
4. Grant order (R24): App.svelte UF-13 → UH-13 → UE-8; flow.ts UT-2 → UE-4; Gallery UF-6/7 → UD-3 → UE-6; package.json UF 0b → UA-A.

## Running or partial
| Pack | Tasks | Model | Branch @ commit | State |
|---|---|---|---|---|
| UF-B | UF-8→UF-10 | Sonnet high | build/pack-ufb @ 32bfbb2 (uncommitted UF-8 work in worktree) | STOPPED for Claude usage (80%); resume_subagent f1a64b41f2fc when Claude < 60% |
| FT-0 | FT-1→FT-3 | Codex Sol high | build/ft-0 in clone codex-3397433455 | running (sid 65ed65c433ad) |
| FT-0b | FT-4 contracts | Codex Sol high | build/ft-0b in clone codex-843645866 | running (sid 816825947242) |
| UF-C | UF-11→UF-13 | Sonnet high | build/pack-ufc @ 32bfbb2 | running (sid 39548c31f5e5) |
| UA-A | UA-1→UA-2 | Sonnet high | build/pack-uaa (.claude/worktrees/pack-uaa) @ b49271d | running (sid 68c7971a9a57) |
| UF-0c | UF-4 | Opus high | build/pack-0c @ 17c2414 | running (sid 7e353f0dab94) |

## Needs design review (left unmerged by a routine window)
- none

## Owed (declared by a contract, not yet built)
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
