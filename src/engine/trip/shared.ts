import type { ApprenticeId } from '$data';
import type { CellKey, GlyphArg, Placed, SpellKey, Trip, TripStatus } from '../types';
import { isGlyph } from '../types';

/** A record keyed by exactly the given apprentices (a trip's party), in their order. */
export function perMember<T>(
  party: readonly ApprenticeId[],
  make: (m: ApprenticeId) => T,
): Partial<Record<ApprenticeId, T>> {
  return Object.fromEntries(party.map((m) => [m, make(m)]));
}

/** A party member's trip HP. Throws for someone who did not set out (HC P1). */
export function hpOf(t: Pick<Trip, 'hp'>, m: ApprenticeId): number {
  const hp = t.hp[m];
  if (hp === undefined) throw new Error(`${m} is not on this trip`);
  return hp;
}

/** A party member's charges left, by spell. Throws for someone who did not set out. */
export function chargesLeftOf(t: Pick<Trip, 'charges'>, m: ApprenticeId): Record<SpellKey, number> {
  const c = t.charges[m];
  if (!c) throw new Error(`${m} is not on this trip`);
  return c;
}

const copyArgs = (args: Readonly<Record<CellKey, GlyphArg>>): Record<CellKey, GlyphArg> =>
  Object.fromEntries(Object.entries(args).map(([k, a]) => [k, { ...a }]));

export const copyRune = (r: Placed): Placed =>
  isGlyph(r)
    ? r.args
      ? { at: { ...r.at }, glyph: r.glyph, dir: r.dir, args: copyArgs(r.args) }
      : { at: { ...r.at }, glyph: r.glyph, dir: r.dir }
    : r.dir === undefined
      ? { at: { ...r.at }, rune: r.rune }
      : { at: { ...r.at }, rune: r.rune, dir: r.dir };

export const withAll = <T>(have: readonly T[], more: readonly T[]): T[] => [
  ...new Set([...have, ...more]),
];

export function need(t: Trip, ...allowed: TripStatus[]): void {
  if (!allowed.includes(t.status)) {
    throw new Error(`Trip is "${t.status}", expected ${allowed.map((s) => `"${s}"`).join(' or ')}`);
  }
}
