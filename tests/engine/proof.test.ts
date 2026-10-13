import { expect, test } from 'vitest';
import {
  compileLattice,
  type FiredCell,
  type GameEvent,
  type GlyphLibrary,
  masksFrom,
  parseLattice,
} from '$engine';
import { runEchoes } from '$engine/cast';
import { board, cast, draft, withLattices } from '../scenarios/harness';

const c = (x: number, y: number) => ({ x, y });
const traces = (events: readonly GameEvent[]) =>
  events.flatMap((e) => (e.type === 'trace' ? [e] : []));
const only = (events: readonly GameEvent[]) => {
  const [t, ...rest] = traces(events);
  if (!t || rest.length > 0) throw new Error('expected exactly one trace');
  return t;
};

test('a player cast ends with one silent trace of the cells that fired', () => {
  const s = withLattices('D . d', { draughtsman: 'Bolt> Ink OnInked Spark' });
  const r = cast(s, 'draughtsman', 'right');
  expect(r.events.at(-1)?.type).toBe('trace');
  const t = only(r.events);
  expect(t.spell).toBe('0,0');
  expect(t.caster.id).toBe('draughtsman');
  expect(t.meaningful).toBe(true);
  expect(t.cells).toEqual([
    { at: c(0, 0), rune: 'bolt', dir: 'right' },
    { at: c(1, 0), rune: 'ink' },
    { at: c(2, 0), rune: 'onInked' },
    { at: c(3, 0), rune: 'spark' },
  ]);
  expect(r.lines.join('\n')).not.toContain('trace');
});

test('a trigger that fails still fired; the nodes after it did not', () => {
  const s = withLattices('D . d', { draughtsman: 'Bolt> OnInked Spark' });
  const t = only(cast(s, 'draughtsman', 'right').events);
  expect(t.cells.map((x) => x.rune)).toEqual(['bolt', 'onInked']);
  expect(t.meaningful).toBe(true); // the bolt still hit
});

test('shape cells walked to a node that ran are in the mask, with the Bend arrow', () => {
  const s = withLattices('D . d', { draughtsman: 'Bolt> Bendv\n.     Ink' });
  const t = only(cast(s, 'draughtsman', 'right').events);
  expect(t.cells).toEqual([
    { at: c(0, 0), rune: 'bolt', dir: 'right' },
    { at: c(1, 0), rune: 'bend', dir: 'down' },
    { at: c(1, 1), rune: 'ink' },
  ]);
});

test('a Fork cell is listed once however many branches ran through it', () => {
  const s = withLattices('D . d', { draughtsman: '. Ink\nBolt> Fork\n. Oil' });
  const t = only(cast(s, 'draughtsman', 'right').events);
  expect(t.cells.filter((x) => x.rune === 'fork')).toHaveLength(1);
  expect(t.cells.map((x) => x.rune).sort()).toEqual(['bolt', 'fork', 'ink', 'oil']);
});

test('a miss is not meaningful', () => {
  const s = withLattices('D . .', { draughtsman: 'Bolt>' });
  const t = only(cast(s, 'draughtsman', 'right').events);
  expect(t.meaningful).toBe(false);
  expect(t.cells.map((x) => x.rune)).toEqual(['bolt']);
});

test('an echo recast leaves no trace', () => {
  const s = withLattices('D . d', { draughtsman: 'Echo Bolt>' });
  const first = cast(s, 'draughtsman', 'right');
  expect(traces(first.events)).toHaveLength(1);
  expect(first.state.echoes).toHaveLength(1);
  const echoed = draft(first.state, (ctx) => runEchoes(ctx));
  expect(echoed.events.some((e) => e.type === 'cast')).toBe(true);
  expect(traces(echoed.events)).toHaveLength(0);
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
    },
  };
  const spells = compileLattice(parseLattice('G:s> .'), [], lib).spells;
  const s = board('D . d', { party: { draughtsman: { spells } } });
  const t = only(cast(s, 'draughtsman', 'right').events);
  expect(t.cells).toEqual([{ at: c(0, 0), rune: null, glyph: 's', dir: 'right' }]);
});

test('masksFrom: the meaningful casts of one member, in order', () => {
  const s = withLattices('D . d', { draughtsman: 'Bolt> Ink' });
  const hit = cast(s, 'draughtsman', 'right');
  const miss = cast(withLattices('D . .', { draughtsman: 'Bolt>' }), 'draughtsman', 'right');
  const log = [...hit.events, ...miss.events];
  const masks = masksFrom(log, 'draughtsman');
  expect(masks).toHaveLength(1);
  expect(masks[0]?.map((x) => x.rune)).toEqual(['bolt', 'ink']);
  expect(masksFrom(log, 'stoker')).toEqual([]);
});

test('shield gained and tile changes count as meaningful', () => {
  const ward = withLattices('D S', { draughtsman: 'Ward>' });
  const aim = { kind: 'ally', unit: 'stoker' } as const;
  expect(only(cast(ward, 'draughtsman', aim).events).meaningful).toBe(true);
  const oil = withLattices('D . .', { draughtsman: 'Splash> Oil' });
  const tile = { kind: 'tile', at: c(2, 0) } as const;
  expect(only(cast(oil, 'draughtsman', tile).events).meaningful).toBe(true);
});

test('mask cells are plain data: clones survive structuredClone', () => {
  const t = only(
    cast(withLattices('D . d', { draughtsman: 'Bolt> Ink' }), 'draughtsman', 'right').events,
  );
  const copy: FiredCell[] = structuredClone(t.cells);
  expect(copy).toEqual(t.cells);
});
