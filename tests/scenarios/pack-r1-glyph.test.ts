import { expect, test } from 'vitest';
import { parseLattice } from '$engine';
import { withFootnotes } from './footnoteHarness';
import { castWith, tileAim, where } from './footnotes/castHelper';
import { battleWith, flatCompile, glyphFromFlat, libOf } from './glyph-identity-kit';

test('a Bend keeps its turn into a payload Glyph', () => {
  const flat = parseLattice('Touch> Bendv\n. Shove');
  const def = glyphFromFlat('push', 'payload', flat, [{ x: 1, y: 1 }], { x: 1, y: 1 }, 'down');
  const spells = flatCompile(parseLattice('Touch> Bendv\n. G:pushv'), libOf(def)).spells;
  const r = castWith(
    battleWith('. . .\nD r .\n. . .', spells),
    tileAim('B2'),
    withFootnotes(['bend-cap-turn']),
  );
  expect(where(r.state, 'rat-1')).toBe('B3');
  expect(r.events.some((e) => e.type === 'push')).toBe(true);
});
