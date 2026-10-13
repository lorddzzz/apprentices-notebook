# v0 build status (resume here)

Updated by Claude whenever a step lands. If a session stops, a new one reads this file, then `docs/v0-build-log.md` and the plans.

- Plans: [engine plan](plans/engine-plan.md) (steps E1–E7), [UI plan](plans/ui-plan.md) (steps U1–U7, §5). The real code wins over the plan text.
- Orchestration: opus for planning and hard steps, sonnet for well-defined steps, haiku for long validation. UI steps run one at a time on `main`, because they share the browser pane and port 5173. Engine work runs in worktrees.
- Gate: `pnpm check` before every commit. `pnpm fuzz` runs the full bot fuzz.

## Done (2026-10-13)
- E1–E7 engine, the fuzz harness, and the fix for the brass-plate softlock.
- U1–U7: Study (lattice editor, shelf, ink), Codex, saves (export/import), the Seam expedition (4 encounters, loot, crossroads, wipe), and the Lab (play, paint, lattices, copy as scenario). Gallery: `#/gallery`.
- A haiku QA playthrough, plus polish fixes.

## Next
- The player plays v0 and gives feedback on feel, UX and direction. Open feel questions are in `docs/v0-build-log.md` (entries 21, 22, 25, 28).
- Optional: an opus `/code-review` pass over the v0 code.
