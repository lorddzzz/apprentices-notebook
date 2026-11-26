import { prefersReducedMotion } from 'svelte/motion';
import type { Coord, GameEvent } from '$engine';
import { type Beat, holdMs, type KnowledgeSnapshot, NO_FIRSTS } from './beats';
import type { Fx } from './fx';
import { type Clock, projectBatch, Sequencer, type ShownStep, type Step } from './playback';
import { motionScale, type PlaybackSpeed } from './timing';
import type { BoardView } from './view';

const browserClock: Clock = {
  now: () => performance.now(),
  set: (fn, ms) => globalThis.setTimeout(fn, ms) as unknown as number,
  clear: (h) => globalThis.clearTimeout(h),
};

interface MotionSettings {
  scale: number;
  reduced: boolean;
}

interface PlaybackSettings {
  clock?: Clock;
  motion?: () => MotionSettings;
}

function currentMotion(): MotionSettings {
  return { scale: motionScale(), reduced: prefersReducedMotion.current };
}

interface PlayOptions {
  knowledge?: KnowledgeSnapshot;
  sourceOffset?: number;
  freezeAt?: number;
  onProjected?: (shown: ShownStep[]) => void;
  onShown?: (step: Step) => void;
}

export interface PlaybackReadout {
  n: number;
  total: number;
  text: string;
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
  speed = $state<PlaybackSpeed>(1);
  private shownTotal = $state(0);
  private readonly seq: Sequencer;
  private readonly motion: () => MotionSettings;
  private settings: MotionSettings = { scale: 1, reduced: false };
  private freezeOnNext: number | null = null;

  constructor({ clock = browserClock, motion = currentMotion }: PlaybackSettings = {}) {
    this.seq = new Sequencer(clock);
    this.motion = motion;
  }

  get playing(): boolean {
    return this.index >= 0;
  }

  get current(): Step | null {
    return this.steps[this.index] ?? null;
  }

  get readout(): PlaybackReadout | null {
    const step = this.current;
    return step?.n === undefined
      ? null
      : { n: step.n, total: this.shownTotal, text: step.text ?? step.line };
  }

  get beat(): Beat | null {
    const beat = this.current?.beat;
    return beat && beat.kind !== 'ordinary' ? beat : null;
  }

  get dimmed(): boolean {
    return this.beat !== null;
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
    this.speed = 1;
    this.settings = this.motion();
    const { steps, shown } = projectBatch(
      start,
      events,
      options.knowledge ?? NO_FIRSTS,
      this.settings.scale,
      { lead, sourceOffset: options.sourceOffset ?? 0, reduced: this.settings.reduced },
    );
    options.onProjected?.(shown);
    if (steps.length === 0) return Promise.resolve();
    this.steps = steps;
    this.shownTotal = shown.length;
    const ordinal = import.meta.env.DEV ? options.freezeAt || this.freezeOnNext : null;
    this.freezeOnNext = null;
    const frozenAt = ordinal === null ? -1 : steps.findIndex((step) => step.n === ordinal);
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
          this.shownTotal = 0;
          resolve();
        },
        {
          atSpeed: (i) => this.stepMs(steps[i]),
          ...(frozenAt >= 0 && { frozenAt }),
        },
      );
    });
  }

  /** Dev fixtures can stop on a one-based visible step in this or the next batch. */
  freezeAt(shownOrdinal: number): void {
    if (!import.meta.env.DEV || !Number.isInteger(shownOrdinal) || shownOrdinal < 1) return;
    if (!this.playing) {
      this.freezeOnNext = shownOrdinal;
      return;
    }
    this.seq.freezeAt(this.steps.findIndex((step) => step.n === shownOrdinal));
  }

  speedUp(): void {
    if (!this.playing || this.speed === 4) return;
    this.speed = this.speed === 1 ? 2 : 4;
    this.seq.shortenRemaining(this.stepMs(this.current));
  }

  skip(): void {
    this.seq.skip();
  }

  dispose(): void {
    this.seq.dispose();
  }

  private stepMs(step: Step | null | undefined): number {
    if (!step) return 0;
    return step.beat && step.beat.kind !== 'ordinary'
      ? holdMs(this.speed, this.settings.scale, this.settings.reduced)
      : step.ms / this.speed;
  }
}
