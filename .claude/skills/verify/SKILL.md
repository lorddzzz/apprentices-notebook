---
name: verify
description: Verify a change to The Apprentice's Notebook yourself before reporting it done. Use after any UI change, and before telling the player something works.
---

# Verify a change

Run this after any UI change (and a trimmed version for engine-only changes: steps 1 only).

1. `pnpm check` must pass (typecheck + lint + tests).
2. Start the dev server with `preview_start` using the `dev` entry from `.claude/launch.json` (serves `http://localhost:5173/apprentices-notebook/`).
3. `resize_window` with preset `mobile` (375×812).
4. `navigate` to the screen that changed via its hash route or deep link, e.g. `#/study`, `#/lab?scenario=<name>`.
5. Check with `read_page` / `javascript_exec` (no horizontal scroll: `scrollWidth === clientWidth`; expected text present; no console errors via `read_console_messages`). Exercise taps with `computer` where the change is interactive.
6. Take a screenshot and look at it: layout fits, nothing overlaps the safe areas or the build stamp.
7. `resize_window` with preset `desktop` to reset the viewport.
8. Report what you verified and what you saw. Say plainly if something couldn't be checked (e.g. real iPhone behaviour like Home Screen install or safe-area notches).

The player's playtests are for feel, UX and direction. Everything that can be checked mechanically is your job.
