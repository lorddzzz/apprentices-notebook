import type {
  BurstId,
  CompoundId,
  HarmKind,
  KindId,
  RuneRef,
  SourceRuneId,
  StateId,
  TriggerRuneId,
} from '$data';
import type { ArrivalCause, PlacementCause } from './arrival';
import { KIT } from './districts';
import type { DistrictEvent, OutOfRoomEvent } from './districts/types';
import { type Coord, type Dir, label } from './grid';
import type { Blocker } from './queries';
import type { LockLost, RivalEvent } from './rivals/types';
import type {
  Aim,
  AttackIntent,
  EventMeta,
  FiredCell,
  GlyphId,
  Intent,
  JarId,
  Scheduled,
  SpellKey,
  Target,
  UnitId,
} from './types';

/** Snapshot of a unit at event time (animation + log text don't depend on later state). */
export interface UnitRef {
  id: UnitId;
  name: string;
  at: Coord;
  member: boolean;
  /** The barge's crate (CN P3): never credited as a kill or as harm to a foe. */
  bystander?: true;
}

/**
 * The stretch of a cast's log one step owns (M2): its own effect, never its children's.
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
 * The one shape every relocation event will share (foundations P12): `moved`, `push`, `swapped`,
 * `drift` and AH/DK's new ones, so playback projects a new cause without new code. FD-7 moves the
 * existing events onto it; until then nothing emits it.
 */
export interface RelocationFields {
  unit: UnitRef;
  from: Coord;
  to: Coord;
  /** Tiles entered in order, `to` last. */
  path: Coord[];
  cause: ArrivalCause | PlacementCause;
}

/** Every unit move an event states, in the order it happens: the one projection for any cause. */
export function relocations(e: GameEvent): RelocationFields[] {
  switch (e.type) {
    case 'moved':
    case 'push':
      return [e];
    case 'swapped':
      return [e, { unit: e.with, from: e.to, to: e.from, path: [{ ...e.from }], cause: e.cause }];
    case 'drift':
      return e.units;
    default:
      return [];
  }
}

/** What stopped a line: a cloud, or a blocking tile. */
export type LineStop = 'cloud' | Blocker;

/**
 * Everything that happens in the game is a GameEvent. The UI animates the log; tests assert on
 * it. Every event may carry the fine-print line that caused it and the cast whose board object
 * did (`EventMeta`, plan §2.6).
 */
export type GameEvent = (
  | { type: 'battleStart'; title: string }
  | { type: 'round'; round: number }
  | { type: 'phase'; phase: 'resolve' | 'enemy' | 'player' }
  | { type: 'won' }
  | { type: 'lost' }
  | ({ type: 'moved' } & RelocationFields)
  | { type: 'moveUndone'; unit: UnitRef; to: Coord }
  /** The basic shove action (P12); the push itself follows as `push` / `crush`. */
  | { type: 'shove'; by: UnitRef; target: UnitRef; dir: Dir }
  /**
   * AH's basic actions (P1): the announcement only; the move follows as a relocation event (FD-7)
   * with cause `pull`, `hop` or `swap`. Nothing emits these until AH-1.
   */
  | { type: 'pull'; by: UnitRef; target: UnitRef; dir: Dir }
  | { type: 'hop'; unit: UnitRef; dir: Dir }
  | { type: 'swapWith'; by: UnitRef; target: UnitRef; dir: Dir }
  | { type: 'cast'; caster: UnitRef; spell: string; aim: Aim; aimText: string }
  | { type: 'lands'; source: string; at: Coord; path: Coord[] }
  | { type: 'stopped'; source: string; at: Coord; by: LineStop; path: Coord[] }
  | {
      type: 'damage';
      target: UnitRef;
      amount: number;
      source: string;
      bonus: string[];
      hpLeft: number;
    }
  /** A guard cancelled a hit (AH P14): no damage, and it is not a hit (no `hit` hook). */
  | { type: 'unharmed'; unit: UnitRef; source: string; harm: HarmKind | null }
  | { type: 'shieldAbsorbs'; unit: UnitRef; absorbed: number; left: number }
  | { type: 'shieldGained'; unit: UnitRef; amount: number; until?: number; total?: number }
  | { type: 'died'; unit: UnitRef }
  | { type: 'telegraph'; unit: UnitRef; intent: Intent; verb: string }
  | { type: 'idle'; unit: UnitRef }
  | { type: 'attack'; unit: UnitRef; intent: AttackIntent; verbs: string }
  | { type: 'miss'; source: string }
  /** The current (K-8, K-9): floats and units moved one tile downstream; `to` null = off the board. */
  | {
      type: 'drift';
      floats: { from: Coord; to: Coord | null }[];
      units: RelocationFields[];
    }
  /** A wooden lock gate catches from adjacent fire and is gone (K-11). */
  | { type: 'gateBurns'; at: Coord }
  /** A vent puffs a cloud onto its empty tile at round end. */
  | { type: 'vent'; at: Coord }
  /** A snuffer (or the lamp-mother) puts out the fire on `tiles` (K-15). */
  | { type: 'snuff'; by: UnitRef; tiles: Coord[] }
  /** A lamp-moth bursts at `at` (K-16). */
  | { type: 'foeBursts'; unit: UnitRef; at: Coord }
  /** The lamp-mother calls `unit` at the lamp `at` (K-17). */
  | { type: 'summon'; by: UnitRef; unit: UnitRef; at: Coord }
  /** The lamp-mother flares: every moth bursts (K-17). */
  | { type: 'flare'; by: UnitRef }
  /** Silent: the cells that fired in a player cast, for proof (plan P6/P7). Never shown or animated. */
  | {
      type: 'trace';
      /** More cells from stored flow; never a new cast or sample. */
      continued?: true;
      caster: UnitRef;
      spell: SpellKey;
      cells: FiredCell[];
      meaningful: boolean;
      /** Who did what in this cast, step by step (M2). */
      spans: NodeSpan[];
    }
  // ── The rune redesign (plan §2.7) ──
  | { type: 'aimed'; source: SourceRuneId; targets: Target[]; heading: Dir | null }
  | {
      type: 'landed';
      kind: KindId;
      at: Coord;
      unit?: UnitRef;
      makes: StateId | CompoundId | 'mark' | 'collar';
    }
  | { type: 'mixed'; at: Coord; unit?: UnitRef; compound: CompoundId }
  | { type: 'washed'; at: Coord; was: CompoundId; now: StateId }
  | { type: 'burst'; burst: BurstId; at: Coord; tiles: Coord[]; units: UnitRef[] }
  | { type: 'stateFades'; tiles: Coord[] }
  | { type: 'spreadState'; from: Coord; to: Coord[] }
  | ({ type: 'push'; dir: Dir; slid: number } & RelocationFields)
  /** `at` is the tile struck (the plate, wall or unit), `dir` the heading of the push. */
  | {
      type: 'crush';
      unit: UnitRef;
      into: UnitRef | 'wall' | 'plate';
      damage: number;
      at: Coord;
      dir: Dir;
    }
  | { type: 'dropped'; unit: UnitRef; at: Coord; elite: boolean }
  | { type: 'stunned'; unit: UnitRef }
  /** A unit leaves the room (P11): a fall or an erase. */
  | OutOfRoomEvent
  /** `rounds` is how long the unit is held after this (Hold's bonus included). */
  | { type: 'held'; unit: UnitRef; rounds: number }
  /** `unit` and `with` trade places: `unit` goes from -> to, `with` goes to -> from. */
  | ({ type: 'swapped'; with: UnitRef } & RelocationFields)
  | { type: 'drawn'; from: Coord; to: Coord; what: string }
  | { type: 'erased'; at: Coord; what: string }
  | { type: 'marked'; unit: UnitRef; deep: boolean; bound: RuneRef | null }
  | { type: 'collared'; unit: UnitRef }
  | { type: 'markSpread'; from: UnitRef; to: UnitRef[] }
  | { type: 'markSpent'; unit: UnitRef; released: boolean }
  | { type: 'markLifted'; from: UnitRef; to: UnitRef }
  | { type: 'released'; unit: UnitRef; action: RuneRef }
  | { type: 'conducted'; action: RuneRef; units: UnitRef[] }
  /** `peek` is the first rune of what is sealed, the one thing the board shows of a jar. */
  | {
      type: 'jarSealed';
      at: Coord;
      owner: UnitRef;
      event: 'step' | 'dusk';
      id: JarId;
      peek: RuneRef | null;
    }
  | { type: 'jarOpened'; at: Coord; by: UnitRef | null }
  | { type: 'jarCrumbles'; at: Coord }
  | { type: 'scheduled'; kind: Scheduled['kind']; at: Coord }
  | { type: 'repeated'; action: RuneRef }
  | { type: 'triggered'; rune: TriggerRuneId; passed: boolean }
  /** The per-cast effect cap was hit (plan §4): the rest of the chain fizzles. */
  | { type: 'fizzles'; reason: 'cap' | 'depth' }
  /** Silent: a compound, burst or idiom happened for the first time this fight (D7). */
  | { type: 'named'; what: 'compound' | 'burst' | 'idiom'; id: string }
  /** CN P5: the barge's crate reached its mooring and is anchored there (a room bonus's goal). */
  | { type: 'moored'; unit: UnitRef; at: Coord }
  /** CN P3: the crate took harm and its cargo is ruined; `source` names what did it. */
  | { type: 'cargoLost'; unit: UnitRef; at: Coord; source: string }
  | RivalEvent
  /** A district module's own event (P2): type `<district>:<name>`, its line from `KIT.events`. */
  | DistrictEvent
) &
  EventMeta;

/** A district module's own event (`bridges:gust`): every core type is a plain word. */
export const isDistrictEvent = (e: GameEvent): e is Extract<GameEvent, DistrictEvent> =>
  e.type.includes(':');

/** Events with no log line and no animation. */
export const isSilent = (e: GameEvent): boolean => e.type === 'trace' || e.type === 'named';

export type EventLog = readonly GameEvent[];

/** "Stoker" for party members, "rat at C4" for everyone else. */
export function who(r: UnitRef): string {
  return r.member ? r.name : `${r.name} at ${label(r.at)}`;
}

const list = (tiles: readonly Coord[]): string => tiles.map(label).join(', ');
const nameOf = (r: RuneRef): string => (r.startsWith('inv:') ? r.slice(4) : r);
const spaced = (id: string): string => id.replace(/([A-Z])/g, ' $1').toLowerCase();
const targetText = (t: Target): string => (t.kind === 'unit' ? t.unit : label(t.at));

const LOCK_LOST: Record<LockLost, string> = {
  opened: 'already open',
  erased: 'erased',
  crumbled: 'crumbled',
  ownerChanged: 'no longer its own',
  gone: 'gone',
};

function telegraphText(e: Extract<GameEvent, { type: 'telegraph' }>): string {
  const i = e.intent;
  switch (i.kind) {
    case 'attack':
    case 'rivalStrike':
      return `${who(e.unit)} will ${e.verb} ${i.dir}`;
    case 'summon':
      return `${who(e.unit)} will call a moth at ${label(i.at)}`;
    case 'flare':
      return `${who(e.unit)} will flare`;
    case 'step':
    case 'behaviour':
      return `${who(e.unit)} will ${e.verb}`;
    case 'cast':
    case 'trick':
      return `${who(e.unit)} will ${e.verb}${i.fallback ? `, or strike ${label(i.fallback)}` : ''}`;
  }
}

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
    case 'pull':
      return `${who(e.by)} pulls ${who(e.target)}`;
    case 'hop':
      return `${who(e.unit)} hops ${e.dir}`;
    case 'swapWith':
      return `${who(e.by)} swaps with ${who(e.target)}`;
    case 'cast':
      return `${who(e.caster)} casts ${e.spell} ${e.aimText}`;
    case 'lands':
      return `${e.source} lands at ${label(e.at)}`;
    case 'stopped':
      return `${e.source} is stopped by the ${e.by} at ${label(e.at)}`;
    case 'damage':
      return `${e.source} hits ${who(e.target)} for ${e.amount}${
        e.bonus.length ? ` (${e.bonus.join(', ')})` : ''
      }`;
    case 'unharmed':
      return `${e.source} leaves ${who(e.unit)} unharmed`;
    case 'shieldAbsorbs':
      return `${who(e.unit)}'s shield absorbs ${e.absorbed} (${e.left} left)`;
    case 'shieldGained':
      return `${who(e.unit)} gains a shield of ${e.amount}`;
    case 'died':
      return e.unit.member ? `${e.unit.name} is down` : `${who(e.unit)} dies`;
    case 'telegraph':
      return telegraphText(e);
    case 'idle':
      return `${who(e.unit)} waits`;
    case 'attack':
      return `${who(e.unit)} ${e.verbs} ${e.intent.dir}`;
    case 'miss':
      return `${e.source} hits nothing`;
    case 'drift': {
      const parts = [
        ...e.floats.map((f) =>
          f.to ? `${label(f.from)} → ${label(f.to)}` : `${label(f.from)} → away`,
        ),
      ];
      const units = e.units.map((u) => `${who(u.unit)} drifts to ${label(u.to)}`);
      return [parts.length ? `the current carries ${parts.join(', ')}` : '', ...units]
        .filter((x) => x !== '')
        .join('; ');
    }
    case 'gateBurns':
      return `the lock gate at ${label(e.at)} burns`;
    case 'vent':
      return `the vent at ${label(e.at)} puffs steam`;
    case 'snuff':
      return `${who(e.by)} snuffs the fire at ${list(e.tiles)}`;
    case 'foeBursts':
      return `${who(e.unit)} bursts`;
    case 'summon':
      return `${who(e.by)} calls ${who(e.unit)}`;
    case 'flare':
      return `${who(e.by)} flares`;
    case 'trace':
      return null;
    case 'aimed':
      return `${e.source} aims at ${e.targets.map(targetText).join(', ') || 'nothing'}`;
    case 'landed':
      return `${e.kind} lands ${e.unit ? `on ${who(e.unit)}` : `at ${label(e.at)}`} as ${spaced(e.makes)}`;
    case 'mixed':
      return `${e.unit ? who(e.unit) : label(e.at)}: ${spaced(e.compound)}`;
    case 'washed':
      return `the ${spaced(e.was)} at ${label(e.at)} washes out to ${e.now}`;
    case 'burst':
      return `${spaced(e.burst.replace('page:', ''))} bursts at ${label(e.at)}${e.units.length ? `, hitting ${e.units.map(who).join(', ')}` : ''}`;
    case 'stateFades':
      return `the board fades at ${list(e.tiles)}`;
    case 'spreadState':
      return `it spreads from ${label(e.from)} to ${list(e.to)}`;
    case 'push':
      return `${who(e.unit)} is ${e.cause === 'pull' ? 'pulled' : 'pushed'} ${e.dir} to ${label(e.path[e.path.length - 1] ?? e.unit.at)}${e.slid ? ` (slides ${e.slid})` : ''}`;
    case 'crush':
      return `${who(e.unit)} is crushed against ${typeof e.into === 'string' ? `the ${e.into}` : who(e.into)} for ${e.damage}`;
    case 'dropped':
      return `${who(e.unit)} drops at ${label(e.at)}`;
    case 'stunned':
      return `${who(e.unit)} is stunned`;
    case 'outOfRoom':
      return `${who(e.unit)} ${e.cause === 'fell' ? 'falls' : 'is erased'} out of the room`;
    case 'held':
      return `${who(e.unit)} is held`;
    case 'swapped':
      return `${who(e.unit)} and ${who(e.with)} swap places`;
    case 'drawn':
      return `the ${e.what} is drawn from ${label(e.from)} to ${label(e.to)}`;
    case 'erased':
      return `the ${e.what} at ${label(e.at)} is erased`;
    case 'marked':
      return `${who(e.unit)} is ${e.deep ? 'deeply ' : ''}marked${e.bound ? ` (holding ${nameOf(e.bound)})` : ''}`;
    case 'collared':
      return `${who(e.unit)} is collared in brass`;
    case 'markSpread':
      return `the mark spreads from ${who(e.from)} to ${e.to.map(who).join(', ')}`;
    case 'markSpent':
      return `${who(e.unit)}'s mark is spent${e.released ? ' and released' : ''}`;
    case 'markLifted':
      return `the mark moves from ${who(e.from)} to ${who(e.to)}`;
    case 'released':
      return `${who(e.unit)}'s mark releases ${nameOf(e.action)}`;
    case 'conducted':
      return `${nameOf(e.action)} travels the brass to ${e.units.map(who).join(', ') || 'no one'}`;
    case 'jarSealed':
      return `${who(e.owner)} seals a jar at ${label(e.at)} (opens ${e.event === 'step' ? 'on a step' : 'at dusk'})`;
    case 'jarOpened':
      return `the jar at ${label(e.at)} opens${e.by ? ` under ${who(e.by)}` : ''}`;
    case 'jarCrumbles':
      return `the jar at ${label(e.at)} crumbles empty`;
    case 'scheduled':
      return `${e.kind} waits at ${label(e.at)}`;
    case 'repeated':
      return `${nameOf(e.action)} happens again`;
    case 'triggered':
      return `${e.rune}: ${e.passed ? 'the rest happens' : 'the chain stops'}`;
    case 'fizzles':
      return e.reason === 'cap' ? 'the chain runs too long and fizzles' : 'the nesting fizzles';
    case 'named':
      return null;
    case 'moored':
      return `the ${e.unit.name} moors at ${label(e.at)}`;
    case 'cargoLost':
      return `the ${e.unit.name}'s cargo is lost at ${label(e.at)} (${e.source})`;
    case 'rivalPlans':
      return `${who(e.unit)} plans its next move`;
    case 'castFails':
      return `${who(e.unit)} cannot cast ${e.spell} at ${label(e.at)} from here`;
    case 'fallbackStrike':
      return e.target
        ? `${who(e.unit)} strikes ${label(e.at)} instead`
        : `${who(e.unit)}'s strike at ${label(e.at)} finds no one`;
    case 'trickUsed':
      return `${who(e.unit)} uses ${e.name}`;
    case 'orderFails':
      return `${who(e.unit)}'s order fails: its ${e.object.kind} is ${LOCK_LOST[e.why]}`;
    case 'pageRecovered':
      return `a page is recovered: ${e.page}`;
    default:
      // A district event: its module's line, or none for a type no module registers.
      return KIT.events[e.type]?.describe(e) ?? null;
  }
}

export function describeLog(log: EventLog): string[] {
  return log.flatMap((e) => describe(e) ?? []);
}

/** Named results in a log ('compound:stain', 'burst:fire', 'idiom:bonfire'), first-seen order (D7). */
export function namedIn(events: EventLog): string[] {
  const seen: string[] = [];
  for (const e of events) {
    if (e.type !== 'named') continue;
    const id = `${e.what}:${e.id}`;
    if (!seen.includes(id)) seen.push(id);
  }
  return seen;
}
