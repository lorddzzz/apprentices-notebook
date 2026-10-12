import { expect, test } from 'vitest';
import { describeLog, parseBoard } from '$engine';
import { buildSteps } from '../../src/app/playback';
import { viewOfSpec } from '../../src/app/view';
import {
  OIL_CHAIN_BOARD,
  OIL_CHAIN_EVENTS,
  SHOWCASE_OVERLAY,
  showcaseView,
} from '../../src/ui/screens/galleryFixtures';

test('oil-chain fixture reads as the engine plan S2 lines', () => {
  expect(describeLog(OIL_CHAIN_EVENTS)).toEqual([
    'Stoker casts Bolt right',
    'Bolt hits rat at C2 for 2',
    'rat at C2 dies',
    'oil at C2 ignites, fire spreads to D2, E2, F2',
    'Fire hits rat at E2 for 2 (oil-soaked +1)',
    'rat at E2 dies',
  ]);
});

test('playing the oil chain ends with both rats dead and fire on C2 to F2', () => {
  const start = viewOfSpec(parseBoard(OIL_CHAIN_BOARD));
  const steps = buildSteps(start, OIL_CHAIN_EVENTS);
  const end = steps.at(-1)?.view;
  expect(end?.units.filter((u) => u.kind === 'enemy' && u.alive).map((u) => u.id)).toEqual([
    'dummy-1',
  ]);
  const lit = end?.tiles.flatMap((t, i) => (t.fire > 0 ? [i] : []));
  expect(lit).toEqual([8, 9, 10, 11]); // C2 to F2 on the 6-wide board
  expect(steps.map((s) => s.fx.map((f) => f.kind))).toEqual([
    ['pulse'],
    ['float'],
    ['pulse'],
    ['burst'],
    ['float'],
    ['pulse'],
  ]);
});

test('showcase board has every unit type, layer and overlay piece', () => {
  const v = showcaseView();
  expect(new Set(v.units.map((u) => u.def))).toEqual(
    new Set(['draughtsman', 'stoker', 'rat', 'sentry', 'familiar', 'dummy']),
  );
  expect(v.tiles.some((t) => t.oil)).toBe(true);
  expect(v.tiles.some((t) => t.ink)).toBe(true);
  expect(v.tiles.some((t) => t.steam > 0)).toBe(true);
  expect(v.tiles.some((t) => t.fire > 0)).toBe(true);
  expect(v.tiles.some((t) => t.plate)).toBe(true);
  expect(v.tiles.some((t) => t.vent)).toBe(true);
  expect(SHOWCASE_OVERLAY.intents.map((i) => i.order)).toEqual([1, 2]);
  expect(SHOWCASE_OVERLAY.badges.map((b) => b.kind)).toContain('kill');
});
