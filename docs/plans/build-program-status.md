# Build program status (resume here)

Plans: [build-program.md](build-program.md), order in [ROADMAP §2](../ROADMAP.md). One status file for the whole program (instead of one per plan) so a fresh session sees every running task across plans; a plan's section moves to its own file only if it grows too long. Updated on every event and committed with every merge.

**State:** building (Stage 0)
**Reset:** 5h window resets 2026-10-23 20:50 UTC; resume manually by reading this file.
**Next:**
1. Collect reports from DK-0, FD-0, HC-W0, FN-1A; review, squash-merge, push.
2. After DK-0: start DK-2 (the `run.ts` split). After FD-0: FD-1, FD-2, FD-8, FD-9 (disjoint files). DK-1 and FD-10 can start any time.

## Tasks
| ID | Role / model / effort | Size | Status | Branch / commit | Usage Δ | Notes |
|---|---|---|---|---|---|---|
| DK-0 | Medium / Sonnet 5.5 / high | S | running | worktree | | golden baseline |
| FD-0 | Strong / Opus 5.5 / medium | S | running | worktree | | arrival + event contract types |
| HC-W0 | Strong / Opus 5.5 / medium | M | running | worktree | | household contracts; new engine files only (no `run.ts`, `engine/types.ts`) |
| FN-1A | Strong / Opus 5.5 / medium | M | merged | worktree-agent-aeb0431faf9056812 @ 5a09d70 | shared | 59 gaps (22 new, 10 new+event, 27 text); `bind:cloud` misfiled on plain Ink spread |

## Usage log
| Time (UTC) | 5h % | resets in | weekly % | zone | action |
|---|---|---|---|---|---|
| 17:42 | 38 | 3h08 | 23 | Normal | baseline; spawn DK-0, FD-0, HC-W0, FN-1A |
| 17:52 | 58 | 2h57 | 25 | Narrow (burn ~2%/min with 4 agents) | merge FN-1A; no new spawns until the three running agents report |

## Proposals (from agents, not yet in DESIGN/TECH)
- FN-1A A1: new `Meets` values (`spread`, `shot`, Margin's limit refusal) instead of bending existing ones (shipped IDs never change). Accepted.
- FN-1A A2: wrong text is fixed by editing the row, not adding a second one. Accepted.
- FN-1A A3: Cinder vs a rat's oil trail over a hot tile (doesn't catch; the line says "now or later"): rule choice. **Ask player** at the next design round; default until then = fix the text to match the engine.
- FN-1A A4: keep near-always lines (`splash:unit`, `fork:unit`, `oil:empty`) as the honest home for heading/duration rules. Accepted.

## Decisions and fixes made during the build
- One program-wide status file instead of per-plan files (orchestrator, 2026-10-23).

## Follow-ups and rough edges
