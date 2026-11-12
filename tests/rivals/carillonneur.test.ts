import { describe, expect, test } from 'vitest';
import { ENEMIES } from '$data';
import { FOUNDRY_TUNING } from '$data/districts/foundry';
import { VARIANTS } from '$data/footnotes';
import { RIVAL_PAGES, RIVALS } from '$data/rivals';
import {
  CARILLONNEUR_PAGE,
  CARILLONNEUR_TOLL,
  CARILLONNEUR_TRICK_ID,
  RING_TRUE,
} from '$data/rivals/carillonneur';
import { newProfile, type Profile } from '$engine';
import '$engine';
import { FOUNDRY_MODULE, PLAYS_A_TUNE, RING_TRUE_GOAL } from '$engine/districts/foundry';
import { parseLattice } from '$engine/notation';
import { rivalNoteVisible } from '$engine/rivals/pages';
import { marginOf, writeAt } from '../../src/app/desk';

/**
 * BF-24 (foundry plan P10, P15; rivals P11): the Carillonneur's recovered page and his note on
 * Toll. The note is a third option in Toll's capstone (Toll has no written lines yet), hidden until
 * his page is held, then offered with its credit line, and filing it in the slot credits the write.
 * His def, shell, trick and goal ids agree.
 */

const PAGE = 'carillonneur:tune' as const;
const toll = (pages: Profile['pages']): Profile => ({
  ...newProfile(),
  pages,
  footnotes: { toll: { points: 999, slots: {} } },
  solventsFound: ['rivet', 'filings'],
  solvents: { ...newProfile().solvents, rivet: 4, filings: 4 },
});
const capstone = (p: Profile) => marginOf(p, 'toll').capstone;

describe('his def, shell and page', () => {
  test('BF-24: the def, the page, the shell, the trick and the goal agree', () => {
    const def = RIVALS.carillonneur;
    expect(def).toMatchObject({
      token: 'V',
      district: 'foundry',
      page: PAGE,
      trick: CARILLONNEUR_TRICK_ID,
      move: 0,
      hp: FOUNDRY_TUNING.carillonneur.hp,
    });
    expect(CARILLONNEUR_TRICK_ID).toBe(PLAYS_A_TUNE);
    expect(RING_TRUE).toBe(RING_TRUE_GOAL);
    expect(FOUNDRY_MODULE.tricks?.map((t) => t.id)).toContain(PLAYS_A_TUNE);
    expect(FOUNDRY_MODULE.goals?.map((g) => g.id)).toContain(RING_TRUE_GOAL);
    expect(def?.routine.every((r) => r.goal === RING_TRUE_GOAL)).toBe(true);
    expect(ENEMIES.carillonneur).toMatchObject({
      token: 'V',
      hp: def?.hp,
      move: def?.move,
      boss: true,
    });
    for (const sp of def?.spells ?? []) expect(parseLattice(sp.lattice)).toBeDefined();
    const page = RIVAL_PAGES[PAGE];
    expect(page).toBe(CARILLONNEUR_PAGE);
    expect(def?.spells.map((s) => s.id)).toContain(page?.spell);
    expect(page?.lattice).toBe(def?.spells.find((s) => s.id === page?.spell)?.lattice);
  });

  test('BF-24: the page text is present, with the Seam thread in his story', () => {
    expect(CARILLONNEUR_PAGE.title).toBe('Tune');
    expect(CARILLONNEUR_PAGE.annotation.length).toBeGreaterThan(40);
    expect(CARILLONNEUR_PAGE.annotation).toContain('Toll');
    expect(CARILLONNEUR_PAGE.story).toContain('The Seam has no bell.');
    expect(CARILLONNEUR_PAGE.trial.board.length).toBeGreaterThan(0);
    expect(CARILLONNEUR_PAGE.note).toEqual({
      rune: 'toll',
      line: 'toll:network',
      variant: CARILLONNEUR_TOLL,
    });
  });
});

describe("the Carillonneur's note on Toll", () => {
  test('BF-24: the note is registered as a rival note on Toll', () => {
    const v = VARIANTS.find((x) => x.id === CARILLONNEUR_TOLL);
    expect(v).toMatchObject({ subject: 'toll', rival: 'carillonneur', slot: { capstone: true } });
    expect(v?.credit).toBe("Copied from the Carillonneur's tuning sheet.");
  });

  test('BF-24: hidden without his page', () => {
    expect(rivalNoteVisible(newProfile(), CARILLONNEUR_TOLL)).toBe(false);
    expect(capstone(toll([]))).toBeNull();
  });

  test('BF-24: offered once his page is held, credited, and writing it files it in the slot', () => {
    const p = toll([PAGE]);
    expect(rivalNoteVisible(p, CARILLONNEUR_TOLL)).toBe(true);
    const frame = capstone(p);
    const note = frame?.variants.find((v) => v.id === CARILLONNEUR_TOLL);
    expect(note?.credit).toBe("Copied from the Carillonneur's tuning sheet.");
    expect(frame?.state).toBe('open');
    const r = writeAt(p, 'toll', CARILLONNEUR_TOLL, { atHome: true });
    if ('error' in r) throw new Error(r.error);
    expect(r.profile.footnotes.toll?.capstone).toBe(CARILLONNEUR_TOLL);
    expect(capstone(r.profile)?.state).toBe('filled');
  });
});
