import { describe, expect, test } from 'vitest';
import type { InventionDef, LineId } from '$data';
import { type BattleState, type GameEvent, libraryOf, parseLabel, tileAt } from '$engine';
import { act, cast, withLattices } from './harness';

/**
 * BH-F1: the audited lines of Vat, Seep, Steep, Bath salt and Fog jar against the terrain
 * (footnotes audit, bathhouses section). Each test plays the row's firing case.
 */

const at = parseLabel;
const tile = (label: string) => ({ kind: 'tile' as const, at: at(label) });
const endTurn = (s: BattleState) => act(s, { type: 'endTurn' });
const lineOf = (events: readonly GameEvent[], type: GameEvent['type']): LineId | undefined =>
  events.find((e) => e.type === type)?.line;
const linesOf = (events: readonly GameEvent[], type: GameEvent['type']): (LineId | undefined)[] =>
  events.filter((e) => e.type === type).map((e) => e.line);
const unit = (s: BattleState, id: string) => {
  const u = s.units.find((x) => x.id === id);
  if (!u) throw new Error(`no ${id}`);
  return u;
};

const inv = (
  id: string,
  method: InventionDef['method'],
  parts: InventionDef['parts'],
  solvent: InventionDef['solvent'],
): InventionDef => ({ id: `inv:${id}`, name: id, method, parts, solvent });
const opts = {
  inventions: libraryOf([
    inv('strike-salt', 'repeat', ['strike'], 'bathSalt'),
    inv('strike-fog', 'repeat', ['strike'], 'fogJar'),
  ]),
};

describe('Vat', () => {
  test('vat-unit: all four tiles share one heading, so a Shove pushes them the same way', () => {
    const s = withLattices('. . . .\nD . . .\n. . . .\n. r r .\n. . . .', {
      draughtsman: 'Vat> Shove',
    });
    // The square's top-left is B3 and the caster is above it: every tile heads down.
    const r = cast(s, 'draughtsman', tile('B3'));
    expect(lineOf(r.events, 'aimed')).toBe('vat:unit');
    expect(unit(r.state, 'rat-1').pos).toEqual(at('B5'));
    expect(unit(r.state, 'rat-2').pos).toEqual(at('C5'));
  });

  test('vat-noHeading: standing on the bottom-right tile leaves the square with no way to point', () => {
    const s = withLattices('. . .\n. D r\n. . .', { draughtsman: 'Vat> Shove' });
    const r = cast(s, 'draughtsman', tile('A1'));
    expect(lineOf(r.events, 'aimed')).toBe('vat:noHeading');
    expect(unit(r.state, 'rat-1').pos).toEqual(at('C2'));
  });

  test('vat-member: you can stand inside your own Vat and are struck like anyone', () => {
    const s = withLattices('D . .\n. r .\n. . .', { draughtsman: 'Vat> Strike' });
    const hp = unit(s, 'draughtsman').hp;
    const r = cast(s, 'draughtsman', tile('A1'));
    expect(lineOf(r.events, 'aimed')).toBe('vat:member');
    expect(unit(r.state, 'draughtsman').hp).toBeLessThan(hp);
  });

  test('vat-edge: at the last column or row the 2x2 is clipped to the board', () => {
    const s = withLattices('. . . D\n. . . .\n. . . .', { draughtsman: 'Vat> Strike' });
    const r = cast(s, 'draughtsman', tile('D2'));
    expect(lineOf(r.events, 'aimed')).toBe('vat:edge');
    const aimed = r.events.find((e) => e.type === 'aimed');
    expect(aimed?.type === 'aimed' && aimed.targets).toHaveLength(2);
  });
});

describe('Seep', () => {
  test('seep-edge: a neighbour past the edge is dropped and the rest still go', () => {
    const s = withLattices('D r .\n. . .', { draughtsman: 'Bolt> Seep Strike' });
    const r = cast(s, 'draughtsman', 'right');
    expect(linesOf(r.events, 'miss')).toEqual(['seep:edge']);
    expect(r.events.filter((e) => e.type === 'damage').length).toBeGreaterThan(0);
  });

  test('seep-edge: silent when every neighbour is on the board', () => {
    const s = withLattices('. . . .\n. D r .\n. . . .', { draughtsman: 'Bolt> Seep Strike' });
    const r = cast(s, 'draughtsman', 'right');
    expect(linesOf(r.events, 'miss')).toEqual([]);
  });
});

describe('Steep', () => {
  test('steep-spread: the spread is stamped Steep', () => {
    const s = withLattices('D . . .\n. . . .\nd . . .', {
      draughtsman: '. . Steep\nBolt> Steam Oil',
    });
    const r = endTurn(cast(s, 'draughtsman', 'right').state);
    expect(linesOf(r.events, 'spreadState')).toEqual(['steep:spread']);
  });

  const lattice = (brass: boolean) => ({
    draughtsman: `. . Steep\nBolt> Steam ${brass ? 'Brass' : 'Oil'}`,
  });

  test('steep-plate: a steeped cloud meeting a plate leaves it alone, and says so', () => {
    const s = withLattices('D . . .\n. . . =\nd . . .', lattice(false));
    const r = endTurn(cast(s, 'draughtsman', 'right').state);
    expect(linesOf(r.events, 'miss')).toEqual(['steep:plate']);
    expect(linesOf(r.events, 'spreadState')).toEqual(['steep:spread']);
    expect(tileAt(r.state, at('D2')).state?.id).toBe('plate');
  });

  test('steep-unit: a steeped kettle does not grow onto a unit, a cloud would', () => {
    const board = 'D . . .\n. . . r\n. . . .';
    const kettle = endTurn(
      cast(withLattices(board, lattice(true), { intents: { D2: 'left' } }), 'draughtsman', 'right')
        .state,
    );
    expect(linesOf(kettle.events, 'miss')).toContain('steep:unit');
    expect(tileAt(kettle.state, at('D2')).state?.id).not.toBe('kettle');
    const fog = endTurn(
      cast(withLattices(board, lattice(false), { intents: { D2: 'left' } }), 'draughtsman', 'right')
        .state,
    );
    expect(linesOf(fog.events, 'miss')).not.toContain('steep:unit');
    expect(tileAt(fog.state, at('D2')).state?.id).toBe('greaseFog');
  });
});

describe('Bath salt and Fog jar', () => {
  test('bathSalt-member: the salted Strike also hits your own party in the cloud', () => {
    const s = withLattices(
      'D r~ ~ S~ .',
      { draughtsman: 'Bolt> inv:strike-salt' },
      { ...opts, hp: { B1: 9 } },
    );
    const r = cast(s, 'draughtsman', 'right');
    const hurt = r.events.filter((e) => e.type === 'damage' && e.target.id === 'stoker');
    expect(hurt.map((e) => e.line)).toEqual(['bathSalt:member']);
  });

  test('bathSalt-cloud: foes in the cloud keep the plain row', () => {
    const s = withLattices(
      'D r~ ~ r~ .',
      { draughtsman: 'Bolt> inv:strike-salt' },
      { ...opts, hp: { B1: 9, D1: 9 } },
    );
    const r = cast(s, 'draughtsman', 'right');
    expect(linesOf(r.events, 'damage')).toEqual([undefined, 'bathSalt:cloud']);
  });

  test('bathSalt-dry: salt with no other unit in reach is a stamped miss (B1)', () => {
    const s = withLattices(
      'D r . .',
      { draughtsman: 'Bolt> inv:strike-salt' },
      { ...opts, hp: { B1: 9 } },
    );
    const r = cast(s, 'draughtsman', 'right');
    expect(lineOf(r.events, 'miss')).toBe('bathSalt:dry');
  });

  test('fogJar-member: an ally beside the target is hit one step weaker', () => {
    const s = withLattices(
      'D . .\n. . .\nr S .\n. . .',
      { draughtsman: 'Bolt> inv:strike-fog' },
      { ...opts, hp: { A3: 9 } },
    );
    const r = cast(s, 'draughtsman', 'down');
    const hurt = r.events.filter((e) => e.type === 'damage' && e.target.id === 'stoker');
    expect(hurt.map((e) => e.line)).toEqual(['fogJar:member']);
  });

  test('fogJar-empty: aimed at a tile nobody holds it still reaches the units beside', () => {
    const s = withLattices(
      'D . .\n. . .\n. . .\n. r .',
      { draughtsman: 'Bolt> inv:strike-fog' },
      { ...opts, hp: { B4: 9 } },
    );
    const r = cast(s, 'draughtsman', 'down');
    expect(linesOf(r.events, 'damage')).toEqual(['fogJar:empty']);
  });
});
