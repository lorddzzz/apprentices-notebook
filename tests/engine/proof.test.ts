import { expect, test } from 'vitest';
import {
  compileLattice,
  type FiredCell,
  type GameEvent,
  type GlyphLibrary,
  masksFrom,
  parseLattice,
} from '$engine';
import { act, board, cast, withLattices } from '../scenarios/harness';

/**
 * Proof masks come from `trace` events (plan P6/P7). W0b: a cast's trace names its source; E1's
 * `runStep` adds the steps that ran and the shape cells walked to them, and makes it meaningful.
 */

const c = (x: number, y: number) => ({ x, y });
const traces = (events: readonly GameEvent[]) =>
  events.flatMap((e) => (e.type === 'trace' ? [e] : []));
const only = (events: readonly GameEvent[]) => {
  const [t, ...rest] = traces(events);
  if (!t || rest.length > 0) throw new Error('expected exactly one trace');
  return t;
};
const who = { id: 'draughtsman', name: 'Draughtsman', at: c(0, 0), member: true };
const trace = (cells: FiredCell[], meaningful = true, id = 'draughtsman'): GameEvent => ({
  type: 'trace',
  caster: { ...who, id },
  spell: '0,0',
  cells,
  meaningful,
  spans: [],
});

test('a player cast ends with one silent trace that names its source', () => {
  const s = withLattices('D . d', { draughtsman: 'Bolt> Ink Tally Spark' });
  const r = cast(s, 'draughtsman', 'right');
  expect(r.events.at(-1)?.type).toBe('trace');
  const t = only(r.events);
  expect(t.spell).toBe('0,0');
  expect(t.caster.id).toBe('draughtsman');
  expect(t.cells[0]).toEqual({ at: c(0, 0), rune: 'bolt', dir: 'right' });
  expect(r.lines.join('\n')).not.toContain('trace');
});

test('a miss is not meaningful', () => {
  const s = withLattices('D . .', { draughtsman: 'Bolt>' });
  const t = only(cast(s, 'draughtsman', 'right').events);
  expect(t.meaningful).toBe(false);
  expect(t.cells.map((x) => x.rune)).toEqual(['bolt']);
});

test('inside a Glyph the trace names the socket and the Glyph, once', () => {
  const lib: GlyphLibrary = {
    s: {
      id: 's',
      name: 's',
      kind: 'spell',
      cells: [
        { at: c(0, 0), rune: 'bolt', dir: 'right' },
        { at: c(1, 0), rune: 'ink' },
        { at: c(2, 0), rune: 'spark' },
      ],
      entry: c(0, 0),
      exits: [],
      idiom: null,
      version: 1,
      params: [],
      extraExit: null,
    },
  };
  const spells = compileLattice(parseLattice('G:s> .'), lib).spells;
  const s = board('D . d', { party: { draughtsman: { spells } } });
  const t = only(cast(s, 'draughtsman', 'right').events);
  expect(t.cells).toEqual([{ at: c(0, 0), rune: null, glyph: 's', dir: 'right' }]);
});

test('masksFrom: the meaningful casts of one member, in order', () => {
  const ink = [
    { at: c(0, 0), rune: 'bolt', dir: 'right' },
    { at: c(1, 0), rune: 'ink' },
  ] satisfies FiredCell[];
  const bolt = ink[0] as FiredCell;
  const log = [trace(ink), trace([bolt], false), trace([bolt], true, 'stoker')];
  const masks = masksFrom(log, 'draughtsman');
  expect(masks).toHaveLength(1);
  expect(masks[0]?.map((x) => x.rune)).toEqual(['bolt', 'ink']);
  expect(masksFrom(log, 'stoker')).toHaveLength(1);
});

test('mask cells are plain data: clones survive structuredClone', () => {
  const t = only(
    cast(withLattices('D . d', { draughtsman: 'Bolt> Ink' }), 'draughtsman', 'right').events,
  );
  const copy: FiredCell[] = structuredClone(t.cells);
  expect(copy).toEqual(t.cells);
});

test('later meaningful effects prove their original cast once, without proving a neighbour', () => {
  const origin = { caster: 'draughtsman', spell: '0,0', cast: 1 };
  const cells: FiredCell[] = [{ at: c(0, 0), rune: 'bolt', dir: 'right' }];
  const first = { ...trace(cells, false), origin };
  const next = { ...trace(cells, false), origin: { ...origin, cast: 2 } };
  const effect: GameEvent = { type: 'held', unit: who, origin };
  expect(masksFrom([first, next, effect, effect], 'draughtsman')).toEqual([cells]);
});

test('a Fuse tail joins its original proof mask and trip cast only after opening', () => {
  const sealed = cast(
    withLattices('D . d', { draughtsman: 'Bolt> Fuse Oil Spark' }),
    'draughtsman',
    'right',
  );
  expect(masksFrom(sealed.events, 'draughtsman')[0]?.map((c) => c.rune)).toEqual(['bolt', 'fuse']);
  const dusk = act(sealed.state, { type: 'endTurn' });
  const masks = masksFrom([...sealed.events, ...dusk.events], 'draughtsman');
  expect(masks).toHaveLength(1);
  expect(masks[0]?.map((c) => c.rune)).toEqual(['bolt', 'fuse', 'oil', 'spark']);
});
