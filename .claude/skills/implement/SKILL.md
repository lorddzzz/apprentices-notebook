---
name: implement
description: Orchestrate a larger feature from an implementation plan (docs/plans/), with subagents on the cheapest model that fits, a tracked status file, and usage-limit pacing so no work is lost at the 5-hour limit. Use when asked to build, execute or continue a plan or a multi-step feature, or to resume an interrupted build.
---

# Implement a feature (orchestrator)

You are the **orchestrator**. You own the contracts, the merges, the design calls, the status file and the final check. Subagents do most of the writing, reading and testing. Your context has to last the whole build, so keep it lean: delegate exploration, ask for short reports, and don't read big files you only need a fact from.

Templates for the status file, spawn prompts and nudge messages are in [templates.md](templates.md).

## 0. Start or resume

1. **Resuming?** Read `docs/plans/<plan>-status.md` first. Trust it over memory. Then run `git worktree list` and `git log --oneline -15`, and read the reports of any agents still running. Continue from **Next**.
2. **No plan yet?** Spawn an **Opus** planner (`model: "opus"`, `subagent_type: "Plan"`) on the design doc. It writes `docs/plans/<feature>-plan.md` in the shape of [research-and-mastery-plan.md](../../../docs/plans/research-and-mastery-plan.md): team and models, the rules the plan settles (*Proposals*), contracts, then waves of tasks. Each task lists the files it **owns**, its model, its dependencies, its acceptance list and a size (S/M/L). Show the player a short summary and wait for their go before building.
3. **Read the plan**, not the whole design. Where the plan and the design disagree, the design wins: ask the player (`design-round`), or log the call in the autonomy log if they're away.
4. **Create the status file** from the template, commit it, and add a one-line pointer to memory (`project` type) that names the file. Memory holds only the pointer.
5. **Check usage** (§3) and record the baseline.

## 1. Waves

- **Wave 0 is your own work:** type contracts, stubs and shared data shapes that every later task codes against. Keep `pnpm check` green, commit, push. Parallel tasks are only safe once these exist.
- **Each later task is one subagent:** `isolation: "worktree"`, `run_in_background: true`, using the task's model. Tasks in the same wave touch **disjoint files** and run in parallel. Start a task as soon as its dependencies are merged; don't wait for the whole wave.
- **Keep 2–4 agents running.** More than that burns usage faster than you can review it.
- **Order of starts:** inside the usage budget, prefer tasks on the critical path, then the large ones (they need the most runway), then fillers.

### Model choice: the cheapest model that can do it

| Model | Use for |
|---|---|
| **Opus** (`opus`) | Plans, cross-cutting refactors, hard algorithms, and tasks that failed twice on Sonnet. Wave 0 and merges stay with you |
| **Sonnet** (`sonnet`) | Planned engine logic, Svelte screens, debugging, tests that need real reasoning, code review |
| **Haiku** (`haiku`) | Work against a precise spec: data tables, codex text, SVG that follows existing art, scenario entries, list screens that copy a pattern. Also running tests, reading logs and CI output, collecting facts across files (`Explore`), and QA playthroughs |

**Escalation:** a task that fails review twice moves up one model. Never escalate in advance. Start a fresh agent with the failed attempt's branch and your review notes.

### Spawning (prompt template in templates.md)

Each prompt is standalone and tells the agent to:
- **Bring its worktree up to `main` first** (`git merge --ff-only main`). Worktrees can start from an old commit.
- **Edit only the files it owns.** Read anything. If the contract is wrong, say so in the report instead of changing it.
- **Commit at every green checkpoint** on its branch, staging explicit paths (never `git add -A`). A cutoff then loses at most one step.
- **Never edit** `DESIGN.md`, `TECH.md`, `docs/design/*` or the status file. Every rule it had to invent goes under **Proposals** in its report.
- **For UI work, use the `dev-alt` preview** (port 5190). You keep `dev` (5173). Only one UI agent at a time per port.
- **Keep the report under ~300 words:** what was built, the branch and commit, test names, screenshots, Proposals, and anything left undone.

## 2. Review, merge, record

After each report:
1. **Review:** read the diff, check it against the acceptance list, and look at the screenshots. If none exist, take them yourself with the `verify` skill.
2. **Fixes:** small ones (an import, a wiring line), make yourself. Bigger ones go back to the **same agent** via `SendMessage` (it keeps its context) with one concrete change and the reason.
3. **Merge:** `git merge --squash <branch>` and one commit per task, e.g. `feat(engine): B1 glyph compile`. Run `pnpm check` after every merge. Push after each merge, or at least after each wave. Screens stay unreachable until the wave that links them, so the live site never shows half a feature.
4. **Record:** update the status file in the same commit. That means the task row, the merge commit, the usage delta the task cost, and its Proposals (copied in full; reports are lost on a cutoff). New risks or follow-ups go there too.
5. **Usage check** (§3), then start whatever just got unblocked.

Tell the player what happened in one or two lines per event (merged, started, usage). Use `mark_chapter` per wave.

## 3. Usage pacing

The goal is to use the whole window **without losing undocumented work** when the limit hits. It is not to stop early. Subagents spend from the same 5-hour window as you.

**Check** with `mcp__ccd_session_mgmt__get_usage` (load it with ToolSearch). Do it before every spawn, after every merge or report, and at least every ~15 minutes while agents run. Log `% used` and `resetsIn` in the status file.

**Use the projected value, not the current one.** Take the burn rate from the last two checks (Δ% / Δmin). Then `projected = used + rate × min(resetsIn, 30 min)`. At 85% with 2 minutes to the reset you are fine. At 70% while burning 3%/min you are not.

| Zone (projected 5h) | What you do |
|---|---|
| **< 80% · Normal** | Full plan. Start any task that fits |
| **80–90% · Narrow** | Start only S/M tasks whose estimated cost fits the headroom. Nudge running agents: no exploration, the smallest solution that meets acceptance, commit green checkpoints now. Keep the status file current after every event |
| **90–96% · Wrap** | Start no new agent tasks. Tell running agents to finish the step they're on, commit what's green, and report status and remaining steps. Merge what arrives. You do only small, documented steps |
| **≥ 96% · Hold** | Do nothing that can be lost. Commit and push the status file with an exact **Next** list. Schedule the resume (below) |

- **Budget by size.** Estimate a task's cost from the deltas logged for similar tasks (first build: S ≈ 3%, M ≈ 8%, L ≈ 15%; refine as you go). Start a task only if `projected + cost` stays under ~95%, **or** the reset comes before it would run out. Near the edge, pick something smaller rather than idling.
- **Losing some work is fine.** What matters is that, before any step at 90%+, the previous step is committed and the status file says what comes next.
- **Resume after the reset:** run a background Bash timer to the reset epoch, e.g. `until [ $(date +%s) -ge <epoch+60> ]; do sleep 30; done`. Use the epoch, not the clock time; HH:MM breaks across midnight. When it fires, check usage, reread the status file, and continue. Agents that were cut off left commits on their branches: review those as partial work, then re-spawn with "continue from commit X".
- **Weekly guard:** above ~85% weekly, finish the current wave, update the status, and ask the player before starting another. Never auto-resume above 95% weekly.

## 4. Finish

1. **Full verification** on merged `main`: `pnpm check`, plus the `verify` skill through the feature's whole loop at 375×812, with screenshots.
2. **Review:** run `code-review` on the feature's diff, or a Sonnet reviewer agent if the window is tight. Fix what matters; note the rest as follow-ups.
3. **Docs**, in the same commit as the last merge: DESIGN.md §11 and the feature doc §0 (rules and accepted Proposals, marked *Proposal*), TECH.md §7 (tech calls), and the status file set to **Done**.
4. **Push**, then confirm that CI deployed (`gh run list -L 1`).
5. **Clean up** the worktrees and branches of merged tasks (`git worktree remove`, `git branch -D`). Only merged ones.
6. **Hand over:** what can be played, what you verified, fixes made during the build, the calls you made, rough edges, peak usage, and 2–4 playtest questions about feel and direction (not bugs).

## Watch for (from past builds)

- Agents that commit files outside their ownership, e.g. by sweeping in your uncommitted docs. Commit your own changes before spawning.
- Two UI agents on one port, or an agent driving your browser tab. Each preview belongs to whoever started it.
- An agent "fixing" a contract to make its task pass. Contracts change only through you.
- Stopping early "to be safe" (v0 stopped at 70% and skipped review) or running into the wall (v0 lost two agents mid-step). Pace by projection instead.
- Status that lives only in your context or in untracked files. If it's not committed, it doesn't exist after a cutoff.
- If the player is away, follow the autonomy log: decide, log it, and keep going.
