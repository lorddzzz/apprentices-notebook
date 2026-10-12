import {
  type Action,
  applyAction,
  type BattleSpec,
  type BattleState,
  createBattle,
  describeLog,
  type EventLog,
  type GameEvent,
  parseLabel,
  type Unit,
  unitAt,
} from '$engine';
import { type Ctx, runDraft } from '$engine/ctx';

/**
 * Thin scenario harness. Parsing lives in the engine (`src/engine/notation.ts`); the legend is in
 * that file's header and in `.claude/skills/scenario/SKILL.md`.
 *
 *   Board cell   `.` | [unit D S r b f d][mods ! &][layers o i ~ * = @]   e.g. `r!o`, `@~`, `*`, `=`
 *   Lattice cell `.` socket, `x` hole, rune token + arrow iff arrow rune     e.g. `Bolt>`, `Bendv`, `Ink`
 */
export { label, parseBoard, parseLabel, parseLattice } from '$engine';

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

export interface Step {
  state: BattleState;
  events: GameEvent[];
  lines: string[];
}

/** A battle built from ASCII (fixed seed). `opts` can add hp/intents/party/lab. */
export function board(ascii: string, opts: Partial<BattleSpec> = {}): BattleState {
  return createBattle({ title: 'test', seed: 1, board: ascii, ...opts }).state;
}

/** Applies one action (throws if illegal) and returns the log lines with it. */
export function act(state: BattleState, action: Action): Step {
  const r = applyAction(state, action);
  return { ...r, lines: describeLog(r.events) };
}

/** Runs engine internals (applySpark, pushUnit…) on a draft of `state`. */
export function draft(state: BattleState, fn: (ctx: Ctx) => void): Step {
  const r = runDraft(state, fn);
  return { ...r, lines: describeLog(r.events) };
}

/** The living unit on a cell label; on `ctx.s` inside `draft` it is the mutable draft unit. */
export function unitAtLabel(state: BattleState, lbl: string): Unit {
  const u = unitAt(state, parseLabel(lbl));
  if (!u) throw new Error(`No living unit at ${lbl}`);
  return u;
}
