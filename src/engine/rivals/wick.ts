import { type Ctx, emit, ref } from '../ctx';
import type { Coord } from '../grid';
import { openJar } from '../jars';
import { coordOf, unitAt } from '../queries';
import type { BattleState, EnemyUnit, Jar, JarId, RivalIntent, UnitId } from '../types';
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
  if (jarsOwnedBy(s, owner).some((other) => other > id)) return { ok: false, why: 'crumbled' };
  return { ok: false, why: 'opened' };
}

/** A jar sealed earlier in this resolve phase (the log since the last `phase` event). */
function sealedThisTurn(ctx: Ctx, id: JarId): boolean {
  for (let i = ctx.log.length - 1; i >= 0; i--) {
    const e = ctx.log[i];
    if (e?.type === 'phase') return false;
    if (e?.type === 'jarSealed' && e.id === id) return true;
  }
  return false;
}

const jarOf = (lock: ObjectRef | null): JarId | null => (lock?.kind === 'jar' ? lock.id : null);

function resolveWick(
  ctx: Ctx,
  unit: EnemyUnit,
  intent: Extract<RivalIntent, { kind: 'trick' }>,
): void {
  const id = jarOf(intent.lock);
  if (id === null) {
    emit(ctx, { type: 'idle', unit: ref(unit) });
    return;
  }
  const object: ObjectRef = { kind: 'jar', id };
  const check = lockStatus(ctx.s, unit.id, id);
  // Placed and opened in one turn is illegal: a jar sealed in this resolve phase waits a turn.
  if (check.ok && sealedThisTurn(ctx, id)) {
    emit(ctx, { type: 'orderFails', unit: ref(unit), object, why: 'gone' });
    return;
  }
  if (!check.ok) {
    emit(ctx, { type: 'orderFails', unit: ref(unit), object, why: check.why });
    return;
  }
  openJar(ctx, check.at);
}

const isPlan = (shown: TrickPlan | TrickMark): shown is TrickPlan => 'lock' in shown;

/** The long wick as a `TrickDef`: one candidate per jar he owns, oldest first. */
export const LONG_WICK: TrickDef = {
  id: LONG_WICK_ID,
  name: 'the long wick',
  init: () => null,
  action: {
    plan: (state, unit) =>
      jarsOwnedBy(state, unit.id).map((id): TrickPlan => ({ lock: { kind: 'jar', id }, data: {} })),
    resolve: (ctx, unit, intent, own) => {
      resolveWick(ctx, unit, intent);
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
