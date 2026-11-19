import { FOUNDRY_TUNING, TONES } from '$data/districts/foundry';
import { key } from '../../grid';
import type { BattleState } from '../../types';
import type { BotTerms } from '../types';
import { isHumming, pulseTiles } from './ring';
import { BELLS_RULE_ID } from './types';

/**
 * What the next ring is worth where it stands (BF-20): a foe beside a bell that would ring is a
 * pulse waiting for one strike (1 each, more when it is nearly down); a party member beside one is
 * a pulse waiting for a Ringer's strike (never end a turn there). A tone already humming this round
 * cannot ring again before round end, so its tiles are not counted. 0 off a foundry board.
 */
function pulseTerm(s: BattleState): number {
  if (!s.rules?.[BELLS_RULE_ID]) return 0;
  const hit = new Set<string>();
  for (const tone of TONES) {
    if (isHumming(s, tone)) continue;
    for (const c of pulseTiles(s, tone)) hit.add(key(c));
  }
  const w = FOUNDRY_TUNING.botPulse;
  let v = 0;
  for (const u of s.units) {
    if (u.bystander || u.hp <= 0 || u.out || !hit.has(key(u.pos))) continue;
    if (u.kind === 'enemy') v += w.foe + (u.hp <= w.nearlyDownHp ? w.foeNearlyDown : 0);
    else v -= w.member;
  }
  return v;
}

export const FOUNDRY_BOT: BotTerms = { value: pulseTerm };
