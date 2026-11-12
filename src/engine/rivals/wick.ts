import { type Ctx, emit, ref } from '../ctx';
import type { Coord } from '../grid';
import { openJar } from '../jars';
import { coordOf, findUnit, unitAt } from '../queries';
import type { BattleState, EnemyUnit, Jar, JarId, UnitId } from '../types';
import type { LockLost, ObjectRef, Telegraph, TrickDef, TrickMark, TrickPlan } from './types';

/**
 * The long wick (rivals §2, plan RV-3): an action trick that opens one of the rival's own jars from
 * afar. It is an object lock, not a spell aim. The intent names the jar by its id (FD-5), so drift
 * and Draw carry the order with the jar. If the jar is opened early, erased, crumbles or stops
 * being his, the order fails (`orderFails`, starved): it never switches to a replacement and never
 * opens twice. Opening is the ordinary `openJar`: contents, origin and reactions, harm to the
 * rival and his allies included. No charge is spent; the jar's step trigger stays live throughout.
 */

export const LONG_WICK_ID = 'canals:longWick';

/** Where a jar stands now, found by id (jars have no stable tile). */
export function jarLocation(s: BattleState, id: JarId): { at: Coord; jar: Jar } | null {
  for (let i = 0; i < s.tiles.length; i++) {
    const jar = s.tiles[i]?.jar;
    if (jar?.id === id) return { at: coordOf(s, i), jar };
  }
  return null;
}

/** The jars `owner` holds, oldest first. */
export function jarsOwnedBy(s: BattleState, owner: UnitId): JarId[] {
  const out: JarId[] = [];
  for (const t of s.tiles) if (t.jar?.owner === owner && t.jar.id !== undefined) out.push(t.jar.id);
  return out.sort((a, b) => a - b);
}

export type LockCheck = { ok: true; at: Coord; jar: Jar } | { ok: false; why: LockLost };

/**
 * Whether the wick's order still holds. The state keeps no history of what happened to a jar, so
 * a missing jar is told apart by what is left behind: the Erase record names it (erased), a newer
 * jar of his means the old one crumbled under it, and otherwise it was opened.
 */
export function lockStatus(s: BattleState, owner: UnitId, id: JarId): LockCheck {
  const found = jarLocation(s, id);
  if (found) {
    return found.jar.owner === owner
      ? { ok: true, at: found.at, jar: found.jar }
      : { ok: false, why: 'ownerChanged' };
  }
  const erased = s.erased?.entries.some((en) =>
    en.parts.some((p) => p.kind === 'jar' && p.jar.id === id),
  );
  if (erased) return { ok: false, why: 'erased' };
  const u = findUnit(s, owner);
  const noted = u?.kind === 'enemy' ? u.rival?.jarsLost?.[id] : undefined;
  if (noted) return { ok: false, why: noted };
  if (jarsOwnedBy(s, owner).some((other) => other > id)) return { ok: false, why: 'crumbled' };
  return { ok: false, why: 'opened' };
}

const jarOf = (lock: ObjectRef | null): JarId | null => (lock?.kind === 'jar' ? lock.id : null);

/**
 * The wick's own part, once the trick hooks (`tricks.ts` `resolveTrickAction`) have checked the
 * lock: the jar is still his and was not sealed this phase. It opens it where it stands now.
 */
function resolveWick(ctx: Ctx, unit: EnemyUnit, lock: ObjectRef | null): void {
  const id = jarOf(lock);
  const found = id === null ? null : jarLocation(ctx.s, id);
  if (!found) {
    emit(ctx, { type: 'idle', unit: ref(unit) });
    return;
  }
  openJar(ctx, found.at);
}

const isPlan = (shown: TrickPlan | TrickMark): shown is TrickPlan => 'lock' in shown;

/**
 * The long wick, registered through the canals module's `tricks` (RV-14): one candidate
 * per jar he owns, oldest first. Its lock rules are the generic object lock.
 */
export const LONG_WICK: TrickDef = {
  id: LONG_WICK_ID,
  name: 'the long wick',
  init: () => null,
  action: {
    plan: (state, unit) =>
      jarsOwnedBy(state, unit.id).map((id): TrickPlan => ({ lock: { kind: 'jar', id }, data: {} })),
    resolve: (ctx, unit, intent, own) => {
      resolveWick(ctx, unit, intent.lock);
      return own;
    },
  },
  draw(state, _unit, shown): Telegraph {
    const id = isPlan(shown) ? jarOf(shown.lock) : null;
    const found = id === null ? null : jarLocation(state, id);
    const standing = found ? unitAt(state, found.at) : null;
    return {
      label: 'the long wick',
      tiles: found ? [found.at] : [],
      units: standing ? [standing.id] : [],
      ...(id === null ? {} : { objects: [{ kind: 'jar', id }] }),
    };
  },
  describe: () => 'opens his jar from afar',
};
