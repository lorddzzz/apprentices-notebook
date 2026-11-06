import type { BindEvent } from '$data';
import { HOLD_GUARANTEE_ROOMS, PUSHED_PAGE_ROOMS } from '$data/districts/bridges';
import { grantBindEvent } from '../../run';
import type { DistrictModule, KitLootItem, OfferContributor, OfferKind } from '../types';

const BIND_EVENTS: readonly BindEvent[] = ['hit', 'enters', 'pushed', 'dies'];

/**
 * P12: in rooms 1 and 2 of a bridges trip, Hold's page is offered while neither the household nor
 * the trip's loot has it and the defector warden has not joined (her arrival brings Hold).
 */
export const HOLD_GUARANTEE: OfferContributor = (ctx) => {
  if (ctx.trip.district !== 'bridges' || !HOLD_GUARANTEE_ROOMS.includes(ctx.room)) return {};
  if (ctx.profile.household.members.includes('warden')) return {};
  if (ctx.profile.known.includes('hold')) return {};
  if (ctx.trip.loot.some((i) => i.kind === 'rune' && i.rune === 'hold')) return {};
  return { must: { kind: 'rune', rune: 'hold' } };
};

// ── BR-10: the Bind *pushed* page (bridges-plan P12; the generic `bindEvent` offer kind) ──
type EventItem = Extract<KitLootItem, { kind: 'bindEvent' }>;

/**
 * The event page: taking it costs the pick, banking it teaches the event through FD-9's
 * `grantBindEvent` (the Bench lists it), a wipe loses it, one per event per trip. CG reuses it for
 * *dies*. Saves naming an unknown event are bad.
 */
export const BIND_EVENT_KIND: OfferKind<EventItem> = {
  id: 'bindEvent',
  onPick: (t, i) => ({ ...t, loot: [...t.loot, i] }),
  onBank: (p, i) => grantBindEvent(p, i.event),
  limitPerTrip: 1,
  limitKey: (i) => i.event,
  parse(raw) {
    if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return null;
    const r = raw as Record<string, unknown>;
    const event = BIND_EVENTS.find((e) => e === r.event);
    return r.kind === 'bindEvent' && Object.keys(r).length === 2 && event
      ? { kind: 'bindEvent', event }
      : null;
  },
  card: 'bindEvent',
};

/**
 * Rooms 3 and 4 of a bridges trip offer the *pushed* page, only to a household that owns Bind and
 * has not stored the event (the stored list, not the Bench's inference) nor picked it this trip.
 */
export const PUSHED_GUARANTEE: OfferContributor = (ctx) => {
  if (ctx.trip.district !== 'bridges' || !PUSHED_PAGE_ROOMS.includes(ctx.room)) return {};
  if (!ctx.profile.methods.includes('bind')) return {};
  if (ctx.profile.bindEvents.includes('pushed')) return {};
  if (ctx.trip.loot.some((i) => i.kind === 'bindEvent' && i.event === 'pushed')) return {};
  return { must: { kind: 'bindEvent', event: 'pushed' } };
};

/** The one line the module registers (`...BRIDGE_OFFERS`). */
export const BRIDGE_OFFERS: Pick<DistrictModule, 'offerKinds' | 'offerContributors'> = {
  offerKinds: [BIND_EVENT_KIND as OfferKind],
  offerContributors: [HOLD_GUARANTEE, PUSHED_GUARANTEE],
};
