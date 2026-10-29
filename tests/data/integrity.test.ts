import { expect, test } from 'vitest';
import {
  BURST_IDS,
  CODEX,
  COMPOUND_IDS,
  DISTRICT_IDS,
  DISTRICTS,
  type DistrictId,
  ENCOUNTERS,
  ENEMIES,
  ENEMY_IDS,
  HABITS,
  IDIOMS,
  LOOT_TABLES,
  MEMBER_IDS,
  MEMBERS,
  METHOD_IDS,
  METHODS,
  RECRUITS,
  RUNE_IDS,
  RUNES,
  type RuneId,
  SOLVENT_IDS,
  START_KNOWN,
  TUNING,
} from '$data';
import { DISTRICT_KIT } from '$data/districts/index';
import { BASIC_ACTIONS, parseBoard, parseLattice } from '$engine';
import { preconditionsOf } from '$engine/recruits';
import { checkRoom } from '$engine/rooms';

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
    'lamplighter',
  ]);
});

test('every district has an edge; the Seam and the canals are walled (P3)', () => {
  expect(DISTRICT_IDS).toHaveLength(7);
  for (const id of DISTRICT_IDS) expect(['wall', 'drop']).toContain(DISTRICTS[id].edge);
  expect([DISTRICTS.seam.edge, DISTRICTS.canals.edge]).toEqual(['wall', 'wall']);
  // The five other districts are on the map, being drawn: no rooms, never open (P2).
  for (const id of DISTRICT_IDS.slice(2)) {
    expect(DISTRICTS[id].rooms, id).toEqual([]);
    expect(DISTRICTS[id].gate.kind, id).toBe('drawing');
  }
});

test('canal rooms and the threshold room parse', () => {
  for (const enc of DISTRICTS.canals.rooms) {
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

test('encounter layouts parse to 6x8 with start points and no fixed apprentice (HC P9)', () => {
  for (const v of VARIANTS) {
    const b = parseBoard(v.layout);
    expect([b.width, b.height], v.label).toEqual([TUNING.grid.width, TUNING.grid.height]);
    expect(
      b.units.filter((u) => u.kind === 'member'),
      v.label,
    ).toEqual([]);
    expect(b.starts.length, v.label).toBeGreaterThanOrEqual(4);
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

test('every room layout passes checkRoom: start points (P) only, no apprentice tokens', () => {
  const rooms: [string, string][] = [];
  for (const e of Object.values(ENCOUNTERS)) {
    for (const v of e.variants) rooms.push([`${e.id}/${v.name}`, v.layout]);
  }
  for (const d of DISTRICT_IDS) {
    for (const e of DISTRICTS[d].rooms) {
      for (const v of e.variants) rooms.push([`${d}/${e.id}/${v.name}`, v.layout]);
    }
  }
  expect(rooms.length).toBeGreaterThanOrEqual(27);
  for (const [name, layout] of rooms) {
    expect(checkRoom(layout), name).toEqual([]);
  }
  // The canal lock still fields the pair on fixed tiles until HC-5 lays its start points (P10).
});

// ── Recruit placement (recruitment plan RC-5, P8/P9, §6 static) ──────────────────────────────
const RECRUIT_IDS = Object.keys(RECRUITS) as (keyof typeof RECRUITS)[];
/** The Seam's own precondition pages (§0d): guaranteed in its deep and heart rooms (P6). */
const SEAM_PAGES: readonly RuneId[] = ['touch', 'splash', 'steam', 'brass'];
/** Door arrivals whose Board pages come from a district still being drawn (party.md §2: Cartographers). */
const PAGES_FROM_DRAWN: Readonly<Record<string, DistrictId>> = { exile: 'cartographers' };

const placements = DISTRICT_IDS.flatMap((d) =>
  (DISTRICT_KIT[d]?.recruit ?? []).map((r) => ({ district: d, ...r })),
);
const placedIn = (id: string): DistrictId | undefined =>
  placements.find((r) => r.apprentice === id)?.district;
const seamHasDeepRooms = DISTRICTS.seam.rooms.some((e) => e.loot === 'deep' || e.loot === 'heart');

/** Whether `rune` has a guarantee source for `id`: the Seam's rooms, or her district's pages line. */
function sourced(id: keyof typeof RECRUITS, rune: RuneId, landmark: number): boolean {
  if (START_KNOWN.includes(rune)) return true;
  if (SEAM_PAGES.includes(rune)) return seamHasDeepRooms;
  const found = RECRUITS[id].found;
  if (!('district' in found)) return false;
  return (DISTRICT_KIT[found.district]?.recruitPages ?? []).some(
    (l) =>
      l.for === id &&
      l.rooms.length > 0 &&
      l.rooms.every((r) => r >= 0 && r <= landmark) &&
      l.rooms.some((r) => r < landmark) &&
      ('runes' in l ? l.runes : l.any).includes(rune),
  );
}

test('every placement: a real recruit, a real room in a district that opens, once (P8)', () => {
  expect(new Set(placements.map((r) => r.apprentice)).size).toBe(placements.length);
  for (const r of placements) {
    const def = RECRUITS[r.apprentice as keyof typeof RECRUITS];
    expect(def, r.apprentice).toBeDefined();
    expect(def.found, r.apprentice).toEqual({ district: r.district });
    expect(DISTRICTS[r.district].gate.kind, r.district).not.toBe('drawing');
    expect(r.room, r.apprentice).toBeGreaterThanOrEqual(0);
    expect(r.room, r.apprentice).toBeLessThan(DISTRICTS[r.district].rooms.length);
  }
});

test('every recruit page line belongs to a recruit of that district, in rooms up to the landmark', () => {
  for (const d of DISTRICT_IDS) {
    for (const l of DISTRICT_KIT[d]?.recruitPages ?? []) {
      const id = l.for as keyof typeof RECRUITS;
      expect(RECRUITS[id].found, `${d}/${id}`).toEqual({ district: d });
      const landmark = placements.find((r) => r.apprentice === id)?.room;
      expect(landmark, `${d}/${id} has a landmark`).toBeDefined();
      expect(l.rooms.length, `${d}/${id}`).toBeGreaterThan(0);
      for (const room of l.rooms) {
        expect(room, `${d}/${id}`).toBeGreaterThanOrEqual(0);
        expect(room, `${d}/${id} before the landmark`).toBeLessThanOrEqual(landmark ?? -1);
      }
    }
  }
});

test('every placed recruit: each precondition rune has a guarantee source, one room before the landmark at least', () => {
  for (const r of placements) {
    const id = r.apprentice as keyof typeof RECRUITS;
    const { all, any } = preconditionsOf(id).runes;
    for (const rune of all) expect(sourced(id, rune, r.room), `${id}/${rune}`).toBe(true);
    if (any)
      expect(
        any.some((x) => sourced(id, x, r.room)),
        `${id} any`,
      ).toBe(true);
  }
});

test('every placed recruit has her habit and her basic action implemented (P9)', () => {
  for (const r of placements) {
    const def = RECRUITS[r.apprentice as keyof typeof RECRUITS];
    expect(HABITS[def.habit], `${def.id} habit`).toBeDefined();
    expect(BASIC_ACTIONS[def.action], `${def.id} action`).toBeDefined();
  }
});

test('an unplaced district recruit belongs to a district still being drawn (P9)', () => {
  for (const id of RECRUIT_IDS) {
    const found = RECRUITS[id].found;
    if (!('district' in found) || placedIn(id)) continue;
    expect(DISTRICTS[found.district].gate.kind, `${id} / ${found.district}`).toBe('drawing');
  }
});

test('every door arrival: her pages come from the Seam, a placed page, or a district being drawn', () => {
  const pageSources = DISTRICT_IDS.flatMap((d) =>
    (DISTRICT_KIT[d]?.recruitPages ?? []).map((l) => l),
  );
  for (const id of RECRUIT_IDS) {
    if (!('door' in RECRUITS[id].found)) continue;
    const { all, any } = preconditionsOf(id).runes;
    for (const rune of [...all, ...(any?.slice(0, 1) ?? [])]) {
      if (START_KNOWN.includes(rune) || SEAM_PAGES.includes(rune)) continue;
      const placed = pageSources.some((l) => ('runes' in l ? l.runes : l.any).includes(rune));
      const waits = PAGES_FROM_DRAWN[id];
      const drawn = waits !== undefined && DISTRICTS[waits].gate.kind === 'drawing';
      expect(placed || drawn, `${id}/${rune}`).toBe(true);
    }
  }
});
