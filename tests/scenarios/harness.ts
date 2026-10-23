import type { BasicActionId, HabitId, MemberId } from '$data';
import {
  type Action,
  type Aim,
  applyAction,
  type BattleSpec,
  type BattleState,
  createBattle,
  type Dir,
  describeLog,
  type EventLog,
  type GameEvent,
  memberById,
  type PartyInit,
  parseLabel,
  type ScenarioOptions,
  type SpellKey,
  scenarioBattle,
  type Unit,
  unitAt,
} from '$engine';
import { type Ctx, runDraft } from '$engine/ctx';
import { feedLinesOut, recordLog } from './lines-registry';

/**
 * Thin scenario harness. Parsing lives in the engine (`src/engine/notation.ts`); the legend is in
 * that file's header and in `.claude/skills/scenario/SKILL.md`.
 *
 *   Board cell   `.` | [unit D S r b f d e n m M][mods ! !! & $ +][one state i o ~ = # * {stain}…][terrain w> h g l @ _]
 *                e.g. `r!o`, `@~`, `*`, `=`, `b&+`, `{wall}`, `_`
 *   Lattice cell `.` socket, `x` hole, rune token + arrow iff arrow rune     e.g. `Bolt>`, `Bendv`, `Ink`
 */
export { label, parseBoard, parseLabel, parseLattice } from '$engine';

// Lines fired in this test file go to the integrity test's child run (see lines-registry.ts).
feedLinesOut();

function mismatch(expected: readonly string[], actual: readonly string[]): Error {
  return new Error(
    `Event log mismatch\n  expected:\n    ${expected.join('\n    ')}\n  actual:\n    ${actual.join('\n    ')}`,
  );
}

/** Throws with a readable diff when the log doesn't match the expected plain-English lines. */
export function expectLog(log: EventLog, expected: readonly string[]): void {
  recordLog(log);
  const actual = describeLog(log);
  if (JSON.stringify(actual) !== JSON.stringify(expected)) throw mismatch(expected, actual);
}

/** Passes when `lines` appear in the log as one contiguous run. */
export function expectLogIncludes(log: EventLog, lines: readonly string[]): void {
  recordLog(log);
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

/** A fielded apprentice's kit override (AH Lab kits): any action, any habit (null = none). */
export interface Kit {
  action?: BasicActionId;
  habit?: HabitId | null;
}
export type Kits = Partial<Record<MemberId, Kit>>;
/** Harness options on top of the spec: `kits` gives any member any action and habit. */
export interface KitOptions {
  kits?: Kits;
}

function withKits<T extends Partial<BattleSpec>>(opts: T, kits: Kits | undefined): T {
  if (!kits) return opts;
  const party: Partial<Record<MemberId, PartyInit>> = { ...opts.party };
  for (const [m, kit] of Object.entries(kits) as [MemberId, Kit][])
    party[m] = { ...party[m], ...kit };
  return { ...opts, party };
}

/** Until `spawnMember` reads `PartyInit.habit` (AH-1), the harness sets the kit's habit itself. */
function applyKits(s: BattleState, kits: Kits | undefined): BattleState {
  for (const [m, kit] of Object.entries(kits ?? {}) as [MemberId, Kit][]) {
    const u = s.units.find((x) => x.kind === 'member' && x.def === m);
    if (u?.kind === 'member' && kit.habit !== undefined) u.lean.habit = kit.habit;
  }
  return s;
}

/** A battle built from ASCII (fixed seed). `opts` can add hp/intents/party/lab and kits. */
export function board(ascii: string, opts: Partial<BattleSpec> & KitOptions = {}): BattleState {
  const { kits, ...spec } = opts;
  const s = createBattle({ title: 'test', seed: 1, board: ascii, ...withKits(spec, kits) }).state;
  return applyKits(s, kits);
}

/** A battle whose members cast the given lattices (ASCII, compiled with each member's lean). */
export function withLattices(
  ascii: string,
  lattices: Partial<Record<MemberId, string>>,
  opts: Partial<BattleSpec> & ScenarioOptions & KitOptions = {},
): BattleState {
  const { kits, ...rest } = opts;
  const spec = withKits(rest, kits);
  return applyKits(scenarioBattle({ title: 'test', ...spec, board: ascii, lattices }, spec), kits);
}

/** Casts a member's spell (default: its first) with a direction or a full aim. */
export function cast(state: BattleState, member: MemberId, aim: Dir | Aim, spell?: SpellKey): Step {
  const key = spell ?? memberById(state, member).spells[0]?.key;
  if (key === undefined) throw new Error(`${member} has no spells`);
  const full: Aim = typeof aim === 'string' ? { kind: 'dir', dir: aim } : aim;
  return act(state, { type: 'cast', unit: member, spell: key, aim: full });
}

/** Applies one action (throws if illegal) and returns the log lines with it. */
export function act(state: BattleState, action: Action): Step {
  const r = applyAction(state, action);
  recordLog(r.events);
  return { ...r, lines: describeLog(r.events) };
}

/** Runs engine internals (push, landKind…) on a draft of `state`. */
export function draft(state: BattleState, fn: (ctx: Ctx) => void): Step {
  const r = runDraft(state, fn);
  recordLog(r.events);
  return { ...r, lines: describeLog(r.events) };
}

/** The living unit on a cell label; on `ctx.s` inside `draft` it is the mutable draft unit. */
export function unitAtLabel(state: BattleState, lbl: string): Unit {
  const u = unitAt(state, parseLabel(lbl));
  if (!u) throw new Error(`No living unit at ${lbl}`);
  return u;
}
