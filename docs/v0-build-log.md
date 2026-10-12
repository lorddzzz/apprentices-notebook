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
3. **Situation:** the engine plan (opus) had to fill gaps that §9.5 didn't cover, and took 29 small rule decisions.
   **Decision:** accepted all 29 as written. They get recorded in DESIGN.md at engine step 7. The ones most likely to matter for feel:
   - "Magnitude" means footprint for material runes, so the Draughtsman's Ink and the Stoker's Oil cover 3×3 thanks to affinity.
   - Steam stops projectiles and protects the units inside it.
   - On Round 1, enemies telegraph without moving.
   - Fights are fully deterministic: enemy AI uses no randomness.
   - Walls are dropped.
   - A training dummy exists for the Lab only.
   - Codex discoveries survive a wipe.
   **Why:** each one is the simplest readable choice, and the riskiest is a single tuning value (`affinityBonus`).
