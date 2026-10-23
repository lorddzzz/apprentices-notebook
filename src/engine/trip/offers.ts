import {
  type DistrictId,
  LOOT_TABLES,
  type LootEntry,
  type LootSpec,
  type LootTableId,
  MEMBER_IDS,
  type MemberId,
  type MethodId,
  type RuneId,
  TUNING,
} from '$data';
import { createRng, deriveSeed, pickWeighted, type Rng } from '../rng';
import type { LootItem, Profile, Trip } from '../types';

/** What the household already has: a page of it drops as ink (P34). */
export interface Owned {
  known: readonly RuneId[];
  methods: readonly MethodId[];
}

const NOTHING_OWNED: Owned = { known: [], methods: [] };

const hasPage = (owned: Owned, spec: LootSpec): boolean =>
  (spec.kind === 'rune' && owned.known.includes(spec.rune)) ||
  (spec.kind === 'method' && owned.methods.includes(spec.method));

const samePage = (a: LootSpec, b: LootSpec): boolean =>
  (a.kind === 'rune' && b.kind === 'rune' && a.rune === b.rune) ||
  (a.kind === 'method' && b.kind === 'method' && a.method === b.method);

function offerOf(spec: LootSpec, rng: Rng, members: readonly MemberId[], owned: Owned): LootItem {
  // Ink is one household allowance (HC P6). The draw that once named a member stays, so a seed
  // still rolls the offers it always did.
  const ink = (amount: number): LootItem => {
    rng.int(0, members.length - 1);
    return { kind: 'ink', amount };
  };
  if (hasPage(owned, spec)) return ink(TUNING.duplicateInk);
  switch (spec.kind) {
    case 'rune':
      return { kind: 'rune', rune: spec.rune };
    case 'method':
      return { kind: 'method', method: spec.method };
    case 'doorway':
      return { kind: 'doorway' };
    case 'solvent':
      return { kind: 'solvent', solvent: spec.solvent };
    case 'vellum':
      return { kind: 'vellum', amount: spec.amount };
    case 'key':
      return { kind: 'key', district: spec.district };
    case 'ink':
      return ink(TUNING.inkReserve);
  }
}

/**
 * Loot offers for a won encounter: distinct table entries, weighted, same result for the same seed.
 * A `key` (from `keyOffer`, K-23) joins the end of the pool with its weight. A table's
 * `guaranteed` page is offered first while the household lacks it (P35); a rune or method page it
 * already has (`owned`) is offered as `duplicateInk` instead (P34).
 */
export function rollOffers(
  tripSeed: number,
  encounter: number,
  table: LootTableId,
  members: readonly MemberId[] = MEMBER_IDS,
  key: { district: DistrictId; weight: number } | null = null,
  owned: Owned = NOTHING_OWNED,
): LootItem[] {
  const rng = createRng(deriveSeed(tripSeed, 1000 + encounter));
  const def = LOOT_TABLES[table];
  const offers: LootItem[] = [];
  let pool: LootEntry[] = [...def.entries];
  if (key) pool.push({ spec: { kind: 'key', district: key.district }, weight: key.weight });
  const must = def.guaranteed;
  if (must && !hasPage(owned, must)) {
    offers.push(offerOf(must, rng, members, owned));
    pool = pool.filter((e) => !samePage(e.spec, must));
  }
  while (offers.length < TUNING.offersPerWin && pool.length > 0) {
    const [entry] = pool.splice(
      pickWeighted(
        rng,
        pool.map((e) => e.weight),
      ),
      1,
    );
    if (!entry) break;
    offers.push(offerOf(entry.spec, rng, members, owned));
  }
  return offers;
}

/** The pages the household has, plus the ones already in the trip's loot (a second copy is ink). */
export const ownedBy = (p: Profile, t: Trip): Owned => ({
  known: [...p.known, ...t.loot.flatMap((i) => (i.kind === 'rune' ? [i.rune] : []))],
  methods: [...p.methods, ...t.loot.flatMap((i) => (i.kind === 'method' ? [i.method] : []))],
});
