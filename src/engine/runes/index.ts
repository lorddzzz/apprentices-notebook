import { isInvention, type RuneRef } from '$data';
import { runInvention } from '../inventions';
import type { Handler } from '../resolve';
import { ACTION_HANDLERS } from './actions';
import { KIND_HANDLERS } from './kinds';

/** The handler for an Action or Kind step's rune; inventions go through `runInvention` (E7). */
export function handlerFor(rune: RuneRef): Handler | null {
  if (isInvention(rune)) return (ctx, t, flow) => runInvention(ctx, rune, t, flow);
  if (rune in ACTION_HANDLERS) return ACTION_HANDLERS[rune as keyof typeof ACTION_HANDLERS];
  if (rune in KIND_HANDLERS) return KIND_HANDLERS[rune as keyof typeof KIND_HANDLERS];
  return null;
}
