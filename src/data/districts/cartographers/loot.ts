import type { LootEntry, LootTableDef, RuneId, SolventId } from '../../types';
import type { CartographersTableId } from './types';

const rune = (r: RuneId, weight: number): LootEntry => ({
  spec: { kind: 'rune', rune: r },
  weight,
});
const solvent = (s: SolventId, weight: number): LootEntry => ({
  spec: { kind: 'solvent', solvent: s },
  weight,
});
const ink = (weight: number): LootEntry => ({ spec: { kind: 'ink' }, weight });
const vellum = (weight: number): LootEntry => ({ spec: { kind: 'vellum', amount: 1 }, weight });

/**
 * The Board treasures in the order rooms 1-3 guarantee them (cartographers-plan P14): the three
 * runes, then the Bind *dies* page, then the two solvents. `offerContributors` (`trip.ts`) offers
 * the first the household does not own and the trip is not carrying.
 */
export const BOARD_TREASURES = [
  { kind: 'rune', rune: 'erase' },
  { kind: 'rune', rune: 'draw' },
  { kind: 'rune', rune: 'swap' },
  { kind: 'bindEvent', event: 'dies' },
  { kind: 'solvent', solvent: 'quicksilver' },
  { kind: 'solvent', solvent: 'graphite' },
] as const;
/** The rooms (0-based) whose offers carry a treasure: rooms 1-3. */
export const TREASURE_ROOMS: readonly number[] = [0, 1, 2];

/**
 * Rooms 1-3 roll the school's runes beside the guaranteed treasure (ink and vellum fill in);
 * rooms 4-6 are ordinary deep loot with the two solvents and vellum, the bathhouses' deep tables'
 * shape. No table holds a doorway: the quiet doorway is the Crossroads choice after room 3.
 * Weights are *tune by playing*.
 */
export const CARTOGRAPHERS_LOOT_TABLES: Readonly<Record<CartographersTableId, LootTableDef>> = {
  'cartographers:room1': {
    id: 'cartographers:room1',
    entries: [rune('erase', 3), rune('draw', 3), rune('swap', 2), ink(3)],
  },
  'cartographers:room2': {
    id: 'cartographers:room2',
    entries: [rune('erase', 2), rune('draw', 2), rune('swap', 3), ink(3), vellum(1)],
  },
  'cartographers:room3': {
    id: 'cartographers:room3',
    entries: [rune('erase', 2), rune('draw', 2), rune('swap', 2), ink(3), vellum(1)],
  },
  'cartographers:room4': {
    id: 'cartographers:room4',
    entries: [
      solvent('quicksilver', 3),
      solvent('graphite', 3),
      rune('erase', 1),
      rune('draw', 1),
      rune('swap', 1),
      ink(2),
      vellum(1),
    ],
  },
  'cartographers:room5': {
    id: 'cartographers:room5',
    entries: [
      solvent('quicksilver', 3),
      solvent('graphite', 3),
      rune('swap', 1),
      ink(2),
      vellum(2),
    ],
  },
  'cartographers:heart': {
    id: 'cartographers:heart',
    entries: [
      solvent('quicksilver', 3),
      solvent('graphite', 3),
      rune('erase', 1),
      ink(2),
      vellum(2),
    ],
  },
};
