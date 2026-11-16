# Build program: briefs for the packs not started yet

Spawn `pack-worker` with the role's model and effort and paste one brief as written ([templates](../../.claude/skills/implement/templates.md)). Delete a brief when its pack merges. A routine window runs these; a design window writes the next ones (listed at the end). Written in the design window of 2026-11-16 (the cartographers' Close: Packs W and CG-K). The decisions behind them: DESIGN §11 and TECH §7, 2026-11-16 (Close).

## Order for the routine windows

A pack starts when the packs in its "Starts when" are merged. Run two or three at a time; packs on one row own disjoint files.

| Wave | Packs (together) | Starts when |
|---|---|---|
| 22 | **W** review fixes (strikes, Erase, collapse, Rivet, page copy) · **CG-K** the hall joins `PLAYABLE_DISTRICTS`, *the bad join* filed | now (main 01761c5 + this window's docs) |

File clashes: none between W and CG-K (W owns engine and app files, CG-K owns `src/data/districts/index.ts`, the cartographers' lore and the save fixtures). Only CG-K runs `tests/sim` (the hall fuzz, because it opens a district).

Every brief's "Leaves for later" items are also in the status file's Owed list. Plan §7 open questions of the cartographers are held at their defaults (DESIGN §11, 2026-11-12e).

## Pack W: review fixes from the cartographers' Close (Default: Sonnet 5.5 medium)

Starts now. The one `code-review` of 5e4a85e..01761c5 (src/) found these; each is traced to its file below. Split in two runs (FX-1 → FX-3, then FX-4 → FX-5) if usage is tight.

```
Pack W of docs/plans/build-program-briefs.md (review fixes): tasks FX-1 → FX-2 → FX-3 → FX-4 → FX-5.

Read: DESIGN §11 2026-11-16 (Close) row; src/engine/districts/foundry/types.ts invariant P2; TECH §7 2026-11-16
(Close) row. Pattern: tests/districts/cartographers/shove.test.ts (struckBy), tests/scenarios/footnotes/*.test.ts.
Own: src/engine/pieces.ts (`strikePiece`), src/engine/districts/foundry/ring.ts (`BELL_TRIGGERS`,
`GREAT_BELL_TRIGGERS` only), src/engine/districts/bridges/types.ts (`WEARS` only),
src/engine/runes/actions.ts (`eraseAt`, `holdUnit`'s riveted clear only), src/engine/districts/bridges/collapse.ts
(`collapseOnce`'s `next` only), src/engine/solvents.ts (`rivetHold` only), src/engine/exposed.ts, src/engine/types.ts
(one optional `Unit` field), src/engine/turn.ts (the `held--` line only), src/data/codex.ts (`RIVAL_TRICK_TEXT`),
src/ui/screens/Study.svelte (`doneCaption` only), src/app/study.ts (a caption helper, if you add one),
tests/districts/review-fixes-w.test.ts (new), tests/app/codex-rivals.test.ts (one test).
Contract (on main 01761c5):
- FX-1 (CG-3 regression; findings 3-5): `strikePiece(ctx, at, by)` calls `onStruck` only when the piece's
  `struckBy` is absent or includes `by`, and returns false otherwise (same test as `strikable`). Bells and great
  bells declare `struckBy: ['damage', 'push', 'spark', 'shove', 'burst']` (foundry P2 plus the bursts that strike
  them today; never 'erase'); the bridges' `WEARS` declares `struckBy: ['push', 'burst', 'shove']` (Shove stays
  legal at a span: saves replay recorded Shoves). Effects: an Erase no longer rings a bell; `eraseAt`'s `answers`
  is false on a bell or span, so `erase-cap-salvage` clears its state and jar and `erase-cap-through` goes on past
  it; a Spark on bare pencil reports no piece answered, so `spark-cap-arc` arcs.
- FX-2: `erase-mark-clean` passes the Erase's `parts` (not a throwaway `[]`) to `eraseMark` for the neighbours, so
  a restore (`eraseRestores`, the erased student) puts their marks back too.
- FX-3 (bridges, BR-19c): `collapseOnce` builds `next` from the bridges rule state as `replayFallen` left it
  (re-read `ctx.s.rules[COLLAPSE_RULE_ID]` when present, as `fallenBrass` already is), then deletes the fallen keys;
  wear and cuts a replayed Brink rest wrote are kept.
- FX-4 (foundry, BF-F3): `rivet-unit-anvil` reads who held the unit, not `holds === 0`. `rivetHold` sets
  `u.riveted = true` when its hold lands and the variant is written (absent otherwise, so saves and goldens are
  unchanged); it is deleted when `held` reaches 0 (turn.ts and actions.ts:404's decrement). `exposedStep`'s third
  term reads `unit.riveted === true`; the order and "never stacks" stay.
- FX-5 (copy): `RIVAL_TRICK_TEXT` gains the four missing tricks (`bathhouses:steamsAway`,
  `bridges:keystoneRight`, `foundry:playsATune`, `cartographers:strikeFromTheRegister`), named and worded as their
  design docs (rivals.md and each district doc) name them, each ending "His alone, not in the trial." as the two
  existing ones do; the codex Pages tab showed the raw id. The doorway's Done caption reads "On to <next room's
  name>" when the doorway was opened by a *Through the doorway* choice (the test `applyDoorway` uses:
  `kit.choices.some((c) => c.after >= encounter)`), else "Back to the spoils, with the new pages".
Owed by this pack: nothing.

Done when: "FX-1: erase on a bell lifts its cloud and rings nothing", "FX-1: erase-cap-salvage clears a state on a
bell tile", "FX-1: spark-cap-arc arcs from bare pencil", "FX-1: a basic Shove at a span is still legal",
"FX-2: erase-mark-clean's neighbour marks come back on a restore", "FX-3: a replayed Brink rest keeps the span
wear it caused", "FX-4: a foe held by Hold or graphite-cap-pin takes no rivet:unit step", "FX-4: a riveted foe
takes the step until its hold runs out", "FX-5: every rival's trick has page text" pass; every existing test passes
unchanged (a changed test is a Proposal in the report); autofixer clean on Study.svelte.

Verify: `pnpm vitest run tests/districts tests/scenarios tests/engine tests/app tests/data tests/rivals --reporter=dot` and `pnpm exec tsc --noEmit`
Phone check: yes, port 5190: the doorway after *Through the doorway* (dev "open all", the hall, three forced wins
with `window.__game.debug.forceWin()`), and the codex Pages tab with a held rival page.
```

## Close-outs (platform-closure Pack N; orchestrator, not a pack-worker run)

Platform-closure Pack N (CL-1 → CL-5) runs last, by the orchestrator in a design window, after every pack above and the tracks that finish the built plans: DESIGN §11 and TECH §7 rows for FD, DK, RV, FN, SM, IQ (write only the missing ones), the five verification files (SM-15 among them), five `code-review` runs, records and the ledger, full `pnpm check`.

## Written in a later design window

| Pack | Tasks | Starts when |
|---|---|---|
| EN-G0 | go/no-go on D5's report (EN-S2) and the player's phone timings on its dev page; limits in `src/data/tuning.ts` | the player's timings in |
| EN E… | ending Packs E–L briefs (E needs EN-G0 go and MIX-1, merged) | EN-G0 |
| CL | platform-closure Pack N | the end |
