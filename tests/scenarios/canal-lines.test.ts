import { describe, expect, test } from 'vitest';
import type { InventionDef, LineId } from '$data';
import { type BattleState, type GameEvent, type Jar, libraryOf, parseLabel, tileAt } from '$engine';
import { act, cast, expectLogIncludes, unitAtLabel, withLattices } from './harness';

/**
 * CN-F1: the Timing runes' audited lines (footnotes audit, canals section): a new jar crumbles the
 * old (Jar, Fuse), a Fuse opens on whoever stands there at dusk, a Wick lapses with its caster.
 */

const at = parseLabel;
const tileAim = (label: string) => ({ kind: 'tile' as const, at: at(label) });
const linesOf = (events: readonly GameEvent[], type: GameEvent['type']): (LineId | undefined)[] =>
  events.filter((e) => e.type === type).map((e) => e.line);
const endTurn = (s: BattleState) => act(s, { type: 'endTurn' });

/** Without the Draughtsman's two-jar habit: one jar, Jar and Fuse together. */
const oneJar = (s: BattleState): BattleState => {
  const c = structuredClone(s);
  const d = c.units.find((u) => u.id === 'draughtsman');
  if (d?.kind === 'member') d.lean.habit = null;
  return c;
};
const ratJar: Jar = {
  owner: 'rat-1',
  event: 'step',
  rest: null,
  heading: null,
  origin: { caster: 'rat-1', spell: 'x', cast: 0 },
};

describe('Jar and Fuse crumble the old jar', () => {
  test('jar-jar: a second Jar crumbles the first, under Jar', () => {
    const s = oneJar(withLattices('D . . .\n. . . .\n. . . d', { draughtsman: 'Bolt> Jar Guard' }));
    const first = cast(s, 'draughtsman', 'right');
    const second = cast(endTurn(first.state).state, 'draughtsman', 'down');
    expectLogIncludes(second.events, ['the jar at D1 crumbles empty']);
    expect(linesOf(second.events, 'jarCrumbles')).toEqual(['jar:jar']);
  });

  test('jar-jar-tile: a Jar sealed onto anyone else’s jar crumbles it', () => {
    const s = oneJar(withLattices('D . . .\n. . . d', { draughtsman: 'Bolt> Jar Guard' }));
    tileAt(s, at('D1')).jar = ratJar;
    const r = cast(s, 'draughtsman', 'right');
    expect(linesOf(r.events, 'jarCrumbles')).toEqual(['jar:jar']);
    expect(tileAt(r.state, at('D1')).jar?.owner).toBe('draughtsman');
  });

  test('fuse-jar: a Fuse counts against the limit and crumbles your Jar, under Fuse', () => {
    const s = oneJar(withLattices('D . . .\n. . . .\n. . . d', { draughtsman: 'Bolt> Jar Guard' }));
    const first = cast(s, 'draughtsman', 'right');
    const fused = oneJar(
      withLattices('D . . .\n. . . .\n. . . d', { draughtsman: 'Bolt> Fuse Guard' }),
    );
    // Same board, the Jar from the first cast already on D1; now the lattice holds a Fuse.
    fused.tiles = structuredClone(endTurn(first.state).state.tiles);
    const second = cast(fused, 'draughtsman', 'down');
    expect(linesOf(second.events, 'jarCrumbles')).toEqual(['fuse:jar']);
    expect(tileAt(second.state, at('D1')).jar).toBeNull();
    expect(tileAt(second.state, at('A3')).jar?.event).toBe('dusk');
  });

  test('jar-jar-quiet: the first jar crumbles nothing', () => {
    const s = oneJar(withLattices('D . . .\n. . . d', { draughtsman: 'Bolt> Jar Guard' }));
    const r = cast(s, 'draughtsman', 'right');
    expect(linesOf(r.events, 'jarCrumbles')).toEqual([]);
  });
});

describe('Fuse opens on whoever stands there at dusk', () => {
  test('fuse-unit: a Fuse under a dummy opens on it at dusk, under Fuse', () => {
    const s = withLattices('D . . d', { draughtsman: 'Bolt> Fuse Strike' }, { hp: { D1: 9 } });
    const sealed = cast(s, 'draughtsman', 'right');
    const dusk = endTurn(sealed.state);
    expectLogIncludes(dusk.events, ['the jar at D1 opens under dummy at D1']);
    expect(linesOf(dusk.events, 'jarOpened')).toEqual(['fuse:unit']);
    expect(unitAtLabel(dusk.state, 'D1').hp).toBe(7);
  });

  test('fuse-unit-empty: a Fuse on an empty tile opens with no line', () => {
    const s = withLattices('D . . .\n. . . d', { draughtsman: 'Touch> Fuse Strike' });
    const sealed = cast(s, 'draughtsman', tileAim('B1'));
    const dusk = endTurn(sealed.state);
    expect(linesOf(dusk.events, 'jarOpened')).toEqual([undefined]);
  });

  test('jar-unit stays Jar’s: a step-jar tripped by a foe is not a Fuse line', () => {
    const s = withLattices('D . r', { draughtsman: 'Touch> Jar Strike' });
    const sealed = cast(s, 'draughtsman', tileAim('B1'));
    const round = endTurn(sealed.state);
    expect(linesOf(round.events, 'jarOpened')).toEqual(['jar:unit']);
  });
});

describe('Wick lapses with its caster', () => {
  const inv = (id: string, parts: InventionDef['parts']): InventionDef => ({
    id: `inv:${id}`,
    name: id,
    method: 'conduct',
    parts,
    solvent: 'wick',
  });
  const opts = { inventions: libraryOf([inv('zap-wick', ['strike'])]), hp: { B1: 9 } };
  const downed = (s: BattleState): BattleState => {
    const copy = structuredClone(s);
    const d = copy.units.find((u) => u.id === 'draughtsman');
    if (d) d.hp = 0;
    return copy;
  };

  test("wick-member: a downed caster's Wick lapses and says so", () => {
    const s = withLattices('D d . .\nS . . .', { draughtsman: 'Bolt> inv:zap-wick' }, opts);
    const now = cast(s, 'draughtsman', 'right');
    expect(now.state.scheduled[0]?.kind).toBe('wick');
    const next = endTurn(downed(now.state));
    expect(linesOf(next.events, 'miss')).toContain('wick:member');
    expect(unitAtLabel(next.state, 'B1').hp).toBe(9);
  });

  test('wick-member-quiet: a caster still standing wakes the Wick without a lapse', () => {
    const s = withLattices('D d . .\nS . . .', { draughtsman: 'Bolt> inv:zap-wick' }, opts);
    const next = endTurn(cast(s, 'draughtsman', 'right').state);
    expect(next.events.some((e) => e.line === 'wick:member')).toBe(false);
    expect(next.state.scheduled).toEqual([]);
  });
});
