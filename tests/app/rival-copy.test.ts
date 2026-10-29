import { expect, test } from 'vitest';
import { latticeOf, newProfile, type Profile, serializeLattice } from '$engine';
import { copySpellToPage } from '../../src/app/study';

/** Copy to the Study (rivals plan RV-19, P14): a held page's spell goes onto an apprentice's page. */

const LANTERN = 'Bolt> Jar Oil Spark';
const WHO = 'draughtsman' as const;

/** A held page on an empty notebook page: the starter wiring is cleared so the copy is easy to read. */
const owning = (ink = 20): Profile => {
  const base = newProfile();
  return {
    ...base,
    ink,
    known: ['bolt', 'jar', 'oil', 'spark'],
    pages: ['lamplighter:lantern'],
    lattices: { ...base.lattices, [WHO]: [] },
  };
};

const cells = (p: Profile) => latticeOf(p, WHO).runes;

test('copy succeeds with all parts owned and writes the lattice onto the page', () => {
  const p = owning();
  const r = copySpellToPage(p, WHO, LANTERN);
  expect('profile' in r).toBe(true);
  if (!('profile' in r)) return;
  const runes = cells(r.profile).map((c) => ('rune' in c ? c.rune : c.glyph));
  expect(runes).toEqual(['bolt', 'jar', 'oil', 'spark']);
  // The arrow keeps its direction.
  expect(cells(r.profile)[0]).toMatchObject({ rune: 'bolt', dir: 'right' });
});

test('the copy lands on a free row below what is already on the page', () => {
  const start = owning();
  const first = copySpellToPage(start, WHO, LANTERN);
  if (!('profile' in first)) throw new Error('first copy should succeed');
  const second = copySpellToPage(first.profile, WHO, LANTERN);
  if (!('profile' in second)) throw new Error('second copy should succeed');
  const ys = new Set(cells(second.profile).map((c) => c.at.y));
  expect([...ys].sort((a, b) => a - b)).toEqual([0, 2]);
  expect(cells(second.profile)).toHaveLength(8);
});

test('a missing part refuses the copy and names it', () => {
  const p: Profile = { ...owning(), known: ['bolt', 'oil', 'spark'] };
  const r = copySpellToPage(p, WHO, LANTERN);
  expect(r).toEqual({ why: 'Not owned yet: Jar' });
  expect(cells(p)).toEqual([]);
});

test('ink overflow shows the ordinary ink error and writes nothing', () => {
  const p = owning(1);
  const r = copySpellToPage(p, WHO, LANTERN);
  expect('why' in r).toBe(true);
  if (!('why' in r)) return;
  expect(r.why).toMatch(/ink/i);
  expect(cells(p)).toEqual([]);
});

test('profile.known is unchanged by a copy', () => {
  const p = owning();
  const r = copySpellToPage(p, WHO, LANTERN);
  if (!('profile' in r)) throw new Error('copy should succeed');
  expect(r.profile.known).toEqual(p.known);
  expect(serializeLattice(latticeOf(r.profile, WHO))).toContain('Bolt>');
});
