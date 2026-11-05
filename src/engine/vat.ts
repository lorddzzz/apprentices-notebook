import type { DraftOptions } from './ctx';
import { hasFootnote } from './footnotes';
import type { Coord, Dir } from './grid';
import { clip, inBoard } from './queries';
import type { BattleState, Target } from './types';
import { targetKey } from './types';

/**
 * The Vat's footnote pieces (bathhouses margins, BH-F3): where its 2×2 sits near the room's
 * edge, and what a cast's plan adds around the rest (press, room, crowd, fill). Pure of the
 * board; `targets.ts` aims the square; the plan around the steps is `vatPlan.ts`.
 */

type Notes = NonNullable<DraftOptions['footnotes']>;

/** The square's top-left: `vat-edge-slide` shifts it inward so it stays a full 2×2. */
export function vatOrigin(s: BattleState, at: Coord, footnotes: Notes = {}): Coord {
  if (!hasFootnote({ footnotes }, 'vat-edge-slide')) return at;
  return {
    x: Math.max(0, Math.min(at.x, s.width - 2)),
    y: Math.max(0, Math.min(at.y, s.height - 2)),
  };
}

/** The four tiles of the square at `o`, clipped to the board. */
export const vatTiles = (s: BattleState, o: Coord): Coord[] =>
  clip(s, [o, { x: o.x + 1, y: o.y }, { x: o.x, y: o.y + 1 }, { x: o.x + 1, y: o.y + 1 }]);

/** How many of the aimed square's tiles are off the board. */
export const vatLost = (s: BattleState, at: Coord): number => 4 - vatTiles(s, at).length;

/** The twelve tiles around the square at `o` (a 4×4 minus the 2×2), clipped to the board. */
export function vatRing(s: BattleState, o: Coord): Coord[] {
  const out: Coord[] = [];
  for (let y = o.y - 1; y <= o.y + 2; y++) {
    for (let x = o.x - 1; x <= o.x + 2; x++) {
      const inside = x >= o.x && x <= o.x + 1 && y >= o.y && y <= o.y + 1;
      if (!inside && inBoard(s, { x, y })) out.push({ x, y });
    }
  }
  return out;
}

/** Headings per tile for `vat-unit-scatter` / `-gather`: sideways away from, or toward, the middle. */
export function vatHeadings(
  s: BattleState,
  targets: readonly Target[],
  headings: Map<string, Dir | null>,
  o: Coord,
  footnotes: Notes,
): void {
  const scatter = hasFootnote({ footnotes }, 'vat-unit-scatter');
  const gather = hasFootnote({ footnotes }, 'vat-unit-gather');
  if (!scatter && !gather) return;
  for (const t of targets) {
    const at = t.kind === 'tile' ? t.at : s.units.find((u) => u.id === t.unit)?.pos;
    if (!at) continue;
    const left = at.x === o.x;
    headings.set(targetKey(t), left === scatter ? 'left' : 'right');
  }
}

/** `vat-unit-pour`: each empty tile target pours its share on the first unit, at most twice. */
export function vatPour(targets: Target[], headings: Map<string, Dir | null>): Target[] {
  const first = targets.find((t) => t.kind === 'unit');
  if (!first) return targets;
  let left = 2;
  const out = targets.map((t) => {
    if (t.kind !== 'tile' || left === 0) return t;
    left--;
    return first;
  });
  headings.set(targetKey(first), headings.get(targetKey(first)) ?? null);
  return out;
}
