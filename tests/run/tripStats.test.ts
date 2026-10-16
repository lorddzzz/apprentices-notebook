import { describe, expect, test } from 'vitest';
import { MEMBERS } from '$data';
import {
  accumulateStats,
  type BattleState,
  type CompiledLattice,
  compileLattice,
  createBattle,
  emptyStats,
  type GameEvent,
  type GlyphDef,
  lastTripDeadCells,
  masksFrom,
  newProfile,
  type Profile,
  parseLattice,
  type SpellTally,
  spellsFor,
  type TripRecap,
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

// ── Plain spells' last-trip cells (M15, task E5) ──

/**
 * A Fork runs its upper branch first: OnInked then Oil up, Spark down. The Spark branch runs after
 * the upper one, so it cannot detonate the ink before OnInked looks at it.
 * Cells: Bolt 0,2 · Fork 1,2 · OnInked 1,1 · Oil 1,0 · Spark 1,3.
 */
const FORK = '.     Oil     .\n.     OnInked .\nBolt> Fork    .\n.     Spark   .';
const FORK_NO_OIL = '.     .       .\n.     OnInked .\nBolt> Fork    .\n.     Spark   .';
const SOURCE = '0,2';
const SPARK = '1,3';
const ONINKED = '1,1';
const OIL = '1,0';
const FORK_CELLS = [SOURCE, '1,2', SPARK, ONINKED, OIL];

const sorted = (cells: readonly string[]): string[] => [...cells].sort();
const compiledOf = (ascii: string): { draughtsman: ReturnType<typeof spellsFor> } => ({
  draughtsman: spellsFor('draughtsman', ascii),
});
const current = (ascii: string): CompiledLattice =>
  compileLattice(parseLattice(ascii), MEMBERS.draughtsman.affinity);
const fightOn = (board: string, ascii: string): GameEvent[] => [
  ...cast(withLattices(board, { draughtsman: ascii }), 'draughtsman', 'right').events,
];
const tallyOf = (stats: { spells: SpellTally[] }): SpellTally => {
  const t = stats.spells[0];
  if (!t) throw new Error('no spell tallied');
  return t;
};
const tripOf = (stats: ReturnType<typeof accumulateStats>): TripRecap => ({
  outcome: 'returned',
  encounter: 0,
  place: 'test',
  stats,
});

describe('a plain spell remembers its path and what fired', () => {
  test('cells follow the path as fought; fired accumulates across fights', () => {
    const first = accumulateStats(
      emptyStats(),
      fightOn('D . d', FORK),
      newProfile(),
      compiledOf(FORK),
    );
    // The enemy is not inked, so OnInked never passes and its Oil never runs.
    expect(sorted(tallyOf(first).cells)).toEqual(sorted(FORK_CELLS));
    expect(sorted(tallyOf(first).fired)).toEqual(sorted([SOURCE, '1,2', SPARK, ONINKED]));

    const second = accumulateStats(first, fightOn('D . d!', FORK), newProfile(), compiledOf(FORK));
    expect(tallyOf(second).casts).toBe(2);
    expect(sorted(tallyOf(second).cells)).toEqual(sorted(FORK_CELLS));
    expect(sorted(tallyOf(second).fired)).toEqual(sorted(FORK_CELLS));
    expect(tallyOf(first).fired).not.toContain(OIL); // the input was not mutated
  });

  test('a Glyph socket counts as one cell', () => {
    const lib: Record<string, GlyphDef> = {
      p: {
        id: 'p',
        name: 'Kink',
        kind: 'payload',
        cells: [
          { at: { x: 0, y: 0 }, rune: 'ink' },
          { at: { x: 1, y: 0 }, rune: 'bend', dir: 'down' },
          { at: { x: 1, y: 1 }, rune: 'spark' },
        ],
        entry: { x: 0, y: 0 },
        exits: [],
        idiom: null,
        version: 1,
        params: [],
        extraExit: null,
      },
    };
    const spells = compileLattice(parseLattice('Bolt> G:p> . .\n.    .    . .'), [], lib).spells;
    const state = createBattle({
      title: 'test',
      seed: 1,
      board: 'D . d',
      party: { draughtsman: { spells } },
    }).state;
    const log = cast(state, 'draughtsman', 'right').events;
    const stats = accumulateStats(emptyStats(), log, newProfile(), { draughtsman: spells });
    // The Bolt and the socket; the Kink's three inner cells collapse into the socket's one.
    expect(tallyOf(stats).cells).toEqual(['0,0', '1,0']);
    expect(tallyOf(stats).fired).toContain('1,0');
  });

  test('a Fork branch that never fired is in cells but not in fired', () => {
    const stats = accumulateStats(
      emptyStats(),
      fightOn('D . d', FORK),
      newProfile(),
      compiledOf(FORK),
    );
    expect(tallyOf(stats).cells).toContain(OIL);
    expect(tallyOf(stats).fired).not.toContain(OIL);
    expect(tallyOf(stats).fired).toContain(SPARK); // the other branch did fire
  });

  test('dead cells are the cells that never fired, while the path is unchanged', () => {
    const stats = accumulateStats(
      emptyStats(),
      fightOn('D . d', FORK),
      newProfile(),
      compiledOf(FORK),
    );
    expect(lastTripDeadCells(tripOf(stats), 'draughtsman', current(FORK))).toEqual([OIL]);
  });

  test('dead cells vanish once a later fight fires them', () => {
    const first = accumulateStats(
      emptyStats(),
      fightOn('D . d', FORK),
      newProfile(),
      compiledOf(FORK),
    );
    const both = accumulateStats(first, fightOn('D . d!', FORK), newProfile(), compiledOf(FORK));
    expect(lastTripDeadCells(tripOf(both), 'draughtsman', current(FORK))).toEqual([]);
  });

  test('stale data shows nothing: a rewired path, a missing spell, or another member', () => {
    const stats = accumulateStats(
      emptyStats(),
      fightOn('D . d', FORK),
      newProfile(),
      compiledOf(FORK),
    );
    const recap = tripOf(stats);
    expect(lastTripDeadCells(recap, 'draughtsman', current(FORK_NO_OIL))).toEqual([]);
    expect(lastTripDeadCells(recap, 'stoker', current(FORK))).toEqual([]);
    expect(lastTripDeadCells(null, 'draughtsman', current(FORK))).toEqual([]);
    expect(lastTripDeadCells(recap, 'draughtsman', current('. . .\n. . .'))).toEqual([]);
  });
});
