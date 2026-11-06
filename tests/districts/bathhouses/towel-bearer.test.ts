import { describe, expect, test } from 'vitest';
import type { DistrictId, RuneId } from '$data';
import {
  AREAS_GUARANTEE_ROOMS,
  AREAS_RUNES,
  BATH_RECRUIT_KIT,
  TOWEL_BEARER_CARD,
} from '$data/districts/bathhouses';
import { DISTRICT_KIT } from '$data/districts/index';
import { newProfile, type Profile, startTrip, type Trip } from '$engine';
import { AREAS_GUARANTEE } from '$engine/districts/bathhouses/trip';
import { BOIL_OVER_RULE_ID, type BoilOverState } from '$engine/districts/bathhouses/types';
import { joinHousehold } from '$engine/household';
import { guaranteesFor, recruitOffers, waitingFor } from '$engine/recruits';
import { listRules } from '$engine/rules';
import { roundEnd } from '$engine/turn';
import { recruitCard } from '../../../src/app/lootviews';
import { board, draft } from '../../scenarios/harness';

/**
 * BH-15: the towel-bearer's landmark. Her card sits in room 3 and stays hidden until an Areas page
 * is in hand; rooms 1-2 guarantee one while the household has none. The bathhouses have no rooms
 * until BH-18, so trips are built by hand and the offers read through the district's own data.
 */

const ROOM3 = 2;
// Her starter page (Splash> Steam) also needs these two Seam pages (RC derives them); the Seam supplies them.
const SEAM_REQUIRED: readonly RuneId[] = ['splash', 'steam'];
// The district opens in BH-18, which merges `BATH_RECRUIT_KIT` into its kit; until then read it directly.
const KIT = { bathhouses: BATH_RECRUIT_KIT };
const card = { kind: 'recruit', apprentice: 'towelBearer' } as const;
const page = (rune: RuneId) => ({ kind: 'rune', rune }) as const;

const heard = (...known: readonly RuneId[]): Profile => {
  const p = newProfile();
  return {
    ...p,
    known: [...new Set([...p.known, ...SEAM_REQUIRED, ...known])],
    city: { ...p.city, heard: ['seam', 'bathhouses'], fresh: [] },
  };
};
const tripAt = (p: Profile, room: number, loot: Trip['loot'] = []): Trip => ({
  ...startTrip(p, 11),
  district: 'bathhouses' as DistrictId,
  encounter: room,
  loot,
});

describe('placement data', () => {
  test('she is placed in room 3, with an Areas page line for rooms 1-2', () => {
    expect(BATH_RECRUIT_KIT.recruit).toEqual([{ apprentice: 'towelBearer', room: ROOM3 }]);
    expect(BATH_RECRUIT_KIT.recruitPages).toEqual([
      { for: 'towelBearer', any: AREAS_RUNES, rooms: AREAS_GUARANTEE_ROOMS },
    ]);
  });
});

describe('not wired before the district opens', () => {
  test('the live kit places nobody yet, so the Seam and the integrity check are untouched', () => {
    expect(DISTRICT_KIT.bathhouses?.recruit).toBeUndefined();
    expect(DISTRICT_KIT.bathhouses?.recruitPages).toBeUndefined();
  });
});

describe('hidden until her preconditions hold', () => {
  test('no Areas page owned or picked: no card in room 3', () => {
    const p = heard();
    expect(recruitOffers(p, tripAt(p, ROOM3), ROOM3, KIT)).toEqual([]);
  });

  test('not heard of the district: nothing is guaranteed by her line', () => {
    const base = heard();
    const p: Profile = { ...base, city: { ...base.city, heard: ['seam'] } };
    expect(waitingFor(p)).not.toContain('towelBearer');
    expect(guaranteesFor(p, tripAt(p, 0), 0, KIT)).toBeNull();
  });

  test('only room 3 ever carries her card', () => {
    const p = heard('vat');
    for (const room of [0, 1, 3, 4]) {
      expect(recruitOffers(p, tripAt(p, room), room, KIT), `room ${room + 1}`).toEqual([]);
    }
  });
});

describe('appears in room 3 once an Areas page was picked in rooms 1-2', () => {
  test.each(AREAS_RUNES)('%s picked in the same trip', (rune) => {
    const p = heard();
    expect(recruitOffers(p, tripAt(p, ROOM3), ROOM3, KIT)).toEqual([]);
    expect(recruitOffers(p, tripAt(p, ROOM3, [page(rune)]), ROOM3, KIT)).toEqual([card]);
  });

  test('an Areas page already known: her card shows in room 3', () => {
    const p = heard('seep');
    expect(recruitOffers(p, tripAt(p, ROOM3), ROOM3, KIT)).toEqual([card]);
  });

  test('not again once she joined, nor once her card is already in the loot', () => {
    const p = joinHousehold(heard('vat'), 'towelBearer');
    expect(recruitOffers(p, tripAt(p, ROOM3), ROOM3, KIT)).toEqual([]);
    const q = heard('vat');
    expect(recruitOffers(q, tripAt(q, ROOM3, [card]), ROOM3, KIT)).toEqual([]);
  });
});

describe('an Areas page is guaranteed in rooms 1-2 (no soft-lock)', () => {
  test('a household with no Areas rune is handed Vat in room 1 and room 2, never later', () => {
    const p = heard();
    for (const room of [0, 1]) {
      expect(guaranteesFor(p, tripAt(p, room), room, KIT), `room ${room + 1}`).toEqual(page('vat'));
    }
    for (const room of [2, 3, 4]) {
      expect(guaranteesFor(p, tripAt(p, room), room, KIT), `room ${room + 1}`).toBeNull();
    }
  });

  test('stops once any Areas page is known or in the trip loot', () => {
    for (const r of AREAS_RUNES) {
      const p = heard(r);
      expect(guaranteesFor(p, tripAt(p, 0), 0, KIT), r).toBeNull();
      const q = heard();
      expect(guaranteesFor(q, tripAt(q, 1, [page(r)]), 1, KIT), r).toBeNull();
    }
  });

  test('RC asks for the same page the district already guarantees: one card, not two', () => {
    const p = heard();
    const t = tripAt(p, 0);
    const ctx = { profile: p, trip: t, room: 0, table: 'bathhouses:h1' as const, seed: 1 };
    expect(AREAS_GUARANTEE(ctx)).toEqual({ must: guaranteesFor(p, t, 0, KIT) });
  });

  test('walk: taking the guaranteed page in room 1 makes her card appear in room 3 of that trip', () => {
    const p = heard();
    const first = guaranteesFor(p, tripAt(p, 0), 0, KIT);
    if (first?.kind !== 'rune') throw new Error('no page guaranteed');
    const loot: Trip['loot'] = [{ kind: 'rune', rune: first.rune }];
    expect(guaranteesFor(p, tripAt(p, 1, loot), 1, KIT)).toBeNull();
    expect(recruitOffers(p, tripAt(p, ROOM3, loot), ROOM3, KIT)).toEqual([card]);
  });
});

describe('the boil-over leaves her unhurt', () => {
  test('on a cloud at boil-over she takes nothing; the draughtsman beside her is hit', () => {
    const s = structuredClone(board('B~ D~ r'));
    s.rules = listRules(s, [BOIL_OVER_RULE_ID], { [BOIL_OVER_RULE_ID]: { heat: 1 } });
    s.rules = {
      ...s.rules,
      [BOIL_OVER_RULE_ID]: { ...(s.rules[BOIL_OVER_RULE_ID] as BoilOverState), pressure: 47 },
    };
    for (const u of s.units) if (u.kind === 'enemy') u.intent = null;
    const bearer = s.units.find((u) => u.id === 'towelBearer');
    expect(bearer, 'the board seats her').toBeDefined();
    const r = draft(s, (ctx) => roundEnd(ctx));
    const hits = (id: string) => r.events.filter((e) => e.type === 'damage' && e.target.id === id);
    expect(hits('towelBearer')).toEqual([]);
    expect(r.events.filter((e) => e.type === 'unharmed')).toHaveLength(1);
    expect(hits('draughtsman')).toHaveLength(1);
    expect(r.state.units.find((u) => u.id === 'towelBearer')?.hp).toBe(bearer?.hp);
  });
});

describe('card copy', () => {
  test('the recruit card names her and says someone joins; the district keeps its own line', () => {
    expect(recruitCard({ apprentice: 'towelBearer' })).toMatchObject({
      title: 'Towel-bearer',
      text: expect.stringContaining('Someone joins you.'),
    });
    expect(TOWEL_BEARER_CARD.blurb).toMatch(/boil-over/);
  });
});
