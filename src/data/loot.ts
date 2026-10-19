import type { LootEntry, LootTableDef, LootTableId, MethodId, RuneId, SolventId } from './types';

const rune = (r: RuneId, weight: number): LootEntry => ({
  spec: { kind: 'rune', rune: r },
  weight,
});
const method = (m: MethodId, weight: number): LootEntry => ({
  spec: { kind: 'method', method: m },
  weight,
});
const ink = (weight: number): LootEntry => ({ spec: { kind: 'ink' }, weight });
const solvent = (id: SolventId, weight: number): LootEntry => ({
  spec: { kind: 'solvent', solvent: id },
  weight,
});
const vellum = (weight: number): LootEntry => ({ spec: { kind: 'vellum', amount: 1 }, weight });

/**
 * P35: Seam loot teaches Splash, Touch, Steam, Brass, Fork and Bend; the Conduct page drops in the
 * deep and heart tables. R1 tunes the weights and adds the canals' tables.
 */
export const LOOT_TABLES: Record<LootTableId, LootTableDef> = {
  shallow: {
    id: 'shallow',
    entries: [
      rune('touch', 3),
      rune('steam', 3),
      rune('brass', 2),
      rune('bend', 2),
      rune('fork', 2),
      ink(3),
      solvent('gallnut', 1),
      solvent('cinder', 1),
    ],
  },
  deep: {
    id: 'deep',
    entries: [
      rune('splash', 2),
      rune('steam', 2),
      rune('brass', 2),
      rune('fork', 1),
      method('conduct', 1),
      ink(3),
      solvent('gallnut', 1),
      solvent('cinder', 1),
      vellum(1),
      { spec: { kind: 'doorway' }, weight: 1 },
    ],
  },
  heart: {
    id: 'heart',
    entries: [
      method('conduct', 3),
      rune('splash', 2),
      rune('touch', 1),
      ink(2),
      solvent('gallnut', 1),
      solvent('cinder', 1),
      vellum(1),
    ],
  },
};

/** P35: the runes a new notebook knows. */
export const START_KNOWN: readonly RuneId[] = [
  'bolt',
  'strike',
  'shove',
  'guard',
  'ink',
  'oil',
  'spark',
];
