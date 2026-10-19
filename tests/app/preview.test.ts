import { describe, expect, test } from 'vitest';
import type { LineId, MemberId } from '$data';
import { type Action, type Coord, legalAims, scenarioBattle } from '$engine';
import {
  aimAt,
  memberMode,
  onCell,
  onSpell,
  type PreviewCtx,
  previewOf,
} from '../../src/app/battleInput';
import { hintFor } from '../../src/app/describe';
import { fallbackLattices } from '../../src/app/lab';
import { overlayFor } from '../../src/app/overlay';
import { at, battleOf, CAST_BOARD, SHOVE_BOARD } from './battleFixtures';

const sameAt = (a: Coord, b: Coord): boolean => a.x === b.x && a.y === b.y;

const boltRight: Action = {
  type: 'cast',
  unit: 'draughtsman',
  spell: '0,1',
  aim: { kind: 'dir', dir: 'right' },
};

test('a Bolt that hits a unit previews its landing and marks the target tile', () => {
  const p = previewOf(battleOf(CAST_BOARD), boltRight);
  expect(p.damage).toEqual({ 'dummy-1': 2 });
  expect(p.kills).toEqual([]);
  expect(p.summary).toBe('Bolt right: dummy D1 −2 marked');
  expect(p.targets).toEqual([{ x: 3, y: 0 }]);
  expect(p.path.length).toBeGreaterThan(1);
});

test('a touch reads as what it does to the unit it aims at', () => {
  const s = scenarioBattle(
    { board: SHOVE_BOARD, lattices: { stoker: 'Touch> Strike' } },
    { lab: true },
  );
  const p = previewOf(s, {
    type: 'cast',
    unit: 'stoker',
    spell: '0,0',
    aim: { kind: 'tile', at: { x: 1, y: 0 } },
  });
  expect(p.summary).toBe('Touch at B1: rat B1 −2 dies');
  expect(p.targets).toEqual([{ x: 1, y: 0 }]);
});

test('a shove previews the pushed unit', () => {
  const s = battleOf(SHOVE_BOARD);
  const p = previewOf(s, { type: 'shove', unit: 'stoker', dir: 'right' });
  expect(p.targets).toEqual([{ x: 1, y: 0 }]);
  expect(p.summary).toMatch(/^Shove rat right: /);
});

test('preview never changes the session state', () => {
  const s = battleOf(CAST_BOARD);
  const snapshot = structuredClone(s);
  previewOf(s, boltRight);
  expect(s).toEqual(snapshot);
});

// ── D2/D3, P41/P42: the masked preview ──────────────────

const pad = (row: string): string => [row, ...Array(7).fill('. . . . . .')].join('\n');
const lab = (board: string, lattices: Partial<Record<MemberId, string>> = {}) =>
  scenarioBattle({ board, lattices }, { lab: true, lattices: fallbackLattices() });
const unseen: PreviewCtx = { witnessed: new Set() };
const sparkOnMark = () =>
  lab(['D . . d! . .', ...Array(6).fill('. . . . . .'), '. S . . . .'].join('\n'), {
    draughtsman: 'Bolt> Spark',
  });
const sparkRight: Action = {
  type: 'cast',
  unit: 'draughtsman',
  spell: '0,0',
  aim: { kind: 'dir', dir: 'right' },
};
const shoveRight: Action = { type: 'shove', unit: 'stoker', dir: 'right' };

describe('masked preview (D2)', () => {
  test('masked-preview-blank-result: the landing is drawn, the result is not said', () => {
    const s = sparkOnMark();
    const full = previewOf(s, sparkRight);
    expect(full.masked).toBe(false);
    expect(full.damage['dummy-1']).toBe(4);

    const p = previewOf(s, sparkRight, unseen);
    expect(p.masked).toBe(true);
    expect(p.blanks).toEqual([at('D1')]);
    // Only the Bolt's own hit is described: not the Spark's burst on the mark.
    expect(p.damage['dummy-1']).toBe(1);
    expect(p.summary).toBe('Bolt right: dummy D1 −1');
    expect(p.summary).not.toMatch(/\?|burst|spark/i);
    expect(p.shown.every((e) => !e.line)).toBe(true);
  });

  test('masked-preview-overlay: a dotted tile with no text, no badge, no resulting-state ghosts', () => {
    const s = sparkOnMark();
    const aim = onSpell(s, memberMode(s, 'draughtsman'), '0,0', unseen).mode;
    const mode = onCell(s, aim, at('B1'), unseen).mode;
    const o = overlayFor(s, mode);
    expect(o.highlights).toContainEqual({ kind: 'blank', at: at('D1') });
    // The blank carries nothing but its place: the same look whatever the hidden line is.
    const blank = o.highlights.find((h) => h.kind === 'blank');
    expect(Object.keys(blank ?? {}).sort()).toEqual(['at', 'kind']);
    expect(o.badges.map((b) => b.text)).toEqual(['−1']);
    expect(o.highlights.some((h) => h.kind === 'effect' && sameAt(h.at, at('D1')))).toBe(false);
  });

  test('witnessed-preview: a witnessed line is described in full and leaves no blank', () => {
    const s = sparkOnMark();
    const p = previewOf(s, sparkRight, { witnessed: new Set<LineId>(['spark:mark']) });
    expect(p.masked).toBe(false);
    expect(p.blanks).toEqual([]);
    expect(p.damage['dummy-1']).toBe(4);
    expect(p.summary).toBe(previewOf(s, sparkRight).summary);
    const o = overlayFor(s, {
      kind: 'confirm',
      unit: 'draughtsman',
      spell: '0,0',
      at: at('D1'),
      preview: p,
    });
    expect(o.highlights.some((h) => h.kind === 'blank')).toBe(false);
    expect(o.badges.map((b) => b.text)).toEqual(['−4']);
  });

  test('a masked preview with nothing else to say names the action and never "no effect"', () => {
    const s = lab(pad('S D {wall} . . .'));
    const p = previewOf(s, shoveRight, unseen);
    expect(p.summary).not.toMatch(/no effect|\?/);
    expect(p.blanks).toEqual([at('B1')]);
  });
});

describe('harm warning (D3, P42)', () => {
  test('harm-warning-unwitnessed: the party member is hurt, the cause and amount stay unsaid', () => {
    const s = lab(pad('S D {wall} . . .'));
    const p = previewOf(s, shoveRight, unseen);
    expect(p.hurt).toEqual(['draughtsman']);
    expect(p.warning).toBe('Draughtsman will be hurt');
    expect(p.summary).toBe('Shove Draughtsman right. Draughtsman will be hurt');
    expect(p.summary).not.toMatch(/\d|wall|crush/i);
    const mode = {
      kind: 'confirm',
      unit: 'stoker',
      spell: null,
      at: at('B1'),
      preview: p,
    } as const;
    expect(hintFor(mode, s)).toEqual({
      text: 'Shove Draughtsman right. Draughtsman will be hurt. Tap again or Confirm.',
      tone: 'warn',
    });
    const o = overlayFor(s, mode);
    expect(o.highlights).toContainEqual({ kind: 'hurt', at: at('B1') });
  });

  test('harm-warning-water: a drop is harm too', () => {
    const s = lab(pad('S D w> . . .'));
    const p = previewOf(s, shoveRight, unseen);
    expect(p.hurt).toEqual(['draughtsman']);
    expect(p.warning).toBe('Draughtsman will be hurt');
  });

  test('harm-warning-witnessed: the amount shows once the line is witnessed', () => {
    const s = lab(pad('S D {wall} . . .'));
    const p = previewOf(s, shoveRight, { witnessed: new Set<LineId>(['shove:wall']) });
    expect(p.masked).toBe(false);
    expect(p.hurt).toEqual(['draughtsman']);
    expect(p.summary).toMatch(
      /^Shove Draughtsman right: Draughtsman −\d+\. Draughtsman will be hurt$/,
    );
  });

  test('a foe hurt by the party is no warning', () => {
    const s = lab(pad('S r {wall} . . .'));
    const p = previewOf(s, shoveRight, unseen);
    expect(p.hurt).toEqual([]);
    expect(p.warning).toBeNull();
    expect(p.summary).not.toMatch(/hurt/);
  });
});

describe('aims (touch and vat)', () => {
  test('touch aims at yourself or any adjacent tile', () => {
    const s = lab(pad('S D . . . .'), { stoker: 'Touch> Strike' });
    const tiles = legalAims(s, 'stoker', '0,0').flatMap((a) => (a.kind === 'tile' ? [a.at] : []));
    expect(legalAims(s, 'stoker', '0,0')).toContainEqual({ kind: 'self' });
    expect(tiles).toEqual([at('B1'), at('A2')]);
    expect(aimAt(s, 'stoker', '0,0', at('A1'))).toEqual({ kind: 'self' });
    expect(aimAt(s, 'stoker', '0,0', at('B1'))).toEqual({ kind: 'tile', at: at('B1') });
    expect(aimAt(s, 'stoker', '0,0', at('C1'))).toBeNull();
  });

  test('vat: any tile within 1 anchors a 2×2 at its top-left, previewed as the whole footprint', () => {
    const s = lab(['S . . . . .', ...Array(7).fill('. . . . . .')].join('\n'), { stoker: 'Vat>' });
    expect(aimAt(s, 'stoker', '0,0', at('B2'))).toEqual({ kind: 'tile', at: at('B2') });
    expect(aimAt(s, 'stoker', '0,0', at('C1'))).toBeNull();
    const cast = (x: Coord): Action => ({
      type: 'cast',
      unit: 'stoker',
      spell: '0,0',
      aim: { kind: 'tile', at: x },
    });
    expect(previewOf(s, cast(at('B1'))).targets).toEqual([at('B1'), at('C1'), at('B2'), at('C2')]);
  });
});
