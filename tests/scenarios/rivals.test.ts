import { describe, expect, test } from 'vitest';
import {
  type BattleState,
  compileLattice,
  type Dir,
  type EnemyUnit,
  type GameEvent,
  parseLabel,
  parseLattice,
  type RivalIntent,
  unitAt,
} from '$engine';
import { isEffect, isStarved } from '$engine/rivals/resolve';
import { act, board, expectLogIncludes, unitAtLabel } from './harness';

/** Rival casting (rivals plan P2, P3; RV-2): locked aims, the starved-chain fallback, dry strikes. */

const endTurn = { type: 'endTurn' } as const;

const DIR_NAMES: readonly string[] = ['up', 'right', 'down', 'left'];
/** A pinned cast: a direction (Bolt) or a tile label (Touch, areas), with an optional fallback tile. */
function cast(spell: string, aim: string, fallback?: string): RivalIntent {
  return {
    kind: 'cast',
    spell,
    aim: DIR_NAMES.includes(aim)
      ? { kind: 'dir', dir: aim as Dir }
      : { kind: 'tile', at: parseLabel(aim) },
    fallback: fallback ? parseLabel(fallback) : null,
    order: 1,
  };
}

const rivalOf = (s: BattleState): EnemyUnit => {
  const u = s.units.find((x): x is EnemyUnit => x.kind === 'enemy' && !!x.rival);
  if (!u) throw new Error('no rival');
  return u;
};

/** A board with the rival at `at` pinned to `intent`, and an extra spell `x` in its kit. */
function pinned(ascii: string, at: string, intent: RivalIntent, x?: string): BattleState {
  const s = board(ascii, { pins: { [at]: intent } });
  const r = rivalOf(s).rival;
  if (x && r) {
    const spell = compileLattice(parseLattice(x)).spells[0];
    if (!spell) throw new Error('no spell');
    r.spells = { ...r.spells, x: spell };
    r.charges.x = 5;
  }
  return s;
}

const fallbacks = (events: readonly GameEvent[]) =>
  events.filter((e) => e.type === 'fallbackStrike');

describe('locked aim', () => {
  test('the pinned cast is telegraphed in round 1 and every round', () => {
    const s = pinned('L . . D', 'A1', cast('lantern', 'right'));
    expect(rivalOf(s).intent).toMatchObject({ kind: 'cast', spell: 'lantern' });
    const r = act(s, endTurn);
    expect(r.lines).toContain('lamplighter at A1 will cast Lantern right');
  });

  test('a displaced Bolt caster casts a parallel line in the same direction', () => {
    const s = pinned('S . . .\nL . . .\n. . . D', 'A2', cast('lantern', 'right'));
    const shoved = act(s, { type: 'shove', unit: 'stoker', dir: 'down' });
    expect(rivalOf(shoved.state).pos).toEqual(parseLabel('A3'));
    const r = act(shoved.state, endTurn);
    expectLogIncludes(r.events, ['lamplighter at A3 casts Bolt right']);
    const lands = r.events.find((e) => e.type === 'lands');
    expect(lands?.type === 'lands' && lands.at).toEqual(parseLabel('D3'));
    expect(unitAtLabel(r.state, 'D3').kind).toBe('member');
    expect(rivalOf(r.state).rival?.charges.lantern).toBe(4);
  });

  test('a moved apprentice is not followed', () => {
    const s = pinned('L . . D\n. . . .', 'A1', cast('lantern', 'right'));
    const moved = act(s, { type: 'move', unit: 'draughtsman', to: parseLabel('D2') });
    const r = act(moved.state, endTurn);
    expectLogIncludes(r.events, ['lamplighter at A1 casts Bolt right']);
    const aimed = r.events.find((e) => e.type === 'aimed');
    expect(aimed?.type === 'aimed' && aimed.targets).toEqual([
      { kind: 'tile', at: parseLabel('D1') },
    ]);
    expect(r.events.some((e) => e.type === 'damage' || e.type === 'fallbackStrike')).toBe(false);
  });

  test('a tile aim that is no longer legal fails, spends no charge and is starved', () => {
    const s = pinned('S . .\nL D .\n. . .', 'A2', cast('x', 'B2', 'B2'), 'Touch> Strike');
    const shoved = act(s, { type: 'shove', unit: 'stoker', dir: 'down' });
    const r = act(shoved.state, endTurn);
    expectLogIncludes(r.events, [
      'lamplighter at A3 cannot cast x at B2 from here',
      "lamplighter at A3's strike at B2 finds no one",
    ]);
    expect(rivalOf(r.state).rival?.charges.x).toBe(5);
  });
});

describe('the starved-chain fallback', () => {
  test('full starvation strikes only the pre-shown, occupied, adjacent tile', () => {
    // The Bolt finds Draughtsman and Tally fails: nothing happens. Stoker's tile A1 was shown.
    const s = pinned('S . . .\nL . . D', 'A2', cast('x', 'right', 'A1'), 'Bolt> Tally Strike');
    const before = unitAtLabel(s, 'A1').hp;
    const r = act(s, endTurn);
    expectLogIncludes(r.events, ['lamplighter at A2 strikes A1 instead']);
    expect(fallbacks(r.events)).toHaveLength(1);
    expect(unitAtLabel(r.state, 'A1').hp).toBe(before - 1);
    expect(unitAtLabel(r.state, 'D2').hp).toBe(unitAtLabel(s, 'D2').hp);
  });

  test('leaving the tile defeats it: no new target', () => {
    const s = pinned('S . . .\nL . . D', 'A2', cast('x', 'right', 'A1'), 'Bolt> Tally Strike');
    const moved = act(s, { type: 'move', unit: 'stoker', to: parseLabel('B1') });
    const r = act(moved.state, endTurn);
    expectLogIncludes(r.events, ["lamplighter at A2's strike at A1 finds no one"]);
    expect(r.events.some((e) => e.type === 'damage')).toBe(false);
  });

  test('pushing the rival out of reach defeats it', () => {
    const s = pinned(
      'S . . .\nL . . D\n. . . .',
      'A2',
      cast('x', 'right', 'A1'),
      'Bolt> Tally Strike',
    );
    const shoved = act(s, { type: 'shove', unit: 'stoker', dir: 'down' });
    const r = act(shoved.state, endTurn);
    expect(fallbacks(r.events)).toMatchObject([{ target: null, damage: 0 }]);
    expect(unitAt(r.state, parseLabel('A1'))?.hp).toBe(unitAtLabel(s, 'A1').hp);
  });

  test('a partial chain keeps its effects and earns no fallback', () => {
    const s = pinned('S . . .\nL . . D', 'A2', cast('x', 'right', 'A1'), 'Bolt> Ink Tally Strike');
    const r = act(s, endTurn);
    expect(r.events.some((e) => e.type === 'marked')).toBe(true); // Ink marks Draughtsman, Tally fails
    expect(fallbacks(r.events)).toEqual([]);
    expect(unitAtLabel(r.state, 'A1').hp).toBe(unitAtLabel(s, 'A1').hp);
  });

  test('stun, death and dry charges never strike', () => {
    const intent = cast('x', 'right', 'A1');
    const make = () => pinned('S . . .\nL . . D\nr . . .', 'A2', intent, 'Bolt> Tally Strike');
    const stunned = make();
    rivalOf(stunned).stunned = true;
    const dead = make();
    rivalOf(dead).hp = 0;
    const dry = make();
    const r = rivalOf(dry).rival;
    if (r) r.charges.x = 0;
    for (const s of [stunned, dead, dry]) {
      const out = act(s, endTurn);
      expect(fallbacks(out.events)).toEqual([]);
      expect(out.events.some((e) => e.type === 'cast' && !e.caster.member)).toBe(false);
      expect(unitAtLabel(out.state, 'A1').hp).toBe(unitAtLabel(s, 'A1').hp);
    }
  });
});

describe('dry spells', () => {
  test('rivalStrike is a plain attack with the rival def’s dry strike', () => {
    const s = pinned('L D', 'A1', { kind: 'rivalStrike', dir: 'right', order: 1 });
    const before = unitAtLabel(s, 'B1').hp;
    const r = act(s, endTurn);
    expectLogIncludes(r.events, ['lamplighter at A1 bites right']);
    expect(unitAtLabel(r.state, 'B1').hp).toBe(before - 1);
    expect(fallbacks(r.events)).toEqual([]);
  });
});

describe('isStarved (P3)', () => {
  test('flight, landings, stops, failed triggers and misses are not effects', () => {
    const at = { x: 0, y: 0 };
    const quiet: GameEvent[] = [
      { type: 'lands', source: 'Bolt', at, path: [] },
      { type: 'stopped', source: 'Bolt', at, by: 'cloud', path: [] },
      { type: 'triggered', rune: 'tally', passed: false },
      { type: 'miss', source: 'Strike' },
    ];
    expect(isStarved(quiet)).toBe(true);
    const jar: GameEvent = {
      type: 'jarSealed',
      at,
      owner: { id: 'l', name: 'l', at, member: false },
      event: 'step',
      id: 1,
      peek: null,
    };
    expect(isEffect(jar)).toBe(true);
    expect(isStarved([...quiet, jar])).toBe(false);
  });
});
