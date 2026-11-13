import { describe, expect, test, vi } from 'vitest';
import { LOOT_TABLES } from '$data';
import { CARTOGRAPHERS_KIT } from '$data/districts/cartographers';
import { BOARD_TREASURES } from '$data/districts/cartographers/loot';
import { CARTOGRAPHERS_TABLE_IDS } from '$data/districts/cartographers/types';
import {
  type BattleState,
  choicesAt,
  newProfile,
  newSave,
  type Profile,
  returnCheck,
  returnHome,
  type SaveData,
  shapeOf,
  type Trip,
} from '$engine';
import { KIT } from '$engine/districts';
import { BOARD_GUARANTEE, CARTOGRAPHERS_SHAPE } from '$engine/districts/cartographers/trip';
import type { KitLootSpec } from '$engine/districts/types';
import { chooseWay, setOutAt, startCheckpoint } from '../../../src/app/crossroads';
import { endBattle, goHome, leaveDoorway, startBattle, takeOffer } from '../../../src/app/flow';

/**
 * CG-8: the trip's shape and loot (cartographers-plan P13-P15). The hall ships with no rooms until
 * CG-9 and CG-10, so six plain rooms (the sixth the heart) are mocked here through the kit; the
 * `ret`, `checkpoint`, loot tables and module are the real ones.
 */

vi.mock('$data/districts/index', async (importOriginal) => {
  const m = await importOriginal<typeof import('$data/districts/index')>();
  const layout = ['P . . . . .', '. . . . . r', 'P . . . . .'].join('\n');
  const room = (i: number, heart = false) => ({
    id: `cg-${i}`,
    title: `Room ${i + 1}`,
    depth: i + 1,
    layout,
    variants: [{ name: `Room ${i + 1}`, layout }],
    loot: 'shallow' as const,
    picks: 1,
    heart,
  });
  const rooms = [room(0), room(1), room(2), room(3), room(4), room(5, true)];
  const DISTRICTS = { ...m.DISTRICTS, cartographers: { ...m.DISTRICTS.cartographers, rooms } };
  return {
    ...m,
    DISTRICTS,
    DISTRICT_KIT: DISTRICTS,
    encountersOf: (d: keyof typeof DISTRICTS) => DISTRICTS[d].rooms,
  };
});

// ── Helpers ─────────────────────────────────────────────
const DISTRICT = 'cartographers';
const open = (known: readonly string[] = []): Profile => {
  const p = newProfile();
  return {
    ...p,
    known: [...p.known, ...known] as Profile['known'],
    city: { ...p.city, heard: [...p.city.heard, DISTRICT], open: [...p.city.open, DISTRICT] },
  };
};
const tripOf = (save: SaveData): Trip => {
  if (!save.trip) throw new Error('expected a trip');
  return save.trip;
};
const out = (seed: number, p: Profile = open(), at: 'start' | 'checkpoint' = 'start'): SaveData =>
  setOutAt({ ...newSave(seed), profile: p }, DISTRICT, at);

function finish(save: SaveData, phase: 'won' | 'lost'): SaveData {
  const s: BattleState = structuredClone(startBattle(save).state);
  s.phase = phase;
  for (const u of s.units) {
    if (phase === 'won' && u.kind === 'enemy') u.hp = 0;
    if (phase === 'lost' && u.kind === 'member') u.hp = 0;
  }
  return endBattle(save, s, []).save;
}
const winRoom = (save: SaveData): SaveData => finish(save, 'won');

/** The offer matching `spec` (a page the table rolled too has the same shape). */
const indexOf = (t: Trip, spec: KitLootSpec): number =>
  t.offers.findIndex((o) => JSON.stringify(o) === JSON.stringify(spec));

/** Wins the room and takes offer `want` when it is offered, else the first card. */
function clearRoom(save: SaveData, want?: KitLootSpec): SaveData {
  let next = winRoom(save);
  while (tripOf(next).status === 'looting') {
    const i = want ? indexOf(tripOf(next), want) : 0;
    next = takeOffer(next, Math.max(i, 0));
  }
  // A quiet doorway among the cards: step through it without rewiring.
  if (tripOf(next).status === 'doorway') next = leaveDoorway(next, next.profile);
  return next;
}
/** The way on from a Crossroads: the module's own choice, else the default push. */
const wayOn = (save: SaveData): SaveData => {
  const way = choicesAt(tripOf(save)).find((c) => c.kind !== 'return');
  return chooseWay(save, way?.id ?? 'push');
};

// ── Shape data ──────────────────────────────────────────
describe('the trip data (P13)', () => {
  test('free home through room 3, the doorway as the checkpoint, the module registers its shape', () => {
    expect(CARTOGRAPHERS_KIT.ret).toEqual({ kind: 'until', after: 2 });
    expect(CARTOGRAPHERS_KIT.checkpoint).toEqual({ after: 2, name: 'the quiet doorway' });
    expect(KIT.modules.cartographers?.trip?.id).toBe(CARTOGRAPHERS_SHAPE);
    expect(shapeOf(DISTRICT).length).toBe(6);
  });

  test('the six tables exist and are the district’s', () => {
    for (const id of CARTOGRAPHERS_TABLE_IDS)
      expect(LOOT_TABLES[id].entries.length).toBeGreaterThan(0);
    expect(CARTOGRAPHERS_KIT.tables).toEqual([...CARTOGRAPHERS_TABLE_IDS]);
  });
});

// ── The doorway ─────────────────────────────────────────
describe('CG-8 the doorway Crossroads', () => {
  test('CG-8: no return after the doorway', () => {
    for (let seed = 1; seed <= 50; seed++) {
      let save = out(seed);
      for (let room = 0; room < 6; room++) {
        save = clearRoom(save);
        const t = tripOf(save);
        if (room === 5) {
          expect(t.status, `seed ${seed}`).toBe('cleared');
          expect(returnCheck(t)).toEqual({ ok: true });
          break;
        }
        const ways = choicesAt(t);
        const home = ways.find((c) => c.kind === 'return');
        if (room <= 2) {
          expect(returnCheck(t), `seed ${seed} room ${room}`).toEqual({ ok: true });
          expect(home?.disabled).toBeUndefined();
        } else {
          expect(returnCheck(t).ok, `seed ${seed} room ${room}`).toBe(false);
          expect(home?.disabled).toBe('No way home until the heart.');
          expect(() => returnHome(save.profile, t)).toThrow('No way home until the heart.');
        }
        if (room === 2) {
          const door = ways.find((c) => c.kind === 'through');
          expect(door).toMatchObject({
            id: 'doorway',
            label: 'Through the doorway',
            warn: 'What you carry is lost if you fall past it.',
          });
          expect(ways.filter((c) => c.kind !== 'return')).toHaveLength(1);
        } else {
          expect(ways.some((c) => c.kind === 'through')).toBe(false);
        }
        save = wayOn(save);
      }
      expect(goHome(save).trip).toBeNull();
    }
  });

  test('CG-8: the checkpoint is recorded on a win and a wipe', () => {
    for (let seed = 1; seed <= 50; seed++) {
      // A win: home from the doorway's Crossroads remembers it.
      let save = out(seed);
      for (let room = 0; room < 2; room++) save = wayOnAfter(save, room);
      const home = goHome(clearRoom(save));
      expect(home.profile.city.checkpoints?.cartographers, `win ${seed}`).toBe(2);
      expect(startCheckpoint(home.profile, DISTRICT)).toBe('the quiet doorway');

      // A wipe past the doorway remembers it too.
      let past = out(seed);
      for (let room = 0; room < 3; room++) past = wayOnAfter(past, room);
      past = wayOn(clearRoom(past));
      const wiped = finish(past, 'lost');
      expect(wiped.trip, `wipe ${seed}`).toBeNull();
      expect(wiped.profile.city.checkpoints?.cartographers).toBe(2);

      // A wipe before it does not.
      const early = finish(wayOn(clearRoom(out(seed))), 'lost');
      expect(early.profile.city.checkpoints?.cartographers).toBeUndefined();
    }
  });

  test('CG-8: a wipe in room 5 restarts at the doorway', () => {
    for (let seed = 1; seed <= 50; seed++) {
      let save = out(seed);
      for (let room = 0; room < 4; room++) save = wayOnAfter(save, room);
      expect(tripOf(save).encounter).toBe(4);
      const wiped = finish(save, 'lost');
      expect(wiped.trip).toBeNull();
      expect(startCheckpoint(wiped.profile, DISTRICT)).toBe('the quiet doorway');
      const again = out(seed + 100, wiped.profile, 'checkpoint');
      expect(tripOf(again).encounter, `seed ${seed}`).toBe(3);
      expect(tripOf(again).kit?.checkpoint).toBe(true);
      // Rooms 1-3 always replay from the start.
      expect(tripOf(out(seed + 100, wiped.profile, 'start')).encounter).toBe(0);
    }
  });
});

/** Clears room `room` and walks on to the next, whichever way the Crossroads names. */
function wayOnAfter(save: SaveData, room: number): SaveData {
  expect(tripOf(save).encounter).toBe(room);
  return wayOn(clearRoom(save));
}

// ── The Board treasures ─────────────────────────────────
describe('CG-8 the Board treasures', () => {
  test('CG-8: each treasure is reachable from rooms 1-3', () => {
    for (let seed = 1; seed <= 20; seed++) {
      let p = open();
      const got: string[] = [];
      for (let trip = 0; trip < 2; trip++) {
        let save = out(seed + trip, p);
        for (let room = 0; room < 3; room++) {
          const next = winRoom(save);
          // The room's guaranteed card is offered whichever way the table rolled.
          const want = BOARD_TREASURES[trip * 3 + room];
          if (!want) throw new Error('no treasure');
          const at = indexOf(tripOf(next), want);
          expect(at, `seed ${seed} trip ${trip} room ${room}`).toBeGreaterThanOrEqual(0);
          got.push(JSON.stringify(want));
          save = clearToCrossroads(takeOffer(next, at));
          if (room < 2) save = wayOn(save);
        }
        p = goHome(save).profile;
      }
      expect(new Set(got).size, `seed ${seed}`).toBe(6);
      expect(got).toEqual(BOARD_TREASURES.map((b) => JSON.stringify(b)));
      expect(p.known).toEqual(expect.arrayContaining(['erase', 'draw', 'swap']));
      expect(p.bindEvents).toContain('dies');
      expect(p.solventsFound).toEqual(expect.arrayContaining(['quicksilver', 'graphite']));
    }
  });

  test('a household with every treasure is offered none as a guarantee', () => {
    const p = {
      ...open(['erase', 'draw', 'swap']),
      bindEvents: ['dies' as const],
      solventsFound: ['quicksilver' as const, 'graphite' as const],
    };
    const trip = tripOf(out(3, p));
    for (const room of [0, 1, 2, 3, 4, 5]) {
      expect(BOARD_GUARANTEE({ profile: p, trip, room, table: 'shallow', seed: 1 })).toEqual({});
    }
  });

  test('other districts are untouched', () => {
    const trip = { ...tripOf(out(3)), district: 'seam' as const };
    expect(BOARD_GUARANTEE({ profile: open(), trip, room: 0, table: 'shallow', seed: 1 })).toEqual(
      {},
    );
  });
});

/** Takes any remaining cards until the Crossroads. */
function clearToCrossroads(save: SaveData): SaveData {
  let next = save;
  while (tripOf(next).status === 'looting') next = takeOffer(next, 0);
  return next;
}

// ── The dies page ───────────────────────────────────────
describe('CG-8 the dies page', () => {
  test('CG-8: dies is granted once on banking', () => {
    const p = open(['erase', 'draw', 'swap']);
    const dies: KitLootSpec = { kind: 'bindEvent', event: 'dies' };
    // The page is the first treasure the household lacks, and a pick takes it.
    const save = winRoom(out(5, p));
    expect(indexOf(tripOf(save), dies)).toBeGreaterThanOrEqual(0);
    let picked = takeOffer(save, indexOf(tripOf(save), dies));
    picked = clearToCrossroads(picked);
    expect(p.bindEvents).not.toContain('dies');
    // Not offered again in the same trip once carried.
    const second = winRoom(wayOn(picked));
    expect(indexOf(tripOf(second), dies)).toBe(-1);
    // Lost on a wipe, banked once at home.
    const lost = finish(wayOn(picked), 'lost');
    expect(lost.profile.bindEvents).not.toContain('dies');
    const home = goHome(picked).profile;
    expect(home.bindEvents.filter((e) => e === 'dies')).toHaveLength(1);
    // A second copy is never offered once owned.
    const again = winRoom(out(6, home));
    expect(indexOf(tripOf(again), dies)).toBe(-1);
    for (const room of [0, 1, 2]) {
      expect(
        BOARD_GUARANTEE({ profile: home, trip: tripOf(again), room, table: 'shallow', seed: 1 }),
      ).toEqual({ must: { kind: 'solvent', solvent: 'quicksilver' } });
    }
  });
});
