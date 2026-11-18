import { expect, test } from 'vitest';
import { withFootnotes } from './footnoteHarness';
import { castWith } from './footnotes/castHelper';
import { withLattices } from './harness';

test('Tally passes on a born collar without spending it', () => {
  const s = withLattices('D . b', { draughtsman: 'Bolt> Tally Strike' }, { hp: { C1: 20 } });
  const r = castWith(
    s,
    { kind: 'dir', dir: 'right' },
    withFootnotes(['tally-collar-twice', 'tally-collar-spend']),
  );
  expect(r.events.some((e) => e.type === 'triggered' && e.passed)).toBe(true);
  expect(r.events.some((e) => e.type === 'erased' && e.what === 'collar')).toBe(false);
  expect(r.state.units.find((u) => u.id === 'sentry-1')?.collar).toBeNull();
});
