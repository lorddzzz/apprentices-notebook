import { ATTACKS, type BurstId, type CompoundId, type PlainBurstId, type StateId } from '$data';
import {
  type Action,
  aimPreview,
  type BattleState,
  type Coord,
  describe,
  findUnit,
  type GameEvent,
  inBounds,
  isDistrictEvent,
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
  | { kind: 'zap'; from: Coord; cells: Coord[]; tone?: Tone } // arc / conduct zigzags from → each
  | { kind: 'slide'; cells: Coord[]; tone: Tone } // a push that slid: a trail with skid lines
  | { kind: 'crush'; at: Coord; tone: Tone } // an impact star where a pushed unit hit something
  | { kind: 'drop'; at: Coord } // a unit falls through an open side
  | { kind: 'splat'; at: Coord; tone: Tone } // a detonation: droplets thrown outward
  | { kind: 'float'; at: Coord; text: string; tone: Tone } // "−3", "+2 shield"
  | { kind: 'pulse'; at: Coord; tone: Tone } // cast, detonate, coat
  | { kind: 'banner'; text: string }; // "Your turn", "Round 3"

export const COMPOUND_TONE: Record<CompoundId, Tone> = {
  deepMark: 'ink',
  stain: 'ink',
  brandCloud: 'steam',
  shackle: 'brass',
  pool: 'oil',
  greaseFog: 'steam',
  skidPlate: 'brass',
  bank: 'steam',
  kettle: 'brass',
  wall: 'brass',
};

const STATE_TONE: Record<StateId, Tone> = {
  blot: 'ink',
  slick: 'oil',
  cloud: 'steam',
  plate: 'brass',
  fire: 'fire',
};

/** The colour family of a state or compound. */
export const layerTone = (id: StateId | CompoundId): Tone =>
  id in STATE_TONE ? STATE_TONE[id as StateId] : COMPOUND_TONE[id as CompoundId];

/** Which base burst look a burst uses, and its tint. Page bursts reuse the nearest base look (design §4.3). */
export function burstLook(id: BurstId): { base: PlainBurstId; tone: Tone } {
  switch (id) {
    case 'detonation':
      return { base: 'detonation', tone: 'ink' };
    case 'fire':
      return { base: 'fire', tone: 'fire' };
    case 'storm':
      return { base: 'storm', tone: 'steam' };
    case 'conduct':
      return { base: 'conduct', tone: 'brass' };
    case 'surge':
      return { base: 'surge', tone: 'fire' };
    case 'page:deepMark':
      return { base: 'detonation', tone: 'ink' };
    case 'page:shackle':
      return { base: 'detonation', tone: 'brass' };
    case 'page:stain':
      return { base: 'fire', tone: 'ink' };
    case 'page:pool':
      return { base: 'fire', tone: 'oil' };
    case 'page:brandCloud':
      return { base: 'storm', tone: 'ink' };
    case 'page:greaseFog':
      return { base: 'storm', tone: 'oil' };
    case 'page:bank':
      return { base: 'storm', tone: 'steam' };
    case 'page:kettle':
      return { base: 'storm', tone: 'brass' };
    case 'page:skidPlate':
    case 'page:wall':
      return { base: 'conduct', tone: 'brass' };
  }
}

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
    case 'moveUndone': {
      const from = posOf(e.unit.id) ?? e.unit.at;
      return [{ kind: 'trail', cells: [from, e.to], tone: e.unit.member ? 'member' : 'danger' }];
    }
    case 'push': {
      const cells = [e.unit.at, ...e.path];
      const tone = e.unit.member ? 'member' : 'danger';
      return [e.slid > 0 ? { kind: 'slide', cells, tone: 'oil' } : { kind: 'trail', cells, tone }];
    }
    case 'cast':
      return [{ kind: 'pulse', at: e.caster.at, tone: 'source' }];
    case 'lands':
    case 'stopped':
      return [{ kind: 'trail', cells: e.path, tone: 'source' }];
    case 'aimed':
      return [
        burst(
          e.targets.flatMap((t) => {
            const at = t.kind === 'tile' ? t.at : posOf(t.unit);
            return at ? [at] : [];
          }),
          'source',
        ),
      ];
    case 'damage':
      return [{ kind: 'float', at: e.target.at, text: `−${e.amount}`, tone: 'danger' }];
    case 'shieldAbsorbs':
      return [{ kind: 'float', at: e.unit.at, text: `${e.absorbed} blocked`, tone: 'shield' }];
    case 'shieldGained':
      return [{ kind: 'float', at: e.unit.at, text: `+${e.amount} shield`, tone: 'shield' }];
    case 'died':
      return [{ kind: 'pulse', at: e.unit.at, tone: 'danger' }];
    case 'landed':
      return [e.unit ? { kind: 'pulse', at: e.unit.at, tone: e.kind } : burst([e.at], e.kind)];
    case 'mixed':
      return [
        e.unit
          ? { kind: 'pulse', at: e.unit.at, tone: COMPOUND_TONE[e.compound] }
          : burst([e.at], COMPOUND_TONE[e.compound]),
      ];
    case 'washed':
      return [burst([e.at], 'steam')];
    case 'spreadState':
      return [burst(e.to, 'steam', 40)];
    case 'burst': {
      const { base, tone } = burstLook(e.burst);
      const page = e.burst.startsWith('page:');
      const tiles = e.tiles.length ? e.tiles : [e.at];
      const zapTone = page ? tone : 'spark';
      const hit = e.units.map((u) => u.at);
      switch (base) {
        case 'detonation':
          return [
            { kind: 'splat', at: e.at, tone },
            { kind: 'pulse', at: e.at, tone },
          ];
        case 'fire':
          return [burst(tiles, tone, 50), { kind: 'pulse', at: e.at, tone }];
        case 'storm':
          return [burst(tiles, tone, 40), { kind: 'zap', from: e.at, cells: hit, tone: zapTone }];
        case 'conduct':
          return [burst(tiles, tone, 40), { kind: 'zap', from: e.at, cells: hit, tone: zapTone }];
        case 'surge':
          return [
            burst(tiles, tone),
            { kind: 'pulse', at: e.at, tone },
            { kind: 'zap', from: e.at, cells: hit, tone: zapTone },
          ];
      }
      return [];
    }
    case 'crush':
      return [
        { kind: 'crush', at: e.unit.at, tone: 'danger' },
        ...(typeof e.into === 'string' ? [] : [{ kind: 'crush', at: e.into.at, tone: 'danger' }]),
      ] as Fx[];
    case 'outOfRoom':
      return [
        { kind: 'drop', at: e.unit.at },
        {
          kind: 'float',
          at: e.unit.at,
          text: e.cause === 'fell' ? 'falls' : 'erased',
          tone: 'danger',
        },
      ];
    case 'dropped':
      return [
        { kind: 'drop', at: e.at },
        { kind: 'float', at: e.unit.at, text: 'drops', tone: 'danger' },
      ];
    case 'stunned':
      return [{ kind: 'float', at: e.unit.at, text: 'stunned', tone: 'danger' }];
    case 'held':
      return [{ kind: 'float', at: e.unit.at, text: 'held', tone: 'shield' }];
    case 'swapped':
      return [
        { kind: 'trail', cells: [e.from, e.to], tone: 'member' },
        { kind: 'trail', cells: [e.to, e.from], tone: 'member' },
      ];
    case 'drawn':
      return [{ kind: 'trail', cells: [e.from, e.to], tone: 'source' }];
    case 'erased':
      return [{ kind: 'pulse', at: e.at, tone: 'steam' }];
    case 'marked':
      return [{ kind: 'pulse', at: e.unit.at, tone: 'ink' }];
    case 'collared':
      return [{ kind: 'pulse', at: e.unit.at, tone: 'brass' }];
    case 'markSpread':
      return [burst([e.from.at, ...e.to.map((u) => u.at)], 'ink', 50)];
    case 'markLifted':
      return [{ kind: 'trail', cells: [e.from.at, e.to.at], tone: 'ink' }];
    case 'released':
      return [{ kind: 'pulse', at: e.unit.at, tone: 'danger' }];
    case 'conducted':
      return [
        burst(
          e.units.map((u) => u.at),
          'brass',
          40,
        ),
      ];
    case 'jarSealed':
      return [{ kind: 'pulse', at: e.at, tone: 'source' }];
    case 'jarOpened':
      return [burst([e.at], 'source')];
    case 'jarCrumbles':
      return [{ kind: 'pulse', at: e.at, tone: 'steam' }];
    case 'scheduled':
      return [{ kind: 'pulse', at: e.at, tone: 'source' }];
    case 'fizzles':
      return [{ kind: 'banner', text: describe(e) ?? 'It fizzles' }];
    case 'vent':
      return [burst([e.at], 'steam')];
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
    // The canals (K-8 to K-17).
    case 'drift':
      return e.floats.length
        ? [
            burst(
              e.floats.flatMap((f) => (f.to ? [f.to] : [])),
              'oil',
            ),
          ]
        : [];
    case 'gateBurns':
      return [
        burst([e.at], 'fire'),
        { kind: 'float', at: e.at, text: 'the gate burns', tone: 'fire' },
      ];
    case 'snuff':
      return [burst(e.tiles, 'steam', 40)];
    case 'foeBursts':
      return [burst([e.at], 'fire'), { kind: 'pulse', at: e.at, tone: 'fire' }];
    case 'summon':
      return [{ kind: 'pulse', at: e.at, tone: 'danger' }];
    case 'flare':
      return [{ kind: 'pulse', at: e.by.at, tone: 'fire' }];
    case 'fallbackStrike':
      return [{ kind: 'pulse', at: e.at, tone: 'danger' }];
    // Silent or nothing to draw: the board catches up from the state.
    case 'shove':
    case 'pull':
    case 'hop':
    case 'swapWith':
    case 'unharmed':
    case 'miss':
    case 'idle':
    case 'telegraph':
    case 'trace':
    case 'stateFades':
    case 'markSpent':
    case 'repeated':
    case 'triggered':
    case 'named':
    case 'moored': // CN-10 animates the crate
    case 'cargoLost':
    case 'rivalPlans':
    case 'castFails':
    case 'orderFails':
    case 'pageRecovered':
      return [];
    default: {
      // A district event: its own animation is the district's UI (`eventAnim`), not a core fx.
      if (isDistrictEvent(e)) return [];
      const unhandled: never = e;
      void unhandled;
      return [];
    }
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
