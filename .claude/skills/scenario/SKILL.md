---
name: scenario
description: Write a chain-reaction scenario test (ASCII board + expected event log) for The Apprentice's Notebook. Use when adding or changing a rune, material or interaction rule.
---

# Scenario tests

Scenario tests live in `tests/scenarios/*.test.ts` and use `tests/scenarios/harness.ts`.

## Shape of a test

1. Describe the board with `parseBoard` (whitespace-separated cell tokens, one row per line, same style as DESIGN.md's lattice example).
2. Run the engine with a fixed seed (`createRng(seed)`) and the action under test.
3. Assert on the **event log** with `expectLog(log, [...plain-English lines])`. The lines come from `describe()` in `src/engine/events.ts`.

```ts
const board = parseBoard(`
  B . r
  . . O
`);
const log = castSpell(state, { seed: 1 /* ... */ });
expectLog(log, ['Bolt hits rat at C1 for 3', 'rat is inked']);
```

## Legend (grows with v0)

- `.` empty floor, `#` wall; letters/digits are units, items or lattice cells. When you add a token, document it in the harness header comment and here.

## Rules of thumb

- One test per rule, plus a few whole-chain tests (the fun combos). Name tests after the combo: `oil-chain`, `ink-spark-detonation`.
- A combo found in the Lab can become a test: the Lab uses the same board format and `#/lab?scenario=<name>` deep link.
- Expected logs are plain English so a failing diff is readable by the player too.
- Never use `Math.random()`; always the seeded RNG.
