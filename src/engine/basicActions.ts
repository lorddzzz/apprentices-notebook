import { type BasicActionId, MEMBERS } from '$data';
import type { Ctx } from './ctx';
import { type Coord, DIRS, type Dir, step } from './grid';
import { shove } from './movement';
import { blocksUnits, findUnit, inBoard, tileAt, unitAt } from './queries';
import type { BattleState, Unit, UnitId } from './types';

/**
 * The four basic actions (AH P1, party.md §1) in one registry: legality (`dirs`), dispatch
 * (`apply`), the input mode, the bot and RV's foes all read it. Shove wraps `movement.ts::shove`
 * (its event and logs unchanged); Pull, Hop and Swap are stubs until AH-1.
 */
export interface BasicActionDef {
  /** The directions this unit may take the action in now (legal, P2: a fizzle is still legal). */
  dirs: (s: BattleState, unit: UnitId) => Dir[];
  /** Runs it on the draft; callers check `dirs` first. */
  apply: (ctx: Ctx, unit: UnitId, dir: Dir) => void;
}

const stub = (id: BasicActionId): BasicActionDef => ({
  dirs: () => [],
  apply: () => {
    throw new Error(`Basic action ${id} is not built yet (AH-1)`);
  },
});

const unitOf = (s: BattleState, id: UnitId): Unit => {
  const u = findUnit(s, id);
  if (!u) throw new Error(`No unit ${id}`);
  return u;
};

export const BASIC_ACTIONS: Readonly<Record<BasicActionId, BasicActionDef>> = {
  shove: {
    dirs: (s, id) => {
      const u = unitOf(s, id);
      return DIRS.filter((d) => unitAt(s, step(u.pos, d)) !== null);
    },
    apply: (ctx, id, dir) => {
      const u = unitOf(ctx.s, id);
      if (u.kind !== 'member') throw new Error('A foe shove waits for RV');
      shove(ctx, u, dir);
    },
  },
  pull: stub('pull'),
  hop: stub('hop'),
  swap: stub('swap'),
};

/**
 * A unit's basic action: a member's registry action (HC's `MemberUnit.action` replaces this read
 * when it lands, and Lab kits override it there); a foe has none until RV.
 */
export const actionOf = (u: Unit): BasicActionId | null =>
  u.kind === 'member' ? MEMBERS[u.def].action : null;

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

/**
 * The reach rule (AH P3, Hop and long Touch): passing over the tile next to `from` toward `dir` is
 * allowed over a unit, jar, cloud, lingering state, water, a drop or a cut, but not over a tile
 * that blocks units (plates, Walls, kettles, skid plates, lock gates, grates).
 */
export function reachOver(s: BattleState, from: Coord, dir: Dir): boolean {
  const mid = step(from, dir);
  return inBoard(s, mid) && !blocksUnits(tileAt(s, mid));
}
