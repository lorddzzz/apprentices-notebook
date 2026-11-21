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
| **A plan** (one `docs/plans/<feature>-plan.md`) | Everything below, with `<plan>-status.md` and `<plan>-log.md`. A single worker can use a branch `build/<plan>` in the main checkout if its runner supports that workflow and you leave the checkout free for it. Whiteboard’s Git-enabled Codex runner uses a clone even for one worker. Use separate worktrees or worker clones when workers overlap |
| **A program** (several plans) | Everything below, with one status file and one log for the whole program and a boundary map of which plan owns which system |

## Start or resume

1. **Resume:** read the status file only (never the log), check `git status`, `git worktree list` and recent commits against it, then continue from **Next**. If the status file and Git disagree, Git is right: correct the file first.
2. **No plan:** delegate planning to the strongest model available at high effort, giving it [plan-template.md](plan-template.md). The plan states settled rules and open Proposals, shared contracts, and tasks **already grouped into packs** (see below) with owned files, dependencies and acceptance written as test names. Summarize it for the player and get their go, unless already authorized.
3. Design wins over the plan. Resolve conflicts with the player through `design-round`, or follow the autonomy log when they are away.
4. Create the status file from [templates.md](templates.md) and commit it before spawning.
5. Read [usage-pacing.md](usage-pacing.md) and record the usage baseline.

## Packs, not tasks

A **pack** is one agent run: two to four tasks that touch the same files, done in sequence, one commit each. Packs running at the same time own disjoint files. Spawning has a fixed cost (the agent reads the project rules, the plan and the code around its task), so pay it once per area, not once per task.

- Write the window's packs up front: decide the two or three to run, write their briefs, then spend the window merging and recording.
- Run **two or three** agents at a time. Four gives the same output per unit of usage and makes tests time out (a load average near 28 timed out heavy tests and killed a sweep). Run one slow sim or sweep at a time, and no full gate beside it.
- **Wave 0** (shared types, contracts, stubs) is its own pack and merges before anything that depends on it. Do it yourself when it is small or needs the player.
- **Engine work is tests-first.** Its Wave 0 also writes the acceptance tests for the packs that follow: scenario tests asserting the settled rules, marked `it.fails` (or `it.todo` where the setup cannot exist yet), named by task ID. A later pack is done when its tests pass with the marker removed and unchanged otherwise; a test it had to change is a Proposal in its report. Review then reads the test diff, which is small.
- **UI work is not tests-first.** Its acceptance is a list of states to show (screen, data fixture, light or dark) and what must be visible in each, checked on screenshots. App-layer logic behind a screen (view models, projections) is engine-like: test it first.
- A pack starts as soon as what it depends on is merged. Order by critical path, then risk: work that could change the plan (a spike, a go/no-go) runs before content that assumes its answer.

### The brief

Spawn the `pack-worker` agent with the brief in [templates.md](templates.md). The agent's definition carries the standing rules and its worktree isolation, so the brief holds only what differs per pack. For other agent types writing files concurrently, use Whiteboard’s Git-enabled clone, request `isolation: "worktree"` where supported, or prepare a separate pack worktree as described under Runners. A good brief lets the agent start without exploring (and names the **base commit** the pack starts from, so an exported patch applies cleanly on `main`):

- **Owns:** the exact files or directories. Everything else is read-only. For a pack that changes authored numbers, also list the tests that pin the old values (`grep` the old numbers across `tests/`) and put them in Owns: a pack that leaves them red cannot pass its own gate, and a fix pack is a second spawn. Before writing this list, trace the task through the code: where the new behaviour is called from, which shared type or registry it must touch, which tests and fixtures it will change. A brief whose Owns list was guessed from the plan stops its pack before the first commit.
- **Read:** at most three things: the plan rows, one design section, and **one pattern file** to copy (the nearest finished example).
- **Contract:** the signatures and invariants it must keep, quoted in the brief, not "see the plan".
- **Done when:** a list of test names that must exist and pass, plus screenshots for UI. Never a win rate or other balance target unless the project's rules allow tuning in this phase.
- **Verify:** the one command that runs the pack's own tests.

Store briefs for packs that are not started yet in `docs/plans/<plan>-briefs.md` (delete each when its pack merges), so that any session, on any model, can spawn them as written.

### Model choice

Start at the role's first setting; move to its escalation only after a failed review. Hybrid, decided after the calibration window (2026-11-21: Sonnet high and Sol 6.2 high packs merged with 0 returns; Terra's one pack returned nothing; an Opus-high design window wrote the briefs that let F1 and F3 land clean): **design work on Opus high, packs on Sonnet high or Sol 6.2 high, Terra only for content from a precise spec.** The log's Model and Returns columns keep judging it.

| Role | Claude | GPT | Use for |
|---|---|---|---|
| **Fast** | Haiku 5.5 high | Luna 6 high (`gpt-6-luna`) | Content and data from an approved text or a precise spec, pattern-following screens, log and fact gathering |
| **Default** | Sonnet 5.5 high (`sonnet`) → Opus 5.5 medium | Sol 6.2 high (`gpt-6.2-sol`) → Sol 6.2 xhigh | Most packs: engine logic with tests already written, Svelte screens, tests, refactors, debugging |
| **Strong** | Opus 5.5 high | Sol 6.2 xhigh | A Wave 0 with no template to follow, hard algorithms, cross-cutting refactors |
| **Routine orchestrator** | Sonnet 5.5 medium | Sol 6.2 medium | See "Two kinds of window" |
| **Design orchestrator, planner** | Opus 5.5 high, one window per wave (docs only, no sims) | The strongest model available, high effort | Planning, briefs with traced Owns and held defaults, bug diagnosis from code, Wave 0 and Close reviews, audits |

- **Spread by task type, not by count** (experiment, below): long measurement and sweep packs (little editing, hours of sims) go to Codex Sol; edit-heavy packs (UI, engine logic, test updates, Svelte) and anything needing the autofixer or a browser go to Claude. Check both tools' usage at each spawn; shift a pack of either type to the other tool when one is past 50 % and the other under 30 %.
- A Fast pack that fails review moves to Default; it does not get a second Fast attempt.
- Pass the role's model and effort when spawning (see Runners below; `pack-worker`'s own default is Sonnet 5.5 medium). Don't restart a running agent to change its model.
- Record the model, the effort and any escalation in the log row.

## Runners: Claude and Codex together

Both tools may be available; use both. Usage is spent per tool, so spreading packs over the two tools keeps each window lower. When two or more packs start together, **give them different tools** unless one tool has no headroom (see [usage-pacing.md](usage-pacing.md): read both, then route).

| Runner | How to spawn | Commits | Has |
|---|---|---|---|
| **Claude** | The app's `spawn_subagent` (agent `claude`, model and effort from the table), or the `pack-worker` agent where the runtime has agent definitions | The agent, on its branch | Svelte MCP (autofixer), browser tools, everything the session has |
| **Codex via Whiteboard** | `spawn_subagent` with `agent: "codex"`, `git: true` and the table's GPT model | **The worker** commits on a branch in Whiteboard’s clone | Whatever the app gives it |
| **Codex via the CLI** | `node .claude/skills/implement/codex-pack.mjs <worktree> <prompt-file> --model <id> --effort <e>`, started in the background; it exits when the agent is done | **The orchestrator** reviews and commits in the pack worktree | Editing, tests, shell. No MCP servers, so no autofixer and no browser |

Routing rules:
- Name board models as `list_subagent_models` lists them (Claude: `sonnet`, `opus`, `haiku`; not `claude-sonnet-5-5`).
- **Packs that need the Svelte autofixer or a phone check go to Claude.** Engine packs, tests, data and refactors with a `Verify` command go to either.
- Use Whiteboard’s Git-enabled Codex spawn first. Commit anything the worker needs and verify the chat checkout’s `HEAD` is the intended base. Whiteboard clones that commit for each spawn. Give the worker a branch name and the Whiteboard clone preamble in [templates.md](templates.md). The worker installs dependencies in the clone, verifies its pack, and reports its branch and commit IDs. Keep the clone path from the receipt or result.
- If Whiteboard’s Git-enabled spawn is unavailable or fails at startup with no work done, use the Codex CLI runner and record the fallback in the status file. Prepare a pack worktree with `git worktree add .claude/worktrees/pack-<x> -b build/pack-<x> main` and install dependencies there with `pnpm install --frozen-lockfile --prefer-offline`. Give the worker the absolute path and the orchestrator-commits preamble. The worker reports verified file paths by task, and the orchestrator reviews and commits in that worktree. Use the prepared-worktree preamble for Claude spawns without a `pack-worker` definition as well.
- A runner that stops at an ownership edge has not finished the pack: read what it did, commit the verified part as `wip(...)`, widen or re-brief, and send the rest to a second agent on the same branch (it costs one return). Record both runners in the log row (`Codex Terra high → Sonnet medium`).

## Verify in tiers

Verification is the largest avoidable cost. Each tier runs once, at its own level.

| Who | Runs | When |
|---|---|---|
| Agent | The pack's own test paths (quiet reporter), plus the typecheck its files need | Before each commit |
| Agent | The fast gate (`pnpm check:fast`) | Once, before its last commit |
| Orchestrator | The fast gate on merged `main` | Once per **merge batch** (everything that reported since the last run), not per merge |
| CI | The full gate (`pnpm check`) | On push; **read the last run's result before the next push** (`gh run list --limit 3`) instead of repeating it locally |
| Orchestrator | The full gate locally and a full-loop phone check | Only at Close |

- Send check output to a file and read the tail. A passing run's output is never worth reading in full.
- Only a pack that owns the slow sims runs them.
- A test that fails on timing, not logic, is a bug in the gate: fix its timeout or move it to the slow tier the same day. The heavy drawing tests (generator EN-2/EN-5, honest-trial EN-K9, kits-c EN-K6) are the known case: they need a longer timeout or the slow tier, and meanwhile rerun them alone with `--testTimeout=400000` before calling a gate red. Don't rerun and carry on.
- Push once per merge batch, records included, so CI finishes on a commit instead of being cancelled by the next push. Hold every push until the batch's last merge and record are in; a second push inside a CI run cancels it (it happened three times in the calibration window).
- **A Claude pack runs `pnpm check:fast` to the end before it reports**, and a pack that changes authored numbers also runs the tests that pin them (see Owns). CAL-2 and CAL-3 skipped this and left 17 red tests for a fix pack.
- The slow sims run only in CI, so a red run is the only signal that a pack broke them. A red run is a fix pack in the current wave, started before any new pack. A pack that changes what the sims can reach (opens a district, adds a member, a habit or a rule to the defaults) names the sim files to run in its brief.
- **Phone checks.** A pack that adds a new interaction (a gesture, a new control, an animation that carries meaning) verifies it itself at 375×812 before reporting. A pack whose screens follow an existing pattern (another district's banner, card or token) does not start a browser: you check all such screens together, once, when the wave ends, and fix small defects yourself.

## Time-boxes and sharded sweeps

A calibration or sweep pack once sat three hours in one household-sweep process and was stopped with its work unmerged. So:
- **Every brief states a wall-clock budget** (default: 90 minutes for a pack, 30 minutes for any single command). A command that would exceed it is **sharded**: one run per district or lineup, each in the background with its own log and its own cap, `HOUSEHOLD_SEEDS` (or the sim's seed variable) **at 10, not 50**, and the pack reports the shards that finished. A full-seed run is a nightly CI job, not a pack's gate.
- **The orchestrator time-boxes measurement packs automatically** (experiment): when a pack is past its budget, or its sim log has not grown for 20 minutes, send the checkpoint message; five minutes later stop it and take the exported patch. Stopping early with a patch is a normal outcome, recorded in the log row, not a failure.
- **Workers export a patch after every commit** (`git format-patch <base>..HEAD > /tmp/<pack>.mbox`, overwritten each time), so a stop or a rate limit loses nothing.

## Review, merge, record

When a pack reports:

1. **Import and review.** If the worker wrote `/tmp/<pack>.mbox`, apply it in a fresh worktree with `git am --3way` (the clone folder is off-limits to agents and a fetch from it is denied; do not ask the player about it). Otherwise, for a Whiteboard clone, run `git fetch -- "<clone path>" "refs/heads/<branch>"` in the source checkout. This writes source Git metadata under the orchestrator’s approval policy. Verify the reported tip against `FETCH_HEAD` and retain it on a local pack branch if review spans another fetch. Review the test diff and the public surface (exported names, contracts, data shapes) against the brief's Done-when. For UI, look at the screenshots. Leave line-level review to the Close review.
2. **Widen, don't park, when the request is additive.** A pack that stopped because it needs an edit outside its Owns list gets a message granting it, in any kind of window, when the edit only adds something optional, behaviour without it is identical and existing tests pass unchanged. Park the pack under Needs design review only when the edit changes a rule, a contract, a test or a fixture.
3. **One return per pack.** Send the agent one message with every correction and the reason. If a problem remains after that: fix it yourself when it is small (about 30 lines), otherwise write a new brief with the review notes and spawn it at the role's escalation setting.
4. **Squash-merge** one commit per task (in the log row, note the model, effort and how many times the work was sent back). Put the detail in the commit body (what was built, test names, accepted Proposals): `git log --grep '<ID>'` finds it later for free.
5. **Record** in the same commit: one row in the log with all six cells (ID, commit, model and effort, returns, usage Δ, one clause), and the status file's Next, Owed and Rough edges. The usage Δ is the reading at the pack's report minus the reading at its spawn, shared between packs that ran together. Remove the pack’s worktree and branch after integration. For Whiteboard clones, remove the clone after fetching and integrating its work and once the worker no longer needs to resume. Whiteboard retains these clones under its state directory’s `-workers` sibling. Keep any unintegrated or uncommitted work and list its branch and checkout path under Running or partial.
6. Check usage, then start the next pack.

**Owed list.** Whenever a contract leaves something for later ("each district registers its frame when it runs", "BF-5 routes X before Y"), write it in the status file's **Owed** list with the task that must do it, and copy it into that task's brief. Fields that are declared and never filled are the commonest kind of hidden work.

Give the player a short update for each start, merge batch and usage change.

## Two kinds of window

Orchestration does not need the strongest model all the time. The orchestrator's context is re-read on every turn, so its model is the largest single cost.

| Window | Orchestrator | Does |
|---|---|---|
| **Design** | The strongest model available | Planning and replanning, Wave 0 review, writing the briefs file for the coming packs, the one return a pack is allowed when the problem is a contract or design question, Close reviews, audits |
| **Routine** | Sonnet 5.5 medium or Sol 6.2 medium | Spawns packs from the briefs file as written, checks reports against Done-when, runs the gates, merges, records, paces usage |

A routine orchestrator does not decide contracts or accept Proposals that change a rule. When a report needs that, it leaves the pack unmerged under **Needs design review** in the status file with the branch and the question, and goes on to the next pack. A program normally runs one design window, then routine windows until the briefs run out or the review list has three entries. One parked pack is not a reason for a design window while other briefs can run.

- **Don't ask to start a design window.** When one is due, a routine orchestrator spawns it at once as a single agent on the strongest model at high effort, in a worktree, writing docs only, then merges its branch and carries on with the routine work. Questions only the player can answer go to the status file's open questions with a default held; they never stop the window.
- A design window writes briefs for every pack it can unblock, not only the next wave, and traces each brief's Owns list through the code (see The brief).
- The status file's **State** line names which kind of window comes next. If the session's own model does not match it (a routine window on the strongest model, or a design window run directly on a cheaper one), say so in the first update and continue.

## Sessions

End the session at each Hold and start a fresh one at the reset, resuming from the status file. A long session carries its whole history through every turn (a routine orchestrator grows by about 60k tokens per window), and the cache does not survive a hold anyway. Schedule the wake-up when the runtime allows it and the player's pacing rule says to continue ([usage-pacing.md](usage-pacing.md)). A wake-up that fires inside the old session is not a fresh session: prefer a scheduler that opens a new one, and otherwise tell the player the reset time and the continuation prompt.

## Close (a plan, or a wave of a program)

These steps are tasks: list them in the status file when the plan starts, so they are not forgotten.

1. On merged `main`: the full gate, and the feature's full loop at 375×812 with screenshots (`verify`).
2. One `code-review` of the plan's diff (or of each subsystem, for a program). Fix material findings; record the rest as follow-ups.
3. Records: DESIGN.md §11 and the feature doc with the rules and accepted Proposals (marked *Proposal*), TECH.md §7, the plan's `State:` line, the roadmap row, and a short verification note. Run the ledger (`node .claude/skills/implement/ledger.mjs <log> <plan>…`): every task it lists as open or as "in the log's prose only" must be either done or in the status file's Next.
4. Push, and confirm CI deployed that commit.
5. Hand over: what can be played, what was verified and what was not, decisions, rough edges, usage, and two to four playtest questions about feel and direction.

At the start of every design window of a long program, run the ledger and read the Owed list. Drift is cheap to fix early.

## Experiments in progress (judge them in the log, drop what does not pay)

Each is tried from the next session on; record the result in the log's usage table or a row's Note, and move the winner into the rules above.

| Experiment | What to try | Judge by |
|---|---|---|
| **Sharded sweeps, 10 seeds** | Every sweep or calibration pack runs per-district shards at `*_SEEDS=10` with a cap per shard (Time-boxes above) | Wall time per pack against the old 50-seed runs (CAL-5 took about 3 h and never finished); do the 10-seed rates stay within the bands' noise? If a shard's rate swings more than 10 points on a rerun, raise that shard to 20 |
| **Automatic time-box for measurement packs** | Orchestrator sends the checkpoint message at the budget or after 20 minutes without log growth, and stops the pack five minutes later | Packs that end with a usable patch vs packs lost; pack wall time in the log's Note |
| **Spread by task type** | Long measurement and sweeps on Codex Sol, edit-heavy packs on Claude (Routing rules) | Peak of each tool's 5h use per window (the calibration window stayed under 50 % on both); returns per pack by tool |

