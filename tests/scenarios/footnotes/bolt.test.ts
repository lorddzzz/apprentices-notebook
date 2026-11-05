import { expect, test } from 'vitest';
import type { GameEvent } from '$engine';
import { memberById } from '$engine';
import { type Ctx, runDraft } from '$engine/ctx';
import { tileAt } from '$engine/queries';
import { resolveSpell } from '$engine/resolve';
import { type Combo, fourCombos } from '../footnoteHarness';
import { unitAtLabel, withLattices } from '../harness';

/** Casts the draughtsman's Bolt right with the combo written; reports where and on whom it landed. */
function shoot(ascii: string, combo: Combo) {
  const s = withLattices(ascii, { draughtsman: 'Bolt>' });
  const r = runDraft(
    s,
    (ctx: Ctx) => {
      const m = memberById(ctx.s, 'draughtsman');
      const spell = m.spells[0];
      if (!spell) throw new Error('no spell');
      resolveSpell(ctx, m, spell, { kind: 'dir', dir: 'right' });
    },
    { footnotes: combo.footnotes },
  );
  const end = r.events.find(
    (e): e is Extract<GameEvent, { type: 'lands' | 'stopped' }> =>
      e.type === 'lands' || e.type === 'stopped',
  );
  const aimed = r.events.find((e) => e.type === 'aimed');
  if (!end || aimed?.type !== 'aimed') throw new Error('no flight');
  const t = aimed.targets[0];
  return {
    start: s,
    state: r.state,
    event: end,
    at: end.at,
    target: t?.kind === 'unit' ? t.unit : t ? `tile ${t.at.x},${t.at.y}` : null,
  };
}

const cloudAt = (state: Parameters<typeof tileAt>[0], x: number) =>
  tileAt(state, { x, y: 0 }).state?.id === 'cloud';

test('bolt:empty fourCombos: far or near, then seek or settle', () => {
  // Slick at C1; foes at C2, D2, F2. Far lands F1 and seeks F2; near lands D1 and seeks D2;
  // settle stops on the slick at C1 whatever far/near would say, (settle does not seek).
  const ascii = 'D . o . . .\n. . d d . d';
  const runs = fourCombos(
    'bolt:empty',
    ['bolt-empty-far', 'bolt-empty-near'],
    ['bolt-empty-seek', 'bolt-empty-settle'],
    (c) => shoot(ascii, c),
  );
  const [farSeek, farSettle, nearSeek, nearSettle] = runs.map((r) => r.result);
  const id = (r: typeof farSeek, l: string) => (r ? unitAtLabel(r.start, l).id : '');
  expect(farSeek?.at).toEqual({ x: 5, y: 0 });
  expect(farSeek?.target).toBe(id(farSeek, 'F2'));
  expect(farSettle?.at).toEqual({ x: 2, y: 0 });
  expect(farSettle?.target).toBe('tile 2,0');
  expect(nearSeek?.at).toEqual({ x: 3, y: 0 });
  expect(nearSeek?.target).toBe(id(nearSeek, 'D2'));
  expect(nearSettle?.at).toEqual({ x: 2, y: 0 });
  expect(nearSettle?.target).toBe('tile 2,0');
  for (const r of runs) expect(r.result.event).toMatchObject({ type: 'lands', line: 'bolt:empty' });
});

test('bolt:cloud fourCombos: through or find, then cover or clear', () => {
  // Caster in a cloud at A1, cloud B1, a foe hidden in the cloud at D1, a foe at E1.
  const ascii = 'D~ ~ . d~ d .';
  const runs = fourCombos(
    'bolt:cloud',
    ['bolt-cloud-through', 'bolt-cloud-find'],
    ['bolt-cloud-cover', 'bolt-cloud-clear'],
    (c) => shoot(ascii, c),
  );
  const [throughCover, throughClear, findCover, findClear] = runs.map((r) => r.result);

  // through + cover: the shot leaves the caster's cloud, passes the cloud at D1 and lands on E1.
  expect(throughCover?.event).toMatchObject({ type: 'lands', line: 'bolt:cloud' });
  expect(throughCover?.at).toEqual({ x: 4, y: 0 });
  expect(throughCover?.target).toBe(unitAtLabel(throughCover!.start, 'E1').id);
  // through + clear: B1 is passed, D1 stops it (a second cloud) and thins away after the cast.
  expect(throughClear?.event).toMatchObject({ type: 'stopped', by: 'cloud', at: { x: 3, y: 0 } });
  expect(cloudAt(throughClear!.state, 3)).toBe(false);
  expect(cloudAt(throughClear!.state, 1)).toBe(true);
  // find + cover: stopped at D1, aims at the foe hidden there; nothing clears.
  expect(findCover?.event).toMatchObject({ type: 'stopped', at: { x: 3, y: 0 } });
  expect(findCover?.target).toBe(unitAtLabel(findCover!.start, 'D1').id);
  expect(cloudAt(findCover!.state, 3)).toBe(true);
  // find + clear: stopped at the empty cloud B1 (a tile), which thins.
  expect(findClear?.event).toMatchObject({ type: 'stopped', at: { x: 1, y: 0 } });
  expect(findClear?.target).toBe('tile 1,0');
  expect(cloudAt(findClear!.state, 1)).toBe(false);
});
