import { expect, test } from 'vitest';
import { parseLabel } from '$engine';
import { undoBoard } from '$engine/solvents';
import { run } from './chemHarness';
import { board } from './harness';

test.each(['w>', '_', '{blank}'])('Graphite avoids %s when choosing a fallback', (hazard) => {
  const s = board(`r d D ${hazard} .`);
  const r = run(s, (ctx) =>
    undoBoard(ctx, {
      tiles: [],
      units: [
        { id: 'rat-1', pos: parseLabel('B1') },
        { id: 'dummy-1', pos: parseLabel('C1') },
      ],
    }),
  );
  expect(r.state.units.find((u) => u.id === 'dummy-1')?.pos).not.toEqual(parseLabel('D1'));
  expect(r.events.some((e) => e.type === 'moveUndone')).toBe(true);
});
