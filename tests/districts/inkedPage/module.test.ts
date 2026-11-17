import { describe, expect, it } from 'vitest';
import type { DistrictId, Drawing } from '$data';
import { type Profile, roomsOf, startTrip, type Trip } from '$engine';
import { INKED_TRIP } from '$engine/districts/inkedPage';
import { KIT } from '$engine/districts/kit';
import type { Json, ShapeInput } from '$engine/districts/types';
import {
  generateRoom,
  inkRoom,
  paletteOf,
  parseInkedState,
  roomInput,
  storeRoom,
} from '$engine/drawing';
import { mapNodes } from '../../../src/app/city';
import { FIXTURE_DRAWINGS, fullHousehold } from '../../drawing/fixtures';

/** The module's own rules (EN-3): snapshot, pure rooms, the lent shape and the sandbox. */

const INKED: DistrictId = 'inkedPage';

function household(drawings: readonly (Drawing | null)[] = FIXTURE_DRAWINGS): Profile {
  const p = fullHousehold();
  return {
    ...p,
    drawings: [drawings[0] ?? null, drawings[1] ?? null, drawings[2] ?? null],
    city: { ...p.city, open: [...new Set([...p.city.open, INKED])] },
  };
}

describe('EN-3: the inkedPage module', () => {
  it('starts only from a drawn page of a household that handed over', () => {
    const p = household([FIXTURE_DRAWINGS[0] as Drawing, null, null]);
    expect(() => startTrip(p, 1, INKED)).toThrow('three pages');
    expect(() => startTrip(p, 1, INKED, { page: 1 })).toThrow('Page 2 is empty');
    const unfit = { ...p, foesMet: [] };
    expect(() => startTrip(unfit, 1, INKED, { page: 0 })).toThrow('You have not met this yet.');
    const none = { ...p, drawings: [null, null, null] };
    expect(() => startTrip(none, 1, INKED, { page: 0 })).toThrow('not open');
    expect(
      KIT.modules[INKED]?.isOpen?.({ ...p, ending: { handover: false, creditsSeen: false } }),
    ).toBe(false);
  });

  it('snapshots the drawing: later edits of the page never reach the trip', () => {
    const p = household();
    const t = startTrip(p, 1, INKED, { page: 0 });
    const edited = {
      ...p,
      drawings: [{ ...(FIXTURE_DRAWINGS[0] as Drawing), name: 'Other' }, null, null],
    };
    expect(parseInkedState(t.kit?.state).drawing).toEqual(FIXTURE_DRAWINGS[0]);
    expect(roomsOf(t)[0]?.title).toBe('Plain Seam, room 1');
    expect(edited.drawings[0]?.name).toBe('Other');
  });

  it('rooms are pure: ids, titles, depth, picks, the heart and a placeholder before inking', () => {
    const p = household();
    const t = startTrip(p, 1, INKED, { page: 0 });
    const rooms = roomsOf(t);
    expect(rooms.map((r) => r.id)).toEqual(['inkedPage:0:0', 'inkedPage:0:1', 'inkedPage:0:2']);
    expect(rooms.map((r) => r.title)).toEqual([
      'Plain Seam, room 1',
      'Plain Seam, room 2',
      'Plain Seam: the heart',
    ]);
    expect(rooms.map((r) => [r.depth, r.heart, r.picks, r.loot])).toEqual([
      [1, false, 1, 'deep'],
      [2, false, 1, 'deep'],
      [3, true, 2, 'deep'],
    ]);
    expect(rooms[0]?.layout.split('\n')).toHaveLength(5);
  });

  it('inking stores the generated layout once and the trip then reads it', () => {
    const p = household();
    const t = startTrip(p, 7, INKED, { page: 0 });
    const inked = inkRoom(p, t);
    const layout = parseInkedState(inked.kit?.state).rooms[0];
    expect(layout).toBeTruthy();
    expect(roomsOf(inked)[0]?.layout).toBe(layout);
    expect(inkRoom(p, inked)).toBe(inked);
    expect(() => storeRoom(inked, 0, 'x')).toThrow('already inked');
    expect(storeRoom(inked, 0, layout as string)).toBe(inked);
    // The same profile and trip ink the same room (P31, determinism).
    expect(parseInkedState(inkRoom(p, t).kit?.state).rooms).toEqual(
      parseInkedState(inked.kit?.state).rooms,
    );
    expect(generateRoom(roomInput(p, t, 0)).attempts).toBeGreaterThan(0);
  });

  it("lends its return rule from the drawing's shape (canals:landings: home after room 1 and at the heart)", () => {
    const p = household();
    const t: Trip = startTrip(p, 1, INKED, { page: 0 });
    const own = parseInkedState(t.kit?.state);
    const state = { ...own, drawing: { ...own.drawing, shape: 'canals:landings' }, inner: null };
    const at = (room: number): ShapeInput<Json> => ({
      trip: t,
      kit: t.kit as NonNullable<Trip['kit']>,
      state: state as unknown as Json,
      room,
      length: 3,
    });
    expect(INKED_TRIP.returnBlocks?.(at(0))).toEqual([]);
    expect(INKED_TRIP.returnBlocks?.(at(1))).toEqual([{ why: 'No landing here.' }]);
    expect(INKED_TRIP.returnBlocks?.(at(2))).toEqual([]);
    // The drawing's rule is activated on every room, the lent shape's setup merged in.
    const wet = {
      ...state,
      drawing: FIXTURE_DRAWINGS[1],
      rooms: [null, null, null, 'x'],
      inner: null,
    };
    expect(
      INKED_TRIP.roomSetup?.({ ...at(3), state: wet as unknown as Json, length: 4 }).activate,
    ).toEqual(['canals:current']);
  });

  it('is a sandbox: never a map node, never a shape on the palette', () => {
    const p = household();
    expect(KIT.modules[INKED]?.sandbox).toBe(true);
    expect(mapNodes(p).map((n) => n.id)).not.toContain(INKED);
    expect(paletteOf(p).shapes).not.toContain('inkedPage:page');
  });
});
