import { describe, expect, it } from 'vitest';
import type { Drawing } from '$data';
import { checkDrawing, checkGenerated, generateRoom, paletteOf, specFor } from '$engine/drawing';
import { FIXTURE_DRAWINGS, fullHousehold, heartRoom, heartSpec, inputFor } from './fixtures';

/**
 * Pack E's acceptance for the production generator (EN-2, EN-5): each test goes through a heart
 * room, which comes from its master's frame (P35, so the master must stand on the board).
 */

const SEEDS = [1, 2, 3];
const manhattan = (a: { x: number; y: number }, b: { x: number; y: number }): number =>
  Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

describe('EN-2: the production generator', () => {
  it('EN-2: checkGenerated is green on every seed of every fixture drawing', () => {
    for (const drawing of FIXTURE_DRAWINGS) {
      for (const seed of SEEDS) {
        const heart = heartRoom(drawing.heart, seed);
        expect(heart.masterOnBoard, `${drawing.name} heart, seed ${seed}`).toBe(true);
        for (let room = 0; room < drawing.length; room++) {
          const input = inputFor(drawing, seed, room);
          const spec = room === drawing.length - 1 ? heartSpec(input) : specFor(input, seed);
          // The heart was generated above (the same input gives the same room): not twice.
          const made = room === drawing.length - 1 ? heart.room : generateRoom(input);
          expect(checkGenerated(made.layout, spec)).toEqual([]);
        }
      }
    }
  }, 120_000);

  it('EN-2: same input gives the same layout, attempts and ops', () => {
    for (const master of ['marginalia', 'mother'] as const) {
      const a = heartRoom(master, 4);
      const b = heartRoom(master, 4);
      expect(a.masterOnBoard).toBe(true);
      expect(b.room.layout).toEqual(a.room.layout);
      expect([b.room.attempts, b.room.ops]).toEqual([a.room.attempts, a.room.ops]);
    }
  });

  it('EN-2: no foe starts within distance 2 of any P', () => {
    for (const master of ['marginalia', 'mother'] as const) {
      for (const seed of SEEDS) {
        const { room, masterOnBoard } = heartRoom(master, seed);
        expect(masterOnBoard).toBe(true);
        for (const u of room.layout.units.filter((x) => x.kind === 'enemy')) {
          for (const p of room.layout.starts) expect(manhattan(u.at, p)).toBeGreaterThanOrEqual(3);
        }
      }
    }
  });

  it('EN-2: depth bands scale the foe budget', () => {
    const light: Drawing = { ...FIXTURE_DRAWINGS[0], name: 'Light' } as Drawing;
    const heavy: Drawing = {
      ...(FIXTURE_DRAWINGS[3] as Drawing),
      name: 'Heavy',
      pieces: ['canals:lamp'],
      shape: 'canals:landings',
    };
    const budget = (d: Drawing, room: number) => specFor(inputFor(d, 1, room), 1).budget;
    expect(budget(heavy, 0)).toBeGreaterThan(budget(light, 0));
    expect(budget(light, 2)).toBeGreaterThan(budget(light, 0));
    // The heart's spec is a heart (P35); the spike never flags one.
    expect(specFor(inputFor(light, 1), 1).heart).toBe(true);
  });

  it('EN-2: unverified fallbacks are zero', () => {
    // The lamp-mother is not here: the lite bot needs 17 to 38 rounds for her (the heart limit is
    // 16), so all her hearts reach the fallback and it stays unverified until the bot has terms for
    // the current. Every other frame is covered (Pack I).
    for (const master of [
      'marginalia',
      'lamplighter',
      'postmaster',
      'bathSteward',
      'chiefWarden',
    ] as const) {
      for (const seed of SEEDS) {
        const { room, masterOnBoard } = heartRoom(master, seed);
        expect(masterOnBoard).toBe(true);
        expect(room.fallback && !room.verified).toBe(false);
      }
    }
  });
});

describe('EN-5: every offered combination generates (P23)', () => {
  it('EN-5: every offered combination generates', () => {
    const p = fullHousehold();
    const palette = paletteOf(p);
    let tried = 0;
    for (const rule of [null, ...palette.rules]) {
      for (const master of palette.masters) {
        for (const foe of palette.foes) {
          const drawing: Drawing = {
            name: 'Offered',
            rule,
            foes: [foe],
            pieces: [],
            shape: 'plain',
            length: 3,
            heart: master,
          };
          if (checkDrawing(p, drawing).length > 0) continue;
          if (tried >= 40) continue;
          tried++;
          const room = generateRoom(inputFor(drawing, tried));
          const masterOnBoard = room.layout.units.some(
            (u) => u.kind === 'enemy' && u.def === master,
          );
          expect(masterOnBoard, `${rule} ${foe} ${master}`).toBe(true);
        }
      }
    }
    expect(tried).toBeGreaterThan(0);
  });
});
