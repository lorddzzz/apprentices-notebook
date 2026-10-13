import { expect, test } from 'vitest';
import {
  CODEX,
  ENCOUNTERS,
  INTERACTION_IDS,
  LOOT_TABLES,
  MEMBER_IDS,
  MEMBERS,
  RUNE_IDS,
  RUNES,
  TUNING,
} from '$data';
import { parseBoard, parseLattice } from '$engine';

test('20 runes, unique tokens', () => {
  expect(RUNE_IDS).toHaveLength(20);
  expect(Object.keys(RUNES)).toHaveLength(20);
  for (const id of RUNE_IDS) expect(RUNES[id].id).toBe(id);
  const tokens = RUNE_IDS.map((id) => RUNES[id].token);
  expect(new Set(tokens).size).toBe(20);
});

test('arrow iff source or bend', () => {
  for (const id of RUNE_IDS) {
    const r = RUNES[id];
    expect(r.arrow, id).toBe(r.family === 'source' || r.id === 'bend');
  }
});

test('sources have charges (bolt 5, splash 3, ward 3)', () => {
  expect(RUNES.bolt.charges).toBe(5);
  expect(RUNES.splash.charges).toBe(3);
  expect(RUNES.ward.charges).toBe(3);
  for (const id of RUNE_IDS) {
    if (RUNES[id].family !== 'source') expect(RUNES[id].charges, id).toBe(0);
  }
});

test('every family has an ink cost', () => {
  for (const id of RUNE_IDS) expect(TUNING.inkCost[RUNES[id].family]).toBeGreaterThan(0);
});

test('loot tables reference real runes, at least 3 entries, positive weights', () => {
  for (const table of Object.values(LOOT_TABLES)) {
    expect(table.entries.length).toBeGreaterThanOrEqual(3);
    for (const e of table.entries) {
      expect(e.weight).toBeGreaterThan(0);
      if (e.spec.kind === 'rune') expect(RUNE_IDS).toContain(e.spec.rune);
    }
  }
});

test('codex has an entry per rune and per interaction', () => {
  expect(CODEX).toHaveLength(RUNE_IDS.length + INTERACTION_IDS.length);
  expect(CODEX).toHaveLength(27);
  for (const id of RUNE_IDS) expect(CODEX.some((c) => c.id === `rune:${id}`)).toBe(true);
  for (const id of INTERACTION_IDS)
    expect(CODEX.some((c) => c.id === `interaction:${id}`)).toBe(true);
  expect(new Set(CODEX.map((c) => c.id)).size).toBe(CODEX.length);
  for (const c of CODEX) expect(c.ownerNote.length).toBeGreaterThan(0);
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

test('dummy never in encounter layouts', () => {
  for (const e of ENCOUNTERS) {
    const tokens = e.layout.split(/\s+/);
    expect(
      tokens.some((t) => t.startsWith('d')),
      e.id,
    ).toBe(false);
  }
});

test('encounter layouts parse to 6x8 with D and S', () => {
  for (const e of ENCOUNTERS) {
    const b = parseBoard(e.layout);
    expect([b.width, b.height], e.id).toEqual([TUNING.grid.width, TUNING.grid.height]);
    const members = b.units.filter((u) => u.kind === 'member').map((u) => u.def);
    expect(members.sort(), e.id).toEqual(['draughtsman', 'stoker']);
  }
});

test('encounter enemy counts', () => {
  const count = (i: number, def: string) =>
    parseBoard(ENCOUNTERS[i]?.layout ?? '').units.filter((u) => u.def === def).length;
  const oil = (i: number) =>
    parseBoard(ENCOUNTERS[i]?.layout ?? '').tiles.filter((t) => t.oil).length;
  const tiles = (i: number) => parseBoard(ENCOUNTERS[i]?.layout ?? '').tiles;

  expect([count(0, 'rat'), count(0, 'familiar'), count(0, 'sentry')]).toEqual([3, 0, 0]);
  expect([count(1, 'rat'), count(1, 'familiar'), count(1, 'sentry')]).toEqual([2, 1, 0]);
  expect([count(2, 'rat'), count(2, 'familiar'), count(2, 'sentry')]).toEqual([2, 0, 1]);
  expect(oil(2)).toBeGreaterThan(0);
  expect([count(3, 'rat'), count(3, 'familiar'), count(3, 'sentry')]).toEqual([2, 1, 2]);
  expect(tiles(3).filter((t) => t.vent).length).toBeGreaterThanOrEqual(1);
  expect(tiles(3).filter((t) => t.plate).length).toBeGreaterThanOrEqual(1);
});

test('member start lattices match their shape (dims + holes)', () => {
  for (const id of MEMBER_IDS) {
    const shape = parseLattice(MEMBERS[id].shape).shape;
    const start = parseLattice(MEMBERS[id].startLattice);
    expect(start.shape, id).toEqual(shape);
    expect(start.runes.length, id).toBeGreaterThan(0);
  }
});
