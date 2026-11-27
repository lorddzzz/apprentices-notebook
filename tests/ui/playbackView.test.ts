import type { Component } from 'svelte';
import { render } from 'svelte/server';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { BattleSession } from '../../src/app/battle.svelte';
import { FIXTURES } from '../../src/app/dev/fixtures';
import type { Fx } from '../../src/app/fx';
import { go } from '../../src/app/router.svelte';
import BeatCard from '../../src/ui/components/battle/BeatCard.svelte';
import Readout from '../../src/ui/components/battle/Readout.svelte';
import { fxRate, spriteIdOf } from '../../src/ui/components/board/fxSprites';
import StepMarkerLayer from '../../src/ui/components/board/StepMarkerLayer.svelte';
import { battleOf, CAST_BOARD } from '../app/battleFixtures';

const html = (c: Component<never>, props: Record<string, unknown>): string =>
  render(c as unknown as Component<Record<string, unknown>>, { props }).body;
const noop = () => {};

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

test('markers render in log order', () => {
  const out = html(StepMarkerLayer, {
    markers: [
      { n: 1, at: { x: 0, y: 0 }, first: false },
      { n: 2, at: { x: 2, y: 0 }, first: false },
      { n: 3, at: { x: 0, y: 0 }, first: true },
    ],
  });
  expect([...out.matchAll(/data-marker="(\d+)"/g)].map((m) => m[1])).toEqual(['1', '2', '3']);
  // 1 and 3 share a cell: they stack side by side (slots 0 and 1); 3 is the gold variant.
  expect([...out.matchAll(/data-slot="(\d+)"/g)].map((m) => m[1])).toEqual(['0', '0', '1']);
  expect(out.match(/class="[^"]*\bgold\b[^"]*" data-marker/g)).toHaveLength(1);
  expect(html(StepMarkerLayer, { markers: [] })).not.toContain('data-marker');
});

test('fight-chain frozen at shown ordinal 3 shows markers 1 to 3 and the readout', async () => {
  go('lab', { step: '3' }, { replace: true });
  try {
    const session = new BattleSession({ state: battleOf(CAST_BOARD), events: [] }, 'lab', {});
    const done = session.dispatch({
      type: 'cast',
      unit: 'draughtsman',
      spell: '0,1',
      aim: { kind: 'dir', dir: 'right' },
    });
    vi.runAllTimers();
    expect(session.readout?.n).toBe(3);
    const ns = session.markers.map((m) => m.n);
    expect(ns.length).toBeGreaterThan(0);
    expect(ns).toEqual([...ns].sort((a, b) => a - b));
    expect(Math.max(...ns)).toBeLessThanOrEqual(3);
    expect(session.logLine).toBe(session.readout?.text);
    session.skip();
    await done;
    expect(session.markers).toEqual([]);
    expect(session.fx).toEqual([]);
  } finally {
    go('lab', {}, { replace: true });
  }
});

test('the readout says "Step n of N · cause" and renders nothing without one', () => {
  const out = html(Readout, {
    readout: { n: 2, total: 5, text: 'Bolt lands at C1' },
    onspeedup: noop,
  });
  expect(out).toContain('data-testid="readout"');
  expect(out.replace(/<!--.*?-->/g, '')).toContain('Step 2 of 5 · Bolt lands at C1');
  expect(html(Readout, { readout: null, onspeedup: noop })).not.toContain('readout');
});

test('the beat card: plain burst, gold first, nothing at rest', () => {
  const props = { onspeedup: noop, onskip: noop };
  const burst = html(BeatCard, { ...props, beat: { kind: 'burst', name: 'Fire', first: false } });
  expect(burst).toContain('data-testid="beat-card"');
  expect(burst).toContain('data-first="false"');
  expect(burst).toContain('Fire');
  expect(burst).toContain('data-testid="beat-skip"');
  expect(burst).not.toContain('First time');
  const first = html(BeatCard, { ...props, beat: { kind: 'burst', name: 'Fire', first: true } });
  expect(first).toContain('data-first="true"');
  expect(first).toContain('First time');
  expect(html(BeatCard, { ...props, beat: null })).not.toContain('beat-card');
});

test('FX sprites use the registry ids; unshipped art falls back to the vector', () => {
  const at = { x: 1, y: 1 };
  const fx = (f: Fx) => spriteIdOf(f);
  expect(fx({ kind: 'pulse', at, tone: 'fire' })).toBe('props/shared/fx-fire');
  expect(fx({ kind: 'crush', at, tone: 'brass' })).toBe('props/shared/fx-impact');
  expect(fx({ kind: 'splat', at, tone: 'ink' })).toBe('props/shared/fx-ink-splash');
  expect(fx({ kind: 'pulse', at, tone: 'shield' })).toBe('props/shared/fx-shield-pulse');
  expect(fx({ kind: 'pulse', at, tone: 'danger' })).toBeNull();
  expect(fx({ kind: 'banner', text: 'x' })).toBeNull();
});

test('FX run on the shared scale: Quick over the playback speed', () => {
  expect(fxRate(1, 1)).toBe(1);
  expect(fxRate(0.5, 1)).toBe(0.5);
  expect(fxRate(1, 4)).toBe(0.25);
  expect(fxRate(0.5, 2)).toBe(0.25);
});

test('rendered FX are cleared at rest: the layer is mounted only while a chain plays', async () => {
  const { default: BattleBoard } = await import('../../src/ui/components/board/BattleBoard.svelte');
  const session = new BattleSession({ state: battleOf(CAST_BOARD), events: [] }, 'lab', {});
  const board = (active: boolean) =>
    html(BattleBoard, {
      view: session.view,
      overlay: session.overlay,
      fx: [],
      fxKey: 0,
      playbackActive: active,
    });
  expect(board(true)).toContain('data-testid="fx"');
  expect(board(false)).not.toContain('data-testid="fx"');
  const done = session.dispatch({
    type: 'cast',
    unit: 'draughtsman',
    spell: '0,1',
    aim: { kind: 'dir', dir: 'right' },
  });
  expect(session.busy).toBe(true);
  session.skip();
  await done;
  expect(session.busy).toBe(false);
  expect(session.fx).toEqual([]);
  expect(session.markers).toEqual([]);
  expect(vi.getTimerCount()).toBe(0);
});

test('the playback fixtures are registered', () => {
  for (const id of ['fight-chain', 'fight-burst-beat', 'fight-first-beat'] as const) {
    expect(FIXTURES[id].route).toBe('lab');
    expect(FIXTURES[id].params?.step).toMatch(/^\d+$/);
  }
});
