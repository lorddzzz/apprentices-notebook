import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import {
  applyAction,
  beginEncounter,
  closeBattle,
  compileLattice,
  finishEncounter,
  freeIdiomCompile,
  type GlyphDef,
  glyphLibrary,
  latticeOf,
  newProfile,
  parseLattice,
  recordTripCasts,
  recordTripProof,
  reviseGlyph,
  rollOffers,
  type SpellNode,
  setMemberLattice,
  startTrip,
  validateLoadout,
} from '$engine';
import { resolveScreen } from '../../src/app/flow';
import { parseHash } from '../../src/app/routes';
import { parseSaveText } from '../../src/app/save';
import { glyphSlots, setGlyphArgs } from '../../src/app/study';

/** W0 contracts for glyph mastery (plan §2): the hooks are wired and neutral until filled in. */

const glyph = (over: Partial<GlyphDef> = {}): GlyphDef => ({
  id: 'p',
  name: 'Kink',
  kind: 'payload',
  cells: [
    { at: { x: 0, y: 0 }, rune: 'ink' },
    { at: { x: 1, y: 0 }, rune: 'bend', dir: 'down' },
    { at: { x: 1, y: 1 }, rune: 'spark' },
  ],
  entry: { x: 0, y: 0 },
  exits: [],
  idiom: null,
  version: 1,
  params: [],
  extraExit: null,
  ...over,
});

const fixture = () =>
  parseSaveText(
    readFileSync(new URL('../fixtures/glyph-mastery-save.json', import.meta.url), 'utf8'),
  );

function walk(nodes: readonly SpellNode[]): SpellNode[] {
  return nodes.flatMap((n) => [n, ...walk(n.next)]);
}

test('a node inside a Glyph lists the local shape cells it was reached through (viaInner)', () => {
  const lib = { p: glyph() };
  const [spell] = compileLattice(parseLattice('Bolt> G:p> . .\n.    .    . .'), [], lib).spells;
  const nodes = walk(spell?.nodes ?? []);
  const ink = nodes.find((n) => n.rune === 'ink');
  const spark = nodes.find((n) => n.rune === 'spark');
  expect(ink?.viaInner).toBeUndefined();
  expect(spark).toMatchObject({ inner: { x: 1, y: 1 }, viaInner: [{ x: 1, y: 0 }] });
});

test('outside a Glyph no node has viaInner', () => {
  const [spell] = compileLattice(parseLattice('Bolt> Bendv\n.     Spark'), []).spells;
  expect(walk(spell?.nodes ?? []).every((n) => n.viaInner === undefined)).toBe(true);
});

test('the effective Glyph library equals the saved Glyphs while nothing is earned', () => {
  const p = { ...newProfile(), glyphs: [glyph()] };
  expect(glyphLibrary(p)).toEqual({ p: glyph() });
  expect('discount' in (glyphLibrary(p).p ?? {})).toBe(false);
});

test('a placed Glyph keeps its arguments through the profile, as a copy', () => {
  const p0 = { ...newProfile(), glyphs: [glyph({ params: ['1,1'] })] };
  const args = { '1,1': { rune: 'oil' as const } };
  const l = latticeOf(p0, 'stoker');
  const p = setMemberLattice(p0, 'stoker', {
    shape: l.shape,
    runes: [{ at: { x: 1, y: 2 }, glyph: 'p', dir: 'right', args }],
  });
  const placed = latticeOf(p, 'stoker').runes[0];
  expect(placed).toEqual({ at: { x: 1, y: 2 }, glyph: 'p', dir: 'right', args });
  expect(placed && 'args' in placed ? placed.args : null).not.toBe(args);
});

test('setGlyphArgs sets and clears the arguments of a placed Glyph', () => {
  const save = fixture();
  const at = { x: 1, y: 1 };
  const set = setGlyphArgs(save.profile, 'draughtsman', at, { '1,0': { rune: 'ink' } });
  expect(latticeOf(set, 'draughtsman').runes.find((r) => r.at.x === 1 && r.at.y === 1)).toEqual({
    at,
    glyph: 'g2',
    dir: 'right',
    args: { '1,0': { rune: 'ink' } },
  });
  // The default (Oil) isn't stored, so the cell follows the Glyph's next revision.
  const pinned = setGlyphArgs(save.profile, 'draughtsman', at, { '1,0': { rune: 'oil' } });
  const plain = latticeOf(pinned, 'draughtsman').runes.find((r) => r.at.x === 1 && r.at.y === 1);
  expect(plain && 'args' in plain).toBe(false);
  const cleared = setGlyphArgs(set, 'draughtsman', at, {});
  const bare = latticeOf(cleared, 'draughtsman').runes.find((r) => r.at.x === 1 && r.at.y === 1);
  expect(bare && 'args' in bare).toBe(false);
  expect(() => setGlyphArgs(save.profile, 'draughtsman', { x: 4, y: 0 }, {})).toThrow();
});

test('a revision that closes an open cell drops the arguments pages held for it', () => {
  const p = fixture().profile;
  // Kindle's open cell 1,0 (Oil, a Material) becomes a Bend: the cell closes, Steam on the page goes.
  const revised = reviseGlyph(p, 'g2', {
    kind: 'payload',
    entry: { x: 0, y: 0 },
    cells: [
      { at: { x: 0, y: 0 }, rune: 'ink' },
      { at: { x: 1, y: 0 }, rune: 'bend', dir: 'right' },
      { at: { x: 2, y: 0 }, rune: 'spark' },
    ],
  });
  const placed = latticeOf(revised, 'draughtsman').runes.find((r) => r.at.x === 1 && r.at.y === 1);
  expect(placed && 'args' in placed).toBe(false);
  const issues = Object.values(validateLoadout(revised)).flat();
  expect(issues.filter((i) => i?.kind === 'arg')).toEqual([]);
});

test('Fair copy slots carry the best tiers and the open cell count', () => {
  const slots = glyphSlots(fixture().profile, 'draughtsman');
  expect(slots.map((s) => [s.glyph.id, s.tiers, s.open])).toEqual([
    ['g1', { economy: 2, reliability: 3 }, 0],
    ['g2', { economy: 1, reliability: 2 }, 1],
    ['g3', { economy: 0, reliability: 0 }, 0],
  ]);
});

test("a repaired draft's Glyph doesn't use up an idiom's free first compile", () => {
  const cashing = glyph({ id: 'd', idiom: 'cashingIn', draft: 'lamplighter' });
  expect(freeIdiomCompile({ glyphs: [cashing] }, 'cashingIn')).toBe(true);
  expect(freeIdiomCompile({ glyphs: [{ ...cashing, draft: undefined }] }, 'cashingIn')).toBe(false);
  expect(freeIdiomCompile({ glyphs: [] }, null)).toBe(false);
});

test('a player cast ends with a trace carrying spans', () => {
  const p = newProfile();
  const t = startTrip(p, 3);
  const b = beginEncounter(p, t);
  const d = b.state.units.find((u) => u.kind === 'member' && u.id === 'draughtsman');
  if (d?.kind !== 'member') throw new Error('no draughtsman');
  const spell = d.spells[0];
  if (!spell) throw new Error('no spell');
  const r = applyAction(b.state, {
    type: 'cast',
    unit: d.id,
    spell: spell.key,
    aim: { kind: 'dir', dir: 'right' },
  });
  const trace = r.events.find((e) => e.type === 'trace');
  expect(trace && 'spans' in trace ? trace.spans.length : 0).toBeGreaterThan(0); // E1: the source's span at least
});

test('closeBattle = recordTripCasts → finishEncounter, with no tier-ups yet', () => {
  const p = newProfile();
  const t = startTrip(p, 11);
  const b = structuredClone(beginEncounter(p, t).state);
  b.phase = 'won';
  for (const u of b.units) if (u.kind === 'enemy') u.hp = 0;
  const closed = closeBattle(p, t, b);
  expect(closed).toEqual(finishEncounter(recordTripCasts(p, t), t, b));
  expect(closed.stats.elegance).toEqual([]);
  expect(recordTripProof).toBe(recordTripCasts);
});

test('with no draft due, offers are what they were', () => {
  for (const table of ['shallow', 'deep', 'heart'] as const) {
    expect(rollOffers(5, 1, table, undefined, null)).toEqual(rollOffers(5, 1, table));
    expect(rollOffers(5, 1, table).some((o) => o.kind === 'draft')).toBe(false);
  }
});

test('the desk is a route of the study, closed on a trip', () => {
  expect(parseHash('#/desk').route).toBe('desk');
  expect(resolveScreen('desk', null, null)).toEqual({ screen: 'desk', redirect: null });
  const trip = startTrip(newProfile(), 1);
  expect(resolveScreen('desk', trip, null).screen).toBe('battle');
});
