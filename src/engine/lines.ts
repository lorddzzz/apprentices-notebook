import type { LineId } from '$data';
import { type GameEvent, isSilent } from './events';
import type { Coord } from './grid';
import type { UnitId } from './types';

/** Lines fired in a log, first-seen order (L1). */
export function witnessedIn(log: readonly GameEvent[]): LineId[] {
  const seen = new Set<LineId>();
  for (const e of log) if (e.line) seen.add(e.line);
  return [...seen];
}

/** Where an event lands on the board: the tile a masked preview leaves blank (P41). */
function landingOf(e: GameEvent): Coord | null {
  switch (e.type) {
    case 'landed':
    case 'mixed':
    case 'washed':
    case 'burst':
    case 'dropped':
    case 'erased':
    case 'jarSealed':
    case 'jarOpened':
    case 'jarCrumbles':
    case 'scheduled':
      return e.at;
    case 'push':
      return e.path[e.path.length - 1] ?? e.unit.at;
    case 'drawn':
      return e.to;
    case 'markSpread':
      return e.from.at;
    case 'markLifted':
      return e.to.at;
    case 'conducted':
      return null;
    case 'swapped':
      return e.b.at;
    case 'damage':
    case 'crush':
    case 'stunned':
    case 'held':
    case 'marked':
    case 'collared':
    case 'markSpent':
    case 'released':
    case 'died':
      return 'target' in e ? e.target.at : e.unit.at;
    default:
      return null;
  }
}

/** Party members an event hurts: damage, a crush (the pushed unit and what it hit), a drop. */
function hurtBy(e: GameEvent): UnitId[] {
  switch (e.type) {
    case 'damage':
      return e.target.member ? [e.target.id] : [];
    case 'crush': {
      const out = e.unit.member ? [e.unit.id] : [];
      if (typeof e.into === 'object' && e.into.member) out.push(e.into.id);
      return out;
    }
    case 'dropped':
      return e.unit.member ? [e.unit.id] : [];
    default:
      return [];
  }
}

/**
 * D2/D3, P41–P42: events stamped with an unwitnessed line are hidden and their landing tile
 * becomes a blank (no text, no number); headline events and witnessed lines stay in `shown`.
 * Any damage, crush or drop to a party member, masked or not, puts that member in `hurt`.
 */
export function maskPreview(
  log: readonly GameEvent[],
  witnessed: ReadonlySet<LineId>,
  party: readonly UnitId[],
): { shown: GameEvent[]; blanks: Coord[]; hurt: UnitId[] } {
  const shown: GameEvent[] = [];
  const blanks: Coord[] = [];
  const hurt: UnitId[] = [];
  const inParty = new Set(party);
  for (const e of log) {
    for (const id of hurtBy(e)) if (inParty.has(id) && !hurt.includes(id)) hurt.push(id);
    if (!e.line || witnessed.has(e.line)) {
      shown.push(e);
      continue;
    }
    if (isSilent(e)) continue;
    const at = landingOf(e);
    if (at && !blanks.some((b) => b.x === at.x && b.y === at.y)) blanks.push({ ...at });
  }
  return { shown, blanks, hurt };
}
