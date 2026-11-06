import { HOLD_GUARANTEE_ROOMS } from '$data/districts/bridges';
import type { OfferContributor } from '../types';

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
