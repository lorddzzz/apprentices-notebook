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
 * Typed loot (P34, P35): rune and method pages teach what the household doesn't know (a page it
 * already has drops as 1 ink, see `rollOffers`). The Seam teaches Splash, Touch, Steam, Brass, Fork
 * and Bend; its deep and heart tables hold the Conduct page, and the first heart clear always offers
 * it. The canals teach their school (Jar, Fuse, Afterglow), their methods (Repeat, Margin) and
 * their solvents (Pitch, Wick).
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
    guaranteed: { kind: 'method', method: 'conduct' },
  },
  canalShallow: {
    id: 'canalShallow',
    entries: [
      rune('jar', 3),
      rune('fuse', 3),
      rune('afterglow', 2),
      ink(3),
      solvent('pitch', 1),
      solvent('wick', 1),
    ],
  },
  canalDeep: {
    id: 'canalDeep',
    entries: [
      rune('jar', 2),
      rune('fuse', 2),
      rune('afterglow', 2),
      method('repeat', 2),
      method('margin', 2),
      ink(3),
      solvent('pitch', 1),
      solvent('wick', 1),
      vellum(1),
      { spec: { kind: 'doorway' }, weight: 1 },
    ],
  },
  canalHeart: {
    id: 'canalHeart',
    entries: [
      method('repeat', 3),
      method('margin', 3),
      rune('afterglow', 2),
      ink(2),
      solvent('pitch', 1),
      solvent('wick', 1),
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
