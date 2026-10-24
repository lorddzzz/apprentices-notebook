import { ENEMIES } from '$data';
import { cloneData } from './clone';
import { type Ctx, emit, ref } from './ctx';
import { KIT } from './districts/kit';
import type { ScriptStep } from './districts/types';
import { isAlive } from './queries';
import type { BattleState, EnemyUnit, Intent } from './types';

/**
 * Scripted foes (DK-9, P14): a stand-in heart, or any district foe, walks a list of registered
 * steps by round. Each step plans a telegraph (RV's contract) in the enemy phase and acts on it
 * in the resolve phase; the foe never walks. A step that cannot plan idles.
 */

/** The step a scripted foe takes this round: round 1 is step 0, then cycled. */
export function stepOf(s: BattleState, e: EnemyUnit): ScriptStep | null {
  const script = ENEMIES[e.def].script;
  if (!script || script.steps.length === 0) return null;
  const id = script.steps[(Math.max(1, s.round) - 1) % script.steps.length];
  const step = id === undefined ? undefined : KIT.steps[id];
  if (!step) throw new Error(`Unknown script step '${id}' for ${e.def}`);
  return step;
}

/** Plans and telegraphs the foe's step for this round. Returns true if it telegraphed. */
export function scriptAct(ctx: Ctx, e: EnemyUnit, order: number): boolean {
  const step = stepOf(ctx.s, e);
  const telegraph = step?.plan(ctx.s, e) ?? null;
  if (!step || !telegraph) {
    e.intent = null;
    emit(ctx, { type: 'idle', unit: ref(e) });
    return false;
  }
  const intent: Intent = { kind: 'step', step: step.id, telegraph, order };
  e.intent = cloneData(intent);
  emit(ctx, {
    type: 'telegraph',
    unit: ref(e),
    intent: cloneData(intent),
    verb: step.describe(telegraph),
  });
  return true;
}

/** Acts on a telegraphed step, unless the foe was downed meanwhile. */
export function actStep(ctx: Ctx, e: EnemyUnit, intent: Extract<Intent, { kind: 'step' }>): void {
  const step = KIT.steps[intent.step];
  if (!step || !isAlive(e)) return;
  step.act(ctx, e, intent.telegraph);
}

/** Does clearing this foe award a rival page? A stand-in never does (P14). */
export const awardsPage = (e: Pick<EnemyUnit, 'def'>): boolean => !ENEMIES[e.def].script?.standIn;
