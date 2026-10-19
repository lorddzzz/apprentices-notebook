import { describe, expect, test } from 'vitest';
import type { MemberId } from '$data';
import {
  accumulateStats,
  type CompiledLattice,
  compileLattice,
  emptyStats,
  type FiredCell,
  type GameEvent,
  type GlyphDef,
  lastTripDeadCells,
  newProfile,
  type Profile,
  parseKey,
  parseLattice,
  type SpellTally,
  spellsFor,
  type TripRecap,
  type UnitRef,
} from '$engine';

/**
 * Plan S16: a trip's stats, folded from each fight's whole event log. W0b's spells don't act yet,
 * so these logs are written by hand in the shape a cast leaves: `cast`, its effects, `trace`.
 */

const profile = (): Profile => newProfile();
const at = (x: number, y: number) => ({ x, y });
const ref = (id: string, member = false): UnitRef => ({ id, name: id, at: at(2, 0), member });

interface CastOpts {
  member?: MemberId;
  spell?: string;
  damage?: number[];
  kills?: number;
  reactions?: number;
  fired?: string[];
  meaningful?: boolean;
}
/** One cast's stretch of a log: `cast`, hits on a dummy, deaths, reaction events, `trace`. */
function castLog(o: CastOpts = {}): GameEvent[] {
  const member = o.member ?? 'draughtsman';
  const caster = ref(member, true);
  const out: GameEvent[] = [
    { type: 'cast', caster, spell: 'Bolt', aim: { kind: 'dir', dir: 'right' }, aimText: 'right' },
  ];
  for (const amount of o.damage ?? []) {
    out.push({
      type: 'damage',
      target: ref('dummy-1'),
      amount,
      source: 'Strike',
      bonus: [],
      hpLeft: 5,
    });
  }
  for (let i = 0; i < (o.kills ?? 0); i++) out.push({ type: 'died', unit: ref(`rat-${i + 1}`) });
  for (let i = 0; i < (o.reactions ?? 0); i++) {
    out.push({ type: 'mixed', at: at(i, 0), compound: 'stain' });
  }
  const cells: FiredCell[] = (o.fired ?? ['0,0']).map((k) => ({ at: parseKey(k), rune: 'ink' }));
  out.push({
    type: 'trace',
    caster,
    spell: o.spell ?? '0,0',
    cells,
    meaningful: o.meaningful ?? (o.damage?.length ?? 0) > 0,
    spans: [],
  });
  return out;
}
const enemyBites: GameEvent[] = [
  { type: 'phase', phase: 'resolve' },
  {
    type: 'damage',
    target: ref('draughtsman', true),
    amount: 1,
    source: 'Bite',
    bonus: [],
    hpLeft: 5,
  },
];

describe('casts, damage and kills per spell', () => {
  test('a kill is credited to the spell that made it', () => {
    const stats = accumulateStats(emptyStats(), castLog({ damage: [2], kills: 1 }), profile());
    expect(stats.fights).toBe(1);
    expect(stats.spells).toMatchObject([
      { member: 'draughtsman', spell: '0,0', name: 'Bolt', casts: 1, damage: 2, kills: 1 },
    ]);
  });

  test('casts of one spell add up; another spell gets its own row', () => {
    const log = [
      ...castLog({ spell: '0,0', damage: [3] }),
      ...enemyBites,
      ...castLog({ spell: '0,1', damage: [2] }),
    ];
    const stats = accumulateStats(emptyStats(), log, profile());
    expect(stats.spells.map((t) => [t.spell, t.casts, t.damage])).toEqual([
      ['0,0', 1, 3],
      ['0,1', 1, 2],
    ]);
  });

  test('stats accumulate across fights and keep first-cast order', () => {
    const log = castLog({ damage: [2] });
    const once = accumulateStats(emptyStats(), log, profile());
    const twice = accumulateStats(once, log, profile());
    expect(twice.fights).toBe(2);
    expect(twice.spells).toHaveLength(1);
    expect(twice.spells[0]?.casts).toBe(2);
    expect(twice.spells[0]?.damage).toBe(4);
    expect(once.spells[0]?.casts).toBe(1); // the input was not mutated
  });

  test('damage to the party is not credited to a spell', () => {
    const log = [...castLog({ damage: [3] }), ...enemyBites];
    expect(accumulateStats(emptyStats(), log, profile()).spells[0]?.damage).toBe(3);
  });
});

describe('the biggest chain', () => {
  test('counts the reaction events of one cast and names the spell', () => {
    const stats = accumulateStats(emptyStats(), castLog({ damage: [1], reactions: 3 }), profile());
    expect(stats.biggestChain).toEqual({
      member: 'draughtsman',
      spell: '0,0',
      name: 'Bolt',
      reactions: 3,
    });
  });

  test('a plain hit is no chain', () => {
    const log = castLog({ damage: [2] });
    expect(accumulateStats(emptyStats(), log, profile()).biggestChain).toBeNull();
  });

  test('the bigger cast wins, and a later smaller one does not replace it', () => {
    const small = castLog({ reactions: 1 });
    const big = castLog({ reactions: 4 });
    const one = accumulateStats(emptyStats(), [...small, ...big], profile());
    const two = accumulateStats(one, small, profile());
    expect(two.biggestChain).toEqual(one.biggestChain);
    expect(one.biggestChain?.reactions).toBe(4);
  });
});

describe('first discoveries (named results, D7)', () => {
  const log: GameEvent[] = [
    ...castLog({ damage: [1] }),
    { type: 'named', what: 'compound', id: 'stain' },
    { type: 'named', what: 'burst', id: 'fire' },
  ];

  test('results the notebook had not named are recorded, in order', () => {
    expect(accumulateStats(emptyStats(), log, profile()).discoveries).toEqual([
      'compound:stain',
      'burst:fire',
    ]);
  });

  test('known ones are not, and nothing is recorded twice', () => {
    const known: Profile = { ...profile(), named: ['compound:stain'] };
    const once = accumulateStats(emptyStats(), log, known);
    expect(once.discoveries).toEqual(['burst:fire']);
    expect(accumulateStats(once, log, known).discoveries).toEqual(['burst:fire']);
  });
});

describe('proof casts', () => {
  test('a meaningful cast counts, a cast that does nothing does not', () => {
    const log = [...castLog({ damage: [2] }), ...castLog({ meaningful: false })];
    const stats = accumulateStats(emptyStats(), log, profile());
    expect(stats.proofCasts).toBe(1);
    expect(stats.spells[0]?.casts).toBe(2);
  });
});

// ── Plain spells' last-trip cells (M15) ──

/** Bolt 0,2 · Fork 1,2 · Tally 1,1 · Oil 1,0 · Spark 1,3. */
const FORK = '.     Oil   .\n.     Tally .\nBolt> Fork  .\n.     Spark .';
const FORK_NO_OIL = '.     .     .\n.     Tally .\nBolt> Fork  .\n.     Spark .';
const SOURCE = '0,2';
const SPARK = '1,3';
const TALLY = '1,1';
const OIL = '1,0';
const FORK_CELLS = [SOURCE, '1,2', SPARK, TALLY, OIL];
/** A cast where the Tally failed: the Oil after it never fired. */
const forkCast = (all = false): GameEvent[] =>
  castLog({
    spell: SOURCE,
    damage: [1],
    fired: all ? FORK_CELLS : [SOURCE, '1,2', SPARK, TALLY],
  });

const sorted = (cells: readonly string[]): string[] => [...cells].sort();
const compiledOf = (ascii: string): { draughtsman: ReturnType<typeof spellsFor> } => ({
  draughtsman: spellsFor('draughtsman', ascii),
});
const current = (ascii: string): CompiledLattice => compileLattice(parseLattice(ascii));
const tallyOf = (stats: { spells: SpellTally[] }): SpellTally => {
  const t = stats.spells[0];
  if (!t) throw new Error('no spell tallied');
  return t;
};
const tripOf = (stats: ReturnType<typeof accumulateStats>): TripRecap => ({
  district: 'seam',
  outcome: 'returned',
  encounter: 0,
  place: 'test',
  stats,
});

describe('a plain spell remembers its path and what fired', () => {
  test('cells follow the path as fought; fired accumulates across fights', () => {
    const first = accumulateStats(emptyStats(), forkCast(), newProfile(), compiledOf(FORK));
    expect(sorted(tallyOf(first).cells)).toEqual(sorted(FORK_CELLS));
    expect(sorted(tallyOf(first).fired)).toEqual(sorted([SOURCE, '1,2', SPARK, TALLY]));
    const second = accumulateStats(first, forkCast(true), newProfile(), compiledOf(FORK));
    expect(tallyOf(second).casts).toBe(2);
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
    const spells = compileLattice(parseLattice('Bolt> G:p> . .\n.    .    . .'), lib).spells;
    const stats = accumulateStats(
      emptyStats(),
      castLog({ damage: [1], fired: ['0,0', '1,0'] }),
      newProfile(),
      { draughtsman: spells },
    );
    // The Bolt and the socket; the Kink's three inner cells collapse into the socket's one.
    expect(tallyOf(stats).cells).toEqual(['0,0', '1,0']);
    expect(tallyOf(stats).fired).toContain('1,0');
  });

  test('dead cells are the cells that never fired, while the path is unchanged', () => {
    const stats = accumulateStats(emptyStats(), forkCast(), newProfile(), compiledOf(FORK));
    expect(lastTripDeadCells(tripOf(stats), 'draughtsman', current(FORK))).toEqual([OIL]);
  });

  test('dead cells vanish once a later fight fires them', () => {
    const first = accumulateStats(emptyStats(), forkCast(), newProfile(), compiledOf(FORK));
    const both = accumulateStats(first, forkCast(true), newProfile(), compiledOf(FORK));
    expect(lastTripDeadCells(tripOf(both), 'draughtsman', current(FORK))).toEqual([]);
  });

  test('stale data shows nothing: a rewired path, a missing spell, or another member', () => {
    const stats = accumulateStats(emptyStats(), forkCast(), newProfile(), compiledOf(FORK));
    const recap = tripOf(stats);
    expect(lastTripDeadCells(recap, 'draughtsman', current(FORK_NO_OIL))).toEqual([]);
    expect(lastTripDeadCells(recap, 'stoker', current(FORK))).toEqual([]);
    expect(lastTripDeadCells(null, 'draughtsman', current(FORK))).toEqual([]);
    expect(lastTripDeadCells(recap, 'draughtsman', current('. . .\n. . .'))).toEqual([]);
  });
});
