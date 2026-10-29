import { DISTRICT_IDS, type LootTableId, METHOD_IDS, RUNE_IDS, SOLVENT_IDS } from '$data';
import { bankKeys, keyOffer } from '../city';
import { KIT } from '../districts/kit';
import type {
  KitLootItem,
  KitLootSpec,
  OfferContributor,
  OfferKind,
  OfferKindId,
} from '../districts/types';
import { RECRUIT_OFFERS } from '../recruits/offers';
import type { Profile, Trip } from '../types';

/**
 * The offer-kind registry (district-kit P6, DK-7). Every loot item is picked, banked, wiped,
 * parsed and limited through its kind. Sources are listed once, below and in the district
 * modules (`DistrictModule.offerKinds` / `offerContributors`): no runtime registration, so a seed
 * rolls the same offers on every load.
 */

/** A non-district owner of kinds and roll contributors (RC's `recruit`). */
export interface OfferSource {
  kinds?: readonly OfferKind[];
  contributors?: readonly OfferContributor[];
}

export interface OfferRegistry {
  kinds: Readonly<Partial<Record<OfferKindId, OfferKind>>>;
  /** Run on every roll, in source order. */
  contributors: readonly OfferContributor[];
}

// ── Save parsing helpers: null for "not this kind" ──────
const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);
const amountOf = (v: unknown): number | null =>
  typeof v === 'number' && Number.isSafeInteger(v) && v >= 0 ? v : null;
const idOf = <T extends string>(ids: readonly T[], v: unknown): T | null =>
  ids.find((x) => x === v) ?? null;
/** The raw record when it names `kind`, else null. */
const fieldsOf = (raw: unknown, kind: string): Record<string, unknown> | null =>
  isRecord(raw) && raw.kind === kind ? raw : null;

type ItemOf<K extends KitLootItem['kind']> = Extract<KitLootItem, { kind: K }>;
const addToLoot = (t: Trip, item: KitLootItem): Trip => ({ ...t, loot: [...t.loot, item] });
const add = <T>(list: readonly T[], x: T): T[] => (list.includes(x) ? [...list] : [...list, x]);

// ── The core kinds ──────────────────────────────────────
const RUNE_KIND: OfferKind<ItemOf<'rune'>> = {
  id: 'rune',
  onPick: addToLoot,
  onBank: (p, i) => ({ ...p, known: add(p.known, i.rune) }),
  parse(raw) {
    const r = fieldsOf(raw, 'rune');
    const rune = r && idOf(RUNE_IDS, r.rune);
    return rune ? { kind: 'rune', rune } : null;
  },
  card: 'rune',
};

const METHOD_KIND: OfferKind<ItemOf<'method'>> = {
  id: 'method',
  onPick: addToLoot,
  onBank: (p, i) => ({ ...p, methods: add(p.methods, i.method) }),
  parse(raw) {
    const r = fieldsOf(raw, 'method');
    const method = r && idOf(METHOD_IDS, r.method);
    return method ? { kind: 'method', method } : null;
  },
  card: 'method',
};

const INK_KIND: OfferKind<ItemOf<'ink'>> = {
  id: 'ink',
  onPick: addToLoot,
  onBank: (p, i) => ({ ...p, ink: p.ink + i.amount }),
  parse(raw) {
    const r = fieldsOf(raw, 'ink');
    const amount = r && amountOf(r.amount);
    return amount === null ? null : { kind: 'ink', amount };
  },
  card: 'ink',
};

const SOLVENT_KIND: OfferKind<ItemOf<'solvent'>> = {
  id: 'solvent',
  onPick: addToLoot,
  onBank: (p, i) => ({
    ...p,
    solvents: { ...p.solvents, [i.solvent]: p.solvents[i.solvent] + 1 },
    solventsFound: add(p.solventsFound, i.solvent),
  }),
  parse(raw) {
    const r = fieldsOf(raw, 'solvent');
    const solvent = r && idOf(SOLVENT_IDS, r.solvent);
    return solvent ? { kind: 'solvent', solvent } : null;
  },
  card: 'solvent',
};

const VELLUM_KIND: OfferKind<ItemOf<'vellum'>> = {
  id: 'vellum',
  onPick: addToLoot,
  onBank: (p, i) => ({ ...p, vellum: p.vellum + i.amount }),
  parse(raw) {
    const r = fieldsOf(raw, 'vellum');
    const amount = r && amountOf(r.amount);
    return amount === null ? null : { kind: 'vellum', amount };
  },
  card: 'vellum',
};

/** A quiet doorway costs the pick but is never banked: it opens field rewiring (plan S11). */
const DOORWAY_KIND: OfferKind<ItemOf<'doorway'>> = {
  id: 'doorway',
  onPick: (t) => ({ ...t, status: 'doorway' }),
  onBank: (p) => p,
  parse: (raw) => (fieldsOf(raw, 'doorway') ? { kind: 'doorway' } : null),
  card: 'doorway',
};

/** K-23: joins the table's pool where its gate names this district and table; opens it when banked. */
const KEY_KIND: OfferKind<ItemOf<'key'>> = {
  id: 'key',
  joinPool(ctx) {
    const key = keyOffer(ctx.profile, ctx.trip, ctx.table as LootTableId, undefined, ctx.room);
    return key && !key.guaranteed
      ? [{ spec: { kind: 'key', district: key.district }, weight: key.weight }]
      : [];
  },
  onPick: addToLoot,
  onBank: (p, i) => bankKeys(p, [i]),
  limitPerTrip: 1,
  parse(raw) {
    const r = fieldsOf(raw, 'key');
    const district = r && idOf(DISTRICT_IDS, r.district);
    return district ? { kind: 'key', district } : null;
  },
  card: 'key',
};

/** CN P7: a guaranteed key (`afterRoom` + `guaranteed`) takes one of the offer cards. */
const guaranteedKey: OfferContributor = (ctx) => {
  const key = keyOffer(ctx.profile, ctx.trip, ctx.table as LootTableId, undefined, ctx.room);
  return key?.guaranteed ? { must: { kind: 'key', district: key.district } } : {};
};

export const CORE_OFFERS: OfferSource = {
  kinds: [RUNE_KIND, METHOD_KIND, INK_KIND, SOLVENT_KIND, VELLUM_KIND, DOORWAY_KIND, KEY_KIND],
  contributors: [guaranteedKey],
};

/** Every non-district source, one line each (RC, and any later core owner). */
export const OFFER_SOURCES: readonly OfferSource[] = [CORE_OFFERS, RECRUIT_OFFERS];

/** One registry from sources; a duplicate kind id throws (the registry's integrity check). */
export function buildOfferRegistry(sources: readonly OfferSource[]): OfferRegistry {
  const kinds: Partial<Record<OfferKindId, OfferKind>> = {};
  const contributors: OfferContributor[] = [];
  for (const s of sources) {
    for (const k of s.kinds ?? []) {
      if (kinds[k.id]) throw new Error(`Offer kinds: duplicate '${k.id}'`);
      kinds[k.id] = k;
    }
    contributors.push(...(s.contributors ?? []));
  }
  return { kinds, contributors };
}

const present = (ks: readonly (OfferKind | undefined)[]): OfferKind[] =>
  ks.filter((k): k is OfferKind => k !== undefined);

/** The registry's kinds in registration order. */
export const kindsIn = (reg: OfferRegistry): OfferKind[] => present(Object.values(reg.kinds));

let built: OfferRegistry | null = null;
/** The game's registry: the sources above, then every district module's kinds and contributors. */
export function offerRegistry(): OfferRegistry {
  // Built on first use: the kit's modules import the movers, which are still loading at import.
  built ??= buildOfferRegistry([
    ...OFFER_SOURCES,
    { kinds: present(Object.values(KIT.offerKinds)), contributors: KIT.offerContributors },
  ]);
  return built;
}

// ── Operations ──────────────────────────────────────────
export function kindOf(item: { kind: string }, reg: OfferRegistry = offerRegistry()): OfferKind {
  const kind = reg.kinds[item.kind as OfferKindId];
  if (!kind) throw new Error(`No offer kind '${item.kind}'`);
  return kind;
}

/** Banks a returning trip's loot, item by item in loot order. */
export function bankLoot(
  p: Profile,
  loot: readonly KitLootItem[],
  reg: OfferRegistry = offerRegistry(),
): Profile {
  return loot.reduce((acc, item) => kindOf(item, reg).onBank(acc, item), p);
}

/** A wipe: kinds with `onWipe` keep something; the rest is lost with the trip. */
export function wipeLoot(
  p: Profile,
  loot: readonly KitLootItem[],
  reg: OfferRegistry = offerRegistry(),
): Profile {
  return loot.reduce((acc, item) => kindOf(item, reg).onWipe?.(acc, item) ?? acc, p);
}

/** Save parsing: the item, or null when no registered kind accepts it. */
export function parseLootItem(
  raw: unknown,
  reg: OfferRegistry = offerRegistry(),
): KitLootItem | null {
  if (!isRecord(raw) || typeof raw.kind !== 'string') return null;
  return reg.kinds[raw.kind as OfferKindId]?.parse(raw) ?? null;
}

const limitGroup = (kind: OfferKind, x: KitLootItem | KitLootSpec): string =>
  // A spec names the same identifying fields as its item (a recruit's apprentice).
  kind.limitKey ? kind.limitKey(x as KitLootItem) : '';

/** Would one more `x` go over its kind's `limitPerTrip`, given what the trip already holds? */
export function atLimit(
  held: readonly KitLootItem[],
  x: KitLootItem | KitLootSpec,
  reg: OfferRegistry = offerRegistry(),
): boolean {
  const kind = reg.kinds[x.kind as OfferKindId];
  if (kind?.limitPerTrip === undefined) return false;
  const group = limitGroup(kind, x);
  const same = held.filter((i) => i.kind === x.kind && limitGroup(kind, i) === group);
  return same.length >= kind.limitPerTrip;
}

/** True when some kind has more items than its `limitPerTrip` in `items` (save validation). */
export function overLimit(
  items: readonly KitLootItem[],
  reg: OfferRegistry = offerRegistry(),
): boolean {
  return items.some((x, i) => atLimit(items.slice(0, i), x, reg));
}
