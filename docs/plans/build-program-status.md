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
| FN-1A | Strong / Opus 5.5 / medium | M | running | worktree | | fine-print audit doc |

## Usage log
| Time (UTC) | 5h % | resets in | weekly % | zone | action |
|---|---|---|---|---|---|
| 17:42 | 38 | 3h08 | 23 | Normal | baseline; spawn DK-0, FD-0, HC-W0, FN-1A |

## Proposals (from agents, not yet in DESIGN/TECH)

## Decisions and fixes made during the build
- One program-wide status file instead of per-plan files (orchestrator, 2026-10-23).

## Follow-ups and rough edges
