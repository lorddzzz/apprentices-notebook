import { expect, test, vi } from 'vitest';
import { runDraft } from '$engine/ctx';
import { crackedTiles } from '$engine/districts/api';
import { landKind } from '$engine/mix';
import * as pieces from '$engine/pieces';
import { flowFor, heading, tile } from '../../scenarios/chemHarness';
import { withFootnotes } from '../../scenarios/footnoteHarness';
import { board } from '../../scenarios/harness';

vi.mock('$engine/pieces', async (orig) => {
  const real = await orig<typeof import('$engine/pieces')>();
  return { ...real, strikePiece: vi.fn(real.strikePiece) };
});

test('C3-H: footing and mortar write through named api calls', () => {
  const s = board('D . . . .\n{span} {span} {span} . .\n. . . . d');
  const laid = runDraft(
    s,
    (ctx) =>
      landKind(
        ctx,
        'brass',
        tile('B2'),
        flowFor(s, { lay: true, headings: new Map([heading(tile('B2'), 'right')]) }),
      ),
    { footnotes: withFootnotes(['lay-cap-footing']) },
  );
  expect(crackedTiles(laid.state)).toHaveLength(0);
  const shoves = vi.mocked(pieces.strikePiece).mock.calls.filter((c) => c[2] === 'shove');
  expect(shoves).toEqual([]);
});
