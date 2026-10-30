import { describe, expect, test } from 'vitest';
import { DISTRICTS } from '$data';
import type { Placed, Spell, SpellTally, TierUp, TripRecap } from '$engine';
import {
  deadCellNotes,
  freshDeadCells,
  heardHighlights,
  heardVoice,
  rumourLine,
  spellLine,
  termsLine,
  tierUpLine,
} from '../../src/app/tripviews';

const up = (metric: TierUp['metric'], tier: TierUp['tier']): TierUp => ({
  glyph: 'g1',
  name: 'Cashing In',
  version: 2,
  metric,
  tier,
});

const spell = (cells: string[], extra: Partial<Spell> = {}): Spell =>
  ({
    key: '0,1',
    path: cells.map((k) => {
      const [x, y] = k.split(',').map(Number);
      return { at: { x, y } };
    }),
    ...extra,
  }) as unknown as Spell;

const tally = (over: Partial<SpellTally> = {}): SpellTally => ({
  member: 'draughtsman',
  spell: '0,1',
  name: 'Bolt',
  casts: 6,
  damage: 9,
  kills: 0,
  cells: ['0,1', '1,1', '2,1'],
  fired: ['0,1', '1,1'],
  ...over,
});

describe('tierUpLine', () => {
  test('silver Reliability points at the extra exit', () => {
    expect(tierUpLine(up('reliability', 2))).toBe(
      'Cashing In v2 reached silver Reliability. Pick its extra exit at the desk.',
    );
  });
  test('gold Reliability mentions the second cell; Economy is bare', () => {
    expect(tierUpLine(up('reliability', 3))).toContain('second cell open');
    expect(tierUpLine(up('economy', 1))).toBe('Cashing In v2 reached bronze Economy.');
  });
});

describe('dead cells', () => {
  const cur = spell(['0,1', '1,1', '2,1']);
  test('fresh data lists the cells that never fired', () => {
    expect(freshDeadCells(tally(), [cur])).toEqual(['2,1']);
    expect(spellLine(tally(), cur)).toBe('last trip: 6 casts, 9 harm · 1 cell never fired');
  });
  test('a rewired path is stale and shows nothing', () => {
    const rewired = spell(['0,1', '1,1']);
    expect(freshDeadCells(tally(), [rewired])).toBeNull();
    expect(spellLine(tally(), rewired)).toBeNull();
    expect(deadCellNotes(tally(), [rewired], [])).toEqual([]);
  });
  test('a Glyph spell and a missing tally show nothing', () => {
    expect(freshDeadCells(tally(), [spell(['0,1', '1,1', '2,1'], { glyph: 'g1' })])).toBeNull();
    expect(spellLine(undefined, cur)).toBeNull();
  });
  test('no dead cell leaves just the profile; a note names the rune and cell', () => {
    expect(spellLine(tally({ casts: 1, fired: ['0,1', '1,1', '2,1'] }), cur)).toBe(
      'last trip: 1 cast, 9 harm',
    );
    const placed: Placed[] = [{ at: { x: 2, y: 1 }, rune: 'fork' }];
    expect(deadCellNotes(tally(), [cur], placed)).toEqual(['the Fork at C2 never fired']);
  });
});

const recapWith = (heard: TripRecap['stats']['heard']): TripRecap => ({
  district: 'canals',
  outcome: 'returned',
  encounter: 4,
  place: 'The drowned arcade',
  stats: {
    fights: 5,
    spells: [],
    biggestChain: null,
    discoveries: [],
    proofCasts: 0,
    elegance: [],
    heard,
  },
});

// A fixture table where the canals are heard by rumour only (no owner condition).
const rumourTable = {
  ...DISTRICTS,
  canals: { ...DISTRICTS.canals, hear: [{ kind: 'trips', atLeast: 2, voice: 'rumour' }] },
} as const;

describe('heard on the trip page', () => {
  test('an owner-voiced district is drawn on the map with its line', () => {
    expect(heardVoice('canals')).toBe('owner');
    expect(heardHighlights(recapWith(['canals']))).toEqual([
      {
        kind: 'heard',
        title: 'A new page of the map',
        text: `The owner drew the oil-lit canals on the map: “${DISTRICTS.canals.line}”`,
      },
    ]);
  });

  test('a rumour-voiced district reads as a rumour', () => {
    expect(heardVoice('canals', rumourTable)).toBe('rumour');
    expect(heardHighlights(recapWith(['canals']), rumourTable)[0]?.text).toBe(
      'A rumour of the oil-lit canals',
    );
  });

  test('one highlight per heard district, in order; none when nothing was heard', () => {
    expect(heardHighlights(recapWith([]))).toEqual([]);
    expect(heardHighlights(recapWith(['canals', 'seam']), rumourTable).map((h) => h.text)).toEqual([
      'A rumour of the oil-lit canals',
      'A rumour of the Seam',
    ]);
  });
});

describe('the rumour line at the Study window', () => {
  test('a rumour-heard district gives one line', () => {
    expect(rumourLine(recapWith(['canals']), rumourTable)).toBe('A rumour of the oil-lit canals');
  });

  test('an owner-heard district, no trip, or no heard list gives nothing', () => {
    expect(rumourLine(recapWith(['canals']))).toBeNull();
    expect(rumourLine(recapWith([]), rumourTable)).toBeNull();
    expect(rumourLine(null)).toBeNull();
  });

  test('only the first rumour is shown', () => {
    const table = {
      ...rumourTable,
      seam: { ...DISTRICTS.seam, hear: [{ kind: 'trips', atLeast: 1, voice: 'rumour' }] },
    } as const;
    expect(rumourLine(recapWith(['seam', 'canals']), table)).toBe('A rumour of the Seam');
  });
});

test('dead-cell notes use signed and multi-letter lattice labels', () => {
  const cells = ['0,1', '-3,-2', '26,0'];
  const current = spell(cells);
  const row = tally({ cells, fired: ['0,1'] });
  expect(
    deadCellNotes(
      row,
      [current],
      [
        { at: { x: -3, y: -2 }, rune: 'ink' },
        { at: { x: 26, y: 0 }, rune: 'spark' },
      ],
    ),
  ).toEqual(['the Ink at (-3,-2) never fired', 'the Spark at AA1 never fired']);
});

describe('termsLine', () => {
  const recap = (terms?: TripRecap['terms']): TripRecap => ({
    district: 'inkQuarter',
    outcome: 'returned',
    encounter: 4,
    place: 'The long shelves',
    stats: {
      fights: 5,
      spells: [],
      biggestChain: null,
      discoveries: [],
      proofCasts: 0,
      elegance: [],
      heard: [],
    },
    ...(terms ? { terms } : {}),
  });
  test('counts paid and broken terms', () => {
    const line = termsLine(
      recap([
        { def: 'inkQuarter:term-bind', status: 'paid' },
        { def: 'inkQuarter:term-bind', status: 'broken' },
        { def: 'inkQuarter:term-bind', status: 'paid' },
      ]),
    );
    expect(line).toBe('Terms: 2 paid, 1 broken');
  });
  test('no line without terms, including old saves', () => {
    expect(termsLine(recap([]))).toBeNull();
    expect(termsLine(recap())).toBeNull();
  });
});
