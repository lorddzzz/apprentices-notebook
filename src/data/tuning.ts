import type { Tuning } from './types';

export const TUNING: Tuning = {
  grid: { width: 6, height: 8 },
  inkCost: { source: 2, material: 1, shape: 1, trigger: 2, aura: 3 },
  startInk: 8,
  inkReserve: 2,
  affinityBonus: 1,
  inkedBonus: 1,
  detonateDamage: 2,
  bumpDamage: 1,
  fireDamage: 1,
  oilSoakedBonus: 1,
  fireRounds: 2,
  steamRounds: 2,
  splashRange: 3,
  splashRadius: 1,
  echoDivisor: 2,
  reviveHp: 1,
  offersPerWin: 3,
};
