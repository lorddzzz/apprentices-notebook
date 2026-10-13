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
15. **Situation:** the engine emits no "projectile travels" event for a Bolt that hits a unit, so the board only shows a cast pulse.
    **Decision:** left it for now. U4 can draw a trail from the cast aim if it looks flat.
    **Why:** this is cosmetic, and adding a new engine event would ripple through every expected log.
16. **Situation:** step 7 (run layer) filled gaps:
    - `pickLoot` removes the picked offer, which keeps the heart's 2 picks distinct.
    - Loading a save tolerates a lattice that over-spends ink but rejects a structurally broken one.
    - `rollOffers` takes the encounter index explicitly.
    **Decision:** accepted all three. DESIGN.md §9.5 now has an "Engine interpretations" block and a §11 row.
    **Why:** consistent with the plan, and recorded where you'll read it.
17. **Situation:** the engine was complete (294 tests), but every test was hand-written, so a simple strategy could still break it, and nobody knew if the encounters are winnable.
    **Decision:** a haiku agent fuzzes full trips with a random bot and a greedy bot. It checks invariants and reports win rates per encounter. The fixes are decided afterwards.
    **Why:** this catches crashes and balance holes before you play.
18. **Situation:** U4 (battle input, previews, playback integration) decides how the game feels in your hand.
    **Decision:** gave it to opus instead of sonnet. It also has to report anything that felt awkward in play.
    **Why:** UX judgement matters more here than in any other step.
19. **Situation:** the session hit its usage limit. U4 (opus) was cut off before writing any files, and the fuzz agent (haiku) finished its harness but not its report.
    **Decision:** I ran the fuzz harness myself and kept it as a regression test: 6 seeds in `pnpm check`, 200 seeds with `pnpm fuzz`. U4 restarts once the fix below lands.
    **Why:** no work was lost, and the harness is worth keeping.
20. **Situation:** the fuzz run (200 trips per bot) found no invariant violations, no illegal-action errors and no replay mismatches. It did find a **softlock**: a member walled in by its own Brass-rune plates means rats wait forever and Bolts can't get out.
    **Decision:** plates raised by the Brass rune crumble after 3 rounds. Layout plates stay permanent.
    **Why:** this answers DESIGN's open "does terrain decay?" question in the narrowest way, and it removes the softlock without adding a forfeit button.
21. **Situation (balance flag):** a greedy bot that never dodges intents wins encounter 1 98% of the time, encounter 2 30%, encounter 3 24% and the heart 0%. Starting each encounter at full HP, it wins the heart 21% of the time. A random bot almost always wipes.
    **Decision:** no tuning yet.
    **Why:** the bot ignores telegraphs, shoves and Ward, which are exactly what a human uses. Your playtest should decide whether the familiar fight is too hard. If it is, the first knobs are rat count and party HP in `src/data/`.
22. **Situation:** U4 (battle interaction) landed. Its agent made several calls:
    - A spell with a single legal aim jumps straight to the preview.
    - Tapping the selected member again deselects it.
    - End turn stays armed until any other input, with no timeout.
    - Attacks that steam or a plate will stop are drawn dashed.
    - Tiles a spell will change get dashed outlines in the material's colour.
    **Decision:** accepted all of these, and they're recorded in DESIGN §11 and TECH §7. Open feel notes for you: the ~1.5 s intro playback on every Lab load gets repetitive, small Lab boards leave a lot of empty space, and you should judge whether the Bolt aim chevrons read clearly.
    **Why:** these are judgement calls, which is what your playtest is for.
23. **Situation:** you asked me to watch usage. After U4, the 5-hour window was at 35%.
    **Decision:** reordered the remaining work to U6 (Study, Codex, saves), then U7 (the expedition, which makes v0 playable end to end), then U5 (Lab power tools). They run on sonnet, with opus held back for fixes. The plans and a resume file (`docs/v0-status.md`) are in the repo. Above 80% usage, agents wrap up and write state.
    **Why:** a playable game first; Lab tools are a bonus.
24. **Situation:** U6 (Study, Codex, saves) landed. Its agent made several calls:
    - The Study menu has Visit the Lab, Copy save, and Paste save. Paste uses a text box with a "Replace my save" button, because clipboard reads are unreliable on iOS.
    - A corrupt save is kept as a backup and a new game starts, with a warning toast.
    - The Lab uses your own lattices when a scenario doesn't define them.
    **Decision:** accepted all of these. The Svelte autofixer crashes on `game.svelte.ts`, so that file is only typechecked and linted.
    **Why:** this is the safest way to handle saves on iOS.
25. **Situation:** U7 (expedition flow) landed, so v0 is playable end to end and deployed. Its agent made several calls:
    - A reload on the Wiped screen lands in the Study; the loot is already lost.
    - The top bar shows "Depth n / 4".
    - The door now reads "Set out into the Seam".
    It also caught and fixed a bug where taking loot crashed.
    **Decision:** accepted all of these. Feel note: on encounter 1's first turn the rats are too far away to declare intents (round 1 enemies don't move), so the opening turn shows no danger. Worth judging when you play.
    **Why:** these are minor and reversible.
26. **Situation:** usage was at 55%, with the Lab tools (U5) still unbuilt.
    **Decision:** a haiku agent does a real playthrough first (no debug shortcuts). U5 waits for the remaining budget.
    **Why:** bugs in the main loop matter more than Lab power tools.
27. **Situation:** the haiku playthrough won encounter 1 in 4 rounds with no damage. It killed the familiar and two rats in encounter 2 before stopping. It reported "Study tabs swapped" as high severity.
    **Decision:** I checked it myself and it isn't a bug: the data and `aria-selected` are right. The tester had admitted to misclicks. The real issue is that the unselected tab has a bright outline and looks selected, so that styling gets fixed. Along with U5 (Lab tools), a sonnet agent also fixes the Shove button looking active while aiming, the End-turn warning showing when nobody can act, the wording of the research-loot offer, and the cramped Lab layout.
    **Why:** these are cheap fixes for real confusions.
28. **Situation:** the tester accidentally fired a Bolt by tapping the aimed line a second time ("tap again to confirm"), which wasted a charge. Enemy intents (hatching, order badges) have no legend.
    **Decision:** no change yet. Into the Breach uses the same double-tap, and the preview shows exactly what will happen.
    **Why:** this is your call when you play. The options are confirm-button-only, or an "undo cast" (cheap, since the engine is pure).
29. **Situation:** U5 (Lab tools) and the polish fixes landed. The agent couldn't reproduce two of the QA reports (the gold Shove outline, and a Lab title covering the board). It made the button state structural anyway and fixed what it could see (caption wrapping, HP text placement).
    **Decision:** accepted.
30. **Situation:** after all planned steps, the 5-hour usage window was at 70%.
    **Decision:** stopped here instead of running an opus code-review pass. The next session can run `/code-review` if wanted.
    **Why:** your 80% safety line. v0 is complete, green (442 tests) and deployed.
31. **Situation:** you asked for a code review before feedback. A review of `src/` found six things. Three affect play:
    - A reload mid-fight restarted the encounter. iOS evicting the app, or the auto-update after a deploy, lost the fight. And reloading on the "lost" screen escaped the wipe with all loot kept.
    - While confirming a Bolt, tapping any tile further along its line fired it (the wasted charge in #28).
    - A member could undo a move after the other member had acted, which could duplicate an ink puddle.
    **Decision:** fixed all three. Fights now resume after a reload (the save records each action). Only a second tap on the *same* tile confirms. Any cast or shove ends pending undos. The rest: save import refuses trip states that would soft-lock, dead save helpers were removed, and Lab enemy ids are parsed safely.
    **Why:** these are bugs, not feel. The double-tap itself stays as it was; whether you want a Confirm-only or an undo-cast is still your call.

32. **Situation:** playtest 1 feedback. You couldn't tell how runes in one spell connect, spark's rules with brass and steam were unclear, unit traits were hidden, and charges ran low after fight 2.
    **Decision:** built v0.1:
    - The Study writes the focused spell out as numbered steps, with the reactions it causes ("→ the oil ignites"). The same numbers sit on the lattice runes, which also shows Fork order.
    - A step laid after the last Spark says the spark won't reach it.
    - Reactions you haven't discovered show as "something happens with the oil (not in your notebook yet)", so the connection is visible but the name stays a discovery.
    - Tapping a unit now spells out its traits. Oil-soaked units get an oil-drop badge. The party strip shows affinity.
    - Charges went up to Bolt 5, Splash 3, Ward 3.
    **Why:** your choices in the design round. Watch whether the hinted, unnamed reactions are clear enough, or whether you'd rather see names from the start.
