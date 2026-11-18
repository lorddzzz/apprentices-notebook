# Usage pacing

Subagents share the orchestrator's usage window. Commit checkpoints and the status file so that a cutoff loses nothing.

## Measure

Run `node .claude/skills/implement/usage.mjs` (add `--json` to parse it): it reads **both** tools without touching any secret, `claude -p "/usage"` for Claude's 5h and weekly use and the Codex app-server's `account/rateLimits/read` for Codex's. It works from a Claude or a Codex session. A tool that cannot be read prints `unknown`, and a missing reading is unknown, not zero. If the runtime also has a usage tool (`mcp__ccd_session_mgmt__get_usage` in Claude, `get_usage_limits` in Codex), it may replace the script for its own tool.

Read usage **at each spawn and each merge batch**, and once more if agents have run 20 minutes without a report. Each reading is a turn (and the Claude reading itself costs a little), so don't poll.

`rate = Δused% / Δminutes` from two readings of the same tool in the same window, and `projected = used% + rate × min(minutes to reset, 30)`. Each tool has its own window and its own reset time: apply the zones to each tool separately.

The first reading after a spawn overstates the rate (agents read their context all at once). Don't hold on it alone; take a second reading ten minutes later.

Planning figures from the build program's log: one agent burns about 0.4 %/min, three about 1 %/min. A task costs roughly S 3 %, M 8 %, L 15 % of a five-hour window; a pack costs the sum of its tasks less about a third. Refine these from the log's usage column. First mixed-tool cycle (2026-11-18, three review-fix packs): about 34 points of the Claude 5h window and 4 of Codex's (a Codex pack that stops early costs about 4 points and returns little: count only packs that report).

## Route by headroom

Before a spawn, read both tools and pick the runner (see SKILL.md, Runners):
1. Drop a tool whose projected 5h is in Narrow or worse for the pack's size, or whose weekly use is above the player's rule.
2. Of the rest, prefer the tool with the lower projected use; with two or more packs, split them over the tools.
3. A pack that needs Claude-only features (autofixer, browser, agent commits) stays on Claude as long as Claude is not in Narrow.
4. Record each tool's reading at the spawn and at the report in the log's Usage table (one column per tool), and put each pack's Δ on its row.

## Zones

| Zone | Projected 5h (Claude / GPT) | Action (per tool: a tool in Narrow or worse gets no new pack of that size; the other tool keeps going) |
|---|---|---|
| Normal | < 80 % | Start any pack that fits |
| Narrow | 80 – < 90 % (GPT < 89) | Start only S or M work; send running agents the reduce-scope message |
| Wrap | 90 – < 96 % (GPT 89 – < 95) | One agent at most; merge what arrives; commit Next |
| Hold | ≥ 96 % (GPT ≥ 95) | Start nothing. One checkpoint message per running agent, commit and push the status file, end the session |

At Wrap in Claude, when idle, the orchestrator does its own cheap work (records, briefs for the next window, the Close checklist) and starts a small task only if one is ready. In GPT, start nothing that does not fit below 95 %.

Before any step above 90 %, make sure the last checkpoint and Next are committed.

## Reset and weekly guard

At Hold, record the reset time and the exact Next, schedule a wake-up for reset + 1 minute when the runtime supports it and the player's rule allows another window, and end the session. Use a scheduler that starts a **new** session with the continuation prompt (in Claude, a scheduled task; `CronCreate` is session-only and resumes the old session with its whole history, so use it only when nothing else is available and say so). Otherwise report the reset time and stop; never claim a resume is scheduled when it is not. The wake-up starts a fresh session from the continuation prompt: reread the status file, recheck usage, and give any replacement agent its exact continuation point.

The player's session rule decides how many windows to run. Without one: above about 85 % weekly usage, finish the current packs, update the records and ask before starting another window. Never auto-resume above 95 % weekly.
