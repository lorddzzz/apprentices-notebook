---
name: implement
description: Execute or resume a larger feature from an implementation plan in docs/plans/, using subagents, a committed status file, and usage-aware pacing. Also creates a plan when implementation is requested without one.
---

# Implement a feature

You are the **orchestrator**. You own contract decisions, reviews, merges, and the status file. Delegate implementation and exploration; request concise reports.

## Start or resume

1. **Resume:** read `docs/plans/<plan>-status.md`, inspect worktrees and recent commits, and collect reports from surviving agents. Reconcile the recorded state with Git, then continue from **Next**.
2. **No plan:** delegate planning to **Opus 5.5 High** or **Sol 6.1 High** (`gpt-6.1-sol`, reasoning `high`). The planner reads the relevant design and writes `docs/plans/<feature>-plan.md`: settled rules and open Proposals, shared contracts, dependency-ordered waves, and tasks with owned files, model role, dependencies, acceptance criteria, and size (S/M/L). Summarize the plan for the player and get their go before building, unless already authorized.
3. Read the plan and relevant design sections. Design takes precedence; resolve conflicts with the player through `design-round`, or follow the autonomy log when they are away.
4. Create or refresh the status file using [templates.md](templates.md). Commit it before spawning; if project memory is available, store only a pointer to it there.
5. Read [usage-pacing.md](usage-pacing.md), check usage, and record the baseline. Use that reference throughout the build.

## Delegate and sequence

- **Wave 0:** default to a **Strong** subagent for shared types, contracts, and stubs. Require a handoff identifying public interfaces, invariants, and integration risks. The orchestrator reviews the contract diff against downstream tasks, resolves gaps, and merges it before dependent tasks start. Do Wave 0 directly when it is small or its unresolved design decisions require close iteration with the player.
- Give each task an isolated worktree and explicit file ownership. Concurrent tasks must own disjoint files. Start a task once its dependencies are merged; a wave is not a barrier.
- Run 2–4 agents when usage and independent work allow. Prioritize the critical path, then large tasks, then fillers.
- Use the standalone spawn prompt in [templates.md](templates.md); fill in the task's context and acceptance criteria. It contains the ownership, checkpoint, preview, and report requirements. Give Wave 0 authority over its listed contract files; later tasks report contract problems instead of changing them.

### Model choice

Choose the least expensive role suited to the task.

| Role       | Claude option   | GPT option                               | Use for                                                                                                      |
| ---------- | --------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| **Strong** | Opus 5.5 Medium | Sol 6.1 High (`gpt-6.1-sol`, `high`)     | Wave 0, cross-cutting refactors, hard algorithms                                                             |
| **Medium** | Sonnet 5.5 High | Sol 6.1 Medium (`gpt-6.1-sol`, `medium`) | Planned engine logic, Svelte screens, debugging, substantive tests and review                                |
| **Fast**   | Haiku 5.5 High  | Luna 6 Max (`gpt-6-luna`, `max`)         | Precise-spec content/data, pattern-based screens, test runs, log inspection, fact gathering, QA playthroughs |

Planning uses the explicit High setting above, overriding the Claude Strong default. Use the active runtime's model and reasoning/effort controls. For Codex model overrides, use `fork_turns: "none"` with a standalone prompt. Legacy plan roles Opus/Sonnet/Haiku mean Strong/Medium/Fast. Apply mappings to new spawns; do not restart running agents just to change models.

After two failed reviews, escalate one role with the attempt's branch and review notes. If already Strong, reassess the contract or task split before retrying.

## Review, merge, record

After each report:

1. Review the diff against acceptance criteria and test evidence; for UI work, inspect screenshots or use `verify` to obtain them.
2. Fix small integration issues directly. Return larger corrections to the same agent with the required change and reason.
3. Squash-merge one task per commit. Run `pnpm check` before committing. Keep unfinished screens unreachable until their integration task. Push after each merge or at least each wave.
4. Include the status update in the merge commit: task state, source branch/commit, usage delta, full Proposals, and exact next actions. Preserve partial-work locations and new risks.
5. Check usage and start newly unblocked work within the pacing rules.

Give the player short updates for meaningful starts, merges, and usage changes. Use chapter markers per wave if available.

## Finish

1. On merged `main`, run `pnpm check` and verify the feature's full loop using `verify` at 375×812, with screenshots.
2. Review the feature diff with `code-review` if available, otherwise a Medium reviewer. Fix material findings and record remaining follow-ups.
3. Update DESIGN.md §11 and the feature doc §0 with rules and accepted Proposals (marked *Proposal*), TECH.md §7 with tech decisions, and the status file to **Done**, in the final implementation commit.
4. Push and confirm that CI deployed the pushed commit, rather than relying on the latest unrelated run.
5. Remove only merged task worktrees and branches after preserving needed reports in the status file.
6. Hand over what can be played, verification, decisions, rough edges, peak usage, and 2–4 playtest questions about feel and direction.
