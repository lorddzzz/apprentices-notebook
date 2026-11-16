# Build program: briefs for the packs not started yet

Spawn `pack-worker` with the role's model and effort and paste one brief as written ([templates](../../.claude/skills/implement/templates.md)). Delete a brief when its pack merges. A routine window runs these; a design window writes the next ones (listed at the end). Written in the design windows of 2026-11-12e (the cartographers' Packs F–H) and 2026-11-16 (Packs S, T, U, V and CG-J; CG-G and CG-H amended). The decisions behind them: DESIGN §11 and TECH §7, 2026-11-16.

## Order for the routine windows

A pack starts when the packs in its "Starts when" are merged. Run two or three at a time; packs on one row own disjoint files. Only CG-G runs `tests/sim` (its own new file).

| Wave | Packs (together) | Starts when |
|---|---|---|
| 18 | **CG-F** rooms (running) | |
| 19 | **S** paper fixes · **T** `LineId` | now (beside CG-F) |
| 20 | **CG-H** board art · **CG-J** cartographers footnotes · **U** goldens and stamps | CG-H: S · CG-J: S · U: T |
| 21 | **CG-G** doorway, hearing, bench, fuzz · **V** Afterglow and Seam unit margins | CG-G: CG-F · V: U |

File clashes that set this order:
- **`src/data/types.ts`:** T narrows `LineId` before any pack adds a `Meets` member; U adds `'diagonal'` after it. Every pack that edits this file runs `pnpm exec tsc --noEmit` (`check:fast` does not, unless T adds it).
- **`src/engine/solvents.ts`:** S (`undoBoard`'s guard) before CG-J (the Quicksilver and Graphite variants). **`src/engine/mix.ts`:** U (the two stamps) before V (the variants). **`src/engine/districts/cartographers/types.ts`:** S declares `GuildHandState.circles`; CG-H draws it, CG-J writes it.
- **Shared by named parts (a conflict is "keep both sides"):** `src/data/lines.ts` (U: the EN-9 mender and FN-M2 blocks; CG-J: the CG block), `tests/districts/cartographers/acceptance.test.ts` (each CG pack its own `it.todo` lines), `tests/rivals/registrar.test.ts` (CG-J: the `note` assertion; CG-G: the heart and wipe tests), `tests/scenarios/cartographers-lines.test.ts` (S: the Graphite test; CG-J: the `swap:unit` test).
- **`tests/data/footnotes.test.ts`'s count:** CG-J (+33) and V (+16) each change it; on a conflict the orchestrator adds both deltas.

Every brief's "Leaves for later" items are also in the status file's Owed list. Plan §7 open questions of the cartographers are held at their defaults (DESIGN §11, 2026-11-12e).

## Pack CG-F: rooms (Default: Sonnet medium)

Starts when CG-B, CG-C, CG-D and CG-E are merged.

```
Pack F of docs/plans/cartographers-plan.md: tasks CG-9 → CG-10.

Read: cartographers-plan.md §2 P4, P13, P17 and §5 Pack F; docs/design/district-cartographers.md §0 "Place" (academy
rooms: lecture theatre, drafting benches, registry, back hall); pattern: the foundry's room data
(`rooms` in src/data/districts/foundry.ts) and tests/data/foundry-rooms.test.ts, `checkRoom` in src/engine/rooms.ts.
Own: src/data/districts/cartographers/rooms.ts (new), src/data/districts/cartographers.ts (`rooms` only),
src/engine/districts/cartographers/heartFrame.ts (new), src/engine/districts/cartographers.ts (`heart`, `bot` lines),
tests/data/cartographers-rooms.test.ts (new), tests/districts/cartographers/acceptance.test.ts (CG-9, CG-10 lines).
Contract (on main: pieces, hand, hands, Registrar, trip):
- Six encounters: rooms 1–3 (three layouts each, 7×9 at most, pencil config per room, Surveyor/Eraser/Tracer mixes,
  `redraw: 0`), rooms 4–5 (three layouts each, `redraw` 1–2, outlines), the heart room (three layouts, the Registrar;
  a return point). Academy names on every room. Numbers are first guesses for CAL.
- `heart` through `frame.ts`'s `placeFrame`, salt 7160 (Owed from CW0); `bot` terms as the bathhouses' `BotTerms`.
- The district stays `gate: 'drawing'` (CG-14 flips it).
Owed by this pack: CW0's "`heart` frame (salt 7160) and `bot` at CG-10"; EF's "the Registrar joins the masters at CG-10".

Done when: "CG-9: checkRoom passes for every room 1-3 layout at party sizes 1-3", "CG-9: a scripted solve exists for
every room 1-3 layout", "CG-10: checkRoom passes for every room 4-5 and heart layout", "CG-10: a scripted solve exists
for every deep layout", "CG-10: the heart room is a return point" and tests/districts/heart-frames.test.ts (the
cartographers' row) pass.

Verify: `pnpm vitest run tests/data tests/districts --reporter=dot`
Phone check: no.
```

## Pack S: paper fixes (Default: Sonnet medium; escalate to Sonnet high)

Starts now (beside CG-F: no shared file).

```
Tasks CG-3b (status "Needs design review": Pencil Shove) → CG-F1b (footnotes-audit §13 Gr3, Proposal Z3); decided
in DESIGN §11 and TECH §7, 2026-11-16.

Read: docs/plans/footnotes-audit.md §13 (Gr3 and Z3); TECH.md §7 row 2026-11-16 ("Piece strike kinds"); pattern:
`strikable` and `pieceHoldsNothing` in src/engine/pieces.ts, tests/districts/cartographers/paper.test.ts.
Own: src/engine/districts/types.ts (`PieceTriggers.struckBy` only), src/engine/pieces.ts (`strikable`),
src/engine/districts/cartographers/pieces.ts (the PENCIL and OUTLINE triggers), src/engine/districts/cartographers/types.ts
(the `circles` declaration below only), src/engine/solvents.ts (`undoBoard`'s state restore only),
tests/districts/cartographers/shove.test.ts (new), tests/scenarios/cartographers-lines.test.ts (the Graphite test only).
Contract (on main):
- CG-3b: `PieceTriggers` gains `struckBy?: readonly StruckBy[]`, the kinds `onStruck` answers; absent = every kind
  (bells, spans and the fixture district stay as they are). `strikable(t, kit = KIT, by: StruckBy = 'shove')` is true
  only when the piece has `onStruck` and `struckBy` is absent or includes `by`; its only caller is basic Shove's
  `check` in src/engine/basicActions.ts, which keeps calling it as now. `strikePiece` is unchanged (the triggers already
  ignore kinds they don't answer). PENCIL and OUTLINE declare `struckBy: ['erase']`, so a basic Shove at an empty
  pencil tile or at an outline is no longer legal ("Nothing to shove <dir>") and `basicDirs` (input, describe, the
  bot) stops offering it. A Shove at a unit standing on pencil is unchanged. Spans and bells declare nothing (saves
  replay recorded Shoves at spans).
- Declare for CG-H and CG-J (no writer, no reader yet): in cartographers/types.ts
  `export type NoteCircle = { at: { x: number; y: number }; unit: string; holder: string };` and
  `GuildHandState.circles?: readonly NoteCircle[]`, doc comment "the Registrar's note (`registrar:swap`, CG-J):
  one-round circles the casting member holds; omitted when empty". The hand's state reads as today without it.
- CG-F1b: `undoBoard` does not restore a state onto a tile whose piece holds nothing (`pieceHoldsNothing`: the
  blank); a restored unit already never lands there (blank is solid). The pinned test loses `it.fails` and its title
  loses " (found: it does)".
Owed by this pack: "Pencil Shove (from CG-B)" and "Graphite on blank (from CG-I)" (decided 2026-11-16). Leaves for
later: nothing.

Tests first (it.fails, then un-mark).

Done when:
- CG-3b: "CG-3b: a Shove at an empty pencil tile is not offered", "CG-3b: a Shove at an outline is not offered",
  "CG-3b: a Shove at a unit on pencil still shoves it", "CG-3b: a Shove at a bell is still legal" pass.
- CG-F1b: "CG-F1: graphite does not put a state back on blank paper" passes un-marked.
- tests/districts (the foundry, bridges and cartographers threshold tests included), tests/scenarios, tests/engine and
  tests/run pass unchanged otherwise; `git status tests/fixtures` is clean.

Verify: `pnpm vitest run tests/districts tests/scenarios tests/engine tests/run --reporter=dot`
Phone check: no.
```

## Pack T: a narrower `LineId` (Default: Sonnet medium; escalate to Sonnet high)

Starts now. Runs before any pack that adds a `Meets` member (U).

```
Task CI-4 (status "Needs design review": the `LineId` limit, confirmed by CI-3); decided in TECH §7, 2026-11-16.

Read: TECH.md §7 row 2026-11-16 ("`LineId` is …"); src/data/types.ts (`Meets`, `LineSubject`, `LineId`); pattern:
tests/data/lines.test.ts (the L1 integrity test).
Own: src/data/types.ts (`LineId` and its doc comment only), tests/data/line-literals.test.ts (new), package.json and
AGENTS.md (the `check:fast` line, only under the condition below). Any other file only where a use fails to compile
(the smallest change, listed in the report).
Contract (on main):
- `export type LineId = `${LineSubject}:${string}`;` with a doc comment: the subject is checked by the type, the meets
  half by tests (L1, and line-literals); `Meets` may grow. The old product type is a subtype of this one, so every
  current use should compile unchanged.
- New test "CI-4: every literal line id in src is a row": scans src/**/*.ts and src/**/*.svelte for line ids written
  as literals in `withLine(ctx, '<a>:<b>'`, `line: '<a>:<b>'` and `{ line: '<a>:<b>'` and expects each to be a
  `LINES` id. A literal whose prefix is not a `LineSubject` (a district event type such as `cartographers:inked`) is
  skipped; any other skip is an allowlist entry with a one-line reason.
- Time `pnpm exec tsc --noEmit` cold and `pnpm typecheck:ts` warm (incremental). If the warm run is under 60 s, add
  `pnpm typecheck:ts` to `check:fast` after `typecheck:svelte` and say so in AGENTS.md's `check:fast` line; otherwise
  change neither and report the timings.
Owed by this pack: the `LineId` limit (decided). Leaves for later: U adds `'diagonal'` to `Meets`.

Done when: "CI-4: every literal line id in src is a row" passes; `pnpm exec tsc --noEmit` exits 0, and still exits 0
with four scratch members (`'zzA'`…`'zzD'`) added to `Meets` (removed before the commit; the report says so);
`pnpm check:fast` passes.

Verify: `pnpm exec tsc --noEmit && pnpm vitest run tests/data --reporter=dot`
Phone check: no.
```

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

## Pack U: goldens and the Seam stamps (Default: Sonnet medium; escalate to Sonnet high)

Starts when T is merged (`Meets` may grow).

```
Tasks FN-M2c → EN-9c: the rest of Pack L (status Owed "From ED (EN-9)" and the golden decision; DESIGN §11 and
TECH §7, 2026-11-16).

Read: TECH.md §7 row 2026-11-16 ("Golden trips keep comparing `line` …"); `git show 913a793` (the stamps L wrote:
`steam:unit`/`brass:unit` in mix.ts, the diagonal check in networks.ts `stampGap`); pattern: tests/run/golden.test.ts
(`noLedger`, `noJarIds`, ending-plan P26).
Own: tests/run/golden.test.ts (the replay mode), tests/fixtures/district-kit/*.json (re-stored by replay only),
src/engine/mix.ts (`brassOnUnit`, `landKindWith`: the two stamps), src/data/lines.ts (the FN-M2 rows' `pending`;
one row in the EN-9 mender block), src/data/types.ts (`Meets`: `'diagonal'`), src/engine/networks.ts (`stampGap`),
tests/scenarios/seam-unit-lines.test.ts, tests/scenarios/habits-mender.test.ts (the two EN-9b todos only).
Contract (on main after T):
- FN-M2c: restore 913a793's stamps. `landKindWith` lands Steam aimed at a unit on a bare tile under
  `withLine(ctx, line('steam', 'unit'), …)`; `brassOnUnit`'s bare-unit branch collars under `line('brass', 'unit')`
  (the shackle and mark branches keep their lines). `steam:unit` and `brass:unit` lose `pending`; the two FN-M2
  todos become tests again, bodies unchanged. Behaviour unchanged.
- Goldens: `RECORD_GOLDEN=replay pnpm vitest run tests/run/golden.test.ts` re-stores a trip from its recorded actions
  (`recordTrip(golden.district, golden.seed, golden.options, golden.rooms.map((r) => r.actions))`, never the bot) in
  the form the comparison reads: events through `noJarIds`, `profile` and `save.profile` through `noLedger`;
  `district`, `seed`, `options`, `outcome` and every room's `actions` stay byte-identical. Document the mode in the
  header comment beside `RECORD_GOLDEN=1`. Re-store only the trips that fail after the stamps (expected: seam-win-6,
  -8, -9, seam-wipe-23, -7). In the report, list per fixture the JSON paths that changed (path → count); expected:
  `line` on `landed`/`collared` events, the profile's `witnessed` lines and footnote points. Any other path is a stop:
  report it and do not commit the fixtures.
- EN-9c: `Meets` gains `'diagonal'` (doc: the mender, two network tiles diagonal to each other never join, EN-9b);
  row `mender:diagonal` ("The gap is a straight line: two tiles diagonal to each other never join."), district
  `seam`, in the EN-9 mender block; `stampGap` emits a `miss` (source `who`) under `mender:diagonal` when a
  same-kind tile outside the net lies diagonal to a net tile across a gap tile, as 913a793 did. Only `gap > 0` (the
  owner) stamps it, so no golden moves. `mender:dusk` is dropped (no fire spreads at round end): delete its
  `test.todo`; the scenario "EN-9: dusk fire does not jump the gap" stays as it is.
- Run `pnpm exec tsc --noEmit` after adding `'diagonal'`.
Owed by this pack: "From ED (EN-9)"; the golden decision (decided). Leaves for later: the `steam:unit`/`brass:unit`
variants (Pack V).

Done when:
- FN-M2c: "FN-M2: steam:unit fires when Steam lands under a unit" and "FN-M2: brass:unit fires when Brass collars a
  bare unit" pass; tests/run/golden.test.ts passes on the re-stored fixtures; the report lists the changed paths.
- EN-9c: "EN-9: mender:diagonal fires on a diagonal pair" passes; the nine EN-9 scenarios pass unchanged; the dusk
  todo is gone.
- tests/data/lines.test.ts (both L1 tests), tests/engine/ah0-contracts.test.ts, tests/scenarios and tests/run pass;
  `pnpm exec tsc --noEmit` exits 0; `git status tests/fixtures` shows only the re-stored trips.

Verify: `pnpm exec tsc --noEmit && pnpm vitest run tests/run tests/scenarios tests/data tests/engine --reporter=dot`
Phone check: no.
```

## Pack CG-G: doorway, hearing, Bench and hall fuzz (Default: Sonnet medium)

Starts when CG-F is merged.

```
Pack G of docs/plans/cartographers-plan.md: tasks CG-8b → CG-13 → CG-14 → CG-16.

Read: cartographers-plan.md §2 P13, P17, P18 and §5 Pack G; pattern: src/engine/districts/bridges/guarantee.ts
(Bench entries), tests/sim/ink-trip.test.ts (a trip fuzz), `applyDoorway` in src/engine/trip/doorway.ts.
Own: src/engine/trip/choices.ts (`takeChoice`), src/engine/trip/doorway.ts (`applyDoorway`), src/engine/trip/crossroads.ts
(`pushOn`), src/engine/run.ts (the trip parse check only, if a reload in the doorway needs it), src/app/crossroads.ts
(the `through` way's `sub`), src/engine/districts/cartographers/bench.ts (new), src/data/districts/cartographers/lore.ts
(new), src/data/districts/cartographers.ts (`hear`, `gate`, map art keys), src/data/scenarios.ts (the CG lines),
src/data/codex.ts (the four lore entries), tests/sim/cartographers-hall.test.ts (new),
tests/districts/cartographers/{doorway,bench,hearing}.test.ts (new), tests/districts/cartographers/trip.test.ts (the
`wayOn` helper only), tests/app/crossroads.test.ts (one new test), tests/rivals/registrar.test.ts (the heart and wipe
tests only), the acceptance file's remaining CG lines.
Contract:
- CG-8b, through the doorway (P13; DESIGN §11 and TECH §7 2026-11-16; Owed from CG-E): `takeChoice` on a
  `kind: 'through'` choice records the choice (and the checkpoint, computed for the next room as today) and opens
  the quiet doorway: `status: 'doorway'`, `encounter` unchanged. `applyDoorway` on a trip whose `kit.choices` holds a
  choice taken after the current encounter goes on to that room (`encounter + 1`, `status: 'fight'`, charges carried
  as today); a doorway picked from loot behaves as today. No new route: the doorway shows the Study in field mode and
  leaving it shows the battle. `crossroadsView` gives a `through` way the sub "Rewire at the quiet doorway, then
  <room> (depth …)". `pushOn` takes `push` when offered, else the only way on when the module names exactly one,
  else throws as today (so the sims' `pushOnward` crosses the doorway). trip.test.ts's `wayOn` helper leaves the
  doorway when one opens; test titles unchanged.
- From CG-D (Owed): the Registrar's heart and wipe tests in tests/rivals/registrar.test.ts move from a seam
  `startTrip` with the district overridden to a real cartographers trip (CG-F's rooms); titles unchanged.
- Bench (CG-13): palette entries with `bench.met` keys for pencil (with a chosen fate), blank, outline and the three
  hands; the Registrar never on the Bench. Lab scenarios `cg-pencil`, `cg-hands`, `cg-registrar`.
- Hearing (CG-14): `{ kind: 'pages', atLeast: 5, of: HEARING_RIVALS }` (DK-8's set filter if it exists, else the
  `except` form CG-W0 wrote; say which); `gate` flips to the threshold; the door line "Below the Seam, a lock turns."
  on the heart clear; codex entries *the registry* (reaching room 2), *the owner's desk* (room 5's back hall), *the
  struck name* (the Registrar's fall), *the bad join* (the hall cleared). SM's door reads
  `city.hearts.includes('cartographers')`.
- Fuzz (CG-16): 200 seeds at party sizes 1–3 from room 1 and from the doorway: no throw, no event-cap overrun in the
  round-end phase, never stranded, the through-doorway opens the rewiring and then room 4, no return after the
  doorway, checkpoint kept on a wipe, one Bind page granted once; the plan preview equals the round end; seeded
  determinism after save and load.
Owed by this pack: "From CG-E: the Crossroads 'through the doorway' app wiring"; "From CG-D: the heart/wipe tests on
the real district".

Done when: "CG-8b: through the doorway opens the rewiring, then room 4", "CG-8b: a doorway from loot still returns
to the cards or the Crossroads", "CG-8b: pushOn takes the only way on", "CG-8b: a reload in the through-doorway
resumes it" pass; the CG-8 tests in trip.test.ts and tests/run/doorway.test.ts pass with only the helper change; the
plan's CG-13, CG-14 and CG-16 rows' tests pass; the dev "open all" toggle shows the hall.

Verify: `pnpm vitest run tests/districts/cartographers tests/data tests/app tests/run tests/rivals --reporter=dot` and `pnpm vitest run tests/sim/cartographers-hall.test.ts`
Phone check: no (the orchestrator checks at the wave's end: the doorway Crossroads, the Study in field mode after it, Set Out with the doorway option).
```

## Pack V: Afterglow and Seam unit margins (Default: Sonnet medium; escalate to Sonnet high)

Starts when U is merged (the `steam:unit`/`brass:unit` stamps; mix.ts).

```
Tasks FU-5b → FN-M2b (status Owed "From I (FU-5)" and "FN-A1 M2"; drafts approved 2026-11-16, DESIGN §11).

Read: docs/design/footnotes-content/canals.md "Afterglow" (the approved pairs) and seam.md §9 (the approved FN-M2
pairs), both as amended; pattern: src/data/footnotes/canals.ts and tests/scenarios/footnotes/canals-jar-fuse.test.ts
(fourCombos).
Own:
- src/data/footnotes/canals.ts (an Afterglow block), src/data/footnotes/seam-runes.ts (a `steam:unit`/`brass:unit`
  block), tests/data/footnotes.test.ts (the count only).
- Variant sites: src/engine/mix.ts (the `afterglow:cloud` branch of `land`, `decayStates`, the step where a cloud
  becomes a compound, the `steam:unit` landing, `collar`), src/engine/current.ts (`drift`, `driftFloats` and its merge
  branch), src/engine/turn.ts (the two foe-attack `dealDamage` sites: the dodge), src/engine/bursts.ts (the conduct
  path: `brass-unit-burn`), src/engine/types.ts (optional fields: the layer's `glowKept?: true`, the unit's one-hit
  dodge, the collar's one-round flag), src/engine/marks.ts (a `spreadFrom` call only).
- Tests: tests/scenarios/footnotes/canals-afterglow.test.ts and tests/scenarios/footnotes/seam-unit.test.ts (new).
Contract (on main after U):
- Ids, slots and text as the two approved sections: Afterglow 8 (`afterglow-cloud-thin`, `-store` at level 1 and
  `-steam`, `-hold` at level 2 on `afterglow:cloud`; `afterglow-water-renew`, `-anchor` at level 1 and `-slick`,
  `-fire` at level 2 on `afterglow:water`); Steam 4 (`steam-unit-ring`, `-lift` at level 1, `-hide`, `-wet` at level
  2); Brass 4 (`brass-unit-light`, `-pair` at level 1, `-ground`, `-burn` at level 2). No capstones (Afterglow's are
  built; Steam and Brass keep theirs). `anchor`'s text takes its "(never at a slick)" clause.
- `afterglow-cloud-steam` and `steam-unit-hide` share one optional `Unit` field, a one-hit dodge carrying the line
  that set it: the next foe attack on the unit (turn.ts) misses with the existing `unharmed` under that line and
  spends it; it clears when the unit's cloud thins or the unit leaves it.
- `brass-unit-burn` adds 1 to the hit's base at the conduct call site (nothing changes inside `dealDamage`) for a
  unit whose collar is cast (`collar` is an `Origin`; born brass, `null`, never burns), then takes the collar off with
  the event Erase uses for a cast collar.
- New fields are optional and written only while their variant is on; plain behaviour is unchanged: goldens,
  fixtures and every existing test pass as they are. No new events, lines or `Meets` values. If a variant proves
  heavier than its sketch, swap that one for one that reads only existing state and say so.
Owed by this pack: "From I (FU-5): the Afterglow variants after review"; "FN-A1 M2: variants after review (FN-M2b)".
Leaves for later: nothing.

Done when:
- FU-5b: "FU-5b: fourCombos reads for every margin line" (both Afterglow lines) and one scenario per variant named
  "<variant id>: …" pass.
- FN-M2b: "FN-M2b: fourCombos reads for every margin line" (`steam:unit`, `brass:unit`) and one scenario per variant
  pass.
- tests/data/footnotes.test.ts passes with only its count changed (+16); tests/scenarios, tests/data, tests/engine
  and tests/run pass unchanged otherwise; `git status tests/fixtures` is clean.

Verify: `pnpm vitest run tests/scenarios tests/data tests/engine tests/run --reporter=dot`
Phone check: no.
```

## Close-outs (platform-closure Pack N; orchestrator, not a pack-worker run)

Platform-closure Pack N (CL-1 → CL-5) runs last, by the orchestrator in a design window, after every pack above and the tracks that finish the built plans: DESIGN §11 and TECH §7 rows for FD, DK, RV, FN, SM, IQ (write only the missing ones), the five verification files (SM-15 among them), five `code-review` runs, records and the ledger, full `pnpm check`.

## Written in a later design window

| Pack | Tasks | Starts when |
|---|---|---|
| EN-G0 | go/no-go on D5's report (EN-S2) and the player's phone timings on its dev page; limits in `src/data/tuning.ts` | the player's timings in |
| EN E… | ending Packs E–L briefs (E needs EN-G0 go and MIX-1, merged) | EN-G0 |
| CL | platform-closure Pack N | the end |
