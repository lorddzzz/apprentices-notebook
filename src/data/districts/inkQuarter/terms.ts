import type { TermDef } from './types';

/**
 * The quarter's terms (P6, P7): the list the `termed` offer kind rolls from. Empty until IQ-4 and
 * IQ-8 write it (tests mock this module with their own defs). Every entry must pass
 * `checkTermDefs` (`engine/districts/inkQuarter/terms.ts`): no term at the heart.
 */
export const INK_TERMS: readonly TermDef[] = [];
