import { ENEMIES, MEMBERS } from '$data';
import { type Coord, label } from '$engine';
import { LAYER_NAME } from '../../../app/describe';
import type { BoardView, UnitView } from '../../../app/view';

function unitPhrase(u: UnitView): string {
  const name =
    u.kind === 'member'
      ? MEMBERS[u.def as keyof typeof MEMBERS].name
      : ENEMIES[u.def as keyof typeof ENEMIES].name;
  const bits = [`${name}, ${u.hp} of ${u.maxHp} HP`];
  if (u.shield > 0) bits.push(`shield ${u.shield}`);
  if (u.mark === 'deep') bits.push('deeply marked');
  else if (u.mark === 'plain') bits.push('marked');
  if (u.shackle) bits.push('shackled');
  else if (u.collar) bits.push('collared');
  if (u.held) bits.push('held');
  if (u.stunned) bits.push('stunned');
  return bits.join(', ');
}

/** Screen-reader / test-driver label of one board cell: `C4: rat, 2 of 2 HP, oil`. */
export function cellLabel(view: BoardView, at: Coord): string {
  const t = view.tiles[at.y * view.width + at.x];
  const parts: string[] = [];
  const u = view.units.find((x) => x.alive && x.pos.x === at.x && x.pos.y === at.y);
  if (u) parts.push(unitPhrase(u));
  if (t) {
    if (t.water) parts.push(`water flowing ${t.water}`);
    if (t.grate) parts.push('grate');
    if (t.gate) parts.push('lock gate');
    if (t.lamp) parts.push('lamp');
    if (t.vent) parts.push('steam vent');
    if (t.drop) parts.push('a drop');
    if (t.jar) parts.push('sealed jar');
    if (t.state) {
      const name = LAYER_NAME[t.state];
      parts.push(
        t.rounds > 0 ? `${name} (${t.rounds} ${t.rounds === 1 ? 'round' : 'rounds'})` : name,
      );
    }
  }
  return `${label(at)}: ${parts.length ? parts.join(', ') : 'empty'}`;
}
