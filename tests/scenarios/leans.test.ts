import { describe, expect, test } from 'vitest';
import type { SchoolId } from '$data';
import { MEMBERS } from '$data';
import { type BattleState, type Coord, inkOf, type MemberUnit, parseLabel, tileAt } from '$engine';
import { sealJar } from '$engine/jars';
import { lands, type Run, tile } from './chemHarness';
import { act, board, cast, draft, expectLogIncludes, unitAtLabel, withLattices } from './harness';

/** Design §9, plan P33 and P36: gifts, the trained discount, and the two habits. */

const at = (lbl: string): Coord => parseLabel(lbl);
const unit = (s: BattleState, id: string) => {
  const u = s.units.find((x) => x.id === id);
  if (!u) throw new Error(`no unit ${id}`);
  return u;
};
const member = (s: BattleState, id: 'draughtsman' | 'stoker'): MemberUnit => {
  const u = unit(s, id);
  if (u.kind !== 'member') throw new Error(`${id} is not a member`);
  return u;
};
const layer = (s: BattleState, lbl: string) => tileAt(s, at(lbl)).state;
const hp = (st: BattleState, lbl: string): number => unitAtLabel(st, lbl).hp;
const jarAt = (s: BattleState, lbl: string) => tileAt(s, at(lbl)).jar;
const endTurn = (s: BattleState) => act(s, { type: 'endTurn' });

/** Gives a member a gift in `school` (the lean is copied onto each battle unit). */
const gift = (
  s: BattleState,
  id: 'draughtsman' | 'stoker',
  school: SchoolId | null,
): BattleState => {
  const c = structuredClone(s);
  member(c, id).lean.gifted = school;
  return c;
};

describe('gifted: push', () => {
  const lattice = { stoker: 'Bolt> Shove' };
  const board = 'S r . . . .';

  test('gifted-shove-pushes-2', () => {
    const gifted = cast(withLattices(board, lattice), 'stoker', 'right');
    expect(unit(gifted.state, 'rat-1').pos).toEqual(at('D1')); // 1 + 1 (Stoker is gifted in the Seam)
    const plain = cast(gift(withLattices(board, lattice), 'stoker', null), 'stoker', 'right');
    expect(unit(plain.state, 'rat-1').pos).toEqual(at('C1'));
  });

  test('gifted-sentence-pushes-3', () => {
    const s = withLattices('D r! . . . .', { draughtsman: 'Bolt> Sentence' });
    const r = cast(s, 'draughtsman', 'right'); // Draughtsman is gifted in Contracts
    expect(unit(r.state, 'rat-1').pos).toEqual(at('E1')); // 2 + 1
    const plain = cast(gift(s, 'draughtsman', null), 'draughtsman', 'right');
    expect(unit(plain.state, 'rat-1').pos).toEqual(at('D1'));
  });

  test('gifted-draw-moves-2', () => {
    const s = gift(withLattices('S r{stain} . . .', { stoker: 'Bolt> Draw' }), 'stoker', 'board');
    const r = cast(s, 'stoker', 'right');
    // The stain under the rat is drawn two tiles along the heading instead of one.
    expect(layer(r.state, 'B1')).toBeNull();
    expect(layer(r.state, 'D1')?.id).toBe('stain');
  });
});

describe('gifted: round', () => {
  const lifespan = (start: BattleState): number => {
    let s = cast(start, 'stoker', 'right').state;
    let rounds = 0;
    while (layer(s, 'D1') && rounds < 8) {
      s = endTurn(s).state;
      if (layer(s, 'D1')) rounds++;
    }
    return rounds;
  };

  test('gifted-steam-lasts-longer', () => {
    const s = withLattices('S . . .\n. . . r', { stoker: 'Bolt> Steam' });
    expect(lifespan(s)).toBe(lifespan(gift(s, 'stoker', null)) + 1);
  });

  test('gifted-brass-and-guard-and-hold-last-longer', () => {
    const base = withLattices('S r . .', { stoker: 'Bolt> Guard' });
    const guard = (s: BattleState) =>
      unit(cast(s, 'stoker', 'right').state, 'rat-1').guardUntil ?? 0;
    expect(guard(base)).toBe(guard(gift(base, 'stoker', null)) + 1);

    const hold = withLattices('S r . .', { stoker: 'Bolt> Hold' });
    const held = (s: BattleState) => unit(cast(s, 'stoker', 'right').state, 'rat-1').held;
    // Hold belongs to Structure: give the Stoker that gift for this one.
    expect(held(gift(hold, 'stoker', 'structure'))).toBe(held(hold) + 1);

    const brass = withLattices('S . . .\n. . . r', { stoker: 'Bolt> Brass' });
    const plate = (st: BattleState) => layer(cast(st, 'stoker', 'right').state, 'D1')?.rounds ?? 0;
    expect(plate(brass)).toBe(plate(gift(brass, 'stoker', null)) + 1);
  });

  test('gifted-afterglow-adds-another-round', () => {
    const s = withLattices('D . . .\nd . . .', { draughtsman: '. . Afterglow\nBolt> Ink Oil' });
    const rounds = (start: BattleState): number =>
      layer(cast(start, 'draughtsman', 'right').state, 'D1')?.rounds ?? 0;
    expect(rounds(gift(s, 'draughtsman', 'timing'))).toBe(rounds(s) + 1);
  });
});

describe('gifted: tile', () => {
  test('gifted-bolt-reaches-5', () => {
    const board = 'S . . . . r';
    const lattice = { stoker: 'Bolt> Strike' };
    const gifted = cast(withLattices(board, lattice), 'stoker', 'right');
    expectLogIncludes(gifted.events, ['Strike hits rat at F1 for 2']);
    const plain = cast(gift(withLattices(board, lattice), 'stoker', null), 'stoker', 'right');
    expect(unit(plain.state, 'rat-1').hp).toBe(unit(withLattices(board, lattice), 'rat-1').hp);
  });

  test('gifted-splash-and-vat-reach-one-further', () => {
    const board = 'S . . . . . .\n. . . . . . .';
    const reach = (st: BattleState, to: string): boolean => {
      try {
        cast(st, 'stoker', { kind: 'tile', at: at(to) });
        return true;
      } catch {
        return false;
      }
    };
    // The Stoker is gifted in the Seam (Splash); Vat belongs to Areas.
    for (const [rune, school, near, far] of [
      ['Splash', 'seam', 'D1', 'E1'],
      ['Vat', 'areas', 'B1', 'C1'],
    ] as const) {
      const plain = gift(withLattices(board, { stoker: `${rune}> Strike` }), 'stoker', null);
      expect(reach(plain, near), `${rune} near`).toBe(true);
      expect(reach(plain, far), `${rune} far, plain`).toBe(false);
      expect(reach(gift(plain, 'stoker', school), far), `${rune} far, gifted`).toBe(true);
    }
  });

  test('gifted-steep-spreads-two-tiles', () => {
    const board = 'D . . . .\n. . . . .\nd . . . .';
    const s = withLattices(board, { draughtsman: '. . Steep\nBolt> Steam Oil' });
    const spread = (st: BattleState): number => {
      const made = cast(st, 'draughtsman', 'right').state;
      return endTurn(made).state.tiles.filter((t) => t.state?.id === 'greaseFog').length;
    };
    expect(spread(gift(s, 'draughtsman', 'areas'))).toBeGreaterThan(spread(s));
  });

  test('gifted-coil-reaches-one-further', () => {
    // Spark on a brass plate conducts to a unit 2 tiles away with Coil; 3 away when gifted too.
    const s = board('D . . . .\n # . . d .\n . . . . .');
    const lost = (r: Run) => hp(s, 'D2') - hp(r.state, 'D2');
    const coiled = lands(s, [['spark', tile('A2')]], { auras: ['coil'] });
    expect(lost(coiled)).toBe(0);
    const gifted = lands(s, [['spark', tile('A2')]], { auras: ['coil'], giftedAuras: ['coil'] });
    expect(lost(gifted)).toBe(2);
  });
});

describe('trained: -1 ink, minimum 1 (P33)', () => {
  test('trained-discount-min-1', () => {
    const stoker = MEMBERS.stoker.lean; // trained in the Seam
    const draughtsman = MEMBERS.draughtsman.lean; // trained in Timing
    // Bolt (Source, 2) costs 1; Strike (Action, 2) costs 1; Ink (Kind, 1) and Fork (Shape, 1) stay at 1.
    expect(inkOf('bolt', {}, null)).toBe(2);
    expect(inkOf('bolt', {}, stoker)).toBe(1);
    expect(inkOf('strike', {}, stoker)).toBe(1);
    expect(inkOf('ink', {}, stoker)).toBe(1);
    expect(inkOf('fork', {}, stoker)).toBe(1);
    // Only the trained school: the Draughtsman pays full for the Seam, less for Timing.
    expect(inkOf('bolt', {}, draughtsman)).toBe(2);
    expect(inkOf('jar', {}, draughtsman)).toBe(inkOf('jar', {}, null) - 1);
    expect(inkOf('afterglow', {}, draughtsman)).toBe(inkOf('afterglow', {}, null) - 1);
    // Nothing ever drops below 1.
    expect(inkOf('afterglow', {}, draughtsman)).toBeGreaterThanOrEqual(1);
  });
});

describe('Stoker: his Forks act on the tile ahead too', () => {
  // Strike on the left road, Oil on the right road.
  const FORK = '. Strike .\nBolt> Fork .\n. Oil .';
  const arena = '. r . .\nS r . .\n. r . .';

  test('fork-ahead-habit', () => {
    const r = cast(withLattices(arena, { stoker: FORK }), 'stoker', 'right');
    // Bolt hits B2 heading right: left B1, right B3, then ahead C2 (both roads, left first).
    expectLogIncludes(r.events, [
      'Strike hits rat at B1 for 2',
      'rat at B1 dies',
      'oil lands at B3 as slick',
      'oil lands at C2 as slick',
    ]);
    // Without the habit, the tile ahead is left alone.
    const s = withLattices(arena, { stoker: FORK });
    member(s, 'stoker').lean.habit = null;
    const plain = cast(s, 'stoker', 'right');
    expect(plain.lines.join('\n')).not.toContain('C2');
    expect(layer(plain.state, 'C2')).toBeNull();
  });

  test('fork-ahead-strikes-a-unit-ahead', () => {
    const r = cast(withLattices('. r . .\nS r r .\n. r . .', { stoker: FORK }), 'stoker', 'right');
    expectLogIncludes(r.events, ['oil lands at B3 as slick', 'Strike hits rat at C2 for 2']);
  });

  test('the Draughtsman does not have it', () => {
    const r = cast(
      withLattices(arena.replace('S', 'D'), { draughtsman: FORK }),
      'draughtsman',
      'right',
    );
    expect(r.lines.join('\n')).not.toContain('C2');
  });
});

describe('Draughtsman: he keeps two jars', () => {
  const jar = (cast_: number, event: 'step' | 'dusk' = 'step') => ({
    owner: 'draughtsman',
    event,
    rest: null,
    heading: null,
    origin: { caster: 'draughtsman', spell: 'x', cast: cast_ },
  });

  test('two-jars-habit', () => {
    const start = withLattices('D . . .\n. . . .\n. . . .', {});
    const seal = (s: BattleState, lbl: string, n: number) =>
      draft(s, (ctx) => sealJar(ctx, at(lbl), jar(n))).state;
    const one = seal(start, 'D1', 1);
    const two = seal(one, 'B2', 2);
    expect(jarAt(two, 'D1')).not.toBeNull(); // both kept
    expect(jarAt(two, 'B2')).not.toBeNull();
    // The third crumbles the oldest.
    const third = draft(two, (ctx) => sealJar(ctx, at('C3'), jar(3)));
    expectLogIncludes(third.events, [
      'the jar at D1 crumbles empty',
      'Draughtsman seals a jar at C3 (opens on a step)',
    ]);
    expect(jarAt(third.state, 'D1')).toBeNull();
    expect(jarAt(third.state, 'B2')).not.toBeNull();
    expect(jarAt(third.state, 'C3')).not.toBeNull();
  });

  test('two jars cast in turn, then a third crumbles the oldest', () => {
    const start = withLattices('. . .\n. D .\n. . r', { draughtsman: 'Bolt> Jar Guard' });
    unit(start, 'rat-1').held = 9; // the rat stays in its corner and trips nothing
    const first = cast(start, 'draughtsman', 'right');
    const second = cast(endTurn(first.state).state, 'draughtsman', 'down');
    expect(jarAt(second.state, 'C2')).not.toBeNull();
    expect(jarAt(second.state, 'B3')).not.toBeNull();
    const third = cast(endTurn(second.state).state, 'draughtsman', 'left');
    expectLogIncludes(third.events, [
      'the jar at C2 crumbles empty',
      'Draughtsman seals a jar at A2 (opens on a step)',
    ]);
    expect(jarAt(third.state, 'C2')).toBeNull();
    expect(jarAt(third.state, 'B3')).not.toBeNull();
    expect(jarAt(third.state, 'A2')).not.toBeNull();
  });

  test('the Stoker keeps one: a second jar crumbles his first', () => {
    const start = withLattices('S . . .\n. . . .', {});
    const jarOf = (n: number) => ({ ...jar(n), owner: 'stoker' });
    const one = draft(start, (ctx) => sealJar(ctx, at('D1'), jarOf(1))).state;
    const two = draft(one, (ctx) => sealJar(ctx, at('B2'), jarOf(2)));
    expectLogIncludes(two.events, ['the jar at D1 crumbles empty']);
    expect(jarAt(two.state, 'D1')).toBeNull();
  });
});
