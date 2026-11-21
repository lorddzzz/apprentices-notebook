import { expect, test } from 'vitest';
import { serializeBoard, startTrip } from '$engine';
import { parseFoundryState } from '$engine/districts/foundry/types';
import { HEART_FRAMES, parseInkedState, storeRoom } from '$engine/drawing';
import { pealSetup } from '$engine/drawing/kits/foundry';
import { CAL_DRAWINGS, CAL_PARTIES, calibrationProfile } from '../fixtures/calibration/drawings';

test("CAL-5P: a length-six drawn peal hangs four distinct notes at the Carillonneur's heart", () => {
  const drawing = CAL_DRAWINGS.find((d) => d.name === 'Heavy Carillonneur');
  const frame = HEART_FRAMES.carillonneur;
  if (!drawing || !frame) throw new Error('Missing the length-six Carillonneur fixture');
  expect(drawing.length).toBe(6);
  const profile = { ...calibrationProfile(CAL_PARTIES.pair), drawings: [drawing, null, null] };
  const room = drawing.length - 1;
  const trip = startTrip(profile, 1, 'inkedPage', { page: 0 });
  if (!trip.kit) throw new Error('Missing the peal state');
  const inked = storeRoom({ ...trip, encounter: room }, room, serializeBoard(frame.fallback));
  const kit = inked.kit;
  if (!kit) throw new Error('Missing the inked kit');
  // The five entries the CAL-5 probe builds: rooms 0-4 rang 1,2,3,4,1.
  const state = parseFoundryState({
    rooms: 5,
    rung: [1, 2, 3, 4, 1].map((note, r) => ({ room: r, note })),
  });
  expect(parseInkedState(kit.state).rooms[room]).not.toBeNull();
  const setup = pealSetup({
    trip: inked,
    kit,
    state,
    room,
    length: drawing.length,
  } as unknown as Parameters<typeof pealSetup>[0]);
  const hung = (setup.boardEdits ?? []).flatMap((e) =>
    'piece' in e ? [((e.piece?.data ?? { note: 0 }) as { note: number }).note] : [],
  );
  expect(hung).toEqual([1, 2, 3, 4]);
});
