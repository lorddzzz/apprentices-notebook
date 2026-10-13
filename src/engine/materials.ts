import { TUNING } from '$data';
import { type Ctx, emit, ref } from './ctx';
import { burn, sparkHit } from './damage';
import { type Coord, key, neighbors4 } from './grid';
import {
  brassNet,
  clip,
  inBoard,
  isAlive,
  isBrassTile,
  oilRegion,
  steamCloud,
  tileAt,
  unitAt,
} from './queries';
import type { CellKey, Tile, Unit } from './types';

/**
 * Material runes and their chain reactions. Every apply takes target tiles, processes them in
 * reading order, and resolves its chain reactions fully before returning.
 */

const notIn = (set: ReadonlySet<CellKey>) => (c: Coord) => !set.has(key(c));

/** Ink (rune or Spit): marks units, pools on empty floor, diffuses through steam to the whole cloud. */
export function applyInk(ctx: Ctx, tiles: readonly Coord[]): Unit[] {
  const s = ctx.s;
  const cloudDone = new Set<CellKey>();
  const pooled: Coord[] = [];
  const stained: Coord[] = [];
  const marked: Unit[] = [];
  const mark = (c: Coord) => {
    const u = unitAt(s, c);
    if (u) markInked(ctx, u, marked);
  };
  for (const t of clip(s, tiles)) {
    const tile = tileAt(s, t);
    if (tile.plate) continue;
    if (tile.steam > 0) {
      if (cloudDone.has(key(t))) continue;
      const cloud = steamCloud(s, t);
      for (const c of cloud) cloudDone.add(key(c));
      emit(ctx, { type: 'diffuse', at: { ...t }, tiles: cloud });
      for (const c of cloud) mark(c);
    } else if (unitAt(s, t)) {
      mark(t);
    } else if (!tile.ink) {
      tile.ink = true;
      pooled.push(t);
    }
    // Ink landing on unlit oil (not under steam, where it diffuses instead) stains it.
    if (!tile.steam && canStain(tile)) {
      tile.stain = true;
      stained.push(t);
    }
  }
  if (pooled.length) emit(ctx, { type: 'puddle', tiles: pooled });
  if (stained.length) emit(ctx, { type: 'stained', tiles: stained });
  return marked;
}

const canStain = (tile: Tile): boolean => tile.oil && tile.fire === 0 && !tile.stain && !tile.plate;

/**
 * Heats brass: plates on `tiles` and brass units in `units` get `TUNING.heatRounds` hot rounds
 * (re-heating refreshes the count). Only what was cold is reported as `heated`. Non-brass tiles
 * and units are ignored, so callers (fire, Kiln) can pass candidates freely.
 */
export function heatBrass(ctx: Ctx, tiles: readonly Coord[], units: readonly Unit[]): void {
  const newTiles: Coord[] = [];
  const newUnits: Unit[] = [];
  for (const c of clip(ctx.s, tiles)) {
    const tile = tileAt(ctx.s, c);
    if (!tile.plate) continue;
    if (tile.heat === 0) newTiles.push(c);
    tile.heat = TUNING.heatRounds;
  }
  for (const u of units) {
    if (!u.brass || !isAlive(u)) continue;
    if (u.heat === 0) newUnits.push(u);
    u.heat = TUNING.heatRounds;
  }
  if (newTiles.length || newUnits.length)
    emit(ctx, { type: 'heated', tiles: newTiles, units: newUnits.map((u) => ref(u)) });
}

/**
 * Fire heats the brass orthogonally next to it and the brass unit standing in it. With
 * `refresh: false` brass that is already hot is left alone (the per-round check must not extend
 * the count; only a new ignition does).
 */
export function heatNearFire(ctx: Ctx, fires: readonly Coord[], refresh: boolean): void {
  const s = ctx.s;
  const seen = new Set<CellKey>();
  const tiles: Coord[] = [];
  const units: Unit[] = [];
  for (const f of fires) {
    for (const c of [f, ...neighbors4(f)]) {
      if (!inBoard(s, c) || seen.has(key(c))) continue;
      seen.add(key(c));
      const u = unitAt(s, c);
      if (tileAt(s, c).plate && (refresh || tileAt(s, c).heat === 0)) tiles.push(c);
      else if (u?.brass && (refresh || u.heat === 0)) units.push(u);
    }
  }
  heatBrass(ctx, tiles, units);
}

/** Inks a unit that isn't yet; records it in `into`. */
function markInked(ctx: Ctx, u: Unit, into: Unit[]): void {
  if (u.inked) return;
  u.inked = true;
  into.push(u);
  emit(ctx, { type: 'inked', unit: ref(u), via: 'mark' });
}

/**
 * Smear: inks like Ink, then each unit it inked passes the mark to its orthogonal neighbours
 * (one hop; units inked by the pass don't pass it on).
 */
export function applySmear(ctx: Ctx, tiles: readonly Coord[]): void {
  for (const from of applyInk(ctx, tiles)) {
    const passed: Unit[] = [];
    for (const n of neighbors4(from.pos)) {
      const u = inBoard(ctx.s, n) ? unitAt(ctx.s, n) : undefined;
      if (u && !u.inked) {
        u.inked = true;
        passed.push(u);
      }
    }
    if (!passed.length) continue;
    emit(ctx, { type: 'smear', from: ref(from), to: passed.map((u) => ref(u)) });
    for (const u of passed) emit(ctx, { type: 'inked', unit: ref(u), via: 'mark' });
  }
}

/** Torch: oils the tiles, then lights every oil tile among them (fire runs along connected oil). */
export function applyTorch(ctx: Ctx, tiles: readonly Coord[]): void {
  applyOil(ctx, tiles);
  for (const t of clip(ctx.s, tiles)) ignite(ctx, t);
}

/** Fog: oil, then steam over it. */
export function applyFog(ctx: Ctx, tiles: readonly Coord[]): void {
  applyOil(ctx, tiles);
  applySteam(ctx, tiles);
}

/** Mist: inks every unit in each steam cloud touching the tiles, then the steam is gone. */
export function applyMist(ctx: Ctx, tiles: readonly Coord[]): void {
  const s = ctx.s;
  const done = new Set<CellKey>();
  for (const t of clip(s, tiles)) {
    if (tileAt(s, t).steam <= 0 || done.has(key(t))) continue;
    const cloud = steamCloud(s, t);
    for (const c of cloud) done.add(key(c));
    emit(ctx, { type: 'mist', tiles: cloud });
    for (const c of cloud) {
      const u = unitAt(s, c);
      if (u) markInked(ctx, u, []);
    }
    for (const c of cloud) tileAt(s, c).steam = 0;
    emit(ctx, { type: 'steamFades', tiles: cloud });
  }
}

/** Brand: marks units like Ink (never pools on the floor) and burns the brand in. */
export function applyBrand(ctx: Ctx, tiles: readonly Coord[]): void {
  for (const t of clip(ctx.s, tiles)) {
    const u = unitAt(ctx.s, t);
    if (!u || tileAt(ctx.s, t).plate) continue;
    markInked(ctx, u, []);
    if (!u.branded) {
      u.branded = true;
      emit(ctx, { type: 'branded', unit: ref(u) });
    }
  }
}

export function applyOil(ctx: Ctx, tiles: readonly Coord[]): void {
  const coated = clip(ctx.s, tiles).filter((t) => {
    const tile = tileAt(ctx.s, t);
    return !tile.plate && !tile.oil;
  });
  for (const t of coated) tileAt(ctx.s, t).oil = true;
  if (coated.length) emit(ctx, { type: 'oiled', tiles: coated });
  spreadFire(ctx);
}

/** Steam clouds the tiles and puts out fire there (the oil stays). */
export function applySteam(ctx: Ctx, tiles: readonly Coord[]): void {
  const clouded = clip(ctx.s, tiles).filter((t) => !tileAt(ctx.s, t).plate);
  for (const t of clouded) tileAt(ctx.s, t).steam = TUNING.steamRounds;
  if (clouded.length) emit(ctx, { type: 'steam', tiles: clouded });
  const doused = clouded.filter((t) => tileAt(ctx.s, t).fire > 0);
  for (const t of doused) tileAt(ctx.s, t).fire = 0;
  if (doused.length) emit(ctx, { type: 'extinguish', tiles: doused });
}

/** Brass coats units; on a free tile it raises a plate (crumbles after `plateRounds`) that replaces every other layer. */
export function applyBrass(ctx: Ctx, tiles: readonly Coord[]): void {
  const plates: Coord[] = [];
  for (const t of clip(ctx.s, tiles)) {
    const u = unitAt(ctx.s, t);
    if (u) {
      if (u.brass) continue;
      u.brass = true;
      emit(ctx, { type: 'coated', unit: ref(u) });
      continue;
    }
    const tile = tileAt(ctx.s, t);
    if (tile.plate) continue;
    Object.assign(tile, {
      plate: true,
      plateRounds: TUNING.plateRounds,
      oil: false,
      ink: false,
      steam: 0,
      fire: 0,
      vent: false,
      stain: false,
      heat: 0,
    });
    plates.push(t);
  }
  if (plates.length) emit(ctx, { type: 'plates', tiles: plates });
}

/**
 * Spark: each reached tile hits its unit, ignites oil, arcs through the connected steam cloud and
 * conducts through connected brass. Networks chain into each other; each tile is sparked once.
 */
export function applySpark(ctx: Ctx, tiles: readonly Coord[], damage: number): void {
  const s = ctx.s;
  const reached = new Set<CellKey>();
  const cloudDone = new Set<CellKey>();
  const brassDone = new Set<CellKey>();

  const spread = (t: Coord): void => {
    if (reached.has(key(t))) return;
    reached.add(key(t));
    const u = unitAt(s, t);
    if (u) sparkHit(ctx, u, damage);
    const tile = tileAt(s, t);
    if (tile.oil && tile.fire === 0) ignite(ctx, t);
    if (tile.steam > 0 && !cloudDone.has(key(t))) {
      const cloud = steamCloud(s, t);
      for (const c of cloud) cloudDone.add(key(c));
      const others = cloud.filter(notIn(reached));
      if (others.length) {
        emit(ctx, { type: 'arc', from: { ...t }, tiles: cloud });
        for (const c of others) spread(c);
      }
    }
    if (isBrassTile(s, t) && !brassDone.has(key(t))) {
      const net = brassNet(s, t);
      for (const c of net) brassDone.add(key(c));
      const others = net.filter(notIn(reached));
      if (others.length) {
        emit(ctx, { type: 'conduct', from: { ...t }, tiles: net });
        for (const c of others) spread(c);
      }
    }
  };
  for (const t of clip(s, tiles)) spread(t);
}

/**
 * Lights the oil at `at` and everything connected to it. Fire does not enter steam: neighbouring
 * oil under steam is reported as put out. Units on newly lit tiles burn.
 */
export function ignite(ctx: Ctx, at: Coord): void {
  const s = ctx.s;
  const start = tileAt(s, at);
  if (!start.oil || start.fire > 0) return;
  if (start.steam > 0) {
    emit(ctx, { type: 'extinguish', tiles: [{ ...at }] });
    return;
  }
  const region = oilRegion(s, at);
  const inRegion = new Set(region.map(key));
  const smothered = clip(
    s,
    region.flatMap(neighbors4).filter((n) => {
      if (!inBoard(s, n) || inRegion.has(key(n))) return false;
      const t = tileAt(s, n);
      return t.oil && t.fire === 0 && t.steam > 0;
    }),
  );
  for (const t of region) {
    const tile = tileAt(s, t);
    tile.fire = TUNING.fireRounds;
    tile.stain = false; // the oil burns, and the stain with it
  }
  emit(ctx, { type: 'ignite', at: { ...at }, tiles: region });
  if (smothered.length) emit(ctx, { type: 'extinguish', tiles: smothered });
  heatNearFire(ctx, region, true);
  for (const t of region) {
    const u = unitAt(s, t);
    if (u) burn(ctx, u);
  }
}

/** Unlit oil touching fire catches at once. Call after any oil placement. */
export function spreadFire(ctx: Ctx): void {
  const s = ctx.s;
  for (let i = 0; i < s.tiles.length; i++) {
    const t = { x: i % s.width, y: Math.floor(i / s.width) };
    const tile = tileAt(s, t);
    if (!tile.oil || tile.fire > 0 || tile.steam > 0) continue;
    if (neighbors4(t).some((n) => inBoard(s, n) && tileAt(s, n).fire > 0)) ignite(ctx, t);
  }
}
