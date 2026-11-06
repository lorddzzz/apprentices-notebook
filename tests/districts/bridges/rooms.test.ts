import { describe, expect, test } from 'vitest';
import { LOOT_TABLES } from '$data';
import {
  BRIDGE_ROOMS_12,
  BRIDGES_KIT,
  HOLD_GUARANTEE_ROOMS,
  spanVariantPool,
} from '$data/districts/bridges';
import { BRIDGE_TUNING, type SpanKind } from '$data/districts/bridges/types';
import { compiledFor, createBattle, FOUNDERS, newProfile, type Trip } from '$engine';
import { HOLD_GUARANTEE } from '$engine/districts/bridges/guarantee';
import { cracksOf } from '$engine/districts/bridges/support';
import { type BridgesState, COLLAPSE_RULE_ID } from '$engine/districts/bridges/types';
import { parseBoard } from '$engine/notation';
import { checkRoom } from '$engine/rooms';

/** BR-9: rooms 1 and 2 of the bridges (integrity of every board, loot and the Hold guarantee). */

const boardOf = (layout: string) =>
  createBattle({
    title: 't',
    board: layout,
    seed: 1,
    edge: 'drop',
    lineup: FOUNDERS,
    party: Object.fromEntries(
      FOUNDERS.map((id) => [id, { spells: compiledFor(newProfile(), id).spells }]),
    ),
  }).state;

interface Entry {
  room: number;
  name: string;
  kind: SpanKind;
  layout: string;
}
const ENTRIES: Entry[] = BRIDGE_ROOMS_12.flatMap((room, r) =>
  room.variants.map((v, i): Entry => {
    const sound = r === 0 || spanVariantPool(r, 'sound').includes(i);
    return { room: r, name: v.name, kind: sound ? 'sound' : 'crumbling', layout: v.layout };
  }),
);

const key = (c: { x: number; y: number }) => `${c.x},${c.y}`;

describe('BR-9 rooms 1 and 2', () => {
  test('room 1 has 3 sound layouts; room 2 has the pools 2 sound + 2 crumbling', () => {
    expect(BRIDGE_ROOMS_12.map((r) => r.variants.length)).toEqual([3, 4]);
    expect(spanVariantPool(1, 'sound')).toEqual([0, 1]);
    expect(spanVariantPool(1, 'crumbling')).toEqual([2, 3]);
    expect(ENTRIES.filter((e) => e.room === 1).map((e) => e.kind)).toEqual([
      'sound',
      'sound',
      'crumbling',
      'crumbling',
    ]);
    expect(BRIDGES_KIT.edge).toBe('drop');
    expect(BRIDGES_KIT.gate).toEqual({ kind: 'drawing' });
  });

  test('names are present and distinct', () => {
    const names = ENTRIES.map((e) => e.name);
    expect(new Set(names).size).toBe(names.length);
    for (const r of BRIDGE_ROOMS_12) expect(r.title.length).toBeGreaterThan(0);
  });

  describe.each(ENTRIES)('$name ($kind, room $room)', (e) => {
    const spec = parseBoard(e.layout);
    const state = boardOf(e.layout);
    const stone = e.kind === 'sound' ? BRIDGE_TUNING.stone.sound : BRIDGE_TUNING.stone.crumbling;

    test('passes checkRoom and the size bands', () => {
      expect(checkRoom(e.layout)).toEqual([]);
      if (e.kind === 'sound') {
        expect(spec.width).toBeGreaterThanOrEqual(6);
        expect(spec.height).toBe(9);
      } else {
        expect(spec.width).toBeLessThanOrEqual(6);
        expect(spec.height).toBeGreaterThanOrEqual(6);
        expect(spec.height).toBeLessThanOrEqual(7);
      }
    });

    test('every standable tile is span or pier, with the span kind stone', () => {
      const tiles = state.tiles.filter((t) => !t.terrain.drop);
      expect(tiles.length).toBeGreaterThan(0);
      const rule = state.rules?.[COLLAPSE_RULE_ID] as BridgesState;
      for (const t of tiles) expect(t.piece, 'bare floor').not.toBeNull();
      expect(Object.values(rule.stone).every((n) => n === stone)).toBe(true);
      expect(state.edge).toBe('drop');
    });

    test('foes and piers are present; crumbling boards have one pier and two foes', () => {
      const foes = state.units.filter((u) => u.kind === 'enemy');
      const ids: string[] = ['warden', 'gargoyle', 'mason'];
      expect(foes.length).toBeGreaterThanOrEqual(2);
      for (const u of foes) expect(ids).toContain(u.def);
      const piers = state.tiles.filter((t) => t.piece?.id === 'bridges:pier').length;
      expect(piers).toBeGreaterThanOrEqual(1);
      if (e.kind === 'crumbling') {
        expect(piers).toBe(1);
        expect(foes.length).toBe(2);
      }
    });

    test('nothing starts cracked and there are enough start points', () => {
      expect(cracksOf(state)).toEqual([]);
      expect(spec.starts.length).toBeGreaterThanOrEqual(4);
    });

    test('starts are three or more tiles from every foe', () => {
      for (const p of spec.starts) {
        for (const u of spec.units) {
          expect(Math.abs(p.x - u.at.x) + Math.abs(p.y - u.at.y)).toBeGreaterThanOrEqual(3);
        }
      }
    });

    test('a section can be cut (one or two tiles) while a start stays supported', () => {
      const rule = state.rules?.[COLLAPSE_RULE_ID] as BridgesState;
      const tiles = Object.keys(rule.stone);
      const starts = spec.starts.map(key);
      const works = (cuts: string[]) => {
        const s = structuredClone(state);
        const r = s.rules?.[COLLAPSE_RULE_ID] as BridgesState;
        for (const c of cuts) r.stone[c] = 0;
        const cracked = new Set(cracksOf(s).map(key));
        // something beyond the broken tiles falls, and not every start point is lost
        const extra = [...cracked].filter((c) => !cuts.includes(c));
        return extra.length > 0 && starts.some((p) => !cracked.has(p));
      };
      const single = tiles.filter((t) => works([t]));
      const pairs = tiles.flatMap((a, i) => tiles.slice(i + 1).map((b) => [a, b] as string[]));
      expect(single.length > 0 || pairs.some((p) => works(p))).toBe(true);
    });
  });

  test('the loot tables exist for both span kinds; crumbling has no ink and more of the school', () => {
    const sound = LOOT_TABLES['bridges:sound'];
    const crumbling = LOOT_TABLES['bridges:crumbling'];
    const kinds = (t: typeof sound) => t.entries.map((en) => en.spec.kind);
    for (const t of [sound, crumbling]) {
      const runes = t.entries.flatMap((en) => (en.spec.kind === 'rune' ? [en.spec.rune] : []));
      expect(runes).toEqual(expect.arrayContaining(['hold', 'brink', 'lay']));
    }
    expect(kinds(sound)).toContain('ink');
    expect(kinds(crumbling)).not.toContain('ink');
    expect(kinds(crumbling)).toContain('vellum');
  });

  test('the Hold guarantee: rooms 1 and 2, only while Hold is missing and no warden has joined', () => {
    const ctx = (room: number, loot: Trip['loot'] = []) => ({
      profile: newProfile(),
      trip: { district: 'bridges', loot } as unknown as Trip,
      room,
      table: 'bridges:sound' as const,
      seed: 1,
    });
    expect(HOLD_GUARANTEE_ROOMS).toEqual([0, 1]);
    for (const r of [0, 1]) {
      expect(HOLD_GUARANTEE(ctx(r))).toEqual({ must: { kind: 'rune', rune: 'hold' } });
    }
    expect(HOLD_GUARANTEE(ctx(2))).toEqual({});
    expect(HOLD_GUARANTEE(ctx(0, [{ kind: 'rune', rune: 'hold' }]))).toEqual({});
    const known = ctx(0);
    known.profile.known = [...known.profile.known, 'hold'];
    expect(HOLD_GUARANTEE(known)).toEqual({});
    const joined = ctx(0);
    joined.profile.household.members = [...joined.profile.household.members, 'warden'];
    expect(HOLD_GUARANTEE(joined)).toEqual({});
    const other = ctx(0);
    other.trip = { ...other.trip, district: 'canals' } as Trip;
    expect(HOLD_GUARANTEE(other)).toEqual({});
  });
});
