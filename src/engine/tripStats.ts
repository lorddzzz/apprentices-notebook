import { MEMBER_IDS, type MemberId } from '$data';
import { discoveriesIn, type EventLog, type GameEvent } from './events';
import type { Profile, SpellKey, SpellTally, TripStats } from './types';

/** A trip's stats before its first fight. */
export function emptyStats(): TripStats {
  return { fights: 0, spells: [], biggestChain: null, discoveries: [], proofCasts: 0 };
}

/** Event types that count as a chain reaction when they come from one cast (plan S16). */
const REACTIONS: ReadonlySet<GameEvent['type']> = new Set([
  'ignite',
  'extinguish',
  'conduct',
  'arc',
  'detonate',
  'slide',
  'diffuse',
  'smear',
  'heated',
  'cooled',
  'stained',
  'scalded',
  'etched',
]);

/** Events that end a cast's stretch of the log (an echo has no trace to close it). */
const BOUNDARY: ReadonlySet<GameEvent['type']> = new Set([
  'cast',
  'moved',
  'moveUndone',
  'shove',
  'phase',
  'round',
]);

interface Segment {
  member: MemberId;
  name: string;
  key: SpellKey | null;
  damage: number;
  kills: number;
  reactions: number;
}

const memberOf = (id: string): MemberId | null => MEMBER_IDS.find((m) => m === id) ?? null;

/**
 * Folds one finished encounter's event log into the trip's stats (plan S16). `known` is the
 * profile as it was before this encounter, so first discoveries can be told apart. A cast owns
 * the events from its `cast` event to its `trace` (or, for an echo, to the next boundary);
 * damage to enemies and their deaths in that stretch are credited to its spell.
 */
export function accumulateStats(stats: TripStats, log: EventLog, known: Profile): TripStats {
  const spells: SpellTally[] = stats.spells.map((s) => ({ ...s }));
  let biggest = stats.biggestChain ? { ...stats.biggestChain } : null;
  let proofCasts = stats.proofCasts;
  const keyOf = new Map<string, SpellKey>(); // `${member}|${name}` → the key a trace last gave it

  let seg: Segment | null = null;
  const close = (): void => {
    if (!seg) return;
    const key = seg.key ?? keyOf.get(`${seg.member}|${seg.name}`) ?? seg.name;
    let t = spells.find((s) => s.member === seg?.member && s.spell === key);
    if (!t) {
      t = { member: seg.member, spell: key, name: seg.name, casts: 0, damage: 0, kills: 0 };
      spells.push(t);
    }
    t.casts += 1;
    t.damage += seg.damage;
    t.kills += seg.kills;
    if (seg.reactions > (biggest?.reactions ?? 0)) {
      biggest = { member: seg.member, spell: key, name: seg.name, reactions: seg.reactions };
    }
    seg = null;
  };

  for (const e of log) {
    if (e.type === 'trace') {
      if (e.meaningful) proofCasts += 1;
      if (seg && seg.member === e.caster.id) {
        seg.key = e.spell;
        keyOf.set(`${seg.member}|${seg.name}`, e.spell);
        close();
      }
      continue;
    }
    if (BOUNDARY.has(e.type)) close();
    if (e.type === 'cast') {
      const member = e.caster.member ? memberOf(e.caster.id) : null;
      if (member) {
        seg = { member, name: e.spell, key: null, damage: 0, kills: 0, reactions: 0 };
      }
    } else if (seg) {
      if (e.type === 'damage' && !e.target.member) seg.damage += e.amount;
      else if (e.type === 'died' && !e.unit.member) seg.kills += 1;
      else if (REACTIONS.has(e.type)) seg.reactions += 1;
    }
  }
  close();

  const discoveries = [...stats.discoveries];
  for (const id of discoveriesIn(log)) {
    const code = `interaction:${id}`;
    if (!known.interactions.includes(id) && !discoveries.includes(code)) discoveries.push(code);
  }

  return { fights: stats.fights + 1, spells, biggestChain: biggest, discoveries, proofCasts };
}
