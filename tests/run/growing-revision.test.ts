import { expect, test } from 'vitest';
import {
  emptyRecord,
  type GlyphDef,
  type GlyphInside,
  innerMeta,
  insideIssues,
  newProfile,
  recordOf,
  revertGlyph,
  reviseGlyph,
  revisionCanvas,
} from '$engine';
import { canvasCells, placeRune } from '../../src/app/revision';

const straight: GlyphInside = {
  kind: 'spell',
  entry: { x: 0, y: 0 },
  cells: [
    { at: { x: 0, y: 0 }, rune: 'bolt', dir: 'right' },
    ...Array.from({ length: 7 }, (_, i) => ({ at: { x: i + 1, y: 0 }, rune: 'ink' as const })),
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
    { at: { x: -2, y: -1 }, rune: 'strike' },
  ],
};
test('eight flow cells reach x=7 with free blank margin; a ninth fails size independently', () => {
  expect(insideIssues(straight)).toEqual([]);
  expect(revisionCanvas(straight)).toEqual({ origin: { x: -1, y: -1 }, width: 10, height: 3 });
  expect(innerMeta(straight).exits).toEqual([{ from: { x: 7, y: 0 }, dir: 'right' }]);
  const ninth = placeRune(straight, { x: 8, y: 0 }, 'ink', [{ rune: 'ink', count: null }]);
  expect(ninth.message).toBeNull();
  expect(insideIssues(ninth.inside).map((i) => i.kind)).toEqual(['size']);
});
test('negative bends retain real walk exits', () => {
  expect(insideIssues(bent)).toEqual([]);
  expect(innerMeta(bent).exits).toEqual([{ from: { x: -2, y: -1 }, dir: 'left' }]);
});
test('sparse canvas helper uses a bounded window, with cheap old-editor fallback', () => {
  const distant: GlyphInside = {
    ...straight,
    cells: [...straight.cells, { at: { x: -1000000000, y: 1000000000 }, rune: 'coil' }],
  };
  expect(canvasCells(distant)).toHaveLength(9);
  const window = { origin: { x: -3, y: -2 }, width: 2, height: 2 };
  expect(canvasCells(distant, window, 4)).toEqual([
    { x: -3, y: -2 },
    { x: -2, y: -2 },
    { x: -3, y: -1 },
    { x: -2, y: -1 },
  ]);
  expect(() => canvasCells(distant, window, 3)).toThrow(/window/);
});
test('grown revision saves one new version and reverting restores definitions and records exactly', () => {
  const original: GlyphDef = {
    id: 'g1',
    name: 'Grown',
    version: 1,
    ...bent,
    ...innerMeta(bent),
    params: ['-1,-1'],
    extraExit: 'up',
  };
  const record = { ...emptyRecord(), casts: 12, fired: { '-1,-1': 7 } };
  const base = { ...newProfile(), glyphs: [original], glyphRecords: { 'g1@1': record } };
  // Merely computing framing/windows changes no definition, record or version.
  revisionCanvas(original);
  canvasCells(original);
  expect(base.glyphs[0]).toBe(original);
  expect(base.glyphRecords['g1@1']).toBe(record);
  const saved = reviseGlyph(base, 'g1', straight);
  expect(saved.glyphs[0]?.version).toBe(2);
  expect(saved.glyphArchive).toEqual([original]);
  expect(recordOf(saved, 'g1', 1)).toEqual(record);
  expect(recordOf(saved, 'g1', 2)).toEqual(emptyRecord());
  const restored = revertGlyph(saved, 'g1', 1);
  expect(restored.glyphs[0]).toEqual(original);
  expect(restored.glyphRecords).toEqual(saved.glyphRecords);
});
