import { describe, expect, test } from 'vitest';
import { type BattleState, type GameEvent, isSilent, newSave, type SaveData } from '$engine';
import { setOut, startBattle } from '../../src/app/flow';
import { type BoardView, projectWith, viewOf, withoutIntents } from '../../src/app/view';
import { botFight } from '../sim/bot';
import { inkProfile } from '../sim/ink-bot';

/**
 * IQ-21 (plan section 6): a bot fights every room of the quarter, writs and the clock in play.
 * The log projected onto the opening view must equal the state the engine ended on (FD), and no
 * cast was cut by the event cap.
 */

// Fire tiles read as clear: embers drop at battle end silently (the same in every district).
function drawn(v: BoardView) {
  return {
    units: v.units.map((u) =>
      u.alive ? { id: u.id, pos: u.pos, hp: u.hp, mark: u.mark, held: u.held > 0 } : { id: u.id },
    ),
    tiles: v.tiles.map((t) => ({ state: t.state === 'fire' ? null : t.state, hits: t.hits })),
    round: v.round,
    phase: v.phase,
  };
}

function room(
  seed: number,
  n: number,
  d = 'inkQuarter' as const,
): { state: BattleState; events: GameEvent[] } {
  let save: SaveData = { ...newSave(seed), profile: inkProfile() };
  save = setOut(save, d);
  if (!save.trip) throw new Error('no trip');
  save = { ...save, trip: { ...save.trip, encounter: n } };
  return startBattle(save);
}

describe('IQ-21: projection and the event cap through the quarter', () => {
  for (const n of [0, 1, 2, 3, 4]) {
    test(`room ${n + 1}: the log projects to the final state and no cast hits the cap`, () => {
      for (const seed of [1, 2, 3]) {
        const start = room(seed, n, 'inkQuarter');
        const fight = botFight(start.state, 40);
        expect(fight.events.some((e) => e.type === 'fizzles' && e.reason === 'cap')).toBe(false);
        const got = fight.events.reduce(
          (v, e) => (isSilent(e) ? v : projectWith(v, e)),
          withoutIntents(viewOf(start.state)),
        );
        expect(drawn(got)).toEqual(drawn(viewOf(fight.state)));
      }
    });
  }
});
