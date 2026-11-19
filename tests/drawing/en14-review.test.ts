import { describe, expect, it } from 'vitest';
import type { Drawing } from '$data';
import { type Profile, startTrip, type Trip } from '$engine';
import { INKED_TRIP } from '$engine/districts/inkedPage';
import type { Json, ShapeInput } from '$engine/districts/types';
import { HEART_FRAMES, parseInkedState } from '$engine/drawing';
import type { InkedTripState } from '$engine/drawing/types';
import { type BoardSpec, serializeBoard } from '$engine/notation';
import { fullHousehold, heartDrawing } from './fixtures';

/** EN-14's review fixes on drawn trips, each through the hooks a real trip calls. */

/** A drawn trip on `drawing` from page 1, set out by a finished household. */
function drawnTrip(drawing: Drawing): Trip {
  const p = { ...fullHousehold(), drawings: [drawing, null, null] as Profile['drawings'] };
  return startTrip(
    { ...p, city: { ...p.city, open: [...p.city.open, 'inkedPage'] } },
    11,
    'inkedPage',
    { page: 0 },
  );
}

/** What `INKED_TRIP`'s hooks read for room `room` of `t` (as `trip/shape.ts` builds it). */
function hookInput(t: Trip, room: number): ShapeInput<Json> {
  const kit = t.kit ?? { state: null, choices: [], checkpoint: false, bonuses: [] };
  const length = parseInkedState(kit.state).drawing.length;
  return { trip: t, kit, state: INKED_TRIP.parseState(kit.state), room, length };
}

describe('EN-14: the peal heart on a real drawn trip', () => {
  it('hangs an allied great bell for each note rung, read from the stored heart', () => {
    const drawing: Drawing = { ...heartDrawing('carillonneur'), shape: 'foundry:peal', length: 3 };
    const t = drawnTrip(drawing);
    const fallback = HEART_FRAMES.carillonneur?.fallback as BoardSpec;
    const own = parseInkedState(t.kit?.state);
    const state: InkedTripState = {
      ...own,
      rooms: own.rooms.map((r, i) => (i === 2 ? serializeBoard(fallback) : (r ?? 'x'))),
      inner: {
        rung: [
          { room: 0, note: 1 },
          { room: 1, note: 2 },
        ],
      },
    };
    const kit = t.kit as NonNullable<Trip['kit']>;
    const heart = { ...t, encounter: 2, kit: { ...kit, state: state as unknown as Json } };
    const setup = INKED_TRIP.roomSetup?.(hookInput(heart, 2)) ?? {};
    const bells = (setup.boardEdits ?? []).filter(
      (e) => 'piece' in e && e.piece?.id === 'foundry:greatBell',
    );
    expect(bells).toHaveLength(2);
    expect(setup.activate).toContain('foundry:tune');
  });
});
