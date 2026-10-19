import type { Ctx } from './ctx';
import { memberById, spellOf } from './queries';
import { resolveSpell } from './resolve';
import type { Action } from './types';

export type CastAction = Extract<Action, { type: 'cast' }>;

/** Cast action (legality checked by `isLegal`): spends the charge and the action, then resolves. */
export function castAction(ctx: Ctx, action: CastAction): void {
  const m = memberById(ctx.s, action.unit);
  const spell = spellOf(m, action.spell);
  if (!spell) throw new Error(`${m.name} has no spell at ${action.spell}`);
  if (!ctx.s.lab) m.charges[spell.key] = (m.charges[spell.key] ?? 0) - 1;
  m.acted = true;
  m.undo = null;
  resolveSpell(ctx, m, spell, action.aim);
}
