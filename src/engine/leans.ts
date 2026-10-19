import type { AuraRuneId } from '$data';
import { giftedIn } from './queries';
import type { Unit } from './types';

/** How many jars a unit keeps at once: one, two with the Draughtsman's habit (P36, J4). */
export const jarLimit = (u: Unit): number =>
  u.kind === 'member' && u.lean.habit === 'twoJars' ? 2 : 1;

const isAura = (a: unknown): a is AuraRuneId => a === 'afterglow' || a === 'steep' || a === 'coil';

/** The auras among `auras` the caster is gifted in (design §9): Afterglow, Steep and Coil work one step better. */
export const giftedAuras = (caster: Unit | null, auras: readonly unknown[]): AuraRuneId[] =>
  caster ? auras.filter(isAura).filter((a) => giftedIn(caster, a)) : [];
