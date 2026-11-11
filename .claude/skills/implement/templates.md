# Templates for the `implement` skill

## Status file: `docs/plans/<plan>-status.md`

Keep it under about 6 KB. It is the only thing a resuming session reads. Anything a merged task produced belongs in the commit body and one log row, not here.

```markdown
# <Feature> build status (resume here)

Plan: [<plan>](<plan>.md). Log: [<plan>-log.md](<plan>-log.md) (not read on resume; `git log --grep '<ID>'` has each task's details).

**State:** building | holding for reset | waiting on player | done
**Session rules:** <the player's rules for pacing, models, gates; one line each>
**Reset:** <readable time>; resume: <scheduled wake-up or manual>

## Next
1. <the packs to run now, each with its tasks in order and what follows it>
2. <hard dependencies between packs still ahead>

## Running or partial
| Pack | Tasks | Model | Branch @ commit | State |
|---|---|---|---|---|
| A | BF-3 → BF-4 → BF-5 | Sonnet | worktree-agent-… @ abc1234 | BF-3 committed; BF-4 in progress |

## Owed (declared by a contract, not yet built)
- <what> — owed by <task>; needed by <task>

## Close checklist
- [ ] full gate on main · [ ] full-loop phone check · [ ] code review · [ ] DESIGN §11 / TECH §7 · [ ] plan State + roadmap row · [ ] every task ID accounted for · [ ] CI deployed

## Open questions for the player (defaults held)
## Rough edges
## Continuation prompt
```

## Log: `docs/plans/<plan>-log.md`

Append-only, one line per merged task. Keep the table format so IDs can be matched by script.

```markdown
| ID | Commit | Model | Usage Δ | Note |
|---|---|---|---|---|
| BF-3 | 1a2b3c4 | Sonnet | ~7% | ring queue and hum; cap wired from battle.ts |
```

Usage readings go in a second table (time, 5h %, weekly %, action), one row per merge batch.

## Spawn prompt

```
You are implementing pack <name> of docs/plans/<plan>.md: tasks <ID> → <ID> → <ID>, in that order,
one commit per task.

First: run `git merge --ff-only main` (report if it fails).
Read only: AGENTS.md; <plan rows / section>; <design section>; and <pattern file> as the example to
follow. Do not read the status file, the log, or whole design docs. Look at other code only when a
type or call site requires it.

You own (create or edit only these): <files and directories>. Everything else is read-only; if the
work needs a change elsewhere, stop and report it.

Contract (on main; keep it, report problems instead of changing it):
<signatures, invariants, ordering rules, quoted>
Owed by this pack: <items from the status file's Owed list>

Done when, per task:
- <ID>: tests named <…> exist and pass; <other observable result>
- <ID>: …

Verify:
- Before each commit: `<the pack's test command> --reporter=dot` and the typecheck your files need
  (`pnpm exec tsc --noEmit` for .ts only; `pnpm typecheck` if you changed a .svelte file).
- Before your last commit: `pnpm check:fast > /tmp/<pack>-check.log 2>&1; tail -20 /tmp/<pack>-check.log`.
- Never run `tests/sim/` unless a task above says so.
- .svelte files: run the Svelte MCP `svelte-autofixer` until clean. UI: the `verify` skill at 375×812
  against your own server, `pnpm dev --port <519x> --strictPort` from your worktree; your own tab.

Rules:
- Commit at each green task, staging explicit paths (never `git add -A`):
  "<type>(<area>): <ID> <summary>", with a body listing what you built and the test names.
- Don't edit DESIGN.md, TECH.md, docs/design/*, the roadmap or the status file.
- Don't tune balance numbers; keep the design's values.
- If the orchestrator messages you about scope or usage, follow it at your next step.

Report once, under 250 words, then stop: per task, the commit and the passing test names (paste the
summary line of the test run); screenshot paths for UI; what is not done and the exact next step;
"Proposals": each rule you decided that the plan did not, one line with the reason.
```

For a **Wave 0** pack, replace Contract with: "Define <owned contracts>. Report the public interfaces, the invariants, the integration risks, and everything you declared that later tasks must fill in (the Owed list)."

## Messages to a running agent

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
