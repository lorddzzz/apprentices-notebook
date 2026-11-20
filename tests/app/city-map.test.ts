import { describe, expect, test, vi } from 'vitest';
import { DISTRICT_IDS } from '$data';
import { DISTRICT_KIT } from '$data/districts/index';
import { newProfile, openAll, type Profile, solveThreshold } from '$engine';
import {
  MAP_CAPTION_WIDTH,
  type MapNode,
  mapNode,
  mapNodes,
  MAP_PAGE_HEIGHT,
  mapPageHeight,
  mapPaths,
  mapProblems,
  nodeBox,
  nodeTag,
  pagesExtra,
  underSeam,
} from '../../src/app/city';
import { FIXTURE_DRAWINGS } from '../drawing/fixtures';

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
    // canals, the ink quarter and the bathhouses are open under openAll
    expect(paths.find((p) => p.id === 'canals')?.open).toBe(true);
    expect(paths.find((p) => p.id === 'inkQuarter')?.open).toBe(true);
    expect(paths.find((p) => p.id === 'bathhouses')?.open).toBe(true);
    expect(paths.find((p) => p.id === 'bridges')?.open).toBe(true);
    expect(paths.find((p) => p.id === 'trunk-70')?.open).toBe(true);
    expect(paths.find((p) => p.id === 'trunk-43')?.open).toBe(true);
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
    expect(underSeam(newProfile())).toMatchObject({
      stair: false,
      door: 'hidden',
      floors: [],
      quiet: null,
    });
    const cleared = withCity(newProfile(), { hearts: ['seam'] });
    expect(underSeam(cleared)).toMatchObject({ stair: true, door: 'hidden' });
    const seen = withCity(cleared, { doorSeen: true } as Partial<Profile['city']>);
    expect(underSeam(seen).door).toBe('sealed');
    const open = withCity(seen, { hearts: ['seam', 'cartographers'] });
    expect(underSeam(open).door).toBe('open');
  });

  /** The household past the handover with `n` of the fixture drawings on the first pages. */
  const drawn = (n: number): Profile => ({
    ...withCity(newProfile(), { hearts: ['seam'] }),
    ending: { handover: true, creditsSeen: false },
    drawings: [0, 1, 2].map((i) =>
      i < n ? (FIXTURE_DRAWINGS[i] ?? null) : null,
    ) as Profile['drawings'],
  });
  const FIVE = ['canals', 'inkQuarter', 'bathhouses', 'bridges', 'foundry'] as const;

  test('EN-7: the row under the Seam lists the stair, then up to three pages', () => {
    const u = underSeam(drawn(3), 3, FIVE);
    expect(u.stair).toBe(true);
    expect(u.floors).toHaveLength(5);
    expect(u.pages.map((x) => x.slot)).toEqual([0, 1, 2]);
    expect(u.pages.map((x) => x.name)).toEqual(FIXTURE_DRAWINGS.slice(0, 3).map((d) => d.name));
    expect(u.pages.every((x) => ['light', 'medium', 'heavy'].includes(x.band))).toBe(true);
    expect(u.blank).toBe(false);
    // slot order survives a gap
    const gap = { ...drawn(1), drawings: [null, null, FIXTURE_DRAWINGS[2] ?? null] } as Profile;
    expect(underSeam(gap).pages.map((x) => x.slot)).toEqual([2]);
    // before the handover nothing is drawn, and there is no blank page
    const before = { ...drawn(3), ending: { handover: false, creditsSeen: false } };
    expect(underSeam(before)).toMatchObject({ pages: [], blank: false });
    // the handover with no drawing is the blank page
    expect(underSeam(drawn(0))).toMatchObject({ pages: [], blank: true });
  });

  test.each([0, 1, 3])('EN-7: nothing overlaps with %i pages and five floors', (n) => {
    const extra = pagesExtra(underSeam(drawn(n), 3, FIVE));
    for (const w of [320, 375, 414]) {
      expect(mapProblems(seven, w, undefined, extra), `${n} pages at ${w}`).toEqual([]);
    }
    expect(mapProblems(seven, 375, undefined, pagesExtra({ pages: [], blank: true }))).toEqual([]);
  });

  test('R9: the door row counts under the Seam, and the page grows with what hangs from it', () => {
    // The owner's door open and the handover done: the desk row sits under the pages.
    const open = (n: number): Profile => ({
      ...drawn(n),
      city: { ...drawn(n).city, hearts: ['seam', 'cartographers'], doorSeen: true } as Profile['city'],
    });
    const u = underSeam(open(3), 3, FIVE);
    expect(u.door).toBe('open');
    const without = pagesExtra({ pages: u.pages, blank: u.blank });
    const extra = pagesExtra(u);
    expect(extra).toBeGreaterThan(without);
    // today's case: the row counted, the Seam's column ends past the base page's foot
    const seamBottom = nodeBox(node('seam'), 375, undefined, extra).bottom;
    expect(seamBottom).toBeGreaterThan(MAP_PAGE_HEIGHT);
    expect(seamBottom).toBeLessThanOrEqual(mapPageHeight(extra));
    for (const w of [320, 375, 414]) {
      expect(mapProblems(seven, w, undefined, extra), `door and 3 pages at ${w}`).toEqual([]);
    }
    expect(mapPageHeight(extra)).toBe(MAP_PAGE_HEIGHT + extra);
    expect(mapPageHeight(0)).toBe(MAP_PAGE_HEIGHT);
  });
});
