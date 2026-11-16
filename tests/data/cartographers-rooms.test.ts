import { describe, expect, test } from 'vitest';
import { CARTOGRAPHERS_KIT } from '$data/districts/cartographers';
import { CARTOGRAPHERS_ROOMS, ROOM_PENCIL } from '$data/districts/cartographers/rooms';
import { DEFAULT_PENCIL } from '$data/districts/cartographers/types';
import {
  type BoardSpec,
  compiledFor,
  createBattle,
  FOUNDERS,
  newProfile,
  parseBoard,
  startTrip,
} from '$engine';
import { TRACER_RULE_ID } from '$engine/districts/cartographers/foes';
import { GUILD_HAND_RULE_ID } from '$engine/districts/cartographers/types';
import { checkRoom, placeParty } from '$engine/rooms';
import { listRules } from '$engine/rules';
import { botFight } from '$engine/sim/bot';
import { returnCheck } from '$engine/trip/ret';
import { shapeOf } from '$engine/trip/shape';

/**
 * CG-9 and CG-10 (cartographers-plan P4, P13, P17): the six academy rooms, three layouts each.
 * Rooms 1-3 are the shallow set (`redraw: 0`, the three hands), rooms 4-5 and the heart carry
 * outlines and a `redraw`; the heart is the Registrar's. A scripted solve is the bot's own recorded
 * play: the founding pair wins the layout on some seed, and the script replays to the same end.
 */

const SHALLOW = CARTOGRAPHERS_ROOMS.slice(0, 3);
const DEEP = CARTOGRAPHERS_ROOMS.slice(3);
const LINEUPS = [FOUNDERS.slice(0, 1), FOUNDERS.slice(0, 2), [...FOUNDERS, 'runaway' as const]];

const defs = (spec: BoardSpec): string[] =>
  spec.units
    .map((u) => u.def)
    .sort()
    .map(String);
const piecesOf = (spec: BoardSpec, id: string) =>
  spec.tiles.filter((t) => t.piece?.id === `cartographers:${id}`).length;

function layoutsOf(rooms: typeof CARTOGRAPHERS_ROOMS) {
  return rooms.flatMap((room) =>
    room.variants.map((v) => ({ room, depth: room.depth, name: v.name, layout: v.layout })),
  );
}

function expectCheckRoom(rooms: typeof CARTOGRAPHERS_ROOMS): void {
  for (const { name, layout } of layoutsOf(rooms)) {
    expect(checkRoom(layout), name).toEqual([]);
    const spec = parseBoard(layout);
    expect(spec.width, name).toBeLessThanOrEqual(7);
    expect(spec.height, name).toBeLessThanOrEqual(9);
    for (const lineup of LINEUPS) {
      const placed = placeParty(spec, lineup, 1);
      expect(
        placed.units.filter((u) => u.kind === 'member'),
        name,
      ).toHaveLength(lineup.length);
    }
  }
}

/** The room's battle with its pencil configured, as a trip lists the district's rules. */
function fight(roomIndex: number, layout: string, seed: number) {
  const s = structuredClone(
    createBattle({
      title: `room ${roomIndex + 1}`,
      board: layout,
      seed,
      lineup: FOUNDERS,
      party: Object.fromEntries(
        FOUNDERS.map((id) => [id, { spells: compiledFor(newProfile(), id).spells }]),
      ),
    }).state,
  );
  s.rules = listRules(s, [GUILD_HAND_RULE_ID, TRACER_RULE_ID], {
    [GUILD_HAND_RULE_ID]: { ...(ROOM_PENCIL[roomIndex] ?? DEFAULT_PENCIL), seed },
  });
  return botFight(s, 40, FOUNDERS, { budget: 4000 });
}

/** The bot's recorded script on the first seed that wins; replaying it ends in the same win. */
function solved(roomIndex: number, layout: string): number | null {
  for (const seed of [1, 2, 3, 4, 5, 6, 7, 8]) {
    const first = fight(roomIndex, layout, seed);
    if (first.state.phase !== 'won' || first.exhausted) continue;
    const again = fight(roomIndex, layout, seed);
    expect(again.actions).toEqual(first.actions);
    return seed;
  }
  return null;
}

describe('the cartographers rooms (CG-9, CG-10)', () => {
  test('six rooms: academy names, three named layouts each, a loot table apiece', () => {
    expect(CARTOGRAPHERS_KIT.rooms).toBe(CARTOGRAPHERS_ROOMS);
    expect(CARTOGRAPHERS_ROOMS.map((r) => r.title)).toEqual([
      'The lecture theatre',
      'The drafting benches',
      'The registry',
      'The archive of corrections',
      'The back hall',
      'The register hall',
    ]);
    expect(CARTOGRAPHERS_ROOMS.map((r) => r.loot)).toEqual([
      'cartographers:room1',
      'cartographers:room2',
      'cartographers:room3',
      'cartographers:room4',
      'cartographers:room5',
      'cartographers:heart',
    ]);
    expect(CARTOGRAPHERS_ROOMS.map((r) => r.heart)).toEqual([
      false,
      false,
      false,
      false,
      false,
      true,
    ]);
    CARTOGRAPHERS_ROOMS.forEach((r, i) => {
      expect(r.depth).toBe(i + 1);
      expect(r.variants, r.title).toHaveLength(3);
      expect(new Set(r.variants.map((v) => v.name)).size).toBe(3);
      expect(r.layout).toBe(r.variants[0]?.layout);
    });
  });

  test('the pencil config: redraw 0 in rooms 1-3, 1-2 in rooms 4-5 and the heart; the share is the paper drawn', () => {
    expect(ROOM_PENCIL).toHaveLength(6);
    ROOM_PENCIL.forEach((c, i) => {
      expect(c.redraw, `room ${i + 1}`).toBe(i < 3 ? 0 : i === 3 ? 1 : 2);
      expect(c.share).toBeGreaterThan(0);
      expect(c.inkBias).toBeGreaterThan(0);
    });
    const off: string[] = [];
    CARTOGRAPHERS_ROOMS.forEach((room, i) => {
      for (const v of room.variants) {
        const spec = parseBoard(v.layout);
        const paper = spec.tiles.filter((t) => t.piece?.id !== 'cartographers:blank').length;
        const pencil = piecesOf(spec, 'pencil') + piecesOf(spec, 'outline');
        const share = pencil / paper;
        const want = ROOM_PENCIL[i]?.share ?? 0;
        if (Math.abs(share - want) >= 0.08) {
          off.push(`${v.name} ${share.toFixed(2)} vs ${want.toFixed(2)}`);
        }
      }
    });
    expect(off).toEqual([]);
  });

  test('foe mixes: surveyor, eraser and tracer in rooms 1-3 (no outlines); outlines from room 4; the Registrar in the heart', () => {
    const rooms = [...SHALLOW, ...DEEP];
    rooms.forEach((room, i) => {
      for (const v of room.variants) {
        const spec = parseBoard(v.layout);
        const foes = defs(spec);
        if (i < 3) expect(piecesOf(spec, 'outline'), v.name).toBe(0);
        else expect(piecesOf(spec, 'outline'), v.name).toBeGreaterThanOrEqual(2);
        if (i === 5) {
          expect(foes, v.name).toEqual(['registrar', 'tracer']);
        } else {
          expect(foes, v.name).toContain('surveyor');
          expect(foes, v.name).toContain('eraser');
        }
        if (i >= 1 && i <= 4) expect(foes, v.name).toContain('tracer');
        if (i === 0) expect(foes, v.name).toHaveLength(2);
      }
    });
  });

  test('CG-10: the heart room is a return point', () => {
    const shape = shapeOf('cartographers');
    expect(shape.length).toBe(6);
    const trip = {
      ...startTrip(newProfile(), 1),
      district: 'cartographers',
      encounter: 5,
    } as const;
    expect(returnCheck(trip, shape)).toEqual({ ok: true });
  });

  test('CG-9: checkRoom passes for every room 1-3 layout at party sizes 1-3', () => {
    expectCheckRoom(SHALLOW);
    for (const room of SHALLOW) {
      for (const v of room.variants) {
        const spec = parseBoard(v.layout);
        expect(spec.starts.length, v.name).toBeGreaterThanOrEqual(4);
        expect(spec.height, v.name).toBeGreaterThanOrEqual(6);
      }
    }
  });

  test('CG-9: a scripted solve exists for every room 1-3 layout', () => {
    const wins: string[] = [];
    SHALLOW.forEach((room, i) => {
      for (const v of room.variants) {
        const seed = solved(i, v.layout);
        expect(seed, v.name).not.toBeNull();
        wins.push(`${v.name}@${seed}`);
      }
    });
    expect(wins).toHaveLength(9);
  }, 120_000);

  test('CG-10: checkRoom passes for every room 4-5 and heart layout', () => {
    expectCheckRoom(DEEP);
    for (const room of DEEP) {
      for (const v of room.variants) {
        const spec = parseBoard(v.layout);
        expect(spec.starts.length, v.name).toBeGreaterThanOrEqual(4);
        expect(spec.width, v.name).toBe(7);
        expect(spec.height, v.name).toBe(9);
      }
    }
  });

  test('CG-10: a scripted solve exists for every deep layout', () => {
    const wins: string[] = [];
    DEEP.forEach((room, j) => {
      for (const v of room.variants) {
        const seed = solved(j + 3, v.layout);
        expect(seed, v.name).not.toBeNull();
        wins.push(`${v.name}@${seed}`);
      }
    });
    expect(wins).toHaveLength(9);
  }, 240_000);
});
