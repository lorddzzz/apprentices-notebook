import type { BasicActionId } from '$data';
import { hasTrait, relocateAll } from './arrival';
import { type Ctx, emit, ref, withLine } from './ctx';
import { type Coord, DIRS, type Dir, opposite, step } from './grid';
import { shove } from './movement';
import { push } from './push';
import { blocksUnits, findUnit, inBoard, isAlive, reachOver, tileAt, unitAt } from './queries';
import type { BattleState, Tile, Unit, UnitId } from './types';

/**
 * The four basic actions (AH P1, party.md §1) in one registry: legality (`check`, `dirs`),
 * dispatch (`apply`), the input mode, the bot and RV's foes all read it. Shove wraps
 * `movement.ts::shove` (its event and logs unchanged). Geometry and permanent traits decide
 * legality; temporary states (Hold, a plate in the way) are legal and fizzle with a line (P2).
 */
export interface BasicActionDef {
  /** Why `unit` can't take the action toward `dir` now (null: legal, though it may fizzle). */
  check: (s: BattleState, unit: UnitId, dir: Dir) => string | null;
  /** The directions this unit may take the action in now. */
  dirs: (s: BattleState, unit: UnitId) => Dir[];
  /** Runs it on the draft; callers check legality first. */
  apply: (ctx: Ctx, unit: UnitId, dir: Dir) => void;
}

const unitOf = (s: BattleState, id: UnitId): Unit => {
  const u = findUnit(s, id);
  if (!u) throw new Error(`No unit ${id}`);
  return u;
};

/** The tile `n` steps from `from` toward `dir`, or null off the board. */
function ahead(s: BattleState, from: Coord, dir: Dir, n: number): Coord | null {
  let c = from;
  for (let i = 0; i < n; i++) c = step(c, dir);
  return inBoard(s, c) ? c : null;
}

/** A living unit on `c`, if any. */
const livingAt = (s: BattleState, c: Coord | null): Unit | null => {
  const u = c ? unitAt(s, c) : null;
  return u && isAlive(u) ? u : null;
};

/** Could `u` stand on `t`? Not on a blocking tile; a land body not in water or over a drop. */
function canStand(u: Unit, t: Tile): boolean {
  if (blocksUnits(t)) return false;
  if (hasTrait(u, 'flies')) return true;
  if (hasTrait(u, 'swims')) return t.terrain.water !== null;
  return t.terrain.water === null && !t.terrain.drop;
}

/** Fills `dirs` from `check`. */
const def = (d: Omit<BasicActionDef, 'dirs'>): BasicActionDef => ({
  ...d,
  dirs: (s, id) => DIRS.filter((dir) => d.check(s, id, dir) === null),
});

/** Marks a member's action spent and the board changed (no earlier undo after it). */
function spend(u: Unit): void {
  if (u.kind !== 'member') return;
  u.acted = true;
  u.undo = null;
}

/**
 * Pull (P4): hooks a living unit exactly 2 tiles away with nobody between, and pushes it 1 tile
 * toward the caster without a crush. A plate between, a hold or a swimmer kept in the water make
 * it fizzle (`pull:plate`, `pull:held`, `pull:water`); a land unit pulled onto water or a drop
 * falls (`pull:drop`); a flier never falls (`pull:flier`). The caster herself does not move.
 */
const pull = def({
  check: (s, id, dir) => {
    const u = unitOf(s, id);
    const mid = ahead(s, u.pos, dir, 1);
    const target = livingAt(s, ahead(s, u.pos, dir, 2));
    if (!mid || !target) return `Nothing to pull ${dir}`;
    if (livingAt(s, mid)) return `${livingAt(s, mid)?.name} is in the way`;
    if (hasTrait(target, 'anchored')) return `The ${target.name} can't be moved`;
    return null;
  },
  apply: (ctx, id, dir) => {
    const u = unitOf(ctx.s, id);
    const target = livingAt(ctx.s, ahead(ctx.s, u.pos, dir, 2));
    if (!target) throw new Error(`Nothing to pull ${dir}`);
    spend(u);
    emit(ctx, { type: 'pull', by: ref(u), target: ref(target), dir });
    push(ctx, target, opposite(dir), 1, null, { crush: false, as: 'pull' });
  },
});

/**
 * Hop (P3, P5): a leap to the free tile exactly 2 away, over anything a walk could pass except a
 * blocking tile. It lands where a walk could end (no unit, not blocked, no water or drop); a jar,
 * fire, stain or cloud there answers as an arrival. Spends the action, not the move.
 */
const hop = def({
  check: (s, id, dir) => {
    const u = unitOf(s, id);
    if (u.held > 0 || u.shackle > 0) return `${u.name} can't move by herself`;
    const to = ahead(s, u.pos, dir, 2);
    if (!to) return `No tile to hop to ${dir}`;
    if (!reachOver(s, u.pos, dir)) return `Can't hop over that`;
    const t = tileAt(s, to);
    if (unitAt(s, to) || blocksUnits(t) || t.terrain.water !== null || t.terrain.drop) {
      return `Can't land there`;
    }
    return null;
  },
  apply: (ctx, id, dir) => {
    const u = unitOf(ctx.s, id);
    const from = { ...u.pos };
    const to = step(step(from, dir), dir);
    spend(u);
    u.lastMove = dir;
    emit(ctx, { type: 'hop', unit: ref(u), dir });
    const land = (): void => {
      emit(ctx, {
        type: 'moved',
        unit: ref(u),
        from,
        to: { ...to },
        path: [{ ...to }],
        cause: 'hop',
      });
    };
    const mid = tileAt(ctx.s, step(from, dir));
    const midFalls = mid.terrain.water !== null || mid.terrain.drop;
    if (mid.jar) withLine(ctx, 'hop:jar', land);
    else if (midFalls) withLine(ctx, 'hop:water', land);
    else land();
    relocateAll(ctx, [{ unit: u.id, from, to, path: [to] }], 'hop', null);
  },
});

/**
 * Swap (P6): trade places with an adjacent living unit when each could stand on the other's tile;
 * never an anchored or flying unit (FD-1 default), never a swimmer off water. A held caster or
 * target fizzles (`swap:held`); a shackled caster can't (she moves herself). Caster arrives first.
 */
const swap = def({
  check: (s, id, dir) => {
    const u = unitOf(s, id);
    const target = livingAt(s, ahead(s, u.pos, dir, 1));
    if (!target) return `Nobody to swap with ${dir}`;
    if (u.shackle > 0) return `${u.name} can't move by herself`;
    if (hasTrait(target, 'anchored') || hasTrait(target, 'flies')) {
      return `The ${target.name} can't be swapped`;
    }
    if (!canStand(u, tileAt(s, target.pos)) || !canStand(target, tileAt(s, u.pos))) {
      return `The ${target.name} can't stand there`;
    }
    return null;
  },
  apply: (ctx, id, dir) => {
    const u = unitOf(ctx.s, id);
    const target = livingAt(ctx.s, ahead(ctx.s, u.pos, dir, 1));
    if (!target) throw new Error(`Nobody to swap with ${dir}`);
    spend(u);
    emit(ctx, { type: 'swapWith', by: ref(u), target: ref(target), dir });
    const blocked = [u, target].find((x) => x.held > 0);
    if (blocked) {
      withLine(ctx, 'swap:held', () =>
        emit(ctx, { type: 'held', unit: ref(blocked), rounds: blocked.held }),
      );
      return;
    }
    const a = { ...u.pos };
    const b = { ...target.pos };
    u.lastMove = dir;
    emit(ctx, {
      type: 'swapped',
      unit: ref(u),
      with: ref(target),
      from: a,
      to: b,
      path: [{ ...b }],
      cause: 'swap',
    });
    relocateAll(
      ctx,
      [
        { unit: u.id, from: a, to: b, path: [b] },
        { unit: target.id, from: b, to: a, path: [a] },
      ],
      'swap',
      null,
    );
  },
});

export const BASIC_ACTIONS: Readonly<Record<BasicActionId, BasicActionDef>> = {
  shove: def({
    check: (s, id, dir) => {
      const u = unitOf(s, id);
      return unitAt(s, step(u.pos, dir)) ? null : `Nothing to shove ${dir}`;
    },
    apply: (ctx, id, dir) => {
      const u = unitOf(ctx.s, id);
      if (u.kind !== 'member') throw new Error('A foe shove waits for RV');
      shove(ctx, u, dir);
    },
  }),
  pull,
  hop,
  swap,
};

/** A unit's basic action: a member's own (registry or kit); a foe has none until RV. */
export const actionOf = (u: Unit): BasicActionId | null => (u.kind === 'member' ? u.action : null);

/** The directions `unit`'s own basic action can take now (none for a unit without one). */
export function basicDirs(s: BattleState, unit: UnitId): Dir[] {
  const a = actionOf(unitOf(s, unit));
  return a ? BASIC_ACTIONS[a].dirs(s, unit) : [];
}

/** Runs `unit`'s own basic action toward `dir`. */
export function applyBasic(ctx: Ctx, unit: UnitId, dir: Dir): void {
  const a = actionOf(unitOf(ctx.s, unit));
  if (!a) throw new Error(`${unit} has no basic action`);
  BASIC_ACTIONS[a].apply(ctx, unit, dir);
}

/** The reach rule (AH P3) lives with the other board reads; Touch shares it. */
export { reachOver } from './queries';
