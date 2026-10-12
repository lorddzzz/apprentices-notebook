---
name: scenario
description: Write a chain-reaction scenario test (ASCII board + expected event log) for The Apprentice's Notebook. Use when adding or changing a rune, material or interaction rule.
---

# Scenario tests

Scenario tests live in `tests/scenarios/*.test.ts` and use `tests/scenarios/harness.ts`.

## Shape of a test

1. Describe the board with ASCII (see the legend below). Parsing lives in the engine (`src/engine/notation.ts`: `parseBoard`, `parseLattice`, `serializeBoard`, `serializeLattice`); `tests/scenarios/harness.ts` re-exports it.
2. Run the engine with a fixed seed and the action under test (no `Math.random()`; seeded RNG only).
3. Assert on the **event log** with `expectLog(events, [...plain-English lines])` (exact) or `expectLogIncludes` (contiguous run). The lines come from `describe()` in `src/engine/events.ts`.

```ts
const events = /* run the action on parseBoard(...) / the battle built from it */;
expectLog(events, ['Draughtsman casts Bolt right', 'Bolt hits rat at C1 for 3']);
```

## Legend

Cells are whitespace-separated tokens, one row per line, blank lines ignored, short rows padded with `.`. Labels are spreadsheet style: `A1` is top-left, `C4` is column 3, row 4. Parse errors name the offending cell label.

Board cell = `.` (floor) or `[unit][mods][layers]`:

| Part | Chars |
|---|---|
| unit (first char) | `D` Draughtsman, `S` Stoker, `r` rat, `b` brass sentry, `f` familiar, `d` training dummy |
| mods (after a unit) | `!` inked, `&` brass-coated |
| layers | `o` oil, `i` ink puddle, `~` steam, `*` fire (implies oil), `=` brass plate (alone, no unit), `@` steam vent |

Examples: `r` rat, `ro` rat on oil, `r!~` inked rat in steam, `r&` brass-coated rat, `*` burning oil, `@~` vent with steam, `=` plate. Each member token (`D`, `S`) may appear once.

Lattice cell: `.` empty socket, `x` hole, or a rune token. Arrow runes (sources and Bend) carry an arrow suffix `>` right, `<` left, `^` up, `v` down; every other rune has none.
Tokens: `Bolt> Splash> Ward>` (sources), `Ink Oil Spark Steam Brass` (materials), `Bendv Fork` (shape), `OnInked OnKill` (triggers), `Amp Echo` (auras). E.g. `Bolt> Ink . .`.

When you add a token, update `src/engine/notation.ts` (header comment), `tests/scenarios/harness.ts` and this legend.

## Rules of thumb

- One test per rule, plus a few whole-chain tests (the fun combos). Name tests after the combo: `oil-chain`, `ink-spark-detonation`.
- A combo found in the Lab can become a test: the Lab uses the same board format and `#/lab?scenario=<name>` deep link.
- Expected logs are plain English so a failing diff is readable by the player too.
- Never use `Math.random()`; always the seeded RNG.
