import { expect, test } from 'vitest';
import { type Aim, type BattleState, memberById, parseLabel } from '$engine';
import { type Ctx, runDraft } from '$engine/ctx';
import { landKind, roundEndChemistry } from '$engine/mix';
import { moveMember } from '$engine/movement';
import { push } from '$engine/push';
import { tileAt } from '$engine/queries';
import { flowFor, tile, unit } from '../chemHarness';
import { withFootnotes } from '../footnoteHarness';
import { board, unitAtLabel, withLattices } from '../harness';
import { castWith, hpOf, where } from './castHelper';

/** FN-C7 capstones (Ink, Oil, Steam, Brass, Spark): each runs once without and once with its variant. */
const at = parseLabel;
const right: Aim = { kind: 'dir', dir: 'right' };
const stateAt = (r: { state: Parameters<typeof tileAt>[0] }, l: string) =>
  tileAt(r.state, at(l)).state?.id ?? null;

/** The draughtsman walks to `to` on `ascii`. */
function walk(ascii: string, to: string, ids: string[]) {
  const s = board(ascii);
  return runDraft(s, (ctx: Ctx) => moveMember(ctx, memberById(ctx.s, 'draughtsman'), at(to)), {
    footnotes: withFootnotes(ids),
  });
}

test('ink-cap-trail: a marked walker leaves a blot where it started', () => {
  expect(stateAt(walk('D! . . .', 'C1', []), 'A1')).toBeNull();
  expect(stateAt(walk('D! . . .', 'C1', ['ink-cap-trail']), 'A1')).toBe('blot');
  expect(stateAt(walk('D . . .', 'C1', ['ink-cap-trail']), 'A1')).toBeNull(); // unmarked: nothing
});

test('ink-cap-seen: Bolt stops on a marked foe in a cloud, not on the cloud', () => {
  const run = (ids: string[]) => {
    const s = withLattices('D . ~ r!~ .', { draughtsman: 'Bolt> Strike' });
    return castWith(s, right, withFootnotes(ids));
  };
  expect(hpOf(run([]).state, 'rat-1')).toBe(2);
  expect(hpOf(run(['ink-cap-seen']).state, 'rat-1')).toBeLessThan(2);
});

test('oil-cap-slip: a unit that walks onto a slick slides one tile on', () => {
  expect(where(walk('D . o . .', 'C1', []).state, 'draughtsman')).toBe('C1');
  expect(where(walk('D . o . .', 'C1', ['oil-cap-slip']).state, 'draughtsman')).toBe('D1');
});

test('oil-cap-skate: an apprentice walking onto a slick goes one tile on, free', () => {
  expect(where(walk('D . o . .', 'C1', []).state, 'draughtsman')).toBe('C1');
  expect(where(walk('D . o . .', 'C1', ['oil-cap-skate']).state, 'draughtsman')).toBe('D1');
});

/** Runs `fn` on `ascii` with the variants written. */
function draft(ascii: string, ids: string[], fn: (ctx: Ctx, s: BattleState) => void) {
  const s = board(ascii);
  return { s, r: runDraft(s, (ctx: Ctx) => fn(ctx, s), { footnotes: withFootnotes(ids) }) };
}
type Draft = ReturnType<typeof draft>;
/** The unit that stood on `l` at the start, as it ended. */
const after = (d: Draft, l: string) => d.r.state.units.find((u) => u.id === unitAtLabel(d.s, l).id);

test('steam-cap-carry: a pushed unit takes its cloud tile with it', () => {
  const run = (ids: string[]) =>
    draft('D . . . .\n. d~ . . .', ids, (ctx) =>
      push(ctx, unitAtLabel(ctx.s, 'B2'), 'right', 1, null),
    ).r;
  expect([stateAt(run([]), 'B2'), stateAt(run([]), 'C2')]).toEqual(['cloud', null]);
  const carried = run(['steam-cap-carry']);
  expect([stateAt(carried, 'B2'), stateAt(carried, 'C2')]).toEqual([null, 'cloud']);
});

test('steam-cap-scald: Steam landed on a unit scalds it for 1 at round end', () => {
  const run = (ids: string[]) =>
    draft('D . . .\n. d . . .', ids, (ctx, s) => {
      landKind(ctx, 'steam', unit(unitAtLabel(s, 'B2').id), flowFor(s));
      roundEndChemistry(ctx);
    });
  const base = after(run([]), 'B2')?.hp ?? 0;
  expect(after(run(['steam-cap-scald']), 'B2')?.hp).toBe(base - 1);
});

test('brass-cap-magnet: a collared unit two tiles from a plate is pulled one toward it', () => {
  const run = (ids: string[]) =>
    draft('D . . . .\nd& . # . .', ids, (ctx) => roundEndChemistry(ctx));
  expect(after(run([]), 'A2')?.pos).toEqual(at('A2'));
  expect(after(run(['brass-cap-magnet']), 'A2')?.pos).toEqual(at('B2'));
});

test('brass-cap-net: a unit pushed into a plate you cast is caught, collared, uncrushed', () => {
  const run = (ids: string[]) =>
    draft('D . . . .\nd . . . .', ids, (ctx, s) => {
      landKind(ctx, 'brass', tile('C2'), flowFor(s));
      push(ctx, unitAtLabel(ctx.s, 'A2'), 'right', 3, null);
    });
  const plain = run([]);
  const caught = run(['brass-cap-net']);
  expect(after(plain, 'A2')?.collar).toBe(false);
  expect(after(caught, 'A2')?.collar).not.toBe(false);
  expect(after(caught, 'A2')?.hp).toBeGreaterThan(after(plain, 'A2')?.hp ?? 0);
});

test('spark-cap-pyre: a unit a burst kills leaves its tile on fire', () => {
  const run = (ids: string[]) =>
    draft('D . . . .\nr! . . . .', ids, (ctx, s) =>
      landKind(ctx, 'spark', unit(unitAtLabel(s, 'A2').id), flowFor(s)),
    );
  expect(after(run([]), 'A2')?.hp).toBeLessThanOrEqual(0);
  expect(stateAt(run([]).r, 'A2')).toBeNull();
  expect(stateAt(run(['spark-cap-pyre']).r, 'A2')).toBe('fire');
});

test('spark-cap-arc: a Spark with nothing to burst arcs to the nearest unit within 2', () => {
  const run = (ids: string[]) =>
    draft('D . . . .\n. . . d .', ids, (ctx, s) => landKind(ctx, 'spark', tile('B2'), flowFor(s)));
  const base = after(run([]), 'D2')?.hp ?? 0;
  expect(after(run(['spark-cap-arc']), 'D2')?.hp).toBe(base - 1);
});
