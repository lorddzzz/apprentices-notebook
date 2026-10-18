import type { SolventId } from '$data/next/types';
import type { Ctx } from './ctx';
import type { Hook } from './hooks';
import type { BattleState, Flow, Target } from './model';

/** One hook set per solvent, applied to any invention flavoured with it (design §6.3, P38). */
export interface SolventRule {
  widen?(s: BattleState, t: Target, flow: Flow): Target[];
  onReach?(ctx: Ctx, t: Target, flow: Flow): void;
  pushBonus?: number;
  reach?: number;
  delay?: 'round';
  reverse?: boolean;
  noSpread?: boolean;
  after?(ctx: Ctx, t: Target, flow: Flow): void;
  onHook?(ctx: Ctx, h: Hook): void;
}
/** Filled by E8. */
export const SOLVENT_RULES: Partial<Record<SolventId, SolventRule>> = {};

/** Fans a hook out to every solvent rule that listens. */
export function onHook(ctx: Ctx, h: Hook): void {
  for (const r of Object.values(SOLVENT_RULES)) r?.onHook?.(ctx, h);
}
