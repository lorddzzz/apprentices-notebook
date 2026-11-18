import { expect, test } from 'vitest';
import { parseLabel, tileAt } from '$engine';
import { driftWaiting } from '$engine/solvents';
import { run } from './chemHarness';
import { cast, draft, withLattices } from './harness';

test('merging currents do not silently lose a blocked jar', () => {
  const s = withLattices('w> wv .\nD w> .\n. . r', { draughtsman: 'Touch> Jar Oil' });
  const sealed = cast(s, 'draughtsman', { kind: 'tile', at: parseLabel('B2') }).state;
  const jars = draft(sealed, (ctx) => {
    const jar = tileAt(ctx.s, parseLabel('B2')).jar;
    if (!jar) throw new Error('no jar');
    tileAt(ctx.s, parseLabel('A1')).jar = structuredClone(jar);
    tileAt(ctx.s, parseLabel('B1')).jar = structuredClone(jar);
  }).state;
  const r = run(jars, driftWaiting);
  expect(
    r.state.tiles.filter((t) => t.jar).length +
      r.events.filter((e) => e.type === 'jarCrumbles').length,
  ).toBe(3);
});

test('a jar blocked on a merging current moves to the free upstream tile', () => {
  const s = withLattices('. . .\nw> wv .\nD w> r', { draughtsman: 'Touch> Jar Oil' });
  const sealed = cast(s, 'draughtsman', { kind: 'tile', at: parseLabel('B3') }).state;
  const jars = draft(sealed, (ctx) => {
    const jar = tileAt(ctx.s, parseLabel('B3')).jar;
    if (!jar) throw new Error('no jar');
    tileAt(ctx.s, parseLabel('A2')).jar = structuredClone(jar);
    tileAt(ctx.s, parseLabel('B2')).jar = structuredClone(jar);
  }).state;
  const r = run(jars, driftWaiting);
  expect(tileAt(r.state, parseLabel('B1')).jar).not.toBeNull();
  expect(r.events.some((e) => e.type === 'drawn' && e.to.x === 1 && e.to.y === 0)).toBe(true);
});
