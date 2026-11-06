import { afterAll, beforeAll, describe, expect, test, vi } from 'vitest';
import { LOOT_TABLES } from '$data';
import { BRIDGES_KIT, BRIDGES_LEDGER, spanLedger, spanVariantPool } from '$data/districts/bridges';
import type { SpanKind } from '$data/districts/bridges/types';
import {
  type BattleState,
  newProfile,
  newSave,
  type Profile,
  parseSaveData,
  placeOf,
  returnHome,
  type SaveData,
  type Trip,
} from '$engine';
import { KIT } from '$engine/districts';
import { chooseAt, crossroadsChoices, returnPolicy } from '$engine/districts/api';
import { bridgeChoices, spanOfRoom, spansOf } from '$engine/districts/bridges/trip';
import { parseBridgeState } from '$engine/districts/bridges/types';
import { createRng } from '$engine/rng';
import { endBattle, leaveDoorway, setOut, startBattle, takeOffer } from '../../../src/app/flow';

/**
 * BR-7: the span choice (bridges-plan P1, P11). The bridges ship with no rooms until BR-9, so
 * five fixture rooms (one layout in room 1, four in rooms 2–4, two at the heart) and two fixture
 * loot tables are mocked here.
 */

vi.mock('$data/districts/index', async (importOriginal) => {
  const m = await importOriginal<typeof import('$data/districts/index')>();
  const L = ['P . . . . .', '. . ~ ~ . .', '. . . @ . r', 'P . . . . .'].join('\n');
  const names = (n: string[]) => n.map((name) => ({ name, layout: L }));
  const room = (i: number, v: string[], heart = false) => ({
    id: `br-${i}`,
    title: `Room ${i}`,
    depth: i + 1,
    layout: L,
    variants: names(v),
    loot: 'bridges:sound' as const,
    picks: 1,
    heart,
  });
  const rooms = [
    room(0, ['s0a', 's0b', 's0c']),
    room(1, ['s1a', 's1b', 'c1a', 'c1b']),
    room(2, ['s2a', 's2b', 'c2a', 'c2b']),
    room(3, ['s3a', 's3b', 'c3a', 'c3b']),
    room(4, ['hs', 'hc'], true),
  ];
  const DISTRICTS = { ...m.DISTRICTS, bridges: { ...m.DISTRICTS.bridges, rooms } };
  return {
    ...m,
    DISTRICTS,
    DISTRICT_KIT: DISTRICTS,
    encountersOf: (d: keyof typeof DISTRICTS) => DISTRICTS[d].rooms,
  };
});

const tables = LOOT_TABLES as Record<string, unknown>;
beforeAll(() => {
  tables['bridges:sound'] = {
    id: 'bridges:sound',
    entries: [{ spec: { kind: 'solvent', solvent: 'gallnut' }, weight: 1 }],
  };
  tables['bridges:crumbling'] = {
    id: 'bridges:crumbling',
    entries: [{ spec: { kind: 'solvent', solvent: 'cinder' }, weight: 1 }],
  };
});
afterAll(() => {
  delete tables['bridges:sound'];
  delete tables['bridges:crumbling'];
});

const open = (): Profile => {
  const p = newProfile();
  return {
    ...p,
    city: { ...p.city, heard: [...p.city.heard, 'bridges'], open: [...p.city.open, 'bridges'] },
  };
};
const setOutWith = (seed: number): SaveData =>
  setOut({ ...newSave(seed), profile: open() }, 'bridges');
const tripOf = (save: SaveData): Trip => {
  if (!save.trip) throw new Error('expected a trip');
  return save.trip;
};
const json = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;
const solventOf = (kind: SpanKind) => (kind === 'sound' ? 'gallnut' : 'cinder');

function winRoom(save: SaveData): SaveData {
  const s: BattleState = structuredClone(startBattle(save).state);
  s.phase = 'won';
  for (const u of s.units) if (u.kind === 'enemy') u.hp = 0;
  return endBattle(save, s, []).save;
}
/** Loots, clears any doorway, and stops at the Crossroads. */
function toCrossroads(save: SaveData): SaveData {
  let s = save;
  for (
    let g = 0;
    g < 10 && tripOf(s).status !== 'crossroads' && tripOf(s).status !== 'cleared';
    g++
  ) {
    const t = tripOf(s);
    if (t.status === 'looting') s = takeOffer(s, 0);
    else if (t.status === 'doorway') s = leaveDoorway(s, s.profile);
    else break;
  }
  return s;
}
const choose = (save: SaveData, id: string): SaveData => ({
  ...save,
  trip: chooseAt(tripOf(save), id),
});

describe('the span choice (P1, P11)', () => {
  test('after each of rooms 1–4 the two spans are offered, with return; the heart offers only home', () => {
    let save = setOutWith(1);
    for (let room = 0; room < 4; room++) {
      save = toCrossroads(winRoom(save));
      const ways = crossroadsChoices(tripOf(save));
      expect(ways.map((c) => c.id)).toEqual(['sound', 'crumbling', 'return']);
      expect(ways.every((c) => !c.disabled)).toBe(true);
      save = choose(save, 'sound');
    }
    save = toCrossroads(winRoom(save));
    expect(tripOf(save).status).toBe('cleared');
    expect(crossroadsChoices(tripOf(save)).map((c) => c.id)).toEqual(['return']);
  });

  test('the pick is recorded and picks the next room’s variant pool', () => {
    for (const seed of [1, 2, 3, 4, 5, 6]) {
      let save = setOutWith(seed);
      const picks: SpanKind[] = ['crumbling', 'sound', 'crumbling', 'crumbling'];
      picks.forEach((kind, room) => {
        save = toCrossroads(winRoom(save));
        save = choose(save, kind);
        const t = tripOf(save);
        const next = room + 1;
        const taken = t.kit?.choices.find((c) => c.after === room);
        expect(taken?.id).toBe(kind);
        expect([...(taken?.pool ?? [])]).toEqual([...spanVariantPool(next, kind)]);
        const name = placeOf(t);
        expect(name.startsWith(kind === 'sound' ? 's' : next === 4 ? 'hc' : 'c')).toBe(true);
        expect(name).not.toMatch(kind === 'sound' ? /^c|^hc/ : /^s|^hs/);
      });
      expect(spansOf(tripOf(save).kit ?? { choices: [] })).toEqual(picks);
    }
  });

  test('the pools: sound first then crumbling in rooms 2–4; one each at the heart', () => {
    expect(spanVariantPool(1, 'sound')).toEqual([0, 1]);
    expect(spanVariantPool(3, 'crumbling')).toEqual([2, 3]);
    expect(spanVariantPool(4, 'sound')).toEqual([0]);
    expect(spanVariantPool(4, 'crumbling')).toEqual([1]);
  });

  test('replays from its seed and survives a save', () => {
    const run = (): SaveData => {
      let save = setOutWith(21);
      for (const kind of ['crumbling', 'sound'] as const) {
        save = toCrossroads(winRoom(save));
        save = choose(save, kind);
      }
      return save;
    };
    const a = run();
    expect(run().trip).toEqual(a.trip);
    const loaded = parseSaveData(json(a));
    expect(loaded.trip).toEqual(a.trip);
    expect(startBattle(loaded).state).toEqual(startBattle(a).state);
  });
});

describe('the loot table follows the span (P11)', () => {
  test('room 1 offers the sound table; later rooms the table of the span crossed', () => {
    for (const seed of [1, 2, 3]) {
      let save = setOutWith(seed);
      const kinds: SpanKind[] = ['crumbling', 'sound', 'crumbling', 'sound'];
      const expected: SpanKind[] = ['sound', ...kinds];
      for (let room = 0; room < 5; room++) {
        save = winRoom(save);
        const t = tripOf(save);
        expect(spanOfRoom(t.kit ?? { choices: [] }, room)).toBe(expected[room]);
        for (const o of t.offers) {
          if (o.kind === 'rune' && o.rune === 'hold') continue; // BR-9: the Hold guarantee, rooms 1-2
          expect(o).toMatchObject({
            kind: 'solvent',
            solvent: solventOf(expected[room] ?? 'sound'),
          });
        }
        save = toCrossroads(save);
        const next = kinds[room];
        if (next && tripOf(save).status === 'crossroads') save = choose(save, next);
      }
    }
  });
});

describe('the ledger line on the choice (P18)', () => {
  test('every choice after rooms 1–4 has its mason’s-ledger line', () => {
    for (let after = 0; after < 4; after++) {
      for (const c of bridgeChoices({ room: after })) {
        const line = spanLedger(after, c.id as SpanKind);
        expect(line?.text, `${c.id} after ${after}`).toBeTruthy();
        expect(BRIDGES_LEDGER).toContain(line);
      }
    }
  });
});

describe('return is free (P11 `ret: any`)', () => {
  test('data says any and the module blocks nothing', () => {
    expect(BRIDGES_KIT.ret).toEqual({ kind: 'any' });
    expect(KIT.modules.bridges?.trip?.returnBlocks).toBeUndefined();
  });

  test('fuzz: random spans and seeds; every Crossroads, the heart included, lets the party home', () => {
    let checked = 0;
    for (let seed = 1; seed <= 30; seed++) {
      const rng = createRng(seed * 7919);
      let save = setOutWith(seed);
      for (let g = 0; g < 40 && save.trip; g++) {
        const t = save.trip;
        if (t.status === 'fight') save = winRoom(save);
        else if (t.status === 'looting') save = takeOffer(save, rng.int(0, t.offers.length - 1));
        else if (t.status === 'doorway') save = leaveDoorway(save, save.profile);
        else if (t.status === 'crossroads' || t.status === 'cleared') {
          expect(returnPolicy(t), `seed ${seed} room ${t.encounter}`).toEqual({ ok: true });
          expect(() => returnHome(save.profile, t)).not.toThrow();
          checked++;
          if (t.status === 'cleared' || rng.int(0, 3) === 0) break;
          save = choose(save, rng.int(0, 1) === 0 ? 'sound' : 'crumbling');
        } else break;
      }
    }
    expect(checked).toBeGreaterThan(60);
  });
});

describe('trip state reader', () => {
  test('parseBridgeState stays forgiving; the module keeps the shape and stays drawing', () => {
    expect(parseBridgeState({ spans: ['sound', 'x', 'crumbling'] }).spans).toEqual([
      'sound',
      'crumbling',
    ]);
    expect(KIT.modules.bridges?.trip?.choices).toBeTypeOf('function');
    expect(BRIDGES_KIT.gate).toEqual({ kind: 'drawing' });
  });
});
