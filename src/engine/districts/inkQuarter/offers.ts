import { encountersOf } from '$data';
import { INK_TERMS } from '$data/districts/inkQuarter/terms';
import type { TermDef, TermId } from '$data/districts/inkQuarter/types';
import { createRng } from '../../rng';
import type { LootItem, Profile, Trip } from '../../types';
import type { KitLootSpec, OfferKind, OfferRollCtx } from '../types';
import { rewardPage, signTerm, termDef } from './terms';
import { openTerm, parseInkState } from './types';

/**
 * The `termed` offer kind (P5-P7; IQ-3): one extra card beside the normal offers, never at the
 * heart and never while a term is open. Taking it signs the term; its page goes into the trip's
 * loot (held while the stake is the reward itself) and an extra-pick reward raises `picksLeft`.
 */

export const TERMED: 'inkQuarter:termed' = 'inkQuarter:termed';
/** The card as offered: the def it would sign. */
export type TermedOffer = { kind: typeof TERMED; data: { def: TermId } };
/** The signed term's page in the trip's loot; `held` while the reward is what it stakes (P6). */
export type TermedLoot = { kind: typeof TERMED; data: { def: TermId; term: string }; held?: true };
export type TermedItem = TermedOffer | TermedLoot;

const isLoot = (i: TermedItem): i is TermedLoot => 'term' in i.data;

/** Pages the household has or carries on this trip (a signed term's page included). */
function pagesHeld(p: Profile, t: Trip): Set<string> {
  const ids = new Set<string>([...p.known, ...p.methods, ...p.solventsFound]);
  for (const i of t.loot) {
    if (i.kind === 'rune') ids.add(i.rune);
    else if (i.kind === 'method') ids.add(i.method);
    else if (i.kind === 'solvent') ids.add(i.solvent);
    else if (i.kind === TERMED) {
      const d = termDef((i.data as TermedLoot['data']).def);
      const page = d && rewardPage(d);
      if (page) ids.add(page);
    }
  }
  return ids;
}

/**
 * The term this room's loot offers, if any (P7): one listed for the room, not signed before on
 * this trip, its page not already the household's. A def guaranteed while lacking comes first;
 * otherwise one is drawn from the roll's own seed.
 */
export function termFor(ctx: OfferRollCtx, defs: readonly TermDef[] = INK_TERMS): TermDef | null {
  const { trip, room } = ctx;
  if (trip.district !== 'inkQuarter' || !trip.kit) return null;
  const rooms = encountersOf(trip.district);
  if (room >= rooms.length - 1 || rooms[room]?.heart) return null;
  const state = parseInkState(trip.kit.state);
  if (openTerm(state)) return null;
  const signed = new Set(state.terms.map((t) => t.def));
  const have = pagesHeld(ctx.profile, trip);
  const fits = defs.filter((d) => {
    const page = rewardPage(d);
    return d.rooms.includes(room) && !signed.has(d.id) && !(page && have.has(page));
  });
  const must = fits.find((d) => d.guaranteedWhileLacking !== undefined);
  if (must) return must;
  if (fits.length === 0) return null;
  return fits[createRng(ctx.seed).int(0, fits.length - 1)] ?? null;
}

/** Banks a rewarded page (a rune, method or solvent page; `checkTermDefs` allows no other). */
function bankPage(p: Profile, spec: KitLootSpec): Profile {
  const add = <T>(list: readonly T[], x: T): T[] => (list.includes(x) ? [...list] : [...list, x]);
  switch (spec.kind) {
    case 'rune':
      return { ...p, known: add(p.known, spec.rune) };
    case 'method':
      return { ...p, methods: add(p.methods, spec.method) };
    case 'solvent':
      return {
        ...p,
        solvents: { ...p.solvents, [spec.solvent]: p.solvents[spec.solvent] + 1 },
        solventsFound: add(p.solventsFound, spec.solvent),
      };
    default:
      return p;
  }
}

const rec = (v: unknown): Record<string, unknown> | null =>
  typeof v === 'object' && v !== null && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
const isTermId = (v: unknown): v is TermId =>
  typeof v === 'string' && v.startsWith('inkQuarter:') && v.length > 'inkQuarter:'.length;

export const TERMED_KIND: OfferKind<TermedItem> = {
  id: TERMED,
  roll: (ctx) => {
    const d = termFor(ctx);
    return d ? [{ kind: TERMED, data: { def: d.id } }] : [];
  },
  onPick(trip, item) {
    if (!trip.kit) throw new Error('A term needs a trip shape');
    const def = termDef(item.data.def);
    const state = signTerm(parseInkState(trip.kit.state), item.data.def, trip.encounter);
    const term = state.terms.at(-1)?.id ?? '';
    const page = def && def.reward.kind !== 'extraPick';
    const loot: TermedLoot = {
      kind: TERMED,
      data: { def: item.data.def, term },
      ...(def?.stake.kind === 'reward' ? { held: true as const } : {}),
    };
    const extra = def?.reward.kind === 'extraPick' || def?.reward.kind === 'both' ? 1 : 0;
    return {
      ...trip,
      loot: page ? [...trip.loot, loot] : trip.loot,
      picksLeft: trip.picksLeft + extra,
      kit: { ...trip.kit, state },
    };
  },
  onBank(p, item) {
    const def = isLoot(item) ? termDef(item.data.def) : null;
    return def && def.reward.kind !== 'extraPick' ? bankPage(p, def.reward.spec) : p;
  },
  parse(raw) {
    const r = rec(raw);
    const data = rec(r?.data);
    if (!r || r.kind !== TERMED || !data || !isTermId(data.def)) return null;
    if (data.term === undefined) {
      return r.held === undefined ? { kind: TERMED, data: { def: data.def } } : null;
    }
    if (typeof data.term !== 'string' || data.term === '') return null;
    if (r.held !== undefined && r.held !== true) return null;
    const item: TermedLoot = { kind: TERMED, data: { def: data.def, term: data.term } };
    return r.held ? { ...item, held: true } : item;
  },
  card: TERMED,
};

/**
 * A held page once its term is settled (P6): kept (no longer held) when paid, taken back when
 * broken; an open term's page stays held. Called by the shape's `lootAfterRoom` (DK-D9).
 */
export function releaseHeld(trip: Trip): Trip {
  if (!trip.kit) return trip;
  const terms = parseInkState(trip.kit.state).terms;
  const loot: LootItem[] = [];
  for (const i of trip.loot) {
    const held = i.kind === TERMED && 'held' in i && i.held ? i : null;
    const term = held ? rec(held.data)?.term : undefined;
    const status = terms.find((t) => t.id === term)?.status;
    if (status === 'broken') continue;
    loot.push(held && status === 'paid' ? { kind: held.kind, data: held.data } : i);
  }
  return loot.length === trip.loot.length && loot.every((x, n) => x === trip.loot[n])
    ? trip
    : { ...trip, loot };
}
