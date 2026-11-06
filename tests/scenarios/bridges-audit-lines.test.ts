import { describe, expect, test } from 'vitest';
import { type InventionDef, type LineId, SOLVENT_IDS } from '$data';
import { type BattleState, type GameEvent, libraryOf, parseLabel, tileAt } from '$engine';
import { act, cast, withLattices } from './harness';

/**
 * BR-17: Hold, Brink, Lay, Mortar and Chalk against the bridge terrain (footnotes audit, bridges
 * section). `{span}` and `{pier}` are the bridge pieces, `_` is fog. A span tile with no pier in its
 * 4-connected run is cracked and falls at dusk. Each test plays the row's firing case.
 */

const at = parseLabel;
const endTurn = (s: BattleState) => act(s, { type: 'endTurn' });
const lineOf = (events: readonly GameEvent[], type: GameEvent['type']): LineId | undefined =>
  events.find((e) => e.type === type)?.line;
const rat = (s: BattleState) => s.units.find((u) => u.id === 'rat-1');

const inv = (id: string, solvent: InventionDef['solvent']): InventionDef => ({
  id: `inv:${id}`,
  name: id,
  method: 'conduct',
  parts: ['shove'],
  solvent,
});
const opts = {
  inventions: libraryOf([inv('impulse', null), ...SOLVENT_IDS.map((s) => inv(`impulse-${s}`, s))]),
};

describe('Hold', () => {
  test('hold-cracked: a foe held on a cracked span cannot leave before dusk and falls with it', () => {
    const s = withLattices('D . r{span} . .\n. . . . .', { draughtsman: 'Bolt> Hold' });
    const held = cast(s, 'draughtsman', 'right');
    expect(lineOf(held.events, 'held')).toBe('hold:cracked');
    const dusk = endTurn(held.state);
    expect(dusk.events.some((e) => e.type === 'bridges:collapse')).toBe(true);
    expect(dusk.events.some((e) => e.type === 'dropped')).toBe(true);
    expect(tileAt(dusk.state, at('C1')).terrain.drop).toBe(true);
  });

  test('hold-cracked-quiet: the same foe on a supported span is held with no line', () => {
    const s = withLattices('D . r{span} {pier} .\n. . . . .', { draughtsman: 'Bolt> Hold' });
    const held = cast(s, 'draughtsman', 'right');
    expect(lineOf(held.events, 'held')).toBeUndefined();
    expect(endTurn(held.state).events.some((e) => e.type === 'bridges:collapse')).toBe(false);
  });
});

describe('Brink', () => {
  const brink = (board: string) =>
    cast(withLattices(board, { draughtsman: 'Bolt> Brink Strike' }), 'draughtsman', 'right');

  test('brink-drop: beside a fallen span (fog) the rest goes through, and says why', () => {
    const r = brink('D . r _ .\n. . . . .');
    expect(lineOf(r.events, 'triggered')).toBe('brink:drop');
    expect(r.events.some((e) => e.type === 'triggered' && e.passed)).toBe(true);
    expect(r.events.some((e) => e.type === 'damage')).toBe(true);
  });

  test('brink-cracked: beside a cracked span (not yet fallen) the chain stops', () => {
    const r = brink('. . . . .\nD . r . .\n. . {span} . .');
    expect(lineOf(r.events, 'triggered')).toBe('brink:cracked');
    expect(r.events.some((e) => e.type === 'triggered' && !e.passed)).toBe(true);
    expect(r.events.some((e) => e.type === 'damage')).toBe(false);
  });

  test('brink-cracked-quiet: a supported span beside the target is no edge and no line', () => {
    const r = brink('. . . . .\nD . r . .\n. . {span} {pier} .');
    expect(lineOf(r.events, 'triggered')).toBeUndefined();
    expect(r.events.some((e) => e.type === 'triggered' && !e.passed)).toBe(true);
  });

  test("brink-edge: the room's own wall is not an edge to Brink", () => {
    const r = brink('D . r . .\n. . . . .');
    expect(lineOf(r.events, 'triggered')).toBe('brink:edge');
    expect(r.events.some((e) => e.type === 'damage')).toBe(false);
  });
});

describe('Lay', () => {
  test('lay-cracked: a cloud Lay set into a cracked span falls with it, and the log says so', () => {
    const s = withLattices('D . r{span} . .\n. . . . .', { draughtsman: 'Bolt> Lay Steam' });
    const laid = cast(s, 'draughtsman', 'right');
    expect(tileAt(laid.state, at('C1')).state?.set).toBe(true);
    const dusk = endTurn(laid.state);
    expect(lineOf(dusk.events, 'stateFades')).toBe('lay:cracked');
    expect(tileAt(dusk.state, at('C1')).state).toBeNull();
    expect(tileAt(dusk.state, at('C1')).terrain.drop).toBe(true);
  });

  test('lay-cracked-quiet: the same layer on a supported span stays set', () => {
    const s = withLattices('D . r{span} {pier} .\n. . . . .', { draughtsman: 'Bolt> Lay Steam' });
    const dusk = endTurn(cast(s, 'draughtsman', 'right').state);
    expect(dusk.events.some((e) => e.type === 'stateFades')).toBe(false);
    expect(tileAt(dusk.state, at('C1')).state?.set).toBe(true);
  });
});

describe('Mortar', () => {
  test('mortar-fog: the extra tile carries a push over the last stone and into the fog', () => {
    const board = 'D r . _ .\n. = . . .';
    const plain = cast(
      withLattices(board, { draughtsman: 'Bolt> inv:impulse' }, opts),
      'draughtsman',
      'right',
    );
    expect(rat(plain.state)?.pos).toEqual(at('C1'));
    expect(plain.events.some((e) => e.type === 'dropped')).toBe(false);
    const mortar = cast(
      withLattices(board, { draughtsman: 'Bolt> inv:impulse-mortar' }, opts),
      'draughtsman',
      'right',
    );
    expect(lineOf(mortar.events, 'push')).toBe('mortar:unit');
    expect(lineOf(mortar.events, 'dropped')).toBe('shove:drop');
  });
});

describe('Chalk', () => {
  test('chalk-fog: the reach is plain distance, so it crosses a fallen tile', () => {
    const board = 'D . r = _ r .';
    const plain = cast(
      withLattices(board, { draughtsman: 'Bolt> inv:impulse' }, opts),
      'draughtsman',
      'right',
    );
    expect(plain.state.units.find((u) => u.id === 'rat-2')?.pos).toEqual(at('F1'));
    const chalk = cast(
      withLattices(board, { draughtsman: 'Bolt> inv:impulse-chalk' }, opts),
      'draughtsman',
      'right',
    );
    expect(chalk.state.units.find((u) => u.id === 'rat-2')?.pos).toEqual(at('G1'));
    expect(lineOf(chalk.events, 'conducted')).toBe('chalk:network');
  });
});
