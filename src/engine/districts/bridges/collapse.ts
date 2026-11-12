import { TUNING } from '$data';
import { arrive, hasTrait } from '../../arrival';
import { markUnit } from '../../bursts';
import { type Ctx, emit, ref, withLine, withOrigin } from '../../ctx';
import { dealDamage } from '../../damage';
import { hasFootnote } from '../../footnotes';
import { type Coord, sameCoord } from '../../grid';
import { layThinCloud } from '../../mix';
import { isBrass } from '../../networks';
import { removeFromRoom, SEAM_DROP_RULE } from '../../outOfRoom';
import { blocksUnits, coordOf, inBoard, isAlive, isOpen, tileAt, unitAt } from '../../queries';
import { noteJarFate } from '../../rivals/jarFate';
import { trickResists } from '../../rivals/tricks';
import { replayFallen } from '../../schedule';
import type { BattleState, EnemyUnit, Layer, Origin, Unit, UnitId } from '../../types';
import { epilogueFall } from './heart';
import { holdsRightOfWay } from './keystoneRight';
import { cracksOf } from './support';
import {
  type BridgesState,
  COLLAPSE_RULE_ID,
  type CollapseEvent,
  type CutOrigin,
  KEYSTONE_PIECE,
  parseBridges,
  SPAN_PIECE,
  sortKeys,
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

/** The nearest bare standing tile for a cloud (`lay-cracked-cloud`): not falling, not fog, no layer. */
function nearestBare(s: BattleState, from: Coord, falling: ReadonlySet<string>): Coord | null {
  let best: Coord | null = null;
  let bestD = Number.POSITIVE_INFINITY;
  s.tiles.forEach((t, i) => {
    const at = coordOf(s, i);
    if (falling.has(key(at)) || t.terrain.drop || t.terrain.water || t.state || blocksUnits(t))
      return;
    const d = Math.abs(at.x - from.x) + Math.abs(at.y - from.y);
    if (d < bestD) {
      best = at;
      bestD = d;
    }
  });
  return best;
}

/**
 * The Hold footnotes that act before the fall, in bridges.md §8's order: `hold-cracked-spare` and
 * `hold-cap-hang` set a held unit on the nearest standing tile (the former only for a member), then
 * `hold-cracked-lean` spares a tile whose occupant is held, once (the span piece remembers it).
 * `fallingTiles` stays the one selection; these only take tiles out of what falls.
 */
function holdAtDusk(ctx: Ctx, falling: Coord[]): Coord[] {
  const hang = hasFootnote(ctx, 'hold-cap-hang');
  const spare = hasFootnote(ctx, 'hold-cracked-spare');
  const lean = hasFootnote(ctx, 'hold-cracked-lean');
  if (!hang && !spare && !lean) return falling;
  const keys = new Set(falling.map(key));
  for (const { unit, at } of fallersOn(ctx.s, falling)) {
    if (unit.held <= 0 || !(hang || (spare && unit.kind === 'member'))) continue;
    const to = landingFor(ctx.s, at, keys, unit.id);
    if (!to) continue;
    withLine(ctx, 'hold:cracked', () => {
      emit(ctx, {
        type: 'moved',
        unit: ref(unit),
        from: { ...unit.pos },
        to: { ...to },
        path: [{ ...to }],
        cause: FALL_CAUSE,
      });
      arrive(ctx, unit.id, [to], { cause: FALL_CAUSE, origin: null, landing: true });
    });
  }
  if (!lean) return falling;
  return falling.filter((at) => {
    const u = unitAt(ctx.s, at);
    const piece = tileAt(ctx.s, at).piece;
    const data = (piece?.data ?? {}) as Record<string, unknown>;
    if (!u || !isAlive(u) || hasTrait(u, 'flies') || u.held <= 0) return true;
    if (!piece || piece.id !== SPAN_PIECE || data.leaned === true) return true;
    piece.data = { ...data, leaned: true } as typeof piece.data;
    // The held unit is stamped again: the stone waits one more dusk.
    withLine(ctx, 'hold:cracked', () => emit(ctx, { type: 'held', unit: ref(u), rounds: u.held }));
    return false;
  });
}

/** `lay-cracked-last`: the lost layer's step on the unit that falls with it (fire, a brand cloud, a scalding cloud). */
function lastWord(ctx: Ctx, layer: Layer, unit: Unit, at: Coord): void {
  withOrigin(ctx, layer.origin, () =>
    withLine(ctx, 'lay:cracked', () => {
      if (layer.id === 'fire') {
        dealDamage(ctx, unit, TUNING.fireDamage, 'Fire', [], { heading: null, at: { ...at } });
      } else if (layer.id === 'brandCloud' && !unit.mark) {
        markUnit(ctx, unit, layer.origin);
      } else if (layer.scalds) {
        dealDamage(ctx, unit, 1, 'Scald', [], { heading: null, at: { ...at }, harm: 'steam' });
      }
    }),
  );
}

/** Epilogues asked for while a collapse step is still looping: run once it has finished (P7). */
const stepping = new WeakSet<Ctx>();
const deferred = new Map<Ctx, EnemyUnit>();

/** The chief's death calls this: now, or after the collapse step in progress (no stale tiles). */
export function whenCollapseDone(ctx: Ctx, chief: EnemyUnit, run: () => void): void {
  if (!stepping.has(ctx)) run();
  else deferred.set(ctx, chief);
}

export function collapseStep(ctx: Ctx, own: BridgesState): BridgesState {
  stepping.add(ctx);
  try {
    return collapseOnce(ctx, own);
  } finally {
    stepping.delete(ctx);
    const chief = deferred.get(ctx);
    if (chief) {
      deferred.delete(ctx);
      epilogueFall(ctx, chief);
    }
  }
}

function collapseOnce(ctx: Ctx, own: BridgesState): BridgesState {
  const state = parseBridges(own);
  let falling = fallingTiles(ctx.s, state);
  if (!falling.length) return state;
  // P17: right of way means he never falls; with nowhere to be set down, his tile stays standing.
  const spared = new Set<string>();
  const allKeys = new Set(falling.map(key));
  for (const { unit, at } of fallersOn(ctx.s, falling)) {
    if (holdsRightOfWay(ctx.s, unit) && !landingFor(ctx.s, at, allKeys, unit.id))
      spared.add(key(at));
  }
  if (spared.size) {
    falling = falling.filter((c) => !spared.has(key(c)));
    for (const u of ctx.s.units) {
      if (isAlive(u) && spared.has(key(u.pos))) trickResists(ctx, u, 'fall');
    }
    if (!falling.length) return state;
  }
  falling = holdAtDusk(ctx, falling);
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
  // BR-17: a Lay'd layer set into a falling tile goes with it.
  const setIn = falling.filter((at) => tileAt(ctx.s, at).state?.set === true);
  const lost = new Map(setIn.map((at) => [key(at), structuredClone(tileAt(ctx.s, at).state)]));
  if (setIn.length) {
    withLine(ctx, 'lay:cracked', () =>
      emit(ctx, { type: 'stateFades', tiles: setIn.map((c) => ({ ...c })) }),
    );
  }
  // `chalk-network-ring`: the brass that falls is remembered, read before the tile is cleared.
  const brass = hasFootnote(ctx, 'chalk-network-ring')
    ? falling.filter((at) => isBrass(ctx.s, at)).map(key)
    : [];
  for (const at of falling) {
    const t = tileAt(ctx.s, at);
    if (t.jar) noteJarFate(ctx, t.jar, 'crumbled');
    if (t.jar) emit(ctx, { type: 'jarCrumbles', at: { ...at }, ...(t.jar.id === undefined ? {} : { id: t.jar.id }) });
    t.piece = null;
    t.state = null;
    t.jar = null;
    t.hot = 0;
    delete t.brassHot;
    t.terrain = { ...t.terrain, drop: true };
  }
  // `lay-cracked-cloud`: each lost layer leaves a 1-round plain cloud on the nearest standing tile.
  if (hasFootnote(ctx, 'lay-cracked-cloud')) {
    for (const at of setIn) {
      const to = nearestBare(ctx.s, at, keys);
      if (to)
        withLine(ctx, 'lay:cracked', () =>
          layThinCloud(ctx, to, lost.get(key(at))?.origin ?? null, 1),
        );
    }
  }
  const seam = Object.hasOwn(ctx.s.rules ?? {}, SEAM_DROP_RULE);
  const fell: { unit: UnitId; at: Coord }[] = [];
  for (const { unit, at } of fallers) {
    // P17 right of way: he does not fall; he is set on the nearest standing tile, unhurt.
    const held = trickResists(ctx, unit, 'fall');
    if (held) {
      const to = landingFor(ctx.s, at, keys, unit.id);
      if (to && !sameCoord(to, unit.pos)) {
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
      continue;
    }
    fell.push({ unit: unit.id, at });
    const by = origins.get(key(at))?.by ?? null;
    const origin: Origin | null = by ? { caster: by, spell: '0,0', cast: ctx.s.castSeq } : null;
    const gone = lost.get(key(at));
    if (gone && hasFootnote(ctx, 'lay-cracked-last') && isAlive(unit))
      lastWord(ctx, gone, unit, at);
    // `hold-cap-crush`: a foe you held takes the fall as a crush too (a minion is gone either way;
    // an elite takes it on top of the drop). A member held by a foe's chalk is not "held by you".
    if (
      unit.kind === 'enemy' &&
      unit.held > 0 &&
      hasFootnote(ctx, 'hold-cap-crush') &&
      isAlive(unit)
    ) {
      withOrigin(ctx, origin, () =>
        withLine(ctx, 'hold:cracked', () =>
          dealDamage(ctx, unit, TUNING.crushBase, 'Crush', [], { heading: null, at: { ...at } }),
        ),
      );
    }
    if (!isAlive(unit)) continue;
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
  // `brink-cap-fall`: Brink's rest acts again on the tile each faller stood on.
  replayFallen(ctx, fell);
  const next: BridgesState = { ...state, stone: { ...state.stone }, cuts: { ...state.cuts } };
  for (const k of keys) {
    delete next.stone[k];
    delete next.cuts[k];
  }
  // The replay may have spent a remembered tile (a Chalk conduct), so the list is read afresh.
  const now = Object.hasOwn(ctx.s.rules ?? {}, COLLAPSE_RULE_ID)
    ? parseBridges(ctx.s.rules?.[COLLAPSE_RULE_ID]).fallenBrass
    : state.fallenBrass;
  const remembered = sortKeys([...new Set([...(now ?? []), ...brass])]);
  if (remembered.length) next.fallenBrass = remembered;
  else delete next.fallenBrass;
  return next;
}

const coordOfKey = (k: string): Coord => {
  const [x = 0, y = 0] = k.split(',').map(Number);
  return { x, y };
};

/** `DistrictModule.fallenBrass`: the recorded tiles that are still fog (a mended tile is forgotten). */
export function fallenBrassOf(s: BattleState): Coord[] {
  const own = parseBridges(s.rules?.[COLLAPSE_RULE_ID]);
  return (own.fallenBrass ?? [])
    .map(coordOfKey)
    .filter((c) => inBoard(s, c) && tileAt(s, c).terrain.drop === true);
}

/** `DistrictModule.spendFallenBrass`: a Chalk conduct used these tiles, so they are forgotten. */
export function spendFallenBrassOf(ctx: Ctx, tiles: readonly Coord[]): void {
  if (!tiles.length) return;
  const own = parseBridges(ctx.s.rules?.[COLLAPSE_RULE_ID]);
  if (!own.fallenBrass) return;
  const spent = new Set<string>(tiles.map(key));
  const left = own.fallenBrass.filter((k) => !spent.has(k));
  const next: BridgesState = { ...own };
  if (left.length) next.fallenBrass = left;
  else delete next.fallenBrass;
  ctx.s.rules = { ...ctx.s.rules, [COLLAPSE_RULE_ID]: next };
}
