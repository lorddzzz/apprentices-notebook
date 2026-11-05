import { type LineId, type SourceRuneId, TUNING } from '$data';
import type { DraftOptions, FootnoteVariantId } from './ctx';
import { hasFootnote } from './footnotes';
import { byReadingOrder, type Coord, type Dir, neighbors4, opposite, square, step } from './grid';
import { clip, inBoard, isCloud, type Travel, tileAt, travel, unitAt } from './queries';
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
export function axisToward(from: Coord, to: Coord): Dir | null {
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
  footnotes: NonNullable<DraftOptions['footnotes']> = {},
): { targets: Target[]; headings: Map<string, Dir | null> } {
  const fn = (id: FootnoteVariantId) => hasFootnote({ footnotes }, id);
  let inward = axisToward(caster.pos, { x: Math.round(centre.x), y: Math.round(centre.y) });
  // `splash-member-step` (a Splash on your own tile) and `splash-member-ride` (the caster's own
  // tile) take the way of the last step.
  if (!inward && fn('splash-member-step')) inward = caster.lastMove;
  const targets: Target[] = [];
  const headings = new Map<string, Dir | null>();
  for (const at of [...tiles].sort(byReadingOrder)) {
    // `splash-member-spared`: your own Splash passes over you.
    if (fn('splash-member-spared') && at.x === caster.pos.x && at.y === caster.pos.y) continue;
    const t = targetOn(s, at);
    const dx = at.x - centre.x;
    const dy = at.y - centre.y;
    let heading: Dir | null =
      Math.abs(dx) === Math.abs(dy)
        ? inward
        : Math.abs(dx) > Math.abs(dy)
          ? dx < 0
            ? 'left'
            : 'right'
          : dy < 0
            ? 'up'
            : 'down';
    if (fn('splash-unit-sweep')) heading = inward;
    else if (fn('splash-unit-gather') && Math.abs(dx) !== Math.abs(dy) && heading) {
      heading = opposite(heading);
    }
    if (fn('splash-member-ride') && at.x === caster.pos.x && at.y === caster.pos.y) {
      heading = caster.lastMove;
    }
    targets.push(t);
    headings.set(targetKey(t), heading);
  }
  // `splash-cap-heart`: a unit at the centre is acted on twice (its second turn comes last).
  const heart = targets.find((t) => {
    const at = whereIs(s, t);
    return t.kind === 'unit' && at && at.x === centre.x && at.y === centre.y;
  });
  if (heart && fn('splash-cap-heart')) targets.push(heart);
  return { targets, headings };
}

/**
 * The tiles between `from` and `to` (neither included), one step at a time along the larger axis
 * (a tie goes vertical, like `axisToward`): what `splash-cap-trail` lays a kind on.
 */
export function tilesBetween(from: Coord, to: Coord): Coord[] {
  const out: Coord[] = [];
  let at = from;
  for (let i = 0; i < 64; i++) {
    const way = axisToward(at, to);
    if (!way) break;
    at = step(at, way);
    if (at.x === to.x && at.y === to.y) break;
    out.push(at);
  }
  return out;
}

/** A Bolt's flight, with what footnotes did to it (each field is set only by its variant). */
export type BoltFlight = Travel & {
  /** `bolt-cloud-through`: the cloud tile the shot passed (the log stamps it `bolt:cloud`). */
  through?: Coord;
  /** `bolt-empty-seek`: the neighbour an unobstructed shot turned onto. */
  seek?: Unit;
};

const SETTLES: ReadonlySet<string> = new Set([
  'slick',
  'pool',
  'greaseFog',
  'blot',
  'stain',
  'fire',
]);

/**
 * The Bolt's travel. Footnotes shift an unobstructed landing (far, near, settle, seek) and bend how
 * a cloud meets the line (through, find, cover); first-unit and blocker stops stay fixed.
 */
export function boltTravel(
  s: BattleState,
  caster: Unit,
  dir: Dir,
  gifted: boolean,
  footnotes: NonNullable<DraftOptions['footnotes']> = {},
): BoltFlight {
  const fn = (id: FootnoteVariantId) => hasFootnote({ footnotes }, id);
  const range = TUNING.boltRange + (gifted ? 1 : 0);
  let from = caster.pos;
  let remaining = range;
  const lead: Coord[] = [];
  // `bolt-cloud-cover`: the cloud the caster stands in does not stop the shot.
  if (fn('bolt-cloud-cover') && isCloud(tileAt(s, caster.pos))) {
    while (remaining > 0) {
      const nxt = step(from, dir);
      if (!inBoard(s, nxt) || !isCloud(tileAt(s, nxt))) break;
      lead.push(nxt);
      from = nxt;
      remaining--;
      const u = unitAt(s, nxt);
      if (u && u.id !== caster.id) return { reason: 'unit', path: lead, stop: nxt, unit: u };
    }
  }
  const first = travel(s, from, dir, remaining, caster.id);
  let r: BoltFlight =
    first.reason === 'none'
      ? lead.length
        ? { reason: 'end', path: lead, stop: lead[lead.length - 1] as Coord }
        : first
      : { ...first, path: [...lead, ...first.path] };
  // `bolt-cloud-through`: the first cloud tile met is passed, if anything lies beyond it.
  // `ink-cap-seen`: a marked foe in the cloud line is not hidden; the shot stops on it.
  if (fn('ink-cap-seen') && first.reason === 'cloud') {
    let cur = first.stop;
    const way = [...lead, ...first.path];
    for (let i = first.path.length; i <= remaining; i++) {
      const u = unitAt(s, cur);
      if (u && u.kind === 'enemy' && u.mark && u.id !== caster.id) {
        return { reason: 'unit', path: way, stop: cur, unit: u };
      }
      const nxt = step(cur, dir);
      if (!inBoard(s, nxt) || !isCloud(tileAt(s, nxt))) break;
      cur = nxt;
      way.push(nxt);
    }
  }
  if (fn('bolt-cloud-through') && first.reason === 'cloud') {
    const left = remaining - first.path.length;
    const beyond = left > 0 ? travel(s, first.stop, dir, left, caster.id) : null;
    if (beyond && beyond.reason !== 'none') {
      r = { ...beyond, path: [...lead, ...first.path, ...beyond.path], through: first.stop };
    }
  }
  if (r.reason !== 'end') return r;
  // `bolt-empty-settle`: the first slick, blot or fire on the way ends the shot; never shifted.
  if (fn('bolt-empty-settle')) {
    const i = r.path.findIndex((at) => SETTLES.has(tileAt(s, at).state?.id ?? ''));
    if (i >= 0) {
      const path = r.path.slice(0, i + 1);
      return seek({ ...r, stop: path[i] as Coord, path });
    }
  }
  if (fn('bolt-empty-far')) {
    const extra = travel(s, r.stop, dir, 1, caster.id);
    if (extra.reason === 'end') r = { ...r, stop: extra.stop, path: [...r.path, ...extra.path] };
  } else if (fn('bolt-empty-near') && r.path.length > 1) {
    const path = r.path.slice(0, -1);
    r = { ...r, stop: path[path.length - 1] as Coord, path };
  }
  return seek(r);

  function seek(f: BoltFlight): BoltFlight {
    if (!fn('bolt-empty-seek') || f.reason !== 'end') return f;
    const beside = neighbors4(f.stop)
      .sort(byReadingOrder)
      .map((at) => unitAt(s, at))
      .find((u) => u && u.id !== caster.id);
    return beside ? { ...f, seek: beside } : f;
  }
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
      // Footnotes: `bolt-empty-seek` turns onto a neighbour; `bolt-cloud-find` aims at the unit
      // hidden in the cloud that stopped the shot.
      const found = r.reason === 'cloud' && hasFootnote({ footnotes }, 'bolt-cloud-find');
      const t: Target =
        r.reason === 'unit'
          ? { kind: 'unit', unit: r.unit.id }
          : r.seek
            ? { kind: 'unit', unit: r.seek.id }
            : found
              ? targetOn(s, r.stop)
              : { kind: 'tile', at: r.stop };
      const out: Target[] = [t];
      // `bolt-cap-front`: a Bolt that reaches a unit also acts on the empty tile just before it.
      const front = r.reason === 'unit' ? r.path[r.path.length - 2] : undefined;
      if (front && hasFootnote({ footnotes }, 'bolt-cap-front')) {
        out.push({ kind: 'tile', at: { ...front } });
      }
      return { targets: out, headings: new Map(out.map((x) => [targetKey(x), aim.dir])) };
    }
    case 'splash': {
      if (aim.kind !== 'tile') return none;
      const tiles = clip(s, square(aim.at, TUNING.splashRadius));
      return areaTargets(s, caster, tiles, aim.at, footnotes);
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
        // `touch-member-memory`: no step this turn, so the last step of an earlier turn.
        const way =
          caster.lastMove ??
          (hasFootnote({ footnotes }, 'touch-member-memory') ? (caster.prevMove ?? null) : null);
        const out: Target[] = [t];
        const headings = new Map<string, Dir | null>([[targetKey(t), way]]);
        // `touch-cap-wake`: the tile you stepped from is acted on too.
        if (caster.lastMove && hasFootnote({ footnotes }, 'touch-cap-wake')) {
          const wake: Target = { kind: 'tile', at: step(caster.pos, opposite(caster.lastMove)) };
          if (inBoard(s, wake.at)) {
            out.push(wake);
            headings.set(targetKey(wake), way);
          }
        }
        return { targets: out, headings };
      }
      if (aim.kind !== 'tile') return none;
      const t = targetOn(s, aim.at);
      // `touch-unit-steer`: a Touch on a unit points the way you stepped.
      const steer =
        t.kind === 'unit' && caster.lastMove && hasFootnote({ footnotes }, 'touch-unit-steer');
      const way = steer ? caster.lastMove : axisToward(caster.pos, aim.at);
      const out: Target[] = [t];
      // `touch-cap-behind`: a neighbouring unit's line goes on to the unit behind it.
      const near = Math.abs(aim.at.x - caster.pos.x) + Math.abs(aim.at.y - caster.pos.y) === 1;
      const line = axisToward(caster.pos, aim.at);
      if (t.kind === 'unit' && near && line && hasFootnote({ footnotes }, 'touch-cap-behind')) {
        const behind = unitAt(s, step(aim.at, line));
        if (behind) out.push({ kind: 'unit', unit: behind.id });
      }
      return { targets: out, headings: new Map(out.map((x) => [targetKey(x), way])) };
    }
  }
}

/**
 * The fine-print line an aim meets (stamped on the `aimed` event), most telling first. A Splash
 * on your own tile gives its centre and corners no heading; the caster inside its own area is a
 * target like anyone; near an edge the 3×3 is clipped; otherwise a unit in it takes its heading
 * from the centre. A Touch on yourself carries your last step; on a unit it points away from you.
 */
export function aimLine(
  caster: Unit,
  source: SourceRuneId,
  aim: Aim,
  targets: readonly Target[],
  footnotes: NonNullable<DraftOptions['footnotes']> = {},
): LineId | null {
  if (source === 'splash' && aim.kind === 'tile') {
    const own = aim.at.x === caster.pos.x && aim.at.y === caster.pos.y;
    // `splash-member-step` gives the centre a heading once you have stepped: it is no longer blind.
    const stepped = caster.lastMove && hasFootnote({ footnotes }, 'splash-member-step');
    if (own && !stepped) return 'splash:noHeading';
    // The caster stands in the 3x3 even when `splash-member-spared` left her out of its targets.
    const inside =
      Math.abs(caster.pos.x - aim.at.x) <= TUNING.splashRadius &&
      Math.abs(caster.pos.y - aim.at.y) <= TUNING.splashRadius;
    if (inside) return 'splash:member';
    if (targets.length < square(aim.at, TUNING.splashRadius).length) return 'splash:edge';
    return targets.some((t) => t.kind === 'unit') ? 'splash:unit' : null;
  }
  if (source === 'vat' && aim.kind === 'tile') {
    // Every tile of the 2x2 is diagonal to its centre: all four take the caster-to-square heading,
    // which does not exist when the caster stands on the square's bottom-right tile.
    if (caster.pos.x === aim.at.x + 1 && caster.pos.y === aim.at.y + 1) return 'vat:noHeading';
    if (targets.some((t) => t.kind === 'unit' && t.unit === caster.id)) return 'vat:member';
    if (targets.length < 4) return 'vat:edge';
    return targets.some((t) => t.kind === 'unit') ? 'vat:unit' : null;
  }
  if (source === 'touch') {
    if (aim.kind === 'self') return 'touch:member';
    const first = targets[0];
    return aim.kind === 'tile' && first?.kind === 'unit' ? 'touch:unit' : null;
  }
  return null;
}

/**
 * `splash-member-friendly`: a Strike or Spark in your own Splash passes over your allies (not you).
 * Only units the Splash itself aimed at count; kinds and pushes still reach them.
 */
export function splashSpares(
  ctx: { footnotes: NonNullable<DraftOptions['footnotes']> },
  flow: { src?: SourceRuneId; area?: readonly string[] } | null,
  caster: Unit,
  unit: Unit,
): boolean {
  return (
    flow?.src === 'splash' &&
    unit.id !== caster.id &&
    unit.kind === caster.kind &&
    flow.area?.includes(unit.id) === true &&
    hasFootnote(ctx, 'splash-member-friendly')
  );
}
