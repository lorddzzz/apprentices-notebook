import { APPRENTICE_IDS } from '$data';
import type { KitLootItem, OfferContributor, OfferKind } from '../districts/types';
import { guaranteesFor } from '../recruits';
import type { OfferSource } from '../trip/offerKinds';

/**
 * RC's offer source (recruitment plan §4, DK-R1), one line in `OFFER_SOURCES`: the `recruit` kind
 * and the guaranteed-page contributor (RC-3).
 */

type RecruitItem = Extract<KitLootItem, { kind: 'recruit' }>;

/**
 * The recruit card's kind. RC-4 adds its roll (landmark + ready) and banks it with
 * `joinHousehold`; until then saves round-trip, the per-apprentice limit holds and banking does
 * nothing, since nothing offers a recruit yet.
 */
const RECRUIT_KIND: OfferKind<RecruitItem> = {
  id: 'recruit',
  onPick: (t, i) => ({ ...t, loot: [...t.loot, i] }),
  onBank: (p) => p,
  limitPerTrip: 1,
  limitKey: (i) => i.apprentice,
  parse(raw) {
    if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return null;
    const r = raw as Record<string, unknown>;
    const apprentice = APPRENTICE_IDS.find((x) => x === r.apprentice);
    return r.kind === 'recruit' && apprentice ? { kind: 'recruit', apprentice } : null;
  },
  card: 'recruit',
};

/** P5: at most one missing precondition page per roll, after the table's own guarantee. */
const guaranteedPage: OfferContributor = (ctx) => {
  const must = guaranteesFor(ctx.profile, ctx.trip, ctx.room);
  return must ? { must } : {};
};

export const RECRUIT_OFFERS: OfferSource = {
  kinds: [RECRUIT_KIND],
  contributors: [guaranteedPage],
};
