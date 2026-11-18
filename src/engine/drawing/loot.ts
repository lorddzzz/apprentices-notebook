import {
  DISTRICT_IDS,
  type DistrictId,
  type Drawing,
  LOOT_TABLES,
  type LootSpec,
  type LootTableId,
  TUNING,
} from '$data';
import { DRAWN_LOOT, MASTER_HOME } from '$data/drawing';
import type { KitLootSpec, RoomOffers } from '../districts/types';
import { createRng, deriveSeed, pickWeighted } from '../rng';
import { type Owned, ownedBy } from '../trip/offers';
import type { Profile, Trip } from '../types';
import { weightBand } from './cost';
import { GEN_KITS } from './kits';
import { parseInkedState } from './trip';

/**
 * Loot by depth (EN-8; P7, P17): a drawn trip's table is derived from the districts the drawing
 * came from (its pages you lack, their solvents, ink, vellum, the quiet doorway) and rolled like
 * `rollOffers` (the seed is the trip's, the salt the encounter's). Never a key, a recruit, a rival
 * page, a lore paper or a hearing (P16).
 */

const isDistrict = (s: string): s is DistrictId => (DISTRICT_IDS as readonly string[]).includes(s);
const prefixOf = (id: string): DistrictId | null => {
  const head = id.split(':')[0] ?? '';
  return id.includes(':') && isDistrict(head) ? head : null;
};

/** The districts a drawing's rule, foes, pieces, shape and heart come from; the Seam always. */
export function sourcesOf(d: Drawing): DistrictId[] {
  const found: (DistrictId | null)[] = [
    'seam',
    d.rule === null ? null : prefixOf(d.rule),
    ...d.foes.map((f) => GEN_KITS.find((k) => k.foes.some((x) => x.id === f))?.district ?? null),
    ...d.pieces.map(prefixOf),
    prefixOf(d.shape),
    MASTER_HOME[d.heart],
  ];
  return found.filter((x, i): x is DistrictId => x !== null && found.indexOf(x) === i);
}

/** The loot tables a district owns: its namespace, the Seam's plain ones, the canals' camel-cased. */
function tablesOf(district: DistrictId): LootTableId[] {
  const ids = Object.keys(LOOT_TABLES) as LootTableId[];
  switch (district) {
    case 'seam':
      return ids.filter((id) => id === 'shallow' || id === 'deep' || id === 'heart');
    case 'canals':
      return ids.filter((id) => id.startsWith('canal'));
    case 'lowerSeam':
      return ids.filter((id) => id === 'lowerSeam');
    default:
      return ids.filter((id) => id.startsWith(`${district}:`));
  }
}

type Tier = keyof typeof DRAWN_LOOT.weights;
interface Entry {
  spec: LootSpec;
  weight: number;
}

/** The weight of the quiet doorway in every tier (not a tuned number: it only fills the pool). */
const DOORWAY_WEIGHT = 1;

/** The trip's table for one weight tier: pages not in `owned`, solvents of the sources, basics (no doorway at the heart). */
function tableFor(d: Drawing, owned: Owned, tier: Tier, heart: boolean): Entry[] {
  const w = DRAWN_LOOT.weights[tier];
  const specs = sourcesOf(d).flatMap((s) => tablesOf(s).flatMap((t) => LOOT_TABLES[t].entries));
  const out: Entry[] = [];
  const add = (spec: LootSpec, weight: number): void => {
    const dupe = out.some((e) => JSON.stringify(e.spec) === JSON.stringify(spec));
    if (!dupe) out.push({ spec, weight });
  };
  for (const { spec } of specs) {
    if (spec.kind === 'rune' && !owned.known.includes(spec.rune)) add(spec, w.page);
    if (spec.kind === 'method' && !owned.methods.includes(spec.method)) add(spec, w.page);
    if (spec.kind === 'solvent') add({ kind: 'solvent', solvent: spec.solvent }, w.solvent);
  }
  add({ kind: 'ink' }, w.ink);
  add({ kind: 'vellum', amount: 1 }, w.vellum);
  if (!heart) add({ kind: 'doorway' }, DOORWAY_WEIGHT); // a heart has no doorway (parseTrip)
  return out;
}

/**
 * The offers of room `room` of a drawn trip from its snapshot, given the pages already held. The
 * cards are drawn here and handed over as `guaranteed`, so they fill every offer and the fallback
 * table of the roll (the Seam's, never drawn from) adds nothing.
 */
export function drawnOffersFor(
  t: Trip,
  room: number,
  owned: Owned,
  snapshot: Drawing = parseInkedState(t.kit?.state).drawing,
): RoomOffers {
  const drawing = snapshot;
  const heart = room >= drawing.length - 1;
  const band = weightBand(drawing);
  const picks = heart
    ? DRAWN_LOOT.heartPicks
    : band === 'heavy'
      ? DRAWN_LOOT.heavyPicksBeforeHeart
      : DRAWN_LOOT.picks[band];
  const pool = tableFor(drawing, owned, heart ? 'heavy' : band, heart);
  const rng = createRng(deriveSeed(t.seed, 1000 + room));
  const chosen: KitLootSpec[] = [];
  while (chosen.length < TUNING.offersPerWin && pool.length > 0) {
    const [e] = pool.splice(
      pickWeighted(
        rng,
        pool.map((x) => x.weight),
      ),
      1,
    );
    if (e) chosen.push(e.spec);
  }
  return { table: 'lowerSeam', picks, guaranteed: chosen };
}

/** What `offersFor` returns for a drawn trip: the household's pages and the trip's are never offered. */
export const drawnOffers = (p: Profile, t: Trip, room: number): RoomOffers =>
  drawnOffersFor(t, room, ownedBy(p, t));
