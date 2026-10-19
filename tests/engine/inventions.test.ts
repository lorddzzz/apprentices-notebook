import { describe, expect, test } from 'vitest';
import { type InventionDef, RUNE_IDS } from '$data';
import {
  headlineOf,
  inkOf,
  inventionInk,
  inventionIssue,
  inventionRole,
  type KnownSet,
  libraryOf,
} from '$engine';

/** Design §6.1–6.2, §6.4 and plan P33: what fits where, the headline, the ink. */

const inv = (
  id: string,
  method: InventionDef['method'],
  parts: InventionDef['parts'],
  extra: Partial<InventionDef> = {},
): InventionDef => ({
  id: `inv:${id}`,
  name: id[0]?.toUpperCase() + id.slice(1),
  method,
  parts,
  solvent: null,
  ...extra,
});

const IMPULSE = inv('impulse', 'conduct', ['shove']);
const AFTERIMAGE = inv('afterimage', 'repeat', ['strike']);
const library = libraryOf([IMPULSE, AFTERIMAGE]);

const known = (over: Partial<KnownSet> = {}): KnownSet => ({
  runes: RUNE_IDS,
  methods: ['conduct', 'repeat', 'margin', 'bind', 'lift'],
  events: ['hit', 'enters', 'pushed', 'dies'],
  inventions: library,
  ...over,
});

describe('compatibility', () => {
  test.each([
    ['Impulse', inv('x', 'conduct', ['shove'])],
    ['Brass shelter', inv('x', 'conduct', ['guard'])],
    ['Afterimage', inv('x', 'repeat', ['shove'])],
    ['Margin', inv('x', 'margin', ['inv:afterimage'])],
    ['Recoil', inv('x', 'bind', ['ink', 'shove'], { event: 'hit' })],
    ['Anchor', inv('x', 'bind', ['ink', 'hold'], { event: 'pushed' })],
    ['Transfer', inv('x', 'lift', ['shove'])],
    ['Bind(Ink, Impulse)', inv('x', 'bind', ['ink', 'inv:impulse'], { event: 'hit' })],
    ['Repeat(Impulse)', inv('x', 'repeat', ['inv:impulse'])],
    ['Bind(Ink, Afterimage)', inv('x', 'bind', ['ink', 'inv:afterimage'], { event: 'enters' })],
    ['Lift(Impulse)', inv('x', 'lift', ['inv:impulse'])],
  ])('%s fits', (_name, def) => {
    expect(inventionIssue(def, known())).toBeNull();
  });

  test.each([
    ['conduct', ['fork'], 'a Shape has nothing to conduct'],
    ['conduct', ['oil'], 'a Kind has nothing to conduct'],
    ['conduct', ['bolt'], 'a Source has nothing to conduct'],
    ['repeat', ['jar'], 'a Seal has nothing to repeat'],
    ['lift', ['tally'], 'a Trigger has nothing to lift'],
    [
      'conduct',
      ['inv:afterimage'],
      'Afterimage waits a turn, and Conduct needs an Action that resolves at once',
    ],
    [
      'repeat',
      ['inv:afterimage'],
      'Afterimage waits a turn, and Repeat needs an Action that resolves at once',
    ],
    ['lift', ['strike'], 'Strike moves nothing, and Lift needs an Action that moves a unit'],
    ['lift', ['guard'], 'Guard moves nothing, and Lift needs an Action that moves a unit'],
    ['margin', ['shove'], 'Margin takes a Repeat'],
    ['margin', ['inv:impulse'], 'Margin takes a Repeat'],
    ['conduct', ['shove', 'strike'], 'Conduct takes 1 part, not 2'],
    ['bind', ['ink'], 'Bind takes 2 parts, not 1'],
  ] as const)('%s(%s) is explained', (method, parts, message) => {
    const def = inv('x', method, parts, method === 'bind' ? { event: 'hit' } : {});
    expect(inventionIssue(def, known())).toBe(message);
  });

  test('shape-has-nothing-to-store', () => {
    const def = inv('x', 'bind', ['ink', 'fork'], { event: 'hit' });
    expect(inventionIssue(def, known())).toBe('a Shape has nothing to store');
  });

  test('bind needs Ink first', () => {
    expect(inventionIssue(inv('x', 'bind', ['oil', 'shove'], { event: 'hit' }), known())).toBe(
      'Bind needs Ink first',
    );
    expect(inventionIssue(inv('x', 'bind', ['shove', 'ink'], { event: 'hit' }), known())).toBe(
      'Bind needs Ink first',
    );
  });

  test('moving Actions: Shove, Sentence, Swap, Draw and what is made of them', () => {
    for (const part of ['shove', 'sentence', 'swap', 'draw', 'inv:impulse'] as const) {
      expect(inventionIssue(inv('x', 'lift', [part]), known()), part).toBeNull();
    }
  });

  test('cannot-contain-itself', () => {
    const self = inv('loop', 'conduct', ['inv:loop']);
    expect(inventionIssue(self, known({ inventions: libraryOf([self]) }))).toBe(
      "an invention can't contain itself",
    );
    // Through another invention: a = Repeat(b), b = Conduct(a).
    const a = inv('a', 'repeat', ['inv:b']);
    const b = inv('b', 'conduct', ['inv:a']);
    const both = libraryOf([a, b]);
    expect(inventionIssue(a, known({ inventions: both }))).toBe(
      "an invention can't contain itself",
    );
    expect(inventionIssue(b, known({ inventions: both }))).toBe(
      "an invention can't contain itself",
    );
  });
});

describe('what the household knows', () => {
  test('a method not learned', () => {
    expect(inventionIssue(IMPULSE, known({ methods: ['repeat'] }))).toBe(
      "You haven't learned Conduct yet",
    );
  });

  test('a rune not known', () => {
    expect(inventionIssue(IMPULSE, known({ runes: ['strike'] }))).toBe("You don't know Shove yet");
  });

  test('an invention not in the library', () => {
    const def = inv('x', 'repeat', ['inv:ghost']);
    expect(inventionIssue(def, known())).toBe('ghost is not one of your inventions');
  });

  test('an unknown part or method', () => {
    expect(inventionIssue(inv('x', 'conduct', ['nonsense' as never]), known())).toBe(
      'nonsense is not a rune',
    );
    expect(inventionIssue(inv('x', 'wave' as never, ['shove']), known())).toBe(
      'wave is not a method',
    );
  });

  test('Bind needs an event the household knows', () => {
    const def = inv('x', 'bind', ['ink', 'shove'], { event: 'dies' });
    expect(inventionIssue(def, known({ events: ['hit', 'enters'] }))).toBe(
      'You don\'t know the "dies" event yet',
    );
    expect(inventionIssue(inv('x', 'bind', ['ink', 'shove']), known())).toBe(
      'Bind needs an event to wait for',
    );
  });

  test('only Bind names an event', () => {
    const def = inv('x', 'conduct', ['shove'], { event: 'hit' });
    expect(inventionIssue(def, known())).toBe('Only Bind waits for an event, not Conduct');
  });
});

describe('role, headline, ink', () => {
  test('role is the method makes', () => {
    expect(inventionRole(IMPULSE, library)).toBe('action');
    expect(inventionRole(inv('x', 'bind', ['ink', 'shove'], { event: 'hit' }), library)).toBe(
      'kind',
    );
    expect(inventionRole(inv('x', 'margin', ['inv:afterimage']), library)).toBe('aura');
  });

  test('recoil-headline-text', () => {
    const recoil = inv('recoil', 'bind', ['ink', 'shove'], { event: 'hit' });
    expect(headlineOf(recoil, library)).toBe(
      'Lands a mark that holds Shove until its bearer is hit.',
    );
    expect(headlineOf({ ...recoil, event: 'pushed' }, library)).toBe(
      'Lands a mark that holds Shove until its bearer is pushed.',
    );
  });

  test('headlines name the parts, nested ones by their own name', () => {
    expect(headlineOf(IMPULSE, library)).toBe(
      'Shove travels the connected brass the target touches, reaching each unit on it once.',
    );
    expect(headlineOf(inv('x', 'repeat', ['inv:impulse']), library)).toBe(
      'Impulse now, and once more next turn on the same tile.',
    );
    expect(headlineOf(inv('x', 'margin', ['inv:afterimage']), library)).toBe(
      'Actions on touching paths repeat next turn, as Afterimage does.',
    );
  });

  test('a solvent adds its flavour to the headline', () => {
    expect(headlineOf({ ...IMPULSE, solvent: 'mortar' }, library)).toBe(
      'Shove travels the connected brass the target touches, reaching each unit on it once. With Mortar, pushes in it go 1 tile further.',
    );
  });

  test('invention-ink-sum', () => {
    // P33: Σ parts + method (Bind +2, Conduct +2, Repeat +2, Margin +1, Lift +1); a solvent adds none.
    expect(inventionInk(IMPULSE, library)).toBe(2 + 2); // Shove + Conduct
    expect(inventionInk(inv('x', 'bind', ['ink', 'shove'], { event: 'hit' }), library)).toBe(
      1 + 2 + 2,
    );
    expect(inventionInk(inv('x', 'margin', ['inv:afterimage']), library)).toBe(2 + 2 + 1); // nested parts paid
    expect(inventionInk(inv('x', 'lift', ['shove']), library)).toBe(2 + 1);
    expect(inventionInk(inv('x', 'bind', ['ink', 'inv:impulse'], { event: 'hit' }), library)).toBe(
      1 + (2 + 2) + 2,
    );
    expect(inventionInk({ ...IMPULSE, solvent: 'gallnut' }, library)).toBe(4);
  });

  test('the lattice prices an invention the same way', () => {
    const nested = inv('x', 'bind', ['ink', 'inv:impulse'], { event: 'hit' });
    const lib = libraryOf([IMPULSE, nested]);
    expect(inkOf('inv:x', lib)).toBe(inventionInk(nested, lib));
  });
});
