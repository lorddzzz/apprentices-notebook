import { describe, expect, it } from 'vitest';
import type { EventLog } from '$engine';
import { basicDirs } from '$engine/basicActions';
import { FOUNDRY_MODULE } from '$engine/districts/foundry';
import { parseFoundryState } from '$engine/districts/foundry/types';
import type { Json, ShapeInput } from '$engine/districts/types';
import { tileAt } from '$engine/queries';
import { act, board, cast, withLattices } from '../../scenarios/harness';
import { dataOf, ev, unit } from './helpers';

/**
 * BF-8 acceptance (foundry-plan §2 P6, P7, P8; BF-T2): the great bells' four locks, the rung bell
 * written to trip state, and the allied hung bells. A great bell is `{greatBell:<note>[:<tone>]
 * [:allied][:rung]}`; the lock follows from the note (1 reach, 2 match, 3 unison, 4 chord). A great
 * bell is rung when its data reads `rung: true` and a `foundry:bellRung` event is logged. All
 * `it.fails` until BF-8 (they need BF-3's strikes); the room-level rules stay `it.todo` because
 * the foundry has no rooms or heart layout yet (BF-10 to BF-12).
 */

const BOLT = { draughtsman: 'Bolt> Strike' } as const;
const TWO = { draughtsman: 'Bolt> Strike', stoker: 'Bolt> Strike' } as const;
const rung = (s: Parameters<typeof tileAt>[0], x: number, y = 0): unknown =>
  (tileAt(s, { x, y }).piece?.data as { rung?: boolean } | undefined)?.rung;

describe('BF-8 the great bells and their locks (P6)', () => {
  it.fails('BF-8: lock 1 reach: a Bolt across drop tiles rings the great bell', () => {
    const s = withLattices('D . _ _ {greatBell:1}', BOLT);
    const r = cast(s, 'draughtsman', 'right');
    const e = ev(r.events, 'foundry:bellRung');
    expect(e).toHaveLength(1);
    expect(e[0]?.at).toEqual({ x: 4, y: 0 });
    expect(dataOf(e[0])).toEqual({ note: 1, lock: 'reach', hang: 'low' });
    expect(rung(r.state, 4)).toBe(true);
  });

  it.fails('BF-8: lock 2 match: only a ring of its tone reaches it, and muffled the ring never comes', () => {
    const open = withLattices('D . {bell:mid} . . . {greatBell:2}', BOLT);
    const a = cast(open, 'draughtsman', 'right');
    expect(dataOf(ev(a.events, 'foundry:bellRung')[0])).toEqual({
      note: 2,
      lock: 'match',
      hang: 'mid',
    });
    expect(rung(a.state, 6)).toBe(true);
    const muffled = withLattices('D . ~{bell:mid} . . . {greatBell:2}', {
      draughtsman: 'Bolt> Spark',
    });
    const b = cast(muffled, 'draughtsman', 'right');
    expect(ev(b.events, 'foundry:muffled')).toHaveLength(1); // control: the bell was struck and stayed silent
    expect(ev(b.events, 'foundry:bellRung')).toHaveLength(0);
    expect(rung(b.state, 6)).toBe(false);
  });

  it.fails('BF-8: lock 3 unison: needs two apprentices in the same player phase', () => {
    const s = withLattices('D . . {greatBell:3} . . S', TWO);
    const a = cast(s, 'draughtsman', 'right');
    expect(ev(a.events, 'foundry:bellStruck')).toHaveLength(1); // control: it was struck
    expect(ev(a.events, 'foundry:bellRung')).toHaveLength(0);
    expect(rung(a.state, 3)).toBe(false);
    const b = cast(a.state, 'stoker', 'left');
    expect(dataOf(ev(b.events, 'foundry:bellRung')[0])).toMatchObject({ note: 3, lock: 'unison' });
    expect(rung(b.state, 3)).toBe(true);
  });

  it.fails('BF-8: lock 3 unison: one strike when the party is alone', () => {
    const s = withLattices('D . . {greatBell:3}', BOLT);
    const r = cast(s, 'draughtsman', 'right');
    expect(dataOf(ev(r.events, 'foundry:bellRung')[0])).toMatchObject({ note: 3, lock: 'unison' });
    expect(rung(r.state, 3)).toBe(true);
  });

  it.fails('BF-8: lock 4 chord: needs one ring of three other bells', () => {
    const three = withLattices(
      'D . {bell:low} . {bell:low}\n. . . . {bell:low}\n. . . . {greatBell:4}',
      BOLT,
    );
    const a = cast(three, 'draughtsman', 'right');
    expect(dataOf(ev(a.events, 'foundry:bellRung')[0])).toMatchObject({ note: 4, lock: 'chord' });
    expect(rung(a.state, 4, 2)).toBe(true);
    const two = withLattices('D . {bell:low} . {bell:low}\n. . . . .\n. . . . {greatBell:4}', BOLT);
    const b = cast(two, 'draughtsman', 'right');
    expect(ev(b.events, 'foundry:ring')).toHaveLength(1); // control: the tone rang, with two others
    expect(ev(b.events, 'foundry:bellRung')).toHaveLength(0);
    expect(rung(b.state, 4, 2)).toBe(false);
  });
});

describe('BF-8 the peal across the trip (P7, P8)', () => {
  const input = (state: Json, room: number): ShapeInput<Json> =>
    ({ trip: {}, kit: {}, state, room, length: 5 }) as unknown as ShapeInput<Json>;
  const bellRung = {
    type: 'foundry:bellRung',
    at: { x: 4, y: 0 },
    data: { note: 2, lock: 'match', hang: 'mid' },
  } as unknown as EventLog[number];

  it.fails('BF-8: a won room with a rung great bell writes a rung bell to trip state', () => {
    const afterRoom = FOUNDRY_MODULE.trip?.afterRoom;
    expect(afterRoom).toBeTypeOf('function');
    const start: Json = { rung: [{ room: 0, note: 1 }] };
    const won = afterRoom?.(input(start, 1), [bellRung], true);
    expect(won).toEqual({
      rung: [
        { room: 0, note: 1 },
        { room: 1, note: 2 },
      ],
    });
    expect(parseFoundryState(JSON.parse(JSON.stringify(won)))).toEqual(won);
    expect(afterRoom?.(input(start, 1), [bellRung], false)).toEqual(start); // room lost
    expect(afterRoom?.(input(start, 1), [], true)).toEqual(start); // nothing rung
  });

  it.fails('BF-8: an allied great bell pulses foes only and spares the party', () => {
    const s = board('D {greatBell:1:allied:rung} b . .', {
      kits: { draughtsman: { action: 'shove' } },
    });
    expect(basicDirs(s, 'draughtsman')).toContain('right');
    const r = act(s, { type: 'shove', unit: 'draughtsman', dir: 'right' });
    const foe = unit(s, 'sentry-1');
    expect(unit(r.state, 'sentry-1').hp).toBe(foe.hp - 2);
    expect(unit(r.state, 'sentry-1').pos).toEqual({ x: 3, y: 0 });
    expect(unit(r.state, 'draughtsman').hp).toBe(unit(s, 'draughtsman').hp);
    expect(unit(r.state, 'draughtsman').pos).toEqual({ x: 0, y: 0 });
  });

  it.todo('BF-8: roomSetup hangs an allied bell at each hook for every note rung');
  it.todo('BF-8: a room bonus is its great bell rung and the room won');
  it.todo('BF-8: returning home or a wipe discards the rung bells');
});
