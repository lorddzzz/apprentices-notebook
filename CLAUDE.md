# The Apprentice's Notebook

A turn-based rune-inscribing game for the iPhone (PWA), built with Svelte 5 + Vite + TypeScript.
Players wire runes into a lattice like code, then watch chain reactions play out on a battle grid.
Personal project. Live at https://lorddzzz.github.io/apprentices-notebook/

- [DESIGN.md](DESIGN.md): the *what* (game design, decision log in §11)
- [docs/design/](docs/design/README.md): one design doc per big feature (DESIGN.md summarises and links them)
- [docs/plans/](docs/plans/): implementation plans
- [TECH.md](TECH.md): the *how* (stack, architecture, tooling, decision log in §7)

## Commands

- `pnpm dev`: dev server (`http://localhost:5173/apprentices-notebook/`; `.claude/launch.json` has it for the browser pane)
- `pnpm check`: typecheck + lint + test. **Must pass before every commit.** CI runs the same gate.
- `pnpm test`: Vitest. `pnpm format`: Biome. `pnpm icons`: regenerate PWA icons from `public/icon.svg`.

## Architecture rules

- `src/engine/` is **pure, deterministic TypeScript**: no DOM, no Svelte, never imports `ui/` or `app/` (Biome enforces this).
- Every effect in the game is a `GameEvent` in the event log. The UI animates the log; tests assert on it.
- Randomness only through `engine/rng.ts` (seeded). No `Math.random()` in the engine.
- Tunable numbers and content (runes, materials, enemies) live in `src/data/`, not in engine code.
- Imports: `$engine`, `$data`, `$ui/*` aliases.

## Validation is mandatory

- Every change ships with engine or scenario tests (`tests/`; see the `scenario` skill).
- UI changes get a browser-pane check at phone size (375×812) with a screenshot (see the `verify` skill). Report what you verified.
- The player's playtests are for feel, UX and direction, not for finding bugs.

## Workflow

- Commit straight to `main` with short conventional-ish messages (`feat:`, `fix:`, `chore:`, `docs:`). A push deploys automatically after CI.
- Run `pnpm check` before committing. A red CI run leaves the live site on the last good build.
- Design decisions go in DESIGN.md (§11 log), with details in the feature's doc in `docs/design/` when it has one; tech decisions go in TECH.md (§7 log). Update them in the same commit as the change.

## Collaboration

The player is indecisive on fine mechanics: propose a default with a reason and test it by playing. Run design questions in small rounds through the question UI (see the `design-round` skill).

## Svelte

- Svelte 5 **runes only** (`$state`, `$derived`, `$props`, `$effect`). No Svelte 4 stores, no `export let`, no `$:`.
- Use the Svelte MCP (`svelte` server): look up docs with `get-documentation`, and run `svelte-autofixer` on every new or changed component until it reports no issues.

## Style

TypeScript strict, no `any`. Small pure functions in the engine. Comments only where a rule isn't obvious.
