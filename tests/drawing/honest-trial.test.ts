import { describe, expect, it, vi } from 'vitest';
import type { Drawing, MasterId } from '$data';
import { HEART_HEAT } from '$data/districts/bathhouses';
import { ROOM_PENCIL } from '$data/districts/cartographers/rooms';
import { type Profile, startTrip } from '$engine';
import { INKED_TRIP } from '$engine/districts/inkedPage';
import type { Json, RuleId, ShapeInput } from '$engine/districts/types';
import { generateRoom, HEART_FRAMES, heartConfig, parseInkedState } from '$engine/drawing';
import type { InkedTripState } from '$engine/drawing/types';
import { listRules } from '$engine/rules';
import type { BattleState, Trip } from '$engine/types';
import { fullHousehold, heartDrawing, inputFor } from './fixtures';

/**
 * The bot judges the room the player plays (P39): a drawn heart lists its master's rules on a
 * plain shape, and the trial battle lists the drawing's rule and the heart's rules. The trial
 * battles are caught where `trial` hands them to the bot.
 */

const trials = vi.hoisted(() => ({
  states: [] as { rules?: Record<string, unknown>; tiles: { piece: { id: string } | null }[] }[],
}));
vi.mock('$engine/drawing/trial', async (importOriginal) => {
  const real = await importOriginal<typeof import('$engine/drawing/trial')>();
  return {
    ...real,
    botTrial: (...args: Parameters<typeof real.botTrial>) => {
      trials.states.push(args[0]);
      return real.botTrial(...args);
    },
  };
});

const SEED = 20260;

/** The heart room's setup of a drawn trip on `drawing` (the lent shape's own state stays at its start). */
function roomSetupOf(drawing: Drawing, room: number) {
  const profile = { ...fullHousehold(), drawings: [drawing, null, null] as Profile['drawings'] };
  const trip = startTrip(
    { ...profile, city: { ...profile.city, open: [...profile.city.open, 'inkedPage'] } },
    1,
    'inkedPage',
    { page: 0 },
  );
  const own = parseInkedState(trip.kit?.state);
  const state: InkedTripState = { ...own, rooms: own.rooms.map(() => 'x') };
  const input: ShapeInput<Json> = {
    trip: { seed: SEED } as unknown as Trip,
    kit: { state: state as unknown as Json, choices: [], checkpoint: false, bonuses: [] },
    state: state as unknown as Json,
    room,
    length: drawing.length,
  };
  return INKED_TRIP.roomSetup?.(input) ?? {};
}

const MASTERS_WITH_RULES = (Object.keys(HEART_FRAMES) as MasterId[]).filter(
  (m) => (HEART_FRAMES[m]?.setup.rules.length ?? 0) > 0,
);

describe('EN-K9: a drawn heart lists its master (P39)', () => {
  it("EN-K9: a drawn heart lists its master's rules on a plain shape", () => {
    expect(MASTERS_WITH_RULES).toEqual(
      expect.arrayContaining([
        'postmaster',
        'carillonneur',
        'registrar',
        'bathSteward',
        'chiefWarden',
      ]),
    );
    for (const master of MASTERS_WITH_RULES) {
      const drawing = heartDrawing(master);
      const rules = HEART_FRAMES[master]?.setup.rules ?? [];
      const heart = roomSetupOf(drawing, drawing.length - 1);
      expect(heart.activate, master).toEqual(expect.arrayContaining([...rules]));
      expect(new Set(heart.activate).size).toBe(heart.activate?.length);
      // Rooms before the heart are unchanged: no rule of the master's.
      for (const room of [0, 1]) {
        const own = roomSetupOf(drawing, room).activate ?? [];
        for (const id of rules.filter((r) => r !== drawing.rule)) {
          expect(own, `${master} room ${room}`).not.toContain(id);
        }
      }
    }
  });

  it("EN-K9: each frame rule gets the config the district's own heart passes", () => {
    const tune = roomSetupOf(heartDrawing('carillonneur'), 2);
    expect(tune.rulesConfig?.['foundry:tune']).toEqual({ seed: SEED });
    const baths = roomSetupOf(heartDrawing('bathSteward'), 2);
    expect(baths.rulesConfig?.['bathhouses:boilOver']).toEqual({ heat: HEART_HEAT });
    const hand = roomSetupOf(heartDrawing('registrar'), 2);
    expect(hand.rulesConfig?.['cartographers:guildHand']).toEqual(ROOM_PENCIL.at(-1));
    const clock = roomSetupOf(heartDrawing('postmaster'), 2);
    expect(clock.activate).toContain('inkQuarter:clock');
    expect(clock.rulesConfig?.['inkQuarter:clock']).toBeUndefined();
  });

  it("EN-K9: the drawing's rule is not listed twice, and a lent shape's config wins", () => {
    const drawing: Drawing = {
      ...heartDrawing('bathSteward'),
      rule: 'bathhouses:boilOver',
      shape: 'bathhouses:heat',
    };
    const setup = roomSetupOf(drawing, 2);
    expect(setup.activate?.filter((id) => id === 'bathhouses:boilOver')).toHaveLength(1);
    expect(setup.rulesConfig?.['bathhouses:boilOver']).toEqual({ heat: HEART_HEAT });
  });
});

describe('EN-K9: the trial runs the rules of the room (P39)', () => {
  const rulesOfTrials = (run: () => unknown): string[][] => {
    trials.states.length = 0;
    run();
    return trials.states.map((s) => Object.keys(s.rules ?? {}));
  };

  // Generator over many seeds: slow under full parallel load, so it gets its own limit.
  it("EN-K9: the trial lists the drawing's rule", () => {
    const drawing: Drawing = {
      ...heartDrawing('marginalia'),
      rule: 'bathhouses:boilOver',
      foes: ['rat', 'familiar'],
      length: 3,
    };
    const lists = rulesOfTrials(() => generateRoom(inputFor(drawing, SEED, 0)));
    expect(lists.length).toBeGreaterThan(0);
    for (const rules of lists) expect(rules).toContain('bathhouses:boilOver');
  }, 300_000);

  // Generator over many seeds: slow under full parallel load, so it gets its own limit.
  it("EN-K9: the trial lists the heart's rules", () => {
    for (const master of MASTERS_WITH_RULES) {
      const drawing = heartDrawing(master);
      const want = HEART_FRAMES[master]?.setup.rules ?? [];
      const lists = rulesOfTrials(() => generateRoom(inputFor(drawing, SEED)));
      expect(lists.length, master).toBeGreaterThan(0);
      for (const rules of lists) expect(rules, master).toEqual(expect.arrayContaining([...want]));
    }
  }, 300_000);

  // Generator over many seeds: slow under full parallel load, so it gets its own limit.
  it('EN-K9: a drawing with no rule and a heart with no rules gives the trial battle as before', () => {
    const lists = rulesOfTrials(() => generateRoom(inputFor(heartDrawing('marginalia'), SEED)));
    expect(lists.length).toBeGreaterThan(0);
    for (const rules of lists) expect(rules).toEqual([]);
    for (const s of trials.states) expect(s.rules).toBeUndefined();
  }, 300_000);
});

describe('CAL-5G: the heart trial judges the heart the player gets', () => {
  // Generator over many seeds: slow under full parallel load, so it gets its own limit.
  it('CAL-5G: the heart trial runs each frame rule at the config the played heart gets', () => {
    for (const master of ['bathSteward', 'carillonneur', 'registrar'] as const) {
      const drawing = heartDrawing(master);
      const played = roomSetupOf(drawing, drawing.length - 1).rulesConfig ?? {};
      const ids = Object.keys(played) as RuleId[];
      expect(ids.length, master).toBeGreaterThan(0);
      trials.states.length = 0;
      generateRoom(inputFor(drawing, SEED));
      expect(trials.states.length, master).toBeGreaterThan(0);
      for (const s of trials.states) {
        const battle = s as unknown as BattleState;
        for (const id of ids) {
          const want = listRules(battle, [id], { [id]: played[id] as Json })[id];
          expect(s.rules?.[id], `${master} ${id}`).toEqual(want);
          // The default config would give another state: the case bites.
          expect(s.rules?.[id], `${master} ${id} default`).not.toEqual(listRules(battle, [id])[id]);
        }
      }
    }
    // The configs themselves: the baths' heart heat, the tune's trip seed, the hall's last pencil.
    expect(heartConfig('bathhouses:boilOver', SEED)).toEqual({ heat: HEART_HEAT });
    expect(heartConfig('foundry:tune', SEED)).toEqual({ seed: SEED });
    expect(heartConfig('cartographers:guildHand', SEED)).toEqual(ROOM_PENCIL.at(-1));
  }, 300_000);
});

describe('EN-K10: the trial sees what the shape stamps (P40)', () => {
  it('EN-K10: the trial sees the lock stamp', () => {
    const drawing: Drawing = { ...heartDrawing('carillonneur'), shape: 'foundry:peal', length: 4 };
    for (const room of [0, 1, 2]) {
      trials.states.length = 0;
      const made = generateRoom(inputFor(drawing, SEED + room, room));
      expect(trials.states.length, `room ${room}`).toBeGreaterThan(0);
      // Every board the bot played, the offered one among them, holds the great bell.
      for (const s of trials.states) {
        expect(s.tiles.filter((t) => t.piece?.id === 'foundry:greatBell')).toHaveLength(1);
      }
      expect(made.layout.tiles.filter((t) => t.piece?.id === 'foundry:greatBell')).toHaveLength(1);
    }
  }, 300_000);
});
