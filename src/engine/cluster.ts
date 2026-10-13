import type { Coord } from './grid';
import type { GlyphDef, GlyphLibrary, Lattice } from './types';

/** Clusters (design research-and-mastery §4.1): prefix-closed subtrees of a spell's flow tree. */

export interface Cluster {
  root: Coord; // the entry cell (a Source for a Spell cluster)
  cells: readonly Coord[]; // flow cells incl. root, 3..8, walk order
  auras: readonly Coord[]; // auras touching the cells (travel with it, plan P3)
  kind: 'spell' | 'payload';
}

export function clustersOf(_l: Lattice, _glyphs: GlyphLibrary): Cluster[] {
  throw new Error('not implemented (B2)');
}

/** Canonical form: invariant under rotation and translation, not mirroring; arrows rotate with cells. */
export function canonical(_cells: readonly { at: Coord; token: string }[]): string {
  throw new Error('not implemented (B2)');
}

/** Auras touching the cluster that also touch cells outside it: they block the Fair Copy (plan P3). */
export function blockingAuras(_l: Lattice, _cluster: Cluster): Coord[] {
  throw new Error('not implemented (B2)');
}

export function toGlyphDef(_l: Lattice, _cluster: Cluster, _name: string, _id: string): GlyphDef {
  throw new Error('not implemented (B2)');
}
