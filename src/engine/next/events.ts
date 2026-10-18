/**
 * New `GameEvent` variants of the rune redesign (plan §2.7). W0b merges them into `events.ts`'s
 * union (with `EventMeta` on every event), removes the dead ones and renames the foe's
 * `burst` to `foeBursts`.
 */
import type {
  BurstId,
  CompoundId,
  KindId,
  RuneRef,
  SourceRuneId,
  StateId,
  TriggerRuneId,
} from '$data/next/types';
import type { UnitRef } from '../events';
import { type Coord, type Dir, label } from '../grid';
import type { Scheduled, Target } from './model';

export type NewEvent =
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
  | { type: 'named'; what: 'compound' | 'burst' | 'idiom'; id: string };

const who = (r: UnitRef): string => (r.member ? r.name : `${r.name} at ${label(r.at)}`);
const list = (tiles: readonly Coord[]): string => tiles.map(label).join(', ');
const nameOf = (r: RuneRef): string => (r.startsWith('inv:') ? r.slice(4) : r);
const spaced = (id: string): string => id.replace(/([A-Z])/g, ' $1').toLowerCase();

/** One plain-English line per new event (null = silent). W0b folds this into `describe`. */
export function describeNew(e: NewEvent): string | null {
  switch (e.type) {
    case 'aimed':
      return `${e.source} aims at ${e.targets.map((t) => (t.kind === 'unit' ? t.unit : label(t.at))).join(', ') || 'nothing'}`;
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
