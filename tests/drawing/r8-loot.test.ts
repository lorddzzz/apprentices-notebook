import { expect, it, vi } from 'vitest';
import { startTrip } from '$engine';
import { drawnOffersFor } from '$engine/drawing/loot';
import { fullHousehold, heartDrawing } from './fixtures';

vi.mock('$data/drawing', async (importOriginal) => {
  const data = await importOriginal<typeof import('$data/drawing')>();
  const zero = { page: 0, solvent: 0, ink: 0, vellum: 0 };
  return {
    ...data,
    DRAWN_LOOT: {
      ...data.DRAWN_LOOT,
      doorwayWeight: 0,
      weights: { ...data.DRAWN_LOOT.weights, light: { ...zero, ink: 1 }, heavy: zero },
    },
  };
});

it('R8.7: a draw stops when only zero-weight offers remain', () => {
  const trip = startTrip(fullHousehold(), 1, 'seam');
  const drawing = heartDrawing('marginalia');
  const owned = { known: [], methods: [] };
  expect(drawnOffersFor(trip, 0, owned, drawing).guaranteed).toEqual([{ kind: 'ink' }]);
  expect(drawnOffersFor(trip, drawing.length - 1, owned, drawing).guaranteed).toEqual([]);
});
