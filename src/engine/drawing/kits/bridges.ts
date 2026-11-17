import { COSTS } from '$data/drawing';
import { cloneData } from '../../clone';
import { KIT } from '../../districts/kit';
import type { PieceId, RuleId, TripShapeDef } from '../../districts/types';
import type { Coord } from '../../grid';
import type { BoardSpec } from '../../notation';
import { blocksUnits } from '../../queries';
import { createRng } from '../../rng';
import type { FoeKit, GenKit, PieceKit, RuleKit, ShapeKit } from '../types';
import { at, coords, foeKit, isPlain, lay, needsOf, shuffled } from './seam';

/**
 * The bridges' kit (EN-K5; P4, P14, P15, P33): the collapse rule with the spans and piers it
 * brings, the spans and piers as extra pieces, the wardens' staff, and the span choice lent to
 * drawn trips. The district is reached through `KIT` (the lint rule for engine files), read
 * lazily: see the import cycle noted in `generate.ts`. No district file is edited.
 */

export const COLLAPSE: RuleId = 'bridges:collapse';
export const SPAN: PieceId = 'bridges:span';
export const PIER: PieceId = 'bridges:pier';
const KEYSTONE: PieceId = 'bridges:keystone';

const NEIGHBOURS = [
  { x: 1, y: 0 },
  { x: -1, y: 0 },
  { x: 0, y: 1 },
  { x: 0, y: -1 },
] as const;
const pieceAt = (layout: BoardSpec, c: Coord): string | undefined => at(layout, c)?.piece?.id;
const plainAt = (layout: BoardSpec, c: Coord): boolean => {
  const t = at(layout, c);
  return t !== undefined && isPlain(t);
};
const isNet = (layout: BoardSpec, c: Coord): boolean => {
  const id = pieceAt(layout, c);
  return id === SPAN || id === PIER || id === KEYSTONE;
};

/**
 * Span tiles in a network (spans, piers and keystones, 4-connected) that holds no pier or keystone:
 * the tiles the collapse would drop at the first dusk (the district's support model, P2).
 */
export function unsupportedSpans(layout: BoardSpec): Coord[] {
  const seen = new Set<string>();
  const out: Coord[] = [];
  for (const start of coords(layout)) {
    if (!isNet(layout, start) || seen.has(`${start.x},${start.y}`)) continue;
    const group: Coord[] = [];
    const queue = [start];
    seen.add(`${start.x},${start.y}`);
    for (let c = queue.pop(); c; c = queue.pop()) {
      group.push(c);
      for (const d of NEIGHBOURS) {
        const n = { x: c.x + d.x, y: c.y + d.y };
        if (isNet(layout, n) && !seen.has(`${n.x},${n.y}`)) {
          seen.add(`${n.x},${n.y}`);
          queue.push(n);
        }
      }
    }
    if (group.every((c) => pieceAt(layout, c) === SPAN)) out.push(...group);
  }
  return out;
}

/** A tile a walker can stand on once `gone` has fallen: not blocked, not fog, not water. */
const standing = (layout: BoardSpec, c: Coord, gone: ReadonlySet<string>): boolean => {
  const t = at(layout, c);
  return (
    t !== undefined &&
    !gone.has(`${c.x},${c.y}`) &&
    !blocksUnits(t) &&
    !t.terrain.drop &&
    t.terrain.water === null
  );
};

/**
 * Why the party could be stranded on this layout, or `null` when it cannot: after the collapse
 * rule's first step (every unsupported span falls) every start point still stands, all of them
 * are joined by one walkable region, and every foe stands in it. The room check the span kit's
 * `valid` runs (EN-K5: never stranded).
 */
export function strandedBy(layout: BoardSpec): string | null {
  const gone = new Set(unsupportedSpans(layout).map((c) => `${c.x},${c.y}`));
  const [first, ...rest] = layout.starts;
  if (!first) return 'The room has no start point';
  if (![first, ...rest].every((c) => standing(layout, c, gone))) {
    return 'A start point falls at the first dusk';
  }
  const seen = new Set<string>([`${first.x},${first.y}`]);
  const queue = [first];
  for (let c = queue.pop(); c; c = queue.pop()) {
    for (const d of NEIGHBOURS) {
      const n = { x: c.x + d.x, y: c.y + d.y };
      if (standing(layout, n, gone) && !seen.has(`${n.x},${n.y}`)) {
        seen.add(`${n.x},${n.y}`);
        queue.push(n);
      }
    }
  }
  if (rest.some((c) => !seen.has(`${c.x},${c.y}`))) return 'The start points are cut apart';
  const foe = layout.units.find((u) => u.kind === 'enemy' && !seen.has(`${u.at.x},${u.at.y}`));
  return foe ? 'A foe is cut off from the party' : null;
}

/** The layout holds together at the first dusk: nothing cracked and nobody stranded. */
const holdsTogether = (layout: BoardSpec): boolean =>
  unsupportedSpans(layout).length === 0 && strandedBy(layout) === null;

const stoneOf = (layout: BoardSpec, c: Coord): number => {
  const data = at(layout, c)?.piece?.data as { stone?: number } | null | undefined;
  return data?.stone ?? 2;
};

/**
 * The collapse's stamp (P4: the rule brings its spans and piers): a bridge across the middle of the
 * board, a span on every tile inside a ring of ground, a pier on each corner of the ring (the
 * abutments) and on one or two span tiles inside, so every span has a footing and none starts
 * cracked. Start points and ground stay on the ring, so the party is never walled in by the stamp.
 * Fuller (a crumbling span): one stone on every span and a single footing. The minimum stamp is two
 * stone and one footing. There is no fog: nothing here is dropped by the stamp itself.
 */
export const collapseKit: RuleKit = {
  id: COLLAPSE,
  needs: needsOf(COLLAPSE),
  brings: [SPAN, PIER] satisfies PieceId[],
  stamp(layout, seed, minimum, fuller = false) {
    const rng = createRng(seed);
    const out = cloneData(layout);
    const w = out.width;
    const h = out.height;
    const inner = coords(out).filter(
      (c) => c.x >= 1 && c.x <= w - 2 && c.y >= 1 && c.y <= h - 2 && plainAt(out, c),
    );
    const stone = fuller && !minimum ? 1 : 2;
    for (const c of inner) lay(out, c, `{span:${stone}}`);
    for (const c of [
      { x: 0, y: 0 },
      { x: w - 1, y: 0 },
      { x: 0, y: h - 1 },
      { x: w - 1, y: h - 1 },
    ]) {
      lay(out, c, '{pier}');
    }
    const footings = minimum || fuller ? 1 : rng.int(2, 3);
    for (const c of shuffled(inner, rng).slice(0, footings)) lay(out, c, '{pier}');
    return out;
  },
};

/** Extra piers and spans (the two piece picks of a drawing): each keeps the layout together. */
const spanKit: PieceKit = {
  id: SPAN,
  cost: COSTS.piece,
  needs: needsOf(SPAN),
  place(layout, seed) {
    const rng = createRng(seed);
    const out = cloneData(layout);
    const beside = shuffled(
      coords(out).filter(
        (c) =>
          plainAt(out, c) &&
          NEIGHBOURS.some((d) => pieceAt(out, { x: c.x + d.x, y: c.y + d.y }) === SPAN),
      ),
      rng,
    );
    const c = beside[0];
    if (!c) return null;
    const next = NEIGHBOURS.map((d) => ({ x: c.x + d.x, y: c.y + d.y })).find(
      (n) => pieceAt(out, n) === SPAN,
    );
    lay(out, c, `{span:${next ? stoneOf(out, next) : 2}}`);
    return out;
  },
  matters: (layout) => coords(layout).filter((c) => pieceAt(layout, c) === SPAN).length,
  valid: holdsTogether,
};
const pierKit: PieceKit = {
  id: PIER,
  cost: COSTS.piece,
  needs: needsOf(PIER),
  place(layout, seed) {
    const rng = createRng(seed);
    const out = cloneData(layout);
    const c = shuffled(
      coords(out).filter((x) => pieceAt(out, x) === SPAN),
      rng,
    )[0];
    if (!c) return null;
    lay(out, c, '{pier}');
    return out;
  },
  matters: (layout) => coords(layout).filter((c) => pieceAt(layout, c) === SPAN).length / 2,
  valid: holdsTogether,
};

/** A foe that stays off fog (a generated room has none, but a heart or a piece might). */
const wardenFoe = (id: 'warden' | 'gargoyle' | 'mason'): FoeKit => {
  const base = foeKit(id);
  return {
    ...base,
    valid: (layout, c) => base.valid(layout, c) && at(layout, c)?.terrain.drop === false,
  };
};

// ── The span choice (P15) ───────────────────────────────

const SPAN_CHOICE = 'bridges:span';
export const SPAN_IDS = ['sound', 'crumbling'] as const;
const LABELS: Record<(typeof SPAN_IDS)[number], string> = {
  sound: 'The sound span (long)',
  crumbling: 'The crumbling span (short)',
};

/** The district's span shape, read when first used (the cycle noted in `generate.ts`). */
const spanShape = (): TripShapeDef => {
  const shape = KIT.shapes[SPAN_CHOICE];
  if (!shape) throw new RangeError(`No kit for ${SPAN_CHOICE}`);
  return shape;
};

/**
 * The two ways on before every room after the first (P15), none after the heart's room. A choice
 * carries no variant pool: a generated room has none, its spec changes instead (`adjustSpan`).
 */
export const spanChoices: NonNullable<TripShapeDef['choices']> = (input) =>
  input.room >= input.length - 1
    ? []
    : SPAN_IDS.map((id) => ({ id, label: LABELS[id], kind: 'push' as const }));

/**
 * What the choice changes in the next room's spec: the sound span (long) makes a bigger board and
 * one more foe's worth of budget on top of the walk's; the crumbling span (short) stamps the
 * collapse at its fuller setting. The heart's spec is its frame's and never moves.
 */
export const adjustSpan: NonNullable<ShapeKit['adjust']> = (spec, choice) => {
  if (spec.heart) return spec;
  if (choice === 'sound') {
    return {
      ...spec,
      size: { width: Math.min(7, spec.size.width + 1), height: Math.min(9, spec.size.height + 1) },
      budget: spec.budget + 1,
    };
  }
  if (choice === 'crumbling') return { ...spec, fuller: true };
  return spec;
};

/**
 * The span choice, lent at every length a drawing takes. The district's own shape reads its
 * variant pools; this one keeps its state reader and start and offers the choice without them.
 */
export const spanShapeKit: ShapeKit = {
  id: SPAN_CHOICE,
  needs: needsOf(SPAN_CHOICE),
  lengths: [3, 4, 5, 6],
  adjust: adjustSpan,
  get shape(): TripShapeDef {
    const home = spanShape();
    return {
      id: home.id,
      parseState: home.parseState,
      initState: home.initState,
      choices: spanChoices,
    };
  },
};

/** The bridges: the collapse with its spans and piers, the wardens' staff and the span choice. */
export const BRIDGES_KIT: GenKit = {
  district: 'bridges',
  rules: [collapseKit],
  pieces: [spanKit, pierKit],
  foes: (['warden', 'gargoyle', 'mason'] as const).map(wardenFoe),
  shapes: [spanShapeKit],
  frames: [],
};
