import { TONES } from '$data/districts/foundry';
import type { BattleState } from '../../types';
import type { BotTerms } from '../types';
import { pulseTiles } from './ring';
import { BELLS_RULE_ID } from './types';

/**
 * What the next ring is worth where it stands (BF-20): a foe beside a bell that would ring is a
 * pulse waiting for one strike (1 each, more when it is nearly down); a party member beside one is
 * a pulse waiting for a Ringer's strike (never end a turn there). 0 off a foundry board.
 */
function pulseTerm(s: BattleState): number {
  if (!s.rules?.[BELLS_RULE_ID]) return 0;
  const hit = new Set<string>();
  for (const tone of TONES) for (const c of pulseTiles(s, tone)) hit.add(`${c.x},${c.y}`);
  let v = 0;
  for (const u of s.units) {
    if (u.bystander || u.hp <= 0 || u.out || !hit.has(`${u.pos.x},${u.pos.y}`)) continue;
    if (u.kind === 'enemy') v += 6 + (u.hp <= 1 ? 10 : 0);
    else v -= 15;
  }
  return v;
}

export const FOUNDRY_BOT: BotTerms = { value: pulseTerm };
