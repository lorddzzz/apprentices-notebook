import type { KindId } from '$data';
import {
  type BattleState,
  type Dir,
  describeLog,
  type Flow,
  type GameEvent,
  parseLabel,
  type Target,
  tileAt,
  type Unit,
  unitAt,
} from '$engine';
import { type Ctx, runDraft } from '$engine/ctx';
import { landKind } from '$engine/mix';
import { snapshotOf } from '$engine/resolve';

/**
 * Helpers for the chemistry scenarios. `runStep` is E1's, so these tests drive `landKind` with a
 * hand-built Flow: the same entry point the Kind handlers call.
 */

export const tile = (lbl: string): Target => ({ kind: 'tile', at: parseLabel(lbl) });
export const unit = (id: string): Target => ({ kind: 'unit', unit: id });

/** A Flow as a cast by `caster` would build it, with overrides. */
export function flowFor(s: BattleState, over: Partial<Flow> = {}): Flow {
  return {
    caster: 'draughtsman',
    origin: { caster: 'draughtsman', spell: '0,0', cast: 1 },
    snapshot: snapshotOf(s),
    headings: new Map(),
    lay: false,
    gifted: false,
    solvent: null,
    habit: null,
    depth: 0,
    auras: [],
    ...over,
  };
}

/** The heading entry for a target (a unit's id or a tile label). */
export const heading = (t: Target, dir: Dir): [string, Dir] => [
  t.kind === 'unit' ? `u:${t.unit}` : `t:${t.at.x},${t.at.y}`,
  dir,
];

export interface Run {
  state: BattleState;
  events: GameEvent[];
  lines: string[];
}

/** Lands a sequence of kinds, each on its own target, in one draft (so the log is one cast). */
export function lands(
  s: BattleState,
  steps: readonly (readonly [KindId, Target])[],
  over: Partial<Flow> = {},
): Run {
  const flow = flowFor(s, over);
  const r = runDraft(s, (ctx) => {
    for (const [kind, t] of steps) landKind(ctx, kind, t, flow);
  });
  return { ...r, lines: describeLog(r.events) };
}

/** Runs engine internals (round end, decay…) on a draft. */
export function run(s: BattleState, fn: (ctx: Ctx) => void): Run {
  const r = runDraft(s, fn);
  return { ...r, lines: describeLog(r.events) };
}

export const stateAt = (s: BattleState, lbl: string) => tileAt(s, parseLabel(lbl)).state;
export const unitIn = (s: BattleState, lbl: string): Unit => {
  const u = unitAt(s, parseLabel(lbl));
  if (!u) throw new Error(`No unit at ${lbl}`);
  return u;
};
/** The damage events of a log as "target amount source" strings. */
export const damages = (events: readonly GameEvent[]): string[] =>
  events.flatMap((e) =>
    e.type === 'damage'
      ? [`${e.target.name}@${e.target.at.x},${e.target.at.y} ${e.amount} ${e.source}`]
      : [],
  );
