import { ENEMIES, type LineId, TUNING } from '$data';
import { type Ctx, emit, ref, withLine, withOrigin } from './ctx';
import { dealDamage, kill } from './damage';
import { hasFootnote } from './footnotes';
import { type Coord, type Dir, sameCoord, step } from './grid';
import { notify } from './hooks';
import { blocksUnits, inBoard, isPlate, tileAt, unitAt } from './queries';
import type { Layer, Origin, Tile, Unit } from './types';

export interface PushResult {
  moved: number;
  end: Coord;
  crushed: string | 'wall' | 'plate' | null; // a UnitId, or what it hit
  dropped: boolean;
}

/** Layers a pushed land unit slides across (design §4.2, §4.4). */
const SLICK: ReadonlySet<Layer['id']> = new Set(['slick', 'pool', 'greaseFog']);

const flies = (u: Unit): boolean => u.kind === 'enemy' && ENEMIES[u.def].flies;
const swims = (u: Unit): boolean => u.kind === 'enemy' && ENEMIES[u.def].habitat === 'water';

/** An anchored foe never moves; a swimmer can't be pushed out of the water (K-13). */
function heldBack(u: Unit, toWater: boolean): boolean {
  if (u.kind !== 'enemy') return false;
  const def = ENEMIES[u.def];
  return def.anchored || (def.habitat === 'water' && !toWater);
}

/** What stopped the push: something to crush against, or a fall. */
type Stop =
  | { kind: 'crush'; into: Unit | 'wall' | 'plate'; line: LineId | null; at: Coord }
  | { kind: 'drop'; line: LineId; at: Coord };

/** The first reason the unit can't enter `next` (P3, P19, P28), or null if it can. */
function stopAt(ctx: Ctx, unit: Unit, from: Coord, next: Coord): Stop | null {
  const s = ctx.s;
  if (!inBoard(s, next)) {
    if (heldBack(unit, false)) return { kind: 'crush', into: 'wall', line: null, at: next };
    // Fliers never fall: a drop edge is a wall to them.
    if (s.edge === 'drop' && !flies(unit)) return { kind: 'drop', line: 'shove:drop', at: from };
    return { kind: 'crush', into: 'wall', line: 'shove:edge', at: next };
  }
  const tile = tileAt(s, next);
  if (heldBack(unit, tile.terrain.water !== null)) {
    return { kind: 'crush', into: 'wall', line: null, at: next };
  }
  if (blocksUnits(tile)) {
    const line: LineId | null = tile.state?.id === 'wall' ? 'shove:wall' : 'shove:plate';
    return { kind: 'crush', into: 'plate', line, at: next };
  }
  const other = unitAt(s, next);
  if (other) return { kind: 'crush', into: other, line: 'shove:unit', at: next };
  if (flies(unit)) return null;
  if (tile.terrain.water !== null && !swims(unit)) {
    return { kind: 'drop', line: 'shove:water', at: next };
  }
  if (tile.terrain.drop) return { kind: 'drop', line: 'shove:drop', at: next };
  return null;
}

/** Plates and Walls break after a few crushes; layout plates (no hits recorded, permanent) never. */
function wearPlate(ctx: Ctx, at: Coord): void {
  const tile: Tile = tileAt(ctx.s, at);
  const layer = tile.state;
  if (!layer || !isPlate(tile)) return;
  if (layer.hits === undefined && layer.rounds === 0 && !layer.set) return;
  const left = (layer.hits ?? (layer.id === 'wall' ? 2 : 1)) - 1;
  if (left > 0) {
    layer.hits = left;
    return;
  }
  tile.state = null;
  emit(ctx, { type: 'stateFades', tiles: [{ ...at }] });
}

function crush(
  ctx: Ctx,
  unit: Unit,
  dir: Dir,
  moved: number,
  stop: Stop & { kind: 'crush' },
): void {
  const other = typeof stop.into === 'string' ? null : stop.into;
  // Footnote `shove-wall-soft` (P39): a wall crush skips the per-tile damage.
  const softWall = stop.line === 'shove:wall' && hasFootnote(ctx, 'shove-wall-soft');
  const heavyWall = stop.line === 'shove:wall' && hasFootnote(ctx, 'shove-wall-heavy');
  const damage =
    TUNING.crushBase + (softWall ? 0 : TUNING.crushPerTile * moved) + (heavyWall ? 1 : 0);
  const body = (): void => {
    emit(ctx, {
      type: 'crush',
      unit: ref(unit),
      into: other ? ref(other) : (stop.into as 'wall' | 'plate'),
      damage,
    });
    dealDamage(ctx, unit, damage, 'Crush', [], { heading: dir, at: null });
    if (other) {
      dealDamage(ctx, other, TUNING.crushStruck, 'Crush', [], {
        heading: dir,
        at: { ...unit.pos },
      });
    } else if (stop.into === 'plate') wearPlate(ctx, stop.at);
  };
  if (stop.line) withLine(ctx, stop.line, body);
  else body();
}

/** A fall: a minion is gone (no death-burst); an elite or member takes 4 and is stunned (P19). */
function fall(ctx: Ctx, unit: Unit, dir: Dir, stop: Stop & { kind: 'drop' }): void {
  withLine(ctx, stop.line, () => {
    emit(ctx, { type: 'dropped', unit: ref(unit), at: { ...stop.at }, elite: unit.elite });
    if (!unit.elite) {
      unit.hp = 0;
      kill(ctx, unit, false);
      return;
    }
    dealDamage(ctx, unit, TUNING.dropEliteDamage, 'Drop', [], { heading: dir, at: null });
    if (unit.hp > 0) {
      unit.stunned = true;
      emit(ctx, { type: 'stunned', unit: ref(unit) });
    }
  });
}

/**
 * Push along a heading (design §4.4, P3, P19, P28). The unit steps `tiles` tiles and slides on
 * while it stands on a fresh slick; a slick it slid over is used up for the round (no pinball).
 * A plate, wall, edge or unit in the way is a crush (1 + 1 per tile moved to the pushed unit, 1 to
 * what it hit); a drop (`_`, canal water for land units, an edge when `edge === 'drop'`) removes a
 * minion and costs an elite 4 and its next action. A held unit doesn't move.
 */
export function push(
  ctx: Ctx,
  unit: Unit,
  dir: Dir,
  tiles: number,
  origin: Origin | null,
): PushResult {
  return withOrigin(ctx, origin, () => {
    const s = ctx.s;
    const unmoved = (): PushResult => ({
      moved: 0,
      end: { ...unit.pos },
      crushed: null,
      dropped: false,
    });
    if (unit.hp <= 0 || tiles <= 0) return unmoved();
    const blockedByHold = (): PushResult => {
      withLine(ctx, 'shove:held', () => emit(ctx, { type: 'held', unit: ref(unit) }));
      return unmoved();
    };
    if (unit.held > 0) return blockedByHold();
    // A bound mark may answer "pushed" by holding its bearer in place (Anchor).
    notify(ctx, { kind: 'pushed', unit: unit.id, dir });
    if (unit.hp <= 0) return unmoved();
    if (unit.held > 0) return blockedByHold();

    // Plan the walk first so the log reads push, then crush or drop.
    const start = { ...unit.pos };
    const path: Coord[] = [];
    let at = start;
    let allowance = tiles;
    let stop: Stop | null = null;
    while (allowance > 0) {
      const next = step(at, dir);
      stop = stopAt(ctx, unit, at, next);
      if (stop) break;
      at = next;
      path.push(next);
      allowance--;
      const layer = tileAt(s, next).state as Layer | null;
      if (!flies(unit) && layer && SLICK.has(layer.id) && layer.slid !== s.round) {
        if (!hasFootnote(ctx, 'shove-slick-again')) layer.slid = s.round;
        allowance = Math.max(allowance, hasFootnote(ctx, 'shove-slick-far') ? 2 : 1);
      }
    }
    const slid = Math.max(0, path.length - tiles);

    if (path.length) {
      const body = (): void => {
        emit(ctx, { type: 'push', unit: ref(unit, start), dir, path, slid });
      };
      if (slid > 0) withLine(ctx, 'shove:slick', body);
      else body();
      if (unit.kind === 'member') unit.undo = null;
    }
    for (const c of path) {
      unit.pos = { ...c };
      notify(ctx, { kind: 'entered', unit: unit.id, at: { ...c } });
      // A jar or bound mark may have killed or moved it: the push ends there.
      if (unit.hp <= 0 || !sameCoord(unit.pos, c)) {
        return { moved: path.length, end: { ...unit.pos }, crushed: null, dropped: false };
      }
    }

    let crushed: PushResult['crushed'] = null;
    let dropped = false;
    if (stop?.kind === 'crush') {
      crush(ctx, unit, dir, path.length, stop);
      crushed = typeof stop.into === 'string' ? stop.into : stop.into.id;
    } else if (stop?.kind === 'drop') {
      fall(ctx, unit, dir, stop);
      dropped = true;
    }
    return { moved: path.length, end: { ...unit.pos }, crushed, dropped };
  });
}
