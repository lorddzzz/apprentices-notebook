import { prefersReducedMotion } from 'svelte/motion';
import type { Coord, GameEvent } from '$engine';
import { type KnowledgeSnapshot, NO_FIRSTS } from './beats';
import type { Fx } from './fx';
import { type Clock, projectBatch, Sequencer, type ShownStep, type Step } from './playback';
import type { BoardView } from './view';

const browserClock: Clock = {
  set: (fn, ms) => globalThis.setTimeout(fn, ms) as unknown as number,
  clear: (h) => globalThis.clearTimeout(h),
};

interface PlayOptions {
  knowledge?: KnowledgeSnapshot;
  sourceOffset?: number;
  onProjected?: (shown: ShownStep[]) => void;
  onShown?: (step: Step) => void;
}

export interface StepMarker {
  n: number;
  at: Coord;
  first: boolean;
}

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

  get markers(): StepMarker[] {
    return this.steps
      .slice(0, this.index + 1)
      .flatMap((step) =>
        step.n !== undefined && step.anchor
          ? [{ n: step.n, at: step.anchor, first: step.beat?.first ?? false }]
          : [],
      );
  }

  /** Resolves when the steps finish or are skipped. */
  play(
    start: BoardView,
    events: readonly GameEvent[],
    lead: readonly Fx[] = [],
    options: PlayOptions = {},
  ): Promise<void> {
    this.seq.skip();
    const { steps, shown } = projectBatch(
      start,
      events,
      options.knowledge ?? NO_FIRSTS,
      prefersReducedMotion.current ? 0.5 : 1,
      { lead, sourceOffset: options.sourceOffset ?? 0 },
    );
    options.onProjected?.(shown);
    if (steps.length === 0) return Promise.resolve();
    this.steps = steps;
    return new Promise((resolve) => {
      this.seq.run(
        steps.map((s) => s.ms),
        (i, snapped) => {
          if (snapped) return;
          this.index = i;
          const step = steps[i];
          if (step) options.onShown?.(step);
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
