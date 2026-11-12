import { describe, expect, it } from 'vitest';
import { FOUNDRY_ROOMS_12 } from '$data/districts/foundry';
import { type EventLog, newProfile, returnHome, startTrip } from '$engine';
import { basicDirs } from '$engine/basicActions';
import {
  alliedBellEdits,
  FOUNDRY_MODULE,
  HEART_HOOKS,
  pealRoomSetup,
} from '$engine/districts/foundry';
import { type FoundryTripState, parseFoundryState } from '$engine/districts/foundry/types';
import type { Json, ShapeInput } from '$engine/districts/types';
import { tileAt } from '$engine/queries';
import { wipeLoot } from '$engine/trip/offerKinds';
import { variantFor } from '$engine/trip/place';
import { bonusMet } from '$engine/trip/setup';
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
  it('BF-8: lock 1 reach: a Bolt across drop tiles rings the great bell', () => {
    const s = withLattices('D . _ _ {greatBell:1}', BOLT);
    const r = cast(s, 'draughtsman', 'right');
    const e = ev(r.events, 'foundry:bellRung');
    expect(e).toHaveLength(1);
    expect(e[0]?.at).toEqual({ x: 4, y: 0 });
    expect(dataOf(e[0])).toEqual({ note: 1, lock: 'reach', hang: 'low' });
    expect(rung(r.state, 4)).toBe(true);
  });

  it('BF-8: lock 2 match: only a ring of its tone reaches it, and muffled the ring never comes', () => {
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

  it('BF-8: lock 3 unison: needs two apprentices in the same player phase', () => {
    const s = withLattices('D . . {greatBell:3} . . S\nb . . . . . .', TWO); // a far foe keeps the battle on
    const a = cast(s, 'draughtsman', 'right');
    expect(ev(a.events, 'foundry:bellStruck')).toHaveLength(1); // control: it was struck
    expect(ev(a.events, 'foundry:bellRung')).toHaveLength(0);
    expect(rung(a.state, 3)).toBe(false);
    const b = cast(a.state, 'stoker', 'left');
    expect(dataOf(ev(b.events, 'foundry:bellRung')[0])).toMatchObject({ note: 3, lock: 'unison' });
    expect(rung(b.state, 3)).toBe(true);
  });

  it('BF-8: lock 3 unison: one strike when the party is alone', () => {
    const s = withLattices('D . . {greatBell:3}', BOLT);
    const r = cast(s, 'draughtsman', 'right');
    expect(dataOf(ev(r.events, 'foundry:bellRung')[0])).toMatchObject({ note: 3, lock: 'unison' });
    expect(rung(r.state, 3)).toBe(true);
  });

  it('BF-8: lock 4 chord: needs one ring of three other bells', () => {
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

  it('BF-8: a won room with a rung great bell writes a rung bell to trip state', () => {
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

  it('BF-8: an allied great bell pulses foes only and spares the party', () => {
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

  it('BF-8: hooks hang the rung notes: a named hook its note, bare hooks the rest in reading order', () => {
    const edits = alliedBellEdits(
      {
        rung: [
          { room: 0, note: 1 },
          { room: 2, note: 3 },
          { room: 3, note: 4 },
        ],
      },
      [
        { at: { x: 4, y: 0 }, note: 0 },
        { at: { x: 0, y: 0 }, note: 4 },
        { at: { x: 2, y: 0 }, note: 2 },
        { at: { x: 6, y: 0 }, note: 0 },
      ],
    );
    expect(
      edits.map((e) => [
        e.at.x,
        'piece' in e ? ((e.piece?.data ?? { note: 0 }) as { note: number }).note : 0,
      ]),
    ).toEqual([
      [0, 4],
      [4, 1],
      [6, 3],
    ]); // the hook for note 2 hangs nothing: that room's bell was not rung
  });

  it('BF-8: roomSetup hangs an allied bell at each hook for every note rung', () => {
    const trip = { ...startTrip(newProfile(), 9), district: 'foundry' as const };
    const kit = { state: null, choices: [], checkpoint: false, bonuses: [] };
    const setupWith = (notes: number[], room = 4) =>
      pealRoomSetup({
        trip,
        kit,
        room,
        length: 5,
        state: { rung: notes.map((note, i) => ({ room: i, note })) },
      } as ShapeInput<FoundryTripState>);
    const hooks = HEART_HOOKS[variantFor(trip, 4)] ?? [];
    expect(hooks).toHaveLength(4);
    const bare = setupWith([]);
    expect(bare.boardEdits).toBeUndefined(); // 0 notes: nothing hung
    const full = setupWith([1, 2, 3, 4]);
    expect(full.boardEdits).toHaveLength(4);
    expect(full.boardEdits?.map((e) => e.at)).toEqual(hooks.map((h) => h.at));
    for (const e of full.boardEdits ?? []) {
      expect('piece' in e ? e.piece?.id : null).toBe('foundry:greatBell');
    }
    const two = setupWith([2, 4]);
    expect(two.boardEdits?.map((e) => e.at)).toEqual(hooks.slice(0, 2).map((h) => h.at));
    expect(setupWith([1, 2, 3, 4], 2)).toEqual({}); // a hall that is not the heart hangs nothing
  });
  it('BF-8: a room bonus is its great bell rung and the room won', () => {
    const room = FOUNDRY_ROOMS_12[0];
    if (!room?.bonus) throw new Error('room 1 has no bonus');
    const shape = { ret: { kind: 'any' }, length: 5, bonuses: { 0: room.bonus } } as const;
    const lone = 'D . _ _ {greatBell:1}\nS . . . .\nr . . . .';
    const first = cast(withLattices(lone, TWO), 'draughtsman', 'right');
    expect(first.state.phase).toBe('player'); // rung, but the rat still stands
    expect(bonusMet(shape, 0, first.state, first.events)?.reward).toEqual({
      kind: 'state',
      tag: 'peal',
    });
    const won = cast(first.state, 'stoker', 'down');
    expect(won.state.phase).toBe('won');
    const log = [...first.events, ...won.events];
    expect(bonusMet(shape, 0, won.state, log)).toEqual(room.bonus);
    // Control: the room won without ringing the bell earns nothing.
    const quiet = cast(withLattices('D r _ _ {greatBell:1}', BOLT), 'draughtsman', 'right');
    expect(quiet.state.phase).toBe('won');
    expect(bonusMet(shape, 0, quiet.state, quiet.events)).toBeNull();
  });
  it('BF-8: returning home or a wipe discards the rung bells', () => {
    const profile = {
      ...newProfile(),
      city: { ...newProfile().city, open: ['seam' as const, 'foundry' as const] },
    };
    const fresh = startTrip(profile, 5, 'foundry');
    const state = parseFoundryState(fresh.kit?.state);
    expect(state.rung).toEqual([]);
    const rungTrip = {
      ...fresh,
      status: 'crossroads' as const,
      kit: { ...fresh.kit, state: { rung: [{ room: 0, note: 1 }] } } as NonNullable<
        typeof fresh.kit
      >,
    };
    // Home: the notebook keeps no peal, and the next trip starts without one.
    const home = returnHome(profile, rungTrip);
    expect(JSON.stringify(home)).not.toContain('"rung"');
    expect(parseFoundryState(startTrip(home, 6, 'foundry').kit?.state).rung).toEqual([]);
    // A wipe (the trip ends with its state): nothing of it reaches the profile either.
    const wiped = wipeLoot(profile, rungTrip.loot);
    expect(JSON.stringify(wiped)).not.toContain('"rung"');
  });
});
