import type { Component } from 'svelte';
import { afterAll, describe, expect, test } from 'vitest';
import { ENEMIES } from '$data';
import { type BattleState, type EnemyUnit, parseBoard } from '$engine';
import { KIT } from '$engine/districts/kit';
import type {
  BoardRule,
  PieceDef,
  PreviewShape,
  ScriptStep,
  TilePiece,
} from '$engine/districts/types';
import { removeFromRoom } from '$engine/outOfRoom';
import { IDLE } from '../../src/app/battleInput';
import { overlayFor, stepsOf } from '../../src/app/overlay';
import { inSlotOrder, pieceViewOf, tileViewOf, viewOf, viewOfSpec } from '../../src/app/view';
import { cellLabel } from '../../src/ui/components/board/label';
import { pieceArtFor } from '../../src/ui/districts';
import { board, draft } from '../scenarios/harness';
import { at } from './battleFixtures';

/**
 * DK-13: what the board draws from the kit's registries. A fixture piece, rule and stand-in step are
 * registered for the file (the shipped kit has none yet): the view carries the piece's art key, the
 * overlay carries the rules' preview shapes and the foe's step telegraph, an out member is not alive.
 */

const PIECE = 'bathhouses:writ' as const;
const RULE = 'bathhouses:heat' as const;
const STEP = 'bathhouses:ring' as const;

const writ: PieceDef = {
  id: PIECE,
  token: 'writ',
  solid: 'none',
  data: {
    init: { n: 1 },
    parse: (s) => (/^\d$/.test(s) ? { n: Number(s) } : null),
    write: (d) => String((d as { n: number }).n),
  },
  triggers: {},
  palette: { label: 'Writ', lab: true },
  art: 'bathhouses:writ',
};

const SHAPES: PreviewShape[] = [
  { kind: 'float', from: { x: 0, y: 0 }, to: { x: 1, y: 0 } },
  { kind: 'float', from: { x: 2, y: 0 }, to: null },
  { kind: 'tile', at: { x: 1, y: 1 }, tone: 'cracked' },
  { kind: 'outline', cells: [{ x: 2, y: 1 }], label: 'ink' },
  { kind: 'pulse', at: { x: 3, y: 1 } },
  { kind: 'meter', label: 'Heat', value: 3, max: 6 },
];

const heat: BoardRule<null> = {
  id: RULE,
  slot: 'late',
  order: 0,
  scope: 'piece',
  activatedBy: { kind: 'piece', pieces: [PIECE] },
  init: () => null,
  step: (_ctx, own) => own,
  preview: (s) => {
    const m = s.units.find((u) => u.kind === 'member');
    return [
      ...SHAPES,
      ...(m ? [{ kind: 'ghost' as const, unit: m.id, from: m.pos, to: { x: 3, y: 2 } }] : []),
    ];
  },
};

const ring: ScriptStep = {
  id: STEP,
  plan: (s) => {
    const m = s.units.find((u) => u.kind === 'member');
    return m
      ? { label: 'ring', tiles: [{ x: 1, y: 1 }], units: [m.id], sequence: [2, 4], countdown: 1 }
      : null;
  },
  act: () => {},
  describe: (tg) => tg.label,
};

const pieces = KIT.pieces as Record<string, PieceDef>;
const tokens = KIT.tokens as Record<string, PieceDef>;
const steps = KIT.steps as Record<string, ScriptStep>;
const rules = KIT.rules as Record<string, BoardRule>;
const original = ENEMIES.dummy;

// Registered while the file loads: the describe bodies below parse boards at collection time.
pieces[PIECE] = writ;
tokens[writ.token] = writ;
steps[STEP] = ring;
rules[heat.id] = heat as BoardRule;
ENEMIES.dummy = { ...original, script: { steps: [STEP], standIn: true } };
afterAll(() => {
  delete pieces[PIECE];
  delete tokens[writ.token];
  delete steps[STEP];
  delete rules[heat.id];
  ENEMIES.dummy = original;
});

describe('pieces on the view', () => {
  test('a tile view carries the piece id, art key, label and a copy of its data', () => {
    const s = board('S {writ:2} .');
    const piece = s.tiles[1]?.piece as TilePiece;
    const view = tileViewOf(s.tiles[1] as BattleState['tiles'][number]);
    expect(view.piece).toEqual({
      id: PIECE,
      art: 'bathhouses:writ',
      label: 'Writ',
      data: { n: 2 },
    });
    expect(view.piece?.data).not.toBe(piece.data);
    expect(viewOf(s).tiles[0]?.piece).toBeUndefined();
  });

  test('an id the registry does not know still shows, as its own name', () => {
    expect(pieceViewOf({ id: 'seam:gone', data: null })).toEqual({
      id: 'seam:gone',
      art: 'seam:gone',
      label: 'seam:gone',
      data: null,
    });
    expect(pieceViewOf(null)).toBeNull();
  });

  test('a cell label names the piece', () => {
    const view = viewOfSpec(parseBoard('S {writ} .'));
    expect(cellLabel(view, at('B1'))).toBe('B1: Writ');
  });

  test('the renderer registry resolves by art key; a miss is the fallback glyph', () => {
    const Art = (() => null) as unknown as Component<{ data: unknown; size: number }>;
    const ui = { bathhouses: { pieceArt: { 'bathhouses:writ': Art } } };
    expect(pieceArtFor('bathhouses:writ', ui)).toBe(Art);
    expect(pieceArtFor('bathhouses:other', ui)).toBeUndefined();
    expect(pieceArtFor('toString', ui)).toBeUndefined();
    expect(pieceArtFor('bathhouses:writ')).toBeUndefined();
  });
});

describe('the next-round preview', () => {
  const s = board('S . . .\n. . . .\n{writ} . . .');

  test('every rule shape reaches the overlay, ghosts become unit ghosts', () => {
    const next = overlayFor(s, IDLE).next;
    const kinds = next?.shapes.map((sh) => sh.kind);
    expect(kinds).toEqual(['float', 'float', 'tile', 'outline', 'pulse', 'meter', 'ghost']);
    expect(next?.units).toEqual([
      { unit: 'stoker', at: { x: 3, y: 2 }, kind: 'member', def: 'stoker' },
    ]);
  });

  test('a float may leave the board (to null)', () => {
    const floats = overlayFor(s, IDLE).next?.shapes.filter((sh) => sh.kind === 'float');
    expect(floats?.[1]).toEqual({ kind: 'float', from: { x: 2, y: 0 }, to: null });
  });

  test('no piece, no rule: no preview', () => {
    expect(overlayFor(board('S . . .'), IDLE).next).toBeNull();
  });
});

describe('a stand-in foe telegraph', () => {
  const s = board('S . . d');
  const foe = s.units.find((u): u is EnemyUnit => u.kind === 'enemy') as EnemyUnit;

  test('the overlay draws its tiles, the units it names and its sequence', () => {
    expect(foe.intent?.kind).toBe('step');
    expect(overlayFor(s, IDLE).steps).toEqual([
      {
        from: foe.pos,
        label: 'ring',
        tiles: [{ x: 1, y: 1 }],
        units: [at('A1')],
        order: 1,
        sequence: [2, 4],
        countdown: 1,
        emphasis: 'normal',
      },
    ]);
  });

  test('playback draws the same from the view', () => {
    expect(stepsOf(viewOf(s).units)).toEqual(overlayFor(s, IDLE).steps);
  });

  test('a foe that is down draws nothing', () => {
    const dead = draft(s, (ctx) => {
      const f = ctx.s.units.find((u) => u.kind === 'enemy');
      if (f) f.hp = 0;
    }).state;
    expect(overlayFor(dead, IDLE).steps).toEqual([]);
  });
});

describe('members out of the room', () => {
  const out = draft(board('S . . d'), (ctx) => {
    const m = ctx.s.units.find((u) => u.kind === 'member');
    if (m) removeFromRoom(ctx, m, 'fell');
  }).state;

  test('the view marks them out and not alive, their HP kept', () => {
    const m = viewOf(out).units.find((u) => u.kind === 'member');
    expect(m).toMatchObject({ alive: false, out: 'fell' });
    expect(m?.hp).toBeGreaterThan(0);
  });

  test('a member in the room has no out flag', () => {
    expect(viewOf(board('S . .')).units[0]?.out).toBeUndefined();
  });
});

describe('the party strip order', () => {
  const party = [{ def: 'stoker' }, { def: 'draughtsman' }, { def: 'runaway' }];

  test('follows the slots; the battle order is kept for anyone they do not name', () => {
    expect(inSlotOrder(party, ['runaway', 'stoker', 'draughtsman']).map((m) => m.def)).toEqual([
      'runaway',
      'stoker',
      'draughtsman',
    ]);
    expect(inSlotOrder(party, ['draughtsman']).map((m) => m.def)).toEqual([
      'draughtsman',
      'stoker',
      'runaway',
    ]);
  });

  test('without slots the battle order stays', () => {
    expect(inSlotOrder(party, undefined)).toEqual(party);
    expect(inSlotOrder(party, [])).toEqual(party);
  });
});
