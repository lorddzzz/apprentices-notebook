import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { bindLongpress } from '../../src/ui/attach/longpress';

type Pointer = Event & { clientX: number; clientY: number };
const pointer = (type: string, x = 0, y = 0): Pointer =>
  Object.assign(new Event(type, { cancelable: true }), { clientX: x, clientY: y });

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

test('fires after the hold time', () => {
  const el = new EventTarget();
  const cb = vi.fn();
  bindLongpress(el, cb);
  el.dispatchEvent(pointer('pointerdown'));
  vi.advanceTimersByTime(449);
  expect(cb).not.toHaveBeenCalled();
  vi.advanceTimersByTime(2);
  expect(cb).toHaveBeenCalledTimes(1);
});

test('releasing early cancels', () => {
  const el = new EventTarget();
  const cb = vi.fn();
  bindLongpress(el, cb);
  el.dispatchEvent(pointer('pointerdown'));
  vi.advanceTimersByTime(300);
  el.dispatchEvent(pointer('pointerup'));
  vi.advanceTimersByTime(500);
  expect(cb).not.toHaveBeenCalled();
});

test('moving more than the slop cancels; small jitter does not', () => {
  const el = new EventTarget();
  const cb = vi.fn();
  bindLongpress(el, cb);
  el.dispatchEvent(pointer('pointerdown', 100, 100));
  el.dispatchEvent(pointer('pointermove', 105, 104));
  vi.advanceTimersByTime(500);
  expect(cb).toHaveBeenCalledTimes(1);

  el.dispatchEvent(pointer('pointerdown', 100, 100));
  el.dispatchEvent(pointer('pointermove', 100, 115));
  vi.advanceTimersByTime(500);
  expect(cb).toHaveBeenCalledTimes(1);
});

test('the click after a long-press is swallowed once', () => {
  const el = new EventTarget();
  bindLongpress(el, () => {});
  const taps = vi.fn();
  el.addEventListener('click', taps); // bubbling stand-in for Svelte's delegated handler
  el.dispatchEvent(pointer('pointerdown'));
  vi.advanceTimersByTime(500);
  el.dispatchEvent(pointer('pointerup'));
  const first = new Event('click', { cancelable: true });
  el.dispatchEvent(first);
  expect(first.defaultPrevented).toBe(true);
  const second = new Event('click', { cancelable: true });
  el.dispatchEvent(second);
  expect(second.defaultPrevented).toBe(false);
});

test('a plain tap is not swallowed', () => {
  const el = new EventTarget();
  bindLongpress(el, () => {});
  el.dispatchEvent(pointer('pointerdown'));
  vi.advanceTimersByTime(100);
  el.dispatchEvent(pointer('pointerup'));
  const click = new Event('click', { cancelable: true });
  el.dispatchEvent(click);
  expect(click.defaultPrevented).toBe(false);
});

test('cleanup removes the listeners', () => {
  const el = new EventTarget();
  const cb = vi.fn();
  const off = bindLongpress(el, cb);
  off();
  el.dispatchEvent(pointer('pointerdown'));
  vi.advanceTimersByTime(600);
  expect(cb).not.toHaveBeenCalled();
});
