import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';
import {
  canPlace,
  compiledFor,
  growingLattice,
  IMPORT_POLICY,
  latticeOf,
  MAX_LATTICE_COORD,
  newSave,
  pageOf,
  parseSaveData,
  ResourceLimitError,
  type SaveData,
  setMemberLattice,
  startTrip,
} from '$engine';
import { GameStore } from '../../src/app/game.svelte';
import { loadSave, memoryBackend, parseSaveText, saveText, serialize } from '../../src/app/save';
import { DISTANT_PAGE, straightPage } from '../fixtures/growing-pages/pages';

function fixture(name: string): unknown {
  return JSON.parse(
    readFileSync(new URL(`../fixtures/growing-pages/${name}.json`, import.meta.url), 'utf8'),
  );
}

test('a rich v9 save (Glyph versions, records, args, proof, recap) round-trips through text', () => {
  const envelope = fixture('v9-home') as { version: number; data: SaveData };
  const text = JSON.stringify(envelope);
  const save = parseSaveText(text);
  expect(save).toEqual({
    ...envelope.data,
    profile: { ...envelope.data.profile, bindEvents: [], papers: [], pages: [] },
  });
  expect(compiledFor(save.profile, 'draughtsman').spells.length).toBeGreaterThan(0);
  const backend = memoryBackend(text);
  expect(loadSave(backend, 99)).toMatchObject({ save, recovered: false, older: false });
  expect(backend.corrupt).toBeNull();
  expect(parseSaveText(saveText(save))).toEqual(save);
});

test('growing profile pages have signed coordinates and former holes without changing placement identity', () => {
  let save = newSave(1);
  save = { ...save, profile: { ...save.profile, ink: 100 } };
  for (const at of [
    { x: -2, y: 0 },
    { x: 1, y: -2 },
    { x: 50, y: 4 },
    { x: 1, y: 50 },
    { x: 0, y: 0 },
  ])
    expect(canPlace(save.profile, 'stoker', at, 'ink')).toBeNull();
  const runes = [
    { at: { x: -2, y: -3 }, rune: 'bolt' as const, dir: 'right' as const },
    { at: { x: -1, y: -3 }, rune: 'ink' as const },
    { at: { x: 0, y: -3 }, rune: 'strike' as const },
    { at: { x: 0, y: 0 }, rune: 'oil' as const },
  ];
  save.profile = setMemberLattice(save.profile, 'stoker', growingLattice(runes));
  const before = compiledFor(save.profile, 'stoker');
  expect(before.spells[0]?.key).toBe('-2,-3');
  const reloaded = parseSaveText(saveText(save));
  expect(reloaded).toEqual(save);
  expect(latticeOf(reloaded.profile, 'stoker').shape.kind).toBe('growing');
  expect(compiledFor(reloaded.profile, 'stoker')).toEqual(before);
  expect(parseSaveText(saveText(reloaded))).toEqual(save);
});

test('distant signed and long connected pages import sparsely without a rectangle or chain cap', () => {
  const save = newSave(1);
  save.profile.lattices.draughtsman = [...DISTANT_PAGE];
  expect(parseSaveText(saveText(save))).toEqual(save);
  save.profile.lattices.draughtsman = straightPage(16_384);
  const reloaded = parseSaveText(saveText(save));
  expect(compiledFor(reloaded.profile, 'draughtsman').spells[0]?.path).toHaveLength(16_384);
});

describe('malformed coordinate identities are rejected atomically', () => {
  test.each([NaN, Infinity, 0.5, Number.MAX_SAFE_INTEGER + 1, MAX_LATTICE_COORD + 1])(
    'rejects coordinate %s',
    (x) => {
      const save = newSave(1);
      pageOf(save.profile, 'stoker')[0] = { at: { x, y: 0 }, rune: 'ink' };
      expect(() => parseSaveData(save)).toThrow('Not a valid save');
    },
  );
  test('rejects duplicate placements and inherited Glyph references', () => {
    const save = newSave(1);
    const first = pageOf(save.profile, 'stoker')[0];
    if (!first) throw new Error('expected starting rune');
    save.profile.lattices.stoker = [first, first];
    expect(() => parseSaveData(save)).toThrow('Not a valid save');
    for (const glyph of ['missing', 'toString', 'constructor', '__proto__']) {
      save.profile.lattices.stoker = [{ at: { x: -1, y: -1 }, glyph, dir: 'right' }];
      expect(() => parseSaveData(save)).toThrow('Not a valid save');
    }
  });
  test.each(['01,0', '-0,0', '+1,0', '1e2,0', '1,2,3', '9007199254740992,0'])(
    'rejects charge key %s',
    (bad) => {
      const save = newSave(1);
      save.trip = startTrip(save.profile, 1);
      save.trip.charges.stoker = { [bad]: 1 };
      expect(() => parseSaveData(save)).toThrow('Not a valid save');
    },
  );
  test('paper coordinates do not relax battle move or tile-aim bounds', () => {
    const save = newSave(1);
    save.trip = startTrip(save.profile, 1);
    for (const at of [
      { x: -1, y: 0 },
      { x: 99, y: 0 },
      { x: 0.1, y: 0 },
    ]) {
      save.trip.actions = [{ type: 'move', unit: 'stoker', to: at }];
      expect(() => parseSaveData(save)).toThrow('Not a valid save');
      save.trip.actions = [
        { type: 'cast', unit: 'stoker', spell: '1,0', aim: { kind: 'tile', at } },
      ];
      expect(() => parseSaveData(save)).toThrow('Not a valid save');
    }
  });
  test('rejects missing invention dependencies and cycles before compilation', () => {
    const save = newSave(1);
    save.profile.inventions = [
      {
        id: 'inv:a',
        name: 'A',
        method: 'bind',
        parts: ['inv:missing'],
        event: 'hit',
        solvent: null,
      },
    ];
    expect(() => parseSaveData(save)).toThrow('Not a valid save');
    const invention = save.profile.inventions[0];
    if (!invention) throw new Error('expected invention');
    invention.parts = ['inv:a'];
    expect(() => parseSaveData(save)).toThrow('Not a valid save');
  });
});

test('a resource refusal preserves storage and blocks ordinary game writes while exporting the original', () => {
  const text = ' '.repeat(IMPORT_POLICY.maxBytes + 1);
  const backend = memoryBackend(text);
  const loaded = loadSave(backend, 1);
  expect(loaded.recovered).toBe(false);
  expect(loaded.refused?.message).toMatch(/too large/);
  expect(backend.corrupt).toBeNull();
  const game = new GameStore(backend, () => 1);
  game.tapSocket({ x: 1, y: 0 });
  game.setProfile(newSave(2).profile);
  expect(game.setOut()).toMatch(/too large/);
  expect(backend.read()).toBe(text);
  expect(game.exportText()).toBe(text);
  expect(game.importText('bad')).toBe('Not a valid save');
  expect(backend.read()).toBe(text);
  expect(game.importText(saveText(newSave(3)))).toBeNull();
  expect(game.refusal).toBeNull();
  expect(parseSaveText(backend.read() ?? '')).toEqual(newSave(3));
});

test('save structure limits are distinct resource refusals before semantic decoding', () => {
  const cases: unknown[] = [{ slots: Array(IMPORT_POLICY.maxCollectionEntries + 1).fill(0) }];
  let nested: unknown = {};
  for (let i = 0; i < IMPORT_POLICY.maxDepth + 2; i++) nested = { child: nested };
  cases.push(nested);
  for (const data of cases)
    expect(() => parseSaveText(serialize(data))).toThrow(ResourceLimitError);
});

test('expensive Glyph argument validation charges the shared work budget before scanning', () => {
  const save: SaveData = newSave(1);
  save.profile.glyphs = [
    {
      id: 'large',
      name: 'Large',
      kind: 'payload',
      cells: Array.from({ length: 4_096 }, (_, x) => ({ at: { x, y: 0 }, rune: 'ink' })),
      entry: { x: 0, y: 0 },
      exits: [],
      idiom: null,
      version: 1,
      params: ['1,0'],
      extraExit: null,
    },
  ];
  save.profile.lattices.stoker = Array.from({ length: 256 }, (_, x) => ({
    at: { x, y: -2 },
    glyph: 'large',
    dir: 'right',
    args: { '1,0': { rune: 'oil' } },
  }));
  const backend = memoryBackend(saveText(save));
  expect(() => parseSaveText(backend.read() ?? '')).toThrow(ResourceLimitError);
  expect(loadSave(backend, 2).refused?.message).toMatch(/work/);
  expect(backend.corrupt).toBeNull();
});

test.each([7.5, -0.5, NaN, Infinity, '8', null])(
  'invalid envelope version %s is not an edition boundary',
  (version) => {
    expect(() => parseSaveText(JSON.stringify({ version, data: newSave(1) }))).toThrow(
      'Not a valid save',
    );
  },
);

test('valid saves at the byte boundary decode; one extra byte refuses before parsing', () => {
  const original = saveText(newSave(1));
  const text = original + ' '.repeat(IMPORT_POLICY.maxBytes - original.length);
  expect(parseSaveText(text)).toEqual(newSave(1));
  expect(() => parseSaveText(`${text} `)).toThrow(ResourceLimitError);
});

test('record-local keys remain identity-bearing data through a v9 reload', () => {
  const envelope = fixture('v9-home') as { data: SaveData };
  const record = Object.values(envelope.data.profile.glyphRecords)[0];
  if (!record) throw new Error('expected record');
  record.fired = { ...record.fired, '-500,600': 3 };
  const migrated = parseSaveText(serialize(envelope.data));
  expect(migrated).toEqual({
    ...envelope.data,
    profile: { ...envelope.data.profile, bindEvents: [], papers: [], pages: [] },
  });
  expect(parseSaveText(saveText(migrated))).toEqual(migrated);
});

test('Glyph cells, exits, args and record-local keys validate without moving or partially installing them', () => {
  const edit = (mutate: (save: SaveData) => void): void => {
    const envelope = fixture('v9-home') as { data: SaveData };
    mutate(envelope.data);
    const original = memoryBackend(saveText(newSave(9)));
    const game = new GameStore(original, () => 10);
    expect(game.importText(serialize(envelope.data))).toBe('Not a valid save');
    expect(parseSaveText(original.read() ?? '')).toEqual(newSave(9));
  };
  edit((s) => {
    const g = s.profile.glyphs[0];
    if (g?.cells[0]) g.cells = [...g.cells, g.cells[0]];
  });
  edit((s) => {
    const g = s.profile.glyphs[0];
    if (g) g.entry = { x: 500, y: 500 };
  });
  edit((s) => {
    const g = s.profile.glyphs[0];
    if (g) g.exits = [{ from: { x: 500, y: 500 }, dir: 'right' }];
  });
  edit((s) => {
    const g = s.profile.glyphs[0];
    if (g?.cells[1]) g.cells[1].rune = 'inv:missing';
  });
  edit((s) => {
    const g = s.profile.glyphs[0];
    if (g) g.params = ['01,0'];
  });
  edit((s) => {
    const rec = Object.values(s.profile.glyphRecords)[0];
    if (rec) rec.fired = { '01,0': 1 };
  });
  edit((s) => {
    s.profile.lattices.draughtsman = [
      { at: { x: 0, y: 0 }, glyph: 'g1', dir: 'right', args: { '1e0,0': { rune: 'ink' } } },
    ];
  });
  edit((s) => {
    s.profile.proof.draughtsman = [[{ at: { x: 0.5, y: 0 }, rune: 'ink' }]];
  });
});

test('v9 rejects duplicate Glyph cells as malformed identities', () => {
  const envelope = fixture('v9-home') as { data: SaveData };
  const g = envelope.data.profile.glyphs[0];
  if (!g?.cells[0]) throw new Error('expected Glyph');
  g.cells = [...g.cells, g.cells[0]];
  expect(() => parseSaveText(serialize(envelope.data))).toThrow('Not a valid save');
});
