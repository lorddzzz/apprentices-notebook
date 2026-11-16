# Build program: briefs for the packs not started yet

Spawn `pack-worker` with the role's model and effort and paste one brief as written ([templates](../../.claude/skills/implement/templates.md)). Delete a brief when its pack merges. A routine window runs these; a design window writes the next ones (listed at the end). Written in the design windows of 2026-11-12e (the cartographers' Packs G and H) and 2026-11-16 (Packs S, T, U, V and CG-J; CG-G and CG-H amended). The decisions behind them: DESIGN §11 and TECH §7, 2026-11-16.

## Order for the routine windows

A pack starts when the packs in its "Starts when" are merged. Run two or three at a time; packs on one row own disjoint files. Only CG-G runs `tests/sim` (its own new file).

| Wave | Packs (together) | Starts when |
|---|---|---|
| 19 | **S** paper fixes · **T** `LineId` · **CG-G** room wiring, hearing, bench, fuzz | now (CG-F merged 3062b50) |
| 20 | **CG-H** board art · **CG-J** cartographers footnotes · **U** goldens and stamps | CG-H: S · CG-J: S · U: T |
| 21 | **V** Afterglow and Seam unit margins | V: U |

File clashes that set this order:
- **`src/data/types.ts`:** T narrows `LineId` before any pack adds a `Meets` member; U adds `'diagonal'` after it. Every pack that edits this file runs `pnpm exec tsc --noEmit` (`check:fast` does not, unless T adds it).
- **`src/engine/solvents.ts`:** S (`undoBoard`'s guard) before CG-J (the Quicksilver and Graphite variants). **`src/engine/mix.ts`:** U (the two stamps) before V (the variants). **`src/engine/districts/cartographers/types.ts`:** S declares `GuildHandState.circles`; CG-H draws it, CG-J writes it.
- **Shared by named parts (a conflict is "keep both sides"):** `src/data/lines.ts` (U: the EN-9 mender and FN-M2 blocks; CG-J: the CG block), `tests/districts/cartographers/acceptance.test.ts` (each CG pack its own `it.todo` lines), `tests/rivals/registrar.test.ts` (CG-J: the `note` assertion; CG-G: the heart and wipe tests), `tests/scenarios/cartographers-lines.test.ts` (S: the Graphite test; CG-J: the `swap:unit` test).
- **`tests/data/footnotes.test.ts`'s count:** CG-J (+33) and V (+16) each change it; on a conflict the orchestrator adds both deltas.

Every brief's "Leaves for later" items are also in the status file's Owed list. Plan §7 open questions of the cartographers are held at their defaults (DESIGN §11, 2026-11-12e).

## Close-outs (platform-closure Pack N; orchestrator, not a pack-worker run)

Platform-closure Pack N (CL-1 → CL-5) runs last, by the orchestrator in a design window, after every pack above and the tracks that finish the built plans: DESIGN §11 and TECH §7 rows for FD, DK, RV, FN, SM, IQ (write only the missing ones), the five verification files (SM-15 among them), five `code-review` runs, records and the ledger, full `pnpm check`.

## Written in a later design window

| Pack | Tasks | Starts when |
|---|---|---|
| EN-G0 | go/no-go on D5's report (EN-S2) and the player's phone timings on its dev page; limits in `src/data/tuning.ts` | the player's timings in |
| EN E… | ending Packs E–L briefs (E needs EN-G0 go and MIX-1, merged) | EN-G0 |
| CL | platform-closure Pack N | the end |
