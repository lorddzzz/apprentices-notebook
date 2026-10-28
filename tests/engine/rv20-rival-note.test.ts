import { describe, expect, test } from 'vitest';
import type { VariantDef } from '$data';
import { RIVAL_PAGES } from '$data/rivals';
import { LAMPLIGHTER_PAGE, LAMPLIGHTER_WICK } from '$data/rivals/lamplighter';
import { newProfile, type Profile } from '$engine';
import { rivalNoteVisible } from '$engine/rivals/pages';
import { marginOf, writeAt } from '../../src/app/desk';

/**
 * The Lamplighter's Jar note (footnotes §1 "Rival notes", plan RV-20): a rival's variant sits in
 * a named Jar slot, hidden until his page is held, and still needs the slot's level and solvents.
 */

const WICK = LAMPLIGHTER_WICK.id;
const PAGE = LAMPLIGHTER_PAGE.id;
const PLAIN: VariantDef = {
  id: 'jar-plain',
  subject: 'jar',
  slot: { line: 'jar:unit', level: 1 },
  text: 'A plain jar note, for the margin test only.',
};
const FIXTURE = [PLAIN, LAMPLIGHTER_WICK];
const ctx = { atHome: true, variants: FIXTURE };

/** A profile with the Jar line witnessed and level I reached (8 points), no solvents, no page. */
const jarProfile = (over: Partial<Profile> = {}): Profile => ({
  ...newProfile(),
  witnessed: ['jar:unit'],
  footnotes: { jar: { points: 8, slots: {} } },
  ...over,
});
const withPage = (p: Profile): Profile => ({ ...p, pages: [PAGE] });
const jarLevelOne = (p: Profile) => marginOf(p, 'jar', { variants: FIXTURE }).lines[0]?.frames[0];

describe('the Lamplighter’s Jar note (RV-20)', () => {
  test('is a level I option on the Jar line, tied to his rival and to his page', () => {
    expect(LAMPLIGHTER_WICK).toMatchObject({
      id: 'lamplighter:wick',
      subject: 'jar',
      slot: { line: 'jar:unit', level: 1 },
      rival: 'lamplighter',
    });
    expect(RIVAL_PAGES[PAGE]?.note?.variant).toBe(WICK);
    expect(RIVAL_PAGES[PAGE]?.note?.line).toBe('jar:unit');
  });

  test('hidden in the Jar margin, and from the rival-note hook, until his page is held', () => {
    expect(rivalNoteVisible(newProfile(), WICK)).toBe(false);
    const frame = jarLevelOne(jarProfile());
    expect(frame?.state).toBe('open');
    expect(frame?.variants.map((v) => v.id)).toEqual(['jar-plain']);
  });

  test('shown in the Jar margin, credited to the Lamplighter, once his page is held', () => {
    const p = withPage(jarProfile());
    expect(rivalNoteVisible(p, WICK)).toBe(true);
    const frame = jarLevelOne(p);
    expect(frame?.variants.map((v) => v.id)).toEqual(['jar-plain', WICK]);
    expect(frame?.variants.find((v) => v.id === WICK)?.credit).toBe("Lamplighter's hand.");
    expect(frame?.variants.find((v) => v.id === 'jar-plain')?.credit).toBeNull();
  });

  test('refused without the page, even with the level and the line', () => {
    expect(writeAt(jarProfile(), 'jar', WICK, ctx)).toEqual({
      error: "That note is in a rival's hand you do not hold.",
    });
  });

  test('gated by the slot level: 7 points is not yet level I of Jar (8 needed)', () => {
    const short = withPage(jarProfile({ footnotes: { jar: { points: 7, slots: {} } } }));
    expect(writeAt(short, 'jar', WICK, ctx)).toEqual({
      error: 'That margin is not yet within your reach.',
    });
  });

  test('gated by the witnessed line: an unseen jar:unit cannot be written', () => {
    const unseen = withPage(jarProfile({ witnessed: [] }));
    expect(writeAt(unseen, 'jar', WICK, ctx)).toEqual({
      error: 'That margin is not yet within your reach.',
    });
  });

  test('refused without solvents: the frame says what it needs and spends nothing', () => {
    // Until a `jar:unit` row exists in LINES, the solvent set for this line is empty, so every
    // write is refused for want of a solvent. This pins the refusal, not the paid path (below).
    const p = withPage(jarProfile());
    const r = writeAt(p, 'jar', WICK, ctx);
    expect(r).toHaveProperty('error');
    const frame = jarLevelOne(p);
    expect(frame?.spends).toEqual([]);
    expect(frame?.blocked).toBe('Needs a solvent');
  });

  test.todo(
    'written with the page, level I and one district solvent: spends that solvent once jar:unit has a LINES row',
  );
});
