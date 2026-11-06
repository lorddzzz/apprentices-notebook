import type { Coord } from '$engine';
import type { UnitView } from '../../../app/view';
import { cellCenter, cellOrigin } from '../../components/board/geometry';

/** The bridges' board readers (BR-14): pure functions of a view's tiles and units. */

/** The sides of a set of cells that border no other cell of it, as one path (a section's outline). */
export function perimeter(cells: readonly Coord[]): string {
  const has = new Set(cells.map((c) => `${c.x},${c.y}`));
  const out: string[] = [];
  for (const c of cells) {
    const o = cellOrigin(c);
    const [x0, y0, x1, y1] = [o.x + 4, o.y + 4, o.x + 96, o.y + 96];
    if (!has.has(`${c.x},${c.y - 1}`)) out.push(`M${x0} ${y0}H${x1}`);
    if (!has.has(`${c.x},${c.y + 1}`)) out.push(`M${x0} ${y1}H${x1}`);
    if (!has.has(`${c.x - 1},${c.y}`)) out.push(`M${x0} ${y0}V${y1}`);
    if (!has.has(`${c.x + 1},${c.y}`)) out.push(`M${x1} ${y0}V${y1}`);
  }
  return out.join('');
}

/** A foe's telegraph a bridge layer draws: a chalk circle on `to`, or a carry from `from` to `to`. */
export interface BridgeTelegraph {
  id: string;
  kind: 'chalk' | 'carry';
  from: Coord;
  to: Coord;
}

export function chalkOf(units: readonly UnitView[]): BridgeTelegraph[] {
  const out: BridgeTelegraph[] = [];
  for (const u of units) {
    if (!u.alive || u.intent?.kind !== 'behaviour') continue;
    const { id, telegraph: t } = u.intent;
    if (!id.startsWith('bridges:')) continue;
    const [a, b] = t.tiles;
    if (t.label === 'chalk' && a) out.push({ id: u.id, kind: 'chalk', from: u.pos, to: a });
    else if (t.label === 'carry' && a && b) out.push({ id: u.id, kind: 'carry', from: a, to: b });
  }
  return out;
}

/** The carry arrow: a line from the victim's tile centre to the landing tile, and its chevron. */
export function carryArrow(from: Coord, to: Coord): { line: string; head: string } {
  const a = cellCenter(from);
  const b = cellCenter(to);
  const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
  const ux = (b.x - a.x) / len;
  const uy = (b.y - a.y) / len;
  const s = { x: a.x + ux * 30, y: a.y + uy * 30 };
  const tip = { x: b.x - ux * 26, y: b.y - uy * 26 };
  const f = (n: number) => Math.round(n * 10) / 10;
  const wing = (sign: number) =>
    `${f(tip.x - ux * 20 - uy * 16 * sign)} ${f(tip.y - uy * 20 + ux * 16 * sign)}`;
  return {
    line: `M${f(s.x)} ${f(s.y)}L${f(tip.x)} ${f(tip.y)}`,
    head: `M${wing(1)}L${f(tip.x)} ${f(tip.y)}L${wing(-1)}`,
  };
}
