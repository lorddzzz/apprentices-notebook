import type { AuraRuneId, VariantDef } from '../types';

/**
 * The aura capstones (plan FN P7): one generic diagonal reach, written for Afterglow, Steep and
 * Coil at once. Each aura's other capstone ships with its district batch. Compilation reads these
 * ids from the profile (`run.ts::compiledFor` → `compileLattice(..., { diagonalAuras })`).
 */
export const AURA_DIAGONAL: Readonly<Record<AuraRuneId, string>> = {
  afterglow: 'afterglow-diagonal',
  steep: 'steep-diagonal',
  coil: 'coil-diagonal',
};

const diagonal = (aura: AuraRuneId, name: string): VariantDef => ({
  id: AURA_DIAGONAL[aura],
  subject: aura,
  slot: { capstone: true },
  text: `${name} also reaches the runes diagonally touching it on the page.`,
});

/** Batch `auras` (plan FN P8). */
export const AURAS: readonly VariantDef[] = [
  diagonal('afterglow', 'Afterglow'),
  diagonal('steep', 'Steep'),
  diagonal('coil', 'Coil'),
];
