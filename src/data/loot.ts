import { SEAM_SOLVENTS } from './aspects';
import type { LootEntry, LootTableDef, LootTableId, RuneId, SolventId } from './types';

const rune = (r: RuneId, weight: number): LootEntry => ({
  spec: { kind: 'rune', rune: r },
  weight,
});
const ink = (weight: number): LootEntry => ({ spec: { kind: 'ink' }, weight });
const solvent = (id: SolventId, weight: number): LootEntry => ({
  spec: { kind: 'solvent', solvent: id },
  weight,
});
const vellum = (weight: number): LootEntry => ({ spec: { kind: 'vellum', amount: 1 }, weight });
/** The three Seam solvents at one weight each (offers stay distinct per entry). */
const seamSolvents = (weight: number): LootEntry[] =>
  SEAM_SOLVENTS.map((id) => solvent(id, weight));

export const LOOT_TABLES: Record<LootTableId, LootTableDef> = {
  shallow: {
    id: 'shallow',
    entries: [
      rune('ink', 3),
      rune('spark', 3),
      rune('oil', 3),
      rune('bend', 2),
      rune('fork', 2),
      rune('steam', 2),
      rune('brass', 2),
      rune('pierce', 1),
      ink(3),
      ...seamSolvents(1),
    ],
  },
  deep: {
    id: 'deep',
    entries: [
      rune('steam', 2),
      rune('brass', 2),
      rune('onInked', 3),
      rune('splash', 2),
      rune('ward', 2),
      rune('bolt', 1),
      rune('amplify', 1),
      rune('onKill', 1),
      rune('pierce', 1),
      rune('onIgnite', 1),
      rune('thrift', 1),
      ink(3),
      ...seamSolvents(1),
      vellum(1),
    ],
  },
  heart: {
    id: 'heart',
    entries: [
      rune('amplify', 3),
      rune('echo', 3),
      rune('onKill', 3),
      rune('onInked', 2),
      rune('splash', 2),
      rune('thrift', 1),
      ink(2),
      ...seamSolvents(1),
      vellum(1),
    ],
  },
};

export const START_COLLECTION: Record<RuneId, number> = {
  bolt: 2,
  splash: 0,
  ward: 1,
  ink: 2,
  oil: 1,
  spark: 2,
  steam: 0,
  brass: 0,
  bend: 2,
  fork: 1,
  onInked: 0,
  onKill: 0,
  amplify: 0,
  echo: 0,
  quill: 0,
  smear: 0,
  torch: 0,
  fog: 0,
  mist: 0,
  brand: 0,
  pierce: 0,
  onIgnite: 0,
  thrift: 0,
  scald: 0,
  etch: 0,
  kiln: 0,
};
