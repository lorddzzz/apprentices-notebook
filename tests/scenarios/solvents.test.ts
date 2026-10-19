import { describe, expect, test } from 'vitest';
import { type InventionDef, SOLVENT_IDS, SOLVENTS, type SolventId } from '$data';
import {
  type BattleState,
  type GameEvent,
  headlineOf,
  libraryOf,
  parseLabel,
  tileAt,
  unitAt,
} from '$engine';
import { driftWaiting } from '$engine/solvents';
import { lands, run, stateAt, tile } from './chemHarness';
import { act, cast, expectLogIncludes, unitAtLabel, withLattices } from './harness';

/** Design §6.3 and plan P38: one rule per solvent, bending any invention it flavours. */

const inv = (
  id: string,
  method: InventionDef['method'],
  parts: InventionDef['parts'],
  extra: Partial<InventionDef> = {},
): InventionDef => ({ id: `inv:${id}`, name: id, method, parts, solvent: null, ...extra });

/** Impulse, Afterimage (a Strike) and Recoil in every flavour: `inv:impulse-wax`, `inv:recoil-sand`… */
const flavoured = SOLVENT_IDS.flatMap((s) => [
  inv(`impulse-${s}`, 'conduct', ['shove'], { solvent: s }),
  inv(`after-${s}`, 'repeat', ['strike'], { solvent: s }),
  inv(`afterpush-${s}`, 'repeat', ['shove'], { solvent: s }),
  inv(`strike-${s}`, 'conduct', ['strike'], { solvent: s }),
  inv(`recoil-${s}`, 'bind', ['ink', 'shove'], { event: 'hit', solvent: s }),
]);
const lib = libraryOf([
  inv('impulse', 'conduct', ['shove']),
  inv('afterpush', 'repeat', ['shove']),
  inv('recoil', 'bind', ['ink', 'shove'], { event: 'hit' }),
  ...flavoured,
]);
const opts = { inventions: lib };

const at = parseLabel;
const endTurn = (s: BattleState) => act(s, { type: 'endTurn' });
const count = (events: readonly GameEvent[], type: GameEvent['type']): number =>
  events.filter((e) => e.type === type).length;
const posOf = (s: BattleState, id: string) => {
  const u = s.units.find((x) => x.id === id);
  if (!u) throw new Error(`no unit ${id}`);
  return u.pos;
};
const touchAt = (lbl: string) => ({ kind: 'tile' as const, at: at(lbl) });

describe('Seam', () => {
  test('gallnut-impulse-marks-everyone-it-reaches', () => {
    const s = withLattices('D r r .\n. = = .', { draughtsman: 'Bolt> inv:impulse-gallnut' }, opts);
    const r = cast(s, 'draughtsman', 'right');
    expect(r.events.filter((e) => e.type === 'marked').map((e) => e.line)).toEqual([
      'gallnut:unit',
      'gallnut:unit',
    ]);
    expect(unitAtLabel(r.state, 'B1').mark).not.toBeNull();
    expect(unitAtLabel(r.state, 'D1').mark).not.toBeNull();
    // Without the solvent nobody is marked.
    const plain = cast(
      withLattices('D r r .\n. = = .', { draughtsman: 'Bolt> inv:impulse' }, opts),
      'draughtsman',
      'right',
    );
    expect(plain.state.units.filter((u) => u.mark)).toEqual([]);
  });

  test('cinder-impulse-leaves-the-tile-hot-and-oil-burns', () => {
    // The oil under the target stays behind when the rat is pushed off it; the hot tile lights it.
    const s = withLattices('D ro . .\n. = . .', { draughtsman: 'Bolt> inv:impulse-cinder' }, opts);
    const r = cast(s, 'draughtsman', 'right');
    expect(unitAtLabel(r.state, 'C1').id).toBe('rat-1');
    expect(tileAt(r.state, at('B1')).hot).toBe(2);
    expect(tileAt(r.state, at('B1')).state?.id).toBe('fire');
    expect(r.events.some((e) => e.type === 'burst' && e.line === 'cinder:slick')).toBe(true);
    // Without oil there the tile is only hot.
    const dry = cast(
      withLattices('D r . .\n. = . .', { draughtsman: 'Bolt> inv:impulse-cinder' }, opts),
      'draughtsman',
      'right',
    );
    expect(tileAt(dry.state, at('B1')).hot).toBe(2);
    expect(tileAt(dry.state, at('B1')).state).toBeNull();
  });
  test('cinder-oil-landing-on-a-hot-tile-catches', () => {
    // Oil that lands on a hot tile ignites at once; on a cold one it is just a slick.
    const s = withLattices('D . . .', {}, opts);
    s.tiles[1] = { ...structuredClone(tileAt(s, at('B1'))), hot: 2 };
    const hot = lands(s, [['oil', tile('B1')]]);
    expect(stateAt(hot.state, 'B1')?.id).toBe('fire');
    expect(hot.events.some((e) => e.type === 'burst' && e.line === 'cinder:slick')).toBe(true);
    const cold = lands(s, [['oil', tile('C1')]]);
    expect(stateAt(cold.state, 'C1')?.id).toBe('slick');
  });
});

describe('Canals', () => {
  test('pitch-repeat-drifts-with-the-current', () => {
    // A Pitch Afterimage waits on the water and floats one tile downstream at dusk.
    const s = withLattices(
      'D w> w> w> .\n. . . . d',
      { draughtsman: 'Touch> inv:after-pitch' },
      opts,
    );
    const waiting = cast(s, 'draughtsman', touchAt('B1')).state;
    expect(waiting.scheduled).toHaveLength(1);
    expect(waiting.scheduled[0]?.target).toEqual({ kind: 'tile', at: at('B1') });
    const dusk = run(waiting, (ctx) => driftWaiting(ctx));
    expect(dusk.state.scheduled[0]?.target).toEqual({ kind: 'tile', at: at('C1') });
    expect(dusk.events.some((e) => e.type === 'scheduled' && e.line === 'pitch:water')).toBe(true);
    // The same Afterimage without Pitch stays put.
    const plain = cast(
      withLattices('D w> w> w> .\n. . . . d', { draughtsman: 'Touch> inv:after-mortar' }, opts),
      'draughtsman',
      touchAt('B1'),
    ).state;
    expect(run(plain, (ctx) => driftWaiting(ctx)).state.scheduled[0]?.target).toEqual({
      kind: 'tile',
      at: at('B1'),
    });
  });
  test('pitch-repeat-strikes-whoever-it-floats-to', () => {
    // A full turn: the entry floats from B1 to C1 at dusk (the dummies are wedged in the lane
    // and stay put) and strikes the dummy holding C1.
    const s = withLattices(
      'D w> dw> dw> d',
      { draughtsman: 'Touch> inv:after-pitch' },
      { ...opts, hp: { C1: 9, D1: 9 } },
    );
    const waiting = cast(s, 'draughtsman', touchAt('B1')).state;
    const next = endTurn(waiting);
    expectLogIncludes(next.events, ['Your turn', 'strike happens again']);
    expect(unitAtLabel(next.state, 'C1').hp).toBe(7);
    expect(unitAtLabel(next.state, 'D1').hp).toBe(9);
  });

  test('pitch-jar-floats-and-opens-on-a-foe', () => {
    // Lantern Walk: a jar on the lane drifts downstream and opens under the foe it floats to.
    const s = withLattices(
      '. . . .\nD w> w> dw>\n. . . .',
      { draughtsman: 'Touch> Jar Oil' },
      opts,
    );
    const sealed = cast(s, 'draughtsman', touchAt('B2')).state;
    expect(tileAt(sealed, at('B2')).jar).not.toBeNull();
    const one = endTurn(sealed);
    expect(one.events.some((e) => e.type === 'drawn' && e.line === 'pitch:water')).toBe(true);
    expect(tileAt(one.state, at('B2')).jar).toBeNull();
    expect(tileAt(one.state, at('C2')).jar).not.toBeNull();
    const two = endTurn(one.state);
    expectLogIncludes(two.events, [
      'the jar is drawn from C2 to D2',
      'the jar at D2 opens under dummy at D2',
    ]);
    expect(tileAt(two.state, at('D2')).jar).toBeNull(); // opened under the dummy
    expect(two.events.some((e) => e.type === 'jarOpened')).toBe(true);
  });
  test('wick-impulse-waits-a-round', () => {
    const s = withLattices('D r . .\n. = . d', { draughtsman: 'Bolt> inv:impulse-wick' }, opts);
    const now = cast(s, 'draughtsman', 'right');
    expect(unitAtLabel(now.state, 'B1').id).toBe('rat-1'); // nothing moved yet
    expect(now.state.scheduled).toHaveLength(1);
    expect(now.state.scheduled[0]?.kind).toBe('wick');
    expect(now.events.find((e) => e.type === 'scheduled')?.line).toBe('wick:unit');

    const next = endTurn(now.state);
    expectLogIncludes(next.events, ['Your turn']);
    expect(count(next.events, 'push')).toBe(1);
    expect(next.state.scheduled).toEqual([]); // it does not wait again
  });
});

describe('Ink quarter', () => {
  test('wax-recoil-melts-in-fire', () => {
    // A wax Recoil on a rat standing in fire: the round-end burn melts the mark unspent.
    const board = 'D r* . .';
    const wax = cast(
      withLattices(board, { draughtsman: 'Touch> inv:recoil-wax' }, { ...opts, hp: { B1: 9 } }),
      'draughtsman',
      touchAt('B1'),
    );
    expect(unitAtLabel(wax.state, 'B1').mark?.wax).toBe(true);
    const burnt = endTurn(wax.state);
    expect(count(burnt.events, 'released')).toBe(0);
    expect(
      burnt.events.some((e) => e.type === 'markSpent' && !e.released && e.line === 'wax:fire'),
    ).toBe(true);
    expect(unitAtLabel(burnt.state, 'B1').mark).toBeNull();
    expect(unitAtLabel(burnt.state, 'B1').pos).toEqual(at('B1')); // nobody was pushed

    // The same Recoil without wax releases its shove on the fire's hit.
    const plain = cast(
      withLattices(board, { draughtsman: 'Touch> inv:recoil' }, { ...opts, hp: { B1: 9 } }),
      'draughtsman',
      touchAt('B1'),
    );
    expect(count(endTurn(plain.state).events, 'released')).toBe(1);
  });

  test('wax-mark-does-not-spread-in-a-cloud', () => {
    const cloud = 'D r~ r~ r~ .';
    const wax = cast(
      withLattices(cloud, { draughtsman: 'Touch> inv:recoil-wax' }, opts),
      'draughtsman',
      touchAt('B1'),
    );
    expect(wax.state.units.filter((u) => u.mark)).toHaveLength(1);
    expect(wax.events.some((e) => e.line === 'wax:cloud')).toBe(true);
    const plain = cast(
      withLattices(cloud, { draughtsman: 'Touch> inv:recoil' }, opts),
      'draughtsman',
      touchAt('B1'),
    );
    expect(plain.state.units.filter((u) => u.mark)).toHaveLength(3);
  });

  test('sand-recoil-hits-hitter', () => {
    // The Stoker strikes the marked rat from the right; the sand shove turns back on him, away
    // from the rat, and the rat stays where it is.
    const s = withLattices(
      '. D r S .',
      { draughtsman: 'Touch> inv:recoil-sand', stoker: 'Bolt> Strike' },
      { ...opts, hp: { C1: 9 } },
    );
    const marked = cast(s, 'draughtsman', touchAt('C1')).state;
    const hit = cast(marked, 'stoker', 'left');
    expect(count(hit.events, 'released')).toBe(1);
    expect(hit.events.some((e) => e.type === 'push' && e.line === 'sand:unit')).toBe(true);
    expect(posOf(hit.state, 'stoker')).toEqual(at('E1')); // shoved right, away from the rat
    expect(unitAtLabel(hit.state, 'C1').id).toBe('rat-1'); // the rat did not move
    expect(unitAtLabel(hit.state, 'B1').id).toBe('draughtsman');
  });

  test('sand-with-nobody-to-turn-back-on', () => {
    // A fire hit has no hitter: the sand mark is spent and nothing is pushed.
    const s = withLattices(
      'D r* . .',
      { draughtsman: 'Touch> inv:recoil-sand' },
      {
        ...opts,
        hp: { B1: 9 },
      },
    );
    const marked = cast(s, 'draughtsman', touchAt('B1')).state;
    const burnt = endTurn(marked);
    expect(burnt.events.some((e) => e.line === 'sand:noTarget')).toBe(true);
    expect(count(burnt.events, 'push')).toBe(0);
    expect(unitAtLabel(burnt.state, 'B1').mark).toBeNull();
  });

  test('sand-impulse-pushes-the-casters-network-back', () => {
    // A conducted action acts on whoever set it off: the pulse runs through the Draughtsman's own
    // brass, aimed back at him (the rat beside it goes too).
    const s = withLattices('. D r\n. = =', { draughtsman: 'Bolt> inv:impulse-sand' }, opts);
    const r = cast(s, 'draughtsman', 'right');
    expect(posOf(r.state, 'draughtsman')).toEqual(at('A1'));
    expect(posOf(r.state, 'rat-1')).toEqual(at('B1'));
  });
});

describe('Bathhouses', () => {
  test('bath-salt-reaches-the-connected-cloud', () => {
    const board = 'D r~ ~ r~ ~ r~ .';
    const s = withLattices(board, { draughtsman: 'Bolt> inv:afterpush-bathSalt' }, opts);
    const r = cast(s, 'draughtsman', 'right');
    expect(count(r.events, 'push')).toBe(3);
    expect(r.events.filter((e) => e.type === 'push' && e.line === 'bathSalt:cloud')).toHaveLength(
      2,
    );
    expect(posOf(r.state, 'rat-1')).toEqual(at('C1'));
    expect(posOf(r.state, 'rat-2')).toEqual(at('E1'));
    expect(posOf(r.state, 'rat-3')).toEqual(at('G1'));
    // Without salt only the first rat is pushed.
    const plain = cast(
      withLattices(board, { draughtsman: 'Bolt> inv:afterpush' }, opts),
      'draughtsman',
      'right',
    );
    expect(count(plain.events, 'push')).toBe(1);
  });

  test('fog-jar-neighbours-one-step-weaker', () => {
    // Strike deals 2; the target's neighbours (in reading order) take 1.
    const s = withLattices(
      'D . .\n. . .\nd d .\nd . .',
      { draughtsman: 'Bolt> inv:after-fogJar' },
      { ...opts, hp: { A3: 9, B3: 9, A4: 9 } },
    );
    const r = cast(s, 'draughtsman', 'down');
    const damage = r.events.filter((e) => e.type === 'damage');
    expect(damage.map((e) => e.type === 'damage' && e.amount)).toEqual([2, 1, 1]);
    expect(damage[1]?.line).toBe('fogJar:unit');
  });
  test('fog-jar-pushes-neighbours-nowhere', () => {
    // Shove is 1 tile; one step weaker is 0 (min 0): the neighbour stays where it is.
    const s = withLattices(
      'D . .\n. . .\nr r .\n. . .',
      { draughtsman: 'Bolt> inv:afterpush-fogJar' },
      opts,
    );
    const r = cast(s, 'draughtsman', 'down');
    expect(count(r.events, 'push')).toBe(1);
    expect(posOf(r.state, 'rat-1')).toEqual(at('A4')); // the target is shoved down
    expect(posOf(r.state, 'rat-2')).toEqual(at('B3')); // its neighbour is not
  });
});

describe('Bridges', () => {
  test('mortar-impulse-pushes-two', () => {
    const s = withLattices(
      'D r . . .\n. = . . .',
      { draughtsman: 'Bolt> inv:impulse-mortar' },
      opts,
    );
    const r = cast(s, 'draughtsman', 'right');
    expect(unitAt(r.state, at('D1'))?.id).toBe('rat-1');
    expect(r.events.some((e) => e.type === 'push' && e.line === 'mortar:unit')).toBe(true);
  });

  test('chalk-impulse-reaches-one-further', () => {
    const board = 'D . r = . r .';
    const plain = cast(
      withLattices(board, { draughtsman: 'Bolt> inv:impulse' }, opts),
      'draughtsman',
      'right',
    );
    expect(unitAtLabel(plain.state, 'F1').id).toBe('rat-2'); // out of reach
    const chalk = cast(
      withLattices(board, { draughtsman: 'Bolt> inv:impulse-chalk' }, opts),
      'draughtsman',
      'right',
    );
    expect(unitAt(chalk.state, at('G1'))?.id).toBe('rat-2');
    expect(chalk.events.find((e) => e.type === 'conducted')?.line).toBe('chalk:network');
  });
});

describe('Foundry', () => {
  test('rivet-impulse-holds-what-it-reaches', () => {
    const s = withLattices('D r r .\n. = = .', { draughtsman: 'Bolt> inv:impulse-rivet' }, opts);
    const r = cast(s, 'draughtsman', 'right');
    expect(r.events.filter((e) => e.type === 'held' && e.line === 'rivet:unit')).toHaveLength(2);
    expect(r.state.units.filter((u) => u.kind === 'enemy').every((u) => u.held > 0)).toBe(true);
    // Held through the enemy phase, free again when your next turn has started.
    const next = endTurn(r.state);
    expect(next.state.units.filter((u) => u.kind === 'enemy').every((u) => u.held === 0)).toBe(
      true,
    );
  });

  test('filings-impulse-rings-again-on-brass', () => {
    const s = withLattices(
      'D r . . .\n. = = = .',
      { draughtsman: 'Bolt> inv:impulse-filings' },
      opts,
    );
    const now = cast(s, 'draughtsman', 'right');
    expect(unitAtLabel(now.state, 'C1').id).toBe('rat-1');
    expect(now.state.scheduled).toHaveLength(1);
    expect(now.state.scheduled[0]?.kind).toBe('filings');

    const next = endTurn(now.state);
    expectLogIncludes(next.events, ['Your turn', 'impulse-filings happens again']);
    expect(unitAtLabel(next.state, 'D1').id).toBe('rat-1');
    expect(next.state.scheduled).toEqual([]); // once more, not forever
  });

  test('filings-off-brass-is-quiet', () => {
    const s = withLattices('D r . . .', { draughtsman: 'Bolt> inv:afterpush-filings' }, opts);
    const r = cast(s, 'draughtsman', 'right');
    expect(r.state.scheduled.filter((e) => e.kind === 'filings')).toEqual([]);
  });
});

describe('Cartographers', () => {
  test('quicksilver-strikes-the-mirrored-tile', () => {
    // Seven wide: column B mirrors column F.
    const s = withLattices(
      'D d . . . d .',
      { draughtsman: 'Bolt> inv:after-quicksilver' },
      { ...opts, hp: { B1: 9, F1: 9 } },
    );
    const r = cast(s, 'draughtsman', 'right');
    const damage = r.events.filter((e) => e.type === 'damage');
    expect(damage).toHaveLength(2);
    expect(damage[1]?.line).toBe('quicksilver:edge');
    expect(unitAtLabel(r.state, 'F1').hp).toBe(7);
  });

  test('graphite-impulse-is-undone-a-round-later', () => {
    const s = withLattices(
      'D d . .\n. = . .',
      { draughtsman: 'Bolt> inv:impulse-graphite' },
      { ...opts, hp: { B1: 9 } },
    );
    const now = cast(s, 'draughtsman', 'right');
    expect(unitAtLabel(now.state, 'C1').id).toBe('dummy-1');
    expect(now.state.scheduled.filter((e) => e.kind === 'graphite')).toHaveLength(1);

    const next = endTurn(now.state);
    expect(next.events.some((e) => e.type === 'moveUndone' && e.line === 'graphite:unit')).toBe(
      true,
    );
    expect(unitAtLabel(next.state, 'B1').id).toBe('dummy-1');
    expect(next.state.scheduled).toEqual([]);
  });

  test('graphite-removes-a-state-it-landed', () => {
    // Bind on an empty tile only lands its blot; Graphite takes it away again next turn.
    const s = withLattices('D . . .\n. . . d', { draughtsman: 'Touch> inv:recoil-graphite' }, opts);
    const now = cast(s, 'draughtsman', touchAt('B1'));
    expect(tileAt(now.state, at('B1')).state?.id).toBe('blot');
    const next = endTurn(now.state);
    expectLogIncludes(next.events, ['Your turn']);
    expect(next.events.some((e) => e.type === 'stateFades' && e.line === 'graphite:unit')).toBe(
      true,
    );
    expect(tileAt(next.state, at('B1')).state).toBeNull();
  });
});

describe('headlines', () => {
  test('headline-shows-solvent', () => {
    for (const id of SOLVENT_IDS) {
      const def = lib[`inv:impulse-${id}`];
      if (!def) throw new Error(`no impulse-${id}`);
      const solvent = SOLVENTS[id as SolventId];
      expect(headlineOf(def, lib)).toBe(
        `${headlineOf({ ...def, solvent: null }, lib)} With ${solvent.name}, ${solvent.rule.charAt(0).toLowerCase()}${solvent.rule.slice(1)}`,
      );
    }
  });
});
