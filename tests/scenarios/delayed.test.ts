import { describe, expect, it, test } from 'vitest';
import type { InventionDef } from '$data';
import {
  type BattleState,
  type GameEvent,
  type Jar,
  libraryOf,
  parseLabel,
  type Step as RunStep,
  tileAt,
} from '$engine';
import { openDuskJars, openJar, sealJar } from '$engine/jars';
import { act, cast, draft, expectLog, withLattices } from './harness';

/**
 * Foundations FD-2: BL-105 (delayed runs lose their context) and BL-106 (dusk-jar identity).
 * `it` cases were the reports reproduced (once `it.fails`), now passing with the fix's rule (FD-4
 * for P9, FD-5 for P10); `test` cases are regressions the fixes must keep.
 */

const inv = (
  id: string,
  method: InventionDef['method'],
  parts: InventionDef['parts'],
  extra: Partial<InventionDef> = {},
): InventionDef => ({ id: `inv:${id}`, name: id, method, parts, solvent: null, ...extra });

const lib = libraryOf([
  inv('zap', 'conduct', ['strike']),
  inv('rezap', 'repeat', ['inv:zap']),
  inv('zap-wick', 'conduct', ['strike'], { solvent: 'wick' }),
  inv('zap-filings', 'conduct', ['strike'], { solvent: 'filings' }),
  inv('outer-wick', 'conduct', ['inv:zap-wick'], { solvent: 'wick' }),
  inv('afterimage', 'repeat', ['strike']),
  inv('echo', 'margin', ['inv:afterimage']),
  inv('fog-again', 'repeat', ['strike'], { solvent: 'fogJar' }),
]);

/** Two dummies: C1 beside the plate, F1 two tiles from it (only a Coil's extra reach finds it). */
const BOARD = 'D . d = . d .';
const opts = { inventions: lib, hp: { C1: 20, F1: 20 } };
const endTurn = (s: BattleState) => act(s, { type: 'endTurn' });
const hits = (events: readonly GameEvent[]): string[] =>
  events.flatMap((e) => (e.type === 'damage' ? [`${e.target.at.x},${e.target.at.y}`] : []));
const C1 = '2,0';
const F1 = '5,0';

/** Casts right, then ends `turns` turns: the hits of the cast and of each following turn. */
function hitsByTurn(lattice: string, turns: number, board = BOARD): string[][] {
  let r = cast(withLattices(board, { draughtsman: lattice }, opts), 'draughtsman', 'right');
  const out = [hits(r.events)];
  for (let i = 0; i < turns; i++) {
    r = endTurn(r.state);
    out.push(hits(r.events));
  }
  expect(r.state.scheduled).toEqual([]); // whatever waited has run out
  return out;
}

describe('BL-105: a delayed run keeps the auras it was cast with (FD-4, P9)', () => {
  test('a Coil-touched Conduct reaches F1 when cast', () => {
    expect(hitsByTurn('. Coil\nBolt> inv:zap', 0)).toEqual([[C1, F1]]);
  });

  // Before FD-4 the repeat came due as a bare step with no auras: it struck C1 only.
  it('coil-repeat: the repeat next turn reaches as far as the cast', () => {
    expect(hitsByTurn('. Coil\nBolt> inv:rezap', 1)).toEqual([
      [C1, F1],
      [C1, F1],
    ]);
  });

  // Before FD-4 the woken Wick ran with no auras.
  it('coil-wick: the Wick wakes with its Coil', () => {
    expect(hitsByTurn('. Coil\nBolt> inv:zap-wick', 1)).toEqual([[], [C1, F1]]);
  });

  // Before FD-4 Filings' second ring ran with no auras.
  it('coil-filings: the second ring reaches as far as the first', () => {
    expect(hitsByTurn('. Coil\nBolt> inv:zap-filings', 1)).toEqual([
      [C1, F1],
      [C1, F1],
    ]);
  });
});

describe('BL-105: wake flags and limit 5 (FD-4, P9)', () => {
  // Before FD-4 `woken` was inherited by the Wick inside the woken one, so it fired at once.
  it('nested-wick: the inner Wick waits its own round', () => {
    expect(hitsByTurn('Bolt> inv:outer-wick', 2)).toEqual([[], [], [C1]]);
  });

  test('margin-repeat: a Repeat under a Margin acts twice, never echoed', () => {
    expect(hitsByTurn('. inv:echo\nBolt> inv:afterimage', 3)).toEqual([[C1], [C1], [], []]);
  });

  // The echo re-runs the Wick invention, which waits again. Restoring the Margin on the woken
  // Wick (P9) must not let it echo once more: an echo is spent (limit 5).
  test('margin-wick: the Wick and its echo strike once each, then the queue is empty', () => {
    expect(hitsByTurn('. inv:echo\nBolt> inv:zap-wick', 4)).toEqual([[], [C1], [C1], [], []]);
  });

  test('margin-filings: the ring and the echo are both spent', () => {
    expect(hitsByTurn('. inv:echo\nBolt> inv:zap-filings', 2)).toEqual([[C1], [C1, C1], []]);
  });
});

describe('BL-105: the rest of the sealed context (FD-4, P9)', () => {
  /** Damage dealt per tile, as `x,y:amount`. */
  const dealt = (events: readonly GameEvent[]): string[] =>
    events.flatMap((e) =>
      e.type === 'damage' ? [`${e.target.at.x},${e.target.at.y}:${e.amount}`] : [],
    );

  // Fog Jar widens a Repeat to the unit beside C1 one step weaker; its repeat stays weaker.
  it('fog-repeat: the repeat on a fogged neighbour is still one weaker', () => {
    const s = withLattices(
      'D . d d .',
      { draughtsman: 'Bolt> inv:fog-again' },
      {
        inventions: lib,
        hp: { C1: 20, D1: 20 },
      },
    );
    const first = cast(s, 'draughtsman', 'right');
    expect(dealt(first.events)).toEqual(['2,0:2', '3,0:1']);
    const next = endTurn(first.state);
    expect(dealt(next.events)).toEqual(['2,0:2', '3,0:1']);
    expect(next.state.scheduled).toEqual([]);
  });

  // A dusk jar's rest keeps the Afterglow that touched it: the compound it lands lingers.
  test('afterglow-jar: an Afterglow-touched rest still marks its compound', () => {
    const s = withLattices('D . . .\nd . . .', {
      draughtsman: '. . . Afterglow\nBolt> Fuse Ink Oil',
    });
    const sealed = cast(s, 'draughtsman', 'right');
    expect(tileAt(sealed.state, at('D1')).jar?.event).toBe('dusk');
    const dusk = draft(sealed.state, (ctx) => openDuskJars(ctx));
    expect(tileAt(dusk.state, at('D1')).state?.afterglow).toBe(true);
  });

  // The jar runs with the habit it was sealed with, even if the caster's lean changed since.
  it('habit-jar: a Stoker dusk jar forks ahead as sealed', () => {
    const arena = '. r . .\nS r . .\n. r . .';
    const lattice = '. . Strike .\nBolt> Fuse Fork .\n. . Oil .';
    const sealed = cast(withLattices(arena, { stoker: lattice }), 'stoker', 'right');
    expect(tileAt(sealed.state, at('B2')).jar?.context?.habit).toBe('forkAhead');
    const stoker = sealed.state.units.find((u) => u.id === 'stoker');
    if (stoker?.kind !== 'member') throw new Error('no stoker');
    stoker.lean.habit = null;
    const dusk = draft(sealed.state, (ctx) => openDuskJars(ctx));
    expect(tileAt(dusk.state, at('C2')).state).not.toBeNull(); // the tile ahead got its Oil
  });
});

// ── BL-106: dusk-jar identity ───────────────────────────

const O = { x: 0, y: 0 };
const strike: RunStep = { role: 'action', rune: 'strike', at: O, auras: [], next: null };
/** Shove the opener right, then seal a dusk jar (Fuse) under it holding a Strike. */
const shoveThenFuse: RunStep = {
  role: 'action',
  rune: 'shove',
  at: O,
  auras: [],
  next: { role: 'seal', rune: 'fuse', at: O, rest: strike },
};
const duskJar = (owner: string, rest: RunStep | null, cast: number): Jar => ({
  owner,
  event: 'dusk',
  rest,
  heading: 'right',
  origin: { caster: owner, spell: 'x', cast },
});
const at = parseLabel;

describe('BL-106: dusk opens the jars it found (FD-5, P10)', () => {
  /**
   *   D r . .     B1: the Draughtsman's dusk jar (Shove right, then Fuse → Strike)
   *   S . . .     C1: the Stoker's dusk jar (Strike)
   * The B1 jar opens first, pushes the rat onto C1 and seals a new jar there, replacing the
   * Stoker's. Before FD-5 dusk only remembered coordinates, so the new jar opened this same dusk.
   */
  function duskWithReplacement() {
    const s = withLattices('D r . .\nS . . .', {}, { hp: { B1: 20 } });
    const set = draft(s, (ctx) => {
      sealJar(ctx, at('B1'), duskJar('draughtsman', shoveThenFuse, 1));
      sealJar(ctx, at('C1'), duskJar('stoker', strike, 2));
    });
    return draft(set.state, (ctx) => openDuskJars(ctx));
  }

  it('replacement-jar: a jar sealed at dusk waits for the next dusk', () => {
    const dusk = duskWithReplacement();
    expectLog(dusk.events, [
      'the jar at B1 opens under rat at B1',
      'rat at B1 is pushed right to C1',
      'the jar at C1 crumbles empty',
      'Draughtsman seals a jar at C1 (opens at dusk)',
    ]);
    expect(tileAt(dusk.state, at('C1')).jar?.owner).toBe('draughtsman');
  });

  // Before FD-5 `newestSeq` was the board's max + 1: after the newest jar opened, the next one
  // reused its number (here 2).
  it('jar-ids-never-reused: a jar sealed after the newest opened gets a new id', () => {
    const start = withLattices('D . . .\n. . . .\n. . . .', {});
    let opened: Jar | null = null;
    const r = draft(start, (ctx) => {
      sealJar(ctx, at('D1'), duskJar('draughtsman', null, 1));
      sealJar(ctx, at('B2'), duskJar('draughtsman', null, 2));
      opened = structuredClone(tileAt(ctx.s, at('B2')).jar);
      openJar(ctx, at('B2'));
      sealJar(ctx, at('C3'), duskJar('draughtsman', null, 3));
    });
    const first = tileAt(r.state, at('D1')).jar;
    const third = tileAt(r.state, at('C3')).jar;
    const ids = [first?.id, (opened as Jar | null)?.id, third?.id];
    expect(ids.every((id) => id !== undefined)).toBe(true);
    expect(new Set(ids).size).toBe(3);
  });
});
