import { describe, expect, test, vi } from 'vitest';
import { LOOT_TABLES, RUNES, SOLVENTS } from '$data';
import {
  AREAS_RUNES,
  BATH_LOOT_TABLES,
  BATHHOUSES_KIT,
  PICKS_BY_HEAT,
} from '$data/districts/bathhouses';
import { BATH_TABLE_IDS, type HeatLevel } from '$data/districts/bathhouses/types';
import {
  type BattleState,
  newProfile,
  newSave,
  type Profile,
  parseSaveData,
  returnHome,
  type SaveData,
  type Trip,
} from '$engine';
import { KIT } from '$engine/districts';
import { crossroadsChoices, returnPolicy } from '$engine/districts/api';
import { AREAS_GUARANTEE, baseHeat, heatOf } from '$engine/districts/bathhouses/trip';
import {
  type BathTripState,
  BOIL_OVER_RULE_ID,
  parseBathState,
} from '$engine/districts/bathhouses/types';
import type { OfferRollCtx } from '$engine/districts/types';
import { createRng } from '$engine/rng';
import { kindOf } from '$engine/trip/offerKinds';
import {
  endBattle,
  goHome,
  leaveDoorway,
  pushOnward,
  setOut,
  startBattle,
  takeOffer,
} from '../../../src/app/flow';

/**
 * BH-2: the heat rises room by room and the offers follow it (bathhouses-plan P5, P6). The
 * bathhouses ship with no rooms until BH-6, so four plain rooms and a heart are mocked here.
 */

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

// ── Helpers ─────────────────────────────────────────────
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
const setOutWith = (seed: number, p: Profile = open()): SaveData =>
  setOut({ ...newSave(seed), profile: p }, 'bathhouses');

const json = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;
const bathState = (t: Trip | null): BathTripState => parseBathState(t?.kit?.state);
const heatIn = (s: BattleState): unknown =>
  (s.rules?.[BOIL_OVER_RULE_ID] as { heat?: unknown } | undefined)?.heat;
const tripOf = (save: SaveData): Trip => {
  if (!save.trip) throw new Error('expected a trip');
  return save.trip;
};
/** Sets the trip's pending cool by hand (BH-3's plunge sets it on pick). */
const cooled = (save: SaveData): SaveData => {
  const t = tripOf(save);
  const kit = t.kit;
  if (!kit) throw new Error('expected a kit');
  return { ...save, trip: { ...t, kit: { ...kit, state: { pendingCool: 1 } } } };
};
/** Wins the current room outright (every foe down) and closes it. */
function winRoom(save: SaveData): { save: SaveData; battle: BattleState } {
  const battle = structuredClone(startBattle(save).state);
  const s = structuredClone(battle);
  s.phase = 'won';
  for (const u of s.units) if (u.kind === 'enemy') u.hp = 0;
  return { save: endBattle(save, s, []).save, battle };
}

interface Leg {
  room: number;
  heat: unknown;
  picks: number;
  offers: Trip['offers'];
}
/** A bot that pushes on to the heart, taking offers by `pick`; `cool` plunges before these rooms. */
function walk(
  seed: number,
  pick: (t: Trip) => number = () => 0,
  coolBefore: readonly number[] = [],
): { legs: Leg[]; save: SaveData } {
  let save = setOutWith(seed);
  const legs: Leg[] = [];
  for (let guard = 0; guard < 40 && save.trip; guard++) {
    const t = save.trip;
    if (t.status === 'fight') {
      if (coolBefore.includes(t.encounter)) save = cooled(save);
      const room = t.encounter;
      const r = winRoom(save);
      save = r.save;
      const after = tripOf(save);
      legs.push({ room, heat: heatIn(r.battle), picks: after.picksLeft, offers: after.offers });
      expect(bathState(after).pendingCool, `room ${room} spent its cool`).toBe(0);
    } else if (t.status === 'looting') save = takeOffer(save, pick(t));
    else if (t.status === 'doorway') save = leaveDoorway(save, save.profile);
    else if (t.status === 'crossroads') save = pushOnward(save);
    else break;
  }
  return { legs, save };
}

/** An offer card's table entry (a page the household has comes back as ink). */
const inTable = (table: (typeof BATH_TABLE_IDS)[number], item: Trip['offers'][number]): boolean =>
  item.kind === 'ink' ||
  item.kind === 'bathhouses:plunge' || // BH-3's fixed card, not from a table
  BATH_LOOT_TABLES[table].entries.some((e) => JSON.stringify(e.spec) === JSON.stringify(item));

// ── Heat per room (P5) ──────────────────────────────────
describe('heat per room (P5)', () => {
  const where = (room: number, pendingCool: 0 | 1 = 0) => ({
    room,
    length: 5,
    state: { pendingCool },
  });

  test('rooms 1–4 run at base heat 1–4 and the heart at 4', () => {
    expect([0, 1, 2, 3, 4].map((r) => baseHeat(where(r)))).toEqual([1, 2, 3, 4, 4]);
    expect([0, 1, 2, 3, 4].map((r) => heatOf(where(r)))).toEqual([1, 2, 3, 4, 4]);
  });

  test('a plunge cools the next room by one, never below 1 and never the heart', () => {
    expect([0, 1, 2, 3, 4].map((r) => heatOf(where(r, 1)))).toEqual([1, 1, 2, 3, 4]);
  });

  test('a longer trip stays at 4 past room 4; a shorter one still ends at the heart’s 4', () => {
    expect(baseHeat({ room: 5, length: 7 })).toBe(4);
    expect(baseHeat({ room: 1, length: 2 })).toBe(4);
  });
});

// ── The trip ────────────────────────────────────────────
describe('a bot trip through the thermae (P5, P6)', () => {
  test('reaches the heart carrying heat 1, 2, 3, 4 and 4; offers and picks follow the base heat', () => {
    for (const seed of [1, 2, 3, 4, 5]) {
      const { legs, save } = walk(seed);
      expect(legs.map((l) => l.room)).toEqual([0, 1, 2, 3, 4]);
      expect(legs.map((l) => l.heat)).toEqual([1, 2, 3, 4, 4]);
      expect(legs.map((l) => l.picks)).toEqual([1, 1, 1, 2, 2]);
      legs.forEach((l, i) => {
        const h = Math.min(4, i + 1) as HeatLevel;
        for (const o of l.offers) {
          expect(inTable(`bathhouses:h${h}`, o), `seed ${seed} room ${i}: ${o.kind}`).toBe(true);
        }
      });
      expect(tripOf(save).status).toBe('cleared');
      expect(goHome(save).profile.city.hearts).toContain('bathhouses');
    }
  });

  test('a cooled room runs one heat lower and keeps its own loot tier', () => {
    const { legs } = walk(3, () => 0, [1, 3]);
    expect(legs.map((l) => l.heat)).toEqual([1, 1, 3, 3, 4]);
    expect(legs.map((l) => l.picks)).toEqual([1, 1, 1, 2, 2]);
    for (const o of legs[3]?.offers ?? []) expect(inTable('bathhouses:h4', o)).toBe(true);
  });

  test('the cool is spent by the room it cooled: the room after runs at its own heat', () => {
    const { legs } = walk(8, () => 0, [2]);
    expect(legs.map((l) => l.heat)).toEqual([1, 2, 2, 4, 4]);
  });
});

// ── Save and load ───────────────────────────────────────
describe('trip state through a save (BH-0 reader, BH-2 hooks)', () => {
  test('mid-trip with a pending cool: a reload fights the same room at the same heat', () => {
    let save = setOutWith(11);
    save = winRoom(save).save;
    save = takeOffer(save, 0);
    save = pushOnward(save);
    save = cooled(save);
    const loaded = parseSaveData(json(save));
    expect(loaded.trip).toEqual(save.trip);
    expect(bathState(loaded.trip).pendingCool).toBe(1);
    expect(heatIn(startBattle(loaded).state)).toBe(1);
    expect(startBattle(loaded).state).toEqual(startBattle(save).state);
  });

  test('looting after room 4 reloads with its two picks and the same cards', () => {
    let save = setOutWith(12);
    for (let i = 0; i < 4; i++) {
      save = winRoom(save).save;
      while (tripOf(save).status === 'looting') save = takeOffer(save, 0);
      if (tripOf(save).status === 'doorway') save = leaveDoorway(save, save.profile);
      save = pushOnward(save);
    }
    save = winRoom(save).save;
    const loaded = parseSaveData(json(save));
    expect(tripOf(loaded).picksLeft).toBe(2);
    expect(tripOf(loaded).offers).toEqual(tripOf(save).offers);
  });
});

// ── Return is free (P5 `ret: any`) ──────────────────────
describe('return is possible from every room', () => {
  test('data says any', () => {
    expect(BATHHOUSES_KIT.ret).toEqual({ kind: 'any' });
    expect(KIT.modules.bathhouses?.trip?.returnBlocks).toBeUndefined();
  });

  test('fuzz: random picks, plunges and seeds; every Crossroads lets the party home', () => {
    let checked = 0;
    for (let seed = 1; seed <= 30; seed++) {
      const rng = createRng(seed * 7919);
      let save = setOutWith(seed);
      for (let guard = 0; guard < 40 && save.trip; guard++) {
        const t = save.trip;
        if (t.status === 'fight') {
          if (rng.int(0, 2) === 0) save = cooled(save);
          save = winRoom(save).save;
        } else if (t.status === 'looting') {
          save = takeOffer(save, rng.int(0, t.offers.length - 1));
        } else if (t.status === 'doorway') {
          save = leaveDoorway(save, save.profile);
        } else if (t.status === 'crossroads') {
          expect(returnPolicy(t), `seed ${seed} room ${t.encounter}`).toEqual({ ok: true });
          const home = crossroadsChoices(t).find((c) => c.kind === 'return');
          expect(home?.disabled).toBeUndefined();
          expect(() => returnHome(save.profile, t)).not.toThrow();
          checked++;
          if (rng.int(0, 3) === 0) break; // went home
          save = pushOnward(save);
        } else break;
      }
    }
    expect(checked).toBeGreaterThan(30);
  });
});

// ── Offer tables (P6) ───────────────────────────────────
describe('offer tables by heat', () => {
  test('h1…h4 are registered loot tables the district owns', () => {
    expect(BATHHOUSES_KIT.tables).toEqual(BATH_TABLE_IDS);
    for (const id of BATH_TABLE_IDS) expect(LOOT_TABLES[id]).toBe(BATH_LOOT_TABLES[id]);
  });

  test('only items the build can grant: the school’s runes, its solvents, ink, vellum, doorway', () => {
    for (const id of BATH_TABLE_IDS) {
      for (const { spec, weight } of BATH_LOOT_TABLES[id].entries) {
        expect(weight, id).toBeGreaterThan(0);
        if (spec.kind === 'rune') expect(RUNES[spec.rune].school, spec.rune).toBe('areas');
        else if (spec.kind === 'solvent') {
          expect(SOLVENTS[spec.solvent].district, spec.solvent).toBe('bathhouses');
        } else expect(['ink', 'vellum', 'doorway']).toContain(spec.kind);
        // Every card parses back through its offer kind (it can be picked, saved and banked).
        const item = spec.kind === 'ink' ? { kind: 'ink' as const, amount: 1 } : spec;
        expect(kindOf(item).parse(json(item)), `${id} ${spec.kind}`).toEqual(item);
      }
    }
  });

  test('runes from heat 1, solvents only from heat 3; two picks at heat 4', () => {
    const kinds = (id: (typeof BATH_TABLE_IDS)[number]) =>
      new Set(BATH_LOOT_TABLES[id].entries.map((e) => e.spec.kind));
    for (const id of ['bathhouses:h1', 'bathhouses:h2'] as const) {
      expect(kinds(id).has('rune'), id).toBe(true);
      expect(kinds(id).has('solvent'), id).toBe(false);
    }
    for (const id of ['bathhouses:h3', 'bathhouses:h4'] as const) {
      const solvents = BATH_LOOT_TABLES[id].entries.flatMap((e) =>
        e.spec.kind === 'solvent' ? [e.spec.solvent] : [],
      );
      expect(solvents.sort(), id).toEqual(['bathSalt', 'fogJar']);
    }
    expect(PICKS_BY_HEAT).toEqual({ 1: 1, 2: 1, 3: 1, 4: 2 });
  });
});

// ── The Areas guarantee slot ────────────────────────────
describe('the Areas guarantee (rooms 1–2)', () => {
  const ctx = (room: number, p: Profile = open(), loot: Trip['loot'] = []): OfferRollCtx => {
    const trip = { ...tripOf(setOutWith(5, p)), encounter: room, loot };
    return { profile: p, trip, room, table: 'bathhouses:h1', seed: 1 };
  };
  const vat = { kind: 'rune', rune: 'vat' } as const;

  test('rooms 1–2 offer Vat while the household has none of the school', () => {
    expect(AREAS_GUARANTEE(ctx(0))).toEqual({ must: vat });
    expect(AREAS_GUARANTEE(ctx(1))).toEqual({ must: vat });
    expect(AREAS_GUARANTEE(ctx(2))).toEqual({});
  });

  test('none once an Areas page is known or already in the trip’s loot', () => {
    for (const r of AREAS_RUNES) {
      const p = { ...open(), known: [...open().known, r] };
      expect(AREAS_GUARANTEE(ctx(0, p)), r).toEqual({});
      expect(AREAS_GUARANTEE(ctx(1, open(), [{ kind: 'rune', rune: r }])), r).toEqual({});
    }
  });

  test('only on a bathhouses trip', () => {
    const c = ctx(0);
    expect(AREAS_GUARANTEE({ ...c, trip: { ...c.trip, district: 'seam' } })).toEqual({});
  });

  test('the first room’s offers carry Vat on a fresh household', () => {
    for (const seed of [1, 2, 3]) {
      const { legs } = walk(seed);
      expect(legs[0]?.offers[0]).toEqual(vat);
    }
  });
});
