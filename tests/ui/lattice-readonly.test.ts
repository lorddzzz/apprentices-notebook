import { render } from 'svelte/server';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import type { MemberId } from '$data';
import { compileLattice, newProfile, parseLattice } from '$engine';
import { framePage, panView, type ViewTransform } from '../../src/app/latticeViewport';
import { profileShelf } from '../../src/app/study';
import { bindLatticePan } from '../../src/ui/attach/latticePan';
import LatticeEditor from '../../src/ui/components/lattice/LatticeEditor.svelte';
import { latticeGestures } from '../../src/ui/components/lattice/latticeGestures';

/** UH-3: a read-only page ignores tap, hold and keyboard activation but still pans and zooms. */

const pointer = (type: string, x = 0, y = 0, id = 1): Event =>
  Object.assign(new Event(type, { cancelable: true }), {
    clientX: x,
    clientY: y,
    pointerId: id,
    button: 0,
  });
const key = (): Event => Object.assign(new Event('click', { cancelable: true }), { detail: 0 });

const size = { width: 355, height: 300 };

function rig(readonly: boolean, start?: ViewTransform) {
  let view: ViewTransform = start ?? framePage([], size);
  const onCellTap = vi.fn();
  const onCellHold = vi.fn();
  const gestures = latticeGestures({
    readonly: () => readonly,
    view: () => view,
    size: () => size,
    update: (next) => {
      view = next;
    },
    point: (client) => client,
    hit: () => '3,4',
    onCellTap,
    onCellHold,
  });
  const el = Object.assign(new EventTarget(), {
    setPointerCapture: vi.fn(),
    releasePointerCapture: vi.fn(),
  });
  bindLatticePan(el, gestures.options, new EventTarget());
  return { el, gestures, onCellTap, onCellHold, view: () => view };
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('the paper handlers', () => {
  test('editable: tap, hold and keyboard activation reach the socket', () => {
    const r = rig(false);
    r.el.dispatchEvent(pointer('pointerdown', 100, 100));
    r.el.dispatchEvent(pointer('pointerup', 100, 100));
    expect(r.onCellTap).toHaveBeenCalledTimes(1);
    r.el.dispatchEvent(pointer('pointerdown', 100, 100));
    vi.advanceTimersByTime(900);
    expect(r.onCellHold).toHaveBeenCalledTimes(1);
    r.el.dispatchEvent(pointer('pointerup', 100, 100));
    r.gestures.activate({ x: 1, y: 1 });
    expect(r.onCellTap).toHaveBeenCalledTimes(2);
  });

  test('read-only: tap, hold and keyboard activation do nothing', () => {
    const r = rig(true);
    r.el.dispatchEvent(pointer('pointerdown', 100, 100));
    r.el.dispatchEvent(pointer('pointerup', 100, 100));
    r.el.dispatchEvent(pointer('pointerdown', 100, 100));
    vi.advanceTimersByTime(900);
    r.el.dispatchEvent(pointer('pointerup', 100, 100));
    r.gestures.activate({ x: 1, y: 1 });
    r.el.dispatchEvent(key());
    expect(r.onCellTap).not.toHaveBeenCalled();
    expect(r.onCellHold).not.toHaveBeenCalled();
  });

  test('read-only: a single-pointer drag still pans, and Fit mode still zooms to a region', () => {
    const r = rig(true);
    const before = r.view();
    r.el.dispatchEvent(pointer('pointerdown', 100, 100));
    r.el.dispatchEvent(pointer('pointermove', 140, 120));
    r.el.dispatchEvent(pointer('pointerup', 140, 120));
    expect(r.view()).toEqual(panView(before, { x: 40, y: 20 }));
    expect(r.onCellTap).not.toHaveBeenCalled();
  });

  test('read-only: a tap on the overview zooms to that region instead of touching a socket', () => {
    const wide = framePage(
      [
        { x: -20, y: -20 },
        { x: 20, y: 20 },
      ],
      size,
      true,
    );
    expect(wide.mode).toBe('fit');
    const r = rig(true, wide);
    r.el.dispatchEvent(pointer('pointerdown', 100, 100));
    r.el.dispatchEvent(pointer('pointerup', 100, 100));
    expect(r.view().mode).toBe('edit');
    expect(r.onCellTap).not.toHaveBeenCalled();
  });
});

describe('LatticeEditor readonly', () => {
  const profile = newProfile();
  const member: MemberId = 'draughtsman';
  const base = {
    sessionKey: 'pocket-test',
    lattice: parseLattice('Bolt> Ink Spark'),
    compiled: compileLattice(parseLattice('Bolt> Ink Spark')),
    capacity: 8,
    slots: profileShelf(profile, member),
    tool: { kind: 'none' } as const,
    ontool: () => {},
    onsocket: () => {},
    member,
    members: [member],
    onmember: () => {},
    fair: {
      available: true,
      active: false,
      glow: new Set<string>(),
      selected: new Set<string>(),
      ontoggle: () => {},
      ontap: () => {},
    },
    household: { more: 1, onmore: () => {}, visiting: new Set<MemberId>() },
  };

  test('hides the shelf, drawer, Fair copy and ink pot; keeps page, seat tabs and strip', () => {
    const open = render(LatticeEditor, { props: base }).body;
    expect(open).toContain('data-testid="drawer-pull"');
    expect(open).toContain('data-testid="fair-mode"');
    const ro = render(LatticeEditor, { props: { ...base, readonly: true } }).body;
    for (const id of ['drawer-pull', 'shelf', 'fair-mode', 'tab-runes', 'erase']) {
      expect(ro).not.toContain(`data-testid="${id}"`);
    }
    expect(ro).not.toContain('class="inkfloat');
    for (const id of ['editor', 'info', 'lattice-viewport', 'household-open']) {
      expect(ro).toContain(`data-testid="${id}"`);
    }
    expect(ro).toContain('role="tab"');
  });
});
