import { describeLog, type EventLog } from '$engine';

/**
 * Thin scenario harness. Parsing lives in the engine (`src/engine/notation.ts`); the legend is in
 * that file's header and in `.claude/skills/scenario/SKILL.md`.
 *
 *   Board cell   `.` | [unit D S r b f d][mods ! &][layers o i ~ * = @]   e.g. `r!o`, `@~`, `*`, `=`
 *   Lattice cell `.` socket, `x` hole, rune token + arrow iff arrow rune     e.g. `Bolt>`, `Bendv`, `Ink`
 */
export { label, parseBoard, parseLattice } from '$engine';

function mismatch(expected: readonly string[], actual: readonly string[]): Error {
  return new Error(
    `Event log mismatch\n  expected:\n    ${expected.join('\n    ')}\n  actual:\n    ${actual.join('\n    ')}`,
  );
}

/** Throws with a readable diff when the log doesn't match the expected plain-English lines. */
export function expectLog(log: EventLog, expected: readonly string[]): void {
  const actual = describeLog(log);
  if (JSON.stringify(actual) !== JSON.stringify(expected)) throw mismatch(expected, actual);
}

/** Passes when `lines` appear in the log as one contiguous run. */
export function expectLogIncludes(log: EventLog, lines: readonly string[]): void {
  const actual = describeLog(log);
  for (let i = 0; i + lines.length <= actual.length; i++) {
    if (lines.every((line, j) => actual[i + j] === line)) return;
  }
  throw mismatch(lines, actual);
}
