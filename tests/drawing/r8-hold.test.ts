import { expect, it } from 'vitest';
import { crackedTiles } from '$engine/districts/api';
import { botFight } from '$engine/sim/bot';
import { withLattices } from '../scenarios/harness';

it('R8.6: Hold only treats grounded targets on cracked spans as falling', () => {
  const fight = (foe: string) => {
    const state = withLattices(`D . ${foe}{span} .`, { draughtsman: 'Bolt> Hold' });
    expect(crackedTiles(state)).toEqual([{ x: 2, y: 0 }]);
    return botFight(state, 1, ['draughtsman'], { hold: true });
  };
  expect(fight('r').actions[0]?.type).toBe('cast');
  expect(fight('y').actions[0]?.type).toBe('move');
});
