# Plan template for the `implement` skill

A plan is `docs/plans/<feature>-plan.md`. It states **goals, not keystrokes**: 120–220 lines. A planner reads AGENTS.md, the design doc(s) and the code needed to judge feasibility, writes only the plan file, and does not commit. Design wins over the plan; where the design looks wrong or unbuildable, say so as a Proposal or a question.

For a program of several plans, add one boundary file (which plan owns which system, the contracts between plans, the order) and give every plan a task-ID prefix (`DK-1`, `HC-2`).

## Sections

1. **Header.** Title, design link, roadmap ID, `State: Drafted`, one-line scope. Keep `State:` true as the build moves (Building, Built, Done).
2. **Scope and settled rules.** What this build delivers and what it leaves out, citing the design instead of copying it.
3. **Proposals.** Every decision the plan makes that the design does not, with the reason. Mark a change to an earlier decision **Redefines: …** so it goes to the player.
4. **Current implementation and risks.** Short, from the real code: name the modules and functions checked. Name the riskiest unknown and the task that settles it; that task goes first.
5. **Contracts.** *Provides* (names and semantics other work uses) and *Consumes* (from which plan and task). List everything a contract **leaves for later tasks to fill** ("each district registers X"): these become the status file's Owed list.
6. **Packs.** The table below.
7. **Verification.** Which scenario tests, fuzz or bot checks and phone states prove the feature, and what is checked only at Close.
8. **Open questions for the player.** Only what a Proposal cannot settle.
9. **Execution notes.** Critical path, what runs in parallel, rough total size.

## The pack table

A pack is one agent run: two to four tasks in the same files, in sequence. Packs that may run at the same time own disjoint files.

```markdown
### Pack A: <name> (role: Default | Fast | Strong; engine | UI; depends on: <packs or task IDs>)
Owns: <files and directories>
Pattern: <the nearest finished example to copy>

| ID | Goal | Size | Done when |
|---|---|---|---|
| XX-1 | <one sentence> | S/M/L | tests `<name>`, `<name>` pass; <other observable result> |
| XX-2 | … | | |
```

Rules for the table:

- **Wave 0 is Pack 0:** types, contracts, stubs, no behaviour change. For engine work it also writes the later packs' acceptance tests as `it.fails` / `it.todo`, named by task ID; the "Done when" cells of later tasks then name those tests.
- **UI tasks** give "Done when" as states to show: screen, data fixture, light or dark, and what must be visible. Mark a task **phone check** only when it adds a new interaction; pattern-following screens are checked per wave by the orchestrator.
- **No balance targets** (win rates, bands) in "Done when" unless the project allows tuning during the build. Use: the room or data validator passes, a scripted solve exists, fuzz finds no throw.
- **Sizes:** S ≈ one focused change, M ≈ several related changes, L ≈ split it if you can. A pack should total no more than about one L.
- **Gates** (a playtest, a go/no-go) get their own ID ending in `-G<n>` and a row saying who decides and on what evidence. A gate that could change the plan sits as early as its evidence allows.
- **Close** is the last pack and belongs to the orchestrator: full gate, full-loop phone check, code review, design and tech log rows, ledger clean.
