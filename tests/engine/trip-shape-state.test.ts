import { describe, expect, test, vi } from 'vitest';
import { encountersOf } from '$data';
import {
  type BattleState,
  beginEncounter,
  checkGoal,
  finishEncounter,
  type GameEvent,
  newProfile,
  newSave,
  type Profile,
  parseSaveData,
  pickLoot,
  pushOn,
  setUpRoom,
  shapeOf,
  startTrip,
  type Trip,
} from '$engine';

/**
 * DK-5b: the trip shape's state side. The canals are given a fixture module here: a district rule
 * `canals:counter`, a shape that counts won rooms (and met bonuses) in trip state and hands the
 * count to the heart's rule config, and per-room offers; their kit data gives rooms 0 and 1 bonus
 * objectives. The real trip flow runs through it.
 */
vi.mock('$engine/districts/kit', async (importOriginal) => {
  const m = await importOriginal<typeof import('$engine/districts/kit')>();
  const { buildKit } = await import('$engine/districts/registry');
  type Count = { count: number; bonus: number };
  const read = (raw: unknown): Count => {
    const r = (typeof raw === 'object' && raw !== null ? raw : {}) as Partial<Count>;
    return {
      count: typeof r.count === 'number' ? r.count : 0,
      bonus: typeof r.bonus === 'number' ? r.bonus : 0,
    };
  };
  const counter = {
    id: 'canals:counter' as const,
    slot: 'late' as const,
    order: 99,
    scope: 'district' as const,
    activatedBy: { kind: 'district' as const },
    init: (_s: unknown, config: unknown) => (typeof config === 'number' ? config : 0),
    step: (_ctx: unknown, own: number) => own,
  };
  const shape = {
    id: 'canals:counted' as const,
    parseState: read,
    initState: () => ({ count: 0, bonus: 0 }),
    afterRoom: (i: { state: unknown; kit: { bonuses: number[] }; room: number }) => {
      const s = read(i.state);
      return { count: s.count + 1, bonus: s.bonus + (i.kit.bonuses.includes(i.room) ? 1 : 0) };
    },
    roomSetup: (i: { state: unknown; room: number; length: number }) =>
      i.room === i.length - 1 ? { rulesConfig: { 'canals:counter': read(i.state).count } } : {},
    offersFor: (i: { room: number; trip: { district: 'canals' } }) =>
      i.room === 2
        ? { table: 'canalShallow', picks: 1, extra: [{ kind: 'vellum', amount: 9 }] }
        : null,
  };
  const mods = m.DISTRICT_MODULES.map((d) =>
    d.id === 'canals' ? { ...d, rules: [...(d.rules ?? []), counter], trip: shape } : d,
  );
  return { DISTRICT_MODULES: mods, KIT: buildKit(mods as typeof m.DISTRICT_MODULES) };
});

vi.mock('$data/districts/index', async (importOriginal) => {
  const m = await importOriginal<typeof import('$data/districts/index')>();
  const { encountersOf } = await import('$data');
  const rooms = encountersOf('canals').map((e, i) =>
    i === 0
      ? {
          ...e,
          bonus: { goal: { noneDowned: true }, text: 'Nobody falls', reward: { kind: 'pick' } },
        }
      : i === 1
        ? {
            ...e,
            bonus: { goal: { dies: 'nobody-9' }, text: 'Never met', reward: { kind: 'pick' } },
          }
        : e,
  );
  return {
    ...m,
    DISTRICT_KIT: { ...m.DISTRICT_KIT, canals: { ...m.DISTRICT_KIT.canals, rooms } },
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

const winRoom = (p: Profile, t: Trip) => {
  const r = finishEncounter(p, t, won(beginEncounter(p, t).state));
  if (!r.trip) throw new Error('expected a trip');
  return r.trip;
};

function clear(p: Profile, t: Trip): Trip {
  let trip = winRoom(p, t);
  while (trip.status === 'looting') trip = pickLoot(trip, 0);
  return trip;
}

/** A canal trip at the start of room `room`. */
function fightAt(p: Profile, room: number): Trip {
  let t = startTrip(p, 7, 'canals');
  for (let i = 0; i < room; i++) t = pushOn(clear(p, t));
  return t;
}

const p = withCanals(newProfile());
const heart = encountersOf('canals').length - 1;

describe('trip state carried room to room (P7)', () => {
  test('a counter written by afterRoom reaches the heart through roomSetup', () => {
    expect(beginEncounter(p, fightAt(p, 1)).state.rules?.['canals:counter']).toBe(0);
    const t = fightAt(p, heart);
    expect(t.kit?.state).toEqual({ count: heart, bonus: 1 });
    expect(beginEncounter(p, t).state.rules?.['canals:counter']).toBe(heart);
  });

  test('offersFor sets the picks and adds an extra card through the registry', () => {
    const t = winRoom(p, fightAt(p, 2));
    expect(t.picksLeft).toBe(1);
    expect(t.offers.at(-1)).toEqual({ kind: 'vellum', amount: 9 });
  });
});

describe('room bonus objectives (P13)', () => {
  test('a met bonus grants a pick and is noted on the trip', () => {
    const t = winRoom(p, fightAt(p, 0));
    expect(t.picksLeft).toBe((encountersOf('canals')[0]?.picks ?? 0) + 1);
    expect(t.kit?.bonuses).toEqual([0]);
  });

  test('an unmet bonus grants nothing', () => {
    const t = winRoom(p, fightAt(p, 1));
    expect(t.picksLeft).toBe(encountersOf('canals')[1]?.picks);
    expect(t.kit?.bonuses).toEqual([0]);
  });
});

describe('save (P18)', () => {
  const json = (v: unknown): unknown => JSON.parse(JSON.stringify(v));
  const saveWith = (trip: Trip) => ({ ...newSave(1), profile: p, trip });

  test('trip state, choices and bonuses round-trip', () => {
    for (const trip of [fightAt(p, 2), winRoom(p, fightAt(p, 0)), fightAt(p, heart)]) {
      const save = saveWith(trip);
      expect(parseSaveData(json(save))).toEqual(save);
    }
  });

  test('a kit saved before state and bonuses existed reads them as empty', () => {
    const t = fightAt(p, 1);
    const kit = t.kit;
    if (!kit) throw new Error('expected a kit');
    const { state: _s, bonuses: _b, ...older } = kit;
    const parsed = parseSaveData(json(saveWith({ ...t, kit: older as typeof kit })));
    expect(parsed.trip?.kit).toEqual({ ...kit, state: { count: 0, bonus: 0 }, bonuses: [] });
  });
});

describe('districts without hooks', () => {
  test('the Seam carries no kit and its rooms set up as they are', () => {
    const t = startTrip(newProfile(), 3);
    expect(t.kit).toBeUndefined();
    expect(shapeOf('seam').rules).toBeUndefined();
    const b = beginEncounter(newProfile(), t).state;
    expect(b.rules).toBeUndefined();
    expect(setUpRoom(b, shapeOf('seam'), {})).toBe(b);
  });
});

describe('Goal additions (P13)', () => {
  const base = (): BattleState => beginEncounter(p, startTrip(p, 7, 'canals')).state;
  const ref = (id: string, member = false) => ({ id, name: id, at: { x: 0, y: 0 }, member });

  test('board edits place a piece, and piece goals read its state', () => {
    const s = setUpRoom(base(), shapeOf('seam'), {
      boardEdits: [{ at: { x: 0, y: 0 }, piece: { id: 'canals:bell', data: { state: 'rung' } } }],
    });
    expect(checkGoal({ piece: 'canals:bell', state: 'rung' }, [], s)).toBe(true);
    expect(checkGoal({ piece: 'canals:bell', state: 'rung', atLeast: 2 }, [], s)).toBe(false);
    expect(checkGoal({ piece: 'canals:bell', state: 'muffled' }, [], s)).toBe(false);
  });

  test('rule goals read a number in the rule state', () => {
    const s = { ...base(), rules: { 'canals:gauge': { level: 3 } } };
    expect(checkGoal({ rule: 'canals:gauge', key: 'level', atLeast: 3 }, [], s)).toBe(true);
    expect(checkGoal({ rule: 'canals:gauge', key: 'level', atMost: 2 }, [], s)).toBe(false);
    expect(checkGoal({ rule: 'canals:other', key: 'level' }, [], s)).toBe(false);
  });

  test('withinRounds reads the log up to that round', () => {
    const log: GameEvent[] = [
      { type: 'round', round: 2 },
      { type: 'round', round: 3 },
      { type: 'died', unit: ref('rat-1') },
    ];
    const s = base();
    expect(checkGoal({ withinRounds: 3, goal: { happens: 'died' } }, log, s)).toBe(true);
    expect(checkGoal({ withinRounds: 2, goal: { happens: 'died' } }, log, s)).toBe(false);
  });

  test('happens to one unit, out of the room and none downed', () => {
    const s = base();
    const log: GameEvent[] = [
      { type: 'died', unit: ref('rat-1') },
      { type: 'outOfRoom', unit: ref('rat-2'), cause: 'fell' },
    ];
    expect(checkGoal({ happens: 'died', unit: 'rat-1' }, log, s)).toBe(true);
    expect(checkGoal({ happens: 'died', unit: 'rat-2' }, log, s)).toBe(false);
    expect(checkGoal({ outOfRoom: 'rat-2', cause: 'fell' }, log, s)).toBe(true);
    expect(checkGoal({ outOfRoom: 'rat-2', cause: 'erased' }, log, s)).toBe(false);
    expect(checkGoal({ noneDowned: true }, log, s)).toBe(true);
    const downed: GameEvent[] = [{ type: 'died', unit: ref('cyan', true) }];
    expect(checkGoal({ noneDowned: true }, downed, s)).toBe(false);
  });
});
