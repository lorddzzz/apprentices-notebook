import { ENEMIES, MEMBERS } from '$data';
import { type Coord, label } from '$engine';
import { LAYER_NAME } from '../../../app/describe';
import type { BoardView, UnitView } from '../../../app/view';

const nameOf = (r: string): string => (r.startsWith('inv:') ? r.slice(4) : r);

function unitPhrase(u: UnitView): string {
  const name =
    u.kind === 'member'
      ? MEMBERS[u.def as keyof typeof MEMBERS].name
      : ENEMIES[u.def as keyof typeof ENEMIES].name;
  const bits = [`${name}, ${u.hp} of ${u.maxHp} HP`];
  if (u.shield > 0) bits.push(`shield ${u.shield}`);
  if (u.mark) {
    const how = u.mark === 'deep' ? 'deeply marked' : 'marked';
    bits.push(u.bound ? `${how}, holding ${nameOf(u.bound)}` : how);
  }
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
    if (t.piece) parts.push(t.piece.label);
    if (t.vent) parts.push('steam vent');
    if (t.drop) parts.push('a drop');
    if (t.jar) {
      const owner = view.units.find((x) => x.id === t.jar?.owner)?.name ?? t.jar.owner;
      const holds = t.jar.peek ? `, starts with ${nameOf(t.jar.peek)}` : '';
      parts.push(
        `sealed jar of ${owner}, opens ${t.jar.event === 'step' ? 'on a step' : 'at dusk'}${holds}`,
      );
    }
    if (t.state) {
      const name = LAYER_NAME[t.state];
      const bits: string[] = [];
      if (t.rounds > 0) bits.push(`${t.rounds} ${t.rounds === 1 ? 'round' : 'rounds'}`);
      if (t.hits > 0) bits.push(`${t.hits} ${t.hits === 1 ? 'hit' : 'hits'} left`);
      parts.push(bits.length ? `${name} (${bits.join(', ')})` : name);
    }
  }
  return `${label(at)}: ${parts.length ? parts.join(', ') : 'empty'}`;
}
