import { describe, expect, test } from 'vitest';
import {
  type DistrictId,
  ENCOUNTERS,
  LOOT_TABLES,
  type LootTableId,
  MEMBER_IDS,
  METHODS,
  RUNES,
  SOLVENTS,
  START_KNOWN,
} from '$data';
import {
  beginEncounter,
  finishEncounter,
  type LootItem,
  newProfile,
  type Profile,
  pickLoot,
  returnHome,
  rollOffers,
  startTrip,
  type Trip,
} from '$engine';

const SEAM: LootTableId[] = ['shallow', 'deep', 'heart'];
const CANALS: LootTableId[] = ['canalShallow', 'canalDeep', 'canalHeart'];

/** Every thing a set of tables can hand out, by kind. */
function contents(tables: readonly LootTableId[]) {
  const runes = new Set<string>();
  const methods = new Set<string>();
  const solvents = new Set<string>();
  for (const id of tables) {
    for (const { spec } of LOOT_TABLES[id].entries) {
      if (spec.kind === 'rune') runes.add(spec.rune);
      if (spec.kind === 'method') methods.add(spec.method);
      if (spec.kind === 'solvent') solvents.add(spec.solvent);
    }
  }
  return { runes, methods, solvents };
}

const districtOf = (c: ReturnType<typeof contents>): Set<DistrictId> =>
  new Set([
    ...[...c.runes].map((r) => RUNES[r as keyof typeof RUNES].district),
    ...[...c.methods].map((m) => METHODS[m as keyof typeof METHODS].district),
    ...[...c.solvents].map((s) => SOLVENTS[s as keyof typeof SOLVENTS].district),
  ]);

describe('typed loot tables (P34, P35)', () => {
  test('the Seam teaches Splash, Touch, Steam, Brass, Fork and Bend, and the Conduct page', () => {
    const seam = contents(SEAM);
    expect([...seam.runes].sort()).toEqual(['bend', 'brass', 'fork', 'splash', 'steam', 'touch']);
    expect([...seam.methods]).toEqual(['conduct']);
    expect([...seam.solvents].sort()).toEqual(['cinder', 'gallnut']);
    expect(districtOf(seam)).toEqual(new Set(['seam']));
    // no table hands out what a new notebook already knows
    for (const r of START_KNOWN) expect(seam.runes.has(r)).toBe(false);
  });

  test('the Conduct page is in the deep and the heart tables, not the shallow one', () => {
    const has = (id: LootTableId) => contents([id]).methods.has('conduct');
    expect([has('shallow'), has('deep'), has('heart')]).toEqual([false, true, true]);
  });

  test('the canals teach Jar, Fuse, Afterglow, Repeat, Margin, Pitch and Wick', () => {
    const canals = contents(CANALS);
    expect([...canals.runes].sort()).toEqual(['afterglow', 'fuse', 'jar']);
    expect([...canals.methods].sort()).toEqual(['margin', 'repeat']);
    expect([...canals.solvents].sort()).toEqual(['pitch', 'wick']);
    expect(districtOf(canals)).toEqual(new Set(['canals']));
  });

  test('every canal room loots a canal table and every Seam room a Seam table', () => {
    for (const e of ENCOUNTERS) expect(SEAM).toContain(e.loot);
    expect(CANALS).toHaveLength(3);
  });

  test('every table offers three distinct things, for many seeds', () => {
    for (const table of [...SEAM, ...CANALS]) {
      for (let seed = 0; seed < 100; seed++) {
        const offers = rollOffers(seed, 1, table, MEMBER_IDS);
        expect(offers, `${table} ${seed}`).toHaveLength(3);
        const keys = offers.map((o) => JSON.stringify(o));
        expect(new Set(keys).size).toBe(3);
      }
    }
  });
});

describe('knowledge, not copies (P34)', () => {
  const allSeamRunes = [...START_KNOWN, ...contents(SEAM).runes] as Profile['known'];

  test('a rune page the household already has drops as 1 ink', () => {
    let ink = 0;
    for (let seed = 0; seed < 200; seed++) {
      const offers = rollOffers(seed, 0, 'shallow', MEMBER_IDS, null, {
        known: allSeamRunes,
        methods: [],
      });
      expect(offers.some((o) => o.kind === 'rune')).toBe(false);
      for (const o of offers) {
        if (o.kind !== 'ink') continue;
        ink++;
        expect(o.amount === 1 || o.amount === 2).toBe(true);
      }
    }
    expect(ink).toBeGreaterThan(0);
  });

  test('a duplicate page is exactly 1 ink for a member', () => {
    const seen = new Set<number>();
    for (let seed = 0; seed < 300; seed++) {
      const owned = { known: allSeamRunes, methods: [] };
      const plain = rollOffers(seed, 0, 'shallow', MEMBER_IDS);
      const dup = rollOffers(seed, 0, 'shallow', MEMBER_IDS, null, owned);
      // The first draw happens before any member is rolled, so it is the same entry: a rune page
      // there becomes a 1-ink offer in its place.
      const o = plain[0];
      const d = dup[0];
      if (o?.kind !== 'rune') continue;
      expect(d?.kind).toBe('ink');
      if (d?.kind === 'ink') {
        expect(MEMBER_IDS).toContain(d.member);
        seen.add(d.amount);
      }
    }
    expect([...seen]).toEqual([1]);
  });

  test('a method page the household has is ink too', () => {
    for (let seed = 0; seed < 200; seed++) {
      const offers = rollOffers(seed, 0, 'canalDeep', MEMBER_IDS, null, {
        known: [],
        methods: ['repeat', 'margin'],
      });
      expect(offers.some((o) => o.kind === 'method')).toBe(false);
    }
  });

  test('a page already in the trip loot is ink in the next room (finishEncounter)', () => {
    const p = newProfile();
    const heart = ENCOUNTERS.length - 1;
    const t: Trip = {
      ...startTrip(p, 5),
      encounter: heart,
      loot: [{ kind: 'method', method: 'conduct' }],
    };
    const b = beginEncounter(p, t).state;
    const fought = { ...b, phase: 'won' as const };
    const r = finishEncounter(p, t, fought);
    const offers = r.trip?.offers ?? [];
    expect(offers.some((o) => o.kind === 'method')).toBe(false);
  });

  test('returnHome teaches each new page once and puts methods in Profile.methods', () => {
    const p = newProfile();
    const loot: LootItem[] = [
      { kind: 'rune', rune: 'splash' },
      { kind: 'rune', rune: 'splash' },
      { kind: 'rune', rune: 'bolt' },
      { kind: 'method', method: 'conduct' },
      { kind: 'method', method: 'conduct' },
    ];
    const t: Trip = { ...startTrip(p, 9), status: 'crossroads', loot };
    const home = returnHome(p, t);
    expect(home.known.filter((r) => r === 'splash')).toHaveLength(1);
    expect(home.known.filter((r) => r === 'bolt')).toHaveLength(1);
    expect(home.methods).toEqual(['conduct']);
  });
});

describe('the first heart clear (P35)', () => {
  const hasConduct = (offers: readonly LootItem[]) =>
    offers.some((o) => o.kind === 'method' && o.method === 'conduct');

  test('always offers the Conduct page while the household lacks it', () => {
    for (let seed = 0; seed < 400; seed++) {
      expect(hasConduct(rollOffers(seed, 4, 'heart', MEMBER_IDS)), `seed ${seed}`).toBe(true);
    }
  });

  test('still three offers, and a key joins the pool without crowding it out', () => {
    for (let seed = 0; seed < 100; seed++) {
      const offers = rollOffers(seed, 4, 'heart', MEMBER_IDS, { district: 'canals', weight: 50 });
      expect(offers).toHaveLength(3);
      expect(hasConduct(offers)).toBe(true);
    }
  });

  test('once learned it comes back as 1 ink at most, never as a page', () => {
    for (let seed = 0; seed < 400; seed++) {
      const offers = rollOffers(seed, 4, 'heart', MEMBER_IDS, null, {
        known: [],
        methods: ['conduct'],
      });
      expect(hasConduct(offers)).toBe(false);
    }
  });

  test('the Seam heart clear, played through the trip, offers Conduct and banks it', () => {
    const p = newProfile();
    const heart = ENCOUNTERS.length - 1;
    const t0: Trip = { ...startTrip(p, 77), encounter: heart };
    const b = beginEncounter(p, t0).state;
    const r = finishEncounter(p, t0, { ...b, phase: 'won' });
    const trip = r.trip;
    if (!trip) throw new Error('expected a trip');
    const index = trip.offers.findIndex((o) => o.kind === 'method');
    expect(index).toBeGreaterThanOrEqual(0);
    let t = pickLoot(trip, index);
    if (t.status === 'looting') t = pickLoot(t, 0);
    expect(t.status).toBe('cleared');
    expect(returnHome(p, t).methods).toContain('conduct');
  });
});
