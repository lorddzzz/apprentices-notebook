import { describe, expect, test, vi } from 'vitest';
import { ENEMIES, ENEMY_IDS, type Meets } from '$data';
import { newProfile, type Profile } from '$engine';
import { KIT } from '$engine/districts/kit';
import type { DistrictModule } from '$engine/districts/types';
import {
  emptyScene,
  paintScene,
  type Scene,
  sceneEntries,
  sceneItems,
  subjectsIn,
} from '../../src/app/bench';
import { PALETTE, paletteOf, toggleToken } from '../../src/app/lab';

/**
 * DK-14: the Lab and Bench palettes read the registries. Fixture pieces are registered through a
 * mocked kit (as tests/engine/pieces.test.ts does): a solid pier the Bench offers once the
 * household has met it, a lab-only lamp, and a bench-only post.
 */

const FIXTURE = vi.hoisted(
  (): DistrictModule => ({
    id: 'bathhouses',
    pieces: [
      {
        id: 'bathhouses:pier',
        token: 'pier',
        solid: 'units',
        triggers: {},
        palette: { label: 'Pier', lab: true },
        bench: { met: 'pier' as Meets, label: 'Pier' },
        art: 'pier',
      },
      {
        id: 'bathhouses:lantern',
        token: 'lantern',
        solid: 'none',
        triggers: {},
        palette: { label: 'Lantern', lab: true },
        art: 'lantern',
      },
      {
        id: 'bathhouses:post',
        token: 'post',
        solid: 'none',
        triggers: {},
        bench: { met: 'post' as Meets, label: 'Post' },
        art: 'post',
      },
    ],
  }),
);

vi.mock('$engine/districts/kit', async (importOriginal) => {
  const m = await importOriginal<typeof import('$engine/districts/kit')>();
  const { buildKit } = await import('$engine/districts/registry');
  return { ...m, KIT: buildKit([...m.DISTRICT_MODULES, FIXTURE]) };
});

/** `met` takes plain keys: a piece's bench key and `vent` are not in the `Meets` union (yet). */
const household = (over: { met?: string[]; foesMet?: Profile['foesMet'] } = {}) => ({
  ...newProfile(),
  foesMet: over.foesMet ?? [],
  met: (over.met ?? []) as unknown as Profile['met'],
});

const paint = (scene: Scene, x: number, y: number, item: string): Scene => {
  const r = paintScene(scene, { x, y }, item);
  if (!('scene' in r)) throw new Error(r.why);
  return r.scene;
};

describe('the Lab palette lists the registries', () => {
  test('every registered foe is there, in registry order, the Lamplighter included (RV-9)', () => {
    const foes = PALETTE.filter((e) => ENEMY_IDS.some((id) => ENEMIES[id].token === e.item));
    expect(foes.map((e) => e.item)).toEqual(ENEMY_IDS.map((id) => ENEMIES[id].token));
    expect(foes.find((e) => e.item === 'e')?.name).toBe('Eel');
    expect(PALETTE.find((e) => e.item === 'L')?.name).toBe('Lamplighter');
  });

  test('pieces appear when the kit registers them for the Lab, in front of the eraser', () => {
    const items = PALETTE.map((e) => e.item);
    expect(items).toContain('{pier}');
    expect(items).toContain('{lantern}');
    expect(items).not.toContain('{post}');
    expect(items.at(-1)).toBe('.');
    expect(items.indexOf('{pier}')).toBeLessThan(items.indexOf('.'));
    expect(PALETTE.find((e) => e.item === '{pier}')?.piece).toEqual({ art: 'pier', data: null });
  });

  test('a kit with no pieces gives the same palette minus them', () => {
    const none = paletteOf({ ...KIT, pieces: {} }).map((e) => e.item);
    expect(none).not.toContain('{pier}');
    expect(none).toContain('e');
  });

  test('painting a piece toggles it; a solid one never goes under or receives a unit', () => {
    expect(toggleToken('.', '{pier}')).toBe('{pier}');
    expect(toggleToken('{pier}', '{pier}')).toBe('.');
    expect(toggleToken('{pier}', '{lantern}')).toBe('{lantern}');
    expect(toggleToken('r', '{pier}')).toBe('r');
    expect(toggleToken('r', '{lantern}')).toBe('r{lantern}');
    expect(toggleToken('{pier}', 'r')).toBe('{pier}');
    expect(toggleToken('{lantern}', 'r')).toBe('r{lantern}');
    expect(toggleToken('{pier}', '.')).toBe('.');
  });
});

describe('sceneItems: the Bench offers what has been met', () => {
  test('the canal eel is offered after it is met and not before', () => {
    expect(sceneItems(household({ foesMet: ['rat'] }))).toEqual(['D', 'r', 'd', '.']);
    expect(sceneItems(household({ foesMet: ['rat', 'eel'] }))).toEqual(['D', 'r', 'd', 'e', '.']);
  });

  test('every canal foe is offered by its own token, and a rival is never', () => {
    const items = sceneItems(household({ foesMet: ['snuffer', 'moth', 'mother', 'lamplighter'] }));
    expect(items).toEqual(['D', 'd', 'n', 'm', 'M', '.']);
  });

  test('water opens the four currents and the grate', () => {
    expect(sceneItems(household())).toEqual(['D', 'd', '.']);
    expect(sceneItems(household({ met: ['water'] }))).toEqual([
      'D',
      'd',
      'w>',
      'wv',
      'w<',
      'w^',
      'h',
      '.',
    ]);
  });

  test('a vent opens on its own key, or on a met steam cloud', () => {
    expect(sceneItems(household({ met: ['vent'] }))).toContain('@');
    expect(sceneItems(household({ met: ['cloud'] }))).toEqual(['D', 'd', '~', '@', '.']);
    expect(sceneItems(household({ met: ['slick'] }))).not.toContain('@');
  });

  test('each compound opens on its own key', () => {
    const met = ['stain', 'brandCloud', 'pool', 'greaseFog', 'skidPlate', 'bank', 'kettle', 'wall'];
    expect(sceneItems(household({ met })).filter((i) => i.startsWith('{'))).toEqual([
      '{stain}',
      '{brand}',
      '{pool}',
      '{fog}',
      '{skid}',
      '{bank}',
      '{kettle}',
      '{wall}',
    ]);
    expect(sceneItems(household({ met: ['stain'] })).filter((i) => i.startsWith('{'))).toEqual([
      '{stain}',
    ]);
  });

  test('a registered piece is offered once its bench key is met, with its label', () => {
    expect(sceneItems(household())).not.toContain('{pier}');
    const met = household({ met: ['pier'] });
    expect(sceneItems(met)).toEqual(['D', 'd', '{pier}', '.']);
    expect(sceneEntries(met).find((e) => e.item === '{pier}')?.name).toBe('Pier');
    // A lab-only piece has no bench key; a bench-only piece shows only on the Bench.
    expect(sceneItems(household({ met: ['pier', 'post'] }))).toEqual([
      'D',
      'd',
      '{pier}',
      '{post}',
      '.',
    ]);
    expect(sceneItems(household())).not.toContain('{lantern}');
    expect(PALETTE.map((e) => e.item)).not.toContain('{post}');
  });
});

describe('subjectsIn and the three-subject limit', () => {
  test('every foe in the registry is a subject; the caster, terrain and pieces are not', () => {
    let scene = emptyScene();
    scene = paint(scene, 1, 0, 'e');
    scene = paint(scene, 2, 0, 'n');
    expect(subjectsIn(scene)).toBe(2);
    scene = paint(scene, 3, 0, 'w>');
    scene = paint(scene, 4, 0, '{lantern}');
    scene = paint(scene, 5, 0, '{pier}');
    expect(subjectsIn(scene)).toBe(2);
    expect(subjectsIn(emptyScene())).toBe(0);
  });

  test('a foe carrying a mark still counts once', () => {
    let scene = paint(emptyScene(), 2, 2, 'M');
    scene = paint(scene, 2, 2, '!');
    expect(scene[2]?.[2]).toContain('!');
    expect(subjectsIn(scene)).toBe(1);
  });

  test('the limit holds for the canal foes too, and erasing frees a place', () => {
    let scene = emptyScene();
    scene = paint(scene, 1, 1, 'e');
    scene = paint(scene, 2, 1, 'm');
    scene = paint(scene, 3, 1, 'M');
    expect(subjectsIn(scene)).toBe(3);
    expect(paintScene(scene, { x: 4, y: 1 }, 'e')).toEqual({ why: 'Up to 3 subjects' });
    expect(paintScene(scene, { x: 4, y: 1 }, 'n')).toEqual({ why: 'Up to 3 subjects' });
    scene = paint(scene, 3, 1, '.');
    expect(subjectsIn(scene)).toBe(2);
    expect('scene' in paintScene(scene, { x: 4, y: 1 }, 'n')).toBe(true);
  });

  test('painting the same foe again removes it', () => {
    const scene = paint(emptyScene(), 3, 3, 'e');
    expect(subjectsIn(scene)).toBe(1);
    expect(subjectsIn(paint(scene, 3, 3, 'e'))).toBe(0);
  });

  test('a solid piece refuses a foe, and a foe refuses a solid piece', () => {
    const pier = paint(emptyScene(), 3, 3, '{pier}');
    expect(paintScene(pier, { x: 3, y: 3 }, 'e')).toEqual({ why: 'Nothing to change there' });
    const eel = paint(emptyScene(), 3, 3, 'e');
    expect(paintScene(eel, { x: 3, y: 3 }, '{pier}')).toEqual({ why: 'Nothing to change there' });
    expect('scene' in paintScene(eel, { x: 3, y: 3 }, '{lantern}')).toBe(true);
  });
});
