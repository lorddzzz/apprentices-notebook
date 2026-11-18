# Build program: briefs for the packs not started yet

Spawn `pack-worker` with the role's model and effort and paste one brief as written ([templates](../../.claude/skills/implement/templates.md)). Delete a brief when its pack merges. A routine window runs these; a design window writes the next ones (listed at the end). Written in the design window of 2026-11-17 (EN-G0 go; the ending's Packs W1 and E–L; DEV-1; platform-closure Pack N). The decisions behind them: [ending-plan.md](ending-plan.md) P29–P37, DESIGN §11 and TECH §7, 2026-11-17.

## Order for the routine windows

A pack starts when the packs in its "Starts when" are merged. Run two or three at a time; packs on one row own disjoint files.

| Wave | Packs (together) | Model / effort | Starts when |
|---|---|---|---|
| 23 | **DEV-1** generator page scrolls (minutes; start it with the others and merge it first) · **EN-W1** contracts and failing tests for the ending · **MET-1** the drawable rules' `met` keys · **N1** close-out records (CL-1, CL-2, CL-3, CL-6; docs only, so it may run as a fourth) | Haiku 5.5 high · Sonnet 5.5 high · Sonnet 5.5 medium · Sonnet 5.5 medium | now (main d13f93a + this window's docs; read CI first) |
| 24 | **E** generator and `inkedPage` (EN-2, EN-3) · **H** drawing table (EN-6) | Sonnet 5.5 high (→ Opus 5.5 high) · Sonnet 5.5 medium | EN-W1 (E also MET-1) |
| 25 | **I** kits: Seam, canals, quarter (EN-K1–K3) · **G** worker and map nodes (EN-4, EN-7) · **F2** loot by depth (EN-8) | Sonnet 5.5 medium · Sonnet 5.5 medium · Sonnet 5.5 medium | E (G also H: both edit `src/app/flow.ts`) |
| 26 | **J** kits: bathhouses, bridges (EN-K4, EN-K5) · **K** kits: foundry, cartographers (EN-K6, EN-K7) | Sonnet 5.5 high · Sonnet 5.5 high | I (the kit pattern) |
| any, after E | **L** handover and credits (EN-10, EN-11) | Sonnet 5.5 medium | E **and EN-G2** (the player approves [ending-text.md](../design/ending-text.md)); the one pack a player gate holds |
| quiet | **N2** five code reviews, records, ledger (CL-4, CL-5): a design-window agent, not a `pack-worker` | strongest model, high | no pack running in `src/app` or `src/ui`; best after wave 26 |
| last | **EN-14** the ending's Close (orchestrator), then CAL | design window | every pack above |

File clashes and how the order avoids them:
- `src/app/flow.ts`, `src/app/routes.ts`, `src/app/App.svelte`: H (wave 24), then G (25), then L. Never two of them at once.
- `src/engine/drawing/kits/index.ts`, `frames/index.ts`, `tests/drawing/acceptance.test.ts`: I, J, K and F2 each add or unmark their own lines; merge conflicts there are one line and are resolved by keeping both.
- `src/engine/districts/inkedPage.ts`: E creates it; afterwards only F2 edits it (its offers).
- `src/engine/trip/finish.ts`: MET-1 (wave 23, `metIn`), then E (wave 24, the `sandbox` guard). `tests/drawing/palette.test.ts`: MET-1, then I.
- Sims: E runs `tests/sim/generator.test.ts` and `tests/sim/household-sweep.test.ts` (it adds a district id). No other pack runs `tests/sim`.
- Phone checks: DEV-1, H, G and L check themselves (new pages or interactions). I, J, K, F2, E, EN-W1 start no browser.

Every brief's "Owed by this pack" items are also in the status file's Owed list.

---


## Pack L (held for EN-G2; Default: Sonnet 5.5 medium)

Do not spawn until the player has approved [ending-text.md](../design/ending-text.md) (status file, Open questions) and Pack E is merged. If the approved text differs from the draft, the brief stands: the text is read from the file.

```
Pack L of docs/plans/ending-plan.md: tasks EN-10 -> EN-11 (the handover, then the credits).

Read: ending-plan.md §2 rows P16, P18, P20-P22 and §5 Pack L; docs/design/ending-text.md (the approved text, copied word for word); pattern: src/ui/screens/Cleared.svelte (a tap-through scene).
Own: src/data/ending.ts (new: the text as data), src/engine/drawing/ending.ts, tests/ending/** (new), the EN-10 and EN-11 lines of tests/drawing/acceptance.test.ts;
     src/ui/screens/Handover.svelte and Credits.svelte (new); routes `handover` and `credits`: src/app/routes.ts, src/app/flow.ts (`Screen`, `resolveScreen`: both need no trip and no wipe; `handover` needs `ownerDoor(p) === 'open'`), src/app/App.svelte (two branches), tests/app/flow.test.ts (new cases);
     src/ui/districts/lowerSeam/StairSlot.svelte, door.ts, DoorLine.svelte and tests/districts/lower-seam-door.test.ts (the door row on the map and SM-10's line, below);
     src/ui/screens/Codex.svelte (two replay entries), src/app/codexHousehold.ts only if the owner's row needs a line.

Contract:
  export function handover(p: Profile): Profile   // throws unless ownerDoor(p) === 'open'; idempotent
  export function creditsOf(p: Profile): Credits  // { districts, idioms, casts, trips, biggest } as src/engine/drawing/types.ts declares
  // src/data/ending.ts
  export const HANDOVER_PAGES: readonly string[]   // the scene's pages, in order
  export const CREDITS_LINES: { household: string; districts: string; idioms: string; noIdioms: string; counts: string; chain: string; close: string }
  export const ENDING_LINES: { door: string; doorSub: string; desk: string; deskSub: string; inTrip: string; blankPage: string }
Invariants:
- `handover`: `joinHousehold(p, 'owner')`; each rune of the owner's starter page other than Spark (Splash, Steam; read them from `OWNER.starterPage` in src/data/apprentices/owner.ts) is added to `known` only when missing (P18); `ending.handover` becomes true. Nothing else changes: no ink, vellum, proof, lattice of another member or city field. A second call returns the same profile.
- `creditsOf`: districts from `ledgerOf(p).districts` (opening order), idioms from the `idiom:` entries of `p.named`, casts and biggest from the ledger, trips from `p.city.trips`.
- P20: while the door is open and the handover is not done, the row under the Seam shows "The owner's door" and opens the scene (a free visit: no trip, no charges); afterwards it reads "Visit the owner's desk" and replays the scene. `doorLine`'s open state becomes `ENDING_LINES.inTrip` ("The door stands open. You can visit it from home."), a line and not a way through; `DOOR_PLACEHOLDER` is removed.
- The scene is tapped through page by page and can be left at any page without losing anything; `handover(p)` is applied when the last page is closed. The credits scroll, can be skipped at any moment, and set `ending.creditsSeen`. Both replay from the codex once seen.
- After the scene the owner's gifted pages are shown as learned ("from the owner's own pages"), only those that were missing.
- Svelte 5 runes only; svelte-autofixer on every new or changed component.
Owed by this pack: `ending.handover` set by EN-10 and `creditsSeen` by EN-11; SM-10's in-trip door line points home (P20).

Accepted test change: tests/districts/lower-seam-door.test.ts expects the open door's new label and sub line (list it in the report).

Done when:
- EN-10: tests `EN-10: the handover is hidden before the door opens`, `EN-10: the handover is idempotent`, `EN-10: nothing is lost on joining`, `EN-10: gifted pages are learned only when missing` pass with their markers removed. Phone check at 375x812: the door row on the map, every scene page, the gifted-pages line.
- EN-11: tests `EN-11: creditsOf lists districts in opening order`, `EN-11: creditsOf carries the ledger counts` pass with their markers removed. Phone check: the scroll, a skip, and both replays from the codex.

Verify: `pnpm vitest run tests/ending tests/drawing/acceptance.test.ts tests/districts/lower-seam-door.test.ts tests/app/flow.test.ts --reporter=dot`
Phone check: yes, port 5193.
```

---

## Close-outs: platform-closure Pack N

Pack N is split so its record work does not wait for the reviews. What the ledger and a `grep` of the records showed on 2026-11-17 (main d13f93a):
- DESIGN §11 has no "built" row for FD, DK, RV, FN, SM or IQ. TECH §7 has rows for DK (DK-18, DK-19) and none for FD, RV, FN, SM or IQ.
- Verification files exist for IQ, BH, BR, CN, HC, RC, AH; none for FD, DK, RV, FN, SM (SM-15) or the foundry.
- **The foundry never had its Close** (24 of 25 rows merged, BF-G1 open): no verification file, no full-loop phone check on record, no code review. This is **CL-6**, new.

### N2 (a design-window agent, strongest model, high effort; not a `pack-worker`)

Spawn as the skill's design window (one agent, in a worktree), when no pack is running in `src/app` or `src/ui`. Its instructions:

1. **CL-4**: one `code-review` run per subsystem, each on the files as they stand on `main`: (a) engine core and runes (`src/engine/*.ts` without `districts/`, `rivals/`, `drawing/`, `sim/`); (b) kit and districts (`src/engine/districts/**`, `src/engine/trip/**`, `src/data/districts/**`); (c) rivals (`src/engine/rivals/**`, `src/data/rivals*`); (d) footnotes and data (`src/engine/footnotes*`, `src/data/**` without districts); (e) UI board and app (`src/ui/**`, `src/app/**`). Start from the known findings in the status file's Rough edges (the cartographers' Close review items: `stampGap`'s duplicate mender misses, `bursts.ts::announce` stamping `coil:bell` on bursts that touch no bell, `'cartographers:pencil'` named in core files, `touchesBrassAt` duplicating `touchesBrass`, literals in engine code). Fix a finding in place when it is under 30 lines, changes no rule, and its tests pass unchanged; write every larger one as a brief in this file; move every number found in engine code to the calibration plan's list (no tuning).
2. **CL-6**: the foundry's Close: the full-trip phone check its plan lists (§6), the foundry's share of review run (b), then its plan `State:` line, the ROADMAP row and the "not checked" rows of `foundry-verification.md`.
3. **CL-5**: plan `State:` lines of every plan in the program, ROADMAP §2.3, the full `pnpm check` on `main`, and the ledger: every task it lists as open or "in the log's prose only" is either done or in the status file's Next (the ending's and CAL's open tasks stay listed until those plans close).
4. Record five CL rows and CL-6 in the log, with the review findings counted in the Note cell.

---

## Review fixes from N2 (CL-4, 2026-11-18): Packs R1–R5

N2's five `code-review` runs found 49 items, and the foundry's own review (CL-6) 10 more; N2 fixed the small ones in place (the log's CL-4 and CL-6 rows count them). The briefs below hold the larger ones, the rule questions (each with a default) and the refactors. None of them blocks EN-14, but R2 and R6 should merge before CAL-4/CAL-5 read drawn trips and the foundry bot. R1, R3, R4 and R6 own disjoint files and can run together (R1 and R6 both read `src/engine/grid.ts` helpers, neither edits it); run R5 after R2.

| Pack | Tasks | Model / effort | Starts when |
|---|---|---|---|
| R1 | engine core: layers, drifts, falls, Bends | Sonnet 5.5 high | now |
| R4 | footnotes API | Sonnet 5.5 medium | now |
| R5 | UI: a failed inking, the drawn-page slot | Sonnet 5.5 medium | R2 |

### Pack R1 (Default: Sonnet 5.5 high)

```
Pack R1: review fixes from N2's CL-4 run (a), engine core. Each item gets a scenario test (`scenario` skill) that fails before the fix.

1. States written straight onto tiles skip the piece rules of `landOnTileInner` (kindOnPiece, pieceHoldsNothing, pieceHoldsOnlyClouds, gate/grate): `soakNeighbours` (src/engine/mix.ts ~181), `spreadSteep`'s copy (~730), the `lay-cap-trail` copy (~319), `twinWall`, and `drawHop` in src/engine/runes/actions.ts (~514, the plain move; the `draw-cap-mix` path is guarded). Add one guard (`tileHolds(tile, state)` in mix.ts) and route every direct write through it. Test: a Pool beside a foundry bell and beside a blank leaves them dry; Draw of a slick onto a bell misses.
2. `driftWaiting` (src/engine/solvents.ts ~454): a jar blocked at its destination is put back on its start tile and overwrites a jar that drifted there this round (lost with no event). Default: the blocked jar stays only if its tile is free; otherwise it stays lifted one step back along its own current, or (no tile) crumbles with a `jarCrumbles` event. Test: three jars on merging currents, none lost silently.
3. `bonusFall` (src/engine/push.ts ~410) counts slide tiles as Mortar's extra tile, so a slick slide into fog reads as a Mortar fall. Compare the drop step with the pushed tiles only. Test: Mortar Shove of 2 onto a fresh slick into fog: no `mortar-unit-fall` damage.
4. `Frame.beyond` (src/engine/lattice.ts ~422) drops `rot`, so a Bend just before a payload Glyph, or just before leaving one, loses its quarter turn with `bend-cap-turn`. Carry `rot` through `outerFrame.beyond` / `innerFrame.beyond`. Test: Bend → payload Glyph → Shove pushes the turned way.
5. The Graphite undo's fallback tile (src/engine/solvents.ts, `undoBoard`, the `free` search) checks only occupancy and `blocksUnits`: it can set a land unit on water, a drop or a void piece. Use the same rule as `standableTile` in actions.ts (move it to queries.ts and share it).
6. Rule question, default held: with `tally-collar-spend`, `spendCollar` (src/engine/resolve.ts ~597) strips a born brass collar (`collar === null`), which Erase and Sentence never remove. Default: a born collar is not spent (the Tally passes and the collar stays). Record it in DESIGN §11 with the footnote's id.
7. One helper each, removing the copies: `PLAIN_KIND` (actions.ts and solvents.ts ~247), `unitOf` / `posOf` (actions.ts, solvents.ts ~111, mix.ts `targetCoord` / `unitOn`; all must use `isAlive`, as N2 made `whereIs` do), `manhattan` (flow.ts, bursts.ts). Refactor only: tests unchanged.

Own: src/engine/mix.ts, push.ts, lattice.ts, solvents.ts, resolve.ts, runes/actions.ts, queries.ts, flow.ts, bursts.ts; new scenario tests under tests/scenarios/.
Verify: `pnpm check:fast`. No phone check.
```

### Pack R4 (Default: Sonnet 5.5 medium)

```
Pack R4: review fixes from N2's CL-4 run (d), src/engine/footnotes.ts and src/app/desk.ts.

1. Rule question, default held: `pointLines` (~106) merges two firings of one line when the events between them carry no line, so two Bolt casts on different turns can earn one point. Default: a new run starts at each cast (key the run by `e.origin?.cast`, or reset on `cast` events). This moves footnote points: list every test whose expected points change, and record the decision in DESIGN §11.
2. `slotsOf` shows a written slot above the current level as locked with no options while `footnoteIds` still activates it (only after a threshold change or a migration). Default: `footnoteIds` drops a variant whose slot is above the subject's level; the Desk shows it as written-but-sleeping. Test with a profile whose level dropped.
3. `footnoteCost` does not check that `key` belongs to `subject` (a foreign capstone key reads as free). Return null for a foreign key.
4. Types: `FootnoteVariantId` is `string`, so a mistyped id in a handler is silently false. Make it the union of the content's ids (a generated `as const` list) or add a test that every `hasFootnote` / `fn` literal in src/engine is a known id.
5. Tidy: rival-note visibility defaults to hidden through an optional callback (desk.ts `withPages`); read it from the profile in footnotes.ts instead. Export one `parseSlotKey` and `districtSolvents` for desk.ts (`needsText`, `districtSolventNames`). `footnoteOffers` takes `opts: FootnoteOpts` like the others.

Own: src/engine/footnotes.ts, src/app/desk.ts, src/data/footnotes/index.ts (types only); tests/footnotes/**, tests/app/desk*.
Verify: `pnpm check:fast`. Phone check: the Desk at 375x812 (a written slot, a locked slot, a rival note).
```

### Pack R5 (Default: Sonnet 5.5 medium)

```
Pack R5: review fixes from N2's CL-4 run (e), UI.

1. A failed inking leaves the drawn trip's fight on "inking the room…" for good (src/app/game.svelte.ts ~488: the catch shows a toast, but `ensureBattle` re-runs only when `save` changes). Default: after a failure the Combat screen shows the inking line with two buttons, "Try again" (re-requests the room) and "Home" (the trip's usual way back). Test in tests/app (an inker that rejects once, then resolves).
2. Tidy: `PagesSlot.svelte` reads `drawingsOf(profile)` a second time and guards a null that `underSeam().pages` never holds: carry the drawing's line on `DrawnPage`. `crossroads.setOutAt` and `flow.setOut` (src/app/crossroads.ts ~113, src/app/flow.ts ~200) are two near-identical trip starters: make `setOutAt` call `setOut`.

Own: src/app/game.svelte.ts, src/app/city.ts, src/app/crossroads.ts, src/app/flow.ts, src/ui/screens/Combat.svelte, src/ui/districts/inkedPage/PagesSlot.svelte; tests/app/**.
Verify: `pnpm check:fast`; svelte-autofixer on every changed component. Phone check at 375x812: a drawn trip with a failed inking (dev flag or a rejecting inker), both buttons.
```

---

## Written in a later design window

| Pack | Tasks | Starts when |
|---|---|---|
| EN-14 | the ending's Close: full gate, the full-loop phone check (ending-plan §6), `code-review` of the generator, the kits and the ending, DESIGN §6.7 and §11, TECH §7, `ending-verification.md`, ledger | Packs E–L merged |
| Plan B (only if needed) | rooms validated at home into a pool (ending-plan P29) | the player's look through the 40 sample rooms finds more than 2 of 20 broken or dull |
| CAL | the calibration plan's packs (CAL-0 to CAL-5): briefs written when EN-14 closes | the end |
