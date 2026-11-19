import { describe, expect, it } from 'vitest';
import type { Drawing } from '$data';
import { COSTS, NEEDS, UNDRAWN } from '$data/drawing';
import {
  checkDrawing,
  checkGenerated,
  GEN_KITS,
  generateRoom,
  HEART_FRAMES,
  paletteOf,
  specFor,
} from '$engine/drawing';
import { parseBoard } from '$engine/notation';
import { fullHousehold, heartDrawing, heartRoom, inputFor } from './fixtures';
import { SCRIPTS } from './kits-a.scripts';

/**
 * Pack I's kits and frames beyond the shared acceptance tests (EN-K1 to EN-K3): what each frame
 * declares, which master stands on the board and that the scripted solves exist.
 */

const MASTERS = ['marginalia', 'mother', 'lamplighter', 'postmaster'] as const;

describe('Pack I frames (EN-K1 to EN-K3)', () => {
  it('EN-K1: every frame takes its needs and cost from the drawing table', () => {
    for (const master of MASTERS) {
      const frame = HEART_FRAMES[master];
      expect(frame?.master).toBe(master);
      expect(frame?.cost).toBe(COSTS.hearts[master]);
      expect(frame?.needs.map((n) => n.reason)).toEqual((NEEDS[master] ?? []).map((n) => n.reason));
      expect(frame?.setup.foe).toBe(master);
      expect(frame?.escorts).toEqual([]);
    }
  });

  it('EN-K2: the Lamplighter stands where the lamp-mother stood, on dry ground', () => {
    for (const seed of [1, 2, 3]) {
      const { room, masterOnBoard } = heartRoom('lamplighter', seed);
      expect(masterOnBoard).toBe(true);
      const foes = room.layout.units.filter((u) => u.kind === 'enemy');
      expect(foes.some((u) => u.def === 'mother')).toBe(false);
      const lamplighter = foes.find((u) => u.def === 'lamplighter');
      const tile =
        room.layout.tiles[(lamplighter?.at.y ?? 0) * room.layout.width + (lamplighter?.at.x ?? 0)];
      expect(tile?.terrain.water).toBeNull();
      expect(room.layout.tiles.some((t) => t.terrain.water !== null)).toBe(true);
    }
  });

  it('EN-K2: the lamp-mother stands on the current', () => {
    const { room, masterOnBoard } = heartRoom('mother', 5);
    expect(masterOnBoard).toBe(true);
    const mother = room.layout.units.find((u) => u.def === 'mother');
    const tile = room.layout.tiles[(mother?.at.y ?? 0) * room.layout.width + (mother?.at.x ?? 0)];
    expect(tile?.terrain.water).not.toBeNull();
  });

  it('every master with a frame has a scripted solve, and the canals kit lends the landings', () => {
    for (const master of MASTERS) {
      if (HEART_FRAMES[master]) expect(SCRIPTS[master]?.length).toBeGreaterThan(0);
    }
    expect(GEN_KITS.find((k) => k.district === 'canals')?.shapes.map((s) => s.id)).toEqual([
      'canals:landings',
    ]);
  });

  it('EN-K3: the writs bring a return and an order to every room that draws them', () => {
    const drawing = heartDrawing('postmaster');
    const kit = GEN_KITS.find((k) => k.district === 'inkQuarter');
    expect(kit?.rules.map((r) => r.id)).toEqual(['inkQuarter:writs']);
    expect(kit?.rules[0]?.brings).toEqual(['inkQuarter:return', 'inkQuarter:order']);
    for (const seed of [1, 2, 3]) {
      for (let room = 0; room < drawing.length - 1; room++) {
        const input = inputFor(drawing, seed, room);
        const made = generateRoom(input);
        expect(checkGenerated(made.layout, specFor(input, seed))).toEqual([]);
        const pieces = made.layout.tiles.map((t) => t.piece?.id);
        expect(pieces).toContain('inkQuarter:return');
        expect(pieces).toContain('inkQuarter:order');
      }
    }
  }, 120_000);
});

describe('EN-K8: kit-less elements', () => {
  it('EN-K8: every offered foe and piece generates in a room', () => {
    const foes = ['snuffer', 'deadLetter', 'sorter', 'sealer'] as const;
    const pieces = ['inkQuarter:return', 'inkQuarter:order', 'inkQuarter:forward'] as const;
    for (const id of [...foes, ...pieces]) {
      const piece = id.startsWith('inkQuarter:');
      const drawing: Drawing = {
        ...heartDrawing('marginalia'),
        rule: null,
        shape: 'plain',
        length: 3,
        foes: piece ? ['rat'] : [id as (typeof foes)[number]],
        pieces: piece ? [id as (typeof pieces)[number]] : [],
      };
      const input = inputFor(drawing, 1, 0);
      const made = generateRoom(input);
      expect(checkGenerated(made.layout, specFor(input, 1)), id).toEqual([]);
      if (piece)
        expect(
          made.layout.tiles.some((t) => t.piece?.id === id),
          id,
        ).toBe(true);
    }
  }, 120_000);

  it('EN-K8: dropped elements are never offered', () => {
    const palette = paletteOf(fullHousehold());
    expect([...palette.foes, ...palette.pieces].filter((id) => Object.hasOwn(UNDRAWN, id))).toEqual(
      [],
    );
  });

  it('EN-K8: forwarding lays its address', () => {
    const kit = GEN_KITS.flatMap((k) => k.pieces).find((p) => p.id === 'inkQuarter:forward');
    expect(kit).toBeDefined();
    if (!kit) throw new Error('Missing forwarding kit');
    const board = parseBoard('. . . . .\n. . . . .\n. . . . .\n. . . . .\nP P P P .');
    for (let seed = 0; seed < 50; seed++) {
      const placed = kit.place(board, seed);
      expect(placed).not.toBeNull();
      if (!placed) throw new Error('No room for forwarding');
      const forward = placed.tiles.find((t) => t.piece?.id === 'inkQuarter:forward')?.piece;
      const address = placed.tiles.find((t) => t.piece?.id === 'inkQuarter:address')?.piece;
      expect(forward?.data).toEqual(address?.data);
      expect(kit.valid(placed)).toBe(true);
      const next = kit.place(placed, seed);
      expect(
        next?.tiles.filter((t) => t.piece?.id === 'inkQuarter:forward').map((t) => t.piece?.data),
      ).toEqual(expect.arrayContaining([{ pair: 'a' }, { pair: 'b' }]));
    }
    expect(kit.place(parseBoard('. .\nP P\nP P'), 1)).toBeNull();
    expect(kit.valid(parseBoard('{forward:a} . .\n. . .\nP P P'))).toBe(false);
  });

  it('EN-K8: the span piece needs nothing', () => {
    const drawing: Drawing = {
      ...heartDrawing('marginalia'),
      rule: null,
      pieces: ['bridges:span'],
      shape: 'plain',
    };
    expect(
      checkDrawing(fullHousehold(), drawing).filter(
        (i) => i.element === 'piece' && i.id === 'bridges:span',
      ),
    ).toEqual([]);
    expect(
      checkDrawing(fullHousehold(), { ...drawing, pieces: [], shape: 'bridges:span' }).some(
        (i) => i.element === 'shape' && i.reason.includes('needs collapse'),
      ),
    ).toBe(true);
  });
});
