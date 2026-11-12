import { describe, expect, test } from 'vitest';
import { lands, stateAt, tile } from './chemHarness';
import { board } from './harness';

/** FU-5: Afterglow's fine-print line (footnotes audit Af1); the other Af rows need events not built yet. */

const withCell = (cell: string) => board(`D . . . .\n . . ${cell} . .\n . . . . .`);

describe('afterglow:cloud', () => {
  test('FU-5: Afterglow touching a plain cloud says it lingers on a compound only', () => {
    const r = lands(withCell('.'), [['steam', tile('C2')]], { auras: ['afterglow'] });
    expect(stateAt(r.state, 'C2')?.afterglow).toBeUndefined();
    expect(r.events.find((e) => e.type === 'miss')).toMatchObject({
      source: 'Afterglow',
      line: 'afterglow:cloud',
    });
  });

  test('FU-5: a compound takes the flag and the line stays quiet', () => {
    const r = lands(withCell('o'), [['ink', tile('C2')]], { auras: ['afterglow'] });
    expect(stateAt(r.state, 'C2')?.afterglow).toBe(true);
    expect(r.events.some((e) => e.type === 'miss')).toBe(false);
  });

  test('FU-5: without Afterglow a plain cloud says nothing', () => {
    const r = lands(withCell('.'), [['steam', tile('C2')]]);
    expect(r.events.some((e) => e.type === 'miss')).toBe(false);
  });
});
