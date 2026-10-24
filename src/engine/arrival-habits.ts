import type { HabitId, LineId } from '$data';
import type { ArrivalCause, ArrivalHookList } from './arrival';
import type { Ctx } from './ctx';
import { habitOf, ruleOf } from './habits';
import { openJar } from './jars';
import { findUnit, isAlive, tileAt } from './queries';

/**
 * AH's arrival hooks (actions-habits plan P12), composed between the core hooks and the district
 * pieces' hooks in `arrivalHooks()`. Body habits that answer an arrival live here.
 */

/** Causes where she moves herself: the opening is the habit's headline, not its fine print. */
const OWN_STEP: readonly ArrivalCause[] = ['walk', 'hop'];

/**
 * fuseOnStep: her own Fuse (dusk) jar opens under her when she arrives on it, on the same tiles
 * the core `stepJar` hook answers, for every cause. Only the `jarOpened` event carries the habit;
 * an arrival she did not make herself also carries `fuseOnStep:jar`.
 */
const fuseOnStep: ArrivalHookList[number] = {
  id: 'habit:fuseOnStep',
  answers: 'each',
  subjects: ['unit'],
  run(ctx, a) {
    if (a.subject.kind !== 'unit') return 'go';
    const u = findUnit(ctx.s, a.subject.unit);
    const jar = tileAt(ctx.s, a.at).jar;
    if (!u || !isAlive(u) || jar?.event !== 'dusk' || jar.owner !== u.id) return 'go';
    const habit = habitOf(u);
    if (!habit || !ruleOf(habit).fuseOnStep) return 'go';
    const cause = a.cause as ArrivalCause;
    const line: LineId | null = OWN_STEP.includes(cause) ? null : 'fuseOnStep:jar';
    tagFirst(ctx, 'jarOpened', () => openJar(ctx, a.at, u.id), {
      habit,
      ...(line ? { line } : {}),
    });
    return 'go';
  },
};

/** Tags the first `type` event `fn` logs, and nothing else it logs (AH-2's tagging convention). */
function tagFirst(
  ctx: Ctx,
  type: string,
  fn: () => void,
  tag: { habit: HabitId; line?: LineId },
): void {
  const from = ctx.log.length;
  fn();
  const i = ctx.log.findIndex((e, k) => k >= from && e.type === type);
  const e = ctx.log[i];
  if (e) ctx.log[i] = { ...e, ...tag };
}

/** AH's hooks in run order. */
export const HABIT_ARRIVAL_HOOKS: ArrivalHookList = [fuseOnStep];
