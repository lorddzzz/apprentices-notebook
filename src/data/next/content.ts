import type { BurstRow, LineDef, MixRow, VariantDef } from './types';

/** Design §4.2 mix table (16 rows, P13–P16). Filled by E2. */
export const MIXES: readonly MixRow[] = [];
/** Design §4.3 bursts and the burst page (15 rows, P18–P19). Filled by E2. */
export const BURSTS: readonly BurstRow[] = [];
/**
 * Every fine-print line (D1, D8, P4). Tasks append rows in their own `// <task>` block; C1 writes
 * the text of `pending` rows. The integrity test (L1) checks rows and fired lines both ways.
 */
export const LINES: readonly LineDef[] = [];
/** Footnote variants (P39): level I for Shove, Spark, Oil and Bolt. Filled by C1. */
export const VARIANTS: readonly VariantDef[] = [];
