import type { InteractionId, TriggerRuneId } from '$data';
import { type Coord, type Dir, label } from './grid';
import type { Aim, FiredCell, GlyphId, Intent, SpellKey, UnitId } from './types';

/** Snapshot of a unit at event time (animation + log text don't depend on later state). */
export interface UnitRef {
  id: UnitId;
  name: string;
  at: Coord;
  member: boolean;
}

/**
 * The stretch of a cast's log one spell node owns (M2): its own effect, never its children's.
 * `at` is the lattice cell (a Glyph's socket); inside a Glyph `inner` is the local cell and `glyph`
 * its id; `viaInner` are the local shape cells walked to reach it. `from`/`to` are offsets into the
 * log from the cast's first effect event (`to` exclusive). The source's span has no `inner` unless
 * it is a Spell Glyph's.
 */
export interface NodeSpan {
  at: Coord;
  inner?: Coord;
  glyph?: GlyphId;
  viaInner?: Coord[];
  from: number;
  to: number;
}

/**
 * Everything that happens in the game is a GameEvent. The UI animates the log;
 * tests assert on it.
 */
export type GameEvent =
  | { type: 'battleStart'; title: string }
  | { type: 'round'; round: number }
  | { type: 'phase'; phase: 'resolve' | 'enemy' | 'player' }
  | { type: 'won' }
  | { type: 'lost' }
  | { type: 'moved'; unit: UnitRef; to: Coord; path: Coord[] }
  | { type: 'moveUndone'; unit: UnitRef; to: Coord }
  | { type: 'shove'; by: UnitRef; target: UnitRef; dir: Dir }
  | { type: 'pushed'; unit: UnitRef; to: Coord }
  | { type: 'bump'; unit: UnitRef; into: string } // 'the edge' | 'a brass plate' | who(other)
  | { type: 'slide'; unit: UnitRef; to: Coord; path: Coord[] }
  | { type: 'cast'; caster: UnitRef; spell: string; aim: Aim; aimText: string; echo: boolean }
  | { type: 'echoQueued'; caster: UnitRef }
  | { type: 'echoFizzles'; caster: UnitRef }
  | { type: 'lands'; source: string; at: Coord; path: Coord[] }
  | { type: 'stopped'; source: string; at: Coord; by: 'steam' | 'brass plate'; path: Coord[] }
  | { type: 'splash'; center: Coord; tiles: Coord[] }
  | {
      type: 'damage';
      target: UnitRef;
      amount: number;
      source: string;
      bonus: string[];
      hpLeft: number;
    }
  | { type: 'shieldAbsorbs'; unit: UnitRef; absorbed: number; left: number }
  | { type: 'shieldGained'; unit: UnitRef; amount: number }
  | { type: 'died'; unit: UnitRef }
  | { type: 'inked'; unit: UnitRef; via: 'mark' | 'puddle' | 'stain' }
  | { type: 'smear'; from: UnitRef; to: UnitRef[] }
  | { type: 'mist'; tiles: Coord[] }
  | { type: 'branded'; unit: UnitRef }
  | { type: 'puddle'; tiles: Coord[] }
  | { type: 'diffuse'; at: Coord; tiles: Coord[] }
  | { type: 'oiled'; tiles: Coord[] }
  | { type: 'steam'; tiles: Coord[] }
  | { type: 'plates'; tiles: Coord[] }
  | { type: 'coated'; unit: UnitRef }
  | { type: 'detonate'; unit: UnitRef }
  | { type: 'ignite'; at: Coord; tiles: Coord[] } // tiles = whole lit region incl. `at`, reading order
  | { type: 'extinguish'; tiles: Coord[] }
  | { type: 'arc'; from: Coord; tiles: Coord[] }
  | { type: 'conduct'; from: Coord; tiles: Coord[] }
  | { type: 'trigger'; rune: TriggerRuneId; passed: boolean; at?: Coord }
  | { type: 'telegraph'; unit: UnitRef; intent: Intent; verb: string }
  | { type: 'idle'; unit: UnitRef }
  | { type: 'attack'; unit: UnitRef; intent: Intent; verbs: string }
  | { type: 'miss'; source: string }
  | { type: 'fireOut'; tiles: Coord[] }
  | { type: 'steamFades'; tiles: Coord[] }
  | { type: 'plateCrumbles'; tiles: Coord[] }
  | { type: 'vent'; at: Coord }
  /** Pierce: the projectile passes through `unit` and flies on (plan S1). */
  | { type: 'pierced'; source: string; unit: UnitRef }
  /** Fire heats brass (plan S5): plates on `tiles`, brass `units`. Re-heating emits it again. */
  | { type: 'heated'; tiles: Coord[]; units: UnitRef[] }
  | { type: 'cooled'; tiles: Coord[]; units: UnitRef[] }
  /** Scald's cloud (plan S7): steam on `tiles` that scalds whoever stands in it. */
  | { type: 'scalded'; tiles: Coord[] }
  /** Ink lands on unlit oil and stains it (plan S6). */
  | { type: 'stained'; tiles: Coord[] }
  /** Etch marks brass (plan S8): plates on `tiles`, brass `units`. */
  | { type: 'etched'; tiles: Coord[]; units: UnitRef[] }
  /** Silent: the cells that fired in a player cast, for proof (plan P6/P7). Never shown or animated. */
  | {
      type: 'trace';
      caster: UnitRef;
      spell: SpellKey;
      cells: FiredCell[];
      meaningful: boolean;
      /** Who did what in this cast, node by node (M2). */
      spans: NodeSpan[];
    };

/** Events with no log line and no animation. */
export const isSilent = (e: GameEvent): boolean => e.type === 'trace';

export type EventLog = readonly GameEvent[];

/** "Stoker" for party members, "rat at C4" for everyone else. */
export function who(r: UnitRef): string {
  return r.member ? r.name : `${r.name} at ${label(r.at)}`;
}

const list = (tiles: readonly Coord[]): string => tiles.map(label).join(', ');

/** One plain-English line per event (null for silent events): the format scenario tests compare against. */
export function describe(e: GameEvent): string | null {
  switch (e.type) {
    case 'battleStart':
      return `Encounter: ${e.title}`;
    case 'round':
      return `Round ${e.round}`;
    case 'phase':
      return e.phase === 'resolve'
        ? 'Enemies act'
        : e.phase === 'enemy'
          ? 'Enemies move'
          : 'Your turn';
    case 'won':
      return 'The party wins';
    case 'lost':
      return 'The party is wiped out';
    case 'moved':
      return `${who(e.unit)} moves to ${label(e.to)}`;
    case 'moveUndone':
      return `${who(e.unit)} steps back to ${label(e.to)}`;
    case 'shove':
      return `${who(e.by)} shoves ${who(e.target)} ${e.dir}`;
    case 'pushed':
      return `${who(e.unit)} is pushed to ${label(e.to)}`;
    case 'bump':
      return `${who(e.unit)} bumps into ${e.into}`;
    case 'slide':
      return `${who(e.unit)} slides across the oil to ${label(e.to)}`;
    case 'cast':
      return e.echo
        ? `Echo: ${who(e.caster)}'s ${e.spell} repeats ${e.aimText} at half strength`
        : `${who(e.caster)} casts ${e.spell} ${e.aimText}`;
    case 'echoQueued':
      return `Echo: ${who(e.caster)}'s spell will repeat next turn`;
    case 'echoFizzles':
      return `Echo: ${who(e.caster)}'s spell fizzles`;
    case 'lands':
      return `${e.source} lands at ${label(e.at)}`;
    case 'stopped':
      return `${e.source} is stopped by the ${e.by} at ${label(e.at)}`;
    case 'splash':
      return `Splash bursts at ${label(e.center)}`;
    case 'damage':
      return `${e.source} hits ${who(e.target)} for ${e.amount}${
        e.bonus.length ? ` (${e.bonus.join(', ')})` : ''
      }`;
    case 'shieldAbsorbs':
      return `${who(e.unit)}'s shield absorbs ${e.absorbed} (${e.left} left)`;
    case 'shieldGained':
      return `${who(e.unit)} gains a shield of ${e.amount}`;
    case 'died':
      return e.unit.member ? `${e.unit.name} is down` : `${who(e.unit)} dies`;
    case 'inked':
      return e.via === 'mark'
        ? `${who(e.unit)} is inked`
        : e.via === 'stain'
          ? `${who(e.unit)} stops on stained oil and is inked`
          : `${who(e.unit)} steps in ink and is inked`;
    case 'smear':
      return `the ink on ${who(e.from)} smears to ${e.to.map(who).join(', ')}`;
    case 'mist':
      return `mist drifts through the steam at ${list(e.tiles)}`;
    case 'branded':
      return `${who(e.unit)} is branded`;
    case 'puddle':
      return `ink pools at ${list(e.tiles)}`;
    case 'diffuse':
      return `ink diffuses through the steam at ${label(e.at)}`;
    case 'oiled':
      return `oil coats ${list(e.tiles)}`;
    case 'steam':
      return `steam rises at ${list(e.tiles)}`;
    case 'plates':
      return e.tiles.length === 1
        ? `a brass plate rises at ${list(e.tiles)}`
        : `brass plates rise at ${list(e.tiles)}`;
    case 'coated':
      return `${who(e.unit)} is coated in brass`;
    case 'detonate':
      return `the ink on ${who(e.unit)} detonates`;
    case 'ignite': {
      const rest = e.tiles.filter((t) => t.x !== e.at.x || t.y !== e.at.y);
      return `oil at ${label(e.at)} ignites${rest.length ? `, fire spreads to ${list(rest)}` : ''}`;
    }
    case 'extinguish':
      return `steam puts out the fire at ${list(e.tiles)}`;
    case 'arc':
      return `Spark arcs through the steam from ${label(e.from)} (${e.tiles.length} tiles)`;
    case 'conduct':
      return `Spark conducts through the brass from ${label(e.from)} (${e.tiles.length} tiles)`;
    case 'trigger':
      if (e.rune === 'onInked') {
        return e.passed
          ? 'On Inked: a target is inked'
          : 'On Inked: no inked target, the chain stops';
      }
      if (e.rune === 'onIgnite') {
        return e.passed
          ? 'On Ignite: the flow follows the fire'
          : 'On Ignite: nothing caught fire, the chain stops';
      }
      return e.passed && e.at
        ? `On Kill: bursts from ${label(e.at)}`
        : 'On Kill: nothing died, the chain stops';
    case 'telegraph':
      return `${who(e.unit)} will ${e.verb} ${e.intent.dir}`;
    case 'idle':
      return `${who(e.unit)} waits`;
    case 'attack':
      return `${who(e.unit)} ${e.verbs} ${e.intent.dir}`;
    case 'miss':
      return `${e.source} hits nothing`;
    case 'fireOut':
      return `the fire at ${list(e.tiles)} burns out`;
    case 'steamFades':
      return `the steam at ${list(e.tiles)} fades`;
    case 'plateCrumbles':
      return e.tiles.length === 1
        ? `the brass plate at ${list(e.tiles)} crumbles`
        : `the brass plates at ${list(e.tiles)} crumble`;
    case 'vent':
      return `the vent at ${label(e.at)} puffs steam`;
    case 'pierced':
      return `${e.source} passes through ${who(e.unit)}`;
    case 'heated':
      return `the brass at ${list([...e.tiles, ...e.units.map((u) => u.at)])} heats up`;
    case 'cooled':
      return `the brass at ${list([...e.tiles, ...e.units.map((u) => u.at)])} cools`;
    case 'scalded':
      return `scalding steam rises at ${list(e.tiles)}`;
    case 'stained':
      return `ink stains the oil at ${list(e.tiles)}`;
    case 'etched':
      return `a mark is etched into the brass at ${list([...e.tiles, ...e.units.map((u) => u.at)])}`;
    case 'trace':
      return null;
  }
}

export function describeLog(log: EventLog): string[] {
  return log.flatMap((e) => describe(e) ?? []);
}

const DISCOVERY: Partial<Record<GameEvent['type'], InteractionId>> = {
  ignite: 'ignite',
  conduct: 'conduct',
  arc: 'arc',
  detonate: 'detonate',
  extinguish: 'extinguish',
  slide: 'slide',
  diffuse: 'diffuse',
  heated: 'heat',
  stained: 'stain',
};

/** Interactions seen in an event log (dedup, first-seen order). */
export function discoveriesIn(events: EventLog): InteractionId[] {
  const seen: InteractionId[] = [];
  for (const e of events) {
    const id = DISCOVERY[e.type];
    if (id && !seen.includes(id)) seen.push(id);
  }
  return seen;
}
