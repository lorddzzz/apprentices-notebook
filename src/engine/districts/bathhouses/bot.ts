import type { BattleState } from '../../types';
import type { BotTerms } from '../types';
import { boilOverState, forecastBoilOver } from './boilOver';

/**
 * What the forecast boil-over is worth at round end: foes standing in the steam take 2 (brewing on
 * purpose), party members on a cloud take 2 (never end the round in a cloud that boils). 0 on a
 * board without the rule.
 */
function boilTerm(s: BattleState): number {
  const own = boilOverState(s);
  if (!own) return 0;
  const f = forecastBoilOver(s, own);
  if (!f.boils) return 0;
  let v = 0;
  for (const id of f.units) {
    const u = s.units.find((x) => x.id === id);
    if (!u || u.bystander) continue;
    if (u.kind === 'enemy') v += 10 * Math.min(2, u.hp) + (u.hp <= 2 ? 20 : 0);
    else v -= 30 * Math.min(2, u.hp) + (u.hp <= 2 ? 200 : 0);
  }
  return v;
}

export const BATH_BOT: BotTerms = { value: boilTerm };
