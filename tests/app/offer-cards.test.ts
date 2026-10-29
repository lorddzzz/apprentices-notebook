import type { Component } from 'svelte';
import { describe, expect, test, vi } from 'vitest';
import type { KitRoomDef, PaperDef } from '$data/districts/index';
import {
  type BattleState,
  beginEncounter,
  finishEncounter,
  type LootItem,
  newProfile,
  newSave,
  type Profile,
  startTrip,
  type Trip,
} from '$engine';
import type { OfferKind } from '$engine/districts/types';
import { RECRUIT_OFFERS } from '$engine/recruits/offers';
import { buildOfferRegistry, CORE_OFFERS, offerRegistry } from '$engine/trip/offerKinds';
import { lootLine } from '../../src/app/describe';
import { endBattle } from '../../src/app/flow';
import { cardKeyOf, cardPlan, fallbackLine, paperNote, recruitCard } from '../../src/app/lootviews';
import { FALLBACK_CARD, OFFER_CARDS, offerCardFor } from '../../src/ui/districts';

/**
 * DK-12: offer cards from the registry. The core kinds keep their cards, the recruit has its own,
 * a fixture district kind is drawn by its registered card or the fallback, and the room's paper is
 * reported when a win files it for the first time (one fixture paper in the Seam's second room).
 */

const LEDGER: PaperDef = {
  id: 'seam:fixture-ledger',
  district: 'seam',
  title: 'A lamp-ledger',
  hand: 'a Lamplighter',
  text: 'Fixture text.',
  group: 'Lamp-ledgers',
  found: { kind: 'room', room: 1 },
};

vi.mock('$data/districts/index', async (importOriginal) => {
  const m = await importOriginal<typeof import('$data/districts/index')>();
  return {
    ...m,
    DISTRICT_KIT: {
      ...m.DISTRICT_KIT,
      seam: {
        ...m.DISTRICT_KIT.seam,
        rooms: [{}, { lore: 'seam:fixture-ledger' }] as KitRoomDef[],
        papers: [
          {
            id: 'seam:fixture-ledger',
            district: 'seam',
            title: 'A lamp-ledger',
            hand: 'a Lamplighter',
            text: 'Fixture text.',
            group: 'Lamp-ledgers',
            found: { kind: 'room', room: 1 },
          },
        ],
      },
    },
  };
});

const CORE_ITEMS: LootItem[] = [
  { kind: 'rune', rune: 'bolt' },
  { kind: 'method', method: 'conduct' },
  { kind: 'ink', amount: 2 },
  { kind: 'solvent', solvent: 'gallnut' },
  { kind: 'vellum', amount: 1 },
  { kind: 'doorway' },
  { kind: 'key', district: 'canals' },
];

describe('the core kinds', () => {
  test('are drawn by the Loot card itself, as before', () => {
    for (const item of CORE_ITEMS) {
      expect(cardKeyOf(item)).toBe(item.kind);
      expect(cardPlan(item)).toEqual({ how: 'core' });
    }
  });

  test('keep their title and text', () => {
    expect(lootLine({ kind: 'ink', amount: 2 }).title).toBe('+2 ink');
    expect(lootLine({ kind: 'doorway' }).title).toBe('A quiet doorway');
    expect(lootLine({ kind: 'key', district: 'canals' }).text).toBe(
      'Bring it home and the way opens.',
    );
  });
});

describe('the recruit card', () => {
  const item: LootItem = { kind: 'recruit', apprentice: 'runaway' };

  test('is a registered kind drawn by the game’s recruit card', () => {
    expect(cardPlan(item)).toEqual({ how: 'key', key: 'recruit' });
    expect(offerCardFor('recruit')).toBe(OFFER_CARDS.recruit);
    expect(offerCardFor('recruit')).not.toBe(FALLBACK_CARD);
  });

  test('says someone joins you, with her token and name', () => {
    const card = recruitCard({ apprentice: 'runaway' });
    expect(card?.def.token).toBe('R');
    expect(card?.title).toBe('Lamp-pole runaway');
    expect(card?.text).toMatch(/^Someone joins you\./);
    expect(card?.text).toContain(card?.def.blurb);
  });

  test('lootLine names her instead of printing an id', () => {
    expect(lootLine(item)).toEqual({
      title: 'Lamp-pole runaway',
      text: expect.stringMatching(/^Someone joins you\./),
    });
    expect(lootLine({ kind: 'recruit', apprentice: 'nobody' as 'runaway' }).title).toBe('recruit');
  });

  test('an apprentice nobody knows has no card (the fallback draws it)', () => {
    expect(recruitCard({ apprentice: 'nobody' })).toBeNull();
  });
});

describe('a district kind', () => {
  const plunge: OfferKind = {
    id: 'bathhouses:plunge',
    onPick: (t) => t,
    onBank: (p) => p,
    parse: () => null,
    card: 'bathhouses:plunge-card',
  };
  const reg = buildOfferRegistry([CORE_OFFERS, RECRUIT_OFFERS, { kinds: [plunge] }]);
  const item: LootItem = { kind: 'bathhouses:plunge', data: { temperature: 'cold' } };

  test('is drawn by the card its kind names when a district registers one', () => {
    const Card = (() => null) as unknown as Component<{ item: unknown }>;
    const ui = { bathhouses: { offerCards: { 'bathhouses:plunge-card': Card } } };
    expect(cardPlan(item, reg)).toEqual({ how: 'key', key: 'bathhouses:plunge-card' });
    expect(offerCardFor('bathhouses:plunge-card', ui)).toBe(Card);
  });

  test('falls back to the plain card when nothing draws it', () => {
    expect(offerCardFor('bathhouses:plunge-card')).toBeUndefined();
    expect(offerCardFor('toString')).toBeUndefined();
    expect(fallbackLine(item)).toEqual({
      title: 'Plunge',
      text: expect.stringMatching(/^A find from .+\.$/),
    });
  });

  test('an unregistered kind (an old save) is the fallback too', () => {
    expect(cardKeyOf({ kind: 'bathhouses:gone' }, reg)).toBeNull();
    expect(cardPlan({ kind: 'bathhouses:gone' }, reg)).toEqual({ how: 'fallback' });
    expect(cardPlan({ kind: 'constructor' }, reg)).toEqual({ how: 'fallback' });
    expect(fallbackLine({ kind: 'bathhouses:plungePool' }).title).toBe('Plunge pool');
    expect(fallbackLine({ kind: 'strange' }).text).toBe('A strange find.');
  });

  test('the game registry holds the recruit kind with the card key the renderer registry has', () => {
    const key = cardKeyOf({ kind: 'recruit' }, offerRegistry());
    expect(key).toBe('recruit');
    expect(key && offerCardFor(key)).toBeDefined();
  });
});

describe('the paper found note', () => {
  const won = (b: BattleState): BattleState => {
    const s = structuredClone(b);
    s.phase = 'won';
    for (const u of s.units) if (u.kind === 'enemy') u.hp = 0;
    return s;
  };
  const inRoom = (p: Profile, room: number): Trip => ({
    ...startTrip(p, 7),
    encounter: room,
  });

  test('names the paper: title, hand, group', () => {
    expect(paperNote(LEDGER.id)).toEqual({
      title: 'A lamp-ledger',
      hand: 'a Lamplighter',
      group: 'Lamp-ledgers',
    });
    expect(paperNote('seam:cut')).toBeNull();
  });

  test('finishEncounter reports a paper only the first time its room is won', () => {
    const p = newProfile();
    const t = inRoom(p, 1);
    const first = finishEncounter(p, t, won(beginEncounter(p, t).state));
    expect(first.paper).toBe(LEDGER.id);
    expect(first.profile.papers).toEqual([LEDGER.id]);

    const again = finishEncounter(first.profile, t, won(beginEncounter(first.profile, t).state));
    expect(again.paper).toBeUndefined();
    expect('paper' in again).toBe(false);
  });

  test('a room with no paper reports none', () => {
    const p = newProfile();
    const t = inRoom(p, 0);
    expect(finishEncounter(p, t, won(beginEncounter(p, t).state)).paper).toBeUndefined();
  });

  test('endBattle hands it to the loot screen, once', () => {
    const save = newSave(7);
    const trip = inRoom(save.profile, 1);
    const live = { ...save, trip };
    const first = endBattle(live, won(beginEncounter(save.profile, trip).state));
    expect(first.outcome).toBe('won');
    expect(first.paper).toBe(LEDGER.id);

    const second = endBattle(
      { ...first.save, trip },
      won(beginEncounter(first.save.profile, trip).state),
    );
    expect(second.paper).toBeNull();
  });
});
