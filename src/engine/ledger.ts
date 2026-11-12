import { ledgerOf } from './drawing/profile';
import type { Profile, TripStats } from './types';

/**
 * Folds a finished trip into the lifetime ledger (P21): the trip's casts are added, the biggest
 * chain is replaced only by a larger one, and the districts follow `city.open`'s opening order.
 * Called from `returnHome` and the wipe path of `closeBattle` only.
 */
export function feedLedger(p: Profile, stats: TripStats): Profile {
  const was = ledgerOf(p);
  const casts = was.casts + stats.spells.reduce((n, s) => n + s.casts, 0);
  const b = stats.biggestChain;
  const biggest =
    b && (was.biggest === null || b.reactions > was.biggest.chain)
      ? { chain: b.reactions, caster: b.member, name: b.name }
      : was.biggest;
  return { ...p, ledger: { casts, biggest, districts: [...new Set(p.city.open)] } };
}
