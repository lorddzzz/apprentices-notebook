import { type Ctx, emit, ref } from '../../ctx';
import { isAlive } from '../../queries';
import { trickResists } from '../../rivals/tricks';
import type { BattleState, Unit } from '../../types';
import { COLLAPSE_RULE_ID, KEYSTONE_PIECE, parseBridges, type ResistKind, tileKey } from './types';

/**
 * P17, the stand-in form of the Chief Warden's right of way: a flagged unit is unmoved by a push,
 * a hold and a fall while the keystone has HP, and ordinary once it breaks. The flag is a list of
 * unit ids in a rule state of its own (no unit field, no registered rule); nobody carries it
 * today, so every existing fight is unchanged. BR-20 swaps this for the rival trick's `resists`.
 */
export const RIGHT_OF_WAY_RULE = 'bridges:rightOfWay';

const idsOf = (s: BattleState): readonly string[] => {
  const raw = s.rules?.[RIGHT_OF_WAY_RULE];
  return Array.isArray(raw) ? raw.filter((v): v is string => typeof v === 'string') : [];
};

/** Gives `unit` right of way for this fight (BR-11's heart setup, tests). */
export function grantRightOfWay(s: BattleState, unit: string): void {
  if (idsOf(s).includes(unit)) return;
  s.rules = { ...s.rules, [RIGHT_OF_WAY_RULE]: [...idsOf(s), unit] };
}

/** Whether the keystone stands: a keystone tile whose stone is above 0. */
function keystoneStands(s: BattleState): boolean {
  const own = parseBridges(s.rules?.[COLLAPSE_RULE_ID]);
  return s.tiles.some((t, i) => {
    if (t.piece?.id !== KEYSTONE_PIECE) return false;
    return (own.stone[tileKey(i % s.width, Math.floor(i / s.width))] ?? 0) > 0;
  });
}

/** Cheap and silent: does the unit hold right of way right now? */
export function hasRightOfWay(s: BattleState, unit: Unit): boolean {
  if (!s.rules || !Object.hasOwn(s.rules, RIGHT_OF_WAY_RULE)) return false;
  return idsOf(s).includes(unit.id) && isAlive(unit) && keystoneStands(s);
}

/** The hook the push, hold and fall sites call: true (the refusal logged) when it holds. */
export function resists(ctx: Ctx, unit: Unit, what: ResistKind): boolean {
  if (!hasRightOfWay(ctx.s, unit)) return false;
  emit(ctx, {
    type: 'bridges:trickResists',
    unit: ref(unit),
    at: { ...unit.pos },
    data: { trick: RIGHT_OF_WAY_RULE, what },
  });
  return true;
}

/** Every hold site asks this: a rival's immunity or right of way refuses the hold (the refusal logged). */
export function refusesHold(ctx: Ctx, unit: Unit): boolean {
  return trickResists(ctx, unit, 'hold') || resists(ctx, unit, 'hold');
}
