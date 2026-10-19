import { expect, test } from 'vitest';
import {
  BURST_IDS,
  CODEX,
  COMPOUND_IDS,
  DISTRICT_IDS,
  DISTRICTS,
  ENCOUNTERS,
  ENEMIES,
  ENEMY_IDS,
  IDIOMS,
  LOOT_TABLES,
  MEMBER_IDS,
  MEMBERS,
  METHOD_IDS,
  METHODS,
  RUNE_IDS,
  RUNES,
  SOLVENT_IDS,
  START_KNOWN,
  TUNING,
} from '$data';
import { parseBoard, parseLattice } from '$engine';

test('31 runes, unique tokens', () => {
  expect(RUNE_IDS).toHaveLength(31);
  expect(new Set(RUNE_IDS.map((id) => RUNES[id].token)).size).toBe(31);
});

test('arrow iff source or bend', () => {
  for (const id of RUNE_IDS) {
    expect(RUNES[id].arrow, id).toBe(RUNES[id].role === 'source' || id === 'bend');
  }
});

test('sources have charges (bolt 5, splash 3, touch 6, vat 3)', () => {
  expect([RUNES.bolt, RUNES.splash, RUNES.touch, RUNES.vat].map((r) => r.charges)).toEqual([
    5, 3, 6, 3,
  ]);
});

test('every role has an ink cost (P33)', () => {
  for (const id of RUNE_IDS) expect(TUNING.inkCost[RUNES[id].role]).toBeGreaterThan(0);
  for (const id of METHOD_IDS) expect(METHODS[id].ink).toBeGreaterThan(0);
});

test('loot tables reference real runes, methods and solvents, at least 3 entries, positive weights', () => {
  for (const table of Object.values(LOOT_TABLES)) {
    expect(table.entries.length).toBeGreaterThanOrEqual(3);
    for (const e of table.entries) {
      expect(e.weight).toBeGreaterThan(0);
      if (e.spec.kind === 'rune') expect(RUNE_IDS).toContain(e.spec.rune);
      if (e.spec.kind === 'method') expect(METHOD_IDS).toContain(e.spec.method);
      if (e.spec.kind === 'solvent') expect(SOLVENT_IDS).toContain(e.spec.solvent);
    }
  }
});

test('the first evening knows the seven start runes (P35)', () => {
  expect([...START_KNOWN].sort()).toEqual(
    ['bolt', 'strike', 'shove', 'guard', 'ink', 'oil', 'spark'].sort(),
  );
});

test('codex has an entry per rune, method and idiom', () => {
  expect(CODEX).toHaveLength(
    RUNE_IDS.length +
      COMPOUND_IDS.length +
      BURST_IDS.length +
      METHOD_IDS.length +
      SOLVENT_IDS.length +
      IDIOMS.length,
  );
  expect(new Set(CODEX.map((e) => e.id)).size).toBe(CODEX.length);
  for (const id of RUNE_IDS) expect(CODEX.some((e) => e.id === `rune:${id}`)).toBe(true);
});

test('elites are sentry, eel, snuffer and the mother; minions the rest (P20)', () => {
  expect(ENEMY_IDS.filter((id) => ENEMIES[id].elite)).toEqual([
    'sentry',
    'eel',
    'snuffer',
    'mother',
  ]);
});

test('every district has an edge; the Seam and the canals are walled (P3)', () => {
  expect(DISTRICT_IDS).toHaveLength(7);
  for (const id of DISTRICT_IDS) expect(['wall', 'drop']).toContain(DISTRICTS[id].edge);
  expect([DISTRICTS.seam.edge, DISTRICTS.canals.edge]).toEqual(['wall', 'wall']);
  // The five other districts are on the map, being drawn: no rooms, never open (P2).
  for (const id of DISTRICT_IDS.slice(2)) {
    expect(DISTRICTS[id].encounters, id).toEqual([]);
    expect(DISTRICTS[id].gate.kind, id).toBe('drawing');
  }
});

test('canal rooms and the threshold room parse', () => {
  for (const enc of DISTRICTS.canals.encounters) {
    for (const v of enc.variants) expect(() => parseBoard(v.layout), v.name).not.toThrow();
  }
  const gate = DISTRICTS.canals.gate;
  if (gate.kind === 'threshold') expect(() => parseBoard(gate.room.board)).not.toThrow();
});

test('encounters: 4, depth 1..4, only last is heart with picks 2', () => {
  expect(ENCOUNTERS).toHaveLength(4);
  ENCOUNTERS.forEach((e, i) => {
    expect(e.depth).toBe(i + 1);
    expect(e.heart).toBe(i === 3);
    expect(e.picks).toBe(i === 3 ? 2 : 1);
  });
  expect(ENCOUNTERS[3]?.loot).toBe('heart');
});

/** Every board of every depth, labelled for failure messages. */
const VARIANTS = ENCOUNTERS.flatMap((e, i) =>
  e.variants.map((v, j) => ({ depth: i, label: `${e.id}/${v.name}`, index: j, ...v })),
);

test('every depth has 3 uniquely named variants and layout = variants[0]', () => {
  const names = new Set<string>();
  for (const e of ENCOUNTERS) {
    expect(e.variants, e.id).toHaveLength(3);
    expect(e.layout, e.id).toBe(e.variants[0]?.layout);
    for (const v of e.variants) {
      expect(v.name.trim(), e.id).not.toBe('');
      expect(names.has(v.name), v.name).toBe(false);
      names.add(v.name);
    }
    expect(new Set(e.variants.map((v) => v.layout)).size, e.id).toBe(3);
  }
});

test('dummy never in encounter layouts', () => {
  for (const v of VARIANTS) {
    const tokens = v.layout.split(/\s+/);
    expect(
      tokens.some((t) => t.startsWith('d')),
      v.label,
    ).toBe(false);
  }
});

test('encounter layouts parse to 6x8 with D and S', () => {
  for (const v of VARIANTS) {
    const b = parseBoard(v.layout);
    expect([b.width, b.height], v.label).toEqual([TUNING.grid.width, TUNING.grid.height]);
    const members = b.units.filter((u) => u.kind === 'member').map((u) => u.def);
    expect(members.sort(), v.label).toEqual(['draughtsman', 'stoker']);
  }
});

test('encounter enemy counts hold for every variant of a depth', () => {
  for (const v of VARIANTS) {
    const b = parseBoard(v.layout);
    const count = (def: string) => b.units.filter((u) => u.def === def).length;
    const got = [count('rat'), count('familiar'), count('sentry')];
    const want = [
      [3, 0, 0],
      [2, 1, 0],
      [2, 0, 1],
      [2, 1, 2],
    ][v.depth];
    expect(got, v.label).toEqual(want);
    if (v.depth === 2)
      expect(b.tiles.filter((t) => t.state?.id === 'slick').length, v.label).toBeGreaterThan(0);
    if (v.depth === 3) {
      expect(b.tiles.filter((t) => t.terrain.vent).length, v.label).toBeGreaterThanOrEqual(1);
      expect(b.tiles.filter((t) => t.state?.id === 'plate').length, v.label).toBeGreaterThanOrEqual(
        1,
      );
    }
  }
});

test('member start lattices match their shape (dims + holes)', () => {
  for (const id of MEMBER_IDS) {
    const shape = parseLattice(MEMBERS[id].shape).shape;
    const start = parseLattice(MEMBERS[id].startLattice);
    expect(start.shape, id).toEqual(shape);
    expect(start.runes.length, id).toBeGreaterThan(0);
  }
});
