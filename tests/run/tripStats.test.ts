import { describe, expect, test } from 'vitest';
import {
  accumulateStats,
  type BattleState,
  emptyStats,
  type GameEvent,
  masksFrom,
  newProfile,
  type Profile,
} from '$engine';
import { act, cast, withLattices } from '../scenarios/harness';

/** Plan S16: a trip's stats, folded from each fight's whole event log. */

const profile = (): Profile => newProfile();
const REACTIONS = new Set(['ignite', 'detonate', 'conduct', 'arc', 'extinguish', 'slide']);
const reactionsIn = (log: readonly GameEvent[]): number =>
  log.filter((e) => REACTIONS.has(e.type)).length;

describe('casts, damage and kills per spell', () => {
  test('a kill is credited to the spell that made it', () => {
    const s = withLattices('D . r', { draughtsman: 'Bolt> Spark' });
    const log = cast(s, 'draughtsman', 'right').events;
    const stats = accumulateStats(emptyStats(), log, profile());
    expect(stats.fights).toBe(1);
    expect(stats.spells).toMatchObject([
      { member: 'draughtsman', spell: '0,0', name: 'Bolt', casts: 1, damage: 2, kills: 1 },
    ]);
  });

  test('casts of one spell add up; another spell gets its own row', () => {
    const s0 = withLattices('D . d d', {
      draughtsman: 'Bolt> Spark\nBolt> .',
    });
    const a = cast(s0, 'draughtsman', 'right', '0,0');
    const turn = act(a.state, { type: 'endTurn' });
    const b = cast(turn.state, 'draughtsman', 'right', '0,1');
    const stats = accumulateStats(
      emptyStats(),
      [...a.events, ...turn.events, ...b.events],
      profile(),
    );
    expect(stats.spells.map((t) => [t.spell, t.casts, t.damage])).toEqual([
      ['0,0', 1, 3],
      ['0,1', 1, 2],
    ]);
  });

  test('stats accumulate across fights and keep first-cast order', () => {
    const s = withLattices('D . d', { draughtsman: 'Bolt> Spark' });
    const log = cast(s, 'draughtsman', 'right').events;
    const once = accumulateStats(emptyStats(), log, profile());
    const twice = accumulateStats(once, log, profile());
    expect(twice.fights).toBe(2);
    expect(twice.spells).toHaveLength(1);
    expect(twice.spells[0]?.casts).toBe(2);
    expect(twice.spells[0]?.damage).toBe(2 * (once.spells[0]?.damage ?? 0));
    expect(once.spells[0]?.casts).toBe(1); // the input was not mutated
  });

  test('damage to the party is not credited to a spell', () => {
    const s = withLattices('D . d', { draughtsman: 'Bolt> Spark' });
    const a = cast(s, 'draughtsman', 'right');
    const b = act(a.state, { type: 'endTurn' });
    const stats = accumulateStats(emptyStats(), [...a.events, ...b.events], profile());
    expect(stats.spells[0]?.damage).toBe(3);
  });

  test('an echo counts for the spell that cast it', () => {
    const s0 = withLattices('D . d', { draughtsman: 'Echo .\nBolt> Spark' });
    const r1 = cast(s0, 'draughtsman', 'right');
    const r2 = act(r1.state, { type: 'endTurn' });
    const stats = accumulateStats(emptyStats(), [...r1.events, ...r2.events], profile());
    // 2 + 1 for the cast, 1 + 1 for the half-strength echo
    expect(stats.spells).toMatchObject([
      { member: 'draughtsman', spell: '0,1', name: 'Bolt', casts: 2, damage: 5, kills: 0 },
    ]);
  });
});

describe('the biggest chain', () => {
  const chain = (s: BattleState) => cast(s, 'draughtsman', 'right').events;

  test('counts the reaction events of one cast and names the spell', () => {
    const log = chain(withLattices('D . d d', { draughtsman: 'Bolt> Ink Oil Spark' }));
    const stats = accumulateStats(emptyStats(), log, profile());
    expect(reactionsIn(log)).toBeGreaterThanOrEqual(2);
    expect(stats.biggestChain).toEqual({
      member: 'draughtsman',
      spell: '0,0',
      name: 'Bolt',
      reactions: stats.biggestChain?.reactions ?? 0,
    });
    expect(stats.biggestChain?.reactions).toBeGreaterThanOrEqual(2);
  });

  test('a plain hit is no chain', () => {
    const log = chain(withLattices('D . d', { draughtsman: 'Bolt> Spark' }));
    expect(accumulateStats(emptyStats(), log, profile()).biggestChain).toBeNull();
  });

  test('the bigger cast wins, and a later smaller one does not replace it', () => {
    const small = chain(withLattices('D . d', { draughtsman: 'Bolt> Spark' }));
    const big = chain(withLattices('D . d d', { draughtsman: 'Bolt> Ink Oil Spark' }));
    const one = accumulateStats(emptyStats(), [...small, ...big], profile());
    const two = accumulateStats(one, small, profile());
    expect(two.biggestChain).toEqual(one.biggestChain);
    expect(one.biggestChain?.reactions).toBe(reactionsIn(big));
  });
});

describe('first discoveries', () => {
  const log = (): readonly GameEvent[] =>
    cast(withLattices('D . d d', { draughtsman: 'Bolt> Ink Oil Spark' }), 'draughtsman', 'right')
      .events;

  test('interactions the notebook did not have are recorded, in order', () => {
    const stats = accumulateStats(emptyStats(), log(), profile());
    expect(stats.discoveries).toEqual(['interaction:detonate', 'interaction:ignite']);
  });

  test('known ones are not, and nothing is recorded twice', () => {
    const known: Profile = { ...profile(), interactions: ['ignite'] };
    const once = accumulateStats(emptyStats(), log(), known);
    expect(once.discoveries).toEqual(['interaction:detonate']);
    expect(accumulateStats(once, log(), known).discoveries).toEqual(['interaction:detonate']);
  });
});

describe('proof casts', () => {
  test('a meaningful cast counts, a cast that does nothing does not', () => {
    const hit = cast(withLattices('D . d', { draughtsman: 'Bolt> Spark' }), 'draughtsman', 'right');
    const miss = cast(
      withLattices('D . . .', { draughtsman: 'Bolt> Spark' }),
      'draughtsman',
      'right',
    );
    const log = [...hit.events, ...miss.events];
    const stats = accumulateStats(emptyStats(), log, profile());
    expect(stats.proofCasts).toBe(masksFrom(log, 'draughtsman').length);
    expect(stats.proofCasts).toBe(1);
    expect(stats.spells[0]?.casts).toBe(2);
  });
});
