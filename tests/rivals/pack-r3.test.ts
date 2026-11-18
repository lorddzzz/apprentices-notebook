import { describe, expect, it } from 'vitest';
import { footnoteKeyOf, VARIANTS } from '$data';
import { createBattle } from '$engine/battle';
import { dealDamage } from '$engine/damage';
import { parseLabel } from '$engine/notation';
import { tileAt } from '$engine/queries';
import { hasFootnote } from '$engine/footnotes';
import { WICK_NOTE } from '$engine/jars';
import { rivalPreview } from '$engine/rivals';
import { simulate } from '$engine/rivals/plan';
import { registerTrick } from '$engine/rivals/tricks';
import type { EnemyUnit } from '$engine/types';

describe('rival walk simulation', () => {
  it('scores the cast on the board after a party jar opened underfoot', () => {
    const s = createBattle({ title: 't', board: 'L . . D', seed: 1 }).state;
    const rival = s.units.find((u): u is EnemyUnit => u.kind === 'enemy' && !!u.rival);
    if (!rival) throw new Error('no rival');
    tileAt(s, parseLabel('B1')).jar = {
      owner: 'draughtsman',
      event: 'step',
      rest: null,
      heading: null,
      origin: { caster: 'draughtsman', spell: 'fixture', cast: 0 },
      id: 1,
      seq: 1,
    };
    const note = VARIANTS.find((v) => v.id === 'lamplighter:wick');
    if (!note) throw new Error('no note');
    const undo = registerTrick({
      id: 'canals:walkTest',
      name: 'Walk test',
      init: () => ({}),
      draw: () => ({ label: 'fixture', tiles: [], units: [] }),
      describe: () => 'fixture',
      action: {
        plan: () => [],
        resolve: (ctx, unit, _intent, own) => {
          if (tileAt(ctx.s, parseLabel('B1')).jar) dealDamage(ctx, unit, 1, 'fixture');
          return own;
        },
      },
    });
    const outcome = simulate(
      s,
      rival.id,
      [parseLabel('B1')],
      {
        kind: 'trick',
        trick: 'canals:walkTest',
        lock: null,
        data: {},
        fallback: null,
        order: 0,
      },
      { [footnoteKeyOf(note)]: note.id },
    );
    undo();
    expect(outcome.selfHarm).toBe(0);
  });
});

const TRICK = {
  kind: 'trick',
  trick: 'canals:noteTest',
  lock: null,
  data: {},
  fallback: null,
  order: 1,
} as const;

function fixtureTrick() {
  return registerTrick({
    id: 'canals:noteTest',
    name: 'Note test',
    init: () => ({}),
    draw: () => ({ label: 'fixture', tiles: [], units: [] }),
    describe: () => 'fixture',
    action: {
      plan: () => [],
      // Hurts him unless the Wick note is written: the footnotes must reach the preview's ctx.
      resolve: (ctx, unit, _intent, own) => {
        if (!hasFootnote(ctx, WICK_NOTE)) dealDamage(ctx, unit, 1, 'fixture');
        return own;
      },
    },
  });
}

describe('rivalPreview footnotes', () => {
  it('previews with the battle footnotes', () => {
    const s = createBattle({ title: 't', board: 'L . . D', seed: 1 }).state;
    const rival = s.units.find((u): u is EnemyUnit => u.kind === 'enemy' && !!u.rival);
    const note = VARIANTS.find((v) => v.id === 'lamplighter:wick');
    if (!rival || !note) throw new Error('fixture');
    rival.intent = { ...TRICK };
    const undo = fixtureTrick();
    const without = rivalPreview(s, rival.id);
    const written = rivalPreview(s, rival.id, { [footnoteKeyOf(note)]: note.id });
    undo();
    expect(without?.events.some((e) => e.type === 'damage')).toBe(true);
    expect(written?.events.some((e) => e.type === 'damage')).toBe(false);
  });
});
