import { describe, expect, test } from 'vitest';
import { LOOT_TABLES, type LootTableId, MEMBER_IDS } from '$data';
import { newProfile, parseSaveData, startTrip } from '$engine';
import type { Json, KitId, OfferContributor, OfferKind } from '$engine/districts/types';
import { pickLoot, returnHome } from '$engine/trip/crossroads';
import {
  atLimit,
  buildOfferRegistry,
  kindOf,
  OFFER_SOURCES,
  type OfferRegistry,
  overLimit,
  parseLootItem,
  wipeLoot,
} from '$engine/trip/offerKinds';
import { ownedBy, rollOffers } from '$engine/trip/offers';
import type { LootItem, Profile, Trip } from '$engine/types';

/** Fixture kinds: a token that banks as ink and is lost on a wipe, a charm that survives one. */
type Token = { kind: KitId; data: Json; held?: true };
const TOKEN_ID: KitId = 'canals:token';
const CHARM_ID: KitId = 'canals:charm';
const token = (n: number): LootItem => ({ kind: TOKEN_ID, data: n });
const charm: LootItem = { kind: CHARM_ID, data: null };

const parseData =
  (id: KitId) =>
  (raw: unknown): Token | null => {
    if (typeof raw !== 'object' || raw === null) return null;
    const r = raw as Record<string, unknown>;
    return r.kind === id && typeof r.data === 'number' ? { kind: id, data: r.data } : null;
  };

const TOKEN: OfferKind<Token> = {
  id: TOKEN_ID,
  onPick: (t, i) => ({ ...t, loot: [...t.loot, i] }),
  onBank: (p, i) => ({ ...p, ink: p.ink + (typeof i.data === 'number' ? i.data : 0) }),
  limitPerTrip: 1,
  parse: parseData(TOKEN_ID),
  card: 'token',
};
const CHARM: OfferKind<Token> = {
  id: CHARM_ID,
  onPick: (t, i) => ({ ...t, loot: [...t.loot, i], picksLeft: t.picksLeft + 1 }),
  onBank: (p) => p,
  onWipe: (p) => ({ ...p, vellum: p.vellum + 5 }),
  parse: (raw) =>
    typeof raw === 'object' && raw !== null && (raw as { kind?: unknown }).kind === CHARM_ID
      ? { kind: CHARM_ID, data: null }
      : null,
  card: 'charm',
};

const withFixtures = (contributors: OfferContributor[] = []): OfferRegistry =>
  buildOfferRegistry([...OFFER_SOURCES, { kinds: [TOKEN, CHARM], contributors }]);

const TABLES = Object.keys(LOOT_TABLES) as LootTableId[];
const fresh = (): { p: Profile; t: Trip } => {
  const p = newProfile();
  return { p, t: startTrip(p, 11) };
};

describe('offer-kind registry (DK-7)', () => {
  test('with no contributors a roll is the plain roll (same seeds, same offers)', () => {
    const { p, t } = fresh();
    for (const table of TABLES)
      for (let seed = 1; seed <= 40; seed++)
        for (const enc of [0, 2, 4]) {
          const owned = ownedBy(p, t);
          const plain = rollOffers(seed, enc, table, MEMBER_IDS, null, owned);
          const kit = rollOffers(seed, enc, table, MEMBER_IDS, null, owned, {
            profile: p,
            trip: t,
          });
          expect(kit, `${table} ${seed} ${enc}`).toEqual(plain);
        }
  });

  test('the key kind joins the pool exactly where the legacy key argument did', () => {
    const { p, t } = fresh();
    const core = buildOfferRegistry(OFFER_SOURCES);
    const key = kindOf({ kind: 'key' }, core);
    const keyed = buildOfferRegistry([
      {
        kinds: Object.values(core.kinds).map((k) =>
          k === key
            ? { ...k, joinPool: () => [{ spec: { kind: 'key', district: 'canals' }, weight: 50 }] }
            : k,
        ) as OfferKind[],
      },
    ]);
    for (let seed = 1; seed <= 30; seed++) {
      const legacy = rollOffers(seed, 4, 'heart', MEMBER_IDS, { district: 'canals', weight: 50 });
      const kit = rollOffers(seed, 4, 'heart', MEMBER_IDS, null, undefined, {
        profile: p,
        trip: t,
        registry: keyed,
      });
      expect(kit, `seed ${seed}`).toEqual(legacy);
    }
  });

  test("a contributor's must follows the table's guaranteed page; extra follows the three", () => {
    const { p, t } = fresh();
    const seen: number[] = [];
    const reg = withFixtures([
      (ctx) => {
        seen.push(ctx.room);
        return { must: { kind: TOKEN_ID, data: 3 }, extra: [charm] };
      },
    ]);
    for (let seed = 1; seed <= 20; seed++) {
      const offers = rollOffers(seed, 4, 'heart', MEMBER_IDS, null, undefined, {
        profile: p,
        trip: t,
        registry: reg,
      });
      expect(offers[0]).toEqual({ kind: 'method', method: 'conduct' });
      expect(offers[1]).toEqual(token(3));
      expect(offers).toHaveLength(4);
      expect(offers[3]).toEqual(charm);
      // On a table with no guarantee the must leads.
      const deep = rollOffers(seed, 2, 'deep', MEMBER_IDS, null, undefined, {
        profile: p,
        trip: t,
        registry: reg,
      });
      expect(deep[0]).toEqual(token(3));
      expect(deep.slice(1, 3).every((i) => i.kind !== TOKEN_ID && i.kind !== CHARM_ID)).toBe(true);
      expect(deep[3]).toEqual(charm);
    }
    expect(seen).toHaveLength(40);
  });

  test('a kind at its limit is never offered', () => {
    const { p, t } = fresh();
    const reg = withFixtures([() => ({ must: { kind: TOKEN_ID, data: 1 }, extra: [token(2)] })]);
    const roll = (trip: Trip) =>
      rollOffers(9, 2, 'deep', MEMBER_IDS, null, undefined, { profile: p, trip, registry: reg });
    // The must takes the one slot; the extra token would be a second.
    expect(roll(t).filter((i) => i.kind === TOKEN_ID)).toEqual([token(1)]);
    expect(roll({ ...t, loot: [token(5)] }).some((i) => i.kind === TOKEN_ID)).toBe(false);
    expect(atLimit([token(1)], token(2), reg)).toBe(true);
    expect(overLimit([token(1), token(2)], reg)).toBe(true);
    expect(overLimit([token(1), charm, charm], reg)).toBe(false);
    // A recruit is limited per apprentice.
    const a: LootItem = { kind: 'recruit', apprentice: 'stoker' };
    const b: LootItem = { kind: 'recruit', apprentice: 'draughtsman' };
    expect(overLimit([a, b], reg)).toBe(false);
    expect(overLimit([a, a], reg)).toBe(true);
  });

  test('picked kinds bank on return and vanish on a wipe unless their kind keeps something', () => {
    const { p, t } = fresh();
    const reg = withFixtures();
    let trip: Trip = { ...t, status: 'looting', offers: [charm, token(4)], picksLeft: 1 };
    trip = pickLoot(trip, 0, reg);
    // The charm raises picks back (IQ D4 shape), so the token can be taken too.
    expect(trip.status).toBe('looting');
    trip = pickLoot(trip, 0, reg);
    expect(trip.loot).toEqual([charm, token(4)]);
    expect(trip.status).toBe('crossroads');
    const home = returnHome(p, trip, reg);
    expect(home.ink).toBe(p.ink + 4);
    const wiped = wipeLoot(p, trip.loot, reg);
    expect(wiped.ink).toBe(p.ink);
    expect(wiped.vellum).toBe(p.vellum + 5);
    expect(wipeLoot(p, [token(4)], reg)).toBe(p);
  });

  test('the doorway goes through its kind: the pick is spent and nothing is banked', () => {
    const { t } = fresh();
    const trip: Trip = {
      ...t,
      status: 'looting',
      offers: [{ kind: 'doorway' }, { kind: 'vellum', amount: 1 }],
      picksLeft: 2,
    };
    const after = pickLoot(trip, 0);
    expect(after.status).toBe('doorway');
    expect(after.loot).toEqual([]);
    expect(after.picksLeft).toBe(1);
  });

  test('kinds parse back from a save', () => {
    const reg = withFixtures();
    for (const item of [token(7), charm, { kind: 'key', district: 'canals' } as LootItem])
      expect(parseLootItem(JSON.parse(JSON.stringify(item)), reg)).toEqual(item);
    expect(parseLootItem({ kind: TOKEN_ID, data: 'x' }, reg)).toBeNull();
    expect(parseLootItem({ kind: 'canals:nobody', data: 1 }, reg)).toBeNull();
    expect(parseLootItem({ kind: 'rune', rune: 'nope' }, reg)).toBeNull();
    // Unregistered in the game: a fixture kind in a real save is refused.
    expect(parseLootItem(token(1))).toBeNull();
  });

  test('a recruit round-trips through save parsing and two keys are refused', () => {
    const { p, t } = fresh();
    const recruit: LootItem = { kind: 'recruit', apprentice: 'stoker' };
    const save = (trip: Trip) =>
      JSON.parse(JSON.stringify({ profile: p, trip, seedCounter: 1, lastTrip: null }));
    const looting: Trip = {
      ...t,
      status: 'looting',
      loot: [recruit],
      offers: [{ kind: 'vellum', amount: 1 }],
      picksLeft: 1,
    };
    expect(parseSaveData(save(looting)).trip?.loot).toEqual([recruit]);
    expect(() => parseSaveData(save({ ...looting, offers: [recruit] }))).toThrow();
    const key: LootItem = { kind: 'key', district: 'canals' };
    expect(() => parseSaveData(save({ ...looting, loot: [key], offers: [key] }))).toThrow();
  });

  test('a duplicate kind id is refused at build time', () => {
    expect(() => buildOfferRegistry([...OFFER_SOURCES, { kinds: [TOKEN, TOKEN] }])).toThrow();
  });
});
