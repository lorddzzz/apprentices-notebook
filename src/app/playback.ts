import { describe, type GameEvent, isSilent } from '$engine';
import { type Fx, fxFor } from './fx';
import { durationOf, STEP_MS } from './timing';
import { type BoardView, project } from './view';

export interface Step {
  event: GameEvent;
  line: string;
  /** The board after this event. */
  view: BoardView;
  fx: Fx[];
  ms: number;
}

/**
 * One step per event. `scale` < 1 is reduced motion: shorter steps, no trails. `lead` adds effects
 * to the first step that the events alone can't show (a Bolt's flight when it hits a unit).
 */
export function buildSteps(
  start: BoardView,
  events: readonly GameEvent[],
  scale = 1,
  lead: readonly Fx[] = [],
): Step[] {
  const steps: Step[] = [];
  let view = start;
  for (const [i, event] of events.entries()) {
    if (isSilent(event)) continue;
    const fx = [...fxFor(event, view), ...(i === 0 ? lead : [])].filter(
      (f) => scale >= 1 || f.kind !== 'trail',
    );
    view = project(view, event);
    steps.push({
      event,
      line: describe(event) ?? '',
      view,
      fx,
      // A lead trail needs a full step to draw.
      ms: Math.round(
        Math.max(durationOf(event), i === 0 && lead.length ? STEP_MS.normal : 0) * scale,
      ),
    });
  }
  return steps;
}

export interface Clock {
  set(fn: () => void, ms: number): number;
  clear(handle: number): void;
}

/**
 * Walks a list of step durations on an injected clock. Steps with 0 ms are never shown on their
 * own: the next timed step's view already includes them. Trailing zero steps are left to the
 * final snap to engine state.
 */
export class Sequencer {
  private handle: number | null = null;
  private active: { count: number; onStep: (i: number) => void; onDone: () => void } | null = null;

  constructor(private readonly clock: Clock) {}

  get running(): boolean {
    return this.active !== null;
  }

  run(durations: readonly number[], onStep: (i: number) => void, onDone: () => void): void {
    this.skip();
    if (durations.length === 0) {
      onDone();
      return;
    }
    this.active = { count: durations.length, onStep, onDone };
    this.show(durations, 0);
  }

  /** Jump to the last step and finish. No-op when idle; onDone fires exactly once. */
  skip(): void {
    const run = this.active;
    if (!run) return;
    this.cancel();
    this.active = null;
    run.onStep(run.count - 1);
    run.onDone();
  }

  private show(durations: readonly number[], from: number): void {
    const run = this.active;
    if (!run) return;
    let i = from;
    while (i < durations.length && (durations[i] ?? 0) <= 0) i++;
    if (i >= durations.length) {
      this.active = null;
      run.onDone();
      return;
    }
    run.onStep(i);
    this.handle = this.clock.set(() => {
      this.handle = null;
      this.show(durations, i + 1);
    }, durations[i] ?? 0);
  }

  private cancel(): void {
    if (this.handle !== null) this.clock.clear(this.handle);
    this.handle = null;
  }
}
