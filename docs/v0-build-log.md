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
4. **Situation:** the plan didn't include flavour text (rune rules, the owner's codex notes, blurbs for members and enemies).
   **Decision:** the step 1 implementer wrote placeholder text in `src/data/` (`runes.ts`, `codex.ts`, `members.ts`, `enemies.ts`).
   **Why:** lore is low priority until the core is fun (DESIGN §6.7). It's easy to rewrite later.
5. **Situation:** the step 1 agent's `git add -A` swept this log into its commit.
   **Decision:** left it as is. Later agents stage only their own files.
   **Why:** it's harmless, and fixing it would mean rewriting history on `main`.
6. **Situation:** step 4 (battle core: damage, materials, movement) is the most intricate part of the engine.
   **Decision:** assigned it to an opus agent instead of sonnet, running in its own worktree alongside step 3 (sonnet).
   **Why:** subtle rule interactions call for a stronger model and a clean context.
7. **Situation:** agent worktrees branch from `origin/main`, which was behind, so step 3 started from the skeleton and had to fast-forward itself. Also, Biome scanned the nested worktrees under `.claude/worktrees/` and failed `pnpm check` on `main`.
   **Decision:** added `.claude/worktrees` to `.gitignore` (Biome honours it), and now push `main` before spawning worktree agents.
   **Why:** keeps the gate green, and parallel agents start from current code.
8. **Situation:** the UI plan (opus) invented 17 UX decisions.
   **Decision:** accepted them all. The ones you might have a view on:
   - Full Into the Breach-style outcome previews before confirming. Interaction names stay hidden until discovered.
   - Tap the same aim again to confirm.
   - Tap a placed rune to rotate it. Long-press or Erase mode removes it.
   - The shelf shows unowned runes as `???`.
   - The Study is locked while a trip is active.
   - You can't retreat mid-fight.
   - Light parchment theme only, no dark mode.
   - Save export/import as text in the Study menu.
   - Dev-only `__game.debug.forceWin()` for verification.
   **Why:** all of them fit the pillars (readable danger, visible unknowns). Any of them is easy to change after you play.
9. **Situation:** the UI steps all need the single browser pane and dev-server port to verify.
   **Decision:** UI steps run one at a time on `main`, and engine steps keep running in parallel worktrees.
   **Why:** avoids agents fighting over the browser and port 5173.
10. **Situation:** step 4 filled gaps: all legality checks sit in `isLegal`; a member re-placed in the Lab keeps its spells; a plate removes a vent; HP above max raises max; rat oil trails reuse the Oil rune's logic, so nearby fire spreads into them.
    **Decision:** accepted all of these.
    **Why:** they're consistent with §9.5 and keep the rules in one place.
11. **Situation:** step 5 (casting, triggers, echo) is the heart of the combo system, and its expected logs are the spec.
    **Decision:** opus implements step 5, sonnet implements step 6 (AI and turns), both in parallel worktrees. Where a planned log line turns out to be wrong, the agent fixes the test and reports it.
    **Why:** casting has the most subtle interactions. The AI is more mechanical.
12. **Situation:** step 6 (AI and turns) filled gaps:
    - A rat with no reachable target stays put.
    - An enemy killed by its own burning oil trail doesn't telegraph.
    - Spit inks after its damage, so it never gets the inked +1.
    - A vent refills right after its steam fades, which logs two lines.
    - Waiting enemies take no order number.
    **Decision:** accepted all of these.
    **Why:** readable and deterministic. The double vent line is cosmetic and gets revisited if the log feels noisy.
13. **Situation:** the plan's S1 scenario gave the Stoker `Bolt^ Spark`, which can't work: the flow leaves upward and never reaches the Spark.
    **Decision:** the step 5 agent moved Spark above the Bolt. The expected log was unchanged and passes.
    **Why:** a plan typo. The flow rules are right.
14. **Situation:** a few chain tests would end with "The party wins" once the last enemy died.
    **Decision:** gave those tests an extra dummy or more enemy HP.
    **Why:** keeps each test focused on its chain.
