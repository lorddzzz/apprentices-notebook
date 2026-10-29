import { describe, expect, test } from 'vitest';
import { newProfile, type Profile } from '$engine';
import { emptyScene, paintScene, sceneEntries, sceneItems, subjectsIn } from '../../src/app/bench';

/**
 * CN-12: the canal items on the Bench, read from the real kit. The crate, the lamp-mother, the
 * moths and the eel and Snuffer come through `foesMet`; the mooring and the lamp are met keys.
 * The Lamplighter (a rival, RV P9) is never offered while his page is not shipped.
 */

const household = (over: { met?: string[]; foesMet?: Profile['foesMet'] } = {}) => ({
  ...newProfile(),
  foesMet: over.foesMet ?? [],
  met: (over.met ?? []) as unknown as Profile['met'],
});

const count = (items: readonly string[], item: string) => items.filter((i) => i === item).length;

describe('CN-12: canal items on the Bench', () => {
  test('the crate is offered once a barge is met, and not before', () => {
    expect(sceneItems(household())).not.toContain('k');
    const met = household({ foesMet: ['barge'] });
    expect(count(sceneItems(met), 'k')).toBe(1);
    expect(sceneEntries(met).find((e) => e.item === 'k')?.name).toBe('Crate');
  });

  test('the lamp-mother is offered once met, and not before', () => {
    expect(sceneItems(household())).not.toContain('M');
    expect(count(sceneItems(household({ foesMet: ['mother'] })), 'M')).toBe(1);
  });

  test('the mooring is offered once met, once, and not before', () => {
    expect(sceneItems(household())).not.toContain('{moor}');
    const met = household({ met: ['moor'] });
    expect(count(sceneItems(met), '{moor}')).toBe(1);
    expect(sceneEntries(met).find((e) => e.item === '{moor}')?.name).toBe('Mooring');
  });

  test('the lamp is offered once met, and not before', () => {
    expect(sceneItems(household())).not.toContain('l');
    expect(count(sceneItems(household({ met: ['lamp'] })), 'l')).toBe(1);
  });

  test('the eel, Snuffer, moth and water are offered on their own gates', () => {
    expect(sceneItems(household({ foesMet: ['eel'] }))).toContain('e');
    expect(sceneItems(household({ foesMet: ['snuffer'] }))).toContain('n');
    expect(sceneItems(household({ foesMet: ['moth'] }))).toContain('m');
    expect(sceneItems(household())).not.toContain('e');
    expect(sceneItems(household({ met: ['water'] }))).toContain('w>');
    expect(sceneItems(household())).not.toContain('w>');
  });

  test('the Lamplighter is never offered, even when every canal foe is met', () => {
    const met = household({
      foesMet: ['eel', 'snuffer', 'moth', 'mother', 'barge', 'lamplighter'],
      met: ['moor', 'lamp', 'water'],
    });
    expect(sceneItems(met)).not.toContain('L');
    expect(sceneEntries(met).some((e) => e.name.toLowerCase().includes('lamplighter'))).toBe(false);
  });

  test('the crate counts toward the three-subject limit', () => {
    let scene = emptyScene();
    const put = (x: number, y: number, item: string) => {
      const r = paintScene(scene, { x, y }, item);
      if (!('scene' in r)) throw new Error(r.why);
      scene = r.scene;
    };
    put(1, 0, 'k');
    put(2, 0, 'e');
    put(3, 0, 'M');
    expect(subjectsIn(scene)).toBe(3);
    expect(paintScene(scene, { x: 4, y: 0 }, 'k')).toEqual({ why: 'Up to 3 subjects' });
  });
});
