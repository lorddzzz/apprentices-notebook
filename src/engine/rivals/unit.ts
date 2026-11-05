import type { RivalDef } from '$data/rivals';
import { compileLattice } from '../lattice';
import { parseLattice } from '../notation';
import type { Spell } from '../types';
import { trickOf } from './tricks';
import type { RivalState } from './types';

/**
 * A rival's state at spawn: each kit spell compiled with full knowledge and no lean (P1), and its
 * signature trick's own state from `TrickDef.init` (RV-14; null without a trick).
 */
export function spawnRival(def: RivalDef): RivalState {
  const spells: Record<string, Spell> = {};
  const charges: Record<string, number> = {};
  for (const sp of def.spells) {
    const first = compileLattice(parseLattice(sp.lattice)).spells[0];
    if (!first) throw new Error(`Rival spell ${def.id}:${sp.id} has no source`);
    spells[sp.id] = { ...first, charges: sp.charges };
    charges[sp.id] = sp.charges;
  }
  const trick = def.trick ? (trickOf(def.trick)?.init(def) ?? null) : null;
  return { rival: def.id, spells, charges, trick, objects: [], locked: [] };
}
