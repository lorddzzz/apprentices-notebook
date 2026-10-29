import { hasTrait } from '../../arrival';
import { emit, ref } from '../../ctx';
import { who } from '../../events';
import { type Coord, label } from '../../grid';
import type { HarmGuard, HarmVerdict } from '../../harm';
import { coordOf, findUnit, isAlive, tileAt, unitAt } from '../../queries';
import type { BattleState, Unit } from '../../types';
import type {
  BoardRule,
  DistrictEvent,
  DistrictEventDef,
  PieceDef,
  PieceId,
  RuleId,
} from '../types';
import {
  ADDRESS_PIECE,
  FORWARD_DEF,
  FORWARD_PIECE,
  type ForwardedEvent,
  type PairData,
} from './types';

/**
 * Forwarding (ink-quarter plan P3; IQ-2). While a unit stands on a `{forward:a}` stamp, the first
 * hit or mark aimed at it each round lands on the unit standing on `{address:a}` instead. An empty
 * address means it lands normally and the stamp is not used up. A forwarded hit is never forwarded
 * again (the harm guards do not guard a redirect), and keeps the original cast's origin, so credit
 * and release headings are the original's. The stamps used this round live in the
 * `inkQuarter:forwards` rule's state; its `late` step clears them at dusk.
 */

export const FORWARDS_RULE_ID: RuleId = 'inkQuarter:forwards';
export const FORWARD_GUARD_ID = 'inkQuarter:forward';

/** The stamps (by tile, `"x,y"`) that already forwarded a hit this round. */
export type ForwardsState = { used: string[] };

const keyOf = (c: Coord): string => `${c.x},${c.y}`;

const forwardsState = (s: BattleState): ForwardsState => {
  const raw = s.rules?.[FORWARDS_RULE_ID] as ForwardsState | undefined;
  return raw && Array.isArray(raw.used) ? raw : { used: [] };
};

/** The stamp's pair letter under `unit`, or null when it stands on no stamp. */
function stampUnder(s: BattleState, unit: Unit): string | null {
  const p = tileAt(s, unit.pos).piece;
  return p?.id === FORWARD_PIECE ? (p.data as PairData).pair : null;
}

/**
 * The unit on the address tile paired with `pair` (the first such tile in reading order), or null
 * when no tile is addressed, it is empty, or the one standing there is `unit` itself.
 */
export function addresseeOf(s: BattleState, pair: string, unit: Unit): Unit | null {
  for (let i = 0; i < s.tiles.length; i++) {
    const p = s.tiles[i]?.piece;
    if (p?.id !== ADDRESS_PIECE || (p.data as PairData).pair !== pair) continue;
    const to = unitAt(s, coordOf(s, i));
    return to && to.id !== unit.id && isAlive(to) ? to : null;
  }
  return null;
}

/**
 * Where a hit or mark aimed at `unit` would go (P3): the addressee, or null when it lands on
 * `unit` (no stamp, anchored, spent this round, empty address). Pure: previews read it.
 */
export function forwardTarget(s: BattleState, unit: Unit): Unit | null {
  if (!isAlive(unit) || hasTrait(unit, 'anchored')) return null;
  const pair = stampUnder(s, unit);
  if (pair === null) return null;
  if (forwardsState(s).used.includes(keyOf(unit.pos))) return null;
  return addresseeOf(s, pair, unit);
}

/** The harm guard: spends the stamp, logs `forwarded`, redirects (to a hit or mark, unguarded). */
export const FORWARD_GUARD: HarmGuard = {
  id: FORWARD_GUARD_ID,
  kinds: ['hit', 'mark'],
  run(ctx, harm): HarmVerdict {
    if (harm.kind === 'push' || (harm.kind === 'hit' && harm.amount <= 0)) return { kind: 'pass' };
    const unit = findUnit(ctx.s, harm.unit);
    const to = unit ? forwardTarget(ctx.s, unit) : null;
    if (!unit || !to) return { kind: 'pass' };
    const st = forwardsState(ctx.s);
    ctx.s.rules = { ...ctx.s.rules, [FORWARDS_RULE_ID]: { used: [...st.used, keyOf(unit.pos)] } };
    const forwarded: ForwardedEvent = {
      type: 'inkQuarter:forwarded',
      unit: ref(unit),
      at: { ...to.pos },
      data: {
        to: to.id,
        stamp: { ...unit.pos },
        harm: harm.kind,
        amount: harm.kind === 'hit' ? harm.amount : 0,
      },
    };
    emit(ctx, forwarded);
    return { kind: 'redirect', to: to.id };
  },
};

/** The stamp with its rule; the address is a plain base piece. */
export const FORWARD_WRIT_DEF: PieceDef = { ...FORWARD_DEF, rules: [FORWARDS_RULE_ID] };

/** Dusk: every stamp may forward once more. Stateless otherwise. */
export const FORWARDS_RULE: BoardRule<ForwardsState> = {
  id: FORWARDS_RULE_ID,
  slot: 'late',
  order: 1,
  scope: 'piece',
  activatedBy: { kind: 'piece', pieces: [FORWARD_PIECE] },
  init: () => ({ used: [] }),
  step: () => ({ used: [] }),
};

/** IQ-2's pieces by id, swapped in for the base defs. */
export const FORWARD_PIECES: Readonly<Record<PieceId, PieceDef>> = {
  [FORWARD_PIECE]: FORWARD_WRIT_DEF,
};

const toCoord = (v: unknown): Coord | null => {
  const r = v as { x?: unknown; y?: unknown } | null;
  return r && typeof r.x === 'number' && typeof r.y === 'number' ? { x: r.x, y: r.y } : null;
};

/** "the stamp at C1 forwards the hit on rat at C1 to E1" (the damage or mark line names the addressee). */
export const FORWARD_EVENT_LINES: Readonly<Record<string, DistrictEventDef>> = {
  'inkQuarter:forwarded': {
    type: 'inkQuarter:forwarded',
    describe: (e: DistrictEvent) => {
      const data = e.data as { harm?: unknown; stamp?: unknown } | undefined;
      const harm = data?.harm === 'mark' ? 'mark' : 'hit';
      const stamp = toCoord(data?.stamp);
      const to = e.at ? ` to ${label(e.at)}` : '';
      const on = e.unit ? ` on ${who(e.unit)}` : '';
      return `the stamp${stamp ? ` at ${label(stamp)}` : ''} forwards the ${harm}${on}${to}`;
    },
  },
};
