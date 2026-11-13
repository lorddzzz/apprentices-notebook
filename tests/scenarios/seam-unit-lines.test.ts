import { describe, expect, test } from 'vitest';
import { lands, tile } from './chemHarness';
import { board } from './harness';

/** FN-M2: Steam and Brass meeting a unit (footnotes audit Se2, Br1). */
describe('FN-M2: the unit lines', () => {
  const field = () => board('D r . . .');

  test('FN-M2: steam:unit fires when Steam lands under a unit', () => {
    const r = lands(field(), [['steam', tile('B1')]]);
    expect(r.events.find((e) => e.type === 'landed')).toMatchObject({
      kind: 'steam',
      line: 'steam:unit',
    });
  });

  test('FN-M2: brass:unit fires when Brass collars a bare unit', () => {
    const r = lands(field(), [['brass', tile('B1')]]);
    expect(r.events.find((e) => e.type === 'collared')).toMatchObject({ line: 'brass:unit' });
  });
});
