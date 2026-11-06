import { describe, expect, test, vi } from 'vitest';
import { PLUNGE_KIND } from '$data/districts/bathhouses';
import { newProfile, newSave, type Profile, type SaveData, type Trip } from '$engine';
import {
  endBattle,
  leaveDoorway,
  pushOnward,
  setOut,
  startBattle,
  takeOffer,
} from '../../src/app/flow';
import { offerLabelFor } from '../../src/ui/districts';
import {
  crossroadsHeatLine,
  heatBadge,
  heatView,
  lootHeatLine,
  plungeStakes,
} from '../../src/ui/districts/bathhouses/heat/view';

vi.mock('$data/districts/index', async (importOriginal) => {
  const m = await importOriginal<typeof import('$data/districts/index')>();
  const board = (rows: readonly string[]): string => rows.join('\n');
  const ROOM = board(['P . . . . .', '. . ~ ~ . .', '. . . @ . r', 'P . . . . .']);
  const HEART = board(['P . . . . .', '. . @ . d .', 'P . . . . .']);
  const room = (i: number, heart = false) => ({
    id: `bh-${i}`,
    title: `Room ${i}`,
    depth: i + 1,
    layout: heart ? HEART : ROOM,
    variants: [{ name: `Room ${i}`, layout: heart ? HEART : ROOM }],
    loot: 'bathhouses:h1' as const,
    picks: 1,
    heart,
  });
  const rooms = [room(0), room(1), room(2), room(3), room(4, true)];
  const DISTRICTS = { ...m.DISTRICTS, bathhouses: { ...m.DISTRICTS.bathhouses, rooms } };
  return {
    ...m,
    DISTRICTS,
    DISTRICT_KIT: DISTRICTS,
    encountersOf: (d: keyof typeof DISTRICTS) => DISTRICTS[d].rooms,
  };
});

/**
 * BH-13: the heat in the trip screens. Mocked bathhouses rooms (the real ones land with BH-6–8; opened on the
 * profile, as plunge.test.ts does), played by closing each battle as won; the views read the trip the screens read.
 */

const open = (): Profile => {
  const p = newProfile();
  return {
    ...p,
    city: {
      ...p.city,
      heard: [...p.city.heard, 'bathhouses'],
      open: [...p.city.open, 'bathhouses'],
    },
  };
};
const tripOf = (s: SaveData): Trip => {
  if (!s.trip) throw new Error('expected a trip');
  return s.trip;
};
const win = (save: SaveData): SaveData => {
  const s = structuredClone(startBattle(save).state);
  s.phase = 'won';
  for (const u of s.units) if (u.kind === 'enemy') u.hp = 0;
  return endBattle(save, s, []).save;
};
const plungeIx = (s: SaveData): number => tripOf(s).offers.findIndex((o) => o.kind === PLUNGE_KIND);
function moveOn(save: SaveData): SaveData {
  let s = save;
  for (let g = 0; g < 6 && tripOf(s).status === 'looting'; g++) s = takeOffer(s, 0);
  if (tripOf(s).status === 'doorway') s = leaveDoorway(s, s.profile);
  return pushOnward(s);
}
const out = (): SaveData => setOut({ ...newSave(7), profile: open() }, 'bathhouses');
const toLoot = (upTo: number): SaveData => {
  let save = out();
  for (;;) {
    const room = tripOf(save).encounter;
    save = win(save);
    if (room === upTo) return save;
    save = moveOn(save);
  }
};

describe('the heat badge', () => {
  test('a fight shows its own heat, rising with the room', () => {
    let save = out();
    const seen: number[] = [];
    for (let room = 0; room < 4; room++) {
      expect(heatView(tripOf(save))?.fighting).toBe(true);
      seen.push(heatBadge(tripOf(save))?.level ?? 0);
      save = moveOn(win(save));
    }
    expect(seen).toEqual([1, 2, 3, 4]);
    expect(heatBadge(tripOf(save))).toMatchObject({ level: 4, label: 'Heat 4' });
  });

  test('between rooms it names the next hall; none ahead once the heart is won', () => {
    expect(heatBadge(tripOf(toLoot(0)))).toMatchObject({
      level: 2,
      label: 'Next hall: heat 2',
      note: '',
    });
    expect(heatBadge(tripOf(toLoot(4)))).toBeNull();
  });

  test('a plunge cools the next fight and the badge says so', () => {
    let s = toLoot(2);
    s = takeOffer(s, plungeIx(s));
    s = moveOn(s);
    expect(heatBadge(tripOf(s))).toMatchObject({
      level: 3,
      label: 'Heat 3',
      note: 'cooled by the plunge',
    });
  });

  test('nothing away from the bathhouses', () => {
    const t = tripOf(setOut({ ...newSave(7), profile: open() }, 'seam'));
    expect(heatBadge(t)).toBeNull();
    expect(heatView(t)).toBeNull();
    expect(crossroadsHeatLine(t)).toBeNull();
    expect(lootHeatLine(t)).toBeNull();
  });
});

describe('the Crossroads and loot lines', () => {
  test('the next hall is hotter after rooms 1–4', () => {
    for (const room of [0, 1, 2]) {
      expect(crossroadsHeatLine(tripOf(toLoot(room)))).toBe(
        `The next hall is hotter: heat ${room + 2}.`,
      );
    }
  });

  test('a plunge holds the next hall level instead', () => {
    const t = tripOf(takeOffer(toLoot(1), plungeIx(toLoot(1))));
    expect(crossroadsHeatLine(t)).toBe('The plunge holds the next hall at heat 2.');
    expect(lootHeatLine(t)).toEqual({
      here: 'A heat 2 hall: the offers follow its heat.',
      ahead: 'The plunge holds the next hall at heat 2.',
    });
  });

  test('no line once the heart is won', () => {
    expect(crossroadsHeatLine(tripOf(toLoot(4)))).toBeNull();
  });
});

describe('the plunge card', () => {
  test('says what it costs and what it buys before the pick', () => {
    expect(plungeStakes(tripOf(toLoot(1)))).toMatchObject({
      title: 'Cold plunge',
      change: 'Next hall: heat 3 → 2',
      cost: 'It is your only pick here: you take nothing else.',
    });
  });

  test('no change line without a trip, and a spare pick reads as a cost', () => {
    expect(plungeStakes(null).change).toBeNull();
    const t = { ...tripOf(toLoot(0)), picksLeft: 2 };
    expect(plungeStakes(t).cost).toBe('Costs one of your picks.');
  });

  test('the chip is named, other kinds are left to the screen', () => {
    expect(offerLabelFor({ kind: PLUNGE_KIND })).toBe('Cold plunge');
    expect(offerLabelFor({ kind: 'rune' })).toBeUndefined();
  });
});
