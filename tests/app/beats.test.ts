import { afterEach, expect, test, vi } from 'vitest';
import type { GameEvent } from '$engine';
import { BattleSession } from '../../src/app/battle.svelte';
import { beatOf, type KnowledgeSnapshot } from '../../src/app/beats';
import { projectBatch } from '../../src/app/playback';
import { toasts } from '../../src/app/toasts.svelte';
import { at, battleOf, CAST_BOARD } from './battleFixtures';
import { plainBoard } from './viewFixtures';

const start = plainBoard(6, 2);
const unknown: KnowledgeSnapshot = { named: new Set(), witnessed: new Set() };
const burst = {
  type: 'burst',
  burst: 'fire',
  at: at('B1'),
  tiles: [at('B1'), at('C1'), at('B2')],
  units: [],
} satisfies GameEvent;
const compound = { type: 'mixed', compound: 'stain', at: at('B1') } satisfies GameEvent;
const mark = { type: 'named', what: 'compound', id: 'stain' } satisfies GameEvent;
const oil = { type: 'landed', kind: 'oil', at: at('B1'), makes: 'slick' } satisfies GameEvent;
const stain = { ...compound, line: 'ink:slick' } satisfies GameEvent;
const cast = {
  type: 'cast',
  unit: 'draughtsman',
  spell: '0,1',
  aim: { kind: 'dir', dir: 'right' },
} as const;
const stainBoard = ['D . . . o .', '. . . d . .'].join('\n');

afterEach(() => {
  vi.useRealTimers();
  toasts.items = [];
});

test('beat classifies burst compound first ordinary', () => {
  expect(beatOf(burst, unknown).kind).toBe('burst');
  expect(beatOf(compound, unknown).kind).toBe('compound');
  expect(beatOf({ ...oil, line: 'ink:slick' }, unknown).kind).toBe('first');
  expect(beatOf(oil, unknown).kind).toBe('ordinary');
});

test('snapshot is taken before dispatch appends', async () => {
  const named: string[] = [];
  const session = new BattleSession({ state: battleOf(stainBoard), events: [] }, 'trip', {
    named,
    witnessed: [],
    onEvents(events) {
      expect(session.log).toEqual(events);
      named.push('compound:stain');
    },
  });
  const done = session.dispatch(cast);
  expect(session.projectedLog.find((step) => step.event.type === 'mixed')?.first).toEqual([
    { kind: 'named', id: 'compound:stain' },
    { kind: 'line', id: 'ink:slick' },
  ]);
  session.skip();
  await done;
});

test('named discovery and witnessed line are distinct', () => {
  const events = [mark, stain];
  expect(projectBatch(start, events, unknown).shown[0]?.first).toEqual([
    { kind: 'named', id: 'compound:stain' },
    { kind: 'line', id: 'ink:slick' },
  ]);
  const knownNamed = { ...unknown, named: new Set(['compound:stain']) };
  expect(projectBatch(start, events, knownNamed).shown[0]?.first).toEqual([
    { kind: 'line', id: 'ink:slick' },
  ]);
  const knownLine = { ...unknown, witnessed: new Set(['ink:slick'] as const) };
  expect(projectBatch(start, events, knownLine).shown[0]?.first).toEqual([
    { kind: 'named', id: 'compound:stain' },
  ]);
});

test('a line inherited by several events is one first', () => {
  const quiet = { type: 'repeated', action: 'ink', line: 'ink:slick' } satisfies GameEvent;
  const events = [quiet, stain, { ...oil, line: stain.line }, mark, stain];
  expect(projectBatch(start, events, unknown).shown.map((step) => step.first)).toEqual([
    [{ kind: 'line', id: 'ink:slick' }],
    [],
    [{ kind: 'named', id: 'compound:stain' }],
  ]);
});

test('null witnessed means no firsts', () => {
  const result = projectBatch(start, [mark, stain], { ...unknown, witnessed: null });
  expect(result.shown[0]?.first).toEqual([]);
  expect(result.shown[0]?.beat.first).toBe(false);
});

test('shown steps numbered from 1 skipping 0 ms', () => {
  const result = projectBatch(
    start,
    [{ type: 'phase', phase: 'enemy' }, oil, { type: 'repeated', action: 'ink' }, mark, stain],
    unknown,
  );
  expect(result.shown.map(({ n, srcIndex }) => [n, srcIndex])).toEqual([
    [1, 1],
    [2, 4],
  ]);
});

test('readout-only step for phase and win', () => {
  const result = projectBatch(
    start,
    [{ type: 'phase', phase: 'player' }, { type: 'won' }],
    unknown,
  );
  expect(result.shown.map(({ text, anchor }) => [text, anchor])).toEqual([
    ['Your turn', null],
    ['The party wins', null],
  ]);
});

test('shared cell stacks markers', () => {
  const result = projectBatch(start, [oil, stain], unknown);
  expect(result.shown.map(({ n, anchor }) => [n, anchor])).toEqual([
    [1, at('B1')],
    [2, at('B1')],
  ]);
});

test('multi-cell burst has one anchor', () => {
  const result = projectBatch(start, [burst], unknown);
  expect(result.shown.map((step) => step.anchor)).toEqual([burst.at]);
});

test('marker order equals log order', () => {
  const result = projectBatch(start, [oil, { type: 'won' }, burst], unknown);
  expect(result.shown.filter(({ anchor }) => anchor).map(({ n }) => n)).toEqual([1, 3]);
  expect(result.shown.map(({ n }) => n)).toEqual([1, 2, 3]);
});

test('two actions in one round number separately', async () => {
  const session = new BattleSession({ state: battleOf(CAST_BOARD), events: [] }, 'trip', {});
  const done = session.dispatch(cast);
  session.skip();
  await done;
  const next = session.dispatch({ type: 'move', unit: 'stoker', to: at('C8') });
  session.skip();
  await next;
  const steps = session.projectedLog;
  const last = steps.at(-1);
  expect(steps[0]).toMatchObject({ n: 1, round: 1 });
  expect(last).toMatchObject({ n: 1, round: 1, srcIndex: session.log.length - 1 });
  expect(last?.actionId).not.toBe(steps[0]?.actionId);
});

test('skip leaves a complete log without replay', async () => {
  vi.useFakeTimers();
  const session = new BattleSession({ state: battleOf(stainBoard), events: [] }, 'trip', {
    witnessed: [],
  });
  const done = session.dispatch(cast);
  const fullLog = session.projectedLog;
  expect(fullLog.some(({ event }) => event.type === 'mixed')).toBe(true);
  session.skip();
  await done;
  expect(session.projectedLog).toEqual(fullLog);
  expect(session.playback.markers).toEqual([]);
  expect(session.busy).toBe(false);
  expect(toasts.items).toEqual([]);
});

test('resumed fight has a log and no markers', async () => {
  const first = new BattleSession({ state: battleOf(CAST_BOARD), events: [] }, 'trip', {});
  const done = first.dispatch(cast);
  first.skip();
  await done;
  const next = first.dispatch({ type: 'move', unit: 'stoker', to: at('C8') });
  first.skip();
  await next;
  const resumed = new BattleSession({ state: first.state, events: first.log }, 'trip', {});
  expect(resumed.playback.markers).toEqual([]);
  expect(resumed.projectedLog).toEqual(first.projectedLog);
});

test('discovery toast fires when its step shows', async () => {
  vi.useFakeTimers();
  const session = new BattleSession({ state: battleOf(stainBoard), events: [] }, 'trip', {
    witnessed: [],
  });
  const done = session.dispatch(cast);
  expect(toasts.items).toEqual([]);
  while (session.busy && session.playback.current?.event.type !== 'mixed') {
    expect(toasts.items).toEqual([]);
    vi.advanceTimersToNextTimer();
  }
  expect(session.playback.current?.event.type).toBe('mixed');
  expect(toasts.items.map(({ text }) => text)).toEqual(['New in the notebook: Stain']);
  session.skip();
  await done;
});
