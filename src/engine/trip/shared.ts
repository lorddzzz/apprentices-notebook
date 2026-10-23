import { MEMBER_IDS, type MemberId } from '$data';
import type { CellKey, GlyphArg, Placed, Trip, TripStatus } from '../types';
import { isGlyph } from '../types';

export function perMember<T>(make: (m: MemberId) => T): Record<MemberId, T> {
  return Object.fromEntries(MEMBER_IDS.map((m) => [m, make(m)])) as Record<MemberId, T>;
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
