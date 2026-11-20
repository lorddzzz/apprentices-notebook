import { expect, it } from 'vitest';
import { checkGenerated, specFor } from '$engine/drawing';
import { parseBoard } from '$engine/notation';
import { heartDrawing, inputFor } from './fixtures';

it('R8.2: the reach guardrail rejects a start sealed in a pocket', () => {
  const layout = parseBoard(`
    P P . . .
    P . . . .
    . . . . r
    . o . . .
    . . . . =
    . . . = P
  `);
  const input = inputFor(heartDrawing('marginalia'), 1, 0);
  const spec = { ...specFor(input, input.seed), size: { width: 5, height: 6 } };
  expect(checkGenerated(layout, spec)).toEqual(
    expect.arrayContaining([expect.objectContaining({ guardrail: 'reach', at: { x: 4, y: 5 } })]),
  );
});
