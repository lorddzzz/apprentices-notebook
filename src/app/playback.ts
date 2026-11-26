import type { LineId } from '$data';
import { type Coord, describe, type GameEvent, isSilent, namedIn, witnessedIn } from '$engine';
import { type Beat, beatOf, type FirstMark, type KnowledgeSnapshot, NO_FIRSTS } from './beats';
import { type Fx, fxFor, playbackFx } from './fx';
import { durationOf, STEP_MS } from './timing';
import { type BoardView, projectWith } from './view';

export interface LogStep {
  event: GameEvent;
  n: number;
  srcIndex: number;
  actionId: number;
  round: number;
  text: string;
  anchor: Coord | null;
  first: FirstMark[];
  beat: Beat;
}

export interface Step extends Partial<LogStep> {
  event: GameEvent;
  line: string;
  /** The board after this event. */
  view: BoardView;
  fx: Fx[];
  ms: number;
}

export type ShownStep = Step & LogStep;

interface BatchOptions {
  lead?: readonly Fx[];
  sourceOffset?: number;
  logOnly?: boolean;
  reduced?: boolean;
}

export interface BatchProjection {
  steps: Step[];
  shown: ShownStep[];
}

/** Keep the existing board projection and lead-effect API. */
export function buildSteps(
  start: BoardView,
  events: readonly GameEvent[],
  scale = 1,
  lead: readonly Fx[] = [],
): Step[] {
  return projectBatch(start, events, NO_FIRSTS, scale, { lead, reduced: scale < 1 }).steps;
}

export function projectBatch(
  start: BoardView,
  events: readonly GameEvent[],
  knowledge: KnowledgeSnapshot,
  scale = 1,
  { lead = [], sourceOffset = 0, logOnly = false, reduced = false }: BatchOptions = {},
): BatchProjection {
  const steps: Step[] = [];
  const shown: ShownStep[] = [];
  let view = start;
  let round = start.round;
  for (const [i, event] of events.entries()) {
    if (isSilent(event)) continue;
    const fx = logOnly
      ? []
      : playbackFx([...fxFor(event, view), ...(i === 0 ? lead : [])], reduced);
    if (!logOnly) view = projectWith(view, event);
    if (event.type === 'round') round = event.round;
    const text = describe(event) ?? '';
    const ms = Math.round(
      Math.max(durationOf(event), i === 0 && lead.length ? STEP_MS.normal : 0) * scale,
    );
    const step: Step = { event, line: text, view, fx, ms };
    if (ms > 0) {
      const visible: ShownStep = {
        ...step,
        n: shown.length + 1,
        srcIndex: sourceOffset + i,
        actionId: sourceOffset,
        round,
        text,
        anchor: anchorOf(event),
        first: [],
        beat: beatOf(event, NO_FIRSTS),
      };
      shown.push(visible);
      steps.push(visible);
    } else {
      steps.push(step);
    }
  }
  if (knowledge.witnessed !== null) {
    addFirsts(events, shown, knowledge.named, knowledge.witnessed, sourceOffset);
    for (const step of shown) step.beat = beatOf(step.event, knowledge, step.first);
  }
  return { steps, shown };
}

/** Anchor each cause once, even if it affects many cells. */
function anchorOf(event: GameEvent): Coord | null {
  switch (event.type) {
    case 'moved':
    case 'moveUndone':
    case 'push':
    case 'swapped':
    case 'drawn':
    case 'afterglowDrifts':
      return event.to;
    case 'markSpread':
      return event.from.at;
    case 'markLifted':
      return event.to.at;
    case 'spreadState':
      return event.from;
    case 'aimed':
      return event.targets.find((target) => target.kind === 'tile')?.at ?? null;
    case 'drift':
      return event.units[0]?.to ?? event.floats[0]?.to ?? event.floats[0]?.from ?? null;
    case 'stateFades':
      return event.tiles[0] ?? null;
    default:
      return (
        ('at' in event && event.at) ||
        ('target' in event && event.target?.at) ||
        ('unit' in event && event.unit?.at) ||
        ('caster' in event && event.caster.at) ||
        ('by' in event && typeof event.by === 'object' && event.by?.at) ||
        null
      );
  }
}

function addFirsts(
  events: readonly GameEvent[],
  shown: ShownStep[],
  named: ReadonlySet<string>,
  witnessed: ReadonlySet<LineId>,
  sourceOffset: number,
): void {
  const seenNames = new Set(named);
  for (const [i, event] of events.entries()) {
    if (event.type !== 'named') continue;
    const id = `${event.what}:${event.id}`;
    if (seenNames.has(id)) continue;
    const index = sourceOffset + i;
    const next = shown.find((step) => step.srcIndex > index);
    const match = (step: ShownStep): boolean =>
      (event.what === 'burst' && step.event.type === 'burst' && step.event.burst === event.id) ||
      (event.what === 'compound' &&
        step.event.type === 'mixed' &&
        step.event.compound === event.id);
    // The engine recognizes idioms at the end of an action, after their board effects.
    const idiomCause =
      event.what === 'idiom'
        ? shown.findLast(
            (step) =>
              step.srcIndex < index &&
              step.anchor !== null &&
              (event.origin === undefined || step.event.origin?.cast === event.origin.cast),
          )
        : undefined;
    const cause =
      shown.find((step) => step.srcIndex > index && match(step)) ??
      shown.findLast((step) => step.srcIndex < index && match(step)) ??
      idiomCause ??
      next ??
      shown.at(-1);
    if (!cause) continue;
    cause.first.push({ kind: 'named', id });
    seenNames.add(id);
  }

  const seenLines = new Set(witnessed);
  let nextEvent = 0;
  for (const step of shown) {
    while (nextEvent <= step.srcIndex - sourceOffset) {
      const line = events[nextEvent++]?.line;
      if (line && !seenLines.has(line)) {
        step.first.push({ kind: 'line', id: line });
        seenLines.add(line);
      }
    }
  }
}

/** A replay returns a flat engine log. Recover the top-level action headers from it. */
export function projectHistory(
  view: BoardView,
  events: readonly GameEvent[],
  knowledge: KnowledgeSnapshot,
): LogStep[] {
  const log: LogStep[] = [];
  const named = new Set(knowledge.named);
  const witnessed = knowledge.witnessed === null ? null : new Set(knowledge.witnessed);
  let start = 0;
  let round = events.find((event) => event.type === 'round')?.round ?? view.round;
  const append = (end: number): void => {
    const batch = events.slice(start, end);
    const projection = projectBatch({ ...view, round }, batch, { named, witnessed }, 1, {
      sourceOffset: start,
      logOnly: true,
    });
    log.push(...projection.shown.map(logStepOf));
    for (const id of namedIn(batch)) named.add(id);
    if (witnessed) for (const id of witnessedIn(batch)) witnessed.add(id);
    round = batch.findLast((event) => event.type === 'round')?.round ?? round;
    start = end;
  };
  for (const [i, event] of events.entries()) {
    if (i > start && startsAction(event)) append(i);
  }
  if (start < events.length) append(events.length);
  return log;
}

function startsAction(event: GameEvent): boolean {
  switch (event.type) {
    case 'phase':
      return event.phase === 'resolve';
    case 'moved':
      return event.unit.member && event.cause === 'walk';
    case 'cast':
      return event.caster.member;
    case 'moveUndone':
    case 'hop':
      return event.unit.member;
    case 'shove':
    case 'pull':
    case 'swapWith':
      return event.by.member;
    default:
      return false;
  }
}

export function logStepOf({
  event,
  n,
  srcIndex,
  actionId,
  round,
  text,
  anchor,
  first,
  beat,
}: ShownStep): LogStep {
  return { event, n, srcIndex, actionId, round, text, anchor, first, beat };
}

export interface Clock {
  set(fn: () => void, ms: number): number;
  clear(handle: number): void;
  now?(): number;
}

type OnStep = (i: number, snapped?: true) => void;
type AtSpeed = (i: number, baseMs: number) => number;

interface SequenceOptions {
  atSpeed?: AtSpeed;
  frozenAt?: number;
}

interface ActiveRun {
  durations: readonly number[];
  onStep: OnStep;
  onDone: () => void;
  atSpeed?: AtSpeed;
  index: number;
  frozen: boolean;
}

/**
 * Walks a list of step durations on an injected clock. Steps with 0 ms are never shown on their
 * own: the next timed step's view already includes them. Trailing zero steps are left to the
 * final snap to engine state.
 */
export class Sequencer {
  private handle: number | null = null;
  private deadline: number | null = null;
  private active: ActiveRun | null = null;

  constructor(private readonly clock: Clock) {}

  get running(): boolean {
    return this.active !== null;
  }

  run(
    durations: readonly number[],
    onStep: OnStep,
    onDone: () => void,
    { atSpeed, frozenAt }: SequenceOptions = {},
  ): void {
    this.skip();
    const run: ActiveRun = {
      durations,
      onStep,
      onDone,
      index: -1,
      frozen: false,
      ...(atSpeed && { atSpeed }),
    };
    this.active = run;
    if (frozenAt !== undefined && (durations[frozenAt] ?? 0) > 0) this.freezeAt(frozenAt);
    else this.show(run, 0);
  }

  freezeAt(index: number): void {
    const run = this.active;
    if (!run || (run.durations[index] ?? 0) <= 0) return;
    this.cancel();
    run.frozen = true;
    if (run.index === index) return;
    run.index = index;
    run.onStep(index);
  }

  /** Jump to the last step and finish. No-op when idle; onDone fires exactly once. */
  skip(): void {
    this.finish(true);
  }

  dispose(): void {
    this.finish();
  }

  shortenRemaining(ms: number): void {
    const run = this.active;
    if (run && this.deadline !== null && this.deadline - this.now() > ms) {
      this.schedule(run, ms);
    }
  }

  private now(): number {
    return this.clock.now?.() ?? performance.now();
  }

  private show(run: ActiveRun, from: number): void {
    let i = from;
    while (i < run.durations.length && (run.durations[i] ?? 0) <= 0) i++;
    if (i >= run.durations.length) {
      this.finish();
      return;
    }
    run.index = i;
    run.onStep(i);
    if (this.active !== run || run.frozen) return;
    const baseMs = run.durations[i] ?? 0;
    this.schedule(run, run.atSpeed?.(i, baseMs) ?? baseMs);
  }

  private schedule(run: ActiveRun, ms: number): void {
    this.cancel();
    this.deadline = this.now() + ms;
    this.handle = this.clock.set(() => {
      if (this.active !== run) return;
      this.handle = null;
      this.deadline = null;
      this.show(run, run.index + 1);
    }, ms);
  }

  private finish(snap = false): void {
    const run = this.active;
    if (!run) return;
    this.cancel();
    this.active = null;
    try {
      if (snap) run.onStep(run.durations.length - 1, true);
    } finally {
      run.onDone();
    }
  }

  private cancel(): void {
    if (this.handle !== null) this.clock.clear(this.handle);
    this.handle = null;
    this.deadline = null;
  }
}
