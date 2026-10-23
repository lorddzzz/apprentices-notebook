import { expect, test } from 'vitest';
import { RUNE_IDS } from '$data';
import {
  compileLattice,
  createBattle,
  describeLog,
  emptyRecord,
  type GlyphDef,
  type GlyphInside,
  glyphLibrary,
  growingLattice,
  innerFired,
  innerMeta,
  insideIssues,
  insideOf,
  latticeOf,
  newProfile,
  newSave,
  type PlacedRune,
  type Profile,
  pageOf,
  recordGlyphCasts,
  recordOf,
  revertGlyph,
  reviseGlyph,
  revisionCanvas,
  setExtraExit,
  setMemberLattice,
  setOpenCells,
} from '$engine';
import { parseSaveText, saveText } from '../../src/app/save';
import { cast, expectLogIncludes } from './harness';

const straight: GlyphInside = {
  kind: 'spell',
  entry: { x: 0, y: 0 },
  cells: [
    { at: { x: 0, y: 0 }, rune: 'bolt', dir: 'right' },
    ...Array.from({ length: 6 }, (_, i): PlacedRune => ({ at: { x: i + 1, y: 0 }, rune: 'ink' })),
    { at: { x: 7, y: 0 }, rune: 'strike' },
  ],
};
const bent: GlyphInside = {
  kind: 'spell',
  entry: { x: 0, y: 0 },
  cells: [
    { at: { x: 0, y: 0 }, rune: 'bolt', dir: 'right' },
    { at: { x: 1, y: 0 }, rune: 'bend', dir: 'up' },
    { at: { x: 1, y: -1 }, rune: 'bend', dir: 'left' },
    { at: { x: 0, y: -1 }, rune: 'ink' },
    { at: { x: -1, y: -1 }, rune: 'oil' },
    { at: { x: -2, y: -1 }, rune: 'spark' },
    { at: { x: -3, y: -1 }, rune: 'strike' },
    { at: { x: -4, y: -1 }, rune: 'guard' },
  ],
};
const definition = (inside: GlyphInside): GlyphDef => ({
  id: 'g1',
  name: 'Growing inside',
  version: 1,
  ...inside,
  ...innerMeta(inside),
  params: [],
  extraExit: null,
});
function household(def: GlyphDef): Profile {
  return {
    ...newProfile(),
    known: [...RUNE_IDS],
    glyphs: [def],
    glyphRecords: { 'g1@1': emptyRecord() },
    ink: 1000,
  };
}
function reload(profile: Profile): Profile {
  return parseSaveText(saveText({ ...newSave(4), profile })).profile;
}
function castPage(profile: Profile) {
  const spells = compileLattice(latticeOf(profile, 'draughtsman'), glyphLibrary(profile)).spells;
  const battle = createBattle({
    title: 'Growing Glyph',
    seed: 8,
    board: 'D . d .',
    lab: true,
    party: { draughtsman: { spells } },
  }).state;
  return cast(battle, 'draughtsman', 'right', '-10,5');
}

test('revision reaching local x=7 casts like its flat counterpart and survives save/revert', () => {
  const old = definition({ ...straight, cells: straight.cells.slice(0, 3) });
  let profile = household(old);
  const before = structuredClone(profile);
  revisionCanvas(straight);
  expect(profile).toEqual(before);
  profile = reviseGlyph(profile, 'g1', straight);
  profile = setMemberLattice(
    profile,
    'draughtsman',
    growingLattice([{ at: { x: -10, y: 5 }, glyph: 'g1', dir: 'right' }]),
  );
  expect(profile.glyphs[0]?.version).toBe(2);
  expect(insideIssues(straight)).toEqual([]);
  expect(profile.glyphs[0]?.exits).toEqual([{ from: { x: 7, y: 0 }, dir: 'right' }]);
  const result = castPage(reload(profile));
  expectLogIncludes(result.events, ['Draughtsman casts Bolt right', 'bolt aims at dummy-1']);
  expect(innerFired(result.events, 'g1')).toContain('7,0');
  const flat = compileLattice(growingLattice(straight.cells)).spells;
  const flatCast = cast(
    createBattle({
      title: 'Flat',
      seed: 8,
      board: 'D . d .',
      lab: true,
      party: { draughtsman: { spells: flat } },
    }).state,
    'draughtsman',
    'right',
    '0,0',
  );
  expect(describeLog(result.events)).toEqual(describeLog(flatCast.events));
  const reverted = revertGlyph(reload(profile), 'g1', 1);
  expect(reverted.glyphs[0]).toEqual(old);
  expect(reverted.glyphArchive[0]?.cells).toEqual(straight.cells);
});

test('signed open cells, args, fired counts and active rewards keep their version identity through revision and revert', () => {
  const old = definition(bent);
  let profile = household(old);
  const record = {
    ...emptyRecord(),
    casts: 9,
    harm: 20,
    meaningful: 8,
    best: { economy: 1 as const, reliability: 2 as const },
    fired: { '-1,-1': 8 },
  };
  profile.glyphRecords['g1@1'] = record;
  profile = setOpenCells(profile, 'g1', ['-1,-1']);
  profile = setExtraExit(profile, 'g1', 'up');
  profile = setMemberLattice(
    profile,
    'draughtsman',
    growingLattice([
      { at: { x: -10, y: 5 }, glyph: 'g1', dir: 'right', args: { '-1,-1': { rune: 'ink' } } },
    ]),
  );
  const original = reload(profile);
  expect(glyphLibrary(original).g1?.extraExit).toBe('up');
  expect(glyphLibrary(original).g1?.discount).toBe(1);
  const revisedInside: GlyphInside = {
    ...bent,
    cells: bent.cells.map((cell) => (cell.at.x === -4 ? { ...cell, rune: 'strike' } : cell)),
  };
  const revised = reload(reviseGlyph(original, 'g1', revisedInside));
  expect(revised.glyphs[0]?.params).toEqual(['-1,-1']);
  expect(revised.glyphs[0]?.exits).toEqual([{ from: { x: -4, y: -1 }, dir: 'left' }]);
  expect(revised.glyphs[0]?.extraExit).toBe('up');
  expect(glyphLibrary(revised).g1?.extraExit).toBeNull();
  expect(glyphLibrary(revised).g1?.discount ?? 0).toBe(0);
  expect(pageOf(revised, 'draughtsman')[0]).toMatchObject({
    at: { x: -10, y: 5 },
    args: { '-1,-1': { rune: 'ink' } },
  });
  expect(recordOf(revised, 'g1', 1)).toEqual(record);
  expect(recordOf(revised, 'g1', 2)).toEqual(emptyRecord());
  const result = castPage(revised);
  expect(innerFired(result.events, 'g1')).toContain('-1,-1');
  const flatCells = revisedInside.cells.map(
    (cell): PlacedRune =>
      cell.at.x === -1 && cell.at.y === -1 ? { at: cell.at, rune: 'ink' } : cell,
  );
  const flat = compileLattice(growingLattice(flatCells)).spells;
  const flatCast = cast(
    createBattle({
      title: 'Flat signed',
      seed: 8,
      board: 'D . d .',
      lab: true,
      party: { draughtsman: { spells: flat } },
    }).state,
    'draughtsman',
    'right',
    '0,0',
  );
  expect(describeLog(result.events)).toEqual(describeLog(flatCast.events));
  const recorded = reload(recordGlyphCasts(revised, result.events));
  expect(recordOf(recorded, 'g1', 2).fired['-1,-1']).toBe(1);
  const snapshot = structuredClone(recorded.glyphRecords);
  revisionCanvas(insideOf(recorded.glyphs[0] ?? old));
  expect(recorded.glyphRecords).toEqual(snapshot);
  const back = reload(revertGlyph(recorded, 'g1', 1));
  expect(back.glyphs[0]).toEqual(original.glyphs[0]);
  expect(back.glyphRecords).toEqual(recorded.glyphRecords);
  expect(pageOf(back, 'draughtsman')[0]).toEqual(pageOf(original, 'draughtsman')[0]);
  expect(glyphLibrary(back).g1?.extraExit).toBe('up');
  expect(glyphLibrary(back).g1?.discount).toBe(1);
  expect(innerFired(castPage(back).events, 'g1')).toContain('-1,-1');
});

test('many admitted eight-cell Spell Glyph placements retain sparse Source identities and real cast behavior', () => {
  let profile = household(definition(straight));
  profile = setMemberLattice(
    profile,
    'draughtsman',
    growingLattice(
      Array.from({ length: 256 }, (_, i) => ({
        at: { x: -10 + i * 40, y: 5 },
        glyph: 'g1',
        dir: 'right',
      })),
    ),
  );
  const admitted = reload(profile);
  const compiled = compileLattice(latticeOf(admitted, 'draughtsman'), glyphLibrary(admitted));
  expect(compiled.spells).toHaveLength(256);
  expect(compiled.spells[0]?.key).toBe('-10,5');
  expect(compiled.spells.at(-1)?.key).toBe('10190,5');
  expect(compiled.spells.every((spell) => spell.path.length === 8)).toBe(true);
  const result = castPage(admitted);
  expectLogIncludes(result.events, ['Draughtsman casts Bolt right', 'bolt aims at dummy-1']);
  expect(innerFired(result.events, 'g1')).toContain('7,0');
});
