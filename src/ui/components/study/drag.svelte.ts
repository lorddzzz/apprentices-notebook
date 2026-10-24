import type { ApprenticeId } from '$data';

/**
 * Drag a shelf card onto a seat or the bench (HC-7). Pointer events only, since the HTML drag API
 * does not exist on iOS touch. A mouse drags after moving a few pixels; a finger drags after a
 * short hold (so a swipe in the bench sheet still scrolls). Drop targets carry `data-drop`:
 * `slot:<n>` or `bench`.
 */

export type DropTarget = { kind: 'slot'; slot: 0 | 1 | 2 } | { kind: 'bench' };

export interface DragState {
  id: ApprenticeId;
  x: number;
  y: number;
  over: DropTarget | null;
}

const HOLD_MS = 220;
const MOUSE_SLOP = 6;
const TOUCH_SLOP = 10;

/** The card being dragged, if any: the shelf draws its ghost and highlights the target. */
export const drag = $state<{ current: DragState | null }>({ current: null });

function targetAt(x: number, y: number): DropTarget | null {
  const el = document.elementFromPoint(x, y)?.closest<HTMLElement>('[data-drop]');
  const v = el?.dataset.drop;
  if (v === 'bench') return { kind: 'bench' };
  const m = v ? /^slot:([012])$/.exec(v) : null;
  return m ? { kind: 'slot', slot: Number(m[1]) as 0 | 1 | 2 } : null;
}

export interface DragOptions {
  id: ApprenticeId;
  ondrop: (id: ApprenticeId, target: DropTarget | null) => void;
}

/** Svelte action: makes the node a draggable card. */
export function dragCard(node: HTMLElement, options: DragOptions) {
  let opts = options;
  let pid = -1;
  let from: { x: number; y: number } | null = null;
  let touch = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let active = false;

  const stopScroll = (e: TouchEvent): void => {
    if (active && e.cancelable) e.preventDefault();
  };
  // A drag swallows the click that follows its release.
  const swallow = (e: Event): void => {
    e.stopPropagation();
    e.preventDefault();
  };

  function begin(x: number, y: number): void {
    active = true;
    clearTimeout(timer);
    try {
      node.setPointerCapture(pid);
    } catch {
      // The pointer is already gone; the window listeners still end the drag.
    }
    drag.current = { id: opts.id, x, y, over: targetAt(x, y) };
  }

  function down(e: PointerEvent): void {
    if (!e.isPrimary || (e.pointerType === 'mouse' && e.button !== 0)) return;
    pid = e.pointerId;
    from = { x: e.clientX, y: e.clientY };
    touch = e.pointerType !== 'mouse';
    active = false;
    if (touch) timer = setTimeout(() => from && begin(from.x, from.y), HOLD_MS);
    // Listen on the window so a fast pointer that leaves the card is still followed.
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', cancel);
  }

  function end(drop: boolean, e: PointerEvent): void {
    clearTimeout(timer);
    unlisten();
    const was = active;
    const target = was ? targetAt(e.clientX, e.clientY) : null;
    active = false;
    from = null;
    pid = -1;
    drag.current = null;
    if (!was) return;
    node.addEventListener('click', swallow, { capture: true, once: true });
    setTimeout(() => node.removeEventListener('click', swallow, { capture: true }), 0);
    if (drop) opts.ondrop(opts.id, target);
  }

  function move(e: PointerEvent): void {
    if (e.pointerId !== pid || !from) return;
    if (!active) {
      const far = Math.hypot(e.clientX - from.x, e.clientY - from.y);
      if (touch && far > TOUCH_SLOP) end(false, e);
      else if (!touch && far > MOUSE_SLOP) begin(e.clientX, e.clientY);
      return;
    }
    drag.current = {
      id: opts.id,
      x: e.clientX,
      y: e.clientY,
      over: targetAt(e.clientX, e.clientY),
    };
  }

  const up = (e: PointerEvent): void => {
    if (e.pointerId === pid) end(true, e);
  };
  const cancel = (e: PointerEvent): void => {
    if (e.pointerId === pid) end(false, e);
  };
  function unlisten(): void {
    window.removeEventListener('pointermove', move);
    window.removeEventListener('pointerup', up);
    window.removeEventListener('pointercancel', cancel);
  }
  const noMenu = (e: Event): void => e.preventDefault();

  node.addEventListener('pointerdown', down);
  node.addEventListener('touchmove', stopScroll, { passive: false });
  node.addEventListener('contextmenu', noMenu);

  return {
    update(next: DragOptions) {
      opts = next;
    },
    destroy() {
      clearTimeout(timer);
      if (active) drag.current = null;
      node.removeEventListener('pointerdown', down);
      unlisten();
      node.removeEventListener('touchmove', stopScroll);
      node.removeEventListener('contextmenu', noMenu);
    },
  };
}
