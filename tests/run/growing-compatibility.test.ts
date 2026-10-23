import { expect, test } from 'vitest';
import { type InventionDef, RUNE_IDS } from '$data';
import {
  applyAction,
  applyDoorway,
  beginEncounter,
  compiledFor,
  type GlyphDef,
  growingLattice,
  IMPORT_POLICY,
  inkUsed,
  latticeOf,
  memberById,
  newSave,
  pageOf,
  pickLoot,
  pushOn,
  ResourceLimitError,
  type SaveData,
  serializeLattice,
  startTrip,
} from '$engine';
import { parseSaveText, saveText } from '../../src/app/save';
import { straightPage } from '../fixtures/growing-pages/pages';

test.each(['rune', 'glyph'] as const)(
  'distinct spent same-type %s Sources retain their counts through doorway reveal, signed move, pending loot and next battle',
  (source) => {
    let save = newSave(7);
    save.profile = {
      ...save.profile,
      known: [...RUNE_IDS],
      ink: 100,
      lattices: {
        draughtsman: [
          { at: { x: 0, y: 0 }, rune: 'bolt', dir: 'right' },
          { at: { x: 1, y: 0 }, rune: 'strike' },
          { at: { x: 0, y: 3 }, rune: 'bolt', dir: 'right' },
          { at: { x: 1, y: 3 }, rune: 'ink' },
        ],
        stoker: [],
      },
    };
    if (source === 'glyph') {
      save.profile.glyphs = [
        {
          id: 'g1',
          name: 'Twin Sources',
          kind: 'spell',
          version: 1,
          cells: [
            { at: { x: 0, y: 0 }, rune: 'bolt', dir: 'right' },
            { at: { x: 1, y: 0 }, rune: 'ink' },
            { at: { x: 2, y: 0 }, rune: 'strike' },
          ],
          entry: { x: 0, y: 0 },
          exits: [],
          idiom: null,
          params: [],
          extraExit: null,
        },
      ];
      save.profile.lattices.draughtsman = [
        { at: { x: 0, y: 0 }, glyph: 'g1', dir: 'right' },
        { at: { x: 0, y: 3 }, glyph: 'g1', dir: 'right' },
      ];
    }
    save.trip = {
      ...startTrip(save.profile, 27),
      encounter: 1,
      status: 'looting',
      charges: { draughtsman: { '0,0': 1, '0,3': 3 }, stoker: {} },
      offers: [{ kind: 'doorway' }, { kind: 'vellum', amount: 2 }],
      picksLeft: 2,
    };
    save.trip = pickLoot(save.trip, 0);
    const original = structuredClone(save);
    const page = latticeOf(save.profile, 'draughtsman');
    serializeLattice({
      ...page,
      shape: {
        kind: 'growing',
        origin: { x: -100, y: -100 },
        width: 1000,
        height: 1000,
        holes: [],
      },
    });
    expect(save).toEqual(original);
    const noEdit = applyDoorway(save.profile, save.trip, save.profile.lattices);
    expect(noEdit.trip.charges.draughtsman).toEqual({ '0,0': 1, '0,3': 3 });
    const moved = applyDoorway(save.profile, save.trip, {
      ...save.profile.lattices,
      draughtsman: pageOf(save.profile, 'draughtsman').map((rune) =>
        rune.at.y === 3 ? { ...rune, at: { x: rune.at.x - 6, y: -4 } } : rune,
      ),
    });
    expect(moved.trip.charges.draughtsman).toEqual({ '0,0': 1, '-6,-4': 3 });
    expect(moved.trip.status).toBe('looting');
    expect(moved.trip.offers).toEqual([{ kind: 'vellum', amount: 2 }]);
    save = parseSaveText(saveText({ ...save, ...moved }));
    if (!save.trip) throw new Error('missing doorway trip');
    save.trip = pushOn(pickLoot(save.trip, 0));
    const reloaded = parseSaveText(saveText(save));
    if (!reloaded.trip) throw new Error('missing next encounter');
    const next = beginEncounter(reloaded.profile, reloaded.trip);
    expect(memberById(next.state, 'draughtsman').charges).toEqual({ '0,0': 1, '-6,-4': 3 });
    expect(next.events.length).toBeGreaterThan(0);
    const cast = applyAction(next.state, {
      type: 'cast',
      unit: 'draughtsman',
      spell: '-6,-4',
      aim: { kind: 'dir', dir: 'right' },
    });
    expect(memberById(cast.state, 'draughtsman').charges).toEqual({ '0,0': 1, '-6,-4': 2 });
    expect(
      cast.events.some((event) => event.type === 'cast' && event.origin?.spell === '-6,-4'),
    ).toBe(true);
  },
);

test('long accepted signed paths compile and reload without stack overflow or changing Source keys', () => {
  const save = newSave(1);
  save.profile.lattices.draughtsman = straightPage(12000).map((rune) => ({
    ...rune,
    at: { x: rune.at.x - 1000, y: -3 },
  }));
  const reloaded = parseSaveText(saveText(save));
  const spell = compiledFor(reloaded.profile, 'draughtsman').spells[0];
  expect(spell?.key).toBe('-1000,-3');
  expect(spell?.path).toHaveLength(12000);
  expect(parseSaveText(saveText(reloaded))).toEqual(reloaded);
});

test('external save refusal keeps originals for duplicate, unsafe, malformed-key and missing-reference inputs', () => {
  const base = newSave(9);
  const text = saveText(base);
  const cases: SaveData[] = [];
  const duplicate = structuredClone(base);
  duplicate.profile.lattices.draughtsman = [
    { at: { x: -3, y: 0 }, rune: 'ink' },
    { at: { x: -3, y: 0 }, rune: 'oil' },
  ];
  cases.push(duplicate);
  const unsafe = structuredClone(base);
  unsafe.profile.lattices.stoker = [{ at: { x: Number.MAX_SAFE_INTEGER, y: 0 }, rune: 'ink' }];
  cases.push(unsafe);
  const key = structuredClone(base);
  key.trip = startTrip(key.profile, 3);
  key.trip.charges.draughtsman = { '-0,1': 1 };
  cases.push(key);
  const missing = structuredClone(base);
  missing.profile.lattices.stoker = [{ at: { x: -3, y: -2 }, glyph: 'missing', dir: 'right' }];
  cases.push(missing);
  for (const invalid of cases) {
    expect(() => parseSaveText(saveText(invalid))).toThrow();
    expect(saveText(base)).toBe(text);
  }
  const padding = IMPORT_POLICY.maxBytes - new TextEncoder().encode(text).length;
  expect(parseSaveText(text + ' '.repeat(padding))).toEqual(base);
  expect(() => parseSaveText(text + ' '.repeat(padding + 1))).toThrow(ResourceLimitError);
});

test('admitted deep invention dependencies can be compiled without recursive ink stack growth', () => {
  const save = newSave(1);
  save.profile.inventions = Array.from(
    { length: 2500 },
    (_, i): InventionDef => ({
      id: `inv:chain-${i}`,
      name: `Chain ${i}`,
      method: 'repeat',
      parts: [i === 0 ? 'strike' : `inv:chain-${i - 1}`],
      solvent: null,
    }),
  );
  save.profile.lattices.draughtsman = [
    { at: { x: -1, y: 0 }, rune: 'bolt', dir: 'right' },
    { at: { x: 0, y: 0 }, rune: 'inv:chain-2499' },
  ];
  const admitted = parseSaveText(saveText(save));
  expect(() => compiledFor(admitted.profile, 'draughtsman')).not.toThrow();
  expect(
    inkUsed(
      growingLattice(pageOf(admitted.profile, 'draughtsman')),
      {},
      Object.fromEntries(admitted.profile.inventions.map((def) => [def.id, def])),
    ),
  ).toBeGreaterThan(2500);
});

test.each([true, false])(
  'repeated oversized Glyph bodies are refused by the external work budget before compilation (arguments=%s)',
  (withArgs) => {
    const save = newSave(5);
    const glyph: GlyphDef = {
      id: 'large',
      name: 'Oversized import',
      kind: 'payload',
      version: 1,
      cells: Array.from({ length: 2048 }, (_, x) => ({ at: { x, y: 0 }, rune: 'ink' })),
      entry: { x: 0, y: 0 },
      exits: [],
      idiom: null,
      params: ['2047,0'],
      extraExit: null,
    };
    save.profile.glyphs = [glyph];
    save.profile.lattices.draughtsman = Array.from({ length: 512 }, (_, x) => ({
      at: { x: -x, y: -1 },
      glyph: 'large',
      dir: 'right',
      ...(withArgs ? { args: { '2047,0': { rune: 'oil' as const } } } : {}),
    }));
    const original = saveText(save);
    expect(() => parseSaveText(original)).toThrow(
      expect.objectContaining({ kind: 'resource-limit', resource: 'work' }),
    );
    expect(saveText(save)).toBe(original);
  },
);

test('a compact duplicated invention graph is refused before unsafe or exponential pricing', () => {
  const save = newSave(1);
  save.profile.inventions = Array.from({ length: 54 }, (_, i): InventionDef => {
    const part = i === 0 ? 'strike' : (`inv:double-${i - 1}` as const);
    return {
      id: `inv:double-${i}`,
      name: `Double ${i}`,
      method: 'repeat',
      parts: [part, part],
      solvent: null,
    };
  });
  expect(() => parseSaveText(saveText(save))).toThrow(
    expect.objectContaining({ kind: 'resource-limit' }),
  );
});
