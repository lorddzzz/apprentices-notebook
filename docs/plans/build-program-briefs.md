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
