import type { Attachment } from 'svelte/attachments';

export interface LongpressOptions {
  /** Hold time before the callback fires. */
  ms?: number;
  /** Movement in px that cancels the hold. */
  slop?: number;
}

interface PointerLike {
  clientX: number;
  clientY: number;
}

/**
 * Wires a long-press onto any event target. Returns the cleanup.
 * After a long-press fires, the click that follows the release is swallowed so the
 * element's normal tap handler doesn't also run.
 */
export function bindLongpress(
  el: EventTarget,
  cb: () => void,
  { ms = 450, slop = 10 }: LongpressOptions = {},
): () => void {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let startX = 0;
  let startY = 0;
  let swallowClick = false;

  const clear = (): void => {
    if (timer !== null) clearTimeout(timer);
    timer = null;
  };
  const onDown = (e: Event): void => {
    const p = e as unknown as PointerLike;
    swallowClick = false;
    startX = p.clientX;
    startY = p.clientY;
    clear();
    timer = setTimeout(() => {
      timer = null;
      swallowClick = true;
      cb();
    }, ms);
  };
  const onMove = (e: Event): void => {
    if (timer === null) return;
    const p = e as unknown as PointerLike;
    if (Math.hypot(p.clientX - startX, p.clientY - startY) > slop) clear();
  };
  const onClick = (e: Event): void => {
    if (!swallowClick) return;
    swallowClick = false;
    e.stopPropagation();
    e.preventDefault();
  };
  const onContext = (e: Event): void => e.preventDefault();

  el.addEventListener('pointerdown', onDown);
  el.addEventListener('pointermove', onMove);
  el.addEventListener('pointerup', clear);
  el.addEventListener('pointercancel', clear);
  el.addEventListener('pointerleave', clear);
  el.addEventListener('click', onClick, true);
  el.addEventListener('contextmenu', onContext);
  return () => {
    clear();
    el.removeEventListener('pointerdown', onDown);
    el.removeEventListener('pointermove', onMove);
    el.removeEventListener('pointerup', clear);
    el.removeEventListener('pointercancel', clear);
    el.removeEventListener('pointerleave', clear);
    el.removeEventListener('click', onClick, true);
    el.removeEventListener('contextmenu', onContext);
  };
}

/** `<button {@attach longpress(() => remove(at))}>` */
export function longpress(cb: () => void, options?: LongpressOptions): Attachment<HTMLElement> {
  return (el) => bindLongpress(el, cb, options);
}
