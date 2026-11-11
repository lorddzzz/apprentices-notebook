import { describe, expect, test } from 'vitest';
import { BRIDGE_HEART } from '$data/districts/bridges';
import { RIVAL_PAGES, RIVALS } from '$data/rivals';
import { createBattle, FOUNDERS, finishEncounter, newProfile, newSave, type Trip } from '$engine';
import { parseLattice } from '$engine/notation';
import { pagesHeld } from '$engine/rivals/pages';
import { setOut } from '../../src/app/flow';

/**
 * BR-20 (bridges P16, P17; rivals P11): the Chief Warden is a rival. His page, *Mind the edge*,
 * banks when he is felled in his own district and rides on the profile through a wipe. His right of
 * way is his trick (scenarios in tests/districts/bridges).
 */

const PAGE = 'chiefWarden:mindTheEdge' as const;

const heartFight = () => {
  const save = setOut(
    {
      ...newSave(1),
      profile: (() => {
        const p = newProfile();
        return {
          ...p,
          city: {
            ...p.city,
            heard: [...p.city.heard, 'bridges'],
            open: [...p.city.open, 'bridges'],
          },
        };
      })(),
    },
    'bridges',
  );
  const b = structuredClone(
    createBattle({
      title: 'The great arch',
      board: BRIDGE_HEART.variants[0]?.layout ?? '',
      seed: 1,
      edge: 'drop',
      lineup: FOUNDERS,
    }).state,
  );
  return { save, trip: { ...(save.trip as Trip), encounter: 4 }, b };
};

describe('the rival and his page', () => {
  test('BR-20: the def, the page and the shell agree', () => {
    const def = RIVALS.chiefWarden;
    expect(def).toMatchObject({
      token: 'K',
      district: 'bridges',
      page: PAGE,
      move: 0,
      elite: true,
    });
    expect(RIVAL_PAGES[PAGE]).toMatchObject({ rival: 'chiefWarden', title: 'Mind the edge' });
    expect(RIVAL_PAGES[PAGE]?.note?.rune).toBe('brink');
    for (const sp of def?.spells ?? []) expect(parseLattice(sp.lattice)).toBeDefined();
  });

  test('BR-20: his page banks on a win', () => {
    const { save, trip, b } = heartFight();
    b.phase = 'won';
    for (const u of b.units) if (u.kind === 'enemy') u.hp = 0;
    const done = finishEncounter(save.profile, trip, b);
    expect(pagesHeld(done.profile)).toEqual([PAGE]);
  });

  test('BR-20: his page is kept on a wipe', () => {
    const { save, trip, b } = heartFight();
    const held = { ...save.profile, pages: [PAGE] };
    b.phase = 'lost';
    const done = finishEncounter(held, trip, b);
    expect(done.outcome).toBe('wiped');
    expect(pagesHeld(done.profile)).toEqual([PAGE]);
  });
});
