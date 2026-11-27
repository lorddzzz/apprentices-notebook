import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import type { GameEvent } from '$engine';
import type { Clock } from '../../src/app/playback';
import { Playback } from '../../src/app/playback.svelte';
import { prefs } from '../../src/app/prefs.svelte';
import { HOLD_MS, motionScale, type PlaybackSpeed } from '../../src/app/timing';
import { at } from './battleFixtures';
import { plainBoard } from './viewFixtures';

/** FT-3b: the speed × Quick × reduced-motion matrix, with Quick read from the real device pref. */
const clock: Clock = {
  now: () => Date.now(),
  set: (fn, ms) => globalThis.setTimeout(fn, ms) as unknown as number,
  clear: (handle) => globalThis.clearTimeout(handle),
};
const start = plainBoard(3, 1);
const burst: GameEvent = {
  type: 'burst',
  burst: 'fire',
  at: at('B1'),
  tiles: [at('B1')],
  units: [],
};
const move: GameEvent = {
  type: 'moved',
  unit: { id: 'rat', name: 'rat', member: false, at: at('A1') },
  from: at('A1'),
  to: at('B1'),
  path: [at('B1')],
  cause: 'walk',
};

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  vi.useRealTimers();
  prefs.motion = 'normal';
});

const SPEEDS: PlaybackSpeed[] = [1, 2, 4];

for (const motion of ['normal', 'quick'] as const) {
  for (const reduced of [false, true]) {
    for (const speed of SPEEDS) {
      const scale = motion === 'quick' ? 0.5 : 1;
      const hold = Math.round((reduced ? HOLD_MS.reduced : HOLD_MS[speed]) * scale);
      test(`hold is ${hold} ms at ×${speed}, ${motion}, reduced ${reduced}`, () => {
        prefs.motion = motion;
        expect(motionScale()).toBe(scale);
        const controller = new Playback({
          clock,
          motion: () => ({ scale: motionScale(), reduced }),
        });
        void controller.play(start, [burst, move]);
        for (let i = 1; i < speed; i += 1) controller.speedUp();
        vi.advanceTimersByTime(hold - 1);
        expect(controller.current?.event.type).toBe('burst');
        vi.advanceTimersByTime(1);
        expect(controller.current?.event.type).toBe('moved');
        controller.skip();
      });
    }
  }
}
