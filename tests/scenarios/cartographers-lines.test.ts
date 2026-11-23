import { describe, expect, it, test } from 'vitest';
import { type ActionRuneId, type InventionDef, LINES, type LineId } from '$data';
import {
  type BattleState,
  type Dir,
  type GameEvent,
  libraryOf,
  parseLabel,
  tileAt,
  type Unit,
} from '$engine';
import { BLANK_PIECE, PENCIL_PIECE } from '$engine/districts/cartographers/types';
import { snapshotOf } from '$engine/resolve';
import { ACTION_HANDLERS } from '$engine/runes/actions';
import { type Flow, type Step as RuneStep, type Target, targetKey } from '$engine/types';
import { act, board, cast, draft, withLattices } from './harness';

/**
 * CG-3: one firing scenario per new Cartographers line (Erase and Draw on paper); CG-F1: the paper
 * audit (footnotes audit, section 13), one firing scenario per row.
 */

const touch = (lbl: string) => ({ kind: 'tile' as const, at: parseLabel(lbl) });
const fired = (events: readonly GameEvent[]): LineId[] =>
  events.flatMap((e) => (e.line ? [e.line] : []));
const silver: InventionDef = {
  id: 'inv:erase-quicksilver',
  name: 'erase-quicksilver',
  method: 'repeat',
  parts: ['erase'],
  solvent: 'quicksilver',
};

test('erase:unit fires when Erase un-draws pencil under a foe', () => {
  const s = withLattices('D r{pencil} . . r', { draughtsman: 'Touch> Erase' });
  expect(fired(cast(s, 'draughtsman', touch('B1')).events)).toContain('erase:unit');
});

test('erase:empty fires when Erase un-draws an outline', () => {
  const s = withLattices('D {outline:surveyor@2} . . r', { draughtsman: 'Touch> Erase' });
  expect(fired(cast(s, 'draughtsman', touch('B1')).events)).toContain('erase:empty');
});

test('draw:drop fires when Draw would carry a state onto blank paper', () => {
  const s = withLattices('D o {blank} . r', { draughtsman: 'Touch> Draw' });
  expect(fired(cast(s, 'draughtsman', touch('B1')).events)).toContain('draw:drop');
});

test('quicksilver:drop fires when the mirrored Erase un-draws pencil', () => {
  const s = withLattices(
    'D {pencil} . . . {pencil} .\n. . . . . . r',
    { draughtsman: 'Touch> inv:erase-quicksilver' },
    { inventions: libraryOf([silver]) },
  );
  expect(fired(cast(s, 'draughtsman', touch('B1')).events)).toContain('quicksilver:drop');
});

// ── CG-F1: the paper audit (footnotes audit, section 13) ─────────────────────────────────────

const at = parseLabel;
const find = (s: BattleState, id: string): Unit => {
  const u = s.units.find((x) => x.id === id);
  if (!u) throw new Error(`no ${id}`);
  return u;
};
const pieceAt = (s: BattleState, lbl: string) => tileAt(s, at(lbl)).piece;
const ofType = (events: readonly GameEvent[], type: string) =>
  events.filter((e) => e.type === type);
const unitTarget = (id: string): Target => ({ kind: 'unit', unit: id });
const tileTarget = (lbl: string): Target => ({ kind: 'tile', at: at(lbl) });

interface RunOpts {
  heading?: Dir | null;
}
/** One Action's handler over targets with a hand-built Flow (as `actions.test.ts`). */
function run(s: BattleState, rune: ActionRuneId, targets: Target[], opts: RunOpts = {}) {
  return draft(s, (ctx) => {
    const flow: Flow = {
      caster: 'draughtsman',
      origin: { caster: 'draughtsman', spell: '0,0', cast: 1 },
      snapshot: snapshotOf(ctx.s),
      headings: new Map(targets.map((t) => [targetKey(t), opts.heading ?? null])),
      lay: false,
      gifted: false,
      solvent: null,
      habit: null,
      depth: 0,
      auras: [],
    };
    const step: RuneStep = {
      at: { x: 1, y: 0 },
      role: 'action',
      rune: 'strike',
      auras: [],
      next: null,
    };
    for (const t of targets) ACTION_HANDLERS[rune](ctx, t, flow, step);
  });
}

const library = libraryOf([
  {
    id: 'inv:strike-quicksilver',
    name: 'strike-quicksilver',
    method: 'repeat',
    parts: ['strike'],
    solvent: 'quicksilver',
  },
  {
    id: 'inv:draw-graphite',
    name: 'draw-graphite',
    method: 'repeat',
    parts: ['draw'],
    solvent: 'graphite',
  },
  {
    id: 'inv:erase-graphite',
    name: 'erase-graphite',
    method: 'repeat',
    parts: ['erase'],
    solvent: 'graphite',
  },
  silver,
]);
const endTurn = (s: BattleState) => act(s, { type: 'endTurn' });

/** A Jar the Joost sealed on B2, with the Pell beside it holding `lattice` (no hand-set jar). */
const jarSealed = (lattice: string): BattleState => {
  const s = withLattices('. S . .\nD . . r', {
    stoker: 'Touch> Jar Guard',
    draughtsman: lattice,
  });
  return cast(s, 'stoker', touch('B2')).state;
};

/** One scenario per live row: the events of the case that fires it. */
const FIRES: Record<string, () => readonly GameEvent[]> = {
  'swap:held': () => {
    // The Joost holds the rat, then the Pell's Swap meets the hold (no hand-set state).
    const s = withLattices('D r S', { draughtsman: 'Touch> Swap', stoker: 'Touch> Hold' });
    const held = cast(s, 'stoker', touch('B1')).state;
    return cast(held, 'draughtsman', touch('B1')).events;
  },
  'draw:noHeading': () => run(board('D o'), 'draw', [tileTarget('B1')]).events,
  'draw:edge': () => run(board('D o'), 'draw', [tileTarget('B1')], { heading: 'right' }).events,
  'draw:unit': () => run(board('D # r'), 'draw', [tileTarget('B1')], { heading: 'right' }).events,
  'draw:jar': () => cast(jarSealed('Touch> Draw'), 'draughtsman', touch('B2')).events,
  'draw:drop': () =>
    run(board('D o {blank} . r'), 'draw', [tileTarget('B1')], { heading: 'right' }).events,
  'erase:mark': () => run(board('D r!'), 'erase', [unitTarget('rat-1')]).events,
  'erase:deepMark': () => run(board('D r!!'), 'erase', [unitTarget('rat-1')]).events,
  'erase:collar': () => {
    // A cast collar (a born one is part of the creature): the Joost's Brass, then the Erase.
    const s = withLattices('D r S', { draughtsman: 'Touch> Erase', stoker: 'Touch> Brass' });
    const collared = cast(s, 'stoker', touch('B1')).state;
    return cast(collared, 'draughtsman', touch('B1')).events;
  },
  'erase:shackle': () => run(board('D r$'), 'erase', [unitTarget('rat-1')]).events,
  'erase:jar': () => cast(jarSealed('Touch> Erase'), 'draughtsman', touch('B2')).events,
  'erase:unit': () => run(board('D r{pencil}'), 'erase', [unitTarget('rat-1')]).events,
  'erase:empty': () => run(board('D {outline:surveyor@2}'), 'erase', [tileTarget('B1')]).events,
  'quicksilver:edge': () => {
    const s = withLattices(
      'D d . . . d .',
      { draughtsman: 'Bolt> inv:strike-quicksilver' },
      { inventions: library, hp: { B1: 9, F1: 9 } },
    );
    return cast(s, 'draughtsman', 'right').events;
  },
  'quicksilver:drop': () => {
    const s = withLattices(
      'D {pencil} . . . {pencil} .\n. . . . . . r',
      { draughtsman: 'Touch> inv:erase-quicksilver' },
      { inventions: library },
    );
    return cast(s, 'draughtsman', touch('B1')).events;
  },
  'swap:unit': () =>
    cast(
      withLattices('D r{pencil:rub@2} . . r', { draughtsman: 'Touch> Swap' }),
      'draughtsman',
      touch('B1'),
    ).events,
  'graphite:unit': () => {
    const s = withLattices(
      'D o . r',
      { draughtsman: 'Touch> inv:draw-graphite' },
      { inventions: library },
    );
    return endTurn(cast(s, 'draughtsman', touch('B1')).state).events;
  },
};

/** Rows with final text and no stamp yet: each has a behaviour test below and a failing `fires` test. */
const PENDING: string[] = [];

describe('CG-F1 the paper audit', () => {
  test('CG-F1: every cartographers line row has a firing scenario', () => {
    const rows = (pending: boolean) =>
      LINES.filter((l) => l.district === 'cartographers' && !!l.pending === pending).map(
        (l) => l.id,
      );
    // The table and the rows agree both ways, so a new row cannot land without a scenario.
    expect(Object.keys(FIRES).sort()).toEqual(rows(false).sort());
    expect(rows(true).sort()).toEqual([...PENDING].sort());
    for (const id of rows(false)) expect(fired(FIRES[id]?.() ?? []), id).toContain(id);
  });

  test('CG-F1: swap:unit behaviour: Swap trades the places, the pencil stays on its tile', () => {
    const s = withLattices('D r{pencil:rub@2} . . r', { draughtsman: 'Touch> Swap' });
    const r = cast(s, 'draughtsman', touch('B1'));
    expect(find(r.state, 'draughtsman').pos).toEqual(at('B1'));
    expect(find(r.state, 'rat-1').pos).toEqual(at('A1'));
    expect(pieceAt(r.state, 'B1')).toEqual({ id: PENCIL_PIECE, data: { fate: 'rub', due: 2 } });
    expect(pieceAt(r.state, 'A1')).toBeNull();
    // An outline is solid, so no unit stands on one and a Swap at it finds nobody. A pencil tile
    // with nobody on it is the same: nothing happens, silently.
    const none = cast(
      withLattices('D {pencil} . . r', { draughtsman: 'Touch> Swap' }),
      'draughtsman',
      touch('B1'),
    );
    expect(ofType(none.events, 'swapped')).toHaveLength(0);
    expect(find(none.state, 'draughtsman').pos).toEqual(at('A1'));
  });

  it('CG-F1: swap:unit fires when a Swap trades places across pencil', () => {
    const s = withLattices('D r{pencil:rub@2} . . r', { draughtsman: 'Touch> Swap' });
    expect(fired(cast(s, 'draughtsman', touch('B1')).events)).toContain('swap:unit');
  });

  test('CG-F1: draw behaviour: a state drawn onto pencil or an outline rests there; the paper stays', () => {
    for (const paper of ['{pencil}', '{outline:eraser@2}']) {
      const s = withLattices(`D o ${paper} . r`, { draughtsman: 'Touch> Draw' });
      const r = cast(s, 'draughtsman', touch('B1'));
      expect(tileAt(r.state, at('C1')).state?.id, paper).toBe('slick');
      expect(pieceAt(r.state, 'C1')?.id, paper).toMatch(/^cartographers:(pencil|outline)$/);
      expect(fired(r.events)).not.toContain('draw:drop');
    }
  });

  test('CG-F1: quicksilver behaviour: the mirror un-draws a pencil or an outline and leaves inked and blank paper alone', () => {
    const erase = (mirror: string) =>
      cast(
        withLattices(
          `D {pencil} . . . ${mirror} .\n. . . . . . r`,
          { draughtsman: 'Touch> inv:erase-quicksilver' },
          { inventions: library },
        ),
        'draughtsman',
        touch('B1'),
      );
    const outline = erase('{outline:eraser@2}');
    expect(fired(outline.events)).toContain('quicksilver:drop');
    expect(pieceAt(outline.state, 'F1')).toEqual({
      id: PENCIL_PIECE,
      data: { fate: null, due: null },
    });
    for (const mirror of ['.', '{blank}']) {
      const r = erase(mirror);
      expect(fired(r.events), mirror).not.toContain('quicksilver:drop');
      expect(ofType(r.events, 'cartographers:undrawn'), mirror).toHaveLength(1);
    }
  });

  test('CG-F1: erase behaviour: an empty pencil tile is un-drawn too, and what it held goes with it', () => {
    const bare = cast(
      withLattices('D {pencil} . . r', { draughtsman: 'Touch> Erase' }),
      'draughtsman',
      touch('B1'),
    );
    expect(ofType(bare.events, 'cartographers:undrawn')[0]).toMatchObject({
      line: 'erase:unit',
      data: { was: 'pencil', units: [] },
    });
    const oily = cast(
      withLattices('D o{pencil} . . r', { draughtsman: 'Touch> Erase' }),
      'draughtsman',
      touch('B1'),
    );
    expect(pieceAt(oily.state, 'B1')?.id).toBe(BLANK_PIECE);
    expect(tileAt(oily.state, at('B1')).state).toBeNull();
  });

  it('CG-F1: graphite does not put a state back on blank paper', () => {
    const s = withLattices(
      'D o{pencil} . . r',
      { draughtsman: 'Touch> inv:erase-graphite' },
      { inventions: library },
    );
    const next = endTurn(cast(s, 'draughtsman', touch('B1')).state);
    expect(pieceAt(next.state, 'B1')?.id).toBe(BLANK_PIECE);
    expect(tileAt(next.state, at('B1')).state).toBeNull();
  });
});
