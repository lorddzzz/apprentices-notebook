import { describe, expect, test } from 'vitest';
import { drift } from '$engine/current';
import { decayStates } from '$engine/mix';
import { lands, run, stateAt, tile } from './chemHarness';
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

describe('afterglow:spent', () => {
  test('FU-5: afterglow:spent fires when the extra round is spent', () => {
    const start = lands(withCell('o'), [['ink', tile('C2')]], { auras: ['afterglow'] }).state;
    expect(stateAt(start, 'C2')?.afterglow).toBe(true);
    const r = run(start, (ctx) => decayStates(ctx));
    expect(stateAt(r.state, 'C2')?.afterglow).toBeUndefined();
    expect(r.events.find((e) => e.type === 'afterglowSpent')).toMatchObject({
      at: { x: 2, y: 1 },
      line: 'afterglow:spent',
    });
    const again = run(r.state, (ctx) => decayStates(ctx));
    expect(again.events.some((e) => e.type === 'afterglowSpent')).toBe(false);
  });
});

describe('afterglow:water', () => {
  test('FU-5: afterglow:water fires when the current carries a glowing stain', () => {
    const start = board('w>{stain} w> . . D');
    const t = stateAt(start, 'A1');
    expect(t?.id).toBe('stain');
    const r = run(start, (ctx) => {
      const layer = stateAt(ctx.s, 'A1');
      if (layer) layer.afterglow = true;
      drift(ctx);
    });
    expect(stateAt(r.state, 'B1')?.afterglow).toBe(true);
    expect(r.events.find((e) => e.type === 'afterglowDrifts')).toMatchObject({
      from: { x: 0, y: 0 },
      to: { x: 1, y: 0 },
      line: 'afterglow:water',
    });
  });

  test('FU-5: a plain stain drifts without the line', () => {
    const r = run(board('w>{stain} w> . . D'), (ctx) => drift(ctx));
    expect(r.events.some((e) => e.type === 'afterglowDrifts')).toBe(false);
  });
});
