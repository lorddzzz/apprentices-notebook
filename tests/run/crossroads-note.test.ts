import { afterAll, beforeAll, describe, expect, test, vi } from 'vitest';
import { LOOT_TABLES } from '$data';
import { spanLedger } from '$data/districts/bridges';
import {
  type BattleState,
  newProfile,
  newSave,
  type Profile,
  parseSaveData,
  type SaveData,
  type Trip,
} from '$engine';
import { chooseAt, crossroadsChoices } from '$engine/districts/api';
import { crossroadsView } from '../../src/app/crossroads';
import { endBattle, leaveDoorway, setOut, startBattle, takeOffer } from '../../src/app/flow';

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

describe('a choice note (FU-1)', () => {
  test('FU-1: a choice note reaches the crossroads card data and survives a save', () => {
    let save = toCrossroads(winRoom(setOutWith(3)));
    const ways = crossroadsChoices(tripOf(save));
    for (const kind of ['sound', 'crumbling'] as const) {
      const c = ways.find((w) => w.id === kind);
      expect(c?.note).toBe(spanLedger(0, kind)?.text);
      expect(c?.note).toBeTruthy();
    }
    // a choice without a note renders as today
    const ret = ways.find((w) => w.id === 'return');
    expect(ret && 'note' in ret).toBe(false);
    // the card data still builds from the same choices
    expect(crossroadsView(tripOf(save)).ways.map((w) => w.id)).toEqual(['sound', 'crumbling']);
    // a save keeps only today's fields on the taken choice
    save = { ...save, trip: chooseAt(tripOf(save), 'crumbling') };
    const back = parseSaveData(json(save));
    const taken = back?.trip?.kit?.choices ?? [];
    expect(taken.map((t) => t.id)).toEqual(['crumbling']);
    expect(taken.every((t) => !('note' in t))).toBe(true);
  });
});
