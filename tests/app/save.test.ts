import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import { emptyStats, newSave, parseSaveData, startTrip, validateLoadout } from '$engine';
import {
  CURRENT_VERSION,
  type Migration,
  memoryBackend,
  migrate,
  parse,
  parseSaveText,
  saveText,
  serialize,
} from '../../src/app/save';

const steps: Migration[] = [
  (d) => ({ ...(d as object), ink: 10 }), // v0 → v1
  (d) => ({ ...(d as { ink: number }), ink: (d as { ink: number }).ink * 2 }), // v1 → v2
];

test('round-trips through text', () => {
  const text = serialize({ name: 'a' }, 2);
  expect(parse(text, steps)).toEqual({ version: 2, data: { name: 'a' } });
});

test('old saves are migrated step by step', () => {
  const old = serialize({ name: 'a' }, 0);
  expect(parse(old, steps)).toEqual({ version: 2, data: { name: 'a', ink: 20 } });
  expect(migrate({ version: 1, data: { ink: 5 } }, steps)).toEqual({
    version: 2,
    data: { ink: 10 },
  });
});

test('rejects garbage and saves from the future', () => {
  expect(() => parse('{"nope":1}', steps)).toThrow(/valid/);
  expect(() => parse(serialize({}, 9), steps)).toThrow(/newer/);
});

test('memoryBackend round-trips', () => {
  const b = memoryBackend();
  expect(b.read()).toBeNull();
  b.write('hello');
  expect(b.read()).toBe('hello');
  expect(memoryBackend('seed').read()).toBe('seed');
});

// ── Save v4 (glyph mastery, plan M37) ──

const fixtureText = readFileSync(
  new URL('../fixtures/glyph-mastery-save.json', import.meta.url),
  'utf8',
);

/** A v3 save as the game wrote it before glyph mastery: a Glyph, a live trip and a last trip with tallies. */
function v3Save(): string {
  const glyph = {
    id: 'g1',
    name: 'Strike',
    kind: 'spell',
    cells: [
      { at: { x: 0, y: 0 }, rune: 'bolt', dir: 'right' },
      { at: { x: 1, y: 0 }, rune: 'ink' },
      { at: { x: 2, y: 0 }, rune: 'spark' },
    ],
    entry: { x: 0, y: 0 },
    exits: [],
    idiom: null,
  };
  const save = newSave(3);
  const { glyphArchive: _a, glyphRecords: _r, drafts: _d, ...profile } = save.profile;
  const tally = { member: 'stoker', spell: '1,0', name: 'Spark', casts: 2, damage: 3, kills: 1 };
  const { elegance: _e, ...stats } = emptyStats();
  const trip = { ...startTrip(save.profile, 5), stats: { ...stats, spells: [tally] } };
  const lastTrip = {
    outcome: 'returned',
    encounter: 1,
    place: 'The scullery',
    stats: { ...stats, fights: 2, spells: [tally] },
  };
  return JSON.stringify({
    version: 3,
    data: { ...save, profile: { ...profile, glyphs: [glyph] }, trip, lastTrip },
  });
}

test('the current save version is 5', () => {
  expect(CURRENT_VERSION).toBe(5);
});

test('a v3 save migrates to v4: Glyph versions, empty records, archive and drafts, tally cells', () => {
  const env = parse(v3Save());
  expect(env.version).toBe(5);
  const save = parseSaveData(env.data);
  expect(save.profile.glyphs[0]).toMatchObject({
    id: 'g1',
    version: 1,
    params: [],
    extraExit: null,
  });
  expect(save.profile.glyphArchive).toEqual([]);
  expect(save.profile.glyphRecords).toEqual({});
  expect(save.profile.drafts).toEqual([]);
  for (const stats of [save.trip?.stats, save.lastTrip?.stats]) {
    expect(stats?.elegance).toEqual([]);
    expect(stats?.spells).toEqual([
      {
        member: 'stoker',
        spell: '1,0',
        name: 'Spark',
        casts: 2,
        damage: 3,
        kills: 1,
        cells: [],
        fired: [],
      },
    ]);
  }
});

test('a v3 save with no trip and no last trip migrates too', () => {
  const save = newSave(9);
  const { glyphArchive: _a, glyphRecords: _r, drafts: _d, ...profile } = save.profile;
  const text = JSON.stringify({ version: 3, data: { ...save, profile } });
  expect(parseSaveData(parse(text).data)).toEqual(save);
});

test('the glyph mastery fixture is a valid v4 save', () => {
  expect((JSON.parse(fixtureText) as { version: number }).version).toBe(4);
  expect(parse(fixtureText).version).toBe(5);
  const save = parseSaveText(fixtureText);
  expect(save.profile.glyphs.map((g) => `${g.id}@${g.version}`)).toEqual(['g1@2', 'g2@1', 'g3@1']);
  expect(save.profile.glyphArchive.map((g) => `${g.id}@${g.version}`)).toEqual(['g1@1']);
  expect(save.profile.glyphRecords['g1@2']?.best).toEqual({ economy: 2, reliability: 3 });
  expect(save.profile.glyphs[1]?.params).toEqual(['1,0']);
  expect(save.profile.drafts.map((d) => [d.id, d.repaired])).toEqual([
    ['lamplighter', true],
    ['collection', false],
  ]);
  const placed = save.profile.lattices.draughtsman.find((r) => 'glyph' in r && r.glyph === 'g2');
  expect(placed).toMatchObject({ args: { '1,0': { rune: 'steam' } } });
  expect(save.lastTrip?.stats.elegance).toHaveLength(1);
  // The fixture's pages are ready to set out with.
  expect(validateLoadout(save.profile)).toEqual({});
});

test('a v4 save round-trips through the save text unchanged', () => {
  const save = parseSaveText(fixtureText);
  expect(parseSaveText(saveText(save))).toEqual(save);
  expect(JSON.parse(saveText(save))).toEqual(parse(fixtureText));
});

// ── Save v5 (the city, K-5) ──

test('a v4 save migrates to v5: Seam trips and recaps, a Seam-only city', () => {
  const save = parseSaveText(fixtureText);
  expect(save.profile.city).toEqual({
    heard: ['seam'],
    open: ['seam'],
    hearts: [],
    solved: [],
    trips: 0,
    fresh: [],
  });
  expect(save.lastTrip?.district).toBe('seam');
  expect(save.lastTrip?.stats.heard).toEqual([]);
  const v4 = JSON.parse(fixtureText) as { data: Record<string, unknown> };
  const withTrip = {
    version: 4,
    data: { ...v4.data, trip: { ...startTrip(save.profile, 2), district: undefined } },
  };
  const trip = parseSaveText(JSON.stringify(withTrip)).trip;
  expect(trip?.district).toBe('seam');
  expect(trip?.stats.heard).toEqual([]);
});

test('the city fixture is a valid v5 save on a canal trip', () => {
  const text = readFileSync(new URL('../fixtures/city-save.json', import.meta.url), 'utf8');
  expect((JSON.parse(text) as { version: number }).version).toBe(5);
  const save = parseSaveText(text);
  expect(save.profile.city.open).toEqual(['seam', 'canals']);
  expect(save.trip?.district).toBe('canals');
  expect(save.trip?.encounter).toBe(1);
  expect(parseSaveText(saveText(save))).toEqual(save);
});
