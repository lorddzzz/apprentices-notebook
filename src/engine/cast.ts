import type { Ctx } from './ctx';
import type { Action } from './types';

export type CastAction = Extract<Action, { type: 'cast' }>;

/**
 * Stub until step 5 (spell casting). Legality is checked by `isLegal` in battle.ts before this
 * runs; the real version spends the charge, marks the member as acted and resolves the spell.
 */
export function castAction(_ctx: Ctx, _action: CastAction): void {
  throw new Error('cast: not implemented');
}

/** Stub until step 5: recasts queued echoes at the start of the player phase. */
export function runEchoes(_ctx: Ctx): void {}
