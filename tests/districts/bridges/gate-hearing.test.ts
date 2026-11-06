import { describe, expect, test } from 'vitest';
import { DISTRICTS, type DistrictId } from '$data';
import { hearFromBattle, newProfile, startTrip } from '$engine';
import type { GameEvent } from '$engine/events';

/**
 * BR-12 (bridges-plan P15): the Wall hearing. Performed by an apprentice in the Seam opens the
 * bridges' hearing; the same idiom in the canals does not; a foe's Wall hears nothing for the owner.
 */

/** A finished fight's log holding one named Wall, credited to the given caster. */
const wall = (caster: string | undefined): GameEvent => ({
  type: 'named',
  what: 'idiom',
  id: 'theWall',
  ...(caster ? { origin: { caster, spell: 'a', cast: 1 } } : {}),
});

describe('BR-12 the Wall hearing (P15)', () => {
  test('performed in the Seam by an apprentice opens the bridges', () => {
    const p = newProfile();
    const t = startTrip(p, 1, 'seam');
    const by = t.party[0];
    if (!by) throw new Error('expected a party member');
    expect(hearFromBattle(p, t, [wall(by)]).heard).toContain('bridges');
  });

  test('performed in the canals does not open the bridges', () => {
    const base = newProfile();
    const open: DistrictId[] = [...base.city.open, 'canals'];
    const p = { ...base, city: { ...base.city, open } };
    const t = startTrip(p, 1, 'canals');
    const by = t.party[0];
    if (!by) throw new Error('expected a party member');
    expect(hearFromBattle(p, t, [wall(by)]).heard).not.toContain('bridges');
  });

  test('a foe performing the Wall in the Seam hears nothing for the owner', () => {
    const p = newProfile();
    const t = startTrip(p, 1, 'seam');
    expect(hearFromBattle(p, t, [wall('rat-1')]).heard).not.toContain('bridges');
  });

  test('the owner line is the one the district writes, and the trigger is the Wall in the Seam', () => {
    const owner = DISTRICTS.bridges.hear.find((c) => c.voice === 'owner');
    expect(owner).toMatchObject({
      kind: 'performed',
      idiom: 'theWall',
      district: 'seam',
      text: 'Stone holds because it was pushed against. The owner inks in the bridges.',
    });
  });
});
