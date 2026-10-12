import { TUNING } from '$data';
import { type Ctx, emit, ref } from './ctx';
import { burn, sparkHit } from './damage';
import { type Coord, key, neighbors4 } from './grid';
import {
  brassNet,
  clip,
  inBoard,
  isBrassTile,
  oilRegion,
  steamCloud,
  tileAt,
  unitAt,
} from './queries';
import type { CellKey } from './types';

/**
 * Material runes and their chain reactions. Every apply takes target tiles, processes them in
 * reading order, and resolves its chain reactions fully before returning.
 */

const notIn = (set: ReadonlySet<CellKey>) => (c: Coord) => !set.has(key(c));

/** Ink (rune or Spit): marks units, pools on empty floor, diffuses through steam to the whole cloud. */
export function applyInk(ctx: Ctx, tiles: readonly Coord[]): void {
  const s = ctx.s;
  const cloudDone = new Set<CellKey>();
  const pooled: Coord[] = [];
  const mark = (c: Coord) => {
    const u = unitAt(s, c);
    if (!u || u.inked) return false;
    u.inked = true;
    emit(ctx, { type: 'inked', unit: ref(u), via: 'mark' });
    return true;
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
  }
  if (pooled.length) emit(ctx, { type: 'puddle', tiles: pooled });
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

/** Brass coats units; on a free tile it raises a plate that replaces every other layer. */
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
    Object.assign(tile, { plate: true, oil: false, ink: false, steam: 0, fire: 0, vent: false });
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
  for (const t of region) tileAt(s, t).fire = TUNING.fireRounds;
  emit(ctx, { type: 'ignite', at: { ...at }, tiles: region });
  if (smothered.length) emit(ctx, { type: 'extinguish', tiles: smothered });
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
