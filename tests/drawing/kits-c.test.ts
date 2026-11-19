import { describe, expect, it } from 'vitest';
import type { Drawing } from '$data';
import { DEFAULT_PENCIL } from '$data/districts/cartographers/types';
import { COSTS, NEEDS } from '$data/drawing';
import { choicesAt, type Profile, returnCheck, startTrip, type Trip } from '$engine';
import { createBattle } from '$engine/battle';
import type { Json } from '$engine/districts/types';
import {
  checkDrawing,
  checkGenerated,
  GEN_KITS,
  generateRoom,
  HEART_FRAMES,
  specFor,
} from '$engine/drawing';
import {
  doorwayChoices,
  doorwaySetup,
  freeThrough,
  mayReturn,
} from '$engine/drawing/kits/cartographers';
import { hooksOf, lockEdits, noteOfRoom, pealSetup } from '$engine/drawing/kits/foundry';
import type { EventLog } from '$engine/events';
import { type BoardSpec, parseBoard, serializeBoard } from '$engine/notation';
import { blocksUnits } from '$engine/queries';
import { deriveSeed } from '$engine/rng';
import { compiledFor } from '$engine/run';
import { setUpRoom } from '$engine/trip/setup';
import { sampleParty } from '../../src/app/dev/samples';
import { fullHousehold, heartDrawing, heartRoom, inputFor } from './fixtures';
import { SCRIPTS_C, shapeInput } from './kits-c.scripts';

/**
 * Pack K's kits and frames beyond the shared acceptance tests (EN-K6, EN-K7): what each frame
 * declares, which master stands on which ground, the bells and the pencil, the peal and the
 * doorway at every length.
 */

const MASTERS = ['carillonneur', 'registrar'] as const;
const kitOf = (district: string) => {
  const kit = GEN_KITS.find((k) => k.district === district);
  if (!kit) throw new RangeError(`No kit for ${district}`);
  return kit;
};
const hookIds = (b: BoardSpec) => b.tiles.filter((t) => t.piece?.id === 'foundry:hook').length;
const KEY = (c: { x: number; y: number }) => `${c.x},${c.y}`;

/** The party can still walk from the first start point to every other start point and every unit. */
function stillConnected(layout: BoardSpec): boolean {
  const first = layout.starts[0];
  if (!first) return false;
  const seen = new Set<string>([KEY(first)]);
  const queue = [first];
  for (let c = queue.pop(); c; c = queue.pop()) {
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ] as const) {
      const n = { x: c.x + dx, y: c.y + dy };
      const t = layout.tiles[n.y * layout.width + n.x];
      if (n.x < 0 || n.y < 0 || n.x >= layout.width || n.y >= layout.height || !t) continue;
      const blocked =
        t.terrain.drop ||
        t.piece?.id === 'foundry:greatBell' ||
        t.piece?.id === 'foundry:bell' ||
        t.piece?.id === 'cartographers:blank';
      if (blocked || seen.has(KEY(n))) continue;
      seen.add(KEY(n));
      queue.push(n);
    }
  }
  return layout.starts.every((p) => seen.has(KEY(p)));
}

/** A drawn trip of `drawing` set out from page 1 of a household that may draw it. */
function drawnTrip(drawing: Drawing): { owner: Profile; trip: Trip } {
  const p = fullHousehold();
  const owner: Profile = {
    ...p,
    drawings: [drawing, null, null],
    city: { ...p.city, open: [...new Set([...p.city.open, 'inkedPage' as const])] },
  };
  expect(checkDrawing(owner, drawing)).toEqual([]);
  return { owner, trip: startTrip(owner, 5, 'inkedPage', { page: 0 }) };
}

describe('Pack K frames (EN-K6, EN-K7)', () => {
  it('EN-K6: every frame takes its needs and cost from the drawing table', () => {
    for (const master of MASTERS) {
      const frame = HEART_FRAMES[master];
      expect(frame?.master).toBe(master);
      expect(frame?.cost).toBe(COSTS.hearts[master]);
      expect(frame?.needs.map((n) => n.reason)).toEqual((NEEDS[master] ?? []).map((n) => n.reason));
      expect(frame?.setup.foe).toBe(master);
      expect(frame?.escorts).toEqual([]);
      expect(frame?.size).toEqual({ width: 7, height: 9 });
      expect(SCRIPTS_C[master]?.length).toBeGreaterThan(0);
    }
    expect(HEART_FRAMES.carillonneur?.needs.length).toBe(1);
    expect(HEART_FRAMES.registrar?.needs).toEqual([]);
  });

  it('EN-K6: the Carillonneur hangs four hook tiles and lists the tune', () => {
    expect(HEART_FRAMES.carillonneur?.setup.rules).toEqual(['foundry:tune']);
    expect(hookIds(HEART_FRAMES.carillonneur?.fallback as BoardSpec)).toBe(4);
    for (const seed of [1, 2, 3, 4, 5]) {
      const { room, masterOnBoard } = heartRoom('carillonneur', seed);
      expect(masterOnBoard).toBe(true);
      expect(hookIds(room.layout)).toBe(4);
      expect(hooksOf(room.layout)).toHaveLength(4);
    }
  });

  it('EN-K7: the Registrar stands among his Tracer, the outlines and the pencil', () => {
    const fallback = HEART_FRAMES.registrar?.fallback as BoardSpec;
    for (const board of [
      fallback,
      ...[1, 2, 3].map((seed) => heartRoom('registrar', seed).room.layout),
    ]) {
      const foes = board.units.map((u) => u.def);
      expect(foes).toContain('registrar');
      expect(foes).toContain('tracer');
      const ids = board.tiles.map((t) => t.piece?.id);
      expect(ids).toContain('cartographers:pencil');
      expect(ids).toContain('cartographers:outline');
    }
  });

  it('EN-K6: the fallback boards read back as written', () => {
    for (const master of MASTERS) {
      const fallback = HEART_FRAMES[master]?.fallback as BoardSpec;
      expect(parseBoard(serializeBoard(fallback))).toEqual(fallback);
      expect(fallback.starts.length).toBeGreaterThanOrEqual(4);
    }
  });
});

describe('The foundry kit (EN-K6)', () => {
  it('EN-K6: the bells bring their bells; the staff and the pieces are in the kit', () => {
    const foundry = kitOf('foundry');
    expect(foundry.rules.map((r) => r.id)).toEqual(['foundry:bells']);
    expect(foundry.rules[0]?.brings).toEqual(['foundry:bell']);
    expect(foundry.pieces.map((x) => x.id)).toEqual(['foundry:bell', 'foundry:rope']);
    expect(foundry.foes.map((f) => f.id)).toEqual(['ringer', 'detuner', 'clapper']);
    expect(foundry.foes.map((f) => f.budget)).toEqual([1, 1, 1]);
    expect(foundry.shapes.map((s) => s.id)).toEqual(['foundry:peal']);
    expect(foundry.rules[0]?.needs).toEqual([]);
    expect(foundry.shapes[0]?.needs.map((n) => n.reason)).toEqual(
      (NEEDS['foundry:peal'] ?? []).map((n) => n.reason),
    );
  });

  it('EN-K6: the bells stamp is bells in two or three tones, two at the minimum', () => {
    const rule = kitOf('foundry').rules[0];
    const blank = parseBoard(
      [
        '. . . . .',
        '. . . . .',
        '. . . . .',
        '. . . . .',
        '. . . . .',
        '. . . . .',
        '. . . . .',
      ].join('\n'),
    );
    for (const seed of [1, 2, 3, 4, 5, 6]) {
      const bells = (b: BoardSpec) =>
        b.tiles.flatMap((t) =>
          t.piece?.id === 'foundry:bell' ? [(t.piece.data as { tone: string }).tone] : [],
        );
      const full = bells(rule?.stamp(blank, seed, false) as BoardSpec);
      expect(full.length).toBeGreaterThanOrEqual(3);
      expect(full.length).toBeLessThanOrEqual(4);
      expect(new Set(full).size).toBeGreaterThanOrEqual(2);
      const least = bells(rule?.stamp(blank, seed, true) as BoardSpec);
      expect(least).toHaveLength(2);
      expect(new Set(least).size).toBe(2);
    }
  });

  it('EN-K6: a Ringer takes a free rope when the board has one, any plain tile when it has none', () => {
    const ringer = kitOf('foundry').foes.find((f) => f.id === 'ringer');
    const bare = parseBoard(['. . .', '. . .', 'P P P'].join('\n'));
    expect(ringer?.valid(bare, { x: 1, y: 0 })).toBe(true);
    const roped = parseBoard(['. {rope:mid} .', '. . .', 'P P P'].join('\n'));
    expect(ringer?.valid(roped, { x: 1, y: 0 })).toBe(true);
    expect(ringer?.valid(roped, { x: 0, y: 0 })).toBe(false);
  });

  describe("R6: bells keep the party's way open", () => {
    // A one-tile corridor from the start up to a foe: every free tile in it cuts the foe's end off.
    const corridor = () =>
      parseBoard(
        ['= r =', '= . =', '= . =', '= . =', '= . =', '= . =', '= . =', '= . =', '= P ='].join(
          '\n',
        ),
      );
    const bellPiece = () => {
      const found = kitOf('foundry').pieces.find((x) => x.id === 'foundry:bell');
      if (!found) throw new Error('no bell kit');
      return found;
    };
    const withBell = (b: BoardSpec, x: number, y: number) => {
      const out = structuredClone(b);
      out.tiles[y * out.width + x] = parseBoard('{bell:low}')
        .tiles[0] as BoardSpec['tiles'][number];
      return out;
    };

    it('R6-1: a one-tile corridor is never filled by a bell, and a bell there is not valid', () => {
      for (const seed of [1, 2, 3, 4, 5, 6, 7, 8]) {
        expect(bellPiece().place(corridor(), seed)).toBeNull();
      }
      for (const y of [2, 3, 4, 5, 6])
        expect(bellPiece().valid(withBell(corridor(), 1, y))).toBe(false);
    });

    it('R6-1: a bell in an open room is still valid and still placed', () => {
      const room = parseBoard(
        [
          '. . . . .',
          '. . . . .',
          '. . r . .',
          '. . . . .',
          '. . . . .',
          '. . . . .',
          'P P P P .',
        ].join('\n'),
      );
      const made = bellPiece().place(room, 3);
      expect(made).not.toBeNull();
      expect(bellPiece().valid(made as BoardSpec)).toBe(true);
    });

    it('R6-2: the bells stamp never lies on or beside a unit or start, nor cuts the way off', () => {
      const rule = kitOf('foundry').rules[0];
      const walled = parseBoard(
        [
          '= = = = = = =',
          '= . . r . . =',
          '= = . = . = =',
          '= . . . . . =',
          '= . = = = . =',
          '= . . . . . =',
          '= . = . = . =',
          '= . . . . . =',
          '= P . . . P =',
          '= . . . . . =',
        ].join('\n'),
      );
      const bellsOf = (b: BoardSpec) =>
        b.tiles.flatMap((t, i) =>
          t.piece?.id === 'foundry:bell' ? [{ x: i % b.width, y: Math.floor(i / b.width) }] : [],
        );
      const walkable = (b: BoardSpec, skip: ReadonlySet<string>) => {
        const start = b.starts[0] as { x: number; y: number };
        const seen = new Set<string>([`${start.x},${start.y}`]);
        const todo = [start];
        for (let c = todo.pop(); c; c = todo.pop()) {
          for (const [dx, dy] of [
            [1, 0],
            [-1, 0],
            [0, 1],
            [0, -1],
          ] as const) {
            const n = { x: c.x + dx, y: c.y + dy };
            const t = b.tiles[n.y * b.width + n.x];
            const k = `${n.x},${n.y}`;
            if (!t || n.x < 0 || n.x >= b.width || blocksUnits(t) || skip.has(k) || seen.has(k))
              continue;
            seen.add(k);
            todo.push(n);
          }
        }
        return seen;
      };
      for (const seed of Array.from({ length: 40 }, (_, i) => i + 1)) {
        for (const minimum of [false, true]) {
          const made = rule?.stamp(walled, seed, minimum) as BoardSpec;
          const bells = bellsOf(made);
          const keys = new Set(bells.map((c) => `${c.x},${c.y}`));
          for (const c of bells) {
            for (const o of [...walled.units.map((u) => u.at), ...walled.starts]) {
              expect(Math.abs(o.x - c.x) + Math.abs(o.y - c.y)).toBeGreaterThanOrEqual(2);
            }
          }
          for (const k of walkable(walled, new Set())) {
            if (!keys.has(k)) expect(walkable(walled, keys).has(k)).toBe(true);
          }
        }
      }
    });
  });

  it('EN-K6: a drawn foundry room has its bells, and every room is judged fair', () => {
    const drawing: Drawing = {
      ...heartDrawing('carillonneur'),
      foes: ['ringer', 'clapper', 'detuner'],
      pieces: ['foundry:bell', 'foundry:rope'],
      shape: 'foundry:peal',
      length: 4,
    };
    for (const seed of [1, 2, 3]) {
      for (let room = 0; room < 3; room++) {
        const input = inputFor(drawing, seed, room);
        const made = generateRoom(input);
        expect(checkGenerated(made.layout, specFor(input, seed))).toEqual([]);
        const bells = made.layout.tiles.filter((t) => t.piece?.id === 'foundry:bell');
        expect(bells.length).toBeGreaterThanOrEqual(3);
        expect(made.layout.tiles.some((t) => t.piece?.id === 'foundry:rope')).toBe(true);
      }
    }
  }, 180_000);
});

describe('The peal (EN-K6)', () => {
  const hall = parseBoard(
    ['. . . . .', '. . . . .', '. . r . .', '. . . . .', '. . . . .', 'P P P P .'].join('\n'),
  );
  const peal = (length: Drawing['length']): Drawing => ({
    ...heartDrawing('carillonneur'),
    shape: 'foundry:peal',
    length,
  });
  const shape = () => {
    const found = kitOf('foundry').shapes[0]?.shape;
    if (!found) throw new Error('no peal');
    return found;
  };

  it('EN-K6: each room before the heart carries the great bell of its note and the lock beside it', () => {
    expect([0, 1, 2, 3, 4, 5].map(noteOfRoom)).toEqual([1, 2, 3, 4, 1, 2]);
    const expected = {
      1: { bells: 0, drops: true },
      2: { bells: 1, drops: false },
      3: { bells: 0, drops: false },
      4: { bells: 3, drops: false },
    } as const;
    for (const note of [1, 2, 3, 4] as const) {
      for (const seed of [1, 2, 3, 4]) {
        const edits = lockEdits(hall, note, seed);
        const first = edits[0];
        expect(first && 'piece' in first && first.piece?.id).toBe('foundry:greatBell');
        const data = first && 'piece' in first ? (first.piece?.data as { note: number }) : null;
        expect(data?.note).toBe(note);
        const bells = edits.filter((e) => 'piece' in e && e.piece?.id === 'foundry:bell').length;
        const drops = edits.filter((e) => 'terrain' in e).length;
        expect(bells).toBe(expected[note].bells);
        expect(drops > 0).toBe(expected[note].drops);
        // No edit lands on a start point, a unit or an occupied tile, and nobody is walled in.
        const board: BoardSpec = {
          ...hall,
          tiles: hall.tiles.map((t) => ({ ...t, terrain: { ...t.terrain } })),
        };
        for (const e of edits) {
          const i = e.at.y * board.width + e.at.x;
          const tile = board.tiles[i];
          expect(tile?.piece).toBeNull();
          expect(board.starts.some((p) => KEY(p) === KEY(e.at))).toBe(false);
          expect(board.units.some((u) => KEY(u.at) === KEY(e.at))).toBe(false);
          if (tile)
            board.tiles[i] =
              'piece' in e
                ? { ...tile, piece: e.piece }
                : { ...tile, terrain: { ...tile.terrain, ...e.terrain } };
        }
        expect(stillConnected(board)).toBe(true);
      }
    }
  });

  it('EN-K6: the lock stamps are deterministic from the seed', () => {
    expect(lockEdits(hall, 4, 9)).toEqual(lockEdits(hall, 4, 9));
    expect(lockEdits(hall, 4, 9)).not.toEqual(lockEdits(hall, 4, 10));
  });

  it('EN-K6: a won room that rang its great bell joins the peal, and no other does', () => {
    const drawing = peal(4);
    const input = (room: number, rung: { room: number; note: number }[]) =>
      shapeInput(drawing, 5, room, { rung });
    const rang = [
      {
        type: 'foundry:bellRung',
        at: { x: 0, y: 0 },
        data: { note: 2, lock: 'match', hang: 'mid' },
      },
    ] as unknown as EventLog;
    const settle = shape().afterRoom;
    expect(settle?.(input(1, []), rang, true)).toEqual({ rung: [{ room: 1, note: 2 }] });
    // A room that did not ring its bell, or was lost, leaves the peal as it was.
    expect(settle?.(input(1, []), [], true)).toEqual({ rung: [] });
    expect(settle?.(input(1, []), rang, false)).toEqual({ rung: [] });
    expect(settle?.(input(2, [{ room: 1, note: 2 }]), [], true)).toEqual({
      rung: [{ room: 1, note: 2 }],
    });
  });

  it('EN-K6: the heart hangs only the notes rung, on the hooks it was drawn with, and lists the tune', () => {
    const fallback = HEART_FRAMES.carillonneur?.fallback as BoardSpec;
    const hooks = hooksOf(fallback);
    expect(hooks).toHaveLength(4);
    const drawing = peal(5);
    const hung = (rung: { room: number; note: number }[]) => {
      const setup = pealSetup(
        shapeInput(drawing, 7, 4, { rung } as unknown as Json, { 4: fallback }) as never,
      );
      return { setup, bells: setup.boardEdits ?? [] };
    };
    const none = hung([]);
    expect(none.bells).toEqual([]);
    expect(none.setup.activate).toEqual(['foundry:tune']);
    expect(none.setup.rulesConfig).toEqual({ 'foundry:tune': { seed: 7 } });
    const two = hung([
      { room: 0, note: 1 },
      { room: 2, note: 3 },
    ]);
    expect(two.bells).toHaveLength(2);
    for (const e of two.bells) {
      expect(hooks.map((h) => KEY(h.at))).toContain(KEY(e.at));
      expect('piece' in e && e.piece?.id).toBe('foundry:greatBell');
      expect('piece' in e && (e.piece?.data as { allied: boolean } | undefined)?.allied).toBe(true);
    }
    // Four rooms rung is the most the four hooks take; a fifth does not hang.
    const all = hung([0, 1, 2, 3].map((room) => ({ room, note: room + 1 })));
    expect(all.bells).toHaveLength(4);
  });

  it('EN-K6: a heart with no stored layout still lists the tune and hangs nothing', () => {
    const setup = pealSetup(shapeInput(peal(3), 1, 2, { rung: [{ room: 0, note: 1 }] }) as never);
    expect(setup.boardEdits).toBeUndefined();
    expect(setup.activate).toEqual(['foundry:tune']);
  });
});

describe('The Cartographers kit (EN-K7)', () => {
  it('EN-K7: pencil and ink bring their pencil; the paper, the hands and the doorway are in the kit', () => {
    const hall = kitOf('cartographers');
    expect(hall.rules.map((r) => r.id)).toEqual(['cartographers:pencil']);
    expect(hall.rules[0]?.brings).toEqual(['cartographers:pencil']);
    expect(hall.pieces.map((x) => x.id)).toEqual([
      'cartographers:pencil',
      'cartographers:blank',
      'cartographers:outline',
    ]);
    expect(hall.foes.map((f) => f.id)).toEqual(['surveyor', 'eraser', 'tracer']);
    expect(hall.shapes.map((s) => s.id)).toEqual(['cartographers:doorway']);
  });

  it('EN-K7: the pencil stamp lays pencil above the start rows, fewer at the minimum', () => {
    const rule = kitOf('cartographers').rules[0];
    const blank = parseBoard(Array.from({ length: 8 }, () => '. . . . . .').join('\n'));
    for (const seed of [1, 2, 3, 4]) {
      const count = (minimum: boolean, fuller = false) => {
        const out = rule?.stamp(blank, seed, minimum, fuller) as BoardSpec;
        const pencil = out.tiles.flatMap((t, i) =>
          t.piece?.id === 'cartographers:pencil' ? [Math.floor(i / out.width)] : [],
        );
        expect(Math.max(...pencil)).toBeLessThan(out.height - 2);
        return pencil.length;
      };
      expect(count(false)).toBeGreaterThan(count(true));
      expect(count(false, true)).toBeGreaterThanOrEqual(count(false));
      expect(count(true)).toBeGreaterThanOrEqual(2);
    }
  });

  it('EN-K7: a drawn hall has pencil, and every room is judged fair', () => {
    const drawing: Drawing = {
      ...heartDrawing('registrar'),
      rule: 'cartographers:pencil',
      foes: ['surveyor', 'eraser', 'tracer'],
      pieces: ['cartographers:blank', 'cartographers:outline'],
      shape: 'cartographers:doorway',
      length: 4,
    };
    for (const seed of [1, 2, 3]) {
      for (let room = 0; room < 3; room++) {
        const input = inputFor(drawing, seed, room);
        const made = generateRoom(input);
        expect(checkGenerated(made.layout, specFor(input, seed))).toEqual([]);
        const ids = made.layout.tiles.map((t) => t.piece?.id);
        expect(ids).toContain('cartographers:pencil');
      }
    }
  }, 180_000);

  it('EN-K7: blank paper and outlines keep the party and every foe reachable', () => {
    const hall = kitOf('cartographers');
    const drawing: Drawing = {
      ...heartDrawing('registrar'),
      rule: 'cartographers:pencil',
      pieces: ['cartographers:blank', 'cartographers:outline'],
      shape: 'cartographers:doorway',
    };
    const made = generateRoom(inputFor(drawing, 4, 0));
    for (const piece of hall.pieces) {
      expect(piece.valid(made.layout)).toBe(true);
      expect(piece.cost).toBe(COSTS.piece);
    }
    expect(stillConnected(made.layout)).toBe(true);
  }, 60_000);
});

describe('The doorway (EN-K7)', () => {
  const doorway = (length: Drawing['length']): Drawing => ({
    ...heartDrawing('registrar'),
    shape: 'cartographers:doorway',
    length,
  });

  it('EN-K7: free return through room ceil(length / 2), none after it, the heart always', () => {
    expect([3, 4, 5, 6].map(freeThrough)).toEqual([2, 2, 3, 3]);
    const table = [3, 4, 5, 6].map((length) =>
      Array.from({ length }, (_, room) => mayReturn(room, length)),
    );
    expect(table).toEqual([
      [true, true, true],
      [true, true, false, true],
      [true, true, true, false, true],
      [true, true, true, false, false, true],
    ]);
  });

  it('EN-K7: a trip is held at the doorway by the engine, and the heart is always a way home', () => {
    for (const length of [3, 4, 5, 6] as const) {
      const { trip } = drawnTrip(doorway(length));
      for (let room = 0; room < length; room++) {
        const at: Trip = { ...trip, encounter: room, status: 'crossroads' };
        const check = returnCheck(at);
        expect(check.ok, `room ${room + 1} of ${length}`).toBe(mayReturn(room, length));
        if (!check.ok) expect(check.why).toMatch(/doorway/);
        const choices = choicesAt(at);
        const home = choices.find((c) => c.kind === 'return');
        expect(home?.disabled === undefined).toBe(mayReturn(room, length));
        // The doorway is named on the last way with a free return, and warns what lies past it.
        const way = choices.find((c) => c.id === 'doorway');
        expect(way !== undefined).toBe(room === freeThrough(length) - 1 && room < length - 1);
        if (way) expect(way.warn).toMatch(/no way home/);
      }
    }
  });

  it('EN-K7: the doorway remembers no room: no checkpoint, before or after it', () => {
    const { trip } = drawnTrip(doorway(5));
    expect(trip.kit?.checkpoint).toBe(false);
    expect(doorwayChoices({ room: 0, length: 5 })).toEqual([]);
    expect(doorwayChoices({ room: 2, length: 5 })).toHaveLength(1);
    expect(doorwayChoices({ room: 4, length: 5 })).toEqual([]);
  });

  it('EN-K7: every room lists the guild hand at the hall default pencil config', () => {
    const setup = doorwaySetup();
    expect(setup.activate).toEqual(['cartographers:guildHand']);
    expect(setup.rulesConfig).toEqual({ 'cartographers:guildHand': { ...DEFAULT_PENCIL } });
    // And the battle really lists it: a generated room set up under it carries the hand's state.
    const drawing: Drawing = { ...doorway(4), rule: 'cartographers:pencil' };
    const input = inputFor(drawing, 3, 0);
    const made = generateRoom(input);
    const party = sampleParty(2);
    const state = createBattle({
      title: 'A drawn room',
      board: serializeBoard(made.layout),
      seed: 3,
      lineup: party,
      party: Object.fromEntries(
        party.map((id) => [id, { spells: compiledFor(input.profile, id).spells }]),
      ),
    }).state;
    const set = setUpRoom(state, { ret: { kind: 'any' }, length: 4 }, setup);
    expect(set.rules?.['cartographers:guildHand']).toMatchObject({ planned: 0 });
  }, 60_000);
});

describe('EN-K: Pack K covers the foundry and the hall', () => {
  it('EN-K: every element the marker lists for the foundry and the hall has a kit', () => {
    const rules = GEN_KITS.flatMap((k) => k.rules.map((r) => r.id)) as string[];
    const pieces = GEN_KITS.flatMap((k) => k.pieces.map((x) => x.id)) as string[];
    const foes = GEN_KITS.flatMap((k) => k.foes.map((f) => f.id)) as string[];
    const shapes = GEN_KITS.flatMap((k) => k.shapes.map((s) => s.id)) as string[];
    expect(rules).toEqual(expect.arrayContaining(['foundry:bells', 'cartographers:pencil']));
    expect(pieces).toEqual(
      expect.arrayContaining([
        'foundry:bell',
        'foundry:rope',
        'cartographers:pencil',
        'cartographers:blank',
        'cartographers:outline',
      ]),
    );
    expect(foes).toEqual(
      expect.arrayContaining(['clapper', 'ringer', 'detuner', 'surveyor', 'eraser', 'tracer']),
    );
    expect(shapes).toEqual(expect.arrayContaining(['foundry:peal', 'cartographers:doorway']));
    expect(Object.keys(HEART_FRAMES)).toEqual(
      expect.arrayContaining(['carillonneur', 'registrar']),
    );
  });
});

/** `edits` written onto a copy of `layout` (what a room set up does to a battle's tiles). */
function withEdits(
  layout: BoardSpec,
  edits: readonly ReturnType<typeof lockEdits>[number][],
): BoardSpec {
  const out = structuredClone(layout);
  for (const e of edits) {
    const tile = out.tiles[e.at.y * out.width + e.at.x];
    if (!tile) continue;
    if ('piece' in e) tile.piece = e.piece ?? null;
    else tile.terrain = { ...tile.terrain, ...e.terrain };
  }
  return out;
}

describe('The peal stamps its rooms at generation (EN-K10, P40)', () => {
  const GREAT = 'foundry:greatBell';
  const peal = (length: Drawing['length']): Drawing => ({
    ...heartDrawing('carillonneur'),
    shape: 'foundry:peal',
    length,
  });
  const greatBells = (b: BoardSpec) => b.tiles.filter((t) => t.piece?.id === GREAT);

  it('EN-K10: a peal room is stored with its great bell', () => {
    for (const length of [3, 4, 5, 6] as const) {
      const drawing = peal(length);
      for (let room = 0; room < length - 1; room++) {
        const input = inputFor(drawing, 11 + room, room);
        const made = generateRoom(input);
        expect(
          checkGenerated(made.layout, specFor(input, input.seed)),
          `${length}/${room}`,
        ).toEqual([]);
        const bells = greatBells(made.layout);
        expect(bells, `${length}/${room}`).toHaveLength(1);
        expect((bells[0]?.piece?.data as { note: number } | undefined)?.note).toBe(
          noteOfRoom(room),
        );
        // The stored text carries it too.
        expect(greatBells(parseBoard(serializeBoard(made.layout)))).toHaveLength(1);
        // The stamped room still reaches its foes and its own start points.
        expect(stillConnected(made.layout)).toBe(true);
      }
    }
  }, 600_000);

  it('EN-K10: a trip inked before stamp still gets its bell', () => {
    const drawing = peal(4);
    const hall = parseBoard(
      ['. . . . .', '. . . . .', '. . r . .', '. . . . .', '. . . . .', 'P P P P .'].join('\n'),
    );
    for (const room of [0, 1, 2]) {
      const old = pealSetup(shapeInput(drawing, 5, room, null, { [room]: hall }) as never);
      const edits = old.boardEdits ?? [];
      expect(edits.length, `room ${room}`).toBeGreaterThan(0);
      const first = edits[0];
      expect(first && 'piece' in first && first.piece?.id).toBe(GREAT);
      expect(edits).toEqual(lockEdits(hall, noteOfRoom(room), deriveSeed(5, 7400 + room)));
      // A room stored with its bell gets none laid again.
      const stamped = withEdits(hall, edits);
      expect(greatBells(stamped)).toHaveLength(1);
      const fresh = pealSetup(shapeInput(drawing, 5, room, null, { [room]: stamped }) as never);
      expect(fresh.boardEdits).toBeUndefined();
    }
  });
});
