import { RUNES, type RuneId, type SolventId } from '$data';
import { BattleSession } from './battle.svelte';
import {
  attemptOf,
  type BenchState,
  clearSlot,
  closePicker,
  commit,
  EMPTY_BENCH,
  emptyStage,
  openSlot,
  pickRune,
  pickSolvent,
  runTrial,
  type SlotName,
  TRIAL_CAST,
  trialStage,
} from './bench';
import type { GameStore } from './game.svelte';
import { game } from './instance';
import { toast } from './toasts.svelte';

/** The Bench screen's state: the slots, the trial board and the profile writes. Rules live in bench.ts. */
export class BenchStore {
  constructor(private readonly game: GameStore) {
    this.session = this.stage();
  }

  bench = $state.raw<BenchState>(EMPTY_BENCH);
  session = $state.raw<BattleSession>() as BattleSession;
  /** The attempt in the slots was already tried before this trial. */
  repeat = $state(false);
  /** The rune just written, shown until a slot changes. */
  written = $state.raw<RuneId | null>(null);

  private stage(): BattleSession {
    const a = attemptOf(this.bench);
    const left = this.bench.left;
    const right = this.bench.right;
    const init =
      a !== null
        ? trialStage(a)
        : left && right
          ? trialStage({ left, right, solvent: 'chalk' })
          : emptyStage();
    return new BattleSession(init, 'lab', { known: () => [] });
  }

  private set(next: BenchState): void {
    const slotsChanged =
      next.left !== this.bench.left ||
      next.right !== this.bench.right ||
      next.solvent !== this.bench.solvent;
    this.bench = next;
    if (!slotsChanged) return;
    this.repeat = false;
    this.written = null;
    this.session.dispose();
    this.session = this.stage();
  }

  openSlot(slot: SlotName): void {
    this.set(openSlot(this.bench, slot));
  }

  closePicker(): void {
    this.set(closePicker(this.bench));
  }

  pickRune(slot: 'left' | 'right', rune: RuneId): void {
    this.set(pickRune(this.bench, this.game.profile, slot, rune));
  }

  pickSolvent(solvent: SolventId): void {
    this.set(pickSolvent(this.bench, this.game.profile, solvent));
  }

  clear(slot: SlotName): void {
    this.set(clearSlot(this.bench, slot));
  }

  /** Free: scores the attempt, remembers it, and plays the cast on the trial board. */
  async trial(): Promise<void> {
    if (this.session.busy) return;
    const out = runTrial(this.bench, this.game.profile);
    if (out.state.result === null) return;
    if (out.profile !== this.game.profile) this.game.setProfile(out.profile);
    this.bench = out.state;
    this.repeat = out.repeat;
    this.written = null;
    // A fresh stage each time, so a second trial replays from the start.
    this.session.dispose();
    this.session = this.stage();
    await this.session.dispatch(TRIAL_CAST);
  }

  /** Write in ink: one solvent buys one rune. */
  write(): void {
    const out = commit(this.bench, this.game.profile);
    if (out.rune === null) return;
    this.game.setProfile(out.profile);
    this.bench = out.state;
    this.written = out.rune;
    const name = RUNES[out.rune].name;
    toast(out.first ? `New in the notebook: ${name}` : `Another ${name} for the shelf`);
  }
}

export const bench = new BenchStore(game);
