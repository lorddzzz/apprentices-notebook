# Build program: briefs for the packs not started yet

Spawn `pack-worker` with the role's model and effort and paste one brief as written ([templates](../../.claude/skills/implement/templates.md)). Delete a brief when its pack merges. A routine window runs these; a design window writes the next ones (listed at the end). Written in the design window of 2026-11-12e: the cartographers' Packs A–I, the foundry footnote build (BF-FG approved, DESIGN §11), and four follow-up packs (P, Q, L, H3).

## Order for the routine windows

A pack starts when the packs in its "Starts when" are merged. Run two or three at a time from different lines' "ready" set; packs on one row own disjoint files. Only CG-G runs `tests/sim` (its own new file).

| Wave | Packs (together) | Starts when |
|---|---|---|
| 14 | **CG-A** paper and the guild's hand · **BF-J** foundry footnotes · **Q** RV-20b → FU-1 | now |
| 15 | **CG-C** the guild's hands · **CG-E** trip, loot, threshold · **P** MIX-F1 → FU-5 | CG-C, CG-E: CG-A · P: BF-J |
| 16 | **CG-B** runes on paper, outlines · **L** EN-9b → FN-M2 | CG-B: CG-A, BF-J · L: BF-J, P |
| 17 | **CG-D** the Registrar · **H3** C3 hygiene | CG-D: CG-B, CG-C · H3: CG-A, L |
| 18 | **CG-F** rooms · **CG-I** footnote draft | CG-F: CG-B, CG-C, CG-D, CG-E · CG-I: CG-B (and not beside L) |
| 19 | **CG-G** hearing, bench, fuzz · **CG-H** board art | CG-G: CG-F · CG-H: CG-D |

File clashes that set this order:
- **Core files:** CG-A owns `push.ts`, `pieces.ts`, `districts/types.ts` (the `void` field) and `districts/kit.ts`; CG-B then owns `runes/actions.ts`, `solvents.ts` (Quicksilver only), `districts/types.ts` and `districts/api.ts` (the erase hook). BF-J owns `resolve.ts`, `bursts.ts`, `runes/flow.ts`, `exposed.ts`, `schedule.ts`, `solvents.ts` (Rivet, Filings) and `foundry/**`, so CG-B (solvents.ts) and L (the stamp sites in bursts, resolve, solvents) wait for it. P owns `events.ts`, `src/app/{view,fx,timing}.ts`, `mix.ts` (`decayStates`) and `current.ts`; L owns `mix.ts` (Steam and Brass on a unit) and `networks.ts`, so L waits for P. H3 owns `mix.ts`, `push.ts`, `wear.ts` and `districts/api.ts`, so it waits for CG-A, CG-B and L.
- **`src/data/lines.ts` is shared by named blocks:** BF-J (the BF-F1 block's `pending` flags), P (a new Afterglow block), L (the EN-9 mender block and a new FN-M2 block beside the Seam rows), CG-B and CG-I (a new CG block at the file's end). Each pack edits only its own block. A conflict there is row appends: the orchestrator keeps both sides.
- **`tests/districts/cartographers/acceptance.test.ts`:** every CG pack deletes only its own tasks' `it.todo` lines (it moves them, titles unchanged, into its own test files). The same rule holds: keep both sides.
- **`tests/data/footnotes.test.ts`'s count:** BF-J alone changes it in these waves.

Every brief's "Leaves for later" items are also in the status file's Owed list. Plan §7 open questions of the cartographers (Erase as a kill, who holds a circle, Draw on bare pencil) are held at their defaults (DESIGN §11, 2026-11-12e).







## Pack CG-B: runes on paper and outlines (Default: Sonnet high; escalate to Opus medium)

Starts when CG-A and BF-J are merged (solvents.ts).

```
Pack B of docs/plans/cartographers-plan.md: tasks CG-3 → CG-4.

Read: cartographers-plan.md §2 P5, P6 and §5 Pack B; §7 Q1 and Q3 (held at default: Erase on pencil under a foe
erases it; Draw moves only what stands on pencil, never the pencil); pattern:
src/engine/districts/bathhouses/dissolved.ts (piece trigger wiring), the `scenario` skill for line scenarios.
Own: src/engine/runes/actions.ts (Erase's and Draw's piece calls and `drawHop`'s blank check only),
src/engine/solvents.ts (Quicksilver's mirrored tile only), src/engine/districts/types.ts and
src/engine/districts/api.ts (the erase hook only), src/engine/districts/cartographers/{pieces,guildHand}.ts (the
triggers and the outline step), src/engine/districts/cartographers/paper.ts (new), a new CG block at the end of
src/data/lines.ts, tests/districts/cartographers/{runes,outline}.test.ts (new), tests/scenarios/cartographers-lines.test.ts
(new), tests/districts/cartographers/acceptance.test.ts (CG-3 and CG-4 `it.todo` lines only).
Contract (on main after CG-A):
- Core call sites (DK request 1 was never built: Erase and Draw do not strike pieces today). In Erase's handler, at
  the target tile, after the existing parts: `strikePiece(ctx, at, 'erase', flow.origin)` and then
  `eraseTouches(ctx, at, flow.origin)`. In `drawHop`, a destination whose piece is void (`pieceVoid`) refuses the
  state and jar with `miss` under line `draw:blank` (before the gate check). Behaviour-neutral without such pieces.
- Erase hook for non-piece objects (the Registrar's circles, CG-7): `DistrictModule.eraseAt?(ctx: Ctx, at: Coord,
  origin: Origin | null): void` in districts/types.ts; `export function eraseTouches(ctx, at, origin)` in
  districts/api.ts calls every module's hook in registry order. No module sets it in this pack.
- P5 through `PENCIL_DEF.triggers.onStruck` with `by === 'erase'`: the tile un-draws (becomes `{blank}`), a unit on
  it is `removeFromRoom(…, 'erased')` (a minion is gone, an elite takes the drop damage and is stunned), event
  `cartographers:undrawn` with `by: 'erase'`, line `erase:pencil`. Inked paper (no piece) is untouched: an Erase there
  is today's Erase. `OUTLINE_DEF.triggers.onStruck('erase')`: the outline goes (the tile stays pencil, unplanned),
  `undrawn` with `was: 'outline'`, line `erase:outline`. Quicksilver's mirrored tile, when it is pencil and the rune
  is Erase, un-draws too (line `quicksilver:undraw`, `by: 'quicksilver'`). Graphite restores states and positions as
  today and never restores un-drawn paper or an erased unit. Draw and Swap move states, jars and units across pencil
  as on any tile; the pencil stays. Redraft (`idioms.ts`) still names on pencil.
- Lines (new CG block): `erase:pencil` ("On unfinished paper, Erase un-draws the tile: whoever stands there is erased
  from the fight."), `erase:outline` ("Erase on an outline un-draws the foe before it inks in."), `draw:blank` ("Draw
  cannot carry a state or a jar onto blank paper, as at the board's edge."), `quicksilver:undraw` ("Quicksilver's
  mirrored Erase un-draws the mirrored pencil too."); district `cartographers`; each with a firing scenario. Add
  `swap:pencil` only if a real behaviour needs one (then a Proposal). `Meets` gains nothing unless a row needs it
  (then `'pencil'`, `'blank'`, `'outline'` in src/data/types.ts, a Proposal).
- CG-4 (P6): the hand's outline step (CG-A left it a named no-op): an outline whose `due` is this round inks in at
  round end: the foe def is spawned on the tile (as reinforcements spawn elsewhere), the piece goes, event
  `cartographers:drawnIn`; a unit standing on it delays it one round (`due + 1`, shown in the preview as `tone:
  'drawn'`). Planned outlines get `due` in the hand's plan like pencil (an authored `@n` keeps it).
Owed by this pack: nothing. Leaves for later: CG-F1's audit of the remaining rune × paper cases; circles (CG-7).

Tests first (it.fails, then un-mark).

Done when:
- CG-3: "CG-3: erase on pencil under a foe erases it", "CG-3: erase on an outline un-draws the foe", "CG-3: inked
  paper cannot be erased", "CG-3: quicksilver un-draws the mirrored pencil", "CG-3: graphite after an un-draw leaves
  it blank", "CG-3: redraft still names on pencil", "CG-1: draw onto blank fails with draw:blank" (moved here from
  CG-1) and one firing scenario per new line pass.
- CG-4: "CG-4: an outline inks at its due round", "CG-4: a standing unit delays the inking a round", "CG-4: erase
  un-draws an outline foe" pass.
- tests/data/lines.test.ts (integrity), tests/engine, tests/scenarios and tests/run pass unchanged; `git status
  tests/fixtures` is clean.

Verify: `pnpm vitest run tests/districts/cartographers tests/scenarios tests/engine tests/data --reporter=dot`
Phone check: no.
```

## Pack L: mender fine print and the two Seam lines (Default: Sonnet medium; escalate to Sonnet high)

Starts when BF-J and P are merged (the stamp sites in bursts/resolve/solvents, and mix.ts).

```
Tasks EN-9b (status Owed "From ED (EN-9)") → FN-M2 (DESIGN §11 2026-11-12 round: FN-A1 M2 decided "add steam:unit
and brass:unit first").

Read: ending-plan.md P19 (the mender rule and its fine print); docs/design/footnotes-content/seam.md §0, F1 and F2,
and the Steam and Brass sections; footnotes-audit.md Se2 and Br1; pattern: tests/scenarios/habits-mender.test.ts,
the `steam:kettle` and `brass:plate` rows in src/data/lines.ts and their stamps.
Own: src/data/types.ts (`Meets`: two members), the EN-9 mender block of src/data/lines.ts, a new FN-M2 block beside
the Seam rune rows in src/data/lines.ts, src/engine/networks.ts, the mender's guarded call sites (bursts.ts,
resolve.ts Toll, marks.ts, solvents.ts salt, inventions.ts Conduct: the stamp only), src/engine/mix.ts
(`brassOnUnit`, `landKindWith`: the stamps only), docs/design/footnotes-content/seam.md (a new section),
tests/scenarios/habits-mender.test.ts, tests/scenarios/seam-unit-lines.test.ts (new).
Contract (on main):
- EN-9b: `Meets` gains `'diagonal'` (the mender: two network tiles diagonal to each other never join) and `'dusk'`
  (the mender: the fire that spreads at round end never jumps a gap). Rows `mender:diagonal` ("The gap is a straight
  line: two tiles diagonal to each other never join.") and `mender:dusk` ("Fire spreading at dusk does not jump the
  gap; only the owner's own casts do."), district `seam`; `mender:unit` loses `pending`. Each is stamped where the
  mender's gap check refuses (a unit in the gap, a diagonal pair, the dusk spread) by emitting the existing refusal or
  `miss` under the line, or by stamping the event the cast already emits; if a refusal is silent today, emit `miss`
  with source the rune's name under the line (as `draw:edge`). Behaviour unchanged.
- FN-M2 lines: `steam:unit` (audit Se2: "Steam aimed at a unit lands on the tile under it: the unit stands inside the
  cloud at once.") and `brass:unit` (audit Br1: "Brass on a bare unit collars it: the unit counts as brass, joins the
  network and conducts."), district `seam`, stamped on the `landed` event of Steam under a unit and on the
  `collared` event `brassOnUnit` emits for a bare unit (not the shackle or mark branches, which keep their lines).
  Behaviour unchanged.
- Then draft (do not build) the two margin lines' pairs in a new seam.md section "Draft for review (FN-M2)": for
  each of `steam:unit` and `brass:unit`, a level I pair and a level II pair, variant ids `steam-unit-<slug>` and
  `brass-unit-<slug>`, a one-line engine sketch each, combos, and the defining-word check (seam.md §6 style). Avoid
  the built ideas: `steam-cap-carry` (a cloud follows a pushed unit), `steam-cap-scald`, `brass-cap-magnet`,
  `brass-cap-net`, `brass-mark-anchor`. They become each rune's third margin line: the built `steam:kettle`,
  `steam:cloud`, `brass:plate` and `brass:mark` variants stay (saves hold them). The orchestrator approves the draft in
  a design window; no variant data is written here.
Owed by this pack: "From ED (EN-9)". Leaves for later: the FN-M2 variant build (after review).

Done when:
- EN-9b: "EN-9: mender:unit fires when a unit stands in the gap", "EN-9: mender:diagonal fires on a diagonal pair",
  "EN-9: mender:dusk fires when dusk fire meets a gap" pass; the nine EN-9 scenarios pass unchanged.
- FN-M2: "FN-M2: steam:unit fires when Steam lands under a unit", "FN-M2: brass:unit fires when Brass collars a bare
  unit" pass; the draft section exists.
- tests/data/lines.test.ts (integrity), tests/data/integrity.test.ts, tests/engine and tests/scenarios pass unchanged;
  `git status tests/fixtures` is clean.

Verify: `pnpm vitest run tests/scenarios tests/data tests/engine --reporter=dot`
Phone check: no.
```

## Pack CG-D: the Registrar (Strong: Sonnet high; escalate to Opus high)

Starts when CG-B and CG-C are merged.

```
Pack D of docs/plans/cartographers-plan.md: task CG-7.

Read: cartographers-plan.md §2 P10–P12 and §5 Pack D; §7 Q2 (held at default: each circle is held by the nearest
living guild hand when drawn, else by the Registrar); TECH.md §3 "Authoring a rival"; pattern:
src/data/rivals/bathSteward.ts and tests/rivals/bathSteward.test.ts, `TrickDef` in src/engine/rivals/types.ts (per-round
`mark`, `roundEnd`, objects), the carillonneur's trick module for a district-owned trick.
Own: src/data/rivals/registrar.ts (new), src/data/rivals/index.ts (one line), src/engine/districts/cartographers/registrar.ts
(new), src/engine/districts/cartographers.ts (the module's `tricks` and `eraseAt` lines), tests/rivals/registrar.test.ts
(new), tests/districts/cartographers/acceptance.test.ts (CG-7 `it.todo` lines only).
Contract (on main after CG-B: `eraseTouches` / `DistrictModule.eraseAt`; after CG-C: the hands):
- `RivalDef` `registrar` (P11, tune by playing): 10 HP, move 1, spells `Bolt → Erase` and `Bolt → Swap`, four charges
  each; Erase is starved on a tile with nothing to take (the planner's fallback then picks the Swap, which pulls an
  apprentice into a circle). His token is claimed in `RIVAL_TOKENS`. His page recovers `Bolt → Swap` with a note in
  his hand, story and trial scene as the other rivals' pages (RV-15–20); the page banks on a win and is kept on a wipe.
- *Strike from the register* (P10), a trick with a per-round `mark` (timing `afterActions`): each round he circles 1
  unit's tile (2 below half HP), aims locked at the telegraph; each circle `{ at, holder }` lives in the trick's own
  state (a tile may hold pencil, so a circle is never a piece); `holder` is the nearest living guild hand when drawn,
  else the Registrar (event `cartographers:circled`). Lifted by: an Erase on the tile (the module's `eraseAt` drops
  circles there), the unit moving off before round end, or the holder's death. `roundEnd` in slot `late` with an
  order before the guild's hand: a unit still on a circled tile is `removeFromRoom(…, 'erased')` (event
  `cartographers:struck`), then circles clear.
- His heart: clearing his fight adds `cartographers` to `city.hearts` (P18), as every rival heart does. No stand-in
  exists anywhere (P12).
Owed by this pack: "From EF (EN-5): the Registrar joins the masters at CG-10" stays CG-10's. Leaves for later: his
footnote note (CG-F4), his art (CG-12), the heart frame (CG-10).

Tests first (it.fails, then un-mark).

Done when: "CG-7: aims are locked at the telegraph", "CG-7: starved Erase falls back to the swap", "CG-7: Erase on the
tile lifts a circle", "CG-7: moving off lifts a circle", "CG-7: killing the holder lifts a circle", "CG-7: with no hand
left the Registrar holds the circle", "CG-7: a unit still circled at round end is erased", "CG-7: the page banks on a
win and is kept on a wipe", "CG-7: clearing the heart adds cartographers to city.hearts" pass; tests/rivals pass
unchanged otherwise.

Verify: `pnpm vitest run tests/rivals tests/districts/cartographers tests/engine --reporter=dot`
Phone check: no.
```

## Pack H3: bridges hygiene (Default: Sonnet medium)

Starts when CG-A, CG-B and L are merged (push.ts, districts/api.ts, mix.ts).

```
Task C3-H (status Owed "C3 hygiene", the bridges Close code review).

Read: bridges-plan.md P24 (`spendFallenBrass` as the model of a named api write); the status file's "C3 hygiene" item;
pattern: `spendFallenBrass` and `fallenBrassTiles` in src/engine/districts/api.ts.
Own: src/engine/mix.ts (`lay-cap-footing`), src/engine/push.ts (`mortar-cap-set`), src/engine/districts/bridges/wear.ts
(`footnoteTouch`), src/engine/districts/api.ts and src/engine/districts/types.ts (named writes only),
src/engine/districts/bridges.ts (the hook lines), src/engine/runes/brink.ts and src/engine/schedule.ts (`brinkLine`,
`runStep`'s `{ after }`), tests/districts/bridges/ (new tests only).
Contract (on main): behaviour-neutral refactor.
- `lay-cap-footing` and `mortar-cap-set` stop writing bridges state through a `shove` piece strike keyed by
  `ctx.meta.line`: each calls a named `districts/api` write (`markFooting(ctx, at)` and `setMortar(ctx, at)` or names
  that match the bridges' words), backed by optional `DistrictModule` hooks the bridges module fills; `footnoteTouch`
  goes if nothing else uses it.
- `brinkLine` reads cracked tiles from the live state only (no snapshot tiles with live rule state).
- `runStep`'s `{ after }` job: keep it Brink-only (rename to say so) or document it as generic in its doc comment;
  pick the smaller change.
Done when: "C3-H: footing and mortar write through named api calls" passes (asserts no `shove` strike is emitted for
them); every bridges, footnote and scenario test passes unchanged; `git status tests/fixtures` is clean.

Verify: `pnpm vitest run tests/districts/bridges tests/scenarios tests/engine --reporter=dot`
Phone check: no.
```

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

## Pack CG-I: cartographers footnote draft (Strong: Sonnet high)

Starts when CG-B is merged, never beside L (both edit seam lines and drafts).

```
Pack I of docs/plans/cartographers-plan.md: tasks CG-F1 → CG-F2.

Read: cartographers-plan.md §5 Pack I; docs/design/footnotes.md §1; footnotes-plan.md §6; pattern:
docs/design/footnotes-content/foundry.md (format, review batches, proposals) and footnotes-audit.md §12.
Own: the CG block of src/data/lines.ts, docs/plans/footnotes-audit.md (a new cartographers section),
docs/design/footnotes-content/cartographers.md (new), tests/scenarios/cartographers-lines.test.ts.
Contract: CG-F1 audits Swap, Draw, Erase, Quicksilver and Graphite against pencil, blank and outlines; every real
behaviour without a row gets one (text final, firing scenario). CG-F2 authors the batch: two margin lines × level I/II
pairs and a capstone pair per rune, one line and a capstone pair per solvent, the Registrar's note (a third option on
an Erase line, hidden until his page is held). No variant data is written; the orchestrator approves the draft (CG-G3).
Done when: "CG-F1: every cartographers line row has a firing scenario" passes; the draft exists with every pair two
reasonable opinions and every combination read.

Verify: `pnpm vitest run tests/scenarios/cartographers-lines.test.ts tests/data --reporter=dot`
Phone check: no.
```

## Pack CG-G: hearing, Bench and hall fuzz (Default: Sonnet medium)

Starts when CG-F is merged.

```
Pack G of docs/plans/cartographers-plan.md: tasks CG-13 → CG-14 → CG-16.

Read: cartographers-plan.md §2 P17, P18 and §5 Pack G; pattern: src/engine/districts/bridges/guarantee.ts (Bench
entries), tests/sim/ink-trip.test.ts (a trip fuzz), the Seam's sealed door gate (src/engine/districts/lowerSeam.ts or
the SM door module).
Own: src/engine/districts/cartographers/bench.ts (new), src/data/districts/cartographers/lore.ts (new),
src/data/districts/cartographers.ts (`hear`, `gate`, map art keys), src/data/scenarios.ts (the CG lines),
src/data/codex.ts (the four lore entries), tests/sim/cartographers-hall.test.ts (new),
tests/districts/cartographers/{bench,hearing}.test.ts (new), the acceptance file's remaining CG lines.
Contract:
- Bench (CG-13): palette entries with `bench.met` keys for pencil (with a chosen fate), blank, outline and the three
  hands; the Registrar never on the Bench. Lab scenarios `cg-pencil`, `cg-hands`, `cg-registrar`.
- Hearing (CG-14): `{ kind: 'pages', atLeast: 5, of: HEARING_RIVALS }` (DK-8's set filter if it exists, else the
  `except` form CG-W0 wrote; say which); `gate` flips to the threshold; the door line "Below the Seam, a lock turns."
  on the heart clear; codex entries *the registry* (reaching room 2), *the owner's desk* (room 5's back hall), *the
  struck name* (the Registrar's fall), *the bad join* (the hall cleared). SM's door reads
  `city.hearts.includes('cartographers')`.
- Fuzz (CG-16): 200 seeds at party sizes 1–3 from room 1 and from the doorway: no throw, no event-cap overrun in the
  round-end phase, never stranded, no return after the doorway, checkpoint kept on a wipe, one Bind page granted once;
  the plan preview equals the round end; seeded determinism after save and load.
Done when: the plan's CG-13, CG-14 and CG-16 rows' tests pass; the dev "open all" toggle shows the hall.

Verify: `pnpm vitest run tests/districts/cartographers tests/data --reporter=dot` and `pnpm vitest run tests/sim/cartographers-hall.test.ts`
Phone check: no (the orchestrator checks at the wave's end).
```

## Pack CG-H: board art and playback (Default: Sonnet medium; UI)

Starts when CG-D is merged (all pieces, foes and the circle exist).

```
Pack H of docs/plans/cartographers-plan.md: task CG-12.

Read: cartographers-plan.md §5 Pack H and §3 risk (2); pattern: src/ui/districts/foundry/ (registry slots, pieces,
fx, highlights) and src/ui/screens/galleryFixtures.ts.
Own: src/ui/districts/cartographers/ (CG-W0's empty module), the hall's Gallery fixture in galleryFixtures.ts.
Contract: everything through the KIT-R2 slots (`unitArt`, `fx`, `boardLayers`, `describe`, highlights); no board
component is edited. Pencil (graphite hatching), blank (the page's paper colour with a torn edge), fate marks (ink
blot / eraser smudge with the due round), outlines (dashed foe silhouette), circles with a holder line, the Tracer's
tether, the three hands' tokens, the six events' animations, "Next round" overlay entries. Svelte 5 runes only; the
autofixer clean on every component.
Done when: a Gallery sheet in light and dark with every piece, mark and foe legible in greyscale (the BF-1 method);
Combat at 375×812 on a 7×9 room showing fates, an outline, a Surveyor telegraph and the Registrar's circles with
holder lines, light and dark; screenshots in the report.

Verify: `pnpm check:fast`
Phone check: yes, port 5191.
```

## Close-outs (platform-closure Pack N; orchestrator, not a pack-worker run)

Platform-closure Pack N (CL-1 → CL-5) runs last, by the orchestrator in a design window, after every pack above and the tracks that finish the built plans: DESIGN §11 and TECH §7 rows for FD, DK, RV, FN, SM, IQ (write only the missing ones), the five verification files (SM-15 among them), five `code-review` runs, records and the ledger, full `pnpm check`.

## Written in a later design window

| Pack | Tasks | Starts when |
|---|---|---|
| EN-G0 | go/no-go on D5's report (EN-S2) and the player's phone timings on its dev page; limits in `src/data/tuning.ts` | the player's timings in |
| CG-J | the cartographers' footnote build (CG-F3 → CG-F4) | CG-I's draft approved (CG-G3, a design window) |
| FN-M2b | the `steam:unit` and `brass:unit` variant build | Pack L's draft approved |
| FU-5b | the Afterglow variant build | Pack P's draft approved |
| EN E… | ending Packs E–L briefs (E needs EN-G0 go and MIX-1, merged) | EN-G0 |
| CL | platform-closure Pack N | the end |
