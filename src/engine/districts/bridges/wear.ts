import { type Ctx, emit } from '../../ctx';
import type { Coord } from '../../grid';
import type { Origin } from '../../types';
import type { StruckBy, TilePiece } from '../types';
import { cracksOf } from './support';
import {
  type BridgesState,
  COLLAPSE_RULE_ID,
  type CrackedEvent,
  type CutOrigin,
  KEYSTONE_PIECE,
  type KeystoneBreaksEvent,
  parseBridges,
  type StoneWornEvent,
  tileKey,
} from './types';

/**
 * P3, P7: wear. A crush (`push` strike) or a non-fire burst (`burst` strike) on a span tile or the
 * keystone wears 1 stone (keystone: 1 HP). At 0 the tile is broken: recorded in `cuts` with who cut
 * it, out of the network at once (the cracked set is derived), and any section it leaves without a
 * pier is announced in `bridges:cracked`. Fire, damage, Spark and Shove do not wear. Nothing falls
 * here: the fall is BR-3's `late` step.
 */
const CAUSE: Partial<Record<StruckBy, CutOrigin['cause']>> = { push: 'crush', burst: 'burst' };

const key = (c: Coord) => tileKey(c.x, c.y);

export function wearStruck(
  ctx: Ctx,
  where: Coord,
  piece: TilePiece,
  by: StruckBy,
  origin: Origin | null,
): void {
  const cause = CAUSE[by];
  if (!cause) return;
  const own = parseBridges(ctx.s.rules?.[COLLAPSE_RULE_ID]);
  const k = key(where);
  const from = own.stone[k];
  if (from === undefined || from <= 0) return;
  const who = origin?.caster ?? null;
  const before = new Set(cracksOf(ctx.s, own).map(key));
  const next: BridgesState = { ...own, stone: { ...own.stone, [k]: from - 1 } };
  const broken = from - 1 === 0;
  if (broken) {
    next.cuts = {
      ...own.cuts,
      [k]: { by: who, cause: piece.id === KEYSTONE_PIECE ? 'shatter' : cause },
    };
  }
  ctx.s.rules = { ...ctx.s.rules, [COLLAPSE_RULE_ID]: next };
  const worn: StoneWornEvent = {
    type: 'bridges:stoneWorn',
    at: { ...where },
    data: { from, to: from - 1, cause, by: who },
  };
  emit(ctx, worn);
  if (broken && piece.id === KEYSTONE_PIECE) {
    const ev: KeystoneBreaksEvent = {
      type: 'bridges:keystoneBreaks',
      at: { ...where },
      data: { by: who },
    };
    emit(ctx, ev);
  }
  const fresh = cracksOf(ctx.s, next).filter((c) => !before.has(key(c)));
  if (fresh.length) {
    const ev: CrackedEvent = {
      type: 'bridges:cracked',
      data: { tiles: fresh.map((c) => ({ x: c.x, y: c.y })) },
    };
    emit(ctx, ev);
  }
}
