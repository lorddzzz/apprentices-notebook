# Usage pacing

Subagents share the orchestrator's usage window. Commit checkpoints and the status file so that a cutoff loses nothing.

## Measure

Read usage **at each spawn and each merge batch**, and once more if agents have run 20 minutes without a report. Each reading is a turn, so don't poll. In Claude use `mcp__ccd_session_mgmt__get_usage`; in Codex `get_usage_limits`. A missing reading is unknown, not zero.

`rate = Δused% / Δminutes` from two readings in the same window, and `projected = used% + rate × min(minutes to reset, 30)`.

The first reading after a spawn overstates the rate (agents read their context all at once). Don't hold on it alone; take a second reading ten minutes later.

Planning figures from the build program's log: one agent burns about 0.4 %/min, three about 1 %/min. A task costs roughly S 3 %, M 8 %, L 15 % of a five-hour window; a pack costs the sum of its tasks less about a third. Refine these from the log's usage column.

## Zones

| Zone | Projected 5h (Claude / GPT) | Action |
|---|---|---|
| Normal | < 80 % | Start any pack that fits |
| Narrow | 80 – < 90 % (GPT < 89) | Start only S or M work; send running agents the reduce-scope message |
| Wrap | 90 – < 96 % (GPT 89 – < 95) | One agent at most; merge what arrives; commit Next |
| Hold | ≥ 96 % (GPT ≥ 95) | Start nothing. One checkpoint message per running agent, commit and push the status file, end the session |

At Wrap in Claude, when idle, the orchestrator does its own cheap work (records, briefs for the next window, the Close checklist) and starts a small task only if one is ready. In GPT, start nothing that does not fit below 95 %.

Before any step above 90 %, make sure the last checkpoint and Next are committed.

## Reset and weekly guard

At Hold, record the reset time and the exact Next, schedule a wake-up for reset + 1 minute when the runtime supports it and the player's rule allows another window, and end the session. Otherwise report the reset time and stop; never claim a resume is scheduled when it is not. The wake-up starts a fresh session from the continuation prompt: reread the status file, recheck usage, and give any replacement agent its exact continuation point.

The player's session rule decides how many windows to run. Without one: above about 85 % weekly usage, finish the current packs, update the records and ask before starting another window. Never auto-resume above 95 % weekly.
