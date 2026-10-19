import { type SourceRuneId, TUNING } from '$data';
import type { DraftOptions } from './ctx';
import { hasFootnote } from './footnotes';
import { byReadingOrder, type Coord, type Dir, square } from './grid';
import { clip, travel, unitAt } from './queries';
import type { Aim, BattleState, Target, Unit } from './types';
import { targetKey } from './types';

/**
 * Where a spell aims and who it acts on (design R2, R4, R7, R9; plan P21–P23). Pure functions of
 * the board; `resolve.ts` runs the steps over what they return.
 */

/** A unit target follows its unit (R7); a tile target stays put. null = the unit is gone. */
export function whereIs(s: BattleState, t: Target): Coord | null {
  if (t.kind === 'tile') return t.at;
  const u = s.units.find((x) => x.id === t.unit);
  return u && u.hp > 0 ? u.pos : null;
}

/** Dominant axis from `from` to `to`; a tie goes vertical; the same tile has none. */
function axisToward(from: Coord, to: Coord): Dir | null {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  if (dx === 0 && dy === 0) return null;
  if (Math.abs(dy) >= Math.abs(dx)) return dy < 0 ? 'up' : 'down';
  return dx < 0 ? 'left' : 'right';
}

/** The target on a tile: the unit standing there, else the tile (P23: frozen at aim time). */
export function targetOn(s: BattleState, at: Coord): Target {
  const u = unitAt(s, at);
  return u ? { kind: 'unit', unit: u.id } : { kind: 'tile', at: { ...at } };
}

/**
 * An area's targets in reading order, each with its heading (P22): from the centre outward
 * along the larger axis; the centre and the diagonals take the caster→centre heading.
 */
function areaTargets(
  s: BattleState,
  caster: Unit,
  tiles: readonly Coord[],
  centre: { x: number; y: number },
): { targets: Target[]; headings: Map<string, Dir | null> } {
  const inward = axisToward(caster.pos, { x: Math.round(centre.x), y: Math.round(centre.y) });
  const targets: Target[] = [];
  const headings = new Map<string, Dir | null>();
  for (const at of [...tiles].sort(byReadingOrder)) {
    const t = targetOn(s, at);
    const dx = at.x - centre.x;
    const dy = at.y - centre.y;
    const heading =
      Math.abs(dx) === Math.abs(dy)
        ? inward
        : Math.abs(dx) > Math.abs(dy)
          ? dx < 0
            ? 'left'
            : 'right'
          : dy < 0
            ? 'up'
            : 'down';
    targets.push(t);
    headings.set(targetKey(t), heading);
  }
  return { targets, headings };
}

/** Footnotes shift only an unobstructed landing; first-unit and blocker targeting stay fixed. */
export function boltTravel(
  s: BattleState,
  caster: Unit,
  dir: Dir,
  gifted: boolean,
  footnotes: NonNullable<DraftOptions['footnotes']> = {},
) {
  const r = travel(s, caster.pos, dir, TUNING.boltRange + (gifted ? 1 : 0), caster.id);
  if (r.reason !== 'end') return r;
  if (hasFootnote({ footnotes }, 'bolt-empty-far')) {
    const extra = travel(s, r.stop, dir, 1, caster.id);
    if (extra.reason === 'end') return { ...r, stop: extra.stop, path: [...r.path, ...extra.path] };
  }
  if (hasFootnote({ footnotes }, 'bolt-empty-near') && r.path.length > 1) {
    const path = r.path.slice(0, -1);
    return { ...r, stop: path[path.length - 1] as Coord, path };
  }
  return r;
}

/** Where a Source aims, and each target's heading (R2, R4, P21–P23). */
export function aimTargets(
  s: BattleState,
  caster: Unit,
  source: SourceRuneId,
  aim: Aim,
  gifted: boolean,
  footnotes: NonNullable<DraftOptions['footnotes']> = {},
): { targets: Target[]; headings: Map<string, Dir | null> } {
  const none = { targets: [], headings: new Map<string, Dir | null>() };
  switch (source) {
    case 'bolt': {
      if (aim.kind !== 'dir') return none;
      const r = boltTravel(s, caster, aim.dir, gifted, footnotes);
      if (r.reason === 'none') return none;
      // P21: no unit in the line → the last tile the line reached (a cloud or a blocker stops it).
      const t: Target =
        r.reason === 'unit' ? { kind: 'unit', unit: r.unit.id } : { kind: 'tile', at: r.stop };
      return { targets: [t], headings: new Map([[targetKey(t), aim.dir]]) };
    }
    case 'splash': {
      if (aim.kind !== 'tile') return none;
      const tiles = clip(s, square(aim.at, TUNING.splashRadius));
      return areaTargets(s, caster, tiles, aim.at);
    }
    case 'vat': {
      if (aim.kind !== 'tile') return none;
      // The 2×2 whose top-left is the aimed tile.
      const { x, y } = aim.at;
      const tiles = clip(s, [aim.at, { x: x + 1, y }, { x, y: y + 1 }, { x: x + 1, y: y + 1 }]);
      return areaTargets(s, caster, tiles, { x: x + 0.5, y: y + 0.5 });
    }
    case 'touch': {
      if (aim.kind === 'self') {
        const t: Target = { kind: 'unit', unit: caster.id };
        return { targets: [t], headings: new Map([[targetKey(t), caster.lastMove]]) };
      }
      if (aim.kind !== 'tile') return none;
      const t = targetOn(s, aim.at);
      return { targets: [t], headings: new Map([[targetKey(t), axisToward(caster.pos, aim.at)]]) };
    }
  }
}
