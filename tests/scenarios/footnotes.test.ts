import { expect, test } from 'vitest';
import { VARIANTS } from '$data';
import { aimPreview, memberById } from '$engine';
import { burstAt } from '$engine/bursts';
import { type Ctx, runDraft } from '$engine/ctx';
import { landKindFree } from '$engine/mix';
import { push } from '$engine/push';
import { tileAt } from '$engine/queries';
import { resolveSpell } from '$engine/resolve';
import { board, cast, unitAtLabel, withLattices } from './harness';

function run(ascii: string, id: string, fn: (ctx: Ctx) => void) {
  const v = VARIANTS.find((v) => v.id === id);
  if (!v) throw new Error(id);
  return runDraft(board(ascii), fn, { footnotes: { [v.line]: v.id } });
}

test('heavy wall adds one crush damage', () => {
  const r = run('D d . . {wall}', 'shove-wall-heavy', (ctx) => {
    push(ctx, unitAtLabel(ctx.s, 'B1'), 'right', 3, null);
  });
  expect(r.events.find((e) => e.type === 'crush')).toMatchObject({ damage: 4, line: 'shove:wall' });
});

test('far slick slides one extra tile', () => {
  const r = run('D d o . . .', 'shove-slick-far', (ctx) => {
    push(ctx, unitAtLabel(ctx.s, 'B1'), 'right', 1, null);
  });
  expect(r.events.find((e) => e.type === 'push')).toMatchObject({ slid: 2, line: 'shove:slick' });
  expect(unitAtLabel(r.state, 'E1').def).toBe('dummy');
});

test('again slick permits a second slide in the same round', () => {
  const r = run('D . o d .', 'shove-slick-again', (ctx) => {
    const u = unitAtLabel(ctx.s, 'D1');
    push(ctx, u, 'left', 1, null);
    push(ctx, u, 'right', 1, null);
  });
  expect(r.events.filter((e) => e.type === 'push')).toMatchObject([{ slid: 1 }, { slid: 1 }]);
  expect(tileAt(r.state, { x: 2, y: 0 }).state?.slid).toBeUndefined();
});

test('hot slick burns for three damage now', () => {
  const r = run('D do o', 'spark-slick-hot', (ctx) => burstAt(ctx, { x: 1, y: 0 }, 'tile', null));
  expect(r.events.find((e) => e.type === 'damage')).toMatchObject({
    amount: 3,
    line: 'spark:slick',
  });
});

test('long slick leaves fire for three rounds across connected oil', () => {
  const r = run('D o o', 'spark-slick-long', (ctx) => burstAt(ctx, { x: 1, y: 0 }, 'tile', null));
  for (const x of [1, 2])
    expect(tileAt(r.state, { x, y: 0 }).state).toMatchObject({ id: 'fire', rounds: 3 });
  expect(r.events.find((e) => e.type === 'burst')).toMatchObject({ line: 'spark:slick' });
});

test('corners pool soaks diagonal tiles', () => {
  const r = run('D . .\n. o .\n. . .', 'oil-slick-corners', (ctx) =>
    landKindFree(ctx, 'oil', { kind: 'tile', at: { x: 1, y: 1 } }),
  );
  expect(r.events.filter((e) => e.type === 'landed')).toHaveLength(8);
  for (const x of [0, 2])
    for (const y of [0, 2]) expect(tileAt(r.state, { x, y }).state?.id).toBe('slick');
});

test('short pool lasts one round instead of two', () => {
  const r = run('D o .', 'oil-slick-short', (ctx) =>
    landKindFree(ctx, 'oil', { kind: 'tile', at: { x: 1, y: 0 } }),
  );
  expect(tileAt(r.state, { x: 1, y: 0 }).state).toMatchObject({ id: 'pool', rounds: 1 });
  expect(r.events.find((e) => e.type === 'mixed')).toMatchObject({ line: 'oil:slick' });
});

test.each([
  ['', 4],
  ['bolt-empty-far', 5],
  ['bolt-empty-near', 3],
])('unobstructed Bolt %s agrees across aim, flight and preview', (id, x) => {
  const s = withLattices('D . . . . . .', { draughtsman: 'Bolt> Oil' });
  const v = VARIANTS.find((v) => v.id === id);
  const footnotes = v ? { [v.line]: v.id } : {};
  const aim = { kind: 'dir', dir: 'right' } as const;
  const preview = aimPreview(s, 'draughtsman', '0,0', aim, footnotes);
  const r = runDraft(
    s,
    (ctx) => {
      const m = memberById(ctx.s, 'draughtsman');
      const spell = m.spells[0];
      if (!spell) throw new Error('missing spell');
      resolveSpell(ctx, m, spell, aim);
    },
    { footnotes },
  );
  expect(preview.targets).toEqual([{ x, y: 0 }]);
  expect(r.events.find((e) => e.type === 'aimed')).toMatchObject({
    targets: [{ kind: 'tile', at: { x, y: 0 } }],
  });
  expect(r.events.find((e) => e.type === 'lands')).toMatchObject({
    at: { x, y: 0 },
    path: preview.path,
    line: 'bolt:empty',
  });
  expect(tileAt(r.state, { x, y: 0 }).state?.id).toBe('slick');
});

test.each(['bolt-empty-far', 'bolt-empty-near'])(
  'Bolt %s leaves first units and blockers unchanged',
  (id) => {
    const v = VARIANTS.find((v) => v.id === id);
    if (!v) throw new Error(id);
    for (const token of ['d', '~', '=', 'g', 'w>h']) {
      const s = withLattices(`D . ${token} . . .`, { draughtsman: 'Bolt> Oil' });
      const aim = { kind: 'dir', dir: 'right' } as const;
      expect(aimPreview(s, 'draughtsman', '0,0', aim, { [v.line]: v.id })).toEqual(
        aimPreview(s, 'draughtsman', '0,0', aim),
      );
    }
  },
);

test('far Bolt respects an occupied or blocked extra tile and clamps at board edge', () => {
  const v = VARIANTS.find((v) => v.id === 'bolt-empty-far');
  if (!v) throw new Error('missing variant');
  for (const tail of ['d', '~', '=', 'g', 'w>h', '']) {
    const s = withLattices(`D . . . . ${tail}`, { draughtsman: 'Bolt> Oil' });
    expect(
      aimPreview(s, 'draughtsman', '0,0', { kind: 'dir', dir: 'right' }, { [v.line]: v.id })
        .targets,
    ).toEqual([{ x: 4, y: 0 }]);
  }
});

test('near Bolt on a one-tile ray never lands on its caster', () => {
  const v = VARIANTS.find((v) => v.id === 'bolt-empty-near');
  if (!v) throw new Error('missing variant');
  const s = withLattices('D .', { draughtsman: 'Bolt> Oil' });
  expect(
    aimPreview(s, 'draughtsman', '0,0', { kind: 'dir', dir: 'right' }, { [v.line]: v.id }).targets,
  ).toEqual([{ x: 1, y: 0 }]);
});

test.each([
  ['~', 'bolt:cloud'],
  ['=', 'bolt:plate'],
  ['g', 'bolt:plate'],
  ['w>h', 'bolt:plate'],
])('Bolt stamps its existing stop on %s', (token, line) => {
  const s = withLattices(`D . ${token}`, { draughtsman: 'Bolt> Oil' });
  const r = cast(s, 'draughtsman', 'right');
  expect(r.events.find((e) => e.type === 'stopped')).toMatchObject({ line, at: { x: 2, y: 0 } });
});
