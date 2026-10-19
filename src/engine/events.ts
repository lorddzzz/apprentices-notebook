import type {
  BurstId,
  CompoundId,
  KindId,
  RuneRef,
  SourceRuneId,
  StateId,
  TriggerRuneId,
} from '$data';
import { type Coord, type Dir, label } from './grid';
import type { Blocker } from './queries';
import type {
  Aim,
  AttackIntent,
  EventMeta,
  FiredCell,
  GlyphId,
  Intent,
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
  | { type: 'moved'; unit: UnitRef; to: Coord; path: Coord[] }
  | { type: 'moveUndone'; unit: UnitRef; to: Coord }
  /** The basic shove action (P12); the push itself follows as `push` / `crush`. */
  | { type: 'shove'; by: UnitRef; target: UnitRef; dir: Dir }
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
  | { type: 'shieldAbsorbs'; unit: UnitRef; absorbed: number; left: number }
  | { type: 'shieldGained'; unit: UnitRef; amount: number }
  | { type: 'died'; unit: UnitRef }
  | { type: 'telegraph'; unit: UnitRef; intent: Intent; verb: string }
  | { type: 'idle'; unit: UnitRef }
  | { type: 'attack'; unit: UnitRef; intent: AttackIntent; verbs: string }
  | { type: 'miss'; source: string }
  /** The current (K-8, K-9): floats and units moved one tile downstream; `to` null = off the board. */
  | {
      type: 'drift';
      floats: { from: Coord; to: Coord | null }[];
      units: { unit: UnitRef; from: Coord; to: Coord }[];
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
  | { type: 'push'; unit: UnitRef; dir: Dir; path: Coord[]; slid: number }
  | { type: 'crush'; unit: UnitRef; into: UnitRef | 'wall' | 'plate'; damage: number }
  | { type: 'dropped'; unit: UnitRef; at: Coord; elite: boolean }
  | { type: 'stunned'; unit: UnitRef }
  | { type: 'held'; unit: UnitRef }
  | { type: 'swapped'; a: UnitRef; b: UnitRef }
  | { type: 'drawn'; from: Coord; to: Coord; what: string }
  | { type: 'erased'; at: Coord; what: string }
  | { type: 'marked'; unit: UnitRef; deep: boolean; bound: RuneRef | null }
  | { type: 'collared'; unit: UnitRef }
  | { type: 'markSpread'; from: UnitRef; to: UnitRef[] }
  | { type: 'markSpent'; unit: UnitRef; released: boolean }
  | { type: 'markLifted'; from: UnitRef; to: UnitRef }
  | { type: 'released'; unit: UnitRef; action: RuneRef }
  | { type: 'conducted'; action: RuneRef; units: UnitRef[] }
  | { type: 'jarSealed'; at: Coord; owner: UnitRef; event: 'step' | 'dusk' }
  | { type: 'jarOpened'; at: Coord; by: UnitRef | null }
  | { type: 'jarCrumbles'; at: Coord }
  | { type: 'scheduled'; kind: Scheduled['kind']; at: Coord }
  | { type: 'repeated'; action: RuneRef }
  | { type: 'triggered'; rune: TriggerRuneId; passed: boolean }
  /** The per-cast effect cap was hit (plan §4): the rest of the chain fizzles. */
  | { type: 'fizzles'; reason: 'cap' | 'depth' }
  /** Silent: a compound, burst or idiom happened for the first time this fight (D7). */
  | { type: 'named'; what: 'compound' | 'burst' | 'idiom'; id: string }
) &
  EventMeta;

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
    case 'shieldAbsorbs':
      return `${who(e.unit)}'s shield absorbs ${e.absorbed} (${e.left} left)`;
    case 'shieldGained':
      return `${who(e.unit)} gains a shield of ${e.amount}`;
    case 'died':
      return e.unit.member ? `${e.unit.name} is down` : `${who(e.unit)} dies`;
    case 'telegraph':
      return e.intent.kind === 'attack'
        ? `${who(e.unit)} will ${e.verb} ${e.intent.dir}`
        : e.intent.kind === 'summon'
          ? `${who(e.unit)} will call a moth at ${label(e.intent.at)}`
          : `${who(e.unit)} will flare`;
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
      return `${who(e.unit)} is pushed ${e.dir} to ${label(e.path[e.path.length - 1] ?? e.unit.at)}${e.slid ? ` (slides ${e.slid})` : ''}`;
    case 'crush':
      return `${who(e.unit)} is crushed against ${typeof e.into === 'string' ? `the ${e.into}` : who(e.into)} for ${e.damage}`;
    case 'dropped':
      return `${who(e.unit)} drops at ${label(e.at)}`;
    case 'stunned':
      return `${who(e.unit)} is stunned`;
    case 'held':
      return `${who(e.unit)} is held`;
    case 'swapped':
      return `${who(e.a)} and ${who(e.b)} swap places`;
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
