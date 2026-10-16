import { describe, expect, test } from 'vitest';
import { ENCOUNTERS, LOOT_TABLES, MEMBER_IDS, type MemberId } from '$data';
import {
  applyDoorway,
  compiledFor,
  type GlyphDef,
  type LootItem,
  newProfile,
  type Placed,
  type Profile,
  parseSaveData,
  pickLoot,
  returnHome,
  rollOffers,
  startTrip,
  type Trip,
} from '$engine';

const isDoorway = (i: LootItem): boolean => i.kind === 'doorway';
const heartIndex = ENCOUNTERS.findIndex((e) => e.heart);

/** A trip that has just picked a doorway (status "doorway") with `charges` left on each spell. */
function inDoorway(
  p: Profile,
  charges: Record<MemberId, Record<string, number>>,
  more: { offers: LootItem[]; picksLeft: number } = { offers: [], picksLeft: 0 },
): Trip {
  return { ...startTrip(p, 7), status: 'doorway', charges, ...more };
}

const bolt = (x: number, y: number): Placed => ({ at: { x, y }, rune: 'bolt', dir: 'right' });

/** Both Bolts of the starting pages are spent down to these counts. */
const START_CHARGES = {
  draughtsman: { '0,1': 2 },
  stoker: { '1,0': 4 },
};

describe('the doorway in the loot tables', () => {
  test('only the deep table holds it, once, at weight 1', () => {
    for (const [id, table] of Object.entries(LOOT_TABLES)) {
      const doors = table.entries.filter((e) => e.spec.kind === 'doorway');
      expect(doors.length, id).toBe(id === 'deep' ? 1 : 0);
      for (const d of doors) expect(d.weight).toBe(1);
    }
  });

  test("the heart's offers never hold a doorway (many seeds)", () => {
    expect(ENCOUNTERS[heartIndex]?.loot).toBe('heart');
    for (let seed = 1; seed <= 400; seed++) {
      const offers = rollOffers(seed, heartIndex, 'heart', MEMBER_IDS);
      expect(offers.some(isDoorway), `seed ${seed}`).toBe(false);
    }
  });

  test('a deep offer holds a doorway sometimes, and never two', () => {
    let seen = 0;
    for (let seed = 1; seed <= 600; seed++) {
      const n = rollOffers(seed, 2, 'deep', MEMBER_IDS).filter(isDoorway).length;
      expect(n, `seed ${seed}`).toBeLessThanOrEqual(1);
      seen += n;
    }
    expect(seen).toBeGreaterThan(0);
  });

  test('a save with a doorway at the heart (offered, held or open) is refused', () => {
    const base = { ...startTrip(newProfile(), 3), encounter: heartIndex };
    const door: LootItem = { kind: 'doorway' };
    const ink: LootItem = { kind: 'vellum', amount: 1 };
    const save = (trip: Trip) => ({
      profile: newProfile(),
      trip,
      seedCounter: 1,
      lastTrip: null,
    });
    const looting = { ...base, status: 'looting' as const, picksLeft: 2 };
    expect(() => parseSaveData(save({ ...looting, offers: [ink, ink] }))).not.toThrow();
    expect(() => parseSaveData(save({ ...looting, offers: [door, ink] }))).toThrow();
    expect(() => parseSaveData(save({ ...base, status: 'doorway' }))).toThrow();
    expect(() => parseSaveData(save({ ...looting, offers: [ink], loot: [door] }))).toThrow();
  });
});

describe('picking a doorway', () => {
  test('a looting trip with a doorway on offer survives a save round trip', () => {
    const trip: Trip = {
      ...startTrip(newProfile(), 5),
      encounter: 1,
      status: 'looting',
      offers: [{ kind: 'doorway' }, { kind: 'vellum', amount: 1 }],
      picksLeft: 1,
    };
    const save = { profile: newProfile(), trip, seedCounter: 1, lastTrip: null };
    expect(parseSaveData(JSON.parse(JSON.stringify(save)))).toEqual(save);
  });

  test('costs the pick, is not banked, and opens the doorway', () => {
    const t: Trip = {
      ...startTrip(newProfile(), 9),
      status: 'looting',
      offers: [{ kind: 'doorway' }, { kind: 'vellum', amount: 1 }, { kind: 'rune', rune: 'ink' }],
      picksLeft: 1,
    };
    const after = pickLoot(t, 0);
    expect(after.status).toBe('doorway');
    expect(after.loot).toEqual([]);
    expect(after.picksLeft).toBe(0);
    expect(after.offers).toEqual([]);
    // nothing is banked for it
    const home = returnHome(newProfile(), { ...after, status: 'crossroads' });
    expect(home).toEqual({ ...newProfile(), city: { ...newProfile().city, trips: 1 } });
  });

  test('with picks left the other offers wait', () => {
    const t: Trip = {
      ...startTrip(newProfile(), 9),
      status: 'looting',
      offers: [{ kind: 'vellum', amount: 1 }, { kind: 'doorway' }, { kind: 'rune', rune: 'ink' }],
      picksLeft: 2,
    };
    const after = pickLoot(t, 1);
    expect(after.status).toBe('doorway');
    expect(after.picksLeft).toBe(1);
    expect(after.offers).toEqual([
      { kind: 'vellum', amount: 1 },
      { kind: 'rune', rune: 'ink' },
    ]);
  });

  test('Done goes back to the loot when picks remain, else to the Crossroads', () => {
    const p = newProfile();
    const same = p.lattices;
    const pending = [{ kind: 'vellum', amount: 1 } as const];
    const back = applyDoorway(
      p,
      inDoorway(p, START_CHARGES, { offers: pending, picksLeft: 1 }),
      same,
    );
    expect(back.trip.status).toBe('looting');
    expect(back.trip.offers).toEqual(pending);
    expect(back.trip.picksLeft).toBe(1);
    const onward = applyDoorway(p, inDoorway(p, START_CHARGES), same);
    expect(onward.trip.status).toBe('crossroads');
    expect(onward.trip.picksLeft).toBe(0);
  });

  test('a loadout that is not ready cannot be finished', () => {
    const p = newProfile();
    const lattices = { ...p.lattices, draughtsman: [bolt(0, 1), bolt(1, 1), bolt(2, 1)] };
    expect(() => applyDoorway(p, inDoorway(p, START_CHARGES), lattices)).toThrow(/not ready/);
  });

  test('only a trip in the doorway can leave it', () => {
    const p = newProfile();
    expect(() => applyDoorway(p, startTrip(p, 1), p.lattices)).toThrow();
  });
});

describe('charges follow the rune type (S12)', () => {
  test('no change: every spell keeps what it had', () => {
    const p = newProfile();
    const r = applyDoorway(p, inDoorway(p, START_CHARGES), p.lattices);
    expect(r.trip.charges).toEqual(START_CHARGES);
    expect(r.profile.lattices).toEqual(p.lattices);
  });

  test('lifting Bolt and putting it back elsewhere keeps its count', () => {
    const p = newProfile();
    const lattices = {
      ...p.lattices,
      draughtsman: [
        bolt(0, 0),
        ...p.lattices.draughtsman.filter((r) => !('rune' in r && r.rune === 'bolt')),
      ],
    };
    const r = applyDoorway(p, inDoorway(p, START_CHARGES), lattices);
    const keys = compiledFor(r.profile, 'draughtsman').spells.map((s) => s.key);
    expect(keys).toEqual(['0,0']);
    expect(r.trip.charges.draughtsman).toEqual({ '0,0': 2 });
    expect(r.trip.charges.stoker).toEqual({ '1,0': 4 });
  });

  test('a Bolt can move to the other member and still carries its count', () => {
    const p = newProfile();
    const lattices = {
      draughtsman: p.lattices.draughtsman.filter((r) => !('rune' in r && r.rune === 'bolt')),
      stoker: [...p.lattices.stoker, bolt(0, 3)],
    };
    const r = applyDoorway(p, inDoorway(p, START_CHARGES), lattices);
    const spent = Object.values(r.trip.charges.stoker).sort();
    // the Stoker holds the 4 and the 2 (the Draughtsman has no source left)
    expect(spent).toEqual([2, 4]);
    expect(r.trip.charges.draughtsman).toEqual({});
  });

  test('a second owned Bolt starts full, and nothing is refilled', () => {
    const base = newProfile();
    const p: Profile = { ...base, collection: { ...base.collection, bolt: 3 } };
    const lattices = {
      ...p.lattices,
      draughtsman: [bolt(0, 0), ...p.lattices.draughtsman],
    };
    const r = applyDoorway(p, inDoorway(p, START_CHARGES), lattices);
    const left = MEMBER_IDS.flatMap((m) => Object.values(r.trip.charges[m])).sort();
    expect(left).toEqual([2, 4, 5]);
    const spells = MEMBER_IDS.flatMap((m) => compiledFor(r.profile, m).spells);
    expect(spells).toHaveLength(3);
  });

  test('removing a Bolt for good drops its count, and a later Bolt starts full', () => {
    const base = newProfile();
    const p: Profile = { ...base, collection: { ...base.collection, bolt: 3 } };
    // doorway 1: take the Draughtsman's Bolt out
    const bare = {
      ...p.lattices,
      draughtsman: p.lattices.draughtsman.filter((r) => !('rune' in r && r.rune === 'bolt')),
    };
    const one = applyDoorway(p, inDoorway(p, START_CHARGES), bare);
    expect(one.trip.charges.draughtsman).toEqual({});
    // doorway 2: put one back; the lifted count (2) was dropped by the first doorway, but the
    // Stoker's 4 is the only count left, so the new Bolt starts full rather than taking 2.
    const two = applyDoorway(
      one.profile,
      { ...one.trip, status: 'doorway' },
      { ...bare, draughtsman: [bolt(0, 1), ...bare.draughtsman] },
    );
    expect(two.trip.charges.draughtsman).toEqual({ '0,1': 5 });
    expect(two.trip.charges.stoker).toEqual({ '1,0': 4 });
  });

  test('a Glyph spell keeps its count and does not borrow a plain Bolt count', () => {
    const glyph: GlyphDef = {
      id: 'g1',
      name: 'Cashing In',
      kind: 'spell',
      cells: [
        { at: { x: 0, y: 0 }, rune: 'bolt', dir: 'right' },
        { at: { x: 1, y: 0 }, rune: 'ink' },
        { at: { x: 2, y: 0 }, rune: 'onInked' },
        { at: { x: 3, y: 0 }, rune: 'spark' },
      ],
      entry: { x: 0, y: 0 },
      exits: [],
      idiom: 'cashingIn',
      version: 1,
      params: [],
      extraExit: null,
    };
    const base = newProfile();
    const collection = { ...base.collection };
    for (const c of glyph.cells) collection[c.rune] += 1;
    collection.bolt += 1; // a plain Bolt for the Draughtsman besides the Stoker's and the Glyph's
    const p: Profile = {
      ...base,
      collection,
      glyphs: [glyph],
      inkCapacity: { draughtsman: 14, stoker: 14 },
      lattices: {
        draughtsman: [{ at: { x: 1, y: 1 }, glyph: 'g1', dir: 'right' }],
        stoker: base.lattices.stoker,
      },
    };
    const start = compiledFor(p, 'draughtsman').spells;
    expect(start).toHaveLength(1);
    const charges = { draughtsman: { [start[0]?.key ?? '']: 2 }, stoker: { '1,0': 4 } };
    // move the Glyph and add a plain Bolt beside it
    const lattices = {
      ...p.lattices,
      draughtsman: [bolt(0, 0), { at: { x: 2, y: 1 }, glyph: 'g1', dir: 'right' } as Placed],
    };
    const r = applyDoorway(p, inDoorway(p, charges), lattices);
    const spells = compiledFor(r.profile, 'draughtsman').spells;
    const glyphSpell = spells.find((s) => s.glyph === 'g1');
    const plain = spells.find((s) => !s.glyph);
    expect(glyphSpell && r.trip.charges.draughtsman[glyphSpell.key]).toBe(2);
    // a new plain Bolt: the Stoker's 4 stays with the Stoker's Bolt, this one starts full
    expect(plain && r.trip.charges.draughtsman[plain.key]).toBe(5);
    expect(r.trip.charges.stoker).toEqual({ '1,0': 4 });
  });

  test('swapping a spent Spell Glyph for its loose Bolt does not refill it (review)', () => {
    const glyph: GlyphDef = {
      id: 'g1',
      name: 'Fire Bolt',
      kind: 'spell',
      cells: [
        { at: { x: 0, y: 0 }, rune: 'bolt', dir: 'right' },
        { at: { x: 1, y: 0 }, rune: 'spark' },
      ],
      entry: { x: 0, y: 0 },
      exits: [],
      idiom: null,
      version: 1,
      params: [],
      extraExit: null,
    };
    const base = newProfile();
    const p: Profile = {
      ...base,
      glyphs: [glyph],
      lattices: {
        draughtsman: [{ at: { x: 1, y: 1 }, glyph: 'g1', dir: 'right' }],
        stoker: base.lattices.stoker,
      },
    };
    const [g] = compiledFor(p, 'draughtsman').spells;
    const charges = { draughtsman: { [g?.key ?? '']: 0 }, stoker: { '1,0': 4 } };
    const r = applyDoorway(p, inDoorway(p, charges), { ...p.lattices, draughtsman: [bolt(0, 1)] });
    expect(r.trip.charges.draughtsman).toEqual({ '0,1': 0 });
    expect(r.trip.charges.stoker).toEqual({ '1,0': 4 });
  });
});
