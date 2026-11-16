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

## Pack CG-H: board art and playback (Default: Sonnet medium; UI)

Starts when CG-D and S are merged (all pieces, foes and both kinds of circle exist).

```
Pack H of docs/plans/cartographers-plan.md: task CG-12.

Read: cartographers-plan.md §5 Pack H and §3 risk (2); pattern: src/ui/districts/foundry/ (registry slots, pieces,
fx, highlights) and src/ui/screens/galleryFixtures.ts.
Own: src/ui/districts/cartographers/ (CG-W0's empty module), the hall's Gallery fixture in galleryFixtures.ts.
Contract: everything through the KIT-R2 slots (`unitArt`, `fx`, `boardLayers`, `describe`, highlights); no board
component is edited. Pencil (graphite hatching), blank (the page's paper colour with a torn edge), fate marks (ink
blot / eraser smudge with the due round), outlines (dashed foe silhouette), circles with a holder line, the Tracer's
tether, the three hands' tokens, the six events' animations, "Next round" overlay entries. Circles come from two
sources, drawn by one layer: the Registrar's (his trick's shown mark and state, holder a guild hand or himself) and
the household's (`GuildHandState.circles`, declared by Pack S and written by CG-J for the Registrar's note; holder a
party member); a Gallery fixture shows one of each. Svelte 5 runes only; the autofixer clean on every component.
Done when: a Gallery sheet in light with every piece, mark and foe legible in greyscale (the BF-1 method);
Combat at 375×812 on a 7×9 room showing fates, an outline, a Surveyor telegraph and the Registrar's circles with
holder lines; screenshots in the report. (There is no dark theme: DESIGN §11, 2026-11-12.)

Verify: `pnpm check:fast`
Phone check: yes, port 5191.
```

## Pack CG-J: the cartographers' footnotes (Default: Sonnet medium; escalate to Sonnet high)

Starts when S is merged (solvents.ts, the `circles` field, cartographers-lines.test.ts). CG-G3 approved the draft
2026-11-16 with amendments (DESIGN §11; cartographers.md §8).

```
Pack J of docs/plans/cartographers-plan.md: tasks CG-F3 → CG-F4.

Read: docs/design/footnotes-content/cartographers.md (the approved spec: sections 2–4 as amended, and 8);
footnotes-audit.md §13 (Z4: the stamp site); pattern: src/data/footnotes/foundry.ts with
tests/scenarios/footnotes/foundry-{runes,solvents}.test.ts (fourCombos, the note test), and `note` in
src/data/rivals/postmaster.ts.
Own:
- src/data/footnotes/cartographers.ts (new), src/data/footnotes/index.ts (one line), the CG block of src/data/lines.ts
  (`swap:unit` loses `pending`, text unchanged), src/data/rivals/registrar.ts (`note` only).
- Variant sites: src/engine/runes/actions.ts (`swap`, `draw`/`drawHop`, `erase`: the stamp and the variant reads),
  src/engine/districts/cartographers/paper.ts (`carryPaper` new, `undrawPencil`, `pencilStruck`),
  src/engine/districts/cartographers/guildHand.ts (the note's circles in the round-end step; an ink helper export if
  `swap-unit-ink` needs one), src/engine/districts/cartographers/types.ts (reading `GuildHandState.circles`),
  src/engine/solvents.ts (`quicksilver.widen`, `graphite.after`, `boardNow`, `undoBoard`), src/engine/jars.ts (one
  export only, if `draw-jar-claim` needs the jar-limit check).
- Tests: tests/scenarios/footnotes/cartographers-{runes,solvents}.test.ts (new), tests/scenarios/cartographers-lines.test.ts
  (the `swap:unit` `fires` test and the `PENDING` list only), tests/rivals/registrar.test.ts (the `note` assertion
  only), tests/districts/cartographers/acceptance.test.ts (CG-F3/CG-F4 `it.todo` lines only),
  tests/data/footnotes.test.ts (the count only).
Contract (on main: Packs I and D; Pack S's `circles` field and Graphite guard):
- Ids, slots and text exactly as cartographers.md sections 2–4: 42 variants (Swap, Draw and Erase 10 each,
  Quicksilver and Graphite 6 each, capstones included) on `swap:held`, `swap:unit`, `draw:jar`, `draw:drop`,
  `erase:unit`, `erase:mark`, `quicksilver:edge`, `graphite:unit` (levels 1 and 2) and the capstone slots; the
  amended ones are `swap-unit-due` and `graphite-cap-pin`. Plus the Registrar's note: id `registrar:swap`, subject
  `swap`, slot `{ line: 'swap:unit', level: 2 }`, `rival: 'registrar'`, credit "Copied from the Registrar's
  register."; `REGISTRAR_PAGE.note` = `{ rune: 'swap', line: 'swap:unit', variant: 'registrar:swap' }`.
- CG-F3 first stamps `swap:unit` (Owed from CG-I): in `runes/actions.ts::swap`, the `swapped` event is emitted under
  `withLine(ctx, 'swap:unit', …)` when either unit's tile, before or after, holds pencil; drop the row's `pending`,
  the test's `it.fails` and `swap:unit` from `PENDING`. Behaviour unchanged.
- `draw-cap-mix` re-lands a carried plain state through mix.ts's exported `landOnTile` (its kind from the state id,
  as `undoBoard` reads `PLAIN_KIND`); a carried compound onto a state is refused as today. No edit to mix.ts.
- The note (CG-F4): after a swap stamped `swap:unit`, when the foe of the pair stands on pencil, append
  `{ at, unit, holder: <caster id> }` to `GuildHandState.circles` and emit `cartographers:circled` (`holder`,
  `units`). The guild's hand's round-end step, before the fates, erases each foe still on its circled tile through
  `removeFromRoom(…, 'erased')` (event `cartographers:struck`), skips a circle whose foe moved off or whose holder is
  not alive, then omits `circles`. CG-H draws `circles`; no UI edit here.
- No new event types, `Meets` values or lines. Plain behaviour (no variant written) is unchanged: goldens, fixtures
  and every existing cartographers, rival and scenario test pass as they are. If a variant proves heavier than its
  sketch, swap that one for one that reads only existing state and say so (as F7 in BF-J).
Owed by this pack: "From CG-I: CG-F3 stamps `swap:unit` …"; "From CG-D: his page note is null (CG-F4)". Leaves for
later: the note's strength with `swap-unit-strand` is a CAL watch item.

Done when:
- CG-F3: "CG-F3: fourCombos reads for every margin line" (Swap, with `swap:unit`'s six combinations including the
  note, Draw, Erase), "CG-F3: one scenario per capstone", one scenario per level I/II variant named
  "<variant id>: …", and "CG-F1: swap:unit fires when a Swap trades places across pencil" un-marked pass.
- CG-F4: "CG-F4: fourCombos reads for every margin line" (Quicksilver, Graphite), "CG-F4: one scenario per
  capstone", one scenario per variant, "CG-F4: the registrar's note is hidden until his page is held" (hidden, then
  offered on `swap:unit` level II, then credited) and "registrar:swap: a circled foe still on pencil at round end is
  erased; one that steps off is not" pass.
- tests/data/footnotes.test.ts passes with only its count changed (+33); tests/data/lines.test.ts, tests/rivals,
  tests/districts/cartographers and tests/engine pass unchanged otherwise; `git status tests/fixtures` is clean.

Verify: `pnpm vitest run tests/scenarios tests/data tests/rivals tests/districts/cartographers tests/engine --reporter=dot`
Phone check: no (the orchestrator checks at the wave's end that the Swap margin offers the note at level II once the page is held).
```

## Close-outs (platform-closure Pack N; orchestrator, not a pack-worker run)

Platform-closure Pack N (CL-1 → CL-5) runs last, by the orchestrator in a design window, after every pack above and the tracks that finish the built plans: DESIGN §11 and TECH §7 rows for FD, DK, RV, FN, SM, IQ (write only the missing ones), the five verification files (SM-15 among them), five `code-review` runs, records and the ledger, full `pnpm check`.

## Written in a later design window

| Pack | Tasks | Starts when |
|---|---|---|
| EN-G0 | go/no-go on D5's report (EN-S2) and the player's phone timings on its dev page; limits in `src/data/tuning.ts` | the player's timings in |
| EN E… | ending Packs E–L briefs (E needs EN-G0 go and MIX-1, merged) | EN-G0 |
| CL | platform-closure Pack N | the end |
