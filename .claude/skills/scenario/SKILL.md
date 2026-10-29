---
name: scenario
description: Write a chain-reaction scenario test (ASCII board + expected event log) for The Apprentice's Notebook. Use when adding or changing a rune, kind, compound, burst or interaction rule.
---

# Scenario tests

Scenario tests live in `tests/scenarios/*.test.ts` and use `tests/scenarios/harness.ts`.

## Shape of a test

1. Describe the board with ASCII (see the legend below). Parsing lives in the engine (`src/engine/notation.ts`: `parseBoard`, `parseLattice`, `serializeBoard`, `serializeLattice`); `tests/scenarios/harness.ts` re-exports it.
2. Run the engine with a fixed seed and the action under test (no `Math.random()`; seeded RNG only).
3. Assert on the **event log** with `expectLog(events, [...plain-English lines])` (exact) or `expectLogIncludes` (contiguous run). The lines come from `describe()` in `src/engine/events.ts`. Events also carry `line` (the fine-print line that caused them) and `origin` (the cast whose board object did); assert on those with `toMatchObject` when a test is about fine print or lifetime elegance.

```ts
const s = withLattices('D . r', { draughtsman: 'Bolt> Strike' });
expectLogIncludes(cast(s, 'draughtsman', 'right').events, ['Draughtsman casts Bolt right', 'bolt aims at rat-1']);
```

Helpers: `board(ascii, opts)` (no spells), `withLattices(ascii, lattices, opts)` (compiled with each member's lean), `cast(state, member, dir | aim, spellKey?)`, `act(state, action)`, `draft(state, ctx => …)` for engine internals. A combo worth keeping in the Lab goes in `src/data/scenarios.ts` (demo + expected; `tests/scenarios/lab.test.ts` replays all of them).

## Legend

Cells are whitespace-separated tokens, one row per line, blank lines ignored, short rows padded with `.`. Labels are spreadsheet style: `A1` is top-left, `C4` is column 3, row 4. Parse errors name the offending cell label.

Board cell = `.` (floor) or `[unit][mods][state and terrain]`:

| Part | Chars |
|---|---|
| unit (first char) | `D` Draughtsman, `S` Stoker, `r` rat, `b` brass sentry (born collared), `f` familiar, `d` training dummy, `e` eel, `n` snuffer, `m` lamp-moth, `M` lamp-mother, `x` dead letter, `u` Sorter. Elite or minion comes from the foe's data (P20) |
| mods (after a unit) | `!` mark, `!!` deep mark, `&` brass collar, `$` shackle, `+` 1 shield each (`++` = 2) |
| state (one per tile) | `i` blot, `o` slick, `~` cloud, `=` layout plate (permanent, no unit), `#` rune plate (crumbles after 3 rounds), `*` fire, or a compound in braces: `{stain}` `{brand}` (brand cloud) `{pool}` `{fog}` (grease fog) `{skid}` (skid plate) `{bank}` `{kettle}` `{wall}` |
| terrain | `w` + arrow water lane flowing that way (`w>`, `wv`), `h` grate (on water only), `g` wooden lock gate (alone), `l` lamp, `@` vent, `_` the drop (an open side) |
| piece (one per tile, DK-4) | a district board piece in braces by its registered token: `{pier}`, `{bell:a}` (the suffix is the piece's own data). Written after the state (`{stain}{probe}`). A solid piece blocks units like a plate (no unit or start point on it); a piece never shares a cell with a lock gate; `unitsAndShots` pieces also stop Bolts and lines. Tokens never reuse a compound name, a district or rival token (`tests/engine/pieces.test.ts`). Tests register fixture pieces by mocking `$engine/districts/kit` (see that file) |

Examples: `r` rat, `ro` rat on a slick, `r!~` marked rat in a cloud, `r!!` deep-marked rat, `b&` a sentry with a cast collar, `D++` Draughtsman with 2 shield, `*` fire, `@~` vent under a cloud, `=` plate, `{wall}` a Wall, `w>o` slick floating on a lane, `r{pier}` a rat on a pier. Each member token (`D`, `S`) may appear once. Deep mark and Shackle are unit compounds (`!!`, `$`); the other eight compounds sit on tiles.

A battle's edge is `'wall'` unless the spec says `edge: 'drop'` (P3).

Lattice cell: `.` empty socket, `x` hole, a rune token, or an invention `inv:name`. Arrow runes (sources and Bend) carry an arrow suffix `>` right, `<` left, `^` up, `v` down; every other rune has none.
Tokens (31 runes, design §5): sources `Bolt> Splash> Touch> Vat>`; actions `Strike Shove Guard Sentence Levy Hold Swap Draw Erase`; kinds `Ink Oil Steam Brass Spark`; shapes `Fork Bendv Seep Lay Toll`; triggers `Tally Brink Unison`; seals `Jar Fuse`; auras `Afterglow Steep Coil`. E.g. `Bolt> Oil Spark . .`. A Glyph is `G:id>` plus `[x,y:Rune]` arguments.

Growing lattices use a sparse form: first line `@lattice 1 growing`, then one `x,y token` entry per occupied cell (for example `-2,0 Bolt>`). Coordinates and Glyph argument keys are canonical signed decimal integers: no `+`, leading zeros, negative zero or exponent notation. Entries may arrive in any order; export sorts by row then column. Header alone is an empty growing page. Sparse entries cannot be `.` or `x`; fixed ASCII and battle board text keep their existing meaning. Optional Glyph/invention libraries validate references. Imports reject duplicates and resource excess without cropping.

When you add a token, update `src/engine/notation.ts` (header comment), `tests/scenarios/harness.ts` and this legend. During an `implement` task, change only owned files; report any required updates outside that ownership to the orchestrator.

## Rules of thumb

- One test per rule, plus a few whole-chain tests (the fun combos). Name tests after the combo: `the-wall`, `oil-then-spark`.
- A combo found in the Lab can become a test: the Lab uses the same board format and `#/lab?scenario=<name>` deep link.
- Expected logs are plain English so a failing diff is readable by the player too.
