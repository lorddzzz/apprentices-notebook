import { describe, expect, test } from 'vitest';
import {
  editAt,
  editCell,
  forgetView,
  framePage,
  panView,
  rememberView,
  renderedCells,
  screenToCell,
  sessionView,
  visibleWindow,
  worldToScreen,
} from '../../src/app/latticeViewport';
import { PAPER } from '../../src/data/tuning';
import { MAX_LATTICE_COORD } from '../../src/engine/grid';

const size = { width: 375, height: 300 };

describe('growing paper camera', () => {
  test('empty page frames five cells at readable edit scale', () => {
    const view = framePage([], size);
    expect(view.pitch).toBe(PAPER.editPitch);
    expect(screenToCell(view, { x: 187.5, y: 150 })).toEqual({ x: 0, y: 0 });
    expect(renderedCells(view, size, []).length).toBeLessThan(100);
  });
  test('signed cells roundtrip and pan preserves camera precision', () => {
    const view = framePage([{ x: -12, y: -9 }], size);
    const at = { x: -12, y: -9 };
    const start = worldToScreen(view, at);
    expect(screenToCell(view, { x: start.x + 30, y: start.y + 30 })).toEqual(at);
    const moved = panView(view, { x: 130, y: -80 });
    expect(worldToScreen(moved, at)).toEqual({ x: start.x + 130, y: start.y - 80 });
    expect(Math.abs(moved.offset.x)).toBeLessThan(60);
  });
  test('ordinary growth, erasure and resize reuse the same transform', () => {
    const view = framePage([{ x: -2, y: 3 }], size);
    const at = { x: -2, y: 3 };
    const before = worldToScreen(view, at);
    rememberView('edits', view);
    expect(sessionView('edits', [{ x: -100, y: 100 }], size)).toEqual(view);
    expect(sessionView('edits', [], { width: 800, height: 200 })).toEqual(view);
    expect(worldToScreen(view, at)).toEqual(before);
    forgetView('edits');
    expect(sessionView('edits', [], size)).not.toEqual(view);
  });
  test('Fit frames current sparse occupied bounds, respecting aspect ratio', () => {
    const cells = [
      { x: -1000000, y: -10 },
      { x: 1000000, y: 10 },
    ] as const;
    const fit = framePage(cells, size, true);
    expect(fit.mode).toBe('fit');
    expect(fit.pitch).toBeLessThan(0.001);
    expect(renderedCells(fit, size, cells)).toHaveLength(2);
    for (const at of cells) {
      const p = worldToScreen(fit, at);
      expect(p.x).toBeGreaterThanOrEqual(0);
      expect(p.x + fit.pitch).toBeLessThanOrEqual(size.width);
      expect(p.y).toBeGreaterThanOrEqual(0);
    }
    expect(framePage([cells[0]], size, true).pitch).toBe(60);
    const p = worldToScreen(fit, cells[0]);
    const returned = editAt(fit, { x: p.x + fit.pitch / 2, y: p.y + fit.pitch / 2 }, size);
    expect(returned.mode).toBe('edit');
    expect(returned.pitch).toBe(60);
    expect(returned.anchor).toEqual(cells[0]);
  });
  test.each([-MAX_LATTICE_COORD, MAX_LATTICE_COORD])(
    'visible windows clamp coordinate edge %s',
    (n) => {
      const view = framePage([{ x: n, y: n }], size);
      const window = visibleWindow(view, size);
      expect(window.origin.x).toBeGreaterThanOrEqual(-MAX_LATTICE_COORD);
      expect(window.origin.x + window.width - 1).toBeLessThanOrEqual(MAX_LATTICE_COORD);
      expect(renderedCells(view, size, []).length).toBeLessThan(100);
    },
  );
});

test('initial wide sparse editing view contains a real occupied region', () => {
  const cells = [
    { x: -1000000, y: -10 },
    { x: 1000000, y: 10 },
  ] as const;
  const view = framePage(cells, size);
  expect(renderedCells(view, size, cells)).toContainEqual(cells[0]);
});

test('Fit miniatures sharing pixels stay viewport bounded without changing placements', () => {
  const occupied = Array.from({ length: 10000 }, (_, x) => ({ x, y: 0 }));
  const original = structuredClone(occupied);
  const fit = framePage(occupied, size, true);
  const miniatures = renderedCells(fit, size, occupied);
  expect(miniatures.length).toBeLessThanOrEqual(Math.ceil(size.width));
  expect(miniatures.length).toBeGreaterThan(300);
  expect(occupied).toEqual(original);
  const edit = editAt(fit, { x: size.width / 2, y: size.height / 2 }, size);
  const window = renderedCells(edit, size, occupied);
  expect(window.filter((at) => at.y === 0).length).toBeGreaterThan(5);
});

test('Fit reserves CSS inset so minimum-size markers are fully visible', () => {
  const occupied = [
    { x: -1000000, y: 0 },
    { x: 1000000, y: 0 },
  ];
  const fit = framePage(occupied, size, true);
  for (const at of occupied) {
    const p = worldToScreen(fit, at);
    expect(p.x + fit.pitch / 2 - PAPER.fitMarkerSize / 2).toBeGreaterThanOrEqual(0);
    expect(p.x + fit.pitch / 2 + PAPER.fitMarkerSize / 2).toBeLessThanOrEqual(size.width);
  }
});

test('known miniature and keyboard targets avoid subpixel coordinate loss', () => {
  const at = { x: -MAX_LATTICE_COORD, y: -MAX_LATTICE_COORD };
  const fit = framePage([at, { x: MAX_LATTICE_COORD, y: MAX_LATTICE_COORD }], size, true);
  const p = worldToScreen(fit, at);
  const quantized = { x: Math.round(p.x + fit.pitch / 2), y: Math.round(p.y + fit.pitch / 2) };
  expect(editAt(fit, quantized, size).anchor).not.toEqual(at);
  const known = editCell(at, size);
  expect(known.anchor).toEqual(at);
  expect(known.pitch).toBe(PAPER.editPitch);
  expect(worldToScreen(known, at)).toEqual({
    x: (size.width - PAPER.editPitch) / 2,
    y: (size.height - PAPER.editPitch) / 2,
  });
});
