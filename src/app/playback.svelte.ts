import { prefersReducedMotion } from 'svelte/motion';
import type { GameEvent } from '$engine';
import type { Fx } from './fx';
import { buildSteps, type Clock, Sequencer, type Step } from './playback';
import type { BoardView } from './view';

const browserClock: Clock = {
  set: (fn, ms) => globalThis.setTimeout(fn, ms) as unknown as number,
  clear: (h) => globalThis.clearTimeout(h),
};

/** Reactive wrapper: the board renders `current` while `playing`, else the engine state. */
export class Playback {
  steps = $state.raw<Step[]>([]);
  index = $state(-1);
  private readonly seq = new Sequencer(browserClock);

  get playing(): boolean {
    return this.index >= 0;
  }

  get current(): Step | null {
    return this.steps[this.index] ?? null;
  }

  /** Resolves when the steps finish or are skipped. */
  play(start: BoardView, events: readonly GameEvent[], lead: readonly Fx[] = []): Promise<void> {
    this.seq.skip();
    const steps = buildSteps(start, events, prefersReducedMotion.current ? 0.5 : 1, lead);
    if (steps.length === 0) return Promise.resolve();
    this.steps = steps;
    return new Promise((resolve) => {
      this.seq.run(
        steps.map((s) => s.ms),
        (i) => {
          this.index = i;
        },
        () => {
          this.index = -1;
          this.steps = [];
          resolve();
        },
      );
    });
  }

  skip(): void {
    this.seq.skip();
  }
}
