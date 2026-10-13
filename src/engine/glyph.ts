import type { Cluster } from './cluster';
import type { Coord, Dir } from './grid';
import type { GlyphDef, Lattice } from './types';

/** Glyphs (design research-and-mastery §4.4): cost, local-frame rotation and the Fair Copy collapse. */

/** Ink for a placed Glyph before outer auras: max(1, Σ inner − floor(cells / 3)). */
export function glyphCost(_g: GlyphDef): number {
  throw new Error('not implemented (B1)');
}

/** A local offset rotated so the local 'right' points `dir`. */
export function rotateLocal(_c: Coord, _dir: Dir): Coord {
  throw new Error('not implemented (B1)');
}

/** Collapses the cluster into its entry socket holding `glyph` (plan P2). */
export function fairCopy(_l: Lattice, _cluster: Cluster, _glyph: GlyphDef): Lattice {
  throw new Error('not implemented (B1)');
}

/** Runes outside the cluster that would no longer be reached after the collapse (plan P2). */
export function disconnected(_l: Lattice, _cluster: Cluster): Coord[] {
  throw new Error('not implemented (B1)');
}
