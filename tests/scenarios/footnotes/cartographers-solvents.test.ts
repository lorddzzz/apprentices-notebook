import { describe, expect, test } from 'vitest';
import type { InventionDef } from '$data';
import {
  type BattleState,
  type GameEvent,
  label,
  libraryOf,
  parseLabel,
  tileAt,
  type Unit,
} from '$engine';
import type { FootnoteIds } from '$engine/ctx';
import { fourCombos, withFootnotes } from '../footnoteHarness';
import { withLattices } from '../harness';
import { castWith, step, tileAim } from './castHelper';

/**
 * CG-F4: the Cartographers' solvents, Quicksilver (`quicksilver:edge`) and Graphite
 * (`graphite:unit`), and their capstones (cartographers.md section 4). Each variant runs once
 * without and once with itself written.
 */

const inv = (
  id: string,
  parts: InventionDef['parts'],
  solvent: InventionDef['solvent'],
): InventionDef => ({ id: `inv:${id}`, name: id, method: 'repeat', parts, solvent });
const inventions = libraryOf([
  inv('strike-quicksilver', ['strike'], 'quicksilver'),
  inv('swap-graphite', ['swap'], 'graphite'),
  inv('erase-graphite', ['erase'], 'graphite'),
  inv('ink-graphite', ['ink'], 'graphite'),
]);

const unit = (s: BattleState, id: string): Unit => {
  const u = s.units.find((x) => x.id === id);
  if (!u) throw new Error(`no unit ${id}`);
  return u;
};
const count = (events: readonly GameEvent[], type: GameEvent['type']): number =>
  events.filter((e) => e.type === type).length;
const endTurn = (s: BattleState, fns: FootnoteIds) => step(s, { type: 'endTurn' }, fns);

// ── Quicksilver ────────────────────────────────────────

describe('quicksilver:edge', () => {
  const HP = 9;
  /** Strike down the row from the Draughtsman; hp lost by each unit named, after the mirrored copy. */
  const strike = (room: string, hit: string[], fns: FootnoteIds) => {
    const s = withLattices(
      room,
      { draughtsman: 'Bolt> inv:strike-quicksilver' },
      { inventions, hp: Object.fromEntries(hit.map((c) => [c, HP])) },
    );
    const r = castWith(s, { kind: 'dir', dir: 'right' }, fns);
    const lost = (id: string): number => HP - (r.state.units.find((u) => u.id === id)?.hp ?? HP);
    return { r, lost };
  };

  // A 6x3 board: the target (dummy-1, B1) and its mirrors across the middle column (F1) and row (B3).
  const scenario = (fns: FootnoteIds) => {
    const a = strike('D d . . d .\n. . . . . .\n. d . . . .', ['B1', 'E1', 'B3'], fns);
    // The caster mid-row: the copy is as far from him on the other side.
    const self = strike('d . . d D d\n. . . . . .\n. . . . . .', ['A1', 'D1', 'F1'], fns);
    // An odd board where the target is its own mirror.
    const middle = strike('D . d . .', ['C1'], fns);
    // A friend at the mirror's tile.
    const friend = strike('D d . . S .', ['B1'], fns);
    // Blank paper at the mirror.
    const blank = strike('D d . d {blank} .', ['B1', 'D1'], fns);
    return {
      row: [a.lost('dummy-1'), a.lost('dummy-2'), a.lost('dummy-3')],
      self: [self.lost('dummy-1'), self.lost('dummy-2'), self.lost('dummy-3')],
      middle: middle.lost('dummy-1'),
      friend: friend.r.events.some((e) => e.type === 'damage' && e.target.id === 'stoker'),
      shields: count(friend.r.events, 'shieldGained'),
      blank: blank.lost('dummy-2'),
    };
  };

  test('CG-F4: fourCombos reads for every margin line (quicksilver:edge)', () => {
    const plain = scenario({});
    // Left to right: the mirror of B1 is F1; the dummy in the same column below is not hit.
    expect(plain.row).toEqual([expect.any(Number), expect.any(Number), 0]);
    expect(plain.row[0]).toBeGreaterThan(0);
    expect(plain.row[1]).toBeGreaterThan(0);
    const hit = plain.row[0] ?? 0;
    expect(plain.self).toEqual([hit, 0, hit]); // F1 is the target; its mirror is A1
    expect(plain.middle).toBe(hit);
    expect(plain.friend).toBe(true); // the copy lands on the Stoker
    expect(plain.blank).toBe(0);
    const runs = fourCombos(
      'quicksilver:edge',
      ['quicksilver-edge-turn', 'quicksilver-edge-self'],
      ['quicksilver-edge-middle', 'quicksilver-edge-spare'],
      (c) => scenario(c.footnotes),
    );
    const [tm, ts, sm, ss] = runs.map((r) => r.result);
    // turn + middle: top to bottom, and a target on the middle row acts twice.
    expect(tm?.row).toEqual([hit, 0, hit]);
    expect(tm?.middle).toBe(hit * 2);
    // turn + spare: the copy skips the friend across the other axis (the Stoker is not on it anyway).
    expect(ts?.row).toEqual([hit, 0, hit]);
    // self + middle: the copy goes through you; the target on you is acted on twice.
    expect(sm?.self).toEqual([0, hit, hit]);
    expect(sm?.middle).toBe(hit);
    // self + spare: the copy's natural pair; the Stoker is out of its way.
    expect(ss?.friend).toBe(false); // the copy reflects through you, off the board here
  });

  test('quicksilver-edge-turn: Quicksilver mirrors top to bottom', () => {
    expect(scenario({}).row).toEqual([expect.any(Number), expect.any(Number), 0]);
    const turned = scenario(withFootnotes(['quicksilver-edge-turn'])).row;
    expect(turned[0]).toBeGreaterThan(0);
    expect(turned[1]).toBe(0);
    expect(turned[2]).toBeGreaterThan(0);
  });

  test('quicksilver-edge-self: the mirror runs through you', () => {
    expect(scenario({}).self[1]).toBe(0);
    const s = scenario(withFootnotes(['quicksilver-edge-self'])).self;
    expect(s[1]).toBeGreaterThan(0); // D1, as far from E1 on the other side as F1 is
    expect(s[0]).toBe(0);
  });

  test('quicksilver-edge-middle: a target that is its own mirror is acted on twice', () => {
    const once = scenario({}).middle;
    expect(scenario(withFootnotes(['quicksilver-edge-middle'])).middle).toBe(once * 2);
  });

  test('quicksilver-edge-spare: the mirrored copy passes over your own party', () => {
    expect(scenario({}).friend).toBe(true);
    expect(scenario(withFootnotes(['quicksilver-edge-spare'])).friend).toBe(false);
  });

  test('CG-F4: one scenario per capstone (quicksilver)', () => {
    // quicksilver-cap-rebound: the copy that would land on blank paper acts on the nearest paper tile instead.
    expect(scenario({}).blank).toBe(0);
    expect(scenario(withFootnotes(['quicksilver-cap-rebound'])).blank).toBeGreaterThan(0);
    // quicksilver-cap-ward: a party member the copy would reach gains 1 shield (the copy still lands).
    expect(scenario({}).shields).toBe(0);
    const warded = scenario(withFootnotes(['quicksilver-cap-ward']));
    expect(warded.shields).toBe(1);
    // ...and with the spare, she is still shielded, and nothing lands on her.
    const both = scenario(withFootnotes(['quicksilver-edge-spare', 'quicksilver-cap-ward']));
    expect(both.shields).toBe(1);
    expect(both.friend).toBe(false);
  });
});

// ── Graphite ───────────────────────────────────────────

describe('graphite:unit', () => {
  const SWAP = { draughtsman: 'Touch> inv:swap-graphite' };
  const swapRoom = (extra = ''): BattleState =>
    withLattices(`D d . S .${extra}\n. . . . .`, SWAP, { inventions });

  /** Swap with the dummy, then end turns; the board after `turns` rounds. */
  const undone = (fns: FootnoteIds, turns: number, stuck = false) => {
    const swapped = castWith(swapRoom(), tileAim('B1'), fns).state;
    if (stuck) {
      // The Stoker takes the Draughtsman's home tile, the dummy wanders to C1.
      unit(swapped, 'stoker').pos = parseLabel('A1');
      unit(swapped, 'dummy-1').pos = parseLabel('C1');
    }
    let s = swapped;
    let events: GameEvent[] = [];
    for (let i = 0; i < turns; i++) {
      const r = endTurn(s, fns);
      s = r.state;
      events = events.concat(r.events);
    }
    return {
      d: label(unit(s, 'draughtsman').pos),
      dummy: label(unit(s, 'dummy-1').pos),
      held: unit(s, 'dummy-1').held,
      shield: unit(s, 'draughtsman').shield,
      undoEvents: count(events, 'moveUndone'),
    };
  };

  test('CG-F4: fourCombos reads for every margin line (graphite:unit)', () => {
    // Plain: the swap is undone at the start of your next turn; units home, nothing else.
    expect(undone({}, 1)).toEqual({ d: 'A1', dummy: 'B1', held: 0, shield: 0, undoEvents: 2 });
    const runs = fourCombos(
      'graphite:unit',
      ['graphite-unit-late', 'graphite-unit-stay'],
      ['graphite-unit-redraw', 'graphite-unit-shield'],
      (c) => ({
        after1: undone(c.footnotes, 1),
        after2: undone(c.footnotes, 2),
        stuck: undone(c.footnotes, 1, true),
        paper: redrawn(c.footnotes),
      }),
    );
    const [lr, ls, sr, ss] = runs.map((r) => r.result);
    // late + redraw: the swap holds a turn longer, and the paper comes back a turn later too.
    expect(lr?.after1.d).toBe('B1');
    expect(lr?.after2.d).toBe('A1');
    expect(lr?.paper).toBe('pencil');
    // late + shield: the shield comes with the late undo.
    expect(ls?.after1.shield).toBe(0);
    expect(ls?.after2.shield).toBe(1);
    // stay + redraw: paper is not a unit move; stay + shield: only units that go home are shielded.
    expect(sr?.paper).toBe('pencil');
    expect(sr?.after1).toMatchObject({ d: 'A1', dummy: 'B1' });
    expect(ss?.after1.shield).toBe(1);
    expect(ss?.stuck.shield).toBe(0); // the stuck unit stays, so it gets none
  });

  test('graphite-unit-late: Graphite waits one more round', () => {
    expect(undone({}, 1).d).toBe('A1');
    const late = withFootnotes(['graphite-unit-late']);
    expect(undone(late, 1).d).toBe('B1');
    expect(undone(late, 2).d).toBe('A1');
  });

  test('graphite-unit-stay: a unit whose home tile is taken stays where it is', () => {
    expect(undone({}, 1, true).d).not.toBe('B1');
    expect(undone({}, 1, true).d).not.toBe('A1'); // the nearest free tile
    expect(undone(withFootnotes(['graphite-unit-stay']), 1, true)).toMatchObject({
      d: 'B1',
      dummy: 'C1',
      undoEvents: 0,
    });
  });

  /** An Erase of pencil under Graphite; what the tile holds after the round. */
  function redrawn(fns: FootnoteIds): string {
    const s = withLattices(
      'D {pencil} . . d',
      { draughtsman: 'Touch> inv:erase-graphite' },
      { inventions },
    );
    const cast = castWith(s, tileAim('B1'), fns);
    const piece = (b: BattleState) => tileAt(b, parseLabel('B1')).piece?.id ?? 'paper';
    expect(piece(cast.state)).toBe('cartographers:blank');
    let b = cast.state;
    for (let i = 0; i < 2; i++) b = endTurn(b, fns).state;
    return piece(b).replace('cartographers:', '');
  }

  test('graphite-unit-redraw: paper the invention un-drew comes back as bare pencil', () => {
    expect(redrawn({})).toBe('blank');
    expect(redrawn(withFootnotes(['graphite-unit-redraw']))).toBe('pencil');
  });

  test('graphite-unit-shield: each unit Graphite sets back on its home gains 1 shield', () => {
    expect(undone({}, 1).shield).toBe(0);
    expect(undone(withFootnotes(['graphite-unit-shield']), 1).shield).toBe(1);
  });

  test('CG-F4: one scenario per capstone (graphite)', () => {
    // graphite-cap-pin: a foe set back on its home tile cannot move until your next turn.
    expect(undone({}, 1).held).toBe(0);
    expect(undone(withFootnotes(['graphite-cap-pin']), 1).held).toBe(1);
    // graphite-cap-trace: the marks the invention placed are taken back too.
    const marked = (fns: FootnoteIds): boolean => {
      const s = withLattices(
        'D d . . .',
        { draughtsman: 'Touch> inv:ink-graphite' },
        { inventions },
      );
      let b = castWith(s, tileAim('B1'), fns).state;
      const placed = unit(b, 'dummy-1').mark !== null;
      b = endTurn(b, fns).state;
      return placed && unit(b, 'dummy-1').mark !== null;
    };
    expect(marked({})).toBe(true);
    expect(marked(withFootnotes(['graphite-cap-trace']))).toBe(false);
  });
});
