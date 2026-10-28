import type { BindEvent } from '$data';
import { cloneData } from './clone';
import { type Ctx, emit, inCastScope, ref, withLine, withOrigin } from './ctx';
import { type Coord, type Dir, sameCoord } from './grid';
import { habitOf } from './habits';
import type { Hook } from './hooks';
import { cloudNet } from './networks';
import { findUnit, isAlive, isCloud, tileAt, unitAt } from './queries';
import { runStep, snapshotOf } from './resolve';
import { turnBack } from './solvents';
import type { Bound, Flow, Mark, Origin, Step, Target, Unit } from './types';
import { targetKey } from './types';

/**
 * Marks, Bind, spreading and release (design D5, §6.4 limits 2, 3 and 6; plan P29–P31).
 * A mark spreads through a connected cloud, once per unit per lineage. A bound mark releases only
 * on its bound event, and is spent before its action runs. Everything else that removes a mark
 * (Detonation, Sentence, Levy, expiry, replacement, Erase) spends it without releasing.
 */

/** Releases nested inside releases stop here: a bound action that marks again can't run away. */
export const RELEASE_DEPTH_LIMIT = 3;
const depths = new WeakMap<Ctx, number>();

/** While Bind's carrier lands, the mark it makes is already Bind's: its spread signs `bind:cloud`. */
const carrying = new WeakSet<Ctx>();

export function asBindCarrier(ctx: Ctx, fn: () => void): void {
  const was = carrying.has(ctx);
  carrying.add(ctx);
  try {
    fn();
  } finally {
    if (!was) carrying.delete(ctx);
  }
}

type NewMark = Omit<Mark, 'lineage'> & { lineage?: number };

function reachedOf(ctx: Ctx, lineage: number): string[] {
  const l = ctx.s.lineages[lineage] ?? { reached: [] };
  ctx.s.lineages[lineage] = l;
  return l.reached;
}

function reach(ctx: Ctx, lineage: number, unit: Unit): void {
  const r = reachedOf(ctx, lineage);
  if (!r.includes(unit.id)) r.push(unit.id);
}

/** Puts a mark on a unit (a new lineage unless given), then spreads it if the unit stands in a cloud. */
export function applyMark(ctx: Ctx, unit: Unit, mark: NewMark): void {
  if (unit.mark) spendMark(ctx, unit); // replaced: spent, never released (limit 6)
  withOrigin(ctx, mark.origin, () =>
    emit(ctx, {
      type: 'marked',
      unit: ref(unit),
      deep: mark.deep,
      bound: mark.bound?.action ?? null,
    }),
  );
  const lineage = mark.lineage ?? ctx.s.nextLineage++;
  unit.mark = { ...mark, bound: mark.bound ? cloneData(mark.bound) : null, lineage };
  reach(ctx, lineage, unit);
  spreadFrom(ctx, unit);
}

/**
 * Bind's carrier landed a plain mark; this attaches what it holds. The whole lineage holds it
 * (D5: the bound action spreads too), so copies already made are updated.
 */
export function attachBound(ctx: Ctx, unit: Unit, bound: Bound): void {
  const mark = unit.mark;
  if (!mark) return;
  withOrigin(ctx, mark.origin, () =>
    emit(ctx, { type: 'marked', unit: ref(unit), deep: mark.deep, bound: bound.action }),
  );
  for (const u of ctx.s.units) {
    if (u.mark && u.mark.lineage === mark.lineage && !u.mark.bound) {
      u.mark.bound = cloneData(bound);
    }
  }
}

/** Takes the unit's mark off without releasing it (P31). */
export function spendMark(ctx: Ctx, unit: Unit): Mark | null {
  const m = unit.mark;
  if (!m) return null;
  unit.mark = null;
  withOrigin(ctx, m.origin, () =>
    emit(ctx, { type: 'markSpent', unit: ref(unit), released: false }),
  );
  return m;
}

/** Expiry: the mark goes without releasing what it holds (limit 6). For lifetimes E6/E8 add. */
export function expireMark(ctx: Ctx, unit: Unit): void {
  spendMark(ctx, unit);
}

/** Copies the unit's mark to every unmarked, unreached unit in its connected cloud (P29). */
export function spreadFrom(ctx: Ctx, unit: Unit): void {
  const mark = unit.mark;
  if (!mark || !isAlive(unit)) return;
  if (!isCloud(tileAt(ctx.s, unit.pos))) return;
  const reached = reachedOf(ctx, mark.lineage);
  const to: Unit[] = [];
  for (const c of cloudNet(ctx.s, unit.pos)) {
    const u = unitAt(ctx.s, c);
    if (!u || u.id === unit.id || u.mark || reached.includes(u.id)) continue;
    to.push(u);
  }
  if (to.length === 0) return;
  if (mark.wax) {
    withLine(ctx, 'wax:cloud', () => emit(ctx, { type: 'miss', source: 'Wax mark spreading' }));
    return;
  }
  // Plain Ink spreads under Ink's line; a mark that holds an action, or is made to, is Bind's (FN-1A In2).
  withLine(ctx, mark.bound || carrying.has(ctx) ? 'bind:cloud' : 'ink:spread', () =>
    withOrigin(ctx, mark.origin, () => {
      for (const u of to) {
        u.mark = { ...mark, bound: mark.bound ? cloneData(mark.bound) : null };
        reached.push(u.id);
      }
      emit(ctx, { type: 'markSpread', from: ref(unit), to: to.map((u) => ref(u)) });
    }),
  );
}

/**
 * Lift: moves the mark, with whatever it holds, to another unit. It keeps its lineage and spread
 * history and does not spread again (limit 3). Returns false when there is nothing to move.
 */
export function liftMark(ctx: Ctx, from: Unit, to: Unit): boolean {
  const mark = from.mark;
  if (!mark || to.mark || from.id === to.id || !isAlive(to)) return false;
  withLine(ctx, 'lift:unit', () =>
    withOrigin(ctx, mark.origin, () => {
      from.mark = null;
      to.mark = mark;
      reach(ctx, mark.lineage, to);
      emit(ctx, { type: 'markLifted', from: ref(from), to: ref(to) });
    }),
  );
  return true;
}

// ── Release ─────────────────────────────────────────────

const EVENT_OF: Record<Hook['kind'], BindEvent> = {
  hit: 'hit',
  entered: 'enters',
  pushed: 'pushed',
  died: 'dies',
};

function dirBetween(from: Coord, to: Coord): Dir | null {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  if (dx === 0 && dy === 0) return null;
  if (Math.abs(dx) >= Math.abs(dy)) return dx > 0 ? 'right' : 'left';
  return dy > 0 ? 'down' : 'up';
}

/** P30: the effect's own heading; else from its origin tile to the bearer; else the binding cast's. */
function releaseHeading(h: Hook, bearer: Coord, bound: Bound): Dir | null {
  if (h.kind === 'pushed') return h.dir;
  if (h.kind === 'hit') {
    if (h.heading) return h.heading;
    if (h.from && !sameCoord(h.from, bearer)) return dirBetween(h.from, bearer) ?? bound.heading;
  }
  return bound.heading;
}

function runBound(
  ctx: Ctx,
  bound: Bound,
  target: Target,
  origin: Origin,
  heading: Dir | null,
): void {
  const step: Step = {
    role: 'action',
    rune: bound.action,
    auras: [],
    next: null,
    at: { x: 0, y: 0 },
  };
  const caster = findUnit(ctx.s, origin.caster);
  if (!caster) return;
  const flow: Flow = {
    caster: caster.id,
    origin,
    snapshot: snapshotOf(ctx.s),
    headings: new Map([[targetKey(target), heading]]),
    lay: false,
    gifted: false,
    solvent: bound.solvent,
    habit: habitOf(caster),
    depth: 0,
    auras: [],
  };
  inCastScope(ctx, () => withOrigin(ctx, origin, () => runStep(ctx, step, [target], flow)));
}

function release(ctx: Ctx, unit: Unit, h: Hook): void {
  const mark = unit.mark;
  const bound = mark?.bound;
  if (!mark || !bound) return;
  unit.mark = null; // spent before the action runs (limit 2)
  withLine(ctx, 'bind:mark', () =>
    withOrigin(ctx, mark.origin, () => {
      emit(ctx, { type: 'markSpent', unit: ref(unit), released: true });
      const depth = depths.get(ctx) ?? 0;
      if (depth >= RELEASE_DEPTH_LIMIT) {
        emit(ctx, { type: 'fizzles', reason: 'depth' });
        return;
      }
      if (!mark.origin) return;
      emit(ctx, { type: 'released', unit: ref(unit), action: bound.action });
      const target: Target =
        h.kind === 'died' ? { kind: 'tile', at: { ...unit.pos } } : { kind: 'unit', unit: unit.id };
      // Sand turns the action back on whoever set it off.
      const origin = mark.origin;
      const heading = releaseHeading(h, unit.pos, bound);
      const turned = turnBack(ctx, bound.solvent, h, heading);
      if (turned === 'nobody') return;
      depths.set(ctx, depth + 1);
      try {
        const go = (): void =>
          runBound(ctx, bound, turned?.target ?? target, origin, turned ? turned.heading : heading);
        if (turned) withLine(ctx, 'sand:unit', go);
        else go();
      } finally {
        depths.set(ctx, depth);
      }
    }),
  );
}

/**
 * Releases a bound mark on its event. `entered` comes from the arrival pipeline's `bindEnters`
 * hook, which runs after `markSpread` (arrival.ts).
 */
export function onHook(ctx: Ctx, h: Hook): void {
  const unit = findUnit(ctx.s, h.unit);
  if (!unit?.mark) return;
  if (unit.mark.bound?.event !== EVENT_OF[h.kind]) return;
  if (h.kind !== 'died' && !isAlive(unit)) return; // a killing blow: the dies event takes it
  release(ctx, unit, h);
}
