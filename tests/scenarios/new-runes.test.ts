import { describe, expect, test } from 'vitest';
import { MEMBERS } from '$data';
import {
  aimPreview,
  compileLattice,
  createBattle,
  type GlyphDef,
  inkUsed,
  type Lattice,
  latticeOf,
  newProfile,
  type Profile,
  parseLattice,
  placedInk,
  setMemberLattice,
  startTrip,
} from '$engine';
import { type board, cast, expectLog, unitAtLabel, withLattices } from './harness';

/** The three loot runes (plan seam-deepening S1–S3): Pierce, On Ignite and Thrift. */

describe('pierce', () => {
  test('the aim preview follows the flight past the first unit', () => {
    const s = withLattices('D . r b .', { draughtsman: 'Bolt> Pierce Ink' });
    const p = aimPreview(s, 'draughtsman', '0,0', { kind: 'dir', dir: 'right' });
    expect(p.targets).toEqual([
      { x: 2, y: 0 },
      { x: 3, y: 0 },
    ]);
    expect(p.path).toHaveLength(3);
  });

  test('pierce-rat-then-sentry: the bolt passes the rat and hits the sentry, then ink marks both', () => {
    const s = withLattices(
      'D . r b',
      { draughtsman: 'Bolt> Pierce Ink' },
      { hp: { C1: 5, D1: 5 } },
    );
    const r = cast(s, 'draughtsman', 'right');
    expectLog(r.events, [
      'Draughtsman casts Bolt right',
      'Bolt hits rat at C1 for 2',
      'Bolt passes through rat at C1',
      'Bolt hits sentry at D1 for 2',
      'rat at C1 is inked',
      'sentry at D1 is inked',
      'ink pools at B1',
    ]);
  });

  test('runes before a Pierce act on the first unit only', () => {
    const s = withLattices(
      'D . r . . r',
      { draughtsman: 'Bolt> Ink Pierce Spark' },
      { hp: { C1: 9, F1: 9 } },
    );
    const r = cast(s, 'draughtsman', 'right');
    expectLog(r.events, [
      'Draughtsman casts Bolt right',
      'Bolt hits rat at C1 for 2',
      'Bolt passes through rat at C1',
      'Bolt hits rat at F1 for 2',
      'rat at C1 is inked',
      'ink pools at B1, D1',
      'Spark hits rat at C1 for 2 (inked +1)',
      'the ink on rat at C1 detonates',
      'Detonation hits rat at C1 for 2',
      'Spark hits rat at F1 for 1',
    ]);
  });

  test('steam between the units stops the bolt after the first', () => {
    const s = withLattices('D r ~ r', { draughtsman: 'Bolt> Pierce' }, { hp: { B1: 5, D1: 5 } });
    const r = cast(s, 'draughtsman', 'right');
    expectLog(r.events, [
      'Draughtsman casts Bolt right',
      'Bolt hits rat at B1 for 2',
      'Bolt passes through rat at B1',
      'Bolt is stopped by the steam at C1',
    ]);
    expect(unitAtLabel(r.state, 'D1').hp).toBe(5);
  });

  test('a brass plate between the units stops the bolt after the first', () => {
    const s = withLattices('D r = r', { draughtsman: 'Bolt> Pierce' }, { hp: { B1: 5, D1: 5 } });
    const r = cast(s, 'draughtsman', 'right');
    expectLog(r.events, [
      'Draughtsman casts Bolt right',
      'Bolt hits rat at B1 for 2',
      'Bolt passes through rat at B1',
      'Bolt is stopped by the brass plate at C1',
    ]);
    expect(unitAtLabel(r.state, 'D1').hp).toBe(5);
  });

  test('a lone unit: the bolt passes it and lands at the edge, and the rest reaches both', () => {
    const s = withLattices('D . r . .', { draughtsman: 'Bolt> Pierce Ink' }, { hp: { C1: 5 } });
    const r = cast(s, 'draughtsman', 'right');
    expectLog(r.events, [
      'Draughtsman casts Bolt right',
      'Bolt hits rat at C1 for 2',
      'Bolt passes through rat at C1',
      'Bolt lands at E1',
      'rat at C1 is inked',
      'ink pools at B1, D1, E1',
    ]);
  });

  test('two Pierces do not stack: the third unit is untouched', () => {
    const s = withLattices(
      'D . r r . r',
      { draughtsman: 'Bolt> Pierce Pierce Ink' },
      { hp: { C1: 5, D1: 5, F1: 5 } },
    );
    const r = cast(s, 'draughtsman', 'right');
    expectLog(r.events, [
      'Draughtsman casts Bolt right',
      'Bolt hits rat at C1 for 2',
      'Bolt passes through rat at C1',
      'Bolt hits rat at D1 for 2',
      'rat at C1 is inked',
      'rat at D1 is inked',
      'ink pools at B1, E1',
    ]);
    expect(unitAtLabel(r.state, 'F1').hp).toBe(5);
    expect(unitAtLabel(r.state, 'F1').inked).toBe(false);
  });

  test('Pierce on Splash does nothing', () => {
    const ascii = `
      D . . .
      . r r .
      . . . .
    `;
    const plain = withLattices(ascii, { draughtsman: 'Splash> Ink' }, { hp: { B2: 5, C2: 5 } });
    const pierced = withLattices(
      ascii,
      { draughtsman: 'Splash> Pierce Ink' },
      { hp: { B2: 5, C2: 5 } },
    );
    const aim = { kind: 'tile', at: { x: 1, y: 1 } } as const;
    const lines = cast(plain, 'draughtsman', aim).lines;
    expect(lines.length).toBeGreaterThan(3);
    expect(cast(pierced, 'draughtsman', aim).lines).toEqual(lines);
    expect(memberSpell(pierced).pierce).toBeUndefined();
  });

  test('a Spell Glyph whose source is a Bolt pierces too', () => {
    const def: GlyphDef = {
      id: 'g1',
      name: 'Glyph',
      kind: 'spell',
      cells: [
        { at: { x: 0, y: 0 }, rune: 'bolt', dir: 'right' },
        { at: { x: 1, y: 0 }, rune: 'pierce' },
        { at: { x: 2, y: 0 }, rune: 'ink' },
      ],
      entry: { x: 0, y: 0 },
      exits: [],
      idiom: null,
    };
    const l: Lattice = {
      shape: parseLattice(MEMBERS.draughtsman.shape).shape,
      runes: [{ at: { x: 0, y: 0 }, glyph: 'g1', dir: 'right' }],
    };
    const spells = compileLattice(l, MEMBERS.draughtsman.affinity, { g1: def }).spells;
    const s = createBattle({
      title: 'test',
      seed: 1,
      board: 'D . r r',
      hp: { C1: 5, D1: 5 },
      party: { draughtsman: { spells } },
    }).state;
    const r = cast(s, 'draughtsman', 'right');
    expectLog(r.events, [
      'Draughtsman casts Bolt right',
      'Bolt hits rat at C1 for 2',
      'Bolt passes through rat at C1',
      'Bolt hits rat at D1 for 2',
      'rat at C1 is inked',
      'rat at D1 is inked',
      'ink pools at B1',
    ]);
  });
});

function memberSpell(s: ReturnType<typeof board>, member = 'draughtsman') {
  const m = s.units.find((u) => u.id === member);
  if (m?.kind !== 'member') throw new Error('no member');
  const sp = m.spells[0];
  if (!sp) throw new Error('no spell');
  return sp;
}

describe('on ignite', () => {
  test('nothing lit: the flow stops', () => {
    const s = withLattices('D r', { draughtsman: 'Bolt> OnIgnite Ink' }, { hp: { B1: 5 } });
    const r = cast(s, 'draughtsman', 'right');
    expectLog(r.events, [
      'Draughtsman casts Bolt right',
      'Bolt hits rat at B1 for 2',
      'On Ignite: nothing caught fire, the chain stops',
    ]);
    expect(unitAtLabel(r.state, 'B1').inked).toBe(false);
  });

  test('spark, oil, on ignite, ink: everyone in the blaze is inked, the bystanders are not', () => {
    const s = withLattices(
      `
      D . ro o ro
      . . . . .
      . . r . .
    `,
      { draughtsman: 'Bolt> Spark OnIgnite Ink' },
      { hp: { C1: 9, E1: 9, C3: 9 } },
    );
    const r = cast(s, 'draughtsman', 'right');
    expectLog(r.events, [
      'Draughtsman casts Bolt right',
      'Bolt hits rat at C1 for 2',
      'Spark hits rat at C1 for 1',
      'oil at C1 ignites, fire spreads to D1, E1',
      'Fire hits rat at C1 for 2 (oil-soaked +1)',
      'Fire hits rat at E1 for 2 (oil-soaked +1)',
      'On Ignite: the flow follows the fire',
      'rat at C1 is inked',
      'rat at E1 is inked',
      'ink pools at B1, D1, B2, C2, D2, E2',
    ]);
    expect(unitAtLabel(r.state, 'C3').inked).toBe(false);
    expect(unitAtLabel(r.state, 'A1').inked).toBe(false);
  });

  test('a Torch earlier in the flow counts, and the flow leaves the cast target', () => {
    const s = withLattices(
      'D . r . . . r',
      { draughtsman: 'Bolt> Torch OnIgnite Ink' },
      { hp: { C1: 9 } },
    );
    const r = cast(s, 'draughtsman', 'right');
    expectLog(r.events, [
      'Draughtsman casts Bolt right',
      'Bolt hits rat at C1 for 2',
      'oil coats C1',
      'oil at C1 ignites',
      'Fire hits rat at C1 for 2 (oil-soaked +1)',
      'On Ignite: the flow follows the fire',
      'rat at C1 is inked',
      'ink pools at B1, D1',
    ]);
    expect(unitAtLabel(r.state, 'G1').inked).toBe(false);
  });
});

describe('thrift', () => {
  const profileWith = (lattice: string): Profile => {
    const p = newProfile();
    const collection = { ...p.collection, bolt: 3, splash: 3, thrift: 3 };
    const l = parseLattice(lattice);
    return {
      ...setMemberLattice(p, 'draughtsman', {
        shape: parseLattice(MEMBERS.draughtsman.shape).shape,
        runes: l.runes,
      }),
      collection,
      inkCapacity: { ...p.inkCapacity, draughtsman: 20 },
    };
  };

  test('between two spells it gives both +1 charge when the trip starts', () => {
    const p = profileWith('Boltv Thrift Splashv');
    const spells = compileLattice(latticeOf(p, 'draughtsman'), []).spells;
    expect(spells.map((sp) => [sp.source, sp.charges])).toEqual([
      ['bolt', 6],
      ['splash', 4],
    ]);
    const bare = compileLattice(latticeOf(profileWith('Boltv . . Splashv'), 'draughtsman'), []);
    expect(bare.spells.map((sp) => sp.charges)).toEqual([5, 3]);
    const t = startTrip(p, 7);
    expect(Object.values(t.charges.draughtsman)).toEqual([6, 4]);
  });

  test('it touches only what is next to it', () => {
    const p = profileWith('Boltv . Thrift Splashv');
    const t = startTrip(p, 7);
    expect(Object.values(t.charges.draughtsman)).toEqual([5, 4]);
  });

  test('an outer Thrift on a Spell Glyph gives its spell +1 and costs +1 ink', () => {
    const def: GlyphDef = {
      id: 'g1',
      name: 'Glyph',
      kind: 'spell',
      cells: [
        { at: { x: 0, y: 0 }, rune: 'bolt', dir: 'right' },
        { at: { x: 1, y: 0 }, rune: 'ink' },
      ],
      entry: { x: 0, y: 0 },
      exits: [],
      idiom: null,
    };
    const shape = parseLattice(MEMBERS.draughtsman.shape).shape;
    const withThrift: Lattice = {
      shape,
      runes: [
        { at: { x: 0, y: 0 }, glyph: 'g1', dir: 'down' },
        { at: { x: 1, y: 0 }, rune: 'thrift' },
      ],
    };
    const bare: Lattice = { shape, runes: [{ at: { x: 0, y: 0 }, glyph: 'g1', dir: 'down' }] };
    const library = { g1: def };
    const [spell] = compileLattice(withThrift, [], library).spells;
    expect(spell?.charges).toBe(6);
    expect(compileLattice(bare, [], library).spells[0]?.charges).toBe(5);
    const glyph = withThrift.runes[0];
    if (!glyph) throw new Error('no glyph');
    expect(placedInk(glyph, library, withThrift)).toBe(placedInk(glyph, library, bare) + 1);
    expect(inkUsed(withThrift, library)).toBe(inkUsed(bare, library) + 1 + 3);
  });
});
