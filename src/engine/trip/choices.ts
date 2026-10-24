import type { CrossroadsChoice, TakenChoice } from '../districts/types';
import type { Trip } from '../types';
import { crossesNoReturn, returnCheck } from './ret';
import { type DistrictShape, heartOf, reachedCheckpoint, shapeInput, shapeOf } from './shape';
import { need } from './shared';

export const NO_WAY_HOME = 'After this room: no way home until the heart.';

const PUSH: CrossroadsChoice = { id: 'push', label: 'Push on', kind: 'push' };
const RETURN: CrossroadsChoice = { id: 'return', label: 'Return home', kind: 'return' };

/**
 * The Crossroads' choices (P4): the module's ways on (span choices, the doorway) or the default
 * push, then Return home, greyed with its reason when the way home is shut. A cleared heart only
 * goes home. A way on that walks past the point of no return carries the warning.
 */
export function choicesAt(
  t: Trip,
  shape: DistrictShape = shapeOf(t.district),
): readonly CrossroadsChoice[] {
  need(t, 'crossroads', 'cleared');
  const check = returnCheck(t, shape);
  const home: CrossroadsChoice = check.ok ? RETURN : { ...RETURN, disabled: check.why };
  if (t.status === 'cleared' || t.encounter >= heartOf(shape)) return [home];
  const own = shape.trip?.choices?.(shapeInput(t, shape));
  const ways = own && own.length > 0 ? own.filter((c) => c.kind !== 'return') : [PUSH];
  const warn = crossesNoReturn(t, shape);
  return [...ways.map((c) => (warn && !c.warn ? { ...c, warn: NO_WAY_HOME } : c)), home];
}

/**
 * Takes a way on from the Crossroads (P4): the next room becomes current. On a trip that carries a
 * kit the choice is recorded with the variant pool it fixes, so a reload replays the same room,
 * and passing the checkpoint is noted (P5). Return home goes through `returnHome` instead.
 */
export function takeChoice(t: Trip, id: string, shape: DistrictShape = shapeOf(t.district)): Trip {
  need(t, 'crossroads');
  if (t.encounter + 1 >= shape.length) throw new Error('There is nothing deeper');
  const choice = choicesAt(t, shape).find((c) => c.id === id);
  if (!choice) throw new Error(`No choice "${id}" here`);
  if (choice.disabled) throw new Error(choice.disabled);
  if (choice.kind === 'return') throw new Error('Return home goes through returnHome');
  const next = { ...t, encounter: t.encounter + 1, status: 'fight' as const };
  if (!t.kit) return next;
  const taken: TakenChoice = { after: t.encounter, id };
  if (choice.variantPool && choice.variantPool.length > 0) taken.pool = [...choice.variantPool];
  const checkpoint = t.kit.checkpoint || reachedCheckpoint(shape, next);
  return { ...next, kit: { ...t.kit, choices: [...t.kit.choices, taken], checkpoint } };
}
