import {
  type DistrictId,
  LOOT_TABLES,
  type LootSpec,
  type LootTableId,
  type MemberId,
  type MethodId,
  type RuneId,
  TUNING,
} from '$data';
import type { KitLootSpec, OfferRollCtx, PoolEntry } from '../districts/types';
import { FOUNDERS } from '../household';
import { createRng, deriveSeed, pickWeighted, type Rng } from '../rng';
import type { LootItem, Profile, Trip } from '../types';
import { atLimit, kindsIn, type OfferRegistry, offerRegistry } from './offerKinds';

/** The salt of a roll's own seed for contributors and rolling kinds (apart from the table's draw). */
const KIT_ROLL_SALT = 5000;

/** What the household already has: a page of it drops as ink (P34). */
export interface Owned {
  known: readonly RuneId[];
  methods: readonly MethodId[];
}

const NOTHING_OWNED: Owned = { known: [], methods: [] };

const hasPage = (owned: Owned, spec: KitLootSpec): boolean =>
  (spec.kind === 'rune' && owned.known.includes(spec.rune)) ||
  (spec.kind === 'method' && owned.methods.includes(spec.method));

const samePage = (a: KitLootSpec, b: KitLootSpec): boolean =>
  (a.kind === 'rune' && b.kind === 'rune' && a.rune === b.rune) ||
  (a.kind === 'method' && b.kind === 'method' && a.method === b.method);

const CORE_SPECS: readonly string[] = [
  'rune',
  'method',
  'doorway',
  'solvent',
  'vellum',
  'key',
  'ink',
] satisfies readonly LootSpec['kind'][];
const isCoreSpec = (spec: KitLootSpec): spec is LootSpec => CORE_SPECS.includes(spec.kind);

function offerOf(spec: LootSpec, rng: Rng, members: readonly MemberId[], owned: Owned): LootItem {
  // Ink is one household allowance (HC P6). The draw that once named a member stays, so a seed
  // still rolls the offers it always did; `rng.int` takes one draw whatever the range, so the
  // offers never depend on the party's size (no scaling, party.md §0b).
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

/** A kit spec (recruit, bindEvent, a district kind) is its own item. */
const itemOf = (
  spec: KitLootSpec,
  rng: Rng,
  members: readonly MemberId[],
  owned: Owned,
): LootItem => (isCoreSpec(spec) ? offerOf(spec, rng, members, owned) : spec);

/** The trip and profile a roll reads for the registry's kinds and contributors (DK-7). */
export interface RollWith {
  profile: Profile;
  trip: Trip;
  /** Defaults to the game's registry (tests pass fixture kinds). */
  registry?: OfferRegistry;
}

/**
 * Loot offers for a won encounter: distinct table entries, weighted, same result for the same seed.
 * A `key` joins the end of the pool with its weight (the legacy argument, or the key kind's
 * `joinPool` under `withKit`, K-23). A table's `guaranteed` page is offered first while the
 * household lacks it (P35); a rune or method page it already has (`owned`) is offered as
 * `duplicateInk` instead (P34).
 *
 * With `withKit` (DK-7, DK-R1) every registered contributor runs: its `must` follows the table's
 * guaranteed page and counts toward the normal offers like it; its `extra` cards, then each kind's
 * own `roll`, follow the normal offers. A kind at its `limitPerTrip` is never offered. With no
 * contributors, no rolling kinds and no limit reached, the offers equal the plain roll.
 */
export function rollOffers(
  tripSeed: number,
  encounter: number,
  table: LootTableId,
  members: readonly MemberId[] = FOUNDERS,
  key: { district: DistrictId; weight: number } | null = null,
  owned: Owned = NOTHING_OWNED,
  withKit: RollWith | null = null,
): LootItem[] {
  const rng = createRng(deriveSeed(tripSeed, 1000 + encounter));
  const def = LOOT_TABLES[table];
  const offers: LootItem[] = [];
  const reg = withKit ? (withKit.registry ?? offerRegistry()) : null;
  const ctx: OfferRollCtx | null = withKit && {
    profile: withKit.profile,
    trip: withKit.trip,
    room: encounter,
    table,
    seed: deriveSeed(tripSeed, KIT_ROLL_SALT + encounter),
  };
  const fits = (x: KitLootSpec | LootItem): boolean =>
    !reg || !atLimit([...(withKit?.trip.loot ?? []), ...offers], x, reg);
  const kinds = reg ? kindsIn(reg) : [];
  const given = ctx && reg ? reg.contributors.map((c) => c(ctx)) : [];

  let pool: PoolEntry[] = [...def.entries];
  if (key) pool.push({ spec: { kind: 'key', district: key.district }, weight: key.weight });
  if (ctx) for (const k of kinds) pool.push(...(k.joinPool?.(ctx) ?? []));
  const take = (spec: KitLootSpec): void => {
    offers.push(itemOf(spec, rng, members, owned));
    pool = pool.filter((e) => !samePage(e.spec, spec));
  };
  const must = def.guaranteed;
  if (must && !hasPage(owned, must)) take(must);
  for (const c of given) if (c.must && fits(c.must)) take(c.must);
  while (offers.length < TUNING.offersPerWin) {
    if (reg) pool = pool.filter((e) => fits(e.spec));
    if (pool.length === 0) break;
    const [entry] = pool.splice(
      pickWeighted(
        rng,
        pool.map((e) => e.weight),
      ),
      1,
    );
    if (!entry) break;
    offers.push(itemOf(entry.spec, rng, members, owned));
  }
  for (const c of given) for (const x of c.extra ?? []) if (fits(x)) offers.push(x);
  if (ctx) for (const k of kinds) for (const x of k.roll?.(ctx) ?? []) if (fits(x)) offers.push(x);
  return offers;
}

/** The pages the household has, plus the ones already in the trip's loot (a second copy is ink). */
export const ownedBy = (p: Profile, t: Trip): Owned => ({
  known: [...p.known, ...t.loot.flatMap((i) => (i.kind === 'rune' ? [i.rune] : []))],
  methods: [...p.methods, ...t.loot.flatMap((i) => (i.kind === 'method' ? [i.method] : []))],
});
