import type { LineId } from '$data';
import {
  type Action,
  type ActionResult,
  applyAction,
  type BattleState,
  type GameEvent,
  type SpellKey,
  type UnitId,
  witnessedIn,
} from '$engine';
import {
  afterAction,
  endTurnNeedsConfirm,
  type Footnotes,
  IDLE,
  type InputMode,
  type InputResult,
  onCancel,
  onCell,
  onConfirm,
  onMember,
  onShove,
  onSpell,
  type PreviewCtx,
  selectedOf,
  unspentCasters,
} from './battleInput';
import { type Caption, hintFor, threatenedMembers } from './describe';
import { castLead, type Fx } from './fx';
import { EMPTY_OVERLAY, type Overlay, overlayFor } from './overlay';
import { holdLine } from './peek';
import { Playback } from './playback.svelte';
import { toast } from './toasts.svelte';
import { type BoardView, viewOf, withoutIntents } from './view';

export type SessionMode = 'trip' | 'lab';

export interface SessionOptions {
  onEvents?: (events: GameEvent[]) => void;
  /** The footnotes the household wrote (`footnoteTexts`): the engine reads them for their lines. */
  footnotes?: Footnotes;
  /**
   * The lines the household has witnessed (`Profile.witnessed`): the preview describes only
   * those (D2). Left out, nothing is masked. Lines fired earlier in this fight count too.
   */
  witnessed?: readonly LineId[];
  /** Play the creation events (enemies declaring intents) on start. */
  intro?: boolean;
  /** Called with the state and log just before an action took effect (the Lab's undo and export). */
  onAction?: (before: { state: BattleState; log: GameEvent[] }, action: Action) => void;
}

/** One battle being played: authoritative state, input mode, playback. Shared by trip and Lab. */
export class BattleSession {
  state: BattleState;
  log: GameEvent[];
  input: InputMode = $state.raw(IDLE);
  /** End turn was tapped once while someone could still cast; any other input disarms it. */
  armed = $state(false);
  /** A long-press read-out (a jar's owner and contents, a mark) shown in the hint line until the next input. */
  peek = $state<string | null>(null);
  readonly playback = new Playback();
  private run = $state(0);

  readonly mode: SessionMode;
  private readonly opts: SessionOptions;

  constructor(init: ActionResult, mode: SessionMode, opts: SessionOptions) {
    this.mode = mode;
    this.opts = opts;
    this.state = $state.raw(init.state);
    this.log = $state.raw([...init.events]);
    this.input = afterAction(init.state, IDLE);
    if (opts.intro && init.events.length) {
      void this.play(withoutIntents(viewOf(init.state)), init.events, [], viewOf(init.state));
    }
  }

  /** What a preview needs besides the state: footnotes, and the witnessed lines (P41). */
  private get ctx(): PreviewCtx {
    const known = this.opts.witnessed;
    return {
      footnotes: this.opts.footnotes ?? {},
      witnessed: known ? new Set([...known, ...witnessedIn(this.log)]) : null,
    };
  }

  get busy(): boolean {
    return this.playback.playing;
  }

  get view(): BoardView {
    return this.playback.current?.view ?? viewOf(this.state);
  }

  get fx(): Fx[] {
    return this.playback.current?.fx ?? [];
  }

  /** Changes on every playback step so effects restart. */
  get fxKey(): number {
    return this.run * 1000 + this.playback.index;
  }

  get overlay(): Overlay {
    return this.busy ? EMPTY_OVERLAY : overlayFor(this.state, this.input);
  }

  /** Stays put during playback so the party strip and action bar don't jump. */
  get selected(): UnitId | null {
    return selectedOf(this.input);
  }

  get threatened(): string[] {
    if (this.busy) return [];
    // A pending shove or kill can take a member out of harm's way: read the preview.
    const p = this.input.kind === 'confirm' ? this.input.preview : null;
    return threatenedMembers(p && !p.masked ? p.result.state : this.state);
  }

  get caption(): Caption {
    const step = this.playback.current;
    if (step) return { text: step.line, tone: 'event' };
    if (this.peek) return { text: this.peek, tone: 'hint' };
    if (this.armed) {
      const who = unspentCasters(this.state).join(' and ');
      return { text: `${who} can still cast. Tap End turn again to end the turn.`, tone: 'warn' };
    }
    return hintFor(this.input, this.state);
  }

  get over(): boolean {
    return !this.busy && this.state.phase !== 'player';
  }

  // ── Input (any tap during playback skips it instead) ──

  tapCell(at: { x: number; y: number }): void {
    if (this.swallow()) return;
    this.apply(onCell(this.state, this.input, at, this.ctx));
  }

  /** Long-press on a tile: reads out a jar or a mark in the hint line (J3). */
  holdCell(at: { x: number; y: number }): void {
    if (this.busy || this.state.phase !== 'player') return;
    this.peek = holdLine(this.state, at);
  }

  selectMember(id: UnitId): void {
    if (this.swallow()) return;
    this.apply(onMember(this.state, this.input, id));
  }

  chooseSpell(key: SpellKey): void {
    if (this.swallow()) return;
    this.apply(onSpell(this.state, this.input, key, this.ctx));
  }

  chooseShove(): void {
    if (this.swallow()) return;
    this.apply(onShove(this.state, this.input));
  }

  confirm(): void {
    if (this.swallow()) return;
    this.apply(onConfirm(this.state, this.input));
  }

  cancel(): void {
    if (this.swallow()) return;
    this.apply(onCancel(this.state, this.input));
  }

  undoMove(): void {
    if (this.swallow()) return;
    const unit = selectedOf(this.input);
    if (unit) void this.dispatch({ type: 'undoMove', unit });
  }

  endTurn(): void {
    if (this.swallow()) return;
    if (!this.armed && endTurnNeedsConfirm(this.state)) {
      this.armed = true;
      return;
    }
    void this.dispatch({ type: 'endTurn' });
  }

  skip(): void {
    this.playback.skip();
  }

  /** Applies an action, then animates its events from the previous board. */
  async dispatch(action: Action): Promise<void> {
    const prev = this.state;
    let r: ActionResult;
    try {
      r = applyAction(prev, action, this.opts.footnotes ?? {});
    } catch (err) {
      toast(err instanceof Error ? err.message : String(err), 'warn');
      return;
    }
    this.opts.onAction?.({ state: prev, log: this.log }, action);
    this.armed = false;
    this.peek = null;
    this.state = r.state;
    this.log = [...this.log, ...r.events];
    this.input = afterAction(r.state, this.input);
    this.opts.onEvents?.(r.events);
    await this.play(viewOf(prev), r.events, castLead(prev, action, r.events), viewOf(r.state));
  }

  /** Lab: swaps in an edited or earlier state (and log); the input and playback reset. */
  replace(state: BattleState, log: GameEvent[]): void {
    this.skip();
    this.armed = false;
    this.peek = null;
    this.state = state;
    this.log = log;
    this.input = afterAction(state, IDLE);
  }

  /** Dev only: ends the fight at once (all enemies down, or the whole party). */
  forceEnd(phase: 'won' | 'lost'): void {
    this.skip();
    const down = phase === 'won' ? 'enemy' : 'member';
    const next: BattleState = {
      ...this.state,
      phase,
      units: this.state.units.map((u) => (u.kind === down ? { ...u, hp: 0 } : u)),
    };
    this.state = next;
    this.input = IDLE;
    this.log = [...this.log, { type: phase }];
  }

  dispose(): void {
    this.playback.skip();
  }

  private play(
    start: BoardView,
    events: readonly GameEvent[],
    lead: Fx[] = [],
    end?: BoardView,
  ): Promise<void> {
    this.run += 1;
    return this.playback.play(start, events, lead, end);
  }

  private apply(r: InputResult): void {
    this.armed = false;
    this.peek = null;
    this.input = r.mode;
    if (r.action) void this.dispatch(r.action);
  }

  private swallow(): boolean {
    if (!this.busy) return false;
    this.skip();
    return true;
  }
}
