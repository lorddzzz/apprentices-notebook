import type { RivalDef } from '$data/rivals';
import { compileLattice } from '../lattice';
import { parseLattice } from '../notation';
import type { Spell } from '../types';
import type { RivalState } from './types';

/** A rival's state at spawn: each kit spell compiled with full knowledge and no lean (P1). */
export function spawnRival(def: RivalDef): RivalState {
  const spells: Record<string, Spell> = {};
  const charges: Record<string, number> = {};
  for (const sp of def.spells) {
    const first = compileLattice(parseLattice(sp.lattice)).spells[0];
    if (!first) throw new Error(`Rival spell ${def.id}:${sp.id} has no source`);
    spells[sp.id] = { ...first, charges: sp.charges };
    charges[sp.id] = sp.charges;
  }
  return { rival: def.id, spells, charges, trick: null, objects: [], locked: [] };
}
