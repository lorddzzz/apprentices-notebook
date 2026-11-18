import { expect, test } from 'vitest';
import { TUNING } from '$data';
import { runDraft, withLine } from '$engine/ctx';
import { push } from '$engine/push';
import { withFootnotes } from './footnoteHarness';
import { board, unitAtLabel } from './harness';

test('a Mortar shove sliding into fog does not add fall damage', () => {
  const r = runDraft(
    board('d b o o _\nD . . . .'),
    (ctx) =>
      withLine(ctx, 'mortar:unit', () =>
        push(ctx, unitAtLabel(ctx.s, 'B1'), 'right', 2, null, { bonus: 1 }),
      ),
    { footnotes: withFootnotes(['mortar-unit-fall']) },
  );
  expect(r.events.find((e) => e.type === 'damage' && e.source === 'Drop')).toMatchObject({
    amount: TUNING.dropEliteDamage,
  });
});
