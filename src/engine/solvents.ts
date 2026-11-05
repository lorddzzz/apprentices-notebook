import { ACTIONS, type InventionId, type LineId, SOLVENT_TUNING, type SolventId } from '$data';
import { objectArrives, relocateAll } from './arrival';
import { burstAt, markUnit, nameOnce, noteMet } from './bursts';
import { type Ctx, emit, ref, withLine, withOrigin } from './ctx';
import { hasFootnote } from './footnotes';
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
import { guardCancels } from './harm';
import type { Hook } from './hooks';
import { openJar, sealedContext } from './jars';
import { spendMark } from './marks';
import { deepen, landOnTile } from './mix';
import { brassNet, cloudNet, isBrass, oilNet } from './networks';
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
import { trickResists } from './rivals/tricks';
import { schedule, wakeScheduled } from './schedule';
import { whereIs } from './targets';
import type {
  BattleState,
  BoardUndo,
  Flow,
  Layer,
  Origin,
  Scheduled,
  Target,
  Tile,
  Unit,
} from './types';
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
  /** A finer line for one added target (given the original), else `line`. */
  lineFor?(s: BattleState, added: Target, first: Target): LineId | null;
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
const isUnitTarget = (s: BattleState, t: Target): boolean => {
  const at = whereIs(s, t);
  return t.kind === 'unit' || (!!at && unitAt(s, at) !== null);
};
/** An added target whose tile holds one of your party (the caster or an ally). */
const isMemberAt = (s: BattleState, t: Target): boolean => {
  const at = whereIs(s, t);
  return !!at && unitAt(s, at)?.kind === 'member';
};

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
  // `cinder-cap-spread`: the tiles beside a hot tile that caught become hot (they do not chain).
  if (hasFootnote(ctx, 'cinder-cap-spread')) {
    const rounds = tileAt(ctx.s, at).hot;
    for (const n of neighbors4(at)) {
      if (inBoard(ctx.s, n)) tileAt(ctx.s, n).hot = Math.max(tileAt(ctx.s, n).hot, rounds);
    }
  }
}

/** Rounds a Cinder tile stays hot: two, or three with `cinder-slick-long`. */
const hotRounds = (ctx: Ctx): number =>
  hasFootnote(ctx, 'cinder-slick-long') ? SOLVENT_TUNING.hotRounds + 1 : SOLVENT_TUNING.hotRounds;

/**
 * Gallnut: marks whoever the invention reaches. `gallnut-unit-deep` deepens a mark already there,
 * `-blot` leaves a blot under it, `-heavy` keeps it from sliding on oil; the capstones brand the
 * cloud it stands in or turn the slick under it to a stain. Also run on a repeat's later passes.
 */
export function gallnutReach(ctx: Ctx, t: Target, origin: Origin | null, flow: Flow | null): void {
  const u = unitOf(ctx, t);
  if (!u) return;
  withLine(ctx, 'gallnut:unit', () => {
    if (!u.mark) {
      markUnit(ctx, u, origin, flow);
      const made = findUnit(ctx.s, u.id)?.mark; // the unit may be the one a guard sent it to
      if (made && hasFootnote(ctx, 'gallnut-unit-heavy')) made.heavy = true;
      if (made && hasFootnote(ctx, 'gallnut-unit-blot') && !tileAt(ctx.s, u.pos).state) {
        landOnTile(ctx, 'ink', u.pos, flow);
      }
    } else if (hasFootnote(ctx, 'gallnut-unit-deep')) {
      deepen(ctx, u);
    }
    const here = tileAt(ctx.s, u.pos);
    if (hasFootnote(ctx, 'gallnut-cap-bloom') && isCloud(here)) {
      for (const c of cloudNet(ctx.s, u.pos)) {
        const layer = tileAt(ctx.s, c).state;
        if (layer?.id !== 'cloud') continue;
        tileAt(ctx.s, c).state = { ...layer, id: 'brandCloud' };
        noteMet(ctx, 'brandCloud');
        nameOnce(ctx, 'compound', 'brandCloud');
        emit(ctx, { type: 'mixed', at: { ...c }, compound: 'brandCloud' });
      }
    }
    if (hasFootnote(ctx, 'gallnut-cap-stain') && here.state?.id === 'slick') {
      landOnTile(ctx, 'ink', u.pos, flow);
    }
  });
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
 * opens on whoever it floats under; stamped with its sealing rune's line, `jar:water` or
 * `fuse:water`), and so does a Pitch-flavoured entry waiting on a tile (a Repeat, a Wick:
 * `pitch:water`). A bound mark's bearer is a unit, so the current already carries it.
 */
export function driftWaiting(ctx: Ctx): void {
  const s = ctx.s;
  const jars: { from: Coord; to: Coord; dir: Dir | null }[] = [];
  s.tiles.forEach((t, i) => {
    if (!t.jar) return;
    const mine = t.jar.event === 'dusk' && findUnit(s, t.jar.owner)?.kind === 'member';
    // `fuse-water-slow`: your Fuse floats only on even rounds.
    if (mine && s.round % 2 === 1 && hasFootnote(ctx, 'fuse-water-slow')) return;
    const from = coordOf(s, i);
    // `fuse-water-swift`: two tiles, stopping at a blocker, or at the first unit with `-wake`.
    const reach = mine && hasFootnote(ctx, 'fuse-water-swift') ? 2 : 1;
    const wake = mine && hasFootnote(ctx, 'fuse-water-wake');
    let to = from;
    let dir: Dir | null = null;
    for (let n = 0; n < reach; n++) {
      const next = downstream(s, to);
      if (!next || (n > 0 && tileAt(s, next).jar)) break;
      dir = tileAt(s, to).terrain.water;
      to = next;
      if (wake && unitAt(s, to)) break;
    }
    if (to !== from) jars.push({ from, to, dir });
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
    // `fuse-water-heading`: a Fuse that has floated opens facing the way the water ran.
    if (
      m.dir &&
      jar.event === 'dusk' &&
      findUnit(s, jar.owner)?.kind === 'member' &&
      hasFootnote(ctx, 'fuse-water-heading')
    )
      jar.heading = m.dir;
    // The drift is the jar's own cast's doing (RV-16): a rival's lantern floating is no household point.
    withOrigin(ctx, jar.origin, () =>
      withLine(ctx, jar.event === 'dusk' ? 'fuse:water' : 'jar:water', () =>
        emit(ctx, { type: 'drawn', from: { ...m.from }, to: { ...m.to }, what: 'jar' }),
      ),
    );
    landed.push(m.to);
  });
  // A jar floating under a standing unit opens on it (Lantern Walk, P6); with `fuse-water-wake`
  // your Fuse does too.
  for (const at of landed) {
    const jar = tileAt(s, at).jar;
    if (!jar) continue;
    const wakes =
      jar.event === 'dusk' &&
      findUnit(s, jar.owner)?.kind === 'member' &&
      hasFootnote(ctx, 'fuse-water-wake');
    if (wakes) {
      if (unitAt(s, at)) openJar(ctx, at, null, { line: 'fuse:water' });
    } else objectArrives(ctx, { kind: 'jar' }, at, { cause: 'drift', origin: null });
  }
  const shored: Scheduled[] = [];
  for (const e of s.scheduled) {
    if (e.solvent !== 'pitch' || e.target.kind !== 'tile') continue;
    const reach = hasFootnote(ctx, 'pitch-water-far') ? 2 : 1;
    const back = hasFootnote(ctx, 'pitch-water-upstream');
    const catches = hasFootnote(ctx, 'pitch-water-catch');
    const wash = hasFootnote(ctx, 'pitch-water-wash');
    let to = e.target.at;
    let from = to;
    let moved = 0;
    let caught = false;
    for (let n = 0; n < reach && !caught; n++) {
      const next = back ? upstream(s, to) : downstream(s, to);
      if (!next) break;
      if (wash) carryState(s, to, next);
      from = to;
      to = next;
      moved++;
      // `pitch-water-catch`: the wait fixes on the first unit it floats onto.
      const unit = catches ? unitAt(s, to) : null;
      if (unit) {
        e.target = { kind: 'unit', unit: unit.id };
        caught = true;
      }
    }
    if (moved > 0) {
      if (!caught) e.target = tileTarget(to);
      e.drifted = { ...from }; // `pitch-cap-wake`
      const landed = to;
      withLine(ctx, 'pitch:water', () =>
        emit(ctx, { type: 'scheduled', kind: 'pitch', at: landed }),
      );
    }
    if (!caught && moved < reach && tileAt(s, to).terrain.water) shored.push(e);
  }
  // `pitch-cap-shore`: a wait stopped by a quay or a blocker wakes at once.
  if (hasFootnote(ctx, 'pitch-cap-shore')) for (const e of shored) wakeScheduled(ctx, e);
}

/** The next water tile upstream of `at` (`pitch-water-upstream`), if a waiting thing can float there. */
function upstream(s: BattleState, at: Coord): Coord | null {
  const dir = tileAt(s, at).terrain.water;
  if (!dir) return null;
  const to = step(at, opposite(dir));
  if (!inBoard(s, to)) return null;
  const dest = tileAt(s, to);
  return dest.terrain.water && !blocksUnits(dest) ? to : null;
}

/** `pitch-water-wash`: a slick or plain cloud floats along with the wait, onto a bare tile. */
function carryState(s: BattleState, from: Coord, to: Coord): void {
  const src = tileAt(s, from);
  const dest = tileAt(s, to);
  if (!src.state || dest.state) return;
  if (src.state.id !== 'slick' && src.state.id !== 'cloud') return;
  dest.state = src.state;
  src.state = null;
}

// ── The rules ───────────────────────────────────────────

/** Filled for all fourteen; a test may swap one out and put it back. */
export const SOLVENT_RULES: Partial<Record<SolventId, SolventRule>> = {
  gallnut: {
    onReach(ctx, t, flow) {
      gallnutReach(ctx, t, flow.origin, flow);
    },
  },
  cinder: {
    // The target's tile is left hot before anything lands; oil already there burns afterwards.
    before(ctx, t) {
      const at = whereIs(ctx.s, t);
      if (at) tileAt(ctx.s, at).hot = hotRounds(ctx);
      return { at, unit: at ? (unitAt(ctx.s, at)?.id ?? null) : null };
    },
    // `cinder-cap-brass`: the whole connected brass the invention reaches is hot.
    onReach(ctx, t) {
      const at = whereIs(ctx.s, t);
      if (!at || !hasFootnote(ctx, 'cinder-cap-brass') || !isBrass(ctx.s, at)) return;
      for (const c of brassNet(ctx.s, at)) tileAt(ctx.s, c).brassHot = SOLVENT_TUNING.hotRounds;
    },
    after(ctx, _t, flow, run) {
      const { at, unit } = run.before as { at: Coord | null; unit: string | null };
      if (at) catchIfHot(ctx, at, flow);
      // `cinder-slick-follow`: the tile the pushed target ends on is hot too.
      const moved = unit ? findUnit(ctx.s, unit) : null;
      if (
        moved &&
        isAlive(moved) &&
        hasFootnote(ctx, 'cinder-slick-follow') &&
        !(at && sameCoord(moved.pos, at))
      ) {
        tileAt(ctx.s, moved.pos).hot = hotRounds(ctx);
        catchIfHot(ctx, moved.pos, flow);
      }
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
    lineFor: (s, added) => (isMemberAt(s, added) ? 'bathSalt:member' : null),
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
    lineFor(s, added, first) {
      if (isMemberAt(s, added)) return 'fogJar:member';
      return whereIs(s, first) && !isUnitTarget(s, first) ? 'fogJar:empty' : null;
    },
  },
  mortar: { pushBonus: SOLVENT_TUNING.mortarPush },
  chalk: { reach: SOLVENT_TUNING.chalkReach },
  rivet: {
    onReach(ctx, t) {
      const u = unitOf(ctx, t);
      if (!u || trickResists(ctx, u, 'hold')) return; // a rival's immunity (RV-11 `resists`)
      if (guardCancels(ctx, u, { kind: 'hold', unit: u.id, harm: null }, 'Rivet')) return;
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
          context: sealedContext(flow),
        }),
      );
    },
  },
};

/** Fans a hook out to every solvent rule that listens. */
export function onHook(ctx: Ctx, h: Hook): void {
  for (const r of Object.values(SOLVENT_RULES)) r?.onHook?.(ctx, h);
}
