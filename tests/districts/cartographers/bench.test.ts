import { describe, expect, test } from 'vitest';
import type { Meets } from '$data';
import { newProfile, scenarioBattle } from '$engine';
import { paletteOf } from '$engine/drawing/palette';
import { sceneEntries } from '../../../src/app/bench';
import { labLocation, PALETTE, resolveScenario } from '../../../src/app/lab';

/**
 * CG-13 (cartographers-plan P1, §4): the paper pieces on the Bench once met, with the pencil's fate
 * and the outline's foe chosen; the three hands arrive as foes met; the Registrar (a rival) never.
 */

const withMet = (...met: Meets[]) => ({ ...newProfile(), met });
const items = (met: Meets[], foes: string[] = []) =>
  sceneEntries({ met, foesMet: foes as never }).map((e) => e.item);

describe('CG-13 Bench and Lab parity', () => {
  test('CG-13: the bench offers pencil after it is met and not before', () => {
    expect(items([])).not.toContain('{pencil:ink}');
    expect(items([])).not.toContain('{blank}');
    expect(items([])).not.toContain('{outline:eraser}');
    expect(items(['pencil'])).toEqual(expect.arrayContaining(['{pencil:ink}', '{pencil:rub}']));
    expect(items(['blank'])).toContain('{blank}');
    expect(items(['outline'])).toEqual(
      expect.arrayContaining(['{outline:surveyor}', '{outline:eraser}', '{outline:tracer}']),
    );
    expect(paletteOf(withMet('pencil', 'blank', 'outline')).pieces).toEqual(
      expect.arrayContaining([
        'cartographers:pencil',
        'cartographers:blank',
        'cartographers:outline',
      ]),
    );
    expect(paletteOf(newProfile()).pieces).not.toContain('cartographers:pencil');
  });

  test('CG-13: the registrar is never on the bench', () => {
    const hands = ['surveyor', 'eraser', 'tracer'];
    const all = items(['pencil', 'blank', 'outline'], [...hands, 'registrar']);
    expect(all).toEqual(expect.arrayContaining(['A', 'F', 'I']));
    expect(all).not.toContain('Y');
    expect(paletteOf({ ...newProfile(), foesMet: ['registrar'] as never }).foes).not.toContain(
      'registrar',
    );
  });

  test('CG-13: each cg scenario opens from #/lab?scenario=', () => {
    for (const id of ['cg-pencil', 'cg-hands', 'cg-registrar']) {
      const { scenario } = labLocation(new URLSearchParams(`scenario=${id}`));
      const { def, unknown } = resolveScenario(scenario);
      expect(unknown, id).toBeNull();
      expect(def.id).toBe(id);
      const b = scenarioBattle(def, { lab: true });
      expect(b.phase).toBe('player');
      expect(
        b.units.filter((u) => u.kind === 'member'),
        id,
      ).toHaveLength(2);
    }
    expect(PALETTE.map((e) => e.item)).toEqual(
      expect.arrayContaining(['{pencil:ink}', '{pencil:rub}', '{blank}', '{outline:eraser}']),
    );
  });
});
