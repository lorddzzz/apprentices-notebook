import { describe, expect, test, vi } from 'vitest';
import { DISTRICT_IDS } from '$data';
import { DISTRICT_KIT } from '$data/districts/index';
import { newProfile, openAll, type Profile, solveThreshold } from '$engine';
import {
  MAP_CAPTION_WIDTH,
  type MapNode,
  mapNode,
  mapNodes,
  mapPaths,
  mapProblems,
  nodeBox,
  nodeTag,
  underSeam,
} from '../../src/app/city';

/** The canals have a doorway here, as in the crossroads tests; their map data stays the real one. */
vi.mock('$data/districts/index', async (importOriginal) => {
  const m = await importOriginal<typeof import('$data/districts/index')>();
  return {
    ...m,
    DISTRICT_KIT: {
      ...m.DISTRICT_KIT,
      canals: {
        ...m.DISTRICT_KIT.canals,
        ret: { kind: 'until', after: 2 },
        checkpoint: { after: 2, name: 'The quiet doorway' },
      },
    },
  };
});

const withCity = (p: Profile, patch: Partial<Profile['city']>): Profile => ({
  ...p,
  city: { ...p.city, ...patch },
});
const everything = openAll(newProfile());
const seven = mapNodes(everything);
const node = (id: string): MapNode => {
  const n = seven.find((x) => x.id === id);
  if (!n) throw new Error(`no node ${id}`);
  return n;
};

describe('the map for seven (DK-16)', () => {
  test('every district names its lean and its place on the page', () => {
    for (const id of DISTRICT_IDS) {
      const kit = DISTRICT_KIT[id];
      expect(kit?.lean?.text, `${id} lean`).toBeTruthy();
      expect(kit?.map, `${id} map`).toBeDefined();
    }
  });

  test('lean captions follow the design: height, brass and unfinished paper', () => {
    expect(node('bridges')).toMatchObject({ lean: 'height', leanText: 'Height, the drop' });
    expect(node('foundry')).toMatchObject({ lean: 'brass', leanText: 'Brass' });
    expect(node('cartographers')).toMatchObject({ lean: 'paper', leanText: 'Unfinished paper' });
    expect(nodeTag(node('bathhouses'))).toBe('Steam · The bath-keepers');
  });

  test('seven positions, none shared, the Seam lowest with its caption below', () => {
    expect(seven).toHaveLength(7);
    const spots = new Set(seven.map((n) => `${n.x},${n.y}`));
    expect(spots.size).toBe(7);
    const seam = node('seam');
    expect(seam.label).toBe('below');
    expect(seven.filter((n) => n.id !== 'seam').every((n) => n.y < seam.y)).toBe(true);
    expect(seven.filter((n) => n.id !== 'seam').every((n) => n.label === 'above')).toBe(true);
  });

  test.each([320, 351, 375, 414, 600])(
    'nothing overlaps and no line meets a caption at %ipx',
    (w) => {
      expect(mapProblems(seven, w)).toEqual([]);
    },
  );

  test('the worst case also fits: canals heard (lock button) beside everything else heard', () => {
    const heardAll = withCity(everything, { open: ['seam'] });
    expect(mapProblems(mapNodes(heardAll), 320)).toEqual([]);
    expect(mapNode(heardAll, 'canals')?.tryLock).toBe(true);
  });

  test('every partial map fits too: any subset of the six, heard or open', () => {
    const six = DISTRICT_IDS.filter((id) => id !== 'seam');
    for (let mask = 0; mask < 1 << six.length; mask++) {
      const heard = six.filter((_, i) => mask & (1 << i));
      const p = withCity(newProfile(), { heard: ['seam', ...heard] });
      expect(mapProblems(mapNodes(p), 320), heard.join()).toEqual([]);
    }
  });

  test('the checker sees what it should: a caption on the trunk, and two nodes stacked', () => {
    const canals = node('canals');
    const inTheWay: MapNode = { ...node('bridges'), x: 40 };
    expect(mapProblems([node('seam'), inTheWay, node('foundry')], 351)).toContain(
      'path trunk-22 crosses bridges',
    );
    const stacked: MapNode = { ...canals, id: 'bridges', y: canals.y - 3 };
    expect(mapProblems([node('seam'), canals, stacked], 351)).toContain('canals overlaps bridges');
    const box = nodeBox(canals, 351);
    expect(box.right - box.left).toBe(MAP_CAPTION_WIDTH);
  });

  test('paths: a trunk up from the Seam, a level branch to each mark, inked where a node is open', () => {
    const paths = mapPaths(seven);
    expect(paths.map((p) => p.id)).toEqual([
      'trunk-70',
      'canals',
      'bathhouses',
      'trunk-43',
      'inkQuarter',
      'bridges',
      'trunk-22',
      'foundry',
      'cartographers',
    ]);
    const seam = node('seam');
    for (const p of paths.filter((x) => x.id.startsWith('trunk'))) {
      expect([p.x1, p.x2]).toEqual([seam.x, seam.x]);
    }
    for (const p of paths.filter((x) => !x.id.startsWith('trunk'))) expect(p.y1).toBe(p.y2);
    // canals are open under openAll, the bathhouses only heard
    expect(paths.find((p) => p.id === 'canals')?.open).toBe(true);
    expect(paths.find((p) => p.id === 'bathhouses')?.open).toBe(false);
    expect(paths.find((p) => p.id === 'trunk-70')?.open).toBe(true);
    expect(paths.find((p) => p.id === 'trunk-43')?.open).toBe(false);
  });

  test('a district whose tier has no neighbour still joins the trunk; no tiers, no paths', () => {
    const p = withCity(newProfile(), { heard: ['seam', 'foundry'] });
    expect(mapPaths(mapNodes(p)).map((x) => x.id)).toEqual(['trunk-22', 'foundry']);
    expect(mapPaths(mapNodes(newProfile()))).toEqual([]);
  });

  test('solved art: the threshold names it, the map entry may override it, none stays empty', () => {
    const solved = solveThreshold(withCity(newProfile(), { heard: ['seam', 'canals'] }), 'canals');
    expect(mapNode(solved, 'canals')).toMatchObject({ solved: true, solvedArt: 'canal-gate' });
    expect(mapNode(withCity(newProfile(), { heard: ['seam', 'canals'] }), 'canals')).toMatchObject({
      solved: false,
      solvedArt: '',
    });
    const kits = {
      ...DISTRICT_KIT,
      canals: {
        ...DISTRICT_KIT.canals,
        id: 'canals' as const,
        map: { x: 23, y: 70, label: 'above' as const, solvedArt: 'lock-open' },
      },
      seam: { id: 'seam' as const },
    };
    const art = (profile: Profile, id: 'canals' | 'seam'): string | undefined =>
      mapNode(profile, id, undefined, kits)?.solvedArt;
    expect(art(solved, 'canals')).toBe('lock-open');
    // a solved district whose files name no art draws the generic solved mark
    const seamSolved = withCity(newProfile(), { solved: ['seam'] });
    expect(mapNode(seamSolved, 'seam', undefined, kits)).toMatchObject({
      solved: true,
      solvedArt: '',
    });
    expect(art(seamSolved, 'seam')).toBe('');
  });

  test('with no override a district reads its own place and lean', () => {
    const n = mapNode(everything, 'bridges', undefined, {});
    expect(n).toMatchObject({ label: 'above', lean: 'height', leanText: 'Height, the drop' });
  });

  test('a checkpoint mark appears on an open district once the city remembers the doorway', () => {
    const open = withCity(newProfile(), { heard: ['seam', 'canals'], open: ['seam', 'canals'] });
    expect(mapNode(open, 'canals')?.checkpoint).toBeNull();
    const reached = withCity(open, { checkpoints: { canals: 2 } });
    expect(mapNode(reached, 'canals')?.checkpoint).toBe('The quiet doorway');
    // a stale entry for another room is not the doorway
    expect(
      mapNode(withCity(open, { checkpoints: { canals: 1 } }), 'canals')?.checkpoint,
    ).toBeNull();
    expect(mapNode(reached, 'seam')?.checkpoint).toBeNull();
  });

  test('the slot under the Seam follows the lower Seam and the owner door', () => {
    expect(underSeam(newProfile())).toEqual({ stair: false, door: 'hidden' });
    const cleared = withCity(newProfile(), { hearts: ['seam'] });
    expect(underSeam(cleared)).toEqual({ stair: true, door: 'hidden' });
    const seen = withCity(cleared, { doorSeen: true } as Partial<Profile['city']>);
    expect(underSeam(seen).door).toBe('sealed');
    const open = withCity(seen, { hearts: ['seam', 'cartographers'] });
    expect(underSeam(open).door).toBe('open');
  });
});
