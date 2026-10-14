import { expect, test } from 'vitest';
import { ENCOUNTERS, RUNE_IDS } from '$data';
import type { GlyphDef } from '$engine';
import {
  beginEncounter,
  deriveSeed,
  finishEncounter,
  newProfile,
  newSave,
  nextTripSeed,
  parseSaveData,
  pickLoot,
  type SaveData,
  startTrip,
} from '$engine';
import { CURRENT_VERSION, parse, serialize } from '../../src/app/save';

const json = (v: unknown): unknown => JSON.parse(JSON.stringify(v));

/** A plain-JSON copy of `base` with the value at a dotted path replaced (undefined removes it). */
function poke(base: unknown, path: string, value: unknown): unknown {
  const root = json(base) as Record<string, unknown>;
  const keys = path.split('.');
  const last = keys.pop() as string;
  let cur = root;
  for (const k of keys) cur = cur[k] as Record<string, unknown>;
  if (value === undefined) delete cur[last];
  else cur[last] = value;
  return root;
}

test('SaveData round-trips through src/app/save serialize/parse at version 2', () => {
  const profile = newProfile();
  const trip = startTrip(profile, 7);
  const b = structuredClone(beginEncounter(profile, trip).state);
  b.phase = 'won';
  for (const u of b.units) if (u.kind === 'enemy') u.hp = 0;
  const won = finishEncounter(profile, trip, b);
  if (!won.trip) throw new Error('expected a trip');
  const save: SaveData = {
    profile: won.profile,
    trip: pickLoot(won.trip, 0),
    seedCounter: 3,
    lastTrip: null,
  };
  expect(CURRENT_VERSION).toBe(3);
  const env = parse(serialize(save));
  expect(env.version).toBe(3);
  expect(parseSaveData(env.data)).toEqual(save);

  const fresh = newSave(99);
  expect(parseSaveData(parse(serialize(fresh)).data)).toEqual(fresh);
});

test('newSave starts without a trip', () => {
  const s = newSave(5);
  expect(s.trip).toBeNull();
  expect(s.seedCounter).toBe(5);
  expect(s.profile).toEqual(newProfile());
});

test('nextTripSeed is deterministic and advances the counter', () => {
  const s = newSave(5);
  const a = nextTripSeed(s);
  expect(a.seed).toBe(deriveSeed(5, 0));
  expect(a.save.seedCounter).toBe(6);
  expect(s.seedCounter).toBe(5);
  expect(nextTripSeed(s).seed).toBe(a.seed);
  expect(nextTripSeed(a.save).seed).not.toBe(a.seed);
});

test('parseSaveData rejects garbage', () => {
  for (const junk of [null, 5, 'x', [], {}, { profile: 1 }]) {
    expect(() => parseSaveData(junk)).toThrow('Not a valid save');
  }
  const base = newSave(1);
  const stoker = 'profile.lattices.stoker';
  const cases: [string, unknown][] = [
    ['seedCounter', -1],
    ['profile.collection.bolt', 'many'],
    ['profile.inkCapacity.stoker', undefined],
    ['profile.interactions', ['teleport']],
    [stoker, [{ at: { x: 0, y: 0 }, rune: 'bolt', dir: 'right' }]], // a hole
    [stoker, [{ at: { x: 1, y: 1 }, rune: 'nope' }]],
    [stoker, [{ at: { x: 1, y: 1 }, rune: 'bolt' }]], // arrow missing
    ['trip', { seed: 1, encounter: 9, status: 'fight' }],
  ];
  for (const [path, value] of cases) {
    expect(() => parseSaveData(poke(base, path, value))).toThrow('Not a valid save');
  }
});

test('parseSaveData rejects a malformed trip', () => {
  const save = newSave(1);
  const trip = startTrip(save.profile, 1);
  const raw = (t: unknown) => poke(save, 'trip', t);
  expect(parseSaveData(raw(trip)).trip).toEqual(trip);
  expect(() => parseSaveData(raw({ ...trip, status: 'dancing' }))).toThrow('Not a valid save');
  expect(() => parseSaveData(raw({ ...trip, hp: { draughtsman: 1 } }))).toThrow('Not a valid save');
  expect(() => parseSaveData(raw({ ...trip, loot: [{ kind: 'gold' }] }))).toThrow(
    'Not a valid save',
  );
});

test('missing rune keys default to 0', () => {
  const parsed = parseSaveData(poke(newSave(1), 'profile.collection', { bolt: 3 }));
  expect(parsed.profile.collection.bolt).toBe(3);
  for (const id of RUNE_IDS) {
    if (id !== 'bolt') expect(parsed.profile.collection[id]).toBe(0);
  }
  expect(Object.keys(parsed.profile.collection)).toHaveLength(RUNE_IDS.length);
});

test('parseSaveData refuses trip states that could not move on', () => {
  const save = newSave(1);
  const trip = startTrip(save.profile, 1);
  const raw = (t: unknown) => poke(save, 'trip', t);
  const heart = ENCOUNTERS.findIndex((e) => e.heart);
  const bad = [
    { ...trip, status: 'looting', offers: [], picksLeft: 1 },
    { ...trip, status: 'looting', offers: [{ kind: 'vellum', amount: 1 }], picksLeft: 0 },
    { ...trip, status: 'crossroads', encounter: heart },
    { ...trip, status: 'cleared', encounter: 0 },
    { ...trip, hp: { draughtsman: 0, stoker: 5 } },
    { ...trip, status: 'crossroads', actions: [{ type: 'endTurn' }] },
    { ...trip, actions: [{ type: 'teleport' }] },
    { ...trip, actions: [{ type: 'cast', unit: 'stoker', spell: '0,0', aim: { kind: 'up' } }] },
  ];
  for (const t of bad) expect(() => parseSaveData(raw(t))).toThrow('Not a valid save');
});

test('recorded battle actions survive the save text', () => {
  const save = newSave(1);
  const trip = {
    ...startTrip(save.profile, 1),
    actions: [
      { type: 'move', unit: 'stoker', to: { x: 1, y: 2 } },
      { type: 'cast', unit: 'stoker', spell: '0,0', aim: { kind: 'tile', at: { x: 2, y: 2 } } },
      { type: 'shove', unit: 'draughtsman', dir: 'left' },
      { type: 'undoMove', unit: 'draughtsman' },
      { type: 'endTurn' },
    ],
  } as const;
  expect(parseSaveData(parse(serialize({ ...save, trip })).data).trip).toEqual(trip);
});

test('a version 0 save migrates: its trip gets an empty action list', () => {
  const save = newSave(1);
  const { actions: _, ...v0trip } = startTrip(save.profile, 1);
  const text = JSON.stringify({ version: 0, data: { ...save, trip: v0trip } });
  const env = parse(text);
  expect(env.version).toBe(3);
  expect(parseSaveData(env.data).trip?.actions).toEqual([]);
  expect(parseSaveData(parse(JSON.stringify({ version: 0, data: save })).data)).toEqual(save);
});

/** A v1 save as the old game wrote it: research points, a pending trip with research loot. */
function v1Save(): unknown {
  const save = poke(newSave(1), 'trip', null) as { profile: Record<string, unknown> };
  const {
    solvents: _s,
    vellum: _v,
    bench: _b,
    glyphs: _g,
    proof: _p,
    idioms: _i,
    ...old
  } = save.profile;
  const trip = {
    ...startTrip(newProfile(), 1),
    status: 'looting',
    loot: [
      { kind: 'research', amount: 2 },
      { kind: 'rune', rune: 'echo' },
    ],
    offers: [
      { kind: 'research', amount: 1 },
      { kind: 'ink', member: 'stoker', amount: 2 },
    ],
    picksLeft: 1,
  };
  return { version: 1, data: { ...save, profile: { ...old, research: 4 }, trip } };
}

test('a version 1 save migrates: research becomes solvents round-robin', () => {
  const env = parse(JSON.stringify(v1Save()));
  expect(env.version).toBe(3);
  const parsed = parseSaveData(env.data);
  expect(parsed.profile.solvents).toMatchObject({ gallnut: 2, pitch: 1, cinder: 1, chalk: 0 });
  expect(parsed.profile.vellum).toBe(0);
  expect(parsed.profile.bench).toEqual({ trials: [], known: [] });
  expect(parsed.profile.glyphs).toEqual([]);
  expect(parsed.profile.proof).toEqual({ draughtsman: [], stoker: [] });
  expect(parsed.profile.idioms).toEqual([]);
  expect('research' in parsed.profile).toBe(false);
  // the counter continues after the 4 banked points: loot gets pitch, cinder; the offer gets gallnut
  expect(parsed.trip?.loot).toEqual([
    { kind: 'solvent', solvent: 'pitch' },
    { kind: 'solvent', solvent: 'cinder' },
    { kind: 'rune', rune: 'echo' },
  ]);
  expect(parsed.trip?.offers).toEqual([
    { kind: 'solvent', solvent: 'gallnut' },
    { kind: 'ink', member: 'stoker', amount: 2 },
  ]);
});

test('parseSaveData rejects malformed v2 fields', () => {
  const base = newSave(1);
  const glyph: GlyphDef = {
    id: 'g1',
    name: 'Kindle',
    kind: 'spell',
    cells: [{ at: { x: 0, y: 0 }, rune: 'spark' }],
    entry: { x: 0, y: 0 },
    exits: [],
    idiom: null,
  };
  const withGlyph = poke(base, 'profile.glyphs', [glyph]);
  expect(parseSaveData(withGlyph).profile.glyphs).toEqual([glyph]);
  const cases: [string, unknown][] = [
    ['profile.solvents.gallnut', -1],
    ['profile.solvents.gallnut', 'two'],
    ['profile.solvents', { sand: 1 }],
    ['profile.vellum', undefined],
    ['profile.vellum', 1.5],
    ['profile.bench.trials', [3]],
    ['profile.bench.known', ['not-a-recipe']],
    ['profile.glyphs', [{ ...glyph, kind: 'wall' }]],
    ['profile.glyphs', [{ ...glyph, cells: [{ at: { x: 0, y: 0 }, rune: 'nope' }] }]],
    ['profile.glyphs', [{ ...glyph, entry: 'here' }]],
    ['profile.glyphs', [{ ...glyph, exits: [{ from: { x: 0, y: 0 }, dir: 'sideways' }] }]],
    ['profile.glyphs', [{ ...glyph, idiom: 'nonsense' }]],
    ['profile.glyphs', [glyph, glyph]],
    ['profile.proof.stoker', [[{ at: { x: 1, y: 1 }, rune: 'nope' }]]],
    ['profile.proof.stoker', [[{ at: { x: 1, y: 1 }, rune: 'bolt', dir: 'sideways' }]]],
    ['profile.proof.stoker', [{ at: { x: 1, y: 1 }, rune: 'bolt' }]],
    ['profile.idioms', ['nonsense']],
    ['profile.lattices.stoker', [{ at: { x: 1, y: 1 }, glyph: 'ghost', dir: 'right' }]],
  ];
  for (const [path, value] of cases) {
    expect(() => parseSaveData(poke(base, path, value)), path + JSON.stringify(value)).toThrow(
      'Not a valid save',
    );
  }
});

test('v2 fields round-trip, and a lattice Glyph needs a library entry', () => {
  const glyph: GlyphDef = {
    id: 'g1',
    name: 'Kindle',
    kind: 'spell',
    cells: [{ at: { x: 0, y: 0 }, rune: 'spark', dir: 'right' }],
    entry: { x: 0, y: 0 },
    exits: [{ from: { x: 0, y: 0 }, dir: 'right' }],
    idiom: null,
  };
  const p = newProfile();
  const profile = {
    ...p,
    solvents: { ...p.solvents, pitch: 3 },
    vellum: 2,
    bench: { trials: ['ink+oil+pitch'], known: ['smear'] },
    glyphs: [glyph],
    proof: {
      ...p.proof,
      stoker: [[{ at: { x: 1, y: 1 }, rune: 'bolt' as const, dir: 'right' as const }]],
    },
    idioms: [],
    lattices: {
      ...p.lattices,
      stoker: [{ at: { x: 1, y: 1 }, glyph: 'g1', dir: 'right' as const }],
    },
  };
  const save: SaveData = { profile, trip: null, seedCounter: 1, lastTrip: null };
  expect(parseSaveData(parse(serialize(save)).data)).toEqual(save);
});

test('a version 2 save with a live trip loads with empty stats and no last trip', () => {
  const save = newSave(1);
  const { stats: _s, ...v2trip } = startTrip(save.profile, 1);
  const { lastTrip: _l, ...v2save } = save;
  const text = JSON.stringify({ version: 2, data: { ...v2save, trip: v2trip } });
  const env = parse(text);
  expect(env.version).toBe(CURRENT_VERSION);
  const parsed = parseSaveData(env.data);
  expect(parsed.trip?.stats).toEqual({
    fights: 0,
    spells: [],
    biggestChain: null,
    discoveries: [],
    proofCasts: 0,
  });
  expect(parsed.lastTrip).toBeNull();
  // no trip at all also loads
  const home = parse(JSON.stringify({ version: 2, data: { ...v2save, trip: null } }));
  expect(parseSaveData(home.data).lastTrip).toBeNull();
});

test('a last trip with stats round-trips through the save text', () => {
  const stats = {
    fights: 2,
    spells: [
      { member: 'stoker' as const, spell: '1,0', name: 'Spark', casts: 3, damage: 6, kills: 1 },
    ],
    biggestChain: { member: 'stoker' as const, spell: '1,0', name: 'Spark', reactions: 3 },
    discoveries: ['interaction:ignite'],
    proofCasts: 2,
  };
  const save: SaveData = {
    ...newSave(1),
    lastTrip: { outcome: 'wiped', encounter: 1, place: 'The scullery', stats },
  };
  expect(parseSaveData(parse(serialize(save)).data)).toEqual(save);
});
