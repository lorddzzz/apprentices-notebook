import type { LootEntry, LootSpec, RuneId } from '../../types';
import type { InkTableId } from './types';

/**
 * The ink-makers' quarter's loot (ink-quarter-plan P7; IQ-8). Three tables, like the canals': rooms
 * 1-2, rooms 3-4 and the heart. The quarter's own school (Sentence, Levy, Tally) is the ordinary
 * weighted offer. Bind, Wax and Sand never appear here: they come only on a term (`terms.ts`).
 * Tally is guaranteed in rooms 1-2 while the household lacks it (the notary's precondition) and
 * Lift is guaranteed at the heart, where no term can exist. All weights are *tune by playing*.
 *
 * `LOOT_TABLES` (`data/loot.ts`) cannot hold these until `LootTableId` admits the namespaced ids;
 * that is part of the gate flip, so tests register them themselves.
 */
export interface InkLootTable {
  id: InkTableId;
  entries: readonly LootEntry[];
  /** Offered at the top of the table until the household has it. */
  guaranteed?: LootSpec;
}

const rune = (r: RuneId, weight: number): LootEntry => ({
  spec: { kind: 'rune', rune: r },
  weight,
});
const ink = (weight: number): LootEntry => ({ spec: { kind: 'ink' }, weight });
const vellum = (weight: number): LootEntry => ({ spec: { kind: 'vellum', amount: 1 }, weight });

export const INK_LOOT_TABLES: Readonly<Record<InkTableId, InkLootTable>> = {
  'inkQuarter:shallow': {
    id: 'inkQuarter:shallow',
    entries: [rune('sentence', 3), rune('levy', 3), rune('tally', 2), ink(3)],
    guaranteed: { kind: 'rune', rune: 'tally' },
  },
  'inkQuarter:deep': {
    id: 'inkQuarter:deep',
    entries: [
      rune('sentence', 2),
      rune('levy', 2),
      rune('tally', 2),
      ink(3),
      vellum(1),
      { spec: { kind: 'doorway' }, weight: 1 },
    ],
  },
  'inkQuarter:heart': {
    id: 'inkQuarter:heart',
    entries: [
      { spec: { kind: 'method', method: 'lift' }, weight: 3 },
      rune('sentence', 2),
      rune('levy', 2),
      ink(2),
      vellum(1),
    ],
    guaranteed: { kind: 'method', method: 'lift' },
  },
};
