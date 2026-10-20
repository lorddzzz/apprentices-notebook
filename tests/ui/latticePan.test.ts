import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { bindLatticePan } from '../../src/ui/attach/latticePan';

const pointer = (type: string, x = 0, y = 0, id = 1): Event =>
  Object.assign(new Event(type, { cancelable: true }), {
    clientX: x,
    clientY: y,
    pointerId: id,
    button: 0,
  });
function setup() {
  const el = Object.assign(new EventTarget(), {
    setPointerCapture: vi.fn(),
    releasePointerCapture: vi.fn(),
  });
  const global = new EventTarget();
  const options = { onPan: vi.fn(), onTap: vi.fn(), onHold: vi.fn(), onCancel: vi.fn() };
  const off = bindLatticePan(el, options, global);
  return { el, global, options, off };
}
beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());
test('tap tolerates jitter and dispatches once on release, with capture', () => {
  const { el, options } = setup();
  el.dispatchEvent(pointer('pointerdown', 20, 20));
  el.dispatchEvent(pointer('pointermove', 23, 24));
  el.dispatchEvent(pointer('pointerup', 23, 24));
  vi.advanceTimersByTime(500);
  expect(options.onTap).toHaveBeenCalledExactlyOnceWith({ x: 23, y: 24 });
  expect(options.onHold).not.toHaveBeenCalled();
  expect(el.setPointerCapture).toHaveBeenCalledWith(1);
  expect(el.releasePointerCapture).toHaveBeenCalledWith(1);
});
test.each(['filled rune', 'empty paper'])(
  'drag over %s cancels hold, consumes click and never taps',
  () => {
    const { el, options } = setup();
    el.dispatchEvent(pointer('pointerdown'));
    el.dispatchEvent(pointer('pointermove', 10, 0));
    vi.advanceTimersByTime(600);
    el.dispatchEvent(pointer('pointermove', 30, 5));
    el.dispatchEvent(pointer('pointerup', 1000, 5));
    expect(options.onPan).toHaveBeenCalledWith({ x: 10, y: 0 });
    expect(options.onTap).not.toHaveBeenCalled();
    expect(options.onHold).not.toHaveBeenCalled();
    const click = Object.assign(new Event('click', { cancelable: true }), { detail: 1 });
    el.dispatchEvent(click);
    expect(click.defaultPrevented).toBe(true);
    const keyboard = Object.assign(new Event('click', { cancelable: true }), { detail: 0 });
    el.dispatchEvent(keyboard);
    expect(keyboard.defaultPrevented).toBe(false);
  },
);
test('release outside without a move event still cancels tap', () => {
  const { el, options } = setup();
  el.dispatchEvent(pointer('pointerdown'));
  el.dispatchEvent(pointer('pointerup', 400, 400));
  expect(options.onTap).not.toHaveBeenCalled();
});
test('completed hold never also taps or pans', () => {
  const { el, options } = setup();
  el.dispatchEvent(pointer('pointerdown', 22, 33));
  vi.advanceTimersByTime(450);
  el.dispatchEvent(pointer('pointermove', 90, 90));
  el.dispatchEvent(pointer('pointerup', 90, 90));
  expect(options.onHold).toHaveBeenCalledExactlyOnceWith({ x: 22, y: 33 });
  expect(options.onTap).not.toHaveBeenCalled();
  expect(options.onPan).not.toHaveBeenCalled();
});
test.each([
  'pointercancel',
  'lostpointercapture',
  'contextmenu',
  'blur',
  'second pointer',
  'unmount',
])('%s cancels all pending work', (type) => {
  const { el, global, options, off } = setup();
  el.dispatchEvent(pointer('pointerdown'));
  if (type === 'blur') global.dispatchEvent(new Event('blur'));
  else if (type === 'second pointer') el.dispatchEvent(pointer('pointerdown', 10, 10, 2));
  else if (type === 'unmount') off();
  else el.dispatchEvent(pointer(type));
  vi.advanceTimersByTime(1000);
  el.dispatchEvent(pointer('pointerup'));
  expect(options.onCancel).toHaveBeenCalledTimes(1);
  expect(options.onTap).not.toHaveBeenCalled();
  expect(options.onHold).not.toHaveBeenCalled();
});
test('teardown removes listeners and a new gesture works after cancel', () => {
  const { el, options, off } = setup();
  el.dispatchEvent(pointer('pointerdown'));
  el.dispatchEvent(pointer('pointercancel'));
  el.dispatchEvent(pointer('pointerdown'));
  el.dispatchEvent(pointer('pointerup'));
  expect(options.onTap).toHaveBeenCalledTimes(1);
  off();
  el.dispatchEvent(pointer('pointerdown'));
  vi.advanceTimersByTime(1000);
  expect(options.onHold).not.toHaveBeenCalled();
});
