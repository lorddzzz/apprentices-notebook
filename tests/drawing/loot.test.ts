import { describe, expect, it } from 'vitest';
import { type DistrictId, type Drawing, LOOT_TABLES, type LootTableId } from '$data';
import { DRAWN_LOOT } from '$data/drawing';
import { type Profile, rollOffers, roomRoll, roomsOf, startTrip, type Trip } from '$engine';
import { INKED_TRIP } from '$engine/districts/inkedPage';
import { weightBand } from '$engine/drawing';
import { drawnOffers, sourcesOf } from '$engine/drawing/loot';
import { ownedBy } from '$engine/trip/offers';
import { shapeInput, shapeOf } from '$engine/trip/shape';
import { FIXTURE_DRAWINGS, fullHousehold } from './fixtures';

/** EN-8: loot by depth (P7, P16, P17). */

const INKED: DistrictId = 'inkedPage';

const HEAVY: Drawing = {
  name: 'The deep end',
  rule: 'canals:current',
  foes: ['eel', 'moth', 'sentry'],
  pieces: [],
  shape: 'plain',
  length: 6,
  heart: 'registrar',
};

const DRAWINGS: readonly Drawing[] = [...FIXTURE_DRAWINGS, HEAVY];

const withPage = (p: Profile, d: Drawing): Profile => ({
  ...p,
  drawings: [d, null, null],
  // Capstones raise the pen so the heavy drawing fits (P6).
  footnotes: {
    ...p.footnotes,
    bolt: { points: 9, slots: {}, capstone: 'x' },
    splash: { points: 9, slots: {}, capstone: 'x' },
    touch: { points: 9, slots: {}, capstone: 'x' },
  },
  city: { ...p.city, open: [...new Set([...p.city.open, INKED])] },
});

const tripOf = (p: Profile, d: Drawing, seed: number): Trip =>
  startTrip(withPage(p, d), seed, INKED, { page: 0 });

/** The real offers of a room: `roomRoll` and `rollOffers` as the trip runs them. */
function rolled(p: Profile, t: Trip, room: number) {
  const at = { ...t, encounter: room };
  const enc = roomsOf(at)[room];
  if (!enc) throw new Error(`No room ${room}`);
  const roll = roomRoll(at, enc, null, undefined, p);
  const withKit = { profile: p, trip: at, ...(roll.registry ? { registry: roll.registry } : {}) };
  return {
    roll,
    items: rollOffers(at.seed, room, roll.table, at.party, null, ownedBy(p, at), withKit),
  };
}

/** Pages of the canals and the Seam's deep table the poor household lacks. */
const POOR_LACKS: readonly string[] = ['jar', 'fuse', 'afterglow', 'fork', 'bend', 'brass'];
const poorHousehold = (): Profile => {
  const p = fullHousehold();
  return { ...p, known: p.known.filter((r) => !POOR_LACKS.includes(r)), methods: [] };
};

const pagesOf = (districts: readonly DistrictId[]) => {
  const ids = Object.keys(LOOT_TABLES) as LootTableId[];
  const own = (d: DistrictId) =>
    ids.filter((id) =>
      d === 'seam'
        ? ['shallow', 'deep', 'heart'].includes(id)
        : d === 'canals'
          ? id.startsWith('canal')
          : id.startsWith(`${d}:`),
    );
  const specs = districts.flatMap((d) =>
    own(d).flatMap((t) => LOOT_TABLES[t].entries.map((e) => e.spec)),
  );
  return {
    runes: new Set(specs.flatMap((s) => (s.kind === 'rune' ? [s.rune] : []))),
    methods: new Set(specs.flatMap((s) => (s.kind === 'method' ? [s.method] : []))),
    solvents: new Set(specs.flatMap((s) => (s.kind === 'solvent' ? [s.solvent] : []))),
  };
};

const SEEDS = Array.from({ length: 50 }, (_, i) => i + 1);

/** Every room of every drawing on every seed, for a household. */
function sweep(
  p: Profile,
  each: (d: Drawing, t: Trip, room: number, items: ReturnType<typeof rolled>['items']) => void,
) {
  for (const d of DRAWINGS)
    for (const seed of SEEDS) {
      const t = tripOf(p, d, seed);
      for (let room = 0; room < d.length; room++) each(d, t, room, rolled(p, t, room).items);
    }
}

describe('EN-8: loot by depth', () => {
  it('CAL-D: placeholder metadata cannot override lent extras', () => {
    const p = poorHousehold();
    const d: Drawing = { ...HEAVY, shape: 'inkQuarter:terms', length: 5 };
    const t = tripOf(p, d, 9);
    for (const room of [0, d.length - 1]) {
      const at = { ...t, encounter: room };
      const enc = roomsOf(at)[room];
      if (!enc) throw new Error(`No room ${room}`);
      expect(enc.loot).toBe('deep');
      expect(enc.picks).toBe(room === 0 ? 1 : 2);
      const own = drawnOffers(p, at, room);
      const input = shapeInput(at, shapeOf(INKED, at), p);
      const delegated = INKED_TRIP.offersFor?.(input);
      expect(delegated).toMatchObject(own);
      const roll = roomRoll(at, enc, null, undefined, p);
      const altered = roomRoll(at, { ...enc, loot: 'shallow', picks: 99 }, null, undefined, p);
      expect({ table: altered.table, picks: altered.picks }).toEqual({
        table: roll.table,
        picks: roll.picks,
      });
      expect(roll.picks).toBe(own.picks);
      const items = rollOffers(at.seed, room, roll.table, at.party, null, ownedBy(p, at), {
        profile: p,
        trip: at,
        ...(roll.registry ? { registry: roll.registry } : {}),
      });
      const alteredItems = rollOffers(
        at.seed,
        room,
        altered.table,
        at.party,
        null,
        ownedBy(p, at),
        {
          profile: p,
          trip: at,
          ...(altered.registry ? { registry: altered.registry } : {}),
        },
      );
      expect(alteredItems).toEqual(items);
      expect(items.filter((item) => item.kind === 'inkQuarter:termed')).toHaveLength(
        room === 0 ? 1 : 0,
      );
    }
  });

  it('CAL-D: data-owned defaults preserve drawn offers and picks', () => {
    const p = poorHousehold();
    const cases = [FIXTURE_DRAWINGS[0] as Drawing, HEAVY];
    const results = cases.flatMap((d) =>
      [1, 9, 23].flatMap((seed) => {
        const t = tripOf(p, d, seed);
        return [0, d.length - 1].map((room) => drawnOffers(p, t, room));
      }),
    );
    expect(results).toMatchInlineSnapshot(`
      [
        {
          "guaranteed": [
            {
              "kind": "doorway",
            },
            {
              "kind": "rune",
              "rune": "brass",
            },
            {
              "kind": "solvent",
              "solvent": "gallnut",
            },
          ],
          "picks": 1,
          "table": "lowerSeam",
        },
        {
          "guaranteed": [
            {
              "kind": "method",
              "method": "conduct",
            },
            {
              "kind": "solvent",
              "solvent": "cinder",
            },
            {
              "kind": "rune",
              "rune": "brass",
            },
          ],
          "picks": 2,
          "table": "lowerSeam",
        },
        {
          "guaranteed": [
            {
              "kind": "ink",
            },
            {
              "kind": "method",
              "method": "conduct",
            },
            {
              "kind": "rune",
              "rune": "brass",
            },
          ],
          "picks": 1,
          "table": "lowerSeam",
        },
        {
          "guaranteed": [
            {
              "kind": "solvent",
              "solvent": "cinder",
            },
            {
              "kind": "rune",
              "rune": "brass",
            },
            {
              "kind": "rune",
              "rune": "fork",
            },
          ],
          "picks": 2,
          "table": "lowerSeam",
        },
        {
          "guaranteed": [
            {
              "amount": 1,
              "kind": "vellum",
            },
            {
              "kind": "ink",
            },
            {
              "kind": "rune",
              "rune": "fork",
            },
          ],
          "picks": 1,
          "table": "lowerSeam",
        },
        {
          "guaranteed": [
            {
              "kind": "rune",
              "rune": "fork",
            },
            {
              "kind": "solvent",
              "solvent": "gallnut",
            },
            {
              "kind": "rune",
              "rune": "bend",
            },
          ],
          "picks": 2,
          "table": "lowerSeam",
        },
        {
          "guaranteed": [
            {
              "kind": "ink",
            },
            {
              "kind": "rune",
              "rune": "brass",
            },
            {
              "kind": "solvent",
              "solvent": "cinder",
            },
          ],
          "picks": 2,
          "table": "lowerSeam",
        },
        {
          "guaranteed": [
            {
              "kind": "rune",
              "rune": "bend",
            },
            {
              "kind": "rune",
              "rune": "fork",
            },
            {
              "kind": "method",
              "method": "repeat",
            },
          ],
          "picks": 2,
          "table": "lowerSeam",
        },
        {
          "guaranteed": [
            {
              "kind": "solvent",
              "solvent": "wick",
            },
            {
              "kind": "solvent",
              "solvent": "pitch",
            },
            {
              "kind": "rune",
              "rune": "bend",
            },
          ],
          "picks": 2,
          "table": "lowerSeam",
        },
        {
          "guaranteed": [
            {
              "kind": "solvent",
              "solvent": "gallnut",
            },
            {
              "kind": "solvent",
              "solvent": "pitch",
            },
            {
              "kind": "rune",
              "rune": "brass",
            },
          ],
          "picks": 2,
          "table": "lowerSeam",
        },
        {
          "guaranteed": [
            {
              "kind": "solvent",
              "solvent": "quicksilver",
            },
            {
              "kind": "solvent",
              "solvent": "pitch",
            },
            {
              "kind": "method",
              "method": "conduct",
            },
          ],
          "picks": 2,
          "table": "lowerSeam",
        },
        {
          "guaranteed": [
            {
              "kind": "method",
              "method": "repeat",
            },
            {
              "kind": "solvent",
              "solvent": "graphite",
            },
            {
              "kind": "method",
              "method": "conduct",
            },
          ],
          "picks": 2,
          "table": "lowerSeam",
        },
      ]
    `);
  });

  it('EN-8: offers come only from source districts or basics', () => {
    let pages = 0;
    let solvents = 0;
    sweep(poorHousehold(), (d, _t, _room, items) => {
      const src = pagesOf(sourcesOf(d));
      expect(items.length).toBeGreaterThan(0);
      pages += items.filter((i) => i.kind === 'rune' || i.kind === 'method').length;
      solvents += items.filter((i) => i.kind === 'solvent').length;
      for (const i of items) {
        expect(['rune', 'method', 'solvent', 'ink', 'vellum', 'doorway']).toContain(i.kind);
        if (i.kind === 'rune') expect(src.runes.has(i.rune)).toBe(true);
        if (i.kind === 'method') expect(src.methods.has(i.method)).toBe(true);
      }
    });
    expect(pages).toBeGreaterThan(0);
    expect(solvents).toBeGreaterThan(0);
    expect(sourcesOf(FIXTURE_DRAWINGS[0] as Drawing)).toEqual(['seam']);
    expect(sourcesOf(FIXTURE_DRAWINGS[1] as Drawing)).toEqual(['seam', 'canals']);
  });

  it('EN-8: a page you hold is never offered', () => {
    for (const p of [poorHousehold(), fullHousehold()])
      sweep(p, (_d, _t, _room, items) => {
        for (const i of items) {
          if (i.kind === 'rune') expect(p.known).not.toContain(i.rune);
          if (i.kind === 'method') expect(p.methods).not.toContain(i.method);
        }
      });
    // The derived table itself leaves a held page out, so no ink stands in for it.
    const p = poorHousehold();
    for (const seed of SEEDS) {
      const t = tripOf(p, DRAWINGS[1] as Drawing, seed);
      for (const s of drawnOffers(p, t, 0).guaranteed ?? []) {
        if (s.kind === 'rune') expect(p.known).not.toContain(s.rune);
        if (s.kind === 'method') expect(p.methods).not.toContain(s.method);
      }
    }
  });

  it('EN-8: solvents come only from drawn districts', () => {
    sweep(poorHousehold(), (d, _t, _room, items) => {
      const src = pagesOf(sourcesOf(d));
      for (const i of items)
        if (i.kind === 'solvent') expect(src.solvents.has(i.solvent)).toBe(true);
    });
    // Never a key, a recruit or a rival page.
    sweep(poorHousehold(), (_d, _t, _room, items) => {
      for (const i of items) expect(['key', 'recruit', 'bindEvent']).not.toContain(i.kind);
    });
  });

  it('EN-8: a heavy drawing gives two picks before the heart and at it', () => {
    const p = fullHousehold();
    expect(weightBand(HEAVY)).toBe('heavy');
    const t = tripOf(p, HEAVY, 3);
    for (let room = 0; room < HEAVY.length; room++)
      expect(drawnOffers(p, t, room).picks).toBe(DRAWN_LOOT.heavyPicksBeforeHeart);
    expect(rolled(p, t, 0).roll.picks).toBe(2);
    expect(rolled(p, t, HEAVY.length - 1).roll.picks).toBe(2);
    // A light drawing gives one pick, and two at the heart.
    const light = FIXTURE_DRAWINGS[0] as Drawing;
    const lt = tripOf(p, light, 3);
    expect(weightBand(light)).toBe('light');
    expect(drawnOffers(p, lt, 0).picks).toBe(1);
    expect(drawnOffers(p, lt, light.length - 1).picks).toBe(DRAWN_LOOT.heartPicks);
  });

  it('EN-8: the same trip rolls the same offers', () => {
    const p = fullHousehold();
    const t = tripOf(p, HEAVY, 9);
    expect(drawnOffers(p, t, 2)).toEqual(drawnOffers(p, tripOf(p, HEAVY, 9), 2));
  });
});
