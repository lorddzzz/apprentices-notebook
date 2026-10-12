# v0 build log

The player was away during the v0 build. This log lists every situation where Claude had to decide something alone, and what it decided. Review it and overturn anything.

Format: **situation**, then the **decision** and **why**. Newest entries at the bottom.

## 2026-10-13

1. **Situation:** DESIGN.md left many fine rules open (e.g. how Bend aims, what On Kill targets, whether triggers see same-cast effects, the turn structure, numbers).
   **Decision:** wrote the defaults into DESIGN.md §9.5 as *Proposals*. Key ones: triggers see same-cast effects; Into the Breach-style intents relative to the enemy, so a shove moves the attack; inked units take +1 damage from every hit; pick 1 of 3 loot after each fight.
   **Why:** the build can't start without concrete rules. They're picked to be the simplest readable option and are meant to be tuned by playing.
2. **Situation:** how to split the work.
   **Decision:** an opus agent plans the engine, sonnet agents implement it step by step, then an opus agent plans the UI against the engine API, sonnet agents build it, and haiku agents run long validation passes. Claude reviews each step and commits to `main`.
   **Why:** the user asked for this orchestration.
