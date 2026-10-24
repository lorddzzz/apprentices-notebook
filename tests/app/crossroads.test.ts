import { describe, expect, test, vi } from 'vitest';
import {
  type BattleState,
  beginEncounter,
  type DistrictShape,
  finishEncounter,
  NO_WAY_HOME,
  newProfile,
  newSave,
  type Profile,
  pickLoot,
  placeOf,
  pushOn,
  returnHome,
  shapeOf,
  startTrip,
  type Trip,
  variantFor,
} from '$engine';
import type { CrossroadsChoice, TripShapeDef } from '$engine/districts/types';
import { chooseWay, crossroadsView, setOutAt, startCheckpoint } from '../../src/app/crossroads';
import { GameStore } from '../../src/app/game.svelte';
import { memoryBackend, writeSave } from '../../src/app/save';

/** The canals wear the Cartographers' shape here: free home after rooms 1-3, the doorway after room 3. */
vi.mock('$data/districts/index', async (importOriginal) => {
  const m = await importOriginal<typeof import('$data/districts/index')>();
  return {
    ...m,
    DISTRICT_KIT: {
      ...m.DISTRICT_KIT,
      canals: {
        id: 'canals',
        ret: { kind: 'until', after: 2 },
        checkpoint: { after: 2, name: 'The quiet doorway' },
      },
    },
  };
});

const withCanals = (p: Profile): Profile => ({
  ...p,
  city: { ...p.city, heard: ['seam', 'canals'], open: ['seam', 'canals'] },
});

function won(b: BattleState): BattleState {
  const s = structuredClone(b);
  s.phase = 'won';
  for (const u of s.units) if (u.kind === 'enemy') u.hp = 0;
  return s;
}

function clear(p: Profile, t: Trip): Trip {
  const r = finishEncounter(p, t, won(beginEncounter(p, t).state));
  let trip = r.trip;
  if (!trip) throw new Error('expected a trip');
  while (trip.status === 'looting') trip = pickLoot(trip, 0);
  return trip;
}

function walkTo(p: Profile, room: number, district: 'canals' | 'seam' = 'canals'): Trip {
  let t = clear(p, startTrip(p, 7, district));
  for (let i = 0; i < room; i++) t = clear(p, pushOn(t));
  return t;
}

const fixture = (choices: readonly CrossroadsChoice[]): TripShapeDef => ({
  id: 'canals:fixture',
  initState: () => 0,
  parseState: (raw) => (typeof raw === 'number' ? raw : 0),
  choices: () => choices,
});

const p0 = withCanals(newProfile());

describe('the default pair', () => {
  test('push on with where it leads, then return home with the finds kept', () => {
    const t = walkTo(p0, 1);
    const view = crossroadsView(t);
    expect(view.heading).toBe('Deeper still.');
    expect(view.ways).toHaveLength(1);
    expect(view.ways[0]).toMatchObject({ id: 'push', label: 'Push on', testid: 'push' });
    expect(view.ways[0]?.sub).toBe(`Deeper: ${placeOf(t, 2)} (depth 3 of 5)`);
    expect(view.ways[0]?.warn).toBeUndefined();
    expect(view.home).toMatchObject({
      id: 'return',
      disabled: false,
      sub: `keep ${t.loot.length} ${t.loot.length === 1 ? 'find' : 'finds'}`,
    });
  });

  test('the Seam keeps its heading', () => {
    expect(crossroadsView(walkTo(newProfile(), 0, 'seam')).heading).toBe('The Seam goes on.');
  });
});

describe('landings: a greyed way home says where the next one is', () => {
  const landings: DistrictShape = {
    ...shapeOf('canals'),
    ret: { kind: 'landings', after: [0, 2, 4] },
  };

  test('a non-landing room', () => {
    const t = walkTo(p0, 1);
    const home = crossroadsView(t, landings).home;
    expect(home?.disabled).toBe(true);
    expect(home?.sub).toBe(`No landing here. The next landing is after ${placeOf(t, 2)}.`);
    expect(home?.testid).toBe('return');
  });

  test('a landing room offers home', () => {
    expect(crossroadsView(walkTo(p0, 0), landings).home?.disabled).toBe(false);
  });
});

describe('the point of no return', () => {
  test('the push before it warns; past it, the way home is greyed with its reason', () => {
    const at2 = walkTo(p0, 2);
    const view = crossroadsView(at2);
    expect(view.ways[0]?.warn).toBe(NO_WAY_HOME);
    expect(view.home?.disabled).toBe(false);

    const at3 = clear(p0, pushOn(at2));
    const past = crossroadsView(at3);
    expect(past.ways[0]?.warn).toBeUndefined();
    expect(past.home).toMatchObject({ disabled: true, sub: 'No way home until the heart.' });
  });
});

describe('a module names the ways on (P4)', () => {
  const spans: DistrictShape = {
    ...shapeOf('canals'),
    ret: { kind: 'any' },
    trip: fixture([
      { id: 'sound', label: 'The sound span', kind: 'push', variantPool: [0] },
      { id: 'crumbling', label: 'The crumbling span', kind: 'push', variantPool: [2] },
    ]),
  };

  test('two span buttons, each naming the room its pool draws', () => {
    const t = walkTo(p0, 0);
    const view = crossroadsView(t, spans);
    expect(view.ways.map((w) => [w.id, w.label, w.testid])).toEqual([
      ['sound', 'The sound span', 'way-sound'],
      ['crumbling', 'The crumbling span', 'way-crumbling'],
    ]);
    const asTaken = (id: string, pool: number): Trip => {
      const kit = t.kit ?? { state: null, choices: [], checkpoint: false, bonuses: [] };
      return { ...t, kit: { ...kit, choices: [...kit.choices, { after: 0, id, pool: [pool] }] } };
    };
    expect(view.ways[0]?.sub).toBe(`Deeper: ${placeOf(asTaken('sound', 0), 1)} (depth 2 of 5)`);
    expect(view.ways[1]?.sub).toBe(`Deeper: ${placeOf(asTaken('crumbling', 2), 1)} (depth 2 of 5)`);
    expect(view.home?.disabled).toBe(false);
  });

  test('a greyed way carries its reason on the button', () => {
    const shut: DistrictShape = {
      ...spans,
      trip: fixture([
        { id: 'sound', label: 'The sound span', kind: 'push' },
        { id: 'crumbling', label: 'The crumbling span', kind: 'push', disabled: 'The span fell.' },
      ]),
    };
    const view = crossroadsView(walkTo(p0, 0), shut);
    expect(view.ways.map((w) => w.disabled)).toEqual([false, true]);
  });

  test('the doorway is a way on that warns it is the last way home', () => {
    const door: DistrictShape = {
      ...shapeOf('canals'),
      trip: fixture([{ id: 'door', label: 'Through the doorway', kind: 'through' }]),
    };
    const view = crossroadsView(walkTo(p0, 2), door);
    expect(view.ways).toHaveLength(1);
    expect(view.ways[0]).toMatchObject({ id: 'door', kind: 'through', warn: NO_WAY_HOME });
    expect(view.home?.label).toBe('Return home');
  });

  test('chooseWay takes the module choice and records it', () => {
    const t = walkTo(p0, 0);
    const save = { ...newSave(1), profile: p0, trip: t };
    // The real canals module names no choices: the default push is the one way.
    const moved = chooseWay(save, 'push');
    expect(moved.trip?.encounter).toBe(1);
    expect(moved.trip?.status).toBe('fight');
    expect(moved.trip?.kit?.choices).toEqual([{ after: 0, id: 'push' }]);
    expect(() => chooseWay(save, 'sideways')).toThrow('No choice');
    expect(() => chooseWay({ ...save, trip: null }, 'push')).toThrow('not out');
  });

  test('the store takes a way on', () => {
    const b = memoryBackend();
    writeSave(b, { ...newSave(1), profile: p0, trip: walkTo(p0, 0) });
    const game = new GameStore(b, () => 1);
    game.chooseWay('push');
    expect(game.save.trip?.encounter).toBe(1);
    expect(game.save.trip?.status).toBe('fight');
    expect(variantFor(game.save.trip as Trip, 1)).toBeGreaterThanOrEqual(0);
  });
});

describe('Set out offers the checkpoint', () => {
  const home = returnHome(p0, walkTo(p0, 2));

  test('only once the city remembers it', () => {
    expect(startCheckpoint(p0, 'canals')).toBeNull();
    expect(startCheckpoint(home, 'canals')).toBe('The quiet doorway');
    expect(startCheckpoint(home, 'seam')).toBeNull();
  });

  test('starting at the checkpoint skips the rooms before it; the default is the first room', () => {
    const save = { ...newSave(1), profile: home };
    const door = setOutAt(save, 'canals', 'checkpoint');
    expect(door.trip?.encounter).toBe(3);
    expect(door.trip?.kit?.checkpoint).toBe(true);
    expect(door.lastTrip).toBeNull();
    expect(setOutAt(save, 'canals').trip?.encounter).toBe(0);
  });

  test('refuses a checkpoint the city has not reached, and a second trip', () => {
    const save = { ...newSave(1), profile: p0 };
    expect(() => setOutAt(save, 'canals', 'checkpoint')).toThrow('no checkpoint');
    const out = setOutAt({ ...newSave(1), profile: home }, 'canals');
    expect(() => setOutAt(out, 'canals')).toThrow('already out');
  });

  test('the store refuses an empty party with a reason, whichever start', () => {
    const empty: Profile = { ...home, household: { ...home.household, slots: [null, null, null] } };
    const b = memoryBackend();
    writeSave(b, { ...newSave(1), profile: empty });
    const game = new GameStore(b, () => 1);
    expect(game.setOut('canals', 'checkpoint')).toMatch(/Nobody is in a trip slot/);
  });
});
