import { PAPER } from '$data/tuning';
import { type Coord, MAX_LATTICE_COORD } from '$engine/grid';
import { type CellBounds, cellsInWindow, pageBounds } from '$engine/page';

export interface ViewSize {
  width: number;
  height: number;
}
export interface ViewTransform {
  anchor: Coord;
  offset: Coord;
  pitch: number;
  mode: 'edit' | 'fit';
}
const sessions = new Map<string, { view: ViewTransform; size?: ViewSize }>();
const clamp = (n: number): number => Math.max(-MAX_LATTICE_COORD, Math.min(MAX_LATTICE_COORD, n));
export function worldToScreen(view: ViewTransform, at: Coord): Coord {
  return {
    x: (at.x - view.anchor.x) * view.pitch + view.offset.x,
    y: (at.y - view.anchor.y) * view.pitch + view.offset.y,
  };
}
/** Overscan and partially clipped targets remain pointer accessible but never attract Tab focus. */
export function cellTabStop(view: ViewTransform, at: Coord, size: ViewSize): boolean {
  const p = worldToScreen(view, at);
  const target = view.mode === 'fit' ? Math.max(PAPER.fitMarkerSize, view.pitch) : view.pitch;
  const x = p.x + (view.pitch - target) / 2;
  const y = p.y + (view.pitch - target) / 2;
  return x >= 0 && y >= 0 && x + target <= size.width && y + target <= size.height;
}
export function screenToCell(view: ViewTransform, point: Coord): Coord {
  return {
    x: clamp(view.anchor.x + Math.floor((point.x - view.offset.x) / view.pitch)),
    y: clamp(view.anchor.y + Math.floor((point.y - view.offset.y) / view.pitch)),
  };
}
export function framePage(cells: readonly Coord[], size: ViewSize, fit = false): ViewTransform {
  const b = pageBounds(cells);
  if (
    !fit &&
    cells.length > 0 &&
    (b.width * PAPER.editPitch > size.width || b.height * PAPER.editPitch > size.height)
  ) {
    const first = cells.reduce((a, c) => (c.y < a.y || (c.y === a.y && c.x < a.x) ? c : a));
    return {
      anchor: first,
      offset: { x: (size.width - PAPER.editPitch) / 2, y: (size.height - PAPER.editPitch) / 2 },
      pitch: PAPER.editPitch,
      mode: 'edit',
    };
  }
  const pitch = fit
    ? Math.min(
        PAPER.editPitch,
        Math.max(1, size.width - 2 * PAPER.fitInset) / b.width,
        Math.max(1, size.height - 2 * PAPER.fitInset) / b.height,
      )
    : PAPER.editPitch;
  return {
    anchor: {
      x: clamp(b.origin.x + Math.floor(b.width / 2)),
      y: clamp(b.origin.y + Math.floor(b.height / 2)),
    },
    offset: {
      x: size.width / 2 - ((b.width % 2) * pitch) / 2,
      y: size.height / 2 - ((b.height % 2) * pitch) / 2,
    },
    pitch,
    mode: fit && pitch < PAPER.editPitch ? 'fit' : 'edit',
  };
}
export function editAt(view: ViewTransform, point: Coord, size: ViewSize): ViewTransform {
  return editCell(screenToCell(view, point), size);
}
/** Known miniature/keyboard targets retain exact coordinates at arbitrarily small Fit scales. */
export function editCell(at: Coord, size: ViewSize): ViewTransform {
  return {
    anchor: at,
    offset: { x: (size.width - PAPER.editPitch) / 2, y: (size.height - PAPER.editPitch) / 2 },
    pitch: PAPER.editPitch,
    mode: 'edit',
  };
}
export function panView(view: ViewTransform, delta: Coord): ViewTransform {
  const offset = { x: view.offset.x + delta.x, y: view.offset.y + delta.y };
  // Rebase only the disposable camera; CSS values stay near the viewport.
  const dx = Math.trunc(offset.x / view.pitch);
  const dy = Math.trunc(offset.y / view.pitch);
  const anchor = { x: clamp(view.anchor.x - dx), y: clamp(view.anchor.y - dy) };
  return {
    ...view,
    anchor,
    offset: {
      x: offset.x - (view.anchor.x - anchor.x) * view.pitch,
      y: offset.y - (view.anchor.y - anchor.y) * view.pitch,
    },
  };
}
export function resizeView(view: ViewTransform, previous: ViewSize, size: ViewSize): ViewTransform {
  return panView(view, {
    x: (size.width - previous.width) / 2,
    y: (size.height - previous.height) / 2,
  });
}
export function visibleWindow(view: ViewTransform, size: ViewSize): CellBounds {
  const a = screenToCell(view, { x: 0, y: 0 });
  const b = screenToCell(view, { x: size.width, y: size.height });
  const origin = { x: clamp(a.x - PAPER.overscan), y: clamp(a.y - PAPER.overscan) };
  return {
    origin,
    width: clamp(b.x + PAPER.overscan) - origin.x + 1,
    height: clamp(b.y + PAPER.overscan) - origin.y + 1,
  };
}
export function renderedCells(
  view: ViewTransform,
  size: ViewSize,
  occupied: readonly Coord[],
): Coord[] {
  if (view.mode === 'fit') {
    const pixels = new Map<string, Coord>();
    for (const at of occupied) {
      const p = worldToScreen(view, at);
      if (p.x + view.pitch < 0 || p.y + view.pitch < 0 || p.x > size.width || p.y > size.height)
        continue;
      // Miniatures sharing a CSS pixel are visually indistinguishable. This affects only
      // overview drawing; the complete region reappears on return to editing scale.
      const x = Math.floor(Math.max(0, Math.min(Math.ceil(size.width) - 1, p.x + view.pitch / 2)));
      const y = Math.floor(Math.max(0, Math.min(Math.ceil(size.height) - 1, p.y + view.pitch / 2)));
      const pixel = `${x},${y}`;
      if (!pixels.has(pixel)) pixels.set(pixel, at);
    }
    return [...pixels.values()];
  }
  const budget =
    (Math.ceil(size.width / PAPER.editPitch) + 4) * (Math.ceil(size.height / PAPER.editPitch) + 4);
  return [...cellsInWindow(visibleWindow(view, size), budget)];
}
export function sessionView(
  sessionKey: string,
  cells: readonly Coord[],
  size: ViewSize,
): ViewTransform {
  const saved = sessions.get(sessionKey);
  if (!saved) return framePage(cells, size);
  if (!saved.size || (saved.size.width === size.width && saved.size.height === size.height))
    return saved.view;
  return saved.view.mode === 'fit'
    ? framePage(cells, size, true)
    : resizeView(saved.view, saved.size, size);
}
export function rememberView(sessionKey: string, view: ViewTransform, size?: ViewSize): void {
  sessions.set(sessionKey, { view, size });
}
/** Call only for explicit reset/import/new-session boundaries, never for edits. */
export function forgetView(sessionKey: string): void {
  sessions.delete(sessionKey);
}
