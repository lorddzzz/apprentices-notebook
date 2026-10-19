import { expect, test } from 'vitest';
import { applyAction, scenarioBattle } from '$engine';
import { fallbackLattices } from '../../src/app/lab';
import { holdLine, runesOf } from '../../src/app/peek';
import { at } from './battleFixtures';

/** J3: a long-press on a jar or a mark names its owner and contents. */

const sealed = () => {
  const s = scenarioBattle(
    {
      board: ['D . . .', '. . . r', ...Array(6).fill('. . . .')].join('\n'),
      lattices: { draughtsman: 'Bolt> Ink Jar Oil Spark' },
    },
    { lab: true, lattices: fallbackLattices() },
  );
  const cast = {
    type: 'cast',
    unit: 'draughtsman',
    spell: '0,0',
    aim: { kind: 'dir', dir: 'right' },
  } as const;
  return applyAction(s, cast).state;
};

test('holding a jar reads its owner, its trigger and what it holds', () => {
  const s = sealed();
  expect(holdLine(s, at('D1'))).toBe("D1: Draughtsman's jar, opens on a step, holds Oil, Spark");
});

test('the runes of a jar come in walking order', () => {
  const jar = sealed().tiles.find((t) => t.jar)?.jar;
  expect(runesOf(jar?.rest ?? null)).toEqual(['oil', 'spark']);
});

test('holding a plain tile falls back to the inspect line', () => {
  expect(holdLine(sealed(), at('C2'))).toMatch(/^C2: /);
});
