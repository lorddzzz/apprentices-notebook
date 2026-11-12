import type { BindEvent, LineId } from '$data';
import { markUnit, nameOnce, noteMet } from './bursts';
import { cloneData } from './clone';
import { type Ctx, emit, inCastScope, ref, withLine, withOrigin } from './ctx';
import { hasFootnote } from './footnotes';
import { type Coord, type Dir, neighbors4, sameCoord } from './grid';
import { habitOf } from './habits';
import { guardHarm } from './harm';
import type { Hook } from './hooks';
import { cloudNet } from './networks';
import { findUnit, inBoard, isAlive, isCloud, tileAt, unitAt } from './queries';
import { runStep, snapshotOf } from './resolve';
import { trickBeforeHarm } from './rivals/tricks';
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

/**
 * Puts a mark on a unit (a new lineage unless given), then spreads it if the unit stands in a cloud.
 * It passes the harm guards first (DK-IQ D1): a cancel logs `unharmed` and marks no one; a
 * redirect marks the guard's unit instead, unguarded (a dead or missing one: no one). Returns the
 * unit that took the mark, or null. Spreading and Lift move marks without the guards.
 */
export function applyMark(ctx: Ctx, unit: Unit, mark: NewMark): Unit | null {
  const harm = { kind: 'mark', unit: unit.id, harm: null } as const;
  // A rival's trick answers first (RV-11 `beforeHarm`), then the harm guards.
  const reaction = trickBeforeHarm(ctx, unit, harm);
  if (reaction === 'relocated') return null;
  const v = reaction ?? guardHarm(ctx, harm);
  if (v.kind === 'cancel') {
    withOrigin(ctx, mark.origin, () =>
      emit(ctx, {
        type: 'unharmed',
        unit: ref(unit),
        source: 'Mark',
        harm: null,
        ...(v.line ? { line: v.line } : {}),
        ...(v.habit ? { habit: v.habit } : {}),
      }),
    );
    return null;
  }
  if (v.kind === 'redirect') {
    const to = findUnit(ctx.s, v.to);
    if (!to || !isAlive(to)) return null;
    placeMark(ctx, to, mark);
    return to;
  }
  placeMark(ctx, unit, mark);
  return unit;
}

function placeMark(ctx: Ctx, unit: Unit, mark: NewMark): void {
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
  // `bind-cloud-haunt`: a bound mark in a cloud leaves the action in it (late: at round end).
  if (!hasFootnote(ctx, 'bind-cloud-late')) haunt(ctx, unit, bound);
}

/** `bind-mark-layered`: a deep mark that already holds an action takes a second, released after it. */
export function attachLayer(ctx: Ctx, unit: Unit, bound: Bound): void {
  const mark = unit.mark;
  if (!mark?.bound || mark.layer) return;
  withOrigin(ctx, mark.origin, () =>
    emit(ctx, { type: 'marked', unit: ref(unit), deep: mark.deep, bound: bound.action }),
  );
  for (const u of ctx.s.units) {
    if (u.mark && u.mark.lineage === mark.lineage && u.mark.bound && !u.mark.layer) {
      u.mark.layer = cloneData(bound);
    }
  }
}

/** The cloud the bearer stands in holds the action: whoever walks in is marked with it. */
function haunt(ctx: Ctx, unit: Unit, bound: Bound): void {
  const mark = unit.mark;
  if (!mark || !hasFootnote(ctx, 'bind-cloud-haunt') || !isCloud(tileAt(ctx.s, unit.pos))) return;
  const kin = hasFootnote(ctx, 'bind-cloud-kin');
  for (const c of cloudNet(ctx.s, unit.pos)) {
    const layer = tileAt(ctx.s, c).state;
    if (!layer) continue;
    layer.haunt = {
      bound: cloneData(bound),
      origin: mark.origin,
      lineage: mark.lineage,
      ...(kin ? { kin: unit.kind } : {}),
    };
  }
}

/** `bind-cloud-haunt`, `bind-cap-snare`: a unit entering a tile that holds an action is marked with it. */
export function hauntMark(ctx: Ctx, unit: Unit, at: Coord): void {
  const layer = tileAt(ctx.s, at).state;
  const h = layer?.haunt;
  if (!layer || !h || !isAlive(unit) || unit.mark) return;
  if (h.kin && unit.kind !== h.kin) return;
  if (reachedOf(ctx, h.lineage).includes(unit.id)) return;
  if (h.once) delete layer.haunt;
  withLine(ctx, h.once ? 'bind:empty' : 'bind:cloud', () =>
    applyMark(ctx, unit, {
      deep: false,
      bound: cloneData(h.bound),
      origin: h.origin,
      lineage: h.lineage,
    }),
  );
}

/** `bind-cap-snare`: Bind on an empty tile binds the blot it left. */
export function snareBlot(ctx: Ctx, at: Coord, bound: Bound, origin: Origin | null): void {
  const layer = tileAt(ctx.s, at).state;
  if (!layer || !['blot', 'stain'].includes(layer.id) || unitAt(ctx.s, at)) return;
  layer.haunt = { bound: cloneData(bound), origin, lineage: ctx.s.nextLineage++, once: true };
}

/** `bind-cloud-late`: the spreads put off to round end happen now. */
export function runLateSpreads(ctx: Ctx): void {
  const pending = ctx.s.lateSpreads;
  if (!pending?.length) return;
  delete ctx.s.lateSpreads;
  for (const p of pending) {
    const u = findUnit(ctx.s, p.unit);
    if (u?.mark && u.mark.lineage === p.lineage) spreadFrom(ctx, u, true);
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
export function spreadFrom(ctx: Ctx, unit: Unit, now = false): void {
  const mark = unit.mark;
  if (!mark || !isAlive(unit)) return;
  if (!isCloud(tileAt(ctx.s, unit.pos))) return;
  // Plain Ink spreads under Ink's line; a mark that holds an action, or is made to, is Bind's (FN-1A In2).
  const isBind = !!mark.bound || carrying.has(ctx);
  const spreadLine: LineId = isBind ? 'bind:cloud' : 'ink:spread';
  // `bind-cloud-late`: a bound mark spreads at round end.
  if (isBind && !now && !mark.wax && hasFootnote(ctx, 'bind-cloud-late')) {
    const wait = ctx.s.lateSpreads ?? [];
    ctx.s.lateSpreads = wait;
    if (!wait.some((p) => p.unit === unit.id && p.lineage === mark.lineage)) {
      wait.push({ unit: unit.id, lineage: mark.lineage });
    }
    return;
  }
  if (mark.bound && !mark.wax) haunt(ctx, unit, mark.bound);
  const reached = reachedOf(ctx, mark.lineage);
  const to: Unit[] = [];
  const net = cloudNet(ctx.s, unit.pos);
  // Ink margin: `kin` keeps to the bearer's side, `seep` adds the units beside the cloud, and
  // `deep` also reaches a marked unit (deepening it).
  const cells = hasFootnote(ctx, 'ink-spread-seep')
    ? [...net, ...net.flatMap((c) => neighbors4(c).filter((n) => inBoard(ctx.s, n)))]
    : net;
  const deeper = hasFootnote(ctx, 'ink-spread-deep');
  const kin = hasFootnote(ctx, isBind ? 'bind-cloud-kin' : 'ink-spread-kin');
  for (const c of cells) {
    const u = unitAt(ctx.s, c);
    if (!u || u.id === unit.id || reached.includes(u.id) || to.includes(u)) continue;
    if (u.mark && !(deeper && !u.mark.deep)) continue;
    if (kin && u.kind !== unit.kind) continue;
    to.push(u);
  }
  if (to.length === 0) return;
  if (mark.wax) {
    withLine(ctx, 'wax:cloud', () => emit(ctx, { type: 'miss', source: 'Wax mark spreading' }));
    return;
  }
  withLine(ctx, spreadLine, () =>
    withOrigin(ctx, mark.origin, () => {
      for (const u of to) {
        if (u.mark) {
          u.mark = { ...u.mark, deep: true };
          noteMet(ctx, 'deepMark');
          nameOnce(ctx, 'compound', 'deepMark');
          emit(ctx, { type: 'mixed', at: { ...u.pos }, unit: ref(u), compound: 'deepMark' });
        } else {
          u.mark = {
            ...mark,
            bound: mark.bound ? cloneData(mark.bound) : null,
            ...(mark.layer ? { layer: cloneData(mark.layer) } : {}),
          };
        }
        reached.push(u.id);
      }
      emit(ctx, { type: 'markSpread', from: ref(unit), to: to.map((u) => ref(u)) });
      // `ink-spread-brand`: the cloud it spread through takes the ink.
      if (spreadLine === 'ink:spread' && hasFootnote(ctx, 'ink-spread-brand')) {
        for (const c of net) {
          const layer = tileAt(ctx.s, c).state;
          if (layer?.id !== 'cloud') continue;
          tileAt(ctx.s, c).state = { ...layer, id: 'brandCloud' };
          noteMet(ctx, 'brandCloud');
          nameOnce(ctx, 'compound', 'brandCloud');
          emit(ctx, { type: 'mixed', at: { ...c }, compound: 'brandCloud' });
        }
      }
    }),
  );
}

/**
 * Lift: moves the mark, with whatever it holds, to another unit. It keeps its lineage and spread
 * history and does not spread again (limit 3). Returns false when there is nothing to move.
 */
export function liftMark(ctx: Ctx, from: Unit, to: Unit, line: LineId = 'lift:unit'): boolean {
  const mark = from.mark;
  if (!mark || from.id === to.id || !isAlive(to)) return false;
  const other = to.mark;
  // `lift-cap-trade`: a marked receiver trades marks; `lift-unit-deepen`: it deepens its own.
  const trade = other !== null && hasFootnote(ctx, 'lift-cap-trade');
  const deepen = other !== null && !trade && hasFootnote(ctx, 'lift-unit-deepen');
  if (other && !trade && !deepen) return false;
  withLine(ctx, line, () =>
    withOrigin(ctx, mark.origin, () => {
      if (trade && other) {
        from.mark = other;
        to.mark = mark;
        reach(ctx, mark.lineage, to);
        reach(ctx, other.lineage, from);
        emit(ctx, { type: 'markLifted', from: ref(from), to: ref(to) });
        withOrigin(ctx, other.origin, () =>
          emit(ctx, { type: 'markLifted', from: ref(to), to: ref(from) }),
        );
        return;
      }
      from.mark = null;
      reach(ctx, mark.lineage, to);
      if (deepen && other) {
        // What the lifted mark held is lost: the receiver keeps its own action, if any.
        emit(ctx, { type: 'markLifted', from: ref(from), to: ref(to) });
        if (!other.deep) {
          to.mark = { ...other, deep: true };
          noteMet(ctx, 'deepMark');
          nameOnce(ctx, 'compound', 'deepMark');
          emit(ctx, { type: 'mixed', at: { ...to.pos }, unit: ref(to), compound: 'deepMark' });
        }
        return;
      }
      to.mark = mark;
      emit(ctx, { type: 'markLifted', from: ref(from), to: ref(to) });
    }),
  );
  // `lift-unit-spread`: a lifted mark spreads on arrival if its new bearer stands in a cloud.
  if (!deepen && hasFootnote(ctx, 'lift-unit-spread')) spreadFrom(ctx, to);
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

/**
 * P30: the effect's own heading; else from its origin tile to the bearer; else the binding cast's.
 * `bind-mark-fixed` keeps only the cast's; `bind-mark-recoil` only the hitter's.
 */
function releaseHeading(ctx: Ctx, h: Hook, bearer: Coord, bound: Bound): Dir | null {
  if (hasFootnote(ctx, 'bind-mark-fixed')) return bound.heading;
  if (h.kind === 'pushed') return h.dir;
  if (h.kind === 'hit') {
    if (h.heading && !hasFootnote(ctx, 'bind-mark-recoil')) return h.heading;
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

/**
 * Sand's capstones after a turned action: `sand-cap-return` marks the one it was turned on (if it
 * stands and is unmarked); `sand-cap-ricochet` acts the same action on the bearer when that one fell.
 */
function sandCapstones(
  ctx: Ctx,
  turnedOn: Target,
  bearer: Unit,
  bound: Bound,
  origin: Origin,
  heading: Dir | null,
): void {
  if (turnedOn.kind !== 'unit') return;
  const hitter = findUnit(ctx.s, turnedOn.unit);
  if (!hitter) return;
  if (hitter.hp > 0) {
    if (!hitter.mark && hasFootnote(ctx, 'sand-cap-return')) markUnit(ctx, hitter, origin);
    return;
  }
  if (hasFootnote(ctx, 'sand-cap-ricochet') && isAlive(bearer)) {
    runBound(ctx, bound, { kind: 'unit', unit: bearer.id }, origin, heading);
  }
}

function release(
  ctx: Ctx,
  unit: Unit,
  h: Hook,
  line: LineId = 'bind:mark',
  given?: Dir | null,
): void {
  const mark = unit.mark;
  const bound = mark?.bound;
  if (!mark || !bound) return;
  unit.mark = null; // spent before the action runs (limit 2)
  withLine(ctx, line, () =>
    withOrigin(ctx, mark.origin, () => {
      emit(ctx, { type: 'markSpent', unit: ref(unit), released: true });
      // `bind-mark-layered`: the second action stays on the mark, for the next event.
      if (mark.layer) {
        unit.mark = { ...mark, bound: mark.layer, layer: null, deep: false };
        emit(ctx, { type: 'marked', unit: ref(unit), deep: false, bound: mark.layer.action });
      }
      const depth = depths.get(ctx) ?? 0;
      if (depth >= RELEASE_DEPTH_LIMIT) {
        emit(ctx, { type: 'fizzles', reason: 'depth' });
        return;
      }
      if (!mark.origin) return;
      emit(ctx, { type: 'released', unit: ref(unit), action: bound.action });
      const target: Target =
        h.kind === 'died' || !isAlive(unit)
          ? { kind: 'tile', at: { ...unit.pos } }
          : { kind: 'unit', unit: unit.id };
      // Sand turns the action back on whoever set it off.
      const origin = mark.origin;
      const heading = given !== undefined ? given : releaseHeading(ctx, h, unit.pos, bound);
      const turned = turnBack(ctx, bound.solvent, h, heading);
      if (turned === 'nobody') return;
      depths.set(ctx, depth + 1);
      try {
        const go = (): void =>
          runBound(ctx, bound, turned?.target ?? target, origin, turned ? turned.heading : heading);
        if (turned) withLine(ctx, 'sand:unit', go);
        else go();
        if (turned) sandCapstones(ctx, turned.target, unit, bound, origin, heading);
      } finally {
        depths.set(ctx, depth);
      }
      // `bind-cap-rearm`: the bearer is left with a plain mark.
      if (hasFootnote(ctx, 'bind-cap-rearm') && isAlive(unit) && !unit.mark) {
        applyMark(ctx, unit, { deep: false, bound: null, origin: mark.origin });
      }
    }),
  );
}

/**
 * Sentence and Levy spend a mark whole and release its bound action on the bearer (`sentence-mark-release`,
 * `levy-mark-release`). The action runs under `line` with the spender's heading, else the binding cast's.
 * It is never a hit, so Sand turns nothing back (the entered hook reads the same as a death's tile).
 */
export function releaseSpent(ctx: Ctx, unit: Unit, line: LineId, heading: Dir | null): void {
  const bound = unit.mark?.bound;
  if (!bound) return;
  release(
    ctx,
    unit,
    { kind: 'entered', unit: unit.id, at: { ...unit.pos } },
    line,
    heading ?? bound.heading,
  );
}

/**
 * Releases a bound mark on its event. `entered` comes from the arrival pipeline's `bindEnters`
 * hook, which runs after `markSpread` (arrival.ts).
 */
export function onHook(ctx: Ctx, h: Hook): void {
  const unit = findUnit(ctx.s, h.unit);
  if (!unit?.mark) return;
  const event = unit.mark.bound?.event;
  if (event !== EVENT_OF[h.kind]) return;
  // A killing blow: the dies event takes it, unless `bind-mark-lastword` lets the hit release first.
  const lastWord = h.kind === 'hit' && hasFootnote(ctx, 'bind-mark-lastword');
  if (h.kind !== 'died' && !isAlive(unit) && !lastWord) return;
  // `bind-cloud-chorus`: every copy in the same cloud releases with it, once each.
  const lineage = unit.mark.lineage;
  const chorus =
    hasFootnote(ctx, 'bind-cloud-chorus') && isCloud(tileAt(ctx.s, unit.pos))
      ? cloudNet(ctx.s, unit.pos)
          .map((c) => unitAt(ctx.s, c))
          .filter((u): u is Unit => !!u && u.id !== unit.id)
          .filter((u) => u.mark?.lineage === lineage && u.mark.bound?.event === event)
      : [];
  release(ctx, unit, h);
  for (const copy of chorus) {
    if (copy.mark?.bound?.event === event) release(ctx, copy, { ...h, unit: copy.id });
  }
}
