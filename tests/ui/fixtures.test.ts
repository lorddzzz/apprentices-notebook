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

test('the oil-chain fixture reads as one chain, line by line', () => {
  expect(describeLog(OIL_CHAIN_EVENTS)).toEqual([
    'Stoker casts Bolt right',
    'bolt aims at rat-1',
    'Bolt hits rat at C2 for 2',
    'rat at C2 dies',
    'spark lands at C2 as fire',
    'it spreads from C2 to D2, E2, F2',
    'Fire hits rat at E2 for 1',
    'rat at E2 is pushed right to F2 (slides 1)',
    'rat at E2 is crushed against the wall for 2',
    'Crush hits rat at E2 for 2',
    'rat at E2 dies',
  ]);
});

test('playing the oil chain ends with the rats dead and fire on C2 to F2', () => {
  const start = viewOfSpec(parseBoard(OIL_CHAIN_BOARD));
  const steps = buildSteps(start, OIL_CHAIN_EVENTS);
  const end = steps.at(-1)?.view;
  expect(end?.units.filter((u) => u.kind === 'enemy' && u.alive).map((u) => u.id)).toEqual([
    'dummy-1',
  ]);
  const lit = end?.tiles.flatMap((t, i) => (t.state === 'fire' ? [i] : []));
  expect(lit).toEqual([8, 9, 10, 11]); // C2 to F2 on the 6-wide board
  // every event with a look gets one; the chain ends on the death pulse
  expect(steps).toHaveLength(OIL_CHAIN_EVENTS.length);
  expect(steps[0]?.fx.map((f) => f.kind)).toEqual(['pulse']);
  expect(steps.at(-1)?.fx.map((f) => f.kind)).toEqual(['pulse']);
});

test('showcase board has every unit type, state and overlay piece', () => {
  const v = showcaseView();
  expect(new Set(v.units.map((u) => u.def))).toEqual(
    new Set(['draughtsman', 'stoker', 'rat', 'sentry', 'familiar', 'dummy']),
  );
  const states = new Set(v.tiles.map((t) => t.state));
  for (const id of ['slick', 'blot', 'cloud', 'fire', 'plate', 'stain', 'brandCloud', 'pool']) {
    expect(states, id).toContain(id);
  }
  expect(v.tiles.some((t) => t.vent)).toBe(true);
  expect(v.tiles.some((t) => t.drop)).toBe(true);
  expect(v.tiles.some((t) => t.jar)).toBe(true);
  const marks = v.units.map((u) => u.mark);
  expect(marks).toContain('plain');
  expect(marks).toContain('deep');
  expect(v.units.some((u) => u.collar)).toBe(true);
  expect(SHOWCASE_OVERLAY.intents.map((i) => i.order)).toEqual([1, 2]);
  expect(SHOWCASE_OVERLAY.badges.map((b) => b.kind)).toContain('kill');
});
