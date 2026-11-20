import { expect, it, vi } from 'vitest';
import { GEN_LIMITS } from '$data/drawing';
import { generateRoom } from '$engine/drawing';
import { heartDrawing, inputFor } from './fixtures';

const trials = vi.hoisted(() => [] as { limit: number | undefined; turns: number }[]);
vi.mock('$engine/drawing/trial', async (importOriginal) => {
  const real = await importOriginal<typeof import('$engine/drawing/trial')>();
  return {
    botTrial(...args: Parameters<typeof real.botTrial>) {
      const result = real.botTrial(...args);
      trials.push({
        limit: args[3]?.maxRounds,
        turns: result.actions.filter((action) => action.type === 'endTurn').length,
      });
      return result;
    },
  };
});

it('R8.5: room and heart trials stop at their judging limits', () => {
  const drawing = heartDrawing('mother');
  for (const [room, limit] of [
    [0, GEN_LIMITS.rounds],
    [drawing.length - 1, GEN_LIMITS.heartRounds],
  ] as const) {
    trials.length = 0;
    generateRoom(inputFor(drawing, 1, room));
    expect(trials.length).toBeGreaterThan(0);
    for (const trial of trials) {
      expect(trial.limit).toBe(limit);
      expect(trial.turns).toBeLessThanOrEqual(limit);
    }
  }
}, 30_000);
