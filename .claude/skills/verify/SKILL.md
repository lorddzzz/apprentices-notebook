---
name: verify
description: Verify a change to The Apprentice's Notebook yourself before reporting it done. Use after any UI change, and before telling the player something works.
---

# Verify a change

For engine-only changes, run step 1. For UI changes, complete the browser checks too. Use the active runtime's available preview/browser tools; the Claude tool names below are examples, not requirements for GPT.

1. `pnpm check` must pass (typecheck + lint + tests).
2. Start or reuse the dev server. Claude: `preview_start` with the appropriate entry in `.claude/launch.json`. GPT: use the available preview or terminal tooling (`pnpm dev` for the default server). During `implement`, the orchestrator uses `dev` (5173), and one UI subagent at a time uses `dev-alt` (5190). Open your own browser tab at `http://localhost:<port>/apprentices-notebook/`.
3. Set the browser viewport to 375×812 (Claude: `resize_window`, preset `mobile`).
4. Navigate to the changed screen via its hash route or deep link, e.g. `#/study`, `#/lab?scenario=<name>`.
5. Use supported page/DOM inspection and console tools to check expected text, horizontal overflow (`scrollWidth === clientWidth`), and console errors. Exercise the changed interactions with browser controls. Claude examples: `read_page`, `javascript_exec`, `read_console_messages`, `computer`.
6. Take a screenshot and look at it: layout fits, nothing overlaps the safe areas or the build stamp.
7. Restore your tab's previous viewport when finished.
8. Report the checks, results, and screenshot paths; include them in the task report during `implement`. State any checks the available tools could not perform, including device-only behaviour such as Home Screen install or safe-area notches.

The player's playtests are for feel, UX and direction. Everything that can be checked mechanically is your job.
