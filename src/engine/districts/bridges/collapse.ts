import { arrive, hasTrait } from '../../arrival';
import { type Ctx, emit, ref, withOrigin } from '../../ctx';
import { type Coord, sameCoord } from '../../grid';
import { removeFromRoom, SEAM_DROP_RULE } from '../../outOfRoom';
import { coordOf, isAlive, isOpen, tileAt, unitAt } from '../../queries';
import type { BattleState, Origin, Unit } from '../../types';
import { cracksOf } from './support';
import {
  type BridgesState,
  type CollapseEvent,
  type CutOrigin,
  KEYSTONE_PIECE,
  parseBridges,
  tileKey,
} from './types';

/**
 * P4, P5, P6: the dusk collapse (`late` slot). Every cracked span tile, and a keystone that has
 * shattered, falls with whatever stands on it. Members leave the room, minions are gone, an elite
 * takes the drop and is set on the nearest standing tile, fliers are untouched. The tile becomes
 * fog (a drop tile), so pushes, Brink and Mortar already treat it as an edge. A foe that falls is
 * a `dropped` event credited to the origin of the cut, which is what The Long Drop reads.
 */

declare module '$engine/arrival' {
  interface ArrivalCauses {
    'bridges:fall': 'landing';
  }
}
export const FALL_CAUSE = 'bridges:fall' as const;

const key = (c: Coord) => tileKey(c.x, c.y);

/** The tiles that fall this dusk, in reading order: cracked spans and a shattered keystone. */
export function fallingTiles(s: BattleState, own: BridgesState): Coord[] {
  const out = cracksOf(s, own);
  s.tiles.forEach((t, i) => {
    const at = coordOf(s, i);
    if (t.piece?.id === KEYSTONE_PIECE && own.stone[key(at)] === 0) out.push(at);
  });
  return out.sort((a, b) => a.y - b.y || a.x - b.x);
}

/** The living, grounded units standing on the falling tiles (fliers are untouched). */
export function fallersOn(s: BattleState, falling: readonly Coord[]): { unit: Unit; at: Coord }[] {
  const out: { unit: Unit; at: Coord }[] = [];
  for (const at of falling) {
    const u = unitAt(s, at);
    if (u && isAlive(u) && !hasTrait(u, 'flies')) out.push({ unit: u, at });
  }
  return out;
}

/** Who cut the group of falling tiles `at` belongs to: the first recorded cut in it, else the room. */
function originAt(at: Coord, falling: readonly Coord[], cuts: BridgesState['cuts']): CutOrigin {
  const group = new Set<string>([key(at)]);
  const queue = [at];
  for (let c = queue.pop(); c; c = queue.pop()) {
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ] as const) {
      const n = falling.find((f) => f.x === c.x + dx && f.y === c.y + dy);
      if (n && !group.has(key(n))) {
        group.add(key(n));
        queue.push(n);
      }
    }
  }
  const credited = falling.find((f) => group.has(key(f)) && cuts[key(f)]?.by);
  return (credited && cuts[key(credited)]) ?? cuts[key(at)] ?? { by: null, cause: 'crush' };
}

/** The nearest tile an elite can stand on after the fall: not falling, not fog, not water. */
function landingFor(
  s: BattleState,
  from: Coord,
  falling: ReadonlySet<string>,
  id: string,
): Coord | null {
  let best: Coord | null = null;
  let bestD = Number.POSITIVE_INFINITY;
  s.tiles.forEach((t, i) => {
    const at = coordOf(s, i);
    if (falling.has(key(at)) || t.terrain.drop || t.terrain.water) return;
    if (!isOpen(s, at, id) || t.piece?.id === KEYSTONE_PIECE) return;
    const d = Math.abs(at.x - from.x) + Math.abs(at.y - from.y);
    if (d < bestD) {
      best = at;
      bestD = d;
    }
  });
  return best;
}

export function collapseStep(ctx: Ctx, own: BridgesState): BridgesState {
  const state = parseBridges(own);
  const falling = fallingTiles(ctx.s, state);
  if (!falling.length) return state;
  const keys = new Set(falling.map(key));
  const origins = new Map(falling.map((f) => [key(f), originAt(f, falling, state.cuts)]));
  const fallers = fallersOn(ctx.s, falling);
  const ev: CollapseEvent = {
    type: 'bridges:collapse',
    data: {
      tiles: falling.map((c) => ({ x: c.x, y: c.y })),
      units: fallers.map((f) => f.unit.id),
      epilogue: false,
    },
  };
  emit(ctx, ev);
  for (const at of falling) {
    const t = tileAt(ctx.s, at);
    t.piece = null;
    t.state = null;
    t.jar = null;
    t.hot = 0;
    delete t.brassHot;
    t.terrain = { ...t.terrain, drop: true };
  }
  const seam = Object.hasOwn(ctx.s.rules ?? {}, SEAM_DROP_RULE);
  for (const { unit, at } of fallers) {
    const by = origins.get(key(at))?.by ?? null;
    const origin: Origin | null = by ? { caster: by, spell: '0,0', cast: ctx.s.castSeq } : null;
    withOrigin(ctx, origin, () => {
      if (unit.kind === 'enemy' && !seam) {
        emit(ctx, { type: 'dropped', unit: ref(unit, at), at: { ...at }, elite: unit.elite });
      }
      removeFromRoom(ctx, unit, 'fell');
    });
    if (unit.kind !== 'enemy' || !unit.elite || !isAlive(unit)) continue;
    const to = landingFor(ctx.s, at, keys, unit.id);
    if (!to || sameCoord(to, unit.pos)) continue;
    emit(ctx, {
      type: 'moved',
      unit: ref(unit),
      from: { ...unit.pos },
      to: { ...to },
      path: [{ ...to }],
      cause: FALL_CAUSE,
    });
    arrive(ctx, unit.id, [to], { cause: FALL_CAUSE, origin: null, landing: true });
  }
  const next: BridgesState = { ...state, stone: { ...state.stone }, cuts: { ...state.cuts } };
  for (const k of keys) {
    delete next.stone[k];
    delete next.cuts[k];
  }
  return next;
}
