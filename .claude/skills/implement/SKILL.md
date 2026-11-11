---
name: implement
description: Execute or resume a larger feature from an implementation plan in docs/plans/, using subagents, a committed status file, and usage-aware pacing. Also creates a plan when implementation is requested without one.
---

# Implement a feature

You are the **orchestrator**. You own contracts, briefs, reviews, merges and the records. Subagents write the code. Usage is the scarce resource: every spawn, every check run and every line you read or write is paid for, so the rules below aim at the fewest spawns and the least repeated verification that still give correct work.

## Pick the size first

| The work is | Do this |
|---|---|
| **Small** (up to about 5 tasks, one area) | No status file or log. Do it directly, or spawn one agent with one brief. Run the fast gate, review, commit, then the Close steps that apply |
| **A plan** (one `docs/plans/<feature>-plan.md`) | Everything below, with `<plan>-status.md` and `<plan>-log.md`. If only one agent will ever run at a time, skip worktrees: the agent commits on a branch `build/<plan>` in the main checkout, and you edit nothing there while it runs. Use worktrees as soon as two agents overlap |
| **A program** (several plans) | Everything below, with one status file and one log for the whole program and a boundary map of which plan owns which system |

## Start or resume

1. **Resume:** read the status file only (never the log), check `git status`, `git worktree list` and recent commits against it, then continue from **Next**. If the status file and Git disagree, Git is right: correct the file first.
2. **No plan:** delegate planning to a Strong planner at high effort. The plan states settled rules and open Proposals, shared contracts, and tasks **already grouped into packs** (see below) with owned files, dependencies and acceptance written as test names. Summarize it for the player and get their go, unless already authorized.
3. Design wins over the plan. Resolve conflicts with the player through `design-round`, or follow the autonomy log when they are away.
4. Create the status file from [templates.md](templates.md) and commit it before spawning.
5. Read [usage-pacing.md](usage-pacing.md) and record the usage baseline.

## Packs, not tasks

A **pack** is one agent run: two to four tasks that touch the same files, done in sequence, one commit each. Packs running at the same time own disjoint files. Spawning has a fixed cost (the agent reads the project rules, the plan and the code around its task), so pay it once per area, not once per task.

- Write the window's packs up front: decide the two or three to run, write their briefs, then spend the window merging and recording.
- Run **two or three** agents at a time. Four gives the same output per unit of usage and makes tests time out.
- **Wave 0** (shared types, contracts, stubs) is its own pack and merges before anything that depends on it. Do it yourself when it is small or needs the player.
- **Engine work is tests-first.** Its Wave 0 also writes the acceptance tests for the packs that follow: scenario tests asserting the settled rules, marked `it.fails` (or `it.todo` where the setup cannot exist yet), named by task ID. A later pack is done when its tests pass with the marker removed and unchanged otherwise; a test it had to change is a Proposal in its report. Review then reads the test diff, which is small.
- **UI work is not tests-first.** Its acceptance is a list of states to show (screen, data fixture, light or dark) and what must be visible in each, checked on screenshots. App-layer logic behind a screen (view models, projections) is engine-like: test it first.
- A pack starts as soon as what it depends on is merged. Order by critical path, then risk: work that could change the plan (a spike, a go/no-go) runs before content that assumes its answer.

### The brief

Use the spawn prompt in [templates.md](templates.md). A good brief lets the agent start without exploring:

- **Owns:** the exact files or directories. Everything else is read-only.
- **Read:** at most three things: the plan rows, one design section, and **one pattern file** to copy (the nearest finished example).
- **Contract:** the signatures and invariants it must keep, quoted in the brief, not "see the plan".
- **Done when:** a list of test names that must exist and pass, plus screenshots for UI. Never a win rate or other balance target unless the project's rules allow tuning in this phase.
- **Verify:** the one command that runs the pack's own tests.

Store briefs for packs that are not started yet in `docs/plans/<plan>-briefs.md` (delete each when its pack merges), so that any session, on any model, can spawn them as written.

### Model choice

Default to the cheapest role that fits; move up only after a failed review.

| Role | Claude | GPT | Use for |
|---|---|---|---|
| **Fast** | Haiku 5.5 high | Luna 6 max (`gpt-6-luna`) | Content and data from an approved text or a precise spec, pattern-following screens, log and fact gathering |
| **Medium** | Sonnet 5.5 high | Sol 6.1 medium (`gpt-6.1-sol`) | The default: engine logic, Svelte screens, tests, refactors, debugging |
| **Strong** | Opus 5.5 medium | Sol 6.1 high | Planning (at high effort), a Wave 0 with no template to follow, and escalations |

A session or project rule may narrow this further. For Codex model overrides use `fork_turns: "none"` with a standalone prompt. Don't restart a running agent to change its model.

## Verify in tiers

Verification is the largest avoidable cost. Each tier runs once, at its own level.

| Who | Runs | When |
|---|---|---|
| Agent | The pack's own test paths (quiet reporter), plus the typecheck its files need | Before each commit |
| Agent | The fast gate (`pnpm check:fast`) | Once, before its last commit |
| Orchestrator | The fast gate on merged `main` | Once per **merge batch** (everything that reported since the last run), not per merge |
| CI | The full gate (`pnpm check`) | On push; read the run's result instead of repeating it locally |
| Orchestrator | The full gate locally and a full-loop phone check | Only at Close |

- Send check output to a file and read the tail. A passing run's output is never worth reading in full.
- Only a pack that owns the slow sims runs them.
- A test that fails on timing, not logic, is a bug in the gate: fix its timeout or move it to the slow tier the same day. Don't rerun and carry on.
- Push once per merge batch, so CI finishes on a commit instead of being cancelled by the next push.
- **Phone checks.** A pack that adds a new interaction (a gesture, a new control, an animation that carries meaning) verifies it itself at 375×812 before reporting. A pack whose screens follow an existing pattern (another district's banner, card or token) does not start a browser: you check all such screens together, once, when the wave ends, and fix small defects yourself.

## Review, merge, record

When a pack reports:

1. **Review** the test diff and the public surface (exported names, contracts, data shapes) against the brief's Done-when. For UI, look at the screenshots. Leave line-level review to the Close review.
2. **One return per pack.** Send the agent one message with every correction and the reason. If a problem remains after that: fix it yourself when it is small (about 30 lines), otherwise write a new brief with the review notes and move up one model role.
3. **Squash-merge** one commit per task. Put the detail in the commit body (what was built, test names, accepted Proposals): `git log --grep '<ID>'` finds it later for free.
4. **Record** in the same commit: one row in the log (ID, commit, model, one clause), and the status file's Next, Owed and Rough edges. Remove the pack's worktree and branch now.
5. Check usage, then start the next pack.

**Owed list.** Whenever a contract leaves something for later ("each district registers its frame when it runs", "BF-5 routes X before Y"), write it in the status file's **Owed** list with the task that must do it, and copy it into that task's brief. Fields that are declared and never filled are the commonest kind of hidden work.

Give the player a short update for each start, merge batch and usage change.

## Two kinds of window

Orchestration does not need the strongest model all the time. The orchestrator's context is re-read on every turn, so its model is the largest single cost.

| Window | Orchestrator | Does |
|---|---|---|
| **Design** | The strongest model available | Planning and replanning, Wave 0 review, writing the briefs file for the coming packs, the one return a pack is allowed when the problem is a contract or design question, Close reviews, audits |
| **Routine** | A Medium model (Sonnet 5.5 high; Sol 6.1 medium) | Spawns packs from the briefs file as written, checks reports against Done-when, runs the gates, merges, records, paces usage |

A routine orchestrator does not decide contracts or accept Proposals that change a rule. When a report needs that, it leaves the pack unmerged under **Needs design review** in the status file with the branch and the question, and goes on to the next pack. The status file's **State** line names which kind of window comes next; the player picks the session's model to match. A program normally runs one design window, then routine windows until the briefs run out or the review list has three entries.

## Sessions

End the session at each Hold and start a fresh one at the reset, resuming from the status file. A long session carries its whole history through every turn, and the cache does not survive a hold anyway. Schedule the wake-up when the runtime allows it and the player's pacing rule says to continue ([usage-pacing.md](usage-pacing.md)).

## Close (a plan, or a wave of a program)

These steps are tasks: list them in the status file when the plan starts, so they are not forgotten.

1. On merged `main`: the full gate, and the feature's full loop at 375×812 with screenshots (`verify`).
2. One `code-review` of the plan's diff (or of each subsystem, for a program). Fix material findings; record the rest as follow-ups.
3. Records: DESIGN.md §11 and the feature doc with the rules and accepted Proposals (marked *Proposal*), TECH.md §7, the plan's `State:` line, the roadmap row, and a short verification note. Run the ledger (`node .claude/skills/implement/ledger.mjs <log> <plan>…`): every task it lists as open or as "in the log's prose only" must be either done or in the status file's Next.
4. Push, and confirm CI deployed that commit.
5. Hand over: what can be played, what was verified and what was not, decisions, rough edges, usage, and two to four playtest questions about feel and direction.

At the start of every design window of a long program, run the ledger and read the Owed list. Drift is cheap to fix early.
