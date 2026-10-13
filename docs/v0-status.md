# v0 build status (resume here)

Updated by Claude whenever a step lands. If a session stops, a new one reads this file, then `docs/v0-build-log.md` and the plans.

- Plans: [engine plan](plans/engine-plan.md) (steps E1–E7), [UI plan](plans/ui-plan.md) (steps U1–U7, §5). The real code wins over the plan text.
- Orchestration: opus for planning and hard steps, sonnet for well-defined steps, haiku for long validation. UI steps run one at a time on `main`, because they share the browser pane and port 5173. Engine work runs in worktrees.
- Gate: `pnpm check` before every commit. `pnpm fuzz` runs the full bot fuzz.

## Done
- E1–E7 engine: types, data, notation, lattice compiler, battle core, casting, AI and turns, run layer, saves, replay.
- Fuzz harness (`tests/sim/fuzz.test.ts`), and the fix for the brass-plate softlock it found.
- U1 foundations, U2 board rendering, U3 lattice editor, U4 battle interaction in the Lab (`#/lab?scenario=<id>`) (Gallery: `#/gallery?part=glyphs|board|fx|lattice`).

## In progress
- U6: game store, Study, Codex, saves (sonnet).

## Left
- U7 expedition flow (next), then U5 Lab tools (palette, copy as scenario).
- Final validation: a haiku end-to-end browser playthrough at 375×812, then a review pass.
- Update DESIGN §10 checkboxes, and update memory `project-rename.md` with the status.
