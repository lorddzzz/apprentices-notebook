import { describe, expect, it } from 'vitest';
import type { Drawing } from '$data';
import type { Ctx } from '$engine/ctx';
import '$engine/districts';
import { hurtByPulse } from '$engine/districts/foundry/ring';
import { type FoundryTripState, parseFoundryState } from '$engine/districts/foundry/types';
import type { Json } from '$engine/districts/types';
import { GEN_KITS, HEART_FRAMES } from '$engine/drawing';
import { noteOfRoom, pealSetup } from '$engine/drawing/kits/foundry';
import type { EventLog } from '$engine/events';
import type { BoardSpec } from '$engine/notation';
import { heartDrawing } from '../../drawing/fixtures';
import { shapeInput } from '../../drawing/kits-c.scripts';
import { board } from '../../scenarios/harness';
import { unit } from './helpers';

/** CL-6 review fixes (pack R6): the foundry's rules the N2 review found loose. */

describe('R6-4: a pulse reaches two tiles out in line only when the ring is Coil-widened', () => {
  const ctxOf = (ascii: string): Ctx => ({
    s: board(ascii),
    log: [],
    cast: null,
    meta: {},
    footnotes: {},
  });
  // The bell at (1,0); the rat stands two tiles out in line, where an earlier pulse left it.
  const ASCII = 'D {bell:low} . r .\n. . . . .\n. . . . .';

  it('a plain ring spares a unit that is no longer beside the bell', () => {
    const ctx = ctxOf(ASCII);
    const rat = unit(ctx.s, 'rat-1');
    const hp = rat.hp;
    hurtByPulse(ctx, rat, { x: 1, y: 0 }, null);
    expect(rat.hp).toBe(hp);
    expect(rat.pos).toEqual({ x: 3, y: 0 });
  });

  it('a widened ring still reaches it', () => {
    const ctx = ctxOf(ASCII);
    const rat = unit(ctx.s, 'rat-1');
    const hp = rat.hp;
    hurtByPulse(ctx, rat, { x: 1, y: 0 }, null, undefined, undefined, true);
    expect(rat.hp).toBeLessThan(hp);
  });
});

describe('R6-5: a longer drawn peal keeps the bell it rang in its last room before the heart', () => {
  const drawing: Drawing = { ...heartDrawing('carillonneur'), shape: 'foundry:peal', length: 6 };
  const shape = GEN_KITS.find((k) => k.district === 'foundry')?.shapes[0]?.shape;
  const rang = (note: number) =>
    [
      { type: 'foundry:bellRung', at: { x: 0, y: 0 }, data: { note, lock: 'reach', hang: 'low' } },
    ] as unknown as EventLog;
  const winEvery = (rooms: readonly number[]): Json => {
    let state: Json = { rung: [] };
    for (const room of rooms) {
      state =
        shape?.afterRoom?.(shapeInput(drawing, 5, room, state), rang(noteOfRoom(room)), true) ??
        state;
    }
    return state;
  };

  it('a length-6 peal that rang rooms 0 to 4 stores all five and survives a reload', () => {
    const state = winEvery([0, 1, 2, 3, 4]);
    const rung = (state as unknown as FoundryTripState).rung;
    expect(rung.map((r) => r.room)).toEqual([0, 1, 2, 3, 4]);
    expect(parseFoundryState(JSON.parse(JSON.stringify(state)))).toEqual(state);
  });

  it('its heart hangs the bell of room 4, and a shorter peal does not store a bound', () => {
    const fallback = HEART_FRAMES.carillonneur?.fallback as BoardSpec;
    const state = winEvery([4]);
    const setup = pealSetup(shapeInput(drawing, 7, 5, state, { 5: fallback }) as never);
    expect(setup.boardEdits).toHaveLength(1);
    const short: Drawing = { ...drawing, length: 4 };
    const kept = shape?.afterRoom?.(shapeInput(short, 5, 2, { rung: [] }), rang(3), true);
    expect(kept).toEqual({ rung: [{ room: 2, note: 3 }] });
  });

  it('older saves, with no bound, parse as they did: rooms under four, and no bound written', () => {
    const old = {
      rung: [
        { room: 3, note: 4 },
        { room: 4, note: 1 },
        { room: -1, note: 2 },
      ],
    };
    expect(parseFoundryState(old)).toEqual({ rung: [{ room: 3, note: 4 }] });
    expect(parseFoundryState({ rung: [{ room: 4, note: 1 }], rooms: 5 }).rung).toHaveLength(1);
    expect(parseFoundryState({ rung: [{ room: 5, note: 1 }], rooms: 99 }).rung).toEqual([]);
  });
});
