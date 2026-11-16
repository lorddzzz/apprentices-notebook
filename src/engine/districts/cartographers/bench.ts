import type { Meets } from '$data';
import type { PieceDef } from '../types';
import { BLANK_PIECE, OUTLINE_PIECE, PENCIL_PIECE } from './types';

/**
 * CG-13: the paper pieces on the Bench and in the Lab. Each is offered once the household has met
 * it in a fight (`bench.met`, the same key `metIn` notes from the board). The Bench and Lab palettes
 * offer the pencil with its fate chosen (`ink` or `rub`, the Lab's piece variants) and the outline
 * once per hand. The three hands are plain foes, so the foes the household has met already reach the
 * palette through `foesMet`; the Registrar is a rival and never does.
 */
export const CARTOGRAPHERS_BENCH: Readonly<Record<string, { met: Meets; label: string }>> = {
  [PENCIL_PIECE]: { met: 'pencil', label: 'Pencil' },
  [BLANK_PIECE]: { met: 'blank', label: 'Blank paper' },
  [OUTLINE_PIECE]: { met: 'outline', label: 'Outline' },
};

/** The piece with its Bench and Lab palette entry; pieces the table does not name come back as is. */
export const withBench = (def: PieceDef): PieceDef => {
  const entry = CARTOGRAPHERS_BENCH[def.id];
  return entry ? { ...def, bench: entry, palette: { label: entry.label, lab: true } } : def;
};
