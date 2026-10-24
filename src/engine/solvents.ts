import { ACTIONS, type InventionId, type LineId, SOLVENT_TUNING, type SolventId } from '$data';
import { objectArrives, relocateAll } from './arrival';
import { burstAt, markUnit } from './bursts';
import { type Ctx, emit, ref, withLine, withOrigin } from './ctx';
import {
  byReadingOrder,
  type Coord,
  type Dir,
  key,
  neighbors4,
  opposite,
  sameCoord,
  step,
} from './grid';
import type { Hook } from './hooks';
import { sealedContext } from './jars';
import { spendMark } from './marks';
import { cloudNet, isBrass, oilNet } from './networks';
import {
  blocksUnits,
  coordOf,
  findUnit,
  inBoard,
  isAlive,
  isCloud,
  isFire,
  isPlate,
  tileAt,
  unitAt,
} from './queries';
import { schedule } from './schedule';
import { whereIs } from './targets';
import type { BattleState, BoardUndo, Flow, Layer, Origin, Target, Tile, Unit } from './types';
import { targetKey } from './types';

/**
 * One hook set per solvent, applied to any invention flavoured with it (design §6.3, P38).
 * `runInvention` calls them around the method, at the invention that is flavoured:
 * `delay` waits a round, `reverse` turns the target back on the caster, `widen` picks the targets
 * (the first is the original; `line` stamps the added ones, `weaker` shrinks them), `before` and
 * `onReach` and `after` bracket each target. `pushBonus` and `reach` are read through
 * `flow.solvent` by the Actions and by Conduct. `noSpread` is read when Ink marks, `onHook`
 * answers the board's hooks, and the waiting forms drift in `driftWaiting`.
 */
export interface SolventRule {
  widen?(s: BattleState, t: Target, flow: Flow): Target[];
  /** The fine-print line the targets `widen` added are run under. */
  line?: LineId;
  /** How many steps weaker the added targets are hit (push, damage; min 0). */
  weaker?: number;
  /** Runs before each target; what it returns is handed to `after`. */
  before?(ctx: Ctx, t: Target, flow: Flow): unknown;
  onReach?(ctx: Ctx, t: Target, flow: Flow): void;
  pushBonus?: number;
  reach?: number;
  delay?: 'round';
  reverse?: boolean;
  noSpread?: boolean;
  after?(ctx: Ctx, t: Target, flow: Flow, run: { inv: InventionId; before: unknown }): void;
  onHook?(ctx: Ctx, h: Hook): void;
}

// ── Helpers ─────────────────────────────────────────────

const tileTarget = (at: Coord): Target => ({ kind: 'tile', at: { ...at } });

/** The living unit a target means: a unit target's, or whoever stands on a tile target. */
function unitOf(ctx: Ctx, t: Target): Unit | null {
  const u = t.kind === 'tile' ? unitAt(ctx.s, t.at) : findUnit(ctx.s, t.unit);
  return u && isAlive(u) ? u : null;
}

/** Cinder: an oil tile (slick, pool or stain) that is hot, with a Spark's worth of fire. */
export function catchIfHot(ctx: Ctx, at: Coord, flow: Flow | null): void {
  if (tileAt(ctx.s, at).hot <= 0 || oilNet(ctx.s, at).length === 0) return;
  const from = ctx.log.length;
  burstAt(ctx, at, 'tile', flow);
  // The oil burns because the tile was hot, not because of a Spark: the fire signs it.
  for (const e of ctx.log.slice(from)) if (e.line?.startsWith('spark:')) e.line = 'cinder:slick';
}

/** Whether `at` is brass or touches brass: a plate, or a collared unit (§4.4). */
const touchesBrass = (s: BattleState, at: Coord): boolean =>
  isBrass(s, at) || neighbors4(at).some((n) => isBrass(s, n));

// ── Sand ────────────────────────────────────────────────

/**
 * Sand turns a released action back on whoever set it off: the one who hit the bearer, pushed
 * (in reverse) back the way it came. Nobody to turn it on (a fire, the bearer itself) spends it.
 */
export function turnBack(
  ctx: Ctx,
  solvent: SolventId | null,
  h: Hook,
  heading: Dir | null,
): { target: Target; heading: Dir | null } | 'nobody' | null {
  if (!solvent || !SOLVENT_RULES[solvent]?.reverse || h.kind !== 'hit') return null;
  const hitter = h.from ? unitAt(ctx.s, h.from) : null;
  if (!hitter || !isAlive(hitter) || hitter.id === h.unit) {
    withLine(ctx, 'sand:noTarget', () => emit(ctx, { type: 'miss', source: 'Sand' }));
    return 'nobody';
  }
  return {
    target: { kind: 'unit', unit: hitter.id },
    heading: heading ? opposite(heading) : null,
  };
}

// ── Graphite ────────────────────────────────────────────

const PLAIN_KIND = {
  blot: 'ink',
  slick: 'oil',
  cloud: 'steam',
  plate: 'brass',
  fire: 'oil',
} as const;

const sameLayer = (a: Layer | null, b: Layer | null): boolean =>
  JSON.stringify(a) === JSON.stringify(b);

/** The whole board's tile states and unit positions, to compare after the invention ran. */
function boardNow(s: BattleState): BoardUndo {
  return {
    tiles: s.tiles.map((t, i) => ({ at: coordOf(s, i), state: structuredClone(t.state) })),
    units: s.units.filter(isAlive).map((u) => ({ id: u.id, pos: { ...u.pos } })),
  };
}

/** Puts back what Graphite recorded: states landed are gone, units moved are home (when free). */
export function undoBoard(ctx: Ctx, undo: BoardUndo, origin: Origin | null = null): void {
  const s = ctx.s;
  withOrigin(ctx, origin, () =>
    withLine(ctx, 'graphite:unit', () => {
      const gone: Coord[] = [];
      for (const { at, state } of undo.tiles) {
        const tile = tileAt(s, at);
        if (state === null) {
          if (tile.state === null) continue;
          tile.state = null;
          gone.push({ ...at });
        } else if (!(isPlate({ ...tile, state } as Tile) && unitAt(s, at))) {
          tile.state = structuredClone(state);
          const id = state.id;
          if (id in PLAIN_KIND) {
            const kind = PLAIN_KIND[id as keyof typeof PLAIN_KIND];
            emit(ctx, {
              type: 'landed',
              kind,
              at: { ...at },
              makes: id as keyof typeof PLAIN_KIND,
            });
          } else {
            emit(ctx, { type: 'mixed', at: { ...at }, compound: id as never });
          }
        }
      }
      if (gone.length) emit(ctx, { type: 'stateFades', tiles: gone });

      // Lift every unit that moved, then set each back; one whose home is taken goes to a free
      // tile. Planned first, then placed together: a restore is not an arrival (P2).
      const movers = undo.units.flatMap(({ id, pos }) => {
        const u = findUnit(s, id);
        return u && isAlive(u) && !sameCoord(u.pos, pos)
          ? [{ u, from: { ...u.pos }, home: pos, to: { ...u.pos } }]
          : [];
      });
      const lifted = new Set(movers.map((m) => m.u.id));
      const taken = new Set(
        s.units.filter((u) => isAlive(u) && !lifted.has(u.id)).map((u) => key(u.pos)),
      );
      const place = (m: (typeof movers)[number], c: Coord): boolean => {
        if (!inBoard(s, c) || taken.has(key(c)) || blocksUnits(tileAt(s, c))) return false;
        taken.add(key(c));
        m.to = { ...c };
        return true;
      };
      const stuck = movers.filter((m) => !place(m, m.home));
      for (const m of stuck) {
        if (!place(m, m.from)) {
          const free = s.tiles
            .map((_, i) => coordOf(s, i))
            .find((c) => !taken.has(key(c)) && !blocksUnits(tileAt(s, c)));
          if (free) place(m, free);
        }
      }
      for (const m of movers) {
        if (m.u.kind === 'member') m.u.undo = null;
        if (!sameCoord(m.to, m.from)) {
          emit(ctx, { type: 'moveUndone', unit: ref(m.u, m.from), to: { ...m.to } });
        }
      }
      relocateAll(
        ctx,
        movers.map((m) => ({ unit: m.u.id, from: m.from, to: m.to, path: [m.to] })),
        'restore',
        origin,
      );
    }),
  );
}

// ── Pitch ───────────────────────────────────────────────

/** The next water tile downstream of `at`, if a waiting thing can float there. */
function downstream(s: BattleState, at: Coord): Coord | null {
  const dir = tileAt(s, at).terrain.water;
  if (!dir) return null;
  const to = step(at, dir);
  if (!inBoard(s, to)) return null;
  const dest = tileAt(s, to);
  return dest.terrain.water && !blocksUnits(dest) ? to : null;
}

/**
 * The round's drift for what waits on water: a jar floats one tile downstream (Lantern Walk: it
 * opens on whoever it floats under), and so does a Pitch-flavoured entry waiting on a tile (a
 * Repeat, a Wick). A bound mark's bearer is a unit, so the current already carries it.
 */
export function driftWaiting(ctx: Ctx): void {
  const s = ctx.s;
  const jars: { from: Coord; to: Coord }[] = [];
  s.tiles.forEach((t, i) => {
    if (!t.jar) return;
    const from = coordOf(s, i);
    const to = downstream(s, from);
    if (to) jars.push({ from, to });
  });
  const carried = jars.map((m) => {
    const tile = tileAt(s, m.from);
    const jar = tile.jar;
    tile.jar = null;
    return jar;
  });
  const landed: Coord[] = [];
  jars.forEach((m, n) => {
    const jar = carried[n];
    if (!jar) return;
    const dest = tileAt(s, m.to);
    if (dest.jar) {
      tileAt(s, m.from).jar = jar; // blocked by a jar that stays: it stays too
      return;
    }
    dest.jar = jar;
    withLine(ctx, 'pitch:water', () =>
      emit(ctx, { type: 'drawn', from: { ...m.from }, to: { ...m.to }, what: 'jar' }),
    );
    landed.push(m.to);
  });
  // A jar floating under a standing unit opens on it (Lantern Walk, P6).
  for (const at of landed) {
    if (tileAt(s, at).jar)
      objectArrives(ctx, { kind: 'jar' }, at, { cause: 'drift', origin: null });
  }
  for (const e of s.scheduled) {
    if (e.solvent !== 'pitch' || e.target.kind !== 'tile') continue;
    const to = downstream(s, e.target.at);
    if (!to) continue;
    e.target = tileTarget(to);
    withLine(ctx, 'pitch:water', () => emit(ctx, { type: 'scheduled', kind: 'pitch', at: to }));
  }
}

// ── The rules ───────────────────────────────────────────

/** Filled for all fourteen; a test may swap one out and put it back. */
export const SOLVENT_RULES: Partial<Record<SolventId, SolventRule>> = {
  gallnut: {
    onReach(ctx, t, flow) {
      const u = unitOf(ctx, t);
      if (!u || u.mark) return;
      withLine(ctx, 'gallnut:unit', () => markUnit(ctx, u, flow.origin, flow));
    },
  },
  cinder: {
    // The target's tile is left hot before anything lands; oil already there burns afterwards.
    before(ctx, t) {
      const at = whereIs(ctx.s, t);
      if (at) tileAt(ctx.s, at).hot = SOLVENT_TUNING.hotRounds;
      return at;
    },
    after(ctx, _t, flow, run) {
      const at = run.before as Coord | null;
      if (at) catchIfHot(ctx, at, flow);
    },
  },
  pitch: {},
  wick: { delay: 'round' },
  wax: {
    noSpread: true,
    onHook(ctx, h) {
      if (h.kind !== 'hit' && h.kind !== 'entered') return;
      const u = findUnit(ctx.s, h.unit);
      if (!u?.mark?.wax || !isFire(tileAt(ctx.s, u.pos))) return;
      withLine(ctx, 'wax:fire', () => spendMark(ctx, u));
    },
  },
  sand: { reverse: true },
  bathSalt: {
    line: 'bathSalt:cloud',
    widen(s, t) {
      const at = whereIs(s, t);
      if (!at || !isCloud(tileAt(s, at))) return [t];
      const rest = cloudNet(s, at)
        .filter((c) => !sameCoord(c, at) && unitAt(s, c))
        .sort(byReadingOrder);
      return [t, ...rest.map(tileTarget)];
    },
  },
  fogJar: {
    line: 'fogJar:unit',
    weaker: SOLVENT_TUNING.fogWeaker,
    widen(s, t) {
      const at = whereIs(s, t);
      if (!at) return [t];
      const near = neighbors4(at)
        .filter((c) => inBoard(s, c) && unitAt(s, c))
        .sort(byReadingOrder);
      return [t, ...near.map(tileTarget)];
    },
  },
  mortar: { pushBonus: SOLVENT_TUNING.mortarPush },
  chalk: { reach: SOLVENT_TUNING.chalkReach },
  rivet: {
    onReach(ctx, t) {
      const u = unitOf(ctx, t);
      if (!u) return;
      withLine(ctx, 'rivet:unit', () => {
        u.held = Math.max(u.held, ACTIONS.holdRounds);
        emit(ctx, { type: 'held', unit: ref(u), rounds: u.held });
      });
    },
  },
  filings: {
    after(ctx, t, flow, run) {
      if (flow.repeated) return; // it rings once more, not forever
      const at = whereIs(ctx.s, t);
      if (!at || !touchesBrass(ctx.s, at)) return;
      withLine(ctx, 'filings:plate', () =>
        schedule(ctx, {
          when: 'ownerTurn',
          owner: flow.caster,
          step: run.inv,
          target: tileTarget(at),
          heading: flow.headings.get(targetKey(t)) ?? null,
          origin: flow.origin,
          kind: 'filings',
          solvent: 'filings',
          context: sealedContext(flow),
        }),
      );
    },
  },
  quicksilver: {
    line: 'quicksilver:edge',
    widen(s, t) {
      const at = whereIs(s, t);
      if (!at) return [t];
      const mirror = { x: s.width - 1 - at.x, y: at.y };
      return sameCoord(mirror, at) ? [t] : [t, tileTarget(mirror)];
    },
  },
  graphite: {
    before: (ctx) => boardNow(ctx.s),
    after(ctx, t, flow, run) {
      const was = run.before as BoardUndo | undefined;
      if (!was) return;
      const s = ctx.s;
      const undo: BoardUndo = {
        tiles: was.tiles.filter(({ at, state }) => !sameLayer(state, tileAt(s, at).state)),
        units: was.units.filter(({ id, pos }) => {
          const u = findUnit(s, id);
          return !!u && isAlive(u) && !sameCoord(u.pos, pos);
        }),
      };
      if (undo.tiles.length === 0 && undo.units.length === 0) return;
      withLine(ctx, 'graphite:unit', () =>
        schedule(ctx, {
          when: 'ownerTurn',
          owner: flow.caster,
          step: run.inv,
          target: t,
          heading: null,
          origin: flow.origin,
          kind: 'graphite',
          solvent: 'graphite',
          undo,
        }),
      );
    },
  },
};

/** Fans a hook out to every solvent rule that listens. */
export function onHook(ctx: Ctx, h: Hook): void {
  for (const r of Object.values(SOLVENT_RULES)) r?.onHook?.(ctx, h);
}
