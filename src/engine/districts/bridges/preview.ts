import type { BattleState } from '../../types';
import type { PreviewShape } from '../types';
import { fallersOn, fallingTiles } from './collapse';
import { cracksOf } from './support';
import { type BridgesState, parseBridges } from './types';

/**
 * The "Next round" overlay for P4 and the foe AI's view: the tiles that fall at dusk, and a pulse
 * on each grounded unit standing on one. It reads the collapse step's own selection, so the
 * preview and the real result cannot drift apart.
 */

/** The cracked span set (broken or cut off), which carriers and chalk foes can read. */
export const crackedSet = (s: BattleState, own?: BridgesState) =>
  cracksOf(s, own === undefined ? undefined : parseBridges(own));

export function previewCollapse(s: BattleState, own: unknown): PreviewShape[] {
  const state = parseBridges(own);
  const falling = fallingTiles(s, state);
  const out: PreviewShape[] = falling.map((at) => ({ kind: 'tile', at, tone: 'warn' }));
  for (const f of fallersOn(s, falling)) out.push({ kind: 'pulse', at: { ...f.unit.pos } });
  return out;
}
