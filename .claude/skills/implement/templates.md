# Templates for the `implement` skill

## Status file: `docs/plans/<plan>-status.md`

```markdown
# <Feature> build status (resume here)

Plan: [<plan>](<plan>.md). Updated on every event and committed with every merge.

**State:** building | holding for reset | waiting on player | done
**Reset:** <epoch and readable time>; resume mechanism: <scheduled wakeup or manual resume>
**Next:** 1–3 concrete actions a fresh session takes first.

## Tasks
| ID | Role / model / effort | Size | Status | Branch / commit | Usage Δ | Notes |
|---|---|---|---|---|---|---|
| W0 | Strong / <model> / <effort> | M | merged | <source commit> | 6% | contract handoff: <interfaces, invariants, risks> |
| A1 | Fast / <model> / <effort> | S | running | <branch> | | started 20:14 |
| B1 | Medium / <model> / <effort> | L | partial | <branch> @ <commit> | | cut off at step 3/5; resume from there |

## Usage log
| Time (UTC) | 5h % | resets in | weekly % | zone | action |
|---|---|---|---|---|---|

## Proposals (from agents, not yet in DESIGN/TECH)
- A1: <rule> (<reason>). Accepted / changed to … / ask player

## Decisions and fixes made during the build
## Follow-ups and rough edges
```

## Spawn prompt

```
You are implementing task <ID> of docs/plans/<plan>.md in The Apprentice's Notebook.
First: your worktree may predate main. Run `git merge --ff-only main` (report if it fails).
Read: CLAUDE.md, the plan's shared contracts and task <ID>, and design doc sections <§…>. Nothing else unless needed.
You own (create or edit only these): <files>. Read anything else.
Contract: <types/signatures on main; report problems without changing them>.
For Wave 0 instead: define <owned contracts> and report interfaces, invariants, and integration risks.
Done when: <acceptance list>.
Rules:
- `pnpm check` green before each commit. Commit at every green checkpoint, staging explicit paths
  (never `git add -A`): "<type>(<area>): <ID> <summary>".
- .svelte files: run the Svelte MCP `svelte-autofixer` until clean. UI: the `verify` skill at 375×812
  using the `dev-alt` preview (port 5190). Reserve 5173 for the orchestrator; only one UI agent
  may use 5190 at a time. Use your own browser tab.
- Don't edit DESIGN.md, TECH.md, docs/design/* or the status file.
- If you get a message from the orchestrator about scope or usage, follow it at your next step.
Report (under ~300 words): what you built, the branch and last commit, test names, screenshot paths (UI),
what's left undone, and "Proposals": every rule you decided that the plan didn't, one line each with the reason.
```

## Nudge messages (use the runtime's agent messaging tool)

**Reduce scope (Narrow)**
```
Usage is getting tight. Finish <ID> with the smallest change that meets the acceptance list: no
refactors, no exploration, no extras. Commit your current green state now, then keep going.
```

**Checkpoint and report (Hold, or wrapping a running task)**
```
Usage limit is close. Finish only the step you're on, get `pnpm check` green (or revert that step),
commit, and report now: done, not done, the exact next step, and Proposals. Don't start anything new.
```
