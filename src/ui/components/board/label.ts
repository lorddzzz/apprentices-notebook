import { ENEMIES, MEMBERS } from '$data';
import { type Coord, label } from '$engine';
import type { BoardView, UnitView } from '../../../app/view';

function unitPhrase(u: UnitView): string {
  const name =
    u.kind === 'member'
      ? MEMBERS[u.def as keyof typeof MEMBERS].name
      : ENEMIES[u.def as keyof typeof ENEMIES].name;
  const bits = [`${name}, ${u.hp} of ${u.maxHp} HP`];
  if (u.shield > 0) bits.push(`shield ${u.shield}`);
  if (u.inked) bits.push('inked');
  if (u.brass) bits.push('brass-coated');
  if (u.oilSoaked) bits.push('oil-soaked');
  return bits.join(', ');
}

/** Screen-reader / test-driver label of one board cell: `C4: rat, 2 of 2 HP, oil`. */
export function cellLabel(view: BoardView, at: Coord): string {
  const t = view.tiles[at.y * view.width + at.x];
  const parts: string[] = [];
  const u = view.units.find((x) => x.alive && x.pos.x === at.x && x.pos.y === at.y);
  if (u) parts.push(unitPhrase(u));
  if (t) {
    if (t.plate) parts.push('brass plate');
    if (t.water) parts.push(`water flowing ${t.water}`);
    if (t.grate) parts.push('grate');
    if (t.gate) parts.push('lock gate');
    if (t.lamp) parts.push('lamp');
    if (t.vent) parts.push('steam vent');
    if (t.oil) parts.push('oil');
    if (t.ink) parts.push('ink');
    if (t.fire > 0) parts.push(`fire (${t.fire} ${t.fire === 1 ? 'round' : 'rounds'})`);
    if (t.steam > 0) parts.push(`steam (${t.steam} ${t.steam === 1 ? 'round' : 'rounds'})`);
  }
  return `${label(at)}: ${parts.length ? parts.join(', ') : 'empty'}`;
}
