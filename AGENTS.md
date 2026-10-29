# The Apprentice's Notebook

A turn-based rune-inscribing game for the iPhone (PWA), built with Svelte 5 + Vite + TypeScript.
Players wire runes into a lattice like code, then watch chain reactions play out on a battle grid.
Personal project. Live at https://lorddzzz.github.io/apprentices-notebook/

- [DESIGN.md](DESIGN.md): the *what* (game design, decision log in §11)
- [docs/design/](docs/design/README.md): one design doc per big feature (DESIGN.md summarises and links them)
- [docs/plans/](docs/plans/): implementation plans
- [docs/ROADMAP.md](docs/ROADMAP.md): backlog and roadmap (backlog and plan order). Update it when a playtest or a build changes the picture. Finished items go to [docs/ROADMAP-done.md](docs/ROADMAP-done.md); build history to `docs/plans/*-log.md`. Neither is read on resume.
- [TECH.md](TECH.md): the *how* (stack, architecture, tooling, decision log in §7)

## Skills

Project skills live in `.claude/skills/`. At the start of each session, GPT/Codex agents must read the YAML frontmatter of every `SKILL.md` under that folder to learn each skill's name and when to use it. Read the full skill instructions before applying a relevant skill, and load supporting files only as needed.

## Commands

- `pnpm dev`: dev server (`http://localhost:5173/apprentices-notebook/`). Claude preview entries are in `.claude/launch.json`; other runtimes can start it through their terminal or preview tools.
- `pnpm check`: typecheck + lint + test. **Must pass before every commit.** CI runs the same gate.
- `pnpm test`: Vitest. `pnpm format`: Biome. `pnpm icons`: regenerate PWA icons from `public/icon.svg`.

## Architecture rules

- `src/engine/` is **pure, deterministic TypeScript**: no DOM, no Svelte, never imports `ui/` or `app/` (Biome enforces this).
- Every effect in the game is a `GameEvent` in the event log. The UI animates the log; tests assert on it.
- Randomness only through `engine/rng.ts` (seeded). No `Math.random()` in the engine.
- Tunable numbers and content (runes, materials, enemies) live in `src/data/`, not in engine code.
- Imports: `$engine`, `$data`, `$ui/*` aliases.

## Validation is mandatory

- Behavior changes ship with engine or scenario tests (`tests/`; see the `scenario` skill). Documentation and configuration changes need checks appropriate to the change.
- UI changes get a browser check at phone size (375×812) with a screenshot, using the active runtime's browser tools (see the `verify` skill). Report what you verified and any checks that could not be completed.
- The player's playtests are for feel, UX and direction, not for finding bugs.

## Workflow

- Larger features follow a plan in `docs/plans/`, run by the `implement` skill (orchestrator + subagents).
- Use short conventional-ish commit messages (`feat:`, `fix:`, `chore:`, `docs:`). The orchestrator integrates into `main`; implementation subagents commit on isolated task branches as directed by `implement`. For direct work, commit to `main` unless the player requests a branch. A push to `main` deploys automatically after CI; a red CI run leaves the live site on the last good build.
- Design decisions go in DESIGN.md (§11 log), with details in the feature's doc in `docs/design/` when it has one; tech decisions go in TECH.md (§7 log). Update them in the same commit as the change.

## Collaboration

The player is indecisive on fine mechanics: propose a default with a reason and test it by playing. Run design questions in small rounds through the active runtime's question UI, or chat if unavailable (see the `design-round` skill).

## Svelte

- Svelte 5 **runes only** (`$state`, `$derived`, `$props`, `$effect`). No Svelte 4 stores, no `export let`, no `$:`.
- When connected, use the Svelte MCP (`svelte` server): look up docs with `get-documentation`, and run `svelte-autofixer` on every new or changed component until it reports no issues. If unavailable in the active runtime, use official Svelte documentation and the project checks, and report that the autofixer was not run. Claude's `.mcp.json` does not configure other runtimes automatically.

## Style

TypeScript strict, no `any`. Small pure functions in the engine. Comments only where a rule isn't obvious.
