# Templates for the `implement` skill

## Status file: `docs/plans/<plan>-status.md`

```markdown
# <Feature> build status (resume here)

Plan: [<plan>](<plan>.md). Orchestrator: Opus main session. Updated on every event and committed with every merge.

**State:** building | holding for reset (resumes ~HH:MM UTC) | waiting on player | done
**Next:** 1–3 concrete actions a fresh session takes first.

## Tasks
| ID | Model | Size | Status | Branch / commit | Usage Δ | Notes |
|---|---|---|---|---|---|---|
| W0 | opus (me) | M | merged | 037009c | 6% | |
| A1 | haiku | S | running | worktree-agent-… | | started 20:14 |
| B1 | sonnet | L | partial | worktree-agent-… @ 81cfc36 | | cut off at step 3/5; resume from there |

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
Read: CLAUDE.md, the plan's §0–§2 and task <ID>, and design doc sections <§…>. Nothing else unless needed.
You own (create or edit only these): <files>. Read anything else.
Contract (on main, don't change it; say in your report if it's wrong): <types/signatures>.
Done when: <acceptance list>.
Rules:
- `pnpm check` green before each commit. Commit at every green checkpoint, staging explicit paths
  (never `git add -A`): "<type>(<area>): <ID> <summary>" + Co-Authored-By trailer.
- .svelte files: run the Svelte MCP `svelte-autofixer` until clean. UI: the `verify` skill at 375×812
  using the `dev-alt` preview (port 5190).
- Don't edit DESIGN.md, TECH.md, docs/design/* or the status file.
- If you get a message from the orchestrator about scope or usage, follow it at your next step.
Report (under ~300 words): what you built, the branch and last commit, test names, screenshot paths (UI),
what's left undone, and "Proposals": every rule you decided that the plan didn't, one line each with the reason.
```

## Nudge messages (SendMessage to the running agent)

**Narrow (80–90%)**
```
Usage is getting tight. Finish <ID> with the smallest change that meets the acceptance list: no
refactors, no exploration, no extras. Commit your current green state now, then keep going.
```

**Wrap (90–96%)**
```
Usage limit is close. Finish only the step you're on, get `pnpm check` green (or revert that step),
commit, and report now: done, not done, the exact next step, and Proposals. Don't start anything new.
```
