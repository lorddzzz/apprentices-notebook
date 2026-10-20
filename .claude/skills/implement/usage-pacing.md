# Usage pacing

Subagents share the orchestrator's usage window. Keep checkpoints and the status file committed so a cutoff is recoverable.

## Measure and project

Check before each spawn, after each report or merge, and about every 15 minutes while agents run. In Claude, use `mcp__ccd_session_mgmt__get_usage` if available; in Codex, use `get_usage_limits`. Record five-hour usage, reset time, and weekly usage when available. Missing readings are unknown, not zero; do not invent a projection.

Use the last two readings to estimate burn rate:

`rate = Δused% / Δminutes`

`projected = used% + rate × min(minutes until reset, 30)`

Use readings from the same window; discard the old baseline after a reset. Until a rate is available, use current usage plus the estimated task cost conservatively. If either current or projected usage reaches Hold, Hold takes precedence.

## Zones

| Zone | Claude projected 5h | GPT projected 5h | Action |
|---|---|---|---|
| Normal | <80% | <80% | Start any task that fits the budget |
| Narrow | 80–<90% | 80–<89% (80–88) | Start only S/M tasks that fit; nudge agents to reduce scope and commit green checkpoints |
| Wrap | 90–<96% | 89–<95% (89–94) | Reduce concurrency to one agent; merge arriving work and keep exact Next actions committed |
| Hold | ≥96% | ≥95% | Start no new tasks. Send one checkpoint-and-report nudge to each running agent; commit and push status, then wait for reset |

**Claude at Wrap:** when idle, start the smallest unblocked task, even if it may be interrupted. Commit status first. Near the edge, pick something smaller rather than idling.

**GPT at Wrap:** start a small task only if its estimated cost fits below 95% or reset will occur before headroom runs out. At current or projected usage ≥95%, do not start any new work, including filler tasks; idling until reset is expected.

Estimate cost from comparable logged tasks. Initial estimates: S ≈3%, M ≈8%, L ≈15%; refine with observed deltas. Normally require `projected + cost <95%`, or a reset before headroom runs out. Claude's Wrap rule is the exception. Before any step at 90%+, ensure the previous checkpoint and Next actions are committed.

Use the zone-independent nudge messages in [templates.md](templates.md).

## Reset and weekly guard

Record the reset epoch and exact Next actions before holding. Use the runtime's supported reminder/wakeup mechanism when available and authorized, targeting reset +60 seconds. Otherwise report the reset time and leave a resumable status; do not claim a resume is scheduled. On wakeup, recheck usage and reread status before resuming. Review surviving partial commits and give replacement agents their exact continuation point.

Above ~85% weekly usage, finish the current wave within the five-hour limits, update status, and ask the player before starting another. Never auto-resume above 95% weekly.
