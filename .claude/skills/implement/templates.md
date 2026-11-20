# Templates for the `implement` skill

## Status file: `docs/plans/<plan>-status.md`

Keep it under about 6 KB. It is the only thing a resuming session reads. Anything a merged task produced belongs in the commit body and one log row, not here.

```markdown
# <Feature> build status (resume here)

Plan: [<plan>](<plan>.md). Log: [<plan>-log.md](<plan>-log.md) (not read on resume; `git log --grep '<ID>'` has each task's details).

**State:** building | holding for reset | waiting on player | done · **next window:** design | routine
**Session rules:** <the player's rules for pacing, models, gates; one line each>
**Reset:** <readable time>; resume: <scheduled wake-up or manual>

## Next
1. <the packs to run now, each with its tasks in order and what follows it>
2. <hard dependencies between packs still ahead>

## Running or partial
| Pack | Tasks | Model | Branch @ commit | State |
|---|---|---|---|---|
| A | BF-3 → BF-4 → BF-5 | Sonnet | worktree-agent-… @ abc1234 | BF-3 committed; BF-4 in progress |

## Needs design review (left unmerged by a routine window)
- <pack> @ <branch> — <the question>

## Owed (declared by a contract, not yet built)
- <what> — owed by <task>; needed by <task>

## Close checklist
- [ ] full gate on main · [ ] full-loop phone check · [ ] code review · [ ] DESIGN §11 / TECH §7 · [ ] plan State + roadmap row · [ ] ledger clean · [ ] CI deployed

## Open questions for the player (defaults held)
## Rough edges
## Continuation prompt
```

## Log: `docs/plans/<plan>-log.md`

Append-only, one line per merged task. Keep the table format so IDs can be matched by script.

```markdown
| ID | Commit | Model / effort | Returns | Usage Δ | Note |
|---|---|---|---|---|---|
| BF-3 | 1a2b3c4 | Sonnet / medium | 0 | ~7% | ring queue and hum; cap wired from battle.ts |
| BF-4 | 5d6e7f8 | Sonnet / medium → high | 1 | ~5% | cap sweep; escalated after a missed case |
```

**Returns** counts review rounds that sent work back (0 = merged on the first report); write an escalation as `from → to`. Usage Δ is per pack when tasks cannot be told apart: put it on the pack's last row. These two columns are how model and effort choices get judged, so fill them every time. Every row has all six cells, and task rows go in the Tasks table only; the ledger script fails on a row that breaks either rule, so run it after adding rows.

Usage readings go in a second table (time, Claude 5h % / weekly %, Codex 5h % / weekly %, action), one row per spawn and merge batch; `node .claude/skills/implement/usage.mjs` prints both.

## Spawn prompt

In Claude, spawn the `pack-worker` agent (`.claude/agents/pack-worker.md` holds the standing rules: start, ownership, verification, commits, report; it runs in its own worktree) with the role's model and effort from the skill's table, and send only this brief. For a brief stored in the briefs file, paste its text into the prompt; don't send the agent to read the file. In a runtime without agent definitions, paste the body of that file first.

```
Pack <name> of docs/plans/<plan>.md: tasks <ID> → <ID> → <ID>.

Read: <plan rows / section>; <design section>; pattern: <file to follow>.
Own: <files and directories>.
Contract (on main):
<signatures, invariants, ordering rules, quoted>
Owed by this pack: <items from the status file's Owed list, or "nothing">

Done when:
- <ID>: tests named <…> pass; <other observable result>
- <ID>: …

Verify: `<the pack's test command>`
<UI only> Phone check: yes, port <519x> | no (the orchestrator checks this wave's screens)
<if it applies> Sims: run `<path>` for task <ID>. (Always, for a task that opens a district or changes the default party, habits or rules.)
```

For a **Wave 0** pack, replace Contract with: "Define <owned contracts>. Report the public interfaces, the invariants, the integration risks, and everything you declared that later tasks must fill in (the Owed list)."

## Standing-rules preamble (runners without an agent definition)

Paste this before the brief for any Codex run and for any `spawn_subagent` that cannot name `pack-worker`. It is `.claude/agents/pack-worker.md` trimmed to what a runner needs. Fill in `<branch>` and keep the applicable startup and commit rules. Whiteboard with `git: true` uses **Whiteboard clone** and **worker commits**. The Codex CLI uses **prepared worktree** and **orchestrator commits**. Fill in the absolute `<path>` for a prepared worktree.

```
You implement one PACK of an implementation plan in The Apprentice's Notebook. Standing rules (the brief wins where it differs):

START
1. <Whiteboard clone:> Work only in the clone you start in. Check its root and HEAD with Git, create <branch> from that HEAD, and install dependencies with `pnpm install --frozen-lockfile --prefer-offline`. Use the clone’s starting commit as the base for the pack.
   <Prepared worktree:> Work only in <path> on <branch>, with dependencies already installed. Check the worktree root and branch before editing.
2. <Whiteboard clone:> Keep your commits local for the orchestrator to fetch. <Prepared worktree with worker commits:> Run `git merge --ff-only main` and report if it fails. <Orchestrator commits:> Use read-only Git commands such as status, diff and log. The orchestrator handles Git writes.
3. Read AGENTS.md and only what the brief lists. Not the status file, the build log, or whole design docs.

WORK
- Tasks in order. <Worker commits:> One commit per task. <Orchestrator commits:> Finish each item with its tests green and list its changed files by task.
- Edit only the files you OWN. An OPTIONAL field, parameter or registry entry in another file is allowed when the task needs it, behaviour without it is identical and existing tests pass unchanged: do it and list it under Proposals. Anything more (changed behaviour, a changed test) leaves THAT ITEM undone: say so, and carry on with the other items instead of stopping the pack.
- Stopping early. <Worker commits:> Commit what you have as `wip(<area>): <ID> <what is missing>`. <Orchestrator commits:> Leave the files as they are and say what is missing.
- No balance tuning. Don't edit DESIGN.md, TECH.md, docs/design/*, the roadmap or the status file. No refactors beyond the tasks.
- src/engine is pure deterministic TypeScript (strict, no `any`, randomness only through engine/rng.ts). A behaviour change ships with a test that fails before the fix.

VERIFY
Before each commit (or item): the brief's Verify command with --reporter=dot and `pnpm exec tsc --noEmit`. Before your last commit (or the end): `pnpm check:fast > check.log 2>&1; tail -20 check.log` (do not commit check.log; allow it several minutes). Never run tests/sim/ unless the brief says so.

COMMIT (worker commits only)
Stage explicit paths, never `git add -A`: `<type>(<area>): <ID> <summary>` with a body of what you built and the test names, ending with the attribution line the session gives.

REPORT
Once, under 250 words: the branch name for worker commits, per task the commit (or files changed) and the test summary line; what is not done and the exact next step; PROPOSALS (each rule you decided that the brief did not, one line with the reason).
```

## Messages to a running agent

**Grant (an additive edit outside Owns)**
```
Granted for <ID>: you may edit <file> (<the one field, parameter or entry>).
Additive and optional only; behaviour without it stays identical; existing tests pass unchanged.
Any test you have to change goes in your report as a Proposal.
```

**Return (once per pack)**
```
Review of <pack>: <n> changes needed before merge.
1. <what is wrong> → <what it must be> (<why>)
2. …
Fix these, rerun the pack's tests, commit, and report once more.
```

**Reduce scope (Narrow)**
```
Usage is tight. Finish the task you are on with the smallest change that meets its Done-when:
no refactors, no extras. Commit your green state now. Don't start the pack's next task.
```

**Checkpoint and report (Hold)**
```
Usage limit is close. Finish only the step you're on, get your tests green (or revert the step),
commit, and report now: done, not done, the exact next step, Proposals. Start nothing new.
```
