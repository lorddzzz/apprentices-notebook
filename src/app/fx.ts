import { ATTACKS } from '$data';
import {
  type Action,
  aimPreview,
  type BattleState,
  type Coord,
  findUnit,
  type GameEvent,
  inBounds,
  step,
} from '$engine';
import type { BoardView } from './view';

export type Tone =
  | 'ink'
  | 'oil'
  | 'steam'
  | 'spark'
  | 'brass'
  | 'fire'
  | 'danger'
  | 'shield'
  | 'source'
  | 'member';

export type Fx =
  | { kind: 'trail'; cells: Coord[]; tone: Tone } // projectile / move path
  | { kind: 'burst'; cells: Coord[]; tone: Tone; stagger: number } // tiles flash in order (ms apart)
  | { kind: 'zap'; from: Coord; cells: Coord[] } // arc / conduct zigzags from → each
  | { kind: 'float'; at: Coord; text: string; tone: Tone } // "−3", "+2 shield"
  | { kind: 'pulse'; at: Coord; tone: Tone } // cast, detonate, coat
  | { kind: 'banner'; text: string }; // "Your turn", "Round 3"

const burst = (cells: Coord[], tone: Tone, stagger = 0): Fx => ({
  kind: 'burst',
  cells,
  tone,
  stagger,
});

/** Transient effects for one event. `before` is the view just before it (to find where units were). */
export function fxFor(e: GameEvent, before: BoardView): Fx[] {
  const posOf = (id: string): Coord | undefined => before.units.find((u) => u.id === id)?.pos;
  switch (e.type) {
    case 'battleStart':
      return [{ kind: 'banner', text: e.title }];
    case 'round':
      return [{ kind: 'banner', text: `Round ${e.round}` }];
    case 'phase':
      return e.phase === 'player' ? [{ kind: 'banner', text: 'Your turn' }] : [];
    case 'won':
      return [{ kind: 'banner', text: 'The party wins' }];
    case 'lost':
      return [{ kind: 'banner', text: 'The party is wiped out' }];
    case 'moved':
      return [{ kind: 'trail', cells: e.path, tone: e.unit.member ? 'member' : 'danger' }];
    case 'moveUndone':
    case 'pushed': {
      const from = posOf(e.unit.id) ?? e.unit.at;
      return [{ kind: 'trail', cells: [from, e.to], tone: e.unit.member ? 'member' : 'danger' }];
    }
    case 'slide':
      return [{ kind: 'trail', cells: e.path, tone: 'oil' }];
    case 'cast':
      return [{ kind: 'pulse', at: e.caster.at, tone: 'source' }];
    case 'lands':
    case 'stopped':
      return [{ kind: 'trail', cells: e.path, tone: 'source' }];
    case 'splash':
      return [burst(e.tiles, 'source')];
    case 'damage':
      return [{ kind: 'float', at: e.target.at, text: `−${e.amount}`, tone: 'danger' }];
    case 'shieldAbsorbs':
      return [{ kind: 'float', at: e.unit.at, text: `${e.absorbed} blocked`, tone: 'shield' }];
    case 'shieldGained':
      return [{ kind: 'float', at: e.unit.at, text: `+${e.amount} shield`, tone: 'shield' }];
    case 'died':
      return [{ kind: 'pulse', at: e.unit.at, tone: 'danger' }];
    case 'inked':
      return [burst([e.unit.at], 'ink')];
    case 'smear':
      return [
        burst(
          e.to.map((u) => u.at),
          'ink',
        ),
      ];
    case 'mist':
      return [burst(e.tiles, 'steam')];
    case 'branded':
      return [{ kind: 'pulse', at: e.unit.at, tone: 'fire' }];
    case 'puddle':
    case 'diffuse':
      return [burst(e.tiles, 'ink')];
    case 'oiled':
      return [burst(e.tiles, 'oil')];
    case 'steam':
    case 'extinguish':
      return [burst(e.tiles, 'steam')];
    case 'vent':
      return [burst([e.at], 'steam')];
    case 'plates':
      return [burst(e.tiles, 'brass')];
    case 'coated':
      return [{ kind: 'pulse', at: e.unit.at, tone: 'brass' }];
    case 'detonate':
      return [{ kind: 'pulse', at: e.unit.at, tone: 'ink' }];
    case 'ignite':
      return [burst(e.tiles, 'fire', 50)];
    case 'pierced':
      return [{ kind: 'pulse', at: e.unit.at, tone: 'danger' }];
    case 'heated':
      return [burst([...e.tiles, ...e.units.map((u) => u.at)], 'fire', 50)];
    case 'cooled':
      return [burst([...e.tiles, ...e.units.map((u) => u.at)], 'steam')];
    case 'scalded':
      return [burst(e.tiles, 'fire', 50)];
    case 'stained':
      return [burst(e.tiles, 'ink')];
    case 'etched':
      return [burst([...e.tiles, ...e.units.map((u) => u.at)], 'ink')];
    case 'arc':
    case 'conduct':
      return [{ kind: 'zap', from: e.from, cells: e.tiles }];
    case 'trigger': {
      if (!e.at) return [];
      const text = e.passed ? (e.rune === 'onInked' ? 'if inked ✓' : 'on kill ✓') : '✗';
      return [{ kind: 'float', at: e.at, text, tone: 'spark' }];
    }
    case 'attack': {
      const range = ATTACKS[e.intent.attack].range;
      const cells: Coord[] = [e.unit.at];
      for (
        let c = step(e.unit.at, e.intent.dir);
        cells.length <= range;
        c = step(c, e.intent.dir)
      ) {
        if (!inBounds(c, before.width, before.height)) break;
        cells.push(c);
      }
      return [{ kind: 'trail', cells, tone: 'danger' }];
    }
    default:
      return [];
  }
}

/**
 * A cast that hits a unit emits no `lands`/`stopped` event, so its flight would be invisible:
 * draw it from the aim instead (projectile spells only; the first step gets it).
 */
export function castLead(prev: BattleState, action: Action, events: readonly GameEvent[]): Fx[] {
  if (action.type !== 'cast' || action.aim.kind !== 'dir') return [];
  const flown = events.some((e) => e.type === 'lands' || e.type === 'stopped');
  if (flown || events[0]?.type !== 'cast') return [];
  const caster = findUnit(prev, action.unit);
  const { path } = aimPreview(prev, action.unit, action.spell, action.aim);
  if (!caster || path.length === 0) return [];
  return [{ kind: 'trail', cells: [{ ...caster.pos }, ...path], tone: 'source' }];
}
