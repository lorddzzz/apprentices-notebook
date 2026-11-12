import { describe, expect, test } from 'vitest';
import { type InventionDef, SOLVENT_IDS, TUNING } from '$data';
import { type BattleState, libraryOf, parseLabel } from '$engine';
import { runDraft, withLine } from '$engine/ctx';
import { COLLAPSE_RULE_ID, parseBridges } from '$engine/districts/bridges/types';
import { push } from '$engine/push';
import { fourCombos, withFootnotes } from '../footnoteHarness';
import { board, unitAtLabel, withLattices } from '../harness';
import { castWith } from './castHelper';

/** BR-19b: Mortar's one margin line (`mortar:unit`) and its two capstones. */

const at = parseLabel;
const unit = (s: BattleState, id: string) => {
  const u = s.units.find((x) => x.id === id);
  if (!u) throw new Error(`no ${id}`);
  return u;
};

/** A Mortar'd push as the Shove handler makes it: two tiles, one of them Mortar's, in its line. */
const mortar = (ascii: string, from: string, fns: readonly string[]) =>
  runDraft(
    board(ascii),
    (ctx) =>
      withLine(ctx, 'mortar:unit', () =>
        push(ctx, unitAtLabel(ctx.s, from), 'right', 2, null, { bonus: 1 }),
      ),
    { footnotes: withFootnotes(fns) },
  );

describe('mortar:unit', () => {
  // The sentry (an elite) at B1 is carried into the fog at D1; the stoker at B1 on the other board;
  // the dummy behind each (A1) is the unit behind the target.
  const ELITE = 'd b . _ .\nD . . . .';
  const MEMBER = 'd S . _ .\nD . . . .';
  const run = (fns: readonly string[]) => {
    const e = mortar(ELITE, 'B1', fns);
    const m = mortar(MEMBER, 'B1', fns);
    return {
      elite: {
        pos: unit(e.state, 'sentry-1').pos,
        drop: e.events.find((x) => x.type === 'damage' && x.source === 'Drop'),
        dropped: e.events.some((x) => x.type === 'dropped'),
        behind: unit(e.state, 'dummy-1').pos,
      },
      member: {
        pos: unit(m.state, 'stoker').pos,
        shield: unit(m.state, 'stoker').shield,
        dropped: m.events.some((x) => x.type === 'dropped'),
        behind: unit(m.state, 'dummy-1').pos,
      },
    };
  };

  test('mortar:unit fourCombos: rim or fall, then guard or behind', () => {
    const runs = fourCombos(
      'mortar:unit',
      ['mortar-unit-rim', 'mortar-unit-fall'],
      ['mortar-unit-guard', 'mortar-unit-behind'],
      ({ l1, l2 }) => run([l1, l2]),
    );
    const plain = run([]);
    expect(plain.elite).toMatchObject({ pos: at('C1'), dropped: true, behind: at('A1') });
    expect(plain.elite.drop).toMatchObject({ amount: TUNING.dropEliteDamage });
    const [rimGuard, rimBehind, fallGuard, fallBehind] = runs.map((r) => r.result);
    // rim: the extra tile into the fog is dropped, so the sentry stops on the last stone, unhurt.
    expect(rimGuard?.elite).toMatchObject({ pos: at('C1'), dropped: false, drop: undefined });
    // rim + guard: the fog tile is the extra one, so the member stops on C1 and takes its Guard there.
    expect(rimGuard?.member).toMatchObject({ pos: at('C1'), shield: 1, dropped: false });
    // rim + behind: the unit behind is still pushed, even though the first stopped short.
    expect(rimBehind?.elite.behind).toEqual(at('B1'));
    // fall: the drop hits one step harder; a fall is no stop, so no Guard.
    expect(fallGuard?.elite.drop).toMatchObject({ amount: TUNING.dropEliteDamage + 1 });
    expect(fallGuard?.member).toMatchObject({ dropped: true, shield: 0 });
    // fall + behind: the unit behind takes one plain tile, no bonus.
    expect(fallBehind?.elite.behind).toEqual(at('B1'));
  });

  test('mortar-unit-rim, cast for real: the extra tile into fog is dropped and the line says Mortar', () => {
    const inv = (id: string, solvent: InventionDef['solvent']): InventionDef => ({
      id: `inv:${id}`,
      name: id,
      method: 'conduct',
      parts: ['shove'],
      solvent,
    });
    const opts = {
      inventions: libraryOf([
        inv('impulse', null),
        ...SOLVENT_IDS.map((s) => inv(`impulse-${s}`, s)),
      ]),
    };
    const s = withLattices(
      'D r . _ .\n. = . . .',
      { draughtsman: 'Bolt> inv:impulse-mortar' },
      opts,
    );
    const aim = { kind: 'dir', dir: 'right' } as const;
    const plain = castWith(s, aim, {});
    expect(plain.events.some((e) => e.type === 'dropped')).toBe(true);
    const rim = castWith(s, aim, withFootnotes(['mortar-unit-rim']));
    expect(rim.events.some((e) => e.type === 'dropped')).toBe(false);
    expect(unit(rim.state, 'rat-1').pos).toEqual(at('C1'));
    expect(rim.events.find((e) => e.type === 'push')?.line).toBe('mortar:unit');
  });

  test("mortar-cap-set: a Mortar'd push that ends on a chipped span tile sets the stone sound again", () => {
    const stoneAt = (s: BattleState, l: string) =>
      parseBridges(s.rules?.[COLLAPSE_RULE_ID]).stone[`${at(l).x},${at(l).y}`];
    const ascii = 'r . {span:1} . .\n{pier} {pier} {pier} . .\nD . . . d';
    // The rat at A1 is carried two tiles, onto the chipped span at C1.
    const plain = mortar(ascii, 'A1', []);
    expect(stoneAt(plain.state, 'C1')).toBe(1);
    const set = mortar(ascii, 'A1', ['mortar-cap-set']);
    expect(stoneAt(set.state, 'C1')).toBe(2);
    expect(unit(set.state, 'rat-1').pos).toEqual(at('C1'));
  });

  test("mortar-cap-scatter: a Mortar'd push that drops a unit also pushes each unit beside the last stone", () => {
    const ascii = '. r . _ .\n. . d . .\n. . . . .\nD . . . .';
    const plain = mortar(ascii, 'B1', []);
    expect(unit(plain.state, 'dummy-1').pos).toEqual(at('C2'));
    const scatter = mortar(ascii, 'B1', ['mortar-cap-scatter']);
    expect(scatter.events.some((e) => e.type === 'dropped')).toBe(true);
    expect(unit(scatter.state, 'dummy-1').pos).toEqual(at('C3'));
  });
});
