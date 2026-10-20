import type { Attachment } from 'svelte/attachments';
import { PAPER } from '$data/tuning';
import type { Coord } from '$engine';

export interface LatticePanOptions {
  onPan: (delta: Coord) => void;
  onTap: (point: Coord) => void;
  onHold: (point: Coord) => void;
  onCancel?: () => void;
  threshold?: number;
  holdDelay?: number;
}
interface Pointer extends Event {
  pointerId: number;
  clientX: number;
  clientY: number;
  button: number;
}
interface CaptureTarget extends EventTarget {
  setPointerCapture?: (id: number) => void;
  releasePointerCapture?: (id: number) => void;
}
/** One owner handles the entire paper, including gestures beginning over filled cells. */
export function bindLatticePan(
  el: CaptureTarget,
  options: LatticePanOptions,
  global: EventTarget = el,
): () => void {
  let active: { id: number; start: Coord; last: Coord; dragging: boolean; held: boolean } | null =
    null;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let consumeClick = false;
  const clear = (): void => {
    clearTimeout(timer);
    timer = undefined;
  };
  const release = (): void => {
    const old = active;
    active = null;
    clear();
    if (old) {
      try {
        el.releasePointerCapture?.(old.id);
      } catch {
        /* Already lost capture. */
      }
    }
  };
  const cancel = (): void => {
    if (active) {
      consumeClick = true;
      release();
      options.onCancel?.();
    }
  };
  const down = (event: Event): void => {
    const e = event as Pointer;
    if (active) {
      cancel();
      return;
    }
    if (e.button !== undefined && e.button !== 0) return;
    consumeClick = false;
    const point = { x: e.clientX, y: e.clientY };
    active = { id: e.pointerId, start: point, last: point, dragging: false, held: false };
    try {
      el.setPointerCapture?.(e.pointerId);
    } catch {
      cancel();
      return;
    }
    timer = setTimeout(() => {
      if (!active) return;
      active.held = true;
      consumeClick = true;
      options.onHold(active.start);
    }, options.holdDelay ?? PAPER.holdDelay);
  };
  const move = (event: Event): void => {
    const e = event as Pointer;
    if (!active || e.pointerId !== active.id) return;
    const point = { x: e.clientX, y: e.clientY };
    if (
      !active.dragging &&
      Math.hypot(point.x - active.start.x, point.y - active.start.y) >=
        (options.threshold ?? PAPER.dragThreshold)
    ) {
      clear();
      active.dragging = true;
      consumeClick = true;
    }
    if (active.dragging && !active.held)
      options.onPan({ x: point.x - active.last.x, y: point.y - active.last.y });
    active.last = point;
  };
  const up = (event: Event): void => {
    const e = event as Pointer;
    if (!active || active.id !== e.pointerId) return;
    move(event);
    const tap = !active.dragging && !active.held;
    const point = { x: e.clientX, y: e.clientY };
    consumeClick = true;
    release();
    if (tap) options.onTap(point);
  };
  const click = (e: Event): void => {
    if (!consumeClick || (e as MouseEvent).detail === 0) return;
    consumeClick = false;
    e.preventDefault();
    e.stopImmediatePropagation();
  };
  const context = (e: Event): void => {
    e.preventDefault();
    cancel();
  };
  const bindings: [EventTarget, string, EventListener, boolean][] = [
    [el, 'pointerdown', down, false],
    [el, 'pointermove', move, false],
    [el, 'pointerup', up, false],
    [el, 'pointercancel', cancel, false],
    [el, 'lostpointercapture', cancel, false],
    [el, 'contextmenu', context, false],
    [el, 'click', click, true],
    [global, 'blur', cancel, false],
  ];
  for (const [target, type, fn, capture] of bindings) target.addEventListener(type, fn, capture);
  return () => {
    cancel();
    for (const [target, type, fn, capture] of bindings)
      target.removeEventListener(type, fn, capture);
  };
}
export function latticePan(options: LatticePanOptions): Attachment<HTMLElement> {
  return (el) => bindLatticePan(el, options, el.ownerDocument.defaultView ?? el);
}
