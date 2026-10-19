import { afterEach, describe, expect, test } from 'vitest';
import type { InventionDef } from '$data';
import { type GameEvent, libraryOf, parseLabel, tileAt, unitAt } from '$engine';
import { runInvention } from '$engine/inventions';
import { applyMark } from '$engine/marks';
import { SOLVENT_RULES } from '$engine/solvents';
import { flowFor, run, unit as unitTarget } from './chemHarness';
import { act, cast, expectLog, expectLogIncludes, unitAtLabel, withLattices } from './harness';

/** Design §6.1–6.2, §6.4 and plan P33, P34, P37: the five methods running on the real engine. */

const inv = (
  id: string,
  method: InventionDef['method'],
  parts: InventionDef['parts'],
  extra: Partial<InventionDef> = {},
): InventionDef => ({ id: `inv:${id}`, name: id, method, parts, solvent: null, ...extra });

const lib = libraryOf([
  inv('impulse', 'conduct', ['shove']),
  inv('shelter', 'conduct', ['guard']),
  inv('afterimage', 'repeat', ['strike']),
  inv('afterpush', 'repeat', ['shove']),
  inv('echo', 'margin', ['inv:afterimage']),
  inv('recoil', 'bind', ['ink', 'shove'], { event: 'hit' }),
  inv('pulsemark', 'bind', ['ink', 'inv:impulse'], { event: 'hit' }),
  inv('transfer', 'lift', ['shove']),
  inv('twice', 'conduct', ['inv:impulse']),
  inv('thrice', 'conduct', ['inv:twice']),
  inv('mortarpulse', 'conduct', ['shove'], { solvent: 'mortar' }),
]);

const opts = { inventions: lib };
const endTurn = (s: Parameters<typeof act>[0]) => act(s, { type: 'endTurn' });
const count = (events: readonly GameEvent[], type: GameEvent['type']): number =>
  events.filter((e) => e.type === type).length;
const at = parseLabel;

describe('Conduct', () => {
  test('impulse-pushes-one-into-other', () => {
    // The first evening (design §11): two subjects beside a brass plate; Impulse pushes both,
    // the first into the second.
    const s = withLattices('D r r .\n. = = .', { draughtsman: 'Bolt> inv:impulse' }, opts);
    const r = cast(s, 'draughtsman', 'right');
    expectLog(r.events, [
      'Draughtsman casts Bolt right',
      'bolt aims at rat-1',
      'Bolt lands at B1',
      'shove travels the brass to rat at B1, rat at C1',
      'rat at B1 is crushed against rat at C1 for 1',
      'Crush hits rat at B1 for 1',
      'Crush hits rat at C1 for 1',
      'rat at C1 is pushed right to D1',
    ]);
    expect(r.events.filter((e) => e.type === 'conducted')[0]?.line).toBe('conduct:network');
    expect(unitAtLabel(r.state, 'B1').id).toBe('rat-1');
    expect(unitAtLabel(r.state, 'D1').id).toBe('rat-2');
  });

  test('brass-shelter-guards-network', () => {
    // Touch on yourself: everyone on or beside the connected brass is guarded, nobody else.
    const s = withLattices('D = S\n. = .\n. . . . r', { draughtsman: 'Touch> inv:shelter' }, opts);
    const r = cast(s, 'draughtsman', { kind: 'self' });
    expectLogIncludes(r.events, [
      'guard travels the brass to Draughtsman, Stoker',
      'Draughtsman gains a shield of 2',
      'Stoker gains a shield of 2',
    ]);
    expect(unitAtLabel(r.state, 'A1').shield).toBe(2);
    expect(unitAtLabel(r.state, 'C1').shield).toBe(2);
    expect(unitAtLabel(r.state, 'E3').shield).toBe(0);
  });

  test('collared units carry it on', () => {
    // Brass sentries are brass themselves: a chain of them, no plate in sight.
    const s = withLattices('D r b b b r', { draughtsman: 'Bolt> inv:shelter' }, opts);
    const r = cast(s, 'draughtsman', 'right');
    const conducted = r.events.find((e) => e.type === 'conducted');
    expect(conducted?.type === 'conducted' && conducted.units.map((u) => u.at.x)).toEqual([
      1, 2, 3, 4, 5,
    ]);
    expect(unitAtLabel(r.state, 'F1').shield).toBe(2);
  });

  test('conduct-with-no-brass-does-nothing', () => {
    const s = withLattices('D r . .', { draughtsman: 'Bolt> inv:impulse' }, opts);
    const r = cast(s, 'draughtsman', 'right');
    expect(r.events.filter((e) => e.type === 'miss')[0]?.line).toBe('conduct:noTarget');
    expect(unitAtLabel(r.state, 'B1').id).toBe('rat-1');
  });

  test('coil-reaches-one-further', () => {
    const board = 'D . r = . r .';
    const plain = withLattices(board, { draughtsman: 'Bolt> inv:impulse' }, opts);
    expect(unitAtLabel(cast(plain, 'draughtsman', 'right').state, 'F1').id).toBe('rat-2');
    const coiled = withLattices(board, { draughtsman: '. Coil\nBolt> inv:impulse' }, opts);
    const r = cast(coiled, 'draughtsman', 'right');
    expect(r.lines).toContain('shove travels the brass to rat at C1, rat at F1');
    expect(unitAt(r.state, at('G1'))?.id).toBe('rat-2'); // pushed off F1
  });

  test('each-unit-once', () => {
    // The second rat is pushed onto a tile the network still touches; it is not pushed again.
    const s = withLattices('D r r .\n. = = .', { draughtsman: 'Bolt> inv:impulse' }, opts);
    const r = cast(s, 'draughtsman', 'right');
    expect(count(r.events, 'push')).toBe(1);
  });
});

describe('Repeat', () => {
  test('afterimage-repeats-once', () => {
    const s = withLattices(
      'D d . .',
      { draughtsman: 'Bolt> inv:afterimage' },
      { ...opts, hp: { B1: 9 } },
    );
    const now = cast(s, 'draughtsman', 'right');
    expect(count(now.events, 'damage')).toBe(1);
    expect(now.lines).toContain('repeat waits at B1');
    expect(now.state.scheduled).toHaveLength(1);

    const next = endTurn(now.state);
    expectLogIncludes(next.events, ['Your turn', 'strike happens again']);
    expect(count(next.events, 'damage')).toBe(1);
    expect(next.state.scheduled).toEqual([]);

    const after = endTurn(next.state);
    expect(count(after.events, 'damage')).toBe(0);
    expect(count(after.events, 'repeated')).toBe(0);
  });

  test("a downed caster's repeat lapses", () => {
    const s = withLattices(
      'D d . .\nS . . .',
      { draughtsman: 'Bolt> inv:afterimage' },
      { ...opts, hp: { B1: 9 } },
    );
    const now = cast(s, 'draughtsman', 'right');
    const downed = structuredClone(now.state);
    const d = downed.units.find((u) => u.id === 'draughtsman');
    if (d) d.hp = 0;
    const next = endTurn(downed);
    expect(count(next.events, 'repeated')).toBe(0);
  });

  test('repeat-cannot-reschedule', () => {
    const s = withLattices('D d . .', {}, opts);
    const flow = flowFor(s, { repeated: true });
    const r = run(s, (ctx) => runInvention(ctx, 'inv:afterimage', unitTarget('dummy-1'), flow));
    expect(count(r.events, 'damage')).toBe(1); // it still acts
    expect(count(r.events, 'scheduled')).toBe(0); // but does not wait again
    expect(r.state.scheduled).toEqual([]);
  });

  test('a repeat waits on the tile, not the unit', () => {
    const s = withLattices(
      'D d . .',
      { draughtsman: 'Bolt> inv:afterpush' },
      { ...opts, hp: { B1: 9 } },
    );
    const now = cast(s, 'draughtsman', 'right');
    expect(unitAtLabel(now.state, 'C1').id).toBe('dummy-1');
    expect(now.events.find((e) => e.type === 'scheduled')?.line).toBe('repeat:empty');
    const next = endTurn(now.state);
    expect(count(next.events, 'push')).toBe(0); // B1 is empty now; the dummy is not followed
    expect(unitAtLabel(next.state, 'C1').id).toBe('dummy-1');
  });

  test('a repeat takes whoever stands there next turn', () => {
    const s = withLattices(
      'D d . .',
      { draughtsman: 'Bolt> inv:afterpush' },
      { ...opts, hp: { B1: 9 } },
    );
    const now = cast(s, 'draughtsman', 'right');
    const moved = act(now.state, { type: 'move', unit: 'draughtsman', to: at('B1') });
    const next = endTurn(moved.state);
    expect(next.lines).toContain('Draughtsman is crushed against dummy at C1 for 1');
  });

  test('nested-repeat-of-impulse-runs', () => {
    // An invention as a part: Repeat(Impulse) is two levels, the limit.
    const nested = libraryOf([
      inv('impulse', 'conduct', ['shove']),
      inv('again', 'repeat', ['inv:impulse']),
    ]);
    const s = withLattices(
      'D r . .\n. = . .',
      { draughtsman: 'Bolt> inv:again' },
      { inventions: nested },
    );
    const r = cast(s, 'draughtsman', 'right');
    expect(count(r.events, 'conducted')).toBe(1);
    expect(r.state.scheduled).toHaveLength(1);
    expect(count(r.events, 'fizzles')).toBe(0);
  });

  test('too-deep-fizzles', () => {
    // Conduct(Conduct(Conduct(Shove))): the third level is past the nesting limit (§6.4 limit 1).
    const s = withLattices('D r . .\n. = . .', { draughtsman: 'Bolt> inv:thrice' }, opts);
    const r = cast(s, 'draughtsman', 'right');
    expect(r.events.some((e) => e.type === 'fizzles' && e.reason === 'depth')).toBe(true);
  });
});

describe('Margin', () => {
  test('margin-echoes-touching', () => {
    // The Margin touches the first Strike only: that one echoes next turn, once.
    const s = withLattices(
      'D d . .',
      { draughtsman: '. inv:echo . .\nBolt> Strike Strike .' },
      { ...opts, hp: { B1: 9 } },
    );
    const now = cast(s, 'draughtsman', 'right');
    expect(count(now.events, 'damage')).toBe(2);
    expect(count(now.events, 'scheduled')).toBe(1);

    const next = endTurn(now.state);
    expectLogIncludes(next.events, ['Your turn', 'strike happens again']);
    expect(count(next.events, 'damage')).toBe(1);
    expect(next.state.scheduled).toEqual([]); // the echo is not echoed again

    expect(count(endTurn(next.state).events, 'damage')).toBe(0);
  });

  test('a margin echo waits on the tile too', () => {
    const s = withLattices(
      'D d . .',
      { draughtsman: '. inv:echo\nBolt> Shove' },
      { ...opts, hp: { B1: 9 } },
    );
    const now = cast(s, 'draughtsman', 'right');
    expect(now.events.find((e) => e.type === 'scheduled')?.line).toBe('margin:empty');
  });

  test('a Repeat under a Margin is not echoed twice', () => {
    const s = withLattices(
      'D d . .',
      { draughtsman: '. inv:echo\nBolt> inv:afterimage' },
      { ...opts, hp: { B1: 9 } },
    );
    const now = cast(s, 'draughtsman', 'right');
    expect(count(now.events, 'scheduled')).toBe(1);
  });
});

describe('Bind', () => {
  const CLOUD = '. . . . . .\nD r{brand} r{brand} r{brand} S .\n. . . . . .';

  test('recoil-in-brand-cloud-storm', () => {
    // Design §1: Bolt → Recoil into a Brand cloud, then Spark bursts it: every hit shoves someone.
    const s = withLattices(
      CLOUD,
      { draughtsman: 'Touch> inv:recoil', stoker: 'Touch> Spark' },
      { ...opts, hp: { B2: 9, C2: 9, D2: 9 } },
    );
    const marked = cast(s, 'draughtsman', { kind: 'tile', at: at('B2') });
    expectLogIncludes(marked.events, [
      'rat at B2 is marked',
      'the mark spreads from rat at B2 to rat at C2, rat at D2',
      'rat at B2 is marked (holding shove)',
    ]);
    for (const l of ['B2', 'C2', 'D2']) {
      expect(unitAtLabel(marked.state, l).mark?.bound).toMatchObject({
        action: 'shove',
        event: 'hit',
      });
    }

    const storm = cast(marked.state, 'stoker', { kind: 'tile', at: at('D2') });
    expect(count(storm.events, 'released')).toBe(3);
    expect(count(storm.events, 'crush')).toBe(3);
    expect(storm.lines).toContain('rat at D2 is crushed against rat at C2 for 1');
    expect(storm.lines).toContain('Crush hits Draughtsman for 1');
    expect(storm.lines).toContain('Brand storm hits rat at B2 for 2');
    expect(storm.state.units.filter((u) => u.mark)).toEqual([]);
  });

  test('bind-impulse-nested', () => {
    // Bind(Ink, Impulse, hit): a mark that sends a pulse through brass when its bearer is hit.
    const s = withLattices(
      '. . . . .\nD r = r .\n. S . . .',
      { draughtsman: 'Touch> inv:pulsemark', stoker: 'Touch> Spark' },
      { ...opts, hp: { B2: 9, D2: 9 } },
    );
    const marked = cast(s, 'draughtsman', { kind: 'tile', at: at('B2') });
    expect(unitAtLabel(marked.state, 'B2').mark?.bound?.action).toBe('inv:impulse');

    const hit = cast(marked.state, 'stoker', { kind: 'tile', at: at('B2') });
    expectLogIncludes(hit.events, [
      "rat at B2's mark is spent and released",
      "rat at B2's mark releases impulse",
      'shove travels the brass to rat at B2, rat at D2',
    ]);
    // Both subjects are pushed away from the Stoker's spark, up the board.
    expect(unitAtLabel(hit.state, 'B1').id).toBe('rat-1');
    expect(unitAtLabel(hit.state, 'D1').id).toBe('rat-2');
  });

  test('bind-on-a-tile-binds-nothing', () => {
    const s = withLattices('D . . .', { draughtsman: 'Touch> inv:recoil' }, opts);
    const r = cast(s, 'draughtsman', { kind: 'tile', at: at('B1') });
    expect(r.events.find((e) => e.type === 'miss')?.line).toBe('bind:empty');
    expect(tileAt(r.state, at('B1')).state?.id).toBe('blot');
  });
});

describe('Lift', () => {
  test('transfer-lift', () => {
    // Lift(Shove): the foe's mark is handed to the next unit along the heading.
    const s = withLattices('D r! r .', { draughtsman: 'Bolt> inv:transfer' }, opts);
    const r = cast(s, 'draughtsman', 'right');
    expectLogIncludes(r.events, ['the mark moves from rat at B1 to rat at C1']);
    expect(unitAtLabel(r.state, 'B1').mark).toBeNull();
    expect(unitAtLabel(r.state, 'C1').mark).not.toBeNull();
    expect(unitAtLabel(r.state, 'B1').pos).toEqual(at('B1')); // nobody moved
  });

  test('lift-with-nowhere-to-go-does-nothing', () => {
    const s = withLattices('D r! . .', { draughtsman: 'Bolt> inv:transfer' }, opts);
    const r = cast(s, 'draughtsman', 'right');
    expect(r.events.find((e) => e.type === 'miss')?.line).toBe('lift:noTarget');
    expect(unitAtLabel(r.state, 'B1').mark).not.toBeNull();
  });

  test('lift-takes-what-the-mark-holds', () => {
    // A bound mark keeps its action, event and lineage when it moves.
    const s = withLattices('D r r .', {}, opts);
    const flow = flowFor(s, { headings: new Map([['u:rat-1', 'right']]) });
    const r = run(s, (ctx) => {
      const rat = ctx.s.units.find((u) => u.id === 'rat-1');
      if (!rat) throw new Error('no rat');
      applyMark(ctx, rat, {
        deep: false,
        bound: { action: 'shove', event: 'hit', solvent: null, heading: 'right' },
        origin: flow.origin,
      });
      runInvention(ctx, 'inv:transfer', unitTarget('rat-1'), flow);
    });
    const lifted = unitAtLabel(r.state, 'C1').mark;
    expect(lifted?.bound).toMatchObject({ action: 'shove', event: 'hit' });
    expect(unitAtLabel(r.state, 'B1').mark).toBeNull();
  });
});

describe('solvent hook', () => {
  const saved = { mortar: SOLVENT_RULES.mortar, gallnut: SOLVENT_RULES.gallnut };
  afterEach(() => {
    SOLVENT_RULES.mortar = saved.mortar;
    SOLVENT_RULES.gallnut = saved.gallnut;
  });

  test('a flavoured invention runs its parts under flow.solvent', () => {
    SOLVENT_RULES.mortar = { pushBonus: 1 };
    const s = withLattices('D r . . .\n. = . . .', { draughtsman: 'Bolt> inv:mortarpulse' }, opts);
    const r = cast(s, 'draughtsman', 'right');
    expect(unitAt(r.state, at('D1'))?.id).toBe('rat-1'); // two tiles, not one
  });

  test('widen, onReach and after are called around the method', () => {
    const calls: string[] = [];
    SOLVENT_RULES.gallnut = {
      onReach: (_ctx, t) => calls.push(`reach ${t.kind === 'unit' ? t.unit : 'tile'}`),
      after: () => calls.push('after'),
    };
    const flavoured = libraryOf([inv('gall', 'conduct', ['shove'], { solvent: 'gallnut' })]);
    const s = withLattices(
      'D r . .\n. = . .',
      { draughtsman: 'Bolt> inv:gall' },
      { inventions: flavoured },
    );
    cast(s, 'draughtsman', 'right');
    expect(calls).toEqual(['reach rat-1', 'after']);
  });
});
