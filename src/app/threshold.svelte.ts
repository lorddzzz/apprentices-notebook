import type { DistrictId } from '$data';
import { BattleSession } from './battle.svelte';
import type { GameStore } from './game.svelte';
import { game } from './instance';
import { planThreshold, type ThresholdPlan, thresholdOutcome, thresholdStart } from './threshold';

/** The threshold screen's state: one room battle at a time. Rules live in threshold.ts. */
export class ThresholdStore {
  constructor(private readonly game: GameStore) {}

  session = $state.raw<BattleSession | null>(null);
  /** The district whose room `session` is playing. */
  district = $state.raw<DistrictId | null>(null);
  /** The battle was won and the district opened (written at once; the plan alone cannot say). */
  won = $state(false);
  /** The success moment is showing (the player moved on from the win overlay). */
  solved = $state(false);

  /** Looks at the URL's district and (re)starts its battle when it is a room worth trying. */
  load(d: string | null): ThresholdPlan {
    const plan = planThreshold(this.game.profile, d);
    if ((this.won || this.solved) && plan.ok === false) return plan;
    if (plan.ok && this.district !== plan.district) {
      this.won = false;
      this.solved = false;
      this.restart(plan);
    } else if (!plan.ok) {
      this.session?.dispose();
      this.session = null;
      this.district = null;
    }
    return plan;
  }

  private restart(plan: Extract<ThresholdPlan, { ok: true }>): void {
    this.session?.dispose();
    this.district = plan.district;
    this.won = false;
    const session: BattleSession = new BattleSession(
      thresholdStart(this.game.profile, plan.room),
      'lab',
      {
        known: () => this.game.profile.interactions,
        onEvents: () => this.settle(session),
      },
    );
    this.session = session;
  }

  /** A won battle opens the district at once, so a reload cannot lose it. */
  private settle(session: BattleSession): void {
    const d = this.district;
    if (this.session !== session || d === null || this.won) return;
    if (session.state.phase !== 'won') return;
    this.game.updateProfile((p) => thresholdOutcome(p, d, session.state));
    this.won = true;
  }

  /** Back to the start state, current lattices. */
  retry(): void {
    const plan = planThreshold(this.game.profile, this.district);
    if (plan.ok) this.restart(plan);
  }

  /** After the end overlay: a win moves on to the success moment; a loss starts over. */
  finish(): void {
    if (this.won) this.solved = true;
    else this.retry();
  }

  /** Leaving forgets the room; nothing was written. */
  leave(): void {
    this.session?.dispose();
    this.session = null;
    this.district = null;
    this.won = false;
    this.solved = false;
  }
}

export const threshold = new ThresholdStore(game);
