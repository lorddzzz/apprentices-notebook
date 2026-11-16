import { CARTOGRAPHERS_FOE_IDS } from '$data/districts/cartographers/types';
import { PULL_IN, REGISTRAR_TRICK_ID, REGISTRAR_TUNING, RUB_OUT } from '$data/rivals/registrar';
import { type Ctx, emit, ref } from '../../ctx';
import { byReadingOrder, type Coord, chebyshev, sameCoord } from '../../grid';
import { removeFromRoom } from '../../outOfRoom';
import { enemies, findUnit, isAlive, members, unitAt } from '../../queries';
import { detailOf } from '../../rivals/goals';
import type { GoalDef, Outcome, TrickDef, TrickMark } from '../../rivals/types';
import type { BattleState, EnemyUnit, Origin, Unit } from '../../types';
import type { Json } from '../types';
import type { CircledEvent, StruckEvent } from './types';

/**
 * *Strike from the register* (cartographers-plan P10, CG-7): the Registrar's trick. Each round he
 * shows one circle (two below half his HP) on a unit's tile, aims locked at the telegraph: the
 * circle is the *tile*, drawn from his mark, and it stays there whoever moves. Each circle is
 * `{ at, holder }`, held by the nearest living guild hand when it was drawn, else by the Registrar.
 * A circle is the trick's own plain data (never a piece: a tile may hold pencil), in the shown
 * mark's data until the round resolves and in the trick's state from then until round end, when
 * whoever still stands on a circled tile is erased from the fight and the circles clear.
 *
 * Lifted by: an Erase on the tile (`registrarEraseAt`, the module's `eraseAt`), nobody standing
 * there when it counts (the unit moved off), or the death of its holder (checked where it counts,
 * so a hand killed during the player's turn lifts its circle at the resolve). His own death takes
 * the mark and the circles with him.
 */

/** One circle: its tile and the unit whose death lifts it. */
export type Circle = { at: { x: number; y: number }; holder: string };
export type RegisterState = { circles: Circle[] };

const num = (v: Json | undefined): number | null => (typeof v === 'number' ? v : null);
const obj = (v: Json | undefined): { readonly [k: string]: Json } | null =>
  v && typeof v === 'object' && !Array.isArray(v) ? (v as { readonly [k: string]: Json }) : null;

/** The circles a mark's or state's data carries, read forgivingly (a hand-built Lab state). */
function circlesIn(data: Json | undefined): Circle[] {
  const raw = obj(data)?.circles;
  if (!Array.isArray(raw)) return [];
  const out: Circle[] = [];
  for (const c of raw) {
    const o = obj(c);
    const at = obj(o?.at);
    const x = num(at?.x);
    const y = num(at?.y);
    if (x !== null && y !== null && typeof o?.holder === 'string')
      out.push({ at: { x, y }, holder: o.holder });
  }
  return out;
}

const registerOf = (own: Json): RegisterState => ({ circles: circlesIn(own) });
const asJson = (circles: readonly Circle[]): Json => ({
  circles: circles.map((c) => ({ at: { ...c.at }, holder: c.holder })),
});

/** The guild's hands (the surveyor, the eraser, the tracer) still standing in the room. */
const isHand = (u: Unit): boolean =>
  u.kind === 'enemy' &&
  !u.out &&
  isAlive(u) &&
  (CARTOGRAPHERS_FOE_IDS as readonly string[]).includes(u.def);

/** Whether the circle's holder still stands: a hand in the room, or the Registrar himself. */
function held(s: BattleState, self: EnemyUnit, c: Circle): boolean {
  if (c.holder === self.id) return isAlive(self);
  const h = findUnit(s, c.holder);
  return !!h && isAlive(h) && !h.out;
}

/** Nearest hand to the circled tile (Chebyshev, then unit order), else the Registrar. */
function holderFor(s: BattleState, self: EnemyUnit, at: Coord): string {
  let best: { id: string; d: number } | null = null;
  for (const u of s.units) {
    if (!isHand(u)) continue;
    const d = chebyshev(u.pos, at);
    if (!best || d < best.d) best = { id: u.id, d };
  }
  return best?.id ?? self.id;
}

/** How many circles he draws: one, two below half his HP. */
export const circleCount = (e: EnemyUnit): number =>
  e.hp * 2 < e.maxHp ? REGISTRAR_TUNING.circlesBelowHalf : REGISTRAR_TUNING.circles;

const living = (u: Unit): boolean => isAlive(u) && !u.out;

function markOf(s: BattleState, self: EnemyUnit): TrickMark | null {
  const near = members(s)
    .filter(living)
    .sort(
      (a, b) =>
        chebyshev(a.pos, self.pos) - chebyshev(b.pos, self.pos) || byReadingOrder(a.pos, b.pos),
    )
    .slice(0, circleCount(self));
  if (!near.length) return null;
  const circles = near.map(
    (m): Circle => ({ at: { ...m.pos }, holder: holderFor(s, self, m.pos) }),
  );
  return { data: asJson(circles), tiles: circles.map((c) => ({ ...c.at })) };
}

/** A living unit on a circled tile other than the Registrar himself. */
const standingOn = (s: BattleState, self: EnemyUnit, at: Coord): Unit | null => {
  const u = unitAt(s, at);
  return u && u.id !== self.id && living(u) ? u : null;
};

export const STRIKE_FROM_THE_REGISTER: TrickDef<RegisterState> = {
  id: REGISTRAR_TRICK_ID,
  name: 'strike from the register',
  /** An Erase that un-draws pencil is no starved cast: it takes the apprentice off the paper. */
  effectEvents: ['cartographers:undrawn'],
  init: () => ({ circles: [] }),
  mark: {
    timing: 'afterActions',
    plan: (s, unit) => markOf(s, unit),
    /** The shown circles become real: held ones stay, a lifted one (holder gone) never forms. */
    resolve(ctx, unit, mark) {
      const circles = circlesIn(mark.data).filter((c) => held(ctx.s, unit, c));
      for (const c of circles) {
        const there = unitAt(ctx.s, c.at);
        const ev: CircledEvent = {
          type: 'cartographers:circled',
          at: { ...c.at },
          unit: ref(unit),
          data: { holder: c.holder, units: there && living(there) ? [there.id] : [] },
        };
        emit(ctx, ev);
      }
      return { circles };
    },
  },
  /** Whoever still stands on a circle at round end goes (the `late` slot: after the guild's hand rule, in `turn.ts`'s order). */
  roundEnd: {
    slot: 'late',
    step(ctx, unit, own) {
      const struck: Unit[] = [];
      const tiles: { x: number; y: number }[] = [];
      for (const c of registerOf(own).circles) {
        const u = held(ctx.s, unit, c) ? standingOn(ctx.s, unit, c.at) : null;
        if (u && !struck.includes(u)) {
          struck.push(u);
          tiles.push({ ...c.at });
        }
      }
      if (struck.length) {
        const ev: StruckEvent = {
          type: 'cartographers:struck',
          unit: ref(unit),
          data: { units: struck.map((u) => u.id), tiles },
        };
        emit(ctx, ev);
      }
      for (const u of struck) removeFromRoom(ctx, u, 'erased');
      return { circles: [] };
    },
  },
  /** He falls: his circles go with him (and his shown mark lapses in `trickDied`). */
  onDeath: () => ({ circles: [] }),
  draw(state, unit, shown) {
    const tiles = 'tiles' in shown ? shown.tiles : [];
    const circles = 'tiles' in shown ? circlesIn(shown.data) : [];
    return {
      label: 'circle',
      tiles,
      units: [...new Set([unit.id, ...circles.map((c) => c.holder)])].filter(
        (id) => !!findUnit(state, id),
      ),
    };
  },
  describe: (shown) => {
    const n = 'tiles' in shown ? shown.tiles.length : 1;
    return n === 1
      ? 'circles a tile in the register; whoever stands there at round end is erased'
      : `circles ${n} tiles in the register; whoever stands there at round end is erased`;
  },
};

/**
 * An Erase landed on `at` (`DistrictModule.eraseAt`): every circle there is lifted, whether still
 * shown or already drawn. The Registrar's own Erase never lifts his circles.
 */
export function registrarEraseAt(ctx: Ctx, at: Coord, origin: Origin | null): void {
  for (const e of enemies(ctx.s)) {
    const r = e.rival;
    if (!r || !isRegistrar(e) || !isAlive(e) || origin?.caster === e.id) continue;
    const shown = circlesIn(r.mark?.data);
    const drawn = registerOf(r.trick).circles;
    const lifted = [...shown, ...drawn].filter((c) => sameCoord(c.at, at));
    if (!lifted.length) continue;
    if (r.mark) {
      const left = shown.filter((c) => !sameCoord(c.at, at));
      r.mark = left.length ? { data: asJson(left), tiles: left.map((c) => ({ ...c.at })) } : null;
    }
    r.trick = asJson(drawn.filter((c) => !sameCoord(c.at, at)));
    emit(ctx, {
      type: 'cartographers:trickObjectGone',
      unit: ref(e),
      at: { ...at },
      data: { trick: REGISTRAR_TRICK_ID, id: 0, why: 'erased' },
    });
  }
}

const isRegistrar = (e: EnemyUnit): boolean => e.rival?.rival === 'registrar';

// ── His routine goals ───────────────────────────────────

const clean = (o: Outcome): boolean => o.effect && o.selfHarm === 0 && o.allyHarm === 0;

/** Rub out: any cast that takes something off the board (a setup, a mark, the pencil), and costs him nothing. */
const rubOut: GoalDef = {
  id: RUB_OUT,
  accepts: (o) => clean(o),
  score: (o) => detailOf(o).partyTouched * 10 + o.partyHarm,
};

/** Pull in: a swap that moves an apprentice, and costs him nothing. */
const pullIn: GoalDef = {
  id: PULL_IN,
  accepts: (o) => clean(o) && detailOf(o).moves.some((m) => m.member),
  score: (o) => detailOf(o).moves.filter((m) => m.member).length,
};

export const REGISTRAR_GOALS: readonly GoalDef[] = [rubOut, pullIn];
