import { describe, expect, test } from 'vitest';
import type { DistrictId, RuneId } from '$data';
import {
  BRIDGE_RECRUIT_KIT,
  BRIDGE_ROOMS_34,
  BRIDGES_KIT,
  BRIDGES_LEDGER,
  PUSHED_PAGE_ROOMS,
  spanVariantPool,
  WARDEN_CARD,
  WATCHPOST_SCENE,
} from '$data/districts/bridges';
import { BRIDGE_TUNING, type SpanKind } from '$data/districts/bridges/types';
import {
  compiledFor,
  createBattle,
  FOUNDERS,
  newProfile,
  type Profile,
  startTrip,
  type Trip,
} from '$engine';
import { BIND_EVENT_KIND, PUSHED_GUARANTEE } from '$engine/districts/bridges/guarantee';
import { cracksOf } from '$engine/districts/bridges/support';
import { type BridgesState, COLLAPSE_RULE_ID } from '$engine/districts/bridges/types';
import { joinHousehold } from '$engine/household';
import { parseBoard } from '$engine/notation';
import { recruitOffers, waitingFor } from '$engine/recruits';
import { checkRoom } from '$engine/rooms';
import { grantBindEvent } from '$engine/run';
import { bankLoot, offerRegistry, parseLootItem } from '$engine/trip/offerKinds';
import { rollOffers } from '$engine/trip/offers';
import { recruitCard } from '../../../src/app/lootviews';

/** BR-10: rooms 3 and 4 (board integrity), the watchpost, the warden's card and the pushed page. */

const boardOf = (layout: string) =>
  createBattle({
    title: 't',
    board: layout,
    seed: 1,
    edge: 'drop',
    lineup: FOUNDERS,
    party: Object.fromEntries(
      FOUNDERS.map((id) => [id, { spells: compiledFor(newProfile(), id).spells }]),
    ),
  }).state;

interface Entry {
  room: number;
  name: string;
  kind: SpanKind;
  layout: string;
}
const ENTRIES: Entry[] = BRIDGE_ROOMS_34.flatMap((room, i) =>
  room.variants.map((v, k): Entry => {
    const r = i + 2;
    return {
      room: r,
      name: v.name,
      kind: spanVariantPool(r, 'sound').includes(k) ? 'sound' : 'crumbling',
      layout: v.layout,
    };
  }),
);
const key = (c: { x: number; y: number }) => `${c.x},${c.y}`;

describe('BR-10 rooms 3 and 4', () => {
  test('4 boards each, 2 sound + 2 crumbling by the pools; the watchpost is room 3', () => {
    expect(BRIDGE_ROOMS_34.map((r) => r.variants.length)).toEqual([4, 4]);
    expect(BRIDGE_ROOMS_34.map((r) => r.title)).toEqual(['The watchpost', 'The tollhouse span']);
    expect(BRIDGE_ROOMS_34.map((r) => r.depth)).toEqual([3, 4]);
    for (const next of [2, 3]) {
      expect(spanVariantPool(next, 'sound')).toEqual([0, 1]);
      expect(spanVariantPool(next, 'crumbling')).toEqual([2, 3]);
    }
    expect(ENTRIES.map((e) => e.kind)).toEqual([
      ...['sound', 'sound', 'crumbling', 'crumbling'],
      ...['sound', 'sound', 'crumbling', 'crumbling'],
    ]);
  });

  test('kept out of the live kit: still roomless and drawing, no recruit placed', () => {
    expect(BRIDGES_KIT.rooms).toEqual([]);
    expect(BRIDGES_KIT.gate).toEqual({ kind: 'drawing' });
    expect(BRIDGES_KIT.recruit).toBeUndefined();
  });

  test('names are present and distinct', () => {
    const names = ENTRIES.map((e) => e.name);
    expect(new Set(names).size).toBe(names.length);
  });

  describe.each(ENTRIES)('$name ($kind, room $room)', (e) => {
    const spec = parseBoard(e.layout);
    const state = boardOf(e.layout);
    const stone = e.kind === 'sound' ? BRIDGE_TUNING.stone.sound : BRIDGE_TUNING.stone.crumbling;

    test('passes checkRoom and the size bands', () => {
      expect(checkRoom(e.layout)).toEqual([]);
      if (e.kind === 'sound') {
        expect(spec.width).toBeGreaterThanOrEqual(6);
        expect(spec.height).toBe(9);
      } else {
        expect(spec.width).toBeLessThanOrEqual(6);
        expect(spec.height).toBeGreaterThanOrEqual(6);
        expect(spec.height).toBeLessThanOrEqual(7);
      }
    });

    test('every standable tile is span or pier, with the span kind stone', () => {
      const tiles = state.tiles.filter((t) => !t.terrain.drop);
      expect(tiles.length).toBeGreaterThan(0);
      const rule = state.rules?.[COLLAPSE_RULE_ID] as BridgesState;
      for (const t of tiles) expect(t.piece, 'bare floor').not.toBeNull();
      expect(Object.values(rule.stone).every((n) => n === stone)).toBe(true);
      expect(state.edge).toBe('drop');
    });

    test('foes are the staff; crumbling boards have one pier and two foes', () => {
      const foes = state.units.filter((u) => u.kind === 'enemy');
      const ids: string[] = ['warden', 'gargoyle', 'mason'];
      expect(foes.length).toBeGreaterThanOrEqual(2);
      for (const u of foes) expect(ids).toContain(u.def);
      const piers = state.tiles.filter((t) => t.piece?.id === 'bridges:pier').length;
      expect(piers).toBeGreaterThanOrEqual(1);
      if (e.kind === 'crumbling') {
        expect(piers).toBe(1);
        expect(foes.length).toBe(2);
      }
    });

    test('nothing starts cracked, enough start points, all three tiles from a foe', () => {
      expect(cracksOf(state)).toEqual([]);
      expect(spec.starts.length).toBeGreaterThanOrEqual(BRIDGE_TUNING.minStarts);
      for (const p of spec.starts) {
        for (const u of spec.units) {
          expect(Math.abs(p.x - u.at.x) + Math.abs(p.y - u.at.y)).toBeGreaterThanOrEqual(3);
        }
      }
    });

    test('a section can be cut (one or two tiles) while a start stays supported', () => {
      const rule = state.rules?.[COLLAPSE_RULE_ID] as BridgesState;
      const tiles = Object.keys(rule.stone);
      const starts = spec.starts.map(key);
      const works = (cuts: string[]) => {
        const s = structuredClone(state);
        const r = s.rules?.[COLLAPSE_RULE_ID] as BridgesState;
        for (const c of cuts) r.stone[c] = 0;
        const cracked = new Set(cracksOf(s).map(key));
        const extra = [...cracked].filter((c) => !cuts.includes(c));
        return extra.length > 0 && starts.some((p) => !cracked.has(p));
      };
      const single = tiles.filter((t) => works([t]));
      const pairs = tiles.flatMap((a, i) => tiles.slice(i + 1).map((b) => [a, b] as string[]));
      expect(single.length > 0 || pairs.some((p) => works(p))).toBe(true);
    });
  });
});

// ── The watchpost's recruit ──────────────────────────────

const ROOM3 = 2;
const KIT = { bridges: BRIDGE_RECRUIT_KIT };
const card = { kind: 'recruit', apprentice: 'warden' } as const;
const page = (rune: RuneId) => ({ kind: 'rune', rune }) as const;

const heard = (...known: readonly RuneId[]): Profile => {
  const p = newProfile();
  return {
    ...p,
    known: [...new Set([...p.known, ...known])],
    city: { ...p.city, heard: ['seam', 'bridges'], fresh: [] },
  };
};
const tripAt = (p: Profile, room: number, loot: Trip['loot'] = []): Trip => ({
  ...startTrip(p, 11),
  district: 'bridges' as DistrictId,
  encounter: room,
  loot,
});

describe('the defector warden at the watchpost', () => {
  test('placement data: room 3, with a Hold line for rooms 1 and 2', () => {
    expect(BRIDGE_RECRUIT_KIT.recruit).toEqual([{ apprentice: 'warden', room: ROOM3 }]);
    expect(BRIDGE_RECRUIT_KIT.recruitPages).toEqual([
      { for: 'warden', runes: ['hold'], rooms: [0, 1] },
    ]);
  });

  test('hidden until Hold is owned: no card without it', () => {
    const p = heard();
    expect(recruitOffers(p, tripAt(p, ROOM3), ROOM3, KIT)).toEqual([]);
  });

  test('Hold known, or picked this trip: her card shows in room 3 only', () => {
    const p = heard();
    expect(recruitOffers(p, tripAt(p, ROOM3, [page('hold')]), ROOM3, KIT)).toEqual([card]);
    const q = heard('hold');
    expect(recruitOffers(q, tripAt(q, ROOM3), ROOM3, KIT)).toEqual([card]);
    for (const room of [0, 1, 3, 4]) {
      expect(recruitOffers(q, tripAt(q, room), room, KIT), `room ${room + 1}`).toEqual([]);
    }
  });

  test('never on another district’s trip, nor once joined or already in the loot', () => {
    const q = heard('hold');
    const away = { ...tripAt(q, ROOM3), district: 'canals' as DistrictId };
    expect(recruitOffers(q, away, ROOM3, KIT)).toEqual([]);
    const joined = joinHousehold(q, 'warden');
    expect(recruitOffers(joined, tripAt(joined, ROOM3), ROOM3, KIT)).toEqual([]);
    expect(recruitOffers(q, tripAt(q, ROOM3, [card]), ROOM3, KIT)).toEqual([]);
  });

  test('waiting for her only once the bridges are heard', () => {
    const base = heard();
    const unheard: Profile = { ...base, city: { ...base.city, heard: ['seam'] } };
    expect(waitingFor(unheard)).not.toContain('warden');
    expect(waitingFor(base)).toContain('warden');
  });

  test('rolled through offersFor: the card follows the normal offers in room 3 only', () => {
    const p = heard('hold');
    const at = (room: number) =>
      rollOffers(11, room, 'bridges:sound', FOUNDERS, null, undefined, {
        profile: p,
        trip: tripAt(p, room),
      });
    // the live kit does not place her yet (BR-18), so nothing rolls from the registry
    expect(at(ROOM3).some((i) => i.kind === 'recruit')).toBe(false);
  });

  test('her card copy', () => {
    expect(recruitCard({ apprentice: 'warden' })).toMatchObject({
      title: 'Defector warden',
      text: expect.stringContaining('Someone joins you.'),
    });
    expect(WARDEN_CARD.blurb).toMatch(/Hold/);
    expect(WATCHPOST_SCENE).toMatch(/watchpost/);
    expect(BRIDGES_LEDGER.some((l) => l.at.kind === 'watchpost')).toBe(true);
  });
});

// ── The pushed page ──────────────────────────────────────

const withBind = (): Profile => {
  const p = heard();
  return { ...p, methods: [...new Set([...p.methods, 'bind' as const])] };
};
const ctxOf = (p: Profile, room: number, loot: Trip['loot'] = []) => ({
  profile: p,
  trip: tripAt(p, room, loot),
  room,
  table: 'bridges:sound' as const,
  seed: 1,
});
const PUSHED = { kind: 'bindEvent', event: 'pushed' } as const;

describe('the pushed page (Bind)', () => {
  test('rooms 3 and 4 only, and only for a household that owns Bind', () => {
    expect(PUSHED_PAGE_ROOMS).toEqual([2, 3]);
    const p = withBind();
    for (const r of [2, 3]) expect(PUSHED_GUARANTEE(ctxOf(p, r))).toEqual({ must: PUSHED });
    for (const r of [0, 1, 4]) expect(PUSHED_GUARANTEE(ctxOf(p, r))).toEqual({});
    expect(PUSHED_GUARANTEE(ctxOf(heard(), 2))).toEqual({});
  });

  test('not once stored, not once picked this trip, not on another district', () => {
    const p = withBind();
    expect(PUSHED_GUARANTEE(ctxOf(grantBindEvent(p, 'pushed'), 2))).toEqual({});
    expect(PUSHED_GUARANTEE(ctxOf(p, 3, [PUSHED]))).toEqual({});
    const away = ctxOf(p, 2);
    away.trip = { ...away.trip, district: 'canals' as DistrictId };
    expect(PUSHED_GUARANTEE(away)).toEqual({});
  });

  test('registered in the game registry, so a roll offers it first and only once', () => {
    expect(offerRegistry().kinds.bindEvent).toBeDefined();
    const p = withBind();
    const offers = rollOffers(11, 2, 'bridges:sound', FOUNDERS, null, undefined, {
      profile: p,
      trip: tripAt(p, 2),
    });
    expect(offers.filter((i) => i.kind === 'bindEvent')).toEqual([PUSHED]);
    expect(offers).toHaveLength(3);
    const again = rollOffers(11, 3, 'bridges:sound', FOUNDERS, null, undefined, {
      profile: p,
      trip: tripAt(p, 3, [PUSHED]),
    });
    expect(again.some((i) => i.kind === 'bindEvent')).toBe(false);
    const none = rollOffers(11, 2, 'bridges:sound', FOUNDERS, null, undefined, {
      profile: heard(),
      trip: tripAt(heard(), 2),
    });
    expect(none.some((i) => i.kind === 'bindEvent')).toBe(false);
  });

  test('picking stores it in the loot; banking grants the event; a wipe loses it', () => {
    const p = withBind();
    const t = BIND_EVENT_KIND.onPick(tripAt(p, 2), PUSHED);
    expect(t.loot).toEqual([PUSHED]);
    const banked = bankLoot(p, t.loot);
    expect(banked.bindEvents).toContain('pushed');
    expect(bankLoot(banked, t.loot).bindEvents.filter((e) => e === 'pushed')).toHaveLength(1);
    expect(BIND_EVENT_KIND.onWipe).toBeUndefined();
  });

  test('save parsing accepts only a known event', () => {
    expect(parseLootItem(PUSHED)).toEqual(PUSHED);
    expect(parseLootItem({ kind: 'bindEvent', event: 'nope' })).toBeNull();
    expect(parseLootItem({ kind: 'bindEvent', event: 'pushed', extra: 1 })).toBeNull();
  });
});
