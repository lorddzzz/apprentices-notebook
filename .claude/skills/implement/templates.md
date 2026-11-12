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

Usage readings go in a second table (time, 5h %, weekly %, action), one row per merge batch.

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
