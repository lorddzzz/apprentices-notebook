import { expect, test } from 'vitest';
import { ENCOUNTERS } from '$data';
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
  type Trip,
} from '$engine';

/** Save data as the engine parses it (Profile v7, P1). The version envelope is `src/app/save.ts`'s. */

const json = (v: unknown): unknown => JSON.parse(JSON.stringify(v));
const roundTrip = (save: SaveData): SaveData => parseSaveData(json(save));

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

test('SaveData round-trips through JSON', () => {
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
  expect(roundTrip(save)).toEqual(save);
  const fresh = newSave(99);
  expect(roundTrip(fresh)).toEqual(fresh);
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

test('parseSaveData rejects garbage and malformed current fields', () => {
  for (const junk of [null, 5, 'x', [], {}, { profile: 1 }]) {
    expect(() => parseSaveData(junk)).toThrow('Not a valid save');
  }
  const base = newSave(1);
  const stoker = 'profile.lattices.stoker';
  const cases: [string, unknown][] = [
    ['seedCounter', -1],
    ['profile.known', ['teleport']],
    ['profile.known', undefined],
    ['profile.methods', ['juggle']],
    ['profile.inventions', [{ id: 'recoil', name: 'R', method: 'bind', parts: [], solvent: null }]],
    [
      'profile.inventions',
      [{ id: 'inv:r', name: 'R', method: 'bind', parts: ['zap'], solvent: null }],
    ],
    ['profile.witnessed', ['not a line']],
    ['profile.foesMet', ['dragon']],
    ['profile.footnotes', { zap: { points: 1, chosen: {} } }],
    ['profile.ink', undefined],
    ['profile.ink', -1],
    ['profile.household', undefined],
    ['profile.household.members', []],
    ['profile.household.members', ['draughtsman', 'draughtsman', 'stoker']],
    ['profile.household.members', ['draughtsman', 'ghost']],
    ['profile.household.members', ['draughtsman']], // the Stoker's page is left over
    ['profile.household.slots', ['stoker', 'stoker', null]],
    ['profile.household.slots', ['draughtsman', null]],
    ['profile.lattices.stoker', undefined],
    ['profile.proof.stoker', undefined],
    ['profile.collection', undefined], // fine: ignored
    [stoker, [{ at: { x: 1, y: 1 }, rune: 'nope' }]],
    [stoker, [{ at: { x: 1, y: 1 }, rune: 'bolt' }]], // arrow missing
    ['trip', { seed: 1, encounter: 9, status: 'fight' }],
  ];
  for (const [path, value] of cases) {
    const parse = () => parseSaveData(poke(base, path, value));
    if (path === 'profile.collection') expect(parse).not.toThrow();
    else expect(parse, path).toThrow('Not a valid save');
  }
});

test('an older notebook (v6 profile) does not parse: the app starts fresh (P1)', () => {
  const v6 = poke(newSave(1), 'profile.known', undefined);
  expect(() => parseSaveData(poke(v6, 'profile.collection', { bolt: 2 }))).toThrow(
    'Not a valid save',
  );
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
  expect(() => parseSaveData(raw({ ...trip, loot: [{ kind: 'draft', draft: 'x' }] }))).toThrow(
    'Not a valid save',
  );
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
    { ...trip, actions: [{ type: 'cast', unit: 'stoker', spell: '0,0', aim: { kind: 'ally' } }] },
  ];
  for (const t of bad) expect(() => parseSaveData(raw(t))).toThrow('Not a valid save');
});

test('recorded battle actions survive the save data, a Touch on yourself included', () => {
  const save = newSave(1);
  const trip: Trip = {
    ...startTrip(save.profile, 1),
    actions: [
      { type: 'move', unit: 'stoker', to: { x: 1, y: 2 } },
      { type: 'cast', unit: 'stoker', spell: '0,0', aim: { kind: 'tile', at: { x: 2, y: 2 } } },
      { type: 'cast', unit: 'stoker', spell: '1,0', aim: { kind: 'self' } },
      { type: 'shove', unit: 'draughtsman', dir: 'left' },
      { type: 'undoMove', unit: 'draughtsman' },
      { type: 'endTurn' },
    ],
  };
  expect(roundTrip({ ...save, trip }).trip).toEqual(trip);
});

test('v7 fields round-trip, and a lattice Glyph needs a library entry', () => {
  const glyph: GlyphDef = {
    id: 'g1',
    name: 'Kindle',
    kind: 'spell',
    cells: [
      { at: { x: 0, y: 0 }, rune: 'bolt', dir: 'right' },
      { at: { x: 1, y: 0 }, rune: 'inv:recoil' },
    ],
    entry: { x: 0, y: 0 },
    exits: [{ from: { x: 1, y: 0 }, dir: 'right' }],
    idiom: null,
    version: 1,
    params: [],
    extraExit: null,
  };
  const p = newProfile();
  const profile = {
    ...p,
    known: [...p.known, 'vat' as const],
    methods: ['bind' as const],
    inventions: [
      {
        id: 'inv:recoil' as const,
        name: 'Recoil',
        method: 'bind' as const,
        parts: ['shove' as const],
        event: 'hit' as const,
        solvent: 'gallnut' as const,
      },
    ],
    solvents: { ...p.solvents, pitch: 3 },
    witnessed: ['shove:edge' as const],
    named: ['compound:stain'],
    met: ['slick' as const, 'elite' as const],
    foesMet: ['rat' as const],
    footnotes: { shove: { points: 4, chosen: { 'shove:edge': 'A' } } },
    vellum: 2,
    glyphs: [glyph],
    proof: {
      ...p.proof,
      stoker: [[{ at: { x: 1, y: 1 }, rune: 'bolt' as const, dir: 'right' as const }]],
    },
    lattices: {
      ...p.lattices,
      stoker: [{ at: { x: 1, y: 1 }, glyph: 'g1', dir: 'right' as const }],
    },
  };
  const save: SaveData = { profile, trip: null, seedCounter: 1, lastTrip: null };
  expect(roundTrip(save)).toEqual(save);
  expect(() => parseSaveData(poke(save, 'profile.glyphs', []))).toThrow('Not a valid save');
});

test('a last trip with stats round-trips', () => {
  const stats = {
    fights: 2,
    spells: [
      {
        member: 'stoker' as const,
        spell: '1,0',
        name: 'Spark',
        casts: 3,
        damage: 6,
        kills: 1,
        cells: ['1,0', '1,1', '1,2'],
        fired: ['1,0', '1,1'],
      },
    ],
    biggestChain: { member: 'stoker' as const, spell: '1,0', name: 'Spark', reactions: 3 },
    discoveries: ['compound:stain'],
    proofCasts: 2,
    elegance: [
      { glyph: 'g1', name: 'Kindle', version: 2, metric: 'reliability' as const, tier: 2 as const },
    ],
    heard: [],
  };
  const save: SaveData = {
    ...newSave(1),
    lastTrip: { district: 'seam', outcome: 'wiped', encounter: 1, place: 'The scullery', stats },
  };
  expect(roundTrip(save)).toEqual(save);
});
